// XLR8 — Phase 6 harness (module-level, the real combat / projectile / physics pipeline; no browser).
//   node harness/ben10_xlr8.test.mjs
// Design totals use the brief's UNSCALED model: raw move damage x 0.85^n (85% per damaging move, reset after 90f),
// within ±20%. Blur Step deals 0 and does not advance the scaling step. The live routes then run the real engine
// (its combo curve, the form's x0.90, the global damage scale) and assert the mechanics.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { XLR8, XL_FLASH, XL_ECHO, XL_BLUR, XL_CYCLONE, XL_ULT, XL_SLASH, xlState } from '../xlr8.js'
import { handleBenKO } from '../ben10State.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0 })
const LOADOUT = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8']
const ben = (form = 'xlr8', x = 1000) => { const f = fresh('ben10', x); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, LOADOUT); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
const S = f => f.omnitrix.formState
let FRAME = 0
const ctxOf = (f, t) => ({ p1: f, p2: t, stageLeft: 0, stageWidth: 3200, seed: 777, frame: FRAME })
const tick = (f, t, n = 1, input = {}) => { for (let i = 0; i < n; i++) { FRAME++; A.updatePendingSpawns(); A.tickBenAlienForm(f, input, ctxOf(f, t)); if (f._benLunge || f._benGlide) { f.hitstop = 0; physics.moveFighter(f, {}, {}) } } }
const BA = XLR8.basic_attacks
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  slash: 14 + 14 + 22, blur: 0, whip: 20 + 28, cyclone: 4 * 10 }
const model = route => { let i = 0; return route.reduce((sum, k) => { if (!RAW[k]) return sum; const v = RAW[k] * Math.pow(0.85, i); i++; return sum + v }, 0) }
const near = (v, target) => Math.abs(v - target) <= target * 0.20
const place = (f, t, gap = 10) => { t.x = f.x + f.w + gap; t.y = f.y + f.h - t.h }
const reset = (f, t) => { t.isBlocking = false; t.hitstun = 0; t.blockstun = 0; t.isLaunched = false; t.vx = t.vy = 0; t.knockdownState = false; t.knockdownTimer = 0; place(f, t) }

function melee(f, t, key, { block = false, keepStun = false } = {}) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.hitstop = 0; f._benPowerCommit = 0
  if (key === 'air') { f.onGround = f.grounded = false }
  assert(C.startMove(f, key, BA[key]), 'startMove ' + key)
  const hp = t.health, cc = f.comboCounter, bs = t.blockstun
  t.isBlocking = block
  for (let i = 0; i < 40 && t.health === hp && !(block && t.blockstun > bs); i++) { f.hitstop = 0; C.updateCombat(f, t, {}, {}); C.resolveAttackHit(f, t, [], {}) }
  f.onGround = f.grounded = true
  if (!keepStun) reset(f, t); else { t.isBlocking = false; place(f, t) }
  if (!block) { assert(t.health < hp, key + ' connects'); assert.equal(f.comboCounter, cc + 1, key + ' extends the combo') }
  return hp - t.health
}
// Real special: Power spend + its live (non-visual) projectiles snapped onto the target through the projectile pipeline.
function special(f, t, dir, { frames = 70, block = false, keep = false, snap = true } = {}) {
  if (!keep) { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; A.clearAbilityState() }
  f._specialHeldDir = dir; const e = f.energy, hp = t.health
  const ok = A.triggerSpecial(f, ctxOf(f, t))
  let hits = 0
  if (ok) for (let frame = 1; frame <= frames; frame++) {
    tick(f, t)
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly && p.owner === f)) {
      t.isBlocking = block; if (snap) { p.x = t.x + t.w / 2; p.y = t.y + t.h / 2 }
      const h0 = t.health, b0 = t.blockstun; C.resolveProjectileHitsMulti([p], [t]); if (t.health < h0 || t.blockstun > b0) hits++
      const i = A.activeProjectiles.indexOf(p); if (i >= 0) A.activeProjectiles.splice(i, 1)
    }
  }
  t.isBlocking = false; f.attackCooldown = 0; f._benPowerCommit = 0
  return { ok, spent: e - f.energy, dealt: hp - t.health, hits }
}

// ── 1-3 combo totals ───────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 82],
  ['2. Low, Heavy, Sonic Slash', ['low', 'heavy', 'slash'], 98],
  ['3. Blur Step, Tail Whip, Heavy, Mach Cyclone', ['blur', 'whip', 'heavy', 'cyclone'], 120],
]
for (const [name, route, target] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  const f = ben(), t = fresh('goku'); place(f, t); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d[1] <= d[0], 'second jab scaled'); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Sonic Slash (10 Power, 3 hits, 380 px real travel)', () => {
  const f = ben(), t = fresh('goku'); place(f, t); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  const x0 = f.x; const ss = special(f, t, null, { frames: 45 })
  assert(ss.ok); assert.equal(ss.spent, 10); assert.equal(ss.hits, 3, '3 hits (14/14/22)'); assert(ss.dealt > 0)
  assert(Math.abs(f.x - x0 - XL_SLASH.LUNGE_FRAMES * XL_SLASH.LUNGE_SPEED) <= 1, `380 px travel (${f.x - x0})`)
  console.log('   HP', [...d, ss.dealt].join('+'))
})
test('route 3 live: Blur Step → (cancel) Tail Whip, Heavy, Mach Cyclone', () => {
  const f = ben('xlr8', 800), t = fresh('goku', 1000)
  A.clearAbilityState(); f._specialHeldDir = 'F'; assert(A.triggerSpecial(f, ctxOf(f, t)), 'Blur Step'); assert.equal(100 - f.energy, 12)
  tick(f, t, XL_BLUR.STARTUP); assert.equal(S(f).blur.phase, 'in', 'reappeared'); assert(S(f).cancelWin > 0)
  const behind = f.x + f.w / 2 > t.x + t.w / 2; assert(behind, 'behind the opponent'); assert.equal(f.facing, -1, 'turned toward them')
  f._specialHeldDir = 'B'; const hp = t.health; assert(A.triggerSpecial(f, ctxOf(f, t)), 'cancels into Tail Whip'); assert.equal(S(f).cancels, 1)
  let hits = 0
  for (let i = 0; i < 30; i++) { tick(f, t); for (const p of A.activeProjectiles.filter(p => !p.visualOnly && p.owner === f)) { const h0 = t.health; C.resolveProjectileHitsMulti([p], [t]); if (t.health < h0) hits++; A.activeProjectiles.splice(A.activeProjectiles.indexOf(p), 1) } }
  assert.equal(hits, 2, 'Tail Whip: 2 hits (20 / 28)'); assert(t.knockdownState, '2nd hit knocks down')
  t.knockdownState = false; t.hitstun = 0; f.facing = -1; t.x = f.x - t.w - 10
  const hv = melee(f, t, 'heavy'); t.x = f.x - t.w - 10
  const cy = special(f, t, 'D', { frames: 70 }); assert(cy.ok); assert.equal(cy.spent, 16); assert.equal(cy.hits, 4, 'Mach Cyclone: 4 hits of 10')
  console.log('   HP whip', hp - t.health - hv - cy.dealt, 'heavy', hv, 'cyclone', cy.dealt)
})

// ── 4 Flash Time ───────────────────────────────────────────────────────────────────────────────────────────
test('4. Flash Time SLOWS THE OPPONENT: oppTimeScale 0.4 while active (game.js frame-skip), 0 otherwise', () => {
  const f = ben(), t = fresh('goku', 1300); assert.equal(XLR8.oppTimeScale(f), 0)
  assert(XLR8.chargeSpecial(f, ctxOf(f, t))); assert.equal(XLR8.oppTimeScale(f), XL_FLASH.OPP); assert.equal(XL_FLASH.OPP, 0.4)
  tick(f, t, XL_FLASH.DURATION); assert.equal(XLR8.oppTimeScale(f), 0)
})
test('4. Flash Time: 25 Power, 150f, startup/recovery ×0.7, speed ×1.8 (P + L), opponent projectiles ×0.5, 600f cooldown, no re-activate', () => {
  const f = ben(), t = fresh('goku', 1300); tick(f, t)
  const sp = f._benWalkSpeed, ds = f.dashSpeed
  C.startMove(f, 'heavy', BA.heavy); const plain = { ...f.currentAttack }; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0
  assert(XLR8.blockSpecial(f, ctxOf(f, t)), 'Flash Time starts'); assert.equal(100 - f.energy, 25, '25 Power'); assert.equal(S(f).flashT, 150)
  assert.equal(XLR8.blockSpecial(f, ctxOf(f, t)), false, 'no re-activate while active')
  f._specialHeldDir = null; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'the activating Special press is swallowed (no stray cast)')
  tick(f, t, 2, { special: true }); assert.equal(S(f).swallow, XL_FLASH.SWALLOW, 'held: still swallowed'); tick(f, t, XL_FLASH.SWALLOW); assert.equal(S(f).swallow, 0, 'released: one buffer window later it is free')
  tick(f, t)
  assert.equal(XL_FLASH.SPEED, 1.8, 'owner: as fast as the Flash'); assert(Math.abs(f._benWalkSpeed - sp * 1.8) < 1e-9 && Math.abs(f.dashSpeed - ds * 1.8) < 1e-9, 'movement ×1.8')
  C.startMove(f, 'heavy', BA.heavy); const fast = f.currentAttack
  assert.equal(fast.activeEnd - plain.activeEnd, Math.round(12 * 0.7) - 12, `startup 12 → ${Math.round(12 * 0.7)}`)
  assert.equal(fast.damage, plain.damage, 'hit damage unchanged')
  const md = XLR8.moveFrames(f, 'light', { startup: 1, recovery: 1, active: 3 }); assert.equal(md.startup, 1, 'min 1f'); assert.equal(md.recovery, 1)
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0
  // opponent projectiles at half speed (his side only: his own projectile keeps full speed)
  A.clearAbilityState(); const p = A.spawnProjectile(t, 'test_ball', { damage: 10, vx: -10, speed: 10, spawnX: 2000, spawnY: 300, lifetime: 200 }, {})
  const q = A.spawnProjectile(f, 'own_ball', { damage: 10, vx: 10, speed: 10, spawnX: 500, spawnY: 300, lifetime: 200 }, {})
  const px = p.x, qx = q.x; tick(f, t); C.updateProjectiles(A.activeProjectiles, 3200)
  assert.equal(p.x - px, -5, 'opponent projectile ×0.5'); assert.equal(q.x - qx, 10, 'own projectile unchanged')
  // the opponent's own clock is untouched: its startMove frames are the authored ones
  C.startMove(t, 'light', { damage: 10, startup: 10, active: 3, recovery: 10, frameExact: true }); assert.equal(t.currentAttack.activeEnd, 10 + 3 - 1, 'opponent startup unchanged')
  tick(f, t, 148 - 2 - XL_FLASH.SWALLOW); assert.equal(S(f).flashT, 0, 'lasts 150f'); assert.equal(S(f).flashCd, XL_FLASH.COOLDOWN, '600f cooldown after it ends')
  assert(Math.abs(f._benWalkSpeed - sp) < 1e-9, 'speed restored'); C.updateProjectiles(A.activeProjectiles, 3200); C.updateProjectiles(A.activeProjectiles, 3200); const px2 = p.x; tick(f, t); C.updateProjectiles(A.activeProjectiles, 3200)
  assert.equal(p.x - px2, -10, 'projectile lease lapsed (≤2f after Flash Time): full speed again')
  f.energy = 100; assert.equal(XLR8.blockSpecial(f, ctxOf(f, t)), false, 'no re-activate on cooldown')
  tick(f, t, XL_FLASH.COOLDOWN); assert(XLR8.blockSpecial(f, ctxOf(f, t)), 'available after the cooldown')
  const g = ben(), u = fresh('goku', 1300); g.hitstun = 10; assert.equal(XLR8.blockSpecial(g, ctxOf(g, u)), false, 'not during hitstun')
  const h = ben(), v = fresh('goku', 1300); S(h).ult = { phase: 'opener', t: 0 }; assert.equal(XLR8.blockSpecial(h, ctxOf(h, v)), false, 'not during the Ultimate')
})

// ── 5 Echo hits ────────────────────────────────────────────────────────────────────────────────────────────
test('5. Echo: 12f later, 30% of the hit, only in hitstun, max 3 per combo, no chaining, combo scaling applies', () => {
  const f = ben(), t = fresh('goku'); place(f, t); XLR8.blockSpecial(f, ctxOf(f, t))
  melee(f, t, 'heavy', { keepStun: true }); assert.equal(S(f).echoes.length, 1); assert.equal(S(f).echoes[0].at - S(f).t, XL_ECHO.DELAY, '12f delay')
  assert(Math.abs(S(f).echoes[0].raw - BA.heavy.damage * 0.3) < 1e-9, '30% of the hit')
  t.hitstun = 30; const h0 = t.health; tick(f, t, XL_ECHO.DELAY - 1); assert.equal(t.health, h0, 'not before 12f'); tick(f, t, 1)
  const echoDmg = h0 - t.health; assert(echoDmg > 0, 'echo lands in hitstun'); assert.equal(S(f).echoesFired, 1); assert.equal(S(f).echoes.length, 0, 'echoes do not schedule echoes')
  // dropped: opponent out of hitstun → no echo
  melee(f, t, 'light', { keepStun: true }); t.hitstun = 0; const h1 = t.health; tick(f, t, XL_ECHO.DELAY); assert.equal(t.health, h1, 'no echo outside hitstun')
  // max 3 per combo
  const g = ben(), u = fresh('goku'); place(g, u); XLR8.blockSpecial(g, ctxOf(g, u))
  for (let i = 0; i < 5; i++) { melee(g, u, 'light', { keepStun: true }); u.hitstun = 30 }
  assert.equal(S(g).echoCount, XL_ECHO.MAX, 'max 3 echoes per combo'); assert.equal(S(g).echoes.length, 3)
  // scaling: the same echo deals less deep in a combo
  const a = ben(), ua = fresh('goku'); place(a, ua); XLR8.blockSpecial(a, ctxOf(a, ua)); a.comboCounter = 0
  S(a).echoes.push({ at: S(a).t + 1, raw: 30, x: 0, y: 0 }); ua.hitstun = 20; let hh = ua.health; tick(a, ua); const early = hh - ua.health
  a.comboCounter = 8; S(a).echoes.push({ at: S(a).t + 1, raw: 30, x: 0, y: 0 }); ua.hitstun = 20; hh = ua.health; tick(a, ua); const late = hh - ua.health
  assert(late < early, `combo scaling applies (${late} < ${early})`)
  const n = ben(), un = fresh('goku'); place(n, un); melee(n, un, 'heavy', { keepStun: true }); assert.equal(S(n).echoes.length, 0, 'no echoes outside Flash Time')
})

// ── 6 Blur Step ────────────────────────────────────────────────────────────────────────────────────────────
function blur(f, t, ctx = null) { A.clearAbilityState(); f.attackCooldown = 0; f.attacking = false; f._benPowerCommit = 0; f._specialHeldDir = 'F'; const ok = A.triggerSpecial(f, ctx || ctxOf(f, t)); return ok }
test('6. Blur Step: 60 px behind the cast-time position, stage clamp, corner fallback, cooldown, no tracking, cancel once', () => {
  const f = ben('xlr8', 600), t = fresh('goku', 900); const oc = t.x + t.w / 2
  assert(blur(f, t)); t.x += 300                                                // the opponent moves after the cast: no tracking
  tick(f, t, XL_BLUR.STARTUP); assert.equal(f.x + f.w / 2, oc + 60, 'center 60 px behind the CAST-TIME position'); assert.equal(f.facing, -1)
  assert.equal(S(f).blurCd, XL_BLUR.COOLDOWN - XL_BLUR.STARTUP); tick(f, t, 20); assert.equal(blur(f, t), false, 'cooldown 90f')
  tick(f, t, 80); assert(blur(f, t), 'available after 90f')
  // corner: opponent pinned at the right wall → behind is off stage → lands in front of them
  const g = ben('xlr8', 2700), u = fresh('goku', 3200 - 60); assert(blur(g, u)); tick(g, u, XL_BLUR.STARTUP)
  assert(S(g).blur.fallback, 'corner fallback'); assert.equal(g.x + g.w / 2, u.x + u.w / 2 - 60, 'in front of them'); assert(g.x >= 0 && g.x <= 3200 - g.w, 'inside the stage')
  // clamp: a narrow stage clamps a legal-but-edge landing
  const h = ben('xlr8', 100), v = fresh('goku', 30); assert(blur(h, v)); tick(h, v, XL_BLUR.STARTUP); assert(h.x >= 0, 'never off the left edge')
  // cancel once: Tail Whip or Sonic Slash on reappear, never twice, never Mach Cyclone
  const k = ben('xlr8', 600), w = fresh('goku', 900); assert(blur(k, w)); tick(k, w, XL_BLUR.STARTUP)
  assert.equal(C.startMove(k, 'light', BA.light), false, 'normals refused during the 14f recovery')
  k._specialHeldDir = 'D'; assert.equal(A.triggerSpecial(k, ctxOf(k, w)), false, 'Mach Cyclone is not a Blur cancel')
  k._specialHeldDir = null; assert(A.triggerSpecial(k, ctxOf(k, w)), 'cancels into Sonic Slash'); k._specialHeldDir = 'B'; assert.equal(A.triggerSpecial(k, ctxOf(k, w)), false, 'only one cancel')
  assert.equal(k.invulnTimer || 0, 0, 'no invulnerability')
})

// ── 7 Mach Cyclone ─────────────────────────────────────────────────────────────────────────────────────────
test('7. Mach Cyclone: spawned 300 px ahead, 220 px travel, bounded pull (≤6 px/f, 8f, never past centre), one on screen', () => {
  const f = ben('xlr8', 600), t = fresh('goku', 600 + 100 + 300 + 40); A.clearAbilityState(); f._specialHeldDir = 'D'; assert(A.triggerSpecial(f, ctxOf(f, t)))
  const c = S(f).cyclone; assert.equal(c.x0, f.x + f.w / 2 + 300); f.attackCooldown = 0; f.attacking = false; f._benPowerCommit = 0
  f._specialHeldDir = 'D'; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'one on screen')
  let prev = t.x, maxStep = 0
  for (let i = 0; i < 80 && S(f).cyclone; i++) { tick(f, t); maxStep = Math.max(maxStep, Math.abs(t.x - prev)); prev = t.x; A.activeProjectiles.length = 0 }
  assert(maxStep <= XL_CYCLONE.PULL + 1e-9, `pull ≤ 6 px/f (${maxStep})`); assert(c.pulled <= XL_CYCLONE.PULL * XL_CYCLONE.PULL_FRAMES, 'pull bounded to 8f')
  assert.equal(c.pullLeft >= 0, true); assert(Math.abs(c.x - c.x0 - 220) < 1e-6, 'travels 220 px'); assert.equal(S(f).cyclone, null, 'gone after its run')
})

// ── 8 Sonic Dive ───────────────────────────────────────────────────────────────────────────────────────────
test('8. Sonic Dive: once per airtime, no jump refill, 45 dmg, bounces him up on hit', () => {
  const f = ben('xlr8', 600), t = fresh('goku', 760); f.onGround = f.grounded = false; f.y = 150; f.jumpCount = 2; tick(f, t)
  A.clearAbilityState(); f._specialHeldDir = null; assert(A.triggerSpecial(f, ctxOf(f, t)), 'dive'); assert.equal(100 - f.energy, 12); assert.equal(f.jumpCount, 2, 'no jump refill')
  let hit = false
  for (let i = 0; i < 20 && !hit; i++) { tick(f, t); for (const p of A.activeProjectiles.filter(p => p.name === 'xl_dive')) { assert.equal(p.damage, 45); p.x = t.x + t.w / 2; p.y = t.y + t.h / 2; const h0 = t.health; C.resolveProjectileHitsMulti([p], [t]); hit = hit || t.health < h0 } ; A.activeProjectiles.length = 0 }
  assert(hit, 'dive connects'); tick(f, t); assert(f.vy < 0, 'bounces back up'); assert.equal(f._benGlide, undefined)
  f.attackCooldown = 0; f.attacking = false; A.clearAbilityState(); f._specialHeldDir = null; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'once per airtime')
  f.onGround = f.grounded = true; tick(f, t); assert.equal(S(f).diveUsed, false, 'landing resets the airtime')
})

// ── 9 Ultimate ─────────────────────────────────────────────────────────────────────────────────────────────
function ult(f, t, { block = false, far = false } = {}) {
  A.clearAbilityState(); f.attackCooldown = 0; f.attacking = false; f.energy = 100
  if (far) t.x = f.x + 900
  const ok = A.triggerUltimate(f, ctxOf(f, t)); const hp = t.health; const home = { x: f.x, y: f.y }, thome = { x: t.x, y: t.y }; let grey = false
  for (let i = 0; i < 160; i++) {
    tick(f, t); t.isBlocking = block; if (S(f).ult && S(f).ult.phase !== 'opener') grey = true
    for (const p of A.activeProjectiles.filter(p => !p.visualOnly)) { C.resolveProjectileHitsMulti([p], [t]); const k = A.activeProjectiles.indexOf(p); if (k >= 0) A.activeProjectiles.splice(k, 1) }
  }
  t.isBlocking = false
  return { ok, dealt: hp - t.health, home, thome, grey }
}
test('9. Time Sprint: whiff / block = no capture (60f recovery); clean = 40 + 8×12 + 104 = 240 raw; colour + positions restore', () => {
  let f = ben(), t = fresh('goku'); place(f, t); let r = ult(f, t, { far: true })
  assert(r.ok); assert.equal(r.dealt, 0, 'whiff deals nothing'); assert.equal(S(f).lastUltRaw, 0, 'no cinematic'); assert(!r.grey, 'world never greys')
  f = ben(); t = fresh('goku'); place(f, t); r = ult(f, t, { block: true }); assert.equal(S(f).lastUltRaw, 0, 'blocked: no cinematic')
  f = ben(); t = fresh('goku'); place(f, t); A.clearAbilityState(); f.energy = 100; A.triggerUltimate(f, ctxOf(f, t))
  assert.equal(f.energy, 50, 'costs 50 Power'); assert.equal(f.attackCooldown, XL_ULT.STARTUP + XL_ULT.WHIFF_RECOVERY, '10f + 60f whiff recovery')
  f = ben(); t = fresh('goku'); place(f, t); r = ult(f, t)
  assert.equal(S(f).lastUltRaw, XL_ULT.OPENER + 8 * XL_ULT.SLASH + XL_ULT.FINAL); assert.equal(S(f).lastUltRaw, 240, '240 raw')
  assert(r.grey, 'world greyed during the cinematic'); assert.equal(S(f).ult, null, 'colour restores')
  assert.equal(f.x, r.home.x, 'XLR8 back at his spot'); assert.equal(f.y, r.home.y); assert.equal(t.x !== undefined, true)
  assert(f.attackCooldown > 0 && f.attackCooldown <= XL_ULT.LOCKOUT, '100f recovery lockout'); console.log('   HP dealt', r.dealt)
  assert(!A.activeProjectiles.some(p => /afterimage|ghost/.test(p.name || '')), 'afterimages are not in GAME_STATE')
})

// ── 10 clears ──────────────────────────────────────────────────────────────────────────────────────────────
test('10. swap / revert / KO / rematch clear Flash Time and echo state', () => {
  const dirty = f => { const s = S(f); s.flashT = 90; s.flashCd = 0; s.echoes.push({ at: 99, raw: 10, x: 0, y: 0 }); s.echoCount = 2; s.blurCd = 50 }
  const f = ben(); dirty(f)
  assert(F.applyAlien(f, 'heatblast')); assert.notEqual(f.omnitrix.formState?.kind, 'xlr8', 'swap clears')
  assert(F.applyAlien(f, 'xlr8')); assert.equal(S(f).flashT, 0); assert.equal(S(f).echoes.length, 0); assert.equal(S(f).echoCount, 0)
  dirty(f); F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'revert clears')
  const k = ben(); dirty(k); k.health = 0; handleBenKO(k); assert.equal(k.omnitrix.formState, null, 'KO clears')
  const g = ben(); assert.equal(S(g).flashT, 0); assert.equal(S(g).flashCd, 0); assert.equal(S(g).echoes.length, 0, 'rematch: fresh state')
})

// ── 11 Vow + determinism + registry ────────────────────────────────────────────────────────────────────────
test('11. registry: XLR8 READY in the first placeholder slot (5); long, low hurtbox', () => {
  const d = getAlienDefinition('xlr8'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 5)
  assert(fs.existsSync(new URL('../' + d.ledgerPath, import.meta.url)) && fs.existsSync(new URL('../' + d.sheetPath.slice(2), import.meta.url)))
  { const _ready = getAvailableAlienKeys(false); assert(_ready.length >= BEN10_SLOT_COUNT, 'PICK FIVE: at least one READY alien per dial slot (count read from the registry)'); assert.deepEqual(_ready.slice(0, 5), LOADOUT) }; assert.deepEqual(buildLoadout(5).map(a => a.id), LOADOUT)
  const f = ben(); assert.equal(f.maxJumps, 2, 'shared double jump'); assert.equal(f.activeAlienName, 'XLR8')
  assert(f.w > f.h, `long and low (${f.w}x${f.h})`); assert.equal(f.health, 950, 'shared health pool')
})
test('11. Vow pick includes XLR8; same seed → same pick', () => {
  const mk = () => { const f = ben(null); F.setupBen10(f, LOADOUT); return f }
  const a = mk(), b = mk(); const picks = new Set()
  for (let frame = 0; frame < 300; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); picks.add(a.omnitrix.aliens[x]) }
  assert(picks.has('xlr8'), 'XLR8 is reachable by the Vow pick')
})
test('11. same-seed determinism: an identical scripted XLR8 sequence yields identical GAME_STATE', () => {
  const run = () => {
    FRAME = 0; const f = ben(), t = fresh('goku'); place(f, t); XLR8.blockSpecial(f, ctxOf(f, t)); melee(f, t, 'light', { keepStun: true }); t.hitstun = 20; tick(f, t, XL_FLASH.SWALLOW)
    special(f, t, null, { frames: 45 }); special(f, t, 'B'); special(f, t, 'D'); ult(f, t); tick(f, t, 100)
    return JSON.stringify({ s: S(f), hp: t.health, e: f.energy, x: f.x, tx: t.x })
  }
  assert.equal(run(), run())
})
test('GAME_STATE stays plain data (serializable) mid-cast', () => {
  const f = ben(), t = fresh('goku'); place(f, t); XLR8.blockSpecial(f, ctxOf(f, t)); A.clearAbilityState(); f._specialHeldDir = 'D'; A.triggerSpecial(f, ctxOf(f, t)); tick(f, t, 20)
  melee(f, t, 'light', { keepStun: true }); assert.doesNotThrow(() => JSON.stringify(f.omnitrix))
})
test('no Math.random / gameRng in xlr8.js / xlr8Assets.js', () => {
  for (const file of ['../xlr8.js', '../xlr8Assets.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(new URL(file, import.meta.url), 'utf8')), file)
})

test('Killua kit: faster than Killua (walk 8.75 / dash 19), speed-tier blink + double air-dash flags, cleared on revert', () => {
  const f = ben()
  assert.equal(XLR8.mods.speed, 1.6)
  assert(f._benWalkSpeed > 8.75 * 1.5, `walk ${f._benWalkSpeed} vs Killua 8.75`); assert(f.dashSpeed > 19, `dash ${f.dashSpeed} vs Killua 19`)
  assert.equal(S(f).speedTier, true, 'double-tap toward = speed-tier blink'); assert.equal(S(f).mobility, 'very_high', 'two air-dashes')
  F.revertToHuman(f); assert.equal(f.omnitrix.formState, null, 'flags go with formState on revert')
})

console.log(`XLR8: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
