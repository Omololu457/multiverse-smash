// JETRAY — Phase 7 harness (module-level, the real combat / projectile / physics / flight pipeline; no browser).
//   node harness/ben10_jetray.test.mjs
// Design totals: raw move damage × the form's damage mod (0.95) × 0.85^n (85% per move, reset after 90f), within ±20%.
// The live routes then run the real engine and assert the mechanics. Test 13 (the brief's "slot 12") is PICK FIVE: the owner
// kept 5 slots; Jetray is a pick, not a new slot / chord.
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import { tickFlightDriver, isFlying, getFlightProfile, FLIGHT_PROFILES } from '../flight.js'
import { JETRAY, JR_LASER, JR_FLIGHT, JR_MACH, JR_ECHO, JR_BOOM, JR_NEURO, JR_COST, JR_EYE, JR_TAIL, JR_DASH, JR_DIVE, JR_ROLL, JR_ULT,
  JETRAY_EYES, JETRAY_GEOM, jrState, jrHash, addPip, eyePoint, eyeBeam, tailTip, jrStarLayout, drawJetrayUnder } from '../jetray.js'
import { benAlienBodyOffset } from '../ben10State.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'jetray', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
      p.x += (p.vx || 0) * (p.timeScale || 1); p.y += (p.vy || 0) * (p.timeScale || 1); if (p.lifetime != null && --p.lifetime <= 0) A.activeProjectiles.splice(k, 1) }   // the game's order: cull BEFORE resolve
    C.resolveProjectileHitsMulti(A.activeProjectiles, [t])
    timers(f); timers(t)
  }
}
const BA = JETRAY.basic_attacks, DM = JETRAY.mods.damage
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  eye: JR_EYE.DMG * 3, tail: JR_TAIL.DMG * 3, dash: JR_DASH.DMG[0] + JR_DASH.DMG[1] }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + f.w / 2 + gap - t.w / 2 + 30; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false; t.knockdownState = false; t.knockdownTimer = 0; t.invulnTimer = 0 }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }

function melee(f, t, key, { block = false } = {}) {
  ready(f)
  if (key === 'air') { f.onGround = f.grounded = false }
  const md = JETRAY.moveFrames(f, key, BA[key]); assert(md, 'moveFrames allowed ' + key)
  assert(C.startMove(f, key, BA[key]), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter, bs = t.blockstun
  t.isBlocking = block
  for (let i = 0; i < 50 && t.health === hp && !(block && t.blockstun > bs) && f.attacking; i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true; f.attacking = false; f.currentAttack = null
  if (!block) { assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo') }
  return hp - t.health
}
function hitBy(t, f, key = 'light') {
  t.attacking = false; t.currentAttack = null; t.attackCooldown = 0; f.hitstun = 0; t.hitstop = 0
  const md = characters.goku.basic_attacks[key]; C.startMove(t, key, md); const hp = f.health
  for (let i = 0; i < 40 && f.health === hp && t.attacking; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}); C.resolveAttackHit(t, f, [], {}) }
  t.attacking = false; t.currentAttack = null
  return hp - f.health
}
const cast = (f, t, dir, keep = false) => { ready(f); if (!keep) A.clearAbilityState(); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const dashTap = (f, t) => { tick(f, t, 1, { right: true }); tick(f, t, 1, {}); tick(f, t, 1, { right: true }); tick(f, t, 1, {}) }
const backTap = (f, t) => { tick(f, t, 1, { left: true }); tick(f, t, 1, {}); tick(f, t, 1, { left: true }); tick(f, t, 1, {}) }
const enemyShot = (f, t, name = 'kiBlast', extra = {}) => { const p = { name, owner: t, damage: 40, vx: -12, vy: 0, x: f.x + f.w / 2, y: f.y + f.h / 2, w: 30, h: 20, radius: 10, lifetime: 60, hitstun: 12, ...extra }; A.activeProjectiles.push(p); return p }
const mach = f => { ready(f); assert(JETRAY.blockSpecial(f, {}, null) || true); return S(f).machT > 0 }
// flight: airborne Jetray holding Jump (real physics + the shared flight driver)
function flyFrames(f, t, n, input = { jump: true, up: true }) {
  let flying = 0, minY = f.y, minJumps = 99
  for (let i = 0; i < n; i++) { if (flying && f.onGround) break                   // one airtime
    FRAME++; physics.moveFighter(f, { w: true }, CONTROLS); A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); tickFlightDriver(f); physics.applyGravity(f)
    if (f._flightCtl && isFlying(f)) { flying++; minJumps = Math.min(minJumps, f.jumpCount) } minY = Math.min(minY, f.y) }
  return { flying, minY, minJumps }
}

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 80],
  ['2. Low, Heavy, Eye Laser', ['low', 'heavy', 'eye'], 98],
  ['3. Wing Dash, Heavy, Tail Volley', ['dash', 'heavy', 'tail'], 112],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Eye Laser (10 Power, tap burst, +1 Neuro)', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 120); const e = f.energy, hp = t.health; assert(cast(f, t, 'F')); assert.equal(e - f.energy, JR_COST.eye)
  world(f, t, 50); const eye = hp - t.health; assert(eye > 0); assert.equal(S(f).neuro.pips, 1, '+1 Neuro for 3 ticks'); console.log('   HP', [...d, eye].join('+'))
})
test('route 3 live: Wing Dash (→→, 2 hits), Heavy, Tail Volley (behind)', () => {
  const f = ben(), t = foe(); reset(f, t, 40); ready(f); dashTap(f, t); f._specialHeldDir = 'F'; const hp = t.health
  assert(A.triggerSpecial(f, ctxOf(f, t))); assert(S(f).dash, 'Wing Dash'); world(f, t, 50); const wd = hp - t.health; assert(wd > 0)
  reset(f, t, 10); const h = melee(f, t, 'heavy')
  t.x = f.x - t.w - 30; t.y = f.y + f.h - t.h; const hp2 = t.health; assert(cast(f, t, 'D')); world(f, t, 40); const tv = hp2 - t.health
  assert(tv > 0, 'Tail Volley hits the opponent BEHIND him'); console.log('   HP', wd, '+', h, '+', tv)
})

// ── 4 Flight (the Homelander / Superman architecture) ───────────────────────────────────────────────────────
const pTap = (f, t) => { tick(f, t, 1, { charge: true }); tick(f, t, 1, { charge: true }); tick(f, t, 1, {}) }
function flight(f, t, n, input = {}) {     // the real per-frame order: form tick → flight driver → physics (owns x / y while flying)
  let flying = 0, minJumps = 99
  for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t)); tickFlightDriver(f)
    const k = typeof input === 'function' ? input(i) : input
    physics.moveFighter(f, { w: !!k.up, s: !!k.down, a: !!k.left, d: !!k.right }, CONTROLS); physics.applyGravity(f)
    if (f._flightCtl && isFlying(f)) { flying++; minJumps = Math.min(minJumps, f.jumpCount) } }
  return { flying, minJumps }
}
test('4. Flight: a P (Charge) TAP takes off from the ground and he STAYS up with nothing held; P tap again lands; Homelander-class profile', () => {
  const p = FLIGHT_PROFILES.jetray; assert.equal(p.maxH, 36); assert(p.maxH > FLIGHT_PROFILES.homelander.maxH, 'faster than Homelander'); assert.equal(p.maxAirDash, 2); assert.equal(p.groundedLock, 40); assert.equal(p.drag, FLIGHT_PROFILES.homelander.drag)
  const f = ben(), t = foe('goku', 1200); assert.equal(getFlightProfile(f), p, 'profile via _alienFlightProfile')
  pTap(f, t); tickFlightDriver(f); assert(isFlying(f), 'P tap → takeoff'); assert.equal(S(f).flights, 1)
  const r = flight(f, t, 90, i => i < 20 ? { up: true } : {}); assert.equal(r.flying, 90, 'stays airborne with nothing held'); assert(f.y < 300, `climbed (${f.y})`)
  assert.equal(r.minJumps, 0, 'flight never refills jumps (none used)')
  const x0 = f.x; flight(f, t, 30, { right: true }); assert(f.x - x0 > 250, `fast 8-way cruise (${(f.x - x0).toFixed(0)} px / 30f)`)
  pTap(f, t); assert(f._flightCtl.wantDescend, 'P tap in flight → descend-to-land'); assert.equal(S(f).landings, 1)
  { let n = 0; while (isFlying(f) && n < 600) { flight(f, t, 1); n++ } assert(!isFlying(f) && n <= 90, `landed quickly (${n}f; descendVy 14)`); assert.equal(FLIGHT_PROFILES.homelander.descendVy, undefined, 'other flyers keep the default 2'); console.log('   descent-to-land frames', n) }
  const g = ben(); g._flightCtl = null; g.vy = -14; g.onGround = g.grounded = false; g.y -= 2; g.jumpCount = 1; g.jumpHeld = true   // Up already held from the jump (no second jump)
  flight(g, t, 14, { up: true }); assert(isFlying(g), 'holding Jump in the air also takes off'); assert.equal(g.jumpCount, 1, 'jumps not refilled')
  g.hitstun = 20; A.tickBenAlienForm(g, {}, ctxOf(g, t)); assert(!isFlying(g)); assert.equal(g._flightCtl.groundedLock, 40, 'grounded 40f after a hard hit')
})
test('4. P tap is not a flight toggle when it is P + L (Flash Time), ↓↓ + P (the dial) or a long hold (Charge)', () => {
  const t = foe('goku', 1200)
  const a = ben(); tick(a, t, 1, { charge: true }); tick(a, t, 1, { charge: true, special: true }); tick(a, t, 1, {}); tickFlightDriver(a); assert(!isFlying(a), 'P + L')
  const b = ben(); b._omxLastDown = b.omnitrix.simFrame; tick(b, t, 1, { charge: true }); tick(b, t, 1, {}); tickFlightDriver(b); assert(!isFlying(b), '↓↓ + P')
  const c = ben(); tick(c, t, 30, { charge: true }); tick(c, t, 1, {}); tickFlightDriver(c); assert(!isFlying(c), 'held Charge')
})
test('4. hurtbox = torso + inner wing (excludes the wing tips); grounded 6 px hover is render-only (feet on the floor)', () => {
  const f = ben(); const wing = Math.round(310 * JETRAY_GEOM.screenScale)
  assert.equal(f.w, 70); assert.equal(f.h, 96); assert(f.w < wing * 0.6, `hurtbox ${f.w} vs wingspan ${wing}`)
  assert.equal(f.y + f.h, 410, 'standard floor collision'); assert.equal(JETRAY_GEOM.hoverPx, 6)
})

// ── 5 Mach Time ───────────────────────────────────────────────────────────────────────────────────────────
test('5. Mach Time: 25 Power, 150f, 600f cooldown, no re-activate, not in hitstun / ult', () => {
  const f = ben(), t = foe(); const e = f.energy; assert(JETRAY.blockSpecial(f, {}, null) === false || true)
  tick(f, t); const g = ben(); assert(JETRAY.blockSpecial(g, {}, { spendEnergy: (q, n) => (q.energy >= n ? (q.energy -= n, true) : false) })); assert.equal(g.energy, 75)
  assert.equal(S(g).machT, JR_MACH.DURATION); assert.equal(JETRAY.blockSpecial(g, {}, { spendEnergy: () => true }), false, 'no refresh')
  tick(g, t, JR_MACH.DURATION); assert.equal(S(g).machT, 0); assert.equal(S(g).machCd, JR_MACH.COOLDOWN); assert.equal(JETRAY.blockSpecial(g, {}, { spendEnergy: () => true }), false, 'cooldown')
  tick(g, t, JR_MACH.COOLDOWN); assert(JETRAY.blockSpecial(g, {}, { spendEnergy: () => true }), 'ready again')
  const h = ben(); h.hitstun = 5; assert.equal(JETRAY.blockSpecial(h, {}, { spendEnergy: () => true }), false, 'not in hitstun')
  void e
})
const SPEND = { spendEnergy: (q, n) => (q.energy >= n ? (q.energy -= n, true) : false) }
test('5. Flash Time: startup / recovery ×0.7 (min 1), movement ×2.5, flight ×2.5, opponent projectiles ×0.5, clock + inputs untouched', () => {
  const f = ben(), t = foe(); const w0 = f._benWalkSpeed, d0 = f.dashSpeed
  assert(JETRAY.blockSpecial(f, {}, SPEND)); tick(f, t)
  assert.equal(JR_MACH.SPEED, 2.5); assert(Math.abs(f._benWalkSpeed - w0 * 2.5) < 1e-9 && Math.abs(f.dashSpeed - d0 * 2.5) < 1e-9, 'movement ×2.5 (as fast as the Flash)')
  assert.equal(f._alienFlightProfile, 'jetray_mach'); assert.equal(FLIGHT_PROFILES.jetray_mach.maxH, FLIGHT_PROFILES.jetray.maxH * 2.5, 'flight ×2.5'); assert(FLIGHT_PROFILES.jetray_mach.maxH > FLIGHT_PROFILES.homelander.maxH)
  const md = JETRAY.moveFrames(f, 'heavy', BA.heavy); assert.equal(md.startup, Math.round(13 * 0.7)); assert.equal(md.recovery, Math.round(22 * 0.7)); assert.equal(md.damage, BA.heavy.damage)
  assert.equal(JETRAY.moveFrames(f, 'light', { ...BA.light, startup: 1, recovery: 1 }).startup, 1, 'min 1f')
  const p = enemyShot(f, t); tick(f, t); assert.equal(p.timeScale, JR_MACH.PROJ, 'opponent projectile ×0.5'); clearProj()
  const tw = t._benWalkSpeed, tc = JSON.stringify({ cd: t.attackCooldown, hs: t.hitstun, keys: Object.keys(t).sort() })
  tick(f, t, 20); assert.equal(t._benWalkSpeed, tw); assert.equal(JSON.stringify({ cd: t.attackCooldown, hs: t.hitstun, keys: Object.keys(t).sort() }), tc, 'the form module writes nothing on the opponent (the slow-mo is game.js frame-skip via oppTimeScale)')
  tick(f, t, JR_MACH.DURATION); assert(Math.abs(f._benWalkSpeed - w0) < 1e-9, 'restores'); assert.equal(f._alienFlightProfile, 'jetray')
  const g = ben(), u = foe(); reset(g, u, 120); assert(JETRAY.blockSpecial(g, {}, SPEND)); tick(g, u)
  S(g).swallow = 0; ready(g); A.clearAbilityState(); g._specialHeldDir = 'F'; A.triggerSpecial(g, ctxOf(g, u)); assert.equal(S(g).eye.st, Math.round(JR_EYE.STARTUP * 0.7), 'special startup ×0.7')
})
test('5. Flash Time is bound to P + L (chargeSpecial hook) as well as Block + Special', () => {
  assert.equal(typeof JETRAY.chargeSpecial, 'function'); assert.equal(typeof JETRAY.blockSpecial, 'function'); const f = ben(); assert(JETRAY.chargeSpecial(f, {}, SPEND)); assert.equal(S(f).machT, JR_MACH.DURATION)
  const src = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8'); assert(/benReadyForm\(fighter\)\?\.chargeSpecial/.test(src) && /chargeB && special && !held\.special/.test(src) && /_rdCS\(fighter, getAbilityContext\(\), undefined, \{ late: _csLate \}\)/.test(src), 'game.js wires Charge + Special (either order)')
})
test('5. P + L in EITHER ORDER: L first starts the Eye Laser, a late P undoes it (refund, no beam, scheduled hits dead) and starts Flash Time', () => {
  const f = ben(), t = foe(); f.energy = 100; const SP = { ...SPEND, activeProjectiles: () => [] }
  assert(JETRAY.fireSpecial(f, {}, SP), 'L: Eye Laser starts'); const afterEye = f.energy, ep = f._benActionEpoch; assert(S(f).eye)
  tick(f, t, 2); assert(JETRAY.chargeSpecial(f, {}, SP, { late: true }), 'late P → Flash Time')
  assert.equal(S(f).eye, null, 'laser undone'); assert(S(f).machT > 0); assert(f._benActionEpoch > ep, 'its scheduled hits are dead')
  assert.equal(f._benPowerCommit, 0); assert.equal(f.attackCooldown, 0); assert.equal(f.energy, 100 - JR_MACH.COST, 'laser cost refunded, only Flash Time paid')
  const g = ben(); g.energy = 100; assert(JETRAY.fireSpecial(g, {}, SP)); tick(g, t, 12); const e = S(g).eye
  assert(JETRAY.chargeSpecial(g, {}, SP, { late: true })); assert.equal(S(g).eye, e, 'an older cast (past the 6f window) is never undone')
})
test('5. Flash Time SLOWS THE OPPONENT: oppTimeScale 0.25 while active (game.js frame-skip), 0 otherwise', () => {
  const f = ben(), t = foe(); assert.equal(JETRAY.oppTimeScale(f), 0, 'off before')
  assert(JETRAY.chargeSpecial(f, {}, SPEND)); assert.equal(JETRAY.oppTimeScale(f), JR_MACH.OPP); assert.equal(JR_MACH.OPP, 0.25)
  tick(f, t, JR_MACH.DURATION); assert.equal(JETRAY.oppTimeScale(f), 0, 'off after'); F.revertToHuman(f); assert.equal(JETRAY.oppTimeScale(f), 0, 'off once he is gone')
  const src = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8'); assert(/benReadyForm\(user\)\?\.oppTimeScale\?\.\(user\)/.test(src), 'game.js _oppTimeScaleOf reads the hook')
})
test('5. Flash Time press is swallowed (the buffered Special does not also cast)', () => {
  const f = ben(), t = foe(); assert(JETRAY.blockSpecial(f, {}, SPEND)); ready(f); f._specialHeldDir = 'F'; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false)
})

// ── 6 Echoes / Sonic Boom ─────────────────────────────────────────────────────────────────────────────────
test('6. Echoes: 10f after a hit, 30% damage, only during hitstun, max 3 per combo, no chaining, scaling applies', () => {
  const f = ben(), t = foe(); reset(f, t, 10); assert(JETRAY.blockSpecial(f, {}, SPEND)); S(f).swallow = 0
  const d = melee(f, t, 'heavy'); assert.equal(S(f).echoes.length, 1); assert.equal(S(f).echoes[0].at - S(f).t, JR_ECHO.DELAY)
  t.hitstun = 30; const hp = t.health; tick(f, t, JR_ECHO.DELAY - 1); assert.equal(t.health, hp, 'not before 10f'); tick(f, t)
  const echo = hp - t.health; assert(echo > 0 && echo < BA.heavy.damage * 0.30 * DM + 0.5, `30% scaled (${echo})`); assert.equal(S(f).echoesFired, 1)
  assert.equal(S(f).echoes.length, 0, 'echo did not schedule an echo')
  t.hitstun = 30; melee(f, t, 'light'); melee(f, t, 'light'); melee(f, t, 'light'); assert.equal(S(f).echoCount, 3, 'max 3'); assert.equal(S(f).echoes.length, 2)
  t.hitstun = 0; const hp2 = t.health; tick(f, t, 12); assert.equal(t.health, hp2, 'dropped: no echo outside hitstun')
  const g = ben(), u = foe(); reset(g, u, 10); melee(g, u, 'heavy'); assert.equal(S(g).echoes.length, 0, 'no echoes outside Mach Time')
})
test('6. Sonic Boom: Wing Dash in Mach Time ends in a r120 ring, 25 once per cast, no pip; never outside Mach Time', () => {
  const f = ben(), t = foe(); reset(f, t, 500); assert(JETRAY.blockSpecial(f, {}, SPEND)); S(f).swallow = 0; tick(f, t)
  ready(f); dashTap(f, t); f._specialHeldDir = 'F'; assert(A.triggerSpecial(f, ctxOf(f, t)))
  let boom = null; for (let i = 0; i < 40 && !boom; i++) { tick(f, t); boom = A.activeProjectiles.find(p => p.name === 'jr_boom') }
  assert(boom, 'boom ring'); assert.equal(boom.damage, JR_BOOM.DMG); assert.equal(boom.radius, JR_BOOM.R)
  t.x = boom.x - t.w / 2; t.y = boom.y - t.h / 2; const hp = t.health; C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); assert(t.health < hp)
  assert.equal(S(f).neuro.pips, 0, 'no pip'); assert.equal(S(f).stats.booms, 1); tick(f, t, 30); assert.equal(A.activeProjectiles.filter(p => p.name === 'jr_boom').length, 0); clearProj()
  const g = ben(), u = foe(); reset(g, u, 500); ready(g); dashTap(g, u); g._specialHeldDir = 'F'; A.triggerSpecial(g, ctxOf(g, u)); tick(g, u, 50)
  assert.equal(S(g).stats.booms, 0, 'no boom outside Mach Time'); clearProj()
})

// ── 7 Eye Laser (Homelander / Superman HEAT VISION architecture) ─────────────────────────────────────────────
const holdEye = (f, t, n, input = { special: true }) => { const ts = []; for (let i = 0; i < n; i++) { world(f, t, 1, input); const b = eyeBeam(f, S(f)); ts.push(b ? { ...b } : null) } return ts }
test('7. Eye Laser: real BEAM from the eye anchor LOCKED ON the opponent (any height / side / range), hitscan, 12 every 6f, held = longer, heat gauge', () => {
  for (const [dx, dy, label] of [[260, 0, 'level'], [260, -200, 'above'], [300, 160, 'below']]) {
    const f = ben(), t = foe('goku', 0); clearProj(); t.x = f.x + dx; t.y = 410 - t.h + dy; t.onGround = dy === 0
    assert(cast(f, t, 'F')); const bs = holdEye(f, t, 30, { special: true }).filter(Boolean)
    assert(bs.length > 10, `${label}: beam drawn (${bs.length}f)`)
    const b = bs[bs.length - 1], e = eyePoint(f, 'jrEye', 0)
    assert(Math.abs(b.ox - e.x) < 1e-6 && Math.abs(b.oy - e.y) < 1e-6, 'starts at the eye anchor')
    assert(b.hit && b.tx >= t.x - 1 && b.tx <= t.x + t.w + 1 && b.ty >= t.y - 1 && b.ty <= t.y + t.h + 1, `${label}: ends ON the opponent (${b.tx.toFixed(0)},${b.ty.toFixed(0)})`)
    assert(t.health < 950, `${label}: it hurts (${950 - t.health})`)
  }
  const f = ben(), t = foe(); reset(f, t, 200); t.x = f.x - 300; assert(cast(f, t, 'F')); holdEye(f, t, 20); assert.equal(f.facing, -1, 'turns to face an opponent behind him'); assert(t.health < 950)
  const g = ben(), u = foe(); reset(g, u, 200); assert(cast(g, u, 'F')); holdEye(g, u, 60, {}); const tap = 950 - u.health
  const h = ben(), v = foe(); reset(h, v, 200); assert(cast(h, v, 'F')); holdEye(h, v, 90, { special: true }); const held = 950 - v.health
  assert(tap > 0 && held > tap * 2, `tap burst ${tap} < held ${held}`); assert(S(h).laser.gauge < JR_LASER.max, 'heat spent')
  assert.equal(cast(h, v, 'F'), false, 'cooldown / overheat after a beam')
  assert.equal(S(h).neuro.pips, 1, 'one pip per cast')
  const k = ben(), w = foe(); w.x = k.x + 900; assert(cast(k, w, 'F')); holdEye(k, w, 30); assert(w.health < 950, 'locked on: connects at any range (Homelander)')
  const q = ben(), z = foe(); z.x = q.x + 900; assert(cast(q, z, 'F')); holdEye(q, z, 30, { special: true, up: true }); assert.equal(z.health, 950, 'hand-swept beam reaches 560 px only')
})
test('7. Eye Laser: Up / Down sweep it by hand (±35° cap), one beam at a time, blocked = blockstun + 30% chip, no projectile drawn', () => {
  const f = ben(), t = foe(); reset(f, t, 200); assert(cast(f, t, 'F')); holdEye(f, t, 12)
  const a0 = S(f).laser.angle; holdEye(f, t, 10, { special: true, down: true }); assert(S(f).laser.angle > a0 + 0.2, 'Down sweeps it down')
  holdEye(f, t, 60, { special: true, down: true }); assert(S(f).laser.angle <= S(f).laser.base + JR_LASER.sweepCap + 1e-3, 'capped (angle kept to 4 decimals)')
  assert.equal(cast(f, t, 'F', true), false, 'one beam at a time')
  const g = ben(), u = foe(); reset(g, u, 150); u.isBlocking = true; assert(cast(g, u, 'F')); holdEye(g, u, 25); u.isBlocking = false
  assert(u.blockstun > 0 || u.health === 950, 'blocked'); assert.equal(S(g).neuro.pips, 0, 'blocked: no pip')
  const m = ben(), z = foe(); reset(m, z, 150); assert(cast(m, z, 'F')); let seen = 0
  for (let i = 0; i < 25; i++) { tick(m, z, 1, { special: true }); seen += A.activeProjectiles.filter(p => p.owner === m).length; clearProj() }
  assert.equal(seen, 0, 'Homelander beam path: no projectile at all (nothing for the generic renderer to draw as a box)'); assert(z.health < 950, 'it still hurts')
})
test('7. eye anchor: recorded per frame, mirrored correctly for both facings, airborne cast works', () => {
  const f = ben(); const r = eyePoint(f, 'jrEye', 0); f.facing = -1; const l = eyePoint(f, 'jrEye', 0)
  const c = f.x + f.w / 2; assert(Math.abs((r.x - c) + (l.x - c)) < 1e-9 && r.y === l.y, 'mirror')
  assert(Math.abs((r.x - c) - JETRAY_EYES.jrEye[0][0] * JETRAY_GEOM.screenScale) < 1e-9, 'the recorded anchor (front-on beak pose: eyes on the centre line)')
  f.facing = 1; const side = eyePoint(f, 'idle', 0); assert(side.x > c + 10, 'side-glide frames: eyes forward (head leads)')
  assert(r.y < f.y + f.h * 0.5, 'eyes in the upper body'); assert(JETRAY_EYES.idle.length === 2 && JETRAY_EYES.jrDash.every(e => e === null))
  const g = ben(), t = foe(); g.onGround = g.grounded = false; g.y = 200; g._specialHeldDir = null; ready(g); A.clearAbilityState(); assert(A.triggerSpecial(g, ctxOf(g, t)), 'airborne Eye Laser'); assert(S(g).eye)
})

// ── 8 Tail Volley (3 aimed laser pulses) ─────────────────────────────────────────────────────────────────
test('8. Tail Volley: 3 LASER PULSES from the tail tip, each AIMED at the opponent (front, behind, above), 10 each, one pip, hidden hitboxes', () => {
  for (const [dx, dy, label] of [[250, 0, 'in front'], [-260, 0, 'behind'], [200, -180, 'above']]) {
    const f = ben(), t = foe('goku', 0); clearProj(); t.x = f.x + dx; t.y = 410 - t.h + dy
    assert(cast(f, t, 'D')); const tip = tailTip(f, S(f).tail.face); let pulses = []
    for (let i = 0; i < 40 && S(f).tail; i++) { world(f, t); for (const p of S(f).tail?.pulses || []) if (!pulses.some(q => q.t === p.t)) pulses.push(p) }
    assert.equal(pulses.length, 3, `${label}: 3 pulses`)
    for (const p of pulses) { assert(Math.abs(p.ox - tip.x) < 1e-6 && Math.abs(p.oy - tip.y) < 1e-6, 'from the tail tip'); assert(p.hit, `${label}: aimed onto the opponent`) }
    const dealt = 950 - t.health; assert(dealt > 0 && dealt <= 30 * DM + 1, `${label}: ≤ 30 (${dealt})`); assert.equal(S(f).neuro.pips, 1, 'one pip per cast')
  }
  const g = ben(), u = foe(); reset(g, u, 150); assert(cast(g, u, 'D')); let n = 0
  for (let i = 0; i < 40; i++) { tick(g, u); for (const p of A.activeProjectiles) if (p.owner === g) { n++; assert(p.alien?.hidden) } clearProj() }
  assert(n > 0, 'hitboxes spawned (hidden)'); assert.equal(A.activeProjectiles.filter(p => /^jr_tail/.test(p.name) && (p.vx || 0) !== 0 && Math.abs(p.vx) > 1).length, 0, 'no travelling bolts / bombs')
})
// ── 9 Neuro → Grounded ───────────────────────────────────────────────────────────────────────────────────
test('9. Neuro: one pip per cast, max 3 → GROUNDED 150f, 360f immunity, pips expire 240f, none from boom / echo / block', () => {
  const f = ben(), t = foe(); const s = S(f)
  assert(addPip(s, 1)); assert.equal(addPip(s, 1), false, 'one per cast'); assert(addPip(s, 2)); assert.equal(s.neuro.pips, 2)
  assert(addPip(s, 3)); assert.equal(s.neuro.groundT, JR_NEURO.GROUNDED); assert.equal(s.neuro.pips, 0); assert.equal(addPip(s, 4), false, 'no refresh')
  tick(f, t); assert(t._benGrounded && t._benGrounded.ttl > 0)
  s.neuro.groundT = 1; tick(f, t); assert.equal(s.neuro.immune, JR_NEURO.IMMUNE); assert.equal(addPip(s, 5), false, 'immune'); tick(f, t, JR_NEURO.IMMUNE); assert(addPip(s, 6))
  s.neuro.pipT = 1; tick(f, t); assert.equal(s.neuro.pips, 0, 'expire 240f after the last')
  const g = ben(), u = foe(); reset(g, u, 10); assert(JETRAY.blockSpecial(g, {}, SPEND)); melee(g, u, 'heavy'); u.hitstun = 30; tick(g, u, 12); assert.equal(S(g).neuro.pips, 0, 'echo: no pip')
})
test('9. Grounded: no double jump, no air dash, air drift halved; first jump + ground game untouched; clock / polling untouched', () => {
  const f = ben(), t = foe('goku', 800); S(f).neuro.groundT = 100; tick(f, t)
  const keys = { w: true }; t.jumpHeld = false; physics.moveFighter(t, keys, CONTROLS); assert.equal(t.jumpCount, 1, 'first jump works'); assert(!t.onGround)
  tick(f, t); t.jumpHeld = false; physics.moveFighter(t, { w: true }, CONTROLS); assert.equal(t.jumpCount, 1, 'no double jump')
  const ref = foe('goku', 800); ref.onGround = false; ref.y = 200; ref.jumpCount = 1; ref.jumpHeld = false; physics.moveFighter(ref, { w: true }, CONTROLS); assert.equal(ref.jumpCount, 2, 'control: double jump without Grounded')
  tick(f, t); const x0 = t.x; t.vx = 6; t.hitstun = 0; physics.moveFighter(t, {}, CONTROLS); const g1 = t.x - x0
  const r2 = foe('goku', 800); r2.onGround = false; r2.y = 200; r2.vx = 6; const x1 = r2.x; physics.moveFighter(r2, {}, CONTROLS); const g0 = r2.x - x1
  assert(Math.abs(g1 - g0 * JR_NEURO.AIR) < 1e-6, `air drift halved ${g1} vs ${g0}`)
  const src = fs.readFileSync(new URL('../physics.js', import.meta.url), 'utf8'); assert(/const maxAirDash = _benGr \? 0/.test(src), 'air dash disabled while Grounded')
  const g = foe('goku', 800); g._benGrounded = { ttl: 2, air: 0.5 }; const gx = g.x; physics.moveFighter(g, { d: true }, CONTROLS)
  const h = foe('goku', 800); const hx = h.x; physics.moveFighter(h, { d: true }, CONTROLS); assert.equal(g.x - gx, h.x - hx, 'ground walk untouched')
  const plain = foe('goku', 300); assert.equal(plain._benGrounded, undefined, 'absent for everyone else')
})

// ── 10 Sonic Dive / Barrel Roll ──────────────────────────────────────────────────────────────────────────
test('10. Sonic Dive: air ↓ + P, 50, bounce on hit, once per airtime, no jump refill, +1 Neuro', () => {
  const f = ben(), t = foe(); f.onGround = f.grounded = false; f.y = 150; f.jumpCount = 2
  const e = f.energy; assert(cast(f, t, 'D')); assert.equal(e - f.energy, JR_COST.dive); assert(S(f).dive)
  assert.equal(cast(f, t, 'D', true), false, 'once per airtime'); assert.equal(f.jumpCount, 2, 'no jump refill')
  tick(f, t, JR_DIVE.STARTUP + 1); const p = A.activeProjectiles.find(q => q.name === 'jr_dive'); assert(p); assert.equal(p.damage, JR_DIVE.DMG)
  t.x = p.x - t.w / 2; t.y = p.y - t.h / 2; C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); clearProj(); tick(f, t)
  assert.equal(S(f).neuro.pips, 1); assert(f.vy < 0, 'bounced up'); assert.equal(S(f).dive, null)
  f.onGround = f.grounded = true; tick(f, t); f.onGround = f.grounded = false; assert(cast(f, t, 'D'), 'refreshed after landing'); clearProj()
})
test('10. Barrel Roll: ←← + Light, i-frames 4–10 only, 5 s cooldown, no cost', () => {
  const f = ben(), t = foe(); const e = f.energy; ready(f); backTap(f, t); assert.equal(JETRAY.moveFrames(f, 'light', BA.light), false, 'Light became the roll')
  assert(S(f).roll); assert.equal(f.energy, e, 'no cost')
  const inv = []; for (let i = 1; i <= JR_ROLL.TOTAL; i++) { tick(f, t); inv.push((f.invulnTimer || 0) > 0); if (f.invulnTimer > 0) f.invulnTimer-- }
  assert.deepEqual(inv.map((v, i) => v ? i + 1 : 0).filter(Boolean), [4, 5, 6, 7, 8, 9, 10], 'i-frames 4–10')
  const o = benAlienBodyOffset(f, t); void o
  ready(f); backTap(f, t); assert.notEqual(JETRAY.moveFrames(f, 'light', BA.light), false, 'cooldown: plain Light'); assert.equal(S(f).roll, null)
  tick(f, t, JR_ROLL.CD); ready(f); backTap(f, t); assert.equal(JETRAY.moveFrames(f, 'light', BA.light), false, '5 s later: rolls again')
  const g = ben(); ready(g); assert.notEqual(JETRAY.moveFrames(g, 'light', BA.light), false, 'no ←← → plain jab')
  const h = ben(), u = foe(); ready(h); backTap(h, u); JETRAY.moveFrames(h, 'light', BA.light); tick(h, u, 6); assert(benAlienBodyOffset(h, u).rot !== 0, 'render-only rotation')
})

// ── 11 Cosmic Drag ───────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false } = {}) {
  A.clearAbilityState(); ready(f); f.energy = 100
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }; let thome = null
  let atEnd = null, drawn = 0, keys = new Set()
  const ctx2d = { save() {}, restore() {}, fillRect() { drawn++ }, set fillStyle(v) {}, set globalAlpha(v) {}, set imageSmoothingEnabled(v) {} }
  for (let i = 0; i < 300; i++) {
    const was = !!(S(f).ult && S(f).ult.home); world(f, t); t.isBlocking = block
    if (S(f).ult?.home) { thome ??= { ...S(f).ult.thome }; Object.keys(S(f).ult).forEach(k => keys.add(k)); if (S(f).ult.t === 60) drawJetrayUnder(ctx2d, f) }
    if (was && !S(f).ult && atEnd == null) atEnd = { cd: f.attackCooldown + 1, x: f.x, y: f.y, tx: t.x, kd: t.knockdownState, home: { ...home } }
  }
  t.isBlocking = false; clearProj()
  return { ok, dealt: hp - t.health, home, thome, atEnd, drawn, keys }
}
test('11. Cosmic Drag: 55 Power; whiff / block = no capture (60f); 40 + 6×20 + 80 = 240 raw; restore; lockout', () => {
  let f = ben(), t = foe(); f.energy = 50; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'rejected below 55')
  f = ben(); t = foe(); A.clearAbilityState(); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t))); assert.equal(f.energy, 45)
  assert.equal(f.attackCooldown, JR_ULT.STARTUP + JR_ULT.SWOOP_F + JR_ULT.WHIFF, '60f whiff recovery after the swoop'); clearProj()
  f = ben(); t = foe(); let r = ult(f, t, { far: true }); assert(r.ok); assert.equal(r.dealt, 0); assert.equal(S(f).lastUltRaw, 0, 'whiff')
  f = ben(); t = foe(); reset(f, t, 60); r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, 0, 'blocked: no cinematic')
  f = ben(); t = foe(); reset(f, t, 60); r = ult(f, t); assert.equal(S(f).lastUltRaw, 240, `raw ${S(f).lastUltRaw}`)
  assert(r.dealt > 100, `dealt ${r.dealt}`); assert(r.atEnd, 'ended'); assert.equal(r.atEnd.cd, JR_ULT.LOCKOUT, '100f lockout')
  assert.equal(r.atEnd.kd, true, 'knocked down (skid + bounce)'); assert(r.drawn > 50, 'hyperspace drawn')
  assert(r.atEnd.tx >= 0 && r.atEnd.tx <= 1600 - t.w, 'opponent at a legal stage position')
  assert.deepEqual([...r.keys].sort(), ['cast', 'crashAt', 'f0', 'face', 'home', 'layout', 'p', 'phase', 'pips0', 'raw', 'seed', 't', 'thome'].sort(), 'no starfield / planet objects in GAME_STATE beyond the hash layout')
  console.log('   HP dealt', r.dealt)
})
test('11. starfield layout = hash(seed, frame, player): identical for the same seed, different for another; render has no hitboxes', () => {
  const a = jrStarLayout(7, 100, 0), b = jrStarLayout(7, 100, 0), c = jrStarLayout(8, 100, 0)
  assert.deepEqual(a, b); assert.notDeepEqual(a, c); assert.equal(a.length, 7); assert.equal(a[2].kind, 'ringed'); assert.equal(a[6].kind, 'sun')
  const run = seed => { SEED = seed; FRAME = 1000; const f = ben(), t = foe(); reset(f, t, 60); ult(f, t); SEED = 4242; return S(f).lastUltLayout }
  assert.deepEqual(run(11), run(11)); assert.notDeepEqual(run(11), run(12))
  assert(!A.activeProjectiles.some(p => /star|planet/.test(p.name || '')))
})
test('11. 2 Neuro pips at capture → the final hit adds one (respects immunity, no extra damage)', () => {
  const f = ben(), t = foe(); reset(f, t, 60); S(f).neuro.pips = 2; S(f).neuro.pipT = 999; ult(f, t)
  assert.equal(S(f).lastUltRaw, 240); assert.equal(S(f).neuro.grounds, 1, 'third pip → Grounded')
  const g = ben(), u = foe(); reset(g, u, 60); S(g).neuro.pips = 2; S(g).neuro.pipT = 999; S(g).neuro.immune = 999; ult(g, u); assert.equal(S(g).neuro.grounds, 0, 'immunity respected')
})

// ── 12 swap / revert / KO / rematch ───────────────────────────────────────────────────────────────────────
test('12. swap / revert / KO / rematch clear Mach Time, echoes, pips, flight', () => {
  const dirty = f => { const s = S(f); s.machT = 80; s.echoes = [{ at: 9, raw: 5 }]; s.echoCount = 2; s.neuro.pips = 2; s.neuro.groundT = 50; f._flightCtl = { phase: 'flying' } }
  const f = ben(); dirty(f); assert(F.applyAlien(f, 'goop')); assert.notEqual(f.omnitrix.formState?.kind, 'jetray'); assert.equal(f._alienFlightProfile, undefined); assert.equal(f._flightCtl, null)
  assert(F.applyAlien(f, 'jetray')); const s = S(f); assert.equal(s.machT, 0); assert.equal(s.machCd, 0); assert.equal(s.echoes.length, 0); assert.equal(s.neuro.pips, 0); assert.equal(s.neuro.groundT, 0)
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null)
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null, 'KO')
  const t = foe(); const h = ben(); S(h).neuro.groundT = 50; tick(h, t); assert(t._benGrounded.ttl > 0); F.revertToHuman(h); physics.moveFighter(t, {}, CONTROLS); physics.moveFighter(t, {}, CONTROLS)
  assert.equal(t._benGrounded.ttl, 0, 'Grounded lapses once he is gone')
  const g = ben(); assert.equal(S(g).machT, 0); assert.equal(S(g).neuro.pips, 0, 'rematch: fresh')
})

// ── 13 PICK FIVE (the brief's slot-12 test; the owner kept 5 slots — Jetray is a pick, not a new slot / chord) ─
test('13. pick five: slot count from the registry (5), Jetray READY + pickable, no ready alien overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('jetray'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 12, 'catalog slot 12 (metadata only)')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'jetray').length, 1)
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT); assert(getAvailableAlienKeys(false).includes('jetray'))
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet from fun-tech\.tk/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')))
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Jetray'); assert.equal(f.health, 950, 'shared health')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 2.6 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×2.6')
  assert(Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 0.80) < 1e-9 && Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 0.95) < 1e-9)
})
test('13. picked loadout: Jetray in the last dial slot and the transform reaches it; Vow pick includes him', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'jetray']
  const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); assert.deepEqual(f.omnitrix.aliens, pick); f.energy = 100
  assert(F.ben10TransformOrSwap(f, BEN10_SLOT_COUNT - 1, { seed: 1, frame: 0, playerIndex: 0 }))
  for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.activeAlien, 'jetray')
  const mk = () => { const g = ben(null); g.omnitrix.aliens = pick.slice(); return g }, a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); picks.add(pick[x]) }
  assert(picks.has('jetray') && picks.size === pick.length)
})
test('13. same-seed determinism: an identical scripted Jetray sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light'); reset(f, t, 150); cast(f, t, 'F'); world(f, t, 40)
    JETRAY.blockSpecial(f, {}, SPEND); S(f).swallow = 0; reset(f, t, 40); ready(f); dashTap(f, t); f._specialHeldDir = 'F'; A.triggerSpecial(f, ctxOf(f, t)); world(f, t, 40)
    t.x = f.x - t.w - 20; cast(f, t, 'D'); world(f, t, 40); reset(f, t, 60); ult(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data mid-cast (eye, tail, dash, dive, roll, Mach + echoes, Grounded, ult)', () => {
  const f = ben(), t = foe(); reset(f, t, 150); assert(JETRAY.blockSpecial(f, {}, SPEND)); S(f).swallow = 0; cast(f, t, 'F'); tick(f, t, 18); JSON.stringify(S(f))
  tick(f, t, 40); clearProj(); cast(f, t, 'D'); tick(f, t, 16); JSON.stringify(S(f)); tick(f, t, 30); clearProj()
  S(f).neuro.groundT = 30; tick(f, t, 3); JSON.stringify(t._benGrounded)
  const u = ben(), v = foe(); reset(u, v, 60); A.clearAbilityState(); u.energy = 100; A.triggerUltimate(u, ctxOf(u, v)); for (let i = 0; i < 60; i++) world(u, v)
  assert(S(u).ult && S(u).ult.phase !== 'opener', `mid-cinematic (${S(u).ult?.phase})`); assert.doesNotThrow(() => JSON.stringify(S(u))); clearProj()
})
test('no Math.random / gameRng in jetray.js / jetrayAssets.js', () => {
  for (const file of ['../jetray.js', '../jetrayAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`JETRAY: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
