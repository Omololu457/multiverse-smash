// harness/syndrome_damage.mjs — Syndrome: MEASURED damage of every move against several opponents (fresh foe, no combo
// scaling, standing dummy), through the real combat pipeline (H.move = startSyMove → combat.startMove; machine volumes
// are engine projectiles; the ultimate goes through W.damage). Also measures the confirmed ultimate and the two-hit
// command routes. Writes docs/syndrome/damage_results.json (DAMAGE_AUDIT.md is written from it).
//   node harness/syndrome_damage.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const OPP = ['syndrome', 'goku', 'superman', 'megumi_fushiguro', 'robin']
const MOVES = [['light', 90], ['sL2', 90], ['sL3', 90], ['sLow', 90], ['heavy', 130], ['sLaunch', 100], ['sZero', 110],
  ['sDuet', 260], ['sSpin', 160], ['sVelo', 220], ['sTurret', 340], ['sTurretMs', 260], ['sTurretMortar', 300], ['sHammer', 260], ['sRise', 200], ['sSweep', 200]]
const server = await serve(), browser = await chromium.launch({ headless: true }), out = { opponents: {} }, errors = []
for (const opp of OPP) {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + `/index.html?harness=1&p1=syndrome&p2=${opp}&seed=5151`); await page.waitForFunction(() => window.__harness?.syndromeTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone())
  const res = await page.evaluate(([MOVES]) => { const H = __harness.syndromeTest, step = n => __harness.luffyTest.step(n); __harness.setDummyBehavior('stand')
    const setup = gap => { H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0; f.comboTimer = 0; f.invulnTimer = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.isBlocking = false; f._forceGuard = false } step(1) }
    const busy = () => { const s = H.raw()._syndrome; return H.raw().attacking || H.projectiles().length || s?.mobile || s?.spin || s?.turret || s?.omni || H.ult().active }
    const run = (k, gap) => { setup(gap); const b = H.raw('p2'), hp0 = b.health, hits = []; let hp = hp0; H.move(k)
      for (let i = 0; i < 900; i++) { step(1); if (b.health < hp) { hits.push(+(hp - b.health).toFixed(2)); hp = b.health } if (i > 10 && !busy()) break }
      return { hits, total: +(hp0 - b.health).toFixed(2) } }
    const r = { maxHp: H.raw('p2').maxHealth, moves: {} }
    for (const [k, gap] of MOVES) r.moves[k] = run(k, gap)
    // confirmed ultimate (opener + 8 scheduled contacts)
    setup(120); const b = H.raw('p2'), hp0 = b.health; H.move('ultOpen'); const uh = []; let hp = hp0
    for (let i = 0; i < 500; i++) { step(1); if (b.health < hp) { uh.push(+(hp - b.health).toFixed(2)); hp = b.health } if (i > 30 && !H.ult().active && !H.raw().attacking) break }
    r.ultimate = { hits: uh, total: +(hp0 - b.health).toFixed(2) }
    return r }, [MOVES])
  out.opponents[opp] = res; console.log(opp, JSON.stringify(Object.fromEntries(Object.entries(res.moves).map(([k, v]) => [k, v.total]))), 'ult', res.ultimate.total)
  await page.close()
}
out.errors = errors
fs.writeFileSync('docs/syndrome/damage_results.json', JSON.stringify(out, null, 1) + '\n')
await browser.close(); server.close?.(); process.exit(errors.length ? 1 : 0)
