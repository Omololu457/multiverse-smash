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

// ── PERSISTENCE ────────────────────────────────────────────────────────────
// In-memory store is the SOURCE OF TRUTH and the always-available FALLBACK. When
// the player grants a local save file via the File System Access API (see
// connectSaveFile / createSaveFile below), the same in-memory writes are ALSO
// mirrored to that file as JSON — so the public save()/load()/remove() interface
// stays 100% SYNCHRONOUS (callers like progression._save don't change) while gaining
// real persistence. The async file write is fire-and-forget + coalesced.
const _store = new Map()   // accountId -> account
let _currentId = null

const SAVE_FILE_NAME = "game_player_data.json"
const SAVE_PICKER_TYPES = [{ description: "Save data", accept: { "application/json": [".json"] } }]

let _fileHandle    = null                    // granted FileSystemFileHandle (null = in-memory only)
let _writeInFlight = false                   // an async write is running now
let _dirty         = false                   // a save arrived mid-write → write again after
let _createArmed   = false                   // user cancelled OPEN → next click CREATEs a fresh file
let _statusText    = "In-memory only — pick a save file to persist progress"

export const persistence = {
  // In-memory snapshot (also the fallback when no file is connected). The file is
  // hydrated INTO this store by connectSaveFile(), so reads here are always current.
  load() {
    return Array.from(_store.values())
  },
  // SYNCHRONOUS: update the in-memory store immediately (unchanged contract), then
  // mirror to the granted file asynchronously (no await → callers stay sync).
  save(account) {
    if (account?.accountId) _store.set(account.accountId, account)
    if (_fileHandle) _writeSnapshot()          // fire-and-forget; coalesced against in-flight writes
    return account
  },
  remove(accountId) {
    const ok = _store.delete(accountId)
    if (_fileHandle) _writeSnapshot()
    return ok
  }
}

// ── FILE SYSTEM ACCESS API (local save file) ────────────────────────────────
// GOTCHA: showOpenFilePicker/showSaveFilePicker require (a) a SECURE CONTEXT —
// https:// OR http://localhost (file:// is NOT secure → API absent), and (b)
// TRANSIENT USER ACTIVATION — they must be called synchronously from a real click/
// key handler, not from a rAF tick or a timer. The menu wiring calls connectSaveFile
// directly inside a DOM mouseup handler for exactly this reason. Unsupported browsers
// (notably Safari, and Firefox for showSaveFilePicker as of 2025) fall back to
// in-memory transparently.
export function isFileApiSupported() {
  return typeof window !== "undefined"
    && typeof window.showOpenFilePicker === "function"
    && typeof window.showSaveFilePicker === "function"
}
export function isFileConnected()  { return !!_fileHandle }
export function saveFileStatus()   { return _statusText }
export function saveFileName()     { return SAVE_FILE_NAME }

// Optional enrichment hook run over each account right before serialization. game.js
// registers a decorator that fills the DERIVED fields (unlocks.featuresUnlocked + the
// skins snapshot) from the account's own level/dev/beta — so EVERY save (from any
// path) writes a complete, fresh snapshot without account.js needing to import the
// progression/skins modules (which would create an import cycle).
let _snapshotDecorator = null
export function setSnapshotDecorator(fn) { _snapshotDecorator = (typeof fn === "function") ? fn : null }

function _buildSnapshot() {
  // Serialises the FULL account objects — the account IS the unit of storage, so
  // progression, unlocks, skins, settings and stats all persist together. The
  // decorator refreshes derived fields on each write.
  const accounts = Array.from(_store.values()).map(a => {
    try { return _snapshotDecorator ? (_snapshotDecorator(a) || a) : a } catch (_) { return a }
  })
  return {
    format:   "multiverse-smash-save",
    version:  1,
    savedAt:  new Date().toISOString(),
    currentId: _currentId,
    accounts
  }
}

// Async, coalesced writer. Never throws to callers; on failure it drops the handle
// and reverts to in-memory so the game keeps running.
async function _writeSnapshot() {
  if (!_fileHandle) return
  if (_writeInFlight) { _dirty = true; return }     // don't open two writables at once
  _writeInFlight = true
  try {
    const writable = await _fileHandle.createWritable()
    const payload = JSON.stringify(_buildSnapshot(), null, 2)
    await writable.write(payload)
    await writable.close()
    _statusText = `Auto-saving to ${SAVE_FILE_NAME}`
  } catch (err) {
    _fileHandle = null
    _statusText = "Save file disconnected — playing in-memory"
    if (typeof console !== "undefined") console.warn("[persistence] file write failed; in-memory fallback:", err)
  } finally {
    _writeInFlight = false
    if (_dirty) { _dirty = false; _writeSnapshot() }  // flush the save that arrived mid-write
  }
}

// Read the granted file into the store. An empty/new file is seeded with current data.
async function _hydrateFromHandle() {
  const file = await _fileHandle.getFile()
  const text = (await file.text()).trim()
  if (!text) { await _writeSnapshot(); return 0 }     // brand-new empty file → write defaults
  let data = null
  try { data = JSON.parse(text) } catch (_) { data = null }
  const accounts = Array.isArray(data) ? data
    : (data && Array.isArray(data.accounts) ? data.accounts : [])
  if (accounts.length) {
    _store.clear()
    for (const a of accounts) { if (a && a.accountId) _store.set(a.accountId, a) }
    const cid = data && data.currentId
    if (cid && _store.has(cid)) _currentId = cid
    else if (accounts[0] && accounts[0].accountId) _currentId = accounts[0].accountId
  }
  return accounts.length
}

// PRIMARY entry (must be called from a user gesture). Tries to OPEN an existing save
// and load it. If the user cancels (or there's nothing to open on first run), it ARMS
// creation so the NEXT click makes a fresh file via createSaveFile() — each picker gets
// its own gesture, since chaining two pickers on one gesture is rejected by browsers.
export async function connectSaveFile() {
  if (!isFileApiSupported()) {
    _statusText = "File saves unsupported in this browser (e.g. Safari) — in-memory only"
    return { ok: false, reason: "unsupported" }
  }
  if (_createArmed) { _createArmed = false; return createSaveFile() }
  try {
    const [handle] = await window.showOpenFilePicker({ multiple: false, types: SAVE_PICKER_TYPES })
    _fileHandle = handle
    const n = await _hydrateFromHandle()
    _statusText = `Loaded ${SAVE_FILE_NAME} (${n} profile${n === 1 ? "" : "s"}) — auto-saving`
    return { ok: true, created: false, count: n }
  } catch (err) {
    if (err && err.name === "AbortError") {
      _createArmed = true
      _statusText = "No file opened — click again to CREATE a new save file"
      return { ok: false, reason: "cancelled" }
    }
    _statusText = "Couldn't open save file — in-memory only"
    return { ok: false, reason: "error", error: String((err && err.message) || err) }
  }
}

// First-run creation (also user-gesture-bound): make a new game_player_data.json and
// seed it with the current (default) data.
export async function createSaveFile() {
  if (!isFileApiSupported()) {
    _statusText = "File saves unsupported in this browser (e.g. Safari) — in-memory only"
    return { ok: false, reason: "unsupported" }
  }
  try {
    _fileHandle = await window.showSaveFilePicker({ suggestedName: SAVE_FILE_NAME, types: SAVE_PICKER_TYPES })
    await _writeSnapshot()
    _statusText = `Created ${SAVE_FILE_NAME} — auto-saving`
    return { ok: true, created: true, count: _store.size }
  } catch (err) {
    if (err && err.name === "AbortError") {
      _statusText = "Save file creation cancelled — in-memory only"
      return { ok: false, reason: "cancelled" }
    }
    _statusText = "Couldn't create save file — in-memory only"
    return { ok: false, reason: "error", error: String((err && err.message) || err) }
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
    // ── FULL game_player_data.json per-account schema ──────────────────────────
    // Each group is owned/hydrated by its module: progression + unlocks by
    // progression.js, settings by sound.js (getSettings/applySettings), skins is a
    // DERIVED read-only snapshot enriched at save time by the snapshot decorator.
    progression: { xp: 0, matches: 0, wins: 0, level: 1 },   // progression.js _save() keeps this current
    unlocks: { devUnlock: false, betaUnlock: false, featuresUnlocked: [] }, // progression.js codes; features derived
    skins: {},                     // { rosterKey: [unlockedSkinIds] } — filled by the snapshot decorator
    settings: {                    // sound.js getSettings()/applySettings()
      sfxVolume: 0.8, musicVolume: 0.55, sfxMuted: false, musicMuted: false, menuPlaylistOrder: []
    },
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
