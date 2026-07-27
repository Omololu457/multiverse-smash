// spectator.js
// ---------------------------------------------------------------------------
// AI vs AI SPECTATOR / TESTING MODE — match telemetry + exportable logs.
//
// This module is a DEPENDENCY-FREE data layer: it never imports game state and
// never touches balance data. game.js feeds it events (moves used, hits landed,
// round/match outcomes); it accumulates a structured session log and serialises
// that log to JSON or CSV.
//
// The log format is deliberately shaped for a FUTURE self-play training pipeline:
//   • `events` is the raw, ordered move-by-move stream (one entry per move start /
//     connected hit / round end) — the sequence a training run would replay.
//   • the per-fighter aggregates (movesUsed, damageByMove, hits, combos …) are
//     convenience summaries derived from that same stream.
//
// Nothing here mutates the game; it only reads values passed in.
// ---------------------------------------------------------------------------

export const SPECTATOR_SCHEMA = "multiverse-smash.spectator.v1"

// Difficulties the setup screen offers per fighter (ai.js also has "dummy", which
// we deliberately leave out of the picker — a dummy never fights).
export const SPECTATOR_DIFFICULTIES = ["easy", "adaptive", "impossible"]
// Fast-forward multipliers: logic ticks run per rendered frame (1 = real time).
export const SPECTATOR_SPEEDS = [1, 2, 4, 8]

// ─────────────────────────────────────────────────────────────────
// SESSION
// A session bundles the whole "run N matches" request + its results.
// ─────────────────────────────────────────────────────────────────
export function createSpectatorSession(config = {}, now = 0) {
  return {
    schema:    SPECTATOR_SCHEMA,
    createdAt: now,
    config: {
      p1:      { char: config.p1Char || null, difficulty: config.p1Difficulty || null },
      p2:      { char: config.p2Char || null, difficulty: config.p2Difficulty || null },
      matches: config.matches || 1,
      speed:   config.speed   || 1,
      stage:   config.stage   || null
    },
    matches: [],       // one entry per completed match (see startMatchLog)
    _current: null     // the in-progress match log (not serialised directly)
  }
}

// Begin recording a fresh match. Returns the match log and stashes it as the
// session's current match so the log* helpers can find it without threading it
// through every call site.
export function startMatchLog(session, meta = {}) {
  if (!session) return null
  const log = {
    index:          meta.index || (session.matches.length + 1),
    p1:             { char: meta.p1Char || null, difficulty: meta.p1Difficulty || null },
    p2:             { char: meta.p2Char || null, difficulty: meta.p2Difficulty || null },
    startFrame:     meta.frame || 0,
    durationFrames: 0,
    outcome:        null,
    rounds:         [],
    fighters: {
      p1: _newFighterAgg(meta.p1Char, meta.p1Difficulty),
      p2: _newFighterAgg(meta.p2Char, meta.p2Difficulty)
    },
    combos:  [],
    events:  [],
    // live combo-string builders (flushed into `combos` on break) — internal.
    _combo:  { p1: null, p2: null }
  }
  session._current = log
  return log
}

function _newFighterAgg(char, difficulty) {
  return {
    char, difficulty,
    movesUsed:     {},   // moveName -> times STARTED (whiff or connect)
    hitsLanded:    0,
    damageDealt:   0,
    damageByMove:  {},   // moveName -> total damage dealt with it (clean + chip)
    blockedHits:   0,
    maxCombo:      0,
    specialsUsed:  0,
    ultimatesUsed: 0
  }
}

// ─────────────────────────────────────────────────────────────────
// EVENT INGEST  (called from game.js hooks)
// ─────────────────────────────────────────────────────────────────

// A fighter STARTED a move (covers whiffs). `side` = "p1"|"p2".
export function logMoveUsed(session, side, move, meta = {}) {
  const log = session?._current
  if (!log || !move || !log.fighters[side]) return
  const agg = log.fighters[side]
  agg.movesUsed[move] = (agg.movesUsed[move] || 0) + 1
  log.events.push({ f: meta.frame || 0, t: "move", side, move, category: meta.category || null })
}

// A move CONNECTED. Records damage-per-move, feeds the combo-string builder, and
// appends a move-by-move event. `combo` is the attacker's live combo counter.
export function logHit(session, side, hit = {}) {
  const log = session?._current
  if (!log || !log.fighters[side]) return
  const agg   = log.fighters[side]
  const move  = hit.move || "(unknown)"
  const dmg   = hit.damage || 0
  const cat   = hit.category || "light"
  const blocked = !!hit.blocked
  const combo = hit.combo || 0

  agg.hitsLanded  += 1
  agg.damageDealt += dmg
  agg.damageByMove[move] = (agg.damageByMove[move] || 0) + dmg
  if (blocked) agg.blockedHits += 1
  if (combo > agg.maxCombo) agg.maxCombo = combo
  if (cat === "special")  agg.specialsUsed++
  if (cat === "ultimate") agg.ultimatesUsed++

  log.events.push({
    f: hit.frame || 0, t: "hit", side, move,
    category: cat, damage: dmg, blocked, combo,
    defender: side === "p1" ? "p2" : "p1"
  })

  // COMBO STRINGS: a run of connected (non-blocked) hits by the same attacker
  // while the combo counter keeps climbing. A block, a reset (combo <= 1), or the
  // other fighter connecting flushes the current string.
  if (!blocked) _comboAdd(log, side, move, dmg, combo)
  else          _comboFlush(log, side)
  // The instant one side connects, the OTHER side's string is over.
  _comboFlush(log, side === "p1" ? "p2" : "p1")
}

function _comboAdd(log, side, move, dmg, combo) {
  let c = log._combo[side]
  // A fresh string, or the counter dropped (previous string ended and a new hit
  // started one) → start a new builder.
  if (!c || combo <= 1 || combo <= c.lastCombo) {
    _comboFlush(log, side)
    c = log._combo[side] = { hits: [], damage: 0, lastCombo: 0 }
  }
  c.hits.push(move)
  c.damage  += dmg
  c.lastCombo = combo
}

function _comboFlush(log, side) {
  const c = log._combo[side]
  if (!c) return
  log._combo[side] = null
  if (c.hits.length >= 2) {
    log.combos.push({ attacker: side, hits: c.hits, length: c.hits.length, damage: c.damage })
  }
}

// A round finished. method = "ko" | "timeout" | "double_ko".
export function logRoundEnd(session, round = {}) {
  const log = session?._current
  if (!log) return
  _comboFlush(log, "p1"); _comboFlush(log, "p2")
  log.rounds.push({
    round:   round.round || (log.rounds.length + 1),
    winner:  round.winner || "draw",
    method:  round.method || "ko",
    p1Health: round.p1Health || 0,
    p2Health: round.p2Health || 0
  })
  log.events.push({ f: round.frame || 0, t: "round_end", round: round.round || log.rounds.length, winner: round.winner || "draw", method: round.method || "ko" })
}

// The match is over — stamp the outcome, flush combos, and move the log into the
// session's completed list.
export function finalizeMatchLog(session, outcome = {}) {
  const log = session?._current
  if (!log) return null
  _comboFlush(log, "p1"); _comboFlush(log, "p2")
  log.durationFrames = Math.max(0, (outcome.frame || 0) - (log.startFrame || 0))
  log.outcome = {
    winner:     outcome.winner || "draw",
    winnerName: outcome.winnerName || "",
    method:     outcome.method || _lastRoundMethod(log),
    roundsWon:  outcome.roundsWon || { p1: 0, p2: 0 }
  }
  delete log._combo
  session.matches.push(log)
  session._current = null
  return log
}

function _lastRoundMethod(log) {
  const r = log.rounds[log.rounds.length - 1]
  return r ? r.method : "ko"
}

// ─────────────────────────────────────────────────────────────────
// AGGREGATE SUMMARY (across all completed matches in the session)
// ─────────────────────────────────────────────────────────────────
export function summarizeSession(session) {
  const s = { totalMatches: session.matches.length, wins: { p1: 0, p2: 0, draw: 0 }, byMethod: {} }
  for (const m of session.matches) {
    const w = m.outcome?.winner || "draw"
    s.wins[w] = (s.wins[w] || 0) + 1
    const meth = m.outcome?.method || "ko"
    s.byMethod[meth] = (s.byMethod[meth] || 0) + 1
  }
  return s
}

// ─────────────────────────────────────────────────────────────────
// EXPORT — JSON
// ─────────────────────────────────────────────────────────────────
export function sessionToJSON(session, pretty = true) {
  const out = {
    schema:    session.schema,
    createdAt: session.createdAt,
    config:    session.config,
    summary:   summarizeSession(session),
    matches:   session.matches.map(_publicMatch)
  }
  return JSON.stringify(out, null, pretty ? 2 : 0)
}

// Strip internal builder fields from a match for serialisation.
function _publicMatch(m) {
  const { _combo, ...rest } = m
  return rest
}

// ─────────────────────────────────────────────────────────────────
// EXPORT — CSV  (flat, one row per move-by-move event; ideal for pandas)
// ─────────────────────────────────────────────────────────────────
const CSV_COLUMNS = [
  "match", "frame", "event", "attacker", "attacker_char", "defender",
  "move", "category", "damage", "blocked", "combo", "round", "winner", "method"
]

export function sessionToCSV(session) {
  const rows = [CSV_COLUMNS.join(",")]
  for (const m of session.matches) {
    const chars = { p1: m.p1.char, p2: m.p2.char }
    for (const e of m.events) {
      const side = e.side || ""
      const row = {
        match:         m.index,
        frame:         e.f || 0,
        event:         e.t,
        attacker:      side,
        attacker_char: side ? (chars[side] || "") : "",
        defender:      e.defender || "",
        move:          e.move || "",
        category:      e.category || "",
        damage:        e.damage != null ? e.damage : "",
        blocked:       e.t === "hit" ? (e.blocked ? 1 : 0) : "",
        combo:         e.combo != null ? e.combo : "",
        round:         e.round != null ? e.round : "",
        winner:        e.winner || "",
        method:        e.method || ""
      }
      rows.push(CSV_COLUMNS.map(c => _csvCell(row[c])).join(","))
    }
  }
  return rows.join("\n")
}

function _csvCell(v) {
  if (v == null) return ""
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// ─────────────────────────────────────────────────────────────────
// BROWSER DOWNLOAD helper (no-op outside a DOM — safe in node tests)
// ─────────────────────────────────────────────────────────────────
export function downloadText(filename, text, mime = "application/json") {
  try {
    if (typeof document === "undefined" || typeof Blob === "undefined") return false
    const blob = new Blob([text], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch (_) { return false }
}
