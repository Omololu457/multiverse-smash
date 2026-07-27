// tobiramaVoice.js
// ---------------------------------------------------------------------------
// Tobirama Senju voice-line pools (audio-only; NO gameplay effect). 27 clips,
// Japanese audio (tobirama_* — kept intentionally, NOT translated/swapped).
// Every entry is an on-disk mp3 filename (exact case).
//
// pickTobiramaVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickRickVoice / pickKilluaVoice.
// Callers play via sound.playSfxFile(clip, null) — a fresh Audio per call so a
// voice line overlaps the technique SFX and never cuts another off (project convention).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro        → game.js INTRO_VOICE (round-1 match intro) — his will-of-fire / hokage declarations
//   cast         → abilities.js fireTobiramaWaterDragon (neutral Special)     ** PROVISIONAL pairing **
//   ultimateCast → abilities.js executeTobiramaUltimate (Edo Tensei activation)
//   taunt        → combat.js applyTobiramaOffenseVoice (attacker strong/long-string connect; see NOTE)
//   finisher     → game.js _checkMatchOver (winner = Tobirama) — victory / finishing declarations
//
// ** PROVISIONAL CAST PAIRING (flagged, low confidence): tobirama_000_special_cast_seiton — the
//    technique name is garbled in transcription. Paired to the WATER DRAGON (his signature neutral
//    water jutsu = best water-jutsu fit). Trivially swappable: move it onto another special's cast. **
//
// NOTE — TAUNT has no dedicated trigger: Tobirama has no `taunt` action, and enrolling him in the
//   universal hold-Down heal-taunt would change gameplay (excluded — audio only). So his taunt
//   one-liners ride the attacker-connect trigger (the Rick precedent: a connect can pull from a taunt
//   pool). Flagged for review if a real taunt mechanic is ever added.
// ---------------------------------------------------------------------------

export const TOBIRAMA_VOICE = {
  // ── INTRO / power-declaration (match start) — will of fire, hokage resolve ──
  intro: [
    "tobirama_002_will_of_fire_cannot_be_extinguished.mp3", "tobirama_003_reason_cannot_lose.mp3",
    "tobirama_008_show_you_will_of_fire.mp3", "tobirama_011_my_will_of_fire_1.mp3",
    "tobirama_012_protect_those_who_believe.mp3", "tobirama_013_duty_of_hokage.mp3",
    "tobirama_014_young_will_of_fire_carry_era.mp3", "tobirama_015_second_hokage_show_resolve.mp3",
    "tobirama_016_inherited_will_try_extinguish.mp3", "tobirama_017_guardian_no_retreat.mp3",
    "tobirama_018_something_worth_risking_life.mp3", "tobirama_019_must_be_ruthless_as_hokage.mp3",
    "tobirama_020_my_will_of_fire_2.mp3",
  ],

  // ── CAST — water-jutsu special callout (PROVISIONAL: seiton → Water Dragon) ──
  cast: ["tobirama_000_special_cast_seiton.mp3"],

  // ── GETTING-SERIOUS / ULTIMATE cast (Edo Tensei activation) ──
  ultimateCast: [
    "tobirama_009_been_a_while_might_not_hold_back.mp3", "tobirama_010_get_serious.mp3",
    "tobirama_023_no_kindness_full_might.mp3", "tobirama_024_you_are_a_threat_ill_finish_you.mp3",
  ],

  // ── TAUNT / overconfident one-liners — voiced via the connect trigger (see NOTE) ──
  taunt: [
    "tobirama_001_overconfident_taunt.mp3", "tobirama_004_youll_understand.mp3",
    "tobirama_005_no_resistance.mp3", "tobirama_021_shinobi_caliber_fallen.mp3",
    "tobirama_022_crush_you_never_touch_village.mp3",
  ],

  // ── FINISHER / victory declarations (match win) ──
  finisher: [
    "tobirama_006_stay_asleep.mp3", "tobirama_007_no_longer_needed.mp3",
    "tobirama_025_drag_you_out_of_darkness.mp3", "tobirama_026_for_the_future_forward.mp3",
  ],
}

export function pickTobiramaVoice(pool) {
  const arr = TOBIRAMA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
