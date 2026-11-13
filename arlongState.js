// arlongState.js — Arlong authoritative state (GAME_STATE). Everything lives in `fighter._arlong` as plain JSON
// (numbers / booleans / strings / small arrays of plain objects — no callbacks, no object refs), so it is in the
// replay checkpoint and reproduced bit-identically. No Math.random / gameRng anywhere in the kit: timings are fixed
// frame counts and positions derive from the fighters' positions. (The kit needs no sim randomness at all; render
// jitter is hash(frame, slot) in arlongFx.js.)
import { ARLONG_MOVES, ARLONG_WIN2_ANIM, ARLONG_FLEX_ANIM, arlong as ARLONG_CHAR } from './arlongData.js'
import { meleeDamageType } from './damageTypes.js'
export const isArlong = f => f?.rosterKey === 'arlong'
// Audio cue queue (presentation only — played + cleared by game.js right after tickArlong; never read by the sim).
export function acue(f, c) { (f._arlongCues ||= []).push(c) }

// Reference screen for every "% of screen" figure in the brief: a FIXED 1280 px (never the device canvas) → LAN-safe.
export const SCREEN = 1280
// TIDE economy (brief Phase 2): +5 per Fishman Karate (blunt) hit, +3 per blade (slash) hit, +1/s passive,
// +2/s extra while standing in his own water (Phase 3).
export const ARLONG_TIDE = { perKarateHit: 5, perBladeHit: 3, passiveEvery: 60, waterEvery: 30 }
export const ARLONG_SUPER_LOCKOUT = 180
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function arlongState(f) {
  if (!isArlong(f)) return null
  return f._arlong ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (advances EVERY call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Tide
    waterTide: 0,      // frames toward the next in-water +1 Tide
    prev: {}, edgeAt: {}, edgeClk: {}, edgeDir: {}, used: {},   // raw buttons last tick / press-edge tick / press-edge SIM clock / edge consumed
    dirs: [],          // condensed facing-relative direction history [[numpad, tick], …] (motion inputs)
    lockout: 0,        // Tide lockout after the Super (frames)
    inSuper: false,
    dashPrev: 0,       // engine dashTimer last frame (swim-dash invulnerability on the rising edge)
    idleT: 0,          // frames standing idle with no input (blade-on-shoulder flex after 600)
    zones: [],         // WATER ZONES [{x (left edge, world px), width, bornFrame (sim clock), owner}] — max 3, never overlapping
    wet: false,        // standing in his own water this frame (grounded, feet inside a zone) — read by the hooks
    flood: 0,          // ARLONG PARK flood frames left (the whole floor is water)
    groundY: null,     // feet line when last grounded (zones / flood sit on it)
    zoneSeq: 0,        // zones created this round (render seed / tests)
  }
}

// Round/match reset (game.js runs this right AFTER the shared revertGoku(_f), which stamps speed 84 / dash 16 on
// EVERY fighter). Re-apply Arlong's own speed 78 / dashSpeed 13. Arlong-gated; no other fighter is touched.
export function arlongRoundReset(f) {
  if (!isArlong(f)) return
  const st = ARLONG_CHAR.stats
  f.baseSpeed = f.speed = st.speed
  f.dashSpeed = st.dashSpeed
  if (f._arlong) delete f._arlong
  f._skinAnim = null
  f._alSlick = 0
  f._alWinVar = 0
}
export function clearArlong(f) {
  if (f?._arlong || isArlong(f)) { delete f._arlong; delete f._arlongCues; if (isArlong(f)) f._skinAnim = null }
}

export const tideBlocked = f => !!(f?._arlong && (f._arlong.lockout > 0 || f._arlong.inSuper))
export function gainTide(f, n) { if (isArlong(f) && !tideBlocked(f)) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + n) }

const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}
// Facing-relative numpad motion string over the last `win` input ticks (same reader as Zoro's / Buggy's).
export function recentMotion(s, win) {
  const from = s.tick - win; let str = ''
  for (let i = 0; i < s.dirs.length; i++) {
    const [tok, at] = s.dirs[i], next = s.dirs[i + 1]
    if (at >= from || !next || next[1] > from) str += tok
  }
  return str
}

export const ctrX = f => (f.x || 0) + (f.w || 48) / 2
export const ctrY = f => (f.y || 0) + (f.h || 94) * 0.45
export const feetY = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)

// ── FISHMAN IN HIS ELEMENT — water zones (brief Phase 3) ────────────────────────────────────────────────────
// Each zone ≈ 18% of the 1280 px reference screen, lives 8 s, max 3 on screen. Overlapping zones MERGE into one
// wider zone (capped at 30%) instead of stacking. Positional state only — the render reads it, never writes it.
export const ARLONG_ZONE = { width: Math.round(SCREEN * 0.18), maxWidth: Math.round(SCREEN * 0.30), life: 480, max: 3,
  dmgMul: 1.15, speedMul: 1.25, swimInvuln: 8, foeSlide: 1.10 }
export function addZone(f, cx, width = ARLONG_ZONE.width, W = null) {
  const s = arlongState(f); if (!s) return null
  const sw = W?.stageWidth?.() || 3200, Z = ARLONG_ZONE
  let x0 = cx - width / 2, x1 = cx + width / 2
  // merge every zone the new one overlaps (repeat: a merged zone can reach a third)
  for (let again = true; again;) {
    again = false
    for (let i = s.zones.length - 1; i >= 0; i--) {
      const z = s.zones[i]
      if (z.x < x1 && z.x + z.width > x0) { x0 = Math.min(x0, z.x); x1 = Math.max(x1, z.x + z.width); s.zones.splice(i, 1); again = true }
    }
    if (x1 - x0 > Z.maxWidth) { const c = (x0 + x1) / 2; x0 = c - Z.maxWidth / 2; x1 = c + Z.maxWidth / 2 }
  }
  x0 = Math.max(0, Math.min(sw - (x1 - x0), x0))
  const z = { x: Math.round(x0), width: Math.round(Math.min(Z.maxWidth, x1 - x0)), bornFrame: s.clock, owner: f.side ?? f.playerNumber ?? 1 }
  s.zones.push(z); s.zoneSeq++
  while (s.zones.length > Z.max) {   // the oldest dries up first
    let k = 0; for (let i = 1; i < s.zones.length; i++) if (s.zones[i].bornFrame < s.zones[k].bornFrame) k = i
    s.zones.splice(k, 1)
  }
  acue(f, 'splash')
  return z
}
export const zoneAt = (s, x) => !!s && s.zones.some(z => x >= z.x && x <= z.x + z.width)
export const inWater = (f, s = f?._arlong) => !!s && (s.flood > 0 || (grounded(f) && zoneAt(s, ctrX(f))))

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
// W = world accessors from game.js (stageWidth, frame, damage, …).
export function tickArlong(f, opp, raw = {}, W = null) {
  if (!isArlong(f)) { if (f?._arlong) clearArlong(f); return }
  const s = arlongState(f)
  s.tick++
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  // edgeDir = the direction held when the button went down (a buffered ↓+H pressed in hitstop stays ↓+H)
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock; s.edgeDir[k] = tok } s.prev[k] = v }
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  if (f.health <= 0) return
  if (f.hitstop > 0) return
  s.clock++
  if (s.lockout > 0) s.lockout--
  if (grounded(f)) s.groundY = feetY(f)
  // zones dry up after 8 s; the flood counts down
  for (let i = s.zones.length - 1; i >= 0; i--) if (s.clock - s.zones[i].bornFrame >= ARLONG_ZONE.life) s.zones.splice(i, 1)
  if (s.flood > 0) s.flood--
  const wasWet = s.wet
  s.wet = inWater(f, s)
  if (s.wet && !wasWet) acue(f, 'waterIn')
  // +2 Tide/s extra while standing in his water
  if (s.wet) { if (++s.waterTide >= ARLONG_TIDE.waterEvery) { s.waterTide = 0; gainTide(f, 1) } } else s.waterTide = 0
  // SWIM-DASH: a dash started inside his water has 8 invulnerable frames (and ×1.25 speed, arlongDashMul).
  if ((f.dashTimer || 0) > s.dashPrev && s.wet) { f.invulnTimer = Math.max(f.invulnTimer || 0, ARLONG_ZONE.swimInvuln); acue(f, 'swim') }
  // THE OPPONENT IN HIS WATER: no buff, but slick footing — walking / dashing AWAY from Arlong goes 10% further.
  if (opp && !isArlong(opp)) opp._alSlick = (grounded(opp) && !(opp.health <= 0) && (s.flood > 0 || zoneAt(s, ctrX(opp)))) ? (Math.sign(ctrX(opp) - ctrX(f)) || 1) : 0
  // Super bookkeeping: the Tide lockout starts when the Super ends (any way it ends).
  const a = f.attacking ? f.currentAttack : null
  if (s.inSuper && !(a && a.al?.kind === 'super')) { s.inSuper = false; s.lockout = ARLONG_SUPER_LOCKOUT }
  // Grounded specials / the Super are PLANTED (moves with their own travel set vx themselves in tickMove).
  if (a && a.al && (a.isSpecial || a.isUltimate) && grounded(f)) { f.vx = 0; f.dashTimer = 0 }
  if (a && a.al) tickMove(f, opp, s, a, W)
  s.dashPrev = f.dashTimer || 0
  // IDLE > 10 s: he rests the blade on his shoulder and flexes (presentation swap only).
  const still = grounded(f) && !f.attacking && !f.isBlocking && !(f.hitstun > 0) && Math.abs(f.vx || 0) < 0.3 && !BUTTONS.some(k => raw[k])
  s.idleT = still ? s.idleT + 1 : 0
  applyAnimSet(f, s)
}
export const ARLONG_IDLE = { after: 600 }

// Victory pose variant (1 = portrait grin + planted blade · 2 = wide stance → blade overhead). A pure hash of SIM
// values frozen at the KO (health, Tide, sim tick) → both LAN peers agree; cached on the fighter for the round.
export function arlongWinVariant(f) {
  if (!f._alWinVar) {
    let h = Math.imul((f.health | 0) + 1, 73856093) ^ Math.imul((f.energy | 0) + 3, 19349663) ^ Math.imul((f._arlong?.tick | 0) + 7, 83492791)
    h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13
    f._alWinVar = ((h >>> 0) & 1) ? 2 : 1
  }
  return f._alWinVar
}
function applyAnimSet(f, s) {
  let want = null
  if (f._forceAction === 'win') want = arlongWinVariant(f) === 2 ? ARLONG_WIN2_ANIM : null
  else if (s.idleT >= ARLONG_IDLE.after) want = ARLONG_FLEX_ANIM
  if ((f._skinAnim || null) !== want) f._skinAnim = want
}

let _startMove = null   // combat.startMove, handed in by arlong.js (avoids a combat ↔ arlongState import cycle)
export function registerArlongStartMove(fn) { _startMove = fn }

// Start one of Arlong's moves through the engine's startMove (frameExact path) + attach his descriptor `al`
// (kind / spawn frames / hitbox shape / per-move blockstun), read by tickMove and the combat.js hooks below.
export function arlongStartMove(f, key, startMove = _startMove) {
  const md = ARLONG_MOVES[key]; if (!md || !startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!startMove(f, key, md)) return false
  const a = f.currentAttack, g = md.al || {}
  f.currentMove = key
  a.al = { kind: g.kind || 'normal', ...g, blockstun: md.blockstun, dir: f.facing || 1 }
  if (g.noHit) a.hasHit = true
  if (md.invuln) f.invulnTimer = Math.max(f.invulnTimer || 0, md.invuln)
  if (md.isSpecial || md.isUltimate) { f.vx = 0; f.isBlocking = false }
  if (key === 'aSuper') { const s = arlongState(f); s.inSuper = true }
  return true
}

const elapsed = a => a.total - a.timer

function tickMove(f, opp, s, a, W) {
  const g = a.al, t = elapsed(a), dir = g.dir || f.facing || 1
  // advancing normals (Lunge punch / Shark On Tooth): a fixed forward velocity over [t0, t1)
  if (g.lunge && t >= g.lunge[0] && t < g.lunge[1]) { f.vx = dir * g.lunge[2]; f.facing = dir }
}

// ── combat.js hooks (arlong-gated no-ops for everyone else) ─────────────────────────────────────────────────
// Hitbox: Arlong's own box descriptor (noHit specials, centred / raised / low boxes).
export function arlongHitbox(f) {
  const a = f.currentAttack, g = a?.al
  if (!g || g.noHit) return null
  const reach = (a.rangeX || 60) * (f._reachMult || 1), h = a.rangeY || 40, fw = f.w || 48
  if (g.centered) return { x: f.x + fw / 2 - reach / 2, y: f.y + (g.boxY ?? 20), w: reach, h }
  if (a.name === 'air' || a.name === 'aKAir') { const behind = 16, w = behind + fw + reach; return { x: f.facing === 1 ? f.x - behind : f.x + fw + behind - w, y: f.y - 25, w, h: h + 45 } }
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (g.boxY ?? (a.name === 'up' ? -30 : 20)), w: reach, h }
}
// Per-move block stun (designed block advantage +1 / −3 / −5 / −8 / −12 …).
export function arlongBlockstun(attacker, defender, atk) {
  if (isArlong(attacker) && atk?.al?.blockstun != null) defender.blockstun = atk.al.blockstun
}
// Combo scaling: 85% per hit (the counter resets after 1.5 s idle — the engine's comboTimer 90).
export const arlongComboScale = f => Math.pow(0.85, Math.max(0, (f?.comboCounter || 0)))
// Melee hit bookkeeping (combat.resolveAttackHit, clean connects only): Tide +5 per karate (blunt) hit, +3 per
// blade (slash) hit.
export function arlongHit(attacker, defender, atk) {
  if (!isArlong(attacker) || attacker === defender) return
  const type = meleeDamageType(attacker, atk)
  gainTide(attacker, type === 'slash' ? ARLONG_TIDE.perBladeHit : ARLONG_TIDE.perKarateHit)
  acue(attacker, type === 'slash' ? 'bladeHit' : 'punch')
}
// Knockback post-process on a connecting melee hit: weight 1.3 → knockback taken ÷ 1.3.
export function arlongKnockback(attacker, defender) {
  if (isArlong(defender) && defender.vx) defender.vx /= (ARLONG_CHAR.stats.weight || 1.3)
}
// HURTBOX: the big sawshark body — 20 px wider and 16 px taller than the roster-standard hurtbox (x+6, y+6, w−12,
// h−6), a designed weakness: he is easier to hit. Derived from x/y/w/h only → deterministic. Arlong-gated.
export function arlongHurtbox(f) {
  if (!isArlong(f)) return null
  return { x: f.x - 4, y: f.y - 10, w: Math.max(1, f.w + 8), h: Math.max(1, f.h + 10) }
}
// Walk speed multiplier (physics.js): the engine's 4.5 px/f floor × 4.4/4.5 = his brief's 4.4 px/f; ×1.25 in his
// water. A foe standing in his water walking AWAY from him (dir = held direction) slides 10% further.
export function arlongWalkMul(f, dir = 0) {
  if (!isArlong(f)) return (f?._alSlick && dir === f._alSlick) ? ARLONG_ZONE.foeSlide : 1
  return (4.4 / 4.5) * (f._arlong?.wet ? ARLONG_ZONE.speedMul : 1)
}
// Ground-dash speed multiplier (physics.js): Arlong's swim-dash ×1.25; a foe dashing away inside his water ×1.10.
export function arlongDashMul(f) {
  if (!isArlong(f)) return (f?._alSlick && (f.facing || 1) === f._alSlick) ? ARLONG_ZONE.foeSlide : 1
  return f._arlong?.wet ? ARLONG_ZONE.speedMul : 1
}
// Passive Tide regen: +1 per second while alive. Replaces the shared passive regen.
export function arlongRegen(f) {
  if (!isArlong(f)) return false
  const s = arlongState(f)
  if (f.health > 0 && !(f.hitstop > 0)) {
    if (++s.passive >= ARLONG_TIDE.passiveEvery) { s.passive = 0; gainTide(f, 1) }
  }
  return true
}
// applyScaledDamage hook (combat.js, the one damage choke-point). Returns rawDamage untouched for everyone else.
// IN HIS ELEMENT: every damage Arlong deals while standing in his water is +15% (melee, projectiles, specials).
export function arlongDamageMods(target, rawDamage, opts = {}) {
  const a = opts.attacker
  if (a && a !== target && isArlong(a) && a._arlong?.wet && opts.source !== 'block-chip') rawDamage = (rawDamage || 0) * ARLONG_ZONE.dmgMul
  return rawDamage
}
