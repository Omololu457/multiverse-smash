// harness/spd_yellow_determinism.mjs — S.P.D. Yellow: replay frame identity (input-only scenario exercising chains, pistol,
// long gun, duplicate, swap, echo, command stance + order, Intercept, blink, ultimate), render-batching independence, ultimate
// + Showcase determinism, lifecycle cleanup (training reset / mid-ultimate reset / mirror / identity change), Yellow vs White
// separate Ninja Megazord ownership, live KO + next round, LAN slot-2 remote input (incl. the stance), gamepad == raw parity,
// no Math.random. Writes docs/spd_yellow/determinism_results.json.     node harness/spd_yellow_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, c ? '' : d) }
async function open(p2 = 'spd_yellow') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__ydRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/(spdYellow\w*|ninjaMegazord\w*|falconzord\w*|rangers)\.js/.test(st) && __ydRandom.length < 5) __ydRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=spd_yellow&p2=${p2}&seed=66123`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.spdYellowTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario. `idle` = Z free on the ground; directions are relative to Z's facing.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),S=a._spdYellow||{},idle=!a.attacking&&!a.isCharging&&!a._ranger?.blink&&(a.onGround||a.grounded)&&!(a.hitstun>0),fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right',F=a._falcon||{},free=F.pips>0&&!(F.lockout>0)&&!F.sortie&&!F.pendingKind
 t++; window.__ph=ph; const next=()=>{ph++;t=0}
 switch(ph){
  case 0: if(gap>110)r[fw]=true;else next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===9){r.light=true;next()}break                                                                   // J2
  case 3: if(t===11){r.light=true;next()}break                                                                  // J3
  case 4: if(t>50&&idle){r.special=true;next()}break                                                            // pistol tap
  case 5: if(t>40&&idle){r.special=true;next()}break                                                            // long gun: hold Special 34 f
  case 6: if(t<34)r.special=true;else next();break
  case 7: if(t>60&&idle){r.down=true;r.special=true;next()}break                                                 // duplicate
  case 8: if(t>40&&idle){r[fw]=true;r.special=true;next()}break                                                 // swap
  case 9: if(t>40&&idle){r.light=true;next()}break                                                              // record a normal
  case 10: if(t>30&&idle){r[bk]=true;r.special=true;next()}break                                                // echo
  case 11: if(t>40&&idle){r.charge=true;r.special=true;next()}break                                             // stance
  case 12: if(t===4)r[fw]=true;if(t===8){r.special=true;next()}break                                            // select -> confirm (order or reject)
  case 13: if(t===4){r.block=true;next()}break                                                                  // Guard closes a stance left open by a reject
  case 14: if(idle&&a.energy<40&&t<600)r.charge=true;else if(t>40&&idle&&free){r.up=r.jump=true;r.special=true;next()}else if(t>700)next();break   // Charge (input-only Energy) -> Intercept
  case 15: if(t>90&&idle){if(gap<300)r[bk]=true;else next()}break
  case 16: if(t===2||t===6)r[fw]=true;if(t>30)next();break                                                      // double-tap blink
  case 17: if(idle&&a.energy<100&&t<900)r.charge=true;else if(t>20&&idle){if(gap>220)r[fw]=true;else{r.ultimate=true;next()}}break   // Charge to 100 -> ultimate
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,{...(f._spdYellow||{}),cues:undefined},f._falcon,f._ranger,f.currentAttack]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.spdYellowTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set(); for (let i = 0; i < 3600; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      const s = a._spdYellow; if (a._falcon?.sortie) seen.add('zord_' + a._falcon.sortie.kind); if (a._ranger?.blink) seen.add('blink'); if (a.currentAttack?.my) seen.add(a.currentAttack.my.key)
      if (s?.clone) seen.add('clone'); if (s?.clone?.act) seen.add('act_' + s.clone.act.kind); if (s?.stance) seen.add('stance'); if (s?.coins) seen.add('coin'); if (H.ult().active) seen.add('ult')
      if (s?.gun?.committed) seen.add('longCommit'); if (s?.stats?.pistol) seen.add('shot_pistol'); if (s?.stats?.long) seen.add('shot_long'); seen.add('ph' + window.__ph);
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG])
  ok('recorded scenario exercises chains / pistol / long gun / clone / swap / echo / stance / Intercept / blink / ultimate', ['light', 'yJ2', 'yJ3', 'yGun', 'shot_pistol', 'longCommit', 'shot_long', 'yClone', 'clone', 'ySwap', 'act_echo', 'stance', 'yCall', 'zord_yIntercept', 'blink', 'yUltOpen', 'coin'].every(k => rec.seen.includes(k)), JSON.stringify(rec.seen))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.spdYellowTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.playbackState(), remote: !!H.raw()._spdYellowRemoteInput } }, [rec.traces.length, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok('replay matches every authoritative frame (3600)', first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Yellow as remote-driven', pb.remote)
  out.replay = { frames: 3600, identical: true, exercised: rec.seen }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.spdYellowTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2600; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._falcon?.pips, a._falcon?.sortie?.age, a._spdYellow?.clock, a._spdYellow?.coins, a._spdYellow?.clone, a.currentAttack?.name])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live', new Set(r1.perFrame.map(x => JSON.parse(x)[0])).size > 5 && r1.perFrame.some(x => JSON.parse(x)[11]))
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism + Showcase + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.spdYellowTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 200) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = show => { reset(); if (show) { H.setCoins(3); a()._spdYellow.showcase = true } H.move('yUltOpen'); const t = []; for (let i = 0; i < 300; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(false), t2 = ult(false), t3 = ult(true), t4 = ult(true)
    const sameUlt = JSON.stringify(t1) === JSON.stringify(t2) && JSON.stringify(t3) === JSON.stringify(t4), ultRan = t1.some(x => JSON.parse(x)[2].active) && t3.some(x => JSON.parse(x)[2].active && JSON.parse(x)[2].showcase)
    const hpEnd = t => JSON.parse(t.at(-1))[1][4], showcaseSameDamage = hpEnd(t1) === hpEnd(t3)
    // training reset clears clone, coins, stance, breach, shots, sortie, pips, ultimate
    reset(300); H.setCoins(2); H.move('yClone'); step(32); H.raw()._spdYellow.breach = { t: 100 }; a().energy = 100; H.move('yCall', 'p1', { kind: 'yIntercept' }); step(16); const live = !!a()._falcon?.sortie && !!a()._spdYellow?.clone
    H.reset(); step(1); const st = H.state(); const trainingClears = live && !st.falcon?.sortie && st.hud?.pips === 2 && !(st.hud?.lockout > 0) && !st.s?.clone && !(st.s?.coins) && !st.s?.breach && !st.s?.stance && !H.ult().active && H.shots().length === 0
    // reset mid-ultimate
    reset(); H.move('yUltOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(60); H.reset(); step(1); const ultCleared = inUlt && !H.ult().active && !a().currentAttack && !a()._falcon?.sortie
    // mirror: both Yellows split + call; P1 interrupted never touches P2's clone / Megazord
    reset(300); H.move('yClone', 'p1'); H.move('yClone', 'p2'); step(32); a().energy = b().energy = 100; H.move('yCall', 'p1', { kind: 'yIntercept' }); H.move('yCall', 'p2', { kind: 'yIntercept' }); step(4)
    a().hitstun = 20; a().attacking = false; a().currentAttack = null; step(20)
    const mirror = { p1Cancelled: !a()._falcon.sortie, p2Committed: !!b()._falcon.sortie, p1Clone: !!a()._spdYellow?.clone, p2Clone: !!b()._spdYellow?.clone, p1Pips: a()._falcon.pips, p2Pips: b()._falcon.pips }
    // identity change: Yellow with live state becomes another fighter -> every Yellow leftover is cleared
    reset(300); H.setCoins(2); H.move('yClone'); step(32); a().energy = 100; H.move('yCall', 'p1', { kind: 'yIntercept' }); step(20); const had = !!a()._spdYellow?.clone && !!a()._falcon?.sortie
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const ident = { had, yellow: !!a()._spdYellow, sortie: !!a()._falcon?.sortie, ranger: !!a()._ranger, shots: H.shots().length }; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, showcaseSameDamage, trainingClears, ultCleared, mirrorIndependent: mirror.p1Cancelled && mirror.p2Committed && mirror.p1Clone && mirror.p2Clone && mirror.p1Pips === 1 && mirror.p2Pips === 1, mirror,
      identityClears: ident.had && !ident.yellow && !ident.sortie && !ident.ranger && ident.shots === 0, ident } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'showcaseSameDamage', 'trainingClears', 'ultCleared', 'mirrorIndependent', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. Yellow vs White in one match: both own a live Ninja Megazord at once, neither clears the other's
  await page.close(); page = await open('mmpr_white')
  const yw = await page.evaluate(() => { const Y = __harness.spdYellowTest, W = __harness.mmprWhiteTest, a = Y.raw(), b = Y.raw('p2'), step = n => __harness.luffyTest.step(n)
    Y.reset(); a.x = 1300; b.x = 1620; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; step(1)
    Y.move('yCall', 'p1', { kind: 'yIntercept' }); W.move('wCall', 'p2', { kind: 'ninjaTwinFist' }); let both = false
    for (let i = 0; i < 60; i++) { step(1); both ||= !!a._falcon?.sortie && !!b._falcon?.sortie } return { both, aPips: a._falcon?.pips, bPips: b._falcon?.pips, aKind: a._falcon?.lastKind ?? null, bKey: b.rosterKey } })
  ok('Yellow and White each own a live Ninja Megazord at the same time (shared scheduler, separate owners)', yw.both && yw.aPips === 1 && yw.bPips === 1 && yw.bKey === 'mmpr_white', JSON.stringify(yw)); out.yellowVsWhite = yw
  // ── E. live match: KO clears state, next round fresh (0 coins, no clone, full pips)
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=spd_yellow&p2=spd_yellow`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.spdYellowTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.spdYellowTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 300; B.vx = 0; H.setCoins(2) })
  await page.keyboard.down('s'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('s')
  await page.waitForFunction(() => !!__harness.spdYellowTest.raw()._spdYellow?.clone, null, { timeout: 4000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ clone: !!__harness.spdYellowTest.raw()._spdYellow?.clone }))
  await page.evaluate(() => { const H = __harness.spdYellowTest, A = H.raw(), B = H.raw('p2'); A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; B.health = 1; B.x = A.x + 70; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true; B.invulnTimer = 0; B.hitstun = 120; B.isBlocking = false })
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  ok('live keyboard Down+Special splits a duplicate in a real match', pre.clone)
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.spdYellowTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const f = __harness.spdYellowTest.raw(), F = f._falcon, s = f._spdYellow; return { gs: __harness.state().gameState, pips: F?.pips ?? 2, sortie: !!F?.sortie, coins: s?.coins || 0, clone: !!s?.clone, stance: !!s?.stance, breach: !!s?.breach, rooted: !!f._rooted } })
  ok('after the KO the next round starts with 0 coins, no clone / stance / breach / sortie, full pips', nr.pips === 2 && !nr.sortie && nr.coins === 0 && !nr.clone && !nr.stance && !nr.breach && !nr.rooted, JSON.stringify(nr)); out.nextRound = nr
  // ── F. LAN: slot-2 Yellow driven by injected remote input (pistol, duplicate, stance open/select/cancel, blink)
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.spdYellowTest; H.raw('p2').energy = 100
    const sc = { 8: { special: true }, 80: { down: true, special: true }, 150: { charge: true, special: true }, 156: { left: true }, 162: { block: true }, 220: { right: true }, 224: { right: true } }
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(sc[fr] || {}) })
    let gun = false, clone = false, stance = false, sel = -1, closed = false, blink = false; for (let i = 0; i < 280; i++) { __harness.luffyTest.step(1); const s = H.state('p2')
      gun ||= s.attack?.my?.key === 'yGun'; clone ||= !!s.s?.clone; if (s.s?.stance) { stance = true; sel = s.s.stance.sel } closed ||= stance && !s.s?.stance; blink ||= !!s.ranger?.blink }
    const fr = __harness.net.frame(); __harness.net.end(); return { gun, clone, stance, sel, closed, blink, frame: fr, remote: !!H.raw('p2')._spdYellowRemoteInput } })
  ok('LAN-injected slot-2 Yellow: pistol + duplicate + stance open/select/Guard-close + blink', lan.gun && lan.clone && lan.stance && lan.sel !== 0 && lan.closed && lan.blink && lan.remote, JSON.stringify(lan)); out.lan = lan
  // ── G. controller == raw parity (R1 Special, L2 Charge, Square Light, Circle Guard, D-pad) incl. the stance
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.spdYellowTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    const seq = [[2, { light: true }], [12, { light: true }], [80, { special: true }], [140, { down: true, special: true }], [200, { right: true, special: true }], [260, { charge: true, special: true }], [266, { right: true }], [272, { special: true }], [280, { block: true }], [330, { up: true, jump: true, special: true }]]
    const PAD = { right: 15, up: 12, down: 13, special: 5, light: 2, block: 1, charge: 6 }
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; H.setCoins(1); __harness.luffyTest.step(1)
      const trace = []; for (let i = 0; i < 420; i++) { const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }
        else writeRawControls(a, e)
        __harness.luffyTest.step(1); trace.push([a.currentAttack?.my?.key || null, a._falcon?.sortie?.kind || null, b.health, a._spdYellow?.stance?.sel ?? null, a._spdYellow?.coins]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))], kinds = t => [...new Set(t.map(x => x[1]).filter(Boolean))]
    return { raw: { names: names(raw), kinds: kinds(raw), hp: raw.at(-1)[2] }, pad: { names: names(pad), kinds: kinds(pad), hp: pad.at(-1)[2] }, same: JSON.stringify(raw) === JSON.stringify(pad) } })
  ok('gamepad path == raw path frame for frame (J1/J2, pistol, duplicate, swap, stance, Intercept)', par.same && par.raw.names.includes('yJ2') && par.raw.names.includes('yStance') && par.raw.names.includes('ySwap') && par.raw.kinds.includes('yIntercept'), JSON.stringify(par))
  out.parity = par
  const rnd = await page.evaluate(() => __ydRandom); ok('no Math.random in spdYellow*.js / ninjaMegazord*.js / falconzord.js / rangers.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/spd_yellow/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
