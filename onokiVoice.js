// onokiVoice.js
// ---------------------------------------------------------------------------
// Onoki (Ohnoki, the Third Tsuchikage) voice-line pools (audio-only; NO gameplay
// effect). Source = 30 clips ("onoki_*.mp3", Japanese — Naruto Storm rip). Filenames
// encode only the source clip id, so every clip was TRANSCRIBED + TRANSLATED
// (faster-whisper base, JA transcript + EN translate pass) to a real content log —
// see ONOKI_VOICE_LOG.md — NOT guessed. Same pipeline as the Superman / Iron Man packs.
//
// REALITY OF THE PACK: a large share is (a) story dialogue that NAMES an ally/opponent
// (Naruto / Hokage / Madara) or is a TEAM line ("we'll stop him"), or (b) long multi-
// line compilation stitches (7–22s). Per the project rule those are ALL discarded —
// only self-contained, solo-appropriate single lines are wired. 30 clips → 6 wired. JA.
//
// pickOnokiVoice(pool) returns ONE clip at random (genuine Math.random). Callers play
// via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — "未来のために" ("For the future") resolve lines
//   taunt     → combat.js applyOnokiOffenseVoice (attacker STRONG / long connect) — his
//               Jinton (Dust Release) technique callout + "this ends here"
//   lowHealth → combat.js applyOnokiLowHealthVoice (once, crossing 30% HP) — "I can still fight!"
//   win       → game.js _checkMatchOver (winner = Onoki) — "you're the one going to sleep"
//   (hitReact intentionally omitted — the rip has no clean isolated solo pain-grunt; see LOG)
// ---------------------------------------------------------------------------

export const ONOKI_VOICE = {
  intro: [
    "onoki_003.mp3",   // "未来のために" — "For the future."
    "onoki_012.mp3",   // "未来のために" — "For the future's sake." (alt take)
  ],
  taunt: [
    "onoki_021.mp3",   // "超軽量化の術、塵遁！" — "Super-Light-Weight Rock jutsu — Dust Release (Jinton)!" (his signature technique callout)
    "onoki_019.mp3",   // "ここで終わりだぜ！" — "This ends here!"
  ],
  lowHealth: [
    "onoki_017.mp3",   // "私はまだやれるぞ！お前を倒す！" — "I can still fight! I'll defeat you!"
  ],
  win: [
    "onoki_030.mp3",   // "眠るのはあんたじゃぜ" — "You're the one who's going to sleep."
  ],
}

export function pickOnokiVoice(pool) {
  const arr = ONOKI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
