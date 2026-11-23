// harness/omniman_viltrum_shots.mjs — MSV1-OMNIMAN screenshots (deterministic: rAF off, sim stepped, each shot is a real
// rendered frame of the real game). → docs/msv1/omniman/screenshots/ (or argv[2]).
//   node harness/omniman_viltrum_shots.mjs [outDir] [--set=moves|present]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { serve } from './ben10_test_utils.mjs'
const OUT = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'docs/msv1/omniman/screenshots'; fs.mkdirSync(OUT, { recursive: true })
const SET = (process.argv.find(a => a.startsWith('--set=')) || '--set=moves').slice(6)
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const E = (fn, a) => page.evaluate(fn, a)
const step = n => E(n => __harness.luffyTest.step(n), n)
const shots = []
async function shot(name) { await new Promise(r => setTimeout(r, 300)); await step(0)
  await E(() => { for (const w of ['p1', 'p2']) { const f = __harness.omnimanViltrumTest.raw(w); delete f._impactFlash; f.colorFlash = 0 } })
  await page.screenshot({ path: path.join(OUT, `OMNIMAN_${name}.png`) }); shots.push(name) }
async function boot(p2 = 'homelander', s1 = 'default') {
  await page.goto(server.base + `/index.html?harness=1&p1=omniman_viltrum&p2=${p2}&seed=40517`)
  await page.waitForFunction(() => window.__harness?.omnimanViltrumTest, null, { timeout: 30000 })
  await E(o => { __harness.start({ p1Skin: o.s1 }); __harness.skipToBattle(); __harness.preloadDone?.(); __harness.luffyTest.step(4) }, { s1 })
  await new Promise(r => setTimeout(r, 1500)); await step(2)
  for (let i = 0; i < 20; i++) { const ok = await E(() => [...document.images].every(i => i.complete)); if (ok) break; await new Promise(r => setTimeout(r, 200)) }
}
async function place(gap = 160, o = {}) {
  await E(([gap, o]) => { const H = __harness.omnimanViltrumTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw('p1'), b = H.raw('p2')
    a.x = o.x ?? 1100; b.x = a.x + gap; a.facing = 1; b.facing = -1; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = o.energy ?? a.maxEnergy; a.vx = b.vx = 0; a.ultimateCooldown = 0 }, [gap, o])
  await step(30)
}
const move = (k, o = {}) => E(([k, o]) => __harness.omnimanViltrumTest.move(k, 'p1', o), [k, o])
const ph = () => E(() => __harness.omnimanViltrumTest.raw()._omv?.ev?.ph || null)
const until = async (fn, max = 400) => { for (let i = 0; i < max; i++) { if (await E(fn)) return i; await step(1) } return -1 }
try {
  await boot()
  if (SET === 'moves') {
    // flight at top speed (speed lines + afterimage) and the sonic boom
    await place(900, { x: 500 }); await E(() => __harness.omnimanViltrumTest.fly()); await step(8)
    await page.keyboard.down('d'); await step(8); await shot('flight_boom'); await step(4); await shot('flight_top_speed'); await page.keyboard.up('d')
    await page.keyboard.down(';'); await step(3); await shot('flight_brake'); await page.keyboard.up(';'); await step(30)
    // Blitz, Face in the Dirt, THINK!
    await place(300); await move('kBlitz'); await step(9); await shot('blitz')
    await place(60); await move('kDirt'); await step(14); await shot('face_in_the_dirt')
    await place(240); await move('kThink'); await until(() => !!__harness.omnimanViltrumTest.raw()._omv?.hold); await step(6); await shot('think')
    // ESCAPE VELOCITY: ascent, orbit, return (re-entry), crater
    await place(150); await move('kEscape')
    await until(() => __harness.omnimanViltrumTest.raw()._omv?.ev?.ph === 'ascent'); await step(60); await shot('escape_ascent')
    await until(() => __harness.omnimanViltrumTest.raw()._omv?.ev?.ph === 'orbit'); await step(40); await shot('escape_orbit')
    await until(() => __harness.omnimanViltrumTest.raw()._omv?.ev?.ph === 'ret'); await step(55); await shot('escape_reentry')
    await until(() => __harness.omnimanViltrumTest.raw()._omv?.ev?.ph === 'impact'); await step(4); await shot('escape_impact')
    await step(120); await shot('escape_crater')
  }
} catch (e) { console.log('ERROR', e.stack) }
console.log('shots', shots.length, shots.join(' '), 'errors', errs.length, errs.slice(0, 2).join(' | '))
await browser.close(); server.close(); process.exit(errs.length ? 1 : 0)
