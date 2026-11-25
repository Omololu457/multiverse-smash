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
// Exact re-download copies ("Song (1).mp3" next to "Song.mp3") stay in the library but are left out of
// the ready-made playlists so a playlist never plays the same song twice.
const _isDupeCopy = f => / \(1\)\.mp3$/i.test(f) && CATALOG_SET.has(f.replace(/ \(1\)\.mp3$/i, ".mp3"))
const PL_SONGS = ALL_SONGS.filter(f => !_isDupeCopy(f))

// ── READY-MADE PLAYLISTS ─────────────────────────────────────────────────────
// Grouped from the whole library by artist / style, so a whole vibe is one click instead of
// ticking songs one by one. A song can sit in a genre list AND an artist list. Anything no
// genre list claims lands in "Everything Else", so every song is reachable from a playlist.
const _PL_DEFS = [
  { id: "drill",   name: "Drill / Street",     re: /king von|tay[- ]?k|nardo wick|nle choppa|big boogie|glokk40spaz|lil tony|kevin gates|jace!|boofpaxkmooky|no savage|nine vicious|trevon o'ryan|dababy x stunna|yessirskiii|yike train|shot callin|what you is|zero iq|gleesh|married to the game|stay schemin|gang over luv/i },
  { id: "youngboy", name: "YoungBoy Mix",      re: /youngboy|young boy/i },
  { id: "rage",    name: "Carti & Rage",       re: /carti|backr00ms|pain 1993|lil uzi|uzi vert|famous dex|sheck wes|pissy pamper|evil j0rdan|nine vicious|subliminals/i },
  { id: "trap",    name: "Trap Hits",          re: /future|young thug|gunna|drake|metro boomin|dababy|lil yachty|\bt\.?i\b|ti- 24|jeezy|pnb rock|9am in calabasas|baby keem|famous dex/i },
  { id: "lucki",   name: "LUCKI & Plugg",      re: /lucki|cochise|watch this|orange soda|smoking marley|blue dream/i },
  { id: "rnb",     name: "R&B / Slow Jams",    re: /brent faiyaz|jhen[eé]|sza|summer walker|ella mai|bryson tiller|chris brown|boo'd up|rochelle jordan|steve lacy|freek-a-leek|one more chance|my body|r\. kelly|stranger|sing to me|foolish|luxurious|at the club|wine & dine|baby you're worth it|gangsta love|luv punnani|20 min|almeda|camila cabello|doja cat|all i need/i },
  { id: "afro",    name: "Afrobeats",          re: /rema|ckay|wande coal|yemi alade|oxlade|midas the jagaban|wisdom - kickback|amaarae|gbona|one dance|tek it|peligrosa/i },
  { id: "edits",   name: "Slowed / Sped Up",   re: /slowed|sped up|reverb|nightcore|daycore|pitched|sloweddd|perfection/i },
  { id: "chill",   name: "Chill / City Pop",   re: /taeko|都会|情绪|shiloh dynasty|stereo love|vicetone|katy perry|kirk franklin|pinkpantheress|crystal waters|blowing emotions|heartburn|don't need a lot/i },
]
const _GENRES = new Set(["drill", "rage", "trap", "lucki", "rnb", "afro", "edits", "chill", "youngboy"])
function _buildPlaylists() {
  const out = _PL_DEFS.map(d => ({ id: d.id, name: d.name, files: PL_SONGS.filter(f => d.re.test(f)) }))
  const claimed = new Set()
  for (const p of out) if (_GENRES.has(p.id)) for (const f of p.files) claimed.add(f)
  out.push({ id: "other", name: "Everything Else", files: PL_SONGS.filter(f => !claimed.has(f)) })
  return out.filter(p => p.files.length)
}
const PLAYLISTS = _buildPlaylists()
// [{ id, name, files }] — every ready-made playlist (files in library order).
export function getPlaylists() { return PLAYLISTS.map(p => ({ id: p.id, name: p.name, files: [...p.files] })) }

// ── STANDALONE PERSISTENCE (localStorage; guest-safe, account-independent) ────
const LS_KEY = "multiverse-smash-music"
function _lsAvailable() { try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false } }
function _load() {
  const base = { customPlaylist: [], activeSource: SOURCES.DEFAULT, menuEverywhere: false }
  if (!_lsAvailable()) return base
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY) || "null")
    if (!d || typeof d !== "object") return base
    return {
      customPlaylist: Array.isArray(d.customPlaylist) ? d.customPlaylist.filter(f => CATALOG_SET.has(f)) : [],
      activeSource: VALID_SOURCES.has(d.activeSource) ? d.activeSource : SOURCES.DEFAULT,
      menuEverywhere: d.menuEverywhere === true
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

// MENU MUSIC EVERYWHERE (Settings toggle, default OFF): when on, the menu playlist keeps playing through
// matches in strict order instead of each stage's own music.
export function getMenuEverywhere() { return !!_state.menuEverywhere }
export function setMenuEverywhere(on) { _state.menuEverywhere = !!on; _persist(); return _state.menuEverywhere }

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
