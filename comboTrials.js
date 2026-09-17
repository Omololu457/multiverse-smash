// comboTrials.js
// ─────────────────────────────────────────────────────────────────────────────
// COMBO TRIALS — scripted combo challenges (a "mission mode" layered on Training).
// Each trial asks the player to land an EXACT sequence of the character's REAL
// existing moves (universal normals: light / heavy / up-launcher / air) on a
// stationary dummy, as ONE uninterrupted combo. Nothing here invents new moves or
// touches combat: the trial is a pure OBSERVER — game.js feeds it the live combo
// counter + which move just connected, and this module decides pass/fail + a star
// rating (from the combo's accumulated damage).
//
// Move keys mirror combat.js startMove() keys exactly, so detection is reliable
// across every character:  "light" · "heavy" · "up" (launcher) · "air" / "air_heavy".
//
// Storage is STANDALONE + guest-safe (own localStorage key), mirroring the
// challenges.js / musicLibrary design so best-star results persist for guests too.
// ─────────────────────────────────────────────────────────────────────────────

// ── MOVE GLYPHS (display only) ────────────────────────────────────────────────
// These keys mirror combat.js startMove() move keys, which is what the observer detects.
const MOVE_LABEL = {
  light: "Light", heavy: "Heavy", up: "Launcher",
  air: "Air Attack", air_heavy: "Air Heavy", down_air: "Air Spike"
}
export function moveLabel(k) { return MOVE_LABEL[k] || k }
export function seqText(seq) { return (seq || []).map(moveLabel).join("  →  ") }

// ── TRIAL DEFINITIONS ─────────────────────────────────────────────────────────
// A mix of archetypes / franchises. Every sequence is built from the ONE combo route
// that is UNIVERSAL across the whole roster (see comboStandard.js): the Up-Attack
// LAUNCHER → jump-cancel → air normal → down-air SPIKE. These are REAL, landable air
// juggles using each character's own air normals — not invented strings (basic
// light→heavy does NOT chain in this engine; only this air route + per-character
// command chains do, and only the air route uses universally-detectable move keys).
// `t2`/`t3` are the accumulated-combo-damage thresholds for the 2nd / 3rd star.
function trial(id, name, seq, desc) {
  const len = seq.length
  return { id, name, seq, desc, t2: len * 60, t3: len * 100 }
}

// Three escalating air-juggle trials, reused per-character (universal air normals);
// each character keeps its own id namespace + flavor blurb. Player inputs (the jump
// is a cancel, not a hit, so it isn't in the detected sequence):
//   Sky Launch  : Up-Attack, Jump, Air-Attack
//   Air Spike   : Up-Attack, Jump, Air-Attack, Down+Air-Attack
//   Full Juggle : Up-Attack, Jump, Air-Attack, Air-Attack, Down+Air-Attack
function standardTrials(key, flavor) {
  return [
    trial(`${key}_1`, "Sky Launch", ["up", "air"],
      `${flavor} — Up-Attack launcher, jump-cancel, then an Air attack.`),
    trial(`${key}_2`, "Air Spike", ["up", "air", "down_air"],
      `${flavor} — launch, air normal, then a Down+Air spike to slam them down.`),
    trial(`${key}_3`, "Full Juggle", ["up", "air", "air", "down_air"],
      `${flavor} — launch, two air normals, then the Down+Air spike finisher.`),
  ]
}

// rosterKey → { name, trials[] }. Names are the in-game roster names.
export const TRIAL_SETS = {
  goku:    { name: "Goku",    trials: standardTrials("goku",    "Turtle-school pressure") },
  vegeta:  { name: "Vegeta",  trials: standardTrials("vegeta",  "Saiyan-prince rushdown") },
  naruto:  { name: "Naruto",  trials: standardTrials("naruto",  "Relentless all-rounder") },
  sasuke:  { name: "Sasuke",  trials: standardTrials("sasuke",  "Precise technical strings") },
  ichigo:  { name: "Ichigo",  trials: standardTrials("ichigo",  "Big-sword momentum") },
  gon:     { name: "Gon",     trials: standardTrials("gon",     "Aggressive brawler basics") },
  killua:  { name: "Killua",  trials: standardTrials("killua",  "High-speed pokes") },
  saitama: { name: "Saitama", trials: standardTrials("saitama", "One-punch fundamentals") },
}

// Ordered list of trial-capable characters (for the select screen).
export function trialChars() {
  return Object.keys(TRIAL_SETS).map(key => ({ key, name: TRIAL_SETS[key].name }))
}
export function trialsFor(key) { return (TRIAL_SETS[key]?.trials) || [] }
export function trialById(key, id) { return trialsFor(key).find(t => t.id === id) || null }

// ── PERSISTENCE (guest-safe, standalone) ──────────────────────────────────────
const LS_KEY = "multiverse-smash-combo-trials"
function _lsAvailable() { try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false } }
function _loadBest() {
  if (!_lsAvailable()) return {}
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY) || "null")
    return (d && typeof d === "object" && d.best && typeof d.best === "object") ? d.best : {}
  } catch (_) { return {} }
}
let _best = _loadBest()   // { [trialId]: stars 1..3 }
function _persist() { if (_lsAvailable()) { try { localStorage.setItem(LS_KEY, JSON.stringify({ best: _best })) } catch (_) {} } }
export function bestStars(id) { return _best[id] || 0 }
export function totalStars() { return Object.values(_best).reduce((a, b) => a + (b || 0), 0) }
function _recordBest(id, stars) { if (stars > (_best[id] || 0)) { _best[id] = stars; _persist() } }

// ── LIVE RUN STATE (one armed trial at a time) ─────────────────────────────────
// The trial is a CONTINUOUS evaluator: every fresh combo the player starts is a new
// attempt. Landing the exact sequence flashes PASS + records the best stars; a wrong
// landed move or a dropped combo ends the attempt (the next combo re-arms cleanly).
let _run = null   // { charKey, trial, idx, dmg, lastAttackId, status, flash, result, lastStars }

export function arm(charKey, trialId) {
  const t = trialById(charKey, trialId)
  if (!t) { _run = null; return null }
  _run = { charKey, trial: t, idx: 0, dmg: 0, lastAttackId: -1, status: "ready", flash: 0, result: null, lastStars: 0 }
  return activeInfo()
}
export function disarm() { _run = null }
export function isArmed() { return !!_run }

// Reset the in-progress attempt (called on a manual training reset / combo drop).
function _resetAttempt() { if (_run) { _run.idx = 0; _run.dmg = 0 } }

// Per-frame feed from game.js. state = { combo, attackId, attackName, lastDmg }.
//   combo       — attacker's live comboCounter (0 when no combo active)
//   attackId    — a counter game.js bumps each time the player STARTS a new attack
//   attackName  — the move key of the player's current/most-recent attack
//   lastDmg     — value of the most recent damage number (for the star rating)
// Returns the live info object (or null if nothing armed).
export function update(state = {}) {
  if (!_run) return null
  if (_run.flash > 0) _run.flash--

  const combo = state.combo | 0
  // A dropped combo (back to neutral) ends any in-progress attempt so the next
  // combo is judged fresh. A finished PASS/FAIL also resets here once combo=0.
  if (combo <= 0) {
    if (_run.status === "active") _run.status = "ready"
    _resetAttempt()
    _run._prevCombo = 0
    return activeInfo()
  }

  const rose = combo > (_run._prevCombo || 0)
  _run._prevCombo = combo

  // Attribute each fresh landed hit to the current attack, ONCE per attack instance.
  if (rose && state.attackId != null && state.attackId !== _run.lastAttackId) {
    _run.lastAttackId = state.attackId
    const landed = state.attackName || ""
    _onLanded(landed, state.lastDmg | 0)
  }
  return activeInfo()
}

function _onLanded(move, dmg) {
  // Only accept the first hit of an attack once the previous result is cleared.
  if (_run.status === "pass" || _run.status === "fail") return
  const seq = _run.trial.seq
  const expected = seq[_run.idx]
  _run.status = "active"
  if (move === expected) {
    _run.idx++
    _run.dmg += Math.max(0, dmg)
    if (_run.idx >= seq.length) {
      // COMPLETE — rate by accumulated combo damage.
      const stars = 1 + (_run.dmg >= _run.trial.t2 ? 1 : 0) + (_run.dmg >= _run.trial.t3 ? 1 : 0)
      _run.status = "pass"; _run.result = "pass"; _run.lastStars = stars; _run.flash = 150
      _recordBest(_run.trial.id, stars)
    }
  } else {
    // Wrong move landed as part of the combo → this attempt fails.
    _run.status = "fail"; _run.result = "fail"; _run.flash = 90
  }
}

// Snapshot for the HUD.
export function activeInfo() {
  if (!_run) return null
  const seq = _run.trial.seq
  return {
    charKey: _run.charKey,
    name: _run.trial.name,
    desc: _run.trial.desc,
    seq,
    seqLabels: seq.map(moveLabel),
    landed: _run.idx,            // how many steps matched so far this attempt
    status: _run.status,         // "ready" | "active" | "pass" | "fail"
    flash: _run.flash,
    lastStars: _run.lastStars,
    best: bestStars(_run.trial.id),
    dmg: _run.dmg
  }
}
