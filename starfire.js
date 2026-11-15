// Starfire (starfire): COMMAND LAYER.
// - Press edges come from tickStarfire (readRawControls), so keyboard, pad, replay and LAN all feed the same reader.
// - Uses the existing logical buttons and directional Special inputs (PS5: □ Light, △ Heavy, R1 Special, R2 Ultimate,
//   L1 Grab, L2 Charge = levitation toggle). No motion parser, no Starfire-only pad reader.
// - Returns 'consumed' | 'grab'. game.js passes only the grab on to updateCombat.
//
// Precedence, top first:
//   1. menu / cinematic / stun ownership (game.js already checked the shared breaker, Block+Special in hitstun)
//   2. Ultimate (owns its press, even when illegal)
//   3. committed specials
//   4. Light chain J1 → J2 → J3 (clean-hit retaps)
//   5. directional Special (Up / Forward / Back / Down, resolved BEFORE neutral)
//   6. neutral Special
//   7. Light, then Heavy
// Ordinary movement and jump stay in physics.js (the shared double jump). L2 / Charge is resolved in tickStarfire.
import { startMove, cancelWindowOpen, getComboScale, getHurtbox } from './combat.js'
import { isStarfire, starfireState, startSfMove, registerStarfireEngine, isStarfireUltActive } from './starfireState.js'
import { CHAIN, SPECIAL_FROM, HEAVY_FROM, ULT_FROM } from './starfireData.js'

registerStarfireEngine({ startMove, comboScale: getComboScale, hurtbox: getHurtbox })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const COMMITTED = new Set(['sfBolt', 'sfComet', 'sfRush', 'sfSky', 'sfOrb', 'sfLaser', 'sfAirLaser', 'sfUltOpen'])

export function updateStarfireCommandCombat(f, inp, opp, W) {
  if (!isStarfire(f)) return false
  const s = starfireState(f), g = !!(f.onGround || f.grounded) && !s.lev, a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isStarfireUltActive()) return 'consumed'
  if (a?._ultPose) return 'consumed'
  const fire = (k, o = {}) => startSfMove(f, k, W, o)
  const contact = !!a?.sf?.clean && cancelWindowOpen(f)
  // 2. Ultimate: grounded, 100 Energy, from neutral or from a clean Heavy / J3 recovery.
  if (fresh(s, 'ultimate')) {
    use(s, 'ultimate')
    if ((!a || (ULT_FROM.includes(a.name) && contact)) && g && (f.energy || 0) >= 100) fire('sfUltOpen', { cancel: !!a })
    return 'consumed'
  }
  // 3. committed specials
  if (a && COMMITTED.has(a.sf?.key)) return 'consumed'
  // 4. J1 → J2 → J3
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  // 5 / 6. Special family: directional first, then neutral.
  // Grounded: Up = Skybreak, Forward = Solar Rush, Back = Star Sight, Down = Orbital Star, neutral = Starbolt.
  // Airborne / levitating: Up = Skybreak (once per airtime), Back = air Star Sight (once per airtime),
  // neutral / Forward = Comet Shot (once per airtime), Down = no move (reject cue).
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special; use(s, 'special')
    if (g) fire(e.up ? 'sfSky' : e.fwd ? 'sfRush' : e.back ? 'sfLaser' : e.down ? 'sfOrb' : 'sfBolt', { cancel: !!a })
    else if (!a) {
      if (e.up) fire('sfSky')
      else if (e.back) fire('sfAirLaser')
      else if (e.down) { s.stats.rejects++; s.lastReject = 'airDown'; s.cues.push('reject') }
      else fire('sfComet')
    }
    return 'consumed'
  }
  // 7. Light, then Heavy.
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'sfLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    const move = !g ? 'air' : (k === 'upAttack' || e.up) ? 'up' : e.down ? 'sfLow' : 'heavy'
    if (!a || HEAVY_FROM.includes(a.name)) fire(move, { cancel: !!a })
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
