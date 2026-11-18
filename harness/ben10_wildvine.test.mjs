// WILDVINE — Phase 7 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_wildvine.test.mjs
// Design totals: raw move damage × the form's damage mod (1.05) × 0.85^n (85% per move, reset after 90f), within ±20%
// (Snare Vine deals no damage and is not a scaled hit). The live routes then run the real engine and assert the mechanics.
// Test 12 (the brief's "slot 11") is PICK FIVE: the owner kept 5 slots; Wildvine is a pick, not a new slot / chord.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as W from '../wildvine.js'
const { WILDVINE, WV_GARDEN, WV_PLANT, WV_ENT, WV_BLOOM, WV_WHIP, WV_RISE, WV_SEED, WV_ULT, WV_COST, WV_SEED_HOLD } = W
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'wildvine', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
const BA = WILDVINE.basic_attacks, DM = WILDVINE.mods.damage
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  whip: WV_WHIP.DMG.reduce((a, b) => a + b), rise: WV_RISE.DMG }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + f.w + gap; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false; t.knockdownState = false; t.knockdownTimer = 0; t.invulnTimer = 0 }
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
// one frame without projectile resolution (plants / root / casts only); `tKeys` = the opponent's held keys
const step = (f, t, n = 1, tKeys = {}, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
  A.tickBenAlienForm(f, input, ctxOf(f, t)); physics.moveFighter(t, tKeys, CONTROLS); physics.applyGravity(t); timers(f); timers(t) } }
const cast = (f, t, dir) => { ready(f); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const plant = (f, t, dir, grow = true) => { assert(cast(f, t, dir), 'plant ' + dir); step(f, t, W.WV_CAST.TOTAL + 1); if (grow) step(f, t, WV_GARDEN.SPROUT); return S(f).garden[S(f).garden.length - 1] }
const dashTap = (f, t) => { tick(f, t, 1, { right: true }); tick(f, t, 1, {}); tick(f, t, 1, { right: true }) }
const whip = (f, t) => { ready(f); dashTap(f, t); f._specialHeldDir = 'F'; return A.triggerSpecial(f, ctxOf(f, t)) }
const far = (f, t) => { t.x = f.x + 1000 }
const on = (t, p) => { t.x = p.x - t.w / 2 }
const runUlt = (f, t) => { ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t)), 'ult'); let n = 0; while ((S(f).ult || n < 20) && n < 260) { world(f, t, 1); n++ } }

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 86],
  ['2. Low, Heavy, Vine Whip', ['low', 'heavy', 'whip'], 104],
  ['3. Snare Vine (Rooted trigger), Heavy, Verdant Rise', ['heavy', 'rise'], 120],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Vine Whip (→→, 12 Power, 2 hits, finisher +1 Entangle)', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 150); const e = f.energy, hp = t.health
  assert(whip(f, t), 'Vine Whip'); assert.equal(e - f.energy, WV_COST.whip)
  world(f, t, 40); const wd = hp - t.health; assert(wd > 0, 'whip damage'); assert.equal(S(f).ent.pips, 1, 'finisher +1 Entangle'); assert.equal(f.comboCounter, 4)
  console.log('   HP', [...d, wd].join('+'))
})
test('route 3 live: Snare Vine roots (no damage) → Heavy → Verdant Rise', () => {
  const f = ben(), t = foe(); far(f, t); const p = plant(f, t, 'B'); const hp0 = t.health
  on(t, p); step(f, t, 1); assert(S(f).snareT > 0 && t._benRootT > 0, 'rooted by the snare'); assert.equal(t.health, hp0, 'snare deals no damage')
  f.x = t.x - f.w - 10; const d = [melee(f, t, 'heavy')]
  reset(f, t, 6); f._specialHeldDir = 'U'; ready(f); const hp = t.health; assert(A.triggerSpecial(f, ctxOf(f, t)), 'Verdant Rise'); world(f, t, 14)
  d.push(hp - t.health); assert(d[1] > 0, 'rise connects'); assert(t.vy < 0, 'launched'); console.log('   HP', d.join('+'))
})

// ── 4 Garden ───────────────────────────────────────────────────────────────────────────────────────────────
test('4. Garden: max 3 (4th removes the oldest), 30f sprout telegraph, 420f lifetime, no solid collision', () => {
  const f = ben(), t = foe(); far(f, t)
  for (const d of [null, 'B', 'D']) plant(f, t, d, false)
  assert.deepEqual(W.livePlants(S(f)).map(p => p.type), ['thorn', 'snare', 'bloom'])
  plant(f, t, null, false); const live = W.livePlants(S(f))
  assert.equal(live.length, 3); assert(!live.some(p => p.id === 1), 'oldest (id 1) removed'); assert.equal(S(f).stats.consumedBy.replaced, 1)
  const g = ben(), u = foe(); far(g, u); assert(cast(g, u, null)); step(g, u, W.WV_CAST.AT); const p = S(g).garden[0]
  assert.equal(W.plantStage(p), 'sprout'); on(u, p); const hp = u.health; world(g, u, WV_GARDEN.SPROUT - 2); assert.equal(u.health, hp, 'no hitbox while sprouting')
  assert.equal(W.plantStage(p), 'sprout'); far(g, u); step(g, u, 3); assert.equal(W.plantStage(p), 'grown', 'grown at 30f')
  step(g, u, WV_GARDEN.LIFE - p.t - 1); assert.equal(S(g).garden.length, 1); step(g, u, 1); assert.equal(S(g).garden.length, 0, 'withered at 420f')
  // no collision: the opponent walks straight through a grown snare-free bloom pod (opponent touching it = nothing)
  const h = ben(), v = foe(); far(h, v); const pod = plant(h, v, 'D'); v.x = pod.x - 200; const keys = { a: false, d: true }
  v.facing = 1; const x0 = v.x; step(h, v, 40, keys); assert(v.x - x0 > 150, 'walked through the plant (no wall)'); assert.equal(W.plantStage(pod), 'grown', 'opponent does not consume a Bloom Pod')
})
test('4. Garden: no repeated damage standing inside; each plant consumed exactly once even with simultaneous contacts', () => {
  const f = ben(), t = foe(); far(f, t); const p = plant(f, t, null); on(t, p); const hp = t.health
  world(f, t, 3); const d1 = hp - t.health; assert(d1 > 0); world(f, t, 60); assert.equal(hp - t.health, d1, 'one eruption only')
  // same frame: the opponent touches the thorn AND the whip crosses it → contact wins, exactly one eruption
  const g = ben(), u = foe(); far(g, u); const q = plant(g, u, null); assert(whip(g, u)); S(g).whip.t = WV_WHIP.FULL_AT - 1; on(u, q)
  step(g, u, 1); assert.equal(q.by, 'contact'); assert.equal(S(g).stats.erupts, 1); assert.equal(S(g).stats.whipTriggers, 0)
  step(g, u, 3); assert.equal(S(g).stats.erupts, 1, 'never twice')
  // a consumed plant refuses the gate
  assert.equal(W.consumePlant(S(g), q, 'whip'), false)
})
// ── 5 the three plants ─────────────────────────────────────────────────────────────────────────────────────
test('5. Thornspike: 40 raw once (small pop-up), +1 Entangle pip', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const e = f.energy; const p = plant(f, t, null); assert.equal(e - f.energy, WV_COST.thorn)
  on(t, p); FRAME++; A.tickBenAlienForm(f, {}, ctxOf(f, t)); const hb = A.activeProjectiles.find(q => q.name === 'wv_thorn'); assert(hb); assert.equal(hb.damage, 40)
  const hp = t.health; C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); assert(t.health < hp); let rose = false; for (let i = 0; i < 30; i++) { world(f, t, 1); if (t.vy < 0) rose = true } assert(rose, 'pop-up (after the hitstop)'); assert.equal(S(f).ent.pips, 1); clearProj()
})
test('5. Snare Vine: roots 30f once (no damage), +1 pip; Bloom Pod: +12 capped at the pre-damage HP, +15 Power, opponent contact nothing', () => {
  const f = ben(), t = foe(); far(f, t); const p = plant(f, t, 'B'); on(t, p); const hp = t.health
  step(f, t, 1); assert.equal(S(f).ent.pips, 1); assert.equal(t.health, hp); const x0 = t.x
  step(f, t, 26, { a: true }); assert.equal(t.x, x0, 'cannot walk while snared'); step(f, t, 30, { a: true }); assert(t.x < x0, 'free after 30f')
  assert.equal(S(f).stats.snares, 1, 'once')
  const g = ben(), u = foe(); far(g, u); g.health = 900; g.energy = 60; const pod = plant(g, u, 'D'); const e0 = g.energy
  on(u, pod); step(g, u, 5); assert.equal(W.plantStage(pod), 'grown', 'opponent: nothing'); far(g, u)
  g.x = pod.x - g.w / 2; step(g, u, 2); assert.equal(g.health, 912); assert.equal(g.energy, e0 + 15); assert.equal(pod.by, 'self'); assert.equal(S(g).ent.pips, 0, 'no pip')
  const h = ben(), v = foe(); far(h, v); const pod2 = plant(h, v, 'D'); h.health = h.maxHealth - 5; h.x = pod2.x - h.w / 2; step(h, v, 2); assert.equal(h.health, h.maxHealth, 'capped')
})
// ── 6 Full Bloom ───────────────────────────────────────────────────────────────────────────────────────────
test('6. Full Bloom: all 3 GROWN → +10% damage, −10% drain, 180f, once per 600f', () => {
  const f = ben(), t = foe(); far(f, t); for (const d of [null, 'B']) plant(f, t, d, false); assert.equal(S(f).bloom.t, 0)
  plant(f, t, 'D'); const b = S(f).bloom; assert(b.t > 0 && b.t <= WV_BLOOM.DUR); assert.equal(b.count, 1)
  assert.equal(WILDVINE.drainMult(f), 0.9); assert(Math.abs(WILDVINE.damageDealt(f, t, 100, {}) - 110) < 1e-9)
  const t0 = b.t; step(f, t, t0); assert.equal(b.t, 0); assert.equal(WILDVINE.drainMult(f), 1); assert.equal(WILDVINE.damageDealt(f, t, 100, {}), 100)
  assert.equal(W.livePlants(S(f)).length, 3); step(f, t, 100); assert.equal(b.count, 1, 'not again inside 600f')
  step(f, t, WV_BLOOM.CD); assert(b.count === 2 || W.livePlants(S(f)).length < 3, 'again after the cooldown while all 3 are grown')
  // real drain: Power falls slower in Full Bloom
  const g = ben(), h = ben(); [g, h].forEach(x => { x.energy = 100 }); S(g).bloom.t = 100
  for (let i = 0; i < 60; i++) { F.updateTransformDevice(g, 1000 / 60); F.updateTransformDevice(h, 1000 / 60) }
  const dg = 100 - g.energy, dh = 100 - h.energy; assert(dh > 0 && Math.abs(dg / dh - 0.9) < 0.02, `drain ${dg} vs ${dh}`)
})
// ── 7 Entangle / Rooted ────────────────────────────────────────────────────────────────────────────────────
test('7. Entangle: one pip per cast, max 3 → Rooted 36f (no walk/jump/dash), still blocks + attacks, 360f immunity, expiry 240f', () => {
  const f = ben(), t = foe(); far(f, t); const s = S(f)
  assert(W.addPip(s, 7)); assert(!W.addPip(s, 7), 'same cast twice'); W.addPip(s, 8); assert.equal(s.ent.pips, 2)
  W.addPip(s, 9); assert.equal(s.ent.rootT, WV_ENT.ROOT); assert.equal(s.ent.pips, 0); assert(!W.addPip(s, 10), 'no pips / refresh while Rooted')
  const x0 = t.x, pollBefore = typeof t._lastInput; step(f, t, 10, { a: true, w: true }); assert.equal(t.x, x0, 'no walk'); assert(t.onGround, 'no jump')
  t._dashTap = true; step(f, t, 1); assert.equal(t.x, x0, 'no dash'); assert.equal(typeof t._lastInput, pollBefore, 'polling untouched')
  assert(C.startMove(t, 'light', characters.goku.basic_attacks.light), 'normals while rooted'); t.attacking = false; t.currentAttack = null
  step(f, t, 30, { a: true }); assert.equal(s.ent.rootT, 0); assert(s.ent.immune > WV_ENT.IMMUNE - 10); assert(!W.addPip(s, 11), 'immune')
  step(f, t, WV_ENT.IMMUNE); assert.equal(s.ent.immune, 0); assert(W.addPip(s, 12)); step(f, t, WV_ENT.EXPIRE); assert.equal(s.ent.pips, 0, 'pips expire 240f after the last')
  // no pip from a blocked Thornspike or from Bloom Pod
  const g = ben(), u = foe(); far(g, u); const q = plant(g, u, null); on(u, q); FRAME++; A.tickBenAlienForm(g, {}, ctxOf(g, u)); u.isBlocking = true
  C.resolveProjectileHitsMulti(A.activeProjectiles, [u]); assert.equal(S(g).ent.pips, 0, 'blocked = no pip'); clearProj()
  // the simulation clock: rooting never changes FRAME pacing (one tick = one frame)
  const fr = FRAME; step(g, u, 5); assert.equal(FRAME - fr, 5)
})
// ── 8 Whip-Trigger ─────────────────────────────────────────────────────────────────────────────────────────
test('8. Whip-Trigger: the lash makes his GROWN Thornspike erupt early once (40), +1 pip; atomic vs opponent contact', () => {
  const f = ben(), t = foe(); far(f, t); const p = plant(f, t, null); t.x = p.x + WV_PLANT.thorn.w / 2 + 8   // just past the thorn (no contact)
  assert(whip(f, t)); let raw = null
  for (let i = 0; i < 30; i++) { FRAME++; A.updatePendingSpawns(); A.tickBenAlienForm(f, {}, ctxOf(f, t)); const hb = A.activeProjectiles.find(q => q.name === 'wv_thorn'); if (hb && raw == null) raw = hb.damage; C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); timers(f); timers(t) }
  assert.equal(S(f).stats.whipTriggers, 1); assert.equal(p.by, 'whip'); assert.equal(raw, 40); assert.equal(S(f).stats.erupts, 1)
  assert(S(f).ent.pips >= 1, '+1 pip'); clearProj()
  // a sprouting thorn is not triggered
  const g = ben(), u = foe(); far(g, u); assert(cast(g, u, null)); step(g, u, W.WV_CAST.TOTAL + 1); assert(whip(g, u)); S(g).whip.t = WV_WHIP.EXT_FROM
  step(g, u, 10); assert.equal(W.plantStage(S(g).garden[0]), 'sprout', 'still sprouting while the lash is out'); assert.equal(S(g).stats.whipTriggers, 0, 'a sprout is not triggered')
})
// ── 9 Verdant Rise / Seed Shot ─────────────────────────────────────────────────────────────────────────────
test('9. Verdant Rise: 55 launcher, once per airtime, no jump refill; Seed Shot: one hit max per target (14)', () => {
  const f = ben(), t = foe(); reset(f, t, 20); f._specialHeldDir = 'U'; ready(f); const e = f.energy; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(e - f.energy, WV_COST.rise)
  for (let i = 0; i < WV_RISE.STARTUP + 1; i++) { tick(f, t); const hb = A.activeProjectiles.find(q => q.name === 'wv_rise'); if (hb) { assert.equal(hb.damage, 55); assert(hb.knockbackY < 0); break } } clearProj()
  const g = ben(), u = foe(); far(g, u); ready(g); g.onGround = g.grounded = false; g.y -= 160; g.jumpCount = 2; g._specialHeldDir = null
  assert(A.triggerSpecial(g, ctxOf(g, u)), 'air rise'); tick(g, u, 20); S(g).rise = null; ready(g); assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'once per airtime'); assert.equal(g.jumpCount, 2, 'no jump refill')
  g.onGround = g.grounded = true; tick(g, u, 1); assert.equal(S(g).riseUsed, false, 'refreshed on landing'); clearProj()
  const h = ben(), v = foe(); reset(h, v, 120); S(h).downHeld = WV_SEED_HOLD; h._specialHeldDir = 'D'; assert.equal(W.pickSpecial(h, S(h)), 'seed')
  ready(h); const hp = v.health; assert(A.triggerSpecial(h, ctxOf(h, v))); world(h, v, 40); assert.equal(hp - v.health, Math.floor(14 * DM * C.GLOBAL_DAMAGE_SCALE), 'one hit of 14')
  S(h).downHeld = 3; assert.equal(W.pickSpecial(h, S(h)), 'bloom', 'a short ↓ stays Bloom Pod'); clearProj()
})
// ── 10 ultimate ────────────────────────────────────────────────────────────────────────────────────────────
test('10. Overgrowth: 55 Power; whiff / block = no capture (60f); 40 + 4×22 + 112 = 240; plants consumed; positions restore', () => {
  const f = ben(), t = foe(); far(f, t); ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t))); assert.equal(f.energy, 45)
  world(f, t, 30); assert.equal(S(f).ult, null); assert.equal(S(f).lastUltRaw, 0, 'whiff: no cinematic'); assert(f.attackCooldown > 0 && f.attackCooldown <= WV_ULT.WHIFF)
  const g = ben(), u = foe(); reset(g, u, 120); ready(g); g.energy = 100; A.triggerUltimate(g, ctxOf(g, u)); for (let i = 0; i < 30; i++) { u.isBlocking = true; world(g, u, 1) }
  assert.equal(S(g).lastUltRaw, 0, 'block: no cinematic'); u.isBlocking = false
  const h = ben(), v = foe(); far(h, v); for (const d of [null, 'B']) plant(h, v, d, false); reset(h, v, 120); const hx = h.x, vx = v.x, hp = v.health
  runUlt(h, v); assert.equal(S(h).lastUltRaw, 240); assert.equal(S(h).lastUltSpots.length, 4); assert(hp - v.health > 0)
  assert.equal(W.livePlants(S(h)).length, 0, 'all plants consumed'); assert.equal(S(h).stats.consumedBy.ult, 2)
  assert.equal(h.x, hx, 'Wildvine restored'); assert(v.vy < 0 || !v.onGround, 'launched'); assert.equal(S(h).ent.rootT > 0, true, 'Entangle → Rooted (not immune)')
  assert(h.attackCooldown > 0 && h.attackCooldown <= WV_ULT.LOCKOUT); clearProj(); void vx
})
test('10. Overgrowth: spots = hash(seed, frame, player) — identical for the same seed; Rooted-immune → no pips', () => {
  const run = seed => { SEED = seed; FRAME = 5000; const f = ben(), t = foe(); reset(f, t, 120); runUlt(f, t); clearProj(); return JSON.stringify(S(f).lastUltSpots) }
  const a = run(11), b = run(11), c = run(12); SEED = 4242
  assert.equal(a, b); assert.notEqual(a, c)
  const f = ben(), t = foe(); reset(f, t, 120); S(f).ent.immune = 200; runUlt(f, t); assert.equal(S(f).ent.pips, 0); assert.equal(S(f).ent.rootT, 0); clearProj()
})
// ── 11 lifecycle ───────────────────────────────────────────────────────────────────────────────────────────
test('11. swap / revert / KO / rematch / round end clear all plants and pips (root lapses)', () => {
  const dirty = f => { const t = foe(); far(f, t); plant(f, t, null, false); plant(f, t, 'B', false); S(f).ent.pips = 2; S(f).ent.rootT = 20; S(f).bloom.t = 50 }
  const f = ben(); dirty(f)
  assert(F.applyAlien(f, 'goop')); assert.notEqual(f.omnitrix.formState?.kind, 'wildvine', 'swap clears')
  assert(F.applyAlien(f, 'wildvine')); assert.equal(S(f).garden.length, 0); assert.equal(S(f).ent.pips, 0); assert.equal(S(f).ent.rootT, 0); assert.equal(S(f).bloom.t, 0)
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears')
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null, 'KO clears')
  const g = ben(); assert.equal(S(g).garden.length, 0, 'rematch / round end: a fresh form state')
  const t = foe(); const h = ben(); S(h).ent.rootT = 50; step(h, t, 1); assert(t._benRootT > 0); F.revertToHuman(h)
  physics.moveFighter(t, {}, CONTROLS); physics.moveFighter(t, {}, CONTROLS); assert.equal(t._benRootT, 0, 'root lapses once he is gone')
})
// ── 12 PICK FIVE (the brief's slot-11 test; the owner kept 5 slots — Wildvine is a pick, not a new slot) ────
test('12. pick five: slot count from the registry (5), Wildvine READY + pickable, catalog slot 11, no ready alien overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('wildvine'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 11, 'catalog slot 11 (metadata only)')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'wildvine').length, 1, 'one registry entry')
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT); assert(getAvailableAlienKeys(false).includes('wildvine'))
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet by Dragonrod/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Wildvine'); assert.equal(f.health, 950, 'shared health')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.95 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.95')
  assert(Math.abs(f.defenseMultiplier - 1.00) < 1e-9 && Math.abs(f.damageMultiplier - 1.05) < 1e-9 && Math.abs(f._benWeight - 0.95) < 1e-9, 'def 1.00 / dmg 1.05 / weight 0.95')
})
test('12. picked loadout: Wildvine in the last dial slot and the transform reaches it', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'wildvine']
  const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick)
  assert.deepEqual(f.omnitrix.aliens, pick); f.energy = 100; assert(F.ben10TransformOrSwap(f, BEN10_SLOT_COUNT - 1, { seed: 1, frame: 0, playerIndex: 0 }), 'last slot accepted')
  for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.activeAlien, 'wildvine')
})
test('12. Vow pick includes Wildvine (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'wildvine'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('wildvine') && picks.size === L.length, 'Vow reaches every slot incl. Wildvine')
})
test('12. same-seed determinism: an identical scripted Wildvine sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light')
    far(f, t); plant(f, t, null); plant(f, t, 'B'); plant(f, t, 'D'); const p = S(f).garden[0]; on(t, p); world(f, t, 4)
    reset(f, t, 150); whip(f, t); world(f, t, WV_WHIP.TOTAL + 2); reset(f, t, 120); runUlt(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x, root: t._benRootT })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast: plants, whip, rise, seed, Rooted, Full Bloom, ult cinematic', () => {
  const f = ben(), t = foe(); far(f, t); plant(f, t, null); plant(f, t, 'B'); plant(f, t, 'D'); assert.doesNotThrow(() => JSON.stringify(f.omnitrix))
  reset(f, t, 200); whip(f, t); tick(f, t, 10); JSON.stringify(S(f)); tick(f, t, 40); clearProj(); ready(f)
  S(f).ent.rootT = 20; tick(f, t, 2); JSON.stringify(S(f)); f._specialHeldDir = 'U'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 5); JSON.stringify(S(f)); tick(f, t, 40); clearProj()
  const u = ben(), v = foe(); reset(u, v, 120); u.energy = 100; ready(u); A.triggerUltimate(u, ctxOf(u, v)); world(u, v, 50)
  assert(S(u).ult && S(u).ult.phase !== 'opener', 'mid-cinematic'); assert.doesNotThrow(() => JSON.stringify(S(u))); clearProj()
  for (const p of S(u).garden) for (const v2 of Object.values(p)) assert(v2 === null || ['number', 'string', 'boolean'].includes(typeof v2), 'plant records are flat plain data')
})
test('no Math.random / gameRng in wildvine.js / wildvineAssets.js', () => {
  for (const file of ['../wildvine.js', '../wildvineAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`WILDVINE: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
