// itachiVoice.js
// ---------------------------------------------------------------------------
// Itachi Uchiha voice-line pools (audio-only; NO gameplay effect). Every entry is
// an on-disk mp3 filename (exact case). Mirrors rickVoice.js / the naruto+sasuke
// voice pattern: per-trigger pools, one clip fired at random per trigger via
// pickItachiVoice(pool). Callers play via sound.playSfxFile(clip, null) — a fresh
// Audio per call so a voice line overlaps the technique SFX (project convention).
//
// All 36 clips (itachi_000..035) are wired. The mapping leans on the clip names:
// Katon = Fire Style (fireball), Tsukuyomi = a genjutsu, Yasakani no Magatama /
// Totsuka = Susanoo tools, "great spirit" = the Susanoo summon, "eyes see nothing"
// = the Sharingan awakening.
// ---------------------------------------------------------------------------

export const ITACHI_VOICE = {
  // ── MOVE CASTS (fired at the technique's cast beat, abilities.js) ──────────
  fireball:     ["itachi_020_katon_cast.mp3"],                                   // Fire Style: Great Fireball (Katon)
  amaterasu:    ["itachi_000_amaterasu_cast.mp3"],                               // Amaterasu (Mangekyou)
  genjutsu:     ["itachi_002_tsukuyomi_cast.mp3", "itachi_026_finishing_touch.mp3"], // Genjutsu hit-confirm (Tsukuyomi)
  mangekyou:    ["itachi_015_eyes_see_nothing_1.mp3", "itachi_029_eyes_see_nothing_2.mp3", "itachi_033_eyes_see_nothing_3.mp3"], // Sharingan ignites
  susanoo:      ["itachi_032_great_spirit.mp3", "itachi_003_yasakani_magatama_1.mp3", "itachi_004_yasakani_magatama_2.mp3"],      // Susanoo summon (ultimate)
  susanooSword: ["itachi_001_totsuka_sword.mp3"],                               // Susanoo sword swing (Totsuka blade)

  // ── PRE-MATCH INTRO (game.js INTRO_VOICE) ─────────────────────────────────
  intro:        ["itachi_007_stay_calm_opening.mp3", "itachi_005_fight_pointless.mp3", "itachi_018_take_down_any_enemy.mp3"],

  // ── WIN pose (game.js match-over) ─────────────────────────────────────────
  win:          ["itachi_008_win_is_easy.mp3", "itachi_021_its_already_over_1.mp3", "itachi_030_its_already_over_3.mp3", "itachi_027_you_lose_1.mp3", "itachi_035_you_lose_2.mp3"],

  // ── OFFENSE pool (attacker connects, combat.js — _atkVoiceCd gated) ───────
  offense: [
    "itachi_009_you_are_weak_2.mp3", "itachi_010_you_are_weak_3.mp3", "itachi_006_unfortunate_reality_weak.mp3",
    "itachi_011_give_up_1.mp3", "itachi_013_give_up_2.mp3", "itachi_012_no_chance_1.mp3", "itachi_014_no_chance_2.mp3",
    "itachi_016_foolish_one.mp3", "itachi_017_sink_before_reality.mp3", "itachi_022_in_the_way.mp3",
    "itachi_023_dont_come_near.mp3", "itachi_028_no_escape.mp3", "itachi_034_every_technique_weakpoint.mp3", "itachi_024_how_naive.mp3",
  ],

  // ── HIT-TAKEN reaction pool (defender, combat.js — _hitVoiceCd gated) ─────
  reaction:     ["itachi_019_naruhodo_i_see.mp3", "itachi_025_quick_arent_you.mp3"],

  // ── LOW-HP self-bark (once per round on crossing the low line, combat.js) ─
  lowHp:        ["itachi_031_not_yet_fallen.mp3"],
}

export function pickItachiVoice(pool) {
  const arr = ITACHI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
