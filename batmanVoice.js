// batmanVoice.js
// ---------------------------------------------------------------------------
// Batman voice-line pools (audio-only; NO gameplay effect). Source = 68 clips
// (batmaninj2_*, English audio from Injustice 2). Filenames encode ONLY the
// source timestamp, not content, so the clips were TRANSCRIBED (faster-whisper
// base.en + VAD) to a real content log — see BATMAN_VOICE_LOG.md — NOT guessed
// from filenames. Same pipeline as the Flash / Reverse Flash packs.
//
// REALITY OF THE PACK (mirrors the Flash Injustice-2 batch): a large share of the
// clips are (a) "clash" dialogue that NAMES another specific DC character (Diana/
// Superman/Clark/Joker/Beetle/Snart/Wildcat/Atrocitus/Green-Lantern-ring), (b)
// VAD-silence non-speech (grunts/impact/movement SFX ASR can't transcribe, incl.
// the classic "Thanks for watching" hallucination on silence), or (c) bare
// fragments ("But no." / "From you." / "That's new."). Per the project rule those
// are ALL discarded. Only genuinely usable, self-contained, NON-named lines are
// wired below. 68 clips → 17 wired, 51 discarded (8 named / 28 no-speech / 15
// fragment-garble). See BATMAN_VOICE_LOG.md for per-file disposition.
//
// pickBatmanVoice(pool) returns ONE clip at random (genuine Math.random()), same
// shared-helper shape as pickFlashVoice / pickGonVoice / pickKilluaVoice. Callers
// play via sound.playSfxFile(clip, null) — a fresh Audio per call so a voice line
// overlaps the move SFX and never cuts another off (project convention).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro    → game.js INTRO_VOICE (round-1 match intro) — Batman's grim pre-fight lines
//   taunt    → combat.js applyBatmanOffenseVoice (attacker STRONG / long-string connect; see NOTE)
//   hitReact → combat.js applyBatmanHitVoice (defender got hit) — the effort-grunt set
//   win      → game.js _checkMatchOver (winner = Batman) — his "back to Arkham / Gotham rises" lines
//
// NOT WIRED (flagged — no confident candidate survived the filter):
//   • special-cast pool — Batman never shouts a technique name in the pack (no "Batarang!" etc.); the
//     closest "power callout" lines all name another character and were excluded. Batman's specials
//     (Batarang / Cape Dash / Smoke Pellet / "The Dark Knight" ult) therefore keep their own move SFX
//     with NO voice bark. Flag for review if a clean cast line is ever sourced. (Flash precedent.)
//   • a SEPARATE hit-connect pool — with no dedicated "landed a hit" callouts distinct from the taunts,
//     the taunt pool rides the attacker-connect trigger (Flash/Gon/Rick precedent), covering it.
//
// NOTE — TAUNT has no dedicated mechanic: Batman has no `taunt` action (enrolling him in the universal
//   hold-Down heal-taunt would change gameplay — excluded, this pass is audio-only), so the taunt lines
//   ride the attacker strong/long-string connect trigger (Flash/Gon/Rick precedent).
// ---------------------------------------------------------------------------

export const BATMAN_VOICE = {
  // ── INTRO / grim pre-fight openers (match start) ──
  intro: [
    "batmaninj2_000_t00m18_6s.mp3",   // "You've picked your side, but we both have a job to do. It's about time you got over it."
    "batmaninj2_011_t03m35_9s.mp3",   // "The Justice League is a calling."
    "batmaninj2_022_t06m51_2s.mp3",   // "It's your chance to prove yourself."
    "batmaninj2_023_t07m13_9s.mp3",   // "Here we go again. I conquered fear long ago."
  ],

  // ── TAUNT (attacker strong / long-string connect) — cold, controlled trash-talk ──
  taunt: [
    "batmaninj2_003_t00m35_7s.mp3",   // "Don't be so sure."
    "batmaninj2_007_t02m35_8s.mp3",   // "That shadow keeps people safe."
    "batmaninj2_013_t03m43_8s.mp3",   // "I am full of surprises."
    "batmaninj2_026_t07m44_7s.mp3",   // "Loyalty was never your strength."
    "batmaninj2_027_t08m11_1s.mp3",   // "You know exactly what you're in for."
  ],

  // ── HIT-REACTION (defender got hit) — the verified effort-grunt set (clips 60-66) ──
  hitReact: [
    "batmaninj2_060_t11m06_5s.mp3",   // "Ah, ah."
    "batmaninj2_062_t11m15_2s.mp3",   // "Ahh!"
    "batmaninj2_063_t11m16_1s.mp3",   // "Ugh!"
    "batmaninj2_064_t11m18_1s.mp3",   // "Huh?!"
    "batmaninj2_065_t11m24_1s.mp3",   // "Ahh!"
    "batmaninj2_066_t11m25_8s.mp3",   // "Ahh!"
  ],

  // ── WIN (match victory) — the "you're going away / the city endures" lines ──
  win: [
    "batmaninj2_006_t01m48_4s.mp3",   // "You'll find plenty back in Arkham."
    "batmaninj2_009_t02m52_6s.mp3",   // "Gotham will rise again."
  ],
}

export function pickBatmanVoice(pool) {
  const arr = BATMAN_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
