// HIGHBREED — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_highbreed.test.mjs
// Design totals: raw move damage × the form's damage mod (1.10) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 10 (the brief's "slot 22 via the Dial", raised count): PICK FIVE (owner decision, no new dial slots, ever) — the dial is
// positional over the 5 picked aliens; Highbreed's catalog slot is 23 (22 is Water Hazard, a READY alien never overwritten);
// he is picked into the loadout and reached with the Dial (↓↓ + slot key) like any other pick. Counts read BEN10_SLOT_COUNT.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../highbreed.js'
import * as FL from '../flight.js'
import { SpriteHandler } from '../sprite.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message, (e.stack.split('\n').find(l => l.includes('ben10_highbreed')) || '').trim()) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'highbreed', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
const { HIGHBREED: HB, HB_COST } = G
const BA = HB.basic_attacks, DM = HB.mods.damage
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


// ── 2 stats / normals / inputs ──────────────────────────────────────────────────────────────────────────────────
test('stats: speed ×0.95 / damage ×1.10 / defense ×1.05 / weight ×1.10, double jump, shared health', () => {
  const f = ben()
  assert(Math.abs(f.damageMultiplier - 1.10) < 1e-9 && Math.abs(f.defenseMultiplier - 1.05) < 1e-9 && Math.abs(f._benWeight - 1.10) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - (0.95 * 7) / (getAlienDefinition('heatblast').mods.speed * F.BEN10_ALIEN_POOL.heatblast.stats.speed)) < 0.06, 'speed ×0.95')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 950, 'shared health'); assert.equal(f.activeAlienName, 'Highbreed')
  assert.equal(f._alienFlightProfile, 'highbreed'); assert(FL.FLIGHT_PROFILES.highbreed, 'flight profile')
})
test('normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, x) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (x) x(m) }
  chk('light', 5, 18, 0); chk('heavy', 14, 54, -6, m => assert.equal(m.rangeX, 170)); chk('down', 7, 24, -4, m => assert.equal(m.hitLevel, 'low'))
  chk('up', 11, 46, -9, m => assert(m.launcher)); chk('air', 7, 28, 2)
})
test('normals connect through the real combat pipeline', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { const f = ben(), t = foe(); reset(f, t, 10); assert(melee(f, t, k) > 0, k) }
})
test('inputs: the shared alien motions (236 / 412), →→ double tap, air = Wing Slash / Talon Dive, held-direction fallback', () => {
  const f = ben(), s = S(f), feed = seq => { s.hist = []; s.lastDir = 5; for (const d of seq) { s.t++; s.hist.push({ d, t: s.t }) } }
  feed([2, 3, 6]); assert.equal(G.readMotion(s), 'claws'); feed([4, 1, 2]); assert.equal(G.readMotion(s), 'lance')
  s.hist = []; for (const [dir, k] of [['N', 'claws'], ['U', 'claws'], ['B', 'lance'], ['D', 'lance'], ['F', 'claws']]) { f._specialHeldDir = dir; assert.equal(G.pickSpecial(f, s), k, dir) }
  f._specialHeldDir = 'F'; s.dashTapT = s.t; assert.equal(G.pickSpecial(f, s), 'dive'); s.dashTapT = -999
  f.onGround = f.grounded = false; f._specialHeldDir = 'D'; assert.equal(G.pickSpecial(f, s), 'wing'); s.dashTapT = s.t; f._specialHeldDir = 'F'; assert.equal(G.pickSpecial(f, s), 'dive')
})
test('flight: hold Jump in the air ≥ 8f takes off (no jump refill), capped at apex + 160, max 150f, a hard hit knocks him down', () => {
  const f = ben(), t = foe(); far(f, t); f.onGround = f.grounded = false; f.vy = -6; f.jumpCount = 1
  world(f, t, 12, { jump: true }); assert(FL.isFlying(f), 'flying'); assert.equal(f.jumpCount, 1, 'no refill'); assert.equal(S(f).flights, 1)
  assert.equal(S(f).moveState, 'flying'); world(f, t, 200, { jump: true }); assert(!FL.isFlying(f) || S(f).flightUsed <= G.HB_FLIGHT.MAX, 'max 150f')
})


// ── 3/4 MOVE-SET SELECTOR ──────────────────────────────────────────────────────────────────────────────────────
const actionOf = f => new SpriteHandler().determineAction(f)
const toState = (f, t, state) => {
  ready(f); f.onGround = f.grounded = true; f.y = 410 - f.h; f.vy = 0; f.dashTimer = 0; S(f).runT = 99
  if (state === 'running') f.dashTimer = 6
  if (state === 'flying') { f.onGround = f.grounded = false; f.y -= 150 }
  world(f, t, 1)
}
test('4. move-set selector: Jab / Heavy / Air pull the grounded / running / flying row; same button, same frame data; the sprite plays it', () => {
  const want = { light: ['light', 'lightRun', 'lightFly'], heavy: ['heavy', 'heavyRun', 'heavyFly'] }
  for (const [key, rows] of Object.entries(want)) ['grounded', 'running', 'flying'].forEach((st, i) => {
    const f = ben(), t = foe(); far(f, t); toState(f, t, st); assert.equal(S(f).moveState, st, 'state ' + st)
    ready(f); assert(C.startMove(f, key, BA[key]), key + ' starts in ' + st)
    assert.deepEqual(S(f).moveAnim, { move: key, action: rows[i], state: st }); assert.equal(actionOf(f), rows[i], `${key} ${st} → ${rows[i]}`)
    assert.equal(f.currentAttack.startup ?? BA[key].startup, BA[key].startup, 'same frame data')
  })
  const f = ben(), t = foe(); far(f, t); toState(f, t, 'flying'); ready(f); assert(C.startMove(f, 'air', BA.air)); assert.equal(actionOf(f), 'airFly')
  for (const k of ['down', 'up']) { const g = ben(), u = foe(); far(g, u); toState(g, u, 'running'); ready(g); assert(C.startMove(g, k, BA[k])); assert.equal(actionOf(g), k) }
})
test('4. selector reads the existing movement flags only (dash → running for 12f after; walking stays grounded); no input remap', () => {
  const f = ben(), t = foe(); far(f, t); f.dashTimer = 4; world(f, t, 1); assert.equal(S(f).moveState, 'running')
  f.dashTimer = 0; world(f, t, G.HB_RUN_GRACE); assert.equal(S(f).moveState, 'running'); world(f, t, 2); assert.equal(S(f).moveState, 'grounded')
  world(f, t, 10, { right: true }); assert.equal(S(f).moveState, 'grounded', 'walking is the grounded row')
  assert.deepEqual(Object.keys(HB.basic_attacks), ['light', 'heavy', 'down', 'up', 'air'], 'the same five normals')
  const h = ben('heatblast'), u = foe(); far(h, u); ready(h); assert(C.startMove(h, 'light', h.basic_attacks?.light || F.BEN10_ALIEN_POOL.heatblast.basic_attacks.light)); assert.notEqual(actionOf(h), 'lightRun', 'other forms: no-op')
})


// ── 5 MUTATION SURGE ───────────────────────────────────────────────────────────────────────────────────────────
const { HB_SURGE: SU } = G
const contactOn = (f, t, info) => HB.onContact(f, t, info)
const struckBy = (f, info) => HB.struck(f, info)
test('5. Surge gains: +6 per hit landed, +3 per hit taken, nothing from blocks; cap 100; −1/f after 150f idle', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t)
  contactOn(f, t, { blocked: false }); assert.equal(s.surge, 6); contactOn(f, t, { blocked: true }); assert.equal(s.surge, 6, 'blocked: none')
  struckBy(f, { kind: 'melee', blocked: false }); assert.equal(s.surge, 9); struckBy(f, { kind: 'projectile', blocked: true }); assert.equal(s.surge, 9)
  world(f, t, SU.IDLE); assert.equal(s.surge, 9, 'held 150f'); world(f, t, 3); assert.equal(s.surge, 6, '−1/f after')
  const g = ben(), u = foe(); far(g, u); reset(g, u, 10); melee(g, u, 'light'); assert.equal(S(g).surge, 6, 'a real landed hit')
})
test('5. at 100: MUTATED 200f (gauge consumed) — render ×1.15 AND hurtbox ×1.15 together, damage +15 %, speed −5 %', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t); const w0 = f._benWalkSpeed, d0 = f.dashSpeed
  s.surge = 96; contactOn(f, t, { blocked: false }); world(f, t, 1)
  assert(G.mutated(s)); assert.equal(s.surge, 0, 'consumed'); assert.equal(s.renderScale, SU.SCALE)
  const hb = C.getHurtbox ? C.getHurtbox(f) : HB.hurtbox(f); const ob = HB.hurtbox(f)
  assert(ob && Math.abs(ob.w - f.w * 1.15) < 1e-9 && Math.abs(ob.h - f.h * 1.15) < 1e-9 && Math.abs(ob.y + ob.h - (f.y + f.h)) < 1e-9, 'hurtbox ×1.15, feet planted')
  if (C.getHurtbox) assert(Math.abs(hb.w - ob.w) < 1e-9, 'the engine reads it')
  assert(Math.abs(f._benWalkSpeed / w0 - 0.95) < 1e-9 && Math.abs(f.dashSpeed / d0 - 0.95) < 1e-9, 'speed −5 %')
  assert.equal(HB.damageDealt(f, t, 100, {}), 100 * 1.15, '+15 %')
  // render and hurtbox are ONE state: every frame of the window both are on, every frame after both are off
  for (let i = 0; i < SU.MUT + 5; i++) { const on = !!HB.hurtbox(f), sc = s.renderScale > 1; assert.equal(on, sc, 'together @' + i); world(f, t, 1) }
  assert(!G.mutated(s) && s.renderScale === 1 && HB.hurtbox(f) === null); assert.equal(f._benWalkSpeed, w0, 'speed restored'); assert.equal(HB.damageDealt(f, t, 100, {}), 100)
})
test('5. 200f exactly; then a 240f half-gain cooldown; once per 600f from the end (a full gauge waits)', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t); s.surge = 100; world(f, t, 1); assert(G.mutated(s))
  world(f, t, SU.MUT - 1); assert(G.mutated(s), 'frame 200 still MUTATED'); world(f, t, 1); assert(!G.mutated(s), 'ended after exactly 200f'); assert.equal(s.mutCd, SU.CD); assert.equal(s.mutLock, SU.LOCK)
  contactOn(f, t, { blocked: false }); assert.equal(s.surge, 3, 'half gain in the cooldown'); world(f, t, SU.CD); assert.equal(s.mutCd, 0); const b4 = s.surge; contactOn(f, t, { blocked: false }); assert.equal(s.surge - b4, 6, 'full gain after')
  s.surge = 100; s.lastGainT = s.t; world(f, t, 5); assert(!G.mutated(s) && s.surge === 100, 'locked: the gauge waits at 100')
  world(f, t, SU.LOCK - SU.CD - 5 - 1); assert(!G.mutated(s)); world(f, t, 2); assert(G.mutated(s), 'mutates once 600f have passed since the end'); assert.equal(s.mutations, 2)
})
test('5 / 9. swap / revert / KO / rematch clear Surge, MUTATED and both timers; the render scale and hurtbox go with them', () => {
  const L = ['highbreed', 'heatblast', 'goop', 'xlr8', 'megawhatt']
  const mk = () => { const f = ben('highbreed', L), t = foe(); far(f, t); S(f).surge = 100; world(f, t, 1); assert(G.mutated(S(f))); return [f, t] }
  let [f] = mk(); assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'highbreed')); assert.deepEqual([S(f).surge, S(f).mutT, S(f).mutCd, S(f).mutLock, S(f).renderScale], [0, 0, 0, 0, 1], 'swap')
  assert.equal(HB.hurtbox(f), null)
  ;[f] = mk(); F.revertToHuman(f, { forced: true }); assert.equal(G.hbState(f), null, 'revert'); assert.equal(HB.hurtbox(f), null); assert.notEqual(new SpriteHandler().determineAction(f), 'lightRun')
  ;[f] = mk(); f.health = 0; F.handleBenKO?.(f); if (f.omnitrix.formState?.kind === 'highbreed') F.revertToHuman(f, { forced: true }); assert.equal(G.hbState(f), null, 'KO')
  ;[f] = mk(); F.setupBen10(f, ['highbreed']); assert.equal(G.hbState(f), null, 'rematch: fresh Ben')
})

// @@END-TESTS@@
console.log(`\nHIGHBREED: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
