// saikiVoice.js
// ---------------------------------------------------------------------------
// Saiki Kusuo voice-line pool (audio-only; NO gameplay effect). Every entry is
// an on-disk mp3 filename (exact case). Mirrors rickVoice.js / sukunaVoice.js:
// one clip fired at random per trigger via pickSaikiVoice(pool). Callers play
// via sound.playSfxFile(clip, null) — a fresh Audio per call so a voice line
// overlaps the technique SFX and never cuts another off (project convention).
//
// ── SOURCE / LANGUAGE NOTE ────────────────────────────────────────────────
// These 12 are ENGLISH-DUB TV-episode lines (prefix saiki_en_*): short, generic,
// deadpan dismissive one-liners deliberately filtered to contain no named-character
// or plot-specific content. There is NO second (Japanese) Saiki batch on disk — the
// only "*_nenimpact_*" clips in the repo belong to NETERO (netero_nenimpact_*), not
// Saiki. So the "merge two language sources" question is trivially resolved: ONE
// pool, these 12 lines, genuine random selection (Math.random index, non-repeating).
// If a Japanese Saiki batch is ever added, append it to this same `taunt` array
// (decision (a): one mixed pool, random-selects across languages) — the project has
// no per-character voice-pack/language toggle to plug a separate pool into.
//
// ── TRIGGER MAPPING ───────────────────────────────────────────────────────
// Saiki has NO `taunt` action (animationData defines none), so the universal
// hold-Down taunt mechanic in game.js (updateTauntState, gated on
// animationData.taunt) never commits for him — same status as Naruto/Sasuke/
// Itachi/Sukuna. Per the audio-task scope we do NOT build a taunt mechanic here.
// Instead the pool is wired READY-AND-WAITING onto the GENUINE taunt commit-
// transition in game.js (right beside the Goku Black / Rick hooks), gated to
// rosterKey "saiki". It is dormant today (no taunt art) and lights up automatically
// the instant a `taunt` action is added to Saiki — no code change needed then.
// ---------------------------------------------------------------------------

export const SAIKI_VOICE = {
  // ── TAUNT POOL (12) — English-dub deadpan dismissals, wired to the universal
  //    taunt commit trigger (dormant until Saiki gets a `taunt` action). ──
  taunt: [
    "saiki_en_not_listening.mp3",
    "saiki_en_annoying.mp3",
    "saiki_en_stupid_or_what.mp3",
    "saiki_en_thats_sad.mp3",
    "saiki_en_nope.mp3",
    "saiki_en_dont_care.mp3",
    "saiki_en_stop_stupid_things.mp3",
    "saiki_en_who_cares.mp3",
    "saiki_en_thats_it.mp3",
    "saiki_en_seriously.mp3",
    "saiki_en_no_idea.mp3",
    "saiki_en_ill_pass.mp3",
  ],
}

export function pickSaikiVoice(pool) {
  const arr = SAIKI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
