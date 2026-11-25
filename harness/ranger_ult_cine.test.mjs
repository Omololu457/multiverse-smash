// ranger_ult_cine.test.mjs — the Demon Slayer-style pre-rolls before the Rangers' personal ultimates (rangerUltCinematics.js):
// Mighty Morphin Red / Black / Pink / Green / White (the mmpr_rangers forms) and Samurai Red / Gold / Green.
// For each: the ultimate press (and, for the hit-confirm ultimates, the opener's hit) starts the pre-roll; the world is frozen and
// no damage lands during it; when it ends the Ranger's OWN ultimate cinematic plays and deals its damage as before.
// Also writes docs/rangers/ult_cine/<kind>_cut.png + _call.png (look at them).  Run: node harness/ranger_ult_cine.test.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0
const ck = (name, cond, info = '') => { if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, info) } }

const R = await import('../rangerUltCinematics.js')
ck('A. eight Ranger pre-rolls registered', R.RANGER_ULT_PREROLLS.length === 8, R.RANGER_ULT_PREROLLS.join(','))
{ const fs = await import('node:fs'); const code = fs.readFileSync(new URL('../rangerUltCinematics.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
  ck('A. no Math.random / clock', !/Math\.random|performance\.now|Date\.now/.test(code)) }

const OUT = new URL('../docs/rangers/ult_cine/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
async function open(p1) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(`${p1}: ${e.message}`))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=luffy&seed=5`); await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 90000 })
  await page.evaluate(() => { __harness.bootSkin?.('default', 'default'); __harness.setDummyBehavior?.('stand') }); await page.evaluate(() => __harness.luffyTest.step(10))
  return page
}
const E = (page, fn, a) => page.evaluate(fn, a), step = (page, n) => E(page, n => __harness.luffyTest.step(n), n)
const st = page => E(page, async () => { const D = await import('./demonSlayerCinematics.js'); const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2')
  return { pre: D.getDemonSlayerPrerollStatus(), key: a.rosterKey, en: Math.round(a.energy || 0), ohp: b.health, ax: Math.round(a.x), bx: Math.round(b.x) } })
const prep = (page, gap) => E(page, gap => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2')
  a.energy = Math.max(a.energy || 0, a.maxEnergy || 100, 100); a.ultimateCooldown = 0; a.attackCooldown = 0; b.health = 1000; b.x = a.x + a.w + gap; b.facing = -1; a.facing = 1; b.vx = 0; b.hitstun = 0 }, gap)
const press = async (page, k, n = 2) => { await page.keyboard.down(k); await step(page, n); await page.keyboard.up(k); await step(page, 1) }
const shot = (page, name) => page.screenshot({ path: OUT + name + '.png' })

const CASES = [
  ['samurai_red_ranger', 'samurai_red_ranger', null, 40],
  ['gold_samurai_ranger', 'gold_samurai_ranger', null, 40],
  ['green_samurai_ranger', 'green_samurai_ranger', null, 40],
  ['red_ranger_mmpr', 'mmpr_rangers', 'red_ranger_mmpr', 40],
  ['mmpr_black', 'mmpr_rangers', 'mmpr_black', 10],
  ['mmpr_pink', 'mmpr_rangers', 'mmpr_pink', 220],
  ['green_ranger', 'mmpr_rangers', 'green_ranger', 140],
  ['mmpr_white', 'mmpr_rangers', 'mmpr_white', 10],
]
try {
  for (const [kind, p1, form, gap] of CASES) {
    const page = await open(p1)
    if (form && form !== 'red_ranger_mmpr') { await E(page, f => __harness.spdSquad.swap('p1', f), form); await step(page, 60) }
    await prep(page, gap); await step(page, 2)
    let s = await st(page); const hp0 = s.ohp
    ck(`${kind}: playing as it`, s.key === kind, s.key)
    await press(page, 'u')
    // wait for the pre-roll (press-started ults: at once; hit-confirm ults: when the opener connects)
    let seen = null
    for (let i = 0; i < 120 && !seen; i++) { s = await st(page); if (s.pre.active && s.pre.kind === kind) seen = s; else await step(page, 1) }
    ck(`${kind}: the pre-roll plays`, !!seen, JSON.stringify(s.pre))
    if (!seen) { await page.close(); continue }
    const hpAt = seen.ohp, x0 = [seen.ax, seen.bx]
    await step(page, 50); await shot(page, `${kind}_cut`)
    await step(page, 46); await shot(page, `${kind}_call`)
    s = await st(page)
    ck(`${kind}: frozen during the pre-roll (no damage, nobody moves)`, s.pre.active && s.ohp === hpAt && s.ax === x0[0] && s.bx === x0[1], JSON.stringify({ s, hpAt, x0 }))
    await step(page, 60); s = await st(page)
    ck(`${kind}: the pre-roll ends`, !s.pre.active || s.pre.kind !== kind, JSON.stringify(s.pre))
    await step(page, 420); s = await st(page)
    ck(`${kind}: then the Ranger's own ultimate lands (damage dealt)`, s.ohp < hpAt && s.ohp < hp0, JSON.stringify({ hp0, hpAt, now: s.ohp }))
    await page.close()
  }
} catch (e) { fail++; console.log('FAIL exception', e.message) }
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close?.()
console.log(`RANGER ULT CINE: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
