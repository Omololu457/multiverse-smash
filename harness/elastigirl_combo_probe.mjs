import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { comboDriver } from './elastigirl_combo_lib.mjs'
const server = await serve(), browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('pageerror', e => console.log('ERR', e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
await page.goto(server.base + `/index.html?harness=1&p1=elastigirl&p2=batman&seed=7`); await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
await page.waitForFunction(() => __harness.spriteReady().ready, null, { timeout: 60000 }); await page.evaluate(() => __harness.setRoundTimer?.(99999))
const c = comboDriver(page)
const show = n => console.log(n, JSON.stringify(c.log), 'sum', c.log.reduce((s, h) => s + h.d, 0))
await c.begin(40); await c.press(['j']); await c.cancelOpen(); await c.press(['j']); await c.cancelOpen(); await c.press(['k']); await c.cancelOpen(); await c.motion('236'); await c.tick(90); show('C1 Jab Jab Heavy LongArm')
await c.begin(60); await c.press(['s', 'j']); await c.cancelOpen(); await c.press(['i']); await c.cancelOpen(); console.log('after launcher', JSON.stringify((await c.st()).b)); await c.press(['w'], 2); await c.tick(6); await c.press(['j']); const q1 = await c.cancelOpen(); console.log('air cancel', JSON.stringify({ a: q1.a.attack?.name, clean: q1.a.attack?.eg?.clean, open: q1.a.cancel, ay: q1.a.y, by: q1.b.y, bx: q1.b.x, ax: q1.a.x })); await c.press(['l']); const q2 = await c.st(); console.log('after L', JSON.stringify({ a: q2.a.attack?.name, cast: q2.a.cast, e: q2.a.energy, rej: q2.a.s?.stats?.rejects })); for (let i = 0; i < 30; i++) { await c.tick(1); const q = await c.st(); if (i % 3 === 0) console.log(i, q.a.attack?.name, q.a.attack && (q.a.attack.total - q.a.attack.timer), JSON.stringify(q.a.box), Math.round(q.a.y), Math.round(q.b.y), Math.round(q.b.x - q.a.x)) } await c.tick(60); show('C2 Low Launcher Air Whirl')
await c.begin(330); await c.motion('236'); await c.until(q => q.a.attack?.name === 'eLongPull', 60); await c.until(q => !q.a.attack, 60); await c.press(['k']); await c.cancelOpen(); await c.motion('412'); await c.tick(90); show('C3 LongArm Heavy Whip')
const trace = async (n, tag) => { for (let i = 0; i < n; i++) { await c.tick(1); const q = await c.st(); if (i % 2 === 0) console.log(tag, i, q.a.attack?.name || q.a.cast || '-', 'A', Math.round(q.a.x), Math.round(q.a.y), q.a.swinging ? 'SW' : '', 'B', Math.round(q.b.x), Math.round(q.b.y), q.b.stun, q.b.g ? 'G' : '') } }
const HOLD = +(process.env.HOLD || 10), WAIT = +(process.env.WAIT || 4)
await c.begin(60); await c.press(['i']); await c.cancelOpen(); await c.press(['w'], 2); await c.tick(WAIT); await page.keyboard.down('w'); await page.keyboard.down('l'); await trace(HOLD, 'sling'); await page.keyboard.up('l'); await page.keyboard.up('w'); await trace(4, 'rel')
await c.press(['j']); await trace(10, 'air'); await c.press(['s', 'l']); await trace(8, 'para'); await c.press(['l']); await trace(30, 'slam'); show('C4 Launcher Sling Air Para')
await browser.close(); server.close?.()
