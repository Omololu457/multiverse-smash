// ARCTICGUANA — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_arcticguana.test.mjs
// Design totals: raw move damage × the form's damage mod (1.05) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 14 (the brief's "slot 16 via the Dial"): PICK FIVE (owner decision, no new dial slots) — the dial is positional over
// the 5 picked aliens, and catalog slot 16 is Feedback (never overwritten), so Arcticguana's catalog slot is 17 (ready slots
// stay contiguous); he is picked into the loadout and reached with the Dial (↓↓ + slot key) like any other pick.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../arcticguana.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'arcticguana', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const foe = (key = 'goku', x = 500) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); if (ch?.animationData) t.animationData = ch.animationData; t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
const STAGE = { stageLeft: 0, stageWidth: 1600 }
physics.stageLeft = STAGE.stageLeft; physics.stageWidth = STAGE.stageWidth   // the physics clamp = the stage the form reads
let FRAME = 0, SEED = 4242
const ctxOf = (f, t) => ({ p1: f, p2: t, ...STAGE, seed: SEED, frame: FRAME })
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const timers = q => { if (q.hitstop > 0) q.hitstop--; else if (q.hitstun > 0) q.hitstun--; for (const k of ['attackCooldown', '_benPowerCommit', '_spriteCastTimer', 'invulnTimer', 'blockstun', 'grabInputBuffer']) if (q[k] > 0) q[k]-- }
// one whole frame: pending spawns, both fighters' physics, the form tick, his live projectiles moved + resolved on the foe,
// the foe's knockdown timer (combat.updateCombat's knockdown block, mirrored)
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
    if (t.knockdownState) { if ((t.knockdownTimer || 0) > 0) t.knockdownTimer--; if (t.knockdownTimer <= 0) { t.knockdownState = false; t.invulnTimer = Math.max(t.invulnTimer || 0, C.WAKEUP_INVULN) } }
  }
}
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + f.w + gap; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false; t.knockdownState = false; t.knockdownTimer = 0; t.invulnTimer = 0 }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }
const step = (f, t, n = 1, tKeys = {}, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
  A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t)); physics.moveFighter(t, tKeys, CONTROLS); physics.applyGravity(t); timers(f); timers(t) } }
const cast = (f, t, dir) => { ready(f); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const far = (f, t) => { t.x = f.x + 1000 }
const shot = (t, x, y, extra = {}) => { const p = { name: 'ki_blast', owner: t, x, y, vx: -8, vy: 0, w: 20, h: 20, damage: 30, lifetime: 120, ...extra }; A.activeProjectiles.push(p); return p }
const { ARCTICGUANA, AG_COST } = G
const BA = ARCTICGUANA.basic_attacks, DM = ARCTICGUANA.mods.damage
const LOAD = ['heatblast', 'goop', 'xlr8', 'humongousaur', 'arcticguana']
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const cx = o => o.x + (o.w || 60) / 2
function melee(f, t, key, { block = false } = {}) {
  ready(f)
  if (key === 'air') { f.onGround = f.grounded = false }
  assert(C.startMove(f, key, BA[key]), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter, bs = t.blockstun
  t.isBlocking = block
  for (let i = 0; i < 60 && t.health === hp && !(block && t.blockstun > bs) && f.attacking; i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true; f.attacking = false; f.currentAttack = null
  if (!block) { assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo') }
  return hp - t.health
}

// ── 2 stats ─────────────────────────────────────────────────────────────────────────────────────────────────
test('stats: speed ×0.95 / damage ×1.05 / defense ×1.10 / weight ×1.05, double jump, shared health', () => {
  const f = ben()
  assert(Math.abs(f.damageMultiplier - 1.05) < 1e-9 && Math.abs(f.defenseMultiplier - 1.10) < 1e-9 && Math.abs(f._benWeight - 1.05) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.95 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.95')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 950, 'shared health'); assert.equal(f.activeAlienName, 'Arcticguana')
})
test('normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, extra) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (extra) extra(m) }
  chk('light', 5, 18, 0); chk('heavy', 14, 54, -6, m => assert.equal(m.rangeX, 180)); chk('down', 7, 24, -4, m => assert.equal(m.hitLevel, 'low'))
  chk('up', 11, 46, -9, m => assert(m.launcher)); chk('air', 7, 28, 2)
})
test('normals connect through the real combat pipeline', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { const f = ben(), t = foe(); reset(f, t, 10); assert(melee(f, t, k) > 0, k) }
})

// ── 4 Frost Coat ────────────────────────────────────────────────────────────────────────────────────────────
const { AG_COAT } = G
const coatOn = f => { ready(f); assert(G.toggleCoat(f, S(f), null), 'coat'); for (let i = 0; i < AG_COAT.FORM; i++) A.tickBenAlienForm(f, {}, ctxOf(f, foe())) ; return S(f).coat }
test('4. Frost Coat: Block+Light toggle, 14f to form (committed), cost 10, 240f max, 300f cooldown, refused in hitstun / cooldown', () => {
  const f = ben(), t = foe(); far(f, t); f.energy = 100; ready(f)
  assert.equal(ARCTICGUANA.blockLight(f), true, 'the Light press is consumed'); assert.equal(S(f).coat.state, 'forming'); assert.equal(100 - f.energy, AG_COST.coat)
  assert.equal(f._benPowerCommit, AG_COAT.FORM, 'committed while forming'); assert.equal(ARCTICGUANA.moveFrames(f, 'light', BA.light), false, 'no normals while forming')
  step(f, t, AG_COAT.FORM - 1); assert.equal(S(f).coat.state, 'forming'); step(f, t, 1); assert.equal(S(f).coat.state, 'on', '14f')
  step(f, t, AG_COAT.MAX - 1); assert.equal(S(f).coat.state, 'on'); step(f, t, 1); assert.equal(S(f).coat.state, 'off', '240f max'); assert.equal(S(f).coat.cd, AG_COAT.CD)
  ready(f); assert.equal(G.toggleCoat(f, S(f), null), false, 'cooldown'); step(f, t, AG_COAT.CD); ready(f); f.hitstun = 5; assert.equal(G.toggleCoat(f, S(f), null), false, 'hitstun')
  f.hitstun = 0; assert(G.toggleCoat(f, S(f), null), 'after 300f'); step(f, t, AG_COAT.FORM + 3); ready(f); assert(G.toggleCoat(f, S(f), null), 'second tap ends it'); assert.equal(S(f).coat.state, 'off'); assert.equal(S(f).coat.cd, AG_COAT.CD)
})
test('4. Frost Coat: defense ×1.20, speed ×0.88 while coated; restored after', () => {
  const f = ben(), t = foe(); far(f, t); const d0 = f.defenseMultiplier, w0 = f._benWalkSpeed, k0 = f.dashSpeed; coatOn(f); step(f, t, 1)
  assert(Math.abs(f.defenseMultiplier - d0 * 1.2) < 1e-9 && Math.abs(f._benWalkSpeed - w0 * 0.88) < 1e-9 && Math.abs(f.dashSpeed - k0 * 0.88) < 1e-9)
  const before = f.health; C.applyScaledDamage(f, 100, { source: 'ability', attacker: t }); const coatedTaken = before - f.health
  const g = ben(); const b2 = g.health; C.applyScaledDamage(g, 100, { source: 'ability', attacker: t }); assert(coatedTaken < b2 - g.health, `non-melee ×1.20 defense (${coatedTaken} vs ${b2 - g.health})`)
  ready(f); G.toggleCoat(f, S(f), null); step(f, t, 1); assert(Math.abs(f.defenseMultiplier - d0) < 1e-9 && Math.abs(f._benWalkSpeed - w0) < 1e-9, 'restored')
})
test('4. Frost Coat: FIRE-tagged damage ×1.25 while coated (tag test; a beam so it does not shatter)', () => {
  const f = ben(), t = foe(); coatOn(f); const a = f.health; C.applyScaledDamage(f, 100, { source: 'ability', attacker: t, move: 'fire_ball' }); const fire = a - f.health
  const g = ben(); coatOn(g); const b = g.health; C.applyScaledDamage(g, 100, { source: 'ability', attacker: t, move: 'ki_wave' }); const plain = b - g.health
  assert(Math.abs(fire / plain - 1.25) < 0.05, `${fire} vs ${plain}`); assert.equal(S(f).coat.state, 'on', 'ability damage never shatters')
})
test('4. SHATTER COAT: the first landed hit takes 60%, ends the coat, shard burst 15 to the attacker once; never twice', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); coatOn(f)
  const a = f.health; C.applyScaledDamage(f, 100, { source: 'projectile', attacker: t, move: 'ki_blast' }); const took = a - f.health
  const g = ben(); const b = g.health; C.applyScaledDamage(g, 100, { source: 'projectile', attacker: t, move: 'ki_blast' }); const full = b - g.health
  assert(Math.abs(took / (full / AG_COAT.DEF) - 0.6) < 0.06, `60% (${took} vs ${full})`); assert.equal(S(f).coat.state, 'off'); assert.equal(S(f).coat.shatters, 1)
  const c = f.health; C.applyScaledDamage(f, 100, { source: 'projectile', attacker: t, move: 'ki_blast' }); assert.equal(c - f.health, full, 'no second shatter (full damage)')
  const hp = t.health; world(f, t, 3); assert.equal(S(f).stats.bursts, 1); assert(t.health < hp, 'burst hits the attacker'); assert.equal(S(f).stats.burstHits, 1, 'once')
})
test('4. SHATTER COAT through the real melee pipeline (a Ben-form attacker lands a normal on the coated Arcticguana)', () => {
  const f = ben(), atk = ben('heatblast'); atk.side = 'p2'; atk.facing = -1; atk.x = f.x + f.w + 10; coatOn(f)
  const hp = f.health; ready(atk); assert(C.startMove(atk, 'light', atk.basic_attacks?.light || F.BEN10_ALIEN_POOL.heatblast.basic_attacks.light))
  for (let i = 0; i < 40 && f.health === hp && atk.attacking; i++) { atk.hitstop = 0; C.updateCombat(atk, f, {}, {}); C.resolveAttackHit(atk, f, [], {}) }
  assert(f.health < hp, 'landed'); assert.equal(S(f).coat.state, 'off', 'melee shatters'); assert.equal(S(f).coat.ends.at(-1), 'shatter')
})
test('4. SHATTER COAT ignores block chip, a guarded hit, beams and throws', () => {
  const t = foe()
  for (const [why, opts, blocking] of [['chip', { source: 'block-chip', attacker: t }, false], ['guarded', { source: 'projectile', attacker: t, move: 'ki_blast' }, true],
    ['beam', { source: 'projectile', attacker: t, move: 'kamehameha_beam' }, false], ['throw', { source: 'grab-throw', attacker: t }, false]]) {
    const f = ben(); coatOn(f); f.isBlocking = blocking; C.applyScaledDamage(f, 50, opts); assert.equal(S(f).coat.state, 'on', why) }
})
test('4. Frost Coat resets on swap / revert / KO (fresh state, mods re-applied)', () => {
  const f = ben('arcticguana', LOAD); coatOn(f); F.applyAlien(f, 'heatblast'); F.applyAlien(f, 'arcticguana'); assert.equal(S(f).coat.state, 'off'); assert.equal(S(f).coat.cd, 0)
  assert(Math.abs(f.defenseMultiplier - 1.10) < 1e-9, 'defense back to 1.10')
  const g = ben(); coatOn(g); F.revertToHuman(g); assert.equal(g.omnitrix.formState, null)
})

console.log(`\nARCTICGUANA: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
