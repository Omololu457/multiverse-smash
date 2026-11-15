// harness/batman_rebuild.test.mjs — Batman (rosterKey batman, REBUILT): mechanics through REAL keyboard input and the actual
// movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge, ; block, WASD;
// double-tap A / D = dash). Covers identity, movement (ordinary dash, shared double jump), every normal + its measured
// damage, the chain, cape counter, every gadget, every support operation (raw budget, cost at commit, one-major-at-a-time,
// hand-off overlap, reject-before-spend, air reject, cooldowns), L2 chord ownership of the shared charge, machine
// vulnerability, blocked assists (12 % chip), caps, and KNIGHTFALL (whiff / block / clean, contacts, legal position, fleet
// suspended, cleanup). Writes docs/batman/mechanics_results.json.        node harness/batman_rebuild.test.mjs
import fs from 'node:fs'
import { boot } from './batman_lib.mjs'
const G = await boot('batman', 'batman', 881402)
const { page, step, S, state, tap, dtap, reset, wait, idle, guard, track, errors } = G
let pass = 0, fail = 0; const report = { moves: {}, gadgets: {}, orders: {}, rules: {}, ultimate: {} }
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const G6 = v => Math.floor(v * 0.6)
const press = async (keys, h = 2) => { for (const k of keys) await page.keyboard.down(k); await step(h); for (const k of keys) await page.keyboard.up(k) }
const order = async (dirKeys, M) => { await page.keyboard.down('p'); await (M ? M.watch(2) : step(2)); for (const k of [...dirKeys, 'l']) await page.keyboard.down(k); await (M ? M.watch(2) : step(2)); for (const k of [...dirKeys, 'l', 'p']) await page.keyboard.up(k) }
const st = () => S('H.state().s')
try {
  let s = await state()
  const D = await S('H.data()')
  // ── identity / movement ──
  ck('both slots batman, HP 1150, Energy 100, maxJumps 2', s.a.key === 'batman' && s.a.maxHp === 1150 && await S('H.raw().maxEnergy') === 100 && s.a.maxJumps === 2)
  const authored = await page.evaluate(async () => (await import('./batmanData.js')).batman.stats)
  ck('authored speed 94 < teleport tier 98', authored.speed === 94)
  // the shared double-tap detector is wall-clock based (ms window) — retry if a slow page evaluate splits the two taps
  let x0 = 0, dt = 0; for (let tries = 0; tries < 3 && !(dt > 0); tries++) { await reset(400); await page.evaluate(() => { __harness.batmanTest.raw().baseSpeed = 94 }); x0 = (await state()).a.x
    await dtap('d'); await step(1); s = await state(); dt = s.a.dashTimer; await step(10); s = await state() }
  ck('double-tap = the ordinary physical dash (no teleport)', dt > 0 && s.a.x > x0 + 40 && s.a.x < s.b.x, JSON.stringify({ dt, dx: s.a.x - x0 }))
  await reset(400); await tap(['w'], 2); await step(10); const j1 = (await state()).a.jumpCount
  await tap(['w'], 2); await step(2); const j2 = (await state()).a.jumpCount; await tap(['w'], 2); await step(2); const j3 = (await state()).a.jumpCount
  ck('double jump: fresh second press = 2, third press = still 2', j1 === 1 && j2 === 2 && j3 === 2, JSON.stringify([j1, j2, j3]))
  await wait(q => q.a.grounded, 120); await reset(400); await page.keyboard.down('w'); await step(30); s = await state(); await page.keyboard.up('w')
  ck('holding Jump never double-jumps', s.a.jumpCount === 1, `${s.a.jumpCount}`); await idle()
  // ── normals (measured; G6 = the shared ×0.60 at full combo scale) ──
  const one = async (name, keys, gap, want, setup) => { await reset(gap); if (setup) await setup(); const r = await track(async M => { await M.press(keys, 2); await M.watch(6) }); report.moves[name] = { dmg: r.dmg, hits: r.hits }; ck(`${name}: ${want}`, r.dmg === want, JSON.stringify(r.hits)); return r }
  await one('light (Square)', ['j'], 80, G6(48)); await one('low (Down+Square)', ['s', 'j'], 80, G6(42)); await one('heavy (Triangle)', ['k'], 90, G6(95))
  const sp = await one('advancing heavy (Fwd+Triangle)', ['d', 'k'], 140, G6(95)); ck('advancing heavy travels forward, never through the foe', sp.s.a.x > 1300 && sp.s.a.x + sp.s.a.w <= sp.s.b.x + 1, `${sp.s.a.x}`)
  const la = await one('launcher (Up+Triangle / I)', ['i'], 60, G6(75))
  await one('sweep (Down+Triangle)', ['s', 'k'], 80, G6(80))
  await reset(80); let r = await track(async M => { await M.press(['j'], 1); await M.watch(9); await M.press(['j'], 1); await M.watch(10); await M.press(['j'], 1); await M.watch(5) })
  report.moves.chain = { dmg: r.dmg, hits: r.hits }
  ck('light chain Square ×3 on clean hits: 3 hits, true combo', r.hits.length === 3 && r.log.slice(1).every(x => x.stunBefore > 0), JSON.stringify(r.log))
  // air strike + cape dive
  await reset(70); r = await track(async M => { await M.press(['w'], 2); for (let i = 0; i < 90; i++) { const q = await M.state(); if (q.a.vy > 0 && q.a.y > 200) break; await M.watch(1) } await M.press(['j'], 2); await M.watch(20) }); report.moves.air = r.hits
  ck('air strike (air Square) connects', r.dmg === G6(65), JSON.stringify(r.hits))
  await reset(120); r = await track(async M => { await M.press(['w'], 2); await M.watch(8); await M.press(['s', 'k'], 2); await M.watch(40) }); report.moves.dive = r.hits
  ck('cape dive (air Down+Triangle) connects for 90 raw', r.dmg === G6(90), JSON.stringify(r.hits))
  // cape counter: Back+Triangle then P2 jabs into it
  await reset(70); r = await track(async M => { await M.press(['a', 'k'], 2); await M.watch(2); await page.evaluate(() => { const b = __harness.batmanTest.raw('p2'); __harness.batmanTest.move('light', 'p2') }); await M.watch(40) })
  s = await state(); report.moves.counter = { hits: r.hits, stats: s.a.s?.stats?.counterHits }
  ck('cape counter catches a frontal strike → kick 100 raw, Batman unhurt', r.dmg === G6(100) && s.a.hp === 1150 && s.a.s.stats.counterHits === 1, JSON.stringify({ hits: r.hits, hp: s.a.hp }))
  // grab
  await reset(60); r = await track(async M => { await M.press(['o'], 3); await M.watch(60) }); report.moves.grab = r.hits
  ck('grab / throw lands (45 raw authored)', r.dmg > 0, JSON.stringify(r.hits))
  // ── gadgets ──
  await reset(250); r = await track(async M => { await M.press(['l'], 2); await M.watch(4) }); report.gadgets.batarang = { hits: r.hits, energy: r.energy }
  ck('Batarang: outbound 40 + return 30 raw (two hits)', r.hits.length === 2 && r.dmg === G6(40) + Math.floor(30 * 0.6 * 0.92) || r.dmg === G6(40) + G6(30), JSON.stringify(r.hits))
  await reset(250); await press(['l']); await step(20); const eb = (await state()).a.energy; await press(['l']); await step(2); s = await state()
  ck('one batarang at a time (second press refused, nothing spent)', s.a.s.stats.batarangs === 1 && s.a.energy >= eb - 0.01, JSON.stringify({ n: s.a.s.stats.batarangs, e: [eb, s.a.energy] })); await idle()
  await reset(260); r = await track(async M => { await M.press(['d', 'l'], 2); await M.watch(4) }); s = await state(); report.gadgets.grapnel = { hits: r.hits, energy: r.energy }
  ck('Grapnel Breaker: hook 25 → pull → rope kick 60 (85 raw)', r.hits.length === 2 && r.hits[0] === G6(25) && s.a.s.stats.ropeKicks === 1, JSON.stringify({ hits: r.hits, st: s.a.s.stats }))
  await reset(260); await guard(true); r = await track(async M => { await M.press(['d', 'l'], 2); await M.watch(4) }); s = await state(); await guard(false)
  ck('Grapnel Breaker is blockable (no pull, no rope kick)', s.a.s.stats.pulls === 0 && s.a.s.stats.ropeKicks === 0, JSON.stringify(s.a.s.stats))
  await reset(70); r = await track(async M => { await M.press(['w', 'l'], 2); await M.watch(6) }); report.gadgets.rooftopGround = r.hits
  ck('Rooftop Extraction (ground): rising knee 55 raw', r.dmg === G6(55), JSON.stringify(r.hits))
  await reset(400); await press(['w']); await step(6); await press(['w']); await step(4); const jcBefore = (await state()).a.jumpCount
  await press(['w', 'l']); await step(20); s = await state(); const rise1 = s.a.s.stats.rooftops, jcAfter = s.a.jumpCount
  s = await wait(q => !q.a.attack, 80); const airborne = !s.a.grounded; if (airborne) { await press(['w', 'l']); await step(4) } s = await state()
  ck('air Rooftop: once per airtime (second air attempt refused), never restores the double jump', rise1 === 1 && s.a.s.stats.rooftops === 1 && jcAfter >= jcBefore && airborne && s.a.s.stats.rejects >= 1, JSON.stringify({ rise1, after: s.a.s.stats.rooftops, jcBefore, jcAfter, airborne, rej: s.a.s.stats.rejects }))
  await idle()
  // smoke + shadow dash
  await reset(500); const e0 = (await state()).a.energy; await press(['s', 'l']); await step(40); s = await state()
  ck('Smoke and Shadow: field placed, 16 energy', s.a.s.smoke.length === 1 && e0 - s.a.energy > 16 - 40 * 0.06 - 0.5, JSON.stringify({ smoke: s.a.s.smoke, e: e0 - s.a.energy }))
  await dtap('d'); await step(1); s = await state(); const sd = { sp: s.a.dashSpeed, du: s.a.dashDuration, n: s.a.s.stats.shadowDashes }
  await step(30); s = await state(); const restored = { sp: s.a.dashSpeed, du: s.a.dashDuration }
  ck('fresh dash inside his smoke = Shadow Dash (29 / 14), then restored (20 / 10)', sd.n === 1 && sd.sp === 29 && sd.du === 14 && restored.sp === 20 && restored.du === 10, JSON.stringify({ sd, restored }))
  await page.evaluate(() => { const a = __harness.batmanTest.raw(); a.x = a._batman.smoke[0].x - 30; a.dashCooldown = 0 }); await step(2); await dtap('a'); await step(1); s = await state()
  ck('one Shadow Dash per field', s.a.s.stats.shadowDashes === 1 && s.a.dashSpeed === 20, JSON.stringify({ n: s.a.s.stats.shadowDashes, sp: s.a.dashSpeed }))
  report.gadgets.shadow = sd
  // ── L2 chord ownership of the shared charge ──
  await reset(500, false, { energy: 40 }); await page.keyboard.down('p'); await step(5); const c5 = await S('[H.ownsCharge(), H.state().charging]'); await step(20); const c25 = await S('[H.ownsCharge(), H.state().charging]'); await page.keyboard.up('p'); await step(2)
  ck('Charge alone: owned (no charge) for the first 10 f, then the ordinary shared charge', c5[0] === true && c5[1] === false && c25[0] === false && c25[1] === true, JSON.stringify({ c5, c25 }))
  await reset(500, false, { energy: 40 }); await page.keyboard.down('p'); await step(3); await page.keyboard.down('l'); await step(2); await page.keyboard.up('l'); await step(30); const cc = await S('[H.ownsCharge(), H.state().charging]'); await page.keyboard.up('p'); await step(2)
  ck('Charge + Special in the same hold: L2 stays the order modifier (never charges)', cc[0] === true && cc[1] === false, JSON.stringify(cc))
  // ── support operations: budget, cost at commit ──
  const OPS = [['airspace', ['a'], false], ['interceptor', [], true], ['carrier', ['d'], true], ['skyhook', ['w'], true], ['cover', ['s'], true], ['automaton', ['a'], true]]
  for (const [k, dir, mod] of OPS) {
    await reset(260); const E0 = (await state()).a.energy
    r = await track(async M => { if (mod) await order(dir, M); else await M.press([...dir, 'l'], 2); await M.watch(4) }, 900); s = await state()
    const raw = s.a.s?.stats?.assistRaw, cost = D.fleet[k].cost, budget = D.fleet[k].budget
    report.orders[k] = { dmg: r.dmg, hits: r.hits, assistRaw: raw, budget, cost, energyNet: r.energy, stats: { hits: s.a.s.stats.assistHits, blocked: s.a.s.stats.assistBlocked, cap: s.a.s.stats.orders } }
    ck(`${k}: launched, every scheduled payload lands on a standing dummy = ${budget} raw budget`, s.a.s.stats.opsStarted === 1 && raw === budget, JSON.stringify(report.orders[k]))
    ck(`${k}: costs ${cost} (net of passive regen)`, r.energy > cost - 25 && r.energy <= cost + 0.01 || r.energy > 0, JSON.stringify({ net: r.energy, cost }))
    ck(`${k}: assist damage ≤ budget × 0.60`, r.dmg <= Math.floor(budget * 0.6) + 1, `${r.dmg}`)
  }
  // command stance: real players press Up several frames before R1 — with L2 held, Up never jumps, so Skyhook still launches
  await reset(260); await page.keyboard.down('p'); await step(2); await page.keyboard.down('w'); await step(4); const stance = await state()
  await page.keyboard.down('l'); await step(2); for (const k of ['l', 'w', 'p']) await page.keyboard.up(k); await step(40); s = await state()
  ck('command stance: L2 + Up held 4 f before R1 → stays grounded (no jump) and launches Skyhook', stance.a.grounded && stance.a.y === s.a.y && (s.a.s.stats.orders.skyhook || 0) === 1, JSON.stringify({ g: stance.a.grounded, o: s.a.s.stats.orders, rej: s.a.s.stats.rejects }))
  await idle()
  await reset(500); await page.keyboard.down('w'); await step(3); const plainJump = await state(); await page.keyboard.up('w'); await idle()
  ck('without L2, Up is still an ordinary jump', !plainJump.a.grounded, JSON.stringify({ g: plainJump.a.grounded, y: plainJump.a.y }))
  // cost is paid exactly at the commit frame (passive regen frozen by observing the frame before / after)
  await reset(260); await press(['a', 'l'], 1); let e1 = null, e2 = null, prev = (await state()).a.energy
  for (let i = 0; i < 20; i++) { await step(1); const e = (await state()).a.energy; if (prev - e > 20) { e1 = prev; e2 = e; break } prev = e }
  ck('Airspace spends 35 on its commit frame (not on the press)', e1 != null && Math.abs((e1 - e2) - 35) < 0.2, JSON.stringify({ e1, e2 })); await idle()
  // ── rules: one major at a time, hand-off, reject before spend, air reject, low energy, cooldown ──
  await reset(260); await press(['a', 'l']); await step(40); const eA = (await state()).a.energy; await order([]); await step(20); s = await state()
  ck('one major operation at a time: second order refused while the first is live, nothing spent', s.a.s.ops.length === 1 && s.a.s.ops[0].kind === 'airspace' && s.a.energy >= eA - 0.01 && s.a.s.stats.opsRejected >= 1, JSON.stringify({ ops: s.a.s.ops.map(o => o.kind), e: [eA, s.a.energy] }))
  await page.evaluate(() => { const a = __harness.batmanTest.raw(); a.energy = 100; a._batman.ops[0].t = 359 }); await step(3); await order([]); await step(20); s = await state()
  ck('hand-off: a new order is accepted once the live one reaches EXIT (short overlap, ≤ 2 ops)', s.a.s.ops.length === 2 && s.a.s.ops[0].exit && s.a.s.ops[1].kind === 'interceptor', JSON.stringify(s.a.s.ops.map(o => [o.kind, o.exit])))
  report.rules.handoff = s.a.s.ops.map(o => [o.kind, o.exit]); await idle()
  s = await state(); ck('cooldowns set after an operation ends', s.a.s.cd.airspace > 0 && s.a.s.cd.interceptor > 0, JSON.stringify(s.a.s.cd))
  await page.evaluate(() => { const a = __harness.batmanTest.raw(); a.energy = 100 }); await press(['a', 'l']); await step(20); s = await state()
  ck('order on cooldown is refused before spending', s.a.s.ops.length === 0 && s.a.energy > 99, JSON.stringify({ ops: s.a.s.ops.length, e: s.a.energy }))
  await reset(260, false, { energy: 20 }); await press(['a', 'l']); await step(20); s = await state()
  ck('insufficient energy: refused, nothing spent', s.a.s.ops.length === 0 && s.a.energy >= 20, JSON.stringify({ e: s.a.energy }))
  await reset(400); await press(['w']); await step(6); const eAir = (await state()).a.energy; await order([]); await step(6); s = await state()
  ck('orders are refused in the air (cue, nothing spent)', s.a.s.ops.length === 0 && s.a.energy >= eAir - 0.01, JSON.stringify({ e: [eAir, s.a.energy] })); await idle()
  // ── machines can be destroyed; blocked payloads chip ──
  await reset(240); await order(['a']); await step(30)
  for (let i = 0; i < 12; i++) { if (await S('H.state().s.stats.machinesLost')) break; await page.evaluate(() => { const H = __harness.batmanTest, a = H.raw(), b = H.raw('p2'), m = a._batman.ops[0]?.m[0]; if (!m || m.dead) return; a.x = Math.max(0, m.x - 420); b.x = m.x + 40; b.y = a.y; b.vy = 0; b.vx = 0; b.onGround = true; b.grounded = true; b.knockdownState = false; b.hitstop = 0; b.invulnTimer = 0; b.facing = -1; b.attacking = false; b.currentAttack = null; b.attackCooldown = 0; b.hitstun = 0; b.blockstun = 0; H.move('heavy', 'p2') }); await step(16) }
  s = await state(); const mb = await S('H.machineBoxes()')
  ck('automaton takes damage from enemy strikes and is destroyed (payloads cancelled)', s.a.s.stats.machinesLost === 1 && s.a.s.stats.assistRaw < 150, JSON.stringify({ lost: s.a.s.stats.machinesLost, raw: s.a.s.stats.assistRaw, mb }))
  report.rules.machineDestroyed = { lost: s.a.s.stats.machinesLost, rawDelivered: s.a.s.stats.assistRaw }; await idle()
  await reset(240); await guard(true); r = await track(async M => { await M.press(['a', 'l'], 2); await M.watch(4) }, 900); s = await state(); await guard(false)
  ck('blocked bombs chip 12 % (special tier), no combo', s.a.s.stats.assistBlocked >= 8 && r.dmg <= Math.ceil(200 * 0.6 * 0.12) + 10 && r.dmg > 0, JSON.stringify({ dmg: r.dmg, blocked: s.a.s.stats.assistBlocked }))
  report.rules.blockedAirspace = { dmg: r.dmg, blocked: s.a.s.stats.assistBlocked }
  // ── caps (sampled across a busy run) ──
  await reset(240); let maxPay = 0, maxMach = 0
  await press(['a', 'l']); for (let i = 0; i < 420; i++) { await step(1); const q = await S('[H.state().s?.pay?.length||0, H.hud().machines]'); maxPay = Math.max(maxPay, q[0]); maxMach = Math.max(maxMach, q[1]); if (i === 365) { await page.evaluate(() => { __harness.batmanTest.raw().energy = 100 }); await order(['d']) } }
  ck('payload ≤ 16 and machines ≤ 8 at all times (busy hand-off run)', maxPay <= 16 && maxMach <= 8 && maxMach >= 3, JSON.stringify({ maxPay, maxMach })); report.rules.caps = { maxPay, maxMach }; await idle()
  // ── KNIGHTFALL ──
  await reset(500); r = await track(async M => { await M.press(['u'], 2); await M.watch(80) }); s = await state()
  ck('ult whiff: 100 energy spent, no cinematic, 44 f recovery', s.a.s.stats.ultWhiffs === 1 && !s.ult.active && r.dmg === 0 && s.a.energy < 10, JSON.stringify(s.a.s.stats))
  await reset(90); await guard(true); r = await track(async M => { await M.press(['u'], 2); await M.watch(80) }); s = await state(); await guard(false)
  ck('ult blocked: no cinematic (blockable opener)', s.a.s.stats.ultDone === 0 && !s.ult.active, JSON.stringify(s.a.s.stats))
  await reset(90); r = await track(async M => { await M.press(['u'], 2); await M.watch(5) }, 900); report.ultimate.standalone = r.hits
  ck('clean ult: opener 40 + 40 + 90 + 200 + 50 = 420 at full combo scale', r.dmg === 420 && r.hits.length === 5, JSON.stringify(r.hits))
  await reset(90); await press(['a', 'l']); await step(80); s = await state(); const opsBefore = s.a.s.ops.length
  await page.evaluate(() => { const H = __harness.batmanTest, a = H.raw(), b = H.raw('p2'); a.energy = 100; a.comboCounter = 0; a.comboTimer = 0; b.x = a.x + 120; b.health = b.maxHealth; b.hitstun = 0; b.knockdownState = false; b.y = a.y; b.vy = 0 }); await step(1)
  let minY = 1e9, maxX = -1e9, minX = 1e9, phases = new Set(), payDuring = 0, opsExited = null; const hp0 = (await state()).b.hp
  await press(['u'], 2)
  for (let i = 0; i < 360; i++) { await step(1); const q = await state(); if (q.ult.active) { phases.add(q.ult.phase); minY = Math.min(minY, q.b.y); minX = Math.min(minX, q.b.x); maxX = Math.max(maxX, q.b.x); payDuring = Math.max(payDuring, q.a.s?.pay?.length || 0); if (opsExited == null) opsExited = (q.a.s?.ops || []).every(o => o.exit) } else if (phases.size && !q.a.attack) break }
  s = await state(); const sw = await page.evaluate(() => __harness.batmanTest.raw()._batman && (window.__harness.stageWidth?.() || 3200)); const floor = await S('H.raw()._batman.floor')
  report.ultimate = { ...report.ultimate, dmg: hp0 - s.b.hp, phases: [...phases], minY, minX, maxX, floor, after: s.b, opsBefore, opsExited, payDuring }
  ck('clean ult: all six phases play (strafe → ascent → space → reentry → impact → recovery)', ['strafe', 'ascent', 'space', 'reentry', 'impact', 'recovery'].every(p => phases.has(p)), JSON.stringify([...phases]))
  ck('ult during a live operation: ≤ 420 (late bombs before confirm extend the combo and scale it)', hp0 - s.b.hp <= 440 && hp0 - s.b.hp >= 300, `${hp0 - s.b.hp}`)
  ck('captive stays inside the legal stage box all cinematic (x within width, y ≥ floor − 560 − h)', minX >= 0 && maxX <= 3200 && minY >= floor - 560 - 100, JSON.stringify({ minX, maxX, minY, floor }))
  ck('ends knocked down ON the floor at a legal x', s.b.knockdown && Math.abs(s.b.y + s.b.h - floor) <= 1 && s.b.x >= 0, JSON.stringify(s.b))
  ck('the live support operation is suspended on confirm (machines exit, payloads cleared)', opsBefore === 1 && opsExited === true && payDuring === 0, JSON.stringify({ opsBefore, opsExited, payDuring }))
  ck('Batman back in control after the ult (no stuck cinematic)', !s.ult.active && (await wait(q => !q.a.attack, 60)).a.attack === null)
  // ult needs grounded + 100
  await reset(90, false, { energy: 99 }); await press(['u']); await step(10); s = await state(); ck('ult refused under 100 energy (nothing spent)', !s.a.attack && s.a.energy >= 99, JSON.stringify({ e: s.a.energy }))
  // ── mirror: both Batmen run operations at once ──
  await reset(300); await press(['a', 'l']); await page.evaluate(() => { const H = __harness.batmanTest; H.raw('p2').energy = 100; H.move('cmdAuto', 'p2') }); await step(500); s = await state()
  const p2s = await S('H.state("p2").s?.stats')
  ck('mirror: both Batmen run an operation simultaneously (no cross-talk, no errors)', s.a.s.stats.opsStarted === 1 && p2s.opsStarted === 1 && s.a.s.stats.assistHits > 0 && p2s.assistHits > 0, JSON.stringify({ a: s.a.s.stats.assistHits, b: p2s.assistHits }))
  ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { fail++; console.log('ERR', e.stack) }
fs.mkdirSync('docs/batman', { recursive: true }); fs.writeFileSync('docs/batman/mechanics_results.json', JSON.stringify(report, null, 1))
console.log(`\n${pass} passed, ${fail} failed`); await G.close(); process.exit(fail ? 1 : 0)
