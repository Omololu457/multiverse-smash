// ENOCH (enoch) — COMMAND LAYER. Press edges + motion flags come from tickEnoch (readRawControls), so keyboard, pad, replay
// and LAN feed the same reader. Returns 'consumed' | 'grab' (game.js passes only the grab to updateCombat → the SHARED grab
// / throw / tech rules). Charge (L2) is HIS glide button: the shared energy charge is gated off for him in game.js.
// Motions (Elastigirl's parser, facing-relative numpad): 236236 super · 623 · 236 · 214 · 22 · 656 (= forward double-tap).
// Precedence: stun / cinematic → guard-cancel → wake-up reversal → glide controls → committed special → chains & cancels →
//   Super → Special → Heavy → Up-Attack → Light → Charge (glide / disc).
// SPECIAL:  236 = Ice Blast (Steam Burst while water is unlocked: balance zone + one of his WATER patches on screen)
//           623 = ICE WALL · 22 = Frost Floor · 214 = Deep Freeze · 656 = Heat Lens · pad shortcuts: neutral = Ice Blast,
//           Forward = Heat Lens, Down = Frost Floor, Back = Deep Freeze.
// LIGHT:    Jab (Forward + Light = Straight; Down + Light = low sweep); a clean Heat Lens links into Light.
// GLIDE:    a motion + Special / Heavy fires that special out of the glide (+10 %); plain Special / Heavy switch ice / fire.
// HEAVY:    623 = FIRE WALL · 236 = Heat Lens · 214 = Scorch Sweep · 22 = Condense · 656 = Tide Break · Down = Slide ·
//           Back = a wall of his zone (hot → Fire Wall, else Ice Wall) · else the frost palm.
// HEAT LENS: the Homelander / Superman laser gauge (beam.js): tap = a 12-frame burst, hold Special = sustained, locks on;
//           hold Up / Down to sweep by hand. Release → 1 s cooldown; running the gauge dry → 2.5 s overheat.
import { startMove, cancelWindowOpen, getComboScale } from './combat.js'
import { twinOf, isEnoch, enState, startEnMove, registerEnochEngine, isEnochUltActive, switchGlide, startRamp, waterUnlocked, zoneOf, check, toggleStance, setMode } from './enochState.js'
import { updateFrozoneCommandCombat } from './frozone.js'
import { CHAIN, HEAVY_FROM, GLIDE, GUARD_CANCEL, FLOW } from './enochData.js'

registerEnochEngine({ startMove, comboScale: getComboScale })

const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
const upHeavy = s => fresh(s, 'heavy') && s.edges.heavy.tick === s.edges.upAttack?.tick   // pad Up+△ = Heavy + Up-Attack together
const COMMITTED = new Set(['iceDisc', 'tideBreak', 'super', 'wake'])
export const LINK_TO_NORMAL = ['heatLens']
export const SPECIAL_FROM = ['jab', 'straight', 'heavy', 'low', 'rise', 'slide', 'frostFloor', 'deepFreeze', 'scorch', 'steamBurst', 'air', 'iceBlast', 'meteor', 'fireMeteor']
export const SUPER_FROM = ['jab', 'straight', 'heavy', 'low', 'slide', 'frostFloor', 'deepFreeze', 'scorch', 'steamBurst', 'tideBreak', 'iceBlast', 'heatLens', 'condense', 'iceWall', 'fireWall']

const meteorKey = f => twinOf(f) === 'fire' ? 'fireMeteor' : 'meteor'
export function specialKey(f, e) {
  const m = e.m || {}
  if (m.super) return 'super'
  if (m.dp) return 'iceWall'
  if (m.qcb) return 'deepFreeze'
  if (m.qcf) return (waterUnlocked(f) && enState(f).field.patches.some(p => p.type === 'water')) ? 'steamBurst' : 'iceBlast'
  if (m.dd) return 'frostFloor'
  if (m.ff) return 'heatLens'
  if (e.up || e.jmp) return meteorKey(f)       // Up + Special = the ICE SPIKE (hot: the FIRE RAIN)
  if (e.down) return 'frostFloor'
  if (e.fwd) return 'heatLens'
  if (e.back) return 'deepFreeze'
  return (waterUnlocked(f) && enState(f).field.patches.some(p => p.type === 'water')) ? 'steamBurst' : 'iceBlast'
}
export function heavyKey(f, e) {
  const m = e.m || {}
  if (m.dp) return 'fireWall'
  if (m.qcf) return 'heatLens'
  if (m.qcb) return 'scorch'
  if (m.dd) return 'condense'
  if (m.ff) return 'tideBreak'
  if (e.down) return 'slide'
  if (e.fwd) return twinOf(f) === 'ice' ? 'iceWall' : 'fireWall'   // Forward + Heavy = FIRE WALL (an ICE WALL in ice mode)
  if (e.back) return twinOf(f) === 'fire' ? 'fireWall' : 'iceWall'   // Back + Heavy = ICE WALL (FIRE WALL in fire mode)
  return 'heavy'
}

export function updateEnochCommandCombat(f, inp, opp, W) {
  if (!isEnoch(f)) return false
  const s = enState(f), g = !!(f.onGround || f.grounded), a = f.attacking ? f.currentAttack : null
  const fire = (k, o = {}) => startEnMove(f, k, W, o)
  if (f.hitstop > 0 || f.isGrabbed || f.health <= 0 || isEnochUltActive()) return 'consumed'
  if (f.blockstun > 0) return 'consumed'   // the guard cancel runs in tickEnoch (game.js skips this layer in blockstun)
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
    // a MOTION special / heavy fires out of the glide (+10 %); a plain Special / Heavy switches the glide's element
    const mo = e => e && e.m && (e.m.super || e.m.dp || e.m.qcf || e.m.qcb || e.m.dd || e.m.ff)
    if (fresh(s, 'special') && mo(s.edges.special)) { const k = specialKey(f, s.edges.special); use(s, 'special'); if (k !== 'super' || (f.energy || 0) >= 100) fire(k, { bonus: GLIDE.atkBonus }); return 'consumed' }
    if (fresh(s, 'heavy') && mo(s.edges.heavy)) { const k = heavyKey(f, s.edges.heavy); use(s, 'heavy'); fire(k, { bonus: GLIDE.atkBonus }); return 'consumed' }
    if (fresh(s, 'special')) { use(s, 'special'); if (s.mode !== 'ice') setMode(f, 'ice'); return 'consumed' }   // = a MODE switch (energy), the glide follows
    if (fresh(s, 'heavy')) { use(s, 'heavy'); if (s.mode !== 'fire') setMode(f, 'fire'); return 'consumed' }
    if (fresh(s, 'charge') && s.edges.charge.down) { use(s, 'charge'); fire('iceDisc'); return 'consumed' }
    return 'consumed'
  }
  // MODES: Down + Charge = ICE MODE, Up + Charge = FIRE MODE — one press, instant (energy bar), any time: mid-move the
  // move plays on; out of a move that hit / was blocked it's also a CANCEL (an ice move flows into a fire move)
  if (fresh(s, 'charge', FLOW.buffer) && (s.edges.charge.down || s.edges.charge.up) && !(a && COMMITTED.has(a.en?.key))) {
    const e = s.edges.charge; use(s, 'charge')
    if (setMode(f, e.down ? 'ice' : 'fire') && a?.en && (a.en.clean || a.en.blocked) && cancelWindowOpen(f)) {
      f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0; s.stats.modeCancels = (s.stats.modeCancels || 0) + 1
    }
    return 'consumed'
  }
  // ICE STANCE: every press goes to Frozone's own command layer (his inputs, his precedence); Charge: Down = Ice Disc, else back
  if (s.stance === 'ice') {
    if (fresh(s, 'charge') && !a && g) { use(s, 'charge'); const e = s.edges.charge; if (e.fwd) fire('iceDisc'); else if (e.back) fire('snowman'); else if (!e.down && !e.up) toggleStance(f); return 'consumed' }   // Down / Up + Charge = the channel (tickEnoch)
    return updateFrozoneCommandCombat(f, inp, opp, W) || 'consumed'
  }
  // RAMP: one air attack, +10 %
  if (s.ramp && !g && !a && s.ramp.air > 0 && (fresh(s, 'light') || fresh(s, 'heavy') || fresh(s, 'upAttack'))) {
    use(s, 'light'); use(s, 'heavy'); use(s, 'upAttack'); s.ramp.air = 0; fire('air', { bonus: GLIDE.atkBonus }); return 'consumed'
  }
  const contact = !!(a?.en?.clean || a?.en?.blocked) && cancelWindowOpen(f), B = FLOW.buffer   // hit OR block opens the cancel
  // the SUPER cancels out of any clean special, committed ones included (Tide Break → Thermal Shock is the brief's combo 5)
  if (contact && fresh(s, 'special', B) && SUPER_FROM.includes(a.name) && specialKey(f, s.edges.special) === 'super') {
    use(s, 'special'); if ((f.energy || 0) >= 100) fire('super', { cancel: true }); return 'consumed'
  }
  if (a && COMMITTED.has(a.en?.key)) return 'consumed'
  if (contact && CHAIN[a.name] && fresh(s, 'light', B)) { use(s, 'light'); fire(CHAIN[a.name], { cancel: true }); return 'consumed' }
  if (contact && LINK_TO_NORMAL.includes(a.name) && fresh(s, 'light', B)) { const e = s.edges.light; use(s, 'light'); fire(e.fwd ? 'straight' : 'jab', { cancel: true }); return 'consumed' }   // a clean Heat Lens → Straight / Jab
  if (contact && SPECIAL_FROM.includes(a.name) && fresh(s, 'special', B)) { const k = g ? specialKey(f, s.edges.special) : meteorKey(f); use(s, 'special'); if (k !== a.name) fire(k, { cancel: true }); return 'consumed' }
  if (contact && fresh(s, 'heavy', B)) {
    const k = heavyKey(f, s.edges.heavy)
    if (k === 'heavy' ? HEAVY_FROM.includes(a.name) : (SPECIAL_FROM.includes(a.name) && k !== a.name)) { use(s, 'heavy'); fire(k, { cancel: true }); return 'consumed' }
  }
  if (contact && a.name === 'heavy' && fresh(s, 'upAttack')) { use(s, 'upAttack'); return 'consumed' }
  // JUMP CANCEL (on a hit): straight up out of the normal — into the air chain, an air attack or the meteor
  if (contact && g && a.en.clean && FLOW.jumpFrom.includes(a.name) && (fresh(s, 'jump', B) || fresh(s, 'up', B)) && !fresh(s, 'special', B) && !fresh(s, 'heavy', B) && !fresh(s, 'light', B)) {
    use(s, 'jump'); use(s, 'up'); f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0
    f.vy = f.jumpForce || -22; f.onGround = false; f.grounded = false; f.jumpCount = 1; f.jumpHeld = true; s.stats.jumpCancels = (s.stats.jumpCancels || 0) + 1
    return 'consumed'
  }
  if (a && !contact) return 'consumed'
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); if (!a && g && (f.energy || 0) >= 100) fire('super'); return 'consumed' }   // Ultimate button = the super too
  if (fresh(s, 'special') && !a) { const k = specialKey(f, s.edges.special); use(s, 'special'); if (g) fire(k); else if (k !== 'super') fire(meteorKey(f)); return 'consumed' }   // in the air: Special = the METEOR
  if (fresh(s, 'upAttack') && upHeavy(s)) { use(s, 'upAttack'); use(s, 'heavy'); if (!a) fire(g ? 'rise' : 'air'); return 'consumed' }
  if (fresh(s, 'heavy') && !a) { const e = s.edges.heavy; use(s, 'heavy'); fire(!g ? 'air' : e.up ? 'rise' : heavyKey(f, e)); return 'consumed' }
  if (fresh(s, 'upAttack')) { use(s, 'upAttack'); if (fresh(s, 'light')) use(s, 'light'); if (!a) fire(g ? 'rise' : 'air'); return 'consumed' }
  if (fresh(s, 'light')) { const e = s.edges.light; use(s, 'light'); if (!a) fire(!g ? 'air' : e.down ? 'low' : e.fwd ? 'straight' : 'jab'); return 'consumed' }   // Forward + Light = the Straight on its own
  // CHARGE: Forward + Charge = Ice Disc; Down / Up + Charge held = channel cold / heat; a tap of Charge = ICE STANCE (Frozone's kit). (Holding Charge no longer starts a glide:
  // his glides now come from the guard cancel and from a double-tap on his own ICE / FIRE patch.)
  if (fresh(s, 'charge') && !a && g) {
    use(s, 'charge')
    const e = s.edges.charge
    if (e.fwd) fire('iceDisc')                          // Forward + Charge = Ice Disc
    else if (e.back) fire('snowman')                    // Back + Charge = SNOWMAN (an ice sculpture wall)
    else if (!e.down && !e.up) toggleStance(f)          // Down / Up + Charge = CHANNEL cold / heat (held; tickEnoch)
    return 'consumed'
  }
  return a ? 'consumed' : 'grab'
}
