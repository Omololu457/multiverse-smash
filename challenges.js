// challenges.js
// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGES — discrete, skill-based tasks grounded in this game's REAL mechanics
// (match stats: ultimates, specials, combos, perfect rounds, damage; + franchise
// tracking). Completing one grants XP and (some) a specific SKIN — layered on top of
// the EXISTING level/arcade/tower character-unlock system, which is left untouched.
//
// Personality tie-in (Part 2, Option A — recommendation layer ONLY): every challenge
// is trait-tagged with the SAME affinity methodology used for songs (musicPersonality),
// and "recommended for you" is CONFIDENCE-GATED exactly like the music personalization —
// a low-confidence / early-game profile falls back to the neutral default order. Nothing
// is ever hidden or gated by personality; every challenge stays available to everyone.
//
// Storage is STANDALONE (own localStorage key) so completion + skin rewards persist for
// GUESTS too — mirroring musicLibrary/personality's guest-safe design.
// ─────────────────────────────────────────────────────────────────────────────

import { awardXp } from "./progression.js"

export const TRAITS = ["O", "C", "E", "A", "N"]

// ── CHALLENGE DEFINITIONS ─────────────────────────────────────────────────────
// `check(ctx)` runs at match end with ctx = { won, stats, universe }. `franchiseWins`
// challenges use a per-universe win counter instead (see recordMatch). `traits` are
// affinities in [-1,1] — "a player HIGH in this trait gravitates toward this playstyle."
// `reward.skin` references a REAL existing skin (granted via a guest-safe unlock store
// that isSkinUnlocked consults). Every task is grounded in a mechanic the game has.
export const CHALLENGES = [
  { id: "first_blood", label: "First Blood", desc: "Win any match.",
    traits: { E: 0.3 }, reward: { xp: 50, title: "Contender" },
    check: (c) => c.won },
  { id: "finish_them", label: "Finish Them", desc: "Win a match in which you land your Ultimate.",
    traits: { E: 0.6, O: 0.3 }, reward: { xp: 100, skin: { rosterKey: "gon", skinId: "gon_crimson" } },
    check: (c) => c.won && (c.stats.ultimatesUsed || 0) >= 1 },
  { id: "untouchable", label: "Untouchable", desc: "Win a match with a flawless (zero-damage) round.",
    traits: { N: -0.6, C: 0.4 }, reward: { xp: 120, title: "Untouchable" },
    check: (c) => c.won && (c.stats.perfectRounds || 0) >= 1 },
  { id: "combo_artist", label: "Combo Artist", desc: "Land a 6-hit combo in a single match.",
    traits: { O: 0.6, E: 0.4 }, reward: { xp: 100, title: "Stylist" },
    check: (c) => (c.stats.maxCombo || 0) >= 6 },
  { id: "technician", label: "Technician", desc: "Win a match using 4 or more special moves.",
    traits: { C: 0.7 }, reward: { xp: 100, skin: { rosterKey: "gon", skinId: "gon_azure" } },
    check: (c) => c.won && (c.stats.specialsUsed || 0) >= 4 },
  { id: "all_in", label: "All-In", desc: "Win a match with a 5+ combo and no flawless round (pure offense).",
    traits: { E: 0.7, N: -0.4 }, reward: { xp: 100, title: "Berserker" },
    check: (c) => c.won && (c.stats.maxCombo || 0) >= 5 && (c.stats.perfectRounds || 0) === 0 },
  { id: "purist", label: "Iron Will", desc: "Win a match without using any special or ultimate (basics only).",
    traits: { C: 0.5, N: -0.3 }, reward: { xp: 120, title: "Purist" },
    check: (c) => c.won && (c.stats.specialsUsed || 0) === 0 && (c.stats.ultimatesUsed || 0) === 0 },
  { id: "heavy_hitter", label: "Heavy Hitter", desc: "Deal 1500+ damage in a single match.",
    traits: { E: 0.5 }, reward: { xp: 80, title: "Bruiser" },
    check: (c) => (c.stats.damageDealt || 0) >= 1500 },
  { id: "perfectionist", label: "Perfectionist", desc: "Win a multi-round match flawlessly (every round won was perfect).",
    traits: { C: 0.7, N: -0.5 }, reward: { xp: 200, title: "Perfectionist" },
    check: (c) => c.won && (c.stats.roundsWon || 0) >= 2 && (c.stats.perfectRounds || 0) >= (c.stats.roundsWon || 0) },
  { id: "franchise_loyalty", label: "Franchise Loyalty", desc: "Win 3 matches with characters from the same franchise.",
    traits: { A: 0.6, C: 0.3 }, reward: { xp: 150, title: "Loyalist" },
    franchiseWins: 3 },   // counter-based (per-universe), not a single-match check
]

const BY_ID = new Map(CHALLENGES.map(c => [c.id, c]))

// ── STANDALONE PERSISTENCE (guest-safe) ───────────────────────────────────────
const LS_KEY = "multiverse-smash-challenges"
function _lsAvailable() { try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false } }
function _blank() { return { completed: {}, franchise: {}, unlockedSkins: [] } }
function _load() {
  if (!_lsAvailable()) return _blank()
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY) || "null")
    if (!d || typeof d !== "object") return _blank()
    return {
      completed: (d.completed && typeof d.completed === "object") ? d.completed : {},
      franchise: (d.franchise && typeof d.franchise === "object") ? d.franchise : {},
      unlockedSkins: Array.isArray(d.unlockedSkins) ? d.unlockedSkins.filter(s => s && s.rosterKey && s.skinId) : []
    }
  } catch (_) { return _blank() }
}
let _state = _load()
function _persist() { if (_lsAvailable()) { try { localStorage.setItem(LS_KEY, JSON.stringify(_state)) } catch (_) {} } }

export function isChallengeComplete(id) { return !!_state.completed[id] }
export function completedCount() { return Object.keys(_state.completed).filter(id => _state.completed[id]).length }

// Full challenge list with live completion + franchise progress (for the UI / harness).
export function getChallenges() {
  return CHALLENGES.map(c => ({
    id: c.id, label: c.label, desc: c.desc, traits: c.traits, reward: c.reward,
    complete: isChallengeComplete(c.id),
    progress: c.franchiseWins ? { have: _bestFranchise().count, need: c.franchiseWins } : null
  }))
}

// The skins unlocked via challenges — isSkinUnlocked() in skins.js consults this so a
// challenge reward actually grants access (guest-safe, persisted).
export function getUnlockedChallengeSkins() { return _state.unlockedSkins.map(s => ({ ...s })) }
export function isChallengeSkinUnlocked(rosterKey, skinId) {
  return _state.unlockedSkins.some(s => s.rosterKey === rosterKey && s.skinId === skinId)
}

function _bestFranchise() {
  let best = null, count = 0
  for (const [u, n] of Object.entries(_state.franchise)) if (n > count) { count = n; best = u }
  return { universe: best, count }
}

// Grant a challenge's reward: XP + optional skin unlock + record completion. Idempotent
// (a completed challenge never re-grants). Returns the reward granted, or null if already done.
function _complete(c) {
  if (_state.completed[c.id]) return null
  _state.completed[c.id] = true
  const r = c.reward || {}
  if (r.xp) { try { awardXp(r.xp) } catch (_) {} }
  if (r.skin && r.skin.rosterKey && r.skin.skinId && !isChallengeSkinUnlocked(r.skin.rosterKey, r.skin.skinId)) {
    _state.unlockedSkins.push({ rosterKey: r.skin.rosterKey, skinId: r.skin.skinId })
  }
  _persist()
  return { id: c.id, label: c.label, reward: r }
}

// Evaluate all incomplete challenges against a finished match. ctx = { won, stats, universe }.
// Returns the list of challenges newly completed THIS match (for a victory-screen toast).
export function recordMatch({ won = false, stats = {}, universe = null } = {}) {
  const newlyDone = []
  // Franchise counter: a WIN with a character increments that universe's tally.
  if (won && universe) {
    _state.franchise[universe] = (_state.franchise[universe] || 0) + 1
    _persist()
  }
  const ctx = { won, stats, universe }
  for (const c of CHALLENGES) {
    if (_state.completed[c.id]) continue
    let done = false
    if (c.franchiseWins) done = _bestFranchise().count >= c.franchiseWins
    else if (typeof c.check === "function") { try { done = !!c.check(ctx) } catch (_) { done = false } }
    if (done) { const g = _complete(c); if (g) newlyDone.push(g) }
  }
  return newlyDone
}

// Directly complete a challenge by id (used by non-match challenges / debug / tests).
export function completeChallenge(id) { const c = BY_ID.get(id); return c ? _complete(c) : null }

// ── TRAIT-INFORMED RECOMMENDATION (confidence-gated, same as the music system) ─
const CONF_GATE_PCT = 50, NEUTRAL_MU = 4.0, MU_SPAN = 3.0
function _normalizeProfile(profile) {
  const out = {}
  for (const t of TRAITS) {
    const raw = profile?.[t]
    let mu = NEUTRAL_MU, conf = null
    if (raw && typeof raw === "object") { mu = Number(raw.mu ?? NEUTRAL_MU); conf = Number(raw.confidence ?? NaN) }
    else if (typeof raw === "number") { mu = raw }
    out[t] = { elevation: Math.max(-1, Math.min(1, (mu - NEUTRAL_MU) / MU_SPAN)), weight: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf / CONF_GATE_PCT)) : 1 }
  }
  return out
}
export function hasActionableSignal(profile) {
  const p = _normalizeProfile(profile)
  return TRAITS.some(t => p[t].weight >= 1 && Math.abs(p[t].elevation) >= 0.1)
}
function _score(traits, np) { let s = 0; for (const t of TRAITS) s += (traits[t] || 0) * np[t].elevation * np[t].weight; return s }

// Rank the INCOMPLETE challenges for a profile (best match first). Stable on ties.
export function rankChallengesForProfile(profile) {
  const np = _normalizeProfile(profile)
  return CHALLENGES
    .filter(c => !isChallengeComplete(c.id))
    .map((c, i) => ({ id: c.id, label: c.label, score: _score(c.traits || {}, np), _i: i }))
    .sort((a, b) => (b.score - a.score) || (a._i - b._i))
    .map(({ _i, ...rest }) => rest)
}

// "Recommended challenges for you": personalized order IF the profile has a confident,
// off-neutral signal; otherwise the neutral DEFAULT order (incomplete challenges in
// definition order) — mirroring the music "keeping current playlist" fallback.
export function getRecommendedChallenges(profile, n = 0) {
  const personalized = hasActionableSignal(profile)
  const ids = personalized
    ? rankChallengesForProfile(profile).map(r => r.id)
    : CHALLENGES.filter(c => !isChallengeComplete(c.id)).map(c => c.id)
  return { personalized, challenges: n > 0 ? ids.slice(0, n) : ids }
}
