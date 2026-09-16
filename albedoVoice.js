// albedoVoice.js
// ---------------------------------------------------------------------------
// Albedo (Ben 10 — the Galvan villain, Ben Tennyson's negative-colour Omnitrix double)
// voice-line pools (audio-only; NO gameplay effect). Source = 94 clips ("albedo_*.mp3",
// English — "The great quotes of Albedo" rip). The pack was FLAGGED as possibly the
// Genshin/Overlord character of the same name; TRANSCRIPTION DISPROVED that — the content
// is saturated with Ben-10-exclusive vocabulary (Ben Tennyson, the Omnitrix, Galvan Prime,
// Weapon Master, "this human body is prison enough"), unambiguously Ben 10's Albedo. See
// ALBEDO_VOICE_LOG.md for the identity ruling + per-file transcript.
//
// REALITY OF THE PACK: discards are (a) lines that NAME an ally (Grandpa/Max), (b) ~13
// near-silent non-speech clips (RMS −42…−53 dB), and (c) garbled fragments. Self-references
// Albedo OWNS (the Omnitrix, his human-body curse, Ben as his nemesis-by-identity) are kept.
// 94 clips → 15 wired. EN.
//
// pickAlbedoVoice(pool) returns ONE clip at random (genuine Math.random). Callers play
// via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — his identity grievance ("this human body is prison enough")
//   taunt     → combat.js applyAlbedoOffenseVoice (attacker STRONG / long connect) — cold contempt
//   lowHealth → combat.js applyAlbedoLowHealthVoice (once, crossing 30% HP) — "I sicken myself."
//   win       → game.js _checkMatchOver (winner = Albedo) — vengeful gloat
//   (hitReact omitted — the "blank" clips are near-silence, not clean pain-grunts; see LOG)
// ---------------------------------------------------------------------------

export const ALBEDO_VOICE = {
  intro: [
    "albedo_089.mp3",   // "This human body is prison enough."
    "albedo_018.mp3",   // "I see you got your knockoff Omnitrix working again."
    "albedo_025.mp3",   // "Not only can I transform into anything you can..."
  ],
  taunt: [
    "albedo_030.mp3",   // "You poor, gullible, simple..."
    "albedo_040.mp3",   // "Show your face."
    "albedo_070.mp3",   // "I don't need an Omnitrix to destroy you!"
    "albedo_050.mp3",   // "I almost feel bad for what we have to do to him."
    "albedo_091.mp3",   // "...and they will all suffer."
    "albedo_086.mp3",   // "I think not."
    "albedo_054.mp3",   // "You're so star-struck by your hero."
    "albedo_026.mp3",   // "...but I can also evolve those creatures to their ultimate form."
  ],
  lowHealth: [
    "albedo_014.mp3",   // "I sicken myself."
  ],
  win: [
    "albedo_039.mp3",   // "...suffering will last nearly as long as you allowed mine to."
    "albedo_033.mp3",   // "...knowing that what you desire is hopelessly beyond your reach."
  ],
}

export function pickAlbedoVoice(pool) {
  const arr = ALBEDO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
