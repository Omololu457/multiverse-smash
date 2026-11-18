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

// ── 5-7 Chill → Popsicle → Shatter ──────────────────────────────────────────────────────────────────────────
const { AG_CHILL } = G
import { keys as KEYS } from '../input.js'
const chill = (f, t, cast, { blocked = false, extra = {} } = {}) => ARCTICGUANA.onContact(f, t, { proj: { alien: { ag: 'x', chill: 1, cast, ...extra } }, blocked })
const freezeIt = (f, t) => { chill(f, t, 901); chill(f, t, 902); chill(f, t, 903); assert(G.frozen(S(f)), 'frozen') }
test('5. Chill: one pip per cast (however many ticks), max 3, no pips from blocks, 240f expiry after the last', () => {
  const f = ben(), t = foe(); reset(f, t, 40)
  chill(f, t, 1); chill(f, t, 1); chill(f, t, 1); assert.equal(S(f).chill.pips, 1, 'one per cast')
  chill(f, t, 2, { blocked: true }); assert.equal(S(f).chill.pips, 1, 'blocked: none')
  ARCTICGUANA.onContact(f, t, { proj: { alien: { ag: 'trail', cast: 3 } }, blocked: false }); assert.equal(S(f).chill.pips, 1, 'untagged FX / trail: none')
  chill(f, t, 4); assert.equal(S(f).chill.pips, 2)
  step(f, t, AG_CHILL.EXPIRE - 1); assert.equal(S(f).chill.pips, 2); step(f, t, 1); assert.equal(S(f).chill.pips, 0, '240f after the last')
})
test('6. Popsicle: the 3rd pip encases for 30 ticks — held in place, cannot act, can be hit; input / clock untouched; then released', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); const x0 = t.x, y0 = t.y; freezeIt(f, t); assert.equal(S(f).chill.pips, 0, 'pips consumed')
  const fr0 = FRAME; let held = 0
  for (let i = 0; i < AG_CHILL.FREEZE + 2; i++) { t.vx = 9; t.vy = -5; world(f, t, 1); if (G.frozen(S(f))) { held++; assert.equal(t.x, x0); assert.equal(t.y, y0); assert(t.hitstun > 0 && t.hitstun <= AG_CHILL.HOLD + 1, 'cannot act, hitstun only as needed') } }
  assert.equal(held, AG_CHILL.FREEZE - 1, '30 ticks (the 30th tick releases)'); assert.equal(S(f).chill.ends.at(-1), 'expire'); assert.equal(t.hitstun, 0, 'released, never left stuck')
  assert.equal(FRAME - fr0, AG_CHILL.FREEZE + 2, 'the simulation clock is never touched by the form')
})
test('6. Popsicle: the mash-out shortens it by at most 6 ticks (fresh presses read through api.readControls)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); t.controls = { light: 'KeyJ', heavy: 'KeyK' }; freezeIt(f, t); let n = 0
  while (G.frozen(S(f)) && n < 60) { KEYS.KeyJ = n % 2 === 0; world(f, t, 1); n++ }
  KEYS.KeyJ = false; assert.equal(n, AG_CHILL.FREEZE - AG_CHILL.MASH, `mash capped at 6 (${n})`); assert.equal(S(f).chill.ends.at(-1), 'mash')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 40); u.controls = { light: 'KeyJ' }; freezeIt(g, u); n = 0; KEYS.KeyJ = true
  while (G.frozen(S(g)) && n < 60) { world(g, u, 1); n++ } KEYS.KeyJ = false; assert.equal(n, AG_CHILL.FREEZE - 1, 'a HELD key is one press, not a mash'); delete t.controls; delete u.controls
})
test('6. Popsicle: 420f refreeze immunity (no pips), never refreshed while frozen (a hit ends it instead), no refreeze loop', () => {
  clearProj(); const g = ben(), u = foe(); reset(g, u, 40); freezeIt(g, u); const until = S(g).chill.frozen.until; world(g, u, 2)
  assert.equal(S(g).chill.frozen.until, until, 'the timer is never extended'); chill(g, u, 950)
  assert(!G.frozen(S(g)), 'a Chill hit on a Popsicle is OTHER damage: it ends it'); assert.equal(S(g).chill.ends.at(-1), 'damage'); assert.equal(S(g).chill.pips, 0, 'and adds no pip (immunity)')
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); freezeIt(f, t)
  world(f, t, AG_CHILL.FREEZE + 1); assert(!G.frozen(S(f))); assert.equal(S(f).chill.immuneT, AG_CHILL.IMMUNE - 1, "ended on tick 30, one tick of immunity since")
  chill(f, t, 960); assert.equal(S(f).chill.pips, 0, 'immune: no pips'); step(f, t, AG_CHILL.IMMUNE); chill(f, t, 961); assert.equal(S(f).chill.pips, 1, 'after 420f')
})
test('6. Popsicle: ANY other damage ends it at once (no bonus); an engine escape that clears hitstun ends it; never stuck', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); freezeIt(f, t); world(f, t, 3)
  const hp = t.health; C.applyScaledDamage(t, 10, { source: 'ability' }); world(f, t, 1); assert(!G.frozen(S(f))); assert.equal(S(f).chill.ends.at(-1), 'damage'); assert.equal(hp - t.health, Math.floor(10 * C.GLOBAL_DAMAGE_SCALE), 'no bonus')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 40); freezeIt(g, u); world(g, u, 3); u.hitstun = 0; world(g, u, 1); assert.equal(S(g).chill.ends.at(-1), 'escape')
  clearProj(); const h = ben(), v = foe(); reset(h, v, 40); freezeIt(h, v); world(h, v, 3); F.revertToHuman(h); for (let i = 0; i < 4; i++) world(h, v, 1); assert.equal(v.hitstun, 0, 'his revert: free within the hold window')
})
test('7. Shatter: a clean Heavy on a Popsicle ends it once, +25 × the combo scale; a simultaneous second contact adds nothing', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); freezeIt(f, t); world(f, t, 2); const scale = C.getComboScale(f)
  const hp = t.health; ARCTICGUANA.onContact(f, t, { move: { name: 'heavy', agShatter: true }, blocked: false }); const bonus = hp - t.health
  assert.equal(S(f).chill.shatters, 1); assert(!G.frozen(S(f))); assert.equal(S(f).chill.ends.at(-1), 'shatter')
  const exp = Math.floor(AG_CHILL.SHATTER * scale * f.damageMultiplier * C.GLOBAL_DAMAGE_SCALE); assert(Math.abs(bonus - exp) <= 1, `+25 × combo scale × his dmg × the global scale (${bonus} vs ${exp})`)
  const hp2 = t.health; ARCTICGUANA.onContact(f, t, { move: { name: 'heavy', agShatter: true }, blocked: false }); assert.equal(t.health, hp2, 'no stacking'); assert.equal(S(f).chill.shatters, 1)
})
test('7. Shatter: the real Heavy (combat pipeline) shatters; the Shatter Coat burst qualifies; a blocked Heavy does not', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); freezeIt(f, t); world(f, t, 2); melee(f, t, 'heavy'); assert.equal(S(f).chill.ends.at(-1), 'shatter')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 10); freezeIt(g, u); world(g, u, 2); ARCTICGUANA.onContact(g, u, { proj: { alien: { ag: 'coatBurst', chill: 1, shatter: true, cast: 77 } }, blocked: false }); assert.equal(S(g).chill.ends.at(-1), 'shatter')
  assert.equal(S(g).chill.pips, 0, 'the shatter starts immunity: the burst adds no pip')
  clearProj(); const h = ben(), v = foe(); reset(h, v, 10); freezeIt(h, v); world(h, v, 2); ARCTICGUANA.onContact(h, v, { move: { name: 'heavy', agShatter: true }, blocked: true }); assert(G.frozen(S(h)), 'blocked: nothing')
})
test('7. the Shatter Coat burst (live) adds 1 Chill on a clean hit', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); coatOn(f); C.applyScaledDamage(f, 40, { source: 'projectile', attacker: t, move: 'ki_blast' }); world(f, t, 3)
  assert.equal(S(f).stats.burstHits, 1); assert.equal(S(f).chill.pips, 1)
})

// ── 8-13 the specials, 14 the Ultimate ─────────────────────────────────────────────────────────────────────
const { AG_BREATH, AG_SHARD, AG_CLOUD, AG_SLIDE, AG_BEAM, AG_ICICLE, AG_ULT } = G
const runCast = (f, t, n, input = {}) => { let k = 0; while (k < n) { world(f, t, 1, input); k++ } }
test('8. ICE BREATH: 14f startup, 5 ticks (one per 5f), +1 Chill per cast, cost 10, committed (no second stream)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 80); f.energy = 100; assert(cast(f, t, 'N')); assert.equal(100 - f.energy, AG_COST.breath)
  assert.equal(cast(f, t, 'N'), false, 'one on screen'); const hp = t.health
  runCast(f, t, AG_BREATH.STARTUP - 1); assert.equal(S(f).stats.breathTicks, 0, 'nothing before f14')
  runCast(f, t, 60); assert.equal(S(f).lastBreath.ticks, AG_BREATH.TICKS); assert.equal(S(f).lastBreath.ext, false); assert(hp - t.health > 0); assert.equal(S(f).chill.pips, 1, 'one pip for 5 ticks')
})
test('8. ICE BREATH: holding P extends the stream by up to 20f (+4 Power once); 18f recovery', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); f.energy = 100; assert(cast(f, t, 'N')); const e = f.energy
  let n = 0; while (S(f).breath && n < 200) { world(f, t, 1, { special: true }); n++ }
  assert.equal(e - f.energy, AG_COST.breathHold); assert.equal(S(f).lastBreath.streamEnd, AG_BREATH.BASE_END + AG_BREATH.EXT); assert.equal(S(f).lastBreath.ticks, AG_BREATH.TICKS + 4)
  assert.equal(n, AG_BREATH.BASE_END + AG_BREATH.EXT + AG_BREATH.RECOVERY, 'stream + 18f recovery')
})
test('9. ICE SHARD: two shards in a fan, 480 px, 22 each, ONE hit per target, one volley on screen, +1 Chill', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 200); f.energy = 100; assert(cast(f, t, 'B'))
  runCast(f, t, AG_SHARD.RELEASE); const sh = A.activeProjectiles.filter(p => p.alien && p.alien.ag === 'shard'); assert.equal(sh.length, 2); assert(sh[0].vy !== sh[1].vy, 'a fan')
  assert.equal(Math.round((sh[0].lifetime + 1) * AG_SHARD.SPEED), AG_SHARD.RANGE, "480 px (one frame already flown)")
  ready(f); assert.equal(cast(f, t, 'B'), false, 'one volley on screen'); const hp = t.health
  runCast(f, t, 50); assert.equal(S(f).stats.shardHits, 1, 'one hit max'); assert.equal(S(f).chill.pips, 1)
  assert.equal(hp - t.health, Math.floor(AG_SHARD.DMG * DM * C.GLOBAL_DAMAGE_SCALE * 1) || hp - t.health); assert(near(hp - t.health, AG_SHARD.DMG * DM * C.GLOBAL_DAMAGE_SCALE))
})
test('10. FROST CLOUD: settles 200 px ahead for 120f, one per owner; first contact 15 + a ×0.8 run/dash slow for 60f once, consumed; no pips', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); f.energy = 100; assert(cast(f, t, 'U')); runCast(f, t, AG_CLOUD.SETTLE)
  const cl = S(f).cloud; assert(cl); assert(Math.abs(cl.x - (cx(f) + f.facing * AG_CLOUD.AHEAD)) <= 1); runCast(f, t, 20); ready(f); assert(cast(f, t, 'U')); runCast(f, t, AG_CLOUD.SETTLE)
  assert(S(f).cloud && S(f).cloud.cast !== cl.cast, 'a recast replaces it (one per owner)'); runCast(f, t, AG_CLOUD.LIFE + 2); assert.equal(S(f).cloud, null, 'expires after 120f')
  clearProj(); const g = ben(), u = foe(); far(g, u); g.energy = 100; assert(cast(g, u, 'U')); runCast(g, u, AG_CLOUD.SETTLE); const c2 = S(g).cloud
  u.x = c2.x - u.w / 2; const hp = u.health; world(g, u, 3); assert.equal(S(g).cloud, null, 'consumed'); assert.equal(S(g).stats.cloudHits, 1); assert(near(hp - u.health, AG_CLOUD.DMG * DM * C.GLOBAL_DAMAGE_SCALE))
  assert.equal(S(g).chill.pips, 0, 'no pips'); assert(u._benSlow && u._benSlow.k === AG_CLOUD.SLOW)
  ready(u); u.hitstun = 0; u.x = 300; physics.moveFighter(u, { d: true }, CONTROLS); const slowVx = u.vx; u.vx = 0; delete u._benSlow
  const v = foe(); v.x = 300; physics.moveFighter(v, { d: true }, CONTROLS); assert(Math.abs(slowVx - v.vx * AG_CLOUD.SLOW) < 0.01, `walk ×0.8 (${slowVx} vs ${v.vx})`)
  runCast(g, u, AG_CLOUD.SLOW_T + 3); assert(!(u._benSlow && u._benSlow.ttl > 0), 'lapses after 60f'); assert.equal(S(g).stats.slows, 1, 'once')
})
test('11. ICE SLIDE: 360 px low slide (real travel), ducks projectiles f6-24, no invulnerability, 50 on hit, finisher +1 Chill', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); f.energy = 100; S(f).dashTapT = S(f).t; assert(cast(f, t, 'F')); const x0 = f.x
  let ducked = 0; for (let i = 0; i < AG_SLIDE.TOTAL + 2; i++) { world(f, t, 1); if (G.slideLow(S(f))) ducked++ }
  assert.equal(Math.round(Math.abs(f.x - x0)), AG_SLIDE.TRAVEL, `travel ${f.x - x0}`); assert.equal(ducked, AG_SLIDE.LOW[1] - AG_SLIDE.LOW[0] + 1)
  clearProj(); const g = ben(), u = foe(); far(g, u); g.energy = 100; S(g).dashTapT = S(g).t; assert(cast(g, u, 'F')); runCast(g, u, 8)
  assert.equal(ARCTICGUANA.evade(g, { proj: {} }), true, 'projectiles ducked'); assert.equal(ARCTICGUANA.evade(g, { move: {} }), false, 'melee still hits (no invulnerability)')
  clearProj(); const h = ben(), v = foe(); reset(h, v, 120); h.energy = 100; S(h).dashTapT = S(h).t; assert(cast(h, v, 'F')); const hp = v.health; runCast(h, v, 30)
  assert.equal(S(h).stats.slideHits, 1, 'one hit'); assert(near(hp - v.health, AG_SLIDE.DMG * DM * C.GLOBAL_DAMAGE_SCALE)); assert.equal(S(h).chill.pips, 1)
})
test('11. ICE SLIDE shatters a Popsicle', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 120); freezeIt(f, t); world(f, t, 2); f.energy = 100; S(f).dashTapT = S(f).t; assert(cast(f, t, 'F')); runCast(f, t, 20)
  assert.equal(S(f).chill.ends.at(-1), 'shatter'); assert.equal(S(f).chill.shatters, 1)
})
test('12. FREEZE BEAM: 22f startup, 3 ticks × 12 (only the first adds Chill), 420 px, hold 27f → up to 40f held, 26f recovery', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 300); f.energy = 100; assert(cast(f, t, 'D')); assert.equal(100 - f.energy, AG_COST.beam)
  runCast(f, t, AG_BEAM.STARTUP); assert.equal(S(f).stats.beamTicks, 0, 'nothing in startup'); const hp = t.health
  let n = AG_BEAM.STARTUP; while (S(f).beam && n < 200) { world(f, t, 1); n++ }
  assert.equal(S(f).lastBeam.ticks, 3); assert.equal(S(f).lastBeam.hold, AG_BEAM.HOLD_MIN); assert.equal(n, AG_BEAM.STARTUP + AG_BEAM.HOLD_MIN + AG_BEAM.RECOVERY)
  assert.equal(S(f).chill.pips, 1, 'first tick only'); assert(near(hp - t.health, 36 * DM * C.GLOBAL_DAMAGE_SCALE * 0.9), `${hp - t.health}`)
  clearProj(); const g = ben(), u = foe(); far(g, u); g.energy = 100; assert(cast(g, u, 'D')); n = 0; while (S(g).beam && n < 300) { world(g, u, 1, { special: true }); n++ }
  assert.equal(S(g).lastBeam.hold, AG_BEAM.HOLD_MAX, 'held: capped at 40f')
})
test('13. ICICLE DROP: air only, 48 on hit, once per airtime, no jump refill, +1 Chill, cosmetic landing pop', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 30); f.energy = 100; f.y -= 160; f.onGround = f.grounded = false; f.jumpCount = 2; const j = f.jumpCount
  assert(cast(f, t, 'N')); assert.equal(S(f).icicle != null, true); assert.equal(cast(f, t, 'N'), false, 'busy'); const hp = t.health
  let n = 0; while (S(f).icicle && n < 80) { world(f, t, 1); n++ }
  assert(S(f).lastIcicle.hit, 'hit'); assert(near(hp - t.health, AG_ICICLE.DMG * DM * C.GLOBAL_DAMAGE_SCALE), `${hp - t.health}`); assert.equal(S(f).chill.pips, 1)
  assert.equal(f.jumpCount, j, 'no jump refill from the move'); assert.equal(A.activeProjectiles.filter(p => p.owner === f && p.alien && p.alien.ag === 'icicle' && p.lifetime > 0).length, 0, 'no landing hitbox')
  const g = ben(); g.energy = 100; g.y -= 200; g.onGround = g.grounded = false; S(g).icicleUsed = true; ready(g); assert.equal(cast(g, foe(), 'N'), false, 'once per airtime')
})
const ultRun = (f, t) => { ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t)), 'ult'); let n = 0; while ((S(f).ult || n < 20) && n < 400) { world(f, t, 1); n++ } return n }
test('14. ULTIMATE: 55 Power; a whiff = no cinematic, 60f recovery', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); ultRun(f, t); assert.equal(100 - f.energy, AG_COST.ultimate); assert.equal(S(f).lastUlt.captured, false); assert.equal(t.health, t.maxHealth)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 100); u.isBlocking = true; ultRun(g, u); assert.equal(S(g).lastUlt.captured, false, 'blocked: no cinematic')
})
test('14. ULTIMATE: clean opener → popsicle, 3 hashed carves × 25, final 125 = 240 raw, no Shatter bonus, released unfrozen with immunity, positions restored, 100f lockout', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 100); freezeIt(f, t); world(f, t, 1); const hp = t.health; ultRun(f, t); const L = S(f).lastUlt
  assert(L.captured); assert.deepEqual(L.hits, [AG_ULT.OPENER, 25, 25, 25, AG_ULT.FINAL]); assert.equal(L.raw, 240); assert.equal(S(f).chill.shatters, 0, 'no Shatter bonus')
  assert(!G.frozen(S(f))); assert(S(f).chill.immuneT > AG_CHILL.IMMUNE - 30, 'refreeze immunity started'); assert.equal(f.x, L.home.x); assert(Math.abs(t.x - L.thome.x) <= 6, "restored, then one frame of the release launch")
  assert(f.attackCooldown > 0 && f.attackCooldown <= AG_ULT.LOCKOUT); assert(hp - t.health > 0)
  const c1 = G.ultCarve(L.seed, L.f0, L.pi), c2 = G.ultCarve(L.seed, L.f0, L.pi); assert.deepEqual(c1, c2, 'carve angles are a pure hash')
  assert.notDeepEqual(G.ultCarve(L.seed + 1, L.f0, L.pi), c1)
  assert.equal(A.activeProjectiles.filter(p => p.owner === f && p.lifetime > 0).length, 0, 'no persistent hazards')
})

const stubCtx = () => new Proxy({ globalAlpha: 1 }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true) })
test('render: every move / the ult draw without throwing and drawing never changes GAME_STATE', () => {
  const c = stubCtx(); const run = (f, t, n, input = {}) => { for (let i = 0; i < n; i++) { world(f, t, 1, input); const a = JSON.stringify(S(f)), x = [t.x, t.health, f.x]
    G.drawArcticguanaFx(c, f, FRAME, t); G.drawArcticguanaHud(c, f, { x: 0, enY: 0, enH: 8, pbw: 200, flip: false })
    assert.equal(JSON.stringify(S(f)), a); assert.deepEqual([t.x, t.health, f.x], x) } }
  for (const dir of ['N', 'B', 'U', 'D']) { clearProj(); const f = ben(), t = foe(); reset(f, t, 100); f.energy = 100; assert(cast(f, t, dir), dir); run(f, t, 80) }
  clearProj(); const f = ben(), t = foe(); reset(f, t, 120); f.energy = 100; S(f).dashTapT = S(f).t; assert(cast(f, t, 'F')); run(f, t, 45)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 30); g.energy = 100; g.y -= 160; g.onGround = g.grounded = false; assert(cast(g, u, 'N')); run(g, u, 40)
  clearProj(); const h = ben(), v = foe(); reset(h, v, 100); freezeIt(h, v); run(h, v, 3); ready(h); h.energy = 100; assert(A.triggerUltimate(h, ctxOf(h, v))); run(h, v, 200)
  assert(S(h).lastUlt && S(h).lastUlt.captured)
})

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  breath: AG_BREATH.DMG * AG_BREATH.TICKS, beam: AG_BEAM.DMG * 3, shatter: AG_CHILL.SHATTER }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 90],
  ['2. Low, Heavy, Ice Breath', ['low', 'heavy', 'breath'], 112],
  ['3. Freeze Beam → Popsicle, Heavy Shatter', ['beam', 'heavy', 'shatter'], 120],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Ice Breath (5 ticks, +1 Chill)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 60); const hp = t.health; f.energy = 100; assert(cast(f, t, 'N'), 'Breath'); world(f, t, AG_BREATH.BASE_END + AG_BREATH.RECOVERY + 1); d.push(hp - t.health)
  assert(d[2] > 0); assert.equal(S(f).lastBreath.ticks, AG_BREATH.TICKS); assert.equal(S(f).chill.pips, 1); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 3 live: Freeze Beam freezes (3rd pip), the beam breaks off, a Heavy reaches the Popsicle in time and Shatters', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 100); chill(f, t, 801); chill(f, t, 802); f.energy = 100; const hp0 = t.health; assert(cast(f, t, 'D'), 'Beam')
  let n = 0; while (!G.frozen(S(f)) && n < 60) { world(f, t, 1); n++ } assert(G.frozen(S(f)), 'the first beam tick freezes')
  assert.equal(S(f).beam, null, 'the freezing cast broke off'); assert(S(f).lastBeam.snapped); const d = [hp0 - t.health]
  let w = 0; while ((f.attackCooldown > 0 || f._benPowerCommit > 0) && w < 60) { world(f, t, 1); w++ }
  assert(G.frozen(S(f)), 'still frozen when he can act'); assert(w + BA.heavy.startup < AG_CHILL.FREEZE, `Heavy lands inside the Popsicle (${w}+${BA.heavy.startup} < 30)`)
  reset(f, t, 10); S(f).chill.frozen.x = t.x; S(f).chill.frozen.y = t.y; d.push(melee(f, t, 'heavy'))
  assert.equal(S(f).chill.ends.at(-1), 'shatter'); assert.equal(S(f).chill.shatters, 1); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b), '(heavy incl. Shatter)')
})
test('the freezing cast breaks off: Breath / Slide snap to 8f and their later ticks never melt the Popsicle they made', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 80); chill(f, t, 811); chill(f, t, 812); f.energy = 100; assert(cast(f, t, 'N'))
  let n = 0; while (!G.frozen(S(f)) && n < 40) { world(f, t, 1); n++ } assert.equal(S(f).breath, null); assert.equal(S(f).lastBreath.ticks, 1)
  world(f, t, AG_CHILL.SNAP); assert(G.frozen(S(f)), 'not melted by its own stream'); assert.equal(f.attackCooldown, 0, 'free after the 8f snap')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 120); chill(g, u, 821); chill(g, u, 822); g.energy = 100; S(g).dashTapT = S(g).t; assert(cast(g, u, 'F'))
  n = 0; while (!G.frozen(S(g)) && n < 40) { world(g, u, 1); n++ } assert(G.frozen(S(g))); world(g, u, AG_CHILL.SNAP + 1); assert.equal(S(g).slide, null)
})
// ── 11 / 12 / 14 lifecycle / slot → PICK FIVE / Dial / HUD / Vow / determinism ─────────────────────────────
test('lifecycle: swap / revert / KO / rematch clear Coat, Chill, the Popsicle, the cloud and casts (fresh formState)', () => {
  const dirty = (f, t) => { coatOn(f); freezeIt(f, t); S(f).cloud = { x: 0, y: 0, t: 50, cast: 1 } }
  const t = foe(); const f = ben('arcticguana', LOAD); dirty(f, t); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null)
  for (let i = 0; i < 4; i++) world(ben(), t, 1); assert.equal(t.hitstun, 0, 'the held opponent is never left stuck')
  const k = ben(); dirty(k, foe()); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null)
  const g = ben('arcticguana', LOAD); dirty(g, foe()); F.applyAlien(g, 'heatblast'); F.applyAlien(g, 'arcticguana'); assert(!G.frozen(S(g))); assert.equal(S(g).cloud, null); assert.equal(S(g).coat.state, 'off')
  const r = ben(); assert.equal(S(r).chill.pips, 0); assert.equal(S(r).coat.state, 'off', 'rematch: fresh')
})
test('14. slot → PICK FIVE: slot count stays 5, Arcticguana READY + pickable (catalog slot 17, contiguous), Feedback (16) untouched', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('arcticguana'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 17); assert.equal(d.displayName, 'Arcticguana')
  const ready = BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready'); assert.deepEqual(ready.map(x => x.slot).sort((a, b) => a - b), ready.map((_, i) => i + 1), 'ready slots contiguous')
  assert.equal(getAlienDefinition('feedback_ov').slot, 16, 'slot 16 = Feedback, never overwritten'); assert.equal(getAlienDefinition('humongousaur').slot, 15)
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin', 'wildvine', 'jetray', 'diamondhead_ov', 'upgrade_ov', 'humongousaur', 'feedback_ov']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'arcticguana').length, 1); assert(getAvailableAlienKeys(false).includes('arcticguana'))
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet source: unknown, add credit if known/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit placeholder')
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Arcticguana'); assert.equal(f.health, 950, 'shared health')
})
test('14. Omnitrix Dial: Arcticguana picked into the last slot — same cost as any slot, no clock change', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'arcticguana'], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    const c = { seed: 1, frame: 0, playerIndex: 0 }; assert(F.ben10TransformOrSwap(f, slot, c)); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); assert.equal(c.frame, 0, 'clock untouched'); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, 'arcticguana'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
  assert.equal(S(a.f).coat.state, 'off'); assert.equal(S(a.f).chill.pips, 0)
})
test('14. HUD: the Frost bar stays inside the player bar (no overflow), both sides, every coat state', () => {
  for (const flip of [false, true]) for (const st of ['off', 'forming', 'on', 'cd']) {
    const f = ben(); const co = S(f).coat; if (st === 'cd') co.cd = 120; else { co.state = st; co.t = st === 'forming' ? 7 : 200 }
    let minX = Infinity, maxX = -Infinity
    const ctx = { save() {}, restore() {}, fillRect(x, y, w) { minX = Math.min(minX, x); maxX = Math.max(maxX, x + w) }, fillText(s, x) { const w = s.length * 4.2; const x0 = this.textAlign === 'right' ? x - w : x; minX = Math.min(minX, x0); maxX = Math.max(maxX, x0 + w) }, strokeRect() {} }
    const x = 100, pbw = 120; G.drawArcticguanaHud(ctx, f, { x, enY: 40, enH: 8, pbw, flip }); assert(minX >= x && maxX <= x + 8 + pbw + 1, `flip ${flip} ${st}: ${minX}..${maxX}`)
  }
})
test('14. Vow pick includes Arcticguana (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'arcticguana'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('arcticguana') && picks.size === L.length)
})
test('14. same-seed determinism: an identical scripted Arcticguana sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light'); melee(f, t, 'heavy')
    reset(f, t, 80); f.energy = 100; cast(f, t, 'N'); world(f, t, 60); reset(f, t, 200); cast(f, t, 'B'); world(f, t, 50)
    reset(f, t, 120); S(f).dashTapT = S(f).t; f.energy = 100; cast(f, t, 'F'); world(f, t, 45); reset(f, t, 100); cast(f, t, 'D'); world(f, t, 80)
    reset(f, t, 100); f.energy = 100; cast(f, t, 'U'); world(f, t, 40); reset(f, t, 100); ready(f); f.energy = 100; A.triggerUltimate(f, ctxOf(f, t)); world(f, t, 200); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data mid-cast (breath, beam hold, cloud, slide, Popsicle, ult cinematic)', () => {
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  clearProj(); const f = ben(), t = foe(); far(f, t); f.energy = 100; cast(f, t, 'N'); world(f, t, 20); assert(plain(S(f)), 'breath')
  clearProj(); const g = ben(), u = foe(); far(g, u); g.energy = 100; cast(g, u, 'D'); world(g, u, 30); assert(S(g).beam.phase === 'hold'); assert(plain(S(g)), 'beam')
  clearProj(); const h = ben(), v = foe(); far(h, v); h.energy = 100; cast(h, v, 'U'); world(h, v, 20); assert(S(h).cloud); assert(plain(S(h)), 'cloud')
  clearProj(); const k = ben(), w = foe(); far(k, w); k.energy = 100; S(k).dashTapT = S(k).t; cast(k, w, 'F'); world(k, w, 10); assert(plain(S(k)), 'slide')
  clearProj(); const m = ben(), x = foe(); reset(m, x, 40); freezeIt(m, x); world(m, x, 4); assert(plain(S(m)), 'popsicle')
  clearProj(); const u2 = ben(), v2 = foe(); reset(u2, v2, 100); ready(u2); u2.energy = 100; A.triggerUltimate(u2, ctxOf(u2, v2)); world(u2, v2, 80)
  assert(S(u2).ult && S(u2).ult.phase === 'carve', 'mid-cinematic'); assert(plain(S(u2)), 'ult')
})
test('no Math.random / gameRng in arcticguana.js / arcticguanaAssets.js', () => {
  for (const p of ['../arcticguana.js', '../arcticguanaAssets.js']) { const src = fs.readFileSync(new URL(p, import.meta.url), 'utf8'); assert(!/Math\.random|gameRng/.test(src), p) }
})

console.log(`\nARCTICGUANA: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
