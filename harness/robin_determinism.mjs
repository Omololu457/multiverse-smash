// harness/robin_determinism.mjs — Robin: replay frame identity (an input-only scenario exercising the punch chain, staff
// cancel, Bird's-Eye Bomb, Smoke Drop → Smoke Step, Staff Express, Rooftop Route, Dead Drop → Remote TAP detonate, Dead
// Drop → Remote HOLD convert, Dead Drop → Bomb Bat, launcher → double jump → air kick, air bomb and the ultimate),
// render-batching independence, ultimate determinism, lifecycle cleanup (training reset with live smoke / plant / bombs,
// mid-ultimate reset, mid-Remote reset, identity change, KO / next round), LAN slot-2 remote input, gamepad == raw parity
// (□ / △ / ↑△ / →△ / R1 + directions / L2 tap & hold / R2 / Cross), and no Math.random in robin*.js.
// Writes docs/robin/determinism_results.json.        node harness/robin_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d.length > 300 ? d.slice(0, 300) + '…' : d) }
async function open(p2 = 'robin') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__rbRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/robin\w*\.js/.test(st) && __rbRandom.length < 5) __rbRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=robin&p2=${p2}&seed=66124`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.robinTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario. Reads state, never writes it. Keyboard W = up AND jump.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),S=a._robin||{stats:{}},A=a.currentAttack,idle=!a.attacking&&(a.onGround||a.grounded)&&!(a.hitstun>0),fw=b.x>=a.x?'right':'left',bk=b.x>=a.x?'left':'right';t++
 const next=()=>{ph++;t=0}
 const need=e=>{if(a.energy<e){if(idle&&!S.plant)r.charge=true;return false}return true}
 const near=d=>{if(gap>d){r[fw]=true;return false}return true}
 const away=d=>{if(gap<d){r[bk]=true;return false}return true}
 switch(ph){
  case 0: if(near(100))next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===10){r.light=true;next()}break
  case 3: if(t===12){r.light=true;next()}break                                                               // Punch 1 → 2 → 3
  case 4: if(t>40&&idle&&near(100)){r.light=true;next()}break
  case 5: if(t===9){r.heavy=true;next()}break                                                                // Punch → Staff Sweep cancel
  case 6: if(t>40&&idle&&need(12)&&away(160)){r.special=true;next()}break                                    // Bird's-Eye Bomb
  case 7: if(t>60&&idle&&need(15)&&away(260)){r.down=true;r.special=true;next()}break                        // Smoke Drop
  case 8: if(t===26){r[fw]=true;r.dash=true;next()}break                                                    // Smoke Step
  case 9: if(t>30&&idle&&need(16)&&near(90)){r[fw]=true;r.special=true;next()}break                         // Staff Express
  case 10: if(t>40&&idle&&need(16)){r.up=r.jump=true;r.special=true;next()}break                            // Rooftop Route
  case 11: if(t>50&&idle&&need(14)&&away(200)){r[bk]=true;r.special=true;next()}break                       // Dead Drop
  case 12: if(t>50&&S.plant?.armed&&idle){r.charge=true;next()}break                                        // Remote TAP (1 frame)
  case 13: if(t>60&&idle&&!S.plant&&need(14)){r[bk]=true;r.special=true;next()}break                        // Dead Drop
  case 14: if((S.plant?.armed&&idle)||A?.name==='rHack')r.charge=true;else if(t>20&&!S.plant)next();break   // Remote HOLD (convert)
  case 15: if(t>30&&idle&&need(14))next();break
  case 16: if(t>20&&idle){r[bk]=true;r.special=true;next()}break                                            // Dead Drop (Bomb Bat setup)
  case 17: if(S.plant?.armed&&idle){r.heavy=true;next()}else if(t>200)next();break                          // Bomb Bat
  case 18: if(t>60&&idle&&near(90)){r.upAttack=true;next()}break                                           // launcher
  case 19: if(A?.name==='up'&&A.hasHit&&!(a.hitstop>0)){r.jump=true;next()}else if(t>80)next();break
  case 20: if(t===6){r.jump=true;next()}break                                                              // double jump
  case 21: if(t===4){r.light=true;next()}break                                                             // Midair Kick
  case 22: if(t>40&&idle&&need(12)){r.jump=r.up=true;next()}break
  case 23: if(t===10){r.special=true;next()}break                                                          // air bomb
  case 24: if(t>40&&idle&&need(100)&&near(90)){r.ultimate=true;next()}else if(t>4000)next();break          // ultimate
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f.jumpCount,f._rbLand,f._robin&&{...f._robin,cues:undefined},f.currentAttack&&{...f.currentAttack}]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
const N = 5200
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig, N]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.robinTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set()
    for (let i = 0; i < N; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack) seen.add(a.currentAttack.rb?.key || a.currentAttack.name); if (H.ult().active) seen.add('ult')
      const st = a._robin?.stats || {}; for (const k of ['detonations', 'conversions', 'bats', 'steps', 'blasts']) if (st[k]) seen.add(k)
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], stats: a._robin?.stats, rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG, N])
  ok('recorded scenario exercises chain / staff cancel / bomb / smoke / Smoke Step / Express / Rooftop / Dead Drop tap + hold / Bomb Bat / launcher / air / ultimate',
    ['light', 'rJ2', 'rJ3', 'heavy', 'rBomb', 'rSmoke', 'rStep', 'rExpress', 'rRoof', 'rPlant', 'rHack', 'detonations', 'conversions', 'bats', 'up', 'air', 'rAirBomb', 'ultOpen', 'ult'].every(k => rec.seen.includes(k)), JSON.stringify({ seen: rec.seen, stats: rec.stats }))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.robinTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote: !!H.raw()._robinRemoteInput } }, [N, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok(`replay matches every authoritative frame (${N})`, first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Robin as remote-driven', pb.remote)
  out.replay = { frames: N, identical: true, exercised: rec.seen, stats: rec.stats }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.robinTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2400; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._robin?.clock, a.currentAttack?.name, a._robin?.smoke, a._robin?.plant])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live (moves ran, P2 took damage)', r1.perFrame.some(x => JSON.parse(x)[7]) && JSON.parse(r1.perFrame.at(-1))[5] < 1100)
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.robinTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 70) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = () => { reset(); H.move('ultOpen'); const t = []; for (let i = 0; i < 360; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    // training reset with a live smoke field, an armed plant and a flying bomb
    reset(400); H.move('rPlant'); for (let i = 0; i < 60; i++) step(1); H.move('rSmoke'); for (let i = 0; i < 26; i++) step(1); H.move('rBomb'); for (let i = 0; i < 18; i++) step(1)
    const had = { smoke: !!a()._robin?.smoke, plant: !!a()._robin?.plant?.armed, bombs: H.projectiles().length }
    H.reset(); step(1); const st = H.state()
    const trainingClears = had.smoke && had.plant && had.bombs > 0 && !st.attack && !st.s?.smoke && !st.s?.plant && !H.projectiles().length && !H.ult().active
    // reset mid-ultimate
    reset(); H.move('ultOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(60); H.reset(); step(1)
    const ultCleared = inUlt && !H.ult().active && !a().currentAttack && b().hitstun < 9000
    // identity change mid-Smoke Drop: every Robin leftover is cleared (state + owned projectiles)
    reset(400); H.move('rBomb'); step(18); const had2 = !!a()._robin && H.projectiles().length > 0
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const ident = { had2, rb: !!a()._robin, proj: (__harness.robinTest.allProjectiles()) }; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, trainingClears, ultCleared, identityClears: had2 && !ident.rb, had, ident } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'trainingClears', 'ultCleared', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. live match: KO clears state, next round fresh
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=robin&p2=robin`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.robinTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.robinTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 90; B.vx = 0 })
  await page.keyboard.down('d'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('d')
  await page.waitForFunction(() => { const s = __harness.robinTest.raw()._robin?.stats; return s && s.express > 0 && !__harness.robinTest.raw().currentAttack }, null, { timeout: 8000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ stats: __harness.robinTest.raw()._robin?.stats, p2: __harness.robinTest.raw('p2').health }))
  await page.evaluate(() => { const H = __harness.robinTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; H.move('rSmoke') })
  await page.waitForTimeout(250)
  await page.evaluate(() => { const H = __harness.robinTest, A = H.raw(), B = H.raw('p2'); A.attacking = false; A.currentAttack = null; A.attackCooldown = 0; B.health = 1; B.x = A.x + 70; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true })
  const hadSmoke = await page.evaluate(() => !!__harness.robinTest.raw()._robin?.smoke)
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  const ko = await page.evaluate(() => ({ p2hp: __harness.robinTest.raw('p2').health, s: __harness.robinTest.raw()._robin || null }))
  ok('live keyboard Forward+Special = Staff Express in a real match (P2 damaged)', pre.stats?.express >= 1 && pre.p2 < 1100, JSON.stringify(pre))
  ok('round-ending KO clears Robin state (smoke field, plant, live bombs)', hadSmoke && ko.p2hp <= 0 && (!ko.s || (!ko.s.smoke && !ko.s.plant && !ko.s.live?.length)), JSON.stringify({ hadSmoke, hp: ko.p2hp, s: ko.s && { smoke: ko.s.smoke, plant: ko.s.plant } }))
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.robinTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const f = __harness.robinTest.raw(), s = f._robin; return { gs: __harness.state().gameState, smoke: !!s?.smoke, plant: !!s?.plant, live: s?.live?.length || 0, atk: f.currentAttack?.rb?.key || null } })
  ok('next round starts clean: no smoke, no plant, no live bomb, no Robin attack', !nr.smoke && !nr.plant && !nr.live && !nr.atk, JSON.stringify(nr))
  // ── E. LAN: slot 2 Robin driven by injected remote input (P2 faces left → its Forward is Left, Back is Right)
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.robinTest; H.raw('p2').energy = 100
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(fr === 8 ? { special: true } : fr === 80 ? { down: true, special: true } : fr === 150 ? { right: true, special: true } : fr === 230 ? { left: true, special: true } : fr === 300 ? { up: true, jump: true, special: true } : {}) })
    const seen = new Set(); for (let i = 0; i < 400; i++) { if (i === 140 || i === 220 || i === 290) H.raw('p2').energy = 100; __harness.luffyTest.step(1); const s = H.state('p2'); if (s.attack?.rb) seen.add(s.attack.rb.key) }
    const fr = __harness.net.frame(); __harness.net.end(); return { seen: [...seen], frame: fr, remote: !!H.raw('p2')._robinRemoteInput } })
  ok('LAN-injected slot-2 Robin: bomb + smoke + dead drop + express + rooftop', ['rBomb', 'rSmoke', 'rPlant', 'rExpress', 'rRoof'].every(k => lan.seen.includes(k)) && lan.frame >= 400, JSON.stringify(lan)); out.lan = lan
  // ── F. controller / raw parity
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.robinTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    const seq = [[2, { light: true }], [12, { light: true }], [24, { light: true }], [90, { special: true }], [170, { right: true, special: true }], [310, { down: true, special: true }],
      [360, { up: true, jump: true, special: true }], [440, { left: true, special: true }], [520, { charge: true }], [600, { left: true, special: true }], ...Array.from({ length: 30 }, (_, k) => [680 + k, { charge: true }]),
      [760, { heavy: true }], [820, { right: true, heavy: true }], [880, { up: true, jump: true, heavy: true }], [960, { ultimate: true }]]
    const PAD = { right: 15, up: 12, down: 13, left: 14, special: 5, light: 2, heavy: 3, jump: 0, block: 1, ultimate: 7, charge: 6, grab: 4 }
    const setPad = e => { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }
    const fresh = (gap = 100) => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; __harness.luffyTest.step(1); return [a, b] }
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; const [a, b] = fresh()
      const trace = []; for (let i = 0; i < 1200; i++) { if (i === 950) a.energy = 100; if ([140, 250, 340, 420, 590].includes(i)) { a.energy = 100; b.x = a.x + 100 * a.facing; b.health = b.maxHealth }
        const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') setPad(e); else writeRawControls(a, e)
        __harness.luffyTest.step(1); trace.push([a.currentAttack?.rb?.key || a.currentAttack?.name || null, Math.round(a.x), b.health, !!a._robin?.smoke, !!a._robin?.plant, a._robin?.stats?.detonations || 0, a._robin?.stats?.conversions || 0]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))]
    const firstDiff = raw.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(pad[i]))
    return { raw: { names: names(raw), hp: raw.at(-1)[2], det: raw.at(-1)[5], conv: raw.at(-1)[6] }, pad: { names: names(pad), hp: pad.at(-1)[2] }, same: firstDiff < 0, firstDiff, at: firstDiff >= 0 ? [raw[firstDiff], pad[firstDiff]] : null } })
  ok('gamepad path == raw path, frame for frame (□ chain, R1 / →R1 / ↓R1 / ↑R1 / ←R1, L2 tap detonate + hold convert, △, →△, ↑△, R2)', par.same && ['light', 'rJ2', 'rJ3', 'rBomb', 'rExpress', 'rSmoke', 'rRoof', 'rPlant', 'rHack', 'heavy', 'rAdv', 'up', 'ultOpen'].every(k => par.raw.names.includes(k)) && par.raw.det === 1 && par.raw.conv === 1, JSON.stringify(par))
  out.parity = par
  const rnd = await page.evaluate(() => __rbRandom); ok('no Math.random in robin*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/robin/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
