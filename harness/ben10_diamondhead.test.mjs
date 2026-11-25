// DIAMONDHEAD — Phase 6 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_diamondhead.test.mjs
// Design totals: raw move damage × the form's damage mod (1.10) × 0.85^n (85% per move, reset after 90f), within ±20%.
// The live routes then run the real engine (its own curve) and assert the mechanics.
// Test 13 (the brief's "slot 13 + Omnitrix Dial"): an alien-select screen already exists (PICK FIVE, owner decision), so per
// the brief's step 1 it is used and no Dial / slot is added — Diamondhead is a pick; the assertions read the registry count.
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
import { balDmgMult } from '../rosterBalance.js'
import { rosterDamageBoost } from '../rosterParity.js'   // roster balance sweep 2026-11-25: Ben's row (dmg ×1.75) multiplies his live damage on top
const BAL = balDmgMult('ben10')
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as D from '../diamondhead.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'diamondhead_ov', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const foe = (key = 'goku', x = 500) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); if (ch?.animationData) t.animationData = ch.animationData; t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
const STAGE = { stageLeft: 0, stageWidth: 1600 }
let FRAME = 0, SEED = 4242
const ctxOf = (f, t) => ({ p1: f, p2: t, ...STAGE, seed: SEED, frame: FRAME })
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t)); if (f._benGlide) physics.moveFighter(f, {}, {}) } }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const timers = q => { if (q.hitstop > 0) q.hitstop--; else if (q.hitstun > 0) q.hitstun--; for (const k of ['attackCooldown', '_benPowerCommit', '_spriteCastTimer', 'invulnTimer', 'blockstun', 'grabInputBuffer']) if (q[k] > 0) q[k]-- }
// one whole frame: pending spawns, both fighters' physics, the form tick, his live projectiles moved + resolved on the foe
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
const { DIAMONDHEAD, DH_WALL, DH_SHARD, DH_BURST, DH_PRISM, DH_SHOT, DH_SPIKE, DH_LANCE, DH_DIVE, DH_HARDEN, DH_ULT, DH_BODY, DH_COST } = D
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + f.w + gap; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false; t.knockdownState = false; t.knockdownTimer = 0; t.invulnTimer = 0 }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }
const step = (f, t, n = 1, tKeys = {}, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
  A.tickBenAlienForm(f, input, ctxOf(f, t)); physics.moveFighter(t, tKeys, CONTROLS); physics.applyGravity(t); timers(f); timers(t) } }
const cast = (f, t, dir) => { ready(f); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const far = (f, t) => { t.x = f.x + 1000 }
// an opponent projectile flying at x (world() moves only his; this moves theirs)
const shot = (t, x, y, extra = {}) => { const p = { name: 'ki_blast', owner: t, x, y, vx: -8, vy: 0, w: 20, h: 20, damage: 30, lifetime: 120, ...extra }; A.activeProjectiles.push(p); return p }
const BA = DIAMONDHEAD.basic_attacks, DM = DIAMONDHEAD.mods.damage
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  shot: DH_SHOT.DMG * DH_SHOT.N, spike: DH_SPIKE.DMG * DH_SPIKE.AT.length, burst3: D.burstDamage(3) }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
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
// a goku normal hitting HIM (the real melee pipeline); returns the damage he took
function takeMelee(f, t, key = 'heavy') {
  clearProj(); ready(t); t.isBlocking = false; f.isBlocking = false; f.facing = 1; t.facing = -1; t.x = f.x + f.w + 10; t.y = f.y + f.h - t.h
  assert(C.startMove(t, key, characters.goku.basic_attacks[key]), 'goku ' + key)
  const hp = f.health
  for (let i = 0; i < 50 && f.health === hp && t.attacking; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}); C.resolveAttackHit(t, f, [], {}) }
  t.attacking = false; t.currentAttack = null
  assert(f.health < hp, 'goku ' + key + ' connects on him')
  return hp - f.health
}
const cx = o => o.x + (o.w || 60) / 2
const runUlt = (f, t) => { ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t)), 'ult'); let n = 0; while ((S(f).ult || n < 20) && n < 260) { world(f, t, 1); n++ } }
const spikeCast = (f, t) => { ready(f); S(f).dashTapT = S(f).t; f._specialHeldDir = 'F'; return A.triggerSpecial(f, ctxOf(f, t)) }
const wallUp = (f, t) => { assert(cast(f, t, 'B'), 'Prism Wall'); step(f, t, DH_WALL.TOTAL); return S(f).wall }   // the wall rises at 18f; the cast ends at 30f

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 100],
  ['2. Low, Heavy, Shard Shot', ['low', 'heavy', 'shot'], 120],
  ['3. Spike Eruption, Heavy, Shatter Burst (3 pips)', ['spike', 'heavy', 'burst3'], 150],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Shard Shot (10 Power, 3-shard volley, +1 Shard pip)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 160); const e = f.energy, hp = t.health; assert(cast(f, t, null), 'Shard Shot'); assert.equal(e - f.energy, DH_COST.shot)
  world(f, t, 45); d.push(hp - t.health); assert(d[2] > 0); assert.equal(S(f).shards.pips, 1, 'one pip per cast'); assert.equal(f.comboCounter, 5, '2 normals + 3 shards')
  console.log('   HP', d.join('+'))
})
test('route 3 live: Spike Eruption (4 hits, carried, pop-up) → Heavy → Shatter Burst with 3 pips (75)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); const hp0 = t.health, e = f.energy; assert(spikeCast(f, t)); assert.equal(e - f.energy, DH_COST.spike)
  world(f, t, DH_SPIKE.TOTAL + 1); const d = [hp0 - t.health]; assert.equal(S(f).stats.spikes, 1); assert.equal(S(f).shards.pips, 1, 'spike +1 pip')
  clearProj(); f.x = 400; reset(f, t, 10); d.push(melee(f, t, 'heavy'))
  S(f).shards.pips = 3; S(f).shards.pipT = 200; reset(f, t, 40); const hp = t.health; assert(cast(f, t, 'U'), 'Shatter Burst'); world(f, t, DH_BURST.STARTUP + 4)
  d.push(hp - t.health); assert.equal(S(f).stats.burstPips.at(-1), 3); assert.equal(S(f).shards.pips, 0, 'pips consumed'); console.log('   HP', d.join('+'))
})

// ── 4 Crystal Body / Fracture ──────────────────────────────────────────────────────────────────────────────
test('4. Crystal Body: −15% from physical melee normals only (not specials / projectiles / beams / fire / electric)', () => {
  const f = ben(), t = foe(), GB = rosterDamageBoost(t), hit = (opts, atk) => { t.currentAttack = atk; const hp = f.health; C.applyScaledDamage(f, 100, { attacker: t, ...opts }); return Math.round((hp - f.health) / GB) }   // ÷ the attacker's roster boost (OG lift × balance row, 2026-11-23/25) → the design numbers
  assert.equal(hit({ source: 'melee', defenseApplied: true, offenseApplied: true, scale: 1 }, { name: 'light', damage: 20 }), 85, 'normal ×0.85')
  assert.equal(hit({ source: 'melee', defenseApplied: true, offenseApplied: true, scale: 1 }, { name: 'kamehameha', isSpecial: true }), 100, 'special untouched')
  assert.equal(hit({ source: 'melee', defenseApplied: true, offenseApplied: true, scale: 1 }, { name: 'light', fire: true }), 100, 'fire untouched')
  assert.equal(hit({ source: 'melee', defenseApplied: true, offenseApplied: true, scale: 1 }, { name: 'heavy', element: 'electric' }), 100, 'electric untouched')
  const p1 = hit({ source: 'projectile', move: 'ki_blast' }, null), g = ben('heatblast'); const hp = g.health; C.applyScaledDamage(g, 100, { attacker: t, source: 'projectile', move: 'ki_blast' })
  assert.equal(p1, Math.floor(100 * C.GLOBAL_DAMAGE_SCALE / (1.15 * BEN_ALIEN_BUFF.defense)) || p1, 'projectile: only the def mod'); void hp
  const live = takeMelee(f, t, 'light'), h = ben('heatblast'), u = foe(); const ref = takeMelee(h, u, 'light')
  assert(live < ref * (1 / 1.15 / (1 / getAlienDefinition('heatblast').mods.defense)) + 1, `live melee ${live} reduced vs ${ref}`)
})
test('4. Fracture: 3 heavy hits in 300f → defense −15% for 240f, once per 600f; spaced hits / blocks / lights do not; swap clears', () => {
  const f = ben(), t = foe(), s = S(f), hv = { kind: 'melee', move: { name: 'heavy' }, attacker: t, blocked: false }
  for (let i = 0; i < 3; i++) { DIAMONDHEAD.struck(f, { ...hv, blocked: true }); DIAMONDHEAD.struck(f, { ...hv, move: { name: 'light' } }) }
  assert.equal(s.crystal.fracT, 0, 'blocks / lights never count')
  DIAMONDHEAD.struck(f, hv); step(f, t, 160); DIAMONDHEAD.struck(f, hv); step(f, t, 160); DIAMONDHEAD.struck(f, hv); assert.equal(s.crystal.fracT, 0, 'not within 300f')
  DIAMONDHEAD.struck(f, hv); assert.equal(s.crystal.fracT, DH_BODY.FRAC_T, '3 inside 300f'); assert.equal(s.stats.fractures, 1)
  const hp = f.health; C.applyScaledDamage(f, 85, { attacker: t, source: 'projectile', move: 'x' }); const frac = hp - f.health
  step(f, t, DH_BODY.FRAC_T); assert.equal(s.crystal.fracT, 0); const hp2 = f.health; C.applyScaledDamage(f, 85, { attacker: t, source: 'projectile', move: 'x' })
  assert(frac > hp2 - f.health, `fractured ${frac} > normal ${hp2 - f.health}`)
  for (let i = 0; i < 3; i++) DIAMONDHEAD.struck(f, hv); assert.equal(s.crystal.fracT, 0, 'once per 600f')
  step(f, t, DH_BODY.FRAC_CD); for (let i = 0; i < 3; i++) DIAMONDHEAD.struck(f, hv); assert(s.crystal.fracT > 0, 'again after 600f')
  assert(F.applyAlien(f, 'goop')); assert(F.applyAlien(f, 'diamondhead_ov')); assert.equal(S(f).crystal.fracT, 0, 'swap clears')
})
// ── 5 Prism Wall ───────────────────────────────────────────────────────────────────────────────────────────
test('5. Prism Wall: 14 Power, 18f, 140 px ahead, one per owner, not solid, 300f lifetime', () => {
  const f = ben(), t = foe(); far(f, t); const e = f.energy; assert(cast(f, t, 'B')); assert.equal(e - f.energy, DH_WALL.COST)
  step(f, t, DH_WALL.STARTUP - 1); assert.equal(S(f).wall, null, 'nothing before 18f'); step(f, t, 1); const w = S(f).wall
  assert.equal(w.x, Math.round(cx(f) + DH_WALL.DIST)); assert.equal(w.y, f.y + f.h)
  step(f, t, 20); ready(f); assert(cast(f, t, 'B')); step(f, t, DH_WALL.STARTUP); assert.equal(S(f).wall.id, 2, 'a new wall replaces the old'); assert.equal(S(f).stats.shatters.replaced, 1)
  const v = foe(); v.x = S(f).wall.x - 200; v.facing = 1; const x0 = v.x; step(f, v, 40, { d: true }); assert(v.x - x0 > 150, 'the opponent walks straight through (no wall collision)')
  step(f, t, DH_WALL.LIFE); assert(!S(f).wall || S(f).wall.gone, '300f lifetime'); assert.equal(S(f).stats.shatters.expired, 1)
})
test('5. Prism Wall: catches 3 opponent non-beam projectiles (atomic, ownership-aware) then shatters → PRISMATIC', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const w = wallUp(f, t)
  shot(t, w.x, w.y - 60, { name: 'kamehameha' }); step(f, t, 1); assert.equal(w.caught, 0, 'beams pass'); clearProj()
  const mine = { name: 'other', owner: f, x: w.x, y: w.y - 60, vx: 8, w: 20, h: 20, damage: 5, lifetime: 30 }; A.activeProjectiles.push(mine); step(f, t, 1); assert.equal(w.caught, 0, 'his own pass'); clearProj()
  shot(t, w.x, w.y - 60); shot(t, w.x, w.y - 80); step(f, t, 1); assert.equal(w.caught, 2); assert.equal(A.activeProjectiles.length, 0, 'deleted')
  step(f, t, 3); assert.equal(w.caught, 2, 'no double counting')
  shot(t, w.x, w.y - 60); shot(t, w.x, w.y - 70); step(f, t, 1); assert.equal(w.caught, 3, 'stops at the 3rd'); assert(w.gone && w.by === 'catch'); assert.equal(A.activeProjectiles.length, 1, 'the 4th is not caught')
  assert(D.prismatic(S(f)), 'PRISMATIC'); clearProj()
})
test('5. Refraction: Shard Shot through his wall → 3-way fan at 40%, one hit per target per cast, still 1 pip', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 400); t.x = f.x + 600; const w = wallUp(f, t); step(f, t, 12)
  const hp = t.health; assert(cast(f, t, null)); let fans = 0
  for (let i = 0; i < 50; i++) { world(f, t, 1); fans = Math.max(fans, A.activeProjectiles.filter(p => p.alien && p.alien.dh === 'fan').length) }
  assert.equal(S(f).stats.refracted, DH_SHOT.N, 'each shard refracted once'); assert(fans >= 1)
  assert.equal(hp - t.health, Math.floor(Math.round(DH_SHOT.DMG * DH_WALL.REFR_MULT) * DM * BEN_ALIEN_BUFF.damage * BAL * C.GLOBAL_DAMAGE_SCALE), 'one fan hit (40%) for the cast')
  assert.equal(S(f).shards.pips, 1, '1 pip'); assert.equal(w.caught, 0, 'his shards are not caught'); clearProj()
})
test('5. walls removed on swap / revert / KO / rematch', () => {
  for (const end of ['swap', 'revert', 'ko']) { const f = ben(), t = foe(); far(f, t); wallUp(f, t)
    if (end === 'swap') { F.applyAlien(f, 'goop'); F.applyAlien(f, 'diamondhead_ov'); assert.equal(S(f).wall, null) }
    else { if (end === 'ko') f.health = 0; F.revertToHuman(f); assert.equal(f.omnitrix.formState, null) } }
  assert.equal(S(ben()).wall, null, 'rematch: fresh')
})
// ── 6 Shards ───────────────────────────────────────────────────────────────────────────────────────────────
test('6. Shards: one pip per cast, max 3, 300f expiry, no pips from blocks or the Prism Wall', () => {
  const f = ben(), t = foe(), s = S(f)
  assert(D.addPip(s, 1)); assert(!D.addPip(s, 1), 'same cast'); D.addPip(s, 2); D.addPip(s, 3); assert(!D.addPip(s, 4)); assert.equal(s.shards.pips, 3)
  step(f, t, DH_SHARD.EXPIRE - 1); assert.equal(s.shards.pips, 3); step(f, t, 1); assert.equal(s.shards.pips, 0, 'expired 300f after the last')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 160); u.isBlocking = true; assert(cast(g, u, null)); for (let i = 0; i < 45; i++) { u.isBlocking = true; world(g, u, 1) }
  assert.equal(S(g).shards.pips, 0, 'blocked volley: no pip'); u.isBlocking = false
  const h = ben(), v = foe(); far(h, v); const w = wallUp(h, v); shot(v, w.x, w.y - 60); step(h, v, 2); assert.equal(S(h).shards.pips, 0, 'wall catches give none'); clearProj()
})
test('6. Shatter Burst: 30 + 15 per pip, 140 px radius, 16f, −12 on block, pips consumed on a HIT only', () => {
  for (const pips of [0, 1, 3]) { clearProj(); const f = ben(), t = foe(); reset(f, t, 40); S(f).shards.pips = pips; S(f).shards.pipT = 200
    const hp = t.health, e = f.energy; assert(cast(f, t, 'U')); assert.equal(e - f.energy, DH_BURST.COST)
    world(f, t, DH_BURST.STARTUP - 1); assert.equal(t.health, hp, 'nothing before 16f'); world(f, t, 3)
    assert.equal(hp - t.health, Math.floor(D.burstDamage(pips) * DM * BEN_ALIEN_BUFF.damage * BAL * C.GLOBAL_DAMAGE_SCALE), `${pips} pips`); assert.equal(S(f).shards.pips, 0) }
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); S(f).shards.pips = 2; S(f).shards.pipT = 200; t.isBlocking = true; assert(cast(f, t, 'U'))
  let adv = null; for (let i = 0; i < 80; i++) { t.isBlocking = true; world(f, t, 1); if (adv === null && t.blockstun > 0) adv = t.blockstun - (DH_BURST.TOTAL - S(f).burst.t) }
  assert.equal(S(f).shards.pips, 2, 'blocked: pips stay'); assert.equal(adv, DH_BURST.ON_BLOCK, `on block ${adv}`)
  clearProj(); const g = ben(), u = foe(); far(g, u); assert(cast(g, u, null)); world(g, u, 30); S(g).shards.pips = 2; S(g).shards.pipT = 200; ready(g); assert(cast(g, u, 'U')); world(g, u, 30); assert.equal(S(g).shards.pips, 2, 'whiff: pips stay'); clearProj()
})
// ── 7 Prismatic ────────────────────────────────────────────────────────────────────────────────────────────
test('7. Prismatic: on wall shatter (3rd catch or own Shatter Burst), 180f, Shard Shot pierces, +10%, once per 600f, palette flag', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const w = wallUp(f, t); ready(f); assert(cast(f, t, 'U')); step(f, t, DH_BURST.STARTUP)
  assert(w.gone && w.by === 'burst'); const p = S(f).prism; assert(p.t > DH_PRISM.DUR - 3 && p.t <= DH_PRISM.DUR, `prism ${p.t}`)
  assert.equal(f._skinAnim, D.DH_FRAMESETS.prism, 'alt-pal frame set'); assert(/prism_/.test(f._skinAnim.idle.sheet)); assert(Math.abs(DIAMONDHEAD.damageDealt(f, t, 100, {}) - 110) < 1e-9)
  step(f, t, DH_BURST.TOTAL - DH_BURST.STARTUP); ready(f); assert(cast(f, t, null)); step(f, t, DH_SHOT.STARTUP + 1); assert(A.activeProjectiles.filter(q => q.alien && q.alien.dh === 'shard').every(q => q.piercesMulti), 'pierce'); clearProj()
  step(f, t, DH_PRISM.DUR); assert.equal(p.t, 0); assert.equal(f._skinAnim, D.DH_FRAMESETS.normal); assert.equal(DIAMONDHEAD.damageDealt(f, t, 100, {}), 100)
  assert(!D.startPrism(S(f)), 'once per 600f'); step(f, t, DH_PRISM.CD); assert(D.startPrism(S(f)))
  assert.equal(typeof JSON.parse(JSON.stringify(S(f))).prism.t, 'number', 'the flag is plain GAME_STATE'); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'ends cleanly')
})
// ── 8 Harden ───────────────────────────────────────────────────────────────────────────────────────────────
test('8. Harden: 12f window, one hit at 50% with no hitstun, 30f recovery, 7 s cooldown; beams + throws ignore it', () => {
  const f = ben(), t = foe(); const plain = (() => { const g = ben(), u = foe(); reset(g, u, 10); return takeMelee(g, u, 'heavy') })()
  reset(f, t, 10); ready(f); assert(DIAMONDHEAD.blockHeavy(f)); assert(!DIAMONDHEAD.blockHeavy(f), 'cooldown'); const d = takeMelee(f, t, 'heavy')
  assert(Math.abs(d - plain * DH_HARDEN.TAKE) <= 1, `${d} ≈ 50% of ${plain}`); A.tickBenAlienForm(f, {}, ctxOf(f, t)); assert.equal(f.hitstun, 0, 'no hitstun')
  assert.equal(S(f).harden.rec, DH_HARDEN.RECOVERY); assert(f.attackCooldown >= DH_HARDEN.RECOVERY - 1, 'punishable recovery')
  const d2 = takeMelee(f, t, 'heavy'); assert(d2 > d, 'one hit only')
  const g = ben(), u = foe(); ready(g); DIAMONDHEAD.blockHeavy(g); step(g, u, DH_HARDEN.WINDOW); const hp = g.health; C.applyScaledDamage(g, 100, { attacker: u, source: 'projectile', move: 'x' }); assert(!S(g).harden.used, 'window over')
  const h = ben(), v = foe(); ready(h); DIAMONDHEAD.blockHeavy(h); const hh = h.health; C.applyScaledDamage(h, 100, { attacker: v, source: 'projectile', move: 'kamehameha_beam' }); assert(!S(h).harden.used, 'beam ignores it')
  C.applyScaledDamage(h, 100, { attacker: v, source: 'grab-throw' }); assert(!S(h).harden.used, 'throw ignores it')
  C.applyScaledDamage(h, 100, { attacker: v, source: 'projectile', move: 'ki_blast' }); assert(S(h).harden.used, 'a projectile is caught'); void hp; void hh
  step(h, v, DH_HARDEN.CD); assert(S(h).harden.cd === 0); ready(h); h._benPowerCommit = 0; assert(DIAMONDHEAD.blockHeavy(h), 'ready after 7 s')
})
// ── 9 Crystal Lance ────────────────────────────────────────────────────────────────────────────────────────
test('9. Crystal Lance: 12 Power, 360 px, 22+30, extended hurtbox while out, 22f whiff recovery, −12 on block, finisher pip', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const e = f.energy; assert(cast(f, t, 'D')); assert.equal(e - f.energy, DH_COST.lance)
  let maxW = 0; for (let i = 0; i < DH_LANCE.TOTAL; i++) { step(f, t, 1); const hb = DIAMONDHEAD.hurtbox(f); if (hb) maxW = Math.max(maxW, hb.w) }
  assert(maxW >= DH_LANCE.REACH, `hurtbox ${maxW}`); assert.equal(DIAMONDHEAD.hurtbox(f), null, 'gone after'); assert.equal(DH_LANCE.TOTAL - DH_LANCE.HITS_AT[1] - 2, DH_LANCE.RECOVERY)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 300); const hp = u.health; assert(cast(g, u, 'D')); world(g, u, 30); assert(hp - u.health > 0, 'reaches 300 px'); assert.equal(S(g).shards.pips, 1)
  clearProj(); const h = ben(), v = foe(); reset(h, v, 150); assert(cast(h, v, 'D')); let adv = null
  for (let i = 0; i < 60; i++) { v.isBlocking = true; const bs = v.blockstun; world(h, v, 1); if (S(h).lance && S(h).lance.t === DH_LANCE.HITS_AT[1] + 1 && adv === null) adv = v.blockstun - (DH_LANCE.TOTAL - S(h).lance.t) }
  assert.equal(adv, DH_LANCE.ON_BLOCK, `on block ${adv}`); assert.equal(S(h).shards.pips, 0, 'blocked: no pip'); clearProj()
})
// ── 10 Diamond Dive ────────────────────────────────────────────────────────────────────────────────────────
test('10. Diamond Dive: air only, 12 Power, diagonal down, 50, once per airtime, no jump refill', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); f.y -= 160; f.onGround = f.grounded = false; f.jumpCount = 2; ready(f); f._specialHeldDir = null
  const e = f.energy, hp = t.health, x0 = f.x, y0 = f.y; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(e - f.energy, DH_COST.dive)
  world(f, t, 8); assert(f.x > x0 && f.y > y0, 'down-forward'); let n = 0; while (S(f).dive && n < 80) { world(f, t, 1); n++ }
  assert.equal(hp - t.health, Math.floor(DH_DIVE.DMG * DM * BEN_ALIEN_BUFF.damage * BAL * C.GLOBAL_DAMAGE_SCALE), 'one hit of 50'); assert.equal(f.jumpCount, 2, 'no jump refill')
  assert.equal(S(f).landT > 0, true, 'landing pop stamped')
  const g = ben(), u = foe(); far(g, u); g.y -= 200; g.onGround = g.grounded = false; ready(g); assert(A.triggerSpecial(g, ctxOf(g, u))); S(g).dive = null; delete g._benGlide; ready(g)
  assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'once per airtime'); g.onGround = g.grounded = true; tick(g, u, 1); assert.equal(S(g).diveUsed, false); clearProj()
})
// ── 11 ultimate ────────────────────────────────────────────────────────────────────────────────────────────
test('11. Diamond Cathedral: 55 Power; whiff / block = no capture (60f); 40 + 3×30 + 110 = 240 (+10/pip, max +30); pips consumed; Prismatic; restore', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t))); assert.equal(f.energy, 45)
  world(f, t, 30); assert.equal(S(f).lastUltRaw, 0); assert(f.attackCooldown > 0 && f.attackCooldown <= DH_ULT.WHIFF)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 120); ready(g); g.energy = 100; A.triggerUltimate(g, ctxOf(g, u)); for (let i = 0; i < 30; i++) { u.isBlocking = true; world(g, u, 1) }
  assert.equal(S(g).lastUltRaw, 0, 'block: no cinematic'); u.isBlocking = false
  for (const pips of [0, 3]) { clearProj(); const h = ben(), v = foe(); reset(h, v, 120); S(h).shards.pips = pips; S(h).shards.pipT = 250; const hx = h.x, hp = v.health
    runUlt(h, v); assert.equal(S(h).lastUltRaw, 240 + 10 * pips); assert.equal(S(h).lastUltPips, pips); assert.equal(S(h).shards.pips, 0)
    assert.equal(S(h).lastUltSpots.length, 3); assert(hp - v.health > 0); assert.equal(h.x, hx, 'positions restore'); assert(v.vy < 0 || !v.onGround, 'launched')
    assert(D.prismatic(S(h)), 'ends PRISMATIC'); assert(h.attackCooldown > 0 && h.attackCooldown <= DH_ULT.LOCKOUT); assert.equal(S(h).stats.pips, 0, 'no Shard pip added') }
  clearProj()
})
test('11. Diamond Cathedral: spire spots = hash(seed, frame, player) — identical for the same seed; Prismatic respects its 600f limit', () => {
  const run = seed => { SEED = seed; FRAME = 7000; const f = ben(), t = foe(); reset(f, t, 120); runUlt(f, t); clearProj(); return JSON.stringify(S(f).lastUltSpots) }
  const a = run(11), b = run(11), c = run(12); SEED = 4242; assert.equal(a, b); assert.notEqual(a, c)
  const f = ben(), t = foe(); reset(f, t, 120); S(f).prism.cd = 300; runUlt(f, t); assert.equal(S(f).prism.t, 0, 'still on cooldown: no Prismatic'); clearProj()
})
// ── 12 lifecycle ───────────────────────────────────────────────────────────────────────────────────────────
test('12. swap / revert / KO / rematch clear walls, pips, Fracture and Prismatic', () => {
  const dirty = f => { const t = foe(); far(f, t); wallUp(f, t); const s = S(f); s.shards.pips = 2; s.crystal.fracT = 100; s.prism.t = 90; s.tickPrism = 1; step(f, t, 1) }
  const f = ben(); dirty(f); assert.equal(f._skinAnim, D.DH_FRAMESETS.prism)
  assert(F.applyAlien(f, 'goop')); assert.notEqual(f._skinAnim, D.DH_FRAMESETS.prism, 'swap: palette gone')
  assert(F.applyAlien(f, 'diamondhead_ov')); const s = S(f); assert.equal(s.wall, null); assert.equal(s.shards.pips, 0); assert.equal(s.crystal.fracT, 0); assert.equal(s.prism.t, 0)
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null)
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null)
  assert.equal(S(ben()).wall, null, 'rematch / round end: a fresh form state')
})
// ── 13 slot 13 → PICK FIVE (the brief's step 1: an alien-select already exists) ─────────────────────────────
test('13. pick five: slot count from the registry (5), Diamondhead READY + pickable (catalog slot 13), nothing overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('diamondhead_ov'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 13); assert.equal(d.displayName, 'Diamondhead')
  assert.equal(getAlienDefinition('diamondhead').status, 'experimental', 'the experimental Diamondhead is untouched')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin', 'wildvine', 'jetray']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'diamondhead_ov').length, 1); assert(getAvailableAlienKeys(false).includes('diamondhead_ov'))
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sprites by Dragonrod, recolor by Arksalazar/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Diamondhead'); assert.equal(f.health, 2185, 'shared health (950 × the 2026-11-24 Ben HP buff 2.30)')
  assert(Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 1.15) < 1e-9 && Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 1.10) < 1e-9 && Math.abs(f._benWeight - 1.20) < 1e-9, 'def 1.15 / dmg 1.10 / weight 1.20')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.95 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.95')
})
test('13. picked loadout: Diamondhead in the last dial slot, the transform reaches it at the same cost as any slot', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'diamondhead_ov'], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    assert(F.ben10TransformOrSwap(f, slot, { seed: 1, frame: 0, playerIndex: 0 })); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, 'diamondhead_ov'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
})
test('13. Vow pick includes Diamondhead (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'diamondhead_ov'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('diamondhead_ov') && picks.size === L.length)
})
test('13. same-seed determinism: an identical scripted Diamondhead sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light')
    reset(f, t, 300); wallUp(f, t); step(f, t, 12); cast(f, t, null); world(f, t, 40); reset(f, t, 40); spikeCast(f, t); world(f, t, 60)
    reset(f, t, 40); cast(f, t, 'U'); world(f, t, DH_BURST.TOTAL + 1); reset(f, t, 120); runUlt(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast: wall, fans, spikes, lance, dive, harden, ult cinematic', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 400); wallUp(f, t); cast(f, t, null); world(f, t, 18); JSON.stringify(f.omnitrix)
  reset(f, t, 40); ready(f); spikeCast(f, t); world(f, t, 20); JSON.stringify(S(f)); world(f, t, 40); ready(f); cast(f, t, 'D'); world(f, t, 10); JSON.stringify(S(f)); world(f, t, 40)
  ready(f); DIAMONDHEAD.blockHeavy(f); JSON.stringify(S(f)); clearProj()
  const u = ben(), v = foe(); reset(u, v, 120); u.energy = 100; ready(u); A.triggerUltimate(u, ctxOf(u, v)); world(u, v, 50)
  assert(S(u).ult && S(u).ult.phase !== 'opener', 'mid-cinematic'); assert.doesNotThrow(() => JSON.stringify(S(u))); clearProj()
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  assert(plain(S(u)), 'only plain data in formState')
})
test('no Math.random / gameRng in diamondhead.js / diamondheadAssets.js', () => {
  for (const file of ['../diamondhead.js', '../diamondheadAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`DIAMONDHEAD: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
