// megazord_shots.mjs — MSV1-MEGAZORD screenshots → docs/msv1/megazord/screenshots/ (call, captions, landing, power-up, saber slash,
// fireball, Saber Charge, finisher, separation).  Run: node harness/megazord_shots.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import fs from 'node:fs'
const OUT = new URL('../docs/msv1/megazord/screenshots/', import.meta.url); fs.mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
await page.goto(`${server.base}/index.html?p1=mmpr_rangers&p2=luffy&seed=5&harness=1`); await page.waitForFunction(() => window.__harness?.spdSquad, null, { timeout: 90000 })
await page.evaluate(() => { __harness.bootSkin('default', 'default'); __harness.setDummyBehavior?.('stand'); __harness.setTrainingOverlay?.(false) })
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const shot = async name => { await page.waitForTimeout(400); await step(1); await page.screenshot({ path: new URL(name + '.png', OUT).pathname }); console.log('shot', name) }
const near = d => page.evaluate(d => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); b.x = a.x + a.w + d - 48; b.facing = -1; a.facing = 1; b.health = b.maxHealth; const m = a._squad?.mz; if (m?.phase === 'mode') m.timer = 720 }, d)
const press = async (keys, n = 2) => { for (const k of keys) await page.keyboard.down(k); await step(n); for (const k of keys) await page.keyboard.up(k); await step(1) }
await step(30); await near(260); await page.evaluate(() => { __harness.gojoShinjukuTest.raw('p1').energy = 100 })
await press(['u', 'l']); await step(10); await shot('01_call')
await step(40); await shot('02_captions')
await step(100); await shot('03_landing')            // t ≈ 152: kneel (R1)
await step(14); await shot('04_power_up')            // saber raise + portrait cut-in
await step(40); await near(90); await step(2); await press(['l']); await step(14); await shot('05_saber_slash')
await step(40); await near(560); await step(2)
await page.keyboard.down('s'); await step(2); await page.keyboard.down('d'); await step(2); await page.keyboard.up('s'); await step(2); await page.keyboard.down('l'); await step(2); await page.keyboard.up('l'); await page.keyboard.up('d')
await step(34); await shot('06_fireball')
await step(60); await near(300); await step(2); await press(['s'], 1); await press(['s'], 1); await press(['l']); await step(20); await shot('07_saber_charge')
await step(60); await near(200); await step(2); await press(['u', 'l']); await step(30); await shot('08_finisher')
await step(84); await shot('09_separation')
console.log('errors', errors)
await browser.close(); process.exit(0)
