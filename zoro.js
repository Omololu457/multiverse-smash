// zoro.js — Roronoa Zoro command layer. Called from game.js once per sim frame (1v1 + FFA) after tickZoro
// recorded the raw press edges + direction history. From phase 4 it OWNS Zoro's attack inputs: it returns
// 'consumed' when it started / continued something, or 'grab' to let only the shared grab/throw run.
//
// Buttons: A = Special, B = Heavy. Motions are facing-relative numpad strings (2 = ↓, 3 = ↘, 6 = →, …).
//   Jab L · Slash L,L (or →+L) · Heavy slash H · Low thrust ↓+L · Rising slash ↑+H / Up-Attack · Air slash air L/H
//   Wake-up reversal →+H · Taka Nami 236+A · Oni Giri 66+A · Tatsu Maki 22+A · Tora Gari 214+A · Shishi Sonson 2369+A
//   NAP hold ↓+H 40f · SANTORYU A+B · ASHURA 236236+A (or Ultimate) at 100 Spirit
//   Directional fallbacks (no motion): A = Taka Nami, →+A = Oni Giri, ↓+A = Tatsu Maki, ←+A = Tora Gari.
import { startMove } from './combat.js'
import { ZORO_MOVES } from './zoroData.js'
import { isZoro, zoroState, enterSantoryu, SANTORYU, zoroStartMove, recentMotion, takaReady, tatsuSlots, zcue } from './zoroState.js'

const LENIENCY = 3          // A+B: both press edges within 3 frames of each other
const BUFFER = 8            // a press edge stays "fresh" for 8 input ticks
const NAP_HOLD = 40
const MOTIONS = [           // checked in order (longest / most specific first); window in input ticks
  ['zAshura', /23?6[53]?23?6[5]?$/, 45],
  ['zShishi', /2(3|36|6)9[58]?$/, 24],
  ['zTatsu', /2[135]2[5]?$/, 20],
  ['zTaka', /23?6[5]?$/, 20],
  ['zTora', /21?4[5]?$/, 20],
  ['zOni', /656[5]?$/, 20],
]
// Normal → normal gatlings on contact (hit OR block). Jab → Slash → Heavy is the core string (L, L, H);
// Low thrust → Rising slash opens the air route. A Light re-tap after the Jab means Slash.
const GATLING = { light: ['zSlash', 'heavy', 'zLow', 'up'], zSlash: ['heavy', 'up'], zLow: ['up', 'zSlash', 'heavy'] }
const W_START = (f, key) => zoroStartMove(f, key, startMove)
// World accessors for tickZoro (built once in game.js from its projectile / summon registries).
export const zoroWorld = w => ({ ...w, startMove })

// Buffer freshness runs on the SIM clock (paused in hitstop), so a press made during hit-freeze survives it.
function fresh(s, k, win = BUFFER) {
  const at = s.edgeAt[k]
  return at != null && s.used[k] !== at && s.clock - (s.edgeClk[k] ?? -99) <= win
}
const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }

function santoryuPressed(s, early) {   // early: the Special edge only started a ≤3-frame move that A+B may cancel
  const a = s.edgeAt.special, b = s.edgeAt.heavy
  if (a == null || b == null || !s.prev.special || !s.prev.heavy) return false
  return Math.abs(a - b) <= LENIENCY && Math.max(a, b) >= s.tick - 1 && (early || s.used.special !== a)
}

const cost = key => ZORO_MOVES[key]?.cost || 0
function canAfford(f, s, key) {
  if ((f.energy || 0) < cost(key)) return false
  if (key === 'zAshura' && (!s.santoryu || f.ultimateCooldown > 0 || (f.disabledSpecials || []).includes('ultimate'))) return false   // ASHURA is unlocked by Santoryu
  if (ZORO_MOVES[key]?.isSpecial && ((f.disabledSpecials || []).includes('special') || (f.disabledSpecials || []).includes(key))) return false
  return true
}

// Which special does this Special press mean? Motion first, then the held-direction fallback.
function pickSpecial(f, s, inputState, grounded, W) {
  for (const [key, re, win] of MOTIONS) {
    if (!re.test(recentMotion(s, win))) continue
    if (!grounded && key !== 'zTatsu') continue
    if (key === 'zAshura' && !canAfford(f, s, key)) continue   // a double-QCF without full Spirit is just Taka Nami
    return key
  }
  if (!grounded) return inputState.down ? 'zTatsu' : null
  const fwd = f.facing === -1 ? inputState.left : inputState.right, back = f.facing === -1 ? inputState.right : inputState.left
  return inputState.down ? 'zTatsu' : fwd ? 'zOni' : back ? 'zTora' : 'zTaka'
}

function fire(f, s, key, W) {
  if (!canAfford(f, s, key)) return false
  if (key === 'zTaka' && !takaReady(f, W)) return false                         // one Taka Nami at a time
  if (key === 'zTatsu' && tatsuSlots(f, W) < 1) return false                    // tornado pool max 2
  if (key === 'zAshura' && !(f.onGround || f.grounded)) return false
  if (!W_START(f, key)) return false
  f.energy = Math.max(0, (f.energy || 0) - cost(key))
  if (key === 'zAshura') { zcue(f, 'ashura'); s.inSuper = true; s.superHit = false }   // Spirit gain off until the lockout ends
  else if (key === 'zOni') zcue(f, 'oni')
  else if (key === 'zTatsu') zcue(f, 'tatsu')
  else if (ZORO_MOVES[key].isSpecial) zcue(f, 'swing')
  return true
}

function normalFor(f, inputState, button, grounded) {
  const fwd = f.facing === -1 ? inputState.left : inputState.right
  if (!grounded) return inputState.down ? 'down_air' : 'air'
  if (button === 'upAttack') return 'up'
  if (button === 'light') return inputState.down ? 'zLow' : fwd ? 'zSlash' : 'light'
  if (inputState.up) return 'up'
  if (inputState.down) return null          // ↓+H is the NAP hold, not a normal
  return fwd ? 'zWake' : 'heavy'
}

export function updateZoroCommandCombat(f, inputState, opp, ctx = {}) {
  if (!isZoro(f)) return false
  const s = zoroState(f), W = ctx.world || null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0)) { s.napHold = 0; return 'consumed' }
  const grounded = !!(f.onGround || f.grounded)
  const a = f.attacking ? f.currentAttack : null

  // ── A+B → SANTORYU (a staggered press may cancel the first ≤3 frames of the Heavy / Special it started) ──
  const early = !!(a && (!a.hasHit || a.zr?.noHit) && a.total - a.timer <= LENIENCY && (a.name === 'heavy' || a.name === 'zWake' || ZORO_MOVES[a.name]?.isSpecial))
  if (grounded && santoryuPressed(s, early) && !s.santoryu && s.santoryuCd <= 0 && (f.energy || 0) + (early ? cost(a.name) : 0) >= SANTORYU.cost) {
    if (early) f.energy += cost(a.name)   // refund the cancelled special
    if ((!a || early) && W_START(f, 'zSanto') && enterSantoryu(f)) { use(s, 'special', 'heavy'); return 'consumed' }
  }

  // ── Cancels out of a live move ──
  if (a) {
    const t = a.total - a.timer, contact = a.hasHit && !a.zr?.noHit && t >= a.activeStart
    const z = a.zr || {}
    // Super cancel: any connected normal / special, or Tatsu Maki's cast recovery (its tornado does the hitting).
    const superOk = contact || z.kind === 'tatsu'
    if (superOk && z.kind !== 'ashura' && (fresh(s, 'ultimate') || (fresh(s, 'special') && /23?6[53]?23?6[5]?$/.test(recentMotion(s, 45))))) {
      if (canAfford(f, s, 'zAshura') && grounded && fire(f, s, 'zAshura', W)) { use(s, 'ultimate', 'special'); return 'consumed' }
    }
    if (contact && !ZORO_MOVES[a.name]?.isSpecial && !a.isUltimate) {
      // Special cancel out of a connected normal (hit or block).
      if (fresh(s, 'special')) {
        const key = pickSpecial(f, s, inputState, grounded, W)
        if (key && key !== 'zAshura' && fire(f, s, key, W)) { use(s, 'special'); return 'consumed' }
      }
      // Normal → normal gatling.
      for (const b of ['light', 'heavy', 'upAttack']) {
        if (!fresh(s, b) || !grounded) continue
        let next = normalFor(f, inputState, b, grounded)
        if (a.name === 'light' && next === 'light') next = 'zSlash'
        if (next && (GATLING[a.name] || []).includes(next) && W_START(f, next)) { use(s, b); zcue(f, 'swing'); return 'consumed' }
      }
    }
    return 'consumed'
  }

  if (f.attackCooldown > 0 || inputState.block) { s.napHold = 0; return 'grab' }

  // ── NAP: hold ↓ + B for 40 frames (grounded, free) ──
  if (grounded && s.prev.down && s.prev.heavy && !s.prev.left && !s.prev.right) {
    if (++s.napHold >= NAP_HOLD) { s.napHold = 0; use(s, 'heavy'); if (W_START(f, 'zNap')) { zcue(f, 'nap'); return 'consumed' } }
    return 'consumed'
  }
  s.napHold = 0

  // ── Neutral starts ──
  if (fresh(s, 'ultimate') && grounded && canAfford(f, s, 'zAshura')) { use(s, 'ultimate'); if (fire(f, s, 'zAshura', W)) return 'consumed' }
  if (fresh(s, 'special')) {
    use(s, 'special')
    const key = pickSpecial(f, s, inputState, grounded, W)
    if (key && fire(f, s, key, W)) return 'consumed'
    return 'consumed'
  }
  if (fresh(s, 'upAttack') && grounded) { use(s, 'upAttack', 'light', 'heavy'); if (W_START(f, 'up')) { zcue(f, 'swing'); return 'consumed' } }
  for (const b of ['light', 'heavy']) {
    if (!fresh(s, b)) continue
    const key = normalFor(f, inputState, b, grounded)
    if (!key) continue
    use(s, b)
    if (W_START(f, key)) { zcue(f, b === 'light' ? 'swingLight' : 'swing'); return 'consumed' }
  }
  return 'grab'
}

// ── INTRO (combat is frozen during INTRO, so the walk-in may set x directly — the Superman/Shinobu pattern) ──
export const ZORO_WALKIN = { dist: 220, frames: 72 }   // the 12 walk frames of the intro strip (speed 6)
export function zoroIntroStart(f) {
  if (!isZoro(f)) return false
  f._introHomeX = f.x
  f.x = f.x - (f.facing || 1) * ZORO_WALKIN.dist
  return true
}
export function updateZoroIntro(f) {
  if (!isZoro(f) || !f._introPlaying || f._introHomeX == null) return
  const t = Math.min(1, (f._introRevealFrame || 0) / ZORO_WALKIN.frames)
  f.x = f._introHomeX - (f.facing || 1) * ZORO_WALKIN.dist * (1 - t)   // constant walking pace, arrives as he draws
}
export function finalizeZoroIntroPos(f) {
  if (isZoro(f) && f._introHomeX != null) { f.x = f._introHomeX; f._introHomeX = null }
}
