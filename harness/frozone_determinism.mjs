// harness/frozone_determinism.mjs — Frozone: replay frame identity (an input-only scenario exercising the Square chain,
// heavy cancel, Ice Lance, Black Ice → Frost Lance, Glacier Rush, Icebreaker, ICE SKATE, Rising Glacier, launcher →
// double jump → air strike / down-air, Chill pips and the ultimate), render-batching independence, ultimate determinism,
// lifecycle cleanup (training reset with a live patch / lance / freeze, mid-ultimate reset, identity change), live KO /
// next round, LAN slot-2 remote input, gamepad == raw parity and no Math.random in frozone*.js.
// Writes docs/frozone/determinism_results.json.     node harness/frozone_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d.length > 300 ? d.slice(0, 300) + '…' : d) }
async function open(p2 = 'frozone') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__fzRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/frozone\w*\.js/.test(st) && __fzRandom.length < 5) __fzRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=frozone&p2=${p2}&seed=66125`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.frozoneTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario. Reads state, never writes it. Keyboard W = up AND jump.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),S=a._frozone||{stats:{}},A=a.currentAttack,idle=!a.attacking&&(a.onGround||a.grounded)&&!(a.hitstun>0),fw=b.x>=a.x?'right':'left',bk=b.x>=a.x?'left':'right';t++
 const next=()=>{ph++;t=0}
 const need=e=>{if(a.energy<e){if(idle)r.charge=true;return false}return true}
 const near=d=>{if(gap>d){r[fw]=true;return false}return true}
 const away=d=>{if(gap<d){r[bk]=true;return false}return true}
 switch(ph){
  case 0: if(near(100))next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===8){r.light=true;next()}break
  case 3: if(t===10){r.light=true;next()}break
  case 4: if(t>40&&idle&&near(100)){r.light=true;next()}break
  case 5: if(t===8){r.heavy=true;next()}break
  case 6: if(t>50&&idle&&need(15)&&away(260)){r.special=true;next()}break
  case 7: if(t>40&&idle&&need(18)&&!S.patch){r.down=true;r.special=true;next()}break
  case 8: if(t>30&&idle&&need(15)){r.special=true;next()}break
  case 9: if(t>40&&idle&&need(20)){r[fw]=true;r.special=true;next()}break
  case 10: if(t>40&&idle&&need(25)&&near(110)){r[bk]=true;r.special=true;next()}break
  case 11: if(t>40&&idle&&away(320)){r[fw]=true;r.dash=true;next()}break
  case 12: if(t===4){r[fw]=true;next()}break
  case 13: if(t>30&&idle&&need(20)){r.up=r.jump=true;r.special=true;next()}break
  case 14: if(t>60&&idle&&near(100)){r.upAttack=true;next()}break
  case 15: if(A?.name==='fLaunch'&&A.hasHit&&!(a.hitstop>0)){r.jump=true;next()}else if(t>80)next();break
  case 16: if(t===10){r.jump=true;next()}break
  case 17: if(t===4){r.light=true;next()}break
  case 18: if(t===18){r.heavy=true;next()}break
  case 19: if(t>60&&idle&&need(100)&&near(110)){r.ultimate=true;next()}else if(t>5000)next();break
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f.jumpCount,f.dashTimer,f.dashSpeed,f._frozone&&{...f._frozone,cues:undefined},f.currentAttack&&{...f.currentAttack}]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
const N = 4200
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig, N]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.frozoneTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set()
    for (let i = 0; i < N; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack) seen.add(a.currentAttack.fz?.key || a.currentAttack.name); if (H.ult().active) seen.add('ult')
      const st = a._frozone?.stats || {}; for (const k of ['frost', 'chill', 'skates', 'dj', 'ultDone', 'patchHits', 'freezes']) if (st[k]) seen.add(k)
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], stats: a._frozone?.stats, rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG, N])
  const need = ['light', 'fL2', 'fL3', 'heavy', 'fLance', 'fBlackIce', 'frost', 'fRush', 'fBreaker', 'skates', 'fRise', 'fLaunch', 'dj', 'air', 'fDownAir', 'chill', 'ultOpen', 'ult']
  ok('recorded scenario exercises chain / cancel / every special / Frost Lance / skate / launcher → double jump → air / Chill / ultimate', need.every(k => rec.seen.includes(k)), JSON.stringify({ missing: need.filter(k => !rec.seen.includes(k)), seen: rec.seen, stats: rec.stats }))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.frozoneTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote: !!H.raw()._frozoneRemoteInput } }, [N, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok(`replay matches every authoritative frame (${N})`, first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Frozone as remote-driven', pb.remote)
  out.replay = { frames: N, identical: true, exercised: rec.seen, stats: rec.stats }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.frozoneTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2400; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._frozone?.clock, a.currentAttack?.name, a._frozone?.patch, a._frozone?.freeze, a._frozone?.chill])) } return t }
    run(() => __harness.luffyTest.step(4))   // warm-up (camera settle), discarded
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live (moves ran, P2 took damage)', r1.perFrame.some(x => JSON.parse(x)[7]) && JSON.parse(r1.perFrame.at(-1))[5] < 1050)
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.frozoneTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 110) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.invulnTimer = 0; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = () => { reset(); H.move('ultOpen'); const t = []; for (let i = 0; i < 300; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    const rec = () => { for (let i = 0; i < 60 && a().attacking; i++) step(1) }
    // training reset with a live patch, a lance in flight and a frozen opponent
    reset(280); H.move('fBlackIce'); rec(); H.chill(2); H.move('fLance'); for (let i = 0; i < 40 && !a()._frozone?.freeze; i++) step(1)
    const s0 = a()._frozone, had = { patch: !!s0?.patch, freeze: !!s0?.freeze, stun: b().hitstun }
    H.reset(); step(1); const st = H.state()
    const trainingClears = had.freeze && !st.attack && !st.s?.patch && !st.s?.freeze && !H.projectiles().length && !H.ult().active && b().hitstun === 0
    reset(); H.move('ultOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(60); H.reset(); step(1)
    const ultCleared = inUlt && !H.ult().active && !a().currentAttack && b().hitstun < 9000
    reset(600); H.move('fBlackIce'); step(30); const had2 = !!a()._frozone?.patch
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const ident = { had2, fz: !!a()._frozone, proj: H.projectiles().length }; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, trainingClears, ultCleared, identityClears: had2 && !ident.fz && ident.proj === 0, had, ident } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'trainingClears', 'ultCleared', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. live match: KO clears state, next round fresh
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=frozone&p2=frozone`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.frozoneTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.frozoneTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 200; B.vx = 0 })
  await page.keyboard.down('d'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('d')
  await page.waitForFunction(() => { const s = __harness.frozoneTest.raw()._frozone?.stats; return s && s.rush > 0 && !__harness.frozoneTest.raw().attacking }, null, { timeout: 8000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ stats: __harness.frozoneTest.raw()._frozone?.stats, p2: __harness.frozoneTest.raw('p2').health }))
  await page.evaluate(() => { const H = __harness.frozoneTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; B.x = A.x + 600; H.move('fBlackIce') })
  await page.waitForFunction(() => !!__harness.frozoneTest.raw()._frozone?.patch, null, { timeout: 3000 }).catch(() => {})
  await page.evaluate(() => { const H = __harness.frozoneTest, A = H.raw(), B = H.raw('p2'); A.attacking = false; A.currentAttack = null; A.attackCooldown = 0; B.invulnTimer = 0; B.health = 1; B.x = A.x - 80; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true; A.facing = -1 })
  const hadLive = await page.evaluate(() => !!__harness.frozoneTest.raw()._frozone?.patch)
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  const ko = await page.evaluate(() => ({ p2hp: __harness.frozoneTest.raw('p2').health }))
  ok('live keyboard Forward+Special = Glacier Rush in a real match (P2 damaged)', pre.stats?.rush >= 1 && pre.p2 < 1050, JSON.stringify(pre))
  ok('round-ending KO with a live patch', hadLive && ko.p2hp <= 0, JSON.stringify({ hadLive, hp: ko.p2hp }))
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.frozoneTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const f = __harness.frozoneTest.raw(), s = f._frozone; return { gs: __harness.state().gameState, patch: !!s?.patch, freeze: !!s?.freeze, chill: Object.keys(s?.chill || {}).length, atk: f.currentAttack?.fz?.key || null, proj: __harness.frozoneTest.projectiles().length } })
  ok('next round starts clean: no patch, freeze, Chill, projectile or Frozone attack', !nr.patch && !nr.freeze && !nr.chill && !nr.atk && !nr.proj, JSON.stringify(nr))
  // ── E. LAN: slot 2 Frozone driven by injected remote input (P2 faces left → its Forward is Left, Back is Right)
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.frozoneTest; H.raw('p2').energy = 100
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(fr === 8 ? { special: true } : fr === 90 ? { down: true, special: true } : fr === 170 ? { left: true, special: true } : fr === 250 ? { right: true, special: true } : fr === 340 ? { up: true, jump: true, special: true } : fr === 400 ? { left: true, dash: true } : {}) })
    const seen = new Set(); for (let i = 0; i < 440; i++) { if (i % 80 === 0) H.raw('p2').energy = 100; __harness.luffyTest.step(1); const s = H.state('p2'); if (s.attack?.fz) seen.add(s.attack.fz.key); if (s.s?.stats?.skates) seen.add('skate') }
    const fr = __harness.net.frame(); __harness.net.end(); return { seen: [...seen], frame: fr, remote: !!H.raw('p2')._frozoneRemoteInput } })
  ok('LAN-injected slot-2 Frozone (faces left: Left = Forward): Lance + Black Ice + Rush + Icebreaker + Rising Glacier + skate', ['fLance', 'fBlackIce', 'fRush', 'fBreaker', 'fRise', 'skate'].every(k => lan.seen.includes(k)) && lan.frame >= 400, JSON.stringify(lan)); out.lan = lan
  // ── F. controller / raw parity
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.frozoneTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    const seq = [[2, { light: true }], [10, { light: true }], [20, { light: true }], [90, { special: true }], [170, { right: true, special: true }], [260, { down: true, special: true }],
      [340, { up: true, jump: true, special: true }], [430, { left: true, special: true }], [520, { down: true, light: true }],
      [600, { heavy: true }], [680, { up: true, jump: true, heavy: true }], [800, { ultimate: true }]]
    const PAD = { right: 15, up: 12, down: 13, left: 14, special: 5, light: 2, heavy: 3, jump: 0, block: 1, ultimate: 7, charge: 6, grab: 4 }
    const setPad = e => { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }
    const fresh = (gap = 100) => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; __harness.luffyTest.step(1); return [a, b] }
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; const [a, b] = fresh()
      const trace = []; for (let i = 0; i < 1100; i++) { if (i === 790) a.energy = 100; if ([80, 160, 250, 330, 420, 510, 590, 670, 760].includes(i)) { H.reset(); a.x = 1300; a.facing = 1; b.facing = -1; a.energy = 100; b.health = b.maxHealth; b.x = a.x + 110 }
        const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') setPad(e); else writeRawControls(a, e)
        __harness.luffyTest.step(1); const s = a._frozone; trace.push([a.currentAttack?.fz?.key || a.currentAttack?.name || null, Math.round(a.x), b.health, !!s?.patch, s?.freeze?.side || null]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))]
    const firstDiff = raw.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(pad[i]))
    return { raw: { names: names(raw), hp: raw.at(-1)[2] }, pad: { names: names(pad), hp: pad.at(-1)[2] }, same: firstDiff < 0, firstDiff, at: firstDiff >= 0 ? [raw[firstDiff], pad[firstDiff]] : null } })
  ok('gamepad path == raw path, frame for frame (□ chain, R1 / →R1 / ↓R1 / ↑R1 / ←R1, ↓□, △, ↑△, R2)', par.same && ['light', 'fL2', 'fL3', 'fLance', 'fRush', 'fBlackIce', 'fRise', 'fBreaker', 'fLow', 'heavy', 'fLaunch', 'ultOpen'].every(k => par.raw.names.includes(k)), JSON.stringify(par))
  out.parity = par
  const rnd = await page.evaluate(() => __fzRandom); ok('no Math.random in frozone*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/frozone/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
