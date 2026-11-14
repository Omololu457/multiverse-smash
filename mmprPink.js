// Pink Ranger (mmpr_pink) — COMMAND LAYER. Press edges come from tickMmprPink (readRawControls), so keyboard, pad,
// replay and LAN feed the same reader. Uses the existing directional Special inputs; no new motion parser.
// Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat).
import { startMove, rekkaContinue, cancelWindowOpen, getComboScale, getComboHitstunScale, applyHitstop } from './combat.js'
import { isMmprPink, mmprPinkState, startPinkMove, threadCancelOpen, threadSpend, registerMmprPinkEngine, isMmprPinkUltActive } from './mmprPinkState.js'
import { THUNDER_KINDS } from './mmprPinkData.js'

registerMmprPinkEngine({ startMove, comboScale: getComboScale, hitstunScale: getComboHitstunScale, hitstop: applyHitstop })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const SPECIAL_FROM = ['light', 'pJ2', 'pJ3', 'heavy', 'pLow', 'pPalm', 'pKick', 'pAway']   // clean contact, recovery only
const HEAVY_FROM = ['light', 'pJ2', 'pJ3']
const ULT_FROM = ['heavy', 'pAway', 'pJ3']

export function updateMmprPinkCommandCombat(f, inp, opp, W) {
  if (!isMmprPink(f)) return false
  const s = mmprPinkState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || f._ranger?.blink || isMmprPinkUltActive()) return 'consumed'
  const fire = (k, o = {}) => startPinkMove(f, k, W, o)
  // THREAD THE NEEDLE: ONE fresh Down+Special during the granted window cancels the last 6 f of bow recovery into
  // Crane Escape (still 12 Energy). Nothing else is cancellable this way.
  if (a && threadCancelOpen(f) && fresh(s, 'special', 3) && s.edges.special.down) {
    use(s, 'special')
    if (fire('pCrane', { cancel: true })) threadSpend(f)
    return 'consumed'
  }
  // Forward+Heavy chain: advancing palm → fresh Heavy kick → fresh Heavy knock-away (confirmed Up+Heavy → launcher).
  if (a && (a.name === 'pPalm' || a.name === 'pKick')) {
    const h = fresh(s, 'heavy') || fresh(s, 'upAttack'), k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy'
    f._rekkaNext = a.name === 'pPalm' ? 'pKick' : (h && (k === 'upAttack' || s.edges[k].up) ? 'up' : 'pAway')
    f._cmdHitLanded = !!a.mb?.clean
    const next = rekkaContinue(f, { edge: !!h, opponent: opp })
    if (next) { use(s, k); fire(next, { fromChain: true }); return 'consumed' }
  }
  // SPOTTER'S REFLEX (the transparent Thread-the-Needle timing adjustment, docs/mmpr_pink/MOVE_FRAME_MAP.md): once the call
  // has COMMITTED (frame 14+), its 12 f recovery may be cancelled into ONE fresh neutral Power Bow — nothing else. Without
  // it the earliest arrow (frame 27 + 12) lands after every Megazord contact window and the reward could never happen.
  if (a?.name === 'pCall' && g && !f._falcon?.pendingKind && a.total - a.timer > a.activeStart && fresh(s, 'special', 3)) {
    const e = s.edges.special
    if (!e.up && !e.down && !e.fwd && !e.back) { use(s, 'special'); fire('pBow', { cancel: true }); return 'consumed' }
  }
  const contact = !!a?.mb?.clean && cancelWindowOpen(f)
  // J1 → J2 → J3: fresh Light retaps on a clean hit, three stages maximum.
  if (contact && (a.name === 'light' || a.name === 'pJ2') && fresh(s, 'light')) { use(s, 'light'); fire(a.name === 'light' ? 'pJ2' : 'pJ3', { cancel: true }); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); if ((!a || ULT_FROM.includes(a.name)) && g) fire('pUltOpen', { cancel: !!a }); return 'consumed' }
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special; use(s, 'special')
    const kind = e.up ? THUNDER_KINDS.up : e.fwd ? THUNDER_KINDS.fwd : e.back ? THUNDER_KINDS.back : null
    if (!g) { if (!e.down && !kind) mmprPinkState(f).reject = 12 }   // no faithful airborne bow pose: grounded only
    else if (e.down) fire('pCrane', { cancel: !!a })
    else if (kind) fire('pCall', { cancel: !!a, extra: { kind } })
    else fire('pBow', { cancel: !!a })
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'pLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    const move = !g ? 'air' : (k === 'upAttack' || e.up) ? 'up' : e.down ? 'pLow' : e.fwd && !a ? 'pPalm' : 'heavy'
    if (!a || HEAVY_FROM.includes(a.name)) fire(move, { cancel: !!a })
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
