// harness/mmpr_white.test.mjs — White Ranger (Tommy Oliver, mmpr_white) + Ninja Megazord orders: mechanics + MEASURED routes.
// Real keyboard input through the actual movement/command parsers (P1: J light, K heavy, I up-attack, L special,
// U ultimate, ; block, WASD). Writes docs/mmpr_white/mechanics_results.json.   node harness/mmpr_white.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, orders: {}, disciplines: {}, formation: {}, leader: {}, specials: {}, teleport: {}, ultimate: {}, resources: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1000, SC = 1.7, sc = v => Math.round(v * SC)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.mmprWhiteTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, combo: H.raw().comboCounter, ult: H.ult() } })
async function tap(ks, n = 1) { for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 72, flip = false, opts = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.mmprWhiteTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, opts]); await step(1)
}
async function wait(pred, max = 100) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const clean = () => wait(s => s.a.attack?.mw?.clean), rec = () => wait(s => s.a.cancel.open)
// Scripted route: M.press(keys) / M.watch(n) / M.until(pred,max) drive real input while every HP drop is logged with the
// defender's hitstun on the frame BEFORE it landed. TRUE combo = every hit after the first landed with stunBefore > 0.
async function measure(label, script, { gap = 72, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100, pre = null } = {}) {
  await reset(gap, flip, { dummy, energy }); if (pre) await pre(); let s = await state(); const e0 = s.a.energy, p0 = s.a.hud.pips, log = [], marks = {}
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) { log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs, gap: Math.round(Math.abs((q.b.x + q.b.w / 2) - (q.a.x + q.a.w / 2))) }); hp = q.b.hp } if (q.block > lastBs) blk++; lastBs = q.block; stun = q.stun } }
  const M = { watch, mark: k => { marks[k] = frame }, state, frame: () => frame,
    press: async (keys, hold = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(hold); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() },
    hits: () => log.length }
  await script(M)
  for (let j = 0; j < 260 && ((await state()).a.attack || (await state()).a.falcon?.sortie || (await state()).ult.active); j++) await watch(1)
  s = await state()
  const hitLog = log.filter(x => !x.blocked)
  const firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), gapAtHit: hitLog.map(x => x.gap), blockedEvents: blk, damage: 1000 - s.b.hp,
    energySpent: +(e0 - s.a.energy).toFixed(2), pipsSpent: p0 - s.a.hud.pips, trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, marks,
    stats: s.a.s?.stats, gap, flip, note }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1} (defender free before it; escape window measured)` : 'single hit'
  report.routes.push(r); return r
}
const moveInfo = () => page.evaluate(() => { const a = __harness.mmprWhiteTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.mmprWhiteTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])

try {
  await page.goto(server.base + '/index.html?harness=1&p1=mmpr_white&p2=mmpr_white&seed=550202'); await page.waitForFunction(() => window.__harness?.mmprWhiteTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r
  ck('both slots mmpr_white, HP 1000, max 100 Energy, ordinary start (<60), 2 Command pips full', s.a.key === 'mmpr_white' && s.a.hp === HP && s.b.hp === HP && s.a.energy < 60 && s.a.hud.pips === 2, JSON.stringify({ e: s.a.energy, hud: s.a.hud }))
  ck('rangers.js profile ticking (2 blink charges, engine dash off)', s.a.ranger?.charges === 2 && s.a.noDash)
  // movement: measured in engine units
  await reset(600); const x0 = (await state()).a.x; await page.keyboard.down('d'); await step(60); await page.keyboard.up('d'); report.resources.walk60f = Math.round((await state()).a.x - x0)
  await reset(600); await page.keyboard.down('w'); let apex = 0; const y0 = (await state()).a.y; for (let i = 0; i < 80; i++) { await step(1); apex = Math.max(apex, y0 - (await state()).a.y) } await page.keyboard.up('w'); await wait(s => s.a.grounded, 120)
  report.resources.jumpApexPx = Math.round(apex); ck('movement measured: walks and one normal jump', report.resources.walk60f > 100 && apex > 80, JSON.stringify(report.resources))

  // ── AUTHORED FRAME DATA via the real command inputs ──
  const want = { light: [5, 2, 10], heavy: [14, 3, 26], wLow: [8, 2, 16], up: [12, 3, 22], wAdv: [10, 3, 19], wAnswer: [13, 3, 28], wAscent: [10, 8, 20], wCall: [12, 1, 14], wUltOpen: [30, 3, 60] }
  for (const [k, inp] of [['light', ['j']], ['heavy', ['k']], ['wLow', ['s', 'j']], ['up', ['i']], ['wAdv', ['d', 'k']], ['wAnswer', ['l']], ['wAscent', ['s', 'l']], ['wCall', ['d', 'l']], ['wUltOpen', ['u']]]) {
    await reset(400); await tap(inp); const m = await moveInfo(); const [st, ac, rc] = want[k]
    report.moves[k] = m; ck(`${k}: startup ${st}, active ${ac}, total ${st + ac + rc}`, m?.name === k && m.activeStart === st && m.total === st + ac + rc, JSON.stringify(m))
  }
  await reset(400); await tap(['w']); await step(6); await tap(['s', 'l']); report.moves.wDescent = await moveInfo(); ck('air Down+Special = Tiger Descent, startup 12', report.moves.wDescent?.name === 'wDescent' && report.moves.wDescent.activeStart === 12, JSON.stringify(report.moves.wDescent))
  await wait(s => s.a.grounded, 120)

  // ── NORMALS / STRINGS ──
  for (const flip of [false, true]) { r = await measure('Light chain J1 -> J2 -> J3' + (flip ? ' (mirrored)' : ''), async M => { await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']) }, { flip }); ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r)) }
  const J1 = report.routes[0].hits[0]; report.engineDamageScale = +(J1 / sc(18)).toFixed(3)
  await reset(); await page.keyboard.down('j'); await step(90); await page.keyboard.up('j'); s = await state(); ck('held Light never auto-chains (fresh retaps only)', s.b.hp === HP - J1, String(HP - s.b.hp))
  await reset(); await tap(['j']); await clean(); await rec(); await tap(['j']); await clean(); await rec(); await tap(['j']); await clean(); await rec(); await tap(['j']); s = await state()
  ck('three Light stages maximum', s.a.attack?.name === 'wJ3' || !s.a.attack, String(s.a.attack?.name))
  r = await measure('Low -> Heavy (Saba Cut) -> Saba\'s Answer', async M => { await M.press(['s', 'j']); await M.until(q => q.a.cancel.open); await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['l']) })
  ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  r = await measure('Forward+Heavy -> Heavy -> Heavy (advance -> Saba -> knock-away)', async M => { await M.press(['d', 'k']); await M.until(q => q.a.cancel.open); await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['k']) })
  ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  await reset(); await tap(['d', 'k']); await clean(); await rec(); await tap(['k']); await clean(); await rec(); await tap(['w', 'k']); ck('confirmed Up+Heavy on the last chain step = Rising Tiger', (await state()).a.attack?.name === 'up')
  for (const g of ['whiff', 'block']) { await reset(g === 'whiff' ? 700 : 72, false, { dummy: g === 'block' ? 'block' : 'stand' }); if (g === 'block') await step(8); await tap(['d', 'k']); await rec(); await tap(['k']); ck('chain retap rejected on ' + g, (await state()).a.attack?.name === 'wAdv') }
  r = await measure('Launcher (Rising Tiger) -> manual jump -> Air (Turning Heel)', async M => { await M.press(['i']); await M.until(q => q.a.cancel.open); await M.press(['w']); await M.watch(4); await M.press(['j']) })
  ck(r.label + ': 2 hits, true combo', r.hits.length === 2 && r.trueCombo, JSON.stringify(r))

  // ── THREE DISCIPLINES ──
  await reset(); await tap(['j']); await clean(); await step(20); s = await state()
  ck('clean J1 grants HAND (timer starts)', s.a.s.coll?.hand && !s.a.s.coll.foot && s.a.s.stats.disc.hand === 1, JSON.stringify(s.a.s.coll))
  const t1 = s.a.s.coll.t; await reset(); await page.evaluate(() => __harness.mmprWhiteTest.raw()._mmprWhite.coll = null)
  await tap(['j']); await clean(); await step(30); const tA = (await state()).a.s.coll.t; await tap(['j']); await clean(); await step(2); s = await state()
  ck('repeat HAND neither stacks nor refreshes the timer', s.a.s.coll.t > tA && s.a.s.stats.discRepeat >= 1 && s.a.s.stats.disc.hand === 1, JSON.stringify({ tA, t: s.a.s.coll.t, st: s.a.s.stats }))
  await reset(72, false, { dummy: 'block' }); await step(8); await tap(['j']); await step(20); s = await state(); ck('blocked attack grants nothing', !s.a.s.coll && s.a.s.stats.disc.hand === 0)
  await reset(); await tap(['j']); await clean(); await page.evaluate(() => __harness.mmprWhiteTest.raw()._mmprWhite.coll.t = 175); await step(24); s = await state()
  ck('incomplete collection expires 180f after the first discipline', !s.a.s.coll && s.a.s.stats.collExpired === 1, JSON.stringify(s.a.s.stats))
  await reset(); await tap(['j']); await clean(); await wait(s => s.stun === 0 && !s.b.attack && s.a.s.coll, 60)
  report.disciplines.p2Hit = await page.evaluate(() => { const H = __harness.mmprWhiteTest; H.raw('p2').attackCooldown = 0; H.raw('p2').attacking = false; return H.move('light', 'p2') }); await wait(s => s.a.hitstun > 0, 20); await step(2); s = await state()
  ck('a damaging hit breaks the incomplete collection', !s.a.s.coll && s.a.s.stats.collBroken === 1, JSON.stringify(s.a.s.stats))
  await reset(); await S('H.giveToken()'); await page.evaluate(() => { const H = __harness.mmprWhiteTest; H.raw('p2').attackCooldown = 0; return H.move('light', 'p2') }); await wait(s => s.a.hitstun > 0, 20); await step(2); s = await state()
  ck('…but an earned token survives a hit', !!s.a.s.token)
  await reset(); await S('H.giveToken()'); await tap(['j']); await clean(); await step(2); s = await state(); ck('no collection / no second token while a token is held', !s.a.s.coll && s.a.s.stats.discBlocked === 1 && s.a.s.stats.tokens === 0)
  await reset(); await S('H.giveToken()'); await page.evaluate(() => __harness.mmprWhiteTest.raw()._mmprWhite.token.t = 3); await step(5); s = await state(); ck('token expires after its 240f lifetime', !s.a.s.token && s.a.s.stats.tokenExpired === 1)
  // the real collection route: HAND, FOOT, BLADE across separate neutral exchanges (spacing reset between them)
  r = await measure('HAND -> FOOT -> BLADE over three separate neutral exchanges', async M => {
    await M.press(['j']); await M.until(q => !q.a.attack); await M.mark('hand'); await page.keyboard.down('a'); await M.watch(14); await page.keyboard.up('a'); await page.keyboard.down('d'); await M.watch(14); await page.keyboard.up('d')
    await M.until(q => q.stun === 0, 40); await M.press(['s', 'j']); await M.until(q => !q.a.attack); await M.mark('foot'); await M.watch(20)
    await M.until(q => q.stun === 0, 40); await M.press(['k']); await M.until(q => !q.a.attack); await M.mark('blade') }, { kind: 'collection', note: 'three separate hits with the defender free between them' })
  s = await state(); report.disciplines.realRoute = { framesHandToBlade: r.marks.blade - r.marks.hand, tokens: s.a.s.stats.tokens, token: s.a.s.token }
  ck('HAND -> FOOT -> BLADE in separate exchanges inside 180f earns one Formation token', s.a.s.stats.tokens === 1 && !!s.a.s.token && r.marks.blade - r.marks.hand < 180, JSON.stringify(report.disciplines.realRoute))
  r = await measure('Saba first: BLADE -> HAND -> FOOT (any order)', async M => { await M.press(['k']); await M.until(q => !q.a.attack); await M.watch(20); await M.press(['j']); await M.until(q => !q.a.attack); await M.watch(20); await M.press(['s', 'j']) }, { kind: 'collection' })
  ck('any order completes the set', (await state()).a.s.stats.tokens === 1)
  await reset(); await page.evaluate(() => { const f = __harness.mmprWhiteTest.raw(); f._mmprWhite.coll = null }); await tap(['s', 'l']); await wait(s => !s.a.attack && s.a.grounded && s.a.s.landing === 0, 120); s = await state()
  ck('grounded White Tiger Ascent grants FOOT', s.a.s.coll?.foot === true, JSON.stringify(s.a.s.coll))

  // ── ORDERS: call / commit / single ordinary hit / resources ──
  for (const [kind, key, cost] of [['ninjaTwinFist', 'd', 15], ['ninjaCraneRise', 'w', 18], ['ninjaEdge', 'a', 20]]) {
    await reset(110); const e0 = (await state()).a.energy
    await tap([key, 'l']); s = await state()
    const paid = +(e0 - s.a.energy).toFixed(2)
    ck(`${kind}: order spends ${cost} Energy + 1 pip at call start`, Math.abs(paid - cost) < 0.6 && s.a.hud.pips === 1 && s.a.attack?.name === 'wCall', JSON.stringify({ paid, hud: s.a.hud }))
    ck(`${kind}: no Megazord before the 12f commit`, !s.a.falcon.sortie && s.a.falcon.pendingKind === kind)
    let commitAt = -1, hits = 0, last = s.b.hp, exitAt = -1, hitLog = [], air = false
    for (let i = 1; i <= 110; i++) { await step(1); const q = await state(); if (!q.a.grounded) air = true
      if (commitAt < 0 && q.a.falcon.sortie) commitAt = i
      if (q.b.hp < last) { hits++; hitLog.push({ t: i, d: last - q.b.hp, vy: Math.round(q.b.vy), vx: Math.round(q.b.vx) }); last = q.b.hp }
      if (commitAt > 0 && exitAt < 0 && !q.a.falcon.sortie) exitAt = i }
    report.orders[kind] = { cost, commitFrameFromPress: commitAt, hits, hitLog, exitFromPress: exitAt }
    ck(`${kind}: commits at the end of the 12f startup`, commitAt >= 11 && commitAt <= 13, String(commitAt))
    ck(`${kind}: without a token exactly ONE contact (no follow-up), then exits`, hits === 1 && exitAt > 0, JSON.stringify(report.orders[kind]))
    if (kind === 'ninjaCraneRise') ck('Crane Rise: Tommy never leaves the ground (Up+Special owns Up)', !air)
  }
  ck('Crane Rise launches (vy < -10)', (report.orders.ninjaCraneRise.hitLog[0]?.vy ?? 0) < -10, JSON.stringify(report.orders.ninjaCraneRise.hitLog))
  for (const lead of [1, 2]) { await reset(110); await page.keyboard.down('w'); await step(lead); await page.keyboard.down('l'); await step(1); await page.keyboard.up('l'); let air2 = false, call = false
    for (let i = 0; i < 40; i++) { await step(1); const q = await state(); if (!q.a.grounded) air2 = true; if (q.a.attack?.name === 'wCall') call = true } await page.keyboard.up('w'); await step(2)
    ck(`Up held ${lead}f before Special: Crane Rise, never a jump`, call && !air2, JSON.stringify({ call, air2 })) }
  await reset(110); await tap(['d', 'l']); await wait(s => !s.a.attack, 40); s = await state(); const lk = s.a.hud.lockout; await tap(['a', 'l']); s = await state()
  ck('second order rejected during the 60f lockout / live order', lk > 0 && s.a.attack?.name !== 'wCall', JSON.stringify(s.a.hud))
  await reset(60); await tap(['d', 'l']); await step(4)
  await page.evaluate(() => { const z = __harness.mmprWhiteTest.raw('p2'); z.attacking = false; z.currentAttack = null; z.attackCooldown = 0; return __harness.mmprWhiteTest.move('light', 'p2') })
  await wait(s => s.a.hitstun > 0, 20); await step(30); s = await state()
  ck('owner hit during the 12f startup cancels the order: no Megazord, pip + Energy stay spent', !s.a.falcon.sortie && s.a.falcon.commits === 0 && s.a.falcon.cancels === 1 && s.a.hud.pips === 1, JSON.stringify(s.a.falcon))
  await reset(110); await tap(['d', 'l']); await wait(s => s.a.falcon.sortie, 20)
  await page.evaluate(() => { const a = __harness.mmprWhiteTest.raw(); a.hitstun = 30; a.attacking = false; a.currentAttack = null })
  let pHit = false; const hpb = (await state()).b.hp; for (let i = 0; i < 60; i++) { await step(1); if ((await state()).b.hp < hpb) pHit = true }
  ck('owner hit after commit: the committed order completes its bounded action', pHit)
  await reset(110, false, { dummy: 'block' }); await step(8); const hpB = (await state()).b.hp; await tap(['a', 'l']); await wait(s => s.block > 0, 70); s = await state()
  ck('Ninja Edge is blockable (chip only)', s.block > 0 && hpB - s.b.hp < sc(54) * 0.3, JSON.stringify({ chip: hpB - s.b.hp, bs: s.block }))
  await reset(110); await tap(['a', 'l']); await step(13); s = await state(); const so = s.a.falcon.sortie
  ck('Ninja Edge: committed target region captured once (no tracking)', !!so && so.dir === 1, JSON.stringify(so))
  const cap0 = JSON.stringify([so.ox, so.oy, so.tx, so.ty, so.dir]); await page.evaluate(() => __harness.mmprWhiteTest.raw('p2').x += 400); await step(10); s = await state(); const so2 = s.a.falcon.sortie
  ck('Ninja Edge: moving the target does not move the committed path / strike zone (no tracking)', JSON.stringify([so2.ox, so2.oy, so2.tx, so2.ty, so2.dir]) === cap0, cap0)

  // ── FORMATION FOLLOW-UP: acceptance rules ──
  async function orderRun(key, { token = true, retapAt = 'offer', late = 0, dummy = 'stand', energy = 100, gap = 110 } = {}) {
    await reset(gap, false, { dummy, energy }); if (dummy === 'block') await step(8); if (token) await S('H.giveToken()')
    const e0 = (await state()).a.energy; await tap([key, 'l']); let hits = [], last = (await state()).b.hp, offered = false, accepted = false, acceptCost = null
    for (let i = 0; i < 100; i++) { await step(1); const q = await state(); if (q.b.hp < last) { hits.push(last - q.b.hp); last = q.b.hp }
      if (q.a.s.accept && !offered) { offered = true; if (retapAt === 'offer') { await step(late); const eb = (await state()).a.energy; await tap(['l']); const qa = await state(); accepted = qa.a.s.stats.accepts > 0; acceptCost = +(eb - qa.a.energy).toFixed(2) } } if (!q.a.falcon.sortie && i > 20) break }
    const f = await state(); return { hits, offered, accepted, acceptCost, token: !!f.a.s.token, stats: f.a.s.stats, energySpent: +(e0 - f.a.energy).toFixed(2), attack: f.a.attack?.name || null }
  }
  report.formation.twin = await orderRun('d'); ck('token + retap within 10f of Twin Fist\'s hit: accepted, follow-up punch lands (2 hits), token + 10 Energy spent', report.formation.twin.accepted && report.formation.twin.hits.length === 2 && !report.formation.twin.token && Math.abs(report.formation.twin.acceptCost - 10) < 0.3, JSON.stringify(report.formation.twin))
  report.formation.crane = await orderRun('w'); ck('Crane Rise follow-up lands (2 hits)', report.formation.crane.accepted && report.formation.crane.hits.length === 2, JSON.stringify(report.formation.crane))
  report.formation.edge = await orderRun('a', { gap: 120 }); ck('Ninja Edge follow-up lands (2 hits)', report.formation.edge.accepted && report.formation.edge.hits.length === 2, JSON.stringify(report.formation.edge))
  r = await orderRun('d', { retapAt: null }); ck('ordinary order never spends the token automatically', r.token && r.hits.length === 1 && r.stats.accepts === 0, JSON.stringify(r))
  r = await orderRun('d', { late: 11 }); ck('retap after the 10f window: not accepted (no follow-up contact, token kept; the retap is an ordinary Special)', !r.accepted && r.stats.followHits === 0 && r.token, JSON.stringify(r))
  r = await orderRun('d', { token: false }); ck('no token: never offered, no follow-up', !r.offered && r.hits.length === 1, JSON.stringify(r))
  r = await orderRun('d', { dummy: 'block' }); ck('blocked order: no offer, token kept', !r.offered && r.token, JSON.stringify(r))
  r = await orderRun('d', { energy: 15 }); ck('insufficient Energy for the +10: rejected, token kept', !r.accepted && r.token, JSON.stringify(r))
  r = await orderRun('d', { gap: 600 }); ck('whiff: no offer', !r.offered && r.token, JSON.stringify(r))
  // one upgraded assist per combo: second order in the same combo cannot be upgraded
  await reset(110); await S('H.giveToken()'); await tap(['d', 'l']); await wait(s => s.a.s.accept, 40); await tap(['l']); await page.evaluate(() => { const f = __harness.mmprWhiteTest.raw(); f._mmprWhite.token = { t: 240, order: ['test'] } })
  s = await state(); ck('once per combo: formationUsed set while the combo continues', s.a.s.formationUsed === true)

  // ── LEADER'S RETURN ──
  r = await measure("Formation Twin Fist -> Leader's Return -> punish", async M => {
    await S('H.giveToken()'); await M.press(['d', 'l']); await M.until(q => q.a.s.accept, 40); await M.press(['l']); await M.until(q => q.a.s.leader, 40)
    report.leader.offer = (await state()).a.s.leader; await M.press(['d']); await M.watch(2); await M.press(['d']); await M.until(q => !q.a.ranger.blink, 30); await M.mark('blinkDone')
    report.leader.afterBlink = { charges: (await state()).a.ranger.charges, stats: (await state()).a.s.stats }
    await M.press(['k']) }, { gap: 110 })
  ck("Leader's Return: offered after the follow-up, double-tap blinks out of the signal pose's late recovery (1 charge spent)", report.leader.afterBlink?.stats.leaderUsed === 1 && report.leader.afterBlink.charges === 1, JSON.stringify(report.leader))
  ck("Leader's Return route: order hit + follow-up + Heavy punish land (verdict recorded)", r.hits.length === 3, JSON.stringify(r))
  await reset(110); await S('H.giveToken()'); await tap(['d', 'l']); await wait(s => s.a.s.accept, 40); await tap(['l']); await wait(s => s.a.s.leader, 40); await step(13); s = await state()
  ck("Leader's Return expires after 12f unused", !s.a.s.leader && s.a.s.stats.leaderUsed === 0)
  await tap(['d']); await step(2); await tap(['d']); await step(2); s = await state(); ck('after expiry the signal pose cannot be blink-cancelled', !s.a.ranger.blink || s.a.attack?.name !== 'wOrder')
  await reset(110); await tap(['d', 'l']); await step(20); await tap(['d']); await step(2); await tap(['d']); await step(1); s = await state()
  ck('no free blink-cancel out of an ordinary order call', !s.a.ranger.blink && s.a.s.stats.leaderUsed === 0)

  // ── SABA'S ANSWER FEINT ──
  await reset(); const e0 = (await state()).a.energy; await tap(['l']); await step(4); await tap([';']); await step(1); s = await state()
  const fe = { attack: s.a.attack?.name, energySpent: +(e0 - s.a.energy).toFixed(2), total: s.a.attack?.total }
  await step(20); s = await state(); fe.hpLoss = HP - s.b.hp; report.specials.feint = fe
  ck("Saba's Answer feint: Block in startup → 12f recovery, no hitbox, 15 Energy kept spent", fe.attack === 'wFeint' && fe.total === 12 && fe.hpLoss === 0 && Math.abs(fe.energySpent - 15) < 0.6, JSON.stringify(fe))
  await reset(); await tap(['l']); await step(11); await tap([';']); await step(4); s = await state(); ck('Block after frame 9 does not feint (Answer continues)', s.a.attack?.name === 'wAnswer' || s.b.hp < HP)
  await reset(); await page.keyboard.down('l'); await step(80); await page.keyboard.up('l'); s = await state(); ck("holding Special does not repeat Saba's Answer (one cost paid)", s.a.s.stats.feints === 0 && (100 - s.a.energy) < 16 && (100 - s.a.energy) > 8 && s.b.hp >= HP - 2 * sc(46), String(100 - s.a.energy))
  await reset(); const reach = await page.evaluate(() => { const H = __harness.mmprWhiteTest; H.move('wAnswer'); for (let i = 0; i < 13; i++) __harness.luffyTest.step(1); const st = H.state(); return { box: st.box, x: st.x, w: st.w } })
  report.specials.answerReachFromCentre = Math.round(reach.box.x + reach.box.w - (reach.x + reach.w / 2)); ck("Saba's Answer reaches ~140px from Tommy's centre (brief target 140)", Math.abs(report.specials.answerReachFromCentre - 140) <= 4, String(report.specials.answerReachFromCentre))

  // ── ASCENT / DESCENT ──
  await reset(); await tap(['s', 'l']); await wait(s => !s.a.grounded, 30); s = await state(); ck('White Tiger Ascent leaves the ground', !s.a.grounded && s.a.attack?.name === 'wAscent')
  await tap(['s', 'l']); s = await state(); ck('no second Ascent in the same airtime (air Down+Special is Descent, also once)', s.a.s.risingUsed)
  await wait(s => s.a.grounded, 120); s = await state(); ck('Ascent: 16f landing recovery', s.a.s.landing >= 14, String(s.a.s.landing)); await wait(s => s.a.s.landing === 0 && !s.a.attack, 60)
  await reset(); await tap(['d']); await step(2); await tap(['d']); await step(2); const midBlink = await page.evaluate(() => !!__harness.mmprWhiteTest.raw()._ranger?.blink)
  await reset(400); s = await page.evaluate(() => ({ rooted: !!__harness.mmprWhiteTest.raw()._rooted })); ck('a reset during a live blink releases the blink root (fighter can move/jump next round)', midBlink && !s.rooted, JSON.stringify({ midBlink, ...s }))
  await step(4); await tap(['w'], 6); await wait(s => !s.a.grounded && s.a.vy > -14, 30); s = await state(); ck('Descent setup: airborne before the input', !s.a.grounded); await tap(['s', 'l']); let maxVy = 0, landT = -1
  for (let i = 0; i < 90; i++) { await step(1); const q = await state(); maxVy = Math.max(maxVy, q.a.vy); if (q.a.grounded && landT < 0) { landT = i; report.specials.descentLanding = q.a.s.landing; break } }
  ck('Tiger Descent: capped descent speed, then 24f landing recovery', maxVy <= 14.5 && report.specials.descentLanding >= 22, JSON.stringify({ maxVy, l: report.specials.descentLanding }))
  await reset(90); await page.evaluate(() => __harness.mmprWhiteTest.raw()._mmprWhite.coll = null); await tap(['w']); await step(6); await tap(['s', 'l']); await wait(s => s.a.grounded && s.a.s.landing === 0, 120); s = await state()
  ck('Tiger Descent grants no grounded FOOT credit', !s.a.s.coll?.foot, JSON.stringify({ coll: s.a.s.coll, hp: s.b.hp }))
  report.specials.descentHit = HP - s.b.hp

  // ── BLINK ──
  await reset(500); await tap(['d']); await step(3); await tap(['d']); await step(1); s = await state(); ck('double-tap Right starts the shared blink (1 charge)', !!s.a.ranger.blink && s.a.ranger.charges === 1)
  const bx = s.a.x; await step(14); s = await state(); report.teleport.distance = Math.round(s.a.x - bx); ck('blink ~230px, stops in front of the foe', s.a.x - bx > 150 && s.a.x + s.a.w <= s.b.x, String(report.teleport.distance))
  await reset(500); await page.keyboard.down('d'); await step(40); await page.keyboard.up('d'); s = await state(); ck('held direction never blinks', s.a.ranger.blinks === 0)
  await reset(500); await page.evaluate(() => { const f = __harness.mmprWhiteTest.raw(); f._falcon.pips = 0; f._falcon.refill = 100; f._mmprWhite.coll = { hand: true, foot: false, blade: false, t: 50, order: ['hand'] } })
  await tap(['d']); await step(2); await tap(['d']); await step(14); s = await state(); ck('blink restores no pips and does not refresh the discipline timer', s.a.hud.pips === 0 && s.a.s.coll?.t >= 64, JSON.stringify({ hud: s.a.hud, coll: s.a.s.coll }))

  // ── ULTIMATE ──
  await reset(500); await tap(['u']); s = await state(); ck('ultimate spends 100 Energy at start', s.a.attack?.name === 'wUltOpen' && s.a.energy < 1)
  let busy = 0; for (let i = 0; i < 120; i++) { await step(1); if ((await state()).a.attack?.name === 'wUltOpen') busy++ } const ultS = await state()
  await reset(500); await tap(['j']); let lb = 0; for (let i = 0; i < 40; i++) { await step(1); if ((await state()).a.attack?.name === 'light') lb++ }
  report.ultimate.whiff = { visibleFramesAfterPress: busy, lightSameMethod: lb, measuredTotal: busy + (17 - lb) }
  ck('miss: no capture, total 30+3+60 = 93f', !ultS.ult.active && busy + (17 - lb) === 93 && ultS.a.s.stats.ultWhiffs === 1, JSON.stringify(report.ultimate.whiff))
  await reset(72, false, { dummy: 'block' }); await step(8); await tap(['u']); for (let i = 0; i < 100; i++) await step(1); s = await state(); ck('blocked opener: no sequence', !s.ult.active && s.a.s.stats.ultStarts === 1 && s.a.s.stats.ultDone === 0)
  async function ultRun(token) {
    await reset(60); await tap(['d', 'l']); await step(14); await page.evaluate(t => { const f = __harness.mmprWhiteTest.raw(); f.energy = 100; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; if (t) { f._mmprWhite.coll = null; f._mmprWhite.token = { t: 240, order: ['test'] } } }, token)
    const hpU = (await state()).b.hp; await tap(['u']); let q = await wait(s => s.ult.active, 220); const had = !!(await state()).a.falcon.sortie
    const contacts = [], frames = []; let lastH = (await state()).b.hp, n = 0
    for (let i = 0; i < 240 && (await state()).ult.active; i++) { await step(1); n++; const h = (await state()).b.hp; if (h < lastH) { contacts.push(lastH - h); frames.push(n); lastH = h } }
    q = await state(); return { started: q.a.s.stats.ultStarts, rhythm: q.a.s.stats.ultRhythm, tokenAfter: !!q.a.s.token, liveOrderAtEntry: had, contacts, frames, total: hpU - q.b.hp, durationFrames: n, done: q.a.s.stats.ultDone, hud: q.a.hud, knockdown: q.b.knockdown, free: !q.a.attack }
  }
  report.ultimate.plain = await ultRun(false); report.ultimate.token = await ultRun(true)
  const P = report.ultimate.plain, T = report.ultimate.token
  ck('clean opener: live order retired on entry, 4 sequence contacts (40/35/40/130 raw), knockdown, control restored', !P.liveOrderAtEntry && P.contacts.length === 4 && P.done === 1 && P.knockdown && P.free && P.contacts[3] > P.contacts[0] * 2.5, JSON.stringify(P))
  ck('token-held entry: token consumed for the rhythm presentation only', T.rhythm === 1 && !T.tokenAfter, JSON.stringify(T))
  ck('token rhythm keeps damage, hit count, capture duration identical', JSON.stringify(T.contacts) === JSON.stringify(P.contacts) && JSON.stringify(T.frames) === JSON.stringify(P.frames) && T.durationFrames === P.durationFrames, JSON.stringify({ P, T }))
  ck('after completion: orders locked 120f, pips not refilled', P.hud.postUlt > 100 && P.hud.pips === 1, JSON.stringify(P.hud))
  await tap(['d', 'l']); s = await state(); ck('an order during the post-ultimate lock is rejected', s.a.attack?.name !== 'wCall')
  await reset(60); await page.evaluate(() => { const b = __harness.mmprWhiteTest.raw('p2'); b.health = 60 }); await tap(['u']); await wait(s => s.ult.active, 220)
  for (let i = 0; i < 240 && (await state()).ult.active; i++) await step(1); s = await state(); ck('KO mid-sequence ends cleanly', !s.ult.active && s.b.hp <= 0)
  await reset(60); await tap(['u']); await wait(s => s.ult.active, 220); await step(30); await reset(300); s = await state(); ck('reset mid-sequence clears the freeze and restores positions', !s.ult.active && s.a.grounded && !s.a.attack)

  // ── MIRROR ──
  await reset(300); await page.evaluate(() => { const H = __harness.mmprWhiteTest; H.raw('p2')._aiControlled = false; H.move('wCall', 'p1', { kind: 'ninjaTwinFist' }); H.move('wCall', 'p2', { kind: 'ninjaEdge' }) }); await step(14); s = await state()
  ck('mirror: each Tommy owns his own Megazord order and pips', s.a.falcon.sortie?.kind === 'ninjaTwinFist' && s.b.falcon.sortie?.kind === 'ninjaEdge' && s.a.hud.pips === 1 && s.b.hud.pips === 1, JSON.stringify({ a: s.a.falcon?.sortie?.kind, b: s.b.falcon?.sortie?.kind }))

  // ── MEASURED ROUTES (brief Phase 12) ──
  r = await measure('Formation Crane Rise -> air conversion', async M => {
    await S('H.giveToken()'); await M.press(['w', 'l']); await M.until(q => q.a.s.accept, 40); await M.press(['l']); await M.until(q => q.a.falcon.sortie?.age >= 36 || !q.a.falcon.sortie, 40)
    await M.until(q => q.a.s.stats.followHits > 0, 40); await M.watch(3); await M.press(['w'], 2); await M.watch(3); await M.press(['d', 'j']); await M.watch(40) },
    { gap: 110, note: 'order hit (launch) + pop-up follow-up + jump-cancel of the signal pose + air Turning Heel' })
  ck(r.label + ': launch + follow-up + air kick, a TRUE 3-hit combo', r.hits.length >= 3 && r.trueCombo, JSON.stringify(r))
  ck(r.label + ': the follow-up opened the signal-pose jump-cancel', (r.stats?.craneJC || 0) >= 1, JSON.stringify(r.stats))
  r = await measure('Delayed Ninja Edge -> ground pressure', async M => { await M.press(['a', 'l']); await M.until(q => !q.a.attack, 40); await page.keyboard.down('d'); await M.watch(16); await page.keyboard.up('d'); await M.until(q => q.block > 0, 40); await M.watch(2); await M.press(['j']) },
    { gap: 160, dummy: 'block', kind: 'pressure', note: 'the slow slash is blocked while Tommy walks in; follow-up Light measured vs blockstun' })
  ck(r.label + ': Edge blocked while Tommy closes distance (pressure, not a combo)', r.blockedEvents >= 1, JSON.stringify(r))
  r = await measure('Clean Saba confirm -> ultimate (Heavy recovery cancel)', async M => { await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['u']) }, { gap: 80 })
  ck(r.label + ': opener inside hitstun, full sequence (6 hits)', r.hits.length === 6 && r.trueCombo, JSON.stringify(r))

  // ── PRESENTATION: no order / reward cue after KO; impacts still play; no voice cues ──
  const mute = await page.evaluate(async () => { const { sound } = await import('./sound.js'); const { playMmprWhiteCues } = await import('./mmprWhiteFx.js'); const played = [], orig = sound.play
    sound.play = function (n, ...r) { played.push(n); return orig.call(this, n, ...r) }
    const f = __harness.mmprWhiteTest.raw(), hp = f.health; f._mmprWhite.cues = ['call', 'commit_ninjaEdge', 'offer', 'formation', 'disc_hand', 'leaderGo', 'ultStart', 'zordPunch']; f.health = 0; playMmprWhiteCues(f)
    const dead = played.slice(); played.length = 0; f.health = hp; f._mmprWhite.cues = ['call', 'formation']; playMmprWhiteCues(f); sound.play = orig
    return { dead, alive: played.slice() } })
  ck('after KO: order / reward cues muted, impacts still play', JSON.stringify(mute.dead) === '["mmprwhite_zordPunch"]' && mute.alive.includes('mmprwhite_formation'), JSON.stringify(mute))
  ck('no voice cues defined (SFX only, no synthesized dialogue)', !(await page.evaluate(async () => Object.keys((await import('./mmprWhiteSound.js')).MMPR_WHITE_SOUNDS).some(k => /voice|line|quote/i.test(k)))))
  ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
report.pass = pass; report.fail = fail; report.errors = errors.slice(0, 10)
fs.writeFileSync('docs/mmpr_white/mechanics_results.json', JSON.stringify(report, null, 1) + '\n')
console.log(`\nmmpr_white: ${pass} pass / ${fail} fail`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
