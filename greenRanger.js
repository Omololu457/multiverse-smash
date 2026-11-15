// Green Ranger (green_ranger) — COMMAND LAYER. Press edges come from tickGreen (readRawControls), so keyboard, pad,
// replay and LAN feed the same reader. Uses the existing directional Special inputs and the logical Charge / Ultimate
// buttons; no new motion parser. Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat).
import { startMove, rekkaContinue, cancelWindowOpen, getComboScale, getComboHitstunScale, applyHitstop } from './combat.js'
import { isGreenRanger, greenState, startGreenMove, registerGreenEngine, isGreenUltActive, dragonCallReady } from './greenRangerState.js'
import { CHAIN_RETAP } from './greenRangerData.js'

registerGreenEngine({ startMove, comboScale: getComboScale, hitstunScale: getComboHitstunScale, hitstop: applyHitstop })

const fresh = (s, k, win = CHAIN_RETAP) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const SPECIAL_FROM = ['light', 'gJ2', 'gJ3', 'heavy', 'gLow', 'gAdv', 'gBlade', 'gAway']   // clean contact, recovery only (shared cancel window)
const HEAVY_FROM = ['light', 'gJ2', 'gJ3']
export const ULT_FROM = ['heavy', 'gAway', 'gJ3']

export function updateGreenCommandCombat(f, inp, opp, W) {
  if (!isGreenRanger(f)) return false
  const s = greenState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || s.landing > 0 || s.leaping || isGreenUltActive()) {
    return 'consumed'
  }
  const fire = (k, o = {}) => startGreenMove(f, k, W, o)
  // Forward+Heavy chain: advancing punch → fresh Heavy blade strike → fresh Heavy knock-away (confirmed Up+Heavy → launcher).
  if (a && (a.name === 'gAdv' || a.name === 'gBlade')) {
    const h = fresh(s, 'heavy') || fresh(s, 'upAttack'), k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy'
    f._rekkaNext = a.name === 'gAdv' ? 'gBlade' : (h && (k === 'upAttack' || s.edges[k].up) ? 'up' : 'gAway')
    f._cmdHitLanded = !!a.gm?.clean
    const next = rekkaContinue(f, { edge: !!h, opponent: opp })
    if (next) { use(s, k); fire(next, { extra: { fromChain: true } }); return 'consumed' }
  }
  const contact = !!a?.gm?.clean && cancelWindowOpen(f)
  // J1 → J2 → J3: fresh Light retaps on a clean hit, three stages maximum.
  if (contact && (a.name === 'light' || a.name === 'gJ2') && fresh(s, 'light')) { use(s, 'light'); fire(a.name === 'light' ? 'gJ2' : 'gJ3', { cancel: true }); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  // DRAGON CALL: a FRESH Charge press only (holding Charge never restarts it). Not eligible → ordinary Charge.
  if (!a && fresh(s, 'charge', 2) && dragonCallReady(f, { block: inp.block })) { use(s, 'charge'); fire('gCall'); return 'consumed' }
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); if ((!a || ULT_FROM.includes(a.name)) && g && (f.energy || 0) >= 100) fire('gUlt', { cancel: !!a }); return 'consumed' }
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special; use(s, 'special')
    if (!g) { if (e.down) fire('gFang', { cancel: !!a }) }
    else fire(e.down ? 'gTalon' : e.fwd ? 'gAdvance' : e.back ? 'gPulse' : 'gEdge', { cancel: !!a })
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? (e.down ? 'down_air' : 'air') : e.down ? 'gLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    const move = !g ? (e.down ? 'down_air' : 'air') : (k === 'upAttack' || e.up) ? 'up' : e.down ? 'gLow' : e.fwd && !a ? 'gAdv' : 'heavy'
    if (!a || HEAVY_FROM.includes(a.name)) fire(move, { cancel: !!a })
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
