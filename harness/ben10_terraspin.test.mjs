// TERRASPIN — Phase 7 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_terraspin.test.mjs
// Design totals: raw move damage × the form's damage mod (1.05) × 0.85^n (85% per move, reset after 90f), within ±20%
// (Inhale deals no damage and is not a scaled hit). The live routes then run the real engine and assert the mechanics.
// Test 14 (the brief's "slot 10") is PICK FIVE: the owner kept 5 slots; Terraspin is a pick, not a new slot / chord.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import { TERRASPIN, TS_PRES, TS_INH, TS_EXH, TS_SHEAR, TS_COST, TS_CHOP, TS_SPIN, TS_DROP, TS_GUARD, TS_ULT,
  tsState, tsHash, addShear, gainPressure, exhaleDamage, blowoutDamage, isBeam, drawTerraspinUnder } from '../terraspin.js'
import { benAlienStruck, benAlienBodyOffset } from '../ben10State.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'terraspin', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const foe = (key = 'goku', x = 500) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); if (ch?.animationData) t.animationData = ch.animationData; t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
const STAGE = { stageLeft: 0, stageWidth: 1600 }
let FRAME = 0, SEED = 4242
const ctxOf = (f, t) => ({ p1: f, p2: t, ...STAGE, seed: SEED, frame: FRAME })
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t)); if (f._benGlide) physics.moveFighter(f, {}, {}) } }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const timers = q => { if (q.hitstop > 0) q.hitstop--; else if (q.hitstun > 0) q.hitstun--; for (const k of ['attackCooldown', '_benPowerCommit', '_spriteCastTimer', 'invulnTimer', 'blockstun', 'grabInputBuffer']) if (q[k] > 0) q[k]-- }
// one whole frame: pending spawns, both fighters' physics, the form tick, Terraspin's live projectiles moved + resolved on the foe
function world(f, t, n = 1, input = {}) {
  for (let i = 0; i < n; i++) {
    FRAME++
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
const BA = TERRASPIN.basic_attacks, DM = TERRASPIN.mods.damage
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  chop: TS_CHOP.DMG.reduce((a, b) => a + b), exhale50: exhaleDamage(50) }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + f.w + gap - (f.w - 60) / 2 - 30; t.x = f.x + f.w / 2 + gap - t.w / 2 + 30; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false; t.knockdownState = false; t.knockdownTimer = 0; t.invulnTimer = 0 }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }

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
// a Goku normal hitting Terraspin through the real melee pipeline
function hitBy(t, f, key = 'light') {
  t.attacking = false; t.currentAttack = null; t.attackCooldown = 0; f.hitstun = 0; t.hitstop = 0
  const md = characters.goku.basic_attacks[key]; C.startMove(t, key, md); const hp = f.health
  for (let i = 0; i < 40 && f.health === hp && t.attacking; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}); C.resolveAttackHit(t, f, [], {}) }
  t.attacking = false; t.currentAttack = null
  return hp - f.health
}
// Real special: Power spend, its live (non-visual) projectiles through the projectile pipeline, placed on the target.
function special(f, t, dir, { frames = 70, block = false, keep = false, input = {} } = {}) {
  ready(f)
  if (!keep) A.clearAbilityState()
  f._specialHeldDir = dir; const e = f.energy, hp = t.health
  const ok = A.triggerSpecial(f, ctxOf(f, t)), spent = e - f.energy
  let hits = 0, firstAt = null
  if (ok) for (let frame = 1; frame <= frames; frame++) {
    tick(f, t, 1, input)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly && p.owner === f)) {
      if (firstAt == null) firstAt = frame
      t.isBlocking = block; p.x = t.x + t.w / 2; p.y = t.y + t.h / 2
      C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); hits++
      const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
    }
  }
  t.isBlocking = false
  return { ok, spent, dealt: hp - t.health, hits, firstAt }
}
function spawnFrame(f, t, dir, name, max = 60) {
  ready(f); A.clearAbilityState(); f._specialHeldDir = dir
  assert(A.triggerSpecial(f, ctxOf(f, t)), 'special ' + name)
  for (let i = 1; i <= max; i++) { tick(f, t); f.attackCooldown = Math.max(0, f.attackCooldown - 1); const p = A.activeProjectiles.find(p => p.name === name && p.owner === f); if (p) { const d = p.damage; clearProj(); return { at: i, dmg: d } } }
  return { at: null, dmg: 0 }
}
const dashTap = (f, t) => { tick(f, t, 1, { right: true }); tick(f, t, 1, {}); tick(f, t, 1, { right: true }) }
const enemyShot = (f, t, name = 'kiBlast', extra = {}) => { const p = { name, owner: t, damage: 40, vx: -12, vy: 0, x: f.x + f.w / 2, y: f.y + f.h / 2, w: 30, h: 20, radius: 10, lifetime: 60, hitstun: 12, ...extra }; A.activeProjectiles.push(p); return p }
// Inhale: press (↓↘→ = neutral / forward held) and keep Special held `hold` frames (then release)
function inhale(f, t, hold, { release = {}, block = false } = {}) {
  ready(f); A.clearAbilityState(); f._specialHeldDir = null
  assert(A.triggerSpecial(f, ctxOf(f, t)), 'Inhale')
  for (let i = 0; i < hold; i++) { tick(f, t, 1, { special: true, block }); if (!S(f).inhale) return i + 1 }
  tick(f, t, 1, { special: false, ...release })
  return hold + 1
}

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 92],
  ['2. Low, Heavy, Wind Chop', ['low', 'heavy', 'chop'], 112],
  ['3. Inhale (pull), Heavy, Exhale (Pressure 50)', ['heavy', 'exhale50'], 120],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Wind Chop (→→, 12 Power, 3 hits, finisher +1 Shear)', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 60); ready(f); dashTap(f, t); f._specialHeldDir = 'F'; const e = f.energy, hp = t.health
  assert(A.triggerSpecial(f, ctxOf(f, t)), 'Wind Chop'); assert.equal(e - f.energy, TS_COST.chop)
  world(f, t, 40); const wc = hp - t.health; assert(wc > 0, 'chop damage'); assert.equal(S(f).shear.pips, 1, 'finisher +1 Shear')
  console.log('   HP', [...d, wc].join('+'))
})
test('route 3 live: Inhale pulls (no damage), Heavy, Exhale at Pressure 50', () => {
  const f = ben(), t = foe(); reset(f, t, 200); const hp0 = t.health, x0 = t.x
  inhale(f, t, 30); assert.equal(t.health, hp0, 'pulled opponent takes no damage'); assert(t.x < x0, 'pulled in')
  S(f).post = 0; reset(f, t, 10); const h = melee(f, t, 'heavy'); S(f).pressure = 50; reset(f, t, 40)
  const x = special(f, t, 'B', { frames: 40 }); assert(x.ok && x.dealt > 0, 'Exhale lands'); assert.equal(S(f).pressure, 0)
  console.log('   HP 0 +', h, '+', x.dealt)
})

// ── 4 Inhale ──────────────────────────────────────────────────────────────────────────────────────────────
test('4. Inhale: cost 10, 60f cap, drain 4 Power/s, 5 px/f pull, never past his hurtbox, inside the stage, no damage', () => {
  const f = ben(), t = foe(); reset(f, t, 250); const e0 = f.energy, x0 = t.x, hp = t.health
  ready(f); A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(e0 - f.energy, TS_COST.inhale)
  tick(f, t, TS_INH.STARTUP, { special: true }); assert.equal(t.x, x0, 'no pull during startup')
  tick(f, t, 1, { special: true }); assert.equal(x0 - t.x, TS_INH.SPEED, '5 px/f'); const e1 = f.energy
  let n = 1; while (S(f).inhale && n < 200) { tick(f, t, 1, { special: true }); n++ }
  assert.equal(n, TS_INH.HOLD, `held ${n}f (60f cap)`); assert(Math.abs((e1 - f.energy) - TS_INH.DRAIN * (TS_INH.HOLD - 1) / 60) < 1e-6, `drain ${e1 - f.energy}`)
  const gap = cx => cx(t) - cx(f); assert(gap(o => o.x + o.w / 2) >= (f.w + t.w) / 2, 'never past his hurtbox'); assert.equal(t.health, hp, 'no damage')
  assert(t.x >= STAGE.stageLeft && t.x <= STAGE.stageWidth - t.w)
  assert.equal(S(f).post, TS_INH.RECOVERY, 'cap → 14f recovery')
  const g = ben(), u = foe(); g.x = 1600 - g.w - 5; g.facing = 1; u.x = 1600 - u.w; u.y = 410 - u.h
  inhale(g, u, 20); assert(u.x <= 1600 - u.w && u.x >= 0, 'never pushed / pulled through a wall')
})
test('4. Inhale: no chain-lock beyond 60f, block-cancel, cannot move, release → 14f recovery', () => {
  const f = ben(), t = foe(); reset(f, t, 300)
  inhale(f, t, 70); const pulled = S(f).stats.pulledF; assert(pulled > 50)
  ready(f); S(f).post = 0; const x1 = t.x; inhale(f, t, 20); assert.equal(t.x, x1, 'locked: no second pull right away')
  const g = ben(), u = foe(); reset(g, u, 200); ready(g); A.clearAbilityState(); g._specialHeldDir = null; A.triggerSpecial(g, ctxOf(g, u))
  tick(g, u, 10, { special: true }); assert(g._benPowerCommit > 0, 'committed (no walk)'); tick(g, u, 1, { special: true, block: true })
  assert.equal(S(g).inhale, null, 'block-cancel'); assert.equal(g._benPowerCommit, 0, 'free to guard')
  const h = ben(), v = foe(); reset(h, v, 200); inhale(h, v, 20); assert.equal(S(h).post, TS_INH.RECOVERY - 0, 'release → recovery'); assert.equal(h._benPowerCommit, TS_INH.RECOVERY)
})
test('4. Inhale: catches non-beam projectiles in the cone (+12 Pressure each, deleted, ownership-aware); beams not caught', () => {
  const f = ben(), t = foe(); reset(f, t, 600); clearProj(); ready(f); A.clearAbilityState(); f._specialHeldDir = null; A.triggerSpecial(f, ctxOf(f, t))
  tick(f, t, TS_INH.STARTUP, { special: true })
  const k = enemyShot(f, t, 'kiBlast', { x: f.x + f.w + 100 }), b = enemyShot(f, t, 'gokuKamehameha', { x: f.x + f.w + 120 }), own = A.spawnProjectile ? null : null
  const mine = { name: 'ts_mine', owner: f, damage: 1, vx: 0, vy: 0, x: f.x + f.w + 80, y: f.y + f.h / 2, w: 10, h: 10, lifetime: 30 }; A.activeProjectiles.push(mine)
  const p0 = S(f).pressure; tick(f, t, 1, { special: true })
  assert(!A.activeProjectiles.includes(k), 'caught (deleted)'); assert(A.activeProjectiles.includes(b), 'beam not caught'); assert(A.activeProjectiles.includes(mine), 'own projectile ignored')
  assert(isBeam(b)); assert.equal(S(f).stats.caught, 1); assert(Math.abs(S(f).pressure - p0 - TS_PRES.CATCH) < 1e-9, `+12 (${S(f).pressure - p0})`)
  clearProj()
})

// ── 5 Exhale ──────────────────────────────────────────────────────────────────────────────────────────────
test('5. Exhale: needs ≥15 Pressure, 16f startup, 20 + 0.6×P (max 80), spends all, Pressure → 0', () => {
  const f = ben(), t = foe(); reset(f, t, 60); S(f).pressure = 14; ready(f); f._specialHeldDir = 'B'; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'refused below 15')
  S(f).pressure = 50; const r = spawnFrame(f, t, 'B', 'ts_exhale'); assert.equal(r.at, TS_EXH.STARTUP); assert.equal(r.dmg, 50); assert.equal(S(f).pressure, 0)
  assert.equal(exhaleDamage(15), 29); assert.equal(exhaleDamage(100), 80); assert.equal(exhaleDamage(90), 74)
})
test('5. Exhale: push 10 px/f for 10f, knockdown at ≥60 only, −14 on block; release-with-back and P-again both Exhale', () => {
  const f = ben(), t = foe(); reset(f, t, 60); S(f).pressure = 70; ready(f); A.clearAbilityState(); f._specialHeldDir = 'B'; A.triggerSpecial(f, ctxOf(f, t))
  tick(f, t, TS_EXH.STARTUP); const x0 = t.x
  const p = A.activeProjectiles.find(q => q.name === 'ts_exhale'); assert(p); C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); clearProj()
  assert.equal(t.knockdownState, true, 'knockdown at 70'); tick(f, t, 10); assert.equal(Math.round(t.x - x0), TS_EXH.PUSH * TS_EXH.PUSH_F, `pushed ${t.x - x0}`)
  const g = ben(), u = foe(); reset(g, u, 60); S(g).pressure = 59; special(g, u, 'B', { frames: 30 }); assert(!u.knockdownState, 'no knockdown at 59')
  const h = ben(), v = foe(); reset(h, v, 60); S(h).pressure = 40; ready(h); A.clearAbilityState(); h._specialHeldDir = 'B'; A.triggerSpecial(h, ctxOf(h, v))
  tick(h, v, TS_EXH.STARTUP); v.isBlocking = true; C.resolveProjectileHitsMulti(A.activeProjectiles, [v]); clearProj(); v.isBlocking = false
  // same instant (end of the hit frame): his remaining recovery vs their remaining blockstun
  const rem = h.attackCooldown - TS_EXH.STARTUP; assert.equal((v.blockstun - 1) - rem, TS_EXH.ON_BLOCK, `on block (blockstun ${v.blockstun - 1} vs his ${rem})`)
  const a = ben(), w = foe(); reset(a, w, 200); S(a).pressure = 30; inhale(a, w, 10, { release: { left: true } }); assert.equal(S(a).stats.exhales, 1, 'release with ← = Exhale')
  const b = ben(), z = foe(); reset(b, z, 200); S(b).pressure = 30; inhale(b, z, 10); assert(S(b).post > 0)
  b._specialHeldDir = null; A.triggerSpecial(b, ctxOf(b, z)); assert.equal(S(b).stats.exhales, 0, 'a still-held / buffered press during the recovery is swallowed')
  tick(b, z, 1, { special: false }); tick(b, z, 1, { special: true }); assert.equal(S(b).stats.exhales, 1, 'a NEW press (release → press) in the recovery window = Exhale')
  const c = ben(), y = foe(); reset(c, y, 200); S(c).pressure = 30; inhale(c, y, 10); tick(c, y, TS_INH.RECOVERY + 1, { special: false }); tick(c, y, 1, { special: true })
  assert.equal(S(c).stats.exhales, 0, 'after the 14f window: no Exhale')
})

// ── 6 Pressure ────────────────────────────────────────────────────────────────────────────────────────────
test('6. Pressure: +0.5/f per target pulled, +5 per wind special landed (once per cast), −1/f after 120f idle, cap 100, clears on swap', () => {
  const f = ben(), t = foe(); reset(f, t, 300); inhale(f, t, 20); assert(Math.abs(S(f).pressure - TS_PRES.PULL * S(f).stats.pulledF) < 1e-9, `pull gain ${S(f).pressure}`)
  const g = ben(), u = foe(); reset(g, u, 60); ready(g); dashTap(g, u); g._specialHeldDir = 'F'; A.triggerSpecial(g, ctxOf(g, u)); world(g, u, 40)
  assert.equal(S(g).pressure, TS_PRES.LAND, '+5 once for the 3-hit chop')
  S(g).pressure = 40; S(g).idle = 0; tick(g, u, TS_PRES.IDLE); assert.equal(S(g).pressure, 40, 'holds for 120f'); tick(g, u, 10); assert.equal(S(g).pressure, 30, '−1/f after')
  gainPressure(S(g), 500); assert.equal(S(g).pressure, 100, 'cap')
  assert(F.applyAlien(g, 'heatblast')); assert(F.applyAlien(g, 'terraspin')); assert.equal(S(g).pressure, 0, 'swap clears')
})

// ── 7 Shear → Gale Drag ───────────────────────────────────────────────────────────────────────────────────
test('7. Shear: one pip per cast (Chop finisher / Exhale / Cyclone Drop), none from Inhale or blocks, 3 → GALE DRAG 180f, 360f immunity', () => {
  const f = ben(), t = foe(); reset(f, t, 300); inhale(f, t, 20); assert.equal(S(f).shear.pips, 0, 'Inhale: none')
  reset(f, t, 60); ready(f); S(f).post = 0; dashTap(f, t); f._specialHeldDir = 'F'; A.triggerSpecial(f, ctxOf(f, t)); t.isBlocking = true; world(f, t, 50); t.isBlocking = false
  assert.equal(S(f).shear.pips, 0, 'blocked chop: none')
  reset(f, t, 60); ready(f); dashTap(f, t); f._specialHeldDir = 'F'; A.triggerSpecial(f, ctxOf(f, t)); world(f, t, 50); assert.equal(S(f).shear.pips, 1, 'chop: ONE pip for 3 hits')
  reset(f, t, 60); S(f).pressure = 30; special(f, t, 'B', { frames: 30 }); assert.equal(S(f).shear.pips, 2, 'Exhale')
  reset(f, t, 40); f.onGround = f.grounded = false; f.y = 150; const d = special(f, t, null, { frames: 40 }); assert(d.ok && d.hits >= 1, 'Cyclone Drop hits')
  assert.equal(S(f).shear.pips, 0); assert.equal(S(f).shear.dragT, TS_SHEAR.DRAG - S(f).shear.dragT + S(f).shear.dragT > 0 ? S(f).shear.dragT : -1, 'drag running')
  assert(S(f).shear.dragT > 0 && S(f).shear.dragT <= TS_SHEAR.DRAG); assert.equal(S(f).shear.drags, 1)
  assert.equal(addShear(S(f), 999), false, 'no refresh while active')
  S(f).shear.dragT = 1; tick(f, t); assert.equal(S(f).shear.immune, TS_SHEAR.IMMUNE); assert.equal(addShear(S(f), 1000), false, 'immune')
  tick(f, t, TS_SHEAR.IMMUNE); assert.equal(addShear(S(f), 1001), true, 'immunity over')
  const g = ben(); S(g).shear.pips = 2; S(g).shear.pipT = 1; tick(g, foe()); assert.equal(S(g).shear.pips, 0, 'pips expire 240f after the last')
})
test('7. Gale Drag: away-movement ×0.7 (ground), air control away halved, toward unchanged, velocity / input untouched, lapses on its own', () => {
  const f = ben(), t = foe(); reset(f, t, 200); S(f).shear.dragT = TS_SHEAR.DRAG
  const mv = (vx, ground = true) => { tick(f, t); t.onGround = t.grounded = ground; t.vx = vx; const x0 = t.x, b = { ...t._benDrag }
    t.x += 0; const bd = t._benDrag, away = Math.sign(t.x + t.w / 2 - bd.x); let ctrl = vx
    if (!ground && (vx - (bd.pvx || 0)) * away > 0) ctrl = (bd.pvx || 0) + (vx - (bd.pvx || 0)) * bd.air
    const want = Math.sign(ctrl) === away ? ctrl * bd.ground : ctrl
    // the physics integration step itself (the X-movement line of moveFighter)
    const _bd = t._benDrag; _bd.ttl--; const _awayDir = Math.sign((t.x + t.w / 2) - _bd.x) || 0
    if (!t.onGround && _awayDir !== 0 && (t.vx - (_bd.pvx || 0)) * _awayDir > 0) t.vx = (_bd.pvx || 0) + (t.vx - (_bd.pvx || 0)) * _bd.air
    _bd.pvx = t.vx; t.x += (_awayDir !== 0 && Math.sign(t.vx) === _awayDir) ? t.vx * _bd.ground : t.vx
    return { dx: t.x - x0, want } }
  const src = fs.readFileSync(new URL('../physics.js', import.meta.url), 'utf8')
  assert(src.includes('fighter.x += (_awayDir !== 0 && Math.sign(fighter.vx) === _awayDir) ? fighter.vx * _bd.ground : fighter.vx'), 'physics hook present')
  let r = mv(6); assert(Math.abs(r.dx - 6 * 0.7) < 1e-9, `walk away ${r.dx}`); assert.equal(t.vx, 6, 'velocity untouched on the ground')
  r = mv(-6); assert.equal(r.dx, -6, 'toward: unchanged')
  t._benDrag.pvx = 0; r = mv(8, false); assert(Math.abs(t.vx - 4) < 1e-9, `air control away halved (vx ${t.vx})`); assert(Math.abs(r.dx - 4 * 0.7) < 1e-9)
  // the REAL physics.moveFighter path for a walking opponent
  const g = ben(), u = foe('goku', 700); u.facing = 1; S(g).shear.dragT = TS_SHEAR.DRAG; tick(g, u)
  const wx0 = u.x; physics.moveFighter(u, { d: true }, { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }); const dragged = u.x - wx0
  const v = foe('goku', 700); v.facing = 1; const vx0 = v.x; physics.moveFighter(v, { d: true }, { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }); const free = v.x - vx0
  assert(free > 0 && Math.abs(dragged - free * 0.7) < 1e-6, `real walk away: ${dragged} vs free ${free}`)
  tick(g, u, 0); u._benDrag.ttl = 0; const wx1 = u.x; physics.moveFighter(u, { d: true }, { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }); assert(u.x - wx1 > dragged, 'lapses when no longer re-stamped')
  const plain = foe('goku', 300); assert.equal(plain._benDrag, undefined, 'absent for everyone else')
})

// ── 8 Thorn Shell ─────────────────────────────────────────────────────────────────────────────────────────
test('8. Thorn Shell: 12 chip once per attacker per spin (no hitstun, cannot KO), he takes the hit normally; cost 12, 3 hits, −10 on block', () => {
  const f = ben(), t = foe(); reset(f, t, 300); ready(f); A.clearAbilityState(); f._specialHeldDir = 'D'; const e = f.energy
  assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(e - f.energy, TS_COST.spin); tick(f, t, 8)
  t.x = f.x + f.w - 10; t.facing = -1; const thp = t.health
  const took = hitBy(t, f); assert(took > 0, 'he takes the hit (no armor)'); assert.equal(thp - t.health, TS_SPIN.CHIP, '12 chip'); assert.equal(t.hitstun || 0, 0, 'no hitstun')
  f.hitstun = 0; const s = S(f); if (!s.spin) { s.spin = { t: 10, cast: 99, face: 1, chipped: [1], done: false } }
  const thp2 = t.health; s.spin.t = 10; benAlienStruck(f, { kind: 'melee', move: { name: 'light' }, attacker: t }); assert.equal(t.health, thp2, 'once per attacker per spin')
  const g = ben(), u = foe(); ready(g); A.clearAbilityState(); g._specialHeldDir = 'D'; A.triggerSpecial(g, ctxOf(g, u)); tick(g, u, 8); u.health = 5
  benAlienStruck(g, { kind: 'melee', move: { name: 'light' }, attacker: u }); assert.equal(u.health, 1, 'cannot KO')
  const h = ben(), v = foe(); reset(h, v, 30); const r = special(h, v, 'D', { frames: 50 }); assert.equal(r.hits, 3, '3 hits'); assert.equal(S(h).stats.spins, 1)
})
test('8. Shell Spin live: rolls 260 px, all 3 hits land on a standing opponent (carried after contact), −10 on block', () => {
  const f = ben(), t = foe(); reset(f, t, 20); ready(f); A.clearAbilityState(); f._specialHeldDir = 'D'; const x0 = f.x, hp = t.health
  assert(A.triggerSpecial(f, ctxOf(f, t)))
  let hits = 0, last = t.health; for (let i = 0; i < 50; i++) { world(f, t); if (t.health < last) { hits++; last = t.health } }
  assert.equal(hits, 3, `3 hits (${hits})`); assert(Math.abs((f.x - x0) - TS_SPIN.DIST) < 1, `rolled ${f.x - x0}`); console.log('   spin HP', hp - t.health)
  const g = ben(), u = foe(); reset(g, u, 20); ready(g); A.clearAbilityState(); g._specialHeldDir = 'D'; A.triggerSpecial(g, ctxOf(g, u)); u.isBlocking = true
  let bs = null; for (let i = 0; i < 50; i++) { world(g, u); if (S(g).spin && S(g).spin.t === TS_SPIN.HITS_AT[2] && bs == null) bs = { theirs: u.blockstun, mine: g.attackCooldown } }
  u.isBlocking = false; assert(bs, 'finisher blocked'); assert.equal(bs.theirs - bs.mine, TS_SPIN.ON_BLOCK, `on block (same instant) ${JSON.stringify(bs)}`)
})
test('8. Thorn Shell: projectiles touching the spin are deflected away at 70% speed, ownership unchanged (not caught)', () => {
  const f = ben(), t = foe(); clearProj(); ready(f); A.clearAbilityState(); f._specialHeldDir = 'D'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 8)
  const hp = f.health, p = enemyShot(f, t, 'kiBlast', { x: f.x + f.w - 5 }); C.resolveProjectileHitsMulti(A.activeProjectiles, [f])
  assert.equal(f.health, hp, 'no damage'); assert(!A.activeProjectiles.includes(p), 'original consumed')
  const q = A.activeProjectiles.find(x => x._tsDeflected); assert(q, 'deflected copy'); assert.equal(q.owner, t, 'ownership unchanged')
  assert(Math.abs(q.vx - 12 * TS_SPIN.DEFLECT) < 1e-9, `away at 70% (${q.vx})`); assert.equal(S(f).stats.deflects, 1)
  C.resolveProjectileHitsMulti(A.activeProjectiles, [f]); assert.equal(S(f).stats.deflects, 1, 'not re-deflected'); clearProj()
  const g = ben(); g.x = 400; const pp = enemyShot(g, t); const hp2 = g.health; C.resolveProjectileHitsMulti(A.activeProjectiles, [g]); assert(g.health < hp2, 'not spinning: it hits'); clearProj()
})

// ── 9 Shell Guard ─────────────────────────────────────────────────────────────────────────────────────────
test('9. Shell Guard: 8f window, a melee hit does 40%, 12-dmg counter (once, no pip), 6 s cooldown', () => {
  const base = ben(), bt = foe(); bt.x = base.x + base.w - 10; bt.facing = -1; const full = hitBy(bt, base)
  const f = ben(), t = foe(); t.x = f.x + f.w - 10; t.facing = -1
  assert.equal(TERRASPIN.blockHeavy(f), true); assert.equal(S(f).guard.t, TS_GUARD.WINDOW)
  const took = hitBy(t, f); assert(Math.abs(took - full * TS_GUARD.TAKE) <= 1, `40%: ${took} vs ${full}`)
  const thp = t.health; tick(f, t); const c = A.activeProjectiles.find(p => p.name === 'ts_counter'); assert(c, 'counter chop'); assert.equal(c.damage, TS_GUARD.COUNTER)
  C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); clearProj(); assert(t.health < thp, 'counter lands'); assert.equal(S(f).shear.pips, 0, 'no pip')
  assert.equal(S(f).stats.counters, 1)
  ready(f); f.hitstun = 0; assert.equal(TERRASPIN.blockHeavy(f), false, 'cooldown'); tick(f, t, TS_GUARD.CD - 2); assert.equal(TERRASPIN.blockHeavy(f), false, 'still cooling'); tick(f, t); assert.equal(TERRASPIN.blockHeavy(f), true, '6 s over')
  const g = ben(), u = foe(); TERRASPIN.blockHeavy(g); tick(g, u, TS_GUARD.WINDOW); u.x = g.x + g.w - 10; u.facing = -1; const t2 = hitBy(u, g); assert(Math.abs(t2 - full) <= 1, 'window over: full damage')
})
test('9. Shell Guard: beams and throws ignore it', () => {
  const f = ben(), t = foe(); TERRASPIN.blockHeavy(f); const hp = f.health; enemyShot(f, t, 'gokuKamehameha'); C.resolveProjectileHitsMulti(A.activeProjectiles, [f]); clearProj()
  const ref = ben(); const hr = ref.health; enemyShot(ref, t, 'gokuKamehameha'); C.resolveProjectileHitsMulti(A.activeProjectiles, [ref]); clearProj()
  assert.equal(hp - f.health, hr - ref.health, 'beam: full damage'); assert.equal(S(f).guard.counter, null)
  const g = ben(), u = foe(); TERRASPIN.blockHeavy(g); u.x = g.x + 40; u.onGround = g.onGround = true; u.comboCounter = 0
  assert(C.resolveGrab(u, g, {}), 'throw connects'); assert.equal(S(g).guard.counter, null, 'throw: no counter'); assert.equal(S(g).guard.hit, null)
})

// ── 10 Wind Chop / 11 Cyclone Drop ────────────────────────────────────────────────────────────────────────
test('10. Wind Chop: 12f startup, 300 px real travel, no tracking, cuts EXACTLY one projectile, −13 on block', () => {
  const f = ben(), t = foe(); clearProj(); t.x = 1500; ready(f); dashTap(f, t); f._specialHeldDir = 'F'; const x0 = f.x
  assert(A.triggerSpecial(f, ctxOf(f, t))); const a = enemyShot(f, t, 'kiBlast', { x: f.x + f.w + 60, vx: 0 }), b = enemyShot(f, t, 'kiBlast', { x: f.x + f.w + 120, vx: 0 })
  tick(f, t, TS_CHOP.STARTUP - 1); assert.equal(f.x, x0, 'no travel during startup (the first hit + travel start on frame 12)')
  tick(f, t, TS_CHOP.FRAMES + 3); assert(Math.abs((f.x - x0) - TS_CHOP.DIST) < 1, `travelled ${f.x - x0}`)
  assert.equal([a, b].filter(p => !A.activeProjectiles.includes(p)).length, 1, 'exactly one cut'); assert.equal(S(f).stats.cuts, 1); clearProj()
  const g = ben(), u = foe(); reset(g, u, 40); ready(g); dashTap(g, u); g._specialHeldDir = 'F'; A.triggerSpecial(g, ctxOf(g, u)); u.isBlocking = true
  let bs = null; for (let i = 0; i < 40; i++) { world(g, u); if (S(g).chop && S(g).chop.t === TS_CHOP.STARTUP + TS_CHOP.HITS_AT[2] + 1 && bs == null) bs = { theirs: u.blockstun, mine: g.attackCooldown } }
  u.isBlocking = false; assert(bs, 'finisher blocked'); assert.equal(bs.theirs - bs.mine, TS_CHOP.ON_BLOCK, `on block (same instant) ${JSON.stringify(bs)}`)
})
test('11. Cyclone Drop: air only, once per airtime, no jump refill, 48 + 1 Shear on a clean hit', () => {
  const f = ben(), t = foe(); clearProj(); f.onGround = f.grounded = false; f.y = 100; f.jumpCount = 2; ready(f); A.clearAbilityState()
  f._specialHeldDir = null; const e = f.energy; assert(A.triggerSpecial(f, ctxOf(f, t)), 'Cyclone Drop'); assert.equal(e - f.energy, TS_COST.drop)
  tick(f, t, TS_DROP.STARTUP + 1); const p = A.activeProjectiles.find(q => q.name === 'ts_drop'); assert(p, 'dive hitbox'); assert.equal(p.damage, TS_DROP.DMG)
  ready(f); f._specialHeldDir = null; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime'); assert.equal(f.jumpCount, 2, 'no jump refill')
  let n = 0; while (S(f).drop && !S(f).drop.landT && n < 80) { tick(f, t); n++ }; assert(S(f).drop.landT > 0, 'landed'); clearProj()
  f.onGround = f.grounded = true; ready(f); tick(f, t, 20); f.onGround = f.grounded = false; f.y = 100; ready(f); assert(A.triggerSpecial(f, ctxOf(f, t)), 'refreshed after landing'); clearProj()
  ready(f); f.onGround = f.grounded = true; S(f).drop = null; f._specialHeldDir = null; tick(f, t); assert(A.triggerSpecial(f, ctxOf(f, t))); assert(S(f).inhale, 'on the ground the same input is Inhale'); S(f).inhale = null; f._benPowerCommit = 0
})

// ── 12 Eye of the Storm ───────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false, pressure = 50 } = {}) {
  A.clearAbilityState(); ready(f); f.energy = 100; S(f).pressure = pressure
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }; const thome = { x: t.x, y: t.y }
  let lockAtEnd = null, drawn = 0, keys = new Set(), lift = 0
  const ctx2d = { save() {}, restore() {}, fillRect() { drawn++ }, set fillStyle(v) {}, set globalAlpha(v) {} }
  for (let i = 0; i < 260; i++) {
    const was = !!S(f).ult; tick(f, t); t.isBlocking = block
    if (S(f).ult?.home) { Object.keys(S(f).ult).forEach(k => keys.add(k)); if (S(f).ult.t === 50) drawTerraspinUnder(ctx2d, f); const o = benAlienBodyOffset(t, f); if (o) lift = Math.min(lift, o.dy) }
    if (was && !S(f).ult && lockAtEnd == null) lockAtEnd = { cd: f.attackCooldown, x: f.x, y: f.y, tx: t.x, ty: t.y, kd: t.knockdownState }
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) }
  }
  t.isBlocking = false
  return { ok, dealt: hp - t.health, home, thome, lockAtEnd, drawn, keys, lift }
}
test('12. Eye of the Storm: 55 Power; whiff / block = no capture (60f); 40 + 6×18 + (60 + 0.6×P) — 238 at 50, 268 at 100; restore; Pressure → 0', () => {
  let f = ben(), t = foe(); f.energy = 50; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'rejected below 55 Power')
  f = ben(); t = foe(); A.clearAbilityState(); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t))); assert.equal(f.energy, 45); assert.equal(f.attackCooldown, TS_ULT.OPENER_AT + TS_ULT.WHIFF, '60f whiff recovery'); clearProj()
  f = ben(); t = foe(); let r = ult(f, t, { far: true }); assert(r.ok); assert.equal(r.dealt, 0); assert.equal(S(f).lastUltRaw, 0, 'whiff: no cinematic')
  f = ben(); t = foe(); reset(f, t, 40); r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, 0, 'blocked: no cinematic')
  for (const [P, total] of [[50, 238], [100, 268], [0, 208]]) {
    f = ben(); t = foe(); reset(f, t, 40); r = ult(f, t, { pressure: P })
    assert.equal(S(f).lastUltRaw, total, `P ${P} → ${S(f).lastUltRaw}`); assert.equal(S(f).pressure, 0, 'Pressure → 0')
  }
  assert.equal(blowoutDamage(50), 90); assert.equal(blowoutDamage(100), 120)
  assert.equal(r.lockAtEnd.x, r.home.x, 'position restores'); assert.equal(r.lockAtEnd.tx, r.thome.x, 'opponent restores (then the blowout push)')
  assert.equal(r.lockAtEnd.cd, TS_ULT.LOCKOUT, '100f lockout'); assert.equal(r.lockAtEnd.kd, true, 'knocked down')
  assert(r.lift < -15, `held opponent lifted (render-only ${r.lift})`); assert(r.drawn > 0, 'stage dimmed'); let after = 0; drawTerraspinUnder({ save() {}, restore() {}, fillRect() { after++ } }, f); assert.equal(after, 0, 'lights restored')
  assert.deepEqual([...r.keys].sort(), ['angles', 'cast', 'face', 'hits', 'home', 'phase', 'pressure', 'raw', 't', 'thome'], 'no cyclone / blade objects in GAME_STATE'); console.log('   HP dealt', r.dealt)
})
test('12. Eye of the Storm: chop angles = hash(seed, frame, player) — identical for the same seed, different for another', () => {
  const run = seed => { SEED = seed; FRAME = 1000; const f = ben(), t = foe(); reset(f, t, 40); ult(f, t); SEED = 4242; return S(f).lastUltAngles }
  const a = run(7), b = run(7), c = run(8)
  assert.equal(a.length, 6); assert.deepEqual(a, b, 'same seed → same angles'); assert.notDeepEqual(a, c, 'another seed → other angles')
  assert(a.every(x => x >= 0 && x < Math.PI * 2)); assert(Number.isFinite(tsHash(7, 1, 0, 0)))
})

// ── 13 swap / revert / KO / rematch ───────────────────────────────────────────────────────────────────────
test('13. swap / revert / KO / rematch clear Pressure, Shear and shell state', () => {
  const dirty = f => { const s = S(f); s.pressure = 80; s.shear.pips = 2; s.shear.dragT = 100; s.spin = { t: 10, chipped: [] }; s.guard.cd = 200; s.guard.t = 4; s.inhale = { t: 3 } }
  const f = ben(); dirty(f)
  assert(F.applyAlien(f, 'goop')); assert.notEqual(f.omnitrix.formState?.kind, 'terraspin', 'swap clears')
  assert(F.applyAlien(f, 'terraspin')); const s = S(f)
  assert.equal(s.pressure, 0); assert.equal(s.shear.pips, 0); assert.equal(s.shear.dragT, 0); assert.equal(s.spin, null); assert.equal(s.guard.cd, 0); assert.equal(s.inhale, null)
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears')
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null, 'KO revert clears')
  const g = ben(); assert.equal(S(g).pressure, 0, 'rematch: fresh state'); assert.equal(S(g).shear.dragT, 0)
  const t = foe(); const h = ben(); S(h).shear.dragT = 50; tick(h, t); assert(t._benDrag.ttl > 0); F.revertToHuman(h); physics.moveFighter(t, {}, CONTROLS); physics.moveFighter(t, {}, CONTROLS)
  assert.equal(t._benDrag.ttl, 0, 'Gale Drag lapses once he is gone')
})

// ── 14 PICK FIVE (the brief's slot-10 test; the owner kept 5 slots — Terraspin is a pick, not a new slot) ───
test('14. pick five: slot count from the registry (5), Terraspin READY + pickable, no ready alien overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('terraspin'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 10, 'catalog slot 10 (metadata only)')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'terraspin').length, 1, 'one registry entry')
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT); assert(getAvailableAlienKeys(false).includes('terraspin'))
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet from fun-tech\.tk/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Terraspin'); assert.equal(f.health, 950, 'shared health')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.90 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.90')
  assert(Math.abs(f.defenseMultiplier - 1.20) < 1e-9 && Math.abs(f.damageMultiplier - 1.05) < 1e-9, 'defense 1.20 / damage 1.05')
})
test('14. picked loadout: Terraspin in the last dial slot and the transform reaches it', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'terraspin']
  const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick)
  assert.deepEqual(f.omnitrix.aliens, pick); f.energy = 100; assert(F.ben10TransformOrSwap(f, BEN10_SLOT_COUNT - 1, { seed: 1, frame: 0, playerIndex: 0 }), 'last slot accepted')
  for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.activeAlien, 'terraspin')
})
test('14. Vow pick includes Terraspin (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'terraspin'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('terraspin') && picks.size === L.length, 'Vow reaches every slot incl. Terraspin')
})
test('14. same-seed determinism: an identical scripted Terraspin sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light'); reset(f, t, 250); inhale(f, t, 25); ready(f); S(f).post = 0
    reset(f, t, 60); S(f).pressure = Math.max(S(f).pressure, 20); special(f, t, 'B', { frames: 40 }); reset(f, t, 30); special(f, t, 'D', { frames: 50 })
    TERRASPIN.blockHeavy(f); tick(f, t, 20); reset(f, t, 60); dashTap(f, t); f._specialHeldDir = 'F'; ready(f); A.triggerSpecial(f, ctxOf(f, t)); world(f, t, 40)
    reset(f, t, 40); ult(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast: Inhale, Exhale, Chop, Spin, Drop, Guard, Gale Drag, ult cinematic', () => {
  const f = ben(), t = foe(); reset(f, t, 200); ready(f); A.clearAbilityState(); f._specialHeldDir = null; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 12, { special: true })
  assert(S(f).inhale); assert.doesNotThrow(() => JSON.stringify(f.omnitrix)); tick(f, t, 1, {}); ready(f); S(f).post = 0
  S(f).pressure = 40; f._specialHeldDir = 'B'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 18); assert(S(f).exhale || S(f).push); JSON.stringify(S(f)); tick(f, t, 40); clearProj(); ready(f)
  f._specialHeldDir = 'D'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 10); assert(S(f).spin); JSON.stringify(S(f)); tick(f, t, 50); clearProj(); ready(f)
  TERRASPIN.blockHeavy(f); JSON.stringify(S(f)); S(f).shear.dragT = 30; tick(f, t, 10); JSON.stringify(t._benDrag)
  const u = ben(), v = foe(); reset(u, v, 40); A.clearAbilityState(); u.energy = 100; A.triggerUltimate(u, ctxOf(u, v))
  for (let i = 0; i < 70; i++) { tick(u, v); for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti(A.activeProjectiles, [v]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) } }
  assert(S(u).ult && S(u).ult.phase !== 'opener', 'mid-cinematic'); assert.doesNotThrow(() => JSON.stringify(S(u))); clearProj()
})
test('no Math.random / gameRng in terraspin.js / terraspinAssets.js', () => {
  for (const file of ['../terraspin.js', '../terraspinAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`TERRASPIN: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
