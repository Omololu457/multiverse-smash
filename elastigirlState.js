// Elastigirl (elastigirl) — SIMULATION state. Plain JSON on f._elastigirl; sim ticks only, no RNG, no wall clock.
// Every export is a no-op for any other rosterKey.
// PHASE 2: the Elasticity economy (5/s recharge, +4 on a hit landed, +3 on a hit taken).
import { EG_KEY, EG_ENERGY } from './elastigirlData.js'

export const isElastigirl = f => f?.rosterKey === EG_KEY
const gain = (f, n) => { f.energy = Math.min(f.maxEnergy || EG_ENERGY.max, (f.energy || 0) + n) }

// abilities.regenEnergy hook: Elasticity recharges 5/s (replaces the shared 3.6/s base for her only).
export function elastigirlRegen(f) {
  if (!isElastigirl(f) || !(f.maxEnergy > 0)) return false
  if (!f.infiniteEnergy) gain(f, EG_ENERGY.rechargePerSec / 60)
  return true
}

// combat.applyScaledDamage hook (the single damage choke-point). Returns rawDamage (unchanged in Phase 2).
// Elasticity income: +4 when she lands a damaging hit, +3 when she takes one (guard chip is not a hit).
export function elastigirlDamageMods(target, rawDamage, opts = {}) {
  const atk = opts.attacker || opts.boostFrom
  const tEg = isElastigirl(target), aEg = isElastigirl(atk) && atk !== target
  if (!tEg && !aEg) return rawDamage
  if ((rawDamage || 0) > 0 && opts.source !== 'block-chip') {
    if (tEg) gain(target, EG_ENERGY.onHitTaken)
    if (aEg) gain(atk, EG_ENERGY.onHitLanded)
  }
  return rawDamage
}
