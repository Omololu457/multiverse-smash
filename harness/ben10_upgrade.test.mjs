// UPGRADE — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_upgrade.test.mjs
// Design totals: raw move damage × the form's damage mod (1.00) × 0.85^n (85% per move), within ±20%. The live routes
// then run the real engine (its own curve) and assert the mechanics.
// Test 13 (the brief's "slot 15 + Omnitrix Dial"): PICK FIVE (owner decision) — the dial is positional over the 5 picked
// aliens, so slot 15 is catalog metadata; Upgrade is picked into the loadout and reached with the Dial (↓↓ + slot key).
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
//@@TESTS@@
console.log(`UPGRADE: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
