// harness/cyborg_determinism.mjs — Cyborg: replay frame identity (an input-only scenario exercising every weapon, the
// vent, thruster, slam, chains and the ultimate), render-batching independence, ultimate determinism, lifecycle cleanup
// (training reset, mid-ultimate reset, identity change, KO / next round), LAN slot-2 remote input, gamepad == raw parity
// (Square / Triangle / Cross / Circle / R1 / R2 / L2 + D-pad), and no Math.random in cyborg*.js.
// Writes docs/cyborg/determinism_results.json.        node harness/cyborg_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d) }
async function open(p2 = 'cyborg') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__cyRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/cyborg\w*\.js/.test(st) && __cyRandom.length < 5) __cyRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=cyborg&p2=${p2}&seed=66123`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.cyborgTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario: J1→J2→J3, Sonic Shot, held Cannon, Missile, Rack, Mega, Recoil, Vent, jump + thruster +
// air slam, Forward+Heavy chain, Low, ultimate.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),S=a._cyborg||{},idle=!a.attacking&&(a.onGround||a.grounded)&&!(a.hitstun>0),fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right';t++
 const next=()=>{ph++;t=0}
 switch(ph){
  case 0: if(gap>100)r[fw]=true;else next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===10){r.light=true;next()}break
  case 3: if(t===12){r.light=true;next()}break
  case 4: if(t>50&&idle&&a.energy>=12){r.special=true;next()}break                                    // Sonic Shot (tap)
  case 5: if(t===41&&(!idle||a.energy<20))t--;else if(t>40&&t<=72)r.special=true;else if(t>72)next();break   // held Cannon (32 f hold → branch at 18, pulses)
  case 6: if(t>50&&idle&&a.energy>=15){r[fw]=true;r.special=true;next()}break                          // Straight Missile
  case 7: if(t>70&&idle&&a.energy>=30){r.up=r.jump=true;r.special=true;next()}break                    // Missile Rack (W = up AND jump on the keyboard)
  case 8: if(t>90&&idle&&a.energy>=20){if(gap>90)r[fw]=true;else{r.down=true;r.special=true;next()}}break   // Mega Punch
  case 9: if(t>60&&idle&&a.energy>=18){r[bk]=true;r.special=true;next()}break                          // Sonic Recoil
  case 10: if(t>40&&idle){r.charge=true;if(t>40+40)next()}break                          // Vent hold 40 f
  case 11: if(t>30&&idle&&a.energy>=30){r.jump=true;r.up=true;next()}else if(t>1500)next();break   // jump (waits for thruster 8 + slam 20 Power)
  case 12: if(t===10){r.jump=true;r.up=true}if(t===16){r.down=true;r.special=true;next()}break   // thruster, air slam
  case 13: if(t>60&&idle){if(gap>110)r[fw]=true;else{r[fw]=true;r.heavy=true;next()}}break  // Forward+Heavy chain
  case 14: if(t===18){r.heavy=true;next()}break
  case 15: if(t===18){r.heavy=true;next()}break
  case 16: if(t>50&&idle){if(gap>90)r[fw]=true;else{r.down=true;r.light=true;next()}}break   // Low
  case 17: if(t>60&&idle&&a.energy>=100){if(gap>100)r[fw]=true;else{r.ultimate=true;next()}}else if(t>3500)next();break   // ultimate (waits for 100 Power)
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._cyborg,f.currentAttack&&{...f.currentAttack}]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.cyborgTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set()   // no state writes: replay starts from the same fresh round
    for (let i = 0; i < 6000; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack) seen.add(a.currentAttack.cy?.key || a.currentAttack.name); if (a._cyborg?.djUsed) seen.add('thruster'); if (H.ult().active) seen.add('ult')
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], stats: a._cyborg?.stats, rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG])
  ok('recorded scenario exercises chains / weapons / vent / thruster / slam / ultimate', ['light', 'cJ2', 'cJ3', 'cSonic', 'cCannon', 'cMissile', 'cRack', 'cMega', 'cRecoil', 'cVent', 'thruster', 'cSlamAir', 'cAdv', 'cPiston', 'cLow', 'cUltOpen', 'ult'].every(k => rec.seen.includes(k)), JSON.stringify(rec.seen))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.cyborgTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote: !!H.raw()._cyborgRemoteInput } }, [6000, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok('replay matches every authoritative frame (6000)', first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Cyborg as remote-driven', pb.remote)
  out.replay = { frames: 6000, identical: true, exercised: rec.seen, stats: rec.stats }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.cyborgTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2400; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._cyborg?.heat, a._cyborg?.clock, a.currentAttack?.name])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live (Heat moved, moves ran)', new Set(r1.perFrame.map(x => JSON.parse(x)[6])).size > 5 && r1.perFrame.some(x => JSON.parse(x)[8]))
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.cyborgTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 90) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = () => { reset(); H.move('cUltOpen'); const t = []; for (let i = 0; i < 320; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    // training reset clears Heat / overheat / marks / live projectiles / allowances
    reset(400); H.setHeat(88); H.move('cRack'); step(40); a()._cyborg.marks[9] = 50; a()._cyborg.djUsed = true; const live = H.projectiles().length > 0 && a()._cyborg.heat > 0
    H.reset(); step(1); const st = H.state(); const trainingClears = live && !(st.s?.heat > 0) && !st.s?.ovh && !Object.keys(st.s?.marks || {}).length && !st.s?.djUsed && H.projectiles().length === 0 && !H.ult().active
    // reset mid-ultimate
    reset(); H.move('cUltOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(60); H.reset(); step(1)
    const ultCleared = inUlt && !H.ult().active && !a().currentAttack && b().hitstun < 9000
    // identity change: a Cyborg with live state becomes another fighter → every Cyborg leftover is cleared
    reset(400); H.setHeat(50); H.move('cMissile'); step(30); const had = !!a()._cyborg && H.projectiles().length > 0
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const ident = { had, cy: !!a()._cyborg, proj: (__harness.cyborgTest.raw() && (window.__harness.cyborgTest.projectiles().length)) }; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, trainingClears, ultCleared, identityClears: ident.had && !ident.cy && ident.proj === 0, ident } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'trainingClears', 'ultCleared', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. live match: KO clears state, next round fresh
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=cyborg&p2=cyborg`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.cyborgTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.cyborgTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 420; B.vx = 0; H.setHeat(40) })
  await page.keyboard.down('d'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('d')
  await page.waitForFunction(() => __harness.cyborgTest.projectiles().length > 0, null, { timeout: 4000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ proj: __harness.cyborgTest.projectiles().length, heat: __harness.cyborgTest.raw()._cyborg?.heat }))
  await page.evaluate(() => { const H = __harness.cyborgTest, A = H.raw(), B = H.raw('p2'); A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; B.health = 1; B.x = A.x + 80; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true; B.invulnTimer = 0; B.hitstun = 120; B.isBlocking = false })
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  const ko = await page.evaluate(() => ({ p2hp: __harness.cyborgTest.raw('p2').health, s: __harness.cyborgTest.raw()._cyborg || null, proj: __harness.cyborgTest.projectiles().length }))
  ok('live keyboard Forward+Special fires a Straight Missile in a real match (Heat rises)', pre.proj > 0 && pre.heat > 4000, JSON.stringify(pre))
  ok('round-ending KO clears Cyborg state and his projectiles (round cleanup)', ko.p2hp <= 0 && !ko.s && ko.proj === 0, JSON.stringify({ hp: ko.p2hp, s: !!ko.s, proj: ko.proj }))
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.cyborgTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const f = __harness.cyborgTest.raw(), s = f._cyborg; return { gs: __harness.state().gameState, heat: s?.heat || 0, ovh: !!s?.ovh, marks: Object.keys(s?.marks || {}).length, dj: !!s?.djUsed, proj: __harness.cyborgTest.projectiles().length } })
  ok('next round starts at Heat 0, no overheat / marks / projectiles / used allowance', nr.heat === 0 && !nr.ovh && nr.marks === 0 && !nr.dj && nr.proj === 0, JSON.stringify(nr))
  // ── E. LAN: slot 2 Cyborg driven by injected remote input
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.cyborgTest; H.raw('p2').energy = 100
    const held = fr => fr >= 140 && fr < 180
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(fr === 8 ? { left: true, special: true } : fr === 80 ? { up: true, jump: true, special: true } : held(fr) ? { charge: true } : fr === 220 ? { jump: true, up: true } : fr === 232 ? { jump: true, up: true } : {}) })
    let missile = false, rack = false, vent = false, dj = false; for (let i = 0; i < 280; i++) { __harness.luffyTest.step(1); const s = H.state('p2'); missile ||= s.attack?.name === 'cMissile'; rack ||= s.attack?.name === 'cRack'; vent ||= s.attack?.name === 'cVent'; dj ||= !!s.s?.djUsed }
    const fr = __harness.net.frame(); __harness.net.end(); return { missile, rack, vent, dj, frame: fr, remote: !!H.raw('p2')._cyborgRemoteInput } })
  ok('LAN-injected slot-2 Cyborg: missile + rack + vent + thruster', lan.missile && lan.rack && lan.vent && lan.dj && lan.frame >= 280, JSON.stringify(lan)); out.lan = lan
  // ── F. controller / raw parity (Square Light, Triangle Heavy, Cross Jump, Circle Block, R1 Special, R2 Ultimate, L2 Vent, D-pad)
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.cyborgTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    const seq = [[2, { light: true }], [12, { light: true }], [24, { light: true }], [90, { special: true }], [150, { right: true, special: true }], [230, { down: true, special: true }],
      ...Array.from({ length: 40 }, (_, k) => [300 + k, { charge: true }]), [450, { heavy: true }], [520, { right: true, heavy: true }], [600, { ultimate: true }]]
    const PAD = { right: 15, up: 12, down: 13, left: 14, special: 5, light: 2, heavy: 3, jump: 0, block: 1, ultimate: 7, charge: 6 }
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; H.setHeat(0); __harness.luffyTest.step(1)
      const trace = []; for (let i = 0; i < 760; i++) { if (i === 590) a.energy = 100; const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }
        else if (mode === 'raw') writeRawControls(a, e)
        __harness.luffyTest.step(1); trace.push([a.currentAttack?.cy?.key || a.currentAttack?.name || null, a._cyborg?.heat || 0, a._cyborg?.djUsed || false, b.health]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))]
    const firstDiff = raw.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(pad[i]))
    // JUMP / THRUSTER separately: on the keyboard W is Up AND Jump, so Cyborg's UP_GRACE (Up held 1-2 f before Special = Missile
    // Rack, never a jump) delays a tapped W jump by up to 3 f; the pad's Cross is jump-only and fires at once. Both must jump and boost.
    const jumpRun = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1700; a.energy = 100; __harness.luffyTest.step(1); let liftAt = -1, djAt = -1
      for (let i = 0; i < 70; i++) { const e = i === 10 || i === 24 ? { jump: true } : {}; if (mode === 'pad') { __gp.buttons = btn(); if (e.jump) __gp.buttons[0] = { pressed: true, value: 1 } } else writeRawControls(a, e)
        __harness.luffyTest.step(1); if (liftAt < 0 && !(a.onGround || a.grounded)) liftAt = i; if (djAt < 0 && a._cyborg?.djUsed) djAt = i } __gp.buttons = btn(); return { liftAt, djAt } }
    const jr = jumpRun('raw'), jp = jumpRun('pad'); inputSettings.p1Type = 'keyboard'
    return { raw: { names: names(raw), hp: raw.at(-1)[3] }, pad: { names: names(pad), hp: pad.at(-1)[3] }, same: firstDiff < 0, firstDiff, at: firstDiff >= 0 ? [raw[firstDiff], pad[firstDiff]] : null, jump: { raw: jr, pad: jp } } })
  ok('gamepad path == raw path, frame for frame (chain, shot, missile, Mega, L2 vent, heavy, F+Heavy, R2 ultimate)', par.same && ['light', 'cJ2', 'cJ3', 'cSonic', 'cMissile', 'cMega', 'cVent', 'heavy', 'cAdv', 'cUltOpen'].every(k => par.raw.names.includes(k)), JSON.stringify(par))
  ok('jump + thruster on both paths: Cross jumps at once, keyboard W within the 3 f Up grace; both boost on the second press', par.jump.pad.liftAt === 10 && par.jump.raw.liftAt >= 10 && par.jump.raw.liftAt <= 13 && par.jump.pad.djAt === 24 && par.jump.raw.djAt === 24, JSON.stringify(par.jump))
  out.parity = par
  const rnd = await page.evaluate(() => __cyRandom); ok('no Math.random in cyborg*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/cyborg/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
