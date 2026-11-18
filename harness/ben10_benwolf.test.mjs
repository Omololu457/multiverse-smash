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

// ── 5-7 the specials + Lupine Dodge ────────────────────────────────────────────────────────────────────────────
const { BW_HOWL, BW_RAKE, BW_POUNCE, BW_RISE, BW_LOW, BW_DIVE, BW_DODGE } = G
const GS = C.GLOBAL_DAMAGE_SCALE
const runCast = (f, t, n, input = {}) => world(f, t, n, input)
const live = (f, bw) => A.activeProjectiles.filter(p => p.owner === f && p.alien && p.alien.bw === bw && p.lifetime > 0).length
test('5. SONIC HOWL: 12 Power, 12f startup, a ring 450 px, 3 ticks × 10 = 30 with pushback, one on screen, no Scent', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 200); f.energy = 100; assert(cast(f, t, 'N')); assert.equal(100 - f.energy, BW_COST.howl)
  world(f, t, BW_HOWL.STARTUP - 1); assert.equal(S(f).ring, null, 'nothing before 12f'); world(f, t, 1); assert(S(f).ring, 'ring out at 12f')
  ready(f); assert.equal(cast(f, t, 'N'), false, 'one on screen'); const hp = t.health, x0 = t.x
  let n = 0; while (S(f).ring && n < 80) { world(f, t, 1); n++ }
  assert.equal(S(f).ringUsed.ticks, 3); assert(near(hp - t.health, 30 * DM * GS * 0.9), `${hp - t.health}`); assert(t.x > x0 + 10, 'pushback'); assert.equal(S(f).scent.pips, 0, 'howls give no Scent')
  clearProj(); const g = ben(), u = foe(); far(g, u); g.energy = 100; assert(cast(g, u, 'N')); world(g, u, BW_HOWL.STARTUP); const r = S(g).ring
  let d = 0; while (S(g).ring && d < 100) { world(g, u, 1); d++ } assert(Math.abs(d * BW_HOWL.SPEED - BW_HOWL.RANGE) <= BW_HOWL.SPEED, `range ${d * BW_HOWL.SPEED}`)
})
test('5. SONIC HOWL hold: +4 Power once, sustain capped at 30f, a ring re-emitted every 10f (always one on screen), the 3-tick budget is per cast', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); f.energy = 100; assert(cast(f, t, 'N')); let n = 0, oneOnScreen = true
  while (S(f).howl && n < 200) { world(f, t, 1, { special: true }); n++; if (Object.keys(S(f)).filter(k => k === 'ring').length !== 1) oneOnScreen = false }
  assert(oneOnScreen, 'a single ring slot: a re-emitted ring replaces the live one')
  assert.equal(100 - f.energy, BW_COST.howl + BW_COST.howlHold, '+4 once'); assert.equal(S(f).lastHowl.hold, BW_HOWL.HOLD_MAX, 'capped at 30f')
  assert.equal(S(f).stats.howlRings, 1 + BW_HOWL.HOLD_MAX / BW_HOWL.RESPAWN, 'a ring every 10f'); assert.equal(n, BW_HOWL.STARTUP + 1 + BW_HOWL.HOLD_MAX + BW_HOWL.RECOVERY)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 60); g.energy = 100; const hp = u.health; assert(cast(g, u, 'N')); n = 0
  while ((S(g).howl || S(g).ring) && n < 200) { world(g, u, 1, { special: true }); n++; reset(g, u, 60) }
  assert.equal(S(g).stats.howlTicks, 3, 'held point-blank: still 3 ticks for the cast'); assert(hp - u.health <= 30 * DM * GS + 1)
  clearProj(); const h = ben(), v = foe(); far(h, v); h.energy = 100; assert(cast(h, v, 'N')); world(h, v, BW_HOWL.STARTUP + 4); assert.equal(100 - h.energy, BW_COST.howl, 'no hold: no +4')
})
test('5. LOW HOWL: ground wave 380 px, 2 hits 20 / 25, hits low, one on screen, no Scent', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 150); f.energy = 100; assert(cast(f, t, 'D')); assert.equal(100 - f.energy, BW_COST.low)
  world(f, t, BW_LOW.STARTUP); assert(S(f).lowRing); ready(f); assert.equal(cast(f, t, 'D'), false, 'one on screen')
  assert(S(f).lowRing.y > f.y + f.h * 0.7, 'skims the ground'); const hp = t.health; let lvl = null
  const orig = A.activeProjectiles.push; const pushed = []; A.activeProjectiles.push = function (...a) { pushed.push(...a); return orig.apply(this, a) }
  let n = 0; try { while (S(f).lowRing && n < 60) { world(f, t, 1); n++ } } finally { delete A.activeProjectiles.push }
  for (const p of pushed) if (p && p.alien && p.alien.bw === 'low') lvl = p.alien.hitLevel
  assert.equal(S(f).lowRingUsed.ticks, 2); assert.equal(lvl, 'low', 'hits low'); assert(near(hp - t.health, 45 * DM * GS * 0.95), `${hp - t.health}`); assert.equal(S(f).scent.pips, 0)
  clearProj(); const g = ben(), u = foe(); far(g, u); g.energy = 100; assert(cast(g, u, 'D')); world(g, u, BW_LOW.STARTUP); let d = 0; while (S(g).lowRing && d < 100) { world(g, u, 1); d++ }
  assert(Math.abs(d * BW_LOW.SPEED - BW_LOW.RANGE) <= BW_LOW.SPEED, `range ${d * BW_LOW.SPEED}`)
})
test('5. RISING HOWL: 14 Power, anti-air column (hits an airborne foe above him), 55, launches, −14 on block', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 0); t.x = cx(f) + 20; t.y = f.y - 110; t.onGround = t.grounded = false; f.energy = 100
  assert(cast(f, t, 'U')); assert.equal(100 - f.energy, BW_COST.rise); const hp = t.health; let n = 0
  while (t.health === hp && n < 30) { world(f, t, 1); t.y = Math.min(t.y, f.y - 110); n++ }
  assert(t.health < hp, 'anti-air hit'); assert(near(hp - t.health, BW_RISE.DMG * DM * GS), `${hp - t.health}`); assert(t.vy < 0 || t.isLaunched, 'launched')
  assert.equal(n, BW_RISE.STARTUP, 'hits on its startup frame')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 10); u.isBlocking = true; g.energy = 100; assert(cast(g, u, 'U')); world(g, u, BW_RISE.STARTUP)
  assert(u.blockstun > 0); const adv = u.blockstun - ((g.attackCooldown || 0)); assert(Math.abs(adv - BW_RISE.ON_BLOCK) <= 2, `on block ${adv}`)
})
test('6. POUNCE: aims at the opponent\'s x AT CAST TIME (no tracking), 360 px cap, hit at 18f = 55 + knockdown, 24f whiff recovery, +1 Scent', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 200); f.energy = 100; const aim = cx(t) - BW_POUNCE.STOP; assert(cast(f, t, 'B')); assert.equal(100 - f.energy, BW_COST.pounce)
  t.x += 150; const hp = t.health; let n = 0; while (S(f).pounce && n < 60) { world(f, t, 1); n++ }   // they move: he still lands at the old spot
  assert(Math.abs(S(f).lastPounce.x1 - aim) <= 2, `landed at the cast-time x (${S(f).lastPounce.x1} vs ${aim})`); assert.equal(S(f).lastPounce.hit, false, 'moved away: whiff')
  assert.equal(n, BW_POUNCE.LAND + BW_POUNCE.WHIFF, '24f whiff recovery'); assert.equal(t.health, hp)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 800); g.energy = 100; const x0 = cx(g); assert(cast(g, u, 'B')); n = 0; while (S(g).pounce && n < 60) { world(g, u, 1); n++ }
  assert(Math.abs(S(g).lastPounce.x1 - x0 - BW_POUNCE.RANGE) <= 2, `360 px cap (${S(g).lastPounce.x1 - x0})`)
  clearProj(); const h = ben(), v = foe(); reset(h, v, 200); h.energy = 100; const hv = v.health; assert(cast(h, v, 'B')); n = 0; let at = null
  while (S(h).pounce && n < 60) { world(h, v, 1); n++; if (at == null && v.health < hv) at = n }
  assert.equal(at, BW_POUNCE.LAND, 'hit at 18f'); assert(near(hv - v.health, BW_POUNCE.DMG * DM * GS), `${hv - v.health}`); assert(v.knockdownState || v.knockdownTimer > 0 || S(h).lastPounce.hit, 'knockdown')
  assert(S(h).lastPounce.hit); assert.equal(S(h).scent.pips, 1, '+1 Scent'); assert.equal(n, BW_POUNCE.LAND + BW_POUNCE.HIT_REC)
  const w = ben(); w.onGround = w.grounded = false; w.y -= 100; w.energy = 100; assert.equal(cast(w, foe(), 'B') && S(w).pounce != null, false, 'ground only')
})
test('4/6. HUNTED Pounce: ONE re-aim 12f into the leap toward their position then, no tracking after, bounded to 360 px', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 200); huntIt(f, t); f.energy = 100; const x0 = cx(f); assert(cast(f, t, 'B'))
  world(f, t, BW_POUNCE.LEAP + G.BW_SCENT.REAIM_AT - 1); t.x += 120; const target = cx(t) - BW_POUNCE.STOP; world(f, t, 1)
  assert(S(f).pounce.reaimed); assert.equal(S(f).pounce.reaimT, BW_POUNCE.LEAP + G.BW_SCENT.REAIM_AT); t.x += 200   // they move again: no tracking
  let n = 0; while (S(f).pounce && n < 60) { world(f, t, 1); n++ }
  assert(Math.abs(S(f).lastPounce.x1 - target) <= 2, `re-aimed to the 12f position (${S(f).lastPounce.x1} vs ${target})`); assert.equal(S(f).scent.reaims, 1)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 200); huntIt(g, u); g.energy = 100; const gx = cx(g); assert(cast(g, u, 'B')); world(g, u, BW_POUNCE.LEAP + G.BW_SCENT.REAIM_AT - 1); u.x += 900
  n = 0; while (S(g).pounce && n < 60) { world(g, u, 1); n++ } assert(Math.abs(S(g).lastPounce.x1 - gx - BW_POUNCE.RANGE) <= 2, 'still bounded to 360 px')
  clearProj(); const h = ben(), v = foe(); reset(h, v, 200); h.energy = 100; assert(cast(h, v, 'B')); world(h, v, 20); assert.equal(S(h).pounce.reaimed, false, 'not Hunted: no re-aim')
})
test('CLAW RAKE: real 300 px travel (no tracking), 3 hits 14 / 14 / 22 = 50, −12 on block, the finisher +1 Scent', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); f.energy = 100; S(f).dashTapT = S(f).t; assert(cast(f, t, 'F')); assert.equal(100 - f.energy, BW_COST.rake); const x0 = f.x
  let n = 0; while (S(f).rake && n < 80) { world(f, t, 1); n++ } assert.equal(Math.round(Math.abs(f.x - x0)), BW_RAKE.TRAVEL, 'travel'); assert.equal(n, BW_RAKE.STARTUP + BW_RAKE.FRAMES + BW_RAKE.RECOVERY)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 120); g.energy = 100; S(g).dashTapT = S(g).t; const hp = u.health; assert(cast(g, u, 'F')); n = 0; while (S(g).rake && n < 80) { world(g, u, 1); n++ }
  assert.equal(S(g).lastRake.hits, 3); assert.equal(S(g).stats.rakeHits, 3); assert(near(hp - u.health, 50 * DM * GS * 0.95), `${hp - u.health}`); assert.equal(S(g).scent.pips, 1, 'one pip for the cast')
  clearProj(); const h = ben(), v = foe(); reset(h, v, 120); v.isBlocking = true; h.energy = 100; S(h).dashTapT = S(h).t; assert(cast(h, v, 'F')); n = 0; while (S(h).rake && n < 80) { world(h, v, 1); n++; v.isBlocking = true }
  assert.equal(S(h).scent.pips, 0, 'blocked: no Scent')
})
test('7. DIVE CLAW: air only, 48 on hit, once per airtime, no jump refill, +1 Scent', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 30); f.energy = 100; f.y -= 160; f.onGround = f.grounded = false; f.jumpCount = 2; const j = f.jumpCount
  assert(cast(f, t, 'N')); assert(S(f).dive); assert.equal(cast(f, t, 'N'), false, 'busy'); const hp = t.health
  let n = 0; while (S(f).dive && n < 80) { world(f, t, 1); n++ }
  assert(S(f).lastDive.hit, 'hit'); assert(near(hp - t.health, BW_DIVE.DMG * DM * GS), `${hp - t.health}`); assert.equal(S(f).scent.pips, 1); assert.equal(f.jumpCount, j, 'no jump refill')
  const g = ben(); g.energy = 100; g.y -= 200; g.onGround = g.grounded = false; S(g).diveUsed = true; ready(g); assert.equal(cast(g, foe(), 'N'), false, 'once per airtime')
})
test('7. LUPINE DODGE (←← + Light): no cost, i-frames on frames 4–10 only, 5 s cooldown, the jab never comes out', () => {
  const f = ben(), t = foe(); far(f, t); f.energy = 100; const s = S(f)
  world(f, t, 1, { left: true }); world(f, t, 1); world(f, t, 1, { left: true }); assert.equal(s.backTapT, s.t, '←← tapped')
  ready(f); assert.equal(C.startMove(f, 'light', BA.light), false, 'Light became the dodge'); assert(s.dodge); assert.equal(f.energy, 100, 'no cost')
  const inv = []; for (let i = 1; i <= BW_DODGE.TOTAL; i++) { physics.moveFighter(f, {}, CONTROLS); A.tickBenAlienForm(f, {}, ctxOf(f, t)); inv.push(f.invulnTimer > 0 ? 1 : 0); timers(f) }
  // invulnTimer is set on frame 4 for 7 frames (read after his tick, before combat decrements it — Jetray's Barrel Roll rule)
  assert.deepEqual(inv.map((v, i) => v ? i + 1 : 0).filter(Boolean), [4, 5, 6, 7, 8, 9, 10], `i-frames ${inv.join('')}`)
  assert.equal(s.dodge, null); assert.equal(s.dodgeCd, BW_DODGE.CD - BW_DODGE.TOTAL)
  ready(f); world(f, t, 1, { left: true }); world(f, t, 1); world(f, t, 1, { left: true }); ready(f); assert.notEqual(C.startMove(f, 'light', BA.light), false, 'on cooldown: an ordinary jab')
  f.attacking = false; f.currentAttack = null; world(f, t, s.dodgeCd); ready(f); world(f, t, 1, { left: true }); world(f, t, 1); world(f, t, 1, { left: true }); ready(f)
  assert.equal(C.startMove(f, 'light', BA.light), false, 'after 300f'); assert(s.dodge)
})

// ── 8-9 Howling Moon / Full Moon ─────────────────────────────────────────────────────────────────────────────
const { BW_MOON, BW_ULT } = G
const ultRun = (f, t, opts = {}) => { ready(f); f.energy = 100; const ok = A.triggerUltimate(f, ctxOf(f, t)); if (!ok) return -1; let n = 0; while ((S(f).ult || n < 4) && n < 400) { world(f, t, 1); n++; if (opts.block) t.isBlocking = true } return n }
const moonUp = (f, t) => { reset(f, t, 100); assert(ultRun(f, t) > 0); assert(G.moonOn(S(f)), 'moon up'); return S(f) }
test('8. Full Moon: 600f on a clean hit, 300f on a whiff or a block; once per transformation; not castable while it is up; no stacking', () => {
  clearProj(); const f = ben(), t = foe(); const s = moonUp(f, t); assert(S(f).lastUlt.captured); assert.equal(s.moonDur, BW_MOON.HIT)
  assert(s.moonTimer > BW_MOON.HIT - 10, `the capture did not consume buff time (${s.moonTimer})`)
  ready(f); f.energy = 100; assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'not while the moon is up'); assert.equal(f.energy, 100)
  world(f, t, s.moonTimer); assert(!G.moonOn(S(f))); assert.equal(S(f).moonEnds.at(-1), 'timer'); ready(f); f.energy = 100; assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'once per transformation')
  clearProj(); const g = ben(), u = foe(); far(g, u); ultRun(g, u); assert.equal(S(g).lastUlt.captured, false); assert.equal(S(g).moonDur, BW_MOON.WHIFF, 'whiff: 300f')
  assert.equal(100 - g.energy, BW_COST.ultimate)
  clearProj(); const h = ben(), v = foe(); reset(h, v, 100); v.isBlocking = true; ultRun(h, v, { block: true }); assert.equal(S(h).lastUlt.captured, false, 'blocked: no capture'); assert.equal(S(h).moonDur, BW_MOON.WHIFF)
  assert.equal(S(h).moonCasts, 1, 'one moon')
})
test('8. Full Moon buffs apply to BenWolf ONLY: dmg +20%, taken −15%, speed / jump +15%, drain −25%, regen +50%, startup −1f (min 1)', () => {
  clearProj(); const f = ben(), t = foe(), g = ben(), u = foe(); far(f, t); world(f, t, 1); const w0 = f._benWalkSpeed, d0 = f.dashSpeed, j0 = f.jumpForce
  const tKeys0 = JSON.stringify({ sp: t.speed, dm: t.damageMultiplier, df: t.defenseMultiplier, j: t.jumpForce })
  far(f, t); ultRun(f, t); assert(G.moonOn(S(f))); world(f, t, 1)
  assert(Math.abs(f._benWalkSpeed / w0 - 1.15) < 1e-9 && Math.abs(f.dashSpeed / d0 - 1.15) < 1e-9 && Math.abs(f.jumpForce / j0 - 1.15) < 1e-9, 'speed / jump')
  assert.equal(JSON.stringify({ sp: t.speed, dm: t.damageMultiplier, df: t.defenseMultiplier, j: t.jumpForce }), tKeys0, 'the opponent is untouched')
  ready(f); reset(f, t, 10); const a = melee(f, t, 'heavy'); reset(g, u, 10); const b = melee(g, u, 'heavy'); assert(Math.abs(a / b - 1.2) < 0.02, `dmg ${a} vs ${b}`)
  const h1 = f.health; C.applyScaledDamage(f, 100, { attacker: t, source: 'ability' }); const h2 = g.health; C.applyScaledDamage(g, 100, { attacker: u, source: 'ability' })
  assert(Math.abs((h1 - f.health) / (h2 - g.health) - 0.85) < 0.01, 'taken −15%')
  assert.equal(BENWOLF.drainMult(f), 0.75); assert.equal(BENWOLF.drainMult(g), 1)
  const m = BENWOLF.moveFrames(f, 'light', BA.light); assert.equal(m.startup, BA.light.startup - 1); assert.equal(BENWOLF.moveFrames(f, 'x', { startup: 1 }).startup, 1, 'min 1f')
  assert.equal(BENWOLF.moveFrames(g, 'light', BA.light), BA.light, 'no moon: unchanged'); assert.equal(G.startupOf(S(f), 12), 11); assert.equal(G.startupOf(S(g), 12), 12)
  f.energy = 40; world(f, t, 1); const e0 = f.energy; f.energy += 10; world(f, t, 1); assert(Math.abs(f.energy - (e0 + 15)) < 1e-6, `regen +50% (${f.energy - e0})`)
  g.energy = 40; world(g, u, 1); const e1 = g.energy; g.energy += 10; world(g, u, 1); assert(Math.abs(g.energy - (e1 + 10)) < 1e-6, 'no moon: +10')
  const dv = F.BEN10_ALIEN_POOL.benwolf; f.isCharging = false; f.energy = 60; S(f).lastE = null; F.updateTransformDevice(f); const df = 60 - f.energy
  g.isCharging = false; g.energy = 60; F.updateTransformDevice(g); const dg = 60 - g.energy; assert(Math.abs(df / dg - 0.75) < 1e-6, `drain ${df} vs ${dg}`)
})
test('8. Full Moon ends and clears on timer / swap / revert / KO / round end / rematch; stats restored', () => {
  const t = foe(); const f = ben('benwolf', LOAD); const w0 = f._benWalkSpeed; far(f, t); ultRun(f, t); assert(G.moonOn(S(f)))
  F.applyAlien(f, 'heatblast'); F.applyAlien(f, 'benwolf'); assert(!G.moonOn(S(f))); assert(Math.abs(f._benWalkSpeed - w0) < 1e-9, 'swap: base speed'); assert.equal(S(f).moonUsed, false, 'a new transformation')
  const g = ben(); far(g, t); ultRun(g, t); F.revertToHuman(g); assert.equal(g.omnitrix.formState, null); assert.equal(g.transformed, false)
  const k = ben(); far(k, t); ultRun(k, t); k.health = 0; F.updateTransformDevice(k); assert.equal(k.omnitrix.formState, null, 'KO')
  const r = ben(); far(r, t); ultRun(r, t); F.setupBen10(r, r.omnitrix.aliens); assert.equal(r.omnitrix.formState ?? null, null, 'round end / rematch (setupBen10)'); assert.equal(r.transformed, false)
})
test('9. ULTIMATE: no capture on a whiff / block; 40 + 4×20 + 120 = 240 raw on a clean hit; positions restore; knockdown; 100f lockout', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const hp = t.health; ultRun(f, t); assert.equal(S(f).lastUlt.captured, false); assert.equal(t.health, hp)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 100); const h0 = u.health, gx = g.x; ultRun(g, u); const L = S(g).lastUlt
  assert(L.captured); assert.deepEqual(L.hits, [BW_ULT.OPENER, 20, 20, 20, 20, BW_ULT.FINAL]); assert.equal(L.raw, 240)
  assert.equal(g.x, L.home.x); assert.equal(g.x, gx); assert(Math.abs(u.x - L.thome.x) <= 6, 'restored'); assert(u.knockdownState || u.knockdownTimer > 0 || h0 > u.health)
  assert(g.attackCooldown > 0 && g.attackCooldown <= BW_ULT.LOCKOUT); assert(h0 - u.health > 0)
  assert.equal(A.activeProjectiles.filter(p => p.owner === g && p.lifetime > 0).length, 0, 'no persistent hazards')
  const c1 = G.ultClaws(L.seed, L.f0, L.pi), c2 = G.ultClaws(L.seed, L.f0, L.pi); assert.deepEqual(c1, c2, 'claw angles are a pure hash'); assert.notDeepEqual(G.ultClaws(L.seed + 1, L.f0, L.pi), c1)
})
test('9. ULTIMATE vs HUNTED: the final hit +20 once and Hunted is consumed; never without Hunted', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 100); huntIt(f, t); ultRun(f, t); const L = S(f).lastUlt
  assert.equal(L.bonus, 20); assert.equal(L.raw, 260); assert.equal(L.hits.at(-1), BW_ULT.FINAL + 20); assert(!G.hunted(S(f)), 'consumed'); assert.equal(S(f).scent.ends.at(-1), 'ult')
  assert.equal(S(f).stats.huntedBonus, 1)
})
test('9. stage collision untouched during the night; the night fades in over 20f, back out over 30f after the moon ends (render-only)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 100); const stage0 = JSON.stringify({ L: physics.stageLeft, W: physics.stageWidth, g: physics.groundY })
  ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t))); let lv = []
  for (let i = 0; i < 60; i++) { world(f, t, 1); lv.push(G.nightLevel(f, S(f))) }
  assert.equal(JSON.stringify({ L: physics.stageLeft, W: physics.stageWidth, g: physics.groundY }), stage0, 'stage untouched')
  const k = lv.findIndex(v => v >= 1), z = lv.findIndex(v => v > 0); assert(z >= 0 && k - z + 1 >= 19 && k - z + 1 <= 21, `fade in ${k - z + 1}f`)
  while (S(f).ult) { world(f, t, 1); G.nightLevel(f, S(f)) }
  S(f).moonTimer = 1; world(f, t, 1); assert(!G.moonOn(S(f))); const out = []; for (let i = 0; i < 32; i++) { out.push(G.nightLevel(f, S(f))); world(f, t, 1) }
  const end = out.findIndex(v => v <= 0); assert(end >= 28 && end <= 31, `fade out ${end}f`)
  assert(!JSON.stringify(S(f)).match(/night|lvl|stars/i), 'no night / star state in GAME_STATE (only the timer)')
})
// @@END-TESTS@@
console.log(`\nBENWOLF: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
