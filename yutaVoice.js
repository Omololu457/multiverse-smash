// yutaVoice.js
// ---------------------------------------------------------------------------
// Yuta Okkotsu voice-line pools (audio-only; NO gameplay effect). Source = 485 clips
// ("yuta_*.mp3"). Filenames encode the source index only, so every clip was
// TRANSCRIBED (faster-whisper base + VAD) to a real content log — see
// YUTA_VOICE_LOG.md — NOT guessed.
//
// ── LANGUAGE POLICY (Stage 3) ──
// The 485-clip rip is overwhelmingly Japanese with a handful of English-dub clips
// (one of which, yuta_001, is an 89s English compilation). Per the owner's decision,
// ONLY the JAPANESE clips are wired; the English clips were set aside for a possible
// future English-mode in the "voice lines new/" source workspace, which was removed
// once runtime voice migrated to voice/<char>/ — recover from git history if needed.
// Language came from real ASR detection, not guesswork.
//
// Only clean short Japanese single lines are wired. JA.
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — "友達を傷つけようとする人は許さない" ("I won't forgive anyone who hurts my friends")
//   taunt     → combat.js applyYutaOffenseVoice (attacker STRONG / long connect) — "I'm definitely getting stronger."
//   hitReact  → combat.js applyYutaHitVoice (defender got hit) — short grunt
//   lowHealth → combat.js applyYutaLowHealthVoice (once, crossing 30% HP) — "I won't give up!"
//   win       → game.js _checkMatchOver (winner = Yuta) — relieved "Glad I managed to win."
// ---------------------------------------------------------------------------

export const YUTA_VOICE = {
  intro: [
    "yuta_064.mp3",   // "お前を倒すって決めたんだ" — "I've decided to defeat you."
    "yuta_344.mp3",   // "友達を傷つけようとする人は許さない" — "I won't forgive anyone who hurts my friends."
    "yuta_311.mp3",   // "緊張するなぁ" — "…I'm getting nervous."
  ],
  taunt: [
    "yuta_343.mp3",   // "確実に強くなってる" — "I'm definitely getting stronger."
    "yuta_121.mp3",   // "最短距離だ！" — "The shortest path!"
  ],
  hitReact: [
    "yuta_142.mp3",   // short grunt
    "yuta_070.mp3",   // short grunt
  ],
  lowHealth: [
    "yuta_112.mp3",   // "諦めない！" — "I won't give up!"
  ],
  win: [
    "yuta_345.mp3",   // "なんとか倒せてよかった" — "Glad I managed to beat them."
    "yuta_367.mp3",   // "そういってもらえると嬉しいよ" — "It makes me happy to hear that."
    "yuta_160.mp3",   // "終わりにしよう" — "Let's end this."
  ],
}

export function pickYutaVoice(pool) {
  const arr = YUTA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
