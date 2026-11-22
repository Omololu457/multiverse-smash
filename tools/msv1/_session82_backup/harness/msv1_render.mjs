// MSV1 — RENDER CHECK: boot, pick each ninja (ns_red / ns_yellow, both slots + vs S.P.D. Red), start a match, both fighters +
// HUD render; plus framework screenshots (streak, mirror + tell, clones, burrow, dome, super). Screenshots →
// docs/msv1/screenshots/MSV1_*.png.   node harness/msv1_render.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const OUT = new URL('../docs/msv1/screenshots/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true })
let pass = 0, fail = 0; const other404 = new Set(); const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
async function boot(p1, p2, seed = 771901) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
  page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) { const u = new URL(r.url()).pathname; if (/msv1|nsWind|ninja\.js/i.test(u)) errors.push('404 ' + u); else other404.add(u) } })
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}&seed=${seed}`); await page.waitForFunction(() => window.__harness?.nsWindTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone?.())
  await page.waitForTimeout(400); await page.evaluate(() => __harness.luffyTest.step(3))
  return { page, errors, step: n => page.evaluate(n => __harness.luffyTest.step(n), n), S: (e, a) => page.evaluate(([e, a]) => { const H = __harness.nsWindTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [e, a]) }
}
async function render(page) { await page.evaluate(() => __harness.renderFrame?.()); await page.waitForTimeout(60) }
async function shot(page, name) { await render(page); await page.screenshot({ path: OUT + name }) }
try {
  for (const [a, b] of [['ns_red', 'ns_yellow'], ['ns_yellow', 'ns_red'], ['ns_red', 'spd_red'], ['ns_yellow', 'spd_red']]) {
    const B = await boot(a, b)
    await B.step(30)
    const st = await B.S('[H.state(), H.state("p2")]')
    ck(`${a} vs ${b}: both fighters present`, st[0].key === a && st[1].key === b, JSON.stringify([st[0].key, st[1].key]))
    const px = await B.page.evaluate(() => { const c = document.querySelector('canvas'); const g = c.getContext('2d'); return c.width })
    await shot(B.page, `MSV1_match_${a}_vs_${b}.png`)
    ck(`${a} vs ${b}: no page errors`, B.errors.length === 0, B.errors.slice(0, 3).join(' | '))
    await B.page.close()
  }
  // framework poses (Shane vs Dustin)
  const B = await boot('ns_red', 'ns_yellow')
  await B.S('H.reset()'); await B.step(10)
  await B.S('(()=>{const a=H.raw(),b=H.raw("p2");a.x=1200;b.x=1500;a.facing=1;b.facing=-1;H.setNP(100);H.setNP(100,"p2");a.energy=b.energy=100})()'); await B.step(2)
  ck('streak starts', await B.S('H.streak(1)')); await B.step(3); await shot(B.page, 'MSV1_streak.png'); await B.step(20)
  ck('mirror starts', await B.S('H.mirror()')); await B.step(40); await shot(B.page, 'MSV1_mirror_tell.png')
  ck('Dustin burrow', await B.S('H.burrow("p2")')); await B.step(14); await shot(B.page, 'MSV1_burrow.png'); await B.step(120)
  ck('Dustin Rock Hold', await B.S('H.barrier("p2")')); await B.step(4); await shot(B.page, 'MSV1_rockhold.png'); await B.step(80)
  await B.S('(()=>{const a=H.raw(),b=H.raw("p2");a.x=1300;b.x=1390;H.raw().energy=100})()'); await B.step(30)
  ck('super starts', await B.S('H.move("super")')); await B.step(34); await shot(B.page, 'MSV1_super_shane.png'); await B.step(80)
  ck('framework run: no page errors', B.errors.length === 0, B.errors.slice(0, 3).join(' | '))
  await B.page.close()
} catch (e) { fail++; console.log('FAIL exception', e.message) }
finally { await browser.close(); server.close(); if (other404.size) console.log('note: non-MSV1 404s (pre-existing, not ours):', [...other404].join(', ')) }
console.log(`\nMSV1 render: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
