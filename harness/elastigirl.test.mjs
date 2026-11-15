// harness/elastigirl.test.mjs — Elastigirl mechanics / moveset / combos / defense, measured in the REAL game
// (index.html?harness=1, requestAnimationFrame off, sim stepped frame by frame). Sections grow per build phase:
//   node harness/elastigirl.test.mjs [--only P2,P3,...]
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const ONLY = (process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '').split(',').filter(Boolean)
const want = s => !ONLY.length || ONLY.includes(s)
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], results = {}
let pass = 0, fail = 0
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, d) }
async function open(p1 = 'elastigirl', p2 = 'elastigirl', seed = 424242) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=${seed}`); await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.spriteReady().ready, null, { timeout: 60000 })
  return page
}
const G = (page, fn, arg) => page.evaluate(fn, arg)
try {
  // ══ PHASE 2 — base stats + Elasticity ══
  if (want('P2')) {
    const page = await open()
    const d = await G(page, async () => { const { characters } = await import('./characters.js'); const c = characters.elastigirl
      const L = __harness.luffyTest, s = L.state('p1')
      return { stats: c.stats, traits: c.traits, energyConfig: c.energyConfig, hp: s.health, maxE: c.stats.maxEnergy, live: s } })
    ok('P2 health 980 (roster stat + live fighter)', d.stats.maxHealth === 980 && d.hp === 980, JSON.stringify({ stat: d.stats.maxHealth, live: d.hp }))
    const walk = Math.max(4.5, Math.min(9.5, 4.5 + (d.stats.speed - 78) / 20 * 5)), run = Math.max(8, Math.min(16, d.stats.dashSpeed * 0.55))
    ok('P2 walkSpeed 5.0 px/f (engine walk formula on stats.speed)', Math.abs(walk - 5.0) < 1e-9, `speed ${d.stats.speed} → ${walk}`)
    ok('P2 runSpeed 7.6 → engine run floor 8 px/f (closest legal; documented)', run === 8, `dashSpeed ${d.stats.dashSpeed} → ${run}`)
    ok('P2 jumpForce 11.5 → jumpPower 25 (×2.2 engine scale), weight 0.95', d.stats.jumpPower === 25 && d.stats.weight === 0.95, JSON.stringify({ jp: d.stats.jumpPower, w: d.stats.weight }))
    ok('P2 hasEnergy, maxEnergy 100, energyName "Elasticity"', d.traits.hasEnergy === true && d.maxE === 100 && d.traits.energyName === 'Elasticity' && d.energyConfig.label === 'Elasticity', JSON.stringify(d.traits))
    // recharge: 5/s measured over 120 frames from 10 energy (no hits, idle)
    const r = await G(page, () => { const L = __harness.luffyTest; L.set('p1', { energy: 10, x: 1000 }); L.set('p2', { x: 1800, energy: 10 }); const e0 = L.state('p1').energy, o0 = L.state('p2').energy; L.step(120); return { d: L.state('p1').energy - e0, o: L.state('p2').energy - o0 } })
    ok('P2 recharge 5/s (+10.0 over 120 f)', Math.abs(r.d - 10) < 0.05, JSON.stringify(r))
    // +4 landed / +3 taken: one P1 hit on P2 through the damage choke-point (both are Elastigirl here)
    // +4 landed / +3 taken — unit-checked at the damage choke-point (her live normals arrive in P4, where the
    // end-to-end version of this check is re-run with a real Jab). Guard chip and other characters are untouched.
    const h = await G(page, async () => { const M = await import('./elastigirlState.js'); const src = await (await fetch('./combat.js')).text()
      const mk = k => ({ rosterKey: k, energy: 20, maxEnergy: 100 }); const eg = mk('elastigirl'), foe = mk('batman'), foe2 = mk('batman')
      M.elastigirlDamageMods(foe, 30, { source: 'melee', attacker: eg }); const landed = [eg.energy, foe.energy]
      const eg2 = mk('elastigirl'); M.elastigirlDamageMods(eg2, 30, { source: 'projectile', attacker: foe2 }); const taken = [eg2.energy, foe2.energy]
      const eg3 = mk('elastigirl'), foe3 = mk('batman'); M.elastigirlDamageMods(eg3, 5, { source: 'block-chip', attacker: foe3 })
      const o1 = mk('batman'), o2 = mk('zoro'); const ret = M.elastigirlDamageMods(o1, 30, { source: 'melee', attacker: o2 })
      const full = mk('elastigirl'); full.energy = 98; M.elastigirlDamageMods(foe, 30, { attacker: full })
      return { landed, taken, chip: [eg3.energy, foe3.energy], others: [o1.energy, o2.energy, ret], cap: full.energy, hooked: /rawDamage = elastigirlDamageMods\(target, rawDamage, opts\)/.test(src) } })
    ok('P2 hit landed: Elastigirl +4 Elasticity (foe unchanged)', h.landed[0] === 24 && h.landed[1] === 20, JSON.stringify(h.landed))
    ok('P2 hit taken: Elastigirl +3 Elasticity (any source)', h.taken[0] === 23 && h.taken[1] === 20, JSON.stringify(h.taken))
    ok('P2 guard chip grants nothing; other characters untouched; capped at 100', h.chip.join() === '20,20' && h.others.join() === '20,20,30' && h.cap === 100, JSON.stringify(h))
    ok('P2 hook sits on combat.applyScaledDamage (the single damage choke-point)', h.hooked)
    results.P2 = { regenPer120: r, gain: h }
    await page.close()
  }
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally {
  fs.mkdirSync('docs/elastigirl', { recursive: true }); fs.writeFileSync(`docs/elastigirl/test_results${ONLY.length ? '_' + ONLY.join('_') : ''}.json`, JSON.stringify({ pass, fail, results }, null, 1) + '\n')
  console.log(`elastigirl.test: ${pass} passed, ${fail} failed`); await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
}
