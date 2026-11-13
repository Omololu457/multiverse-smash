// zoro.js — Roronoa Zoro command layer. Called from game.js once per sim frame (1v1 + FFA) after tickZoro
// recorded the raw press edges. Returns 'consumed' when Zoro's layer handled the frame (engine normals are
// skipped), 'grab' to let only the shared grab run, or false to fall through to the engine default path.
import { startMove } from './combat.js'
import { isZoro, zoroState, enterSantoryu, SANTORYU } from './zoroState.js'

const LENIENCY = 3   // A+B: both press edges within 3 frames of each other

// Santoryu activation pose: no hitbox, 22f committed (R3F1 draw → R7F1 sword to the mouth).
export const ZORO_SANTO_MOVE = { damage: 0, startup: 10, active: 1, recovery: 11, frameExact: true, hitstun: 0, rangeX: 1, rangeY: 1 }

function santoryuPressed(s) {
  const a = s.edgeAt.special, b = s.edgeAt.heavy
  if (a == null || b == null || !s.prev.special || !s.prev.heavy) return false
  return Math.abs(a - b) <= LENIENCY && Math.max(a, b) === s.tick
}

function fireSanto(f) {
  if (!startMove(f, 'zSanto', ZORO_SANTO_MOVE)) return false
  f.currentMove = 'zSanto'; f.currentAttack.lf = { noHit: true }; f.currentAttack.hasHit = true
  f.vx = 0; f.isBlocking = false
  return enterSantoryu(f)
}

export function updateZoroCommandCombat(f, inputState, opp, ctx = {}) {
  if (!isZoro(f)) return false
  const s = zoroState(f)
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0)) return false
  const grounded = !!(f.onGround || f.grounded)

  // A+B → SANTORYU. A staggered press may cancel the first ≤3 frames of the Heavy / Special it started.
  if (grounded && santoryuPressed(s) && !s.santoryu && s.santoryuCd <= 0 && (f.energy || 0) >= SANTORYU.cost) {
    const a = f.currentAttack
    if (f.attacking && a && (a.name === 'heavy' || a.isSpecial) && !a.hasHit && a.total - a.timer <= LENIENCY) {
      f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0
    }
    if (!f.attacking && fireSanto(f)) return 'consumed'
  }
  return false
}
