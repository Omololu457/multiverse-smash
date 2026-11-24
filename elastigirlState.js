// Elastigirl (elastigirl) — SIMULATION. Plain JSON on f._elastigirl (snapshotted for replay / LAN); sim ticks only:
// no RNG, no wall clock. Every export is a no-op for any other rosterKey.
//
// s.edges / s.used  press edges sampled from readRawControls (keyboard, pad, replay and LAN feed the same reader)
// s.dirs            facing-relative numpad direction history (compressed: one entry per change) for motion inputs
// s.sling           the live SLINGSHOT (Spider-Man's pendulum fields _swAX/_swAY/_swL/_swAng/_swVel own her position)
// s.para            the live air PARACHUTE float (×0.35 fall for ≤ 60 f, then the slam)
// s.cd              per-mechanic cooldowns (sling / guard / bounce); s.freeArm = Stretch Guard's free Long Arm window
// s.cues            one-shot sound / fx cues (render consumes them; NOT part of the snapshot — render-only)
// Fighter references (Long Arm pull target, raft passenger) live in a WeakMap outside the JSON state.
import * as D from './elastigirlData.js'
import { releaseSpidermanWebSwing } from './abilities.js'
import { startElastigirlUlt, clearElastigirlUlt, elastigirlUltScene } from './elastigirlUlt.js'   // FAMILY RAFT cinematic (frozen, cineRegistry.js)

const { EG_KEY, EG_ENERGY, EG_MOVES: MOVES } = D
export const isElastigirl = f => f?.rosterKey === EG_KEY
const fresh0 = () => ({ tick: 0, clock: 0, prev: {}, edges: {}, used: {}, dirs: [], serial: 0, wasGround: true, slingUsed: false,
  cd: {}, sling: null, para: null, freeArm: 0, backTaps: [], bounceArm: -1,
  stats: { moves: {}, rejects: 0, slings: 0, slingReleases: 0, rubber: 0, guards: 0, parries: 0, bounces: 0, pulls: 0, bounceHits: 0, rafts: 0, raftHits: 0, chains: 0 },
  cues: [] })
export const egState = f => f._elastigirl ||= fresh0()

const E = { startMove: null, W: null }
export function registerElastigirlEngine(o) { Object.assign(E, o) }
const TGT = new WeakMap()                               // attacker → defender of her current clean hit (pull / carry / bounce)
const Z = { x: 0, y: 0, w: 0, h: 0 }
export const cue = (f, c) => { const s = egState(f); s.cues.push(c); if (s.cues.length > 24) s.cues.shift() }
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
export const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.eg) ? f.currentAttack : null
const tidOf = o => o?.side ?? o?.playerNumber ?? 0
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
export const contactAt = (md, t) => md?.contacts ? md.contacts.findIndex(c => t >= c.from && t <= c.to) : -1
function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }
const moveTotal = md => (md.startup || 0) + (md.active || 0) + (md.recovery || 0)

export function clearElastigirl(f) {
  if (!f) return
  if (f._elastigirl?.sling && f._swinging) { f._swinging = false; f._spriteCastMove = null; f._spriteCastTimer = 0 }
  if (f._elastigirl?.para) { f._spriteCastMove = null; f._spriteCastTimer = 0 }
  const sc = elastigirlUltScene(); if (sc && (sc.caster === f || sc.target === f)) clearElastigirlUlt()
  if (live(f)) endAttack(f)
  TGT.delete(f)
  delete f._elastigirl; delete f._elastigirlRemoteInput
}

// ══ MOTION INPUTS ═══════════════════════════════════════════════════════════════════════════════════════════════
// Numpad notation relative to FACING (6 = forward). The history keeps one entry per direction change with the clock
// it started on; a motion matches when its digits appear IN ORDER (as a subsequence) inside the window ending now.
export const dirDigit = (raw, facing) => {
  const fw = facing === -1 ? !!raw.left : !!raw.right, bk = facing === -1 ? !!raw.right : !!raw.left
  const h = fw && !bk ? 1 : bk && !fw ? -1 : 0, v = raw.down ? -1 : (raw.up || raw.jump) ? 1 : 0
  return 5 + h + v * 3
}
export function motionMatch(s, motion, win, clock = s.clock) {
  let i = motion.length - 1, n = s.dirs.length
  if (!n) return false
  const last = s.dirs[n - 1].d, prev = n > 1 ? s.dirs[n - 2].d : null
  if (String(last) !== motion[i] && !(last === 5 && String(prev) === motion[i] && clock - s.dirs[n - 1].c <= 4)) return false   // the motion ends NOW
  for (let k = n - 1; k >= 0 && i >= 0; k--) {
    const e = s.dirs[k], next = s.dirs[k + 1]
    if (next && next.c < clock - win) break               // this entry ended before the window opened
    if (String(e.d) === motion[i]) i--
  }
  return i < 0
}

// ══ MOVEMENT LOCK (game.js updateMovementInput) ═════════════════════════════════════════════════════════════════
// Committed moves own the body (the launcher stays free for its jump-cancel after a hit). The pendulum and the
// parachute own her position. Up held with Special in the air is the Slingshot, never a double jump.
export function elastigirlLocked(f, raw = null) {
  if (!isElastigirl(f)) return false
  const s = f._elastigirl
  if (s?.sling || s?.para) return true
  const a = f.attacking ? f.currentAttack : null
  if (a?.eg && !(a.launcher && a.hasHit && a.eg.clean)) { f._dashTap = false; return true }
  if (raw && raw.special && (raw.up || raw.jump)) return true
  return false
}

// ══ MOVE START ══════════════════════════════════════════════════════════════════════════════════════════════════
const AIR_ONLY = new Set(['air', 'eDomeSlam']), EITHER = new Set(['eWhirl'])
export function startEgMove(f, key, W, { cancel = false, free = false } = {}) {
  if (!isElastigirl(f)) return false
  const s = egState(f), md = MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  if (AIR_ONLY.has(key) ? g : (!EITHER.has(key) && !g)) return false
  const cost = free ? 0 : (md.cost || 0)
  if ((f.energy || 0) < cost) return reject(f)
  if (cancel) endAttack(f)
  if (f.attacking) return false
  if (f.attackCooldown > 0 && cancel) f.attackCooldown = 0
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  const a = f.currentAttack
  a.eg = { key, dir: f.facing || 1, clean: false, blocked: false, serial: ++s.serial, contact: -1, origin: Math.round(f.x), free: !!free }
  a.hasHit = !!md.noBody || !!md.contacts                // contact moves arm per window (tickElastigirl)
  if (md.hitLevel) a.hitLevel = md.hitLevel
  f.isBlocking = false; f.isCharging = false
  if (g) f.vx = 0
  if (key === 'up') f.jumpHeld = true
  s.stats.moves[key] = (s.stats.moves[key] || 0) + 1
  cue(f, md.isUltimate ? 'ult' : key === 'eWhirl' ? 'swing' : key === 'eWhip' ? 'whipWind' : md.limb ? 'stretch' : md.isSpecial ? 'special' : 'swing')
  return true
}
function reject(f) { const s = egState(f); s.stats.rejects++; cue(f, 'reject'); return false }
// chained follow-up poses / phases started from the tick (no cost, never refused by the cooldown latch)
function follow(f, key, extra = {}) {
  const s = egState(f), md = MOVES[key], dir = f.currentAttack?.eg?.dir || f.facing || 1
  endAttack(f)
  if (!E.startMove(f, key, md)) return false
  f.currentMove = key
  f.currentAttack.eg = { key, dir, clean: false, blocked: false, serial: ++s.serial, contact: -1, origin: Math.round(f.x), ...extra }
  f.currentAttack.hasHit = !!md.noBody || !!md.contacts
  if (md.hitLevel) f.currentAttack.hitLevel = md.hitLevel
  return true
}

// ══ COMBAT HOOKS (combat.js, elastigirl-gated) ══════════════════════════════════════════════════════════════════
// Boxes: [x0, x1] forward of the body's front edge, [y0, y1] down from the top of the body box (mirrored by facing).
export function boxOf(f, box, dir) {
  const [x0, x1, y0, y1] = box, front = dir === 1 ? f.x + f.w : f.x
  return { x: dir === 1 ? front + x0 : front - x1, y: f.y + y0, w: x1 - x0, h: y1 - y0 }
}
export function elastigirlHitbox(f) {
  const a = f.currentAttack, m = a?.eg, md = MOVES[m?.key]
  if (!m || !md || md.noBody || (m.key === 'eDomeLand' && !m.impact)) return Z
  const t = elapsed(a)
  if (md.contacts ? contactAt(md, t) < 0 : (t < a.activeStart || t > a.activeEnd)) return Z
  return boxOf(f, md.box, m.dir)
}
const baseHurt = f => ({ x: f.x + 6, y: f.y + 6, w: Math.max(1, f.w - 12), h: Math.max(1, f.h - 6) })
const union = (a, b) => { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y } }
// STRETCHED LIMBS ARE HITTABLE: while a long normal / special is active (and through a whiffed Long Arm's limb hold)
// the hurtbox is the union of the body and the limb. WHIRL KICK: frames 3–9 the upper body is intangible (lower half
// only) — melee and projectiles both test this box, so the invulnerability is real against both.
export function elastigirlHurtbox(f) {
  const b = baseHurt(f), a = f.attacking ? f.currentAttack : null, m = a?.eg
  if (!m) return b
  const md = MOVES[m.key], t = elapsed(a)
  if (md.upperInvuln && t >= md.upperInvuln[0] && t <= md.upperInvuln[1]) { const half = Math.floor(b.h / 2); return { x: b.x, y: b.y + half, w: b.w, h: b.h - half } }
  if (md.limb && t >= a.activeStart && t <= a.activeEnd) return union(b, boxOf(f, md.box, m.dir))
  if (m.key === 'eLongWhiff' && t < md.limbHold) return union(b, boxOf(f, MOVES.eLongArm.box, m.dir))
  return b
}
// Frames the attacker still owes before acting again (whiffed / blocked Long Arm continues into its whiff recovery).
const owed = (a, md) => md.follow ? a.timer - md.recovery + moveTotal(MOVES[md.follow]) : a.timer
export function elastigirlBlock(f, d, a) {
  if (!isElastigirl(f) || !a?.eg) return
  const md = MOVES[a.eg.key], ci = contactAt(md, elapsed(a)), c = ci >= 0 ? md.contacts[ci] : null
  d.blockstun = Math.max(1, owed(a, md) + (c?.onBlock ?? md.onBlock ?? 0) + D.ADV_FUDGE)
  a.eg.blocked = true; a.eg.guarded = true; TGT.set(f, d)
}
export function elastigirlHit(f, d, a, { armored = false } = {}) {
  if (!isElastigirl(f) || !a?.eg) return
  if (armored || a.eg.blocked || d?.isBlocking) return
  a.eg.clean = true; a.eg.tid = tidOf(d); f._cmdHitLanded = true; TGT.set(f, d)
  const s = egState(f)
  if (a.eg.key === 'eWhip') a.eg.bounce = 1                       // applied next tick (after the engine's knockback)
  if (a.eg.key === 'eRaft') {
    s.stats.raftHits++
    // FAMILY RAFT: the raft's first clean contact snatches the foe into the cinematic (elastigirlUlt.js); the cinematic
    // owns the rest of the ultimate (its own splash, sound and damage). Otherwise the surge carries on as before (a raft that
    // only catches the foe with its final 90 launcher keeps that launcher — the cinematic would overshoot the damage budget).
    if (!a.eg.cine && a.eg.contact <= 2 && d && d.health > 0 && !d.isGrabbed) { a.eg.cine = true; if (startElastigirlUlt(f, d, E.W, a.eg.dir)) return }
    cue(f, 'splash')
  }
  if (a.eg.key === 'eDomeSlam' || a.eg.key === 'eDome') cue(f, 'thud')
}
// STRETCH GUARD (Phase 6): one frontal non-grab, non-ultimate strike inside the 6-frame window is absorbed.
export function absorbElastigirl(f, source, attack) {
  if (!isElastigirl(f) || !attack || !D.STRETCH_GUARD) return false
  const a = live(f); if (!a || a.eg.key !== 'eGuard' || a.eg.parried) return false
  const t = elapsed(a), G = D.STRETCH_GUARD
  if (t < MOVES.eGuard.startup || t > MOVES.eGuard.startup + G.window - 1) return false
  if (attack.isUltimate || attack.isCinematic || attack.cinematic || attack.unblockable || attack.damageType === 'grab' || attack.category === 'grab' || !(attack.damage > 0)) return false
  const sx = ctrX(source || {}); if (!Number.isFinite(sx) || (sx - ctrX(f)) * a.eg.dir < 0) return false
  a.eg.parried = true
  const s = egState(f); s.stats.parries++; s.freeArm = G.freeLongArm
  f.energy = Math.min(f.maxEnergy || EG_ENERGY.max, (f.energy || 0) + G.energy)
  cue(f, 'parry')
  return true
}

// ══ DAMAGE CHOKE-POINT (combat.applyScaledDamage) ═══════════════════════════════════════════════════════════════
// RUBBER BODY: −15 % from MELEE NORMALS only — read off the incoming move's type (not special / ultimate / grab /
// cinematic, not an energy or elemental damageType). Projectiles, specials, ultimates and chip pass untouched.
// ELASTICITY income: +4 when she lands a damaging hit, +3 when she takes one (guard chip is not a hit).
const NON_NORMAL = new Set(['special', 'ultimate', 'grab', 'throw', 'cinematic', 'super'])
export function isMeleeNormal(atk) {
  if (!atk || atk.isSpecial || atk.isUltimate || atk.isCinematic || atk.cinematic || atk.unblockable) return false
  if (NON_NORMAL.has(atk.category)) return false
  if (atk.damageType && D.RUBBER_BODY.exemptDamageTypes.includes(atk.damageType)) return false
  return !/grab|throw|ult|special/i.test(atk.name || '')
}
const gain = (f, n) => { f.energy = Math.min(f.maxEnergy || EG_ENERGY.max, (f.energy || 0) + n) }
export function elastigirlRegen(f) {
  if (!isElastigirl(f) || !(f.maxEnergy > 0)) return false
  if (!f.infiniteEnergy) gain(f, EG_ENERGY.rechargePerSec / 60)
  return true
}
export function elastigirlDamageMods(target, rawDamage, opts = {}) {
  const atk = opts.attacker || opts.boostFrom
  const tEg = isElastigirl(target), aEg = isElastigirl(atk) && atk !== target
  if (!tEg && !aEg) return rawDamage
  if (tEg && opts.source === 'melee' && atk && atk !== target && isMeleeNormal(atk.currentAttack)) {
    rawDamage = (rawDamage || 0) * D.RUBBER_BODY.mult; egState(target).stats.rubber++
  }
  if ((rawDamage || 0) > 0 && opts.source !== 'block-chip') {
    if (tEg) gain(target, EG_ENERGY.onHitTaken)
    if (aEg) gain(atk, EG_ENERGY.onHitLanded)
  }
  return rawDamage
}

// ══ SLINGSHOT — Spider-Man's pendulum, her anchor ═══════════════════════════════════════════════════════════════
// Air ↑ + Special: an anchor 220 px up-forward (45°) of her grip, rope 220. Holding Special keeps her on the
// pendulum (abilities.updateSpidermanWebSwing integrates it for any fighter with _swinging; physics skips gravity);
// releasing the button flings her with the tangential momentum (abilities.releaseSpidermanWebSwing).
// One per airtime, 12 Elasticity, 2 s cooldown from the release.
export function slingLegal(f, ignoreAttack = false) {
  const s = egState(f), P = D.SLINGSHOT
  return !grounded(f) && !s.sling && !s.para && !f._swinging && !s.slingUsed && !(s.cd.sling > 0) && (ignoreAttack || !f.attacking) && (f.energy || 0) >= P.cost
}
export function startSling(f) {
  const s = egState(f), P = D.SLINGSHOT
  if (!slingLegal(f)) return reject(f)
  f.energy -= P.cost
  const face = f.facing || 1, grip = (f.h || 94) * 0.30, cx = ctrX(f), cy = f.y + grip, d = Math.round(P.reach * Math.SQRT1_2)
  f._swAX = cx + face * d; f._swAY = cy - d; f._swL = P.reach
  f._swAng = Math.atan2(cx - f._swAX, cy - f._swAY)
  const tang = ((f.vx || 0) * Math.cos(f._swAng) + (f.vy || 0) * -Math.sin(f._swAng)) / f._swL
  f._swVel = face * Math.max(face * tang, 0.035)          // a decisive FORWARD swing for either facing
  f._swFace = face; f._swTimer = 120; f._swinging = true
  f._spriteCastMove = 'eSling'; f._spriteCastTimer = 120
  f.attacking = false; f.attackCooldown = 0; f.isLaunched = false
  s.sling = { t: 0, face }; s.slingUsed = true; s.stats.slings++
  cue(f, 'stretch')
  return true
}
function endSling(f, s, fling) {
  if (f._swinging) { if (fling) releaseSpidermanWebSwing(f); else { f._swinging = false; f.vx = 0; f.vy = 0 } }
  f._spriteCastMove = fling ? 'eSlingRelease' : null; f._spriteCastTimer = fling ? D.SLINGSHOT.releasePose : 0
  s.sling = null; s.cd.sling = D.SLINGSHOT.cooldown
  if (fling) { s.stats.slingReleases++; cue(f, 'snap') }
}

// ══ PARACHUTE (air) ═════════════════════════════════════════════════════════════════════════════════════════════
export function startParachute(f) {
  const s = egState(f), md = MOVES.eDome
  if (grounded(f) || s.para || s.sling || f.attacking) return reject(f)
  if ((f.energy || 0) < md.cost) return reject(f)
  f.energy -= md.cost
  s.para = { t: 0, vy: Math.min(f.vy || 0, 0), c0: s.clock, slamReq: false }
  f.vx = (f.vx || 0) * 0.5
  f._spriteCastMove = 'eDomeFloat'; f._spriteCastTimer = 999
  s.stats.moves.eDomeAir = (s.stats.moves.eDomeAir || 0) + 1
  cue(f, 'parachute')
  return true
}
function slam(f, s) {
  s.para = null; f._spriteCastMove = null; f._spriteCastTimer = 0
  if (!E.startMove(f, 'eDomeSlam', MOVES.eDomeSlam)) return
  f.currentMove = 'eDomeSlam'
  f.currentAttack.eg = { key: 'eDomeSlam', dir: f.facing || 1, clean: false, blocked: false, serial: ++s.serial, contact: -1, origin: Math.round(f.x) }
  f.currentAttack.hitLevel = 'overhead'
  f.vy = D.PARACHUTE.slamVy; f.vx = 0
  cue(f, 'slam')
}

// ══ TICK (game.js, before the command layer) ════════════════════════════════════════════════════════════════════
const EDGE_KEYS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'grab', 'left', 'right']
export function tickElastigirl(f, opp, raw, W) {
  if (!isElastigirl(f)) { if (f?._elastigirl) clearElastigirl(f); return }
  // round / match reset: the shared revert stamps speed 84 / dash 16 on every fighter after our clear → re-apply ours
  if (f.baseSpeed === 84 && f.dashSpeed === 16) { const st = D.EG_STATS; f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed; f.dashDuration = st.dashDuration }
  const s = egState(f); s.tick++
  E.W = W
  if (!s.seed) s.seed = (W?.seed?.() >>> 0) || 1                // match seed (audio variation hash only)
  const face = f.facing || 1, fw = !!(face === -1 ? raw.left : raw.right), bk = !!(face === -1 ? raw.right : raw.left)
  for (const k of EDGE_KEYS) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!(raw.up || raw.jump), fwd: fw, back: bk, block: !!raw.block }
    s.prev[k] = v
  }
  // BACK double tap (Bounce Back arming): two fresh BACK presses within the tap window
  const backKey = face === -1 ? 'right' : 'left'
  if (s.edges[backKey]?.tick === s.tick) { s.backTaps.push(s.clock); if (s.backTaps.length > 2) s.backTaps.shift() }
  if (s.backTaps.length === 2 && D.BOUNCE_BACK && s.backTaps[1] - s.backTaps[0] <= D.BOUNCE_BACK.tapWindow && s.edges[backKey]?.tick === s.tick) s.bounceArm = s.clock
  const dg = dirDigit(raw, face)
  if (!s.dirs.length || s.dirs[s.dirs.length - 1].d !== dg) { s.dirs.push({ d: dg, c: s.clock }); if (s.dirs.length > 16) s.dirs.shift() }
  for (const k in s.cd) if (s.cd[k] > 0) s.cd[k]--
  if (s.freeArm > 0) s.freeArm--
  const g = grounded(f)
  if (g && !s.wasGround) { s.slingUsed = false; cue(f, 'land') }
  if (g && !s.sling) s.slingUsed = false
  s.wasGround = g
  // ── SLINGSHOT upkeep (the pendulum itself is stepped by game.js / abilities) ──
  if (s.sling) {
    s.sling.t++
    if (!f._swinging) { s.sling = null; s.cd.sling = D.SLINGSHOT.cooldown; f._spriteCastMove = 'eSlingRelease'; f._spriteCastTimer = D.SLINGSHOT.releasePose; s.stats.slingReleases++; cue(f, 'snap') }   // auto-release (timer / floor)
    else if (f.hitstun > 0 || f.isGrabbed || f.health <= 0) endSling(f, s, false)
    else if (!raw.special && s.sling.t >= D.SLINGSHOT.minHold) endSling(f, s, true)
  }
  // ── pending effects on the hit target (after the engine applied its knockback) ──
  const a0 = live(f)
  if (a0?.eg?.bounce === 1) {
    a0.eg.bounce = 2; const t = TGT.get(f)
    if (t && t.health > 0 && t.hitstun > 0) { t.vy = MOVES.eWhip.bounce; t.onGround = false; t.grounded = false; t.isLaunched = true; t.y -= 2; egState(f).stats.bounceHits++; cue(f, 'bounce') }
  }
  if (f.health <= 0 || f.hitstop > 0) return
  s.clock++
  // ── PARACHUTE float: ×0.35 fall for ≤ 60 f, then the dome slams; a fresh attack / Special press slams early ──
  if (s.para) {
    const P = D.PARACHUTE
    if (f.hitstun > 0 || f.isGrabbed) { s.para = null; f._spriteCastMove = null; f._spriteCastTimer = 0 }
    else if (g) { s.para = null; f._spriteCastMove = null; f._spriteCastTimer = 0; follow(f, 'eDomeLand', { impact: false }); f.currentAttack.hasHit = true }
    else {
      s.para.t++
      s.para.vy = Math.min(s.para.vy + P.gravity * P.fallMul, P.maxFall * P.fallMul)
      f.vy = s.para.vy - P.gravity                          // physics adds gravity after this tick → the float fall
      f.vx = clamp((f.vx || 0) + (fw ? 0.25 : bk ? -0.25 : 0) * face, -3, 3) * 0.98
      if (['light', 'heavy', 'special', 'upAttack'].some(k => s.edges[k] && s.edges[k].tick === s.tick && s.edges[k].clock > s.para.c0)) s.para.slamReq = true   // buffered early slam
      if (s.para.t >= P.floatMax || (s.para.slamReq && s.para.t >= P.slamMinFloat)) slam(f, s)
    }
  }
  const a = live(f)
  if (a && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) { endAttack(f); return }
  const m = a?.eg
  if (!m) return
  const t = elapsed(a), md = MOVES[m.key]
  f.facing = m.dir
  // contact moves (Whirl Kick, Family Raft): each authored window re-arms the single-connect latch exactly once
  if (md.contacts) {
    const ci = contactAt(md, t)
    if (ci >= 0 && m.contact < ci) {
      const c = md.contacts[ci]; m.contact = ci
      a.hasHit = false; a.damage = c.damage; a.hitstun = c.hitstun; a.pushX = c.knockbackX ?? md.knockbackX; a.launchY = c.knockbackY ?? md.knockbackY ?? 0
      m.clean = false; m.blocked = false
    }
  }
  const tg = TGT.get(f)
  // a GUARDED string stays guarded: the engine drops isBlocking during blockstun, so without this the 2nd / 3rd
  // contact of a blocked Whirl Kick or Raft would hit clean. Only while the target is still in HER blockstun.
  if (md.contacts && m.guarded && tg && tg.blockstun > 0 && !(tg.hitstun > 0)) tg.isBlocking = true
  switch (m.key) {
    case 'eLongArm':
      if (t === a.activeEnd + 1) {
        if (m.clean && tg && tg.health > 0) { follow(f, 'eLongPull', { pullFrom: Math.round(tg.x) }); egState(f).stats.pulls++; cue(f, 'snap')
          tg.hitstun = moveTotal(MOVES.eLongPull) + md.onHit }      // +18 when the pull ends
        else follow(f, 'eLongWhiff', { blocked: m.blocked })
      }
      break
    case 'eLongPull': {                                     // reel the target in to just in front of her
      if (tg && tg.health > 0 && tg.hitstun > 0) {
        const want = m.dir === 1 ? f.x + f.w + 16 : f.x - tg.w - 16, k = Math.min(1, (t + 1) / MOVES.eLongPull.startup)
        tg.x = Math.round(m.pullFrom + (want - m.pullFrom) * k); tg.vx = 0
      }
      if (t === 0 && s.freeArm > 0) s.freeArm = 0
      break
    }
    case 'eWhip':
      if (t === a.activeStart - 1) cue(f, 'whip')                // the crack lands with the first active frame
      break
    case 'eDome':
      if (t === md.hop.at && g) { f.vy = md.hop.vy; f.onGround = false; f.grounded = false; cue(f, 'parachute') }
      if (t > md.hop.at + 2 && g && t < a.activeEnd) { /* landed early: the dome still covers its active frames */ }
      break
    case 'eDomeSlam':
      f.vy = D.PARACHUTE.slamVy - D.PARACHUTE.gravity; f.vx = 0
      if (g && t > 0) { cue(f, 'thud'); const hit = m.clean || m.blocked; follow(f, 'eDomeLand', { impact: !hit }); f.currentAttack.hasHit = hit }
      break
    case 'air':
      if (g && t > 2) endAttack(f, 4)
      break
    case 'eWhirl':
      if (t === a.activeStart - 1) cue(f, 'whirl')
      if (!g && t >= a.activeStart && t <= a.activeEnd) f.vy = Math.min(f.vy || 0, 1.2)   // the air spin hangs briefly
      break
    case 'eGuard':
      if (m.parried && t > a.activeEnd) { /* recovery may be cancelled into the free Long Arm (command layer) */ }
      break
    case 'eBounce': {
      const B = D.BOUNCE_BACK
      // the tick runs before this frame's timer decrement (tick t = frame number − 1) and the engine decrements invulnTimer
      // before its hit check → set it one frame early with one extra count: protected on frames 4–12 exactly (harness-verified)
      if (t === B.iframes[0] - 1) { f.invulnTimer = Math.max(f.invulnTimer || 0, B.iframes[1] - B.iframes[0] + 2); cue(f, 'bounce') }
      if (t >= B.travel[0] && t < B.travel[1]) f.x = clamp(f.x - m.dir * B.speed, 0, sw(W) - (f.w || 48))
      f.vx = 0
      break
    }
    case 'eUlt':
      if (t >= md.startup) { follow(f, 'eRaft'); s.stats.rafts++; cue(f, 'raft') }
      break
    case 'eRaft': {
      if (t >= a.activeStart && t <= a.activeEnd) {
        let nx = clamp(f.x + m.dir * md.travel, 0, sw(W) - (f.w || 48))
        for (const o of foesOf(f, W, opp)) {                // the passenger rides the bow; anyone else is not walked through
          const carry = o === tg && o.hitstun > 0 && m.contact < md.contacts.length - 1
          if (carry) { o.x = clamp(m.dir === 1 ? nx + f.w + 4 : nx - o.w - 4, 0, sw(W) - o.w); o.vx = 0; continue }
          if (Math.abs(feet(o) - feet(f)) > (o.h || 94)) continue
          if (m.dir > 0 && f.x + f.w <= o.x + 1) nx = Math.min(nx, o.x - f.w)
          if (m.dir < 0 && f.x >= o.x + o.w - 1) nx = Math.max(nx, o.x + o.w)
        }
        f.x = nx
      }
      f.vx = 0
      if (t === a.activeEnd + 1) { follow(f, 'eUltRecover'); cue(f, 'raftEnd') }
      break
    }
  }
  if (g && f.attacking && !['up', 'eDome', 'eBounce', 'eRaft'].includes(f.currentAttack?.eg?.key)) f.vx = 0
}

// GAME_STATE row (game.js snapshot): her state minus the render-only cue queue, the live descriptor and the pendulum.
export function elastigirlSnapshot(f) {
  const s = f._elastigirl
  return [s ? { ...s, cues: undefined } : null, f.currentAttack?.eg || null,
    f._swinging ? [f._swAX, f._swAY, f._swL, f._swAng, f._swVel, f._swTimer, f._swFace] : null, f._spriteCastMove || null, f._spriteCastTimer || 0]
}
