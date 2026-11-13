// arlong.js — Arlong command layer. Called from game.js once per sim frame (1v1 + FFA) after tickArlong recorded
// the raw press edges + direction history. It OWNS Arlong's attack inputs: returns 'consumed' when it started /
// continued something, or 'grab' to let only the shared grab/throw run.
//
// Buttons: L = Light, B = Heavy, A = Special. Motions are facing-relative numpad strings (2 = ↓, 3 = ↘, 6 = →, 4 = ←).
//   Jab L · Fishman straight L,L (or →+L) · Low saw ↓+L
//   Kiribachi swing H · Heavy saw arc ↓+H (launches) · Rising claw ↑+H / Up-Attack · Wake-up reversal ←+H
//   →+H = BITE when close (else Lunge punch) · Air saw air L/H (air ↓ = nose dive)
// Specials (A = Special button, B = Heavy):
//   ↓↘→+A Shark On Tooth · →→+A Shark On Darts · ↓↙←+A Gosenmaigawara Seiken · ↓↓+A Tidal Sweep
//   ↓↘→+B Kiribachi Throw (blade in hand) / Recall (blade planted) · ↓↙←+B Water Shot · B beside the planted blade = pick up
//   Simple-input fallbacks: A Tooth · →+A Darts · ←+A Seiken · ↓+A Tidal · ↑+A Water Shot
//   Super ARLONG PARK: ↓↘→↓↘→+A or the Ultimate button (100 Tide)
// While the Kiribachi is thrown / planted every blade normal swaps to its FISHMAN KARATE replacement.
import { startMove } from './combat.js'
import { ARLONG_MOVES } from './arlongData.js'
import { isArlong, arlongState, arlongStartMove, acue, registerArlongStartMove, ctrX, hasTeeth, BITE_FALLBACK, recentMotion, bladeInHand, ARLONG_SPECIAL } from './arlongState.js'

const BUFFER = 8
// Normal → normal gatlings on contact (hit OR block).
const GATLING = {
  light: ['aStraight', 'aSwing', 'aLow', 'up', 'heavy', 'aLunge', 'aBite'], aStraight: ['aSwing', 'heavy', 'up', 'aBite'],
  aLow: ['aStraight', 'aSwing', 'up'], aSwing: ['heavy'],
}
const W_START = (f, key) => arlongStartMove(f, key, startMove)
registerArlongStartMove(startMove)

// Buffered press: measured on the SIM clock, which pauses during hitstop, so a button pressed in the hit-freeze is
// still live when the freeze ends (cancels feel the same however long the impact freeze is).
function fresh(s, k, win = BUFFER) {
  const at = s.edgeAt[k]
  return at != null && s.used[k] !== at && s.clock - (s.edgeClk[k] ?? -1e9) <= win
}
const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }

// A buffered press reads the direction held at its press edge, not the (possibly released) current one.
function pressDir(s, b, inp, facing) {
  const t = s.edgeDir?.[b]
  if (t == null || s.edgeAt[b] === s.tick) return inp
  const fk = facing === -1 ? 'left' : 'right', bk = facing === -1 ? 'right' : 'left'
  return { ...inp, down: t <= 3, up: t >= 7, [fk]: t % 3 === 0, [bk]: t % 3 === 1 }
}
export const BITE_RANGE = 120   // →+H within this centre-to-centre distance = Bite, else Lunge punch
function normalFor(f, inp, button, grounded, opp) {
  const fwd = f.facing === -1 ? inp.left : inp.right, back = f.facing === -1 ? inp.right : inp.left
  if (!grounded) return inp.down ? 'down_air' : 'air'
  if (button === 'upAttack') return 'up'
  if (button === 'light') return inp.down ? 'aLow' : fwd ? 'aStraight' : 'light'
  if (inp.up) return 'up'
  if (inp.down) return 'heavy'
  if (back) return 'aWake'
  if (fwd) return opp && Math.abs(ctrX(opp) - ctrX(f)) <= BITE_RANGE ? 'aBite' : 'aLunge'
  return 'aSwing'
}
// Resolve a move key to what Arlong can actually do right now (blade / teeth state). Never returns a dead key.
const KARATE_BASE = {}   // aKSwing → aSwing … (gatling lookups use the blade name)
for (const [k, m] of Object.entries(ARLONG_MOVES)) if (m.karate) KARATE_BASE[m.karate] = k
KARATE_BASE.aKTidal = 'aTidal'
export function resolveKey(f, key) {
  if (BITE_FALLBACK[key] && !hasTeeth(f)) return BITE_FALLBACK[key]   // 0 teeth → the weaker headbutt (same frames)
  if (!bladeInHand(f)) {   // Kiribachi thrown / planted → Fishman Karate
    if (ARLONG_MOVES[key]?.karate) return ARLONG_MOVES[key].karate
    if (key === 'aTidal') return 'aKTidal'
  }
  return key
}

// Motion reader: the pattern's numpad tokens appear IN ORDER inside the recent direction history.
function hasMotion(s, pat, win) {
  const str = recentMotion(s, win); let i = 0
  for (const c of str) if (c === pat[i]) { i++; if (i === pat.length) return true }
  return false
}
// Can he pay for / perform this special right now?
export function canDo(f, key) {
  const md = ARLONG_MOVES[key]; if (!md) return false
  const s = arlongState(f)
  if ((md.cost || 0) > (f.energy || 0)) return false
  if (key === 'aSuper' && s.lockout > 0) return false
  if (key === 'aThrow' && !bladeInHand(f)) return false
  if ((key === 'aRecall' || key === 'aPickup') && s.blade.st !== 'planted') return false
  return true
}
const nearBlade = f => { const b = f._arlong?.blade; return b?.st === 'planted' && Math.abs(b.x - ctrX(f)) <= ARLONG_SPECIAL.pickup.reach }
// Which special does this press ask for? (null = none)
function specialFor(f, s, button, inp) {
  const fwd = f.facing === -1 ? inp.left : inp.right, back = f.facing === -1 ? inp.right : inp.left
  if (button === 'ultimate') return 'aSuper'
  if (button === 'special') {
    if (hasMotion(s, '236236', 40)) return 'aSuper'
    if (hasMotion(s, '236', 16)) return 'aTooth'
    if (hasMotion(s, '214', 16)) return 'aSeiken'
    if (hasMotion(s, '656', 16)) return 'aDarts'
    if (hasMotion(s, '252', 16)) return 'aTidal'
    if (inp.down) return 'aTidal'
    if (inp.up) return 'aShot'
    if (fwd) return 'aDarts'
    if (back) return 'aSeiken'
    return 'aTooth'
  }
  if (button === 'heavy') {
    if (hasMotion(s, '236', 16)) return bladeInHand(f) ? 'aThrow' : s.blade.st === 'planted' ? 'aRecall' : null
    if (hasMotion(s, '214', 16)) return 'aShot'
    if (nearBlade(f)) return 'aPickup'
  }
  return null
}
function trySpecial(f, s, inp, grounded) {
  for (const b of ['ultimate', 'special', 'heavy']) {
    if (!fresh(s, b)) continue
    const want = specialFor(f, s, b, pressDir(s, b, inp, f.facing))
    if (!want) { if (b !== 'heavy') use(s, b); continue }
    if (!grounded && want !== 'aShot') { if (b !== 'heavy') use(s, b); continue }   // specials are grounded (Water Shot works in the air)
    const key = resolveKey(f, want)
    use(s, b)
    if (canDo(f, key) && W_START(f, key)) return true
    return b === 'heavy' ? false : true   // a failed special press still eats the Special / Ultimate button
  }
  return false
}

const CUE = { light: 'swingLight', aStraight: 'swingLight', aLow: 'swing', aSwing: 'swing', heavy: 'swing', up: 'swingLight', air: 'swing',
  down_air: 'swingLight', aLunge: 'swingLight', aWake: 'swing', aBite: 'bite', aHeadbutt: 'swingLight' }

export function updateArlongCommandCombat(f, inp, opp, ctx = {}) {
  if (!isArlong(f)) return false
  const s = arlongState(f)
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0)) return 'consumed'
  const grounded = !!(f.onGround || f.grounded)
  const a = f.attacking ? f.currentAttack : null

  // ── Cancels out of a live move ──
  if (a) {
    const t = a.total - a.timer, contact = a.hasHit && !a.al?.noHit && t >= a.activeStart
    if (contact && !ARLONG_MOVES[a.name]?.isSpecial && !a.isUltimate) {
      if (trySpecial(f, s, inp, grounded)) return 'consumed'   // special / super cancel out of a connected normal
      for (const b of ['light', 'heavy', 'upAttack']) {
        if (!fresh(s, b) || !grounded) continue
        let next = normalFor(f, pressDir(s, b, inp, f.facing), b, grounded, opp)
        const cur = KARATE_BASE[a.name] || a.name
        if (cur === 'light' && next === 'light') next = 'aStraight'
        if (!(GATLING[cur] || []).includes(next)) continue
        next = resolveKey(f, next)
        if (next && W_START(f, next)) { use(s, b); acue(f, CUE[KARATE_BASE[next] || next] || 'swing'); return 'consumed' }
      }
    }
    return 'consumed'
  }

  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (trySpecial(f, s, inp, grounded)) return 'consumed'
  if (fresh(s, 'upAttack') && grounded) { use(s, 'upAttack', 'light', 'heavy'); if (W_START(f, resolveKey(f, 'up'))) { acue(f, 'swingLight'); return 'consumed' } }
  for (const b of ['light', 'heavy']) {
    if (!fresh(s, b)) continue
    const key = resolveKey(f, normalFor(f, pressDir(s, b, inp, f.facing), b, grounded, opp))
    if (!key) continue
    use(s, b)
    if (W_START(f, key)) { acue(f, CUE[KARATE_BASE[key] || key] || 'swing'); return 'consumed' }
  }
  return 'grab'
}
