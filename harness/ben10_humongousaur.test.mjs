// HUMONGOUSAUR — Ben 10 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_humongousaur.test.mjs
// Design totals: raw move damage × the form's damage mod (1.15) × 0.85^n (85% per move), within ±20%. The live routes then
// run the real engine (its own curve) and assert the mechanics.
// Test 12 (the brief's "slot 14 via the Dial"): PICK FIVE (owner decision) — the dial is positional over the 5 picked aliens,
// and catalog slot 14 is Upgrade (never overwritten), so Humongousaur's catalog slot is 15 (ready slots stay contiguous);
// he is picked into the loadout and reached with the Dial (↓↓ + slot key) like any other pick.
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
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
// ── 5 Tremor → Topple ────────────────────────────────────────────────────────────────────────────────────────
const { HM_TREMOR } = H
const tag = (f, t, hm, cast, { blocked = false, pip = 1, tierPip = false } = {}) => HUMONGOUSAUR.onContact(f, t, { proj: { alien: { hm, pip, tierPip, cast } }, blocked })
test('5. Tremor: one pip per cast however many ticks hit; blocks give none; max 3', () => {
  const f = ben(), t = foe(); far(f, t); const r = () => S(f).tremor
  tag(f, t, 'quake', 1); tag(f, t, 'quake', 1); assert.equal(r().pips, 1, 'two ticks of one cast = 1 pip')
  tag(f, t, 'tackle', 2, { blocked: true }); assert.equal(r().pips, 1, 'blocked: no pip')
  tag(f, t, 'roar', 3, { pip: 0, tierPip: true }); assert.equal(r().pips, 1, 'Roar below HUGE: no pip')
  tag(f, t, 'push', 4, { pip: 0 }); assert.equal(r().pips, 1, 'Push Through: no pip')
  tag(f, t, 'tackle', 5); assert.equal(r().pips, 2)
})
test('5. Tremor: pips expire 240f after the last one', () => {
  const f = ben(), t = foe(); far(f, t)
  tag(f, t, 'quake', 1); step(f, t, 100); tag(f, t, 'stomp', 2); step(f, t, HM_TREMOR.EXPIRE - 1); assert.equal(S(f).tremor.pips, 2, 'refreshed by the 2nd')
  step(f, t, 1); assert.equal(S(f).tremor.pips, 0, 'gone 240f after the last')
})
test('5. Tremor: HUGE+ — Roar and Quake Slam add +1 pip; Tackle / Stomp unchanged', () => {
  const f = ben(), t = foe(); far(f, t); setSize(f, 85)
  tag(f, t, 'roar', 1, { pip: 0, tierPip: true }); assert.equal(S(f).tremor.pips, 1, 'Roar at HUGE = 1')
  tag(f, t, 'tackle', 2); assert.equal(S(f).tremor.pips, 2, 'Tackle = 1')
  const g = ben(); setSize(g, 85); tag(g, t, 'quake', 1, { tierPip: true }); assert.equal(S(g).tremor.pips, 2, 'Quake at HUGE = 2')
})
test('5. TOPPLE: 3 pips → exactly one forced knockdown (existing rules), no extra stun, pips consumed, 360f immunity', () => {
  const f = ben(), t = foe(); far(f, t); t.hitstun = 7
  const before = JSON.stringify({ x: t.x, vx: t.vx, vy: t.vy, energy: t.energy, health: t.health, gib: t.grabInputBuffer, facing: t.facing })
  tag(f, t, 'quake', 1); tag(f, t, 'stomp', 2); assert(!t.knockdownState); tag(f, t, 'tackle', 3)
  assert(t.knockdownState, 'knocked down'); assert.equal(t.knockdownTimer, HM_TREMOR.KD, 'the engine\'s standard knockdown length')
  assert.equal(t.hitstun, 7, 'no extra stun'); assert.equal(S(f).tremor.pips, 0, 'pips consumed'); assert.equal(S(f).tremor.topples, 1)
  assert.equal(JSON.stringify({ x: t.x, vx: t.vx, vy: t.vy, energy: t.energy, health: t.health, gib: t.grabInputBuffer, facing: t.facing }), before, 'nothing else on the opponent changes (no polling, no position, no meter)')
  for (let c = 10; c < 16; c++) tag(f, t, 'quake', c); assert.equal(S(f).tremor.pips, 0, 'immune: pips cannot build')
  step(f, t, HM_TREMOR.IMMUNE); assert.equal(S(f).tremor.immuneT, 0); tag(f, t, 'quake', 20); assert.equal(S(f).tremor.pips, 1, 'builds again after 360f')
})
test('5. TOPPLE never re-arms a fighter already down (no chain-lock) and the knockdown ends by the normal timer', () => {
  const f = ben(), t = foe(); far(f, t); t.knockdownState = true; t.knockdownTimer = 5
  tag(f, t, 'quake', 1); tag(f, t, 'stomp', 2); tag(f, t, 'tackle', 3)
  assert.equal(t.knockdownTimer, 5, 'not re-armed'); assert.equal(S(f).tremor.lastTopple.already, true)
  const g = ben(), u = foe(); far(g, u); for (let c = 1; c <= 3; c++) tag(g, u, 'quake', c)
  let n = 0; while (u.knockdownState && n < 200) { world(g, u, 1); n++ }
  assert.equal(n, HM_TREMOR.KD, 'one knockdown of the standard length'); assert(u.invulnTimer > 0, 'neutral wake-up invulnerability applies')
})
test('5. Tremor: the simulation clock and the opponent\'s inputs are untouched (FRAME advances 1 per world frame)', () => {
  const f = ben(), t = foe(); far(f, t); const f0 = FRAME; for (let c = 1; c <= 3; c++) tag(f, t, 'quake', c); world(f, t, 10)
  assert.equal(FRAME - f0, 10); assert.equal(t._timeSlowFlag, undefined); assert.equal(t._benRootT, undefined); assert.equal(t._benPinT, undefined)
})
test('11. Swap / revert / KO / rematch clear Size, Shrink and Tremor', () => {
  const f = ben('humongousaur', LOAD); setSize(f, 100)
  assert(F.applyAlien(f, 'heatblast')); assert(F.applyAlien(f, 'humongousaur')); f.transformed = true
  assert.equal(S(f).size.v, 0); assert.equal(S(f).size.giantT, 0)
  S(f).size.shrinkT = 50; F.applyAlien(f, 'heatblast'); F.applyAlien(f, 'humongousaur'); assert.equal(S(f).size.shrinkT, 0, 'Shrink cleared by a swap')
  const t = foe(); far(f, t); f.transformed = true; tag(f, t, 'quake', 1); S(f).tremor.immuneT = 99; F.applyAlien(f, 'heatblast'); F.applyAlien(f, 'humongousaur')
  assert.equal(S(f).tremor.pips, 0); assert.equal(S(f).tremor.immuneT, 0, 'Tremor state cleared by a swap')
})

// ── 6-10 moves ──────────────────────────────────────────────────────────────────────────────────────────────
const { HM_TACKLE, HM_QUAKE, HM_ROAR, HM_CRUSH, HM_PUSH, HM_STOMP, HM_ULT } = H
const own = (f, hm) => A.activeProjectiles.filter(p => p.owner === f && p.alien && p.alien.hm === hm)
test('normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, extra) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (extra) extra(m) }
  chk('light', 6, 22, 0); chk('heavy', 15, 64, -7, m => assert.equal(m.rangeX, 190)); chk('down', 8, 28, -4, m => { assert.equal(m.hitLevel, 'low'); assert.equal(m.rangeX, 170) })
  chk('up', 12, 52, -10, m => assert(m.launcher)); chk('air', 8, 34, 2)
  const f = ben(); assert(Math.abs(f._benWeight - 1.5) < 1e-9 && Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 1.2) < 1e-9 && Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 1.15) < 1e-9, 'mods 1.15 / 1.20 / 1.50')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.85 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.85')
})
test('Charging Tackle: 12f startup, 340 px real travel on a whiff, no tracking, cost 12', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); t.y -= 400; const x0 = f.x, e = f.energy; S(f).dashTapT = S(f).t
  assert(cast(f, t, 'F'), 'Tackle'); assert.equal(e - f.energy, HM_COST.tackle)
  world(f, t, HM_TACKLE.STARTUP); assert.equal(f.x, x0, 'no travel in startup')
  world(f, t, HM_TACKLE.FRAMES + 1); assert.equal(f.x - x0, HM_TACKLE.TRAVEL, '340 px (the last lunge lands on the next physics step)'); world(f, t, HM_TACKLE.RECOVERY + 2); assert.equal(S(f).tackle, null)
})
test('Charging Tackle: one hit 55 (+1 Tremor), −14 on block, cornered +10 once', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 150); S(f).dashTapT = S(f).t; assert(cast(f, t, 'F')); world(f, t, HM_TACKLE.TOTAL)
  assert.equal(S(f).stats.tackleHits, 1, 'one hit'); assert.equal(S(f).tremor.pips, 1); assert.equal(S(f).lastTackle.wall, false)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 150); u.isBlocking = true; S(g).dashTapT = S(g).t; assert(cast(g, u, 'F'))
  let bs = 0; for (let i = 0; i < HM_TACKLE.TOTAL && !bs; i++) { world(g, u, 1); bs = u.blockstun }
  assert.equal(bs, HM_TACKLE.RECOVERY + 1 + HM_TACKLE.ON_BLOCK - 1, 'blockstun (one tick consumed) = −14 frame advantage'); assert.equal(S(g).tremor.pips, 0, 'blocked: no pip')
  clearProj(); const w = ben(), v = foe(); w.x = STAGE.stageWidth - 420; reset(w, v, 150); v.x = STAGE.stageWidth - v.w - 2
  S(w).dashTapT = S(w).t; assert(cast(w, v, 'F')); const spawned = []; for (let i = 0; i < HM_TACKLE.TOTAL; i++) { world(w, v, 1); for (const p of own(w, 'tackle')) spawned.push(p.damage) }
  assert.equal(S(w).lastTackle.wall, true, 'cornered'); assert(spawned.every(d => d === HM_TACKLE.DMG + HM_TACKLE.WALL), '65 raw'); assert.equal(S(w).stats.walls, 1, 'once')
})
test('Quake Slam: 18f startup, 300 px floor line, 2 hits (25 / 35), +1 Tremor once, +10 Size once, cost 14', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 200); const e = f.energy, hp = t.health
  assert(cast(f, t, null), 'Quake'); assert.equal(e - f.energy, HM_COST.quake)
  world(f, t, HM_QUAKE.STARTUP - 1); assert.equal(t.health, hp, 'nothing before 18f'); world(f, t, HM_QUAKE.TOTAL)
  assert(t.health < hp); assert.equal(S(f).quake, null); assert.equal(S(f).tremor.pips, 1, 'one pip per cast'); assert.equal(S(f).size.v, HM_SIZE.QUAKE, '+10 once')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 310); assert(cast(g, u, null)); world(g, u, HM_QUAKE.TOTAL); assert.equal(u.health, 950, 'beyond 300 px: miss')
})
test('Quake Slam: airborne opponents are unaffected (grounded targets only); the floor never changes', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 100); const hp = t.health, top = t.y; assert(cast(f, t, null))
  for (let i = 0; i < HM_QUAKE.TOTAL; i++) { t.y = top - 90; t.vy = 0; t.onGround = t.grounded = false; world(f, t, 1) }
  assert.equal(t.health, hp, 'airborne: no damage'); assert.equal(S(f).tremor.pips, 0); assert.equal(t.groundY, 410, 'no floor change')
})
test('Roar: +30 Size, deletes exactly ONE opponent projectile in range (his own untouched), no pip, cost 10', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); const e = f.energy, ox = cx(f), oy = f.y + f.h / 2
  const a = shot(t, ox + 60, oy, { vx: 0 }), b = shot(t, ox + 100, oy, { vx: 0 }), mine = { name: 'x', owner: f, x: ox + 40, y: oy, vx: 0, w: 10, h: 10, lifetime: 99 }; A.activeProjectiles.push(mine)
  assert(cast(f, t, 'B'), 'Roar'); assert.equal(e - f.energy, HM_COST.roar); step(f, t, HM_ROAR.STARTUP)
  assert.equal(S(f).size.v, HM_SIZE.ROAR); assert(!A.activeProjectiles.includes(a), 'nearest deleted'); assert(A.activeProjectiles.includes(b), 'only one'); assert(A.activeProjectiles.includes(mine), 'ownership-aware')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 40); assert(cast(g, u, 'B')); world(g, u, HM_ROAR.TOTAL); assert(u.health < 950, 'hit'); assert.equal(S(g).tremor.pips, 0, 'no pip below HUGE')
  assert(u.x > g.x + g.w, 'pushed away')
})
test('Roar at HUGE (live cast): a clean hit adds the +1 Tremor pip; a blocked one none', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 40); setSize(f, 85); assert(cast(f, t, 'B')); world(f, t, HM_ROAR.TOTAL); assert.equal(S(f).tremor.pips, 1)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 40); setSize(g, 85); u.isBlocking = true; assert(cast(g, u, 'B')); for (let i = 0; i < HM_ROAR.TOTAL; i++) { world(g, u, 1); u.isBlocking = true } assert.equal(S(g).tremor.pips, 0)
})
test('Roar: unavailable during SHRINK (rejected, no cost)', () => {
  const f = ben(), t = foe(); far(f, t); H.startShrink(S(f)); const e = f.energy; assert.equal(cast(f, t, 'B'), false); assert.equal(f.energy, e)
})
test('Crush Grab: 14f, 120 px command grab, 3 ticks × 15 = 45 raw, thrown 160 px, no pip; whiff recovery 30f', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 30); const e = f.energy, hp = t.health; assert(cast(f, t, 'D')); assert.equal(e - f.energy, HM_COST.crush)
  world(f, t, HM_CRUSH.STARTUP + HM_CRUSH.HOLD + HM_CRUSH.RECOVERY + 2)
  const c = S(f).lastCrush; assert.equal(c.result, 'ok'); assert.equal(c.ticks, 3); assert.equal(c.raw, 45); assert(t.health < hp)
  assert(Math.abs(Math.abs(c.thrown) - HM_CRUSH.THROW) < 1e-9, 'thrown 160 px'); assert.equal(S(f).tremor.pips, 0)
  const g = ben(), u = foe(); reset(g, u, 30); u.x = cx(g) + HM_CRUSH.RANGE + 5 - u.w / 2; assert(cast(g, u, 'D')); assert.equal(g.attackCooldown, HM_CRUSH.STARTUP + HM_CRUSH.WHIFF, 'whiff recovery 30f after 14f')
  world(g, u, HM_CRUSH.STARTUP + HM_CRUSH.WHIFF + 1); assert.equal(S(g).lastCrush.result, 'range'); assert.equal(u.health, 950)
})
test('Crush Grab: the standard throw escape (Grab buffered, out of hit / blockstun) techs it', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 30); assert(cast(f, t, 'D')); world(f, t, HM_CRUSH.STARTUP - 1); t.grabInputBuffer = 5; world(f, t, 1)
  world(f, t, 30); assert.equal(S(f).lastCrush.result, 'teched'); assert.equal(t.health, 950)
  const g = ben(), u = foe(); reset(g, u, 30); assert(cast(g, u, 'D')); world(g, u, HM_CRUSH.STARTUP - 1); u.grabInputBuffer = 5; u.hitstun = 10; world(g, u, 1); assert(S(g).crush.held, 'in hitstun: no tech')
})
test('Push Through: 40f cap; WALL SPLAT once (45 + knockdown), never through the wall', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); assert(cast(f, t, 'U'), 'Push'); world(f, t, HM_PUSH.STARTUP + HM_PUSH.MAX + 1)
  assert.equal(S(f).lastPush.t, HM_PUSH.MAX, '40f cap'); assert.equal(S(f).lastPush.result, 'none')
  clearProj(); const g = ben(), u = foe(); g.x = STAGE.stageWidth - 260; reset(g, u, 4); const hp = u.health; assert(cast(g, u, 'U')); let max = 0
  for (let i = 0; i < 70; i++) { world(g, u, 1); max = Math.max(max, u.x + u.w) }
  assert.equal(S(g).lastPush.result, 'splat'); assert.equal(S(g).stats.splats, 1, 'once'); assert(max <= STAGE.stageWidth, 'never through the wall'); assert(u.health < hp)
  assert(S(g).lastPush.kd, 'knockdown'); assert(S(g).lastPush.t <= HM_PUSH.MAX)
})
test('Push Through: otherwise a 20 shove at the end; no pip; the pushed opponent is never locked (bounded 40f, 5 px/f)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 4); const hp = t.health, x0 = t.x; assert(cast(f, t, 'U')); world(f, t, HM_PUSH.STARTUP + HM_PUSH.MAX + 4)
  assert.equal(S(f).lastPush.result, 'shove'); assert(t.health < hp); assert(S(f).lastPush.pushed <= HM_PUSH.PUSH * HM_PUSH.MAX); assert(t.x - x0 >= S(f).lastPush.pushed - 1e-9)
  assert.equal(t.knockdownState, false); assert.equal(S(f).tremor.pips, 0)
})
test('Meteor Stomp: once per airtime, no jump refill, landing shockwave one hit, +1 Tremor once', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 120); f.y -= 160; f.onGround = f.grounded = false; f.jumpCount = 2; const e = f.energy
  assert(cast(f, t, null), 'Stomp'); assert.equal(e - f.energy, HM_COST.stomp); world(f, t, 1)
  ready(f); assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime')
  let n = 0; while (S(f).stomp && n < 80) { world(f, t, 1); n++ }
  assert(S(f).lastStomp.landed, 'landed'); assert.equal(f.jumpCount, 2, 'no jump refill'); assert.equal(S(f).stats.shocks, 1, 'one landing shock')
  world(f, t, 4); assert.equal(S(f).tremor.pips, 1, 'one pip per cast'); assert(t.health < 950)
})
// ── 10 Extinction Event ─────────────────────────────────────────────────────────────────────────────────────
const runUlt = (f, t, size = 60) => { ready(f); f.energy = 100; S(f).size.v = size; S(f).size.idleT = 0; assert(A.triggerUltimate(f, ctxOf(f, t)), 'ult'); let n = 0; while ((S(f).ult || n < 20) && n < 300) { world(f, t, 1); n++ } }
test('10. Ultimate: rejected below Size 40 at no cost; 55 Power otherwise', () => {
  const f = ben(), t = foe(); reset(f, t, 30); ready(f); f.energy = 100; S(f).size.v = 39; assert.equal(A.triggerUltimate(f, ctxOf(f, t)), false); assert.equal(f.energy, 100)
  S(f).size.v = 40; assert(A.triggerUltimate(f, ctxOf(f, t))); assert.equal(100 - f.energy, HM_COST.ultimate)
})
test('10. Ultimate: a whiff or a block = no cinematic, 60f recovery', () => {
  clearProj(); const f = ben(), t = foe(); far(f, t); runUlt(f, t); assert.equal(S(f).lastUlt.captured, false); assert.equal(t.health, 950)
  clearProj(); const g = ben(), u = foe(); reset(g, u, 30); u.isBlocking = true; ready(g); g.energy = 100; S(g).size.v = 60; A.triggerUltimate(g, ctxOf(g, u))
  assert.equal(g.attackCooldown, HM_ULT.OPENER_AT + HM_ULT.WHIFF); let n = 0; while (S(g).ult && n < 100) { world(g, u, 1); u.isBlocking = true; n++ }
  assert.equal(S(g).lastUlt.captured, false, 'blocked: no capture'); assert.equal(H.tierKey(S(g)), 'large', 'no Shrink without the cinematic')
})
test('10. Ultimate: total scales with Size within 240–280; Size → 0 + SHRINK; positions restore; lockout 110f', () => {
  for (const size of [40, 70, 100]) {
    clearProj(); const f = ben(), t = foe(); reset(f, t, 30); const fx = f.x, tx = t.x; runUlt(f, t, size); const u = S(f).lastUlt
    assert(u.captured, 'captured'); const want = HM_ULT.OPENER + 3 * HM_ULT.STOMP + H.ultSlam(size); assert.equal(u.raw, want)
    assert(u.raw >= 240 && u.raw <= 280, `raw ${u.raw}`); assert.equal(u.hits.length, 5)
    assert.equal(H.tierKey(S(f)), 'shrink'); assert.equal(S(f).size.v, 0); assert.equal(f.x, fx, 'his position restores'); assert.equal(u.thome.x, tx)
    console.log(`   Size ${size}: raw ${u.raw}, HP dealt ${950 - t.health}`)
  }
  assert.equal(H.ultSlam(100), HM_ULT.SLAM + HM_ULT.SLAM_MAX, 'max +40')
})
test('10. Ultimate: debris spots come from hash(seed, frame, player) — identical for the same seed, no hitboxes, not in GAME_STATE', () => {
  const run = () => { FRAME = 5000; SEED = 99; clearProj(); const f = ben(), t = foe(); reset(f, t, 30); let boxes = 0
    ready(f); f.energy = 100; S(f).size.v = 60; A.triggerUltimate(f, ctxOf(f, t)); let n = 0
    while ((S(f).ult || n < 20) && n < 300) { world(f, t, 1); boxes = Math.max(boxes, A.activeProjectiles.filter(p => p.owner === f).length); n++; if (S(f).ult) assert(!JSON.stringify(S(f)).includes('debris')) }
    const u = S(f).lastUlt; return { spots: JSON.stringify(H.ultDebris(u.seed, u.f0, u.pi)), boxes } }
  const a = run(), b = run(); assert.equal(a.spots, b.spots); assert(a.boxes <= 1, 'only the opener hitbox ever exists')
  SEED = 4242; assert.notEqual(JSON.stringify(H.ultDebris(1, 5000, 0)), JSON.stringify(H.ultDebris(2, 5000, 0)), 'a different seed → different spots')
})
// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  tackle: HM_TACKLE.DMG, quake: HM_QUAKE.DMG[0] + HM_QUAKE.DMG[1], crush: HM_CRUSH.DMG * 3 }
const model = route => route.reduce((sum, k, i) => sum + RAW[k] * DM * Math.pow(0.85, i), 0)
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 110],
  ['2. Low, Heavy, Charging Tackle', ['low', 'heavy', 'tackle'], 138],
  ['3. Quake Slam, Heavy, Crush Grab', ['quake', 'heavy', 'crush'], 150],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Charging Tackle (+1 Tremor pip)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 120); const hp = t.health; S(f).dashTapT = S(f).t; assert(cast(f, t, 'F'), 'Tackle'); world(f, t, HM_TACKLE.TOTAL); d.push(hp - t.health)
  assert(d[2] > 0); assert.equal(S(f).tremor.pips, 1); assert.equal(f.comboCounter, 3); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 3 live: Quake Slam (2 hits), Heavy, Crush Grab (3 ticks)', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 100); const hp0 = t.health; assert(cast(f, t, null)); world(f, t, HM_QUAKE.TOTAL + 1)
  const d = [hp0 - t.health]; clearProj(); reset(f, t, 10); d.push(melee(f, t, 'heavy'))
  reset(f, t, 30); f.comboCounter = 0; const hp = t.health; assert(cast(f, t, 'D'), 'Crush'); world(f, t, HM_CRUSH.STARTUP + HM_CRUSH.HOLD + 2); d.push(hp - t.health)
  assert(d.every(x => x > 0)); assert.equal(S(f).lastCrush?.ticks ?? S(f).crush?.ticks, 3); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
// ── 11 / 12 lifecycle / slot → PICK FIVE / Dial / Vow / determinism ─────────────────────────────────────────
test('11. revert / KO / rematch clear Size, Shrink and Tremor (formState nulled / fresh)', () => {
  const dirty = f => { const s = S(f); s.size.v = 90; s.tremor.pips = 2; s.tremor.pipT = 100; s.size.shrinkT = 0 }
  const f = ben('humongousaur', LOAD); dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null)
  const k = ben(); dirty(k); k.health = 0; F.revertToHuman(k); assert.equal(k.omnitrix.formState, null)
  const r = ben(); assert.equal(S(r).size.v, 0); assert.equal(S(r).tremor.pips, 0, 'rematch / round end: a fresh form state')
})
test('12. slot → PICK FIVE: slot count stays 5, Humongousaur READY + pickable (catalog slot 15, contiguous), Upgrade (14) untouched', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('humongousaur'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 15); assert.equal(d.displayName, 'Humongousaur')
  const ready = BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready'); assert.deepEqual(ready.map(x => x.slot).sort((a, b) => a - b), ready.map((_, i) => i + 1), 'ready slots contiguous')
  assert.equal(getAlienDefinition('upgrade_ov').slot, 14, 'slot 14 = Upgrade, never overwritten')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin', 'wildvine', 'jetray', 'diamondhead_ov', 'upgrade_ov']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'humongousaur').length, 1); assert(getAvailableAlienKeys(false).includes('humongousaur'))
  assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  assert(/Sheet source: unknown, add credit if known/.test(fs.readFileSync(new URL('../' + d.ledgerPath, import.meta.url), 'utf8')), 'ledger credit placeholder')
  const f = ben(); assert.equal(f.maxJumps, 2); assert.equal(f.activeAlienName, 'Humongousaur'); assert.equal(f.health, 950, 'shared health')
})
test('12. Omnitrix Dial: Humongousaur picked into the last slot — same cost as any slot, no clock change', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'humongousaur'], cost = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    const c = { seed: 1, frame: 0, playerIndex: 0 }; assert(F.ben10TransformOrSwap(f, slot, c)); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60); assert.equal(c.frame, 0, 'clock untouched'); return { f, spent: 100 - f.energy } }
  const a = cost(BEN10_SLOT_COUNT - 1), b = cost(0); assert.equal(a.f.activeAlien, 'humongousaur'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
  assert.equal(S(a.f).size.v, 0, 'starts at Size 0')
})
test('12. HUD: the Size gauge + tier label stay inside the player bar (no overflow), both sides', () => {
  for (const flip of [false, true]) for (const v of [0, 55, 85, 100]) {
    const f = ben(); setSize(f, v); if (v === 100) S(f).size.giantT = 300; let minX = Infinity, maxX = -Infinity
    const ctx = { save() {}, restore() {}, fillRect(x, y, w) { minX = Math.min(minX, x); maxX = Math.max(maxX, x + w) }, fillText(s, x) { const w = s.length * 4.2; const x0 = this.textAlign === 'right' ? x - w : x; minX = Math.min(minX, x0); maxX = Math.max(maxX, x0 + w) }, strokeRect() {} }
    const x = 100, pbw = 120; H.drawHumongousaurHud(ctx, f, { x, enY: 40, enH: 8, pbw, flip }); assert(minX >= x && maxX <= x + 8 + pbw + 1, `flip ${flip} Size ${v}: ${minX}..${maxX}`)
  }
})
test('12. Vow pick includes Humongousaur (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'humongousaur'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('humongousaur') && picks.size === L.length)
})
test('12. same-seed determinism: an identical scripted Humongousaur sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; SEED = 4242; A.clearAbilityState(); const f = ben(), t = foe(); reset(f, t, 10); melee(f, t, 'light'); melee(f, t, 'heavy')
    reset(f, t, 150); S(f).dashTapT = S(f).t; cast(f, t, 'F'); world(f, t, HM_TACKLE.TOTAL)
    reset(f, t, 100); cast(f, t, null); world(f, t, HM_QUAKE.TOTAL + 2); reset(f, t, 30); cast(f, t, 'B'); world(f, t, HM_ROAR.TOTAL + 2)
    reset(f, t, 30); cast(f, t, 'D'); world(f, t, 70); reset(f, t, 4); cast(f, t, 'U'); world(f, t, 70)
    reset(f, t, 30); runUlt(f, t, 80); clearProj()
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data mid-cast (tackle, quake, crush hold, push, stomp, ult cinematic)', () => {
  const plain = o => o === null || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  clearProj(); const f = ben(), t = foe(); reset(f, t, 150); S(f).dashTapT = S(f).t; cast(f, t, 'F'); world(f, t, 16); assert(plain(S(f)), 'tackle')
  clearProj(); const g = ben(), u = foe(); reset(g, u, 30); cast(g, u, 'D'); world(g, u, 20); assert(plain(S(g)), 'crush hold')
  clearProj(); const h = ben(), v = foe(); reset(h, v, 4); cast(h, v, 'U'); world(h, v, 20); assert(plain(S(h)), 'push')
  clearProj(); const u2 = ben(), v2 = foe(); reset(u2, v2, 30); ready(u2); u2.energy = 100; S(u2).size.v = 60; A.triggerUltimate(u2, ctxOf(u2, v2)); world(u2, v2, 80)
  assert(S(u2).ult && S(u2).ult.phase === 'stomps', 'mid-cinematic'); assert(plain(S(u2)), 'ult')
})
test('no Math.random / gameRng in humongousaur.js / humongousaurAssets.js', () => {
  for (const p of ['../humongousaur.js', '../humongousaurAssets.js']) { const src = fs.readFileSync(new URL(p, import.meta.url), 'utf8'); assert(!/Math\.random|gameRng/.test(src), p) }
})

console.log(`\nHUMONGOUSAUR: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
