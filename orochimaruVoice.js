// orochimaruVoice.js
// ---------------------------------------------------------------------------
// Orochimaru voice-line pools (audio-only; NO gameplay effect). Curated from 59 UNIDENTIFIED
// JAPANESE clips (orochi_line_*.mp3, silence-cut from a source compilation — NO transcript, so
// assignment is BY VIBE only: duration / pitch / brightness / energy via
// tools/analyze_orochimaru_voice.py, the Nezuko/Saitama/Jason precedent). pickOrochimaruVoice(pool)
// returns ONE clip at random; callers play it via sound.playSfxFile(clip, null).
//
// ★ ALL 7 flagged long clips (01,02,16,20,24,27,43, 7–11.5s) had NO usable silence gaps — background
//   music masked the pauses. A music-floor VAD + spectral-flux onset pass (tools/split_orochimaru_long.py)
//   found 2–5 distinct utterances in EACH → every one was SPLIT into <NN><a..> segments; none kept whole.
// ★ NAMECALL: no clip is reliably just his name (unidentified) → the slot is left UNMAPPED (skips cleanly).
// ---------------------------------------------------------------------------

export const OROCHIMARU_VOICE = {
  // ── intro / pre-match ──
  intro: [
    "orochi_line_25_0103.8s.mp3",   // 5.41s
    "orochi_line_47_0193.7s.mp3",   // 5.21s
    "orochi_line_14_0051.6s.mp3",   // 5.39s
    "orochi_line_30_0130.4s.mp3",   // 4.94s
    "orochi_line_52_0211.6s.mp3",   // 6.25s
    "orochi_line_03_0019.5s.mp3",   // 3.42s
  ],
  // ── grab (throw-weapon) ──
  grab: [
    "orochi_line_19_0072.9s.mp3",   // 2.35s
    "orochi_line_44_0183.0s.mp3",   // 2.31s
    "orochi_line_21_0084.4s.mp3",   // 2.15s
  ],
  // ── Snake Spit (neutral, ranged) ──
  snakeSpit: [
    "orochi_line_17_0067.7s.mp3",   // 2.24s
    "orochi_line_57_0230.4s.mp3",   // 2.17s
    "orochi_line_56_0227.1s.mp3",   // 2.0s
  ],
  // ── Kusanagi Sword Lunge (Fwd, melee) ──
  swordLunge: [
    "orochi_line_09_0037.8s.mp3",   // 3.16s
    "orochi_line_40_0159.3s.mp3",   // 2.53s
    "orochi_line_05_0024.2s.mp3",   // 2.53s
  ],
  // ── Kusanagi Sword Throw (Back, ranged) ──
  swordThrow: [
    "orochi_line_36_0150.8s.mp3",   // 2.11s
    "orochi_line_13_0049.9s.mp3",   // 1.38s
    "orochi_line_10_0041.8s.mp3",   // 1.39s
  ],
  // ── Striking Shadow Snake (air neutral dive) ──
  snakeLunge: [
    "orochi_line_55_0223.8s.mp3",   // 2.95s
    "orochi_line_54_0220.1s.mp3",   // 2.57s
    "orochi_line_27a_0113.3s.mp3",   // 2.1s
  ],
  // ── Snake-Tail Sweep (Up) ──
  tailSweep: [
    "orochi_line_22_0086.8s.mp3",   // 1.8s
    "orochi_line_15_0057.6s.mp3",   // 2.27s
    "orochi_line_16b_0060.1s.mp3",   // 1.7s
  ],
  // ── Slam (Down) ──
  slam: [
    "orochi_line_49_0204.8s.mp3",   // 2.71s
    "orochi_line_39_0155.8s.mp3",   // 2.74s
    "orochi_line_29_0126.8s.mp3",   // 2.72s
  ],
  // ── command-chain finisher ──
  chainFinish: [
    "orochi_line_43b_0171.1s.mp3",   // 2.06s
    "orochi_line_27e_0113.3s.mp3",   // 1.54s
    "orochi_line_24b_0092.9s.mp3",   // 1.5s
  ],
  // ── Hidden Shadow Snakes (air Fwd barrage) ──
  snakeBarrage: [
    "orochi_line_31_0137.0s.mp3",   // 1.61s
    "orochi_line_35_0148.8s.mp3",   // 1.5s
    "orochi_line_24a_0092.9s.mp3",   // 1.26s
    "orochi_line_50_0208.3s.mp3",   // 1.46s
  ],
  // ── Snake-Form Coil (air Back) ──
  coil: [
    "orochi_line_24d_0092.9s.mp3",   // 1.48s
    "orochi_line_16d_0060.1s.mp3",   // 1.44s
    "orochi_line_16c_0060.1s.mp3",   // 1.2s
  ],
  // ── Summon ultimate (longest/most dramatic) ──
  ultimate: [
    "orochi_line_20a_0075.7s.mp3",   // 3.62s
    "orochi_line_24c_0092.9s.mp3",   // 3.42s
    "orochi_line_42_0164.2s.mp3",   // 6.59s
  ],
  // ── shed-skin transform ──
  transform: [
    "orochi_line_33_0140.4s.mp3",   // 5.71s
    "orochi_line_23_0089.1s.mp3",   // 3.53s
    "orochi_line_48_0199.6s.mp3",   // 3.93s
    "orochi_line_12_0044.8s.mp3",   // 4.24s
  ],
  // ── hit reaction — light ──
  hitLight: [
    "orochi_line_04_0023.3s.mp3",   // 0.42s
    "orochi_line_32_0139.0s.mp3",   // 0.31s
    "orochi_line_53_0218.9s.mp3",   // 0.69s
    "orochi_line_08_0036.9s.mp3",   // 0.57s
    "orochi_line_37_0153.6s.mp3",   // 0.39s
    "orochi_line_02b_0009.8s.mp3",   // 0.68s
    "orochi_line_02d_0009.8s.mp3",   // 0.68s
    "orochi_line_02a_0009.8s.mp3",   // 0.7s
    "orochi_line_38_0155.0s.mp3",   // 0.62s
    "orochi_line_58_0232.9s.mp3",   // 0.93s
  ],
  // ── hit reaction — heavy ──
  hitHeavy: [
    "orochi_line_27c_0113.3s.mp3",   // 0.92s
    "orochi_line_43a_0171.1s.mp3",   // 0.84s
    "orochi_line_27d_0113.3s.mp3",   // 1.22s
    "orochi_line_18_0070.7s.mp3",   // 1.02s
    "orochi_line_01a_0000.0s.mp3",   // 0.98s
    "orochi_line_11_0043.5s.mp3",   // 0.79s
    "orochi_line_01b_0000.0s.mp3",   // 1.54s
  ],
  // ── knockdown ──
  knockdown: [
    "orochi_line_41_0162.3s.mp3",   // 1.38s
    "orochi_line_46_0192.0s.mp3",   // 1.21s
    "orochi_line_16a_0060.1s.mp3",   // 1.14s
    "orochi_line_01c_0000.0s.mp3",   // 1.1s
    "orochi_line_07_0034.6s.mp3",   // 2.08s
  ],
  // ── win pose ──
  win: [
    "orochi_line_26_0109.7s.mp3",   // 3.23s
    "orochi_line_45_0186.7s.mp3",   // 4.56s
    "orochi_line_59_0234.6s.mp3",   // 6.42s
    "orochi_line_20b_0075.7s.mp3",   // 2.84s
    "orochi_line_06_0028.1s.mp3",   // 6.01s
  ],
}

export function pickOrochimaruVoice(pool) {
  const arr = OROCHIMARU_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
