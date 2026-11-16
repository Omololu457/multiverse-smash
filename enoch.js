// ENOCH (enoch) — COMMAND LAYER. Press edges + motion flags come from tickEnoch (readRawControls), so keyboard, pad, replay
// and LAN feed the same reader. Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat → the SHARED grab
// / throw / tech rules). Charge (L2) is HIS glide button: the shared energy charge is gated off for him in game.js.
// Motions (Elastigirl's parser, facing-relative numpad): 236236 super · 236 · 214 · 22 · 656 (= forward double-tap).
// Precedence: stun / cinematic → guard-cancel → wake-up reversal → glide controls → committed special → chains & cancels →
//   Super → Special → Heavy → Up-Attack → Light → Charge (glide / disc).
// SPECIAL:  236 = Ice Blast (Steam Burst while water is unlocked: balance zone + one of his WATER patches on screen)
//           22 = Frost Floor · 214 = Deep Freeze · 656 = Heat Lens · direction shortcuts for pads: neutral = Ice Blast,
//           Forward = Heat Lens, Down = Frost Floor, Back = Deep Freeze.
// HEAVY:    236 = Heat Lens · 214 = Scorch Sweep · 22 = Condense · 656 = Tide Break · Down = Slide · else the frost palm.
import { startMove, cancelWindowOpen, getComboScale } from './combat.js'
import { isEnoch, enState, startEnMove, registerEnochEngine, isEnochUltActive, startGlide, switchGlide, startRamp, waterUnlocked, zoneOf, check, pushThermal } from './enochState.js'
import { CHAIN, HEAVY_FROM, GLIDE, GUARD_CANCEL } from './enochData.js'

registerEnochEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
const upHeavy = s => fresh(s, 'heavy') && s.edges.heavy.tick === s.edges.upAttack?.tick   // pad Up+△ = Heavy + Up-Attack together
const COMMITTED = new Set(['iceDisc', 'tideBreak', 'super', 'wake'])
export const SPECIAL_FROM = ['jab', 'straight', 'heavy', 'low', 'rise', 'slide', 'frostFloor', 'deepFreeze', 'scorch', 'steamBurst']
export const SUPER_FROM = ['jab', 'straight', 'heavy', 'low', 'slide', 'frostFloor', 'deepFreeze', 'scorch', 'steamBurst', 'tideBreak', 'iceBlast', 'heatLens', 'condense']

export function specialKey(f, e) {
  const m = e.m || {}
  if (m.super) return 'super'
  if (m.qcb) return 'deepFreeze'
  if (m.qcf) return (waterUnlocked(f) && enState(f).field.patches.some(p => p.type === 'water')) ? 'steamBurst' : 'iceBlast'
  if (m.dd) return 'frostFloor'
  if (m.ff) return 'heatLens'
  if (e.down) return 'frostFloor'
  if (e.fwd) return 'heatLens'
  if (e.back) return 'deepFreeze'
  return 'iceBlast'
}
export function heavyKey(f, e) {
  const m = e.m || {}
  if (m.qcf) return 'heatLens'
  if (m.qcb) return 'scorch'
  if (m.dd) return 'condense'
  if (m.ff) return 'tideBreak'
  if (e.down) return 'slide'
  return 'heavy'
}
const glideType = f => (zoneOf(f) === 'hot' || !check(f, 'ice').ok) ? 'fire' : 'ice'

export function updateEnochCommandCombat(f, inp, opp, W) {
  if (!isEnoch(f)) return false
  const s = enState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  const fire = (k, o = {}) => startEnMove(f, k, W, o)
  if (f.hitstop > 0 || f.isGrabbed || f.health <= 0 || isEnochUltActive()) return 'consumed'
  // GUARD CANCEL: Charge in blockstun → a glide out (25 thermal, 8 invulnerable frames, 10 s cooldown)
  if (f.blockstun > 0) {
    if (fresh(s, 'charge', 4) && s.cd.guard <= 0 && g) {
      use(s, 'charge')
      const type = glideType(f), dir = s.edges.charge.fwd ? (f.facing || 1) : -(f.facing || 1)
      if (check(f, type).ok) {
        f.blockstun = 0; f.isBlocking = false; f.invulnTimer = Math.max(f.invulnTimer || 0, GUARD_CANCEL.invuln); s.cd.guard = GUARD_CANCEL.cooldown
        pushThermal(f, (type === 'ice' ? -1 : 1) * GUARD_CANCEL.thermal); s.stats.guardCancels++
        startGlide(f, s, type, dir, 'guard')
      }
    }
    return 'consumed'
  }
  if (f.hitstun > 0 || f.knockdownState) return 'consumed'
  if (a && a._ultPose) return 'consumed'
  // WAKE-UP REVERSAL: an attack pressed as he gets up (6 invulnerable frames, −12 on block)
  if (s.wakeWin > 0 && !a && g && (fresh(s, 'light', 12) || fresh(s, 'heavy', 12) || fresh(s, 'upAttack', 12))) {
    use(s, 'light'); use(s, 'heavy'); use(s, 'upAttack'); s.wakeWin = 0; fire('wake'); return 'consumed'
  }
  // GLIDE controls (the glide itself runs in enochLocked)
  if (s.glide) {
    if (fresh(s, 'up', 4) || fresh(s, 'jump', 4)) { use(s, 'up'); use(s, 'jump'); startRamp(f, s); return 'consumed' }
    if (fresh(s, 'light')) { use(s, 'light'); fire('slide', { bonus: GLIDE.atkBonus }); return 'consumed' }
    if (fresh(s, 'special')) { use(s, 'special'); switchGlide(f, s, 'ice'); return 'consumed' }
    if (fresh(s, 'heavy')) { use(s, 'heavy'); switchGlide(f, s, 'fire'); return 'consumed' }
    if (fresh(s, 'charge') && s.edges.charge.down) { use(s, 'charge'); fire('iceDisc'); return 'consumed' }
    return 'consumed'
  }
  // RAMP: one air attack, +10 %
  if (s.ramp && !g && !a && s.ramp.air > 0 && (fresh(s, 'light') || fresh(s, 'heavy') || fresh(s, 'upAttack'))) {
    use(s, 'light'); use(s, 'heavy'); use(s, 'upAttack'); s.ramp.air = 0; fire('air', { bonus: GLIDE.atkBonus }); return 'consumed'
  }
  if (a && COMMITTED.has(a.en?.key)) return 'consumed'
  const contact = !!a?.en?.clean && cancelWindowOpen(f)
  if (contact && CHAIN[a.name] && fresh(s, 'light')) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  if (contact && fresh(s, 'special') && SUPER_FROM.includes(a.name) && specialKey(f, s.edges.special) === 'super') {
    use(s, 'special'); if ((f.energy || 0) >= 100) fire('super', { cancel: true }); return 'consumed'
  }
  if (contact && SPECIAL_FROM.includes(a.name) && fresh(s, 'special')) { const k = specialKey(f, s.edges.special); use(s, 'special'); if (k !== a.name) fire(k, { cancel: true }); return 'consumed' }
  if (contact && fresh(s, 'heavy')) {
    const k = heavyKey(f, s.edges.heavy)
    if (k === 'heavy' ? HEAVY_FROM.includes(a.name) : (SPECIAL_FROM.includes(a.name) && k !== a.name)) { use(s, 'heavy'); fire(k, { cancel: true }); return 'consumed' }
  }
  if (contact && a.name === 'heavy' && fresh(s, 'upAttack')) { use(s, 'upAttack'); return 'consumed' }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); if (!a && g && (f.energy || 0) >= 100) fire('super'); return 'consumed' }   // Ultimate button = the super too
  if (fresh(s, 'special') && !a) { const k = specialKey(f, s.edges.special); use(s, 'special'); if (g) fire(k); return 'consumed' }
  if (fresh(s, 'upAttack') && upHeavy(s)) { use(s, 'upAttack'); use(s, 'heavy'); if (!a) fire(g ? 'rise' : 'air'); return 'consumed' }
  if (fresh(s, 'heavy') && !a) { const e = s.edges.heavy; use(s, 'heavy'); fire(!g ? 'air' : e.up ? 'rise' : heavyKey(f, e)); return 'consumed' }
  if (fresh(s, 'upAttack')) { use(s, 'upAttack'); if (fresh(s, 'light')) use(s, 'light'); if (!a) fire(g ? 'rise' : 'air'); return 'consumed' }
  if (fresh(s, 'light')) { const e = s.edges.light; use(s, 'light'); if (!a) fire(!g ? 'air' : e.down ? 'low' : 'jab'); return 'consumed' }
  // CHARGE: Down + Charge = Ice Disc; Charge held on the ground = glide (ice; fire when he runs hot / ice is locked)
  if (fresh(s, 'charge') && !a && g) {
    use(s, 'charge')
    if (s.edges.charge.down) fire('iceDisc')
    else startGlide(f, s, glideType(f), f.facing || 1, 'charge')
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
