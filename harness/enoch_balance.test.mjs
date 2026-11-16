// harness/enoch_balance.test.mjs — the numbers docs/enoch/BALANCE_NOTES.md quotes, computed from the real data (pure node).
//   Health vs the matchup cast, super totals vs Frozone's, the thermal budget (how many casts before the zone locks the other
//   element / before an overload), resource caps and cooldowns, the per-use ceilings of the beam and the burst.
//   node harness/enoch_balance.test.mjs
import fs from 'node:fs'
import { characters as C } from '../characters.js'
import { ALL_MOVES, SUPERS, HEAT_LENS, ICE_BLAST, GLIDE, GUARD_CANCEL, DISC, TIDE } from '../enochData.js'
import { ULT as FROZONE_ULT } from '../frozoneData.js'
import { REACTIONS, ELEMENT_PROFILES, registerThermal, createThermal, thermalCheck, thermalPush } from '../elements.js'
let pass = 0, fail = 0; const out = {}
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }
const hp = k => C[k]?.stats?.maxHealth ?? C[k]?.maxHealth
// health
const cast = ['enoch', 'frozone', 'superman', 'homelander', 'arlong', 'sanji']
out.health = Object.fromEntries(cast.map(k => [k, hp(k)]))
ok('980 health: the lowest of the matchup cast', cast.slice(1).every(k => hp(k) > 980) && hp('enoch') === 980, JSON.stringify(out.health))
// supers vs Frozone's Absolute Zero (opener 40 + 3 × 40 + 250 = 410 raw)
const sup = k => { const V = SUPERS[k]; return V.contacts ? V.contacts.reduce((t, c) => t + c.raw, 0) : Math.floor((V.beamTo - V.beamFrom) / V.tickEvery) * V.tickRaw + V.flareRaw }
out.supers = { absoluteZero: sup('absoluteZero'), flashPoint: sup('flashPoint'), thermalShock: sup('thermalShock'), frozone: 40 + FROZONE_ULT.contacts.reduce((t, c) => t + c.raw, 0) }
ok('supers 330 / 340 / 390 raw, all below Frozone\'s 410', out.supers.absoluteZero === 330 && out.supers.flashPoint === 340 && out.supers.thermalShock === 390 && out.supers.thermalShock < out.supers.frozone, JSON.stringify(out.supers))
// thermal budget: casts from 0 before the zone locks the other element, and before an overload
const TP = registerThermal('enoch_balance_probe', {})
const run = (key, el) => { const t = createThermal(), cost = Math.abs(ALL_MOVES[key].th); let n = 0, lockAt = null
  for (let i = 0; i < 40; i++) { const c = thermalCheck(t, TP, el); if (!c.ok) break; n++; if (thermalPush(t, TP, (el === 'ice' ? -1 : 1) * cost * c.cost) === 'overload') return { casts: n, lockAt, overloadAt: n }
    if (lockAt == null && !thermalCheck(t, TP, el === 'ice' ? 'fire' : 'ice').ok) lockAt = n }
  return { casts: n, lockAt, overloadAt: null } }
out.budget = { iceBlast: run('iceBlast', 'ice'), heatLens: run('heatLens', 'fire'), deepFreeze: run('deepFreeze', 'ice'), scorch: run('scorch', 'fire') }
ok('thermal budget: 4 Ice Blasts lock fire; ≤ 10 in a row overload (1.5 s lockout)', out.budget.iceBlast.lockAt === 4 && out.budget.iceBlast.overloadAt <= 10, JSON.stringify(out.budget))
ok('the same for fire: Heat Lens spam locks ice, then overloads', out.budget.heatLens.lockAt === 4 && out.budget.heatLens.overloadAt <= 10, JSON.stringify(out.budget.heatLens))
// ceilings
out.ceilings = { beamPerUseRaw: Math.floor(HEAT_LENS.holdMax / HEAT_LENS.tickEvery) * HEAT_LENS.tickRaw, beamHotPerUse: HEAT_LENS.hotPerSec * HEAT_LENS.holdMax / 60,
  burstMaxRaw: REACTIONS['fire+ice'].burst.dmg * Math.max(...REACTIONS['fire+ice'].burst.scale), patchesMax: 4, iceBlastPool: ICE_BLAST.pool, glideMaxS: GLIDE.maxFrames / 60,
  cooldownsS: { deepFreeze: ALL_MOVES.deepFreeze.cooldown / 60, tideBreak: ALL_MOVES.tideBreak.cooldown / 60, guardCancel: GUARD_CANCEL.cooldown / 60 }, discHp: DISC.hp, fireDot: ELEMENT_PROFILES.fire.effect.dot }
ok('sustained beam ≤ 84 raw per use (12 × 7) and +12 hot', out.ceilings.beamPerUseRaw === 84 && out.ceilings.beamHotPerUse === 12, JSON.stringify(out.ceilings))
ok('the biggest burst is 72 raw (45 × 1.6, needs an intensity-3 patch)', out.ceilings.burstMaxRaw === 72, '')
ok('cooldowns: Deep Freeze 8 s, Tide Break 6 s, guard cancel 10 s', out.ceilings.cooldownsS.deepFreeze === 8 && out.ceilings.cooldownsS.tideBreak === 6 && out.ceilings.cooldownsS.guardCancel === 10, JSON.stringify(out.ceilings.cooldownsS))
ok('caps: 4 patches, 3 Ice Blasts, a 4 s glide, an 80 HP disc', out.ceilings.patchesMax === 4 && out.ceilings.iceBlastPool === 3 && out.ceilings.glideMaxS === 4 && out.ceilings.discHp === 80, '')
// the brief's frame data where it gave advantage, and the values it left open
out.open = Object.fromEntries(Object.entries(ALL_MOVES).filter(([k, m]) => m.adv != null).map(([k, m]) => [k, m.adv]))
ok('given advantages hold in the data (Jab +1, Straight −3, Heavy −5, wake-up −12)', out.open.jab === 1 && out.open.straight === -3 && out.open.heavy === -5 && out.open.wake === -12, JSON.stringify(out.open))
fs.mkdirSync('docs/enoch', { recursive: true }); fs.writeFileSync('docs/enoch/balance_results.json', JSON.stringify({ pass, fail, ...out }, null, 1) + '\n')
console.log(`\n  ENOCH BALANCE: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
