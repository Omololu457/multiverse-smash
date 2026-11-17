// HEATBLAST — Phase 6 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_heatblast.test.mjs
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per move, reset after 90f), within
// ±20%. The engine's global combo curve, the form's x1.10 and the global damage scale make real HP numbers smaller,
// exactly as for Swampfire (ben10_swampfire_combos), so the live routes assert the mechanics (every hit connects,
// the counter grows, later hits scale down) rather than the design numbers.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { HEATBLAST, HB_HEAT, HB_SCORCH, HB_ULT, HB_FLIGHT, hbState, heatTier, addHeat } from '../heatblast.js'
import { benAlienAbsorb } from '../ben10State.js'
import { getAvailableAlienKeys, buildLoadout, BEN10_SLOT_COUNT } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0 })
const ben = (form = 'heatblast') => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, ['swampfire', 'heatblast']); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; HEATBLAST.onApply(f) } return f }
const S = f => f.omnitrix.formState
const ctxOf = (f, t) => ({ p1: f, p2: t })
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); if (f._benGlide || f._benLunge) physics.moveFighter(f, {}, {}) } }
const BA = HEATBLAST.basic_attacks
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  fireball: 45, fireRocket: 18 + 18 + 34, supernova50: Math.min(130, 40 + 0.9 * 50) }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20

function melee(f, t, key) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.hitstop = 0; f._benPowerCommit = 0
  if (key === 'air') { f.onGround = f.grounded = false }
  assert(C.startMove(f, key, BA[key]), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter
  for (let i = 0; i < 40 && t.health === hp; i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true; t.hitstun = 0; t.blockstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y
  assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo')
  return hp - t.health
}
// Real special: Power spend + its live (non-visual) projectiles through the projectile pipeline, ticking the form.
function special(f, t, dir, { frames = 70, block = false } = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0
  A.clearAbilityState(); f._specialHeldDir = dir; const e = f.energy, hp = t.health
  const ok = A.triggerSpecial(f, ctxOf(f, t))
  let hits = 0
  if (ok) for (let frame = 1; frame <= frames; frame++) {
    tick(f, t)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) {
      t.isBlocking = block; p.x = t.x + t.w / 2; p.y = t.y + t.h / 2
      C.resolveProjectileHitsMulti([p], [t]); hits++; const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
    }
  }
  t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y; f.attackCooldown = 0; f._benPowerCommit = 0
  return { ok, spent: e - f.energy, dealt: hp - t.health, hits }
}

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 95],
  ['2. Low, Heavy, Fireball', ['low', 'heavy', 'fireball'], 112],
  ['3. Fire Rocket, Heavy, Supernova(Heat 50)', ['fireRocket', 'heavy', 'supernova50'], 175],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Fireball (10 Power, 1 hit at Warm)', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  S(f).heat = 0; const fb = special(f, t, null); assert.equal(fb.spent, 10); assert.equal(fb.hits, 1); assert(fb.dealt > 0)
  assert.equal(f.comboCounter, 3); console.log('   HP', [...d, fb.dealt].join('+'))
})
test('route 3 live: Fire Rocket (3 hits, 340 px travel), Heavy, Supernova at Heat 50', () => {
  const f = ben(), t = fresh('goku', 70); const x0 = f.x
  const fr = special(f, t, 'F'); assert.equal(fr.spent, 14); assert.equal(fr.hits, 3); assert.equal(f.x - x0, 340, 'real travel 340 px')
  t.x = f.x + 70; const hv = melee(f, t, 'heavy')
  S(f).heat = 50; S(f).burnout = 0; const sn = special(f, t, 'D'); assert.equal(sn.spent, 18); assert.equal(sn.hits, 1)
  assert.equal(f.comboCounter, 5, 'rocket x3 + heavy + supernova = 5-hit combo'); assert.equal(S(f).lastSupernovaSpent, 50)
  console.log('   HP', [fr.dealt, hv, sn.dealt].join('+'))
})

// ── 4 Heat ─────────────────────────────────────────────────────────────────────────────────────────────────
test('4. Heat gains (Fireball +10, Rocket hit +12 / blocked +6, fire normal +4 / blocked +2) and idle decay', () => {
  let f = ben(), t = fresh('goku', 70)
  special(f, t, null); assert.equal(S(f).heat, 10, 'Fireball cast +10')
  f = ben(); t = fresh('goku', 70); special(f, t, 'F'); assert.equal(S(f).heat, 12, 'Fire Rocket connect +12 (once per cast)')
  f = ben(); t = fresh('goku', 70); special(f, t, 'F', { block: true }); assert.equal(S(f).heat, 6, 'blocked Rocket gives half')
  f = ben(); t = fresh('goku', 70); melee(f, t, 'light'); assert.equal(S(f).heat, 4, 'fire normal connects +4')
  f = ben(); t = fresh('goku', 70); t.isBlocking = true; C.startMove(f, 'light', BA.light)
  for (let i = 0; i < 20 && !f.currentAttack?.hasHit; i++) { C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  assert.equal(S(f).heat, 2, 'blocked normal gives half')
  f = ben(); t = fresh('goku', 70); S(f).heat = 30
  tick(f, t, 59); assert.equal(S(f).heat, 30, 'no decay before 60 idle frames'); tick(f, t, 1); assert.equal(S(f).heat, 29, 'then -1/f'); tick(f, t, 10); assert.equal(S(f).heat, 19)
})
test('4. tiers: 0-49 Warm, 50-99 Hot (+10% fire, 2-hit Fireball), 100 = Blue Flame 360f → Burnout 120f', () => {
  const f = ben(), t = fresh('goku', 70), base = S(f).baseDmg
  S(f).heat = 49; tick(f, t); assert.equal(heatTier(S(f)), 'warm'); assert.equal(f.damageMultiplier, base)
  S(f).heat = 50; tick(f, t); assert.equal(heatTier(S(f)), 'hot'); assert(Math.abs(f.damageMultiplier - base * 1.10) < 1e-9)
  const hot = special(f, t, null); assert.equal(hot.hits, 2, 'Hot Fireball = 2 hits')
  S(f).heat = 95; addHeat(f, 10); assert.equal(S(f).blue, HB_HEAT.BLUE_FRAMES, 'reaching 100 starts Blue Flame'); tick(f, t)
  assert(Math.abs(f.damageMultiplier - base * 1.20) < 1e-9, 'Blue Flame +20%'); assert.equal(f._skinAnim, HEATBLAST.blueAnim, 'alt-pal palette (render data follows the GAME_STATE flag)')
  tick(f, t, HB_HEAT.BLUE_FRAMES - 2); assert(S(f).blue > 0, 'still Blue at 359'); tick(f, t, 1)
  assert.equal(S(f).blue, 0); assert.equal(S(f).heat, 0); assert.equal(S(f).burnout, HB_HEAT.BURNOUT_FRAMES, 'Burnout 120f'); assert.equal(f._skinAnim, HEATBLAST.anim)
  assert.equal(special(f, t, 'F').ok, false, 'Fire Rocket locked in Burnout'); S(f).heat = 60
  assert.equal(special(f, t, 'D').ok, false, 'Supernova locked in Burnout'); tick(f, t); assert.equal(S(f).heat, 0, 'Heat locked at 0 (per tick)')
  assert.equal(addHeat(f, 10), 0, 'no gains in Burnout')
  tick(f, t, HB_HEAT.BURNOUT_FRAMES); assert.equal(S(f).burnout, 0); assert.equal(special(f, t, 'F').ok, true, 'Rocket back after Burnout')
})
test('4. Blue Flame Fireball pierces one hit', () => {
  const f = ben(), t = fresh('goku', 70); S(f).heat = 99; addHeat(f, 5); tick(f, t)
  A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t))); tick(f, t, 12)
  const p = A.activeProjectiles.find(p => p.name === 'heatblast_fire'); assert(p && p.piercesMulti && p.hbBlue)
  p.x = t.x + t.w / 2; p.y = t.y + t.h / 2; const hp = t.health; C.resolveProjectileHitsMulti(A.activeProjectiles, [t])
  assert(t.health < hp); assert(A.activeProjectiles.includes(p), 'fireball survives the hit (pierce)')
})

// ── 5 Scorch / Ignite / Flashpoint ─────────────────────────────────────────────────────────────────────────
test('5. Scorch: one pip per cast (2-hit Hot Fireball still 1), max 3 → Ignite 30 total, cannot KO, 300f immunity', () => {
  const f = ben(), t = fresh('goku', 70)
  S(f).heat = 60; special(f, t, null); assert.equal(S(f).scorch.pips, 1, 'Hot 2-hit Fireball = ONE pip')
  special(f, t, 'F', { block: true }); assert.equal(S(f).scorch.pips, 1, 'blocked finisher: no pip')
  S(f).heat = 0; special(f, t, 'F'); assert.equal(S(f).scorch.pips, 2, 'Rocket finisher +1')
  S(f).heat = 0; special(f, t, null, { frames: 12 }); assert.equal(S(f).scorch.pips, 0, 'third pip ignites (pips consumed)')
  assert(S(f).scorch.burnT > 0 && S(f).scorch.burnT <= HB_SCORCH.BURN, 'IGNITE burning (60f window)'); assert.equal(S(f).scorch.ignites, 1)
  const hp = t.health; f.comboCounter = 0; tick(f, t, HB_SCORCH.BURN)
  assert.equal(S(f).scorch.rawBurn, 30, '5 x 6 ticks = 30 raw'); assert(t.health < hp, 'burn deals damage')
  assert.equal(S(f).scorch.burnT, 0); assert(S(f).scorch.immune > HB_SCORCH.IMMUNE - 15 && S(f).scorch.immune <= HB_SCORCH.IMMUNE, `300f immunity after the burn (${S(f).scorch.immune})`)
  { const k = ben(), w = fresh('goku', 70); S(k).scorch.burnT = 1; S(k).scorch.burnTick = 1; tick(k, w); assert.equal(S(k).scorch.immune, HB_SCORCH.IMMUNE, 'immunity starts at exactly 300') }
  S(f).heat = 0; special(f, t, null, { frames: 12 }); assert.equal(S(f).scorch.pips, 0, 'no pips while immune')
  // cannot KO: a target at 3 HP stops at 1
  const g = ben(), u = fresh('goku', 70); S(g).scorch.burnT = HB_SCORCH.BURN; S(g).scorch.burnTick = HB_SCORCH.TICK; u.health = 3
  tick(g, u, HB_SCORCH.BURN); assert.equal(u.health, 1, 'Ignite stops at 1 HP')
  // pips expire 240f after the last one
  const h = ben(), v = fresh('goku', 70); special(h, v, null, { frames: 12 }); assert.equal(S(h).scorch.pips, 1); tick(h, v, HB_SCORCH.EXPIRE + 2); assert.equal(S(h).scorch.pips, 0, 'pip expired')
})
test('5. Flashpoint: Supernova on an ignited target ends the burn, +25 once only', () => {
  const f = ben(), t = fresh('goku', 70)
  S(f).scorch.burnT = 40; S(f).scorch.burnTick = 5
  S(f).heat = 50; const hp = t.health; const a = special(f, t, 'D', { frames: 30 })
  assert.equal(S(f).scorch.flashpoints, 1); assert.equal(S(f).scorch.burnT, 0, 'burn ended'); assert(a.dealt > 0)
  const ref = ben(), r = fresh('goku', 70); S(ref).heat = 50; const plain = special(ref, r, 'D', { frames: 30 }).dealt
  assert(a.dealt > plain, `Flashpoint adds the bonus (${a.dealt} > ${plain})`)
  S(f).scorch.immune = 0; S(f).heat = 50; special(f, t, 'D', { frames: 30 }); assert.equal(S(f).scorch.flashpoints, 1, 'no burn → no second bonus')
})

// ── 6 Supernova ────────────────────────────────────────────────────────────────────────────────────────────
test('6. Supernova spends ALL Heat (damage 40 + 0.9 x Heat, max 130); rejected below 25', () => {
  const f = ben(), t = fresh('goku', 70)
  S(f).heat = 24; const e = f.energy; const r = special(f, t, 'D'); assert.equal(r.ok, false); assert.equal(f.energy, e, 'no Power spent'); assert.equal(S(f).heat, 24)
  S(f).heat = 80; A.clearAbilityState(); f._specialHeldDir = 'D'; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(S(f).heat, 0, 'all Heat spent')
  tick(f, t, 23); const p = A.activeProjectiles.find(p => p.name === 'hb_supernova'); assert(p, 'burst at 22f'); assert.equal(p.damage, 112); assert.equal(p.radius, 180)
  const g = ben(), u = fresh('goku', 70); S(g).heat = 99; S(g).blue = 0; A.clearAbilityState(); g._specialHeldDir = 'D'; A.triggerSpecial(g, ctxOf(g, u)); tick(g, u, 23)
  assert.equal(A.activeProjectiles.find(p => p.name === 'hb_supernova').damage, 129)
})

// ── 7 Blaze Flight ─────────────────────────────────────────────────────────────────────────────────────────
test('7. Blaze Flight: once per airtime, no jump refill, capped at jump apex + 80, dive hit', () => {
  const f = ben(), t = fresh('goku', 400); f.onGround = f.grounded = false; f.y = 200; f.jumpCount = 2; tick(f, t)
  const apex = S(f).apexY; const e = f.energy
  A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t)), 'Blaze Flight in the air'); assert.equal(e - f.energy, 12)
  let minY = f.y; for (let i = 0; i < HB_FLIGHT.FRAMES; i++) { tick(f, t, 1, { up: true }); minY = Math.min(minY, f.y) }
  assert(minY >= apex - HB_FLIGHT.CAP_ABOVE_APEX - 1e-6, `no altitude beyond apex + 80 (${minY} vs ${apex - 80})`)
  assert(S(f).dive, 'dive after 45f'); assert.equal(f.jumpCount, 2, 'jumps not refilled')
  f.attackCooldown = 0; f.attacking = false; A.clearAbilityState(); assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'second flight in the same airtime refused')
  // dive connects for 55 raw + 1 Scorch pip
  const g = ben(), u = fresh('goku', 0); g.onGround = g.grounded = false; g.y = 250; tick(g, u)
  A.clearAbilityState(); g._specialHeldDir = null; A.triggerSpecial(g, ctxOf(g, u)); tick(g, u, HB_FLIGHT.FRAMES + 1)
  const hp = u.health; let hit = false
  for (let i = 0; i < 10 && !hit; i++) { tick(g, u); for (const p of A.activeProjectiles.filter(p => p.hbDive)) { assert.equal(p.damage, 55); p.x = u.x + u.w / 2; p.y = u.y + u.h / 2; C.resolveProjectileHitsMulti([p], [u]); hit = u.health < hp } }
  assert(hit, 'dive hit lands'); assert.equal(S(g).scorch.pips, 1, 'dive +1 Scorch')
  g.onGround = g.grounded = true; tick(g, u); assert.equal(S(g).flightUsed, false, 'landing resets the airtime')
})

// ── 8 Heat Absorb ──────────────────────────────────────────────────────────────────────────────────────────
test('8. Heat Absorb: projectile absorbed (0 dmg, +25 Heat); non-fire melee hit passes through; 6 s cooldown', () => {
  const f = ben(), t = fresh('goku', 70)
  assert(HEATBLAST.blockHeavy(f)); assert.equal(S(f).absorbWin, 8); assert.equal(HEATBLAST.blockHeavy(f), false, 'cooldown')
  A.clearAbilityState(); const p = A.spawnProjectile(t, 'test_ball', { damage: 60, vx: 0, speed: 0, spawnX: f.x + 30, spawnY: f.y + 50 }, {})
  const hp = f.health; C.resolveProjectileHitsMulti(A.activeProjectiles, [f, t]); assert.equal(f.health, hp, 'projectile absorbed')
  assert.equal(S(f).heat, 25); assert.equal(S(f).lastAbsorbed, 'projectile'); assert(!A.activeProjectiles.includes(p))
  const g = ben(), u = fresh('goku', 70); u.facing = -1; HEATBLAST.blockHeavy(g)
  assert.equal(benAlienAbsorb(g, { move: { damage: 20 }, attacker: u }), false, 'non-fire melee is not absorbed')
  u.x = g.x + 50; C.startMove(u, 'light', { damage: 20, startup: 2, active: 3, recovery: 8, hitstun: 12 }); const h0 = g.health
  for (let i = 0; i < 10 && g.health === h0; i++) { C.updateCombat(u, g, {}, {}); C.resolveAttackHit(u, g, [], {}) }
  assert(g.health < h0, 'non-fire melee lands'); assert.equal(S(g).heat, 0)
  assert.equal(benAlienAbsorb(g, { move: { fire: true }, attacker: u }), true, 'a fire-tagged hit inside the window is absorbed')
  tick(f, t, HB_ABSORB_CD()); assert.equal(HEATBLAST.blockHeavy(f), true, 'available again after 360f')
})
function HB_ABSORB_CD() { return 360 }

// ── 9 Ultimate ─────────────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false } = {}) {
  A.clearAbilityState(); f.attackCooldown = 0; f.attacking = false; f.energy = 100
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }
  for (let i = 0; i < 160; i++) { tick(f, t); t.isBlocking = block; for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti([p], [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) } }
  t.isBlocking = false
  return { ok, dealt: hp - t.health, home }
}
test('9. Pyronite Meteor: whiff / block = no capture (60f recovery); clean opener = 240 raw, positions restore, Heat → 0', () => {
  let f = ben(), t = fresh('goku', 70); let r = ult(f, t, { far: true })
  assert(r.ok, 'casts (50 Power)'); assert.equal(r.dealt, 0, 'whiff deals nothing'); assert.equal(S(f).ult, null); assert.equal(S(f).lastUltRaw, undefined, 'no cinematic')
  f = ben(); t = fresh('goku', 70); r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, undefined, 'blocked: no cinematic')
  f = ben(); t = fresh('goku', 70); A.clearAbilityState(); f.energy = 100; A.triggerUltimate(f, ctxOf(f, t)); assert.equal(f.energy, 50, 'costs 50 Power'); assert.equal(f.attackCooldown, 72, '12f + 60f whiff recovery')
  f = ben(); t = fresh('goku', 70); S(f).heat = 40; const tx = t.x; r = ult(f, t)
  assert.equal(S(f).lastUltRaw, HB_ULT.OPENER + 3 * HB_ULT.RAIN + HB_ULT.IMPACT, '40 + 90 + 110 = 240 raw'); assert.equal(S(f).lastUltRaw, 240)
  assert(r.dealt > 0); assert.equal(f.x, r.home.x, 'Heatblast back at his spot'); assert.equal(f.y, r.home.y); assert.equal(S(f).heat, 0, 'Heat → 0 afterward')
  assert(!f._benGlide, 'no persistent glide'); console.log('   HP dealt', r.dealt)
  const b = ben(), u = fresh('goku', 70); S(b).heat = 99; addHeat(b, 5); tick(b, u); const rb = ult(b, u)
  assert(rb.dealt > r.dealt, `Blue Flame ult hits harder (${rb.dealt} > ${r.dealt})`)
  const h = ben(null); A.clearAbilityState(); h.energy = 100; h.transformed = false; assert.equal(hbState(h), null, 'human: no Heatblast state (ult is alien-form only)')
})

// ── 10 swap / revert / rematch ─────────────────────────────────────────────────────────────────────────────
test('10. swap / revert clear Heat + Scorch-owner state; rematch starts clean', () => {
  const f = ben(), t = fresh('goku', 70); S(f).heat = 70; S(f).scorch.pips = 2; S(f).scorch.burnT = 20
  assert(F.applyAlien(f, 'swampfire')); assert.equal(f.omnitrix.formState, null, 'swap clears'); assert.equal(f._skinAnim?.idle?.sheet, './ben10_swampfire_idle_uniform.png')
  assert(F.applyAlien(f, 'heatblast')); assert.equal(S(f).heat, 0); assert.equal(S(f).scorch.pips, 0); assert.equal(S(f).scorch.burnT, 0)
  S(f).heat = 50; F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears'); assert(!f._benGlide)
  const g = ben(); assert.equal(S(g).heat, 0); assert.equal(S(g).scorch.immune, 0, 'rematch: fresh state')
  assert.equal(f.damageMultiplier, 1, 'human damage multiplier restored')
})

// ── 11 Vow + determinism + registry ────────────────────────────────────────────────────────────────────────
test('11. registry: Heatblast READY in slot 2; default loadout = all five ready forms', () => {
  { const _ready = getAvailableAlienKeys(false); assert(_ready.length >= BEN10_SLOT_COUNT, 'PICK FIVE: at least one READY alien per dial slot (count read from the registry)'); assert.deepEqual(_ready.slice(0, 5), ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8']) }
  assert.deepEqual(buildLoadout(5).map(a => a.id), ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8'])
  assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT, 'default loadout = every registry slot'); assert.deepEqual(F.DEFAULT_OMNITRIX.slice(0, 5), ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8'])
  const f = ben(); assert.equal(f.maxJumps, 2, 'shared double jump'); assert.equal(f.activeAlienName, 'Heatblast')
})
test('11. Vow pick includes Heatblast; same seed → same pick', () => {
  const mk = () => { const f = ben(null); F.setupBen10(f, ['swampfire', 'heatblast']); return f }
  const a = mk(), b = mk(); const picks = new Set()
  for (let frame = 0; frame < 300; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); picks.add(a.omnitrix.aliens[x]) }
  assert(picks.has('heatblast'), 'Heatblast is reachable by the Vow pick')
})
test('11. same-seed determinism: an identical scripted Heatblast sequence yields identical GAME_STATE', () => {
  const run = () => {
    const f = ben(), t = fresh('goku', 70); melee(f, t, 'light'); special(f, t, null); special(f, t, 'F'); S(f).heat = 60; special(f, t, 'D'); tick(f, t, 100)
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x })
  }
  assert.equal(run(), run())
})
test('no Math.random / gameRng in heatblast.js', () => {
  const src = fs.readFileSync(new URL('../heatblast.js', import.meta.url), 'utf8')
  assert(!/Math\.random|gameRng/.test(src))
})

console.log(`HEATBLAST: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
