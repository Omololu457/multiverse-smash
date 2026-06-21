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
  if (_devUnlock) return true                 // dev code unlocks EVERYTHING (Task 6)
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
    if (acct) { acct.devUnlock = true; persistence.save(acct) }   // TODO(backend): persists here later
  }
  return ok
}

// ── BETA-ACCESS CODE "GojoV1" (Task 1) ───────────────────────────────────────
// A SECOND, narrower code for beta testers. It unlocks the Jujutsu Kaisen roster
// + JJK skins ONLY, and locks every non-JJK character out of selection. It grants
// NOTHING related to non-JJK characters/features (that stays the DEV_CODE's job).
// Matching is case-insensitive (so testers can't fat-finger the casing); the
// canonical string to hand out is exactly "GojoV1". Both flags are independent —
// entering one never affects the other, so the full-unlock code stays intact.
export const BETA_CODE = "GojoV1"
let _betaUnlock = false
export function isBetaUnlocked() { return _betaUnlock }

// The ONLY characters selectable under the beta code (also the skin allow-list).
export const JJK_ROSTER = ["gojo", "sukuna", "megumi", "toji"]
export function isJJKKey(key) { return JJK_ROSTER.includes(String(key || "").toLowerCase()) }

// Unified code entry. Returns "dev" | "beta" | null so the UI can show the right
// message. Keeps setDevUnlock() working for any existing callers.
export function applyUnlockCode(code) {
  const c = String(code || "").trim().toLowerCase()
  if (c === DEV_CODE.toLowerCase()) {
    _devUnlock = true
    const acct = getCurrentAccount()
    if (acct) { acct.devUnlock = true; persistence.save(acct) }
    return "dev"
  }
  if (c === BETA_CODE.toLowerCase()) {
    _betaUnlock = true
    const acct = getCurrentAccount()
    if (acct) { acct.betaUnlock = true; persistence.save(acct) }   // TODO(backend)
    return "beta"
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

// Call after selecting/creating an account to hydrate from its stored progression.
export function loadProgressionFromAccount() {
  const acct = getCurrentAccount()
  if (!acct?.progression) return
  const p = _get()
  p.xp = acct.progression.xp || 0
  p.matches = acct.progression.matches || 0
  p.wins = acct.progression.wins || 0
}
