// harness/zoro_matchups.test.mjs — Roronoa Zoro phase 9: mechanical claims behind docs/zoro/BALANCE_NOTES.md.
//   * Conqueror's Haki cancels Superman's SUSTAINED Heat Vision (driven through Superman's REAL
//     abilities.applySupermanHeatVision with Special held) and his in-flight beam PROJECTILES.
//   * vs Luffy: reach (Luffy's Stretch Piston 230px) vs damage (Zoro's Heavy 90 raw vs Luffy's 58).
//   * "not broken": Zoro is the slowest dasher on the roster band, Santoryu has a cooldown, NAP leaves him open.
//     node harness/zoro_matchups.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }

const { characters } = await import('../characters.js')
const { ZORO_MOVES } = await import('../zoroData.js')
const { LUFFY_MOVES } = await import('../luffyData.js')
console.log('\n── data claims ──')
check('vs Luffy: Luffy out-reaches (Piston 230px vs Zoro\'s longest normal)', LUFFY_MOVES.lfPiston.rangeX > Math.max(...['light', 'zSlash', 'heavy', 'zLow'].map(k => ZORO_MOVES[k].rangeX)))
check('vs Luffy: Zoro out-damages (Heavy 90 raw vs Luffy Heavy 58)', ZORO_MOVES.heavy.damage > LUFFY_MOVES.heavy.damage)
const speeds = Object.values(characters).filter(c => c?.stats?.speed && !c.hidden).map(c => c.stats.speed)
check('slow: Zoro walk speed (80) is in the bottom quarter of the roster', characters.zoro.stats.speed <= speeds.sort((a, b) => a - b)[Math.floor(speeds.length / 4)], `roster p25 = ${speeds[Math.floor(speeds.length / 4)]}`)
check('slow: run = the engine\'s slowest dash (dashSpeed 14 → 8 px/f floor)', Math.max(8, Math.min(16, characters.zoro.stats.dashSpeed * 0.55)) === 8)
check('Spirit-gated: every special costs Spirit except NAP', Object.entries(ZORO_MOVES).filter(([k, m]) => m.isSpecial && !['zShishiStrike'].includes(k)).every(([, m]) => m.cost > 0))

const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
try {
  await page.goto(server.base + '/index.html?harness=1&p1=zoro&p2=superman', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.zoroTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() }); await step(5)
  console.log("\n── vs Superman: Conqueror's Haki cancels beams ──")
  // Superman's sustained beam with Special HELD, through his real per-frame function.
  const beam = () => page.evaluate(async () => {
    const ab = await import('./abilities.js'), f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2')
    ab.applySupermanHeatVision(o, { special: true }, { getOpponent: () => f })
    return { beam: !!o._supHvBeam, hold: !!o._supHvHold, zhp: f.health }
  })
  await page.evaluate(() => { const f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2'); o.x = f.x + f.w + 220; o.energy = o.maxEnergy; o._supHvHold = { t: 99 } })
  let r = await beam(), hp0 = r.zhp
  for (let i = 0; i < 24; i++) r = await beam()
  check('Superman\'s held Heat Vision is live and burning Zoro', r.beam && r.hold && r.zhp < hp0, JSON.stringify(r))
  // a beam PROJECTILE in flight too
  await page.evaluate(async () => { const ab = await import('./abilities.js'), o = __harness.zoroTest.raw('p2'); ab.spawnProjectile(o, 'superman_heatvision', { drawKind: 'heatvision', damage: 52, speed: 0, lifetime: 200, w: 46, h: 14, radius: 16, spawnX: o.x - 60, spawnY: o.y + 30 }) })
  const enemyProj = () => page.evaluate(() => __harness.zoroTest.state('p2').projectiles.length)
  check('…and a heat-vision projectile is in flight', (await enemyProj()) >= 1)
  await page.evaluate(() => { __harness.zoroTest.raw('p1').health = 240 })   // under 25% → Haki fires
  await step(1)
  check('Haki fired', (await page.evaluate(() => __harness.zoroTest.state('p1').z.hakiUsed)))
  check('Haki cancelled the in-flight beam projectile', (await enemyProj()) === 0)
  for (let i = 0; i < 20; i++) r = await beam()
  check('Haki dropped the sustained beam: Special STILL held, no beam until a fresh press', !r.beam && !r.hold, JSON.stringify(r))
  check('Haki stunned Superman (1 s)', (await page.evaluate(() => __harness.zoroTest.raw('p2').hitstun)) > 30)
} catch (e) { check('matchup test ran', false, e.message.split('\n')[0]) }
finally { check('no page errors', errors.length === 0, errors[0] || ''); await browser.close(); server.close() }
console.log(`\nZORO MATCHUPS: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
