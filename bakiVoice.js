// bakiVoice.js
// ---------------------------------------------------------------------------
// Baki Hanma voice-line pools (audio-only; NO gameplay effect). Source = 14 clips
// ("baki_*.mp3", Japanese dub). Filenames encode ONLY the source index, not content,
// so the clips were TRANSCRIBED (faster-whisper base + VAD) to a real content log —
// see BAKI_VOICE_LOG.md — NOT guessed from filenames.
//
// REALITY OF THE PACK: the rip is quiet, INTROSPECTIVE monologue (Baki musing about
// strength / his father) — there are NO combat barks and NO clean effort-grunts. So
// only intro / taunt / win fire; hitReact stays SILENT for Baki (no fitting clip, and
// the project rule is "leave a trigger empty rather than force a mismatched line").
// Several short clips are mid-sentence fragments (体がね / 俺は / …) → left UNWIRED.
// 14 clips → 6 wired, 8 left (fragments). Per-file notes in BAKI_VOICE_LOG.md. JA.
//
// pickBakiVoice(pool) returns ONE clip at random (genuine Math.random), same shape as
// pickSupermanVoice. Callers play via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro  → game.js INTRO_VOICE — humble self-intro / resolve to get stronger
//   taunt  → combat.js applyBakiOffenseVoice (attacker STRONG / long-string connect) — quiet acknowledgement of a strong foe
//   win    → game.js _checkMatchOver (winner = Baki) — "I've gotten stronger" close-out
// ---------------------------------------------------------------------------

export const BAKI_VOICE = {
  intro: [
    "baki_001.mp3",   // "頭あんまりよくないんで" — "I'm not too smart, so…" (humble opener)
    "baki_009.mp3",   // "もっと強くなります" — "I'll get even stronger."
  ],
  // Quiet acknowledgement of a strong opponent — rides the strong/long connect (no taunt action).
  taunt: [
    "baki_004.mp3",   // "…本当に強い" — "…you're really strong."
    "baki_006.mp3",   // "上には上があるという言葉が…" — "'there's always someone above'…"
  ],
  win: [
    "baki_014.mp3",   // "強くなれました" — "I was able to get stronger."
    "baki_013.mp3",   // "自分以外の人のために" — "for someone other than myself."
  ],
}

export function pickBakiVoice(pool) {
  const arr = BAKI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
