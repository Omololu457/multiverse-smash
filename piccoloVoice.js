// piccoloVoice.js
// ---------------------------------------------------------------------------
// Piccolo voice-line pools (audio-only; NO gameplay effect). Source = 20 clips
// ("piccolo_*.mp3", English dub from DBZ Extreme Butoden). TRANSCRIBED (faster-whisper
// base + VAD) to a real content log — see PICCOLO_VOICE_LOG.md — NOT guessed.
//
// REALITY OF THE PACK: several clips are 10–27s multi-line stitches (left unwired) and
// a couple are garbled. Only clean short single lines are wired. His signature
// "Special Beam Cannon!" survives inside the win line "It's over — Special Beam
// Cannon!" 20 clips → 6 wired. EN.
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — "I have new, unbelievable power!"
//   taunt     → combat.js applyPiccoloOffenseVoice (attacker STRONG / long connect) — "How do you like that?"
//   hitReact  → combat.js applyPiccoloHitVoice (defender got hit) — short flinch
//   win       → game.js _checkMatchOver (winner = Piccolo) — "It's over. Special Beam Cannon!"
// ---------------------------------------------------------------------------

export const PICCOLO_VOICE = {
  intro: [
    "piccolo_009.mp3",   // "I have new, unbelievable power!"
  ],
  taunt: [
    "piccolo_017.mp3",   // "How do you like that? It feels better, doesn't it?"
    "piccolo_014.mp3",   // "Folly!"
  ],
  hitReact: [
    "piccolo_015.mp3",   // short "Oh—!" flinch
  ],
  win: [
    "piccolo_005.mp3",   // "It's over. Special Beam Cannon!"
    "piccolo_020.mp3",   // "But there's a long, long road ahead."
  ],
}

export function pickPiccoloVoice(pool) {
  const arr = PICCOLO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
