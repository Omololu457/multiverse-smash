// genosVoice.js
// ---------------------------------------------------------------------------
// Genos (One-Punch Man, the Demon Cyborg) voice-line pools (audio-only; NO gameplay
// effect). Source = 10 clips ("genos_*.mp3", English dub rip). Filenames encode only
// the source clip id, so every clip was TRANSCRIBED (faster-whisper base) to a real
// content log — see GENOS_VOICE_LOG.md — NOT guessed. Same pipeline as the Iron Man pack.
//
// REALITY OF THE PACK: 8 of the 10 clips are LONG multi-line compilation stitches
// (10–31s each — dozens of stitched battle callouts: "Burn." / "Exterminate." /
// "Incinerate." / "Machine gun blows!"). Those are unusable as a single-trigger bark
// and per the project rule are discarded (a per-line SPLIT is possible as a follow-up —
// flagged in the LOG). Only the 2 genuinely short, self-contained single lines are
// wired. 10 clips → 2 wired, 8 discarded (compilation stitches). EN.
//
// pickGenosVoice(pool) returns ONE clip at random (genuine Math.random). Callers play
// via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro → game.js INTRO_VOICE — "A hero nobody knows." (his quiet self-definition)
//   taunt → combat.js applyGenosOffenseVoice (attacker STRONG / long connect) — full-power commitment
//   (win / lowHealth / hitReact omitted — no clean single-line clip fits; see LOG)
// ---------------------------------------------------------------------------

export const GENOS_VOICE = {
  intro: [
    "genos_010.mp3",   // "A hero, nobody knows."
  ],
  taunt: [
    "genos_006.mp3",   // "Absolutely everything that I have!"
  ],
}

export function pickGenosVoice(pool) {
  const arr = GENOS_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
