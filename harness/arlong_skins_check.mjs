// harness/arlong_skins_check.mjs — Arlong's 14 alt skins: each is listed + applies (recoloured sheets), SURVIVES his
// own anim-set swaps (win 2, idle flex) and a round reset, the FX sheets / water theme follow the skin, the Alien X
// skin gets the engine's starfield overlay, default stays byte-identical. Screenshots each skin with a water zone +
// a Seiken shockwave in flight. 0 page errors, 0 Arlong 404s.     node harness/arlong_skins_check.mjs
import { chromium } from 'playwright'
import fs from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const OUT = '/tmp/ms-arlong-render/skins'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404 && /arlong/.test(r.url())) missing.push(r.url()) })
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const st = () => page.evaluate(() => { const f = __harness.arlongTest.raw('p1'), a = f._skinAnim || f.animationData
  return { idle: a?.idle?.sheet, win: a?.win?.sheet, tag: f._recolorTag || null, skinId: f.skinId, stars: !!f._alienXFX } })
const TAGS = ['hody', 'tiger', 'jinbe', 'reef', 'abyss', 'magma', 'frost', 'gilded', 'phantom', 'neon', 'cafe', 'ben10', 'albedo', 'alienx']
const idOf = t => t === 'alienx' ? 'arlongAlienX' : `arlong_${t}`
try {
  await page.goto(`${server.base}/index.html?harness=1&p1=arlong&p2=zoro`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.arlongTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() }); await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 }); await step(30)
  const list = await page.evaluate(async () => (await import('./skins.js')).getSkins('arlong').map(s => s.id))
  check('15 skins listed (default + 14)', list.length === 15 && list[0] === 'default' && TAGS.every(t => list.includes(idOf(t))), list.join(','))
  for (const tag of TAGS) {
    const id = idOf(tag)
    console.log(`\n── ${id} ──`)
    await page.evaluate(() => { __harness.arlongTest.reset() }); await step(2)
    const applied = await page.evaluate(i => __harness.setSkin('p1', i), id); await step(3)
    let s = await st()
    check(`applies → recoloured sheets`, applied === id && s.tag === tag && s.idle?.endsWith(`idle__${tag}.png`), `${applied} ${s.idle}`)
    // win 2 + idle flex swaps keep the skin
    await page.evaluate(() => { const f = __harness.arlongTest.raw('p1'); f._forceAction = 'win'; f._alWinVar = 2 }); await step(3); s = await st()
    check('win 2 swap keeps the skin', s.win?.endsWith(`win2__${tag}.png`), s.win)
    await page.evaluate(() => { const f = __harness.arlongTest.raw('p1'); f._forceAction = null; f._alWinVar = 0 }); await step(2)
    await page.evaluate(() => __harness.arlongTest.set('p1', { idleT: 700 })); await step(2); s = await st()
    check('idle-flex swap keeps the skin', s.idle?.endsWith(`idleFlex__${tag}.png`), s.idle)
    await page.keyboard.down('d'); await step(3); await page.keyboard.up('d'); s = await st()
    check('back from the flex → the skin\'s own idle (never default colours)', s.idle?.endsWith(`idle__${tag}.png`), s.idle)
    // water theme screenshot: two zones + a Seiken shockwave, blade planted
    await page.evaluate(() => { const t = __harness.arlongTest, a = t.raw('p1'), z = t.raw('p2'); z.x = a.x + 420; z.facing = -1; a.facing = 1; t.tide('p1', 100)
      t.zone(a.x + 24, 230); t.zone(a.x + 330, 230); t.set('p1', { blade: { st: 'planted', x: a.x + 200 } }) })
    await page.keyboard.down('s'); await step(2); await page.keyboard.down('a'); await step(2); await page.keyboard.up('s'); await step(2); await page.keyboard.up('a')
    await page.keyboard.down('l'); await step(1); await page.keyboard.up('l'); await step(30)
    if (tag === 'alienx') { s = await st(); check('Alien X: the engine\'s generic starfield overlay engages', s.skinId === 'arlongAlienX' && s.stars, JSON.stringify(s)) }
    await page.screenshot({ path: `${OUT}/${id}.png` })
    await step(40)
  }
  // round reset keeps the skin; default skin = base sheets
  await page.evaluate(async () => { const m = await import('./arlongState.js'); m.arlongRoundReset(__harness.arlongTest.raw('p1')) }); await step(2)
  let s = await st(); check('round reset keeps the skin', s.idle?.endsWith('idle__alienx.png'), s.idle)
  await page.evaluate(() => __harness.setSkin('p1', 'default')); await step(3); s = await st()
  check('default skin → base sheets', s.idle === './assets/arlong/idle.png' && !s.tag, s.idle)
} catch (e) { check('ran to completion', false, e.stack || e.message) }
check('0 Arlong 404s (every recoloured sheet exists)', missing.length === 0, missing.slice(0, 3).join(', '))
check('0 page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
console.log(`\n════════════════════════════════════════\n  ARLONG SKINS: ${PASS} passed, ${FAIL} failed   · shots → ${OUT}\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(FAIL ? 1 : 0)
