// harness/beast_boy_determinism.mjs — Beast Boy: replay frame identity (an input-only scenario exercising the J chain, all
// four animals, a two-link Wild Chain, Instinct earn → armed → jump escape, False Start, air Bird, air Tiger + landing,
// Forward+Heavy chain, launcher → jump → air, Charge refills and the ultimate), render-batching independence, ultimate
// determinism, lifecycle cleanup (training reset, mid-animal reset, mid-ultimate reset, identity change, KO / next round),
// LAN slot-2 remote input, gamepad == raw parity (Square / Triangle / Cross / Circle / R1 / R2 / L2 + D-pad, incl. the
// Instinct escape on Cross and on a D-pad double-tap), and no Math.random in beastBoy*.js.
// Writes docs/beast_boy/determinism_results.json.        node harness/beast_boy_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], out = {}; let pass = 0
const ok = (n, c, d = '') => { assert(c, n + ' ' + d); pass++; console.log('PASS', n, d.length > 300 ? d.slice(0, 300) + '…' : d) }
async function open(p2 = 'beast_boy') {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__bbRandom = []
    Math.random = function () { const st = new Error().stack; if (/\/beastBoy\w*\.js/.test(st) && __bbRandom.length < 5) __bbRandom.push(st); return old() } })
  await page.goto(server.base + `/index.html?harness=1&p1=beast_boy&p2=${p2}&seed=66123`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.beastBoyTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready); return page
}
// Input-only adaptive scenario. Reads state, never writes it. W on the keyboard = up AND jump, so Bird presses send both.
const SCRIPT = `(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),S=a._beastBoy||{wc:{},inst:{}},A=a.currentAttack,idle=!a.attacking&&(a.onGround||a.grounded)&&!(a.hitstun>0),fw=b.x>=a.x?'right':'left',bk=b.x>=a.x?'left':'right';t++   // toward / away from the opponent (facing may still be stale right after an air move)
 const next=()=>{ph++;t=0}
 const need=e=>{if(a.energy<e){if(idle)r.charge=true;return false}return true}
 const near=d=>{if(gap>d){r[fw]=true;return false}return true}
 switch(ph){
  case 0: if(near(100))next();break
  case 1: if(idle&&t>4){r.light=true;next()}break
  case 2: if(t===10){r.light=true;next()}break
  case 3: if(t===12){r.light=true;next()}break
  case 4: if(t>40&&idle&&need(50)&&near(90)){r.special=true;next()}break                                     // Gorilla Break
  case 5: if(S.wc.open){r.up=r.jump=true;r.special=true;next()}else if(t>120)next();break                  // Wild Chain → Bird
  case 6: if(S.wc.open&&A?.name==='bird'){r.down=true;r.special=true;next()}else if(t>160)next();break     // Wild Chain → Tiger (3 distinct → Instinct)
  case 7: if(t>40&&idle&&need(30)&&near(150)){r[fw]=true;r.special=true;next()}break                       // Triceratops (armed by the token)
  case 8: if(A?.bb?.instinct&&A.timer<=6){r.jump=r.up=true;next()}else if(t>200)next();break               // Instinct escape → jump
  case 9: if(t>30&&idle&&need(10)){r[bk]=true;r.special=true;next()}break                                  // False Start
  case 10: if(t>30&&idle&&need(14)){r.jump=r.up=true;next()}break
  case 11: if(t===8){r.up=r.jump=true;r.special=true;next()}break                                         // air Bird
  case 12: if(t>30&&idle&&need(20)){r.jump=r.up=true;next()}break
  case 13: if(t===6){r.down=true;r.special=true;next()}break                                              // air Tiger → landing
  case 14: if(t>40&&idle&&near(110)){r[fw]=true;r.heavy=true;next()}break                                // Forward+Heavy chain
  case 15: if(t===20){r.heavy=true;next()}break
  case 16: if(t===22){r.heavy=true;next()}break
  case 17: if(t>60&&idle&&near(90)){r.upAttack=true;next()}break                                         // launcher
  case 18: if(A?.name==='up'&&A.hasHit&&!(a.hitstop>0)){r.jump=true;next()}else if(t>80)next();break      // manual jump
  case 19: if(t===4){r.light=true;next()}break                                                           // Aerial Kick
  case 20: if(t>40&&idle&&need(20)&&near(100)){r.down=true;r.special=true;next()}break                  // ground Tiger Cross
  case 21: if(t>40&&idle&&need(100)&&near(90)){r.ultimate=true;next()}else if(t>4000)next();break        // ultimate
 }return r}})()`
const DIG = `f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f.jumpCount,f._bbLand,f._beastBoy&&{...f._beastBoy,cues:undefined},f.currentAttack&&{...f.currentAttack}]`
const waitReady = page => page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
const N = 5200
try {
  // ── A. replay frame identity
  let page = await open()
  const rec = await page.evaluate(async ([src, dig, N]) => { const { writeRawControls } = await import('./input.js'); const S = eval(src), D = eval(dig), H = __harness.beastBoyTest, a = H.raw(), b = H.raw('p2')
    const traces = [], seen = new Set()
    for (let i = 0; i < N; i++) { writeRawControls(a, S(i, a, b)); __harness.luffyTest.step(1)
      if (a.currentAttack) seen.add(a.currentAttack.bb?.key || a.currentAttack.name); if (H.ult().active) seen.add('ult'); if (a._beastBoy?.stats?.instinctUsed) seen.add('instinctUsed'); if (a._beastBoy?.stats?.chainLinks) seen.add('chain' + a._beastBoy.stats.chainLinks)
      traces.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) }
    return { traces, seen: [...seen], stats: a._beastBoy?.stats, rep: __harness.replay.stopAndGet() } }, [SCRIPT, DIG, N])
  ok('recorded scenario exercises chains / every animal / Wild Chain ×2 / Instinct escape / feint / air moves / launcher / ultimate',
    ['light', 'bJ2', 'bJ3', 'gorilla', 'bird', 'tiger', 'tricera', 'instinctUsed', 'chain2', 'feint', 'tigerA', 'tigerLand', 'bAdv', 'bStr', 'bKnock', 'up', 'air', 'ultOpen', 'ult'].every(k => rec.seen.includes(k)), JSON.stringify({ seen: rec.seen, stats: rec.stats }))
  const v = await page.evaluate(rep => __harness.replay.play(rep), rec.rep); ok('replay validates', v.ok, JSON.stringify(v))
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) }); await waitReady(page)
  const pb = await page.evaluate(([n, dig]) => { const D = eval(dig), H = __harness.beastBoyTest, t = []; for (let i = 0; i < n; i++) { __harness.luffyTest.step(1); t.push(JSON.stringify(['p1', 'p2'].map(w => D(H.raw(w))))) } return { t, st: __harness.replay.status?.() || {}, remote: !!H.raw()._beastBoyRemoteInput } }, [N, DIG])
  const first = rec.traces.findIndex((s, i) => s !== pb.t[i]); ok(`replay matches every authoritative frame (${N})`, first === -1, first === -1 ? '' : `frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`)
  ok('no replay checkpoint desync', !pb.st.desync, JSON.stringify(pb.st)); ok('playback marks Beast Boy as remote-driven', pb.remote)
  out.replay = { frames: N, identical: true, exercised: rec.seen, stats: rec.stats }
  await page.evaluate(() => __harness.replay.stopPlayback?.())
  // ── B. render batching + repeat run
  const r1 = await page.evaluate(async src => { const { writeRawControls } = await import('./input.js'); const H = __harness.beastBoyTest
    const run = stepper => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 } const t = []
      const SS = eval(src); for (let i = 0; i < 2400; i += 4) { writeRawControls(a, SS(i, a, b)); stepper(); t.push(JSON.stringify([a.x, a.y, a.health, a.energy, b.x, b.health, a._beastBoy?.clock, a.currentAttack?.name, a._beastBoy?.wc])) } return t }
    return { perFrame: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }), batched: run(() => __harness.luffyTest.step(4)), again: run(() => { for (let k = 0; k < 4; k++) __harness.luffyTest.step(1) }) } }, SCRIPT)
  const d1 = r1.perFrame.findIndex((s, i) => s !== r1.batched[i]); ok('render batching gives identical sim', d1 === -1, d1 === -1 ? '' : `${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
  ok('second identical run reproduces exactly', JSON.stringify(r1.perFrame) === JSON.stringify(r1.again))
  ok('batching runs are live (moves ran, P2 took damage)', r1.perFrame.some(x => JSON.parse(x)[7]) && JSON.parse(r1.perFrame.at(-1))[5] < 1080)
  out.renderBatching = { samples: r1.perFrame.length, identical: true }
  // ── C. ultimate determinism + lifecycle
  const U = await page.evaluate(dig => { const D = eval(dig), H = __harness.beastBoyTest, a = () => H.raw(), b = () => H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const reset = (gap = 90) => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1; for (const f of [a(), b()]) { f.energy = 100; f.health = f.maxHealth; f.hitstop = 0; f.hitstun = 0; f.vx = f.vy = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } step(1) }
    const ult = () => { reset(); H.move('ultOpen'); const t = []; for (let i = 0; i < 360; i++) { step(1); t.push(JSON.stringify([D(a()), D(b()), H.ult()])) } return t }
    const t1 = ult(), t2 = ult(), sameUlt = JSON.stringify(t1) === JSON.stringify(t2), ultRan = t1.some(x => JSON.parse(x)[2].active)
    // training reset mid-animal with a live Wild Chain window + a held token + collected animals
    reset(80); H.move('gorilla'); for (let i = 0; i < 40 && !a()._beastBoy.wc.open; i++) step(1); const s0 = a()._beastBoy; s0.inst.seen = { tiger: 1 }; const hadOpen = !!s0.wc.open
    H.reset(); step(1); const st = H.state(); const trainingClears = hadOpen && !st.attack && st.form === 'human' && !st.s?.wc?.open && !st.s?.wc?.queued && !(st.s?.wc?.links) && !st.s?.inst?.token && !Object.keys(st.s?.inst?.seen || {}).length && !H.ult().active
    // reset mid-ultimate
    reset(); H.move('ultOpen'); for (let i = 0; i < 80 && !H.ult().active; i++) step(1); const inUlt = H.ult().active; step(60); H.reset(); step(1)
    const ultCleared = inUlt && !H.ult().active && !a().currentAttack && b().hitstun < 9000
    // identity change: a Beast Boy mid-Triceratops becomes another fighter → every Beast Boy leftover is cleared
    reset(400); H.move('tricera'); step(25); const had = !!a()._beastBoy && !!a().currentAttack?.bb
    const keep = a().rosterKey; a().rosterKey = 'naruto'; step(2); const ident = { had, bb: !!a()._beastBoy, atkBb: !!a().currentAttack?.bb }; a().rosterKey = keep; reset()
    return { sameUlt, ultRan, trainingClears, ultCleared, identityClears: ident.had && !ident.bb && !ident.atkBb, ident } }, DIG)
  for (const k of ['sameUlt', 'ultRan', 'trainingClears', 'ultCleared', 'identityClears']) ok('lifecycle: ' + k, U[k], JSON.stringify(U))
  out.lifecycle = U
  // ── D. live match: KO clears state, next round fresh
  await page.close(); page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=beast_boy&p2=beast_boy`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.beastBoyTest)
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.evaluate(() => { const H = __harness.beastBoyTest, A = H.raw(), B = H.raw('p2'); A.energy = 100; B.x = A.x + 140; B.vx = 0 })
  await page.keyboard.down('d'); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('d')
  await page.waitForFunction(() => __harness.beastBoyTest.raw()._beastBoy?.stats?.animalStarts > 0, null, { timeout: 4000 }).catch(() => {})
  await page.waitForFunction(() => { const s = __harness.beastBoyTest.raw()._beastBoy?.stats; return s && (s.animalHits + s.animalWhiffs + s.animalBlocked) > 0 && !__harness.beastBoyTest.raw().currentAttack }, null, { timeout: 8000 }).catch(() => {})
  const pre = await page.evaluate(() => ({ stats: __harness.beastBoyTest.raw()._beastBoy?.stats, p2: __harness.beastBoyTest.raw('p2').health }))
  await page.evaluate(() => { const H = __harness.beastBoyTest, A = H.raw(), B = H.raw('p2'); A._beastBoy.inst.seen = { gorilla: 1, bird: 1 }; A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; B.health = 1; B.x = A.x + 70; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true; B.invulnTimer = 0; B.hitstun = 120; B.isBlocking = false })
  await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(300)
  const ko = await page.evaluate(() => ({ p2hp: __harness.beastBoyTest.raw('p2').health, s: __harness.beastBoyTest.raw()._beastBoy || null }))
  ok('live keyboard Forward+Special = Triceratops Drive in a real match (P2 damaged)', pre.stats?.animalStarts >= 1 && pre.p2 < 1080, JSON.stringify(pre))
  ok('round-ending KO clears Beast Boy state (Instinct progress, Wild Chain, live animal)', ko.p2hp <= 0 && (!ko.s || (!Object.keys(ko.s.inst?.seen || {}).length && !ko.s.inst?.token)), JSON.stringify({ hp: ko.p2hp, s: ko.s && { inst: ko.s.inst, wc: ko.s.wc } }))
  await page.waitForFunction(() => (__harness.state().gameState === 'battle' && __harness.state().countdown <= 0 && __harness.beastBoyTest.raw('p2').health > 1) || __harness.state().gameState === 'victory', null, { timeout: 45000 })
  const nr = await page.evaluate(() => { const f = __harness.beastBoyTest.raw(), s = f._beastBoy; return { gs: __harness.state().gameState, token: !!s?.inst?.token, seen: Object.keys(s?.inst?.seen || {}).length, links: s?.wc?.links || 0, open: !!s?.wc?.open, atk: f.currentAttack?.bb?.key || null } })
  ok('next round starts clean: no token, no collected animals, no chain, no animal attack', !nr.token && nr.seen === 0 && nr.links === 0 && !nr.open && !nr.atk, JSON.stringify(nr))
  // ── E. LAN: slot 2 Beast Boy driven by injected remote input (P2 faces left → its Back is Right)
  await page.close(); page = await open()
  const lan = await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); __harness.replay.stopPlayback?.(); inputSettings.p1Type = 'keyboard'; inputSettings.p2Type = 'controller'
    window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [__pad]
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); const H = __harness.beastBoyTest; H.raw('p2').energy = 100
    __harness.net.beginMock({ localSide: 'p1', inputDelay: 2, remoteScript: fr => __harness.replay.encode(fr === 8 ? { special: true } : fr === 80 ? { up: true, jump: true, special: true } : fr === 160 ? { right: true, special: true } : fr === 220 ? { down: true, special: true } : fr === 300 ? { left: true, special: true } : {}) })
    const seen = new Set(); for (let i = 0; i < 400; i++) { __harness.luffyTest.step(1); const s = H.state('p2'); if (s.attack?.bb) seen.add(s.attack.bb.key) }
    const fr = __harness.net.frame(); __harness.net.end(); return { seen: [...seen], frame: fr, remote: !!H.raw('p2')._beastBoyRemoteInput } })
  ok('LAN-injected slot-2 Beast Boy: gorilla + bird + feint + tiger + triceratops', ['gorilla', 'bird', 'feint', 'tiger', 'tricera'].every(k => lan.seen.includes(k)) && lan.frame >= 400, JSON.stringify(lan)); out.lan = lan
  // ── F. controller / raw parity
  await page.close(); page = await open()
  const par = await page.evaluate(async () => { const { inputSettings, writeRawControls } = await import('./input.js'); const H = __harness.beastBoyTest
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__gp = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn() }; navigator.getGamepads = () => [__gp]
    // keyboard W = Up AND Jump (one key), so the shared sequence sends both for Bird; the pad's D-pad-only Up+R1 is checked separately below
    const seq = [[2, { light: true }], [12, { light: true }], [24, { light: true }], [90, { special: true }], [170, { right: true, special: true }], [280, { down: true, special: true }],
      [360, { up: true, jump: true, special: true }], [440, { left: true, special: true }], ...Array.from({ length: 40 }, (_, k) => [480 + k, { charge: true }]), [560, { heavy: true }], [620, { right: true, heavy: true }], [700, { ultimate: true }]]
    const PAD = { right: 15, up: 12, down: 13, left: 14, special: 5, light: 2, heavy: 3, jump: 0, block: 1, ultimate: 7, charge: 6, grab: 4 }
    const setPad = e => { __gp.buttons = btn(); for (const k in e) if (PAD[k] != null) __gp.buttons[PAD[k]] = { pressed: true, value: 1 } }
    const fresh = (gap = 100) => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.energy = b.energy = 100; __harness.luffyTest.step(1); return [a, b] }
    const run = mode => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; const [a, b] = fresh()
      const trace = []; for (let i = 0; i < 900; i++) { if (i === 690) a.energy = 100; if (i === 140 || i === 250 || i === 340 || i === 420) { a.energy = 100; b.x = a.x + 100 * a.facing; b.health = b.maxHealth }
        const e = seq.find(s => s[0] === i)?.[1] || {}
        if (mode === 'pad') setPad(e); else writeRawControls(a, e)
        __harness.luffyTest.step(1); trace.push([a.currentAttack?.bb?.key || a.currentAttack?.name || null, Math.round(a.x), a._beastBoy?.wc?.links || 0, b.health]) }
      __gp.buttons = btn(); return trace }
    const raw = run('raw'), pad = run('pad'); inputSettings.p1Type = 'keyboard'
    const names = t => [...new Set(t.map(x => x[0]).filter(Boolean))]
    const firstDiff = raw.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(pad[i]))
    // INSTINCT escape on both paths: token armed Gorilla; Cross / jump in its last 8 f → jump; D-pad double-tap → dash
    const instRun = (mode, how) => { inputSettings.p1Type = mode === 'pad' ? 'controller' : 'keyboard'; const [a] = fresh(900); H.setToken(true); let res = null, tap = 0
      for (let i = 0; i < 90 && !res; i++) { let e = i === 2 ? { special: true } : {}
        if (a.currentAttack?.bb?.instinct && a.currentAttack.timer <= 6 && tap < 3) {
          // jump: Cross / jump.  dash: pad = D-pad →, release, → (the shared detector is WALL-CLOCK, 240 ms; every harness step
          // also renders, so the first tap's timestamp is pinned to "now" before the second tap = two 60 fps frames apart);
          // raw = the resolved double-tap intent `dash` (exactly what replay / LAN transmit).
          if (how === 'jump') e = tap === 0 ? { jump: true } : {}
          else if (mode === 'pad') { e = tap === 0 || tap === 2 ? { right: true } : {}; if (tap === 2) a.rightTapTime = performance.now() - 33 }
          else e = tap === 2 ? { right: true, dash: true } : tap === 0 ? { right: true } : {}
          tap++ }
        if (mode === 'pad') setPad(e); else writeRawControls(a, e)
        __harness.luffyTest.step(1); if (tap && !a.currentAttack) res = { at: i, vy: +a.vy.toFixed(1), dash: a.dashTimer || 0 } }
      __gp.buttons = btn(); return res }
    const inst = { padJump: instRun('pad', 'jump'), rawJump: instRun('raw', 'jump'), padDash: instRun('pad', 'dash'), rawDash: instRun('raw', 'dash') }
    // D-pad Up + R1 alone (no Cross) on the pad = Bird, never a jump
    inputSettings.p1Type = 'controller'; { const [a] = fresh(400); setPad({ up: true, special: true }); __harness.luffyTest.step(1); setPad({}); let gr = true; for (let i = 0; i < 9; i++) { __harness.luffyTest.step(1); if (!(a.onGround || a.grounded)) gr = false }
      inst.padBird = { atk: a.currentAttack?.bb?.key || null, groundedThroughStartup: gr } }
    inputSettings.p1Type = 'keyboard'
    return { raw: { names: names(raw), hp: raw.at(-1)[3] }, pad: { names: names(pad), hp: pad.at(-1)[3] }, same: firstDiff < 0, firstDiff, at: firstDiff >= 0 ? [raw[firstDiff], pad[firstDiff]] : null, inst } })
  ok('gamepad path == raw path, frame for frame (□ chain, R1 gorilla / →R1 tricera / ↓R1 tiger / ↑R1 bird / ←R1 feint, L2 charge, △, →△, R2)', par.same && ['light', 'bJ2', 'bJ3', 'gorilla', 'tricera', 'tiger', 'bird', 'feint', 'heavy', 'bAdv', 'ultOpen'].every(k => par.raw.names.includes(k)), JSON.stringify(par))
  ok('pad D-pad Up + R1 (no Cross) = Bird Intercept, grounded through its startup (no jump)', par.inst.padBird.atk === 'bird' && par.inst.padBird.groundedThroughStartup, JSON.stringify(par.inst.padBird))
  ok('Instinct escape: Cross jumps and a D-pad double-tap dashes, identical to the raw path', par.inst.padJump?.vy < -5 && JSON.stringify(par.inst.padJump) === JSON.stringify(par.inst.rawJump) && par.inst.padDash?.dash > 0 && JSON.stringify(par.inst.padDash) === JSON.stringify(par.inst.rawDash), JSON.stringify(par.inst))
  out.parity = par
  const rnd = await page.evaluate(() => __bbRandom); ok('no Math.random in beastBoy*.js', rnd.length === 0, JSON.stringify(rnd))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} finally { out.passes = pass; out.errors = errors; fs.writeFileSync('docs/beast_boy/determinism_results.json', JSON.stringify(out, null, 2) + '\n'); console.log(pass, 'passed'); await browser.close(); server.close() }
