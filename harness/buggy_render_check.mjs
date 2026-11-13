// harness/buggy_render_check.mjs — Buggy the Clown RENDER CHECK (run before every Buggy commit).
//   node harness/buggy_render_check.mjs [phase]
// Boots the real game in Chromium, P1 = Buggy vs P2 = Zoro, starts a match and proves: no page error, no blank
// screen, both fighters + HUD render, every Buggy asset loads (no 404), masked body rows render. Later phases add
// scenario checks (parts, Festival, Buggy Ball, the Super, slash nullification vs Zoro). Screenshots →
// /tmp/ms-buggy-render/.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

const PHASE = Number(process.argv[2] || 99)
const OUT = '/tmp/ms-buggy-render'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }

const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname) })
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })   // drive frames manually (deterministic)

const P1 = 'buggy', P2 = 'zoro'
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const shot = name => page.screenshot({ path: path.join(OUT, name + '.png') })
const bs = (w = 'p1') => page.evaluate(w => __harness.buggyTest.state(w), w)
const ls = (w = 'p1') => page.evaluate(w => __harness.luffyTest.state(w), w)
const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
// Real keyboard motion input for P1 (a=left d=right s=down w=up, l=Special k=Heavy j=Light). null = neutral frame.
async function motion(seq, button) {
  for (const k of seq) { if (k) await page.keyboard.down(k); await step(2); if (k) await page.keyboard.up(k) }
  await tap([button])
}
const canvasStats = () => page.evaluate(() => {
  const c = document.querySelector('canvas'); const x = c.getContext('2d')
  const uniq = (sx, sy, w, h) => { const d = x.getImageData(sx, sy, w, h).data, s = new Set(); for (let i = 0; i < d.length; i += 16) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size }
  return { play: uniq(0, c.height * 0.3, c.width, c.height * 0.6), hud: uniq(0, 0, c.width, Math.round(c.height * 0.16)) }
})
const fresh = async (p2dx = 260) => {
  await page.evaluate(() => __harness.buggyTest.reset())
  await page.evaluate(dx => { __harness.buggyTest.chop('p1', 100); __harness.luffyTest.set('p2', { x: __harness.p1().x + dx }) }, p2dx)
  await step(2)
}

try {
  await page.goto(`${server.base}/index.html?harness=1&p1=${P1}&p2=${P2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.buggyTest, null, { timeout: 30000 })
  check('game boots (harness up, no page error at boot)', errors.length === 0, errors[0] || '')
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 6; i++) { await step(5); await new Promise(r => setTimeout(r, 250)) }   // let sheets decode (real time)
  const a = await ls('p1'), b = await ls('p2')
  check(`P1 spawned as ${P1}`, a?.key === P1, a?.key)
  check(`P2 spawned as ${P2}`, b?.key === P2, b?.key)
  check('both fighters alive with HP', a?.health > 0 && b?.health > 0, `${a?.health}/${b?.health}`)
  check('P1 (Buggy) sprite drawn (real draw rect)', a?.draw?.w > 20 && a?.draw?.h > 20, JSON.stringify(a?.draw))
  check('P2 sprite drawn (real draw rect)', b?.draw?.w > 20 && b?.draw?.h > 20, JSON.stringify(b?.draw))
  const cs = await canvasStats()
  check('not a blank screen (play area has many colours)', cs.play > 40, `uniq=${cs.play}`)
  check('HUD strip renders (many colours)', cs.hud > 20, `uniq=${cs.hud}`)
  await shot(`p${PHASE}-00-match`)

  const assets = await page.evaluate(async () => {
    const m = await import('./buggySprites.js')
    const urls = [...Object.values(m.BUGGY_ANIM).map(a => a.sheet), ...Object.values(m.BUGGY_FX).map(f => f.sheet).filter(Boolean),
      ...Object.values(m.BUGGY_PARTS).flatMap(p => [p.idle.sheet, p.death.sheet])]
    return Promise.all([...new Set(urls)].map(u => fetch(u).then(r => [u, r.status])))
  })
  const bad = assets.filter(([, s]) => s !== 200)
  check(`all ${assets.length} Buggy sprite/FX/part sheets load`, bad.length === 0, bad.map(x => x.join(':')).join(', '))

  if (PHASE >= 2) {
    const s = await bs()
    check('Chop meter (maxEnergy 100, energyName Chop)', s.maxEnergy === 100 && s.energyName === 'Chop', JSON.stringify({ m: s.maxEnergy, n: s.energyName }))
    check('base stats: HP 950, speed 80 (5.0 px/f walk), dashSpeed 13, jumpPower 27', s.maxHealth === 950 && s.speed === 80 && s.dashSpeed === 13 && s.jumpForce === -27,
      JSON.stringify({ hp: s.maxHealth, sp: s.speed, d: s.dashSpeed, j: s.jumpForce }))
    check('Buggy idle uses his own sheet', /assets\/buggy\/idle\.png$/.test(s.idleSheet || '') && (await ls()).spriteAction === 'idle', s.idleSheet)
    check('HUD part pips: hand / foot / head all ready', s.pips && ['hand', 'foot', 'head'].every(k => s.pips[k].st === 'ready'), JSON.stringify(s.pips))
    await page.evaluate(() => __harness.buggyTest.chop('p1', 10)); await step(120)
    const s2 = await bs()
    check('passive Chop +1.5/s (≈ +3 over 2 s)', s2.energy >= 12.5 && s2.energy <= 13.5, s2.energy)
    for (const [m, nm] of [[1, 'head'], [2, 'hand'], [4, 'foot'], [3, 'head+hand']]) {   // masked body rows (render-only)
      await page.evaluate(m => __harness.buggyTest.set('p1', { mask: m, maskLock: true }), m); await step(2)
      const sm = await bs()
      check(`masked body row ${m} (${nm}) selected`, sm.idleSourceY === m * 112, sm.idleSourceY)
      await shot(`p${PHASE}-01-mask-${m}`)
    }
    await page.evaluate(() => __harness.buggyTest.set('p1', { mask: 0, maskLock: false })); await step(2)
  }

  const other404 = [...new Set(missing.filter(m => !/buggy/i.test(m)))]
  if (other404.length) console.log(`  ℹ non-Buggy 404s (not part of this build): ${other404.slice(0, 6).join(', ')}${other404.length > 6 ? ' …' : ''}`)
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  const bMissing = missing.filter(m => /buggy/i.test(m))
  check('no Buggy 404s', bMissing.length === 0, bMissing.join(', '))
  const cs2 = await canvasStats()
  check('still not blank at the end', cs2.play > 40, `uniq=${cs2.play}`)
} catch (e) {
  check('render check ran to completion', false, e.message.split('\n')[0])
  if (errors.length) console.log('  page errors:', errors.slice(0, 4).join(' | '))
} finally {
  await browser.close(); server.close()
}
console.log(`\nBUGGY RENDER CHECK (phase ${PHASE}): ${PASS} passed, ${FAIL} failed  → screenshots in ${OUT}`)
process.exit(FAIL ? 1 : 0)
