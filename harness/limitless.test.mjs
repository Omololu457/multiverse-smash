// limitless.test.mjs — MSV1-GOJO phase 2: the generic Limitless module (limitless.js) in isolation.
// Cursed-energy economy (fixed point, smooth drain / regen, Depleted lock) and the four fields (attract / repel / erase /
// Infinity shell) against mock fighters, projectiles, clones, drones, summons, munitions and ground patches.
//   node harness/limitless.test.mjs
import { registerLimitlessProfile, limitlessProfile, ceInit, ceValue, ceHas, ceSpend, ceGain, ceTick, fieldAttract,
  fieldRepel, fieldErase, infinityShell, infinityRepel } from '../limitless.js'
import { CE, CE_UNIT, INFINITY, GS_KEY } from '../gojoShinjukuData.js'

let pass = 0, fail = 0
const ok = (c, m, extra = '') => { if (c) { pass++; console.log('  ✅', m) } else { fail++; console.log('  ❌', m, extra) } }
const P = registerLimitlessProfile('test_limitless', { ceUnit: CE_UNIT, ce: CE, infinity: INFINITY })
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e

console.log('── A) cursed energy')
ok(limitlessProfile({ rosterKey: 'test_limitless' }) === P, 'profile registry lookup by rosterKey')
const s = {}; ceInit(s, P)
ok(ceValue(s, P) === 60, 'starts at 60 CE', ceValue(s, P))
ok(Number.isInteger(s.ce) && [5, 9, 22, 6].every(r => Number.isInteger(r * CE_UNIT / 60)), 'fixed point: every rate is a whole number of units per frame')
for (let i = 0; i < 60; i++) ceTick(s, P, {})
ok(near(ceValue(s, P), 66), 'regen 6 CE/s while Infinity is off', ceValue(s, P))
for (let i = 0; i < 60; i++) ceTick(s, P, { casting: true })
ok(near(ceValue(s, P), 66), 'no regen while casting')
for (let i = 0; i < 60; i++) ceTick(s, P, { zone: true })
ok(near(ceValue(s, P), 75), 'THE ZONE: regen x1.5 (9 CE/s)', ceValue(s, P))
for (const [lv, want] of [[1, 5], [2, 9], [3, 22]]) {
  const t = {}; ceInit(t, P); const v0 = ceValue(t, P)
  let maxStep = 0, prev = t.ce
  for (let i = 0; i < 60; i++) { ceTick(t, P, { infinity: lv }); maxStep = Math.max(maxStep, prev - t.ce); prev = t.ce }
  ok(near(v0 - ceValue(t, P), want), `L${lv} drains ${want} CE/s, smoothly (≤ ${maxStep} units per frame)`, v0 - ceValue(t, P))
}
const d = {}; ceInit(d, P); d.ce = 3 * CE_UNIT
let res = null, n = 0
while (!res && n < 200) { res = ceTick(d, P, { infinity: 3 }); n++ }
ok(res === 'depleted' && d.ce === 0 && d.ceLock === CE.depletedLock, `reaching 0 → 'depleted' + a ${CE.depletedLock}-frame (2 s) lock`, JSON.stringify(d))
ok(!ceSpend(d, P, 1) && d.ce === 0, 'cannot spend what is not there')
ceGain(d, P, 500); ok(ceValue(d, P) === 100, 'gain clamps at 100')
ok(ceHas(d, P, 100) && ceSpend(d, P, 15) && near(ceValue(d, P), 85), 'has / spend 15')

console.log('── B) fields')
const owner = { side: 0, x: 400, y: 300, w: 48, h: 94, facing: 1, health: 1000 }
const foe = { side: 1, x: 700, y: 300, w: 48, h: 94, facing: -1, health: 1000, onGround: true }
const projs = [], drones = [], summons = [], muns = [], clones = [{ x: 760, y: 300, w: 48, h: 94 }], patches = [{ x: 600, y: 394, width: 80 }]
const W = {
  fighters: () => [owner, foe], projectileList: () => projs, drones: () => drones, summons: () => summons, munitions: () => muns,
  removeProjectile: p => projs.splice(projs.indexOf(p), 1), removeDrone: o => drones.splice(drones.indexOf(o), 1),
  removeSummon: o => summons.splice(summons.indexOf(o), 1), removeMunition: o => muns.splice(muns.indexOf(o), 1),
  clones: f => f === foe ? clones : [], removeClone: (f, c) => clones.splice(clones.indexOf(c), 1),
  patches: () => patches.map(p => ({ owner: foe, patch: p })), removePatch: (o, p) => patches.splice(patches.indexOf(p), 1),
  stageWidth: () => 2000,
}
// attract
const x0 = foe.x
projs.push({ owner: foe, x: 610, y: 340, vx: -8, vy: 0, damage: 30 }, { owner: foe, x: 640, y: 340, vx: -8, isUltimate: true, damage: 90 })
drones.push({ owner: foe, x: 600, y: 330, w: 10, h: 10 })
const field = { x: 620, y: 347, r: 200, core: 44, pull: 3, pullCore: 9 }
const r1 = fieldAttract(owner, field, W)
ok(foe.x < x0, 'ATTRACT pulls a fighter toward the point', `${x0}→${foe.x}`)
ok(r1.crushed === 2 && projs.length === 1 && drones.length === 0, 'ATTRACT crushes a normal projectile and a drone inside the core', JSON.stringify(r1))
ok(projs[0].isUltimate, 'ATTRACT leaves a SUPER projectile alone')
projs.length = 0
// repel / reflect
projs.push({ owner: foe, x: 500, y: 340, vx: -8, vy: 0, damage: 30 })
const r2 = fieldRepel(owner, { x: 472, y: 347, r: 0 }, W, { reflectRect: { x: 448, y: 270, w: 220, h: 154 } })
ok(r2.reflected === 1 && projs[0].owner === owner && projs[0].vx > 0, 'REPEL reflects a projectile in the window: it changes sides and flies back', JSON.stringify(projs[0]))
projs.length = 0
// erase
projs.push({ owner: foe, x: 700, y: 340, vx: -8, isUltimate: true }, { owner: owner, _gsOwn: true, x: 700, y: 340 })
summons.push({ owner: foe, x: 690, y: 320, w: 30, h: 30 }); muns.push({ owner: foe, x: 705, y: 345 })
const r3 = fieldErase(owner, { x: 700, y: 360, r: 120 }, W)
ok(r3.projectiles === 1 && projs.length === 1 && projs[0]._gsOwn, 'ERASE deletes every foreign projectile (super included), never his own', JSON.stringify(r3))
ok(r3.summons === 1 && r3.munitions === 1 && r3.clones === 1 && r3.patches === 1, 'ERASE deletes summons, munitions, clones and ground patches', JSON.stringify(r3))
projs.length = 0

console.log('── C) Infinity shell (Zeno)')
const g = { side: 0, x: 400, y: 300, w: 48, h: 94, health: 1000 }
const Wg = { ...W, fighters: () => [g] }
for (const lv of [1, 2, 3]) {
  const L = INFINITY.levels[lv]
  const p = { owner: foe, x: 448 + L.boundary + L.slow + 40, y: 340, vx: -10, vy: 0, radius: 8, damage: 30 }
  projs.length = 0; projs.push(p)
  let reachedAt = -1, minGap = 1e9, speeds = []
  for (let t = 0; t < 400 && projs.length; t++) {
    const reached = infinityShell(g, L, Wg, { hangFrames: INFINITY.hangFrames })
    if (reached.length && reachedAt < 0) reachedAt = t
    const ts = p.timeScaleT > 0 ? p.timeScale : 1
    speeds.push(ts)
    p.x += p.vx * ts; p.y += (p.vy || 0) * ts
    if (p.timeScaleT > 0) p.timeScaleT--
    minGap = Math.min(minGap, p.x - p.radius - (g.x + g.w))
  }
  const slowing = speeds.some(v => v > 0 && v < 1)
  ok(slowing, `L${lv}: the projectile slows as it nears the boundary (Zeno)`)
  ok(minGap > 0, `L${lv}: it never touches him (closest gap ${minGap.toFixed(1)} px)`)
  if (lv === 1) ok(reachedAt >= 0 && projs.length === 0, 'L1: it hangs at the boundary, then dissolves')
  else ok(p.vx > 0, `L${lv}: it is sent back at half speed (vx ${p.vx})`)
}
projs.length = 0
const att = { side: 1, x: 460, y: 300, w: 48, h: 94, health: 1000 }
const Wr = { ...W, fighters: () => [g, att] }
const ax = att.x
for (let i = 0; i < 6; i++) infinityRepel(g, INFINITY.levels[2], Wr)
ok(att.x > ax, `L2 repel ring pushes an adjacent attacker out (${ax}→${att.x})`)
const att1 = { ...att, x: 460 }
infinityRepel(g, INFINITY.levels[1], { ...W, fighters: () => [g, att1] })
ok(att1.x === 460, 'L1 has no repel ring')

console.log('── D) determinism')
const run = () => { const a = {}; ceInit(a, P); const out = []; for (let i = 0; i < 500; i++) { ceTick(a, P, { infinity: i % 7 === 0 ? 2 : (i % 3 ? 1 : 0), zone: i > 300 }); out.push(a.ce) } return out.join(',') }
ok(run() === run(), 'same inputs → byte-identical CE trace (no RNG, no clock)')
ok(INFINITY.levels[1].supers === 'connect' && INFINITY.levels[2].supers === 'half' && INFINITY.levels[3].supers === 'stop', 'levels: supers connect / half / stop')
ok(near(INFINITY.levels[3].boundary / INFINITY.levels[1].boundary, 1.6), 'L3 radius ×1.6')
ok(GS_KEY === 'gojo_shinjuku', 'gojo_shinjuku registers its own profile (data module)')

console.log(`\n  LIMITLESS: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
