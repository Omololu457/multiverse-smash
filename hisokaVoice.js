// hisokaVoice.js
// ---------------------------------------------------------------------------
// Hisoka Morrow voice-line pools (audio-only; NO gameplay effect). 136 source clips → 71 wired,
// Japanese audio from "Nen Impact" (hisokanen_* — kept intentionally, NOT translated/swapped).
// Filenames keep their original tXXmXX timestamp (REVFLASH precedent); the content map is
// HISOKANEN_VOICE_LOG.md. Every entry is an on-disk mp3 filename (exact case).
//
// pickHisokaVoice(pool) returns ONE clip at random — genuine Math.random() selection, same
// shared-helper shape as pickGonVoice / pickKilluaVoice. Callers play via sound.playSfxFile(clip,
// null) — a fresh Audio per call so a voice line overlaps the technique SFX (project convention).
//
// -- TRIGGER MAP (where each pool fires) --
//   intro      -> game.js INTRO_VOICE (round-1 match intro)
//   taunt      -> combat.js applyHisokaOffenseVoice (mixed into connect; no taunt action, see NOTE)
//   bungee     -> abilities.js fireHisokaBungeeGum      (Neutral+Special: Bungee Gum whip)
//   texture    -> abilities.js fireHisokaCardSingle (Down+Special) + fireHisokaCardRapid (Fwd+Special)
//   overdrive  -> abilities.js executeHisokaUltimate    (Bloodlust Overdrive activation)
//   rekka      -> abilities.js fireHisokaCommand         (Down+Heavy "Card Flourish" rekka opener)
//   combatBark -> combat.js applyHisokaOffenseVoice      (attacker lands a strong/long-string hit)
//   hitReact   -> combat.js applyHisokaHitVoice          (defender got hit)
//   lowHealth  -> combat.js applyHisokaLowHealthVoice    (once, crossing the low-HP line)
//   win        -> game.js _checkMatchOver                (winner = Hisoka)
//
// NOTE — TAUNT has no dedicated trigger: Hisoka has no `taunt` action, and enrolling him in the
//   universal hold-Down heal-taunt would change gameplay (excluded — this pass is audio only). So the
//   taunt one-liners ride the attacker-connect trigger alongside combatBark (the Killua/Gon precedent:
//   a connect can pull from a taunt pool). Flagged for review if a real taunt mechanic is ever added.
// ---------------------------------------------------------------------------

export const HISOKA_VOICE = {
  // -- INTRO / pre-fight (match start). No taunt action → intro fires on the intro beat only. --
  intro: [
    "hisokanen_002_t00m09_1s.mp3", "hisokanen_015_t00m46_3s.mp3", "hisokanen_047_t02m12_0s.mp3",
    "hisokanen_092_t03m43_5s.mp3", "hisokanen_128_t05m00_7s.mp3", "hisokanen_131_t05m07_4s.mp3",
    "hisokanen_135_t05m16_4s.mp3",
  ],
  // -- TAUNT — flirty/sadistic one-liners. No `taunt` action → voiced via the connect trigger (see NOTE). --
  taunt: [
    "hisokanen_000_t00m00_6s.mp3", "hisokanen_001_t00m05_4s.mp3", "hisokanen_003_t00m13_1s.mp3",
    "hisokanen_006_t00m18_7s.mp3", "hisokanen_007_t00m21_6s.mp3", "hisokanen_012_t00m34_6s.mp3",
    "hisokanen_013_t00m38_4s.mp3", "hisokanen_014_t00m42_5s.mp3", "hisokanen_020_t00m58_1s.mp3",
    "hisokanen_025_t01m10_3s.mp3", "hisokanen_026_t01m15_8s.mp3", "hisokanen_027_t01m18_5s.mp3",
    "hisokanen_029_t01m24_6s.mp3", "hisokanen_030_t01m27_8s.mp3", "hisokanen_035_t01m42_6s.mp3",
    "hisokanen_037_t01m44_9s.mp3", "hisokanen_038_t01m47_2s.mp3", "hisokanen_080_t03m18_3s.mp3",
    "hisokanen_082_t03m25_1s.mp3", "hisokanen_123_t04m51_7s.mp3", "hisokanen_124_t04m53_5s.mp3",
  ],
  // -- BUNGEE GUM cast (Neutral+Special) — the 5 clean "Bungee Gum" technique callouts. --
  bungee: [
    "hisokanen_058_t02m35_6s.mp3", "hisokanen_059_t02m37_4s.mp3", "hisokanen_060_t02m39_3s.mp3",
    "hisokanen_061_t02m41_2s.mp3", "hisokanen_062_t02m43_0s.mp3",
  ],
  // -- TEXTURE SURPRISE cast (Down/Fwd+Special card throws) — magician card-flourish patter. --
  texture: [
    "hisokanen_068_t02m53_3s.mp3", "hisokanen_069_t02m55_1s.mp3", "hisokanen_070_t02m56_9s.mp3",
    "hisokanen_074_t03m05_1s.mp3", "hisokanen_076_t03m09_8s.mp3", "hisokanen_097_t03m54_1s.mp3",
    "hisokanen_098_t03m56_0s.mp3",
  ],
  // -- BLOODLUST OVERDRIVE cast (Ultimate) — transformation boast. --
  overdrive: [
    "hisokanen_090_t03m40_2s.mp3", "hisokanen_022_t01m03_1s.mp3",
  ],
  // -- CARD FLOURISH rekka opener (Down+Heavy) — aggressive turn-taking callouts. --
  rekka: [
    "hisokanen_088_t03m36_2s.mp3", "hisokanen_066_t02m50_1s.mp3", "hisokanen_093_t03m45_4s.mp3",
  ],
  // -- HIT-CONNECT / combat barks (attacker lands a strong / long-string hit). --
  combatBark: [
    "hisokanen_009_t00m24_3s.mp3", "hisokanen_019_t00m56_5s.mp3", "hisokanen_021_t01m00_5s.mp3",
    "hisokanen_032_t01m33_5s.mp3", "hisokanen_048_t02m13_5s.mp3", "hisokanen_049_t02m15_2s.mp3",
    "hisokanen_055_t02m28_4s.mp3", "hisokanen_064_t02m46_6s.mp3", "hisokanen_065_t02m48_2s.mp3",
    "hisokanen_081_t03m21_7s.mp3", "hisokanen_083_t03m26_8s.mp3", "hisokanen_112_t04m21_3s.mp3",
    "hisokanen_129_t05m03_0s.mp3",
  ],
  // -- HIT-REACTION (defender got hit) — delighted/dismissive. --
  hitReact: [
    "hisokanen_040_t01m51_6s.mp3", "hisokanen_050_t02m18_1s.mp3", "hisokanen_094_t03m48_7s.mp3",
    "hisokanen_095_t03m50_4s.mp3", "hisokanen_132_t05m09_9s.mp3",
  ],
  // -- LOW-HEALTH / cornered (once, crossing the line) — Hisoka THRILLED by the danger. --
  lowHealth: [
    "hisokanen_051_t02m19_9s.mp3", "hisokanen_054_t02m24_8s.mp3",
  ],
  // -- WIN (match victory) — grade/dismiss/flirt sign-off. --
  win: [
    "hisokanen_018_t00m53_4s.mp3", "hisokanen_034_t01m39_3s.mp3", "hisokanen_075_t03m07_2s.mp3",
    "hisokanen_084_t03m28_6s.mp3", "hisokanen_096_t03m52_3s.mp3", "hisokanen_111_t04m19_1s.mp3",
  ],
}

export function pickHisokaVoice(pool) {
  const arr = HISOKA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
