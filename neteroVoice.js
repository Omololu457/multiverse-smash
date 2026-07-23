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
//   • zero        → LIVE on a DEDICATED finisher move-slot: "100-Type Zero" is
//                   Netero's single strongest strike WITHIN the Guanyin form. It fires
//                   on the Ultimate button pressed AGAIN while giant (that input used
//                   to no-op), gated once-per-activation. NETERO_ZERO.cast (the ~19s
//                   monologue) plays as the dramatic windup line; NETERO_ZERO.strike
//                   (the payoff battle-cry) is synced to the strike's active frames.
//                   See abilities.js executeNeteroZero / GUANYIN_ATTACKS.guanyinZero.
//                   (The `zero` pool below stays a 2-array so the randomizer test still
//                   covers it; the finisher plays the two by their semantic role, NOT
//                   at random — a cast line and a strike cry are distinct beats.)
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

  // ── 100-TYPE ZERO (2) — LIVE on the guanyinZero finisher slot (semantic roles below) ──
  zero: [
    "netero_nenimpact_ultimate_monologue.mp3",   // = NETERO_ZERO.cast (dramatic windup line)
    "netero_nenimpact_zero_payoff.mp3",           // = NETERO_ZERO.strike (battle-cry on impact)
  ],
}

// Semantic roles for the 100-Type Zero finisher (single source of truth; the `zero` pool
// above references the SAME two files for the randomizer test). The finisher plays these by
// role — a cast line then a strike cry — NOT at random.
export const NETERO_ZERO = {
  cast:   "netero_nenimpact_ultimate_monologue.mp3",   // ~19s spoken prayer — plays on the windup
  strike: "netero_nenimpact_zero_payoff.mp3",           // short battle-cry — synced to the strike
}

export function pickNeteroVoice(pool) {
  const arr = NETERO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
