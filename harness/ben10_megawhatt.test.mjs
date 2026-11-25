// MEGAWHATT — Phase 7 harness (module-level, the real combat / projectile / physics / flight pipeline; no browser).
//   node harness/ben10_megawhatt.test.mjs
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per move, reset after 90f), within
// ±20%. The live routes then run the real engine (its combo curve, the form's x0.95, the global damage scale) and
// assert the mechanics: every hit connects, the counter grows, later hits scale down.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { tickFlightDriver, isFlying } from '../flight.js'
import { MEGAWHATT, MW_VOLT, MW_STATIC, MW_ULT, MW_DISCHARGE, MW_FLIGHT_MAX, MW_FLIGHT_CAP, MW_DRAINED, MEGAWHATT_DRAINED_ANIM, MEGAWHATT_ANIM, mwState, addVolt } from '../megawhatt.js'
import { benAlienAbsorb } from '../ben10State.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0 })
const LOADOUT = ['swampfire', 'heatblast', 'megawhatt']
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const ben = (form = 'megawhatt') => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, LOADOUT); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const S = f => f.omnitrix.formState
const ctxOf = (f, t) => ({ p1: f, p2: t })
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); if (f._benLunge) physics.moveFighter(f, {}, {}) } }
const BA = MEGAWHATT.basic_attacks
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  spark: 40, wire: 25 + 30, thunder: 70 }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y + f.h - t.h }

function melee(f, t, key, { block = false } = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.hitstop = 0; f._benPowerCommit = 0
  if (key === 'air') { f.onGround = f.grounded = false }
  assert(C.startMove(f, key, BA[key]), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter, bs = t.blockstun
  t.isBlocking = block
  for (let i = 0; i < 40 && t.health === hp && !(block && t.blockstun > bs); i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true; reset(f, t)
  if (!block) { assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo') }
  return hp - t.health
}
// Real special: Power + Voltage spend, its live (non-visual) projectiles through the projectile pipeline.
function special(f, t, dir, { frames = 70, block = false, keep = false } = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0
  if (!keep) A.clearAbilityState()
  f._specialHeldDir = dir; const e = f.energy, v = S(f).volt, hp = t.health
  const ok = A.triggerSpecial(f, ctxOf(f, t))
  let hits = 0
  if (ok) for (let frame = 1; frame <= frames; frame++) {
    tick(f, t)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly && p.owner === f)) {
      t.isBlocking = block; p.x = t.x + t.w / 2; p.y = t.y + t.h / 2
      C.resolveProjectileHitsMulti([p], [t]); hits++; const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
    }
  }
  reset(f, t); f.attackCooldown = 0; f._benPowerCommit = 0
  return { ok, spent: e - f.energy, vspent: v - S(f).volt, dealt: hp - t.health, hits }
}

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 84],
  ['2. Low, Heavy, Spark Ball', ['low', 'heavy', 'spark'], 96],
  ['3. Live Wire, Heavy, Thunder Strike (marked)', ['wire', 'heavy', 'thunder'], 145],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Spark Ball (10 Power + 10 Voltage, 1 hit)', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  const v0 = S(f).volt; const sb = special(f, t, null)
  assert(sb.ok); assert.equal(sb.spent, 10, '10 Power'); assert.equal(v0 - S(f).volt, 10, '10 Voltage'); assert.equal(sb.hits, 1); assert(sb.dealt > 0)
  assert.equal(f.comboCounter, 3); console.log('   HP', [...d, sb.dealt].join('+'))
})
test('route 3 live: Live Wire (2 hits, 360 px, crosses up), Heavy, Thunder Strike on the marked target', () => {
  const f = ben(), t = fresh('goku', 120); const x0 = f.x
  const lw = special(f, t, 'F', { frames: 45 }); assert(lw.ok); assert.equal(lw.spent, 12); assert.equal(lw.hits, 2, 'two hits (25 / 30)')
  assert(Math.abs(f.x - x0 - 360) <= 1, `travels 360 px (${f.x - x0})`)
  assert.equal(S(f).stat.pips, 1, '+1 Static (one per cast)')
  melee(f, t, 'heavy')
  const ts = special(f, t, 'B', { frames: 40 }); assert(ts.ok); assert.equal(ts.spent, 15); assert.equal(ts.hits, 1); assert(ts.dealt > 0)
  assert.equal(S(f).stat.pips, 2); console.log('   Live Wire', lw.dealt, 'Thunder', ts.dealt)
})

// ── 4 Voltage ──────────────────────────────────────────────────────────────────────────────────────────────
test('4. Voltage: starts 60; normal hit +6 / blocked +3; specials spend Voltage on top of Power', () => {
  const f = ben(), t = fresh('goku', 70); assert.equal(S(f).volt, 60, 'starts at 60')
  melee(f, t, 'light'); assert.equal(S(f).volt, 66, 'hit +6')
  melee(f, t, 'light', { block: true }); assert.equal(S(f).volt, 69, 'blocked +3')
  const lw = special(f, t, 'F', { frames: 45 }); assert.equal(lw.spent, 12); assert(S(f).volt <= 69 - 15 + 2 * 0, 'Live Wire spends 15 Voltage')
})
test('4. Ground Draw: hold ↓ + Special grounded = +2/f, can\'t act, takes +15% damage', () => {
  const f = ben(), t = fresh('goku', 70); S(f).volt = 30
  A.clearAbilityState(); f._specialHeldDir = 'D'; assert(A.triggerSpecial(f, ctxOf(f, t)), 'draw starts'); assert(S(f).draw)
  tick(f, t, 10, { special: true, down: true }); assert.equal(S(f).volt, 50, '+2 per frame')
  assert(f.attackCooldown > 0 && f._attackInputLock > 0, 'can\'t act while drawing'); assert.equal(f.vx, 0)
  const raw = 100, h0 = f.health; C.applyScaledDamage(f, raw, { attacker: t }); const drawn = h0 - f.health
  tick(f, t, 1, {}); assert(!S(f).draw, 'releasing ends the draw')
  const h1 = f.health; C.applyScaledDamage(f, raw, { attacker: t }); const normal = h1 - f.health
  assert(Math.abs(drawn / normal - 1.15) < 0.02, `+15% while drawing (${drawn} vs ${normal})`)
})
test('4. Drained (<25): grey frame set, speed ×0.85, damage ×0.8, expensive specials rejected, no flight', () => {
  const f = ben(), t = fresh('goku', 400); tick(f, t)
  const sp = f._benWalkSpeed, dm = f.damageMultiplier; assert.equal(f._skinAnim.idle.sheet, MEGAWHATT_ANIM.idle.sheet, 'charged = yellow set')
  S(f).volt = 19; tick(f, t)
  assert.equal(f._skinAnim.idle.sheet, MEGAWHATT_DRAINED_ANIM.idle.sheet, 'drained = grey set'); assert(/drained/.test(f._skinAnim.idle.sheet))
  assert(Math.abs(f._benWalkSpeed - sp * MW_DRAINED.SPEED) < 1e-9, 'speed ×0.85'); assert(Math.abs(f.damageMultiplier - dm * MW_DRAINED.DAMAGE) < 1e-9, 'damage ×0.8')
  assert.equal(special(f, t, 'B').ok, false, 'Thunder Strike (20 V) rejected at 19 V'); assert.equal(special(f, t, 'F').ok, true, 'Live Wire (15 V) affordable at 19 V')
  S(f).volt = 12; tick(f, t); assert.equal(special(f, t, 'F').ok, false, 'Live Wire (15 V) rejected at 12 V')
  assert.equal(special(f, t, null).ok, true, 'Spark Ball (10 V) still allowed at 12 V')
  S(f).volt = 19; tick(f, t); f.onGround = f.grounded = false; f.y = 150
  for (let i = 0; i < 20; i++) { physics.moveFighter(f, { w: true }, CONTROLS); A.tickBenAlienForm(f, { jump: true }, ctxOf(f, t)); tickFlightDriver(f) }
  assert(!f._flightCtl || !isFlying(f), 'no flight while Drained')
})
test('4. Surge (100): the next special cancels into a second special on hit — once — then Voltage 50', () => {
  const f = ben(), t = fresh('goku', 70); S(f).volt = 98; melee(f, t, 'light'); assert(S(f).surge, 'Surge armed at 100')
  const sb = special(f, t, null, { frames: 14 }); assert(sb.ok && sb.hits === 1)
  assert(S(f).cancelWin > 0, 'cancel window open after the clean hit')
  f._specialHeldDir = 'B'; f.attackCooldown = 0; assert(A.triggerSpecial(f, ctxOf(f, t)), 'second special cancels in'); assert.equal(S(f).surgeCancels, 1)
  assert.equal(S(f).volt, 50, 'Voltage drops to 50'); assert(!S(f).surge && !S(f).surgeCast && S(f).cancelWin === 0, 'Surge spent')
  assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'no second cancel (still in the Thunder Strike)')
  // a Surge special that whiffs: no cancel, Voltage still drops to 50
  const g = ben(), u = fresh('goku', 900); S(g).volt = 100; addVolt(g, 0); S(g).surge = true
  A.clearAbilityState(); g._specialHeldDir = 'B'; assert(A.triggerSpecial(g, ctxOf(g, u))); tick(g, u, 50); assert.equal(S(g).volt, 50); assert.equal(S(g).surgeCancels, 0)
})

// ── 5 Static / Shock ───────────────────────────────────────────────────────────────────────────────────────
test('5. Static: one pip per cast (Live Wire 2 hits = 1), no pips from blocks, expire 240f after the last', () => {
  const f = ben(), t = fresh('goku', 70)
  special(f, t, 'F', { frames: 45 }); assert.equal(S(f).stat.pips, 1, '2-hit Live Wire = 1 pip')
  special(f, t, null, { block: true }); assert.equal(S(f).stat.pips, 1, 'blocked Spark Ball: no pip')
  melee(f, t, 'heavy'); assert.equal(S(f).stat.pips, 1, 'normals: no pip')
  const left = S(f).stat.pipT; assert(left > 0 && left <= MW_STATIC.EXPIRE)
  tick(f, t, left - 1); assert.equal(S(f).stat.pips, 1, 'still marked'); tick(f, t, 1); assert.equal(S(f).stat.pips, 0, 'expired 240f after the last pip')
  const g = ben(), u = fresh('goku', 70); special(g, u, 'F', { frames: 45 }); assert.equal(S(g).stat.pipT, MW_STATIC.EXPIRE - (45 - 10), 'timer runs from the pip')
})
test('5. 3 pips → SHOCK 20 ticks, then 300f immunity (no refresh); any hit during Shock ends it', () => {
  const f = ben(), t = fresh('goku', 70); S(f).volt = 100
  special(f, t, null); special(f, t, null); S(f).volt = 100; f.energy = 100
  const st = S(f).stat; assert.equal(st.pips, 2)
  A.clearAbilityState(); f._specialHeldDir = null; f.attackCooldown = 0; f._benPowerCommit = 0; assert(A.triggerSpecial(f, ctxOf(f, t)))
  let shocked = false
  for (let i = 0; i < 20 && !shocked; i++) { tick(f, t); for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { p.x = t.x + t.w / 2; p.y = t.y + t.h / 2; C.resolveProjectileHitsMulti([p], [t]); shocked = st.shockT > 0 } }
  assert(shocked, 'third pip → Shock'); assert.equal(st.pips, 0, 'pips consumed'); assert.equal(st.shockT, MW_STATIC.SHOCK)
  assert(t.hitstun >= MW_STATIC.SHOCK - 1, 'opponent stunned')
  for (let i = 0; i < MW_STATIC.SHOCK; i++) { t.hitstun = Math.max(0, t.hitstun - 1); tick(f, t) }
  assert.equal(st.shockT, 0); assert.equal(st.immune, MW_STATIC.IMMUNE - 0, '300f immunity')
  reset(f, t); special(f, t, null); assert.equal(st.pips, 0, 'immune: no new pip'); tick(f, t, MW_STATIC.IMMUNE); assert.equal(st.immune, 0)
  // any hit during Shock ends it immediately (normal hitstun)
  const g = ben(), u = fresh('goku', 70); const s2 = S(g).stat; s2.shockT = MW_STATIC.SHOCK; u.hitstun = MW_STATIC.SHOCK
  melee(g, u, 'light'); assert.equal(s2.shockT, 0, 'hit ends the Shock'); assert.equal(s2.immune, MW_STATIC.IMMUNE)
})

// ── 6 Thunder Strike targeting ─────────────────────────────────────────────────────────────────────────────
test('6. Thunder Strike: marked → target x AT CAST (never tracks); unmarked → 260 px ahead', () => {
  const f = ben(), t = fresh('goku', 300); S(f).stat.pips = 1; S(f).stat.pipT = 200
  const tx = t.x + t.w / 2; A.clearAbilityState(); f._specialHeldDir = 'B'; assert(A.triggerSpecial(f, ctxOf(f, t)))
  assert.equal(S(f).strike.x, tx); assert(S(f).strike.marked)
  t.x += 200                                                                  // the target walks away during the marker
  let bolt = null; for (let i = 0; i < 30 && !bolt; i++) { tick(f, t); bolt = A.activeProjectiles.find(p => p.name === 'mw_thunder') }
  assert(bolt, 'bolt drops after the 24f marker'); assert.equal(bolt.x, tx, 'lands where the target WAS at cast')
  const g = ben(), u = fresh('goku', 900); A.clearAbilityState(); g._specialHeldDir = 'B'; assert(A.triggerSpecial(g, ctxOf(g, u)))
  assert.equal(S(g).strike.x, g.x + g.w / 2 + 260, 'unmarked: 260 px ahead'); assert(!S(g).strike.marked)
})

// ── 7 Flight ───────────────────────────────────────────────────────────────────────────────────────────────
test('7. Flight: hold Jump in the air → hover-fly; 90f per airtime, apex + 120 cap, never refills jumps', () => {
  const f = ben(), t = fresh('goku', 900); S(f).volt = 100; f.onGround = f.grounded = false; f.y = 250; f.vy = 0; f.jumpCount = 2; tick(f, t)
  const apex = S(f).apexY; let flying = 0, minY = f.y, took = false
  for (let i = 0; i < 200; i++) {
    physics.moveFighter(f, { w: true }, CONTROLS); A.updatePendingSpawns(); A.tickBenAlienForm(f, { jump: true, up: true }, ctxOf(f, t)); tickFlightDriver(f); physics.applyGravity(f)
    if (f._flightCtl && isFlying(f)) { flying++; took = true; minY = Math.min(minY, f.y); assert.equal(f.jumpCount, 2, 'jumps not refilled') }
    if (f.onGround) break
  }
  assert(took, 'takes off'); assert(flying <= MW_FLIGHT_MAX && flying >= MW_FLIGHT_MAX - 10, `≤ 90 flying frames (${flying})`)
  assert(minY >= apex - MW_FLIGHT_CAP - 1e-6, `no altitude past apex + 120 (${minY} vs ${apex - MW_FLIGHT_CAP})`)
  assert(Math.abs((100 - S(f).volt) - 0.6 * flying) < 1e-6, `flight drains Voltage 0.6/f (${100 - S(f).volt} over ${flying}f)`)
  const d = ben(), du = fresh('goku', 900); d.onGround = d.grounded = false; d.y = 250; tick(d, du); let df = 0
  for (let i = 0; i < 150 && !d.onGround; i++) { physics.moveFighter(d, { w: true }, CONTROLS); A.tickBenAlienForm(d, { jump: true }, ctxOf(d, du)); tickFlightDriver(d); physics.applyGravity(d); if (d._flightCtl && isFlying(d)) df++ }
  assert(S(d).volt < 25 && df < MW_FLIGHT_MAX, `from 60 V the drain reaches Drained first and flight cuts out (${df}f)`)
  // a hard hit in flight: knocked down + 40f grounded lock
  const g = ben(), u = fresh('goku', 900); g.onGround = g.grounded = false; g.y = 250; tick(g, u)
  for (let i = 0; i < 12; i++) { physics.moveFighter(g, { w: true }, CONTROLS); A.tickBenAlienForm(g, { jump: true }, ctxOf(g, u)); tickFlightDriver(g) }
  assert(isFlying(g), 'flying'); g.hitstun = 20; A.tickBenAlienForm(g, { jump: true }, ctxOf(g, u)); assert(!isFlying(g)); assert.equal(g._flightCtl.groundedLock, 40, 'grounded 40f')
})

// ── 8 Discharge ────────────────────────────────────────────────────────────────────────────────────────────
test('8. Discharge: neutral 0 Power / 30 V, 8 s cooldown; combo-breaker only after 3+ hits taken', () => {
  const f = ben(), t = fresh('goku', 70); tick(f, t)
  const e = f.energy, v = S(f).volt; assert(MEGAWHATT.blockHeavy(f), 'neutral Discharge'); assert.equal(f.energy, e, '0 Power'); assert.equal(S(f).volt, v - 30, '30 Voltage')
  assert.equal(S(f).dischargeCd, MW_DISCHARGE.COOLDOWN); f.attackCooldown = 0; assert.equal(MEGAWHATT.blockHeavy(f), false, 'cooldown')
  tick(f, t, 8); assert(A.activeProjectiles.some(p => p.name === 'mw_discharge' && p.radius === 150 && p.damage === 50), 'radial 150 px, 50 dmg')
  // combo-breaker gate: being comboed
  const g = ben(), u = fresh('goku', 70); tick(g, u)
  for (let i = 0; i < 2; i++) { benAlienAbsorb(g, { move: { damage: 10 }, attacker: u }); g.hitstun = 20 }
  assert.equal(S(g).hitsTaken, 2); tick(g, u, 1, { block: true, heavy: true }); assert.equal(S(g).breakers, 0, '2 hits: not allowed'); assert(g.hitstun > 0)
  tick(g, u, 1, {}); benAlienAbsorb(g, { move: { damage: 10 }, attacker: u }); g.hitstun = 20; assert.equal(S(g).hitsTaken, 3)
  tick(g, u, 1, { block: true, heavy: true }); assert.equal(S(g).breakers, 1, '3 hits: combo-breaker'); assert.equal(g.hitstun, 0, 'out of the combo')
  tick(g, u, 1, {}); g.hitstun = 20; S(g).hitsTaken = 5; tick(g, u, 1, { block: true, heavy: true }); assert.equal(S(g).breakers, 1, 'cooldown enforced')
})

// ── 9 Ultimate ─────────────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false } = {}) {
  A.clearAbilityState(); f.attackCooldown = 0; f.attacking = false; f.energy = 100
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }; let dimSeen = false
  for (let i = 0; i < 160; i++) {
    tick(f, t); t.isBlocking = block; if (S(f).ult && S(f).ult.phase !== 'opener') dimSeen = true
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti([p], [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) }
  }
  t.isBlocking = false
  return { ok, dealt: hp - t.health, home, dimSeen }
}
test('9. Blackout: needs ≥50 V; whiff / block = no capture (60f recovery); clean = 40+100+100 = 240 raw, lights restore', () => {
  let f = ben(), t = fresh('goku', 70); S(f).volt = 40; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'rejected below 50 V')
  f = ben(); t = fresh('goku', 70); S(f).volt = 80; let r = ult(f, t, { far: true })
  assert(r.ok); assert.equal(r.dealt, 0, 'whiff deals nothing'); assert.equal(S(f).lastUltRaw, 0, 'no cinematic'); assert.equal(S(f).volt, 0, 'all Voltage spent'); assert(!r.dimSeen, 'lights never dim')
  f = ben(); t = fresh('goku', 70); S(f).volt = 80; r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, 0, 'blocked: no cinematic')
  f = ben(); t = fresh('goku', 70); S(f).volt = 80; A.clearAbilityState(); f.energy = 100; A.triggerUltimate(f, ctxOf(f, t))
  assert.equal(f.energy, 50, 'costs 50 Power'); assert.equal(S(f).volt, 0); assert.equal(f.attackCooldown, MW_ULT.STARTUP + MW_ULT.WHIFF_RECOVERY, '12f + 60f whiff recovery')
  f = ben(); t = fresh('goku', 70); S(f).volt = 70; r = ult(f, t)
  assert.equal(S(f).lastUltRaw, MW_ULT.OPENER + 4 * MW_ULT.SWARM + MW_ULT.FINAL, '40 + 4x25 + 100'); assert.equal(S(f).lastUltRaw, 240)
  assert(r.dimSeen, 'lights dim during the cinematic'); assert.equal(S(f).ult, null, 'lights restore (cinematic over)')
  assert(r.dealt > 0); assert.equal(f.x, r.home.x, 'positions restore'); assert.equal(f.y, r.home.y); assert.equal(S(f).volt, 0, 'Voltage 0')
  assert(f.attackCooldown > 0 && f.attackCooldown <= MW_ULT.LOCKOUT, '100f recovery lockout'); console.log('   HP dealt', r.dealt)
  // swarm copies are render-only: no projectile / hitbox ever named for them, nothing extra in GAME_STATE
  assert(!A.activeProjectiles.some(p => /swarm/.test(p.name || '')))
})

// ── 10 swap / revert / rematch ─────────────────────────────────────────────────────────────────────────────
test('10. swap / revert / rematch clear all Voltage / Static / flight state', () => {
  const f = ben(), t = fresh('goku', 70); S(f).volt = 90; S(f).stat.pips = 2; S(f).stat.shockT = 10; f._flightCtl = { phase: 'flying' }
  assert(F.applyAlien(f, 'heatblast')); assert.notEqual(f.omnitrix.formState?.kind, 'megawhatt', 'swap clears'); assert.equal(f._alienFlightProfile, undefined); assert.equal(f._flightCtl, null)
  assert(F.applyAlien(f, 'megawhatt')); assert.equal(S(f).volt, 60, 'fresh Voltage 60'); assert.equal(S(f).stat.pips, 0); assert.equal(S(f).stat.shockT, 0)
  F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears'); assert.equal(f._alienFlightProfile, undefined); assert.equal(f.damageMultiplier, 3.4)   // human damage after revert = the 2026-11-24 Ben human buff ×3.4
  const g = ben(); assert.equal(S(g).volt, 60); assert.equal(S(g).stat.immune, 0, 'rematch: fresh state')
})

// ── 11 Vow + determinism + registry ────────────────────────────────────────────────────────────────────────
test('11. registry: Megawhatt READY in the first placeholder slot (3); hurtbox matches the small sprite', () => {
  const d = getAlienDefinition('megawhatt'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 3)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  { const _ready = getAvailableAlienKeys(false); assert(_ready.length >= BEN10_SLOT_COUNT, 'PICK FIVE: at least one READY alien per dial slot (count read from the registry)'); assert.deepEqual(_ready.slice(0, 5), ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8']) }
  assert.deepEqual(buildLoadout(5).map(a => a.id), ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8'])
  const f = ben(); assert.equal(f.maxJumps, 2, 'shared double jump'); assert.equal(f.activeAlienName, 'Megawhatt')
  assert(f.h < 110 && f.w < 60, `small hurtbox (${f.w}x${f.h})`); assert.equal(f.h, 72)
  assert.equal(f.health, 2185, 'shared health pool (human HP carries over) (950 × the 2026-11-24 Ben HP buff 2.30)')
})
test('11. Vow pick includes Megawhatt; same seed → same pick', () => {
  const mk = () => { const f = ben(null); F.setupBen10(f, LOADOUT); return f }
  const a = mk(), b = mk(); const picks = new Set()
  for (let frame = 0; frame < 300; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); picks.add(a.omnitrix.aliens[x]) }
  assert(picks.has('megawhatt'), 'Megawhatt is reachable by the Vow pick')
})
test('11. same-seed determinism: an identical scripted Megawhatt sequence yields identical GAME_STATE', () => {
  const run = () => {
    const f = ben(), t = fresh('goku', 70); melee(f, t, 'light'); special(f, t, null); special(f, t, 'F', { frames: 45 }); special(f, t, 'B'); tick(f, t, 100)
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast: Spark Ball in flight, Thunder marker, Live Wire, flight', () => {
  const f = ben(), t = fresh('goku', 900); A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t))); tick(f, t, 14)
  assert(S(f).spark, 'spark tracked'); assert.doesNotThrow(() => JSON.stringify(f.omnitrix)); assert.doesNotThrow(() => JSON.stringify(S(f)))
  f.attackCooldown = 0; f._benPowerCommit = 0; f._specialHeldDir = 'B'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 5); assert(S(f).strike); JSON.stringify(S(f))
  const bounces = [], ys = []; for (let i = 0; i < 90 && S(f).spark; i++) { tick(f, t); C.updateProjectiles(A.activeProjectiles, 3200); const p = A.activeProjectiles.find(q => q.name === 'mw_spark'); if (p) ys.push(p.y); bounces.push(S(f).spark?.bounces ?? -1) }
  assert(Math.max(...ys) <= 410 - 14 + 1e-6, 'never sinks below the floor')
  assert(bounces.includes(2), 'Spark Ball bounces twice'); assert(!S(f).spark, 'then it is gone')
})
test('no Math.random / gameRng in megawhatt.js / megawhattAssets.js', () => {
  for (const file of ['../megawhatt.js', '../megawhattAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`MEGAWHATT: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
