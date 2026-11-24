// rickPower.js — Rick Sanchez (rick) + Rick Prime (rickPrime) POWER PASSIVES (2026-11-24, owner: "make him really really
// fast … buff them a lot, give them power to steal energy and stuff").
//   ENERGY STEAL — every hit either Rick lands drains the foe's meter and hands it to the Rick:
//     rick       8 % of what the foe has, at least 4 (never more than the foe has)
//     rickPrime 10 % of what the foe has, at least 5 (stacks with his Energy Siphon special, which steals PROJECTILES)
//     Because it is a % of the foe's CURRENT meter the drain shrinks as they run dry, and it only fires on damage that
//     actually lands (block chip never steals) — so the foe is pressured, not locked out: stop getting hit, meter regens.
//   SPEED — characters.js stamps `_rickSpd` (×walk / ×dash via physics.js) on both; stats carry the rest.
// Hooked from combat.js applyScaledDamage (the shared damage choke point: melee, projectiles, specials all pass through).
// No imports (combat.js imports this → keep it a leaf). Deterministic: pure arithmetic on the hit, no RNG / clock.
export const RICK_POWER = {
  rick:      { stealFrac: 0.08, stealMin: 4, dmg: 1.35, def: 1.2, spd: 1.6 },
  rickprime: { stealFrac: 0.10, stealMin: 5, dmg: 1.35, def: 1.2, spd: 1.6 },
}
const row = f => f ? RICK_POWER[String(f.rosterKey || '').toLowerCase()] : null

// Round / match reset (game.js runs it right AFTER the shared revertGoku(_f), which stamps speed 84 / dash 16 and resets
// damage / attack / defense multipliers to 1 on EVERY fighter — the Arlong / Buggy pattern). Re-applies the power-pass
// multipliers so they hold in every round, not just until the first reset. Rick-gated: no other fighter is touched.
export function rickPowerRoundReset(f) {
  const R = row(f); if (!R) return
  f.damageMultiplier = f.attackMultiplier = R.dmg
  f.defenseMultiplier = R.def
  f._rickSpd = R.spd
  if (f.baseForm) { f.baseForm.damageMultiplier = f.baseForm.attackMultiplier = R.dmg; f.baseForm.defenseMultiplier = R.def }
}
export const isRickPowered = f => !!row(f)

// combat.js applyScaledDamage tail: (attacker, target, dealt HP, opts). Returns the energy stolen (0 when not a Rick hit).
export function rickPowerOnHit(attacker, target, dealt, opts = {}) {
  const R = row(attacker)
  if (!R || !target || target === attacker || !(dealt > 0)) return 0
  if (opts.source === 'block-chip' || target.isBlocking) return 0
  const have = Math.max(0, target.energy || 0)
  if (have <= 0) return 0
  const take = Math.min(have, Math.max(R.stealMin, Math.round(have * R.stealFrac)))
  target.energy = have - take
  attacker.energy = Math.min(attacker.maxEnergy || 999, (attacker.energy || 0) + take)
  attacker._rickStolen = (attacker._rickStolen || 0) + take          // running total (harness / HUD read)
  attacker._rickStealFx = 18; target._rickDrainFx = 18                // presentation pulse (frames), read-only for the sim
  return take
}

// ── RICK PRIME TEMPORAL REWIND rules (owner: "only HIS health and energy go back up, not the other person's … it goes down
// by 25% every time he does it. If it gets to … less than 1%, the other character just automatically dies.")
// Called by game.js _applyRewindSnapshot AFTER both fighters were restored (positions rewound as before):
//   caster → his snapshot health / energy, but never LOWER than what he has now (it only ever goes back UP)
//   foe    → keeps NOTHING from the snapshot: their pre-rewind health / energy, each cut by 25 %
//   foe under 1 % of max health → killed through the normal damage path (applyScaledDamage, bypassScale) → a real KO.
export const PRIME_REWIND_RULES = { foeCut: 0.25, killBelow: 0.01 }
export function applyPrimeRewindRules(caster, foe, before, applyDamage) {
  if (!caster || !foe || !before) return null
  const cs = before.casterSnap
  if (cs) {
    caster.health = Math.min(caster.maxHealth || cs.health, Math.max(before.casterHp, cs.health))
    caster.energy = Math.min(caster.maxEnergy || cs.energy, Math.max(before.casterEn, cs.energy))
  }
  const hp = Math.max(0, before.foeHp * (1 - PRIME_REWIND_RULES.foeCut))
  foe.health = Math.max(0, Math.round(hp))
  foe.energy = Math.max(0, Math.round(before.foeEn * (1 - PRIME_REWIND_RULES.foeCut)))
  let killed = false
  if (foe.health > 0 && foe.health < (foe.maxHealth || 1000) * PRIME_REWIND_RULES.killBelow) {
    const left = foe.health
    try { applyDamage?.(foe, left + 1, { scale: 1, bypassScale: true, source: 'rewind', attacker: caster, move: 'temporalRewind', defenseApplied: true, offenseApplied: true }) } catch (_) {}
    if (foe.health > 0) foe.health = 0                                // whatever a damage hook did, the clock already ran out on them
    killed = true
  }
  const res = { foeHpBefore: Math.round(before.foeHp), foeHp: foe.health, foeEnBefore: Math.round(before.foeEn), foeEn: foe.energy, killed, casterHp: caster.health, casterEn: caster.energy }
  caster._primeRewindResult = res; foe._primeRewindCut = res
  return res
}
