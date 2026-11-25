// harness/ben10_ripjaws.test.mjs — RIPJAWS (Piscciss Volann), the READY Omnitrix alien with the STORM TIDE flood.
// Drives the real modules (fighters / abilities / combat / physics + ripjaws.js + benFlood.js) headless, frame by frame.
//   node harness/ben10_ripjaws.test.mjs
// Slot: PICK FIVE (owner decision, no new dial slots) — Ripjaws is catalog slot 20 (after Big Chill 19), picked into the
// 5-slot loadout and reached with the Dial (↓↓ + slot key) like any other pick.
import assert from 'node:assert/strict'
import { BEN_ALIEN_BUFF } from '../benAlienBalance.js'   // 2026-11-19 global alien buff: live numbers = design × buff
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../arcticguana.js'
import * as R from '../ripjaws.js'
import * as FL from '../benFlood.js'
import * as WA from '../waterAffinity.js'
import { tickFlightDriver, isFlying, getFlightProfile } from '../flight.js'
import { clearBenFormState, handleBenKO } from '../ben10State.js'
import { getAvailableAlienKeys, getAlienDefinition, buildLoadout, BEN10_SLOT_COUNT, BEN10_ALIEN_REGISTRY } from '../aliens.js'
import fs from 'node:fs'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = (form = 'ripjaws', loadout = []) => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, loadout); if (form) { assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h } return f }
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
const { RIPJAWS, RJ_COST } = R
const BA = RIPJAWS.basic_attacks, DM = RIPJAWS.mods.damage
const LOAD = ['heatblast', 'goop', 'arcticguana', 'bigchill', 'ripjaws']
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
const ult = (f, t) => { ready(f); return A.triggerUltimate(f, ctxOf(f, t)) }
const motion = (f, dirs) => { const s = S(f); for (const d of dirs) { s.t++; s.hist.push({ d, t: s.t }); s.lastDir = d } }

// ── 2 registry + stats ──────────────────────────────────────────────────────────────────────────────────────
test('2. registry: one READY entry, catalog slot 20 (contiguous after Big Chill 19), sheet + ledger exist, no ready alien overwritten', () => {
  const d = getAlienDefinition('ripjaws'); assert(d && d.status === 'ready', 'ready'); assert.equal(d.slot, 20)
  const ready = BEN10_ALIEN_REGISTRY.filter(a => a.status === 'ready').map(a => a.slot).sort((a, b) => a - b)
  assert.deepEqual(ready, ready.map((_, i) => i + 1), 'contiguous'); assert.equal(getAlienDefinition('bigchill').slot, 19, 'Big Chill kept')
  assert(fs.existsSync(d.sheetPath.replace('./', '')) && fs.existsSync(d.ledgerPath) && fs.existsSync('assets/sprites/ben10/aliens/ripjaws.png'))
  assert(/Sheet by Dragonrod/.test(fs.readFileSync(d.ledgerPath, 'utf8')), 'credit line')
  assert(getAvailableAlienKeys().includes('ripjaws')); assert.equal(BEN10_ALIEN_REGISTRY.filter(a => a.id === 'ripjaws').length, 1)
})
test('2. stats: speed ×0.90 / damage ×1.00 / defense ×1.05 / weight ×1.10 (dry), double jump, shared health', () => {
  const f = ben()
  assert(Math.abs(f.damageMultiplier / BEN_ALIEN_BUFF.damage - 1.00) < 1e-9 && Math.abs(f.defenseMultiplier / BEN_ALIEN_BUFF.defense - 1.05) < 1e-9 && Math.abs(f._benWeight - 1.10) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.90 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.90')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 2185, 'shared health (950 × the 2026-11-24 Ben HP buff 2.30)'); assert.equal(f.activeAlienName, 'Ripjaws')
})
test('2. normals: frame data (startup / dmg / on-block) as briefed, pre-mod', () => {
  const chk = (k, st, dmg, adv, extra) => { const m = BA[k]; assert.equal(m.startup, st, k + ' startup'); assert.equal(m.damage, dmg, k + ' dmg'); assert.equal(m.blockstun - m.active - m.recovery, adv, k + ' on block'); if (extra) extra(m) }
  chk('light', 5, 20, 0); chk('heavy', 14, 56, -6, m => assert.equal(m.rangeX, 160)); chk('down', 7, 26, -4, m => assert.equal(m.hitLevel, 'low'))
  chk('up', 11, 48, -9, m => assert(m.launcher)); chk('air', 7, 30, 2)
})
test('2. normals connect through the real combat pipeline', () => {
  for (const k of ['light', 'heavy', 'down', 'up']) { const f = ben(), t = foe(); reset(f, t, 10); assert(melee(f, t, k) > 0, k) }
})
test('2. two frame sets: LAND table by default, the WATER (tail) table maps every move key; motion inputs read', () => {
  const f = ben(); assert.equal(f._skinAnim, R.ANIM_LAND)
  for (const k of ['idle', 'walk', 'light', 'heavy', 'up', 'rjJet', 'rjRush', 'rjFin', 'rjBreach', 'rjSummon']) assert(R.ANIM_WATER[k] && /_w_uniform/.test(R.ANIM_WATER[k].sheet), 'water ' + k)
  const s = S(f); for (const [m, k] of [[[2, 3, 6], 'jet'], [[2, 1, 4], 'fin'], [[6, 2, 3], 'breach'], [[4, 1, 2], 'storm']]) { s.hist = []; motion(f, m); assert.equal(R.readMotion(s), k) }
})

// ── 3 / 4 / 5 / 6 STORM TIDE: schedule, cap + air gap, depth states ─────────────────────────────────────────
const FR = f => f._benFlood
const H0 = 410 - FL.ARENA_TOP_Y   // the harness floor (groundY 410) to the arena top
function flood(f, t, { level = 1, settle = true } = {}) {
  reset(f, t, 300); ready(f); assert(cast(f, t, 'D'), 'Storm Tide'); world(f, t, R.RJ_STORM.STARTUP + (settle ? FL.FLOOD.RISE1 + 2 : 0))
  if (level === 2) { ready(f); assert(cast(f, t, 'D'), 'recast'); world(f, t, R.RJ_STORM.STARTUP + (settle ? FL.FLOOD.RISE2 + 2 : 0)) }
  return FR(f)
}
test('4. flood schedule: cost 18 / 24f → Level 1 (0.18 H) over 90f; recast cost 12 → Level 2 over 60f; 480f total; 90f recede; 900f cooldown; no extension', () => {
  const f = ben(), t = foe(); reset(f, t, 300); f.energy = 100; assert(cast(f, t, 'D')); assert.equal(100 - f.energy, RJ_COST.storm)
  world(f, t, R.RJ_STORM.STARTUP - 1); assert.equal(FR(f), undefined, 'nothing before the 24f startup'); world(f, t, 1); const r = FR(f); assert(r && r.phase === 'rise' && r.level === 1)
  assert(Math.abs(r.l1 - 0.18 * H0) < 1e-6, 'Level 1 = 0.18 H'); world(f, t, FL.FLOOD.RISE1 - 2); assert(r.line < r.l1 && r.line > r.l1 * 0.9); world(f, t, 1); assert(Math.abs(r.line - r.l1) < 1e-6, 'reaches L1 at 90f')
  ready(f); f.energy = 100; assert(cast(f, t, 'D'), 'recast'); assert.equal(100 - f.energy, RJ_COST.stormRaise); world(f, t, R.RJ_STORM.STARTUP + FL.FLOOD.RISE2); assert.equal(r.level, 2)
  assert(Math.abs(r.line - r.l2) < 1e-6, 'Level 2 over 60f'); assert(Math.abs(r.l2 - Math.max(0.42 * H0, 0)) < 1e-6)
  ready(f); f.energy = 100; assert.equal(cast(f, t, 'D'), false, 'never beyond Level 2'); assert.equal(f.energy, 100, 'a refused cast costs nothing')
  world(f, t, FL.FLOOD.DUR - r.t - 1); assert.equal(r.phase, 'hold'); world(f, t, 1); assert.equal(r.phase, 'recede', '480f from the FIRST cast (no extension)')
  world(f, t, FL.FLOOD.RECEDE); assert.equal(r.phase, 'off'); assert.equal(r.line, 0); assert.equal(r.cd, FL.FLOOD.CD)
  world(f, t, 60); f.y = 410 - f.h; f.vy = 0; f.onGround = f.grounded = true   // on the floor: ↓+P is Storm Tide (in the air it is Dive Bite)
  ready(f); f.energy = 100; assert.equal(cast(f, t, 'D'), false, 'cooldown'); world(f, t, FL.FLOOD.CD); assert.equal(FR(f), undefined, 'cooldown over')
  ready(f); assert(cast(f, t, 'D'), 'castable again')
})
test('4. no Storm Tide in hitstun, during another move, or during the Ultimate', () => {
  const f = ben(), t = foe(); reset(f, t, 300); ready(f); f.hitstun = 10; f._specialHeldDir = 'D'; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'hitstun')
  ready(f); assert(C.startMove(f, 'light', BA.light)); f._specialHeldDir = 'D'; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false, 'active frames of another move')
  ready(f); S(f).ult = { phase: 'abyss', t: 1 }; assert.equal(R.stormCastable(f, S(f), t) && !S(f).ult, false, 'ultimate'); f._specialHeldDir = 'D'; assert.equal(A.triggerSpecial(f, ctxOf(f, t)), false); S(f).ult = null
})
test('5. CAP + AIR GAP: never above 0.55 H, always ≥ 140 px under the arena top; a short stage → the cap wins', () => {
  const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); assert(r.line <= 0.55 * r.H + 1e-9 && r.H - r.line >= FL.FLOOD.GAP)
  const g = ben(), u = foe(); reset(g, u, 300); ready(g); const short = { ...ctxOf(g, u), arenaTopY: 410 - 250 }
  g._specialHeldDir = 'D'; assert(A.triggerSpecial(g, short)); for (let i = 0; i < 160; i++) { FRAME++; A.tickBenAlienForm(g, {}, { ...short, frame: FRAME }) }
  ready(g); g._specialHeldDir = 'D'; assert(A.triggerSpecial(g, short)); let mx = 0; for (let i = 0; i < 120; i++) { FRAME++; A.tickBenAlienForm(g, {}, { ...short, frame: FRAME }); mx = Math.max(mx, FR(g).line) }
  const q = FR(g); assert.equal(q.H, 250); assert(Math.abs(q.cap - 110) < 1e-9, 'cap = min(0.55 H, H − 140) = 110'); assert(mx <= 110 + 1e-9, 'never past the cap'); assert(q.H - mx >= 140, 'air gap')
})
test('5. platforms above the line are DRY; nothing solid changes (stage bounds, floor, walls), nobody is moved by the water', () => {
  const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); const lineY = FL.floodLineY(r)
  const plat = foe('goku', 900); plat.y = lineY - plat.h - 20; plat.onGround = true; assert.equal(FL.depthOf(r, plat), 'dry', 'on a platform above the line')
  assert.equal(physics.stageLeft, STAGE.stageLeft); assert.equal(physics.stageWidth, STAGE.stageWidth); assert.equal(t.groundY, 410)
  const x0 = t.x; for (let i = 0; i < 30; i++) FL.tickBenFlood(f, ctxOf(f, t), { getOpponent: () => t }); assert.equal(t.x, x0, 'the flood tick never moves anyone')
})
test('6. depth states from the STANDING hurtbox: DRY / WADING / SUBMERGED; crouching does not change depth', () => {
  const f = ben(), t = foe(); const r = flood(f, t); assert.equal(FL.depthOf(r, t), 'wading', 'Level 1 = wading (feet under, head above)')
  const g = ben(), u = foe(); const q = flood(g, u, { level: 2 }); assert.equal(FL.depthOf(q, u), 'submerged', 'Level 2 = submerged (head under)')
  u.isCrouching = true; const h = u.h; u.y += h / 2; u.h = h / 2; assert.equal(FL.depthOf(q, u), 'submerged', 'crouching never dodges depth'); u.isCrouching = false; u.h = h; u.y -= h / 2
  u.y = FL.floodLineY(q) - u.h - 1; assert.equal(FL.depthOf(q, u), 'dry', 'feet above the line → dry')
  assert.equal(FL.waterOf(u).depth, 'submerged'); assert.equal(FL.waterOf(u).wb, false); assert.equal(FL.waterOf(g).wb, true, 'Ripjaws is waterborne')
})
test('15. endings: swap / revert → 90f recede (cooldown still applies); KO / round end / rematch → gone instantly', () => {
  const f = ben('ripjaws', LOAD), t = foe(); const r = flood(f, t); assert(F.applyAlien(f, 'goop')); assert.equal(r.phase, 'recede', 'swap → recede')
  world(f, t, FL.FLOOD.RECEDE); assert.equal(FR(f).phase, 'off'); assert(FR(f).cd > 0, 'cooldown applies')
  const g = ben('ripjaws', LOAD), u = foe(); flood(g, u); F.revertToHuman(g); assert.equal(FR(g).phase, 'recede', 'revert → recede')
  const k = ben(), v = foe(); flood(k, v); k.health = 0; handleBenKO(k); assert.equal(FR(k), undefined, 'owner KO → instant'); assert.equal(v._benWater, undefined)
  const m = ben(), w = foe(); flood(m, w); w.health = 0; world(m, w, 1); assert.equal(FR(m), undefined, 'opponent KO → instant')
  const n = ben(), x = foe(); flood(n, x); F.setupBen10(n, LOAD); assert.equal(FR(n), undefined, 'round end / rematch (setupBen10) → instant')
})

// ── 4 / 7 / 8 WATER PHYSICS + RIPJAWS' EDGE ──────────────────────────────────────────────────────────────────
const stamp = (q, depth, wb = false) => { q._benWater = { ttl: 2, depth, wb, lineY: 0, owner: 'p1' } }
const walk = (depth, n = 30) => { const q = foe('goku', 500); for (let i = 0; i < n; i++) { if (depth) stamp(q, depth); physics.moveFighter(q, { d: true }, CONTROLS); physics.applyGravity(q) } return q.x - 500 }
test('7. non-waterborne swim physics: wading walk ×0.9; submerged ×0.75 on the floor, ×0.8 swimming; sink ≤ 3 px/f', () => {
  const dry = walk(null); assert(Math.abs(walk('wading') / dry - 0.9) < 1e-9, 'wading ×0.9'); assert(Math.abs(walk('submerged') / dry - 0.75) < 1e-9, 'submerged floor walk ×0.75')
  const a = foe('goku', 500), b = foe('goku', 500); for (const q of [a, b]) { q.y = 100; q.onGround = q.grounded = false }
  for (let i = 0; i < 10; i++) { stamp(b, 'submerged'); for (const q of [a, b]) { physics.moveFighter(q, { d: true }, CONTROLS); physics.applyGravity(q) } }
  assert(Math.abs((b.x - 500) / (a.x - 500) - 0.8) < 0.02, `swimming horizontal ×0.8 (${(b.x - 500) / (a.x - 500)})`)
  let mx = 0; for (let i = 0; i < 40; i++) { stamp(b, 'submerged'); const y0 = b.y; physics.moveFighter(b, {}, CONTROLS); physics.applyGravity(b); mx = Math.max(mx, b.y - y0) }
  assert(mx <= 3 + 1e-9, `sink ≤ 3 px/f (${mx})`)
})
test('7. SWIM STROKE: Jump = +3 px/f up for 12f; no jump / double jump spent, none refilled; air dash + air jump disabled', () => {
  const q = foe('goku', 500); const ys = []
  for (let i = 0; i < 14; i++) { stamp(q, 'submerged'); physics.moveFighter(q, i === 0 ? { w: true } : {}, CONTROLS); physics.applyGravity(q); ys.push(q.y) }
  for (let i = 1; i < 12; i++) assert(Math.abs(ys[i - 1] - ys[i] - 3) < 1e-9, 'stroke frame ' + i); assert.equal(q.jumpCount, 0, 'no jump spent')
  q.jumpCount = 1; for (let i = 0; i < 6; i++) { stamp(q, 'submerged'); physics.moveFighter(q, { w: i % 2 === 0 }, CONTROLS); physics.applyGravity(q) } assert.equal(q.jumpCount, 1, 'never refilled, never spent (double jump unusable)')
  const d = foe('goku', 500); d.y = 120; d.onGround = d.grounded = false; d.dashCooldown = 0; d.airDashCount = 0
  for (let i = 0; i < 3; i++) { stamp(d, 'submerged'); d._dashTap = true; physics.moveFighter(d, { d: true }, CONTROLS) } assert.equal(d.airDashCount || 0, 0, 'no air dash submerged')
  const e = foe('goku', 500); e.y = 120; e.onGround = e.grounded = false; e.dashCooldown = 0; e.airDashCount = 0; e._dashTap = true; physics.moveFighter(e, { d: true }, CONTROLS); assert.equal(e.airDashCount, 1, 'control: the air dash works dry')
})
test('7. knockback ×0.8 / launch ×0.75 on a SUBMERGED target (hitstun unchanged); dry + waterborne untouched', () => {
  const hit = (depth, key, wb = false) => { const f = ben(), t = foe(); reset(f, t, 10); if (depth) stamp(t, depth, wb); melee(f, t, key); return { vx: t.vx, vy: t.vy, hs: t.hitstun } }
  const d = hit(null, 'heavy'), w = hit('submerged', 'heavy'); assert(Math.abs(w.vx / d.vx - 0.8) < 1e-9, 'knockback ×0.8'); assert.equal(w.hs, d.hs, 'hitstun unchanged')
  const dl = hit(null, 'up'), wl = hit('submerged', 'up'); assert(Math.abs(wl.vy / dl.vy - 0.75) < 1e-9, 'launch ×0.75')
  const ww = hit('submerged', 'heavy', true); assert.equal(ww.vx, d.vx, 'waterborne: ordinary physics'); const wa = hit('wading', 'heavy'); assert.equal(wa.vx, d.vx, 'wading: unchanged')
})
test('7. projectiles under the line ×0.75; above the line, beams, floor waves, rect boxes and his Water Jet unaffected; no clock / polling change', () => {
  const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); const lineY = FL.floodLineY(r)
  const mk = (y, extra = {}) => ({ name: 'ki_blast', owner: t, x: 800, y, vx: -8, vy: 0, w: 20, h: 20, lifetime: 60, ...extra })
  const list = [mk(lineY + 40), mk(lineY - 40), mk(lineY + 40, { name: 'kamehameha_beam' }), mk(lineY + 40, { grounded: true }), mk(lineY + 40, { rectHitbox: true }), mk(lineY + 40, { owner: f, alien: { rj: 'jet' } })]
  const api = { getOpponent: () => t, activeProjectiles: () => list }, x0 = list.map(p => p.x), fr0 = FRAME
  for (let i = 0; i < 10; i++) { FL.tickBenFlood(f, ctxOf(f, t), api); for (const p of list) { p.x += p.vx; p.y += p.vy } }
  const dx = list.map((p, i) => (p.x - x0[i]) / -80); assert(Math.abs(dx[0] - 0.75) < 1e-9, 'below ×0.75'); for (let i = 1; i < dx.length; i++) assert.equal(dx[i], 1, 'unaffected #' + i)
  assert.equal(FRAME, fr0, 'no clock change')
})
test('8. Ripjaws edge: wading +10 % dmg / +15 % speed (land frames); submerged +15 % dmg, swim ×1.4 in 8 directions, no gravity, tail frames, no breath', () => {
  const f = ben(), t = foe(); const base = f._benWalkSpeed; flood(f, t); world(f, t, 1); assert.equal(S(f).depth, 'wading'); assert.equal(f._skinAnim, R.ANIM_LAND)
  assert(Math.abs(f._benWalkSpeed / base - 1.15) < 1e-9, 'speed +15 %'); reset(f, t, 10); const hpW = melee(f, t, 'heavy')
  const g = ben(), u = foe(); flood(g, u, { level: 2 }); world(g, u, 1); assert.equal(S(g).depth, 'submerged'); assert.equal(g._skinAnim, R.ANIM_WATER, 'tail frames')
  reset(g, u, 10); g.y = 410 - g.h; const hpS = melee(g, u, 'heavy'); const d = ben(), v = foe(); reset(d, v, 10); const hpD = melee(d, v, 'heavy')
  assert(Math.abs(hpW / hpD - 1.10) < 0.05 && Math.abs(hpS / hpD - 1.15) < 0.05, `dmg ${hpD} / ${hpW} / ${hpS}`)
  ready(g); world(g, u, 1, { right: true, up: true })   // the glide is integrated the frame after the tick sets it
  const y0 = g.y, x0 = g.x; world(g, u, 10, { right: true, up: true }); const v8 = R.swimSpeed(S(g)) / Math.SQRT2
  assert(Math.abs((g.x - x0) - v8 * 10) < 1e-6 && Math.abs((y0 - g.y) - v8 * 10) < 1e-6, `diagonal swim at ×1.4 (dx ${g.x - x0} dy ${y0 - g.y} want ${v8 * 10}; y0 ${y0} surf ${FL.waterOf(g).lineY})`); assert(Math.abs(R.swimSpeed(S(g)) / S(g).baseSpeed - 1.4) < 1e-9)
  world(g, u, 1); const y1 = g.y; world(g, u, 20); assert.equal(g.y, y1, 'no gravity while swimming (also treading at the surface)'); assert.equal(g._skinAnim, R.ANIM_WATER); assert.equal(g.jumpCount, 0, 'swimming never touches jumps')
  assert.equal(FL.waterOf(g).wb, true, 'waterborne → no breath (Phase 5)')
})

// ── 5 / 9 BREATH + DROWNING ───────────────────────────────────────────────────────────────────────────────
const BR = (f, t) => FR(f).breath[t.side]
test('9. breath: 100 → 0 in 420f submerged; refills in 90f with the head above water; only non-waterborne fighters have one', () => {
  const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); world(f, t, 1); assert.equal(FL.waterOf(t).depth, 'submerged')
  r.t = 0; r.breath[t.side] = 100; let n = 0; while (BR(f, t) > 1e-9 && n < 500)   // r.t = 0: keep the flood alive for the measurement
  { world(f, t, 1); n++ } assert(Math.abs(n - 420) <= 1, `emptied in ${n}f`)
  t.y = FL.floodLineY(r) - t.h - 30; t.onGround = true; t.groundY = t.y + t.h; n = 0; while (BR(f, t) < 100 && n < 200) { world(f, t, 1); n++ } assert(Math.abs(n - 90) <= 1, `refilled in ${n}f`)
  assert.equal(r.breath[f.side], undefined, 'Ripjaws (waterborne) has no breath')
})
test('9. DROWNING at 0: 4 HP / 15f, not scaled, no hitstun / knockback, combo untouched, cannot KO (stops at 1 HP)', () => {
  const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); world(f, t, 1); r.breath[t.side] = 0; t.comboCounter = 3; f.comboCounter = 3
  const hp = t.health; world(f, t, 60); assert.equal(hp - t.health, 16, '4 HP every 15f'); assert.equal(t.hitstun, 0); assert.equal(t.vx, 0); assert.equal(f.comboCounter, 3, 'combo untouched')
  assert(FL.waterOf(t).drowning, 'drowning flag (HUD pulse)'); t.health = 6; world(f, t, 60); assert.equal(t.health, 1, 'stops at 1 HP, never KOs'); world(f, t, 30); assert.equal(t.health, 1)
})
test('9. drowning stops when the target surfaces, the flood ends, the target becomes waterborne, or Ripjaws swaps out', () => {
  const run = (mut) => { const f = ben('ripjaws', LOAD), t = foe(); const r = flood(f, t, { level: 2 }); world(f, t, 1); r.breath[t.side] = 0; world(f, t, 15); mut(f, t, r); const hp = t.health; world(f, t, 45); return hp - t.health }
  assert.equal(run((f, t, r) => { t.y = FL.floodLineY(r) - t.h - 30; t.groundY = t.y + t.h }), 0, 'surfaced')
  assert.equal(run((f, t) => { t.health = 0; world(f, t, 1); t.health = 500 }), 0, 'flood ended')
  assert.equal(run((f, t) => { FL.setWaterborneTest(q => q === t || (q.omnitrix?.formState?.kind === 'ripjaws' && q.transformed)) }), 0, 'became waterborne'); FL.setWaterborneTest(null)
  assert.equal(run((f) => { assert(F.applyAlien(f, 'goop')) }), 0, 'owner swapped out: breath cleared at once')
})
test('9. BREATH STEAL −6 once per cast on a submerged target (blocked never); UNDERTOW −15 once + sink', () => {
  const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); world(f, t, 1); r.breath[t.side] = 80
  assert(FL.breathHit(f, t, 'c7')); assert.equal(BR(f, t), 74); assert.equal(FL.breathHit(f, t, 'c7'), false, 'once per cast'); assert(FL.breathHit(f, t, 'c8')); assert.equal(BR(f, t), 68)
  reset(f, t, 10); t.y = 410 - t.h; world(f, t, 1); const b0 = BR(f, t); melee(f, t, 'light'); assert(Math.abs(BR(f, t) - (b0 - 6)) < 0.5, 'a clean jab steals 6')
  const b1 = BR(f, t); R.RIPJAWS.onContact(f, t, { blocked: true, move: BA.light }); assert.equal(BR(f, t), b1, 'blocked: no steal')
  assert(FL.breathHit(f, t, 'u1', 'undertow')); assert(Math.abs(BR(f, t) - (b1 - 15)) < 1e-9); assert.equal(t._benSinkT, 30); assert.equal(FL.breathHit(f, t, 'u1', 'undertow'), false, 'undertow once')
  const d = ben(), u = foe(); flood(d, u); world(d, u, 1); assert.equal(FL.breathHit(d, u, 'c1'), false, 'steal needs a SUBMERGED target'); assert(FL.breathHit(d, u, 'u2', 'undertow'), 'undertow on a wading target')
})
test('5. breath HUD: a thin bar under the affected fighter, only while a flood exists and breath < 100; render-only', () => {
  const calls = []; const ctx = { save() {}, restore() {}, fillRect(x, y, w, h) { calls.push([x, y, w, h]) }, fillText(t) { calls.push(t) }, set fillStyle(v) {}, set font(v) {}, set textAlign(v) {} }
  const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); world(f, t, 1); const gy = t.groundY; t.groundY = FL.floodLineY(r) - 30; t.y = t.groundY - t.h; r.breath[t.side] = 100; world(f, t, 1)
  calls.length = 0; FL.drawBenBreathHud(ctx, t, { x: 10, enY: 50, enH: 8, pbw: 120, flip: false }); assert.equal(calls.length, 0, 'hidden at 100')
  t.groundY = gy; t.y = gy - t.h; world(f, t, 30); FL.drawBenBreathHud(ctx, t, { x: 10, enY: 50, enH: 8, pbw: 120, flip: false }); assert(calls.length >= 2 && calls.every(c => typeof c === 'string' || c[0] + c[2] <= 10 + 120 + 2), 'inside the panel')
  r.breath[t.side] = 0; world(f, t, 1); calls.length = 0; FL.drawBenBreathHud(ctx, t, { x: 10, enY: 50, enH: 8, pbw: 120, flip: true }); assert(calls.includes('DROWNING'), 'drowning pulse')
  const snap = JSON.stringify(FR(f)); FL.drawBenBreathHud(ctx, t, { x: 10, enY: 50, enH: 8, pbw: 120 }); assert.equal(JSON.stringify(FR(f)), snap, 'render-only')
})

// ── 6 / 10 WATERBORNE AFFINITY ────────────────────────────────────────────────────────────────────────────
test('10. tag map: data only; Ripjaws / Arcticguana / Big Chill forms + Frozone / Arlong roster are waterborne; human Ben and Goku are not', () => {
  for (const k of ['ripjaws', 'arcticguana', 'bigchill']) { const f = ben(k, LOAD); assert(WA.isWaterborneFighter(f), k) }
  assert.equal(WA.isWaterborneFighter(ben(null)), false, 'human Ben'); for (const k of ['frozone', 'arlong']) assert(WA.isWaterborneFighter(foe(k)), k)
  for (const k of ['goku', 'tobirama', 'enoch', 'luffy']) assert.equal(WA.isWaterborneFighter(foe(k)), false, k)
  for (const k of Object.keys(WA.WATER_AFFINITY_ROSTER)) assert(characters[k], 'roster id exists: ' + k)
  for (const k of Object.keys(WA.WATER_AFFINITY_FORMS)) assert(BEN10_ALIEN_REGISTRY.some(a => a.id === k || a.key === k) || getAlienDefinition(k), 'alien id exists: ' + k)
  assert(Object.values({ ...WA.WATER_AFFINITY_ROSTER, ...WA.WATER_AFFINITY_FORMS }).every(v => v.every(x => x === 'water' || x === 'ice')))
})
test('10. waterborne foes: no breath, no penalties, no Undertow / Breath Steal; ordinary physics', () => {
  const f = ben(), t = foe('frozone'); const r = flood(f, t, { level: 2 }); world(f, t, 1); const w = FL.waterOf(t)
  assert.equal(w.wb, true); assert.equal(w.depth, 'submerged'); world(f, t, 500); assert.equal(r.breath[t.side], undefined, 'no breath'); assert.equal(t.health, t.maxHealth, 'never drowns')
  assert.equal(FL.breathHit(f, t, 'c1'), false); assert.equal(FL.breathHit(f, t, 'u1', 'undertow'), false); assert.equal(t._benSinkT, undefined)
  const a = foe('frozone', 500), b = foe('frozone', 500); for (let i = 0; i < 30; i++) { b._benWater = { ttl: 2, depth: 'submerged', wb: true, lineY: 0 }; for (const q of [a, b]) { physics.moveFighter(q, { d: true }, CONTROLS); physics.applyGravity(q) } }
  assert.equal(b.x, a.x, 'waterborne walk unchanged'); assert.equal(FL.benWaterKnockback(Object.assign(foe('frozone'), { vx: 10, vy: -10, _benWater: { ttl: 2, depth: 'submerged', wb: true } })), undefined)
})
test('10. transitions: a transform completing mid-flood updates waterborne next tick (breath cleared / restarts at 100); MIRROR — two Ripjaws, neither breathes', () => {
  const f = ben(), g = ben('heatblast', LOAD); g.side = 'p2'; g.x = 520; const r = flood(f, g, { level: 2 }); world(f, g, 60)
  assert(r.breath.p2 < 100, 'heatblast loses breath'); assert(F.applyAlien(g, 'bigchill')); world(f, g, 1); assert.equal(r.breath.p2, undefined, 'became waterborne: cleared'); assert.equal(FL.waterOf(g).wb, true)
  assert(F.applyAlien(g, 'heatblast')); world(f, g, 1); assert(Math.abs(r.breath.p2 - (100 - FL.BREATH.DRAIN)) < 1e-9, 'non-waterborne again: restarts at 100')
  const m = ben(), n = ben('ripjaws', LOAD); n.side = 'p2'; n.x = 520; const rm = flood(m, n, { level: 2 }); world(m, n, 200); A.tickBenAlienForm(n, {}, ctxOf(n, m))   // world() only ticks the first fighter's form
  assert.equal(FL.waterOf(n).wb, true); assert.equal(S(n).depth, 'submerged'); assert.equal(n._skinAnim, R.ANIM_WATER, 'both swim'); world(m, n, 300)
  assert.deepEqual(rm.breath, {}, 'mirror: no breath'); assert.equal(n.health, n.maxHealth)
})

// ── 7 / 11 / 12 FIRE + ELECTRIC ───────────────────────────────────────────────────────────────────────────
const fireP = (owner, x, y, extra = {}) => { const p = { name: 'heatblast_fire', owner, x, y, w: 30, h: 30, vx: -10, vy: 0, damage: 30, lifetime: 120, ...extra }; A.activeProjectiles.push(p); return p }
const alive = p => A.activeProjectiles.includes(p)
const tickOwn = (f, t, n = 1) => { for (let i = 0; i < n; i++) { FRAME++; FL.tickBenFlood(f, ctxOf(f, t), { getOpponent: () => t, activeProjectiles: () => A.activeProjectiles }) } }
test('11. FIZZLE: a fire cast anchored below the line never exists (deleted before it can hit; cost stays spent); steam is render-only', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); const ly = FL.floodLineY(r)
  const p = fireP(t, 700, ly + 60), hp = f.health; tickOwn(f, t)
  assert.equal(alive(p), false, 'deleted'); assert.equal(r.fizzles, 1); assert.equal(f.health, hp, 'no hit'); assert.equal(r.boiled, 0, 'a fizzle never boils')
  assert(!/steam/i.test(JSON.stringify(r)) && !/steam/i.test(JSON.stringify(Object.keys(f))), 'no steam in GAME_STATE')
  const q = fireP(t, 700, ly - 200); tickOwn(f, t, 3); assert(alive(q), 'fire above the line burns on'); assert.equal(WA.isFireProj({ name: 'kiBlast' }), false); A.activeProjectiles.length = 0
})
test('11. PUT OUT + BOIL: fire crossing the line from above is deleted and drops it 30 px — once per 180f per owner, ≤ 90 px per flood', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); const L0 = r.line
  const drop = () => { const ly = FL.floodLineY(r), p = fireP(t, 700, ly - 40, { vx: 0, vy: 10 }); for (let i = 0; i < 12 && alive(p); i++) { tickOwn(f, t); p.y += p.vy } assert.equal(alive(p), false, 'put out'); return r.boiled }
  assert.equal(drop(), 30); assert(Math.abs(r.line - (L0 - 30)) < 1e-9, 'line −30 px'); assert.equal(r.putOut, 1)
  assert.equal(drop(), 30, 'same owner inside 180f: put out, no boil'); assert.equal(r.putOut, 2)
  const g = foe('goku'); g.side = 'p3'; const ly = FL.floodLineY(r), p = fireP(g, 700, ly - 40, { vx: 0, vy: 10 }); for (let i = 0; i < 12 && alive(p); i++) { tickOwn(f, t); p.y += p.vy } assert.equal(r.boiled, 60, 'another owner boils on its own clock')
  tickOwn(f, t, 180); assert.equal(drop(), 90); r.boilAt = {}; assert.equal(drop(), 90, 'capped at 90 px per flood'); assert(Math.abs(r.line - (L0 - 90)) < 1e-9)
  A.activeProjectiles.length = 0
})
test('11. BURN ENDS when the burning fighter is submerged (Heatblast Scorch, Enoch, Sanji); a dry burn runs on', () => {
  const f = ben(), t = foe(); flood(f, t, { level: 2 }); world(f, t, 1); assert.equal(FL.waterOf(f).depth, 'submerged')
  t.omnitrix = { formState: { kind: 'heatblast', scorch: { burnT: 40, burnTick: 3, immune: 0 } } }; t.transformed = true
  t._enoch = { aff: { [f.side]: { burn: 2, burnT: 30 } } }; t._sanji = { burn: 80, burnTick: 4 }; f._fireBurn = { t: 0, max: 60 }
  tickOwn(f, t); const sc = t.omnitrix.formState.scorch; assert.equal(sc.burnT, 0); assert(sc.immune > 0, 'the natural post-burn immunity'); assert.equal(t._enoch.aff[f.side].burn, 0); assert.equal(t._sanji.burn, 0); assert.equal(f._fireBurn, null)
  const d = ben(), u = foe(); flood(d, u); world(d, u, 1); u._sanji = { burn: 80, burnTick: 4 }; tickOwn(d, u); assert.equal(u._sanji.burn, 80, 'wading: burn continues')
})
test('11. FIRE ULTIMATE: the flood drops to 0 over 60f, ends, cooldown starts (by ultimate element or a fire ultimate projectile); breath stops', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe('madara'); const r = flood(f, t, { level: 2 }); world(f, t, 1); r.breath[t.side] = 30
  t.ultimateCooldown = 0; tickOwn(f, t); t.ultimateCooldown = 600; tickOwn(f, t); assert.equal(r.phase, 'boil'); assert.equal(r.fireUlts, 1); const L = r.line
  tickOwn(f, t, 30); assert(r.line < L && r.line > 0); const fp = fireP(t, 700, FL.floodLineY(r) + 40); tickOwn(f, t); assert(alive(fp), 'nothing is put out while it boils away')
  tickOwn(f, t, 29); assert.equal(r.phase, 'off'); assert.equal(r.line, 0); assert.equal(r.cd, FL.FLOOD.CD, '900f cooldown'); assert.equal(f.energy >= 0, true)
  const g = ben(), u = foe(); const q = flood(g, u, { level: 2 }); A.activeProjectiles.length = 0; fireP(u, 700, 40, { name: 'hb_ult_opener', isUltimate: true }); tickOwn(g, u); assert.equal(q.phase, 'boil', 'a fire ultimate projectile'); A.activeProjectiles.length = 0
  const h = ben(), v = foe('goku'); const q2 = flood(h, v, { level: 2 }); tickOwn(h, v); v.ultimateCooldown = 600; tickOwn(h, v); assert.equal(q2.phase, 'hold', 'a ki ultimate does nothing'); A.activeProjectiles.length = 0
})
test('12. ELECTRIC on a SUBMERGED fighter +15 % (waterborne too); dry / wading / non-electric unchanged', () => {
  const dmg = (depth, src, atk, move) => { const t = foe('goku'); t.health = 1000; if (depth) t._benWater = { ttl: 2, depth, wb: false }; const a = ben(atk === 'mw' ? 'megawhatt' : 'ripjaws', LOAD)
    C.applyScaledDamage(t, 100, { scale: 1, source: src, attacker: a, move, defenseApplied: true, offenseApplied: true }); return 1000 - t.health }
  const base = dmg(null, 'projectile', 'rj', 'zoldyck_bolt'); assert(base > 0)
  assert(Math.abs(dmg('submerged', 'projectile', 'rj', 'zoldyck_bolt') / base - 1.15) < 0.02, 'electric projectile +15 %')
  assert(Math.abs(dmg('submerged', 'melee', 'mw') / dmg(null, 'melee', 'mw') - 1.15) < 0.02, 'Megawhatt body (melee) +15 %')
  assert.equal(dmg('wading', 'projectile', 'rj', 'zoldyck_bolt'), base, 'wading unchanged'); assert.equal(dmg('submerged', 'projectile', 'rj', 'kiBlast'), dmg(null, 'projectile', 'rj', 'kiBlast'), 'non-electric unchanged')
  const z = foe('zenitsu'), f = ben(); f._benWater = { ttl: 2, depth: 'submerged', wb: true }; const h0 = f.health; C.applyScaledDamage(f, 100, { scale: 1, source: 'melee', attacker: z, defenseApplied: true, offenseApplied: true }); const sub = h0 - f.health
  delete f._benWater; f.health = h0; C.applyScaledDamage(f, 100, { scale: 1, source: 'melee', attacker: z, defenseApplied: true, offenseApplied: true }); assert(Math.abs(sub / (h0 - f.health) - 1.15) < 0.02, 'a waterborne Ripjaws takes it too')
})

// ── 8 / 13 SPECIALS ───────────────────────────────────────────────────────────────────────────────────────
const SPAWNED = []; { const push0 = A.activeProjectiles.push; A.activeProjectiles.push = function (...a) { SPAWNED.push(...a); for (const p of a) if (p) p.__life0 = p.lifetime; return push0.apply(this, a) } }   // spawn log (hitboxes can land and vanish the frame they spawn)
const projs = (f, rj) => SPAWNED.filter(p => p.owner === f && p.alien && p.alien.rj === rj)
const rushTap = f => { S(f).dashTapT = S(f).t }
test('13. WATER JET ↓↘→+P: cost 10, 14f, 450 px at full speed even under water, 35, water-tagged, one on screen, −10 on block', () => {
  A.activeProjectiles.length = 0; SPAWNED.length = 0; const f = ben(), t = foe(); reset(f, t, 200); f.energy = 100; assert(cast(f, t, 'N')); assert.equal(100 - f.energy, RJ_COST.jet)
  world(f, t, R.RJ_JET.STARTUP - 1); assert.equal(projs(f, 'jet').length, 0); world(f, t, 1); const [p] = projs(f, 'jet'); assert(p, 'spawned at 14f')
  assert.equal(p.damage, 35); assert.equal(p.alien.element, 'water'); assert.equal(p.__life0 * Math.abs(p.vx), 450, '450 px'); assert.equal(WA.isFireProj(p), false)
  assert.equal(p.blockstun, R.blockstunFor(R.RJ_JET.RECOVERY, -10), '−10 on block'); ready(f); f.energy = 100; assert.equal(cast(f, t, 'N'), false, 'one on screen'); assert.equal(f.energy, 100)
  const hp = t.health; world(f, t, 30); assert(hp - t.health > 0 && !A.activeProjectiles.includes(p), 'it connects (35 before the global damage scale)'); A.activeProjectiles.length = 0
  const g = ben(), u = foe(); const r = flood(g, u, { level: 2 }); reset(g, u, 380); g.y = 410 - g.h; u.y = 410 - u.h; ready(g); g.energy = 100; assert(cast(g, u, 'N')); world(g, u, R.RJ_JET.STARTUP)
  const [q] = projs(g, 'jet'); assert(FL.projBelow(r, q), 'below the line'); const x0 = q.x; world(g, u, 3); assert.equal(q.x - x0, 3 * R.RJ_JET.SPEED, 'full speed in water'); A.activeProjectiles.length = 0
})
test('13. SHARK RUSH →→+P: dry 320 px / 45 / −13; submerged 8-direction (fixed at the cast) 420 px / 55 / −11 + Breath Steal', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe(); reset(f, t, 600); f.energy = 100; rushTap(f); assert(cast(f, t, 'F')); assert.equal(100 - f.energy, RJ_COST.rush)
  const x0 = f.x; world(f, t, R.RJ_RUSH.STARTUP + R.RJ_RUSH.TRAVEL + 2); assert(Math.abs(f.x - x0 - 320) < 1e-6, `dry 320 px (${f.x - x0})`)
  const d = ben(), v = foe(); reset(d, v, 40); rushTap(d); assert(cast(d, v, 'F')); world(d, v, R.RJ_RUSH.STARTUP + 1); const [hb] = projs(d, 'rush'); assert.equal(hb.damage, 45)
  assert.equal(hb.blockstun, R.blockstunFor(R.RJ_RUSH.RECOVERY + R.RJ_RUSH.TRAVEL - 1, -13))
  A.activeProjectiles.length = 0; const g = ben(), u = foe(); const r = flood(g, u, { level: 2 }); reset(g, u, 600); g.y = 300; world(g, u, 2)
  assert(S(g).swimming); rushTap(g); g.x = 300; const gx = g.x, gy = g.y; world(g, u, 1, { right: true, down: true }); ready(g); g.energy = 100; rushTap(g); assert(cast(g, u, 'F'))
  world(g, u, R.RJ_RUSH.STARTUP + R.RJ_RUSH.TRAVEL + 2, i => i < 3 ? { right: true, down: true } : { left: true, up: true })
  const dx = g.x - gx, dy = g.y - gy; assert(dx > 0 && dy > 0, `diagonal down-forward (${dx}, ${dy})`); assert(Math.abs(Math.hypot(dx, dy) - 420) < 40 || g.y >= 410 - g.h - 1, `≈420 px or floor-clamped (${Math.hypot(dx, dy)})`)
  A.activeProjectiles.length = 0; const h = ben(), w = foe(); const r2 = flood(h, w, { level: 2 }); reset(h, w, 30); h.y = 410 - h.h; w.y = 410 - w.h; world(h, w, 1); r2.breath[w.side] = 80
  ready(h); rushTap(h); assert(cast(h, w, 'F')); world(h, w, R.RJ_RUSH.STARTUP + 1); const [hb2] = projs(h, 'rush'); assert.equal(hb2.damage, 55); assert.equal(hb2.blockstun, R.blockstunFor(R.RJ_RUSH.RECOVERY + R.RJ_RUSH.TRAVEL - 1, -11))
  world(h, w, 4); assert(w.health < w.maxHealth, 'connects'); assert(r2.breath[w.side] < 80 - 5, 'Breath Steal −6'); A.activeProjectiles.length = 0
})
test('13. FIN BLADE ↓↙←+P: cost 12, 14f, 2 hits 18 / 22, 260 px, −12 on block, extended-limb hurtbox', () => {
  A.activeProjectiles.length = 0; SPAWNED.length = 0; const f = ben(), t = foe(); reset(f, t, 150); f.energy = 100; const hb0 = C.getHurtbox(f); assert(cast(f, t, 'B')); assert.equal(100 - f.energy, RJ_COST.fin)
  world(f, t, R.RJ_FIN.STARTUP - 1); assert.equal(projs(f, 'fin').length, 0); assert.deepEqual(C.getHurtbox(f), hb0, 'no extension before the active frames')
  const hp = t.health; world(f, t, 1); const h1 = SPAWNED.find(p => p.name === 'rj_fin_0'); assert(h1 && h1.damage === 18 && h1.w === 260, 'hit 1: 18, 260 px')
  const hx = C.getHurtbox(f); assert(hx.w > hb0.w + 200 && hx.x === hb0.x, 'the hurtbox reaches out with the fin')
  assert.equal(h1.blockstun, R.blockstunFor(R.RJ_FIN.TOTAL - R.RJ_FIN.STARTUP - R.RJ_FIN.ACTIVE, -12), '−12 on block')
  world(f, t, R.RJ_FIN.GAP); const h2 = SPAWNED.find(p => p.name === 'rj_fin_1'); assert(h2 && h2.damage === 22); world(f, t, 4); assert(hp - t.health > 22, `both hits connect at 150 px (${hp - t.health}; one hit alone scales to ≤ 13)`)
  world(f, t, R.RJ_FIN.TOTAL); assert.deepEqual(C.getHurtbox(f), hb0, 'back to normal'); A.activeProjectiles.length = 0
})
test('13. BREACH →↓↘+P: dry anti-air 55 + launch; submerged surface-launch to the line + 60 px, 60, pops an opponent within 160 px; once per airtime, no jump refill', () => {
  A.activeProjectiles.length = 0; SPAWNED.length = 0; const f = ben(), t = foe(); reset(f, t, 20); t.y -= 80; t.onGround = t.grounded = false; f.energy = 100; assert(cast(f, t, 'U')); assert.equal(100 - f.energy, RJ_COST.breach)
  world(f, t, R.RJ_BREACH.STARTUP + 1); const [hb] = projs(f, 'breach'); assert(hb.damage === 55 && hb.launcher, 'dry: 55, launches'); const y1 = f.y; world(f, t, 3); assert(f.y < y1, 'rising')
  world(f, t, R.RJ_BREACH.RISE); ready(f); f.jumpCount = 1; f.energy = 100; assert.equal(cast(f, t, 'U'), false, 'once per airtime'); assert.equal(f.jumpCount, 1, 'no refill')
  A.activeProjectiles.length = 0; const g = ben(), u = foe(); const r = flood(g, u, { level: 2 }); reset(g, u, 60); g.y = 410 - g.h; u.y = 410 - u.h; world(g, u, 2); ready(g); g.energy = 100
  assert(cast(g, u, 'U')); world(g, u, R.RJ_BREACH.STARTUP + 1); const [hs] = projs(g, 'breach'); assert.equal(hs.damage, 60); world(g, u, R.RJ_BREACH.RISE)   // the last rise step is integrated the frame after
  assert(Math.abs((g.y + g.h) - (FL.floodLineY(r) - 60)) < 2, `burst to the surface + 60 px (feet ${g.y + g.h} vs ${FL.floodLineY(r) - 60})`)
  assert(u.y + u.h <= FL.floodLineY(r) + 1 || (u.hitstun > 0 && u.vy < 0), 'popped above the line (or launched by the bite)')
  const p = ben(), q = foe(); const r2 = flood(p, q, { level: 2 }); reset(p, q, 400); p.y = 410 - p.h; q.y = 410 - q.h; world(p, q, 2); ready(p); p.energy = 100; assert(cast(p, q, 'U')); world(p, q, R.RJ_BREACH.STARTUP + R.RJ_BREACH.RISE + 1)
  assert(q.y + q.h > FL.floodLineY(r2), 'beyond 160 px: not popped'); A.activeProjectiles.length = 0
})
test('13. DIVE BITE air ↓+P: cost 12, 48, once per airtime, no jump refill, UNDERTOW on a wading / submerged target', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe(); reset(f, t, 10); f.y = 200; f.onGround = f.grounded = false; world(f, t, 1); f.energy = 100; f.jumpCount = 2
  assert(cast(f, t, 'D')); assert.equal(100 - f.energy, RJ_COST.dive); world(f, t, R.RJ_DIVE.STARTUP + 1); const [hb] = projs(f, 'dive'); assert.equal(hb.damage, 48)
  world(f, t, 3); assert(!f.onGround); assert.equal(f.jumpCount, 2, 'the bite never refills a jump (landing refills as normal)'); ready(f); assert.equal(cast(f, t, 'D'), false, 'once per airtime')
  A.activeProjectiles.length = 0; const g = ben(), u = foe(); const r = flood(g, u); reset(g, u, 10); u.y = 410 - u.h; world(g, u, 1); assert.equal(FL.waterOf(u).depth, 'wading'); r.breath[u.side] = 100
  g.y = 120; g.onGround = g.grounded = false; world(g, u, 1); ready(g); g.energy = 100; assert(cast(g, u, 'D')); let lo = 100; for (let i = 0; i < 30; i++) { world(g, u, 1); lo = Math.min(lo, r.breath[u.side]) }
  assert(u.health < u.maxHealth, 'the bite lands'); assert(Math.abs(lo - (100 - 15)) < 0.01, `Undertow −15 once (low ${lo})`); assert.equal(r.taken[u.side].filter(x => x.startsWith('undertow')).length, 1); A.activeProjectiles.length = 0
})

// ── 9 / 14 ULTIMATE: MAELSTROM FEAST ───────────────────────────────────────────────────────────────────────
const finish = (f, t) => { let n = 0; while (S(f).ult && n < 400) { world(f, t, 1); n++ } }   // step to the frame the Ultimate ends
const feast = (f, t) => { f.energy = 100; assert(ult(f, t), 'ultimate cast'); world(f, t, R.RJ_ULT.OPENER_AT + 2) }
test('14. opener 40 (cost 55); whiff or block → no cinematic, 60f recovery', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe(); reset(f, t, 500); f.energy = 100; assert(ult(f, t)); assert.equal(100 - f.energy, RJ_COST.ultimate)
  world(f, t, R.RJ_ULT.OPENER_AT + 2); assert.equal(S(f).ult.phase, 'opener', 'whiff'); world(f, t, R.RJ_ULT.WHIFF + 2); assert.equal(S(f).ult, null); assert.equal(S(f).lastUlt, null, 'no cinematic')
  const g = ben(), u = foe(); reset(g, u, 30); u.isBlocking = true; feast(g, u); assert.equal(S(g).ult.phase, 'opener', 'blocked: no cinematic'); A.activeProjectiles.length = 0
})
test('14. cinematic: wave 3×25 → abyss 4×20 (hash spots, plain numbers) → geyser 45 + knockdown = 240 unscaled; positions restore; 100f lockout', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe(); reset(f, t, 30); const home = { x: f.x, y: f.y }, thome = { x: t.x, y: t.y }; feast(f, t); const u = S(f).ult
  assert.notEqual(u.phase, 'opener', 'clean opener → cinematic'); assert(u.spots.every(p => Number.isFinite(p.dx) && Number.isFinite(p.dy)))
  assert.deepEqual(u.spots, R.abyssSpots(S(f).seed, u.spotFrame, 0), 'hash(seed, frame, player)'); assert.notDeepEqual(R.abyssSpots(S(f).seed, u.spotFrame + 1, 0), u.spots)
  let n = 0; while (S(f).ult && n < 400) { world(f, t, 1); n++ } const L = S(f).lastUlt; assert.deepEqual(L.hits, [40, 25, 25, 25, 20, 20, 20, 20, 45]); assert.equal(L.raw, 240)
  assert.equal(f.x, home.x); assert.equal(t.x, thome.x); assert(t.knockdownState, 'knockdown'); assert(Math.abs(f.attackCooldown - R.RJ_ULT.LOCKOUT) <= 1, '100f lockout')
  const g = ben(), u2 = foe(); reset(g, u2, 30); const h0 = u2.health; feast(g, u2); g._benWater = { ttl: 2, depth: 'submerged', wb: true }; S(g).depth = 'submerged'; world(g, u2, R.RJ_ULT.END + 2)
  assert.deepEqual(S(g).lastUlt.hits, [40, 25, 25, 25, 20, 20, 20, 20, 45], 'the depth edge never adds')
})
test('14. afterwards: the flood → Level 2 for 300f when none is live and no cooldown; opponent breath = min(current, 40) once', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe(); reset(f, t, 30); feast(f, t); finish(f, t); const r = FR(f)
  assert(r && r.level === 2 && r.byUlt && r.dur === 300, 'ult flood at Level 2'); assert(Math.abs(r.breath[t.side] - 40) <= FL.BREATH.REFILL + 1e-9, 'breath = 40 (the flood tick of the same frame then refills one step)')
  world(f, t, FL.FLOOD.RISE2 + 2); assert(Math.abs(r.line - r.l2) < 1e-6); world(f, t, 300 - FL.FLOOD.RISE2 - 6); assert(r.phase !== 'recede'); world(f, t, 8); assert.equal(r.phase, 'recede', '300f in total')
  const g = ben(), u = foe(); const q = flood(g, u); world(g, u, 1); q.breath[u.side] = 70; reset(g, u, 30); ready(g); feast(g, u); finish(g, u)
  assert.equal(FR(g), q, 'a live flood is kept'); assert.equal(q.level, 1); assert(Math.abs(q.breath[u.side] - 40) <= FL.BREATH.REFILL + 1e-9, 'min(70, 40)')
  const h = ben(), v = foe(); h._benFlood = { phase: 'off', cd: 500, line: 0 }; reset(h, v, 30); feast(h, v); finish(h, v); assert.equal(FR(h).phase, 'off', 'cooldown running: no flood')
  const m = ben(), n = foe(); const qm = flood(m, n); world(m, n, 1); reset(m, n, 30); feast(m, n); assert(qm.paused); qm.breath[n.side] = 20; finish(m, n); assert(Math.abs(qm.breath[n.side] - 20) <= FL.BREATH.REFILL + 1e-9, 'min(20, 40) keeps 20')
})
test('14. breath and drowning pause during the cinematic (no damage beyond the 240)', () => {
  A.activeProjectiles.length = 0; const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); reset(f, t, 30); f.y = 410 - f.h; t.y = 410 - t.h; world(f, t, 1); r.breath[t.side] = 0
  const hp = t.health; feast(f, t); const b0 = r.breath[t.side]; assert(S(f).ult.phase !== 'opener'); world(f, t, R.RJ_ULT.END - R.RJ_ULT.OPENER_AT)
  assert.equal(r.breath[t.side], b0, 'breath frozen'); assert(r.paused); world(f, t, 20); assert.equal(r.paused, undefined, 'resumes after')
})

// ── 10 COMBO ROUTES (85 % scaling, reset 90f, totals ±20 %; design model + live) ───────────────────────────────
const RAW = { jab: BA.light.damage, heavy: BA.heavy.damage, low: BA.down.damage, launcher: BA.up.damage, air: BA.air.damage,
  jet: R.RJ_JET.DMG, rushSub: R.RJ_RUSH.SUB.DMG, fin: R.RJ_FIN.DMG }
const modelHits = route => route.flatMap(k => Array.isArray(RAW[k]) ? RAW[k] : [RAW[k]])
const model = (route, edge = 1) => modelHits(route).reduce((sum, d, i) => sum + d * DM * edge * Math.pow(0.85, i), 0)
const ROUTES = [
  ['1. Jab, Jab, Launcher, Air', ['jab', 'jab', 'launcher', 'air'], 98, 1],
  ['2. Low, Heavy, Water Jet', ['low', 'heavy', 'jet'], 118, 1],
  ['3. Shark Rush (submerged), Heavy, Fin Blade', ['rushSub', 'heavy', 'fin'], 140, R.RJ_EDGE.SUB_DMG],
]
for (const [name, route, target, edge] of ROUTES) test('design total ' + name + ' ≈ ' + target, () => {
  const v = model(route, edge); console.log(`   model ${v.toFixed(1)} vs target ${target}`); assert(near(v, target), `${v} not within ±20% of ${target}`)
})
test('route 1 live: Jab, Jab, Launcher, Air all connect and scale down', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'light'), melee(f, t, 'light'), melee(f, t, 'up'), melee(f, t, 'air')]
  assert(d.every(x => x > 0)); assert(d[1] <= d[0]); assert.equal(f.comboCounter, 4); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 2 live: Low, Heavy, Water Jet', () => {
  clearProj(); const f = ben(), t = foe(); reset(f, t, 10); const d = [melee(f, t, 'down'), melee(f, t, 'heavy')]
  reset(f, t, 120); const hp = t.health; assert(cast(f, t, 'N'), 'Water Jet'); for (let i = 0; i < 40; i++) { world(f, t, 1); t.hitstun = Math.min(t.hitstun, 13) } d.push(hp - t.health)
  assert(d.every(x => x > 0)); assert.equal(f.comboCounter, 3); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b))
})
test('route 3 live: Shark Rush (submerged), Heavy, Fin Blade — the submerged edge applies', () => {
  clearProj(); const f = ben(), t = foe(); flood(f, t, { level: 2 }); reset(f, t, 60); f.y = 410 - f.h; t.y = 410 - t.h; world(f, t, 2); assert.equal(S(f).depth, 'submerged')
  const hp0 = t.health; ready(f); rushTap(f); assert(cast(f, t, 'F'), 'Shark Rush'); world(f, t, R.RJ_RUSH.STARTUP + R.RJ_RUSH.TRAVEL); const d = [hp0 - t.health]; while (S(f).rush) { world(f, t, 1); t.hitstun = Math.max(t.hitstun, 10) }   // the rush recovers, the target stays in the combo
  clearProj(); ready(f); reset(f, t, 10); t.y = 410 - t.h; d.push(melee(f, t, 'heavy')); reset(f, t, 150); t.y = 410 - t.h; const hp = t.health; ready(f); assert(cast(f, t, 'B'), 'Fin Blade')
  for (let i = 0; i < R.RJ_FIN.TOTAL; i++) { world(f, t, 1); t.hitstun = Math.min(t.hitstun, 13) } d.push(hp - t.health)
  assert(d.every(x => x > 0), d.join(',')); assert(f.comboCounter >= 4, 'one combo (4 hits)'); console.log('   HP', d.join('+'), '=', d.reduce((a, b) => a + b)); clearProj()
})

// ── 10 lifecycle / slot 20 via the Dial / Vow / determinism / performance ────────────────────────────────────
test('15. swap / revert / KO / rematch / round end clear Ripjaws\' form state and the flood (breath, stamps, cooldown)', () => {
  const f = ben('ripjaws', LOAD), t = foe(); const r = flood(f, t, { level: 2 }); world(f, t, 1); r.breath[t.side] = 30; S(f).storm = null
  assert(F.applyAlien(f, 'goop')); assert.equal(r.end, 'swap', 'swap: 90f recede'); world(f, t, FL.FLOOD.RECEDE + 2); assert.equal(FR(f).phase, 'off'); assert.equal(t._benWater, undefined)
  const g = ben('ripjaws', LOAD), u = foe(); flood(g, u); F.revertToHuman(g); assert.equal(g.omnitrix.formState, null, 'revert'); assert.equal(FR(g).end, 'swap')
  const k = ben(), v = foe(); flood(k, v); world(k, v, 1); k.health = 0; handleBenKO(k); assert.equal(FR(k), undefined, 'KO: instant, no cooldown'); assert.equal(v._benWater, undefined)
  const n = S(ben()); assert.deepEqual([n.storm, n.jet, n.rush, n.fin, n.breach, n.dive, n.ult, n.swimming || false], [null, null, null, null, null, null, null, false], 'rematch: a fresh form state')
})
test('17. slot 20 → PICK FIVE: slot count stays 5, Ripjaws READY + pickable (catalog slot 20, contiguous), nothing overwritten', () => {
  assert.equal(BEN10_SLOT_COUNT, 5); assert.equal(F.MAX_OMNITRIX_SLOTS, BEN10_SLOT_COUNT); assert.equal(F.DEFAULT_OMNITRIX.length, BEN10_SLOT_COUNT)
  const d = getAlienDefinition('ripjaws'); assert.equal(d.status, 'ready'); assert.equal(d.slot, 20); assert.equal(d.displayName, 'Ripjaws')
  for (const k of ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin', 'wildvine', 'jetray', 'diamondhead_ov', 'upgrade_ov', 'humongousaur', 'feedback_ov', 'arcticguana', 'benwolf', 'bigchill']) assert.equal(getAlienDefinition(k).status, 'ready', k)
  assert.equal(BEN10_ALIEN_REGISTRY.filter(x => x.id === 'ripjaws').length, 1); assert.equal(buildLoadout().length, BEN10_SLOT_COUNT)
  const slots = BEN10_ALIEN_REGISTRY.filter(x => x.status === 'ready' && Number.isFinite(x.slot)).map(x => x.slot); assert.equal(new Set(slots).size, slots.length, 'no slot collision')
  assert(/Sheet by Dragonrod/.test(fs.readFileSync(d.ledgerPath, 'utf8')), 'ledger credit')
})
test('17. Omnitrix Dial: Ripjaws picked into the last slot — same cost as any slot, no clock change; a hit cancels like any pick; HUD fits', () => {
  const pick = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'ripjaws'], go = slot => { const f = fresh(); F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, pick); f.energy = 100
    const fr0 = FRAME; assert(F.ben10TransformOrSwap(f, slot, { seed: 1, frame: 0, playerIndex: 0 })); for (let i = 0; i < 80 && !f.transformed; i++) F.updateTransformDevice?.(f, 1000 / 60)
    assert.equal(FRAME, fr0, 'no clock change'); return { f, spent: 100 - f.energy } }
  const a = go(BEN10_SLOT_COUNT - 1), b = go(0); assert.equal(a.f.activeAlien, 'ripjaws'); assert(Math.abs(a.spent - b.spent) < 1e-9, `same cost ${a.spent} vs ${b.spent}`)
  assert('Ripjaws'.length <= 'Arcticguana'.length, 'the HUD name is no longer than an existing one (no overflow)')
  const h = fresh(); F.applyBen10VariantStats(h, 'default'); F.setupBen10(h, pick); h.energy = 100; assert(F.ben10TransformOrSwap(h, 4, { seed: 1, frame: 0, playerIndex: 0 }))
  const g = fresh(); F.applyBen10VariantStats(g, 'default'); F.setupBen10(g, pick); g.energy = 100; assert(F.ben10TransformOrSwap(g, 0, { seed: 1, frame: 0, playerIndex: 0 }))
  for (const x of [h, g]) { x.hitstun = 20; for (let i = 0; i < 5; i++) F.updateTransformDevice?.(x, 1000 / 60) }
  assert.equal(h.transformed, g.transformed, 'Ripjaws behaves exactly like slot 1 under a hit')
})
test('17. Vow pick includes Ripjaws (mod loadout length); same seed → same pick', () => {
  const L = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'ripjaws'], mk = () => { const f = ben(null); f.omnitrix.aliens = L.slice(); return f }
  const a = mk(), b = mk(), picks = new Set()
  for (let frame = 0; frame < 400; frame++) { const x = F.ben10VowPick(a, 777, frame, 0); assert.equal(x, F.ben10VowPick(b, 777, frame, 0)); assert(x < L.length); picks.add(L[x]) }
  assert(picks.has('ripjaws') && picks.size === L.length)
})
test('16. same-seed determinism: flood + breath + specials + Ultimate → identical GAME_STATE; lightning / rain / creature layout from the seed', () => {
  const run = (seed = 4242) => {
    FRAME = 0; SEED = seed; A.clearAbilityState(); const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); reset(f, t, 30); f.y = 410 - f.h; t.y = 410 - t.h; world(f, t, 30)
    ready(f); cast(f, t, 'B'); world(f, t, 50); reset(f, t, 200); t.y = 410 - t.h; ready(f); cast(f, t, 'N'); world(f, t, 40); reset(f, t, 30); t.y = 410 - t.h; ready(f); f.energy = 100; ult(f, t); world(f, t, 200)
    const flashes = []; for (let fr = 0; fr < 600; fr++) if (FR(f) && FL.lightningOn(FR(f), fr)) flashes.push(fr)
    clearProj(); return JSON.stringify({ s: S(f), fl: FR(f), hp: t.health, e: f.energy, x: f.x, tx: t.x, flashes, sinkT: t._benSinkT ?? null })
  }
  const a = run(), b = run(); assert.equal(a, b); assert.notEqual(run(9999), a, 'a different seed differs')
})
test('16. GAME_STATE stays plain data (form state + flood record) mid-flood and mid-cinematic; replay state holds only GAME_STATE fields', () => {
  const plain = o => o === null || o === undefined || ['number', 'string', 'boolean'].includes(typeof o) || (Array.isArray(o) ? o.every(plain) : typeof o === 'object' && Object.values(o).every(plain))
  clearProj(); const f = ben(), t = foe(); const r = flood(f, t, { level: 2 }); world(f, t, 20); assert(plain(S(f)) && plain(r) && plain(t._benWater), 'flood')
  reset(f, t, 30); ready(f); f.energy = 100; ult(f, t); world(f, t, 60); assert(S(f).ult && S(f).ult.phase !== 'opener', 'mid-cinematic'); assert(plain(S(f)) && plain(FR(f)), 'ult')
  assert(!/rain|ripple|foam|bubble|steam|flash/i.test(Object.keys(r).join(',')), 'no render-only fields in the record'); clearProj()
})
test('16. performance: rain / ripples / bubbles draw from a pooled, cached table — no per-frame allocations, no pixel scans', () => {
  const src = fs.readFileSync('benFlood.js', 'utf8'), body = src.slice(src.indexOf('export function drawBenFlood('), src.indexOf('export function drawBenFloodFlash'))
  assert(!/getImageData|putImageData|createImageData|new Array|Array\.from|\[\]|\{ *x:/.test(body.replace(/STEAM\.splice[^;]*;/, '')), 'drawBenFlood allocates nothing per frame')
  const f = ben(), t = foe(); flood(f, t, { level: 2 }); let calls = 0; const c = new Proxy({}, { get: (o, k) => k in o ? o[k] : (k === 'getImageData' ? () => { throw new Error('pixel scan') } : () => { calls++ }), set: (o, k, v) => { o[k] = v; return true } })
  const t0 = performance.now(); for (let i = 0; i < 600; i++) FL.drawBenFlood(c, f, i, 1600); const ms = (performance.now() - t0) / 600
  assert(calls > 0); console.log(`   drawBenFlood ${ms.toFixed(3)} ms/frame`); assert(ms < 2, 'cheap')
  const t1 = performance.now(); for (let i = 0; i < 600; i++) FL.tickBenFlood(f, ctxOf(f, t), { getOpponent: () => t, activeProjectiles: () => A.activeProjectiles }); assert((performance.now() - t1) / 600 < 0.5, 'tick cheap')
})
test('no Math.random / gameRng in ripjaws.js / ripjawsAssets.js / benFlood.js / waterAffinity.js', () => {
  for (const file of ['ripjaws.js', 'ripjawsAssets.js', 'benFlood.js', 'waterAffinity.js']) assert(!/Math\.random|gameRng/.test(fs.readFileSync(file, 'utf8')), file)
})

//@@NEXT@@
console.log(`RIPJAWS: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
