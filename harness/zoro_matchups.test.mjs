// harness/zoro_matchups.test.mjs — Roronoa Zoro phase 9: mechanical claims behind docs/zoro/BALANCE_NOTES.md.
//   * Conqueror's Haki cancels Superman's SUSTAINED Heat Vision (driven through Superman's REAL
//     abilities.applySupermanHeatVision with Special held) and his in-flight beam PROJECTILES.
//   * vs Luffy: reach (Luffy's Stretch Piston 230px) vs damage (Zoro's Heavy 90 raw vs Luffy's 58).
//   * Speed = Toji's (owner request): identical speed/dash stats + the double-tap blink-behind dash (real keyboard).
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
// Speed stats = Toji's (owner request, post-build): walk speed, dash speed/duration/cooldown all identical.
const T = characters.toji.stats, Z = characters.zoro.stats
check('Zoro has Toji\'s speed stats (speed 98 · dashSpeed 22 · dashDuration 10 · dashCooldownMax 26)',
  ['speed', 'dashSpeed', 'dashDuration', 'dashCooldownMax'].every(k => Z[k] === T[k]), ['speed', 'dashSpeed', 'dashDuration', 'dashCooldownMax'].map(k => `${k} ${Z[k]}/${T[k]}`).join(' '))
check('Spirit-gated: every special costs Spirit except NAP', Object.entries(ZORO_MOVES).filter(([k, m]) => m.isSpecial && !['zShishiStrike'].includes(k)).every(([, m]) => m.cost > 0))

const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
console.log('\n── double-tap dash = Toji\'s (real keyboard, same match setup) ──')
// Drive the REAL keydown path (detectDoubleTapDashTeleport) for Toji and Zoro and compare the x trajectory
// frame by frame, toward and away. Same stats → must be identical, whatever the shared engine does with them.
const dashTrace = async who => {
  const pg = await browser.newPage(); pg.on('pageerror', e => errors.push(e.message))
  await pg.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await pg.goto(server.base + `/index.html?harness=1&p1=${who}&p2=luffy`, { waitUntil: 'load' })
  await pg.waitForFunction(() => !!window.__harness?.zoroTest)
  await pg.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  const st = n => pg.evaluate(n => __harness.luffyTest.step(n), n)
  await st(5)
  const out = {}
  for (const dir of ['right', 'left']) {
    await pg.evaluate(() => { const f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2'); f.x = 400; o.x = 1100; f.vx = o.vx = 0; f.leftTapTime = f.rightTapTime = 0; f.dashCooldown = 0; f.dashTeleportCooldown = 0 })
    await st(2)
    const k = await pg.evaluate(d => __harness.zoroTest.raw('p1').controls[d], dir)
    for (let i = 0; i < 2; i++) { await pg.keyboard.down(k); await pg.keyboard.up(k) }
    const xs = []; for (let i = 0; i < 14; i++) { await st(1); xs.push(await pg.evaluate(() => Math.round(__harness.zoroTest.raw('p1').x))) }
    out[dir] = xs; await st(60)
  }
  await pg.close(); return out
}
const tj = await dashTrace('toji'), zr = await dashTrace('zoro')
check('double-tap TOWARD: Zoro\'s dash is frame-identical to Toji\'s', JSON.stringify(zr.right) === JSON.stringify(tj.right), `zoro ${zr.right.join(',')} | toji ${tj.right.join(',')}`)
check('double-tap AWAY: Zoro\'s dash is frame-identical to Toji\'s', JSON.stringify(zr.left) === JSON.stringify(tj.left), `zoro ${zr.left.join(',')} | toji ${tj.left.join(',')}`)
check('the double-tap actually dashes (≥60px in 10 frames)', Math.abs(zr.right[9] - zr.right[0]) >= 60, zr.right.join(','))
const page = await browser.newPage()
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
