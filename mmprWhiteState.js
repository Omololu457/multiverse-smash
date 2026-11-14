// White Ranger (mmpr_white) — SIMULATION state. Plain JSON on f._mmprWhite (+ f._falcon via the shared falconzord.js
// assist scheduler and f._ranger via rangers.js). Sim ticks only, no RNG, no wall clock. Every export is a no-op for any
// other rosterKey.
import { MMPR_WHITE_MOVES, MMPR_WHITE_LANDING, DESCENT, FORMATION, LEADER, NINJA_RESOURCE, MMPR_WHITE_DAMAGE_SCALE, dmg } from './mmprWhiteData.js'
import { tickRanger, clearRanger, startBlink } from './rangers.js'
import { falconState, clearFalcon, retireSortie, falconCanCall, falconPay, falconCancelCall, falconCommit, tickFalcon } from './falconzord.js'

export const isMmprWhite = f => f?.rosterKey === 'mmpr_white'
export const mmprWhiteState = f => f._mmprWhite ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  risingUsed: false, leaping: false, airborne: false, landing: 0, riseX: 0, descentUsed: false, descending: false,
  coll: null, token: null, lastHp: null, accept: null, formationUsed: false, leader: null, leaderUsed: false, assistLaunchUsed: false,
  stats: { disc: { hand: 0, foot: 0, blade: 0 }, discRepeat: 0, discBlocked: 0, collExpired: 0, collBroken: 0, tokens: 0, tokenExpired: 0,
    accepts: 0, acceptRejected: 0, followHits: 0, followWhiffs: 0, leaderOffers: 0, leaderUsed: 0, feints: 0,
    ultStarts: 0, ultWhiffs: 0, ultDone: 0, ultRhythm: 0 }, cues: [] }

// Engine helpers handed in by mmprWhite.js (avoids a combat.js ↔ mmprWhiteState import cycle).
const E = { startMove: null, comboScale: null, hitstunScale: null, hitstop: null }
export function registerMmprWhiteEngine(o) { Object.assign(E, o) }
const cue = (f, c) => mmprWhiteState(f).cues.push(c)
const ultTargets = new WeakMap()   // attacker → the fighter its ultimate opener hit (never serialized)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)

const zordWorld = W => ({ stageWidth: W?.stageWidth, fighters: W?.fighters, spawn: W?.spawn, projectiles: W?.projectiles, damage: W?.damage,
  comboScale: f => E.comboScale?.(f) ?? 1, hitstunScale: f => E.hitstunScale?.(f) ?? 1, hitstop: (a, d, n) => E.hitstop?.(a, d, n) })
const rangerWorld = W => W && { stageWidth: W.stageWidth, frame: W.frame, seed: W.seed, attackBox: W.attackBox, projectiles: W.projectileRects }
const zordCb = {
  launchAllowed: f => !mmprWhiteState(f).assistLaunchUsed,     // Crane Rise launches once per combo (shared juggle rules apply on top)
  onLaunch: f => { mmprWhiteState(f).assistLaunchUsed = true },
}

export function clearMmprWhite(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearMmprWhiteUlt()
  const had = !!f._mmprWhite
  delete f._mmprWhite; delete f._mmprWhiteRemoteInput
  clearFalcon(f, W)
  if (isMmprWhite(f) || had) clearRanger(f)   // identity change: the blink state was White's too
}
// Movement lock (game.js updateMovementInput). Same contract as Black: Up held WITH Special belongs to Crane Rise; a fresh
// grounded Up holds the jump UP_GRACE frames so Up pressed 1-2 f before Special never becomes a jump.
export const UP_GRACE = 3
const upGraceHold = (f, raw) => !!(raw?.up && !f.attacking && grounded(f) && (f._mmprWhite?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export const mmprWhiteLocked = (f, raw = null) => isMmprWhite(f) && (!!f._ranger?.blink || f._mmprWhite?.landing > 0 || !!f._mmprWhite?.leaping ||
  !!f._mmprWhite?.descending || (f.attacking && !f.currentAttack?.launcher) || !!(raw ? raw.special && raw.up : f._mmprWhite?.ownsUp) ||
  upGraceHold(f, raw) || isMmprWhiteUltActive())

// Start one of White's moves through combat.startMove (frameExact path) and attach the per-move descriptor `mw`.
export function startWhiteMove(f, key, W, { cancel = false, extra = null } = {}) {
  if (!isMmprWhite(f)) return false
  const s = mmprWhiteState(f), md = MMPR_WHITE_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || s.landing > 0 || f._ranger?.blink) return false
  const cost = key === 'wFeint' ? 0 : (md.cost || 0)       // the feint keeps the Answer's already-paid cost; never charges again
  if ((f.energy || 0) < cost) return false
  if (md.isSpecial && key !== 'wFeint' && key !== 'wOrder' && ((f.disabledSpecials || []).includes('special') || f._gaDisabled > 0)) return false
  if (['wAscent', 'wAnswer', 'wCall', 'wUltOpen', 'wAdv', 'wLow'].includes(key) && !g) return false
  if (key === 'wDescent' && (g || s.descentUsed)) return false
  if (key === 'wAscent' && s.risingUsed) return false
  if (key === 'wCall' && !falconCanCall(f, extra?.kind, f.energy, NINJA_RESOURCE)) return false
  if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!E.startMove || !E.startMove(f, key, md)) return false
  let spend = cost
  if (key === 'wCall') spend = falconPay(f, extra.kind, NINJA_RESOURCE)
  f.energy = Math.max(0, (f.energy || 0) - spend); f.currentMove = key
  f.currentAttack.mw = { key, dir: f.facing || 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, disc: false,
    groundStart: g, fromChain: !!extra?.fromChain, kind: extra?.kind || null }
  f.currentAttack.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; if (g) f.vx = 0
  if (key === 'up') f.jumpHeld = true
  if (key === 'wAscent') { s.risingUsed = true; s.leaping = true; s.airborne = false; s.riseX = f.x }
  if (key === 'wDescent') { s.descentUsed = true }
  if (key === 'wUltOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  if (key === 'wFeint') { s.stats.feints++; cue(f, 'feint') }
  else cue(f, md.call ? 'call' : key === 'wOrder' ? 'order' : md.damageType === 'slash' ? 'saba' : md.isSpecial ? 'special' : 'swing')
  return true
}

// ── combat.js hooks (mmpr_white-gated) ──
export function mmprWhiteHitbox(f) {
  const a = f.currentAttack, m = a?.mw, md = MMPR_WHITE_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 14), w: a.rangeX, h: a.rangeY }
}
export function mmprWhiteBlock(f, d, a) {
  if (!isMmprWhite(f) || !a?.mw) return
  d.blockstun = MMPR_WHITE_MOVES[a.mw.key].blockstun; a.mw.blocked = true
}
export function mmprWhiteHit(f, d, a, { armored = false } = {}) {
  if (!isMmprWhite(f) || !a?.mw) return
  if (armored) return               // armor-absorbed: no clean flag, no discipline
  a.mw.clean = true; f._cmdHitLanded = true
  const md = MMPR_WHITE_MOVES[a.mw.key]
  // THREE DISCIPLINES: one grant per distinct clean, unblocked attack INSTANCE (multihits grant at most one).
  const eligible = md.disc && !a.mw.disc && !a.mw.blocked && (a.mw.key === 'wAscent' ? a.mw.groundStart : grounded(f))
  if (eligible) { a.mw.disc = true; grantDiscipline(f, md.disc) }
  if (a.mw.key === 'wUltOpen' && d.health > 0) { a.mw.ultHit = true; ultTargets.set(f, d) }   // fighter ref kept OUT of the JSON-snapshotted attack
}
// Collect HAND / FOOT / BLADE in any order inside FORMATION.window frames from the first. A repeat neither stacks nor
// refreshes the timer; completing all three grants ONE token (max one). No collection while a token is held.
export function grantDiscipline(f, d) {
  const s = mmprWhiteState(f)
  if (s.token) { s.stats.discBlocked++; return false }
  if (!s.coll) s.coll = { hand: false, foot: false, blade: false, t: 0, order: [] }
  if (s.coll[d]) { s.stats.discRepeat++; return false }
  s.coll[d] = true; s.coll.order.push(d); s.stats.disc[d]++; cue(f, 'disc_' + d)
  if (s.coll.hand && s.coll.foot && s.coll.blade) {
    s.token = { t: FORMATION.tokenLife, order: s.coll.order.slice() }; s.coll = null; s.stats.tokens++; cue(f, 'formation')
  }
  return true
}

function onZordEvent(f, s, e) {
  if (e.type === 'commit') cue(f, 'commit_' + e.kind)
  if (e.type === 'pip') cue(f, 'ready')
  if (e.type === 'hit' || e.type === 'blocked') cue(f, e.kind === 'ninjaEdge' ? 'edgeHit' : e.kind === 'ninjaCraneRise' ? 'kickHit' : 'zordPunch')
  const so = f._falcon?.sortie
  // FORMATION OFFER: the ordinary (first) contact connected CLEANLY on a valid target → a 10 f Special-retap window.
  if (e.type === 'hit' && e.contact === 0 && s.token && !s.formationUsed && so && so.kind === e.kind) {
    s.accept = { t: FORMATION.acceptWindow, kind: e.kind, n: so.n, target: e.targetId }; cue(f, 'offer')
  }
  // FOLLOW-UP landed cleanly → LEADER'S RETURN offer, only while Tommy holds the Formation signal (wOrder).
  if (e.contact === 1 && (e.type === 'hit' || e.type === 'blocked')) {
    if (e.type === 'hit') s.stats.followHits++
    const a = f.attacking ? f.currentAttack : null
    if (e.type === 'hit' && a?.mw?.key === 'wOrder' && !s.leaderUsed && f.health > 0) { s.leader = { t: LEADER.window, serial: a.mw.serial }; s.stats.leaderOffers++; cue(f, 'leaderOffer') }
  }
}
// The command layer calls this on a fresh Special while s.accept is open. Returns true if accepted.
export function acceptFormation(f, opp, W) {
  const s = mmprWhiteState(f), A = s.accept, so = f._falcon?.sortie
  const valid = A && A.t > 0 && s.token && !s.formationUsed && so && so.n === A.n && (f.energy || 0) >= FORMATION.acceptCost &&
    f.health > 0 && opp && opp.health > 0 && !opp.isGrabbed && (opp.side || opp.playerNumber || 0) === A.target
  if (!valid) { s.stats.acceptRejected++; s.accept = null; return false }
  f.energy -= FORMATION.acceptCost; s.token = null; s.accept = null; s.formationUsed = true; s.stats.accepts++
  so.gates = ['formation']
  // Tommy signals the order (wOrder) when free / in the order call's recovery; mid-attack the follow-up still fires but
  // without the signal pose there is no Leader's Return.
  const a = f.attacking ? f.currentAttack : null
  if (!a || (a.mw?.key === 'wCall' && a.timer > 0 && (a.total - a.timer) > a.activeEnd)) startWhiteMove(f, 'wOrder', W, { cancel: !!a })
  cue(f, 'accept')
  return true
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickMmprWhite(f, opp, raw, W) {
  if (!isMmprWhite(f)) { if (f?._mmprWhite) clearMmprWhite(f, W); return }   // only White's own leftovers (another owner's shared sortie is theirs)
  const s = mmprWhiteState(f); s.tick++
  falconState(f, NINJA_RESOURCE)
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk, block: !!raw.block }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if (raw.up && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  // a damaging hit breaks an INCOMPLETE collection (an earned token survives)
  if (s.lastHp != null && f.health < s.lastHp && (f.hitstun > 0 || f.knockdownState || f.isGrabbed) && s.coll) { s.coll = null; s.stats.collBroken++; cue(f, 'collBreak') }
  s.lastHp = f.health
  if (f.health <= 0) { if (f._falcon?.pendingKind) falconCancelCall(f); s.accept = null; s.leader = null; return }
  // the Ranger framework: double-tap blink. Vetoed while committed; LEADER'S RETURN is the one authored cancel below.
  const a0 = f.attacking ? f.currentAttack : null
  if (f._ranger) f._ranger.blinkVeto = !!(s.landing > 0 || s.leaping || s.descending || a0)
  tickRanger(f, opp, raw, rangerWorld(W))
  const r = f._ranger
  if (s.leader && r && r.pendingAt === r.tick && r.pending && r.pending.dir) {
    const a = f.attacking ? f.currentAttack : null
    const late = a?.mw?.key === 'wOrder' && a.mw.serial === s.leader.serial && (a.total - a.timer) > a.activeEnd
    if (late && startBlink(f, r.pending.dir, 0, { cancel: true })) { s.leader = null; s.leaderUsed = true; s.stats.leaderUsed++; cue(f, 'leaderGo') }
  }
  if (f.hitstop > 0) return
  s.clock++
  // the shared assist scheduler: resources tick; a committed order completes even while Tommy is hit (bounded, detached)
  const evs = tickFalcon(f, zordWorld(W), NINJA_RESOURCE, MMPR_WHITE_DAMAGE_SCALE, zordCb)
  for (const e of evs) onZordEvent(f, s, e)
  if (s.accept && --s.accept.t <= 0) s.accept = null
  if (s.accept && !f._falcon.sortie) s.accept = null
  if (s.leader && --s.leader.t <= 0) s.leader = null
  if (s.leader && !(f.attacking && f.currentAttack?.mw?.serial === s.leader.serial)) s.leader = null   // never saved for later
  // discipline collection window / token lifetime
  if (s.coll && ++s.coll.t >= FORMATION.window) { s.coll = null; s.stats.collExpired++; cue(f, 'collExpire') }
  if (s.token && --s.token.t <= 0) { s.token = null; s.stats.tokenExpired++; cue(f, 'tokenExpire') }
  // combo bookkeeping: a dropped combo re-arms once-per-combo rules
  if (!(f.comboCounter > 0)) { s.assistLaunchUsed = false; s.formationUsed = false; s.leaderUsed = false }
  const a = f.attacking ? f.currentAttack : null, m = a?.mw
  // a call interrupted before its commit frame (hit / grab / KO / any teardown): resources stay spent
  if (f._falcon.pendingKind && !(a && m?.key === 'wCall')) falconCancelCall(f)
  if (f.hitstun > 0 || f.isGrabbed) { s.leaping = false; s.landing = 0; s.descending = false }
  if (s.landing > 0) { s.landing--; f.vx = 0 }
  const g = grounded(f)
  if (g && !s.leaping) s.risingUsed = false
  if (g && !s.descending) s.descentUsed = false
  if (s.leaping && g && s.airborne) { s.leaping = false; land(f, s, MMPR_WHITE_LANDING.ascent) }
  if (!g && s.leaping) s.airborne = true
  // TIGER DESCENT: capped descent from frame 12 until the floor, then the 24 f landing recovery (no bounce, no air reset)
  if (s.descending && g) { s.descending = false; land(f, s, MMPR_WHITE_LANDING.descent) }
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = a.total - a.timer, md = MMPR_WHITE_MOVES[m.key]
  f.facing = m.dir
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) {
    const want = m.origin + m.dir * md.travel[2] * (t - md.travel[0] + 1)
    let x = Math.max(0, Math.min((W?.stageWidth?.() || 3200) - f.w, want))
    if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }   // never walks through the foe
    f.x = x; f.vx = 0
  } else if (g && !md.rising) f.vx = 0
  if (m.key === 'wAscent' && t === 9) { f.vy = -17; f.vx = m.dir * 4; f.onGround = false; f.grounded = false; f.jumpCount = Math.max(1, f.jumpCount || 0); s.airborne = true }
  if (s.leaping && m.key === 'wAscent') { f.vx = 0; f.x = Math.max(0, Math.min((W?.stageWidth?.() || 3200) - f.w, s.riseX + m.dir * Math.min(60, Math.max(0, t - 9) * 4))) }
  if (m.key === 'wDescent') {
    if (t < 12) { f.vy = Math.min(f.vy || 0, 2); f.vx = 0 }   // brief hang in the tuck
    else { s.descending = true; f.vy = DESCENT.vy; f.vx = m.dir * DESCENT.vx }
  }
  // ORDER COMMIT: the first frame after the 12 f startup. From here the order is detached and completes on its own.
  if (m.key === 'wCall' && t >= a.activeStart && f._falcon.pendingKind) falconCommit(f, opp, zordWorld(W))
  // ULTIMATE: a clean opener captures the target → the frozen sequence. Miss/block → the authored 60 f recovery.
  if (m.key === 'wUltOpen' && m.clean && m.ultHit && !m.ultStarted) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateMmprWhiteUlt(f, tg, W) }
  if (m.key === 'wUltOpen' && t === a.activeEnd + 1 && !m.clean) { s.stats.ultWhiffs++; cue(f, 'ultMiss') }
}
function land(f, s, n) {
  s.landing = n; f.vx = 0; f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = n
}

// ══ ULTIMATE — WHITE LIGHT: NINJA GRAND FORMATION ══════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (same as Black's Falcon Formation): activate / isActive / update / clear / status.
// While active, game.js freezes combat, physics and input and calls updateMmprWhiteUlt() each frame. Tommy's pose comes
// from a non-hitting currentAttack; the Ninja Megazord is drawn by mmprWhiteFx from mmprWhiteUltZord() (pure of frame).
// Beats (frames from confirm):
//   0-34    Megazord steps in → straight punch (contact @26, raw 40); Tommy holds the signal pose
//   35-74   Tommy's supplied airborne kick (contact @58, raw 35); the target is lifted
//   75-109  Megazord raised-leg strike (contact @92, raw 40); Tommy drops back
//   110-129 Tommy lands in the Saba-ready pose
//   130-169 Megazord draws its supplied sword (draw → wind)
//   170     coordinated final Ranger + Megazord contact (raw 130), knockdown
// Opener 35 + 40 + 35 + 40 + 130 = 280 raw before shared scaling. A held Formation token is consumed on entry and only
// changes the PRESENTATION rhythm (hand → foot → blade flashes lead the phases): identical damage, hits, capture, recovery.
export const ULT = { total: 200, contacts: [{ at: 26, raw: 40 }, { at: 58, raw: 35 }, { at: 92, raw: 40 }, { at: 170, raw: 130 }], settle: 186,
  flashes: [{ at: 18, disc: 'hand' }, { at: 50, disc: 'foot' }, { at: 160, disc: 'blade' }] }
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1, rhythm: false }
export const isMmprWhiteUltActive = () => cine.active
function pose(f, move, at) {
  const total = 999
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total, timer: total - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, mw: null, _ultPose: true }
}
export function activateMmprWhiteUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = mmprWhiteState(f)
  retireSortie(f, zordWorld(W)); if (f._falcon) f._falcon.pendingKind = null   // no duplicate Megazord
  const rhythm = !!s.token
  if (rhythm) { s.token = null; s.stats.ultRhythm++ }                            // token → presentation only
  s.accept = null; s.leader = null
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: f.y + (f.h || 94) - (target.h || 94),
    cx0: f.x, tx0: target.x, dir: f.facing || 1, done: 0, scale: E.comboScale?.(f) ?? 1, rhythm })
  s.ult = { frame: 0, done: 0, rhythm }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  cue(f, rhythm ? 'ultRhythm' : 'ultConfirm')
  return true
}
function ultHit(i) {
  const c = ULT.contacts[i], t = cine.target, f = cine.caster
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  cine.done = i + 1; if (f._mmprWhite?.ult) f._mmprWhite.ult.done = cine.done
  cue(f, i === 3 ? 'ultFinal' : i === 1 ? 'kickHit' : 'zordPunch')
}
export function updateMmprWhiteUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, k = cine.frame, d = cine.dir
  if (!f || !t) return clearMmprWhiteUlt()
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  if (cine.rhythm) for (const fl of ULT.flashes) if (k === fl.at) cue(f, 'disc_' + fl.disc)
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle   // KO: straight to the settle, no further contacts
  const fr = cine.frame
  const sw = cine.W?.stageWidth?.() || 3200, clampX = (o, x) => Math.max(0, Math.min(sw - (o.w || 48), x))
  // Tommy (bounded: never past the target, never off stage)
  if (fr < 35) { pose(f, 'wOrder', fr); f.x = clampX(f, cine.cx0); f.y = cine.floorC }
  else if (fr < 75) { const u = Math.min(1, (fr - 35) / 18); pose(f, 'ultKick', fr - 35); f.x = clampX(f, cine.cx0 + d * 30 * u); f.y = cine.floorC - 70 * u }
  else if (fr < 110) { const u = Math.min(1, (fr - 75) / 12); pose(f, 'fall', fr - 75); f.x = clampX(f, cine.cx0 + d * 30 * (1 - u)); f.y = cine.floorC - 70 * (1 - u) }
  else if (fr < 170) { pose(f, 'ultLand', fr - 110); f.x = clampX(f, cine.cx0); f.y = cine.floorC }
  else { pose(f, 'ultFinal', fr - 170); f.x = clampX(f, cine.cx0); f.y = cine.floorC }
  // the target: held in its hurt pose, lifted by Tommy's kick, brought down by the final contact
  t.x = clampX(t, cine.tx0); t.vx = 0; t.vy = 0; t.isBlocking = false
  if (fr >= 58 && fr < 170) t.y = cine.floorT - 80 * Math.min(1, (fr - 58) / 12)
  else t.y = cine.floorT
  if (f._mmprWhite?.ult) f._mmprWhite.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 12; f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._mmprWhite; if (s) { s.stats.ultDone++; delete s.ult }
    if (f._falcon) { f._falcon.postUlt = NINJA_RESOURCE.postUltLock; f._falcon.sortie = null } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, rhythm: false })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearMmprWhiteUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._mmprWhite) delete f._mmprWhite.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, rhythm: false })
}
export const getMmprWhiteUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, rhythm: cine.rhythm, caster: cine.caster?.side || null })
// Render read (pure function of the frame): where the Ninja Megazord stands and which supplied pose it shows.
export function mmprWhiteUltZord(f) {
  if (!cine.active || cine.caster !== f) return null
  const fr = cine.frame, d = cine.dir, t = cine.target, tx = ctrX(t), feet = cine.floorT + (t.h || 94)
  const stand = tx - d * 150
  let x = stand, p = 'ready'
  if (fr < 12) { x = stand - d * 170 * (1 - fr / 12); p = 'step' }
  else if (fr < 24) p = 'jab'
  else if (fr < 35) p = 'punch'
  else if (fr < 75) p = 'ready'
  else if (fr < 86) p = 'chamber'
  else if (fr < 100) p = 'crane'
  else if (fr < 130) p = 'recover'
  else if (fr < 150) p = 'draw'
  else if (fr < 170) p = 'wind'
  else if (fr < 186) p = 'cut'
  else p = 'finish'
  return { x, y: feet, pose: p, dir: d, age: fr, arc: fr >= 170 && fr < 184 ? (fr - 170) / 14 : null, rhythm: cine.rhythm }
}
