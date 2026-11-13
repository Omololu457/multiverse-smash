// buggy.js — Buggy the Clown command layer. Called from game.js once per sim frame (1v1 + FFA) after tickBuggy
// recorded the raw press edges + direction history. It OWNS Buggy's attack inputs: returns 'consumed' when it
// started / continued something, or 'grab' to let only the shared grab/throw run.
//
// Buttons: A = Special, B = Heavy. Motions are facing-relative numpad strings (2 = ↓, 3 = ↘, 6 = →, 4 = ←).
//   Jab L · Knife slash L,L (or →+L) · Heavy carve H · Low knife ↓+L · Clown kick ↓+H · Acrobatic kick ↑+H / Up-Attack
//   Air knife air L/H (air ↓ = dive) · Wake-up reversal →+H · Roll = dash (8 invulnerable frames)
//   Chop-Chop Cannon 236+A · Festival 22+A · Buggy Ball 214+A · Quick Escape 236+B · Knife Fan 66+A · Cape Flourish 214+B
//   SUPER 236236+A (or Ultimate) at 100 Chop
//   Fallbacks (no motion): A = Knife Fan, →+A = Cannon, ←+A = Buggy Ball, ↓+A = Festival, ↑+A = Lookout (head).
//   While the Cannon hand hovers, A = STAB from the hand. Double-tap A with a part out = RECALL (buggyState).
import { startMove } from './combat.js'
import { BUGGY_MOVES } from './buggyData.js'
import { isBuggy, buggyState, buggyStartMove, recentMotion, bcue, canBuggyAct, registerBuggyStartMove } from './buggyState.js'
import { livePart, partReady, ownParts } from './buggyParts.js'

const BUFFER = 8
const RECALL_WAIT = 12      // a neutral A with a part out waits this long for the recall double-tap
const MOTIONS_A = [         // Special button — longest first
  ['bSuper', /23?6[53]?23?6[5]?$/, 45],
  ['bCannon', /23?6[5]?$/, 20],
  ['bBall', /21?4[5]?$/, 20],
  ['bFestival', /2[135]2[5]?$/, 20],
  ['bFan', /656[5]?$/, 20],
]
const MOTIONS_B = [         // Heavy button
  ['bEscape', /23?6[5]?$/, 20],
  ['bCape', /21?4[5]?$/, 20],
]
// Normal → normal gatlings on contact (hit OR block): Jab → Slash → Carve; Low → Kick; Kick → Acrobatic.
const GATLING = { light: ['bSlash', 'heavy', 'bLow', 'bKick', 'up'], bSlash: ['heavy', 'up'], bLow: ['bKick', 'bSlash', 'up'], bKick: ['up', 'heavy'] }
const W_START = (f, key) => buggyStartMove(f, key, startMove)
registerBuggyStartMove(startMove)

function fresh(s, k, win = BUFFER) {
  const at = s.edgeAt[k]
  return at != null && s.used[k] !== at && s.clock - (s.edgeClk[k] ?? -99) <= win
}
const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }

const cost = key => BUGGY_MOVES[key]?.cost || 0
function canAfford(f, s, key) {
  if ((f.energy || 0) < cost(key)) return false
  if (key === 'bSuper' && (f.ultimateCooldown > 0 || (f.disabledSpecials || []).includes('ultimate'))) return false
  if (BUGGY_MOVES[key]?.isSpecial && ((f.disabledSpecials || []).includes('special') || (f.disabledSpecials || []).includes(key))) return false
  if (key === 'bCannon' && !partReady(f, 'buggy_hand')) return false
  if (key === 'bEscape' && !partReady(f, 'buggy_foot')) return false
  if (key === 'bHead' && !partReady(f, 'buggy_head')) return false
  if (key === 'bFestival' && s.festival > 0) return false
  return true
}

const handHovering = f => { const d = livePart(f, 'buggy_hand'); return !!(d && d.data.st === 'hover') }

function pickA(f, s, inp, grounded) {
  for (const [key, re, win] of MOTIONS_A) {
    if (!re.test(recentMotion(s, win))) continue
    if (key === 'bSuper' && !canAfford(f, s, key)) continue   // a double-QCF without full Chop is just the Cannon
    if (!grounded && key !== 'bFan') continue
    if (key === 'bCannon' && handHovering(f)) return 'bStab'
    return key
  }
  if (handHovering(f)) return 'bStab'
  if (!grounded) return 'bFan'
  const fwd = f.facing === -1 ? inp.left : inp.right, back = f.facing === -1 ? inp.right : inp.left
  return inp.down ? 'bFestival' : inp.up ? 'bHead' : fwd ? 'bCannon' : back ? 'bBall' : 'bFan'
}
function pickB(s) {
  for (const [key, re, win] of MOTIONS_B) if (re.test(recentMotion(s, win))) return key
  return null
}

function fire(f, s, key) {
  if (!canAfford(f, s, key)) return false
  if (!W_START(f, key)) return false
  f.energy = Math.max(0, (f.energy || 0) - cost(key))
  bcue(f, key === 'bSuper' ? 'superStart' : key === 'bFan' ? 'knifeThrow' : key === 'bCape' ? 'cape' : key === 'bStab' ? 'stab' : 'pop')
  return true
}

function normalFor(f, inp, button, grounded) {
  const fwd = f.facing === -1 ? inp.left : inp.right
  if (!grounded) return inp.down ? 'down_air' : 'air'
  if (button === 'upAttack') return 'up'
  if (button === 'light') return inp.down ? 'bLow' : fwd ? 'bSlash' : 'light'
  if (inp.up) return 'up'
  if (inp.down) return 'bKick'
  return fwd ? 'bWake' : 'heavy'
}

export function updateBuggyCommandCombat(f, inp, opp, ctx = {}) {
  if (!isBuggy(f)) return false
  const s = buggyState(f)
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0)) { s.pendingA = -99; return 'consumed' }
  if (!canBuggyAct(f)) return 'consumed'                    // Chop Stagger reassembly / Super script
  const grounded = !!(f.onGround || f.grounded)
  const a = f.attacking ? f.currentAttack : null

  // ── Cancels out of a live move ──
  if (a) {
    const t = a.total - a.timer, contact = a.hasHit && !a.bg?.noHit && t >= a.activeStart
    if (contact && (fresh(s, 'ultimate') || (fresh(s, 'special') && MOTIONS_A[0][1].test(recentMotion(s, 45)))) && grounded && canAfford(f, s, 'bSuper')) {
      if (fire(f, s, 'bSuper')) { use(s, 'ultimate', 'special'); return 'consumed' }
    }
    if (contact && !BUGGY_MOVES[a.name]?.isSpecial && !a.isUltimate) {
      if (fresh(s, 'special')) {   // special cancel out of a connected normal
        const key = pickA(f, s, inp, grounded)
        if (key && key !== 'bSuper' && fire(f, s, key)) { use(s, 'special'); return 'consumed' }
      }
      if (fresh(s, 'heavy') && grounded) {
        const key = pickB(s)
        if (key && fire(f, s, key)) { use(s, 'heavy'); return 'consumed' }
      }
      for (const b of ['light', 'heavy', 'upAttack']) {
        if (!fresh(s, b) || !grounded) continue
        let next = normalFor(f, inp, b, grounded)
        if (a.name === 'light' && next === 'light') next = 'bSlash'
        if (next && (GATLING[a.name] || []).includes(next) && W_START(f, next)) { use(s, b); bcue(f, 'swing'); return 'consumed' }
      }
    }
    // the hand can be fired off from ANY point of a move once it hovers (pincer)
    if (fresh(s, 'special') && handHovering(f) && !a.isUltimate && a.name !== 'bStab') { use(s, 'special'); fire(f, s, 'bStab'); return 'consumed' }
    return 'consumed'
  }

  if (f.attackCooldown > 0 || inp.block) return 'grab'

  // ── Neutral A with a part out: wait RECALL_WAIT ticks for the double-tap (buggyState recalls + consumes it) ──
  if (s.pendingA > 0) {
    if (s.recallTick >= s.pendingA) { s.pendingA = -99; return 'consumed' }   // became a recall
    if (s.tick - s.pendingA < RECALL_WAIT) return 'consumed'
    s.pendingA = -99
    if (fire(f, s, s.pendingKey)) return 'consumed'
  }

  if (fresh(s, 'ultimate') && grounded && canAfford(f, s, 'bSuper')) { use(s, 'ultimate'); if (fire(f, s, 'bSuper')) return 'consumed' }
  if (fresh(s, 'special')) {
    const key = pickA(f, s, inp, grounded)
    const neutral = key === 'bFan' && !/656[5]?$/.test(recentMotion(s, 20))
    if (neutral && ownParts(f).some(d => !d.dying && !d._retiring)) { s.pendingA = s.tick; s.pendingKey = key; return 'consumed' }
    use(s, 'special')
    if (key) fire(f, s, key)
    return 'consumed'
  }
  if (fresh(s, 'heavy') && grounded) {
    const key = pickB(s)
    if (key) { use(s, 'heavy'); fire(f, s, key); return 'consumed' }
  }
  if (fresh(s, 'upAttack') && grounded) { use(s, 'upAttack', 'light', 'heavy'); if (W_START(f, 'up')) { bcue(f, 'swing'); return 'consumed' } }
  for (const b of ['light', 'heavy']) {
    if (!fresh(s, b)) continue
    const key = normalFor(f, inp, b, grounded)
    if (!key) continue
    use(s, b)
    if (W_START(f, key)) { bcue(f, b === 'light' ? 'swingLight' : 'swing'); return 'consumed' }
  }
  return 'grab'
}
