// Green Ranger (green_ranger) — SIMULATION state. Plain JSON on f._greenRanger (+ f._zordUlt via rangerZordUltimate.js).
// Sim ticks only, no RNG, no wall clock. Every export is a no-op for any other rosterKey.
import { GREEN_MOVES, GREEN_LANDING, FANG, DRAGON_CALL, EDGE_FOLLOW, PULSE, dmg } from './greenRangerData.js'
import { zordUltBegin, zordUltTick, clearZordUltState, activateZordUltCine, isZordUltCineActive, updateZordUltCine, clearZordUltCine, zordUltCineOwner } from './rangerZordUltimate.js'
import { GREEN_RANGER_FX } from './greenRangerSprites.js'

export const isGreenRanger = f => f?.rosterKey === 'green_ranger'
export const greenState = f => f._greenRanger ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  notes: 0, cooldown: 0, call: null, talonUsed: false, fangUsed: false, leaping: null, airborne: false, landing: 0, riseX: 0,
  pulse2: null, missed: 0, comboWas: 0,
  stats: { calls: 0, callsDone: 0, callsBroken: 0, notesGained: 0, notesSpent: 0, ultStarts: 0, ultConfirms: 0, ultMisses: 0, ultBroken: 0, pulseShots: 0, edgeBursts: 0 },
  cues: [] }

// Engine helpers handed in by greenRanger.js (avoids a combat.js ↔ greenRangerState import cycle).
const E = { startMove: null, comboScale: null, hitstunScale: null, hitstop: null }
export function registerGreenEngine(o) { Object.assign(E, o) }
const cue = (f, c) => { const q = greenState(f).cues; if (q.length < 16) q.push(c) }
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
// cosmetic art path only (skins recolour the same shape; never read by collision / damage)
const artSrc = (f, n) => f._recolorTag ? `./assets/green_ranger/skins/${f._recolorTag}/cells/${n}.png` : GREEN_RANGER_FX[n].src

export function clearGreen(f, W) {
  if (!f) return
  if (isZordUltCineActive() && (zordUltCineOwner() === f)) clearZordUltCine()
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._green) W.projectiles.splice(i, 1)
  delete f._greenRanger; delete f._greenRangerRemoteInput; clearZordUltState(f)
}
// Charge belongs to Dragon Call while the call is live (no ordinary charge energy during the performance).
export const greenOwnsCharge = f => isGreenRanger(f) && (f.currentAttack?.name === 'gCall' || !!f._greenRanger?.chargeHeld)
export const isGreenUltActive = () => isZordUltCineActive() && isGreenRanger(zordUltCineOwner())
export const greenLocked = f => isGreenRanger(f) && (f._greenRanger?.landing > 0 || !!f._greenRanger?.leaping ||
  (f.attacking && !f.currentAttack?.launcher) || isGreenUltActive())
const liveShots = (f, W, kind) => (W?.projectiles || []).filter(p => p.owner === f && p._green?.kind === kind).length

// Call eligibility (read by the command layer and the training overlay): grounded, neutral, not stunned / guarding / attacking.
export function dragonCallReady(f, raw = {}) {
  const s = greenState(f)
  return grounded(f) && !f.attacking && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isGrabbed && !f.knockdownState && !raw.block && !f.isBlocking &&
    s.notes < DRAGON_CALL.maxNotes && s.cooldown <= 0 && s.landing <= 0 && !s.leaping && f.health > 0 && (f.attackCooldown || 0) <= 0
}

// Start one of Green's moves through combat.startMove (frameExact path) and attach the per-move descriptor `gm`.
// Returns false (and changes NOTHING — energy, notes, state) when the move cannot start.
export function startGreenMove(f, key, W, { cancel = false, extra = null } = {}) {
  if (!isGreenRanger(f)) return false
  const s = greenState(f), g = grounded(f)
  if (f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || s.landing > 0) return false
  let useNote = false
  if (GREEN_MOVES[key]?.empower && s.notes > 0) { useNote = true; if (key === 'gAdvance') key = 'gAdvanceN' }
  const md = GREEN_MOVES[key]; if (!md) return false
  const cost = md.cost || 0
  if ((f.energy || 0) < cost) return false                                      // rejected for energy: the note is NOT consumed
  if (md.isSpecial && ((f.disabledSpecials || []).includes('special'))) return false
  if (['gEdge', 'gAdvance', 'gAdvanceN', 'gTalon', 'gPulse', 'gCall', 'gUlt', 'gAdv', 'gLow'].includes(key) && !g) return false
  if (key === 'gFang' && (g || s.fangUsed)) return false
  if (key === 'gTalon' && s.talonUsed) return false
  if (key === 'gPulse' && (liveShots(f, W, 'pulse') > 0 || s.pulse2)) return false     // one active shot per fighter
  if (key === 'gUlt' && f._zordUlt) return false
  if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!E.startMove || !E.startMove(f, key, md)) return false
  f.energy = Math.max(0, (f.energy || 0) - cost); f.currentMove = key
  if (useNote) { s.notes--; s.stats.notesSpent++; cue(f, 'noteSpend') }       // consumed only once the move ACTUALLY started
  f.currentAttack.gm = { key, dir: f.facing || 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, contact: 0,
    note: useNote, fromChain: !!extra?.fromChain, fired: 0 }
  f.currentAttack.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; f.vx = 0
  if (key === 'up' || key === 'gAdvanceN') f.jumpHeld = true
  if (key === 'gTalon') { s.talonUsed = true; s.leaping = 'talon'; s.airborne = false; s.riseX = f.x }
  if (key === 'gFang') { s.fangUsed = true; s.leaping = 'fang'; s.airborne = true }
  if (key === 'gCall') { s.call = { serial: s.serial, granted: false }; s.chargeHeld = true; s.stats.calls++; cue(f, 'callStart') }
  if (key === 'gUlt') { zordUltBegin(f, W); s.stats.ultStarts++; cue(f, 'ultStart') }
  if (key !== 'gCall' && key !== 'gUlt') cue(f, md.blade ? 'slash' : md.isSpecial ? 'special' : 'swing')
  return true
}

// ── combat.js hooks (green_ranger-gated) ──
const NONE = { x: 0, y: 0, w: 0, h: 0 }
function currentContact(a, md) { if (!md?.contacts) return null; const t = a.total - a.timer; return md.contacts.find(c => t >= c.from && t <= c.to) || null }
export function greenHitbox(f) {
  const a = f.currentAttack, m = a?.gm, md = GREEN_MOVES[m?.key]
  if (!m || !md || md.noBody || a._ultPose) return NONE
  if (md.contacts && !currentContact(a, md)) return NONE
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 14), w: a.rangeX, h: a.rangeY }
}
export function greenBlock(f, d, a) {
  if (!isGreenRanger(f) || !a?.gm) return
  const md = GREEN_MOVES[a.gm.key], c = currentContact(a, md)
  d.blockstun = (c || md).blockstun; a.gm.blocked = true
}
export function greenHit(f, d, a, { armored = false } = {}) {
  if (!isGreenRanger(f) || !a?.gm || armored) return
  a.gm.clean = true; f._cmdHitLanded = true
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickGreen(f, opp, raw, W) {
  if (!isGreenRanger(f)) { if (f?._greenRanger) clearGreen(f, W); return }
  const s = greenState(f); s.tick++
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'charge']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk, block: !!raw.block }
    s.prev[k] = v
  }
  // a Charge press that the call layer owns stays owned until released (no ordinary charge bleeding after the call)
  if (!raw.charge) s.chargeHeld = false
  if (f.health <= 0) { if (s.call && !s.call.granted) breakCall(f, s); return }
  if (f.hitstop > 0) return
  s.clock++
  if (s.cooldown > 0) s.cooldown--
  if (s.missed > 0) s.missed--
  if (!(f.comboCounter > 0)) s.comboWas = 0
  const a = f.attacking ? f.currentAttack : null, m = a?.gm
  // ── DRAGON CALL: completion at the end of the 30 f performance grants one note; anything else ending it grants none.
  if (s.call) {
    if (m?.key === 'gCall' && m.serial === s.call.serial) {
      const t = a.total - a.timer
      f.isCharging = false
      if (!s.call.granted && t >= DRAGON_CALL.startup + DRAGON_CALL.perform) {
        s.call.granted = true; s.notes = Math.min(DRAGON_CALL.maxNotes, s.notes + 1); s.cooldown = DRAGON_CALL.cooldown
        s.stats.notesGained++; s.stats.callsDone++; cue(f, 'noteGain')
      }
    } else { if (!s.call.granted) breakCall(f, s); s.call = null }
  }
  // ── EMERALD PULSE second shot (note): fires after a visible delay unless Green was hit first.
  if (s.pulse2) {
    if (f.hitstun > 0 || f.isGrabbed || f.knockdownState) { s.pulse2 = null; cue(f, 'pulseCancel') }
    else if (s.clock >= s.pulse2.at) { firePulse(f, W, 1, s.pulse2.dir); s.pulse2 = null }
  }
  // ── ULTIMATE opener (shared Zord sequence)
  if (f._zordUlt?.result === 'confirmed' && zordUltCineOwner() !== f) clearZordUltState(f)   // the cinematic ended / was cleared elsewhere
  if (f._zordUlt && f._zordUlt.result !== 'confirmed') {
    if (!f._zordUlt.result && !(m?.key === 'gUlt')) { clearZordUltState(f); s.stats.ultBroken++; s.missed = 60; cue(f, 'ultBroken') }   // Ranger interrupted before the dive
    else {
      const ev = zordUltTick(f, opp, W, E.comboScale?.(f) ?? 1)
      if (ev?.type === 'hit') {
        cue(f, 'zordHit')
        if (f._zordUlt?.result === 'confirmed') {
          // Mirror rule: only one Zord cinematic at a time. If another Ranger's already owns the screen (same-frame
          // confirms), this opener keeps its contact damage but the sequence does not start — CALL MISSED, no refund.
          if (activateZordUltCine(f, ev.target, W, { comboScale: E.comboScale?.(f) ?? 1, onPose: ultPose })) { s.stats.ultConfirms++; cue(f, 'ultConfirm') }
          else { clearZordUltState(f); s.stats.ultMisses++; s.missed = 60; cue(f, 'callMissed') }
        }
      }
      if (ev?.type === 'blocked' || ev?.type === 'whiff') { s.stats.ultMisses++; s.missed = 60; cue(f, 'callMissed') }
      if (ev?.type === 'capture') cue(f, 'zordDive')
    }
  }
  if (f.hitstun > 0 || f.isGrabbed) { s.leaping = null; s.landing = 0 }
  if (s.landing > 0) { s.landing--; f.vx = 0 }
  const g = grounded(f)
  if (g && !s.leaping) { s.talonUsed = false; s.fangUsed = false }
  if (s.leaping && g && s.airborne) {
    const L = s.leaping === 'fang' ? GREEN_LANDING.fang : GREEN_LANDING.talon
    s.leaping = null; s.landing = L; f.vx = 0; f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = L; cue(f, 'land')
  }
  if (!g && s.leaping) s.airborne = true
  if (!m || f.hitstun > 0 || f.isGrabbed || a._ultPose) return
  const t = a.total - a.timer, md = GREEN_MOVES[m.key]
  f.facing = m.dir
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) {
    const want = m.origin + m.dir * md.travel[2] * (t - md.travel[0] + 1)
    let x = Math.max(0, Math.min(sw(W) - f.w, want))
    if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }   // never through the foe
    f.x = x; f.vx = 0
  } else if (g && !md.rising && !md.fang) f.vx = 0
  // RISING TALON: the second contact has its own interval; re-arm the single-connect latch exactly once.
  if (md.contacts) {
    const ci = md.contacts.findIndex(c => t >= c.from && t <= c.to)
    if (ci > 0 && m.contact < ci) { m.contact = ci; const c = md.contacts[ci]; a.hasHit = false; a.damage = dmg(c.raw); a.hitstun = c.hitstun; a.pushX = c.knockbackX; a.launchY = c.knockbackY ?? a.launchY; m.clean = false; m.blocked = false }
  }
  if (m.key === 'gTalon' && t === 8) { f.vy = -16; f.vx = 0; f.onGround = false; f.grounded = false; f.jumpCount = Math.max(1, f.jumpCount || 0); s.airborne = true }
  if (m.key === 'gTalon' && t >= 8) { f.vx = 0; f.x = Math.max(0, Math.min(sw(W) - f.w, s.riseX + m.dir * Math.min(30, (t - 8) * 3))) }
  // DESCENDING FANG: hang through startup, then a capped straight descent (no bounce, clamped to the stage).
  if (m.key === 'gFang') {
    if (t < md.startup) { f.vx = 0; f.vy = 0 }
    else { f.vy = FANG.descendVy; f.vx = m.dir * FANG.vx; f.x = Math.max(0, Math.min(sw(W) - f.w, f.x)) }
  }
  // DRAGON EDGE (note): a separate visible energy burst leaves the blade tip after the cut.
  if (m.key === 'gEdge' && m.note && !m.fired && t >= EDGE_FOLLOW.at) { m.fired = 1; fireEdgeBurst(f, W, m.dir) }
  // EMERALD PULSE: the shot leaves on the first active frame; the note queues a second shot after a visible delay.
  if (m.key === 'gPulse' && !m.fired && t >= a.activeStart) {
    m.fired = 1; firePulse(f, W, 0, m.dir)
    if (m.note) s.pulse2 = { at: s.clock + PULSE.secondDelay, dir: m.dir }
  }
}
function breakCall(f, s) { s.stats.callsBroken++; cue(f, 'callBroken'); s.call = null }
function firePulse(f, W, k, dir) {
  const s = greenState(f), art = GREEN_RANGER_FX[k ? 'pulseDisc' : 'pulseShot'], sc = 1.85
  const pr = W?.spawn?.(f, 'green_pulse', { damage: dmg(38), speed: PULSE.speed, vx: dir * PULSE.speed, vy: 0,
    spawnX: ctrX(f) + dir * 70, spawnY: f.y + (f.h || 94) * 0.38, w: PULSE.w, h: PULSE.h, radius: PULSE.h / 2, lifetime: PULSE.lifetime,
    hitstun: PULSE.hitstun, knockbackX: PULSE.knockbackX, knockbackY: PULSE.knockbackY, isSpecial: true, category: 'special',
    sheet: artSrc(f, k ? 'pulseDisc' : 'pulseShot'), spriteFrames: 1, spriteW: art.w, spriteH: art.h, spriteScale: sc })
  if (pr) { pr.damageType = 'energy'; pr._green = { kind: 'pulse', k, n: s.serial }; pr.noReflectArt = true; s.stats.pulseShots++ }
  cue(f, k ? 'pulse2' : 'pulse')
}
function fireEdgeBurst(f, W, dir) {
  const s = greenState(f), art = GREEN_RANGER_FX.ringBurst
  const pr = W?.spawn?.(f, 'green_edge_burst', { damage: dmg(EDGE_FOLLOW.raw), speed: EDGE_FOLLOW.speed, vx: dir * EDGE_FOLLOW.speed, vy: 0,
    spawnX: ctrX(f) + dir * 128, spawnY: f.y + (f.h || 94) * 0.42, w: EDGE_FOLLOW.w, h: EDGE_FOLLOW.h, radius: EDGE_FOLLOW.w / 2, lifetime: EDGE_FOLLOW.lifetime,
    hitstun: EDGE_FOLLOW.hitstun, knockbackX: 3, knockbackY: -1, isSpecial: true, category: 'special',
    sheet: artSrc(f, 'ringBurst'), spriteFrames: 1, spriteW: art.w, spriteH: art.h, spriteScale: 1.6 })
  if (pr) { pr.damageType = 'energy'; pr._green = { kind: 'edge', n: s.serial }; s.stats.edgeBursts++ }
  cue(f, 'edgeBurst')
}

// Ultimate pose hook (called by the shared cinematic each frame): a NON-hitting currentAttack whose timer the
// cinematic advances so Green's call / watch / signal strips play.
function ultPose(f, beat, fr) {
  const move = beat === 'signal' ? 'ultSignal' : fr < 24 ? 'gUlt' : 'ultWatch', total = 999
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total, timer: total - fr, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, gm: null, _ultPose: true }
}
export { updateZordUltCine as updateGreenUlt, clearZordUltCine as clearGreenUlt }
