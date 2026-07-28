// zenitsuVoice.js
// ---------------------------------------------------------------------------
// Zenitsu Agatsuma voice-line pools (audio-only; NO gameplay effect). 16 clips,
// Japanese audio (zenitsu_* — kept intentionally, NOT translated/swapped). Every
// entry is an on-disk mp3 filename (exact case).
//
// pickZenitsuVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickGonVoice / pickKilluaVoice. Callers
// play via sound.playSfxFile(clip, null); the single-voice-channel (no self-
// overlap) is handled by sound._voiceOwner (set to the acting fighter), so a new
// Zenitsu line stops any currently-playing Zenitsu line — while cross-character
// overlap is left untouched (project-wide audio rule).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro        → game.js INTRO_VOICE (round-1 match intro / battle start)
//   thunderclap  → abilities.js fireZenitsuThunderclap  (First Form: Thunderclap & Flash special CAST)
//   ultimate     → abilities.js executeZenitsuUltimate  (Godspeed dash-THROUGH ult ACTIVATION, before the dash)
//   combatBark   → combat.js applyZenitsuOffenseVoice   (attacker lands a strong / long-string hit)
//   hitReact     → combat.js applyZenitsuHitVoice       (defender got hit)
//   lowHealth    → combat.js applyZenitsuLowHealthVoice (once, crossing the low-HP line)
//   doubleAttack → abilities.js fireZenitsuDoubleAttack (Double Attack special ACTIVATION — both Tanjiro & Inosuke)
//
// ── NOTES on the brief's suggested triggers ──
//   • TAUNT has NO dedicated trigger: Zenitsu has no `taunt` action, and enrolling him in the universal
//     hold-Down heal-taunt would change gameplay (excluded — this pass is audio only). Per the brief's
//     fallback, the four TAUNT/DETERMINATION clips (005-008) FOLD INTO the offense-connect `combatBark`
//     pool (Gon/Killua/Hisoka precedent for a taunt-less char).
//   • The single COMBAT-FLAVOR clip (013 "this is it, here I go") is used as an offense-connect BARK
//     (its best fit) — the Double Attack activation already has the "full commitment" finisher line (015).
//   • THUNDER BREATHING has exactly ONE special in the kit (First Form: Thunderclap & Flash), so both
//     First Form callouts (002/003) map to it and are picked at random.
// ---------------------------------------------------------------------------

export const ZENITSU_VOICE = {
  // ── INTRO / battle-start (match start; no taunt mechanic → intro-only) ──
  intro: [
    "zenitsu_000_how_about_that_there.mp3",
    "zenitsu_001_coming_come_on_saw_through.mp3",
  ],

  // ── THUNDER BREATHING — First Form: Thunderclap & Flash special CAST (the one Thunder special) ──
  thunderclap: [
    "zenitsu_002_thunder_first_form_1.mp3",
    "zenitsu_003_thunder_first_form_2.mp3",
  ],

  // ── ULTIMATE activation — "Godspeed" / "Thunder Breathing: Total Concentration" (his most advanced
  //    named techniques). Fires on the dash-THROUGH ult's ACTIVATION, before the dash executes. ──
  ultimate: [
    "zenitsu_004_godspeed.mp3",
    "zenitsu_009_thunder_breathing_concentration.mp3",
  ],

  // ── OFFENSE / combat bark (attacker lands a strong / long-string hit). Folds the taunt-less char's
  //    DETERMINATION pool (005-008) + the punchy combat-flavor line (013) — see NOTES above. ──
  combatBark: [
    "zenitsu_005_only_way_will_cut.mp3",
    "zenitsu_006_no_going_back_show_you.mp3",
    "zenitsu_007_counterattack.mp3",
    "zenitsu_008_wont_give_up.mp3",
    "zenitsu_013_this_is_it_here_i_go.mp3",
  ],

  // ── HIT-REACTION (defender got hit) ──
  hitReact: [
    "zenitsu_011_no_way.mp3",
    "zenitsu_012_damn_it.mp3",
    "zenitsu_014_got_hit.mp3",
  ],

  // ── LOW-HEALTH / comeback (once, crossing the threshold) ──
  lowHealth: [
    "zenitsu_010_cant_be_done_yet.mp3",
  ],

  // ── DOUBLE ATTACK activation (full-commitment finisher line — fires on BOTH Tanjiro & Inosuke variants) ──
  doubleAttack: [
    "zenitsu_015_total_concentration.mp3",
  ],
}

export function pickZenitsuVoice(pool) {
  const arr = ZENITSU_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
