// bardockVoice.js
// ---------------------------------------------------------------------------
// Bardock voice-line pools (audio-only; NO gameplay effect). Source = 15 clips
// ("bardock_*.mp3", English dub from DBZ Extreme Butoden / the Bardock TV special).
// Filenames encode ONLY the source index, not content, so the clips were
// TRANSCRIBED (faster-whisper base + VAD) to a real content log — see
// BARDOCK_VOICE_LOG.md — NOT guessed from filenames. Same pipeline as the
// Superman / Batman / Omni-Man English packs.
//
// REALITY OF THE PACK: most of the 15 clips are LONG multi-line stitches (10–37s
// compilations of several barks run together). A single stitched clip does not fit
// any one trigger, so those are left UNWIRED (noted per-file in BARDOCK_VOICE_LOG.md).
// Only the clean, short, self-contained single lines are wired below: 6 wired / 9
// left as compilations. His signature "I'm gonna change the future!" declaration is
// his intro/win anchor.
//
// pickBardockVoice(pool) returns ONE clip at random (genuine Math.random), same
// shared-helper shape as pickSupermanVoice / pickBatmanVoice. Callers play via
// sound.playSfxFile(clip, null) — a fresh Audio per call so a voice line overlaps
// the move SFX and never cuts another off (project convention).
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE (round-1 match intro) — his "change the future" resolve
//   taunt     → combat.js applyBardockOffenseVoice (attacker STRONG / long-string connect) — aggressive trash-talk
//   hitReact  → combat.js applyBardockHitVoice (defender got hit) — effort grunt
//   win       → game.js _checkMatchOver (winner = Bardock) — triumphant close-out
//
// NOTE — Bardock has NO taunt action bound to a voice event, so the trash-talk pool
//   rides the attacker strong/long-string connect (Superman/Batman/Omni-Man precedent).
//   No clean low-HP or technique-callout single line survived curation → those pools
//   are omitted (their triggers simply stay silent for Bardock; see LOG).
// ---------------------------------------------------------------------------

export const BARDOCK_VOICE = {
  // ── INTRO / pre-fight declarations ──
  intro: [
    "bardock_009.mp3",   // "It's up to me. I'm gonna change the future!"
    "bardock_011.mp3",   // "I'm gonna change the future. Get out here! Let's go!"
  ],

  // ── TAUNT (attacker strong / long-string connect) — aggressive trash-talk ──
  taunt: [
    "bardock_008.mp3",   // "You're the one who's gonna die!"
    "bardock_005.mp3",   // "Don't underestimate me! How dare you make a fool of me! Prepare to die!"
  ],

  // ── HIT-REACTION (defender got hit) — effort grunt ──
  hitReact: [
    "bardock_014.mp3",   // short pained "I'm...!" grunt
  ],

  // ── WIN (match victory) — triumphant resolve ──
  win: [
    "bardock_015.mp3",   // "I'm gonna change the future!"
  ],
}

// Random pick from a pool (genuine Math.random — same shape as pickSupermanVoice).
export function pickBardockVoice(pool) {
  const arr = BARDOCK_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
