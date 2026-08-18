// jasonVoice.js — Jason Voorhees combat SFX/grunt pools (audio-only; ZERO gameplay effect).
//
// Jason is a NON-VERBAL kit: there is no dialogue/personality mapping. Every clip is an effort grunt,
// pain sound, roar, or heavy exhale tied to a COMBAT MOMENT, not a spoken line. Clips are mapped by
// TRIGGER POINT, not by content meaning. Filenames are the provided jason_sample_* candidates, PRESERVED
// EXACTLY (per the wiring brief — do not rename).
//
// Because these are wordless vocalizations, they are sorted by MEASURED ACOUSTIC FEATURES (a "can't-hear
// proxy", same principled method as nezukoVoice.js): clip duration, RMS intensity, peak, crest factor, and
// a zero-crossing brightness estimate — the reasonable substitute for a per-clip auditory judgement. The
// candidate→slot split the brief suggested (sub-1s = effort, medium = cast/react, long = roar) matched the
// measured durations exactly; features then place clips WITHIN each group. Feature notes are inline.
//
// pickJasonVoice(pool) → ONE clip at random (Math.random), same shape as pickNezukoVoice/pickInosukeVoice.
//
// ── TRIGGER MAP (where each pool fires; hooks in combat.js / abilities.js / game.js) ──
//   effortLight → active-frame of a LIGHT-tier normal (light + crouch-light)        combat.applyJasonAttackVoice
//   effortHeavy → active-frame of a HEAVY-tier normal (heavy / up / down_air + crouch-heavy)  combat.applyJasonAttackVoice
//   specialCast → Relentless Slash cast (committed effort grunt)                     abilities.executeJasonSpecial
//   specialRoar → Relentless Slash cast, ~25% signature roar instead of the grunt   abilities.executeJasonSpecial
//   hitReact    → Jason takes a STRONG (heavy/special-tier) hit                      combat.applyJasonHitVoice
//   knockdown   → Jason ENTERS the downed/knockdown state (any source)              combat.updateCombat watcher
//   win         → victory                                                            game.js win dispatch
//   (KO/death is intentionally LEFT SILENT — see the wiring report.)

export const JASON_VOICE = {
  // SLOT 1 — ATTACK EFFORT, split light vs heavy (the brief allowed either one shared grunt or a split;
  // two acoustically-distinct short clips were found, so it's split for weight).
  // LIGHT-tier = quick jab exertion. The sharpest/shortest short clip.
  effortLight: [
    "jason_sample_03_0025.mp3",   // 0.31s · sharp/bright (zcr~5.6k) · quick exertion — the jab grunt
  ],
  // HEAVY-tier = committed machete-swing grunt. The punchier / lower short clips.
  effortHeavy: [
    "jason_sample_04_0061.mp3",   // 0.39s · punchy, loud (rms 0.17) · low-mid — the swing grunt
    "jason_sample_01_0000.mp3",   // 0.94s · longer decaying grunt — adds variety on the heavy swings
  ],

  // SLOT 2 — SPECIAL CAST (Relentless Slash). The LOUD, sustained, full-throated efforts — reads more
  // committed/effortful than the plain attack grunt.
  specialCast: [
    "jason_sample_02_0011.mp3",   // 3.63s · loud sustained (rms 0.21, peak 1.0) · full effort
    "jason_sample_05_0093.mp3",   // 3.16s · bright sharp attack · slashing effort
    "jason_sample_12_0281.mp3",   // 3.63s · loudest/lowest sustained (rms 0.22) · guttural commit
  ],

  // SLOT 5 — SIGNATURE ROAR (optional). Since Jason has NO ultimate, a long roar occasionally lands on the
  // Relentless Slash cast (~25%, instead of the grunt) for extra weight without dominating every cast.
  specialRoar: [
    "jason_sample_07_0139.mp3",   // 9.85s · big peaky roar (crest 10.1) then decay — the dramatic yell
    "jason_sample_10_0220.mp3",   // 6.30s · loud, deep/low (zcr~646) sustained roar
  ],

  // SLOT 3 — HIT REACTION (strong hits only; gated in combat.js). A short/mid pained grunt (sharp onset,
  // moderate level, low-mid tone) — reads pained rather than aggressive.
  hitReact: [
    "jason_sample_13_0289.mp3",   // 2.04s · sharp onset, low-mid (zcr~902) · a pained "ugh"
  ],

  // SLOT 4 — KNOCKDOWN (enters the downed state). The distinct LOW, subdued, decaying groan — a heavier
  // "going down" sound, clearly separate from the sharper hit-react.
  knockdown: [
    "jason_sample_09_0203.mp3",   // 4.68s · quiet, very low (zcr~732), decaying · a collapsing groan
  ],

  // SLOT 6 — WIN (victory). Long-form — a victorious roar OR a heavy breathing exhale, at random.
  win: [
    "jason_sample_11_0257.mp3",   // 7.76s · quiet, very low (zcr~491), breathy · a menacing exhale
    "jason_sample_08_0179.mp3",   // 8.70s · long, sharp-onset roar · the victory bellow
  ],

  // AVAILABLE / UNUSED: jason_sample_06_0110.mp3 (6.11s loud sustained) — held in reserve; no slot needed it.
}

// Pick ONE clip from a pool at random (audio-only). Returns null for an empty/unknown pool so the caller's
// playSfxFile no-ops cleanly.
export function pickJasonVoice(pool) {
  const list = JASON_VOICE[pool]
  if (!Array.isArray(list) || list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)]
}
