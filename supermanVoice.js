// supermanVoice.js
// ---------------------------------------------------------------------------
// Superman voice-line pools (audio-only; NO gameplay effect). Source = 113 clips
// (superman_*, English audio from Injustice 2). Filenames encode ONLY the source
// timestamp, not content, so the clips were TRANSCRIBED (faster-whisper base.en +
// VAD) to a real content log — see SUPERMAN_VOICE_LOG.md — NOT guessed from
// filenames. Same pipeline as the Reverse Flash / Batman / Omni-Man packs.
//
// REALITY OF THE PACK (mirrors the Batman Injustice-2 batch): a large share of the
// clips are (a) Regime "clash" dialogue that NAMES another specific DC fighter
// (Bruce/Barry/Diana/Harley/Bane/Brainiac/Grodd/Sinestro/Hal/Blue-Beetle/Aquaman/
// Black-Adam/Cyborg/Swamp-Thing), (b) VAD-silence non-speech (grunts/impact/movement
// SFX ASR can't transcribe), or (c) disjoint multi-line stitches / bare fragments.
// Per the project rule those are ALL discarded. Only genuinely usable, self-contained,
// NON-named lines are wired below. Self-references and place-names Superman OWNS (Earth,
// Krypton) are kept (Batman-Gotham/Arkham precedent). 113 clips → 29 wired, 84 discarded
// (17 named / 28 no-speech / 39 fragment-garble). See SUPERMAN_VOICE_LOG.md per-file.
//
// pickSupermanVoice(pool) returns ONE clip at random (genuine Math.random()), same
// shared-helper shape as pickBatmanVoice / pickOmniManVoice. Callers play via
// sound.playSfxFile(clip, null) — a fresh Audio per call so a voice line overlaps
// the move SFX and never cuts another off (project convention).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro     → game.js INTRO_VOICE (round-1 match intro) — Superman's pre-fight declarations
//   cast      → abilities.js executeSupermanSpecial (Heat Vision / Flying Punch), enterSuperman{SolarFlare,
//               Overload} (mode activation), executeSupermanUltimate, and flight-toggle ON. Power-flavored
//               lines ("I'm just warming up", "You're tugging on the wrong cape"), cooldown-gated.
//   taunt     → combat.js applySupermanOffenseVoice (attacker STRONG / long-string connect; see NOTE)
//   hitReact  → combat.js applySupermanHitVoice (defender got hit) — the effort-grunt set
//   lowHealth → combat.js applySupermanLowHealthVoice (once, crossing the 30% HP line)
//   win       → game.js _checkMatchOver (winner = Superman) — his justice-served victory lines
//
// NOTE — TAUNT rides the offense-connect trigger: Superman HAS a `taunt` action (universal hold-Down
//   heal), but binding a voice bark to a heal is off-pattern — the trash-talk pool rides the attacker
//   strong/long-string connect instead (Batman/Omni-Man/Flash precedent). Audio-only; no gameplay change.
// ---------------------------------------------------------------------------

export const SUPERMAN_VOICE = {
  // ── INTRO / pre-fight declarations (match start) ──
  intro: [
    "superman_008_t01m19_4s.mp3",   // "There won't be any ties today. I haven't forgotten."
    "superman_009_t01m30_5s.mp3",   // "Traitors, all of you. I was right to lock you up."
    "superman_021_t03m11_5s.mp3",   // "I'm the hero Earth needs."
  ],

  // ── SPECIAL / FLIGHT / MODE / ULTIMATE cast (power-buildup flavor) ──
  cast: [
    "superman_026_t03m33_4s.mp3",   // "I'm just warming up."
    "superman_038_t05m22_1s.mp3",   // "You asked for it. For Krypton."
    "superman_052_t06m13_8s.mp3",   // "You're tugging on the wrong cape."
    "superman_056_t06m30_4s.mp3",   // "All those weapons against my bare hands?"
  ],

  // ── TAUNT (attacker strong / long-string connect) — confident trash-talk ──
  taunt: [
    "superman_003_t00m55_5s.mp3",   // "Then you know you can't win."
    "superman_004_t00m57_4s.mp3",   // "Time to grow up."
    "superman_024_t03m28_4s.mp3",   // "And you clearly don't know me. I thought you understood sarcasm."
    "superman_047_t05m52_8s.mp3",   // "How can you question me?"
    "superman_050_t06m02_1s.mp3",   // "You need an upgrade."
    "superman_060_t06m51_2s.mp3",   // "Want some honest feedback?"
    "superman_067_t08m15_3s.mp3",   // "What happens next is on you. You have to earn my respect."
    "superman_071_t08m56_0s.mp3",   // "Give up or get hurt. Everyone says that the first time."
    "superman_073_t09m23_2s.mp3",   // "Now, what purpose will this serve?"
  ],

  // ── HIT-REACTION (defender got hit) — the verified effort-grunt set (clips 96-112) ──
  hitReact: [
    "superman_096_t10m32_9s.mp3",   // "Huh? Huh?"
    "superman_097_t10m35_4s.mp3",   // "Ugh!"
    "superman_098_t10m45_2s.mp3",   // "Ah!"
    "superman_099_t10m46_4s.mp3",   // "Ah!"
    "superman_100_t10m47_6s.mp3",   // "Ugh!"
    "superman_103_t10m51_3s.mp3",   // "Ahhh!"
    "superman_106_t11m06_3s.mp3",   // "Ahhh!"
    "superman_108_t11m08_7s.mp3",   // "Ugh."
    "superman_111_t11m12_4s.mp3",   // "Ugh!"
    "superman_112_t11m13_9s.mp3",   // "Ah!"
  ],

  // ── LOW HEALTH (once, crossing the 30% line — still defiant) ──
  lowHealth: [
    "superman_049_t05m58_3s.mp3",   // "What you have can't be cured. I'll never stop fighting."
  ],

  // ── WIN (match victory) — justice-served lines ──
  win: [
    "superman_025_t03m32_2s.mp3",   // "Crime doesn't pay."
    "superman_069_t08m49_6s.mp3",   // "Please don't get up."
  ],
}

// Random pick from a pool (genuine Math.random — same shape as pickBatmanVoice/pickOmniManVoice).
export function pickSupermanVoice(pool) {
  const arr = SUPERMAN_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
