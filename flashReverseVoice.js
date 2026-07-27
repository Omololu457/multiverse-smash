// flashReverseVoice.js
// ---------------------------------------------------------------------------
// "Reverse Flash" (Eobard Thawne) SKIN voice pack for The Flash — audio-only; NO gameplay effect.
// English clips (prefix revflash_*, Injustice 2), cut by silence-detection then TRANSCRIBED via
// faster-whisper (base.en + VAD) and MANUALLY reviewed — see REVFLASH_VOICE_LOG.md for the full
// 282-file content log + per-file disposition. Wired ONLY for the "flash_reverse" skin via the same
// per-skin override mechanism as Young Gojo (gojoVoice.js SKIN_VOICE + pickSkinVoice). Under any other
// Flash skin (base/Godspeed/Blue/…) these are silent and base Flash voice is unaffected.
//
// Filtering (project rule): every line referencing another specific named DC character (Barry/Superman/
// Grodd/Bane/Ivy/…) was EXCLUDED; self-references to "Reverse Flash"/"Professor Zoom"/"Eobard"/"speed
// force" are kept. Pure grunts are pooled ONLY as the hit-reaction effort set; laughs → win.
// Genuine random selection per pool (pickSkinVoice → Math.random).
// ---------------------------------------------------------------------------

export const REVFLASH_VOICE = {
  // ── INTRO / pre-fight (openers + identity: "I'm the fastest man alive", "Eobard Thawne") (12) ──
  intro: [
    "revflash_002_t00m02_5s.mp3", "revflash_005_t00m09_4s.mp3", "revflash_021_t00m44_6s.mp3",
    "revflash_027_t00m58_5s.mp3", "revflash_034_t01m16_2s.mp3", "revflash_035_t01m18_4s.mp3",
    "revflash_063_t02m19_6s.mp3", "revflash_069_t02m30_7s.mp3", "revflash_080_t02m55_1s.mp3",
    "revflash_138_t05m01_9s.mp3", "revflash_160_t05m48_2s.mp3", "revflash_170_t06m09_6s.mp3",
  ],
  // ── TAUNT — mid-fight jabs (largest pool; no taunt action → rides the offense-connect trigger) (65) ──
  taunt: [
    "revflash_000_t00m00_0s.mp3", "revflash_009_t00m17_6s.mp3", "revflash_010_t00m19_5s.mp3",
    "revflash_011_t00m21_6s.mp3", "revflash_012_t00m24_3s.mp3", "revflash_022_t00m46_9s.mp3",
    "revflash_025_t00m53_6s.mp3", "revflash_043_t01m36_7s.mp3", "revflash_050_t01m50_5s.mp3",
    "revflash_052_t01m54_9s.mp3", "revflash_054_t01m59_8s.mp3", "revflash_057_t02m06_0s.mp3",
    "revflash_061_t02m15_2s.mp3", "revflash_062_t02m17_7s.mp3", "revflash_066_t02m24_7s.mp3",
    "revflash_067_t02m26_9s.mp3", "revflash_072_t02m37_5s.mp3", "revflash_074_t02m42_5s.mp3",
    "revflash_075_t02m44_3s.mp3", "revflash_078_t02m50_8s.mp3", "revflash_079_t02m52_9s.mp3",
    "revflash_084_t03m04_3s.mp3", "revflash_086_t03m09_1s.mp3", "revflash_091_t03m20_9s.mp3",
    "revflash_099_t03m40_7s.mp3", "revflash_101_t03m45_0s.mp3", "revflash_105_t03m51_8s.mp3",
    "revflash_106_t03m54_2s.mp3", "revflash_107_t03m56_1s.mp3", "revflash_111_t04m04_6s.mp3",
    "revflash_112_t04m06_3s.mp3", "revflash_115_t04m11_2s.mp3", "revflash_118_t04m18_4s.mp3",
    "revflash_119_t04m20_5s.mp3", "revflash_120_t04m23_2s.mp3", "revflash_122_t04m27_0s.mp3",
    "revflash_125_t04m33_1s.mp3", "revflash_126_t04m35_4s.mp3", "revflash_131_t04m46_2s.mp3",
    "revflash_134_t04m52_4s.mp3", "revflash_137_t04m59_9s.mp3", "revflash_139_t05m04_4s.mp3",
    "revflash_140_t05m06_1s.mp3", "revflash_141_t05m08_1s.mp3", "revflash_144_t05m14_1s.mp3",
    "revflash_146_t05m17_8s.mp3", "revflash_147_t05m19_6s.mp3", "revflash_150_t05m25_4s.mp3",
    "revflash_159_t05m46_1s.mp3", "revflash_163_t05m54_4s.mp3", "revflash_164_t05m56_8s.mp3",
    "revflash_167_t06m03_4s.mp3", "revflash_172_t06m13_8s.mp3", "revflash_173_t06m16_0s.mp3",
    "revflash_175_t06m20_4s.mp3", "revflash_178_t06m25_7s.mp3", "revflash_180_t06m29_9s.mp3",
    "revflash_182_t06m33_0s.mp3", "revflash_184_t06m37_1s.mp3", "revflash_185_t06m38_7s.mp3",
    "revflash_186_t06m40_3s.mp3", "revflash_187_t06m42_5s.mp3", "revflash_189_t06m45_9s.mp3",
    "revflash_190_t06m48_0s.mp3", "revflash_193_t06m54_4s.mp3",
  ],
  // ── SPECIAL-CAST — speed-force / power callouts (fires over Flash's special SFX) (11) ──
  cast: [
    "revflash_003_t00m04_9s.mp3", "revflash_028_t01m01_0s.mp3", "revflash_033_t01m13_4s.mp3",
    "revflash_048_t01m46_4s.mp3", "revflash_083_t03m02_2s.mp3", "revflash_087_t03m11_7s.mp3",
    "revflash_089_t03m15_7s.mp3", "revflash_127_t04m37_6s.mp3", "revflash_135_t04m54_7s.mp3",
    "revflash_168_t06m05_3s.mp3", "revflash_174_t06m18_1s.mp3",
  ],
  // ── HIT-CONNECT — an unblocked Reverse-Flash attack lands (17) ──
  hitConnect: [
    "revflash_017_t00m37_6s.mp3", "revflash_039_t01m27_1s.mp3", "revflash_064_t02m21_3s.mp3",
    "revflash_088_t03m14_1s.mp3", "revflash_096_t03m34_1s.mp3", "revflash_097_t03m35_6s.mp3",
    "revflash_108_t03m58_5s.mp3", "revflash_113_t04m07_4s.mp3", "revflash_117_t04m15_3s.mp3",
    "revflash_123_t04m28_7s.mp3", "revflash_128_t04m39_5s.mp3", "revflash_129_t04m41_8s.mp3",
    "revflash_145_t05m15_8s.mp3", "revflash_152_t05m29_7s.mp3", "revflash_169_t06m07_2s.mp3",
    "revflash_177_t06m24_0s.mp3", "revflash_196_t07m00_1s.mp3",
  ],
  // ── HIT-REACTION — taking a hit: spoken lines + the pooled effort-grunt set (35) ──
  hitReact: [
    "revflash_026_t00m56_1s.mp3", "revflash_095_t03m29_5s.mp3", "revflash_103_t03m48_8s.mp3",
    "revflash_143_t05m12_3s.mp3", "revflash_200_t07m08_8s.mp3", "revflash_201_t07m10_7s.mp3",
    "revflash_204_t07m14_7s.mp3", "revflash_205_t07m15_6s.mp3", "revflash_207_t07m17_8s.mp3",
    "revflash_213_t07m26_2s.mp3", "revflash_214_t07m28_1s.mp3", "revflash_215_t07m29_0s.mp3",
    "revflash_223_t07m50_5s.mp3", "revflash_226_t07m54_4s.mp3", "revflash_227_t07m55_2s.mp3",
    "revflash_229_t08m00_0s.mp3", "revflash_230_t08m01_6s.mp3", "revflash_231_t08m04_3s.mp3",
    "revflash_233_t08m06_5s.mp3", "revflash_234_t08m08_1s.mp3", "revflash_242_t08m20_2s.mp3",
    "revflash_243_t08m29_8s.mp3", "revflash_246_t08m34_1s.mp3", "revflash_247_t08m36_6s.mp3",
    "revflash_248_t08m37_7s.mp3", "revflash_250_t08m41_0s.mp3", "revflash_252_t08m45_1s.mp3",
    "revflash_254_t08m51_0s.mp3", "revflash_255_t08m53_3s.mp3", "revflash_256_t08m54_1s.mp3",
    "revflash_262_t09m01_1s.mp3", "revflash_266_t09m09_2s.mp3", "revflash_277_t09m45_9s.mp3",
    "revflash_279_t09m48_8s.mp3", "revflash_281_t09m50_8s.mp3",
  ],
  // ── WIN — match victory (incl. "Reverse Flash wins" + victory laughs) (9) ──
  win: [
    "revflash_008_t00m16_2s.mp3", "revflash_059_t02m10_9s.mp3", "revflash_081_t02m57_4s.mp3",
    "revflash_148_t05m21_7s.mp3", "revflash_149_t05m23_8s.mp3", "revflash_171_t06m11_6s.mp3",
    "revflash_208_t07m19_3s.mp3", "revflash_232_t08m05_3s.mp3", "revflash_236_t08m10_5s.mp3",
  ],
}
