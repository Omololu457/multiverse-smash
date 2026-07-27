// session.js — cross-reload persistence of SESSION UI STATE (menu selections, training-mode
// toggles, and guest unlock flags) via localStorage.
//
// DELIBERATELY SEPARATE from account.js's persistence layer. account.js persists ACCOUNT data
// (progression / unlocks / skins / settings / stats) under "multiverse-smash-save" and only for a
// logged-in account. THIS module is the lightweight "what was I just doing" layer that EVERY player
// (guests included) gets, under its own key, and it NEVER stores mid-match combat state — a reload
// during a fight returns to a clean menu, it does not resume the round.
//
// The store is a single small JSON blob. All access is synchronous, non-throwing, and tolerant of
// missing / disabled / corrupt storage (private mode, sandboxed iframe, quota) — every function
// degrades to a no-op / null rather than throwing, so callers never need try/catch.
const SESSION_KEY = "multiverse-smash-session"

function _lsAvailable() {
  try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false }
}

// Parsed session object, or null if absent / unreadable / not an object.
export function readSession() {
  if (!_lsAvailable()) return null
  let text
  try { text = localStorage.getItem(SESSION_KEY) } catch (_) { return null }
  if (!text) return null
  try { const o = JSON.parse(text); return (o && typeof o === "object") ? o : null } catch (_) { return null }
}

// Write the snapshot. Returns true on success, false if storage is unavailable / write threw.
export function writeSession(obj) {
  if (!_lsAvailable()) return false
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(obj)); return true }
  catch (err) { if (typeof console !== "undefined") console.warn("[session] localStorage write failed:", err); return false }
}

// Remove the persisted session (used by a "start fresh" path / tests).
export function clearSession() {
  if (!_lsAvailable()) return
  try { localStorage.removeItem(SESSION_KEY) } catch (_) {}
}

export function isSessionStorageAvailable() { return _lsAvailable() }
