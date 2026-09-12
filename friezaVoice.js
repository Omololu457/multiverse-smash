// friezaVoice.js
// ---------------------------------------------------------------------------
// Frieza voice-line pools (audio-only; NO gameplay effect). Source = 10 clips
// ("frieza_*.mp3", English dub from DBZ Extreme Butoden). TRANSCRIBED (faster-whisper
// base + VAD) to a real content log — see FRIEZA_VOICE_LOG.md — NOT guessed from names.
//
// REALITY OF THE PACK: 7 of the 10 clips are LONG multi-line stitches (8–59s
// compilations, incl. the "Just call me Golden Frieza" transform monologue). A single
// stitched clip fits no one trigger, so those are left UNWIRED (LOG). Only 3 short,
// self-contained villain lines survive — so Frieza gets a taunt + a low-HP line, and
// his intro/win triggers are intentionally left SILENT (no clean clip; the project
// rule is "leave a trigger empty rather than force a mismatched/over-long line").
// 10 clips → 3 wired, 7 compilations. EN.
//
// ── TRIGGER MAP ──
//   taunt     → combat.js applyFriezaOffenseVoice (attacker STRONG / long connect) — cruel trash-talk
//   lowHealth → combat.js applyFriezaLowHealthVoice (once, crossing 30% HP) — "That actually hurt."
//   (intro / win intentionally omitted — no clean short clip; see LOG)
// ---------------------------------------------------------------------------

export const FRIEZA_VOICE = {
  taunt: [
    "frieza_007.mp3",   // "Now — start begging for your life!"
    "frieza_008.mp3",   // "I must admit, your training has borne fruit."
  ],
  lowHealth: [
    "frieza_009.mp3",   // "…that actually hurt." (rare admission)
  ],
}

export function pickFriezaVoice(pool) {
  const arr = FRIEZA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
