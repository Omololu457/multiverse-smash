// Elastigirl (elastigirl) — COMMAND LAYER. Press edges + the direction history come from tickElastigirl
// (readRawControls), so keyboard, pad, replay and LAN feed the same reader. Returns 'consumed' | 'grab'.
// Precedence (top first): stun → Slingshot / Parachute own the body → committed move (only clean-hit cancels) →
// Ultimate → Special (motion inputs, held-direction fallbacks) → Up-Attack → Light → Heavy → the engine's grab / block.
// SPECIAL (L / R1) motions, facing-relative numpad: 236236 Family Raft · 623 Whirl Kick · 412 Overhead Whip ·
// 236 Long Arm · 252 Parachute Drop. Without a motion the held direction picks: fwd Long Arm · back Whip · down
// Parachute · neutral Whirl. Air: ↑ Slingshot · ↓ / 252 Parachute float · otherwise Whirl Kick.
// The ULTIMATE button (U / R2) is also accepted for Family Raft (100 Elasticity, grounded).
import { startMove, cancelWindowOpen } from './combat.js'
import { isElastigirl, egState, startEgMove, registerElastigirlEngine, startSling, slingLegal, startParachute, motionMatch } from './elastigirlState.js'
import { NORMAL_CANCELS, MAX_JABS, SPECIAL_FROM, ULT_FROM, EG_INPUTS as I } from './elastigirlData.js'

registerElastigirlEngine({ startMove })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const normalFor = (k, e, g) => !g ? 'air' : k === 'upAttack' ? 'up' : k === 'light' ? (e.down ? 'eLow' : 'light') : 'heavy'

// which special a Special press means (motion first, then the held direction)
export function pickSpecial(s, g, e = s.edges.special) {
  const c = e.clock
  if (g && motionMatch(s, I.ult.motion, I.ult.win, c)) return 'ult'
  if (motionMatch(s, I.eWhirl.motion, I.eWhirl.win, c)) return 'eWhirl'
  if (g && motionMatch(s, I.eWhip.motion, I.eWhip.win, c)) return 'eWhip'
  if (g && motionMatch(s, I.eLongArm.motion, I.eLongArm.win, c)) return 'eLongArm'
  if (motionMatch(s, I.eDome.motion, I.eDome.win, c)) return 'eDome'
  const F = I.fallback
  if (!g) return e.up ? 'sling' : e.down ? 'eDome' : 'eWhirl'
  return e.fwd ? F.fwd : e.back ? F.back : e.down ? F.down : F.neutral
}
function fireSpecial(f, s, W, g, k, cancel) {
  if (k === 'sling') { if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null } return startSling(f) }
  if (k === 'eDome' && !g) { if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null } return startParachute(f) }
  if (k === 'ult') return startEgMove(f, 'eUlt', W, { cancel })
  return startEgMove(f, k, W, { cancel, free: k === 'eLongArm' && s.freeArm > 0 })
}

export function updateElastigirlCommandCombat(f, inp, opp, W) {
  if (!isElastigirl(f)) return false
  const s = egState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0) return 'consumed'
  if (s.sling || s.para) return 'consumed'
  if (a) {
    const m = a.eg
    if (!m || !m.clean || !cancelWindowOpen(f)) return 'consumed'
    // NORMAL → ULTIMATE / SPECIAL / NORMAL on a clean hit (recovery only)
    if (g && ULT_FROM.includes(m.key) && (fresh(s, 'ultimate') || (fresh(s, 'special') && pickSpecial(s, g) === 'ult'))) {
      for (const k of ['ultimate', 'special']) if (fresh(s, k)) use(s, k)
      fireSpecial(f, s, W, g, 'ult', true); return 'consumed'
    }
    if (SPECIAL_FROM.includes(m.key) && fresh(s, 'special')) {
      const k = pickSpecial(s, g); use(s, 'special')
      if (k !== 'ult' && (k !== 'sling' || slingLegal(f, true))) { if (fireSpecial(f, s, W, g, k, true)) s.stats.chains++ }
      return 'consumed'
    }
    const into = NORMAL_CANCELS[m.key]
    if (into) for (const k of ['upAttack', 'light', 'heavy']) {
      if (!fresh(s, k)) continue
      const next = normalFor(k, s.edges[k], g)
      if (!into.includes(next) || (next === 'light' && (m.jabs || 1) >= MAX_JABS)) continue
      use(s, k); const jabs = (m.jabs || 1) + (next === 'light' ? 1 : 0)
      if (startEgMove(f, next, W, { cancel: true })) { f.currentAttack.eg.jabs = jabs; s.stats.chains++ }
      return 'consumed'
    }
    return 'consumed'
  }
  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (fresh(s, 'ultimate')) {   // the Ultimate button owns its press (consumed even when illegal: grounded, 100 Elasticity)
    use(s, 'ultimate')
    if (!(g && fireSpecial(f, s, W, g, 'ult', false))) { s.stats.rejects++; s.cues.push('reject') }
    return 'consumed'
  }
  if (fresh(s, 'special')) {
    const k = pickSpecial(s, g); use(s, 'special')
    if (k === 'ult' && (f.energy || 0) < 100) { startEgMove(f, I.fallback.fwd, W); return 'consumed' }   // 236236 without the bar → Long Arm
    fireSpecial(f, s, W, g, k, false)
    return 'consumed'
  }
  for (const k of ['upAttack', 'light', 'heavy']) {
    if (!fresh(s, k)) continue
    use(s, k); for (const o of ['upAttack', 'light', 'heavy']) if (o !== k && fresh(s, o)) use(s, o)
    startEgMove(f, normalFor(k, s.edges[k], g), W)
    return 'consumed'
  }
  return 'grab'
}
