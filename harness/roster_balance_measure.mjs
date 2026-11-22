// harness/roster_balance_measure.mjs — measures every playable fighter the SAME way in the real game (real keys, stepped
// sim): HP, walk distance in 60f, dash distance, jump apex, Light/Heavy/Special damage on a standing dummy, and Light
// startup (frames from press to first damage). Writes JSON rows. Usage:
//   OUT=rows.json node harness/roster_balance_measure.mjs [key ...]
import { chromium } from 'playwright'
import fs from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const E = (fn, a) => page.evaluate(fn, a)
let keys = process.argv.slice(2)
if (!keys.length) {
  await page.goto(server.base + '/index.html?harness=1&p1=naruto&p2=naruto&seed=3')
  await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
  keys = await E(async () => { const m = await import('./characters.js'); const C = m.characters || m.default
    return Object.keys(C).filter(k => C[k]?.isPlayable !== false && !C[k]?.hidden) })
}
const reset = (gap = 70) => E(gap => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2')
  __harness.setDummyBehavior('stand'); a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.vx = a.vy = b.vx = b.vy = 0
  for (const f of [a, b]) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0; f.hitstun = 0; f.blockstun = 0; f.invulnTimer = 0; f.isBlocking = false; f.comboCounter = 0; f.knockdownState = false; f.knockdownTimer = 0 }
  a.energy = a.maxEnergy; b.health = b.maxHealth }, gap)
const st = () => E(() => { const a = __harness.gojoShinjukuTest.raw('p1'), b = __harness.gojoShinjukuTest.raw('p2'); return { x: a.x, y: a.y, bhp: b.health } })
async function press(keysDown, hold = 2) { for (const k of keysDown) await page.keyboard.down(k); await step(hold); for (const k of keysDown) await page.keyboard.up(k) }
async function damageOf(keysDown, gap = 70) {
  let best = 0, startup = null
  for (let tr = 0; tr < 2 && !best; tr++) {
    await reset(gap); await step(20); const h0 = (await st()).bhp
    for (const k of keysDown) await page.keyboard.down(k)
    let f = 0
    for (; f < 90; f++) { await step(1); if (f === 1) for (const k of keysDown) await page.keyboard.up(k); const d = h0 - (await st()).bhp; if (d > 0 && startup == null) startup = f + 1; best = Math.max(best, d) }
  }
  return { dmg: best, startup }
}
const rows = []
for (const k of keys) {
  try {
    await page.goto(server.base + `/index.html?harness=1&p1=${k}&p2=naruto&seed=3`)
    await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
    await E(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) })
    const meta = await E(() => { const a = __harness.gojoShinjukuTest.raw('p1'); return { hp: a.maxHealth, speed: a.speed, baseSpeed: a.baseSpeed, jump: a.jump, dashSpeed: a.dashSpeed, universe: a.universe, name: a.name } })
    // walk: hold forward 60f (far from the foe)
    await reset(900); await step(10); let s0 = await st(); await page.keyboard.down('d'); await step(60); await page.keyboard.up('d'); let s1 = await st()
    const walk = Math.round(s1.x - s0.x)
    // dash: double-tap forward, measure travel over 30f
    await reset(900); await step(10); s0 = await st()
    await press(['d'], 2); await step(2); await press(['d'], 2); await step(26); s1 = await st()
    const dash = Math.round(s1.x - s0.x)
    // jump apex
    await reset(900); await step(10); s0 = await st(); let minY = s0.y; await page.keyboard.down('w'); for (let i = 0; i < 50; i++) { await step(1); if (i === 3) await page.keyboard.up('w'); minY = Math.min(minY, (await st()).y) }
    const jumpH = Math.round(s0.y - minY)
    const light = await damageOf(['j']), heavy = await damageOf(['k']), special = await damageOf(['l'], 160)
    rows.push({ key: k, ...meta, walk, dash, jumpH, light: light.dmg, lightStartup: light.startup, heavy: heavy.dmg, special: special.dmg })
    console.log(k, JSON.stringify(rows.at(-1)))
  } catch (e) { rows.push({ key: k, err: e.message.slice(0, 80) }); console.log(k, 'ERR', e.message.slice(0, 80)) }
}
fs.writeFileSync(process.env.OUT || 'roster_balance.json', JSON.stringify(rows, null, 1))
if (errs.length) console.log('PAGE ERRORS', [...new Set(errs)].slice(0, 3).join(' | '))
await browser.close(); server.close?.()
