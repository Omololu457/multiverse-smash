// harness/spd_yellow.test.mjs — S.P.D. Yellow (Z Delgado, spd_yellow): firearms, duplicate, Tactical Coins, command stance
// orders, Ninja Megazord variants, ultimate, teardown — through REAL keyboard input and the real parsers
// (P1: J light, K heavy, I up-attack, L special, U ultimate, P charge, ; block, WASD). Writes docs/spd_yellow/mechanics_results.json.
//   node harness/spd_yellow.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { spd_yellow as SPD_YELLOW_DEF } from '../spdYellowData.js'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, gun: {}, coins: {}, clone: {}, orders: {}, zord: {}, ult: {}, blink: {}, resources: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const near = (v, w, t = 4) => Math.abs(v - w) <= t
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
// HP from spdYellowData.js; damage targets below are the authored post-parity numbers × the ROSTER PARITY boost
// (rosterParity.js, applied once at combat.applyScaledDamage).
const HP = SPD_YELLOW_DEF.stats.maxHealth, BOOST = ROSTER_DAMAGE_BOOST.spd_yellow || 1, xB = v => v * BOOST
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.spdYellowTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, combo: H.raw().comboCounter, ult: H.ult(), shots: H.shots() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.spdYellowTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function sel(n) { for (let i = 0; i < n; i++) { await tap(['d']); await step(1) } }
async function hold(ks, n) { for (const k of ks) await page.keyboard.down(k); await step(n) }
async function release(ks) { for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 72, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.spdYellowTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 }
    if (o.coins != null) H.setCoins(o.coins) }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 100) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const clean = () => wait(s => s.a.attack?.my?.clean), rec = () => wait(s => s.a.cancel.open)
const idle = () => wait(s => !s.a.attack && !s.a.falcon?.sortie && !s.ult.active, 260)
// TRUE combo = every hit after the first landed while the defender was still in hitstun (logged the frame before).
async function measure(label, script, { gap = 72, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100, coins = null, pre = null } = {}) {
  await reset(gap, flip, { dummy, energy, coins }); if (pre) await pre(); let s = await state(); const e0 = s.a.energy, c0 = s.a.s?.coins ?? 0, log = []
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0, spent = 0, lastE = e0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.a.energy < lastE - 0.5) spent += lastE - q.a.energy; lastE = q.a.energy; if (q.b.hp < hp) { log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs }); hp = q.b.hp } if (q.block > lastBs) blk++; lastBs = q.block; stun = q.stun } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < 300; j++) { const q = await state(); if (!q.a.attack && !q.a.falcon?.sortie && !q.ult.active && !q.shots.length && !q.a.s?.clone?.act) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), blockedEvents: blk, damage: HP - s.b.hp,
    energySpent: Math.round(spent), coinsSpent: c0 - (s.a.s?.coins ?? 0), trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : 'single hit'
  report.routes.push(r); return r
}
const moveInfo = () => page.evaluate(() => { const a = __harness.spdYellowTest.raw().currentAttack; return a ? { name: a.name, key: a.my?.key, total: a.total, activeStart: a.activeStart, damage: a.damage } : null })

try {
  await page.goto(server.base + '/index.html?harness=1&p1=spd_yellow&p2=spd_yellow&seed=771101'); await page.waitForFunction(() => window.__harness?.spdYellowTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r
  ck(`both slots spd_yellow (mirror), HP ${HP}, 0 coins at round start, 2 Zord pips`, s.a.key === 'spd_yellow' && s.b.key === 'spd_yellow' && s.a.hp === HP && (s.a.s?.coins ?? 0) === 0 && s.a.hud.pips === 2, JSON.stringify({ hp: s.a.hp, c: s.a.s?.coins, hud: s.a.hud }))
  ck('rangers.js profile ticking (2 blink charges, engine dash off)', s.a.ranger?.charges === 2 && s.a.noDash)
  const D = await S('H.data()')

  // ── AUTHORED FRAME DATA via real inputs ──
  for (const [k, inp] of [['light', ['j']], ['heavy', ['k']], ['yLow', ['s', 'j']], ['up', ['i']], ['yAcro', ['d', 'k']], ['ySweep', ['a', 'k']], ['yClone', ['s', 'l']], ['yCall', ['w', 'l']], ['yUltOpen', ['u']]]) {
    await reset(400); await tap(inp); const m = await moveInfo(), md = D.moves[k]
    report.moves[k] = m; ck(`${k}: startup ${md.startup}, total ${md.startup + md.active + md.recovery}`, m?.key === k && m.activeStart === md.startup && m.total === md.startup + md.active + md.recovery + (k === 'yCall' ? 0 : 0), JSON.stringify(m))
    await idle()
  }

  // ── NORMALS ──
  for (const flip of [false, true]) { r = await measure('J1 -> J2 -> J3' + (flip ? ' (mirrored)' : ''), async M => { await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']) }, { flip }); ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r)) }
  report.resources.damageScale = +(report.routes[0].hits[0] / Math.round(17 * 1.7)).toFixed(3)
  await reset(); await page.keyboard.down('j'); await step(80); await page.keyboard.up('j'); s = await state(); ck('held Light never auto-chains', s.b.hp === HP - report.routes[0].hits[0], String(HP - s.b.hp))
  for (const g of ['whiff', 'block']) { await reset(g === 'whiff' ? 700 : 72, false, { dummy: g === 'block' ? 'block' : 'stand' }); if (g === 'block') await step(8); await tap(['j']); await rec(); await tap(['j']); ck('J2 retap rejected on ' + g, (await state()).a.attack?.name === 'light') ; await idle() }

  // ── PISTOL ──
  await reset(300); await tap(['l']); let sf = -1
  for (let i = 0; i < 20; i++) { const q = await state(); if (q.shots.length) { sf = i; break } await step(1) }
  s = await state(); report.gun.pistolFrame = sf
  ck('tap Special: pistol leaves on frame 12 (tap frame = 1), costs 10, kind pistol', sf >= 10 && sf <= 12 && s.shots[0]?.kind === 'pistol' && near(s.a.energy, 90), JSON.stringify({ sf, shots: s.shots, e: s.a.energy }))
  ck('pistol uses the supplied beam1 bolt art', /fx_beam1/.test(s.shots[0]?.sheet || ''))
  await reset(1100); await tap(['l']); await wait(q => q.shots.length, 20); await wait(q => !q.a.attack, 30); await tap(['l']); await step(14); s = await state(); const twoShots = s.shots.length
  ck('one ordinary pistol shot on screen per owner (second press rejected while the first flies)', twoShots === 1 && (s.a.s.stats.rejects >= 1 || !s.a.attack), JSON.stringify({ twoShots, st: s.a.s.stats.rejects }))
  r = await measure('Pistol (close)', async M => { await M.press(['l']) }, { gap: 160 }); report.gun.pistolDamage = r.hits[0]
  ck(`pistol hit = raw 28 (the Ranger x1.7 parity lever cancels the engine scale) × boost ${BOOST}`, near(r.hits[0], xB(28), 1.5), JSON.stringify(r.hits))   // tolerance 1→1.5: the raw is rounded BEFORE the boost, and the 2026-11-23 Red-parity boost 1.6 (was 1.38) scales that rounding

  // ── LONG GUN ──
  await reset(1100); await hold(['l'], 23); s = await state(); ck('held 23 f: still the compact pistol, nothing extra spent', near(s.a.energy, 90) && s.a.move === 'yPistol' && !s.shots.length, JSON.stringify({ e: s.a.energy, m: s.a.move }))
  await step(2); s = await state(); ck('at 24 held frames: +15 spent once, the long-gun pose (yLongHold)', near(s.a.energy, 75) && s.a.move === 'yLongHold' && s.a.s.gun?.committed, JSON.stringify({ e: s.a.energy, m: s.a.move }))
  await step(30); s = await state(); ck('held to the 45 f cap: the long gun resolves on its own (no hold-repeat)', s.shots.length === 1 && s.shots[0].kind === 'long' && /fx_beam2/.test(s.shots[0].sheet), JSON.stringify(s.shots))
  await release(['l']); await step(60); s = await state(); ck('still exactly one long shot fired for the hold', s.a.s.stats.long === 1 && s.a.s.stats.pistol === 0 && s.a.s.stats.longCommit === 1, JSON.stringify(s.a.s.stats))
  await reset(300); await hold(['l'], 26); await release(['l']); let lf = -1; for (let i = 0; i < 10; i++) { if ((await state()).shots.length) { lf = i; break } await step(1) }
  report.gun.longReleaseDelay = lf; ck('released at 26 (after commit): long gun waits for its 30 f minimum brace', lf >= 2 && lf <= 5, String(lf))
  await reset(300); await hold(['l'], 16); await release(['l']); await step(4); s = await state(); ck('release before 24 -> pistol (no long-gun cost)', s.shots[0]?.kind === 'pistol' && s.a.s.stats.longCommit === 0, JSON.stringify({ sh: s.shots, e: s.a.energy }))
  await reset(300, false, { energy: 20 }); await hold(['l'], 40); await release(['l']); await step(4); s = await state()
  ck('not enough Energy at the threshold -> the hold stays a pistol hold (longFail)', s.a.s.stats.longFail === 1 && s.a.s.stats.long === 0 && s.a.s.stats.pistol === 1 && near(s.a.energy, 10), JSON.stringify({ st: s.a.s.stats, e: s.a.energy }))
  await reset(300); await hold(['l'], 26); await S('(()=>{const a=H.raw(); a.hitstun=20; a.attacking=false; a.currentAttack=null})()'); await step(2); await release(['l']); await step(30); s = await state()
  ck('interrupted committed hold: 25 spent, nothing fires', near(s.a.energy, 75) && !s.shots.length && s.a.s.stats.gunInterrupted === 1 && s.a.s.stats.long === 0, JSON.stringify({ e: s.a.energy, st: s.a.s.stats }))
  r = await measure('Long gun (held 30 f)', async M => { await M.press(['l'], 30) }, { gap: 200 }); report.gun.longDamage = r.hits[0]
  ck(`long-gun hit = raw 62 × boost ${BOOST}, total spend 10 + 15`, near(r.hits[0], xB(62), 1) && r.energySpent === 25, JSON.stringify(r))
  await reset(300); await tap(['w']); await step(6); await tap(['l']); await step(14); s = await state()
  ck('air Special: air pistol (yAirShot), once per airtime', s.a.s.stats.air === 1 && s.shots.some(x => x.kind === 'air'), JSON.stringify(s.a.s.stats)); await wait(q => q.a.grounded, 120)

  // ── TACTICAL COINS ──
  await reset(); await tap(['j']); await clean(); await step(16); s = await state()
  ck('clean melee hit -> 1 coin (melee)', s.a.s.coins === 1 && s.a.s.cycle.melee, JSON.stringify({ c: s.a.s.coins, cy: s.a.s.cycle }))
  await idle(); await tap(['j']); await clean(); await step(16); s = await state(); ck('second melee in the same cycle awards nothing', s.a.s.coins === 1 && s.a.s.stats.award.melee === 1)
  await reset(72, false, { dummy: 'block' }); await step(8); await tap(['j']); await step(20); s = await state(); ck('blocked hit awards nothing', (s.a.s?.coins ?? 0) === 0)
  await reset(200); await tap(['l']); await step(30); s = await state(); ck('clean pistol hit -> gun coin', s.a.s.coins === 1 && s.a.s.cycle.gun, JSON.stringify(s.a.s.cycle))
  // clone category: record J1, split, put the idle duplicate beside the foe, then Back+Special echo
  await reset(600); await tap(['j']); await idle(); await tap(['s', 'l']); await wait(q => q.a.s?.clone?.ready && !q.a.attack, 60)
  await S('(()=>{const s=H.raw()._spdYellow, b=H.raw("p2"); s.clone.x=Math.round(b.x - 40); s.clone.dir=1})()'); await tap(['a', 'l']); await step(24); s = await state()
  report.coins.echo = { hits: s.a.s.stats.echoHits, c: s.a.s.coins, hp: s.b.hp }
  ck(`ordered ordinary echo hit -> clone coin; echo at 60 % of J1 raw (× boost ${BOOST})`, s.a.s.stats.echoHits === 1 && s.a.s.cycle.clone && s.a.s.coins === 1 && near(HP - s.b.hp, xB(Math.round(17 * 0.6)), 1), JSON.stringify(report.coins.echo))
  await reset(200); await S('(()=>{const s=H.raw()._spdYellow; s.cycle={melee:true,gun:true,clone:false}})()'); await S('H.award("clone")'); s = await state()
  ck('all three paid -> reset scheduled 90 f later', s.a.s.cycleReset === 90 && s.a.s.coins === 1); await step(91); s = await state()
  ck('cycle eligibility resets after 90 f (coins kept)', !s.a.s.cycle.melee && !s.a.s.cycle.gun && !s.a.s.cycle.clone && s.a.s.coins === 1 && s.a.s.stats.cycleResets === 1, JSON.stringify(s.a.s.cycle))
  await reset(200, false, { coins: 3 }); await S('H.award("melee")'); s = await state(); ck('max 3 coins (award at cap only marks the category)', s.a.s.coins === 3 && s.a.s.stats.coinsCapped === 1)

  // ── DUPLICATE / SWAP ──
  await reset(400); await tap(['s', 'l']); for (let i = 0; i < 16 && !(await state()).a.s?.clone; i++) await step(1); s = await state()
  report.clone.appear = s.a.attack ? s.a.attack.total - s.a.attack.timer : null
  ck('Down Special: one duplicate behind Z (20 Energy)', !!s.a.s.clone && s.a.s.clone.x < s.a.x + s.a.w / 2 && near(s.a.energy, 80), JSON.stringify(s.a.s.clone))
  await idle(); await tap(['s', 'l']); await step(2); s = await state(); ck('a second duplicate is refused (one per owner)', s.a.s.stats.clones === 1)
  const zx = s.a.x + s.a.w / 2, cx = s.a.s.clone.x; await tap(['d', 'l']); await step(12); s = await state()
  // clone drift ±10→±16: the duplicate keeps moving at Red-parity pace (2026-11-23) in the frames before this sample
  ck('Forward Special swaps Z and the duplicate', Math.abs((s.a.x + s.a.w / 2) - cx) <= 2 && Math.abs(s.a.s.clone.x - zx) <= 16 && s.a.s.stats.swaps === 1, JSON.stringify({ zx, cx, now: s.a.x + s.a.w / 2, c: s.a.s.clone.x }))
  await idle(); await S('(()=>{const b=H.raw("p2"), s=H.raw()._spdYellow; b.x=s.clone.x-24-b.w-20; b.facing=1; b.energy=100})()')
  await S('H.move("light","p2")'); for (let i = 0; i < 30 && (await state()).a.s.clone; i++) await step(1); s = await state()
  ck('one opponent hit disperses the duplicate (popped, cooldown 120)', !s.a.s.clone && s.a.s.stats.clonePopped === 1 && s.a.s.cloneCd > 0, JSON.stringify(s.a.s.stats))
  await reset(400); await tap(['s', 'l']); await idle(); await S('H.raw()._spdYellow.clone.life=2'); await step(3); s = await state(); ck('duplicate expires cleanly', !s.a.s.clone && s.a.s.stats.cloneExpired === 1)
  await reset(400); await tap(['s', 'l']); await idle(); await S('H.raw().health=0'); await step(2); s = await state(); ck('KO disperses the duplicate', !s.a.s?.clone)

  // ── COMMAND STANCE ──
  await reset(400); await hold(['p', 'l'], 6); s = await state(); ck('Charge+Special opens the stance; holding the chord never confirms', !!s.a.s.stance && s.a.s.stats.orders.cover === 0 && !s.shots.length, JSON.stringify(s.a.s.stance))
  await release(['p', 'l']); await step(2); await tap(['j']); await tap(['k']); s = await state(); ck('stance swallows attack presses (no attack, still open)', !!s.a.s.stance && s.a.attack?.name === 'yStance')
  await tap(['l']); await step(1); s = await state(); ck('COVER ME with 0 coins: rejected, nothing spent, stance stays open', !!s.a.s.stance && s.a.s.stats.orderRejects === 1 && s.a.energy === 100)
  await tap(['d']); await step(1); await tap(['d']); s = await state(); ck('Right/Right selects across the panel', s.a.s.stance.sel === 2, String(s.a.s.stance.sel))
  await tap([';']); await step(2); s = await state(); ck('Guard cancels the stance (nothing spent)', !s.a.s.stance && s.a.energy === 100 && s.a.s.stats.stanceCancels === 1)
  // COVER ME
  r = await measure('Duplicate -> stance COVER ME', async M => { await M.press(['s', 'l']); await M.until(q => !q.a.attack, 40); await M.press(['p', 'l']); await M.watch(2); await M.press(['l']); await M.watch(40) }, { gap: 180, coins: 1 })
  report.orders.cover = r; ck(`COVER ME: 1 coin + 8 Energy, the duplicate fires one raw-18 shot (× boost ${BOOST}, no coin back)`, r.coinsSpent === 1 && r.energySpent === 28 && r.hits.length === 1 && near(r.hits[0], xB(18), 1), JSON.stringify(r))
  // CROSSWIRE
  await reset(400, false, { coins: 1 }); await tap(['j']); await idle(); await tap(['s', 'l']); await idle(); const e1 = (await state()).a.energy
  await tap(['p', 'l']); await step(2); await tap(['d']); await step(1); await tap(['l']); await step(30); s = await state()
  report.orders.crosswire = { stats: s.a.s.stats, spent: +(e1 - s.a.energy).toFixed(1) }
  ck('CROSSWIRE: swap + coin-funded echo for 1 coin + 8 Energy (no ordinary swap/echo cost)', s.a.s.stats.orders.crosswire === 1 && s.a.s.stats.swaps === 1 && s.a.s.stats.echoes === 1 && near(e1 - s.a.energy, 8, 3) && s.a.s.coins === 0, JSON.stringify(report.orders.crosswire))
  // BREACH WINDOW
  await reset(260, false, { coins: 2 }); await tap(['p', 'l']); await step(2); await sel(2); await tap(['l']); await step(4); s = await state()
  ck('BREACH WINDOW: 2 coins + 10 Energy, armed for 120 f', !!s.a.s.breach && s.a.s.coins === 0 && near(s.a.energy, 90), JSON.stringify({ br: s.a.s.breach, c: s.a.s.coins, e: s.a.energy }))
  await idle(); await hold(['l'], 30); await release(['l']); s = await wait(q => q.a.s.breachConfirm, 40); const confirmT = s.a.s.breachConfirm?.t
  ck('armed long gun clean hit opens the 10 f confirm (shot carried no gun coin)', !!s.a.s.breachConfirm && !s.a.s.cycle.gun, JSON.stringify({ bc: s.a.s.breachConfirm, cy: s.a.s.cycle }))
  s = await wait(q => !q.a.attack || q.a.attack.timer <= 20, 40); report.orders.breachUsableAt = s.a.s.breachConfirm?.t
  ck('confirm window is still full when the late-recovery cancel opens', s.a.s.breachConfirm?.t === 10, JSON.stringify(s.a.s.breachConfirm))
  await tap(['w', 'l']); await step(2); s = await state(); report.orders.breach = { confirmT, kind: s.a.falcon?.pendingKind || s.a.falcon?.sortie?.kind }
  ck('Up+Special inside the window -> Sword Finish (ordinary 20 Energy + 1 pip), from the late long-gun recovery', s.a.attack?.my?.kind === 'ySword' && s.a.s.stats.swords === 1 && s.a.hud.pips === 1, JSON.stringify({ a: s.a.attack?.my, hud: s.a.hud }))
  for (let i = 0; i < 80; i++) { await step(1); if ((await state()).b.hp < (s.b.hp)) break } s = await state(); ck('Sword Finish connects on the long-gun punish', s.a.s.stats.swords === 1 && s.b.hp < HP - Math.round(62 * 1.7), String(HP - s.b.hp))
  await reset(260, false, { coins: 0 }); await hold(['l'], 30); await release(['l']); await step(30); await tap(['w', 'l']); await step(2); s = await state()
  ck('without Breach: Up+Special after a long gun is just an ordinary Intercept (no sword)', s.a.s.stats.swords === 0)

  // ── NINJA MEGAZORD ──
  r = await measure('Ninja Intercept', async M => { await M.press(['w', 'l']) }, { gap: 120 }); report.zord.intercept = r
  ck(`Up Special: Megazord Intercept punch raw 36 (× boost ${BOOST}), 15 Energy + 1 pip, no coin`, r.hits.length === 1 && near(r.hits[0], xB(36), 1) && r.energySpent === 15, JSON.stringify(r))
  await reset(120); await tap(['p', 'l']); await step(2); await sel(3); await tap(['l']); for (let i = 0; i < 60; i++) await step(1); s = await state()
  report.zord.rising = { hp: HP - s.b.hp, st: s.a.s.stats.orders.rising }; ck(`RISING KICK order: raw 40 (× boost ${BOOST}), ordinary 18 Energy + 1 pip, launches`, s.a.s.stats.orders.rising === 1 && near(HP - s.b.hp, xB(40), 1) && near(s.a.energy, 82), JSON.stringify(report.zord.rising))

  // ── MEASURED ROUTES (true-combo check = every later hit lands while the defender is still in hitstun) ──
  const putClone = () => S('(()=>{const s=H.raw()._spdYellow, b=H.raw("p2"); s.clone.x=Math.round(b.x - 30); s.clone.dir=1})()')
  const routes = [
    ['J1 -> J2 -> J3 -> pistol (Special cancel)', async M => { await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['l']) }, { gap: 72 }],
    ['Low Draw -> Cross Cut', async M => { await M.press(['s', 'j']); await M.until(q => q.a.cancel.open); await M.press(['k']) }, { gap: 72 }],
    ['Cross Cut -> Ultimate (recovery cancel)', async M => { await M.press(['k']); await M.until(q => q.a.cancel.open); await M.press(['u']); await M.until(q => q.ult.active, 60); await M.until(q => !q.ult.active, 260) }, { gap: 72 }],
    ['J1 -> Echo (Back+Special) -> Partner Break', async M => { await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['a', 'l']); await M.until(q => q.a.s.brk, 40); await M.press(['k']) },
      { gap: 72, pre: async () => { await tap(['s', 'l']); await idle(); await putClone() } }],
    ['J1 -> Echo -> Relay (Forward+Special swap cancel) -> J1', async M => { await M.press(['j']); await M.until(q => q.a.cancel.open); await M.press(['a', 'l']); await M.until(q => q.a.s.relay, 40); await M.press(['d', 'l']); await M.until(q => !q.a.attack, 40); await M.press(['j']) },
      { gap: 72, pre: async () => { await tap(['s', 'l']); await idle(); await putClone() } }],
    ['BREACH: long gun -> Sword Finish (Up+Special)', async M => { await M.press(['p', 'l']); await M.watch(2); await M.press(['d']); await M.watch(1); await M.press(['d']); await M.watch(1); await M.press(['l']); await M.until(q => !q.a.attack, 30); await M.watch(2)
      await M.press(['l'], 30); await M.until(q => q.a.s.breachConfirm && (!q.a.attack || q.a.attack.timer <= 20), 60); await M.press(['w', 'l']) }, { gap: 230, coins: 2 }],
    ['RISING KICK order -> jump -> Air Flying Kick', async M => { await M.press(['p', 'l']); await M.watch(2); for (let i = 0; i < 3; i++) { await M.press(['d']); await M.watch(1) } await M.press(['l']); await M.until(q => q.b.vy < 0 && q.b.y < q.a.y - 10, 60); await M.press(['w', 'd'], 2); await page.keyboard.down('d'); await M.watch(4); await M.press(['j'])   /* 2026-11-23 Red-parity jump rises faster → kick 2 f earlier (4 f: true combo 127; 6 f now passes over) */; await page.keyboard.up('d') }, { gap: 110 }],
  ]
  for (const [label, fn, o] of routes) { r = await measure(label, fn, o); ck(`route measured: ${label} (${r.verdict}, ${r.damage} dmg)`, r.hits.length >= 2, JSON.stringify(r)) }

  // ── BLINK ──
  await reset(500); await tap(['d']); await step(3); await tap(['d']); await step(1); s = await state(); ck('double-tap Right blinks (1 charge)', !!s.a.ranger.blink && s.a.ranger.charges === 1)
  let sawRec = false; for (let i = 0; i < 16; i++) { await step(1); const q = await state(); if (q.a.cast === 'yBlinkRec') sawRec = true } report.blink.recoveryPose = sawRec
  ck('blink recovery shows the supplied ready/low pose (yBlinkRec)', sawRec)

  // ── ULTIMATE ──
  r = await measure('Ultimate (clean opener)', async M => { await M.press(['u']); await M.until(q => q.ult.active, 60); await M.until(q => !q.ult.active, 260) }, { gap: 200 })
  report.ult.clean = r; ck(`ultimate: opener + 7 raid contacts, 270 raw before shared scaling (× boost ${BOOST}), 100 Energy`, r.hits.length === 8 && r.energySpent === 100 && near(r.damage, xB(270), 8), JSON.stringify(r))
  await reset(200, false, { dummy: 'block' }); await step(8); await tap(['u']); await step(60); s = await state(); ck('blocked opener: no raid', !s.ult.active && s.a.s.stats.ultStarts === 1 && (await page.evaluate(() => __harness.spdYellowTest.raw('p2').health)) >= HP - 10)
  await reset(200, false, { coins: 3 }); await S('H.raw()._spdYellow.showcase=true'); r = await measure('Ultimate SHOWCASE', async M => { await M.press(['u']); await M.until(q => q.ult.active, 60); await M.until(q => !q.ult.active, 260) }, { gap: 200, coins: 3, pre: () => S('H.raw()._spdYellow.showcase=true') })
  ck('Showcase spends 3 coins and changes no damage', r.coinsSpent === 3 && r.damage === report.ult.clean.damage, JSON.stringify({ c: r.coinsSpent, d: r.damage, d0: report.ult.clean.damage }))
  await reset(200); await tap(['u']); await wait(q => q.ult.active, 60); await step(70); await reset(400); s = await state()
  ck('reset mid-raid tears down the cinematic (no stale state)', !s.ult.active && !s.a.attack && !s.a.falcon?.sortie && !s.a.s?.clone, JSON.stringify(s.ult))
  // ── DETERMINISM (same input script twice) ──
  const run = async () => { await reset(200, false, { coins: 1 }); await tap(['s', 'l']); await idle(); await tap(['l']); await step(40); await tap(['p', 'l']); await step(2); await tap(['l']); await step(60); return S('JSON.stringify({a:H.state().s,hp:H.state("p2").hp,x:H.state().x})') }
  const A = await run(), B = await run(); ck('identical input script -> identical GAME_STATE', A === B)
  ck('render cache bounded', (await S('H.fxCache()')) < 80)
  ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
fs.writeFileSync('docs/spd_yellow/mechanics_results.json', JSON.stringify({ pass, fail, errors, report }, null, 2) + '\n')
console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
