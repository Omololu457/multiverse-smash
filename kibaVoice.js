// kibaVoice.js
// ---------------------------------------------------------------------------
// Kiba Inuzuka (+ Akamaru) voice-line pools (audio-only; NO gameplay effect). 20 provided clips, ALL
// UNIDENTIFIED Japanese (silence-gap segmentation only — no transcript/translation). Mapped by TRIGGER +
// ACOUSTIC FEATURE (duration + measured RMS energy), NOT content — same approach as jasonVoice.js /
// orochimaruVoice.js. Filenames are the provided originals, PRESERVED EXACTLY (start-offset suffixes).
// pickKibaVoice(pool) → ONE clip at random; callers play it via sound.playSfxFile(clip, null). No combat
// logic is touched by this module.
//
// ── LONG-CLIP REVIEW (the 4 flagged 08/09/14/20 + two the flag missed: 13/16) ──
//   Measured durations + RMS envelopes (0.3s windows) + silencedetect:
//     08 (8.2s) energetic ~-14dB, continuous (only a trailing gap) → ONE line.
//     09 (7.0s) quieter ~-17dB, one soft dip @3.6s → kept whole (short; a hard cut risks mid-word).
//     13 (12.6s) continuous, NO gaps → one long line (banked — too long for a repeating trigger).
//     14 (8.0s) energetic ~-13dB, continuous, no gaps → ONE line.
//     16 (17.0s) HARD silence gap @8.08s → genuinely TWO lines → SPLIT into 16a (0–8.05s) + 16b (8.42s+),
//                both ~8s and the LOUDEST material (~-12dB) = the most dramatic → 16a → ULTIMATE.
//     20 (13.6s) only SOFT background-masked dips (as flagged) → NOT split (cuts would land mid-word) → banked.
//   BANKED / unused (available dramatic extras): 13, 16b, 20.
//
// ── TRIGGER MAP (hooks in game.js / abilities.js / combat.js) ──
//   intro         → pre-match reveal beat                         game.js INTRO_VOICE table
//   effort        → LIGHT normal (fang-claw flurry) strike shout   combat.applyKibaAttackVoice
//   gatsugaWeak   → Weak Gatsuga cast (neutral Special)            abilities.fireKibaGatsuga
//   gatsugaStrong → Strong Gatsuga cast (Forward Special)          abilities.fireKibaGatsuga
//   fourLegs      → Four Legs Technique transform (Down Special)   abilities.fireKibaFourLegs
//   twoHeaded     → Two-Headed Wolf cast (Up Special)              abilities.fireKibaGatsuga
//   ultimate      → Three-Headed Wolf ultimate (U)                 abilities.executeKibaUltimate
//   hitLight      → takes a LIGHT hit — random pained grunt         combat.applyKibaHitVoice
//   hitHeavy      → takes a HEAVY/strong hit — defiant yelp         combat.applyKibaHitVoice
//   knockdown     → knocked down                                   combat.js knockdown watcher
//   win           → victory                                        game.js win dispatch
//
// ── NOTES / open items ──
//   * FROG MODE is NOT a trigger — it was DROPPED from the build (its source art was non-Kiba toad-summon
//     creatures). No slot exists, so no clip is assigned to it.
//   * NAMECALL: no clip is confirmed to be purely his name (all unidentified). The shortest clip (line_11,
//     0.94s — the most name-like) is FOLDED INTO the `intro` pool (the reveal is the natural namecall beat)
//     rather than forcing a separate hook. Flag: content unverified — re-home if line_11 turns out to be a grunt.
// ---------------------------------------------------------------------------

export const KIBA_VOICE = {
  // INTRO / pre-match reveal — his fuller pre-match lines + the short name-like bark (line_11).
  intro: [
    "kiba_line_04_0009.0s.mp3",   // 5.8s medium line
    "kiba_line_01_0000.0s.mp3",   // 2.5s line
    "kiba_line_11_0044.2s.mp3",   // 0.9s — shortest / most name-like (folded-in namecall, content unverified)
  ],
  // LIGHT normal effort — short strike shouts (gated so a fast flurry doesn't machine-gun).
  effort: [
    "kiba_line_10_0042.0s.mp3",   // 2.0s
    "kiba_line_06_0019.5s.mp3",   // 1.3s
  ],
  // WEAK GATSUGA cast (neutral Special).
  gatsugaWeak: [
    "kiba_line_05_0015.4s.mp3",   // 3.3s
    "kiba_line_12_0045.5s.mp3",   // 2.2s
  ],
  // STRONG GATSUGA cast (Forward Special) — a bigger, punchier cast.
  gatsugaStrong: [
    "kiba_line_07_0021.5s.mp3",   // 4.1s
  ],
  // FOUR LEGS transformation (Down Special) — a DISTINCT, ENERGETIC clip (per the build brief's priority).
  fourLegs: [
    "kiba_line_14_0060.9s.mp3",   // 8.0s, continuous, energetic ~-13dB
  ],
  // TWO-HEADED WOLF cast (Up Special) — another energetic transformation shout.
  twoHeaded: [
    "kiba_line_08_0025.9s.mp3",   // 8.2s, continuous, energetic ~-14dB
  ],
  // THREE-HEADED WOLF ultimate — the LONGEST/most dramatic clean line (the loudest half of the 17s clip 16).
  ultimate: [
    "kiba_line_16a.mp3",          // 8.05s, split at the hard @8.08s gap — a COMPLETE, energetic dramatic line
  ],
  // HIT REACTION (light) — short pained grunts.
  hitLight: [
    "kiba_line_02_0003.0s.mp3",   // 1.9s
    "kiba_line_17_0091.9s.mp3",   // 2.6s
  ],
  // HIT REACTION (heavy/strong) — bigger defiant yelps.
  hitHeavy: [
    "kiba_line_18_0094.9s.mp3",   // 3.5s
    "kiba_line_03_0005.5s.mp3",   // 3.0s
  ],
  // KNOCKDOWN — a longer fall/groan line.
  knockdown: [
    "kiba_line_09_0034.5s.mp3",   // 7.0s (quieter)
    "kiba_line_15_0069.3s.mp3",   // 4.9s
  ],
  // WIN — confident victory line.
  win: [
    "kiba_line_19_0098.7s.mp3",   // 2.8s
  ],
}

export function pickKibaVoice(pool) {
  const arr = KIBA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
