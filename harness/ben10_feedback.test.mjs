// FEEDBACK — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_feedback.test.mjs
// Design totals: raw move damage × the form's damage mod (0.95) × 0.85^n (85% per move), within ±20%. The live routes then run
// the real engine (its own curve) and assert the mechanics.
// Test "slot 15 + Omnitrix Dial": PICK FIVE (owner decision) — the dial is positional over the 5 picked aliens, so the slot is
// catalog metadata (16: Humongousaur took 15 on main; ready slots stay contiguous); Feedback is picked into the loadout and reached with the Dial (↓↓ + slot key).
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
import * as F from '../fighters.js'
import { clearBenFormState, handleBenKO } from '../ben10State.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as U from '../feedback.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'feedback_ov', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + f.w + gap; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false; t.knockdownState = false; t.knockdownTimer = 0; t.invulnTimer = 0 }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }
const step = (f, t, n = 1, tKeys = {}, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
  A.tickBenAlienForm(f, input, ctxOf(f, t)); physics.moveFighter(t, tKeys, CONTROLS); physics.applyGravity(t); timers(f); timers(t) } }
const cast = (f, t, dir) => { ready(f); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const far = (f, t) => { t.x = f.x + 1000 }
// an opponent projectile flying at x (world() moves only his; this moves theirs)
const shot = (t, x, y, extra = {}) => { const p = { name: 'ki_blast', owner: t, x, y, vx: -8, vy: 0, w: 20, h: 20, damage: 30, lifetime: 120, ...extra }; A.activeProjectiles.push(p); return p }
const { FEEDBACK, FB_COST, FB_CHARGE } = U
const BA = FEEDBACK.basic_attacks, DM = FEEDBACK.mods.damage
const LOAD = ['heatblast', 'goop', 'xlr8', 'upgrade_ov', 'feedback_ov']
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
const cx = o => o.x + (o.w || 60) / 2
const deploy = (f, t) => { assert(cast(f, t, 'D'), 'Deploy Terminal'); step(f, t, UP_TERM.TOTAL); return S(f).term }
const online = (f, t) => { const w = deploy(f, t); step(f, t, UP_TERM.BOOT - (UP_TERM.TOTAL - UP_TERM.STARTUP)); assert(U.termOnline(S(f)), 'online'); return w }


// ── 3 Charge ──────────────────────────────────────────────────────────────────────────────────────────────
test('3. Charge: 0–100; a clean electric normal +4, blocked = nothing; idle 180f → −1/f', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 20)
  assert.equal(S(f).charge, 0, 'starts empty')
  melee(f, t, 'light'); assert.equal(S(f).charge, FB_CHARGE.ELECTRIC, 'jab +4')
  reset(f, t, 20); melee(f, t, 'light', { block: true }); assert.equal(S(f).charge, FB_CHARGE.ELECTRIC, 'blocked: no gain')
  U.addCharge(S(f), 500); assert.equal(S(f).charge, 100, 'capped at 100')
  far(f, t); step(f, t, FB_CHARGE.IDLE); assert.equal(S(f).charge, 100, 'no decay inside 180f')
  step(f, t, 10); assert.equal(S(f).charge, 90, '−1/f after 180f idle')
})
test('3. Charge: cleared on swap, revert and KO (formState reset)', () => {
  const f = ben('feedback_ov', LOAD); U.addCharge(S(f), 60); assert.equal(S(f).charge, 60)
  assert(F.applyAlien(f, 'feedback_ov')); assert.equal(S(f).charge, 0, 're-apply / swap → fresh state')
  U.addCharge(S(f), 60); clearBenFormState(f); assert.equal(U.fbState(f), null, 'revert clears the form state')
  const g = ben('feedback_ov', LOAD); U.addCharge(S(g), 60); handleBenKO(g); assert.equal(U.fbState(g), null, 'KO clears the form state')
})

// ── 4 Plug Guard ─────────────────────────────────────────────────────────────────────────────────────────────
const { FB_GUARD } = U
const guard = f => { ready(f); return FEEDBACK.blockHeavy(f) }
const hitHim = (f, t, extra = {}) => { clearProj(); const p = shot(t, f.x + f.w / 2, f.y + f.h / 2, extra); C.resolveProjectileHitsMulti(A.activeProjectiles, [f]); return p }
test('4. Plug Guard: Block + Heavy, cost 0, 10f window, 5 s cooldown', () => {
  const f = ben(), t = foe(); far(f, t); const e = f.energy
  assert(guard(f)); assert.equal(f.energy, e, 'cost 0'); assert.equal(S(f).guard.t, FB_GUARD.WINDOW); assert.equal(guard(f), false, 'cooldown')
  step(f, t, FB_GUARD.CD - 1); assert.equal(guard(f), false, 'still cooling at 299f'); step(f, t, 1); assert(guard(f), 'ready after 300f')
})
test('4. Plug Guard: a projectile → 0 damage, no hitstun, Charge +0.5 × dmg, stored record (dmg / speed / size / tags / owner / look)', () => {
  const f = ben(), t = foe(); far(f, t); guard(f); const hp = f.health
  hitHim(f, t, { damage: 30, vx: -9, w: 24, h: 22, color: '#f80', fire: true })
  assert.equal(f.health, hp, '0 damage'); assert.equal(f.hitstun || 0, 0, 'no hitstun'); assert.equal(A.activeProjectiles.length, 0, 'consumed')
  assert.equal(S(f).charge, 15, '+0.5 × 30'); const r = S(f).stored
  assert(r, 'stored'); assert.deepEqual([r.damage, r.speed, r.w, r.h, r.owner, r.tags.fire, r.look.color], [30, 9, 24, 22, 'p2', true, '#f80'])
})
test('4. Plug Guard: gain capped at +30 per absorb', () => {
  const f = ben(), t = foe(); far(f, t); guard(f); hitHim(f, t, { damage: 200 }); assert.equal(S(f).charge, FB_GUARD.MAX_GAIN)
})
test('4. Plug Guard: outside the window the projectile hits him', () => {
  const f = ben(), t = foe(); far(f, t); guard(f); step(f, t, FB_GUARD.WINDOW); const hp = f.health; hitHim(f, t); assert(f.health < hp, 'hit after 10f')
})
test('4. Plug Guard: physical melee, throws, unblockables and ultimates pass; element-tagged melee is absorbed', () => {
  const f = ben(), t = foe(); far(f, t); guard(f)
  assert.equal(FEEDBACK.absorb(f, { move: { damage: 40 }, attacker: t }), false, 'physical melee passes')
  assert.equal(FEEDBACK.absorb(f, { move: { damage: 40, fire: true, isGrab: true }, attacker: t }), false, 'throw passes')
  assert.equal(FEEDBACK.absorb(f, { move: { damage: 40, electric: true, unblockable: true }, attacker: t }), false, 'unblockable passes')
  assert.equal(FEEDBACK.absorb(f, { proj: { damage: 40, vx: -8, owner: t, isUltimate: true }, attacker: t }), false, 'ultimate / cinematic passes')
  assert.equal(FEEDBACK.absorb(f, { proj: { damage: 40, vx: 0, vy: 0, owner: t, rectHitbox: true }, attacker: t }), false, 'stationary physical box passes')
  assert.equal(FEEDBACK.absorb(f, { move: { damage: 40, fire: true }, attacker: t }), true, 'fire melee absorbed'); assert.equal(S(f).stored, null, 'melee never stored')
  assert.equal(S(f).charge, 20)
})
test('4. Plug Guard: a new absorb replaces the record and the old one\'s value goes to Charge; 180f → dissipates into Charge', () => {
  const f = ben(), t = foe(); far(f, t); guard(f)
  hitHim(f, t, { damage: 30 }); const a = S(f).stored; hitHim(f, t, { damage: 20, name: 'second' })
  assert.equal(S(f).stored.name, 'second'); assert.notEqual(S(f).stored.id, a.id); assert.equal(S(f).charge, 15 + 10 + 15, 'gain 15 + gain 10 + old value 15')
  step(f, t, FB_GUARD.STORE - 1); assert(S(f).stored, 'still held at 179f'); const c = S(f).charge
  step(f, t, 1); assert.equal(S(f).stored, null, 'dissipated'); assert.equal(S(f).charge, c + 10, 'its value into Charge')
})
test('4. Plug Guard: beams absorbed per tick while Block is held (≤30f), half gain, never stored', () => {
  const f = ben(), t = foe(); far(f, t); guard(f); const hp = f.health
  const tickBeam = () => hitHim(f, t, { damage: 20, beam: true, vx: 0 })
  tickBeam(); assert.equal(S(f).charge, 5, 'half gain (0.5 × 20 × 0.5)'); assert.equal(S(f).stored, null, 'no record')
  for (let i = 0; i < 40; i++) { step(f, t, 1, {}, { block: true }); tickBeam() }
  assert(f.health < hp, 'past 30f the beam gets through'); const absorbed = S(f).stats.absorbedBeams
  assert(absorbed >= 29 && absorbed <= 32, 'about 30f of ticks absorbed: ' + absorbed)
  const g = ben(); far(g, t); guard(g); hitHim(g, t, { damage: 20, beam: true, vx: 0 }); step(g, t, FB_GUARD.WINDOW + 2)   // Block released
  const h2 = g.health; hitHim(g, t, { damage: 20, beam: true, vx: 0 }); assert(g.health < h2, 'released Block → beam hits')
})
test('4. Plug Guard: loop guard — a RETURNED projectile is never re-absorbed by a Feedback; atomic (one absorb per projectile)', () => {
  const f = ben(), t = foe(); far(f, t); guard(f)
  assert.equal(FEEDBACK.absorb(f, { proj: { damage: 30, vx: -8, owner: t, fbReturned: true }, attacker: t }), false, 'returned → passes')
  const p = { damage: 30, vx: -8, owner: t }
  assert.equal(FEEDBACK.absorb(f, { proj: p, attacker: t }), true); assert.equal(FEEDBACK.absorb(f, { proj: p, attacker: t }), false, 'same projectile twice → no')
  assert.equal(S(f).stats.absorbed, 1)
})

// ── 5 Drain → Blackout ───────────────────────────────────────────────────────────────────────────────────────
const { FB_DRAIN } = U
const pip = (f, t, cast, blocked = false) => FEEDBACK.onContact(f, t, { proj: { alien: { fb: 'orb', pip: true, cast }, electric: true }, blocked })
test('5. Drain: +1 pip per clean cast (once per cast id), none on block, max 3, expire 240f after the last', () => {
  const f = ben(), t = foe(); far(f, t)
  pip(f, t, 1); pip(f, t, 1); assert.equal(S(f).drain.pips, 1, 'once per cast'); pip(f, t, 2, true); assert.equal(S(f).drain.pips, 1, 'blocked: no pip')
  pip(f, t, 3); assert.equal(S(f).drain.pips, 2); step(f, t, FB_DRAIN.EXPIRE - 1); assert.equal(S(f).drain.pips, 2); step(f, t, 1); assert.equal(S(f).drain.pips, 0, 'expired')
})
test('5. Blackout: 3 pips → 240f, no energy regen, hit meter gains halved, spending works, no clock / input change', () => {
  const f = ben(), t = foe(); far(f, t); t.energy = 40; const fr = FRAME
  pip(f, t, 11); pip(f, t, 12); pip(f, t, 13); assert(U.blackedOut(S(f)), 'blackout on the 3rd'); assert.equal(S(f).drain.pips, 0)
  step(f, t, 1); t.energy += 0.06; step(f, t, 1); assert.equal(t.energy, 40, 'regen removed')
  t.energy += 1.2; step(f, t, 1); assert.equal(t.energy, 40, 'charge-button rate removed')
  t.energy += 6; step(f, t, 1); assert.equal(t.energy, 43, 'a +6 hit gain is halved')
  t.energy -= 20; step(f, t, 1); assert.equal(t.energy, 23, 'spending still works')
  assert.equal(t.hitstun, 0); assert.equal(t.slowmo ?? t.timeScale ?? 1, 1, 'no clock change'); assert(FRAME > fr)
})
test('5. Blackout: no refresh while active; ends after 240f, then 360f immunity (pips can\'t build)', () => {
  const f = ben(), t = foe(); far(f, t); pip(f, t, 21); pip(f, t, 22); pip(f, t, 23)
  pip(f, t, 24); assert.equal(S(f).drain.pips, 0, 'no pips while active'); step(f, t, FB_DRAIN.BLACKOUT - 1); assert(U.blackedOut(S(f)))
  step(f, t, 1); assert(!U.blackedOut(S(f))); assert.equal(S(f).drain.immuneT, FB_DRAIN.IMMUNE)
  pip(f, t, 25); assert.equal(S(f).drain.pips, 0, 'immune'); t.energy = 10; step(f, t, 1); t.energy += 0.5; step(f, t, 1); assert.equal(t.energy, 10.5, 'regen back')
  step(f, t, FB_DRAIN.IMMUNE); pip(f, t, 26); assert.equal(S(f).drain.pips, 1, 'pips again after immunity')
})

// ── 6 Moves ──────────────────────────────────────────────────────────────────────────────────────────────────
const { FB_ORB, FB_SIPHON, FB_FIRE, FB_BURST, FB_DASH, FB_VOLT, FB_ULT } = U
const mine = (f, k) => A.activeProjectiles.filter(p => p.owner === f && p.alien && p.alien.fb === k)
const setCharge = (f, n) => { S(f).charge = n; S(f).chargeT = 0 }
test('6. Normals: frame data (startup / damage / on-block) as briefed, electric-tagged, Low hits low, Heavy 150 px', () => {
  const want = { light: [5, 16, 1], heavy: [13, 48, -5], down: [7, 22, -3], up: [11, 42, -9], air: [7, 26, 2] }
  for (const [k, [st, dmg, adv]] of Object.entries(want)) { const m = BA[k]
    assert.deepEqual([m.startup, m.damage, m.blockstun - m.active - m.recovery], [st, dmg, adv], k); assert.equal(m.electric, true, k + ' electric') }
  assert.equal(BA.down.hitLevel, 'low'); assert.equal(BA.heavy.rangeX, 150)
})
test('6. Plasma Orb: 10 Power, 14f, 30 + 0.5 × Charge (max 70), spends all Charge, 500 px, one on screen, clean hit +1 Drain', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); setCharge(f, 40); const e = f.energy
  assert(cast(f, t, 'N')); assert.equal(e - f.energy, FB_COST.orb); assert.equal(S(f).charge, 0, 'all Charge spent')
  step(f, t, FB_ORB.STARTUP - 1); assert.equal(mine(f, 'orb').length, 0); step(f, t, 1); const o = mine(f, 'orb')[0]
  assert(o); assert.equal(o.damage, 50, '30 + 0.5 × 40'); assert.equal(Math.abs(o.vx) * o.lifetime, 504, '≈500 px')   // 12 × 42
  step(f, t, FB_ORB.TOTAL); assert.equal(cast(f, t, 'N'), false, 'one on screen'); assert.equal(U.orbDamage(100), 70, 'max 70')
  clearProj(); reset(f, t, 40); ready(f); assert(cast(f, t, 'N')); world(f, t, FB_ORB.STARTUP + 8); assert.equal(S(f).drain.pips, 1, 'clean hit +1 Drain')
})
test('6. Siphon Cable: 12, 16f, 300 px tether, 20 dmg, drains 15 Power, +15 Charge, +1 Drain, extended hurtbox, 24f whiff recovery, −12 on block', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 200); t.energy = 50; const e = f.energy
  assert(cast(f, t, 'B')); assert.equal(e - f.energy, FB_COST.siphon)
  world(f, t, 10); const hb = FEEDBACK.hurtbox(f); assert(hb && hb.w > f.w + 100, 'the cable joins his hurtbox while it extends')
  const hp = t.health; world(f, t, FB_SIPHON.STARTUP - 10 + 1)
  assert(t.health < hp, 'hits at 200 px'); assert.equal(t.energy, 35, 'drained 15'); assert.equal(S(f).charge, FB_SIPHON.CHARGE, '+15 Charge (not +4 on top)'); assert.equal(S(f).drain.pips, 1)
  assert.equal(FB_SIPHON.TOTAL - FB_SIPHON.STARTUP - FB_SIPHON.ACTIVE, 24, '24f recovery after the active frames')
  const g = ben(); far(g, t); assert(cast(g, t, 'B')); step(g, t, FB_SIPHON.STARTUP); const box = mine(g, 'siphon')[0]
  assert.equal(box.w, 300); assert.equal(box.blockstun, FB_SIPHON.TOTAL - FB_SIPHON.STARTUP + 1 - 12, '−12 on block'); step(g, t, FB_SIPHON.TOTAL); assert.equal(FEEDBACK.hurtbox(g), null, 'cable retracted')
})
test('6. Return Fire: no record → nothing (no cost, no lockout)', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const e = f.energy
  assert.equal(cast(f, t, 'U'), false); assert.equal(f.energy, e); assert.equal(f.attackCooldown || 0, 0)
})
test('6. Return Fire: the stored shot at the foe as they stood at the cast (no tracking), stored speed / size / look, ownership + returned flag, ×1.25 (max 60), −12 on block', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 300); t.y -= 80; guard(f)
  hitHim(f, t, { damage: 40, vx: -10, w: 26, h: 20, color: '#0f0', sheet: './x.png', spriteFrames: 3 }); clearProj()
  assert(cast(f, t, 'U')); assert.equal(S(f).stored, null, 'record used'); step(f, t, FB_FIRE.STARTUP - 1)
  t.x += 400; t.y += 80   // the foe moves after the cast: the aim does not follow
  step(f, t, 1); const p = mine(f, 'fire')[0]; assert(p, 'fired at 14f')
  assert.equal(p.owner, f, 'ownership transferred'); assert(U.returned(p), 'returned flag'); assert.equal(p.damage, 50, '40 × 1.25')
  assert.equal(Math.round(Math.hypot(p.vx, p.vy)), 10, 'stored speed'); assert(p.vy < 0, 'aimed up at where the foe stood'); assert.deepEqual([p.w, p.h, p.color, p.sheet], [26, 20, '#0f0', './x.png'])
  assert.equal(p.blockstun, FB_FIRE.TOTAL - FB_FIRE.STARTUP + 1 - 12, '−12 on block'); assert.equal(U.fireDamage({ damage: 90 }), 60, 'max 60')
  const g = ben(); far(g, t); guard(g); assert.equal(FEEDBACK.absorb(g, { proj: p, attacker: f }), false, 'a Feedback never re-absorbs it')
})
test('6. Overload Burst: needs Charge ≥ 25 (refused free), 14 Power, 16f, 150 px radial (hits behind), 30 + 0.4 × Charge (max 70), spends all, −14 on block, no pip', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); setCharge(f, 24); const e = f.energy
  assert.equal(cast(f, t, 'D'), false); assert.equal(f.energy, e, 'refused free'); assert.equal(S(f).stats.burstRejects, 1)
  setCharge(f, 40); reset(f, t, 30); t.x = f.x - t.w - 30   // the foe BEHIND him
  assert(cast(f, t, 'D')); assert.equal(e - f.energy, FB_COST.burst); assert.equal(S(f).charge, 0)
  const hp = t.health; world(f, t, FB_BURST.STARTUP); assert(t.health < hp, 'radial: hits behind'); assert(t.vx < 0, 'knocked away from him')
  assert.equal(S(f).drain.pips, 0, 'no pip'); assert.equal(U.burstDamage(40), 46); assert.equal(U.burstDamage(100), 70)
  const g = ben(); setCharge(g, 30); far(g, t); assert(cast(g, t, 'D')); step(g, t, FB_BURST.STARTUP); assert.equal(mine(g, 'burst')[0].blockstun, FB_BURST.TOTAL - FB_BURST.STARTUP + 1 - 14)
})
test('6. Conduit Dash: →→ + P, 10 Power, 300 px in 12f, 45, −12 on block, +1 Drain', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const x0 = f.x, e = f.energy
  const R = { right: true }, N = {}; step(f, t, 1, {}, R); step(f, t, 1, {}, N); step(f, t, 1, {}, R)
  assert.equal(U.pickSpecial(f, S(f)), 'dash', '→→ reads as the dash'); assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(e - f.energy, FB_COST.dash)
  step(f, t, FB_DASH.STARTUP + FB_DASH.FRAMES + 2); assert(Math.abs(f.x - x0 - 300) <= 26, 'travelled ≈300 px: ' + (f.x - x0))
  clearProj(); const g = ben(); reset(g, t, 60); g.facing = 1; ready(g); S(g).dashTapT = S(g).t; g._specialHeldDir = 'F'; assert(A.triggerSpecial(g, ctxOf(g, t)))
  const hp = t.health; world(g, t, FB_DASH.STARTUP + 4); assert(t.health < hp, 'dash hits'); assert.equal(S(g).drain.pips, 1, '+1 Drain')
  assert.equal(FB_DASH.DMG, 45)
})
test('6. Volt Shot: air only, 12 Power, diagonal down-forward, 40, once per airtime, no jump refill', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); f.onGround = f.grounded = false; f.y -= 150; f.jumpCount = 2; const e = f.energy
  assert(cast(f, t, 'N')); assert.equal(e - f.energy, FB_COST.volt); tick(f, t, FB_VOLT.STARTUP); const v = mine(f, 'volt')[0]
  assert(v && v.vx > 0 && v.vy > 0, 'down-forward'); assert.equal(v.damage, 40); assert.equal(f.jumpCount, 2, 'no jump refill')
  ready(f); assert.equal(cast(f, t, 'N'), false, 'once per airtime')
  f.onGround = f.grounded = true; tick(f, t, 1); f.onGround = f.grounded = false; ready(f); assert(cast(f, t, 'N'), 'again after landing')
})
const runUlt = (f, t, energy = 60) => { clearProj(); reset(f, t, 150); t.energy = energy; f.energy = 100; ready(f); const hp = t.health
  assert(A.triggerUltimate ? A.triggerUltimate(f, ctxOf(f, t)) : FEEDBACK.fireUltimate(f, ctxOf(f, t), null)); world(f, t, FB_ULT.OPENER_AT + 4); return hp }
test('6. Full Feedback: 55, clean opener → drain to 0 (+half, max 40, Charge), 4 × 25, Discharge 100 + 0.4 × Charge; 240–280 raw; Charge → 0; positions restore; 100f lockout', () => {
  const f = ben(), t = foe(); const e0 = 100; const hp = runUlt(f, t, 60)
  assert.equal(e0 - f.energy, 55, 'cost 55'); const u = S(f).ult; assert(u && u.phase === 'drain', 'clean opener → cinematic')
  assert.equal(t.energy, 0, 'drained to 0'); assert.equal(u.gain, 30, 'half of 60 → Charge'); const home = { ...u.home }, thome = { ...u.thome }
  t.energy = 25; for (let i = 0; i < FB_ULT.END + 5 && S(f).ult; i++) step(f, t, 1)
  assert.equal(S(f).ult, null); assert.deepEqual(S(f).lastUlt.hits, [40, 25, 25, 25, 25, 100 + 0.4 * 30]); assert.equal(S(f).lastUltRaw, 252)
  assert.equal(S(f).charge, 0, 'Charge → 0'); assert.deepEqual([f.x, f.y], [home.x, home.y]); assert(Math.abs(t.x - thome.x) <= 3, 'foe restored then launched'); assert.equal(f.attackCooldown, FB_ULT.LOCKOUT - 1)
  const g = ben(), h = foe(); runUlt(g, h, 200); assert.equal(S(g).ult.gain, 40, 'gain max 40')
  for (const c of [0, 100]) { const raw = 40 + 100 + U.dischargeDamage(c); assert(raw >= 240 && raw <= 280, 'total in 240–280: ' + raw) }
})
test('6. Full Feedback: whiff / block → no cinematic, 60f recovery, no drain', () => {
  const f = ben(), t = foe(); clearProj(); far(f, t); t.energy = 50; ready(f)
  assert(A.triggerUltimate ? A.triggerUltimate(f, ctxOf(f, t)) : false); step(f, t, FB_ULT.OPENER_AT + 13)
  assert.equal(S(f).ult, null, 'no cinematic'); assert.equal(t.energy, 50); assert.equal(FB_ULT.WHIFF, 60)
  const g = ben(), h = foe(); clearProj(); reset(g, h, 150); h.isBlocking = true; ready(g); A.triggerUltimate(g, ctxOf(g, h)); world(g, h, FB_ULT.OPENER_AT + 4)
  assert(!S(g).ult || S(g).ult.phase === 'opener', 'blocked → no cinematic')
})

// ── 1-3 combo totals (design model + live) ──────────────────────────────────────────────────────────────────
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  orb40: U.orbDamage(40), dash: FB_DASH.DMG, burst40: U.burstDamage(40) }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 82],
  ['2. Low, Heavy, Plasma Orb (Charge 40)', ['low', 'heavy', 'orb40'], 105],
  ['3. Conduit Dash, Heavy, Overload Burst (Charge 40)', ['dash', 'heavy', 'burst40'], 128],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Plasma Orb at Charge 40 (+1 Drain)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 160); setCharge(f, 40); const hp = t.health; assert(cast(f, t, 'N'), 'Orb'); world(f, t, FB_ORB.STARTUP + 14); d.push(hp - t.health)
  assert(d[2] > 0); assert.equal(S(f).drain.pips, 1); assert.equal(f.comboCounter, 3); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 3 live: Conduit Dash, Heavy, Overload Burst at Charge 40', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 80); const hp0 = t.health; S(f).dashTapT = S(f).t; assert(cast(f, t, 'F'), 'Dash'); world(f, t, FB_DASH.TOTAL + 1)
  const d = [hp0 - t.health]; assert.equal(S(f).dash, null, 'dash over'); clearProj(); reset(f, t, 10); d.push(melee(f, t, 'heavy'))
  reset(f, t, 30); setCharge(f, 40); const hp = t.health; assert(cast(f, t, 'D'), 'Overload'); world(f, t, FB_BURST.STARTUP + 1); d.push(hp - t.health)
  assert(d.every(x => x > 0)); assert.equal(f.comboCounter, 3); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
// ── lifecycle / slot → PICK FIVE / Vow / determinism ─────────────────────────────────────────────────────
test('swap / revert / KO / rematch clear Charge, the stored record, pips and Blackout', () => {
  const dirty = f => { const t = foe(); far(f, t); const s = S(f); s.charge = 70; s.stored = { name: 'x', damage: 30, value: 15, t: 100 }; s.drain.pips = 2; s.drain.pipT = 100; step(f, t, 1) }
  const f = ben('feedback_ov', LOAD); dirty(f)
  assert(F.applyAlien(f, 'goop')); assert(F.applyAlien(f, 'feedback_ov')); const s = S(f)
  assert.deepEqual([s.charge, s.stored, s.drain.pips, s.drain.boT], [0, null, 0, 0], 'swap')
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert')
  const k = ben(); dirty(k); k.health = 0; handleBenKO(k); assert.equal(U.fbState(k), null, 'KO')
  const r = S(ben()); assert.deepEqual([r.charge, r.stored], [0, null], 'rematch / round end: a fresh form state')
})
test('slot → PICK FIVE: slot count stays 5, Feedback READY + pickable (catalog slot 16, contiguous), nothing overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('feedback_ov'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 16); assert.equal(d.displayName, 'Feedback')
  const ready = BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready').map(x => x.slot).sort((a, b) => a - b); assert.deepEqual(ready, ready.map((_, i) => i + 1), 'ready slots contiguous')
  assert.equal(getAlienDefinition('feedback').status, 'experimental', 'the experimental Feedback is untouched')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin', 'wildvine', 'jetray', 'diamondhead_ov', 'upgrade_ov', 'humongousaur']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'feedback_ov').length, 1); assert(getAvailableAlienKeys(false).includes('feedback_ov'))
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet source: unknown, add credit if known/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Feedback'); assert.equal(f.health, 950, 'shared health')
  assert(Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 0.90) < 1e-9 && Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 0.95) < 1e-9 && Math.abs(f._benWeight - 0.85) < 1e-9, 'def 0.90 / dmg 0.95 / weight 0.85')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 1.05 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×1.05')
})
test('Omnitrix Dial: Feedback picked into the last slot, the transform reaches it at the same cost as any slot', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'feedback_ov'], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    assert(F.ben10TransformOrSwap(f, slot, { seed: 1, frame: 0, playerIndex: 0 })); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, 'feedback_ov'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
})
test('Vow pick includes Feedback (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'feedback_ov'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('feedback_ov') && picks.size === L.length)
})
test('same-seed determinism: an identical scripted Feedback sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light')
    far(f, t); guard(f); hitHim(f, t, { damage: 30 }); clearProj(); reset(f, t, 200); ready(f); cast(f, t, 'U'); world(f, t, 40)
    reset(f, t, 200); ready(f); cast(f, t, 'B'); world(f, t, 45); reset(f, t, 160); ready(f); cast(f, t, 'N'); world(f, t, 40)
    reset(f, t, 30); setCharge(f, 30); ready(f); cast(f, t, 'D'); world(f, t, 45); runUlt(f, t); world(f, t, 160); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, te: t.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data mid-cast: stored record, siphon, blackout, ult cinematic', () => {
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  clearProj(); const f = ben(), t = foe(); far(f, t); guard(f); hitHim(f, t, { damage: 30, color: '#fff' }); assert(plain(S(f)), 'stored')
  ready(f); cast(f, t, 'B'); step(f, t, 10); assert(plain(S(f)), 'siphon'); pip(f, t, 91); pip(f, t, 92); pip(f, t, 93); step(f, t, 2); assert(plain(S(f)), 'blackout')
  const u = ben(), v = foe(); runUlt(u, v); world(u, v, 50); assert(S(u).ult && S(u).ult.phase !== 'opener', 'mid-cinematic'); assert(plain(S(u)), 'ult'); clearProj()
})
test('no Math.random / gameRng in feedback.js / feedbackAssets.js', () => {
  for (const file of ['../feedback.js', '../feedbackAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})
console.log(`FEEDBACK: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
