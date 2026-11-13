// zoroState.js — Roronoa Zoro authoritative state (GAME_STATE). Everything lives in `fighter._zoro` as
// plain JSON (numbers / booleans / small arrays — no callbacks, no object refs), so it is snapshotted by
// the replay checkpoint and reproduced bit-identically. No Math.random / gameRng anywhere in the kit.
import { ZORO_SANTO_ANIM } from './zoroData.js'
export const isZoro = f => f?.rosterKey === 'zoro'

export const ZORO_SPIRIT = { perHitDealt: 5, perHitTaken: 3, passivePerSec: 1 }
// SANTORYU (three-sword stance) — a timed form on the shared currentForm/currentFormData pattern
// (abilities.updateTransformationState applies the multipliers every frame; updateZoroSantoryu ticks it).
export const SANTORYU = { cost: 15, duration: 600, cooldown: 240, dmg: 1.12, kb: 1.08 }
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function zoroState(f) {
  if (!isZoro(f)) return null
  return f._zoro ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (advances EVERY call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Spirit
    idle: 0,           // consecutive neutral-idle frames (NAP idle pose after 600)
    prev: {},          // raw buttons last frame
    edgeAt: {},        // clock of each button's most recent press edge
    santoryu: false, santoryuTimer: 0, santoryuCd: 0,
  }
}

export function clearZoro(f) {
  if (f?._zoro?.santoryu) revertSantoryu(f, false)
  if (f?._zoro || isZoro(f)) { delete f._zoro; delete f._zoroCue }
}

// Per-simulation-frame tick (called from both the 1v1 and FFA combat steps, before input handling).
export function tickZoro(f, opp, raw = {}) {
  if (!isZoro(f)) { if (f?._zoro) clearZoro(f); return }
  const s = zoroState(f)
  // Raw press edges are observed every tick (even in stun / hitstop), stamped with the sim clock.
  s.tick++
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) s.edgeAt[k] = s.tick; s.prev[k] = v }
  if (f.health <= 0) return
  if (f.hitstop > 0) return
  s.clock++
  const neutral = !f.attacking && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isBlocking && (f.onGround || f.grounded) &&
    !raw.left && !raw.right && !raw.up && !raw.down && !raw.jump && Math.abs(f.vx || 0) < 0.5
  s.idle = neutral ? s.idle + 1 : 0
}

// Passive Spirit regen: +1 per second (60 sim frames) while alive. Replaces the shared passive regen.
export function zoroRegen(f) {
  if (!isZoro(f)) return false
  const s = zoroState(f)
  if (f.health > 0 && !(f.hitstop > 0) && !f._zoroLockout) {
    if (++s.passive >= 60) { s.passive = 0; f.energy = Math.min(f.maxEnergy, (f.energy || 0) + ZORO_SPIRIT.passivePerSec) }
  }
  return true
}

// Melee / projectile hit bookkeeping. Called once per connecting hit (blocked hits excluded).
export function zoroHit(attacker, defender, atk, { blocked = false } = {}) {
  if (blocked) return
  if (isZoro(attacker) && attacker !== defender && !attacker._zoroLockout)
    attacker.energy = Math.min(attacker.maxEnergy, (attacker.energy || 0) + ZORO_SPIRIT.perHitDealt)
  if (isZoro(defender) && attacker !== defender)
    defender.energy = Math.min(defender.maxEnergy, (defender.energy || 0) + ZORO_SPIRIT.perHitTaken)
}

// Knockback post-process on a connecting melee hit (combat.resolveAttackHit, before wall-splat).
// Zoro as DEFENDER: weight 1.1 → horizontal knockback taken ÷1.1. Gated → no-op for everyone else.
// Zoro as ATTACKER in Santoryu: knockback +8%.
export function zoroKnockback(attacker, defender, atk) {
  if (isZoro(attacker) && attacker._zoro?.santoryu && defender.vx) defender.vx *= SANTORYU.kb
  if (isZoro(defender) && defender.vx) defender.vx /= (defender.stats?.weight || 1.1)
}

// ── SANTORYU ─────────────────────────────────────────────────────────────────────────────────────────
export function enterSantoryu(f) {
  const s = zoroState(f)
  if (!s || s.santoryu || s.santoryuCd > 0 || (f.energy || 0) < SANTORYU.cost) return false
  f.energy -= SANTORYU.cost
  s.santoryu = true; s.santoryuTimer = SANTORYU.duration
  f.currentForm = 'santoryu'
  f.currentFormData = { damageMultiplier: SANTORYU.dmg, attackMultiplier: SANTORYU.dmg, knockbackMultiplier: SANTORYU.kb, santoryu: true }
  f.damageMultiplier = f.attackMultiplier = SANTORYU.dmg
  f._skinAnim = ZORO_SANTO_ANIM
  f._zoroCue = 'santoryu'
  return true
}
export function revertSantoryu(f, withCooldown = true) {
  const s = f?._zoro; if (!s || !s.santoryu) return
  s.santoryu = false; s.santoryuTimer = 0; if (withCooldown) s.santoryuCd = SANTORYU.cooldown
  f.currentForm = 'base'; f.currentFormData = null
  f.damageMultiplier = f.attackMultiplier = 1
  f._skinAnim = f._baseSkinAnim || null
  f._zoroCue = 'sheathe'
}
// Per-frame form ticker (called from abilities.updateTransformationState, like updateJiraiyaHermit).
export function updateZoroSantoryu(f) {
  const s = isZoro(f) ? f._zoro : null; if (!s) return
  if (s.santoryuCd > 0) s.santoryuCd--
  if (!s.santoryu) return
  if (f.health <= 0) { revertSantoryu(f, false); return }
  if (--s.santoryuTimer <= 0) revertSantoryu(f, true)
}
