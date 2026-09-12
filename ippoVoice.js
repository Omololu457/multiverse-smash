// ippoVoice.js
// ---------------------------------------------------------------------------
// Ippo Makunouchi voice-line pools (audio-only; NO gameplay effect). Source = 191 clips
// ("ippo_*.mp3", Japanese dub — Hajime no Ippo). Filenames encode the source index only,
// so every clip was TRANSCRIBED (faster-whisper base + VAD) to a real content log — see
// IPPO_VOICE_LOG.md — NOT guessed. (Transcribed in the prior batch but never wired; picked
// up in this voice-file scrub.)
//
// REALITY OF THE PACK: it's a boxing anime, so most clips are mid-bout internal monologue.
// A large share references specific ring opponents (Sawamura / Miyata / Sendo — none of them
// roster fighters, so not auto-discarded, but preferred-against here for clean 1v1 lines).
// Only clean, short, self-contained Japanese lines are wired. 191 clips → 12 wired. JA.
//
// pickIppoVoice(pool) returns ONE clip at random (genuine Math.random). Callers play via
// sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — humble/determined challenger openers
//   taunt     → combat.js applyIppoOffenseVoice (attacker STRONG / long connect) — "I felt that connect!"
//   hitReact  → combat.js applyIppoHitVoice (defender got hit) — short reaction
//   lowHealth → combat.js applyIppoLowHealthVoice (once, crossing 30% HP) — "I'm still fine — I can still go!"
//   win       → game.js _checkMatchOver (winner = Ippo) — determined finisher
// ---------------------------------------------------------------------------

export const IPPO_VOICE = {
  intro: [
    "ippo_165.mp3",   // "挑戦者なんだから！最初から最後まで、ガンガン行くぞ！" — "I'm the challenger — I'll go all out, start to finish!"
    "ippo_168.mp3",   // "お互い頑張りましょう！" — "Let's both give it our all!"
    "ippo_167.mp3",   // "最初から行きますよ！" — "I'm coming at you from the start!"
  ],
  taunt: [
    "ippo_100.mp3",   // "手ごたえあった！" — "I felt that connect!"
    "ippo_147.mp3",   // "手ごたえはあったぞ！" — "That one landed!"
    "ippo_133.mp3",   // "基本に戻るんだ！よし！" — "Back to basics — alright!"
  ],
  hitReact: [
    "ippo_164.mp3",   // "ぼくは！" — clipped reaction
    "ippo_069.mp3",   // short reaction
  ],
  lowHealth: [
    "ippo_120.mp3",   // "僕はまだ元気！まだやれる！" — "I'm still good — I can still fight!"
    "ippo_188.mp3",   // "まだやるぞ！" — "I'm not done yet!"
  ],
  win: [
    "ippo_125.mp3",   // "これで終わりにしてください！" — "Let this be the finish!"
    "ippo_158.mp3",   // "今度こそ！納得行くまでやってやる！" — "This time — I'll go until I'm satisfied!"
  ],
}

export function pickIppoVoice(pool) {
  const arr = IPPO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
