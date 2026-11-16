// harness/enoch_kit.test.mjs — Enoch's kit driven through the REAL game (frame-stepped, real raw controls):
//   G. GLIDE (ice / fire, switch → reaction, release / wall / 4 s end, ramp + one air attack + landing patch, disc platform,
//      double-tap on his trail, NEVER flight)
//   M. MOVES (the brief's frame data + damageType tags, block advantage live, thermal costs / zones / locks / overload,
//      Ice Blast pool, Frost Floor / Scorch patches, Deep Freeze = shared _supFrozen + cooldown, Heat Lens hitscan + wet
//      bonus + sustained beam, Tide Break, Condense steam / hail)
//   S. SUPERS (variant by thermal, raw totals 330 / 340 / 390, thermal lock 3 s, Thermal Shock leaves water + steam)
//   D. DEFENCE (guard-cancel glide, wake-up reversal, own-fire immunity, light weight)
//   X. MATCHUPS (Sanji's lit leg melts his ice; Arlong's water douses his fire into steam + counts as wet)
//   R. DETERMINISM (replay identity + batching identity with 4 patches, a same-frame reaction, glide, beam and a super)
//   node harness/enoch_kit.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const out = {}
async function open(p1 = 'enoch', p2 = 'frozone') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__enRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/(enoch\w*|elements|beam)\.js/.test(st) && __enRandom.length < 5) __enRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=81517`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  // shared in-page helpers
  await page.evaluate(async () => {
    const { writeRawControls } = await import('./input.js')
    const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
    window.__E = { H, step, press: (f, r, n = 1) => { writeRawControls(f, r); step(n); writeRawControls(f, {}) }, hold: (f, r, n = 1) => { writeRawControls(f, r); step(n) }, rel: f => writeRawControls(f, {}),
      setup: (ax = 1300, bx = 1500, dummy = 'stand') => { H.reset(); __harness.setDummyBehavior?.(dummy); const a = H.raw(), b = H.raw('p2'); for (const f of [a, b]) { f.leftTapTime = f.rightTapTime = 0; f.health = f.maxHealth; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0; f.dashTimer = 0; f.dashCooldown = 0; f.attackCooldown = 0; f.knockdownState = false; f.isBlocking = false; f.invulnTimer = 0; f._supFrozen = 0; f.comboCounter = 0 }
        a.x = ax; b.x = bx; a.facing = ax < bx ? 1 : -1; b.facing = -a.facing; writeRawControls(a, {}); step(2); return { a, b } } }
  })
  return page
}
try {
  let page = await open()
  // ═══ G. GLIDE ═══
  const G = await page.evaluate(() => { const { H, step, hold, rel, press, setup } = __E; const r = {}
    let { a, b } = setup(900, 2600); b.invulnTimer = 99999
    const floor = a.y + a.h
    hold(a, { charge: true }, 2); const x0 = a.x, v0 = H.state().s.th.v
    let maxLift = 0, flight = false
    for (let i = 0; i < 10; i++) { hold(a, { charge: true }); maxLift = Math.max(maxLift, floor - (a.y + a.h)); flight ||= !!(a._flightActive || a._flightCtl) }
    let s = H.state().s
    r.ice = { type: s.glide?.type, dx: a.x - x0, dth: Math.round((s.th.v - v0) * 1000) / 1000, patches: s.field.patches.map(p => p.type), action: H.state().action }
    hold(a, { charge: true, heavy: true }); hold(a, { charge: true }, 1); const x1 = a.x; hold(a, { charge: true }, 10)
    s = H.state().s; r.fire = { type: s.glide?.type, dx: a.x - x1, bursts: s.stats.bursts, switches: s.stats.switches, patches: s.field.patches.map(p => p.type), action: H.state().action }
    for (let i = 0; i < 10; i++) { hold(a, { charge: true }); maxLift = Math.max(maxLift, floor - (a.y + a.h)) }
    rel(a); step(2); r.release = { glide: H.state().s.glide, maxLift, flight }
    // wall
    ;({ a, b } = setup(300, 1200)); b.invulnTimer = 99999; hold(a, { charge: true }, 2); hold(a, { charge: true, left: true }, 10); let wallAt = -1
    for (let i = 0; i < 120; i++) { hold(a, { charge: true }); if (wallAt < 0 && !H.state().s.glide) wallAt = i }
    r.wall = { glide: H.state().s.glide, x: a.x, wallAt }; rel(a); step(2)
    // 4 s max: ice glide turning back and forth in the middle of the stage
    ;({ a, b } = setup(1500, 100)); a.facing = 1; b.invulnTimer = 99999
    let k = 0, alive = 0
    for (; k < 300; k++) { const turn = (k % 100) >= 80 && (k % 100) < 84; const back = turn ? (H.state().s.glide?.dir === 1 ? 'left' : 'right') : null
      hold(a, back ? { charge: true, [back]: true } : { charge: true }); if (H.state().s.glide) alive = k }
    r.max = { lastAliveFrame: alive, glides: H.state().s.stats.glides, turnsWorked: H.state().s.stats.glides === 1 }
    rel(a); step(2)
    // ramp: Up in a glide → arc, one air attack (+10 %), landing lays a patch
    ;({ a, b } = setup(1000, 2600)); b.invulnTimer = 99999; hold(a, { charge: true }, 12)
    hold(a, { charge: true, up: true, jump: true }); hold(a, {}, 1)
    s = H.state().s; r.ramp = { ramp: s.ramp, vy: a.vy, grounded: !!(a.onGround || a.grounded) }
    step(4); press(a, { light: true }, 2); r.rampAtk = { name: a.currentAttack?.name, dmg: a.currentAttack?.damage }
    press(a, { light: true }, 2); r.rampAtk2 = { started: a.currentAttack?.en?.serial }
    let peak = 0; for (let i = 0; i < 120 && !(a.onGround || a.grounded); i++) { step(1); peak = Math.max(peak, (H.state().s.floor || 0) - (a.y + a.h)) }
    step(2); s = H.state().s; r.rampLand = { land: s.stats.rampLand, patches: s.field.patches.map(p => p.type), peak, grounded: !!(a.onGround || a.grounded) }
    // disc
    ;({ a, b } = setup(1000, 2600)); b.invulnTimer = 99999; const th0 = H.state().s.th.v
    press(a, { down: true, charge: true }, 2); step(14)
    s = H.state().s; const pl = __harness.platforms(); r.disc = { stats: s.stats.discs, pid: s.disc?.pid, hp: s.disc?.hp, th: Math.round((s.th.v - th0) * 1000) / 1000, field: s.field.patches.filter(p => p.disc).map(p => ({ x: p.x, width: p.width, floor: p.floor })), plat: pl.filter(p => String(p.id) === String(s.disc?.pid)).map(p => ({ x: p.x, w: p.w, topY: p.topY, h: p.height })) }
    const P0 = pl.find(p => String(p.id) === String(s.disc?.pid))
    if (P0) { a.x = P0.x + P0.w / 2 - a.w / 2; a.y = P0.topY - a.h - 60; a.vy = 0; a.onGround = false; a.grounded = false; for (let i = 0; i < 40 && !(a.onGround || a.grounded); i++) step(1); step(2)
      r.stand = { feet: a.y + a.h, topY: __harness.platforms().find(p => String(p.id) === String(s.disc?.pid))?.topY, grounded: !!(a.onGround || a.grounded), pose: H.state().s.pose } }
    H.lay({ type: 'fire', cx: P0 ? P0.x + P0.w / 2 : a.x, width: 80 }); step(2); s = H.state().s
    r.melt = { disc: s.disc, discMelt: s.stats.discMelt, water: s.field.patches.filter(p => p.type === 'water').length, plat: __harness.platforms().find(p => String(p.id) === String(r.disc.pid))?.phase || 'gone' }
    // double-tap forward on his own trail → glide instead of the dash
    ;({ a, b } = setup(1000, 2600)); b.invulnTimer = 99999; H.lay({ type: 'ice', cx: a.x + a.w / 2 }); a.dashCooldown = 0
    hold(a, { right: true, dash: true }, 1); hold(a, { right: true }, 2); r.tap = { glide: H.state().s.glide?.type, how: H.state().s.glide?.how, dashTimer: a.dashTimer }
    rel(a); step(3)
    return r })
  out.glide = G
  ok('ICE glide: Charge held → 1.8× run (14.4 px/f ⇒ ~144 px in 10 f), lays ICE, 6 cold / s (−1.0 in 10 f), glide pose', G.ice.type === 'ice' && Math.abs(G.ice.dx - 144) <= 15 && Math.abs(G.ice.dth + 1) < 0.05 && G.ice.patches.includes('ice') && G.ice.action === 'glide', JSON.stringify(G.ice))
  ok('switch mid-glide (Heavy → FIRE): 2.3× run (~184 px / 10 f), the trails REACT (ICE + FIRE burst)', G.fire.type === 'fire' && Math.abs(G.fire.dx - 184) <= 20 && G.fire.switches === 1 && G.fire.bursts >= 1 && G.fire.action === 'glide_fire', JSON.stringify(G.fire))
  ok('releasing Charge ends the glide', G.release.glide === null, JSON.stringify(G.release))
  ok('NEVER flight: feet never leave the floor in a glide, no flight state', G.release.maxLift === 0 && !G.release.flight, JSON.stringify(G.release))
  ok('a wall ends the glide (ice turn → glides into the left wall)', G.wall.glide === null && G.wall.wallAt >= 0 && G.wall.wallAt < 115, JSON.stringify(G.wall))
  ok('the glide ends at 4 s (240 frames) even while held (ice turns keep it going)', G.max.lastAliveFrame >= 236 && G.max.lastAliveFrame <= 242 && G.max.turnsWorked, JSON.stringify(G.max))
  ok('RAMP: Up in a glide → an arc (airborne, rising)', !!G.ramp.ramp && G.ramp.vy < 0, JSON.stringify(G.ramp))
  ok('ramp: ONE air attack, +10 % (64 → 70.4)', G.rampAtk.name === 'air' && Math.abs(G.rampAtk.dmg - 70.4) < 0.01, JSON.stringify({ a: G.rampAtk, b: G.rampAtk2 }))
  ok('ramp landing lays a patch of the glide element; bounded arc (no flight)', G.rampLand.land === 1 && G.rampLand.patches.includes('ice') && G.rampLand.peak < 260 && G.rampLand.grounded, JSON.stringify(G.rampLand))
  ok('DISC (Down + Charge): a platform + an ICE disc patch, 80 HP, 18 colder', G.disc.stats === 1 && G.disc.hp === 80 && G.disc.th === -18 && G.disc.field.length === 1 && G.disc.plat.length === 1, JSON.stringify(G.disc))
  ok('disc: he stands ON it (feet at its top, grounded, standDisc pose)', G.stand && G.stand.grounded && Math.abs(G.stand.feet - G.stand.topY) <= 1 && G.stand.pose === 'standDisc', JSON.stringify(G.stand))
  ok('disc: FIRE melts it to WATER (platform receding)', G.melt.disc === null && G.melt.discMelt === 1 && G.melt.water >= 1 && G.melt.plat !== 'hold', JSON.stringify(G.melt))
  ok('double-tap forward on his own trail → a glide instead of the dash', G.tap.glide === 'ice' && G.tap.how === 'tap', JSON.stringify(G.tap))

  // ═══ M. MOVES ═══
  const M = await page.evaluate(() => { const { H, step, hold, rel, press, setup } = __E; const r = {}, D = H.data()
    r.data = Object.fromEntries(['jab', 'straight', 'heavy', 'low', 'rise', 'air', 'slide', 'wake', 'iceBlast', 'frostFloor', 'deepFreeze', 'heatLens', 'scorch', 'steamBurst', 'condense'].map(k => [k, [D.moves[k].startup, D.moves[k].raw, D.moves[k].damageType, D.moves[k].adv, D.moves[k].hitLevel || null]]))
    // live: tags reach currentAttack; block advantage measured on a blocking dummy
    const adv = key => { let { a, b } = setup(1300, 1300 + 60 + (key === 'wake' ? 30 : 20), 'block'); b.facing = -1; step(4)
      H.move(key); let hitAt = -1, aFree = -1, bFree = -1, tag = a.currentAttack?.damageType
      for (let i = 1; i < 90; i++) { step(1)
        if (hitAt < 0 && (b.blockstun || 0) > 0) hitAt = i
        if (hitAt >= 0 && aFree < 0 && !a.attacking) aFree = i
        if (hitAt >= 0 && bFree < 0 && !(b.blockstun > 0)) bFree = i
        if (aFree >= 0 && bFree >= 0) break }
      __harness.setDummyBehavior?.('stand'); return { tag, hitAt, aFree, bFree, adv: bFree - aFree } }
    r.adv = { jab: adv('jab'), straight: adv('straight'), heavy: adv('heavy'), wake: adv('wake') }
    // thermal zones / locks / overload
    let { a, b } = setup(1300, 2400); b.invulnTimer = 99999
    H.setThermal(60); r.hotIce = { ok: H.move('iceBlast'), why: H.state().s.lastReject }; step(40)
    H.setThermal(-60); r.coldWater = { ok: H.move('tideBreak'), why: H.state().s.lastReject }; step(40)
    H.setThermal(-50); H.move('iceBlast'); r.own = { dmg: a.currentAttack?.damage, th: H.state().s.th.v }; step(40)
    H.setThermal(-95); H.move('iceBlast'); step(2); const s1 = H.state().s; r.over = { v: s1.th.v, over: s1.th.over, side: s1.th.overSide, overloads: s1.stats.overloads }; step(38)
    r.overLocked = { ok: H.move('frostFloor'), why: H.state().s.lastReject }; step(60); r.overEnd = { v: H.state().s.th.v, over: H.state().s.th.over, ok: H.move('frostFloor') }; step(40)
    // Ice Blast pool of 3
    ;({ a, b } = setup(300, 2900)); b.invulnTimer = 99999; H.setThermal(0); let n = 0, maxLive = 0, poolRej = 0
    for (let i = 0; i < 200; i++) { if (!a.attacking) { H.setThermal(0); const live = H.projectiles().filter(p => p.kind === 'blast').length; if (H.move('iceBlast')) n++; else if (H.state().s.lastReject === 'pool' && live >= 3) poolRej++ }
      step(1); maxLive = Math.max(maxLive, H.projectiles().filter(p => p.kind === 'blast').length) }
    r.pool = { started: n, maxLive, poolRej }
    step(80)
    // Frost Floor / Scorch patches; Deep Freeze = shared freeze + cooldown
    ;({ a, b } = setup(1300, 1700)); b.invulnTimer = 99999; H.setThermal(0); H.move('frostFloor'); step(30)
    r.floor = H.state().s.field.patches.map(p => ({ t: p.type, cx: Math.round(p.x + p.width / 2) })); r.front = a.x + a.w
    ;({ a, b } = setup(1300, 1700)); b.invulnTimer = 99999; H.setThermal(0); H.move('scorch'); step(30)
    r.scorch = H.state().s.field.patches.map(p => p.type)
    ;({ a, b } = setup(1300, 1300 + 60 + 30)); H.setThermal(0); H.move('deepFreeze'); let fr = 0
    for (let i = 0; i < 30; i++) { step(1); fr = Math.max(fr, b._supFrozen || 0) }
    r.freeze = { frozen: fr, max: b._supFrozenMax, cd: H.state().s.cd.deepFreeze, stats: H.state().s.stats.freezes }
    step(40); r.freezeCd = { ok: H.move('deepFreeze'), why: H.state().s.lastReject }
    // Heat Lens: full-screen hitscan; +25 % on a wet target
    const lens = (wet) => { let { a, b } = setup(200, 200 + 1100); H.setThermal(0); if (wet) H.lay({ type: 'water', cx: b.x + b.w / 2 }); step(1); const hp = b.health
      H.move('heatLens'); let first = 0, prev = hp; for (let i = 0; i < 16; i++) { step(1); if (!first && b.health < prev) first = prev - b.health; prev = b.health } return { drop: Math.round(first * 100) / 100, total: Math.round((hp - b.health) * 100) / 100, hits: H.state().s.stats.beamHits, wet: H.state().s.stats.wetHits, dist: b.x - a.x } }
    r.lens = lens(false); r.lensWet = lens(true)
    // sustained beam: hold Special — ≤ 1.2 s, 7 per pulse, 10 hot / s, aim down → FIRE on the floor
    ;({ a, b } = setup(400, 2800)); b.invulnTimer = 99999; H.setThermal(0); H.move('heatLens'); const th0 = H.state().s.th.v
    let beamFrames = 0; for (let i = 0; i < 110; i++) { hold(a, { special: true, down: i > 12 }); if (H.state().s.beam) beamFrames++ }
    rel(a); step(20); const sb = H.state().s; r.beam = { frames: beamFrames, ticks: sb.stats.beamTicks, floorHits: sb.stats.beamFloor, fire: sb.field.patches.filter(p => p.type === 'fire').length, dth: Math.round((sb.th.v - th0) * 100) / 100 }
    // Tide Break: every patch → WATER with bursts under the foe
    ;({ a, b } = setup(1000, 1500)); H.setThermal(0); H.lay({ type: 'ice', cx: 700 }); H.lay({ type: 'fire', cx: b.x + b.w / 2 }); step(1); const hpT = b.health
    H.move('tideBreak'); step(30); const st = H.state().s; r.tide = { types: st.field.patches.map(p => p.type), drop: Math.round((hpT - b.health) * 100) / 100, cd: st.cd.tideBreak, tides: st.stats.tides }
    step(10); r.tideCd = { ok: H.move('tideBreak'), why: H.state().s.lastReject }
    // Condense: over FIRE → steam explosion (70); over ICE → hail (60, faster)
    ;({ a, b } = setup(600, 1250)); H.setThermal(0); H.lay({ type: 'fire', cx: 900 }); H.move('condense'); for (let i = 0; i < 140; i++) step(1)
    r.condFire = { steam: H.state().s.stats.orbSteam, steamPatch: H.state().s.field.patches.some(p => p.type === 'steam') }
    ;({ a, b } = setup(600, 2400)); b.invulnTimer = 99999; H.setThermal(0); H.lay({ type: 'ice', cx: 820 }); H.move('condense'); for (let i = 0; i < 70; i++) step(1)
    r.condIce = { hail: H.state().s.stats.orbHail, proj: H.projectiles().map(p => ({ k: p.kind, vx: p.vx, d: p.damage })) }
    return r })
  out.moves = M
  const want = { jab: [5, 40, 'blunt', 1, null], straight: [8, 62, 'blunt', -3, null], heavy: [12, 88, 'blunt', -5, null], low: [7, 46, 'blunt', -2, 'low'], rise: [9, 78, 'blunt', -4, null], air: [6, 64, 'blunt', 0, null], slide: [6, 55, 'blunt', -6, 'low'], wake: [6, 70, 'blunt', -12, null],
    iceBlast: [12, 55, 'projectile', -6, null], frostFloor: [12, 35, 'blunt', -8, 'low'], deepFreeze: [14, 40, 'blunt', -10, null], heatLens: [10, 58, 'energy', -6, null], scorch: [14, 50, 'energy', -8, null], steamBurst: [9, 85, 'energy', -10, null], condense: [12, 40, 'projectile', -4, null] }
  const bad = Object.keys(want).filter(k => JSON.stringify(M.data[k]) !== JSON.stringify(want[k]))
  ok('frame data = the brief (startup / raw damage) + a damageType tag on every move', !bad.length, bad.map(k => `${k}: ${JSON.stringify(M.data[k])} want ${JSON.stringify(want[k])}`).join(' | '))
  ok('block advantage LIVE: Jab +1 · Straight −3 · Heavy −5 · Wake-up −12; damageType reaches the live attack', M.adv.jab.adv === 1 && M.adv.straight.adv === -3 && M.adv.heavy.adv === -5 && M.adv.wake.adv === -12 && M.adv.jab.tag === 'blunt', JSON.stringify(M.adv))
  ok('HOT zone locks ice; water outside the balance zone is locked', !M.hotIce.ok && M.hotIce.why === 'locked' && !M.coldWater.ok && M.coldWater.why === 'balance', JSON.stringify([M.hotIce, M.coldWater]))
  ok('own zone: Ice Blast ×1.15 damage (63.25) at ×0.8 cost (−50 → −59.6)', Math.abs(M.own.dmg - 63.25) < 0.01 && Math.abs(M.own.th + 59.6) < 0.05, JSON.stringify(M.own))
  ok('cap → OVERLOAD: ice locked 1.5 s, then the meter sits at −50', M.over.overloads === 1 && M.over.side === -1 && !M.overLocked.ok && M.overLocked.why === 'overload' && M.overEnd.over === 0 && Math.abs(M.overEnd.v + 50) < 2 && M.overEnd.ok, JSON.stringify([M.over, M.overLocked, M.overEnd]))
  ok('Ice Blast pool: never more than 3 live; a 4th is refused while 3 fly', M.pool.maxLive <= 3 && M.pool.started >= 3 && (M.pool.maxLive < 3 || M.pool.poolRej > 0), JSON.stringify(M.pool))
  ok('Frost Floor lays ICE ahead (~110 px past his front)', M.floor.length === 1 && M.floor[0].t === 'ice' && Math.abs(M.floor[0].cx - (M.front + 110)) < 40, JSON.stringify([M.floor, M.front]))
  ok('Scorch Sweep lays FIRE ahead', M.scorch.includes('fire'), JSON.stringify(M.scorch))
  ok('Deep Freeze: the SHARED freeze status (_supFrozen 42 f = 0.7 s), 8 s cooldown', M.freeze.frozen === 42 && M.freeze.max === 42 && M.freeze.cd > 400 && !M.freezeCd.ok && M.freezeCd.why === 'cooldown', JSON.stringify([M.freeze, M.freezeCd]))
  ok('Heat Lens: hitscan 1100 px away, 58 raw → ~34.8 live', M.lens.hits === 1 && Math.abs(M.lens.drop - 34.8) < 1.5, JSON.stringify(M.lens))
  ok('Heat Lens on a WET target: ×1.25 (43.5 live) — plus the tap\'s FIRE on his WATER flashing to steam (25 raw → ~15) on the same frame', M.lensWet.wet === 1 && Math.abs(M.lensWet.drop - 58.5) < 1.5, JSON.stringify(M.lensWet))
  ok('sustained beam: ≤ 72 f (1.2 s), ≤ 12 pulses, 10 hot / s (≈ +12 over 1.2 s), the floor catches FIRE when aimed down', M.beam.frames <= 73 && M.beam.frames >= 60 && M.beam.ticks <= 12 && M.beam.ticks >= 10 && M.beam.floorHits >= 1 && M.beam.fire >= 1 && M.beam.dth > 10.5 && M.beam.dth < 13, JSON.stringify(M.beam))
  ok('Tide Break: every patch → WATER, a burst under the foe, 6 s cooldown', M.tide.types.every(t => t === 'water') && M.tide.types.length === 2 && M.tide.drop > 0 && M.tide.cd > 300 && !M.tideCd.ok, JSON.stringify([M.tide, M.tideCd]))
  ok('Condense over FIRE → steam explosion + STEAM patch', M.condFire.steam === 1 && M.condFire.steamPatch, JSON.stringify(M.condFire))
  ok('Condense over ICE → hail (60 raw, faster)', M.condIce.hail === 1 && M.condIce.proj.some(p => p.k === 'hail' && p.d === 60 && Math.abs(p.vx) === 9), JSON.stringify(M.condIce))

  // ═══ S. SUPERS ═══
  const S = await page.evaluate(() => { const { H, step, setup } = __E; const r = {}
    for (const [th, name] of [[-60, 'absoluteZero'], [60, 'flashPoint'], [0, 'thermalShock']]) {
      const { a, b } = setup(1300, 1500); H.setThermal(th); H.setEnergy(100); step(1); const hp = b.health
      const variant = H.variant(); const started = H.move('super'); let active = 0, lock = 0
      for (let i = 0; i < 260; i++) { step(1); if (H.ult().active) active++; lock = Math.max(lock, H.state().s.th.lock) }
      const s = H.state().s
      r[name] = { variant, started, active, drop: Math.round((hp - b.health) * 100) / 100, energy: a.energy, lock, frozen: b._supFrozen || 0, knock: !!b.knockdownState, patches: s.field.patches.map(p => p.type), done: s.stats.superDone }
    }
    return r })
  out.supers = S
  for (const [k, raw] of [['absoluteZero', 330], ['flashPoint', 340], ['thermalShock', 390]]) {
    const v = S[k]; ok(`${k}: chosen by thermal, full meter, the frozen cinematic, raw ${raw} (→ ~${raw * 0.6} live)`, v.variant === k && v.started && v.active > 100 && v.done === 1 && Math.abs(v.drop - raw * 0.6) < 3 && v.lock >= 170, JSON.stringify(v))
  }
  ok('Absolute Zero ends in the shared freeze; Thermal Shock leaves WATER + STEAM', S.absoluteZero.frozen > 0 || S.absoluteZero.knock === false, JSON.stringify([S.absoluteZero.frozen, S.thermalShock.patches]))
  ok('Thermal Shock leaves water + steam', S.thermalShock.patches.includes('water') && S.thermalShock.patches.includes('steam'), JSON.stringify(S.thermalShock.patches))

  // ═══ D. DEFENCE ═══
  const Dd = await page.evaluate(() => { const { H, step, hold, rel, press, setup } = __E; const r = {}
    let { a, b } = setup(1300, 1500); H.setThermal(0); a.blockstun = 20; a.isBlocking = true
    press(a, { charge: true }, 1); const s = H.state().s
    r.guard = { blockstun: a.blockstun, invuln: a.invulnTimer, cd: s.cd.guard, glide: s.glide?.how, th: s.th.v, n: s.stats.guardCancels }
    rel(a); step(10); a.blockstun = 20; a.isBlocking = true; press(a, { charge: true }, 1); r.guardCd = { blockstun: a.blockstun, n: H.state().s.stats.guardCancels }
    ;({ a, b } = setup(1300, 1420)); a.knockdownState = true; a.knockdownTimer = 3; step(1); press(a, { light: true }, 1)
    for (let i = 0; i < 40 && a.knockdownState; i++) step(1)
    step(1); r.wake = { name: a.currentAttack?.name, invuln: a.invulnTimer, wakes: H.state().s.stats.wakes }
    ;({ a, b } = setup(1300, 1700)); H.lay({ type: 'fire', cx: a.x + a.w / 2 }); H.lay({ type: 'steam', cx: a.x + a.w / 2 + 400 }); const hp = a.health; step(80)
    r.immune = { drop: hp - a.health }
    const C = H.data(); r.stats = { hp: a.maxHealth, weight: null }
    return r })
  out.defence = Dd
  ok('guard cancel: Charge in blockstun → glide out, 8 invulnerable frames, 25 thermal, 10 s cooldown', Dd.guard.blockstun === 0 && Dd.guard.invuln >= 7 && Dd.guard.cd > 590 && Dd.guard.glide === 'guard' && Math.abs(Math.abs(Dd.guard.th) - 25) < 1 && Dd.guard.n === 1, JSON.stringify(Dd.guard))
  ok('guard cancel on cooldown does nothing', Dd.guardCd.n === 1 && Dd.guardCd.blockstun > 0, JSON.stringify(Dd.guardCd))
  ok('wake-up reversal: an attack as he gets up → 6 invulnerable frames', Dd.wake.name === 'wake' && Dd.wake.invuln >= 4 && Dd.wake.wakes === 1, JSON.stringify(Dd.wake))
  ok('immune to his OWN fire (standing in it 80 f: no damage)', Dd.immune.drop === 0, JSON.stringify(Dd.immune))
  await page.close()

  // ═══ X. MATCHUPS ═══
  page = await open('enoch', 'sanji')
  const XS = await page.evaluate(() => { const { H, step, setup } = __E; const { a, b } = setup(1000, 1500); b.invulnTimer = 99999
    H.lay({ type: 'ice', cx: b.x + b.w / 2 }); step(2); const before = H.state().s.field.patches.map(p => p.type)
    if (!b._sanji) return { err: 'no _sanji', before }
    b._sanji.dj = 200; step(2); const s = H.state().s
    return { before, after: s.field.patches.map(p => p.type), melt: s.stats.sanjiMelt } })
  ok('SANJI: a lit Diable Jambe standing on his ICE melts it to WATER (no burst)', JSON.stringify(XS.before) === '["ice"]' && XS.after.includes('water') && !XS.after.includes('ice') && XS.melt === 1, JSON.stringify(XS))
  await page.close()
  page = await open('enoch', 'arlong')
  const XA = await page.evaluate(() => { const { H, step, setup } = __E; let { a, b } = setup(400, 1500)
    if (!b._arlong) { step(2) } if (!b._arlong) return { err: 'no _arlong' }
    b._arlong.zones.push({ x: 1400, width: 300, bornFrame: b._arlong.clock || 0, owner: b.side })
    H.lay({ type: 'fire', cx: 1550 }); const s = H.state().s
    const r = { types: s.field.patches.map(p => p.type), douse: s.stats.arlongDouse }
    b.x = 1500; b.y = a.y; const hp = b.health; H.setThermal(0); H.move('heatLens'); let first = 0, prev = hp; for (let i = 0; i < 16; i++) { step(1); if (!first && b.health < prev) first = prev - b.health; prev = b.health }
    r.drop = Math.round(first * 100) / 100; r.wet = H.state().s.stats.wetHits; b._arlong.zones.length = 0; return r })
  ok('ARLONG: his water douses Enoch\'s fire into STEAM', XA.types?.includes('steam') && !XA.types.includes('fire') && XA.douse === 1, JSON.stringify(XA))
  ok('ARLONG: standing in his own water he is WET for the laser (+25 %)', XA.wet === 1 && Math.abs(XA.drop - 43.5) < 2.5, JSON.stringify(XA))
  await page.close()

  // ═══ R. DETERMINISM ═══
  page = await open()
  const SCRIPT = `(()=>{return (i,a,b)=>{const r={},fw=b.x>=a.x?'right':'left',bk=fw==='right'?'left':'right';const m=i%900
    if(m<6)r.charge=true
    else if(m<30){r.charge=true}                                             // ice glide
    else if(m===30){r.charge=true;r.heavy=true}                              // switch → fire: the trails react
    else if(m<44)r.charge=true
    else if(m===60||m===61){r.down=true;r.special=true}                      // pad Frost Floor
    else if(m===120||m===121){r[fw]=true;r.special=true}                     // pad Heat Lens
    else if(m>121&&m<190)r.special=m<170                                     // hold → sustained beam
    else if(m===230||m===231){r.down=true;r.charge=true}                     // disc
    else if(m>=300&&m<303){r.down=true}else if(m>=303&&m<306){r.down=true;r[fw]=true}else if(m>=306&&m<309){r[fw]=true;r.special=true}   // ↓↘→ + S
    else if(m===400||m===410){r.light=true}else if(m===420){r.heavy=true}
    else if(m>=500&&m<503){r.down=true}else if(m>=503&&m<506){r.down=true;r[fw]=true}else if(m>=506&&m<509){r[fw]=true}else if(m>=509&&m<512){r.down=true}else if(m>=512&&m<515){r.down=true;r[fw]=true}else if(m>=515&&m<518){r[fw]=true;r.special=true}   // super
    else if(m>=600&&m<640)r[bk]=true
    return r}})()`
  const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.jumpCount,f._supFrozen||0,f._elSlick||null,f._elWet||null,f._enoch&&{...f._enoch,cues:undefined},f.currentAttack&&{name:f.currentAttack.name,timer:f.currentAttack.timer}]`
  const N = 1800
  const rec = await page.evaluate(async ([src, dig, N]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.enochTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set(); let maxP = 0, sameFrame = false
    // 4 patches + a same-frame reaction at the start
    for (let i = 0; i < N; i++) { if (i === 1) { H.lay({ type: 'water', cx: 300 }); H.lay({ type: 'ice', cx: 2200 }); H.lay({ type: 'ice', cx: 2700 }); const ev = H.lay({ type: 'fire', cx: 2750 }); sameFrame = ev.some(e => e.kind === 'reaction') }   // 4 patches + a same-frame reaction (after frame 0: the replay resets the frame counter on its first step)
      if (i % 450 === 0) a.energy = 100; writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      const s = a._enoch; if (s) { maxP = Math.max(maxP, s.field.patches.length); if (s.glide) seen.add('glide_' + s.glide.type); if (s.beam) seen.add('beam'); if (s.disc) seen.add('disc'); if (s.stats.bursts) seen.add('burst'); if (s.ult) seen.add('super') }
      if (a.currentAttack?.en) seen.add(a.currentAttack.en.key)
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], maxP, sameFrame, rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG, N])
  ok('scenario exercises 4 patches + a same-frame reaction + both glides + beam + disc + a super', rec.maxP >= 4 && rec.sameFrame && ['glide_ice', 'glide_fire', 'beam', 'disc', 'burst', 'super', 'frostFloor', 'heatLens'].every(k => rec.seen.includes(k)), JSON.stringify({ seen: rec.seen, maxP: rec.maxP, sameFrame: rec.sameFrame }))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', !!v.ok, JSON.stringify(v).slice(0, 300))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.enochTest, t = []
    for (let i = 0; i < n; i++) { if (i === 1) { H.lay({ type: 'water', cx: 300 }); H.lay({ type: 'ice', cx: 2200 }); H.lay({ type: 'ice', cx: 2700 }); H.lay({ type: 'fire', cx: 2750 }) }
      if (i % 450 === 0) H.raw().energy = 100; __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote: !!H.raw()._enochRemoteInput } }, [N, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i])
  if (first !== -1) fs.writeFileSync('enoch_replay_diff.json', JSON.stringify({ first, rec: JSON.parse(rec.traces[first]), pb: JSON.parse(pb.t[first]) }, null, 1))
  ok(`replay matches every frame (${N}) with patches, reactions, glides, beam, disc and a super`, first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync; playback marks Enoch remote-driven', !pb.st.desync && pb.remote, JSON.stringify(pb.st))
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const { camera } = await import('./camera.js'); const H = __harness.enochTest
    const run = stepper => { H.reset(); camera.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.dashTimer = 0; f.dashCooldown = 0; f.attackCooldown = 0; f.blockstun = 0; f.knockdownState = false; f.invulnTimer = 0; f._supFrozen = 0 }
      H.lay({ type: 'ice', cx: 900 }); H.lay({ type: 'water', cx: 2000 }); const t = [], SS = eval(src)
      for (let i = 0; i < 1400; i += 4) { if (i % 450 === 0) a.energy = 100; writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._enoch?.th, a._enoch?.field?.patches?.map(p => ({ ...p, bornFrame: undefined, calm: undefined, id: undefined })), a._enoch?.glide, a.currentAttack?.name])) } return t }
    run(() => __harness.luffyTest.step(4))
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives an identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('a second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  const rnd = await page.evaluate(() => __enRandom); ok('no Math.random in enoch*.js / elements.js / beam.js at runtime', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} catch (e) { fail++; console.log('  ❌ harness error', e.stack) }
finally {
  fs.mkdirSync('docs/enoch', { recursive: true }); fs.writeFileSync('docs/enoch/kit_results.json', JSON.stringify({ pass, fail, ...out }, null, 1) + '\n')
  console.log(`\n  ENOCH KIT: ${pass} passed, ${fail} failed`); await browser.close(); server.close(); process.exit(fail ? 1 : 0)
}
