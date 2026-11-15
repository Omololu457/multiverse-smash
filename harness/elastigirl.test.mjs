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
  await page.evaluate(() => __harness.setRoundTimer?.(99999))
  return page
}
const G = (page, fn, arg) => page.evaluate(fn, arg)
// driver: real keyboard edges, sim stepped by hand (P1: J light, K heavy, I up-attack, L special, U ultimate, ; block, WASD)
function drv(page) {
  const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
  const st = (w = 'p1') => page.evaluate(w => __harness.elastigirlTest.state(w), w)
  async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
  async function down(ks) { for (const k of ks) await page.keyboard.down(k) }
  async function up(ks) { for (const k of ks) await page.keyboard.up(k) }
  async function reset(gap = 120, o = {}) {
    await page.evaluate(([gap, o]) => { const H = __harness.elastigirlTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
      a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f.isBlocking = false; f._forceGuard = false
        f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, o]); await step(2)
  }
  async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const q = await st(); if (pred(q)) return q; await step(1) } return st() }
  return { step, st, tap, down, up, reset, wait }
}
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
  // ══ PHASE 3 — Slingshot + Rubber Body + GAME_STATE ══
  if (want('P3')) {
    const page = await open('elastigirl', 'batman'); const d = drv(page)
    await d.reset(400)
    // jump, then Up + Special in the air → the pendulum
    await d.tap(['w'], 2); await d.step(6)
    const e0 = (await d.st()).energy
    await d.down(['w', 'l']); await d.step(3)
    const a = await d.st()
    const ang = a.sw ? Math.atan2(a.sw.ay - (a.y + a.h * 0.30), a.sw.ax - (a.x + a.w / 2)) * 180 / Math.PI : null
    ok('P3 Slingshot: air ↑+Special puts her on the pendulum (Spider-Man integrator: _swinging)', a.swinging && a.s.sling && a.cast === 'eSling', JSON.stringify({ sw: a.swinging, cast: a.cast }))
    ok('P3 Slingshot: rope 220 px, anchor up-forward (45° start)', a.sw && a.sw.L === 220 && a.sw.ax > a.x + a.w / 2, JSON.stringify({ L: a.sw?.L, ang }))
    ok('P3 Slingshot costs 12 Elasticity', Math.abs((e0 + 3 * 5 / 60) - a.energy - 12) < 0.3, `${e0.toFixed(2)} → ${a.energy.toFixed(2)}`)
    await d.step(14); const held = await d.st()
    ok('P3 Slingshot: holding Special keeps her swinging (gravity skipped, position on the arc)', held.swinging && !held.grounded, JSON.stringify({ x: held.x | 0, y: held.y | 0, vx: held.vx?.toFixed(1) }))
    await d.up(['l']); await d.step(1); const rel = await d.st()
    ok('P3 Slingshot: Special button-up releases with tangential momentum (forward fling)', !rel.swinging && !rel.s.sling && rel.vx > 4 && rel.cast === 'eSlingRelease', JSON.stringify({ vx: rel.vx?.toFixed(2), vy: rel.vy?.toFixed(2), cast: rel.cast }))
    ok('P3 Slingshot: 2 s cooldown starts at the release', rel.s.cd.sling >= 118 && rel.s.cd.sling <= 120, String(rel.s.cd.sling))
    await d.up(['w'])
    // once per airtime: second try in the same airtime is refused (nothing spent)
    await page.evaluate(() => { const f = __harness.elastigirlTest.raw(); f._elastigirl.cd.sling = 0 })
    const b0 = await d.st(); await d.down(['w', 'l']); await d.step(3); await d.up(['w', 'l']); const b1 = await d.st()
    ok('P3 Slingshot: one per airtime (second press refused, no cost)', !b0.grounded && !b1.swinging && b1.s.stats.slings === 1 && b1.energy >= b0.energy, JSON.stringify({ g: b0.grounded, slings: b1.s.stats.slings, e: [b0.energy.toFixed(1), b1.energy.toFixed(1)] }))
    const landed = await d.wait(q => q.grounded, 200)
    ok('P3 Slingshot: landing re-arms it', landed.grounded && landed.s.slingUsed === false)
    // cooldown: a REAL release from the ground start (short hop → sling → release → land quickly), then a fresh airtime
    // while it is still cooling is refused; after the counter reaches 0 a fresh airtime is allowed.
    await d.reset(600); await d.tap(['w'], 2); await d.step(3); await d.down(['w', 'l']); await d.step(6); await d.up(['l']); await d.up(['w'])
    await d.step(1); await page.evaluate(() => { const f = __harness.elastigirlTest.raw(); f.vx = 0; f.vy = 0; f.y = (f.groundY ?? 470) - f.h - 1 }); await d.wait(q => q.grounded, 60)
    const cd0 = (await d.st()).s.cd.sling
    await d.tap(['w'], 2); await d.step(4); await d.down(['w', 'l']); await d.step(3); const c1 = await d.st(); await d.up(['w', 'l']); await d.wait(q => q.grounded, 200)
    const left = (await d.st()).s.cd.sling; await d.step(left + 1)
    await d.tap(['w'], 2); await d.step(4); await d.down(['w', 'l']); await d.step(3); const c3 = await d.st(); await d.up(['w', 'l'])
    ok('P3 Slingshot: 2 s cooldown — refused while cooling, allowed once it ends', cd0 > 60 && c1.swinging === false && c3.swinging === true, JSON.stringify({ cdAtLanding: cd0, during: c1.swinging, after: c3.swinging }))
    await d.wait(q => q.grounded && !q.swinging, 300)
    // RUBBER BODY at the choke-point: melee normals ×0.85; specials / projectiles / ultimates / chip untouched
    const rb = await G(page, async () => { const M = await import('./elastigirlState.js'); const eg = { rosterKey: 'elastigirl', energy: 0, maxEnergy: 100 }
      const atk = a => ({ rosterKey: 'batman', energy: 0, maxEnergy: 100, currentAttack: a })
      return { light: M.elastigirlDamageMods(eg, 100, { source: 'melee', attacker: atk({ name: 'light', category: 'light' }) }),
        heavy: M.elastigirlDamageMods(eg, 100, { source: 'melee', attacker: atk({ name: 'heavy', category: 'heavy' }) }),
        special: M.elastigirlDamageMods(eg, 100, { source: 'melee', attacker: atk({ name: 'bGrapnel', category: 'special', isSpecial: true }) }),
        ult: M.elastigirlDamageMods(eg, 100, { source: 'melee', attacker: atk({ name: 'ultOpen', isUltimate: true }) }),
        fire: M.elastigirlDamageMods(eg, 100, { source: 'melee', attacker: atk({ name: 'heavy', category: 'heavy', damageType: 'fire' }) }),
        proj: M.elastigirlDamageMods(eg, 100, { source: 'projectile', attacker: atk(null) }),
        other: M.elastigirlDamageMods({ rosterKey: 'zoro' }, 100, { source: 'melee', attacker: atk({ name: 'light', category: 'light' }) }) } })
    ok('P3 Rubber Body: −15 % from melee normals (light / heavy)', Math.abs(rb.light - 85) < 1e-9 && Math.abs(rb.heavy - 85) < 1e-9, JSON.stringify(rb))
    ok('P3 Rubber Body: specials / ultimates / elemental / projectiles / other characters unchanged', rb.special === 100 && rb.ult === 100 && rb.fire === 100 && rb.proj === 100 && rb.other === 100)
    // live: Batman's real Jab on her → the rubber counter ticks and she takes ×0.85 of what the same hit does with the passive off
    await d.reset(70, { energy: 50 })
    const live = await G(page, () => { const T = __harness.elastigirlTest, B = __harness.batmanTest, eg = T.raw(), bm = T.raw('p2'); bm.facing = -1
      const hp0 = eg.health, r0 = eg._elastigirl?.stats?.rubber || 0; B.move('light', 'p2'); let hit = 0
      for (let i = 0; i < 30 && !hit; i++) { __harness.luffyTest.step(1); if (eg.health < hp0) hit = hp0 - eg.health }
      return { hit, rubber: (eg._elastigirl?.stats?.rubber || 0) - r0 } })
    ok('P3 Rubber Body live: a real Batman Jab on her goes through the passive', live.hit > 0 && live.rubber === 1, JSON.stringify(live))
    // ALL STATE IN GAME_STATE: the snapshot row carries her state + the pendulum, and no cue queue
    await d.reset(400); await d.tap(['w'], 2); await d.step(6); await d.down(['w', 'l']); await d.step(4)
    const snap = await G(page, () => __harness.elastigirlTest.snapshot()); await d.up(['w', 'l'])
    ok('P3 GAME_STATE snapshot carries state + pendulum (no render cues)', !!snap[0]?.sling && Array.isArray(snap[2]) && snap[2][2] === 220 && !('cues' in snap[0] && snap[0].cues), JSON.stringify(snap[2]))
    results.P3 = { sling: { L: a.sw?.L, ang, release: { vx: rel.vx, vy: rel.vy } }, rubber: rb, live }
    await page.close()
  }
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally {
  fs.mkdirSync('docs/elastigirl', { recursive: true }); fs.writeFileSync(`docs/elastigirl/test_results${ONLY.length ? '_' + ONLY.join('_') : ''}.json`, JSON.stringify({ pass, fail, results }, null, 1) + '\n')
  console.log(`elastigirl.test: ${pass} passed, ${fail} failed`); await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
}
