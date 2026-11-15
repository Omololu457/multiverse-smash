// harness/frozone_damage.mjs — Frozone: MEASURED damage of every move against several opponents (different defence
// profiles; fresh foe, no combo scaling, standing dummy) through the real combat pipeline (H.move = startFzMove →
// combat.startMove; the Lance / Black Ice volumes are engine projectiles; Shatter and the ultimate go through W.damage).
// Also measures Black Ice contact, Frost Lance, Shatter (Lance freeze → Heavy) and the confirmed ultimate.
// Writes docs/frozone/damage_results.json (DAMAGE_AUDIT.md is written from it).     node harness/frozone_damage.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const OPP = ['frozone', 'goku', 'superman', 'megumi_fushiguro', 'syndrome']
const MOVES = [['light', 90], ['fL2', 90], ['fL3', 90], ['fLow', 110], ['heavy', 110], ['fLaunch', 100], ['fLance', 280], ['fRush', 220], ['fRise', 100], ['fBreaker', 110]]
const server = await serve(), browser = await chromium.launch({ headless: true }), out = { opponents: {} }, errors = []
for (const opp of OPP) {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + `/index.html?harness=1&p1=frozone&p2=${opp}&seed=5151`); await page.waitForFunction(() => window.__harness?.frozoneTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone())
  const res = await page.evaluate(([MOVES]) => { const H = __harness.frozoneTest, step = n => __harness.luffyTest.step(n); __harness.setDummyBehavior('stand')
    const a = () => H.raw(), b = () => H.raw('p2')
    const setup = gap => { H.reset(); a().x = 1300; b().x = 1300 + gap; a().facing = 1; b().facing = -1
      for (const f of [a(), b()]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0; f.comboTimer = 0; f.invulnTimer = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.isBlocking = false; f._forceGuard = false } step(1) }
    const busy = () => a().attacking || H.projectiles().length || H.ult().active || b().hitstun > 0
    const watch = (fn, max = 900) => { const hp0 = b().health, hits = []; let hp = hp0; fn()
      for (let i = 0; i < max; i++) { step(1); if (b().health < hp) { hits.push(+(hp - b().health).toFixed(2)); hp = b().health } if (i > 10 && !busy()) break }
      return { hits, total: +(hp0 - b().health).toFixed(2) } }
    const r = { maxHp: b().maxHealth, moves: {} }
    for (const [k, gap] of MOVES) { setup(gap); r.moves[k] = watch(() => H.move(k)) }
    // air strike / down-air from a real jump arc (airborne Frozone above / beside the foe)
    setup(70); a().y -= 60; a().vy = 0; a().onGround = false; a().grounded = false; r.moves.air = watch(() => H.move('air'))
    setup(20); a().y -= 130; a().vy = 0; a().onGround = false; a().grounded = false; r.moves.fDownAir = watch(() => H.move('fDownAir'))
    // Black Ice: patch, then the foe steps onto it
    setup(600); H.move('fBlackIce'); for (let i = 0; i < 40 && !a()._frozone?.patch; i++) step(1); for (let i = 0; i < 30 && a().attacking; i++) step(1)
    r.moves.blackIceContact = watch(() => { b().x = a()._frozone.patch.x - b().w / 2 })
    // Frost Lance: patch, then a Lance through it
    setup(330); H.move('fBlackIce'); for (let i = 0; i < 60 && a().attacking; i++) step(1); r.moves.frostLance = watch(() => H.move('fLance'))
    // Shatter: 2 pips + Lance → freeze → Heavy (three contacts: lance, heavy, shatter bonus)
    setup(280); H.chill(2); r.moves.shatterRoute = watch(() => { H.move('fLance'); for (let i = 0; i < 80 && !a()._frozone?.freeze; i++) step(1); a().x = b().x - 110; a().attacking = false; a().currentAttack = null; H.move('heavy') })
    r.moves.shatterRoute.stats = { shatters: a()._frozone?.stats?.shatters, freezes: a()._frozone?.stats?.freezes }
    // confirmed ultimate (opener + 4 scheduled contacts)
    setup(110); r.ultimate = watch(() => H.move('ultOpen'), 500)
    // DEFENCE LEVELS: the shared defenseMultiplier (transform forms set 1.25–2) on the same foe
    r.defence = {}
    for (const def of [1, 1.25, 1.5, 2]) { const row = {}
      for (const [k, gap] of [['light', 90], ['heavy', 110], ['fLance', 280], ['fBreaker', 110]]) { setup(gap); b().defenseMultiplier = def; row[k] = watch(() => H.move(k)).total }
      setup(110); b().defenseMultiplier = def; row.ultimate = watch(() => H.move('ultOpen'), 500).total; b().defenseMultiplier = 1
      r.defence[def] = row }
    return r }, [MOVES])
  out.opponents[opp] = res; console.log(opp, JSON.stringify(Object.fromEntries(Object.entries(res.moves).map(([k, v]) => [k, v.total]))), 'ult', res.ultimate.total, JSON.stringify(res.ultimate.hits), 'def', JSON.stringify(res.defence))
  await page.close()
}
out.errors = errors
fs.writeFileSync('docs/frozone/damage_results.json', JSON.stringify(out, null, 1) + '\n')
await browser.close(); server.close?.(); process.exit(errors.length ? 1 : 0)
