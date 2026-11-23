// harness/omniman_viltrum_flight.test.mjs — MSV1-OMNIMAN Phase 2: VILTRUMITE FLIGHT through REAL keyboard input and the
// live engine (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge, ; block, WASD).
// Measures: top speed = 1.3 × the fastest flier, acceleration 1.25 ×, coast ≈ 2.5 × Homelander's, ≈ 0.6 s to reverse,
// steering ≤ 25° / 10 frames at top speed, BRAKE 80 % in 10 frames, no block above 40 %, speed-scaled damage,
// sonic boom (once per acceleration), wall crash (≥ 70 %), hard landing (≥ 70 %). Writes docs/msv1/omniman/flight_results.json.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], R = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, d) }
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.omnimanViltrumTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
const st = (w = 'p1') => S('H.state(a)', w)
async function hold(keys, n) { for (const k of keys) await page.keyboard.down(k); await step(n); for (const k of keys) await page.keyboard.up(k) }
const tap = (keys, n = 2) => hold(keys, n)
async function reset(o = {}) {
  await page.evaluate(o => { const H = __harness.omnimanViltrumTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = o.x ?? 1300; b.x = o.bx ?? (a.x + (o.gap ?? 300)); a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = f.maxEnergy; f.comboCounter = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f.isBlocking = false
      f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f._forceGuard = false; f.ultimateCooldown = 0 } }, o)
  await step(2)
}
async function takeoff() { await tap(['p'], 3); for (let i = 0; i < 30; i++) { await step(1); const s = await st(); if (s.flying && s.flight?.phase !== 'takeoff') return true } return (await st()).flying }
const deg = r => r * 180 / Math.PI

try {
  await page.goto(server.base + `/index.html?harness=1&p1=omniman_viltrum&p2=homelander&seed=40517`); await page.waitForFunction(() => window.__harness?.omnimanViltrumTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone?.()); await step(3)
  const D = await S('H.data()'), PR = await S('H.profiles()')
  let s = await st()
  ck('P1 is omniman_viltrum (HP = Homelander 1050, heavy)', s.key === 'omniman_viltrum' && s.maxHp === 1050, JSON.stringify([s.key, s.maxHp]))
  // ── numbers vs the roster's fliers ──
  const others = Object.entries(PR).filter(([k]) => k !== 'omniman_viltrum' && k !== 'jetray_mach')
  const fastest = others.reduce((m, [k, p]) => (p.maxH > m.maxH ? { k, ...p } : m), { maxH: 0 })
  const me = PR.omniman_viltrum
  R.numbers = { fastest: fastest.k, fastestMaxH: fastest.maxH, fastestAccel: fastest.accel, top: me.maxH, accel: me.accel, drag: me.drag, homelanderDrag: PR.homelander?.drag }
  ck('top speed = 1.3 × the fastest flier', Math.abs(me.maxH - fastest.maxH * 1.3) < 0.01, JSON.stringify(R.numbers))
  ck('acceleration = 1.25 × the fastest flier', Math.abs(me.accel - fastest.accel * 1.25) < 0.01)
  const coast = d => d / (1 - d), ratio = coast(me.drag) / coast(PR.homelander.drag)
  R.numbers.coastRatio = +ratio.toFixed(3)
  ck('coast distance ≈ 2.5 × Homelander (same speed, drag)', Math.abs(ratio - 2.5) < 0.05, String(ratio))

  // ── takeoff + top speed + acceleration (real input) ──
  await reset({ x: 300, bx: 2700 })
  ck('Charge TAP → takes off', await takeoff(), JSON.stringify((await st()).flight))
  await page.keyboard.down('d'); const sp = []
  for (let i = 0; i < 16; i++) { await step(1); sp.push(+(await st()).speed.toFixed(2)) }
  await page.keyboard.up('d')
  R.accel = sp
  const top = Math.max(...sp)
  ck('reaches top speed 57.2 (never above)', top > 56.5 && top <= 57.2 + 1e-6, JSON.stringify(sp))
  ck('acceleration ≈ 5.5 / frame early (1.25 × Dseyl)', sp[1] - sp[0] > 4 && sp[1] - sp[0] <= 5.6, JSON.stringify(sp.slice(0, 4)))
  s = await st()
  ck('sonic boom fired once crossing 90 %', s.s.stats.booms === 1, String(s.s.stats.booms))
  ck('… above 40 % he cannot block (guard = brake only)', s.noBlock === true)

  // ── coast: one-frame decay = drag ──
  const v0 = (await st()).speed; await step(1); const v1 = (await st()).speed
  R.coast = { v0, v1, k: +(v1 / v0).toFixed(4) }
  ck('no input → coasts on drag 0.9292 / frame', Math.abs(v1 / v0 - me.drag) < 0.01, JSON.stringify(R.coast))

  // ── BRAKE: hold guard 10 frames at speed → ≥ 80 % of the speed gone; not blocking ──
  await reset({ x: 300, bx: 2700 }); await takeoff(); await hold(['d'], 14)
  const b0 = (await st()).speed; await page.keyboard.down(';'); let blk = false; const acts = []
  for (let i = 0; i < 10; i++) { await step(1); const q = await st(); acts.push(q.action); if (q.blocking && q.frac > 0.4) blk = true }
  const b1 = (await st()); await page.keyboard.up(';')
  R.brake = { from: +b0.toFixed(2), after10: +b1.speed.toFixed(2), lost: +(1 - b1.speed / b0).toFixed(3), braking: b1.brake }
  ck('BRAKE (guard) kills ≥ 80 % of speed in 10 frames', b1.speed <= b0 * 0.2 + 0.01, JSON.stringify(R.brake))
  ck('… never blocks while above 40 %', !blk)
  ck('… brake pose = R13 cape-flip (brake strip) while fast', acts.slice(0, 4).some(a => /brake|flyDive/.test(String(a))), JSON.stringify(acts))

  // ── REVERSE: at top speed rightward, hold left → frames until vx ≤ 0 ≈ 0.6 s (36 f) ──
  await reset({ x: 200, bx: 2300 }); await takeoff(); await hold(['d'], 11)
  await page.keyboard.down('a'); let n = 0; const rv = []
  for (; n < 90; n++) { await step(1); const q = await st(); rv.push([+q.vx.toFixed(1), Math.round(q.x), q.s.crash]); if (q.vx <= 0) break }
  await page.keyboard.up('a')
  R.reverse = { frames: n + 1, seconds: +((n + 1) / 60).toFixed(2), series: rv }
  ck('reverse from top speed takes ≈ 0.6 s (30–42 f)', n + 1 >= 30 && n + 1 <= 42, JSON.stringify(R.reverse).slice(0, 900))

  // ── STEERING: at top speed, hold up-right → heading change over 10 frames ≤ 25° ──
  await reset({ x: 300, bx: 2700 }); await takeoff(); await hold(['d'], 14)
  let q0 = await st(); const a0 = Math.atan2(q0.vy, q0.vx)
  await page.keyboard.down('w'); await step(10); let q1 = await st(); await page.keyboard.up('w')
  const turn = Math.abs(deg(Math.atan2(q1.vy, q1.vx) - a0))
  R.steer = { deg10: +turn.toFixed(2), speedBefore: +q0.speed.toFixed(1), speedAfter: +q1.speed.toFixed(1) }
  ck('steering at top speed ≤ 25° per 10 frames (and actually turns)', turn > 5 && turn <= 25.5, JSON.stringify(R.steer))

  // ── WALL CRASH: full speed into the left stage wall ──
  await reset({ x: 900, bx: 2700 }); await takeoff()
  const hp0 = (await st()).hp; await page.keyboard.down('a'); let crashed = null
  for (let i = 0; i < 60; i++) { await step(1); const q = await st(); if (q.s.crash > 0) { crashed = q; break } }
  await page.keyboard.up('a')
  R.crash = crashed ? { hpLost: hp0 - crashed.hp, frames: crashed.s.crash, x: Math.round(crashed.x), action: crashed.action } : null
  ck('≥ 70 % into a wall → crash (28 f crumple)', !!crashed && crashed.s.crash >= 26 && crashed.s.crash <= 28, JSON.stringify(R.crash))
  ck('… 25 self-damage', !!crashed && hp0 - crashed.hp >= 24 && hp0 - crashed.hp <= 26, JSON.stringify(R.crash))
  if (crashed) { await step(30); const q = await st(); ck('… then recovers (grounded, crash over)', q.s.crash === 0 && q.grounded, JSON.stringify([q.s.crash, q.grounded])) }

  // ── HARD LANDING: dive at speed into the floor next to the foe ──
  await reset({ x: 1200, gap: 90 }); await takeoff(); await hold(['w'], 18)
  const fhp0 = (await st('p2')).hp; await page.keyboard.down('s'); let landed = null
  for (let i = 0; i < 60; i++) { await step(1); const q = await st(); if (q.s.land > 0) { landed = q; break } }
  await page.keyboard.up('s'); await step(2)
  const foe = await st('p2')
  R.land = landed ? { recovery: landed.s.land, foeLost: fhp0 - foe.hp, stats: landed.s.stats.hardLands } : { last: await st() }
  ck('diving ≥ 70 % into the floor → hard landing (14 f recovery)', !!landed && landed.s.land >= 12 && landed.s.land <= 14, JSON.stringify(R.land).slice(0, 300))
  ck('… shockwave hits a foe beside him (50 raw)', !!landed && fhp0 - foe.hp >= 47, JSON.stringify(R.land).slice(0, 200))

  // ── SPEED IS DAMAGE: standing jab vs a flight punch at top speed ──
  await reset({ gap: 70 }); let e0 = (await st('p2')).hp; await tap(['j'], 2); await step(16)
  const jab = e0 - (await st('p2')).hp
  await reset({ x: 400, bx: 2300 }); await takeoff(); await S('H.place(400, 380)'); await page.keyboard.down('d'); let fired = false, hitAt = null
  for (let i = 0; i < 40; i++) { await step(1); const q = await st(), f = await st('p2'); if (!fired && f.x - q.x < 420 && q.frac > 0.85) { await tap(['j'], 1); fired = true } if (q.s.stats.hits > 0) { hitAt = q; break } }
  await page.keyboard.up('d'); await step(4)
  R.speedDmg = { jab, flightHit: hitAt ? { mult: hitAt.s.stats.lastMult, frac: hitAt.s.stats.lastFrac } : null }
  ck('standing Jab = 38 (+0 %; dmg() cancels the engine ×0.6)', jab >= 36 && jab <= 40, String(jab))
  ck('flight punch at top speed hits with +50…60 % multiplier', !!hitAt && hitAt.s.stats.lastMult >= 1.5 && hitAt.s.stats.lastMult <= 1.6, JSON.stringify(R.speedDmg))

  ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally {
  fs.mkdirSync('docs/msv1/omniman', { recursive: true }); fs.writeFileSync('docs/msv1/omniman/flight_results.json', JSON.stringify({ pass, fail, R, errors }, null, 1))
  console.log(`\nOMNI-MAN FLIGHT: ${pass} passed, ${fail} failed`); await browser.close(); server.close(); process.exit(fail ? 1 : 0)
}
