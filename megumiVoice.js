// megumiVoice.js
// ---------------------------------------------------------------------------
// Megumi Fushiguro voice-line pools (audio-only; NO gameplay effect). Source = 148
// clips ("megumi_*.mp3"). Filenames encode the source index only, so every clip was
// TRANSCRIBED (faster-whisper base + VAD) to a real content log — see
// MEGUMI_VOICE_LOG.md — NOT guessed.
//
// ── LANGUAGE POLICY (Stage 3) ──
// The 148-clip rip is a MIX: 115 Japanese, 28 English-dub, 5 non-speech. Per the owner's
// decision ONLY the JAPANESE clips are wired; the 28 English clips were moved to
//  "voice lines new /megumi_english_reserve/"  (kept for a possible future English-mode,
// see RESERVE_MANIFEST.md). Language came from real ASR detection, not guesswork.
//
// Only clean short Japanese single lines are wired. JA.
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — "俺は不平等に人を助ける" ("I help people unequally") etc.
//   taunt     → combat.js applyMegumiOffenseVoice (attacker STRONG / long connect) — "I'll seriously hit you."
//   hitReact  → combat.js applyMegumiHitVoice (defender got hit) — short reaction
//   lowHealth → combat.js applyMegumiLowHealthVoice (once, crossing 30% HP) — "No time to be lying down!"
//   win       → game.js _checkMatchOver (winner = Megumi) — flat "Mission complete."
// ---------------------------------------------------------------------------

export const MEGUMI_VOICE = {
  intro: [
    "megumi_071.mp3",   // "俺は不平等に人を助ける" — "I help people unequally." (his creed)
    "megumi_072.mp3",   // "さっさと終わらせるぞ。時間はかけらんねぇ" — "Let's finish this fast — no time to waste."
    "megumi_092.mp3",   // "俺は俺ができることをやってるだけだ" — "I just do what I can."
  ],
  taunt: [
    "megumi_097.mp3",   // "マジでぶん殴りますよ" — "I'll seriously deck you."
    "megumi_049.mp3",   // "まだまだこれからだ。少し調子が出てきた" — "It's just getting started."
    "megumi_116.mp3",   // "やるんだよ" — "We're doing this."
  ],
  hitReact: [
    "megumi_132.mp3",   // "ダメだ" — "No good."
    "megumi_138.mp3",   // "なんだ？" — "What?!"
    "megumi_108.mp3",   // "きついな" — "This is rough."
  ],
  lowHealth: [
    "megumi_059.mp3",   // "寝てる場合じゃねぇ！" — "No time to be lying down!"
    "megumi_063.mp3",   // "俺が先に倒れるなんて…" — "Me, going down first…?"
  ],
  win: [
    "megumi_096.mp3",   // "任務完了ですね" — "Mission complete."
    "megumi_084.mp3",   // "ギリギリだった" — "That was close."
    "megumi_110.mp3",   // "大したことないな" — "Nothing much."
  ],
}

export function pickMegumiVoice(pool) {
  const arr = MEGUMI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
