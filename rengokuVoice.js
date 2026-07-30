// rengokuVoice.js
// ---------------------------------------------------------------------------
// Kyojuro Rengoku voice-line pools (audio-only; NO gameplay effect). 51 clips,
// Japanese Demon Slayer audio (rengoku_* — kept intentionally, NOT translated
// or swapped). Every entry is an on-disk mp3 filename (exact case).
//
// pickRengokuVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickZenitsuVoice / pickGonVoice.
// Callers play via sound.playSfxFile(clip, null); the single-voice-channel
// (no self-overlap) is handled by sound._voiceOwner (set to the acting
// fighter), so a new Rengoku line stops any currently-playing Rengoku line —
// while cross-character overlap is left untouched (project-wide audio rule).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro        → game.js INTRO_VOICE (round-1 match intro / battle start)
//   formCallout  → abilities.js fireRengokuCommand (combo SUPER-FINISHER branches:
//                  rengokuSuperFwd / rengokuSuperDown / rengokuSuperAir) + fireRengokuFlameStrike
//                  (Charged Flame Strike, both tiers). Flame-Breathing FORM callouts.
//   concentration→ abilities.js executeRengokuSpecial (COUNTER stance cast — "Total Concentration")
//   ultimate     → abilities.js executeRengokuUltimate (Flame Explosion ACTIVATION / windup,
//                  fires BEFORE the freeze-cinematic's detonation beat)
//   combatBark   → combat.js applyRengokuOffenseVoice (attacker lands a heavy / long-string hit)
//   hitReact     → combat.js applyRengokuHitVoice (defender got hit — effort-grunt cluster)
//   lowHealth    → combat.js applyRengokuLowHealthVoice (once, crossing the low-HP line)
//   win          → game.js round-end WINNER block (determination / resolve pool)
//
// ── NOTES on the brief's suggested triggers & filenames ──
//   • The brief's filename guesses were CUTTING-ORDER estimates; several differ from disk. Verified
//     against the actual on-disk listing and REMAPPED. The most important correction: the "Ultimate
//     Technique" line is rengoku_039_ultimate_technique.mp3 on disk (the brief said _033 — that slot is
//     actually total_concentration_constant). All 51 files 000-050 are wired below.
//   • TAUNT has NO dedicated trigger: Rengoku has no `taunt` action in characters.js (only gojo/rick/
//     ben10/black_goku/superman do), and enrolling him in the universal hold-Down heal-taunt would change
//     gameplay (excluded — this pass is audio only). Per the brief's fallback, the TAUNT-COMBAT clips
//     (040 "feel free to strike" / 041 "come at me") FOLD INTO the offense-connect combatBark pool
//     (Gon/Killua/Hisoka/Zenitsu precedent for a taunt-less char). The INTRO/TAUNT pool fires on intro only.
//   • FORM CALLOUTS: the sprite kit has 4 flame "form" moves — three combo super-finisher branches
//     (rengokuSuperFwd/Down/Air) + the two-tier Charged Flame Strike. The nine form callouts (First→Fifth
//     Form / Kien Banshou) share ONE `formCallout` pool that all four moves draw from at random — the
//     Demon Slayer forms don't map 1:1 onto the mechanical branches, so a shared random pool is honest
//     (no fabricated form→branch assignment). Setting _atkVoiceCd on cast prevents a cast+connect double
//     with combatBark (same guard zenitsu's specials use).
//   • DETERMINATION/RESOLVE (002 burn/grit / 003 fulfill duty / 004 defeat you here) → placed as the WIN
//     pool (brief offered "win-line OR pre-Ultimate resolve — your call"; the ultimate already has its own
//     dedicated activation line 039, so these land cleaner as victory lines).
//   • CONCENTRATION/MODE pool fires on the COUNTER cast (the one neutral non-charge special) — "Total
//     Concentration Breathing" as he braces. Includes the extra on-disk concentration clips (035 short,
//     047 flame_breathing_short2) the brief didn't enumerate.
// ---------------------------------------------------------------------------

export const RENGOKU_VOICE = {
  // ── INTRO / battle-start (match start; no taunt mechanic → intro-only) ──
  intro: [
    "rengoku_000_hmm_alright.mp3",
    "rengoku_006_great_skill.mp3",
    "rengoku_042_whats_wrong.mp3",
    "rengoku_043_is_that_all.mp3",
  ],

  // ── FLAME BREATHING FORM callouts — combo super-finisher branches + Charged Flame Strike (random) ──
  formCallout: [
    "rengoku_001_kien_banshou_third_form.mp3",
    "rengoku_008_first_form_laugh.mp3",
    "rengoku_009_second_form_rising_flame_1.mp3",
    "rengoku_010_second_form_rising_flame_2.mp3",
    "rengoku_011_fifth_form_1.mp3",
    "rengoku_012_fifth_form_2.mp3",
    "rengoku_013_third_form_kien_banshou_1.mp3",
    "rengoku_014_third_form_kien_banshou_2.mp3",
    "rengoku_036_fourth_form.mp3",
  ],

  // ── TOTAL CONCENTRATION / mode flavor — COUNTER stance cast ──
  concentration: [
    "rengoku_005_flame_breathing_concentration.mp3",
    "rengoku_007_flame_breathing_thats_enough.mp3",
    "rengoku_015_hmm_short.mp3",
    "rengoku_016_alright_short.mp3",
    "rengoku_033_total_concentration_constant.mp3",
    "rengoku_034_total_concentration_breathing.mp3",
    "rengoku_035_total_concentration_short.mp3",
    "rengoku_047_flame_breathing_short2.mp3",
  ],

  // ── ULTIMATE activation — "Ultimate Technique" (奥義). Fires at Flame Explosion cast/windup, BEFORE
  //    the freeze-cinematic's detonation beat (executeRengokuUltimate, not the onImpact payoff). ──
  ultimate: [
    "rengoku_039_ultimate_technique.mp3",
  ],

  // ── OFFENSE / combat bark (attacker lands a heavy / long-string hit). Folds the taunt-less char's
  //    TAUNT-COMBAT clips (040/041) + the hit-connect distinctive bark (032) + aggressive flame flavor. ──
  combatBark: [
    "rengoku_032_take_the_fall_properly.mp3",
    "rengoku_037_flame_wave_1.mp3",
    "rengoku_038_flame_wave_2.mp3",
    "rengoku_040_feel_free_to_strike.mp3",
    "rengoku_041_come_at_me.mp3",
    "rengoku_044_burn_it_all_away.mp3",
    "rengoku_045_perish.mp3",
    "rengoku_046_swallow_it.mp3",
  ],

  // ── HIT-REACTION (defender got hit) — the effort-grunt cluster (grunt_1 … grunt_15). Random. ──
  hitReact: [
    "rengoku_017_grunt_1.mp3",
    "rengoku_018_grunt_2.mp3",
    "rengoku_019_grunt_3.mp3",
    "rengoku_020_grunt_4.mp3",
    "rengoku_021_grunt_5.mp3",
    "rengoku_022_grunt_6.mp3",
    "rengoku_023_grunt_7.mp3",
    "rengoku_024_grunt_8.mp3",
    "rengoku_025_grunt_9.mp3",
    "rengoku_026_grunt_10.mp3",
    "rengoku_027_grunt_11.mp3",
    "rengoku_028_grunt_12.mp3",
    "rengoku_029_grunt_13.mp3",
    "rengoku_030_grunt_14.mp3",
    "rengoku_031_grunt_15.mp3",
  ],

  // ── LOW-HEALTH / flavor (once, crossing the threshold) ──
  lowHealth: [
    "rengoku_048_feeling_energized.mp3",
    "rengoku_049_unbelievable.mp3",
    "rengoku_050_thats_enough2.mp3",
  ],

  // ── WIN / victory — determination & resolve pool (fires when the WINNER is Rengoku) ──
  win: [
    "rengoku_002_burn_heart_grit_teeth.mp3",
    "rengoku_003_fulfill_duty.mp3",
    "rengoku_004_defeat_you_here.mp3",
  ],
}

export function pickRengokuVoice(pool) {
  const arr = RENGOKU_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
