// harness/buggy_combos.test.mjs — Buggy the Clown COMBOS (brief Phase 6), driven through the REAL keyboard in
// the real game (P1 = Buggy vs a standing Zoro). Each combo is input step by step; the next input is pressed as
// soon as the previous hit has connected (contact polling), like a player confirming on hit.
// Proves: every hit of each route lands, the combo counter carries through, damage decays at 85% per hit, and
// the counter resets after 1.5 s (90 f) idle.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
const BUGGY_BOOST = ROSTER_DAMAGE_BOOST.buggy || 1   // roster-parity pass (2026-11-13): applyScaledDamage multiplies Buggy's damage by this

let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }
const server = await serve()
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })

const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const total = () => page.evaluate(() => { const z = __harness.buggyTest.raw('p2'); return z.maxHealth - z.health })
const st = () => page.evaluate(() => { const b = __harness.buggyTest.raw('p1'), z = __harness.buggyTest.raw('p2')
  return { combo: b.comboCounter || 0, move: b.currentMove || null, hit: !!b.currentAttack?.hasHit, zhp: z.health, zstun: z.hitstun || 0, parts: __harness.buggyTest.state('p1').parts } })
async function keys(ks, frames = 1) { for (const k of ks) await page.keyboard.down(k); await step(frames); for (const k of ks) await page.keyboard.up(k) }
async function motion(seq) { let held = []; for (const k of seq) { const want = k == null ? [] : [].concat(k)
  for (const x of held) if (!want.includes(x)) await page.keyboard.up(x)
  for (const x of want) if (!held.includes(x)) await page.keyboard.down(x)
  held = want; await step(2) } for (const x of held) await page.keyboard.up(x) }
// wait until the foe's HP drops (a hit landed) — returns the damage, or 0 on timeout
async function waitHit(maxF = 60) { const h0 = (await st()).zhp; for (let i = 0; i < maxF; i++) { await step(1); const s = await st(); if (s.zhp < h0) return h0 - s.zhp } return 0 }
async function fresh(dx = 64) {
  await page.evaluate(dx => { __harness.buggyTest.reset(); __harness.buggyTest.chop('p1', 100)
    const b = __harness.buggyTest.raw('p1'), z = __harness.buggyTest.raw('p2'); z.x = b.x + dx; z.health = z.maxHealth; b.comboCounter = 0; b.comboTimer = 0 }, dx)
  await step(30)
}

try {
  await page.goto(`${server.base}/index.html?harness=1&p1=buggy&p2=zoro`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.buggyTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  await step(60)

  // 1 — Jab → Knife slash → Heavy carve → Knife Fan
  await fresh(56)
  const d1 = []
  await keys(['j']); d1.push(await waitHit(20))
  await keys(['j']); d1.push(await waitHit(24))
  await keys(['k']); d1.push(await waitHit(30))
  await keys(['l']); d1.push(await waitHit(40))
  let s = await st()
  console.log(`  route 1: total ${await total()} dmg, combo ${(await st()).combo}`)
  check('1 · Jab → Knife slash → Heavy carve → Knife Fan: all 4 land', d1.every(x => x > 0), JSON.stringify(d1))
  check('1 · combo counter carries (≥ 4)', s.combo >= 4, s.combo)
  check('1 · 85% scaling: the 2nd hit is scaled vs its raw value', d1[1] > 0 && d1[1] <= Math.ceil(60 * 0.6 * 0.85 * BUGGY_BOOST) + 1, `slash ${d1[1]} ≤ ${Math.ceil(60 * 0.6 * 0.85 * BUGGY_BOOST) + 1}`)

  // 2 — Low knife → Clown kick → Cannon → stab
  await fresh(56)
  const d2 = []
  await keys(['s', 'j']); d2.push(await waitHit(20))
  await keys(['s', 'k']); d2.push(await waitHit(24))
  await page.keyboard.down('d'); await keys(['l']); await page.keyboard.up('d'); d2.push(await waitHit(40))
  for (let i = 0; i < 80; i++) { await step(1); if ((await st()).parts.some(p => p.st === 'hover')) break }
  await keys(['l']); d2.push(await waitHit(60))
  s = await st()
  console.log(`  route 2: total ${await total()} dmg, combo ${(await st()).combo}`)
  check('2 · Low → Kick → Cannon → Stab: all 4 land', d2.every(x => x > 0), JSON.stringify(d2))
  check('2 · combo counter carries (≥ 4)', s.combo >= 4, s.combo)

  // 3 — Cannon parked behind → Knife Fan → stab from behind (pincer)
  await fresh(200)
  const d3 = []
  await motion(['s', ['s', 'd'], 'd']); await keys(['l']); d3.push(await waitHit(50))
  for (let i = 0; i < 80; i++) { await step(1); if ((await st()).parts.some(p => p.st === 'hover')) break }
  const behind = await page.evaluate(() => { const h = __harness.buggyTest.state('p1').parts.find(p => p.type === 'buggy_hand'), z = __harness.buggyTest.raw('p2'); return h && h.x > z.x + z.w })
  await motion(['d', null, 'd']); await keys(['l']); const fan = await waitHit(40)   // →→A = Knife Fan (front)
  await keys(['l']); const stab = await waitHit(60)                                   // A = STAB (from behind)
  s = await st()
  console.log(`  route 3: total ${await total()} dmg, combo ${(await st()).combo}`)
  check('3 · Cannon passes through and PARKS BEHIND the foe', behind)
  check('3 · pincer: stab from behind + Knife Fan from the front both land', d3[0] > 0 && stab > 0 && fan > 0, JSON.stringify({ cannon: d3[0], stab, fan }))

  // 4 — Buggy Ball → dash → Acrobatic kick → Festival
  await fresh(250)
  const d4 = []
  await motion(['s', ['s', 'a'], 'a']); await page.keyboard.down('d'); await keys(['l']); await page.keyboard.up('d')   // forward held = longer arc
  const wasBall = (await st()).move === 'bBall'
  d4.push(await waitHit(70))
  await keys(['d']); await step(3); await page.keyboard.down('d')   // double-tap → dash / run, held until in range
  for (let i = 0; i < 40; i++) { await step(1); const g = await page.evaluate(() => { const b = __harness.buggyTest.raw('p1'), z = __harness.buggyTest.raw('p2'); return Math.abs(z.x - b.x) }); if (g < 100) break }
  await page.keyboard.up('d')
  await keys(['i']); d4.push(await waitHit(24))
  // The Acrobatic kick launches ~380 px: the Festival is set under the falling foe and catches the landing
  // (the field lasts 4 s), so wait for it — this is a field catch, not a true hitstun combo (COMBOS.md).
  await motion(['s', null, 's']); await keys(['l']); d4.push(await waitHit(110))
  s = await st()
  console.log(`  route 4: total ${await total()} dmg, combo ${(await st()).combo}`)
  check('4 · Ball → dash → Acrobatic kick → Festival: all land', d4.every(x => x > 0), JSON.stringify(d4))
  check('4 · combo counter carries (≥ 3)', s.combo >= 3, s.combo)
  check('4 · 214 + held → is still the Buggy Ball (not the →+A Cannon fallback)', wasBall)

  // 5 — Nullify a slash → Heavy carve → SUPER
  await fresh(56)
  const nul = await page.evaluate(async () => { const cb = await import('./combat.js'), zd = await import('./zoroData.js'); const z = __harness.buggyTest.raw('p2'), b = __harness.buggyTest.raw('p1')
    z.facing = -1; z.attacking = false; z.attackCooldown = 0; return cb.startMove(z, 'light', zd.ZORO_MOVES.light) })
  let nulled = false; for (let i = 0; i < 20; i++) { await step(1); if ((await page.evaluate(() => __harness.buggyTest.state('p1').b.nullTotal)) > 0) { nulled = true; break } }
  for (let i = 0; i < 6; i++) await step(1)
  const d5 = []
  await keys(['k']); d5.push(await waitHit(30))
  await page.evaluate(() => __harness.buggyTest.chop('p1', 100))
  await motion(['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd']); await keys(['l'])
  let superDmg = 0; const hs = (await st()).zhp
  for (let i = 0; i < 150; i++) { await step(1); const q = await st(); if (!q.move && i > 30) break }
  superDmg = hs - (await st()).zhp
  console.log(`  route 5: total ${await total()} dmg, combo ${(await st()).combo}`)
  check('5 · Zoro\'s slash nullified, then Carve → SUPER', nul && nulled && d5[0] > 0 && superDmg > 0, JSON.stringify({ nulled, carve: d5[0], superDmg }))

  // Neutral SUPER on a standing foe: 4 balls × 55 + 3 stabs × 20 + rush 90 = 370 designed; delivered through the
  // roster-wide GLOBAL_DAMAGE_SCALE 0.60 with the Super's scaling LOCKED at its start (its own hits don't decay it).
  await fresh(120)
  await motion(['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd']); await keys(['l'])
  for (let i = 0; i < 150; i++) { await step(1); const q = await st(); if (!q.move && i > 30) break }
  const neutralSuper = await total()
  console.log(`  neutral Super: ${neutralSuper} dmg (370 designed × 0.60 = 222)`)
  check('SUPER from neutral lands its full designed total (370 × 0.60 global = 222, × roster boost)', neutralSuper >= Math.floor(210 * BUGGY_BOOST) && neutralSuper <= Math.ceil(222 * BUGGY_BOOST), neutralSuper)

  // combo counter resets after 1.5 s idle
  await fresh(56); await keys(['j']); await waitHit(20)
  const c1 = (await st()).combo; for (let i = 0; i < 95; i++) await step(1)
  const c2 = (await st()).combo
  check('combo counter resets after 1.5 s (90 f) idle', c1 >= 1 && c2 === 0, `${c1} → ${c2}`)
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
} catch (e) {
  check('combos test ran to completion', false, e.message.split('\n')[0])
} finally { await browser.close(); server.close() }
console.log(`\nBUGGY COMBOS: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
