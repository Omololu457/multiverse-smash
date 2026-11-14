// Black Ranger (mmpr_black) — COMMAND LAYER. Press edges come from tickMmprBlack (readRawControls), so keyboard, pad,
// replay and LAN feed the same reader. Uses the existing directional Special inputs; no new motion parser.
// Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat).
import { startMove, rekkaContinue, cancelWindowOpen, getComboScale, getComboHitstunScale, applyHitstop } from './combat.js'
import { isMmprBlack, mmprBlackState, startBlackMove, pincerCancelOpen, pincerSpend, registerMmprBlackEngine, isMmprBlackUltActive } from './mmprBlackState.js'
import { PINCER } from './mmprBlackData.js'

registerMmprBlackEngine({ startMove, comboScale: getComboScale, hitstunScale: getComboHitstunScale, hitstop: applyHitstop })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const SPECIAL_FROM = ['light', 'bJ2', 'bJ3', 'heavy', 'bLow', 'bPalm', 'bTurn', 'bAway']   // clean contact, recovery only
const HEAVY_FROM = ['light', 'bJ2', 'bJ3']
const ULT_FROM = ['heavy', 'bAway', 'bJ3']   // close confirm → ultimate: clean contact, recovery only (the `contact` gate above)
export const SORTIE_INPUT = { fwd: 'sweep', up: 'talon', back: 'volley' }

export function updateMmprBlackCommandCombat(f, inp, opp, W) {
  if (!isMmprBlack(f)) return false
  const s = mmprBlackState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || s.landing > 0 || s.leaping || f._ranger?.blink || isMmprBlackUltActive()) return 'consumed'
  const fire = (k, o = {}) => startBlackMove(f, k, W, o)
  // PINCER CONFIRM: ONE fresh Light/Heavy retap cancels the last 6 f of the tagging attack's recovery.
  if (a && pincerCancelOpen(f)) for (const k of ['light', 'heavy']) if (fresh(s, k, PINCER.retapBuffer)) {
    use(s, k); pincerSpend(f); fire(k === 'light' ? 'light' : 'heavy', { cancel: true }); return 'consumed'
  }
  // Forward+Heavy chain: advancing palm → fresh Heavy turning kick → fresh Heavy knock-away (confirmed Up+Heavy → launcher).
  if (a && (a.name === 'bPalm' || a.name === 'bTurn')) {
    const h = fresh(s, 'heavy') || fresh(s, 'upAttack'), k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy'
    f._rekkaNext = a.name === 'bPalm' ? 'bTurn' : (h && (k === 'upAttack' || s.edges[k].up) ? 'up' : 'bAway')
    f._cmdHitLanded = !!a.mb?.clean
    const next = rekkaContinue(f, { edge: !!h, opponent: opp })
    if (next) { use(s, k); fire(next, { fromChain: true }); return 'consumed' }
  }
  const contact = !!a?.mb?.clean && cancelWindowOpen(f)
  // Commander rule: once the call has COMMITTED (bird launched), the call's recovery may be cancelled into one fresh
  // grounded Light or Heavy. This is what lets a pre-called sortie and Black's Heavy pincer the same target.
  if (a?.name === 'bCall' && g && cancelWindowOpen(f) && !f._falcon?.pendingKind && (fresh(s, 'light') || fresh(s, 'heavy'))) {
    const k = fresh(s, 'heavy') ? 'heavy' : 'light', e = s.edges[k]; use(s, k)
    fire(k === 'heavy' ? (e.up ? 'up' : e.down ? 'bLow' : 'heavy') : (e.down ? 'bLow' : 'light'), { cancel: true }); return 'consumed'
  }
  // J1 → J2 → J3: fresh Light retaps on a clean hit, three stages maximum.
  if (contact && (a.name === 'light' || a.name === 'bJ2') && fresh(s, 'light')) { use(s, 'light'); fire(a.name === 'light' ? 'bJ2' : 'bJ3', { cancel: true }); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); if ((!a || ULT_FROM.includes(a.name)) && g && (f.energy || 0) >= 100) fire('bUltOpen', { cancel: !!a }); return 'consumed' }
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special; use(s, 'special')
    if (g) {
      const kind = e.up ? 'talon' : e.fwd ? 'sweep' : e.back ? 'volley' : null
      if (kind) fire('bCall', { cancel: !!a, extra: { kind } })
      else fire(e.down ? 'bRising' : 'bCrescent', { cancel: !!a })
    }
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'bLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    const move = !g ? 'air' : (k === 'upAttack' || e.up) ? 'up' : e.down ? 'bLow' : e.fwd && !a ? 'bPalm' : 'heavy'
    if (!a || HEAVY_FROM.includes(a.name)) fire(move, { cancel: !!a })
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
