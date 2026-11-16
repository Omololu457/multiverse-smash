// harness/enoch_status.test.mjs — Enoch's LASTING EFFECTS + FIRE / ICE TWINS, driven through the REAL game with real moves.
//   S. statuses: one hit does nothing lasting; ICE builds CHILL (slower steps) → 5 = ICE BOX; FIRE builds BURN (health decay
//      with no further hits); stacks fade; the combination (fire on chill = STEAM SHOCK, ice on burn = QUENCH)
//   T. twins: hot → Ice Blast fires a FIRE SHARD, Frost Floor = FLAME FLOOR; cold → Heat Lens = FROST LENS (ice laser);
//      the dash leaves FIRE when hot, ICE when cold, nothing in balance
//   H. the opponent's health bar glows red / blue (pixel check) + screenshots; R. determinism, no Math.random, no page errors
//   node harness/enoch_status.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const J = o => JSON.stringify(o)
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__enRandom = []
  Math.random = function () { const st = new Error().stack; if (/\/(enoch\w*|elements|beam)\.js/.test(st) && __enRandom.length < 5) __enRandom.push(st); return old() } })
await page.goto(server.base + '/index.html?harness=1&p1=enoch&p2=frozone&seed=4242', { waitUntil: 'load' })
await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
await page.evaluate(async () => {
  const { writeRawControls } = await import('./input.js'); const ES = await import('./enochState.js'); const { camera } = await import('./camera.js')
  const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
  const hold = (f, r, n = 1) => { writeRawControls(f, r); step(n) }
  const tap = (f, r, n = 1) => { writeRawControls(f, r); step(n); writeRawControls(f, {}); step(1) }
  window.__E = { H, ES, step, hold, tap, rel: f => writeRawControls(f, {}),
    aff: () => { const a = H.raw(), b = H.raw('p2'); return a._enoch?.aff?.[ES.sideOf(b)] || null },
    setup: (ax = 1000, bx = 1200, dummy = 'stand') => { H.reset(); camera.reset(); __harness.setDummyBehavior?.(dummy); const a = H.raw(), b = H.raw('p2')
      for (const f of [a, b]) { f.leftTapTime = f.rightTapTime = 0; f.health = f.maxHealth; f.vx = f.vy = 0; f.hitstun = 0; f.blockstun = 0; f.invulnTimer = 0; f.energy = 0
        f.knockdownState = false; f.hitstop = 0; f._supFrozen = 0; f.attackCooldown = 0; f.dashCooldown = 0; f.comboCounter = 0 }
      a.x = ax; b.x = bx; a.facing = ax < bx ? 1 : -1; b.facing = -a.facing; writeRawControls(a, {}); writeRawControls(b, {}); step(2); return { a, b } },
    // one clean special hit at point-blank (waits for the move to finish)
    hit: (key, a) => { H.move(key); for (let i = 0; i < 60 && (a.attacking || (window.__harness.enochTest.projectiles().length)); i++) step(1); step(4) } }
})

// ═══ S. STATUSES ═══
const S = await page.evaluate(() => { const { H, ES, step, hold, rel, setup, aff, hit } = __E; const r = {}
  // S1: ONE ice hit = 1 chill, no slow
  let { a, b } = setup(1000, 1150); H.setThermal(0); hit('iceBlast', a); r.one = { ...aff() }; r.oneSlow = ES.slowOf(aff()?.chill || 0)
  // S2: walking distance chilled (2 stacks) vs free
  const walk = (n) => { const x0 = b.x; for (let i = 0; i < n; i++) { b.x += 4; step(1) } return b.x - x0 }   // he moves 4 px a frame (the dummy ignores pad input)
  ;({ a, b } = setup(600, 1100)); const free = walk(40)
  ;({ a, b } = setup(600, 1100)); ES.afflict(a, b, 'ice', 2); const slowed = walk(40); r.walk = { free: Math.round(free), slowed: Math.round(slowed), chill: aff().chill }
  // S3: real ice hits to the ICE BOX
  ;({ a, b } = setup(1000, 1150)); H.setThermal(0); let boxed = 0, maxChill = 0
  for (let k = 0; k < 7 && !boxed; k++) { b.x = 1150; b.hitstun = 0; b.invulnTimer = 0; b.knockdownState = false; H.setThermal(0); a.attackCooldown = 0; hit('iceBlast', a); maxChill = Math.max(maxChill, aff()?.chill || 0); boxed = aff()?.box || 0 }
  r.box = { boxed, frozen: b._supFrozen, chillAfter: aff().chill, boxes: a._enoch.stats.boxes, maxChill }
  for (let i = 0; i < 140; i++) step(1); r.boxEnd = { box: aff().box, frozen: b._supFrozen || 0 }
  // S4: ONE fire hit = no decay; TWO = health keeps dropping with no further hits
  ;({ a, b } = setup(1000, 1150)); H.setThermal(0); ES.afflict(a, b, 'fire', 1); let hp0 = b.health; for (let i = 0; i < 120; i++) step(1); r.burn1 = Math.round(hp0 - b.health)
  ;({ a, b } = setup(1000, 1150)); H.setThermal(0); ES.afflict(a, b, 'fire', 1); ES.afflict(a, b, 'fire', 1); ES.afflict(a, b, 'fire', 1); hp0 = b.health
  for (let i = 0; i < 120; i++) step(1); r.burn3 = { lost: Math.round((hp0 - b.health) * 10) / 10, burn: aff().burn, ticks: a._enoch.stats.burnTicks }
  // S5: stacks fade (life 240 then −1 / 60 f)
  for (let i = 0; i < 1300; i++) step(1); r.fade = aff().burn   // lasts 10 s after the last hit, then −1 every 2 s
  // S6: the combination
  ;({ a, b } = setup(1000, 1150)); ES.afflict(a, b, 'ice', 1); ES.afflict(a, b, 'ice', 1); hp0 = b.health; const res = ES.afflict(a, b, 'fire', 1); step(1)
  r.shock = { res, chill: aff().chill, dmg: Math.round(hp0 - b.health), shocks: a._enoch.stats.shocks }
  ;({ a, b } = setup(1000, 1150)); ES.afflict(a, b, 'fire', 1); ES.afflict(a, b, 'fire', 1); hp0 = b.health; const res2 = ES.afflict(a, b, 'ice', 1); step(1)
  r.quench = { res: res2, burn: aff().burn, dmg: Math.round(hp0 - b.health) }
  // S7: real fire hits (Scorch) build burn; a blocked hit builds nothing
  ;({ a, b } = setup(1000, 1100)); H.setThermal(0); hit('scorch', a); r.scorch = aff()?.burn || 0
  ;({ a, b } = setup(1000, 1100, 'block')); H.setThermal(0); step(4); hit('scorch', a); r.blocked = aff()?.burn || 0
  return r })
ok('S1 one ice hit = 1 chill and NO slow yet', S.one.chill === 1 && S.oneSlow === 1, J(S.one))
ok('S2 chill 2 = his steps shrink (−12 %)', S.walk.free > 50 && S.walk.slowed < S.walk.free * 0.93 && S.walk.slowed > S.walk.free * 0.8, J(S.walk))
ok('S3 ice hits stack to the ICE BOX: frozen solid, the chill is spent', S.box.boxed > 0 && S.box.frozen > 0 && S.box.chillAfter === 0 && S.box.boxes === 1, J(S.box))
ok('S3b the box melts after 120 frames (2 s)', S.boxEnd.box === 0 && S.boxEnd.frozen === 0, J(S.boxEnd))
ok('S4 one fire hit = no decay; 3 stacks = health keeps draining with no more hits', S.burn1 === 0 && S.burn3.lost > 0 && S.burn3.ticks >= 3 && S.burn3.burn === 3, J({ b1: S.burn1, b3: S.burn3 }))
ok('S5 burn fades away after a while (10 s, then a stack every 2 s)', S.fade === 0, String(S.fade))
ok('S6 THE COMBINATION: fire on a chilled foe = STEAM SHOCK (chill spent)', S.shock.res === 'shock' && S.shock.chill === 0 && S.shock.dmg > 0, J(S.shock))
ok('S6b ice on a burning foe = QUENCH (burn spent)', S.quench.res === 'quench' && S.quench.burn === 0 && S.quench.dmg > 0, J(S.quench))
ok('S7 a real fire special builds a burn stack; BLOCKED it builds none (only the fire left on the floor singes, +0.25 a tick)', S.scorch >= 1 && S.blocked < 1, J({ s: S.scorch, b: S.blocked }))

// ═══ T. TWINS ═══
const T = await page.evaluate(() => { const { H, step, hold, rel, tap, setup } = __E; const r = {}
  const pr = () => window.__harness.enochTest.raw()._enoch
  let { a, b } = setup(900, 1600); H.setThermal(50); H.move('iceBlast'); let pel = null
  for (let i = 0; i < 20; i++) { step(1); const P = (a._enochW || null); for (const q of (window.__harness.enochTest.projectiles() || [])) pel = pel || q.kind }
  const fx = (H.state().s.fx || []).map(e => e.kind)
  r.shard = { proj: (window.__harness.enochTest.projectiles() || []).length, kind: pel, stat: pr().stats.fireShards, th: Math.round(pr().th.v) }
  ;({ a, b } = setup(900, 1600)); H.setThermal(50); H.move('frostFloor'); for (let i = 0; i < 20; i++) step(1); r.floor = { types: pr().field.patches.map(p => p.type), stat: pr().stats.flameFloors }
  ;({ a, b } = setup(900, 1300)); H.setThermal(-50); H.move('heatLens'); let bel = null; for (let i = 0; i < 16; i++) { step(1); bel = bel || pr().beamFx?.el || null } r.lens = { el: bel, stat: pr().stats.frostLens, th: Math.round(pr().th.v) }
  ;({ a, b } = setup(900, 1300)); H.setThermal(0); H.move('heatLens'); let bel2 = null; for (let i = 0; i < 16; i++) { step(1); bel2 = bel2 || pr().beamFx?.el || null } r.lens0 = bel2
  const dash = th => { ;({ a, b } = setup(700, 2200)); b.invulnTimer = 99999; H.setThermal(th); hold(a, { right: true, dash: true }); for (let i = 0; i < 12; i++) hold(a, { right: true }); rel(a); step(2); return { types: pr().field.patches.map(p => p.type), fd: pr().stats.fireDash, id: pr().stats.iceDash } }
  r.dashHot = dash(50); r.dashCold = dash(-50); r.dash0 = dash(0)
  return r })
ok('T1 hot (+50): Special = FIRE SHARD (a fireball), heats him further', T.shard.proj === 1 && T.shard.stat === 1 && T.shard.th > 50, J(T.shard))
ok('T2 hot: Frost Floor = FLAME FLOOR (fire patch)', T.floor.stat === 1 && T.floor.types.includes('fire') && !T.floor.types.includes('ice'), J(T.floor))
ok('T3 cold (−50): the laser = FROST LENS (ice laser eyes), cools him', T.lens.el === 'ice' && T.lens.stat === 1 && T.lens.th < -50, J(T.lens))
ok('T4 balance: the laser stays the fire Heat Lens', T.lens0 === 'fire', String(T.lens0))
ok('T5 FIRE DASH leaves fire; ICE DASH leaves ice; balance dash leaves nothing', T.dashHot.types.includes('fire') && T.dashHot.fd === 1 && T.dashCold.types.includes('ice') && T.dashCold.id === 1 && T.dash0.types.length === 0, J({ h: T.dashHot, c: T.dashCold, z: T.dash0 }))

// ═══ A. AIR SLIDE + its limit; C. FIRE CAGE ═══
const A = await page.evaluate(() => { const { H, ES, step, hold, rel, setup, aff } = __E; const r = {}
  const st = () => H.raw()._enoch
  const jumpSlide = (a, dir = 'right') => { hold(a, { jump: true }); for (let i = 0; i < 8; i++) hold(a, {}); const x0 = a.x, n0 = st().stats.airSlides; hold(a, { [dir]: true, dash: true }); for (let i = 0; i < 10; i++) hold(a, { [dir]: true }); return { dx: Math.round(a.x - x0), did: st().stats.airSlides - n0 } }
  const land = a => { rel(a); for (let i = 0; i < 90 && !(a.onGround || a.grounded); i++) step(1); step(4) }
  let { a, b } = setup(400, 2400); b.invulnTimer = 99999; H.setThermal(0)
  r.first = jumpSlide(a); r.rail = (st().rails[0] || {}).type || null; r.th = Math.round(st().th.v); r.stance = st().stance
  hold(a, { right: true, dash: true }); for (let i = 0; i < 4; i++) hold(a, { right: true }); r.sameAir = st().stats.airSlides   // a 2nd double-tap, no hop in between
  land(a)
  // THE AIR CHAIN with good timing: slide → hop (Jump right after) → slide … until he cannot any more
  ;({ a, b } = setup(200, 2900)); b.invulnTimer = 99999; H.setThermal(0); r.chain = []
  hold(a, { jump: true }); for (let i = 0; i < 6; i++) hold(a, {})
  for (let link = 0; link < 8; link++) {
    const n0 = st().stats.airSlides; hold(a, { right: true, dash: true }); let k = 0; while (st().aslide && k++ < 40) hold(a, { right: true })
    const did = st().stats.airSlides - n0, y0 = a.y; hold(a, { jump: true }); hold(a, {}); let top = 0; for (let i = 0; i < 6; i++) { hold(a, {}); top = Math.max(top, y0 - a.y) }
    r.chain.push({ did, chain: st().air.chain, rise: Math.round(top), grounded: !!(a.onGround || a.grounded) })
    if (a.onGround || a.grounded) break
  }
  r.chainMax = st().stats.maxChain; land(a)
  // a LATE hop on a deep link misses (the window shrinks): 4 links, then wait 14 frames before Jump
  ;({ a, b } = setup(200, 2900)); b.invulnTimer = 99999; H.setThermal(0); hold(a, { jump: true }); for (let i = 0; i < 6; i++) hold(a, {})
  for (let link = 0; link < 4; link++) { hold(a, { right: true, dash: true }); let k = 0; while (st().aslide && k++ < 40) hold(a, { right: true }); if (link < 3) { hold(a, { jump: true }); hold(a, {}); for (let i = 0; i < 6; i++) hold(a, {}) } }
  for (let i = 0; i < 30; i++) hold(a, {}); const hops0 = st().stats.airHops; hold(a, { jump: true }); hold(a, {}); r.late = { hops: st().stats.airHops - hops0, win: st().air.win }
  land(a); r.reset = st().air.chain
  ;({ a, b } = setup(400, 2400)); b.invulnTimer = 99999; H.setThermal(50); r.fire = jumpSlide(a); r.fireRail = (st().rails[0] || {}).type || null; land(a)
  // through the foe: one hit + chill
  ;({ a, b } = setup(700, 900)); H.setThermal(0); hold(a, { jump: true }); for (let i = 0; i < 3; i++) hold(a, {}); const hp0 = b.health   // a low slide through a grounded foe
  hold(a, { right: true, dash: true }); for (let i = 0; i < 14; i++) hold(a, { right: true }); rel(a); step(10)
  r.hit = { hits: st().stats.airSlideHits, dmg: Math.round(hp0 - b.health), chill: aff()?.chill || 0 }; land(a)
  // Ice Stance: the Ice Stream counts as a chain link (refused at the cap)
  ;({ a, b } = setup(400, 2400)); b.invulnTimer = 99999; H.setThermal(0); hold(a, { charge: true }); rel(a); step(14)
  hold(a, { jump: true }); for (let i = 0; i < 8; i++) hold(a, {}); hold(a, { right: true, dash: true }); for (let i = 0; i < 6; i++) hold(a, { right: true })
  r.stream1 = { rails: a._frozone?.stats?.rails || 0 }; land(a)
  hold(a, { jump: true }); for (let i = 0; i < 8; i++) hold(a, {}); st().air.chain = 6; hold(a, { right: true, dash: true }); for (let i = 0; i < 6; i++) hold(a, { right: true })   // at the cap
  r.stream2 = { rails: a._frozone?.stats?.rails || 0, denied: st().stats.airDenied }; land(a)
  // FIRE CAGE: burn to 5
  ;({ a, b } = setup(1000, 1200)); let res = null; for (let i = 0; i < 5; i++) res = ES.afflict(a, b, 'fire', 1)
  const x0 = b.x, hp1 = b.health; for (let i = 0; i < 30; i++) { b.x += 6; step(1) }
  r.cage = { res, held: Math.round(b.x - x0), lost: Math.round(hp1 - b.health), cage: aff().cage, cages: a._enoch.stats.cages }
  for (let i = 0; i < 130; i++) step(1); r.cageEnd = aff().cage
  return r })
ok('A1 jump + double-tap = AIR ICE SLIDE (an ice slab, he slides ~13 px/f, cools)', A.first.did === 1 && A.first.dx > 100 && A.rail === 'ice' && A.th < 0 && A.stance === 'elemental', J({ f: A.first, rail: A.rail, th: A.th }))
ok('A2 no hop / jump in between = no second slide', A.sameAir === 1, String(A.sameAir))
ok('A3 THE AIR CHAIN: slide → hop → slide … at least 5 links in one airtime, capped at 6', A.chainMax >= 5 && A.chainMax <= 6 && A.chain.filter(x => x.did).length === A.chainMax, J({ max: A.chainMax, chain: A.chain }))
ok('A3b each hop is lower than the last (it gets harder)', A.chain.filter(x => x.did && x.rise > 0).every((x, i, L) => i === 0 || x.rise <= L[i - 1].rise), J(A.chain.map(x => x.rise)))
ok('A4 the hop window shrinks: a late Jump on the 4th link misses; landing resets the chain', A.late.hops === 0 && A.reset === 0, J({ late: A.late, reset: A.reset }))
ok('A5 hot: the AIR FIRE SLIDE (a fire streak)', A.fire.did === 1 && A.fireRail === 'fire', J({ f: A.fire, rail: A.fireRail }))
ok('A6 sliding through the foe = one hit that chills', A.hit.hits === 1 && A.hit.dmg > 0 && A.hit.chill >= 1, J(A.hit))
ok('A7 Ice Stance\'s Ice Stream counts as a link of the same chain (refused past the cap)', A.stream1.rails === 1 && A.stream2.rails === 1 && A.stream2.denied >= 1, J({ a: A.stream1, b: A.stream2 }))
ok('C1 burn 5 = FIRE CAGE: held in place, burning', A.cage.res === 'cage' && A.cage.held === 0 && A.cage.lost > 0 && A.cage.cages === 1, J(A.cage))
ok('C2 the cage burns out', A.cageEnd === 0, String(A.cageEnd))

// ═══ H. HUD + screenshots ═══
fs.mkdirSync('docs/enoch/screenshots', { recursive: true })
const shot = async (name, fn) => { await page.evaluate(fn); const buf = await page.screenshot(); fs.writeFileSync(`docs/enoch/screenshots/${name}.png`, buf); return buf }
await shot('status_burn', () => { const { ES, step, setup } = __E; const { a, b } = setup(1000, 1200); for (let i = 0; i < 3; i++) ES.afflict(a, b, 'fire', 1); step(4) })
const burnPx = await page.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(c.width - 300, 32, 200, 12).data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 170 && d[i + 2] < 120) red++; return red })
await shot('status_chill', () => { const { ES, step, setup } = __E; const { a, b } = setup(1000, 1200); for (let i = 0; i < 3; i++) ES.afflict(a, b, 'ice', 1); step(4) })
const chillPx = await page.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(c.width - 300, 32, 200, 12).data; let blue = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 180 && d[i] < 150) blue++; return blue })
await shot('status_icebox', () => { const { ES, step, setup } = __E; const { a, b } = setup(1000, 1200); for (let i = 0; i < 5; i++) ES.afflict(a, b, 'ice', 1); step(4) })
await shot('status_firecage', () => { const { ES, step, setup } = __E; const { a, b } = setup(1000, 1200); for (let i = 0; i < 5; i++) ES.afflict(a, b, 'fire', 1); step(8) })
await shot('air_ice_slide', () => { const { H, hold, setup } = __E; const { a, b } = setup(500, 2200); b.invulnTimer = 99999; H.setThermal(0); hold(a, { jump: true }); for (let i = 0; i < 8; i++) hold(a, {}); hold(a, { right: true, dash: true }); for (let i = 0; i < 14; i++) hold(a, { right: true }) })
await shot('air_fire_slide', () => { const { H, hold, setup } = __E; const { a, b } = setup(500, 2200); b.invulnTimer = 99999; H.setThermal(50); hold(a, { jump: true }); for (let i = 0; i < 8; i++) hold(a, {}); hold(a, { right: true, dash: true }); for (let i = 0; i < 14; i++) hold(a, { right: true }) })
await shot('fire_shard', () => { const { H, step, setup } = __E; setup(900, 1500); H.setThermal(50); H.move('iceBlast'); step(18) })
await shot('frost_lens', () => { const { H, step, setup } = __E; setup(900, 1300); H.setThermal(-50); H.move('heatLens'); step(12) })
await shot('fire_dash', () => { const { H, hold, setup } = __E; const { a, b } = setup(700, 2200); b.invulnTimer = 99999; H.setThermal(50); hold(a, { right: true, dash: true }); for (let i = 0; i < 10; i++) hold(a, { right: true }) })
ok('H1 burn: the opponent\'s health bar glows RED', burnPx > 200, String(burnPx))
ok('H2 chill: the opponent\'s health bar glows BLUE', chillPx > 200, String(chillPx))

// ═══ R. DETERMINISM ═══
const run = () => page.evaluate(() => { const { H, step, hold, rel, setup, aff, hit } = __E
  const { a, b } = setup(1000, 1150); H.setThermal(0)
  hit('iceBlast', a); hit('iceBlast', a); H.setThermal(50); hit('iceBlast', a); for (let i = 0; i < 90; i++) step(1); hit('scorch', a); for (let i = 0; i < 200; i++) step(1)
  return JSON.stringify({ aff: aff(), hp: b.health, x: b.x, st: a._enoch.stats }) })
await run(); const d1 = await run(), d2 = await run()   // (the first run warms the stage up)
ok('R1 identical results from identical inputs', d1 === d2, d1 === d2 ? '' : d1.slice(0, 300) + ' VS ' + d2.slice(0, 300))
ok('R2 no Math.random from enoch / elements / beam', (await page.evaluate(() => __enRandom.length)) === 0)
ok('R3 no page errors', errors.length === 0, J(errors.slice(0, 3)))
await browser.close(); server.close()
console.log(`\n  ENOCH STATUS + TWINS: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
