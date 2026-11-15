// harness/higuruma_determinism.mjs — Hiromi Higuruma: replay frame identity (an input-only adaptive scenario exercising the
// small-gavel chain, giant overhead, extended lash, low check, launcher → jump → double jump → air swing, every special,
// Objection, a Case File → Precedent dash cancel and Deadly Sentencing), render-batching independence, ultimate determinism,
// lifecycle cleanup (training reset with a live case + token, mid-ultimate reset, identity change, KO / next round), LAN
// slot-2 remote input, gamepad == raw parity, and no Math.random in higuruma*.js. Adapted from robin_determinism.mjs.
// Writes docs/higuruma/determinism_results.json.        node harness/higuruma_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d.length > 300 ? d.slice(0, 300) + '…' : d) }
async function open(p2 = 'higuruma') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__hgRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/higuruma\w*\.js/.test(st) && __hgRandom.length < 5) __hgRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=higuruma&p2=${p2}&seed=66124`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.higurumaTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario. Reads state, never writes it. Keyboard W = up AND jump. Double-tap = two `dash` edges.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),S=a._higuruma||{stats:{}},A=a.currentAttack,idle=!a.attacking&&(a.onGround||a.grounded)&&!(a.hitstun>0),fw=b.x>=a.x?'right':'left',bk=b.x>=a.x?'left':'right';t++
 const next=()=>{ph++;t=0}
 const need=e=>{if(a.energy<e){if(idle)r.charge=true;return false}return true}
 const near=d=>{if(gap>d){r[fw]=true;return false}return true}
 const away=d=>{if(gap<d){r[bk]=true;return false}return true}
 const cl=()=>A&&A.hg&&A.hg.clean
 switch(ph){
  case 0: if(near(80))next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(cl()){r.light=true;next()}else if(t>30)next();break
  case 3: if(A&&A.name==='hJ2'&&cl()){r.light=true;next()}else if(t>40)next();break                         // chop → straight → spinning close
  case 4: if(t>40&&idle&&near(80)){r[fw]=true;r.heavy=true;next()}break                                      // extended lash (REACH)
  case 5: if(t>40&&idle&&near(85)){r.heavy=true;next()}break                                                 // giant overhead (WEIGHT)
  case 6: if(t>50&&idle&&near(60)){r.down=true;r.light=true;next()}break                                     // low check
  case 7: if(cl()){r.upAttack=true;next()}else if(t>30)next();break                                          // → launcher
  case 8: if(!(a.onGround||a.grounded)&&a.jumpCount>=1){next()}else if(A&&A.name==='up'&&cl()&&A.timer<=19&&t%12===1){r.jump=r.up=true}else if(t>90)next();break   // jump-cancel (single taps with a real release gap)
  case 9: if(a.jumpCount>=2){next()}else if(t===10&&!(a.onGround||a.grounded)){r.jump=r.up=true}else if(t>40)next();break   // double jump (fresh press after a release)
  case 10: if(t===2){r.light=true;next()}break                                                               // air swing
  case 11: if(t>50&&idle&&need(12)&&away(180)){r.special=true;next()}break                                   // Extension of the Court
  case 12: if(t>40&&idle&&need(16)&&near(140)){r[fw]=true;r.special=true;next()}break                        // Cross-Examination
  case 13: if(t>40&&idle&&need(16)){r.up=r.jump=true;r.special=true;next()}break                             // Rising Objection
  case 14: if(t>50&&idle&&need(20)&&near(80)){r.down=true;r.special=true;next()}break                        // Order in the Court
  case 15: if(t>50&&idle&&need(15)){r[bk]=true;r.special=true;next()}break                                   // Objection (whiff)
  case 16: if(t>50&&idle&&near(80)){r.light=true;next()}break                                                // rebuild the case: CLOSE
  case 17: if(t>40&&idle&&near(85)){r[fw]=true;r.heavy=true;next()}break                                     // REACH
  case 18: if(t>40&&idle&&near(85)){r.heavy=true;next()}else if(t>300)next();break                           // WEIGHT → token
  case 19: if(A&&A.name==='heavy'&&cl()&&A.timer<=Math.floor((A.total-A.activeEnd)*0.35)){r[fw]=true;r.dash=true;next()}else if(!A&&t>5)next();break
  case 20: if(t===2){r[fw]=true;r.dash=true;next()}break                                                     // Precedent double-tap
  case 21: if(t===6){r.light=true;next()}break
  case 22: if(t>60&&idle&&need(100)&&near(85)){r.ultimate=true;next()}else if(t>4000)next();break            // Deadly Sentencing
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f.jumpCount,f._hgPose,f._higuruma&&{...f._higuruma,cues:undefined},f.currentAttack&&{...f.currentAttack}]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
const N = 5600
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig, N]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.higurumaTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set()
    for (let i = 0; i < N; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack) seen.add(a.currentAttack.name); if (H.ult().active) seen.add('ult')
      const st = a._higuruma?.stats || {}; for (const k of ['tokens', 'precedents', 'dj']) if (st[k]) seen.add(k)
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], stats: a._higuruma?.stats, rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG, N])
  const WANT = ['light', 'hJ2', 'hJ3', 'hPoke', 'heavy', 'hLow', 'up', 'air', 'hExt', 'hCross', 'hRise', 'hOrder', 'hObj', 'tokens', 'precedents', 'dj', 'ultOpen', 'ult']
  ok('recorded scenario exercises chain / lash / giant / low / launcher / double jump / air / all specials / Case File → Precedent / ultimate',
    WANT.every(k => rec.seen.includes(k)), JSON.stringify({ missing: WANT.filter(k => !rec.seen.includes(k)), seen: rec.seen, stats: rec.stats }))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.higurumaTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote: !!H.raw()._higurumaRemoteInput } }, [N, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok(`replay matches every authoritative frame (${N})`, first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Higuruma as remote-driven', pb.remote)
  out.replay = { frames: N, identical: true, exercised: rec.seen, stats: rec.stats }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.higurumaTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2400; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._higuruma?.tick, a.currentAttack?.name, a._higuruma?.caseFile, a._higuruma?.token])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live (moves ran, P2 took damage)', r1.perFrame.some(x => JSON.parse(x)[7]) && JSON.parse(r1.perFrame.at(-1))[5] < 1080)
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.higurumaTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 85) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = () => { reset(); H.move('ultOpen'); const t = []; for (let i = 0; i < 360; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    reset(); H.setCase({ close: true, reach: true }, 1); const had = { case: !!a()._higuruma?.caseFile?.close, tok: a()._higuruma?.token }
    H.reset(); step(1); const st = H.state(); const trainingClears = had.case && had.tok === 1 && !st.attack && !st.s?.caseFile?.close && !st.s?.token && !H.ult().active
    reset(); H.move('ultOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(60); H.reset(); step(1)
    const ultCleared = inUlt && !H.ult().active && !a().currentAttack && b().hitstun < 9000
    reset(); H.setCase({ close: true }, 1); const had2 = !!a()._higuruma
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const gone = !a()._higuruma; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, trainingClears, ultCleared, identityClears: had2 && gone, had } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'trainingClears', 'ultCleared', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. live match: KO clears state, next round fresh
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=higuruma&p2=higuruma`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.higurumaTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.higurumaTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 110; B.vx = 0 })
  await page.keyboard.down('d'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('d')
  await page.waitForFunction(() => { const s = __harness.higurumaTest.raw()._higuruma?.stats; return s && s.cross > 0 && !__harness.higurumaTest.raw().currentAttack }, null, { timeout: 8000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ stats: __harness.higurumaTest.raw()._higuruma?.stats, p2: __harness.higurumaTest.raw('p2').health }))
  ok('live keyboard Forward+Special = Cross-Examination in a real match (P2 damaged)', pre.stats?.cross >= 1 && pre.p2 < 1080, JSON.stringify(pre))
  await page.evaluate(() => { const H = __harness.higurumaTest, A = H.raw(), B = H.raw('p2'); H.setCase({ close: true, reach: true }, 1); A.attacking = false; A.currentAttack = null; A.attackCooldown = 0; A.hitstun = 0; B.health = 1; B.x = A.x + 70; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true })
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  const ko = await page.evaluate(() => ({ p2hp: __harness.higurumaTest.raw('p2').health }))
  ok('round-ending KO lands', ko.p2hp <= 0, JSON.stringify(ko))
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.higurumaTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const f = __harness.higurumaTest.raw(), s = f._higuruma; return { gs: __harness.state().gameState, case: s?.caseFile, token: s?.token || 0, atk: f.currentAttack?.name || null, ult: __harness.higurumaTest.ult().active } })
  ok('next round / result starts clean: empty case, no token, no attack, no cinematic', !nr.token && !(nr.case?.close || nr.case?.reach || nr.case?.weight) && !nr.atk && !nr.ult, JSON.stringify(nr))
  // ── E. LAN: slot 2 Higuruma driven by injected remote input (P2 faces left → Forward is Left, Back is Right)
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.higurumaTest; H.raw('p2').energy = 100
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(fr === 8 ? { special: true } : fr === 80 ? { down: true, special: true } : fr === 170 ? { left: true, special: true } : fr === 260 ? { right: true, special: true } : fr === 330 ? { up: true, jump: true, special: true } : {}) })
    const seen = new Set(); for (let i = 0; i < 420; i++) { if (i === 150 || i === 250 || i === 320) H.raw('p2').energy = 100; __harness.luffyTest.step(1); const s = H.state('p2'); if (s.attack) seen.add(s.attack.name) }
    const fr = __harness.net.frame(); __harness.net.end(); return { seen: [...seen], frame: fr, remote: !!H.raw('p2')._higurumaRemoteInput } })
  ok('LAN-injected slot-2 Higuruma: extension + order + cross + objection + rising', ['hExt', 'hOrder', 'hCross', 'hObj', 'hRise'].every(k => lan.seen.includes(k)) && lan.frame >= 400, JSON.stringify(lan)); out.lan = lan
  // ── F. controller / raw parity
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.higurumaTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    const seq = [[2, { light: true }], [10, { light: true }], [22, { light: true }], [90, { special: true }], [160, { right: true, special: true }], [260, { down: true, special: true }],
      [350, { up: true, jump: true, special: true }], [430, { left: true, special: true }], [500, { heavy: true }], [580, { right: true, heavy: true }], [650, { down: true, heavy: true }],
      [730, { up: true, jump: true, heavy: true, padNoJump: true }], [800, { down: true, light: true }], [860, { jump: true }], [868, { jump: true }], [874, { light: true }], [960, { ultimate: true }],
      ...Array.from({ length: 20 }, (_, k) => [1300 + k, { charge: true }])]
    const PAD = { right: 15, up: 12, down: 13, left: 14, special: 5, light: 2, heavy: 3, jump: 0, block: 1, ultimate: 7, charge: 6, grab: 4 }
    const setPad = e => { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null && !(k === 'jump' && e.padNoJump)) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }   // Up + △ on the pad = D-pad Up + Triangle (keyboard W is Up AND Jump)
    const fresh = (gap = 80) => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; __harness.luffyTest.step(1); return [a, b] }
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; const [a, b] = fresh()
      const trace = []; for (let i = 0; i < 1340; i++) { if ([150, 250, 340, 420, 950].includes(i)) { a.energy = 100; b.x = a.x + 80 * a.facing; b.health = b.maxHealth }
        const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') setPad(e); else writeRawControls(a, e)
        __harness.luffyTest.step(1); trace.push([a.currentAttack?.name || null, Math.round(a.x), Math.round(a.y), b.health, a.energy, JSON.stringify(a._higuruma?.caseFile)]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))]
    const firstDiff = raw.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(pad[i]))
    return { raw: { names: names(raw), hp: raw.at(-1)[3] }, pad: { names: names(pad), hp: pad.at(-1)[3] }, same: firstDiff < 0, firstDiff, at: firstDiff >= 0 ? [raw[firstDiff], pad[firstDiff]] : null } })
  ok('gamepad path == raw path, frame for frame (□ chain, R1 / →R1 / ↓R1 / ↑R1 / ←R1, △ / →△ / ↓△ / ↑△ (keyboard W+K / pad D-pad↑+△), ↓□, ✕✕ + air □, R2, L2)',
    par.same && ['light', 'hJ2', 'hJ3', 'hExt', 'hCross', 'hOrder', 'hRise', 'hObj', 'heavy', 'hPoke', 'hSweep', 'up', 'hLow', 'air', 'ultOpen'].every(k => par.raw.names.includes(k)), JSON.stringify(par))
  out.parity = par
  const rnd = await page.evaluate(() => __hgRandom); ok('no Math.random in higuruma*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/higuruma/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
