// Robin (robin) — COMMAND LAYER. Press edges come from tickRobin (readRawControls), so keyboard, pad, replay and LAN
// feed the same reader. Uses the existing logical actions (Light / Heavy / Up-Attack / Special / Ultimate / Charge);
// no motion parser and no Robin-only pad poller. Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat).
// Precedence (top first): stun / cinematic → committed gadget / step / hack (no reads) → chain & staff cancels →
// Ultimate → Remote Override (fresh Charge with an armed bomb) → directional Special → Up-Attack → Light → Heavy.
// SPECIAL DIRECTION PRIORITY (facing-relative, sampled on the press frame): Up > Forward > Back > Down > Neutral.
// Air: Up = Rooftop Route (once per airtime), every other direction = the air Bird's-Eye Bomb (once per airtime).
// The breaker (Block + Special in hitstun) is resolved by game.js before this layer runs.
import { startMove, cancelWindowOpen, getComboScale } from './combat.js'
import { isRobin, rbState, startRbMove, registerRobinEngine, isRobinUltActive, startRemote } from './robinState.js'
import { CHAIN, STAFF_FROM, SPECIAL_FROM, ULT_FROM } from './robinData.js'

registerRobinEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const COMMITTED = new Set(['rBomb', 'rAirBomb', 'rSmoke', 'rPlant', 'rExpress', 'rRoof', 'rHack', 'rStep', 'ultOpen'])
export const specialDir = e => e.up ? 'up' : e.fwd ? 'fwd' : e.back ? 'back' : e.down ? 'down' : 'neutral'
export const GROUND_SPECIAL = { up: 'rRoof', fwd: 'rExpress', back: 'rPlant', down: 'rSmoke', neutral: 'rBomb' }

export function updateRobinCommandCombat(f, inp, opp, W) {
  if (!isRobin(f)) return false
  const s = rbState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isRobinUltActive()) return 'consumed'
  if (a && a._ultPose) return 'consumed'
  if (a && COMMITTED.has(a.rb?.key)) return 'consumed'
  const fire = (k, o = {}) => startRbMove(f, k, W, o)
  const contact = !!a?.rb?.clean && cancelWindowOpen(f)
  // Light → fresh Light → fresh Light (Punch 1 → 2 → 3) after a clean hit, three stages maximum.
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  // clean punch / low → a FRESH staff button: Heavy / Forward+Heavy / Up+Heavy
  if (contact && STAFF_FROM.includes(a.name) && (fresh(s, 'heavy') || fresh(s, 'upAttack'))) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    fire((k === 'upAttack' || e.up) ? 'up' : e.fwd ? 'rAdv' : 'heavy', { cancel: true }); return 'consumed'
  }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) {   // the Ultimate owns its press (consumed even when illegal)
    use(s, 'ultimate')
    if ((!a || ULT_FROM.includes(a.name)) && g && (f.energy || 0) >= 100) fire('ultOpen', { cancel: !!a })
    return 'consumed'
  }
  // REMOTE OVERRIDE: only a FRESH Charge press, only with an ARMED planted bomb, only from neutral.
  if (!a && fresh(s, 'charge', 1) && s.plant?.armed && !s.plant.warn && !s.l2) { use(s, 'charge'); startRemote(f, W); return 'consumed' }
  if (fresh(s, 'special') && (!a || SPECIAL_FROM.includes(a.name))) {
    const e = s.edges.special, d = specialDir(e); use(s, 'special')
    if (g) fire(GROUND_SPECIAL[d], { cancel: !!a })
    else if (!a) fire(d === 'up' ? 'rRoof' : 'rAirBomb')
    else s.cues.push('reject')
    return 'consumed'
  }
  if (fresh(s, 'upAttack')) {
    use(s, 'upAttack'); if (fresh(s, 'light')) use(s, 'light'); if (fresh(s, 'heavy')) use(s, 'heavy')
    if (!a) fire(g ? 'up' : 'air')
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'rLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy')) {
    const e = s.edges.heavy; use(s, 'heavy')
    if (!a) fire(!g ? 'air' : e.up ? 'up' : e.fwd ? 'rAdv' : e.down ? 'rLow' : 'heavy')
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
