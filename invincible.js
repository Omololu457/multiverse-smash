// Invincible — Mark Grayson (invincible) — COMMAND LAYER. Press edges come from tickInv (readRawControls), so keyboard,
// pad, replay and LAN feed one reader. Every move of his starts here (the grab button is handed back to the engine's
// generic throw). Move list: docs/msv1/invincible/COMBOS.md, invincibleKit.js.
//
//   Light → Jab · Light again during the Jab → BARRAGE (mash Light: up to 6 hits, the last launches)
//   Heavy → Straight · → + Heavy → Spin kick · ↓ + Light → Sweep (low) · ↓ + Heavy → Rising kick (anti-air)
//   Up-Attack (or ↑ + Heavy) → Uppercut (anti-air launcher) · in the air / in flight: any attack → Flight punch
//   ↓↘→ + Special → INVINCIBLE PUNCH · →↓↘ + Special → SKYWARD · air ↓ + Special → CRASH DOWN
//   neutral Special → Invincible Punch (the signature move on one button) · ↓↓ + Special → NO HOLDING BACK (1 bar)
//   Ultimate → TERMINAL VELOCITY · double-tap ← / → → ZIP (invincibleState.js) · tap Charge → take off / come down
// Chains (on contact): Jab → Straight / Spin / Uppercut; any normal → any special / the Super / a Zip (on HIT).
import { startMove, getComboScale } from './combat.js'
import { isInv, invState, startInvMove, registerInvEngine, fresh, use, MOTIONS } from './invincibleState.js'
import { NORMALS } from './invincibleData.js'
import { isFlying } from './flight.js'

registerInvEngine({ startMove, comboScale: getComboScale })

const fwdHeld = (f, raw) => !!(f.facing === -1 ? raw.left : raw.right)
const grounded = f => !!(f.onGround || f.grounded)
const CHAIN = { kJab: new Set(['kStraight', 'kSpin', 'kUpper', 'kSweep', 'kRise']), kSweep: new Set(['kStraight', 'kUpper', 'kSpin']),
  kStraight: new Set(['kUpper', 'kSpin']), kSpin: new Set(['kUpper']) }

function specialChoice(f, s, raw, e, air) {
  if (MOTIONS.downDown(s)) return 'kNHB'
  if (air && (e.down || raw.down)) return 'kCrash'
  if (MOTIONS.dp(s)) return 'kSkyward'
  return 'kIPunch'   // ↓↘→ + Special, and neutral / → + Special
}
function normalChoice(f, s, raw, air) {
  if (air) return (fresh(s, 'light') || fresh(s, 'heavy') || fresh(s, 'upAttack')) ? 'kFpunch' : null
  if (fresh(s, 'upAttack') || (fresh(s, 'heavy') && raw.up)) return 'kUpper'
  if (fresh(s, 'light')) return raw.down || s.edges.light.down ? 'kSweep' : 'kJab'
  if (fresh(s, 'heavy')) return raw.down || s.edges.heavy.down ? 'kRise' : (s.edges.heavy.fwd || fwdHeld(f, raw)) ? 'kSpin' : 'kStraight'
  return null
}
const useAttacks = s => { use(s, 'light'); use(s, 'heavy'); use(s, 'upAttack') }

export function updateInvCommandCombat(f, inp, opp, W) {
  if (!isInv(f)) return false
  const s = invState(f), raw = W.raw?.(f) || inp || {}
  const air = !grounded(f) || isFlying(f)
  const a = f.attacking && f.currentAttack?.inv ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0) return 'consumed'
  if (s.mv) return 'consumed'
  const fire = (k, o = {}) => startInvMove(f, k, W, { dir: f.facing || 1, ...o })
  if (a) {
    const k = a.inv.key
    if (!NORMALS.includes(k) && k !== 'kBarrage') return 'consumed'
    // BARRAGE: Light pressed again during the Jab (no contact needed — it is a mash)
    if (k === 'kJab' && fresh(s, 'light') && !raw.down && elapsedOf(a) >= 2) { use(s, 'light'); fire('kBarrage', { cancel: true }); return 'consumed' }
    const contact = !!a.inv.contact && s.tick > (a.inv.contactTick ?? s.tick)
    if (!contact) return 'consumed'
    if (fresh(s, 'ultimate')) { use(s, 'ultimate'); fire('kTV', { cancel: true }); return 'consumed' }
    if (fresh(s, 'special')) { const e = s.edges.special; use(s, 'special'); fire(specialChoice(f, s, raw, e, air), { cancel: true }); return 'consumed' }
    if (CHAIN[k]) {
      const n = normalChoice(f, s, raw, air)
      if (n && CHAIN[k].has(n)) { useAttacks(s); fire(n, { cancel: true }); return 'consumed' }
    }
    return 'consumed'
  }
  if (f.attackCooldown > 0) return 'consumed'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); fire('kTV'); return 'consumed' }
  if (!air && fresh(s, 'grab')) { use(s, 'grab'); return 'grab' }
  if (fresh(s, 'special')) { const e = s.edges.special; use(s, 'special'); fire(specialChoice(f, s, raw, e, air)); return 'consumed' }
  const n = normalChoice(f, s, raw, air)
  if (n) { useAttacks(s); fire(n) }
  return 'consumed'
}
const elapsedOf = a => a.total - a.timer
