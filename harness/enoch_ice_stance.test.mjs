// harness/enoch_ice_stance.test.mjs — Enoch's ICE STANCE: a tap of Charge switches him onto Frozone's own kit (frozoneState's
// host table) and back; holding Charge no longer starts a glide. Driven through the REAL game with real raw controls.
//   T. the stance switch (tap = toggle, hold ≠ glide, Down + Charge = Ice Disc in both stances, elemental moves unchanged)
//   K. the kit on Enoch: strike chain, low, heavy, launcher, air / down-air, Ice Lance (cold thermal, not energy), Glacier
//      Rush, Rising Glacier, Black Ice, Icebreaker, Ice Wall, Chill → Freeze → Shatter, Super meter from his Ice Stance hits
//   M. mobility: Ice Flash (double-tap), Ice Stream (air double-tap), Ice Glider; elemental stance keeps his own dash
//   U. ABSOLUTE ZERO (Ultimate in Ice Stance, 2026-11-23: his OWN super, no longer Frozone's): the cinematic, damage, his poses
//   R. determinism + no Math.random; render (his fz_ strips play, no page errors) + screenshots
//   node harness/enoch_ice_stance.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const J = o => JSON.stringify(o)
async function open(p1 = 'enoch', p2 = 'frozone') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__enRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/(enoch\w*|elements|beam|frozone\w*)\.js/.test(st) && __enRandom.length < 5) __enRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=81517`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  await page.evaluate(async () => {
    const { writeRawControls } = await import('./input.js'); const { camera } = await import('./camera.js'); window.__camReset = () => camera.reset()
    const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
    const hold = (f, r, n = 1) => { writeRawControls(f, r); step(n) }
    const tap = (f, r, n = 1) => { writeRawControls(f, r); step(n); writeRawControls(f, {}); step(1) }
    const dtap = (f, dir) => { hold(f, { [dir]: true, dash: true }); hold(f, { [dir]: true }) }   // raw.dash = the engine's double-tap (the left / right timing path uses the wall clock)
    window.__E = { H, step, hold, tap, dtap, rel: f => writeRawControls(f, {}),
      fz: () => H.raw()._frozone || {}, stance: () => H.state().s?.stance,
      setup: (ax = 1000, bx = 1200, dummy = 'stand') => { H.reset(); __harness.setDummyBehavior?.(dummy); const a = H.raw(), b = H.raw('p2')
        for (const f of [a, b]) { f.leftTapTime = f.rightTapTime = 0; f.health = f.maxHealth; f.vx = f.vy = 0; f.hitstun = 0; f.blockstun = 0; f.invulnTimer = 0; f.energy = 0; f.knockdownState = false; f.hitstop = 0; f._supFrozen = 0; f.attackCooldown = 0; f.dashCooldown = 0; f.comboCounter = 0; f.airDashCount = 0 }
        __camReset?.()
        a.x = ax; b.x = bx; a.facing = ax < bx ? 1 : -1; b.facing = -a.facing; writeRawControls(a, {}); step(2); return { a, b } },
      ice: a => { tap(a, { charge: true }); step(12) } }
  })
  return page
}
try {
  const page = await open()
  // ═══ T. STANCE SWITCH ═══
  const T = await page.evaluate(() => { const { H, step, hold, tap, rel, setup, stance, ice } = __E; const r = {}
    let { a, b } = setup(1000, 1600)
    r.start = stance()
    let glided = false; for (let i = 0; i < 40; i++) { hold(a, { charge: true }); glided ||= !!H.state().s.glide } rel(a); step(12)
    r.hold = { glided, stance: stance() }
    ;({ a, b } = setup(1000, 1600)); ice(a); r.afterTap = stance(); ice(a); r.afterTap2 = stance()
    ;({ a, b } = setup(1000, 1600)); ice(a); hold(a, { right: true }); hold(a, { right: true, charge: true }); rel(a); step(14)
    r.discIce = { discs: H.state().s.stats.discs, stance: stance() }
    // elemental moves unchanged: neutral Special = Ice Blast, Light = jab
    ;({ a, b } = setup(1000, 1600)); H.setThermal(0); tap(a, { special: true }); r.elementalSpecial = H.state().attack?.name; step(40)
    tap(a, { light: true }); r.elementalLight = H.state().attack?.name; step(30)
    return r })
  ok('T1 he starts in his elemental stance', T.start === 'elemental', J(T))
  ok('T2 HOLDING Charge no longer starts a glide (and does switch stance once)', !T.hold.glided && T.hold.stance === 'ice', J(T.hold))
  ok('T3 a tap of Charge toggles Ice Stance on and off', T.afterTap === 'ice' && T.afterTap2 === 'elemental', J({ a: T.afterTap, b: T.afterTap2 }))
  ok('T4 Forward + Charge is the Ice Disc (in Ice Stance too)', T.discIce.discs === 1 && T.discIce.stance === 'ice', J(T.discIce))
  ok('T5 elemental stance keeps his own moves (Special = Ice Blast, Light = Jab)', T.elementalSpecial === 'iceBlast' && T.elementalLight === 'jab', J({ s: T.elementalSpecial, l: T.elementalLight }))

  // ═══ C. CHANNEL: Down + Charge = cool, Up + Charge = heat (held, rooted) ═══
  // 2026-11-17 MODES: Down / Up + Charge picks ICE / FIRE MODE with one press; holding on = powering up (energy), rooted
  const C = await page.evaluate(() => { const { H, step, hold, rel, setup, stance } = __E; const r = {}
    let { a, b } = setup(1000, 1600); H.setMode(null); a.energy = 50; const y0 = a.y, x0 = a.x
    for (let i = 0; i < 60; i++) hold(a, { down: true, charge: true }); r.cool = { mode: H.state().s.mode, pose: H.state().action, moved: Math.abs(a.x - x0), stance: stance(), energy: Math.round(a.energy) }
    rel(a); step(4)
    ;({ a, b } = setup(1000, 1600)); H.setMode(null); a.energy = 50; let minY = a.y
    for (let i = 0; i < 60; i++) { hold(a, { up: true, jump: true, charge: true }); minY = Math.min(minY, a.y) } r.heat = { mode: H.state().s.mode, pose: H.state().action, rose: Math.round(y0 - minY), stance: stance() }
    rel(a); step(4)
    return r })
  ok('C1 Down + Charge = ICE MODE (one press); held on he powers up rooted (energy back up), crouched channel pose', C.cool.mode === 'ice' && C.cool.moved < 2 && C.cool.pose === 'channel' && C.cool.stance === 'elemental' && C.cool.energy > 35, JSON.stringify(C.cool))
  ok('C2 Up + Charge = FIRE MODE (one press), no jump, fire channel pose', C.heat.mode === 'fire' && C.heat.rose < 4 && C.heat.pose === 'channel_fire' && C.heat.stance === 'elemental', JSON.stringify(C.heat))

  // ═══ K. THE KIT ON ENOCH ═══
  const K = await page.evaluate(() => { const { H, step, hold, tap, rel, setup, fz, ice } = __E; const r = {}
    const name = () => H.state().attack?.name || null, act = () => H.state().action
    // strike chain on clean hits: light → fL2 → fL3
    let { a, b } = setup(1000, 1075); ice(a); const hp0 = b.health; const seen = []
    for (let i = 0; i < 3; i++) { tap(a, { light: true }); for (let k = 0; k < 9; k++) { step(1); const n = name(); if (n && !seen.includes(n)) seen.push(n) } }
    step(30); r.chain = { seen, dmg: Math.round(hp0 - b.health), action: null }
    // Ice Lance: neutral Special → a projectile; costs THERMAL (cold), not his Super meter
    ;({ a, b } = setup(1000, 1400)); ice(a); H.setThermal(0); a.energy = 50
    tap(a, { special: true }); const ln = name(), la = act(); let shot = false, hp1 = b.health
    for (let k = 0; k < 40; k++) { step(1); shot ||= ((__harness.enochTest.raw()._frozone?.stats?.lance) || 0) > 0 }
    r.lance = { name: ln, action: la, shot, dmg: Math.round(hp1 - b.health), th: H.state().s.th.v, energy: a.energy }
    // Glacier Rush (Forward + Special) travels; Icebreaker (Back + Special)
    ;({ a, b } = setup(800, 1600)); ice(a); H.setThermal(0); const x0 = a.x
    hold(a, { right: true }); hold(a, { right: true, special: true }); rel(a); const rn = name(); step(30); r.rush = { name: rn, dx: Math.round(a.x - x0) }; step(30)
    ;({ a, b } = setup(1000, 1090)); ice(a); H.setThermal(0); const hp2 = b.health
    hold(a, { left: true }); hold(a, { left: true, special: true }); rel(a); const bn = name(); step(50); r.breaker = { name: bn, dmg: Math.round(hp2 - b.health) }
    // Rising Glacier (Up + Special): leaves the floor
    ;({ a, b } = setup(1000, 1600)); ice(a); H.setThermal(0); const y0 = a.y
    hold(a, { up: true, jump: true, special: true }); rel(a); const un = name(); let top = 0; for (let k = 0; k < 20; k++) { step(1); top = Math.max(top, y0 - a.y) } step(50); r.rise = { name: un, lift: Math.round(top) }
    // Black Ice (Down + Special): a patch; walking the foe onto it = one hit
    ;({ a, b } = setup(1000, 1500)); ice(a); H.setThermal(0)
    hold(a, { down: true }); hold(a, { down: true, special: true }); rel(a); step(20); const patch = fz().patch
    r.blackIce = { patch: !!patch, x: patch?.x }; step(10)
    // Ice Wall (Down + Heavy)
    ;({ a, b } = setup(1000, 1600)); ice(a); hold(a, { down: true }); hold(a, { down: true, heavy: true }); rel(a); step(16); r.wall = { fwall: !!fz().wall, name: null }
    // Chill → Freeze → Shatter: three clean Ice Lances, then the Heavy shatters the shell
    ;({ a, b } = setup(1000, 1180)); ice(a); H.setThermal(0)
    let froze = false; for (let k = 0; k < 3 && !froze; k++) { tap(a, { special: true }); for (let j = 0; j < 30 && !froze; j++) { step(1); froze ||= !!fz().freeze } }
    for (let j = 0; j < 20 && a.attacking; j++) step(1)   // let the last Lance recover (still inside the shell)
    a.x = b.x - a.w - 24; a.facing = 1; tap(a, { heavy: true }); step(30)   // the Heavy lands inside the 24-tick shell (the Lances pushed him out of reach)
    r.freeze = { froze, freezes: fz().stats?.freezes, shatters: fz().stats?.shatters, chill: fz().stats?.chill }
    // Super meter builds from Ice Stance hits
    ;({ a, b } = setup(1000, 1075)); ice(a); a.energy = 0; tap(a, { light: true }); step(20); r.meter = a.energy
    // launcher (Up + Heavy) and the air down-strike
    ;({ a, b } = setup(1000, 1075)); ice(a); hold(a, { up: true, jump: true, heavy: true }); rel(a); const ln2 = name(); step(40); r.launch = ln2
    return r })
  ok('K1 Ice Stance strike chain: light → fL2 → fL3 on clean hits', K.chain.seen.join(',') === 'light,fL2,fL3' && K.chain.dmg > 0, J(K.chain))
  ok('K2 Ice Lance fires (his fz_ strip), costs COLD thermal, not his Super meter', K.lance.name === 'fLance' && K.lance.action === 'fz_fLance' && K.lance.shot && K.lance.dmg > 0 && K.lance.th < 0 && K.lance.energy >= 50, J(K.lance))
  ok('K3 Glacier Rush (Forward + Special) surfs forward', K.rush.name === 'fRush' && K.rush.dx > 100, J(K.rush))
  ok('K4 Icebreaker (Back + Special) hits', K.breaker.name === 'fBreaker' && K.breaker.dmg > 0, J(K.breaker))
  ok('K5 Rising Glacier (Up + Special) lifts him', K.rise.name === 'fRise' && K.rise.lift > 60, J(K.rise))
  ok('K6 Black Ice (Down + Special) lays its patch', K.blackIce.patch, J(K.blackIce))
  ok('K7 Ice Wall (Down + Heavy) in Ice Stance', K.wall.fwall, J(K.wall))
  ok('K8 Chill → Freeze → Shatter works on his hits', K.freeze.froze && K.freeze.freezes === 1 && K.freeze.shatters === 1, J(K.freeze))
  ok('K9 Ice Stance hits build his Super meter', K.meter > 0, String(K.meter))
  ok('K10 Up + Heavy = the rising wedge launcher', K.launch === 'fLaunch', String(K.launch))

  // ═══ M. MOBILITY ═══
  const M = await page.evaluate(() => { const { H, step, hold, dtap, rel, setup, fz, ice } = __E; const r = {}
    let { a, b } = setup(800, 2400); b.invulnTimer = 99999; ice(a); const x0 = a.x
    dtap(a, 'right'); rel(a); step(2); r.flash = { dx: Math.round(a.x - x0), flashes: fz().stats?.flashes }
    step(30)
    ;({ a, b } = setup(800, 2400)); b.invulnTimer = 99999; ice(a)
    hold(a, { jump: true }); for (let i = 0; i < 8; i++) hold(a, {}); const xs = a.x
    hold(a, { right: true, dash: true }); for (let i = 0; i < 20; i++) hold(a, { right: true }); rel(a)
    r.stream = { rails: fz().stats?.rails, dx: Math.round(a.x - xs) }; step(60)
    ;({ a, b } = setup(800, 2400)); b.invulnTimer = 99999; ice(a)
    hold(a, { jump: true }); for (let i = 0; i < 4; i++) hold(a, {}); hold(a, { jump: true }); for (let i = 0; i < 60 && !((a.vy || 0) > 2); i++) hold(a, {}); let maxVy = 0   // both jumps spent, falling
    for (let i = 0; i < 20; i++) { hold(a, { jump: true }); maxVy = Math.max(maxVy, a.vy || 0) } rel(a); step(60)
    r.glider = { glides: fz().stats?.glides, maxVy: Math.round(maxVy * 10) / 10 }
    // elemental stance: the double-tap is still his own dash (no flash)
    ;({ a, b } = setup(800, 2400)); b.invulnTimer = 99999; const fl0 = fz().stats?.flashes || 0
    dtap(a, 'right'); rel(a); step(2); r.elemental = { dashing: (a.dashTimer || 0) > 0 || Math.abs(a.vx) > 5 || !!a._enoch?.glide, flashes: (fz().stats?.flashes || 0) - fl0, dashSpeed: a.dashSpeed }
    step(40)
    return r })
  ok('M1 Ice Flash: the ground double-tap teleports ~250 px', M.flash.flashes === 1 && M.flash.dx >= 200, J(M.flash))
  ok('M2 Ice Stream: the air double-tap pours a rail and he grinds it', M.stream.rails >= 1 && M.stream.dx > 100, J(M.stream))
  ok('M3 Ice Glider: holding Jump while falling caps the fall', M.glider.glides >= 1 && M.glider.maxVy <= 1.7, J(M.glider))
  ok('M4 elemental stance keeps his own double-tap (now his ICE SLIDE — no Ice Flash), dash speed untouched', M.elemental.dashing && M.elemental.flashes === 0 && M.elemental.dashSpeed === 26, J(M.elemental))

  // ═══ U. ABSOLUTE ZERO (the Ice Stance Ultimate = his own super since 2026-11-23, never Frozone's) ═══
  const U = await page.evaluate(() => { const { H, step, tap, setup, ice } = __E
    const { a, b } = setup(1000, 1080); ice(a); a.energy = 100; const hp0 = b.health
    tap(a, { ultimate: true }); let active = false, poses = new Set(), cut = false
    let variant = null, frozone = false
    for (let i = 0; i < 280; i++) { step(1); const u = H.ult(); if (u.active) variant = u.variant; if (window.__harness.frozoneTest?.ult?.()?.active) frozone = true; if (a.currentAttack?._ultPose) { active = true; poses.add(H.state().action) } }
    return { active, poses: [...poses], dmg: Math.round(hp0 - b.health), energy: a.energy, variant, frozone } })
  ok('U1 ABSOLUTE ZERO (Ultimate in Ice Stance): HIS cinematic runs (not Frozone\'s) and lands', U.active && U.variant === 'absoluteZero' && !U.frozone && U.dmg > 150 && U.energy < 100, J(U))
  ok('U2 his own poses play (wind-up → palm slam → raised fist)', ['enUltWind', 'enUltPalm', 'meteor'].every(p => U.poses.includes(p)), J(U.poses))

  // ═══ R. DETERMINISM / RENDER ═══
  const run = () => page.evaluate(() => { const { H, step, hold, tap, dtap, rel, setup, ice } = __E
    const { a, b } = setup(1000, 1200); ice(a); H.setThermal(0)
    tap(a, { light: true }); step(8); tap(a, { light: true }); step(20); tap(a, { special: true }); step(30); dtap(a, 'right'); rel(a); step(30)
    hold(a, { right: true }); hold(a, { right: true, special: true }); rel(a); step(40)
    return JSON.stringify({ fz: { ...a._frozone, cues: undefined }, en: { ...a._enoch, cues: undefined }, x: a.x, hp: b.health }) })
  const d1 = await run(), d2 = await run()
  ok('R1 identical state from identical inputs (both kits)', d1 === d2, d1 === d2 ? '' : d1.slice(0, 200) + ' VS ' + d2.slice(0, 200))
  ok('R2 no Math.random from enoch / frozone / beam / elements', (await page.evaluate(() => window.__enRandom.length)) === 0)
  await page.evaluate(() => { const { step, tap, setup, ice } = __E; const { a } = setup(1000, 1300); ice(a); tap(a, { special: true }); step(8) })
  fs.mkdirSync('docs/enoch/screenshots', { recursive: true }); fs.writeFileSync('docs/enoch/screenshots/ice_stance.png', await page.screenshot())
  // render check of the new looks: the ice shard in flight, the heat / cold channel, the Fire Wall pillars
  const shot = async (name, fn) => { await page.evaluate(fn); fs.writeFileSync(`docs/enoch/screenshots/${name}.png`, await page.screenshot()) }
  await shot('ice_shard', () => { const { H, step, tap, setup } = __E; setup(900, 1500); H.setThermal(0); tap(H.raw(), { special: true }); step(16); __harness.render?.() })
  await shot('channel_heat', () => { const { H, hold, setup } = __E; const { a } = setup(1000, 1600); H.setMode(null); a.energy = 50; for (let i = 0; i < 20; i++) hold(a, { up: true, jump: true, charge: true }); __harness.render?.() })
  await shot('channel_cold', () => { const { H, hold, rel, step, setup } = __E; const { a } = setup(1000, 1600); H.setMode(null); a.energy = 50; for (let i = 0; i < 20; i++) hold(a, { down: true, charge: true }); __harness.render?.(); })
  await shot('fire_wall_vfx', () => { const { H, hold, rel, step, setup } = __E; const { a } = setup(1000, 1700); H.setThermal(0); rel(a); step(2); H.move('fireWall'); step(30); __harness.render?.() })
  const shard = await page.evaluate(() => { const { H, step, tap, setup } = __E; const { a } = setup(900, 1500); H.setThermal(0); tap(a, { special: true }); let seen = 0, act = new Set(); for (let i = 0; i < 20; i++) { step(1); act.add(H.state().action); seen = Math.max(seen, (__E.H.world?.()?.projectiles || []).length) } return { act: [...act] } })
  ok('R4 Ice Blast plays the standing point-and-shoot strip', shard.act.includes('atkBlast') || shard.act.some(x => /blast/i.test(x)), JSON.stringify(shard))
  ok('R3 render: no page errors', errors.length === 0, J(errors.slice(0, 3)))
} catch (e) { fail++; console.log('  ❌ crashed', e.stack) }
await browser.close(); server.close()
console.log(`\n  ENOCH ICE STANCE: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
