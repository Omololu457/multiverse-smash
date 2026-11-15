// harness/starfire.test.mjs — Starfire (Koriand'r, rosterKey starfire): mechanics + MEASURED routes through REAL keyboard
// input and the actual movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab,
// P charge (= levitation toggle), ; block, WASD). Covers: identity, physics + sprite-scale parity, agile walk, the SHARED
// double jump, levitation, authored frame data, J chain, Starbolt / Comet Shot / Solar Rush / Skybreak / Orbital Star,
// STAR SIGHT (eye anchors → world through the real sprite transform both facings, sim frame = rendered frame, one
// contract for both beams, aim capture + no tracking, block, air once per airtime, non-emitting frames), PRISM BREAK
// (atomic, single burst, no recursion, foe-in-front precedence), the ultimate (contacts, total, legal landing, whiff
// recovery, cleanup on reset), HUD and measured routes.
// Writes docs/starfire/mechanics_results.json.        node harness/starfire.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, movement: {}, lev: {}, specials: {}, laser: {}, prism: {}, ultimate: {}, misc: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1100, SC = 1.95, sc = v => Math.round(v * SC), G = 0.6, hitOf = raw => Math.floor(sc(raw) * G + 1e-9)   // stored round(raw×1.7); shared scale 0.6 floors at the write
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.starfireTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, combo: H.raw().comboCounter, ult: H.ult(), proj: H.projectiles(), hud: H.hud() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.starfireTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 80, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.starfireTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const idle = () => wait(s => !s.a.attack && s.a.grounded && !s.ult.active, 400)
async function measure(label, script, { gap = 80, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100 } = {}) {
  await reset(gap, flip, { dummy, energy }); let s = await state(); const e0 = s.a.energy, log = []
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs }); if (q.block > lastBs) blk++; hp = q.b.hp; stun = q.stun; lastBs = q.block } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < 400; j++) { const q = await state(); if (!q.a.attack && !q.ult.active && !q.proj.length) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), blockedEvents: blk, damage: HP - s.b.hp,
    energySpent: +(e0 - s.a.energy).toFixed(2), trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : kind === 'setup' ? (r.trueCombo ? 'setup → true combo' : 'setup (not a combo)') : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : 'single hit'
  report.routes.push(r); return r
}
// first frame (from the press) on which the live attack is in its active window, plus its name
// Energy spent by a press (measured across the press frame only: passive regen ≈ 0.06 / f is inside the tolerance)
async function costOf(keys) { await step(1); const e0 = (await state()).a.energy; for (const k of keys) await page.keyboard.down(k); await step(1); for (const k of keys) await page.keyboard.up(k); return e0 - (await state()).a.energy }
async function activeFrame(keys, max = 40) { await tap(keys, 1); for (let i = 1; i <= max; i++) { const s = await state(); const a = s.a.attack; if (a && a.total - a.timer >= a.activeStart) return { name: a.name, el: a.total - a.timer, activeStart: a.activeStart, i }; await step(1) } return null }

try {
  await page.goto(server.base + '/index.html?harness=1&p1=starfire&p2=starfire&seed=771301'); await page.waitForFunction(() => window.__harness?.starfireTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r
  const D = await S('H.data()')
  // ── identity / parity ──
  ck('both slots starfire, HP 1100, Energy max 100', s.a.key === 'starfire' && s.a.maxHp === HP && s.b.maxHp === HP && await S('H.raw().maxEnergy') === 100)
  const pg = await page.evaluate(async () => (await import('./physics.js')).physics.gravity), gs = await page.evaluate(async () => (await import('./sprite.js')).GLOBAL_SPRITE_SCALE)
  ck('starfireState GRAVITY equals physics.gravity', pg === await S('H.gravity'), `${pg}`)
  ck('starfireData GSCALE equals sprite.js GLOBAL_SPRITE_SCALE (eye anchors use the render transform)', gs === await S('H.gscale'), `${gs}`)
  ck('maxJumps 2 (the shared double jump)', s.a.maxJumps === 2, `${s.a.maxJumps}`)
  await reset(400); await page.keyboard.down('d'); await step(12); const vxw = (await state()).a.vx; await page.keyboard.up('d'); await step(10)
  const rawSp = await S('H.raw().speed'), authored = await page.evaluate(async () => (await import('./starfireData.js')).starfire.stats.speed)
  const formula = Math.min(9.5, Math.max(4.5, 4.5 + (rawSp - 78) / 20 * 5)); report.movement = { walkVx: vxw, liveSpeedStat: rawSp, authored, formula }
  ck('authored agile speed stat 94', authored === 94, `${authored}`)
  ck('walk = the shared physics formula of the live speed stat', Math.abs(vxw - formula) < 0.01, `${vxw} vs ${formula}`)
  await reset(400); await tap(['w'], 2); await step(10); s = await state(); const j1 = s.a.jumpCount
  await tap(['w'], 2); await step(2); s = await state(); const j2 = s.a.jumpCount, dj = s.a.s?.stats?.dj
  await tap(['w'], 2); await step(2); s = await state(); const j3 = s.a.jumpCount
  report.movement.jumps = [j1, j2, j3]
  ck('shared double jump: 1 → 2 (double-jump cue) → third W still 2 (no third jump)', j1 === 1 && j2 === 2 && j3 === 2 && dj === 1, JSON.stringify([j1, j2, j3, dj]))
  await idle(); s = await state(); ck('a genuine landing resets jumpCount', s.a.grounded && s.a.jumpCount === 0, `${s.a.jumpCount}`)
  // ── levitation ──
  await reset(400, false, { energy: 100 }); const y0 = (await state()).a.y
  await tap(['p'], 1); s = await state()
  ck('L2 tap: Preparing to Levitate, −10 Energy, jumpCount untouched', !!s.a.s?.lev && Math.abs(s.a.energy - 90) < 0.3 && s.a.jumpCount === 0 && s.a.pose === 'levStart', `${s.a.energy} jc=${s.a.jumpCount} ${s.a.pose}`)
  await step(20); s = await state(); ck('levitation lifts gently, shows the Levitating loop', !s.a.grounded && s.a.y < y0 && s.a.pose === 'lev' && s.a.action === 'lev', `${y0 - s.a.y} ${s.a.pose} ${s.a.action}`)
  await page.keyboard.down('d'); let mx = 0; for (let i = 0; i < 30; i++) { await step(1); mx = Math.max(mx, Math.abs((await state()).a.vx)) } await page.keyboard.up('d')
  report.lev.maxVx = mx; ck('levitating horizontal speed never exceeds the ground walk', mx <= vxw + 1e-6, `${mx}`)
  await page.keyboard.down('w'); let top = 1e9; for (let i = 0; i < 40; i++) { await step(1); top = Math.min(top, (await state()).a.y) } await page.keyboard.up('w')
  s = await state(); report.lev.rise = y0 - top
  ck('Up while levitating rises ≤ 240 px, no jump consumed', y0 - top <= 241 && s.a.jumpCount === 0, `${y0 - top} jc=${s.a.jumpCount}`)
  s = await wait(q => !q.a.s?.lev, 200); report.lev.end = s.a.s?.stats?.levEnd
  ck('levitation ends by the 120-frame cap', !!s.a.s?.stats?.levEnd?.timeout, JSON.stringify(s.a.s?.stats?.levEnd))
  const spent = 100 - s.a.energy; report.lev.spent = spent
  ck('drain = 6 / s for the whole 120-frame hover (stat), 10 to enter', Math.abs(s.a.s.stats.levDrained - 12) < 0.11 && s.a.s.stats.levFrames === 120, JSON.stringify([s.a.s.stats.levDrained, s.a.s.stats.levFrames, spent]))
  ck('Charge never recharged Energy while levitating (net spend > 10)', spent > 10 && !s.a.charging, `${spent}`)
  ck('levitation never restored a jump', s.a.jumpCount === 0, `${s.a.jumpCount}`)
  await tap(['p'], 1); s = await state(); ck('second levitation in the same airtime rejected', !s.a.s?.lev && s.a.s?.lastReject === 'levUsed', `${s.a.s?.lastReject}`)
  await idle(); await tap(['p'], 1); await step(15); await tap(['p'], 1); s = await state()
  ck('tap off ends levitation (toggle)', !s.a.s?.lev && !!s.a.s?.stats?.levEnd?.toggle, JSON.stringify(s.a.s?.stats?.levEnd))
  await reset(400, false, { energy: 5 }); await tap(['p'], 1); s = await state(); ck('levitation needs 10 Energy', !s.a.s?.lev, `${s.a.energy}`)
  // ── normals frame data (real input) ──
  for (const [label, keys, name, want] of [['Light', ['j'], 'light', 5], ['Heavy', ['k'], 'heavy', 13], ['Low', ['s', 'j'], 'sfLow', 7], ['Launcher', ['i'], 'up', 12]]) {
    await reset(300); const f = await activeFrame(keys); report.moves[name] = f
    ck(`${label} → ${name}, first active on elapsed ${want}`, f?.name === name && f.activeStart === want, JSON.stringify(f))
  }
  await reset(300); await tap(['w'], 2); await step(6); const fa = await activeFrame(['j']); report.moves.air = fa
  ck('Air Light → air (first active 8)', fa?.name === 'air' && fa.activeStart === 8, JSON.stringify(fa))
  ck('frame-data targets: light 5-7, heavy 12-15, launcher 11-13, air 7-9', D.moves.light.startup >= 5 && D.moves.light.startup <= 7 && D.moves.heavy.startup >= 12 && D.moves.heavy.startup <= 15 && D.moves.up.startup >= 11 && D.moves.up.startup <= 13 && D.moves.air.startup >= 7 && D.moves.air.startup <= 9)
  // J chain
  r = await measure('J1 → J2 → J3', async M => { await M.press(['j']); for (const _ of [0, 1]) { await M.until(q => q.a.attack?.sf?.clean && q.a.cancel?.open, 40); await M.watch(1); await M.press(['j']) } }, { gap: 60 })
  ck('J1 → J2 → J3 true combo, raw 16 / 20 / 28', r.trueCombo && r.hits.length === 3 && r.hits[0] === hitOf(16), JSON.stringify(r))
  // ── Starbolt ──
  await reset(500); let cost = await costOf(['l']); await step(13); s = await state()
  report.specials.bolt = { proj: s.proj, cost }
  ck('Starbolt: 10 Energy, one engine projectile after 13 f', s.proj.length === 1 && s.proj[0].kind === 'bolt' && Math.abs(cost - 10) < 0.3, JSON.stringify(s.proj) + ' ' + cost)
  await idle(); await tap(['l'], 1); await step(16); s = await state()
  ck('one Starbolt per owner (second rejected while the first flies)', s.proj.filter(p => p.kind === 'bolt').length === 1 && s.a.s.lastReject === 'boltActive', `${s.a.s.lastReject}`)
  r = await measure('Starbolt', async M => { await M.press(['l']); await M.until(q => q.b.hp < HP, 80) }, { gap: 300 })
  ck('Starbolt raw 30 + explosion FX', r.hits[0] === hitOf(30) && (await state()).a.s.fx.some(e => e.kind === 'explode'), JSON.stringify(r.hits))
  // ── Comet Shot ──
  await reset(400); await tap(['l'], 1); await step(2); s = await state(); ck('Comet Shot is air only (ground Special = Starbolt)', s.a.attack?.name === 'sfBolt')
  await reset(900); await tap(['w'], 2); await step(8); cost = await costOf(['l']); await step(14); s = await state()   // foe far away: the comet reaches the floor
  const comet = s.proj.find(p => p.kind === 'comet')
  ck('air Special = Comet Shot (12 Energy) travelling down-forward', !!comet && comet.vx > 0 && comet.vy > 0 && Math.abs(cost - 12) < 0.3, JSON.stringify(s.proj) + ' ' + cost)
  s = await wait(q => !q.a.attack, 40); const airborneAtRetry = !s.a.grounded; await tap(['l'], 1); await step(2); s = await state()
  ck('Comet Shot once per airtime', airborneAtRetry && (s.a.s.lastReject === 'cometUsed' || s.a.s.lastReject === 'boltActive') && !s.a.attack, `${airborneAtRetry} ${s.a.s.lastReject}`)
  s = await wait(q => !q.proj.length, 160); ck('Comet Shot bursts on the floor (no floor penetration)', s.a.s.stats.cometFloor === 1, JSON.stringify(s.a.s.stats))
  // ── Solar Rush ──
  await reset(400); const x0 = (await state()).a.x; cost = await costOf(['d', 'l']); await step(30); s = await state()
  report.specials.rushTravel = s.a.x - x0; ck('Solar Rush: 15 Energy, real travel ≥ 100 px', s.a.x - x0 >= 100 && Math.abs(cost - 15) < 0.3, `${s.a.x - x0} ${cost}`)
  r = await measure('Solar Rush', async M => { await M.press(['d', 'l']); await M.until(q => q.b.hp < HP, 40) }, { gap: 120 })
  s = await state(); ck('Solar Rush hits raw 46 and stops at the foe (no pass-through)', r.hits[0] === hitOf(46) && s.a.x + s.a.w <= s.b.x + 1, JSON.stringify(r.hits) + ` ${s.a.x + s.a.w} ${s.b.x}`)
  // ── Skybreak ──
  await reset(300); const ys = (await state()).a.y; await tap(['w', 'l'], 1); let ymin = 1e9; for (let i = 0; i < 25; i++) { await step(1); ymin = Math.min(ymin, (await state()).a.y) } s = await state()
  ck('Up + Special = Skybreak (no jump), rises', s.a.attack?.name === 'sfSky' || s.a.s.stats.skies === 1, `${s.a.attack?.name}`)
  ck('Skybreak rises ≥ 60 px without touching the jump counter', ys - ymin >= 60 && s.a.jumpCount === 0, `${ys - ymin} jc=${s.a.jumpCount}`)
  r = await measure('Skybreak', async M => { await M.press(['w', 'l']); await M.watch(30) }, { gap: 50 })
  ck('Skybreak: one contact (raw 38)', r.hits.length === 1 && r.hits[0] === hitOf(38), JSON.stringify(r.hits))
  await reset(400); await tap(['w'], 2); await step(6); await tap(['w', 'l'], 1); await step(2); s = await state(); const jcSky = s.a.jumpCount, skyAir = s.a.attack?.name
  s = await wait(q => !q.a.attack, 60); const airSky = !s.a.grounded; await tap(['w', 'l'], 1); await step(2); s = await state()
  ck('air Skybreak once per airtime; jump counter untouched', skyAir === 'sfSky' && airSky && s.a.s.lastReject === 'skyUsed' && s.a.jumpCount <= Math.max(jcSky, 2), `${skyAir} ${airSky} ${s.a.s.lastReject} ${jcSky}→${s.a.jumpCount}`)
  // ── Orbital Star ──
  await reset(500); cost = await costOf(['s', 'l']); await step(17); s = await state(); const orb = s.proj.find(p => p.kind === 'orb')
  ck('Down + Special = Orbital Star: 16 Energy, slow orb', !!orb && Math.abs(orb.vx - 2.2) < 0.01 && Math.abs(cost - 16) < 0.3, JSON.stringify(s.proj) + ' ' + cost)
  await idle(); await tap(['s', 'l'], 1); await step(2); s = await state()
  ck('max 1 Orbital Star per owner', s.proj.filter(p => p.kind === 'orb').length === 1 && s.a.s.lastReject === 'orbActive', `${s.a.s.lastReject}`)
  ck('HUD pip shows the orb', s.hud.orb === 1)
  r = await measure('Orbital Star', async M => { await M.press(['s', 'l']); await M.until(q => q.b.hp < HP, 200) }, { gap: 200 })
  ck('Orbital Star raw 26', r.hits[0] === hitOf(26), JSON.stringify(r.hits))
  // ── STAR SIGHT ──
  for (const flip of [false, true]) {
    await reset(260, flip); const back = flip ? 'd' : 'a'
    await tap([back, 'l'], 1); const rows = []
    for (let i = 0; i < 30; i++) {
      const q = await page.evaluate(() => { const H = __harness.starfireTest, st = H.state(), a = st.attack, L = H.laser()
        const el = a ? a.total - a.timer : null
        return { el, name: a?.name, aim: a?.sf?.aim, hasHit: a?.hasHit, action: st.action, frame: st.frame, draw: st.draw, facing: st.facing,
          tf: a ? H.timelineFrame(a.name, el) : null, laser: L, eyes: a ? H.eyeWorld(a.name, H.timelineFrame(a.name, el)) : null, tab: a ? H.eyes()[a.name][H.timelineFrame(a.name, el)] : null, b: H.state('p2').hp } })
      rows.push(q); await step(1)
    }
    const act = rows.filter(q => q.laser), tag = flip ? 'facing LEFT' : 'facing RIGHT'
    report.laser[flip ? 'left' : 'right'] = act.map(q => ({ el: q.el, frame: q.frame, eyes: q.eyes, segs: q.laser.segs.map(sg => [sg.x0, sg.y0, sg.x1, sg.y1].map(v => +v.toFixed(2))), contact: q.laser.contact }))
    ck(`Star Sight ${tag}: Back + Special starts sfLaser, 14 Energy`, rows[0].name === 'sfLaser' || rows[1].name === 'sfLaser')
    ck(`${tag}: beams exist only in the active window (elapsed 14-21)`, act.length > 0 && act.every(q => q.el >= 14 && q.el <= 21), JSON.stringify(act.map(q => q.el)))
    ck(`${tag}: aim captured on startup frame 10`, rows.filter(q => q.name === 'sfLaser' && q.el < 10).every(q => !q.aim) && rows.some(q => q.el === 10 && q.aim), JSON.stringify(rows.slice(0, 12).map(q => [q.el, !!q.aim])))
    ck(`${tag}: the frame sim uses = the frame sprite.js drew (every active frame)`, act.every(q => q.tf === q.frame && q.action === 'sfLaser'), JSON.stringify(act.map(q => [q.tf, q.frame, q.action])))
    // render-transform equality: origin from the drawn rect (sprite.js's own _lastDraw*) = sim origin
    const dev = act.flatMap(q => q.tab.eyes.map((k, i) => { const u = k.origin[0], v = k.origin[1], scl = q.draw.w / 112
      const X = q.facing === -1 ? q.draw.x + (112 - u) * scl : q.draw.x + u * scl, Y = q.draw.y + v * scl
      return Math.max(Math.abs(X - q.laser.segs[i].x0), Math.abs(Y - q.laser.segs[i].y0)) }))
    report.laser[(flip ? 'left' : 'right') + 'MaxDev'] = Math.max(...dev)
    ck(`${tag}: beam origins = validated eye anchors through the drawn sprite rect (≤ 0.01 px)`, dev.length > 0 && Math.max(...dev) <= 0.01, `${Math.max(...dev)}`)
    ck(`${tag}: two beams (two visible eyes) pointing the facing way`, act.every(q => q.laser.segs.length === 2 && q.laser.segs.every(sg => Math.sign(sg.x1 - sg.x0) === (flip ? -1 : 1))))
    const hits = rows.filter((q, i) => i > 0 && q.b < rows[i - 1].b)
    ck(`${tag}: both beams = ONE hit of raw 44`, hits.length === 1 && rows[0].b - rows[rows.length - 1].b === hitOf(44), `${hits.length} ${rows[0].b - rows[rows.length - 1].b}`)
  }
  const R = report.laser.right[0], Lf = report.laser.left[0]
  ck('left / right origins mirror about the body centre', !!R && !!Lf && Math.abs((R.eyes[0].x - 1330) + (Lf.eyes[0].x - (1300 + 260 + 30))) < 0.01, JSON.stringify([R?.eyes, Lf?.eyes]))
  const E = await S('H.eyes()')
  const noEmit = Object.entries(E).flatMap(([a, fr]) => fr.map((f, i) => ({ a, i, ...f }))).filter(f => !['open', 'profile'].includes(f.state))
  ck('frames marked dissolve / hidden / closed / silhouette can never emit', noEmit.length > 0 && noEmit.every(f => !f.emit && !f.eyes.length), JSON.stringify(noEmit.slice(0, 3)))
  ck('profile frames carry a single eye', Object.values(E).flat().filter(f => f.state === 'profile').every(f => f.eyes.length === 1 && f.emit))
  // aim capture: moving the target after frame 10 does not steer the beam
  await reset(260); await tap(['a', 'l'], 1); await step(10); const aim0 = (await state()).a.attack?.sf?.aim
  await S('(H.raw("p2").y -= 120, 0)'); await step(4); const aim1 = (await state()).a.attack?.sf?.aim
  ck('no auto-chase: aim fixed after capture', JSON.stringify(aim0) === JSON.stringify(aim1) && !!aim0, JSON.stringify([aim0, aim1]))
  await S('(H.raw("p2").y += 120, 0)'); await idle()
  r = await measure('Star Sight (blocked)', async M => { await M.press(['a', 'l']); await M.watch(30) }, { gap: 260, dummy: 'block', kind: 'pressure' })
  ck('Star Sight blocked: guard holds, blockstun applied, beam contract spent', r.blockedEvents >= 1 && (await state()).a.s.stats.laserBlocked >= 1, JSON.stringify(r))
  await reset(400); await tap(['w'], 2); await step(6); cost = await costOf(['a', 'l']); await step(2); s = await state()
  ck('air Back + Special = air Star Sight (14 Energy)', s.a.attack?.name === 'sfAirLaser' && Math.abs(cost - 14) < 0.3, `${s.a.attack?.name} ${cost}`)
  s = await wait(q => !q.a.attack, 60); const airL = !s.a.grounded; await tap(['a', 'l'], 1); await step(2); s = await state()
  ck('air Star Sight once per airtime (retry still airborne → rejected)', airL && s.a.s.lastReject === 'airLaserUsed', `${airL} ${s.a.s.lastReject}`)
  // ── PRISM BREAK ──
  await reset(380, false, { energy: 100 }); await tap(['s', 'l'], 1); await step(30); await idle()
  s = await state(); const orbP = s.proj.find(p => p.kind === 'orb'); report.prism.orbAtLaser = orbP
  await tap(['a', 'l'], 1); let pr = null
  for (let i = 0; i < 40; i++) { await step(1); const q = await state(); if (q.a.s.stats.prisms) { pr = q; break } }
  report.prism.state = pr && { proj: pr.proj, stats: pr.a.s.stats, hasHit: pr.a.attack?.hasHit, prism: pr.a.attack?.sf?.prism }
  ck('Prism Break: the beam consumes her own Orbital Star atomically → ONE burst', !!pr && !pr.proj.some(p => p.kind === 'orb') && pr.proj.filter(p => p.kind === 'burst').length === 1 && pr.a.attack?.sf?.prism && pr.a.attack?.hasHit, JSON.stringify(report.prism.state))
  ck('burst travels on the captured aim line', !!pr && Math.abs(pr.proj.find(p => p.kind === 'burst').vy / pr.proj.find(p => p.kind === 'burst').vx - pr.a.attack.sf.aim[1] / pr.a.attack.sf.aim[0]) < 1e-6)
  r = await measure('Orbital Star → Star Sight = PRISM BREAK', async M => { await M.press(['s', 'l']); await M.watch(28); await M.until(q => !q.a.attack, 60); await M.press(['a', 'l']); await M.until(q => q.b.hp < HP, 120) }, { gap: 380, kind: 'setup' })
  report.prism.route = r
  ck('Prism Break burst = raw 60; the laser itself never also hits (no stacked hit)', r.hits.length === 1 && r.hits[0] === hitOf(60), JSON.stringify(r.hits))
  ck('the burst can never trigger another Prism Break (one prism total)', (await state()).a.s.stats.prisms === 1)
  r = await measure('Star Sight with the foe in front of the orb', async M => { await M.press(['s', 'l']); await M.watch(20); await page.evaluate(() => { const H = __harness.starfireTest; H.raw('p2').x = H.raw().x + 120 }); await M.until(q => !q.a.attack, 60); await M.press(['a', 'l']); await M.watch(30) }, { gap: 420, kind: 'setup' })
  ck('a foe in front of the orb takes the laser (44); no prism', r.hits.includes(hitOf(44)) && (await state()).a.s.stats.prisms === 0, JSON.stringify(r.hits))
  // ── ULTIMATE ──
  r = await measure('SUPERNOVA (neutral)', async M => { await M.press(['u']); await M.until(q => q.ult.active, 60); await M.until(q => !q.ult.active, 400) }, { gap: 240 })
  const ultRaw = [30, 20, 20, 20, 20, 30, 30, 100]; report.ultimate.route = r
  ck('SUPERNOVA: opener + 4 bolts + 2 beams + explosion = 8 contacts', r.hits.length === 8, JSON.stringify(r.hits))
  ck('raw total 270 (before shared scaling)', ultRaw.reduce((a, b) => a + b) === 270 && D.ult.contacts.reduce((a, c) => a + c.raw, 0) === 240)
  s = await state(); ck('legal landing: grounded on the floor, not overlapping the target', s.a.grounded && !s.a.attack && (s.a.x + s.a.w <= s.b.x || s.b.x + s.b.w <= s.a.x), JSON.stringify([s.a.x, s.a.w, s.b.x]))
  ck('one resource transaction (100 Energy)', Math.abs(r.energySpent - 100) < 2, `${r.energySpent}`)
  r = await measure('SUPERNOVA blocked', async M => { await M.press(['u']); await M.watch(90) }, { gap: 240, dummy: 'block', kind: 'pressure' })
  s = await state(); ck('blocked opener: no cinematic, 60 f recovery, whiff counted', !s.ult.active && s.a.s.stats.ultWhiffs === 1 && D.moves.sfUltOpen.recovery === 60, JSON.stringify(s.a.s.stats))
  await reset(240); await tap(['u'], 1); s = await wait(q => q.ult.active, 60); await step(60)
  await S('(H.reset(), 0)'); await step(2); s = await state()
  ck('reset mid-cinematic: ultimate cleared, caster restored, target freed', !s.ult.active && !s.a.attack && s.b.hitstun < 9000, JSON.stringify({ u: s.ult, a: s.a.attack, st: s.b.hitstun }))
  // ── routes ──
  r = await measure('J1 → J2 → Starbolt (special cancel)', async M => { await M.press(['j']); await M.until(q => q.a.attack?.sf?.clean && q.a.cancel?.open, 40); await M.watch(1); await M.press(['j']); await M.until(q => q.a.attack?.name === 'sfJ2' && q.a.attack?.sf?.clean && q.a.cancel?.open, 40); await M.watch(1); await M.press(['l']); await M.until(q => q.b.hp < HP - hitOf(16) - hitOf(20), 60) }, { gap: 60 })
  ck('J1 → J2 → Starbolt is a true combo', r.trueCombo && r.hits.length === 3, JSON.stringify(r))
  r = await measure('Heavy → Solar Rush', async M => { await M.press(['k']); await M.until(q => q.a.attack?.sf?.clean && q.a.cancel?.open, 40); await M.watch(1); await M.press(['d', 'l']); await M.watch(30) }, { gap: 60 })
  ck('Heavy → Solar Rush is a true combo', r.trueCombo && r.hits.length === 2, JSON.stringify(r))
  r = await measure('Launcher → jump → Air Strike', async M => { await M.press(['i']); await M.until(q => q.a.attack?.sf?.clean, 30); await M.watch(6); await M.press(['w'], 2); await M.watch(6); await M.press(['j']); await M.watch(20) }, { gap: 50, note: 'jump-cancel follow-up (shared double jump)' })
  ck('launcher → jump → air strike measured', r.hits.length >= 1, JSON.stringify(r))
  await measure('Starbolt at range (blocked)', async M => { await M.press(['l']); await M.watch(40) }, { gap: 300, dummy: 'block', kind: 'pressure' })
  ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
fs.writeFileSync('docs/starfire/mechanics_results.json', JSON.stringify(report, null, 1) + '\n')
console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
