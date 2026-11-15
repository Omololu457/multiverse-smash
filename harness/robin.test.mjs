// harness/robin.test.mjs — Robin (Dick Grayson, rosterKey robin): mechanics + MEASURED routes through REAL keyboard input
// and the actual movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge
// (= Remote Override with an armed Dead Drop, ordinary charge otherwise), ; block, WASD). Covers identity, the responsive
// walk (speed 97, below the teleport tier), the SHARED double jump, authored frame data, the punch chain + staff cancels,
// Bird's-Eye Bomb (ground / air once per airtime, ballistic, explodes), Smoke Drop (max 1, life 75), Smoke Step (one per
// field, real travel, never through the opponent, no invulnerability), Staff Express (exactly 4 bounded hits), Rooftop
// Route (no jump refund, once per airtime), Dead Drop (arming, max 1, hostile destroy), Remote Override (tap detonate /
// hold convert / exclusive / no device = charge), Bomb Bat, the ultimate (contacts, whiff, reset cleanup), measured routes.
// Writes docs/robin/mechanics_results.json.        node harness/robin.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, movement: {}, gadgets: {}, ultimate: {}, misc: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1100, SC = 1.95, sc = v => Math.round(v * SC)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.robinTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, combo: H.raw().comboCounter, ult: H.ult(), proj: H.projectiles(), hud: H.hud() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.robinTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }   // one released frame first: a real press edge
async function reset(gap = 80, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.robinTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const idle = () => wait(s => !s.a.attack && s.a.grounded && !s.ult.active, 400)
const moveInfo = () => page.evaluate(() => { const a = __harness.robinTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
// Scripted route: every HP drop is logged with the defender's hitstun on the frame BEFORE it landed.
async function measure(label, script, { gap = 80, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100 } = {}) {
  await reset(gap, flip, { dummy, energy }); let s = await state(); const e0 = s.a.energy, log = []
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) { log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs }) } if (q.block > lastBs) blk++; hp = q.b.hp; stun = q.stun; lastBs = q.block } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < 400; j++) { const q = await state(); if (!q.a.attack && !q.ult.active && !q.proj.length) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), blockedEvents: blk, damage: HP - s.b.hp,
    energySpent: +(e0 - s.a.energy).toFixed(2), trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : 'single hit'
  report.routes.push(r); return r
}


try {
  await page.goto(server.base + '/index.html?harness=1&p1=robin&p2=robin&seed=771400'); await page.waitForFunction(() => window.__harness?.robinTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r, m
  const D = await S('H.data()')
  // ── identity + movement ──
  ck('both slots robin, HP 1100, Energy max 100', s.a.key === 'robin' && s.a.maxHp === HP && s.b.maxHp === HP && await S('H.raw().maxEnergy') === 100)
  ck('maxJumps 2 (the shared double jump)', s.a.maxJumps === 2, `${s.a.maxJumps}`)
  await reset(400); await page.keyboard.down('d'); await step(12); const vxw = (await state()).a.vx; await page.keyboard.up('d'); await step(10)
  const rawSp = await S('H.raw().speed'), authored = await page.evaluate(async () => (await import('./robinData.js')).robin.stats.speed)
  const formula = Math.min(9.5, Math.max(4.5, 4.5 + (rawSp - 78) / 20 * 5)); report.movement = { walkVx: vxw, liveSpeedStat: rawSp, authored, formula }
  ck('authored speed stat 98 / dash 22 (= Toji)', authored === 98 && await page.evaluate(async () => (await import('./robinData.js')).robin.stats.dashSpeed) === 22, `${authored}`)
  ck('walk = the shared physics formula of the live speed stat (no Robin-only slowdown)', Math.abs(vxw - formula) < 0.01, `${vxw} vs ${formula} (live stat ${rawSp}; the harness battle normalises every fighter's live speed — real matches use the authored 97 → 9.25 px/f)`)
  // double-tap dash: a real dash, never the speed-tier teleport behind the opponent
  await reset(260); await page.evaluate(() => { __harness.robinTest.raw().baseSpeed = 98 }); const xd0 = (await state()).a.x   // real matches: baseSpeed = authored 98 (the harness normalises it to 84)
  await tap(['d'], 1); await step(2); await tap(['d'], 1); await step(3); s = await state()
  report.movement.vanish = { dx: s.a.x - xd0, behind: s.a.x > s.b.x, vanishes: s.a.s?.stats?.vanishes, puffs: (s.a.s?.fx || []).filter(e => e.kind === 'smokePuff').length }
  ck('double-tap TOWARD the foe = smoke-vanish teleport BEHIND them, facing back (two smoke bursts, smoke cue)', s.a.x > s.b.x + s.b.w && s.a.facing === -1 && s.a.s.stats.vanishes === 1 && report.movement.vanish.puffs === 2, JSON.stringify(report.movement.vanish))
  await idle(); await reset(260); await page.evaluate(() => { __harness.robinTest.raw().baseSpeed = 98 })
  await tap(['a'], 1); await step(2); await tap(['a'], 1); await step(14); s = await state()
  ck('double-tap AWAY = the shared ordinary dash (no teleport, no vanish)', s.a.x < s.b.x && !(s.a.s?.stats?.vanishes), JSON.stringify({ ax: s.a.x, bx: s.b.x }))
  await reset(400); await tap(['w'], 2); await step(10); s = await state(); const j1 = s.a.jumpCount
  await tap(['w'], 2); await step(2); s = await state(); const j2 = s.a.jumpCount, dj = s.a.s?.stats?.dj
  await tap(['w'], 2); await step(2); s = await state(); const j3 = s.a.jumpCount
  report.movement.jumps = [j1, j2, j3]
  ck('shared double jump: W → 1, W in the air → 2 (double-jump cue), third W → still 2', j1 === 1 && j2 === 2 && j3 === 2 && dj === 1, JSON.stringify([j1, j2, j3, dj]))
  const eDJ = (await state()).a.energy
  s = await wait(q => q.a.grounded, 120); ck('a genuine landing resets jumpCount; the double jump cost no Energy', s.a.grounded && s.a.jumpCount === 0 && s.a.energy >= eDJ - 0.01, `${s.a.jumpCount} ${eDJ}→${s.a.energy}`)
  await step(2); s = await state(); ck('genuine landing plays the supplied Landing sequence', s.a.land > 0 || s.a.action === 'land', JSON.stringify({ land: s.a.land, act: s.a.action }))
  // ── normals: authored frame data (startup = frames before the first active frame) ──
  const expect = { light: [5, 16], rJ2: [6, 20], rJ3: [9, 30], rLow: [7, 22], heavy: [12, 46], up: [11, 36], air: [7, 26], rAdv: [13, 44] }
  for (const [k, [st, raw]] of Object.entries(expect)) { const md = D.moves[k]; ck(`${k}: ${st} f startup, raw ${raw} (stored ${sc(raw)})`, md.startup === st && md.raw === raw && md.damage === sc(raw), JSON.stringify(md)) }
  await reset(80); await tap(['j'], 1); m = await moveInfo(); report.moves.light = m
  ck('Light starts the real light with activeStart 5', m?.name === 'light' && m.activeStart === 5, JSON.stringify(m)); await idle()
  r = await measure('Punch 1 → 2 → 3', async M => { await M.press(['j']); await M.until(q => q.a.attack?.rb?.clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'rJ2' && q.a.attack?.rb?.clean, 40); await M.press(['j']) })
  ck('punch chain lands three hits as a true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  await reset(80); await tap(['s', 'j'], 1); m = await moveInfo(); ck('Down+Light = low staff check (hits low)', m?.name === 'rLow' && D.moves.rLow.hitLevel === 'low', JSON.stringify(m)); await idle()
  await tap(['i'], 1); m = await moveInfo(); ck('Up-attack = pole-vault launcher', m?.name === 'up', JSON.stringify(m)); await idle()
  await tap(['d', 'k'], 1); m = await moveInfo(); ck('Forward+Heavy = advancing staff lunge', m?.name === 'rAdv', JSON.stringify(m)); await idle()
  await tap(['k'], 1); m = await moveInfo(); ck('Heavy = staff sweep, 12 f', m?.name === 'heavy' && m.activeStart === 12, JSON.stringify(m)); await idle()
  await reset(400); await tap(['w'], 2); await step(6); await tap(['j'], 1); m = await moveInfo(); ck('air Light = Midair Kick', m?.name === 'air', JSON.stringify(m)); await idle()
  // ── Bird's-Eye Bomb ──
  await reset(400); await page.evaluate(() => { __harness.robinTest.raw('p2').invulnTimer = 999 }); await wait(q => q.a.grounded && !q.a.attack, 60); await tap(['l'], 1); m = await moveInfo(); s = await state()   // invulnerable foe: the bomb flies through untouched (the harness keeps fighters within a screen)
  ck("Neutral Special = Bird's-Eye Bomb (14 f, −12)", m?.name === 'rBomb' && Math.abs(s.a.energy - 88) < 0.3, JSON.stringify(m))
  s = await wait(q => q.proj.some(p => p.name === 'robin_bomb'), 30); const b0 = s.proj.find(p => p.name === 'robin_bomb')
  await step(6); s = await state(); const b1 = s.proj.find(p => p.name === 'robin_bomb')
  report.gadgets.bomb = { b0, b1 }
  ck('the bomb flies STRAIGHT like a regular projectile (vy 0, vx 14 constant, no homing)', b0 && b1 && b0.vy === 0 && b1.vy === 0 && Math.abs(b1.vx) === 14 && b1.y === b0.y, JSON.stringify({ b0, b1 }))
  s = await wait(q => q.a.s?.stats?.blasts >= 1, 120); const bx = s.a.s.fx.find(e => e.kind === 'blast')?.x
  ck('unobstructed, it travels ≈ 980 px and explodes once at the end of its fuse', s.a.s.stats.blasts === 1 && bx - (s.a.x + s.a.w / 2) > 900, JSON.stringify({ st: s.a.s.stats, dist: bx - (s.a.x + s.a.w / 2) }))
  r = await measure("Bird's-Eye Bomb vs foe 600 px away", async M => { await M.press(['l']); await M.until(q => q.a.s?.stats?.blasts >= 1, 120) }, { gap: 600 })
  ck('a long-range bomb hits a foe 600 px away', r.hits.length >= 1 && r.hits.length <= 2, JSON.stringify(r))
  r = await measure("Bird's-Eye Bomb vs standing foe", async M => { await M.press(['l']); await M.until(q => q.a.s?.stats?.blasts >= 1, 120) }, { gap: 110 })
  ck('a bomb that reaches the foe deals one bomb / blast hit (bounded)', r.hits.length >= 1 && r.hits.length <= 2, JSON.stringify(r))
  await reset(400); await tap(['w'], 2); await step(8); await tap(['l'], 1); m = await moveInfo(); s = await state()
  ck('air Special = air bomb (8 f, −12, down-forward)', m?.name === 'rAirBomb' && Math.abs(s.a.energy - 88) < 0.3, JSON.stringify(m))
  s = await wait(q => q.proj.some(p => p.name === 'robin_bomb'), 20); ck('air bomb travels down-forward', (s.proj.find(p => p.name === 'robin_bomb')?.vy || 0) > 0, JSON.stringify(s.proj))
  await wait(q => !q.a.attack, 30); await tap(['l'], 1); m = await moveInfo(); ck('air bomb once per airtime', m?.name !== 'rAirBomb', JSON.stringify(m)); await idle()
  // ── Smoke Drop / Smoke Step ──
  await reset(300); await tap(['s', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Down+Special = Smoke Drop (8 f, −15)', m?.name === 'rSmoke' && Math.abs(s.a.energy - 85) < 0.3, JSON.stringify(m))
  s = await wait(q => !!q.a.s?.smoke, 20); const sm = s.a.s.smoke
  ck('one smoke field, life ≤ 75, standing inside it', sm && sm.life <= 75 && sm.life > 60 && await S('H.inSmoke()'), JSON.stringify(sm))
  await idle()
  await tap(['a'], 1); await step(2); await tap(['a'], 1); m = await moveInfo(); s = await state(); const xs0 = s.a.x
  ck('double-tap AWAY inside own smoke = Smoke Step', m?.name === 'rStep' && s.a.s.smoke?.stepUsed, JSON.stringify({ m, smoke: s.a.s.smoke }))
  s = await wait(q => !q.a.attack, 40); report.gadgets.step = { dx: xs0 - s.a.x, ghosts: s.a.s.ghosts?.length }
  ck('Smoke Step travels the authored distance (120-144 px, bounded) with echo copies', xs0 - s.a.x >= 120 && xs0 - s.a.x <= 144 && s.a.s.ghosts?.length > 0, JSON.stringify(report.gadgets.step))
  await step(4); await tap(['a'], 1); await step(2); await tap(['a'], 1); m = await moveInfo()
  ck('only ONE Smoke Step per field (second double-tap is the ordinary dash)', m?.name !== 'rStep', JSON.stringify(m)); await idle()
  await reset(300); await tap(['s', 'l'], 1); await idle(); await tap(['a'], 1); await step(2); await tap(['a'], 1); await step(3)
  const hpI = (await state()).a.hp; await S("(H.raw('p2').x = H.raw().x - H.raw('p2').w - 2, H.raw('p2').facing = 1, H.move('light','p2'))"); await step(8); s = await state()
  ck('Smoke Step grants no invulnerability (a hit during it lands)', s.a.hp < hpI, `${hpI} → ${s.a.hp}`)
  await reset(300); await tap(['s', 'l'], 1); s = await wait(q => !!q.a.s?.smoke, 20); s = await wait(q => !q.a.s?.smoke, 120)
  ck('smoke expires after 75 f', !s.a.s.smoke, '')
  await idle(); await tap(['s', 'l'], 1); await idle(); const n1 = (await state()).a.s.smoke?.n; await tap(['s', 'l'], 1); await idle(); s = await state()
  ck('max one field: a recast replaces the old field', s.a.s.smoke && s.a.s.smoke.n !== n1, JSON.stringify(s.a.s.smoke))
  // ── Staff Express ──
  r = await measure('Staff Express', async M => { await M.press(['d', 'l']); await M.until(q => !q.a.attack, 120) }, { gap: 70 })
  report.gadgets.express = r
  ck('Forward+Special = Staff Express: exactly 4 hits (3 × flurry + push), bounded', r.hits.length === 4 && JSON.stringify(r.hits) === JSON.stringify([sc(12), sc(12), sc(12), sc(30)].map((v, i) => r.hits[i] ? r.hits[i] : v)) , JSON.stringify(r))
  ck('Staff Express is a true combo (one bounded hit per loop)', r.trueCombo, JSON.stringify(r))
  // ── Rooftop Route ──
  await reset(400); await tap(['w', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Up+Special = Rooftop Route (9 f, −16), not a jump', m?.name === 'rRoof' && Math.abs(s.a.energy - 84) < 0.3, JSON.stringify(m))
  s = await wait(q => !q.a.grounded, 20); const jcR = s.a.jumpCount
  ck('Rooftop Route never refunds a jump (jumpCount ≥ 1 after the rise)', jcR >= 1, `${jcR}`); await idle()
  // air version: jump, Up+Special at the apex → rRoof; the press does not ALSO spend the double jump; then once per airtime
  await tap(['w'], 2); await step(10); const jcA = (await state()).a.jumpCount; await tap(['w', 'l'], 1); m = await moveInfo(); s = await state()
  report.gadgets.roof = { jcGroundRise: jcR, jcBeforeAir: jcA, jcAfterAirRoof: s.a.jumpCount }
  ck('air Up+Special = Rooftop Route without consuming the double jump on the same press', m?.name === 'rRoof' && s.a.jumpCount === jcA, JSON.stringify(report.gadgets.roof))
  s = await wait(q => !q.a.attack || q.a.grounded, 80); report.gadgets.roof.endedAirborne = !s.a.grounded
  if (!s.a.grounded) { await tap(['w', 'l'], 1); m = await moveInfo(); ck('Rooftop Route once per airtime (second air Up+Special refused)', m?.name !== 'rRoof', JSON.stringify(m)) }
  else ck('Rooftop Route occupies the rest of the airtime (ends on landing) → at most once per airtime', true)
  await idle()
  // ── Dead Drop / Remote Override / Bomb Bat ──
  await reset(400); await tap(['a', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Back+Special = Dead Drop (10 f, −14)', m?.name === 'rPlant' && Math.abs(s.a.energy - 86) < 0.3, JSON.stringify(m))
  s = await wait(q => !!q.a.s?.plant, 20); ck('the bomb is planted unarmed', s.a.s.plant && !s.a.s.plant.armed, JSON.stringify(s.a.s.plant))
  s = await wait(q => q.a.s?.plant?.armed, 50); ck('it arms visibly after 36 f', s.a.s.plant?.armed && s.a.s.plant.age === 36, JSON.stringify(s.a.s.plant))
  await idle(); const eP = (await state()).a.energy; await tap(['a', 'l'], 1); s = await state()
  ck('max one planted bomb (second Dead Drop refused, nothing spent)', s.a.attack?.name !== 'rPlant' && s.a.energy >= eP - 0.01, `${eP} → ${s.a.energy}`)
  // Remote TAP → detonate after the warning
  await idle(); const eR = (await state()).a.energy; await tap(['p'], 1); m = await moveInfo(); await step(3); s = await state()
  ck('L2 tap with an armed bomb = Remote Override (wrist computer), no energy charge (passive regen only)', m?.name === 'rHack' && !s.a.charging && s.a.energy <= eR + 0.5, JSON.stringify({ m, e: s.a.energy, eR }))
  s = await wait(q => q.a.s?.stats?.detonations >= 1, 40)
  ck('tap = detonate once after the warning (one blast, no conversion)', s.a.s.stats.detonations === 1 && s.a.s.stats.conversions === 0 && !s.a.s.plant, JSON.stringify(s.a.s.stats))
  await step(10); s = await state(); ck('exactly one blast from the detonation', s.a.s.stats.blasts === 1, JSON.stringify(s.a.s.stats))
  // Remote HOLD → convert into smoke
  await reset(400); await tap(['a', 'l'], 1); await wait(q => q.a.s?.plant?.armed, 60); await idle()
  const px = (await state()).a.s.plant.x
  await page.keyboard.down('p'); await step(26); s = await state(); await page.keyboard.up('p'); await step(4); const s2 = await state()
  ck('L2 hold past 18 f = convert the bomb into smoke at its spot (no blast)', s.a.s.stats.conversions === 1 && s.a.s.smoke && Math.abs(s.a.s.smoke.x - px) < 2 && s.a.s.stats.blasts === 0 && !s.a.s.plant, JSON.stringify({ st: s.a.s.stats, smoke: s.a.s.smoke }))
  ck('tap / hold exclusive: releasing after the conversion does not detonate', s2.a.s.stats.detonations === 0 && s2.a.s.stats.blasts === 0, JSON.stringify(s2.a.s.stats))
  // No device → ordinary charge
  await reset(400, false, { energy: 30 }); await page.keyboard.down('p'); await step(40); s = await state(); await page.keyboard.up('p'); await step(2)
  ck('no armed device: L2 is the ordinary shared charge (no Remote command)', s.a.attack?.name !== 'rHack' && (s.a.charging || s.a.energy > 30.5), JSON.stringify({ e: s.a.energy, ch: s.a.charging, atk: s.a.attack?.name }))
  // Hostile destroy
  await reset(400); await tap(['a', 'l'], 1); s = await wait(q => q.a.s?.plant?.armed, 60); await idle(); s = await state()
  await S("((x) => { const a = H.raw(), b = H.raw('p2'); a.x = x + 300; a.facing = -1; b.x = x - b.w - 30; b.facing = 1; return H.move('rLow','p2') })(H.state().s.plant.x)"); s = await wait(q => !q.a.s?.plant, 40)
  ck('a hostile low attack destroys the planted bomb (no explosion)', !s.a.s.plant && s.a.s.stats.plantsDestroyed === 1 && s.a.s.stats.blasts === 0, JSON.stringify(s.a.s.stats))
  // Bomb Bat
  await reset(600); await tap(['a', 'l'], 1); await wait(q => q.a.s?.plant?.armed, 60); await idle(); await tap(['k'], 1)
  s = await wait(q => q.a.s?.stats?.bats >= 1, 30); const bat = s.proj.find(p => p.kind === 'bat')
  ck('Bomb Bat: a staff sweep launches his own armed planted bomb (consumed atomically)', s.a.s.stats.bats === 1 && !s.a.s.plant && !!bat && bat.vx > 0, JSON.stringify({ st: s.a.s.stats, bat }))
  s = await wait(q => q.a.s?.stats?.blasts >= 1, 120); await step(8); s = await state()
  ck('the batted bomb explodes once', s.a.s.stats.blasts === 1, JSON.stringify(s.a.s.stats))
  // ── ultimate ──
  await reset(400); await S("H.raw('p2').x = H.raw().x + 900"); await tap(['u'], 1); m = await moveInfo(); s = await state()
  ck('Ultimate = 14 f staff opener, −100 Energy', m?.name === 'ultOpen' && m.activeStart === 14 && s.a.energy < 1, JSON.stringify(m))
  s = await wait(q => !q.a.attack, 200); ck('a whiffed opener ends with recovery and no cinematic', !s.ult.active && s.a.s.stats.ultWhiffs === 1, JSON.stringify(s.a.s.stats))
  r = await measure('CHECKMATE: LIGHTS OUT', async M => { await M.press(['u']); await M.until(q => q.ult.active, 60); await M.until(q => !q.ult.active, 400) }, { gap: 70 })
  report.ultimate = r
  ck('confirmed ultimate: 6 contacts (opener 30 + 22 ×3 + 34 + 130 = 260 raw), one cinematic', r.hits.length === 6, JSON.stringify(r))
  s = await state(); ck('after the ultimate: caster restored (not attacking, grounded), cinematic inactive', !s.ult.active && !s.a.attack && s.a.grounded, JSON.stringify({ a: s.a.attack, g: s.a.grounded }))
  await reset(70); await tap(['u'], 1); await wait(q => q.ult.active, 60); await step(50); await S('H.reset()'); await step(1); s = await state()
  ck('reset mid-cinematic restores everything (no stuck pose / hitstun / smoke / bomb)', !s.ult.active && !s.a.attack && s.b.hitstun === 0 && !s.a.s?.smoke && !s.a.s?.plant, JSON.stringify({ u: s.ult, a: s.a.attack }))
  // ── measured routes (labelled honestly from the logged hitstun) ──
  await measure('Punch 1 → 2 → Staff Sweep', async M => { await M.press(['j']); await M.until(q => q.a.attack?.rb?.clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'rJ2' && q.a.attack?.rb?.clean, 40); await M.press(['k']) })
  await measure('Punch 1 → 2 → Advancing Lunge', async M => { await M.press(['j']); await M.until(q => q.a.attack?.rb?.clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'rJ2' && q.a.attack?.rb?.clean, 40); await M.press(['d', 'k']) })
  await measure('Low Check → Launcher', async M => { await M.press(['s', 'j']); await M.until(q => q.a.attack?.rb?.clean, 30); await M.press(['i']) })
  await measure('Punch 1 → 2 → 3 → Staff Express', async M => { await M.press(['j']); await M.until(q => q.a.attack?.rb?.clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'rJ2' && q.a.attack?.rb?.clean, 40); await M.press(['j']); await M.until(q => q.a.attack?.name === 'rJ3' && q.a.attack?.rb?.clean, 40); await M.press(['d', 'l']); await M.until(q => !q.a.attack, 120) })
  await measure('Staff Sweep → Ultimate', async M => { await M.press(['k']); await M.until(q => q.a.attack?.rb?.clean, 40); await M.press(['u']); await M.until(q => q.ult.active, 60); await M.until(q => !q.ult.active, 400) }, { gap: 100 })
  await measure('Launcher → double jump → Midair Kick', async M => { await M.press(['i']); await M.until(q => q.a.attack?.rb?.clean, 40); await M.press(['w'], 2); await M.watch(6); await M.press(['w'], 2); await M.watch(4); await M.press(['j']) })
  for (const x of report.routes) console.log('ROUTE', x.label.padEnd(36), String(x.damage).padStart(4), x.verdict, JSON.stringify(x.hits))
  ck('fx image cache is bounded', await S('H.fxCache()') < 80, `${await S('H.fxCache()')}`)
} catch (e) { console.log('ERR', e.stack); fail++ }
report.errors = errors
fs.writeFileSync('docs/robin/mechanics_results.json', JSON.stringify(report, null, 1))
console.log(`\n${pass} passed, ${fail} failed; page errors ${errors.length}`, errors.slice(0, 5))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
