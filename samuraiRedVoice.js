// samuraiRedVoice.js
// ---------------------------------------------------------------------------
// Samurai Red Ranger (Fire) voice-line pools (audio-only; NO gameplay effect).
// 29 clips, English Power Rangers Samurai audio (samred_* — exact on-disk
// filenames, case preserved). Every entry is a real mp3 in the project root.
//
// pickSamuraiVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickRengokuVoice / pickShinobuVoice.
// Callers play via sound.playSfxFile(clip, null); the single-voice-channel
// (no self-overlap) is handled by sound._voiceOwner (a new Samurai line stops
// any currently-playing Samurai line; cross-character overlap untouched).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro       → game.js INTRO_VOICE (round-1 match intro / battle start)
//   win         → game.js round-end WINNER block (victory line)
//   megaMode    → abilities.js enterSamuraiMega (Mega Mode ACTIVATION — the silhouette-darken +
//                 火 calligraphy beat, BEFORE the reveal/flash resolves the Mega art)
//   fireSmasher → abilities.js executeSamuraiRangerSpecial (Flame Slash — the fire-themed SPECIAL,
//                 Mega-Mode-exclusive; cast line, sets _atkVoiceCd so it doesn't ALSO bark on connect)
//   spinSword   → abilities.js fireSamuraiRangerMove on samRekkaFin (the flaming Flame-Chain FINISHER —
//                 a base-weapon sword combo-ender; sets _atkVoiceCd, same no-double discipline)
//   ultimate    → abilities.js executeSamuraiRangerUltimate ("Fire Smasher: Blazing Strike" cast/windup,
//                 fires BEFORE the freeze-cinematic's STRIKE beat)
//   combatBark  → combat.js applySamuraiOffenseVoice (attacker lands a HEAVY / long-string connect)
//   hitReact    → combat.js applySamuraiHitVoice (defender got hit — general reaction)
//   lowHealth   → combat.js applySamuraiLowHealthVoice (once, crossing the low-HP line)
//
// ── NOTES / flagged decisions (per the wiring brief) ──
//   • TAUNT has NO dedicated trigger: the Samurai Red Ranger has no `taunt` action in characters.js
//     (only gojo/rick/ben10/goku_black/superman do), and enrolling him in the universal hold-Down heal-
//     taunt would change GAMEPLAY (excluded — this pass is audio-only). Per the brief's fallback, the
//     TAUNT/INTRO pool fires on INTRO ONLY. Flagged.
//   • WIN pool folds in the TEAM/FLAVOR pool: the brief lists WIN-LINE {026,027} and a generic "go go
//     samurai"-style TEAM/FLAVOR pool {006,007,011,014,017} it explicitly marks "good for win-line or
//     match-start flavor". There is no separate match-start event distinct from the intro beat (which
//     already plays the intro/taunt pool), so both sets share the single WIN event — one home per clip,
//     genuine random across all 7. Flagged deviation from the brief's 2-pool split.
//   • FIRE SMASHER pool → the Flame Slash SPECIAL (the only dedicated fire-themed special button move).
//     It is MEGA-MODE-EXCLUSIVE, so these lines only play while transformed (base form: special is a
//     no-op → no line). Flagged, not fabricated — the batch ships no base-tier Flame Slash.
//   • SPIN SWORD / base-weapon pool → the Flame-Chain FINISHER (samRekkaFin), the character's sword
//     combo-ender. Neutral normals / the two opener rekka stages stay silent (the finisher is the
//     "combo finisher" the brief names).
//   • SYMBOL POWER {021,022} → the ULTIMATE cast (the brief offered "Ultimate cast OR fold into the
//     transformation pool"; chose Ultimate cast — the ult is literally "Fire Smasher"-family and the
//     Mega activation already has its own dedicated 3-line pool). The one UNLISTED extra clip on disk,
//     005_pentagonal_fury (a big finisher-flavored callout the brief's pool list omits), is FOLDED into
//     this ultimate pool so all 29 files are wired — flagged as an added-in extra.
//   • HIT-REACTION / LOW-HEALTH {018,025} SPLIT: 018 "what in the world" → the general hit-react line;
//     025 "better backpedal" (retreat flavor) → the dedicated LOW-HEALTH line (a low-health trigger
//     exists, applySamuraiLowHealthVoice; Rengoku/Shinobu precedent).
//   • Specials / finisher / ultimate set _atkVoiceCd on cast so their cast line doesn't ALSO trigger the
//     offense combatBark on connect (no cast+connect double — same guard Rengoku/Shinobu use).
// ---------------------------------------------------------------------------

export const SAMURAI_VOICE = {
  // ── TAUNT / INTRO — confrontational openers (no taunt mechanic → intro-only) ──
  intro: [
    "samred_000_dont_want_them_retreat.mp3",
    "samred_002_impact_on_you.mp3",
    "samred_010_this_time_ill_stop_you.mp3",
    "samred_012_youre_worn_out_welcome.mp3",
    "samred_020_samurai_ranger_ready.mp3",
  ],

  // ── WIN — victory lines + folded-in TEAM/FLAVOR catchphrases ("go go samurai", "samurai out", …) ──
  win: [
    "samred_026_never_give_up.mp3",
    "samred_027_dont_want_to_hurt_you.mp3",
    "samred_006_samurizer.mp3",
    "samred_007_go_go_samurai.mp3",
    "samred_011_swords_combined.mp3",
    "samred_014_samurai_out.mp3",
    "samred_017_go_go_samurai_rangers_alt.mp3",
  ],

  // ── MEGA MODE activation — fires at the transformation ACTIVATION beat (before the reveal resolves) ──
  megaMode: [
    "samred_003_mega_mode_power_1.mp3",
    "samred_004_mega_mode_power_2.mp3",
    "samred_019_mega_shot.mp3",
  ],

  // ── FIRE SMASHER — the fire-themed SPECIAL (Flame Slash) cast pool ──
  fireSmasher: [
    "samred_001_fire_smasher.mp3",
    "samred_013_spin_sword_fire_smasher.mp3",
    "samred_015_fire_smasher_cannon_blast.mp3",
    "samred_016_fire_strike.mp3",
  ],

  // ── SPIN SWORD / base-weapon — fires on the Flame-Chain FINISHER (sword combo-ender) ──
  spinSword: [
    "samred_008_spin_sword.mp3",
    "samred_009_critical_slash.mp3",
    "samred_023_spin_sword_blazing_storm.mp3",
  ],

  // ── ULTIMATE cast — "Symbol Power" declarations + the folded-in 005 pentagonal-fury finisher callout ──
  ultimate: [
    "samred_021_symbol_power.mp3",
    "samred_022_new_symbol_combination.mp3",
    "samred_005_pentagonal_fury.mp3",
  ],

  // ── OFFENSE / combat bark (attacker lands a heavy / long-string hit) ──
  combatBark: [
    "samred_024_ill_take_that.mp3",
    "samred_028_finish_this.mp3",
  ],

  // ── HIT-REACTION (defender got hit) — "What in the world?!" ──
  hitReact: [
    "samred_018_what_in_the_world.mp3",
  ],

  // ── LOW-HEALTH (once, crossing the threshold) — "Better backpedal." ──
  lowHealth: [
    "samred_025_better_backpedal.mp3",
  ],
}

export function pickSamuraiVoice(pool) {
  const arr = SAMURAI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
