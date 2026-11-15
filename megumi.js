// Megumi Fushiguro (megumi_fushiguro) — COMMAND LAYER. Press edges come from tickMegumi (readRawControls), so keyboard,
// pad, replay and LAN feed the same reader. Uses the existing logical actions (Light / Heavy / Up-Attack / Special /
// Ultimate / Charge); no motion parser and no Megumi-only pad poller. Returns 'consumed' | 'grab' (game.js passes only
// the grab to updateCombat).
// Precedence (top first): stun / cinematic → committed summon gesture / step (no reads except a Shadow Route) → chain &
// heavy cancels → Ultimate → Shadow Step (L2 + horizontal) → directional Special → Up-Attack → Light → Heavy.
// SPECIAL DIRECTION PRIORITY (facing-relative, sampled on the press frame): Up > Forward > Back > Down > Neutral.
// Air: any direction = Air Nue (once per airtime). The breaker (Block + Special in hitstun) is resolved by game.js first.
import { startMove, cancelWindowOpen, getComboScale } from './combat.js'
import { isMegumi, mgState, startMgMove, registerMegumiEngine, isMegumiUltActive } from './megumiState.js'
import { CHAIN, HEAVY_FROM, SPECIAL_FROM, ULT_FROM } from './megumiData.js'

registerMegumiEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
// The shared pad reader reports Up+△ as BOTH Heavy and Up-Attack (and Up+□ as Light + Up-Attack). An Up-Attack edge on the
// same tick as a Heavy edge is therefore Up+Heavy (the rising-staff launcher); keyboard I / Up+□ stay the uppercut.
const upHeavy = s => fresh(s, 'heavy') && s.edges.heavy.tick === s.edges.upAttack?.tick
const GESTURES = new Set(['mDog', 'mToad', 'mNue', 'mAirNue', 'mRabbit', 'mSerpent', 'mElephant'])
const COMMITTED = new Set([...GESTURES, 'mStep', 'mHop', 'ultOpen'])
export const specialDir = e => e.up ? 'up' : e.fwd ? 'fwd' : e.back ? 'back' : e.down ? 'down' : 'neutral'
export const GROUND_SPECIAL = { up: 'mNue', fwd: 'mToad', back: 'mSerpent', down: 'mRabbit', neutral: 'mDog' }
// Shadow Route targets: offensive summons only (Rabbit Escape is never a route).
const ROUTE_SPECIAL = { up: 'mNue', fwd: 'mToad', back: 'mSerpent', down: 'mDog', neutral: 'mDog' }

export function updateMegumiCommandCombat(f, inp, opp, W) {
  if (!isMegumi(f)) return false
  const s = mgState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isMegumiUltActive()) return 'consumed'
  if (a && a._ultPose) return 'consumed'
  const fire = (k, o = {}) => startMgMove(f, k, W, o)
  // ── SHADOW ROUTE: a summon's CLEAN hit opened the confirm window; a FRESH Special pays the next summon's normal cost
  //    and plays its normal startup. One stock, once per combo, grounded, never from the ultimate.
  const r = s.route
  if (r.confirm && r.stocks > 0 && !r.usedCombo && g && fresh(s, 'special', 4) && (!a || GESTURES.has(a.mg?.key))) {
    const e = s.edges.special, d = specialDir(e); use(s, 'special')
    fire(ROUTE_SPECIAL[d], { cancel: !!a, route: true })
    return 'consumed'
  }
  if (a && COMMITTED.has(a.mg?.key)) return 'consumed'
  const contact = !!a?.mg?.clean && cancelWindowOpen(f)
  // Light → fresh Light → fresh Light (jab → kick → staff) after a clean hit, three stages maximum.
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  // clean jab / kick / low → a FRESH Heavy: Heavy / Forward+Heavy / Up+Heavy
  if (contact && HEAVY_FROM.includes(a.name) && (fresh(s, 'heavy') || fresh(s, 'upAttack'))) {
    const k = fresh(s, 'upAttack') && !upHeavy(s) ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    if (k === 'heavy' && fresh(s, 'upAttack')) use(s, 'upAttack')
    fire(k === 'upAttack' ? 'up' : (e.up || s.edges.upAttack?.tick === e.tick) ? 'mLaunch' : e.fwd ? 'mAdv' : 'heavy', { cancel: true }); return 'consumed'
  }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) {   // the Ultimate owns its press (consumed even when illegal)
    use(s, 'ultimate')
    if ((!a || ULT_FROM.includes(a.name)) && g && (f.energy || 0) >= 100) fire('ultOpen', { cancel: !!a })
    return 'consumed'
  }
  // SHADOW STEP: L2 held + a fresh horizontal press, or a fresh L2 press while a horizontal is held. Neutral only.
  if (!a && g) {
    const eL2 = fresh(s, 'charge', 2) && s.edges.charge.lr !== 0
    const eH = s.prev.charge && (fresh(s, 'left', 2) || fresh(s, 'right', 2))
    if (eL2 || eH) {
      const dir = eL2 ? s.edges.charge.lr : (fresh(s, 'right', 2) ? 1 : -1)
      if (eL2) use(s, 'charge'); if (fresh(s, 'left', 2)) use(s, 'left'); if (fresh(s, 'right', 2)) use(s, 'right')
      f._dashTap = false
      fire('mStep', { dir })
      return 'consumed'
    }
  }
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special, d = specialDir(e); use(s, 'special')
    if (g) fire(GROUND_SPECIAL[d], { cancel: !!a })
    else if (!a) fire('mAirNue')
    else s.cues.push('reject')
    return 'consumed'
  }
  if (fresh(s, 'upAttack') && upHeavy(s)) {   // pad Up+△ → the same launcher / air ender as keyboard Up+Heavy
    use(s, 'upAttack'); use(s, 'heavy'); if (fresh(s, 'light')) use(s, 'light')
    if (!a) fire(g ? 'mLaunch' : 'mAirEnd')
    return 'consumed'
  }
  if (fresh(s, 'upAttack')) {
    use(s, 'upAttack'); if (fresh(s, 'light')) use(s, 'light'); if (fresh(s, 'heavy')) use(s, 'heavy')
    if (!a) fire(g ? 'up' : 'air')
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'mLow' : e.up ? 'up' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy')) {
    const e = s.edges.heavy; use(s, 'heavy')
    if (!a) fire(!g ? 'mAirEnd' : e.down ? 'mElephant' : e.up ? 'mLaunch' : e.fwd ? 'mAdv' : 'heavy')
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
