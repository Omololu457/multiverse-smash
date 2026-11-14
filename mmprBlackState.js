// Black Ranger (mmpr_black) — SIMULATION state. Plain JSON on f._mmprBlack (+ f._falcon via falconzord.js and
// f._ranger via rangers.js). Sim ticks only, no RNG, no wall clock. Every export is a no-op for any other rosterKey.
import { MMPR_BLACK_MOVES, MMPR_BLACK_LANDING, PINCER, FALCON_RESOURCE, MMPR_BLACK_DAMAGE_SCALE, dmg } from './mmprBlackData.js'
import { tickRanger, clearRanger } from './rangers.js'
import { falconState, clearFalcon, retireSortie, falconCanCall, falconPay, falconCancelCall, falconCommit, tickFalcon, falconShotHit, FALCON_SORTIES } from './falconzord.js'

export const isMmprBlack = f => f?.rosterKey === 'mmpr_black'
export const mmprBlackState = f => f._mmprBlack ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  risingUsed: false, leaping: false, airborne: false, landing: 0, riseX: 0,
  pincer: null, pincerUsed: false, assistLaunchUsed: false, comboWas: 0,
  stats: { pincerTags: 0, pincerConsumed: 0, pincerCancels: 0, pincerVoid: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0 }, cues: [] }

// Engine helpers handed in by mmprBlack.js (avoids a combat.js ↔ mmprBlackState import cycle).
const E = { startMove: null, comboScale: null, hitstunScale: null, hitstop: null }
export function registerMmprBlackEngine(o) { Object.assign(E, o) }
const cue = (f, c) => mmprBlackState(f).cues.push(c)
const ultTargets = new WeakMap()   // attacker → the fighter its ultimate opener hit (never serialized)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)

// World for the shared modules (built from the game.js world each tick).
const falconWorld = W => ({ stageWidth: W?.stageWidth, fighters: W?.fighters, spawn: W?.spawn, projectiles: W?.projectiles, damage: W?.damage,
  comboScale: f => E.comboScale?.(f) ?? 1, hitstunScale: f => E.hitstunScale?.(f) ?? 1, hitstop: (a, d, n) => E.hitstop?.(a, d, n) })
const rangerWorld = W => W && { stageWidth: W.stageWidth, frame: W.frame, seed: W.seed, attackBox: W.attackBox, projectiles: W.projectileRects }
const falconCb = {
  launchAllowed: f => !mmprBlackState(f).assistLaunchUsed,
  onLaunch: f => { mmprBlackState(f).assistLaunchUsed = true },
  shotArt: k => `./assets/power_rangers/falconzord/cells/shot${k % 2}.png`,
}

export function clearMmprBlack(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearMmprBlackUlt()
  delete f._mmprBlack; delete f._mmprBlackRemoteInput
  clearFalcon(f, W)
  if (isMmprBlack(f)) clearRanger(f)
}
// Movement lock (game.js updateMovementInput). `raw` = this frame's raw controls: Up held WITH Special belongs to Talon
// Lift, so it never also jumps (read from the same frame's snapshot, independent of system order).
// UP GRACE: real players press Up a frame or two before Special. A fresh grounded Up while idle therefore holds the jump
// for UP_GRACE frames (s.upAge counts the held frames as of the previous tick); Special inside that window becomes Talon
// Lift and consumes the jump (jumpHeld), otherwise the jump starts on frame UP_GRACE. Not applied to launcher jump-cancels
// (attacking) or in the air.
export const UP_GRACE = 3
const upGraceHold = (f, raw) => !!(raw?.up && !f.attacking && grounded(f) && (f._mmprBlack?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export const mmprBlackLocked = (f, raw = null) => isMmprBlack(f) && (!!f._ranger?.blink || f._mmprBlack?.landing > 0 || !!f._mmprBlack?.leaping ||
  (f.attacking && !f.currentAttack?.launcher) || !!(raw ? raw.special && raw.up : f._mmprBlack?.ownsUp) || upGraceHold(f, raw) || isMmprBlackUltActive())

// Start one of Black's moves through combat.startMove (frameExact path) and attach the per-move descriptor `mb`.
export function startBlackMove(f, key, W, { cancel = false, extra = null } = {}) {
  if (!isMmprBlack(f)) return false
  const s = mmprBlackState(f), md = MMPR_BLACK_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || s.landing > 0 || f._ranger?.blink) return false
  const cost = md.cost || 0
  if ((f.energy || 0) < cost) return false
  if (md.isSpecial && ((f.disabledSpecials || []).includes('special') || f._gaDisabled > 0)) return false
  if ((key === 'bRising' || key === 'bCrescent' || key === 'bCall' || key === 'bUltOpen' || key === 'bPalm' || key === 'bLow') && !g) return false
  if (key === 'bRising' && s.risingUsed) return false
  if (key === 'bCall' && !falconCanCall(f, extra?.kind, f.energy, FALCON_RESOURCE)) return false
  if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!E.startMove || !E.startMove(f, key, md)) return false
  let spend = cost
  if (key === 'bCall') spend = falconPay(f, extra.kind, FALCON_RESOURCE)
  f.energy = Math.max(0, (f.energy || 0) - spend); f.currentMove = key
  f.currentAttack.mb = { key, dir: f.facing || 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, contact: 0,
    fromChain: !!extra?.fromChain, kind: extra?.kind || null }
  f.currentAttack.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; f.vx = 0
  if (key === 'up') f.jumpHeld = true
  if (key === 'bRising') { s.risingUsed = true; s.leaping = true; s.airborne = false; s.riseX = f.x }
  if (key === 'bUltOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  cue(f, md.call ? 'call' : md.isSpecial ? 'special' : 'swing')
  return true
}

// ── combat.js hooks (mmpr_black-gated) ──
export function mmprBlackHitbox(f) {
  const a = f.currentAttack, m = a?.mb, md = MMPR_BLACK_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  if (md.contacts) { const t = a.total - a.timer, c = md.contacts.find(c => t >= c.from && t <= c.to); if (!c) return { x: 0, y: 0, w: 0, h: 0 } }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 14), w: a.rangeX, h: a.rangeY }
}
export function mmprBlackBlock(f, d, a) {
  if (!isMmprBlack(f) || !a?.mb) return
  const md = MMPR_BLACK_MOVES[a.mb.key], c = currentContact(a, md)
  d.blockstun = (c || md).blockstun; a.mb.blocked = true
}
function currentContact(a, md) { if (!md?.contacts) return null; const t = a.total - a.timer; return md.contacts.find(c => t >= c.from && t <= c.to) || null }
export function mmprBlackHit(f, d, a, { armored = false } = {}) {
  if (!isMmprBlack(f) || !a?.mb || armored) return
  a.mb.clean = true; f._cmdHitLanded = true
  const s = mmprBlackState(f), md = MMPR_BLACK_MOVES[a.mb.key]
  // PINCER TAG: grounded, unblocked Heavy / command finisher (and the chain's confirmed launcher), once per combo.
  if ((md.pincer || (a.mb.key === 'up' && a.mb.fromChain)) && grounded(f) && !s.pincerUsed && d.health > 0) {
    s.pincer = { t: PINCER.tag, target: d.side || d.playerNumber || 0, serial: a.mb.serial, hit: false, cancel: 0 }
    s.pincerUsed = true; s.stats.pincerTags++; cue(f, 'tag')
  }
  if (a.mb.key === 'bUltOpen' && d.health > 0) { a.mb.ultHit = true; ultTargets.set(f, d) }   // fighter ref kept OUT of the JSON-snapshotted attack
}
// combat.js projectile hook: one of this owner's Falcon shots connected (or was blocked).
export function mmprBlackProjectileHit(proj, target) {
  if (!proj?._falcon || !isMmprBlack(proj.owner)) return
  falconShotHit(proj, target)
}

// ↑ held with Special owns the input: no jump that frame (Up+Special = Talon Lift).
function onFalconEvent(f, s, e) {
  if (e.type === 'commit') cue(f, 'commit_' + e.kind)
  if (e.type === 'pip') cue(f, 'ready')
  if (e.type === 'shot') cue(f, 'volley')
  if (e.type === 'hit' || e.type === 'blocked') cue(f, e.kind === 'talon' ? 'talon' : e.kind === 'sweep' ? 'sweepHit' : 'shotHit')
  // PINCER CONSUME: a CLEAN Falcon hit on the tagged target. Cancel only if Black is still in the SAME attack.
  const P = s.pincer
  if (e.type === 'hit' && P && P.t > 0 && !P.hit && e.targetId === P.target) {
    P.hit = true; s.stats.pincerConsumed++
    const a = f.attacking ? f.currentAttack : null
    if (a?.mb?.serial === P.serial) { P.cancel = P.serial; cue(f, 'pincer') }
    else { s.pincer = null; s.stats.pincerVoid++ }
  }
}

// Pincer cancel gate (read by the command layer): the attack that made the tag, in its last 6 recovery frames.
export function pincerCancelOpen(f) {
  const s = f?._mmprBlack, P = s?.pincer, a = f?.attacking ? f.currentAttack : null
  if (!P || !P.cancel || a?.mb?.serial !== P.cancel) return false
  const t = a.total - a.timer
  return t > a.activeEnd && a.timer <= PINCER.cancelLast
}
export function pincerSpend(f) { const s = f._mmprBlack; s.pincer = null; s.stats.pincerCancels++; cue(f, 'pincerGo') }

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickMmprBlack(f, opp, raw, W) {
  if (!isMmprBlack(f)) { if (f?._mmprBlack) clearMmprBlack(f, W); return }   // only Black's own leftovers (another owner's shared sortie is theirs)
  const s = mmprBlackState(f); s.tick++
  falconState(f, FALCON_RESOURCE)
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk, block: !!raw.block }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  // Up+Special is Talon Lift: that Up is CONSUMED until released, so it never turns into a jump after the call ends
  // (the locked movement path passes empty keys, which clears jumpHeld every frame; re-assert it here, after movement).
  if (raw.up && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  if (f.health <= 0) { if (f._falcon?.pendingKind) falconCancelCall(f); return }
  // the Ranger framework: double-tap blink (charges, invulnerable travel, edge clamp). Vetoed while committed.
  const a0 = f.attacking ? f.currentAttack : null
  if (f._ranger) f._ranger.blinkVeto = !!(s.landing > 0 || s.leaping || a0)
  tickRanger(f, opp, raw, rangerWorld(W))
  if (f.hitstop > 0) return
  s.clock++
  // the shared Falconzord sortie: resources tick and the live sortie keeps flying even while Black is hit (post-commit)
  const evs = tickFalcon(f, falconWorld(W), FALCON_RESOURCE, MMPR_BLACK_DAMAGE_SCALE, falconCb)
  for (const e of evs) onFalconEvent(f, s, e)
  // combo bookkeeping: a dropped combo re-arms the once-per-combo Pincer tag and the one assist launcher
  if (!(f.comboCounter > 0)) { s.pincerUsed = false; s.assistLaunchUsed = false }
  if (s.pincer) { if (--s.pincer.t <= 0 && !s.pincer.cancel) s.pincer = null }
  const a = f.attacking ? f.currentAttack : null, m = a?.mb
  if (s.pincer?.cancel && m?.serial !== s.pincer.cancel) s.pincer = null   // never saved for a later move
  // a call interrupted before its commit frame (hit / grab / KO / any teardown): resources stay spent
  if (f._falcon.pendingKind && !(a && m?.key === 'bCall')) falconCancelCall(f)
  if (f.hitstun > 0 || f.isGrabbed) { s.leaping = false; s.landing = 0 }
  if (s.landing > 0) { s.landing--; f.vx = 0 }
  const g = grounded(f)
  if (g && !s.leaping) s.risingUsed = false
  if (s.leaping && g && s.airborne) { s.leaping = false; s.landing = MMPR_BLACK_LANDING.rising; f.vx = 0; f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = MMPR_BLACK_LANDING.rising }
  if (!g && s.leaping) s.airborne = true
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = a.total - a.timer, md = MMPR_BLACK_MOVES[m.key]
  f.facing = m.dir
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) {
    const want = m.origin + m.dir * md.travel[2] * (t - md.travel[0] + 1)
    let x = Math.max(0, Math.min((W?.stageWidth?.() || 3200) - f.w, want))
    if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }   // never walks through the foe
    f.x = x; f.vx = 0
  } else if (g && !md.rising) f.vx = 0
  // CRESCENT BREAK: the second contact has its own interval; re-arm the single-connect latch exactly once.
  if (md.contacts) {
    const ci = md.contacts.findIndex(c => t >= c.from && t <= c.to)
    if (ci > 0 && m.contact < ci) { m.contact = ci; const c = md.contacts[ci]; a.hasHit = false; a.damage = dmg(c.raw); a.hitstun = c.hitstun; a.pushX = c.knockbackX; m.clean = false; m.blocked = false }
  }
  if (m.key === 'bRising' && t === 9) { f.vy = -17; f.vx = m.dir * 4; f.onGround = false; f.grounded = false; f.jumpCount = Math.max(1, f.jumpCount || 0); s.airborne = true }
  if (s.leaping && m.key === 'bRising') { f.vx = 0; f.x = Math.max(0, Math.min((W?.stageWidth?.() || 3200) - f.w, s.riseX + m.dir * Math.min(60, Math.max(0, t - 9) * 4))) }
  // CALL COMMIT: the first frame after the 12 f startup. From here the sortie is detached and completes on its own.
  if (m.key === 'bCall' && t >= a.activeStart && f._falcon.pendingKind) falconCommit(f, opp, falconWorld(W))
  // ULTIMATE: a clean opener captures the target → the frozen sequence. Miss/block → the authored 60 f recovery.
  if (m.key === 'bUltOpen' && m.clean && m.ultHit && !m.ultStarted) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateMmprBlackUlt(f, tg, W) }
  if (m.key === 'bUltOpen' && t === a.activeEnd + 1 && !m.clean) { s.stats.ultWhiffs++; cue(f, 'ultMiss') }
}

// ══ ULTIMATE — FALCON FORMATION: BLACKOUT DESCENT ═══════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (redRangerPowerSwordCinematic.js / gokuBlackSwordCinematic.js):
// activate / isActive / update / clear / status. While active, game.js freezes combat, physics and input and calls
// updateMmprBlackUlt() each frame (input lock + target protection: nothing else simulates). The fighters still draw:
// Black's pose comes from a non-hitting currentAttack whose timer this module advances (frameTimeline), the Falconzord
// is drawn by mmprBlackFx from mmprBlackUltFalcon() (a pure function of the frame).
// Beats (frames from confirm):
//   0-39   Falcon sweep pass (contact @18, raw 40) while Black withdraws into the supplied low dive pose
//   40-79  Black rises with the jump kick → crescent kick (contact @52, raw 45), the target is lifted
//   80-114 Falcon talon pass (contact @96, raw 40); Black drops back to the floor
//   115-189 Black lands and gestures; Falcon's bright energy dive (contact @158, raw 100) + impact, knockdown
// Opener 35 + 40 + 45 + 40 + 100 = 260 raw before shared scaling. A KO on any contact skips to the settle.
export const ULT = { total: 190, contacts: [{ at: 18, raw: 40 }, { at: 52, raw: 45 }, { at: 96, raw: 40 }, { at: 158, raw: 100 }], settle: 176 }
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1 }
export const isMmprBlackUltActive = () => cine.active
function pose(f, move, at) {
  const A = f.animationData?.[move]; const total = 999
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total, timer: total - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, mb: null, _ultPose: true }
  return A
}
export function activateMmprBlackUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = mmprBlackState(f)
  retireSortie(f, falconWorld(W)); if (f._falcon) f._falcon.pendingKind = null   // no duplicate actors / projectiles
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
  cine.done = i + 1; if (f._mmprBlack?.ult) f._mmprBlack.ult.done = cine.done
  cue(f, i === 3 ? 'ultImpact' : i === 1 ? 'impact' : 'ultPass')
}
export function updateMmprBlackUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, k = cine.frame, d = cine.dir
  if (!f || !t) return clearMmprBlackUlt()
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle   // KO: straight to the settle, no further contacts
  const fr = cine.frame
  // Black's authored positions (bounded: never past the target, never off stage)
  const sw = cine.W?.stageWidth?.() || 3200, clampX = (o, x) => Math.max(0, Math.min(sw - (o.w || 48), x))
  if (fr < 40) { pose(f, 'ultLow', fr); f.x = clampX(f, cine.cx0 - d * Math.min(50, fr * 4)); f.y = cine.floorC }
  else if (fr < 80) { const u = Math.min(1, (fr - 40) / 16); pose(f, 'ultRise', fr - 40); f.x = clampX(f, cine.cx0 - d * 50 + d * 50 * u); f.y = cine.floorC - 70 * u }
  else if (fr < 115) { const u = Math.min(1, (fr - 80) / 12); pose(f, 'fall', fr - 80); f.y = cine.floorC - 70 * (1 - u) }
  else { pose(f, 'ultLand', fr - 115); f.y = cine.floorC }
  // the target: held in its hurt pose, lifted by the kick, driven down by the dive
  t.x = clampX(t, cine.tx0); t.vx = 0; t.vy = 0; t.isBlocking = false
  if (fr >= 52 && fr < 158) t.y = cine.floorT - 80 * Math.min(1, (fr - 52) / 12)
  else t.y = cine.floorT
  if (f._mmprBlack?.ult) f._mmprBlack.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 12; f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._mmprBlack; if (s) { s.stats.ultDone++; delete s.ult }
    if (f._falcon) { f._falcon.postUlt = FALCON_RESOURCE.postUltLock; f._falcon.sortie = null } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearMmprBlackUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._mmprBlack) delete f._mmprBlack.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export const getMmprBlackUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
// Render read (pure function of the frame): where the Falconzord is during the ultimate.
export function mmprBlackUltFalcon(f) {
  if (!cine.active || cine.caster !== f) return null
  const fr = cine.frame, d = cine.dir, t = cine.target, tx = ctrX(t), ty = (t.y || 0) + (t.h || 94) / 2
  if (fr < 40) { const u = Math.max(0, Math.min(1, (fr - 4) / 30)); return { x: tx - d * 380 + d * 800 * u, y: ty, pose: 'sweep', dir: d, age: fr } }
  if (fr >= 80 && fr < 115) { const u = Math.max(0, Math.min(1, (fr - 82) / 24)); return { x: tx - d * 200 + d * 400 * u, y: ty - 220 + 380 * u * (1 - u) * 1.15 + 40 * u, pose: u < 0.6 ? 'talon' : 'rise', dir: d, age: fr } }
  if (fr >= 128) { const u = Math.max(0, Math.min(1, (fr - 128) / 30)); return { x: tx - d * 90 * (1 - u), y: ty - 360 * (1 - u), pose: fr >= 158 ? 'impact' : 'energy', dir: d, age: fr } }
  return null
}
