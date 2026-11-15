// FROZONE (frozone) — COMMAND LAYER. Press edges come from tickFrozone (readRawControls), so keyboard, pad, replay and LAN
// feed the same reader. Existing logical actions only (Light / Heavy / Up-Attack / Special / Ultimate / Grab / Block /
// Charge untouched); no Frozone-only pad poller and no motion parser. Returns 'consumed' | 'grab' (game.js passes only
// the grab to updateCombat → the SHARED grab / throw / tech rules; Charge (L2) stays the shared energy charge).
// Precedence (top first): stun / cinematic → committed special (no reads) → chain & cancels → Ultimate → Special →
// Up-Attack → Light → Heavy.
// SPECIAL DIRECTION PRIORITY (facing-relative, sampled on the press frame): Up > Forward > Back > Down > Neutral.
import { startMove, cancelWindowOpen, getComboScale } from './combat.js'
import { isFrozone, fzState, startFzMove, registerFrozoneEngine, isFrozoneUltActive } from './frozoneState.js'
import { CHAIN, HEAVY_FROM, SPECIAL_FROM, ULT_FROM } from './frozoneData.js'

registerFrozoneEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
// Pad trap: the shared pad reader reports Up+△ as Heavy AND Up-Attack on the same tick → that pair is Up+Heavy.
const upHeavy = s => fresh(s, 'heavy') && s.edges.heavy.tick === s.edges.upAttack?.tick
const COMMITTED = new Set(['fLance', 'fRush', 'fRise', 'fBlackIce', 'fBreaker', 'ultOpen'])
export const specialDir = e => e.up ? 'up' : e.fwd ? 'fwd' : e.back ? 'back' : e.down ? 'down' : 'neutral'
export const SPECIAL = { neutral: 'fLance', fwd: 'fRush', up: 'fRise', down: 'fBlackIce', back: 'fBreaker' }

export function updateFrozoneCommandCombat(f, inp, opp, W) {
  if (!isFrozone(f)) return false
  const s = fzState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isFrozoneUltActive()) return 'consumed'
  if (a && a._ultPose) return 'consumed'
  const fire = (k, o = {}) => startFzMove(f, k, W, o)
  if (a && COMMITTED.has(a.fz?.key)) return 'consumed'
  const contact = !!a?.fz?.clean && cancelWindowOpen(f)
  // Square → fresh Square → fresh Square after clean hits (three stages maximum)
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  // clean light / low → fresh Triangle (heavy) or Up+Triangle (launcher)
  if (contact && HEAVY_FROM.includes(a.name) && (fresh(s, 'heavy') || fresh(s, 'upAttack'))) {
    const up = fresh(s, 'upAttack') || s.edges.heavy?.up; use(s, 'heavy'); use(s, 'upAttack')
    fire(up ? 'fLaunch' : 'heavy', { cancel: true }); return 'consumed'
  }
  if (contact && ULT_FROM.includes(a.name) && fresh(s, 'ultimate')) {
    use(s, 'ultimate'); if (g && (f.energy || 0) >= 100) fire('ultOpen', { cancel: true }); return 'consumed'
  }
  if (contact && SPECIAL_FROM.includes(a.name) && fresh(s, 'special')) {
    const d = specialDir(s.edges.special); use(s, 'special'); fire(SPECIAL[d], { cancel: true })
    return 'consumed'
  }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) {   // the Ultimate owns its press (consumed even when illegal)
    use(s, 'ultimate')
    if (!a && g && (f.energy || 0) >= 100) fire('ultOpen')
    return 'consumed'
  }
  if (fresh(s, 'special') && !a) { const d = specialDir(s.edges.special); use(s, 'special'); fire(SPECIAL[d]); return 'consumed' }
  if (fresh(s, 'upAttack') && upHeavy(s)) {   // pad Up+△ → the launcher (air: the down-air strike)
    use(s, 'upAttack'); use(s, 'heavy'); if (fresh(s, 'light')) use(s, 'light')
    if (!a) fire(g ? 'fLaunch' : 'fDownAir')
    return 'consumed'
  }
  if (fresh(s, 'upAttack')) {
    use(s, 'upAttack'); if (fresh(s, 'light')) use(s, 'light'); if (fresh(s, 'heavy')) use(s, 'heavy')
    if (!a) fire(g ? 'fLaunch' : 'air')
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'fLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy')) {
    const e = s.edges.heavy; use(s, 'heavy')
    if (!a) fire(!g ? 'fDownAir' : e.up ? 'fLaunch' : 'heavy')
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
