// harness/robin_boot.mjs — Robin boot smoke: loads Robin vs Robin through the real game, taps J / K / L / P, reports state + page errors.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on('pageerror', e => errors.push(e.message)); const r404 = new Set(); page.on('response', r => { if (r.status() === 404) r404.add(r.url().replace(/^https?:\/\/[^/]+/, '')) })
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
try {
  await page.goto(server.base + '/index.html?harness=1&p1=robin&p2=robin&seed=550303'); await page.waitForFunction(() => window.__harness?.robinTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3)); await page.waitForFunction(() => __harness.spriteReady().ready, null, { timeout: 30000 })
  const st = await page.evaluate(() => { const H = __harness.robinTest; return { a: H.state(), hud: H.hud() } })
  console.log(JSON.stringify({ key: st.a.key, hp: st.a.hp, maxHp: st.a.maxHp, energy: st.a.energy, w: st.a.w, h: st.a.h, action: st.a.action, hud: st.hud }))
  for (const k of ['j', 'k', 'l', 'i', 'p']) { await page.keyboard.down(k); await page.evaluate(() => __harness.luffyTest.step(2)); await page.keyboard.up(k); await page.evaluate(() => __harness.luffyTest.step(40)); console.log(k, JSON.stringify(await page.evaluate(() => { const s = __harness.robinTest.state(); return { atk: s.attack?.name, act: s.action, smoke: !!s.s?.smoke, plant: !!s.s?.plant, land: s.land, e: s.energy } }))) }
  await page.evaluate(() => __harness.luffyTest.step(120)); await page.screenshot({ path: 'docs/robin/boot_smoke.png' })
  console.log('settled', JSON.stringify(await page.evaluate(() => { const s = __harness.robinTest.state(); return { act: s.action, frame: s.frame, flash: __harness.robinTest.raw().colorFlash || 0 } })))
} catch (e) { console.log('ERR', e.message) }
console.log('errors', errors.slice(0, 10)); console.log('404s', [...r404].length, [...r404].filter(u => /robin/i.test(u)).slice(0, 20), [...r404].filter(u => !/robin/i.test(u)).length + ' non-robin')
await browser.close(); server.close?.(); process.exit(0)
