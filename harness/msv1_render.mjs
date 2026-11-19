// harness/msv1_render.mjs — MSV1 RENDER CHECK (run before every MSV1 commit).
//   node harness/msv1_render.mjs [p1] [p2] [outdir]
// Boots the real game in Chromium, starts a match, proves: no page error, no blank screen, both fighters + HUD render,
// every ns_red / ns_yellow asset loads (no 404). Screenshot → docs/msv1/screenshots/MSV1_render_<p1>_vs_<p2>.png
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const P1 = process.argv[2] || 'ns_red', P2 = process.argv[3] || 'ns_yellow'
const OUT = process.argv[4] || 'docs/msv1/screenshots'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname) })
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const ls = (w = 'p1') => page.evaluate(w => __harness.luffyTest.state(w), w)
try {
  await page.goto(`${server.base}/index.html?harness=1&p1=${P1}&p2=${P2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest, null, { timeout: 30000 })
  check('MSV1 game boots (harness up, no page error at boot)', errors.length === 0, errors[0] || '')
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 6; i++) { await step(5); await new Promise(r => setTimeout(r, 250)) }
  const a = await ls('p1'), b = await ls('p2')
  check(`P1 spawned as ${P1}`, a?.key === P1, a?.key); check(`P2 spawned as ${P2}`, b?.key === P2, b?.key)
  check('both fighters alive with HP', a?.health > 0 && b?.health > 0, `${a?.health}/${b?.health}`)
  check('P1 sprite drawn (real draw rect)', a?.draw?.w > 20 && a?.draw?.h > 20, JSON.stringify(a?.draw))
  check('P2 sprite drawn (real draw rect)', b?.draw?.w > 20 && b?.draw?.h > 20, JSON.stringify(b?.draw))
  const cs = await page.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'); const u = (sx, sy, w, h) => { const d = x.getImageData(sx, sy, w, h).data, s = new Set(); for (let i = 0; i < d.length; i += 16) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size }; return { play: u(0, c.height * 0.3, c.width, c.height * 0.6), hud: u(0, 0, c.width, Math.round(c.height * 0.16)) } })
  check('not a blank screen', cs.play > 40, `uniq=${cs.play}`); check('HUD renders', cs.hud > 20, `uniq=${cs.hud}`)
  const np = await page.evaluate(() => [__harness.ninjaTest.state('p1')?.s?.np ?? null, __harness.ninjaTest.state('p2')?.s?.np ?? null])
  if (/^ns_/.test(P1)) check('P1 Ninja Power live (starts 50, regenerates)', np[0] != null && np[0] >= 50, JSON.stringify(np))
  await page.screenshot({ path: path.join(OUT, `MSV1_render_${P1}_vs_${P2}.png`) })
  const assets = await page.evaluate(async () => {
    const urls = new Set()
    for (const k of ['ns_red', 'ns_yellow']) { const ch = (await import('./characters.js')).characters[k]; for (const A of Object.values(ch.animationData)) urls.add(A.sheet); urls.add(ch.portrait); urls.add(ch.hudIcon) }
    const fx = (await import('./msv1Sprites.js')).MSV1_FX; for (const k of ['ns_red', 'ns_yellow']) for (const n of Object.keys(fx)) urls.add(`./assets/${k}/${n}.png`)
    return Promise.all([...urls].map(u => fetch(u).then(r => [u, r.status])))
  })
  const bad = assets.filter(([, s]) => s !== 200)
  check(`all ${assets.length} ns_red / ns_yellow sheets load`, bad.length === 0, bad.map(x => x.join(':')).slice(0, 4).join(', '))
  check('no page errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '))
  const mine = missing.filter(u => /ns_red|ns_yellow|ninja|nsFx|nsData|msv1/i.test(u))
  check('no MSV1 404s', mine.length === 0, mine.slice(0, 5).join(', '))
} catch (e) { check('render check ran to completion', false, e.stack || e.message) }
finally { await browser.close(); server.close?.() }
console.log(`\n══════════════════════════════\n  MSV1 RENDER CHECK ${P1} vs ${P2}: ${PASS} passed, ${FAIL} failed\n══════════════════════════════`)
process.exit(FAIL ? 1 : 0)
