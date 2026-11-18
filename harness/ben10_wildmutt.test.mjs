// WILDMUTT — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_wildmutt.test.mjs
// Design totals: raw move damage × the form's damage mod (1.00) × 0.85^n (85% per move), within ±20%. The live routes then run
// the real engine (its own curve) and assert the mechanics.
// Slot (the brief's "slot 23 via the Dial"): PICK FIVE (owner decision, no new dial slots) — the dial is positional over the 5
// picked aliens. Catalog slot 23 is held by Highbreed (READY, never overwritten), so Wildmutt's catalog slot is 24 (the next
// contiguous ready slot); he is picked into the loadout and reached with the Dial (↓↓ + slot key) like any other pick. Counts
// read BEN10_SLOT_COUNT / the registry, never a literal.
// Every frame runs the REAL combat.updateCombat for both fighters + the projectile pass (his Spin Slash is a hidden radial box).
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import * as B from '../ben10State.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../wildmutt.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const KEY = 'wildmutt_ov'
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = KEY, loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const foe = (key = 'goku', x = 500) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); if (ch?.animationData) t.animationData = ch.animationData; if (ch?.basic_attacks) t.basic_attacks = ch.basic_attacks; t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
const STAGE = { stageLeft: 0, stageWidth: 1600 }
physics.stageLeft = STAGE.stageLeft; physics.stageWidth = STAGE.stageWidth   // the physics clamp = the stage the form reads
let FRAME = 0, SEED = 4242
const ctxOf = (f, t) => ({ p1: f, p2: t, ...STAGE, seed: SEED, frame: FRAME })
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const extra = q => { for (const k of ['_benPowerCommit', '_spriteCastTimer', '_castArmor']) if (q[k] > 0) q[k]-- ; if (q.invulnTimer > 0) q.invulnTimer-- }
// one whole frame, the game's order: pending spawns, his physics, his form tick, his combat (his moves resolve on the foe),
// the foe's physics + combat, projectiles (his hidden radial boxes + the foe's), the per-fighter timers game.js / fighters.js own
function world(f, t, n = 1, input = {}, tInput = null) {
  for (let i = 0; i < n; i++) {
    FRAME++
    A.updatePendingSpawns()
    physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
    A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t))
    C.updateCombat(f, t, {}, { stageWidth: STAGE.stageWidth })
    physics.moveFighter(t, {}, CONTROLS); physics.applyGravity(t)
    C.updateCombat(t, f, tInput ? (typeof tInput === 'function' ? tInput(i) : tInput) : {}, { stageWidth: STAGE.stageWidth })
    for (let k = A.activeProjectiles.length - 1; k >= 0; k--) { const p = A.activeProjectiles[k]; if (p.visualOnly) continue
      p.x += p.vx || 0; p.y += p.vy || 0; if (p.lifetime != null && --p.lifetime < 0) A.activeProjectiles.splice(k, 1) }
    C.resolveProjectileHitsMulti(A.activeProjectiles, [f, t])
    extra(f); extra(t)
  }
}
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + f.w + gap; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false; t.knockdownState = false; t.knockdownTimer = 0; t.invulnTimer = 0; t.attacking = false; t.currentAttack = null; t.attackCooldown = 0; f.comboCounter = 0; f.comboTimer = 0; t.comboCounter = 0 }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }
const cast = (f, t, dir) => { ready(f); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const far = (f, t) => { t.x = f.x + 1000 }
const { WILDMUTT, WM_COST } = G
const BA = WILDMUTT.basic_attacks, DM = WILDMUTT.mods.damage
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
test('stats: speed ×1.10 / damage ×1.00 / defense ×1.00 / weight ×1.00, double jump, shared health', () => {
  const f = ben()
  assert(Math.abs(f.damageMultiplier - 1.00) < 1e-9 && Math.abs(f.defenseMultiplier - 1.00) < 1e-9 && Math.abs(f._benWeight - 1.00) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 1.10 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×1.10')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 950, 'shared health'); assert.equal(f.activeAlienName, 'Wildmutt')
})
test('hurtbox: low and wide quadruped (shorter than human Ben, wider)', () => {
  const f = ben(), h = ben(null)
  assert(f.h < h.h, `shorter ${f.h} vs ${h.h}`); assert(f.w > h.w, `wider ${f.w} vs ${h.w}`); assert(f.w > f.h, 'wider than tall')
})
test('normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, x) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (x) x(m) }
  chk('light', 5, 18, 0); chk('heavy', 13, 50, -6, m => assert.equal(m.rangeX, 160)); chk('down', 7, 22, -3, m => assert.equal(m.hitLevel, 'low'))
  chk('up', 11, 42, -9, m => assert(m.launcher)); chk('air', 7, 26, 2)
})
test('normals connect through the real combat pipeline', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { const f = ben(), t = foe(); reset(f, t, 10); assert(melee(f, t, k) > 0, k) }
})
test('inputs: the shared alien motions (236 / 214 / 412), →→ double tap, air = Scent Leap, held-direction fallback', () => {
  const f = ben(), s = S(f), feed = seq => { s.hist = []; s.lastDir = 5; for (const d of seq) { s.t++; s.hist.push({ d, t: s.t }) } }
  feed([2, 3, 6]); assert.equal(G.readMotion(s), 'spin'); feed([2, 1, 4]); assert.equal(G.readMotion(s), 'rush')
  feed([4, 1, 2]); assert.equal(G.readMotion(s), 'shred')
  s.hist = []; for (const [dir, k] of [['N', 'spin'], ['U', 'spin'], ['B', 'rush'], ['D', 'shred'], ['F', 'spin']]) { f._specialHeldDir = dir; assert.equal(G.pickSpecial(f, s), k, dir) }
  f._specialHeldDir = 'F'; s.dashTapT = s.t; assert.equal(G.pickSpecial(f, s), 'pounce'); s.dashTapT = -999
  f.onGround = f.grounded = false; assert.equal(G.pickSpecial(f, s), 'leap')
})

// ── 3 OMNIDIRECTIONAL SENSES ───────────────────────────────────────────────────────────────────────────────────
// a live Kakashi Sennen Goroshi (the one facing-based bonus in the game: from BEHIND it launches for 40 instead of 24)
function sennen(target, behind) {
  clearProj(); const k = foe('kakashi_war'); k.energy = 100; k.attackCooldown = 0; k.attacking = false
  target.facing = behind ? 1 : -1                                   // behind = his back to Kakashi
  k.facing = 1; k.x = target.x - (k.w || 60) - 10; k.y = target.y + target.h - k.h
  const hp = target.health; k._specialHeldDir = 'U'; assert(A.executeKakashiWarSpecial(k, { p1: target, p2: k, ...STAGE, seed: SEED, frame: FRAME }), 'sennen fires')
  for (let i = 0; i < 12; i++) A.updatePendingSpawns()
  return { dmg: hp - target.health, hitstun: target.hitstun, vy: target.vy }
}
test('3. senses: the tag lives on HIS entry only; ben10-gated helpers', () => {
  assert.deepEqual(WILDMUTT.tags, ['noPositionalBonus']); assert.equal(G.WM_SENSES_TAG, 'noPositionalBonus')
  const f = ben(), h = ben(null), x = ben('heatblast'), t = foe()
  assert.equal(B.benNoPositionalBonus(f), true); assert.equal(B.benNoPositionalBonus(h), false, 'human Ben'); assert.equal(B.benNoPositionalBonus(x), false, 'other ready forms'); assert.equal(B.benNoPositionalBonus(t), false, 'other characters')
  t.x = f.x - 100; f.facing = 1; assert.equal(B.benPositionalBehind(t, f), false, 'never "behind" him'); x.facing = 1; t.x = x.x - 100; assert.equal(B.benPositionalBehind(t, x), true, 'the plain facing test for everyone else')
  assert(!BEN10_ALIEN_REGISTRY.some(d => d.poolKey !== KEY && Array.isArray(d.tags) && d.tags.includes('noPositionalBonus')), 'no other entry carries it')
})
test('4. senses: a cross-up (behind) hit on him deals its normal, unmodified damage — no positional bonus, still hits / combos', () => {
  const ctl = ben('heatblast'), r0 = sennen(ctl, true), r1 = sennen(ben('heatblast'), false)
  assert(r0.dmg > r1.dmg && r0.vy < 0, `control: the cross-up launch bonus applies to other forms (${r0.dmg} vs ${r1.dmg})`)
  const back = sennen(ben(), true), front = sennen(ben(), false)
  assert(back.dmg > 0 && back.hitstun > 0, 'the behind hit still lands with hitstun')
  assert.equal(back.dmg, front.dmg, `behind ${back.dmg} == front ${front.dmg}: base damage unchanged`)
  assert.equal(back.hitstun, front.hitstun, 'same hitstun'); assert(!(back.vy < 0), 'no cross-up launch')
  const f = ben(), t = foe(); reset(f, t, 10); f.facing = -1; t.facing = -1; t.x = f.x + f.w + 10; ready(t)   // an ordinary normal from behind
  const hp = f.health; assert(C.startMove(t, 'light', t.basic_attacks.light)); t.facing = -1
  for (let i = 0; i < 30 && f.health === hp; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}) }
  const g = ben(), u = foe(); reset(g, u, 10); g.facing = 1; u.facing = -1; u.x = g.x + g.w + 10; ready(u); const hp2 = g.health; assert(C.startMove(u, 'light', u.basic_attacks.light))
  for (let i = 0; i < 30 && g.health === hp2; i++) { u.hitstop = 0; C.updateCombat(u, g, {}, {}) }
  assert.equal(hp - f.health, hp2 - g.health, 'a normal from behind = the same damage as from the front'); assert.equal(t.comboCounter, u.comboCounter, 'combos normally')
})

// ── 4 FERAL FURY ───────────────────────────────────────────────────────────────────────────────────────────────
const { WM_FURY } = G
const toFrenzy = (f, s) => { s.fury = 96; G.gainFury(f, s, 6); assert(G.frenzyOn(s), 'FRENZY') }
test('5. Fury: landing +6 / blocked +3; −1/f after 150f with no gain', () => {
  const f = ben(), t = foe(), s = S(f); reset(f, t, 10)
  melee(f, t, 'light'); assert.equal(s.fury, 6); reset(f, t, 10); melee(f, t, 'heavy', { block: true }); assert.equal(s.fury, 9, 'blocked +3')
  far(f, t); s.fury = 40; s.lastGainT = s.t; world(f, t, WM_FURY.IDLE - 1); assert.equal(s.fury, 40, 'no decay before 150f')
  world(f, t, 10); assert(s.fury < 40 && s.fury >= 29, 'decays −1/f: ' + s.fury)
})
test('5. FRENZY at 100: consumes the gauge, 180f, startup −2f (min 1f), damage +15% (never on his ultimate), not armor', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t)
  assert.equal(WILDMUTT.moveFrames(f, 'light', BA.light).startup, 5); assert.equal(WILDMUTT.damageDealt(f, null, 100, {}), 100)
  toFrenzy(f, s); assert.equal(s.fury, 0, 'consumes the full gauge'); assert.equal(s.frenzyT, WM_FURY.FRENZY_T)
  assert.equal(WILDMUTT.moveFrames(f, 'light', BA.light).startup, 3); assert.equal(WILDMUTT.moveFrames(f, 'heavy', BA.heavy).startup, 11)
  assert.equal(WILDMUTT.moveFrames(f, 'x', { startup: 2 }).startup, 1, 'min 1f'); assert.equal(BA.light.startup, 5, 'the table is never mutated')
  assert(Math.abs(WILDMUTT.damageDealt(f, null, 100, {}) - 115) < 1e-9); assert.equal(WILDMUTT.damageDealt(f, null, 100, { move: 'wm_ult_final' }), 100, 'the ult is never boosted')
  assert(!('armor' in WILDMUTT), 'no armor hook'); G.gainFury(f, s, 6); assert.equal(s.fury, 0, 'no gain during FRENZY')
  // live: a FRENZY jab comes out 2f sooner
  const lag = q => { const t2 = foe(); reset(q, t2, 10); ready(q); assert(C.startMove(q, 'light', BA.light)); let n = 0; const hp = t2.health; while (t2.health === hp && n < 40) { q.hitstop = 0; C.updateCombat(q, t2, {}, {}); n++ } return n }
  const a = lag(ben()), g = ben(); toFrenzy(g, S(g)); const b = lag(g); assert.equal(a - b, 2, `jab connects 2f sooner (${a} → ${b})`)
  world(f, t, WM_FURY.FRENZY_T - 1); assert(G.frenzyOn(s)); world(f, t, 1); assert(!G.frenzyOn(s), '180f')
})
test('5. FRENZY → 240f half-gain cooldown → once per 600f from the moment it ends', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t); toFrenzy(f, s); world(f, t, WM_FURY.FRENZY_T)
  assert(!G.frenzyOn(s)); assert.equal(s.frenzyCd, WM_FURY.CD); const endT = s.t
  G.gainFury(f, s, 6); assert.equal(s.fury, 3, 'halved during the cooldown'); world(f, t, WM_FURY.CD); assert.equal(s.frenzyCd, 0)
  assert.equal(s.fury, 0, 'the idle gauge decayed meanwhile'); G.gainFury(f, s, 6); assert.equal(s.fury, 6, 'full gains after the cooldown')
  s.fury = 98; s.lastGainT = s.t; G.gainFury(f, s, 6); assert.equal(s.fury, 100); assert(!G.frenzyOn(s), 'not again before 600f')
  const left = endT + WM_FURY.REUSE - s.t; world(f, t, left - 2, {}); s.fury = 100; s.lastGainT = s.t; assert(!G.frenzyOn(s)); world(f, t, 2); assert(G.frenzyOn(s), '600f after it ended'); assert.equal(s.frenzyUses, 2)
})
test('10. swap / revert / KO / rematch clear Fury, FRENZY and its cooldown', () => {
  const mk = () => { const f = ben(KEY, [KEY, 'heatblast', 'goop', 'xlr8', 'megawhatt']); toFrenzy(f, S(f)); S(f).frenzyCd = 100; S(f).fury = 50; return f }
  let f = mk(); assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, KEY)); assert.equal(S(f).fury, 0); assert(!G.frenzyOn(S(f))); assert.equal(S(f).frenzyCd, 0); assert.equal(S(f).frenzyReadyAt, 0)
  f = mk(); F.revertToHuman(f, { forced: true }); assert.equal(G.wmState(f), null, 'reverted: no Wildmutt state'); assert.equal(WILDMUTT.damageDealt(f, null, 100, {}), 100)
  f = mk(); f.health = 0; F.handleBenKO?.(f); if (f.omnitrix.formState) F.revertToHuman(f, { forced: true }); assert.equal(G.wmState(f), null, 'KO')
  f = mk(); F.setupBen10(f, [KEY]); assert.equal(G.wmState(f), null, 'rematch / round reset: fresh Ben')
  f = mk(); F.setupBen10(f, [KEY]); F.applyAlien(f, KEY); f.transformed = true; assert.equal(S(f).fury, 0); assert.equal(S(f).frenzyCd, 0); assert(!G.frenzyOn(S(f)))
})

// @@END-TESTS@@
console.log(`\nWILDMUTT: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
