// harness/raven.test.mjs — Raven (Rachel Roth, rosterKey raven): mechanics + MEASURED routes through REAL keyboard input and
// the actual movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge
// (= levitation toggle), ; block, WASD). Covers: identity, physics gravity parity, agile walk speed, the SHARED double jump,
// levitation (cost / drain / cap / speed bound / no jump / once per airtime / toggle-off / never recharges), authored frame
// data, J chain, Forward+Heavy chain, Dark Pulse (one orb, air once per airtime), Lift the Room (two piles, max 2, recast
// rejected, hostile break, expiry), Send / Conjure, Falling Verdict (no jump, column ≤ 220, one drop, floor stop),
// infusion (atomic single brick), Soul Shell (frontal absorb ≤ 2, back unprotected, retap early end, cooldown), the
// ultimate (contacts, total, whiff recovery, cleanup on reset), HUD and measured routes.
// Writes docs/raven/mechanics_results.json.        node harness/raven.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, movement: {}, lev: {}, spells: {}, shell: {}, ultimate: {}, misc: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1080, SC = 1.95, sc = v => Math.round(v * SC)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.ravenTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, combo: H.raw().comboCounter, ult: H.ult(), proj: H.projectiles(), hud: H.hud() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.ravenTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }   // one released frame first: a real press edge
async function reset(gap = 80, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.ravenTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const idle = () => wait(s => !s.a.attack && s.a.grounded && !s.ult.active, 400)
const moveInfo = () => page.evaluate(() => { const a = __harness.ravenTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
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
  await page.goto(server.base + '/index.html?harness=1&p1=raven&p2=raven&seed=771300'); await page.waitForFunction(() => window.__harness?.ravenTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r, m
  const D = await S('H.data()')
  // ── P1 / P3 identity + movement ──
  ck('both slots raven, HP 1080, Energy max 100', s.a.key === 'raven' && s.a.maxHp === HP && s.b.maxHp === HP && await S('H.raw().maxEnergy') === 100)
  const pg = await page.evaluate(async () => (await import('./physics.js')).physics.gravity)
  ck('ravenState GRAVITY equals physics.gravity (levitation pre-compensation)', pg === await S('H.gravity'), `${pg}`)
  ck('maxJumps 2 (the shared double jump)', s.a.maxJumps === 2, `${s.a.maxJumps}`)
  await reset(400); await page.keyboard.down('d'); await step(12); const vxw = (await state()).a.vx; await page.keyboard.up('d'); await step(10)
  const rawSp = await S('H.raw().speed'), authored = await page.evaluate(async () => (await import('./ravenData.js')).raven.stats.speed)
  const formula = Math.min(9.5, Math.max(4.5, 4.5 + (rawSp - 78) / 20 * 5)); report.movement = { walkVx: vxw, liveSpeedStat: rawSp, authored, formula }
  ck('authored agile speed stat 94 (peers: Beast Boy / S.P.D. Pink 92, White 97)', authored === 94, `${authored}`)
  ck('walk = the shared physics formula of the live speed stat (no Raven-only slowdown)', Math.abs(vxw - formula) < 0.01, `${vxw} vs ${formula} (live stat ${rawSp})`)
  // shared double jump: W, then W again in the air → jumpCount 2; a third W adds nothing
  await reset(400); await tap(['w'], 2); await step(10); s = await state(); const j1 = s.a.jumpCount
  await tap(['w'], 2); await step(2); s = await state(); const j2 = s.a.jumpCount, dj = s.a.s?.stats?.dj
  await tap(['w'], 2); await step(2); s = await state(); const j3 = s.a.jumpCount
  report.movement.jumps = [j1, j2, j3]
  ck('shared double jump: first W → 1, second W in the air → 2 (double-jump cue), third W → still 2', j1 === 1 && j2 === 2 && j3 === 2 && dj === 1, JSON.stringify([j1, j2, j3, dj]))
  await idle(); s = await state(); ck('a genuine landing resets jumpCount', s.a.grounded && s.a.jumpCount === 0, `${s.a.jumpCount}`)
  // ── levitation ──
  await reset(400, false, { energy: 100 }); const y0 = (await state()).a.y
  await tap(['p'], 1); s = await state()
  ck('L2 tap enters levitation: −10 Energy, jumpCount untouched', !!s.a.s?.lev && Math.abs(s.a.energy - 90) < 0.3 && s.a.jumpCount === 0, `${s.a.energy} jc=${s.a.jumpCount}`)
  await step(20); s = await state(); ck('levitation lifts gently off the floor (airborne, not a jump)', !s.a.grounded && s.a.y < y0 && s.a.jumpCount === 0, `${y0 - s.a.y}`)
  await page.keyboard.down('d'); let mx = 0; for (let i = 0; i < 30; i++) { await step(1); mx = Math.max(mx, Math.abs((await state()).a.vx)) } await page.keyboard.up('d')
  report.lev.maxVx = mx; ck('levitating horizontal speed never exceeds the ground walk', mx <= vxw + 1e-6, `${mx}`)
  await page.keyboard.down('w'); let top = 1e9; for (let i = 0; i < 40; i++) { await step(1); top = Math.min(top, (await state()).a.y) } await page.keyboard.up('w')
  s = await state(); report.lev.rise = y0 - top
  ck('holding Up while levitating rises gently but stays below the ceiling (≤ 240 px), no jump consumed', y0 - top <= 241 && s.a.jumpCount === 0, `${y0 - top} jc=${s.a.jumpCount}`)
  const lv = await wait(q => !q.a.s?.lev, 200); report.lev.endedAt = lv.a.s?.stats?.levFrames
  ck('levitation ends by itself at 120 f; drain 6/s (≈12 for 2 s)', !lv.a.s?.lev && Math.abs(lv.a.s.stats.levDrained - 12) < 0.3, JSON.stringify({ frames: lv.a.s.stats.levFrames, drained: lv.a.s.stats.levDrained }))
  await tap(['p'], 1); s = await state(); ck('one levitation per airtime (second tap before landing is rejected)', !s.a.s?.lev, '')
  await idle(); await tap(['p'], 1); await step(6); await tap(['p'], 1); await step(1); s = await state()
  ck('a second L2 tap toggles levitation off (no hold-to-charge)', !s.a.s?.lev && !s.a.charging, '')
  await reset(400, false, { energy: 5 }); await tap(['p'], 1); s = await state(); ck('levitation rejected under 10 Energy', !s.a.s?.lev && s.a.energy <= 5.5, `${s.a.energy}`)
  await reset(400, false, { energy: 40 }); await page.keyboard.down('p'); await step(60); await page.keyboard.up('p'); s = await state()
  ck('holding L2 never recharges Energy for Raven', s.a.energy <= 40 && !s.a.charging, `${s.a.energy}`)
  // ── P4 normals: authored frame data ──
  const expect = { light: [5, 17], rJ2: [7, 21], rJ3: [10, 28], heavy: [14, 52], rLow: [8, 24], up: [12, 40], air: [8, 29] }
  for (const [k, [st, raw]] of Object.entries(expect)) { const md = D.moves[k]; ck(`${k}: ${st} f startup, raw ${raw} (stored ${sc(raw)})`, md.startup === st && md.raw === raw && md.damage === sc(raw), JSON.stringify(md)) }
  await reset(80); await tap(['j'], 1); m = await moveInfo(); report.moves.light = m
  ck('Light starts the real light with activeStart 5', m?.name === 'light' && m.activeStart === 5, JSON.stringify(m))
  r = await measure('J1 → J2 → J3', async M => { await M.press(['j']); await M.until(q => q.a.attack?.rv?.clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'rJ2' && q.a.attack?.rv?.clean, 40); await M.press(['j']) })
  ck('J chain lands three hits as a true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  r = await measure('Forward+Heavy chain', async M => { await M.press(['d', 'k']); await M.until(q => q.a.attack?.rv?.clean, 40); await M.press(['k']); await M.until(q => q.a.attack?.name === 'rDark' && q.a.attack?.rv?.clean, 40); await M.press(['k']) }, { gap: 110 })
  ck('Forward+Heavy → Heavy → Heavy = three steps (advance / dark strike / knock-away)', r.hits.length === 3, JSON.stringify(r))
  await reset(80); await tap(['s', 'j'], 1); m = await moveInfo(); ck('Down+Light = Low Ground Check', m?.name === 'rLow', JSON.stringify(m)); await idle()
  await tap(['i'], 1); m = await moveInfo(); ck('Up-attack = Rising Palm launcher', m?.name === 'up', JSON.stringify(m)); await idle()
  // ── P5 Dark Pulse ──
  await reset(400); const e0 = (await state()).a.energy; await tap(['l'], 1); m = await moveInfo()
  ck('Neutral Special = Dark Pulse, 12 f, −10 Energy', m?.name === 'rPulse' && m.activeStart === 12 && Math.abs((await state()).a.energy - (e0 - 10)) < 0.3, JSON.stringify(m))
  s = await wait(q => q.proj.length > 0, 20); ck('the orb spawns at its authored frame (raw 32)', s.proj[0]?.kind === 'pulse' && s.proj[0].damage === sc(32), JSON.stringify(s.proj))
  await wait(q => !q.a.attack, 60); await tap(['l'], 1); s = await state()
  ck('one orb per Raven: a second Pulse while the first lives is rejected', s.proj.filter(p => p.kind === 'pulse').length === 1 && s.a.attack?.name !== 'rPulse', JSON.stringify(s.proj))
  await reset(400); await tap(['w'], 2); await step(8); await tap(['l'], 1); m = await moveInfo(); s = await state()
  ck('Air Special = Air Dark Pulse (14 f, −12)', m?.name === 'rAirPulse' && m.activeStart === 14 && Math.abs(s.a.energy - 88) < 0.2, JSON.stringify(m))
  await wait(q => !q.a.attack, 40); await tap(['l'], 1); m = await moveInfo(); ck('Air Dark Pulse once per airtime', m?.name !== 'rAirPulse', JSON.stringify(m)); await idle()
  // ── P6 bricks ──
  await reset(400); await tap(['s', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Down+Special = Lift the Room (20 f, −18)', m?.name === 'rLift' && m.activeStart === 20 && Math.abs(s.a.energy - 82) < 0.3, JSON.stringify(m))
  s = await wait(q => (q.a.s?.piles?.length || 0) === 2, 40); const P = s.a.s.piles, cx = s.a.x + s.a.w / 2
  ck('two piles at ±80 px', P.length === 2 && P.some(p => Math.abs(p.x - (cx + 80)) < 2) && P.some(p => Math.abs(p.x - (cx - 80)) < 2), JSON.stringify(P.map(p => p.x - cx)))
  ck('HUD: 2 idle piles, 0 free slots', s.hud.piles === 2 && s.hud.slots === 0, JSON.stringify(s.hud))
  await idle(); const eL = (await state()).a.energy; await tap(['s', 'l'], 1); s = await state()
  ck('recasting Lift while piles exist is rejected (no spend)', s.a.attack?.name !== 'rLift' && s.a.energy > eL - 1 && s.a.s.lastReject === 'pilesExist', `${s.a.energy} ${s.a.s.lastReject}`); await idle()
  const eS = (await state()).a.energy; await tap(['d', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Forward+Special with an idle pile = Send (10 f, −8)', m?.name === 'rSend' && m.activeStart === 10 && Math.abs(s.a.energy - (eS - 8)) < 0.3, JSON.stringify(m))
  s = await wait(q => q.proj.some(p => p.kind === 'send'), 20); ck('the nearest pile is thrown as a raw-46 brick; one pile remains', s.proj.find(p => p.kind === 'send')?.damage === sc(46) && s.a.s.piles.length === 1, JSON.stringify(s.proj))
  ck('pile cap holds: piles + launched bricks ≤ 2', s.a.s.piles.length + s.proj.filter(p => p.kind !== 'pulse').length <= 2)
  await idle(); await wait(q => !q.proj.length, 120)
  // expiry
  s = await wait(q => !q.a.s?.piles?.length, 220); ck('idle piles expire after their 180 f life', !s.a.s.piles.length && s.a.s.stats.pilesExpired >= 1, JSON.stringify(s.a.s.stats))
  await reset(400); const eC = (await state()).a.energy; await tap(['d', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Forward+Special with no pile = Conjure (20 f, −18)', m?.name === 'rConjure' && m.activeStart === 20 && Math.abs(s.a.energy - (eC - 18)) < 0.3, JSON.stringify(m))
  // hostile break: P2 swings into a pile
  await reset(150); await tap(['s', 'l'], 1); await wait(q => q.a.s?.piles?.length === 2, 40); await idle()
  await S("H.move('light','p2')"); s = await wait(q => (q.a.s?.piles?.length || 0) < 2, 30)
  ck('one hostile attack breaks exactly one pile', s.a.s.piles.length === 1 && s.a.s.stats.pilesBroken === 1, JSON.stringify(s.a.s.stats))
  // Falling Verdict
  await reset(160); const yV = (await state()).a.y; await tap(['w', 'l'], 1); await step(1); m = await moveInfo(); s = await state()
  ck('Up+Special = Falling Verdict (24 f), −25 with no pile, and NO jump', m?.name === 'rVerdict' && m.activeStart === 24 && Math.abs(s.a.energy - 75) < 0.3 && s.a.y === yV && s.a.jumpCount === 0, JSON.stringify({ m, e: s.a.energy, dy: s.a.y - yV, jc: s.a.jumpCount }))
  const col = s.a.s.verdict?.col, ahead = col - (s.a.x + s.a.w / 2); report.spells.verdictAhead = ahead
  ck('the Verdict column is captured ahead, ≤ 220 px', ahead > 0 && ahead <= 220, `${ahead}`)
  r = { hpB: s.b.hp }; s = await wait(q => q.proj.some(p => p.kind === 'verdict'), 40)
  ck('the brick drops from above (raw 54)', s.proj.find(p => p.kind === 'verdict')?.damage === sc(54), JSON.stringify(s.proj))
  await wait(q => !q.proj.length, 120); s = await state(); report.spells.verdictDmg = r.hpB - s.b.hp
  ck('Falling Verdict hits the standing foe under the column', r.hpB - s.b.hp > 0, `${r.hpB - s.b.hp}`)
  await idle()
  // ── P7 infusion ──
  await reset(400); await tap(['s', 'l'], 1); await wait(q => q.a.s?.piles?.length === 2, 40); await idle()
  await tap(['l'], 1); s = await wait(q => q.proj.some(p => p.kind === 'infused') || q.a.s?.stats?.infusions, 30)
  const inf = s.proj.filter(p => p.kind === 'infused')
  ck('own orb through own idle pile → exactly ONE raw-56 infused brick; orb + pile consumed', inf.length === 1 && inf[0].damage === sc(56) && !s.proj.some(p => p.kind === 'pulse') && s.a.s.piles.length === 1, JSON.stringify({ proj: s.proj, piles: s.a.s.piles.length }))
  await idle(); await wait(q => !q.proj.length, 120)
  r = await measure('Infused brick on hit', async M => { await M.press(['s', 'l']); await M.until(q => q.a.s?.piles?.length === 2, 40); await M.until(q => !q.a.attack, 60); await M.press(['l']) }, { gap: 200 })
  const G = await page.evaluate(async () => (await import('./combat.js')).GLOBAL_DAMAGE_SCALE)
  ck('the infused brick deals ONE raw-56 hit (no stacked orb hit; × shared GLOBAL_DAMAGE_SCALE)', r.hits.length === 1 && Math.abs(r.hits[0] - Math.round(sc(56) * G)) <= 1, JSON.stringify(r))
  // ── P8 Soul Shell ──
  await reset(70); await tap(['a', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Back+Special = Soul Shell (8 f startup, −18)', m?.name === 'rShield' && Math.abs(s.a.energy - 82) < 0.3, JSON.stringify(m))
  await step(9); const hpS = (await state()).a.hp; await S("H.move('light','p2')"); await step(10); s = await state()
  ck('the shell absorbs a frontal hit (no damage, 1 contact)', s.a.hp === hpS && s.a.attack?.rv?.contacts === 1, JSON.stringify({ hp: s.a.hp, rv: s.a.attack?.rv }))
  await tap(['l'], 1); s = await state()
  ck('a fresh Special retap ends the shell early through Shield End and starts the 180 f cooldown', s.a.attack?.rv?.ended && s.a.s.shellCd > 170, JSON.stringify({ rv: s.a.attack?.rv, cd: s.a.s.shellCd }))
  await idle(); await tap(['a', 'l'], 1); s = await state(); ck('shell rejected during cooldown', s.a.attack?.name !== 'rShield', '')
  await reset(70); await tap(['a', 'l'], 1); await step(9); m = await moveInfo()
  const hpB = (await state()).a.hp; await S("(H.raw('p2').x = H.raw().x - 62, H.raw('p2').facing = 1, H.move('light','p2'))"); await step(10); s = await state()
  ck('a hit from BEHIND is not protected', m?.name === 'rShield' && s.a.hp < hpB, `${m?.name} ${hpB} → ${s.a.hp}`)
  await reset(70); await tap(['a', 'l'], 1); await step(9); await S("H.move('light','p2')"); await step(8); await S("(b => { b.attacking=false; b.currentAttack=null; b.attackCooldown=0; return H.move('light','p2') })(H.raw('p2'))"); await step(10); s = await state()
  report.shell = s.a.s?.stats
  ck('the shell breaks after exactly 2 frontal contacts (no damage taken)', s.a.s?.stats?.shellBroken === 1 && s.a.s?.stats?.shellAbsorbed === 2 && s.a.hp === HP, JSON.stringify({ st: s.a.s?.stats, hp: s.a.hp }))
  // ── P9 ultimate ──
  await reset(400); await S("H.raw('p2').x = H.raw().x + 900"); await tap(['u'], 1); m = await moveInfo(); s = await state()
  ck('Ultimate = 30 f opener, −100 Energy', m?.name === 'rUltOpen' && m.activeStart === 30 && s.a.energy < 1, JSON.stringify(m))
  s = await wait(q => !q.a.attack, 200); ck('a whiffed opener ends with 60 f recovery and no cinematic', !s.ult.active && s.a.s.stats.ultWhiffs === 1, JSON.stringify(s.a.s.stats))
  r = await measure('AZARATH', async M => { await M.press(['u']); await M.until(q => q.ult.active, 60); await M.until(q => !q.ult.active, 400) }, { gap: 220 })
  report.ultimate = r
  ck('confirmed ultimate: 4 contacts (opener 30 + 40 + 40 + 160), one cinematic', r.hits.length === 4, JSON.stringify(r))
  s = await state(); ck('after the ultimate: caster restored (not attacking, grounded), cinematic inactive', !s.ult.active && !s.a.attack && s.a.grounded, JSON.stringify({ a: s.a.attack, g: s.a.grounded }))
  await reset(220); await tap(['u'], 1); await wait(q => q.ult.active, 60); await step(50); await S('H.reset()'); await step(1); s = await state()
  ck('reset mid-cinematic restores everything (no stuck pose / hitstun / piles)', !s.ult.active && !s.a.attack && s.b.hitstun === 0 && !s.a.s?.piles?.length && !s.a.s?.lev && !s.a.s?.ult && !s.a.pose, JSON.stringify({ u: s.ult, a: s.a.attack, b: s.b.hitstun }))
  // ── misc ──
  ck('fx image cache is bounded', await S('H.fxCache()') < 60, `${await S('H.fxCache()')}`)
} catch (e) { console.log('ERR', e.stack); fail++ }
report.errors = errors
fs.writeFileSync('docs/raven/mechanics_results.json', JSON.stringify(report, null, 1))
console.log(`\n${pass} passed, ${fail} failed; page errors ${errors.length}`, errors.slice(0, 5))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
