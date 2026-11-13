// zoroState.js — Roronoa Zoro authoritative state (GAME_STATE). Everything lives in `fighter._zoro` as
// plain JSON (numbers / booleans / small arrays — no callbacks, no object refs), so it is snapshotted by
// the replay checkpoint and reproduced bit-identically. No Math.random / gameRng anywhere in the kit.
export const isZoro = f => f?.rosterKey === 'zoro'

export const ZORO_SPIRIT = { perHitDealt: 5, perHitTaken: 3, passivePerSec: 1 }

export function zoroState(f) {
  if (!isZoro(f)) return null
  return f._zoro ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    passive: 0,        // frames toward the next passive +1 Spirit
    idle: 0,           // consecutive neutral-idle frames (NAP idle pose after 600)
  }
}

export function clearZoro(f) {
  if (f?._zoro || isZoro(f)) { delete f._zoro; delete f._zoroCue }
}

// Per-simulation-frame tick (called from both the 1v1 and FFA combat steps, before input handling).
export function tickZoro(f, opp, raw = {}) {
  if (!isZoro(f)) { if (f?._zoro) clearZoro(f); return }
  const s = zoroState(f)
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
export function zoroKnockback(attacker, defender, atk) {
  if (isZoro(defender) && defender.vx) defender.vx /= (defender.stats?.weight || 1.1)
}
