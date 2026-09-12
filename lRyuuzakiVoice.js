// lRyuuzakiVoice.js
// ---------------------------------------------------------------------------
// L (Ryuzaki) voice-line pools (audio-only; NO gameplay effect). Source = 13 clips
// ("l_ryuuzaki_*.mp3", mostly English dub + 2 JA). TRANSCRIBED (faster-whisper base +
// VAD) to a real content log — see L_RYUUZAKI_VOICE_LOG.md — NOT guessed.
//
// REALITY OF THE PACK: L is a detective, not a brawler — the rip is his famous
// "many types of monsters in this world" MONOLOGUE (a single speech split across
// several clips) plus a couple of asides. One JA clip ("Yagami-kun!") NAMES Light
// Yagami (a roster fighter, rosterKey "light") → discarded per the project's
// named-fighter rule. There is NO clean victory or low-HP line → win/lowHealth are
// intentionally left SILENT. 13 clips → 6 wired. Mixed (EN monologue wired).
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — his cryptic "monsters in this world" opener
//   taunt     → combat.js applyLRyuuzakiOffenseVoice (attacker STRONG / long connect) — detached observations
//   hitReact  → combat.js applyLRyuuzakiHitVoice (defender got hit) — a puzzled "Huh?"
// ---------------------------------------------------------------------------

export const L_RYUUZAKI_VOICE = {
  intro: [
    "l_ryuuzaki_001.mp3",   // "There are many types of monsters in this world."
    "l_ryuuzaki_005.mp3",   // "Lying monsters are a real nuisance…"
  ],
  taunt: [
    "l_ryuuzaki_004.mp3",   // "…and monsters who always tell lies."
    "l_ryuuzaki_006.mp3",   // "They pose as humans, even though they have no understanding of the human heart."
  ],
  hitReact: [
    "l_ryuuzaki_010.mp3",   // "Huh?" (puzzled)
  ],
}

export function pickLRyuuzakiVoice(pool) {
  const arr = L_RYUUZAKI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
