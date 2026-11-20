// harness/msv1_clones_trace.mjs — MSV1-CLONES: frame-by-frame trace of the ninja clone job (Shane / Dustin), for the
// before/after proof that moving the engine into clonechoreo.js changed nothing. Prints one JSON line.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(); const browser = await chromium.launch({ headless: true })
const out = {}
for (const key of ['ns_red', 'ns_yellow']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${key}&p2=spd_red`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.ninjaTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.rng.forceSeed(5); __harness.start({}); __harness.skipToBattle() })
  await page.evaluate(() => __harness.luffyTest.step(2))
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await page.evaluate(() => __harness.luffyTest.step(5)); await new Promise(r => setTimeout(r, 120)) }
  out[key] = await page.evaluate(() => {
    const T = __harness.ninjaTest, L = __harness.luffyTest, a = T.raw('p1'), z = T.raw('p2'), rows = []
    a.x = 900; z.x = 1080; z.facing = -1; a.facing = 1
    for (let rep = 0; rep < 2; rep++) {
      T.clones('p1')
      for (let i = 0; i < 64; i++) { L.step(1); const s = a._ninja; rows.push([s.cloneJob?.t ?? -1, s.clones.map(c => [c.id, c.phase, Math.round(c.x * 100), Math.round(c.feet * 100), c.tilt, c.pose, c.dir]), z.health, Math.round(z.x), s.fx.length, s.stats.clonePops, s.cloneJob?.hits ?? null]) }
      z.health = z.maxHealth
    }
    return rows
  })
  await page.close()
}
console.log(JSON.stringify(out))
await browser.close(); server.close?.()
