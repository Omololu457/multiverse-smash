// sukunaVoice.js
// ---------------------------------------------------------------------------
// Ryomen Sukuna voice-line pools (audio-only; NO gameplay effect). Every entry
// is an on-disk mp3 filename (exact case). Japanese audio, kept intentionally —
// these are NOT translated/swapped. Mirrors rickVoice.js / itachiVoice.js: one
// clip fired at random per trigger via pickSukunaVoice(pool). Callers play via
// sound.playSfxFile(clip, null) — a fresh Audio per call so a voice line overlaps
// the technique SFX and never cuts another off (the project convention).
//
// This is the LARGEST generic-bark batch wired for any character (55 clips). All
// 55 are GENERIC barks — none are named-technique callouts (Domain / Malevolent
// Shrine / Fuga / Cleave / Dismantle already have their own move-cue files:
// sukuna_slash.mp3, sukuna_fuga.mp3, Sukuna_saying_Domain.mp3, sukuna_namecall.mp3
// — none of which this module touches).
//
// ── TRIGGER MAPPING (see combat.js applySukunaOffenseVoice) ────────────────
// Sukuna is a pure AGGRESSOR: all 55 lines are attacker-side barks (there is no
// "ow, I got hit" defender line in the batch), so there is NO defender-reaction
// hook here. Sukuna also has NO `taunt` action (the hold-Down taunt mechanic in
// game.js is gated on animationData.taunt, which Sukuna does not define — same as
// Naruto/Sasuke/Itachi). With no taunt mechanic and no idle/ambient-bark hook to
// build against (building one would be a new mechanic, out of scope for an audio
// task), all four pools are folded onto the ONE natural Sukuna VO hook — an attack
// CONNECTING — and split by combat context so each pool stays live & independent:
//   • finisher  → the connect is a KO (defender.health <= 0) OR a strong blow that
//                 lands while the opponent is already at/below the low-HP line.
//   • hitConnect→ a STRONG connect (heavy/special/ultimate) OR a long combo string.
//   • taunt     → an ordinary LIGHT connect (Sukuna's constant aggressive chatter;
//                 this is where the 21-entry taunt pool lives, throttled by the
//                 shared _atkVoiceCd so it never spams).
//   • misc      → low-frequency alternate drawn from the same LIGHT-connect branch
//                 (~1-in-4) since there is no separate ambient-bark hook — folded
//                 into the taunt trigger exactly as the brief permits.
//
// NOTE (commit reality, flagged in the report): at wiring time only 18 of the 55
// mp3s are present on disk (the other 37 are named here but not yet uploaded).
// Missing files 404 harmlessly (playSfxFile fire-and-forget); a random pick that
// lands on a not-yet-present file simply plays nothing. The pools are authored in
// FULL so they light up automatically once the remaining clips are added.
// ---------------------------------------------------------------------------

export const SUKUNA_VOICE = {
  // ── TAUNT POOL (21) — folded onto an ordinary LIGHT connect (no taunt mechanic) ──
  taunt: [
    "sukuna_001_annoying_disappear.mp3", "sukuna_002_its_you_fool.mp3",
    "sukuna_004_slow_dont_get_carried_away.mp3", "sukuna_009_clever_know_your_place.mp3",
    "sukuna_010_stay_there_about_time.mp3", "sukuna_011_wont_forgive_dont_get_cocky.mp3",
    "sukuna_018_dont_like_it_eyesore.mp3", "sukuna_021_unpleasant_in_the_way.mp3",
    "sukuna_022_cheeky_bring_down.mp3", "sukuna_024_getting_on_nerves.mp3",
    "sukuna_025_boring_foolish.mp3", "sukuna_027_worthless_shut_up.mp3",
    "sukuna_031_bored_of_you.mp3", "sukuna_032_sideshow_ends_here.mp3",
    "sukuna_033_dull_still_more.mp3", "sukuna_038_youre_weak.mp3",
    "sukuna_039_dont_be_scared.mp3", "sukuna_040_what_do_you_want.mp3",
    "sukuna_045_is_this_all.mp3", "sukuna_046_no_need_serious.mp3",
    "sukuna_053_disappointing.mp3",
  ],

  // ── HIT-CONNECT / COMBO BARK POOL (21) — STRONG connect or long combo string ──
  hitConnect: [
    "sukuna_003_try_to_dodge.mp3", "sukuna_006_strike_bury_dont_be_arrogant.mp3",
    "sukuna_007_come_take_this.mp3", "sukuna_008_can_you_still_stand.mp3",
    "sukuna_013_kill_you_die.mp3", "sukuna_014_dont_move_bold.mp3",
    "sukuna_016_crawl_running_futile.mp3", "sukuna_017_feels_good.mp3",
    "sukuna_020_carve_how_respond.mp3", "sukuna_023_heh_heh_stand.mp3",
    "sukuna_026_first_a_warmup.mp3", "sukuna_036_dont_wear_out_resist.mp3",
    "sukuna_037_ill_give_you_something.mp3", "sukuna_041_try_to_endure.mp3",
    "sukuna_043_naive_thought_id_overlook.mp3", "sukuna_047_mincemeat.mp3",
    "sukuna_048_this_is_how_jujutsu_used.mp3", "sukuna_049_difference_in_rank.mp3",
    "sukuna_050_still_going_not_over.mp3", "sukuna_051_follow_up_attack.mp3",
    "sukuna_054_did_you_think_youd_win.mp3",
  ],

  // ── FINISHER / KO / COMBO-ENDER POOL (9) — KO or a strong low-HP blow ──
  finisher: [
    "sukuna_012_stay_down_get_lost.mp3", "sukuna_015_forbid_all_movement.mp3",
    "sukuna_019_leave_drop_dead.mp3", "sukuna_028_payback_wont_escape.mp3",
    "sukuna_029_its_over_big_finish.mp3", "sukuna_034_finishing_blow_sorry.mp3",
    "sukuna_035_die_here_good.mp3", "sukuna_042_finished_try_defend.mp3",
    "sukuna_052_youre_next.mp3",
  ],

  // ── MISC / FLAVOR POOL (4) — low-frequency alt off the LIGHT-connect branch ──
  misc: [
    "sukuna_000_blow_away_insect.mp3", "sukuna_005_dont_give_up_fall.mp3",
    "sukuna_030_good_chance_teach_you.mp3", "sukuna_044_well_then_shall_we.mp3",
  ],
}

export function pickSukunaVoice(pool) {
  const arr = SUKUNA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
