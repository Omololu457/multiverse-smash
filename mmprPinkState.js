// Pink Ranger (mmpr_pink) — SIMULATION state. Plain JSON on f._mmprPink (+ f._falcon via the shared falconzord.js
// scheduler and f._ranger via rangers.js). Sim ticks only, no RNG, no wall clock. Every export is a no-op for any other
// rosterKey. game.js pushes f._mmprPink / f._falcon / f.currentAttack into the replay checkpoint snapshot.
import { MMPR_PINK_MOVES, MMPR_PINK_DAMAGE_SCALE, BOW, SPOTTER, THREAD, CRANE, THUNDER_RESOURCE, dmg } from './mmprPinkData.js'
import { tickRanger, clearRanger } from './rangers.js'
import { falconState, clearFalcon, retireSortie, falconCanCall, falconPay, falconCancelCall, falconCommit, tickFalcon, FALCON_SORTIES } from './falconzord.js'

export const isMmprPink = f => f?.rosterKey === 'mmpr_pink'
export const mmprPinkState = f => f._mmprPink ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  bow: null, spot: null, callAt: null, reject: 0, rejectWhy: null, contactLive: false, thread: null, threadUsed: false,
  assistLaunchUsed: false, arrows: 0,
  stats: { quick: 0, drawn: 0, armed: 0, armFail: 0, bowInterrupted: 0, spots: 0, spotsUsed: 0, calls: 0, rejects: 0, threads: 0,
    threadCancels: 0, cranes: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0 }, cues: [] }

// Engine helpers handed in by mmprPink.js (avoids a combat.js ↔ mmprPinkState import cycle).
const E = { startMove: null, comboScale: null, hitstunScale: null, hitstop: null }
export function registerMmprPinkEngine(o) { Object.assign(E, o) }
const cue = (f, c) => mmprPinkState(f).cues.push(c)
const ultTargets = new WeakMap()   // caster → the fighter its opening arrow hit (never serialized)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const feetY = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200

const zordWorld = W => ({ stageWidth: W?.stageWidth, fighters: W?.fighters, spawn: W?.spawn, projectiles: W?.projectiles, damage: W?.damage,
  comboScale: f => E.comboScale?.(f) ?? 1, hitstunScale: f => E.hitstunScale?.(f) ?? 1, hitstop: (a, d, n) => E.hitstop?.(a, d, n) })
const rangerWorld = W => W && { stageWidth: W.stageWidth, frame: W.frame, seed: W.seed, attackBox: W.attackBox, projectiles: W.projectileRects }
const zordCb = {
  launchAllowed: f => !mmprPinkState(f).assistLaunchUsed,   // one assist launcher per combo
  onLaunch: f => { mmprPinkState(f).assistLaunchUsed = true },
}
export const pinkArrows = (f, W) => (W?.projectiles || []).filter(p => p?.owner === f && p._pinkArrow)

export function clearMmprPink(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearMmprPinkUlt()
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._pinkArrow) W.projectiles.splice(i, 1)
  delete f._mmprPink; delete f._mmprPinkRemoteInput
  clearFalcon(f, W)
  if (isMmprPink(f)) clearRanger(f)
}

// Movement lock (game.js updateMovementInput). Up held WITH Special belongs to Sky Splitter, so it never also jumps.
// UP GRACE (same rule as Black's Talon Lift): a fresh grounded Up while idle holds the jump for UP_GRACE frames; a
// Special inside that window becomes Sky Splitter and consumes the jump, otherwise the jump starts on frame UP_GRACE.
export const UP_GRACE = 3
const upGraceHold = (f, raw) => !!(raw?.up && !f.attacking && grounded(f) && (f._mmprPink?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export const mmprPinkLocked = (f, raw = null) => isMmprPink(f) && (!!f._ranger?.blink || (f.attacking && !f.currentAttack?.launcher) ||
  !!(raw ? raw.special && raw.up : f._mmprPink?.ownsUp) || upGraceHold(f, raw) || isMmprPinkUltActive())

// Start one of Pink's moves through combat.startMove (frameExact path) and attach the per-move descriptor `mb`.
export function startPinkMove(f, key, W, { cancel = false, extra = null } = {}) {
  if (!isMmprPink(f)) return false
  const s = mmprPinkState(f), md = MMPR_PINK_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || f._ranger?.blink) return false
  const cost = md.cost || 0
  if ((f.energy || 0) < cost) return reject(f, 'energy')
  if (md.isSpecial && ((f.disabledSpecials || []).includes('special') || f._gaDisabled > 0)) return false
  if ((md.isSpecial || md.isUltimate || key === 'pPalm' || key === 'pLow') && !g) return false
  if (key === 'pBow' && pinkArrows(f, W).length) return reject(f, 'arrow')     // one arrow per owner
  if (key === 'pCall' && !falconCanCall(f, extra?.kind, f.energy, THUNDER_RESOURCE)) return reject(f, callWhy(f, extra?.kind))
  if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!E.startMove || !E.startMove(f, key, md)) return false
  let spend = cost
  if (key === 'pCall') { spend = falconPay(f, extra.kind, THUNDER_RESOURCE); captureCall(f, s, W) }
  f.energy = Math.max(0, (f.energy || 0) - spend); f.currentMove = key
  f.currentAttack.mb = { key, dir: f.facing || 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, kind: extra?.kind || null,
    fromChain: !!extra?.fromChain }
  f.currentAttack.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; f.vx = 0
  if (key === 'up') f.jumpHeld = true
  if (key === 'pBow') { s.bow = { start: s.clock, serial: s.serial, armed: false, fired: null, held: true }; cue(f, 'bowDraw') }
  else if (key === 'pCrane') { s.stats.cranes++; cue(f, 'crane') }
  else if (key === 'pUltOpen') { s.stats.ultStarts++; s.ultArrowOut = false; cue(f, 'ultStart') }
  else cue(f, md.call ? 'call' : 'swing')
  return true
}
function callWhy(f, kind) {
  const z = f._falcon, P = FALCON_SORTIES[kind]
  if (!z || !P) return 'call'
  if (z.pips <= 0) return 'pips'
  if (z.lockout > 0 || z.postUlt > 0 || z.sortie || z.pendingKind) return 'busy'
  if ((f.energy || 0) < P.cost) return 'energy'
  return 'call'
}
// Rejected call / shot: feedback only. Nothing is spent, nothing is queued.
function reject(f, why) {
  const s = mmprPinkState(f); s.reject = 24; s.rejectWhy = why; s.stats.rejects++; cue(f, 'reject')
  return false
}
// The call captures its LOCATION at acceptance: the live Spotter Link (consumed) or the telegraphed default point.
// Clamped to the stage and to 400 px from Kimberly. The y is the floor (the Megazord stands on it); `my` = marker height.
function captureCall(f, s, W) {
  const dir = f.facing || 1, cx = ctrX(f), lim = SPOTTER.maxDist
  let x, my, from
  if (s.spot && s.spot.t > 0) { x = s.spot.x; my = s.spot.y; from = 'spotter'; s.spot = null; s.stats.spotsUsed++ }
  else { x = cx + dir * SPOTTER.defaultAhead; my = feetY(f) - 50; from = 'default' }
  x = Math.max(cx - lim, Math.min(cx + lim, x))
  x = Math.round(Math.max(SPOTTER.edge, Math.min(sw(W) - SPOTTER.edge, x)))
  s.callAt = { x, y: Math.round(feetY(f)), my: Math.round(my), from, dir }
  s.stats.calls++
}

// ── combat.js hooks (mmpr_pink-gated) ──
export function mmprPinkHitbox(f) {
  const a = f.currentAttack, m = a?.mb, md = MMPR_PINK_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 14), w: a.rangeX, h: a.rangeY }
}
export function mmprPinkBlock(f, d, a) {
  if (!isMmprPink(f) || !a?.mb) return
  d.blockstun = MMPR_PINK_MOVES[a.mb.key].blockstun; a.mb.blocked = true
}
export function mmprPinkHit(f, d, a, { armored = false } = {}) {
  if (!isMmprPink(f) || !a?.mb || armored) return
  a.mb.clean = true; f._cmdHitLanded = true
}
// combat.js projectile hook: one of Pink's arrows connected. `armored` = the target absorbed it (super armor).
// Clean = not blocked, not armored, target actually in hitstun → Spotter Link / Thread the Needle / ultimate confirm.
export function mmprPinkProjectileHit(proj, target, { armored = false } = {}) {
  const f = proj?.owner, k = proj?._pinkArrow
  if (!k || !isMmprPink(f) || !target) return
  const s = mmprPinkState(f), clean = !target.isBlocking && !armored && (target.hitstun || 0) > 0
  if (k.kind === 'ult') {
    if (clean && target.health > 0) { ultTargets.set(f, target); s.ultHit = true; s.ultArrowOut = false }
    else { s.ultArrowOut = false; cue(f, 'ultMiss') }
    return
  }
  if (!clean) { cue(f, 'arrowBlocked'); return }
  // SPOTTER LINK: a recorded LOCATION (the impact point), not a debuff. Later hits replace it.
  s.spot = { x: Math.round(proj.x), y: Math.round(proj.y), t: SPOTTER.life }; s.stats.spots++
  cue(f, k.kind === 'drawn' ? 'spotDrawn' : 'spot')
  // THREAD THE NEEDLE: this ordinary arrow landed during a live authored Megazord contact window. Once per combo.
  if (s.contactLive && !s.threadUsed) { s.thread = { t: THREAD.window }; s.threadUsed = true; s.stats.threads++; cue(f, 'thread') }
}

// Thread the Needle cancel gate (read by the command layer): a granted window, Pink in her bow RECOVERY, last 6 f.
export function threadCancelOpen(f) {
  const s = f?._mmprPink, a = f?.attacking ? f.currentAttack : null
  return !!(s?.thread && s.thread.t > 0 && a?.mb?.key === 'pBow' && s.bow?.fired && a.timer <= THREAD.cancelLast)
}
export function threadSpend(f) { const s = f._mmprPink; s.thread = null; s.stats.threadCancels++; cue(f, 'threadGo') }

function fireArrow(f, s, W, kind) {
  const P = kind === 'drawn' ? BOW.drawn : kind === 'ult' ? ULT_ARROW : BOW.quick, dir = f.facing || 1
  const foot = feetY(f), y = foot - (f.h || 94) * BOW.heightFrac
  const A = BOW.art, artDy = A.handDy - A.lineRow * A.scale
  const pr = W?.spawn?.(f, kind === 'ult' ? 'pink_ult_arrow' : 'pink_arrow', { damage: dmg(P.raw), speed: P.speed, vx: dir * P.speed, vy: 0,
    spawnX: ctrX(f) + dir * BOW.ahead, spawnY: y, w: BOW.radius * 2, h: BOW.radius * 2, radius: BOW.radius, lifetime: P.lifetime,
    hitstun: P.hitstun, knockbackX: P.knockbackX, knockbackY: P.knockbackY, isSpecial: true, category: kind === 'ult' ? 'ultimate' : 'special',
    sheet: arrowSheet(f), spriteFrames: 1, spriteW: A.w, spriteH: A.h, spriteScale: A.scale, spriteBottomY: Math.round(foot - artDy),
    noHitstop: false, color: '#ffe640' })
  if (pr) { pr.damageType = 'pierce'; pr.isUltimate = kind === 'ult'; pr._pinkArrow = { kind, n: ++s.arrows }; pr._pinkMaxX = sw(W) }
  return pr
}
// Skin-specific arrow tint is cosmetic only (precomputed PNG per skin; same size/pivot/hitbox).
const arrowSheet = f => f._recolorTag ? `./assets/mmpr_pink/skins/${f._recolorTag}/arrow.png` : './assets/mmpr_pink/arrow.png'
const ULT_ARROW = { raw: 30, speed: 18, lifetime: 30, hitstun: 40, knockbackX: 0, knockbackY: 0 }

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickMmprPink(f, opp, raw, W) {
  if (!isMmprPink(f)) { if (f?._mmprPink) clearMmprPink(f, W); return }
  const s = mmprPinkState(f); s.tick++
  falconState(f, THUNDER_RESOURCE)
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk, block: !!raw.block }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if (raw.up && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  // arrows never pass the stage walls (no wall penetration / offscreen targeting)
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) { const p = W.projectiles[i]
    if (p?.owner === f && p._pinkArrow && (p.x < 0 || p.x > (p._pinkMaxX || sw(W)))) { if (p._pinkArrow.kind === 'ult') { s.ultArrowOut = false; cue(f, 'ultMiss') } W.projectiles.splice(i, 1) } }
  if (f.health <= 0) { if (f._falcon?.pendingKind) falconCancelCall(f); s.bow = null; s.thread = null; return }
  const a0 = f.attacking ? f.currentAttack : null
  // Blink is vetoed during any committed action, INCLUDING the bow draw (the draw continues; no free release).
  if (f._ranger) f._ranger.blinkVeto = !!a0
  tickRanger(f, opp, raw, rangerWorld(W))
  if (f.hitstop > 0) return
  s.clock++
  if (s.reject > 0) s.reject--
  if (s.spot && --s.spot.t <= 0) s.spot = null
  if (s.thread && --s.thread.t <= 0) s.thread = null
  // the shared scheduler: pips / lockout tick, and a committed Megazord strike completes even if Kimberly is hit
  const evs = tickFalcon(f, zordWorld(W), THUNDER_RESOURCE, MMPR_PINK_DAMAGE_SCALE, zordCb)
  for (const e of evs) onZordEvent(f, s, e)
  const so = f._falcon.sortie
  s.contactLive = !!(so && FALCON_SORTIES[so.kind].contacts.some(c => so.age - 1 >= c.from && so.age - 1 <= c.to))
  if (!(f.comboCounter > 0)) { s.threadUsed = false; s.assistLaunchUsed = false }
  const a = f.attacking ? f.currentAttack : null, m = a?.mb
  // a call interrupted before its commit frame: resources stay spent, nothing appears
  if (f._falcon.pendingKind && !(a && m?.key === 'pCall')) { falconCancelCall(f); s.callAt = null; cue(f, 'callCancel') }
  // a draw interrupted before release: the committed Energy stays spent, nothing fires
  if (s.bow && !(a && m?.key === 'pBow' && m.serial === s.bow.serial)) { if (!s.bow.fired) { s.stats.bowInterrupted++; cue(f, 'bowBreak') } s.bow = null }
  if (s.thread && !(a && m?.key === 'pBow')) s.thread = null   // never stored for a later action
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = a.total - a.timer, md = MMPR_PINK_MOVES[m.key]
  f.facing = m.dir
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) {
    const want = m.origin + m.dir * md.travel[2] * (t - md.travel[0] + 1)
    let x = Math.max(0, Math.min(sw(W) - f.w, want))
    if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }
    f.x = x; f.vx = 0
  } else if (grounded(f)) f.vx = 0
  if (m.key === 'pBow') tickBow(f, s, a, t, raw, W)
  if (m.key === 'pCrane' && t < CRANE.frames) { f.x = Math.max(0, Math.min(sw(W) - f.w, m.origin - m.dir * CRANE.dist * Math.min(1, (t + 1) / CRANE.frames))); f.vx = 0 }
  // CALL COMMIT: the first frame after the 14 f startup. From here the strike is detached and completes on its own.
  if (m.key === 'pCall' && t >= a.activeStart && f._falcon.pendingKind) {
    const at = s.callAt || { x: ctrX(f) + m.dir * SPOTTER.defaultAhead, y: feetY(f) }
    falconCommit(f, opp, zordWorld(W), { x: at.x, y: at.y })
  }
  // ULTIMATE: the braced arrow leaves on frame 30; a clean hit captures the target → the frozen sequence.
  if (m.key === 'pUltOpen' && t === md.startup && !m.fired) { m.fired = true; s.ultArrowOut = !!fireArrow(f, s, W, 'ult'); cue(f, 'ultArrow') }
  if (m.key === 'pUltOpen' && s.ultHit) { s.ultHit = false; const tg = ultTargets.get(f); ultTargets.delete(f); if (tg && tg.health > 0) activateMmprPinkUlt(f, tg, W) }
  if (m.key === 'pUltOpen' && m.fired && t === md.startup + 1 && !s.ultArrowOut && !cine.active) { /* arrow vanished at once: miss */ }
}
// POWER BOW draw. t = frames since acceptance (this tick). Held → the timer is pinned on the aim frame (12).
function tickBow(f, s, a, t, raw, W) {
  const b = s.bow; if (!b || b.fired) return
  const held = !!raw.special && b.held
  if (!raw.special) b.held = false
  const age = s.clock - b.start
  if (b.held && !b.armChecked && age >= BOW.armAt) {   // checked ONCE at the threshold
    if ((f.energy || 0) >= BOW.armCost) { f.energy -= BOW.armCost; b.armed = true; s.stats.armed++; cue(f, 'armed') }
    else { b.armFailed = true; s.stats.armFail++ }
    b.armChecked = true
  }
  const capped = age >= BOW.cap
  if (t < BOW.release) return                               // nothing leaves before frame 12
  if (held && !capped) { a.timer = a.total - BOW.release + 1; return }   // hold the aim pose (frame 12) while drawn
  const kind = b.armed ? 'drawn' : 'quick'
  b.fired = kind; b.firedAt = s.clock
  fireArrow(f, s, W, kind)
  s.stats[kind]++
  const rec = (kind === 'drawn' ? BOW.drawn : BOW.quick).recovery
  a.total = BOW.release + 1 + rec; a.timer = rec + 1   // after this frame's decrement: exactly `rec` recovery frames
  a.activeStart = BOW.release; a.activeEnd = BOW.release
  cue(f, kind === 'drawn' ? 'shotDrawn' : 'shot')
}
function onZordEvent(f, s, e) {
  if (e.type === 'commit') { cue(f, 'commit_' + e.kind); s.lastCommit = { kind: e.kind, at: s.callAt }; s.callAt = null }
  if (e.type === 'pip') cue(f, 'ready')
  if (e.type === 'hit') cue(f, e.kind === 'skySplitter' ? 'skyHit' : 'swordHit')
  if (e.type === 'blocked') cue(f, 'swordBlock')
}

// ══ ULTIMATE — THUNDERSTRING: HEAVEN'S FINAL ARROW ══════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (same as Black's Falcon Formation / Red's Power Sword): activate / isActive /
// update / clear / status. While active game.js freezes combat, physics and input and calls updateMmprPinkUlt() each
// frame. Kimberly's pose comes from a non-hitting currentAttack whose timer this module advances; the Megazord and the
// second arrow are drawn by mmprPinkFx from mmprPinkUltScene() (a pure function of the frame). The player never
// controls the Megazord. Beats (frames from confirm):
//   0-35    Thunder Megazord appears beyond the target (low sword) and rises into a sword LIFT  (contact @18, raw 45)
//   36-63   Kimberly leaps in with the supplied airborne kick                                    (contact @54, raw 35)
//   64-109  she lands back, draws the Power Bow while Thunder winds up the lightning blade; the second arrow crosses
//           the blade's arc                                                                      (contact @100, raw 40)
//   110-150 Thunder's largest supplied slash (hslash0 with its lightning trail)                  (contact @122, raw 120)
// Opening arrow 30 + 45 + 35 + 40 + 120 = 270 raw before shared scaling. A KO on any contact skips to the settle.
export const ULT = { total: 150, settle: 132, contacts: [{ at: 18, raw: 45 }, { at: 54, raw: 35 }, { at: 100, raw: 40 }, { at: 122, raw: 120 }] }
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1 }
export const isMmprPinkUltActive = () => cine.active
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, mb: null, _ultPose: true }
}
export function activateMmprPinkUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = mmprPinkState(f)
  retireSortie(f, zordWorld(W)); if (f._falcon) f._falcon.pendingKind = null   // no duplicate Megazord
  s.bow = null; s.thread = null
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: f.y + (f.h || 94) - (target.h || 94),
    cx0: f.x, tx0: target.x, dir: f.facing || 1, done: 0, scale: E.comboScale?.(f) ?? 1 })
  s.ult = { frame: 0, done: 0 }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  cue(f, 'ultConfirm')
  return true
}
function ultHit(i) {
  const c = ULT.contacts[i], t = cine.target, f = cine.caster
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  cine.done = i + 1; if (f._mmprPink?.ult) f._mmprPink.ult.done = cine.done
  cue(f, i === 3 ? 'ultImpact' : i === 2 ? 'ultArrowHit' : i === 1 ? 'impact' : 'ultLift')
}
export function updateMmprPinkUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, k = cine.frame, d = cine.dir
  if (!f || !t) return clearMmprPinkUlt()
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle
  const fr = cine.frame, W = cine.W
  const stage = W?.stageWidth?.() || 3200, clampX = (o, x) => Math.max(0, Math.min(stage - (o.w || 48), x))
  const tx = clampX(t, cine.tx0), kick = clampX(f, tx - d * 52), back = clampX(f, tx - d * 230)
  // Kimberly: bounded authored positions (never past the target, never off stage)
  if (fr < 36) { pose(f, 'idle', fr); f.x = clampX(f, cine.cx0); f.y = cine.floorC }
  else if (fr < 64) { const u = Math.min(1, (fr - 36) / 18); pose(f, 'ultKick', fr - 36); f.x = clampX(f, cine.cx0 + (kick - cine.cx0) * u); f.y = cine.floorC - 90 * Math.sin(Math.PI * Math.min(1, u * 0.85 + (fr >= 54 ? 0.15 : 0))) * (fr < 58 ? 1 : 0.6) }
  else if (fr < 110) { const u = Math.min(1, (fr - 64) / 10); f.x = clampX(f, kick + (back - kick) * u); f.y = cine.floorC - 40 * Math.sin(Math.PI * u)
    if (fr < 74) pose(f, 'ultLand', fr - 64); else pose(f, 'pBow', Math.min(13, Math.floor((fr - 74) * 12 / 22))) }
  else { pose(f, 'ultLand', 8 + fr - 110); f.y = cine.floorC }
  // the target: lifted by the sword lift, held in its hurt pose, settles for the final slash
  t.x = tx; t.vx = 0; t.vy = 0; t.isBlocking = false
  if (fr >= 18 && fr < 70) t.y = cine.floorT - 90 * Math.min(1, (fr - 18) / 10)
  else if (fr >= 70 && fr < 90) t.y = cine.floorT - 90 * (1 - (fr - 70) / 20)
  else t.y = cine.floorT
  if (f._mmprPink?.ult) f._mmprPink.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 12; f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._mmprPink; if (s) { s.stats.ultDone++; delete s.ult }
    if (f._falcon) { f._falcon.postUlt = THUNDER_RESOURCE.postUltLock; f._falcon.sortie = null } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearMmprPinkUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._mmprPink) delete f._mmprPink.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export const getMmprPinkUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
// Render read (pure function of the frame): the Megazord pose/position and the second arrow during the ultimate.
export function mmprPinkUltScene(f) {
  if (!cine.active || cine.caster !== f) return null
  const fr = cine.frame, d = cine.dir, t = cine.target, tx = ctrX(t), floor = cine.floorT + (t.h || 94)
  const zx = tx + d * 150, zdir = -d                      // the Megazord stands beyond the target, facing Kimberly
  let zord = null
  if (fr < 36) zord = { x: zx, y: floor, pose: fr < 14 ? 'uwind' : 'uslash', age: fr < 14 ? fr : fr - 14, dir: zdir, alpha: Math.min(1, fr / 8) }
  else if (fr < 64) zord = { x: zx, y: floor, pose: 'ready', age: fr, dir: zdir, alpha: 1 }
  else if (fr < 110) zord = { x: zx, y: floor, pose: 'uwindL', age: fr - 64, dir: zdir, alpha: 1 }
  else zord = { x: zx + d * 20, y: floor, pose: 'hslash', age: fr - 110, dir: zdir, alpha: fr > 140 ? Math.max(0, 1 - (fr - 140) / 10) : 1 }
  let arrow = null
  if (fr >= 96 && fr <= 100) { const kx = ctrX(f), u = (fr - 96) / 4; arrow = { x: kx + (tx - kx) * u, y: cine.floorC + (f.h || 94) - (f.h || 94) * 0.83, dir: d } }
  return { zord, arrow, frame: fr, impact: fr >= 122 && fr < 132 ? { x: tx, y: (t.y || 0) + (t.h || 94) / 2, age: fr - 122 } : null }
}
