// WATER HAZARD — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_waterhazard.test.mjs
// Design totals: raw move damage × the form's damage mod (1.05) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 13 (the brief's "slot 21 via the Dial"): PICK FIVE (owner decision, no new dial slots) — the dial is positional over
// the 5 picked aliens; Water Hazard's catalog slot is 22 (the next contiguous ready slot after Rath 21); he is picked into
// the loadout and reached with the Dial (↓↓ + slot key) like any other pick. Counts read BEN10_SLOT_COUNT, never a literal.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../waterhazard.js'
import * as WA from '../waterAffinity.js'
import { GP_PUDDLE } from '../goop.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'waterhazard', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
const { WATERHAZARD: WH, WH_COST } = G
const BA = WH.basic_attacks, DM = WH.mods.damage
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


// ── 2 stats / normals / inputs / water tag ─────────────────────────────────────────────────────────────────────
test('stats: speed ×0.95 / damage ×1.05 / defense ×1.00 / weight ×1.05, double jump, shared health', () => {
  const f = ben()
  assert(Math.abs(f.damageMultiplier - 1.05) < 1e-9 && Math.abs(f.defenseMultiplier - 1.00) < 1e-9 && Math.abs(f._benWeight - 1.05) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.95 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.95')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 950, 'shared health'); assert.equal(f.activeAlienName, 'Water Hazard')
})
test('normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, x) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (x) x(m) }
  chk('light', 5, 18, 0); chk('heavy', 14, 54, -6, m => assert.equal(m.rangeX, 170)); chk('down', 7, 24, -4, m => assert.equal(m.hitLevel, 'low'))
  chk('up', 11, 46, -9, m => assert(m.launcher)); chk('air', 7, 28, 2)
})
test('normals connect through the real combat pipeline', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { const f = ben(), t = foe(); reset(f, t, 10); assert(melee(f, t, k) > 0, k) }
})
test('inputs: the shared alien motions (236 / 214 / 412), →→ double tap, ↓ = Puddle, air = Geyser Dive, held-direction fallback', () => {
  const f = ben(), s = S(f), feed = seq => { s.hist = []; s.lastDir = 5; for (const d of seq) { s.t++; s.hist.push({ d, t: s.t }) } }
  feed([2, 3, 6]); assert.equal(G.readMotion(s), 'blast'); feed([2, 1, 4]); assert.equal(G.readMotion(s), 'burst')
  feed([4, 1, 2]); assert.equal(G.readMotion(s), 'sweep')
  s.hist = []; for (const [dir, k] of [['N', 'blast'], ['U', 'blast'], ['B', 'burst'], ['D', 'puddle'], ['F', 'blast']]) { f._specialHeldDir = dir; assert.equal(G.pickSpecial(f, s), k, dir) }
  f._specialHeldDir = 'F'; s.dashTapT = s.t; assert.equal(G.pickSpecial(f, s), 'lash'); s.dashTapT = -999
  f.onGround = f.grounded = false; assert.equal(G.pickSpecial(f, s), 'dive')
})
test('12. waterAffinity: his id is tagged "water" (one entry; the active form reads it); human Ben is not waterborne', () => {
  assert.deepEqual(WA.WATER_AFFINITY_FORMS.waterhazard, ['water']); const f = ben(); assert.deepEqual(WA.affinityTags(f), ['water']); assert(WA.isWaterborneFighter(f))
  const h = ben(null); assert(!WA.isWaterborneFighter(h), 'human Ben'); assert.deepEqual(WH.tags, ['water'])
})


// ── 3 PUDDLE FORM ──────────────────────────────────────────────────────────────────────────────────────────────
const { WH_PUDDLE, WH_GEYSER } = G
const HOLD = { special: true }
const enterPud = (f, t) => { ready(f); f.energy = 100; const e0 = f.energy; assert(cast(f, t, 'D'), 'puddle'); return e0 - f.energy }
test('4. Puddle Form: Goop\'s numbers (the SAME object read from goop.js): 10 to enter, −4 Power/s, 150f cap, slide speed 6, 12f reform', () => {
  assert.equal(WH_PUDDLE, GP_PUDDLE, 'identical by construction'); assert.equal(WH_GEYSER.DMG, 60)
  assert.deepEqual([GP_PUDDLE.COST, GP_PUDDLE.DRAIN_PER_S, GP_PUDDLE.MAX, GP_PUDDLE.SPEED, GP_PUDDLE.REFORM], [10, 4, 150, 6, 12])
  const f = ben(), t = foe(); far(f, t); assert.equal(enterPud(f, t), 10)
  world(f, t, WH_PUDDLE.MELT + 60, HOLD); assert.equal(S(f).puddle.phase, 'slide'); const e1 = f.energy; world(f, t, 60, HOLD)
  assert(Math.abs(e1 - f.energy - 4) < 0.6, 'drain ~4/s: ' + (e1 - f.energy))
  world(f, t, 200, HOLD); assert(!S(f).puddle || S(f).puddle.phase === 'reform', 'the 150f cap ends the slide'); assert(S(f).lastPuddle || S(f).puddle?.phase === 'reform')
  const g = ben(), u = foe(); far(g, u); enterPud(g, u); world(g, u, 20, HOLD); const x0 = g.x; world(g, u, 10, { special: true, right: true }); assert(Math.abs(g.x - x0 - 60) <= 8, 'slides at speed 6: ' + (g.x - x0))
  world(g, u, 1, {}); assert.equal(S(g).puddle.phase, 'reform', 'release = reform'); let n = 0; while (S(g).puddle && n < 30) { world(g, u, 1); n++ } assert(Math.abs(n - WH_PUDDLE.REFORM) <= 1, 'reform 12f: ' + n)
})
test('4. Puddle Form low profile: a mid normal and a projectile miss his body, a LOW normal still hits; no projector weak point', () => {
  const f = ben(), t = foe(); reset(f, t, 10); enterPud(f, t); world(f, t, 10, HOLD); assert.equal(S(f).puddle.phase, 'slide')
  const hp = f.health; ready(t); t.facing = -1; assert(C.startMove(t, 'heavy', t.basic_attacks.heavy)); for (let i = 0; i < 40 && t.attacking; i++) { world(f, t, 1, HOLD) }
  assert.equal(f.health, hp, 'mid Heavy misses'); assert(S(f).stats.evaded >= 1)
  const p = A.spawnProjectile(t, 'wh_test_bolt', { damage: 30, speed: 0, vx: -0.01, vy: 0, spawnX: cx(f), spawnY: f.y + f.h - 10, rectHitbox: true, w: 40, h: 30, lifetime: 3 }, {}); C.resolveProjectileHitsMulti([p], [f]); clearProj()
  assert.equal(f.health, hp, 'projectile misses')
  ready(t); assert(C.startMove(t, 'crouchLight', { ...t.basic_attacks.crouchLight, hitLevel: 'low' })); let hit = false; for (let i = 0; i < 40 && t.attacking; i++) { world(f, t, 1, HOLD); if (f.health < hp) { hit = true; break } }
  assert(hit, 'a low still hits'); world(f, t, 1, HOLD); assert(!S(f).puddle, 'knocked out of the puddle (the next tick)')
  assert(!('weakpoint' in WH) && !('onWeakpoint' in WH), 'no projector weak point (Goop-only)')
})
test('4. Puddle Form: can\'t jump / attack inside; →↓↘ = GEYSER UPPERCUT 60, launches', () => {
  const f = ben(), t = foe(); reset(f, t, 30); enterPud(f, t); world(f, t, 10, HOLD)
  assert.equal(C.startMove(f, 'light', BA.light), false, 'no normals in the puddle'); assert(f._benPowerCommit > 0 && f.attackCooldown > 0)
  const hp = t.health, seq = [{ special: true, right: true }, { special: true, down: true }, { special: true, down: true, right: true }]
  for (const i of seq) world(f, t, 1, i)
  assert(!S(f).puddle && S(f).lastPuddle.how === 'geyser'); world(f, t, 20)
  assert(t.health < hp, 'geyser hits'); assert(near(hp - t.health, 60 * DM * C.GLOBAL_DAMAGE_SCALE) || hp - t.health > 40, 'dmg ' + (hp - t.health)); assert(t.vy < 0 || !t.onGround || t.isLaunched, 'launches')
})


// ── 4 PRESSURE CORE ────────────────────────────────────────────────────────────────────────────────────────────
const { WH_CORE } = G
function foeSwing(f, t, key = 'heavy', md = null) {
  ready(t); t.facing = cx(f) >= cx(t) ? 1 : -1
  const m = md || t.basic_attacks[key]; assert(C.startMove(t, key, m), 'foe startMove ' + key)
  const hp = f.health, bs = f.blockstun
  for (let i = 0; i < 60 && f.health === hp && !(f.blockstun > bs) && t.attacking; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}) }
  t.attacking = false; t.currentAttack = null
  return { dmg: hp - f.health, hitstun: f.hitstun }
}
test('5. Pressure Core: landing +5 (a blocked hit gives none), taking +3, blocking +2 — tracked per source', () => {
  const f = ben(), t = foe(), s = S(f); reset(f, t, 10)
  melee(f, t, 'light'); assert.equal(s.core, 5); assert.equal(s.coreDealt, 5)
  reset(f, t, 10); melee(f, t, 'heavy', { block: true }); assert.equal(s.core, 5, 'his hit blocked: nothing')
  reset(f, t, 10); ready(f); assert(foeSwing(f, t, 'light').dmg > 0); assert.equal(s.coreTaken, 3)
  ready(f); f.isBlocking = true; foeSwing(f, t, 'light'); f.isBlocking = false; assert.equal(s.coreBlocked, 2); assert.equal(s.core, 10)
})
test('5. Pressure Core: −1/f after 150f with no gain; caps at 100; spend-all; cleared by swap / revert / rematch', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t)
  s.core = 40; s.lastGainT = s.t; world(f, t, WH_CORE.IDLE - 1); assert.equal(s.core, 40); world(f, t, 10); assert(s.core < 40 && s.core >= 29, 'decay ' + s.core)
  s.core = 98; G.gainCore(s, 5, 'dealt'); assert.equal(s.core, 100); assert.equal(G.spendCore(s), 100); assert.equal(s.core, 0)
  const g = ben('waterhazard', ['waterhazard', 'heatblast', 'goop', 'xlr8', 'megawhatt']); S(g).core = 70
  assert(F.applyAlien(g, 'heatblast')); assert(F.applyAlien(g, 'waterhazard')); assert.equal(S(g).core, 0, 'swap')
  S(g).core = 70; F.revertToHuman(g, { forced: true }); assert.equal(G.whState(g), null, 'revert'); F.setupBen10(g, ['waterhazard']); assert.equal(G.whState(g), null, 'rematch: fresh Ben')
})
test('5. FLOOD BONUS (stamp read only): wading +1/s, submerged +3/s, nothing dry; the stamp is never written', () => {
  const run = depth => { const f = ben(), t = foe(); far(f, t); const s = S(f); let writes = 0
    for (let i = 0; i < 120; i++) { const st = { ttl: 2, depth, wb: true, lineY: 300 }; f._benWater = st; world(f, t, 1)
      assert.deepEqual({ ...st, ttl: 0 }, { ttl: 0, depth, wb: true, lineY: 300 }, 'only physics touches ttl') } delete f._benWater; return s }
  const w = run('wading'), m = run('submerged'), d = run('dry')
  assert(Math.abs(w.core - 2) < 0.05, 'wading 2 s → +2: ' + w.core); assert(Math.abs(m.core - 6) < 0.05, 'submerged 2 s → +6: ' + m.core); assert.equal(d.core, 0)
  assert.equal(m.floodDepth, 'submerged'); assert(Math.abs(m.coreFlood - m.core) < 1e-9)
  const src = fs.readFileSync(new URL('../waterhazard.js', import.meta.url), 'utf8'); assert(!/_benWater\s*(=|\.\w+\s*=|\[)|_benFlood/.test(src.replace(/f\._benWater;/g, '')), 'waterhazard.js never writes the flood / its stamp')
})

// @@END-TESTS@@
console.log(`\nWATER HAZARD: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
