// greenLanternVoice.js
// ---------------------------------------------------------------------------
// Green Lantern (Hal Jordan) voice-line pools (audio-only; NO gameplay effect).
// Source = 11 clips ("green_lantern_*.mp3", English, Injustice-style pack).
// TRANSCRIBED (faster-whisper base + VAD) to a real content log — see
// GREEN_LANTERN_VOICE_LOG.md — NOT guessed from filenames. Same pipeline as the
// Superman / Batman / Deathstroke DC packs.
//
// REALITY OF THE PACK: 1 clip is 56s of VAD-silence (discarded) and 2 are long
// (20s / 67s) clash stitches that name Sinestro/Hal — left unwired. The remaining
// short, self-contained lines are wired below. Self-references ("Jordan") and the
// villain place/name "Sinestro" (NOT a roster fighter) are kept. EN.
//
// ── TRIGGER MAP ──
//   intro  → game.js INTRO_VOICE — "Once a Green Lantern, always a Green Lantern."
//   taunt  → combat.js applyGreenLanternOffenseVoice (attacker STRONG / long connect) — ring trash-talk
//   win    → game.js _checkMatchOver (winner = Green Lantern) — dry post-fight quip
// ---------------------------------------------------------------------------

export const GREEN_LANTERN_VOICE = {
  intro: [
    "green_lantern_009.mp3",   // "Once a Green Lantern, always a Green Lantern."
    "green_lantern_007.mp3",   // "Time to kick some ass."
    "green_lantern_006.mp3",   // "You should have joined me, like your counterpart."
  ],
  taunt: [
    "green_lantern_004.mp3",   // "Here's what I do to Sinestros."
    "green_lantern_003.mp3",   // "Head still on straight."
    "green_lantern_008.mp3",   // "Fully charged — yellow is power."
  ],
  win: [
    "green_lantern_002.mp3",   // "Guess I won't be getting any more lip from her."
  ],
}

export function pickGreenLanternVoice(pool) {
  const arr = GREEN_LANTERN_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
