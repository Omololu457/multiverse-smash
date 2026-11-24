// Violet Parr (violet) — RENDER-ONLY view of the sim state for sprite.js (no state writes). While invisible: R7 fade-out
// (vanish) → R11 invisible stance / walk → R9 invisible crouch, all drawn at 35 % alpha; on exit R12 fades her back in.
// Attacks / jumps / hurt keep their own strips (at 35 % while invisible).
import { VANISH } from './violetData.js'
// Vanish 35 %; Phase Step i-frames 55 % (she half-phases out of sight); render-only reads of sim flags
// FULL FORCE cinematic: cineA (violetUlt.js) fades her out / shimmers / flickers her back in
export const violetAlpha = f => f?.rosterKey !== 'violet' || !f._violet ? 1 : f._violet.cineA != null ? f._violet.cineA : f._violet.inv ? VANISH.alpha : f._violet.phaseInv ? 0.55 : 1
export function violetSpriteAction(f, act) {
  if (f?.rosterKey !== 'violet' || !f._violet) return act
  const s = f._violet
  if (s.inv) {
    if (act === 'idle') return s.inv.t < VANISH.fadeOut ? 'vanish' : 'inv_idle'
    if (act === 'walk' || act === 'walk_back' || act === 'run' || act === 'dash') return 'inv_walk'
    if (act === 'crouch' || act === 'guard') return 'inv_crouch'
    return act
  }
  if (s.reappear > 0 && act === 'idle') return 'reappear'
  return act
}
