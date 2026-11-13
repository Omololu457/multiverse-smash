// harness/zoro_presentation.test.mjs — Roronoa Zoro phase 6: INTRO (Going Merry flash → walk in → draw one sword),
// idle NAP pose after 10 s, WIN 1 / WIN 2 (three-sword, when he wins in Santoryu), LOSE (tied to the post).
//   node harness/zoro_presentation.test.mjs        screenshots → /tmp/ms-zoro-render/p6-*.png
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

const OUT = '/tmp/ms-zoro-render'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const ev = (fn, a) => page.evaluate(fn, a)
const step = n => ev(n => __harness.luffyTest.step(n), n)
const raw = (w = 'p1') => ev(w => { const f = __harness.zoroTest.raw(w); return { x: f.x, home: f._introHomeX, intro: !!f._introPlaying, rev: f._introRevealFrame || 0, force: f._forceAction || null, act: f.spriteHandler?.currentAction, win: (f._skinAnim || f.animationData)?.win?.sheet, lose: f.animationData?.lose?.sheet, hp: f.health } }, w)
const settle = async () => { for (let i = 0; i < 3; i++) await new Promise(r => setTimeout(r, 150)) }
// Each match on a FRESH page: starting a new match from the victory screen keeps the previous round tally.
async function fresh(opts) {
  await page.goto(server.base + '/index.html?harness=1&p1=zoro&p2=luffy', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.zoroTest)
  await ev(o => { __harness.start(o); __harness.skipToBattle() }, opts); await step(5)
}
async function until(pred, max = 400) { for (let i = 0; i < max; i++) { if (await pred()) return i; await step(1) } return -1 }

try {
  await page.goto(server.base + '/index.html?harness=1&p1=zoro&p2=luffy', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.zoroTest)

  console.log('\n── INTRO ──')
  await ev(() => __harness.start())
  await until(async () => (await raw()).intro, 120)
  let a = await raw()
  check('P1 Zoro intro starts 220px behind his battle spot (walk-in)', a.home != null && Math.abs((a.home - a.x) - 220) < 1, JSON.stringify(a))
  await step(4); await settle(); await page.screenshot({ path: `${OUT}/p6-00-intro-merry.png` })
  const xs = []
  for (let i = 0; i < 70; i += 10) { xs.push(Math.round((await raw()).x)); await step(10) }
  check('walks in toward home (x increases monotonically)', xs.every((x, i) => i === 0 || x >= xs[i - 1]) && xs[xs.length - 1] > xs[0], xs.join(' → '))
  check('intro plays the R1 walk strip', ['intro', 'transform'].includes((await raw()).act) || (await raw()).act === 'zIntroDraw', (await raw()).act)
  await until(async () => (await raw()).act === 'zIntroDraw', 60)
  a = await raw(); await settle(); await page.screenshot({ path: `${OUT}/p6-01-intro-draw.png` })
  check('…then draws one sword (R3F1 zIntroDraw) at home', a.act === 'zIntroDraw' && Math.abs(a.x - a.home) < 1.5, `${a.act} x=${Math.round(a.x)} home=${Math.round(a.home)}`)
  await until(async () => !(await raw()).intro, 200)
  a = await raw(); check('intro ends at the battle spot', a.home == null, JSON.stringify(a))

  console.log('\n── idle NAP pose ──')
  await ev(() => { __harness.start(); __harness.skipToBattle() }); await step(5)
  await step(605)
  a = await raw(); check('idle > 10 s → NAP pose (kneeling R9F2)', a.force === 'nap' && a.act === 'nap', `${a.force} ${a.act}`)
  await settle(); await page.screenshot({ path: `${OUT}/p6-02-nap-idle.png` })
  await page.keyboard.down('d'); await step(3); await page.keyboard.up('d')
  a = await raw(); check('any input wakes him', a.force !== 'nap', `${a.force} ${a.act}`)

  console.log('\n── WIN / LOSE ──')
  for (const santo of [false, true]) {
    await fresh({ mode: 'vs', difficulty: 'easy' })
    // KO the CPU every round until the MATCH is decided (win poses are struck at match end, not round end).
    let ok = -1
    for (let i = 0; i < 5000 && ok < 0; i++) {
      const st = await ev(() => { const f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2'); return { gs: __harness.state().gameState, oh: o.health, att: f.attacking, force: f._forceAction } })
      if (st.force === 'win') { ok = i; break }
      if (st.gs === 'battle' && st.oh > 0 && !st.att) {
        if (santo && !(await ev(() => __harness.zoroTest.state('p1').santoryu))) {   // (re-)enter the stance this round
          await ev(() => { __harness.zoroTest.spirit('p1', 100); __harness.zoroTest.set('p1', { santoryuCd: 0 }) })
          await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k'); await step(24)
          continue
        }
        // KO the CPU (the win pose depends on WHO won and Zoro's stance, not on how the KO landed; a CPU that
        // blocks would only make a scripted jab flaky). The match's normal round/victory flow does the rest.
        await ev(() => { __harness.zoroTest.raw('p1').health = __harness.zoroTest.raw('p1').maxHealth; __harness.zoroTest.raw('p2').health = 0 })
        await step(1)
      } else await step(1)
    }
    a = await raw()
    const want = santo ? /win2\.png$/ : /\/win\.png$/
    check(santo ? 'WIN 2 (three-sword pose) after a Santoryu win' : 'WIN 1 (sheathed standing pair, R2)', ok >= 0 && want.test(a.win || ''), `${a.force} ${a.win}`)
    await settle(); await page.screenshot({ path: `${OUT}/p6-0${santo ? 4 : 3}-win${santo ? 2 : 1}.png` })
  }
  await fresh({ mode: 'vs', difficulty: 'easy' })
  let lost = -1   // Zoro is KO'd every round until he loses the match
  for (let i = 0; i < 5000 && lost < 0; i++) {
    const st = await ev(() => { const f = __harness.zoroTest.raw('p1'); return { gs: __harness.state().gameState, h: f.health, force: f._forceAction } })
    if (st.force === 'lose') { lost = i; break }
    if (st.gs === 'battle' && st.h > 0) await ev(() => { __harness.zoroTest.raw('p1').health = 0 })
    await step(1)
  }
  a = await raw(); check('LOSE: tied to the Shells Town post (R9F1)', lost >= 0 && /lose\.png$/.test(a.lose || '') && a.act === 'lose', `${a.force} ${a.act}`)
  await settle(); await page.screenshot({ path: `${OUT}/p6-05-lose.png` })
} catch (e) {
  check('presentation test ran to completion', false, e.message.split('\n')[0])
} finally {
  if (errors.length) console.log('  page errors:', errors.slice(0, 3).join(' | '))
  check('no page errors', errors.length === 0)
  await browser.close(); server.close()
}
console.log(`\nZORO PRESENTATION: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
