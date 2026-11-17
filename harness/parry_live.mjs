// harness/parry_live.mjs — anime-juice Phase 1 PARRY GAMEPLAY in the REAL game (Naruto vs Goku): the TELL glint before
// a heavy, a late fresh guard = a PERFECT parry (freeze, push + stagger, slow-mo armed, bloom), then the ×1.2 COUNTER.
//   node harness/parry_live.mjs   → screenshots in docs/anime_juice/parry/
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.slice(0, 300)) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const J = o => JSON.stringify(o)
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
await page.goto(server.base + '/index.html?harness=1&p1=naruto&p2=goku&seed=4242', { waitUntil: 'load' })
await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
await page.evaluate(async () => {
  window.requestAnimationFrame = () => 0
  const AJ = await import('./animeJuice.js'); const { writeRawControls } = await import('./input.js'); const C = await import('./combat.js')
  const { juiceSettings } = await import('./juiceSettings.js'); juiceSettings.slowMo = true
  const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
  const guard = (on, who = 'p2') => (__harness.setForceGuard || __harness.juice?.setForceGuard)(on, who)
  window.__A = { AJ, C, H, step, guard, writeRawControls, st: () => AJ.animeJuiceStatus(),
    setup: () => { H.reset(); __harness.setDummyBehavior?.('stand'); guard(false); const a = H.raw(), b = H.raw('p2'); a.x = 900; b.x = 990; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.energy = 0; f.health = f.maxHealth } writeRawControls(a, {}); writeRawControls(b, {}); step(3); AJ.animeJuiceReset(); return { a, b } } }
})
const shot = name => page.screenshot({ path: `docs/anime_juice/parry/${name}.png` })

// 1. the TELL
const T = await page.evaluate(() => { const { AJ, step, setup, writeRawControls } = __A; const { a } = setup()
  writeRawControls(a, { heavy: true }); step(1); writeRawControls(a, {})
  let k = 0; while (AJ.attackTell(a) < 0 && k++ < 40) step(1)
  return { tell: AJ.attackTell(a), cat: a.currentAttack?.category, special: !!a.currentAttack?.isSpecial, move: a.currentMove, k } })
ok('T1 a heavy shows the glint TELL before it goes active', T.tell >= 0, J(T))
await page.evaluate(() => __A.step(2)); await shot('1_tell')

// 2. PERFECT parry in the real loop
const P = await page.evaluate(() => { const { AJ, C, step, setup, guard, writeRawControls } = __A; const { a, b } = setup()
  writeRawControls(a, { heavy: true }); step(1); writeRawControls(a, {})
  let k = 0; while (k++ < 40) { const ca = a.currentAttack; if (!ca) break; const toA = ca.activeStart - (ca.total - ca.timer); if (toA <= 1) break; step(1) }
  guard(true, 'p2'); const r = { hp0: b.health }
  for (let i = 0; i < 4 && !b._lastBlockFlawless; i++) step(1)
  r.flawless = !!b._lastBlockFlawless; r.perfect = !!b._lastParryPerfect; r.counter = b._parryCounter || 0; r.chip = r.hp0 - b.health
  step(1); r.slowmo = __harness.juice?.slowmoState?.() || null
  r.parryFx = AJ.animeJuiceStatus().kinds.filter(x => x === 'parry' || x === 'ring').length
  step(2); r.atkHitstun = a.hitstun; r.atkOpen = a._parryOpen || 0; r.atkAttack = !!a.currentAttack; const x0 = a.x; step(30); r.pushed = x0 - a.x; r.dx = b.x - a.x
  return r })
ok('P1 late fresh guard on a heavy = a flawless PERFECT parry, no chip', P.flawless && P.perfect && P.chip === 0, J(P))
ok('P2 parry fx (sparks + bloom ring) spawned', P.parryFx >= 2, J(P))
ok('P3 slow-mo armed by the perfect parry', !!(P.slowmo && (P.slowmo.timer > 0 || P.slowmo.cooldown > 0)), J(P.slowmo))
ok('P4 attacker staggered open (attack cancelled)', !P.atkAttack && (P.atkHitstun > 0 || P.atkOpen > 0), J(P))
ok('P5 defender holds the counter window', P.counter > 0, J(P))
ok('P6 attacker knocked back after the freeze', P.pushed > 8, J(P))
await page.evaluate(() => { const { step, setup, guard, writeRawControls } = __A; const { a, b } = setup()
  writeRawControls(a, { heavy: true }); step(1); writeRawControls(a, {}); let k = 0; while (k++ < 40) { const ca = a.currentAttack; if (!ca) break; if (ca.activeStart - (ca.total - ca.timer) <= 1) break; step(1) }
  guard(true, 'p2'); step(3) })
await shot('2_perfect_parry')

// 3. the COUNTER
const K = await page.evaluate(() => { const { AJ, C, step, guard } = __A; const a = __A.H.raw(), b = __A.H.raw('p2')
  step(4); guard(false, 'p2'); const hp0 = a.health; b.x = a.x + 80   // close the gap the push opened
  C.startMove(b, 'light', b.basic_attacks?.light)   // p2 is the training dummy (no raw input path) → start its light directly
  let got = false; for (let i = 0; i < 20; i++) { step(1); if (AJ.animeJuiceStatus().kinds.includes('counter')) { got = true; break } }
  return { got, dealt: hp0 - a.health, left: b._parryCounter || 0 } })
ok('K1 the defender\'s next clean hit = COUNTER (×1.2, slammed)', K.got && K.dealt > 0, J(K))
await page.evaluate(() => __A.step(3)); await shot('3_counter')
ok('R no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close()
console.log(`\n  PARRY LIVE: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
