// gohanVoice.js
// ---------------------------------------------------------------------------
// Teen Gohan voice-line pools (audio-only; NO gameplay effect). Source = 55 clips
// ("gohan_*.mp3", English dub from DBZ Extreme Butoden). TRANSCRIBED (faster-whisper
// base + VAD) to a real content log — see GOHAN_VOICE_LOG.md — NOT guessed from
// filenames.
//
// REALITY OF THE PACK: a LARGE share of the rip is friendly post-battle DIALOGUE
// (Gohan thanking/addressing allies — Krillin, Videl, Vegeta, Boo…). Those are set
// aside; only self-contained combat-appropriate lines are wired. A few sub-word
// fragments + 3 VAD-empty clips are left unwired (LOG). EN.
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — his curious, polite challenge ("How much more power are you hiding?")
//   taunt     → combat.js applyGohanOffenseVoice (attacker STRONG / long connect) — "Take this!"
//   hitReact  → combat.js applyGohanHitVoice (defender got hit) — short flinch
//   win       → game.js _checkMatchOver (winner = Gohan) — humble team-victory lines
// ---------------------------------------------------------------------------

export const GOHAN_VOICE = {
  intro: [
    "gohan_043.mp3",   // "How much more power are you hiding?"
    "gohan_020.mp3",   // "Would you mind fighting me again?"
  ],
  taunt: [
    "gohan_009.mp3",   // "Take this!"
  ],
  hitReact: [
    "gohan_002.mp3",   // "Oh no!" (flinch)
    "gohan_022.mp3",   // short "—me!" grunt
  ],
  win: [
    "gohan_045.mp3",   // "…you still haven't lost your edge."
    "gohan_048.mp3",   // "Nobody could take us down."
  ],
}

export function pickGohanVoice(pool) {
  const arr = GOHAN_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
