// Elastigirl (elastigirl) — COMMAND LAYER. Press edges + the direction history come from tickElastigirl
// (readRawControls), so keyboard, pad, replay and LAN feed the same reader. Returns 'consumed' | 'grab'.
// Precedence (top first): stun → Slingshot / Parachute own the body → committed move (only clean-hit cancels) →
// Special (motion inputs, held-direction fallbacks) → Up-Attack → Light → Heavy → the engine's grab / block.
import { startMove, cancelWindowOpen } from './combat.js'
import { isElastigirl, egState, startEgMove, registerElastigirlEngine, startSling, slingLegal } from './elastigirlState.js'
import { NORMAL_CANCELS, MAX_JABS } from './elastigirlData.js'

registerElastigirlEngine({ startMove })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const normalFor = (k, e, g) => !g ? 'air' : k === 'upAttack' ? 'up' : k === 'light' ? (e.down ? 'eLow' : 'light') : 'heavy'

function special(f, s, W, g, cancel) {
  const e = s.edges.special; use(s, 'special')
  if (!g && e.up) return startSling(f)
  s.stats.rejects++; s.cues.push('reject'); return false
}

export function updateElastigirlCommandCombat(f, inp, opp, W) {
  if (!isElastigirl(f)) return false
  const s = egState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0) return 'consumed'
  if (s.sling || s.para) return 'consumed'
  if (a) {
    const m = a.eg
    if (!m || !m.clean || !cancelWindowOpen(f)) return 'consumed'
    // NORMAL → NORMAL on a clean hit (recovery only)
    const into = NORMAL_CANCELS[m.key]
    if (into) for (const k of ['upAttack', 'light', 'heavy']) {
      if (!fresh(s, k)) continue
      const next = normalFor(k, s.edges[k], g)
      if (!into.includes(next) || (next === 'light' && (m.jabs || 1) >= MAX_JABS)) continue
      use(s, k); const jabs = (m.jabs || 1) + (next === 'light' ? 1 : 0)
      if (startEgMove(f, next, W, { cancel: true })) { f.currentAttack.eg.jabs = jabs; s.stats.chains++ }
      return 'consumed'
    }
    if (m.key === 'air' && fresh(s, 'special') && s.edges.special.up && slingLegal(f)) { use(s, 'special'); f.attacking = false; f.currentAttack = null; f.currentMove = null; startSling(f); return 'consumed' }
    return 'consumed'
  }
  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (fresh(s, 'special')) { special(f, s, W, g, false); return 'consumed' }
  for (const k of ['upAttack', 'light', 'heavy']) {
    if (!fresh(s, k)) continue
    use(s, k); for (const o of ['upAttack', 'light', 'heavy']) if (o !== k && fresh(s, o)) use(s, o)
    startEgMove(f, normalFor(k, s.edges[k], g), W)
    return 'consumed'
  }
  return 'grab'
}
