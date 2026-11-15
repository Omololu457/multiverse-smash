// harness/batman_determinism.mjs — Batman (rebuilt): replay frame identity over an input-only adaptive scenario
// (chain, heavy, launcher, batarang, grapnel → rope kick, smoke, Gotham Airspace, Interceptor + Automaton orders via the
// L2 chord, rooftop, KNIGHTFALL), render-batching independence, a repeat run, snapshot purity (f._batman is plain JSON,
// every number finite, JSON round trip exact) + snapshot RESTORE mid-operation (restore → identical continuation),
// lifecycle cleanup (training reset mid-operation, mid-ultimate reset, identity change), replay marks Batman remote-driven,
// and no Math.random in the rebuilt batman*.js modules. Writes docs/batman/determinism_results.json.
//   node harness/batman_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d.length > 300 ? d.slice(0, 300) + '…' : d) }
const OWN = '\\/batman(State|Fx|Data|Kit|Skins|SkinTable|Sound|Sprites|Harness)?\\.js'
async function open() {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(own => { window.requestAnimationFrame = () => 0; const old = Math.random, re = new RegExp(own); window.__bmRandom = []
    Math.random = function () { const st = new Error().stack; if (re.test(st) && __bmRandom.length < 5) __bmRandom.push(st); return old() } }, OWN)
  await page.goto(server.base + '/index.html?harness=1&p1=batman&p2=batman&seed=66124', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.batmanTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario. Reads state, never writes it. Keyboard W = up AND jump. Orders = Charge held, then Special.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),S=a._batman||{stats:{},ops:[]},A=a.currentAttack,idle=!a.attacking&&(a.onGround||a.grounded)&&!(a.hitstun>0),fw=b.x>=a.x?'right':'left',bk=b.x>=a.x?'left':'right';t++
 const next=()=>{ph++;t=0}
 const need=e=>{if(a.energy<e){if(idle)r.charge=true;return false}return true}
 const near=d=>{if(gap>d){r[fw]=true;return false}return true}
 const away=d=>{if(gap<d){r[bk]=true;return false}return true}
 const cl=()=>A&&A.bm&&A.bm.clean
 const free=()=>!(S.ops&&S.ops.length)
 switch(ph){
  case 0: if(near(80))next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(cl()){r.light=true;next()}else if(t>30)next();break
  case 3: if(A&&A.name==='bL2'&&cl()){r.light=true;next()}else if(t>40)next();break
  case 4: if(t>40&&idle&&near(90)){r.heavy=true;next()}break
  case 5: if(t>50&&idle&&near(60)){r.upAttack=true;next()}break
  case 6: if(t>60&&idle&&need(8)&&away(220)){r.special=true;next()}break
  case 7: if(t>100&&idle&&need(14)&&near(240)){r[fw]=true;r.special=true;next()}break
  case 8: if(t>80&&idle&&need(16)){r.down=true;r.special=true;next()}break
  case 9: if(t>60&&idle&&need(35)&&away(200)){r[bk]=true;r.special=true;next()}break
  case 10: if(t>30&&free())next();break
  case 11: if(t>40&&idle&&need(25)){if(t<46)r.charge=true;else{r.charge=true;r.special=true;next()}}break
  case 12: if(t>30&&free())next();break
  case 13: if(t>40&&idle&&need(25)){if(t<46)r.charge=true;else{r.charge=true;r[bk]=true;r.special=true;next()}}break
  case 14: if(t>30&&free())next();break
  case 15: if(t>40&&idle&&need(12)){r.up=r.jump=true;r.special=true;next()}break
  case 16: if(t>60&&idle&&need(100)&&near(90)){r.ultimate=true;next()}else if(t>5000)next();break
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f.jumpCount,f.dashSpeed,f._bmPose,f._batman&&{...f._batman,cues:undefined},f.currentAttack&&{...f.currentAttack}]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
const N = 4600
try {
  let page = await open()
  const rec = await page.evaluate(async ([src, dig, N]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.batmanTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set(); let pure = true, bad = null
    const finite = (v, p) => { if (typeof v === 'number' && !Number.isFinite(v)) { bad = p; return false } if (typeof v === 'function') { bad = p; return false } if (v && typeof v === 'object') for (const k in v) if (!finite(v[k], p + '.' + k)) return false; return true }
    for (let i = 0; i < N; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack?.bm) seen.add(a.currentAttack.bm.key); if (H.ult().active) seen.add('ult'); for (const o of a._batman?.ops || []) seen.add('op:' + o.kind)
      if (a._batman?.stats?.ropeKicks) seen.add('ropeKick'); if (a._batman?.stats?.batHits) seen.add('batHit')
      if (pure && a._batman) { if (!finite(a._batman, 's')) pure = false; else if (JSON.stringify(JSON.parse(JSON.stringify(a._batman))) !== JSON.stringify(a._batman)) { pure = false; bad = 'roundtrip' } }
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], stats: a._batman?.stats, pure, bad, rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG, N])
  const WANT = ['light', 'bL2', 'bL3', 'heavy', 'up', 'bBatarang', 'batHit', 'bGrapnel', 'bRopeKick', 'ropeKick', 'bSmoke', 'cmdSky', 'op:airspace', 'cmdPoint', 'op:interceptor', 'cmdAuto', 'op:automaton', 'bRooftop', 'ultOpen', 'ult']
  ok('recorded scenario exercises chain / heavy / launcher / every gadget / Airspace / L2-chord orders / rooftop / KNIGHTFALL',
    WANT.every(k => rec.seen.includes(k)), JSON.stringify({ missing: WANT.filter(k => !rec.seen.includes(k)), seen: rec.seen }))
  ok('f._batman is plain JSON every frame (finite numbers, no functions, exact round trip)', rec.pure, rec.bad || '')
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.batmanTest, t = []; let remote = false; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); remote ||= !!H.raw()._batmanRemoteInput; t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote } }, [N, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok(`replay matches every authoritative frame (${N}) incl. fleet, payloads, ledgers`, first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Batman as remote-driven', pb.remote)
  out.replay = { frames: N, identical: true, exercised: rec.seen, stats: rec.stats }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  await page.close(); page = await open()   // fresh page: no replay-playback remnants
  // ── render batching + repeat run ──
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.batmanTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2800; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._batman?.tick, a.currentAttack?.name, a._batman?.ops?.map(o => [o.kind, o.t, o.m.map(m => [m.x, m.y, m.hp])]), a._batman?.pay?.length])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live (an operation ran, P2 took damage)', r1.perFrame.some(x => (JSON.parse(x)[8] || []).length) && JSON.parse(r1.perFrame.at(-1))[5] < 1150)
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── snapshot RESTORE mid-operation: capture → run 240 → restore → run 240 → identical ──
  const SR = await page.evaluate(dig => { const D = eval(dig), H = __harness.batmanTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    H.reset(); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0; f.comboTimer = 0 } step(1)
    H.move('cmdCarrier'); step(110)
    const KEYS = ['x', 'y', 'vx', 'vy', 'health', 'energy', 'hitstun', 'blockstun', 'hitstop', 'comboCounter', 'comboTimer', 'juggleCount', 'knockdownState', 'knockdownTimer', 'onGround', 'grounded', 'facing', 'isBlocking', 'invulnTimer', 'colorFlash', 'attacking', 'attackCooldown']
    const snap = () => JSON.stringify({ s: a._batman, at: a.currentAttack, f: [a, b].map(f => Object.fromEntries(KEYS.map(k => [k, f[k] ?? null]))) })
    const restore = j => { const o = JSON.parse(j); a._batman = o.s; a.currentAttack = o.at; [a, b].forEach((f, i) => { for (const k of KEYS) f[k] = o.f[i][k] }) }
    const run = () => { const t = []; for (let i = 0; i < 240; i++) { step(1); t.push(JSON.stringify([D(a), b.x, b.y, b.health])) } return t }
    const j = snap(), t1 = run(); restore(j); const t2 = run(); const k = t1.findIndex((x, i) => x !== t2[i])
    return { same: k === -1, at: k, ops: JSON.parse(j).s.ops.map(o => [o.kind, o.t, o.m.length]), a: k >= 0 ? t1[k].slice(0, 400) : '', b: k >= 0 ? t2[k].slice(0, 400) : '' } }, DIG)
  ok('snapshot restore mid-Carrier (machines, shells, ledgers) continues identically', SR.same, JSON.stringify(SR))
  out.snapshotRestore = SR
  // ── ultimate determinism + lifecycle ──
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.batmanTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 90) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.comboCounter = 0 } step(1) }
    const ult = () => { reset(); H.move('ultOpen'); const t = []; for (let i = 0; i < 360; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    reset(); H.move('cmdSky'); step(120); const had = { ops: a()._batman?.ops?.length, pay: a()._batman?.pay?.length }
    H.reset(); step(1); const st = H.state(); const trainingClears = had.ops === 1 && !st.attack && !(st.s?.ops?.length) && !(st.s?.pay?.length) && !H.ult().active
    reset(); H.move('ultOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(100); H.reset(); step(1)
    const ultCleared = inUlt && !H.ult().active && !a().currentAttack && b().hitstun < 9000 && !a()._supMoonBg
    reset(); H.move('cmdAuto'); step(30); const had2 = !!a()._batman?.ops?.length
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const gone = !a()._batman; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, trainingClears, ultCleared, identityClears: had2 && gone, had } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'trainingClears', 'ultCleared', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  const rnd = await page.evaluate(() => window.__bmRandom); ok('no Math.random from the rebuilt batman*.js modules', rnd.length === 0, rnd.join('\n').slice(0, 400))
  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { console.log('FAIL', e.message.slice(0, 2000)); process.exitCode = 1 }
fs.mkdirSync('docs/batman', { recursive: true }); fs.writeFileSync('docs/batman/determinism_results.json', JSON.stringify(out, null, 1))
console.log(`\n${pass} passed`); await browser.close(); server.close?.(); process.exit(process.exitCode || 0)
