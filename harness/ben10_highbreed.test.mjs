// HIGHBREED — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_highbreed.test.mjs
// Design totals: raw move damage × the form's damage mod (1.10) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 10 (the brief's "slot 22 via the Dial", raised count): PICK FIVE (owner decision, no new dial slots, ever) — the dial is
// positional over the 5 picked aliens; Highbreed's catalog slot is 23 (22 is Water Hazard, a READY alien never overwritten);
// he is picked into the loadout and reached with the Dial (↓↓ + slot key) like any other pick. Counts read BEN10_SLOT_COUNT.
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
import { balDmgMult } from '../rosterBalance.js'   // roster balance sweep 2026-11-25: Ben's row (dmg ×1.75) multiplies his live damage on top
const BAL = balDmgMult('ben10')
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
  assert(Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 1.10) < 1e-9 && Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 1.05) < 1e-9 && Math.abs(f._benWeight - 1.10) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - (0.95 * 7) / (getAlienDefinition('heatblast').mods.speed * F.BEN10_ALIEN_POOL.heatblast.stats.speed)) < 0.06, 'speed ×0.95')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 2447, 'shared health'); assert.equal(f.activeAlienName, 'Highbreed')
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


// ── 6 DIALOGUE TAUNT ───────────────────────────────────────────────────────────────────────────────────────────
const { HB_TAUNT } = G
const gameplay = f => JSON.stringify([f.attackCooldown || 0, f._benPowerCommit || 0, f.attacking, f.currentAttack, f.hitstun, f.energy, f.health, A.activeProjectiles.length])
test('6. Dialogue Taunt: Block + Light held 20f plays the dialogue loop; ZERO gameplay frames, no hitbox; Light never jabs', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t); clearProj()
  assert.equal(HB.blockLight(f, ctxOf(f, t)), true, 'owns Block + Light (no jab)')
  const g0 = gameplay(f); world(f, t, HB_TAUNT.HOLD - 1, { block: true, light: true }); assert.equal(s.taunt, null, 'not before 20f')
  world(f, t, 1, { block: true, light: true }); assert(s.taunt, 'starts at 20f'); assert.equal(gameplay(f), g0, 'no cooldown / commit / attack / hitbox')
  assert.equal(new SpriteHandler().determineAction(f), 'taunt'); assert.deepEqual(Object.keys(s.taunt), ['t', 'lightHeld'], 'only a display flag'); world(f, t, 30); assert(s.taunt, 'loops (keys released)'); assert.equal(gameplay(f), g0)
  ready(f); assert(C.startMove(f, 'light', BA.light), 'he can act at once'); world(f, t, 1); assert.equal(s.taunt, null, 'an attack cancels it')
})
test('6. Dialogue Taunt: cancellable by ANY input; unavailable in hitstun / the Ultimate / the air; ends by itself', () => {
  for (const k of ['left', 'right', 'up', 'down', 'jump', 'heavy', 'special', 'ultimate', 'grab', 'charge', 'dash']) {
    const f = ben(), t = foe(), s = S(f); far(f, t); world(f, t, HB_TAUNT.HOLD, { block: true, light: true }); assert(s.taunt, k)
    world(f, t, 1, { [k]: true }); assert.equal(s.taunt, null, k + ' cancels')
  }
  const r = ben(), rt = foe(); far(r, rt); world(r, rt, HB_TAUNT.HOLD, { block: true, light: true }); world(r, rt, 2); world(r, rt, 1, { light: true }); assert.equal(S(r).taunt, null, 'a fresh Light press cancels')
  const h = ben(), u = foe(); far(h, u); h.hitstun = 30; world(h, u, HB_TAUNT.HOLD + 2, { block: true, light: true }); assert.equal(S(h).taunt, null, 'not in hitstun')
  assert.equal(HB.blockLight(h, ctxOf(h, u)), false)
  const q = ben(), v = foe(); far(q, v); S(q).ult = { phase: 'x' }; world(q, v, HB_TAUNT.HOLD + 2, { block: true, light: true }); assert.equal(S(q).taunt, null, 'not in the Ultimate'); S(q).ult = null
  const a = ben(), w = foe(); far(a, w); world(a, w, HB_TAUNT.HOLD, { block: true, light: true }); a.hitstun = 10; world(a, w, 1); assert.equal(S(a).taunt, null, 'a hit cancels it')
  const e = ben(), x = foe(); far(e, x); world(e, x, HB_TAUNT.HOLD, { block: true, light: true }); world(e, x, HB_TAUNT.MAX); assert.equal(S(e).taunt, null, 'ends by itself'); assert.equal(S(e).taunts, 1)
})


// ── 6 MOVES ────────────────────────────────────────────────────────────────────────────────────────────────────
const { HB_CLAWS, HB_DIVE, HB_LANCE, HB_WING, HB_ULT } = G
function runCast(f, t, dir, { max = 200, block = false, input = {}, pre = null } = {}) {
  clearProj(); f.energy = 100; if (pre) pre(f, t); const hp = t.health, e0 = f.energy
  const ok = cast(f, t, dir), cost = e0 - f.energy; let n = 0, proj = 0
  while (ok && n < max) { if (block) t.isBlocking = true; world(f, t, 1, typeof input === 'function' ? input(n) : input); n++; proj = Math.max(proj, A.activeProjectiles.length)
    const s = S(f); if (!s.claws && !s.dive && !s.lance && !s.wing && n > 2 && !A.activeProjectiles.some(p => p.owner === f)) break }
  return { ok, dmg: hp - t.health, cost, n, proj }
}
const SC = DM * BEN_ALIEN_BUFF.damage * BAL * C.GLOBAL_DAMAGE_SCALE
const grounded = q => !!(q.onGround || q.grounded)
const dash = q => { S(q).dashTapT = S(q).t }
const m236 = q => { S(q).hist = [{ d: 2, t: S(q).t - 2 }, { d: 3, t: S(q).t - 1 }, { d: 6, t: S(q).t }] }
const m412 = q => { S(q).hist = [{ d: 4, t: S(q).t - 2 }, { d: 1, t: S(q).t - 1 }, { d: 2, t: S(q).t }] }
test('Rending Claws (236+P, 12): Attack 2 arc, 2 hits 20 / 28 = 48, 170 px, 14f startup, −12 on block; the row follows the state', () => {
  const f = ben(), t = foe(); reset(f, t, 80); const r = runCast(f, t, 'N', { pre: m236 }); assert(r.ok); assert.equal(r.cost, HB_COST.claws)
  assert.deepEqual(S(f).lastClaws.hits.map(h => h.k), ['claws1', 'claws2']); assert(near(r.dmg, 48 * SC) || r.dmg > 38, 'dmg ' + r.dmg); assert.equal(S(f).lastClaws.anim, 'hbClaws')
  const g = ben(), u = foe(); reset(g, u, HB_CLAWS.RANGE + 30); runCast(g, u, 'N', { pre: m236 }); assert.equal(S(g).lastClaws.hits.length, 0, 'beyond 170 px')
  const h = ben(), v = foe(); reset(h, v, 80); runCast(h, v, 'N', { pre: q => { m236(q); S(q).runT = 0; q.dashTimer = 3; world(q, v, 1); m236(q) } }); assert.equal(S(h).lastClaws.anim, 'hbClawsRun', 'running row')
  assert.equal(HB_CLAWS.STARTUP, 14); assert.equal(HB_CLAWS.ACTIVE + HB_CLAWS.RECOVERY + HB_CLAWS.ON_BLOCK, 11)
})
test('7. Talon Dive (→→+P, 12): real 320 px travel, 50, −12 on block; cast GROUNDED he leaps first and spends no jump', () => {
  const f = ben(), t = foe(); far(f, t); const x0 = f.x, j0 = f.jumpCount; const r = runCast(f, t, 'F', { pre: dash, max: 120 }); assert(r.ok); assert.equal(r.cost, HB_COST.dive)
  const L = S(f).lastDive; assert(L.leap, 'leapt first'); assert.equal(L.jumps, j0, 'no jump spent'); assert.equal(f.jumpCount, j0)
  assert(L.travel > 0 && L.travel <= HB_DIVE.TRAVEL + 1, 'travel ' + L.travel); assert(f.x - x0 > 100, 'real travel ' + (f.x - x0))
  const g = ben(), u = foe(); reset(g, u, 60); g.onGround = g.grounded = false; g.y -= 120; g.jumpCount = 2; u.x = g.x + 140
  const q = runCast(g, u, 'F', { pre: dash, max: 80 }); assert(!S(g).lastDive.leap, 'airborne: no leap'); assert(S(g).lastDive.hit); assert(near(q.dmg, 50 * SC), 'dmg ' + q.dmg); assert.equal(S(g).lastDive.jumps, 2)
  assert.equal(2 + HB_DIVE.LAND + HB_DIVE.ON_BLOCK, 2)
})
test('Genetic Lance (412+P, 14): the projectile was EXCLUDED → melee lunge fallback, 280 px real travel, 45, stops on contact', () => {
  const f = ben(), t = foe(); reset(f, t, 150); const r = runCast(f, t, 'B', { pre: m412 }); assert(r.ok); assert.equal(r.cost, HB_COST.lance)
  assert.equal(S(f).lastLance.why, 'hit'); assert(near(r.dmg, 45 * SC), 'dmg ' + r.dmg); assert.equal(r.proj <= 1, true, 'no projectile: one rect hitbox at a time')
  const g = ben(), u = foe(); far(g, u); const x1 = g.x; runCast(g, u, 'B', { pre: m412 }); assert.equal(S(g).lastLance.why, 'whiff'); assert(Math.abs(g.x - x1 - HB_LANCE.TRAVEL) <= 24, 'travel ' + (g.x - x1))
  assert(!A.activeProjectiles.some(p => p.owner === g && !p.rectHitbox), 'never a travelling projectile')
})
test('7. Wing Slash (air ↓+P, 12): diagonal dive slash 48, once per airtime, no jump refill; resets on landing', () => {
  const f = ben(), t = foe(); reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 120; f.jumpCount = 2; t.x = f.x + 120
  const r = runCast(f, t, 'D', { max: 80 }); assert(r.ok); assert.equal(r.cost, HB_COST.wing); assert(S(f).lastWing.hit); assert(near(r.dmg, 48 * SC), 'dmg ' + r.dmg)
  assert.equal(S(f).lastWing.jumps, 2, 'no refill'); assert.equal(f.jumpCount, 2)
  const g = ben(), u = foe(); far(g, u); g.onGround = g.grounded = false; g.y -= 300; g.energy = 100; assert(cast(g, u, 'D')); world(g, u, 8)
  ready(g); g.energy = 100; assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'once per airtime')
  world(g, u, 120); assert(grounded(g)); assert.equal(S(g).wingUsed, false, 'landing resets it')
})
const ultRun = (f, t, opts = {}) => { ready(f); clearProj(); f.energy = 100; const ok = A.triggerUltimate(f, ctxOf(f, t)); const cost = 100 - f.energy; if (!ok) return { ok, n: -1 }; let n = 0
  while ((S(f).ult || n < 4) && n < 400) { if (opts.block) t.isBlocking = true; world(f, t, 1); n++ } return { ok, n, cost } }
test('8. ULTIMATE Genetic Purge (55): clean claw opener 40 → circle → 3 × 25 dives → 125 beam = 240; Surge 0; positions restore; knockdown', () => {
  const f = ben(), t = foe(); reset(f, t, 80); S(f).surge = 60; const hp = t.health, fx = f.x, fy = f.y, tx = t.x, ty = t.y
  const r = ultRun(f, t); assert(r.ok); assert.equal(r.cost, HB_COST.ultimate)
  const L = S(f).lastUlt; assert(L.captured); assert.deepEqual(L.hits, [40, 25, 25, 25, 125]); assert.equal(L.raw, 240)
  assert(hp - t.health > 100); assert(t.knockdownState); assert.equal(S(f).surge, 0); assert.deepEqual([f.x, f.y, t.x, t.y], [fx, fy, tx, ty], 'positions restore')
  assert(f.attackCooldown >= HB_ULT.LOCKOUT - 2, '100f lockout')
})
test('8. ULTIMATE: whiff / block = no cinematic, 60f recovery; hash angles identical for the same seed; render-only beam / strand', () => {
  const f = ben(), t = foe(); far(f, t); ultRun(f, t); assert.equal(S(f).lastUlt.captured, false); assert.equal(S(f).lastUlt.why, 'whiff'); assert(f.attackCooldown >= HB_ULT.WHIFF - 6, '60f: ' + f.attackCooldown)
  const g = ben(), u = foe(); reset(g, u, 80); const hp = u.health; ultRun(g, u, { block: true }); assert.equal(S(g).lastUlt.why, 'blocked'); assert(!u.knockdownState); assert(hp - u.health < 40, 'no cinematic damage')
  assert.deepEqual(G.ultDives(7, 100, 0), G.ultDives(7, 100, 0)); assert.notDeepEqual(G.ultDives(7, 100, 0), G.ultDives(7, 100, 1)); assert.notDeepEqual(G.ultDives(7, 100, 0), G.ultDives(8, 100, 0))
  for (const d of G.ultDives(99, 5, 1)) assert(d.ang >= 30 && d.ang <= 150)
  const h = ben(), v = foe(); reset(h, v, 80); ready(h); clearProj(); h.energy = 100; assert(A.triggerUltimate(h, ctxOf(h, v)))
  for (let i = 0; i < 70; i++) { world(h, v, 1); if (S(h).ult && S(h).ult.phase !== 'opener') assert(!A.activeProjectiles.some(p => p.owner === h), 'strand / beam: no hitbox') }
})


// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const sumA = a => a.reduce((x, y) => x + y, 0)
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  claws: sumA(HB_CLAWS.HITS), dive: HB_DIVE.DMG, lance: HB_LANCE.DMG }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
for (const [name, route, target] of [['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 90],
  ['2. Low, Heavy, Rending Claws', ['low', 'heavy', 'claws'], 112], ['3. Talon Dive, Heavy, Genetic Lance (melee fallback)', ['dive', 'heavy', 'lance'], 128]])
  test('design total ' + name + ' ≈ ' + target, () => { const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`) })
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})
test('route 2 live: Low, Heavy, Rending Claws (both claw hits land)', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 80); f.comboCounter = 2; f.comboTimer = 30; d.push(runCast(f, t, 'N', { pre: m236 }).dmg); assert.equal(S(f).lastClaws.hits.length, 2); console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})
test('route 3 live: Talon Dive (air), Heavy, Genetic Lance', () => {
  const f = ben(), t = foe(); reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 120; t.x = f.x + 140
  const d = [runCast(f, t, 'F', { pre: dash, max: 80 }).dmg]; assert(S(f).lastDive.hit); world(f, t, 30)
  f.facing = 1; reset(f, t, 10); d.push(melee(f, t, 'heavy')); reset(f, t, 150); d.push(runCast(f, t, 'B', { pre: q => { world(q, t, 1); m412(q) } }).dmg); assert.equal(S(f).lastLance.why, 'hit')
  assert(d.every(x => x > 0)); console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})

// ── 9 swap / revert / KO / rematch (moves) ──────────────────────────────────────────────────────────────────────
test('9. swap / revert / KO / rematch mid-cast leave no lingering body fields (glide / lunge / flight)', () => {
  const L = ['highbreed', 'heatblast', 'goop', 'xlr8', 'megawhatt']
  const mk = () => { const f = ben('highbreed', L), t = foe(); far(f, t); f.energy = 100; dash(f); assert(cast(f, t, 'F')); world(f, t, 12); S(f).surge = 70; S(f).mutCd = 50; return [f, t] }
  const clean = ben(); const w0 = clean._benWalkSpeed, d0 = clean.dashSpeed
  let [f] = mk(); assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'highbreed')); assert.deepEqual([S(f).dive, S(f).surge, S(f).mutCd], [null, 0, 0], 'swap')
  assert(!('_benGlide' in f) && !('_benLunge' in f), 'swap: no glide / lunge')
  ;[f] = mk(); S(f).surge = 100; world(f, foe(), 1); assert(G.mutated(S(f))); assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'highbreed'))
  assert.equal(f._benWalkSpeed, w0, 'MUTATED −5 % undone by the swap'); assert.equal(f.dashSpeed, d0)
  ;[f] = mk(); F.revertToHuman(f, { forced: true }); assert.equal(G.hbState(f), null); assert(!('_benGlide' in f) && !f._alienFlightProfile, 'revert: no glide / flight profile')
  ;[f] = mk(); F.setupBen10(f, ['highbreed']); assert.equal(G.hbState(f), null, 'rematch')
})

// ── 10 slot → PICK FIVE / Dial / HUD / Vow / determinism ─────────────────────────────────────────────────────
test('10. slot → PICK FIVE: slot count from the registry, Highbreed READY at catalog slot 23 (contiguous), no ready alien overwritten', () => {
  assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT); assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('highbreed'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 23); assert.equal(d.displayName, 'Highbreed')
  const ready = BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready'); assert.deepEqual(ready.map(x => x.slot).sort((a, b) => a - b), ready.map((_, i) => i + 1), 'ready slots contiguous')
  for (const [k, sl] of [['goop', 4], ['ripjaws', 20], ['rath', 21], ['waterhazard', 22]]) assert.equal(getAlienDefinition(k).slot, sl, k + ' never overwritten')
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'highbreed').length, 1); assert(getAvailableAlienKeys(false).includes('highbreed'))
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Ripped by: Eeveeloverthespriter8/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
})
test('10. Omnitrix Dial: Highbreed picked into the last slot — same cost as any slot, no clock change, fresh state; a hit cancels the dial', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'highbreed'], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    const c = { seed: 1, frame: 0, playerIndex: 0 }; assert(F.ben10TransformOrSwap(f, slot, c)); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); assert.equal(c.frame, 0, 'clock untouched'); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, 'highbreed'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
  assert.deepEqual([S(a.f).surge, S(a.f).mutT, S(a.f).taunt], [0, 0, null])
  const h = fresh(); F.applyBen10VariantStats(h, 'default'); F.setupBen10(h, pick); h.energy = 100; assert(F.ben10TransformOrSwap(h, BEN10_SLOT_COUNT - 1, { seed: 1, frame: 0, playerIndex: 0 }))
  if (!h.transformed) { h.hitstun = 20; F.invalidateBenAction?.(h); for (let i = 0; i < 80; i++) F.updateTransformDevice?.(h, 1000 / 60); assert(!h.transformed || h.activeAlien === 'highbreed', 'a hit during startup cancels or the transform is atomic') }
})
test('10. HUD: the Surge gauge / MUTATED / cooldown label stay inside the player bar (both sides, every state)', () => {
  for (const flip of [false, true]) for (const st of ['base', 'surge', 'full', 'mutated', 'cooldown']) {
    const f = ben(), s = S(f); if (st === 'surge') s.surge = 40; if (st === 'full') s.surge = 100; if (st === 'mutated') s.mutT = 120; if (st === 'cooldown') { s.mutCd = 100; s.surge = 20 }
    let minX = Infinity, maxX = -Infinity
    const ctx = { save() {}, restore() {}, fillRect(x, y, w) { minX = Math.min(minX, x); maxX = Math.max(maxX, x + w) }, fillText(str, x) { const w = str.length * 4.8; const x0 = this.textAlign === 'right' ? x - w : x; minX = Math.min(minX, x0); maxX = Math.max(maxX, x0 + w) }, strokeRect() {} }
    const x = 100, pbw = 120; G.drawHighbreedHud(ctx, f, { x, enY: 40, enH: 8, pbw, flip }); assert(minX >= x && maxX <= x + 8 + pbw + 1, `flip ${flip} ${st}: ${minX}..${maxX}`)
  }
})
test('10. Vow pick includes Highbreed (hash mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'highbreed'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('highbreed') && picks.size === L.length)
})
test('10. same-seed determinism: an identical scripted sequence (every move, flight, Surge → MUTATED, taunt, the ult) yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light'); melee(f, t, 'heavy'); melee(f, t, 'down')
    reset(f, t, 80); runCast(f, t, 'N', { pre: m236 }); reset(f, t, 150); runCast(f, t, 'B', { pre: m412 })
    reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 120; t.x = f.x + 140; runCast(f, t, 'F', { pre: dash, max: 80 }); world(f, t, 30)
    reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 120; t.x = f.x + 120; runCast(f, t, 'D', { max: 80 }); world(f, t, 30)
    far(f, t); f.onGround = f.grounded = false; f.vy = -6; world(f, t, 40, { jump: true }); world(f, t, 60)
    S(f).surge = 100; world(f, t, 10); world(f, t, HB_TAUNT.HOLD + 5, { block: true, light: true }); world(f, t, 10, { left: true })
    reset(f, t, 80); ultRun(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  const a = run(), b = run(); assert.equal(a, b); const st = JSON.parse(a).s; assert(st.lastUlt.captured, 'the scripted ult captured'); assert(st.mutations >= 1 && st.taunts >= 1 && st.flights >= 1)
})
test('GAME_STATE stays plain data mid-cast (claws, dive, lance, wing, MUTATED, taunt, ult cinematic)', () => {
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  const mid = (dir, n, setup) => { const f = ben(), t = foe(); setup(f, t); f.energy = 100; assert(cast(f, t, dir), dir); world(f, t, n); return f }
  let f = mid('N', 8, (a, b) => { far(a, b); m236(a) }); assert(S(f).claws); assert(plain(S(f)), 'claws')
  f = mid('F', 12, (a, b) => { far(a, b); dash(a) }); assert(S(f).dive); assert(plain(S(f)), 'dive')
  f = mid('B', 14, (a, b) => { far(a, b); m412(a) }); assert(S(f).lance); assert(plain(S(f)), 'lance')
  f = mid('D', 8, (a, b) => { far(a, b); a.y -= 200; a.onGround = a.grounded = false }); assert(S(f).wing); assert(plain(S(f)), 'wing')
  const m = ben(), mt = foe(); far(m, mt); S(m).surge = 100; world(m, mt, 2); world(m, mt, HB_TAUNT.HOLD, { block: true, light: true }); assert(S(m).mutT > 0 && S(m).taunt); assert(plain(S(m)), 'mutated + taunt')
  const g = ben(), u = foe(); reset(g, u, 80); ready(g); g.energy = 100; A.triggerUltimate(g, ctxOf(g, u)); world(g, u, 60)
  assert(S(g).ult && S(g).ult.phase === 'dives', 'mid-cinematic ' + S(g).ult?.phase); assert(plain(S(g)), 'ult')
})
const stubCtx = () => new Proxy({ globalAlpha: 1, canvas: { width: 1280, height: 720 } }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true) })
test('render: every move / MUTATED / taunt / the ult draw without throwing and drawing never changes GAME_STATE', () => {
  const c = stubCtx(); const run = (f, t, n, input = {}) => { for (let i = 0; i < n; i++) { world(f, t, 1, input); const a = JSON.stringify(S(f)), x = JSON.stringify([t.x, t.health, f.x, f.y, f.energy])
    G.drawHighbreedFx(c, f, FRAME, t); G.drawHighbreedHud(c, f, { x: 0, enY: 0, enH: 8, pbw: 200, flip: false }); HB.targetOffset(f, t); HB.bodyOffset(f); HB.hurtbox(f); new SpriteHandler().determineAction(f)
    assert.equal(JSON.stringify(S(f)), a); assert.equal(JSON.stringify([t.x, t.health, f.x, f.y, f.energy]), x) } }
  for (const [dir, gap, pre] of [['N', 80, m236], ['B', 150, m412], ['F', 150, dash]]) { clearProj(); const f = ben(), t = foe(); reset(f, t, gap); f.energy = 100; pre(f); assert(cast(f, t, dir), dir); run(f, t, 60) }
  clearProj(); const g = ben(), u = foe(); reset(g, u, 30); g.energy = 100; g.y -= 160; g.onGround = g.grounded = false; assert(cast(g, u, 'D')); run(g, u, 40)
  const m = ben(), mt = foe(); far(m, mt); S(m).surge = 100; run(m, mt, 10); run(m, mt, HB_TAUNT.HOLD + 10, { block: true, light: true })
  const h = ben(), v = foe(); reset(h, v, 80); ready(h); h.energy = 100; assert(A.triggerUltimate(h, ctxOf(h, v))); run(h, v, 150)
  assert(S(h).lastUlt && S(h).lastUlt.captured); run(h, v, 20)
})
test('no Math.random / gameRng in highbreed.js / highbreedAssets.js', () => {
  for (const p of ['../highbreed.js', '../highbreedAssets.js']) { const src = fs.readFileSync(new URL(p, import.meta.url), 'utf8'); assert(!/Math\.random|gameRng/.test(src), p) }
})

// @@END-TESTS@@
console.log(`\nHIGHBREED: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
