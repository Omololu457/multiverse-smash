// harness/starfire_determinism.mjs — Starfire: replay frame identity (an input-only scenario exercising the chain, every
// special incl. Star Sight / Prism Break, levitation, the air moves and the ultimate), render-batching independence,
// ultimate determinism, lifecycle cleanup (training reset, mid-ultimate reset, identity change, KO / next round), LAN
// slot-2 remote input, gamepad == raw parity (Square / Triangle / Cross / Circle / R1 / R2 / L2 + D-pad), and no
// Math.random in starfire*.js.
// Writes docs/starfire/determinism_results.json.        node harness/starfire_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d) }
async function open(p2 = 'starfire') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__sfRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/starfire\w*\.js/.test(st) && __sfRandom.length < 5) __sfRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=starfire&p2=${p2}&seed=66124`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.starfireTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),idle=!a.attacking&&(a.onGround||a.grounded)&&!(a.hitstun>0)&&!a._starfire?.lev,fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right';t++
 const next=()=>{ph++;t=0}
 switch(ph){
  case 0: if(gap>100)r[fw]=true;else next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===10){r.light=true;next()}break
  case 3: if(t===14){r.light=true;next()}break
  case 4: if(t>50&&idle&&a.energy>=10){r.special=true;next()}break                                   // Starbolt
  case 5: if(t>20&&idle&&a.energy>=30){if(gap<340)r[bk]=true;else{r.down=true;r.special=true;next()}}break   // back off, then Orbital Star
  case 6: if(t>30&&idle){r[bk]=true;r.special=true;next()}break                                      // Star Sight through the orb → Prism Break
  case 7: if(t>60&&idle&&a.energy>=15){if(gap>140)r[fw]=true;else{r[fw]=true;r.special=true;next()}}break   // Solar Rush
  case 8: if(t>60&&idle&&a.energy>=16){r.up=r.jump=true;r.special=true;next()}break                   // Skybreak (W = up AND jump)
  case 9: if(t>60&&idle&&a.energy>=12){r.jump=true;r.up=true;next()}break                             // jump (with Comet Energy banked)
  case 10: if(t===8){r.jump=true;r.up=true}if(t===14){r.special=true;next()}break                      // double jump + Comet Shot
  case 11: if(t>50&&idle&&a.energy>=14){r.charge=true;next()}break                                   // levitation on
  case 12: if(t>4&&t<30)r.up=true;if(t===34){r.charge=true;next()}break                             // rise, tap off
  case 13: if(t>40&&idle&&a.energy>=14){r.jump=true;r.up=true;next()}break
  case 14: if(t===10){r[bk]=true;r.special=true;next()}break                                         // air Star Sight
  case 15: if(t>50&&idle){if(gap>90)r[fw]=true;else{r.down=true;r.light=true;next()}}break           // Low
  case 16: if(t>40&&idle){r.upAttack=true;next()}break                                             // launcher
  case 17: if(t>60&&idle&&a.energy>=100){if(gap>110)r[fw]=true;else{r.ultimate=true;next()}}else if(t>4500)next();break   // ultimate (waits for 100)
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._starfire,f.currentAttack&&{...f.currentAttack},f._sfPose||null]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.starfireTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set()
    for (let i = 0; i < 8000; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack) seen.add(a.currentAttack.sf?.key || a.currentAttack.name); if (a._starfire?.lev) seen.add('lev'); if (a._starfire?.stats?.prisms) seen.add('prism'); if (H.ult().active) seen.add('ult')
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], stats: a._starfire?.stats, rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG])
  ok('recorded scenario exercises chain / every special / prism / levitation / air moves / ultimate', ['light', 'sfJ2', 'sfJ3', 'sfBolt', 'sfOrb', 'sfLaser', 'prism', 'sfRush', 'sfSky', 'sfComet', 'lev', 'sfAirLaser', 'sfLow', 'up', 'sfUltOpen', 'ult'].every(k => rec.seen.includes(k)), JSON.stringify(rec.seen))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.starfireTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote: !!H.raw()._starfireRemoteInput } }, [8000, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok('replay matches every authoritative frame (8000)', first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Starfire as remote-driven', pb.remote)
  out.replay = { frames: 8000, identical: true, exercised: rec.seen, stats: rec.stats }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.starfireTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2800; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._starfire?.clock, a.currentAttack?.name, a.currentAttack?.sf?.aim])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live (moves ran, the foe was hit)', r1.perFrame.some(x => JSON.parse(x)[7]) && new Set(r1.perFrame.map(x => JSON.parse(x)[5])).size > 2)
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.starfireTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 200) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = () => { reset(); H.move('sfUltOpen'); const t = []; for (let i = 0; i < 320; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    reset(400); H.move('sfOrb'); step(30); a()._starfire.cometUsed = true; a()._starfire.laserUsed = true; const live = H.projectiles().length > 0
    H.reset(); step(1); const st = H.state(); const trainingClears = live && !st.s?.cometUsed && !st.s?.laserUsed && !st.s?.lev && H.projectiles().length === 0 && !H.ult().active
    reset(); H.move('sfUltOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(60); H.reset(); step(1)
    const ultCleared = inUlt && !H.ult().active && !a().currentAttack && b().hitstun < 9000
    reset(400); H.move('sfBolt'); step(20); const had = !!a()._starfire && H.projectiles().length > 0
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const ident = { had, sf: !!a()._starfire, proj: (window.__harness.starfireTest.projectiles().length) }; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, trainingClears, ultCleared, identityClears: ident.had && !ident.sf && ident.proj === 0, ident } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'trainingClears', 'ultCleared', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. live match: KO clears state, next round fresh
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=starfire&p2=starfire`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.starfireTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.starfireTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 420; B.vx = 0 })
  await page.keyboard.down('s'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('s')
  await page.waitForFunction(() => __harness.starfireTest.projectiles().length > 0, null, { timeout: 4000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ proj: __harness.starfireTest.projectiles().map(p => p.kind) }))
  await page.evaluate(() => { const H = __harness.starfireTest, A = H.raw(), B = H.raw('p2'); A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; B.health = 1; B.x = A.x + 80; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true; B.invulnTimer = 0; B.hitstun = 120; B.isBlocking = false })
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  const ko = await page.evaluate(() => ({ p2hp: __harness.starfireTest.raw('p2').health, s: __harness.starfireTest.raw()._starfire || null, proj: __harness.starfireTest.projectiles().length }))
  ok('live keyboard Down+Special fires an Orbital Star in a real match', pre.proj.includes('orb'), JSON.stringify(pre))
  ok('round-ending KO clears Starfire state and her projectiles (round cleanup)', ko.p2hp <= 0 && !ko.s && ko.proj === 0, JSON.stringify({ hp: ko.p2hp, s: !!ko.s, proj: ko.proj }))
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.starfireTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const f = __harness.starfireTest.raw(), s = f._starfire; return { gs: __harness.state().gameState, lev: !!s?.lev, comet: !!s?.cometUsed, sky: !!s?.skyUsed, live: s?.live?.length || 0, proj: __harness.starfireTest.projectiles().length } })
  ok('next round starts fresh: no levitation / used allowances / projectiles', !nr.lev && !nr.comet && !nr.sky && nr.live === 0 && nr.proj === 0, JSON.stringify(nr))
  // ── E. LAN: slot 2 Starfire driven by injected remote input
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.starfireTest; H.raw('p2').energy = 100
    // slot 2 faces left: Back = right
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(fr === 8 ? { right: true, special: true } : fr === 90 ? { down: true, special: true } : fr === 150 ? { charge: true } : fr === 190 ? { charge: true } : {}) })
    let laser = false, orb = false, lev = false; for (let i = 0; i < 260; i++) { __harness.luffyTest.step(1); const s = H.state('p2'); laser ||= s.attack?.name === 'sfLaser'; orb ||= s.attack?.name === 'sfOrb'; lev ||= !!s.s?.lev }
    const fr = __harness.net.frame(); __harness.net.end(); return { laser, orb, lev, frame: fr, remote: !!H.raw('p2')._starfireRemoteInput } })
  ok('LAN-injected slot-2 Starfire: Star Sight + Orbital Star + levitation', lan.laser && lan.orb && lan.lev && lan.frame >= 260, JSON.stringify(lan)); out.lan = lan
  // ── F. controller / raw parity
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.starfireTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    const seq = [[2, { light: true }], [12, { light: true }], [26, { light: true }], [90, { special: true }], [150, { right: true, special: true }], [220, { down: true, special: true }],
      [290, { left: true, special: true }], [360, { charge: true }], [390, { charge: true }], [450, { heavy: true }], [520, { down: true, light: true }], [600, { ultimate: true }]]
    const PAD = { right: 15, up: 12, down: 13, left: 14, special: 5, light: 2, heavy: 3, jump: 0, block: 1, ultimate: 7, charge: 6 }
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; __harness.luffyTest.step(1)
      const trace = []; for (let i = 0; i < 760; i++) { if (i === 590) a.energy = 100; const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }
        else if (mode === 'raw') writeRawControls(a, e)
        __harness.luffyTest.step(1); trace.push([a.currentAttack?.sf?.key || a.currentAttack?.name || null, !!a._starfire?.lev, b.health]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))]
    const firstDiff = raw.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(pad[i]))
    return { raw: { names: names(raw), hp: raw.at(-1)[2], lev: raw.some(x => x[1]) }, pad: { names: names(pad), hp: pad.at(-1)[2], lev: pad.some(x => x[1]) }, same: firstDiff < 0, firstDiff, at: firstDiff >= 0 ? [raw[firstDiff], pad[firstDiff]] : null } })
  ok('gamepad path == raw path, frame for frame (□ chain, R1 bolt, →R1 rush, ↓R1 orb, ←R1 Star Sight, L2 levitation, △ heavy, ↓□ low, R2 ultimate)', par.same && ['light', 'sfJ2', 'sfJ3', 'sfBolt', 'sfRush', 'sfOrb', 'sfLaser', 'heavy', 'sfLow', 'sfUltOpen'].every(k => par.raw.names.includes(k)) && par.raw.lev, JSON.stringify(par))
  out.parity = par
  const rnd = await page.evaluate(() => __sfRandom); ok('no Math.random in starfire*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/starfire/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
