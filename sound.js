// sound.js
// Web Audio API sound manager with HTMLAudioElement music fallback.
// Fails silently if files are missing — game always runs without audio.

// ─────────────────────────────────────────────────────────────────
// SOUND ID CONSTANTS — import these anywhere in the codebase
// ─────────────────────────────────────────────────────────────────
export const SFX = {
  // Attacks
  HIT_LIGHT:       "hit_light",
  HIT_HEAVY:       "hit_heavy",
  HIT_SPECIAL:     "hit_special",
  HIT_PROJECTILE:  "hit_projectile",
  HIT_ULTIMATE:    "hit_ultimate",
  BLOCK:           "block",
  WHIFF:           "whiff",

  // Voice — ultimates
  VO_GOKU:         "vo_goku_ultimate",
  VO_NARUTO:       "vo_naruto_ultimate",
  VO_GOJO:         "vo_gojo_ultimate",
  VO_MEGUMI:       "vo_megumi_ultimate",
  VO_SUKUNA:       "vo_sukuna_ultimate",
  VO_OMOLOLU:      "vo_omololu_ultimate",
  VO_TOJI:         "vo_toji_ultimate",

  // UI
  UI_HOVER:        "ui_hover",
  UI_SELECT:       "ui_select",
  UI_BACK:         "ui_back",
  UI_MATCH_START:  "ui_match_start",

  // Combat events
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
// DEFAULT FILE MAP
// Paths are relative to index.html. All files optional —
// sound.preload() just silently skips missing files.
// ─────────────────────────────────────────────────────────────────
const DEFAULT_SOUND_MAP = {
  // SFX
  hit_light:       "./sounds/hit_light.wav",
  hit_heavy:       "./sounds/hit_heavy.wav",
  hit_special:     "./sounds/hit_special.wav",
  hit_projectile:  "./sounds/hit_projectile.wav",
  hit_ultimate:    "./sounds/hit_ultimate.wav",
  block:           "./sounds/block.wav",
  whiff:           "./sounds/whiff.wav",
  ko:              "./sounds/ko.wav",
  combo_hit_1:     "./sounds/combo_1.wav",
  combo_hit_2:     "./sounds/combo_2.wav",
  combo_hit_3:     "./sounds/combo_3.wav",
  combo_hit_4:     "./sounds/combo_4.wav",
  combo_hit_5:     "./sounds/combo_5.wav",
  counter_hit:     "./sounds/counter_hit.wav",
  domain_activate: "./sounds/domain_activate.wav",
  transformation:  "./sounds/transformation.wav",
  ui_hover:        "./sounds/ui_hover.wav",
  ui_select:       "./sounds/ui_select.wav",
  ui_back:         "./sounds/ui_back.wav",
  ui_match_start:  "./sounds/ui_match_start.wav",

  // Voice
  vo_goku_ultimate:    "./sounds/vo_goku.wav",
  vo_naruto_ultimate:  "./sounds/vo_naruto.wav",
  vo_gojo_ultimate:    "./sounds/vo_gojo.wav",
  vo_megumi_ultimate:  "./sounds/vo_megumi.wav",
  vo_sukuna_ultimate:  "./sounds/vo_sukuna.wav",
  vo_omololu_ultimate: "./sounds/vo_omololu.wav",
  vo_toji_ultimate:    "./sounds/vo_toji.wav",

  // Music
  music_menu:          "./music/menu.mp3",
  music_jujutsu_high:  "./music/jujutsu_high.mp3",
  music_shibuya:       "./music/shibuya.mp3",
  music_namek:         "./music/namek.mp3",
  music_tournament:    "./music/tournament.mp3",
  music_hidden_leaf:   "./music/hidden_leaf.mp3",
  music_shadow_garden: "./music/shadow_garden.mp3",
  domain_loop:         "./music/domain_loop.mp3",
}

// ─────────────────────────────────────────────────────────────────
// PROCEDURAL FALLBACK SOUNDS
// If no audio files are present, generate tones via Web Audio API
// so there is SOME feedback even without assets.
// ─────────────────────────────────────────────────────────────────
const PROCEDURAL_SOUNDS = {
  hit_light:       { type: "sine",   freq: 320, duration: 0.06, gain: 0.4 },
  hit_heavy:       { type: "square", freq: 120, duration: 0.14, gain: 0.5 },
  hit_special:     { type: "sine",   freq: 480, duration: 0.18, gain: 0.45 },
  hit_projectile:  { type: "sine",   freq: 560, duration: 0.10, gain: 0.38 },
  hit_ultimate:    { type: "square", freq: 80,  duration: 0.35, gain: 0.6 },
  block:           { type: "sine",   freq: 700, duration: 0.05, gain: 0.3 },
  whiff:           { type: "sine",   freq: 200, duration: 0.08, gain: 0.15 },
  ko:              { type: "square", freq: 60,  duration: 0.55, gain: 0.7 },
  combo_hit_1:     { type: "sine",   freq: 340, duration: 0.07, gain: 0.35 },
  combo_hit_2:     { type: "sine",   freq: 380, duration: 0.07, gain: 0.38 },
  combo_hit_3:     { type: "sine",   freq: 420, duration: 0.08, gain: 0.40 },
  combo_hit_4:     { type: "sine",   freq: 460, duration: 0.09, gain: 0.43 },
  combo_hit_5:     { type: "sine",   freq: 520, duration: 0.10, gain: 0.46 },
  counter_hit:     { type: "sine",   freq: 640, duration: 0.12, gain: 0.5 },
  domain_activate: { type: "square", freq: 55,  duration: 0.80, gain: 0.65 },
  transformation:  { type: "sine",   freq: 660, duration: 0.40, gain: 0.55 },
  ui_hover:        { type: "sine",   freq: 900, duration: 0.03, gain: 0.12 },
  ui_select:       { type: "sine",   freq: 1100,duration: 0.06, gain: 0.22 },
  ui_back:         { type: "sine",   freq: 500, duration: 0.05, gain: 0.18 },
  ui_match_start:  { type: "square", freq: 220, duration: 0.30, gain: 0.50 },
}

// ─────────────────────────────────────────────────────────────────
// SOUND MANAGER
// ─────────────────────────────────────────────────────────────────
class SoundManager {
  constructor() {
    this._ctx         = null      // AudioContext
    this._buffers     = {}        // id → AudioBuffer
    this._paths       = {}        // id → file path
    this._music       = null      // HTMLAudioElement for current music
    this._musicId     = null
    this._sfxVol      = 0.8
    this._musicVol    = 0.55
    this._muted       = false
    this._ready       = false
    this._gainNode    = null      // master sfx gain
  }

  // ── INIT ────────────────────────────────────────────────────────
  init() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      this._ctx      = new AC()
      this._gainNode = this._ctx.createGain()
      this._gainNode.gain.value = this._sfxVol
      this._gainNode.connect(this._ctx.destination)
      this._ready    = true
    } catch (_) { /* Web Audio not available */ }

    // Preload default map (silent on missing files)
    this.preload(DEFAULT_SOUND_MAP)

    // Resume on first user interaction (browser autoplay policy)
    const resume = () => {
      if (this._ctx?.state === "suspended") this._ctx.resume()
      document.removeEventListener("keydown", resume)
      document.removeEventListener("mousedown", resume)
    }
    document.addEventListener("keydown",  resume, { once: true })
    document.addEventListener("mousedown", resume, { once: true })
  }

  // ── PRELOAD ─────────────────────────────────────────────────────
  preload(soundMap = {}) {
    this._paths = { ...this._paths, ...soundMap }
    if (!this._ctx) return

    for (const [id, path] of Object.entries(soundMap)) {
      // Skip music — streamed via HTMLAudioElement
      if (id.startsWith("music_") || id === "domain_loop") continue
      this._loadBuffer(id, path)
    }
  }

  _loadBuffer(id, path) {
    if (!this._ctx) return
    fetch(path)
      .then(r => {
        if (!r.ok) throw new Error(`404: ${path}`)
        return r.arrayBuffer()
      })
      .then(ab => this._ctx.decodeAudioData(ab))
      .then(buf => { this._buffers[id] = buf })
      .catch(() => { /* File missing — use procedural fallback */ })
  }

  // ── PLAY SFX ────────────────────────────────────────────────────
  play(id) {
    if (this._muted) return
    if (!this._ctx)  return

    // Resume if suspended (Chrome autoplay)
    if (this._ctx.state === "suspended") {
      this._ctx.resume().then(() => this._playId(id))
      return
    }
    this._playId(id)
  }

  _playId(id) {
    if (this._buffers[id]) {
      this._playBuffer(id)
    } else {
      this._playProcedural(id)
    }
  }

  _playBuffer(id) {
    try {
      const src = this._ctx.createBufferSource()
      src.buffer = this._buffers[id]
      src.connect(this._gainNode)
      src.start(0)
    } catch (_) {}
  }

  _playProcedural(id) {
    const def = PROCEDURAL_SOUNDS[id]
    if (!def || !this._ctx) return
    try {
      const osc  = this._ctx.createOscillator()
      const gain = this._ctx.createGain()
      osc.type      = def.type
      osc.frequency.setValueAtTime(def.freq, this._ctx.currentTime)

      // Quick attack, exponential decay
      gain.gain.setValueAtTime(def.gain * this._sfxVol, this._ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, this._ctx.currentTime + def.duration)

      osc.connect(gain)
      gain.connect(this._ctx.destination)
      osc.start(this._ctx.currentTime)
      osc.stop(this._ctx.currentTime + def.duration)
    } catch (_) {}
  }

  // ── COMBO HELPER ────────────────────────────────────────────────
  playCombo(comboCount = 1) {
    const idx = Math.min(comboCount, 5)
    this.play(`combo_hit_${idx}`)
  }

  // ── MUSIC ───────────────────────────────────────────────────────
  playMusic(id, loop = true) {
    if (this._musicId === id && this._music && !this._music.paused) return

    this.stopMusic()

    const path = this._paths[id]
    if (!path) return

    try {
      const el    = new Audio()
      el.src      = path
      el.loop     = loop
      el.volume   = this._muted ? 0 : this._musicVol
      el.play().catch(() => {})  // silent if autoplay blocked
      this._music  = el
      this._musicId = id
    } catch (_) {}
  }

  stopMusic(fadeDuration = 0.8) {
    if (!this._music) return
    const el = this._music
    this._music  = null
    this._musicId = null

    // Fade out
    if (!el.paused) {
      const startVol = el.volume
      const step     = startVol / (fadeDuration * 30)
      const fade     = setInterval(() => {
        el.volume = Math.max(0, el.volume - step)
        if (el.volume <= 0) {
          clearInterval(fade)
          el.pause()
        }
      }, 1000 / 30)
    } else {
      el.pause()
    }
  }

  // ── VOLUME / MUTE ───────────────────────────────────────────────
  setVolume(sfxVol = 0.8, musicVol = 0.55) {
    this._sfxVol   = Math.max(0, Math.min(1, sfxVol))
    this._musicVol = Math.max(0, Math.min(1, musicVol))
    if (this._gainNode) {
      this._gainNode.gain.setTargetAtTime(
        this._muted ? 0 : this._sfxVol,
        this._ctx.currentTime, 0.05
      )
    }
    if (this._music && !this._muted) {
      this._music.volume = this._musicVol
    }
  }

  mute() {
    this._muted = true
    if (this._gainNode) this._gainNode.gain.setTargetAtTime(0, this._ctx.currentTime, 0.05)
    if (this._music)    this._music.volume = 0
  }

  unmute() {
    this._muted = false
    if (this._gainNode) this._gainNode.gain.setTargetAtTime(this._sfxVol, this._ctx.currentTime, 0.05)
    if (this._music)    this._music.volume = this._musicVol
  }

  // ── STAGE MUSIC HELPER ──────────────────────────────────────────
  // Maps stage names from game.js stages array to music IDs
  playStageMusic(stageName = "") {
    const name = stageName.toLowerCase().replace(/\s+/g, "_")
    const map  = {
      jujutsu_high_courtyard: MUSIC.JUJUTSU_HIGH,
      shibuya_incident:       MUSIC.SHIBUYA,
      planet_namek:           MUSIC.NAMEK,
      world_tournament_arena: MUSIC.TOURNAMENT,
      hidden_leaf_village:    MUSIC.HIDDEN_LEAF,
      shadow_garden:          MUSIC.SHADOW_GARDEN,
    }
    const id = map[name] || MUSIC.MENU
    this.playMusic(id, true)
  }
}

// ─────────────────────────────────────────────────────────────────
// SINGLETON EXPORT
// ─────────────────────────────────────────────────────────────────
export const sound = new SoundManager()
export default sound
