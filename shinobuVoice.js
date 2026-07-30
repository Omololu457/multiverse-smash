// shinobuVoice.js
// ---------------------------------------------------------------------------
// Shinobu Kocho voice-line pools (audio-only; NO gameplay effect). 17 clips,
// Japanese Demon Slayer audio (shinobu_* — kept intentionally, NOT translated
// or swapped). Every entry is an on-disk mp3 filename (exact case preserved).
//
// pickShinobuVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickRengokuVoice / pickZenitsuVoice.
// Callers play via sound.playSfxFile(clip, null); the single-voice-channel
// (no self-overlap) is handled by sound._voiceOwner (a new Shinobu line stops
// any currently-playing Shinobu line; cross-character overlap untouched).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro            → game.js INTRO_VOICE (round-1 match intro / battle start)
//   poisonCast       → abilities.js fireShinobuPoisonThrust (Poison Thrust special — the poison move)
//   specialCast      → abilities.js fireShinobuFlit (Butterfly Flit — the non-poison special: Insect
//                      Breathing "dance" technique callouts)
//   ultimate         → abilities.js executeShinobuUltimate (Butterfly Dance ACTIVATION / windup, fires
//                      BEFORE the freeze-cinematic's STRIKE beat) — 009/014 candidates + the concentration
//                      pool folded in (see NOTES)
//   combatBark       → combat.js applyShinobuOffenseVoice (attacker lands a heavy / long-string hit)
//   hitReact         → combat.js applyShinobuHitVoice, STRONG hits (heavy/special/ultimate/launcher)
//   hitGrunt         → combat.js applyShinobuHitVoice, LIGHT hits (exertion grunt cluster)
//   lowHealth        → combat.js applyShinobuLowHealthVoice (once, crossing the low-HP line)
//
// ── NOTES / flagged decisions (per the wiring brief) ──
//   • TAUNT has NO dedicated trigger: Shinobu has no `taunt` action in characters.js (only gojo/rick/
//     ben10/goku_black/superman do), and enrolling her in the universal hold-Down heal-taunt would change
//     GAMEPLAY (excluded — this pass is audio-only). Per the brief's fallback, the INTRO/TAUNT pool
//     (000/003/016) fires on INTRO ONLY. Flagged.
//   • SPECIAL-CAST sort across her 2 BUILT specials: Poison Thrust ↔ poison pool {007,008} (clean 1:1 —
//     it IS the poison/DoT move, so the poison-flavor pool maps to it, NOT folded into the general pool).
//     Butterfly Flit ↔ the Insect-Breathing "dance" technique callouts {004,005,006} (random). The
//     spirit/void-dance callouts have no dedicated 1:1 special (she has only 2), so all three share the
//     one non-poison special's pool (random selection) — honest, no fabricated form→move assignment.
//   • CONCENTRATION pool {002,011}: Shinobu has NO mode / charge / transformation activation, so there is
//     no dedicated "mode-activation" event. The ULTIMATE windup is her one Total-Concentration moment, so
//     002/011 are FOLDED into the ultimate-windup pool alongside the 009/014 candidates (all four fire at
//     cast/windup, random). Flagged deviation from the brief's 2-pool split (done because no mode event
//     exists — the alternative was deferring two good clips).
//   • HIT-REACTION split (the brief's "your call"): 015 this_is_oh_no → the dedicated LOW-HEALTH line
//     (a low-health trigger exists, applyShinobuLowHealthVoice, Rengoku/Gon precedent); {010,013} → the
//     general (strong-hit) reaction pool; 001 combat_grunt_cluster → the LIGHT-hit exertion grunt.
//   • Specials/ultimate set _atkVoiceCd on cast so their cast line doesn't ALSO trigger the offense
//     combatBark on connect (no cast+connect double — same guard Rengoku/Zenitsu use).
// ---------------------------------------------------------------------------

export const SHINOBU_VOICE = {
  // ── INTRO / battle-start (no taunt mechanic → intro-only) ──
  intro: [
    "shinobu_000_being_forceful_isnt_good.mp3",
    "shinobu_003_coming_go_ahead_slow.mp3",
    "shinobu_016_can_you_keep_up.mp3",
  ],

  // ── POISON THRUST cast — the poison/DoT special ("How about this poison?" / "Change the blend") ──
  poisonCast: [
    "shinobu_007_how_about_this_poison.mp3",
    "shinobu_008_change_poison_blend.mp3",
  ],

  // ── BUTTERFLY FLIT cast — Insect Breathing "dance" technique callouts (random) ──
  specialCast: [
    "shinobu_004_butterfly_dance_caprice.mp3",
    "shinobu_005_spirit_dance_hexagon.mp3",
    "shinobu_006_void_dance_centipede.mp3",
  ],

  // ── ULTIMATE activation — "Butterfly Dance" windup (fires BEFORE the cinematic STRIKE). The 009/014
  //    "getting serious" candidates + the folded-in concentration declarations (002/011). Random. ──
  ultimate: [
    "shinobu_009_getting_serious_prepared.mp3",
    "shinobu_014_real_fight_begins.mp3",
    "shinobu_002_total_concentration_dance_cluster.mp3",
    "shinobu_011_insect_breathing_concentration.mp3",
  ],

  // ── OFFENSE / combat bark (attacker lands a heavy / long-string hit) ──
  combatBark: [
    "shinobu_012_here_i_go.mp3",
  ],

  // ── HIT-REACTION (defender got hit by a STRONG hit) — "Dangerous!" / "Why would you?" ──
  hitReact: [
    "shinobu_010_dangerous_dangerous.mp3",
    "shinobu_013_why_would_you.mp3",
  ],

  // ── LIGHT hit-reaction / exertion grunt cluster ──
  hitGrunt: [
    "shinobu_001_combat_grunt_cluster.mp3",
  ],

  // ── LOW-HEALTH (once, crossing the threshold) — "This is... oh no." ──
  lowHealth: [
    "shinobu_015_this_is_oh_no.mp3",
  ],
}

export function pickShinobuVoice(pool) {
  const arr = SHINOBU_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
