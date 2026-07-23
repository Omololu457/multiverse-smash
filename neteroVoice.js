// neteroVoice.js
// ---------------------------------------------------------------------------
// Isaac Netero voice-line pools (audio-only; NO gameplay effect). Every entry is
// an on-disk mp3 filename (exact case). Japanese audio from the "Nen Impact" game,
// kept intentionally — these are NOT translated/swapped. Mirrors rickVoice.js /
// sukunaVoice.js / saikiVoice.js: one clip fired at random per trigger via
// pickNeteroVoice(pool). Callers play via sound.playSfxFile(clip, null) — a fresh
// Audio per call so a voice line overlaps the technique SFX and never cuts another
// off (the project convention).
//
// ── TRIGGER MAP (where each pool is consumed) ──────────────────────────────
//   • intro       → game.js INTRO_VOICE.netero (fires once at his intro-play beat)
//   • win         → game.js match-end win-voice block (winner === netero)
//   • guanyinCast → abilities.js executeNeteroUltimate (the charge → giant-summon
//                   beat; single form, no re-press within an activation — cast_alt
//                   is the alternate picked across separate activations/rounds)
//   • hit         → combat.js applyNeteroOffenseVoice (an UNBLOCKED attack CONNECTS
//                   — normal / special / avatar; throttled by shared _atkVoiceCd)
//   • grunt       → combat.js updateCombat rising-edge of fighter.attacking (any
//                   attack's STARTUP — a generic combat-effort bark; throttled by a
//                   SEPARATE _gruntVoiceCd so it is a distinct trigger from `hit`)
//   • taunt       → STAGED. Netero has NO `taunt` action (animationData defines
//                   none), so the universal hold-Down taunt mechanic never commits
//                   for him — same status as Saiki/Naruto/Sasuke. Wired ready-and-
//                   waiting onto the real taunt commit-transition in game.js (gated
//                   rosterKey "netero"); dormant until a taunt animation is added.
//   • zero        → STAGED (no live trigger). The ~19s "100-Type Zero" monologue +
//                   its battle-cry payoff are a SEPARATE, more elaborate finishing
//                   technique than the general Guanyin avatar summon/attacks that
//                   are built today. The current avatar kit has NO dedicated single
//                   "Zero" finisher move-slot to hang a 19s monologue on (the
//                   hardest-hitting existing attack, guanyinBurst @92dmg, is a fast
//                   REPEATABLE button-press — attaching a 19s speech to it would
//                   retrigger/overlap constantly). Per the audio-task scope we do
//                   NOT invent a finisher move here. Both clips are staged; wiring
//                   them live needs a new finisher move-slot or a design call on
//                   which existing avatar attack "becomes" the Zero technique.
//
// ── NOTE (commit reality, flagged in the report) ───────────────────────────
// At wiring time only 16 of the 51 named mp3s are present on disk; the other 35 are
// named here but not yet uploaded. Missing files 404 harmlessly (playSfxFile is
// fire-and-forget); a random pick that lands on a not-yet-present file simply plays
// nothing. Pools are authored in FULL so they light up automatically as clips arrive
// (same precedent as sukunaVoice.js, which shipped 18/55 present).
//
// win_close_1..4 were cut as VERY short clips and flagged at cut-time as worth a
// listen-check before trusting the boundaries — if any sounds truncated in-game,
// re-trim rather than shipping a clipped line (flagged in the report).
// ---------------------------------------------------------------------------

export const NETERO_VOICE = {
  // ── INTRO POOL (2) — random pick at his intro beat ──
  intro: [
    "netero_nenimpact_intro_challenger.mp3",
    "netero_nenimpact_intro_playmate.mp3",
  ],

  // ── TAUNT POOL (8) — STAGED on the universal taunt commit (no taunt action yet) ──
  taunt: [
    "netero_nenimpact_taunt_1.mp3",
    "netero_nenimpact_taunt_2.mp3",
    "netero_nenimpact_taunt_3.mp3",
    "netero_nenimpact_taunt_4.mp3",
    "netero_nenimpact_taunt_come_at_me.mp3",
    "netero_nenimpact_taunt_go_easier.mp3",
    "netero_nenimpact_taunt_spacing_out.mp3",
    "netero_nenimpact_taunt_come_at_me_2.mp3",
  ],

  // ── WIN POOL (11) — random pick on match-end victory ──
  win: [
    "netero_nenimpact_win_short.mp3",
    "netero_nenimpact_win_feed_me.mp3",
    "netero_nenimpact_win_hundred_years.mp3",
    "netero_nenimpact_win_laugh.mp3",
    "netero_nenimpact_win_getting_old.mp3",
    "netero_nenimpact_win_grateful_1.mp3",
    "netero_nenimpact_win_grateful_2.mp3",
    "netero_nenimpact_win_close_1.mp3",   // short cut — listen-check (may need re-trim)
    "netero_nenimpact_win_close_2.mp3",   // short cut — listen-check
    "netero_nenimpact_win_close_3.mp3",   // short cut — listen-check
    "netero_nenimpact_win_close_4.mp3",   // short cut — listen-check
  ],

  // ── GUANYIN CAST POOL (2) — random pick at the ultimate transformation/summon beat ──
  guanyinCast: [
    "netero_nenimpact_guanyin_cast_1.mp3",
    "netero_nenimpact_guanyin_cast_alt.mp3",
  ],

  // ── HIT-CONNECT BARK POOL (6) — an UNBLOCKED attack lands ──
  hit: [
    "netero_nenimpact_hit_too_soft.mp3",
    "netero_nenimpact_hit_underestimate.mp3",
    "netero_nenimpact_hit_last_strength.mp3",
    "netero_nenimpact_hit_full_tension.mp3",
    "netero_nenimpact_hit_too_naive.mp3",
    "netero_nenimpact_hit_impudent.mp3",
  ],

  // ── COMBAT GRUNT POOL (20) — attack STARTUP effort bark (distinct from `hit`) ──
  grunt: [
    "netero_nenimpact_grunt_a1.mp3", "netero_nenimpact_grunt_a2.mp3",
    "netero_nenimpact_grunt_a3.mp3", "netero_nenimpact_grunt_a4.mp3",
    "netero_nenimpact_grunt_a5.mp3", "netero_nenimpact_grunt_a6.mp3",
    "netero_nenimpact_grunt_a7.mp3", "netero_nenimpact_grunt_a8.mp3",
    "netero_nenimpact_grunt_a9.mp3", "netero_nenimpact_grunt_a10.mp3",
    "netero_nenimpact_grunt_b1.mp3", "netero_nenimpact_grunt_b2.mp3",
    "netero_nenimpact_grunt_b3.mp3", "netero_nenimpact_grunt_b4.mp3",
    "netero_nenimpact_grunt_b5.mp3", "netero_nenimpact_grunt_b6.mp3",
    "netero_nenimpact_grunt_b7.mp3", "netero_nenimpact_grunt_b8.mp3",
    "netero_nenimpact_grunt_b9.mp3", "netero_nenimpact_grunt_b10.mp3",
  ],

  // ── 100-TYPE ZERO (2) — STAGED, no live trigger (see header; needs a finisher slot) ──
  zero: [
    "netero_nenimpact_ultimate_monologue.mp3",   // ~19s spoken prayer/monologue
    "netero_nenimpact_zero_payoff.mp3",           // short battle-cry immediately after
  ],
}

export function pickNeteroVoice(pool) {
  const arr = NETERO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
