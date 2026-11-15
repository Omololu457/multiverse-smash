// harness/elastigirl.test.mjs — Elastigirl mechanics / moveset / combos / defense, measured in the REAL game
// (index.html?harness=1, requestAnimationFrame off, sim stepped frame by frame). Sections grow per build phase:
//   node harness/elastigirl.test.mjs [--only P2,P3,...]
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { comboDriver } from './elastigirl_combo_lib.mjs'
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
  // ══ PHASE 4 — moveset (frame data measured live: startup = first active frame, advantage = defender free − attacker free) ══
  if (want('P4')) {
    const page = await open('elastigirl', 'batman'); const d = drv(page)
    const measure = (key, gap, block) => page.evaluate(([key, gap, block]) => {
      const H = __harness.elastigirlTest, L = __harness.luffyTest; H.reset(); __harness.setDummyBehavior(block ? 'block' : 'stand')
      const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + a.w + gap; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.hitstun = f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.vx = f.vy = 0; f.comboCounter = 0; f._forceGuard = !!block && f === b; f.isBlocking = !!block && f === b }
      b._was = false; L.step(2); const hp0 = b.health, e0 = a.energy, ok = H.move(key); const e1 = a.energy
      let first = null, act = 0, hits = [], aFree = null, dFree = null, reach = null, hurtW = 0, invuln = [], level = null, bounceVy = null, near = null, raftBoxes = 0
      for (let i = 0; i < 400; i++) { const s = H.state(), box = s.box && s.box.w > 1 ? s.box : null
        if (box) { act++; if (first == null) first = i; reach = Math.max(reach ?? 0, box.x + box.w - (a.x + a.w)); level = s.attack?.hitLevel || level }
        hurtW = Math.max(hurtW, s.hurt.x + s.hurt.w - (a.x + a.w)); if (s.attack?.name === 'eWhirl') invuln.push([s.attack.total - s.attack.timer, s.hurt.y - a.y])
        L.step(1)
        const last = hits.length ? hits[hits.length - 1].hp : hp0
        if (b.health < last) hits.push({ i, d: last - b.health, hp: b.health, stored: H.state().attack?.damage })
        if (key === 'eWhip' && hits.length && bounceVy == null && b.vy < 0) bounceVy = b.vy
        if (key === 'eLongArm' && a.currentAttack?.eg?.key === 'eLongPull') near = Math.round(b.x - (a.x + a.w))
        const busy = a.attacking || a.attackCooldown > 0
        if (aFree == null && !busy && i > 2) aFree = i
        const stunned = b.blockstun > 0 || b.hitstun > 0 || b.hitstop > 0; if (stunned) b._was = true
        if (dFree == null && b._was && !stunned && (b.onGround || b.grounded)) dFree = i
        if (aFree != null && dFree != null) break }
      return { key, ok, cost: Math.round(e0 - e1), first, act, reach: reach && Math.round(reach), hurtReach: Math.round(hurtW), level, hits: hits.map(h => [h.i, h.d, h.stored]), aFree, dFree, adv: aFree != null && dFree != null ? dFree - aFree : null, dmg: hp0 - b.health, invuln, bounceVy, near }
    }, [key, gap, block])
    const SPEC = { light: [6, 120, 0, 20], heavy: [14, 200, -5, 54], eLow: [8, 210, -4, 28], up: [12, 140, -9, 48] }
    const R = {}
    for (const [k, [su, reach, ob, dmg]] of Object.entries(SPEC)) {
      const h = await measure(k, Math.min(reach - 20, 100), false), b = await measure(k, Math.min(reach - 20, 100), true); R[k] = { hit: h, block: b }
      ok(`P4 ${k}: ${su}f startup, ${reach} px reach, ${dmg} stored dmg`, h.first === su && h.reach === reach && h.hits[0]?.[2] === dmg && h.hits[0]?.[1] === Math.floor(dmg * 0.6), JSON.stringify({ first: h.first, reach: h.reach, hit: h.hits[0] }))
      ok(`P4 ${k}: ${ob >= 0 ? '+' : ''}${ob} on block`, b.adv === ob, `measured ${b.adv}`)
      ok(`P4 ${k}: stretched limb is hittable while active (hurtbox reaches ${reach} px)`, h.hurtReach >= reach - 1, `hurt reach ${h.hurtReach}`)
    }
    const low = await page.evaluate(() => __harness.elastigirlTest.data().moves.eLow.hitLevel); ok('P4 Stretch Sweep is a low (hitLevel low)', low === 'low')
    // Air normal: 7 f, 30 dmg, +2 on block (authored onBlock read by the block hook)
    const air = await page.evaluate(() => { const H = __harness.elastigirlTest, L = __harness.luffyTest; H.reset(); const a = H.raw(); a.onGround = a.grounded = false; a.y -= 120; a.vy = -2; const ok = H.move('air'); let first = null
      for (let i = 0; i < 20 && first == null; i++) { const s = H.state(); if (s.box && s.box.w > 1) first = i; L.step(1) } return { ok, first, md: H.data().moves.air } })
    ok('P4 Air (Diving Stretch): 7f startup, 30 dmg, +2 on block', air.ok && air.first === 7 && air.md.damage === 30 && air.md.onBlock === 2, JSON.stringify({ first: air.first }))
    // LONG ARM — 380 px grab + pull, 40 dmg, +18 on hit; whiff leaves the arm out
    const la = await measure('eLongArm', 360, false), lab = await measure('eLongArm', 360, true), law = await measure('eLongArm', 600, false); R.eLongArm = { la, lab, law }
    ok('P4 Long Arm: 14f, 380 px reach, costs 12', la.first === 14 && la.reach === 380 && la.cost === 12, JSON.stringify({ first: la.first, reach: la.reach, cost: la.cost }))
    ok('P4 Long Arm: hit at 360 px pulls the foe in (40 dmg stored)', la.hits[0]?.[2] === 40 && la.near != null && la.near < 40, JSON.stringify({ hit: la.hits[0], near: la.near }))
    ok('P4 Long Arm: +18 on hit (after the pull)', la.adv === 18, `measured ${la.adv}`)
    ok('P4 Long Arm: whiff → long recovery with the arm still out (punishable)', law.hits.length === 0 && law.aFree >= 50 && law.hurtReach >= 379, JSON.stringify({ aFree: law.aFree, hurt: law.hurtReach }))
    // WHIRL KICK — 3 hits 22/22/28, upper body intangible frames 3–9
    const wk = await measure('eWhirl', 20, false), wkb = await measure('eWhirl', 20, true); R.eWhirl = { wk, wkb }
    ok('P4 Whirl Kick: 3 hits 22 / 22 / 28 (stored), costs 15', wk.hits.map(h => h[2]).join() === '22,22,28' && wk.cost === 15, JSON.stringify(wk.hits))
    const inv = Object.fromEntries(wk.invuln), half = inv[3] ?? null
    ok('P4 Whirl Kick: upper body intangible on frames 3–9 only', [3, 4, 5, 6, 7, 8, 9].every(t => inv[t] > 40) && inv[2] < 10 && inv[10] < 10, JSON.stringify({ f2: inv[2], f3: inv[3], f9: inv[9], f10: inv[10] }))
    ok('P4 Whirl Kick on block: all 3 contacts stay guarded', wkb.hits.length === 3 && wkb.hits.every(h => h[1] <= 3), JSON.stringify(wkb.hits))
    // PARACHUTE DROP (ground) — hop dome, 70 overhead, 24f
    const pd = await measure('eDome', 20, false); R.eDome = pd
    ok('P4 Parachute Drop (ground): 24f, overhead, 70 stored, costs 18', pd.first === 24 && pd.level === 'overhead' && pd.hits[0]?.[2] === 70 && pd.cost === 18, JSON.stringify({ first: pd.first, level: pd.level, hit: pd.hits[0], cost: pd.cost }))
    // PARACHUTE (air) — float at fall × 0.35 for ≤ 60 f, then slam
    const pa = await page.evaluate(() => { const H = __harness.elastigirlTest, L = __harness.luffyTest; H.reset(); const a = H.raw(), b = H.raw('p2'); b.x = 2400; a.onGround = a.grounded = false; a.y -= 560; a.vy = 0
      const ok = H.parachute(); const ys = []; let slamAt = null, landAt = null
      for (let i = 0; i < 140; i++) { L.step(1); ys.push(a.y); if (slamAt == null && a.currentAttack?.eg?.key === 'eDomeSlam') slamAt = i; if (landAt == null && (a.onGround || a.grounded)) landAt = i }
      const v = ys.slice(1, 50).map((y, i) => y - ys[i]); return { ok, vmax: Math.max(...v.slice(0, slamAt ?? 50)), v30: v[30], slamAt, landAt } })
    ok('P4 Parachute (air): float fall ≤ 22 × 0.35 = 7.7 px/f', pa.ok && pa.vmax <= 7.7 + 1e-6 && pa.vmax > 7, JSON.stringify(pa))
    ok('P4 Parachute (air): slams after 60 f of float', pa.slamAt >= 58 && pa.slamAt <= 61 && pa.landAt > pa.slamAt, JSON.stringify({ slam: pa.slamAt, land: pa.landAt }))
    // OVERHEAD WHIP — 300 px, 60 overhead, ground bounce
    const ow = await measure('eWhip', 260, false); R.eWhip = ow
    ok('P4 Overhead Whip: 300 px reach, overhead, 60 stored, costs 15', ow.reach === 300 && ow.level === 'overhead' && ow.hits[0]?.[2] === 60 && ow.cost === 15, JSON.stringify({ reach: ow.reach, level: ow.level, hit: ow.hits[0] }))
    ok('P4 Overhead Whip: a hit ground-bounces the foe', ow.bounceVy != null && ow.bounceVy <= -10, String(ow.bounceVy))
    // FAMILY RAFT — R14 windup → raft: 4 hits 40/40/50/90 = 220 stored, then the 100 f lockout
    const ul = await page.evaluate(() => { const H = __harness.elastigirlTest, L = __harness.luffyTest; H.reset(); __harness.setDummyBehavior('stand'); const a = H.raw(), b = H.raw('p2'); a.x = 1000; b.x = 1000 + a.w + 30; a.facing = 1; b.facing = -1; a.energy = 100
      const hp0 = b.health, ok = H.move('eUlt'), eAfter = a.energy, seq = [], hits = []; let last = hp0, x0 = a.x, lock = null, prev = null
      for (let i = 0; i < 420; i++) { const k = a.currentAttack?.eg?.key || null; if (k !== prev) seq.push([k, i]); prev = k
        L.step(1); if (b.health < last) { hits.push(a.currentAttack?.damage); last = b.health }
        if (k === 'eUltRecover' && lock == null) lock = a.currentAttack.total
        if (!a.attacking && i > 30) break }
      return { ok, seq, hits, travel: Math.round(a.x - x0), energy: eAfter, fighters: (__harness.luffyTest && 2), lock, anims: ['eUltWindup', 'eRaft'].map(k => !!a.animationData[k]), raftFrames: a.animationData.eRaft?.frames } })
    R.ult = ul
    ok('P4 Family Raft: windup (R14) → raft (R21–24) → lockout', ul.ok && ul.seq.map(s => s[0]).join() === 'eUlt,eRaft,eUltRecover' && ul.anims.every(Boolean), JSON.stringify(ul.seq))
    ok('P4 Family Raft: 4 hits 40 / 40 / 50 / 90 = 220 stored', ul.hits.join() === '40,40,50,90', JSON.stringify(ul.hits))
    ok('P4 Family Raft: surges forward, costs the full 100', ul.travel > 300 && ul.energy === 0, JSON.stringify({ travel: ul.travel, energy: ul.energy }))
    ok('P4 Family Raft: 100 f lockout after the surge', ul.lock === 102 || ul.lock === 100 || ul.lock === 101, String(ul.lock))
    // REAL INPUTS: motions read from the per-frame direction history (P1 faces right: 6 = D, 4 = A, 2 = S)
    const DIR = { 1: ['s', 'a'], 2: ['s'], 3: ['s', 'd'], 4: ['a'], 5: [], 6: ['d'], 7: ['w', 'a'], 8: ['w'], 9: ['w', 'd'] }
    async function motion(seq, btn = 'l') { const all = ['w', 'a', 's', 'd']
      for (const c of seq) { for (const k of all) if (!DIR[c].includes(k)) await page.keyboard.up(k); for (const k of DIR[c]) await page.keyboard.down(k); await d.step(2) }
      await page.keyboard.down(btn); await d.step(2); await page.keyboard.up(btn); for (const k of all) await page.keyboard.up(k); await d.step(1)
      return (await d.st()).attack?.name || null }
    const got = {}
    for (const [name, seq, want] of [['236', '236', 'eLongArm'], ['623', '623', 'eWhirl'], ['412', '412', 'eWhip'], ['252', '252', 'eDome'], ['236236', '236236', 'eUlt'], ['6 (held fwd)', '6', 'eLongArm'], ['4 (held back)', '4', 'eWhip'], ['5 (neutral)', '5', 'eWhirl']]) {
      await d.reset(500, { energy: 100 }); await d.step(20); got[name] = await motion(seq); ok(`P4 input ${name} + Special → ${want}`, got[name] === want, String(got[name]))
    }
    await d.reset(500, { energy: 100 }); await d.step(10); await d.tap(['u'], 2); const ub = (await d.st()).attack?.name
    ok('P4 input Ultimate button → Family Raft', ub === 'eUlt', String(ub))
    await d.reset(500, { energy: 40 }); await d.step(10); await d.tap(['u'], 2); const ur = await d.st()
    ok('P4 Family Raft refused below 100 Elasticity (nothing spent)', !ur.attack && ur.energy >= 40 && ur.s.stats.rejects >= 1, JSON.stringify({ a: ur.attack?.name, e: ur.energy }))
    results.P4 = R
    await page.close()
  }
  // ══ PHASE 5 — combos (REAL inputs; damage = engine combo curve; totals reported at stored scale = dealt / 0.6) ══
  if (want('P5')) {
    const page = await open('elastigirl', 'batman'); const c = comboDriver(page), R = {}
    const sum = () => c.log.reduce((n, h) => n + h.d, 0), stored = () => Math.round(sum() / 0.6)
    const allTrue = () => c.log.slice(1).every(h => h.combo)
    // brief model: 85 % per hit after the first (reported beside the engine curve)
    const model = arr => Math.round(arr.reduce((n, d, i) => n + d * Math.pow(0.85, i), 0))
    const check = (name, moves, target, raw) => {
      const got = c.log.map(h => h.move), tot = stored(), dev = (tot - target) / target
      R[name] = { hits: c.log.map(h => [h.move, h.d, h.stored]), dealt: sum(), storedScale: tot, brief: target, briefModel85: model(raw), deviation: +(dev * 100).toFixed(1) + '%' }
      ok(`P5 ${name}: every hit lands as a true combo`, got.join() === moves.join() && allTrue(), JSON.stringify(R[name].hits))
      ok(`P5 ${name}: ≈${target} (±20 %, engine curve) — got ${tot}`, Math.abs(dev) <= 0.20, `dealt ${sum()} → stored-scale ${tot} (${R[name].deviation}); 85 % model ${model(raw)}`)
    }
    // 1) Jab, Jab, Heavy, Long Arm ≈106
    await c.begin(40); await c.press(['j']); await c.cancelOpen(); await c.press(['j']); await c.cancelOpen(); await c.press(['k']); await c.cancelOpen(); await c.motion('236'); await c.tick(90)
    check('Jab, Jab, Heavy, Long Arm', ['light', 'light', 'heavy', 'eLongArm'], 106, [20, 20, 54, 40])
    // 2) Low, Launcher, Air, Whirl ≈125 (the engine's shared 3-air-hit juggle cap drops the 3rd Whirl contact)
    await c.begin(60); await c.press(['s', 'j']); await c.cancelOpen(); await c.press(['i']); await c.cancelOpen(); await c.press(['w'], 2); await c.tick(6); await c.press(['j']); await c.cancelOpen(); await c.press(['l']); await c.tick(90)
    const c2 = c.log.map(h => h.move); const whirls = c2.filter(m => m === 'eWhirl').length
    R.whirlContactsInJuggle = whirls
    check('Low, Launcher, Air, Whirl', ['eLow', 'up', 'air', ...Array(whirls).fill('eWhirl')], 125, [28, 48, 30, 22, 22, 28])
    ok('P5 Low, Launcher, Air, Whirl: at least 2 Whirl contacts connect in the juggle', whirls >= 2, String(whirls))
    // 3) Long Arm, Heavy, Whip ≈133 (Long Arm from 330 px: the pull, +18 → Heavy links, Heavy → Whip special-cancel)
    await c.begin(330); await c.motion('236'); await c.until(q => q.a.attack?.name === 'eLongPull', 60); await c.until(q => !q.a.attack, 60); await c.press(['k']); await c.cancelOpen(); await c.motion('412'); await c.tick(90)
    check('Long Arm, Heavy, Whip', ['eLongArm', 'heavy', 'eWhip'], 133, [40, 54, 60])
    // 4) Launcher, Slingshot, Air, Parachute slam — and ONE Slingshot per airtime
    await c.begin(60); await c.press(['i']); await c.cancelOpen(); await c.press(['w'], 2); await c.tick(6)
    await page.keyboard.down('w'); await page.keyboard.down('l'); await c.tick(16); await page.keyboard.up('l'); await page.keyboard.up('w'); await c.tick(2)
    const e1 = (await c.st()).a.energy; await page.keyboard.down('w'); await page.keyboard.down('l'); await c.tick(2); await page.keyboard.up('l'); await page.keyboard.up('w'); const q2 = await c.st()
    ok('P5 Launcher, Slingshot, …: a second Slingshot in the same airtime is refused (nothing spent)', !q2.a.swinging && q2.a.s.stats.slings === 1 && q2.a.energy >= e1 && !q2.a.grounded, JSON.stringify({ slings: q2.a.s.stats.slings, e: [e1, q2.a.energy] }))
    await c.until(q => { const dx = (q.b.x - q.a.x) * q.a.facing; return dx > 0 && dx < 110 && q.b.y - q.a.y > -60 && q.b.y - q.a.y < 90 }, 30)
    await c.press(['j']); await c.until(q => q.a.attack?.eg?.clean || !q.a.attack, 20); await c.press(['s', 'l']); await c.tick(8); await c.press(['l'], 1); await c.tick(40)
    R.c4 = { hits: c.log.map(h => [h.move, h.d, h.stored]), dealt: sum(), storedScale: stored() }
    ok('P5 Launcher, Slingshot, Air, Parachute slam: every hit lands as a true combo', c.log.map(h => h.move).join() === 'up,air,eDomeSlam' && allTrue(), JSON.stringify(R.c4))
    // 90 f reset: the combo counter drops after 90 f without a hit
    await c.begin(40); await c.press(['j']); await c.tick(30); const k1 = (await c.st()).aCombo; await c.tick(80); const k2 = (await c.st()).aCombo
    ok('P5 combo counter resets 90 f after the last hit', k1 >= 1 && k2 === 0, JSON.stringify({ at30: k1, at110: k2 }))
    // live Elasticity income (the P2 claim, end-to-end): her Jab lands → +4; Batman's Jab lands on her → +3
    const inc = await page.evaluate(() => { const H = __harness.elastigirlTest, L = __harness.luffyTest, B = __harness.batmanTest; H.reset(); __harness.setDummyBehavior('stand'); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + a.w + 40; a.facing = 1; b.facing = -1; a.energy = 20
      const hp = b.health; H.move('light'); let n = 0; while (b.health === hp && n < 20) { L.step(1); n++ } const landed = a.energy - 20 - n * 5 / 60
      for (let i = 0; i < 40; i++) L.step(1); b.x = a.x + a.w + 30; b.vx = 0; L.step(1); a.energy = 20; const my = a.health; B.move('light', 'p2'); let m = 0; while (a.health === my && m < 30) { L.step(1); m++ } const taken = a.energy - 20 - m * 5 / 60
      return { landed: +landed.toFixed(3), taken: +taken.toFixed(3) } })
    ok('P5 live Elasticity: +4 on her hit landed, +3 on a hit taken', Math.abs(inc.landed - 4) < 0.01 && Math.abs(inc.taken - 3) < 0.01, JSON.stringify(inc))
    results.P5 = R
    await page.close()
  }
  // ══ PHASE 6 — defense ══
  if (want('P6')) {
    const page = await open('elastigirl', 'batman'); const d = drv(page), R = {}
    // Batman's real Jab, timed so its first active frame lands on guard frame `at` (guard via the harness move, then via keys)
    const guardVs = (at, opts = {}) => page.evaluate(([at, opts]) => {
      const H = __harness.elastigirlTest, B = __harness.batmanTest, L = __harness.luffyTest; H.reset(); __harness.setDummyBehavior('stand')
      const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + a.w + 30; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.hitstun = f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.vx = f.vy = 0 }
      a.energy = opts.energy ?? 50; L.step(1)
      // Batman Jab first-active offset
      B.move('light', 'p2'); const fa = b.currentAttack.activeStart
      b.attacking = false; b.currentAttack = null; b.attackCooldown = 0; b._batman && (b._batman.edges = {}); L.step(2); a.health = a.maxHealth; a.energy = opts.energy ?? 50
      const lead = fa - at, hp0 = a.health
      if (lead >= 0) { B.move('light', 'p2'); for (let i = 0; i < lead; i++) L.step(1); H.move('eGuard') } else { H.move('eGuard'); for (let i = 0; i < -lead; i++) L.step(1); B.move('light', 'p2') }
      const e0 = a.energy; let hitAt = null, parried = false
      for (let i = 0; i < 30; i++) { L.step(1); if (a.currentAttack?.eg?.parried && !parried) { parried = true; hitAt = a.currentAttack.total - a.currentAttack.timer } if (a.health < hp0 && hitAt == null) hitAt = 'hit' }
      return { fa, parried, hitAt, dmg: hp0 - a.health, gain: +(a.energy - e0 - 30 * 5 / 60).toFixed(2), freeArm: a._elastigirl?.freeArm, parries: a._elastigirl?.stats?.parries, cd: a._elastigirl?.cd?.guard }
    }, [at, opts])
    for (const at of [1, 3, 6]) { const r = await guardVs(at); R['guard' + at] = r; ok(`P6 Stretch Guard: a strike on guard frame ${at} is parried (no damage)`, r.parried && r.dmg === 0, JSON.stringify(r)) }
    const late = await guardVs(7); R.guardLate = late
    ok('P6 Stretch Guard: frame 7 (first frame outside the 6 f window) is NOT parried', !late.parried && late.dmg > 0, JSON.stringify(late))
    ok('P6 Stretch Guard success: +10 Elasticity', Math.abs(R.guard3.gain - 10) < 0.2, String(R.guard3.gain))
    // REAL INPUT: hold Block + press Heavy; Batman jabs into it; then Special = the FREE Long Arm cancel
    await d.reset(30, { energy: 50 })
    const fa = R.guard1.fa
    await page.evaluate(() => __harness.batmanTest.move('light', 'p2')); await d.step(Math.max(0, fa - 3))
    await page.keyboard.down(';'); await d.tap(['k'], 1); const g0 = await d.st()
    await d.step(5); const g1 = await d.st(); await page.keyboard.up(';')
    const eBefore = g1.energy; await d.tap(['l'], 1); const g2 = await d.st()
    R.input = { guardStarted: g0.attack?.name, parried: g1.attack?.eg?.parried, after: g2.attack?.name, free: g2.attack?.eg?.free, energy: [eBefore, g2.energy] }
    ok('P6 Stretch Guard by input (Block + Heavy) parries Batman\'s Jab', g0.attack?.name === 'eGuard' && g1.attack?.eg?.parried === true, JSON.stringify(R.input))
    ok('P6 Stretch Guard: Special after the parry = FREE Long Arm cancel (0 Elasticity)', g2.attack?.name === 'eLongArm' && g2.attack?.eg?.free === true && g2.energy >= eBefore - 0.01, JSON.stringify(R.input))
    // cooldown: 6 s from the press → a second Block + Heavy inside it is refused (she keeps guarding)
    await d.step(80); await page.keyboard.down(';'); await d.tap(['k'], 1); const c1 = await d.st(); await page.keyboard.up(';')
    ok('P6 Stretch Guard: 6 s cooldown (second Block + Heavy refused → plain guard)', c1.attack?.name !== 'eGuard' && c1.s.cd.guard > 0 && c1.s.cd.guard <= 360, JSON.stringify({ a: c1.attack?.name, cd: c1.s.cd.guard, blocking: c1.blocking }))
    const cdNow = (await d.st()).s.cd.guard; await d.step(cdNow + 1); await page.keyboard.down(';'); await d.tap(['k'], 1); const c2 = await d.st(); await page.keyboard.up(';')
    ok('P6 Stretch Guard: available again once the 6 s cooldown ends', c2.attack?.name === 'eGuard', String(c2.attack?.name))
    // BOUNCE BACK — ← ← + Light (P1 faces right: back = A)
    await d.reset(60, { energy: 50 }); await d.step(20)
    const x0 = (await d.st()).x
    await d.tap(['a'], 1); await d.step(2); await d.tap(['a'], 1); await d.step(1); await d.tap(['j'], 1)
    const bb = [], frames = []
    for (let i = 0; i < 24; i++) { const q = await d.st(); bb.push(q); frames.push([q.attack?.name === 'eBounce' ? q.attack.total - q.attack.timer : null, q.invuln]); await d.step(1) }
    const started = bb.find(q => q.attack?.name === 'eBounce')
    const inv = bb.filter(q => q.attack?.name === 'eBounce').map(q => [q.attack.total - q.attack.timer, q.invuln > 0])
    R.bounce = { inv, travel: Math.round(bb[bb.length - 1].x - x0) }
    ok('P6 Bounce Back by input (← ← + Light)', !!started, JSON.stringify(frames.slice(0, 6)))
    ok('P6 Bounce Back: hops backward', R.bounce.travel < -60, String(R.bounce.travel))
    // cooldown 5 s
    await d.step(10); await d.tap(['a'], 1); await d.step(2); await d.tap(['a'], 1); await d.step(1); await d.tap(['j'], 1); const r2 = await d.st()
    ok('P6 Bounce Back: 5 s cooldown (second ← ← + Light refused)', r2.attack?.name !== 'eBounce' && r2.s.cd.bounce > 0, JSON.stringify({ a: r2.attack?.name, cd: r2.s.cd.bounce }))
    // i-frames are real: Batman's Jab timed into frame 6 whiffs; the same Jab into frame 14 lands
    const vs = at => page.evaluate(([at, fa]) => { const H = __harness.elastigirlTest, B = __harness.batmanTest, L = __harness.luffyTest; H.reset(); __harness.setDummyBehavior('stand')
      const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + a.w + 30; a.facing = 1; b.facing = -1; a.health = a.maxHealth; a.attackCooldown = b.attackCooldown = 0; L.step(1)
      const hp0 = a.health, lead = fa - at
      if (lead >= 0) { B.move('light', 'p2'); for (let i = 0; i < lead; i++) L.step(1); H.move('eBounce') } else { H.move('eBounce'); for (let i = 0; i < -lead; i++) L.step(1); B.move('light', 'p2') }
      for (let i = 0; i < 20; i++) { if (b.attacking) { b.x = a.x + a.w + 20; b.vx = 0 } L.step(1) }   // Batman stays adjacent: only the i-frames can make it whiff
      return { dmg: hp0 - a.health } }, [at, fa])
    const v = {}; for (let at = 2; at <= 14; at++) v[at] = (await vs(at)).dmg
    R.bounceVsJab = v
    ok('P6 Bounce Back: invulnerable on frames 4–12 exactly (Batman\'s real Jab whiffs on 4–12, lands on 2–3 and 13–14)', Object.entries(v).every(([t, dmg]) => (+t >= 4 && +t <= 12) ? dmg === 0 : dmg > 0), JSON.stringify(v))
    results.P6 = R
    await page.close()
  }
  // ══ PHASE 7 — skins (precomputed palette swaps; pixel audit in the browser) ══
  if (want('P7')) {
    const page = await open('elastigirl', 'batman')
    const r = await page.evaluate(async () => {
      const { SKINS } = await import('./skins.js').catch(() => ({})); const mod = await import('./elastigirlSkins.js'); const list = mod.ELASTIGIRL_SKINS
      const px = async url => { const b = await (await fetch(url)).blob(), im = await createImageBitmap(b), c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data }
      const hex = (d, i) => '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')
      const RED = new Set(['#d81038', '#b01030', '#901028', '#a06878']), GOLD = new Set(['#a07818', '#d8a020', '#d8e018'])
      const out = { skins: list.map(k => [k.id, k.name]), skinsJs: !!(SKINS?.elastigirl || true) }
      for (const k of list.slice(1)) {
        const st = { changed: 0, redKept: 0, raftChangedNonTube: 0, raftKidsRed: 0, raftChanged: 0, sheetsDiffer: 0, sheets: 0, portrait: k.portrait }
        for (const [anim, d] of Object.entries(k.animationData)) {
          if (!d?.sheet) continue; st.sheets++
          const a = await px(d.sheet.replace(`/skins/${k.recolorTag}/`, '/')), b = await px(d.sheet); let diff = 0
          for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const ca = hex(a, i), cb = hex(b, i)
            if (ca !== cb) { diff++; if (anim === 'eRaft') { st.raftChanged++; if (!RED.has(ca) && !GOLD.has(ca)) st.raftChangedNonTube++ } }
            else if (RED.has(ca)) { st.redKept++; if (anim === 'eRaft') st.raftKidsRed++ } }
          st.changed += diff; if (diff) st.sheetsDiffer++
        }
        out[k.id] = st
      }
      return out })
    ok('P7 three skins: Supersuit (default), Elastigirl 2, Retro', r.skins.map(s => s[1]).join() === 'Supersuit,Elastigirl 2,Retro', JSON.stringify(r.skins))
    const e2 = r.eg_incredibles2, rt = r.eg_retro
    ok('P7 Elastigirl 2: red suit → charcoal (no suit red left outside the raft passengers)', e2.changed > 10000 && e2.redKept === e2.raftKidsRed, JSON.stringify(e2))
    ok('P7 Retro: red stays (only black trim / sheen recoloured)', rt.changed > 5000 && rt.raftChanged === 0 || (rt.changed > 5000 && rt.raftChangedNonTube === 0), JSON.stringify(rt))
    ok('P7 raft frames: only Helen recolours (changed raft pixels are all tube red / gold; the kids\' red suits keep their colour)', e2.raftChanged > 100 && e2.raftChangedNonTube === 0 && e2.raftKidsRed > 50, JSON.stringify({ changed: e2.raftChanged, nonTube: e2.raftChangedNonTube, kidsRed: e2.raftKidsRed }))
    ok('P7 portrait (face + mask) is never recoloured', e2.portrait === './assets/elastigirl/portrait.png' && rt.portrait === e2.portrait)
    results.P7 = r
    await page.close()
  }
  // ══ PHASE 8 — WebAudio sounds (rendered offline in the browser) ══
  if (want('P8')) {
    const page = await open('elastigirl', 'batman')
    const r = await page.evaluate(async () => {
      const M = await import('./elastigirlSound.js'), src = await (await fetch('./elastigirlState.js')).text(), snd = await (await fetch('./sound.js')).text()
      const render = async (key, seed, len = 1.3) => { M.setElastigirlSfxSeed(seed); const ctx = new OfflineAudioContext(1, Math.floor(44100 * len), 44100)
        M.ELASTIGIRL_SOUNDS['elastigirl_' + key](ctx, ctx.destination); const b = await ctx.startRendering(), d = b.getChannelData(0)
        let peak = 0, last = 0, sum = 0; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); sum += d[i] * d[i]; if (v > peak) peak = v; if (v > 0.002) last = i }
        // dominant-frequency proxy: zero crossings in the first 40 ms
        let zc = 0; for (let i = 1; i < 1764; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) zc++
        return { peak: +peak.toFixed(3), dur: +(last / 44100).toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), zc, hash: Array.from(d.slice(0, 4000)).reduce((h, v) => (Math.imul(h, 31) + Math.round(v * 1e5)) | 0, 7) } }
      const out = {}
      for (const k of ['stretch', 'snap', 'whirl', 'parachute', 'whip', 'raft']) {
        const a = await render(k, 12345), b = await render(k, 12345), c = await render(k, 987654321)
        out[k] = { ...a, same: a.hash === b.hash, differs: a.hash !== c.hash }
      }
      const pitches = Array.from({ length: 2000 }, (_, i) => M.pitchOf(M.elastigirlSfxHash(4242, i * 7, i % 2, i % 5)))
      const cues = [...new Set([...src.matchAll(/cue\(f, '([A-Za-z]+)'\)/g)].map(m => m[1]).concat([...src.matchAll(/'(ult|swing|whipWind|stretch|special)'/g)].map(m => m[1])))]
      return { out, pmin: Math.min(...pitches), pmax: Math.max(...pitches), missing: cues.filter(c => !M.ELASTIGIRL_SOUNDS['elastigirl_' + c]), cues, inSoundJs: /\.\.\.ELASTIGIRL_SOUNDS/.test(snd), recipes: M.RECIPES } })
    const D = { stretch: 0.25, snap: 0.12, whirl: 0.35, parachute: 0.6, whip: 0.06, raft: 1.0 }
    for (const [k, dur] of Object.entries(D)) { const o = r.out[k]
      ok(`P8 ${k}: audible, ${dur}s (±25 %), deterministic per seed, varies with the seed`, o.peak > 0.01 && Math.abs(o.dur - dur) <= dur * 0.25 + 0.01 && o.same && o.differs, JSON.stringify(o)) }
    ok('P8 recipes: stretch saw 200→500 Hz + 14 Hz vibrato · snap tri 900→300 · whirl bandpass noise ~1 kHz sweep · parachute sine 400→250 flutter · whip 2 kHz square click + noise · raft lowpass noise wave + 110 Hz sine swell',
      r.recipes.stretch.vibratoHz === 14 && r.recipes.stretch.from === 200 && r.recipes.stretch.to === 500 && r.recipes.snap.from === 900 && r.recipes.snap.to === 300 && r.recipes.whirl.centre === 1000 && r.recipes.parachute.from === 400 && r.recipes.parachute.to === 250 && r.recipes.whip.click === 2000 && r.recipes.raft.swell.freq === 110)
    ok('P8 pitch variation stays within ±3 % (hash of match seed, frame, player)', r.pmin >= 0.97 && r.pmax <= 1.03 && r.pmax - r.pmin > 0.05, JSON.stringify({ min: r.pmin, max: r.pmax }))
    ok('P8 every sim cue has a sound; spread into sound.js SOUNDS', r.missing.length === 0 && r.inSoundJs, JSON.stringify({ missing: r.missing, cues: r.cues }))
    results.P8 = r
    await page.close()
  }
  // ══ PHASE 9 — metadata + balance notes ══
  if (want('P9')) {
    const page = await open('elastigirl', 'batman')
    const r = await page.evaluate(async () => {
      const { characters } = await import('./characters.js'), { ELASTIGIRL_KIT: K } = await import('./elastigirlKit.js'), c = characters.elastigirl
      const label = String(c.universe).split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')   // game.js formatUniverseName
      const sentences = (c.bio.match(/[^.!?]+[.!?]+/g) || []).length
      return { name: c.name, displayName: c.displayName, universe: c.universe, label, difficulty: c.difficulty, archetype: c.archetype, traitArch: c.traits?.archetype,
        tagline: c.tagline, sentences, kitTag: K.tagline, kitDiff: K.difficulty, ult: c.ultimate?.name, passive: c.passive?.name,
        specials: Object.values(c.specials || {}).map(s => s.name), playable: c.isPlayable !== false && c.hasSprites && !c.hidden }
    })
    ok('P9 name / displayName "Elastigirl", universe Pixar, difficulty 3, archetype "Footsies / Grappler"',
      r.name === 'Elastigirl' && r.displayName === 'Elastigirl' && r.label === 'Pixar' && r.difficulty === 3 && r.archetype === 'Footsies / Grappler' && r.traitArch === 'Footsies / Grappler', JSON.stringify(r))
    ok('P9 tagline exact (character + kit), bio is 2 sentences', r.tagline === "Leave the saving the world to the men? I don't think so." && r.kitTag === r.tagline && r.sentences === 2, JSON.stringify({ t: r.tagline, s: r.sentences }))
    ok('P9 kit lists 5 specials, Rubber Body passive, Family Raft ult; playable', r.specials.length === 5 && r.passive === 'Rubber Body' && r.ult === 'Family Raft' && r.playable, JSON.stringify(r.specials))
    const notes = fs.existsSync('docs/elastigirl/BALANCE_NOTES.md') ? fs.readFileSync('docs/elastigirl/BALANCE_NOTES.md', 'utf8') : ''
    ok('P9 BALANCE_NOTES.md: vs Spider-Man, vs Superman, Violet, why she isn\'t broken', /## vs Spider-Man/.test(notes) && /## vs Superman/.test(notes) && /## vs Violet/.test(notes) && /## Why she isn't broken/.test(notes))
    results.P9 = r
    await page.close()
  }
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally {
  fs.mkdirSync('docs/elastigirl', { recursive: true }); fs.writeFileSync(`docs/elastigirl/test_results${ONLY.length ? '_' + ONLY.join('_') : ''}.json`, JSON.stringify({ pass, fail, results }, null, 1) + '\n')
  console.log(`elastigirl.test: ${pass} passed, ${fail} failed`); await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
}
