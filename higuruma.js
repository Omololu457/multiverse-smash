// Hiromi Higuruma (higuruma) — COMMAND LAYER. Press edges come from tickHiguruma (readRawControls), so keyboard, pad,
// replay and LAN feed the same reader. Uses the existing logical actions (Light / Heavy / Up-Attack / Special /
// Ultimate); no motion parser and no Higuruma-only pad poller. Returns 'consumed' | 'grab'.
// Precedence (top first): stun / cinematic → committed special (no reads) → chain / heavy / special cancels on a CLEAN
// hit → Ultimate → directional Special → Up-Attack → Light → Heavy.
// DIRECTIONS are facing-relative and sampled on the press frame. SPECIAL priority: Up > Forward > Back > Down > Neutral.
// HEAVY priority: Up > Down > Forward > Neutral. LIGHT: Down → low check, otherwise the chain starter.
// Air: Light / Heavy = the rising air swing; Up + Special = Rising Objection (once per airtime); other air specials are
// refused (cue, nothing spent). Precedent (dash cancel) lives in higurumaLocked (the movement lock), not here.
import { startMove, cancelWindowOpen, getComboScale } from './combat.js'
import { isHiguruma, hgState, startHgMove, registerHigurumaEngine, isHigurumaUltActive } from './higurumaState.js'
import { CHAIN, HEAVY_FROM, SPECIAL_FROM, ULT_FROM } from './higurumaData.js'

registerHigurumaEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { s.used[k] = s.edges[k].tick }
const COMMITTED = new Set(['hExt', 'hCross', 'hRise', 'hOrder', 'hObj', 'hObjHit', 'ultOpen'])
export const specialDir = e => e.up ? 'up' : e.fwd ? 'fwd' : e.back ? 'back' : e.down ? 'down' : 'neutral'
export const heavyDir = e => e.up ? 'up' : e.down ? 'hSweep' : e.fwd ? 'hPoke' : 'heavy'
export const GROUND_SPECIAL = { up: 'hRise', fwd: 'hCross', back: 'hObj', down: 'hOrder', neutral: 'hExt' }

export function updateHigurumaCommandCombat(f, inp, opp, W) {
  if (!isHiguruma(f)) return false
  const s = hgState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isHigurumaUltActive()) return 'consumed'
  if (a && a._ultPose) return 'consumed'
  if (a && COMMITTED.has(a.hg?.key)) return 'consumed'
  const fire = (k, o = {}) => startHgMove(f, k, W, o)
  const contact = !!a?.hg?.clean && cancelWindowOpen(f)
  // small-gavel chain: Light → fresh Light → fresh Light after a CLEAN hit, three stages maximum
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  // clean small-gavel hit → a FRESH Heavy family press (extended poke / launcher / giant gavel)
  if (contact && HEAVY_FROM.includes(a.name) && (fresh(s, 'heavy') || fresh(s, 'upAttack'))) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    fire(k === 'upAttack' ? 'up' : heavyDir(e), { cancel: true }); return 'consumed'
  }
  if (contact && fresh(s, 'ultimate') && ULT_FROM.includes(a.name)) {
    use(s, 'ultimate'); if (g && (f.energy || 0) >= 100) fire('ultOpen', { cancel: true }); return 'consumed'
  }
  if (contact && SPECIAL_FROM.includes(a.name) && fresh(s, 'special') && g) {
    const d = specialDir(s.edges.special); use(s, 'special'); fire(GROUND_SPECIAL[d], { cancel: true }); return 'consumed'
  }
  if (a) return 'consumed'
  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (fresh(s, 'ultimate')) {   // the Ultimate owns its press (consumed even when illegal: grounded, 100 energy)
    use(s, 'ultimate')
    if (g && (f.energy || 0) >= 100) fire('ultOpen'); else s.cues.push('reject')
    return 'consumed'
  }
  if (fresh(s, 'special')) {
    const d = specialDir(s.edges.special); use(s, 'special')
    if (g) fire(GROUND_SPECIAL[d])
    else if (d === 'up') fire('hRise')
    else { s.stats.rejects++; s.cues.push('reject') }
    return 'consumed'
  }
  if (fresh(s, 'upAttack')) {
    use(s, 'upAttack'); if (fresh(s, 'light')) use(s, 'light'); if (fresh(s, 'heavy')) use(s, 'heavy')
    fire(g ? 'up' : 'air')
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    fire(!g ? 'air' : e.down ? 'hLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy')) {
    const e = s.edges.heavy; use(s, 'heavy')
    fire(!g ? 'air' : heavyDir(e))
    return 'consumed'
  }
  return 'grab'
}
