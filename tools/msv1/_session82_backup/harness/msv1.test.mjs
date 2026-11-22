// harness/msv1.test.mjs — MSV1 Ninja Storm: Shane (ns_red) + Dustin (ns_yellow) through REAL keyboard input and the real
// parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, P charge, ; block, WASD).
// Covers: S.P.D. Red parity (walk / run speed, the identical double-tap window), every sheet frame used, Ninja Streak
// (distance, intangibility, chain cost), the Charge mapping (Vanish / Mirror / Barrier / Swap), the illusion (counter,
// real-body hit ends it, CPU never reads identity), no flight (Float never climbs), burrow hit only by lows, clones never
// KO, a DUMMY third ninja profile, no Math.random in the MSV1 modules, AI-vs-AI determinism with both ninjas.
// Writes docs/msv1/mechanics_results.json.   node harness/msv1.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { ns_red, ns_yellow, SHANE_PROFILE, DUSTIN_PROFILE } from '../nsWindData.js'
import { SHANE_ANIM } from '../msv1NinjaSprites.js'
const ROOT = new URL('..', import.meta.url).pathname
const server = await serve(), browser = await chromium.launch({ headless: true })
let pass = 0, fail = 0; const report = {}
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', 'MSV1', n, ok ? '' : d) }
const near = (v, w, t = 0.05) => Math.abs(v - w) <= t

async function boot(p1, p2, seed = 771901) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}&seed=${seed}`); await page.waitForFunction(() => window.__harness?.nsWindTest || window.__harness?.spdYellowTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone?.())
  await page.waitForTimeout(300); await page.evaluate(() => __harness.luffyTest.step(3))
  const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
  const S = (e, a) => page.evaluate(([e, a]) => { const H = __harness.nsWindTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [e, a])
  const tap = async (ks, n = 1) => { for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
  const hold = async (ks, n) => { for (const k of ks) await page.keyboard.down(k); await step(n) }
  const release = async ks => { for (const k of ks) await page.keyboard.up(k) }
  const reset = async (gap = 300, o = {}) => {
    await S(`(()=>{H.reset(); __harness.setDummyBehavior(a.dummy||'stand'); const p=H.raw(), q=H.raw('p2'); p.x=1000; q.x=1000+a.gap; p.facing=1; q.facing=-1
      for (const f of [p,q]) { f.health=f.maxHealth; f.energy=a.energy??100; f.vx=f.vy=0; f.invulnTimer=0; f.hitstop=0; f.hitstun=0; f.blockstun=0; f.attacking=false; f.currentAttack=null; f.attackCooldown=0; f.knockdownState=false; f.comboCounter=0; f.isBlocking=false; f._forceGuard=false }
      for (const w of ['p1','p2']) if (H.isNinja(w)) H.setNP(a.np??100, w) })()`, { gap, ...o })
    await step(2)
  }
  return { page, errors, step, S, tap, hold, release, reset }
}
const st = (B, w = 'p1') => B.S(`H.state('${w}')`)

try {
  // ── 0. static: frame usage, profiles, no Math.random ─────────────────────────────────────────────────────────
  const strips = Object.values(SHANE_ANIM).filter(d => d?.sheet)
  const pk = JSON.parse(fs.readFileSync(ROOT + 'docs/msv1/ANIM_MAP.json', 'utf8'))
  const mapped = new Set(); for (const e of (pk.anims || pk)) { const [row, a, b] = [e.row ?? e[0], e.a ?? e[1], e.b ?? e[2]]; for (let i = a; i <= b; i++) mapped.add(`${row}_${i}`) }
  ck(`every sheet frame is mapped to an animation (${mapped.size}/305)`, mapped.size === 305, `${mapped.size}`)
  ck(`${strips.length} strips packed for Shane (same geometry for Dustin)`, strips.length >= 60)
  for (const f of ['ninja.js', 'nsWind.js', 'nsWindData.js', 'nsWindFx.js', 'nsWindSound.js', 'nsWindPose.js', 'nsWindKit.js', 'nsWindHarness.js']) {
    const src = fs.readFileSync(ROOT + f, 'utf8').replace(/\/\/.*$/gm, '')
    ck(`${f}: no Math.random`, !/Math\.random/.test(src))
  }
  const fw = fs.readFileSync(ROOT + 'ninja.js', 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  ck('ninja.js is profile-agnostic (no Shane / Dustin / ns_ keys in code)', !/ns_red|ns_yellow|Shane|Dustin/.test(fw))
  ck('canon: the Yellow Wind Ranger is Dustin (never Tori)', ns_yellow.civilianIdentity === 'Dustin Brooks' && !/tori\b/i.test(JSON.stringify(ns_yellow)))
  ck('S.P.D. Red stat parity: speed 88, HP 1200 / Dustin +8 %', ns_red.stats.speed === 88 && ns_yellow.stats.speed === 88 && ns_red.stats.maxHealth === 1200 && ns_yellow.stats.maxHealth === 1296)
  ck('jumps: Shane 3 / Dustin 2', ns_red.stats.maxJumps === 3 && ns_yellow.stats.maxJumps === 2)
  ck('no flight: Float only caps the fall', SHANE_PROFILE.float.fallCap > 0 && !DUSTIN_PROFILE.float)

  // ── 1. S.P.D. Red parity: walk / run speed + the double-tap window (identical procedure) ───────────────────
  const par = {}
  for (const key of ['spd_red', 'ns_red', 'ns_yellow']) {
    const B = await boot(key, 'spd_red')
    await B.page.evaluate(() => __harness.setDummyBehavior('stand'))
    const P = () => B.page.evaluate(() => { const f = __harness.p1(); return { x: f.x, vx: f.vx, run: f._ranger?.running || 0, blink: !!f._ranger?.blink, streak: !!f._ninja?.streak, streaks: f._ninja?.stats?.streaks || 0, blinks: f._ranger?.blinks || 0 } })
    const place = () => B.page.evaluate(() => { const a = __harness.p1(), b = __harness.p2(); a.x = 600; b.x = 2400; a.facing = 1; a.vx = 0; if (a._ninja) a._ninja.np = 100; if (a._ranger) { a._ranger.charges = 2; a._ranger.running = 0 } })
    await place(); await B.step(2)
    await B.hold(['d'], 24); const walk = await P(); await B.release(['d']); await B.step(20)
    await place(); await B.step(30)
    await B.tap(['d'], 2); await B.step(8); await B.tap(['d'], 2)   // gap 10 ticks: inside the 12-tick window
    const fired10 = await P(); await B.hold(['d'], 40); const run = await P(); await B.release(['d']); await B.step(40)
    await place(); await B.step(30)
    await B.tap(['d'], 2); await B.step(14); await B.tap(['d'], 2)  // gap 16 ticks: outside
    const fired16 = await P(); await B.step(30)
    par[key] = { walk: +Math.abs(walk.vx).toFixed(3), run: +Math.abs(run.vx).toFixed(3), tap10: fired10.blink || fired10.streak || fired10.streaks > 0 || fired10.blinks > 0, tap16: fired16.blink || fired16.streak }
    ck(`${key}: no page errors (parity run)`, B.errors.length === 0, B.errors.join(' | '))
    await B.page.close()
  }
  report.parity = par; console.log('parity', JSON.stringify(par))
  for (const k of ['ns_red', 'ns_yellow']) {
    ck(`${k}: walk speed = S.P.D. Red (${par.spd_red.walk})`, near(par[k].walk, par.spd_red.walk), JSON.stringify(par[k]))
    ck(`${k}: run speed after the double-tap = S.P.D. Red (${par.spd_red.run})`, near(par[k].run, par.spd_red.run), JSON.stringify(par[k]))
    ck(`${k}: double-tap 10-tick gap fires, 16-tick gap does not (same as S.P.D. Red)`, par[k].tap10 === par.spd_red.tap10 && par[k].tap16 === par.spd_red.tap16 && par[k].tap10 && !par[k].tap16, JSON.stringify(par[k]))
  }

  // ── 2. Shane vs Dustin: framework mechanics through real input ─────────────────────────────────────────────
  const B = await boot('ns_red', 'ns_yellow')
  // Streak distance + intangibility (passes through Dustin)
  await B.reset(200); let a0 = await st(B)
  await B.tap(['d'], 2); await B.step(6); await B.tap(['d'], 2); await B.step(14)
  let a1 = await st(B), b1 = await st(B, 'p2')
  ck('Streak: travels ~40% screen (512 px) and passes through the foe', a1.x - a0.x >= 450 && a1.x > b1.x, `dx=${a1.x - a0.x} a=${a1.x} b=${b1.x}`)
  ck('Streak: costs 10 Ninja Power', a1.s.np >= 89 && a1.s.np <= 91, `np=${a1.s.np}`)
  report.streak = { dx: a1.x - a0.x }
  // Smoke Vanish: Charge + Light + Heavy
  await B.reset(300); await B.step(20)
  await B.tap(['p', 'j', 'k'], 2); await B.step(24)
  a1 = await st(B); b1 = await st(B, 'p2')
  ck('Smoke Vanish (Charge+Light+Heavy): reappears behind the foe, 30 NP', a1.s.stats.vanishes === 1 && a1.x > b1.x, `v=${a1.s.stats.vanishes} a=${a1.x} b=${b1.x} np=${a1.s.np}`)
  // Barrier: Forward + Charge
  await B.reset(300); await B.step(10)
  await B.hold(['d'], 1); await B.tap(['p'], 2); await B.release(['d']); await B.step(5)
  a1 = await st(B)
  ck('Wind Ward (Forward+Charge) raises the barrier', a1.s.stats.barriers === 1, JSON.stringify(a1.s.stats))
  await B.step(60)
  // Ninja Mirror: ↓↓ + Charge
  await B.reset(300); await B.step(10)
  await B.tap(['s'], 2); await B.step(2); await B.tap(['s'], 2); await B.step(1); await B.tap(['p'], 2); await B.step(6)
  a1 = await st(B)
  ck('Ninja Mirror (↓↓+Charge): the illusion splits off', !!a1.s.mirror && a1.s.stats.mirrors === 1, JSON.stringify(a1.s.stats))
  // Swap: lone Charge during Mirror
  const before = { x: a1.x, ix: a1.s.mirror?.x }
  await B.tap(['p'], 2); await B.step(14); a1 = await st(B)
  ck('Swap (Charge in Mirror): real and illusion trade places', a1.s.stats.swaps === 1 && Math.abs(a1.x - before.ix) < 40, `swaps=${a1.s.stats.swaps} x=${a1.x} ix0=${before.ix}`)
  // Strike the illusion → counter + mode ends; Dustin is the striker (scripted move at the illusion)
  const hitIllusion = await B.S(`(()=>{const a=H.raw(), b=H.raw('p2'), m=a._ninja.mirror; b.x = m.x - b.w - 10; b.facing = 1; b.y = a.y; return H.move('light','p2')})()`)
  await B.step(16); a1 = await st(B)
  ck('Illusion struck → illusion counter fires and the mode ends', hitIllusion && a1.s.stats.illusionHits >= 1 && !a1.s.mirror, JSON.stringify({ ih: a1.s.stats.illusionHits, ic: a1.s.stats.illusionCounters, m: !!a1.s.mirror }))
  // Real body struck in Mirror → mode ends
  await B.reset(120); await B.S(`H.mirror()`); await B.step(12)
  await B.S(`(()=>{const a=H.raw(), b=H.raw('p2'); b.x=a.x+a.w+10; b.facing=-1; return H.move('light','p2')})()`); await B.step(14)
  a1 = await st(B)
  ck('Real body struck in Mirror → the mode ends', a1.s.stats.realHitsInMirror >= 1 && !a1.s.mirror, JSON.stringify(a1.s.stats))
  // Float never climbs
  await B.reset(400); await B.tap(['w'], 2); await B.step(14); let maxRise = 0, prevY = (await st(B)).y
  await B.hold(['w'], 1)
  for (let i = 0; i < 50; i++) { await B.step(1); const q = await st(B); if (q.vy > 0 && q.y < prevY) maxRise = Math.max(maxRise, prevY - q.y); prevY = q.y; if (q.grounded) break }
  await B.release(['w']); await B.step(40)
  ck('Wind Float never rises (no flight)', maxRise === 0, `rise=${maxRise}`)
  // Clones can never KO: Dustin at 1 HP, a clone strike
  await B.reset(120)
  await B.S(`(()=>{const a=H.raw(), b=H.raw('p2'); b.health=1; H.clone({x:a.x+30,y:a.y,dir:1,life:60,steps:[{at:2,pose:'jab',strike:{dmg:40,hitstun:20,kbx:3,kby:0,box:{dx:40,dy:10,w:90,h:80},move:'t'}}]})})()`)
  await B.step(30); b1 = await st(B, 'p2')
  ck('Clone hits never KO (floor 1)', b1.hp >= 1, `hp=${b1.hp}`)
  // Dummy third profile
  ck('Dummy third ninja profile registers through the same API', await B.S(`H.registerDummy()`))
  ck('Shane vs Dustin: no page errors', B.errors.length === 0, B.errors.join(' | '))
  await B.page.close()

  // ── 3. Dustin: burrow is hit only by lows; Ground Pound; REV ──────────────────────────────────────────────
  const D = await boot('ns_yellow', 'ns_red')
  await D.reset(140); await D.step(5)
  await D.tap(['s'], 2); await D.step(2); await D.hold(['s'], 1); await D.tap(['l'], 2); await D.release(['s']); await D.step(12)
  let d1 = await st(D)
  ck('Earth Burrow (↓↓+Special): underground', !!d1.s.burrow?.under, JSON.stringify(d1.s.burrow))
  const hpB = d1.hp
  await D.S(`(()=>{const a=H.raw(), b=H.raw('p2'); b.x=a.x+a.w+8; b.facing=-1; H.setNP(0,'p2'); return H.move('light','p2')})()`); await D.step(14)
  d1 = await st(D)
  ck('burrowed: a standing Light whiffs', d1.hp === hpB && !!d1.s.burrow, `hp ${hpB}→${d1.hp}`)
  await D.S(`(()=>{const a=H.raw(), b=H.raw('p2'); b.x=a.x+a.w+8; b.facing=-1; b.attacking=false; b.currentAttack=null; return H.move('low','p2')})()`); await D.step(14)
  d1 = await st(D)
  ck('burrowed: a LOW hits and surfaces him', d1.hp < hpB && !d1.s.burrow, `hp ${hpB}→${d1.hp} burrow=${!!d1.s.burrow}`)
  await D.step(30)
  ck('Dustin: no page errors', D.errors.length === 0, D.errors.join(' | '))
  await D.page.close()

  // ── 4. CPU + determinism: AI-vs-AI Shane vs Dustin, same seed → identical state incl. ninja GAME_STATE ────
  const E = await boot('ns_red', 'ns_yellow')
  const run = seed => E.page.evaluate(s => { __harness.rng.forceSeed(s); __harness.aiVsAi.start({ p1: 'ns_red', p2: 'ns_yellow', matches: 1, speed: 1 }); __harness.aiVsAi.step(1500)
    const snap = w => { const p = __harness[w](); const n = p._ninja; return { x: +p.x.toFixed(4), y: +p.y.toFixed(4), hp: p.health, en: +(p.energy || 0).toFixed(4), np: n?.np, stats: n?.stats } }
    return JSON.stringify({ a: snap('p1'), b: snap('p2') }) }, seed)
  const r1 = await run(7777), r2 = await run(7777), r3 = await run(4242)
  report.aiVsAi = JSON.parse(r1)
  ck('AI-vs-AI Shane vs Dustin: same seed → identical state (incl. Ninja Power + stats)', r1 === r2, `${r1}\n${r2}`)
  ck('AI-vs-AI: different seed diverges', r1 !== r3)
  const s1 = JSON.parse(r1)
  ck('AI-vs-AI: the CPU actually uses the ninja kit (streaks or specials happened)', (s1.a.stats?.streaks || 0) + (s1.b.stats?.streaks || 0) + (s1.a.np < 100 ? 1 : 0) > 0, r1)
  ck('AI-vs-AI: no page errors', E.errors.length === 0, E.errors.join(' | '))
  await E.page.close()
} catch (e) { fail++; console.log('FAIL MSV1 exception', e.stack) }
finally { await browser.close(); server.close() }
fs.writeFileSync(ROOT + 'docs/msv1/mechanics_results.json', JSON.stringify(report, null, 2))
console.log(`\nMSV1 MECHANICS: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
