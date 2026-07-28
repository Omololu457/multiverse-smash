// minatoVoice.js
// ---------------------------------------------------------------------------
// Minato Namikaze voice-line pools (audio-only; NO gameplay effect). Japanese
// audio from Naruto x Boruto: Ultimate Ninja Storm Connections (minatostorm_*).
// 169 clips transcribed (faster-whisper, multilingual) → 37 wired here; the rest
// were discarded as story-mode cutscene dialogue, named-character references
// (Kushina/Kakashi/Kyubi/Madara/Jiraiya/Naruto/Obito), fragments or noise. Full
// content reference: MINATO_VOICE_LOG.md.
//
// pickMinatoVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shape as pickGonVoice/pickKilluaVoice/pickRickVoice. Callers
// play via sound.playSfxFile(clip, null) — a fresh Audio per call so the voice
// overlaps the technique SFX (project convention).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro        → game.js INTRO_VOICE (round-1 match intro)
//   rasengan     → abilities.js fireMinatoRasengan / fireMinatoBigBall (Rasengan cast)
//   flyingRaijin → abilities.js fireFlyingRaijinKunai (Flying Raijin kunai throw)
//   reaper       → abilities.js fireReaperDeathSeal ("I'll risk my life" — the HP-sacrifice)
//   ult          → abilities.js executeMinatoUltimate (Kurama chakra-mode / TBB — "Hokage's power")
//   taunt+hitConnect → combat.js applyMinatoOffenseVoice (attacker lands a strong/long-string hit;
//                       no taunt ACTION exists, so the taunt pool rides offense-connect barks)
//   hitReact     → combat.js applyMinatoHitVoice (defender got hit)
//   lowHealth    → combat.js applyMinatoLowHealthVoice (once, crossing the low-HP line)
//   win          → game.js _checkMatchOver (winner = Minato)
//
// NOTE — no clean Shadow-Clone-spawn line and no dedicated chakra-mode/Kurama cast line survived
// filtering, so the clone spawn is intentionally silent and the Kurama ULT reuses two "Fourth
// Hokage's power / fate of the Hokage" lines. Reaper reuses the single "I'll risk my life" clip
// (thematically exact for its real-HP-cost sacrifice). "Hokage" (his title), "the Leaf/Konoha" (a
// place) and "Yellow Flash" (his epithet) are kept — they are not other named characters.
// ---------------------------------------------------------------------------

export const MINATO_VOICE = {
  // pre-fight (match start; no taunt action → intro-only trigger)
  intro: [
    "minatostorm_001_t00m02_1s.mp3",   // I'll finish this in an instant — alright!
    "minatostorm_006_t00m16_4s.mp3",   // here I go
    "minatostorm_023_t00m54_0s.mp3",   // I won't lose — the Yellow Flash
    "minatostorm_037_t01m23_7s.mp3",   // so much has been entrusted to me
    "minatostorm_066_t02m22_1s.mp3",   // I will protect this village
  ],

  // dismissive / condescending one-liners — ride the offense-connect bark (see NOTE)
  taunt: [
    "minatostorm_011_t00m26_1s.mp3",   // you should've been more aggressive
    "minatostorm_012_t00m29_6s.mp3",   // no problem
    "minatostorm_015_t00m37_8s.mp3",   // you can't catch me
    "minatostorm_016_t00m41_0s.mp3",   // no one can do it
    "minatostorm_018_t00m43_7s.mp3",   // you still can't reach me
    "minatostorm_024_t00m57_3s.mp3",   // did you understand a little?
    "minatostorm_027_t01m03_5s.mp3",   // at that level you can't do anything
    "minatostorm_028_t01m05_9s.mp3",   // you'll have to get stronger
    "minatostorm_034_t01m18_8s.mp3",   // worthy of praise
    "minatostorm_053_t01m52_4s.mp3",   // can you keep up with my speed?
    "minatostorm_079_t03m05_4s.mp3",   // there are things that can't be forgiven
  ],

  // Rasengan cast (Down+Special / charge Big Ball)
  rasengan: [
    "minatostorm_000_t00m00_0s.mp3",   // Let's go — Rasengan!
    "minatostorm_007_t00m18_1s.mp3",   // Rasengan, here we go!
    "minatostorm_009_t00m21_8s.mp3",   // I'm counting on you — Rasengan!
  ],

  // Flying Raijin cast (kunai throw)
  flyingRaijin: [
    "minatostorm_004_t00m11_3s.mp3",   // Raijin / Flying Thunder God (technique name)
    "minatostorm_005_t00m12_5s.mp3",   // space-time jutsu incantation (Zero Shiki)
  ],

  // Reaper Death Seal cast — the real-HP-cost sacrifice
  reaper: [
    "minatostorm_059_t02m07_9s.mp3",   // I'll risk my life
  ],

  // Kurama chakra-mode ultimate (Tailed Beast Bomb)
  ult: [
    "minatostorm_014_t00m33_9s.mp3",   // this is the Fourth Hokage's power — I won't lose
    "minatostorm_067_t02m23_4s.mp3",   // this is the fate of the Hokage!
  ],

  // attacker landed a strong/long-string hit
  hitConnect: [
    "minatostorm_019_t00m46_8s.mp3",   // this is the end
    "minatostorm_080_t03m08_2s.mp3",   // this is the final blow — come on!
    "minatostorm_089_t03m32_5s.mp3",   // this is it!
  ],

  // defender got hit
  hitReact: [
    "minatostorm_021_t00m49_1s.mp3",   // oh, nice (impressed)
    "minatostorm_047_t01m41_4s.mp3",   // I won't lose (defiance)
    "minatostorm_085_t03m22_7s.mp3",   // I'm serious now
  ],

  // crossed the low-HP line (once)
  lowHealth: [
    "minatostorm_031_t01m12_1s.mp3",   // I'll fight to the very end
    "minatostorm_033_t01m15_9s.mp3",   // the will to stand up again and again
    "minatostorm_045_t01m38_1s.mp3",   // no matter what happens to this body
    "minatostorm_046_t01m40_1s.mp3",   // there's a fight I can't back down from
  ],

  // match won
  win: [
    "minatostorm_013_t00m31_1s.mp3",   // I win — this is my...
    "minatostorm_022_t00m50_6s.mp3",   // this is my victory
    "minatostorm_025_t00m58_7s.mp3",   // this victory connects to the future
  ],
}

// ONE clip at random from a pool (fresh selection each call). Unknown pool → null (caller no-ops).
export function pickMinatoVoice(pool) {
  const arr = MINATO_VOICE[pool]
  if (!arr || !arr.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
