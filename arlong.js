// arlong.js — Arlong command layer. Called from game.js once per sim frame (1v1 + FFA) after tickArlong recorded
// the raw press edges + direction history. It OWNS Arlong's attack inputs: returns 'consumed' when it started /
// continued something, or 'grab' to let only the shared grab/throw run.
//
// Buttons: L = Light, B = Heavy, A = Special. Motions are facing-relative numpad strings (2 = ↓, 3 = ↘, 6 = →, 4 = ←).
//   Jab L · Fishman straight L,L (or →+L) · Low saw ↓+L
//   Kiribachi swing H · Heavy saw arc ↓+H (launches) · Rising claw ↑+H / Up-Attack · Wake-up reversal ←+H
//   →+H = BITE when close (else Lunge punch) · Air saw air L/H (air ↓ = nose dive)
import { startMove } from './combat.js'
import { ARLONG_MOVES } from './arlongData.js'
import { isArlong, arlongState, arlongStartMove, acue, registerArlongStartMove, ctrX } from './arlongState.js'

const BUFFER = 8
// Normal → normal gatlings on contact (hit OR block).
const GATLING = {
  light: ['aStraight', 'aSwing', 'aLow', 'up', 'heavy', 'aLunge'], aStraight: ['aSwing', 'heavy', 'up'],
  aLow: ['aStraight', 'aSwing', 'up'], aSwing: ['heavy'],
}
const W_START = (f, key) => arlongStartMove(f, key, startMove)
registerArlongStartMove(startMove)

function fresh(s, k, win = BUFFER) {
  const at = s.edgeAt[k]
  return at != null && s.used[k] !== at && s.tick - at <= win
}
const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }

// A buffered press reads the direction held at its press edge, not the (possibly released) current one.
function pressDir(s, b, inp, facing) {
  const t = s.edgeDir?.[b]
  if (t == null || s.edgeAt[b] === s.tick) return inp
  const fk = facing === -1 ? 'left' : 'right', bk = facing === -1 ? 'right' : 'left'
  return { ...inp, down: t <= 3, up: t >= 7, [fk]: t % 3 === 0, [bk]: t % 3 === 1 }
}
export const BITE_RANGE = 120   // →+H within this centre-to-centre distance = Bite, else Lunge punch
function normalFor(f, inp, button, grounded, opp) {
  const fwd = f.facing === -1 ? inp.left : inp.right, back = f.facing === -1 ? inp.right : inp.left
  if (!grounded) return inp.down ? 'down_air' : 'air'
  if (button === 'upAttack') return 'up'
  if (button === 'light') return inp.down ? 'aLow' : fwd ? 'aStraight' : 'light'
  if (inp.up) return 'up'
  if (inp.down) return 'heavy'
  if (back) return 'aWake'
  if (fwd) return opp && Math.abs(ctrX(opp) - ctrX(f)) <= BITE_RANGE ? 'aBite' : 'aLunge'
  return 'aSwing'
}
// Resolve a move key to what Arlong can actually do right now (blade / teeth state). Never returns a dead key.
export function resolveKey(f, key) { return key }

const CUE = { light: 'swingLight', aStraight: 'swingLight', aLow: 'swing', aSwing: 'swing', heavy: 'swing', up: 'swingLight', air: 'swing',
  down_air: 'swingLight', aLunge: 'swingLight', aWake: 'swing', aBite: 'bite', aHeadbutt: 'swingLight' }

export function updateArlongCommandCombat(f, inp, opp, ctx = {}) {
  if (!isArlong(f)) return false
  const s = arlongState(f)
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0)) return 'consumed'
  const grounded = !!(f.onGround || f.grounded)
  const a = f.attacking ? f.currentAttack : null

  // ── Cancels out of a live move ──
  if (a) {
    const t = a.total - a.timer, contact = a.hasHit && !a.al?.noHit && t >= a.activeStart
    if (contact && !ARLONG_MOVES[a.name]?.isSpecial && !a.isUltimate) {
      for (const b of ['light', 'heavy', 'upAttack']) {
        if (!fresh(s, b) || !grounded) continue
        let next = normalFor(f, pressDir(s, b, inp, f.facing), b, grounded, opp)
        if (a.name === 'light' && next === 'light') next = 'aStraight'
        next = resolveKey(f, next)
        if (next && (GATLING[a.name] || []).includes(next) && W_START(f, next)) { use(s, b); acue(f, CUE[next] || 'swing'); return 'consumed' }
      }
    }
    return 'consumed'
  }

  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (fresh(s, 'upAttack') && grounded) { use(s, 'upAttack', 'light', 'heavy'); if (W_START(f, resolveKey(f, 'up'))) { acue(f, 'swingLight'); return 'consumed' } }
  for (const b of ['light', 'heavy']) {
    if (!fresh(s, b)) continue
    const key = resolveKey(f, normalFor(f, pressDir(s, b, inp, f.facing), b, grounded, opp))
    if (!key) continue
    use(s, b)
    if (W_START(f, key)) { acue(f, CUE[key] || 'swing'); return 'consumed' }
  }
  return 'grab'
}
