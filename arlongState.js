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
    teeth: 3,          // TOOTH REGROWTH: 0-3 serrated teeth; bite moves spend one
    toothT: 0,         // frames toward the next regrown tooth (240 each)
    bites: 0,          // bites spent this round (stat / tests)
    bleed: 0, bleedT: 0,   // BLEED on the foe after a Bite: frames left · frames to the next tick
    blade: { st: 'hand' },   // KIRIBACHI: 'hand' | 'flying' {x,y,dir,trav,hit} | 'planted' {x} | 'recall' {x,hit}
    shots: [],         // WATER SHOT jets in flight [{x, y, dir, trav, n}]
    waves: [],         // SEIKEN water shockwaves [{x, y, dir, trav, n}]
    darts: null,       // SHARK ON DARTS travel {x0, x1, hit}
    sup: null,         // ARLONG PARK script bookkeeping {scale, hits, path}
    fx: [],            // impact bursts [{k, x, y, t}] (render reads; pure function of the sim)
    splash: 0,         // full-screen splash frames (Super finisher)
    serial: 0,
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

// ── TOOTH REGROWTH (brief Phase 4) ──────────────────────────────────────────────────────────────────────────
// Bite moves consume a tooth and hit much harder than normal moves. Teeth regrow one at a time (4 s each) or
// refill to full instantly when Shark On Darts lands. At 0 teeth the bites become a weaker headbutt (same frames).
export const ARLONG_TEETH = { max: 3, regrow: 240, bleedFrames: 120, bleedEvery: 20, bleedDmg: 4 }
export const BITE_FALLBACK = { aBite: 'aHeadbutt', aTooth: 'aToothHead' }
export const hasTeeth = f => (f?._arlong?.teeth ?? ARLONG_TEETH.max) > 0
export function refillTeeth(f) { const s = arlongState(f); if (s && s.teeth < ARLONG_TEETH.max) { s.teeth = ARLONG_TEETH.max; s.toothT = 0; acue(f, 'regrow') } }

// ── MOVESET machinery (brief Phase 5) ───────────────────────────────────────────────────────────────────────
export const ARLONG_SPECIAL = {
  darts: { dist: Math.round(SCREEN * 0.65) },                       // 832 px torpedo run
  seiken: { range: Math.round(SCREEN * 0.40), speed: 22, zoneAhead: 150 },   // 512 px compressed water shockwave
  shot: { range: Math.round(SCREEN * 0.50), speed: 17 },            // 640 px fast jet
  throw: { range: 760, speed: 19 },                                  // the Kiribachi spins across the screen
  recall: { speed: 22 }, pickup: { reach: 70 },
}
export const bladeInHand = f => (f?._arlong?.blade?.st ?? 'hand') === 'hand'
let _W = null   // world accessors from game.js (set every tick; stage width / damage choke-point)
const hurt = o => ({ x: (o.x || 0) + 6, y: (o.y || 0) + 6, w: Math.max(1, (o.w || 48) - 12), h: Math.max(1, (o.h || 94) - 6) })
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
function burst(s, k, x, y, t = 14) { s.fx.push({ k, x: Math.round(x), y: Math.round(y), t, n: ++s.serial }); if (s.fx.length > 12) s.fx.shift() }

// One hit from a travelling strike / projectile / wave. Respects invulnerability and guard; damage goes through the
// engine's damage choke-point (GLOBAL scale, Buggy's slash immunity, the brutality stamp). Returns true | 'blocked'
// | 'nullified' | false.
export function strike(f, foe, dmg, o = {}) {
  if (!foe || foe === f || (foe.invulnTimer || 0) > 0 || !(foe.health > 0) || (foe.knockdownState && !o.otg)) return false
  const s = arlongState(f), dir = o.dir || Math.sign(ctrX(foe) - ctrX(f)) || f.facing || 1, type = o.damageType || 'blunt'
  if (foe.isBlocking && !o.unblockable) {
    foe.blockstun = Math.max(foe.blockstun || 0, o.blockstun || 14)
    foe.vx = dir * 3
    if (o.chip) _W?.damage?.(foe, o.chip, { source: 'ability', attacker: f, move: o.move, damageType: type, noWater: true })   // guaranteed chip (Seiken: 15)
    f.comboCounter = 0; f.comboTimer = 0   // a blocked hit ends the combo (as the engine's melee / projectile paths do)
    acue(f, 'blocked'); return 'blocked'
  }
  const scaled = dmg * (o.fixedScale ?? Math.pow(0.85, f.comboCounter || 0))
  const dealt = _W?.damage?.(foe, scaled, { source: 'ability', attacker: f, move: o.move, damageType: type, noWater: !!o.noWater })
  if (dealt === 0 && scaled > 0 && type === 'slash' && foe.rosterKey === 'buggy') return 'nullified'   // Bara Bara no Mi ate it
  foe.hitstun = Math.max(foe.hitstun || 0, o.hitstun || 20)
  foe.vx = dir * (o.kb ?? 5)
  if (o.launch) foe.vy = o.launch
  if (o.knockdown) { foe.knockdownState = true; foe.knockdownTimer = Math.max(foe.knockdownTimer || 0, 44); foe.vy = o.launch || -7 }
  foe.hitFlash = Math.max(foe.hitFlash || 0, 6)
  foe.isBlocking = false
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  if (!o.noTide) gainTide(f, type === 'slash' ? ARLONG_TIDE.perBladeHit : type === 'blunt' ? ARLONG_TIDE.perKarateHit : 0)
  burst(s, type === 'slash' ? 'b' : 'a', ctrX(foe), ctrY(foe))
  acue(f, o.cue || (type === 'slash' ? 'bladeHit' : 'punch'))
  return true
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
// W = world accessors from game.js (stageWidth, frame, damage, …).
export function tickArlong(f, opp, raw = {}, W = null) {
  if (!isArlong(f)) { if (f?._arlong) clearArlong(f); return }
  const s = arlongState(f)
  if (W) _W = W
  s.tick++
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  // edgeDir = the direction held when the button went down (a buffered ↓+H pressed in hitstop stays ↓+H)
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock; s.edgeDir[k] = tok } s.prev[k] = v }
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  if (f.health <= 0) return
  if (f.hitstop > 0) return
  s.clock++
  if (s.lockout > 0) s.lockout--
  // teeth regrow one at a time
  if (s.teeth < ARLONG_TEETH.max) { if (++s.toothT >= ARLONG_TEETH.regrow) { s.toothT = 0; s.teeth++; acue(f, 'regrow') } } else s.toothT = 0
  // BLEED (after a Bite): 4 damage every 20 frames for 2 s on the foe
  if (s.bleed > 0) {
    s.bleed--
    if (++s.bleedT >= ARLONG_TEETH.bleedEvery) { s.bleedT = 0; if (opp && opp.health > 0) W?.damage?.(opp, ARLONG_TEETH.bleedDmg, { source: 'ability', attacker: f, move: 'aBite', damageType: 'slash' }) }
  }
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
  if (s.inSuper && !(a && a.al?.kind === 'super')) {
    s.inSuper = false; s.lockout = ARLONG_SUPER_LOCKOUT; s.sup = null
    if (s.flood > 0) { s.flood = 0; addZone(f, ctrX(f), ARLONG_ZONE.width, _W) }   // the flood recedes into one normal zone under him
  }
  // Grounded specials / the Super are PLANTED (moves with their own travel set vx themselves in tickMove).
  if (a && a.al && (a.isSpecial || a.isUltimate) && grounded(f)) { f.vx = 0; f.dashTimer = 0 }
  if (a && a.al) tickMove(f, opp, s, a, W)
  tickBlade(f, opp, s)
  tickShots(f, opp, s)
  tickWaves(f, opp, s)
  for (let i = s.fx.length - 1; i >= 0; i--) if (--s.fx[i].t <= 0) s.fx.splice(i, 1)
  if (s.splash > 0) s.splash--
  s.dashPrev = f.dashTimer || 0
  // IDLE > 10 s: he rests the blade on his shoulder and flexes (presentation swap only).
  const still = grounded(f) && !f.attacking && !f.isBlocking && !(f.hitstun > 0) && Math.abs(f.vx || 0) < 0.3 && !BUTTONS.some(k => raw[k])
  if (s.wet && s.clock % 48 === 0) acue(f, 'lap')   // standing in water: the quiet lap / ripple loop (audio cue only)
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
  if (md.cost) f.energy = Math.max(0, (f.energy || 0) - md.cost)   // specials / Super spend Tide on commit
  const a = f.currentAttack, g = md.al || {}
  f.currentMove = key
  a.al = { kind: g.kind || 'normal', ...g, blockstun: md.blockstun, dir: f.facing || 1 }
  if (g.noHit) a.hasHit = true
  if (md.invuln) f.invulnTimer = Math.max(f.invulnTimer || 0, md.invuln)
  if (md.isSpecial || md.isUltimate) { f.vx = 0; f.isBlocking = false }
  if (key === 'aSuper') { const s = arlongState(f); s.inSuper = true }
  if (g.tooth) { const s = arlongState(f); s.teeth = Math.max(0, s.teeth - 1); s.bites++ }   // a bite spends a tooth on commit
  return true
}

const elapsed = a => a.total - a.timer

function tickMove(f, opp, s, a, W) {
  const g = a.al, t = elapsed(a), dir = g.dir || f.facing || 1
  const sw = W?.stageWidth?.() || 3200, fw = f.w || 48
  // advancing normals (Lunge punch / Shark On Tooth): a fixed forward velocity over [t0, t1)
  if (g.lunge && t >= g.lunge[0] && t < g.lunge[1]) { f.vx = dir * g.lunge[2]; f.facing = dir }
  switch (g.kind) {
    case 'darts': {   // SHARK ON DARTS: nose-first torpedo, 65% of the screen, straight THROUGH the foe
      const [t0, t1] = g.travel
      if (t === t0) {
        s.darts = { x0: f.x, x1: Math.max(0, Math.min(sw - fw, f.x + dir * ARLONG_SPECIAL.darts.dist)), hit: false }
        acue(f, 'darts')
      }
      if (s.darts && t > t0 && t <= t1) {
        f.x = Math.round(s.darts.x0 + (s.darts.x1 - s.darts.x0) * (t - t0) / (t1 - t0)); f.vx = 0; f.facing = dir
        if (!s.darts.hit && opp && overlaps({ x: f.x, y: f.y + 20, w: fw, h: (f.h || 94) - 30 }, hurt(opp))) {
          s.darts.hit = true
          const r = strike(f, opp, g.dmg, { dir, hitstun: 34, kb: 6, launch: -5, damageType: 'blunt', move: 'aDarts', cue: 'dartsHit' })
          if (r === true) refillTeeth(f)   // TOOTH REGROWTH: landing Shark On Darts refills every tooth
        }
      }
      if (t === t1 && s.darts) { addZone(f, ctrX(f), ARLONG_ZONE.width, W); s.darts = null; if (opp) f.facing = ctrX(opp) < ctrX(f) ? -1 : 1 }
      break
    }
    case 'seiken':   // GOSENMAIGAWARA SEIKEN: a compressed water shockwave + a zone in front of him
      if (t === g.spawnAt) {
        s.waves.push({ x: ctrX(f) + dir * 40, y: feetY(f) - 46, dir, trav: 0, n: ++s.serial, dmg: g.dmg, chip: g.chip })
        addZone(f, ctrX(f) + dir * ARLONG_SPECIAL.seiken.zoneAhead, ARLONG_ZONE.width, W)
        burst(s, 'a', ctrX(f) + dir * 50, ctrY(f), 18)
        acue(f, 'seiken')
      }
      break
    case 'throw':   // KIRIBACHI THROW: the saw spins across the screen, then plants where it stops
      if (t === g.spawnAt && bladeInHand(f)) { s.blade = { st: 'flying', x: ctrX(f) + dir * 30, y: (f.y || 0) + 30, dir, trav: 0, hit: false, dmg: g.dmg }; acue(f, 'throw') }
      break
    case 'recall':
      if (t === g.spawnAt && s.blade.st === 'planted') { s.blade = { st: 'recall', x: s.blade.x, hit: false, dmg: g.dmg }; acue(f, 'recall') }
      break
    case 'pickup':
      if (t === g.spawnAt && s.blade.st === 'planted') { s.blade = { st: 'hand' }; acue(f, 'pickup') }
      break
    case 'shot':
      if (t === g.spawnAt) { s.shots.push({ x: ctrX(f) + dir * 36, y: (f.y || 0) + 40, dir, trav: 0, n: ++s.serial, dmg: g.dmg }); if (s.shots.length > 4) s.shots.shift(); acue(f, 'shot') }
      break
    case 'tidal':   // TIDAL SWEEP: on a whiff the wave still breaks at the blade's tip (a zone there)
      if (t === a.activeEnd + 1 && !a.hasHit && g.zoneOnWhiff) addZone(f, ctrX(f) + dir * (fw / 2 + (a.rangeX || 100) * 0.7), ARLONG_ZONE.width, W)
      if (t === a.activeStart) acue(f, 'wave')
      break
    case 'super': tickSuper(f, opp, s, a, g, t, W); break
  }
}

// The Kiribachi when it is NOT in his hands: flying → planted → (recall) → hand.
function tickBlade(f, opp, s) {
  const b = s.blade, sw = _W?.stageWidth?.() || 3200, floor = s.groundY ?? feetY(f)
  if (b.st === 'flying') {
    const T = ARLONG_SPECIAL.throw
    b.x += b.dir * T.speed; b.trav += T.speed
    if (!b.hit && opp && overlaps({ x: b.x - 26, y: b.y - 26, w: 52, h: 52 }, hurt(opp))) {
      b.hit = true
      const r = strike(f, opp, b.dmg, { dir: b.dir, hitstun: 26, kb: 5, damageType: 'slash', move: 'aThrow', cue: 'bladeHit' })
      if (r) { s.blade = { st: 'planted', x: Math.round(b.x) }; acue(f, 'plant'); return }   // it drops and plants where it hit
    }
    if (b.trav >= T.range || b.x <= 20 || b.x >= sw - 20) { s.blade = { st: 'planted', x: Math.round(Math.max(20, Math.min(sw - 20, b.x))) }; acue(f, 'plant') }
  } else if (b.st === 'recall') {   // flies back along the GROUND toward him, 70 to anything in its path
    const T = ARLONG_SPECIAL.recall, home = ctrX(f), d = Math.sign(home - b.x) || 1
    b.x += d * T.speed
    if (!b.hit && opp && overlaps({ x: b.x - 30, y: floor - 60, w: 60, h: 60 }, hurt(opp))) {
      b.hit = true; strike(f, opp, b.dmg, { dir: d, hitstun: 24, kb: 6, damageType: 'slash', move: 'aRecall', cue: 'bladeHit', otg: true })
    }
    if (Math.abs(home - b.x) <= T.speed) { s.blade = { st: 'hand' }; acue(f, 'catch') }
  }
}
function tickShots(f, opp, s) {
  const T = ARLONG_SPECIAL.shot
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const p = s.shots[i]
    p.x += p.dir * T.speed; p.trav += T.speed
    if (opp && overlaps({ x: p.x - 18, y: p.y - 12, w: 36, h: 24 }, hurt(opp))) {
      strike(f, opp, p.dmg, { dir: p.dir, hitstun: 18, kb: 4, damageType: 'projectile', move: 'aShot', cue: 'shotHit', blockstun: 12 })
      burst(s, 'w', p.x, p.y); s.shots.splice(i, 1); continue
    }
    if (p.trav >= T.range) s.shots.splice(i, 1)
  }
}
function tickWaves(f, opp, s) {
  const T = ARLONG_SPECIAL.seiken
  for (let i = s.waves.length - 1; i >= 0; i--) {
    const w = s.waves[i]
    w.x += w.dir * T.speed; w.trav += T.speed
    if (!w.hit && opp && overlaps({ x: w.x - 30, y: w.y - 40, w: 60, h: 90 }, hurt(opp))) {
      w.hit = true
      strike(f, opp, w.dmg, { dir: w.dir, hitstun: 32, kb: 9, launch: -4, damageType: 'blunt', move: 'aSeiken', chip: w.chip, blockstun: 18, cue: 'seikenHit' })
    }
    if (w.trav >= T.range) s.waves.splice(i, 1)
  }
}

// SUPER — ARLONG PARK. The stage floods; he submerges and strikes 4× as a torpedo from different angles (60 each),
// then surfaces with the Kiribachi overhead and brings it down (120). 360 raw. Scaling is LOCKED at the start.
const SUPER_PATHS = [   // [start dx, start dy, end dx, end dy] relative to the foe's centre / feet, × facing
  [-260, -40, 230, -40], [260, -40, -230, -40], [-200, 60, 160, -150], [200, -170, -160, 40]]
function tickSuper(f, opp, s, a, g, t, W) {
  const dir = g.dir || f.facing || 1, fw = f.w || 48, fh = f.h || 94, floor = s.groundY ?? feetY(f), sw = W?.stageWidth?.() || 3200
  if (t === 1) { s.sup = { scale: Math.pow(0.85, f.comboCounter || 0), hits: 0 }; s.blade = { st: 'hand' }; s.shots = []; acue(f, 'superStart') }
  if (t === g.flood) {
    s.flood = 200; acue(f, 'flood')
    // the flood CATCHES a foe who isn't guarding: held until the first torpedo arrives (a guarding foe blocks the strikes)
    if (opp && !opp.isBlocking && !((opp.invulnTimer || 0) > 0)) { opp.hitstun = Math.max(opp.hitstun || 0, g.strikes[0] - g.flood + 8); opp.vx = 0 }
  }
  if (!opp || !s.sup) return
  const ox = ctrX(opp), oy = (opp.y || 0) + (opp.h || 94) * 0.5
  f.vy = 0; f.vx = 0
  const place = (cx, cy) => { f.x = Math.round(Math.max(0, Math.min(sw - fw, cx - fw / 2))); f.y = Math.round(Math.min(floor - fh, cy - fh / 2)) }
  for (let k = 0; k < g.strikes.length; k++) {
    const hitAt = g.strikes[k], t0 = hitAt - 8, t1 = hitAt + 6
    if (t < t0 || t > t1) continue
    const [sx, sy, ex, ey] = SUPER_PATHS[k], u = (t - t0) / (t1 - t0)
    place(ox + dir * (sx + (ex - sx) * u), oy + sy + (ey - sy) * u)
    f.facing = Math.sign(ex - sx) * dir || dir
    if (t === t0) acue(f, 'darts')
    if (t === hitAt && strike(f, opp, g.strikeDmg, { hitstun: 46, kb: 1, launch: -3, damageType: 'blunt', move: 'aSuper', fixedScale: s.sup.scale, noWater: true, noTide: true, cue: 'dartsHit', otg: true }) === true) s.sup.hits++
    return
  }
  if (t >= g.rise) {   // surfaces above the foe with the Kiribachi overhead
    f.facing = dir
    place(ox - dir * 70, Math.min(floor - fh / 2, oy - 40 + Math.min(1, (t - g.rise) / 10) * 40))
    if (t === g.rise) acue(f, 'surface')
    if (t === g.slamAt) {
      if (strike(f, opp, g.slamDmg, { dir, hitstun: 60, kb: 10, launch: -10, knockdown: true, damageType: 'slash', move: 'aSuper', fixedScale: s.sup.scale, noWater: true, noTide: true, cue: 'superSlam', otg: true }) === true) s.sup.hits++
      s.splash = 36; burst(s, 'b', ox, oy, 24)
    }
    return
  }
  place(ox - dir * 120, floor + fh * 0.2)   // submerged between strikes (below the waterline)
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
  const g = atk?.al || {}
  if (g.bleed) { const s = arlongState(attacker); s.bleed = ARLONG_TEETH.bleedFrames; s.bleedT = 0 }
  if (g.zoneOnHit) addZone(attacker, ctrX(defender), ARLONG_ZONE.width, _W)   // Shark On Tooth / Tidal Sweep: water under the foe
  if (g.knockdown) { defender.knockdownState = true; defender.knockdownTimer = Math.max(defender.knockdownTimer || 0, 44); defender.vy = Math.min(defender.vy || 0, -6) }
  acue(attacker, g.tooth ? 'biteHit' : type === 'slash' ? 'bladeHit' : 'punch')
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
// FISHMAN DURABILITY (passive, defence): of any single hit ABOVE 100 (nominal, pre-GLOBAL_DAMAGE_SCALE units) the
// first 60 is reduced by 20% → −12 nominal. Melee arrives pre-scaled (scale 1), abilities raw (scale 0.6): both
// are normalised to nominal units first, so the reduction is the same 12 whatever the source.
export const ARLONG_DURABILITY = { above: 100, first: 60, cut: 0.2 }
const GLOBAL_SCALE = 0.6   // combat.GLOBAL_DAMAGE_SCALE (kept in sync by harness/arlong_final.test.mjs)
export function arlongDamageMods(target, rawDamage, opts = {}) {
  const a = opts.attacker
  if (a && a !== target && isArlong(a) && a._arlong?.wet && opts.source !== 'block-chip' && !opts.noWater) rawDamage = (rawDamage || 0) * ARLONG_ZONE.dmgMul
  if (isArlong(target) && a && a !== target && (rawDamage || 0) > 0) {
    const scale = opts.bypassScale ? 1 : opts.scale != null ? opts.scale : GLOBAL_SCALE
    const nominal = rawDamage * scale / GLOBAL_SCALE, D = ARLONG_DURABILITY
    if (nominal > D.above) rawDamage -= (D.first * D.cut) * GLOBAL_SCALE / scale
  }
  return rawDamage
}
