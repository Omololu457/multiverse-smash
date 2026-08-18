// mayuriVoice.js
// ---------------------------------------------------------------------------
// Mayuri Kurotsuchi voice-line pools (audio-only; NO gameplay effect). Curated from the 115-clip JAPANESE
// set (mayuri_line_*.mp3, silence-gap segmented from a source compilation — UNIDENTIFIED originals, NO
// transcript/translation available). Because the clips are UNIDENTIFIED, assignment is by ACOUSTIC SIGNAL
// ONLY (duration / loudness / vibe via tools/analyze_mayuri_voice.py → mayuri_voice_analysis.tsv), NOT by
// content. pickMayuriVoice(pool) returns ONE clip at random; callers play it via sound.playSfxFile(clip, null).
//
// ── NEMU (assist) vs MAYURI — investigated, flagged, resolved ──────────────────────────────────────────
// This single compilation is the ONLY voice source for BOTH Mayuri AND his bespoke Nemu assist. I checked
// for a distinct SECOND voice by pitch register: the F0 distribution across all 115 clips is UNIMODAL
// (single broad peak ~210-240Hz, smoothly 127→368Hz — NO bimodal split), and Mayuri's canonical voice
// (seiyū Ryūsei Nakao) is itself high-pitched/theatrical, so high F0 = Mayuri, not a second character.
// CONCLUSION: no clip is acoustically separable as Nemu's voice → per the brief's default, ALL 115 are
// treated as MAYURI's own voice. (The two quietest clips, 069/083, are just soft trailing grunts, F0 in the
// main cluster — not a distinct register.) Nemu therefore uses Mayuri's own bark on her assist call (summon
// pool); if a real Nemu clip is ever identified by ear, move it into a dedicated `nemu` pool here.
//
// ── The 7 FLAGGED long clips (005, 029, 035, 055, 088, 089, 108) ───────────────────────────────────────
// These are 7-9.3s with possible music-MASKED internal pauses. Gap-detection found 0-5 candidate gaps each,
// but on music-bedded audio those gaps are NOT reliable single-line boundaries (splitting risks mid-word
// cuts). Without the ability to listen, I did NOT split them — each is used WHOLE as a long, dramatic
// vocalization: 005/035/108 → ULTIMATE (Bankai), 029/088/089/055 → LAB COAT OPEN. If you confirm real line
// boundaries by ear, they can be re-cut at those points and re-pooled.
// ---------------------------------------------------------------------------

export const MAYURI_VOICE = {
  // ── INTRO / pre-match (confident 4-6s declarations). ──
  intro: [
    "mayuri_line_024_0077.2s.mp3",  // 5.9s
    "mayuri_line_077_0235.8s.mp3",  // 5.5s
    "mayuri_line_087_0280.3s.mp3",  // 5.1s
    "mayuri_line_073_0222.0s.mp3",  // 4.8s
    "mayuri_line_039_0124.7s.mp3",  // 4.4s
    "mayuri_line_030_0099.0s.mp3",  // 4.2s
    "mayuri_line_076_0231.5s.mp3",  // 4.0s
  ],
  // ── COMMAND-NORMAL CHAIN cast / melee effort — short shouts (1.4-2.3s). Frequently triggered → many variants. ──
  effort: [
    "mayuri_line_003_0006.0s.mp3",  // 1.9s
    "mayuri_line_054_0173.0s.mp3",  // 1.9s
    "mayuri_line_047_0155.8s.mp3",  // 1.9s
    "mayuri_line_004_0008.5s.mp3",  // 1.9s
    "mayuri_line_021_0068.5s.mp3",  // 1.7s
    "mayuri_line_013_0044.1s.mp3",  // 1.6s
    "mayuri_line_018_0061.0s.mp3",  // 1.6s
    "mayuri_line_062_0199.0s.mp3",  // 1.6s
    "mayuri_line_027_0088.0s.mp3",  // 1.6s
    "mayuri_line_034_0109.5s.mp3",  // 1.5s
    "mayuri_line_007_0021.9s.mp3",  // 1.4s
    "mayuri_line_026_0086.2s.mp3",  // 1.4s
    "mayuri_line_016_0054.4s.mp3",  // 2.3s
    "mayuri_line_071_0216.1s.mp3",  // 2.2s
    "mayuri_line_106_0352.8s.mp3",  // 2.1s
    "mayuri_line_033_0107.0s.mp3",  // 2.1s
    "mayuri_line_050_0163.4s.mp3",  // 2.0s
    "mayuri_line_104_0346.4s.mp3",  // 2.0s
  ],
  // ── SWORD-SPECIAL cast — Rising Cut (Up) + Energy Slash (Fwd) [the "crouching sword combo" / sword casts] (2.5-3.5s). ──
  swordCast: [
    "mayuri_line_046_0152.0s.mp3",  // 3.5s
    "mayuri_line_019_0062.9s.mp3",  // 3.4s
    "mayuri_line_043_0137.1s.mp3",  // 3.4s
    "mayuri_line_023_0073.7s.mp3",  // 3.3s
    "mayuri_line_090_0301.0s.mp3",  // 3.0s
    "mayuri_line_017_0057.3s.mp3",  // 2.9s
    "mayuri_line_022_0070.5s.mp3",  // 2.8s
    "mayuri_line_012_0040.8s.mp3",  // 2.8s
    "mayuri_line_081_0262.9s.mp3",  // 2.6s
    "mayuri_line_025_0083.4s.mp3",  // 2.5s
  ],
  // ── RANGED-SPECIAL cast — Finger-Gun Blast (neutral, "ranged burst") + Poison Cloud (Down) (2.4-3.4s). ──
  rangedCast: [
    "mayuri_line_105_0349.0s.mp3",  // 3.4s
    "mayuri_line_041_0131.3s.mp3",  // 3.4s
    "mayuri_line_059_0191.2s.mp3",  // 3.2s
    "mayuri_line_097_0328.5s.mp3",  // 3.1s
    "mayuri_line_009_0024.9s.mp3",  // 2.9s
    "mayuri_line_070_0212.8s.mp3",  // 2.9s
    "mayuri_line_096_0325.4s.mp3",  // 2.9s
    "mayuri_line_056_0183.1s.mp3",  // 2.8s
    "mayuri_line_110_0366.6s.mp3",  // 2.7s
    "mayuri_line_074_0227.3s.mp3",  // 2.6s
    "mayuri_line_086_0277.2s.mp3",  // 2.6s
    "mayuri_line_084_0272.7s.mp3",  // 2.4s
  ],
  // ── SUMMON — the NEMU assist call ("Cast/Summon special") (2.2-2.8s). Mayuri's own bark (no distinct Nemu clip). ──
  summon: [
    "mayuri_line_112_0386.8s.mp3",  // 2.8s
    "mayuri_line_078_0241.6s.mp3",  // 2.8s
    "mayuri_line_102_0338.6s.mp3",  // 2.7s
    "mayuri_line_103_0343.0s.mp3",  // 2.7s
    "mayuri_line_014_0046.7s.mp3",  // 2.7s
    "mayuri_line_072_0218.8s.mp3",  // 2.7s
    "mayuri_line_091_0304.6s.mp3",  // 2.4s
    "mayuri_line_098_0332.0s.mp3",  // 2.4s
    "mayuri_line_064_0202.8s.mp3",  // 2.2s
  ],
  // ── LAB COAT OPEN (transformation buff) — dramatic 5-8s declarations (incl. 4 FLAGGED long clips). ──
  labCoat: [
    "mayuri_line_029_0090.9s.mp3",  // 7.7s FLAGGED (whole)
    "mayuri_line_088_0285.7s.mp3",  // 7.3s FLAGGED (whole)
    "mayuri_line_089_0293.5s.mp3",  // 7.2s FLAGGED (whole)
    "mayuri_line_055_0175.4s.mp3",  // 7.0s FLAGGED (whole)
    "mayuri_line_045_0145.3s.mp3",  // 5.6s
    "mayuri_line_082_0265.9s.mp3",  // 5.1s
  ],
  // ── ULTIMATE: Bankai — Konjiki Ashisogi Jizō. The LONGEST / most dramatic (task-prioritized; flagged first). ──
  ultimate: [
    "mayuri_line_080_0249.7s.mp3",  // 12.8s
    "mayuri_line_093_0308.9s.mp3",  // 11.7s
    "mayuri_line_011_0029.1s.mp3",  // 11.1s
    "mayuri_line_005_0010.8s.mp3",  // 9.3s FLAGGED (whole)
    "mayuri_line_035_0111.2s.mp3",  // 8.7s FLAGGED (whole)
    "mayuri_line_108_0356.9s.mp3",  // 8.4s FLAGGED (whole)
    "mayuri_line_111_0369.6s.mp3",  // 17.0s (longest — whole speech)
  ],
  // ── HIT REACTION (light) — short pained grunts (<1s). Frequently triggered → many variants. ──
  hitLight: [
    "mayuri_line_057_0186.2s.mp3",  // 0.7s
    "mayuri_line_010_0028.1s.mp3",  // 0.7s
    "mayuri_line_028_0090.0s.mp3",  // 0.7s
    "mayuri_line_051_0166.3s.mp3",  // 0.5s
    "mayuri_line_099_0335.2s.mp3",  // 0.5s
    "mayuri_line_114_0391.4s.mp3",  // 0.4s
    "mayuri_line_037_0122.7s.mp3",  // 0.3s
    "mayuri_line_008_0023.7s.mp3",  // 0.8s
    "mayuri_line_038_0123.5s.mp3",  // 0.8s
    "mayuri_line_100_0336.1s.mp3",  // 0.8s
    "mayuri_line_075_0230.3s.mp3",  // 1.0s
    "mayuri_line_107_0355.7s.mp3",  // 1.0s
    "mayuri_line_101_0337.3s.mp3",  // 0.9s
    "mayuri_line_092_0307.4s.mp3",  // 1.2s
    "mayuri_line_052_0167.4s.mp3",  // 1.2s
  ],
  // ── HIT REACTION (heavy) — stronger pained/defiant (1.3-1.5s). ──
  hitHeavy: [
    "mayuri_line_095_0323.0s.mp3",  // 1.5s
    "mayuri_line_061_0196.9s.mp3",  // 1.5s
    "mayuri_line_085_0275.4s.mp3",  // 1.5s
    "mayuri_line_068_0209.6s.mp3",  // 1.5s
    "mayuri_line_060_0194.8s.mp3",  // 1.4s
    "mayuri_line_063_0201.1s.mp3",  // 1.4s
    "mayuri_line_094_0321.3s.mp3",  // 1.4s
    "mayuri_line_115_0392.4s.mp3",  // 1.4s
    "mayuri_line_042_0135.1s.mp3",  // 1.4s
    "mayuri_line_001_0000.0s.mp3",  // 1.3s
    "mayuri_line_031_0103.6s.mp3",  // 1.3s
    "mayuri_line_036_0120.5s.mp3",  // 1.3s
    "mayuri_line_032_0105.2s.mp3",  // 1.3s
  ],
  // ── KNOCKDOWN — short grunt on being downed (0.3-1.3s). ──
  knockdown: [
    "mayuri_line_069_0212.1s.mp3",  // 0.4s
    "mayuri_line_109_0366.1s.mp3",  // 0.3s
    "mayuri_line_006_0020.5s.mp3",  // 1.1s
    "mayuri_line_049_0161.8s.mp3",  // 1.1s
    "mayuri_line_065_0205.2s.mp3",  // 1.0s
    "mayuri_line_067_0208.1s.mp3",  // 1.0s
    "mayuri_line_040_0129.5s.mp3",  // 1.2s
    "mayuri_line_020_0067.0s.mp3",  // 1.2s
    "mayuri_line_113_0389.9s.mp3",  // 1.2s
    "mayuri_line_083_0271.3s.mp3",  // 1.1s
    "mayuri_line_066_0206.5s.mp3",  // 1.3s
  ],
  // ── WIN (victory; confident/superior 3.5-4.2s). ──
  win: [
    "mayuri_line_044_0140.8s.mp3",  // 4.2s
    "mayuri_line_015_0050.0s.mp3",  // 3.9s
    "mayuri_line_079_0245.5s.mp3",  // 3.9s
    "mayuri_line_058_0187.2s.mp3",  // 3.7s
    "mayuri_line_053_0169.0s.mp3",  // 3.7s
    "mayuri_line_002_0001.8s.mp3",  // 3.6s
    "mayuri_line_048_0158.0s.mp3",  // 3.5s
  ],
  // NAMECALL: no clip is identifiable as just his name (no transcript) → intentionally UNMAPPED (the
  // pre-match namecall skips him cleanly, mirroring the Hiruzen convention).
}

export function pickMayuriVoice(pool) {
  const arr = MAYURI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
