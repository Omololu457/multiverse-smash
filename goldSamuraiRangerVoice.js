// goldSamuraiRangerVoice.js
// ---------------------------------------------------------------------------
// Gold Samurai Ranger (Light) voice-line pools (audio-only; NO gameplay effect).
// 16 clips, English Power Rangers Samurai audio (goldranger_* — exact on-disk
// filenames, case preserved). Every entry is a real mp3 in the project root.
//
// pickGoldSamuraiVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickSamuraiVoice / pickRengokuVoice.
// Callers play via sound.playSfxFile(clip, null); the single-voice-channel
// (no self-overlap) is handled by sound._voiceOwner (a new Gold line stops any
// currently-playing Gold line; cross-character overlap untouched).
//
// ── TRIGGER MAP (where each pool fires) ──
//   transformCast → abilities.js enterSamuraiMega (Mega Mode ACTIVATION beat — the silhouette-darken
//                   + 光 Light-symbol, BEFORE the morph resolves the Mega art/stats). SINGLE clip (000).
//   transformDone → abilities.js applySamuraiFormSystem, the frame the locked morph fully ENDS
//                   (_megaMorphTimer→0), AFTER the reveal flash → "Mega Mode is now active." SINGLE (001).
//                   The morph is 42f with the art/flash resolving at 16f-remaining, so this fires ~16f
//                   (~0.27s) after the reveal and ~42f after transformCast — the two never overlap.
//   intro         → game.js INTRO_VOICE (round-1 match intro / battle start). Random pick {002..005}.
//   barracuda     → abilities.js executeGoldSamuraiSpecial (LIGHT SLASH special = the Barracuda-Blade
//                   sword-beam; direct technique-name match). Random pick {006,013}. Sets _atkVoiceCd so
//                   the connect doesn't ALSO bark (no cast+connect double — the Red discipline).
//   foxClaw       → abilities.js fireSamuraiRangerMove on samRekkaFin (Gold's melee command-chain
//                   FINISHER — the SEPARATE move that hosts "Fierce Fox Claw"). SINGLE (012). Sets
//                   _atkVoiceCd. See NOTE on the mapping.
//   combatBark    → combat.js applySamuraiOffenseVoice (attacker lands a HEAVY / long-string connect).
//                   Random pick {007..010}.
//   hitReact      → combat.js applySamuraiHitVoice (defender got hit — general reaction). Random {011,014}.
//   win           → game.js round-end WINNER block (victory line). SINGLE (015).
//
// ── NOTES / flagged decisions (per the wiring brief) ──
//   • BARRACUDA vs FIERCE FOX CLAW mapping: Gold's kit names the Barracuda Blade on its LIGHT SLASH
//     special (a light sword-beam projectile) AND its ultimate ("Barracuda Blade: Light Finale"); there
//     is NO move literally named "Fierce Fox Claw". Per the brief's fallback, the two Barracuda lines
//     {006,013} pool onto the SPECIAL that content maps to (Light Slash), and the single Fox Claw line
//     {012} maps to the one SEPARATE offensive move that isn't the Barracuda projectile — the
//     Fwd+Heavy command-chain FINISHER (samRekkaFin), a committed melee sword-launcher. This keeps the
//     two named techniques on two distinct moves rather than doubling them on one. Flagged.
//   • The ULTIMATE ("Barracuda Blade: Light Finale") gets NO dedicated cast line — the batch ships no
//     ult clip, so it stays unvoiced rather than borrowing/guessing a substitute. Flagged (deferred).
//   • TAUNT has NO dedicated trigger: the Gold Samurai Ranger has no `taunt` action in characters.js
//     (only gojo/rick/ben10/goku_black/superman do), and enrolling him in the universal hold-Down heal-
//     taunt would change GAMEPLAY (excluded — audio-only pass). Per the brief's fallback, the INTRO/TAUNT
//     pool fires on INTRO ONLY. Flagged.
//   • There is NO low-health line in the batch (014 "aw, nuts" is a hit-REACTION per the brief), so the
//     Gold low-health beat stays silent (applySamuraiLowHealthVoice remains Red-only). Not fabricated.
// ---------------------------------------------------------------------------

export const GOLD_SAMURAI_VOICE = {
  // ── TRANSFORMATION ACTIVATION — fires at the Mega Mode activation beat, before the reveal resolves ──
  transformCast: [
    "goldranger_000_samurai_morpher_gold_power.mp3",
  ],

  // ── TRANSFORMATION COMPLETE — fires once the morph fully ends, confirming Mega Mode is active ──
  transformDone: [
    "goldranger_001_gold_is_good_to_go.mp3",
  ],

  // ── INTRO / TAUNT — confrontational openers (no taunt mechanic → intro-only) ──
  intro: [
    "goldranger_002_thanks_helping_need_a_minute.mp3",
    "goldranger_003_go_big_or_go_home.mp3",
    "goldranger_004_leave_this_one_to_me.mp3",
    "goldranger_005_done_talking_time_for_action.mp3",
  ],

  // ── BARRACUDA BLADE — the Light Slash special cast (direct technique-name match) ──
  barracuda: [
    "goldranger_006_my_style_barracuda_blade.mp3",
    "goldranger_013_better_than_i_remember_barracuda.mp3",
  ],

  // ── FIERCE FOX CLAW — the command-chain melee FINISHER (samRekkaFin), the separate move ──
  foxClaw: [
    "goldranger_012_fierce_fox_claw.mp3",
  ],

  // ── OFFENSE / combat bark (attacker lands a heavy / long-string hit) ──
  combatBark: [
    "goldranger_007_pretty_fast_yo.mp3",
    "goldranger_008_you_want_some_too.mp3",
    "goldranger_009_come_up_and_get_me.mp3",
    "goldranger_010_stay_back_i_got_this.mp3",
  ],

  // ── HIT-REACTION (defender got hit) ──
  hitReact: [
    "goldranger_011_sharper_than_i_thought.mp3",
    "goldranger_014_aw_nuts_come_on.mp3",
  ],

  // ── WIN — victory line ──
  win: [
    "goldranger_015_golden_moment.mp3",
  ],
}

export function pickGoldSamuraiVoice(pool) {
  const arr = GOLD_SAMURAI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
