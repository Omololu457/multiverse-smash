// spdRedState.js — S.P.D. Red Ranger authoritative state (GAME_STATE). Red's own state lives in `fighter._spdRed`
// and the shared Ranger framework state in `fighter._ranger` (rangers.js); both are plain JSON pushed into the replay
// checkpoint snapshot, so they reproduce bit-identically. No Math.random / gameRng: sim randomness (Rapid Fire
// spread) is rangerHash(match seed, frame, player index). Render jitter lives in spdRedFx.js.
import { spdRed as SPD_RED_CHAR, SPD_RED_MOVES } from './spdRedData.js'
import { tickRanger, clearRanger, rangerWalkMul, ensureRangerState, judgmentAddHit, rangerSealAbsorb, isSealed } from './rangers.js'
import { meleeDamageType } from './damageTypes.js'
export const isSpdRed = f => f?.rosterKey === 'spd_red'
// Audio cue queue (presentation only — played + cleared by game.js right after tickSpdRed; never read by the sim).
export function rcue(f, c) { (f._spdRedCues ||= []).push(c) }

// DELTA economy (brief Phase 3): +4 per hit, +2 per blocked hit, +1.5/s passive (= +1 every 40 frames), +5 per
// teleport dodge. maxEnergy 100.
export const SPD_DELTA = { perHit: 4, perBlocked: 2, passiveEvery: 40, perDodge: 5 }
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function spdRedState(f) {
  if (!isSpdRed(f)) return null
  return f._spdRed ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (every call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Delta
    lockout: 0,        // Delta lockout after the Super (frames)
    prev: {}, edgeAt: {}, edgeClk: {}, edgeDir: {}, used: {},
    dirs: [],          // condensed facing-relative direction history [[numpad, tick], …]
    idleT: 0,          // frames idle with no input (gem glint after 600)
    fx: [],            // impact sparks [{k, x, y, t, n}] (render reads; pure function of the sim)
    serial: 0,
  }
}
export function spdRedRoundReset(f) {
  if (!isSpdRed(f)) return
  const st = SPD_RED_CHAR.stats
  f.baseSpeed = f.speed = st.speed
  f.dashSpeed = st.dashSpeed
  if (f._spdRed) delete f._spdRed
  clearRanger(f)
  f._rooted = false
  f._skinAnim = f._baseSkinAnim || null
  f._srWinVar = 0
}
export function clearSpdRed(f) {
  if (f?._spdRed || isSpdRed(f)) { delete f._spdRed; delete f._spdRedCues; clearRanger(f); if (isSpdRed(f)) { f._rooted = false; f._skinAnim = f._baseSkinAnim || null } }
}

export const deltaBlocked = f => !!(f?._spdRed && f._spdRed.lockout > 0)
export function gainDelta(f, n) { if (isSpdRed(f) && !deltaBlocked(f)) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + n) }

const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}
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
const grounded = f => !!(f.onGround || f.grounded)
export function burst(s, k, x, y, t = 12) { s.fx.push({ k, x: Math.round(x), y: Math.round(y), t, n: ++s.serial }); if (s.fx.length > 12) s.fx.shift() }

let _W = null
// World accessors for the Ranger framework (built once per tick from game.js's world object).
const rangerWorld = W => W && { stageWidth: W.stageWidth, frame: W.frame, seed: W.seed, attackBox: W.attackBox, projectiles: W.projectiles }

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
export function tickSpdRed(f, opp, raw = {}, W = null) {
  if (!isSpdRed(f)) { if (f?._spdRed) clearSpdRed(f); return }
  const s = spdRedState(f)
  if (W) _W = W
  s.tick++
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock; s.edgeDir[k] = tok } s.prev[k] = v }
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  // the Ranger framework: blink double-tap / charges / travel, morph, judgment (it tracks its own tick + hitstop)
  const evs = f.health > 0 ? tickRanger(f, opp, raw, rangerWorld(W)) : []
  for (const e of evs) onRangerEvent(f, opp, s, e)
  if (f.health <= 0 || f.hitstop > 0) return
  s.clock++
  if (s.lockout > 0) s.lockout--
  for (let i = s.fx.length - 1; i >= 0; i--) if (--s.fx[i].t <= 0) s.fx.splice(i, 1)
  const still = grounded(f) && !f.attacking && !f.isBlocking && !(f.hitstun > 0) && Math.abs(f.vx || 0) < 0.3 && !BUTTONS.some(k => raw[k]) && !f._ranger?.blink
  s.idleT = still ? s.idleT + 1 : 0
}
function onRangerEvent(f, opp, s, e) {
  switch (e.type) {
    case 'blinkStart': rcue(f, 'blink'); break
    case 'arrive': rcue(f, 'blinkPop'); break
    case 'dodge': gainDelta(f, SPD_DELTA.perDodge); rcue(f, 'dodge'); break
    case 'guilty': rcue(f, 'guilty'); rcue(f, 'contain'); break
    case 'innocent': if (e.energy) gainDelta(f, e.energy); rcue(f, 'innocent'); break   // INNOCENT: +40 Delta (once per round)
    case 'release': rcue(f, 'release'); break
  }
}

let _startMove = null   // combat.startMove, handed in by spdRed.js (avoids a combat ↔ spdRedState import cycle)
export function registerSpdRedStartMove(fn) { _startMove = fn }
// Start one of Red's moves through the engine's startMove (frameExact path) + attach his descriptor `sr`
// (kind / spawn frames / hitbox shape / per-move blockstun), read by tickMove and the combat.js hooks.
export function spdRedStartMove(f, key, startMove = _startMove) {
  const md = SPD_RED_MOVES[key]; if (!md || !startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!startMove(f, key, md)) return false
  if (md.cost) f.energy = Math.max(0, (f.energy || 0) - md.cost)   // specials / Super spend Delta on commit
  const a = f.currentAttack, g = md.sr || {}
  f.currentMove = key
  a.sr = { kind: g.kind || 'normal', ...g, dir: f.facing || 1 }
  if (g.noHit) a.hasHit = true
  if (md.invuln) f.invulnTimer = Math.max(f.invulnTimer || 0, md.invuln)
  if (md.isSpecial || md.isUltimate) { f.isBlocking = false; if (f.onGround || f.grounded) f.vx = 0 }
  return true
}
// Hitbox: Red's own box descriptor (noHit moves → null; centred / raised / low boxes). spd_red-gated in combat.js.
export function spdRedHitbox(f) {
  const a = f.currentAttack, g = a?.sr
  if (!g || g.noHit) return null
  const reach = (a.rangeX || 60) * (f._reachMult || 1), h = a.rangeY || 40, fw = f.w || 48
  if (g.centered) return { x: f.x + fw / 2 - reach / 2, y: f.y + (g.boxY ?? 20), w: reach, h }
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (g.boxY ?? 20), w: reach, h }
}

// ── combat.js hooks (spd_red-gated no-ops for everyone else) ──
export function spdRedBlockstun(attacker, defender, atk) {
  if (!isSpdRed(attacker)) return
  const md = SPD_RED_MOVES[atk?.name]; if (md?.blockstun != null) defender.blockstun = md.blockstun   // designed block advantage
  gainDelta(attacker, SPD_DELTA.perBlocked)   // +2 Delta per blocked hit
}
export function spdRedHit(attacker, defender, atk) {
  if (!isSpdRed(attacker) || attacker === defender) return
  gainDelta(attacker, SPD_DELTA.perHit)       // +4 Delta per hit
  judgmentAddHit(attacker)                     // JUDGMENT meter: 1 point per hit (20 to fill)
  const s = spdRedState(attacker); burst(s, 'hit', ctrX(defender), ctrY(defender))
  rcue(attacker, meleeDamageType(attacker, atk) === 'energy' ? 'zap' : 'impact')
}
// weight 0.9 → knockback taken ÷ 0.9
export function spdRedKnockback(attacker, defender) {
  if (isSpdRed(defender) && defender.vx) defender.vx /= (SPD_RED_CHAR.stats.weight || 0.9)
}
export const spdRedComboScale = f => Math.pow(0.85, Math.max(0, (f?.comboCounter || 0)))
// Passive Delta: +1.5/s (+1 every 40 frames). Replaces the shared passive regen.
export function spdRedRegen(f) {
  if (!isSpdRed(f)) return false
  const s = spdRedState(f)
  if (f.health > 0 && !(f.hitstop > 0) && !deltaBlocked(f)) {
    if (++s.passive >= SPD_DELTA.passiveEvery) { s.passive = 0; gainDelta(f, 1) }
  }
  return true
}
// physics.js walk multiplier: the run after a ground blink (rangers.js) — 1 for everyone else.
export function spdRedWalkMul(f, dir = 0) { return rangerWalkMul(f, dir) }
export { ensureRangerState }
// applyScaledDamage hook (combat.js, the one damage choke-point). Returns rawDamage untouched unless S.P.D. Red is
// involved (filled in by the Judgment / dodge phases).
export function spdRedDamageMods(target, rawDamage, opts = {}) {
  const a = opts.attacker
  // GUILTY containment: the gem card absorbs 50% of every hit on the sealed target (whoever lands it)
  if (a && a !== target && isSealed(target, a)) rawDamage = (rawDamage || 0) * rangerSealAbsorb(target, a)
  return rawDamage
}
