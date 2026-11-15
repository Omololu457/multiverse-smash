// Raven (raven): COMMAND LAYER.
// - Press edges come from tickRaven (readRawControls), so keyboard, pad, replay and LAN all feed the same reader.
// - Uses the existing logical buttons and directional Special inputs. No motion parser, no Raven-only pad reader.
// - Returns 'consumed' | 'grab'. game.js passes only the grab on to updateCombat.
//
// Precedence, top first:
//   1. menu / cinematic / stun ownership (game.js already checked the shared breaker, Block+Special in hitstun)
//   2. Ultimate (owns its press, even when illegal)
//   3. active Soul Shell control (a fresh Special ends it early through Shield End; nothing else acts)
//   4. committed spells
//   5. Light and command chains
//   6. directional Special (Up / Forward / Back / Down, resolved BEFORE neutral)
//   7. neutral Special
//   8. Light, then Heavy
// Ordinary movement and jump stay in physics.js (the shared double jump).
// L2 / Charge (the levitation toggle) is resolved in tickRaven and never recharges Energy.
import { startMove, rekkaContinue, cancelWindowOpen, getComboScale } from './combat.js'
import { isRaven, ravenState, startRvMove, registerRavenEngine, isRavenUltActive, ravenShellEnd } from './ravenState.js'
import { CHAIN, SPECIAL_FROM, HEAVY_FROM, ULT_FROM } from './ravenData.js'

registerRavenEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const COMMITTED = new Set(['rPulse', 'rAirPulse', 'rLift', 'rSend', 'rConjure', 'rVerdict', 'rUltOpen'])

export function updateRavenCommandCombat(f, inp, opp, W) {
  if (!isRaven(f)) return false
  const s = ravenState(f), g = !!(f.onGround || f.grounded) && !s.lev, a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isRavenUltActive()) return 'consumed'
  if (a?._ultPose) return 'consumed'
  const fire = (k, o = {}) => startRvMove(f, k, W, o)
  const contact = !!a?.rv?.clean && cancelWindowOpen(f)
  // 2. Ultimate: grounded, 100 Energy, from neutral or from a clean Heavy / J3 / chain recovery.
  if (fresh(s, 'ultimate')) {
    use(s, 'ultimate')
    if ((!a || (ULT_FROM.includes(a.name) && contact)) && g && (f.energy || 0) >= 100) fire('rUltOpen', { cancel: !!a })
    return 'consumed'
  }
  // 3. active Soul Shell owns input: only a fresh Special retap acts (early end through the real Shield End).
  if (a?.rv?.key === 'rShield') {
    if (fresh(s, 'special')) { use(s, 'special'); ravenShellEnd(f, 'retap') }
    return 'consumed'
  }
  // 4. committed spells
  if (a && COMMITTED.has(a.rv?.key)) return 'consumed'
  // 5. Forward+Heavy chain: advancing palm → fresh Heavy dark strike → fresh Heavy knock-away (confirmed Up+Heavy → launcher).
  if (a && (a.name === 'rAdv' || a.name === 'rDark')) {
    const h = fresh(s, 'heavy') || fresh(s, 'upAttack'), k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy'
    f._rekkaNext = a.name === 'rAdv' ? 'rDark' : (h && (k === 'upAttack' || s.edges[k].up) ? 'up' : 'rKnock')
    f._cmdHitLanded = !!a.rv?.clean
    const next = rekkaContinue(f, { edge: !!h, opponent: opp })
    if (next) { use(s, k); fire(next, { extra: { fromChain: true } }); return 'consumed' }
  }
  // J1 → J2 → J3: fresh Light retaps after a clean hit, three stages maximum.
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  // 6 / 7. Special family: directional first, then neutral.
  // - Airborne (or levitating), neutral or horizontal Special = the dedicated midair Dark Pulse.
  // - Airborne Up / Down Special does nothing.
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special; use(s, 'special')
    if (g) {
      const idle = s.piles.some(p => p.state === 'idle')
      fire(e.up ? 'rVerdict' : e.fwd ? (idle ? 'rSend' : 'rConjure') : e.back ? 'rShield' : e.down ? 'rLift' : 'rPulse', { cancel: !!a })
    } else if (!a && !e.up && !e.down) fire('rAirPulse')
    return 'consumed'
  }
  // 8. Light, then Heavy.
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'rLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    const move = !g ? 'air' : (k === 'upAttack' || e.up) ? 'up' : e.down ? 'rLow' : e.fwd && !a ? 'rAdv' : 'heavy'
    if (!a || HEAVY_FROM.includes(a.name)) fire(move, { cancel: !!a })
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
