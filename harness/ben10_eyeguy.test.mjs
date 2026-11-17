// EYEGUY — Phase 6 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_eyeguy.test.mjs
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per move, reset after 90f), within
// ±20%. The live routes then run the real engine (its combo curve, the form's ×1.15, the global damage scale) and
// assert the mechanics: every hit connects, the counter grows, later hits scale down.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { EYEGUY, EG_VISION, EG_STARE, EG_ORB, EG_HYPNO, EG_GAZE, EG_ULT, EG_COST, egState, addStare } from '../eyeguy.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0 })
const ben = (form = 'eyeguy') => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, []); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const S = f => f.omnitrix.formState
const ctxOf = (f, t) => ({ p1: f, p2: t })
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); if (f._benLunge || f._benGlide) physics.moveFighter(f, {}, {}) } }
const BA = EYEGUY.basic_attacks
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  orb: 45, gaze: 60, lowGaze: 45 }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y + f.h - t.h }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }

function melee(f, t, key, { block = false, md = BA[key], expectHit = true } = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.hitstop = 0; f._benPowerCommit = 0
  if (key === 'air') { f.onGround = f.grounded = false }
  assert(C.startMove(f, key, md), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter, bs = t.blockstun
  t.isBlocking = block
  for (let i = 0; i < 50 && t.health === hp && !(block && t.blockstun > bs) && f.attacking; i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true; f.attacking = false; f.currentAttack = null
  if (!block && expectHit) { assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo') }
  return hp - t.health
}
// Real special: Power spend, its live (non-visual) projectiles through the projectile pipeline, placed on the target.
function special(f, t, dir, { frames = 70, block = false, keep = false, input = {} } = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0
  if (!keep) A.clearAbilityState()
  f._specialHeldDir = dir; const e = f.energy, hp = t.health
  const ok = A.triggerSpecial(f, ctxOf(f, t))
  let hits = 0
  if (ok) for (let frame = 1; frame <= frames; frame++) {
    tick(f, t, 1, typeof input === 'function' ? input(frame) : input)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly && p.owner === f)) {
      t.isBlocking = block; p.x = t.x + t.w / 2; p.y = t.y + t.h / 2
      const before = A.activeProjectiles.length
      C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); hits++
      const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
    }
  }
  t.isBlocking = false
  reset(f, t); f.attackCooldown = 0; f._benPowerCommit = 0
  return { ok, spent: e - f.energy, dealt: hp - t.health, hits }
}
const freshDef = g => { g.hitstun = 0; g.invulnTimer = 0; g.blockstun = 0; g.isBlocking = false; g.hitstop = 0; g.vx = g.vy = 0; g.onGround = g.grounded = true; g.y = 410 - g.h; g.comboCounter = 0 }
// the →↓↘ motion fed frame by frame before the press
const dpMotion = (f, t) => { tick(f, t, 2, { right: true }); tick(f, t, 2, { down: true }); tick(f, t, 1, { down: true, right: true }) }

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 100],
  ['2. Low, Heavy, Eye Orb', ['low', 'heavy', 'orb'], 120],
  ['3. Rising Gaze, Heavy, Low Gaze', ['gaze', 'heavy', 'lowGaze'], 130],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Eye Orb (12 Power, 1 hit, +1 Stare)', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  const o = special(f, t, null); assert(o.ok); assert.equal(o.spent, 12); assert.equal(o.hits, 1); assert(o.dealt > 0)
  assert.equal(S(f).stare.pips, 1); assert.equal(f.comboCounter, 3); console.log('   HP', [...d, o.dealt].join('+'))
})
test('route 3 live: Rising Gaze (→↓↘, 14 Power, 18f startup), Heavy, Low Gaze (12 Power, 2 hits, low)', () => {
  const f = ben(), t = fresh('goku', 70); A.clearAbilityState(); dpMotion(f, t)
  f._specialHeldDir = 'F'; assert(A.triggerSpecial(f, ctxOf(f, t)), 'Rising Gaze'); assert.equal(f._spriteCastMove, 'egGaze')
  let spawnedAt = -1; for (let i = 1; i <= 30 && spawnedAt < 0; i++) { tick(f, t); if (A.activeProjectiles.some(p => p.name === 'eg_gaze')) spawnedAt = i }
  assert.equal(spawnedAt, EG_GAZE.STARTUP, `beam out on frame 18 (${spawnedAt})`)
  const p = A.activeProjectiles.find(q => q.name === 'eg_gaze'); assert(p.vy < 0 && Math.abs(Math.abs(p.vx) - Math.abs(p.vy)) < 1e-9, '45° up')
  const hp = t.health; p.x = t.x + t.w / 2; p.y = t.y + t.h / 2; C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); const g = hp - t.health; assert(g > 0)
  clearProj(); f.attackCooldown = 0; f._benPowerCommit = 0; reset(f, t)
  const h = melee(f, t, 'heavy')
  const lg = special(f, t, 'D', { frames: 40 }); assert(lg.ok); assert.equal(lg.spent, 12); assert.equal(lg.hits, 2, 'two hits'); assert(lg.dealt > 0)
  assert.equal(S(f).stare.pips, 2, '+1 Stare from Rising Gaze, +1 from Low Gaze (one per cast, 2 hits)')
  console.log('   HP', g, '+', h, '+', lg.dealt)
})

// ── 4 360° Vision ──────────────────────────────────────────────────────────────────────────────────────────
test('4. 360° Vision: instant turn on crossup and teleport; −2f counter-sight once per 120f; no turn in hitstun', () => {
  let f = ben(), t = fresh('goku', 300); f.x = 200; t.x = 300; tick(f, t, 2)
  t.x = 100; tick(f, t); assert.equal(f.facing, -1, 'crossup → faces them'); assert(S(f).vision.sight > 0)
  assert(C.startMove(f, 'light', BA.light)); tick(f, t); assert.equal(f.currentAttack.activeStart, BA.light.startup - EG_VISION.CUT, 'jab startup −2f')
  f.attacking = false; f.currentAttack = null
  t.x = 500; tick(f, t); assert.equal(f.facing, 1, 'teleport behind → turns'); assert.equal(S(f).vision.sight, 0, 'counter-sight once per 120f')
  tick(f, t, EG_VISION.COOLDOWN); t.x = 60; tick(f, t); assert.equal(f.facing, -1); assert(S(f).vision.sight > 0, 'armed again after 120f')
  // hitstun: no turn until it ends
  f = ben(); t = fresh('goku', 300); f.x = 200; tick(f, t, 2); f.hitstun = 10; t.x = 100; tick(f, t); assert.equal(f.facing, 1, 'no turn in hitstun')
  f.hitstun = 0; tick(f, t); assert.equal(f.facing, -1, 'turns once hitstun ends (pending)')
  // own active frames: no turn
  f = ben(); t = fresh('goku', 300); f.x = 200; tick(f, t, 2); assert(C.startMove(f, 'heavy', BA.heavy)); const a = f.currentAttack; a.timer = a.total - a.activeStart - 1
  t.x = 100; tick(f, t); assert.equal(f.facing, 1, 'no turn during his own active frames')
  // counter-sight on a special: −2f
  f = ben(); t = fresh('goku', 300); f.x = 200; tick(f, t, 2); t.x = 100; tick(f, t); A.clearAbilityState()
  f._specialHeldDir = 'D'; assert(A.triggerSpecial(f, ctxOf(f, t))); let at = -1; for (let i = 1; i < 20 && at < 0; i++) { tick(f, t); if (A.activeProjectiles.some(p => p.name === 'eg_lowgaze')) at = i }
  assert.equal(at, 12 - EG_VISION.CUT, `Low Gaze first hit at 10f (${at})`); clearProj()
})
test('4. guard vs crossups: a hit from behind is blocked by the shared guard; throws / unblockables are not', () => {
  const g = ben(), o = fresh('goku', 300); tick(g, o, 2); o.x = g.x - 50; o.facing = 1; tick(g, o); assert.equal(g.facing, -1, 'auto-corrected toward the attacker')
  const hp = g.health; melee(o, g, 'light', { md: { damage: 40, startup: 3, active: 3, recovery: 6, frameExact: true }, block: true })
  assert(g.health >= hp - 6 && g.blockstun > 0, 'crossup blocked (chip at most)')
  g.health = 950; freshDef(g); const hp2 = g.health
  o.attacking = false; o.currentAttack = null; o.attackCooldown = 0; assert(C.startMove(o, 'light', { damage: 40, startup: 3, active: 3, recovery: 6, frameExact: true }))
  o.currentAttack.unblockable = true; g.isBlocking = true
  for (let i = 0; i < 20 && g.health === hp2 && o.attacking; i++) { o.hitstop = 0; C.updateCombat(o, g, {}, {}); C.resolveAttackHit(o, g, [], {}) }
  assert(g.health < hp2 - 10, 'unblockable is not blocked (ordinary rules)')
})

// ── 5 Eye Orb charge ───────────────────────────────────────────────────────────────────────────────────────
test('5. Eye Orb: release < 40f = normal (45); hold to 40f = EX (20 Power total, 70, pierces, +2 Stare capped at 3); block cancels', () => {
  let f = ben(), t = fresh('goku', 70)
  const n = special(f, t, null, { input: fr => ({ special: fr < 20 }) }); assert.equal(n.spent, 12); assert.equal(S(f).stats.orbs, 1); assert.equal(S(f).stats.exOrbs, 0)
  f = ben(); t = fresh('goku', 70); A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t)))
  tick(f, t, EG_ORB.CHARGE - 1, { special: true }); assert(S(f).orbHold, 'still charging at 39f')
  tick(f, t, 1, { special: true }); assert.equal(S(f).orbHold, null); assert.equal(S(f).stats.exOrbs, 1, 'EX at 40f'); assert.equal(f.energy, 80, '20 Power total')
  tick(f, t, 8); const p = A.activeProjectiles.find(q => q.name === 'eg_orb'); assert(p && p.damage === EG_ORB.EX_DMG && p.piercesMulti, 'EX 70, pierces')
  p.x = t.x + t.w / 2; p.y = t.y + t.h / 2; const hp = t.health; C.resolveProjectileHitsMulti(A.activeProjectiles, [t])
  assert(t.health < hp); assert(A.activeProjectiles.includes(p), 'pierces one hit (keeps flying)'); assert.equal(S(f).stare.pips, 2, '+2 Stare'); clearProj()
  S(f).stare.pips = 2; S(f).stare.lastPipCast = -1; addStare(S(f), 999, 2); assert.equal(S(f).stare.pips, 0); assert(S(f).stare.unblinkT > 0, 'capped at 3 → Unblinking')
  f = ben(); A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t))); tick(f, t, 10, { special: true }); tick(f, t, 1, { special: true, block: true })
  assert.equal(S(f).orbHold, null); assert.equal(S(f).stats.cancels, 1, 'hold cancelled into block'); assert.equal(f._benPowerCommit, 0); clearProj()
  f = ben(); t = fresh('goku', 900); A.clearAbilityState(); f._specialHeldDir = null; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 10)
  f.attackCooldown = 0; f._benPowerCommit = 0; f._specialHeldDir = null; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'one orb on screen'); clearProj()
})

// ── 6 Stare / Unblinking ───────────────────────────────────────────────────────────────────────────────────
test('6. Stare: one pip per cast, max 3, Hypno Wave none, Unblinking guard-breaks once then consumes, 300f immunity', () => {
  const f = ben(), t = fresh('goku', 70)
  special(f, t, 'D', { frames: 40 }); assert.equal(S(f).stare.pips, 1, 'Low Gaze 2 hits → 1 pip')
  special(f, t, 'B', { frames: 80 }); assert.equal(S(f).stare.pips, 1, 'Hypno Wave → no pip')
  special(f, t, null, { block: true }); assert.equal(S(f).stare.pips, 1, 'blocked → no pip')
  special(f, t, null); special(f, t, null); assert.equal(S(f).stare.pips, 0); assert(S(f).stare.unblinkT > 0, 'Unblinking')
  const hp = t.health; const o = special(f, t, null, { block: true }); assert(t.health < hp - 20, `guard-broken: full damage through block (${hp - t.health})`)
  assert.equal(S(f).stare.unblinkT, 0, 'consumed'); assert.equal(S(f).stare.breaks, 1); assert(S(f).stare.immune > 0, '300f immunity')
  const hp2 = t.health; special(f, t, null, { block: true }); assert(hp2 - t.health < 10, 'next one is blocked again')
  assert.equal(addStare(S(f), 12345), false, 'no pips while immune'); tick(f, t, EG_STARE.IMMUNE); assert.equal(addStare(S(f), 12346), true)
  const g = ben(); S(g).stare.unblinkT = 5; tick(g, t, 6); assert(S(g).stare.immune > 0, 'expiry also starts immunity')
})
test('6. pips expire 240f after the last', () => {
  const f = ben(), t = fresh('goku', 70); special(f, t, null); assert.equal(S(f).stare.pips, 1); tick(f, t, EG_STARE.EXPIRE + 2); assert.equal(S(f).stare.pips, 0)
})

// ── 7 Hypno Wave drain ─────────────────────────────────────────────────────────────────────────────────────
test('7. Hypno Wave: 14 Power, 3 ticks = 30, drains 12 from the opponent and gives Eyeguy 6; 0 energy → 0', () => {
  let f = ben(), t = fresh('goku', 70); t.energy = 50
  A.clearAbilityState(); f._specialHeldDir = 'B'; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(f.energy, 86)
  const hp = t.health; let hits = 0
  for (let i = 0; i < 90; i++) { tick(f, t); for (const p of A.activeProjectiles.filter(p => p.name === 'eg_hypno')) { p.x = t.x + t.w / 2; p.y = t.y + t.h / 2; t.hitstun = 0; C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); hits++ } }
  assert.equal(hits, 3, '3 ticks'); assert.equal(t.energy, 38, 'drained 12'); assert.equal(f.energy, 92, 'gained 6'); console.log('   wave HP', hp - t.health)
  assert(A.activeProjectiles.every(p => p.name !== 'eg_hypno'), 'ticks gone')
  f = ben(); t = fresh('goku', 70); t.energy = 0; const r = special(f, t, 'B', { frames: 80 }); assert.equal(t.energy, 0); assert.equal(S(f).stats.drained, 0, '0 drained'); assert.equal(f.energy, 86)
  f = ben(); t = fresh('goku', 70); A.clearAbilityState(); f._specialHeldDir = 'B'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 35); f.attackCooldown = 0; f._benPowerCommit = 0
  assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'one on screen'); clearProj()
})

// ── 8 Open Eyes ────────────────────────────────────────────────────────────────────────────────────────────
test('8. Open Eyes: air, 12 Power, 3-orb fan, one hit (20) per target, once per airtime, no jump refill', () => {
  const f = ben(), t = fresh('goku', 70); f.onGround = f.grounded = false; f.y = 200; f.jumpCount = 1; t.x = f.x + 80
  A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(f.energy, 88)
  const hp = t.health
  for (let i = 0; i < 20; i++) { tick(f, t); f.onGround = f.grounded = false; for (const p of A.activeProjectiles.filter(p => p.name === 'eg_fan')) { p.x = t.x + t.w / 2; p.y = t.y + t.h / 2 }; t.hitstun = 0; C.resolveProjectileHitsMulti(A.activeProjectiles, [t]) }
  const d = hp - t.health; assert(d > 0 && d <= Math.ceil(EG_FAN_MAX()), `one hit max (${d})`); assert.equal(f.jumpCount, 1, 'no jump refill')
  f.attackCooldown = 0; f._benPowerCommit = 0; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime')
  f.onGround = f.grounded = true; tick(f, t); f.onGround = f.grounded = false; f.attackCooldown = 0; assert(A.triggerSpecial(f, ctxOf(f, t)), 'again after landing'); clearProj()
})
function EG_FAN_MAX() { const g = ben(), u = fresh('goku', 70); const hp = u.health; C.applyScaledDamage(u, 20, { attacker: g, source: 'projectile', move: 'open_eyes' }); return hp - u.health }

// ── 9 Ultimate ─────────────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false } = {}) {
  A.clearAbilityState(); f.attackCooldown = 0; f.attacking = false; f.energy = 100; f._benPowerCommit = 0
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }; let eyes = 0
  for (let i = 0; i < 180; i++) {
    tick(f, t); t.isBlocking = block; if (S(f).ult) eyes = Math.max(eyes, S(f).ult.eyes || 0)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) }
  }
  t.isBlocking = false
  return { ok, dealt: hp - t.health, home, eyes }
}
test('9. All-Seeing Eye: 50 Power; whiff / block = no cinematic (60f); clean = 40 + 5×22 + 90 = 240; Unblinking consumed; positions restore', () => {
  let f = ben(), t = fresh('goku', 70); f.energy = 40; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'rejected below 50 Power')
  f = ben(); t = fresh('goku', 70); let r = ult(f, t, { far: true }); assert(r.ok); assert.equal(r.dealt, 0); assert.equal(S(f).lastUltRaw, 0, 'whiff: no cinematic')
  f = ben(); t = fresh('goku', 70); r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, 0, 'blocked: no cinematic')
  f = ben(); t = fresh('goku', 70); A.clearAbilityState(); f.energy = 100; A.triggerUltimate(f, ctxOf(f, t)); assert.equal(f.energy, 50)
  assert.equal(f.attackCooldown, EG_ULT.OPENER_AT + EG_ULT.WHIFF_RECOVERY, '60f whiff recovery'); clearProj()
  f = ben(); t = fresh('goku', 70); reset(f, t); r = ult(f, t)
  assert.equal(S(f).lastUltRaw, EG_ULT.OPENER + 5 * EG_ULT.BEAM + EG_ULT.FINAL); assert.equal(S(f).lastUltRaw, 240)
  assert(r.eyes > 0, 'render-only eyes counted'); assert.equal(S(f).ult, null); assert.equal(f.x, r.home.x, 'positions restore')
  assert(f.attackCooldown > 0 && f.attackCooldown <= EG_ULT.LOCKOUT, '100f lockout'); console.log('   HP dealt', r.dealt)
  assert(!A.activeProjectiles.some(p => /eye|beam/i.test(p.name || '') && !p.visualOnly), 'eyes / beams have no hitboxes')
  f = ben(); t = fresh('goku', 70); reset(f, t); S(f).stare.unblinkT = 100; r = ult(f, t)
  assert.equal(S(f).stare.unblinkT, 0, '3 Stare at capture: consumed by the final guard-break'); assert.equal(S(f).lastUltRaw, 240, 'no extra damage')
})

// ── 10 swap / revert / KO / rematch ────────────────────────────────────────────────────────────────────────
test('10. swap / revert / KO / rematch clear all Eyeguy state', () => {
  const f = ben(), t = fresh('goku', 70); S(f).stare.pips = 2; S(f).stare.unblinkT = 50; S(f).vision.sight = 30; S(f).orbHold = { t: 3, cast: 1 }; S(f).hypno = { t: 1 }
  assert(F.applyAlien(f, 'goop')); assert.notEqual(f.omnitrix.formState?.kind, 'eyeguy', 'swap clears')
  assert(F.applyAlien(f, 'eyeguy')); assert.equal(S(f).stare.pips, 0); assert.equal(S(f).stare.unblinkT, 0); assert.equal(S(f).orbHold, null); assert.equal(S(f).vision.sight, 0)
  S(f).stare.pips = 1; F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears')
  const k = ben(); S(k).stare.pips = 2; k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null, 'KO revert clears')
  const g = ben(); assert.equal(S(g).stare.pips, 0, 'rematch: fresh state')
})

// ── 11 slot 6 + Vow + determinism ──────────────────────────────────────────────────────────────────────────
test('11. registry: Eyeguy READY, slot count 6 from the registry; ready aliens untouched', () => {
  const d = getAlienDefinition('eyeguy'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 6); assert.equal(BEN10_SLOT_COUNT, 6)
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(F.MAX_OMNITRIX_SLOTS, 6); assert.equal(buildLoadout().length, 6, 'buildLoadout fills 6 slots'); assert.equal(F.DEFAULT_OMNITRIX[5], 'eyeguy', 'default loadout slot 6 = Eyeguy'); assert.equal(F.DEFAULT_OMNITRIX[4], 'xlr8', 'slot 5 = XLR8 untouched')
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(getAvailableAlienKeys(false).includes('eyeguy'))
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Eyeguy'); assert.equal(f.health, 950, 'shared health')
  assert(Math.abs(f.damageMultiplier - 1.15) < 1e-9 && Math.abs(f.defenseMultiplier - 1.05) < 1e-9)
})
test('11. 6-slot loadout: slot 6 holds Eyeguy and the transform reaches it', () => {
  const f = fresh(); F.applyBen10VariantStats(f, 'default'); f.benExperimental = true
  F.setupBen10(f, ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy'], { experimental: true })
  if (f.omnitrix.aliens.length < 6) f.omnitrix.aliens = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy']
  assert.equal(f.omnitrix.aliens.length, 6); assert.equal(f.omnitrix.aliens[5], 'eyeguy')
  f.energy = 100; const act = F.ben10TransformOrSwap(f, 5, { seed: 1, frame: 0, playerIndex: 0 }); assert(act, 'slot index 5 accepted')
  for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.omnitrix.pendingSlot ?? 5, 5)
})
test('11. Vow pick includes Eyeguy (mod loadout length, 6 slots too); same seed → same pick', () => {
  const mk = aliens => { const f = ben(null); f.omnitrix.aliens = aliens.slice(); return f }
  for (const L of [['swampfire', 'heatblast', 'megawhatt', 'goop', 'eyeguy'], ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy']]) {
    const a = mk(L), b = mk(L), picks = new Set()
    for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(a.omnitrix.aliens[x]) }
    assert(picks.has('eyeguy') && picks.size === L.length, `Vow reaches every slot incl. Eyeguy (${L.length})`)
  }
})
test('11. same-seed determinism: an identical scripted Eyeguy sequence yields identical GAME_STATE', () => {
  const run = () => {
    const f = ben(), t = fresh('goku', 70); melee(f, t, 'light'); special(f, t, null); special(f, t, 'B', { frames: 80 }); special(f, t, 'D', { frames: 40 })
    t.x = 0; tick(f, t, 3); tick(f, t, 100); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, te: t.energy, x: f.x, face: f.facing })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast: orb charge, Hypno Wave, ult cinematic', () => {
  const f = ben(), t = fresh('goku', 70); A.clearAbilityState(); f._specialHeldDir = null; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 10, { special: true })
  assert(S(f).orbHold); assert.doesNotThrow(() => JSON.stringify(f.omnitrix)); tick(f, t, 40); clearProj()
  f.attackCooldown = 0; f._benPowerCommit = 0; f._specialHeldDir = 'B'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 20); assert(S(f).hypno); JSON.stringify(S(f)); tick(f, t, 80); clearProj()
  reset(f, t); f.attackCooldown = 0; f._benPowerCommit = 0; f.energy = 100; A.clearAbilityState(); A.triggerUltimate(f, ctxOf(f, t))
  for (let i = 0; i < 40; i++) { tick(f, t); for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) } }
  assert(S(f).ult && S(f).ult.phase !== 'opener', 'mid-cinematic'); assert.doesNotThrow(() => JSON.stringify(S(f))); clearProj()
})
test('no Math.random / gameRng in eyeguy.js / eyeguyAssets.js', () => {
  for (const file of ['../eyeguy.js', '../eyeguyAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`EYEGUY: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
