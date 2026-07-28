// omnimanVoice.js
// ---------------------------------------------------------------------------
// Omni-Man voice-line pools (audio-only; NO gameplay effect). 233 source clips
// (English, Mortal Kombat 1) transcribed → OMNIMAN_VOICE_LOG.md; 99 usable full
// lines wired here, the rest discarded (87 no-speech, 14 named/opponent-specific,
// 32 fragment/garble, 1 grunt). Every entry is an on-disk mp3 filename (exact case);
// filenames encode only the original timestamp.
//
// pickOmniManVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickGonVoice / pickRickVoice. Callers play
// via sound.playSfxFile(clip, null) — a fresh Audio per call so a voice line overlaps
// the technique SFX and never cuts another off (project convention).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro      → game.js INTRO_VOICE            (round-1 match intro declarations)
//   cast       → abilities.js executeOmniManSpecial (all 3 specials) + executeOmniManUltimate
//                + toggleOmniManFlight ON (cooldown-gated). Holds the flight-flavored lines
//                ("I go where I please", "not even in deep space") so flight activation gets them.
//   taunt      → combat.js applyOmniManOffenseVoice (attacker lands a strong/long-string hit —
//                cold Viltrumite trash-talk; the punchy "Amateur"/"Fragile" hit-connect lines live here).
//                No dedicated taunt ACTION (Omni-Man has none; enrolling him in the universal
//                hold-Down heal-taunt would change gameplay → excluded, this pass is audio-only), so
//                the taunt pool rides the offense-connect trigger (Batman/Flash precedent).
//   hitReact   → combat.js applyOmniManHitVoice  (defender got hit — shrug-it-off defiance)
//   lowHealth  → combat.js applyOmniManLowHealthVoice (once, crossing the low-HP line)
//   win        → game.js _checkMatchOver         (winner = Omni-Man)
// ---------------------------------------------------------------------------

export const OMNIMAN_VOICE = {
  // ── INTRO / pre-fight declarations (match start) ──
  intro: [
    "omniman_006_t00m12_0s.mp3", "omniman_007_t00m14_7s.mp3", "omniman_021_t00m50_2s.mp3",
    "omniman_028_t01m09_3s.mp3", "omniman_044_t01m46_6s.mp3", "omniman_050_t02m03_8s.mp3",
    "omniman_068_t02m48_4s.mp3", "omniman_074_t03m00_4s.mp3", "omniman_075_t03m02_5s.mp3",
    "omniman_097_t04m06_5s.mp3", "omniman_101_t04m19_1s.mp3", "omniman_117_t04m56_8s.mp3",
    "omniman_127_t05m33_1s.mp3", "omniman_132_t05m46_3s.mp3", "omniman_144_t06m10_2s.mp3",
  ],

  // ── SPECIAL / FLIGHT / ULTIMATE cast (power + flight-flavored lines) ──
  cast: [
    "omniman_051_t02m07_2s.mp3",   // "Cold can't stop me, not even in deep space…" (flight)
    "omniman_073_t02m57_3s.mp3",   // "I go where I please. I'll show you power." (flight)
    "omniman_078_t03m08_9s.mp3",   // "Maybe I'll toss you into the sun." (throw/flight)
    "omniman_087_t03m36_7s.mp3",   // "I'll put a hole where your face is."
    "omniman_103_t04m27_5s.mp3",   // "Allow me to reset your expectations."
  ],

  // ── TAUNT / hit-connect trash-talk (fires on a strong/long-string CONNECT) ──
  taunt: [
    "omniman_000_t00m00_0s.mp3", "omniman_001_t00m02_8s.mp3", "omniman_005_t00m08_1s.mp3",
    "omniman_010_t00m24_2s.mp3", "omniman_012_t00m27_7s.mp3", "omniman_014_t00m33_2s.mp3",
    "omniman_015_t00m36_2s.mp3", "omniman_018_t00m41_6s.mp3", "omniman_022_t00m52_7s.mp3",
    "omniman_023_t00m56_2s.mp3", "omniman_026_t01m06_6s.mp3", "omniman_029_t01m11_9s.mp3",
    "omniman_032_t01m16_2s.mp3", "omniman_034_t01m18_5s.mp3", "omniman_036_t01m21_6s.mp3",
    "omniman_037_t01m23_4s.mp3", "omniman_041_t01m33_3s.mp3", "omniman_042_t01m36_5s.mp3",
    "omniman_047_t01m54_6s.mp3", "omniman_048_t01m56_3s.mp3", "omniman_049_t02m00_5s.mp3",
    "omniman_052_t02m12_9s.mp3", "omniman_053_t02m15_7s.mp3", "omniman_056_t02m19_5s.mp3",
    "omniman_057_t02m22_5s.mp3", "omniman_060_t02m31_6s.mp3", "omniman_061_t02m34_8s.mp3",
    "omniman_062_t02m37_6s.mp3", "omniman_064_t02m41_8s.mp3", "omniman_069_t02m51_1s.mp3",
    "omniman_071_t02m53_9s.mp3", "omniman_077_t03m06_5s.mp3", "omniman_080_t03m13_1s.mp3",
    "omniman_081_t03m15_8s.mp3", "omniman_082_t03m19_0s.mp3", "omniman_083_t03m22_1s.mp3",
    "omniman_084_t03m26_6s.mp3", "omniman_088_t03m39_3s.mp3", "omniman_091_t03m49_3s.mp3",
    "omniman_092_t03m51_9s.mp3", "omniman_093_t03m55_3s.mp3", "omniman_094_t03m59_7s.mp3",
    "omniman_095_t04m01_2s.mp3", "omniman_096_t04m02_9s.mp3", "omniman_098_t04m09_9s.mp3",
    "omniman_099_t04m13_2s.mp3", "omniman_102_t04m23_4s.mp3", "omniman_104_t04m30_7s.mp3",
    "omniman_106_t04m35_6s.mp3", "omniman_109_t04m40_3s.mp3", "omniman_110_t04m42_6s.mp3",
    "omniman_116_t04m53_2s.mp3", "omniman_118_t05m09_2s.mp3", "omniman_121_t05m19_0s.mp3",
    "omniman_123_t05m22_5s.mp3", "omniman_124_t05m25_5s.mp3", "omniman_125_t05m26_7s.mp3",
    "omniman_128_t05m36_6s.mp3", "omniman_133_t05m49_6s.mp3", "omniman_135_t05m54_1s.mp3",
    "omniman_141_t06m04_9s.mp3", "omniman_142_t06m06_2s.mp3", "omniman_143_t06m08_8s.mp3",
    "omniman_145_t06m12_2s.mp3",
  ],

  // ── HIT-REACTION (defender got hit — shrug-it-off defiance) ──
  hitReact: [
    "omniman_011_t00m25_7s.mp3", "omniman_013_t00m30_8s.mp3", "omniman_019_t00m44_1s.mp3",
    "omniman_027_t01m07_5s.mp3", "omniman_072_t02m56_2s.mp3", "omniman_090_t03m46_2s.mp3",
    "omniman_134_t05m50_7s.mp3",
  ],

  // ── LOW HEALTH (once, crossing the low-HP line — still defiant) ──
  lowHealth: [
    "omniman_067_t02m46_1s.mp3", "omniman_105_t04m34_0s.mp3", "omniman_130_t05m40_0s.mp3",
  ],

  // ── WIN (match victory) ──
  win: [
    "omniman_046_t01m51_0s.mp3", "omniman_085_t03m29_8s.mp3", "omniman_113_t04m48_9s.mp3",
    "omniman_138_t05m58_6s.mp3", "omniman_139_t06m00_2s.mp3",
  ],
}

// Random pick from a pool (genuine Math.random — same shape as pickGonVoice/pickRickVoice).
export function pickOmniManVoice(pool) {
  const arr = OMNIMAN_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
