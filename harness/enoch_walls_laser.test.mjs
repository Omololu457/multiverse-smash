// harness/enoch_walls_laser.test.mjs — Enoch's ICE / FIRE WALLS and his visor laser on the Homelander / Superman LASER
// GAUGE architecture (beam.js), driven through the REAL game with real raw controls (frame-stepped).
//   L. LASER: tap = minimum burst + gauge spent + 1 s re-fire cooldown (a press during it is rejected); hold = sustained,
//      drains the gauge; dry gauge = 2.5 s overheat (rejected as 'overheat'); lock-on to an airborne foe; Up / Down sweep;
//      a hit cuts the beam; the HUD view (gauge / cooldown / overheat).
//   W. WALLS: 623+Special = ICE WALL (stops a walking foe, eats enemy shots, launches a foe it erupts under, lays ICE);
//      623+Heavy = FIRE WALL (burns a foe standing in it over time, lays FIRE); Back+Heavy = the wall of his zone; fire
//      raised on the ice wall = a STEAM BURST; per-element cooldowns.
//   R. DETERMINISM: the same inputs twice → identical laser + wall state; no Math.random from enoch / beam / elements.
//   + screenshots docs/enoch/screenshots/walls.png, laser_gauge.png
//   node harness/enoch_walls_laser.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const J = o => JSON.stringify(o)
async function open(p1 = 'enoch', p2 = 'frozone') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__enRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/(enoch\w*|elements|beam)\.js/.test(st) && __enRandom.length < 5) __enRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=81517`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  await page.evaluate(async () => {
    const { writeRawControls } = await import('./input.js')
    const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
    const hold = (f, r, n = 1) => { writeRawControls(f, r); step(n) }
    const fwd = f => (f.facing || 1) === 1 ? 'right' : 'left', bck = f => (f.facing || 1) === 1 ? 'left' : 'right'
    // 623 (forward, down, down-forward) + a button, as a player types it
    const dp = (f, btn) => { hold(f, { [fwd(f)]: true }); hold(f, {}); hold(f, { down: true }); hold(f, { down: true, [fwd(f)]: true }); hold(f, { down: true, [fwd(f)]: true, [btn]: true }); writeRawControls(f, {}) }
    window.__E = { H, step, hold, dp, fwd, bck, rel: f => writeRawControls(f, {}),
      setup: (ax = 1300, bx = 1500, dummy = 'stand') => { H.reset(); __harness.setDummyBehavior?.(dummy); const a = H.raw(), b = H.raw('p2')
        for (const f of [a, b]) { f.leftTapTime = f.rightTapTime = 0; f.health = f.maxHealth; f.vx = f.vy = 0; f.hitstun = 0; f.blockstun = 0; f.energy = 0; f.invulnTimer = 0 }
        a.x = ax; b.x = bx; a.facing = ax < bx ? 1 : -1; b.facing = -a.facing; writeRawControls(a, {}); step(2); return { a, b } } }
  })
  return page
}
try {
  const page = await open()
  // ═══ L. LASER ═══
  const L = await page.evaluate(() => { const { H, step, hold, rel, setup } = __E; const r = {}
    let { a, b } = setup(1100, 1500); H.setThermal(0)
    const lz = () => H.state().s.laser
    // tap: one frame of Special on the forward motion (656 → Heat Lens); then release
    const tap = () => { hold(a, { right: true }); hold(a, {}); hold(a, { right: true }); hold(a, { right: true, special: true }); rel(a) }
    const hp0 = b.health; tap()
    let onFrames = 0, firstOn = -1
    for (let i = 0; i < 40; i++) { step(1); if (H.state().s.beam) { onFrames++; if (firstOn < 0) firstOn = i } }
    r.tap = { onFrames, gauge: lz().gauge, cd: lz().cd, dmg: Math.round((hp0 - b.health) * 100) / 100, beams: H.state().s.stats.beams }
    // a press during the cooldown is rejected (Homelander: no re-fire for 1 s)
    tap(); step(2); r.cooldownPress = { attack: H.state().attack?.name || null, reject: H.state().s.lastReject }
    step(70); const rej0 = H.state().s.stats.rejects; tap(); step(12); r.afterCd = { beams: H.state().s.stats.beams, rejects: H.state().s.stats.rejects - rej0 }
    // hold until the gauge runs dry → overheat (2.5 s lockout)
    ;({ a, b } = setup(1100, 1500)); H.setThermal(-10); b.invulnTimer = 99999
    hold(a, { right: true }); hold(a, {}); hold(a, { right: true }); let held = 0, gaugeMin = 999
    for (let i = 0; i < 140; i++) { hold(a, { special: true }); if (H.state().s.beam) held++; gaugeMin = Math.min(gaugeMin, lz().gauge) }
    rel(a); step(2)
    r.hold = { held, gaugeMin, over: lz().over, overheats: H.state().s.stats.laserOverheat, ticks: H.state().s.stats.beamTicks, hud: H.hud().laser }
    step(20); const rj = H.state().s.stats.rejects; hold(a, { right: true }); hold(a, {}); hold(a, { right: true }); hold(a, { right: true, special: true }); rel(a); step(4)
    r.overPress = { attack: H.state().attack?.name || null, reject: H.state().s.lastReject, rejects: H.state().s.stats.rejects - rj }
    step(200); r.recovered = { over: lz().over, cd: lz().cd, gauge: lz().gauge }
    // lock-on: an airborne foe above → the beam angles UP at him and connects
    ;({ a, b } = setup(1000, 1300)); H.setThermal(-10)
    hold(a, { right: true }); hold(a, {}); hold(a, { right: true }); hold(a, { right: true, special: true })
    let ang = null, hit = false
    for (let i = 0; i < 30; i++) { b.y = a.y - 160; b.vy = 0; b.onGround = false; b.grounded = false; hold(a, { special: true }); const s = H.state().s; if (s.beam) ang = s.beam.angle; hit ||= !!s.beamFx?.hit }
    rel(a); step(80); r.lock = { angle: ang, hit, hits: H.state().s.stats.beamHits }
    // Up / Down = a manual sweep around the firing axis (≤ 0.62 rad)
    ;({ a, b } = setup(1000, 2800)); H.setThermal(-10); b.invulnTimer = 99999
    hold(a, { right: true }); hold(a, {}); hold(a, { right: true }); hold(a, { right: true, special: true })
    for (let i = 0; i < 11; i++) hold(a, { special: true })
    const base = H.state().s.laser.base; for (let i = 0; i < 40; i++) hold(a, { special: true, down: true })
    r.sweep = { base, after: H.state().s.beam?.angle }
    rel(a); step(80)
    // a hit on Enoch cuts the beam (and still starts the cooldown)
    ;({ a, b } = setup(1000, 1400)); H.setThermal(-10); b.invulnTimer = 99999
    hold(a, { right: true }); hold(a, {}); hold(a, { right: true }); for (let i = 0; i < 16; i++) hold(a, { special: true })
    const on = !!H.state().s.beam; a.hitstun = 20; hold(a, { special: true }); r.cut = { on, after: !!H.state().s.beam, cd: lz().cd }
    rel(a); step(40)
    return r })
  ok('L1 tap = a minimum burst of ≥ 12 frames, gauge spent, then the 1 s re-fire cooldown', L.tap.onFrames >= 12 && L.tap.onFrames <= 16 && L.tap.gauge < 72 && L.tap.cd > 0 && L.tap.dmg > 0, J(L.tap))
  ok('L2 a press during the cooldown is rejected (no beam)', L.cooldownPress.attack !== 'heatLens' && L.cooldownPress.reject === 'laser', J(L.cooldownPress))
  ok('L3 after the cooldown it fires again', L.afterCd.beams === 2 && L.afterCd.rejects === 0, J(L.afterCd))
  ok('L4 hold = sustained, drains the whole gauge (72 frames) then OVERHEATS', L.hold.held >= 70 && L.hold.held <= 76 && L.hold.gaugeMin === 0 && L.hold.overheats === 1 && L.hold.over > 0 && L.hold.ticks >= 11, J(L.hold))
  ok('L5 the HUD view reports the overheat', L.hold.hud && L.hold.hud.over > 0 && L.hold.hud.max === 72, J(L.hold.hud))
  ok('L6 during the overheat Heat Lens is rejected as "overheat"', L.overPress.attack !== 'heatLens' && L.overPress.reject === 'overheat', J(L.overPress))
  ok('L7 the overheat ends and the gauge refills', L.recovered.over === 0 && L.recovered.cd === 0 && L.recovered.gauge > 50, J(L.recovered))
  ok('L8 lock-on: the beam angles UP at an airborne foe and connects', L.lock.angle != null && L.lock.angle < -0.3 && L.lock.hit && L.lock.hits >= 1, J(L.lock))
  ok('L9 Down sweeps the beam by hand, capped at 0.62 rad off the axis', L.sweep.after > L.sweep.base + 0.3 && L.sweep.after <= L.sweep.base + 0.6201, J(L.sweep))
  ok('L10 a hit on Enoch cuts the beam and starts the cooldown', L.cut.on && !L.cut.after && L.cut.cd > 0, J(L.cut))

  // ═══ W. WALLS ═══
  const W = await page.evaluate(() => { const { H, step, hold, dp, rel, setup } = __E; const r = {}
    // ICE WALL: 623 + Special, foe far away walking in → stopped by it
    let { a, b } = setup(1000, 1500); H.setThermal(0)
    dp(a, 'special'); step(14)
    let s = H.state().s; r.ice = { wall: s.wall && { type: s.wall.type, x: s.wall.x, hp: s.wall.hp }, patches: s.field.patches.map(p => p.type), th: s.th.v, cd: s.cd.iceWall }
    const wx = s.wall?.x ?? 0
    for (let i = 0; i < 40; i++) { b.vx = -6; b.x -= 6; step(1) }
    r.block = { foeLeft: b.x, wallRight: wx + 15, stopped: b.x >= wx + 15 - 1 }
    rel(a); step(200)
    // eruption under a grounded foe = one launching hit
    ;({ a, b } = setup(1000, 1128)); H.setThermal(0); const hp0 = b.health
    dp(a, 'special'); step(16)
    r.launch = { dmg: Math.round((hp0 - b.health) * 100) / 100, launches: H.state().s.stats.wallLaunch, airborne: !(b.onGround || b.grounded) || b.vy < 0 }
    step(240)
    // FIRE WALL: 623 + Heavy, the foe standing in it burns over time; lays FIRE
    ;({ a, b } = setup(1000, 1080)); H.setThermal(0); b.invulnTimer = 0
    dp(a, 'heavy'); step(13); s = H.state().s
    r.fire = { wall: s.wall && { type: s.wall.type, x: s.wall.x }, patches: s.field.patches.map(p => p.type), cd: s.cd.fireWall, th: s.th.v }
    const fx = s.wall?.x ?? 0; b.x = fx - b.w / 2; b.vx = 0; const hp1 = b.health; let burns0 = s.stats.wallBurns
    for (let i = 0; i < 60; i++) { b.x = fx - b.w / 2; b.vx = 0; step(1) }
    r.burn = { dmg: Math.round((hp1 - b.health) * 100) / 100, burns: H.state().s.stats.wallBurns - burns0, passable: true }
    step(200)
    // ICE wall, then FIRE wall raised on it → STEAM BURST
    ;({ a, b } = setup(1000, 1600)); H.setThermal(0)
    dp(a, 'special'); step(32); const before = H.state().s.wall?.type
    dp(a, 'heavy'); step(14); s = H.state().s
    r.steam = { before, wall: s.wall, wallSteam: s.stats.wallSteam }
    step(250)
    // Back + Heavy: the wall of his zone (hot → fire, else ice)
    ;({ a, b } = setup(1000, 1600)); H.setThermal(70)
    hold(a, { left: true, heavy: true }); rel(a); step(14); r.backHot = H.state().s.wall?.type || null
    step(250)
    ;({ a, b } = setup(1000, 1600)); H.setThermal(-40)
    hold(a, { left: true, heavy: true }); rel(a); step(14); r.backCold = H.state().s.wall?.type || null
    // cooldown: the same wall again at once is rejected
    step(20); const rj = H.state().s.stats.rejects; dp(a, 'special'); step(4); r.cdPress = { rejects: H.state().s.stats.rejects - rj, reason: H.state().s.lastReject }
    step(500); r.expired = H.state().s.wall   // the ice wall stands 8 s now
    return r })
  ok('W1 623 + Special raises an ICE WALL ahead, lays ICE, costs cold, starts its cooldown', W.ice.wall?.type === 'ice' && W.ice.wall.x > 1000 && W.ice.patches.includes('ice') && W.ice.th < 0 && W.ice.cd > 0, J(W.ice))
  ok('W2 the ice wall stops a foe walking into it', W.block.stopped, J(W.block))
  ok('W3 erupting under a grounded foe = one launching hit', W.launch.launches === 1 && W.launch.dmg > 0, J(W.launch))
  ok('W4 623 + Heavy raises a FIRE WALL, lays FIRE, costs heat', W.fire.wall?.type === 'fire' && W.fire.patches.includes('fire') && W.fire.th > 0 && W.fire.cd > 0, J(W.fire))
  ok('W5 the fire wall burns a foe standing in it (every 15 frames)', W.burn.burns >= 3 && W.burn.dmg > 0, J(W.burn))
  ok('W6 a FIRE WALL raised on his ICE WALL = a STEAM BURST (both gone)', W.steam.before === 'ice' && W.steam.wall === null && W.steam.wallSteam === 1, J(W.steam))
  ok('W7 Back + Heavy raises the wall of his zone (hot → fire, cold → ice)', W.backHot === 'fire' && W.backCold === 'ice', J({ hot: W.backHot, cold: W.backCold }))
  ok('W8 per-element cooldown: the same wall again at once is rejected', W.cdPress.rejects >= 1 && W.cdPress.reason === 'cooldown', J(W.cdPress))
  ok('W9 walls expire on their own', W.expired === null, J(W.expired))

  // projectiles: a mirror Enoch's Ice Blasts into the ICE wall are stopped (3 HP → it shatters); into the FIRE wall, burned
  const pm = await open('enoch', 'enoch')
  const P = await pm.evaluate(() => { const { H, step, dp, setup } = __E; const r = {}
    let { a, b } = setup(1000, 1500); H.setThermal(0); H.setThermal(0, 'p2'); a.invulnTimer = 99999
    dp(a, 'special'); step(14); const hp0 = a.health
    for (let k = 0; k < 3; k++) { b.facing = -1; H.move('iceBlast', 'p2'); step(40) }
    const s = H.state().s; r.ice = { blocks: s.stats.wallBlocks, wall: s.wall, foeShots: H.projectiles('p2').length }
    ;({ a, b } = setup(1000, 1500)); H.setThermal(0); H.setThermal(0, 'p2'); a.invulnTimer = 99999
    dp(a, 'heavy'); step(14); b.facing = -1; H.move('iceBlast', 'p2'); step(40)
    r.fire = { blocks: H.state().s.stats.wallBlocks, wall: H.state().s.wall?.type || null }
    return r })
  ok('W10 the ICE WALL stops 3 enemy shots, then shatters', P.ice.blocks === 3 && P.ice.wall === null && P.ice.foeShots === 0, J(P.ice))
  ok('W11 the FIRE WALL burns an enemy shot out of the air', P.fire.blocks === 1 && P.fire.wall === 'fire', J(P.fire))
  await pm.close()

  // ═══ R. DETERMINISM ═══
  const run = async () => page.evaluate(() => { const { H, step, hold, dp, rel, setup } = __E
    const { a } = setup(1000, 1400); H.setThermal(0)
    dp(a, 'special'); step(20); dp(a, 'heavy'); step(20)
    hold(a, { right: true }); hold(a, {}); hold(a, { right: true }); for (let i = 0; i < 30; i++) hold(a, { special: true, down: i > 15 }); rel(a); step(30)
    const s = H.state().s; return JSON.stringify({ laser: s.laser, wall: s.wall, stats: s.stats, th: s.th, patches: s.field.patches, hp: H.raw('p2').health }) })
  const d1 = await run(), d2 = await run()
  ok('R1 identical state from identical inputs (laser + walls)', d1 === d2, d1 === d2 ? '' : d1.slice(0, 300) + ' VS ' + d2.slice(0, 300))
  const rnd = await page.evaluate(() => window.__enRandom.length)
  ok('R2 no Math.random from enoch / beam / elements', rnd === 0, String(rnd))

  // ═══ screenshots ═══
  await page.evaluate(() => { const { H, step, dp, hold, setup } = __E; const { a, b } = setup(1000, 1500); H.setThermal(0); b.invulnTimer = 99999
    dp(a, 'special'); step(30); a.x = 1250; step(2); a.facing = -1; step(1) })
  fs.mkdirSync('docs/enoch/screenshots', { recursive: true })
  const ice = await page.screenshot()
  await page.evaluate(() => { const { H, step, dp, setup } = __E; const { a, b } = setup(1000, 1500); H.setThermal(0); b.invulnTimer = 99999; step(260); dp(a, 'heavy'); step(30) })
  const fire = await page.screenshot()
  await page.evaluate(() => { const { H, step, hold, setup } = __E; const { a, b } = setup(1000, 1400); H.setThermal(-10); b.invulnTimer = 99999
    hold(a, { right: true }); hold(a, {}); hold(a, { right: true }); for (let i = 0; i < 40; i++) hold(a, { special: true }) })
  const laser = await page.screenshot()
  fs.writeFileSync('docs/enoch/screenshots/ice_wall.png', ice); fs.writeFileSync('docs/enoch/screenshots/fire_wall.png', fire); fs.writeFileSync('docs/enoch/screenshots/laser_gauge.png', laser)
  ok('S1 render: no page errors through walls + laser', errors.length === 0, J(errors.slice(0, 3)))
} catch (e) { fail++; console.log('  ❌ crashed', e.stack) }
await browser.close(); server.close()
console.log(`\n  ENOCH WALLS + LASER: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
