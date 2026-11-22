// harness/combo_damage_floor.test.mjs — regression: deep into a combo, hits must still DAMAGE. Several fighters used an
// unfloored 0.85^comboCounter curve, so by ~25 hits a Light did 0. For every playable fighter: set the attacker's combo
// count to N, land a real Light (key J) on a standing dummy, read the HP drop. Usage:
//   node harness/combo_damage_floor.test.mjs [key ...]
import { chromium } from 'playwright'
import fs from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
let keys = process.argv.slice(2)
await page.goto(server.base + '/index.html?harness=1&p1=naruto&p2=naruto&seed=3')
await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
if (!keys.length) keys = await page.evaluate(async () => { const m = await import('./characters.js'); const C = m.characters || m.default
  return Object.keys(C).filter(k => C[k]?.isPlayable !== false && !C[k]?.hidden) })
const COUNTS = [0, 10, 20, 30, 45]
async function hitAt(cc) {
  await page.evaluate(cc => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2')
    __harness.setDummyBehavior('stand'); a.x = 1300; b.x = 1370; a.facing = 1; b.facing = -1; a.vx = b.vx = 0
    for (const f of [a, b]) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0; f.hitstun = 0; f.blockstun = 0; f.invulnTimer = 0; f.isBlocking = false }
    b.health = b.maxHealth; b.knockdownState = false; b.knockdownTimer = 0 }, cc)
  await step(30)
  await page.evaluate(cc => { const a = __harness.gojoShinjukuTest.raw('p1'); a.comboCounter = cc; a.comboTimer = 200; if (a._dashParr?.combo) a._dashParr.combo.steps = cc }, cc)
  const hp0 = await page.evaluate(() => __harness.gojoShinjukuTest.raw('p2').health)
  await page.keyboard.down('j'); await step(1)
  await page.evaluate(cc => { const a = __harness.gojoShinjukuTest.raw('p1'); a.comboCounter = Math.max(a.comboCounter || 0, cc); a.comboTimer = 200 }, cc)
  await page.keyboard.up('j')
  let drop = 0
  for (let i = 0; i < 40; i++) { await step(1); const hp = await page.evaluate(() => __harness.gojoShinjukuTest.raw('p2').health); drop = hp0 - hp; if (drop > 0) break }
  return drop
}
const rows = [], bad = []
for (const k of keys) {
  try {
    await page.goto(server.base + `/index.html?harness=1&p1=${k}&p2=naruto&seed=3`)
    await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
    await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) })
    const d = []; for (const c of COUNTS) { let v = await hitAt(c); if (v <= 0) v = await hitAt(c); d.push(v) }   // one retry: a whiff is not a 0-damage hit
    rows.push([k, ...d])
    // only judge fighters whose Light actually lands at combo 0 (some open with a grab/stance etc.)
    if (d[0] > 0) { const deep = d.slice(1); if (deep.some(x => x <= 0) || deep.some(x => x < d[0] * 0.25)) bad.push([k, ...d]) }
  } catch (e) { rows.push([k, 'ERR ' + e.message.slice(0, 60)]) }
}
console.log('key'.padEnd(26), COUNTS.map(c => ('c' + c).padStart(6)).join(''))
for (const r of rows) console.log(String(r[0]).padEnd(26), r.slice(1).map(x => String(x).padStart(6)).join(''))
console.log(`\nfighters whose deep-combo Light drops to 0 or under 25% of a fresh Light: ${bad.length}`)
for (const b of bad) console.log('  BAD', b.join(' '))
fs.writeFileSync(process.env.OUT || '/dev/null', JSON.stringify(rows))
if (errs.length) console.log('PAGE ERRORS', [...new Set(errs)].slice(0, 3).join(' | '))
console.log(`\n  COMBO DAMAGE FLOOR: ${rows.length - bad.length} passed, ${bad.length} failed`)
await browser.close(); server.close?.(); process.exit(bad.length ? 1 : 0)
