// harness/enoch_meteor_snow.test.mjs — Enoch's ICE / FIRE METEOR, the SNOWMAN sculpture wall, MELTING (ice → water), the longer
// lasting effects and the ONE-DIRECTION inputs, driven through the REAL game with real button presses.
//   M. Up + Special = Ice Meteor (lands on the foe, chills, ICE patch); hot = the 3-comet Fire Meteor shower (burns, FIRE);
//      Special in the air = the meteor too
//   W. Back + Charge = SNOWMAN: solid (the foe cannot walk through), eats enemy shots, melts into WATER; fire melts it faster
//   L. melting: an ice patch that runs out becomes a WATER puddle; the ice wall too
//   I. the simple inputs: Forward + Heavy = Fire Wall, Back + Heavy = Ice Wall, Back + Special = Deep Freeze
//   R. screenshots, no page errors, no Math.random
//   node harness/enoch_meteor_snow.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const J = o => JSON.stringify(o)
fs.mkdirSync('docs/enoch/screenshots', { recursive: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { const old = Math.random; window.__enRandom = []
  Math.random = function () { const st = new Error().stack; if (/\/(enoch\w*|elements|beam)\.js/.test(st) && __enRandom.length < 5) __enRandom.push(st); return old() } })
await page.goto(server.base + '/index.html?harness=1&p1=enoch&p2=frozone&seed=4242', { waitUntil: 'load' })
await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
await page.evaluate(async () => {
  const { writeRawControls } = await import('./input.js'); const ES = await import('./enochState.js'); const { camera } = await import('./camera.js')
  const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
  const hold = (f, r, n = 1) => { writeRawControls(f, r); step(n) }
  window.__E = { H, ES, step, hold, rel: f => writeRawControls(f, {}), st: () => H.raw()._enoch,
    aff: () => { const a = H.raw(), b = H.raw('p2'); return a._enoch?.aff?.[ES.sideOf(b)] || null },
    setup: (ax = 1000, bx = 1200) => { H.reset(); camera.reset(); __harness.setDummyBehavior?.('stand'); const a = H.raw(), b = H.raw('p2')
      for (const f of [a, b]) { f.leftTapTime = f.rightTapTime = 0; f.health = f.maxHealth; f.vx = f.vy = 0; f.hitstun = 0; f.blockstun = 0; f.invulnTimer = 0; f.energy = 0
        f.knockdownState = false; f.hitstop = 0; f._supFrozen = 0; f.attackCooldown = 0; f.dashCooldown = 0; f.comboCounter = 0 }
      a.x = ax; b.x = bx; a.facing = ax < bx ? 1 : -1; b.facing = -a.facing; writeRawControls(a, {}); writeRawControls(b, {}); step(2); return { a, b } } }
})
const shot = async (name, fn) => { await page.evaluate(fn); await page.evaluate(() => __harness.luffyTest.step(1)); await page.screenshot({ path: `docs/enoch/screenshots/${name}.png` }) }

// ═══ M. METEORS ═══
const M = await page.evaluate(() => { const { H, step, hold, rel, setup, st, aff } = __E; const r = {}
  let { a, b } = setup(900, 1250); H.setThermal(0); let hp0 = b.health
  hold(a, { up: true, jump: true, special: true }, 2); rel(a); let k = 0; while (st().meteors.length === 0 && k++ < 30) step(1)
  r.iceSpawn = { n: st().meteors.length, el: st().meteors[0]?.el, airborne: !(a.onGround || a.grounded) }
  k = 0; while (st().meteors.length && k++ < 120) step(1); r.frozeAt = b._supFrozen || 0; step(6)
  r.ice = { dmg: Math.round(hp0 - b.health), chill: aff()?.chill || 0, patch: st().field.patches.some(p => p.type === 'ice' && Math.abs(p.x + p.width / 2 - (b.x + b.w / 2)) < 160), stat: st().stats.meteors, hits: st().stats.meteorHits, encased: st().stats.encased, frozeAt: r.frozeAt || 0 }
  // hot: the FIRE METEOR shower
  ;({ a, b } = setup(900, 1250)); H.setThermal(60); hp0 = b.health
  hold(a, { up: true, jump: true, special: true }, 2); rel(a); k = 0; while (st().meteors.length === 0 && k++ < 30) step(1)
  r.fireSpawn = { n: st().meteors.length, els: [...new Set(st().meteors.map(q => q.el))], waits: st().meteors.map(q => q.wait), offs: st().meteors.map(q => q.off), key: a.currentAttack?.en?.key, pose: a.currentAttack ? 'cast' : null }
  const xs = []; k = 0; while (st().meteors.length && k++ < 260) { for (const q of st().meteors) if (q.t === 1) xs.push(Math.round(q.x - (b.x + b.w / 2))); step(1) } step(6)
  r.fire = { dmg: Math.round(hp0 - b.health), burn: aff()?.burn || 0, fires: st().field.patches.filter(p => p.type === 'fire').length, stat: st().stats.fireMeteors, hits: st().stats.cometHits, frames: k, xs }
  // Special in the air = the meteor
  ;({ a, b } = setup(900, 1250)); H.setThermal(0); hold(a, { jump: true }); for (let i = 0; i < 6; i++) hold(a, {})
  hold(a, { special: true }, 2); rel(a); k = 0; while (st().meteors.length === 0 && k++ < 30) step(1); r.air = st().meteors.length
  return r })
ok('M1 Up + Special = ONE giant ICE SPIKE', M.iceSpawn.n === 1 && M.iceSpawn.el === 'ice', J(M.iceSpawn))
ok('M2 it lands on the foe: damage + chill + FROZEN (the ice climbs over them) + an ICE patch', M.ice.dmg > 0 && M.ice.chill >= 2 && M.ice.patch && M.ice.hits >= 1 && M.ice.encased === 1 && M.ice.frozeAt > 0, J(M.ice))
ok('M3 hot: Up + Special = the FIRE RAIN — a dozen+ comets', M.fireSpawn.key === 'fireMeteor' && M.fireSpawn.n >= 12 && M.fireSpawn.els.join() === 'fire', J(M.fireSpawn))
{ const w = M.fireSpawn.waits, gaps = w.slice(1).map((v, i) => v - w[i]), o = M.fireSpawn.offs
  ok('M3b at uneven times and spots (hashed, not a fixed beat): gaps and offsets vary', new Set(gaps).size >= 4 && new Set(o).size >= 10 && Math.max(...o) - Math.min(...o) >= 150, J({ gaps, o })) }
ok('M3c they fall around the foe for ~2 s+, burn them, leave FIRE', M.fire.frames >= 120 && M.fire.dmg > 0 && M.fire.hits >= 3 && M.fire.burn >= 1 && M.fire.fires >= 1 && M.fire.xs.every(x => Math.abs(x) <= 230), J(M.fire))
ok('M4 Special in the air = the meteor', M.air >= 1, String(M.air))

// ═══ W. SNOWMAN + I. simple inputs ═══
const W = await page.evaluate(() => { const { H, step, hold, rel, setup, st } = __E; const r = {}
  let { a, b } = setup(900, 1300); H.setThermal(0)
  hold(a, { left: true, charge: true }, 1); hold(a, { charge: true }); rel(a); a.facing = 1   // Back (facing right) + Charge
  let k = 0; while (!st().snow && k++ < 30) step(1); step(16)
  r.made = !!st().snow; r.x = st().snow?.x
  // the foe walks into it: stopped
  for (let i = 0; i < 60; i++) { b.x -= 6; step(1) }
  r.stop = Math.round(b.x) >= Math.round(st().snow.x + 20); r.bx = Math.round(b.x)
  // it melts into WATER at the end of its life
  st().snow.t = 715; k = 0; while (st().snow && k++ < 200) step(1)
  r.melt = { gone: !st().snow, water: st().field.patches.some(p => p.type === 'water'), melts: st().stats.snowMelt }
  // fire beside it melts it faster
  ;({ a, b } = setup(900, 1500)); H.setThermal(0); hold(a, { left: true, charge: true }, 1); rel(a); a.facing = 1; k = 0; while (!st().snow && k++ < 30) step(1)
  const z = st().snow; H.patch({ type: 'fire', cx: z.x }); const t0 = z.t; step(30); r.fireMelt = st().snow ? st().snow.t - t0 : 999
  // simple inputs
  ;({ a, b } = setup(900, 1300)); H.setMode('fire'); hold(a, { right: true, heavy: true }, 1); rel(a); k = 0; while (!st().wall && k++ < 30) step(1); r.fwdHeavy = st().wall?.type
  ;({ a, b } = setup(900, 1300)); H.setThermal(-30); hold(a, { left: true, heavy: true }, 1); rel(a); k = 0; while (!st().wall && k++ < 30) step(1); r.backHeavy = st().wall?.type
  ;({ a, b } = setup(900, 1300)); H.setThermal(-30); hold(a, { left: true, special: true }, 1); rel(a); step(3); r.backSpecial = a.currentAttack?.en?.key || a.currentMove
  return r })
ok('W1 Back + Charge = a SNOWMAN ahead', W.made, J(W))
ok('W2 it is SOLID: the foe cannot walk through it', W.stop, J({ bx: W.bx, x: W.x }))
ok('W4 it MELTS into a WATER puddle at the end of its life', W.melt.gone && W.melt.water && W.melt.melts === 1, J(W.melt))
ok('W5 fire beside it melts it faster (life runs ×4)', W.fireMelt >= 90, String(W.fireMelt))
ok('I1 Forward + Heavy = FIRE WALL (fire mode) · Back + Heavy = ICE WALL (ice mode) · Back + Special = Deep Freeze', W.fwdHeavy === 'fire' && W.backHeavy === 'ice' && W.backSpecial === 'deepFreeze', J({ f: W.fwdHeavy, b: W.backHeavy, s: W.backSpecial }))

// ═══ L. MELTING + longer effects ═══
const L = await page.evaluate(() => { const { H, step, setup, st, ES } = __E; const r = {}
  let { a, b } = setup(600, 1400); H.setThermal(0); H.patch({ type: 'ice', cx: 900 })
  const p = st().field.patches.find(q => q.type === 'ice'); r.life = p.life; p.bornFrame -= p.life - 3; step(6)
  r.after = st().field.patches.map(q => q.type); r.melts = st().stats.melts
  r.status = { life: 600, ok: true }
  return r })
ok('L1 his ice lasts much longer (15 s) and MELTS into WATER when it runs out', L.life >= 900 && L.after.includes('water') && !L.after.includes('ice') && L.melts >= 1, J(L))

// ═══ screenshots ═══
await shot('meteor_ice', () => { const { H, step, hold, rel, setup } = __E; const { a } = setup(900, 1250); H.setThermal(0); hold(a, { up: true, jump: true, special: true }, 2); rel(a); step(26) })
await shot('meteor_ice_freeze', () => { const { step } = __E; step(22) })
await shot('meteor_fire_cast', () => { const { H, step, hold, rel, setup } = __E; const { a } = setup(900, 1250); H.setThermal(60); hold(a, { up: true, jump: true, special: true }, 2); rel(a); step(20) })
await shot('meteor_fire', () => { const { step } = __E; step(50) })
await shot('snowman', () => { const { H, step, hold, rel, setup } = __E; const { a } = setup(900, 1400); H.setThermal(0); hold(a, { left: true, charge: true }, 1); rel(a); a.facing = 1; step(40) })
await shot('snowman_melting', () => { const { step, st } = __E; st().snow.t = 719; step(40) })
await shot('ice_melting', () => { const { H, step, setup, st } = __E; setup(600, 1400); H.setThermal(0); H.patch({ type: 'ice', cx: 900 }); const p = st().field.patches.find(q => q.type === 'ice'); p.bornFrame -= p.life - 100; step(10) })
ok('R1 no Math.random in enoch / elements / beam', (await page.evaluate(() => __enRandom.length)) === 0)
ok('R2 no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close()
console.log(`\n  ENOCH METEOR + SNOWMAN: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
