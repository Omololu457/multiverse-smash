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
//   • Persistence is layered (see below): an in-memory store (always the source of
//     truth), auto-mirrored to localStorage for UNIVERSAL cross-reload persistence,
//     and — when the player connects one on a supporting browser — a File System
//     Access API save file as the primary export. Swap the `persistence` object for a
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
// In-memory store is the SOURCE OF TRUTH and the always-available FALLBACK. Every
// save is ALSO mirrored to two durable layers so progress survives reload/close for
// EVERYONE, not just Chrome/Edge users who've picked a file:
//   • localStorage — UNIVERSAL, automatic, synchronous. Works on Safari/Firefox and
//     before any file is connected; also survives reload even for file users (the
//     File System Access handle is in-memory and does NOT persist across reload). It
//     is the auto-load-on-boot source. (Chosen over IndexedDB: the payload is tiny —
//     ~1.4KB/account measured — so localStorage's ~5MB limit is never a concern, and
//     its sync API keeps save()/load()/remove() synchronous — callers don't change.)
//   • File System Access API save file — PRIMARY export when the player connects one
//     (see connectSaveFile / createSaveFile). Async, fire-and-forget + coalesced.
// The public save()/load()/remove() interface stays 100% SYNCHRONOUS.
const _store = new Map()   // accountId -> account
let _currentId = null

const SAVE_FILE_NAME = "game_player_data.json"
const SAVE_PICKER_TYPES = [{ description: "Save data", accept: { "application/json": [".json"] } }]
// Save schema version (Stage 13B). Declared UP HERE (not next to migrateAccount) because the
// auto-load-on-boot _loadFromLocalStorage() below runs at module init and calls migrateAccount(),
// which reads SAVE_VERSION — a later const would be in the temporal dead zone and throw at import.
export const SAVE_VERSION = 5

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
  // mirror to BOTH durable layers — localStorage always (universal fallback), and the
  // granted file when connected (primary export). Both are non-throwing; callers stay sync.
  save(account) {
    if (account?.accountId) _store.set(account.accountId, account)
    _writeLocalStorage()                       // universal, synchronous, always-on fallback
    if (_serverAvailable) _writeServer()       // NEW dev tier: automatic file via /api/save; async + coalesced
    if (_fileHandle) _writeSnapshot()          // primary export when connected; fire-and-forget + coalesced
    return account
  },
  remove(accountId) {
    const ok = _store.delete(accountId)
    _writeLocalStorage()
    if (_serverAvailable) _writeServer()
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
// Human-readable, AUTHORITATIVE view of which tier is live right now (Settings UI, 17D).
// Derived from live state so it can't drift, with the transient message (_statusText,
// e.g. a connect error or "Loaded N profiles") preferred only while a file is connected.
export function saveFileStatus() {
  if (_pendingReattachHandle)  return "Reconnect save file"
  if (_fileHandle)             return _statusText.startsWith("Auto-saving") || _statusText.startsWith("Loaded") || _statusText.startsWith("Created") ? _statusText : `Auto-saving to ${SAVE_FILE_NAME}`
  if (_serverAvailable)        return `Auto-saving to saves/${SAVE_FILE_NAME}`
  if (_lsAvailable())          return "Auto-saving to browser storage"
  return "In-memory only — progress will not persist"
}
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
    version:  SAVE_VERSION,
    savedAt:  new Date().toISOString(),
    currentId: _currentId,
    accounts
  }
}

// ── localStorage FALLBACK LAYER (universal auto-persistence) ─────────────────
// Mirrors the SAME snapshot the file path writes. Everything here is defensive: any
// access to localStorage can THROW (private mode, disabled storage, sandboxed iframe),
// so every call is wrapped and degrades silently to the pure in-memory behaviour.
const LS_KEY = "multiverse-smash-save"
function _lsAvailable() {
  try { return typeof localStorage !== "undefined" && localStorage !== null }
  catch (_) { return false }
}
function _writeLocalStorage() {
  if (!_lsAvailable()) return
  try { localStorage.setItem(LS_KEY, JSON.stringify(_buildSnapshot())) }
  catch (err) { if (typeof console !== "undefined") console.warn("[persistence] localStorage write failed:", err) }
}
// Hydrate _store / _currentId from localStorage. Tolerant of missing/empty/corrupt data
// (same contract as _hydrateFromHandle): returns the number of accounts loaded, 0 on any
// problem, NEVER throws. Called once at module init for auto-load-on-boot.
function _loadFromLocalStorage() {
  if (!_lsAvailable()) return 0
  let text = null
  try { text = localStorage.getItem(LS_KEY) } catch (_) { return 0 }
  if (!text) return 0
  let data = null
  try { data = JSON.parse(text) } catch (_) { return 0 }   // corrupt → ignore, fresh start
  const accounts = Array.isArray(data) ? data
    : (data && Array.isArray(data.accounts) ? data.accounts : [])
  if (!accounts.length) return 0
  _store.clear()
  for (const a of accounts) { if (a && a.accountId) _store.set(a.accountId, migrateAccount(a)) }   // Stage 13B: backfill old-schema saves on load
  const cid = data && data.currentId
  if (cid && _store.has(cid)) _currentId = cid
  else if (accounts[0] && accounts[0].accountId) _currentId = accounts[0].accountId
  return accounts.length
}
// Was a current account restored from a durable layer at boot? game.js uses this to know
// whether to hydrate the live modules (progression/settings) on startup.
export function hasPersistedData() { return _store.size > 0 }
// AUTO-LOAD-ON-BOOT: pull any saved profiles from localStorage into the store the moment
// this module is imported, so progress is present before game.js runs its boot hydrate.
_loadFromLocalStorage()

// ── LOCAL SAVE SERVER LAYER (dev-only automatic file persistence) ────────────
// A NEW transport for the SAME _buildSnapshot() payload — nothing about the schema,
// the decorator or the migration path changes. During local dev (`npm run dev`) a tiny
// node:http server exposes /api/save + /api/health; the client writes its snapshot there
// so the visible file stays current with ZERO player action. On GitHub Pages, file://,
// or `npm run dev:noserver` the health probe simply fails and this tier is never used —
// that ABSENCE is the normal case, so it is silent (no console spam, no user-facing error).
const HEALTH_URL = "/api/health"
const SAVE_URL   = "/api/save"
let _serverAvailable = false     // set true only after /api/health responds ok
let _serverChecked   = false     // capability probe runs at most once
let _serverWriteInFlight = false // a POST is running now (coalesced like the file writer)
let _serverDirty         = false // a save arrived mid-POST → POST again after
let _serverVersion = null

function _fetchTimeout(url, opts, ms) {
  if (typeof fetch !== "function") return Promise.reject(new Error("no fetch"))
  let ctrl = null, timer = null
  try { ctrl = new AbortController(); timer = setTimeout(() => ctrl.abort(), ms) } catch (_) {}
  return fetch(url, ctrl ? { ...opts, signal: ctrl.signal } : opts)
    .finally(() => { if (timer) clearTimeout(timer) })
}

// Capability detection — runs at most ONCE. Absence of a server (Pages / file:// /
// dev:noserver) is EXPECTED, so a failed probe is swallowed silently and never retried.
export async function detectSaveServer() {
  if (_serverChecked) return _serverAvailable
  _serverChecked = true
  try {
    const res = await _fetchTimeout(HEALTH_URL, { method: "GET", cache: "no-store" }, 1500)
    if (res && res.ok) {
      const body = await res.json().catch(() => null)
      if (body && body.ok) { _serverAvailable = true; _serverVersion = body.version ?? null }
    }
  } catch (_) { /* no server — normal case, stay false, no spam */ }
  return _serverAvailable
}

// Coalesced POST of the current snapshot — mirror of _writeSnapshot()'s _writeInFlight/_dirty
// logic so a burst of XP ticks collapses into a single in-flight write + one trailing flush.
async function _writeServer() {
  if (!_serverAvailable) return
  if (_serverWriteInFlight) { _serverDirty = true; return }
  _serverWriteInFlight = true
  try {
    const payload = JSON.stringify(_buildSnapshot())
    const res = await _fetchTimeout(SAVE_URL, { method: "POST", headers: { "content-type": "application/json" }, body: payload }, 4000)
    if (!res || !res.ok) throw new Error("save POST " + (res ? res.status : "no-response"))
    if (_statusText.startsWith("In-memory")) _statusText = `Auto-saving to saves/${SAVE_FILE_NAME}`
  } catch (_) {
    // Degrade silently: localStorage already holds this exact snapshot, so no data is lost
    // and the game must not stutter/warn. Killing the server mid-session just reverts to LS.
  } finally {
    _serverWriteInFlight = false
    if (_serverDirty) { _serverDirty = false; _writeServer() }
  }
}

// BOOT LOAD from the server (first tier tried at boot, ahead of localStorage). Loads the
// server file into the store and refreshes the localStorage mirror to match. Tolerant of
// missing/empty (204)/corrupt data: returns the number of accounts loaded, 0 on any problem,
// NEVER throws. No-op (returns 0) when no server was detected.
export async function loadFromServer() {
  if (!_serverAvailable) return 0
  let text = null
  try {
    const res = await _fetchTimeout(SAVE_URL, { method: "GET", cache: "no-store" }, 3000)
    if (!res || res.status === 204 || !res.ok) return 0
    text = await res.text()
  } catch (_) { return 0 }
  if (!text) return 0
  let data = null
  try { data = JSON.parse(text) } catch (_) { return 0 }
  const accounts = Array.isArray(data) ? data
    : (data && Array.isArray(data.accounts) ? data.accounts : [])
  if (!accounts.length) return 0
  _store.clear()
  for (const a of accounts) { if (a && a.accountId) _store.set(a.accountId, migrateAccount(a)) }   // Stage 13B: backfill old-schema saves on load
  const cid = data && data.currentId
  if (cid && _store.has(cid)) _currentId = cid
  else if (accounts[0] && accounts[0].accountId) _currentId = accounts[0].accountId
  _statusText = `Auto-saving to saves/${SAVE_FILE_NAME}`
  _writeLocalStorage()   // keep the universal fallback in sync with server truth
  return accounts.length
}

// One-call boot helper: probe, then (if present) load from the server. game.js awaits this
// at boot and re-hydrates the live modules if it returns > 0. Safe to call repeatedly.
export async function initSaveServerTier() {
  await detectSaveServer()
  if (!_serverAvailable) return 0
  return await loadFromServer()
}
export function isSaveServerAvailable() { return _serverAvailable }

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

// Read the granted file into the store. An empty/new file is seeded with current data —
// which is the ONE-TIME MIGRATION path: whatever the player accumulated in the localStorage
// fallback (already loaded into _store at boot) is written into the freshly-connected file,
// so their existing progress carries over into the file rather than starting a new slot.
// Connecting a file that ALREADY has data instead loads THAT save (it becomes the active
// profile everywhere, and the localStorage mirror is refreshed to match).
async function _hydrateFromHandle() {
  const file = await _fileHandle.getFile()
  const text = (await file.text()).trim()
  if (!text) { await _writeSnapshot(); _writeLocalStorage(); return 0 }   // empty file → migrate current data in
  let data = null
  try { data = JSON.parse(text) } catch (_) { data = null }
  const accounts = Array.isArray(data) ? data
    : (data && Array.isArray(data.accounts) ? data.accounts : [])
  if (accounts.length) {
    _store.clear()
    for (const a of accounts) { if (a && a.accountId) _store.set(a.accountId, migrateAccount(a)) }   // Stage 13B: backfill old-schema saves on load
    const cid = data && data.currentId
    if (cid && _store.has(cid)) _currentId = cid
    else if (accounts[0] && accounts[0].accountId) _currentId = accounts[0].accountId
    _writeLocalStorage()   // keep the universal fallback in sync with the loaded file
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
    await _idbPutHandle(handle)                 // remember it so reload can reattach (17C)
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
    await _idbPutHandle(_fileHandle)            // remember it so reload can reattach (17C)
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

// ── FSA HANDLE PERSISTENCE ACROSS RELOADS (IndexedDB) ────────────────────────
// A FileSystemFileHandle is structured-cloneable, so it survives in IndexedDB across
// reloads (localStorage can't hold it — it stringifies to "{}"). On boot we read it back
// and try to reattach WITHOUT a picker. Chrome may report the permission as still
// "granted" (persistent permissions / installed PWA) → reattach with NO UI. More often a
// rehydrated handle reports "prompt", which needs a user gesture — so we surface a
// one-click "Reconnect save file" instead. requestPermission() is NEVER called outside a
// gesture (it would reject). Everything degrades silently when IndexedDB is unavailable.
const IDB_NAME = "multiverse-smash-fs", IDB_STORE = "handles", IDB_KEY = "saveFileHandle"
let _pendingReattachHandle = null   // handle whose permission is "prompt" → awaiting a gesture

function _idbOpen() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null)
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => { try { req.result.createObjectStore(IDB_STORE) } catch (_) {} }
      req.onsuccess = () => resolve(req.result)
      req.onerror   = () => resolve(null)
    } catch (_) { resolve(null) }
  })
}
function _idbPutHandle(handle) {
  return new Promise((resolve) => {
    _idbOpen().then(db => {
      if (!db) return resolve(false)
      try {
        const tx = db.transaction(IDB_STORE, "readwrite")
        tx.objectStore(IDB_STORE).put(handle, IDB_KEY)
        tx.oncomplete = () => resolve(true)
        tx.onerror    = () => resolve(false)
      } catch (_) { resolve(false) }
    })
  })
}
function _idbGetHandle() {
  return new Promise((resolve) => {
    _idbOpen().then(db => {
      if (!db) return resolve(null)
      try {
        const tx = db.transaction(IDB_STORE, "readonly")
        const rq = tx.objectStore(IDB_STORE).get(IDB_KEY)
        rq.onsuccess = () => resolve(rq.result || null)
        rq.onerror   = () => resolve(null)
      } catch (_) { resolve(null) }
    })
  })
}
function _idbDelHandle() {
  return new Promise((resolve) => {
    _idbOpen().then(db => {
      if (!db) return resolve(false)
      try {
        const tx = db.transaction(IDB_STORE, "readwrite")
        tx.objectStore(IDB_STORE).delete(IDB_KEY)
        tx.oncomplete = () => resolve(true)
        tx.onerror    = () => resolve(false)
      } catch (_) { resolve(false) }
    })
  })
}

// True when a handle was rehydrated but its permission is still "prompt" — the UI shows a
// one-click "Reconnect save file" that calls reconnectSaveFile() from the click gesture.
export function needsReconnect() { return !!_pendingReattachHandle }

// BOOT: try to silently reattach a stored handle. NO user gesture here, so we only reattach
// when the permission is already "granted"; otherwise we stash it and report "prompt".
// Returns { ok, reattached, count } | { ok:false, reason } and NEVER throws / prompts.
export async function reattachStoredHandle() {
  if (!isFileApiSupported()) return { ok: false, reason: "unsupported" }
  let handle = null
  try { handle = await _idbGetHandle() } catch (_) { handle = null }
  if (!handle || typeof handle.queryPermission !== "function") return { ok: false, reason: "none" }
  let perm = "prompt"
  try { perm = await handle.queryPermission({ mode: "readwrite" }) } catch (_) { perm = "prompt" }
  if (perm === "granted") {
    _fileHandle = handle
    const n = await _hydrateFromHandle()
    _statusText = `Auto-saving to ${SAVE_FILE_NAME}`
    return { ok: true, reattached: true, count: n }
  }
  _pendingReattachHandle = handle
  _statusText = "Reconnect save file"
  return { ok: false, reason: "prompt" }
}

// GESTURE: finish reconnecting the stashed handle. MUST be called from a real click —
// requestPermission() requires transient activation. On grant, reattach + hydrate.
export async function reconnectSaveFile() {
  const handle = _pendingReattachHandle || (await _idbGetHandle())
  if (!handle || typeof handle.requestPermission !== "function") return { ok: false, reason: "none" }
  let perm = "denied"
  try { perm = await handle.requestPermission({ mode: "readwrite" }) } catch (_) { perm = "denied" }
  if (perm !== "granted") { _statusText = "Reconnect save file"; return { ok: false, reason: "denied" } }
  _fileHandle = handle
  _pendingReattachHandle = null
  const n = await _hydrateFromHandle()
  _statusText = `Auto-saving to ${SAVE_FILE_NAME}`
  return { ok: true, count: n }
}

// ── EXPORT / IMPORT (manual backup — works on EVERY browser, no permission) ──
// Export builds the same snapshot as every other tier and returns it as a JSON string; the
// UI wraps it in a blob-URL download (no picker, no permission — works on Safari too). Import
// runs a chosen file's text through the SAME load + migration path used at boot, so unlock
// flags / audio settings / progression all round-trip identically. Returns accounts loaded.
export function exportSaveText() { return JSON.stringify(_buildSnapshot(), null, 2) }
export function exportSaveFilename() {
  return SAVE_FILE_NAME   // stable name so re-imports overwrite cleanly
}
export function importSaveText(text) {
  if (!text) return 0
  let data = null
  try { data = JSON.parse(text) } catch (_) { return 0 }   // corrupt import → ignore, no clobber
  const accounts = Array.isArray(data) ? data
    : (data && Array.isArray(data.accounts) ? data.accounts : [])
  if (!accounts.length) return 0
  _store.clear()
  for (const a of accounts) { if (a && a.accountId) _store.set(a.accountId, migrateAccount(a)) }   // Stage 13B: backfill old-schema saves on load
  const cid = data && data.currentId
  if (cid && _store.has(cid)) _currentId = cid
  else if (accounts[0] && accounts[0].accountId) _currentId = accounts[0].accountId
  // Re-mirror the imported data through every live tier so it persists like any other save.
  _writeLocalStorage()
  if (_serverAvailable) _writeServer()
  if (_fileHandle) _writeSnapshot()
  return accounts.length
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
// ── SAVE SCHEMA VERSION + MIGRATION (Stage 13B) ──────────────────────────────
// Bump SAVE_VERSION whenever the per-account schema gains a field. migrateAccount() backfills an
// older save from the canonical default shape, so downstream code can assume every group/field
// exists — old players never lose data and never crash on a missing group. EVERY load path runs
// each account through migrateAccount() before it enters the store. To add a field later (e.g.
// Stage 19D arcade clears, Stage 21 unlocks): add it to _accountDefaults() and bump SAVE_VERSION
// (declared near the top of this file to avoid a module-init TDZ); old saves auto-backfill on next
// load. _accountDefaults() is the ONE source of the per-account schema — _newAccountObject spreads
// it so new + migrated accounts share an identical shape.
function _accountDefaults() {
  return {
    // Each group is owned/hydrated by its module: progression + unlocks by progression.js,
    // settings by sound.js (getSettings/applySettings), skins is a DERIVED snapshot enriched at
    // save time by the snapshot decorator, arcade holds per-character clear state (Stage 19D).
    progression: { xp: 0, matches: 0, wins: 0, level: 1 },
    unlocks:     { devUnlock: false, betaUnlock: false, featuresUnlocked: [] },
    skins:       {},                     // { rosterKey: [unlockedSkinIds] } — filled by the decorator
    settings:    { sfxVolume: 0.8, musicVolume: 0.55, sfxMuted: false, musicMuted: false, menuPlaylistOrder: [] },
    stats:       { wins: 0, losses: 0, matches: 0, favoriteCharacter: null },
    arcade:      { clearedBy: {}, noContinueClearBy: {} },  // Stage 19D — arcade clear state (default empty)
    tower:       { clearedTiers: {} },                      // Stage 21 — tower-tier clears (for tower-gated unlocks)
    bracket:     null,                                      // Stage 24B — in-progress local tournament (null = none)
    personality: {}                                         // Big-Five trait beliefs — shape owned/hydrated by personality.js
  }
}
// Backfill any missing group/field on an account loaded from an older save. Idempotent; never
// throws; preserves existing values (shallow-merge, one level deep — deep enough for this schema).
export function migrateAccount(acct) {
  if (!acct || typeof acct !== "object") return acct
  const defaults = _accountDefaults()
  for (const [group, dflt] of Object.entries(defaults)) {
    if (dflt && typeof dflt === "object" && !Array.isArray(dflt)) {
      const cur = (acct[group] && typeof acct[group] === "object" && !Array.isArray(acct[group])) ? acct[group] : {}
      acct[group] = { ...dflt, ...cur }
    } else if (acct[group] === undefined) {
      acct[group] = Array.isArray(dflt) ? [...dflt] : dflt
    }
  }
  acct._schemaVersion = SAVE_VERSION
  return acct
}

function _newAccountObject(username) {
  return {
    username: String(username).trim(),
    accountId: generateAccountId(),
    createdAt: new Date().toISOString(),
    isLocalStub: true,            // flag so future code can spot un-migrated accounts
    _schemaVersion: SAVE_VERSION,
    ..._accountDefaults()         // FULL per-account schema — single source shared with migrateAccount()
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
