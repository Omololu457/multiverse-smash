// DSEYL (dseyl) — FLASH TIME. Reuses the shared game.js time-slow engine (_oppTimeScaleOf → the foe frame-skip
// accumulator in _updateGodspeedTimeSlow), plugged in exactly the way the Flash and Dash Parr are. Guard + Special.
// 40 Power from the SAME bar as the drones; the opponent runs at 50 % for exactly 180 sim frames; then a 600-frame
// cooldown. Dseyl himself is NOT sped up. Not during his ultimate, not while the opponent is already slowed.
// State: f._dseyl.ft (inside GAME_STATE via the game.js snapshot line). No RNG, no wall clock. No-op for anyone else.
import { DSEYL_KEY, DSEYL_FLASH } from './dseylData.js'

const isDs = f => f?.rosterKey === DSEYL_KEY
const ftState = f => f._dseyl.ft ||= { left: 0, cd: 0, uses: 0, rejects: 0, frames: 0, lastReject: null }

// game.js _oppTimeScaleOf: the fraction of normal speed Dseyl imposes on his foe (0 = not slowing).
export function dseylOppTimeScale(user) { return isDs(user) && (user._dseyl?.ft?.left || 0) > 0 ? DSEYL_FLASH.oppSlow : 0 }
export const dseylFlashTimeActive = f => dseylOppTimeScale(f) > 0

// Guard + Special (command layer). Every check happens BEFORE anything is spent.
export function tryDseylFlashTime(f, opp, { ultActive = false } = {}) {
  if (!isDs(f) || !f._dseyl) return false
  const p = ftState(f)
  const why = ultActive || f.currentAttack?.isUltimate ? 'ult'
    : p.left > 0 ? 'active'
    : p.cd > 0 ? 'cooldown'
    : opp && (opp._timeSlowFlag || (opp._timeSlowAcc || 0) > 0) ? 'foeSlowed'
    : (f.energy || 0) < DSEYL_FLASH.cost ? 'energy'
    : f.health <= 0 || f.hitstun > 0 || f.isGrabbed || f.knockdownState ? 'busy' : null
  if (why) { p.rejects++; p.lastReject = why; f._dseyl.cues?.push('reject'); return false }
  f.energy = Math.max(0, (f.energy || 0) - DSEYL_FLASH.cost)
  p.left = DSEYL_FLASH.frames; p.uses++
  f._dseyl.cues?.push('zero')                                               // Syndrome's Zero-Point chime, by reference
  return true
}

// Called from tickDseyl every sim frame, BEFORE its hitstop early-return → the window is 180 real frames.
export function tickDseylFlashTime(f, opp) {
  if (!isDs(f) || !f._dseyl) return
  const p = ftState(f)
  if (p.left > 0) { p.left--; p.frames++; if (p.left === 0) p.cd = DSEYL_FLASH.cooldown }
  else if (p.cd > 0) p.cd--
  if (p.left > 0 && (f.health <= 0 || (opp && opp.health <= 0))) { p.left = 0; p.cd = DSEYL_FLASH.cooldown }
}
