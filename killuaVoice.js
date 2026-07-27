// killuaVoice.js
// ---------------------------------------------------------------------------
// Killua Zoldyck voice-line pools (audio-only; NO gameplay effect). 83 clips,
// Japanese audio from "Nen Impact" (killuanen_* — kept intentionally, NOT
// translated/swapped). Every entry is an on-disk mp3 filename (exact case).
//
// pickKilluaVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickRickVoice / pickSukunaVoice.
// Callers play via sound.playSfxFile(clip, null) — a fresh Audio per call so a
// voice line overlaps the technique SFX and never cuts another off (project convention).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro          → game.js INTRO_VOICE (round-1 match intro)                    [000]
//   specialPalm    → abilities.js fireKilluaLightningPalm (F+Special)  ** PROVISIONAL pairing **
//   specialGodspeed→ abilities.js executeKilluaUltimate (Godspeed)      ** PROVISIONAL pairing **
//   specialCast    → abilities.js fireKilluaYoyo (N) + fireKilluaElectricBall (D)
//   combatBark     → combat.js applyKilluaOffenseVoice (attacker connect; primary)
//   taunt          → combat.js applyKilluaOffenseVoice (mixed into connect; see NOTE)
//   hitReact       → combat.js applyKilluaHitVoice (defender got hit)
//   win            → game.js _checkMatchOver (winner = Killua)
//   (charge-complete = the ONE special-cased clip, wired directly in game.js, not a pool) [082]
//
// ** PROVISIONAL SPECIAL PAIRINGS (flagged, low-medium confidence): the technique-name
//    clips are auto-transcribed stylised Japanese and may be mislabelled. Paired by best
//    thematic fit — "lightning_speed"/"thunder_god" (his fastest/lightning move) → the
//    Godspeed ULTIMATE; "gale"/"jinnai" (strike-type callouts) → the Lightning Palm STRIKE
//    special. Trivially swappable: move the entries between specialPalm / specialGodspeed. **
//
// NOTE — TAUNT has no dedicated trigger: Killua has no `taunt` action, and enrolling him in
//   the universal hold-Down heal-taunt would change gameplay (excluded — this pass is audio
//   only). So the taunt one-liners ride the attacker-connect trigger alongside combatBark
//   (the Rick/Sukuna precedent: a connect can pull from a taunt pool), rather than a taunt
//   button. Flagged for review if a real taunt mechanic is ever added.
// ---------------------------------------------------------------------------

export const KILLUA_VOICE = {
  // ── INTRO (match start) ──
  intro: ["killuanen_000_intro_lets_begin.mp3"],

  // ── TAUNT / confident-dismissive one-liners (large) — voiced via the connect trigger (see NOTE) ──
  taunt: [
    "killuanen_001_taunt_pretty_strong.mp3", "killuanen_002_focus_up.mp3", "killuanen_003_loser_buys_juice.mp3",
    "killuanen_004_flip_the_switch.mp3", "killuanen_005_no_holding_back.mp3", "killuanen_006_dont_push_yourself.mp3",
    "killuanen_007_dont_act_cute.mp3", "killuanen_008_bring_it_on.mp3", "killuanen_009_crazy_old_man.mp3",
    "killuanen_010_ill_show_you.mp3", "killuanen_011_used_to_fighting.mp3", "killuanen_012_since_i_was_born.mp3",
    "killuanen_013_is_this_the_end.mp3", "killuanen_014_not_that_big_a_deal.mp3", "killuanen_015_already_done.mp3",
    "killuanen_016_wont_stop_until_i_win.mp3", "killuanen_017_he_was_toying_with_me.mp3", "killuanen_018_not_bad.mp3",
    "killuanen_019_id_win_again.mp3", "killuanen_020_got_a_little_serious.mp3", "killuanen_021_that_was_close.mp3",
    "killuanen_022_boss_defeated_eventually.mp3", "killuanen_023_paid_back_debt.mp3", "killuanen_024_different_from_back_then.mp3",
    // frustration / pre-fight flavor folded in (brief's "your call")
    "killuanen_053_play_tag_with_you.mp3", "killuanen_055_taking_frustration_out.mp3", "killuanen_056_tonight_ill_turn_tables.mp3",
    "killuanen_060_counting_on_you.mp3", "killuanen_061_sync_up_with_me.mp3", "killuanen_062_ill_be_your_opponent.mp3",
    "killuanen_063_lets_do_this.mp3",
  ],

  // ── SPECIAL technique callouts (PROVISIONAL pairings — see header) ──
  specialPalm: [   // → Lightning Palm (strike-type): "gale" / "jinnai" callouts
    "killuanen_039_special_gale.mp3", "killuanen_040_special_jinnai.mp3", "killuanen_057_special_gale_jinnai_alt.mp3",
  ],
  specialGodspeed: [   // → Godspeed ultimate (his fastest / lightning): "lightning_speed" / "thunder_god"
    "killuanen_045_special_thunder_god_1.mp3", "killuanen_048_special_lightning_speed.mp3", "killuanen_052_special_thunder_god_2.mp3",
  ],

  // ── GENERIC special-cast flavor (un-named specials: Yo-Yo throw + Electric Ball) ──
  specialCast: [
    "killuanen_033_can_you_block_this.mp3", "killuanen_034_here_i_go.mp3", "killuanen_035_can_you_see_it.mp3",
    "killuanen_036_numb_up.mp3", "killuanen_038_try_to_dodge.mp3", "killuanen_041_how_about_this.mp3",
    "killuanen_047_here_i_go_alt.mp3", "killuanen_065_watch_this.mp3",
  ],

  // ── HIT-CONNECT / combat barks (attacker lands a hit) ──
  combatBark: [
    "killuanen_025_bark_now.mp3", "killuanen_026_bark_there.mp3", "killuanen_027_youll_get_hurt.mp3",
    "killuanen_028_bark_in_the_way.mp3", "killuanen_029_bark_move.mp3", "killuanen_030_ill_blow_you_away.mp3",
    "killuanen_031_still_going.mp3", "killuanen_032_is_that_all.mp3", "killuanen_037_push.mp3",
    "killuanen_042_got_it.mp3", "killuanen_043_miss.mp3", "killuanen_044_there_you_go.mp3",
    "killuanen_046_dont_run.mp3", "killuanen_050_game_over.mp3", "killuanen_051_watch_above.mp3",
    "killuanen_054_got_you.mp3", "killuanen_059_back_off.mp3", "killuanen_064_ill_dodge_this.mp3",
  ],

  // ── HIT-REACTION / dismissive (defender got hit) ──
  hitReact: [
    "killuanen_049_my_bad.mp3", "killuanen_058_damn_it.mp3", "killuanen_066_too_soft.mp3",
    "killuanen_067_annoying.mp3", "killuanen_068_seriously.mp3", "killuanen_069_underestimating_me.mp3",
    "killuanen_070_watch_closely.mp3", "killuanen_071_no_way.mp3", "killuanen_072_damn_it_alt.mp3",
    "killuanen_073_how_lame.mp3", "killuanen_074_how_uncool.mp3",
  ],

  // ── WIN pose (match victory) ──
  win: [
    "killuanen_075_laugh.mp3", "killuanen_076_go.mp3", "killuanen_077_alright_win.mp3",
    "killuanen_078_no_no.mp3", "killuanen_079_hmm_dismissive.mp3", "killuanen_080_lets_test_it_out.mp3",
    "killuanen_081_alright_confirm.mp3",
  ],
}

// killuanen_082_charge_complete.mp3 ("Alright, charge complete!") is NOT in a pool — it is a
// direct content-match wired in game.js to fire exactly when the charge buildup animation finishes.
export const KILLUA_CHARGE_COMPLETE_SFX = "killuanen_082_charge_complete.mp3"

export function pickKilluaVoice(pool) {
  const arr = KILLUA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
