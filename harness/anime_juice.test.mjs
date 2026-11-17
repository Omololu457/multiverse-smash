// harness/anime_juice.test.mjs — the GAME-WIDE anime juice pass (animeJuice.js, presentation only): the ultimate meter
// races then crawls, then the READY ceremony (pillar + rings + slam); the special / ultimate GATHER spiral; the PARRY
// sparks + ring; GATLING rings ramping + the final ring; the SLASH cut line; AFTERMATH floor marks by element; the
// three-tone orb. Real game (Naruto vs Goku), real hook (a fresh spark through updateEffectsAndDomains).
//   node harness/anime_juice.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const J = o => JSON.stringify(o)
fs.mkdirSync('docs/anime_juice', { recursive: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
await page.goto(server.base + '/index.html?harness=1&p1=naruto&p2=goku&seed=4242', { waitUntil: 'load' })
await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
await page.evaluate(async () => {
  window.requestAnimationFrame = () => 0   // freeze the live loop: each step() = exactly one frame (and one render)
  const AJ = await import('./animeJuice.js'); const { writeRawControls } = await import('./input.js')
  const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
  window.__A = { AJ, H, step, writeRawControls, st: () => AJ.animeJuiceStatus(),
    setup: () => { H.reset(); __harness.setDummyBehavior?.('stand'); const a = H.raw(), b = H.raw('p2'); a.x = 900; b.x = 1060; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.energy = 0; f.health = f.maxHealth; f.ultimateCooldown = 0 } writeRawControls(a, {}); step(3); AJ.animeJuiceReset(); return { a, b } } }
})
const shot = name => page.screenshot({ path: `docs/anime_juice/${name}.png` })

// ═══ U. ULTIMATE READY ═══
const U = await page.evaluate(() => { const { AJ, step, setup, st } = __A; const { a } = setup()
  const cost = a.maxEnergy || 100; step(2); a.energy = cost; const seen = { filling: 0, pillarAt: -1 }, disp = []
  for (let i = 0; i < 70; i++) { step(1); const s = st(); if (s.ready[0]?.state === 'filling') seen.filling++; if (seen.pillarAt < 0 && s.kinds.includes('pillar')) seen.pillarAt = i; if (i % 6 === 0) disp.push(+AJ.animeMeterRatio(a, a.energy / (a.maxEnergy || 100), -1).toFixed(3)) }
  return { cost, ...seen, slams: st().slams, disp } })
ok('U1 meter full → the bar crawls in (≥ 5 frames "filling") before the READY ceremony fires: pillar + "ULTIMATE READY"', U.filling >= 5 && U.pillarAt >= 5 && U.slams >= 1, J(U))
await page.evaluate(() => { const { step, setup } = __A; const { a } = setup(); a.energy = a.maxEnergy || 100; let k = 0; while (!__A.st().kinds.includes('pillar') && k++ < 80) step(1); step(4) })
await shot('ultimate_ready')

// ═══ G. GATHER (a special starting) ═══
const G = await page.evaluate(() => { const { step, setup, st, writeRawControls } = __A; const { a } = setup(); a.energy = 100
  writeRawControls(a, { special: true }); step(1); writeRawControls(a, {}); let got = false, mv = null; for (let i = 0; i < 10; i++) { step(1); if (st().kinds.includes('gather')) { got = true; mv = a.currentMove; break } } return { got, mv } })
ok('G1 a special starting = the GATHER spiral at his hand', G.got, J(G))
await page.evaluate(() => __A.step(5)); await shot('gather_special')
await page.evaluate(() => { const { AJ, step, setup } = __A; const { a } = setup(); AJ.__animeJuiceTest.S.fx.push({ kind: 'gather', side: 0, t: 0, life: 30, ult: true, col: [255, 225, 150], seed: 7 }); step(16) })
await shot('gather_ultimate_stages')

// ═══ P. PARRY ═══
const P = await page.evaluate(() => { const { AJ, step, setup, st } = __A; const { a, b } = setup(); AJ.__animeJuiceTest.parryFx(1010, 300, true, 100); step(1); const z = st().kinds.includes('parry'); return { z } })
ok('P1 a perfect parry = sparks + ring of light + ting / clang (a parry fx event)', P.z, J(P))
await page.evaluate(() => __A.step(4)); await shot('parry')

// ═══ B. GATLING + S. SLASH + A. AFTERMATH (fresh sparks through the real hook) ═══
const B = await page.evaluate(() => { const { AJ, step, setup, st } = __A; const { a, b } = setup(); const r = {}
  const sp = (o) => ({ x: b.x + 20, y: b.y + 40, category: 'light', damage: 10, moveName: 'barrage', attackerSide: 'p1', blocked: false, ...o })
  for (let i = 0; i < 6; i++) { AJ.animeJuiceOnSpark(sp(), a, b, 1000 + i * 4); }
  r.rings = st().kinds.filter(k => k === 'ring').length
  AJ.animeJuiceTick(a, b, 1100); r.final = st().kinds.filter(k => k === 'ring').length > r.rings
  AJ.animeJuiceReset(); AJ.animeJuiceOnSpark(sp({ category: 'special', damage: 80, moveName: 'getsuga_slash' }), a, b, 2000)
  r.cut = st().kinds.includes('cut'); r.scar = st().decalKinds.includes('scar')
  AJ.animeJuiceReset(); AJ.animeJuiceOnSpark(sp({ category: 'ultimate', damage: 200, moveName: 'ultimate' }), a, b, 3000); r.ult = st().decalKinds
  AJ.animeJuiceReset(); AJ.animeJuiceOnSpark(sp({ category: 'light', damage: 10, moveName: 'jab' }), a, b, 4000); r.light = st().decalKinds.length + st().kinds.length
  return r })
ok('B1 gatling: every repeat hit pops a ring (5 rings for 6 hits) and the string\'s end adds the big final ring', B.rings === 5 && B.final, J(B))
ok('S1 a slash hit = a glowing cut line across the target + a cooling scar on the floor', B.cut && B.scar, J(B))
ok('A1 an ultimate hit marks the floor (aftermath decal); a plain jab leaves nothing', B.ult.length === 1 && B.light === 0, J(B))
for (const [mv, name] of [['getsuga_slash', 'aftermath_scar'], ['ultimate', 'aftermath_crater']]) {
  await page.evaluate(mv => { const { AJ, step, setup } = __A; const { a, b } = setup(); AJ.animeJuiceOnSpark({ x: b.x + 20, y: b.y + 40, category: mv === 'ultimate' ? 'ultimate' : 'special', damage: 120, moveName: mv, attackerSide: 'p1', blocked: false }, a, b, 5000); step(mv === 'ultimate' ? 30 : 3) }, mv)
  await shot(name)
}

// ═══ H. Hit Effects OFF = nothing ═══
const OFF = await page.evaluate(async () => { const { juiceSettings } = await import('./juiceSettings.js'); const { AJ, setup, st } = __A; const { a, b } = setup(); const prev = juiceSettings.hitEffects; juiceSettings.hitEffects = 'off'
  AJ.animeJuiceOnSpark({ x: 1000, y: 300, category: 'ultimate', damage: 200, moveName: 'ultimate', attackerSide: 'p1' }, a, b, 6000); const n = st().decalKinds.length + st().kinds.length; juiceSettings.hitEffects = prev; return n })
ok('H1 Hit Effects OFF → no anime juice at all', OFF === 0, String(OFF))
ok('R no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close()
console.log(`\n  ANIME JUICE: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
