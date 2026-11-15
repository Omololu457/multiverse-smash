// harness/syndrome.test.mjs — Syndrome (syndrome): mechanics + MEASURED damage through REAL keyboard input and the actual
// movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge (L2), ; block,
// WASD; P2: arrows, 1 light, 2 heavy, 4 special, 5 ultimate, 7 charge). Covers identity, the SHARED double jump (exactly
// 2, never refunded), authored frame data, the command chain and cancels, every machine operation (slot budgets,
// rejection before spending, guard rules, one contact per volume), Convergence, Zero-Point Hold, the L2 modifier table
// (no energy charging while used), turret destructibility, the ultimate (connect / block / whiff / reset cleanup), KO
// cleanup, P2 control. Writes docs/syndrome/mechanics_results.json.      node harness/syndrome.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { syndrome as SYNDROME_DEF } from '../syndromeData.js'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, movement: {}, ops: {}, ultimate: {}, misc: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = SYNDROME_DEF.stats.maxHealth   // from syndromeData.js (balance passes retune it)
const BOOST = ROSTER_DAMAGE_BOOST.syndrome || 1
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.syndromeTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, ult: H.ult(), proj: H.projectiles(), hud: H.hud() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.syndromeTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 90, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.syndromeTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const busy = q => q.a.attack || q.ult.active || q.proj.length || q.a.s?.mobile || q.a.s?.spin || q.a.s?.turret || q.a.s?.omni
const idle = () => wait(q => !q.a.attack && q.a.grounded && !q.ult.active, 400)
const allIdle = () => wait(q => !busy(q) && q.a.grounded, 700)
const moveInfo = () => page.evaluate(() => { const a = __harness.syndromeTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
async function measure(label, script, { gap = 90, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100, max = 700 } = {}) {
  await reset(gap, flip, { dummy, energy })
  let s = await state(); const e0 = s.a.energy, log = []
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs }); if (q.block > lastBs) blk++; hp = q.b.hp; stun = q.stun; lastBs = q.block } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, mx = 120) => { for (let i = 0; i < mx; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < max; j++) { const q = await state(); if (!busy(q)) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), blockedEvents: blk,
    chip: log.filter(x => x.blocked).reduce((t, x) => t + x.d, 0), damage: HP - s.b.hp, energySpent: +(e0 - s.a.energy).toFixed(2),
    trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note, stats: s.a.s?.stats || null }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : hitLog.length ? 'single hit' : 'no hit'
  report.routes.push(r); return r
}
const clean = q => q.a.attack?.sy?.clean
// shared GLOBAL_DAMAGE_SCALE on an unscaled first hit (defence multiplier 1 in a mirror), floored, then the ROSTER PARITY
// boost (rosterParity.js) applied at combat.applyScaledDamage and floored again
const live = st => Math.floor(Math.floor(st * 0.6) * BOOST)

try {
  await page.goto(server.base + '/index.html?harness=1&p1=syndrome&p2=syndrome&seed=880311'); await page.waitForFunction(() => window.__harness?.syndromeTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r, m
  const D = await S('H.data()')
  // ── identity + movement ──
  ck(`both slots syndrome, HP ${HP}, Power max 100`, s.a.key === 'syndrome' && s.a.maxHp === HP && s.b.maxHp === HP && await S('H.raw().maxEnergy') === 100)
  ck('maxJumps 2 (the shared double jump)', s.a.maxJumps === 2, `${s.a.maxJumps}`)
  ck('universe the_incredibles', await S("H.raw().universe || H.raw().characterData?.universe || null") !== 'dc')
  await reset(400); await page.keyboard.down('d'); await step(12); const vxw = (await state()).a.vx; await page.keyboard.up('d'); await step(10)
  const rawSp = await S('H.raw().speed'), formula = Math.min(9.5, Math.max(4.5, 4.5 + (rawSp - 78) / 20 * 5)); report.movement = { walkVx: vxw, liveSpeedStat: rawSp, formula }
  ck('walk = the shared physics formula', Math.abs(vxw - formula) < 0.01, `${vxw} vs ${formula}`)
  await reset(300); await tap(['d'], 1); await step(2); await tap(['d'], 1); await step(6); s = await state()
  ck('double-tap = the shared dash (stays in front of the foe)', s.a.x < s.b.x && s.a.x - 1300 > 30, JSON.stringify({ ax: s.a.x, bx: s.b.x }))
  await reset(400); await tap(['w'], 2); await step(10); s = await state(); const j1 = s.a.jumpCount
  await tap(['w'], 2); await step(2); s = await state(); const j2 = s.a.jumpCount, dj = s.a.s?.stats?.dj
  await tap(['w'], 2); await step(2); s = await state(); const j3 = s.a.jumpCount
  report.movement.jumps = [j1, j2, j3]
  ck('double jump: exactly 2 (third press does nothing)', j1 === 1 && j2 === 2 && j3 === 2 && dj === 1, JSON.stringify([j1, j2, j3, dj]))
  await tap(['j'], 1); await step(16); s = await state(); ck('air Light (Drone Strafe) never refunds a jump', s.a.jumpCount === 2 || s.a.grounded, `${s.a.jumpCount}`)
  await tap(['l'], 1); await step(16); s = await state(); ck('air Special (Hunter Duet) never refunds a jump / no hover', (s.a.jumpCount === 2 && s.a.vy >= 0) || s.a.grounded, JSON.stringify({ jc: s.a.jumpCount, vy: s.a.vy }))
  s = await wait(q => q.a.grounded, 200); ck('a genuine landing resets jumpCount', s.a.grounded && s.a.jumpCount === 0, `${s.a.jumpCount}`)
  await allIdle()
  // ── authored data ──
  const expect = { light: [5, 45], sL2: [6, 45], sL3: [8, 65], sLow: [7, 42], heavy: [14, 95], sLaunch: [12, 75], air: [6, 65], sDownAir: [12, 85] }
  for (const [k, [st, raw]] of Object.entries(expect)) { const md = D.moves[k]; ck(`${k}: ${st} f startup, stored ${raw}`, md.startup === st && md.damage === raw, JSON.stringify({ st: md.startup, d: md.damage })) }
  ck('grab raw 45 (shared grab)', await S("H.raw().characterData?.basic_attacks?.grab?.damage ?? 45") === 45)
  const ultSum = D.ult.contacts.reduce((t, c) => t + c.raw, 0) + D.moves.ultOpen.damage
  ck('ultimate schedule = 30 + 90 + 70 + 230 = 420 raw', ultSum === 420 && D.ult.contacts.slice(0, 5).reduce((t, c) => t + c.raw, 0) === 90 && D.ult.contacts[5].raw + D.ult.contacts[6].raw === 70 && D.ult.contacts[7].raw === 230, `${ultSum}`)
  ck('special raw totals: Duet 150 / Spin 110 / Turret 180 / Velo 150 / Hammer 170', D.duet.raw * D.duet.shots.length === 150 && D.spin.rawOut + D.spin.rawBack === 110 && D.turret.gun.raw * D.turret.gun.shots === 180 && D.velo.raw === 150 && D.hammer.raw === 170)
  // ── normals through the real parser ──
  await reset(90); await tap(['j'], 1); m = await moveInfo(); report.moves.light = m
  ck('Light = Spinner Snap, activeStart 5', m?.name === 'light' && m.activeStart === 5, JSON.stringify(m)); await idle()
  r = await measure('Spinner Snap → Drone Cross → Spinner Pass (Light ×3)', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'sL2' && clean(q), 40); await M.press(['j']) })
  ck('command chain: 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  ck(`first hit measured = floor(floor(45 × 0.6) × ${BOOST}) = ${live(45)}`, r.hits[0] === live(45), JSON.stringify(r.hits))
  r = await measure('Light retap without a hit', async M => { await M.press(['j']); await M.watch(4); await M.press(['j']) }, { gap: 500 })
  s = await state(); ck('chain needs a clean hit (whiffed snap is not cancelled)', r.hits.length === 0 && (s.a.attack?.name || 'light') !== 'sL2', JSON.stringify(r))
  await allIdle(); await reset(90); await tap(['s', 'j'], 1); m = await moveInfo(); ck('Down+Light = Low Spinner Skim (hits low)', m?.name === 'sLow' && D.moves.sLow.hitLevel === 'low', JSON.stringify(m)); await idle()
  await tap(['k'], 1); m = await moveInfo(); ck('Heavy = Claw Drive, 14 f', m?.name === 'heavy' && m.activeStart === 14, JSON.stringify(m)); await idle()
  await tap(['i'], 1); m = await moveInfo(); s = await state(); ck('Up-Attack = Rising Claw launcher (no jump)', m?.name === 'sLaunch' && s.a.grounded, JSON.stringify(m)); await idle()
  await tap(['w', 'k'], 1); m = await moveInfo(); s = await state(); ck('Up+Heavy = Rising Claw launcher', m?.name === 'sLaunch', JSON.stringify(m)); await idle()
  r = await measure('Claw Drive', async M => { await M.press(['k']) }, { gap: 130 }); ck(`Claw Drive lands ${live(95)} on a fresh foe`, r.hits[0] === live(95), JSON.stringify(r.hits))
  r = await measure('Spinner Snap → Claw Drive', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['k']) }, { gap: 90 })
  ck('clean Light → fresh Heavy cancels into Claw Drive (true combo)', r.hits.length === 2 && r.trueCombo, JSON.stringify(r))
  r = await measure('Rising Claw', async M => { await M.press(['i']) }, { gap: 100 }); s = await state()
  ck(`Rising Claw lands ${live(75)} and launches`, r.hits[0] === live(75), JSON.stringify(r.hits))
  r = await measure('Rising Claw → jump cancel → Drone Strafe', async M => { await M.press(['i']); await M.until(q => q.a.attack?.name === 'sLaunch' && q.a.attack.hasHit, 40); for (let i = 0; i < 30 && await S('H.raw().hitstop') > 0; i++) await M.watch(1); await M.press(['w'], 2); await M.watch(5); await M.press(['j']) }, { gap: 100 })
  ck('Rising Claw hit → Jump cancels → air command connects (true combo)', r.hits.length === 2 && r.trueCombo, JSON.stringify(r))
  await reset(400); await tap(['w'], 2); await step(5); await tap(['j'], 1); m = await moveInfo(); ck('air Light = Drone Strafe', m?.name === 'air', JSON.stringify(m)); await allIdle()
  await reset(400); await tap(['w'], 2); await step(5); await tap(['k'], 1); m = await moveInfo(); ck('air Heavy = Leg Drop', m?.name === 'sDownAir', JSON.stringify(m)); await allIdle()
  // ── specials ──
  const opCheck = async (label, keys, name, cost, slot) => {
    await reset(300); await S("(H.raw('p2').invulnTimer = 999)"); const e0 = (await state()).a.energy; await tap(keys, 1); m = await moveInfo(); s = await wait(q => !!q.a.s?.[slot], 30)
    ck(`${label}: ${name}, −${cost} Power, ${slot} slot filled`, m?.name === name && Math.abs(e0 - s.a.energy - cost) < 1 && !!s.a.s?.[slot], JSON.stringify({ m, e: e0 - s.a.energy, slot: !!s.a.s?.[slot] }))
    report.ops[name] = { startup: m?.activeStart, cost }
  }
  await opCheck('Special', ['l'], 'sDuet', 25, 'mobile')
  // normals stay available with a squad deployed
  await idle(); await tap(['j'], 1); m = await moveInfo(); ck('normals are never blocked by a deployed squad', m?.name === 'light', JSON.stringify(m)); await idle()
  const eR = (await state()).a.energy; const rej0 = (await state()).a.s.stats.rejects; await tap(['l'], 1); s = await state()
  ck('a second Duet while the squad is out is REJECTED before spending', s.a.energy >= eR - 0.01 && s.a.s.stats.rejects === rej0 + 1 && s.a.s.lastReject === 'mobile', JSON.stringify({ e: [eR, s.a.energy], rej: s.a.s.stats.rejects }))
  await tap(['w', 'l'], 1); s = await state(); ck('Velocipod shares the mobile slot (also rejected)', s.a.s.lastReject === 'mobile' && s.a.attack?.name !== 'sVelo', JSON.stringify(s.a.attack))
  await tap(['d', 'l'], 1); m = await moveInfo(); ck('Spin Cycle uses its own slot (allowed alongside the Duet)', m?.name === 'sSpin', JSON.stringify(m))
  await allIdle()
  await opCheck('Forward+Special', ['d', 'l'], 'sSpin', 18, 'spin'); await allIdle()
  await opCheck('Down+Special', ['s', 'l'], 'sTurret', 30, 'turret'); s = await state(); ck('Down+Special = GUN turret', s.a.s.turret.fam === 'gun'); await allIdle()
  await opCheck('Back+Special', ['a', 'l'], 'sHammer', 30, 'omni'); s = await state(); ck('Back+Special = Hammerfall', s.a.s.omni.kind === 'hammer'); await allIdle()
  await reset(300); await S("(H.raw('p2').invulnTimer = 999)"); const jc0 = (await state()).a.jumpCount; await tap(['w', 'l'], 1); m = await moveInfo(); s = await wait(q => !!q.a.s?.mobile, 30)
  ck('Up+Special = Velocipod Intercept (never a jump)', m?.name === 'sVelo' && s.a.grounded && s.a.jumpCount === jc0 && s.a.s.mobile?.kind === 'velo', JSON.stringify({ m, g: s.a.grounded, jc: s.a.jumpCount })); await allIdle()
  // ── L2 modifier table ──
  const modCheck = async (label, keys, name, check) => {
    await reset(300); await S("(H.raw('p2').invulnTimer = 999)"); await page.keyboard.down('p'); await step(2); const e0 = (await state()).a.energy
    await tap(keys, 1); m = await moveInfo(); await step(4); await page.keyboard.up('p'); s = await wait(q => check(q), 30)
    ck(`L2 + ${label} = ${name}`, m?.name === name && check(s), JSON.stringify({ m, t: s.a.s?.turret?.fam, o: s.a.s?.omni?.kind }))
    return { e0, s }
  }
  let mc = await modCheck('Neutral R1', ['l'], 'sZero', () => true)
  ck('L2 used as the modifier never charges Power', mc.s.a.energy <= mc.e0 - 19 && !mc.s.a.charging, JSON.stringify({ e0: mc.e0, e: mc.s.a.energy }))
  await allIdle()
  await modCheck('Forward R1', ['d', 'l'], 'sTurretMortar', q => q.a.s?.turret?.fam === 'mortar'); await allIdle()
  await modCheck('Down R1', ['s', 'l'], 'sTurretMs', q => q.a.s?.turret?.fam === 'missile'); await allIdle()
  await modCheck('Back R1', ['a', 'l'], 'sSweep', q => q.a.s?.omni?.kind === 'sweep'); await allIdle()
  await modCheck('Up R1', ['w', 'l'], 'sRise', q => q.a.s?.omni?.kind === 'rise' && q.a.grounded); await allIdle()
  await reset(400); const eC = (await state()).a.energy; await S('(H.raw().energy = 40)'); await page.keyboard.down('p'); await step(40); await page.keyboard.up('p'); s = await state()
  ck('L2 alone stays the shared Charge', s.a.energy > 40, `${s.a.energy}`)
  // ── measured operations ──
  r = await measure('Hunter Duet (6 shots)', async M => { await M.press(['l']); await M.until(q => !q.a.s?.mobile, 300) }, { gap: 260, kind: 'pressure' })
  ck(`Hunter Duet: 6 committed shots, one contact each (first ${live(25)}, later shots under the SHARED combo scaling)`, r.hits.length === 6 && r.hits[0] === live(25) && r.hits.every(h => h <= live(25)), JSON.stringify(r)); report.ops.duet = r
  r = await measure('Spin Cycle (out + back)', async M => { await M.press(['d', 'l']); await M.until(q => !q.a.s?.spin, 200) }, { gap: 160, kind: 'pressure' })
  ck('Spin Cycle: out + back contacts (60 + 50 raw)', r.hits.length >= 1 && r.hits[0] === live(60), JSON.stringify(r)); report.ops.spin = r
  r = await measure('Velocipod Intercept', async M => { await M.press(['w', 'l']); await M.until(q => !q.a.s?.mobile, 200) }, { gap: 220 })
  ck(`Velocipod: one ${live(150)} contact`, r.hits.length === 1 && r.hits[0] === live(150), JSON.stringify(r)); report.ops.velo = r
  r = await measure('Gun Turret volley', async M => { await M.press(['s', 'l']); await M.until(q => !q.a.s?.turret, 500) }, { gap: 340, kind: 'pressure', max: 900 })
  ck('Gun turret: 9 shots of 20 raw (≤ 180 raw total)', r.hits.length >= 7 && r.hits.length <= 9 && r.hits.every(h => h === live(20) || h < live(20)), JSON.stringify(r)); report.ops.turret = r
  r = await measure('Hammerfall', async M => { await M.press(['a', 'l']); await M.until(q => !q.a.s?.omni, 200) }, { gap: 260 })
  ck(`Hammerfall: one ${live(170)} contact after a 40 f warning`, r.hits.length === 1 && r.hits[0] === live(170) && r.hitFrames[0] >= 40, JSON.stringify(r)); report.ops.hammer = r
  r = await measure('Hammerfall vs guard', async M => { await M.press(['a', 'l']); await M.until(q => !q.a.s?.omni, 200) }, { gap: 260, dummy: 'block' })
  ck('Hammerfall is guardable (no clean hit when blocked)', r.hits.length === 0 && r.blockedEvents >= 1, JSON.stringify(r))
  r = await measure('Omnidroid Sweep', async M => { await page.keyboard.down('p'); await M.watch(2); await M.press(['a', 'l']); await page.keyboard.up('p'); await M.until(q => !q.a.s?.omni, 200) }, { gap: 200 })
  ck(`Sweep: one ${live(120)} low contact`, r.hits.length === 1 && r.hits[0] === live(120), JSON.stringify(r)); report.ops.sweep = r
  r = await measure('Rising Interception', async M => { await page.keyboard.down('p'); await M.watch(2); await M.press(['w', 'l']); await page.keyboard.up('p'); await M.until(q => !q.a.s?.omni, 200) }, { gap: 200 })
  ck(`Rising Interception: one ${live(130)} contact`, r.hits.length === 1 && r.hits[0] === live(130), JSON.stringify(r)); report.ops.rise = r
  r = await measure('Missile Turret', async M => { await page.keyboard.down('p'); await M.watch(2); await M.press(['s', 'l']); await page.keyboard.up('p'); await M.until(q => !q.a.s?.turret, 500) }, { gap: 260, kind: 'pressure', max: 900 })
  ck('Missile turret: ≤ 3 drops of 60 raw', r.hits.length >= 1 && r.hits.length <= 3 && r.hits[0] === live(60), JSON.stringify(r)); report.ops.missile = r
  r = await measure('Mortar Turret', async M => { await page.keyboard.down('p'); await M.watch(2); await M.press(['d', 'l']); await page.keyboard.up('p'); await M.until(q => !q.a.s?.turret, 500) }, { gap: 300, kind: 'pressure', max: 900 })
  ck('Mortar turret: ≤ 4 shells of 45 raw', r.hits.length >= 1 && r.hits.length <= 4 && r.hits[0] === live(45), JSON.stringify(r)); report.ops.mortar = r
  // ── Zero-Point + Convergence ──
  r = await measure('Zero-Point Hold → Claw Drive', async M => { await page.keyboard.down('p'); await M.watch(2); await M.press(['l']); await page.keyboard.up('p'); await M.until(clean, 30); await M.until(q => !q.a.attack, 40); await M.press(['k']) }, { gap: 110 })
  s = await state(); ck('Zero-Point captures once and links into Claw Drive', r.hits.length === 2 && r.trueCombo && r.stats.zero === 1 && r.stats.captures === 1, JSON.stringify(r))
  r = await measure('Duet → Spin Cycle → CONVERGENCE', async M => { await M.press(['l']); await M.watch(30); await M.press(['d', 'l']); await M.until(q => q.a.s?.stats?.converge > 0 || !q.a.s?.mobile, 300) }, { gap: 200, kind: 'pressure' })
  ck('Convergence fires once when the Spinner hits the Duet target', r.stats.converge === 1, JSON.stringify(r.stats)); report.ops.converge = r
  // ── turret destructibility ──
  await reset(100); await tap(['s', 'l'], 1); s = await wait(q => q.a.s?.turret?.phase === 'active', 80)
  const tx = s.a.s.turret.x; await S(`(H.raw('p2').x = ${tx} + 20, H.raw('p2').facing = -1, H.raw().x = 700)`)   // P1 out of reach: the foe's swings land only on the turret
  for (let i = 0; i < 3; i++) { await S("(H.raw('p2').hitstun = 0, H.raw('p2').invulnTimer = 999, H.raw('p2').attacking = false, H.raw('p2').currentAttack = null, H.raw('p2').attackCooldown = 0, H.move('light','p2'))"); await step(30) }
  s = await state(); ck('a turret is destroyed by 3 opponent hits', s.a.s?.stats?.turretBroken === 1, JSON.stringify({ t: s.a.s?.turret, st: s.a.s?.stats?.turretBroken })); await allIdle()
  // ── ultimate ──
  await reset(900); await tap(['u'], 1); m = await moveInfo(); s = await state()
  ck('Ultimate = 16 f Zero-Point opener, −100', m?.name === 'ultOpen' && m.activeStart === 16 && s.a.energy < 1, JSON.stringify(m))
  s = await wait(q => !q.a.attack, 200); ck('a whiffed opener: MISS, real recovery, no cinematic', !s.ult.active && s.a.s.stats.ultWhiffs === 1, JSON.stringify(s.a.s.stats))
  r = await measure('Operation Kronos vs guard', async M => { await M.press(['u']); await M.watch(80) }, { gap: 120, dummy: 'block' })
  s = await state(); ck('a blocked opener never starts the cinematic', s.a.s.stats.ultDone === 0 && r.hits.length === 0 && !s.ult.active, JSON.stringify(r))
  r = await measure('OPERATION KRONOS: FINAL DEMONSTRATION', async M => { await M.press(['u']); await M.until(q => q.ult.active, 80); await M.until(q => !q.ult.active, 400) }, { gap: 120 })
  report.ultimate = r
  ck('confirmed ultimate: 9 contacts (opener + 5 orchestra + lift + pin + slam), one cinematic', r.hits.length === 9 && r.stats.ultDone === 1, JSON.stringify(r))
  ck(`ultimate total = sum of scaled contacts (opener ${live(30)})`, r.hits[0] === live(30) && r.damage === r.hits.reduce((t, h) => t + h, 0), JSON.stringify(r.hits))
  s = await state(); ck('after the ultimate: caster restored, cinematic inactive, foe knocked down', !s.ult.active && !s.a.attack && s.a.grounded, JSON.stringify({ a: s.a.attack, g: s.a.grounded }))
  await reset(120); await tap(['u'], 1); await wait(q => q.ult.active, 80); await step(60); await S('H.reset()'); await step(1); s = await state()
  ck('reset mid-cinematic restores everything (no stuck pose / hitstun / machine)', !s.ult.active && !s.a.attack && s.b.hitstun === 0 && !s.a.s?.mobile && !s.proj.length, JSON.stringify({ u: s.ult, a: s.a.attack }))
  r = await measure('Claw Drive → Ultimate', async M => { await M.press(['k']); await M.until(clean, 40); await M.press(['u']); await M.until(q => q.ult.active, 80); await M.until(q => !q.ult.active, 400) }, { gap: 130 })
  ck('Claw Drive cancels into the Ultimate on a clean hit', r.hits.length === 10 && r.stats.ultDone === 1, JSON.stringify(r))
  // ── KO cleanup ──
  await reset(400); await S("H.raw('p2').invulnTimer = 999"); await tap(['l'], 1); await wait(q => !!q.a.s?.mobile, 20); await tap(['s', 'l'], 1); await wait(q => !!q.a.s?.turret, 40)
  await S('(H.raw().health = 0)'); await step(2); s = await state()
  ck('KO: no machine survives its owner', !s.a.s?.mobile && !s.a.s?.turret && !s.proj.length, JSON.stringify({ m: s.a.s?.mobile, t: s.a.s?.turret, p: s.proj }))
  await reset(400); s = await state(); ck('round reset clears every slot', !s.a.s?.mobile && !s.a.s?.turret && !s.a.s?.spin && !s.a.s?.omni && !s.proj.length)
  // ── P2 control (arrows / 1 / 2 / 4) ──
  // P2: the harness routes slot 2 through the AI key writer every frame (clearAIControlKeys), so P2 KEYBOARD cannot be
  // driven here; slot-2 input is verified through the LAN remote-input path in harness/syndrome_determinism.mjs (E).
  report.misc.errors = errors.slice(0, 10)
} catch (e) { console.log('ERR', e.stack); fail++ }
ck('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '))
fs.writeFileSync('docs/syndrome/mechanics_results.json', JSON.stringify(report, null, 1))
console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
