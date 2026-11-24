// Violet Parr (violet) — COMMAND LAYER. Press edges + direction tokens come from tickViolet (readRawControls), so keyboard,
// pad, replay and LAN feed the same reader. Returns 'consumed' | 'grab' | false (false = not Violet).
// Directions are facing-relative (numpad: 6 = forward). P = Special. The motion is classified on the press frame.
//   Light: Jab (↓ = Low) · Heavy: Heavy · Up-Attack: Launcher · any normal in the air: Air
//   ↓↘→ + P      FORCE PUSH (12)        ←↙↓ + P   BUBBLE SHIELD (20)      → → + P   FORCE BALL (15)
//   ↓↙← + P      FIELD TRAP (22)        ↓↓ + P    VANISH toggle (15)       P alone   FORCE PUSH
//   ↓↘→↓↘→ + P or Ultimate             FULL FORCE (100)
//   ← ← + Light   PHASE STEP (free; i-frames 3–12; 5 s cooldown)    Bubble Shield: 6 s cooldown
// Cancels (clean hit, recovery): Jab → Jab (once) / Low / Heavy / Launcher · Low → Heavy / Launcher · Heavy → Launcher ·
// any grounded normal → specials / FULL FORCE · a clean Launcher can be jump-cancelled (violetState.violetLocked).
import { startMove, cancelWindowOpen, getComboScale, getComboHitstunScale } from './combat.js'
import { isViolet, vState, freshEdge, useEdge, doubleDownSpecial, enterVanish, endVanish, registerVioletEngine, startVMove, rejectV } from './violetState.js'
import { CHAIN, SPECIAL_FROM, DEFENSE, MOTION } from './violetData.js'

import { startVioletCine } from './violetUlt.js'   // FULL FORCE frozen cinematic (registers itself with cineRegistry.js)
registerVioletEngine({ startMove, comboScale: getComboScale, hitstunScale: typeof getComboHitstunScale === 'function' ? getComboHitstunScale : null, ultStart: startVioletCine })

const phaseStepInput = s => { const [a, b] = s.backTaps || [], e = s.edges.light
  return (s.backTaps || []).length === 2 && b - a <= DEFENSE.phaseTap && e.tick >= b && e.tick - b <= MOTION.press }
const COMMITTED = new Set(['vPush', 'vShield', 'vBall', 'vTrap', 'vUlt', 'vPhase', 'air'])
const SPECIAL_OF = { push: 'vPush', shield: 'vShield', ball: 'vBall', trap: 'vTrap', ult: 'vUlt' }

// Special press → move key (or 'vanish'). ↓↓ wins over a stray single-step motion only when no full motion matched.
function specialKey(s) {
  const m = s.edges.special.motion
  if (m === 'ult') return 'vUlt'
  if (!m && doubleDownSpecial(s)) return 'vanish'
  return SPECIAL_OF[m] || 'vPush'
}
function doSpecial(f, s, W, opp, cancel) {
  useEdge(s, 'special')
  const k = specialKey(s)
  if (k === 'vanish') { if (s.inv) endVanish(f, 'toggle', W); else enterVanish(f, W); return }
  startVMove(f, k, W, opp, { cancel })
}
function normalKey(s, f, k) {
  const g = !!(f.onGround || f.grounded), e = s.edges[k]
  if (!g) return 'air'
  if (k === 'upAttack') return 'up'
  if (k === 'light') return e.down ? 'vLow' : 'light'
  return 'heavy'
}

export function updateVioletCommandCombat(f, inp, opp, W) {
  if (!isViolet(f)) return false
  const s = vState(f), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0) return 'consumed'
  if (a && COMMITTED.has(a.vi?.key)) return 'consumed'
  // ── clean-hit cancels (recovery window) ──
  if (a?.vi?.clean && cancelWindowOpen(f)) {
    const from = a.vi.key
    if (SPECIAL_FROM.includes(from) && freshEdge(s, 'ultimate')) { useEdge(s, 'ultimate'); startVMove(f, 'vUlt', W, opp, { cancel: true }); return 'consumed' }
    if (SPECIAL_FROM.includes(from) && freshEdge(s, 'special')) {
      if (specialKey(s) === 'vanish') { useEdge(s, 'special'); rejectV(f, W); return 'consumed' }   // no Vanish out of a string
      doSpecial(f, s, W, opp, true); return 'consumed'
    }
    for (const k of ['upAttack', 'heavy', 'light']) {
      if (!freshEdge(s, k)) continue
      const to = normalKey(s, f, k)
      if (!(CHAIN[from] || []).includes(to)) continue
      if (from === 'light' && to === 'light' && a.vi.chain >= 1) continue   // Jab → Jab once (no jab loop)
      useEdge(s, k)
      if (startVMove(f, to, W, opp, { cancel: true, chain: a.vi.chain + 1 })) s.stats.chains++
      return 'consumed'
    }
  }
  if (a) return 'consumed'
  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (freshEdge(s, 'ultimate')) { useEdge(s, 'ultimate'); startVMove(f, 'vUlt', W, opp); return 'consumed' }
  if (freshEdge(s, 'special')) { doSpecial(f, s, W, opp, false); return 'consumed' }
  // PHASE STEP ←←+Light (back-step, i-frames 3–12, 5 s cooldown) — takes the Light press when the double-back is fresh
  if (freshEdge(s, 'light') && phaseStepInput(s)) { useEdge(s, 'light'); startVMove(f, 'vPhase', W, opp); return 'consumed' }
  for (const k of ['upAttack', 'light', 'heavy']) {
    if (!freshEdge(s, k)) continue
    useEdge(s, k)
    startVMove(f, normalKey(s, f, k), W, opp)
    return 'consumed'
  }
  return 'grab'
}
