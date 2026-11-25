// ALIEN X — Phase 7 harness (module-level, the real combat / projectile / physics / flight pipeline; no browser).
//   node harness/ben10_alienx.test.mjs
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per move, reset after 90f), within
// ±20%. The live routes then run the real engine (its combo curve, the form's ×1.20, the global damage scale) and
// assert the mechanics: every hit connects, the counter grows, later hits scale down.
// Test 14 (the brief's "slot 8") is PICK FIVE: the owner kept 5 slots; Alien X is a pick, not a new slot.
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF, BEN_ALIEN_DAMAGE_BONUS, BEN_ALIEN_DEFENSE_BONUS } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { tickFlightDriver, isFlying } from '../flight.js'
import { characters } from '../characters.js'
import { ALIENX, AX_VOICE, AX_VOID, AX_FLIGHT, AX_COST, AX_NULLIFY, AX_GRAVITY, AX_REWIND, AX_GRASP, AX_STARFALL, AX_ULT, AX_DRAIN_MULT,
  axState, addVoid, decreeCost, rewindSnapshot, drawAlienXUnder } from '../alienx.js'
import { benAlienNegatesSpecial } from '../ben10State.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'
import * as X from '../alienx.js'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'alienx', loadout = []) => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const foe = (key = 'goku', x = 70) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); if (ch?.animationData) t.animationData = ch.animationData; t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
const STAGE = { stageLeft: 0, stageWidth: 1600 }
const ctxOf = (f, t) => ({ p1: f, p2: t, ...STAGE })
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { A.updatePendingSpawns(); A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t)); if (f._benGlide) physics.moveFighter(f, {}, {}) } }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const timers = q => { if (q.hitstop > 0) q.hitstop--; else if (q.hitstun > 0) q.hitstun--; for (const k of ['attackCooldown', '_benPowerCommit', '_spriteCastTimer', 'invulnTimer', 'blockstun', 'grabInputBuffer']) if (q[k] > 0) q[k]-- }
// one whole frame: pending spawns, both fighters' physics, the form tick, Alien X's live projectiles moved + resolved on the foe
function world(f, t, n = 1, input = {}) {
  for (let i = 0; i < n; i++) {
    A.updatePendingSpawns()
    physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
    A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t))
    physics.moveFighter(t, {}, CONTROLS); physics.applyGravity(t)
    for (let k = A.activeProjectiles.length - 1; k >= 0; k--) { const p = A.activeProjectiles[k]; if (p.owner !== f || p.visualOnly) continue
      p.x += p.vx || 0; p.y += p.vy || 0; if (p.lifetime != null && --p.lifetime < 0) A.activeProjectiles.splice(k, 1) }
    C.resolveProjectileHitsMulti(A.activeProjectiles, [t])
    timers(f); timers(t)
  }
}
const BA = ALIENX.basic_attacks
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  nullify: AX_NULLIFY.DMG, gravity: AX_GRAVITY.DMG1 + AX_GRAVITY.DMG2, grasp: AX_GRASP.TICK * AX_GRASP.TICKS.length }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0 }

function melee(f, t, key, { block = false } = {}) {
  ready(f)
  if (key === 'air') { f.onGround = f.grounded = false }
  assert(C.startMove(f, key, BA[key]), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter, bs = t.blockstun
  t.isBlocking = block
  for (let i = 0; i < 50 && t.health === hp && !(block && t.blockstun > bs) && f.attacking; i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true; f.attacking = false; f.currentAttack = null
  if (!block) { assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo') }
  return hp - t.health
}
// Real special: Power spend, its live (non-visual) projectiles through the projectile pipeline, placed on the target.
function special(f, t, dir, { frames = 70, block = false, keep = false, input = {} } = {}) {
  ready(f)
  if (!keep) A.clearAbilityState()
  f._specialHeldDir = dir; const e = f.energy, hp = t.health
  const ok = A.triggerSpecial(f, ctxOf(f, t))
  let hits = 0
  if (ok) for (let frame = 1; frame <= frames; frame++) {
    tick(f, t, 1, input)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly && p.owner === f)) {
      t.isBlocking = block; p.x = t.x + t.w / 2; p.y = t.y + t.h / 2
      C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); hits++
      const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
    }
  }
  t.isBlocking = false
  return { ok, spent: e - f.energy, dealt: hp - t.health, hits }
}
// →→ (two forward press edges, no Down) fed frame by frame, then the Special press held Forward
const dashTap = (f, t) => { tick(f, t, 1, { right: true }); tick(f, t, 1, {}); tick(f, t, 1, { right: true }) }
const tap = (f, t) => { tick(f, t, 1, { block: true }); tick(f, t, 1, { block: true, light: true }); tick(f, t, 1, {}) }

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 110],
  ['2. Low, Heavy, Nullify', ['low', 'heavy', 'nullify'], 128],
  ['3. Gravity, Heavy, Void Grasp', ['gravity', 'heavy', 'grasp'], 160],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Nullify (12 Power, 1 hit, +1 Void pip)', () => {
  const f = ben(), t = foe(); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  const o = special(f, t, null); assert(o.ok); assert.equal(o.spent, AX_COST.nullify); assert.equal(o.hits, 1); assert(o.dealt > 0)
  assert.equal(S(f).void.pips, 1); assert.equal(f.comboCounter, 3); console.log('   HP', [...d, o.dealt].join('+'))
})
test('route 3 live: Gravity (16 Power, 2 hits), Heavy, Void Grasp (→→, 14 Power, 3 ticks)', () => {
  const f = ben(), t = foe(); const g = special(f, t, 'B', { frames: 60 })
  assert(g.ok); assert.equal(g.spent, AX_COST.gravity); assert.equal(g.hits, 2, 'grounded: two hits'); assert(g.dealt > 0)
  reset(f, t); const h = melee(f, t, 'heavy'); reset(f, t); ready(f)
  const hp = t.health, e = f.energy; dashTap(f, t); f._specialHeldDir = 'F'; assert(A.triggerSpecial(f, ctxOf(f, t)), 'Void Grasp')
  assert.equal(e - f.energy, AX_COST.grasp); world(f, t, 70); const vg = hp - t.health; assert(vg > 0, 'grasp damage')
  assert.equal(S(f).void.pips, 2, '+1 Gravity (2 hits, one cast) +1 Void Grasp'); assert.equal(f.comboCounter, 4)
  console.log('   HP', g.dealt, '+', h, '+', vg)
})

// ── 4 Three Voices ─────────────────────────────────────────────────────────────────────────────────────────
test('4. Voices: Ben → Bellicus → Serena → Ben, 20f switch, 120f cooldown, per-stance modifiers', () => {
  const f = ben(), t = foe(), base = f.damageMultiplier
  assert.equal(S(f).voice, 'ben'); assert(Math.abs(base / (BEN_ALIEN_BUFF.damage * BEN_ALIEN_DAMAGE_BONUS.alienx) - 1.20) < 1e-9 && Math.abs(f.defenseMultiplier - 1.25 * BEN_ALIEN_BUFF.defense * BEN_ALIEN_DEFENSE_BONUS.alienx) < 1e-9)   // + the 2026-11-23 Alien X bonus
  tap(f, t); assert.equal(S(f).voice, 'bellicus')
  assert(Math.abs(f.damageMultiplier - base * 1.20) < 1e-9 && Math.abs(f.defenseMultiplier - 1.25 * BEN_ALIEN_BUFF.defense * 0.85) < 1e-9, 'Bellicus +20% dmg / −15% def')
  assert.equal(S(f).switchT, AX_VOICE.SWITCH - 1, '20f switch'); assert.equal(f._spriteCastMove, 'axVoice', 'Stance frame during the switch')
  tick(f, t, 30); assert.equal(S(f).switchT, 0)
  tap(f, t); assert.equal(S(f).voice, 'bellicus', 'cooldown blocks the next tap')
  tick(f, t, AX_VOICE.COOLDOWN); tap(f, t); assert.equal(S(f).voice, 'serena')
  assert(Math.abs(f.damageMultiplier - base * 0.85) < 1e-9 && Math.abs(f.defenseMultiplier - 1.25 * BEN_ALIEN_BUFF.defense * 1.20) < 1e-9, 'Serena −15% dmg / +20% def')
  tick(f, t, AX_VOICE.COOLDOWN + 2); tap(f, t); assert.equal(S(f).voice, 'ben', 'wraps to Ben'); assert(Math.abs(f.damageMultiplier - base) < 1e-9)
})
test('4. Voices: Bellicus Decree startup +2f; Serena Decree Power −3 (min 6) + block chip ×0.6; the tap never throws a jab', () => {
  const firstAt = voice => { const f = ben(), t = foe(); S(f).voice = voice; tick(f, t); A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t)))
    for (let i = 1; i <= 40; i++) { tick(f, t); if (A.activeProjectiles.some(p => p.name === 'ax_nullify')) { clearProj(); return i } } }
  assert.equal(firstAt('ben'), AX_NULLIFY.STARTUP); assert.equal(firstAt('bellicus'), AX_NULLIFY.STARTUP + 2)
  const f = ben(), t = foe(); S(f).voice = 'serena'; tick(f, t)
  assert.equal(special(f, t, null).spent, AX_COST.nullify - 3); assert.equal(special(f, t, 'B').spent, AX_COST.gravity - 3)
  assert.equal(decreeCost(S(f), 8), 6, 'min 6'); assert.equal(decreeCost({ voice: 'ben' }, 8), 8)
  const chip = voice => { const g = ben(); S(g).voice = voice; tick(g, t); const hp = g.health; C.applyScaledDamage(g, 50, { scale: 1, source: 'block-chip', defenseApplied: true, offenseApplied: true }); return hp - g.health }
  assert.equal(chip('serena'), Math.round(chip('ben') * 0.6), `Serena chip ${chip('serena')} vs Ben ${chip('ben')}`)
  const j = ben(); tick(j, t, 1, { block: true }); tick(j, t, 1, { block: true, light: true })
  assert.equal(C.startMove(j, 'light', BA.light), false, 'Block + Light swallows the jab'); tick(j, t, 25); j.attackCooldown = 0
  assert.equal(C.startMove(j, 'light', BA.light), true, 'a plain jab works again after the window')
})
test('4. Voices: no switch in hitstun, during his own active frames or the ultimate; swap resets to Ben', () => {
  const f = ben(), t = foe(); f.hitstun = 10; tap(f, t); assert.equal(S(f).voice, 'ben', 'hitstun'); f.hitstun = 0
  ready(f); assert(C.startMove(f, 'heavy', BA.heavy)); while (!(f.currentAttack && (f.currentAttack.total - f.currentAttack.timer) >= f.currentAttack.activeStart)) C.updateCombat(f, t, {}, {})
  tap(f, t); assert.equal(S(f).voice, 'ben', 'active frames'); ready(f)
  S(f).ult = { phase: 'opener', t: 0 }; tap(f, t); assert.equal(S(f).voice, 'ben', 'ultimate'); S(f).ult = null
  tick(f, t, 5); tap(f, t); assert.equal(S(f).voice, 'bellicus')
  assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'alienx')); assert.equal(S(f).voice, 'ben', 'swap resets')
})

// ── 5 Nullify ──────────────────────────────────────────────────────────────────────────────────────────────
test('5. Nullify: deletes exactly ONE opponent projectile in the ring (ownership-aware); 40 only on contact; −12 on block', () => {
  const f = ben(), t = foe('goku', 900); A.clearAbilityState(); tick(f, t)
  const rx = f.x + f.w / 2 + AX_NULLIFY.DIST, ry = f.y + f.h * 0.5
  const mk = (owner, x, y) => A.spawnProjectile(owner, 'fireball', { damage: 10, speed: 0, vx: 0, vy: 0, spawnX: x, spawnY: y, w: 20, h: 20, lifetime: 300 }, {})
  mk(t, rx, ry); mk(t, rx + 10, ry); mk(f, rx - 5, ry); mk(t, rx + 400, ry)
  const hp = t.health; f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t)))
  tick(f, t, 40)
  const own = A.activeProjectiles.filter(p => p.owner === f && p.name === 'fireball').length, opp = A.activeProjectiles.filter(p => p.owner === t).length
  assert.equal(opp, 2, 'one of the two in-ring opponent projectiles deleted, the far one kept'); assert.equal(own, 1, 'own projectile untouched')
  assert.equal(S(f).stats.nullified, 1); assert.equal(t.health, hp, 'opponent outside the ring: no damage'); assert.equal(S(f).void.pips, 0, 'no pip without a hit')
  clearProj()
  const g = ben(), u = foe(); u.x = g.x + g.w / 2 + AX_NULLIFY.DIST - u.w / 2; const h0 = u.health; A.clearAbilityState(); g._specialHeldDir = null; A.triggerSpecial(g, ctxOf(g, u))
  world(g, u, 40); assert(h0 - u.health > 0, 'opponent inside: hit'); assert.equal(S(g).void.pips, 1); clearProj()
  const b = ben(), v = foe(); v.x = b.x + b.w / 2 + AX_NULLIFY.DIST - v.w / 2; A.clearAbilityState(); b._specialHeldDir = null; A.triggerSpecial(b, ctxOf(b, v))
  let adv = null; for (let i = 0; i < 40 && adv == null; i++) { v.isBlocking = true; world(b, v); if (v.blockstun > 0) adv = b.attackCooldown - v.blockstun }
  assert.equal(adv, -AX_NULLIFY.ON_BLOCK, `−12 on block (${adv})`); assert.equal(S(b).void.pips, 0, 'no pip on block'); clearProj()
})

// ── 6 Gravity ──────────────────────────────────────────────────────────────────────────────────────────────
test('6. Gravity: ring at the cast-time position (no tracking); grounded 2 hits + 30f pin (no jump, ×0.5 walk)', () => {
  const f = ben(), t = foe('goku', 400); A.clearAbilityState(); f._specialHeldDir = 'B'; const x0 = t.x + t.w / 2
  assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(S(f).gravity.x, x0)
  t.x += 200; const hp = t.health; world(f, t, 40); assert.equal(t.health, hp, 'moved away after cast → miss (no tracking)'); clearProj()
  const g = ben(), u = foe('goku', 400); A.clearAbilityState(); g._specialHeldDir = 'B'; A.triggerSpecial(g, ctxOf(g, u)); const h0 = u.health
  let hits = 0, last = u.health; for (let i = 0; i < 40; i++) { world(g, u); if (u.health < last) { hits++; last = u.health } }
  assert.equal(hits, 2, 'two hits'); assert(h0 - u.health > 0); assert.equal(S(g).void.pips, 1, 'one pip per cast')
  assert(u._benPinT > 0 && u._benPinT <= AX_GRAVITY.PIN, `pinned (${u._benPinT})`)
  u.hitstun = 0; u.hitstop = 0; u.attackCooldown = 0; u.vx = 0; u.speed = u.speed || 6
  physics.moveFighter(u, { d: true }, CONTROLS); const pinned = Math.abs(u.vx)
  physics.moveFighter(u, { w: true }, CONTROLS); assert(!(u.vy < 0), 'no jump while pinned')
  u._benPinT = 0; u.vx = 0; physics.moveFighter(u, { d: true }, CONTROLS); const free = Math.abs(u.vx)
  assert(pinned > 0 && Math.abs(pinned - free * 0.5) < 1e-6, `walk ×0.5 (${pinned} vs ${free})`)
  const p = foe('goku', 0); p._benPinT = 3; for (let i = 0; i < 3; i++) physics.moveFighter(p, {}, CONTROLS); assert.equal(p._benPinT, 0, 'pin self-clears')
})
test('6. Gravity: airborne = slam to the floor (55) + one ground bounce; −14 on block', () => {
  const f = ben(), t = foe('goku', 400); t.y = 120; t.onGround = t.grounded = false; A.clearAbilityState(); f._specialHeldDir = 'B'; A.triggerSpecial(f, ctxOf(f, t))
  const hp = t.health; let slam = false, bounce = false
  for (let i = 0; i < 90; i++) { if (S(f).gravity && S(f).gravity.t < AX_GRAVITY.STARTUP - 1) { t.y = 120; t.vy = 0; t.onGround = t.grounded = false }
    world(f, t); if (t.vy >= AX_GRAVITY.SLAM_VY - 1e-9 && t.health < hp) slam = true; if (slam && t.vy < 0) bounce = true }
  assert(slam, 'slammed down'); assert(bounce, 'bounced off the floor'); assert(hp - t.health > 0); assert.equal(S(f).void.pips, 1)
  clearProj()
  const b = ben(), v = foe('goku', 400); A.clearAbilityState(); b._specialHeldDir = 'B'; A.triggerSpecial(b, ctxOf(b, v))
  let adv = null; for (let i = 0; i < 50; i++) { v.isBlocking = true; const before = v.blockstun; world(b, v); if (v.blockstun > before + 1) adv = b.attackCooldown - v.blockstun }
  assert.equal(adv, -AX_GRAVITY.ON_BLOCK, `−14 on block after the last hit (${adv})`); clearProj()
})

// ── 7 Rewind ───────────────────────────────────────────────────────────────────────────────────────────────
test('7. Rewind: position from 60f ago (stage-clamped), heals ≤ 40 and never above the 60f-ago value, 900f cooldown, no invuln', () => {
  const f = ben(), t = foe('goku', 1200); f.x = 200
  for (let i = 0; i < 70; i++) { tick(f, t); if (i >= 10) f.x += 5; if (i === 30) f.health -= 100 }
  const snap = rewindSnapshot(S(f)); assert.equal(S(f).hist.length, AX_REWIND.BACK, 'bounded 60-entry buffer')
  const r = special(f, t, 'D', { frames: 0 }); assert(r.ok); assert.equal(r.spent, AX_COST.rewind)
  assert.equal(f.x, snap[0], 'back to the 60f-ago position'); assert.equal(f.health, f.maxHealth - 100 + AX_REWIND.HEAL, 'heals at most 40')   // took 100 from full (full = 950 × the 2026-11-23 Ben HP buff)
  assert(!(f.invulnTimer > 0), 'no invulnerability'); assert.equal(t.x, 1200, 'opponent untouched'); assert.equal(f.attackCooldown, AX_REWIND.RECOVERY)
  tick(f, t, 40); assert.equal(special(f, t, 'D', { frames: 0 }).ok, false, '900f cooldown')
  tick(f, t, AX_REWIND.COOLDOWN); assert.equal(special(f, t, 'D', { frames: 0 }).ok, true, 'available again')
  const g = ben(); for (let i = 0; i < 61; i++) tick(g, t); g.health = 930; S(g).hist.forEach(e => { e[2] = 940; e[0] = -400 })
  special(g, t, 'D', { frames: 0 }); assert.equal(g.health, 940, 'never above the 60f-ago value'); assert.equal(g.x, STAGE.stageLeft, 'clamped to the stage')
})

// ── 8 Void → Unmade ────────────────────────────────────────────────────────────────────────────────────────
test('8. Void: one pip per cast, max 3 → UNMADE negates exactly one special (startup plays, Power spent, no hitbox / projectile)', () => {
  const f = ben(), t = foe('naruto', 70)
  assert(addVoid(S(f), 1)); assert(!addVoid(S(f), 1), 'same cast: no 2nd pip'); assert(addVoid(S(f), 2)); assert(addVoid(S(f), 3))
  assert.equal(S(f).void.pips, 0, '3 pips consumed'); assert.equal(S(f).void.unmadeT, AX_VOID.UNMADE)
  assert(!addVoid(S(f), 4), 'no refresh while Unmade')
  A.clearAbilityState(); const e = t.energy, hp = f.health, dir = t._specialHeldDir
  assert(A.triggerSpecial(t, ctxOf(f, t)), 'the press is consumed as a special'); assert(t.energy < e, `Power spent (${e - t.energy})`)
  assert(t.attacking && t.currentAttack && t.currentAttack._benNegated && t.currentAttack.activeStart > t.currentAttack.total, 'startup plays, never active')
  for (let i = 0; i < 80; i++) { A.updatePendingSpawns(); C.updateCombat(t, f, {}, {}); C.resolveAttackHit(t, f, [], {}) }
  assert.equal(f.health, hp, 'no hitbox'); assert.equal(A.activeProjectiles.filter(p => p.owner === t && !p.visualOnly).length, 0, 'no projectile')
  assert.equal(S(f).void.unmadeT, 0); assert.equal(S(f).void.immune, AX_VOID.IMMUNE, '420f immunity'); assert.equal(S(f).void.negated, 1)
  assert.equal(t._specialHeldDir, dir, 'input state untouched')
  t.attacking = false; t.currentAttack = null; t.attackCooldown = 0; t.energy = 100
  assert(A.triggerSpecial(t, ctxOf(f, t))); for (let i = 0; i < 80; i++) { A.updatePendingSpawns(); C.updateCombat(t, f, {}, {}); C.resolveAttackHit(t, f, [], {}) }
  assert(f.health < hp, 'the next special works normally (exactly one negated)'); clearProj()
})
test('8. Void: pips expire 240f after the last; Unmade expires after 300f → 420f immunity; Ben voice only', () => {
  const f = ben(), t = foe(); addVoid(S(f), 1); tick(f, t, AX_VOID.EXPIRE - 1); assert.equal(S(f).void.pips, 1); tick(f, t, 1); assert.equal(S(f).void.pips, 0, 'expired')
  addVoid(S(f), 2); addVoid(S(f), 3); addVoid(S(f), 4); tick(f, t, AX_VOID.UNMADE); assert.equal(S(f).void.unmadeT, 0); assert.equal(S(f).void.immune, AX_VOID.IMMUNE)
  assert(!addVoid(S(f), 5), 'no pips during immunity'); tick(f, t, AX_VOID.IMMUNE); assert(addVoid(S(f), 6), 'pips again after immunity')
  const g = ben(); S(g).voice = 'bellicus'; assert(!addVoid(S(g), 1), 'Bellicus: no pips'); S(g).voice = 'serena'; assert(!addVoid(S(g), 2), 'Serena: no pips')
})
test('8. the negate hook is a no-op without Alien X (every other match unchanged)', () => {
  const a = foe('naruto', 0), b = foe('naruto', 70); assert.equal(benAlienNegatesSpecial(a, b, false), false); assert.equal(benAlienNegatesSpecial(ben('heatblast'), b, false), false)
  const f = ben(); assert.equal(benAlienNegatesSpecial(f, b, false), false, 'Alien X without Unmade: false')
})

// ── 9 Void Grasp ───────────────────────────────────────────────────────────────────────────────────────────
const grasp = (dist, setup = () => {}) => {
  const f = ben(), t = foe(); t.x = f.x + f.w / 2 + dist - t.w / 2; A.clearAbilityState(); setup(f, t)
  dashTap(f, t); f._specialHeldDir = 'F'; const ok = A.triggerSpecial(f, ctxOf(f, t)); return { f, t, ok, hp: t.health, cd: f.attackCooldown }
}
test('9. Void Grasp: →→ command grab, 120 px, 3 ticks, throws 200 px, +1 pip; whiff = 16f + 28f; ↓↘→ is Nullify, not a grab', () => {
  const { f, t, ok, hp, cd } = grasp(110); assert(ok); assert.equal(f._spriteCastMove, 'axGrasp'); assert.equal(cd, AX_GRASP.STARTUP + AX_GRASP.WHIFF)
  let held = null; for (let i = 0; i < 80; i++) { world(f, t); if (S(f).grasp?.phase === 'throw' && held == null) held = S(f).grasp.x0 }
  assert(hp - t.health > 0); assert.equal(S(f).stats.grasps, 1); assert.equal(S(f).void.pips, 1, '+1 pip')
  assert(Math.abs(t.x - held - AX_GRASP.THROW) < 1e-6 || t.x > held + AX_GRASP.THROW - 1, `thrown 200 px (${(t.x - held).toFixed(1)})`)
  const w = grasp(AX_GRASP.RANGE + 20); world(w.f, w.t, 70); assert.equal(w.t.health, w.hp, 'out of range: whiff'); assert.equal(S(w.f).stats.grasps, 0)
  const n = ben(), u = foe('goku', 900); A.clearAbilityState(); tick(n, u, 1, { down: true }); tick(n, u, 1, { down: true, right: true }); tick(n, u, 1, { right: true })
  n._specialHeldDir = 'F'; A.triggerSpecial(n, ctxOf(n, u)); assert(S(n).nullify && !S(n).grasp, '↓↘→ + P = Nullify'); clearProj()
})
test('9. Void Grasp: standard throw-escape (grab input buffered, not in hit/blockstun) — but not out of hitstun; no air grabs', () => {
  const a = grasp(100); for (let i = 0; i < 20; i++) { a.t.grabInputBuffer = 6; world(a.f, a.t) }
  assert.equal(S(a.f).stats.techs, 1, 'teched'); assert.equal(a.t.health, a.hp, 'no damage on a tech')
  const b = grasp(100); for (let i = 0; i < 20; i++) { b.t.grabInputBuffer = 6; b.t.hitstun = 10; world(b.f, b.t) }
  assert.equal(S(b.f).stats.grasps, 1, 'cannot tech in hitstun')
  const c = grasp(100); c.t.onGround = c.t.grounded = false; c.t.y = 200; for (let i = 0; i < 20; i++) { c.t.y = 200; c.t.vy = 0; c.t.onGround = c.t.grounded = false; world(c.f, c.t) }
  assert.equal(S(c.f).stats.grasps, 0, 'airborne opponent: whiff'); clearProj()
})

// ── 10 Flight + Starfall ───────────────────────────────────────────────────────────────────────────────────
test('10. Flight: hold Jump in the air → 120f max, apex + 140 cap, never refills jumps, 40f grounded after a hard hit', () => {
  const f = ben(), t = foe('goku', 900); f.onGround = f.grounded = false; f.y = 250; f.vy = 0; f.jumpCount = 2; tick(f, t)
  const apex = S(f).apexY; let flying = 0, minY = f.y
  for (let i = 0; i < 300; i++) {
    physics.moveFighter(f, { w: true }, CONTROLS); A.updatePendingSpawns(); A.tickBenAlienForm(f, { jump: true, up: true }, ctxOf(f, t)); tickFlightDriver(f); physics.applyGravity(f)
    if (f._flightCtl && isFlying(f)) { flying++; minY = Math.min(minY, f.y); assert.equal(f.jumpCount, 2, 'jumps not refilled') }
    if (f.onGround) break
  }
  assert.equal(flying, AX_FLIGHT.MAX, `120 flying frames (${flying})`); assert(minY >= apex - AX_FLIGHT.CAP - 1e-6, `no altitude past apex + 140 (${minY})`)
  const g = ben(); g.onGround = g.grounded = false; g.y = 200; g.vy = 0; g.jumpCount = 2
  for (let i = 0; i < 12; i++) { physics.moveFighter(g, { w: true }, CONTROLS); A.tickBenAlienForm(g, { jump: true }, ctxOf(g, t)); tickFlightDriver(g) }
  assert(isFlying(g), 'flying'); g.hitstun = 20; A.tickBenAlienForm(g, { jump: true }, ctxOf(g, t)); assert(!isFlying(g)); assert.equal(g._flightCtl.groundedLock, 40, 'grounded 40f')
})
test('10. Starfall Dash: air only, 300 px diagonal-down, 50, once per airtime, no jump refill, no pip', () => {
  const f = ben(), t = foe('goku', 0); f.x = 200; f.y = 40; f.onGround = f.grounded = false; f.jumpCount = 2; tick(f, t)
  t.x = f.x + 230; const x0 = f.x, y0 = f.y, hp = t.health; A.clearAbilityState(); f._specialHeldDir = null
  assert(A.triggerSpecial(f, ctxOf(f, t)), 'Starfall'); assert.equal(f._spriteCastMove, 'axFly')
  f.attackCooldown = 0; f._benPowerCommit = 0; f._specialHeldDir = null; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime')
  world(f, t, 2); assert.equal(f.jumpCount, 2, 'no jump refill (mid-dash)')
  world(f, t, 40)
  const dx = f.x - x0, dy = f.y - y0; assert(dx > 0 && dy > 0, 'diagonal-down'); assert(Math.abs(Math.hypot(dx, dy) - AX_STARFALL.DIST) <= 25 || f.onGround, `≈ 300 px (${Math.hypot(dx, dy).toFixed(0)})`)
  assert(hp - t.health > 0, 'hits'); assert.equal(S(f).void.pips, 0, 'no Void pip'); assert.equal(f._benGlide, undefined, 'glide ended')
  const g = ben(), u = foe('goku', 900); A.clearAbilityState(); g._specialHeldDir = null; assert(A.triggerSpecial(g, ctxOf(g, u))); assert(!S(g).star, 'grounded ↓↘→ = Nullify'); clearProj()
})

// ── 11 Power drain ─────────────────────────────────────────────────────────────────────────────────────────
test('11. Power drain ×1.5 only while Alien X is active (≈ 13 s from full)', () => {
  const secs = form => { const f = ben(form); f.energy = 100; let n = 0; while (f.transformed && f.activeAlien === form && n < 5000) { F.updateTransformDevice(f, 1000 / 60); n++ } return n / 60 }
  const ax = secs('alienx'), hb = secs('heatblast'); console.log(`   Alien X ${ax.toFixed(2)} s, Heatblast ${hb.toFixed(2)} s`)
  assert(Math.abs(ax - 13.33) < 0.6, `≈ 13 s (${ax})`); assert(Math.abs(hb / ax - AX_DRAIN_MULT) < 0.08, `×1.5 vs a normal form (${(hb / ax).toFixed(3)})`)
  assert.equal(ALIENX.drainMult, 1.5); for (const d of BEN10_ALIEN_REGISTRY) if (d.id !== 'alienx') assert(d.drainMult == null, d.id + ' has no drain multiplier')
})

// ── 12 Ultimate ────────────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false } = {}) {
  A.clearAbilityState(); ready(f); f.energy = 100
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }; const thome = { x: t.x, y: t.y }
  let float = 0, lockAtEnd = null, drawn = 0, keys = new Set()
  const ctx2d = { save() {}, restore() {}, fillRect() { drawn++ }, set fillStyle(v) {}, set globalAlpha(v) {} }
  for (let i = 0; i < 300; i++) {
    const was = !!S(f).ult; tick(f, t); t.isBlocking = block
    if (S(f).ult?.home) { float = Math.max(float, S(f).ult.home.y - f.y); Object.keys(S(f).ult).forEach(k => keys.add(k)); if (S(f).ult.t === 60) drawAlienXUnder(ctx2d, f) }
    if (was && !S(f).ult && lockAtEnd == null) lockAtEnd = { cd: f.attackCooldown, x: f.x, y: f.y, tx: t.x, ty: t.y }
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) }
  }
  t.isBlocking = false
  return { ok, dealt: hp - t.health, home, thome, float, lockAtEnd, drawn, keys }
}
test('12. Absolute Decree: 60 Power; whiff / block = no cinematic (60f); clean = 40 + 3×35 + 170 = 315 (2026-11-23 buff); positions + lighting restore; Stance → Ben', () => {
  let f = ben(), t = foe(); f.energy = 50; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'rejected below 60 Power')
  f = ben(); t = foe(); let r = ult(f, t, { far: true }); assert(r.ok); assert.equal(r.dealt, 0); assert.equal(S(f).lastUltRaw, 0, 'whiff: no cinematic')
  f = ben(); t = foe(); r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, 0, 'blocked: no cinematic')
  f = ben(); t = foe(); A.clearAbilityState(); f.energy = 100; A.triggerUltimate(f, ctxOf(f, t)); assert.equal(f.energy, 40)
  assert.equal(f.attackCooldown, AX_ULT.OPENER_AT + AX_ULT.WHIFF, '60f whiff recovery'); clearProj()
  f = ben(); t = foe(); reset(f, t); S(f).voice = 'serena'; S(f).void.immune = 100; r = ult(f, t)
  assert.equal(S(f).lastUltRaw, AX_ULT.OPENER + 3 * AX_ULT.RING + AX_ULT.BANG); assert.equal(S(f).lastUltRaw, 315)
  assert.equal(S(f).ult, null); assert.equal(r.lockAtEnd.x, r.home.x, 'Alien X position restores'); assert.equal(r.lockAtEnd.y, r.home.y)
  assert.equal(r.lockAtEnd.tx, r.thome.x, 'opponent position restores'); assert.equal(r.float, AX_ULT.FLOAT, 'floats up during the cast')
  assert.equal(r.lockAtEnd.cd, AX_ULT.LOCKOUT, '140f lockout'); assert.equal(S(f).voice, 'ben', 'Stance resets to Ben')
  assert(r.drawn > 0, 'starfield drawn mid-cinematic (render-only)'); let after = 0; drawAlienXUnder({ save() {}, restore() {}, fillRect() { after++ } }, f); assert.equal(after, 0, 'lighting restored')
  assert.deepEqual([...r.keys].sort(), ['cast', 'face', 'home', 'phase', 'raw', 't', 'thome'], 'no rings / starfield in GAME_STATE')
  assert.equal(S(f).void.unmadeT, 0, 'Big Bang applies no Unmade'); console.log('   HP dealt', r.dealt)
})

// ── 13 swap / revert / KO / rematch ────────────────────────────────────────────────────────────────────────
test('13. swap / revert / KO / rematch clear stance, Void, Rewind buffer, Unmade, flight + glide', () => {
  const dirty = f => { const s = S(f); s.voice = 'serena'; s.voiceCd = 50; s.void.pips = 2; s.void.unmadeT = 100; s.hist.push([1, 2, 3, 1]); s.rewindCd = 300; f._benGlide = { vx: 1, vy: 1 } }
  const f = ben(); dirty(f); assert(f._alienFlightProfile === 'alienx')
  assert(F.applyAlien(f, 'goop')); assert.notEqual(f.omnitrix.formState?.kind, 'alienx', 'swap clears'); assert.equal(f._benGlide, undefined); assert.equal(f._alienFlightProfile, undefined)
  assert(F.applyAlien(f, 'alienx')); const s = S(f)
  assert.equal(s.voice, 'ben'); assert.equal(s.void.pips, 0); assert.equal(s.void.unmadeT, 0); assert.equal(s.hist.length, 0); assert.equal(s.rewindCd, 0)
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears'); assert.equal(f._alienFlightProfile, undefined)
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null, 'KO revert clears')
  const g = ben(); assert.equal(S(g).voice, 'ben', 'rematch: fresh state'); assert.equal(S(g).void.pips, 0)
})

// ── 14 PICK FIVE (the brief's slot-8 test; the owner kept 5 slots — Alien X is a pick, not a new slot) ────────
test('14. pick five: slot count from the registry (5), Alien X READY + pickable, no ready alien overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('alienx'); assert.equal(d.status, 'ready')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert(BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready').length > BEN10_SLOT_COUNT, 'more ready aliens than slots → players pick')
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT); assert(getAvailableAlienKeys(false).includes('alienx'))
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Alien X'); assert.equal(f.health, 2185, 'shared health (950 × the 2026-11-24 Ben HP buff 2.30)')
})
test('14. picked loadout: Alien X in the last dial slot and the transform reaches it', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'alienx']
  const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick)
  assert.deepEqual(f.omnitrix.aliens, pick); f.energy = 100; assert(F.ben10TransformOrSwap(f, BEN10_SLOT_COUNT - 1, { seed: 1, frame: 0, playerIndex: 0 }), 'last slot accepted')
  for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.activeAlien, 'alienx')
})
test('14. Vow pick includes Alien X (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'alienx'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('alienx') && picks.size === L.length, 'Vow reaches every slot incl. Alien X')
})
test('14. same-seed determinism: an identical scripted Alien X sequence yields identical GAME_STATE', () => {
  const run = () => {
    const f = ben(), t = foe(); melee(f, t, 'light'); special(f, t, null); reset(f, t); special(f, t, 'B', { frames: 60 }); tap(f, t); tick(f, t, 140)
    reset(f, t); dashTap(f, t); f._specialHeldDir = 'F'; ready(f); A.triggerSpecial(f, ctxOf(f, t)); world(f, t, 70); special(f, t, 'D', { frames: 10 }); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x, pin: t._benPinT })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast: Nullify, Gravity, Grasp hold, Starfall, ult cinematic', () => {
  const f = ben(), t = foe(); A.clearAbilityState(); f._specialHeldDir = null; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 10); assert(S(f).nullify); assert.doesNotThrow(() => JSON.stringify(f.omnitrix)); tick(f, t, 40); clearProj()
  ready(f); f._specialHeldDir = 'B'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 10); assert(S(f).gravity); JSON.stringify(S(f)); tick(f, t, 60); clearProj()
  const g = grasp(100); world(g.f, g.t, 25); assert.equal(S(g.f).grasp?.phase, 'hold'); assert.doesNotThrow(() => JSON.stringify(S(g.f))); clearProj()
  const h = ben(); h.onGround = h.grounded = false; h.y = 60; A.clearAbilityState(); h._specialHeldDir = null; A.triggerSpecial(h, ctxOf(h, t)); tick(h, t, 8); assert(S(h).star); JSON.stringify(S(h)); clearProj()
  const u = ben(), v = foe(); reset(u, v); A.clearAbilityState(); u.energy = 100; A.triggerUltimate(u, ctxOf(u, v))
  for (let i = 0; i < 60; i++) { tick(u, v); for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti(A.activeProjectiles, [v]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) } }
  assert(S(u).ult && S(u).ult.phase !== 'opener', 'mid-cinematic'); assert.doesNotThrow(() => JSON.stringify(S(u))); clearProj()
})
test('15. (2026-11-23) Celestial Judgment (↑+P, tracking pillar, launcher, +1 pip) + Supernova (air ↑/←+P, radial burst, cooldown)', () => {
  const f = ben(), t = foe(); reset(f, t); f.energy = 100
  const j = special(f, t, 'U', { frames: 60 })
  assert(j.ok, 'Judgment fires'); assert.equal(j.spent, X.AX_COST.judgment); assert.equal(j.hits, 1, 'one pillar'); const nl = special(ben(), foe(), null, { frames: 60 }); console.log('   judgment dealt', j.dealt, 'nullify', nl.dealt); assert(j.dealt > nl.dealt * 1.5, 'the pillar out-hits Nullify (85 vs 40 raw)'); assert.equal(S(f).void.pips, 1)
  const g = ben(), u = foe(); reset(g, u); g.energy = 100; g.onGround = g.grounded = false; g.y = 200
  const n = special(g, u, 'U', { frames: 40 })
  assert(n.ok, 'Supernova fires in the air'); assert.equal(n.spent, X.AX_COST.supernova); assert.equal(n.hits, 1); assert(n.dealt > 0)
  assert(S(g).novaCd > 0, 'cooldown running'); assert.equal(special(g, u, 'B', { frames: 2 }).ok, false, 'not again until the cooldown ends')
  assert.doesNotThrow(() => JSON.stringify(S(g)))
})
test('no Math.random / gameRng in alienx.js / alienxAssets.js', () => {
  for (const file of ['../alienx.js', '../alienxAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`ALIEN X: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
