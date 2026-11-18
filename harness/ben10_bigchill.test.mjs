// BIG CHILL — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_bigchill.test.mjs
// Design totals: raw move damage × the form's damage mod (1.05) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Slot (the brief's "slot 17 via the Dial"): PICK FIVE (owner decision 2026-11-18, no new dial slots) — the dial is
// positional over the 5 picked aliens, catalog slot 17 is Arcticguana (never overwritten), so Big Chill's catalog slot is 18
// (ready slots stay contiguous); he is picked into the loadout and reached with the Dial (↓↓ + slot key) like any other pick.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../arcticguana.js'
import * as B from '../bigchill.js'
import { tickFlightDriver, isFlying, getFlightProfile } from '../flight.js'
import { clearBenFormState } from '../ben10State.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'bigchill', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
const step = (f, t, n = 1, tKeys = {}, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
  A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t)); physics.moveFighter(t, tKeys, CONTROLS); physics.applyGravity(t); timers(f); timers(t) } }
const cast = (f, t, dir) => { ready(f); f._specialHeldDir = dir; return A.triggerSpecial(f, ctxOf(f, t)) }
const far = (f, t) => { t.x = f.x + 1000 }
const shot = (t, x, y, extra = {}) => { const p = { name: 'ki_blast', owner: t, x, y, vx: -8, vy: 0, w: 20, h: 20, damage: 30, lifetime: 120, ...extra }; A.activeProjectiles.push(p); return p }
const { BIGCHILL, BC_COST } = B
const BA = BIGCHILL.basic_attacks, DM = BIGCHILL.mods.damage
const LOAD = ['heatblast', 'goop', 'arcticguana', 'humongousaur', 'bigchill']
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
const motion = (f, dirs) => { const s = S(f); for (const d of dirs) { s.t++; s.hist.push({ d, t: s.t }); s.lastDir = d } }

// ── 2 registry + stats ──────────────────────────────────────────────────────────────────────────────────────
test('2. registry: one READY entry, catalog slot 18 (contiguous after Arcticguana 17), sheet + ledger exist, no ready alien overwritten', () => {
  const d = getAlienDefinition('bigchill'); assert(d && d.status === 'ready', 'ready'); assert.equal(d.slot, 18)
  const ready = BEN10_ALIEN_REGISTRY.filter(a => a.status === 'ready').map(a => a.slot).sort((a, b) => a - b)
  assert.deepEqual(ready, ready.map((_, i) => i + 1), 'contiguous'); assert.equal(getAlienDefinition('arcticguana').slot, 17, 'Arcticguana kept')
  assert(fs.existsSync(d.sheetPath.replace('./', '')) && fs.existsSync(d.ledgerPath) && fs.existsSync('assets/sprites/ben10/aliens/bigchill.png'))
  assert(getAvailableAlienKeys().includes('bigchill'))
})
test('2. stats: speed ×1.00 / damage ×1.05 / defense ×0.95 / weight ×0.80, double jump, shared health', () => {
  const f = ben()
  assert(Math.abs(f.damageMultiplier - 1.05) < 1e-9 && Math.abs(f.defenseMultiplier - 0.95) < 1e-9 && Math.abs(f._benWeight - 0.80) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 1.00 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×1.00')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 950, 'shared health'); assert.equal(f.activeAlienName, 'Big Chill')
})
test('2. normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, extra) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (extra) extra(m) }
  chk('light', 5, 16, 1); chk('heavy', 13, 50, -6, m => { assert.equal(m.rangeX, 180); assert(m.bcShatter) }); chk('down', 7, 22, -3, m => assert.equal(m.hitLevel, 'low'))
  chk('up', 11, 42, -9, m => assert(m.launcher)); chk('air', 7, 26, 2)
})
test('2. normals connect through the real combat pipeline', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { const f = ben(), t = foe(); reset(f, t, 10); assert(melee(f, t, k) > 0, k) }
})
test('2. shared motion inputs: 236 / 214 / 623 / 412 / →→ / air, and the held-direction fallback', () => {
  const pick = (dirs, extra) => { const f = ben(); const s = S(f); if (dirs) motion(f, dirs); if (extra) extra(f, s); return B.pickSpecial(f, s) }
  assert.equal(pick([2, 3, 6]), 'breath'); assert.equal(pick([2, 1, 4]), 'wingcut'); assert.equal(pick([6, 2, 3]), 'spire'); assert.equal(pick([4, 1, 2]), 'cocoon')
  assert.equal(pick(null, (f, s) => { s.t = 50; s.dashTapT = 45 }), 'drift'); assert.equal(pick(null, f => { f.onGround = f.grounded = false }), 'dive')
  assert.equal(pick(null, f => { f._specialHeldDir = 'B' }), 'wingcut'); assert.equal(pick(null, f => { f._specialHeldDir = 'U' }), 'spire')
  assert.equal(pick(null, f => { f._specialHeldDir = 'D' }), 'cocoon'); assert.equal(pick(null), 'breath')
})
test('2. no Math.random / gameRng in bigchill.js', () => { const src = fs.readFileSync('bigchill.js', 'utf8'); assert(!/Math\.random|gameRng/.test(src)) })

// ── 3 flight ────────────────────────────────────────────────────────────────────────────────────────────────
const { BC_FLIGHT } = B
const flyLoop = (f, t, n, input = { jump: true, up: true }, each) => { let flying = 0, minY = f.y
  for (let i = 0; i < n; i++) {
    physics.moveFighter(f, { w: !!input.jump, a: !!input.left, d: !!input.right, s: !!input.down }, CONTROLS); A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); tickFlightDriver(f); physics.applyGravity(f)
    if (f._flightCtl && isFlying(f)) { flying++; minY = Math.min(minY, f.y); assert.equal(f.jumpCount, 2, 'jumps not refilled') }
    if (each) each(f, i)
    if (f.onGround) break
  } return { flying, minY } }
const airborne = (f, t) => { f.onGround = f.grounded = false; f.y = 250; f.vy = 0; f.jumpCount = 2; A.tickBenAlienForm(f, {}, ctxOf(f, t)) }
test('3/4. flight: profile cruise 6.0 / moderate drag / 200f / grounded 40; hold Jump → fly, ≤ 200f per airtime, apex + 200 cap, no jump refill', () => {
  const f = ben(), t = fresh('goku', 900); const p = getFlightProfile(f)
  assert(p && p.maxH === 6.0 && p.drag === 0.70 && p.energyMax === 200 && p.groundedLock === 40 && p.maxAirDash === 0, 'bigchill profile')
  airborne(f, t); const apex = S(f).apexY; const { flying, minY } = flyLoop(f, t, 320)
  assert(flying <= BC_FLIGHT.MAX && flying >= BC_FLIGHT.MAX - 12, `≤ 200 flying frames (${flying})`)
  assert(minY >= apex - BC_FLIGHT.CAP - 1e-6, `no altitude past apex + 200 (${minY} vs ${apex - BC_FLIGHT.CAP})`)
  assert.equal(S(f).flights, 1, 'one takeoff per airtime (the budget does not refill in the air)')
})
test('3/4. flight: 8-direction steering (left / right / down while held), knocked out by a hard hit → 40f grounded lock', () => {
  const f = ben(), t = fresh('goku', 900); airborne(f, t); flyLoop(f, t, 14); assert(isFlying(f), 'flying'); const x0 = f.x, y0 = f.y
  flyLoop(f, t, 20, { jump: true, up: true, right: true }); assert(f.x > x0 + 20, 'steers right')
  const x1 = f.x; flyLoop(f, t, 20, { jump: true, up: true, left: true }); assert(f.x < x1 - 20, 'steers left')
  const g = ben(), u = fresh('goku', 900); airborne(g, u); flyLoop(g, u, 14); assert(isFlying(g)); g.hitstun = 20; A.tickBenAlienForm(g, { jump: true }, ctxOf(g, u))
  assert(!isFlying(g)); assert.equal(g._flightCtl.groundedLock, 40, 'grounded 40f')
})
test('3/4. wings follow the flight flag only: closed on the ground / in a plain jump, 6f opening, open while flying (render pose, no lock)', () => {
  const f = ben(), t = fresh('goku', 900); assert.equal(B.bcWings(f), 'closed', 'ground: closed'); airborne(f, t); assert.equal(B.bcWings(f), 'closed', 'plain jump: closed')
  const seen = []; flyLoop(f, t, 40, undefined, g => seen.push(B.bcWings(g)))
  const first = seen.indexOf('opening'); assert(first >= 0, 'opening'); assert.equal(seen.slice(first, first + BC_FLIGHT.OPEN).every(w => w === 'opening'), true, '6f opening'); assert.equal(seen[first + BC_FLIGHT.OPEN], 'open')
  assert.equal(f.attacking, false); assert(!(f._benPowerCommit > 0), 'the transition is not a gameplay lock')
  clearBenFormState(f); assert.equal(f._alienFlightProfile, undefined, 'swap / revert wipe the flight profile')
})

// ── 4 shared ice ────────────────────────────────────────────────────────────────────────────────────────────
const { AG_CHILL } = B
const pip = (f, t, cast, extra = {}) => BIGCHILL.onContact(f, t, { proj: { alien: { chill: 1, cast, ...extra } }, blocked: false, ...extra.info })
// the fixed +25 through the engine's own scaling (applyScaledDamage: combo scale × the global damage scale), as Arcticguana
const shatterHp = f => { const r = foe(); const h = r.health; C.applyScaledDamage(r, AG_CHILL.SHATTER * C.getComboScale(f), { attacker: f, source: 'ability', move: 'ag_shatter' }); return h - r.health }
const freeze = (f, t, base = 100) => { for (let i = 0; i < 3; i++) pip(f, t, base + i); return S(f).chill.frozen }
test('5. shared ice: the SAME rule object as Arcticguana (3 pips, 240f expiry, 30 ticks, 420f immunity, +25 shatter)', () => {
  assert.equal(B.AG_CHILL, G.AG_CHILL); assert.deepEqual([AG_CHILL.MAX, AG_CHILL.EXPIRE, AG_CHILL.FREEZE, AG_CHILL.IMMUNE, AG_CHILL.SHATTER], [3, 240, 30, 420, 25])
})
test('5. pips: one per cast, max 3 → Popsicle; never from blocks or untagged FX; 240f expiry', () => {
  const f = ben(), t = foe(); reset(f, t)
  pip(f, t, 1); pip(f, t, 1); assert.equal(S(f).chill.pips, 1, 'one per cast')
  BIGCHILL.onContact(f, t, { proj: { alien: { chill: 1, cast: 2 } }, blocked: true }); assert.equal(S(f).chill.pips, 1, 'no pip on block')
  BIGCHILL.onContact(f, t, { proj: { alien: { cast: 3 } } }); assert.equal(S(f).chill.pips, 1, 'no pip from an untagged effect')
  step(f, t, AG_CHILL.EXPIRE); assert.equal(S(f).chill.pips, 0, 'expired after 240f')
  pip(f, t, 4); pip(f, t, 5); assert(!S(f).chill.frozen); pip(f, t, 6); assert(S(f).chill.frozen, '3 pips → frozen'); assert.equal(S(f).chill.pips, 0)
})
test('5. Popsicle: held 30 ticks via hitstun leases, then released at once (never stuck), no clock change', () => {
  const f = ben(), t = foe(); reset(f, t); const x0 = t.x; freeze(f, t); const fr0 = FRAME
  for (let i = 0; i < AG_CHILL.FREEZE - 1; i++) { step(f, t, 1); assert(S(f).chill.frozen, 'held ' + i); assert(t.hitstun <= AG_CHILL.HOLD + 1, 'hitstun only leased'); assert.equal(t.x, x0) }
  step(f, t, 2); assert(!S(f).chill.frozen, 'thawed'); assert.equal(t.hitstun, 0, 'released, not stuck'); assert.equal(FRAME - fr0, AG_CHILL.FREEZE + 1, 'the clock ran normally')
})
test('5. Shatter: a clean Heavy on a frozen foe ends it ONCE for +25; a second contact adds nothing', () => {
  const f = ben(), t = foe(); reset(f, t); freeze(f, t); step(f, t, 1); const hp = t.health
  BIGCHILL.onContact(f, t, { move: { name: 'heavy' } }); assert(!S(f).chill.frozen); assert.equal(S(f).chill.shatters, 1)
  assert(Math.abs((hp - t.health) - shatterHp(f)) < 1e-6 && shatterHp(f) > 0, `+25 scaled (${hp - t.health} vs ${shatterHp(f)})`)
  const h2 = t.health; BIGCHILL.onContact(f, t, { move: { name: 'heavy' } }); assert.equal(t.health, h2, 'once')
})
test('5. Shatter: Frost Wing Cut tag also shatters; any other damage (Jab / a beam / Ice Spire) ends it with NO bonus', () => {
  const f = ben(), t = foe(); reset(f, t); freeze(f, t); step(f, t, 1); const hp = t.health
  BIGCHILL.onContact(f, t, { proj: { alien: { shatter: true, cast: 900 } } }); assert.equal(S(f).chill.shatters, 1); assert(Math.abs((hp - t.health) - shatterHp(f)) < 1e-6, 'the same +25')
  const g = ben(), u = foe(); reset(g, u); freeze(g, u); step(g, u, 1); const h2 = u.health
  BIGCHILL.onContact(g, u, { move: { name: 'light' } }); assert(!S(g).chill.frozen); assert.equal(S(g).chill.shatters, 0); assert.equal(u.health, h2, 'no bonus')
  const k = ben(), v = foe(); reset(k, v); freeze(k, v); step(k, v, 1); v.health -= 10; step(k, v, 1); assert(!S(k).chill.frozen, 'any damage ends it'); assert.equal(S(k).chill.ends.at(-1), 'damage')
})
test('5. ONE shared 420f immunity timer: an Arcticguana freeze blocks Big Chill pips (and vice versa), even across a swap', () => {
  const f = ben('arcticguana'), t = foe(); reset(f, t); A.tickBenAlienForm(f, {}, ctxOf(f, t))
  const ga = f.omnitrix.formState; for (let i = 0; i < 3; i++) G.addChill(f, ga, t, 50 + i); assert(ga.chill.frozen, 'Arcticguana froze them')
  G.endPopsicle(f, ga, t, 'expire'); assert(t._benIceImmuneUntil > FRAME, 'immunity on the opponent')
  assert(F.applyAlien(f, 'bigchill')); f.transformed = true; A.tickBenAlienForm(f, {}, ctxOf(f, t)); assert.equal(S(f).kind, 'bigchill')
  for (let i = 0; i < 3; i++) pip(f, t, 60 + i); assert.equal(S(f).chill.pips, 0, 'no pips while the shared immunity runs'); assert(!S(f).chill.frozen)
  FRAME += AG_CHILL.IMMUNE; A.tickBenAlienForm(f, {}, ctxOf(f, t)); freeze(f, t, 70); assert(S(f).chill.frozen, 'after 420f Big Chill freezes')
  B.endPopsicle(f, S(f), t, 'expire')
  assert(F.applyAlien(f, 'arcticguana')); A.tickBenAlienForm(f, {}, ctxOf(f, t)); const g2 = f.omnitrix.formState
  for (let i = 0; i < 3; i++) G.addChill(f, g2, t, 80 + i); assert(!g2.chill.frozen && g2.chill.pips === 0, 'and Arcticguana is blocked by Big Chill\'s thaw')
})
test('5. a mid-freeze swap cannot double-dip (immunity covers the whole freeze + 420f from its start)', () => {
  const f = ben(), t = foe(); reset(f, t); A.tickBenAlienForm(f, {}, ctxOf(f, t)); freeze(f, t); assert(S(f).chill.frozen)
  assert(F.applyAlien(f, 'arcticguana')); A.tickBenAlienForm(f, {}, ctxOf(f, t)); step(f, t, 3); assert.equal(t.hitstun, 0, 'swap releases them (lease lapses)')
  const ga = f.omnitrix.formState; for (let i = 0; i < 3; i++) G.addChill(f, ga, t, 90 + i); assert(!ga.chill.frozen, 'no refreeze')
})

// ── 5 Phase Drift ───────────────────────────────────────────────────────────────────────────────────────────
const { BC_DRIFT } = B
const drift = (f, t) => { ready(f); S(f).dashTapT = S(f).t; return cast(f, t, 'F') }
const glide = (f, t, n, input = {}) => { for (let i = 0; i < n; i++) world(f, t, 1, input) }
test('7. Phase Drift: cost 14, lands 60 px BEHIND the opponent (cast-time spot) facing them, no tracking after', () => {
  const f = ben(), t = foe(); reset(f, t, 80); f.energy = 100; const oc = cx(t)
  assert(drift(f, t), 'cast'); assert.equal(100 - f.energy, BC_COST.drift); assert.equal(S(f).drift.dir, 1)
  glide(f, t, BC_DRIFT.STARTUP + 3); t.x += 150                                   // the foe moves mid-drift: no tracking
  glide(f, t, BC_DRIFT.TRAVEL); const gap = f.x - (oc + t.w / 2)
  assert(Math.abs(gap - BC_DRIFT.BEHIND) < 1.01, `60 px behind the cast-time body (${gap})`); assert.equal(f.facing, -1, 'facing them')
})
test('7. Phase Drift: at most 300 px of travel; never inside a wall / out of bounds (stage clamp)', () => {
  const f = ben(), t = foe(); reset(f, t); t.x = f.x + 900; const x0 = f.x; assert(drift(f, t)); glide(f, t, BC_DRIFT.STARTUP + BC_DRIFT.TRAVEL)
  assert(Math.abs((f.x - x0) - BC_DRIFT.DIST) < 1.01, `300 px cap (${f.x - x0})`)
  const g = ben(), u = foe(); g.x = STAGE.stageWidth - 200; reset(g, u, 10); u.x = STAGE.stageWidth - u.w; assert(drift(g, u))
  for (let i = 0; i < BC_DRIFT.TOTAL; i++) { world(g, u, 1); assert(g.x >= STAGE.stageLeft && g.x + g.w <= STAGE.stageWidth + 1e-6, 'inside the stage ' + i) }
  const h = ben(), v = foe(); h.x = 30; h.facing = -1; v.x = 120; v.facing = -1; reset(h, v, 10); v.x = h.x - 5 - v.w + 40; h.facing = -1
  assert(drift(h, v)); glide(h, v, BC_DRIFT.TOTAL); assert(h.x >= STAGE.stageLeft, 'left wall')
})
test('7. Phase Drift: intangible to physical melee + non-energy projectiles ONLY (energy / fire / electric / beam / ult hit)', () => {
  const f = ben(), t = foe(); reset(f, t, 80); assert(drift(f, t)); glide(f, t, BC_DRIFT.STARTUP + 1); assert(B.driftLive(S(f)))
  const ev = o => BIGCHILL.evade(f, o)
  assert.equal(ev({ move: { name: 'heavy', damage: 40 }, attacker: t }), true, 'physical melee passes')
  assert.equal(ev({ proj: { name: 'kunai', damage: 20 } }), true, 'physical projectile passes')
  for (const p of [{ name: 'fire_ball', fire: true }, { name: 'zap', electric: true }, { name: 'laser_beam', beam: true }, { name: 'energy_orb', energy: true }, { name: 'kunai', isUltimate: true }])
    assert.equal(ev({ proj: p }), false, p.name + ' still hits')
  assert.equal(ev({ move: { name: 'flame_punch', fire: true }, attacker: t }), false, 'fire melee still hits')
  assert.equal(BIGCHILL.phasing(f), true, 'no pushbox'); assert.equal(S(f).noBlock, true)
  // through the real projectile pipeline
  const hp = f.health; A.activeProjectiles.push({ name: 'kunai', owner: t, x: cx(f), y: f.y + 40, vx: -1, vy: 0, w: 30, h: 30, damage: 30, lifetime: 30 })
  C.resolveProjectileHitsMulti(A.activeProjectiles, [f]); assert.equal(f.health, hp, 'kunai passed through')
  clearProj(); A.activeProjectiles.push({ name: 'fire_ball', fire: true, owner: t, x: cx(f), y: f.y + 40, vx: -1, vy: 0, w: 30, h: 30, damage: 30, lifetime: 30 })
  C.resolveProjectileHitsMulti(A.activeProjectiles, [f]); assert(f.health < hp, 'fire hits'); clearProj()
  const g = ben(), u = foe(); reset(g, u, 80); assert(drift(g, u)); assert.equal(BIGCHILL.evade(g, { move: { name: 'heavy' }, attacker: u }), false, 'startup frames are tangible')
})
test('7. Phase Drift: no attack during the drift; 5 s cooldown; the optional wing slash (35, no Chill)', () => {
  const f = ben(), t = foe(); reset(f, t, 80); assert(drift(f, t)); glide(f, t, 6)
  assert.equal(BIGCHILL.moveFrames(f, 'light', BA.light), false, 'no normals'); assert.equal(S(f).noAttack, true)
  f.attacking = false; f.attackCooldown = 0; f._benPowerCommit = 0; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'no specials')
  glide(f, t, BC_DRIFT.TOTAL); assert.equal(S(f).drift, null, 'ended with no slash'); assert.equal(A.activeProjectiles.filter(p => p.alien?.bc === 'slash').length, 0)
  ready(f); S(f).dashTapT = S(f).t; f.energy = 100; assert.equal(cast(f, t, 'F'), false, 'cooldown'); world(f, t, BC_DRIFT.CD); ready(f); assert(drift(f, t), 'after 300f')
  const g = ben(), u = foe(); reset(g, u, 80); assert(drift(g, u)); glide(g, u, BC_DRIFT.STARTUP + 4, { heavy: true }); glide(g, u, BC_DRIFT.TRAVEL)
  u.x = g.x - 70 - u.w + 20; u.y = g.y + g.h - u.h; const hp = u.health; glide(g, u, 30)
  assert(S(g).stats.drifts === 1 && hp - u.health > 0, `slash connects (${hp - u.health})`); assert.equal(S(g).chill.pips, 0, 'no Chill')
})

//@@NEXT@@
console.log(`BIG CHILL: ${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
