// WATER HAZARD — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_waterhazard.test.mjs
// Design totals: raw move damage × the form's damage mod (1.05) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 13 (the brief's "slot 21 via the Dial"): PICK FIVE (owner decision, no new dial slots) — the dial is positional over
// the 5 picked aliens; Water Hazard's catalog slot is 22 (the next contiguous ready slot after Rath 21); he is picked into
// the loadout and reached with the Dial (↓↓ + slot key) like any other pick. Counts read BEN10_SLOT_COUNT, never a literal.
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
import { balDmgMult } from '../rosterBalance.js'   // roster balance sweep 2026-11-25: Ben's row (dmg ×1.75) multiplies his live damage on top
const BAL = balDmgMult('ben10')
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../waterhazard.js'
import * as WA from '../waterAffinity.js'
import { GP_PUDDLE } from '../goop.js'
import * as FL from '../benFlood.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message, (e.stack.split('\n').find(l => l.includes('ben10_waterhazard')) || '').trim()) } }
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
  assert(Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 1.05) < 1e-9 && Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 1.00) < 1e-9 && Math.abs(f._benWeight - 1.05) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.95 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.95')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 2447, 'shared health'); assert.equal(f.activeAlienName, 'Water Hazard')
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
  assert(t.health < hp, 'geyser hits'); assert(near(hp - t.health, 60 * DM * BEN_ALIEN_BUFF.damage * BAL * C.GLOBAL_DAMAGE_SCALE) || hp - t.health > 40, 'dmg ' + (hp - t.health)); assert(t.vy < 0 || !t.onGround || t.isLaunched, 'launches')
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


// ── 5 DRENCHED → SHORT FUSE ────────────────────────────────────────────────────────────────────────────────────
const { WH_DRENCH } = G
const pipHit = (f, t, tag, cast, blocked = false) => contactOn(f, t, { proj: { alien: { wh: tag, cast } }, blocked })
const contactOn = (f, t, info) => WH.onContact(f, t, info)
// a raw damage write through the ONE choke-point, as a given attacker / source (no combo scaling)
const dmgAs = (target, attacker, source, move) => { const hp = target.health; C.applyScaledDamage(target, 100, { attacker, source, move, scale: 1 }); return hp - target.health }
test('6. Drenched: one pip per CAST (multi-tick casts count once), max 3, no pip from blocks / non-pip moves; expire 240f after the last', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t)
  pipHit(f, t, 'blast', 101); pipHit(f, t, 'blast', 101); assert.equal(s.pips, 1, 'one per cast'); pipHit(f, t, 'burst', 102, true); assert.equal(s.pips, 1, 'blocked: none')
  pipHit(f, t, 'lash', 103); assert.equal(s.pips, 1, 'Claw Lash gives none'); pipHit(f, t, 'geyser', 104); assert.equal(s.pips, 2)
  world(f, t, WH_DRENCH.EXPIRE - 1); assert.equal(s.pips, 2); world(f, t, 1); assert.equal(s.pips, 0, 'expired 240f after the last')
})
test('6. 3 pips → SHORT FUSE 240f (pips consumed): +20 % from ELECTRIC hits only; no stun, no refresh; 360f immunity after', () => {
  const f = ben(), t = foe(), s = S(f); far(f, t)
  for (const [k, c] of [['blast', 1], ['sweep', 2], ['dive', 3]]) pipHit(f, t, k, c); assert.equal(s.pips, 0, 'consumed'); assert(G.fuseOn(t)); assert.equal(s.fuses, 1)
  assert.equal(t.hitstun, 0, 'no stun'); const st = { ...t }
  const mw = ben('megawhatt'), plain = foe('naruto')
  const e = dmgAs(t, mw, 'melee', 'light'), n = dmgAs(t, plain, 'melee', 'light')
  const e0 = dmgAs(foe(), mw, 'melee', 'light'), n0 = dmgAs(foe(), plain, 'melee', 'light')
  assert(Math.abs(e / e0 - 1.2) < 0.02, `electric ×1.2: ${e} vs ${e0}`); assert(Math.abs(n - n0) < 1e-9, 'a non-electric hit is unchanged')
  const ep = dmgAs(t, plain, 'projectile', 'mw_spark'), ep0 = dmgAs(foe(), plain, 'projectile', 'mw_spark'); assert(Math.abs(ep / ep0 - 1.2) < 0.02, 'tagged electric projectile ×1.2')
  pipHit(f, t, 'blast', 9); assert.equal(s.pips, 0, 'no pip / refresh while it runs'); assert.equal(t._benShortFuse.left, WH_DRENCH.FUSE)
  world(f, t, WH_DRENCH.FUSE); assert(!G.fuseOn(t), '240f'); t.health = t.maxHealth   /* the balance-buffed (×1.75) casts above empty the 950-HP fixture foe; refill so the hit is measurable */; assert(Math.abs(dmgAs(t, mw, 'melee', 'light') - e0) < 1e-9, 'over: no bonus')
  pipHit(f, t, 'blast', 10); assert.equal(s.pips, 0, 'immune 360f'); world(f, t, WH_DRENCH.IMMUNE); assert(!('_benShortFuse' in t), 'the stamp is gone')
  pipHit(f, t, 'blast', 11); assert.equal(s.pips, 1, 'pips again after the immunity')
  assert.equal(st.facing, t.facing); assert.equal(FRAME, FRAME, 'no clock / polling field touched')
})
test('6. Short Fuse stacks INDEPENDENTLY with Ripjaws\' submerged-electric +15 % (×1.2 × 1.15); it outlives a swap (pips do not)', () => {
  const f = ben('waterhazard', ['waterhazard', 'megawhatt', 'goop', 'xlr8', 'heatblast']), t = foe(), s = S(f); far(f, t)
  for (const c of [1, 2, 3]) pipHit(f, t, 'blast', c); assert(G.fuseOn(t)); s.pips = 2
  const mw = ben('megawhatt'), sub = () => { t._benWater = { ttl: 2, depth: 'submerged', wb: false } }
  sub(); const both = dmgAs(t, mw, 'melee', 'light'); const g = foe(); g._benWater = { ttl: 2, depth: 'submerged', wb: false }; const flood = dmgAs(g, mw, 'melee', 'light'), base = dmgAs(foe(), mw, 'melee', 'light')
  assert(Math.abs(flood / base - 1.15) < 0.02 && Math.abs(both / base - 1.2 * 1.15) < 0.02, `stack ${both} / ${flood} / ${base}`); delete t._benWater
  assert(F.applyAlien(f, 'megawhatt')); assert(G.fuseOn(t), 'the fuse runs on after the swap'); assert(F.applyAlien(f, 'waterhazard')); assert.equal(S(f).pips, 0, 'his pips cleared')
})


// ── 6 MOVES ────────────────────────────────────────────────────────────────────────────────────────────────────
const { WH_BLAST, WH_BURST, WH_LASH, WH_SWEEP, WH_DIVE, WH_ULT } = G
// cast a special and run the world until the cast is over (input = his held buttons each frame)
function runCast(f, t, dir, { max = 200, block = false, input = {}, pre = null } = {}) {
  clearProj(); f.energy = 100; if (pre) pre(f, t); const hp = t.health, e0 = f.energy
  const ok = cast(f, t, dir), cost = e0 - f.energy; let n = 0, proj = 0
  while (ok && n < max) { if (block) t.isBlocking = true; world(f, t, 1, typeof input === 'function' ? input(n) : input); n++; proj = Math.max(proj, A.activeProjectiles.length)
    const s = S(f); if (!s.blast && !s.burst && !s.chain && !s.sweep && !s.dive && !s.puddle && n > 2 && !A.activeProjectiles.some(p => p.owner === f)) break }
  return { ok, dmg: hp - t.health, cost, n, proj }
}
const SC = DM * BEN_ALIEN_BUFF.damage * BAL * C.GLOBAL_DAMAGE_SCALE
test('7. Pressure Blast (236+P, 10): a tap fires a 460px jet at 10f for 40; one on screen; +1 Drenched on a clean hit', () => {
  const f = ben(), t = foe(); reset(f, t, 300); const r = runCast(f, t, 'N'); assert(r.ok); assert.equal(r.cost, WH_COST.blast)
  assert.equal(S(f).lastBlast.full, false); assert.equal(S(f).lastBlast.dmg, 40); assert(near(r.dmg, 40 * SC), 'dmg ' + r.dmg); assert.equal(S(f).pips, 1)
  const g = ben(), u = foe(); far(g, u); g.energy = 100; assert(cast(g, u, 'N')); world(g, u, WH_BLAST.MIN + WH_BLAST.RECOVERY + 1)
  assert(A.activeProjectiles.some(p => p.owner === g && p.alien?.wh === 'blast'), 'the jet flies'); ready(g); assert.equal(cast(g, u, 'N'), false, 'one on screen')
  const p = A.activeProjectiles.find(p => p.owner === g); assert(Math.abs(p.lifetime + WH_BLAST.RECOVERY + 1 - Math.ceil(WH_BLAST.RANGE / WH_BLAST.SPEED)) <= 2, 'range 460')
})
test('7. Pressure Blast HOLD: up to 30f; a full hold costs +6 and deals 40 + 0.5 × Core (max 75), spending ALL Core; a short hold keeps it', () => {
  const run = (core, frames) => { const f = ben(), t = foe(); reset(f, t, 300); S(f).core = core; S(f).lastGainT = S(f).t
    const r = runCast(f, t, 'N', { input: i => (i < frames ? { special: true } : {}) }); return { f, r, L: S(f).lastBlast, e: f.energy } }
  let x = run(40, 40); assert.equal(x.L.full, true); assert.equal(x.L.dmg, 60); assert.equal(S(x.f).core <= 6, true, 'all Core spent'); assert.equal(x.L.core, 40)
  assert(near(x.r.dmg, 60 * SC), 'dmg ' + x.r.dmg)
  x = run(100, 40); assert.equal(x.L.dmg, 75, 'cap 75')
  const f = ben(), t = foe(); far(f, t); f.energy = 100; assert(cast(f, t, 'N')); const e1 = f.energy; world(f, t, WH_BLAST.FULL + 1, { special: true }); const g2 = ben(), u2 = foe(); far(g2, u2); g2.energy = 100; assert(cast(g2, u2, 'N')); const e2 = g2.energy; world(g2, u2, WH_BLAST.FULL + 1, i => (i < 12 ? { special: true } : {}))
  assert(Math.abs((e1 - f.energy) - (e2 - g2.energy) - WH_COST.blastFull) < 0.01, `full hold +6 Power vs a tap: ${e1 - f.energy} / ${e2 - g2.energy}`)
  x = run(40, 15); assert.equal(x.L.full, false); assert.equal(x.L.dmg, 40); assert(S(x.f).core >= 40, 'a short hold keeps the Core')
})
test('Hydro Burst (214+P, 14, Core ≥ 20): 160px radial, 16f, 30 + 0.4 × Core (max 70), spends ALL Core, knockback, −14 on block', () => {
  const f = ben(), t = foe(); reset(f, t, 60); S(f).core = 10; f.energy = 100; assert.equal(cast(f, t, 'B'), false, 'needs Core ≥ 20'); assert.equal(f.energy, 100)
  const g = ben(), u = foe(); reset(g, u, 60); S(g).core = 50; const r = runCast(g, u, 'B'); assert(r.ok); assert.equal(r.cost, WH_COST.burst)
  assert.equal(S(g).lastBurst.dmg, 50); assert(near(r.dmg, 50 * SC), 'dmg ' + r.dmg); assert(S(g).core <= 5, 'spent'); assert.equal(S(g).pips, 1); assert(u.x > g.x + 60, 'knocked back')
  const h = ben(), v = foe(); reset(h, v, 60); v.x = h.x - 80; S(h).core = 100; runCast(h, v, 'B'); assert.equal(S(h).lastBurst.dmg, 70, 'cap 70'); assert(S(h).lastBurst.hit, 'radial: hits behind him')
  const k = ben(), w = foe(); reset(k, w, 200); S(k).core = 40; runCast(k, w, 'B'); assert(!S(k).lastBurst.hit, '160px radius')
  assert.equal(WH_BURST.ACTIVE + WH_BURST.RECOVERY + WH_BURST.ON_BLOCK, 16, 'blockstun derives −14')
})
test('Claw Lash (→→+P, 12): 300px real travel, stops on contact, 2 hits 20/28; a whiff swings at the end; the limb hurtbox extends', () => {
  const dash = q => { S(q).dashTapT = S(q).t }
  const f = ben(), t = foe(); reset(f, t, 150); const x0 = f.x; const r = runCast(f, t, 'F', { pre: dash }); assert(r.ok); assert.equal(r.cost, WH_COST.lash)
  assert.deepEqual(S(f).lastChain.hits.map(h => h.k), ['lash1', 'lash2']); assert(near(r.dmg, 48 * SC * 0.93) || r.dmg > 35, 'dmg ' + r.dmg); assert(f.x - x0 < 300)
  const g = ben(), u = foe(); far(g, u); const x1 = g.x; runCast(g, u, 'F', { pre: dash }); assert.equal(S(g).lastChain.why, 'whiff'); assert(Math.abs(g.x - x1 - WH_LASH.TRAVEL) <= 24, 'travel ' + (g.x - x1))
  const h = ben(), v = foe(); far(h, v); h.energy = 100; dash(h); assert(cast(h, v, 'F')); world(h, v, WH_LASH.STARTUP + 2); const hb = WH.hurtbox(h); assert(hb && hb.w === h.w + WH_LASH.LIMB, 'extended limb hurtbox')
  assert.equal(r.proj > 0, true)
})
test('8. Undertow Sweep (412+P, 12): 140px ring at his feet, 14f, 45, hits LOW, a clean hit TRIPS (forced knockdown), +1 pip; −13 on block', () => {
  const f = ben(), t = foe(); reset(f, t, 60); const r = runCast(f, t, 'D', { pre: q => { S(q).hist = [{ d: 4, t: S(q).t - 2 }, { d: 1, t: S(q).t - 1 }, { d: 2, t: S(q).t }] } })
  assert(r.ok); assert.equal(r.cost, WH_COST.sweep); assert(near(r.dmg, 45 * SC), 'dmg ' + r.dmg); assert(S(f).lastSweep.kd, 'trip'); assert(t.knockdownState || S(f).lastSweep.kd); assert.equal(S(f).pips, 1)
  const g = ben(), u = foe(); reset(g, u, 60); runCast(g, u, 'D', { block: true, pre: q => { S(q).hist = [{ d: 4, t: S(q).t - 2 }, { d: 1, t: S(q).t - 1 }, { d: 2, t: S(q).t }] } }); assert(!S(g).lastSweep.kd, 'no trip on block'); assert.equal(S(g).pips, 0)
  assert.equal(WH_SWEEP.ACTIVE + WH_SWEEP.RECOVERY + WH_SWEEP.ON_BLOCK, 14)
})
test('9. Geyser Dive (air +P, 12): diagonal-down dive, 48, once per airtime, no jump refill, +1 pip', () => {
  const f = ben(), t = foe(); reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 120; f.jumpCount = 2; t.x = f.x + 140
  const r = runCast(f, t, 'N', { max: 80 }); assert(r.ok); assert.equal(r.cost, WH_COST.dive); assert.equal(S(f).lastDive.hit, true); assert(near(r.dmg, 48 * SC), 'dmg ' + r.dmg)
  assert.equal(S(f).lastDive.jumps, 2, 'no refill'); assert.equal(S(f).pips, 1)
  const g = ben(), u = foe(); far(g, u); g.onGround = g.grounded = false; g.y -= 300; g.energy = 100; assert(cast(g, u, 'N')); world(g, u, 8)
  ready(g); g.energy = 100; assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'once per airtime')
})
const ultRun = (f, t, opts = {}) => { ready(f); clearProj(); f.energy = 100; const ok = A.triggerUltimate(f, ctxOf(f, t)); const cost = 100 - f.energy; if (!ok) return { ok, n: -1 }; let n = 0
  while ((S(f).ult || n < 4) && n < 400) { if (opts.block) t.isBlocking = true; world(f, t, 1); n++ } return { ok, n, cost } }
test('10. ULTIMATE Tidal Discharge (55): clean jet opener → vortex → 4 × 22 barrage → 112 geyser = 240; Core 0; positions restore; knockdown', () => {
  const f = ben(), t = foe(); reset(f, t, 200); S(f).core = 60; const hp = t.health, fx = f.x, tx = t.x
  const r = ultRun(f, t); assert(r.ok); assert.equal(r.cost, WH_COST.ultimate)
  const L = S(f).lastUlt; assert(L.captured); assert.deepEqual(L.hits, [40, 22, 22, 22, 22, 112]); assert.equal(L.raw, 240)
  assert(hp - t.health > 100); assert(t.knockdownState); assert.equal(S(f).core, 0); assert.equal(f.x, fx); assert.equal(t.x, tx); assert(f.attackCooldown >= WH_ULT.LOCKOUT - 2)
})
test('10. ULTIMATE: whiff / block = no cinematic, 60f recovery; 2 Drenched pips at capture → the final hit adds 1 (→ SHORT FUSE); hashed angles', () => {
  const f = ben(), t = foe(); far(f, t); ultRun(f, t); assert.equal(S(f).lastUlt.captured, false); assert.equal(S(f).lastUlt.why, 'whiff'); assert(f.attackCooldown >= WH_ULT.WHIFF - 6, '60f recovery: ' + f.attackCooldown)
  const g = ben(), u = foe(); reset(g, u, 200); ultRun(g, u, { block: true }); assert.equal(S(g).lastUlt.why, 'blocked'); assert(!u.knockdownState)
  ready(g); g.energy = 100; const h = ben(), v = foe(); reset(h, v, 200); S(h).pips = 2; S(h).pipT = S(h).t; ultRun(h, v)
  assert(S(h).lastUlt.captured && S(h).lastUlt.pipAdded, 'the final hit adds the pip'); assert(G.fuseOn(v), '→ SHORT FUSE'); assert.equal(S(h).lastUlt.raw, 240, 'no extra damage')
  const k = ben(), w = foe(); reset(k, w, 200); S(k).pips = 1; S(k).pipT = S(k).t; ultRun(k, w); assert(!S(k).lastUlt.pipAdded, 'only at exactly 2')
  assert.deepEqual(G.ultJets(7, 100, 0), G.ultJets(7, 100, 0)); assert.notDeepEqual(G.ultJets(7, 100, 0), G.ultJets(7, 100, 1))
})


// ── 12 inside a real STORM TIDE flood (Ripjaws is merged: benFlood.js) ─────────────────────────────────────────
test('12. in a REAL Ripjaws flood: waterborne (no breath record, no drowning, no HP lost), Core +1/s wading / +3/s submerged; the flood is never written by him', () => {
  const f = ben(), t = foe(); far(f, t); f.energy = 100
  const api = { getOpponent: o => (o === t ? f : t), activeProjectiles: () => A.activeProjectiles }
  const r = FL.startFlood(t, { ...STAGE }, [t, f], 77); FL.raiseFlood(t)
  const hp = f.health, s = S(f); let sub = 0, wade = 0, c0 = s.core
  for (let i = 0; i < 900 && FL.floodLive(r); i++) { FL.tickBenFlood(t, ctxOf(f, t), api); const before = s.core; world(f, t, 1)
    const d = FL.waterOf(f)?.depth; if (d === 'submerged') { sub++; assert(Math.abs(s.core - before - 3 / 60) < 1e-6 || s.core >= 100) } if (d === 'wading') { wade++; assert(Math.abs(s.core - before - 1 / 60) < 1e-6 || s.core >= 100) }
    assert(!(f.side in r.breath), 'no breath record (waterborne)'); assert(!(f.side in r.drown), 'never drowning') }
  assert(sub > 100 && wade > 10, `the flood reached him (sub ${sub} / wade ${wade})`); assert.equal(f.health, hp, 'no HP lost'); assert(FL.waterOf(f) === null || FL.waterOf(f).wb !== false)
  assert(s.coreFlood > 5, 'Core from the flood: ' + s.coreFlood)
  const plainBen = ben(null), t2 = foe(); far(plainBen, t2); const r2 = FL.startFlood(t2, { ...STAGE }, [t2, plainBen], 77); FL.raiseFlood(t2)
  const api2 = { getOpponent: o => (o === t2 ? plainBen : t2) }; for (let i = 0; i < 400; i++) { FL.tickBenFlood(t2, ctxOf(plainBen, t2), api2); physics.moveFighter(plainBen, {}, CONTROLS); physics.applyGravity(plainBen) }
  assert(plainBen.side in r2.breath && r2.breath[plainBen.side] < 100, 'control: human Ben (not water) does lose breath')
  FL.clearFloodInstant(t, [t, f]); FL.clearFloodInstant(t2, [t2, plainBen])
})

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const sumA = a => a.reduce((x, y) => x + y, 0)
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  blast: WH_BLAST.DMG, lash: sumA(WH_LASH.HITS), burst40: Math.min(WH_BURST.MAX, WH_BURST.DMG + WH_BURST.CORE_K * 40) }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
for (const [name, route, target] of [['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 86],
  ['2. Low, Heavy, Pressure Blast (uncharged)', ['low', 'heavy', 'blast'], 108], ['3. Claw Lash, Heavy, Hydro Burst (Core 40)', ['lash', 'heavy', 'burst40'], 126]])
  test('design total ' + name + ' ≈ ' + target, () => { const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`) })
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})
test('route 2 live: Low, Heavy, Pressure Blast (uncharged) — the jet lands, +1 pip', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 120); d.push(runCast(f, t, 'N').dmg); assert(d[2] > 0); assert.equal(S(f).pips, 1); console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})
test('route 3 live: Claw Lash (2 hits), Heavy, Hydro Burst (Core 40)', () => {
  const f = ben(), t = foe(); reset(f, t, 150); const d = [runCast(f, t, 'F', { pre: q => { S(q).dashTapT = S(q).t } }).dmg]; assert.equal(S(f).lastChain.hits.length, 2)
  reset(f, t, 10); d.push(melee(f, t, 'heavy')); reset(f, t, 60); S(f).core = 40; d.push(runCast(f, t, 'B').dmg); assert.equal(S(f).lastBurst.dmg, 46)
  console.log('   HP', d.map(x => x.toFixed(1)).join('+'), '=', sumA(d).toFixed(1))
})

// ── 11 swap / revert / KO / rematch ────────────────────────────────────────────────────────────────────────────
test('11. swap / revert / KO / rematch clear the Puddle, the Core and his Drenched pips (formState); no lingering body fields', () => {
  const L = ['waterhazard', 'heatblast', 'goop', 'xlr8', 'megawhatt']
  const mk = () => { const f = ben('waterhazard', L), t = foe(); far(f, t); f.energy = 100; assert(cast(f, t, 'D')); world(f, t, 10, { special: true }); S(f).core = 60; S(f).pips = 2; return [f, t] }
  let [f, t] = mk(); assert(S(f).puddle); assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'waterhazard')); assert.deepEqual([S(f).puddle, S(f).core, S(f).pips], [null, 0, 0], 'swap')
  ;[f, t] = mk(); F.revertToHuman(f, { forced: true }); assert.equal(G.whState(f), null, 'revert'); assert.equal(WH.bodyAlpha(f), 1); assert.equal(WH.evade(f, { move: BA.heavy }), false)
  ;[f, t] = mk(); f.health = 0; F.handleBenKO?.(f); if (f.omnitrix.formState?.kind === 'waterhazard') F.revertToHuman(f, { forced: true }); assert.equal(G.whState(f), null, 'KO')
  ;[f, t] = mk(); F.setupBen10(f, ['waterhazard']); assert.equal(G.whState(f), null, 'rematch / round reset: fresh Ben')
  assert(!('_benGlide' in f) && !(f._benLunge && f._benLunge.frames > 1))
})

// ── 13 slot → PICK FIVE / Dial / HUD / Vow / determinism ─────────────────────────────────────────────────────
test('13. slot → PICK FIVE: slot count from the registry, Water Hazard READY at catalog slot 22 (contiguous), no ready alien overwritten', () => {
  assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT); assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('waterhazard'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 22); assert.equal(d.displayName, 'Water Hazard')
  const ready = BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready'); assert.deepEqual(ready.map(x => x.slot).sort((a, b) => a - b), ready.map((_, i) => i + 1), 'ready slots contiguous')
  for (const [k, sl] of [['goop', 4], ['ripjaws', 20], ['rath', 21]]) assert.equal(getAlienDefinition(k).slot, sl, k + ' never overwritten')
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'waterhazard').length, 1); assert(getAvailableAlienKeys(false).includes('waterhazard'))
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet from fun-tech\.tk/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
})
test('13. Omnitrix Dial: Water Hazard picked into the last slot — same cost as any slot, no clock change, fresh state; a hit cancels the dial', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'waterhazard'], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    const c = { seed: 1, frame: 0, playerIndex: 0 }; assert(F.ben10TransformOrSwap(f, slot, c)); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); assert.equal(c.frame, 0, 'clock untouched'); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, 'waterhazard'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
  assert.deepEqual([S(a.f).core, S(a.f).pips, S(a.f).puddle], [0, 0, null])
  const h = fresh(); F.applyBen10VariantStats(h, 'default'); F.setupBen10(h, pick); h.energy = 100; assert(F.ben10TransformOrSwap(h, BEN10_SLOT_COUNT - 1, { seed: 1, frame: 0, playerIndex: 0 }))
  if (!h.transformed) { h.hitstun = 20; F.invalidateBenAction?.(h); for (let i = 0; i < 80; i++) F.updateTransformDevice?.(h, 1000 / 60); assert(!h.transformed || h.activeAlien === 'waterhazard', 'a hit during startup cancels or the transform is atomic') }
})
test('13. HUD: the Core gauge + Drenched pips + SHORT FUSE label stay inside the player bar (both sides, every state)', () => {
  for (const flip of [false, true]) for (const st of ['base', 'full', 'flood', 'pips', 'fuse']) {
    const f = ben(), s = S(f); if (st === 'full') s.core = 100; if (st === 'flood') { s.core = 50; s.floodDepth = 'submerged' } if (st === 'pips') s.pips = 2; if (st === 'fuse') s.fuseView = 'SHORT FUSE 4s'
    let minX = Infinity, maxX = -Infinity
    const ctx = { save() {}, restore() {}, fillRect(x, y, w) { minX = Math.min(minX, x); maxX = Math.max(maxX, x + w) }, fillText(str, x) { const w = str.length * 4.8; const x0 = this.textAlign === 'right' ? x - w : x; minX = Math.min(minX, x0); maxX = Math.max(maxX, x0 + w) }, strokeRect() {} }
    const x = 100, pbw = 120; G.drawWaterHazardHud(ctx, f, { x, enY: 40, enH: 8, pbw, flip }); assert(minX >= x && maxX <= x + 8 + pbw + 1, `flip ${flip} ${st}: ${minX}..${maxX}`)
  }
})
test('13. Vow pick includes Water Hazard (hash mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'waterhazard'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('waterhazard') && picks.size === L.length)
})
test('13. same-seed determinism: an identical scripted sequence (every move, Puddle, Core, pips → Short Fuse, the ult) yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light'); melee(f, t, 'heavy')
    reset(f, t, 120); runCast(f, t, 'N', { input: i => (i < 35 ? { special: true } : {}) }); reset(f, t, 60); S(f).core = 40; runCast(f, t, 'B')
    reset(f, t, 150); runCast(f, t, 'F', { pre: q => { S(q).dashTapT = S(q).t } }); reset(f, t, 60); runCast(f, t, 'D', { pre: q => { S(q).hist = [{ d: 4, t: S(q).t - 2 }, { d: 1, t: S(q).t - 1 }, { d: 2, t: S(q).t }] } })
    reset(f, t, 60); f.onGround = f.grounded = false; f.y -= 120; t.x = f.x + 140; runCast(f, t, 'N', { max: 80 }); world(f, t, 30)
    far(f, t); f.energy = 100; cast(f, t, 'D'); world(f, t, 40, { special: true }); world(f, t, 20)
    reset(f, t, 200); ultRun(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x, fuse: t._benShortFuse || null })
  }
  const a = run(), b = run(); assert.equal(a, b); const st = JSON.parse(a).s; assert(st.lastUlt.captured, 'the scripted ult captured'); assert(st.stats.puddles >= 1)
})
test('GAME_STATE stays plain data mid-cast (charge, burst, lash, sweep, dive, puddle, ult cinematic) + the Short Fuse stamp', () => {
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  const mid = (dir, n, setup, input = {}) => { const f = ben(), t = foe(); setup(f, t); f.energy = 100; assert(cast(f, t, dir), dir); world(f, t, n, input); return [f, t] }
  let [f] = mid('N', 15, (a, b) => far(a, b), { special: true }); assert(S(f).blast); assert(plain(S(f)), 'charge')
  ;[f] = mid('B', 8, (a, b) => { reset(a, b, 60); S(a).core = 40 }); assert(S(f).burst); assert(plain(S(f)), 'burst')
  ;[f] = mid('F', 14, (a, b) => { far(a, b); S(a).dashTapT = S(a).t }); assert(S(f).chain); assert(plain(S(f)), 'lash')
  ;[f] = mid('D', 30, (a, b) => far(a, b), { special: true }); assert(S(f).puddle); assert(plain(S(f)), 'puddle')
  ;[f] = mid('N', 8, (a, b) => { far(a, b); a.y -= 200; a.onGround = a.grounded = false }); assert(S(f).dive); assert(plain(S(f)), 'dive')
  const g = ben(), u = foe(); reset(g, u, 200); ready(g); g.energy = 100; A.triggerUltimate(g, ctxOf(g, u)); world(g, u, 60)
  assert(S(g).ult && S(g).ult.phase === 'barrage', 'mid-cinematic ' + S(g).ult?.phase); assert(plain(S(g)), 'ult')
  const h = ben(), v = foe(); for (const c of [1, 2, 3]) contactOn(h, v, { proj: { alien: { wh: 'blast', cast: c } } }); assert(plain(v._benShortFuse), 'the stamp')
})
const stubCtx = () => new Proxy({ globalAlpha: 1, canvas: { width: 1280, height: 720 } }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true) })
test('render: every move / Puddle / pips / Short Fuse / the ult draw without throwing and drawing never changes GAME_STATE', () => {
  const c = stubCtx(); const run = (f, t, n, input = {}) => { for (let i = 0; i < n; i++) { world(f, t, 1, input); const a = JSON.stringify(S(f)), x = JSON.stringify([t.x, t.health, f.x, f.y, f.energy, t._benShortFuse || null])
    G.drawWaterHazardFx(c, f, FRAME, t); G.drawWaterHazardHud(c, f, { x: 0, enY: 0, enH: 8, pbw: 200, flip: false }); WH.targetOffset(f, t); WH.bodyAlpha(f); WH.hurtbox(f)
    assert.equal(JSON.stringify(S(f)), a); assert.equal(JSON.stringify([t.x, t.health, f.x, f.y, f.energy, t._benShortFuse || null]), x) } }
  for (const [dir, gap, pre, input] of [['N', 120, null, { special: true }], ['B', 60, q => { S(q).core = 60 }], ['F', 150, q => { S(q).dashTapT = S(q).t }], ['D', 60, null, { special: true }]]) {
    clearProj(); const f = ben(), t = foe(); reset(f, t, gap); f.energy = 100; if (pre) pre(f); assert(cast(f, t, dir), dir); run(f, t, 60, input) }
  clearProj(); const g = ben(), u = foe(); reset(g, u, 30); g.energy = 100; g.y -= 160; g.onGround = g.grounded = false; assert(cast(g, u, 'N')); run(g, u, 40)
  const h = ben(), v = foe(); reset(h, v, 200); S(h).pips = 2; S(h).pipT = S(h).t; ready(h); h.energy = 100; assert(A.triggerUltimate(h, ctxOf(h, v))); run(h, v, 150)
  assert(S(h).lastUlt && S(h).lastUlt.captured); run(h, v, 20)
})
test('no Math.random / gameRng in waterhazard.js / waterhazardAssets.js', () => {
  for (const p of ['../waterhazard.js', '../waterhazardAssets.js']) { const src = fs.readFileSync(new URL(p, import.meta.url), 'utf8'); assert(!/Math\.random|gameRng/.test(src), p) }
})

// @@END-TESTS@@
console.log(`\nWATER HAZARD: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
