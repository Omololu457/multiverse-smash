// kakashiVoice.js
// ---------------------------------------------------------------------------
// Kakashi Hatake voice-line pools (audio-only; NO gameplay effect). Source = 88 clips
// ("kakashi_*.mp3", Japanese dub). TRANSCRIBED (faster-whisper base + VAD) to a real
// content log — see KAKASHI_VOICE_LOG.md — NOT guessed from filenames.
//
// REALITY OF THE PACK: sourced from a co-op/team game, so a big share is teamwork /
// sensei coaching chatter ("good teamwork" / "I'm proud of you" / "leave the rest to
// me") — those are set aside as not-1v1-appropriate. The wired lines are Kakashi's
// self-contained pre-fight, taunt, victory and effort barks. Some sub-1s clips are
// short exertion grunts (kept as hitReact). JA.
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — "I'll be your opponent." / "Kakashi of the Sharingan."
//   taunt     → combat.js applyKakashiOffenseVoice (attacker STRONG / long connect) — "Underestimate me and you'll get hurt."
//   hitReact  → combat.js applyKakashiHitVoice (defender got hit) — short effort grunt
//   lowHealth → combat.js applyKakashiLowHealthVoice (once, crossing 30% HP) — "I've still got a ways to go."
//   win       → game.js _checkMatchOver (winner = Kakashi) — "That's the end. Next!"
// ---------------------------------------------------------------------------

export const KAKASHI_VOICE = {
  intro: [
    "kakashi_002.mp3",   // "先生らしく指導させてもらおうか。俺が相手になってやるよ" — "Let me instruct you… I'll be your opponent."
    "kakashi_020.mp3",   // "写輪眼のカカシ" — "Kakashi of the Sharingan."
    "kakashi_005.mp3",   // "覚悟は決まってたんだろう" — "You've resolved yourself, haven't you?"
  ],
  taunt: [
    "kakashi_014.mp3",   // "甘く見てると痛い目見るよ" — "Underestimate me and you'll get hurt."
    "kakashi_039.mp3",   // "まだまだだね" — "You've still got a long way to go."
    "kakashi_043.mp3",   // "ここまで粘るとはね" — "To hold out this long, huh."
  ],
  hitReact: [
    "kakashi_042.mp3",   // short grunt
    "kakashi_007.mp3",   // short grunt
  ],
  lowHealth: [
    "kakashi_024.mp3",   // "俺もまだまだだな" — "I've still got a ways to go myself."
  ],
  win: [
    "kakashi_028.mp3",   // "ここまでだ。次！" — "That's the end. Next!"
    "kakashi_009.mp3",   // "よくやったね" — "Well done."
  ],
}

export function pickKakashiVoice(pool) {
  const arr = KAKASHI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
