// sanjiState.js — Sanji authoritative state (GAME_STATE). Everything lives in `fighter._sanji` as plain JSON
// (numbers / booleans / strings / small arrays — no callbacks, no object refs), so it is in the replay checkpoint
// and reproduced bit-identically. No Math.random / gameRng anywhere in the kit: every timing is a fixed frame
// count, every position derives from the two fighters' positions, and the one "random" choice (fire-crackle
// variation, render/audio only) hashes (match seed, frame, player index).
import { SANJI_MOVES, sanji as SANJI_CHAR, SANJI_BASE_ANIM } from './sanjiData.js'
export const isSanji = f => f?.rosterKey === 'sanji'
// Audio cue queue (presentation only — played + cleared by game.js right after tickSanji; never read by the sim).
export function scue(f, c) { (f._sanjiCues ||= []).push(c) }

// HEAT economy (brief): +4 per kick landed, +2 per kick blocked, +0.5/s passive, +8 per completed Course step.
export const SANJI_HEAT = { perHit: 4, perBlock: 2, passiveEvery: 120, perCourseStep: 8 }
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function sanjiState(f) {
  if (!isSanji(f)) return null
  return f._sanji ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (advances EVERY call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Heat (every 120 = +0.5/s)
    idle: 0,           // consecutive neutral-idle frames (smoke / tie idle after 600)
    prev: {}, edgeAt: {}, edgeClk: {}, used: {},   // raw buttons last tick / press-edge tick / press-edge SIM clock / edge consumed
    dirs: [],          // condensed facing-relative direction history [[numpad, tick], …] (motion inputs)
    lockout: 0,        // Heat gain lockout (after the super)
    serial: 0,         // projectile serial (render bookkeeping)
    phase: 0,          // 1 while spinning / dashing THROUGH the opponent (physics pass-through)
  }
}

export function clearSanji(f) {
  if (f?._sanji || isSanji(f)) { delete f._sanji; delete f._sanjiCues; if (isSanji(f)) { f._skinAnim = null; restoreSpeed(f) } }
}
function restoreSpeed(f) { const st = SANJI_CHAR.stats; f.dashSpeed = st.dashSpeed }
// Round/match reset (game.js runs this right AFTER the shared revertGoku(_f), which stamps Goku's speed 84 / dash
// 16 on EVERY fighter): re-apply Sanji's own walk / run numbers.
export function sanjiRoundReset(f) {
  if (!isSanji(f)) return
  const st = SANJI_CHAR.stats
  f.baseSpeed = f.speed = st.speed
  f.dashSpeed = st.dashSpeed
}

const elapsed = a => (a ? a.total - a.timer : -1)
const sj = f => (f.attacking && f.currentAttack?.sj) || null
const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}
export const heatBlocked = f => !!(f?._sanji && f._sanji.lockout > 0)
export function gainHeat(f, n) { if (!heatBlocked(f)) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + n) }

// Tear down the live attack and start a Sanji move (frame-exact). Copies the hitbox geometry + block stun.
export function sanjiStartMove(f, key, startMove) {
  const md = SANJI_MOVES[key]; if (!md || !startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!startMove(f, key, md)) return false
  const a = f.currentAttack, g = md.sj || {}
  f.currentMove = key
  // Sanji's own descriptor (NOT `lf`: tickLuffy clears any non-Luffy attack carrying `lf`). Hitbox geometry is read
  // by sanjiHitbox via a one-line gate at the top of combat.getAttackHitbox.
  a.sj = { kind: g.kind || 'normal', ...g, blockstun: md.blockstun, dir: f.facing || 1 }   // dir: locked at start
  if (g.contacts) a.sj.contact = -1
  if (g.noHit) a.hasHit = true
  const inv = md.invuln || g.invuln || 0
  if (inv) f.invulnTimer = Math.max(f.invulnTimer || 0, inv)
  if (md.isSpecial || md.isUltimate) { f.vx = 0; f.isBlocking = false }
  return true
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
// W = world accessors from game.js: { projectiles, spawn(f,type,data), startMove, stageWidth(), damage(), frame(), seed() }.
export function tickSanji(f, opp, raw = {}, W = null) {
  if (!isSanji(f)) { if (f?._sanji) clearSanji(f); return }
  const s = sanjiState(f)
  // Raw press edges + direction history are observed every tick (even in stun / hitstop).
  s.tick++
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  // Press edges keep the direction held AT the edge (a buffered ↓+B pressed in hitstop stays ↓+B).
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock; (s.edgeDir ||= {})[k] = tok } s.prev[k] = v }
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  if (f.health <= 0) return
  if (f.hitstop > 0) return
  s.clock++
  if (s.lockout > 0) s.lockout--
  const neutral = !f.attacking && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isBlocking && (f.onGround || f.grounded) &&
    !raw.left && !raw.right && !raw.up && !raw.down && !raw.jump && Math.abs(f.vx || 0) < 0.5
  s.idle = neutral ? s.idle + 1 : 0
  // Idle > 10 s (600 frames): he exhales smoke and settles his tie (render-only; any input or movement ends it).
  const lounging = s.idle > 600 && opp && opp.health > 0   // never during a KO / FINISH window (win poses own that)
  if (lounging && !f._forceAction) { f._forceAction = 'idleLong'; s.lounge = true }
  else if (s.lounge && !lounging) { if (f._forceAction === 'idleLong') f._forceAction = null; s.lounge = false }
  s.phase = 0
  const z = sj(f)
  if (z) tickMove(f, opp, s, z, W)
}

function tickMove(f, opp, s, z, W) {
  const a = f.currentAttack, t = elapsed(a), dir = z.dir || f.facing || 1
  const sw = W?.stageWidth?.() || 3200
  const clampX = x => Math.max(0, Math.min(sw - (f.w || 48), x))
  switch (z.kind) {
    case 'handstand': {   // spins THROUGH on his hands (pass-through) → lands on the far side facing the other way
      const [st, en, step] = z.slide
      if (t >= st && t < en) { s.phase = 1; f.facing = dir; f.x = clampX(f.x + dir * step); f.vx = 0 }
      break
    }
  }
}

// Passive Heat regen: +0.5/s (+1 per 120 sim frames) while alive. Replaces the shared passive regen.
export function sanjiRegen(f) {
  if (!isSanji(f)) return false
  const s = sanjiState(f)
  if (f.health > 0 && !(f.hitstop > 0)) {
    if (++s.passive >= SANJI_HEAT.passiveEvery) { s.passive = 0; gainHeat(f, 1) }
  }
  return true
}

const isKick = atk => !!atk?.sj
// Melee hit bookkeeping (combat.resolveAttackHit, clean connects only).
export function sanjiHit(attacker, defender, atk) {
  if (!isSanji(attacker) || attacker === defender || !isKick(atk)) return
  gainHeat(attacker, SANJI_HEAT.perHit)
  scue(attacker, 'impact')
}
// Per-move block stun (combat block branch) + Heat on a blocked kick.
export function sanjiBlockstun(attacker, defender, atk) {
  if (!isSanji(attacker) || !isKick(atk)) return
  if (atk.sj.blockstun != null) defender.blockstun = atk.sj.blockstun
  gainHeat(attacker, SANJI_HEAT.perBlock)
}
// Knockback post-process on a connecting melee hit. Sanji as DEFENDER: weight 0.85 → knockback taken ÷0.85 (he
// flies further and juggles easily — a designed weakness).
export function sanjiKnockback(attacker, defender, atk) {
  if (isSanji(defender) && defender.vx) defender.vx /= (defender.stats?.weight || 0.85)
}
// Pass-through (physics.resolvePlayerCollision): Sanji spinning through the other fighter.
export const sanjiPhasing = (a, b) => !!(a?._sanji?.phase || b?._sanji?.phase)
// Jump suppression (physics canJump): any committed Sanji special / super (normals keep the shared launcher
// jump-cancel).
export const sanjiNoJump = f => !!(f?._sanji && f.attacking && f.currentAttack?.sj && f.currentAttack.sj.kind !== 'normal' && f.currentAttack.sj.kind !== 'handstand')
// Combo scaling (combat._comboScale): 85% per hit. At damage time comboCounter = hits already landed in this combo
// (1st 1.0, 2nd 0.85, 3rd 0.7225 …). The counter and its 90-frame (1.5 s) idle reset are the shared engine ones.
export const sanjiComboScale = f => Math.pow(0.85, Math.max(0, f.comboCounter || 0))

// Recent condensed motion string (numpad tokens) within `win` input ticks, current token last.
export function recentMotion(s, win) {
  const from = s.tick - win; let str = ''
  for (let i = 0; i < s.dirs.length; i++) {
    const [tok, at] = s.dirs[i], next = s.dirs[i + 1]
    if (at >= from || !next || next[1] > from) str += tok
  }
  return str
}

// Hitbox for a live Sanji attack (combat.getAttackHitbox gate). Mirrors the shared builder's conventions: in-front
// reach box at boxY (default 20), `centered` boxes on the body, and the forgiving air-normal bubble.
export function sanjiHitbox(f) {
  const a = f.currentAttack, z = a?.sj
  if (!z || z.noHit) return null
  const reach = (a.rangeX || 60) * (f._reachMult || 1), h = a.rangeY || 40, fw = f.w || 48
  if (z.centered) return { x: f.x + fw / 2 - reach / 2, y: f.y + (z.boxY ?? 20), w: reach, h }
  if (a.name === 'air') {   // same bubble as the shared air normals: behind margin + body + reach, raised
    const behind = 16, w = behind + fw + reach
    return { x: f.facing === 1 ? f.x - behind : f.x + fw + behind - w, y: f.y - 25, w, h: h + 45 }
  }
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (z.boxY ?? 20), w: reach, h }
}
export { SANJI_BASE_ANIM }
