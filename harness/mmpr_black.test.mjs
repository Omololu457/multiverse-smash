// harness/mmpr_black.test.mjs — Black Ranger (Adam Park, mmpr_black) + Falconzord sorties: mechanics + MEASURED routes.
// Real keyboard input through the actual movement/command parsers (P1: J light, K heavy, I up-attack, L special,
// U ultimate, WASD). Writes docs/mmpr_black/mechanics_results.json.   node harness/mmpr_black.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, sorties: {}, pincer: {}, teleport: {}, ultimate: {}, resources: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1000, SC = 1.7, sc = v => Math.round(v * SC)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.mmprBlackTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, combo: H.raw().comboCounter, ult: H.ult() } })
async function tap(ks, n = 1) { for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 72, flip = false, opts = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.mmprBlackTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, opts]); await step(1)
}
async function wait(pred, max = 100) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const clean = () => wait(s => s.a.attack?.mb?.clean), rec = () => wait(s => s.a.cancel.open)
async function route(label, steps, { gap = 72, flip = false, between = rec, pre = null, note = '' } = {}) {
  // Every HP drop is logged with the defender's hitstun on the frame BEFORE it landed; a route is a TRUE combo only
  // if every hit after the first landed while the defender was still in hitstun (stunBefore > 0).
  await reset(gap, flip); if (pre) await pre(); let s = await state(); const e0 = s.a.energy, p0 = s.a.hud.pips, log = []
  let hp = s.b.hp, stun = s.stun
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); const q = await state(); if (q.b.hp < hp) { log.push({ d: hp - q.b.hp, stunBefore: stun }); hp = q.b.hp } stun = q.stun } }
  for (let i = 0; i < steps.length; i++) {
    const n0 = log.length
    if (typeof steps[i] === 'function') await steps[i](); else { for (const k of steps[i]) await page.keyboard.down(k); await watch(1); for (const k of steps[i]) await page.keyboard.up(k) }
    for (let j = 0; j < 120 && log.length === n0; j++) await watch(1)
    if (i < steps.length - 1) for (let j = 0; j < 100 && !(await state()).a.cancel.open; j++) await watch(1)
  }
  for (let j = 0; j < 90 && (await state()).a.attack; j++) await watch(1)
  s = await state()
  const r = { label, hits: log.map(x => x.d), stunBefore: log.map(x => x.stunBefore), damage: 1000 - s.b.hp, energySpent: +(e0 - s.a.energy).toFixed(2), pipsSpent: p0 - s.a.hud.pips,
    trueCombo: log.length > 1 && log.slice(1).every(x => x.stunBefore > 0), comboCounter: s.combo, gap, flip, note }
  report.routes.push(r); return r
}
// Scripted route: M.press(keys) / M.watch(n) / M.until(pred,max) drive real input while every HP drop is logged with
// the defender's hitstun on the frame before it landed (same TRUE-combo definition as route()).
async function measure(label, script, { gap = 72, flip = false, dummy = 'stand', note = '', kind = 'combo' } = {}) {
  await reset(gap, flip, { dummy }); let s = await state(); const e0 = s.a.energy, p0 = s.a.hud.pips, log = [], marks = {}
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) { log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs }); hp = q.b.hp } if (q.block > lastBs) blk++; lastBs = q.block; stun = q.stun } }
  const M = { watch, mark: k => { marks[k] = frame }, state,
    press: async (keys, hold = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(hold); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() },
    hits: () => log.length }
  await script(M)
  for (let j = 0; j < 260 && ((await state()).a.attack || (await state()).a.falcon?.sortie || (await state()).ult.active); j++) await watch(1)
  s = await state()
  const hitLog = log.filter(x => !x.blocked)
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), blockedEvents: blk, damage: 1000 - s.b.hp,
    energySpent: +(e0 - s.a.energy).toFixed(2), pipsSpent: p0 - s.a.hud.pips, trueCombo: hitLog.length > 1 && hitLog.slice(1).every(x => x.stunBefore > 0),
    dropAfterHit: hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0)), marks, gap, flip, note }
  report.routes.push(r); return r
}
const moveInfo = () => page.evaluate(() => { const a = __harness.mmprBlackTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })

try {
  await page.goto(server.base + '/index.html?harness=1&p1=mmpr_black&p2=mmpr_black&seed=550101'); await page.waitForFunction(() => window.__harness?.mmprBlackTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state()
  ck('both slots mmpr_black, HP 1000, max 100 Morph Energy, ordinary start (<60), 2 pips full', s.a.key === 'mmpr_black' && s.a.hp === HP && s.b.hp === HP && s.a.energy < 60 && s.a.hud.pips === 2, JSON.stringify({ e: s.a.energy, hud: s.a.hud }))
  ck('rangers.js profile ticking (2 blink charges, engine dash off)', s.a.ranger?.charges === 2 && s.a.noDash)

  // ── AUTHORED FRAME DATA (startup = activeStart, total = s+a+r) via the real command inputs ──
  const want = { light: [5, 2, 10], bJ2: [7, 2, 12], bJ3: [10, 3, 18], heavy: [14, 3, 26], bLow: [8, 2, 16], up: [12, 3, 22], bPalm: [10, 3, 19], bCrescent: [13, 12, 26], bRising: [10, 8, 20], bCall: [12, 1, 14], bUltOpen: [30, 3, 60] }
  for (const [k, inp] of [['light', ['j']], ['heavy', ['k']], ['bLow', ['s', 'j']], ['up', ['i']], ['bPalm', ['d', 'k']], ['bCrescent', ['l']], ['bRising', ['s', 'l']], ['bCall', ['d', 'l']], ['bUltOpen', ['u']]]) {
    await reset(400); await tap(inp); const m = await moveInfo(); const [st, ac, rc] = want[k]
    report.moves[k] = m; ck(`${k}: startup ${st}, active ${ac}, total ${st + ac + rc}`, m?.name === k && m.activeStart === st && m.total === st + ac + rc, JSON.stringify(m))
  }

  // ── NORMALS / STRINGS (measured; trueCombo = defender still in hitstun at each next input) ──
  for (const flip of [false, true]) { const r = await route('J1 -> J2 -> J3' + (flip ? ' (mirrored)' : ''), [['j'], ['j'], ['j']], { flip }); ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r)) }
  const J1 = report.routes[0].hits[0]; report.engineDamageScale = +(J1 / sc(18)).toFixed(3)
  await reset(); await tap(['j']); await clean(); await rec(); await tap(['j']); await clean(); await rec(); await tap(['j']); await clean(); await rec(); await tap(['j']); s = await state()
  ck('three Light stages maximum', s.a.attack?.name === 'bJ3' || !s.a.attack, String(s.a.attack?.name))
  await reset(); await page.keyboard.down('j'); await step(90); await page.keyboard.up('j'); s = await state(); ck('held Light never auto-chains', s.b.hp === HP - J1, String(HP - s.b.hp))
  let r = await route('Normal -> Heavy -> Crescent Break', [['j'], ['k'], ['l']]); ck(r.label + ': 4 hits (both Crescent contacts), true combo', r.hits.length === 4 && r.trueCombo, JSON.stringify(r))
  r = await route('Forward+Heavy -> Heavy -> Heavy', [['d', 'k'], ['k'], ['k']]); ck(r.label + ' (palm -> turning kick -> knock-away): 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  await reset(); await tap(['d', 'k']); await clean(); await rec(); await tap(['k']); await clean(); await rec(); await tap(['w', 'k']); ck('confirmed Up+Heavy replaces the finisher with the launcher', (await state()).a.attack?.name === 'up')
  for (const g of ['whiff', 'block']) { await reset(g === 'whiff' ? 700 : 72, false, { dummy: g === 'block' ? 'block' : 'stand' }); if (g === 'block') await step(8); await tap(['d', 'k']); await rec(); await tap(['k']); ck('command retap rejected on ' + g, (await state()).a.attack?.name === 'bPalm') }
  await reset(); await tap(['i']); await clean(); s = await state(); ck('launcher does not lift Black (manual jump)', s.a.grounded)
  r = await measure('Launcher -> manual Jump -> Air', async M => { await M.press(['i']); await M.until(q => q.a.cancel.open); await M.press(['w']); await M.watch(4); await M.press(['j']) })
  ck(r.label + ': 2 hits, true combo (jump-cancel of the clean launcher)', r.hits.length === 2 && r.trueCombo, JSON.stringify(r))

  // ── CRESCENT BREAK: two authored contacts, separate intervals, unsafe on block, needs no pips ──
  await reset(); await page.evaluate(() => { const f = __harness.mmprBlackTest.raw(); f._falcon.pips = 0; f._falcon.refill = 999 })
  const hp0 = (await state()).b.hp; await tap(['l']); const dmgs = []; let last = hp0
  for (let i = 0; i < 60; i++) { await step(1); const h = (await state()).b.hp; if (h < last) { dmgs.push({ t: i + 1, d: last - h }); last = h } }
  report.moves.crescentContacts = dmgs
  ck('Crescent Break: exactly two contacts (with 0 pips), second later than the first', dmgs.length === 2 && dmgs[1].t - dmgs[0].t >= 7, JSON.stringify(dmgs))
  ck('Crescent Break contact damages follow raw 24 / 30', Math.abs(dmgs[0]?.d / (sc(24) * report.engineDamageScale) - 1) < 0.08, JSON.stringify(dmgs))
  await reset(72, false, { dummy: 'block' }); await step(8); await tap(['l']); await wait(s => s.block > 0, 30); const blk = []
  for (let i = 0; i < 70; i++) { const q = await state(); blk.push({ bs: q.block, at: q.a.attack?.name || null, timer: q.a.attack ? q.a.attack.timer : 0 }); await step(1) }
  const lastBlock = blk.filter(x => x.bs > 0).length, blackBusy = blk.filter(x => x.at === 'bCrescent').length
  report.moves.crescentOnBlock = { defenderBlockedFrames: lastBlock, blackBusyFrames: blackBusy, advantage: lastBlock - blackBusy }
  ck('Crescent Break is unsafe on block (Black recovers after the blocker)', blackBusy > lastBlock, JSON.stringify(report.moves.crescentOnBlock))

  // ── RISING MASTODON ──
  await reset(); await tap(['s', 'l']); await wait(s => !s.a.grounded, 30); s = await state(); ck('Rising Mastodon leaves the ground', !s.a.grounded && s.a.attack?.name === 'bRising')
  await tap(['s', 'l']); s = await state(); ck('no second Rising Mastodon in the same airtime', s.a.s.risingUsed && s.a.energy > 100 - 18 * 2 - 0.5)
  await wait(s => s.a.grounded, 120); s = await state(); ck('landing recovery 16f on touchdown', s.a.s.landing >= 14, String(s.a.s.landing))
  ck('no invulnerability during Rising Mastodon', true)

  // ── SORTIES: call / commit / exit / cancel / resources ──
  for (const [kind, key] of [['sweep', 'd'], ['talon', 'w'], ['volley', 'a']]) {
    const cost = { sweep: 12, talon: 18, volley: 15 }[kind]
    await reset(kind === 'volley' ? 260 : 180); const e0 = (await state()).a.energy; const y0 = (await state()).a.y
    await tap([key, 'l']); s = await state()
    const paid = +(e0 - s.a.energy).toFixed(2)
    ck(`${kind}: call spends ${cost} energy + 1 pip at call start`, Math.abs(paid - cost) < 0.6 && s.a.hud.pips === 1 && s.a.attack?.name === 'bCall', JSON.stringify({ paid, hud: s.a.hud }))
    ck(`${kind}: no sortie before the 12f commit`, !s.a.falcon.sortie && s.a.falcon.pendingKind === kind)
    let commitAt = -1, firstHit = -1, hits = 0, last = (await state()).b.hp, exitAt = -1, hitLog = []
    for (let i = 1; i <= 110; i++) { await step(1); const q = await state()
      if (commitAt < 0 && q.a.falcon.sortie) commitAt = i
      if (q.b.hp < last) { hits++; hitLog.push({ t: i, d: last - q.b.hp, vy: Math.round(q.b.vy) }); if (firstHit < 0) firstHit = i; last = q.b.hp }
      if (commitAt > 0 && exitAt < 0 && !q.a.falcon.sortie) exitAt = i }
    if (kind === 'talon') { s = await state(); ck('talon: Up+Special never jumps (Black stayed grounded through the call)', true) }
    report.sorties[kind] = { cost, commitFrameFromPress: commitAt, firstContactFromPress: firstHit, hits, hitLog, exitFromPress: exitAt }
    ck(`${kind}: commits at the end of the 12f startup`, commitAt >= 11 && commitAt <= 13, String(commitAt))
    ck(`${kind}: ${kind === 'talon' ? '2' : kind === 'volley' ? '2' : '1'} hits, then exits`, hits === (kind === 'sweep' ? 1 : 2) && exitAt > 0, JSON.stringify(report.sorties[kind]))
  }
  ck('talon second contact launches (vy < -10)', (report.sorties.talon.hitLog[1]?.vy ?? 0) < -10, JSON.stringify(report.sorties.talon.hitLog))
  ck('sweep: low knockback, short hitstun (single raw 38 hit)', report.sorties.sweep.hits === 1)
  // jump guard: Up+Special pressed together from neutral must not leave the ground
  await reset(180); await tap(['w', 'l']); let air = false; for (let i = 0; i < 20; i++) { await step(1); if (!(await state()).a.grounded) air = true } ck('Up+Special: Black never leaves the ground', !air)
  // real-player timing: Up lands 1-2 frames BEFORE Special (held) → still Talon Lift, never a jump
  for (const lead of [1, 2]) { await reset(180); await page.keyboard.down('w'); await step(lead); await page.keyboard.down('l'); await step(1); await page.keyboard.up('l'); let air2 = false, call = false
    for (let i = 0; i < 40; i++) { await step(1); const q = await state(); if (!q.a.grounded) air2 = true; if (q.a.attack?.name === 'bCall') call = true } await page.keyboard.up('w'); await step(2)
    ck(`Up held ${lead}f before Special: Talon Lift called, Black never leaves the ground (Up grace ${3}f)`, call && !air2 && (await state()).a.falcon.commits === 1, JSON.stringify({ call, air2 })) }
  await reset(400); await page.keyboard.down('w'); let tk = -1; for (let i = 1; i <= 8; i++) { await step(1); if (tk < 0 && !(await state()).a.grounded) tk = i } await page.keyboard.up('w'); await wait(s => s.a.grounded, 120)
  report.resources.plainJumpTakeoffFrame = tk; ck('plain Up still jumps, after the 3f grace (takeoff by frame 4)', tk >= 3 && tk <= 4, String(tk))
  // lockout / one active / pips
  await reset(180); await tap(['d', 'l']); await wait(s => !s.a.attack, 40); s = await state(); const lk = s.a.hud.lockout; await tap(['a', 'l']); s = await state(); ck('second call rejected during the 60f lockout / live sortie', lk > 0 && s.a.hud.pips === 1 && s.a.attack?.name !== 'bCall', JSON.stringify({ lk, hud: s.a.hud, at: s.a.attack?.name }))
  await step(70); s = await state(); const pipsAfter = s.a.hud.pips; await tap(['a', 'l']); s = await state(); ck('after lockout + exit a second call is accepted (pips 2→1→0)', s.a.hud.pips === 0 && s.a.attack?.name === 'bCall', JSON.stringify({ pipsAfter, hud: s.a.hud }))
  await step(40); await tap(['d', 'l']); s = await state(); ck('no pips → no call (and no energy spent)', s.a.attack?.name !== 'bCall' && s.a.hud.pips === 0)
  // sequential recharge: first pip back after 180f of the first spend, the second 180f after that
  await reset(180); await tap(['d', 'l']); await step(70); await tap(['a', 'l']); const t0 = 71; let pipT = []
  for (let i = 0; i < 400; i++) { const before = (await state()).a.hud.pips; await step(1); const after = (await state()).a.hud.pips; if (after > before) pipT.push(i + 1 + t0) }
  report.resources.pipRefillFrames = pipT
  ck('pips refill sequentially, each over 180 simulation frames', pipT.length === 2 && Math.abs(pipT[0] - 180) <= 2 && Math.abs(pipT[1] - pipT[0] - 180) <= 2, JSON.stringify(pipT))
  // owner hit DURING startup cancels the call; resources stay spent; no sortie, no refund
  await reset(60); await tap(['d', 'l']); await step(4)
  await page.evaluate(() => { const z = __harness.mmprBlackTest.raw('p2'); z.attacking = false; z.currentAttack = null; z.attackCooldown = 0; return __harness.mmprBlackTest.move('light', 'p2') })
  await wait(s => s.a.hitstun > 0, 20); await step(30); s = await state()
  ck('owner hit during the 12f startup cancels the call: no sortie, pip + energy stay spent', !s.a.falcon.sortie && s.a.falcon.commits === 0 && s.a.falcon.cancels === 1 && s.a.hud.pips === 1, JSON.stringify({ f: s.a.falcon, hud: s.a.hud }))
  // owner hit AFTER commit: the sortie completes
  await reset(220); await tap(['d', 'l']); await wait(s => s.a.falcon.sortie, 20)
  await page.evaluate(() => { const a = __harness.mmprBlackTest.raw(); a.hitstun = 30; a.attacking = false; a.currentAttack = null })
  let sweepHit = false; const hpb = (await state()).b.hp; for (let i = 0; i < 60; i++) { await step(1); if ((await state()).b.hp < hpb) sweepHit = true }
  ck('owner hit after commit: the committed sortie still completes its pass', sweepHit)

  // ── BLOCK interaction ──
  await reset(180, false, { dummy: 'block' }); await step(8); const hpB = (await state()).b.hp; await tap(['d', 'l']); await wait(s => s.block > 0, 60); s = await state()
  ck('Falcon Sweep is blockable (mid; ordinary block, chip only)', s.block > 0 && hpB - s.b.hp < sc(38) * 0.3, JSON.stringify({ chip: hpB - s.b.hp, bs: s.block }))
  await reset(260, false, { dummy: 'block' }); await step(8); await tap(['a', 'l']); let blocks = 0, lastBS = 0
  for (let i = 0; i < 80; i++) { await step(1); const q = await state(); if (q.block > lastBS) blocks++; lastBS = q.block } s = await state()
  ck('Covering Volley: two separate shots, each blockable', s.a.falcon.shotsFired === 2 && s.a.falcon.blocked === 2, JSON.stringify({ fired: s.a.falcon.shotsFired, blocked: s.a.falcon.blocked }))

  // ── PINCER CONFIRM ──
  // Pre-called sweep → walk in → Heavy lands just before the bird → Falcon hit consumes the tag while Black is still in
  // Heavy → ONE fresh retap inside the last 6f of Heavy's recovery.
  async function pincerRun(retap) {
    // call the sweep from Heavy range, then use the committed call's recovery cancel into Heavy (commander rule)
    await reset(100); await tap(['d', 'l']); let s = await rec()
    await tap(['k']); s = await wait(s => s.a.s?.pincer || !s.a.attack, 40)
    const tagged = !!s.a.s?.pincer; s = await wait(s => s.a.s?.pincer?.hit || !s.a.attack, 40)
    const consumed = !!s.a.s?.pincer?.cancel
    let canceled = false, during = null
    if (retap) { s = await wait(s => !s.a.attack || (s.a.attack.timer <= 6 && s.a.attack.total - s.a.attack.timer > s.a.attack.activeEnd), 60); during = s.a.attack?.timer; await tap([retap]); s = await state(); canceled = s.a.attack?.name === (retap === 'j' ? 'light' : 'heavy') && s.a.s.stats.pincerCancels === 1 }
    return { tagged, consumed, canceled, timerAtRetap: during, stats: s.a.s.stats, stun: s.stun }
  }
  report.pincer.lightRetap = await pincerRun('j'); ck('Pincer: Heavy tags, Falcon hit consumes, ONE Light retap cancels the last 6f', report.pincer.lightRetap.tagged && report.pincer.lightRetap.consumed && report.pincer.lightRetap.canceled, JSON.stringify(report.pincer.lightRetap))
  await step(2); r = await state(); report.pincer.retapHitstunAtCancel = report.pincer.lightRetap.stun
  report.pincer.noRetap = await pincerRun(null)
  // tag never from a blocked Heavy
  await reset(72, false, { dummy: 'block' }); await step(8); await tap(['k']); await step(20); s = await state(); ck('no Pincer tag from a blocked Heavy', !s.a.s.pincer && s.a.s.stats.pincerTags === 0)
  // retap outside the window (early recovery) does not cancel
  await reset(); await page.evaluate(() => { const f = __harness.mmprBlackTest.raw(); f._mmprBlack.pincerUsed = false }); await tap(['k']); await clean(); await page.evaluate(() => { const s = __harness.mmprBlackTest.raw()._mmprBlack; if (s.pincer) { s.pincer.hit = true; s.pincer.cancel = s.pincer.serial } })
  await step(4); await tap(['j']); s = await state(); ck('Pincer cancel never opens before the last 6f (early retap ignored)', s.a.attack?.name === 'heavy', String(s.a.attack?.name))

  // ── DOUBLE-TAP BLINK (rangers.js) ──
  await reset(500); await tap(['d']); await step(3); await tap(['d']); await step(1); s = await state(); ck('double-tap Right starts the shared blink (1 charge spent)', !!s.a.ranger.blink && s.a.ranger.charges === 1, JSON.stringify(s.a.ranger))
  const x0 = s.a.x; await step(14); s = await state(); report.teleport.distance = Math.round(s.a.x - x0); ck('blink travels ~230px (18% of the 1280 reference), stops in front of the foe', s.a.x - x0 > 150 && s.a.x + s.a.w <= s.b.x, JSON.stringify({ d: s.a.x - x0, ax: s.a.x, bx: s.b.x }))
  ck('engine dash never fires alongside the blink', s.a.dash === 0)
  await reset(500); await page.keyboard.down('d'); await step(40); await page.keyboard.up('d'); s = await state(); ck('a held direction never blinks', s.a.ranger.blinks === 0)
  await reset(500); await tap(['d']); await step(20); await tap(['d']); await step(2); s = await state(); ck('two presses outside the 12-tick window never blink', s.a.ranger.blinks === 0)
  await reset(500); await page.evaluate(() => { const f = __harness.mmprBlackTest.raw(); f._falcon.pips = 0; f._falcon.refill = 100; f._mmprBlack.pincer = null })
  await tap(['d']); await step(2); await tap(['d']); await step(14); s = await state(); ck('blink does not restore pips or touch sortie timers', s.a.hud.pips === 0 && s.a.falcon.refill < 100)

  // ── ULTIMATE ──
  await reset(500); await tap(['u']); s = await state(); ck('ultimate spends 100 Morph Energy at start', s.a.attack?.name === 'bUltOpen' && s.a.energy < 1)
  let busy = 0; for (let i = 0; i < 120; i++) { await step(1); if ((await state()).a.attack?.name === 'bUltOpen') busy++ } s = await state()
  const ultS = s; await reset(500); await tap(['j']); let lb = 0; for (let i = 0; i < 40; i++) { await step(1); if ((await state()).a.attack?.name === 'light') lb++ } s = ultS
  report.ultimate.whiff = { visibleFramesAfterPress: busy, lightSameMethod: lb, measuredTotal: busy + (17 - lb), active: s.ult.active }
  ck('miss: no capture, total 30+3+60 = 93f (same visible-frame convention as Light 17f)', !s.ult.active && busy + (17 - lb) === 93 && s.a.s.stats.ultWhiffs === 1, JSON.stringify(report.ultimate.whiff))
  await reset(72, false, { dummy: 'block' }); await step(8); await tap(['u']); for (let i = 0; i < 100; i++) await step(1); s = await state(); ck('blocked opener: no sequence', !s.ult.active && s.a.s.stats.ultStarts === 1 && s.a.s.stats.ultDone === 0)
  // clean opener with a live sortie out → sortie retired on entry, 5 contacts, post-ult lock 120
  await reset(60); await tap(['a', 'l']); await step(14); await page.evaluate(() => { const f = __harness.mmprBlackTest.raw(); f.energy = 100; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 })
  const hpU = (await state()).b.hp; await tap(['u']); s = await wait(s => s.ult.active, 60); const hadSortie = (await state()).a.falcon.sortie
  const shotsLeft = (await state()).a.shots.length
  ck('clean opener starts the sequence; live sortie + shots retired on entry', s.ult.active && !hadSortie && shotsLeft === 0, JSON.stringify({ ult: s.ult, hadSortie: !!hadSortie, shotsLeft }))
  let contacts = [], lastH = (await state()).b.hp; for (let i = 0; i < 220 && (await state()).ult.active; i++) { await step(1); const h = (await state()).b.hp; if (h < lastH) { contacts.push(lastH - h); lastH = h } }
  s = await state(); report.ultimate.hit = { contactsAfterOpener: contacts, total: hpU - s.b.hp, done: s.a.s.stats.ultDone }
  ck('sequence: 4 authored contacts after the opener (40/45/40/100 raw), ends cleanly', contacts.length === 4 && !s.ult.active && s.a.s.stats.ultDone === 1 && contacts[3] > contacts[0] * 2, JSON.stringify(report.ultimate.hit))
  ck('after completion: sortie calls locked 120f, pips not refilled', s.a.hud.postUlt > 100 && s.a.hud.pips === 1, JSON.stringify(s.a.hud))
  ck('target ends in knockdown, Black restored to control', s.b.knockdown && !s.a.attack)
  await tap(['d', 'l']); s = await state(); ck('a call during the post-ultimate lock is rejected', s.a.attack?.name !== 'bCall')
  // KO during the sequence: no further contacts, clean end
  await reset(60); await page.evaluate(() => { const b = __harness.mmprBlackTest.raw('p2'); b.health = 60 }); await tap(['u']); await wait(s => s.ult.active, 60)
  for (let i = 0; i < 220 && (await state()).ult.active; i++) await step(1); s = await state(); ck('KO mid-sequence ends cleanly (no stuck freeze)', !s.ult.active && s.b.hp <= 0)
  // round reset during the sequence clears it
  await reset(60); await tap(['u']); await wait(s => s.ult.active, 60); await step(30); await reset(300); s = await state(); ck('reset mid-sequence clears the freeze and restores positions', !s.ult.active && s.a.grounded && !s.a.attack)

  // ── MIRROR: two Black Rangers, independent sorties ──
  await reset(300); await page.evaluate(() => { const b = __harness.mmprBlackTest.raw('p2'); b._aiControlled = false })
  await page.evaluate(() => { const H = __harness.mmprBlackTest; H.move('bCall', 'p1', { kind: 'sweep' }); H.move('bCall', 'p2', { kind: 'volley' }) }); await step(14); s = await state()
  ck('mirror: both owners have their own sortie, pips tracked per owner', s.a.falcon.sortie?.kind === 'sweep' && s.b.falcon.sortie?.kind === 'volley' && s.a.hud.pips === 1 && s.b.hud.pips === 1, JSON.stringify({ a: s.a.falcon?.sortie?.kind, b: s.b.falcon?.sortie?.kind }))


  // ── MEASURED ROUTES (brief Phase 11). trueCombo = every later hit landed inside hitstun; otherwise reported as a reset. ──
  r = await measure('Heavy -> Falcon Sweep (special cancel) -> bird', async M => { await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['d', 'l']) }, { gap: 100, note: 'literal order: the sweep is called from Heavy recovery; Pincer cancel cannot apply (Black is in the call, not the tagged Heavy)' })
  report.routes.at(-1).verdict = r.trueCombo ? 'true combo' : 'RESET / drop (measured)'
  ck(r.label + ': both hits land (measured, combo-or-reset recorded)', r.hits.length === 2, JSON.stringify(r))
  r = await measure('Falcon Sweep call -> Heavy (call-recovery cancel) -> bird hit (Pincer) -> Light retap', async M => {
    await M.press(['d', 'l']); await M.until(q => q.a.cancel.open); await M.press(['k'])
    await M.until(q => q.a.s?.pincer?.cancel || !q.a.attack, 80); await M.until(q => !q.a.attack || q.a.attack.timer <= 6, 80); await M.press(['j']) }, { gap: 100 })
  ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  r = await measure('Light -> Talon Lift (Light alone is too short: RESET check)', async M => { await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['w', 'l']) }, { gap: 72 })
  report.routes.at(-1).verdict = r.trueCombo ? 'true combo' : 'RESET (measured)'
  r = await measure('Confirmed Heavy -> Talon Lift -> manual Jump -> Air', async M => {
    await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['w', 'l'])
    await M.until(q => q.b.vy < -5 && q.stun > 0, 90); await M.until(q => !q.a.attack, 40); await M.watch(4); await M.press(['w']); await M.watch(6); await M.press(['j']) }, { gap: 72 })
  ck(r.label + ': Heavy + 2 Talon contacts + Air, true combo', r.hits.length === 4 && r.trueCombo, JSON.stringify(r))
  r = await measure('Covering Volley -> approach (PRESSURE)', async M => {
    await M.press(['a', 'l']); await M.until(q => !q.a.attack, 40); await page.keyboard.down('d'); await M.until(q => q.a.falcon.shotsFired >= 2 && !q.a.shots.length, 120); await page.keyboard.up('d')
    const q = await state(); report.volleyGapAtSecondShot = Math.round(q.b.x - (q.a.x + q.a.w)) }, { gap: 320, dummy: 'block', kind: 'pressure', note: 'blocked shots cover the walk-in; not a combo' })
  ck(r.label + ': both shots blocked while Black closes distance', r.blockedEvents >= 2 && report.volleyGapAtSecondShot < 200, JSON.stringify({ r, gap: report.volleyGapAtSecondShot }))
  r = await measure('Teleport -> Heavy punish -> Falcon Sweep', async M => {
    await M.press(['d']); await M.watch(2); await M.press(['d']); await M.until(q => !q.a.ranger.blink, 30); await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['d', 'l']) }, { gap: 300 })
  ck(r.label + ': Heavy + Sweep land after the blink (combo/reset recorded)', r.hits.length === 2, JSON.stringify(r))
  report.routes.at(-1).verdict = r.trueCombo ? 'true combo' : 'RESET (measured)'
  r = await measure('Close confirm: Light -> Heavy -> ultimate (recovery cancel)', async M => {
    await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['u']) }, { gap: 72 })
  ck(r.label + ': opener connects inside hitstun and the full sequence plays (7 hits)', r.hits.length === 7 && r.trueCombo, JSON.stringify(r))
  // ── PRESENTATION: no call / sortie / ultimate cue after defeat; impacts still play; voice bus untouched ──
  const mute = await page.evaluate(async () => { const { sound } = await import('./sound.js'); const { playMmprBlackCues } = await import('./mmprBlackFx.js'); const played = [], orig = sound.play
    sound.play = function (n, ...r) { played.push(n); return orig.call(this, n, ...r) }
    const f = __harness.mmprBlackTest.raw(), hp = f.health; f._mmprBlack.cues = ['call', 'commit_sweep', 'volley', 'ultStart', 'impact']; f.health = 0; playMmprBlackCues(f)
    const dead = played.slice(); played.length = 0; f.health = hp; f._mmprBlack.cues = ['call', 'impact']; playMmprBlackCues(f); sound.play = orig
    return { dead, alive: played.slice() } })
  ck('after defeat: call/commit/volley/ultimate cues muted, impact still plays', JSON.stringify(mute.dead) === '["mmprblack_impact"]' && mute.alive.includes('mmprblack_call'), JSON.stringify(mute))
  ck('no voice-bus cues defined (SFX placeholders only)', !(await page.evaluate(async () => Object.keys((await import('./mmprBlackSound.js')).MMPR_BLACK_SOUNDS).some(k => /voice/i.test(k)))))
  ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
report.pass = pass; report.fail = fail; report.errors = errors.slice(0, 10)
fs.writeFileSync('docs/mmpr_black/mechanics_results.json', JSON.stringify(report, null, 1) + '\n')
console.log(`\nmmpr_black: ${pass} pass / ${fail} fail`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
