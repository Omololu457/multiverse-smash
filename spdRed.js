// spdRed.js — S.P.D. Red Ranger command layer. Called from game.js once per sim frame (1v1 + FFA) after tickSpdRed
// recorded the raw press edges + direction history. It OWNS his attack inputs: returns 'consumed' when it started /
// continued something, 'grab' to let only the shared grab/throw run, or false (hit/block-stun: the engine's path).
//
// Buttons: A = Light, B = Heavy (the sheet's A / B), Special, Ultimate. Motions are facing-relative numpad strings.
//   Jab A · Straight A,A (or →+A) · Kick B (or A,A,A) · Heavy kick →+B (launches) · Low kick ↓+A · Rising kick ↑+B / Up-Attack
//   Acrobatic flip ←+B · Wake-up reversal ↓+B (or any attack on the wake-up frames) · Air kick air A/B (air ↓ = flip kick)
//   DELTA BLASTER ↓+Special (air too; neutral Special too) · RAPID FIRE keep it held · DELTA CHARGE →→+Special
//   PHASE STRIKE ↓↘→+Special · SKY UPPERCUT ↑+Special · DELTAMAX STRIKE ↓↙←+Special
//   SUPER ↓↘→↓↘→+Special or Ultimate (100 Delta) · JUDGMENT A+B+Special together (meter full)
//   BLINK = double-tap ←/→ (rangers.js). Blink-cancels: Delta Charge on hit/block, Sky Uppercut's airborne recovery.
import { startMove } from './combat.js'
import { spawnProjectile, activeProjectiles } from './abilities.js'
import { SPD_RED_MOVES } from './spdRedData.js'
import { isSpdRed, spdRedState, spdRedStartMove, registerSpdRedStartMove, registerSpdRedProjectiles, rcue, recentMotion, deltaBlocked, boltCount, SPD_BOLT_POOL } from './spdRedState.js'
import { judgmentReady, judgmentBegin, isBlinking, refundBlink, startBlink, canBlink } from './rangers.js'

const CHORD = 4   // ticks: the three buttons of a chord must all go down within this window
registerSpdRedStartMove(startMove)
registerSpdRedProjectiles({ spawn: spawnProjectile, list: activeProjectiles })
const R_START = (f, key) => spdRedStartMove(f, key, startMove)

const live = (s, k, win) => s.edgeAt[k] != null && s.used[k] !== s.edgeAt[k] && s.tick - s.edgeAt[k] <= win
const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }
export const chordJudgment = s => live(s, 'light', CHORD) && live(s, 'heavy', CHORD) && live(s, 'special', CHORD)

export function tryJudgment(f, s, opp) {
  if (!chordJudgment(s) || !opp || !judgmentReady(f)) return false
  const a = f.attacking ? f.currentAttack : null
  if (a) {   // cancel a just-started normal (the chord's first button already started it) or a connected one
    const t = a.total - a.timer
    if (a.isUltimate || a.name === 'sJudge' || !(t <= 4 || (a.hasHit && !SPD_RED_MOVES[a.name]?.isSpecial))) return false
    if (SPD_RED_MOVES[a.name]?.isSpecial && t <= 4) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + (SPD_RED_MOVES[a.name].cost || 0))   // the chord's Special started first: refund it
  }
  if (!R_START(f, 'sJudge')) return false
  use(s, 'light', 'heavy', 'special')
  judgmentBegin(f, opp)
  return true
}

const BUFFER = 8
// Buffered press on the SIM clock (pauses in hitstop), so a button pressed in the hit-freeze still cancels after it.
function fresh(s, k, win = BUFFER) { const at = s.edgeAt[k]; return at != null && s.used[k] !== at && s.clock - (s.edgeClk[k] ?? -1e9) <= win }
// A buffered press reads the direction held at its press edge, not the (possibly released) current one.
function pressDir(s, b, inp, facing) {
  const t = s.edgeDir?.[b]
  if (t == null || s.edgeAt[b] === s.tick) return inp
  const fk = facing === -1 ? 'left' : 'right', bk = facing === -1 ? 'right' : 'left'
  return { ...inp, down: t <= 3, up: t >= 7, [fk]: t % 3 === 0, [bk]: t % 3 === 1 }
}
function hasMotion(s, pat, win) { const str = recentMotion(s, win); let i = 0; for (const c of str) if (c === pat[i]) { i++; if (i === pat.length) return true } return false }
// Normal → normal gatlings on contact (hit OR block).
const GATLING = { light: ['sStraight', 'sLow', 'sKick', 'heavy', 'up'], sStraight: ['sKick', 'heavy', 'up'], sLow: ['sStraight', 'heavy', 'up'], sKick: ['heavy', 'up'] }
function normalFor(f, inp, button, grounded) {
  const fwd = f.facing === -1 ? inp.left : inp.right, back = f.facing === -1 ? inp.right : inp.left
  if (!grounded) return inp.down ? 'down_air' : 'air'
  if (button === 'upAttack') return 'up'
  if (button === 'light') return inp.down ? 'sLow' : fwd ? 'sStraight' : 'light'
  if (inp.up) return 'up'
  if (inp.down) return 'sWake'
  if (back) return 'sFlip'
  if (fwd) return 'heavy'
  return 'sKick'
}
// →→ (forward double-tap) within the last few ticks — the rangers.js stamp, even when no blink could start
const fwdDoubleTap = (f, win = 4) => { const r = f._ranger; return !!(r && r.pendingAt != null && r.tick - r.pendingAt <= win && r.pending?.dir === (f.facing || 1) && !r.pending.vdir) }
export function canDo(f, key) {
  const md = SPD_RED_MOVES[key]; if (!md) return false
  if (key === 'sSuper') return (f.energy || 0) >= 100 && !deltaBlocked(f)
  if ((md.cost || 0) > (f.energy || 0)) return false
  if ((key === 'sBlaster' || key === 'sBlasterAir') && boltCount(f) >= SPD_BOLT_POOL) return false   // at most 4 bolts on screen
  return true
}
function specialFor(f, s, button, inp, grounded) {
  if (button === 'ultimate') return 'sSuper'
  if (hasMotion(s, '236236', 40)) return 'sSuper'
  if (hasMotion(s, '236', 16)) return grounded ? 'sPhase' : null
  if (hasMotion(s, '214', 16)) return grounded ? 'sDeltamax' : null
  if (fwdDoubleTap(f)) return grounded ? 'sCharge' : null
  if (inp.up) return 'sUpper'
  return grounded ? 'sBlaster' : 'sBlasterAir'   // ↓+Special (and neutral Special) = DELTA BLASTER
}
function trySpecial(f, s, inp, grounded) {
  for (const b of ['ultimate', 'special']) {
    if (!fresh(s, b)) continue
    const key = specialFor(f, s, b, pressDir(s, b, inp, f.facing), grounded)
    use(s, b)
    if (!key) return true
    if (canDo(f, key) && R_START(f, key)) { rcue(f, key === 'sSuper' ? 'superStart' : 'special'); return true }
    return true   // a failed Special / Ultimate press is still eaten (no engine fallback special for him)
  }
  return false
}
const CUE = { light: 'swingLight', sStraight: 'swingLight', sKick: 'swing', heavy: 'swing', sLow: 'swing', up: 'swing', air: 'swing', down_air: 'swing', sFlip: 'flip', sWake: 'swing' }

export function updateSpdRedCommandCombat(f, inp, opp, ctx = {}) {
  if (!isSpdRed(f)) return false
  const s = spdRedState(f), r = f._ranger
  const grounded = !!(f.onGround || f.grounded)
  // →→+Special: the double-tap already started a blink — while it is still in its wind-up, take the charge back and
  // turn it into DELTA CHARGE instead
  if (isBlinking(f)) {
    if (fresh(s, 'special', 4) && fwdDoubleTap(f) && grounded && canDo(f, 'sCharge') && refundBlink(f)) {
      use(s, 'special'); if (R_START(f, 'sCharge')) { rcue(f, 'special'); return 'consumed' }
    }
    return 'consumed'   // mid-blink: no attacks (the blink owns him for 11 frames)
  }
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0) || f.knockdownState) return false
  if (tryJudgment(f, s, opp)) { rcue(f, 'judge'); return 'consumed' }
  const a = f.attacking ? f.currentAttack : null
  if (a) {
    const t = a.total - a.timer, md = SPD_RED_MOVES[a.name] || {}, g = a.sr || {}
    const contact = a.hasHit && !g.noHit && t >= (a.activeStart ?? 0)
    // BLINK-CANCELS (cost a charge): Delta Charge on hit / block, Sky Uppercut's airborne recovery
    // (the double-tap is buffered BUFFER sim frames — it often lands in the hit-freeze, when this layer doesn't run — used once)
    if (g.blinkCancel && r && s.tapId != null && s.tapId === r.pendingAt && s.clock - s.tapClk <= BUFFER && s.usedTap !== s.tapId && !r.pending?.vdir) {
      const ok = (g.blinkCancel === 'contact' && a.hasHit) || (g.blinkCancel === 'air' && !grounded && t >= (a.activeEnd ?? md.startup + md.active))
      if (ok && canBlink(f, { cancel: true }) && startBlink(f, r.pending.dir, 0, { cancel: true })) { s.usedTap = s.tapId; rcue(f, 'blinkCancel'); return 'consumed' }
    }
    if (contact && !md.isSpecial && !a.isUltimate) {
      if (trySpecial(f, s, inp, grounded)) return 'consumed'   // special / Super cancel out of a connected normal
      for (const b of ['light', 'heavy', 'upAttack']) {
        if (!fresh(s, b) || !grounded) continue
        let next = normalFor(f, pressDir(s, b, inp, f.facing), b, grounded)
        if (a.name === 'light' && next === 'light') next = 'sStraight'        // A, A
        if (a.name === 'sStraight' && (next === 'light' || next === 'sStraight')) next = 'sKick'   // A, A, A
        if (!(GATLING[a.name] || []).includes(next)) continue
        use(s, b)
        if (R_START(f, next)) { rcue(f, CUE[next] || 'swing'); return 'consumed' }
      }
    }
    return a.sr || SPD_RED_MOVES[a.name] ? 'consumed' : false
  }
  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (trySpecial(f, s, inp, grounded)) return 'consumed'
  // WAKE-UP REVERSAL: any attack button on the wake-up frames
  if (s.wake > 0 && grounded && (fresh(s, 'light') || fresh(s, 'heavy'))) { use(s, 'light', 'heavy'); if (R_START(f, 'sWake')) { rcue(f, 'swing'); return 'consumed' } }
  if (fresh(s, 'upAttack') && grounded) { use(s, 'upAttack'); if (R_START(f, 'up')) { rcue(f, 'swing'); return 'consumed' } }
  for (const b of ['light', 'heavy']) {
    if (!fresh(s, b)) continue
    const key = normalFor(f, pressDir(s, b, inp, f.facing), b, grounded)
    use(s, b)
    if (R_START(f, key)) { rcue(f, CUE[key] || 'swing'); return 'consumed' }
  }
  return 'grab'
}
