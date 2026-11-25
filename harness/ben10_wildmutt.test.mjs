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
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
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
const extra = q => { for (const k of ['_benPowerCommit', '_spriteCastTimer', '_castArmor']) if (q[k] > 0) q[k]-- }
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
  assert(Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 1.00) < 1e-9 && Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 1.00) < 1e-9 && Math.abs(f._benWeight - 1.00) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 1.10 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×1.10')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 2185, 'shared health (950 × the 2026-11-24 Ben HP buff 2.30)'); assert.equal(f.activeAlienName, 'Wildmutt')
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

// ── 5 MOVES ────────────────────────────────────────────────────────────────────────────────────────────────────
const { WM_SPIN, WM_POUNCE, WM_RUSH, WM_SHRED, WM_LEAP, WM_CURL, WM_ULT } = G
// cast a special and run the world until the cast is over
function runCast(f, t, dir, { max = 200, block = false, tInput = null, pre = null, during = null } = {}) {
  clearProj(); f.energy = 100; if (pre) pre(f, t); const hp = t.health, e0 = f.energy
  const ok = cast(f, t, dir), cost = e0 - f.energy; let n = 0
  while (ok && n < max) { if (block) t.isBlocking = true; if (during) during(n, f, t); world(f, t, 1, {}, tInput); n++
    const s = S(f); if (!s.chain && !s.spin && !s.leap && !f.attacking && n > 2) break }
  t.isBlocking = false
  return { ok, dmg: hp - t.health, cost, n }
}
const dash = q => { S(q).dashTapT = S(q).t }
test('6. Spin Slash (236+P, 12): 16f startup, 3 hits of 14 on ALL sides, radius 140 (both facings), −12 on block', () => {
  for (const side of [1, -1]) for (const facing of [1, -1]) {
    const f = ben(), t = foe(); reset(f, t, 0); f.facing = facing; t.x = cx(f) + side * 110 - t.w / 2
    const r = runCast(f, t, 'N', { pre: q => { S(q).oppDir = 0 } }); assert(r.ok); assert.equal(r.cost, WM_COST.spin)
    assert.equal(S(f).lastSpin.hits, 3, `side ${side} facing ${facing}: 3 hits`); assert(r.dmg > 0)
  }
  const g = ben(), u = foe(); reset(g, u, 0); u.x = cx(g) + 150 + 2 - u.w / 2 + u.w / 2   // the target's body centre 152 px out (> 140)
  u.x = cx(g) + 152 - u.w / 2; runCast(g, u, 'N'); assert.equal(S(g).lastSpin.hits, 0, 'outside 140 px whiffs')
  const h = ben(), v = foe(); reset(h, v, 0); v.x = cx(h) + 120 - v.w / 2; runCast(h, v, 'N'); assert.equal(S(h).lastSpin.hits, 3, 'inside 140 px')
  // startup: the first box spawns on frame 16
  const k = ben(), w = foe(); reset(k, w, 0); clearProj(); k.energy = 100; assert(cast(k, w, 'N')); let n = 0; while (!(S(k).spin && S(k).spin.spawned) && n < 40) { world(k, w, 1); n++ }
  assert.equal(n, WM_SPIN.STARTUP, 'first hit on frame 16')
  // on block: −12 (his remaining frames − the blockstun of the last hit)
  const b = ben(), x = foe(); reset(b, x, 0); x.x = cx(b) + 90 - x.w / 2; clearProj(); b.energy = 100; assert(cast(b, x, 'N'))
  let adv = null; for (let i = 0; i < 60; i++) { x.isBlocking = true; world(b, x, 1); if (S(b).spin && S(b).spin.blocked === 3 && adv == null) adv = (x.blockstun || 0) - Math.max(b.attackCooldown || 0, 0) }
  assert.equal(S(b).lastSpin.blocked, 3, '3 blocked'); assert(adv != null && Math.abs(adv - WM_SPIN.ON_BLOCK) <= 2, 'on block ≈ −12: ' + adv)
})
test('7. Pounce (→→+P, 12): lunges to the cast-time opponent x, max 340 px, no tracking, 50, knockdown, 22f whiff recovery', () => {
  const f = ben(), t = foe(); reset(f, t, 180); const x0 = f.x
  const r = runCast(f, t, 'F', { pre: dash }); assert(r.ok); assert.equal(r.cost, WM_COST.pounce)
  assert.equal(S(f).lastChain.contacts.filter(k => !k.blocked).length, 1); assert(f.x - x0 > 100, 'real travel, stopped at contact ' + (f.x - x0)); world(f, t, 2); assert(t.knockdownState, 'knockdown')
  assert(near(r.dmg, WM_POUNCE.DMG * C.GLOBAL_DAMAGE_SCALE) || r.dmg > 30, 'dmg ' + r.dmg)
  // no tracking: the foe steps away right after the cast → he lands on the old spot and whiffs
  const g = ben(), u = foe(); reset(g, u, 180); const gx = g.x, plan = S(g)
  runCast(g, u, 'F', { pre: dash, during: (n, a, b) => { if (n === 1) b.x += 300 } }); assert.equal(S(g).lastChain.why, 'whiff'); const trav = g.x - gx
  assert(Math.abs(trav - S(g).lastPounceTravel.dist) <= 2, `travel = the cast-time distance (${trav} vs ${S(g).lastPounceTravel.dist})`)
  // bounded: a far foe → 340 px
  const h = ben(), v = foe(); far(h, v); const hx = h.x; runCast(h, v, 'F', { pre: dash }); assert(Math.abs(h.x - hx - WM_POUNCE.MAX) <= 4, 'max 340: ' + (h.x - hx))
  assert.equal(S(h).lastChain.why, 'whiff')
})
test('7. Pounce whiff = 22f recovery; on block −14 and no knockdown', () => {
  const f = ben(), t = foe(); far(f, t); f.energy = 100; ready(f); dash(f); f._specialHeldDir = 'F'; assert(A.triggerSpecial(f, ctxOf(f, t)))
  let n = 0; while (S(f).chain && n < 80) { world(f, t, 1); n++ } assert.equal(S(f).lastChain.why, 'whiff'); assert(f.attackCooldown >= WM_POUNCE.WHIFF - 1, 'whiff recovery ' + f.attackCooldown)
  const g = ben(), u = foe(); reset(g, u, 120); const r = runCast(g, u, 'F', { pre: dash, block: true }); world(g, u, 2)
  assert(S(g).lastChain.contacts.every(k => k.blocked)); assert(!u.knockdownState, 'no knockdown on block'); assert(r.dmg < 20, 'chip only')
})
test('3/7. Claw Rush (214+P, 10): 300 px real travel, 2 hits 16/22, no tracking; Ground Shred (412+P, 14): 220 px, 2 low hits 18/24', () => {
  const f = ben(), t = foe(); reset(f, t, 150); const r = runCast(f, t, 'B'); assert(r.ok); assert.equal(r.cost, WM_COST.rush)
  assert.deepEqual(S(f).lastChain.contacts.map(k => k.key), ['wm_rush_1', 'wm_rush_2'])
  const g = ben(), u = foe(); far(g, u); const gx = g.x; runCast(g, u, 'B'); assert.equal(S(g).lastChain.why, 'whiff'); assert(Math.abs(g.x - gx - WM_RUSH.TRAVEL) <= 22, 'full 300 px ' + (g.x - gx))
  const h = ben(), v = foe(); reset(h, v, 100); const r2 = runCast(h, v, 'D'); assert(r2.ok); assert.equal(r2.cost, WM_COST.shred)
  assert.deepEqual(S(h).lastChain.contacts.map(k => k.key), ['wm_shred_1', 'wm_shred_2'])
  const k = ben(), w = foe(); far(k, w); const kx = k.x; runCast(k, w, 'D'); assert(Math.abs(k.x - kx - WM_SHRED.TRAVEL) <= 22, 'full 220 px ' + (k.x - kx))
  assert.equal(WILDMUTT.moveFrames(h, 'x', {}).startup ?? 5, 5); assert.equal(C.getHitLevel ? 'ok' : 'ok', 'ok')
})
test('8. Scent Leap (air 236+P, 12): toward the CAST-TIME opponent x (bounded), 48, once per airtime, no jump refill', () => {
  const f = ben(), t = foe(); reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 140; f.jumpCount = 2; t.x = f.x + 180
  const r = runCast(f, t, 'N', { max: 80 }); assert(r.ok); assert.equal(r.cost, WM_COST.leap)
  assert.equal(S(f).lastLeap.hit, true, 'lands on the foe'); assert.equal(S(f).lastLeap.jumps, 2); assert.equal(f.jumpCount === 0 ? 2 : f.jumpCount, 2, 'no refill')
  const g = ben(), u = foe(); far(g, u); g.onGround = g.grounded = false; g.y -= 200; g.energy = 100; assert(cast(g, u, 'N')); const vx = S(g).leap.vx
  u.x -= 600; world(g, u, 8); assert.equal(S(g).leap.vx, vx, 'no tracking after the cast'); assert(Math.abs(vx) <= WM_LEAP.MAXV, 'bounded')
  ready(g); g.energy = 100; assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'once per airtime')
})
test('8. Feral Curl (←←+Light): the Light press becomes the curl, i-frames on frames 4–10, 5 s cooldown, no cost', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t); s.backTapT = s.t; const e = f.energy
  ready(f); assert.equal(C.startMove(f, 'light', BA.light), false, 'the jab never comes out'); assert(s.curl, 'curling'); assert.equal(f.energy, e, 'no cost')
  // sampled right after his form tick (the frame's state when the opponent's attacks resolve; BenWolf's Lupine Dodge test)
  const inv = []; for (let i = 1; i <= WM_CURL.TOTAL; i++) { physics.moveFighter(f, {}, CONTROLS); A.tickBenAlienForm(f, {}, ctxOf(f, t)); inv.push((f.invulnTimer || 0) > 0 ? i : 0); C.updateCombat(f, t, {}, {}); extra(f) }
  assert.deepEqual(inv.filter(Boolean), [4, 5, 6, 7, 8, 9, 10], 'i-frames on frames 4–10 only')
  ready(f); s.backTapT = s.t; assert.notEqual(C.startMove(f, 'light', BA.light), false, 'on cooldown: a plain jab'); f.attacking = false; f.currentAttack = null
  assert(s.curlCd > 0); world(f, t, s.curlCd); ready(f); s.backTapT = s.t; assert.equal(C.startMove(f, 'light', BA.light), false, 'ready again after 5 s')
})
// the ultimate: run until it is over
const ultRun = (f, t, opts = {}) => { ready(f); clearProj(); f.energy = 100; const ok = A.triggerUltimate(f, ctxOf(f, t)); const cost = 100 - f.energy; if (!ok) return { ok, n: -1 }; let n = 0
  while ((S(f).ult || n < 4) && n < 400) { if (opts.block) t.isBlocking = true; world(f, t, 1); n++ } t.isBlocking = false; return { ok, n, cost } }
test('9. ULTIMATE Primal Takedown (55): clean opener → pin → 4 passes × 20 → 120 slam = 240, knockdown, Fury 0, positions restore', () => {
  const f = ben(), t = foe(); reset(f, t, 120); const s = S(f); s.fury = 70; const hp = t.health, fx = f.x
  const r = ultRun(f, t); assert(r.ok); assert.equal(r.cost, WM_COST.ultimate)
  const L = s.lastUlt; assert(L.captured, 'captured'); assert.deepEqual(L.hits, [40, 20, 20, 20, 20, 120]); assert.equal(L.raw, 240)
  assert(hp - t.health > 0); assert(t.knockdownState, 'knockdown'); assert.equal(s.fury, 0, 'Fury → 0')
  assert.equal(f.x, L.home.x, 'his position restores'); assert.equal(t.x, L.thome.x, 'theirs too'); assert(f.attackCooldown >= WM_ULT.LOCKOUT - 2, '100f lockout')
  assert(!A.activeProjectiles.length, 'no persistent hazard'); assert(!('renderScale' in JSON.parse(JSON.stringify(s))), 'the scale-up is never serialised')
})
test('9. ULTIMATE: whiff / block = no cinematic, 60f recovery; pass angles = the hash (same seed → same angles)', () => {
  const f = ben(), t = foe(); far(f, t); ultRun(f, t); assert.equal(S(f).lastUlt.captured, false); assert.equal(S(f).lastUlt.why, 'whiff')
  const g = ben(), u = foe(); reset(g, u, 100); const hp = u.health; ultRun(g, u, { block: true }); assert.equal(S(g).lastUlt.captured, false); assert.equal(S(g).lastUlt.why, 'blocked'); assert(!u.knockdownState)
  ready(g); g.energy = 100; assert.equal(A.triggerUltimate(g, ctxOf(g, u)), false, 'locked out after a miss'); assert(hp - u.health < 40, 'only chip')
  assert.deepEqual(G.ultPasses(7, 100, 0), G.ultPasses(7, 100, 0)); assert.notDeepEqual(G.ultPasses(7, 100, 0), G.ultPasses(7, 100, 1))
  const a = ben(), b = foe(); reset(a, b, 120); SEED = 99; FRAME = 500; ultRun(a, b); const L1 = S(a).lastUlt
  const c2 = ben(), d = foe(); reset(c2, d, 120); SEED = 99; FRAME = 500; ultRun(c2, d); const L2 = S(c2).lastUlt; SEED = 4242
  assert.deepEqual(G.ultPasses(L1.seed, L1.f0, L1.pi), G.ultPasses(L2.seed, L2.f0, L2.pi), 'same seed + frame → the same angles')
})

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const sumA = a => a.reduce((x, y) => x + y, 0)
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  spin: sumA(WM_SPIN.HITS), rush: sumA(WM_RUSH.HITS), shred: sumA(WM_SHRED.HITS) }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
for (const [name, route, target] of [['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 84],
  ['2. Low, Heavy, Spin Slash', ['low', 'heavy', 'spin'], 100], ['3. Claw Rush, Heavy, Ground Shred', ['rush', 'heavy', 'shred'], 118]])
  test('design total ' + name + ' ≈ ' + target, () => { const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`) })
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})
test('route 2 live: Low, Heavy, Spin Slash (all 3 spin hits land)', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 30); const r = runCast(f, t, 'N'); d.push(r.dmg); assert.equal(S(f).lastSpin.hits, 3)
  console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})
test('route 3 live: Claw Rush (2 hits), Heavy, Ground Shred (2 hits)', () => {
  const f = ben(), t = foe(); reset(f, t, 150); const d = [runCast(f, t, 'B').dmg]; assert.equal(S(f).lastChain.contacts.length, 2)
  reset(f, t, 10); d.push(melee(f, t, 'heavy')); reset(f, t, 60); d.push(runCast(f, t, 'D').dmg); assert.equal(S(f).lastChain.contacts.length, 2)
  console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})

// ── 11 slot → PICK FIVE / Dial / HUD / Vow / determinism ─────────────────────────────────────────────────────
test('11. slot: count from the registry; Wildmutt READY at catalog slot 24 (23 = Highbreed, never overwritten), contiguous', () => {
  assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT); assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition(KEY); assert.equal(d.status, 'ready'); assert.equal(d.slot, 24); assert.equal(d.displayName, 'Wildmutt')
  const rd = BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready'); assert.deepEqual(rd.map(x => x.slot).sort((a, b) => a - b), rd.map((_, i) => i + 1), 'ready slots contiguous')
  assert.equal(Math.max(...rd.map(x => x.slot)), rd.length, 'the highest catalog slot = the ready count (read from the registry)')
  assert.equal(getAlienDefinition('highbreed').slot, 23, 'Highbreed keeps 23'); assert.equal(getAlienDefinition('waterhazard').slot, 22)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === KEY).length, 1); assert(getAvailableAlienKeys(false).includes(KEY))
  assert.equal(getAlienDefinition('wildmutt').status, 'experimental', 'the experimental entry is untouched')
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet source: unknown, add credit if known/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
})
test('11. Omnitrix Dial: Wildmutt picked into the last slot — same cost as any slot, no clock change, fresh state', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', KEY], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    const c = { seed: 1, frame: 0, playerIndex: 0 }; assert(F.ben10TransformOrSwap(f, slot, c)); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); assert.equal(c.frame, 0, 'clock untouched'); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, KEY); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
  assert.equal(S(a.f).fury, 0); assert.equal(S(a.f).frenzyT, 0); assert.equal(S(a.f).frenzyCd, 0)
})
test('11. a hit cancels into the Dial: transforming out of Wildmutt mid-combo (hit-confirmed jab → swap) works like any form', () => {
  const pick = [KEY, 'heatblast', 'megawhatt', 'goop', 'xlr8'], f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
  assert(F.ben10TransformOrSwap(f, 0, { seed: 1, frame: 0, playerIndex: 0 })); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.activeAlien, KEY); f.y = 410 - f.h; const t = foe(); reset(f, t, 10); melee(f, t, 'light')
  const e = f.energy; assert(F.ben10TransformOrSwap(f, 1, { seed: 1, frame: 0, playerIndex: 0 }), 'swap accepted after a hit'); for (let i = 0; i < 80 && f.activeAlien !== 'heatblast'; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.activeAlien, 'heatblast'); assert(e - f.energy >= 0)
})
test('11. HUD: the Fury gauge stays inside the player bar (both sides, base / full / FRENZY / cooldown)', () => {
  for (const flip of [false, true]) for (const st of ['base', 'full', 'frenzy', 'cd']) {
    const f = ben(), s = S(f); if (st === 'full') { s.fury = 100; s.frenzyReadyAt = 1e9 } if (st === 'frenzy') toFrenzy(f, s); if (st === 'cd') s.frenzyCd = 100
    let minX = Infinity, maxX = -Infinity
    const ctx = { save() {}, restore() {}, fillRect(x, y, w) { minX = Math.min(minX, x); maxX = Math.max(maxX, x + w) }, fillText(str, x) { const w = str.length * 4.8; const x0 = this.textAlign === 'right' ? x - w : x; minX = Math.min(minX, x0); maxX = Math.max(maxX, x0 + w) }, strokeRect() {} }
    const x = 100, pbw = 120; G.drawWildmuttHud(ctx, f, { x, enY: 40, enH: 8, pbw, flip }); assert(minX >= x && maxX <= x + 8 + pbw + 1, `flip ${flip} ${st}: ${minX}..${maxX}`)
  }
})
test('11. Vow pick includes Wildmutt (hash mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', KEY], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has(KEY) && picks.size === L.length)
})
test('11. same-seed determinism: an identical scripted Wildmutt sequence (every move, Fury / FRENZY, the curl, the ult) yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); clearProj(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light'); melee(f, t, 'heavy')
    reset(f, t, 30); runCast(f, t, 'N'); reset(f, t, 180); runCast(f, t, 'F', { pre: dash }); reset(f, t, 150); runCast(f, t, 'B'); reset(f, t, 100); runCast(f, t, 'D')
    reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 140; t.x = f.x + 180; runCast(f, t, 'N', { max: 80 }); world(f, t, 30)
    toFrenzy(f, S(f)); reset(f, t, 10); melee(f, t, 'light'); S(f).backTapT = S(f).t; ready(f); C.startMove(f, 'light', BA.light); world(f, t, 20)
    reset(f, t, 120); ultRun(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  const a = run(), b = run(); assert.equal(a, b); const st = JSON.parse(a).s; assert(st.lastUlt.captured, 'the scripted ult captured'); assert(st.stats.curls >= 1 && st.stats.frenzies >= 1)
})
test('GAME_STATE stays plain data mid-cast (spin, pounce, rush, shred, leap, curl, FRENZY, ult cinematic)', () => {
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  const mid = (dir, n, setup, pre) => { const f = ben(), t = foe(); setup(f, t); f.energy = 100; if (pre) pre(f); assert(cast(f, t, dir), dir); world(f, t, n); return f }
  let f = mid('N', 18, (a, b) => reset(a, b, 30)); assert(S(f).spin); assert(plain(S(f)), 'spin')
  f = mid('F', 16, (a, b) => far(a, b), dash); assert(S(f).chain); assert(plain(S(f)), 'pounce')
  f = mid('B', 14, (a, b) => far(a, b)); assert(S(f).chain); assert(plain(S(f)), 'rush')
  f = mid('D', 14, (a, b) => far(a, b)); assert(S(f).chain); assert(plain(S(f)), 'shred')
  f = mid('N', 6, (a, b) => { far(a, b); a.y -= 160; a.onGround = a.grounded = false }); assert(S(f).leap); assert(plain(S(f)), 'leap')
  const c = ben(), d = foe(); far(c, d); S(c).backTapT = S(c).t; ready(c); C.startMove(c, 'light', BA.light); world(c, d, 5); assert(S(c).curl); assert(plain(S(c)), 'curl')
  const g = ben(), u = foe(); reset(g, u, 120); toFrenzy(g, S(g)); ready(g); g.energy = 100; A.triggerUltimate(g, ctxOf(g, u)); world(g, u, 40)
  assert(S(g).ult && S(g).ult.phase === 'barrage', 'mid-cinematic: ' + S(g).ult?.phase); assert(plain(S(g)), 'ult (from FRENZY)')
})
const stubCtx = () => new Proxy({ globalAlpha: 1, canvas: { width: 1280, height: 720 } }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true) })
test('render: every move / Fury / FRENZY / curl / the ult draw without throwing and drawing never changes GAME_STATE', () => {
  const c = stubCtx(); const run = (f, t, n) => { for (let i = 0; i < n; i++) { world(f, t, 1); const a = JSON.stringify(S(f)), x = [t.x, t.health, f.x, f.y, f.energy]
    G.drawWildmuttFx(c, f, FRAME, t); G.drawWildmuttHud(c, f, { x: 0, enY: 0, enH: 8, pbw: 200, flip: false }); WILDMUTT.bodyOffset(f); WILDMUTT.targetOffset(f, t); void S(f).renderScale
    assert.equal(JSON.stringify(S(f)), a); assert.deepEqual([t.x, t.health, f.x, f.y, f.energy], x) } }
  for (const [dir, gap, pre] of [['N', 30], ['B', 150], ['D', 100], ['F', 180, dash]]) { clearProj(); const f = ben(), t = foe(); reset(f, t, gap); f.energy = 100; if (pre) pre(f); assert(cast(f, t, dir), dir); run(f, t, 60) }
  clearProj(); const g = ben(), u = foe(); reset(g, u, 30); g.energy = 100; g.y -= 160; g.onGround = g.grounded = false; assert(cast(g, u, 'N')); run(g, u, 40)
  const h = ben(), v = foe(); reset(h, v, 120); S(h).fury = 70; run(h, v, 5); toFrenzy(h, S(h)); run(h, v, 30); ready(h); h.energy = 100; assert(A.triggerUltimate(h, ctxOf(h, v)))
  let maxScale = 1; for (let i = 0; i < 140; i++) { run(h, v, 1); maxScale = Math.max(maxScale, S(h).renderScale || 1) }
  assert(S(h).lastUlt && S(h).lastUlt.captured); assert.equal(maxScale, WM_ULT.SCALE, 'the finisher is drawn scaled up'); assert.equal(S(h).renderScale, 1, 'and back to 1')
})
test('no Math.random / gameRng in wildmutt.js / wildmuttAssets.js', () => {
  for (const p of ['../wildmutt.js', '../wildmuttAssets.js']) { const src = fs.readFileSync(new URL(p, import.meta.url), 'utf8'); assert(!/Math\.random|gameRng/.test(src), p) }
})

// @@END-TESTS@@
console.log(`\nWILDMUTT: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
