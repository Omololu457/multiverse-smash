// vegetaVoice.js
// ---------------------------------------------------------------------------
// Vegeta voice-line pools (audio-only; NO gameplay effect). 33 clips transcribed
// + hand-reviewed from 48 FighterZ sources (26 vegeta_ssj_* + 22 vegeta_blue_*);
// see VEGETA_VOICE_LOG.md for the full transcription + per-clip discard decisions.
//
// WHOLE-CHARACTER POOLS (per the wiring brief): survivors from BOTH the ssj_ and
// blue_ sources are merged into SHARED, FORM-AGNOSTIC pools that fire across ALL of
// Vegeta's forms (base / SSJ / Blue) — NOT partitioned by source file. No surviving
// line names a form-unique technique, so nothing is form-gated (the one form-ish
// line, blue_019 "legendary Super Saiyan…", was discarded for naming Kakarot). His
// signature techniques (Galick Gun / Big Bang / Final Flash) exist in every form, so
// their cast pools are shared too.
//
// pickVegetaVoice(pool) returns ONE clip at random (genuine Math.random selection,
// same shape as pickSamuraiVoice / pickRengokuVoice). Callers play via
// sound.playSfxFile(clip, null); the single-voice-channel (no self-overlap) is
// handled by sound._voiceOwner.
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro      → game.js INTRO_VOICE (round-1 match intro / battle start)
//   win        → game.js round-end WINNER block (victory line)
//   galickGun  → abilities.js executeVegetaSpecial, D→F Galick Gun branch (cast line)
//   bigBang    → abilities.js executeVegetaSpecial, neutral Big Bang branch (cast line)
//   finalFlash → abilities.js executeVegetaSpecial, D→B Final Flash branch (cast line)
//   ultimate   → abilities.js executeVegetaUltimate (Overcharged Final Flash cast)
//   combatBark → combat.js applyVegetaOffenseVoice (attacker lands a HEAVY / long-string connect)
//   hitReact   → combat.js applyVegetaHitVoice (defender got hit — general reaction)
//   lowHealth  → combat.js applyVegetaLowHealthVoice (once, crossing the low-HP line)
//
// ── NOTES / flagged decisions ──
//   • TAUNT has no dedicated trigger: Vegeta has no `taunt` action in characters.js, and enrolling him
//     in the universal hold-Down heal-taunt would change GAMEPLAY (excluded — audio-only pass). Per the
//     Batman/Superman/Rengoku precedent, his trash-talk lines RIDE the offense-connect trigger
//     (folded into `combatBark`). Flagged.
//   • combatBark carries the 7 "I won't lose to you!" takes (ssj_011-017): distinct audio takes of the
//     same line, kept as usable variety (random still varies across the other 8 lines in the pool).
//   • Special/ultimate cast lines set _atkVoiceCd on cast so they don't ALSO trigger the offense
//     combatBark on connect (no cast+connect double — same guard Samurai/Rengoku use); the cast fire is
//     itself gated on _atkVoiceCd<=0 so rapid special spam doesn't stack voice lines.
//   • Technique cast pools are matched to the technique (bigBang line only on Big Bang, etc.) so the
//     callout never names the wrong move.
// ---------------------------------------------------------------------------

export const VEGETA_VOICE = {
  // ── INTRO — confrontational openers + iconic self-intro (fires at match start) ──
  intro: [
    "vegeta_blue_021_t05m46_2s.mp3",   // "And I am Vegeta, Prince of the Saiyans!"
    "vegeta_ssj_022_t04m16_8s.mp3",    // "Show me this power of yours! Don't make me laugh!"
    "vegeta_blue_018_t03m50_7s.mp3",   // "I'm going to have fun destroying you! I have the power too!"
    "vegeta_ssj_008_t02m08_8s.mp3",    // "That's it, huh? Looks like someone's been slacking off on their training!"
  ],

  // ── WIN — victory monologues (fires only when the WINNER is Vegeta) ──
  win: [
    "vegeta_blue_009_t02m16_9s.mp3",   // "Remember it well. This isn't even the full extent of my power. Try and surpass me if you can."
    "vegeta_blue_010_t02m22_6s.mp3",   // "It won't be easy. Don't expect to get a thanks from me."
    "vegeta_ssj_023_t05m30_5s.mp3",    // "You were always a simpleton… That was a feeble effort."
  ],

  // ── COMBAT BARK — offense heavy / long-string connect (folds in the taunt lines, no taunt action) ──
  combatBark: [
    "vegeta_ssj_007_t02m07_1s.mp3",    // "You half-wits, huh?"
    "vegeta_ssj_010_t02m27_0s.mp3",    // "I know how to dispose of you!"
    "vegeta_ssj_011_t02m29_2s.mp3",    // "I won't lose to you!" (take 1)
    "vegeta_ssj_012_t02m30_9s.mp3",    // "I won't lose to you!" (take 2)
    "vegeta_ssj_013_t02m32_6s.mp3",    // "I won't lose to you!" (take 3)
    "vegeta_ssj_014_t02m34_3s.mp3",    // "I won't lose to you!" (take 4)
    "vegeta_ssj_015_t02m35_9s.mp3",    // "I won't lose to you!" (take 5)
    "vegeta_ssj_016_t02m37_6s.mp3",    // "I won't lose to you!" (take 6)
    "vegeta_ssj_017_t02m39_3s.mp3",    // "I won't lose to you!" (take 7)
    "vegeta_ssj_020_t03m30_8s.mp3",    // "If you're so tough, then survive this!"
    "vegeta_blue_005_t01m29_4s.mp3",   // "You're as good as space dust!"
    "vegeta_blue_008_t01m38_2s.mp3",   // "Why you, you worthless piece of junk!"
    "vegeta_blue_014_t03m09_2s.mp3",   // "Don't underestimate a Saiyan!"
    "vegeta_blue_016_t03m35_4s.mp3",   // "…what it means to fight to protect something!"
    "vegeta_blue_020_t05m44_6s.mp3",   // "It's because you're a fake!"
  ],

  // ── HIT-REACTION — defender got hit (general reaction) ──
  hitReact: [
    "vegeta_ssj_000_t00m14_4s.mp3",    // "Ugh, ridiculous!"
    "vegeta_ssj_001_t00m24_1s.mp3",    // "Damn you!"
    "vegeta_ssj_002_t00m36_0s.mp3",    // "Damn you!"
    "vegeta_blue_001_t00m34_5s.mp3",   // "Damn you!"
  ],

  // ── LOW-HEALTH — once, crossing the low-HP line (being overwhelmed) ──
  lowHealth: [
    "vegeta_blue_000_t00m19_3s.mp3",   // "Impossible! Gah!"
    "vegeta_ssj_009_t02m24_2s.mp3",    // "Where does all that speed and power come from?"
  ],

  // ── GALICK GUN cast (D→F) — technique-matched ──
  galickGun: [
    "vegeta_blue_003_t01m16_1s.mp3",   // "Take this!"
    "vegeta_blue_015_t03m18_4s.mp3",   // "Eat this! …gone!"
  ],

  // ── BIG BANG ATTACK cast (neutral) — technique-matched ──
  bigBang: [
    "vegeta_ssj_003_t01m18_8s.mp3",    // "I hope you're ready, Big Bang Attack!"
  ],

  // ── FINAL FLASH cast (D→B special) — technique-matched ──
  finalFlash: [
    "vegeta_ssj_005_t01m27_8s.mp3",    // "You cocky bastard, final blast!"
  ],

  // ── OVERCHARGED FINAL FLASH — ultimate cast ──
  ultimate: [
    "vegeta_ssj_004_t01m22_0s.mp3",    // "Are you brave enough to take this one? Final Flash!"
  ],
}

export function pickVegetaVoice(pool) {
  const arr = VEGETA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
