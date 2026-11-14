// harness/mmpr_pink_determinism.mjs — Pink Ranger: replay frame identity (input-only scenario exercising the bow tap and
// hold, every Thunder order incl. the post-commit bow, Crane Escape, the J-string, the F+Heavy chain and the blink),
// render-batching independence, ultimate determinism, lifecycle cleanup (training reset / KO / next round / mirror), LAN
// slot-2 remote input, local gamepad + keyboard + raw parity, no Math.random.
// Writes docs/mmpr_pink/determinism_results.json.     node harness/mmpr_pink_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d) }
async function open(p2 = 'mmpr_pink') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__mbRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/(mmprPink\w*|thunderMegazord\w*|falconzord\w*)\.js/.test(st) && __mbRandom.length < 5) __mbRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=mmpr_pink&p2=${p2}&seed=55123`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.mmprPinkTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario (decisions read state, presses become recorded inputs).
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),idle=!a.attacking&&!a._ranger?.blink&&(a.onGround||a.grounded),fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right',F=a._falcon||{},ready=F.pips>0&&!(F.lockout>0)&&!F.sortie&&a.energy>=18;t++
 const next=()=>{ph++;t=0}
 switch(ph){
  case 0: if(gap>110)r[fw]=true;else next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===8){r.light=true;next()}break
  case 3: if(t===10){r.light=true;next()}break
  case 4: if(t>50&&idle){if(gap<200)r[bk]=true;else{r.special=true;next()}}break                                   // Quick Shot (tap)
  case 5: if(t>50&&idle&&a.energy>=20){r.special=true;next()}break                                                  // Drawn Shot: hold 30 f
  case 6: if(t<30)r.special=true;else next();break
  case 7: if(t>40&&idle&&ready){r[fw]=true;r.special=true;next()}else if(t>500)next();break                          // Thunder Line
  case 8: if(t===18){r.special=true;next()}break                                                                    // post-commit bow
  case 9: if(t>70&&idle&&ready){r.up=r.jump=true;r.special=true;next()}else if(t>600)next();break                    // Sky Splitter
  case 10: if(t>70&&idle&&ready){r[bk]=true;r.special=true;next()}else if(t>600)next();break                         // Returning Edge
  case 11: if(t>60&&idle&&a.energy>=12){r.down=true;r.special=true;next()}break                                      // Crane Escape
  case 12: if(!idle&&t<20)t=0;else if(t>=20){const k=t-20;if(k===2||k===6)r[fw]=true;if(k>30)next()}break        // double-tap blink (after Crane recovery)
  case 13: if(t>20&&idle){if(gap>100)r[fw]=true;else{r[fw]=true;r.heavy=true;next()}}break                          // F+Heavy palm
  case 14: if(t===16){r.heavy=true;next()}break
  case 15: if(t===18){r.heavy=true;next()}break
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._mmprPink&&{...f._mmprPink,cues:undefined},f._falcon,f._ranger,f.currentAttack]`
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.mmprPinkTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set(); for (let i = 0; i < 1800; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a._falcon?.sortie) seen.add('sortie_' + a._falcon.sortie.kind); if (a._ranger?.blink) seen.add('blink'); if (a.currentAttack) seen.add(a.currentAttack.name); const ar = H.state().arrows; if (ar.length) seen.add('arrow_' + ar[0].kind)
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG])
  ok('recorded scenario exercises chains/bow/assists/Crane/blink', ['light', 'pJ2', 'pJ3', 'pBow', 'arrow_quick', 'arrow_drawn', 'pCall', 'sortie_thunderLine', 'sortie_skySplitter', 'sortie_returningEdge', 'pCrane', 'blink', 'pPalm', 'pKick'].every(k => rec.seen.includes(k)), JSON.stringify(rec.seen))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.mmprPinkTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.playbackState(), remote: !!H.raw()._mmprPinkRemoteInput } }, [rec.traces.length, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok('replay matches every authoritative frame (1800)', first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Pink as remote-driven', pb.remote)
  out.replay = { frames: 1800, identical: true, exercised: rec.seen }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.mmprPinkTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 1800; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._falcon?.pips, a._falcon?.sortie?.age, a._mmprPink?.clock, a.currentAttack?.name])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live', new Set(r1.perFrame.map(x => JSON.parse(x)[0])).size > 5 && r1.perFrame.some(x => JSON.parse(x)[9]))
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism (two identical injected runs, frame traces equal) + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.mmprPinkTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 72) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = () => { reset(140); H.move('pCall', 'p1', { kind: 'returningEdge' }); step(16); a().energy = 100; a().attacking = false; a().currentAttack = null; H.move('pUltOpen'); const t = []; for (let i = 0; i < 260; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    // training reset clears sortie, shots, pips, lockouts, Pincer, ultimate
    reset(500); H.move('pCall', 'p1', { kind: 'thunderLine' }); step(16); a().attacking = false; a().currentAttack = null; H.move('pBow'); step(13); a()._mmprPink.spot = { x: 1500, y: 400, t: 50 }; const live = !!a()._falcon?.sortie && H.state().arrows.length > 0
    H.reset(); step(1); const st = H.state(); const trainingClears = live && !st.zord?.sortie && st.arrows.length === 0 && st.hud?.pips === 2 && !(st.hud?.lockout > 0) && !st.s?.spot && !st.s?.callAt && !H.ult().active
    // reset mid-ultimate
    reset(140); H.move('pUltOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(40); H.reset(); step(1); const ultCleared = inUlt && !H.ult().active && !a().currentAttack
    // mirror: both Blacks call; spending/cancelling P1's call never touches P2's state
    reset(300); H.move('pCall', 'p1', { kind: 'thunderLine' }); H.move('pCall', 'p2', { kind: 'skySplitter' }); step(4); a().hitstun = 20; a().attacking = false; a().currentAttack = null; step(20)
    const mirror = { p1Cancelled: !a()._falcon.sortie && a()._falcon.cancels === 1, p2Committed: !!b()._falcon.sortie || b()._falcon.commits === 1, p2Pips: b()._falcon.pips, p1Pips: a()._falcon.pips }
    return { sameUlt, ultRan, trainingClears, ultCleared, mirrorIndependent: mirror.p1Cancelled && mirror.p2Committed && mirror.p1Pips === 1 && mirror.p2Pips === 1, mirror } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'trainingClears', 'ultCleared', 'mirrorIndependent']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. live match: KO clears state, next round fresh, no call sounds after defeat
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=mmpr_pink&p2=mmpr_pink`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.mmprPinkTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.mmprPinkTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 300; B.vx = 0 })
  await page.keyboard.down('d'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('d')
  await page.waitForFunction(() => !!__harness.mmprPinkTest.raw()._falcon?.sortie, null, { timeout: 4000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ sortie: !!__harness.mmprPinkTest.raw()._falcon?.sortie }))
  await page.evaluate(() => { const H = __harness.mmprPinkTest, A = H.raw(), B = H.raw('p2'); A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; B.health = 1; B.x = A.x + 70; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true; B.invulnTimer = 0; B.hitstun = 120; B.isBlocking = false })
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  const ko = await page.evaluate(() => ({ p2hp: __harness.mmprPinkTest.raw('p2').health, a: __harness.mmprPinkTest.raw()._falcon || null }))
  ok('live keyboard Forward+Special commits a Thunder Line in a real match', pre.sortie)
  ok('round-ending KO retires the strike (round cleanup)', ko.p2hp <= 0 && !ko.a?.sortie, JSON.stringify({ hp: ko.p2hp, sortie: !!ko.a?.sortie }))
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.mmprPinkTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const A = __harness.mmprPinkTest.raw(), f = A._falcon; return { gs: __harness.state().gameState, pips: f?.pips ?? 2, sortie: !!f?.sortie, lockout: f?.lockout || 0, postUlt: f?.postUlt || 0, spot: !!A._mmprPink?.spot, callAt: !!A._mmprPink?.callAt } })
  ok('next round starts with full pips, no strike/lockout/Spotter/call', nr.pips === 2 && !nr.sortie && nr.lockout === 0 && nr.postUlt === 0 && !nr.spot && !nr.callAt, JSON.stringify(nr))
  // ── E. LAN: slot 2 Black driven by injected remote input (with a live neutral pad present)
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.mmprPinkTest; H.raw('p2').energy = 100
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(fr === 8 ? { left: true, special: true } : fr === 120 ? { special: true } : fr === 200 || fr === 204 ? { left: true } : {}) })
    let call = false, sortie = false, bow = false, blink = false; for (let i = 0; i < 260; i++) { __harness.luffyTest.step(1); const s = H.state('p2'); call ||= s.attack?.name === 'pCall'; sortie ||= !!s.zord?.sortie; bow ||= s.attack?.name === 'pBow'; blink ||= !!s.ranger?.blink }
    const fr = __harness.net.frame(); __harness.net.end(); return { call, sortie, bow, blink, frame: fr, remote: !!H.raw('p2')._mmprPinkRemoteInput } })
  ok('LAN-injected slot-2 Pink: Thunder call + Power Bow + blink', lan.call && lan.sortie && lan.bow && lan.blink && lan.frame >= 260, JSON.stringify(lan)); out.lan = lan
  // ── F. controller / keyboard / raw parity: the same Forward+Special, Up+Special, Light sequence via three input paths
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.mmprPinkTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    const seq = [[2, { right: true, special: true }], [90, { light: true }], [100, { light: true }], [110, { light: true }], [330, { up: true, jump: true, special: true }], [430, { special: true }]]
    const PAD = { right: 15, up: 12, special: 5, light: 2 }   // jump (X) intentionally absent: D-pad Up is the pad's up
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; __harness.luffyTest.step(1)
      const trace = []; for (let i = 0; i < 480; i++) { const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }
        else if (mode === 'raw') writeRawControls(a, e)
        __harness.luffyTest.step(1); trace.push([a.currentAttack?.name || null, a._falcon?.sortie?.kind || null, b.health, (a._mmprPink?.spot || null) && a._mmprPink.spot.x]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))], kinds = t => [...new Set(t.map(x => x[1]).filter(Boolean))]
    return { raw: { names: names(raw), kinds: kinds(raw), hp: raw.at(-1)[2] }, pad: { names: names(pad), kinds: kinds(pad), hp: pad.at(-1)[2] }, same: JSON.stringify(raw) === JSON.stringify(pad) } })
  ok('gamepad path (R1 Special, Square Light, D-pad) == raw path, frame for frame', par.same && par.raw.kinds.includes('thunderLine') && par.raw.kinds.includes('skySplitter') && par.raw.names.includes('pJ3') && par.raw.names.includes('pBow'), JSON.stringify(par))
  // keyboard path: the mechanics harness drives the identical moves through real key events (mmpr_pink.test.mjs)
  out.parity = par
  const rnd = await page.evaluate(() => __mbRandom); ok('no Math.random in mmprPink*.js / thunderMegazord*.js / falconzord*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/mmpr_pink/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
