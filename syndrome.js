// SYNDROME (syndrome) — COMMAND LAYER. Press edges come from tickSyndrome (readRawControls), so keyboard, pad, replay and
// LAN feed the same reader. Existing logical actions only (Light / Heavy / Up-Attack / Special / Ultimate / Charge (L2) /
// Grab / Block); no Syndrome-only pad poller and no motion parser. Returns 'consumed' | 'grab' (game.js passes only the
// grab to updateCombat → the SHARED grab / throw / tech rules).
// Precedence (top first): stun / cinematic → committed command gesture (no reads) → chain & heavy cancels → Ultimate →
// L2-MODIFIED Special → Special → Up-Attack → Light → Heavy.
// SPECIAL DIRECTION PRIORITY (facing-relative, sampled on the press frame): Up > Forward > Back > Down > Neutral.
// L2 MODIFIER: R1 pressed while L2 is held (or L2 pressed in the same 4-frame window) selects the modified table and
// OVERRIDES the unmodified command. One command per fresh R1 press.
import { startMove, cancelWindowOpen, getComboScale } from './combat.js'
import { isSyndrome, syState, startSyMove, registerSyndromeEngine, isSyndromeUltActive } from './syndromeState.js'
import { CHAIN, HEAVY_FROM, SPECIAL_FROM, ULT_FROM } from './syndromeData.js'

registerSyndromeEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
// Pad trap: the shared pad reader reports Up+△ as Heavy AND Up-Attack on the same tick → that pair is Up+Heavy.
const upHeavy = s => fresh(s, 'heavy') && s.edges.heavy.tick === s.edges.upAttack?.tick
const COMMITTED = new Set(['sDuet', 'sSpin', 'sVelo', 'sTurret', 'sTurretMs', 'sTurretMortar', 'sHammer', 'sRise', 'sSweep', 'sZero', 'ultOpen'])
export const specialDir = e => e.up ? 'up' : e.fwd ? 'fwd' : e.back ? 'back' : e.down ? 'down' : 'neutral'
export const SPECIAL = { neutral: 'sDuet', fwd: 'sSpin', up: 'sVelo', down: 'sTurret', back: 'sHammer' }
export const MOD_SPECIAL = { neutral: 'sZero', fwd: 'sTurretMortar', up: 'sRise', down: 'sTurretMs', back: 'sSweep' }
const modHeld = (s, e) => e.mod || s.prev.charge || (s.edges.charge && Math.abs(s.edges.charge.clock - e.clock) <= 4)

export function updateSyndromeCommandCombat(f, inp, opp, W) {
  if (!isSyndrome(f)) return false
  const s = syState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || isSyndromeUltActive()) return 'consumed'
  if (a && a._ultPose) return 'consumed'
  const fire = (k, o = {}) => startSyMove(f, k, W, o)
  if (a && COMMITTED.has(a.sy?.key)) return 'consumed'
  const contact = !!a?.sy?.clean && cancelWindowOpen(f)
  // Square → fresh Square → fresh Square (Spinner snap → Drone crossing → Spinner pass) after clean hits, 3 stages max
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  // clean light / low → a fresh Triangle (claw drive) or Up+Triangle (rising claw)
  if (contact && HEAVY_FROM.includes(a.name) && (fresh(s, 'heavy') || fresh(s, 'upAttack'))) {
    const up = fresh(s, 'upAttack') || s.edges.heavy?.up; use(s, 'heavy'); use(s, 'upAttack')
    fire(up ? 'sLaunch' : 'heavy', { cancel: true }); return 'consumed'
  }
  if (contact && ULT_FROM.includes(a.name) && fresh(s, 'ultimate')) {
    use(s, 'ultimate'); if (g && (f.energy || 0) >= 100) fire('ultOpen', { cancel: true }); return 'consumed'
  }
  if (contact && SPECIAL_FROM.includes(a.name) && fresh(s, 'special')) {
    const e = s.edges.special, d = specialDir(e), mod = modHeld(s, e); use(s, 'special'); if (mod) use(s, 'charge')
    if (g) fire((mod ? MOD_SPECIAL : SPECIAL)[d], { cancel: true, mod })
    return 'consumed'
  }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) {   // the Ultimate owns its press (consumed even when illegal)
    use(s, 'ultimate')
    if (!a && g && (f.energy || 0) >= 100) fire('ultOpen')
    return 'consumed'
  }
  if (fresh(s, 'special') && !a) {
    const e = s.edges.special, d = specialDir(e), mod = modHeld(s, e); use(s, 'special'); if (mod) use(s, 'charge')
    fire((mod ? MOD_SPECIAL : SPECIAL)[d], { mod })
    return 'consumed'
  }
  if (fresh(s, 'upAttack') && upHeavy(s)) {   // pad Up+△ → the launcher (air: the downward machine strike)
    use(s, 'upAttack'); use(s, 'heavy'); if (fresh(s, 'light')) use(s, 'light')
    if (!a) fire(g ? 'sLaunch' : 'sDownAir')
    return 'consumed'
  }
  if (fresh(s, 'upAttack')) {
    use(s, 'upAttack'); if (fresh(s, 'light')) use(s, 'light'); if (fresh(s, 'heavy')) use(s, 'heavy')
    if (!a) fire(g ? 'sLaunch' : 'air')
    return 'consumed'
  }
  if (fresh(s, 'light')) {
    const e = s.edges.light; use(s, 'light')
    if (!a) fire(!g ? 'air' : e.down ? 'sLow' : 'light')
    return 'consumed'
  }
  if (fresh(s, 'heavy')) {
    const e = s.edges.heavy; use(s, 'heavy')
    if (!a) fire(!g ? 'sDownAir' : e.up ? 'sLaunch' : 'heavy')
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
