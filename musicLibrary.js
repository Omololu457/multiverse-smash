// musicLibrary.js
// ─────────────────────────────────────────────────────────────────────────────
// The player-facing music-source layer: the full song LIBRARY (all 103 tracks),
// a player-authored CUSTOM playlist, and resolution of the ACTIVE menu-music source.
//
// Three genuinely separate, selectable sources — none modifies the others:
//   "default"      → ALL songs in the library (every available track)
//   "personalized" → musicPersonality's trait-informed order (opt-in; needs a profile)
//   "custom"       → this module's saved player-built playlist
//
// ★ Storage is STANDALONE (a dedicated localStorage key), NOT the account — so it
// works for GUESTS too (this game lets you play with no account). Depending on an
// account was the bug behind "it lets me choose but never switches / never plays my
// playlist": with no account every setter no-oped and everything resolved to default.
//
// Custom playlists are stored as real persisted data (an array of exact catalog
// filenames), catalog-validated on save and resolve, so a stale reference can never
// crash playback. Account params are still accepted (for the personalized source's
// profile) but the source/custom state itself is account-independent.
// ─────────────────────────────────────────────────────────────────────────────

import { getCurrentAccount } from "./account.js"
import { menuTrackDisplayName } from "./sound.js"
import * as musicPersonality from "./musicPersonality.js"

export const SOURCES = { DEFAULT: "default", PERSONALIZED: "personalized", CUSTOM: "custom" }
const VALID_SOURCES = new Set(Object.values(SOURCES))

// The known-good catalog (all 103) — the DEFAULT source is the whole library.
const ALL_SONGS = musicPersonality.getSongFiles()
const CATALOG_SET = new Set(ALL_SONGS)

// ── STANDALONE PERSISTENCE (localStorage; guest-safe, account-independent) ────
const LS_KEY = "multiverse-smash-music"
function _lsAvailable() { try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false } }
function _load() {
  const base = { customPlaylist: [], activeSource: SOURCES.DEFAULT }
  if (!_lsAvailable()) return base
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY) || "null")
    if (!d || typeof d !== "object") return base
    return {
      customPlaylist: Array.isArray(d.customPlaylist) ? d.customPlaylist.filter(f => CATALOG_SET.has(f)) : [],
      activeSource: VALID_SOURCES.has(d.activeSource) ? d.activeSource : SOURCES.DEFAULT
    }
  } catch (_) { return base }
}
let _state = _load()
function _persist() { if (_lsAvailable()) { try { localStorage.setItem(LS_KEY, JSON.stringify(_state)) } catch (_) {} } }

// The full library the browser shows: every catalogued song with a display name.
export function getLibrary() { return ALL_SONGS.map(file => ({ file, name: menuTrackDisplayName(file) })) }
export function librarySize() { return ALL_SONGS.length }

// The saved custom playlist, filtered to songs that still exist in the catalog.
export function getCustomPlaylist() { return _state.customPlaylist.filter(f => CATALOG_SET.has(f)) }

// Persist a player-built playlist. Accepts any subset of catalog filenames (≥0). Unknown files
// dropped; duplicates removed; stored in CATALOG ORDER so playback is deterministic. Returns it.
export function saveCustomPlaylist(files) {
  const want = new Set((Array.isArray(files) ? files : []).filter(f => CATALOG_SET.has(f)))
  _state.customPlaylist = ALL_SONGS.filter(f => want.has(f))
  _persist()
  return [..._state.customPlaylist]
}

export function getActiveSource() { return _state.activeSource }
export function setActiveSource(source) {
  if (VALID_SOURCES.has(source)) { _state.activeSource = source; _persist() }
  return _state.activeSource
}

// Resolve the active source to an actual file list to load, with HONEST fallbacks:
//   - custom but empty → all songs, "Custom playlist is empty — using all songs"
//   - personalized but no confident profile → all songs, message
// Returns { source, files, fellBack, message } — fellBack=true means the requested source
// couldn't be honored and the full library is playing instead (surface the message).
export function resolveActivePlaylist(account = getCurrentAccount()) {
  const all = () => [...ALL_SONGS]
  const source = getActiveSource()

  if (source === SOURCES.CUSTOM) {
    const cp = getCustomPlaylist()
    if (cp.length) return { source, files: cp, fellBack: false, message: "" }
    return { source, files: all(), fellBack: true, message: "Custom playlist is empty — using all songs" }
  }

  if (source === SOURCES.PERSONALIZED) {
    let ord = null
    try { ord = musicPersonality.getPersonalizedMenuOrder(account) } catch (_) {}
    if (ord && ord.personalized && ord.files?.length) return { source, files: ord.files, fellBack: false, message: "" }
    return { source, files: all(), fellBack: true, message: "Not enough play data yet — using all songs" }
  }

  // default = the entire library
  return { source: SOURCES.DEFAULT, files: all(), fellBack: false, message: "" }
}

// Human label for a source (UI + messages).
export function sourceLabel(source) {
  return source === SOURCES.PERSONALIZED ? "Personalized"
       : source === SOURCES.CUSTOM ? "My Playlist"
       : "All Songs"
}
