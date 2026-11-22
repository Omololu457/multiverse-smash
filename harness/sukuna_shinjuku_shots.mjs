// harness/sukuna_shinjuku_shots.mjs — MSV1-SUKUNA screenshots (deterministic: rAF off, sim stepped, each shot is a real
// rendered frame of the real game). → docs/msv1/sukuna/screenshots/ (or argv[2]).
//   node harness/sukuna_shinjuku_shots.mjs [outDir] [--skins]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { serve } from './ben10_test_utils.mjs'
const OUT = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'docs/msv1/sukuna/screenshots'; fs.mkdirSync(OUT, { recursive: true })
const SKINS = process.argv.includes('--skins')
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const E = (fn, a) => page.evaluate(fn, a)
const step = n => E(n => __harness.luffyTest.step(n), n)
const shots = []
async function shot(name) { await new Promise(r => setTimeout(r, 350)); await step(0); await page.screenshot({ path: path.join(OUT, `SUKUNA_${name}.png`) }); shots.push(name) }
async function boot(p1 = 'sukuna_shinjuku', p2 = 'sukuna', s1 = 'default', s2 = 'default') {
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=50223`)
  await page.waitForFunction(() => window.__harness?.sukunaShinjukuTest, null, { timeout: 30000 })
  await E(o => { __harness.start({ p1Skin: o.s1, p2Skin: o.s2 }); __harness.skipToBattle(); __harness.preloadDone?.(); __harness.luffyTest.step(4) }, { s1, s2 })
  await new Promise(r => setTimeout(r, 1500)); await step(2)
  for (let i = 0; i < 20; i++) { const ok = await E(() => [...document.images].every(i => i.complete)); if (ok) break; await new Promise(r => setTimeout(r, 200)) }
}
async function place(gap = 160, o = {}) {
  await E(([gap, o]) => { const H = __harness.sukunaShinjukuTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw('p1'), b = H.raw('p2')
    a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = o.energy ?? a.maxEnergy; a.vx = b.vx = 0
    a.ultimateCooldown = 0 }, [gap, o])
  await step(1); await E(() => { const s = __harness.sukunaShinjukuTest.raw('p1')._sks; if (s) { s.say = null; s.said.intro = true } })   // reset() drops f._sks → its first tick re-says the intro
  await step(29)
}
const move = (k, o = {}) => E(([k, o]) => __harness.sukunaShinjukuTest.move(k, 'p1', o), [k, o])
const until = async (fn, max = 200) => { for (let i = 0; i < max; i++) { if (await E(fn)) return i; await step(1) } return -1 }
const st = () => '__harness.sukunaShinjukuTest.state()'
try {
  if (!SKINS) {
    await boot('sukuna_shinjuku', 'sukuna'); await shot('intro_know_your_place')
    await place(520); await move('kDismantle'); await until(() => __harness.sukunaShinjukuTest.state().s.cuts.length > 0, 30); await step(8); await shot('dismantle')
    await place(300); await E(() => __harness.sukunaShinjukuTest.move('kFan')); await step(12); await shot('dismantle_fan')
    await place(70); await move('kCleave'); await until(() => __harness.sukunaShinjukuTest.state('p2').hitstun > 0, 30); await step(1); await shot('cleave')
    await place(150); await move('kWeb'); await until(() => __harness.sukunaShinjukuTest.state().s.stats.webs > 0, 30); await step(4); await shot('spiderweb')
    await place(300); await move('kFugaG'); await step(80); await shot('fuga_gather')
    await place(300); await move('kFugaF', { lv: 3 }); await until(() => __harness.sukunaShinjukuTest.state().s.arrows.length > 0, 30); await step(6); await shot('fuga_arrow')
    await until(() => __harness.sukunaShinjukuTest.state().s.arrows.length === 0, 60); await step(3); await shot('fuga_explosion'); await step(30); await shot('fuga_fire_patch')
    await place(100); await move('kAmp'); await step(30); await shot('domain_amplification')
    await place(300); await move('kWorld'); for (const k of [6, 25, 25]) { await step(k); await shot(`world_slash_chant_${shots.filter(s => s.startsWith('world')).length + 1}`) }
    await until(() => __harness.sukunaShinjukuTest.state().s.world?.phase === 'cut', 40); await step(4); await shot('world_slash_cut')
    await place(260); await move('kShrine'); await step(60); await shot('malevolent_shrine'); await step(140); await shot('malevolent_shrine_b')
    // vs Satoru Gojo (Shinjuku): Infinity stops Dismantle; Amplification lands
    await boot('sukuna_shinjuku', 'gojo_shinjuku'); await place(80); await E(() => { const G = __harness.gojoShinjukuTest; G.setCe(100, 'p2'); G.setInfinity(3, 'p2') })
    await move('kAmp'); await step(10); await page.keyboard.down('k'); await step(2); await page.keyboard.up('k'); await until(() => __harness.sukunaShinjukuTest.state('p2').hitstun > 0, 30); await step(1); await shot('amplification_through_infinity')
    // KO → win line
    await place(160); await E(() => { __harness.sukunaShinjukuTest.raw('p2').health = 0 }); await step(4); await shot('win_vs_gojo')
  } else {
    await boot()
    const ids = await E(async () => (await import('./skins.js')).SKINS.sukuna_shinjuku.map(s => s.id).filter(i => i.startsWith('sks_')))
    for (const id of ids) { await boot('sukuna_shinjuku', 'sukuna', id); await place(240); await step(20); await move('kDismantle'); await step(14); await shot(`skin_${id.slice(4)}`) }
  }
} catch (e) { console.log('ERROR', e.stack) }
console.log('shots:', shots.length, shots.join(', '), errs.length ? '\nPAGE ERRORS: ' + errs.slice(0, 3).join(' | ') : '')
await browser.close(); server.close?.()
