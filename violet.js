// Violet Parr (violet) — COMMAND LAYER. Press edges come from tickViolet (readRawControls), so keyboard, pad, replay and LAN
// feed the same reader. Returns 'consumed' | 'grab' | false (false = fall through to the shared engine path).
//   ↓↓ + Special      VANISH toggle (enter: 15 Force Field, 8 s cooldown after it ends; press again to reappear)
import { isViolet, vState, freshEdge, useEdge, doubleDownSpecial, enterVanish, endVanish } from './violetState.js'

export function updateVioletCommandCombat(f, inp, opp, W) {
  if (!isViolet(f)) return false
  const s = vState(f)
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0) return 'consumed'
  if (freshEdge(s, 'special') && doubleDownSpecial(s)) {
    useEdge(s, 'special')
    if (s.inv) endVanish(f, 'toggle', W); else enterVanish(f, W)
    return 'consumed'
  }
  return false
}
