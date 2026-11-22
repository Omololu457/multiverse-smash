// harness/sasuke_portal_chidori_unlock.test.mjs — regression: Portal Chidori (Charge + Forward + Special) used to set
// `attacking = true` with no currentAttack behind it, so the engine never cleared it and Sasuke could never attack again
// for the rest of the match (movement still worked). Real keys, all three Sasukes that share sasukeDojutsu.js.
//   node harness/sasuke_portal_chidori_unlock.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
let pass = 0, fail = 0
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${c ? '' : d}`) }
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const p1 = () => page.evaluate(() => { const f = __harness.luffyTest.state('p1'); const r = __harness.gojoShinjukuTest.raw('p1')
  return { attacking: !!r.attacking, atk: r.currentAttack?.name || null, cd: r.attackCooldown || 0, x: Math.round(f.x), energy: r.energy } })
const p2hp = () => page.evaluate(() => __harness.gojoShinjukuTest.raw('p2').health)
for (const key of ['sasuke_adult', 'sasuke_sensei', 'sasuke']) {
  await page.goto(server.base + `/index.html?harness=1&p1=${key}&p2=naruto&seed=4`)
  await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
  await page.evaluate(k => { __harness.start(); __harness.skipToBattle(); __harness.setDummyBehavior('stand'); __harness.luffyTest.step(4)
    const a = __harness.gojoShinjukuTest.raw('p1'), b = __harness.gojoShinjukuTest.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
    a.energy = a.maxEnergy; if (k === 'sasuke_sensei') a._eyeSet = 'rinnegan' }, key)
  await step(20)
  const hp0 = await p2hp()
  // Charge held, then Forward + Special (the real input for Portal Chidori)
  await page.keyboard.down('p'); await step(3); await page.keyboard.down('d'); await step(1); await page.keyboard.down('l'); await step(2)
  await page.keyboard.up('l'); await page.keyboard.up('d'); await page.keyboard.up('p')
  const during = await p1()
  await step(70)
  const after = await p1(), hp1 = await p2hp()
  ck(`${key}: Portal Chidori fired (portal set, foe took damage)`, during.attacking && hp1 < hp0, JSON.stringify({ during, hp0, hp1 }))
  ck(`${key}: once its recovery is over he is no longer stuck "attacking"`, !after.attacking && after.cd === 0, JSON.stringify(after))
  await page.keyboard.down('j'); await step(2); await page.keyboard.up('j')
  let fired = null; for (let i = 0; i < 20 && !fired; i++) { await step(1); fired = (await p1()).atk }
  ck(`${key}: Light attack starts again afterwards`, !!fired, JSON.stringify(await p1()))
  await page.keyboard.down('d'); await step(20); await page.keyboard.up('d')
  ck(`${key}: still moves`, (await p1()).x !== after.x)
}
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
console.log(`\n  SASUKE PORTAL CHIDORI UNLOCK: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
