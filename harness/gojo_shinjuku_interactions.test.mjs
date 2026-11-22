// harness/gojo_shinjuku_interactions.test.mjs — MSV1-GOJO phase 6: Satoru Gojo (Shinjuku) against the roster's special
// systems. P1 = the other character (real inputs / its own harness hooks), P2 = gojo_shinjuku (training dummy, driven
// through __harness.gojoShinjukuTest with 'p2'). Every "Infinity stops it" check has an Infinity-OFF control.
// (Every cinematic super vs L1 / L2 / L3 is harness/gojo_shinjuku_supers.mjs.)
// Usage: node harness/gojo_shinjuku_interactions.test.mjs [--only clones,drones,enoch,webs,domains]
import { chromium } from 'playwright'
import fs from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const want = k => !ONLY.length || ONLY.includes(k)
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
let pass = 0, fail = 0
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${c ? '' : d}`) }
const report = {}
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const E = (fn, a) => page.evaluate(fn, a)
const G = () => E(() => { const s = __harness.gojoShinjukuTest.state('p2'); return { hp: s.hp, maxHp: s.maxHp, inf: s.inf, ce: s.ce, frozen: s.frozen, burnout: s.s.burnout, st: s.s.stats, clash: s.s.lastClash || null } })
const steps = async n => { for (let i = 0; i < n; i++) await step(1) }
async function boot(p1) {
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=gojo_shinjuku&seed=50223`)
  await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
  await E(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await step(3)
}
async function place(gap, inf = 0) {
  await E(([gap, inf]) => { const H = __harness.gojoShinjukuTest; H.reset(); __harness.setDummyBehavior('stand'); __harness.healP1?.(); __harness.healP2?.()
    const a = H.raw('p1'), b = H.raw('p2'); a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.vx = b.vx = 0
    H.setCe(100, 'p2'); H.setInfinity(inf, 'p2'); H.setEnergy(300, 'p2') }, [gap, inf])
  await step(2)
}
const key = async (keys, n = 2) => { for (const k of keys) await page.keyboard.down(k); await step(n); for (const k of keys) await page.keyboard.up(k) }
// hold whatever `kind` is into the centre of Gojo's newest Blue field for `n` frames (proves the core crush on the real objects)
async function holdInCore(kind, n) { let held = 0
  for (let i = 0; i < n; i++) { held += await E(k => { const H = __harness.gojoShinjukuTest, F = H.fields('p2').filter(F => F.core).pop(); return F ? H.park(k, F.x, F.y) : 0 }, kind); await step(1) }
  return held }

try {
  // ── CLONES (MSV1 Wind Ranger, ←+Charge = 2 Shadow Clones that strike) ──
  if (want('clones')) {
    await boot('ns_red'); const R = report.clones = {}
    const run = async inf => { await place(220, inf); await E(() => { __harness.gojoShinjukuTest.raw('p1')._ninja.np = 100 }); await key(['a', 'p']); await steps(150); return G() }
    const off = await run(0), on = await run(1); R.off = off.maxHp - off.hp; R.l1 = { dmg: on.maxHp - on.hp, stopped: on.st.stopped }
    ck('clones: their strikes land with Infinity off (control)', R.off > 0, R.off)
    ck('clones: Infinity L1 stops every clone strike (no damage, stopped + taxed)', R.l1.dmg === 0 && R.l1.stopped >= 1, JSON.stringify(R.l1))
    await place(320, 0); await E(() => { __harness.gojoShinjukuTest.raw('p1')._ninja.np = 100 }); await key(['a', 'p']); await steps(4)
    await E(() => __harness.gojoShinjukuTest.move('gLapse', 'p2', { dir: -1 })); for (let i = 0; i < 40 && !(await E(() => __harness.gojoShinjukuTest.fields('p2').length)); i++) await step(1)
    const before = await E(() => (__harness.gojoShinjukuTest.raw('p1')._ninja.clones || []).filter(c => !c.dead).length)
    await holdInCore('clones', 3); const after = await E(() => (__harness.gojoShinjukuTest.raw('p1')._ninja.clones || []).filter(c => !c.dead).length), g = await G()
    R.blue = { before, after, crushed: g.st.crushed }
    ck('clones: a clone inside a Blue core is crushed', before > 0 && after < before && g.st.crushed >= 1, JSON.stringify(R.blue))
  }
  // ── DRONES (Green Arrow, Overwatch drone shoots) ──
  if (want('drones')) {
    await boot('green_arrow'); const R = report.drones = {}
    const run = async inf => { await place(400, inf); await E(() => __harness.gaSpawnDrone('overwatch')); await steps(240); return G() }
    const off = await run(0), on = await run(1); R.off = off.maxHp - off.hp; R.l1 = { dmg: on.maxHp - on.hp, stoppedProj: on.st.stoppedProj }
    ck('drones: drone fire lands with Infinity off (control)', R.off > 0, R.off)
    ck('drones: Infinity L1 stops the drone\'s shots', R.l1.dmg === 0 && R.l1.stoppedProj >= 1, JSON.stringify(R.l1))
    await place(300, 0); await E(() => __harness.gaSpawnDrone('overwatch')); await step(4)
    await E(() => __harness.gojoShinjukuTest.move('gMaxBlue', 'p2', { dir: -1 })); for (let i = 0; i < 40 && !(await E(() => __harness.gojoShinjukuTest.fields('p2').length)); i++) await step(1)
    await holdInCore('drones', 3); const d = await E(() => __harness.gaDrones().filter(x => !x.dying).length), g = await G()
    R.maxBlue = { liveDrones: d, crushed: g.st.crushed }
    ck('drones: Maximum Output Blue crushes a drone caught in its core', d === 0 && g.st.crushed >= 1, JSON.stringify(R.maxBlue))
  }
  // ── ENOCH (fire floor patch under Gojo; Hollow Purple erases patches) ──
  if (want('enoch')) {
    await boot('enoch'); const R = report.enoch = {}
    const lay = () => E(() => { const b = __harness.gojoShinjukuTest.raw('p2'); return __harness.enochTest.patch({ type: 'fire', x: b.x - 40, width: 140 }, 'p1') })
    const run = async inf => { await place(300, inf); await lay(); await steps(120); return G() }
    const off = await run(0), on = await run(1); R.off = off.maxHp - off.hp; R.l1 = { dmg: on.maxHp - on.hp, stopped: on.st.stopped }
    ck('enoch: a fire patch burns him with Infinity off (control)', R.off > 0, R.off)
    ck('enoch: Infinity L1 stops the patch damage (taxed instead)', R.l1.dmg === 0 && R.l1.stopped >= 1, JSON.stringify(R.l1))
    await place(500, 0); await E(() => { const H = __harness.gojoShinjukuTest, b = H.raw('p2'); return __harness.enochTest.patch({ type: 'fire', x: b.x - 260, width: 120 }, 'p1') })
    const n0 = await E(() => __harness.gojoShinjukuTest.raw('p1')._enoch.field.patches.length)
    await E(() => __harness.gojoShinjukuTest.move('gPurple', 'p2', { dir: -1 })); await steps(140)
    const n1 = await E(() => __harness.gojoShinjukuTest.raw('p1')._enoch.field.patches.length), g = await G(); R.purple = { before: n0, after: n1, erased: g.st.erased }
    ck('enoch: Hollow Purple erases a patch in its path', n0 >= 1 && n1 < n0 && g.st.erased >= 1, JSON.stringify(R.purple))
  }
  // ── SPIDER-MAN WEBS (Web Throw → WEBBED stack on a clean hit) ──
  if (want('webs')) {
    await boot('spiderman'); const R = report.webs = {}
    const run = async inf => { await place(115, inf); await E(() => { __harness.forceWebbed?.(0, 'p2'); __harness.gojoShinjukuTest.raw('p2')._webStacks = 0; __harness.fillEnergy(); __harness.p1SpecialDir('F') }); await steps(30)
      return { g: await G(), web: await E(() => __harness.spiderWebbed('p2')) } }
    const off = await run(0), on = await run(1); R.off = { dmg: off.g.maxHp - off.g.hp, stacks: off.web.stacks }; R.l1 = { dmg: on.g.maxHp - on.g.hp, stacks: on.web.stacks, stoppedProj: on.g.st.stoppedProj }
    ck('webs: a Web Throw hits and WEBS him with Infinity off (control)', R.off.dmg > 0 && R.off.stacks >= 1, JSON.stringify(R.off))
    ck('webs: Infinity L1 stops the web (no damage, no WEBBED stack)', R.l1.dmg === 0 && R.l1.stacks === 0 && R.l1.stoppedProj >= 1, JSON.stringify(R.l1))
  }
  // ── DOMAINS (an opponent's domain forces Infinity off; a non-Gojo clash loser loses techniques for 5 s) ──
  if (want('domains')) {
    const R = report.domains = {}
    await boot('sukuna')
    await place(160, 3); await E(() => { __harness.fillEnergy(); __harness.resetUlt(); __harness.p1Ultimate() }); await steps(60)
    let g = await G(); R.sukunaL3 = { inf: g.inf, forced: g.st.forcedOff }
    ck('domains: Malevolent Shrine forces Infinity off (even L3)', g.inf === 0 && g.st.forcedOff.domain >= 1, JSON.stringify(R.sukunaL3))
    // clash vs Sukuna: Gojo opens (cast ~24 f), Sukuna opens on top of it, Sukuna mashes Special → Sukuna wins
    await place(260, 0); await E(() => { __harness.fillEnergy(); __harness.resetUlt(); __harness.gojoShinjukuTest.move('gDomain', 'p2') }); await steps(10)
    await E(() => __harness.p1Ultimate()); await steps(20)
    for (let i = 0; i < 100; i++) { if (i % 3 === 0) await key(['l'], 1); else await step(1) }
    let won = false; for (let i = 0; i < 200 && !((await G()).burnout > 0); i++) await step(1)
    g = await G(); const tb = await E(() => __harness.gojoShinjukuTest.raw('p1')._gsTechBurnout || 0)
    R.clash = { clash: g.clash, gojoBurnout: g.burnout, sukunaTechBurnout: tb }
    ck('domains: Gojo vs Sukuna domain clash — the masher (Sukuna) wins, then Gojo burns out', g.clash?.result === 'lose' && g.burnout > 0, JSON.stringify(R.clash))
    ck('domains: … and the losing-side lockout lands on Sukuna too (techniques off 5 s)', tb > 200, tb)
    const blocked = await E(() => { __harness.fillEnergy(); return !!__harness.p1Ultimate()?.cast })
    ck('domains: during that lockout Sukuna cannot cast his ultimate', !blocked, blocked)
    await steps(320); const tb2 = await E(() => __harness.gojoShinjukuTest.raw('p1')._gsTechBurnout || 0)
    ck('domains: the lockout ends after 5 s', tb2 === 0, tb2)
    // the OLD Gojo's Unlimited Void on the new Gojo: forced off + frozen
    await boot('gojo'); await place(200, 1); await E(() => { __harness.fillEnergy(); __harness.resetUlt(); __harness.p1Ultimate() }); await steps(60)
    g = await G(); R.oldGojo = { inf: g.inf, frozen: g.frozen, forced: g.st.forcedOff }
    ck('domains: the old Gojo\'s Unlimited Void forces Infinity off and freezes him', g.inf === 0 && g.frozen && g.st.forcedOff.domain >= 1, JSON.stringify(R.oldGojo))
  }
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.writeFileSync('docs/msv1/gojo/interactions_results.json', JSON.stringify(report, null, 1))
console.log(`\n  GOJO_SHINJUKU INTERACTIONS: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.()
process.exit(fail ? 1 : 0)
