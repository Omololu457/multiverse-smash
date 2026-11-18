// UPGRADE — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_upgrade.test.mjs
// Design totals: raw move damage × the form's damage mod (1.00) × 0.85^n (85% per move), within ±20%. The live routes
// then run the real engine (its own curve) and assert the mechanics.
// Test 13 (the brief's "slot 15 + Omnitrix Dial"): PICK FIVE (owner decision) — the dial is positional over the 5 picked
// aliens, so the slot is catalog metadata (14: ready slots stay contiguous); Upgrade is picked into the loadout and reached with the Dial (↓↓ + slot key).
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as U from '../upgrade.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'upgrade_ov', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
const { UPGRADE, UP_TERM, UP_COST } = U
const BA = UPGRADE.basic_attacks, DM = UPGRADE.mods.damage
const LOAD = ['heatblast', 'goop', 'xlr8', 'diamondhead_ov', 'upgrade_ov']
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

// ── 4 Terminal ──────────────────────────────────────────────────────────────────────────────────────────────
test('4. Terminal: 14 Power, 20f startup, 120 px ahead on the ground, BOOT 60f (no hitbox) → ONLINE 300f → removed', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const e = f.energy
  assert(cast(f, t, 'D')); assert.equal(e - f.energy, UP_COST.terminal)
  step(f, t, UP_TERM.STARTUP - 1); assert.equal(S(f).term, null, 'not before 20f')
  step(f, t, 1); const w = S(f).term; assert(w, 'planted at 20f'); assert.equal(w.x, Math.round(cx(f) + UP_TERM.DIST)); assert.equal(w.y, f.y + f.h, 'on his ground')
  step(f, t, UP_TERM.BOOT - 1); assert(!U.termOnline(S(f))); assert.equal(A.activeProjectiles.filter(p => p.owner === f).length, 0, 'boot: nothing fires')
  step(f, t, 1); assert(U.termOnline(S(f)), 'ONLINE after 60f')
  step(f, t, UP_TERM.ONLINE); assert(!U.termLive(S(f)), 'removed after 300f'); assert.equal(S(f).lastTerm.by, 'expired')
})
test('4. Terminal: one per owner — a redeploy removes the old one', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const a = deploy(f, t); const b = deploy(f, t)
  assert.notEqual(a.id, b.id); assert(a.gone && a.by === 'replaced'); assert.equal(S(f).term, b)
})
test('4. Terminal: not solid (he and the foe walk through it); 30 HP destroyed by any hit, no refund', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const w = deploy(f, t); const e = f.energy
  f.x = w.x - f.w / 2; t.x = w.x - t.w / 2 + 1000; step(f, t, 3); assert.equal(f.x, w.x - f.w / 2, 'standing inside it: never pushed out (no collision box)')
  const p = { name: 'ki_blast', owner: t, x: w.x, y: w.y - 40, vx: -8, vy: 0, w: 20, h: 20, damage: 5, lifetime: 60 }; A.activeProjectiles.push(p)
  step(f, t, 1); assert(w.gone && w.by === 'destroyed', 'a 5-dmg shot destroys it'); assert.equal(f.energy, e, 'no refund'); assert(!A.activeProjectiles.includes(p), 'shot spent')
  const w2 = deploy(f, t); t.x = w2.x - 20; t.facing = -1; t.y = f.y + f.h - t.h; ready(t); assert(C.startMove(t, 'light', characters.goku.basic_attacks.light))
  for (let i = 0; i < 20 && !w2.gone; i++) { C.updateCombat(t, f, {}, {}); step(f, t, 1) }
  assert(w2.gone && w2.by === 'destroyed', 'an opponent melee destroys it')
})
test('4. Terminal pulse: every 90f ONLINE, aimed at the foe at fire time, 12 dmg, one on screen, blockable, no pip, cannot KO', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); online(f, t)
  step(f, t, UP_TERM.EVERY - 1); assert.equal(S(f).stats.pulses, 0); step(f, t, 1); assert.equal(S(f).stats.pulses, 1, 'first pulse at 90f online')
  const p = A.activeProjectiles.find(q => q.owner === f && q.alien?.up === 'pulse'); assert(p); assert.equal(p.damage, UP_TERM.PULSE); assert.equal(p.alien.pip, false)
  assert(Math.sign(p.vx) === Math.sign(cx(t) - p.x), 'aimed at the foe')
  step(f, t, UP_TERM.EVERY); assert.equal(S(f).stats.pulses, 1, 'one on screen: the second waits'); clearProj(); step(f, t, UP_TERM.EVERY); assert.equal(S(f).stats.pulses, 2)
  clearProj(); const g = ben(), u = foe(); g.x = 200; u.x = 700; online(g, u); u.health = 3; const hp = u.health
  for (let i = 0; i < 400 && S(g).stats.pulses + 0 < 3; i++) { world(g, u, 1) }
  assert(u.health >= 1, 'pulses never KO'); void hp
  clearProj(); const h = ben(), v = foe(); h.x = 200; v.x = 700; online(h, v); v.isBlocking = true; v.facing = -1; const hp2 = v.health; world(h, v, UP_TERM.EVERY + 80)
  assert(v.health >= hp2 - 3 && S(h).stats.pulses >= 1, 'blocked pulse: chip at most'); assert.equal(S(h).virus.pips, 0, 'no pips')
})
test('4. Terminal: removed on swap / revert / KO', () => {
  clearProj(); const f = ben('upgrade_ov', LOAD), t = foe(); far(f, t); deploy(f, t); assert(U.termLive(S(f)))
  assert(F.applyAlien(f, 'goop')); assert(!f.omnitrix.formState || f.omnitrix.formState.kind !== 'upgrade_ov'); assert(F.applyAlien(f, 'upgrade_ov')); assert.equal(S(f).term, null)
  deploy(f, t); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null)
})
// ── 5 Merge / Overclock ────────────────────────────────────────────────────────────────────────────────────
const { UP_MERGE } = U
const nearTerm = (f, w) => { f.x = w.x - f.w / 2 - 40 }
test('5. Merge: only with an ONLINE Terminal within 100 px (booting / out of range → rejected at no cost or Tendril Rise)', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const w = deploy(f, t); nearTerm(f, w); ready(f); const e = f.energy
  assert(!cast(f, t, 'U'), 'booting terminal: rejected'); assert.equal(f.energy, e, 'no cost'); assert(S(f).stats.mergeRejects >= 1)
  step(f, t, UP_TERM.BOOT); assert(U.termOnline(S(f))); f.x = w.x + 150; assert(!U.termNear(f, S(f)), '150 px away')
  nearTerm(f, w); const e2 = f.energy; assert(cast(f, t, 'U'), 'Merge'); assert.equal(e2 - f.energy, UP_COST.merge)
  assert(w.gone && w.by === 'merged', 'terminal consumed'); assert.equal(f._spriteCastMove, 'upMerge')
  step(f, t, UP_MERGE.FRAMES - 1); assert(!U.overclocked(S(f))); step(f, t, 1); assert.equal(S(f).oc.t, UP_MERGE.OC, 'OVERCLOCK after the 20f Merge')
})
test('5. Overclock: speed ×1.20, damage ×1.15, ALT PAL frame set; then 60f cooldown (drain +50%, no Merge); once per 900f', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const sp = f._benWalkSpeed, w = online(f, t); nearTerm(f, w); assert(cast(f, t, 'U')); step(f, t, UP_MERGE.FRAMES + 1)
  assert(U.overclocked(S(f))); assert(Math.abs(f._benWalkSpeed - sp * 1.2) < 1e-9, 'speed ×1.2'); assert.equal(f._skinAnim, U.UP_FRAMESETS.overclock, 'alt pal')
  assert(Math.abs(UPGRADE.damageDealt(f, t, 100, { move: 'light' }) - 115) < 1e-9, 'damage ×1.15')
  assert.equal(UPGRADE.drainMult(f), 1); step(f, t, S(f).oc.t); assert.equal(S(f).oc.t, 0); assert.equal(f._benWalkSpeed, sp, 'speed restored')
  assert.equal(f._skinAnim, U.UP_FRAMESETS.normal); assert(S(f).oc.cdT > 0); assert.equal(UPGRADE.drainMult(f), 1.5, 'cooldown drain +50%')
  const w2 = online(f, t); nearTerm(f, w2); const e = f.energy; assert(!cast(f, t, 'U'), 'no Merge in cooldown / lock'); assert.equal(f.energy, e)
  step(f, t, S(f).oc.cdT + 1); assert.equal(UPGRADE.drainMult(f), 1); assert(S(f).oc.lockT > 0); assert(!cast(f, t, 'U'), 'once per 900f')
  step(f, t, S(f).oc.lockT); const w3 = online(f, t); nearTerm(f, w3); assert(cast(f, t, 'U'), 'again after 900f'); assert.equal(S(f).stats.merges, 2)
})
test('5. Overclock cleared on swap / revert', () => {
  clearProj(); const f = ben('upgrade_ov', LOAD), t = foe(); far(f, t); const sp = f._benWalkSpeed; const w = online(f, t); nearTerm(f, w); assert(cast(f, t, 'U')); step(f, t, UP_MERGE.FRAMES + 2)
  assert(U.overclocked(S(f))); assert(F.applyAlien(f, 'goop')); assert(F.applyAlien(f, 'upgrade_ov')); assert(!U.overclocked(S(f))); assert.equal(f._benWalkSpeed, sp)
  assert.equal(S(f).oc.lockT, 0, 'fresh state')
})
// ── 6 Virus / Crash ─────────────────────────────────────────────────────────────────────────────────────────
const { UP_VIRUS } = U
const tagHit = (f, t, cast, { blocked = false, pip = true } = {}) => UPGRADE.onContact(f, t, { proj: { alien: { up: 'zap', pip, cast } }, blocked })
test('6. Virus: one pip per cast on clean hits, max 3; none from blocks / pulses; expire 240f after the last', () => {
  const f = ben(), t = foe(); far(f, t); const v = S(f).virus
  tagHit(f, t, 1); tagHit(f, t, 1); assert.equal(v.pips, 1, 'once per cast'); tagHit(f, t, 2, { blocked: true }); assert.equal(v.pips, 1, 'blocked: none')
  tagHit(f, t, 3, { pip: false }); assert.equal(v.pips, 1, 'pulse / FX tag: none')
  step(f, t, UP_VIRUS.EXPIRE - 1); assert.equal(v.pips, 1); tagHit(f, t, 4); assert.equal(v.pips, 2); step(f, t, UP_VIRUS.EXPIRE - 1); assert.equal(v.pips, 2, 'timer refreshed by the last pip')
  step(f, t, 1); assert.equal(v.pips, 0, 'expired')
})
test('6. CRASH: 3 pips → 180f; opponent loses 15 Power to Upgrade and gains none; no refresh; 360f immunity', () => {
  const f = ben(), t = foe(); far(f, t); const v = S(f).virus; t.energy = 50; f.energy = 40
  tagHit(f, t, 1); tagHit(f, t, 2); assert.equal(v.crashT, 0); tagHit(f, t, 3)
  assert.equal(v.crashT, UP_VIRUS.CRASH, 'crash on the 3rd'); assert.equal(t.energy, 35, '−15'); assert.equal(f.energy, 55, 'Upgrade +15'); assert.equal(v.pips, 0)
  t.energy += 20; step(f, t, 1); assert.equal(t.energy, 35, 'gain clamped back'); t.energy -= 10; step(f, t, 1); assert.equal(t.energy, 25, 'spending still works')
  t.energy += 5; step(f, t, 1); assert.equal(t.energy, 25)
  tagHit(f, t, 9); assert.equal(v.pips, 0, 'no refresh while active'); step(f, t, v.crashT); assert.equal(v.crashT, 0); assert.equal(v.immuneT, UP_VIRUS.IMMUNE)
  t.energy += 20; step(f, t, 1); assert.equal(t.energy, 45, 'gains again after the crash')
  for (const c of [10, 11, 12]) tagHit(f, t, c); assert.equal(v.pips, 0, 'immune: no pips'); step(f, t, UP_VIRUS.IMMUNE); for (const c of [13, 14, 15]) tagHit(f, t, c)
  assert.equal(v.crashes, 2, 'crash again after 360f')
  const g = ben(), u = foe(); u.energy = 6; g.energy = 99; for (const c of [1, 2, 3]) tagHit(g, u, c); assert.equal(u.energy, 0); assert.equal(g.energy, 100, 'steal = what was lost, capped')
})
// ── 7 normals ───────────────────────────────────────────────────────────────────────────────────────────────
const { UP_ZAP, UP_LASH, UP_DIVE, UP_RISE, UP_SPEAR, UP_ULT } = U
test('7. normals: Jab 5/18/0, Heavy 14/52/−6 (180 px arm hurtbox), Low 7/24/−4 low, Launcher 11/46/−9, Air 7/28/+2', () => {
  const want = { light: [5, 18, 0], heavy: [14, 52, -6], down: [7, 24, -4], up: [11, 46, -9], air: [7, 28, 2] }
  for (const [k, [st, dmg, adv]] of Object.entries(want)) { const m = BA[k]; assert.equal(m.startup, st, k); assert.equal(m.damage, dmg, k); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block') }
  assert.equal(BA.down.hitLevel, 'low'); assert.equal(BA.heavy.rangeX, 180)
  const f = ben(), t = foe(); ready(f); assert(C.startMove(f, 'heavy', BA.heavy)); const hb = UPGRADE.hurtbox(f); assert(hb && hb.x + hb.w - cx(f) >= 175, 'arm in the hurtbox')
  f.attacking = false; f.currentAttack = null; assert.equal(UPGRADE.hurtbox(f), null)
  assert.deepEqual(UPGRADE.mods, { speed: 1.00, damage: 1.00, defense: 0.95, weight: 0.85 }); assert.equal(UPGRADE.maxJumps, 2)
})
// ── 8 Zap Bolt ──────────────────────────────────────────────────────────────────────────────────────────────
test('8. Zap Bolt: 10 Power, 40 dmg, 480 px, one on screen, +1 Virus on a clean hit', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 200); const e = f.energy, hp = t.health
  assert(cast(f, t, null), 'Zap'); assert.equal(e - f.energy, UP_COST.zap); world(f, t, UP_ZAP.STARTUP)
  const b = A.activeProjectiles.find(p => p.owner === f && p.alien?.up === 'zap'); assert(b); assert.equal(b.damage, 40); assert(Math.abs((b.lifetime + 1) * Math.abs(b.vx) - UP_ZAP.RANGE) <= UP_ZAP.SPEED, '480 px travel')
  ready(f); assert(!cast(f, t, null), 'one on screen'); world(f, t, 30); assert(t.health < hp, 'hits'); assert.equal(S(f).virus.pips, 1)
})
test('8. Zap Bolt through an ONLINE Terminal: +10 once (atomic) + an extra pulse', () => {
  clearProj(); const f = ben(), t = foe(); f.x = 200; t.x = 900; t.y = f.y + f.h - t.h; const w = online(f, t); f.x = w.x - 200; ready(f)
  const pulses = S(f).stats.extraPulses; assert(cast(f, t, null)); world(f, t, UP_ZAP.STARTUP + 14)
  const b = A.activeProjectiles.find(p => p.owner === f && p.alien?.up === 'zap'); assert(b, 'bolt still flying'); assert.equal(b.damage, 50, '+10 once')
  assert.equal(S(f).stats.extraPulses, pulses + 1, 'one extra pulse'); world(f, t, 4); assert.equal(b.damage, 50, 'still +10 only'); assert.equal(S(f).stats.boosted, 1)
})
test('8. Overclocked Zap Bolt: 2-hit piercing (two bolts, one pip per cast)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 200); S(f).oc.t = 200; ready(f); const hp = t.health
  assert(cast(f, t, null)); world(f, t, UP_ZAP.STARTUP + UP_ZAP.OC_GAP); const bs = A.activeProjectiles.filter(p => p.owner === f && p.alien?.up === 'zap')
  assert.equal(bs.length, 2); assert(bs.every(p => p.piercesMulti)); world(f, t, 30); assert(t.health < hp); assert.equal(S(f).virus.pips, 1, 'one pip per cast')
})
// ── 9 Tendril Lash ──────────────────────────────────────────────────────────────────────────────────────────
test('9. Tendril Lash: 12 Power, 14f, 340 px, 2 hits 20/28, −12 on block, finisher +1 Virus, tendril is hittable', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 260); const e = f.energy, hp = t.health
  S(f).dashTapT = S(f).t; assert(cast(f, t, 'F'), 'Lash (→→)'); assert.equal(e - f.energy, UP_COST.lash)
  world(f, t, UP_LASH.HITS_AT[0] - 1); assert.equal(t.health, hp, 'nothing before 14f'); world(f, t, 1); assert(t.health < hp, 'first hit at 14f (260 px away)')
  const hb = UPGRADE.hurtbox(f); assert(hb.x + hb.w - cx(f) > 250, 'the tendril is part of his hurtbox')
  world(f, t, UP_LASH.TOTAL); assert.equal(S(f).virus.pips, 1, 'finisher pip')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 100); u.isBlocking = true; S(g).dashTapT = S(g).t; assert(cast(g, u, 'F'))
  let bsAt = -1; for (let i = 1; i <= UP_LASH.TOTAL; i++) { const b0 = u.blockstun; world(g, u, 1); if (S(g).lash?.t === UP_LASH.HITS_AT[1] && u.blockstun > 0) bsAt = i; void b0 }
  assert.equal(S(g).virus.pips, 0, 'blocked: no pip')
  const rem = UP_LASH.TOTAL - UP_LASH.HITS_AT[1]; assert.equal(Math.max(1, rem + 1 + UP_LASH.ON_BLOCK) - rem - 1, -12, '−12 on block (blockstun model)')
})
// ── 10 Goo Dive / Tendril Rise ──────────────────────────────────────────────────────────────────────────────
test('10. Goo Dive: 10 Power, melt 6f, slide 6 up to 120f while held, low profile (high/mid + projectiles miss, low hits), 3 Power/s', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const e = f.energy; assert(cast(f, t, 'B'), 'Goo Dive'); assert.equal(e - f.energy, UP_COST.dive)
  const H = { special: true }; step(f, t, UP_DIVE.MELT, {}, H); assert.equal(S(f).dive.phase, 'slide')
  assert(UPGRADE.evade(f, { move: { name: 'heavy' }, attacker: t }), 'mid melee misses'); assert(UPGRADE.evade(f, { proj: { name: 'ki' } }), 'projectile misses')
  assert(!UPGRADE.evade(f, { move: { name: 'down', hitLevel: 'low' }, attacker: t }), 'a low hits')
  const e2 = f.energy; step(f, t, 60, {}, H); assert(Math.abs((e2 - f.energy) - 3) < 0.05, '3 Power/s'); assert.equal(f.invulnTimer || 0, 0, 'no invulnerability')
  step(f, t, 1, {}, { special: true, right: true }); assert.equal(f._benLunge?.speed, UP_DIVE.SPEED)
  step(f, t, 120, {}, H); assert.equal(S(f).dive?.phase ?? 'done', S(f).dive ? 'reform' : 'done', '120f max → reform')
})
test('10. Goo Dive: release → reform 12f (punishable); P → Tendril Rise (55, launches, +1 Virus, −14 on block)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 30); assert(cast(f, t, 'B')); step(f, t, UP_DIVE.MELT + 10, {}, { special: true })
  step(f, t, 1, {}, {}); assert.equal(S(f).dive.phase, 'reform'); assert(!UPGRADE.evade(f, { proj: {} }), 'reform is hittable'); step(f, t, UP_DIVE.REFORM); assert.equal(S(f).dive, null)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 30); const hp = u.health; assert(cast(g, u, 'B')); const e = g.energy
  step(g, u, UP_DIVE.MELT + 4, {}, { special: true }); step(g, u, 1, {}, {}); world(g, u, 1, { special: true })   // release, then press P inside 6f
  assert(S(g).rise && S(g).rise.fromDive, 'Tendril Rise out of the dive'); assert(Math.abs(g.energy - e) < 1, 'no extra cost')
  world(g, u, UP_RISE.STARTUP + 1); assert(hp - u.health > 0, 'Rise hits'); assert(u.isLaunched || u.vy < 0, 'launches'); assert.equal(S(g).virus.pips, 1)
  const rem = UP_RISE.TOTAL - UP_RISE.STARTUP; assert.equal(Math.max(1, rem + 1 + UP_RISE.ON_BLOCK) - rem - 1, -14)
})
test('10. →↓↘+P with no Terminal near = Tendril Rise (10 Power, 13f)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 30); const e = f.energy, hp = t.health
  assert(cast(f, t, 'U'), 'Rise'); assert.equal(e - f.energy, UP_COST.rise); assert(S(f).rise && !S(f).rise.fromDive)
  world(f, t, UP_RISE.STARTUP - 1); assert.equal(t.health, hp); world(f, t, 1); assert(t.health < hp, 'hits at 13f')
})
// ── 11 Spear Dive ──────────────────────────────────────────────────────────────────────────────────────────
test('11. Spear Dive: air only, 12 Power, 48 dmg, one hit, once per airtime, no jump refill', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); f.onGround = f.grounded = false; f.y -= 120; const j = f.jumpCount = 2; const e = f.energy, hp = t.health
  assert(cast(f, t, null), 'Spear'); assert.equal(e - f.energy, UP_COST.spear); world(f, t, 3); const jAir = f.jumpCount; world(f, t, 37); const d = hp - t.health
  assert(d > 0, 'hits'); assert(d <= Math.ceil(UP_SPEAR.DMG * C.GLOBAL_DAMAGE_SCALE) + 1, 'one hit only'); assert.equal(jAir, j, 'no jump refill')
  const g = ben(), u = foe(); far(g, u); g.onGround = g.grounded = false; g.y -= 300; assert(cast(g, u, null)); world(g, u, 3); assert(!g.onGround)
  S(g).spear = null; delete g._benGlide; ready(g); assert(!cast(g, u, null), 'once per airtime (same airtime)')
})
// ── 12 System Takeover ─────────────────────────────────────────────────────────────────────────────────────
const runUlt = (f, t) => { ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t)), 'ult'); let n = 0; while ((S(f).ult || n < 20) && n < 300) { world(f, t, 1); n++ } }
test('12. System Takeover: 55 Power, clean opener → 40 + 4×25 + 100 = 240 raw, hashed copies, positions restore, 100f lockout', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 150); const fx = f.x, tx = t.x, hp = t.health
  ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t))); assert.equal(f.energy, 45)
  let n = 0; while ((S(f).ult || n < 20) && n < 300) { world(f, t, 1); n++ }
  assert.equal(S(f).lastUltRaw, 240); assert.equal(S(f).lastUltSpots.length, 4); assert.equal(f.x, fx, 'he is back home'); assert(Math.abs(t.x - tx) <= 8, 'foe restored (then launched)')
  assert(hp - t.health > 100); assert(f.attackCooldown >= UP_ULT.LOCKOUT - 2, 'lockout')
  assert.equal(A.activeProjectiles.filter(p => p.owner === f && p.alien?.up && p.alien.up !== 'ultOpen').length, 0, 'copies are render-only')
})
test('12. System Takeover: whiff / block = no cinematic, 60f recovery; Crash at the end if pips (respecting immunity)', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); runUlt(f, t); assert.equal(S(f).lastUltRaw, 0, 'whiff: no cinematic'); assert(f.attackCooldown <= UP_ULT.WHIFF)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 150); u.isBlocking = true; u.facing = -1; runUlt(g, u); assert.equal(S(g).lastUltRaw, 0, 'blocked: no cinematic')
  clearProj(); const h = ben(), v = foe(); reset(h, v, 150); S(h).virus.pips = 1; S(h).virus.pipT = 200; v.energy = 40; runUlt(h, v)
  assert(S(h).lastUltCrash, 'crash at the end'); assert(S(h).virus.crashT > 0)
  clearProj(); const k = ben(), w = foe(); reset(k, w, 150); S(k).virus.pips = 2; S(k).virus.immuneT = 500; runUlt(k, w); assert(!S(k).lastUltCrash, 'immune: no crash')
})
test('12. System Takeover copies: deterministic hash(seed, frame, playerIndex)', () => {
  const spots = () => { clearProj(); FRAME = 1000; const f = ben(), t = foe(); reset(f, t, 150); runUlt(f, t); return JSON.stringify(S(f).lastUltSpots) }
  const a = spots(), b = spots(); assert.equal(a, b); SEED = 99; const c = spots(); SEED = 4242; assert.notEqual(a, c, 'seed changes them')
})
// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  zap: UP_ZAP.DMG, lash: UP_LASH.DMG[0] + UP_LASH.DMG[1], rise: UP_RISE.DMG }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 82],
  ['2. Low, Heavy, Zap Bolt', ['low', 'heavy', 'zap'], 100],
  ['3. Tendril Lash, Heavy, Tendril Rise', ['lash', 'heavy', 'rise'], 120],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Zap Bolt (+1 Virus pip)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 160); const hp = t.health; assert(cast(f, t, null), 'Zap'); world(f, t, UP_ZAP.STARTUP + 14); d.push(hp - t.health)
  assert(d[2] > 0); assert.equal(S(f).virus.pips, 1); assert.equal(f.comboCounter, 3); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 3 live: Tendril Lash (2 hits), Heavy, Tendril Rise (2 pips)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 120); const hp0 = t.health; S(f).dashTapT = S(f).t; assert(cast(f, t, 'F')); world(f, t, UP_LASH.TOTAL + 1)
  const d = [hp0 - t.health]; clearProj(); reset(f, t, 10); d.push(melee(f, t, 'heavy'))
  reset(f, t, 30); const hp = t.health; assert(cast(f, t, 'U'), 'Rise'); world(f, t, UP_RISE.STARTUP + 2); d.push(hp - t.health)
  assert(d.every(x => x > 0)); assert.equal(S(f).virus.pips, 2, 'lash finisher + rise'); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
// ── 13 lifecycle / slot → PICK FIVE / Vow / determinism ──────────────────────────────────────────────────
test('13. swap / revert / KO / rematch clear Terminal, Overclock, pips and Crash', () => {
  const dirty = f => { const t = foe(); far(f, t); deploy(f, t); const s = S(f); s.virus.pips = 2; s.virus.pipT = 100; s.oc.t = 90; step(f, t, 1) }
  const f = ben('upgrade_ov', LOAD); dirty(f); assert.equal(f._skinAnim, U.UP_FRAMESETS.overclock)
  assert(F.applyAlien(f, 'goop')); assert.notEqual(f._skinAnim, U.UP_FRAMESETS.overclock, 'swap: palette gone')
  assert(F.applyAlien(f, 'upgrade_ov')); const s = S(f); assert.equal(s.term, null); assert.equal(s.virus.pips, 0); assert.equal(s.oc.t, 0); assert.equal(s.virus.crashT, 0)
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null)
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null)
  assert.equal(S(ben()).term, null, 'rematch / round end: a fresh form state')
})
test('13. slot → PICK FIVE: slot count stays 5, Upgrade READY + pickable (catalog slot 14, contiguous), nothing overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('upgrade_ov'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 14); assert.deepEqual(BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready').map(x => x.slot).sort((a, b) => a - b), BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready').map((_, i) => i + 1), 'ready slots contiguous'); assert.equal(d.displayName, 'Upgrade')
  assert.equal(getAlienDefinition('upgrade').status, 'experimental', 'the experimental Upgrade is untouched')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin', 'wildvine', 'jetray', 'diamondhead_ov']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'upgrade_ov').length, 1); assert(getAvailableAlienKeys(false).includes('upgrade_ov'))
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Dragonrod/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Upgrade'); assert.equal(f.health, 950, 'shared health')
  assert(Math.abs(f.defenseMultiplier - 0.95) < 1e-9 && Math.abs(f.damageMultiplier - 1.00) < 1e-9 && Math.abs(f._benWeight - 0.85) < 1e-9, 'def 0.95 / dmg 1.00 / weight 0.85')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 1.00 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×1.00')
})
test('13. Omnitrix Dial: Upgrade picked into the last slot, the transform reaches it at the same cost as any slot', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'upgrade_ov'], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    assert(F.ben10TransformOrSwap(f, slot, { seed: 1, frame: 0, playerIndex: 0 })); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, 'upgrade_ov'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
})
test('13. Vow pick includes Upgrade (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'upgrade_ov'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('upgrade_ov') && picks.size === L.length)
})
test('13. same-seed determinism: an identical scripted Upgrade sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light')
    reset(f, t, 300); online(f, t); world(f, t, 100); f.x = S(f).term.x - f.w / 2 - 40; ready(f); cast(f, t, 'U'); world(f, t, 30)
    reset(f, t, 160); cast(f, t, null); world(f, t, 40); reset(f, t, 30); cast(f, t, 'B'); step(f, t, 20, {}, { special: true }); world(f, t, 1, { light: true }); world(f, t, 50)
    reset(f, t, 150); runUlt(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, te: t.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data mid-cast: terminal, merge, overclock, dive, ult cinematic', () => {
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  clearProj(); const f = ben(), t = foe(); far(f, t); const w = online(f, t); f.x = w.x - f.w / 2 - 40; ready(f); assert(cast(f, t, 'U')); step(f, t, 5); assert(plain(S(f)), 'merge')
  step(f, t, 30); assert(plain(S(f)), 'overclock'); ready(f); S(f).oc.t = 0; assert(cast(f, t, 'B')); step(f, t, 10, {}, { special: true }); assert(plain(S(f)), 'dive')
  clearProj(); const u = ben(), v = foe(); reset(u, v, 150); u.energy = 100; ready(u); A.triggerUltimate(u, ctxOf(u, v)); world(u, v, 70)
  assert(S(u).ult && S(u).ult.phase !== 'opener', 'mid-cinematic'); assert(plain(S(u)), 'ult'); clearProj()
})
test('no Math.random / gameRng in upgrade.js / upgradeAssets.js', () => {
  for (const file of ['../upgrade.js', '../upgradeAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})
console.log(`UPGRADE: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
