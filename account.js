// account.js
// ──────────────────────────────────────────────────────────────────────────
// FRONT-END ACCOUNT STUB (client-side only — NO real backend).
//
// This module owns ALL account state behind a small, stable interface so a real
// server can be dropped in later without touching the UI/game code that calls
// it. Everything here is a placeholder:
//   • accountId is generated client-side (random) — a server will mint real ids.
//   • There is NO auth, NO password handling, NO validation beyond trivial UI
//     sanity — those are the future backend's job.
//   • Persistence is an in-memory store (NOT localStorage/sessionStorage) so the
//     game runs inside a sandboxed artifact; swap the `persistence` object for a
//     network/storage layer later — see the TODO hooks below.
//
// Public interface (keep stable):
//   createAccount(username)      -> account        (also becomes current)
//   getCurrentAccount()          -> account | null
//   setCurrentAccount(id)        -> account | null
//   listAccounts()               -> account[]
//   isValidUsername(name)        -> boolean
//   generateAccountId()          -> string  (placeholder id)
// ──────────────────────────────────────────────────────────────────────────

// ── PERSISTENCE STUB ───────────────────────────────────────────────────────
// In-memory only for now. Each method is where the real backend attaches.
const _store = new Map()   // accountId -> account
let _currentId = null

export const persistence = {
  // TODO(backend): replace with GET /accounts (authenticated) — hydrate _store.
  load() {
    // No-op: in-memory store is already "loaded". Returns current snapshot.
    return Array.from(_store.values())
  },
  // TODO(backend): replace with POST/PUT /accounts to persist server-side.
  save(account) {
    if (account?.accountId) _store.set(account.accountId, account)
    return account
  },
  // TODO(backend): replace with DELETE /accounts/:id.
  remove(accountId) {
    return _store.delete(accountId)
  }
}

// ── ID GENERATION (placeholder) ─────────────────────────────────────────────
// Client-side random id. NOT collision-proof and NOT secure — a real server
// will issue authoritative ids. Marked clearly so it's easy to find & replace.
// (Avoids Math.random()-only by mixing in a monotonic counter + time so ids are
// distinct within a session even if the RNG repeats.)
let _idCounter = 0
export function generateAccountId() {
  // TODO(backend): delete this and use the id returned by the account service.
  const rand = Math.random().toString(36).slice(2, 8)
  const time = (typeof performance !== "undefined" ? performance.now() : 0)
  const tag  = Math.floor(time).toString(36)
  _idCounter += 1
  return `local-${tag}${_idCounter.toString(36)}-${rand}`
}

// ── VALIDATION (UI-level sanity only) ───────────────────────────────────────
export function isValidUsername(name) {
  // TODO(backend): real uniqueness/profanity/length rules live server-side.
  const n = String(name || "").trim()
  return n.length >= 2 && n.length <= 16
}

// ── ACCOUNT CRUD ────────────────────────────────────────────────────────────
function _newAccountObject(username) {
  return {
    username: String(username).trim(),
    accountId: generateAccountId(),
    createdAt: new Date().toISOString(),
    isLocalStub: true,            // flag so future code can spot un-migrated accounts
    // Stats placeholder — a real profile/service will own these later.
    stats: { wins: 0, losses: 0, matches: 0, favoriteCharacter: null }
  }
}

export function createAccount(username) {
  if (!isValidUsername(username)) return null
  const account = _newAccountObject(username)
  persistence.save(account)
  _currentId = account.accountId
  return account
}

export function getCurrentAccount() {
  return _currentId ? (_store.get(_currentId) || null) : null
}

export function setCurrentAccount(accountId) {
  if (_store.has(accountId)) { _currentId = accountId; return _store.get(accountId) }
  return null
}

export function listAccounts() {
  return Array.from(_store.values())
}

// ── FUTURE MULTIPLAYER SEAM ─────────────────────────────────────────────────
// Intentionally left as a documented hook. The user will build real netcode /
// matchmaking later; keep that concern in its own module and attach here so the
// account identity can be passed to a session without the UI needing changes.
// TODO(multiplayer): export createOnlineSession(account) / joinSession(code, account).
