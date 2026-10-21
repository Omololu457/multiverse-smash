// ghostface_sfx_map.js — Scream × MK1 GHOSTFACE sound pack.
// 242 source clips live in ghostface_sfx/ (voice_lines_a/b/c + sfx_short). The clips CANNOT be auditioned,
// so each was categorised by ACOUSTIC PROFILE only — ffprobe duration + ffmpeg RMS / crest-factor (transient
// vs sustained) / low-vs-high band energy (voice vs broadband SFX). Semantic labels (intro/win/taunt/…) are
// therefore BEST-EFFORT by sound shape, not by meaning. Method + per-clip features: ghostface_work/.
//   • sfx_short, short + transient + high-band       → KNIFE_SFX
//   • sfx_short, sustained/tonal 1-4s                → PHONE_RING (best-guess; used by the LIGHTS OUT brutality)
//   • voice_lines < 1.3s                             → ATTACK_GRUNT / HIT_REACT
//   • voice_lines 1.3-2.6s punchy                    → SPECIAL_CALLOUT
//   • voice_lines 2-5s, sliced for variety           → INTRO / WIN / LOSE / TAUNT
//   • voice_lines split by bass-weight (low/high)    → ENFORCER_LINES (bass-heavy) / ASSASSIN_LINES (balanced)
//   • dur > 5-6s or very quiet / likely BGM          → SKIPPED (see list at bottom)
// Selection is DETERMINISTIC + LAN-safe: juicePickVariant(frame, player) + ±4% juicePitch (no RNG).
// Wired for EXACT rosterKey "ghostface" only — Billy/.exe keep their existing ghostfaceVoice pools (shared
// via VOICE_ALIAS), so this pack never changes their audio.
import { juicePickVariant, juicePitch } from "./sound.js"

export const GHOSTFACE_SFX = {
  INTRO_LINES: [
    "./ghostface_sfx/voice_lines_a/voice_lines_a_003.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_004.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_005.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_006.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_008.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_009.ogg",
  ],
  WIN_LINES: [
    "./ghostface_sfx/voice_lines_a/voice_lines_a_055.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_056.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_057.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_058.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_059.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_060.ogg",
  ],
  LOSE_LINES: [
    "./ghostface_sfx/voice_lines_b/voice_lines_b_032.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_033.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_034.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_035.ogg",
  ],
  TAUNT: [
    "./ghostface_sfx/voice_lines_b/voice_lines_b_036.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_037.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_038.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_039.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_040.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_041.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_042.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_043.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_044.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_046.ogg",
  ],
  HIT_REACT: [
    "./ghostface_sfx/voice_lines_a/voice_lines_a_021.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_024.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_061.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_062.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_025.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_027.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_052.ogg",
  ],
  ATTACK_GRUNT: [
    "./ghostface_sfx/voice_lines_a/voice_lines_a_001.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_022.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_030.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_045.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_002.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_026.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_042.ogg",
  ],
  SPECIAL_CALLOUT: [
    "./ghostface_sfx/voice_lines_a/voice_lines_a_002.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_007.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_010.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_014.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_017.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_020.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_026.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_029.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_033.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_036.ogg",
  ],
  KNIFE_SFX: [
    "./ghostface_sfx/sfx_short/sfx_short_005.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_006.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_016.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_019.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_027.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_028.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_029.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_037.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_038.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_040.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_041.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_044.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_047.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_051.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_053.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_054.ogg",
  ],
  PHONE_RING: [
    "./ghostface_sfx/sfx_short/sfx_short_050.ogg",
    "./ghostface_sfx/sfx_short/sfx_short_007.ogg",
  ],
  ENFORCER_LINES: [
    "./ghostface_sfx/voice_lines_c/voice_lines_c_048.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_031.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_042.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_026.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_001.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_008.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_018.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_010.ogg",
  ],
  ASSASSIN_LINES: [
    "./ghostface_sfx/voice_lines_a/voice_lines_a_034.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_003.ogg",
    "./ghostface_sfx/voice_lines_b/voice_lines_b_031.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_012.ogg",
    "./ghostface_sfx/voice_lines_c/voice_lines_c_010.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_020.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_033.ogg",
    "./ghostface_sfx/voice_lines_a/voice_lines_a_002.ogg",
  ],
}

// Deterministic clip pick for an event category (null if the pool is empty).
export function pickGhostfaceSfx(category, frame = 0, player = 0) {
  const pool = GHOSTFACE_SFX[category]
  return (pool && pool.length) ? juicePickVariant(pool, frame, player) : null
}
// ±4% deterministic pitch jitter for a one-shot (pass to playSfxFile opts.rate).
export function ghostfaceSfxPitch(frame = 0, player = 0) { return juicePitch(frame, player, 0.04) }

// Clips intentionally NOT mapped (too long / likely BGM bleed / too quiet) — 21 total:
//   ghostface_sfx/sfx_short/sfx_short_002.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_003.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_004.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_005.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_009.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_010.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_012.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_013.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_014.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_015.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_021.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_022.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_030.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_031.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_035.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_036.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_039.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_043.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_046.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/sfx_short/sfx_short_056.ogg  (long/BGM-or-quiet)
//   ghostface_sfx/voice_lines_c/voice_lines_c_054.ogg  (long voice/possible BGM)
// Play a category one-shot for a fighter: deterministic clip + ±4% pitch, single-voice owner = fighter.
// Seed = a per-fighter sim-event counter (LAN-safe: both peers process the same events in order; no RNG).
export function playGhostfaceSfx(sound, category, fighter) {
  if (!sound || !sound.playSfxFile || !fighter) return false
  const player = (fighter.side === "p2" || fighter.playerIndex === 1) ? 1 : 0
  const n = (fighter._gfSfxN = ((fighter._gfSfxN | 0) + 1))
  const clip = pickGhostfaceSfx(category, n, player)
  if (!clip) return false
  try { sound.playSfxFile(clip, null, { rate: ghostfaceSfxPitch(n, player), owner: fighter }) } catch (_) { return false }
  return true
}

export default GHOSTFACE_SFX
