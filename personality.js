// personality.js
// ─────────────────────────────────────────────────────────────────────────────
// GAME PERSONALITY SYSTEM — Big-Five trait inference from in-game behaviour.
//
// A TIPI (Ten-Item Personality Inventory) questionnaire seeds a per-trait PRIOR;
// real gameplay behaviour then refines each trait continuously via a standard
// scalar Bayesian (Kalman-style) filter. Everything is inspectable: each trait is
// a Gaussian belief (mu, sigma2), confidence falls straight out of sigma2, and an
// append-only bounded event log records exactly why each trait moved.
//
// This module is deliberately split into TWO layers:
//   1. PURE ENGINE (no side effects) — scoreTipi / initTraits / updateTrait /
//      recordEventPure / confidencePct / summarize. Fully deterministic, unit-
//      testable without a browser or an account.
//   2. ACCOUNT LAYER — getPersonality / ensureSession / recordGameplayEvent /
//      setTipi / drawPersonalityPanel. Persists per-player state through account.js.
//
// ── NOTE ON THIS GAME ────────────────────────────────────────────────────────
// The design doc's Part-1 mapping table was written for an RPG (side-quests,
// dialogue tone, exploration, collectibles). multiverse-smash is a pure arcade
// FIGHTER, so most of those rows have no event source here. The full mapping
// registry is still encoded below for fidelity + forward-compatibility, each row
// tagged `live` (true = this game currently emits it). Only combat-derived rows
// are live today; if a story/quest layer is ever added, wiring the dormant rows
// is a one-line recordGameplayEvent() call.
// ─────────────────────────────────────────────────────────────────────────────

import { getCurrentAccount, persistence } from "./account.js"

// ── ENGINE CONSTANTS (tunable; starting points, not fixed truths) ────────────
export const TRAITS = ["O", "C", "E", "A", "N"]
export const TRAIT_LABELS = {
  O: "Openness", C: "Conscientiousness", E: "Extraversion",
  A: "Agreeableness", N: "Neuroticism"
}

export const SIGMA2_INITIAL        = 1.5    // starting variance from the TIPI prior
const Q_ROUTINE                    = 0.02   // process noise injected once per session
const Q_CONFLICT                   = 0.15   // extra process noise when evidence strongly disagrees
const CONFLICT_THRESHOLD_STD       = 2.0    // how many std devs away counts as "surprising"
const TIPI_ABSENT_PRIOR            = 4.0     // neutral midpoint of the 1-7 scale (no questionnaire yet)
const EVENT_LOG_CAP                = 500     // bounded, for auditability only (doc §4 retention)
const SCALE_MIN                    = 1.0
const SCALE_MAX                    = 7.0

const STRENGTH_TO_R = { strong: 0.3, moderate: 0.8, weak: 2.0 }

// A single, per-page-load session id. Used to inject routine process noise exactly
// once per session (doc §2). Stamped at import so every module sharing this import
// agrees on "this session". (Not exported — engine-internal.)
const SESSION_ID = "s_" + Date.now().toString(36)

// ── EVENT MAPPING REGISTRY (doc §1) ──────────────────────────────────────────
// Each event type maps to one or more (trait, direction, strength) tuples.
// `live` = the fighter currently emits this event. Split-weight rows (exploration,
// risk-taking) carry a secondary weak counter-weight exactly as the doc prescribes.
// `note` preserves the doc's confound warning so the debug panel / audit can show it.
export const EVENT_MAP = {
  // ── RPG-shaped rows (dormant here — no quest/dialogue/exploration systems) ──
  sidequest_no_reward:  { live: false, evidence: [["A", +1, "strong"]],   note: "Prosocial w/ no incentive — close to the construct." },
  dialogue_blunt:       { live: false, evidence: [["A", -1, "moderate"]], note: "Only when tone is unambiguous / not plot-forced." },
  dialogue_diplomatic:  { live: false, evidence: [["A", +1, "moderate"]], note: "Only when tone is unambiguous / not plot-forced." },
  full_completion:      { live: false, evidence: [["C", +1, "strong"]],   note: "Down-weight if game has heavy completion rewards." },
  abandon_side_content: { live: false, evidence: [["C", -1, "moderate"]], note: "May just mean 'not interested', not undisciplined." },
  exploration_wander:   { live: false, evidence: [["O", +1, "moderate"], ["C", -1, "weak"]], note: "Confounded with low goal-direction → split C(-)." },
  novel_strategy:       { live: false, evidence: [["O", +1, "strong"]],   note: "Novelty over meta/safe — core Openness." },
  npc_banter:           { live: false, evidence: [["E", +1, "moderate"]], note: "Reasonable proxy where the content exists." },
  replay_content:       { live: false, evidence: [["O", +1, "weak"]],     note: "Ambiguous — could be perfectionism instead." },
  fast_decision:        { live: false, evidence: [["C", -1, "weak"]],     note: "Confounded with game literacy — excluded by default." },
  risk_taking:          { live: false, evidence: [["N", -1, "weak"], ["E", +1, "weak"]], note: "Confounded with sensation-seeking → split N/E." },

  // ── LIVE rows the fighter actually emits ───────────────────────────────────
  combat_aggressive:    { live: true,  evidence: [["E", +1, "weak"]],     note: "Rush style — mostly genre familiarity, kept weak." },
  combat_cautious:      { live: true,  evidence: [["E", -1, "weak"]],     note: "Defensive style — mostly build/skill, kept weak." },
  composure_under_loss: { live: true,  evidence: [["N", -1, "moderate"]], note: "Closed out a genuine back-and-forth match — calm under pressure." },
  retry_after_loss:     { live: true,  evidence: [["N", +1, "weak"]],     note: "Immediate rematch after a loss — retry impulse (doc: +N). Confounded, kept weak." },
  moved_on_after_loss:  { live: true,  evidence: [["N", -1, "weak"]],     note: "Stepped away calmly after a loss — the -N counterpart. Confounded, kept weak." },

  // ── LIVE fighter-behaviour rows for the axes that used to have NO source (O/C/A) ──
  // Before these, only E and N ever moved — three of the five Big-Five axes were frozen at the neutral
  // prior forever (there is no TIPI questionnaire UI), so "The Choir's Reading" could never fill in. These
  // give Openness / Conscientiousness / Agreeableness honest fighter-derived evidence. Each carries the
  // usual confound `note`; the genuinely ambiguous ones are kept `weak` on purpose.
  played_new_character: { live: true,  evidence: [["O", +1, "moderate"]], note: "Picked a fighter you'd NEVER used before — novelty-seeking / trying the unfamiliar (Openness)." },
  diverse_moveset:      { live: true,  evidence: [["O", +1, "weak"]],     note: "Leaned on a wide toolkit (many specials) in one match — exploratory. Weak: could be mashing." },
  disciplined_play:     { live: true,  evidence: [["C", +1, "moderate"]], note: "Landed a FLAWLESS round (zero damage taken) — controlled, disciplined execution (Conscientiousness)." },
  reckless_play:        { live: true,  evidence: [["C", -1, "weak"]],     note: "Took far more damage than you dealt — undisciplined / reckless. Weak: might just be a bad matchup." },
  measured_victory:     { live: true,  evidence: [["A", +1, "weak"]],     note: "Won WITHOUT resorting to an ultimate — a restrained, unshowy finish. Weak, confounded." },
  ruthless_finish:      { live: true,  evidence: [["A", -1, "weak"]],     note: "Leaned on ultimates to dominate — a go-for-the-throat competitive streak (low A). Weak, confounded." }
}

// ═════════════════════════════════════════════════════════════════════════════
// PURE ENGINE
// ═════════════════════════════════════════════════════════════════════════════

export function clamp(x, lo = SCALE_MIN, hi = SCALE_MAX) { return Math.max(lo, Math.min(hi, x)) }

// TIPI scoring (Gosling, Rentfrow & Swann, 2003). `items` is a length-10 array of
// 1-7 ratings for the standard prompts, in order:
//   1 Extraverted,enthusiastic   2 Critical,quarrelsome     3 Dependable,self-disciplined
//   4 Anxious,easily upset       5 Open to new,complex      6 Reserved,quiet
//   7 Sympathetic,warm           8 Disorganized,careless    9 Calm,emotionally stable
//   10 Conventional,uncreative
// Each trait = mean of its two items; the even-numbered "reversed" items recode as 8-x.
export function scoreTipi(items) {
  const v = (i) => clamp(Number(items?.[i - 1]) || TIPI_ABSENT_PRIOR)   // 1-indexed prompt → 0-indexed array
  const rev = (x) => 8 - x
  return {
    E: (v(1) + rev(v(6))) / 2,
    A: (rev(v(2)) + v(7)) / 2,
    C: (v(3) + rev(v(8))) / 2,
    N: (v(4) + rev(v(9))) / 2,
    O: (v(5) + rev(v(10))) / 2
  }
}

// Build a fresh belief set from TIPI scores (or the neutral prior for missing traits).
export function initTraits(tipiScores = {}, nowIso = null) {
  const traits = {}
  for (const t of TRAITS) {
    const mu = clamp(Number(tipiScores?.[t]) || TIPI_ABSENT_PRIOR)
    traits[t] = { mu, sigma2: SIGMA2_INITIAL, n_events: 0, last_updated: nowIso }
  }
  return traits
}

// Routine per-session process noise (doc §2): widen every belief a hair so the model
// never becomes permanently immovable, keeping the door open for genuine change.
export function applyProcessNoise(traits, q = Q_ROUTINE) {
  for (const t of TRAITS) if (traits[t]) traits[t].sigma2 += q
}

// Scalar Bayesian (Kalman) update of one trait belief against a single observation.
// Mutates `ts` in place and returns the before/after audit numbers. `z` is the value
// this one event alone would suggest for the trait (NOT a delta); `r` is its
// observation variance from the strength table.
export function updateTrait(ts, z, r) {
  const mu_before = ts.mu
  let sigma2_before = ts.sigma2

  // Conflict check: a surprising observation (>2σ away) widens the belief before the
  // update, so the model is willing to move when consistently surprised rather than
  // stubbornly resisting real change.
  const std = Math.sqrt(sigma2_before)
  let conflicted = false
  if (std > 0 && Math.abs(z - mu_before) / std > CONFLICT_THRESHOLD_STD) {
    ts.sigma2 += Q_CONFLICT
    sigma2_before = ts.sigma2
    conflicted = true
  }

  const k = sigma2_before / (sigma2_before + r)          // Kalman gain
  const mu_after = mu_before + k * (z - mu_before)
  const sigma2_after = (1 - k) * sigma2_before

  ts.mu = clamp(mu_after)
  ts.sigma2 = sigma2_after
  ts.n_events += 1
  return { mu_before, mu_after: ts.mu, sigma2_before, sigma2_after: ts.sigma2, k, conflicted }
}

// Apply one mapped event to a belief set. Returns log entries (one per affected trait);
// does NOT touch the log store itself (the account layer owns retention).
export function recordEventPure(traits, eventType, nowIso = null) {
  const map = EVENT_MAP[eventType]
  if (!map) return []
  const entries = []
  for (const [trait, direction, strength] of map.evidence) {
    const ts = traits[trait]
    if (!ts) continue
    const r = STRENGTH_TO_R[strength]
    const z = direction > 0 ? SCALE_MAX : SCALE_MIN      // event pushes toward the implied extreme
    const audit = updateTrait(ts, z, r)
    ts.last_updated = nowIso
    entries.push({
      event_type: eventType, trait, direction, strength, z, r,
      mu_before: round2(audit.mu_before), mu_after: round2(audit.mu_after),
      sigma2_before: round3(audit.sigma2_before), sigma2_after: round3(audit.sigma2_after),
      conflicted: audit.conflicted
    })
  }
  return entries
}

// Confidence (doc §3): 0% at the raw TIPI prior, rising as sigma2 shrinks, able to fall
// again when process/conflict noise re-widens the belief.
export function confidencePct(ts) {
  if (!ts) return 0
  const ratio = Math.min(ts.sigma2 / SIGMA2_INITIAL, 1)
  return Math.round(1000 * (1 - ratio)) / 10
}

// Inspectable snapshot of a belief set — the shape the debug panel / harness read.
export function summarize(traits) {
  const out = {}
  for (const t of TRAITS) {
    const ts = traits[t]
    out[t] = ts
      ? { mu: round2(ts.mu), sigma2: round3(ts.sigma2), n_events: ts.n_events, confidence: confidencePct(ts) }
      : null
  }
  return out
}

// Deterministic end-to-end helper for tests: prior → events → summary, no account.
export function simulate(tipiScores, events = []) {
  const traits = initTraits(tipiScores)
  for (const e of events) recordEventPure(traits, typeof e === "string" ? e : e.type)
  return { traits, summary: summarize(traits) }
}

function round2(x) { return Math.round(x * 100) / 100 }
function round3(x) { return Math.round(x * 1000) / 1000 }

// ═════════════════════════════════════════════════════════════════════════════
// ACCOUNT LAYER (per-player persistence via account.js)
// ═════════════════════════════════════════════════════════════════════════════

// ★ STANDALONE PERSISTENCE (localStorage; guest-safe, account-INDEPENDENT). The profile
// was previously stored in account.personality, which silently persisted NOTHING for
// guests (the default player — no account) → the whole "let personality dictate the game"
// premise had nothing to build on. Now the profile lives in its own localStorage key and
// survives every restart for everyone, mirroring musicLibrary's guest-safe design. The
// account param is still accepted on the public functions (signature stability) but ignored.
const LS_KEY = "multiverse-smash-personality"
function _lsAvailable() { try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false } }
function _blankProfile() {
  return { tipiComplete: false, tipi: { O: 0, C: 0, E: 0, A: 0, N: 0 }, traits: initTraits({}), events: [], sessionStamp: null, playedChars: [] }
}
function _repair(p) {
  if (!p || typeof p !== "object") p = _blankProfile()
  if (!p.traits || typeof p.traits !== "object") { p.traits = initTraits({}) }
  for (const t of TRAITS) {
    if (!p.traits[t] || typeof p.traits[t] !== "object") p.traits[t] = { mu: TIPI_ABSENT_PRIOR, sigma2: SIGMA2_INITIAL, n_events: 0, last_updated: null }
  }
  if (!Array.isArray(p.events)) p.events = []
  if (!Array.isArray(p.playedChars)) p.playedChars = []   // roster keys P1 has fought as (novelty → Openness)
  if (typeof p.tipiComplete !== "boolean") p.tipiComplete = false
  if (!p.tipi || typeof p.tipi !== "object") p.tipi = { O: 0, C: 0, E: 0, A: 0, N: 0 }
  return p
}
function _loadProfile() {
  if (!_lsAvailable()) return _blankProfile()
  try { return _repair(JSON.parse(localStorage.getItem(LS_KEY) || "null")) } catch (_) { return _blankProfile() }
}
let _profile = _loadProfile()

// The tracked profile (standalone, always available — guest-safe). Account param ignored.
export function getPersonality(_account) { return _profile }

// Seed (or re-seed) the prior from a completed TIPI questionnaire. Resets the beliefs
// to fresh priors around the new scores — a questionnaire is ground-truth-ish, so it
// supersedes accumulated behaviour rather than being averaged into it.
export function setTipi(items, account = getCurrentAccount()) {
  const p = getPersonality(account)
  if (!p) return null
  const scores = scoreTipi(items)
  p.tipi = scores
  p.tipiComplete = true
  p.traits = initTraits(scores, new Date().toISOString())
  _save(account)
  return summarize(p.traits)
}

// Inject routine process noise once per session, before any events that session.
export function ensureSession(account = getCurrentAccount()) {
  const p = getPersonality(account)
  if (!p) return
  if (p.sessionStamp !== SESSION_ID) {
    applyProcessNoise(p.traits, Q_ROUTINE)
    p.sessionStamp = SESSION_ID
    _save(account)
  }
}

// Record a gameplay event by its mapping-registry key. No-ops for unknown/dormant
// events and when there's no current account. Persists after applying.
export function recordGameplayEvent(eventType, ctx = {}, account = getCurrentAccount()) {
  const map = EVENT_MAP[eventType]
  if (!map) return null
  const p = getPersonality(account)
  if (!p) return null
  const nowIso = new Date().toISOString()
  const entries = recordEventPure(p.traits, eventType, nowIso)
  if (!entries.length) return null
  for (const e of entries) {
    p.events.push({ ...e, ts: nowIso, ctx })
    if (p.events.length > EVENT_LOG_CAP) p.events.shift()   // bounded retention
  }
  _save(account)
  return entries
}

// Derive + record the personality events a finished match implies, from the P1
// (local human) perspective. Called at match end. `matchStats` is matchflow's stats
// object; `p1Won`/`totalRounds` come from the match outcome.
export function recordMatchOutcome({ matchStats, p1Won, p1Char = null, account = getCurrentAccount() } = {}) {
  const p = getPersonality(account)
  if (!p || !matchStats?.p1) return null
  const s = matchStats.p1
  const total = matchStats.totalRounds || 0
  const specials = s.specialsUsed || 0, ults = s.ultimatesUsed || 0
  const dmgDealt = s.damageDealt || 0, dmgTaken = matchStats.p2?.damageDealt || 0

  // (1) Combat style → Extraversion (WEAK). Aggressive = comboing / leaning on
  //     specials+ultimates; otherwise cautious. Weak by design (doc: mostly genre).
  const aggressive = (s.maxCombo || 0) >= 3 || (specials + ults) >= 3
  recordGameplayEvent(aggressive ? "combat_aggressive" : "combat_cautious",
    { maxCombo: s.maxCombo, specials, ultimates: ults }, account)

  // (2) Composure under pressure → Neuroticism (-, MODERATE). Only a genuine stress
  //     moment counts: closing out a multi-round back-and-forth you won.
  if (p1Won && total >= 2) {
    recordGameplayEvent("composure_under_loss", { totalRounds: total, perfectRounds: s.perfectRounds }, account)
  }

  // (3) OPENNESS — novelty. Fighting as a character you've NEVER used before is genuine
  //     novelty-seeking (moderate). Also: a wide toolkit in one match reads as exploratory (weak).
  if (p1Char) {
    if (!Array.isArray(p.playedChars)) p.playedChars = []
    if (!p.playedChars.includes(p1Char)) {
      p.playedChars.push(p1Char)
      recordGameplayEvent("played_new_character", { char: p1Char, roster: p.playedChars.length }, account)
    }
  }
  if (specials >= 3) recordGameplayEvent("diverse_moveset", { specials }, account)

  // (4) CONSCIENTIOUSNESS — discipline. A FLAWLESS round (zero damage taken) is controlled execution
  //     (moderate). Taking a real beating relative to what you dealt reads as reckless (weak, confounded).
  if ((s.perfectRounds || 0) >= 1) recordGameplayEvent("disciplined_play", { perfectRounds: s.perfectRounds }, account)
  else if (dmgDealt > 0 && dmgTaken > dmgDealt * 1.4) recordGameplayEvent("reckless_play", { dmgDealt, dmgTaken }, account)

  // (5) AGREEABLENESS — restraint vs. ruthlessness. Winning WITHOUT an ultimate is an unshowy, measured
  //     finish (weak, +A); leaning on multiple ultimates to dominate is a competitive streak (weak, -A).
  if (p1Won && ults === 0) recordGameplayEvent("measured_victory", { ults }, account)
  else if (ults >= 2) recordGameplayEvent("ruthless_finish", { ults }, account)

  _save(account)   // persist playedChars mutation even if only novelty fired
  return summarize(p.traits)
}

// Record the player's post-loss CHOICE → the two-sided Neuroticism counterweight.
// `retry` true = hit rematch immediately, false = went back to the menu. Only
// meaningful after a P1 loss (caller gates on that).
export function recordVictoryChoice(retry, account = getCurrentAccount()) {
  return recordGameplayEvent(retry ? "retry_after_loss" : "moved_on_after_loss", {}, account)
}

function _save(_account) {
  if (_lsAvailable()) { try { localStorage.setItem(LS_KEY, JSON.stringify(_profile)) } catch (_) {} }
}

// ═════════════════════════════════════════════════════════════════════════════
// DEBUG PANEL (canvas 2D — matches the existing HUD idiom)
// ═════════════════════════════════════════════════════════════════════════════
export function drawPersonalityPanel(ctx, canvas, account = getCurrentAccount()) {
  const p = getPersonality(account)
  const x = 12, y = 120, w = 300
  const rowH = 30, headH = 46, footH = 22
  const h = headH + TRAITS.length * rowH + footH

  ctx.save()
  ctx.fillStyle = "rgba(10, 19, 34, 0.86)"
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = "rgba(120, 170, 255, 0.5)"
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, w, h)

  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"
  ctx.fillStyle = "#cfe3ff"
  ctx.font = "bold 14px Arial"
  ctx.fillText("PERSONALITY  (Big Five)", x + 12, y + 22)

  ctx.font = "11px monospace"
  ctx.fillStyle = "#8fb3e6"
  const tag = !p ? "no account" : (p.tipiComplete ? "TIPI + behaviour" : "neutral prior + behaviour")
  ctx.fillText(tag, x + 12, y + 38)

  if (p) {
    let ry = y + headH + 8
    for (const t of TRAITS) {
      const ts = p.traits[t]
      const conf = confidencePct(ts)
      const barX = x + 92, barW = w - 92 - 58
      const frac = (ts.mu - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)

      // label
      ctx.fillStyle = "#cfe3ff"
      ctx.font = "bold 12px monospace"
      ctx.fillText(`${t}`, x + 12, ry + 10)
      ctx.fillStyle = "#7f9dc4"
      ctx.font = "9px Arial"
      ctx.fillText(TRAIT_LABELS[t].slice(0, 9), x + 24, ry + 10)

      // mu bar (1-7), fill tinted by confidence
      ctx.fillStyle = "rgba(255,255,255,0.10)"
      ctx.fillRect(barX, ry, barW, 10)
      const g = Math.round(120 + conf)                       // brighter = more confident
      ctx.fillStyle = `rgb(74, ${Math.min(g, 235)}, 224)`
      ctx.fillRect(barX, ry, barW * frac, 10)

      // numbers: mu + confidence + n
      ctx.fillStyle = "#e6efff"
      ctx.font = "10px monospace"
      ctx.textAlign = "right"
      ctx.fillText(`${ts.mu.toFixed(2)}  ${conf.toFixed(0)}%`, x + w - 10, ry + 9)
      ctx.textAlign = "left"
      ry += rowH
    }
    ctx.fillStyle = "#6f89ad"
    ctx.font = "9px monospace"
    const totalEvents = p.traits.E ? TRAITS.reduce((a, t) => a + (p.traits[t]?.n_events || 0), 0) : 0
    ctx.fillText(`events:${p.events.length}  updates:${totalEvents}  (mu 1-7 · conf%)`, x + 12, y + h - 8)
  }
  ctx.restore()
}
