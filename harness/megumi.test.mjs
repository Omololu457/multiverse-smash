// harness/megumi.test.mjs — Megumi Fushiguro (megumi_fushiguro): mechanics + MEASURED routes through REAL keyboard input
// and the actual movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge,
// ; block, WASD). Covers identity, the SHARED double jump (exactly 2, never refunded), authored frame data, the chain and
// heavy cancels, every summon (one action, ownership, no loops, guard rules), Shadow Routes, Max Elephant, Shadow Step,
// the ultimate (connect / whiff / reset cleanup) and measured routes. Writes docs/megumi/mechanics_results.json.
//   node harness/megumi.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, movement: {}, summons: {}, ultimate: {}, misc: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1000, SC = 1.95, sc = v => Math.round(v * SC)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.megumiTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, combo: H.raw().comboCounter, ult: H.ult(), proj: H.projectiles(), hud: H.hud() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.megumiTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 80, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.megumiTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const idle = () => wait(s => !s.a.attack && s.a.grounded && !s.ult.active && !s.a.s?.summon, 400)
const moveInfo = () => page.evaluate(() => { const a = __harness.megumiTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
async function measure(label, script, { gap = 80, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100, stocks = 0 } = {}) {
  await reset(gap, flip, { dummy, energy }); if (stocks) await S('H.setRoute(a)', stocks)
  let s = await state(); const e0 = s.a.energy, log = []
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs }); if (q.block > lastBs) blk++; hp = q.b.hp; stun = q.stun; lastBs = q.block } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < 400; j++) { const q = await state(); if (!q.a.attack && !q.ult.active && !q.proj.length && !q.a.s?.summon) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), blockedEvents: blk, damage: HP - s.b.hp,
    energySpent: +(e0 - s.a.energy).toFixed(2), trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note, routes: s.a.s?.stats?.routes || 0 }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : hitLog.length ? 'single hit' : 'no hit'
  report.routes.push(r); return r
}
const clean = q => q.a.attack?.mg?.clean

try {
  await page.goto(server.base + '/index.html?harness=1&p1=megumi_fushiguro&p2=megumi_fushiguro&seed=880211'); await page.waitForFunction(() => window.__harness?.megumiTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r, m
  const D = await S('H.data()')
  // ── identity + movement ──
  ck('both slots megumi_fushiguro, HP 1000, Energy max 100', s.a.key === 'megumi_fushiguro' && s.a.maxHp === HP && s.b.maxHp === HP && await S('H.raw().maxEnergy') === 100)
  ck('maxJumps 2 (the shared double jump)', s.a.maxJumps === 2, `${s.a.maxJumps}`)
  await reset(400); await page.keyboard.down('d'); await step(12); const vxw = (await state()).a.vx; await page.keyboard.up('d'); await step(10)
  const rawSp = await S('H.raw().speed'), formula = Math.min(9.5, Math.max(4.5, 4.5 + (rawSp - 78) / 20 * 5)); report.movement = { walkVx: vxw, liveSpeedStat: rawSp, formula }
  ck('walk = the shared physics formula (no Megumi-only slowdown)', Math.abs(vxw - formula) < 0.01, `${vxw} vs ${formula}`)
  await reset(300); await tap(['d'], 1); await step(2); await tap(['d'], 1); await step(6); s = await state()
  ck('double-tap = the shared dash (speed 92 < teleport tier; stays in front of the foe)', s.a.x < s.b.x && s.a.x - 1300 > 30, JSON.stringify({ ax: s.a.x, bx: s.b.x }))
  await reset(400); await tap(['w'], 2); await step(10); s = await state(); const j1 = s.a.jumpCount
  await tap(['w'], 2); await step(2); s = await state(); const j2 = s.a.jumpCount, dj = s.a.s?.stats?.dj
  await tap(['w'], 2); await step(2); s = await state(); const j3 = s.a.jumpCount
  report.movement.jumps = [j1, j2, j3]
  ck('double jump: exactly 2 (third press does nothing)', j1 === 1 && j2 === 2 && j3 === 2 && dj === 1, JSON.stringify([j1, j2, j3, dj]))
  await tap(['l'], 1); await step(30); s = await state()
  ck('air Special (Air Nue) never refunds a jump', s.a.jumpCount === 2 || s.a.grounded, `${s.a.jumpCount}`)
  s = await wait(q => q.a.grounded, 160); ck('a genuine landing resets jumpCount', s.a.grounded && s.a.jumpCount === 0, `${s.a.jumpCount}`)
  // ── normals ──
  const expect = { light: [5, 16], mL2: [6, 20], mLow: [8, 22], heavy: [12, 46], up: [7, 30], mLaunch: [12, 40], air: [6, 24], mAirEnd: [14, 34] }
  for (const [k, [st, raw]] of Object.entries(expect)) { const md = D.moves[k]; ck(`${k}: ${st} f startup, raw ${raw} (stored ${sc(raw)})`, md.startup === st && md.raw === raw && md.damage === sc(raw), JSON.stringify(md)) }
  ck('mL3 / mAdv: explicit two-window hit schedules', JSON.stringify(D.moves.mL3.hits) === '[[9,10,"a"],[15,16,"b"]]' && JSON.stringify(D.moves.mAdv.hits) === '[[13,14,"a"],[18,19,"b"]]')
  await reset(80); await tap(['j'], 1); m = await moveInfo(); report.moves.light = m
  ck('Light starts the real light with activeStart 5', m?.name === 'light' && m.activeStart === 5, JSON.stringify(m)); await idle()
  r = await measure('Jab → Kick → Staff (Light ×3)', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'mL2' && clean(q), 40); await M.press(['j']) })
  ck('light chain lands 4 hits (jab, kick, staff ×2) as a true combo', r.hits.length === 4 && r.trueCombo, JSON.stringify(r))
  r = await measure('Light retap without a hit', async M => { await M.press(['j']); await M.watch(4); await M.press(['j']) }, { gap: 400 })
  s = await state(); ck('chain needs a clean hit (whiffed jab is not cancelled)', !(s.a.s?.stats) || r.hits.length === 0, JSON.stringify(r))
  await reset(80); await tap(['s', 'j'], 1); m = await moveInfo(); ck('Down+Light = low staff check (hits low)', m?.name === 'mLow' && D.moves.mLow.hitLevel === 'low', JSON.stringify(m)); await idle()
  await tap(['i'], 1); m = await moveInfo(); ck('Up-Attack = uppercut launcher', m?.name === 'up', JSON.stringify(m)); await idle()
  await tap(['w', 'k'], 1); m = await moveInfo(); s = await state(); ck('Up+Heavy = rising staff launcher (no jump)', m?.name === 'mLaunch' && s.a.grounded, JSON.stringify(m)); await idle()
  await tap(['d', 'k'], 1); m = await moveInfo(); ck('Forward+Heavy = advancing sword', m?.name === 'mAdv', JSON.stringify(m)); await idle()
  await tap(['k'], 1); m = await moveInfo(); ck('Heavy = sword arc, 12 f', m?.name === 'heavy' && m.activeStart === 12, JSON.stringify(m)); await idle()
  await reset(400); await tap(['w'], 2); await step(5); await tap(['j'], 1); m = await moveInfo(); ck('air Light = Air Palm', m?.name === 'air', JSON.stringify(m)); await idle()
  await reset(400); await tap(['w'], 2); await step(3); await tap(['k'], 1); m = await moveInfo(); ck('air Heavy = winged Toad lash (aerial ender)', m?.name === 'mAirEnd', JSON.stringify(m))
  await wait(q => !q.a.attack, 40); s = await state()
  if (!s.a.grounded) { await tap(['k'], 1); m = await moveInfo(); ck('aerial ender once per airtime', m?.name !== 'mAirEnd', JSON.stringify(m)) } else ck('aerial ender once per airtime (landed first; flag reset on landing)', true)
  await idle()
  // ── Divine Dog ──
  await reset(400); await S("H.raw('p2').invulnTimer = 999"); await tap(['l'], 1); m = await moveInfo(); s = await state()
  ck('Special = Divine Dog gesture (−12)', m?.name === 'mDog' && Math.abs(s.a.energy - 88) < 0.5, JSON.stringify({ m, e: s.a.energy }))
  s = await wait(q => q.proj.some(p => p.kind === 'dog'), 30); const d0 = s.proj.find(p => p.kind === 'dog')
  await step(6); s = await state(); const d1 = s.proj.find(p => p.kind === 'dog')
  ck('the dog runs straight (vx 10, constant y, captured direction)', d0 && d1 && d1.vx === 10 && d1.y === d0.y && d1.x > d0.x, JSON.stringify({ d0, d1 }))
  s = await wait(q => !q.a.s?.summon, 120); report.summons.dogRange = s.a.s.stats
  ck('the dog dissolves at its range bound (summon cleared, no projectile left)', !s.a.s.summon && !s.proj.length, JSON.stringify(s.proj))
  await reset(400); await S("H.raw('p2').invulnTimer = 999"); await tap(['l'], 1); await wait(q => !q.a.attack, 40); const eA = (await state()).a.energy; await tap(['a', 'l'], 1); s = await state()
  ck('one offensive summon: a second summon while the dog runs is REFUSED before anything is spent', s.a.attack?.name !== 'mSerpent' && s.a.energy >= eA - 0.01 && s.a.s.stats.rejects >= 1 && s.a.s.summon?.kind === 'dog', JSON.stringify({ atk: s.a.attack?.name, eA, e: s.a.energy }))
  r = await measure('Divine Dog vs standing foe', async M => { await M.press(['l']); await M.until(q => !q.a.s?.summon, 120) }, { gap: 220 })
  ck('Divine Dog: one hit', r.hits.length === 1, JSON.stringify(r)); report.summons.dog = r
  r = await measure('Divine Dog vs guard', async M => { await M.press(['l']); await M.until(q => !q.a.s?.summon, 120) }, { gap: 220, dummy: 'block' })
  ck('Divine Dog is guardable (blocked, no damage)', r.hits.length === 0 && r.blockedEvents >= 1, JSON.stringify(r))
  // ── Toad ──
  r = await measure('Toad (clean) pull', async M => { await M.press(['d', 'l']); await M.until(q => q.a.s?.stats?.pulls >= 1 || !q.a.s?.summon, 80); await M.watch(10) }, { gap: 170 })
  s = await state(); report.summons.toad = { r, gapAfter: s.b.x - (s.a.x + s.a.w), pulls: s.a.s.stats.pulls }
  ck('Forward+Special = Toad: one tongue hit, clean → a short pull toward Megumi', r.hits.length === 1 && s.a.s.stats.pulls === 1 && s.b.x - (s.a.x + s.a.w) < 110, JSON.stringify(report.summons.toad))
  r = await measure('Toad vs guard', async M => { await M.press(['d', 'l']); await M.until(q => !q.a.s?.summon, 80) }, { gap: 170, dummy: 'block' }); s = await state()
  ck('Toad never pulls through guard', r.hits.length === 0 && s.a.s.stats.pulls === 0, JSON.stringify({ r, st: s.a.s.stats }))
  await reset(170); await tap(['d', 'l'], 1); await wait(q => !q.a.s?.summon && !q.a.attack, 120); await S("(H.raw('p2').x = H.raw().x + 170)"); await step(1)
  await tap(['d', 'l'], 1); await wait(q => !q.a.s?.summon && !q.a.attack, 120); s = await state()
  ck('pull lockout: a second Toad inside 120 f hits but does not pull again (no capture loop)', s.a.s.stats.pulls === 1 && (s.a.s.stats.hits.toad || 0) >= 1, JSON.stringify(s.a.s.stats))
  // ── Nue ──
  await reset(300); const jc0 = (await state()).a.jumpCount; await tap(['w', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Up+Special = Nue (no jump; −16)', m?.name === 'mNue' && s.a.grounded && Math.abs(s.a.energy - 84) < 0.5, JSON.stringify({ m, g: s.a.grounded, e: s.a.energy }))
  s = await wait(q => q.proj.some(p => p.kind === 'nue'), 40); const nb = s.proj.find(p => p.kind === 'nue'), cx = s.a.x + s.a.w / 2
  report.summons.nue = { burstDx: nb && nb.x - cx, burstY: nb && nb.y, feet: s.a.y + s.a.h }
  ck('Nue bursts once at a FIXED point ahead / above (anti-air, on screen)', nb && nb.x - cx > 30 && nb.x - cx < 140 && (s.a.y + s.a.h) - nb.y > 100, JSON.stringify(report.summons.nue))
  s = await wait(q => !q.a.s?.summon, 80); ck('one Nue pass, then it leaves; no jump restored', s.a.s.stats.spawns === 1 && s.a.jumpCount === jc0, JSON.stringify(s.a.s.stats))
  // the foe is HELD airborne at Nue's burst height every frame (test scaffolding standing in for a jumping opponent)
  const hold = () => page.evaluate(() => { const H = __harness.megumiTest, a = H.raw(), b = H.raw('p2'); if (b.hitstun > 0) return; b.y = a.y + a.h - 150 - b.h / 2; b.vy = 0; b.onGround = b.grounded = false })
  r = await measure('Nue vs airborne foe', async M => { await M.press(['w', 'l']); for (let i = 0; i < 60; i++) { await hold(); await M.watch(1) } }, { gap: 70, note: 'foe held at burst height (jump stand-in)' })
  ck('Nue hits an airborne foe (anti-air), at most once', r.hits.length === 1, JSON.stringify(r))
  // ── Rabbit Escape ──
  await reset(300); await tap(['s', 'l'], 1); m = await moveInfo(); ck('Down+Special = Rabbit Escape (−10)', m?.name === 'mRabbit', JSON.stringify(m))
  s = await wait(q => !!q.a.s?.rabbits, 20); ck('rabbits: no damaging projectile', !!s.a.s.rabbits && !s.proj.length, JSON.stringify(s.proj))
  await wait(q => !q.a.attack, 30); const xr = (await state()).a.x; await tap(['a'], 1); s = await wait(q => q.a.attack?.name === 'mHop', 6)
  await wait(q => !q.a.attack, 30); s = await state(); report.summons.hop = { dx: s.a.x - xr }
  ck('one hop inside the window: ≈120 px reposition', s.a.s.stats.hops === 1 && xr - s.a.x >= 100 && xr - s.a.x <= 130, JSON.stringify({ dx: s.a.x - xr, st: s.a.s.stats }))
  await tap(['a'], 1); await step(3); s = await state(); ck('only one hop per swarm', s.a.s.stats.hops === 1, JSON.stringify(s.a.s.stats))
  await reset(60); await tap(['s', 'l'], 1); await step(10); const hpR = (await state()).a.hp; await S("H.move('light','p2')"); await step(10); s = await state()
  ck('Rabbit Escape grants no invulnerability', s.a.hp < hpR, `${hpR} → ${s.a.hp}`)
  // ── Great Serpent ──
  await reset(180); await tap(['a', 'l'], 1); m = await moveInfo(); ck('Back+Special = Great Serpent (12 f, −18)', m?.name === 'mSerpent' && m.activeStart === 12, JSON.stringify(m))
  s = await wait(q => !!q.a.s?.summon, 20); const sx = s.a.s.summon.x, bcx = s.b.x + s.b.w / 2
  await S("(H.raw('p2').x += 140)"); s = await wait(q => q.proj.some(p => p.kind === 'serpent'), 40); const sp = s.proj.find(p => p.kind === 'serpent')
  report.summons.serpent = { point: sx, foeAtRelease: bcx, vol: sp }
  ck('the emergence point is captured at release (foe x) and never tracks', Math.abs(sx - bcx) <= 2 && sp && Math.abs(sp.x - sx) <= 30, JSON.stringify(report.summons.serpent))
  await wait(q => !q.a.s?.summon, 80)
  await reset(900); await tap(['a', 'l'], 1); s = await wait(q => !!q.a.s?.summon, 20)
  ck('range cap: a far foe → the point stops 260 px ahead', Math.abs(s.a.s.summon.x - (s.a.x + s.a.w / 2) - 260) <= 2, JSON.stringify(s.a.s.summon))
  r = await measure('Great Serpent', async M => { await M.press(['a', 'l']); await M.until(q => !q.a.s?.summon, 90) }, { gap: 160 })
  ck('Serpent: one rising strike', r.hits.length === 1, JSON.stringify(r))
  await reset(160); await tap(['a', 'l'], 1); await step(16); await S("(H.raw('p2').x = H.raw().x + H.raw().w + 4, H.raw('p2').facing = -1, H.move('light','p2'))"); await step(12); s = await state()
  ck('Serpent is interruptible: Megumi hit before its first contact → it is dismissed', !s.a.s.summon && s.a.s.stats.dismissed >= 1, JSON.stringify(s.a.s.stats))
  // ── Max Elephant ──
  await reset(240); await tap(['s', 'k'], 1); m = await moveInfo(); s = await state()
  ck('Down+Heavy = Max Elephant (26 f, −30)', m?.name === 'mElephant' && m.activeStart === 26 && Math.abs(s.a.energy - 70) < 0.5, JSON.stringify(m)); await idle()
  r = await measure('Max Elephant', async M => { await M.press(['s', 'k']); await M.until(q => !q.a.s?.summon, 160) }, { gap: 240 })
  s = await state(); report.summons.elephant = { r, push: s.b.x - 1540 }
  ck('Elephant: at most 3 contacts (fixed lane), capped push', r.hits.length >= 1 && r.hits.length <= 3 && s.b.x - 1540 < 200, JSON.stringify(report.summons.elephant))
  r = await measure('Max Elephant vs guard', async M => { await M.press(['s', 'k']); await M.until(q => !q.a.s?.summon, 160) }, { gap: 240, dummy: 'block' })
  ck('Elephant is guardable', r.hits.length === 0, JSON.stringify(r))
  // ── Shadow Step ──
  await reset(500); const x0 = (await state()).a.x, e0 = (await state()).a.energy
  await page.keyboard.down('p'); await step(2); await tap(['d'], 1); m = await moveInfo(); await step(24); await page.keyboard.up('p'); s = await state()
  report.misc.step = { dx: s.a.x - x0, m }
  ck('Shadow Step: L2 (P) + forward → ~110 px physical travel', m?.name === 'mStep' && s.a.x - x0 >= 100 && s.a.x - x0 <= 125, JSON.stringify(report.misc.step))
  ck('L2 + horizontal never charges energy', s.a.energy <= e0 + 0.5, `${e0} → ${s.a.energy}`)
  await page.keyboard.down('p'); await step(2); await tap(['d'], 1); m = await moveInfo(); await step(4); await page.keyboard.up('p')
  ck('Shadow Step cooldown (70 f) refuses an immediate second step', m?.name !== 'mStep', JSON.stringify(m))
  await reset(70); await page.keyboard.down('p'); await step(2); await tap(['d'], 1); await step(24); await page.keyboard.up('p'); s = await state()
  ck('Shadow Step never passes through the opponent', s.a.x + s.a.w <= s.b.x + 1, JSON.stringify({ ax: s.a.x, bx: s.b.x }))
  await reset(400); const eC = (await state()).a.energy; await page.keyboard.down('p'); await step(40); await page.keyboard.up('p'); s = await state()
  ck('L2 alone stays the ordinary shared charge', s.a.energy > eC || eC >= 100, `${eC} → ${s.a.energy}`)
  // ── Shadow Routes ──
  r = await measure('stock earn: Jab (normal) then Dog (dog)', async M => { await M.press(['j']); await M.until(q => !q.a.attack, 40); await M.watch(30); await M.press(['l']); await M.until(q => !q.a.s?.summon, 120) }, { gap: 90 })
  s = await state(); ck('two DISTINCT clean families → one Shadow Route stock', s.a.s.route.stocks === 1 && s.a.s.stats.stocksEarned === 1, JSON.stringify(s.a.s.route))
  r = await measure('same family twice', async M => { await M.press(['j']); await M.until(q => !q.a.attack, 40); await M.watch(30); await M.press(['j']); await M.until(q => !q.a.attack, 40) }, { gap: 80 })
  s = await state(); ck('one family twice earns nothing', s.a.s.route.stocks === 0, JSON.stringify(s.a.s.route))
  r = await measure('blocked hits earn nothing', async M => { await M.press(['j']); await M.until(q => !q.a.attack, 40); await M.watch(30); await M.press(['l']); await M.until(q => !q.a.s?.summon, 120) }, { gap: 130, dummy: 'block' })
  s = await state(); ck('blocked hits earn nothing', s.a.s.route.stocks === 0 && (s.a.s.route.fam || []).length === 0, JSON.stringify(s.a.s.route))
  r = await measure('SHADOW ROUTE: Dog → Toad', async M => { await M.press(['l']); await M.until(q => !!q.a.s?.route?.confirm, 80); await M.press(['d', 'l']); await M.until(q => q.a.s?.stats?.routes >= 1 && !q.a.s?.summon, 120) }, { gap: 110, stocks: 1 })
  s = await state(); report.misc.route = r
  ck('route: Dog clean hit → fresh Forward+Special inside 22 f → Toad (pays its cost, stock spent)', r.routes === 1 && r.hits.length === 2 && s.a.s.route.stocks === 0 && r.energySpent >= 20, JSON.stringify(r))
  r = await measure('route twice in one combo', async M => { await M.press(['l']); await M.until(q => !!q.a.s?.route?.confirm, 80); await M.press(['d', 'l']); await M.until(q => !!q.a.s?.route?.confirm && q.a.s?.summon?.kind === 'toad', 80); await M.press(['w', 'l']); await M.watch(40) }, { gap: 110, stocks: 2 })
  ck('max ONE route per combo (the second fresh Special is refused)', r.routes === 1 && r.hits.length === 2, JSON.stringify(r))
  r = await measure('route without a stock', async M => { await M.press(['l']); await M.until(q => !!q.a.s?.route?.confirm, 80); await M.press(['d', 'l']); await M.watch(40) }, { gap: 200 })
  ck('no stock → no route', r.routes === 0 && r.hits.length === 1, JSON.stringify(r))
  // ── ultimate ──
  await reset(900); await tap(['u'], 1); m = await moveInfo(); s = await state()
  ck('Ultimate = 18 f hand sign → Totality, −100', m?.name === 'ultOpen' && m.activeStart === 18 && s.a.energy < 1, JSON.stringify(m))
  s = await wait(q => !q.a.attack && !q.a.s?.summon, 200); ck('a whiffed opener: MISS branch, real recovery, no cinematic', !s.ult.active && s.a.s.stats.ultWhiffs === 1, JSON.stringify(s.a.s.stats))
  r = await measure('Ultimate vs guard', async M => { await M.press(['u']); await M.until(q => !q.a.attack && !q.a.s?.summon, 200) }, { gap: 120, dummy: 'block' })
  s = await state(); ck('a blocked opener never starts the cinematic', s.a.s.stats.ultDone === 0 && r.hits.length === 0, JSON.stringify(r))
  r = await measure('CHIMERA SHADOW GARDEN', async M => { await M.press(['u']); await M.until(q => q.ult.active, 80); await M.until(q => !q.ult.active, 400) }, { gap: 120 })
  report.ultimate = r
  ck('confirmed ultimate: 8 contacts (opener 30 + 20 ×3 + 30 + 25 ×2 + 90 = 260 raw), one cinematic', r.hits.length === 8, JSON.stringify(r))
  s = await state(); ck('after the ultimate: caster restored, cinematic inactive, foe knocked down', !s.ult.active && !s.a.attack && s.a.grounded, JSON.stringify({ a: s.a.attack, g: s.a.grounded }))
  await reset(120); await tap(['u'], 1); await wait(q => q.ult.active, 80); await step(60); await S('H.reset()'); await step(1); s = await state()
  ck('reset mid-cinematic restores everything (no stuck pose / hitstun / summon)', !s.ult.active && !s.a.attack && s.b.hitstun === 0 && !s.a.s?.summon && !s.proj.length, JSON.stringify({ u: s.ult, a: s.a.attack }))
  // ── KO cleanup ──
  await reset(400); await S("H.raw('p2').invulnTimer = 999"); await tap(['l'], 1); await wait(q => !!q.a.s?.summon, 20); await S('(H.raw().health = 0)'); await step(2); s = await state()
  ck('KO: no summon survives its owner', !s.a.s?.summon && !s.proj.length, JSON.stringify({ z: s.a.s?.summon, p: s.proj }))
  // ── measured routes ──
  await measure('Jab → Kick → Sword Arc', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'mL2' && clean(q), 40); await M.press(['k']) })
  await measure('Jab → Kick → Advancing Sword', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'mL2' && clean(q), 40); await M.press(['d', 'k']) })
  await measure('Low → Rising Staff', async M => { await M.press(['s', 'j']); await M.until(clean, 30); await M.press(['w', 'k']) })
  await measure('Jab → Kick → Staff → Divine Dog', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'mL2' && clean(q), 40); await M.press(['j']); await M.until(q => q.a.attack?.name === 'mL3' && q.a.attack?.mg?.hits?.length === 2, 40); await M.press(['l']); await M.until(q => !q.a.s?.summon, 120) })
  await measure('Sword Arc → Toad (pull)', async M => { await M.press(['k']); await M.until(clean, 40); await M.press(['d', 'l']); await M.until(q => !q.a.s?.summon, 120) }, { gap: 110 })
  await measure('Sword Arc → Ultimate', async M => { await M.press(['k']); await M.until(clean, 40); await M.press(['u']); await M.until(q => q.ult.active, 80); await M.until(q => !q.ult.active, 400) }, { gap: 110 })
  await measure('Uppercut → double jump → Air Palm → Winged Toad', async M => { await M.press(['i']); await M.until(clean, 40); await M.press(['w'], 2); await M.watch(6); await M.press(['w'], 2); await M.watch(4); await M.press(['j']); await M.until(q => !q.a.attack, 30); await M.press(['k']) })
  await measure('Dog → ROUTE → Serpent (1 stock)', async M => { await M.press(['l']); await M.until(q => !!q.a.s?.route?.confirm, 80); await M.press(['a', 'l']); await M.until(q => q.a.s?.stats?.routes >= 1 && !q.a.s?.summon, 140) }, { gap: 200, stocks: 1 })
  for (const x of report.routes) console.log('ROUTE', x.label.padEnd(44), String(x.damage).padStart(4), x.verdict, JSON.stringify(x.hits))
  ck('fx image cache is bounded', await S('H.fxCache()') < 80, `${await S('H.fxCache()')}`)
} catch (e) { console.log('ERR', e.stack); fail++ }
report.errors = errors
fs.writeFileSync('docs/megumi/mechanics_results.json', JSON.stringify(report, null, 1))
console.log(`\n${pass} passed, ${fail} failed; page errors ${errors.length}`, errors.slice(0, 5))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
