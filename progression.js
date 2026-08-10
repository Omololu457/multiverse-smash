// progression.js
// ──────────────────────────────────────────────────────────────────────────
// PLAYER PROGRESSION — XP, levels, reward unlocks, and feature gating.
//
// PERSISTENCE: in-memory for now (the sandbox blocks localStorage and there is
// no backend). ALL save/load is routed through account.js `persistence`, so
// turning on real storage/backend later is a ONE-MODULE change (swap the
// persistence object in account.js — see its TODO(backend) hooks). Progress does
// NOT survive a page reload yet; `PROGRESS_DOES_NOT_PERSIST` flags that for the UI.
// ──────────────────────────────────────────────────────────────────────────
import { getCurrentAccount, persistence } from "./account.js"

export const PROGRESS_DOES_NOT_PERSIST = true

// Guest profile when no account is selected (so progression always works).
const GUEST = "__guest__"
const _progress = new Map()                 // accountId -> { xp, matches, wins }
function _id()  { return getCurrentAccount()?.accountId || GUEST }
function _get(id = _id()) {
  if (!_progress.has(id)) _progress.set(id, { xp: 0, matches: 0, wins: 0 })
  return _progress.get(id)
}

// ── LEVEL CURVE ─────────────────────────────────────────────────────────────
// Cumulative XP required to REACH a level: 50·L·(L-1).
//   L1=0  L2=100  L3=300  L4=600  L5=1000  L6=1500 …
export function xpToReachLevel(L) { return 50 * L * (L - 1) }
export function levelFromXp(xp)   { let L = 1; while (xp >= xpToReachLevel(L + 1)) L++; return L }
export function getLevel(id)      { return levelFromXp(_get(id).xp) }
export function getXp(id)         { return _get(id).xp }
export function getStats(id)      { const p = _get(id); return { xp: p.xp, matches: p.matches, wins: p.wins } }

// Progress within the current level → drives an XP bar.
export function xpProgress(id) {
  const xp = _get(id).xp, L = levelFromXp(xp)
  const base = xpToReachLevel(L), next = xpToReachLevel(L + 1)
  const into = xp - base, need = next - base
  return { level: L, xp, into, need, pct: need ? into / need : 1 }
}

// ── XP AWARDS ───────────────────────────────────────────────────────────────
// Simple, tunable: participation + win bonus + per-round + perfect bonus.
export function awardMatchXp({ won = false, roundsWon = 0, perfect = false } = {}) {
  const p = _get()
  p.matches++; if (won) p.wins++
  const gained = 40 + (won ? 100 : 0) + Math.max(0, roundsWon) * 15 + (perfect ? 40 : 0)
  const before = levelFromXp(p.xp)
  p.xp += gained
  const after = levelFromXp(p.xp)
  _save(p)
  return { gained, level: after, leveledUp: after > before, newUnlocks: unlocksBetween(before, after) }
}

// Generic award (Tower floors, challenges, etc.).
export function awardXp(amount = 0) {
  const p = _get(); const before = levelFromXp(p.xp)
  p.xp += Math.max(0, amount | 0); const after = levelFromXp(p.xp); _save(p)
  return { gained: amount, level: after, leveledUp: after > before, newUnlocks: unlocksBetween(before, after) }
}

// ── FEATURE GATING (Task 4) ───────────────────────────────────────────────────
// Tag ANY feature with `unlocksAtLevel`. To gate a new feature: add an entry
// here and call isUnlocked("yourFeature") in the UI/flow. To change a level
// requirement, edit the number — that's the whole API.
export const FEATURES = {
  customTint: { label: "Custom Tint Colors", unlocksAtLevel: 4 },
  extraSkins: { label: "Alternate Skins",    unlocksAtLevel: 5 },
  towerMode:  { label: "Tower Mode",         unlocksAtLevel: 1 },   // raise to gate Tower behind a level
}
export function isUnlocked(featureId, id) {
  if (_devUnlock || _betaUnlock) return true  // dev OR beta code unlocks EVERYTHING (beta ALSO sprite-filters the roster)
  const f = FEATURES[featureId]
  if (!f) return true
  return getLevel(id) >= (f.unlocksAtLevel || 1)
}

// ── DEVELOPER UNLOCK CODE (Task 6) ───────────────────────────────────────────
// Entering DEV_CODE unlocks all skins + level-gated features + the locked Online
// menu item. IN-MEMORY only (resets on reload); routed through account.js
// persistence so a real backend is a one-module swap. Case-insensitive.
export const DEV_CODE = "Omololu"
let _devUnlock = false
export function isDevUnlocked() { return _devUnlock }
export function setDevUnlock(code) {
  const ok = String(code || "").trim().toLowerCase() === DEV_CODE.toLowerCase()
  if (ok) {
    _devUnlock = true
    const acct = getCurrentAccount()
    if (acct) { _ensureUnlocks(acct).devUnlock = true; persistence.save(acct) }   // TODO(backend): persists here later
  }
  return ok
}

// Save-schema helper: the unlock flags live under acct.unlocks in game_player_data.json.
// Guarantees the group exists (older saves / freshly-hydrated objects may lack it).
function _ensureUnlocks(acct) {
  if (!acct.unlocks || typeof acct.unlocks !== "object") {
    acct.unlocks = { devUnlock: false, betaUnlock: false, featuresUnlocked: [] }
  }
  return acct.unlocks
}

// ── BETA-ACCESS CODE "BETA" / "GojoV1" (Task 1, REDEFINED) ───────────────────
// A SECOND code for beta testers. It grants the SAME full unlock as DEV_CODE
// (all skins, level-gated features, Online, every mode) AND, on top of that, filters
// the selectable roster to ONLY characters that actually have sprite art. That
// sprite filter is derived LIVE from characters.js `hasSprites` (see game.js
// betaSelectableKey) so it self-updates as more characters get sprites — nothing here
// hardcodes a roster. DEV_CODE is unchanged (everything unlocked, NO character filter).
// Matching is case-insensitive; the canonical string is "BETA" ("GojoV1" is kept as a
// legacy alias so older docs/muscle-memory still work). The two flags are independent —
// entering one never affects the other.
//
// TOGGLE: entering a beta code again turns beta back OFF (easily reversible); clearBetaUnlock()
// is the explicit "clear action" for the same effect. Nothing here mutates sprite/skin/stat DATA —
// beta is purely a display/selection filter (roster filter) + an unlock predicate (skins/features).
export const BETA_CODE = "BETA"
export const BETA_CODES = ["BETA", "GojoV1"]   // all accepted beta trigger strings (case-insensitive)
function _isBetaCode(c) { return BETA_CODES.some(bc => c === bc.toLowerCase()) }
let _betaUnlock = false
export function isBetaUnlocked() { return _betaUnlock }
// Restore the in-memory unlock flags from a persisted snapshot (session.js guest persistence, or
// any non-account source). OR-in semantics: only turns flags ON — never forces a flag OFF, so it
// composes safely with account-hydration (which may already have enabled one). Does NOT re-persist
// (the caller's snapshot is already the source of truth). No-op for absent/false values.
export function restoreUnlockFlags({ dev, beta } = {}) {
  if (dev)  _devUnlock  = true
  if (beta) _betaUnlock = true
}

// Explicit clear action (separate from re-entering the code). Turns beta OFF + persists.
export function clearBetaUnlock() {
  _betaUnlock = false
  const acct = getCurrentAccount()
  if (acct) { _ensureUnlocks(acct).betaUnlock = false; persistence.save(acct) }
  return _betaUnlock
}

// The "unlock everything" predicate shared by dev AND beta. Use this for skin/feature/
// Online/mode gates (the scope both codes grant). Character-select filtering is the ONLY
// thing beta does that dev doesn't, and it keys off isBetaUnlocked()/!isDevUnlocked()
// directly at the filter sites (game.js). Returns true whenever dev is on, so DEV_CODE's
// behavior is byte-for-byte unchanged — this only widens the unlock set to include beta.
export function isFullyUnlocked() { return _devUnlock || _betaUnlock }

// Legacy JJK helpers — retained for save-file back-compat; no longer gate selection or
// skins (beta's roster filter is now sprite-derived in game.js, not JJK-specific).
export const JJK_ROSTER = ["gojo", "sukuna", "megumi", "toji"]
export function isJJKKey(key) { return JJK_ROSTER.includes(String(key || "").toLowerCase()) }

// Unified code entry. Returns "dev" | "beta" | null so the UI can show the right
// message. Keeps setDevUnlock() working for any existing callers.
export function applyUnlockCode(code) {
  const c = String(code || "").trim().toLowerCase()
  if (c === DEV_CODE.toLowerCase()) {
    _devUnlock = true
    const acct = getCurrentAccount()
    if (acct) { _ensureUnlocks(acct).devUnlock = true; persistence.save(acct) }
    return "dev"
  }
  if (_isBetaCode(c)) {
    _betaUnlock = !_betaUnlock   // TOGGLE — re-entering a beta code turns it back off (reversible)
    const acct = getCurrentAccount()
    if (acct) { _ensureUnlocks(acct).betaUnlock = _betaUnlock; persistence.save(acct) }   // TODO(backend)
    return "beta"   // caller reads isBetaUnlocked() for the resulting on/off state
  }
  return null
}
export function requiredLevel(featureId) { return FEATURES[featureId]?.unlocksAtLevel || 1 }
export function unlocksBetween(fromLevel, toLevel) {
  return Object.entries(FEATURES)
    .filter(([, f]) => f.unlocksAtLevel > fromLevel && f.unlocksAtLevel <= toLevel)
    .map(([id, f]) => ({ id, label: f.label, level: f.unlocksAtLevel }))
}

// ── SAVE SEAM ─────────────────────────────────────────────────────────────────
// Attaches progression onto the current account object and persists via the SAME
// stub account.js uses. THIS is the single place to swap for real storage/backend.
function _save(p) {
  const acct = getCurrentAccount()
  if (!acct) return                          // guest progress stays in _progress (session only)
  acct.progression = { xp: p.xp, matches: p.matches, wins: p.wins, level: levelFromXp(p.xp) }
  persistence.save(acct)                      // TODO(backend) lives in account.js
}

// Call after selecting/creating an account — or after loading a save file — to
// hydrate progression AND the session unlock flags from the stored account object.
export function loadProgressionFromAccount() {
  const acct = getCurrentAccount()
  if (!acct) return
  if (acct.progression) {
    const p = _get()
    p.xp = acct.progression.xp || 0
    p.matches = acct.progression.matches || 0
    p.wins = acct.progression.wins || 0
  }
  // Restore unlock flags persisted on the account (dev/beta codes) so a loaded save
  // re-applies them — otherwise these session-only booleans would reset on load.
  // Read the grouped acct.unlocks (current schema); fall back to the legacy flat
  // acct.devUnlock/betaUnlock so older save files still hydrate.
  const u = acct.unlocks || {}
  if (u.devUnlock  || acct.devUnlock)  _devUnlock  = true
  if (u.betaUnlock || acct.betaUnlock) _betaUnlock = true
}

// ── ARCADE CLEARS (Stage 19D) ────────────────────────────────────────────────
// Per-character arcade completion, persisted under acct.arcade (migrateAccount backfills the
// group on older saves). clearedBy[key] = beat arcade with that character; noContinueClearBy[key]
// = did it without spending a continue (a separate achievement). Guest runs are session-only.
function _ensureArcade(acct) {
  if (!acct.arcade || typeof acct.arcade !== "object") acct.arcade = { clearedBy: {}, noContinueClearBy: {} }
  if (!acct.arcade.clearedBy)          acct.arcade.clearedBy = {}
  if (!acct.arcade.noContinueClearBy)  acct.arcade.noContinueClearBy = {}
  return acct.arcade
}
export function setArcadeCleared(rosterKey, noContinue = false) {
  if (!rosterKey) return
  const acct = getCurrentAccount()
  if (!acct) return                              // guest — no durable arcade record
  const a = _ensureArcade(acct)
  a.clearedBy[rosterKey] = true
  if (noContinue) a.noContinueClearBy[rosterKey] = true
  persistence.save(acct)                          // TODO(backend) lives in account.js
}
export function isArcadeCleared(rosterKey) {
  const acct = getCurrentAccount()
  return !!(acct?.arcade?.clearedBy?.[rosterKey])
}
export function isArcadeNoContinueCleared(rosterKey) {
  const acct = getCurrentAccount()
  return !!(acct?.arcade?.noContinueClearBy?.[rosterKey])
}
export function getArcadeCleared() {
  const acct = getCurrentAccount()
  return acct?.arcade?.clearedBy ? { ...acct.arcade.clearedBy } : {}
}

// ── TOWER TIER CLEARS (Stage 21) — for tower-gated character unlocks ──────────
// Persisted under acct.tower.clearedTiers (migrateAccount backfills the group).
function _ensureTower(acct) {
  if (!acct.tower || typeof acct.tower !== "object") acct.tower = { clearedTiers: {} }
  if (!acct.tower.clearedTiers) acct.tower.clearedTiers = {}
  return acct.tower
}
export function setTowerTierCleared(tierId) {
  if (!tierId) return
  const acct = getCurrentAccount()
  if (!acct) return                              // guest — session-only
  _ensureTower(acct).clearedTiers[tierId] = true
  persistence.save(acct)
}
export function getTowerCleared() {
  const acct = getCurrentAccount()
  return acct?.tower?.clearedTiers ? { ...acct.tower.clearedTiers } : {}
}

// ── LOCAL TOURNAMENT BRACKET (Stage 24B) — persist an in-progress bracket so it survives a reload ──
export function saveBracket(bracket) {
  const acct = getCurrentAccount()
  if (!acct) return
  acct.bracket = bracket ? JSON.parse(JSON.stringify(bracket)) : null   // deep copy; null clears it
  persistence.save(acct)
}
export function loadBracket() {
  const acct = getCurrentAccount()
  return acct?.bracket ? JSON.parse(JSON.stringify(acct.bracket)) : null
}
export function clearBracket() { saveBracket(null) }
