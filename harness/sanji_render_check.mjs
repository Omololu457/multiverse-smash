// harness/sanji_render_check.mjs — Sanji RENDER CHECK (run before every Sanji commit).
//   node harness/sanji_render_check.mjs [phase]
// Boots the real game in Chromium, starts a match and proves: no page error, no blank screen, both fighters + HUD
// render, every Sanji asset loads (no 404). From phase 2: P1 = Sanji vs P2 = Zoro. Later phases add scenario
// checks (Diable Jambe, Sky Walk, the Course, Party Table Kick Course). Screenshots → /tmp/ms-sanji-render/
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

const PHASE = Number(process.argv[2] || 99)
const OUT = '/tmp/ms-sanji-render'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }

const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname) })
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })   // drive frames manually (deterministic)

const P1 = PHASE >= 2 ? 'sanji' : 'zoro', P2 = PHASE >= 2 ? 'zoro' : 'buggy'
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const shot = name => page.screenshot({ path: path.join(OUT, name + '.png') })
const ls = (w = 'p1') => page.evaluate(w => __harness.luffyTest.state(w), w)
const as = (w = 'p1') => page.evaluate(w => __harness.sanjiTest.state(w), w)
const call = (fn, ...a) => page.evaluate(([fn, a]) => __harness.sanjiTest[fn](...a), [fn, a])
const canvasStats = () => page.evaluate(() => {
  const c = document.querySelector('canvas'); const x = c.getContext('2d')
  const uniq = (sx, sy, w, h) => { const d = x.getImageData(sx, sy, w, h).data, s = new Set(); for (let i = 0; i < d.length; i += 16) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size }
  return { play: uniq(0, c.height * 0.3, c.width, c.height * 0.6), hud: uniq(0, 0, c.width, Math.round(c.height * 0.16)) }
})
globalThis.__ctx = { page, step, shot, ls, as, call, check, PHASE }

try {
  await page.goto(`${server.base}/index.html?harness=1&p1=${P1}&p2=${P2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest, null, { timeout: 30000 })
  check('game boots (harness up, no page error at boot)', errors.length === 0, errors[0] || '')
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 6; i++) { await step(5); await new Promise(r => setTimeout(r, 250)) }   // let sheets decode (real time)
  const a = await ls('p1'), b = await ls('p2')
  check(`P1 spawned as ${P1}`, a?.key === P1, a?.key)
  check(`P2 spawned as ${P2}`, b?.key === P2, b?.key)
  check('both fighters alive with HP', a?.health > 0 && b?.health > 0, `${a?.health}/${b?.health}`)
  check('P1 sprite drawn (real draw rect)', a?.draw?.w > 20 && a?.draw?.h > 20, JSON.stringify(a?.draw))
  check('P2 sprite drawn (real draw rect)', b?.draw?.w > 20 && b?.draw?.h > 20, JSON.stringify(b?.draw))
  const cs = await canvasStats()
  check('not a blank screen (play area has many colours)', cs.play > 40, `uniq=${cs.play}`)
  check('HUD strip renders (many colours)', cs.hud > 20, `uniq=${cs.hud}`)
  await shot(`p${PHASE}-00-match`)

  const assets = await page.evaluate(async () => {
    const m = await import('./sanjiSprites.js')
    const urls = [...Object.values(m.SANJI_ANIM).map(a => a.sheet), ...Object.values(m.SANJI_DJ_ANIM).map(a => a.sheet), ...Object.values(m.SANJI_FX).map(f => f.sheet).filter(Boolean)]
    return Promise.all([...new Set(urls)].map(u => fetch(u).then(r => [u, r.status])))
  })
  const bad = assets.filter(([, s]) => s !== 200)
  check(`all ${assets.length} Sanji sprite/FX sheets load`, bad.length === 0, bad.map(x => x.join(':')).join(', '))

  if (PHASE >= 2) {
    const scen = await import('./sanji_render_scenarios.mjs')
    await scen.run(globalThis.__ctx)
  }
  check('no page errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '))
  const mine = missing.filter(u => /sanji|assets\/zoro\/merry/i.test(u))   // pre-existing roster 404s (shizuku art, /api/health) are not Sanji's
  check('no Sanji 404s', mine.length === 0, mine.slice(0, 5).join(', '))
} catch (e) {
  check('render check ran to completion', false, e.stack || e.message)
} finally {
  await browser.close(); server.close?.()
}
console.log(`\n════════════════════════════════════════\n  SANJI RENDER CHECK (phase ${PHASE}): ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
process.exit(FAIL ? 1 : 0)
