// ─────────────────────────────────────────────────────────────────
// CLASSIC MOTION-INPUT ENGINE — Naruto universe only
// ─────────────────────────────────────────────────────────────────
// A genuine fighting-game motion-input layer (quarter-circles, half-circles,
// dragon-punch, and DOUBLE quarter-circles) that triggers ELEVATED specials for
// the five Naruto-universe characters ONLY. It is fully ADDITIVE: it reads a
// DEDICATED per-fighter buffer (`fighter.motionHistory`) that no other system
// touches, so the existing 2-step directional specials (which read
// `directionHistory` via abilities.getRelativeDirections) and the beta
// single-held-direction path are byte-for-byte unaffected.
//
// This module imports NOTHING from abilities.js/game.js → no import cycle.
// game.js feeds it (keydown + gamepad edges); abilities.js queries it
// (detectMotion) from the top of the relevant executeXSpecial dispatchers.

// The scoped roster. Matched case-insensitively on fighter.rosterKey. Every
// other character never even allocates a motionHistory buffer (recordMotionInput
// early-returns), so their input path is provably untouched.
export const NARUTO_UNIVERSE_KEYS = new Set(["naruto", "sasuke", "itachi", "tobirama", "minato"])

export function isNarutoUniverse(fighter) {
  return !!fighter && NARUTO_UNIVERSE_KEYS.has(String(fighter.rosterKey || "").toLowerCase())
}

// Rolling buffer cap. A double-QCF is 4 tokens; add headroom for a stray/diagonal
// and prior noise. 24 is cheap and safe.
const MOTION_HISTORY_CAP = 24

// Default recency window (ms). Single motions match `COMMAND_INPUT_MAX_AGE` (700ms
// in abilities.js/game.js) so they feel identical to the existing 2-step specials.
// Double motions declare their own longer window below.
const DEFAULT_WINDOW = 700

// Motion vocabulary as DATA (facing-relative tokens: F/B/U/D). Each entry may
// override the recency window (double motions need longer) and the stray budget
// (forgiveness — one tolerated off-pattern input, mirroring endsWithPattern).
// Tokens are the same F/B/U/D vocabulary abilities.getRelativeDirections produces,
// so the facing math is shared conceptually.
const MOTIONS = {
  qcf:       { seq: ["D", "F"],           window: 700,  strays: 1 },   // ↓↘→   quarter-circle forward
  qcb:       { seq: ["D", "B"],           window: 700,  strays: 1 },   // ↓↙←   quarter-circle back
  dp:        { seq: ["F", "D", "F"],      window: 700,  strays: 1 },   // →↓↘   dragon punch
  hcf:       { seq: ["B", "D", "F"],      window: 800,  strays: 1 },   // ←↓→   half-circle forward
  hcb:       { seq: ["F", "D", "B"],      window: 800,  strays: 1 },   // →↓←   half-circle back
  doubleQcf: { seq: ["D", "F", "D", "F"], window: 1000, strays: 1 },   // ↓↘→↓↘→  double QCF (Uzumaki Barrage)
  doubleQcb: { seq: ["D", "B", "D", "B"], window: 1000, strays: 1 }    // ↓↙←↓↙←  double QCB
}

// Map a raw control key → cardinal direction token, exactly like game.js
// recordDirectionInput. Returns null for non-directional keys.
function keyToCardinal(fighter, key) {
  const c = fighter.controls
  if (!c) return null
  if (key === c.left)  return "L"
  if (key === c.right) return "R"
  if (key === c.up)    return "U"
  if (key === c.down)  return "D"
  return null
}

// Convert a stored cardinal (L/R/U/D) to a FACING-RELATIVE token (F/B/U/D).
// Identical mapping to abilities.getRelativeDirections: forward = toward opponent.
function toRelative(dir, facing) {
  if (dir === "U" || dir === "D") return dir
  return (facing || 1) === 1 ? (dir === "R" ? "F" : "B")
                             : (dir === "L" ? "F" : "B")
}

// Record a directional press into the dedicated motion buffer. Called from the
// game.js keydown handler and gamepad-edge detector, right beside
// recordDirectionInput. No-op for every non-Naruto-universe fighter.
export function recordMotionInput(fighter, key) {
  if (!isNarutoUniverse(fighter)) return
  const dir = keyToCardinal(fighter, key)
  if (!dir) return
  const hist = fighter.motionHistory || (fighter.motionHistory = [])
  hist.push({ dir, time: performance.now() })
  if (hist.length > MOTION_HISTORY_CAP) hist.shift()
}

// Clear the buffer — call after a motion move consumes the input so a lingering
// token run can't re-trigger on a rapid second Special press. Parity with
// input.clearInputBuffer.
export function clearMotionHistory(fighter) {
  if (fighter && fighter.motionHistory) fighter.motionHistory.length = 0
}

// Facing-relative, time-windowed tail of the motion buffer.
function relTokens(fighter, window) {
  const now = performance.now()
  return (fighter.motionHistory || [])
    .filter(d => now - d.time <= window)
    .map(d => toRelative(d.dir, fighter.facing))
}

// Forgiving in-order subsequence match over the last (seq.length + strays) tokens.
// Order is REQUIRED (D before F), tolerating up to `strays` off-pattern inputs.
// Same shape as abilities.endsWithPattern, generalized on the stray budget.
function matchSeq(tokens, seq, strays) {
  if (!Array.isArray(tokens) || tokens.length < seq.length) return false
  const win = tokens.slice(-(seq.length + strays))
  let pi = 0
  for (let i = 0; i < win.length && pi < seq.length; i++) {
    if (win[i] === seq[pi]) pi++
  }
  return pi === seq.length
}

// Did the named motion just complete for this fighter? False for non-Naruto or
// unknown motion names.
export function detectMotion(fighter, name) {
  if (!isNarutoUniverse(fighter)) return false
  const m = MOTIONS[name]
  if (!m) return false
  return matchSeq(relTokens(fighter, m.window || DEFAULT_WINDOW), m.seq, m.strays ?? 1)
}

// Debug/test helper: all motion names that currently match (longest patterns first
// so a double-QCF is reported ahead of the single QCF it contains).
export function getRecentMotions(fighter) {
  if (!isNarutoUniverse(fighter)) return []
  return Object.keys(MOTIONS)
    .sort((a, b) => MOTIONS[b].seq.length - MOTIONS[a].seq.length)
    .filter(name => detectMotion(fighter, name))
}
