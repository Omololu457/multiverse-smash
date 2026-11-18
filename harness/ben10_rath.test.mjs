// RATH — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_rath.test.mjs
// Design totals: raw move damage × the form's damage mod (1.25) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 10 (the brief's "slot 20 via the Dial"): PICK FIVE (owner decision, no new dial slots) — the dial is positional over
// the 5 picked aliens; Rath's catalog slot is 21 (the next contiguous ready slot after Ripjaws 20); he is picked into the
// loadout and reached with the Dial (↓↓ + slot key) like any other pick. Counts read BEN10_SLOT_COUNT, never a literal.
// Every frame runs the REAL combat.updateCombat for both fighters (his specials are engine melee moves).
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../rath.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'rath', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
// the foe's physics + combat, projectiles (the foe's, on him), the per-fighter timers game.js / fighters.js own
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
const { RATH, RT_COST } = G
const BA = RATH.basic_attacks, DM = RATH.mods.damage
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
test('stats: speed ×1.00 / damage ×1.25 / defense ×0.90 / weight ×1.10, double jump, shared health', () => {
  const f = ben()
  assert(Math.abs(f.damageMultiplier - 1.25) < 1e-9 && Math.abs(f.defenseMultiplier - 0.90) < 1e-9 && Math.abs(f._benWeight - 1.10) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 1.00 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×1.00')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 950, 'shared health'); assert.equal(f.activeAlienName, 'Rath')
  assert(!('projectile' in RATH) && !('projectiles' in RATH), 'no projectile-related fields')
})
test('normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, x) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (x) x(m) }
  chk('light', 5, 20, 0); chk('heavy', 14, 58, -6, m => assert.equal(m.rangeX, 170)); chk('down', 7, 26, -4, m => assert.equal(m.hitLevel, 'low'))
  chk('up', 11, 48, -9, m => assert(m.launcher)); chk('air', 7, 32, 2)
})
test('normals connect through the real combat pipeline', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { const f = ben(), t = foe(); reset(f, t, 10); assert(melee(f, t, k) > 0, k) }
})
test('inputs: the shared alien motions (236 / 214 / 412), →→ double tap, air = Primal Lunge, held-direction fallback', () => {
  const f = ben(), s = S(f), feed = seq => { s.hist = []; s.lastDir = 5; for (const d of seq) { s.t++; s.hist.push({ d, t: s.t }) } }
  feed([2, 3, 6]); assert.equal(G.readMotion(s), 'rake'); feed([2, 1, 4]); assert.equal(G.readMotion(s), 'grab')
  feed([4, 1, 2]); assert.equal(G.readMotion(s), 'slam')
  s.hist = []; for (const [dir, k] of [['N', 'rake'], ['U', 'rake'], ['B', 'grab'], ['D', 'slam'], ['F', 'rake']]) { f._specialHeldDir = dir; assert.equal(G.pickSpecial(f, s), k, dir) }
  f._specialHeldDir = 'F'; s.dashTapT = s.t; assert.equal(G.pickSpecial(f, s), 'rush'); s.dashTapT = -999
  f.onGround = f.grounded = false; assert.equal(G.pickSpecial(f, s), 'lunge')
})


// ── 3 FURY ─────────────────────────────────────────────────────────────────────────────────────────────────────
const { RT_FURY } = G
// the foe swings a real normal at him (the engine's startMove + updateCombat); returns { dmg, hitstun, kept }
function foeSwing(f, t, key = 'heavy', md = null) {
  ready(t); t.facing = cx(f) >= cx(t) ? 1 : -1
  const m = md || t.basic_attacks[key]; assert(C.startMove(t, key, m), 'foe startMove ' + key)
  if (m.unblockable) t.currentAttack.unblockable = true   // the engine sets it on the live attack after startMove (abilities.js Zenitsu ult)
  const hp = f.health, bs = f.blockstun
  for (let i = 0; i < 60 && f.health === hp && !(f.blockstun > bs) && t.attacking; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}) }
  t.attacking = false; t.currentAttack = null
  return { dmg: hp - f.health, hitstun: f.hitstun }
}
const foeBolt = (f, t, md = {}) => { const p = A.spawnProjectile(t, 'rt_test_bolt', { damage: 30, speed: 0, vx: -0.01, vy: 0, spawnX: cx(f), spawnY: f.y + 50, rectHitbox: true, w: 30, h: 30, lifetime: 3, hitstun: 20, ...md }, {}); assert(p, 'bolt'); if (md.unblockable) p.unblockable = true; const hp = f.health; C.resolveProjectileHitsMulti([p], [f]); clearProj(); return { dmg: hp - f.health, hitstun: f.hitstun } }
const maxFury = (f, s) => { s.fury = 96; G.gainFury(f, s, 5, 'dealt'); assert(G.furyOn(s), "RATH'S FURY") }
test('5. Fury gains from LANDING (+4 / blocked +2) and from TAKING hits (+5 / blocked +2), tracked separately', () => {
  const f = ben(), t = foe(), s = S(f); reset(f, t, 10)
  melee(f, t, 'light'); assert.equal(s.fury, 4); assert.equal(s.gainDealt, 4)
  reset(f, t, 10); melee(f, t, 'heavy', { block: true }); assert.equal(s.fury, 6, 'blocked +2'); assert.equal(s.gainDealt, 6)
  reset(f, t, 10); ready(f); const r = foeSwing(f, t, 'light'); assert(r.dmg > 0); assert.equal(s.gainTaken, 5, 'taken +5'); assert.equal(s.fury, 11)
  ready(f); f.isBlocking = true; foeSwing(f, t, 'light'); f.isBlocking = false; assert.equal(s.gainTaken, 7, 'blocked by him +2')
  ready(f); foeBolt(f, t); assert.equal(s.gainTaken, 12, 'a projectile that lands +5')
  assert.equal(s.gainDealt + s.gainTaken, s.fury)
})
test('5. Fury: −1/f after 150f with neither gain; caps at 100', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t)
  s.fury = 40; s.lastGainT = s.t; world(f, t, RT_FURY.IDLE - 1); assert.equal(s.fury, 40, 'no decay before 150f')
  world(f, t, 10); assert(s.fury < 40 && s.fury >= 29, 'decays −1/f after 150f: ' + s.fury)
  s.furyReadyAt = 1e9; s.fury = 98; G.gainFury(f, s, 5, 'taken'); assert.equal(s.fury, 100, 'caps at 100'); assert(!G.furyOn(s), 'no window while not ready')
})
test('5. tiers: 0–59 base / 60–99 RAGING (+10% dmg, −1f startup, min 1f) / 100 RATH\'S FURY (+15%)', () => {
  const f = ben(), s = S(f)
  s.fury = 59; assert.equal(G.furyTier(s), 1); assert.equal(RATH.damageDealt(f, null, 100, {}), 100); assert.equal(RATH.moveFrames(f, 'light', BA.light).startup, 5)
  s.fury = 60; assert.equal(G.furyTier(s), 2); assert(Math.abs(RATH.damageDealt(f, null, 100, {}) - 110) < 1e-9); assert.equal(RATH.moveFrames(f, 'light', BA.light).startup, 4)
  assert.equal(RATH.moveFrames(f, 'x', { startup: 1 }).startup, 1, 'min 1f'); assert.equal(BA.light.startup, 5, 'the table is never mutated')
  maxFury(f, s); assert.equal(G.furyTier(s), 3); assert(Math.abs(RATH.damageDealt(f, null, 100, {}) - 115) < 1e-9); assert.equal(s.furyT, RT_FURY.FURY_T)
  assert.equal(RATH.damageDealt(f, null, 100, { move: 'rt_ult_final' }), 100, 'his ultimate is never boosted')
})
test('5. RATH\'S FURY super armor: a normal or a projectile lands with full damage but NO hitstun / knockback / move cancel', () => {
  const f = ben(), t = foe(), s = S(f); reset(f, t, 10)
  ready(f); assert(C.startMove(f, 'heavy', BA.heavy)); const base = foeSwing(f, t, 'heavy'); assert(base.hitstun > 0 && base.dmg > 0, 'unarmored: flinches (counter hit mid-Heavy)'); assert(!f.attacking, 'unarmored: his Heavy is cancelled')
  const g = ben(), u = foe(); reset(g, u, 10); maxFury(g, S(g)); ready(g); assert(C.startMove(g, 'heavy', BA.heavy), 'he swings')
  const r = foeSwing(g, u, 'heavy'); assert.equal(r.hitstun, 0, 'no hitstun'); assert(Math.abs(r.dmg - base.dmg) <= 1, `full damage ${r.dmg} vs ${base.dmg}`)
  assert(g.attacking && g.currentAttack?.name === 'heavy', 'his Heavy was not cancelled'); assert.equal(g.vx || 0, 0, 'no knockback'); assert.equal(S(g).armored, 1)
  const h = ben(), v = foe(); reset(h, v, 10); const b0 = foeBolt(h, v); assert(b0.hitstun > 0, 'unarmored bolt flinches')
  const k = ben(), w = foe(); reset(k, w, 10); maxFury(k, S(k)); const b1 = foeBolt(k, w); assert.equal(b1.hitstun, 0, 'armored bolt'); assert.equal(b1.dmg, b0.dmg, 'full damage')
})
test('5. super armor is NOT invulnerability: launchers, unblockables, throws and ultimates still combo / knock him down', () => {
  const all = [], mk = () => { const f = ben(), t = foe(); reset(f, t, 10); maxFury(f, S(f)); ready(f); all.push(f); return [f, t] }
  let [f, t] = mk(); let r = foeSwing(f, t, 'up', t.basic_attacks.upAttack); assert(r.hitstun > 0 || f.isLaunched, 'a launcher pierces')
  ;[f, t] = mk(); r = foeSwing(f, t, 'heavy', { ...t.basic_attacks.heavy, unblockable: true }); assert(r.hitstun > 0, 'an unblockable pierces')
  ;[f, t] = mk(); r = foeSwing(f, t, 'heavy', { ...t.basic_attacks.heavy, isUltimate: true, category: 'ultimate' }); assert(r.hitstun > 0, 'an ultimate pierces')
  ;[f, t] = mk(); ready(t); t.x = f.x + f.w - 10; t.facing = -1; assert(C.resolveGrab(t, f, {}), 'a throw connects'); assert(f.hitstun > 0 || f.isGrabbed, 'a throw is never armored')
  ;[f, t] = mk(); r = foeBolt(f, t, { isUltimate: true }); assert(r.hitstun > 0, 'an ultimate projectile pierces')
  ;[f, t] = mk(); r = foeBolt(f, t, { unblockable: true }); assert(r.hitstun > 0, 'an unblockable projectile pierces')
  assert(all.reduce((a, q) => a + S(q).pierced, 0) >= 2, 'the armor test reported the piercing hits'); assert(all.every(q => G.furyOn(S(q))), 'still in RATH\'S FURY')
})
test('5. RATH\'S FURY lasts 180f → COOLDOWN (Fury 0, gains halved 240f) → once per 600f from the moment it ends', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t); maxFury(f, s)
  world(f, t, RT_FURY.FURY_T - 1); assert(G.furyOn(s)); world(f, t, 1); assert(!G.furyOn(s), '180f'); assert.equal(s.fury, 0); assert.equal(s.furyCd, RT_FURY.CD); assert.equal(s.furyEnds.at(-1), 'timer')
  const endT = s.t; G.gainFury(f, s, 4, 'dealt'); assert.equal(s.fury, 2, 'halved during the cooldown')
  world(f, t, RT_FURY.CD); assert.equal(s.furyCd, 0); s.fury = 96; s.lastGainT = s.t; G.gainFury(f, s, 4, 'dealt'); assert.equal(s.fury, 100); assert(!G.furyOn(s), 'not again before 600f'); assert.equal(G.furyTier(s), 2, 'a full gauge is RAGING meanwhile')
  world(f, t, endT + RT_FURY.REUSE - s.t); s.fury = 99; s.lastGainT = s.t; G.gainFury(f, s, 4, 'dealt'); assert(G.furyOn(s), '600f after it ended: available again'); assert.equal(s.furyUses, 2)
})
test('9. swap / revert / KO / rematch clear Fury, the super armor and its cooldown', () => {
  const mk = () => { const f = ben('rath', ['rath', 'heatblast', 'goop', 'xlr8', 'megawhatt']); maxFury(f, S(f)); S(f).furyCd = 100; return f }
  let f = mk(); assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'rath')); assert.equal(S(f).fury, 0); assert(!G.furyOn(S(f))); assert.equal(S(f).furyCd, 0)
  assert.equal(RATH.armor(f, { move: BA.heavy }), false, 'no armor after a swap')
  f = mk(); F.revertToHuman(f, { forced: true }); assert.equal(G.rtState(f), null, 'reverted: no Rath state'); assert.equal(RATH.armor(f, { move: BA.heavy }), false)
  f = mk(); f.health = 0; F.handleBenKO?.(f); if (f.omnitrix.formState) F.revertToHuman(f, { forced: true }); assert.equal(RATH.armor(f, { move: BA.heavy }), false, 'KO')
  f = mk(); F.setupBen10(f, ['rath']); assert.equal(G.rtState(f), null, 'rematch / round reset: fresh Ben')
  assert(!('_castArmor' in f) || !(f._castArmor > 0), 'no lingering engine armor field')
})


// ── 4 MOVES ────────────────────────────────────────────────────────────────────────────────────────────────────
const { RT_RAKE, RT_RUSH, RT_SLAM, RT_GRAB, RT_LUNGE, RT_ULT } = G
// cast a special and run the world until the cast is over; counts any projectile entity that appears
function runCast(f, t, dir, { max = 200, block = false, tInput = null, pre = null } = {}) {
  clearProj(); f.energy = 100; if (pre) pre(f, t); const hp = t.health, e0 = f.energy
  const ok = cast(f, t, dir), cost = e0 - f.energy; let n = 0, proj = 0
  while (ok && n < max) { if (block) t.isBlocking = true; world(f, t, 1, {}, tInput); n++; proj = Math.max(proj, A.activeProjectiles.length)
    const s = S(f); if (!s.chain && !s.grab && !s.lunge && !f.attacking && n > 2) break }
  return { ok, dmg: hp - t.health, cost, n, proj }
}
test('4. Claw Rake (236+P, 10): 12f startup, 3 hits 18/18/24, 170px reach, forward step, −10 on block', () => {
  const f = ben(), t = foe(); reset(f, t, 120); const x0 = f.x
  const r = runCast(f, t, 'N'); assert(r.ok); assert.equal(r.cost, RT_COST.rake); assert.equal(r.proj, 0, 'no projectile')
  const c = S(f).lastChain; assert.equal(c.kind, 'rake'); assert.equal(c.contacts.filter(k => !k.blocked).length, 3, '3 hits')
  assert(near(r.dmg, 60 * DM * C.GLOBAL_DAMAGE_SCALE) || r.dmg > 40, 'dmg ' + r.dmg); assert(f.x > x0, 'a real forward step')
  const g = ben(), u = foe(); reset(g, u, 400); runCast(g, u, 'N'); assert.equal(S(g).lastChain.contacts.length, 0, 'out of 170px reach whiffs')
  const h = ben(), v = foe(); reset(h, v, 120); const b = runCast(h, v, 'N', { block: true }); assert(S(h).lastChain.contacts.every(k => k.blocked)); assert(b.dmg < r.dmg)
})
test('4. Rath Rush (→→+P, 12): 14f startup, charges ~320px, stops on contact, 2 hits 22/30; whiff = no 2nd hit', () => {
  const f = ben(), t = foe(); reset(f, t, 200); const x0 = f.x
  const r = runCast(f, t, 'F', { pre: (q) => { S(q).dashTapT = S(q).t } }); assert(r.ok); assert.equal(r.cost, RT_COST.rush); assert.equal(r.proj, 0)
  const c = S(f).lastChain; assert.equal(c.kind, 'rush'); assert.deepEqual(c.contacts.map(k => k.key), ['rt_rush_1', 'rt_rush_2']); assert(f.x - x0 > 100 && f.x - x0 < 330, 'charged ' + (f.x - x0))
  const g = ben(), u = foe(); far(g, u); const x1 = g.x; runCast(g, u, 'F', { pre: (q) => { S(q).dashTapT = S(q).t } })
  assert.equal(S(g).lastChain.why, 'whiff'); assert(Math.abs(g.x - x1 - RT_RUSH.TRAVEL) <= 40, 'full 320px travel ' + (g.x - x1))
})
test('4. Overhead Slam (412+P, 14): 16f startup, 56, ground bounce on a clean hit, none on block', () => {
  const f = ben(), t = foe(); reset(f, t, 30); const r = runCast(f, t, 'D', { max: 60 }); assert(r.ok); assert.equal(r.cost, RT_COST.slam); assert.equal(r.proj, 0)
  assert(near(r.dmg, RT_SLAM.DMG * DM * C.GLOBAL_DAMAGE_SCALE) || r.dmg > 40, 'dmg ' + r.dmg); assert.equal(S(f).stats.bounces, 1, 'ground bounce')
  { const g = ben(), u = foe(); reset(g, u, 30); g.energy = 100; const y0 = u.y; assert(cast(g, u, 'D')); let top = y0; for (let i = 0; i < 50; i++) { world(g, u, 1); top = Math.min(top, u.y) } assert(y0 - top > 20, 'they bounce up off the floor: ' + (y0 - top)) }
  const g = ben(), u = foe(); reset(g, u, 30); runCast(g, u, 'D', { block: true, max: 60 }); assert.equal(S(g).stats.bounces, 0, 'no bounce on block')
})
test('4. "Let Me Tell You Something" (214+P, 16): command grab, 4×15 rant then a 150px shove; 110px; whiff; tech; air', () => {
  const f = ben(), t = foe(); reset(f, t, 30); const x0 = t.x; const r = runCast(f, t, 'B'); assert(r.ok); assert.equal(r.cost, RT_COST.grab); assert.equal(r.proj, 0)
  const L = S(f).lastGrab; assert.equal(L.result, 'ok'); assert.equal(L.ticks, 4); assert.equal(L.raw, 60); assert(L.dealt > 0 && r.dmg >= L.dealt)
  assert(Math.abs(L.shoved) > 100, 'shoved ' + L.shoved); assert(t.x > x0); assert(S(f).gainDealt >= 16, '+4 Fury per rant hit')
  const g = ben(), u = foe(); reset(g, u, 300); runCast(g, u, 'B'); assert.equal(S(g).lastGrab.result, 'range'); assert.equal(S(g).lastGrab.whiffRec, RT_GRAB.WHIFF)
  const h = ben(), v = foe(); reset(h, v, 30); runCast(h, v, 'B', { pre: (q, w) => { w.grabInputBuffer = 30 } }); assert.equal(S(h).lastGrab.result, 'teched', 'throw escape')
  const k = ben(), w = foe(); reset(k, w, 30); w.onGround = w.grounded = false; w.y -= 80; assert.equal(G.grabCanGrab(k, w), 'air', 'airborne targets cannot be grabbed')
  w.onGround = w.grounded = true; w.y += 80; w.invulnTimer = 10; assert.equal(G.grabCanGrab(k, w), 'invuln'); w.invulnTimer = 0; w.knockdownState = true; assert.equal(G.grabCanGrab(k, w), 'invuln')
})
test('4. Primal Lunge (air +P, 12): diagonal dive, 50, once per airtime, no jump refill', () => {
  const f = ben(), t = foe(); reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 120; f.jumpCount = 2; t.x = f.x + 140
  const r = runCast(f, t, 'N', { max: 80 }); assert(r.ok); assert.equal(r.cost, RT_COST.lunge); assert.equal(r.proj, 0)
  assert.equal(S(f).lastLunge.hit, true, 'lands on the foe'); assert.equal(S(f).lastLunge.jumps, 2); assert.equal(f.jumpCount === 0 ? 2 : f.jumpCount, 2, 'no refill')
  const g = ben(), u = foe(); far(g, u); g.onGround = g.grounded = false; g.y -= 300; g.energy = 100; assert(cast(g, u, 'N')); world(g, u, 6)
  ready(g); g.energy = 100; assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'once per airtime')
})
test('4. no projectile entity is spawned by ANY of his moves (normals, specials, grab, ultimate)', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { clearProj(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, k); assert.equal(A.activeProjectiles.length, 0, k) }
  for (const [d, pre] of [['N'], ['B'], ['D'], ['F', q => { S(q).dashTapT = S(q).t }]]) { const f = ben(), t = foe(); reset(f, t, 40); assert.equal(runCast(f, t, d, { pre }).proj, 0, d) }
})
// the ultimate: run until it is over
const ultRun = (f, t, opts = {}) => { ready(f); clearProj(); f.energy = 100; const ok = A.triggerUltimate(f, ctxOf(f, t)); const cost = 100 - f.energy; if (!ok) return { ok, n: -1 }; let n = 0, proj = 0
  while ((S(f).ult || n < 4) && n < 400) { if (opts.block) t.isBlocking = true; world(f, t, 1); n++; proj = Math.max(proj, A.activeProjectiles.length) } return { ok, n, proj, cost } }
test("4. ULTIMATE Rath's Fury (55): clean opener → collar grab → 5×22 rant → 90 haymaker = 240, knockdown, Fury 0, positions restore", () => {
  const f = ben(), t = foe(); reset(f, t, 40); const s = S(f); s.fury = 70; const hp = t.health, fx = f.x, tx = t.x
  const r = ultRun(f, t); assert(r.ok); assert.equal(r.proj, 0, 'no projectile')
  const L = s.lastUlt; assert(L.captured, 'captured'); assert.deepEqual(L.hits, [40, 22, 22, 22, 22, 22, 90]); assert.equal(L.raw, 240)
  assert(hp - t.health > 0); assert(t.knockdownState, 'knockdown'); assert.equal(s.fury, 0, 'Fury reset'); assert.equal(s.furyCd, 0, 'no cooldown from the ult')
  assert.equal(f.x, fx, 'his position restores'); assert.equal(t.x, tx, 'theirs too'); assert(f.attackCooldown >= RT_ULT.LOCKOUT - 2, '100f lockout')
  assert.equal(r.cost, RT_COST.ultimate)
})
test('4. ULTIMATE: a whiff or a block = no cinematic, 60f recovery; the rant angles are a pure hash', () => {
  const f = ben(), t = foe(); far(f, t); ultRun(f, t); assert.equal(S(f).lastUlt.captured, false); assert.equal(S(f).lastUlt.why, 'whiff')
  const g = ben(), u = foe(); reset(g, u, 40); const hp = u.health; ultRun(g, u, { block: true }); assert.equal(S(g).lastUlt.captured, false); assert.equal(S(g).lastUlt.why, 'blocked'); assert(!u.knockdownState)
  ready(g); g.energy = 100; assert.equal(A.triggerUltimate(g, ctxOf(g, u)), false, 'locked out after a miss'); assert(hp - u.health < 40, 'only chip')
  assert.deepEqual(G.ultRant(7, 100, 0), G.ultRant(7, 100, 0)); assert.notDeepEqual(G.ultRant(7, 100, 0), G.ultRant(7, 100, 1))
})

// @@END-TESTS@@
console.log(`\nRATH: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
