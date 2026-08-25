// sound.js
// Fully procedural Web Audio sound engine.
// No audio files required — everything is synthesized.
// Drop-in replacement: same exports (sound, SFX, MUSIC) as before.

// ─────────────────────────────────────────────────────────────────
// SOUND ID CONSTANTS
// ─────────────────────────────────────────────────────────────────
export const SFX = {
  HIT_LIGHT:       "hit_light",
  HIT_HEAVY:       "hit_heavy",
  HIT_SPECIAL:     "hit_special",
  HIT_PROJECTILE:  "hit_projectile",
  HIT_ULTIMATE:    "hit_ultimate",
  BLOCK:           "block",
  WHIFF:           "whiff",
  VO_GOKU:         "vo_goku_ultimate",
  VO_NARUTO:       "vo_naruto_ultimate",
  VO_GOJO:         "vo_gojo_ultimate",
  VO_SUKUNA:       "vo_sukuna_ultimate",
  VO_OMOLOLU:      "vo_omololu_ultimate",
  UI_HOVER:        "ui_hover",
  UI_SELECT:       "ui_select",
  UI_BACK:         "ui_back",
  UI_MATCH_START:  "ui_match_start",
  KO:              "ko",
  COMBO_1:         "combo_hit_1",
  COMBO_2:         "combo_hit_2",
  COMBO_3:         "combo_hit_3",
  COMBO_4:         "combo_hit_4",
  COMBO_5:         "combo_hit_5",
  COUNTER_HIT:     "counter_hit",
  DOMAIN_ACTIVATE: "domain_activate",
  TRANSFORMATION:  "transformation",
}

// ─────────────────────────────────────────────────────────────────
// AUDIO FILE BASE PATH (single source of truth)
// All user-provided music files (.mp3) resolve against this. They live
// alongside index.html, so "./" resolves relative to the served document —
// works whether the server roots at the project dir or a parent. Change THIS
// one line if the files move (e.g. "./audio/"); never hardcode a subfolder
// elsewhere.
// ─────────────────────────────────────────────────────────────────
export const AUDIO_BASE = "./"

// Music for EVERY non-stadium context — loading/menu, character select, win
// screen, etc. Only actual fight stages override this (via playStageTrack).
// NOTE: exact on-disk filename — the file is literally "Passion_fruitmp3.mp3".
export const MENU_MUSIC_FILE = "Passion_fruitmp3.mp3"

// Generic/SHARED transformation cue for ANY Dragon Ball character's transformation
// (Goku Black → SSJ Rose, Goku → SSJ Blue, …). Single source of truth for the filename —
// callers use SoundManager.playDragonBallTransformSfx() rather than hardcoding this inline.
export const DRAGON_BALL_TRANSFORM_SFX = "dragon_ball_transformation.mp3"

// ── MENU BACKGROUND PLAYLIST ──────────────────────────────────────
// Ordered list of tracks the game plays (in order, looping back to the top)
// while the player is on ANY menu/settings/select screen — NEVER during a
// match (playStageTrack takes over there). This is the single source of truth
// for the sequence; playMenuMusic() reads straight from it and the Settings
// reorder UI mutates it in place. Filenames are EXACT on-disk names (case
// sensitive). Missing files degrade gracefully via playMusicFile's onerror
// fallback (procedural MENU theme), so a not-yet-added track never crashes.
// The CURATED default sequence — frozen so it survives even after MENU_PLAYLIST is swapped in
// place (personalized / custom sources mutate MENU_PLAYLIST). Restoring "default" copies from here.
export const DEFAULT_MENU_PLAYLIST = Object.freeze([
  "love_nwantiti__feat__Dj_Yo____AX_EL___Remix_.mp3",
  "Future___Young_Thug_-_No_Cap__Official_Audio_.mp3",
  "jhene__aiko_-_stay_ready__instrumental_.mp3",
  "Noble_f3mii_Instrumental.mp3",
  "Rema_-_Dumebi.mp3",
  "Rochelle_Jordan_-_Lowkey___sped_up__.mp3"
])
// The LIVE playlist (what's actually playing/looping). Starts as a copy of the default; the reorder
// UI, personalized order, and custom playlist all mutate THIS array via setMenuPlaylistFiles/-Order.
export const MENU_PLAYLIST = [...DEFAULT_MENU_PLAYLIST]

// Clean, human-readable labels for the Settings playlist UI (only these 6 fixed
// files, so a hardcoded map is fine). menuTrackDisplayName() falls back to a
// prettified filename if a track is ever missing from the map.
export const MENU_TRACK_NAMES = {
  "love_nwantiti__feat__Dj_Yo____AX_EL___Remix_.mp3": "Love Nwantiti (Remix)",
  "Future___Young_Thug_-_No_Cap__Official_Audio_.mp3": "Future & Young Thug — No Cap",
  "jhene__aiko_-_stay_ready__instrumental_.mp3":       "Jhené Aiko — Stay Ready (Instrumental)",
  "Noble_f3mii_Instrumental.mp3":                       "Noble F3mii (Instrumental)",
  "Rema_-_Dumebi.mp3":                                  "Rema — Dumebi",
  "Rochelle_Jordan_-_Lowkey___sped_up__.mp3":          "Rochelle Jordan — Lowkey (Sped Up)"
}

export function menuTrackDisplayName(file) {
  if (MENU_TRACK_NAMES[file]) return MENU_TRACK_NAMES[file]
  return String(file || "").replace(/\.mp3$/i, "").replace(/_+/g, " ").trim()
}

export const MUSIC = {
  MENU:           "music_menu",
  JUJUTSU_HIGH:   "music_jujutsu_high",
  SHIBUYA:        "music_shibuya",
  NAMEK:          "music_namek",
  TOURNAMENT:     "music_tournament",
  HIDDEN_LEAF:    "music_hidden_leaf",
  SHADOW_GARDEN:  "music_shadow_garden",
  DOMAIN_LOOP:    "domain_loop",
}

// ─────────────────────────────────────────────────────────────────
// SOUND DEFINITIONS
// Each sound is a function: (ctx, masterGain) => void
// ─────────────────────────────────────────────────────────────────

function playNoise(ctx, gain, duration, filterFreq = 800, gainVal = 0.3) {
  const bufSize  = ctx.sampleRate * duration
  const buf      = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data     = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const src    = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const g      = ctx.createGain()

  src.buffer        = buf
  filter.type       = "bandpass"
  filter.frequency.value = filterFreq
  filter.Q.value    = 1.2

  g.gain.setValueAtTime(gainVal, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)

  src.connect(filter)
  filter.connect(g)
  g.connect(gain)
  src.start(ctx.currentTime)
  src.stop(ctx.currentTime + duration)
}

function osc(ctx, gain, type, freq, duration, gainVal, freqEnd = null) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, ctx.currentTime)
  if (freqEnd !== null)
    o.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration)
  g.gain.setValueAtTime(gainVal, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  o.connect(g)
  g.connect(gain)
  o.start(ctx.currentTime)
  o.stop(ctx.currentTime + duration)
}

function oscAt(ctx, gain, type, freq, start, duration, gainVal, freqEnd = null) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, ctx.currentTime + start)
  if (freqEnd !== null)
    o.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + start + duration)
  g.gain.setValueAtTime(0.0001, ctx.currentTime)
  g.gain.setValueAtTime(gainVal, ctx.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  o.connect(g)
  g.connect(gain)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + duration)
}

const SOUNDS = {
  // ── Hits ──────────────────────────────────────────────────────
  hit_light(ctx, out) {
    osc(ctx, out, "sine", 380, 0.05, 0.35, 180)
    playNoise(ctx, out, 0.04, 1200, 0.2)
  },
  hit_heavy(ctx, out) {
    osc(ctx, out, "square", 90, 0.08, 0.55, 50)
    osc(ctx, out, "sine", 260, 0.12, 0.40, 80)
    playNoise(ctx, out, 0.10, 400, 0.35)
  },
  hit_special(ctx, out) {
    osc(ctx, out, "sine", 520, 0.06, 0.45, 320)
    osc(ctx, out, "sawtooth", 200, 0.14, 0.30, 80)
    playNoise(ctx, out, 0.08, 2000, 0.25)
  },
  hit_projectile(ctx, out) {
    osc(ctx, out, "sine", 680, 0.04, 0.38, 300)
    playNoise(ctx, out, 0.06, 3000, 0.18)
  },
  hit_ultimate(ctx, out) {
    // Big thump + shockwave tone
    osc(ctx, out, "square", 55, 0.05, 0.65, 30)
    osc(ctx, out, "sine", 180, 0.25, 0.55, 60)
    playNoise(ctx, out, 0.30, 300, 0.5)
    // Rising ping
    oscAt(ctx, out, "sine", 300, 0.05, 0.30, 0.40, 800)
  },
  block(ctx, out) {
    osc(ctx, out, "square", 800, 0.04, 0.28, 600)
    playNoise(ctx, out, 0.03, 2500, 0.15)
  },
  whiff(ctx, out) {
    osc(ctx, out, "sine", 280, 0.07, 0.12, 140)
    playNoise(ctx, out, 0.06, 600, 0.08)
  },

  // ── Combo hits (escalating pitch) ─────────────────────────────
  combo_hit_1(ctx, out) { osc(ctx, out, "sine", 340, 0.06, 0.32, 220); playNoise(ctx, out, 0.05, 1000, 0.18) },
  combo_hit_2(ctx, out) { osc(ctx, out, "sine", 390, 0.06, 0.35, 260); playNoise(ctx, out, 0.05, 1200, 0.20) },
  combo_hit_3(ctx, out) { osc(ctx, out, "sine", 440, 0.07, 0.38, 300); playNoise(ctx, out, 0.06, 1400, 0.22) },
  combo_hit_4(ctx, out) { osc(ctx, out, "sawtooth", 300, 0.08, 0.42, 200); playNoise(ctx, out, 0.07, 1600, 0.25) },
  combo_hit_5(ctx, out) {
    osc(ctx, out, "sawtooth", 260, 0.10, 0.48, 120)
    osc(ctx, out, "sine", 520, 0.10, 0.40, 300)
    playNoise(ctx, out, 0.08, 2000, 0.30)
  },

  // ── Counter hit ───────────────────────────────────────────────
  counter_hit(ctx, out) {
    osc(ctx, out, "sine", 800, 0.06, 0.45, 400)
    osc(ctx, out, "square", 200, 0.08, 0.30, 100)
    playNoise(ctx, out, 0.06, 3000, 0.20)
  },

  // ── KO ────────────────────────────────────────────────────────
  ko(ctx, out) {
    // Deep rumble
    osc(ctx, out, "square", 45, 0.05, 0.70, 20)
    // Descending drone
    osc(ctx, out, "sawtooth", 120, 0.55, 0.55, 30)
    // Shockwave noise
    playNoise(ctx, out, 0.40, 200, 0.60)
    // High fade-out ring
    oscAt(ctx, out, "sine", 600, 0.10, 0.50, 0.35, 200)
  },

  // ── Domain activate ───────────────────────────────────────────
  domain_activate(ctx, out) {
    // Low boom
    osc(ctx, out, "square", 40, 0.10, 0.70, 20)
    playNoise(ctx, out, 0.50, 150, 0.55)
    // Eerie rising tone
    osc(ctx, out, "sine", 120, 0.80, 0.40, 440)
    // High shimmer
    oscAt(ctx, out, "sine", 880, 0.20, 0.60, 0.30, 660)
    oscAt(ctx, out, "sine", 1100, 0.40, 0.40, 0.20, 550)
  },

  // ── Transformation ────────────────────────────────────────────
  transformation(ctx, out) {
    osc(ctx, out, "sine", 220, 0.40, 0.45, 880)
    osc(ctx, out, "sawtooth", 110, 0.30, 0.35, 55)
    playNoise(ctx, out, 0.25, 1500, 0.30)
    oscAt(ctx, out, "sine", 660, 0.15, 0.30, 0.35, 1320)
  },

  // ── Voice stingers (short musical phrases instead of voice lines) ──
  vo_goku_ultimate(ctx, out) {
    // Energetic rising arpeggio
    [0, 0.08, 0.16, 0.24].forEach((t, i) => {
      oscAt(ctx, out, "sine", 220 * Math.pow(1.25, i), t, 0.15, 0.40)
    })
    oscAt(ctx, out, "square", 110, 0.00, 0.30, 0.20)
  },
  vo_naruto_ultimate(ctx, out) {
    oscAt(ctx, out, "sine", 330, 0.00, 0.10, 0.38)
    oscAt(ctx, out, "sine", 440, 0.10, 0.10, 0.38)
    oscAt(ctx, out, "sine", 550, 0.20, 0.20, 0.38, 330)
    playNoise(ctx, out, 0.15, 800, 0.15)
  },
  vo_gojo_ultimate(ctx, out) {
    // Cool, detached ascending tone
    osc(ctx, out, "sine", 440, 0.35, 0.35, 880)
    oscAt(ctx, out, "sine", 220, 0.05, 0.30, 0.25)
  },
  vo_sukuna_ultimate(ctx, out) {
    // Menacing low rumble
    osc(ctx, out, "sawtooth", 55, 0.40, 0.55, 27)
    playNoise(ctx, out, 0.30, 200, 0.40)
    oscAt(ctx, out, "square", 220, 0.15, 0.30, 0.30, 110)
  },
  vo_omololu_ultimate(ctx, out) {
    osc(ctx, out, "sine", 392, 0.30, 0.40, 784)
    oscAt(ctx, out, "sawtooth", 196, 0.05, 0.25, 0.25)
  },

  // ── UI ────────────────────────────────────────────────────────
  ui_hover(ctx, out) {
    osc(ctx, out, "sine", 1200, 0.04, 0.10, 1000)
  },
  ui_select(ctx, out) {
    osc(ctx, out, "sine", 880, 0.04, 0.06)
    oscAt(ctx, out, "sine", 1100, 0.04, 0.06, 0.20)
  },
  ui_back(ctx, out) {
    osc(ctx, out, "sine", 660, 0.04, 0.05)
    oscAt(ctx, out, "sine", 440, 0.03, 0.06, 0.18)
  },
  ui_match_start(ctx, out) {
    // Three-note fanfare
    oscAt(ctx, out, "square", 220, 0.00, 0.10, 0.40)
    oscAt(ctx, out, "square", 330, 0.11, 0.10, 0.40)
    oscAt(ctx, out, "square", 440, 0.22, 0.18, 0.40)
    oscAt(ctx, out, "sine",   660, 0.22, 0.25, 0.30)
  },
}

// ─────────────────────────────────────────────────────────────────
// MUSIC GENERATORS
// Simple looping music using oscillators + setInterval scheduling
// ─────────────────────────────────────────────────────────────────

// Each theme is an array of [freq, duration] note steps
const THEMES = {
  music_menu: {
    bpm: 90, notes: [
      [330,1],[370,0.5],[440,1.5],[370,1],[330,2],
      [294,1],[330,1],[370,2],[330,2],
    ]
  },
  music_jujutsu_high: {
    bpm: 120, notes: [
      [220,0.5],[247,0.5],[262,1],[220,1],[196,0.5],[220,0.5],[247,2],
      [262,0.5],[294,0.5],[330,1],[294,1],[262,1],[247,2],
    ]
  },
  music_shibuya: {
    bpm: 130, notes: [
      [185,0.5],[208,0.5],[220,1],[208,0.5],[185,0.5],[175,1],[185,2],
      [165,0.5],[175,0.5],[185,1],[175,1],[165,1],[155,2],
    ]
  },
  music_namek: {
    bpm: 100, notes: [
      [294,1],[330,1],[370,2],[330,1],[294,1],[262,2],
      [330,1],[370,1],[415,2],[370,1],[330,1],[294,2],
    ]
  },
  music_tournament: {
    bpm: 140, notes: [
      [440,0.5],[494,0.5],[523,0.5],[494,0.5],[440,1],[392,0.5],[440,1.5],
      [392,0.5],[440,0.5],[494,0.5],[523,1],[494,1],[440,2],
    ]
  },
  music_hidden_leaf: {
    bpm: 95, notes: [
      [370,1],[415,0.5],[440,1.5],[415,1],[370,1],[330,2],
      [370,1],[415,1],[440,2],[415,1],[370,1],[330,2],
    ]
  },
  music_shadow_garden: {
    bpm: 85, notes: [
      [138,1],[155,1],[165,2],[155,1],[138,1],[123,2],
      [138,1],[155,0.5],[165,0.5],[155,1],[138,1],[123,3],
    ]
  },
  domain_loop: {
    bpm: 70, notes: [
      [110,2],[123,1],[110,1],[98,2],[110,2],
      [123,2],[138,1],[123,1],[110,3],
    ]
  },
}

class MusicPlayer {
  constructor(ctx, masterGain) {
    this._ctx        = ctx
    this._out        = masterGain
    this._timeout    = null
    this._noteIndex  = 0
    this._theme      = null
    this._stopped    = true
    this._musicGain  = ctx.createGain()
    this._musicGain.gain.value = 0.18   // music is quieter than SFX
    this._musicGain.connect(masterGain)
  }

  play(id) {
    this.stop()
    this._theme     = THEMES[id] || THEMES["music_menu"]
    this._noteIndex = 0
    this._stopped   = false
    this._scheduleNext()
  }

  stop() {
    this._stopped = true
    if (this._timeout) { clearTimeout(this._timeout); this._timeout = null }
    // Fade out
    try {
      this._musicGain.gain.setTargetAtTime(0.0001, this._ctx.currentTime, 0.3)
    } catch(_) {}
    // Restore gain after fade for next play
    setTimeout(() => {
      try { this._musicGain.gain.setValueAtTime(0.18, this._ctx.currentTime) } catch(_) {}
    }, 800)
  }

  _scheduleNext() {
    if (this._stopped || !this._theme) return

    const { bpm, notes } = this._theme
    const beat   = 60 / bpm
    const [freq, beats] = notes[this._noteIndex % notes.length]
    const dur    = beats * beat

    // Play note
    try {
      const o = this._ctx.createOscillator()
      const g = this._ctx.createGain()
      o.type = "triangle"
      o.frequency.setValueAtTime(freq, this._ctx.currentTime)

      // Articulate: attack, sustain, decay
      const attack  = 0.02
      const sustain = Math.max(0.01, dur * 0.7)
      const release = dur * 0.3

      g.gain.setValueAtTime(0.0001, this._ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.7, this._ctx.currentTime + attack)
      g.gain.setValueAtTime(0.7, this._ctx.currentTime + sustain)
      g.gain.exponentialRampToValueAtTime(0.0001, this._ctx.currentTime + sustain + release)

      // Add a very soft harmony a 5th up
      const oh = this._ctx.createOscillator()
      const gh = this._ctx.createGain()
      oh.type = "sine"
      oh.frequency.setValueAtTime(freq * 1.5, this._ctx.currentTime)
      gh.gain.setValueAtTime(0.15, this._ctx.currentTime)
      gh.gain.exponentialRampToValueAtTime(0.0001, this._ctx.currentTime + sustain + release)
      oh.connect(gh); gh.connect(this._musicGain)
      oh.start(this._ctx.currentTime); oh.stop(this._ctx.currentTime + sustain + release)

      o.connect(g); g.connect(this._musicGain)
      o.start(this._ctx.currentTime); o.stop(this._ctx.currentTime + sustain + release)
    } catch(_) {}

    this._noteIndex++
    // Loop
    if (this._noteIndex >= this._theme.notes.length) this._noteIndex = 0

    this._timeout = setTimeout(() => this._scheduleNext(), dur * 1000)
  }

  setVolume(v) {
    this._musicGain.gain.setTargetAtTime(v * 0.18, this._ctx.currentTime, 0.05)
  }
}

// AUDIO DUCKING — while a file-based voice/significant cue (playSfxFile) is playing,
// music drops to this fraction of its normal level, then ramps back when the cue ends.
const MUSIC_DUCK_FACTOR = 0.35   // 35% (within the requested 30-40% range)

// ─────────────────────────────────────────────────────────────────
// SOUND MANAGER
// ─────────────────────────────────────────────────────────────────
class SoundManager {
  constructor() {
    this._ctx      = null
    this._master   = null   // master gain for SFX
    this._musicPlayer = null
    this._sfxVol   = 0.8
    this._musicVol = 0.55
    // Independent mutes: SFX (play() + playSfxFile — combat/voice/ability cues) and
    // MUSIC (procedural themes + stage .mp3s). Kept separate so one can't silence the
    // other. NOTE: procedural music routes through the SFX _master gain, so SFX mute is
    // gated at the SOURCES (play()/playSfxFile early-return) rather than by zeroing
    // _master — otherwise it would silence music too.
    this._sfxMuted   = false
    this._musicMuted = false
    this._ready    = false
    // Real-audio-file music (user-provided .mp3 per stage). Played through an
    // HTMLAudioElement (its own pipeline, NOT the AudioContext graph), so its
    // level/mute are applied directly to the element below. Procedural THEMES
    // stay as the fallback when a stage has no assigned file.
    this._musicFile    = null   // HTMLAudioElement
    this._musicFileSrc = null   // current resolved src (avoid restart on rematch)
    // Autoplay gating: browsers block audio until a user gesture. We never start
    // playback before one — instead we remember the LAST requested track and
    // flush it on the first gesture (see init()'s resume handler).
    this._gestured     = false
    this._pendingMusic = null   // { kind: "theme"|"stage", id?, stage? }
    // Menu playlist cursor: which MENU_PLAYLIST index is currently playing, and
    // whether the auto-advance (onended → next track) is armed. Cleared the moment
    // a match's stage music takes over (_stopMenuPlaylist) so it never advances
    // over the top of in-match music.
    this._menuPlaylistIndex  = 0
    this._menuPlaylistActive = false
    // Ducking state: how many voice/significant cues are currently playing (ref-counted
    // so overlapping cues keep music ducked until the LAST finishes), the active scale
    // (1 = normal, MUSIC_DUCK_FACTOR = ducked), and the real-file fade interval handle.
    this._duckCount      = 0
    this._musicDuckScale = 1
    this._musicFileFade  = null
    // ── ACTIVE FILE-SFX REGISTRY (voice lines + move-tied one-shots) ──────────────
    // Every playSfxFile() Audio is tracked here so it can be STOPPED (a) when a NEWER cue for the same
    // owner starts — the single-voice-channel rule, so one character never overlaps itself — or (b) when
    // the match ends (stopAllSfx). A cue is NOT cut merely because its source animation ended: voice lines
    // play to natural completion. Entries: {audio, owner, persistent}.
    this._activeSfx      = new Set()
    // Ambient OWNER for the current cue: game.js stamps the acting fighter around a fighter's
    // combat/ability update so its voice auto-tags without touching every call site. null = untagged
    // (intro / win / menu cues) → never cut by the per-animation stop.
    this._voiceOwner     = null
    // When true, cues started right now are PERSISTENT (survive stopAllSfx unless includePersistent) —
    // used to preserve win-lines that intentionally play into the victory screen.
    this._forcePersistent = false
  }

  // ── INIT ──────────────────────────────────────────────────────
  init() {
    try {
      const AC  = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      this._ctx    = new AC()
      this._master = this._ctx.createGain()
      this._master.gain.value = this._sfxVol
      this._master.connect(this._ctx.destination)
      this._musicPlayer = new MusicPlayer(this._ctx, this._master)
      this._ready  = true
    } catch(_) { return }

    // AUTOPLAY: do nothing audible until the first user gesture. On that gesture
    // we mark _gestured, resume the AudioContext, and flush whatever track was
    // requested while we were waiting (e.g. the menu/stage music queued at boot).
    const resume = () => {
      this._gestured = true
      if (this._ctx?.state === "suspended") this._ctx.resume()
      this._flushPendingMusic()
    }
    document.addEventListener("pointerdown", resume, { once: true })
    document.addEventListener("keydown",     resume, { once: true })
    document.addEventListener("touchstart",  resume, { once: true })
  }

  _flushPendingMusic() {
    const p = this._pendingMusic
    if (!p) return
    this._pendingMusic = null
    if (p.kind === "theme")       this.playMusic(p.id, true)
    else if (p.kind === "stage")  this.playStageTrack(p.stage)
    else if (p.kind === "menu")   this.playMenuMusic()
    else if (p.kind === "domainAudio") this.playDomainAudio(p.voiceFile, p.themeFile)
  }

  // Centralized non-stadium music. Plays through MENU_PLAYLIST in order (looping
  // back to the top), honoring the same first-gesture gate as everything else —
  // queues until the user interacts, and falls back to the procedural MENU theme
  // if a track file 404s. RESUMES from the current cursor (doesn't restart the
  // song each time you re-open a menu). Stage music (playStageTrack) cleanly halts
  // this via _stopMenuPlaylist so the playlist never plays over a match.
  playMenuMusic() {
    if (!this._ready) return
    if (!this._gestured) { this._pendingMusic = { kind: "menu" }; return }
    // Empty playlist (or all-missing) → keep the legacy single-file / procedural path.
    if (!MENU_PLAYLIST.length) {
      this._fileFallbackTheme = MUSIC.MENU
      if (!this.playMusicFile(MENU_MUSIC_FILE, true)) this.playMusic(MUSIC.MENU, true)
      return
    }
    this._playMenuTrack(this._menuPlaylistIndex)
  }

  // Play one playlist entry (no per-track loop) and arm the onended auto-advance
  // to the NEXT entry, wrapping at the end. Reuses the exact playMusicFile one-shot
  // path — no new audio-loading system.
  _playMenuTrack(i) {
    const n = MENU_PLAYLIST.length
    if (!n) return
    this._menuPlaylistIndex  = ((i % n) + n) % n
    this._menuPlaylistActive = true
    this._fileFallbackTheme  = MUSIC.MENU
    const file = MENU_PLAYLIST[this._menuPlaylistIndex]
    // loop=false so the track ENDS and we advance; if the file can't be requested,
    // fall back to the procedural menu theme (matches single-file behavior).
    if (!this.playMusicFile(file, false)) { this.playMusic(MUSIC.MENU, true); return }
    if (this._musicFile) {
      this._musicFile.onended = () => {
        if (!this._menuPlaylistActive) return   // a match started → don't advance
        this._playMenuTrack(this._menuPlaylistIndex + 1)
      }
    }
  }

  // Disarm the playlist auto-advance (called when stage music / stopMusic takes
  // over). Leaves the cursor where it is so re-entering a menu resumes in order.
  _stopMenuPlaylist() {
    this._menuPlaylistActive = false
    if (this._musicFile) this._musicFile.onended = null
  }

  // ── MENU PLAYLIST — public API for the Settings reorder UI ────
  getMenuPlaylist() { return MENU_PLAYLIST }

  // Which MENU_PLAYLIST index is the LIVE now-playing track (the cursor moveMenuTrack keeps pinned to the
  // song through reorders). The Settings panel highlights this row so a reorder is visibly reflected —
  // otherwise a (correct) reorder that preserves the current song looks like it "did nothing".
  getMenuPlaying() {
    const playing = this._menuPlaylistActive && !!this._musicFile && !this._musicFile.paused
    return { index: this._menuPlaylistIndex, active: !!this._menuPlaylistActive, playing, file: MENU_PLAYLIST[this._menuPlaylistIndex] || null }
  }

  // Swap the track at `index` with its neighbor in `direction` (-1 up / +1 down),
  // mutating MENU_PLAYLIST in place so the live play sequence updates. Keeps the
  // "now playing" cursor pinned to the SAME song across the swap so playback
  // continuity is preserved. Returns true if the move happened.
  moveMenuTrack(index, direction) {
    const n = MENU_PLAYLIST.length
    const j = index + (direction < 0 ? -1 : 1)
    if (index < 0 || index >= n || j < 0 || j >= n) return false
    const t = MENU_PLAYLIST[index]; MENU_PLAYLIST[index] = MENU_PLAYLIST[j]; MENU_PLAYLIST[j] = t
    if (this._menuPlaylistIndex === index)      this._menuPlaylistIndex = j
    else if (this._menuPlaylistIndex === j)     this._menuPlaylistIndex = index
    return true
  }

  // Restore a saved order (persistence): reorder MENU_PLAYLIST in place to match
  // `order` (an array of filenames), ignoring unknown/missing entries and keeping
  // any not listed. Session-only today, but ready if Settings ever persists.
  setMenuPlaylistOrder(order) {
    if (!Array.isArray(order)) return
    const known = new Set(MENU_PLAYLIST)
    const next = order.filter(f => known.has(f))
    for (const f of MENU_PLAYLIST) if (!next.includes(f)) next.push(f)
    MENU_PLAYLIST.length = 0
    for (const f of next) MENU_PLAYLIST.push(f)
    this._menuPlaylistIndex = 0
  }

  // Replace the ENTIRE menu playlist with an explicit ordered file list (e.g. a
  // personalized order from musicPersonality). Unlike setMenuPlaylistOrder (which
  // only permutes the existing curated tracks), this swaps in a new catalog and
  // resets the cursor to the top. Non-string/empty entries are dropped; an empty
  // result is ignored (keeps the current list). Returns the new length.
  setMenuPlaylistFiles(files) {
    if (!Array.isArray(files)) return MENU_PLAYLIST.length
    const next = files.filter(f => typeof f === "string" && f.trim())
    if (!next.length) return MENU_PLAYLIST.length
    MENU_PLAYLIST.length = 0
    for (const f of next) MENU_PLAYLIST.push(f)
    this._menuPlaylistIndex = 0
    return MENU_PLAYLIST.length
  }

  // Settings CLICK-TO-PLAY: jump the playlist to `index` and start that track
  // IMMEDIATELY, arming the same onended auto-advance so playback then continues
  // through the rest of the list from the chosen song. This is the on-demand
  // counterpart to moveMenuTrack() (which only reorders the upcoming sequence and
  // deliberately keeps the CURRENT song playing) — before this method there was no
  // way to make selecting a song actually change what's playing. Honors the first-
  // gesture gate; mute + volume are re-applied by playMusicFile so a switch never
  // resets them. Returns true if it started now (false = queued pre-gesture / empty).
  selectMenuTrack(index) {
    const n = MENU_PLAYLIST.length
    if (!n || !this._ready) return false
    const i = ((index % n) + n) % n
    // Before the first user gesture, remember the choice; the gesture flush
    // (playMenuMusic → _playMenuTrack) starts it from this cursor.
    if (!this._gestured) { this._menuPlaylistIndex = i; this._pendingMusic = { kind: "menu" }; return false }
    this._playMenuTrack(i)
    return true
  }

  // ── PLAY SFX ──────────────────────────────────────────────────
  play(id) {
    if (this._sfxMuted || !this._ctx || !this._ready) return   // procedural SFX gated by SFX mute
    if (this._ctx.state === "suspended") {
      this._ctx.resume().then(() => this._trigger(id))
      return
    }
    this._trigger(id)
  }

  _trigger(id) {
    const fn = SOUNDS[id]
    if (!fn) return
    try { fn(this._ctx, this._master) } catch(_) {}
  }

  // ── COMBO HELPER ──────────────────────────────────────────────
  playCombo(comboCount = 1) {
    this.play(`combo_hit_${Math.min(comboCount, 5)}`)
  }

  // ── MUSIC (procedural) ────────────────────────────────────────
  playMusic(id, _loop = true) {
    if (!this._ready || !this._musicPlayer) return
    // Before the first user gesture, queue instead of starting (avoids the
    // "AudioContext was not allowed to start" warning).
    if (!this._gestured) { this._pendingMusic = { kind: "theme", id }; return }
    this.stopMusicFile()   // procedural and file music never overlap
    if (this._ctx.state === "suspended") {
      this._ctx.resume().then(() => this._musicPlayer.play(id))
      return
    }
    this._musicPlayer.play(id)
  }

  stopMusic() {
    this._stopMenuPlaylist()   // disarm playlist auto-advance before killing playback
    this._musicPlayer?.stop()
    this.stopMusicFile()
  }

  // ── MUSIC (real audio file) ───────────────────────────────────
  _resolveSrc(filename) {
    if (!filename) return null
    // Absolute / already-relative paths pass through; bare names resolve under
    // the single configurable AUDIO_BASE.
    if (/^(\.\/|\.\.\/|\/|https?:)/.test(filename)) return filename
    return `${AUDIO_BASE}${filename}`
  }

  // Play a user-provided .mp3 (looping). Honors the same mute/volume as the
  // procedural music. On a load failure (e.g. 404 / wrong filename) it logs a
  // clear warning and falls back to the procedural theme. Returns false if the
  // file can't even be requested.
  playMusicFile(filename, loop = true) {
    const src = this._resolveSrc(filename)
    if (!src) return false
    try {
      if (!this._musicFile) {
        this._musicFile = new Audio()
        this._musicFile.preload = "auto"
      }
      const a = this._musicFile
      this._musicPlayer?.stop()   // silence procedural layer
      a.onerror = () => {
        console.warn(`[sound] music file failed to load: ${src} — falling back to procedural theme`)
        this._musicFileSrc = null
        if (this._fileFallbackTheme) this.playMusic(this._fileFallbackTheme, true)
      }
      // Only (re)load when the track actually changes, so a rematch on the same
      // stage doesn't restart the song.
      if (this._musicFileSrc !== src) { a.src = src; this._musicFileSrc = src }
      a.loop   = !!loop
      a.muted  = this._musicMuted
      a.volume = this._musicVol * (this._musicDuckScale || 1)   // start ducked if a cue is mid-play
      const p = a.play()
      if (p && p.catch) p.catch(() => {})   // gesture-gating handled by _gestured; 404s handled by onerror
      return true
    } catch (_) { return false }
  }

  stopMusicFile() {
    if (this._musicFile) {
      try { this._musicFile.pause(); this._musicFile.currentTime = 0 } catch (_) {}
    }
    this._musicFileSrc = null
  }

  // Preferred entry point: play a stage's assigned audio file, else fall back
  // to the procedural theme that best fits the stage/series.
  playStageTrack(stage) {
    this._stopMenuPlaylist()  // MATCH START: menu playlist stops cleanly, stage music takes over
    this._lastStage = stage   // remembered so a domain can restore it on collapse
    // Queue until the first gesture, then resolve file → procedural fallback.
    if (!this._gestured) { this._pendingMusic = { kind: "stage", stage }; return }
    this._fileFallbackTheme = this._proceduralThemeForStage(stage)
    if (stage?.music && this.playMusicFile(stage.music, true)) return
    this.playMusic(this._fileFallbackTheme, true)
  }

  // Restore the current map's own track (used when a domain that hijacked the
  // music collapses). Falls back to menu music if no stage was ever set.
  restoreStageMusic() {
    if (this._lastStage) this.playStageTrack(this._lastStage)
    else this.playMenuMusic()
  }

  // ── ONE-SHOT FILE SFX (e.g. a voice line) ─────────────────────
  // play() only triggers procedural SOUNDS and playMusicFile() loops, so this
  // is the missing piece: a non-looping audio FILE played once. Honors mute and
  // SFX volume; needs the first-gesture unlock (callers route domain audio
  // through playDomainAudio, which queues pre-gesture).
  // One-shot file SFX, played on SFX volume. Optional `fallbackId` is a
  // procedural SOUNDS id triggered if the file can't be requested OR 404s
  // (via the element's onerror) — so the cue is never fully silent.
  // opts.owner: the fighter this cue belongs to (auto-filled from this._voiceOwner if omitted). It is the
  // SINGLE-VOICE-CHANNEL key: starting a new owned cue stops that owner's current cue first (no self-
  // overlap). It does NOT get cut when the source animation ends — clips finish naturally. opts.persistent:
  // survive stopAllSfx (win-lines).
  playSfxFile(filename, fallbackId = null, opts = {}) {
    if (this._sfxMuted || !this._gestured) return false   // SFX mute: skip BEFORE ducking → a muted cue never ducks music
    const src = this._resolveSrc(filename)
    if (!src) { if (fallbackId) this.play(fallbackId); return false }
    try {
      const owner = opts.owner !== undefined ? opts.owner : this._voiceOwner
      // SINGLE VOICE CHANNEL per character: a new OWNED cue first stops whatever cue that same owner is
      // already playing, so one character never overlaps / talks over itself. Untagged cues (owner=null:
      // intro / win / menu) are exempt — stopOwnedSfx no-ops on null — so cross-CHARACTER overlap (owner A
      // vs owner B) is left completely untouched, which is the desired behaviour.
      if (owner) this.stopOwnedSfx(owner)
      const a = new Audio(src)        // fresh element: fire-and-forget one-shot
      a.volume = this._sfxVol
      if (fallbackId) a.onerror = () => this.play(fallbackId)   // 404 → procedural cue
      // Track it so a match-end stop (stopAllSfx) or a newer same-owner cue (above) can STOP it. A cue
      // is NOT cut when its source animation ends — voice lines play to natural completion by default.
      const entry = { audio: a, owner: owner || null, persistent: !!(opts.persistent || this._forcePersistent) }
      this._activeSfx.add(entry)
      // DUCK: this is a file-based voice/significant cue → drop music while it plays and restore when it
      // ENDS. Ref-counted. The release ALSO deregisters the entry, and fires on ended / error /
      // play-rejection / a manual stop (stopAllSfx/stopOwnedSfx call it) so the duck can never get stuck.
      this._duckBegin()
      let released = false
      const release = () => { if (!released) { released = true; this._activeSfx.delete(entry); this._duckEnd() } }
      entry.release = release
      a.addEventListener("ended", release, { once: true })
      a.addEventListener("error", release, { once: true })
      const p = a.play()
      if (p && p.catch) p.catch(() => release())   // playback rejected → un-duck immediately
      return a
    } catch (_) { if (fallbackId) this.play(fallbackId); return false }
  }

  // Immediately stop + deregister one tracked cue (pause, rewind, release its music-duck).
  _killSfxEntry(entry) {
    try { entry.audio.pause(); entry.audio.currentTime = 0 } catch (_) {}
    if (entry.release) entry.release(); else this._activeSfx.delete(entry)
  }

  // Stop EVERY in-flight voice/SFX cue — the match-end / menu-return hammer. Preserves `persistent`
  // cues (win-lines that intentionally play into the victory screen) unless includePersistent is set.
  stopAllSfx({ includePersistent = false } = {}) {
    for (const entry of [...this._activeSfx]) {
      if (entry.persistent && !includePersistent) continue
      this._killSfxEntry(entry)
    }
  }

  // Stop the cues belonging to ONE fighter — the single-voice-channel enforcer: playSfxFile calls this
  // for the incoming owner right before starting a new owned cue, so that character's previous line is
  // cut and the two never overlap. (No longer called on animation-end — clips finish naturally.)
  // Persistent cues (none are owner-tagged today, but be safe) are left alone.
  stopOwnedSfx(owner) {
    if (!owner) return
    for (const entry of [...this._activeSfx]) {
      if (entry.owner === owner && !entry.persistent) this._killSfxEntry(entry)
    }
  }

  // SHARED Dragon Ball transformation cue. Any DB character's transformation code calls this
  // instead of hardcoding the filename inline — Goku Black's SSJ Rose cinematic and Goku's SSJ Blue
  // ultimate both route through here, so the sound is defined in exactly one place and reused.
  // No fallback id (faithful to the extracted inline call): callers that also want the procedural
  // power-up boom layer it separately (as the Rose cinematic does).
  playDragonBallTransformSfx() {
    return this.playSfxFile(DRAGON_BALL_TRANSFORM_SFX, null)
  }

  // Domain-expansion audio: a one-shot voice line + a looping domain theme,
  // started together. Gesture-gated like all other music so it queues cleanly
  // if a domain somehow opens before the first interaction. If a file 404s it
  // falls back to the existing procedural equivalent (voice → DOMAIN_ACTIVATE,
  // theme → DOMAIN_LOOP) so audio never goes fully silent.
  playDomainAudio(voiceFile, themeFile) {
    if (!this._ready) return
    if (!this._gestured) { this._pendingMusic = { kind: "domainAudio", voiceFile, themeFile }; return }
    if (voiceFile) this.playSfxFile(voiceFile, SFX.DOMAIN_ACTIVATE)
    if (themeFile) {
      this._fileFallbackTheme = MUSIC.DOMAIN_LOOP   // playMusicFile.onerror uses this
      if (!this.playMusicFile(themeFile, true)) this.playMusic(MUSIC.DOMAIN_LOOP, true)
    }
  }

  _proceduralThemeForStage(stage) {
    const byName = {
      "jujutsu high courtyard": MUSIC.JUJUTSU_HIGH,
      "shibuya incident":       MUSIC.SHIBUYA,
      "planet namek":           MUSIC.NAMEK,
      "world tournament arena": MUSIC.TOURNAMENT,
      "hidden leaf village":    MUSIC.HIDDEN_LEAF,
      "shadow garden":          MUSIC.SHADOW_GARDEN,
    }
    const n = String(stage?.name || "").toLowerCase()
    if (byName[n]) return byName[n]
    const bySeries = {
      jjk:         MUSIC.SHIBUYA,
      naruto:      MUSIC.HIDDEN_LEAF,
      dragonball:  MUSIC.NAMEK,
      demonslayer: MUSIC.SHADOW_GARDEN,
      rickmorty:   MUSIC.TOURNAMENT,
      ben10:       MUSIC.SHADOW_GARDEN,
    }
    return bySeries[stage?.series] || MUSIC.MENU
  }

  // Back-compat: stage name → procedural theme (file-aware callers use
  // playStageTrack instead).
  playStageMusic(stageName = "") {
    this.playMusic(this._proceduralThemeForStage({ name: stageName }), true)
  }

  // ── VOLUME / MUTE ─────────────────────────────────────────────
  setVolume(sfxVol = 0.8, musicVol = 0.55) {
    this._sfxVol   = Math.max(0, Math.min(1, sfxVol))
    this._musicVol = Math.max(0, Math.min(1, musicVol))
    // _master carries procedural MUSIC too, so keep it at _sfxVol regardless of SFX mute
    // (SFX mute is source-gated in play()/playSfxFile, not here).
    if (this._master)
      this._master.gain.setTargetAtTime(this._sfxVol, this._ctx.currentTime, 0.05)
    this._applyMusicLevel()   // applies _musicVol × current duck scale (or 0 if music-muted) to both paths
  }

  // ── INDEPENDENT SFX / MUSIC MUTE ──────────────────────────────
  // SFX mute: source-gated (play()/playSfxFile early-return). _master is left at _sfxVol
  // so procedural music (which flows through _master) is NOT affected.
  setSfxMuted(m)   { this._sfxMuted = !!m }
  isSfxMuted()     { return this._sfxMuted }

  // Music mute: silences BOTH music paths and nothing else. Procedural theme → _musicGain
  // ramped to 0 via _applyMusicLevel; real-file element → hard-muted + faded to 0.
  setMusicMuted(m) {
    this._musicMuted = !!m
    if (this._musicFile) this._musicFile.muted = this._musicMuted
    this._applyMusicLevel()
  }
  isMusicMuted()   { return this._musicMuted }

  // Back-compat combined controls (no external callers, kept for API stability).
  mute()   { this.setSfxMuted(true);  this.setMusicMuted(true) }
  unmute() { this.setSfxMuted(false); this.setMusicMuted(false) }

  // ── SETTINGS SNAPSHOT (for the save-file schema) ──────────────
  // Reads the CURRENT audio settings into the exact `settings` shape persisted in
  // game_player_data.json. menuPlaylistOrder is a copy of the live MENU_PLAYLIST so
  // the saved sequence reflects the player's reorders. All fields already exist —
  // this just gathers them; it does NOT introduce new audio state.
  getSettings() {
    return {
      sfxVolume:         this._sfxVol,
      musicVolume:       this._musicVol,
      sfxMuted:          this._sfxMuted,
      musicMuted:        this._musicMuted,
      menuPlaylistOrder: MENU_PLAYLIST.slice()
    }
  }

  // Applies a loaded `settings` blob back onto the live audio state (used on save-file
  // load so a restored save fully overrides the constructor defaults). Tolerant of
  // missing/partial data — any absent field keeps its current value.
  applySettings(s) {
    if (!s || typeof s !== "object") return
    const sfx = (typeof s.sfxVolume   === "number") ? s.sfxVolume   : this._sfxVol
    const mus = (typeof s.musicVolume === "number") ? s.musicVolume : this._musicVol
    this.setVolume(sfx, mus)
    if (typeof s.sfxMuted   === "boolean") this.setSfxMuted(s.sfxMuted)
    if (typeof s.musicMuted === "boolean") this.setMusicMuted(s.musicMuted)
    if (Array.isArray(s.menuPlaylistOrder) && s.menuPlaylistOrder.length) {
      this.setMenuPlaylistOrder(s.menuPlaylistOrder)
    }
  }

  // ── AUDIO DUCKING ─────────────────────────────────────────────
  // Applies the current effective music level (_musicVol × _musicDuckScale) to BOTH
  // music paths, so whichever is active gets ducked/restored. Also the single place
  // setVolume routes through, so a user volume change mid-duck keeps the duck intact.
  _applyMusicLevel() {
    const level = this._musicMuted ? 0 : this._musicVol * (this._musicDuckScale || 1)
    this._musicPlayer?.setVolume(level)      // procedural: setTargetAtTime ramp (smooth) inside setVolume
    this._fadeMusicFileVolume(level)         // real-file element: short manual fade (no setTargetAtTime on HTMLAudio)
  }

  // Smoothly ramp the HTMLAudioElement music file's volume toward `target` over a
  // short window (element .volume has no AudioParam, so we step it — a fade, not a jump).
  _fadeMusicFileVolume(target) {
    const el = this._musicFile
    if (!el) return
    target = Math.max(0, Math.min(1, target))
    if (this._musicFileFade) { clearInterval(this._musicFileFade); this._musicFileFade = null }
    const start = el.volume
    const delta = target - start
    if (Math.abs(delta) < 0.01) { el.volume = target; return }
    const steps = 8, total = 160   // ~160ms fade, matching the ~0.05s music gain ramps
    let i = 0
    this._musicFileFade = setInterval(() => {
      i++
      el.volume = Math.max(0, Math.min(1, start + delta * (i / steps)))
      if (i >= steps) { clearInterval(this._musicFileFade); this._musicFileFade = null; el.volume = target }
    }, total / steps)
  }

  // Ref-counted duck. First active cue → duck; last one to finish → restore. Called by
  // playSfxFile for every file cue (voice lines / significant one-shots); NOT by play()
  // (procedural hit sounds), so routine combat SFX never duck the music.
  _duckBegin() {
    this._duckCount++
    if (this._duckCount === 1) { this._musicDuckScale = MUSIC_DUCK_FACTOR; this._applyMusicLevel() }
  }
  _duckEnd() {
    if (this._duckCount <= 0) return
    this._duckCount--
    if (this._duckCount === 0) { this._musicDuckScale = 1; this._applyMusicLevel() }
  }

  // ── PRELOAD stub — kept for API compatibility, does nothing ───
  preload(_map = {}) {}
}

// ─────────────────────────────────────────────────────────────────
// SINGLETON EXPORT
// ─────────────────────────────────────────────────────────────────
export const sound = new SoundManager()
export default sound
