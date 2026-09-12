// vilgaxVoice.js
// ---------------------------------------------------------------------------
// Vilgax voice-line pools (audio-only; NO gameplay effect). Source = 20 clips
// ("vilgax_*.mp3", English). TRANSCRIBED (faster-whisper base + VAD) to a real content
// log — see VILGAX_VOICE_LOG.md — NOT guessed.
//
// REALITY OF THE PACK: this is a THIN rip — 12 of 20 clips are pure non-speech
// (VAD-empty movement/impact SFX), 1 is a 23s multi-line stitch (his "How I love to
// watch you squirm" gloat — too long to wire), leaving only a lone attack shout and a
// couple of effort grunts. So Vilgax gets a minimal taunt + hitReact and NOTHING else;
// intro / win / lowHealth are intentionally left SILENT (no clean clip). 20 clips →
// 3 wired. EN. (A future pass could hand-trim the 23s gloat into an intro line.)
//
// ── TRIGGER MAP ──
//   taunt     → combat.js applyVilgaxOffenseVoice (attacker STRONG / long connect) — "Die!"
//   hitReact  → combat.js applyVilgaxHitVoice (defender got hit) — short grunt
// ---------------------------------------------------------------------------

export const VILGAX_VOICE = {
  taunt: [
    "vilgax_018.mp3",   // "Die!"
  ],
  hitReact: [
    "vilgax_002.mp3",   // short "Oh—!" grunt
    "vilgax_015.mp3",   // short impact grunt
  ],
}

export function pickVilgaxVoice(pool) {
  const arr = VILGAX_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
