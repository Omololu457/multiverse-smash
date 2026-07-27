// flashVoice.js
// ---------------------------------------------------------------------------
// The Flash voice-line pools (audio-only; NO gameplay effect). Source = 120 clips
// (flashinj2_*, English audio from Injustice 2). Filenames encode ONLY the source
// timestamp, not content, so the clips were TRANSCRIBED (faster-whisper small.en + VAD)
// to a real content log — see FLASH_VOICE_LOG.md — NOT guessed from filenames.
//
// REALITY OF THE PACK: only clips 0-24 carry speech/grunts; 25-119 are non-speech
// (VAD found no speech) = combat grunts / effort / impact-or-movement SFX that ASR
// can't transcribe. Per the project rule, lines that name another specific character
// are EXCLUDED (Injustice "clash" lines: Lawton/Floyd=Deadshot, Vic=Cyborg, Dinah=
// Black Canary, Katniss), and unclear/fragment + unverifiable non-speech clips are
// HELD (not wired) rather than force-fit. Only VERIFIED, filter-passing clips below.
//
// pickFlashVoice(pool) returns ONE clip at random (genuine Math.random()), same shape
// as pickRickVoice/pickKilluaVoice. Played via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro    → game.js INTRO_VOICE (round-1 match intro) — Flash's boast / pre-fight warning
//   taunt    → combat.js applyFlashOffenseVoice (attacker strong/long-string connect; see NOTE)
//   hitReact → combat.js applyFlashHitVoice (defender got hit) — one spoken line + effort-grunt set
//
// NOT WIRED (flagged, no confident candidate among transcribable clips):
//   • special-cast pool — no clip clearly reads as a technique callout (the closest, "Enough to
//     warp space-time — the Flash", is inside a clip that names Cyborg → excluded).
//   • win-line pool — no clip clearly reads as a post-victory line.
//   • ~90 non-speech clips (25,27-119) + ~13 unclear/fragment clips — HELD for human review; can be
//     bulk-pooled as a hit-reaction/effort grunt set once a human confirms they're grunts (not SFX).
//
// NOTE — TAUNT has no dedicated mechanic: Flash has no `taunt` action (the universal heal-taunt would
//   change gameplay — excluded), so the taunt lines ride the attacker-connect trigger (Rick precedent).
// ---------------------------------------------------------------------------

export const FLASH_VOICE = {
  // ── INTRO / boast (match start) ──
  intro: [
    "flashinj2_002_t01m36_8s.mp3",   // "there's only one fastest man alive"
    "flashinj2_008_t03m47_4s.mp3",   // "only seems fair to warn you"
  ],

  // ── TAUNT (attacker connect) — quippy speed trash-talk ──
  taunt: [
    "flashinj2_003_t01m39_7s.mp3",   // "my feet are faster than your neurons"
    "flashinj2_004_t01m44_7s.mp3",   // "eat my dust"
    "flashinj2_005_t01m47_5s.mp3",   // "I'll photobomb your selfies / here's to a speedy recovery"
    "flashinj2_013_t06m36_5s.mp3",   // "I kinda have dibs on the whole red thing"
  ],

  // ── HIT-REACTION (defender got hit) — one spoken reaction + the verified effort-grunt set ──
  hitReact: [
    "flashinj2_017_t08m22_8s.mp3",   // "Not again."
    "flashinj2_019_t09m32_7s.mp3",   // effort grunt
    "flashinj2_020_t10m00_1s.mp3",   // effort grunt
    "flashinj2_022_t10m17_4s.mp3",   // effort grunt
    "flashinj2_023_t10m47_5s.mp3",   // effort grunt
    "flashinj2_024_t10m58_8s.mp3",   // effort grunt
  ],
}

export function pickFlashVoice(pool) {
  const arr = FLASH_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
