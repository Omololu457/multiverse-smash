// gonVoice.js
// ---------------------------------------------------------------------------
// Gon Freecss voice-line pools (audio-only; NO gameplay effect). 48 clips,
// Japanese audio from "Nen Impact" (gonnen_* — kept intentionally, NOT
// translated/swapped). Every entry is an on-disk mp3 filename (exact case).
//
// pickGonVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickKilluaVoice / pickRickVoice.
// Callers play via sound.playSfxFile(clip, null) — a fresh Audio per call so a
// voice line overlaps the technique SFX and never cuts another off (project convention).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro       → game.js INTRO_VOICE (round-1 match intro)
//   rock        → abilities.js fireGonRock        (Neutral+Special: Jajanken ROCK cast)
//   scissors    → abilities.js fireGonScissors    (Fwd+Special:     Jajanken SCISSORS cast)
//   paper       → abilities.js fireGonPaper       (Down+Special:    Jajanken PAPER cast)
//   rekka       → abilities.js fireGonCommand     (Down+Heavy "Rush" command-normal opener)
//   combatBark  → combat.js applyGonOffenseVoice  (attacker lands a strong/long-string hit)
//   hitReact    → combat.js applyGonHitVoice      (defender got hit)
//   lowHealth   → combat.js applyGonLowHealthVoice (once, crossing the low-HP line)
//   parry       → combat.js checkParry            (successful parry read — "I'll return it")
//   win         → game.js _checkMatchOver         (winner = Gon)
//   (Final Blow sudden-death = the ONE special-cased clip below, wired DIRECTLY in
//    abilities.fireGonSuddenDeath — NOT in any pool, so it can never leak to another Jajanken
//    variant or the general Adult Form transformation.)
//
// NOTE — TAUNT has no dedicated trigger: Gon has no `taunt` action, and enrolling him in the
//   universal hold-Down heal-taunt would change gameplay (excluded — this pass is audio only). The
//   "intro/taunt" clips therefore fire on the INTRO beat only (Killua/Naruto/Tobirama precedent).
//   Flagged for review if a real taunt mechanic is ever added for Gon.
// ---------------------------------------------------------------------------

export const GON_VOICE = {
  // ── INTRO / pre-fight (match start; no taunt mechanic → intro-only, see NOTE) ──
  intro: [
    "gonnen_000_alright_come_on.mp3", "gonnen_001_anytime_is_fine.mp3", "gonnen_002_ready_lets_hurry.mp3",
    "gonnen_004_beat_you_head_on.mp3", "gonnen_008_someday_ill_show_you.mp3", "gonnen_009_alright_short.mp3",
    "gonnen_029_alright_confirm.mp3",
  ],

  // ── JAJANKEN — ROCK cast (Neutral+Special; the charge-telegraph signature) ──
  rock: [
    "gonnen_012_janken_rock_1.mp3", "gonnen_013_rock_wont_lose.mp3", "gonnen_014_rock_starts_here.mp3",
    "gonnen_015_everything_into_fist.mp3", "gonnen_018_rock_alt.mp3", "gonnen_038_first_is_rock_start.mp3",
    "gonnen_039_first_is_rock_chant.mp3",
  ],

  // ── JAJANKEN — SCISSORS cast (Fwd+Special; rapid multi-hit jab) ──
  //   chain_ren ("連"/chain = the rapid-jab fit) + the "Rock Rock Sci-Sci-Scissors Paper Paper"
  //   practice chant (stray flavor bark, best-fit here on the multi-hit variant).
  scissors: [
    "gonnen_026_chain_ren.mp3", "gonnen_011_jajanken_rapid_practice.mp3",
  ],

  // ── JAJANKEN — PAPER cast (Down+Special; palm-push spacing tool) ──
  //   "ken_block_completely" (拳/fist — a defensive-palm read) folded onto Paper.
  paper: [
    "gonnen_003_ken_block_completely.mp3",
  ],

  // ── RUSH command-normal chain opener (Down+Heavy) — aggressive technique callouts ──
  rekka: [
    "gonnen_030_sword_ken.mp3", "gonnen_037_come_sword_technique.mp3",
  ],

  // ── HIT-CONNECT / combat barks (attacker lands a strong / long-string hit) ──
  combatBark: [
    "gonnen_020_got_you.mp3", "gonnen_021_move.mp3", "gonnen_022_come.mp3", "gonnen_023_please.mp3",
    "gonnen_024_my_turn.mp3", "gonnen_025_lets_do_this.mp3", "gonnen_027_more.mp3", "gonnen_028_i_can_block.mp3",
    "gonnen_031_heavy.mp3", "gonnen_019_ready_go.mp3", "gonnen_040_now_come.mp3", "gonnen_041_whats_wrong.mp3",
    "gonnen_042_what_will_you_do.mp3", "gonnen_046_wait.mp3", "gonnen_016_blow_away.mp3",
  ],

  // ── HIT-REACTION (defender got hit) ──
  hitReact: [
    "gonnen_032_no_way.mp3", "gonnen_033_i_lost.mp3", "gonnen_036_damn_it.mp3",
    "gonnen_043_this_is_bad.mp3", "gonnen_045_thats_wrong.mp3",
  ],

  // ── LOW-HEALTH / comeback (once, crossing the threshold) ──
  lowHealth: [
    "gonnen_034_im_going_to_die.mp3", "gonnen_035_i_can_still_fight.mp3", "gonnen_044_not_yet.mp3",
  ],

  // ── PARRY (successful parry read — combat.js checkParry) ──
  parry: [
    "gonnen_047_ill_return_it.mp3",
  ],

  // ── WIN (match victory) ──
  win: [
    "gonnen_005_big_victory.mp3", "gonnen_006_lets_do_it_again.mp3", "gonnen_007_managed_to_win.mp3",
    "gonnen_010_that_was_tough_stronger.mp3",
  ],
}

// FINAL BLOW (Adult Form sudden-death) cast line — "It's fine if this ends" / sudden-death janken.
// NOT in any pool: wired DIRECTLY in abilities.fireGonSuddenDeath so it fires EXCLUSIVELY on the
// Final Blow activation and can never leak into another Jajanken variant or the Adult Form transform.
export const GON_FINAL_BLOW_SFX = "gonnen_017_sudden_death_janken.mp3"

export function pickGonVoice(pool) {
  const arr = GON_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
