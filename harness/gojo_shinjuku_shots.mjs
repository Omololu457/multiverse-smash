// harness/gojo_shinjuku_shots.mjs — MSV1-GOJO phase 10 screenshots (deterministic: rAF off, sim stepped, each shot is
// a real rendered frame of the real game). → docs/msv1/gojo/screenshots/ (or argv[2]).
//   node harness/gojo_shinjuku_shots.mjs [outDir]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { serve } from './ben10_test_utils.mjs'
const OUT = process.argv[2] || 'docs/msv1/gojo/screenshots'; fs.mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const E = (fn, a) => page.evaluate(fn, a)
const step = n => E(n => __harness.luffyTest.step(n), n)
const shots = []
async function shot(name) { await new Promise(r => setTimeout(r, 350)); await step(0); await page.screenshot({ path: path.join(OUT, `GOJO_${name}.png`) }); shots.push(name) }
async function boot(p1 = 'gojo_shinjuku', p2 = 'gojo_shinjuku', s1 = 'default', s2 = 'default') {
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=50223`)
  await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
  await E(o => { __harness.start({ p1Skin: o.s1, p2Skin: o.s2 }); __harness.skipToBattle(); __harness.preloadDone?.(); __harness.luffyTest.step(4) }, { s1, s2 })
  await new Promise(r => setTimeout(r, 1500)); await step(2)
  for (let i = 0; i < 20; i++) { const ok = await E(() => [...document.images].every(i => i.complete)); if (ok) break; await new Promise(r => setTimeout(r, 200)) }
}
async function place(gap = 160, o = {}) {
  await E(([gap, o]) => { const H = __harness.gojoShinjukuTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw('p1'), b = H.raw('p2')
    a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.health = a.maxHealth; b.health = b.maxHealth; H.setCe(100); H.setEnergy(o.energy ?? 0); a.vx = b.vx = 0; for (const f of [a, b]) if (f._gs) { f._gs.say = null; f._gs.said.intro = true } }, [gap, o])
  await step(30)
}
const move = (k, o = {}) => E(([k, o]) => __harness.gojoShinjukuTest.move(k, 'p1', o), [k, o])
const until = async (fn, max = 200) => { for (let i = 0; i < max; i++) { if (await E(fn)) return i; await step(1) } return -1 }
try {
  await boot('gojo_shinjuku', 'sukuna')
  await place(240); await move('gLapse', { dir: 1 }); await until(() => __harness.gojoShinjukuTest.state().s.fields.length > 0); await step(10); await shot('lapse_blue_pull')
  await place(220); await move('gMaxBlue', { dir: 1 }); await until(() => __harness.gojoShinjukuTest.state().s.fields.length > 0); await step(24); await shot('max_blue')
  await place(60); await move('gBlueFist'); await until(() => __harness.gojoShinjukuTest.state().attack?.gs?.contact); await shot('blue_fist')
  await place(70); await move('gRed'); await until(() => __harness.gojoShinjukuTest.state().attack?.gs?.contact || __harness.gojoShinjukuTest.state('p2').hitstun > 0); await step(1); await shot('reversal_red')
  await place(120); await move('gRedRush'); await until(() => __harness.gojoShinjukuTest.state('p2').hitstun > 0); await step(2); await shot('red_rush')
  await place(500, { energy: 300 }); await move('gPurple', { dir: 1 }); await until(() => (__harness.gojoShinjukuTest.state().s.purples || []).length > 0, 160); await step(6); await shot('hollow_purple_fire')
  await step(20); await shot('hollow_purple_flight')
  await place(220, { energy: 300 }); await move('gPurple200', { dir: 1 })
  await step(52); for (let k = 1; k <= 3; k++) { await page.keyboard.down('l'); await step(1); await page.keyboard.up('l'); await step(6); await shot(`chant_line_${k}`); await step(k < 3 ? 53 : 0) }
  await until(() => (__harness.gojoShinjukuTest.state().s.purples || []).length > 0, 200); await step(30); await shot('purple_200_dome')
  // stopped projectile hanging in front of him (P2 shoots, P1 holds Infinity L1)
  await place(420); await E(() => { __harness.gojoShinjukuTest.setInfinity(1, 'p1'); __harness.gojoShinjukuTest.shoot({ speed: 9, damage: 40 }, 'p2') })
  await until(() => __harness.gojoShinjukuTest.projectiles().some(p => p.hang != null), 120); await step(6); await shot('infinity_stopped_projectile')
  // Black Flash: Palm into Special inside the 2-frame window (real keys)
  await place(56); await page.keyboard.down('k'); await step(1); await page.keyboard.up('k')
  await until(() => __harness.gojoShinjukuTest.state('p2').hitstun > 0, 40); await page.keyboard.down('l'); await step(1); await page.keyboard.up('l')
  await until(() => __harness.gojoShinjukuTest.state().s.stats.bf > 0, 6); await step(1); await shot('black_flash')
  // teleport / blink / charge
  await place(400); for (const k of ['d', null, 'd']) { if (k) await page.keyboard.down(k); await step(2); if (k) await page.keyboard.up(k); await step(1) } await step(2); await shot('teleport')
  await place(160); for (const k of ['a', null, 'a']) { if (k) await page.keyboard.down(k); await step(2); if (k) await page.keyboard.up(k); await step(1) } await step(3); await shot('long_blink')
  await place(300); await page.keyboard.down('p'); await step(40); await shot('charge'); await page.keyboard.up('p'); await step(4)
  // domain + burnout
  await place(200, { energy: 300 }); await move('gDomain'); await until(() => __harness.gojoShinjukuTest.state('p2').frozen, 80); await step(40); await shot('unlimited_void'); await step(60); await shot('unlimited_void_b'); await step(200); await shot('unlimited_void_c')
  await step(15 * 60 - 300); await until(() => __harness.gojoShinjukuTest.state().s.burnout > 0, 120); await step(20); await shot('domain_burnout')
  // intro bubble vs Sukuna
  await boot('gojo_shinjuku', 'sukuna'); await shot('intro_nah_id_win')
  // 4 skins in a match
  for (const id of ['gs_alienx_leak', 'gs_opal', 'gs_chromastone', 'gs_ink']) {
    await boot('gojo_shinjuku', 'sukuna', id); await place(220); await step(60); await shot(`skin_${id.slice(3)}`)
    await move('gRed'); await step(14); await shot(`skin_${id.slice(3)}_red`)
  }
} catch (e) { console.log('ERROR', e.stack) }
console.log('shots:', shots.length, shots.join(', '), errs.length ? '\nPAGE ERRORS: ' + errs.slice(0, 3).join(' | ') : '')
await browser.close(); server.close?.()
