// harness/omniman_viltrum_moves.test.mjs — MSV1-OMNIMAN Phase 3: the moveset through REAL keyboard input and the live
// engine (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge, ; block, WASD; P1 faces right).
// Sections: normals · specials · unimpressed · decree · think · escape · gojo. Writes docs/msv1/omniman/moves_results.json.
//   node harness/omniman_viltrum_moves.test.mjs [--only=normals,specials,unimpressed,decree,think,escape,gojo]
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const want = k => !ONLY.length || ONLY.includes(k)
const server = await serve(), browser = await chromium.launch({ headless: true })
let page, pass = 0, fail = 0; const errors = [], R = {}
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, d) }
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.omnimanViltrumTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
const st = (w = 'p1') => S('H.state(a)', w)
async function hold(keys, n) { for (const k of keys) await page.keyboard.down(k); await step(n); for (const k of keys) await page.keyboard.up(k) }
const tap = (keys, n = 2) => hold(keys, n)
// a motion rolled the way a keyboard player rolls it: each step presses the new keys and releases the ones it drops
// (↓ → ↓+→ → →: → is never released in between, so no double-tap dash), 2 frames per step; the button on the last step
async function motion(dirs, btn, holdBtn = 2) {
  const held = new Set()
  for (let i = 0; i < dirs.length; i++) {
    const want = new Set(dirs[i])
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k) }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k) }
    await step(i === dirs.length - 1 ? 1 : 2)
  }
  await page.keyboard.down(btn); await step(holdBtn); await page.keyboard.up(btn); for (const k of held) await page.keyboard.up(k)
}
const QCF = [['s'], ['s', 'd'], ['d']], DP = [['d'], ['s'], ['s', 'd']], QCB = [['s'], ['s', 'a'], ['a']], DD = [['s'], [], ['s']]
async function boot(p2) {
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + `/index.html?harness=1&p1=omniman_viltrum&p2=${p2}&seed=40517`); await page.waitForFunction(() => window.__harness?.omnimanViltrumTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await step(3)
}
async function reset(o = {}) {
  await page.evaluate(o => { const H = __harness.omnimanViltrumTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = o.x ?? 1300; b.x = o.bx ?? (a.x + (o.gap ?? 80)); a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? f.maxEnergy; f.comboCounter = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f.isBlocking = false
      f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f._forceGuard = false; f.ultimateCooldown = 0 } }, o)
  await step(2)
}
const idle = async (max = 200) => { for (let i = 0; i < max; i++) { const s = await st(); if (!s.attack && !s.s?.rush && !s.s?.hold && !s.s?.ev && !s.hitstop) return i; await step(1) } return max }
const foeHp = async () => (await st('p2')).hp
const ghost = () => page.evaluate(() => { const g = __harness.omnimanViltrumTest.raw('p2'); g.invulnTimer = 999; g.y -= 700; g.vy = 0; g.onGround = false; g.grounded = false })   // intangible + lifted out of his path (body push-boxes need vertical overlap): nothing to hit

try {
  await boot('homelander')
  const D = await S('H.data()')
  R.frames = Object.fromEntries(['kJab', 'kStraight', 'kHay', 'kLow', 'kKick', 'kAir'].map(k => [k, { raw: D.moves[k].raw, startup: D.moves[k].startup, active: D.moves[k].active, recovery: D.moves[k].recovery, damageType: D.moves[k].damageType }]))
  ck('every move is tagged with a damageType', Object.values(D.moves).every(m => !!m.damageType), JSON.stringify(Object.entries(D.moves).filter(([, m]) => !m.damageType).map(([k]) => k)))
  ck('normals: Jab 38 / 5f, Straight 60 / 8f, Haymaker 96 / 14f, Low 46, Kick 70, Flight punch 64',
    D.moves.kJab.raw === 38 && D.moves.kJab.startup === 5 && D.moves.kStraight.raw === 60 && D.moves.kStraight.startup === 8 && D.moves.kHay.raw === 96 && D.moves.kHay.startup === 14 &&
    D.moves.kLow.raw === 46 && D.moves.kKick.raw === 70 && D.moves.kAir.raw === 64 && D.moves.kHay.wallBounce === true, JSON.stringify(R.frames))

  if (want('normals')) {
    const N = R.normals = {}
    const one = async (keys, name, o = {}) => { await reset({ gap: o.gap ?? 70 }); const h0 = await foeHp(); let first = null
      for (const k of keys) await page.keyboard.down(k); await step(1); for (const k of keys) await page.keyboard.up(k)
      for (let i = 1; i < 40; i++) { if ((await foeHp()) < h0) { first = i; break } await step(1) }
      await step(20); N[name] = { lost: h0 - await foeHp(), hitFrame: first }; return N[name] }
    let r = await one(['j'], 'jab'); ck('Jab (J): 38, connects ≈ frame 5–6', r.lost === 38 && r.hitFrame >= 4 && r.hitFrame <= 7, JSON.stringify(r))
    r = await one(['k'], 'haymaker'); ck('Haymaker (K): 96, ≈ frame 14', r.lost >= 92 && r.lost <= 100 && r.hitFrame >= 13 && r.hitFrame <= 16, JSON.stringify(r))
    r = await one(['s', 'j'], 'low'); ck('Low (↓+J): 46', r.lost >= 43 && r.lost <= 49, JSON.stringify(r))
    r = await one(['i'], 'kick'); ck('Kick (I): 70', r.lost >= 66 && r.lost <= 74, JSON.stringify(r))
    // Jab → Straight chain on contact
    await reset({ gap: 70 }); let h0 = await foeHp(); await tap(['j'], 1); for (let i = 0; i < 7; i++) { await step(1) } await tap(['j'], 1); await step(30)
    N.jabStraight = h0 - await foeHp(); ck('Jab → Straight chain (J, J on contact): ≈ 98 before scaling', N.jabStraight >= 85, String(N.jabStraight))
    // Haymaker wall bounce: foe near the right wall
    const SW = await S('H.stage()'); await reset({ x: SW - 260, gap: 70 })
    await tap(['k'], 1); let splat = false; for (let i = 0; i < 50; i++) { await step(1); const f = await st('p2'); if (f.wallSplat > 0) { splat = true; break } }
    N.hayWall = splat; ck('Haymaker wall-bounces a foe it sends into the wall', splat, JSON.stringify(await st('p2')).slice(0, 160))
  }

  if (want('specials')) {
    const P = R.specials = {}; let me0
    // BLITZ tap: 90
    await reset({ gap: 400 }); let h0 = await foeHp(), x0 = (await st()).x
    await motion(QCF, 'l', 1); await step(30); P.blitzTap = { lost: h0 - await foeHp(), moved: Math.round((await st()).x - x0) }
    ck('Blitz (↓↘→+L) rushes in and hits for 90', P.blitzTap.lost >= 86 && P.blitzTap.lost <= 94, JSON.stringify(P.blitzTap))
    // BLITZ whiff distances: foe BEHIND him → no contact; tap ≈ 50 %, hold ≈ 80 % (+ overshoot skid)
    await reset({ gap: 300 }); await ghost(); x0 = (await st()).x; await motion(QCF, 'l', 1); await idle(); me0 = await st(); P.whiffTap = { moved: Math.round(me0.x - x0), planned: me0.s?.stats.lastRushDist, hits: me0.s?.stats.blitzHits }
    await reset({ gap: 300 }); await ghost(); await motion(QCF, 'l', 14); await step(10); P.whiffHold = { planned: (await st()).s?.stats.lastRushDist }; await idle()
    ck('… tap = 50 % of the screen (640 planned; travels ≥ 640 incl. the skid unless the camera edge stops him; passes through an intangible foe)', P.whiffTap.planned === 640 && P.whiffTap.moved >= 560 && P.whiffTap.hits === 0, JSON.stringify(P.whiffTap))
    ck('… hold = 80 % of the screen (1024 planned)', P.whiffHold.planned === 1024, JSON.stringify(P.whiffHold))
    // SKY HOOK: 80, launches, then he is flying
    await reset({ gap: 70 }); h0 = await foeHp(); await motion(DP, 'l', 1); let launched = false
    for (let i = 0; i < 30; i++) { await step(1); if ((await st('p2')).vy < -5) launched = true }
    await step(10); let me = await st(); P.skyHook = { lost: h0 - await foeHp(), launched, flying: me.flying }
    ck('Sky Hook (→↓↘+L): 80 and launches', P.skyHook.lost >= 76 && P.skyHook.lost <= 84 && launched, JSON.stringify(P.skyHook))
    ck('… then auto-flight', me.flying, JSON.stringify(me.flight))
    // METEOR DROP: from the air above the foe; 70 OTG shockwave (+ body hit on the way down)
    await reset({ gap: 40 }); await tap(['p'], 3); await step(12); await S('H.place(1300, 160)'); h0 = await foeHp()
    await hold(['s', 'l'], 2); for (let i = 0; i < 40; i++) { await step(1); if ((await st()).grounded) break } await step(10)
    me = await st(); P.meteor = { lost: h0 - await foeHp(), grounded: me.grounded, flying: me.flying }
    ck('Meteor Drop (air ↓+L): dives and the landing shockwave hits (≥ 70)', P.meteor.lost >= 66 && me.grounded && !me.flying, JSON.stringify(P.meteor))
    // meteor whiff = 30 f recovery
    await reset({ x: 600, bx: 2000 }); await tap(['p'], 3); await step(12); await S('H.place(600, 200)')
    await hold(['s', 'l'], 2); let landAt = null, freeAt = null
    for (let i = 0; i < 90; i++) { await step(1); const q = await st(); if (landAt == null && q.grounded) landAt = i; if (landAt != null && !q.attack) { freeAt = i; break } }
    P.meteorWhiff = { recovery: freeAt != null && landAt != null ? freeAt - landAt : null }
    ck('… whiff (nobody near) = ≈ 30-frame recovery', P.meteorWhiff.recovery >= 26 && P.meteorWhiff.recovery <= 34, JSON.stringify(P.meteorWhiff))
    // FACE IN THE DIRT: grab, drag ≈ 40 % of the screen, throw into the wall (110)
    await reset({ x: 600, gap: 50 }); h0 = await foeHp(); const fx0 = (await st('p2')).x
    await motion(QCB.map(d => d.map(k => k === 'a' ? 'a' : k)), 'l', 1)
    let held = false; for (let i = 0; i < 50; i++) { await step(1); const f = await st('p2'); if (f.held != null) held = true; if (held && f.held == null) break }
    await step(10); P.dirt = { lost: h0 - await foeHp(), held, dragged: Math.round((await st('p2')).x - fx0) }
    ck('Face in the Dirt (↓↙←+L): grabs and drags ≈ 40 % of the screen', held && P.dirt.dragged >= 450, JSON.stringify(P.dirt))
    ck('… thrown for 110', P.dirt.lost >= 104 && P.dirt.lost <= 116, JSON.stringify(P.dirt))
  }

  if (want('unimpressed')) {
    const U = R.unimpressed = {}
    await reset({ gap: 70 }); const hp0 = (await st()).hp, fh0 = await foeHp()
    await motion(DD, 'k', 1); await page.evaluate(() => __harness.setDummyBehavior('combo')); let caught = false, glint = false
    for (let i = 0; i < 28; i++) { await step(1); const q = await st(); if ((q.s?.stats.glints || 0) > 0) glint = true; if (q.s?.stats.counters > 0) { caught = true; break } }
    await step(20); const me = await st()
    U.melee = { caught, glint, hpLost: hp0 - me.hp, foeLost: fh0 - await foeHp(), cd: me.s?.cd.unimp }
    ck('Unimpressed (↓↓+K): a melee strike inside the window is not felt', caught && U.melee.hpLost === 0, JSON.stringify(U.melee))
    ck('… backhand 80 (wall bounce) to the attacker', U.melee.foeLost >= 76, JSON.stringify(U.melee))
    ck('… 12 s cooldown', U.melee.cd > 600 && U.melee.cd <= 720, String(U.melee.cd))
    ck('… the eye glint is the tell (cue)', glint)
    await step(5); await motion(DD, 'k', 1); await step(3)
    ck('… cannot be used again on cooldown', !(await st()).attack, JSON.stringify((await st()).attack))
    // projectile inside the window: swatted away
    await reset({ gap: 140 }); const hp1 = (await st()).hp; await motion(DD, 'k', 1); await step(2); await S("H.shoot({ speed: 12, damage: 60 })")
    for (let i = 0; i < 24; i++) await step(1); const pq = await st()
    U.projectile = { counters: pq.s?.stats.counters, hpLost: hp1 - pq.hp }
    ck('… a projectile inside the window is swatted (no damage)', U.projectile.counters === 1 && U.projectile.hpLost === 0, JSON.stringify(U.projectile))
    // whiff: nobody attacks → 24-frame stance then 16 recovery
    await reset({ gap: 600 }); await motion(DD, 'k', 1); let n = 0; for (; n < 80; n++) { await step(1); if (!(await st()).attack) break }
    U.whiffFrames = n; ck('… whiff = the window + recovery (≈ 40 f)', n >= 34 && n <= 46, String(n))
  }

  if (want('decree')) {
    await reset({ gap: 600, energy: 0 }); await motion([['s'], [], ['s']].map(() => []), 'x', 1); await step(70); const ctrl = (await st()).energy   // control: same frames, no Decree
    await reset({ gap: 600, energy: 0 }); await motion(DD, 'j', 1); await step(70)
    let me = await st(); R.decree = { energy: me.energy, control: ctrl, gain: +(me.energy - ctrl).toFixed(1), max: me.maxEnergy, done: me.s?.stats.decreeDone }
    ck('Viltrum Decree (↓↓+J): untouched 60 f taunt → +25 % meter', me.s?.stats.decreeDone === 1 && Math.abs(R.decree.gain - me.maxEnergy * 0.25) <= 3, JSON.stringify(R.decree))
    await reset({ gap: 70, energy: 0, dummy: 'combo' }); await motion(DD, 'j', 1); await step(70); me = await st()
    ck('… hit during it → no meter', (me.s?.stats.decreeDone || 0) === 0 && me.energy < me.maxEnergy * 0.2, JSON.stringify([me.energy, me.s?.stats.decreeDone]))
  }

  if (want('think')) {
    await reset({ x: 800, gap: 300, energy: 100 }); const h0 = await foeHp(); await motion(DD, 'l', 1)
    let bubble = null; for (let i = 0; i < 120; i++) { await step(1); const q = await st(); if (q.s?.say?.text && !bubble) bubble = q.s.say.text; if (q.s?.stats.wallSplats > 0 && !q.s.hold) break }
    await step(10); const me = await st(), foe = await st('p2')
    const SW2 = await S('H.stage()'); R.think = { lost: h0 - foe.hp, bubble, spent: me.s?.stats.spent, foeX: Math.round(foe.x), wall: SW2 - foe.w, splats: me.s?.stats.wallSplats }
    ck('THINK! (↓↓+L, 1 bar): grab → drag → far-wall slam = 300', R.think.lost >= 290 && R.think.lost <= 310, JSON.stringify(R.think))
    ck('… bubble "THINK!"', bubble === 'THINK!', String(bubble))
    ck('… costs 1 bar (100)', me.s?.stats.spent === 100, String(me.s?.stats.spent))
    ck('… ends at the far wall (the engine keeps fighters 30 px inside the stage edge)', foe.x >= SW2 - foe.w - 40, JSON.stringify(R.think))
    await reset({ gap: 300, energy: 100 }); await ghost(); await motion(DD, 'l', 1); await idle(); const w = await st()
    ck('… whiff (intangible foe) overshoots, nobody hurt', w.s?.stats.thinkHits === 0 && w.s?.stats.think === 1, JSON.stringify([w.s?.stats.thinkHits, Math.round(w.x)]))
  }

  if (want('escape')) {
    await reset({ gap: 200, energy: 200 }); const h0 = await foeHp(); await tap(['u'], 1)
    const seen = [], dmgAt = {}; let line = null, crater = null, kd = false, maxRise = 0
    for (let i = 0; i < 420; i++) { await step(1); const q = await st(), f = await st('p2'); const ph = q.s?.ev?.ph
      if (ph && seen[seen.length - 1] !== ph) { seen.push(ph); dmgAt[ph] = h0 - f.hp }
      if (q.s?.say?.text === 'Look what they need to mimic a fraction of our power.') line = ph
      if (q.s?.crater && !crater) crater = q.s.crater; if (f.knockdown) kd = true
      maxRise = Math.max(maxRise, 400 - q.y); if (!q.attack && !q.s?.ev && i > 30) break }
    const me = await st(), total = h0 - await foeHp()
    R.escape = { seen, dmgAt, total, line, crater: !!crater, kd, cd: me.ultimateCooldown, energy: me.energy, rise: Math.round(maxRise) }
    ck('Escape Velocity (U): GRAB → ASCENT → ORBIT → RETURN → IMPACT', JSON.stringify(seen.slice(0, 6)) === JSON.stringify(['grab', 'ascent', 'orbit', 'ret', 'impact', 'settle']), JSON.stringify(seen))
    ck('… ascent ticks 10 × 8 = 80 before the orbit', dmgAt.orbit >= 76 && dmgAt.orbit <= 84, JSON.stringify(dmgAt))
    ck('… 420 total (340 impact)', total >= 416 && total <= 424, String(total))
    ck('… orbit line', line === 'orbit', String(line))
    ck('… crater + hard knockdown', !!crater && kd, JSON.stringify([!!crater, kd]))
    ck('… standard cost / cooldown: 100 energy, 20 s', me.s?.stats.spent === 100 && me.ultimateCooldown > 800 && me.ultimateCooldown <= 1200, JSON.stringify([me.s?.stats.spent, me.ultimateCooldown]))
    // whiff: foe out of reach (left wall start, max separation) → overshoot + 40 f recovery
    await reset({ gap: 300, energy: 200 }); await ghost(); await tap(['u'], 1); let stopAt = null, freeAt = null
    for (let i = 0; i < 120; i++) { await step(1); const q = await st(); if (stopAt == null && q.s?.ev == null && q.attack) stopAt = i; if (stopAt != null && !q.attack) { freeAt = i; break } }
    R.escapeWhiff = { recovery: stopAt != null && freeAt != null ? freeAt - stopAt : null, whiffs: (await st()).s?.stats.escapeWhiff }
    ck('… whiff = overshoot + ≈ 40-frame recovery', R.escapeWhiff.whiffs === 1 && R.escapeWhiff.recovery >= 36 && R.escapeWhiff.recovery <= 44, JSON.stringify(R.escapeWhiff))
    // deterministic: same inputs twice → identical sim
    const runOnce = async () => { await reset({ gap: 200, energy: 200 }); await tap(['u'], 1); await step(340); return JSON.stringify([await st(), await st('p2')].map(q => [q.x, q.y, q.hp, q.s ? { ...q.s, fx: undefined } : null])) }
    const a1 = await runOnce(), a2 = await runOnce()
    ck('… same inputs → identical result (deterministic)', a1 === a2)
  }

  if (want('combos')) {
    const C = R.combos = {}
    // press `keys` as soon as his live move has made contact (cancel / chain window), or after `wait` frames
    // waits for contact on a move NEWER than the last one it chained from (a buffered press only starts the next move once
    // the hitstop ends, so the old move is still on screen — with its contact flag — for a few frames)
    let lastSerial = 0
    const onContact = async (keys, max = 40) => { for (let i = 0; i < max; i++) { const q = await st(); if (q.attack?.omv?.contact && q.attack.omv.serial > lastSerial) { lastSerial = q.attack.omv.serial; break } await step(1) } await step(1); await tap(keys, 1) }
    const waitContact = async (max = 40) => { for (let i = 0; i < max; i++) { const q = await st(); if (q.attack?.omv?.contact && q.attack.omv.serial > lastSerial) { lastSerial = q.attack.omv.serial; return } await step(1) } }
    const run = async (name, o, body) => { lastSerial = 0; await reset({ energy: 200, ...o }); const h0 = await foeHp(); await body(); for (let i = 0; i < 400; i++) { const q = await st(); if (!q.attack && !q.s?.rush && !q.s?.hold && !q.s?.ev) break; await step(1) } await step(40)
      const me = await st(); C[name] = { dmg: h0 - await foeHp(), combo: me.s ? undefined : null, hits: me.s?.stats.hits, wall: me.s?.stats.wallSplats }; return C[name] }
    const SW = await S('H.stage()')
    let r = await run('c1_jab_straight_haymaker', { gap: 70 }, async () => { await tap(['j'], 1); await onContact(['j']); await onContact(['k']) })
    ck('combo 1: Jab → Straight → Haymaker (J, J, K) connects (≥ 170)', r.dmg >= 170, JSON.stringify(r))
    r = await run('c2_jab_straight_blitz', { gap: 70 }, async () => { await tap(['j'], 1); await onContact(['j']); await waitContact(); await motion(QCF, 'l', 1) })
    ck('combo 2: Jab → Straight → Blitz (J, J, ↓↘→+L) connects (≥ 160)', r.dmg >= 160, JSON.stringify(r))
    r = await run('c3_low_straight_think', { gap: 70 }, async () => { await hold(['s', 'j'], 1); await onContact(['j']); await waitContact(); await motion(DD, 'l', 1) })
    ck('combo 3: Low → Straight → THINK! (↓+J, J, ↓↓+L; 1 bar) connects (≥ 330)', r.dmg >= 330, JSON.stringify(r))
    r = await run('c4_hay_wall_escape', { x: SW - 330, gap: 70 }, async () => { await tap(['k'], 1); for (let i = 0; i < 60; i++) { const f = await st('p2'); if (f.wallSplat > 0) break; await step(1) }
      for (let i = 0; i < 40; i++) { if (!(await st()).attack) break; await step(1) } await tap(['u'], 1) })
    ck('combo 4: Haymaker into the wall → wall bounce → Escape Velocity (K, U) connects (≥ 480)', r.dmg >= 480, JSON.stringify(r))
    r = await run('c5_skyhook_flight_meteor', { gap: 60 }, async () => { await motion(DP, 'l', 1)
      for (let i = 0; i < 40; i++) { const q = await st(); if (q.flying && !q.attack) break; await step(1) }
      await tap(['j'], 1); for (let i = 0; i < 20; i++) { if (!(await st()).attack) break; await step(1) } await hold(['s', 'l'], 2) })
    ck('combo 5: Sky Hook → (auto-flight) Flight punch → Meteor Drop OTG (→↓↘+L, J, ↓+L) connects (≥ 150)', r.dmg >= 150, JSON.stringify(r))
  }

  if (want('mark')) {
    await page.close(); await boot('invincible')
    await reset({ x: 800, gap: 300, energy: 100 }); await motion(DD, 'l', 1); let bubble = null
    for (let i = 0; i < 60; i++) { await step(1); const q = await st(); if (q.s?.say?.text) { bubble = q.s.say.text; break } }
    R.mark = { p2: (await st('p2')).key, bubble }
    ck('THINK! vs Invincible (Mark): bubble "Think, Mark! THINK!"', R.mark.p2 === 'invincible' && bubble === 'Think, Mark! THINK!', JSON.stringify(R.mark))
  }

  if (want('gojo')) {
    await page.close(); await boot('gojo_shinjuku')
    await reset({ gap: 200, energy: 200 })
    await page.evaluate(() => { const g = __harness.omnimanViltrumTest.raw('p2'); g.energy = g.maxEnergy; if (g._gs?.inf) g._gs.inf.lv = 1 })
    const h0 = await foeHp(); await tap(['u'], 1)
    for (let i = 0; i < 90; i++) { await step(1); await page.evaluate(() => { const g = __harness.omnimanViltrumTest.raw('p2'); if (g._gs?.inf) g._gs.inf.lv = Math.max(1, g._gs.inf.lv) }); if (!(await st()).attack && i > 10) break }
    const me = await st(); R.gojo = { lost: h0 - await foeHp(), stopped: me.s?.stats.escapeStopped, whiff: me.s?.stats.escapeWhiff, hits: me.s?.stats.escapeHits }
    ck('vs Gojo Infinity: Escape Velocity whiffs (never grabs)', R.gojo.hits === 0 && R.gojo.lost === 0 && R.gojo.stopped >= 1, JSON.stringify(R.gojo))
    await page.close()
  }
  ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally {
  fs.mkdirSync('docs/msv1/omniman', { recursive: true }); fs.writeFileSync('docs/msv1/omniman/moves_results.json', JSON.stringify({ pass, fail, R, errors }, null, 1))
  console.log(`\nOMNI-MAN MOVES: ${pass} passed, ${fail} failed`); await browser.close(); server.close(); process.exit(fail ? 1 : 0)
}
