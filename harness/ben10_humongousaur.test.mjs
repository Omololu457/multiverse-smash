// HUMONGOUSAUR — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_humongousaur.test.mjs
// Design totals: raw move damage × the form's damage mod (1.15) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 12 (the brief's "slot 14 via the Dial"): PICK FIVE (owner decision) — the dial is positional over the 5 picked aliens,
// and catalog slot 14 is Upgrade (never overwritten), so Humongousaur's catalog slot is 15 (ready slots stay contiguous);
// he is picked into the loadout and reached with the Dial (↓↓ + slot key) like any other pick.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as H from '../humongousaur.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'humongousaur', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const foe = (key = 'goku', x = 500) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); if (ch?.animationData) t.animationData = ch.animationData; t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
const STAGE = { stageLeft: 0, stageWidth: 1600 }
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
const { HUMONGOUSAUR, HM_SIZE, HM_TIERS, HM_COST } = H
const BA = HUMONGOUSAUR.basic_attacks, DM = HUMONGOUSAUR.mods.damage
const LOAD = ['heatblast', 'goop', 'xlr8', 'upgrade_ov', 'humongousaur']
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const cx = o => o.x + (o.w || 60) / 2
const setSize = (f, v) => { const z = S(f).size; z.v = v; z.idleT = 0; z.giantT = 0; z.shrinkT = 0; if (v >= HM_SIZE.MAX) z.giantT = HM_SIZE.GIANT }
const hit = (f, t, opts = {}) => HUMONGOUSAUR.onContact(f, t, { move: { name: 'light' }, blocked: false, ...opts })
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

// ── 4 Growth ─────────────────────────────────────────────────────────────────────────────────────────────────
test('4. Growth: Size starts at 0 on transform; +5 per landed hit, +3 blocked', () => {
  const f = ben(), t = foe(); assert.equal(S(f).size.v, 0); assert.equal(H.tierKey(S(f)), 'normal')
  hit(f, t); assert.equal(S(f).size.v, HM_SIZE.HIT)
  hit(f, t, { blocked: true }); assert.equal(S(f).size.v, HM_SIZE.HIT + HM_SIZE.BLOCKED)
})
test('4. Growth: a real landed normal (combat pipeline) feeds Size through onContact', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 20); melee(f, t, 'light'); assert.equal(S(f).size.v, HM_SIZE.HIT)
})
test('4. Growth: after 120f without a gain the gauge decays 1 per frame', () => {
  const f = ben(), t = foe(); far(f, t); setSize(f, 30)
  step(f, t, HM_SIZE.IDLE); assert.equal(S(f).size.v, 30, 'no decay inside 120f')
  step(f, t, 10); assert.equal(S(f).size.v, 20, '−1/f after')
  hit(f, t); step(f, t, 60); assert.equal(S(f).size.v, 25, 'a gain resets the idle clock')
})
test('4. Growth: tier thresholds 39 / 40 / 79 / 80 / 99 / 100', () => {
  const f = ben(), t = foe(); far(f, t)
  for (const [v, k] of [[0, 'normal'], [39, 'normal'], [40, 'large'], [79, 'large'], [80, 'huge'], [99, 'huge']]) { setSize(f, v); assert.equal(H.tierKey(S(f)), k, `Size ${v}`) }
  setSize(f, 96); hit(f, t); assert.equal(S(f).size.v, 100); assert.equal(H.tierKey(S(f)), 'giant', 'reaching 100 = GIANT')
})
test('4. Growth: per-tier stats — damage, speed, reach, hurtbox scale (GAME_STATE values)', () => {
  const f = ben(), t = foe(); far(f, t); const base = S(f).baseSpeed
  for (const k of ['normal', 'large', 'huge', 'giant']) {
    setSize(f, HM_TIERS[k].min); step(f, t, 1); const T = HM_TIERS[k]
    assert.equal(H.tierKey(S(f)), k)
    assert(Math.abs(f._benWalkSpeed - base * T.speed) < 1e-9, `${k} speed ×${T.speed}`)
    assert(Math.abs(HUMONGOUSAUR.damageDealt(f, t, 100, { attacker: f }) - 100 * T.dmg) < 1e-9, `${k} damage ×${T.dmg}`)
    const md = HUMONGOUSAUR.moveFrames(f, 'heavy', BA.heavy); assert.equal(md.rangeX, Math.round(BA.heavy.rangeX * T.reach), `${k} reach ×${T.reach}`)
    const hb = C.getHurtbox(f), w0 = f.w - 12, h0 = f.h - 6
    assert(Math.abs(hb.w - w0 * T.hurt) < 1e-6 && Math.abs(hb.h - h0 * T.hurt) < 1e-6, `${k} hurtbox ×${T.hurt}`)
    assert(Math.abs(hb.y + hb.h - (f.y + f.h)) < 1e-6 && Math.abs(hb.x + hb.w / 2 - cx(f)) < 1e-6, `${k} hurtbox feet-anchored, centred`)
  }
  assert.equal(BA.heavy.rangeX, 190, 'the authored table is never mutated')
})
test('4. Growth: the enlarged hurtbox is hittable (a trade) and clipped to the stage, never inside a wall', () => {
  const f = ben(), t = foe(); setSize(f, 100); step(f, t, 1)
  f.x = 2; const hb = C.getHurtbox(f); assert(hb.x >= STAGE.stageLeft, 'left wall'); assert(hb.x + hb.w > f.x + f.w, 'still covers his body')
  f.x = STAGE.stageWidth - f.w - 2; const hr = C.getHurtbox(f); assert(hr.x + hr.w <= STAGE.stageWidth, 'right wall')
  f.x = 600; const big = C.getHurtbox(f); assert(big.w > f.w && big.h > f.h, 'GIANT body bigger than the physics box: the opponent hits more, not less')
})
test('4. Growth: GIANT lasts 300f then SHRINK 150f (Size 0, speed −20%, damage −10%, no gains), then NORMAL', () => {
  const f = ben(), t = foe(); far(f, t); const base = S(f).baseSpeed; setSize(f, 100)
  step(f, t, HM_SIZE.GIANT - 1); assert.equal(H.tierKey(S(f)), 'giant'); assert.equal(S(f).size.v, 100, 'GIANT never decays')
  step(f, t, 1); assert.equal(H.tierKey(S(f)), 'shrink'); assert.equal(S(f).size.v, 0)
  step(f, t, 1); assert(Math.abs(f._benWalkSpeed - base * 0.8) < 1e-9, 'speed −20%'); assert(Math.abs(HUMONGOUSAUR.damageDealt(f, t, 100, {}) - 90) < 1e-9, 'damage −10%')
  hit(f, t); assert.equal(S(f).size.v, 0, 'no Size gains while exhausted')
  step(f, t, HM_SIZE.SHRINK - 2); assert.equal(H.tierKey(S(f)), 'shrink'); step(f, t, 1); assert.equal(H.tierKey(S(f)), 'normal')
  hit(f, t); assert.equal(S(f).size.v, HM_SIZE.HIT, 'gains again')
})
test('4. Growth: GIANT takes −20% from projectiles; HOLD THE LINE (LARGE+) −20% guard drain, no guard pushback', () => {
  const f = ben(), t = foe(); far(f, t)
  setSize(f, 100); assert.equal(HUMONGOUSAUR.damageTaken(f, 100, { source: 'projectile' }), 80); assert.equal(HUMONGOUSAUR.damageTaken(f, 100, { source: 'melee' }), 100)
  setSize(f, 0); assert.equal(HUMONGOUSAUR.damageTaken(f, 100, { source: 'block-chip' }), 100, 'NORMAL: ordinary guard')
  setSize(f, 50); assert.equal(HUMONGOUSAUR.damageTaken(f, 100, { source: 'block-chip' }), 80, 'LARGE: chip −20%')
  f.isBlocking = true; assert.equal(HUMONGOUSAUR.damageTaken(f, 100, { source: 'projectile' }), 80, 'projectile chip −20% while guarding'); f.isBlocking = false
  f.blockstun = 10; f.vx = -5; step(f, t, 1); assert.equal(f.vx, 0, 'no pushback in blockstun at LARGE')
  setSize(f, 10); f.blockstun = 10; f.vx = -5; A.tickBenAlienForm(f, {}, ctxOf(f, t)); assert.equal(f.vx, -5, 'NORMAL: untouched')
})
test('4. Growth: the drawn scale follows the tier in fixed steps (frame-set swap; never interpolated)', () => {
  const f = ben(), t = foe(); far(f, t); const seen = new Set()
  for (let v = 0; v <= 99; v++) { setSize(f, v); step(f, t, 1); seen.add(f._skinAnim.idle.actionScale) }
  setSize(f, 100); step(f, t, 1); seen.add(f._skinAnim.idle.actionScale)
  const base = HUMONGOUSAUR.anim.idle.actionScale
  assert.deepEqual([...seen].sort(), [1, 1.2, 1.35, 1.5].map(k => +(base * k).toFixed(4)).sort(), 'exactly four render steps')
})
test('11. Swap / revert / KO / rematch clear Size and Shrink', () => {
  const f = ben('humongousaur', LOAD); setSize(f, 100)
  assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'humongousaur')); f.transformed = true
  assert.equal(S(f).size.v, 0); assert.equal(S(f).size.giantT, 0)
  S(f).size.shrinkT = 50; F.applyAlien(f, 'heatblast'); F.applyAlien(f, 'humongousaur'); assert.equal(S(f).size.shrinkT, 0, 'Shrink cleared by a swap')
})

console.log(`\nHUMONGOUSAUR: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
