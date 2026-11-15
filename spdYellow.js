// S.P.D. Yellow (spd_yellow) — COMMAND LAYER. Press edges come from tickSpdYellow (readRawControls), so keyboard, pad,
// replay and LAN feed the same reader. One parser: the existing directional-Special vocabulary + the Charge button chord;
// no new motion parser. Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat).
import { startMove, cancelWindowOpen, getComboScale, getComboHitstunScale, applyHitstop } from './combat.js'
import { isSpdYellow, spdYellowState, startYellowMove, registerSpdYellowEngine, isSpdYellowUltActive, orderEcho, openStance, closeStance,
  stanceSelect, confirmOrder, breachCallOpen, relayOpen, breakOpen, spendRelay, spendBreak, spendBreach, canSwap } from './spdYellowState.js'
import { ZORD_KIND } from './spdYellowData.js'

registerSpdYellowEngine({ startMove, comboScale: getComboScale, hitstunScale: getComboHitstunScale, hitstop: applyHitstop })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const SPECIAL_FROM = ['light', 'yJ2', 'yJ3', 'heavy', 'yLow', 'ySweep', 'yBreak']   // clean contact, recovery only
const HEAVY_FROM = ['light', 'yJ2', 'yJ3', 'yLow']
const ULT_FROM = ['heavy', 'yJ3', 'yBreak']
const plainSpecial = e => !e.up && !e.down && !e.fwd && !e.back

export function updateSpdYellowCommandCombat(f, inp, opp, W) {
  if (!isSpdYellow(f)) return false
  const s = spdYellowState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || f._ranger?.blink || isSpdYellowUltActive()) return 'consumed'
  const fire = (k, o = {}) => startYellowMove(f, k, W, o)

  // ── TACTICAL COIN COMMAND STANCE: owns every press while open. Left/Right select (world directions, as drawn),
  // a FRESH Special (pressed after the opening chord) confirms, Guard cancels. No slow motion, no invulnerability.
  if (s.stance) {
    if (fresh(s, 'block', 3)) { use(s, 'block'); closeStance(f, 'cancel'); return 'consumed' }
    if (fresh(s, 'left', 3)) { use(s, 'left'); stanceSelect(f, -1) }
    if (fresh(s, 'right', 3)) { use(s, 'right'); stanceSelect(f, 1) }
    if (fresh(s, 'special', 3) && s.edges.special.tick > s.stance.openTick) { use(s, 'special'); confirmOrder(f, opp, W) }
    for (const k of ['light', 'heavy', 'upAttack', 'ultimate']) if (fresh(s, k)) use(s, k)   // swallowed: never queued for later
    return 'consumed'
  }
  // ── BREACH WINDOW follow-up: a fresh Up+Special inside the 10 f confirm window -> Sword Finish (ordinary assist cost +
  // pip). From neutral or the authored LATE long-gun recovery only.
  if (breachCallOpen(f) && fresh(s, 'special', 3) && s.edges.special.up) {
    use(s, 'special')
    if (fire('yCall', { cancel: !!a, extra: { kind: ZORD_KIND.sword } })) spendBreach(f)
    return 'consumed'
  }
  // ── PARTNER BREAK: fresh Heavy within 12 f of a clean ordinary echo hit (once per combo).
  if (breakOpen(f) && g && fresh(s, 'heavy', 3) && !s.edges.heavy.up && !s.edges.heavy.down) {
    use(s, 'heavy')
    if (fire('yBreak', { cancel: !!a })) spendBreak(f)
    return 'consumed'
  }
  // ── RELAY: Swap may cancel Z's current action within 15 f of a clean ordinary echo hit (once per combo).
  if (relayOpen(f) && a && g && fresh(s, 'special', 3) && s.edges.special.fwd && !s.edges.special.up && !s.edges.special.down && canSwap(f)) {
    use(s, 'special')
    if (fire('ySwap', { cancel: true })) spendRelay(f)
    return 'consumed'
  }
  // ── ECHO order (Back+Special): an instant order to the idle clone; Z's own action continues (not cancelled).
  if (fresh(s, 'special') && s.edges.special.back && !s.edges.special.up && !s.edges.special.down && !s.edges.special.charge &&
      (!a || (a.my?.clean && cancelWindowOpen(f)) || a.my?.key === 'yGun')) {
    use(s, 'special'); orderEcho(f, W); return 'consumed'
  }
  const contact = !!a?.my?.clean && cancelWindowOpen(f)
  // J1 -> J2 -> J3: fresh Light retaps on a clean hit, three stages maximum.
  if (contact && (a.name === 'light' || a.name === 'yJ2') && fresh(s, 'light')) { use(s, 'light'); fire(a.name === 'light' ? 'yJ2' : 'yJ3', { cancel: true }); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); if ((!a || ULT_FROM.includes(a.name)) && g) fire('yUltOpen', { cancel: !!a }); return 'consumed' }
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special; use(s, 'special')
    // CHARGE+SPECIAL -> the command stance (grounded, from neutral only; the chord never also fires a gun)
    if (e.charge) { if (!a) openStance(f, W); return 'consumed' }
    if (!g) { if (plainSpecial(e)) fire('yAirShot'); return 'consumed' }   // airborne: only the supplied air-pistol pose
    if (e.up) fire('yCall', { cancel: !!a, extra: { kind: ZORD_KIND.intercept } })
    else if (e.down) fire('yClone', { cancel: !!a })
    else if (e.fwd) fire('ySwap', { cancel: !!a })
    else if (!e.back) fire('yGun', { cancel: !!a })
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'yLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    const move = !g ? 'yFlip' : (k === 'upAttack' || e.up) ? 'up' : e.down ? 'yLow' : e.fwd && !a ? 'yAcro' : e.back && !a ? 'ySweep' : 'heavy'
    if (!a || HEAVY_FROM.includes(a.name)) fire(move, { cancel: !!a })
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
