// tutorial.js
// ─────────────────────────────────────────────────────────────────────────────
// FIRST-BOOT GUIDED TUTORIAL — a short, skippable, forced-once interactive
// walkthrough for brand-new players. It is a PURE OBSERVER layered on Training
// mode (same pattern as comboTrials.js): game.js boots a normal training session
// (dummy opponent, infinite resources) and each frame feeds this module the
// player's live input/state; the module decides when each step is satisfied and
// advances. It invents NO mechanics and touches NO combat — every step is one of
// the game's real, existing actions, described with the current How-To-Play verbs.
//
// "Seen" is tracked in a STANDALONE, guest-safe localStorage key (mirrors the
// challenges.js / comboTrials.js design) so the tutorial forces exactly once for
// everyone (guests included) and can be replayed on demand from the menu.
// ─────────────────────────────────────────────────────────────────────────────

// ── STEP DEFINITIONS ──────────────────────────────────────────────────────────
// Each step names ONE real action and a predicate over the per-frame state game.js
// feeds in (all booleans read side-effect-free from the player's held controls +
// existing fighter state — see tutorial.update() caller in game.js). Order matters.
// Deliberately forgiving: a first-timer satisfies a step by simply DOING the action
// once (no timing/accuracy gates), so nobody gets stuck on the very first screen.
export const STEPS = [
  { id: "move",    title: "MOVE",    prompt: "Walk left and right",        hint: "Press  A / D  (or ◄ / ►)",            key: "moved"     },
  { id: "jump",    title: "JUMP",    prompt: "Jump into the air",          hint: "Press  W  (or ▲)",                    key: "jumped"    },
  { id: "block",   title: "BLOCK",   prompt: "Hold block",                 hint: "Hold  ;  (the guard button)",         key: "blocked"   },
  { id: "attack",  title: "ATTACK",  prompt: "Throw a basic attack",       hint: "Press  J  (Light)  or  K  (Heavy)",   key: "attacked"  },
  { id: "special", title: "SPECIAL", prompt: "Fire a Special move",        hint: "Hold a direction and press  L",       key: "specialed" },
  { id: "combo",   title: "COMBO",   prompt: "Land 2 hits in a row",       hint: "Up-Attack (I) → jump → air attack, or just hit the dummy twice", key: "combo" },
]

export function stepCount() { return STEPS.length }

// ── PERSISTENCE (guest-safe, standalone) ──────────────────────────────────────
const LS_KEY = "multiverse-smash-tutorial"
function _lsAvailable() { try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false } }
export function hasSeenTutorial() {
  if (!_lsAvailable()) return false
  try { const d = JSON.parse(localStorage.getItem(LS_KEY) || "null"); return !!(d && d.seen) } catch (_) { return false }
}
export function markSeen() {
  if (!_lsAvailable()) return
  try { localStorage.setItem(LS_KEY, JSON.stringify({ seen: true })) } catch (_) {}
}
// Test/replay helper: forget the seen flag so a "fresh save" path can be exercised.
export function resetSeen() {
  if (!_lsAvailable()) return
  try { localStorage.removeItem(LS_KEY) } catch (_) {}
}

// ── LIVE RUN STATE ────────────────────────────────────────────────────────────
let _run = null   // { idx, flash, done, complete } | null

export function start() {
  _run = { idx: 0, flash: 0, done: false, complete: false }
  return activeInfo()
}
export function stop() { _run = null }
export function isActive() { return !!_run }
export function isComplete() { return !!(_run && _run.complete) }

// Per-frame feed from game.js. state exposes one boolean per detectable action plus
// the live combo count:
//   moved / jumped / blocked / attacked / specialed — the player performed it this frame
//   combo — the player's live comboCounter (for the final "land 2 hits" step)
// Returns the live info object (or null if not running). Advances at most one step
// per call and latches a completion flash on the final step.
export function update(state = {}) {
  if (!_run) return null
  if (_run.flash > 0) _run.flash--
  if (_run.complete) return activeInfo()

  const step = STEPS[_run.idx]
  if (!step) return activeInfo()

  const satisfied = step.key === "combo"
    ? (state.combo | 0) >= 2
    : !!state[step.key]

  if (satisfied) {
    _run.idx++
    _run.flash = 24                       // brief "✓" pulse on advance
    if (_run.idx >= STEPS.length) {
      _run.complete = true
      _run.done = true
      markSeen()                          // finishing counts as seen
    }
  }
  return activeInfo()
}

// Snapshot for the HUD / harness.
export function activeInfo() {
  if (!_run) return null
  const step = STEPS[_run.idx] || null
  return {
    idx: _run.idx,
    total: STEPS.length,
    complete: _run.complete,
    flash: _run.flash,
    step: step ? { id: step.id, title: step.title, prompt: step.prompt, hint: step.hint } : null,
    steps: STEPS.map((s, i) => ({ id: s.id, title: s.title, done: i < _run.idx })),
  }
}
