// gojoVoice.js
// ---------------------------------------------------------------------------
// Gojo Satoru "Limitless (Alt)" SKIN voice pack (audio-only; NO gameplay effect).
// 122 Japanese clips (prefix gojoyoung_*), kept intentionally — NOT translated or
// swapped. This is a DIFFERENT voice recording from base Gojo's existing lines, so
// it is wired as a DEDICATED per-skin pool that is active ONLY when the "gojo2"
// (Limitless) skin is equipped. Under any other skin these are silent and base
// Gojo behaves exactly as before (see SKIN_VOICE / pickSkinVoice below).
//
// ── PER-SKIN AUDIO OVERRIDE MECHANISM ──────────────────────────────────────
// The engine already supports per-skin ART overrides (skins.js getSkinAnimationData,
// keyed by rosterKey+skinId, null = fall back to the character default). There was
// NO matching per-skin AUDIO override, so we add the smallest equivalent: a skin-keyed
// voice registry (SKIN_VOICE) + resolver (pickSkinVoice). A skin absent from the
// registry returns null → the trigger site falls back to the character's BASE voice
// (or silence if base defines none for that trigger). To give any future skin its own
// voice pack, register it here — no trigger-site changes needed.
//
// ── POOLS (sorted from the self-describing filenames) ──────────────────────
//   intro (10)      → INTRO_VOICE override at the intro-play beat (character-select /
//                     match start): "I'm Gojo Satoru", "I'll go first", "are you ready"…
//   taunt (59, largest) → STAGED on the universal hold-Down taunt commit (game.js).
//                     Gojo has NO `taunt` action (animationData defines none — only
//                     Rick/Goku Black do), so, exactly like Netero/Saiki/Naruto, this
//                     hook is DORMANT today and lights up automatically the instant a
//                     `taunt` animation is added to Gojo. Wiring a taunt MECHANIC is
//                     gameplay logic and out of scope for this audio-only task, so the
//                     largest pool is deliberately staged-not-live (flagged in report).
//   cast (18)       → LIVE on any Gojo special / ultimate cast (abilities.js dispatch).
//                     NONE of these name a specific technique (Blue/Red/Purple/Domain/
//                     Infinity were deliberately excluded from this batch), so they play
//                     as GENERIC flavor OVER the existing per-technique SFX — the named
//                     casts never go silent under the Limitless skin, they simply also
//                     get a young-Gojo flourish. (Base technique SFX are untouched.)
//   hitConnect (12) → LIVE when an UNBLOCKED Gojo attack CONNECTS (combat.js): "good hit",
//                     "take this", "you're wide open"…
//   hitReact (6)    → LIVE when Gojo TAKES an unblocked hit (combat.js): "that hurts",
//                     "oops", "damn it"…
//   win (17)        → LIVE at match-end when the WINNER is a Limitless-skin Gojo (game.js):
//                     "it's basically over", "good match", "nicely done"…
//
// Genuine random selection within every pool (Math.random index — pickSkinVoice), never
// a fixed order. Callers play via sound.playSfxFile(clip, null) — a fresh Audio per call
// so a voice line overlaps the technique SFX and never cuts another off (project convention).
// ---------------------------------------------------------------------------

import { REVFLASH_VOICE } from "./flashReverseVoice.js"   // Flash "Reverse Flash" skin pack — registered in SKIN_VOICE below (same mechanism)

export const GOJOYOUNG_VOICE = {
  // ── INTRO / CHARACTER-SELECT (10) ──
  intro: [
    "gojoyoung_000_ive_come_here.mp3",
    "gojoyoung_004_are_you_ready.mp3",
    "gojoyoung_006_ill_go_first.mp3",
    "gojoyoung_062_ill_go_first_2.mp3",
    "gojoyoung_069_lets_do_this.mp3",
    "gojoyoung_078_always_ready.mp3",
    "gojoyoung_081_are_you_ready_2.mp3",
    "gojoyoung_084_im_the_strongest_sorcerer.mp3",
    "gojoyoung_085_im_gojo_satoru.mp3",
    "gojoyoung_111_ill_show_strongest.mp3",
  ],

  // ── TAUNT (59, largest) — STAGED on the universal taunt commit (no taunt action yet) ──
  taunt: [
    "gojoyoung_001_alright.mp3",
    "gojoyoung_002_easy_thats_easy.mp3",
    "gojoyoung_003_can_you_keep_going.mp3",
    "gojoyoung_005_how_humble.mp3",
    "gojoyoung_007_look_me_in_eyes.mp3",
    "gojoyoung_008_try_harder_win.mp3",
    "gojoyoung_009_try_seriously.mp3",
    "gojoyoung_011_cant_escape_easily.mp3",
    "gojoyoung_012_come_here.mp3",
    "gojoyoung_013_try_looking_back.mp3",
    "gojoyoung_014_still_cant_see.mp3",
    "gojoyoung_019_too_late_regret.mp3",
    "gojoyoung_020_dont_end_here.mp3",
    "gojoyoung_021_fleeing_not_allowed.mp3",
    "gojoyoung_022_chose_to_fight.mp3",
    "gojoyoung_024_dont_go_easy.mp3",
    "gojoyoung_025_bring_it.mp3",
    "gojoyoung_026_im_a_little_busy.mp3",
    "gojoyoung_027_lets_take_a_walk.mp3",
    "gojoyoung_028_scared.mp3",
    "gojoyoung_029_dont_mind_it.mp3",
    "gojoyoung_030_are_you_leaving_now.mp3",
    "gojoyoung_033_come_back.mp3",
    "gojoyoung_034_complicated_isnt_it.mp3",
    "gojoyoung_035_my_apologies.mp3",
    "gojoyoung_040_might_get_scolded.mp3",
    "gojoyoung_043_might_be_difficult.mp3",
    "gojoyoung_046_sad.mp3",
    "gojoyoung_047_just_warming_up.mp3",
    "gojoyoung_053_do_it.mp3",
    "gojoyoung_056_already_given_up.mp3",
    "gojoyoung_057_i_like_this.mp3",
    "gojoyoung_058_wont_go_easy.mp3",
    "gojoyoung_060_almost_nothing.mp3",
    "gojoyoung_063_so_embarrassing.mp3",
    "gojoyoung_064_havent_started_fighting.mp3",
    "gojoyoung_066_maybe_get_serious.mp3",
    "gojoyoung_067_thought_about_running.mp3",
    "gojoyoung_070_show_me_good_time.mp3",
    "gojoyoung_073_thought_i_was_finished.mp3",
    "gojoyoung_074_havent_even_started.mp3",
    "gojoyoung_076_but_i_will_win.mp3",
    "gojoyoung_077_fun_times_await.mp3",
    "gojoyoung_082_found_my_groove.mp3",
    "gojoyoung_088_be_confident.mp3",
    "gojoyoung_090_counting_on_you.mp3",
    "gojoyoung_092_move_move.mp3",
    "gojoyoung_094_dont_leave_my_side.mp3",
    "gojoyoung_095_distance_yourself.mp3",
    "gojoyoung_096_leave_it_to_me.mp3",
    "gojoyoung_097_keep_up_with_me.mp3",
    "gojoyoung_099_time_to_move.mp3",
    "gojoyoung_101_no_excuses.mp3",
    "gojoyoung_104_youll_do_it.mp3",
    "gojoyoung_107_ill_kill_you.mp3",
    "gojoyoung_109_finish_quickly.mp3",
    "gojoyoung_112_practice_techniques.mp3",
    "gojoyoung_113_nice_movement.mp3",
    "gojoyoung_114_land_a_hit_on_me.mp3",
  ],

  // ── CAST / SPECIAL-FLAVOR (18) — generic (no named technique); fires over the base SFX ──
  cast: [
    "gojoyoung_017_will_you_get_this.mp3",
    "gojoyoung_018_ready_to_fly.mp3",
    "gojoyoung_032_know_what_this_is.mp3",
    "gojoyoung_036_come_to_me.mp3",
    "gojoyoung_037_touch_this_space.mp3",
    "gojoyoung_038_get_out_of_here.mp3",
    "gojoyoung_039_get_out_normal_place.mp3",
    "gojoyoung_041_not_even_ashes_found.mp3",
    "gojoyoung_042_taste_max_power.mp3",
    "gojoyoung_044_if_you_can_stop_this.mp3",
    "gojoyoung_045_pull_out_all_stops.mp3",
    "gojoyoung_052_heart_in_this_too.mp3",
    "gojoyoung_054_not_playing_around.mp3",
    "gojoyoung_055_taking_this_seriously.mp3",
    "gojoyoung_065_not_all_of_me.mp3",
    "gojoyoung_068_remove_the_pain.mp3",
    "gojoyoung_083_this_is_my_technique.mp3",
    "gojoyoung_100_get_serious.mp3",
  ],

  // ── HIT-CONNECT (12) — an UNBLOCKED Gojo attack lands ──
  hitConnect: [
    "gojoyoung_015_this_will_hurt.mp3",
    "gojoyoung_048_how_about_that.mp3",
    "gojoyoung_049_take_this.mp3",
    "gojoyoung_050_strike.mp3",
    "gojoyoung_059_wide_open.mp3",
    "gojoyoung_061_youre_defenseless.mp3",
    "gojoyoung_072_one_more.mp3",
    "gojoyoung_080_good_hit.mp3",
    "gojoyoung_093_dodge_or_get_hit.mp3",
    "gojoyoung_105_surprise.mp3",
    "gojoyoung_106_youre_a_wreck.mp3",
    "gojoyoung_110_yeah.mp3",
  ],

  // ── HIT-REACTION / TAKING DAMAGE (6) ──
  hitReact: [
    "gojoyoung_010_that_hurts.mp3",
    "gojoyoung_051_you_insulted_me.mp3",
    "gojoyoung_091_bit_troublesome.mp3",
    "gojoyoung_098_not_feeling_it.mp3",
    "gojoyoung_118_damn_it.mp3",
    "gojoyoung_119_oops.mp3",
  ],

  // ── WIN (17) — match-end victory ──
  win: [
    "gojoyoung_016_this_ends_here.mp3",
    "gojoyoung_023_time_to_end_this.mp3",
    "gojoyoung_031_basically_over.mp3",
    "gojoyoung_071_end_this_dance.mp3",
    "gojoyoung_075_im_the_strongest.mp3",
    "gojoyoung_079_lets_end_this.mp3",
    "gojoyoung_086_good_work.mp3",
    "gojoyoung_087_you_did_well.mp3",
    "gojoyoung_089_bye_bye.mp3",
    "gojoyoung_102_nicely_done.mp3",
    "gojoyoung_103_because_im_strongest.mp3",
    "gojoyoung_108_good_match.mp3",
    "gojoyoung_115_good_toughness.mp3",
    "gojoyoung_116_training_complete.mp3",
    "gojoyoung_117_nice_job.mp3",
    "gojoyoung_120_pretty_good.mp3",
    "gojoyoung_121_nice_to_work_with_you.mp3",
  ],
}

// Per-skin voice override registry. Keyed "rosterKey:skinId". Mirrors skins.js
// getSkinAnimationData: a (rosterKey, skinId) absent here resolves to null → the
// trigger site falls back to the character's BASE voice (or silence if none). Add a
// future per-skin voice pack by registering it here — trigger sites need no change.
const SKIN_VOICE = {
  "gojo:gojo2": GOJOYOUNG_VOICE,          // "Limitless (Alt)" skin → the young-Gojo Japanese pack
  "flash:flash_reverse": REVFLASH_VOICE,  // "Reverse Flash (Alt)" skin → the Eobard Thawne (Injustice 2) pack
}

// Resolve the override POOL for a given fighter skin (null when no override applies).
export function getSkinVoicePool(rosterKey, skinId, pool) {
  const set = SKIN_VOICE[`${rosterKey}:${skinId}`]
  const arr = set && set[pool]
  return Array.isArray(arr) && arr.length ? arr : null
}

// Genuine random pick from a skin's override pool. Returns null when the equipped skin
// has no override for this (character, pool) — the caller then keeps base behavior.
export function pickSkinVoice(rosterKey, skinId, pool) {
  const arr = getSkinVoicePool(rosterKey, skinId, pool)
  if (!arr) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
