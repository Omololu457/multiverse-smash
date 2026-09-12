// ironManVoice.js
// ---------------------------------------------------------------------------
// Iron Man voice-line pools (audio-only; NO gameplay effect). Source = 532 clips
// ("rivals_*.mp3" + "cosmicinvasion_*.mp3", English — Marvel Rivals / Cosmic Invasion
// co-op rips). Filenames encode the source clip id only, so every clip was TRANSCRIBED
// (faster-whisper base + VAD) to a real content log — see IRON_MAN_VOICE_LOG.md — NOT
// guessed. Same pipeline as the Superman / Batman English packs.
//
// REALITY OF THE PACK: because the source is a team/co-op game, a LARGE share of the
// rip is squad chatter that NAMES allies or non-1v1 tactics (Logan / Webhead / Reed /
// Squirrel Girl / "form up around me" / "sniper get the cover"). Per the project rule
// those are ALL discarded — only self-contained, solo-appropriate quips are wired.
// Iron Man's arc-reactor / repulsor "cast" callouts ("Dual repulsor blast!", "Fully
// charged!") exist in the rip but have NO ability-cast hook wired for him yet, so they
// are left UNWIRED (noted in the LOG) rather than mis-routed. 532 clips → 11 wired. EN.
//
// pickIronManVoice(pool) returns ONE clip at random (genuine Math.random). Callers play
// via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — "I'm in solo mode." / "Feeling sharp."
//   taunt     → combat.js applyIronManOffenseVoice (attacker STRONG / long connect) — snarky trash-talk
//   lowHealth → combat.js applyIronManLowHealthVoice (once, crossing 30% HP) — "My arc reactor needs to cool down."
//   win       → game.js _checkMatchOver (winner = Iron Man) — cocky close-out
//   (hitReact intentionally omitted — the co-op rip has no clean solo pain-grunt; see LOG)
// ---------------------------------------------------------------------------

export const IRON_MAN_VOICE = {
  intro: [
    "cosmicinvasion_015.mp3",   // "I'm in solo mode."
    "rivals_366.mp3",           // "Feeling sharp."
    "cosmicinvasion_070.mp3",   // "Breaking out the hardware!"
  ],
  taunt: [
    "rivals_033.mp3",           // "Going down."
    "cosmicinvasion_038.mp3",   // "You're just a bug."
    "cosmicinvasion_074.mp3",   // "Crash and burn."
    "rivals_029.mp3",           // "That felt kind of mean."
  ],
  lowHealth: [
    "cosmicinvasion_081.mp3",   // "My arc reactor needs to cool down."
    "rivals_195.mp3",           // "Any medics around?"
  ],
  win: [
    "rivals_357.mp3",           // "Feel like a new man."
    "rivals_268.mp3",           // "But it worked out for everybody."
  ],
}

export function pickIronManVoice(pool) {
  const arr = IRON_MAN_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
