// SWAMPFIRE — Phase 5 combo / Regrowth / Vow harness (module-level, real combat pipeline; no browser).
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per hit, reset after 90f).
// The engine's roster-wide combo curve, the form's x1.10 and the global x0.60 damage scale mean real HP
// totals are smaller — exactly as for the human Ben framework (ben10_combo_p5) — so those are asserted
// as mechanics (every hit connects, counter grows, later hits scale down), not pinned to the design numbers.
import assert from 'node:assert/strict'
import { rosterDamageBoost } from '../rosterParity.js'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { SWAMPFIRE } from '../swampfire.js'
import { tickRegrowth, recordRegrowthDamage } from '../ben10State.js'
let passed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { console.error('FAIL', name); throw e } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: true, side: key === 'ben10' ? 'p1' : 'p2',
 health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
 facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
 attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1 })
const ben = (form = 'swampfire') => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, ['swampfire']); if (form) { assert(F.applyAlien(f, form)); f.transformed = true } return f }
const BA = SWAMPFIRE.basic_attacks
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  flameJet: 45, vineEruption: 22 + 22 + 34, blazeDash: 48 }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20

// Real melee contact: startMove → step the engine's attack timer → resolveAttackHit on the active frame.
function melee(f, t, key) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.hitstop = 0
  if (key === 'air') { f.onGround = f.grounded = false }
  assert(C.startMove(f, key, BA[key]), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter
  for (let i = 0; i < 40 && t.health === hp; i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true; t.hitstun = 0; t.blockstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y
  assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo')
  return hp - t.health
}
// Real special: Power spend + its live (non-visual) projectile contacts through the projectile pipeline.
function special(f, t, dir) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0
  A.clearAbilityState(); f._specialHeldDir = dir; const e = f.energy, hp = t.health
  assert(A.triggerSpecial(f, {}), 'special ' + dir)
  let hits = 0
  for (let frame = 1; frame <= 60; frame++) {
    A.updatePendingSpawns(); if (f._benLunge) physics.moveFighter(f, {}, {})
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { p.x = t.x + t.w / 2; p.y = t.y + t.h / 2; C.resolveProjectileHitsMulti([p], [t]); hits++; A.activeProjectiles.splice(A.activeProjectiles.indexOf(p), 1) }
    if (t._benVineHold) physics.moveFighter(t, {}, {})
  }
  t.hitstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y; f.attackCooldown = 0; f._benPowerCommit = 0
  return { spent: e - f.energy, dealt: hp - t.health, hits }
}

const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 88],
  ['2. Low, Jab, Heavy, Flame Jet', ['low', 'jab', 'heavy', 'flameJet'], 111],
  ['3. Blaze Dash, Heavy, Vine Eruption', ['blazeDash', 'heavy', 'vineEruption'], 154],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})

test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Jab, Heavy, Flame Jet (12 Power, 5 pulses)', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'down'), melee(f, t, 'light'), melee(f, t, 'heavy')]
  const fj = special(f, t, null); assert.equal(fj.spent, 12); assert.equal(fj.hits, 5); assert(fj.dealt > 0)
  assert(f.comboCounter >= 8, 'combo counter carried into the special'); console.log('   HP', [...d, fj.dealt].join('+'))
})
test('route 3 live: Blaze Dash, Heavy, Vine Eruption (10 + 18 Power, launcher finish)', () => {
  const f = ben(), t = fresh('goku', 70); const bd = special(f, t, 'F'); assert.equal(bd.spent, 10); assert.equal(bd.hits, 1)
  t.x = f.x + 70; const hv = melee(f, t, 'heavy'); t.x = f.x + 80
  const ve = special(f, t, 'D'); assert.equal(ve.spent, 18); assert.equal(ve.hits, 3)
  assert.equal(f.comboCounter, 5, 'Blaze Dash + Heavy + 3 vine hits = 5-hit combo')
  const c = ben(), u = fresh('goku', 80); c.comboCounter = 0; const cleanVine = special(c, u, 'D').dealt
  assert(ve.dealt < cleanVine, `Vine Eruption as hits 3-5 is combo-scaled (${ve.dealt} < clean ${cleanVine})`)
  console.log('   HP', [bd.dealt, hv, ve.dealt].join('+'))
})
test('route 4: human Jab → transform (Power spent, 40f startup) → Heavy scaled by the running combo', () => {
  const f = ben(null), t = fresh('goku', 70)
  f.currentAttack = null; assert(C.startMove(f, 'light', { damage: 18, startup: 5, active: 3, recovery: 12, hitstun: 18 }))
  const hp0 = t.health; for (let i = 0; i < 30 && t.health === hp0; i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  assert(t.health < hp0 && f.comboCounter === 1, 'human jab opens the combo'); t.hitstun = 0; t.x = f.x + 70
  const e = f.energy; f.attacking = false; f.currentAttack = null
  assert(F.ben10BeginTransform(f, 0)); assert.equal(e - f.energy, 20, 'transform spends 20 Power'); assert.equal(f.omnitrix.startup, 40, '40f startup')
  let n = 0; while (!f.transformed && n < 60) { F.updateTransformDevice(f); n++ }
  assert(f.transformed && f.activeAlien === 'swampfire'); assert(n >= 39 && n <= 41, `alien applied after ~40f (got ${n})`)
  assert.equal(f.comboCounter, 1, 'combo persists through the transform')
  // The heavy's damage follows the RUNNING counter: identical to a Swampfire heavy at the same counter,
  // and smaller once the counter is deep (the engine's pre-increment curve is 1, 1, .92, .84 ...).
  f.comboTimer = 90; const scaled = melee(f, t, 'heavy')
  const ref = ben(), u = fresh('goku', 70); ref.comboCounter = 1; ref.comboTimer = 90; assert.equal(scaled, melee(ref, u, 'heavy'))
  const deep = ben(), v = fresh('goku', 70); deep.comboCounter = 4; deep.comboTimer = 90; const d4 = melee(deep, v, 'heavy')
  assert(d4 < scaled, `deeper running combo scales the heavy down (${d4} < ${scaled})`)
})
test('route 5: Regrowth restores exactly, caps at 80, and a hit resets the 120f timer', () => {
  const f = ben(); const h0 = f.health
  C.applyScaledDamage(f, 100, { attacker: fresh('goku') }); const lost = h0 - f.health; const r = f.omnitrix.regrowth
  assert.equal(r.pool, lost * 0.35, 'pool = 35% of actual HP lost'); const after = f.health
  for (let i = 0; i < 129; i++) tickRegrowth(f); assert.equal(f.health, after, 'nothing before tick 130')
  tickRegrowth(f); assert.equal(f.health, after + 2, 'first +2 at tick 130')
  for (let i = 0; i < 9; i++) tickRegrowth(f); C.applyScaledDamage(f, 10, { attacker: fresh('goku') }); assert.equal(r.wait, 120, 'hit resets timer')
  const hpHit = f.health; for (let i = 0; i < 119; i++) tickRegrowth(f); assert.equal(f.health, hpHit, 'paused for 120f after the hit')
  for (let i = 0; i < 2000; i++) tickRegrowth(f)
  assert(f.health <= h0, 'never above pre-damage HP')
  const g = ben(); for (let k = 0; k < 6; k++) C.applyScaledDamage(g, Math.round(200 / rosterDamageBoost(fresh('goku'))), { attacker: fresh('goku') }); const low = g.health   // ÷ goku's roster boost (OG lift × balance, 2026-11-23/25) so the six hits still leave him alive
  for (let i = 0; i < 3000; i++) tickRegrowth(g); assert.equal(g.health - low, 80, 'capped at 80 per transformation'); assert.equal(g.omnitrix.regrowth.restored, 80)
  F.revertToHuman(g); assert.equal(g.omnitrix.regrowth, null, 'pool + cap clear on revert')
})
test('route 6: Vow includes Swampfire in the hash pick; same seed → same pick', () => {
  const mk = () => { const f = ben(null); F.setupBen10(f, ['swampfire', 'xlr8', 'diamondhead']); return f }
  const a = mk(), b = mk(); const picks = new Set()
  for (let frame = 0; frame < 300; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); picks.add(a.omnitrix.aliens[x]) }
  assert(picks.has('swampfire'), 'Swampfire is reachable by the Vow pick')
  const p = ben(null); F.setupBen10(p, ['swampfire']); assert.equal(p.omnitrix.aliens[F.ben10VowPick(p, 5, 9, 1)], 'swampfire')
})
console.log(`SWAMPFIRE COMBOS: ${passed} passed, 0 failed`)
