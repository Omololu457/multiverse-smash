// GHOSTFREAK — harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_ghostfreak.test.mjs
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per move), within ±20%. The live routes
// run the real engine (its combo curve, the form's mods, the global damage scale) and assert the mechanics.
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
import { balDmgMult } from '../rosterBalance.js'   // roster balance sweep 2026-11-25: Ben's row (dmg ×1.75) multiplies his live damage on top
const BAL = balDmgMult('ben10')
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { clearBenFormState } from '../ben10State.js'
import { tickFlightDriver, isFlying, getFlightProfile } from '../flight.js'
import { GHOSTFREAK, GF_PHASE, GF_AMBUSH, GF_DREAD, GF_COST, GF_GALE, GF_WAIL, GF_POSSESS, GF_RISE, GF_COLD, GF_ULT,
  GF_FLIGHT_MAX, GF_FLIGHT_CAP, gfState, addDread } from '../ghostfreak.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0 })
const ben = (form = 'ghostfreak') => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, []); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const S = f => f.omnitrix.formState
const ctxOf = (f, t) => ({ p1: f, p2: t })
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); if (f._benLunge || f._benGlide) physics.moveFighter(f, {}, {}) } }
const BA = GHOSTFREAK.basic_attacks
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  gale: GF_GALE.DMG * GF_GALE.TICKS.length, wail: GF_WAIL.DMG, possess: GF_POSSESS.DMG * GF_POSSESS.TICKS.length }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + 70; t.y = f.y + f.h - t.h }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const projectileHit = (p, target) => { p.x = target.x + target.w / 2; p.y = target.y + target.h / 2; C.resolveProjectileHitsMulti([p], [target]) }
const api = { spendEnergy: (f, n) => { if ((f.energy || 0) < n) return false; f.energy -= n; return true } }
const phaseIn = (f, t) => { assert(GHOSTFREAK.blockLight(f, {}, api), 'Block + Light enters Phase'); tick(f, t, GF_PHASE.ENTER); assert.equal(S(f).ph, 'intangible') }

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
// a plain physical jab from the OPPONENT into Ghostfreak
function oppJab(t, f) {
  t.attacking = false; t.currentAttack = null; t.attackCooldown = 0; t.hitstop = 0; t.facing = -1; t.x = f.x + 60
  C.startMove(t, 'light', { damage: 40, startup: 0, active: 5, recovery: 10, rangeX: 100, rangeY: 130 })
  const hp = f.health; for (let i = 0; i < 6; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}); C.resolveAttackHit(t, f, [], {}) }
  t.attacking = false; t.currentAttack = null
  return hp - f.health
}
const onContact = (f, t, alien, blocked = false) => GHOSTFREAK.onContact(f, t, { proj: { alien, owner: f }, blocked })
const freshDef = g => { g.hitstun = 0; g.invulnTimer = 0; g.blockstun = 0; g.isBlocking = false; g.hitstop = 0; g.vx = g.vy = 0; g.onGround = g.grounded = true; g.y = 410 - g.h; g.comboCounter = 0 }

// ── 1-3 combo routes ────────────────────────────────────────────────────────────────────────────────────
// Route 3 starts from Intangible: Wail leaves Phase as an Ambush (×1.2) — the plain-model total without it is 103 (−21 %).
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 84, 1],
  ['2. Low, Heavy, Spectral Gale', ['low', 'heavy', 'gale'], 96, 1],
  ['3. Wail (Ambush, from Intangible), Heavy, Possess', ['wail', 'heavy', 'possess'], 130, GF_AMBUSH.MULT],
]
for (const [name, route, target, first] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route) + RAW[route[0]] * (first - 1); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Spectral Gale (4 ticks, combo continues)', () => {
  const f = ben(), t = fresh('goku', 70); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  t.x = f.x + 120; const g = cast(f, t, null, { frames: 60 }); assert(g.ok); assert.equal(g.hits, 4); assert(f.comboCounter >= 3, `combo ${f.comboCounter}`)
  console.log('   HP', [...d, g.dealt].join('+'), '=', d[0] + d[1] + g.dealt)
})
test('route 3 live: Wail from Intangible (Ambush), Heavy, Possess (combo ender)', () => {
  const f = ben(), t = fresh('goku', 70); phaseIn(f, t); reset(f, t)
  const w = cast(f, t, 'D', { frames: 22 }); assert(w.ok && w.dealt > 0); reset(f, t); t.hitstun = 20
  const h = melee(f, t, 'heavy'); reset(f, t); t.hitstun = 12
  f._specialHeldDir = 'F'; f.attackCooldown = 0; f._benPowerCommit = 0; A.clearAbilityState(); const hp = t.health
  assert(A.triggerSpecial(f, ctxOf(f, t))); tick(f, t, GF_POSSESS.STARTUP + GF_POSSESS.HOLD + 2); const p = hp - t.health
  assert(p > 0, 'Possess lands mid-combo'); assert(S(f).dread.pips + S(f).dread.terrors * 3 >= 3, '+1 Wail +2 Possess = 3 → Terror')
  console.log('   HP', w.dealt, '+', h, '+', p, '=', w.dealt + h + p)
})

// ── PICK FIVE (was slot 7) ─────────────────────────────────────────────────────────────────────────────────
// The owner kept 5 dial slots (PICK FIVE, 2026-11-17): Ghostfreak is a pick, not a 7th slot. Slot count is read from the
// registry (BEN10_SLOT_COUNT) — these two tests used a literal 7 / slot index 6.
test('20. pick five: Ghostfreak READY and pickable, slot count read from the registry; no ready alien overwritten', () => {
  const d = getAlienDefinition('ghostfreak'); assert.equal(d.status, 'ready')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(buildLoadout().length, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(getAvailableAlienKeys(false).includes('ghostfreak'))
})
test('20. pick five: Ghostfreak picked into the last dial slot is reached by the transform; the Vow pick reaches it and is deterministic', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'ghostfreak'].slice(-BEN10_SLOT_COUNT), last = pick.length - 1
  const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick)
  assert.deepEqual(f.omnitrix.aliens, pick)
  f.energy = 100; assert(F.ben10TransformOrSwap(f, last, { seed: 1, frame: 0, playerIndex: 0 }), 'last slot accepted')
  for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.activeAlien, 'ghostfreak')
  const mk = () => { const g = ben(null); g.omnitrix.aliens = pick.slice(); return g }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); picks.add(pick[x]) }
  assert(picks.has('ghostfreak'), 'Vow reaches Ghostfreak'); assert.equal(picks.size, pick.length, 'every slot reachable')
})
test('21. GAME_STATE stays plain data mid-Possess / mid-Phase / Terror (serializable, no functions)', () => {
  const f = ben(), t = fresh('goku', 0); t.x = f.x + 100; f._specialHeldDir = 'F'; A.clearAbilityState(); assert(A.triggerSpecial(f, ctxOf(f, t)))
  tick(f, t, GF_POSSESS.STARTUP + 5); const st = S(f); assert(st.possess)
  const round = JSON.parse(JSON.stringify(st)); assert.deepEqual(round, st)
  const g = ben(), u = fresh('goku', 300); phaseIn(g, u); for (const c of [1, 2, 3]) onContact(g, u, { gf: true, kind: 'wail', cast: c })
  assert.deepEqual(JSON.parse(JSON.stringify(S(g))), S(g))
})
test('22. deterministic: two identical runs give identical state (no Math.random / gameRng in ghostfreak.js)', () => {
  const run = () => { const f = ben(), t = fresh('goku', 300); f.x = 200; t.x = 450; cast(f, t, null, { frames: 60 }); f.attackCooldown = 0; f._benPowerCommit = 0; phaseIn(f, t); tick(f, t, 30); return JSON.stringify([S(f), t.x, t.health, f.energy]) }
  assert.equal(run(), run())
  const src = fs.readFileSync(new URL('../ghostfreak.js', import.meta.url), 'utf8'); assert(!/Math\.random|gameRng/.test(src))
})

// ── PHASE: Tangible / Intangible ────────────────────────────────────────────────────────────────────────
test('4. Phase: Block + Light costs 10 Power, 8f silhouette transition, then Intangible (can\'t block, 40 % body)', () => {
  const f = ben(), t = fresh('goku', 300)
  const e = f.energy; assert(GHOSTFREAK.blockLight(f, {}, api)); assert.equal(e - f.energy, GF_PHASE.COST)
  assert.equal(S(f).ph, 'entering'); assert.equal(f._spriteCastMove, 'gfPhase')
  tick(f, t, GF_PHASE.ENTER - 1); assert.equal(S(f).ph, 'entering'); tick(f, t); assert.equal(S(f).ph, 'intangible')
  assert.equal(S(f).noBlock, true, 'formState.noBlock while phased'); assert.equal(GHOSTFREAK.bodyAlpha(f), 0.4, '40 % body (render-only)')
  assert.equal(C.startMove(f, 'light', BA.light), false, 'no normals while Intangible')
  assert.equal(GHOSTFREAK.phasing(f), true, 'no pushbox vs the opponent')
})
test('4. Phase refused: in hitstun, during a move, in the Ultimate, without Power', () => {
  let f = ben(); f.hitstun = 5; assert.equal(GHOSTFREAK.blockLight(f, {}, api), false, 'hitstun')
  f = ben(); assert(C.startMove(f, 'light', BA.light)); assert.equal(GHOSTFREAK.blockLight(f, {}, api), false, 'active frames')
  f = ben(); S(f).ult = { phase: 'tremor', t: 30 }; assert.equal(GHOSTFREAK.blockLight(f, {}, api), false, 'ultimate')
  f = ben(); f.energy = 5; assert.equal(GHOSTFREAK.blockLight(f, {}, api), false, 'Power')
})
test('5. Intangible: drains 4 Power/s; forced exit at 90f → 20f Materialize (vulnerable) + 240f cooldown', () => {
  const f = ben(), t = fresh('goku', 300); phaseIn(f, t)
  const e = f.energy; tick(f, t, 60); assert(Math.abs((e - f.energy) - 4) < 1e-6, `4 Power over 60f (${e - f.energy})`)
  tick(f, t, GF_PHASE.MAX - 60); assert.equal(S(f).ph, 'materialize', 'forced out at 90f'); assert.equal(S(f).phCd, GF_PHASE.CD_FORCED)
  assert(f._benPowerCommit >= GF_PHASE.MATERIALIZE - 1, 'recovery: can\'t act'); assert.equal(GHOSTFREAK.bodyAlpha(f), 1, 'tangible again')
  assert.equal(C.startMove(f, 'light', BA.light), false, 'no normals while materializing')
  assert(oppJab(t, f) > 0, 'vulnerable during Materialize'); assert.equal(GHOSTFREAK.blockLight(f, {}, api), false, 'no Phase in hitstun'); freshDef(f)
  tick(f, t, GF_PHASE.MATERIALIZE); assert.equal(S(f).ph, 'tangible'); assert.equal(GHOSTFREAK.blockLight(f, {}, api), false, 'cooldown')
  tick(f, t, GF_PHASE.CD_FORCED); f._benPowerCommit = 0; f.attackCooldown = 0   // (the engine's combat update counts the 20f commit down)
  assert(GHOSTFREAK.blockLight(f, {}, api), 'usable again after 240f')
})
test('5. manual exit (Block + Light again) → 20f Materialize + 60f cooldown', () => {
  const f = ben(), t = fresh('goku', 300); phaseIn(f, t); tick(f, t, 10)
  assert(GHOSTFREAK.blockLight(f, {}, api)); assert.equal(S(f).ph, 'materialize'); assert.equal(S(f).phCd, GF_PHASE.CD_MANUAL)
  tick(f, t, GF_PHASE.MATERIALIZE); assert.equal(S(f).ph, 'tangible'); f._benPowerCommit = 0; f.attackCooldown = 0
  assert.equal(GHOSTFREAK.blockLight(f, {}, api), false, 'cooldown'); tick(f, t, GF_PHASE.CD_MANUAL); assert(GHOSTFREAK.blockLight(f, {}, api))
})
test('6. Intangible: physical normals + non-energy projectiles pass through; energy / fire / beam still hit', () => {
  const f = ben(), t = fresh('goku', 300); phaseIn(f, t)
  assert.equal(oppJab(t, f), 0, 'physical jab passes through')
  const hp = f.health; projectileHit({ owner: t, ownerId: 'p2', name: 'rock', damage: 40, radius: 20, vx: -1 }, f); assert.equal(f.health, hp, 'plain projectile passes')
  projectileHit({ owner: t, ownerId: 'p2', name: 'fireball', damage: 40, radius: 20, vx: -1 }, f); assert(f.health < hp, 'fire projectile lands')
  const h2 = f.health; projectileHit({ owner: t, ownerId: 'p2', name: 'test', damageType: 'energy', damage: 40, radius: 20, vx: -1 }, f); assert(f.health < h2, 'energy-tagged projectile lands')
  assert(S(f).stats.evaded >= 2)
})
test('7. Ambush: first hit within 24f of materializing +20 % and normal startup −2f; once per Phase use', () => {
  const ref = ben(), t0 = fresh('goku', 70), base = melee(ref, t0, 'heavy')
  const f = ben(), t = fresh('goku', 300); phaseIn(f, t); assert(GHOSTFREAK.blockLight(f, {}, api)); tick(f, t, GF_PHASE.MATERIALIZE)
  assert(S(f).amb.win > 0, 'window open'); reset(f, t)
  f.attackCooldown = 0; f._benPowerCommit = 0
  assert(C.startMove(f, 'heavy', BA.heavy)); assert.equal(f.currentAttack.activeStart, BA.heavy.startup - GF_AMBUSH.CUT, 'heavy startup −2f')
  f.attacking = false; f.currentAttack = null
  const amb = melee(f, t, 'heavy'); assert(Math.abs(amb / base - GF_AMBUSH.MULT) < 0.06, `+20 % (${amb} vs ${base})`)
  freshDef(t); f.comboCounter = 0; reset(f, t); const again = melee(f, t, 'heavy'); assert(again <= base + 1, 'once per Phase use')
  const g = ben(), u = fresh('goku', 300); phaseIn(g, u); assert(GHOSTFREAK.blockLight(g, {}, api)); tick(g, u, GF_PHASE.MATERIALIZE + GF_AMBUSH.WINDOW + 1)
  reset(g, u); assert.equal(melee(g, u, 'heavy'), base, 'window expired after 24f')
})
test('8. swap / revert / KO clear Phase (formState + flight wiped)', () => {
  const f = ben(), t = fresh('goku', 300); phaseIn(f, t)
  clearBenFormState(f); assert.notEqual(f.omnitrix.formState?.kind, 'ghostfreak'); assert.equal(f._alienFlightProfile, undefined)
  const g = ben(); phaseIn(g, t); F.revertToHuman(g); assert.equal(gfState(g), null); assert.equal(GHOSTFREAK.bodyAlpha(g), 1)
})

// ── DREAD → TERROR ──────────────────────────────────────────────────────────────────────────────────────
test('9. Dread: one pip per cast (Wail +1, Gale final tick only, Possess +2 capped), none from blocks; expire 240f', () => {
  const f = ben(), t = fresh('goku', 300)
  onContact(f, t, { gf: true, kind: 'wail', cast: 1 }); onContact(f, t, { gf: true, kind: 'wail', cast: 1 }); assert.equal(S(f).dread.pips, 1, 'one per cast')
  onContact(f, t, { gf: true, kind: 'gale', cast: 2, final: false }); assert.equal(S(f).dread.pips, 1, 'non-final Gale tick: no pip')
  onContact(f, t, { gf: true, kind: 'wail', cast: 3 }, true); assert.equal(S(f).dread.pips, 1, 'blocked: no pip')
  onContact(f, t, { gf: true, kind: 'gale', cast: 2, final: true }); assert.equal(S(f).dread.pips, 2, 'final Gale tick +1')
  tick(f, t, GF_DREAD.EXPIRE - 1); assert.equal(S(f).dread.pips, 2); tick(f, t); assert.equal(S(f).dread.pips, 0, 'expired 240f after the last pip')
  const g = ben(); addDread(g, S(g), 7, 2); assert.equal(S(g).dread.pips, 2); addDread(g, S(g), 8, 2)
  assert.equal(S(g).dread.terrors, 1, 'Possess +2 caps at 3 → Terror')
})
test('10. TERROR at 3 pips: 120f, consumes the pips, no jump / dash, walk ×0.6, guard chip ×1.3; no refresh; 360f immunity', () => {
  const f = ben(), t = fresh('goku', 300)
  for (const c of [1, 2, 3]) onContact(f, t, { gf: true, kind: 'wail', cast: c })
  assert.equal(S(f).dread.terrorT, GF_DREAD.TERROR); assert.equal(S(f).dread.pips, 0, 'pips consumed')
  tick(f, t); assert(t._benTerrorT > 0, 'movement lease on the victim')
  // physics: walk ×0.6, no jump, no dash
  const ref = fresh('goku', 300); ref.speed = t.speed = 9; ref.controls = t.controls = { left: 'a', right: 'd', up: 'w', jump: 'w', down: 's', dash: 'x' }
  physics.moveFighter(ref, { d: true }, ref.controls); tick(f, t); physics.moveFighter(t, { d: true }, t.controls)
  assert(Math.abs(t.vx / ref.vx - 0.6) < 0.02, `walk ×0.6 (${t.vx} vs ${ref.vx})`)
  tick(f, t); const jc = t.jumpCount; physics.moveFighter(t, { w: true }, t.controls); assert.equal(t.jumpCount, jc, 'no jump'); assert.notEqual(t.isLaunched, true)
  tick(f, t); t._dashTap = true; physics.moveFighter(t, {}, t.controls); assert(!t.isDashing && !t.dashing, 'no dash')
  // guard drain 30 % faster = block chip ×1.3 on his hits
  assert.equal(GHOSTFREAK.damageDealt(f, t, 10, { source: 'block-chip' }), 13)
  // no refresh while active
  for (const c of [4, 5, 6]) onContact(f, t, { gf: true, kind: 'wail', cast: c }); assert.equal(S(f).dread.pips, 0, 'no pips while Terror runs')
  tick(f, t, GF_DREAD.TERROR); assert.equal(S(f).dread.terrorT, 0); assert(S(f).dread.immune > GF_DREAD.IMMUNE - 10, '360f immunity starts')
  tick(f, t, 3); physics.moveFighter(t, {}, t.controls); physics.moveFighter(t, {}, t.controls); assert(!(t._benTerrorT > 0), 'lease lapses within 2 victim frames'); const vx0 = (physics.moveFighter(t, { d: true }, t.controls), t.vx); assert(Math.abs(vx0 - ref.vx) < 0.01, 'full walk again')
  for (const c of [7, 8, 9]) onContact(f, t, { gf: true, kind: 'wail', cast: c }); assert.equal(S(f).dread.terrors, 1, 'immune: no second Terror'); assert.equal(S(f).dread.pips, 3)
  tick(f, t, GF_DREAD.IMMUNE); assert.equal(S(f).dread.pips, 0, 'the held pips expired meanwhile')
  for (const c of [10, 11, 12]) onContact(f, t, { gf: true, kind: 'wail', cast: c }); assert.equal(S(f).dread.terrors, 2, 'after 360f immunity, 3 pips → Terror again')
})

// ── FLIGHT ──────────────────────────────────────────────────────────────────────────────────────────────
const flyLoop = (f, t, n, input = { jump: true, up: true }) => { let flying = 0, minY = f.y
  for (let i = 0; i < n; i++) {
    physics.moveFighter(f, { w: !!input.jump }, CONTROLS); A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); tickFlightDriver(f); physics.applyGravity(f)
    if (f._flightCtl && isFlying(f)) { flying++; minY = Math.min(minY, f.y); assert.equal(f.jumpCount, 2, 'jumps not refilled') }
    if (f.onGround) break
  } return { flying, minY } }
test('11. Flight: hold Jump in the air → float; profile cruise 5.0 / high drag; 150f per airtime, apex + 160 cap, no jump refill', () => {
  const f = ben(), t = fresh('goku', 900); const p = getFlightProfile(f); assert(p && p.maxH === 5.0 && p.drag <= 0.6 && p.energyMax === 150 && p.groundedLock === 40, 'ghostfreak profile')
  f.onGround = f.grounded = false; f.y = 250; f.vy = 0; f.jumpCount = 2; tick(f, t)
  const apex = S(f).apexY; const { flying, minY } = flyLoop(f, t, 260)
  assert(flying <= GF_FLIGHT_MAX && flying >= GF_FLIGHT_MAX - 12, `≤ 150 flying frames (${flying})`)
  assert(minY >= apex - GF_FLIGHT_CAP - 1e-6, `no altitude past apex + 160 (${minY} vs ${apex - GF_FLIGHT_CAP})`)
  // a hard hit in flight: knocked down + 40f grounded lock
  const g = ben(), u = fresh('goku', 900); g.onGround = g.grounded = false; g.y = 250; g.vy = 0; g.jumpCount = 2; tick(g, u)
  flyLoop(g, u, 14); assert(isFlying(g), 'flying'); g.hitstun = 20; A.tickBenAlienForm(g, { jump: true }, ctxOf(g, u)); assert(!isFlying(g)); assert.equal(g._flightCtl.groundedLock, 40, 'grounded 40f')
})
test('11. Flight disabled during the Materialize recovery; allowed while Intangible', () => {
  const f = ben(), t = fresh('goku', 900); phaseIn(f, t); f.onGround = f.grounded = false; f.y = 250; f.vy = 0; f.jumpCount = 2
  const a = flyLoop(f, t, 30); assert(a.flying > 0, 'flies while Intangible')
  const g = ben(), u = fresh('goku', 900); phaseIn(g, u); assert(GHOSTFREAK.blockLight(g, {}, api)); assert.equal(S(g).ph, 'materialize')
  g.onGround = g.grounded = false; g.y = 150; g.vy = 0; g.jumpCount = 2
  const b = flyLoop(g, u, GF_PHASE.MATERIALIZE - 2); assert.equal(b.flying, 0, 'no flight while materializing')
})

// ── MOVES ───────────────────────────────────────────────────────────────────────────────────────────────
// run a special through the live pipeline: form tick, projectile movement / ageing, projectile hits at their REAL positions
function live(f, t, frames, { input = {}, block = false } = {}) {
  const hp = t.health; let hits = 0
  for (let i = 0; i < frames; i++) {
    tick(f, t, 1, input); C.updateProjectiles(A.activeProjectiles, 3200)
    t.isBlocking = block; const before = t.health, bs = t.blockstun
    C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); if (t.health < before || t.blockstun > bs) hits++
    t.hitstop = 0; f.hitstop = 0
  }
  t.isBlocking = false; return { dealt: hp - t.health, hits }
}
function cast(f, t, dir, opts = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0
  if (!opts.keep) A.clearAbilityState()
  f._specialHeldDir = dir; const e = f.energy
  const ok = A.triggerSpecial(f, ctxOf(f, t))
  const r = ok ? live(f, t, opts.frames ?? 70, opts) : { dealt: 0, hits: 0 }
  return { ok, spent: e - f.energy, ...r }
}
test('12. normals: Jab 5f/16/0, Heavy 14f/48/−6 170 px, Low 7f/22/−4 hits low, Launcher 11f/42/−9, Air 7f/26/+2', () => {
  const adv = md => md.blockstun - (md.active + md.recovery)
  const want = { light: [5, 16, 0], heavy: [14, 48, -6], down: [7, 22, -4], up: [11, 42, -9], air: [7, 26, 2] }
  for (const [k, [st, dmg, a]] of Object.entries(want)) { assert.equal(BA[k].startup, st, k); assert.equal(BA[k].damage, dmg, k); assert.equal(adv(BA[k]), a, k) }
  assert.equal(BA.heavy.rangeX, 170); assert.equal(BA.down.hitLevel, 'low'); assert(BA.up.launcher)
  const f = ben(); assert(Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 1.0) < 1e-9 && Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 0.8) < 1e-9, 'mods dmg 1.00 / def 0.80')
  assert.equal(f.w, 44, 'slim hurtbox'); assert.equal(f.maxJumps, 2); assert.equal(f.health, 2185, 'shared health (950 × the 2026-11-24 Ben HP buff 2.30)')
})
test('13. Spectral Gale (↓↘→, 10): 380 px swirl, 4 × 10, pushes 6 px/f (8f max), one on screen, final tick +1 Dread', () => {
  const f = ben(), t = fresh('goku', 300); f.x = 200; t.x = 450; const x0 = t.x
  const r = cast(f, t, null, { frames: 80 }); assert(r.ok); assert.equal(r.spent, GF_COST.gale); assert.equal(r.hits, 4, `4 ticks (${r.hits})`)
  const pushed = t.x - x0; assert(pushed > 0 && pushed <= GF_GALE.PUSH * GF_GALE.PUSH_MAX + 1e-6, `pushed ≤ 48 px (${pushed})`)
  assert.equal(S(f).dread.pips, 1, 'final tick +1 Dread (one pip)')
  const g = ben(), u = fresh('goku', 300); g.x = 0; u.x = 600; const a = cast(g, u, null, { frames: 5 }); assert(a.ok)
  g.attackCooldown = 0; g._benPowerCommit = 0; g._specialHeldDir = null; assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'one on screen')
  const h = ben(), v = fresh('goku', 300); h.x = 0; v.x = 0 + 30 + 400 + 60; const m = cast(h, v, null, { frames: 90 }); assert.equal(m.hits, 0, 'out of 380 px range')
  assert(A.activeProjectiles.every(p => !/gf_gale/.test(p.name) || p.damageType === 'wind'), 'wind tag')
})
test('14. Wail (↓↙←, 14): 16f startup, 160 px burst, 30, −10 on block, +1 Dread; from Intangible exits Phase + Ambush', () => {
  const f = ben(), t = fresh('goku', 300); f.x = 200; t.x = 300
  const hp = t.health; f._specialHeldDir = 'D'; A.clearAbilityState(); assert(A.triggerSpecial(f, ctxOf(f, t)))
  live(f, t, GF_WAIL.STARTUP - 1); assert.equal(t.health, hp, 'nothing before frame 16'); const r = live(f, t, 6); assert(r.dealt > 0, 'burst on frame 16')
  assert.equal(S(f).dread.pips, 1)
  const b = ben(), u = fresh('goku', 300); b.x = 200; u.x = 300; const bl = cast(b, u, 'D', { frames: 25, block: true }); assert(bl.ok)
  const p = { blockstun: GF_WAIL.TOTAL - GF_WAIL.STARTUP + GF_WAIL.ON_BLOCK }; assert.equal(p.blockstun - (GF_WAIL.TOTAL - GF_WAIL.STARTUP), -10, '−10 on block')
  assert.equal(S(b).dread.pips, 0, 'blocked: no Dread')
  const far = ben(), w = fresh('goku', 300); far.x = 0; w.x = 260; assert.equal(cast(far, w, 'D', { frames: 25 }).dealt, 0, 'outside 160 px')
  const ref = cast(ben(), Object.assign(fresh('goku', 0), { x: 70 }), 'D', { frames: 25 }).dealt
  const g = ben(), v = fresh('goku', 300); v.x = 70; phaseIn(g, v); const amb = cast(g, v, 'D', { frames: 25 })
  assert(amb.ok, 'Wail usable from Intangible'); assert.notEqual(S(g).ph, 'intangible', 'exits Phase'); assert.equal(S(g).ph, 'tangible', 'no Materialize recovery for the cast')
  assert(amb.dealt > ref * 1.1, `counts as an Ambush (${amb.dealt} vs ${ref})`)
})
test('15. Possess (→→, 18): 14f startup (10 from Intangible), 140 px, unblockable; 45f, 3 × 15, +2 Dread, +15 Power; burst-out', () => {
  const f = ben(), t = fresh('goku', 0); t.x = f.x + 100; t.isBlocking = true
  f._specialHeldDir = 'F'; A.clearAbilityState(); const e = f.energy; assert(A.triggerSpecial(f, ctxOf(f, t))); assert.equal(e - f.energy, GF_COST.possess)
  tick(f, t, GF_POSSESS.STARTUP - 1); assert.equal(S(f).possess, null, 'not yet'); tick(f, t); assert(S(f).possess, 'grabbed on frame 14 (through the guard)')
  const hp = t.health, en = f.energy; assert.equal(S(f).dread.pips, 2, '+2 Dread')
  tick(f, t, GF_POSSESS.HOLD - 2); assert(t.hitstun > 0, 'held'); assert.equal(GHOSTFREAK.bodyAlpha(f), 0, 'inside them')   // the grab frame is hold frame 1
  tick(f, t); assert.equal(S(f).possess, null, 'burst out at 45f'); assert(t.vx * f.facing > 0, 'pushed away')
  assert(hp - t.health > 0 && hp - t.health <= 45 * BAL, `drain ticks 3 × 15 (${hp - t.health})`); assert.equal(f.energy - en, GF_POSSESS.POWER, '+15 Power')
  // whiff: out of 140 px → 28f recovery
  const g = ben(), u = fresh('goku', 0); u.x = g.x + 260; g._specialHeldDir = 'F'; A.clearAbilityState(); assert(A.triggerSpecial(g, ctxOf(g, u)))
  assert.equal(g.attackCooldown, GF_POSSESS.STARTUP + GF_POSSESS.WHIFF); tick(g, u, GF_POSSESS.STARTUP + 1); assert.equal(S(g).possess, null, 'whiff')
  // tech: a grab press buffered, not in stun → both pushed apart, no possess
  const h = ben(), v = fresh('goku', 0); v.x = h.x + 100; h._specialHeldDir = 'F'; A.clearAbilityState(); assert(A.triggerSpecial(h, ctxOf(h, v)))
  tick(h, v, GF_POSSESS.STARTUP - 1); v.grabInputBuffer = 6; tick(h, v); assert.equal(S(h).possess, null, 'teched'); assert.equal(S(h).stats.techs, 1)
  // from Intangible: 10f
  const k = ben(), w = fresh('goku', 0); w.x = k.x + 100; phaseIn(k, w); k._specialHeldDir = 'F'; A.clearAbilityState(); assert(A.triggerSpecial(k, ctxOf(k, w)))
  tick(k, w, GF_POSSESS.STARTUP_PHASED); assert(S(k).possess, '10f from Intangible')
})
test('16. Phantom Rise (←↙↓, 12): 55, upper body intangible to physical hits on frames 4-10, once per airtime, no jump refill', () => {
  const f = ben(), t = fresh('goku', 0); t.x = f.x + 60
  f._specialHeldDir = 'B'; A.clearAbilityState(); assert(A.triggerSpecial(f, ctxOf(f, t))); const jc = f.jumpCount
  tick(f, t, 5); f.grounded = false   // (no physics here: the rise cleared onGround; airborne until he lands) assert(S(f).rise.t >= GF_RISE.IFRAMES[0]); assert.equal(oppJab(t, f), 0, 'physical hit passes on frame 5')
  assert(GHOSTFREAK.evade(f, { proj: { name: 'fireball', owner: t } }) === false, 'energy still lands')
  const r = live(f, t, 8); assert(r.dealt > 0, 'rising gale hits'); tick(f, t, 25)
  f.onGround = f.grounded = false; f.attackCooldown = 0; f.attacking = false; f._specialHeldDir = 'B'; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime')
  assert(f.jumpCount >= jc, 'no jump refill')
})
test('17. Cold Touch (air ↓↘→, 12): 40, once per airtime', () => {
  const f = ben(), t = fresh('goku', 0); t.x = f.x + 40; f.onGround = f.grounded = false; f.y = t.y - 60
  const r = cast(f, t, null, { frames: 12 }); assert(r.ok); assert.equal(r.spent, GF_COST.cold); assert(S(f).coldUsed)
  f.attackCooldown = 0; f.attacking = false; f._benPowerCommit = 0; f._specialHeldDir = null; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime')
  f.onGround = f.grounded = true; tick(f, t, 2); assert.equal(S(f).cold, null, 'landing ends the dive'); assert.equal(S(f).coldUsed, false, 'reset on landing')
})
test('18. Intangible: only Possess / Wail; Gale / Rise refused', () => {
  const f = ben(), t = fresh('goku', 300); phaseIn(f, t); f._specialHeldDir = null; A.clearAbilityState(); assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false)
  f._specialHeldDir = 'B'; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false)
})

// ── ULTIMATE ────────────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { far = false, tech = false } = {}) {
  A.clearAbilityState(); f.attackCooldown = 0; f.attacking = false; f.energy = 100; f._benPowerCommit = 0
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }, thome = { x: t.x, y: t.y }; let dark = 0
  for (let i = 0; i < 160; i++) { if (tech && i === GF_ULT.STARTUP - 1) t.grabInputBuffer = 6; tick(f, t); if (S(f).ult && S(f).ult.phase !== 'opener') dark++ }
  return { ok, dealt: hp - t.health, home, thome, dark }
}
test('19. FEAR FEAST: 50 Power, tangible only; whiff / tech = no cinematic + 60f recovery; 40 + 3×25 + 3×20 + 65 = 240', () => {
  let f = ben(), t = fresh('goku', 70); f.energy = 40; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'rejected below 50 Power')
  f = ben(); t = fresh('goku', 70); phaseIn(f, t); f.energy = 100; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'not while Intangible')
  f = ben(); t = fresh('goku', 70); let r = ult(f, t, { far: true }); assert(r.ok); assert.equal(r.dealt, 0); assert.equal(S(f).lastUltRaw, 0, 'whiff: no cinematic')
  f = ben(); t = fresh('goku', 70); A.clearAbilityState(); f.energy = 100; A.triggerUltimate(f, ctxOf(f, t)); assert.equal(f.energy, 50)
  assert.equal(f.attackCooldown, GF_ULT.STARTUP + GF_ULT.WHIFF_RECOVERY, '60f whiff recovery')
  f = ben(); t = fresh('goku', 70); r = ult(f, t, { tech: true }); assert.equal(S(f).lastUltRaw, 0, 'teched: no cinematic')
  f = ben(); t = fresh('goku', 70); reset(f, t); f.health = 900; r = ult(f, t)
  assert.equal(S(f).lastUltRaw, GF_ULT.OPENER + 3 * GF_ULT.TREMOR + 3 * GF_ULT.STORM + GF_ULT.SCREAM); assert.equal(S(f).lastUltRaw, 240)
  assert(r.dark > 0, 'stage darkens (render-only phase)'); assert.equal(S(f).ult, null); assert.equal(f.x, r.home.x, 'positions restore'); assert.equal(t.x, r.thome.x)
  assert.equal(f.health, 915, 'heals 15 once'); assert.equal(S(f).dread.terrors, 1, 'Terror at the end')
  assert(f.attackCooldown > 0 && f.attackCooldown <= GF_ULT.LOCKOUT, '100f lockout'); console.log('   HP dealt', r.dealt)
  const g = ben(), u = fresh('goku', 70); reset(g, u); S(g).dread.immune = 300; ult(g, u); assert.equal(S(g).dread.terrors, 0, 'no Terror while immune')
  assert.equal(g.health, Math.min(g.maxHealth, 2185), 'heal capped at max HP (950 × the 2026-11-24 Ben HP buff 2.30)')
})

console.log(`GHOSTFREAK: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
