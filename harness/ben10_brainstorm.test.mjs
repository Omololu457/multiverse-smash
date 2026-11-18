// BRAINSTORM — Phase 7 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_brainstorm.test.mjs
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per move, reset after 90f), within ±20%
// (lightning ×1.25 while the dome is open and READ +30% are part of the raw value). The live routes then run the real
// engine (its combo curve, the form's mods, the global damage scale) and assert the mechanics.
// Test 12 (the brief's "slot 9") is PICK FIVE: the owner kept 5 slots; Brainstorm is a pick, not a new slot / chord.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import { BRAINSTORM, BS_DOME, BS_READ, BS_SYN, BS_COST, BS_BOLT, BS_BURST, BS_PULL, BS_STRIKE, BS_OC, BS_SHIELD, BS_ULT,
  bsState, bsHash, pIndex, addSynapse, logRead, readArmed, isBeam, drawBrainstormUnder, BS_OPEN_ANIM, BS_CLOSED_ANIM } from '../brainstorm.js'
import { benAlienSpecialTax, benAlienStruck, benAlienBodyOffset } from '../ben10State.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'brainstorm', loadout = []) => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const foe = (key = 'goku', x = 100) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); if (ch?.animationData) t.animationData = ch.animationData; t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
const STAGE = { stageLeft: 0, stageWidth: 1600 }
let FRAME = 0, SEED = 4242
const ctxOf = (f, t) => ({ p1: f, p2: t, ...STAGE, seed: SEED, frame: FRAME })
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t)); if (f._benGlide) physics.moveFighter(f, {}, {}) } }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const timers = q => { if (q.hitstop > 0) q.hitstop--; else if (q.hitstun > 0) q.hitstun--; for (const k of ['attackCooldown', '_benPowerCommit', '_spriteCastTimer', 'invulnTimer', 'blockstun', 'grabInputBuffer']) if (q[k] > 0) q[k]-- }
// one whole frame: pending spawns, both fighters' physics, the form tick, Brainstorm's live projectiles moved + resolved on the foe
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
const BA = BRAINSTORM.basic_attacks
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  boltOpen: BS_BOLT.DMG * BS_DOME.LTN_MULT, pull: BS_PULL.DMG, strikeRead: BS_STRIKE.DMG * BS_READ.DMG }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * Math.pow(0.85, i), 0)
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const reset = (f, t, gap = 70) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.hitstop = 0; t.isLaunched = false; t.vx = t.vy = 0; t.x = f.x + gap; t.y = f.y + f.h - t.h; t.onGround = t.grounded = true; t.isGrabbed = false }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }
const openDome = f => { S(f).dome = 'open'; S(f).domeT = 0; tick(f, null) }

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
// Real special: Power spend, its live (non-visual) projectiles through the projectile pipeline, placed on the target.
function special(f, t, dir, { frames = 70, block = false, keep = false, input = {} } = {}) {
  ready(f)
  if (!keep) A.clearAbilityState()
  f._specialHeldDir = dir; const e = f.energy, hp = t.health
  const ok = A.triggerSpecial(f, ctxOf(f, t)), spent = e - f.energy   // Power spent by the press (the open dome's drain is separate)
  let hits = 0, firstAt = null
  if (ok) for (let frame = 1; frame <= frames; frame++) {
    tick(f, t, 1, input)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly && p.owner === f)) {
      if (firstAt == null) firstAt = frame
      t.isBlocking = block; p.x = t.x + t.w / 2; p.y = t.y + t.h / 2
      C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); hits++
      const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
    }
  }
  t.isBlocking = false
  return { ok, spent, dealt: hp - t.health, hits, firstAt }
}
// the frame (after the press) the first live projectile of `name` appears
function spawnFrame(f, t, dir, name, max = 60) {
  ready(f); A.clearAbilityState(); f._specialHeldDir = dir
  assert(A.triggerSpecial(f, ctxOf(f, t)), 'special ' + name)
  for (let i = 1; i <= max; i++) { tick(f, t); f.attackCooldown = Math.max(0, f.attackCooldown - 1); const p = A.activeProjectiles.find(p => p.name === name && p.owner === f); if (p) { const d = p.damage; clearProj(); return { at: i, dmg: d } } }
  return { at: null, dmg: 0 }
}
const dashTap = (f, t) => { tick(f, t, 1, { right: true }); tick(f, t, 1, {}); tick(f, t, 1, { right: true }) }
const oppHit = (f, cat, attacker) => benAlienStruck(f, cat === 'PROJECTILE' ? { kind: 'projectile', proj: { name: 'kunai' }, attacker }
  : cat === 'GRAB' ? { kind: 'grab', attacker } : { kind: 'melee', move: { name: cat === 'LOW' ? 'down' : 'light' }, attacker, air: cat === 'AIR' })

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 80],
  ['2. Low, Heavy, Brain Bolt (open)', ['low', 'heavy', 'boltOpen'], 108],
  ['3. Psychic Pull, Heavy, Calculated Strike (READ active)', ['pull', 'heavy', 'strikeRead'], 112],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Brain Bolt with the dome OPEN (12 Power, 1 hit, lightning ×1.25, +1 Synapse)', () => {
  const f = ben(), t = foe(); openDome(f); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  const o = special(f, t, null); assert(o.ok); assert.equal(o.spent, BS_COST.bolt); assert.equal(o.hits, 1); assert(o.dealt > 0)
  assert.equal(S(f).syn.pips, 1); assert.equal(f.comboCounter, 3); console.log('   HP', [...d, o.dealt].join('+'))
})
test('route 3 live: Psychic Pull (14 Power), Heavy, Calculated Strike (→→, READ active: +30%)', () => {
  const f = ben(), t = foe(); reset(f, t, 200)
  const p = special(f, t, 'D', { frames: 50 }); assert(p.ok); assert.equal(p.spent, BS_COST.pull); assert(p.dealt > 0)
  reset(f, t); const h = melee(f, t, 'heavy'); reset(f, t); ready(f)
  oppHit(f, 'HIGH', t); oppHit(f, 'HIGH', t); assert(readArmed(S(f)), 'READ armed')
  const hp = t.health, e = f.energy; dashTap(f, t); f._specialHeldDir = 'F'; assert(A.triggerSpecial(f, ctxOf(f, t)), 'Calculated Strike')
  assert.equal(e - f.energy, BS_COST.strike); assert.equal(S(f).read.consumed, 1, 'READ consumed by the strike')
  world(f, t, 40); const cs = hp - t.health; assert(cs > 0, 'strike damage'); assert.equal(f.comboCounter, 3)
  console.log('   HP', p.dealt, '+', h, '+', cs)
})

// ── 4 the dome ─────────────────────────────────────────────────────────────────────────────────────────────
test('4. Dome: 18f open / 24f close, committed; Block + Light via the blockLight hook never jabs', () => {
  const f = ben(), t = foe(); assert.equal(S(f).dome, 'closed')
  assert.equal(BRAINSTORM.blockLight(f), true); assert.equal(S(f).dome, 'opening'); assert.equal(f._benPowerCommit, BS_DOME.OPEN, 'committed (no walk / jump / guard)'); assert.equal(S(f).noAttack, true, 'no throw')
  assert.equal(C.startMove(f, 'light', BA.light), false, 'no normals while it moves')
  let n = 0; while (S(f).dome !== 'open' && n < 60) { tick(f, t); n++ }; assert.equal(n, BS_DOME.OPEN); assert.equal(f._benPowerCommit, 0)
  BRAINSTORM.blockLight(f); n = 0; while (S(f).dome !== 'closed' && n < 60) { tick(f, t); n++ }; assert.equal(n, BS_DOME.CLOSE)
  assert.equal(S(f).toggles, 2)
})
test('4. Dome: no toggle in hitstun, during his own active frames or during the ultimate', () => {
  const f = ben(), t = foe(); f.hitstun = 10; BRAINSTORM.blockLight(f); assert.equal(S(f).dome, 'closed', 'hitstun'); f.hitstun = 0
  assert(C.startMove(f, 'heavy', BA.heavy)); while (!(f.currentAttack.total - f.currentAttack.timer >= f.currentAttack.activeStart)) C.updateCombat(f, t, {}, {})
  BRAINSTORM.blockLight(f); assert.equal(S(f).dome, 'closed', 'active frames'); ready(f)
  S(f).ult = { phase: 'opener', t: 0 }; BRAINSTORM.blockLight(f); assert.equal(S(f).dome, 'closed', 'ultimate'); S(f).ult = null
  BRAINSTORM.blockLight(f); assert.equal(S(f).dome, 'opening', 'free → toggles')
})
test('4. Dome: closed ×1.10 / open ×0.80 defense, lightning ×1.25 only while open, +2 Power/s only while open, frame-set swap', () => {
  const f = ben(), t = foe(); tick(f, t)
  assert(Math.abs(f.defenseMultiplier - 1.10) < 1e-9); assert.equal(f._skinAnim, BS_CLOSED_ANIM)
  const dmgIn = g => { const hp = g.health; C.applyScaledDamage(g, 100, { attacker: t, source: 'ability', scale: 1 }); return hp - g.health }
  const closedIn = dmgIn(f)
  assert.equal(BRAINSTORM.damageDealt(f, t, 100, { move: 'bs_ltn_bolt' }), 100, 'closed: no lightning bonus')
  let e = f.energy; tick(f, t, 60); assert.equal(f.energy, e, 'closed: no extra drain')
  openDome(f); assert(Math.abs(f.defenseMultiplier - 0.80) < 1e-9); assert.equal(f._skinAnim, BS_OPEN_ANIM)
  const openIn = dmgIn(f); assert(Math.abs(openIn / closedIn - 1.10 / 0.80) < 0.02, `open takes ${openIn} vs closed ${closedIn}`)
  assert.equal(BRAINSTORM.damageDealt(f, t, 100, { move: 'bs_ltn_bolt' }), 125, 'open: lightning ×1.25')
  assert.equal(BRAINSTORM.damageDealt(f, t, 100, { move: 'bs_pull' }), 100, 'non-lightning untouched')
  e = f.energy; tick(f, t, 60); assert(Math.abs((e - f.energy) - BS_DOME.DRAIN_PER_SEC) < 1e-6, `open drain ${e - f.energy}`)
})
test('4. Dome: a lightning special while CLOSED opens the dome first (+18f), buffered once; Psychic Pull works closed', () => {
  const f = ben(), t = foe()
  const closed = spawnFrame(f, t, null, 'bs_ltn_bolt'); assert.equal(closed.at, BS_DOME.OPEN + BS_BOLT.STARTUP, `closed press: bolt at ${closed.at}`)
  assert.equal(S(f).dome, 'open')
  const open = spawnFrame(f, t, null, 'bs_ltn_bolt'); assert.equal(open.at, BS_BOLT.STARTUP, 'open press: normal startup')
  const g = ben(); BRAINSTORM.blockLight(g); tick(g, t, 5); g._specialHeldDir = 'B'; A.clearAbilityState()
  assert(A.triggerSpecial(g, ctxOf(g, t)), 'pressed while opening → buffered'); assert.equal(S(g).buffer.kind, 'burst')
  let at = null; for (let i = 1; i <= 50 && at == null; i++) { tick(g, t); if (A.activeProjectiles.some(p => p.name === 'bs_ltn_burst')) at = i }
  assert.equal(at, (BS_DOME.OPEN - 5) + BS_BURST.STARTUP, 'buffered burst fires when the dome is up'); clearProj()
  const h = ben(); const pull = spawnFrame(h, t, 'D', 'bs_pull'); assert.equal(pull.at, BS_PULL.STARTUP, 'Psychic Pull: no dome needed'); assert.equal(S(h).dome, 'closed')
})

// ── 5 Pattern Read ─────────────────────────────────────────────────────────────────────────────────────────
test('5. Pattern Read: categories from the struck hook (live melee HIGH / LOW, AIR, PROJECTILE, GRAB); READ at 2 of the last 3', () => {
  const f = ben(), t = foe('goku', 60); const s = S(f)
  const hitBy = key => { t.attacking = false; t.currentAttack = null; t.attackCooldown = 0; f.hitstun = 0
    const md = characters.goku.basic_attacks[key]; C.startMove(t, key, md); const hp = f.health
    for (let i = 0; i < 40 && f.health === hp && t.attacking; i++) { t.hitstop = 0; C.updateCombat(t, f, {}, {}); C.resolveAttackHit(t, f, [], {}) } }
  hitBy('light'); hitBy('crouchLight'); assert.deepEqual(s.read.log, ['HIGH', 'LOW']); assert.equal(s.read.cat, null)
  hitBy('light'); assert.deepEqual(s.read.log, ['HIGH', 'LOW', 'HIGH']); assert.equal(s.read.cat, 'HIGH'); assert.equal(s.read.t, BS_READ.DUR)
  const g = ben(); oppHit(g, 'AIR', t); oppHit(g, 'PROJECTILE', t); oppHit(g, 'GRAB', t); assert.deepEqual(S(g).read.log, ['AIR', 'PROJECTILE', 'GRAB']); assert.equal(S(g).read.cat, null, '3 different: no READ')
  oppHit(g, 'GRAB', t); assert.equal(S(g).read.cat, 'GRAB')
  const b = ben(); f.isBlocking = true; t.isBlocking = false; b.isBlocking = true; t.attacking = false; t.attackCooldown = 0
  C.startMove(t, 'light', characters.goku.basic_attacks.light); const bs = b.blockstun
  for (let i = 0; i < 40 && b.blockstun === bs && t.attacking; i++) { t.hitstop = 0; C.updateCombat(t, b, {}, {}); C.resolveAttackHit(t, b, [], {}) }
  assert.deepEqual(S(b).read.log, ['HIGH'], 'a BLOCKED attack is logged too')
  const gr = ben(), gt = foe('goku', 50); gt.x = gr.x + 40; gt.onGround = true; gr.onGround = true; gt.comboCounter = 0
  assert(C.resolveGrab(gt, gr, {}), 'live throw connects'); assert.deepEqual(S(gr).read.log, ['GRAB'], 'resolveGrab reports GRAB')
})
test('5. Pattern Read: next special startup −3f and +30% damage when the latest attack (≤90f) matches; consumed once', () => {
  const f = ben(), t = foe(); openDome(f)
  oppHit(f, 'LOW', t); oppHit(f, 'LOW', t); assert.equal(S(f).read.cat, 'LOW')
  const r = spawnFrame(f, t, null, 'bs_ltn_bolt'); assert.equal(r.at, BS_BOLT.STARTUP - 3); assert(Math.abs(r.dmg - BS_BOLT.DMG * 1.3) < 1e-9, `dmg ${r.dmg}`)
  assert.equal(S(f).read.cat, null, 'consumed'); assert.equal(S(f).read.lock, BS_READ.LOCK - (BS_BOLT.STARTUP - 3), 'lockout running')
  const n = spawnFrame(f, t, null, 'bs_ltn_bolt'); assert.equal(n.at, BS_BOLT.STARTUP, 'consumed: back to normal'); assert.equal(n.dmg, BS_BOLT.DMG)
  const g = ben(); openDome(g); oppHit(g, 'LOW', t); oppHit(g, 'LOW', t); oppHit(g, 'HIGH', t)
  assert.equal(S(g).read.cat, 'LOW'); assert.equal(spawnFrame(g, t, null, 'bs_ltn_bolt').at, BS_BOLT.STARTUP, 'latest attack does not match: no boost')
  assert.equal(S(g).read.cat, 'LOW', 'not consumed')
  const h = ben(); openDome(h); oppHit(h, 'AIR', t); oppHit(h, 'AIR', t); tick(h, t, BS_READ.RECENT + 1)
  assert.equal(spawnFrame(h, t, null, 'bs_ltn_bolt').at, BS_BOLT.STARTUP, 'latest attack older than 90f: no boost')
})
test('5. Pattern Read: 300f expiry, 300f lockout after a consume, cleared on swap', () => {
  const f = ben(), t = foe(); oppHit(f, 'HIGH', t); oppHit(f, 'HIGH', t); tick(f, t, BS_READ.DUR - 1); assert.equal(S(f).read.cat, 'HIGH'); tick(f, t); assert.equal(S(f).read.cat, null, 'expired at 300f')
  oppHit(f, 'HIGH', t); assert.equal(S(f).read.cat, 'HIGH', 'can re-READ after an expiry')
  oppHit(f, 'HIGH', t); spawnFrame(f, t, 'D', 'bs_pull'); assert.equal(S(f).read.consumed, 1)
  oppHit(f, 'GRAB', t); oppHit(f, 'GRAB', t); assert.equal(S(f).read.cat, null, 'locked after a consume')
  tick(f, t, BS_READ.LOCK); oppHit(f, 'GRAB', t); assert.equal(S(f).read.cat, 'GRAB', 'lockout over')
  assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'brainstorm')); assert.equal(S(f).read.cat, null); assert.deepEqual(S(f).read.log, [])
})

// ── 6 Synapse → Short-Circuit ─────────────────────────────────────────────────────────────────────────────
test('6. Synapse: one pip per cast (Neural Burst: 3 ticks, final only), Psychic Pull none, blocks none, max 3 → SHORT-CIRCUIT', () => {
  const f = ben(), t = foe(); openDome(f)
  const b = special(f, t, 'B', { frames: 40 }); assert.equal(b.hits, BS_BURST.TICKS); assert.equal(b.spent, BS_COST.burst); assert.equal(S(f).syn.pips, 1, 'burst: one pip')
  reset(f, t, 200); special(f, t, 'D', { frames: 50 }); assert.equal(S(f).syn.pips, 1, 'pull: no pip')
  reset(f, t); special(f, t, null, { block: true }); assert.equal(S(f).syn.pips, 1, 'blocked bolt: no pip')
  reset(f, t); special(f, t, null); assert.equal(S(f).syn.pips, 2)
  reset(f, t); f.onGround = f.grounded = false; f.y = 100; const o = special(f, t, null, { frames: 30 }); assert(o.ok && o.hits === 1, 'Overcharge hits'); f.onGround = f.grounded = true; f.y = 410 - f.h
  assert.equal(S(f).syn.pips, 0, 'third pip → consumed'); assert.equal(S(f).syn.scs, 1, 'SHORT-CIRCUIT'); assert(S(f).syn.scT > BS_SYN.SC - 31 && S(f).syn.scT <= BS_SYN.SC, `240f window running (${S(f).syn.scT})`)
  reset(f, t); special(f, t, null); assert.equal(S(f).syn.pips, 0, 'no pips while Short-Circuit is active')
  const g = ben(); S(g).syn.pips = 2; S(g).syn.pipT = 1; tick(g, t); assert.equal(S(g).syn.pips, 0, 'pips expire 240f after the last')
})
test('6. Short-Circuit: opponent specials +6f startup and +50% cost; authored frame data, input polling and the clock untouched; 360f immunity', () => {
  for (const key of ['goku', 'naruto']) {
    const f = ben(), t = foe(key, 300), ctx = { p1: f, p2: t, ...STAGE }
    const authored = JSON.stringify(t.specials)
    A.clearAbilityState(); t._specialHeldDir = null; let e = t.energy
    assert(A.triggerSpecial(t, ctx)); const base = e - t.energy; assert(base > 0, key + ' special costs energy')
    ready(t); t.energy = 100; A.clearAbilityState()
    addSynapse(S(f), 101); addSynapse(S(f), 102); addSynapse(S(f), 103); assert(S(f).syn.scT > 0)
    assert.deepEqual(benAlienSpecialTax(f, t), { startup: BS_SYN.STARTUP, costMult: BS_SYN.COST })
    e = t.energy; assert(A.triggerSpecial(t, ctx), 'taxed press accepted'); assert.equal(e - t.energy, 0, 'nothing spent during the stall')
    assert.equal(t.attackCooldown, BS_SYN.STARTUP, 'held 6f (no other action)'); assert.equal(A.triggerSpecial(t, ctx), false, 'no second press while held')
    let n = 0; while (t._benTaxedSpecial && n < 20) { A.tickBenAlienForm(f, {}, ctx); if (t._benTaxedSpecial) t.attackCooldown = Math.max(0, t.attackCooldown - 1); n++ }
    assert.equal(n, BS_SYN.STARTUP, `${key}: fired ${n}f after the press`)
    assert(Math.abs((e - t.energy) - base * BS_SYN.COST) < 1e-9, `${key}: cost ${e - t.energy} vs ${base} × 1.5`)
    assert.equal(JSON.stringify(t.specials), authored, 'authored specials table unchanged')
  }
  const f = ben(), t = foe(); S(f).syn.scT = 1; tick(f, t); assert.equal(S(f).syn.scT, 0); assert.equal(S(f).syn.immune, BS_SYN.IMMUNE, '360f immunity')
  assert.equal(benAlienSpecialTax(f, t), null, 'no tax after it ends'); assert.equal(addSynapse(S(f), 999), false, 'immune: no pips')
  tick(f, t, BS_SYN.IMMUNE); assert.equal(addSynapse(S(f), 1000), true, 'immunity over')
  const plain = fresh('goku'); assert.equal(benAlienSpecialTax(foe('naruto'), plain), null, 'no-op without Brainstorm')
})

// ── 7 Mind Shield ──────────────────────────────────────────────────────────────────────────────────────────
const enemyShot = (f, t, name = 'kiBlast', extra = {}) => { const p = { name, owner: t, damage: 40, vx: -12, vy: 0, x: f.x + f.w / 2, y: f.y + f.h / 2, w: 30, h: 20, radius: 10, lifetime: 60, hitstun: 12, ...extra }; A.activeProjectiles.push(p); return p }
test('7. Mind Shield: catches ONE non-beam projectile, throws it back at original speed with 50%, ownership transferred; 7 s cooldown', () => {
  const f = ben(), t = foe(); clearProj()
  assert.equal(BRAINSTORM.blockHeavy(f), true); assert.equal(S(f).shield.t, BS_SHIELD.WINDOW)
  const hp = f.health; enemyShot(f, t); C.resolveProjectileHitsMulti(A.activeProjectiles, [f])
  assert.equal(f.health, hp, 'caught: no damage'); assert.equal(A.activeProjectiles.length, 0); assert.equal(S(f).shield.caught, 1)
  tick(f, t); const r = A.activeProjectiles.find(p => p.owner === f)
  assert(r, 'thrown back'); assert.equal(r.owner, f, 'ownership transferred'); assert.equal(r.damage, 20, '50% damage'); assert.equal(Math.abs(r.vx), 12, 'original speed'); assert(r.vx > 0, 'toward the opponent')
  clearProj(); const hp2 = f.health; enemyShot(f, t); C.resolveProjectileHitsMulti(A.activeProjectiles, [f]); assert(f.health < hp2, 'only ONE caught per window'); clearProj()
  f.hitstun = 0; assert.equal(BRAINSTORM.blockHeavy(f), false, 'cooldown'); tick(f, t, BS_SHIELD.CD - 2); f.hitstun = 0; assert.equal(BRAINSTORM.blockHeavy(f), false, 'still cooling at 419f'); tick(f, t); assert.equal(BRAINSTORM.blockHeavy(f), true, '7 s (420f) cooldown over')
})
test('7. Mind Shield: closed only; beams and melee pass through; no invulnerability', () => {
  const f = ben(), t = foe(); clearProj(); openDome(f); assert.equal(BRAINSTORM.blockHeavy(f), false, 'open: unavailable')
  const g = ben(); BRAINSTORM.blockHeavy(g); let hp = g.health; enemyShot(g, t, 'gokuKamehameha'); C.resolveProjectileHitsMulti(A.activeProjectiles, [g]); assert(g.health < hp, 'beam passes through'); clearProj()
  assert(isBeam({ name: 'supHeatVision' }) && isBeam({ beam: true }) && !isBeam({ name: 'kiBlast' }))
  const h = ben(), m = foe('goku', 60); BRAINSTORM.blockHeavy(h); hp = h.health; C.startMove(m, 'light', characters.goku.basic_attacks.light)
  for (let i = 0; i < 40 && h.health === hp && m.attacking; i++) { m.hitstop = 0; C.updateCombat(m, h, {}, {}); C.resolveAttackHit(m, h, [], {}) }
  assert(h.health < hp, 'melee passes through'); assert.equal(h.invulnTimer || 0, 0, 'no invulnerability')
})

// ── 8 Psychic Pull ─────────────────────────────────────────────────────────────────────────────────────────
test('8. Psychic Pull: reaches 300 px, pulls 160 px toward him (never through), 20 dmg, +14 on hit; whiff = 20f recovery', () => {
  const f = ben(), t = foe(); clearProj(); reset(f, t, f.w + 260); const x0 = t.x, hp = t.health
  ready(f); A.clearAbilityState(); f._specialHeldDir = 'D'; assert(A.triggerSpecial(f, ctxOf(f, t)))
  world(f, t, BS_PULL.STARTUP + BS_PULL.ACTIVE + 12)
  assert(t.health < hp, 'connects at range'); assert(Math.abs((x0 - t.x) - BS_PULL.DIST) < 1, `pulled ${x0 - t.x}`); assert.equal(S(f).stats.pullHits, 1)
  const g = ben(); clearProj(); reset(g, t, g.w + 400); ready(g); A.clearAbilityState(); g._specialHeldDir = 'D'; A.triggerSpecial(g, ctxOf(g, t))
  const total0 = g.attackCooldown; let n = 0; while ((g.attackCooldown > 0 || n === 0) && n < 100) { world(g, t); n++ }
  assert.equal(total0, BS_PULL.STARTUP + BS_PULL.ACTIVE + BS_PULL.RECOVERY); assert.equal(n, BS_PULL.STARTUP + BS_PULL.ACTIVE + BS_PULL.WHIFF, `whiff total ${n}`)
  const h = ben(); clearProj(); reset(h, t, h.w + 60); const x1 = t.x; ready(h); A.clearAbilityState(); h._specialHeldDir = 'D'; A.triggerSpecial(h, ctxOf(h, t)); world(h, t, 40)
  assert(t.x + t.w / 2 - (h.x + h.w / 2) >= (h.w + t.w) / 2, 'never pulled through him'); assert(t.x <= x1)
  const q = ben(), u = foe(); reset(q, u); ready(q); A.clearAbilityState(); q._specialHeldDir = 'D'; A.triggerSpecial(q, ctxOf(q, u))
  for (let i = 0; i < BS_PULL.STARTUP; i++) { tick(q, u); timers(q) }
  for (const p of A.activeProjectiles.filter(p => p.name === 'bs_pull')) { p.x = u.x + u.w / 2; p.y = u.y + u.h / 2 }
  C.resolveProjectileHitsMulti(A.activeProjectiles, [u]); clearProj()
  assert.equal(u.hitstun - q.attackCooldown, BS_PULL.ON_HIT + 1, `+14 on hit (hitstun ${u.hitstun} vs his ${q.attackCooldown})`)
})

// ── 9 Overcharge ───────────────────────────────────────────────────────────────────────────────────────────
test('9. Overcharge: air only, once per airtime, no jump refill; a column under him', () => {
  const f = ben(), t = foe(); openDome(f); f.onGround = f.grounded = false; f.y = 80; f.jumpCount = 2; ready(f); A.clearAbilityState()
  f._specialHeldDir = null; const e0 = f.energy; assert(A.triggerSpecial(f, ctxOf(f, t)), 'Overcharge'); assert.equal(e0 - f.energy, BS_COST.overcharge)
  tick(f, t, BS_OC.STARTUP); const col = A.activeProjectiles.find(p => p.name === 'bs_ltn_overcharge'); assert(col, 'column spawned'); assert(col.y > f.y + f.h, 'below him')
  clearProj(); ready(f); f._specialHeldDir = null; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime'); assert.equal(f.jumpCount, 2, 'no jump refill')
  f.onGround = f.grounded = true; tick(f, t); f.onGround = f.grounded = false; ready(f); assert(A.triggerSpecial(f, ctxOf(f, t)), 'refreshed after landing'); clearProj()
})

// ── 10 Neural Tempest ──────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false } = {}) {
  A.clearAbilityState(); ready(f); f.energy = 100
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }; const thome = { x: t.x, y: t.y }
  let lockAtEnd = null, drawn = 0, keys = new Set(), lift = 0
  const ctx2d = { save() {}, restore() {}, fillRect() { drawn++ }, set fillStyle(v) {}, set globalAlpha(v) {} }
  for (let i = 0; i < 300; i++) {
    const was = !!S(f).ult; tick(f, t); t.isBlocking = block
    if (S(f).ult?.home) { Object.keys(S(f).ult).forEach(k => keys.add(k)); if (S(f).ult.t === 60) drawBrainstormUnder(ctx2d, f); const o = benAlienBodyOffset(t, f); if (o) lift = Math.min(lift, o.dy) }
    if (was && !S(f).ult && lockAtEnd == null) lockAtEnd = { cd: f.attackCooldown, x: f.x, y: f.y, tx: t.x, ty: t.y }
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti(A.activeProjectiles, [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) }
  }
  t.isBlocking = false
  return { ok, dealt: hp - t.health, home, thome, lockAtEnd, drawn, keys, lift }
}
test('10. Neural Tempest: 55 Power, forced OPEN; whiff / block = no capture (60f); clean = 40 + 5×24 + 90 = 250; restore; dome CLOSED; READ clears', () => {
  let f = ben(), t = foe(); f.energy = 50; A.clearAbilityState(); assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false, 'rejected below 55 Power')
  f = ben(); t = foe(); A.clearAbilityState(); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t))); assert.equal(f.energy, 45); assert.equal(S(f).dome, 'open', 'forced OPEN')
  assert.equal(f.attackCooldown, BS_ULT.OPENER_AT + BS_ULT.WHIFF, '60f whiff recovery'); clearProj()
  f = ben(); t = foe(); let r = ult(f, t, { far: true }); assert(r.ok); assert.equal(r.dealt, 0); assert.equal(S(f).lastUltRaw, 0, 'whiff: no cinematic'); assert.equal(S(f).dome, 'closed')
  f = ben(); t = foe(); r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, 0, 'blocked: no cinematic')
  f = ben(); t = foe(); reset(f, t); oppHit(f, 'HIGH', t); oppHit(f, 'HIGH', t); assert.equal(S(f).read.cat, 'HIGH'); r = ult(f, t)
  assert.equal(S(f).lastUltRaw, BS_ULT.OPENER + 5 * BS_ULT.BOLT + BS_ULT.FINAL); assert.equal(S(f).lastUltRaw, 250)
  assert.equal(S(f).ult, null); assert.equal(r.lockAtEnd.x, r.home.x, 'position restores'); assert.equal(r.lockAtEnd.y, r.home.y)
  assert.equal(r.lockAtEnd.tx, r.thome.x, 'opponent position restores'); assert.equal(r.lockAtEnd.cd, BS_ULT.LOCKOUT, '110f lockout')
  assert.equal(S(f).dome, 'closed', 'dome returns to CLOSED'); assert.equal(S(f).read.cat, null); assert.deepEqual(S(f).read.log, [], 'READ clears')
  assert(r.lift < -20, `held opponent lifted (render-only offset ${r.lift})`); assert.equal(t.y, r.thome.y, 'no collision change')
  assert(r.drawn > 0, 'stage dimmed mid-cinematic'); let after = 0; drawBrainstormUnder({ save() {}, restore() {}, fillRect() { after++ } }, f); assert.equal(after, 0, 'lights restored')
  assert.deepEqual([...r.keys].sort(), ['angles', 'cast', 'face', 'hits', 'home', 'phase', 'raw', 't', 'thome'], 'no glyph / bolt objects in GAME_STATE (angles are 5 numbers)')
  assert.equal(S(f).syn.scs, 1, '+3 Synapse → Short-Circuit'); assert(S(f).syn.scT > 0); console.log('   HP dealt', r.dealt)
  f = ben(); t = foe(); reset(f, t); S(f).syn.immune = 200; ult(f, t); assert.equal(S(f).syn.scs, 0, 'immune: no pips'); assert.equal(S(f).syn.pips, 0)
})
test('10. Neural Tempest: bolt angles = hash(seed, frame, player) — identical for the same seed, different for another', () => {
  const run = seed => { SEED = seed; FRAME = 1000; const f = ben(), t = foe(); reset(f, t); ult(f, t); SEED = 4242; return S(f).lastUltAngles }
  const a = run(7), b = run(7), c = run(8)
  assert.equal(a.length, 5); assert.deepEqual(a, b, 'same seed → same angles'); assert.notDeepEqual(a, c, 'another seed → other angles')
  assert(Math.abs(a[0] - bsHash(7, 1000 + 2 + BS_ULT.OPENER_AT + BS_ULT.BOLTS_AT[0] - 0, 0, 0) * Math.PI * 2) < 10, 'hash-derived angle')
})

// ── 11 swap / revert / KO / rematch ────────────────────────────────────────────────────────────────────────
test('11. swap / revert / KO / rematch clear the dome, READ, Synapse and Short-Circuit', () => {
  const dirty = f => { const s = S(f); s.dome = 'open'; s.read.cat = 'LOW'; s.read.t = 100; s.read.log = ['LOW', 'LOW']; s.syn.pips = 2; s.syn.scT = 100; s.shield.cd = 50 }
  const f = ben(); dirty(f)
  assert(F.applyAlien(f, 'goop')); assert.notEqual(f.omnitrix.formState?.kind, 'brainstorm', 'swap clears')
  assert(F.applyAlien(f, 'brainstorm')); const s = S(f)
  assert.equal(s.dome, 'closed'); assert.equal(s.read.cat, null); assert.deepEqual(s.read.log, []); assert.equal(s.syn.pips, 0); assert.equal(s.syn.scT, 0); assert.equal(s.shield.cd, 0)
  assert(Math.abs(f.defenseMultiplier - 1.10) < 1e-9, 'closed defense on re-apply')
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears')
  const t = foe(); assert.equal(benAlienSpecialTax(f, t), null, 'no Short-Circuit after revert')
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null, 'KO revert clears')
  const g = ben(); assert.equal(S(g).dome, 'closed', 'rematch: fresh state'); assert.equal(S(g).syn.scT, 0)
})

// ── 12 PICK FIVE (the brief's slot-9 test; the owner kept 5 slots — Brainstorm is a pick, not a new slot) ────
test('12. pick five: slot count from the registry (5), Brainstorm READY + pickable, no ready alien overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('brainstorm'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 9, 'catalog slot 9 (metadata only)')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'brainstorm').length, 1, 'one registry entry')
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT); assert(getAvailableAlienKeys(false).includes('brainstorm'))
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet from fun-tech\.tk/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit line')
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Brainstorm'); assert.equal(f.health, 950, 'shared health')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.85 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.85')
})
test('12. picked loadout: Brainstorm in the last dial slot and the transform reaches it', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'brainstorm']
  const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick)
  assert.deepEqual(f.omnitrix.aliens, pick); f.energy = 100; assert(F.ben10TransformOrSwap(f, BEN10_SLOT_COUNT - 1, { seed: 1, frame: 0, playerIndex: 0 }), 'last slot accepted')
  for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
  assert.equal(f.activeAlien, 'brainstorm')
})
test('12. Vow pick includes Brainstorm (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'brainstorm'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('brainstorm') && picks.size === L.length, 'Vow reaches every slot incl. Brainstorm')
})
test('12. same-seed determinism: an identical scripted Brainstorm sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; const f = ben(), t = foe(); melee(f, t, 'light'); special(f, t, null); reset(f, t); special(f, t, 'B', { frames: 60 })
    oppHit(f, 'LOW', t); oppHit(f, 'LOW', t); reset(f, t, 200); special(f, t, 'D', { frames: 50 }); BRAINSTORM.blockHeavy(f); tick(f, t, 30)
    reset(f, t); dashTap(f, t); f._specialHeldDir = 'F'; ready(f); A.triggerSpecial(f, ctxOf(f, t)); world(f, t, 40); reset(f, t); ult(f, t); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast: dome, bolt, burst, pull drag, strike, Short-Circuit hold, ult cinematic', () => {
  const f = ben(), t = foe(); A.clearAbilityState(); f._specialHeldDir = null; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 10); assert.equal(S(f).dome, 'opening'); assert.doesNotThrow(() => JSON.stringify(f.omnitrix)); tick(f, t, 30); clearProj()
  ready(f); f._specialHeldDir = 'B'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 14); assert(S(f).burst); JSON.stringify(S(f)); tick(f, t, 40); clearProj()
  ready(f); reset(f, t, 200); f._specialHeldDir = 'D'; A.triggerSpecial(f, ctxOf(f, t)); world(f, t, BS_PULL.STARTUP + 3); assert(S(f).pull); JSON.stringify(S(f)); world(f, t, 30); clearProj()
  ready(f); reset(f, t, 300); dashTap(f, t); f._specialHeldDir = 'F'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 12); assert(S(f).strike); JSON.stringify(S(f)); world(f, t, 30); clearProj()
  const u = ben(), v = foe(); reset(u, v); A.clearAbilityState(); u.energy = 100; A.triggerUltimate(u, ctxOf(u, v))
  for (let i = 0; i < 60; i++) { tick(u, v); for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti(A.activeProjectiles, [v]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) } }
  assert(S(u).ult && S(u).ult.phase !== 'opener', 'mid-cinematic'); assert.doesNotThrow(() => JSON.stringify(S(u))); clearProj()
  const w = ben(), x = foe(); addSynapse(S(w), 1); addSynapse(S(w), 2); addSynapse(S(w), 3); x._specialHeldDir = null; A.triggerSpecial(x, { p1: w, p2: x, ...STAGE }); assert(x._benTaxedSpecial); assert.doesNotThrow(() => JSON.stringify(x._benTaxedSpecial))
})
test('no Math.random / gameRng in brainstorm.js / brainstormAssets.js', () => {
  for (const file of ['../brainstorm.js', '../brainstormAssets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

console.log(`BRAINSTORM: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
