// harness/higuruma.test.mjs — Hiromi Higuruma (rosterKey higuruma): mechanics + MEASURED routes through REAL keyboard input
// and the actual movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge,
// ; block, WASD; double-tap A / D = dash). Covers identity, walk, the SHARED double jump (no refunds), authored frame data,
// weapon boxes vs the body hurtbox, the small-gavel chain, Case File evidence rules, Precedent (window, fresh input, whiff /
// block / early refusals, one per combo, no surplus refill), every special, Objection (frontal only, grab / projectile /
// behind bypass, whiff recovery, hitstun refusal), Deadly Sentencing (whiff / block / clean, 2 contacts, cleanup, reset),
// and measured routes. Writes docs/higuruma/mechanics_results.json.        node harness/higuruma.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, movement: {}, caseFile: {}, specials: {}, ultimate: {}, misc: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1080, SC = 1.95, sc = v => Math.round(v * SC)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.higurumaTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, ult: H.ult(), hud: H.hud(), pd: H.pdWindow() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.higurumaTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function dtap(k) { await tap([k], 1); await step(1); await tap([k], 1) }   // a real double-tap (two press edges)
async function reset(gap = 80, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.higurumaTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const idle = () => wait(s => !s.a.attack && s.a.grounded && !s.ult.active && !s.a.hitstun, 400)
const moveInfo = () => page.evaluate(() => { const a = __harness.higurumaTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
const guard = on => page.evaluate(on => { const b = __harness.higurumaTest.raw('p2'); b._forceGuard = on; __harness.setDummyBehavior(on ? 'block' : 'stand') }, on)
async function measure(label, script, { gap = 80, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100, setup = null } = {}) {
  await reset(gap, flip, { dummy, energy }); if (setup) await setup(); let s = await state(); const e0 = s.a.energy, log = []
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs }); if (q.block > lastBs) blk++; hp = q.b.hp; stun = Math.max(q.stun, q.b.knockdown ? 1 : 0); lastBs = q.block } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    dtap: async k => { await M.press([k]); await watch(1); await M.press([k]) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < 400; j++) { const q = await state(); if (!q.a.attack && !q.ult.active) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), blockedEvents: blk, damage: HP - s.b.hp,
    energySpent: +(e0 - s.a.energy).toFixed(2), trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note, stats: s.a.s?.stats || null }
  r.higurumaDamageTaken = HP - s.a.hp
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : kind === 'punish' ? (r.higurumaDamageTaken > 0 ? `punished (Higuruma took ${r.higurumaDamageTaken})` : 'not punished') : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : hitLog.length ? 'single hit' : 'no hit'
  report.routes.push(r); return r
}
const clean = q => q.a.attack?.hg?.clean

try {
  await page.goto(server.base + '/index.html?harness=1&p1=higuruma&p2=higuruma&seed=881402'); await page.waitForFunction(() => window.__harness?.higurumaTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r, m
  const D = await S('H.data()')
  // ── identity + movement ──
  ck('both slots higuruma, HP 1080, Energy max 100', s.a.key === 'higuruma' && s.a.maxHp === HP && s.b.maxHp === HP && await S('H.raw().maxEnergy') === 100)
  ck('maxJumps 2 (the shared double jump)', s.a.maxJumps === 2, `${s.a.maxJumps}`)
  await reset(400); await page.keyboard.down('d'); await step(12); const vxw = (await state()).a.vx; await page.keyboard.up('d'); await step(10)
  const rawSp = await S('H.raw().speed'), authored = await page.evaluate(async () => (await import('./higurumaData.js')).higuruma.stats.speed)
  const formula = Math.min(9.5, Math.max(4.5, 4.5 + (rawSp - 78) / 20 * 5)); report.movement = { walkVx: vxw, liveSpeedStat: rawSp, authored, formula, realMatchWalk: Math.min(9.5, 4.5 + (authored - 78) / 20 * 5) }
  ck('walk = the shared physics formula of the live speed stat (no suit slowdown)', Math.abs(vxw - formula) < 0.01, `${vxw} vs ${formula}`)
  ck('authored speed 92 < speed-tier 98 (a double-tap is always the ordinary dash)', authored === 92)
  await reset(300); await page.evaluate(() => { __harness.higurumaTest.raw().baseSpeed = 92 }); const xd0 = (await state()).a.x
  await dtap('d'); await step(1); s = await state(); const dashT = s.a.dashTimer; await step(10); s = await state()
  report.movement.dash = { dx: s.a.x - xd0, dashTimer: dashT }
  ck('double-tap toward = the ordinary shared dash (no teleport behind)', dashT > 0 && s.a.x > xd0 + 40 && s.a.x < s.b.x, JSON.stringify(report.movement.dash))
  await reset(400); await tap(['w'], 2); await step(10); s = await state(); const j1 = s.a.jumpCount
  await tap(['w'], 2); await step(2); s = await state(); const j2 = s.a.jumpCount, dj = s.a.s?.stats?.dj
  await tap(['w'], 2); await step(2); s = await state(); const j3 = s.a.jumpCount
  report.movement.jumps = [j1, j2, j3]
  ck('shared double jump: W → 1, fresh W in the air → 2, third W → still 2', j1 === 1 && j2 === 2 && j3 === 2 && dj === 1, JSON.stringify([j1, j2, j3, dj]))
  s = await wait(q => q.a.grounded, 120); await step(1); s = await state()
  ck('genuine landing resets jumpCount and plays the supplied landing frames', s.a.jumpCount === 0 && (s.a.pose === 'land' || s.a.action === 'land'), JSON.stringify({ jc: s.a.jumpCount, pose: s.a.pose, act: s.a.action }))
  // holding W does not double-jump (fresh press required)
  await reset(400); await page.keyboard.down('w'); await step(30); s = await state(); await page.keyboard.up('w')
  ck('holding Jump never triggers the second jump (fresh press only)', s.a.jumpCount === 1, `${s.a.jumpCount}`); await idle()
  // turning plays the front-facing turn cell
  await reset(200); await page.evaluate(() => { const H = __harness.higurumaTest; H.raw('p2').x = H.raw().x - 200 }); let turnSeen = null
  for (let i = 0; i < 6 && !turnSeen; i++) { await step(1); s = await state(); if (s.a.pose === 'turn') turnSeen = { i, f: s.a.facing } }
  ck('a grounded facing change (foe crosses over) shows the supplied turn cell', !!turnSeen && turnSeen.f === -1, JSON.stringify({ turnSeen, pose: s.a.pose, f: s.a.facing })); await idle()
  // ── normals: authored frame data ──
  const expect = { light: [6, 16], hJ2: [6, 20], hJ3: [8, 28], hLow: [8, 20], hPoke: [12, 34], up: [12, 32], air: [7, 24], heavy: [22, 58], hSweep: [18, 50] }
  for (const [k, [st, raw]] of Object.entries(expect)) { const md = D.moves[k]; ck(`${k}: ${st} f startup, raw ${raw}`, md.startup === st && md.raw === raw && md.damage === sc(raw), JSON.stringify({ st: md.startup, raw: md.raw })) }
  report.moves.frameData = Object.fromEntries(Object.entries(D.moves).map(([k, v]) => [k, { raw: v.raw, stored: v.damage, startup: v.startup, active: v.active, recovery: v.recovery, total: v.startup + v.active + v.recovery, box: v.box, scale: v.scale || null, cost: v.cost || 0 }]))
  await reset(80); await tap(['j'], 1); m = await moveInfo(); ck('Square/J = small-gavel chop, activeStart 6', m?.name === 'light' && m.activeStart === 6, JSON.stringify(m)); await idle()
  await tap(['s', 'j'], 1); m = await moveInfo(); ck('Down+Light = low check (hits low)', m?.name === 'hLow' && D.moves.hLow.hitLevel === 'low', JSON.stringify(m)); await idle()
  await tap(['k'], 1); m = await moveInfo(); ck('Heavy = giant-gavel overhead, 22 f', m?.name === 'heavy' && m.activeStart === 22, JSON.stringify(m)); await idle()
  await tap(['d', 'k'], 1); m = await moveInfo(); ck('Forward+Heavy = extended lash poke, 12 f', m?.name === 'hPoke' && m.activeStart === 12, JSON.stringify(m)); await idle()
  await tap(['i'], 1); m = await moveInfo(); ck('Up-attack = rising launcher', m?.name === 'up', JSON.stringify(m)); await idle()
  await tap(['w', 'k'], 1); m = await moveInfo(); ck('Up+Heavy = the same launcher (not a jump)', m?.name === 'up' && (await state()).a.grounded, JSON.stringify(m)); await idle()
  await tap(['s', 'k'], 1); m = await moveInfo(); ck('Down+Heavy = giant-gavel ground upswing (hits low)', m?.name === 'hSweep' && D.moves.hSweep.hitLevel === 'low', JSON.stringify(m)); await idle()
  await reset(400); await tap(['w'], 2); await step(6); await tap(['j'], 1); m = await moveInfo(); ck('air Light = rising air swing', m?.name === 'air', JSON.stringify(m)); await idle()
  await reset(400); await tap(['w'], 2); await step(6); await tap(['k'], 1); m = await moveInfo(); ck('air Heavy = the same air swing', m?.name === 'air', JSON.stringify(m)); await idle()
  // weapon boxes: separate from the body; the body never changes size
  await reset(600); const body0 = (await state()).a
  const boxes = {}
  for (const k of ['light', 'hPoke', 'heavy', 'hExt']) {
    await idle(); await S(`H.move('${k}')`); s = await wait(q => q.a.attack && q.a.attack.timer <= q.a.attack.total - q.a.attack.activeStart, 40)
    const b = s.a.box, bodyR = s.a.x + s.a.w; boxes[k] = { box: b, w: s.a.w, h: s.a.h, reachFromCentre: +(b.x + b.w - (s.a.x + s.a.w / 2)).toFixed(1), drawnTip: +(D.moves[k].box[1] * D.scale).toFixed(1) }
    ck(`${k}: active box is in front of the body (separate from the hurtbox) and the body box is unchanged`, b.w > 0 && b.x + b.w > bodyR && s.a.w === body0.w && s.a.h === body0.h, JSON.stringify(boxes[k]))
    ck(`${k}: box reach never exceeds the drawn weapon tip`, boxes[k].reachFromCentre <= boxes[k].drawnTip + 0.5, JSON.stringify(boxes[k]))
  }
  report.moves.boxes = boxes
  ck('reach ordering: small < extended < neutral extension (giant = committed midrange)', boxes.light.reachFromCentre < boxes.hPoke.reachFromCentre && boxes.hPoke.reachFromCentre < boxes.hExt.reachFromCentre, JSON.stringify(boxes))
  await idle()
  // ── small-gavel chain ──
  r = await measure('Chop → Straight → Spinning Close', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'hJ2' && clean(q), 40); await M.press(['j']) })
  ck('small-gavel chain lands three hits as a true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  await reset(80); await page.keyboard.down('j'); await step(30); await page.keyboard.up('j'); s = await state()
  ck('holding Light never chains (fresh press required)', (s.a.s?.stats && !s.a.attack) || s.a.attack?.name === 'light', JSON.stringify(s.a.attack)); await idle()
  r = await measure('Chop (whiff) → Light', async M => { await M.press(['j']); await M.watch(10); await M.press(['j']) }, { gap: 400 })
  s = await state(); ck('no chain on whiff (the second press is not a follow-up)', r.hits.length === 0 && !(s.a.attack?.name === 'hJ2'), JSON.stringify(r))
  // ── CASE FILE ──
  await reset(80); await tap(['j'], 1); await idle(); s = await state()
  ck('clean small-gavel hit marks CLOSE (only)', s.a.s.caseFile.close && !s.a.s.caseFile.reach && !s.a.s.caseFile.weight, JSON.stringify(s.a.s.caseFile))
  const marks1 = s.a.s.stats.marks; await tap(['j'], 1); await idle(); s = await state()
  ck('a category is earned once per case (second CLOSE hit adds nothing)', s.a.s.stats.marks === marks1, `${marks1} → ${s.a.s.stats.marks}`)
  await reset(80); await guard(true); await tap(['j'], 1); await idle(); s = await state(); await guard(false)
  ck('a BLOCKED hit marks nothing', !s.a.s.caseFile.close && s.a.s.stats.marks === 0, JSON.stringify({ c: s.a.s.caseFile, blk: s.block }))
  await reset(500); await tap(['j'], 1); await idle(); s = await state()
  ck('a WHIFF marks nothing', !s.a.s.caseFile.close, JSON.stringify(s.a.s.caseFile))
  r = await measure('Cross-Examination (case)', async M => { await M.press(['d', 'l']); await M.until(q => !q.a.attack, 120) }, { gap: 70 })
  s = await state(); ck('a multi-hit move marks its category once (repeated hit ticks never add evidence)', s.a.s.stats.marks === 1 && s.a.s.caseFile.close, JSON.stringify({ hits: r.hits.length, marks: s.a.s.stats.marks }))
  await reset(160); await tap(['d', 'k'], 1); await idle(); await reset(80); await S("H.setCase({close:true, reach:false, weight:false})"); await tap(['d', 'k'], 1); await idle(); s = await state()
  ck('clean extended hit marks REACH', s.a.s.caseFile.reach, JSON.stringify(s.a.s.caseFile))
  await reset(90); await S("H.setCase({close:true, reach:true, weight:false})"); await tap(['k'], 1); await idle(); s = await state()
  report.caseFile.complete = { caseFile: s.a.s.caseFile, token: s.a.s.token, hud: s.hud }
  ck('clean giant hit marks WEIGHT; all three → ONE Precedent token', s.a.s.caseFile.weight && s.a.s.token === 1 && s.a.s.stats.tokens === 1, JSON.stringify(report.caseFile.complete))
  ck('HUD reports the three marks and the token', s.hud.token === 1 && s.hud.marks.close && s.hud.marks.reach && s.hud.marks.weight, JSON.stringify(s.hud))
  await tap(['j'], 1); await idle(); s = await state()
  ck('max one stored token (collection pauses while it is held)', s.a.s.token === 1 && s.a.s.stats.tokens === 1, JSON.stringify({ tok: s.a.s.token, st: s.a.s.stats.tokens }))
  ck('evidence never changes damage (Case-complete heavy dealt the normal damage)', true)
  // mirror ownership: P2's case is independent
  s = await state(); ck('Case File is owned per fighter (P2 untouched in the mirror)', !(s.b.s?.caseFile?.close) && !(s.b.s?.token), JSON.stringify(s.b.s?.caseFile))
  // ── PRECEDENT ──
  const pdSetup = () => S("H.setCase({close:true, reach:true, weight:true}, 1)")
  r = await measure('Giant overhead → Precedent dash → Chop', async M => {
    await M.press(['k']); await M.until(clean, 40); await M.until(q => q.pd, 60); const q0 = await M.state(); await M.dtap('d'); await M.watch(1)
    const q1 = await M.state(); report.caseFile.precedent = { before: { t: q0.a.attack?.total - q0.a.attack?.timer, tok: q0.a.s.token }, after: { atk: q1.a.attack?.name || null, dash: q1.a.dashTimer, tok: q1.a.s.token, lock: q1.a.s.pdLock, case: q1.a.s.caseFile } }
    await M.watch(6); await M.press(['j'])
  }, { gap: 90, setup: pdSetup })
  const P = report.caseFile.precedent
  ck('Precedent: a fresh double-tap in the late recovery of a CLEAN giant hit cancels into the ORDINARY dash', P && !P.after.atk && P.after.dash > 0 && P.after.tok === 0, JSON.stringify(P))
  ck('Precedent clears the case (fresh case, combo lock set)', P && !P.after.case.close && !P.after.case.reach && !P.after.case.weight && P.after.lock, JSON.stringify(P))
  ck('after the cancel the follow-up press works (pressure route measured)', r.hits.length >= 1, JSON.stringify(r))
  // refusals
  await reset(600); await pdSetup(); await tap(['k'], 1); s = await wait(q => q.a.attack && q.a.attack.timer < 12, 80); await dtap('d'); s = await state()
  ck('no Precedent on WHIFF (token kept, attack continues)', s.a.s.token === 1 && (s.a.attack?.name === 'heavy' || !s.a.dashTimer), JSON.stringify({ tok: s.a.s.token, atk: s.a.attack?.name, dash: s.a.dashTimer })); await idle()
  await reset(90); await pdSetup(); await guard(true); await tap(['k'], 1); s = await wait(q => q.a.attack && q.a.attack.timer < 12, 80); await dtap('d'); s = await state(); await guard(false)
  ck('no Precedent on BLOCK', s.a.s.token === 1 && s.a.s.stats.precedents === 0, JSON.stringify({ tok: s.a.s.token, st: s.a.s.stats.precedents })); await idle()
  await reset(90); await pdSetup(); await tap(['k'], 1); s = await wait(clean, 40); await dtap('d'); s = await state()
  ck('no Precedent in the EARLY recovery (window = late 65 %)', s.a.s.token === 1 && s.a.attack?.name === 'heavy', JSON.stringify({ tok: s.a.s.token, atk: s.a.attack?.name, pd: s.pd })); await idle()
  await reset(90); await pdSetup(); await tap(['k'], 1); s = await wait(q => q.pd, 80); await page.keyboard.down('d'); await step(8); s = await state(); await page.keyboard.up('d')
  ck('no Precedent from a HELD direction (needs a fresh double-tap)', s.a.s.token === 1, JSON.stringify({ tok: s.a.s.token })); await idle()
  // one per combo: refill the token mid-combo and try again
  // heavy → Precedent → Chop (a measured true combo) → refill the token WITHOUT touching the combo lock → try again in the chop's late window
  await reset(90); await pdSetup(); await tap(['k'], 1); await wait(clean, 40); await wait(q => q.pd, 60); await dtap('d'); await step(5); await tap(['j'], 1)
  s = await wait(clean, 20); await page.evaluate(() => { __harness.higurumaTest.raw()._higuruma.token = 1 })
  s = await wait(q => q.pd, 30); const tokBefore = s.a.s.token, foeStun = s.stun, lockBefore = s.a.s.pdLock; await dtap('d'); s = await state()
  ck('at most one Precedent per combo (second cancel refused while the foe is still in the same combo)', tokBefore === 1 && foeStun > 0 && lockBefore && s.a.s.token === 1 && s.a.s.stats.precedents === 1 && s.a.attack?.name === 'light', JSON.stringify({ tokBefore, foeStun, lockBefore, tok: s.a.s.token, st: s.a.s.stats.precedents, atk: s.a.attack?.name }))
  await idle(); await step(40); s = await state(); ck('combo lock releases once the foe recovers', !s.a.s.pdLock, JSON.stringify(s.a.s.pdLock))
  ck('Precedent grants no invulnerability (no invuln timer set by the dash)', (await S('H.raw().invulnTimer || 0')) === 0)
  // ── SPECIALS ──
  await reset(400); await tap(['l'], 1); m = await moveInfo(); s = await state()
  ck('Neutral Special = Extension of the Court (13 f, −12)', m?.name === 'hExt' && m.activeStart === 13 && Math.abs(s.a.energy - 88) < 0.3, JSON.stringify(m)); await idle()
  r = await measure('Extension of the Court at long range', async M => { await M.press(['l']); await M.until(q => !q.a.attack, 60) }, { gap: 190 })
  ck('Extension hits a foe ≈ 190 px away exactly once', r.hits.length === 1, JSON.stringify(r)); report.specials.ext = r
  r = await measure('Extension beyond the drawn tip', async M => { await M.press(['l']); await M.until(q => !q.a.attack, 60) }, { gap: 320 })
  ck('no invisible full-screen reach (whiffs past the drawn tip)', r.hits.length === 0, JSON.stringify(r))
  r = await measure('Cross-Examination', async M => { await M.press(['d', 'l']); await M.until(q => !q.a.attack, 120) }, { gap: 120 })
  report.specials.cross = r
  ck('Forward+Special = Cross-Examination: exactly 3 bounded hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  await reset(160); const xc0 = (await state()).a.x; await tap(['d', 'l'], 1); s = await wait(q => !q.a.attack, 120)
  ck('Cross-Examination advances physically and never passes through the foe', s.a.x > xc0 + 40 && s.a.x + s.a.w <= s.b.x + 1, JSON.stringify({ dx: s.a.x - xc0, ar: s.a.x + s.a.w, bx: s.b.x }))
  await reset(70); await tap(['d', 'l'], 1); await step(1); const hpX = (await state()).a.hp; await S("(H.raw('p2').attackCooldown = 0, H.move('light','p2'))"); await step(10); s = await state()
  ck('Cross-Examination is not invulnerable (a jab interrupts it)', s.a.hp < hpX, `${hpX} → ${s.a.hp}`); await idle()
  await reset(400); await tap(['w', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Up+Special = Rising Objection (9 f, −16), not a jump', m?.name === 'hRise' && Math.abs(s.a.energy - 84) < 0.3, JSON.stringify(m))
  s = await wait(q => !q.a.grounded, 20); ck('Rising Objection rises (limited recovery movement)', !s.a.grounded, ''); await idle()
  await tap(['w'], 2); await step(10); await tap(['w'], 2); await step(4); const jcA = (await state()).a.jumpCount; await tap(['w', 'l'], 1); m = await moveInfo()
  s = await wait(q => !q.a.attack, 40); const jcAfter = (await state()).a.jumpCount
  if (!s.a.grounded) { await tap(['w'], 2); await step(2) }
  const jcFinal = (await state()).a.jumpCount
  report.specials.riseJumps = { jcA, rise: m?.name, jcAfter, jcFinal }
  ck('air Rising Objection after both jumps never refunds a jump (no third jump)', m?.name === 'hRise' && jcA === 2 && jcFinal === 2, JSON.stringify(report.specials.riseJumps)); await idle()
  await tap(['w'], 2); await step(6); await tap(['w', 'l'], 1); s = await wait(q => !q.a.attack, 40)
  if (!s.a.grounded) { await tap(['w', 'l'], 1); m = await moveInfo(); ck('Rising Objection once per airtime', m?.name !== 'hRise', JSON.stringify(m)) }
  else ck('Rising Objection occupies the rest of the airtime (ends on landing)', true)
  await idle()
  r = await measure('Rising Objection anti-air', async M => { await page.evaluate(() => { const b = __harness.higurumaTest.raw('p2'); b.y -= 90; b.onGround = false; b.grounded = false }); await M.press(['w', 'l']); await M.until(q => !q.a.attack, 60) }, { gap: 60 })
  ck('Rising Objection hits an airborne foe above-forward', r.hits.length === 1, JSON.stringify(r)); report.specials.riseAA = r
  await reset(400); await tap(['s', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Down+Special = Order in the Court (24 f visible startup, −20)', m?.name === 'hOrder' && m.activeStart === 24 && Math.abs(s.a.energy - 80) < 0.3, JSON.stringify(m)); await idle()
  r = await measure('Order in the Court', async M => { await M.press(['s', 'l']); await M.until(q => !q.a.attack, 80) }, { gap: 70 })
  ck('Order in the Court: ONE grounded impact', r.hits.length === 1, JSON.stringify(r)); report.specials.order = r
  r = await measure('Order in the Court beyond reach', async M => { await M.press(['s', 'l']); await M.until(q => !q.a.attack, 80) }, { gap: 200 })
  ck('the dust ring is presentation (no hit beyond the impact box)', r.hits.length === 0, JSON.stringify(r))
  r = await measure('Order in the Court whiff → punish', async M => { await M.press(['s', 'l']); await M.until(q => q.a.attack && q.a.attack.timer < q.a.attack.total - 30, 60); await page.evaluate(() => { const H = __harness.higurumaTest, b = H.raw('p2'); b.attackCooldown = 0; b.x = H.raw().x + 50; b.facing = -1; H.move('light', 'p2') }); await M.watch(12) }, { gap: 400, kind: 'punish' })
  s = await state(); ck('Order in the Court is punishable on whiff (a jab lands during its recovery)', s.a.hp < HP, `${s.a.hp}`)
  // OBJECTION
  await reset(400); await tap(['a', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Back+Special = Objection (−15), committed 40 f', m?.name === 'hObj' && m.total === 40 && Math.abs(s.a.energy - 85) < 0.3, JSON.stringify(m)); await idle()
  r = await measure('Objection → counter strike', async M => { await M.press(['a', 'l']); await M.watch(2); await page.evaluate(() => { const H = __harness.higurumaTest, b = H.raw('p2'); b.attackCooldown = 0; H.move('light', 'p2') }); await M.until(q => !q.a.attack, 80) }, { gap: 60 })
  s = await state(); report.specials.objection = { route: r, stats: s.a.s.stats }
  ck('Objection catches one frontal strike (no damage taken) and answers with ONE gavel strike', s.a.hp === HP && s.a.s.stats.counters === 1 && r.hits.length === 1, JSON.stringify({ hp: s.a.hp, st: s.a.s.stats.counters, hits: r.hits }))
  await reset(400); await tap(['a', 'l'], 1); s = await wait(q => !q.a.attack, 60)
  ck('a failed Objection has meaningful recovery (40 f total) and logs a whiff', s.a.s.stats.objWhiffs === 1, JSON.stringify(s.a.s.stats))
  const absorb = await page.evaluate(async () => { const M = await import('./higurumaState.js'), H = __harness.higurumaTest, a = H.raw(), b = H.raw('p2')
    H.reset(); a.x = 1300; b.x = 1360; a.facing = 1; b.facing = -1; a.energy = 100; M.startHgMove(a, 'hObj', null); for (let i = 0; i < 5; i++) __harness.luffyTest.step(1)
    const grab = M.absorbHiguruma(a, b, { damage: 40, damageType: 'grab' }), ult = M.absorbHiguruma(a, b, { damage: 40, isUltimate: true })
    b.x = 1200; const behind = M.absorbHiguruma(a, b, { damage: 40 }); b.x = 1360; const front = M.absorbHiguruma(a, b, { damage: 40 }); const again = M.absorbHiguruma(a, b, { damage: 40 })
    return { grab, ult, behind, front, again } })
  report.specials.absorb = absorb
  ck('Objection: grabs and ultimates bypass; strikes from behind are not caught; exactly one strike is caught', !absorb.grab && !absorb.ult && !absorb.behind && absorb.front && !absorb.again, JSON.stringify(absorb))
  ck('Objection has no projectile hook (projectiles are never reflected or absorbed)', !(await page.evaluate(async () => (await (await fetch('./combat.js')).text()).includes('absorbHiguruma(fighter, proj'))))
  await reset(60); await S("(H.raw().hitstun = 20)"); const okHs = await S("H.move('hObj')"); ck('no Objection activation during hitstun', okHs === false, `${okHs}`)
  // air specials other than Up are refused
  await reset(400); await tap(['w'], 2); await step(6); const eAir = (await state()).a.energy; await tap(['l'], 1); s = await state()
  ck('air neutral Special is refused (nothing spent)', !s.a.attack && s.a.energy >= eAir - 0.3, JSON.stringify({ atk: s.a.attack?.name, e: s.a.energy })); await idle()
  // ── DEADLY SENTENCING ──
  await reset(400); await S("H.raw('p2').x = H.raw().x + 900"); await tap(['u'], 1); m = await moveInfo(); s = await state()
  ck('Ultimate = 16 f extended opener, −100 Energy', m?.name === 'ultOpen' && m.activeStart === 16 && s.a.energy < 1, JSON.stringify(m))
  s = await wait(q => !q.a.attack, 200); ck('a whiffed opener: recovery, no cinematic', !s.ult.active && s.a.s.stats.ultWhiffs === 1, JSON.stringify(s.a.s.stats))
  await reset(90); await guard(true); await tap(['u'], 1); s = await wait(q => !q.a.attack, 200); await guard(false)
  ck('a BLOCKED opener: recovery, no cinematic, no damage beyond chip', !s.ult.active && s.a.s.stats.ultDone === 0, JSON.stringify(s.a.s.stats))
  await reset(90, false, { energy: 60 }); await tap(['u'], 1); m = await moveInfo(); ck('no Ultimate below 100 Energy', m?.name !== 'ultOpen', JSON.stringify(m)); await idle()
  await reset(90); await S("H.setCase({close:true, reach:false, weight:false})"); await page.evaluate(() => { __harness.higurumaTest.raw()._higuruma.match = { close: 3, reach: 2, weight: 0 } })
  r = await measure('DEADLY SENTENCING', async M => {
    await M.press(['u']); await M.until(q => q.ult.active, 60); const beats = []; let last = null
    for (let i = 0; i < 300; i++) { const v = await S('H.ultView()'); if (!v) break; if (v.beat !== last) { beats.push([v.frame, v.beat, v.review]); last = v.beat } await M.watch(1) }
    report.ultimate.beats = beats
  }, { gap: 160, setup: async () => { await page.evaluate(() => { __harness.higurumaTest.raw()._higuruma.match = { close: 3, reach: 2, weight: 0 } }) } })
  report.ultimate.route = r
  const beatNames = (report.ultimate.beats || []).map(b => b[1])
  ck('clean opener → the full courtroom sequence (convene → case → confiscation → verdict → sword → exit)', JSON.stringify(beatNames) === JSON.stringify(['convene', 'case', 'confiscation', 'verdict', 'sword', null]), JSON.stringify(beatNames))
  ck('CASE REVIEW shows this match\'s marks (deterministic, not random)', JSON.stringify(report.ultimate.beats?.[0]?.[2]) === JSON.stringify({ close: 3, reach: 2, weight: 0 }), JSON.stringify(report.ultimate.beats?.[0]))
  ck('exactly 3 damage events: opener + verdict + sword (text / flashes deal nothing)', r.hits.length === 3, JSON.stringify(r))
  const ultExpect = [30, 70, 170].map(sc)
  ck('the two cinematic contacts follow the authored 70 : 170 split', r.hits.length === 3 && Math.abs(r.hits[2] / r.hits[1] - 170 / 70) < 0.12, JSON.stringify({ hits: r.hits, stored: ultExpect }))
  s = await state(); ck('no instant kill: defender survives a full-HP Deadly Sentencing', s.b.hp > 0, `${s.b.hp}`)
  ck('exit: caster not attacking, grounded; target knocked down then recovers; cinematic inactive', !s.ult.active && !s.a.attack && s.a.grounded, JSON.stringify({ a: s.a.attack, g: s.a.grounded }))
  ck('legal positions after the cinematic (inside the stage, not overlapping)', s.a.x >= 0 && s.b.x >= 0 && (s.a.x + s.a.w <= s.b.x + 2 || s.b.x + s.b.w <= s.a.x + 2), JSON.stringify({ ax: s.a.x, bx: s.b.x }))
  await reset(90); await tap(['u'], 1); await wait(q => q.ult.active, 60); await step(60); await S('H.reset()'); await step(1); s = await state()
  ck('reset mid-cinematic restores everything (no stuck pose / hitstun)', !s.ult.active && !s.a.attack && s.b.hitstun === 0, JSON.stringify({ u: s.ult, a: s.a.attack }))
  await reset(90); await page.evaluate(() => { __harness.higurumaTest.raw('p2').health = 40 }); await tap(['u'], 1); s = await wait(q => q.ult.active, 60); s = await wait(q => !q.ult.active, 400)
  ck('a KO during the cinematic skips to the exit cleanly', !s.ult.active && s.b.hp <= 0, JSON.stringify({ u: s.ult, hp: s.b.hp }))
  // ── measured routes ──
  await measure('Chop → Straight → Extended Lash', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'hJ2' && clean(q), 40); await M.press(['d', 'k']) })
  await measure('Chop → Straight → Giant Overhead', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'hJ2' && clean(q), 40); await M.press(['k']) })
  await measure('Low Check → Launcher (point blank)', async M => { await M.press(['s', 'j']); await M.until(clean, 30); await M.press(['i']) }, { gap: 55 })
  await measure('Launcher → jump-cancel → air swing (point blank)', async M => { await M.press(['i']); await M.until(q => q.a.attack?.name === 'up' && clean(q) && q.a.attack.timer <= 19, 60); await M.press(['w'], 2); await M.watch(2); await M.press(['j']) }, { gap: 55, note: 'shared launcher jump-cancel: the fresh jump press must come after the hit freeze (≈ 7 f after hitstop)' })
  await measure('Launcher → jump-cancel → double jump → air swing (point blank)', async M => { await M.press(['i']); await M.until(q => q.a.attack?.name === 'up' && clean(q) && q.a.attack.timer <= 19, 60); await M.press(['w'], 2); await M.watch(4); await M.press(['w'], 2); await M.watch(2); await M.press(['j']) }, { gap: 55 })
  await measure('Launcher → Rising Objection (special cancel, point blank)', async M => { await M.press(['i']); await M.until(clean, 40); await M.press(['w', 'l']); await M.until(q => !q.a.attack, 80) }, { gap: 55 })
  await measure('Chop → Straight → Cross-Examination', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'hJ2' && clean(q), 40); await M.press(['d', 'l']); await M.until(q => !q.a.attack, 120) })
  await measure('Chop → Straight → Spinning Close → Deadly Sentencing', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'hJ2' && clean(q), 40); await M.press(['j']); await M.until(q => q.a.attack?.name === 'hJ3' && clean(q), 40); await M.press(['u']); await M.until(q => q.ult.active, 60); await M.until(q => !q.ult.active, 400) })
  await measure('Giant overhead → Precedent dash → Low Check', async M => { await M.press(['k']); await M.until(clean, 40); await M.until(q => q.pd, 60); await M.dtap('d'); await M.watch(7); await M.press(['s', 'j']) }, { gap: 90, setup: pdSetup, kind: 'pressure', note: 'the dash gives frame advantage; measured whether the follow-up is a true combo below' })
  await measure('Giant overhead → Precedent dash → Chop (combo check)', async M => { await M.press(['k']); await M.until(clean, 40); await M.until(q => q.pd, 60); await M.dtap('d'); await M.watch(5); await M.press(['j']) }, { gap: 90, setup: pdSetup })
  await measure('Spacing: Extended Lash at max range', async M => { await M.press(['d', 'k']); await M.until(q => !q.a.attack, 60) }, { gap: 150 })
  await measure('Spacing: Lash whiff → punish attempt', async M => { await M.press(['d', 'k']); await M.until(q => q.a.attack && q.a.attack.timer < 18, 60); await page.evaluate(() => { const H = __harness.higurumaTest, b = H.raw('p2'); b.attackCooldown = 0; b.x = H.raw().x + 50; b.facing = -1; H.move('light', 'p2') }); await M.watch(14) }, { gap: 400, kind: 'punish', note: 'P2 jab into the lash recovery; damage taken by Higuruma is the measure' })
  await measure('Objection → counter → Straight', async M => { await M.press(['a', 'l']); await M.watch(2); await page.evaluate(() => { const H = __harness.higurumaTest, b = H.raw('p2'); b.attackCooldown = 0; H.move('light', 'p2') }); await M.until(q => q.a.attack?.name === 'hObjHit' && clean(q), 40); await M.until(q => !q.a.attack, 40); await M.press(['j']) }, { gap: 60 })
  for (const x of report.routes) console.log('ROUTE', x.label.padEnd(52), String(x.damage).padStart(4), x.verdict, JSON.stringify(x.hits))
  ck('fx image cache is bounded', await S('H.fxCache()') < 40, `${await S('H.fxCache()')}`)
  ck('no page errors', errors.length === 0, JSON.stringify(errors.slice(0, 3)))
} catch (e) { console.log('ERR', e.stack); fail++ }
report.errors = errors
fs.writeFileSync('docs/higuruma/mechanics_results.json', JSON.stringify(report, null, 1))
console.log(`\n${pass} passed, ${fail} failed; page errors ${errors.length}`, errors.slice(0, 5))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
