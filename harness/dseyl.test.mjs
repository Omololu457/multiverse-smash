// harness/dseyl.test.mjs — Dseyl (tribute fighter: edited copy of Syndrome + flight + Flash Time).
//   A. RENDER CHECK: boot → pick Dseyl → start a real match → both fighters + HUD render (screenshot docs/dseyl/render_check.png),
//      no page errors, no dseyl 404s, health = 94 % of Syndrome's.
//   B. Copied kit works (Duet / Turret / Spin / chain) on Dseyl's own state, Syndrome's state untouched.
//   C. FLIGHT: Charge tap takes off, 3.5 s budget drains and expires → lands; L2 + R1 stays Syndrome's modifier (no takeoff).
//   D. FLASH TIME: Guard + Special costs 40 Power, the foe is slowed for EXACTLY 180 frames at 50 %, 600-frame cooldown,
//      rejected during cooldown / low Power / ultimate / foe already slowed.
//   E. DETERMINISM: replay frame identity + render-batching identity with drones + flight + Flash Time active.
//   F. No Math.random in dseyl*.js.
//   node harness/dseyl.test.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], r404 = new Set(); let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 260 ? d.slice(0, 260) + '…' : d) } else { fail++; console.log('  ❌', n, d.slice(0, 900)) } }
async function open(p1 = 'dseyl', p2 = 'syndrome') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() === 404) r404.add(r.url().replace(/^https?:\/\/[^/]+/, '')) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__dsRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/dseyl\w*\.js/.test(st) && __dsRandom.length < 5) __dsRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=81517`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.dseylTest, null, { polling: 100, timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 }); return page
}
const out = {}
try {
  // ── A. RENDER CHECK (real boot, real select path, real match) ──
  let page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() === 404) r404.add(r.url().replace(/^https?:\/\/[^/]+/, '')) })
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=dseyl&p2=syndrome`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.dseylTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.waitForFunction(() => __harness.spriteReady?.().ready !== false, null, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(800)
  const A = await page.evaluate(() => { const H = __harness.dseylTest, a = H.state(), b = H.state('p2'); return { a: { key: a.key, hp: a.hp, maxHp: a.maxHp, action: a.action, w: a.w, h: a.h }, bKey: b.key, bMax: b.maxHp, p2act: __harness.syndromeTest.state('p2').action, gs: __harness.state().gameState } })
  await page.screenshot({ path: 'docs/dseyl/render_check.png' })
  const px = await page.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, 140).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n })
  ok('render: boot → Dseyl vs Syndrome in a live battle, both fighters animating', A.gs === 'battle' && A.a.key === 'dseyl' && A.bKey === 'syndrome' && !!A.a.action && !!A.p2act, JSON.stringify(A))
  ok('render: HUD band drawn (non-empty top strip)', px > 5000, 'lit px ' + px)
  ok('health = 94 % of Syndrome (1109 vs 1180)', A.a.maxHp === Math.round(A.bMax * 0.94) && A.a.maxHp === 1109, `${A.a.maxHp} vs ${A.bMax}`)
  const sheets = await page.evaluate(() => [...document.querySelectorAll('img')].length)
  out.render = A

  // ── G. THE FLASH'S FEET + DOUBLE-TAP DASH / TELEPORT (ground AND flight) — real key events (the double-tap is wall-clock) ──
  const st = await page.evaluate(async () => { const { characters: C } = await import('./characters.js'); const k = ['speed', 'dashSpeed', 'dashDuration', 'dashCooldownMax']
    return { ds: k.map(x => C.dseyl.stats[x]), fl: k.map(x => C.flash.stats[x]), hp: C.dseyl.stats.maxHealth } })
  ok('ground speed + dash = the Flash\'s (speed / dashSpeed / dashDuration / dashCooldownMax)', JSON.stringify(st.ds) === JSON.stringify(st.fl) && st.hp === 1109, JSON.stringify(st))
  const sl = ms => new Promise(r => setTimeout(r, ms))
  // the double-tap window is wall-clock (240 ms): dispatch both taps in ONE page task so machine load can't stretch the gap
  const tap2 = k => page.evaluate(k => { for (let i = 0; i < 2; i++) for (const t of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true })) }, k)
  const place = (ax, bx) => page.evaluate(([ax, bx]) => { const H = __harness.dseylTest, a = H.raw(), b = H.raw('p2'); a.x = ax; b.x = bx; a.vx = 0; b.vx = 0; a.dashTeleportCooldown = 0; b.invulnTimer = 99999 }, [ax, bx])
  const snap = () => page.evaluate(() => { const H = __harness.dseylTest, a = H.raw(), b = H.raw('p2'); return { ax: a.x, ay: a.y, bx: b.x, tf: a.teleportFlash || 0, cd: a.dashTeleportCooldown || 0, fl: H.flight()?.phase, ad: H.flight()?.airDashCount || 0, dt: a.dashTimer || 0 } })
  const watch = async (n = 20) => { let m = await snap(), tf = 0; for (let i = 0; i < n; i++) { const q = await snap(); tf = Math.max(tf, q.tf); m = q; if (tf > 0) break; await sl(16) } return { ...m, tfMax: tf } }
  await place(900, 1300); await sl(120); const g0 = await snap(); await tap2('d'); const gT = await watch()
  ok('ground: double-tap TOWARD = teleport (blinks from 400 px away to right beside the foe)', gT.tfMax > 0 && gT.cd > 0 && Math.abs(gT.bx - gT.ax) < 120, JSON.stringify({ g0, gT }))
  await sl(900); await place(1300, 1700); await sl(120); const a0 = await snap(); await tap2('a'); let aD = await snap(), dtMax = 0
  for (let i = 0; i < 12; i++) { aD = await snap(); dtMax = Math.max(dtMax, aD.dt); if (dtMax) break; await sl(16) }
  ok('ground: double-tap AWAY = a dash (the engine dash, no teleport)', dtMax > 0 && aD.cd === 0 && aD.tf === 0, JSON.stringify({ a0, aD, dtMax }))
  await sl(900); await place(900, 1500); await sl(100)
  await page.keyboard.down('w'); await sl(30); await page.keyboard.up('w'); await sl(300)                 // hop
  await page.keyboard.down('p'); await sl(30); await page.keyboard.up('p')                                // Charge TAP → take off
  for (let i = 0; i < 40 && (await snap()).fl !== 'flying'; i++) await sl(25)
  await page.keyboard.down('w'); await sl(160); await page.keyboard.up('w'); await sl(80)
  const f0 = await snap(); await tap2('d'); const fT = await watch()
  ok('flight: double-tap TOWARD = teleport beside the foe and stays flying (altitude kept, not dropped to the ground)', f0.fl === 'flying' && fT.tfMax > 0 && Math.abs(fT.bx - fT.ax) < 120 && Math.abs(fT.bx - f0.ax) > 300 && fT.ay < 300 && ['flying', 'airdash'].includes(fT.fl), JSON.stringify({ f0, fT }))
  await sl(900); await place(800, 1500); await sl(60); const f1 = await snap(); await tap2('a'); await sl(120); const fD = await snap()   // foe to his right: 'a' = away
  ok('flight: double-tap AWAY = flight air dash (no teleport)', f1.fl === 'flying' && fD.ad >= 1 && fD.tf === 0, JSON.stringify({ f1, fD }))
  out.speedTeleport = { st, g0, gT, a0, aD, f0, fT, f1, fD }
  await page.close()

  // ── B. copied kit on Dseyl's own state ──
  page = await open()
  const B = await page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.dseylTest, S = __harness.syndromeTest, step = n => __harness.luffyTest.step(n)
    H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1420; a.facing = 1; b.facing = -1; a.energy = 100; step(1)
    const seen = new Set(), press = (e, n = 2) => { writeRawControls(a, e); step(n); writeRawControls(a, {}); for (let i = 0; i < 60; i++) { step(1); if (a.currentAttack) seen.add(a.currentAttack.sy?.key || a.currentAttack.name) } }
    press({ light: true }); press({ special: true }); a.energy = 100; press({ down: true, special: true }); a.energy = 100; press({ right: true, special: true })
    return { seen: [...seen], ds: !!a._dseyl, sy: !!a._syndrome, b_sy: !!b._syndrome, projOwned: H.projectiles().length, synProj: S.projectiles().length, hp2: b.health, max2: b.maxHealth } })
  ok('copied kit: Light / Hunter Duet / Deploy Turret / Spin Cycle fire on Dseyl', ['light', 'sDuet', 'sTurret', 'sSpin'].every(k => B.seen.includes(k)), JSON.stringify(B))
  ok('Dseyl runs on f._dseyl only (no f._syndrome on him; Syndrome harness sees none of his machines)', B.ds && !B.sy && B.synProj === 0, JSON.stringify(B))

  // ── C. FLIGHT ──
  const C = await page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.dseylTest, step = n => __harness.luffyTest.step(n)
    H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1200; b.x = 1700; a.facing = 1; b.facing = -1; a.energy = 100; b.invulnTimer = 9999; step(20)
    const tap = () => { writeRawControls(a, { charge: true }); step(3); writeRawControls(a, {}); step(6) }
    const g0 = H.flight(); tap(); const f1 = H.flight(), y1 = a.y
    let peakV = 0; writeRawControls(a, { up: true, jump: true, right: true }); for (let i = 0; i < 30; i++) { step(1); peakV = Math.max(peakV, Math.abs(a.vx)) }   // keyboard W = up AND jump (shared key)
    writeRawControls(a, {}); const f2 = H.flight(), y2 = a.y
    let frames = 0, zeroAt = -1; while (H.flight().phase !== 'grounded' && H.flight().phase !== 'landing' && frames < 900) { step(1); frames++; if (zeroAt < 0 && H.flight().energy <= 0) zeroAt = 30 + frames }   // +30 = the climb above
    const land = H.flight(); step(30); const after = H.flight(), grounded = !!(a.onGround || a.grounded)
    // L2 + R1 = Syndrome's modifier (Zero-Point) → no takeoff
    H.reset(); a.x = 1300; b.x = 1400; a.energy = 100; step(5)
    writeRawControls(a, { charge: true }); step(2); writeRawControls(a, { charge: true, special: true }); step(2); writeRawControls(a, {}); let atk = null
    for (let i = 0; i < 30; i++) { step(1); atk = atk || a.currentAttack?.sy?.key } const mod = H.flight()
    // air dashes: 2 then refused
    H.reset(); a.x = 1200; b.x = 1800; a.energy = 100; step(5); tap(); step(10)
    const dash = () => { writeRawControls(a, { dash: true, right: true }); step(1); writeRawControls(a, {}); step(16) }
    dash(); dash(); dash(); const dashes = H.flight().airDashCount
    return { g0, f1, f2, y1, y2, peakV, frames, zeroAt, land, after, grounded, mod, atk, dashes } })
  ok('flight: Charge tap takes off (takeoff/flying) and Up rises', ['takeoff', 'flying'].includes(C.f1.phase) && C.y2 < C.y1 - 40, JSON.stringify({ f1: C.f1, y1: C.y1, y2: C.y2 }))
  ok('flight: twice Superman\'s speed (faster than his 22 px/f cap, ≤ 44 px/f horizontal)', C.peakV <= 44.01 && C.peakV > 22, 'vx ' + C.peakV)
  ok('flight: 3.5 s budget (210) drains and EXPIRES → he comes down and lands', C.zeroAt > 150 && C.zeroAt <= 216 && C.grounded && C.after.phase === 'grounded', JSON.stringify({ zeroAt: C.zeroAt, frames: C.frames, land: C.land, after: C.after }))
  ok('flight: L2 + R1 stays Syndrome\'s modifier (Zero-Point) and never takes off', C.atk === 'sZero' && C.mod.phase === 'grounded', JSON.stringify({ atk: C.atk, mod: C.mod }))
  ok('flight: 2 air dashes per flight (third refused)', C.dashes === 2, 'dashes ' + C.dashes)
  out.flight = C

  // ── D. FLASH TIME ──
  const D = await page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.dseylTest, step = n => __harness.luffyTest.step(n)
    H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1200; b.x = 1500; a.facing = 1; b.facing = -1; a.energy = 100; b.invulnTimer = 99999; step(5)
    const press = () => { writeRawControls(a, { block: true, special: true }); step(1); writeRawControls(a, { block: true }); step(1); writeRawControls(a, {}) }
    // one frame-by-frame loop from the activation frame. The engine (_updateGodspeedTimeSlow) runs BEFORE Dseyl's tick
    // each frame, so the value it sees on a step is `left` as it stood BEFORE that step.
    const e0 = a.energy; writeRawControls(a, { block: true, special: true }); step(1); const t0 = H.ft(), e1 = a.energy
    let active = 0, skipped = 0
    for (let i = 0; i < 400; i++) { const before = H.ft()?.left || 0; writeRawControls(a, i === 0 ? { block: true } : {}); step(1); if (before > 0) active++; if (H.foeSlow().flag) skipped++ }
    const t1 = H.ft()
    // cooldown: rejected while cd > 0, accepted after
    a.energy = 100; press(); const rejCd = H.ft()
    for (let i = 0; i < 700; i++) step(1); a.energy = 100; press(); const okAfter = H.ft()
    // low Power
    H.reset(); a.energy = 30; step(2); press(); const rejE = H.ft()
    // foe already slowed
    H.reset(); a.energy = 100; step(2); a._godspeedActive = true; step(3); const slowedBy = H.foeSlow(); press(); const rejSlow = { ...H.ft(), slowedBy }; a._godspeedActive = false; step(2)   // another slow source on the foe (the shared engine's Godspeed branch)
    // during the ultimate
    H.reset(); a.x = 1300; b.x = 1410; a.facing = 1; b.facing = -1; a.energy = 100; b.invulnTimer = 0; step(2); H.move('ultOpen')
    let inUlt = false; for (let i = 0; i < 80 && !inUlt; i++) { step(1); inUlt = H.ult().active }
    a.energy = 100; press(); const duringUlt = { inUlt, ft: H.ft(), active: H.ult().active }
    return { e0, e1, t0, active, skipped, t1, rejCd, okAfter, rejE, rejSlow, duringUlt } })
  ok('Flash Time: Guard + Special starts it and costs 40 Power (shared bar)', D.t0?.left === 180 && Math.round(D.e0 - D.e1) === 40, JSON.stringify({ t0: D.t0, e0: D.e0, e1: D.e1 }))
  ok('Flash Time: slows the opponent for EXACTLY 180 frames', D.active === 180 && D.t1.frames === 180, JSON.stringify({ active: D.active, t1: D.t1 }))
  ok('Flash Time: opponent at 50 % (half of the 180 frames skipped)', D.skipped === 90, 'skipped ' + D.skipped)
  ok('Flash Time: 600-frame cooldown — rejected during it, accepted after', D.rejCd.lastReject === 'cooldown' && D.rejCd.uses === 1 && D.okAfter.uses === 2, JSON.stringify({ rejCd: D.rejCd, okAfter: D.okAfter }))
  ok('Flash Time: rejected below 40 Power', D.rejE?.lastReject === 'energy' && D.rejE.uses === 0, JSON.stringify(D.rejE))
  ok('Flash Time: rejected while the opponent is already slowed', D.rejSlow?.lastReject === 'foeSlowed' && D.rejSlow.uses === 0, JSON.stringify(D.rejSlow))
  ok('Flash Time: cannot start during his ultimate', D.duringUlt.inUlt && !(D.duringUlt.ft?.left > 0), JSON.stringify(D.duringUlt))
  out.flashTime = D

  // ── E. DETERMINISM: replay + batching with drones + flight + Flash Time ──
  await page.close(); page = await open()
  const SCRIPT = `(()=>{return (i,a,b)=>{const r={},fw=b.x>=a.x?'right':'left';const m=i%900
    if(m<40)r[fw]=true
    else if(m===50||m===51)r.special=true                                  // Hunter Duet (drones)
    else if(m>=90&&m<93)r.charge=true                                       // Charge tap → take off
    else if(m>=100&&m<160){r.up=m<130;r[fw]=true}                           // fly
    else if(m===170||m===171){r.block=true;r.special=true}                  // Flash Time (in the air)
    else if(m>=172&&m<174)r.block=true
    else if(m===200)r.light=true                                            // air command
    else if(m>=260&&m<263)r.charge=true                                     // come down
    else if(m===400||m===401){r.down=true;r.special=true}                   // turret
    else if(m===480)r.light=true
    else if(m===600||m===601){r.block=true;r.special=true}                  // Flash Time on the ground (or cooldown reject)
    return r}})()`
  const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.jumpCount,f._timeSlowFlag||false,f._timeSlowAcc||0,f._flightCtl&&{...f._flightCtl},f._dseyl&&{...f._dseyl,cues:undefined},f.currentAttack&&{name:f.currentAttack.name,timer:f.currentAttack.timer}]`
  const N = 2700
  const rec = await page.evaluate(async ([src, dig, N]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.dseylTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set()
    for (let i = 0; i < N; i++) { if (i % 300 === 0) a.energy = 100; writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack) seen.add(a.currentAttack.sy?.key || a.currentAttack.name); if (a._flightCtl && a._flightCtl.phase === 'flying') seen.add('flying'); if (a._dseyl?.ft?.left > 0) seen.add('flashTime'); if (a._dseyl?.mobile) seen.add('drones')
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG, N])
  ok('scenario exercises drones + flight + Flash Time', ['drones', 'flying', 'flashTime', 'sDuet', 'sTurret'].every(k => rec.seen.includes(k)), JSON.stringify(rec.seen))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', !!v.ok, JSON.stringify(v).slice(0, 300))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.dseylTest, t = []; for (let i = 0; i < n; i++) { if (i % 300 === 0) H.raw().energy = 100; __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote: !!H.raw()._dseylRemoteInput } }, [N, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i])
  ok(`replay matches every frame (${N}) with drones + flight + Flash Time`, first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync; playback marks Dseyl remote-driven', !pb.st.desync && pb.remote, JSON.stringify(pb.st))
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const { resetFlight } = await import('./flight.js'); const { camera } = await import('./camera.js'); const H = __harness.dseylTest
    const run = stepper => { H.reset(); camera.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0   // resetTraining keeps dash / flight state → clear it so each run starts identical
        f.dashTimer = 0; f.dashCooldown = 0; f.airDashing = false; f.airDashTimer = 0; f.airDashCount = 0; f.dashTeleportCooldown = 0; f.teleportFlash = 0; if (f._flightCtl) resetFlight(f) } const t = [], SS = eval(src)
      for (let i = 0; i < 1800; i += 4) { if (i % 300 === 0) a.energy = 100; writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._flightCtl?.phase, a._dseyl?.ft, a._dseyl?.mobile, a.currentAttack?.name])) } return t }
    run(() => __harness.luffyTest.step(4))
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  const rnd = await page.evaluate(() => __dsRandom); ok('no Math.random in dseyl*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no dseyl asset 404s', ![...r404].some(u => /dseyl/i.test(u)), JSON.stringify([...r404].filter(u => /dseyl/i.test(u))))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} catch (e) { fail++; console.log('  ❌ harness error', e.stack) }
finally {
  fs.writeFileSync('docs/dseyl/test_results.json', JSON.stringify({ pass, fail, ...out, flight: out.flight && { ...out.flight } }, null, 1) + '\n')
  console.log(`\n  DSEYL: ${pass} passed, ${fail} failed`); await browser.close(); server.close(); process.exit(fail ? 1 : 0)
}
