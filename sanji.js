// sanji.js — Sanji command layer. Called from game.js once per sim frame (1v1 + FFA) after tickSanji recorded the
// raw press edges + direction history. It OWNS Sanji's attack inputs: it returns 'consumed' when it started /
// continued something, or 'grab' to let only the shared grab/throw run.
//
// Buttons: L = Light, B = Heavy, A = Special. Motions are facing-relative numpad strings (2 = ↓, 3 = ↘, 6 = →, …).
// HE NEVER PUNCHES: every normal below is a kick, a knee or a shin.
//   THE SIX COURSE KICKS   COLLIER L · EPAULE →+L · COTELETTE B · SELLE →+B · POITRINE ←+B · GIGOT ↘+L
//   Crouch kick ↓/↙+L · Anti-air knee ↑+B / Up-Attack · Air kick air L/B · Handstand spin ↓+B
import { startMove } from './combat.js'
import { SANJI_MOVES } from './sanjiData.js'
import { isSanji, sanjiState, sanjiStartMove, recentMotion, scue, canIgnite } from './sanjiState.js'

const BUFFER = 8            // a press edge stays "fresh" for 8 sim frames
const LENIENCY = 3          // A+B: both press edges within 3 input ticks of each other
// Normal → normal gatlings on contact (hit OR block). Any Course kick cancels into any OTHER Course kick, so the
// six cuts can be routed in order mid-combo; the crouch kick opens into the Course; the handstand / reversal /
// anti-air are enders.
const COURSE_SET = ['sCollier', 'sEpaule', 'sCotelette', 'sSelle', 'sPoitrine', 'sGigot']
const GATLING = Object.fromEntries(COURSE_SET.map(k => [k, [...COURSE_SET.filter(x => x !== k), 'sHandstand', 'up', 'sCrouchKick']]))
GATLING.sCrouchKick = [...COURSE_SET, 'sHandstand', 'up']
const W_START = (f, key) => sanjiStartMove(f, key, startMove)
export const sanjiWorld = w => ({ ...w, startMove })

// Buffer freshness runs on the SIM clock (paused in hitstop), so a press made during hit-freeze survives it.
function fresh(s, k, win = BUFFER) {
  const at = s.edgeAt[k]
  return at != null && s.used[k] !== at && s.clock - (s.edgeClk[k] ?? -99) <= win
}
const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }
// A+B (Special + Heavy) pressed together → DIABLE JAMBE.
function ignitePressed(s) {
  const a = s.edgeAt.special, b = s.edgeAt.heavy
  if (a == null || b == null || !s.prev.special || !s.prev.heavy) return false
  return Math.abs(a - b) <= LENIENCY && Math.max(a, b) >= s.tick - 1 && s.used.special !== a
}

// Which normal does this button mean? Direction = the numpad token held AT the press edge (tickSanji records it).
const T = { fwd: d => d === 3 || d === 6 || d === 9, back: d => d === 1 || d === 4 || d === 7, down: d => d <= 3, up: d => d >= 7 }
function normalFor(f, s, button, grounded) {
  const d = s.edgeDir?.[button] ?? 5
  if (!grounded) return T.down(d) ? 'down_air' : 'air'
  if (button === 'upAttack') return 'up'
  if (button === 'light') {
    if (T.down(d)) return T.fwd(d) ? 'sGigot' : 'sCrouchKick'   // ↘+L = GIGOT (low kick) · ↓/↙+L = crouch kick
    return T.fwd(d) ? 'sEpaule' : 'sCollier'
  }
  if (T.up(d)) return 'up'
  if (T.down(d)) return 'sHandstand'
  return T.fwd(d) ? 'sSelle' : T.back(d) ? 'sPoitrine' : 'sCotelette'
}

export function updateSanjiCommandCombat(f, inputState, opp, ctx = {}) {
  if (!isSanji(f)) return false
  const s = sanjiState(f), W = ctx.world || null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0)) return 'consumed'
  const grounded = !!(f.onGround || f.grounded)
  const a = f.attacking ? f.currentAttack : null

  // ── A+B → DIABLE JAMBE (a staggered press may cancel the first ≤3 frames of the kick it started) ──
  if (grounded && ignitePressed(s) && canIgnite(f)) {
    const early = a && !a.hasHit && a.total - a.timer <= LENIENCY && a.sj?.kind === 'normal'
    if ((!a || early) && W_START(f, 'sIgnite')) { use(s, 'special', 'heavy'); scue(f, 'spin'); return 'consumed' }
  }

  // ── Cancels out of a live move ──
  if (a) {
    const t = a.total - a.timer, contact = a.hasHit && !a.sj?.noHit && t >= a.activeStart
    if (contact && !SANJI_MOVES[a.name]?.isSpecial && !a.isUltimate) {
      // Normal → normal gatling.
      for (const b of ['light', 'heavy', 'upAttack']) {
        if (!fresh(s, b) || !grounded) continue
        const next = normalFor(f, s, b, grounded)
        if (next && (GATLING[a.name] || []).includes(next) && W_START(f, next)) { use(s, b); scue(f, 'whoosh' + kickTier(next)); return 'consumed' }
      }
    }
    return 'consumed'
  }

  if (f.attackCooldown > 0 || inputState.block) return 'grab'

  // ── Neutral starts ──
  if (fresh(s, 'upAttack') && grounded) { use(s, 'upAttack', 'light', 'heavy'); if (W_START(f, 'up')) { scue(f, 'whoosh2'); return 'consumed' } }
  for (const b of ['light', 'heavy']) {
    if (!fresh(s, b)) continue
    const key = normalFor(f, s, b, grounded)
    if (!key) continue
    use(s, b)
    if (W_START(f, key)) { scue(f, 'whoosh' + kickTier(key)); return 'consumed' }
  }
  return 'grab'
}
// Whoosh pitch tier (sound): rises with kick strength (damage).
export function kickTier(key) { const d = SANJI_MOVES[key]?.damage || 40; return d >= 80 ? 3 : d >= 60 ? 2 : 1 }

// ── INTRO (combat is frozen during INTRO, so the walk-in may set x directly — the Superman/Shinobu/Zoro pattern) ──
export const SANJI_WALKIN = { dist: 200, frames: 72 }   // the 12 pocket-walk frames of the intro strip (speed 6)
export function sanjiIntroStart(f) {
  if (!isSanji(f)) return false
  f._introHomeX = f.x
  f.x = f.x - (f.facing || 1) * SANJI_WALKIN.dist
  return true
}
export function updateSanjiIntro(f) {
  if (!isSanji(f) || !f._introPlaying || f._introHomeX == null) return
  const t = Math.min(1, (f._introRevealFrame || 0) / SANJI_WALKIN.frames)
  f.x = f._introHomeX - (f.facing || 1) * SANJI_WALKIN.dist * (1 - t)   // unhurried stroll, arrives as he lights up
}
export function finalizeSanjiIntroPos(f) {
  if (isSanji(f) && f._introHomeX != null) { f.x = f._introHomeX; f._introHomeX = null }
}
