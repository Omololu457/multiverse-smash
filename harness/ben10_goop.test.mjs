// GOOP — Phase 7 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_goop.test.mjs
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per move, reset after 90f), within
// ±20%. The live routes then run the real engine (its combo curve, the global damage scale) and assert the
// mechanics: every hit connects, the counter grows, later hits scale down.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { GOOP, GP_BODY, GP_PROJ, GP_PUDDLE, GP_ACID, GP_LOB, GP_ULT, GP_POKE, GP_SPIT, gpState, projectorBox, addAcidPip, isPhysicalNormal } from '../goop.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0 })
const LOADOUT = ['swampfire', 'heatblast', 'megawhatt', 'goop']
const ben = (form = 'goop') => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, LOADOUT); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const S = f => f.omnitrix.formState
const ctxOf = (f, t) => ({ p1: f, p2: t })
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); if (f._benLunge || f._benGlide) physics.moveFighter(f, {}, {}) } }
const BA = GOOP.basic_attacks
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  spit: 40, lasso: 35, spike: 70, geyser: 60 }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y + f.h - t.h }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }

function melee(f, t, key, { block = false, md = BA[key], expectHit = true } = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.hitstop = 0; f._benPowerCommit = 0
  if (key === 'air') { f.onGround = f.grounded = false }
  assert(C.startMove(f, key, md), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter, bs = t.blockstun
  t.isBlocking = block
  for (let i = 0; i < 50 && t.health === hp && !(block && t.blockstun > bs) && f.attacking; i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true; f.attacking = false; f.currentAttack = null
  if (!block && expectHit) { assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo') }
  return hp - t.health
}
// Real special: Power spend, its live (non-visual) projectiles through the projectile pipeline, placed on the target.
function special(f, t, dir, { frames = 70, block = false, keep = false, input = {} } = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0
  if (!keep) A.clearAbilityState()
  f._specialHeldDir = dir; const e = f.energy, hp = t.health
  const ok = A.triggerSpecial(f, ctxOf(f, t))
  let hits = 0
  if (ok) for (let frame = 1; frame <= frames; frame++) {
    tick(f, t, 1, input)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly && p.owner === f)) {
      t.isBlocking = block; p.x = t.x + t.w / 2; p.y = t.y + t.h / 2
      C.resolveProjectileHitsMulti([p], [t]); hits++; const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
    }
  }
  t.isBlocking = false
  reset(f, t); f.attackCooldown = 0; f._benPowerCommit = 0
  return { ok, spent: e - f.energy, dealt: hp - t.health, hits }
}
// An opponent projectile aimed at a box (w×h, centred on (cx, cy)) against Goop.
function shoot(g, o, cx, cy, w = 6, h = 6, damage = 40) {
  const hp = g.health; o.comboCounter = 0; o._comboHits = 0
  const p = A.spawnProjectile(o, 'test_shot', { damage, speed: 0, vx: 0, vy: 0, spawnX: cx, spawnY: cy, w, h, rectHitbox: true, lifetime: 3, hitstun: 10 }, {})
  C.resolveProjectileHitsMulti([p], [g]); const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
  return hp - g.health
}
const freshDef = g => { g.hitstun = 0; g.invulnTimer = 0; g.blockstun = 0; g.isBlocking = false; g.hitstop = 0; g.vx = g.vy = 0; g.onGround = g.grounded = true; g.y = 410 - g.h; g.comboCounter = 0 }
const GOKU_JAB = { damage: 40, startup: 3, active: 3, recovery: 6, frameExact: true }
const GOKU_LOW = { damage: 40, startup: 3, active: 3, recovery: 6, frameExact: true, hitLevel: 'low' }

// ── 1-4 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 90],
  ['2. Low, Heavy, Acid Spit', ['low', 'heavy', 'spit'], 100],
  ['3. Goo Lasso, Heavy, Spike Splash', ['lasso', 'heavy', 'spike'], 140],
  ['4. Puddle → Geyser → Air', ['geyser', 'air'], 87],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Acid Spit (10 Power, 4 hits, +1 Acid)', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  const sp = special(f, t, null); assert(sp.ok); assert.equal(sp.spent, 10); assert.equal(sp.hits, 4, '4 hits'); assert(sp.dealt > 0)
  assert.equal(S(f).acid.pips, 1, 'one pip per cast, however many ticks hit'); console.log('   HP', [...d, sp.dealt].join('+'))
})
test('route 3 live: Goo Lasso (14 Power, pulls adjacent, +16), Heavy, Spike Splash (18 Power, 3 hits)', () => {
  const f = ben(), t = fresh('goku', 250); t.x = f.x + 300
  A.clearAbilityState(); f._specialHeldDir = 'F'; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(f.energy, 86, '14 Power')
  let hit = false
  for (let i = 0; i < 20 && !hit; i++) { tick(f, t); for (const p of A.activeProjectiles.filter(p => p.name === 'gp_lasso')) { C.resolveProjectileHitsMulti([p], [t]); hit = true } }
  assert(hit, 'lasso spawned'); assert(t.health < 950, 'lasso connects from 300 px')
  assert.equal(t.x, f.x + f.w + 2, 'pulled adjacent'); assert(t.hitstun - f.attackCooldown === 16, `+16 on hit (${t.hitstun - f.attackCooldown})`)
  clearProj(); f.attackCooldown = 0; f._benPowerCommit = 0; reset(f, t)
  melee(f, t, 'heavy')
  tick(f, t, 1, { left: true })                                            // ←↙↓: back inside the 12f window → Spike Splash
  const sk = special(f, t, 'D', { frames: 50 }); assert(sk.ok); assert.equal(sk.hits, 3, 'Spike Splash 3 hits'); assert.equal(S(f).puddle, null)
  assert.equal(f.comboCounter, 5, 'Lasso (1) + Heavy (1) + Spike Splash (3 hits) all extend the combo')
})
test('route 3b: ←↙↓ + P = Spike Splash (back held ≤12f before ↓); 3 hits 20/20/30, radius 170, +1 Acid', () => {
  const f = ben(), t = fresh('goku', 150); t.x = f.x + 150
  tick(f, t, 1, { left: true }); tick(f, t, 2, { down: true, left: true })
  const sk = special(f, t, 'D', { frames: 50 }); assert(sk.ok); assert.equal(sk.spent, 18); assert.equal(sk.hits, 3); assert(sk.dealt > 0)
  assert.equal(S(f).puddle, null, 'not a puddle'); assert.equal(S(f).acid.pips, 1)
})
test('route 4 live: Puddle → Geyser (→↓↘, 60, launches) → Air', () => {
  const f = ben(), t = fresh('goku', 70); reset(f, t)
  A.clearAbilityState(); f._specialHeldDir = 'D'; assert(A.triggerSpecial(f, ctxOf(f, t)), 'puddle'); tick(f, t, 10, { special: true })
  assert.equal(S(f).puddle.phase, 'slide')
  const hp = t.health
  tick(f, t, 1, { special: true, right: true }); tick(f, t, 1, { special: true, down: true }); tick(f, t, 1, { special: true, down: true, right: true })
  assert.equal(S(f).puddle, null); assert.equal(S(f).stats.geysers, 1, 'Geyser fired')
  let hit = false
  for (let i = 0; i < 20; i++) { tick(f, t); for (const p of A.activeProjectiles.filter(p => p.name === 'gp_geyser')) { C.resolveProjectileHitsMulti([p], [t]); hit = true; A.activeProjectiles.splice(A.activeProjectiles.indexOf(p), 1) } }
  assert(hit && t.health < hp, 'Geyser connects'); assert(t.vy < 0, 'launches'); const gd = hp - t.health
  f.attackCooldown = 0; f._benPowerCommit = 0; t.y = f.y - 40; t.x = f.x + 60
  const ad = melee(f, t, 'air'); console.log('   HP', gd, '+', ad)
})

// ── 5 goo body / projector / Splat ─────────────────────────────────────────────────────────────────────────
test('5. goo body: −25% from physical melee normals only (not specials, projectiles, fire, electric, beams)', () => {
  const g = ben(), o = fresh('goku', 70)
  const meleeOpts = atk => { o.currentAttack = atk; return { source: 'melee', defenseApplied: true, offenseApplied: true, attacker: o, scale: 1 } }
  const dmg = opts => { const hp = g.health; C.applyScaledDamage(g, 100, opts); const d = hp - g.health; g.health = 950; return d }
  const plain = dmg(meleeOpts({ name: 'heavy', category: 'heavy', isSpecial: true }))   // a melee special: same path, no goo
  const normal = dmg(meleeOpts({ name: 'light', category: 'light' }))
  assert(Math.abs(normal / plain - GP_BODY.MELEE_MULT) < 0.02, `melee normal ×0.75 (${normal}/${plain})`)
  assert.equal(dmg(meleeOpts({ name: 'heavy', isSpecial: true })), plain, 'special melee: no reduction')
  assert.equal(dmg(meleeOpts({ name: 'heavy', fire: true })), plain, 'fire normal: no reduction')
  assert.equal(dmg(meleeOpts({ name: 'heavy', damageType: 'electric' })), plain, 'electric normal: no reduction')
  assert.equal(dmg(meleeOpts({ name: 'beam_sweep' })), plain, 'beam: no reduction')
  assert(!isPhysicalNormal(o, { name: 'ultimate', isUltimate: true }))
  // live: a goku jab to the body is reduced (stats)
  freshDef(g); o.x = g.x + 55; o.facing = -1; S(g).stats.gooReduced = 0
  melee(o, g, 'light', { md: GOKU_JAB }); assert.equal(S(g).stats.gooReduced, 1, 'live jab goo-reduced'); assert.equal(S(g).stats.projHits, 0)
})
test('5. projector: separate ≈10×6 box at the recorded position; hit = no goo reduction, +15%, counted once', () => {
  const g = ben(), o = fresh('goku', 300); freshDef(g)
  const pb = projectorBox(g); assert.equal(pb.w, 10); assert.equal(pb.h, 6)
  assert(pb.y + pb.h < g.y + 6, 'standing: the projector floats above the body box')
  const body = shoot(g, o, g.x + g.w / 2, g.y + g.h / 2); freshDef(g); g.health = 950
  const proj = shoot(g, o, pb.x + 5, pb.y + 3); freshDef(g); g.health = 950
  assert(Math.abs(proj / body - GP_PROJ.MULT) < 0.03, `projector ×1.15 (${proj} vs ${body})`); assert.equal(S(g).stats.projHits, 1)
  // one big shot overlapping body AND projector: one hit, projector rule wins
  const both = shoot(g, o, g.x + g.w / 2, g.y + 20, 120, 120); assert.equal(S(g).stats.projHits, 2, 'counted once, as the projector')
  assert(Math.abs(both - proj) <= 1, `same damage as a projector hit (${both} vs ${proj})`)
  // facing flips the projector around the body centre
  const g2 = ben(); g2.facing = -1; const pb2 = projectorBox(g2); assert(Math.abs((pb2.x + 5 - (g2.x + 30)) + (pb.x + 5 - (g.x + 30))) < 1e-6)
})
test('5. SPLAT: 2 projector hits within 180f → Splat 40f then reform; one Splat per 600f', () => {
  const g = ben(), o = fresh('goku', 300); freshDef(g)
  const hitP = () => { freshDef(g); const pb = projectorBox(g); shoot(g, o, pb.x + 5, pb.y + 3, 6, 6, 10) }
  hitP(); tick(g, o, 200); hitP(); assert.equal(S(g).splat, null, '2 hits 200f apart: no Splat')
  tick(g, o, 50); hitP(); assert(S(g).splat, '2 hits inside 180f → Splat'); assert.equal(S(g).stats.splats, 1)
  assert(g._benPowerCommit >= GP_PROJ.SPLAT_FRAMES, 'locked while splatted')
  tick(g, o, 10); assert.equal(g._spriteCastMove, 'gpSplat', 'puddle frames (R19)')
  tick(g, o, GP_PROJ.SPLAT_FRAMES + GP_PROJ.REFORM); assert.equal(S(g).splat, null, 'reformed')
  hitP(); tick(g, o, 5); hitP(); assert.equal(S(g).splat, null, 'Splat cooldown (600f): no second Splat'); assert.equal(S(g).stats.splats, 1)
  tick(g, o, 600); hitP(); tick(g, o, 5); hitP(); assert(S(g).splat, 'after 600f a Splat can happen again')
})

// ── 6 Puddle Form ──────────────────────────────────────────────────────────────────────────────────────────
const puddle = (g, o) => { A.clearAbilityState(); g._specialHeldDir = 'D'; g.attackCooldown = 0; g._benPowerCommit = 0; assert(A.triggerSpecial(g, ctxOf(g, o)), 'enter puddle'); tick(g, o, GP_PUDDLE.MELT + 2, { special: true }) }
test('6. Puddle: 10 Power to enter; high/mid melee and projectiles miss the body; lows hit; projector still hittable', () => {
  const g = ben(), o = fresh('goku', 300); const e0 = g.energy; puddle(g, o); assert.equal(S(g).puddle.phase, 'slide')
  assert(e0 - g.energy >= 10 && e0 - g.energy < 10.5, 'costs 10 Power (+ drain)')
  o.x = g.x + 55; o.facing = -1
  const hp = g.health
  melee(o, g, 'light', { md: GOKU_JAB, expectHit: false }); assert.equal(g.health, hp, 'mid jab misses the puddle')
  assert(shoot(g, o, g.x + g.w / 2, g.y + g.h / 2) === 0, 'projectile misses the puddle body')
  tick(g, o, 1, { special: true })
  melee(o, g, 'down', { md: GOKU_LOW, expectHit: false }); assert(g.health < hp, 'a low still hits')
})
test('6. Puddle: projector hit forces an instant Splat', () => {
  const g = ben(), o = fresh('goku', 300); puddle(g, o)
  const pb = projectorBox(g); assert(shoot(g, o, pb.x + 5, pb.y + 3) > 0, 'projector hittable at its floating height')
  assert(S(g).splat, 'instant Splat'); assert.equal(S(g).puddle, null)
})
test('6. Puddle: slides at 6, drains 4 Power/s, max 150f, no jump/block/attack; release = 12f reform', () => {
  const g = ben(), o = fresh('goku', 900); puddle(g, o)
  const x0 = g.x, e0 = g.energy; tick(g, o, 60, { special: true, right: true })
  assert(Math.abs(g.x - x0 - 360) < 1, `slides 6 px/f (${g.x - x0})`); assert(Math.abs(e0 - g.energy - 4) < 0.01, `−4 Power/s (${e0 - g.energy})`)
  assert(g._benPowerCommit > 0 && g.attackCooldown > 0, 'no jump / block / attack while puddled')
  tick(g, o, 1, {}); assert.equal(S(g).puddle.phase, 'reform', 'release → reform'); assert(g.attackCooldown >= GP_PUDDLE.REFORM - 1, '12f punishable reform')
  tick(g, o, GP_PUDDLE.REFORM + 1); assert.equal(S(g).puddle, null)
  const h = ben(); puddle(h, o); let n = 0; while (S(h).puddle?.phase === 'slide' && n < 300) { tick(h, o, 1, { special: true }); n++ }
  assert(n <= GP_PUDDLE.MAX + 1, `150f cap (${n})`); assert.equal(S(h).puddle.phase, 'reform')
})

// ── 7 Acid / Corrode / Dissolve ────────────────────────────────────────────────────────────────────────────
test('7. Acid: one pip per cast; none from blocks; 3 pips → Corrode (+15% from Goop for 180f), no refresh, 360f immunity', () => {
  const f = ben(), t = fresh('goku', 70)
  special(f, t, null, { block: true }); assert.equal(S(f).acid.pips, 0, 'blocked: no pip')
  special(f, t, null); special(f, t, null); assert.equal(S(f).acid.pips, 2)
  const before = (() => { const hp = t.health; C.applyScaledDamage(t, 100, { attacker: f, source: 'ability' }); const d = hp - t.health; t.health = hp; return d })()
  special(f, t, null); assert.equal(S(f).acid.corrodeT > 0, true, 'Corrode'); assert.equal(S(f).acid.pips, 0, 'pips consumed')
  const during = (() => { const hp = t.health; C.applyScaledDamage(t, 100, { attacker: f, source: 'ability' }); const d = hp - t.health; t.health = hp; return d })()
  assert(Math.abs(during / before - GP_ACID.MULT) < 0.02, `+15% (${during} vs ${before})`)
  const chip = k => { const hp = t.health; C.applyScaledDamage(t, 100, { source: 'block-chip', boostFrom: f }); const d = hp - t.health; t.health = hp; return d }
  const chipC = chip(); assert(addAcidPip(S(f), 999) === false, 'no refresh during Corrode')
  tick(f, t, GP_ACID.CORRODE + 5); assert.equal(S(f).acid.corrodeT, 0); assert(S(f).acid.immune > 0, 'immunity')
  const chipN = chip(); assert(Math.abs(chipC / chipN - GP_ACID.GUARD_MULT) < 0.03, `guard drains 25% faster (${chipC} vs ${chipN})`)
  assert.equal(addAcidPip(S(f), 1000), false, 'no pips while immune'); tick(f, t, GP_ACID.IMMUNE); assert.equal(addAcidPip(S(f), 1001), true, 'pips again after 360f')
})
test('7. pips expire 240f after the last', () => {
  const f = ben(), t = fresh('goku', 70); special(f, t, null); assert.equal(S(f).acid.pips, 1); tick(f, t, GP_ACID.EXPIRE + 2); assert.equal(S(f).acid.pips, 0)
})
test('7. DISSOLVE: Goo Lasso on a corroded opponent adds a fixed +20 once and ends Corrode early', () => {
  const f = ben(), t = fresh('goku', 70); special(f, t, null); special(f, t, null); special(f, t, null); assert(S(f).acid.corrodeT > 0)
  const l1 = special(f, t, 'F', { frames: 30 }); assert.equal(S(f).acid.dissolves, 1); assert.equal(S(f).acid.corrodeT, 0, 'Corrode ends'); assert(S(f).acid.immune > 0)
  const l2 = special(f, t, 'F', { frames: 30 }); assert.equal(S(f).acid.dissolves, 1, 'once')
  console.log('   lasso corroded+dissolve', l1.dealt, 'vs plain', l2.dealt); assert(l1.dealt > l2.dealt)
})

// ── 8 Acid Lob splash ──────────────────────────────────────────────────────────────────────────────────────
test('8. Acid Lob: arc lands 260 px ahead; 60f splash, one contact (30, +1 Acid), one splash per owner', () => {
  const f = ben(), t = fresh('goku', 900); A.clearAbilityState()
  f._specialHeldDir = 'B'; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(f.energy, 90)
  tick(f, t, GP_LOB.LAND); let sp = A.activeProjectiles.filter(p => p.name === 'gp_lob_splash'); assert.equal(sp.length, 1)
  assert(Math.abs(sp[0].x - (f.x + f.w / 2 + 30 + 260)) < 1, `lands 260 px ahead (${sp[0].x - f.x - f.w / 2 - 30})`)
  f.attackCooldown = 0; f._benPowerCommit = 0; f._specialHeldDir = 'B'; assert(A.triggerSpecial(f, ctxOf(f, t))); tick(f, t, GP_LOB.LAND)
  sp = A.activeProjectiles.filter(p => p.name === 'gp_lob_splash'); assert.equal(sp.length, 1, 'one splash per owner')
  const p = sp[0]; t.x = p.x - t.w / 2; t.y = 410 - t.h; const hp = t.health
  C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); assert(t.health < hp, 'splash connects'); assert.equal(S(f).acid.pips, 1, '+1 Acid')
  assert(!A.activeProjectiles.some(q => q === p), 'one contact, then gone')
  clearProj()
})

// ── 9 Ultimate ─────────────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false } = {}) {
  A.clearAbilityState(); f.attackCooldown = 0; f.attacking = false; f.energy = 100; f._benPowerCommit = 0
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }; let overlay = false, flood = false
  for (let i = 0; i < 180; i++) {
    tick(f, t); t.isBlocking = block; if (S(f).ult?.overlay) overlay = true; if (S(f).ult?.flood) flood = true
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti([p], [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) }
  }
  t.isBlocking = false
  return { ok, dealt: hp - t.health, home, overlay, flood }
}
test('9. Meltdown Flood: 50 Power; whiff / block = no cinematic (60f recovery); clean = 240 raw, overlays clear, Corrode at end', () => {
  let f = ben(), t = fresh('goku', 70); f.energy = 40; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'rejected below 50 Power')
  f = ben(); t = fresh('goku', 70); let r = ult(f, t, { far: true })
  assert(r.ok); assert.equal(r.dealt, 0, 'whiff deals nothing'); assert.equal(S(f).lastUltRaw, 0, 'no cinematic'); assert(!r.flood)
  f = ben(); t = fresh('goku', 70); r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, 0, 'blocked: no cinematic')
  f = ben(); t = fresh('goku', 70); A.clearAbilityState(); f.energy = 100; A.triggerUltimate(f, ctxOf(f, t))
  assert.equal(f.energy, 50, 'costs 50 Power'); assert.equal(f.attackCooldown, GP_ULT.OPENER_AT + GP_ULT.WHIFF_RECOVERY, '60f whiff recovery'); clearProj()
  f = ben(); t = fresh('goku', 70); reset(f, t); r = ult(f, t)
  assert.equal(S(f).lastUltRaw, GP_ULT.OPENER + 3 * GP_ULT.SPIKE + GP_ULT.COLUMN + GP_ULT.WAVE); assert.equal(S(f).lastUltRaw, 240)
  assert(r.flood && r.overlay, 'flood + column overlay seen'); assert.equal(S(f).ult, null, 'all goo overlays cleared')
  assert.equal(f.x, r.home.x, 'positions restore'); assert(S(f).acid.corrodeT > 0, 'Corrode applied at the end')
  assert(f.attackCooldown > 0 && f.attackCooldown <= GP_ULT.LOCKOUT, '100f recovery lockout'); console.log('   HP dealt', r.dealt)
  // Corrode at the end respects immunity
  const g = ben(), u = fresh('goku', 70); reset(g, u); S(g).acid.immune = 300; ult(g, u); assert.equal(S(g).acid.corrodeT, 0, 'immune: no Corrode')
})

// ── extra kit checks ───────────────────────────────────────────────────────────────────────────────────────
test('Stretch Poke: forward + Heavy = 16f / 46 / 280 px with an extended-limb hurtbox', () => {
  const f = ben(), t = fresh('goku', 900)
  assert(C.startMove(f, 'heavy', BA.heavy)); tick(f, t, 1, { right: true })
  const a = f.currentAttack; assert(a.poke); assert.equal(a.damage, GP_POKE.DMG); assert.equal(a.rangeX, 280); assert.equal(a.activeStart, GP_POKE.STARTUP)
  const body = C.getHurtbox(f); for (let i = 0; i < GP_POKE.STARTUP; i++) { a.timer-- } const ext = C.getHurtbox(f)
  assert(ext.w > body.w + 150, `limb hurtbox extends (${body.w} → ${ext.w})`)
  const g = ben(); assert(C.startMove(g, 'heavy', BA.heavy)); tick(g, t, 1, {}); assert(!g.currentAttack.poke, 'neutral Heavy stays the Heavy'); assert.equal(g.currentAttack.damage, 54)
})
test('Goo Rocket: air ↓↘→ + P, 12 Power, up-diagonal, 50, once per airtime, no jump refill', () => {
  const f = ben(), t = fresh('goku', 900); f.onGround = f.grounded = false; f.y = 200; f.jumpCount = 1
  A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(f.energy, 88)
  const y0 = f.y, x0 = f.x; tick(f, t, 8); assert(f.y < y0 && f.x > x0, 'up-diagonal'); assert.equal(f.jumpCount, 1, 'no jump refill')
  const p = A.activeProjectiles.find(q => q.name === 'gp_rocket'); assert(p && p.damage === 50)
  f.attackCooldown = 0; f._benPowerCommit = 0; tick(f, t, 10); f.attackCooldown = 0; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime'); clearProj()
})

// ── 10 swap / revert / rematch ─────────────────────────────────────────────────────────────────────────────
test('10. swap / revert / rematch clear Puddle, Splat and Acid state', () => {
  const f = ben(), t = fresh('goku', 70); puddle(f, t); S(f).splat = { t: 3 }; S(f).acid.pips = 2; S(f).acid.corrodeT = 50
  assert(F.applyAlien(f, 'heatblast')); assert.notEqual(f.omnitrix.formState?.kind, 'goop', 'swap clears')
  assert(F.applyAlien(f, 'goop')); assert.equal(S(f).puddle, null); assert.equal(S(f).splat, null); assert.equal(S(f).acid.pips, 0); assert.equal(S(f).acid.corrodeT, 0)
  S(f).acid.pips = 1; F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears'); assert.equal(f._benGlide, undefined)
  const g = ben(); assert.equal(S(g).acid.pips, 0); assert.equal(S(g).splatCd, 0, 'rematch: fresh state')
})

// ── 11 Vow + determinism + registry ────────────────────────────────────────────────────────────────────────
test('11. registry: Goop READY in the first placeholder slot (4); Megawhatt / Heatblast / Swampfire untouched', () => {
  const d = getAlienDefinition('goop'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 4)
  for (const k of ['swampfire', 'heatblast', 'megawhatt']) assert.equal(getAlienDefinition(k).status, 'ready', k + ' still ready')
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  { const _ready = getAvailableAlienKeys(false); assert(_ready.length >= BEN10_SLOT_COUNT, 'PICK FIVE: at least one READY alien per dial slot (count read from the registry)'); assert.deepEqual(_ready.slice(0, 5), ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8']) }
  assert.deepEqual(buildLoadout(5).map(a => a.id), ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8'])
  const f = ben(); assert.equal(f.maxJumps, 2, 'shared double jump'); assert.equal(f.activeAlienName, 'Goop'); assert.equal(f.health, 2447, 'shared health')
})
test('11. Vow pick includes Goop; same seed → same pick', () => {
  const mk = () => { const f = ben(null); F.setupBen10(f, LOADOUT); return f }
  const a = mk(), b = mk(); const picks = new Set()
  for (let frame = 0; frame < 300; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); picks.add(a.omnitrix.aliens[x]) }
  assert(picks.has('goop'), 'Goop is reachable by the Vow pick')
})
test('11. same-seed determinism: an identical scripted Goop sequence yields identical GAME_STATE', () => {
  const run = () => {
    const f = ben(), t = fresh('goku', 70); melee(f, t, 'light'); special(f, t, null); special(f, t, 'F', { frames: 30 }); special(f, t, 'B', { frames: 30 })
    puddle(f, t); tick(f, t, 40, { special: true, right: true }); tick(f, t, 100); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast: Lob in flight, Puddle, Splat, ult', () => {
  const f = ben(), t = fresh('goku', 70); A.clearAbilityState(); f._specialHeldDir = 'B'; assert(A.triggerSpecial(f, ctxOf(f, t))); tick(f, t, 8)
  assert(S(f).lob); assert.doesNotThrow(() => JSON.stringify(f.omnitrix)); tick(f, t, 40); clearProj()
  puddle(f, t); assert.doesNotThrow(() => JSON.stringify(S(f)))
  reset(f, t); f.attackCooldown = 0; f._benPowerCommit = 0; S(f).puddle = null; f.energy = 100; A.clearAbilityState(); A.triggerUltimate(f, ctxOf(f, t))
  for (let i = 0; i < 40; i++) { tick(f, t); for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti([p], [t]); A.activeProjectiles.splice(A.activeProjectiles.indexOf(p), 1) } }
  assert(S(f).ult && S(f).ult.phase !== 'opener', 'mid-cinematic'); assert.doesNotThrow(() => JSON.stringify(S(f))); clearProj()
})
test('no Math.random / gameRng in goop.js / goopAssets.js', () => {
  for (const file of ['../goop.js', '../goopAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`GOOP: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
