import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { comboDriver } from './elastigirl_combo_lib.mjs'
const server = await serve(), browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
await page.goto(server.base + `/index.html?harness=1&p1=elastigirl&p2=batman&seed=7`); await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
await page.waitForFunction(() => __harness.spriteReady().ready, null, { timeout: 60000 }); await page.evaluate(() => __harness.setRoundTimer?.(99999))
const c = comboDriver(page)
for (const gap of (process.env.GAPS || '20,90').split(',').map(Number)) for (const wait of (process.env.WAITS || '0,6').split(',').map(Number)) for (const hold of (process.env.HOLDS || '8,16,24').split(',').map(Number)) {
  await c.begin(gap); await c.press(['i']); await c.cancelOpen(); await c.press(['w'], 2); await c.tick(wait)
  await page.keyboard.down('w'); await page.keyboard.down('l'); await c.tick(hold); await page.keyboard.up('l'); await page.keyboard.up('w')
  const q0 = await c.st(); let airAt = null
  for (let i = 0; i < 30 && airAt == null; i++) { const q = await c.st(); const front = q.a.facing === 1 ? q.a.x + q.a.w : q.a.x; const dx = (q.b.x + 24) - (q.a.x + 24), dy = q.b.y - q.a.y
    if (Math.abs(dx) < 110 && dy > -60 && dy < 90 && Math.sign(dx) === q.a.facing) airAt = i; else await c.tick(1) }
  if (airAt != null) { await c.press(['j']); await c.until(q => q.a.attack?.eg?.clean || !q.a.attack, 20); await c.press(['s', 'l'])
    for (let i = 0; i < 40; i++) { if (i === +(process.env.SLAMAT || 7)) await c.press(['l'], 1); await c.tick(1); const q = await c.st(); if (process.env.TRACE) console.log(i, q.a.attack?.name || q.a.cast || '-', 'A', Math.round(q.a.x), Math.round(q.a.y), 'B', Math.round(q.b.x), Math.round(q.b.y), Math.round(q.b.vy), q.b.stun, q.b.g ? 'G' : '', JSON.stringify(q.a.box)) } }
  console.log(JSON.stringify({ gap, wait, hold, rel: { ax: Math.round(q0.a.x), ay: Math.round(q0.a.y), bx: Math.round(q0.b.x), by: Math.round(q0.b.y), vx: +q0.a.vx.toFixed(1), vy: +q0.a.vy.toFixed(1), face: q0.a.facing }, airAt, hits: c.log.map(h => h.move + ':' + h.d + (h.combo ? '' : '!')).join(' ') }))
}
await browser.close(); server.close?.()
