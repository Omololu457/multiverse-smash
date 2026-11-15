// Cyborg (cyborg) — COMMAND LAYER. Press edges come from tickCyborg (readRawControls), so keyboard, pad, replay and LAN
// feed the same reader. Uses the existing directional Special inputs; no new motion parser and no Cyborg-only pad reader.
// Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat).
// Precedence (top first): stun / cinematic → committed weapon / vent / slam → Light & command chains → Ultimate →
// directional Special (Up / Forward / Back / Down resolved BEFORE neutral) → Light → Heavy. The breaker (Block+Special in
// hitstun) is checked by game.js before this layer runs; Charge (vent) is resolved in tickCyborg and never recharges Power.
import { startMove, rekkaContinue, cancelWindowOpen, getComboScale } from './combat.js'
import { isCyborg, cyborgState, startCyMove, registerCyborgEngine, isCyborgUltActive } from './cyborgState.js'
import { CHAIN, SPECIAL_FROM, HEAVY_FROM, ULT_FROM } from './cyborgData.js'

registerCyborgEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const COMMITTED = new Set(['cSonic', 'cCannon', 'cMissile', 'cRack', 'cMega', 'cSlamAir', 'cSlamLand', 'cRecoil', 'cVent', 'cUltOpen'])

export function updateCyborgCommandCombat(f, inp, opp, W) {
  if (!isCyborg(f)) return false
  const s = cyborgState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isCyborgUltActive()) return 'consumed'
  if (a && (a._ultPose || COMMITTED.has(a.cy?.key))) return 'consumed'
  const fire = (k, o = {}) => startCyMove(f, k, W, o)
  // Forward+Heavy chain: advancing punch → fresh Heavy piston strike → fresh Heavy knock-away (confirmed Up+Heavy → launcher).
  if (a && (a.name === 'cAdv' || a.name === 'cPiston')) {
    const h = fresh(s, 'heavy') || fresh(s, 'upAttack'), k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy'
    f._rekkaNext = a.name === 'cAdv' ? 'cPiston' : (h && (k === 'upAttack' || s.edges[k].up) ? 'up' : 'cKnock')
    f._cmdHitLanded = !!a.cy?.clean
    const next = rekkaContinue(f, { edge: !!h, opponent: opp })
    if (next) { use(s, k); fire(next, { extra: { fromChain: true } }); return 'consumed' }
  }
  const contact = !!a?.cy?.clean && cancelWindowOpen(f)
  // J1 → J2 → J3: fresh Light retaps after a clean hit, three stages maximum.
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) {   // the Ultimate owns its press (consumed even when illegal)
    use(s, 'ultimate')
    if ((!a || ULT_FROM.includes(a.name)) && g && (f.energy || 0) >= 100) fire('cUltOpen', { cancel: !!a })
    return 'consumed'
  }
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special; use(s, 'special')
    if (g) fire(e.up ? 'cRack' : e.fwd ? 'cMissile' : e.back ? 'cRecoil' : e.down ? 'cMega' : 'cSonic', { cancel: !!a })
    else if (e.down && !a) fire('cSlamAir')
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'cLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    const move = !g ? 'air' : (k === 'upAttack' || e.up) ? 'up' : e.down ? 'cLow' : e.fwd && !a ? 'cAdv' : 'heavy'
    if (!a || HEAVY_FROM.includes(a.name)) fire(move, { cancel: !!a })
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
