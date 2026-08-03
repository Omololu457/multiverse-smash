// chrolloVoice.js
// ---------------------------------------------------------------------------
// Chrollo Lucilfer voice-line pools (audio-only; NO gameplay effect). Japanese
// audio (chrollo_* — kept intentionally, NOT translated/swapped). Every entry
// is an on-disk mp3 filename (exact case).
//
// pickChrolloVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickGonVoice / pickKilluaVoice. Callers
// play via sound.playSfxFile(clip, null) — a fresh Audio per call (project convention).
//
// ── FILENAME NOTE ──
//   The wiring brief listed best-guess filenames derived from the audio CUTTING
//   ORDER, which drifted from the final on-disk numbering (e.g. the brief's
//   "chrollo_038_skill_hunter" is really chrollo_039_skill_hunter; "chrollo_045_switch"
//   is really chrollo_050_switch). Every clip below was matched to the ACTUAL disk
//   file by its SEMANTIC suffix (the meaning the brief intended), not its number.
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro        → game.js INTRO_VOICE (round-1 match intro). No taunt action exists
//                  for Chrollo → intro-only (same precedent as Gon/Killua/Tobirama).
//   ultActivate  → abilities.executeChrolloUltimate — the Skill Hunter transform
//                  ACTIVATION beat (fires ONCE, before the copied-character swap at
//                  cinematic frame 84, while the fighter is still Chrollo → uses
//                  Chrollo's voice and can't overlap the copied character's later lines).
//   combatBark   → combat.js applyChrolloOffenseVoice (attacker lands a heavy/long-string hit)
//   tauntCombat  → combat.js applyChrolloOffenseVoice (~30% of connects, taunt one-liner;
//                  Killua/Hisoka "taunt rides offense-connect" precedent)
//   grunt        → combat.js applyChrolloHitVoice (LIGHT hit-react = exertion grunt)
//   hitReact     → combat.js applyChrolloHitVoice (HEAVY hit-react = surprise/pain pool)
//   lowHealth    → combat.js applyChrolloLowHealthVoice (once, crossing the low-HP line —
//                  "the spider doesn't die", a comeback line)
//   win          → game.js _checkMatchOver (winner = Chrollo)
// ---------------------------------------------------------------------------

export const CHROLLO_VOICE = {
  // ── INTRO / pre-fight (match start; no taunt mechanic → intro-only, see TRIGGER MAP) ──
  intro: [
    "chrollo_001_fighting_you_not_a_risk.mp3", "chrollo_002_not_bad_here_now.mp3",
    "chrollo_003_come_seriously.mp3", "chrollo_008_not_very_interested.mp3",
    "chrollo_011_next_time_one_on_one.mp3", "chrollo_021_slow.mp3",
  ],

  // ── HIT-CONNECT / combo barks (attacker lands a heavy / long-string hit) ──
  combatBark: [
    "chrollo_020_above.mp3", "chrollo_023_can_you_dodge.mp3", "chrollo_027_right_here.mp3",
    "chrollo_040_curtain_fall.mp3", "chrollo_053_die_for_me.mp3",
  ],

  // ── TAUNT-COMBAT one-liners (rides ~30% of offense connects) ──
  tauntCombat: [
    "chrollo_029_too_bad.mp3", "chrollo_030_miss.mp3", "chrollo_032_ridiculous.mp3",
    "chrollo_033_useless.mp3", "chrollo_035_is_this_all.mp3", "chrollo_054_oh.mp3",
    "chrollo_055_not_bad.mp3",
  ],

  // ── COMBAT GRUNT (light hit-react = exertion) ──
  grunt: [
    "chrollo_016_grunt_cluster_1.mp3", "chrollo_022_grunt_cluster_2.mp3",
  ],

  // ── HIT-REACTION / surprise (heavy hit-react = pain/surprise) ──
  hitReact: [
    "chrollo_056_misjudged.mp3", "chrollo_057_more_than_expected.mp3",
    "chrollo_061_tough.mp3", "chrollo_062_pain_grunt.mp3",
  ],

  // ── LOW-HEALTH / comeback (once, crossing the threshold) — "the spider doesn't die" ──
  lowHealth: [
    "chrollo_063_spider_doesnt_die.mp3",
  ],

  // ── WIN (match victory) — see-ya / farewell / spider-flavor ──
  win: [
    "chrollo_006_spider_not_individual.mp3", "chrollo_019_see_ya.mp3",
    "chrollo_047_see_you_again.mp3", "chrollo_067_my_bad.mp3", "chrollo_068_unfortunately.mp3",
  ],
}

// SKILL HUNTER ultimate ACTIVATION pool — "Skill Hunter" (exact name match) + "Switch"
// (the transformation itself). Fired ONCE at the cinematic activation beat via
// pickChrolloVoice("ultActivate") in abilities.executeChrolloUltimate. Kept in the same
// pool (random pick between the two) rather than split across two beats: the project's
// single-voice-channel-per-character rule would make a second same-owner line cut the
// first, so one clean fire is the safe, non-overlapping choice.
CHROLLO_VOICE.ultActivate = [
  "chrollo_039_skill_hunter.mp3", "chrollo_050_switch.mp3",
]

export function pickChrolloVoice(pool) {
  const arr = CHROLLO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
