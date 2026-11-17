// harness/enoch_erupt.test.mjs — Enoch's FROST FLOOR / FLAME FLOOR eruption juice (charge up, spikes popping out of the ground
// toward the foe and growing, fanned side spikes, cracked floor + chunks, the big cluster + flash + shake, the shatter, the frost).
//   node harness/enoch_erupt.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const J = o => JSON.stringify(o)
fs.mkdirSync('docs/enoch/screenshots', { recursive: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
await page.goto(server.base + '/index.html?harness=1&p1=enoch&p2=naruto&seed=4242', { waitUntil: 'load' })
await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
await page.evaluate(async () => {
  const { writeRawControls } = await import('./input.js'); const PF = await import('./platforms.js'); const { camera } = await import('./camera.js')
  const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
  const hold = (f, r, n = 1) => { writeRawControls(f, r); step(n) }
  window.__E = { H, PF, step, hold, rel: f => writeRawControls(f, {}), st: () => H.raw()._enoch,
    setup: (ax = 1000, bx = 1200) => { H.reset(); camera.reset(); __harness.setDummyBehavior?.('stand'); const a = H.raw(), b = H.raw('p2')
      for (const f of [a, b]) { f.leftTapTime = f.rightTapTime = 0; f.health = f.maxHealth; f.vx = f.vy = 0; f.hitstun = 0; f.blockstun = 0; f.invulnTimer = 0; f.energy = 0
        f.knockdownState = false; f.hitstop = 0; f._supFrozen = 0; f.attackCooldown = 0; f.dashCooldown = 0; f.comboCounter = 0 }
      a.x = ax; b.x = bx; a.facing = ax < bx ? 1 : -1; b.facing = -a.facing; writeRawControls(a, {}); writeRawControls(b, {}); step(2); return { a, b } } }
})
// ═══ E. THE ERUPTION (Frost Floor / Flame Floor, Down + Special) — the 8 juice steps, render-only ═══
await page.evaluate(() => { window.requestAnimationFrame = () => 0 })   // freeze the live loop: each step() renders exactly one frame for the shots
const shots = []
for (const m of ['ice', 'fire']) {
  const R0 = await page.evaluate(m => { const { H, step, hold, rel, setup, st } = __E; const { a, b } = setup(900, 1080); H.setMode(m)
    const hp0 = b.health; hold(a, { down: true }, 2); hold(a, { down: true, special: true }); rel(a); step(5)
    const ch = !!(a.attacking && a.currentAttack?.en?.key === 'frostFloor' && !a.currentAttack.en.released)
    return { ch, hp0 } }, m)
  await page.screenshot({ path: `docs/enoch/screenshots/erupt_${m}_1_charge.png` })
  const R1 = await page.evaluate(() => { const { step, st } = __E; let k = 0; while (!st().fx.some(e => e.kind === 'erupt') && k++ < 20) step(1)
    const e = st().fx.find(e => e.kind === 'erupt'); return e ? { el: e.el, dir: e.dir, x0: e.x0, x: e.x, t: e.t } : null })
  const R2 = await page.evaluate(() => { const { step, st } = __E; while ((st().fx.find(e => e.kind === 'erupt')?.t ?? 99) < 5) step(1); return st().fx.find(e => e.kind === 'erupt')?.t })
  await page.screenshot({ path: `docs/enoch/screenshots/erupt_${m}_2_cluster.png` })
  await page.evaluate(() => __E.step(20)); await page.screenshot({ path: `docs/enoch/screenshots/erupt_${m}_3_hold.png` })
  await page.evaluate(() => __E.step(17)); await page.screenshot({ path: `docs/enoch/screenshots/erupt_${m}_4_shatter.png` })
  await page.evaluate(() => __E.step(20)); await page.screenshot({ path: `docs/enoch/screenshots/erupt_${m}_5_frost.png` })
  const hp = await page.evaluate(() => __E.H.raw('p2').health)
  shots.push({ m, R0, R1, R2, dmg: R0.hp0 - hp })
}
const [I, F] = shots
ok('E1 charge up: during the startup the special is still gathering in his hand (drawn by drawCharge)', I.R0.ch && F.R0.ch, J([I.R0, F.R0]))
ok('E2 the cast leaves ONE eruption event per element (ice / fire), from his feet to the foe', I.R1?.el === 'ice' && F.R1?.el === 'fire' && I.R1.dir === 1 && I.R1.x > I.R1.x0, J([I.R1, F.R1]))
ok('E3 it still hits like before (Frost Floor / Flame Floor damage lands)', I.dmg > 0 && F.dmg > 0, J([I.dmg, F.dmg]))
ok('R no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close()
console.log(`\n  ENOCH ERUPTION: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
