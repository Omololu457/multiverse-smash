// Batman (batman) — COMMAND LAYER. Press edges come from tickBatman (readRawControls), so keyboard, pad, replay and LAN
// feed the same reader. Uses only the existing logical actions (Light / Heavy / Up-Attack / Special / Ultimate / Charge)
// — no Batman-only pad poller and no motion parser. Returns 'consumed' | 'grab'.
// Precedence (top first): stun / cinematic → committed move (no reads) → clean-hit cancels (chain / heavy / ultimate /
// support order / gadget) → Ultimate → Special (Charge held = SUPPORT ORDER, else GADGET) → Up-Attack → Light → Heavy.
// DIRECTIONS are facing-relative and sampled on the press frame.
//   GADGET  (R1 / L):       Neutral Batarang · Forward Grapnel Breaker · Up Rooftop Extraction · Down Smoke and Shadow ·
//                           Back Gotham Airspace (the bomber operation; also a support operation → one at a time)
//   ORDER   (L2 + R1 / P+L): Neutral Interceptor · Forward Carrier barrage · Up Skyhook · Down Capsule cover · Back Automaton
//   HEAVY   (△ / K):        Up = launcher · Down = sweep (air: cape dive) · Back = cape counter · Forward = advancing heavy
// Air: Light = air strike · Heavy = air kick (Down = dive) · Neutral Special = Batarang · Up Special = Rooftop (once per
// airtime). Other air specials and all air orders are refused (cue, nothing spent).
import { startMove, cancelWindowOpen, getComboScale, getComboHitstunScale } from './combat.js'
import { isBatman, bmState, startBmMove, registerBatmanEngine, isBatmanUltActive } from './batmanState.js'
import { CHAIN, HEAVY_FROM, SPECIAL_FROM, ORDER_FROM, ULT_FROM } from './batmanData.js'

registerBatmanEngine({ startMove, comboScale: getComboScale, hitstunScale: typeof getComboHitstunScale === 'function' ? getComboHitstunScale : null })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const COMMITTED = new Set(['bBatarang', 'bGrapnel', 'bRopeKick', 'bRooftop', 'bSmoke', 'bCounter', 'bCounterHit', 'bDive', 'bDiveLand',
  'cmdSky', 'cmdPoint', 'cmdCarrier', 'cmdSkyhook', 'cmdCover', 'cmdAuto', 'ultOpen'])
export const dirOf = e => e.up ? 'up' : e.fwd ? 'fwd' : e.back ? 'back' : e.down ? 'down' : 'neutral'
export const heavyDir = (e, g) => !g ? (e.down ? 'bDive' : 'bAirK') : e.up ? 'up' : e.down ? 'bSweep' : e.back ? 'bCounter' : e.fwd ? 'bSpin' : 'heavy'
export const GADGET = { neutral: 'bBatarang', fwd: 'bGrapnel', up: 'bRooftop', down: 'bSmoke', back: 'cmdSky' }
export const ORDER = { neutral: 'cmdPoint', fwd: 'cmdCarrier', up: 'cmdSkyhook', down: 'cmdCover', back: 'cmdAuto' }
const AIR_GADGET = { neutral: 'bBatarang', up: 'bRooftop' }

function special(f, s, W, g, cancel) {
  const e = s.edges.special, d = dirOf(e); use(s, 'special')
  if (e.mod) {                                       // L2 held at the R1 press → support order (grounded gesture)
    if (!g) { s.stats.rejects++; s.cues.push('reject'); return }
    startBmMove(f, ORDER[d], W, { cancel }); return
  }
  const k = g ? GADGET[d] : AIR_GADGET[d]
  if (!k) { s.stats.rejects++; s.cues.push('reject'); return }
  startBmMove(f, k, W, { cancel })
}

export function updateBatmanCommandCombat(f, inp, opp, W) {
  if (!isBatman(f)) return false
  const s = bmState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isBatmanUltActive()) return 'consumed'
  if (a && a._ultPose) return 'consumed'
  if (a && COMMITTED.has(a.bm?.key)) return 'consumed'
  const fire = (k, o = {}) => startBmMove(f, k, W, o)
  const contact = !!a?.bm?.clean && cancelWindowOpen(f)
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); s.stats.chains++; fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  if (contact && HEAVY_FROM.includes(a.name) && (fresh(s, 'heavy') || fresh(s, 'upAttack'))) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    fire(k === 'upAttack' ? 'up' : heavyDir(e, g), { cancel: true }); return 'consumed'
  }
  if (contact && fresh(s, 'ultimate') && ULT_FROM.includes(a.name)) {
    use(s, 'ultimate'); if (g && (f.energy || 0) >= 100) fire('ultOpen', { cancel: true }); else s.cues.push('reject'); return 'consumed'
  }
  if (contact && fresh(s, 'special')) {
    const e = s.edges.special
    if (e.mod ? ORDER_FROM.includes(a.name) : SPECIAL_FROM.includes(a.name)) { special(f, s, W, g, true); return 'consumed' }
  }
  if (a) return 'consumed'
  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (fresh(s, 'ultimate')) {   // the Ultimate owns its press (consumed even when illegal: grounded, 100 energy)
    use(s, 'ultimate')
    if (g && (f.energy || 0) >= 100) fire('ultOpen'); else { s.stats.rejects++; s.cues.push('reject') }
    return 'consumed'
  }
  if (fresh(s, 'special')) { special(f, s, W, g, false); return 'consumed' }
  if (fresh(s, 'upAttack')) {
    use(s, 'upAttack'); if (fresh(s, 'light')) use(s, 'light'); if (fresh(s, 'heavy')) use(s, 'heavy')
    fire(g ? 'up' : 'air')
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (fire(!g ? 'air' : e.down ? 'bLow' : 'light') && g && !e.down) s.stats.light++
    return 'consumed'
  }
  if (fresh(s, 'heavy')) {
    const e = s.edges.heavy; use(s, 'heavy')
    fire(heavyDir(e, g))
    return 'consumed'
  }
  return 'grab'
}
