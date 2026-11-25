// roster_speed_probe.mjs — measures each fighter's LIVE ground walk speed and forward-dash speed (px/frame) in a real match
// (all multipliers applied: OG/weak-tier/speed buffs, WALK_FEEL …). Usage: node harness/roster_speed_probe.mjs [key …] > out.json
// With no keys: the whole roster. Read-only — changes nothing.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true })
let keys = process.argv.slice(2)
if (!keys.length) { const p = await browser.newPage(); await p.goto(`${server.base}/index.html?harness=1&p1=luffy&p2=luffy`); keys = await p.evaluate(async () => Object.keys((await import('./characters.js')).characters)); await p.close() }
const out = {}
for (const k of keys) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } })
  try {
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
    await page.goto(`${server.base}/index.html?harness=1&p1=${k}&p2=luffy&seed=5`, { timeout: 90000 })
    await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 90000 })
    out[k] = await page.evaluate(async () => {
      const { writeRawControls } = await import('./input.js'); const H = __harness.gojoShinjukuTest, T = __harness.luffyTest
      __harness.bootSkin?.('default', 'default'); __harness.setDummyBehavior?.('stand'); T.step(30)
      const a = H.raw('p1'), b = H.raw('p2'); b.x = a.x + 900; a.facing = 1
      let walk = 0; for (let i = 0; i < 40; i++) { writeRawControls(a, { right: true }); T.step(1); if (a.grounded !== false) walk = Math.max(walk, Math.abs(a.vx || 0)) }
      writeRawControls(a, {}); T.step(20); a.x = Math.max(200, a.x - 300); b.x = a.x + 900; a.facing = 1
      a.dashCooldown = 0; a.dashTimer = a.dashDuration || 8; let dash = 0; for (let i = 0; i < 3; i++) { T.step(1); dash = Math.max(dash, Math.abs(a.vx || 0)) }
      return { key: a.rosterKey, walk: +walk.toFixed(2), dash: +dash.toFixed(2), hp: a.maxHealth }
    })
  } catch (e) { out[k] = { err: String(e.message).slice(0, 80) } }
  await page.close(); process.stderr.write('.')
}
console.log(JSON.stringify(out)); await browser.close(); server.close?.(); process.exit(0)
