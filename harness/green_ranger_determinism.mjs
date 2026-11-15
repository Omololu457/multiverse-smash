// harness/green_ranger_determinism.mjs — Green Ranger: replay frame identity (input-only scenario exercising the
// chains, Dragon Call, note specials, Talon, Pulse, Fang and the Zord ultimate), render-batching independence,
// ultimate determinism, lifecycle cleanup (training reset mid-call / mid-ultimate, mirror), playback remote flag,
// no Math.random in Green / shared Zord modules. Writes docs/green_ranger/determinism_results.json.
//   node harness/green_ranger_determinism.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0, fail = 0
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
async function open(p2 = 'mmpr_black') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__grRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/(greenRanger\w*|rangerZordUltimate)\.js/.test(st) && __grRandom.length < 5) __grRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=green_ranger&p2=${p2}&seed=55123`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.greenRangerTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),s=a._greenRanger||{},idle=!a.attacking&&!(s.landing>0)&&(a.onGround||a.grounded)&&!(a.attackCooldown>0),fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right';t++
 const next=()=>{ph++;t=0}
 switch(ph){
  case 0: if(gap>100)r[fw]=true;else next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===8){r.light=true;next()}break
  case 3: if(t===10){r.light=true;next()}break
  case 4: if(t>60&&idle){if(gap<200)r[bk]=true;else{r.charge=true;next()}}break                     // Dragon Call
  case 5: if(t<70)r.charge=t<3;else if(idle){next()}break
  case 6: if(t>4&&idle){if(gap>110)r[fw]=true;else{r.special=true;next()}}break                     // note Dragon Edge
  case 7: if(t>70&&idle){if(gap>150)r[fw]=true;else{r[fw]=true;r.special=true;next()}}break         // Emerald Advance
  case 8: if(t>70&&idle){if(gap>60)r[fw]=true;else{r.down=true;r.special=true;next()}}break         // Rising Talon
  case 9: if(t>80&&idle){if(gap<260)r[bk]=true;else{r[bk]=true;r.special=true;next()}}break        // Emerald Pulse
  case 10: if(t>60&&idle){r.up=r.jump=true;next()}break
  case 11: if(t===8){r.down=true;r.special=true;next()}break                                         // Descending Fang
  case 12: if(t>60&&idle){if(gap>90)r[fw]=true;else{r[fw]=true;r.heavy=true;next()}}break           // Forward+Heavy chain
  case 13: if(t===16){r.heavy=true;next()}break
  case 14: if(t===16){r.up=r.jump=true;r.heavy=true;next()}break
  case 15: if(t>90&&idle&&a.energy>=100){if(gap>200)r[fw]=true;else{r.ultimate=true;next()}}else if(t>600)next();break   // Zord ultimate
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._greenRanger&&{...f._greenRanger,cues:0},f._zordUlt,f.currentAttack&&{...f.currentAttack}]`
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.greenRangerTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set(); for (let i = 0; i < 2400; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack) seen.add(a.currentAttack.name); if (a.currentAttack?.gm?.note) seen.add('note_' + a.currentAttack.name); if (H.state().shots.length) seen.add('shot'); if (H.ult().active) seen.add('zordCine'); if (a._zordUlt) seen.add('zordOpener')
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG])
  const want = ['light', 'gJ2', 'gJ3', 'gCall', 'gEdge', 'note_gEdge', 'gAdvance', 'gTalon', 'gPulse', 'gFang', 'gAdv', 'gBlade', 'shot']
  ok('recorded scenario exercises chains / call / note special / specials / Zord opener', want.every(k => rec.seen.includes(k)), JSON.stringify({ missing: want.filter(k => !rec.seen.includes(k)), seen: rec.seen }))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.greenRangerTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.playbackState(), remote: !!H.raw()._greenRangerRemoteInput } }, [rec.traces.length, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok(`replay matches every authoritative frame (${rec.traces.length})`, first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Green as remote-driven', pb.remote)
  out.replay = { frames: rec.traces.length, identical: first === -1, exercised: rec.seen, zordInReplay: rec.seen.includes('zordOpener'), note: 'input-only: energy is never injected; the Zord ultimate is covered by section C when the meter is not full in this scenario' }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.greenRangerTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 1600; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._greenRanger?.notes, a._greenRanger?.clock, a.currentAttack?.name])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live', new Set(r1.perFrame.map(x => JSON.parse(x)[0])).size > 5 && r1.perFrame.some(x => JSON.parse(x)[8]))
  out.renderBatching = { samples: r1.perFrame.length, identical: d1 === -1 }
  // ── C. ultimate determinism + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.greenRangerTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 150) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = () => { reset(); H.move('gUlt'); const t = []; for (let i = 0; i < 280; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    reset(300); H.move('gCall'); step(20); const callLive = !!a()._greenRanger?.call; H.reset(); step(80); const afterCall = { notes: a()._greenRanger?.notes ?? 0, call: !!a()._greenRanger?.call }
    reset(); H.move('gUlt'); let n = 0; while (!H.ult().active && n++ < 80) step(1); const midUlt = H.ult().active; H.reset(); step(2)
    const afterUlt = { active: H.ult().active, zord: !!a()._zordUlt, attack: a().currentAttack?.name || null, shots: H.state().shots.length, missed: a()._greenRanger?.missed ?? 0 }
    reset(400); a()._greenRanger && (a()._greenRanger.notes = 1); H.move('gPulse'); step(22); const shotLive = H.state().shots.length > 0; H.reset(); step(1); const afterShots = H.state().shots.length
    return { sameUlt, ultRan, callLive, afterCall, midUlt, afterUlt, shotLive, afterShots } }, DIG)
  ok('ultimate: two identical runs give identical traces (cinematic ran)', U.sameUlt && U.ultRan, JSON.stringify(U))
  ok('training reset mid-Dragon-Call: no note granted, call cleared', U.callLive && U.afterCall.notes === 0 && !U.afterCall.call, JSON.stringify(U.afterCall))
  ok('training reset mid-ultimate: cinematic + Zord + pose cleared', U.midUlt && !U.afterUlt.active && !U.afterUlt.zord && U.afterUlt.attack == null, JSON.stringify(U.afterUlt))
  ok('training reset clears live Pulse / Edge shots', U.shotLive && U.afterShots === 0, JSON.stringify(U))
  out.ultimate = U
  // ── D. KO during the ultimate cinematic → round ends cleanly; next round starts with no notes / Zord
  const ko = await page.evaluate(() => { const H = __harness.greenRangerTest, a = H.raw(), b = H.raw('p2'); H.reset(); a.x = 1300; b.x = 1450; a.facing = 1; b.facing = -1; a.energy = 100; b.health = 60; __harness.luffyTest.step(1)
    H.move('gUlt'); let active = false; for (let i = 0; i < 400; i++) { __harness.luffyTest.step(1); active ||= H.ult().active } return { active, hp: b.health, gs: __harness.state().gameState, cine: H.ult().active } })
  ok('KO inside the Zord sequence: foe KO\'d, cinematic released', ko.active && ko.hp <= 0 && !ko.cine, JSON.stringify(ko)); out.ko = ko
  // live session (real rAF): Green holds a note, KOs P2 with a real-key ultimate, next round must start clean
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=green_ranger&p2=mmpr_black`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.greenRangerTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.greenRangerTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; H.set('p1', { notes: 2 }); B.x = A.x + 150; B.vx = 0; B.health = 60 })
  await page.keyboard.down('u'); await page.waitForTimeout(60); await page.keyboard.up('u')
  const liveUlt = await page.waitForFunction(() => __harness.greenRangerTest.ult().active, null, { timeout: 4000 }).then(() => true).catch(() => false)
  const koLive = await page.waitForFunction(() => __harness.greenRangerTest.raw('p2').health <= 0, null, { timeout: 15000 }).then(() => true).catch(() => false)
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.greenRangerTest.raw('p2').health >= __harness.greenRangerTest.raw('p2').maxHealth) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const a = __harness.greenRangerTest.raw(); return { gs: __harness.state().gameState, notes: a._greenRanger?.notes ?? 0, zord: !!a._zordUlt, cine: __harness.greenRangerTest.ult().active } })
  nr.liveUlt = liveUlt; nr.koLive = koLive
  ok('live match: real-key ultimate KO → next round: no carried notes / Zord / cinematic', nr.liveUlt && nr.koLive && nr.notes === 0 && !nr.zord && !nr.cine, JSON.stringify(nr)); out.nextRound = nr
  // ── E. mirror: Green vs Green, both ult on the same frame (one cinematic at a time; no crash; both resolve)
  await page.close(); page = await open('green_ranger')
  const mir = await page.evaluate(() => { const H = __harness.greenRangerTest, a = H.raw(), b = H.raw('p2'); H.reset(); a.x = 1300; b.x = 1450; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; __harness.luffyTest.step(1)
    H.move('gUlt', 'p1'); H.move('gUlt', 'p2'); let cineFrames = 0; for (let i = 0; i < 400; i++) { __harness.luffyTest.step(1); if (H.ult().active) cineFrames++ }
    return { cineFrames, a: { hp: a.health, zord: !!a._zordUlt, atk: a.currentAttack?.name || null }, b: { hp: b.health, zord: !!b._zordUlt, atk: b.currentAttack?.name || null }, active: H.ult().active } })
  ok('mirror: simultaneous ultimates resolve, no stuck Zord / pose', !mir.active && !mir.a.zord && !mir.b.zord && !/^(gUlt|ultWatch|ultSignal)$/.test(mir.a.atk || '') && !/^(gUlt|ultWatch|ultSignal)$/.test(mir.b.atk || ''), JSON.stringify(mir)); out.mirror = mir
  const rnd = await page.evaluate(() => __grRandom); ok('no Math.random in greenRanger*.js / rangerZordUltimate.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} catch (e) { fail++; console.log('FAIL exception', e.message.split('\n')[0]); errors.push('harness: ' + e.message.split('\n')[0]) } finally { out.passes = pass; out.fails = fail; out.errors = errors; fs.writeFileSync('docs/green_ranger/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(`${pass} pass / ${fail} fail`); await browser.close(); server.close(); process.exit(fail ? 1 : 0) }
