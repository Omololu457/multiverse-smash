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
console.log('\n── super-fast: Toji\'s designed speed + double-tap TELEPORT (real keyboard, live match) ──')
{
  const pg = await browser.newPage(); pg.on('pageerror', e => errors.push(e.message))
  await pg.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await pg.goto(server.base + '/index.html?harness=1&p1=zoro&p2=luffy', { waitUntil: 'load' })
  await pg.waitForFunction(() => !!window.__harness?.zoroTest)
  await pg.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  const st = n => pg.evaluate(n => __harness.luffyTest.step(n), n)
  const live = () => pg.evaluate(() => { const f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2'); return { bs: f.baseSpeed, sp: f.speed, ds: f.dashSpeed, tp: !!f.dashTeleport, fx: Math.round(f.x), ox: Math.round(o.x), ow: o.w } })
  const tap2 = async dir => { const k = await pg.evaluate(d => __harness.zoroTest.raw('p1').controls[d], dir); for (let i = 0; i < 2; i++) { await pg.keyboard.down(k); await pg.keyboard.up(k) } }
  await st(5)
  let L = await live()
  check('in a LIVE match Zoro runs on Toji\'s designed speed (98) and dash (22), not the shared Goku reset (84/16)', L.bs === T.speed && L.sp === T.speed && L.ds === T.dashSpeed, JSON.stringify(L))
  check('Zoro is speed-tier / has the teleport-dash flag', L.tp && L.bs >= 98)
  // natural spawn spacing (the harness re-centres hand-placed fighters, so don't move them)
  await st(20); const t0 = await live(); await tap2('right'); await st(6); const t1 = await live()   // the blink resolves after Zoro's 5-tick command window
  check('double-tap TOWARD = instant TELEPORT: crosses the gap in one frame (after a 5-tick window), lands right beside the foe (shared speed-tier blink)', t1.fx - t0.fx > 250 && Math.abs(t1.ox - (t1.fx + 60)) <= 12, `${t0.fx}→${t1.fx} (foe ${t1.ox}, gap was ${t0.ox - t0.fx - 60}px)`)
  check('…with the teleport flash + its 48f cooldown', await pg.evaluate(() => { const f = __harness.zoroTest.raw('p1'); return f.teleportFlash > 0 && f.dashTeleportCooldown > 40 }))
  // walk: hold AWAY 20 frames → ≥ Toji-tier walk distance
  await st(60); const w0 = await live(); const awayKey = async () => { const c = await pg.evaluate(() => __harness.zoroTest.raw('p1').controls), p = await live(); return p.fx < p.ox ? c.left : c.right }
  const rk = await awayKey()
  await pg.keyboard.down(rk); await st(20); await pg.keyboard.up(rk); const w1 = await live()
  check('walk is fast (≥150px in 20 frames, walking away from the foe)', Math.abs(w0.fx - w1.fx) >= 150, `${w0.fx}→${w1.fx}`)
  // the double-tap AWAY is the shared ground dash (engine-wide it runs along `facing`; no backdash for anyone).
  // What is Zoro's: it runs at Toji's DESIGNED dash speed, 22×0.55 = 12.1 px/f (the Goku-reset value is 8.8).
  await st(20)
  { const k = await awayKey(); await pg.keyboard.down(k); await pg.keyboard.up(k); await pg.keyboard.down(k); await pg.keyboard.up(k) }
  await st(2); const dv = await pg.evaluate(() => { const f = __harness.zoroTest.raw('p1'); return { vx: Math.abs(f.vx), dt: f.dashTimer } })
  check('double-tap AWAY = ground dash at Toji\'s designed dash speed (12.1 px/f, no teleport)', dv.dt > 0 && Math.abs(dv.vx - 12.1) < 0.05, JSON.stringify(dv))
  // →→+A must stay ONI GIRI (the teleport waits 5 ticks and is cancelled by A)
  await st(70)
  { const o0 = await live(); const k = await pg.evaluate(() => __harness.zoroTest.raw('p1').controls), fw = o0.fx < o0.ox ? k.right : k.left
    await pg.evaluate(() => { __harness.zoroTest.spirit('p1', 100) })
    for (let i = 0; i < 2; i++) { await pg.keyboard.down(fw); await pg.keyboard.up(fw) }
    await pg.keyboard.down(fw); await st(1); await pg.keyboard.down(k.special); await st(1); await pg.keyboard.up(k.special); await pg.keyboard.up(fw)
    const mv = await pg.evaluate(() => __harness.zoroTest.raw('p1').currentMove), tp = await pg.evaluate(() => __harness.zoroTest.raw('p1').teleportFlash || 0)
    check('→→+A is still ONI GIRI (no teleport)', mv === 'zOni' && tp === 0, `move ${mv}, teleportFlash ${tp}`) }
  await st(90)
  // round reset (the path that runs revertGoku on everyone) keeps Zoro fast
  await pg.evaluate(async () => { const g = await import('./zoroState.js'); const f = __harness.zoroTest.raw('p1'); f.baseSpeed = f.speed = 84; f.dashSpeed = 16; g.zoroRoundReset(f) })
  L = await live()
  check('zoroRoundReset (called after revertGoku on every reset path) restores 98 / 22', L.bs === 98 && L.ds === 22, JSON.stringify(L))
  const lf = await pg.evaluate(async () => { const g = await import('./zoroState.js'); const o = __harness.zoroTest.raw('p2'); const b = [o.baseSpeed, o.dashSpeed, !!o.dashTeleport]; g.zoroRoundReset(o); return JSON.stringify(b) === JSON.stringify([o.baseSpeed, o.dashSpeed, !!o.dashTeleport]) })
  check('zoroRoundReset does not touch any other fighter (Luffy unchanged)', lf)
  await pg.close()
}
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
