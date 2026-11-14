// harness/mmpr_white_determinism.mjs — White Ranger: replay frame identity (input-only scenario exercising every order,
// chain, special, feint and blink), render-batching independence, ultimate determinism, lifecycle cleanup (training reset /
// KO / next round / mirror), LAN slot-2 remote input, local gamepad + keyboard + raw parity, no Math.random.
// Writes docs/mmpr_white/determinism_results.json.     node harness/mmpr_white_determinism.mjs
// Also: White vs Black simultaneous Zord ownership, identity-change cleanup, keyboard/pad parity including the Saba feint.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d) }
async function open(p2 = 'mmpr_white') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__mwRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/(mmprWhite\w*|ninjaMegazord\w*|falconzord\w*)\.js/.test(st) && __mwRandom.length < 5) __mwRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=mmpr_white&p2=${p2}&seed=55123`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.mmprWhiteTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario: J1→J2→J3, Twin Fist order, Saba's Answer, Answer feint, Ascent (+ air Descent), Crane Rise,
// Ninja Edge, double-tap blink, F+Heavy chain, Low Heel → Saba Cut.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),S=a._mmprWhite||{},idle=!a.attacking&&!(S.landing>0)&&!S.leaping&&!S.descending&&!a._ranger?.blink&&(a.onGround||a.grounded),fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right',F=a._falcon||{},free=F.pips>0&&!(F.lockout>0)&&!F.sortie&&!F.pending;t++
 const next=()=>{ph++;t=0}
 switch(ph){
  case 0: if(gap>110)r[fw]=true;else next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===9){r.light=true;next()}break
  case 3: if(t===11){r.light=true;next()}break
  case 4: if(t>50&&idle&&free&&gap<160){r[fw]=true;r.special=true;next()}else if(t>50&&gap>=160)r[fw]=true;else if(t>400)next();break   // Twin Fist
  case 5: if(t>80&&idle){if(gap>120)r[fw]=true;else{r.special=true;next()}}break                                  // Saba's Answer
  case 6: if(t>60&&idle){r.special=true;next()}break                                                              // Answer, then feint
  case 7: if(t===4){r.block=true;next()}break
  case 8: if(t>40&&idle){r.down=true;r.special=true;next()}break                                                  // Ascent
  case 9: if(!(a.onGround||a.grounded)&&t>14){r.down=true;r.special=true;next()}else if(t>80)next();break        // (Descent attempt)
  case 10: if(t>70&&idle&&free&&a.energy>=18){r.up=r.jump=true;r.special=true;next()}else if(t>900)next();break               // Crane Rise
  case 11: if(t>90&&idle&&free&&a.energy>=20){r[bk]=true;r.special=true;next()}else if(t>700)next();break        // Ninja Edge
  case 12: if(t>90&&idle){if(gap<300)r[bk]=true;else next()}break
  case 13: if(t===2||t===6)r[fw]=true;if(t>30)next();break                                                       // double-tap blink
  case 14: if(t>20&&idle){if(gap>100)r[fw]=true;else{r[fw]=true;r.heavy=true;next()}}break                       // F+Heavy chain
  case 15: if(t===16){r.heavy=true;next()}break
  case 16: if(t===18){r.heavy=true;next()}break
  case 17: if(t>50&&idle){if(gap>90)r[fw]=true;else{r.down=true;r.light=true;next()}}break                       // Low Heel → Saba Cut
  case 18: if(t===13){r.heavy=true;next()}break
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._mmprWhite,f._falcon,f._ranger,f.currentAttack]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.mmprWhiteTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set(); for (let i = 0; i < 2600; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a._falcon?.sortie) seen.add('order_' + a._falcon.sortie.kind); if (a._ranger?.blink) seen.add('blink'); if (a.currentAttack) seen.add(a.currentAttack.name); if (a._mmprWhite?.token) seen.add('token')
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG])
  ok('recorded scenario exercises chains/orders/specials/feint/blink', ['light', 'wJ2', 'wJ3', 'wCall', 'order_ninjaTwinFist', 'order_ninjaCraneRise', 'order_ninjaEdge', 'wAnswer', 'wFeint', 'wAscent', 'blink', 'wAdv', 'wSaba', 'wLow', 'heavy'].every(k => rec.seen.includes(k)), JSON.stringify(rec.seen))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.mmprWhiteTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.playbackState(), remote: !!H.raw()._mmprWhiteRemoteInput } }, [rec.traces.length, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok('replay matches every authoritative frame (2600)', first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks White as remote-driven', pb.remote)
  out.replay = { frames: 2600, identical: true, exercised: rec.seen }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.mmprWhiteTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2600; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._falcon?.pips, a._falcon?.sortie?.age, a._mmprWhite?.clock, a.currentAttack?.name])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live', new Set(r1.perFrame.map(x => JSON.parse(x)[0])).size > 5 && r1.perFrame.some(x => JSON.parse(x)[9]))
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism + lifecycle (training reset, mid-ultimate reset, mirror, identity change)
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.mmprWhiteTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 72) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = tok => { reset(); if (tok) H.giveToken(); H.move('wUltOpen'); const t = []; for (let i = 0; i < 300; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(false), t2 = ult(false), t3 = ult(true), t4 = ult(true)
    const sameUlt = JSON.stringify(t1) === JSON.stringify(t2) && JSON.stringify(t3) === JSON.stringify(t4), ultRan = t1.some(x => JSON.parse(x)[2].active) && t3.some(x => JSON.parse(x)[2].active)
    const hpEnd = t => JSON.parse(t.at(-1))[1][4], tokenSameDamage = hpEnd(t1) === hpEnd(t3)
    // training reset clears order, pips, lockout, collection, token, offers, ultimate
    reset(150); H.grant('hand'); H.move('wCall', 'p1', { kind: 'ninjaEdge' }); step(30); const live = !!a()._falcon?.sortie && !!a()._mmprWhite?.coll
    H.reset(); step(1); const st = H.state(); const trainingClears = live && !st.falcon?.sortie && st.hud?.pips === 2 && !(st.hud?.lockout > 0) && !st.s?.coll && !st.s?.token && !st.s?.accept && !st.s?.leader && !H.ult().active
    // reset mid-ultimate
    reset(); H.move('wUltOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(40); H.reset(); step(1); const ultCleared = inUlt && !H.ult().active && !a().currentAttack
    // mirror: both Whites call; cancelling P1's call never touches P2's
    reset(300); H.move('wCall', 'p1', { kind: 'ninjaTwinFist' }); H.move('wCall', 'p2', { kind: 'ninjaCraneRise' }); step(4); a().hitstun = 20; a().attacking = false; a().currentAttack = null; step(20)
    const mirror = { p1Cancelled: !a()._falcon.sortie && a()._falcon.cancels === 1, p2Committed: !!b()._falcon.sortie || b()._falcon.commits === 1, p2Pips: b()._falcon.pips, p1Pips: a()._falcon.pips }
    // identity change: a White with live state becomes another fighter → every White leftover is cleared
    reset(300); H.grant('hand'); H.giveToken(); H.move('wCall', 'p1', { kind: 'ninjaTwinFist' }); step(20); const had = !!a()._mmprWhite && !!a()._falcon?.sortie
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const ident = { had, white: !!a()._mmprWhite, sortie: !!a()._falcon?.sortie, ranger: !!a()._ranger }; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, tokenSameDamage, trainingClears, ultCleared, mirrorIndependent: mirror.p1Cancelled && mirror.p2Committed && mirror.p1Pips === 1 && mirror.p2Pips === 1, mirror,
      identityClears: ident.had && !ident.white && !ident.sortie && !ident.ranger, ident } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'tokenSameDamage', 'trainingClears', 'ultCleared', 'mirrorIndependent', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. White vs Black in one match: both own a live Zord at once, neither clears the other's
  await page.close(); page = await open('mmpr_black')
  const wb = await page.evaluate(() => { const W = __harness.mmprWhiteTest, B = __harness.mmprBlackTest, a = W.raw(), b = W.raw('p2'), step = n => __harness.luffyTest.step(n)
    W.reset(); a.x = 1300; b.x = 1620; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; step(1)
    W.move('wCall', 'p1', { kind: 'ninjaTwinFist' }); B.move('bCall', 'p2', { kind: 'volley' }); let both = false, wDone = false, bDone = false
    for (let i = 0; i < 90; i++) { step(1); both ||= !!a._falcon?.sortie && !!b._falcon?.sortie; wDone ||= (a._falcon?.commits || 0) >= 1; bDone ||= (b._falcon?.commits || 0) >= 1 }
    return { both, wDone, bDone, wKind: a._falcon?.lastKind ?? null, aPips: a._falcon?.pips, bPips: b._falcon?.pips, bKey: b.rosterKey, aKey: a.rosterKey } })
  ok('White and Black each own a live Zord at the same time (shared scheduler, separate owners)', wb.both && wb.wDone && wb.bDone && wb.aPips === 1 && wb.bPips === 1 && wb.bKey === 'mmpr_black', JSON.stringify(wb)); out.whiteVsBlack = wb
  // ── E. live match: KO clears state, next round fresh
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=mmpr_white&p2=mmpr_white`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.mmprWhiteTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.mmprWhiteTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 300; B.vx = 0; H.giveToken() })
  await page.keyboard.down('d'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('d')
  await page.waitForFunction(() => !!__harness.mmprWhiteTest.raw()._falcon?.sortie, null, { timeout: 4000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ sortie: !!__harness.mmprWhiteTest.raw()._falcon?.sortie }))
  await page.evaluate(() => { const H = __harness.mmprWhiteTest, A = H.raw(), B = H.raw('p2'); A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; B.health = 1; B.x = A.x + 70; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true; B.invulnTimer = 0; B.hitstun = 120; B.isBlocking = false })
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  const ko = await page.evaluate(() => ({ p2hp: __harness.mmprWhiteTest.raw('p2').health, a: __harness.mmprWhiteTest.raw()._falcon || null, s: __harness.mmprWhiteTest.raw()._mmprWhite || null }))
  ok('live keyboard Forward+Special sends a Ninja Megazord order in a real match', pre.sortie)
  ok('round-ending KO retires the order and White state (round cleanup)', ko.p2hp <= 0 && !ko.a?.sortie && !ko.s?.token, JSON.stringify({ hp: ko.p2hp, sortie: !!ko.a?.sortie, token: !!ko.s?.token }))
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.mmprWhiteTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const f = __harness.mmprWhiteTest.raw(), F = f._falcon, s = f._mmprWhite; return { gs: __harness.state().gameState, pips: F?.pips ?? 2, sortie: !!F?.sortie, lockout: F?.lockout || 0, postUlt: F?.postUlt || 0, token: !!s?.token, coll: !!s?.coll, rooted: !!f._rooted } })
  ok('next round starts with full pips, no order/lockout/token/collection/root', nr.pips === 2 && !nr.sortie && nr.lockout === 0 && nr.postUlt === 0 && !nr.token && !nr.coll && !nr.rooted, JSON.stringify(nr))
  // ── F. LAN: slot 2 White driven by injected remote input
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.mmprWhiteTest; H.raw('p2').energy = 100
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(fr === 8 ? { left: true, special: true } : fr === 120 ? { special: true } : fr === 124 ? { block: true } : fr === 200 || fr === 204 ? { left: true } : {}) })
    let call = false, sortie = false, answer = false, feint = false, blink = false; for (let i = 0; i < 260; i++) { __harness.luffyTest.step(1); const s = H.state('p2'); call ||= s.attack?.name === 'wCall'; sortie ||= !!s.falcon?.sortie; answer ||= s.attack?.name === 'wAnswer'; feint ||= s.attack?.name === 'wFeint'; blink ||= !!s.ranger?.blink }
    const fr = __harness.net.frame(); __harness.net.end(); return { call, sortie, answer, feint, blink, frame: fr, remote: !!H.raw('p2')._mmprWhiteRemoteInput } })
  ok("LAN-injected slot-2 White: order + Saba's Answer feint + blink", lan.call && lan.sortie && lan.answer && lan.feint && lan.blink && lan.frame >= 260, JSON.stringify(lan)); out.lan = lan
  // ── G. controller / raw parity incl. the feint (Circle = Block) — keyboard path is driven by harness/mmpr_white.test.mjs
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.mmprWhiteTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    const seq = [[2, { right: true, special: true }], [90, { light: true }], [100, { light: true }], [110, { light: true }], [200, { special: true }], [204, { block: true }], [300, { up: true, jump: true, special: true }]]
    const PAD = { right: 15, up: 12, special: 5, light: 2, block: 1 }
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; __harness.luffyTest.step(1)
      const trace = []; for (let i = 0; i < 400; i++) { const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }
        else if (mode === 'raw') writeRawControls(a, e)
        __harness.luffyTest.step(1); trace.push([a.currentAttack?.name || null, a._falcon?.sortie?.kind || null, b.health]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))], kinds = t => [...new Set(t.map(x => x[1]).filter(Boolean))]
    return { raw: { names: names(raw), kinds: kinds(raw), hp: raw.at(-1)[2] }, pad: { names: names(pad), kinds: kinds(pad), hp: pad.at(-1)[2] }, same: JSON.stringify(raw) === JSON.stringify(pad) } })
  ok('gamepad path (R1 Special, Square Light, Circle Block, D-pad) == raw path, frame for frame, incl. the feint', par.same && par.raw.kinds.includes('ninjaTwinFist') && par.raw.kinds.includes('ninjaCraneRise') && par.raw.names.includes('wJ3') && par.raw.names.includes('wFeint'), JSON.stringify(par))
  out.parity = par
  const rnd = await page.evaluate(() => __mwRandom); ok('no Math.random in mmprWhite*.js / ninjaMegazord*.js / falconzord*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/mmpr_white/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
