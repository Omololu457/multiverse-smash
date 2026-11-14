// White Ranger (mmpr_white) — COMMAND LAYER. Press edges come from tickMmprWhite (readRawControls), so keyboard, pad,
// replay and LAN feed the same reader. Uses the existing directional Special inputs; no new motion parser.
// Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat).
import { startMove, rekkaContinue, cancelWindowOpen, getComboScale, getComboHitstunScale, applyHitstop } from './combat.js'
import { isMmprWhite, mmprWhiteState, startWhiteMove, acceptFormation, registerMmprWhiteEngine, isMmprWhiteUltActive } from './mmprWhiteState.js'
import { FEINT, NINJA_ORDER } from './mmprWhiteData.js'

registerMmprWhiteEngine({ startMove, comboScale: getComboScale, hitstunScale: getComboHitstunScale, hitstop: applyHitstop })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const SPECIAL_FROM = ['light', 'wJ2', 'wJ3', 'heavy', 'wLow', 'wAdv', 'wSaba', 'wKnock']   // clean contact, recovery only
const HEAVY_FROM = ['light', 'wJ2', 'wJ3', 'wLow']   // Low Heel → Saba Cut is the brief's Low → Heavy → Saba route
const ULT_FROM = ['heavy', 'wSaba', 'wKnock', 'wJ3']   // clean contact, recovery only (the `contact` gate below)

export function updateMmprWhiteCommandCombat(f, inp, opp, W) {
  if (!isMmprWhite(f)) return false
  const s = mmprWhiteState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || s.landing > 0 || s.leaping || s.descending || f._ranger?.blink || isMmprWhiteUltActive()) return 'consumed'
  const fire = (k, o = {}) => startWhiteMove(f, k, W, o)
  // FORMATION FOLLOW-UP: a fresh Special retap inside the 10 f window after the order's confirmed hit. Takes priority over
  // every other Special use (the retap is never also a Saba's Answer / new order).
  if (s.accept && fresh(s, 'special', 10)) { use(s, 'special'); acceptFormation(f, opp, W); return 'consumed' }
  // SABA'S ANSWER FEINT: Block pressed during startup frames 1-9 → 12 f recovery, no hitbox, Energy stays spent.
  if (a?.mw?.key === 'wAnswer' && fresh(s, 'block', 3)) {
    const t = a.total - a.timer
    if (t >= FEINT.from && t <= FEINT.to) { use(s, 'block'); fire('wFeint', { cancel: true }); return 'consumed' }
  }
  // Forward+Heavy chain: advancing strike → fresh Heavy Saba cut → fresh Heavy knock-away (confirmed Up+Heavy → launcher).
  if (a && (a.name === 'wAdv' || a.name === 'wSaba')) {
    const h = fresh(s, 'heavy') || fresh(s, 'upAttack'), k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy'
    f._rekkaNext = a.name === 'wAdv' ? 'wSaba' : (h && (k === 'upAttack' || s.edges[k].up) ? 'up' : 'wKnock')
    f._cmdHitLanded = !!a.mw?.clean
    const next = rekkaContinue(f, { edge: !!h, opponent: opp })
    if (next) { use(s, k); fire(next, { fromChain: true }); return 'consumed' }
  }
  const contact = !!a?.mw?.clean && cancelWindowOpen(f)
  // J1 → J2 → J3: fresh Light retaps on a clean hit, three stages maximum.
  if (contact && (a.name === 'light' || a.name === 'wJ2') && fresh(s, 'light')) { use(s, 'light'); fire(a.name === 'light' ? 'wJ2' : 'wJ3', { cancel: true }); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); if ((!a || ULT_FROM.includes(a.name)) && g && (f.energy || 0) >= 100) fire('wUltOpen', { cancel: !!a }); return 'consumed' }
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special; use(s, 'special')
    if (g) {
      const kind = e.up ? NINJA_ORDER.up : e.fwd ? NINJA_ORDER.fwd : e.back ? NINJA_ORDER.back : null
      if (kind) fire('wCall', { cancel: !!a, extra: { kind } })
      else fire(e.down ? 'wAscent' : 'wAnswer', { cancel: !!a })
    } else if (e.down && !a) fire('wDescent')
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'wLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    const move = !g ? 'air' : (k === 'upAttack' || e.up) ? 'up' : e.down ? 'wLow' : e.fwd && !a ? 'wAdv' : 'heavy'
    if (!a || HEAVY_FROM.includes(a.name)) fire(move, { cancel: !!a })
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
