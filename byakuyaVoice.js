// byakuyaVoice.js
// ---------------------------------------------------------------------------
// Byakuya Kuchiki voice-line pools (audio-only; NO gameplay effect). Source = 12 clips
// ("byakuya_*.mp3", Japanese dub / Bleach). Filenames encode ONLY the source index, so
// the clips were TRANSCRIBED (faster-whisper base + VAD) to a real content log — see
// BYAKUYA_VOICE_LOG.md — NOT guessed from filenames.
//
// REALITY OF THE PACK: cold, clipped combat lines + a few short effort-grunts. ASR
// mis-flagged some sub-1s grunts as ko/pt/en, but by ear+context they are Byakuya's
// Japanese vocalizations (kept as language-neutral hitReact grunts). One 10s clip is
// pure non-speech (VAD-empty) → discarded. His Bankai incantation / "Senbonzakura
// Kageyoshi" call-outs (002/009/011) have NO ability-cast hook wired for him, so they
// are left UNWIRED (noted in the LOG) rather than mis-routed to intro/taunt.
// 12 clips → 7 wired, 5 left (1 empty + 3 bankai-callouts + 1 fragment). JA.
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — his cold pre-fight declaration
//   taunt     → combat.js applyByakuyaOffenseVoice (attacker STRONG / long connect) — "I'll finish you"
//   hitReact  → combat.js applyByakuyaHitVoice (defender got hit) — short effort grunt
//   win       → game.js _checkMatchOver (winner = Byakuya) — "This is over."
// ---------------------------------------------------------------------------

export const BYAKUYA_VOICE = {
  intro: [
    "byakuya_003.mp3",   // "守れるものなどないと知れ" — "Know that there is nothing you can protect."
  ],
  taunt: [
    "byakuya_007.mp3",   // "とどめを刺す" — "I'll deal the finishing blow."
    "byakuya_003.mp3",   // (reused) cold pre-strike declaration
  ],
  hitReact: [
    "byakuya_005.mp3",   // short grunt
    "byakuya_006.mp3",   // short grunt
    "byakuya_010.mp3",   // short "oh!" grunt
  ],
  win: [
    "byakuya_004.mp3",   // "こちらは終わった" — "This is over."
  ],
}

export function pickByakuyaVoice(pool) {
  const arr = BYAKUYA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
