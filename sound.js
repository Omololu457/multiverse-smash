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
// Per-character voice-clip directory map (voice/<char>/…). Migrated out of the flat
// root; _resolveSrc() consults this first, falling back to AUDIO_BASE for anything
// not listed (music, SFX, inline-only voiced chars). See voiceFileManifest.js.
import { VOICE_FILES } from "./voiceFileManifest.js"

// Music for EVERY non-stadium context — loading/menu, character select, win
// screen, etc. Only actual fight stages override this (via playStageTrack).
// NOTE: exact on-disk filename — the file is literally "Passion_fruitmp3.mp3".
export const MENU_MUSIC_FILE = "Passion_fruitmp3.mp3"

// Generic/SHARED transformation cue for ANY Dragon Ball character's transformation
// (Goku Black → SSJ Rose, Goku → SSJ Blue, …). Routes through the PROCEDURAL `transformation`
// generator (below, ~line 254) — the mp3 override this once pointed at
// ("dragon_ball_transformation.mp3") was never added to the repo, so referencing it only
// produced a hard 404 with no fallback (caught by the zaraki no-404/no-console-error checks).
// The procedural cue is the real intended sound; callers use playDragonBallTransformSfx().

// ITEM 3 (2026-09-06, playtest): per-character VOICE volume multipliers, applied to file-based cues in
// playSfxFile by basename prefix. Naruto's voice was too loud → dropped to a near-floor 0.12 (audible, not
// silenced). Keyed by the filename prefix each character's clips share (Naruto's are all "naruto_*"/"Naruto_*").
// Add more entries here to quiet/boost another character's voice without touching any call site.
export const VOICE_VOLUME_MULT = { naruto: 0.12 }

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
// JUICE SFX PACK (presentation-only "juice" pass)
// ─────────────────────────────────────────────────────────────────
// Real sampled clips (the multiverse_sfx pack, copied into ./sfx/). These are
// DECODED into AudioBuffers once at init through the existing AudioContext and
// played via playJuiceSfx(). All clips are normalized to -16 LUFS on disk, so
// loudness differences come entirely from per-event `gain` at the call site —
// never from re-encoding. Playback is pure presentation and NEVER reads
// gameRng or touches the simulation.
export const JUICE_SFX_BASE = "./sfx/"

// CORE pool — preloaded. id → path under JUICE_SFX_BASE.
export const JUICE_SFX = {
  // clean_tones_whooshes
  charge_swell_riser:    "clean_tones_whooshes/charge_swell_riser.ogg",
  charge_hum_rise:       "clean_tones_whooshes/charge_hum_rise.ogg",
  sting_pitch_rise_hold: "clean_tones_whooshes/sting_pitch_rise_hold.ogg",
  swish_fast_01:         "clean_tones_whooshes/swish_fast_01.ogg",
  swish_fast_02:         "clean_tones_whooshes/swish_fast_02.ogg",
  swish_fast_03:         "clean_tones_whooshes/swish_fast_03.ogg",
  whoosh_medium_01:      "clean_tones_whooshes/whoosh_medium_01.ogg",
  whoosh_medium_02:      "clean_tones_whooshes/whoosh_medium_02.ogg",
  warp_wobble_01:        "clean_tones_whooshes/warp_wobble_01.ogg",
  warp_wobble_02:        "clean_tones_whooshes/warp_wobble_02.ogg",
  energy_hum_low:        "clean_tones_whooshes/energy_hum_low.ogg",
  energy_tone_hold:      "clean_tones_whooshes/energy_tone_hold.ogg",
  pitch_drop_slowmo:     "clean_tones_whooshes/pitch_drop_slowmo.ogg",
  // explosion_impact_design
  boom_anticipation_suck:  "explosion_impact_design/boom_anticipation_suck.ogg",
  impact_crack_01:         "explosion_impact_design/impact_crack_01.ogg",
  crack_sizzle_bright:     "explosion_impact_design/crack_sizzle_bright.ogg",
  impact_hit_01:           "explosion_impact_design/impact_hit_01.ogg",
  boom_medium_01:          "explosion_impact_design/boom_medium_01.ogg",
  boom_medium_02:          "explosion_impact_design/boom_medium_02.ogg",
  boom_huge_01:            "explosion_impact_design/boom_huge_01.ogg",
  boom_huge_02_roar:       "explosion_impact_design/boom_huge_02_roar.ogg",
  impact_frame_boom_long:  "explosion_impact_design/impact_frame_boom_long.ogg",
  rumble_tail_01:          "explosion_impact_design/rumble_tail_01.ogg",
  // hits
  hit_flurry_01:         "hits/hit_flurry_01.ogg",
  hit_heavy_boom_01:     "hits/hit_heavy_boom_01.ogg",
}

// ── SPARKING ZERO hit-sound pack (37 clips) ──────────────────────────────────
// Decoded through the SAME audio loader as the core pack (just under a different
// base) and PRELOADED alongside it at init (see loadJuicePack). id → path under
// SPARKING_SFX_BASE. Clips are NEVER re-encoded; every clip is -16 LUFS on disk so
// loudness differences come entirely from the per-event `gain` at the call site
// (see sfx_map.js). Selected per-player via the Hit Sounds setting; mapped onto the
// HIT FEEL tiers in game.js. Audio-only — never reads gameRng, never touches the sim.
export const SPARKING_SFX_BASE = "./sparking_zero_sfx/"
export const SPARKING_SFX = Object.freeze((() => {
  const out = {}
  const add = (folder, prefix, n) => { for (let i = 1; i <= n; i++) { const id = `${prefix}_${String(i).padStart(2, "0")}`; out[id] = `${folder}/${id}.ogg` } }
  add("click",         "sz_click",         6)
  add("hit_short",     "sz_hit_short",     7)
  add("hit_long_tail", "sz_hit_long_tail", 14)
  add("flurry",        "sz_flurry",        7)
  add("barrage",       "sz_barrage",       3)
  return out
})())

// OPTIONAL "naruto_extra" pool — 28 clips that carry ANIME BACKGROUND MUSIC
// (manifest background_music:true, confidence "category-guess"). OFF by default:
// never decoded or referenced in the default event mapping. setJuiceNarutoExtra(true)
// lazily decodes + enables them for players who want the extra flavour.
export const JUICE_SFX_NARUTO_EXTRA = Object.freeze(
  Object.fromEntries(Array.from({ length: 28 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0")
    const tag = ["impact","mixed","rumble_low","whoosh_noise","whoosh_noise","whoosh_noise","mixed","mixed",
                 "whoosh_noise","impact","tonal","mixed","tonal","rumble_low","impact","impact","tonal","tonal",
                 "mixed","rumble_low","rumble_low","mixed","mixed","whoosh_noise","mixed","mixed","mixed","mixed"][i]
    const id = `naruto_${n}_${tag}`
    return [id, `naruto_clips_bgm/${id}.ogg`]
  }))
)

// STANDIN sounds — GAPS in the pack (no real clip exists): dash_skid, dash_dust_kick,
// dash_windup_cloth. Each is synthesized at PLAY TIME with WebAudio from an existing
// clip (playbackRate + filter + slice), so a real file can be dropped in later: if a
// buffer is ever registered under the *_STANDIN id, playJuiceSfx() uses it directly and
// skips the synth path. `src` is a CORE clip id; `offset`/`duration` (optional) slice it.
export const JUICE_STANDINS = {
  dash_windup_cloth_STANDIN: { src: "swish_fast_02", rate: 0.9, filter: { type: "lowpass",  freq: 900  }, offset: 0, duration: 0.14, gain: 0.8 },
  dash_skid_STANDIN:         { src: "swish_fast_01", rate: 0.6, filter: { type: "lowpass",  freq: 700  },                          gain: 1.0 },
  dash_dust_kick_STANDIN:    { src: "swish_fast_03", rate: 1.0, filter: { type: "highpass", freq: 2500 }, offset: 0, duration: 0.06, gain: 0.7 },
  // HIT FEEL Phase D — element-sound gaps (no real clips): synthesized from existing pack clips. Swap in
  // real files later by registering a buffer under the same *_STANDIN id.
  zap_crackle_STANDIN:        { src: "crack_sizzle_bright", rate: 1.35, filter: { type: "highpass", freq: 1800 }, offset: 0, duration: 0.25, gain: 0.7 },
  fire_ignite_whoosh_STANDIN: { src: "whoosh_medium_01",    rate: 0.82, filter: { type: "lowpass",  freq: 1400 }, offset: 0, duration: 0.40, gain: 0.7 },
  whack_STANDIN:              { src: "impact_hit_01",       rate: 0.9,  filter: { type: "lowpass",  freq: 2200 },                           gain: 0.8 },
  balloon_pop_STANDIN:        { src: "impact_crack_01",     rate: 1.5,  filter: { type: "highpass", freq: 2600 }, offset: 0, duration: 0.09, gain: 0.6 },
}

export const JUICE_VOICE_CAP = 12                 // max simultaneous juice SFX (audio voice cap)
export const JUICE_DUCK_GAIN = Math.pow(10, -4 / 20)   // ≈0.631 — duck other juice SFX ~4 dB under an ultimate boom

// ── DETERMINISTIC, LAN-SAFE AUDIO VARIATION ──────────────────────────────────
// Pick a clip variant / pitch jitter from the sim FRAME and player index — NEVER
// gameRng and NEVER Math.random (so audio can't desync a match and both peers vary
// identically). Audio reads these; it never writes to them.
export function juiceHash(frame, player) {
  let h = (Math.imul(((frame | 0) ^ 0x9e3779b9) >>> 0, 2654435761) ^ Math.imul(((player | 0) + 1) >>> 0, 40503)) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13
  return h >>> 0
}
export function juicePickVariant(ids, frame, player) {
  if (!ids || !ids.length) return null
  return ids[juiceHash(frame, player) % ids.length]
}
export function juicePitch(frame, player, spread = 0.04) {
  const unit = (juiceHash((frame | 0) ^ 0x55, player) % 1000) / 999   // 0..1
  return 1 + (unit * 2 - 1) * spread                                  // 1 ± spread (default ±4%)
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

// SOLDIER BOY (Phase 7) — DETERMINISTIC filtered noise: the sample buffer is filled from a seeded LCG
// (NOT Math.random), so the SFX is identical for a given hash seed. Mirrors noise() otherwise.
function sbSeededNoise(ctx, gain, duration, gainVal, filterFreq, seed) {
  const bufSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < bufSize; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0          // LCG — deterministic, no Math.random
    data[i] = (s / 4294967296) * 2 - 1
  }
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = buf; filter.type = "bandpass"; filter.frequency.value = filterFreq; filter.Q.value = 1.2
  g.gain.setValueAtTime(gainVal, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  src.connect(filter); filter.connect(g); g.connect(gain)
  src.start(ctx.currentTime); src.stop(ctx.currentTime + duration)
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
const INTENSITY_CROSSFADE_MS = 1200   // low-HP / final-round music crossfade window (smooth, no hard cut)

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
    // ── DYNAMIC MUSIC INTENSITY (low-HP / final-round) ───────────────────────────
    // A second music layer that crossfades in over the base stage track when a match
    // gets tense, then back out. Both play at once during the blend (the base keeps
    // looping at volume 0 while intense, so reverting is seamless). _baseMix/_intenseMix
    // are the crossfade mix (each layer's volume = effective music level × its mix);
    // _mixFade drives the blend; _intenseFileFade is the intense element's duck/volume
    // follower (mirrors _musicFileFade for the base element). Honors mute/duck/volume.
    this._intenseFile     = null   // HTMLAudioElement for the intense layer
    this._intenseFileSrc  = null
    this._intenseFileFade = null
    this._musicIntense    = false
    this._baseMix         = 1
    this._intenseMix      = 0
    this._mixFade         = null
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
    // ── JUICE SFX PACK (sampled .ogg explosion/dash clips) ───────────────────────
    // Decoded AudioBuffers (id → AudioBuffer), a dedicated bus gain feeding _master
    // (so they follow SFX volume + mute and can be ducked as a group under an
    // ult boom), the live-voice registry for the ~12-voice cap, and the optional
    // naruto_extra pool flag (OFF → its clips are never decoded).
    this._juiceBuffers      = new Map()
    this._juiceBus          = null
    this._juiceActive       = []      // [{ src, end }] live voices (pruned on play)
    this._juiceLoaded       = false
    this._juiceNarutoEnabled = false
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
      // JUICE bus: all sampled juice SFX route through here into _master, so they
      // inherit SFX volume/mute AND can be ducked as a group under an ult boom.
      this._juiceBus = this._ctx.createGain()
      this._juiceBus.gain.value = 1
      this._juiceBus.connect(this._master)
      this._ready  = true
      // Preload (decode) the core pack now. decodeAudioData works on a suspended
      // context, so buffers are ready before the first gesture unlocks playback.
      this.loadJuicePack()
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

  // ── SOLDIER BOY SFX (Phase 7, placeholder WebAudio synth) ─────
  // id + a hash-derived pitch (+/-3%) + noise seed are supplied by abilities.sbSound (deterministic — no
  // Math.random). Each move maps to the brief's waveform recipe; noise comes from the seeded sbSeededNoise.
  playSoldierBoy(id, pitch = 1, seed = 1) {
    if (this._sfxMuted || !this._ctx || !this._ready) return
    if (this._ctx.state === "suspended") { this._ctx.resume().then(() => this._sbSynth(id, pitch, seed)); return }
    this._sbSynth(id, pitch, seed)
  }
  _sbSynth(id, pitch, seed) {
    const ctx = this._ctx, out = this._master, p = pitch || 1
    try {
      switch (id) {
        case "sb_shield":      osc(ctx, out, "triangle", 880 * p, 0.25, 0.22, 440 * p); break                 // 880->440, 0.25s
        case "sb_smg":         for (let i = 0; i < 4; i++) oscAt(ctx, out, "square", 140 * p, i * 0.05, 0.04, 0.18); sbSeededNoise(ctx, out, 0.18, 0.08, 1800 * p, seed); break
        case "sb_rifle":       osc(ctx, out, "sawtooth", 90 * p, 0.12, 0.3); sbSeededNoise(ctx, out, 0.2, 0.18, 2200 * p, seed); break
        case "sb_goldRush":    osc(ctx, out, "sawtooth", 200 * p, 0.3, 0.2, 900 * p); break                    // 200->900 sweep
        case "sb_cyclone":     this._sbWhoosh(0.5, p); break                                                    // sine + 6Hz LFO
        case "sb_dive":        osc(ctx, out, "triangle", 600 * p, 0.3, 0.22, 150 * p); break                   // 600->150
        case "sb_armedToggle": osc(ctx, out, "square", 330 * p, 0.08, 0.16, 660 * p); break                    // 330->660 click
        case "sb_chargeFull":  osc(ctx, out, "sine", 1320 * p, 0.08, 0.2); break                                // 1320 ping
        case "sb_nuke":        this._sbNuke(p, seed); break
      }
    } catch (_) {}
  }
  _sbWhoosh(dur, p) {
    const ctx = this._ctx, out = this._master
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain()
    o.type = "sine"; o.frequency.value = 220 * p
    lfo.type = "sine"; lfo.frequency.value = 6; lg.gain.value = 40 * p    // 6 Hz LFO whoosh
    lfo.connect(lg); lg.connect(o.frequency)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g); g.connect(out)
    o.start(); lfo.start(); o.stop(ctx.currentTime + dur); lfo.stop(ctx.currentTime + dur)
  }
  _sbNuke(p, seed) {
    const ctx = this._ctx, out = this._master, t0 = ctx.currentTime, build = 1.2, total = 2.0   // 1.2s build + 0.8s decay
    const filt = ctx.createBiquadFilter(); filt.type = "lowpass"
    filt.frequency.setValueAtTime(200, t0); filt.frequency.linearRampToValueAtTime(4000, t0 + build); filt.frequency.linearRampToValueAtTime(300, t0 + total)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.3, t0 + build); g.gain.exponentialRampToValueAtTime(0.0001, t0 + total)
    const saw = ctx.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = 55 * p   // sawtooth 55
    const sq  = ctx.createOscillator(); sq.type = "square"; sq.frequency.value = 110 * p       // square 110
    saw.connect(filt); sq.connect(filt); filt.connect(g); g.connect(out)
    saw.start(t0); sq.start(t0); saw.stop(t0 + total); sq.stop(t0 + total)
    sbSeededNoise(ctx, out, total, 0.12, 1200 * p, seed)
  }


  // ── BEN 10 OMNITRIX SFX (Phase 7, placeholder WebAudio synth) ─────
  // id + a hash-derived pitch (±3%) + noise seed are supplied by game.ben10Sfx (deterministic — no
  // Math.random). Each event maps to the brief's exact waveform recipe. Structured per-character (its own
  // id namespace) so a later Ben/alien VOICE pack can plug in without touching the trigger sites.
  playBen10(id, pitch = 1, seed = 1) {
    if (this._sfxMuted || !this._ctx || !this._ready) return
    if (this._ctx.state === "suspended") { this._ctx.resume().then(() => this._ben10Synth(id, pitch, seed)); return }
    this._ben10Synth(id, pitch, seed)
  }
  _ben10Synth(id, pitch, seed) {
    const ctx = this._ctx, out = this._master, p = pitch || 1
    try {
      switch (id) {
        case "ben_transform":  osc(ctx, out, "sine", 220 * p, 0.35, 0.2, 880 * p); oscAt(ctx, out, "triangle", 1760 * p, 0, 0.08, 0.18); break   // 220→880 sweep + 1760 ping
        case "ben_swap":       osc(ctx, out, "square", 440 * p, 0.08, 0.18, 660 * p); break                                                      // 440→660 click
        case "ben_revert":     osc(ctx, out, "sine", 880 * p, 0.3, 0.2, 220 * p); break                                                          // 880→220
        case "ben_timeout":    this._benTimeout(p); break                                                                                        // sawtooth 110, falling lowpass
        case "ben_vowpick":    this._benLfoTone(330, 12, 0.25, p); break                                                                         // square 330 + 12 Hz LFO
        case "ben_energyshot": osc(ctx, out, "triangle", 700 * p, 0.2, 0.18, 350 * p); break                                                     // 700→350
        case "ben_dash":       osc(ctx, out, "sawtooth", 300 * p, 0.2, 0.18, 900 * p); break                                                     // 300→900
        case "ben_shockwave":  osc(ctx, out, "sine", 90 * p, 0.3, 0.22); sbSeededNoise(ctx, out, 0.3, 0.12, 400 * p, seed); break                // sine 90 + noise
        case "ben_overload":   this._benOverload(p, seed); break                                                                                 // saw 60 + sq 120, rising lowpass
      }
    } catch (_) {}
  }
  _benTimeout(p) {
    const ctx = this._ctx, out = this._master, t0 = ctx.currentTime, dur = 0.4
    const filt = ctx.createBiquadFilter(); filt.type = "lowpass"
    filt.frequency.setValueAtTime(1800 * p, t0); filt.frequency.linearRampToValueAtTime(200 * p, t0 + dur)   // falling lowpass
    const g = ctx.createGain(); g.gain.setValueAtTime(0.22, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 110 * p
    o.connect(filt); filt.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur)
  }
  _benLfoTone(freq, lfoHz, dur, p) {
    const ctx = this._ctx, out = this._master
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain()
    o.type = "square"; o.frequency.value = freq * p
    lfo.type = "sine"; lfo.frequency.value = lfoHz; lg.gain.value = 30 * p
    lfo.connect(lg); lg.connect(o.frequency)
    g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g); g.connect(out); o.start(); lfo.start(); o.stop(ctx.currentTime + dur); lfo.stop(ctx.currentTime + dur)
  }
  _benOverload(p, seed) {
    const ctx = this._ctx, out = this._master, t0 = ctx.currentTime, build = 1.0, total = 1.7   // 1.0s rise + 0.7s decay
    const filt = ctx.createBiquadFilter(); filt.type = "lowpass"
    filt.frequency.setValueAtTime(150, t0); filt.frequency.linearRampToValueAtTime(5000, t0 + build); filt.frequency.linearRampToValueAtTime(400, t0 + total)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.3, t0 + build); g.gain.exponentialRampToValueAtTime(0.0001, t0 + total)
    const saw = ctx.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = 60 * p
    const sq  = ctx.createOscillator(); sq.type = "square"; sq.frequency.value = 120 * p
    saw.connect(filt); sq.connect(filt); filt.connect(g); g.connect(out)
    saw.start(t0); sq.start(t0); saw.stop(t0 + total); sq.stop(t0 + total)
    sbSeededNoise(ctx, out, total, 0.1, 1000 * p, seed)
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
    // Voice clips migrated to voice/<char>/ — check the manifest by BARE name FIRST,
    // tolerating a leading "./" that some modules prepend (e.g. borutoVoice). This must
    // run before the pass-through below, or a "./name.mp3" voice ref would 404 at root.
    const voiced = VOICE_FILES[filename] || VOICE_FILES[filename.replace(/^\.\//, "")]
    if (voiced) return voiced
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
      if (this._musicFileSrc !== src) {
        a.src = src; this._musicFileSrc = src
        // A genuinely NEW base track → drop any leftover intensity blend so the new
        // song starts calm (a new stage/match never inherits a stale intense layer).
        if (this._musicIntense || this._intenseFile) {
          if (this._mixFade) { clearInterval(this._mixFade); this._mixFade = null }
          this._musicIntense = false
          this._teardownIntenseLayer()
        }
      }
      a.loop   = !!loop
      a.muted  = this._musicMuted
      // Respect the crossfade mix (_baseMix is 1 unless an intensity blend is live), so
      // replaying the SAME base track mid-blend doesn't blast it back to full volume.
      a.volume = this._musicVol * (this._musicDuckScale || 1) * (this._baseMix ?? 1)   // start ducked if a cue is mid-play
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
    // Fully drop any active intensity blend so the next track starts calm.
    if (this._mixFade) { clearInterval(this._mixFade); this._mixFade = null }
    this._musicIntense = false
    this._teardownIntenseLayer()
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
      if (owner) this.stopOwnedSfx(owner, opts.fadeMs)   // opts.fadeMs → crossfade the outgoing owned cue (Homelander: 40ms); default = hard cut (unchanged)
      const a = new Audio(src)        // fresh element: fire-and-forget one-shot
      a.volume = this._sfxVol
      // ITEM 3 (2026-09-06): per-character voice volume. Scale HIS cues by the VOICE_VOLUME_MULT prefix map
      // (Naruto → 0.12) so a too-loud voice is quieted at the single choke point (no edits to the scattered
      // inline playSfxFile calls). opts.volumeMult (if given) stacks on top for one-off overrides.
      const _base = String(filename).split("/").pop().toLowerCase()
      const _pfx  = _base.split(/[_.]/)[0]
      if (VOICE_VOLUME_MULT[_pfx] != null) a.volume *= VOICE_VOLUME_MULT[_pfx]
      if (typeof opts.volumeMult === "number") a.volume *= opts.volumeMult
      a.volume = Math.max(0, Math.min(1, a.volume))
      if (typeof opts.rate === "number") a.playbackRate = Math.max(0.5, Math.min(2, opts.rate))   // ±pitch jitter (deterministic, caller-supplied)
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
  // fadeMs > 0: ramp the element's volume to 0 over fadeMs first (a soft cut so a new voice line
  // doesn't click over the old one), THEN pause + release. Default (0/undefined) = the hard cut.
  _killSfxEntry(entry, fadeMs = 0) {
    if (entry._fading) return
    const a = entry.audio
    if (fadeMs > 0 && a) {
      entry._fading = true
      this._activeSfx.delete(entry)                 // de-list now so a later stop won't re-process it
      const v0 = a.volume, steps = 5
      let i = 0
      const fin = () => { try { a.pause(); a.currentTime = 0 } catch (_) {} if (entry.release) entry.release() }
      const t = setInterval(() => {
        i++; try { a.volume = Math.max(0, v0 * (1 - i / steps)) } catch (_) {}
        if (i >= steps) { clearInterval(t); fin() }
      }, Math.max(4, fadeMs / steps))
      return
    }
    try { a.pause(); a.currentTime = 0 } catch (_) {}
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
  stopOwnedSfx(owner, fadeMs = 0) {
    if (!owner) return
    for (const entry of [...this._activeSfx]) {
      if (entry.owner === owner && !entry.persistent) this._killSfxEntry(entry, fadeMs)
    }
  }

  // SHARED Dragon Ball transformation cue. Any DB character's transformation code calls this
  // instead of hardcoding the filename inline — Goku Black's SSJ Rose cinematic and Goku's SSJ Blue
  // ultimate both route through here, so the sound is defined in exactly one place and reused.
  // No fallback id (faithful to the extracted inline call): callers that also want the procedural
  // power-up boom layer it separately (as the Rose cinematic does).
  playDragonBallTransformSfx() {
    return this.play(SFX.TRANSFORMATION)   // procedural cue (no missing-file 404; see DRAGON_BALL_TRANSFORM_SFX note above)
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
    if (this._intenseFile) this._intenseFile.muted = this._musicMuted
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
    this._musicPlayer?.setVolume(level)                                    // procedural: setTargetAtTime ramp (smooth) inside setVolume
    // Real-file layers get level × their crossfade mix, so a duck/volume/mute change
    // keeps the base↔intense blend intact (base at 0 while intense, and vice-versa).
    this._fadeMusicFileVolume(level * this._baseMix, this._musicFile, "_musicFileFade")
    if (this._intenseFile) this._fadeMusicFileVolume(level * this._intenseMix, this._intenseFile, "_intenseFileFade")
  }

  // Smoothly ramp an HTMLAudioElement music file's volume toward `target` over a short
  // window (element .volume has no AudioParam, so we step it — a fade, not a jump).
  // Defaults to the base music element; the intensity layer passes its own element +
  // interval-handle key so the two fades never clobber each other.
  _fadeMusicFileVolume(target, el = this._musicFile, handleKey = "_musicFileFade") {
    if (!el) return
    target = Math.max(0, Math.min(1, target))
    if (this[handleKey]) { clearInterval(this[handleKey]); this[handleKey] = null }
    const start = el.volume
    const delta = target - start
    if (Math.abs(delta) < 0.01) { el.volume = target; return }
    const steps = 8, total = 160   // ~160ms fade, matching the ~0.05s music gain ramps
    let i = 0
    this[handleKey] = setInterval(() => {
      i++
      el.volume = Math.max(0, Math.min(1, start + delta * (i / steps)))
      if (i >= steps) { clearInterval(this[handleKey]); this[handleKey] = null; el.volume = target }
    }, total / steps)
  }

  // ── DYNAMIC MUSIC INTENSITY (low-HP / final-round crossfade) ─────────────────
  // Crossfade the base stage track to/from a higher-energy "intense" track with NO
  // hard cut: both layers play at once during the blend and the base keeps looping
  // underneath (at volume 0 while intense) so reverting is seamless. Honors the same
  // mute / duck / volume as normal music (everything routes through the shared mix).
  // No-op when: not ready; already in the requested state on the same track; there's
  // no base FILE track playing (procedural stage themes are left alone); or the intense
  // pick matches the base track (nothing to blend to).
  setMusicIntensity(on, intenseFile = null, opts = {}) {
    if (!this._ready) return
    on = !!on
    const ms = opts.crossfadeMs ?? INTENSITY_CROSSFADE_MS
    if (on) {
      if (!this._musicFileSrc || !intenseFile) return           // need a real base file to blend under
      const src = this._resolveSrc(intenseFile)
      if (!src || src === this._musicFileSrc) return             // same as base → nothing to blend to
      if (this._musicIntense && this._intenseFileSrc === src) return   // already intense on this track
      this._musicIntense = true
      this._startIntenseLayer(src)
      this._crossfadeIntensity(1, ms)
    } else {
      if (!this._musicIntense && this._intenseMix === 0) return
      this._musicIntense = false
      this._crossfadeIntensity(0, ms)
    }
  }
  isMusicIntense() { return !!this._musicIntense }

  // Start (or re-arm) the intense layer element at volume 0, looping, ready to fade in.
  _startIntenseLayer(src) {
    try {
      if (!this._intenseFile) { this._intenseFile = new Audio(); this._intenseFile.preload = "auto"; this._intenseFile.loop = true }
      const a = this._intenseFile
      a.onerror = () => {
        console.warn(`[sound] intense music failed to load: ${src} — staying on the base track`)
        this._musicIntense = false
        this._teardownIntenseLayer()
        this._applyMusicLevel()   // restore base to full
      }
      if (this._intenseFileSrc !== src) { a.src = src; this._intenseFileSrc = src; try { a.currentTime = 0 } catch (_) {} }
      a.loop   = true
      a.muted  = this._musicMuted
      a.volume = 0
      const p = a.play()
      if (p && p.catch) p.catch(() => {})
    } catch (_) {}
  }

  // Ease _baseMix/_intenseMix toward the target over `ms` on a dedicated interval that
  // OWNS the mix progression (never cleared by a duck), directly writing both element
  // volumes each step. Reading _musicDuckScale/_musicMuted live means a duck mid-blend
  // is honored. Frees the intense element once fully reverted.
  _crossfadeIntensity(targetIntense, ms) {
    if (this._mixFade) { clearInterval(this._mixFade); this._mixFade = null }
    const bStart = this._baseMix, iStart = this._intenseMix
    const bEnd = 1 - targetIntense, iEnd = targetIntense
    const steps = Math.max(8, Math.round(ms / 50))
    const apply = () => {
      const level = this._musicMuted ? 0 : this._musicVol * (this._musicDuckScale || 1)
      if (this._musicFile)   this._musicFile.volume   = Math.max(0, Math.min(1, level * this._baseMix))
      if (this._intenseFile) this._intenseFile.volume = Math.max(0, Math.min(1, level * this._intenseMix))
    }
    let i = 0
    apply()
    this._mixFade = setInterval(() => {
      i++
      const t = i / steps
      this._baseMix    = bStart + (bEnd - bStart) * t
      this._intenseMix = iStart + (iEnd - iStart) * t
      apply()
      if (i >= steps) {
        clearInterval(this._mixFade); this._mixFade = null
        this._baseMix = bEnd; this._intenseMix = iEnd
        apply()
        if (iEnd === 0) this._teardownIntenseLayer()   // fully reverted → free the intense element
      }
    }, ms / steps)
  }

  // Stop + release the intense layer and snap the mix back to calm (base full, intense 0).
  _teardownIntenseLayer() {
    if (this._intenseFileFade) { clearInterval(this._intenseFileFade); this._intenseFileFade = null }
    if (this._intenseFile) { try { this._intenseFile.pause(); this._intenseFile.currentTime = 0 } catch (_) {} }
    this._intenseFileSrc = null
    this._baseMix = 1
    this._intenseMix = 0
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

  // ── JUICE SFX PACK: load / play / duck ────────────────────────
  // Decode the CORE pack into AudioBuffers through the existing AudioContext.
  // Fire-and-forget per clip: a clip that 404s or won't decode simply stays
  // absent and playJuiceSfx() no-ops for it (never throws, never blocks boot).
  loadJuicePack() {
    if (!this._ctx || this._juiceLoaded) return
    this._juiceLoaded = true
    for (const id in JUICE_SFX) this._decodeJuiceClip(id, JUICE_SFX[id])
    // SPARKING ZERO pack — preloaded alongside the core pack, under its own base.
    for (const id in SPARKING_SFX) this._decodeJuiceClip(id, SPARKING_SFX[id], SPARKING_SFX_BASE)
  }

  _decodeJuiceClip(id, rel, base = JUICE_SFX_BASE) {
    if (!this._ctx || this._juiceBuffers.has(id)) return
    const url = base + rel
    try {
      fetch(url)
        .then(r => (r && r.ok) ? r.arrayBuffer() : Promise.reject(r && r.status))
        .then(ab => this._ctx.decodeAudioData(ab))
        .then(buf => { if (buf) this._juiceBuffers.set(id, buf) })
        .catch(() => {})   // missing/undecodable → stays absent (graceful)
    } catch (_) {}
  }

  // Optional "naruto_extra" pool: OFF by default. Enabling lazily decodes its 28
  // background-music clips; they are NEVER used by the default event mapping.
  setJuiceNarutoExtra(on) {
    this._juiceNarutoEnabled = !!on
    if (this._juiceNarutoEnabled && this._ctx) {
      for (const id in JUICE_SFX_NARUTO_EXTRA) this._decodeJuiceClip(id, JUICE_SFX_NARUTO_EXTRA[id])
    }
  }
  isJuiceNarutoExtra() { return !!this._juiceNarutoEnabled }

  // Drop finished voices from the live registry (ctx time past their scheduled end).
  _pruneJuiceVoices() {
    if (!this._ctx) return
    const now = this._ctx.currentTime
    this._juiceActive = this._juiceActive.filter(v => v.end > now)
  }

  // Duck the whole juice bus ~4 dB for `dur` seconds (other juice SFX drop under an
  // ult boom), then ramp back. The boom itself bypasses the bus (plays on _master) so
  // it stays at full level. Audio-only; no sim effect.
  _juiceDuck(dur = 0.5) {
    if (!this._juiceBus || !this._ctx) return
    const now = this._ctx.currentTime
    const g = this._juiceBus.gain
    try {
      g.cancelScheduledValues(now)
      g.setValueAtTime(JUICE_DUCK_GAIN, now)
      g.linearRampToValueAtTime(1, now + Math.max(0.1, dur))
    } catch (_) {}
  }

  // Play one sampled juice clip. opts:
  //   gain   — per-event linear gain (loudness lives here, NOT in the files)
  //   pitch  — playbackRate (use juicePitch(frame,player) for ±4% deterministic jitter)
  //   ultBoom— route past the duck bus (stay full) AND duck other juice SFX ~4 dB
  //   delay  — start this many seconds from now (e.g. boom 1-2 frames after the crack)
  // Honors SFX mute + the first-gesture gate + the ~12-voice cap. Returns false if it
  // couldn't play (muted / pre-gesture / missing buffer / at cap for a non-boom).
  playJuiceSfx(id, opts = {}) {
    if (this._sfxMuted || !this._gestured || !this._ctx || !this._ready) return false
    if (this._ctx.state === "suspended") { try { this._ctx.resume() } catch (_) {} }

    // Resolve a real buffer; else a STANDIN synth descriptor over a core buffer.
    let buf = this._juiceBuffers.get(id)
    const standin = (!buf && JUICE_STANDINS[id]) ? JUICE_STANDINS[id] : null
    if (!buf && standin) buf = this._juiceBuffers.get(standin.src)
    if (!buf) return false

    // Voice cap: prune finished, then enforce ~12. A non-boom at the cap is dropped;
    // an ult boom steals the oldest voice so it always lands.
    this._pruneJuiceVoices()
    if (this._juiceActive.length >= JUICE_VOICE_CAP) {
      if (!opts.ultBoom) return false
      const victim = this._juiceActive.shift()
      try { victim && victim.src && victim.src.stop() } catch (_) {}
    }

    try {
      const now   = this._ctx.currentTime
      const when  = now + Math.max(0, opts.delay || 0)
      const src   = this._ctx.createBufferSource()
      src.buffer  = buf
      src.playbackRate.value = (typeof opts.pitch === "number" && opts.pitch > 0) ? opts.pitch : (standin ? standin.rate : 1)

      const g = this._ctx.createGain()
      let gain = (typeof opts.gain === "number") ? opts.gain : 1
      if (standin && typeof standin.gain === "number") gain *= standin.gain
      g.gain.value = Math.max(0, gain)

      // STANDIN filter (lowpass skid / highpass dust) between source and gain.
      let head = src
      if (standin && standin.filter) {
        const f = this._ctx.createBiquadFilter()
        f.type = standin.filter.type
        f.frequency.value = standin.filter.freq
        src.connect(f); head = f
      }
      head.connect(g)
      // ult boom bypasses the duck bus (full level) and ducks everything else.
      g.connect(opts.ultBoom ? this._master : (this._juiceBus || this._master))
      if (opts.ultBoom) this._juiceDuck(opts.duckSec || 0.5)

      // Slice (STANDIN offset/duration) or full clip.
      const off = standin && typeof standin.offset === "number" ? standin.offset : 0
      const dur = standin && typeof standin.duration === "number" ? standin.duration : undefined
      if (dur !== undefined) src.start(when, off, dur); else src.start(when, off)

      const endAt = when + (dur !== undefined ? dur : (buf.duration / (src.playbackRate.value || 1)))
      const entry = { src, end: endAt }
      this._juiceActive.push(entry)
      src.onended = () => { const i = this._juiceActive.indexOf(entry); if (i >= 0) this._juiceActive.splice(i, 1) }
      return true
    } catch (_) { return false }
  }

  // Play a juice clip but RETURN A HANDLE so the caller can stop it early with a fade
  // (multi-hit flurry cut short on interrupt) or crossfade into another (barrage chaining).
  // Same cap / mute / gesture rules as playJuiceSfx. opts: gain, pitch, fadeIn (sec),
  // ultBoom, duckSec. Returns { id, duration, stop(fadeSec) } or null if it couldn't play.
  // Audio-only; never reads gameRng or touches the sim.
  playJuiceSfxTracked(id, opts = {}) {
    if (this._sfxMuted || !this._gestured || !this._ctx || !this._ready) return null
    if (this._ctx.state === "suspended") { try { this._ctx.resume() } catch (_) {} }
    const buf = this._juiceBuffers.get(id)
    if (!buf) return null
    this._pruneJuiceVoices()
    if (this._juiceActive.length >= JUICE_VOICE_CAP) {
      if (!opts.ultBoom) return null
      const victim = this._juiceActive.shift(); try { victim && victim.src && victim.src.stop() } catch (_) {}
    }
    try {
      const ctx = this._ctx, now = ctx.currentTime
      const src = ctx.createBufferSource(); src.buffer = buf
      src.playbackRate.value = (typeof opts.pitch === "number" && opts.pitch > 0) ? opts.pitch : 1
      const g = ctx.createGain()
      const target = Math.max(0, (typeof opts.gain === "number") ? opts.gain : 1)
      const fin = Math.max(0, opts.fadeIn || 0)
      if (fin > 0) { g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(target, now + fin) } else g.gain.value = target
      src.connect(g); g.connect(opts.ultBoom ? this._master : (this._juiceBus || this._master))
      if (opts.ultBoom) this._juiceDuck(opts.duckSec || 0.5)
      src.start(now)
      const dur = buf.duration / (src.playbackRate.value || 1)
      const entry = { src, end: now + dur }; this._juiceActive.push(entry)
      src.onended = () => { const i = this._juiceActive.indexOf(entry); if (i >= 0) this._juiceActive.splice(i, 1) }
      return {
        id, duration: dur,
        stop(fadeSec = 0.12) {
          try {
            const t = ctx.currentTime, f = Math.max(0.02, fadeSec)
            g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + f)
            src.stop(t + f + 0.02); entry.end = t + f + 0.02
          } catch (_) {}
        },
      }
    } catch (_) { return null }
  }

  // Diagnostics (harness/report): what loaded, the voice cap, naruto-pool state.
  juiceStatus() {
    return {
      loaded: [...this._juiceBuffers.keys()],
      coreCount: Object.keys(JUICE_SFX).length,
      sparkingCount: Object.keys(SPARKING_SFX).length,
      sparkingLoaded: Object.keys(SPARKING_SFX).filter(id => this._juiceBuffers.has(id)).length,
      standins: Object.keys(JUICE_STANDINS),
      narutoExtra: this._juiceNarutoEnabled,
      voiceCap: JUICE_VOICE_CAP,
      activeVoices: this._juiceActive.length,
    }
  }

  // ── PRELOAD stub — kept for API compatibility, does nothing ───
  preload(_map = {}) {}
}

// ─────────────────────────────────────────────────────────────────
// SINGLETON EXPORT
// ─────────────────────────────────────────────────────────────────
export const sound = new SoundManager()
export default sound
