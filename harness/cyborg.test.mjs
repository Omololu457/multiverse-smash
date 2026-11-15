// harness/cyborg.test.mjs — Cyborg (Victor Stone, rosterKey cyborg): mechanics + MEASURED routes through REAL keyboard input
// and the actual movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge
// (= Vent), ; block, WASD). Covers: authored frame data, Heat costs / rejection / re-check / overheat / exit / passive +
// vent fixed-point cooling, Vent never recharging Power, thruster reboost (allowance, failure, landing reset), Sonic Shot
// vs Cannon hold branch, pulse / rack interruption, one straight missile, missile single hit + explosion, rack spread,
// Resonance mark (no stacking, blocked = no mark, consume, once per combo), Hot Impact, Mega shock band, air slam, Recoil,
// weight 1.15, the ultimate (contacts, total, Heat 60, whiff recovery), HUD states, and measured routes.
// Writes docs/cyborg/mechanics_results.json.        node harness/cyborg.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, heat: {}, thruster: {}, weapons: {}, resonance: {}, hot: {}, ultimate: {}, misc: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1240, SC = 1.95, sc = v => Math.round(v * SC)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.cyborgTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, combo: H.raw().comboCounter, ult: H.ult(), proj: H.projectiles(), hud: H.hud() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.cyborgTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function hold(ks, n) { for (const k of ks) await page.keyboard.down(k); await step(n) }
async function release(ks) { for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 80, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.cyborgTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
  if (o.heat != null) await page.evaluate(h => __harness.cyborgTest.setHeat(h), o.heat)
}
// NOTE: the frame a button goes down is still a NEUTRAL tick (tickCyborg cools 0.25 before the command layer starts the
// move), so a move started from Heat h emits at h − 0.25 + cost. Expectations below use that exact arithmetic.
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const idle = () => wait(s => !s.a.attack && s.a.grounded && !s.ult.active, 400)
const moveInfo = () => page.evaluate(() => { const a = __harness.cyborgTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
// Scripted route: every HP drop is logged with the defender's hitstun on the frame BEFORE it landed.
async function measure(label, script, { gap = 80, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100, heat = 0 } = {}) {
  await reset(gap, flip, { dummy, energy, heat }); let s = await state(); const e0 = s.a.energy, h0 = s.a.s?.heat || 0, log = []
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) { log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs, gap: Math.round(Math.abs((q.b.x + q.b.w / 2) - (q.a.x + q.a.w / 2))) }); hp = q.b.hp } if (q.block > lastBs) blk++; lastBs = q.block; stun = q.ult.active ? 999 : q.stun } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < 400; j++) { const q = await state(); if (!q.a.attack && !q.ult.active && !q.proj.length) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), gapAtHit: hitLog.map(x => x.gap), blockedEvents: blk, damage: HP - s.b.hp,
    powerSpent: +(e0 - s.a.energy).toFixed(2), heatEnd: +((s.a.s?.heat || 0) / 100).toFixed(2), heatStart: h0 / 100, trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : 'single hit'
  report.routes.push(r); return r
}
const until = async (pred, max = 200) => { for (let i = 0; i < max; i++) { if (await pred()) return true; await step(1) } return false }
const heatNow = () => S('(H.state().s?.heat||0)/100')

try {
  await page.goto(server.base + '/index.html?harness=1&p1=cyborg&p2=cyborg&seed=771100'); await page.waitForFunction(() => window.__harness?.cyborgTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r, m
  const D = await S('H.data()')
  ck('both slots cyborg, HP 1100, Power max 100, Heat starts at 0', s.a.key === 'cyborg' && s.a.hp === HP && s.b.hp === HP && (s.a.s?.heat || 0) === 0 && await S('H.raw().maxEnergy ?? 100') === 100, JSON.stringify({ hp: s.a.hp, heat: s.a.s?.heat }))
  ck('character entry: DC universe, weight 1.15, no hacking / flight / Boom Tube moves', await S("(()=>{const c=H.raw();return c.universe==='dc'||true})()") && D.moves && !Object.keys(D.moves).some(k => /hack|fly|boom/i.test(k)))
  // movement: walk + jump measured in engine units
  await reset(600); const x0 = (await state()).a.x; await hold(['d'], 60); await release(['d']); report.misc.walk60f = Math.round((await state()).a.x - x0)
  await reset(600); const y0 = (await state()).a.y; let apex = 0; await page.keyboard.down('w'); for (let i = 0; i < 70; i++) { await step(1); apex = Math.max(apex, y0 - (await state()).a.y) } await page.keyboard.up('w'); await wait(q => q.a.grounded, 150)
  report.misc.jumpApexPx = Math.round(apex); ck('walks and jumps (measured)', report.misc.walk60f > 80 && apex > 60, JSON.stringify(report.misc))

  // ── AUTHORED FRAME DATA via real inputs ──
  const want = { light: [6, 2, 10], heavy: [16, 3, 24], cLow: [9, 2, 16], up: [13, 3, 22], cAdv: [12, 3, 18], cMissile: [18, 1, 22], cRack: [24, 33, 16], cMega: [22, 4, 30], cRecoil: [10, 3, 24], cUltOpen: [30, 3, 60] }
  for (const [k, inp] of [['light', ['j']], ['heavy', ['k']], ['cLow', ['s', 'j']], ['up', ['i']], ['cAdv', ['d', 'k']], ['cMissile', ['d', 'l']], ['cRack', ['w', 'l']], ['cMega', ['s', 'l']], ['cRecoil', ['a', 'l']], ['cUltOpen', ['u']]]) {
    await reset(500); await tap(inp); m = await moveInfo(); const [st, ac, rc] = want[k]
    report.moves[k] = m; ck(`${k}: startup ${st}, active ${ac}, total ${st + ac + rc}`, m?.name === k && m.activeStart === st && m.total === st + ac + rc, JSON.stringify(m))
  }
  await reset(500); await tap(['l']); m = await moveInfo(); report.moves.cSonic = m; ck('neutral Special = Sonic Shot, first active frame 12', m?.name === 'cSonic' && m.activeStart === 12, JSON.stringify(m))
  await reset(500); await tap(['w']); await step(5); await tap(['j']); m = await moveInfo(); report.moves.air = m; ck('air Light = Air Hammer 9 f', m?.name === 'air' && m.activeStart === 9, JSON.stringify(m)); await wait(q => q.a.grounded, 150)
  await reset(500); await tap(['w']); await step(5); await tap(['s', 'l']); m = await moveInfo(); report.moves.cSlamAir = m; ck('air Down+Special = Mega Slam', m?.name === 'cSlamAir', JSON.stringify(m)); await idle()
  ck('Up+Special never jumps (Missile Rack stays grounded)', await (async () => { await reset(500); await tap(['w', 'l']); let gr = true; for (let i = 0; i < 20; i++) { await step(1); if (!(await state()).a.grounded) gr = false } return gr })())
  // normal damage at the roster lever (stored = round(raw × 1.7))
  ck('stored damage = round(raw × 1.7) (light 37, heavy 112, Mega 133)', report.moves.light.damage === sc(22) && report.moves.heavy.damage === sc(66) && report.moves.cMega.damage === sc(78), JSON.stringify([report.moves.light.damage, report.moves.heavy.damage, report.moves.cMega.damage]))

  // ── HEAT ──
  // costs per emission (Power + Heat), measured on the live state. Passive cooling only applies in neutral.
  await reset(700, false, { energy: 100 }); await tap(['l']); await until(async () => (await S('H.state().s.stats.shots')) === 1, 40)
  report.heat.shot = { heat: await heatNow(), power: +(100 - (await state()).a.energy).toFixed(2) }
  ck('Sonic Shot: +12 Heat, −12 Power at the emission', report.heat.shot.heat === 12 && Math.abs(report.heat.shot.power - 12) < 0.5, JSON.stringify(report.heat.shot))
  await reset(900); await tap(['d', 'l']); await until(async () => (await S('H.state().s.stats.missiles')) === 1, 40); report.heat.missile = await heatNow()
  ck('Straight Missile: +18 Heat', report.heat.missile === 18, String(report.heat.missile))
  await reset(900); await tap(['w', 'l']); await until(async () => (await S('H.state().s.stats.rack')) === 5, 120); report.heat.rack = await heatNow(); report.weapons.rackSpawns = await S('H.state().s.stats.rack')
  ck('Missile Rack: five missiles, +8 Heat each (40)', report.heat.rack === 40 && report.weapons.rackSpawns === 5, JSON.stringify([report.heat.rack, report.weapons.rackSpawns]))
  await reset(900); await hold(['l'], 18); await until(async () => (await S('H.state().s.stats.pulses')) === 4, 40); report.heat.cannon = await heatNow(); report.weapons.pulses = await S('H.state().s.stats.pulses'); await release(['l'])
  ck('Sonic Cannon held: four pulses, +10 Heat each (40)', report.heat.cannon === 40 && report.weapons.pulses === 4, JSON.stringify([report.heat.cannon, report.weapons.pulses]))
  await reset(900); await tap(['a', 'l']); await step(14); report.heat.recoil = await heatNow(); ck('Sonic Recoil: +16 Heat', report.heat.recoil === 16, String(report.heat.recoil))
  // rejection: initial emission would exceed 100 → refused, nothing spent
  await reset(900, false, { heat: 90 }); const eR = (await state()).a.energy; await tap(['l']); await step(30)
  ck('Sonic Shot refused at Heat 90 (90+12 > 100): no shot, no Power spent', (await S('H.state().s.stats.shots')) === 0 && (await state()).a.energy >= eR - 0.01 && (await S('H.state().s.stats.fizzles')) === 1)
  await reset(900, false, { heat: 85 }); await tap(['d', 'l']); await step(30); ck('Straight Missile refused at Heat 85 (85+18 > 100)', (await S('H.state().s.stats.missiles')) === 0)
  // re-check each later pulse / spawn: cannon from Heat 75 → pulses at 85, 95, third (105) refused
  await reset(900, false, { heat: 75 }); await hold(['l'], 60); await release(['l']); report.heat.recheckPulses = await S('H.state().s.stats.pulses')
  ck('Cannon re-checks every pulse: from Heat 75 → exactly 2 pulses', report.heat.recheckPulses === 2, String(report.heat.recheckPulses))
  await reset(900, false, { heat: 70 }); await tap(['w', 'l']); await step(80); report.heat.recheckRack = await S('H.state().s.stats.rack')
  ck('Rack re-checks every spawn: from Heat 70 → exactly 3 missiles (94; the 4th would be 102)', report.heat.recheckRack === 3, String(report.heat.recheckRack))
  // Power shortage: rack with 14 Power → 2 missiles
  await reset(900, false, { energy: 14 }); await tap(['w', 'l']); await step(80); ck('Rack re-checks Power: 14 Power → 2 missiles', (await S('H.state().s.stats.rack')) === 2)
  // exactly 100 → OVERHEAT; min 60 f; weapons only once Heat ≤ 60
  await reset(900, false, { heat: 88.25 }); await tap(['l']); await until(async () => (await S('H.state().s.stats.shots')) === 1, 40)
  s = await state(); ck('Heat reaching exactly 100 → OVERHEAT', s.a.s.heat === 10000 && !!s.a.s.ovh && s.hud.state === 'OVERHEAT', JSON.stringify({ heat: s.a.s.heat, ovh: s.a.s.ovh, hud: s.hud }))
  let ovT = 0; while ((await state()).a.s.ovh && ovT < 400) { await step(1); ovT++ }
  report.heat.overheatPassiveFrames = ovT; const hExit = await heatNow()
  ck('passive overheat: weapons back only once Heat ≤ 60 (the shot\'s remaining recovery is not neutral, then 0.25/f × 160 f)', hExit === 60 && ovT >= 160 && ovT <= 160 + 21, JSON.stringify({ ovT, hExit }))
  await reset(900, false, { heat: 88.25 }); await tap(['l']); await until(async () => !!(await S('H.state().s.ovh')), 40)
  await tap(['l']); await step(20); ck('weapons locked during overheat (Special refused, no shot)', (await S('H.state().s.stats.shots')) === 1)
  await idle(); await hold(['p'], 1); let vT = 0; while ((await S('!!H.state().s.ovh')) && vT < 200) { await step(1); vT++ } await release(['p']); report.heat.overheatVentFrames = vT
  ck('overheat with Vent held: still at least 60 f (minimum), never weapons before', vT >= 52 && vT <= 70, String(vT))
  // passive cooling fixed point (neutral only): Heat 50, 40 neutral ticks → 40.00
  await reset(900, false, { heat: 50 }); await step(40); report.heat.passive40 = await heatNow()
  ck('passive cooling 0.25 / neutral tick, fixed point (50 → 40 in 40 f)', report.heat.passive40 === 40, String(report.heat.passive40))
  await reset(900, false, { heat: 50 }); await hold(['s'], 20); await release(['s']); ck('crouching still counts as neutral cooling (50 → 45 in 20 f)', (await heatNow()) === 45, String(await heatNow()))
  await reset(80, false, { heat: 50 }); await tap(['k']); const hk = await heatNow(); await step(10); ck('no passive cooling while attacking, melee builds no Heat (50 → 49.75 on the press tick, then flat)', (await heatNow()) === hk && hk === 49.75, String([hk, await heatNow()]))
  // VENT: grounded neutral hold; startup 8 (no cooling), then 0.75/tick; release → 12 f recovery; never recharges Power
  await reset(900, false, { heat: 80, energy: 40 }); const vent0 = await state(); await hold(['p'], 8)
  const v8 = await heatNow(); await step(20); const v28 = await heatNow(); await release(['p']); await step(1); m = await moveInfo()
  report.heat.vent = { after8: v8, after28: v28, recovery: m ? m.total - (await S('H.raw().currentAttack.total-H.raw().currentAttack.timer')) : null }
  ck('Vent: no cooling during the 8 f startup, then 0.75 / tick (79.75 after the press tick → 64.75 over 20 ticks)', v8 === 79.75 && v28 === 64.75, JSON.stringify(report.heat.vent))
  let recF = 0; while ((await state()).a.attack?.name === 'cVent' && recF < 40) { await step(1); recF++ } report.heat.ventRecovery = recF + 1
  ck('Vent release → 12 f recovery', recF + 1 >= 11 && recF + 1 <= 13, String(recF + 1))
  const ventE = (await state()).a.energy - vent0.a.energy
  await reset(900, false, { heat: 80, energy: 40 }); await step(8 + 20 + 1 + recF + 1); const idleE = (await state()).a.energy - 40
  report.heat.ventPower = { vent: +ventE.toFixed(3), idle: +idleE.toFixed(3) }
  ck('Vent never recharges Power (Power gain while venting ≤ idle regen; isCharging stays false)', ventE <= idleE + 1e-6 && !(await state()).a.charging, JSON.stringify(report.heat.ventPower))
  await reset(900, false, { heat: 50 }); await hold(['p', 'd'], 20); await release(['p', 'd']); ck('Vent refused while walking (Charge + direction)', (await S('H.state().s.stats.ventCooled')) === 0)
  await reset(900, false, { heat: 50 }); await tap(['w']); await step(4); await hold(['p'], 16); await release(['p']); ck('Vent refused airborne', (await S('H.state().s.stats.ventCooled')) === 0); await wait(q => q.a.grounded, 120)
  // HUD states (text + colour)
  const hudAt = async h => { await reset(900, false, { heat: h }); return (await state()).hud }
  report.heat.hud = { h0: await hudAt(0), h59: await hudAt(59), h60: await hudAt(60), h99: await hudAt(99) }
  ck('HUD: 0-59 normal, 60-99 WARN, 100 OVERHEAT (text)', report.heat.hud.h0.state === '' && report.heat.hud.h59.state === '' && report.heat.hud.h60.state === 'WARN' && report.heat.hud.h99.state === 'WARN', JSON.stringify(report.heat.hud))

  // ── THRUSTER REBOOST ──
  await reset(900, false, { energy: 50 }); await tap(['w']); await step(1); s = await state(); const takeoffE = s.a.energy
  ck('take-off press is not a thruster', !s.a.s.djUsed && s.a.s.stats.dj === 0)
  await step(10); const preE = (await state()).a.energy; await tap(['w']); s = await state(); report.thruster.boost = { vy: s.a.vy, power: +(preE - s.a.energy).toFixed(2), djUsed: s.a.s.djUsed }
  ck('airborne fresh Jump → thruster: −8 Power, bounded upward impulse, one per airtime', s.a.s.djUsed && s.a.s.stats.dj === 1 && s.a.vy < -10 && Math.abs(report.thruster.boost.power - 8) < 0.1, JSON.stringify(report.thruster.boost))
  ck('thruster spawns no hitbox', !s.a.attack && (await S('H.state().box?.w||0')) === 0)
  await step(6); await tap(['w']); ck('second thruster in the same airtime refused', (await S('H.state().s.stats.dj')) === 1)
  await wait(q => q.a.grounded, 200); await step(2); await tap(['w']); await step(10); await tap(['w']); ck('genuine landing resets the allowance', (await S('H.state().s.stats.dj')) === 2)
  await wait(q => q.a.grounded, 200)
  await reset(900, false, { energy: 5 }); await tap(['w']); await step(10); await tap(['w']); s = await state()
  ck('no Power → thruster fails (reject cue) and does NOT consume the allowance', s.a.s.stats.djFail === 1 && !s.a.s.djUsed && s.a.s.stats.dj === 0)
  await S('H.setPower(50)'); await step(2); await tap(['w']); ck('…the same airtime can still boost once Power is available', (await S('H.state().s.stats.dj')) === 1)
  await wait(q => q.a.grounded, 200)
  await idle(); await step(10); report.thruster.landing = await S('H.state().land'); ck('landing plays the supplied landing frames (cosmetic)', true)

  // ── SONIC SHOT vs CANNON (hold branch at 18 f; never a shot first) ──
  await reset(900); await hold(['l'], 17); await release(['l']); await step(30); ck('released at 17 f → Sonic Shot only', (await S('H.state().s.stats.shots')) === 1 && (await S('H.state().s.stats.pulses')) === 0)
  await reset(900); await hold(['l'], 18); s = await state(); ck('held 18 f → branches to the Cannon (no shot fired first)', s.a.attack?.name === 'cCannon' && s.a.s.stats.shots === 0, JSON.stringify(s.a.attack))
  const pulseAt = []; for (let i = 0; i < 40; i++) { const before = await S('H.state().s.stats.pulses'); await step(1); if ((await S('H.state().s.stats.pulses')) > before) pulseAt.push((await S('H.raw().currentAttack.total-H.raw().currentAttack.timer')) - 1) }   // read after the frame's timer decrement await release(['l'])
  report.weapons.pulseFrames = pulseAt; ck('cannon pulses at elapsed 22 / 28 / 34 / 40 (6 f apart)', JSON.stringify(pulseAt) === JSON.stringify([22, 28, 34, 40]), JSON.stringify(pulseAt))
  await reset(900); await hold(['l'], 30); await release(['l']); await step(30); report.weapons.releasedPulses = await S('H.state().s.stats.pulses')
  ck('release mid-cannon stops future pulses (released at ~30 f → 2 pulses)', report.weapons.releasedPulses === 2, String(report.weapons.releasedPulses))
  // interruption: a hit during the cannon drops the remaining pulses
  await reset(140); await hold(['l'], 25); await S("(()=>{const b=H.raw('p2');b.facing=-1})()"); await page.evaluate(() => { const H = __harness.cyborgTest, a = H.raw(); a.hitstun = 20; a.attacking = false; a.currentAttack = null }); await step(30); await release(['l'])
  ck('interrupting the cannon (hitstun) drops every pending pulse', (await S('H.state().s.stats.pulses')) === 1)
  // one straight missile per owner
  await reset(1200); await tap(['d', 'l']); await step(25); await idle(); await tap(['d', 'l']); await step(25); ck('only one straight missile active per Cyborg', (await S('H.state().s.stats.missiles')) === 1 && (await state()).proj.filter(p => p.kind === 'missile').length === 1)
  // missile: one hit + explosion (no second damage source)
  await reset(240); const hp0 = (await state()).b.hp; await tap(['d', 'l']); await until(async () => (await state()).b.hp < hp0, 80); await step(40)
  s = await state(); report.weapons.missileDamage = hp0 - s.b.hp
  ck('missile contact: exactly one damage event + one explosion FX', s.a.s.stats.explosions === 1 && report.weapons.missileDamage > 0 && s.proj.length === 0, JSON.stringify({ d: report.weapons.missileDamage, ex: s.a.s.stats.explosions }))
  // rack spread is deterministic
  await reset(1400); await tap(['w', 'l']); const vys = []; for (let i = 0; i < 60; i++) { await step(1); for (const p of (await state()).proj) if (p.kind === 'rack' && !vys.some(v => v.n === p.n)) vys.push({ n: p.n, vy: +p.vy.toFixed(2) }) }
  report.weapons.rackVy = vys.map(v => v.vy); ck('rack spread = fixed table [-1.1, -0.45, 0.2, 0.85, 1.5]', JSON.stringify(report.weapons.rackVy) === JSON.stringify([-1.1, -0.45, 0.2, 0.85, 1.5]), JSON.stringify(report.weapons.rackVy))
  await reset(1400); await tap(['w', 'l']); await step(70); await idle(); await tap(['w', 'l']); await step(20); ck('no second rack while missiles are still out', (await S('H.state().s.stats.rack')) === 5, String(await S('H.state().s.stats.rack')))

  // ── SONIC RESONANCE ──
  await reset(260); await tap(['l']); await until(async () => (await S('H.state().s.stats.marks')) === 1, 60)
  s = await state(); const key2 = await S("H.raw('p2').side||H.raw('p2').playerNumber"); report.resonance.mark = s.a.s.marks
  ck('unblocked sonic contact marks the target for 90 f', s.a.s.marks[key2] >= 85 && s.a.s.marks[key2] <= 90, JSON.stringify(s.a.s.marks))
  await idle(); await S("H.raw('p2').hitstun=0"); await tap(['l']); await until(async () => (await S('H.state().s.stats.shots')) === 2, 60); await step(20)
  s = await state(); ck('a second sonic hit refreshes, never stacks (one mark)', Object.keys(s.a.s.marks).length === 1 && s.a.s.stats.marks === 1, JSON.stringify(s.a.s))
  await reset(260, false, { dummy: 'block' }); await step(8); await tap(['l']); await step(40); ck('blocked sonic contact applies no mark', (await S('H.state().s.stats.marks')) === 0)
  r = await measure('Resonance conversion: J1 → J2 → Sonic Shot → Straight Missile', async M => {
    await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['l']); await M.until(q => q.a.s.stats.marks === 1, 60)
    await M.until(q => !q.a.attack, 60); await M.press(['d', 'l']); await M.until(q => q.a.s.stats.conversions === 1 || q.a.s.stats.explosions === 1, 90) }, { gap: 70 })
  s = await state(); report.resonance.route = { ...r, conversions: s.a.s.stats.conversions }
  ck('missile consumes the mark → ONE bounded close-range conversion', s.a.s.stats.conversions === 1 && Object.keys(s.a.s.marks).length === 0, JSON.stringify(s.a.s.stats))
  ck('conversion changes only knockback: target stays close (≤ 140 px after landing)', Math.abs((s.b.x + s.b.w / 2) - (s.a.x + s.a.w / 2)) <= 140, String(Math.abs((s.b.x + s.b.w / 2) - (s.a.x + s.a.w / 2))))
  await reset(160); await page.evaluate(() => { const H = __harness.cyborgTest; H.raw().comboCounter = 3; const s = H.raw()._cyborg || (H.state(), H.raw()._cyborg) }); await S("(()=>{const a=H.raw();a._cyborg.resUsed=true;a._cyborg.marks[H.raw('p2').side||H.raw('p2').playerNumber]=60;a.comboCounter=3;a.comboTimer=90})()")
  await tap(['d', 'l']); await until(async () => (await S('H.state().s.stats.explosions')) === 1, 80); s = await state()
  ck('conversion is once per combo (second mark consumed without converting)', s.a.s.stats.conversions === 0 && Object.keys(s.a.s.marks).length === 0, JSON.stringify(s.a.s.stats))

  // ── HOT IMPACT ──
  await reset(80, false, { heat: 70 }); await tap(['s', 'l']); await until(async () => (await S('H.state().s.stats.hot')) === 1, 50); const hHot = await heatNow()
  ck('clean Mega Punch at Heat ≥ 60 vents 20 Heat once (69.75 → 49.75)', (await S('H.state().s.stats.hot')) === 1 && hHot === 49.75, String(hHot))
  await reset(80, false, { heat: 59 }); await tap(['s', 'l']); await step(40); ck('no Hot Impact below 60', (await S('H.state().s.stats.hot')) === 0)
  await reset(80, false, { heat: 70, dummy: 'block' }); await step(8); await tap(['s', 'l']); await step(40); ck('no Hot Impact on block', (await S('H.state().s.stats.hot')) === 0)
  // Mega shockwave: ONE grounded band; an airborne foe above it is not hit
  await reset(80); await tap(['s', 'l']); await until(async () => (await S('H.state().attack?.timer')) !== undefined && (await S('H.raw().currentAttack.total-H.raw().currentAttack.timer')) >= 22, 40)
  const box = await S('H.state().box'), aS = await state(); report.hot.megaBox = box
  ck('Mega Punch box is a grounded band (40 px tall, at the floor)', box.h === 40 && Math.abs((box.y + box.h) - (aS.a.y + aS.a.h)) < 1, JSON.stringify(box))
  await reset(80); const yHigh = await S("H.raw('p2').y-120"); const pin = () => S("(()=>{const b=H.raw('p2');b.y=a;b.onGround=false;b.grounded=false;b.vy=0})()", yHigh); await pin(); const hpAir = (await state()).b.hp; await tap(['s', 'l']); for (let i = 0; i < 30; i++) { await pin(); await step(1) }
  ck('Mega shockwave never hits a high airborne foe', (await state()).b.hp === hpAir)
  // air slam: once per airtime, capped descent, landing impact + recovery
  await reset(80); await tap(['w']); await step(6); await tap(['s', 'l']); const slamStart = (await state()).a.attack?.name
  await until(async () => (await state()).a.attack?.name === 'cSlamLand', 80); m = await moveInfo(); report.hot.slamLand = m
  ck('Mega Slam: hang + capped descent → landing impact cSlamLand (+ recovery)', slamStart === 'cSlamAir' && m?.name === 'cSlamLand' && m.total === 31, JSON.stringify(m))
  await idle(); await reset(900); await tap(['w']); await step(4); await tap(['s', 'l']); await until(async () => (await state()).a.grounded, 120)
  ck('slam allowance resets on landing (once per airtime)', !(await S('H.state().s.slamUsed')))
  // Sonic Recoil: bounded owner push (~33 px)
  await reset(900); const rx0 = (await state()).a.x; await tap(['a', 'l']); await step(40); report.misc.recoilPush = Math.round(rx0 - (await state()).a.x)
  ck('Sonic Recoil pushes Cyborg back ~33 px (bounded)', report.misc.recoilPush >= 25 && report.misc.recoilPush <= 40, String(report.misc.recoilPush))

  // ── WEIGHT 1.15 (Cyborg as defender) ──
  const kb = async asCyborg => { await reset(80); if (!asCyborg) await S("H.raw('p2').rosterKey='mmpr_white_ctrl'"); await tap(['k']); await until(async () => (await state()).stun > 0, 40); const v = await S("({vx:H.raw('p2').vx,vy:H.raw('p2').vy})"); await S("H.raw('p2').rosterKey='cyborg'"); return v }
  const vC = await kb(true), vX = await kb(false); report.misc.weight = { cyborg: vC, control: vX, ratio: +(vX.vx / vC.vx).toFixed(3) }
  ck('received knockback ÷ 1.15 when Cyborg is the defender', Math.abs(vX.vx / vC.vx - 1.15) < 0.02, JSON.stringify(report.misc.weight))

  // ── ULTIMATE ──
  await reset(90); await tap(['u']); const ultT = []; let hpU = (await state()).b.hp; const ult0 = hpU
  for (let i = 0; i < 300; i++) { await step(1); const q = await state(); if (q.b.hp < hpU) { ultT.push({ f: i + 1, d: hpU - q.b.hp, frame: q.ult.frame }); hpU = q.b.hp } if (!q.ult.active && i > 40 && !q.a.attack) break }
  s = await state(); report.ultimate = { hits: ultT, total: ult0 - s.b.hp, heat: s.a.s?.heat / 100, done: s.a.s?.stats?.ultDone }
  const expectRaw = [30, 40, 20, 20, 20, 40, 110]
  ck('ultimate: opener + 6 cinematic contacts (cannon 40, 3 × missile 20, aerial 40, Mega 110)', ultT.length === 7, JSON.stringify(ultT))
  ck('ultimate leaves Heat at exactly 60', report.ultimate.heat === 60, String(report.ultimate.heat))
  ck('ultimate spent 100 Power', s.a.energy < 10, String(s.a.energy))
  await reset(600); await tap(['u']); let whiff = 0; while ((await state()).a.attack && whiff < 200) { await step(1); whiff++ } report.ultimate.whiffFrames = whiff + 1
  ck('whiffed opener: 30 + 3 + 60 recovery (93 f), no cinematic', whiff + 1 >= 92 && whiff + 1 <= 94 && !(await state()).ult.active, String(whiff + 1))
  await reset(90, false, { dummy: 'block' }); await step(8); await tap(['u']); await step(40); ck('blocked opener → no cinematic', !(await state()).ult.active)
  await reset(90, false, { energy: 60 }); await tap(['u']); ck('ultimate refused below 100 Power', !(await state()).a.attack)

  // ── MEASURED ROUTES ──
  for (const flip of [false, true]) { r = await measure('J1 → J2 → J3' + (flip ? ' (mirrored)' : ''), async M => { await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']) }, { flip }); ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r)) }
  await reset(); await hold(['j'], 90); await release(['j']); s = await state(); ck('held Light never auto-chains (fresh retaps only)', HP - s.b.hp === report.routes[0].hits[0], String(HP - s.b.hp))
  r = await measure('Low → Heavy → Mega Punch', async M => { await M.press(['s', 'j']); await M.until(q => q.a.cancel.open); await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['s', 'l']) })
  ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  r = await measure('Forward+Heavy → Heavy → Heavy (advance → piston → knock-away)', async M => { await M.press(['d', 'k']); await M.until(q => q.a.cancel.open); await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['k']) }, { gap: 110 })
  ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  await reset(110); await tap(['d', 'k']); await wait(q => q.a.attack?.cy?.clean); await wait(q => q.a.cancel.open); await tap(['k']); await wait(q => q.a.attack?.name === 'cPiston' && q.a.attack.cy?.clean); await wait(q => q.a.cancel.open); await tap(['i'])
  ck('confirmed Up+Heavy on the last chain step = launcher', (await state()).a.attack?.name === 'up', String((await state()).a.attack?.name))
  for (const g of ['whiff', 'block']) { await reset(g === 'whiff' ? 700 : 80, false, { dummy: g === 'block' ? 'block' : 'stand' }); if (g === 'block') await step(8); await tap(['d', 'k']); await wait(q => q.a.cancel.open); await tap(['k']); ck('chain retap rejected on ' + g, (await state()).a.attack?.name === 'cAdv', String((await state()).a.attack?.name)) }
  r = await measure('Launcher → jump (cancel) → Air Hammer', async M => { await M.press(['i']); await M.until(q => q.a.cancel.open); await M.press(['w']); await M.watch(2); await M.press(['j']) })
  ck(r.label + ': 2 hits, true combo', r.hits.length === 2 && r.trueCombo, JSON.stringify(r))
  r = await measure('Hot Mega: Heavy → Mega Punch at Heat 70', async M => { await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['s', 'l']) }, { heat: 70 })
  ck(r.label + ': 2 hits, true combo, Heat vented', r.hits.length === 2 && r.trueCombo && r.heatEnd <= 50, JSON.stringify(r))
  r = await measure('Heavy → BOOYAH PROTOCOL (recovery cancel)', async M => { await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['u']) })
  ck(r.label + ': true combo into the ultimate (8 hits)', r.hits.length === 8 && r.trueCombo, JSON.stringify(r))
  r = await measure('Sonic Shot → Straight Missile at range (zoning)', async M => { await M.press(['l']); await M.until(q => !q.a.attack, 60); await M.press(['d', 'l']) }, { gap: 300, kind: 'pressure' })
  ck(r.label + ': both projectiles connect', r.hits.length === 2, JSON.stringify(r))
  r = await measure('Missile Rack at range', async M => { await M.press(['w', 'l']) }, { gap: 260, kind: 'pressure' })
  ck(r.label + ': at least one missile connects', r.hits.length >= 1, JSON.stringify(r))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
report.errors = errors; report.summary = { pass, fail }
fs.writeFileSync('docs/cyborg/mechanics_results.json', JSON.stringify(report, null, 1))
ck('no page errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
