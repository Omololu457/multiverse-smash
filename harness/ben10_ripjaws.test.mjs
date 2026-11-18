// harness/ben10_ripjaws.test.mjs — RIPJAWS (Piscciss Volann), the READY Omnitrix alien with the STORM TIDE flood.
// Drives the real modules (fighters / abilities / combat / physics + ripjaws.js + benFlood.js) headless, frame by frame.
//   node harness/ben10_ripjaws.test.mjs
// Slot: PICK FIVE (owner decision, no new dial slots) — Ripjaws is catalog slot 20 (after Big Chill 19), picked into the
// 5-slot loadout and reached with the Dial (↓↓ + slot key) like any other pick.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as G from '../arcticguana.js'
import * as R from '../ripjaws.js'
import * as FL from '../benFlood.js'
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
  assert(Math.abs(f.damageMultiplier - 1.00) < 1e-9 && Math.abs(f.defenseMultiplier - 1.05) < 1e-9 && Math.abs(f._benWeight - 1.10) < 1e-9, 'mods')
  assert(Math.abs(f._benWalkSpeed / ben('heatblast')._benWalkSpeed - 0.90 / getAlienDefinition('heatblast').mods.speed) < 1e-9, 'speed ×0.90')
  assert.equal(f.maxJumps, 2); assert.equal(f.health, 950, 'shared health'); assert.equal(f.activeAlienName, 'Ripjaws')
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

//@@NEXT@@
console.log(`RIPJAWS: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
