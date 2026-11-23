// Omni-Man — Viltrumite (omniman_viltrum) — COMMAND LAYER. Press edges come from tickOmv (readRawControls), so keyboard,
// pad, replay and LAN feed one reader. Every move of his starts here (the grab button is handed back to the engine's
// generic throw). Inputs: docs/msv1/omniman/COMBOS.md.
//   Light → Jab · Light again on contact → Straight · Heavy → Haymaker (on contact from Jab / Straight too)
//   ↓ + Light / ↓ + Heavy → Low punch · Up-attack (or ↑ + Heavy) → Kick · any attack in the air / in flight → Flight punch
//   Charge TAP → take off / come down (the flight-profile control) · Guard in flight → BRAKE
//   ↓↘→ + S Viltrumite Blitz · →↓↘ + S Sky Hook · ↓ + S (air) Meteor Drop · ↓↙← + S Face in the Dirt
//   ↓↓ + Heavy Unimpressed · ↓↓ + Light Viltrum Decree · ↓↓ + S (or ↓↘→↓↘→ + S) THINK! (1 bar) · Ultimate → Escape Velocity
import { startMove, getComboScale } from './combat.js'
import { isOmv, omvState, startOmvMove, registerOmvEngine, fresh, use, MOTIONS, omvFlying, endOmvAttack } from './omnimanViltrumState.js'
import { CHAIN, NORMALS } from './omnimanViltrumData.js'

registerOmvEngine({ startMove, comboScale: getComboScale })

const grounded = f => !!(f.onGround || f.grounded)
const CANCEL_FROM = new Set(['kJab', 'kStraight', 'kHay', 'kLow', 'kKick', 'kAir'])

function specialChoice(f, s, raw, e, g, fly) {
  if (MOTIONS.downDown(s)) return 'kThink'
  if (MOTIONS.doubleQcf(s)) return 'kThink'
  if (MOTIONS.dp(s)) return g ? 'kSkyHook' : null
  if (MOTIONS.qcb(s)) return g ? 'kDirt' : null
  if (MOTIONS.qcf(s)) return 'kBlitz'
  if (!g && (e.down || raw.down)) return 'kMeteor'
  return 'kBlitz'                                     // neutral / → Special = Blitz (the motion is the listed input)
}

export function updateOmvCommandCombat(f, inp, opp, W) {
  if (!isOmv(f)) return false
  const s = omvState(f), raw = W.raw?.(f) || inp || {}, g = grounded(f), fly = omvFlying(f)
  const a = f.attacking && f.currentAttack?.omv ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0) return 'consumed'
  if (s.crash > 0 || s.land > 0 || s.rush || s.hold || s.ev) return 'consumed'
  const fwd = !!(f.facing === -1 ? raw.left : raw.right)
  const fire = (k, o = {}) => startOmvMove(f, k, W, { dir: f.facing || 1, flyOk: fly, ...(k === 'kMeteor' ? { diag: fwd } : {}), ...o })
  if (a && !CANCEL_FROM.has(a.omv.key)) return 'consumed'
  const contact = !!a && !!a.omv.contact && s.tick > (a.omv.contactTick ?? s.tick)
  if (contact) {
    const nx = CHAIN[a.omv.key] || []
    if (nx.includes('kStraight') && fresh(s, 'light')) { use(s, 'light'); fire('kStraight', { cancel: true }); return 'consumed' }
    if (nx.includes('kHay') && fresh(s, 'heavy')) { use(s, 'heavy'); fire('kHay', { cancel: true }); return 'consumed' }
    if (a.omv.key === 'kJab' && fresh(s, 'heavy') && !raw.down) { use(s, 'heavy'); fire('kHay', { cancel: true }); return 'consumed' }
    if (fresh(s, 'special')) { const e = s.edges.special; use(s, 'special'); const k = specialChoice(f, s, raw, e, g, fly); if (k) fire(k, { cancel: true }); return 'consumed' }
  }
  if (a) return 'consumed'
  if (f.attackCooldown > 0) return 'consumed'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); fire('kEscape'); return 'consumed' }
  if (fresh(s, 'heavy') && MOTIONS.downDown(s) && g) { use(s, 'heavy'); fire('kUnimp'); return 'consumed' }
  if (fresh(s, 'light') && MOTIONS.downDown(s) && g) { use(s, 'light'); fire('kDecree'); return 'consumed' }
  if (g && !fly && fresh(s, 'grab')) { use(s, 'grab'); return 'grab' }
  if (fresh(s, 'special')) { const e = s.edges.special; use(s, 'special'); const k = specialChoice(f, s, raw, e, g, fly); if (k) fire(k); return 'consumed' }
  if (!g || fly) {
    if (fresh(s, 'light') || fresh(s, 'heavy') || fresh(s, 'upAttack')) { use(s, 'light'); use(s, 'heavy'); use(s, 'upAttack'); fire('kAir') }
    return 'consumed'
  }
  if (fresh(s, 'upAttack') || (fresh(s, 'heavy') && raw.up)) { use(s, 'upAttack'); use(s, 'heavy'); fire('kKick'); return 'consumed' }
  if (fresh(s, 'light')) { use(s, 'light'); fire(raw.down ? 'kLow' : 'kJab'); return 'consumed' }
  if (fresh(s, 'heavy')) { use(s, 'heavy'); fire(raw.down ? 'kLow' : 'kHay'); return 'consumed' }
  return 'consumed'
}
export { NORMALS, endOmvAttack }
