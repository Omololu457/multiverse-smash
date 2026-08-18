// yamamotoVoice.js
// ---------------------------------------------------------------------------
// Yamamoto Genryūsai voice-line pools (audio-only; NO gameplay effect). Curated from 158 UNIDENTIFIED
// JAPANESE clips (yamamoto_line_*.mp3, silence-gap segmented — NO transcript/translation). Assignment is
// by ACOUSTIC SIGNAL ONLY (duration / RMS+peak loudness / a sustained-loudness INTENSITY score / F0 via
// tools/analyze_yamamoto_voice.py -> yamamoto_voice_analysis.tsv), NOT by content. pickYamamotoVoice(pool)
// returns ONE clip at random; callers play it via sound.playSfxFile(clip, null).
//
// * ARCHETYPE STEER (ancient, immensely powerful, deliberately UNHURRIED): movement-adjacent triggers
// (intro / all special casts / Shunpo) draw the CALMEST clips (intensity ~0.49-0.63); the genuinely INTENSE
// clips (0.75-0.92) are reserved for the ULTIMATE and HEAVY hits taken, so the routine voice never reads
// frantic against his measured animation timing.
//
// * line_147 (flagged, 11.8s, no >=0.3s internal gaps = music-masked): SPLIT at its two strongest interior
// gaps (~3.83s, ~8.20s) into 3 natural dramatic phrases -> 147a (3.2s) / 147b (4.1s, primary ult) / 147c
// (3.0s, most intense). The RAW whole-clip line_147 is NOT pooled. Split at only the 2 strongest gaps (not
// all 9 sub-0.3s breath-pauses) to avoid mid-word cuts on the music bed.
//
// 126 of 161 clips pooled; 35 remainders unused (more clips than slots is expected). Each clip in ONE pool.
// ---------------------------------------------------------------------------


export const YAMAMOTO_VOICE = {
  // -- INTRO / pre-match — CALM, measured declarations (3-4.7s), lowest intensity. The unhurried Captain-Commander. --
  intro: [
    "yamamoto_line_016_0037.1s.mp3",          // 4.05s  i0.50
    "yamamoto_line_040_0094.2s.mp3",          // 4.72s  i0.57
    "yamamoto_line_073_0166.8s.mp3",          // 2.97s  i0.53
    "yamamoto_line_150_0333.2s.mp3",          // 3.12s  i0.53
    "yamamoto_line_098_0223.4s.mp3",          // 3.14s  i0.55
    "yamamoto_line_038_0086.5s.mp3",          // 3.77s  i0.56
    "yamamoto_line_012_0029.4s.mp3",          // 3.20s  i0.56
  ],
  // -- NAMECALL — short calm clips that MIGHT be just his name (UNIDENTIFIED — content UNCONFIRMED, flagged). Banked; available. Move to a real trigger if a name is confirmed by ear. --
  namecall: [
    "yamamoto_line_032_0076.6s.mp3",          // 0.52s  i0.57
    "yamamoto_line_157_0348.6s.mp3",          // 0.54s  i0.54
    "yamamoto_line_110_0251.5s.mp3",          // 0.56s  i0.56
    "yamamoto_line_076_0175.6s.mp3",          // 0.60s  i0.56
    "yamamoto_line_156_0347.5s.mp3",          // 0.61s  i0.59
  ],
  // -- WIN / victory — CALM, satisfied measured declarations (2.6-4.8s). --
  win: [
    "yamamoto_line_046_0109.0s.mp3",          // 4.76s  i0.61
    "yamamoto_line_121_0268.1s.mp3",          // 3.90s  i0.59
    "yamamoto_line_092_0206.3s.mp3",          // 4.30s  i0.64
    "yamamoto_line_002_0002.0s.mp3",          // 3.00s  i0.64
    "yamamoto_line_049_0118.0s.mp3",          // 3.24s  i0.63
    "yamamoto_line_103_0235.0s.mp3",          // 3.19s  i0.69
    "yamamoto_line_045_0105.2s.mp3",          // 3.34s  i0.66
  ],
  // -- COMMAND-NORMAL CHAIN + normals effort — short measured shouts (0.7-1.4s). Frequently triggered → many variants, gated by _yamamotoAtkVoiceCd so a string doesn't machine-gun. --
  effort: [
    "yamamoto_line_138_0301.7s.mp3",          // 0.74s  i0.52
    "yamamoto_line_037_0084.5s.mp3",          // 1.17s  i0.52
    "yamamoto_line_044_0103.6s.mp3",          // 1.19s  i0.53
    "yamamoto_line_022_0054.6s.mp3",          // 0.89s  i0.54
    "yamamoto_line_155_0345.8s.mp3",          // 1.19s  i0.54
    "yamamoto_line_057_0134.9s.mp3",          // 1.07s  i0.55
    "yamamoto_line_097_0221.3s.mp3",          // 1.36s  i0.55
    "yamamoto_line_137_0300.1s.mp3",          // 1.29s  i0.56
    "yamamoto_line_070_0156.2s.mp3",          // 0.92s  i0.57
    "yamamoto_line_077_0176.5s.mp3",          // 0.95s  i0.57
    "yamamoto_line_111_0252.4s.mp3",          // 0.87s  i0.58
    "yamamoto_line_129_0286.4s.mp3",          // 1.13s  i0.58
    "yamamoto_line_033_0077.5s.mp3",          // 1.17s  i0.59
    "yamamoto_line_125_0277.6s.mp3",          // 1.25s  i0.59
    "yamamoto_line_078_0178.1s.mp3",          // 1.14s  i0.60
    "yamamoto_line_104_0238.6s.mp3",          // 1.20s  i0.60
    "yamamoto_line_158_0349.8s.mp3",          // 1.18s  i0.61
    "yamamoto_line_107_0245.2s.mp3",          // 1.26s  i0.61
  ],
  // -- GROUND-SWEEP BEAM cast — CALM measured (1.4-2.6s, low intensity). Movement-adjacent → not frantic. --
  beamCast: [
    "yamamoto_line_055_0131.1s.mp3",          // 1.87s  i0.49
    "yamamoto_line_007_0019.9s.mp3",          // 2.19s  i0.52
    "yamamoto_line_140_0304.2s.mp3",          // 2.36s  i0.52
    "yamamoto_line_071_0157.5s.mp3",          // 1.79s  i0.54
    "yamamoto_line_008_0022.4s.mp3",          // 1.49s  i0.55
    "yamamoto_line_051_0124.7s.mp3",          // 1.54s  i0.58
  ],
  // -- GROUND ERUPTION STAB cast — measured, a touch more forceful (ground slam). --
  eruptionCast: [
    "yamamoto_line_066_0150.3s.mp3",          // 1.71s  i0.59
    "yamamoto_line_050_0121.8s.mp3",          // 2.45s  i0.59
    "yamamoto_line_017_0041.6s.mp3",          // 1.82s  i0.60
    "yamamoto_line_010_0026.2s.mp3",          // 1.89s  i0.60
    "yamamoto_line_030_0073.2s.mp3",          // 2.24s  i0.60
    "yamamoto_line_001_0000.0s.mp3",          // 1.74s  i0.61
  ],
  // -- HORIZONTAL THRUST cast — measured mid. --
  thrustCast: [
    "yamamoto_line_109_0249.0s.mp3",          // 2.21s  i0.61
    "yamamoto_line_052_0126.8s.mp3",          // 1.55s  i0.62
    "yamamoto_line_029_0070.7s.mp3",          // 2.16s  i0.62
    "yamamoto_line_087_0195.1s.mp3",          // 2.11s  i0.63
    "yamamoto_line_021_0052.0s.mp3",          // 2.14s  i0.63
    "yamamoto_line_142_0309.1s.mp3",          // 2.20s  i0.63
  ],
  // -- LARGE GROUND-STAB cast — his FLAGSHIP: DISTINCT, WEIGHTY clips (2.6-2.8s, lower/heavier) held apart from the other casts. --
  stabCast: [
    "yamamoto_line_105_0240.1s.mp3",          // 2.77s  i0.66
    "yamamoto_line_115_0259.4s.mp3",          // 2.82s  i0.61
    "yamamoto_line_091_0203.2s.mp3",          // 2.63s  i0.63
    "yamamoto_line_095_0215.0s.mp3",          // 2.67s  i0.68
    "yamamoto_line_085_0191.2s.mp3",          // 3.03s  i0.70
    "yamamoto_line_039_0090.8s.mp3",          // 3.11s  i0.75
  ],
  // -- OVERHEAD SLAM cast — forceful vertical (mid). --
  overheadCast: [
    "yamamoto_line_090_0200.9s.mp3",          // 1.97s  i0.68
    "yamamoto_line_113_0255.1s.mp3",          // 1.95s  i0.68
    "yamamoto_line_061_0142.5s.mp3",          // 1.78s  i0.68
    "yamamoto_line_134_0293.9s.mp3",          // 1.77s  i0.66
    "yamamoto_line_058_0136.6s.mp3",          // 1.85s  i0.66
    "yamamoto_line_082_0185.5s.mp3",          // 1.89s  i0.70
  ],
  // -- SHUNPO (Flash Step) — quick but CALM/measured (per archetype, the blink is composed, not panicked). --
  shunpo: [
    "yamamoto_line_036_0082.4s.mp3",          // 1.48s  i0.57
    "yamamoto_line_128_0284.0s.mp3",          // 1.66s  i0.57
    "yamamoto_line_074_0170.3s.mp3",          // 1.94s  i0.58
    "yamamoto_line_100_0229.9s.mp3",          // 1.74s  i0.65
    "yamamoto_line_096_0218.0s.mp3",          // 2.59s  i0.57
    "yamamoto_line_130_0287.9s.mp3",          // 2.42s  i0.60
  ],
  // -- ULTIMATE (Overhead Slam) — the LONGEST / most dramatic clips. 147b/147c/147a = the split of the flagged 11.8s line_147 (3 natural phrases at its 2 strongest gaps); plus 072 (6.8s) / 006 (5.3s) / 018 / 026. --
  ultimate: [
    "yamamoto_line_147b_0316.8s.mp3",         // 4.09s  i0.63
    "yamamoto_line_147c_0316.8s.mp3",         // 2.97s  i0.68
    "yamamoto_line_147a_0316.8s.mp3",         // 3.23s  i0.54
    "yamamoto_line_072_0159.7s.mp3",          // 6.75s  i0.57
    "yamamoto_line_006_0014.1s.mp3",          // 5.34s  i0.63
    "yamamoto_line_018_0044.7s.mp3",          // 4.55s  i0.70
    "yamamoto_line_026_0062.9s.mp3",          // 4.44s  i0.65
  ],
  // -- HIT REACTION (light) — short pained grunts (many variants), one per _hitVoiceCd window. --
  hitLight: [
    "yamamoto_line_135_0296.0s.mp3",          // 0.93s  i0.64
    "yamamoto_line_123_0274.4s.mp3",          // 1.13s  i0.64
    "yamamoto_line_099_0227.9s.mp3",          // 1.25s  i0.64
    "yamamoto_line_151_0337.5s.mp3",          // 1.40s  i0.64
    "yamamoto_line_124_0276.3s.mp3",          // 0.81s  i0.66
    "yamamoto_line_054_0129.9s.mp3",          // 0.90s  i0.66
    "yamamoto_line_047_0114.6s.mp3",          // 1.23s  i0.66
    "yamamoto_line_139_0302.8s.mp3",          // 1.09s  i0.67
    "yamamoto_line_106_0243.4s.mp3",          // 1.26s  i0.67
    "yamamoto_line_122_0272.7s.mp3",          // 1.28s  i0.62
    "yamamoto_line_034_0079.0s.mp3",          // 1.25s  i0.64
    "yamamoto_line_024_0058.0s.mp3",          // 1.33s  i0.64
    "yamamoto_line_094_0212.9s.mp3",          // 0.96s  i0.71
    "yamamoto_line_020_0050.6s.mp3",          // 1.04s  i0.72
    "yamamoto_line_042_0100.2s.mp3",          // 0.79s  i0.72
    "yamamoto_line_041_0099.2s.mp3",          // 0.74s  i0.72
    "yamamoto_line_116_0262.6s.mp3",          // 0.80s  i0.74
    "yamamoto_line_117_0263.7s.mp3",          // 1.02s  i0.74
    "yamamoto_line_004_0009.6s.mp3",          // 0.30s  i0.79
    "yamamoto_line_028_0070.2s.mp3",          // 0.30s  i0.76
    "yamamoto_line_084_0190.6s.mp3",          // 0.26s  i0.74
    "yamamoto_line_146_0316.2s.mp3",          // 0.34s  i0.75
    "yamamoto_line_120_0267.5s.mp3",          // 0.34s  i0.70
    "yamamoto_line_053_0129.3s.mp3",          // 0.26s  i0.61
  ],
  // -- HIT REACTION (heavy/strong) — the genuinely INTENSE short barks (highest intensity 0.75-0.92), reserved for big hits taken. --
  hitHeavy: [
    "yamamoto_line_143_0311.6s.mp3",          // 1.23s  i0.92
    "yamamoto_line_068_0154.0s.mp3",          // 0.79s  i0.85
    "yamamoto_line_108_0247.3s.mp3",          // 1.05s  i0.82
    "yamamoto_line_014_0035.0s.mp3",          // 0.92s  i0.80
    "yamamoto_line_112_0253.6s.mp3",          // 1.15s  i0.79
    "yamamoto_line_132_0291.3s.mp3",          // 1.02s  i0.78
    "yamamoto_line_048_0116.6s.mp3",          // 0.90s  i0.78
    "yamamoto_line_133_0292.6s.mp3",          // 0.98s  i0.75
    "yamamoto_line_127_0282.3s.mp3",          // 1.34s  i0.76
    "yamamoto_line_118_0265.4s.mp3",          // 1.18s  i0.76
    "yamamoto_line_088_0197.5s.mp3",          // 1.36s  i0.68
    "yamamoto_line_089_0199.2s.mp3",          // 1.33s  i0.69
    "yamamoto_line_011_0028.4s.mp3",          // 0.39s  i0.83
    "yamamoto_line_019_0049.8s.mp3",          // 0.57s  i0.82
    "yamamoto_line_031_0075.8s.mp3",          // 0.50s  i0.78
    "yamamoto_line_015_0036.2s.mp3",          // 0.50s  i0.74
  ],
  // -- KNOCKDOWN — longer pained/falling grunts (~1.3s). --
  knockdown: [
    "yamamoto_line_065_0148.8s.mp3",          // 1.28s  i0.72
    "yamamoto_line_141_0307.0s.mp3",          // 1.34s  i0.73
    "yamamoto_line_093_0211.2s.mp3",          // 1.28s  i0.68
    "yamamoto_line_009_0024.3s.mp3",          // 1.39s  i0.69
    "yamamoto_line_056_0133.3s.mp3",          // 1.20s  i0.71
    "yamamoto_line_148_0328.9s.mp3",          // 1.20s  i0.72
  ],
}

// Return ONE random clip filename from a pool (or null if empty/unknown). Audio-only. Never throws.
export function pickYamamotoVoice(pool) {
  const arr = YAMAMOTO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
