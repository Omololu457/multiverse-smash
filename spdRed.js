// spdRed.js — S.P.D. Red Ranger command layer. Called from game.js once per sim frame (1v1 + FFA) after tickSpdRed
// recorded the raw press edges + direction history. Returns 'consumed' when it started / continued something,
// 'grab' to let only the shared grab/throw run, or false to fall through to the engine's normal path.
//
// Buttons: A = Light, B = Heavy (the sheet's A / B), Special, Ultimate. The double-tap BLINK is owned by rangers.js.
//   JUDGMENT: A + B + Special together (chord within 4 ticks) when the meter is full — from neutral, or cancelling a
//   just-started (≤ 4 f) or connected normal.
import { startMove } from './combat.js'
import { SPD_RED_MOVES } from './spdRedData.js'
import { isSpdRed, spdRedState, spdRedStartMove, registerSpdRedStartMove, rcue } from './spdRedState.js'
import { judgmentReady, judgmentBegin, isBlinking } from './rangers.js'

const CHORD = 4   // ticks: the three buttons of a chord must all go down within this window
registerSpdRedStartMove(startMove)
const R_START = (f, key) => spdRedStartMove(f, key, startMove)

const live = (s, k, win) => s.edgeAt[k] != null && s.used[k] !== s.edgeAt[k] && s.tick - s.edgeAt[k] <= win
const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }
export const chordJudgment = s => live(s, 'light', CHORD) && live(s, 'heavy', CHORD) && live(s, 'special', CHORD)

export function tryJudgment(f, s, opp) {
  if (!chordJudgment(s) || !opp || !judgmentReady(f)) return false
  const a = f.attacking ? f.currentAttack : null
  if (a) {   // cancel a just-started normal (the chord's first button already started it) or a connected one
    const t = a.total - a.timer
    if (SPD_RED_MOVES[a.name]?.isSpecial || a.isUltimate || !(t <= 4 || a.hasHit)) return false
  }
  if (!R_START(f, 'sJudge')) return false
  use(s, 'light', 'heavy', 'special')
  judgmentBegin(f, opp)
  return true
}

export function updateSpdRedCommandCombat(f, inp, opp, ctx = {}) {
  if (!isSpdRed(f)) return false
  const s = spdRedState(f)
  if (isBlinking(f)) return 'consumed'   // mid-blink: no attacks (the blink owns him for 11 frames)
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0)) return false
  if (tryJudgment(f, s, opp)) { rcue(f, 'judge'); return 'consumed' }
  if (f.attacking && f.currentAttack?.sr) return 'consumed'   // his own scripted moves run to the end
  return false
}
