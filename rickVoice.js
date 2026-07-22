// rickVoice.js
// ---------------------------------------------------------------------------
// Rick Sanchez voice-line pools (audio-only; NO gameplay effect). Every entry is
// an on-disk mp3 filename (exact case) — several are honest multi-line clusters
// packed into one file, so each pool ENTRY is one trigger firing the whole cluster.
//
// pickRickVoice(pool) returns ONE clip at random — genuine Math.random() selection
// that generalizes to any N-entry pool. The project had no generic pooled-voice
// helper (each character's win-line/hit-pool alternation was inlined with a local
// Math.random coin-flip); this is the small shared extension that scales cleanly to
// Rick's large pools (Meeseeks 14, taunt 8, catchphrase/rocket 6, hit-light 5, …).
// Callers play via sound.playSfxFile(clip, null) — a fresh Audio per call so a voice
// line overlaps the technique SFX and never cuts another off (the project convention).
// ---------------------------------------------------------------------------

export const RICK_VOICE = {
  // ── HIT REACTIONS (defender) — split by tier, combat.js applyRickHitVoice ──
  hitLight:   ["rick_017_whoa.mp3", "rick_018_hit.mp3", "rick_019_heheh.mp3", "rick_020_hit.mp3", "rick_021_hit.mp3"],
  hitHeavy:   ["rick_022_ah.mp3", "rick_023_ow.mp3", "rick_024_argh.mp3", "rick_025_urrrgh.mp3"],

  // ── TAUNT → HEAL callout (the hold-Down-10s heal taunt), game.js ──
  tauntHeal:  ["rick_026_do_it_for_grandpa_morty.mp3", "rick_027_don_t_worry_morty.mp3", "rick_028_grandpa_s_sorry_morty.mp3"],

  // ── SELF-DESTRUCT ULTIMATE — activation vs payoff (two distinct beats), abilities.js ──
  ultActivate: ["rick_029_wubba_lubba_dub_dub.mp3", "rick_030_it_s_called_a_deterrent.mp3"],
  ultPayoff:   ["rick_031_oh_shit_well_that_s_cool.mp3", "rick_032_boom.mp3"],

  // ── GENERIC TAUNT / combat-flavor (attacker connect), combat.js applyRickOffenseVoice ──
  taunt: [
    "rick_033_oldest_rick_trick_in_the_book.mp3", "rick_034_god_i_love_my_tech.mp3",
    "rick_035_get_morphed_dweeb.mp3", "rick_036_suck_it.mp3", "rick_037_haha_yeah.mp3",
    "rick_038_eat_it.mp3", "rick_039_yeah_you_like_that.mp3", "rick_040_not_bad_if_i_do_say_so_myself.mp3",
  ],

  // ── ROCKET special (Up + Special) cast pool, abilities.js ──
  rocket: [
    "rick_041_whoa_ho_bet_you_didn_t_see_that_coming.mp3", "rick_042_here_i_go.mp3",
    "rick_043_gravity_s_for_trumps.mp3", "rick_044_bam_jet_boots.mp3",
    "rick_045_watch_your_heads_idiots.mp3", "rick_046_yeah_you_like_those_jet_boots.mp3",
  ],

  // ── MEESEEKS BOX (neutral Special) summon-cast pool — 14 entries (no summon cap → many distinct barks), abilities.js ──
  meeseeks: [
    "rick_047_fly_meeseeks.mp3", "rick_048_meeseeks_up.mp3", "rick_049_get_me_out_of_here.mp3",
    "rick_050_gotta_go_meeseeks.mp3", "rick_051_how_s_that_feel.mp3", "rick_052_test_this_for_me.mp3",
    "rick_053_now_just_relax.mp3", "rick_054_this_might_sting.mp3", "rick_055_this_hurts_me_more_than_you.mp3",
    "rick_056_someone_order_a_meeseeks.mp3", "rick_057_get_up_there.mp3", "rick_058_charge.mp3",
    "rick_059_meeseeks_go.mp3", "rick_060_i_choose_you_meeseeks.mp3",
  ],

  // ── INTRO / character bark pool (Rick's own match-intro cry), game.js INTRO_VOICE ──
  intro: [
    "rick_061_wubba_lubba_dub_dub.mp3", "rick_062_buckle_up.mp3", "rick_063_you_know_who_i_am.mp3",
    "rick_064_i_m_rick_sanchez_baby.mp3", "rick_065_hail_to_the_king.mp3",
    "rick_066_i_m_the_smartest_person_in_the_universe.mp3",
  ],

  // ── WIN-pose pool, game.js _checkMatchOver ──
  win: ["rick_067_time_to_get_schwifty.mp3", "rick_068_rick_dance.mp3"],

  // ── MATCH-FLOW / HUD barks (gated to LOCAL PLAYER = Rick; his voice as your hype-man/announcer) ──
  matchStart: ["rick_001_yeah.mp3"],                                   // match/first-round start
  roundWin:   ["rick_005_hey_you_won.mp3"],                            // Rick's side won the round
  roundLoss:  ["rick_002_uh_the_other_guys_won_that_one.mp3", "rick_003_not_you.mp3", "rick_004_sorry.mp3"],
  ko:         ["rick_007_oh_shit_you_re_down.mp3", "rick_008_that_s_a_knockout.mp3", "rick_009_k_freakin_o.mp3"],
  matchEnd:   ["rick_015_ding_ding_jerks.mp3", "rick_016_fight_s_over.mp3"],   // time-over bell
  timerMinute:["rick_011_only_a_minute_left_now.mp3", "rick_014_one_minute_left.mp3"],   // 60s warning
  timer30:    ["rick_013_ugh.mp3"],                                    // 30s warning
  timer10:    ["rick_012_ten_seconds.mp3"],                            // 10s warning

  // ── TEAM-MODE round-win callouts (FFA team mode), game.js checkFFAOutcome ──
  teamBlue:   ["rick_006_blue_team_gets_that_one.mp3"],                // Team A (#38bdf8 = blue)
  teamRed:    ["rick_010_the_red_guys_got_that_point.mp3"],            // Team B (#fb7185 = red)

  // rick_000_you_gotta_pick_a_character.mp3 → DEFERRED. It's a character-SELECT-screen
  // announcer bark, but that screen has no roster context yet (nobody has been picked),
  // so there is no clean "Rick is involved" gate — wiring it would make Rick's voice play
  // for every player regardless of who they choose (a new always-on announcer mechanic).
  // Flagged, not wired, per the brief's "don't build new mechanics to fit a line" rule.
}

export function pickRickVoice(pool) {
  const arr = RICK_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
