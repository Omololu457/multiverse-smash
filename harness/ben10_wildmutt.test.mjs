// WILDMUTT — Phase 6 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_wildmutt.test.mjs
// Design totals: raw move damage × the form's damage mod (1.10) × 0.85^n (85% per move, reset after 90f), within ±20%.
// The live routes then run the real engine (its own curve) and assert the mechanics.
// Test 12 (the brief's "Dial / slot 14"): an alien-select screen already exists (PICK FIVE, owner decision, re-confirmed for
// Wildmutt on 2026-11-17), so Wildmutt is a pick — no Dial, no slot count change; the assertions read the registry count.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as W from '../wildmutt.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'wildmutt_ov', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const foe = (key = 'goku', x = 500) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); if (ch?.animationData) t.animationData = ch.animationData; t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
const STAGE = { stageLeft: 0, stageWidth: 1600 }
let FRAME = 0, SEED = 4242
const ctxOf = (f, t) => ({ p1: f, p2: t, ...STAGE, seed: SEED, frame: FRAME })
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t)); if (f._benGlide) physics.moveFighter(f, {}, {}) } }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const timers = q => { if (q.hitstop > 0) q.hitstop--; else if (q.hitstun > 0) q.hitstun--; for (const k of ['attackCooldown', '_benPowerCommit', '_spriteCastTimer', 'invulnTimer', 'blockstun', 'grabInputBuffer']) if (q[k] > 0) q[k]-- }
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
const { WILDMUTT, WM_SCENT, WM_FURY, WM_POUNCE, WM_GP, WM_MAUL, WM_ROAR, WM_RUSH, WM_DIVE, WM_ULT, WM_COST } = W
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + f.w + gap; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false; t.knockdownState = false; t.knockdownTimer = 0; t.invulnTimer = 0 }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }
const step = (f, t, n = 1, tKeys = {}, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
  A.tickBenAlienForm(f, input, ctxOf(f, t)); physics.moveFighter(t, tKeys, CONTROLS); physics.applyGravity(t); timers(f); timers(t) } }
const cast = (f, t, dir) => { ready(f); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const far = (f, t) => { t.x = f.x + 1000 }
const shot = (t, x, y, extra = {}) => { const p = { name: 'ki_blast', owner: t, x, y, vx: -8, vy: 0, w: 20, h: 20, damage: 30, lifetime: 120, ...extra }; A.activeProjectiles.push(p); return p }
const BA = WILDMUTT.basic_attacks, DM = WILDMUTT.mods.damage
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  pounce: WM_POUNCE.DMG[0] + WM_POUNCE.DMG[1], maul: WM_MAUL.DMG * WM_MAUL.TICKS.length, gp: WM_GP.DMG * WM_GP.HITS_AT.length }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const cx = o => o.x + (o.w || 60) / 2
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
function takeMelee(f, t, key = 'heavy') {
  clearProj(); ready(t); t.isBlocking = false; f.isBlocking = false; f.facing = 1; t.facing = -1; t.x = f.x + f.w + 10; t.y = f.y + f.h - t.h
  assert(C.startMove(t, key, characters.goku.basic_attacks[key]), 'goku ' + key)
  const hp = f.health
  for (let i = 0; i < 50 && f.health === hp && t.attacking; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}); C.resolveAttackHit(t, f, [], {}) }
  t.attacking = false; t.currentAttack = null
  assert(f.health < hp, 'goku ' + key + ' connects on him')
  return hp - f.health
}
const runUlt = (f, t) => { ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t)), 'ult'); let n = 0; while ((S(f).ult || n < 20) && n < 300) { world(f, t, 1); n++ } }
const pounceCast = (f, t) => { ready(f); S(f).dashTapT = S(f).t; f._specialHeldDir = null; return A.triggerSpecial(f, ctxOf(f, t)) }
const until = (f, t, key, max = 200) => { let n = 0; while (S(f)[key] && n < max) { world(f, t, 1); n++ } return n }

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 105],
  ['2. Low, Heavy, Pounce', ['low', 'heavy', 'pounce'], 124],
  ['3. Maul, Heavy, Ground Pound', ['maul', 'heavy', 'gp'], 150],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Pounce (12 Power, 2 hits, knockdown pop, +Scent)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 150); const e = f.energy, hp = t.health; assert(pounceCast(f, t), 'Pounce'); assert.equal(e - f.energy, WM_COST.pounce)
  until(f, t, 'pounce'); d.push(hp - t.health); assert(d[2] > 0); assert.equal(S(f).stats.pounceHits, 2, 'both hits'); assert(t.isLaunched, 'the second knocks down (pop)')
  assert(W.scented(S(f))); console.log('   HP', d.join('+'))
})
test('route 3 live: Maul (3 ticks, thrown) → Heavy → Ground Pound (3 hits, pop-up)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 20); const hp0 = t.health, e = f.energy; assert(cast(f, t, 'D'), 'Maul'); assert.equal(e - f.energy, WM_COST.maul)
  until(f, t, 'maul'); const d = [hp0 - t.health]; assert.equal(S(f).stats.mauled, 1)
  clearProj(); reset(f, t, 10); d.push(melee(f, t, 'heavy'))
  reset(f, t, 40); const hp = t.health; assert(cast(f, t, null), 'Ground Pound'); until(f, t, 'gp'); d.push(hp - t.health)
  assert(d[2] > 0 && t.isLaunched, 'last hit pops up'); console.log('   HP', d.join('+'))
})

// ── 4 Scent ────────────────────────────────────────────────────────────────────────────────────────────────
test('4. Scent: clean normals mark (360f), no stack, refresh; blocks do not; swap clears', () => {
  const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light', { block: true }); assert.equal(S(f).scent.t, 0, 'blocked: no scent')
  reset(f, t, 10); melee(f, t, 'light'); assert.equal(S(f).scent.t, WM_SCENT.DUR); step(f, t, 100); assert.equal(S(f).scent.t, WM_SCENT.DUR - 100)
  reset(f, t, 10); melee(f, t, 'light'); assert.equal(S(f).scent.t, WM_SCENT.DUR, 'refreshed, never above 360')
  step(f, t, WM_SCENT.DUR); assert.equal(S(f).scent.t, 0, 'expires')
  melee(f, t, 'light'); assert(F.applyAlien(f, 'goop')); assert(F.applyAlien(f, 'wildmutt_ov')); assert.equal(S(f).scent.t, 0, 'swap clears')
})
test('4. Scented Pounce locks the CAST-TIME position up to 640 px (invisible / intangible / teleported) and never tracks', () => {
  clearProj(); const f = ben(), t = foe(); S(f).scent.t = 300; t.x = f.x + 560; t._invisible = true; t.intangible = true; t._ghostPhase = true
  const lockX = cx(t); assert(pounceCast(f, t)); assert.equal(S(f).lastPounce.mode, 'scent'); assert.equal(S(f).lastPounce.lockX, lockX)
  t.x = f.x - 300                                                              // teleports away after the cast
  until(f, t, 'pounce'); assert(Math.abs(cx(f) - (lockX - (f.w + t.w) / 2 + WM_POUNCE.GAP)) <= 2, `landed at the cast-time spot (${cx(f)} vs lock ${lockX})`)
  const g = ben(), u = foe(); S(g).scent.t = 300; u.x = g.x - 600; assert(pounceCast(g, u)); assert.equal(S(g).lastPounce.face, -1, 'turns to the scent behind him'); clearProj()
})
test('4. Unscented: heard within 380 px (toward, ≤340); beyond → a fixed 420 px in his facing, not toward the target', () => {
  clearProj(); const f = ben(), t = foe(); t.x = f.x + 300; assert(pounceCast(f, t)); assert.equal(S(f).lastPounce.mode, 'heard'); until(f, t, 'pounce'); clearProj()
  const g = ben(), u = foe(); u.x = g.x - 700; g.facing = 1; const x0 = g.x; assert(pounceCast(g, u)); assert.equal(S(g).lastPounce.mode, 'blind')
  until(g, u, 'pounce'); assert.equal(g.x - x0, WM_POUNCE.BLIND, 'fixed 420 px forward (away from the target behind)'); clearProj()
})
test('4. Scented: normals −1f startup (min 1); instant facing on cross-ups, not in hitstun / while attacking', () => {
  const f = ben(), t = foe(); for (const k of ['light', 'heavy', 'down', 'up', 'air']) assert.equal(WILDMUTT.moveFrames(f, k, BA[k]), BA[k], 'unscented: unchanged')
  S(f).scent.t = 200; for (const k of ['light', 'heavy', 'down', 'up', 'air']) assert.equal(WILDMUTT.moveFrames(f, k, BA[k]).startup, Math.max(1, BA[k].startup - 1), k)
  t.x = f.x - 200; f.facing = 1; step(f, t, 1); assert.equal(f.facing, -1, 'cross-up: faces them at once')
  t.x = f.x + 300; f.hitstun = 10; step(f, t, 1); assert.equal(f.facing, -1, 'not in hitstun'); f.hitstun = 0
  const g = ben(), u = foe(); u.x = g.x - 200; g.facing = 1; step(g, u, 1); assert.equal(g.facing, 1, 'unscented: no auto-turn by scent')
})
// ── 5 Fury / Frenzy / Exhaustion ───────────────────────────────────────────────────────────────────────────
test('5. Fury: +5 per hit landed, +4 per hit taken, +8 per Pounce hit, −1/f after 120f idle', () => {
  const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light'); assert.equal(S(f).fury.v, WM_FURY.HIT)
  const g = ben(), u = foe(); reset(g, u, 10); takeMelee(g, u, 'light'); assert.equal(S(g).fury.v, WM_FURY.TAKEN)
  clearProj(); const h = ben(), v = foe(); reset(h, v, 150); pounceCast(h, v); until(h, v, 'pounce'); assert.equal(S(h).fury.v, 2 * WM_FURY.POUNCE, 'two Pounce hits')
  const k = ben(), w = foe(); S(k).fury.v = 50; step(k, w, WM_FURY.IDLE); assert.equal(S(k).fury.v, 50, 'holds for 120f'); step(k, w, 10); assert.equal(S(k).fury.v, 40, '−1/f after')
})
test('5. FRENZY at 100: 300f, speed ×1.20, damage ×1.20, Jab / Heavy −1f, no block / Roar / Maul, red frame set; then EXHAUSTION', () => {
  const f = ben(), t = foe(); far(f, t); const walk = f._benWalkSpeed; W.gainFury(f, S(f), 100); assert.equal(S(f).fury.frenzyT, WM_FURY.FRENZY)
  assert(Math.abs(f._benWalkSpeed - walk * 1.2) < 1e-9); assert(Math.abs(WILDMUTT.damageDealt(f, t, 100, {}) - 120) < 1e-9)
  assert.equal(WILDMUTT.moveFrames(f, 'light', BA.light).startup, BA.light.startup - 1); assert.equal(WILDMUTT.moveFrames(f, 'down', BA.down), BA.down, 'only Jab / Heavy')
  step(f, t, 1); assert(S(f).noBlock, 'no guard'); assert.equal(f._skinAnim, W.WM_FRAMESETS.frenzy); assert(/frenzy_/.test(f._skinAnim.idle.sheet))
  assert(!cast(f, t, 'B'), 'no Roar'); assert(!cast(f, t, 'D'), 'no Maul'); W.gainFury(f, S(f), 10); assert.equal(S(f).fury.v, 100, 'no gain in Frenzy')
  step(f, t, WM_FURY.FRENZY); const s = S(f); assert.equal(s.fury.frenzyT, 0); assert.equal(s.fury.v, 0); assert(s.fury.exhaustT > 0); assert.equal(f._benWalkSpeed, walk, 'speed restored')
  assert.equal(f._skinAnim, W.WM_FRAMESETS.normal); assert(!s.noBlock)
  assert(!pounceCast(f, t), 'Exhaustion: no Pounce'); assert(!cast(f, t, 'U'), 'Exhaustion: no Bull Rush'); step(f, t, WM_FURY.EXHAUST); assert(cast(f, t, 'U'), 'after 90f'); clearProj()
})
// ── 6 Roar ─────────────────────────────────────────────────────────────────────────────────────────────────
test('6. Roar: needs Fury ≥ 25; 20 + 0.4 × Fury (max 60); spends ALL Fury; pushes 140 px; hitstun 18; −12 on block', () => {
  const f = ben(), t = foe(); reset(f, t, 60); S(f).fury.v = 24; assert(!cast(f, t, 'B'), 'needs 25')
  for (const fury of [25, 50, 100]) { clearProj(); const g = ben(), u = foe(); reset(g, u, 60); S(g).fury.v = fury; const hp = u.health, e = g.energy, x0 = u.x
    assert(cast(g, u, 'B')); assert.equal(e - g.energy, WM_COST.roar); assert.equal(S(g).fury.v, 0, 'all spent'); world(g, u, WM_ROAR.STARTUP + WM_ROAR.PUSH_T + 1)
    assert.equal(hp - u.health, Math.floor(W.roarDamage(fury) * DM * C.GLOBAL_DAMAGE_SCALE), `${fury} fury`); assert(Math.abs(u.x - x0 - WM_ROAR.PUSH) <= 1, `push ${u.x - x0}`) }
  assert.equal(W.roarDamage(100), 60); assert.equal(W.roarDamage(25), 30)
  clearProj(); const h = ben(), v = foe(); reset(h, v, 60); S(h).fury.v = 50; assert(cast(h, v, 'B')); let adv = null
  for (let i = 0; i < 60; i++) { v.isBlocking = true; world(h, v, 1); if (adv === null && v.blockstun > 0) adv = v.blockstun - (WM_ROAR.TOTAL - S(h).roar.t) }
  assert.equal(adv, WM_ROAR.ON_BLOCK, `on block ${adv}`); clearProj()
})
// ── 7 Bull Rush ────────────────────────────────────────────────────────────────────────────────────────────
test('7. Bull Rush: carries ≤ 300 px, 3 × 12, run capped at 36f, no pull-through, wall bonus +30 once, −15 on block', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 30); const hp = t.health, e = f.energy; assert(cast(f, t, 'U')); assert.equal(e - f.energy, WM_COST.rush)
  until(f, t, 'rush'); const s = S(f); assert(s.stats.rushCarry > 0 && s.stats.rushCarry <= WM_RUSH.CARRY, `carry ${s.stats.rushCarry}`)
  assert.equal(hp - t.health, 3 * Math.floor(WM_RUSH.DMG * DM * C.GLOBAL_DAMAGE_SCALE), '3 × 12'); assert.equal(s.stats.wallBonus, 0)
  clearProj(); const g = ben(), u = foe(); g.x = 1300; reset(g, u, 20); const hp2 = u.health; assert(cast(g, u, 'U')); until(g, u, 'rush')
  assert.equal(S(g).stats.wallBonus, 1, 'wall bonus once'); const at = S(g).stats.wallAt; assert(at.oR <= STAGE.stageWidth + 0.01 && at.f <= at.o + 1, `no pull-through ${JSON.stringify(at)}`)
  assert(hp2 - u.health >= Math.floor(WM_RUSH.WALL * DM * C.GLOBAL_DAMAGE_SCALE), '+30')
  clearProj(); const h = ben(), v = foe(); reset(h, v, 30); assert(cast(h, v, 'U')); let adv = null
  for (let i = 0; i < 80; i++) { v.isBlocking = true; world(h, v, 1); if (adv === null && v.blockstun > 0) adv = v.blockstun - (S(h).rush.end - S(h).rush.t) }
  assert.equal(adv, WM_RUSH.ON_BLOCK, `on block ${adv}`); assert.equal(S(h).stats.rushCarry, 0, 'blocked: no carry')
  clearProj(); const k = ben(), w = foe(); far(k, w); assert(cast(k, w, 'U')); let run = 0; while (S(k).rush) { const r0 = S(k).rush.r; world(k, w, 1); if (S(k).rush && S(k).rush.r > r0) run++ }
  assert(run <= WM_RUSH.RUN, `run ${run} ≤ 36f`); clearProj()
})
// ── 8 Maul ─────────────────────────────────────────────────────────────────────────────────────────────────
test('8. Maul: 110 px command grab, 3 × 15, thrown 180 px, throw escape respected, 28f whiff recovery', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 20); const hp = t.health; assert(cast(f, t, 'D')); until(f, t, 'maul')
  assert.equal(S(f).stats.mauled, 1); assert(hp - t.health > 0); assert(W.scented(S(f)))
  const g = ben(), u = foe(); reset(g, u, 20); assert(cast(g, u, 'D')); world(g, u, WM_MAUL.STARTUP + WM_MAUL.HOLD); const m = S(g).maul
  assert(Math.abs(m.thrown - WM_MAUL.THROW) <= 1, `thrown ${m.thrown}`); until(g, u, 'maul')
  const h = ben(), v = foe(); reset(h, v, 20); v.grabInputBuffer = 30; assert(cast(h, v, 'D')); world(h, v, WM_MAUL.STARTUP)
  assert.equal(S(h).maul.result, 'teched', 'throw escape'); assert.equal(S(h).stats.mauled, 0); until(h, v, 'maul')
  const k = ben(), w = foe(); k.x = 400; w.x = k.x + 200; assert(Math.abs(cx(w) - cx(k)) > WM_MAUL.RANGE); assert(cast(k, w, 'D'))
  const n = until(k, w, 'maul'); assert.equal(S(k).stats.mauled, 0); assert(n >= WM_MAUL.STARTUP + WM_MAUL.WHIFF - 1, `whiff ${n}f`)
  const q = ben(), z = foe(); reset(q, z, 20); z.y -= 140; z.vy = -6; z.onGround = z.grounded = false; assert(cast(q, z, 'D')); world(q, z, WM_MAUL.STARTUP); assert.equal(S(q).maul.result, 'air', 'airborne: no grab')
})
// ── 9 Claw Dive ────────────────────────────────────────────────────────────────────────────────────────────
test('9. Claw Dive: air only, 12 Power, diagonal down, 48, once per airtime, no jump refill', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); f.y -= 160; f.onGround = f.grounded = false; f.jumpCount = 2; ready(f); f._specialHeldDir = null
  const e = f.energy, hp = t.health, x0 = f.x, y0 = f.y; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(e - f.energy, WM_COST.dive)
  world(f, t, 8); assert(f.x > x0 && f.y > y0, 'down-forward'); until(f, t, 'dive', 80)
  assert.equal(hp - t.health, Math.floor(WM_DIVE.DMG * DM * C.GLOBAL_DAMAGE_SCALE), 'one hit of 48'); assert.equal(f.jumpCount, 2, 'no jump refill')
  const g = ben(), u = foe(); far(g, u); g.y -= 200; g.onGround = g.grounded = false; ready(g); assert(A.triggerSpecial(g, ctxOf(g, u))); S(g).dive = null; delete g._benGlide; ready(g)
  assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'once per airtime'); g.onGround = g.grounded = true; tick(g, u, 1); assert.equal(S(g).diveUsed, false); clearProj()
})
// ── 10 ultimate ────────────────────────────────────────────────────────────────────────────────────────────
test('10. Primal Hunt: 55 Power; whiff / block = no capture (60f); 40 + 6×18 + 92 = 240; scent at the end; Fury 0; restore', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t))); assert.equal(f.energy, 45)
  world(f, t, 30); assert.equal(S(f).lastUltRaw, 0); assert(f.attackCooldown > 0 && f.attackCooldown <= WM_ULT.WHIFF)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 120); ready(g); g.energy = 100; A.triggerUltimate(g, ctxOf(g, u)); for (let i = 0; i < 30; i++) { u.isBlocking = true; world(g, u, 1) }
  assert.equal(S(g).lastUltRaw, 0, 'block: no cinematic'); u.isBlocking = false
  clearProj(); const h = ben(), v = foe(); reset(h, v, 120); S(h).fury.v = 60; const hx = h.x, vx0 = v.x, hp = v.health
  runUlt(h, v); assert.equal(S(h).lastUltRaw, 240); assert.equal(S(h).lastUltAngles.length, 6); assert(hp - v.health > 0)
  assert.equal(h.x, hx, 'positions restore'); assert(Math.abs(v.x - vx0) <= 2 * 3 + 1, `target back home, then launched (${v.x - vx0})`); assert(v.vy < 0 || !v.onGround, 'ground bounce / launched'); assert(W.scented(S(h)), 'scent at the end')
  assert.equal(S(h).fury.v, 0, 'Fury 0'); assert(h.attackCooldown > 0 && h.attackCooldown <= WM_ULT.LOCKOUT); assert.equal(WILDMUTT.bodyAlpha(h), 1, 'lighting / body restored')
  clearProj()
})
test('10. Primal Hunt: slash angles = hash(seed, frame, player) — identical for the same seed, different for another', () => {
  const run = seed => { SEED = seed; FRAME = 7000; const f = ben(), t = foe(); reset(f, t, 120); runUlt(f, t); clearProj(); return JSON.stringify(S(f).lastUltAngles) }
  const a = run(11), b = run(11), c = run(12); SEED = 4242; assert.equal(a, b); assert.notEqual(a, c)
})
// ── 11 lifecycle ───────────────────────────────────────────────────────────────────────────────────────────
test('11. swap / revert / KO / rematch clear Scent, Fury, Frenzy (and restore his speed)', () => {
  const dirty = f => { const t = foe(); far(f, t); S(f).scent.t = 200; W.gainFury(f, S(f), 100); step(f, t, 1) }
  const f = ben(); dirty(f); assert.equal(f._skinAnim, W.WM_FRAMESETS.frenzy)
  assert(F.applyAlien(f, 'goop')); assert.notEqual(f._skinAnim, W.WM_FRAMESETS.frenzy, 'swap: red set gone')
  assert(F.applyAlien(f, 'wildmutt_ov')); const s = S(f); assert.equal(s.scent.t, 0); assert.equal(s.fury.v, 0); assert.equal(s.fury.frenzyT, 0); assert.equal(s.fury.exhaustT, 0)
  assert(Math.abs(f._benWalkSpeed - ben()._benWalkSpeed) < 1e-9, 'walk speed back to the form value')
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null)
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null)
  assert.equal(S(ben()).fury.v, 0, 'rematch / round end: a fresh form state')
})
// ── 12 slot 14 → PICK FIVE ─────────────────────────────────────────────────────────────────────────────────
test('12. pick five: slot count from the registry (5), Wildmutt READY + pickable (catalog slot 14), nothing overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('wildmutt_ov'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 14); assert.equal(d.displayName, 'Wildmutt')
  assert.equal(getAlienDefinition('wildmutt').status, 'experimental', 'the experimental Wildmutt is untouched')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin', 'wildvine', 'jetray', 'diamondhead_ov']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'wildmutt_ov').length, 1); assert(getAvailableAlienKeys(false).includes('wildmutt_ov'))
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Wildmutt'); assert.equal(f.health, 950, 'shared health')
  assert(Math.abs(f.defenseMultiplier - 0.90) < 1e-9 && Math.abs(f.damageMultiplier - 1.10) < 1e-9 && Math.abs(f._benWeight - 0.95) < 1e-9, 'def 0.90 / dmg 1.10 / weight 0.95')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 1.15 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×1.15')
})
test('12. picked loadout: Wildmutt in the last dial slot, transforms at the same cost as any slot', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'wildmutt_ov'], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    assert(F.ben10TransformOrSwap(f, slot, { seed: 1, frame: 0, playerIndex: 0 })); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, 'wildmutt_ov'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
})
test('12. Vow pick includes Wildmutt (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'wildmutt_ov'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('wildmutt_ov') && picks.size === L.length)
})
test('12. same-seed determinism: an identical scripted Wildmutt sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light')
    reset(f, t, 150); pounceCast(f, t); until(f, t, 'pounce'); reset(f, t, 30); cast(f, t, 'U'); until(f, t, 'rush')
    reset(f, t, 20); world(f, t, 30); cast(f, t, 'D'); until(f, t, 'maul'); S(f).fury.v = 60; reset(f, t, 60); cast(f, t, 'B'); until(f, t, 'roar')
    reset(f, t, 120); runUlt(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data mid-cast (pounce, ground pound, maul, roar, rush, dive, frenzy, ult cinematic)', () => {
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  clearProj(); const f = ben(), t = foe(); reset(f, t, 150); pounceCast(f, t); world(f, t, 16); assert(plain(S(f))); until(f, t, 'pounce')
  reset(f, t, 40); cast(f, t, null); world(f, t, 22); assert(plain(S(f))); until(f, t, 'gp'); reset(f, t, 20); cast(f, t, 'D'); world(f, t, 24); assert(plain(S(f))); until(f, t, 'maul')
  reset(f, t, 30); cast(f, t, 'U'); world(f, t, 16); assert(plain(S(f))); until(f, t, 'rush'); W.gainFury(f, S(f), 100); assert(plain(S(f)))
  clearProj(); const u = ben(), v = foe(); reset(u, v, 120); u.energy = 100; ready(u); A.triggerUltimate(u, ctxOf(u, v)); world(u, v, 60)
  assert(S(u).ult && S(u).ult.phase !== 'opener', 'mid-cinematic'); assert(plain(S(u)), 'only plain data in formState'); clearProj()
})
test('no Math.random / gameRng in wildmutt.js / wildmuttAssets.js', () => {
  for (const file of ['../wildmutt.js', '../wildmuttAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`WILDMUTT: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
