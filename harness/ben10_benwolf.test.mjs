// BENWOLF — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_benwolf.test.mjs
// Design totals: raw move damage × the form's damage mod (1.05) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 10 (the brief's "slot 18 via the Dial"): PICK FIVE (owner decision, no new dial slots) — the dial is positional over
// the 5 picked aliens; BenWolf's catalog slot is 18 (the next contiguous ready slot after Arcticguana 17); he is picked into
// the loadout and reached with the Dial (↓↓ + slot key) like any other pick. Counts read BEN10_SLOT_COUNT, never a literal.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../benwolf.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'benwolf', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
const cast = (f, t, dir) => { ready(f); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const far = (f, t) => { t.x = f.x + 1000 }
const { BENWOLF, BW_COST } = G
const BA = BENWOLF.basic_attacks, DM = BENWOLF.mods.damage
const LOAD = ['heatblast', 'goop', 'xlr8', 'arcticguana', 'benwolf']
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

// ── 2 stats / normals / inputs ──────────────────────────────────────────────────────────────────────────────
test('stats: speed ×1.15 / damage ×1.05 / defense ×0.95 / weight ×0.85, double jump, shared health', () => {
  const f = ben()
  assert(Math.abs(f.damageMultiplier - 1.05) < 1e-9 && Math.abs(f.defenseMultiplier - 0.95) < 1e-9 && Math.abs(f._benWeight - 0.85) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 1.15 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×1.15')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 950, 'shared health'); assert.equal(f.activeAlienName, 'BenWolf')
})
test('normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, extra) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (extra) extra(m) }
  chk('light', 5, 18, 0); chk('heavy', 13, 52, -6, m => assert.equal(m.rangeX, 170)); chk('down', 7, 24, -4, m => assert.equal(m.hitLevel, 'low'))
  chk('up', 11, 46, -9, m => assert(m.launcher)); chk('air', 7, 28, 2)
})
test('normals connect through the real combat pipeline', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { const f = ben(), t = foe(); reset(f, t, 10); assert(melee(f, t, k) > 0, k) }
})
test('inputs: the shared alien motions (236 / 214 / 623 / 412), →→ double tap, air = Dive Claw, held-direction fallback', () => {
  const f = ben(), s = S(f), feed = seq => { s.hist = []; s.lastDir = 5; for (const d of seq) { s.t++; s.hist.push({ d, t: s.t }) } }
  feed([2, 3, 6]); assert.equal(G.readMotion(s), 'howl'); feed([2, 1, 4]); assert.equal(G.readMotion(s), 'pounce')
  feed([6, 2, 3]); assert.equal(G.readMotion(s), 'rise'); feed([4, 1, 2]); assert.equal(G.readMotion(s), 'low')
  s.hist = []; for (const [dir, k] of [['N', 'howl'], ['B', 'pounce'], ['U', 'rise'], ['D', 'low']]) { f._specialHeldDir = dir; assert.equal(G.pickSpecial(f, s), k, dir) }
  f._specialHeldDir = 'F'; s.dashTapT = s.t; assert.equal(G.pickSpecial(f, s), 'rake'); s.dashTapT = -999; assert.equal(G.pickSpecial(f, s), 'howl', '→ without the double tap')
  f.onGround = f.grounded = false; assert.equal(G.pickSpecial(f, s), 'dive')
})


// ── 4 Scent → Hunted ────────────────────────────────────────────────────────────────────────────────────────
const { BW_SCENT } = G
const tagHit = (f, t, cast, extra = {}, blocked = false) => BENWOLF.onContact(f, t, { proj: { owner: f, alien: { bw: 'test', cast, scent: true, ...extra } }, blocked })
const huntIt = (f, t) => { tagHit(f, t, 9001); tagHit(f, t, 9002); tagHit(f, t, 9003); assert(G.hunted(S(f)), 'hunted'); return S(f).scent }
test('4. Scent: one pip per cast (however many ticks), never from blocks / untagged (howl) contacts, max 3 → HUNTED 180f', () => {
  const f = ben(), t = foe(), sc = S(f).scent
  tagHit(f, t, 1); tagHit(f, t, 1); tagHit(f, t, 1); assert.equal(sc.pips, 1, 'one per cast')
  tagHit(f, t, 2, {}, true); assert.equal(sc.pips, 1, 'blocked: none')
  BENWOLF.onContact(f, t, { proj: { owner: f, alien: { bw: 'howl', cast: 3 } }, blocked: false }); assert.equal(sc.pips, 1, 'a howl tag carries no scent')
  BENWOLF.onContact(f, t, { move: BA.heavy, blocked: false }); assert.equal(sc.pips, 1, 'normals: none')
  tagHit(f, t, 4); assert.equal(sc.pips, 2); tagHit(f, t, 5); assert.equal(sc.pips, 0, 'consumed'); assert.equal(sc.hunted, BW_SCENT.HUNTED)
  const fr = sc.hunted; world(f, t, 1); assert.equal(sc.hunted, fr - 1); world(f, t, BW_SCENT.HUNTED - 2); assert(G.hunted(S(f))); world(f, t, 1); assert(!G.hunted(S(f)), '180f')
  assert.equal(sc.immuneT, BW_SCENT.IMMUNE); assert.equal(sc.ends.at(-1), 'timer')
})
test('4. Scent: pips expire 240f after the last one; no refresh while Hunted; 360f immunity after (no pips)', () => {
  const f = ben(), t = foe(); far(f, t); const sc = S(f).scent
  tagHit(f, t, 11); world(f, t, BW_SCENT.EXPIRE - 1); assert.equal(sc.pips, 1); world(f, t, 1); assert.equal(sc.pips, 0, 'expired at 240f')
  huntIt(f, t); world(f, t, 10); const h = sc.hunted; tagHit(f, t, 12); tagHit(f, t, 13); tagHit(f, t, 14); assert.equal(sc.hunted, h, 'no refresh'); assert.equal(sc.pips, 0)
  world(f, t, h); assert(!G.hunted(S(f))); tagHit(f, t, 15); assert.equal(sc.pips, 0, 'immune'); world(f, t, BW_SCENT.IMMUNE); tagHit(f, t, 16); assert.equal(sc.pips, 1, 'after 360f')
})
test('4. Hunted: BenWolf deals +10% to them (any of his damage), nothing else changes; their polling / clock untouched', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d0 = melee(f, t, 'heavy')
  const g = ben(), u = foe(); reset(g, u, 10); huntIt(g, u); const d1 = melee(g, u, 'heavy'); const keys = Object.keys(t).sort().join()
  assert(Math.abs(d1 / d0 - BW_SCENT.DMG) < 0.02, `${d1} vs ${d0}`); assert.equal(Object.keys(u).sort().join(), keys, 'no new fields on the target (same as an un-Hunted target)')
  const a = u.health; C.applyScaledDamage(u, 100, { attacker: u, source: 'ability' }); const b = foe(); const bh = b.health; C.applyScaledDamage(b, 100, { attacker: b, source: 'ability' })
  assert.equal(a - u.health, bh - b.health, 'damage from anyone else is unchanged')
})
test('4. Scent / Hunted clear on swap / revert / KO / rematch (fresh formState)', () => {
  const t = foe(); const f = ben('benwolf', LOAD); huntIt(f, t); F.applyAlien(f, 'heatblast'); F.applyAlien(f, 'benwolf'); assert(!G.hunted(S(f))); assert.equal(S(f).scent.pips, 0)
  const g = ben(); huntIt(g, t); F.revertToHuman(g); assert.equal(g.omnitrix.formState, null)
  const k = ben(); huntIt(k, t); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null)
  const u = foe(); const m = ben(); huntIt(m, u); u.health = 0; world(m, u, 1); assert(!G.hunted(S(m)), 'opponent KO ends it'); assert.equal(S(m).scent.ends.at(-1), 'ko')
})
// @@END-TESTS@@
console.log(`\nBENWOLF: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
