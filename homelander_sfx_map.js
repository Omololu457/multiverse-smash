// homelander_sfx_map.js
// Homelander voice + SFX pools and the deterministic dispatch. AUTO-GENERATED pool lists
// (homelander_audio_work/gen_map.py from the acoustic analysis) — see docs/homelander/AUDIO_MAP.md.
//
// • Clip choice = juicePickVariant(hash(matchSeed, frame), player) — a pure hash of
//   (match seed, frame, player index); NEVER Math.random → LAN/replay deterministic.
// • Voice pools route through sound.playSfxFile with { owner: fighter } → the engine's single-voice
//   enforcer (a new line CUTS the old one, with a 40 ms fade) + automatic music ducking.
// • SFX pools layer freely (no owner). Pitch: +-3% on voice, +-5% on SFX (juicePitch).
// • Per-pool cooldowns rate-limit chatter; specials/ultimate/intro/win/etc. always play (cd 0).
// • LASER_BEAM is a held loop (startHomelanderLaser/stopHomelanderLaser) with a fade-out on release.
import { sound, juicePickVariant, juicePitch } from "./sound.js"

export const HOMELANDER_SFX = {
  INTRO: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_045_523s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_101_752s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_103_757s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_014_160s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p09.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_006_48s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_012_132s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_025_285s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_025_285s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_028_333s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_028_333s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_033_399s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_033_399s_p06.ogg"
  ],
  WIN: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_047_530s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_102_755s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_020_254s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_046_525s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_065_615s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_008_78s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_009_88s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_013_151s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_015_165s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_025_285s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_028_333s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_028_333s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_097_725s_p01.ogg"
  ],
  LOSE: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_055_573s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_029_360s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_058_578s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_096_721s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p11.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p08.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_013_151s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p09.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_025_285s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_030_368s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_032_382s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_033_399s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_097_725s_p02.ogg"
  ],
  ROUND_START: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_051_548s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_074_643s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_091_703s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_093_709s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_100_747s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_009_88s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_012_132s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_016_194s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_016_194s_p08.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_019_241s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_023_264s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_026_310s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_032_382s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_034_454s_p01.ogg"
  ],
  KO: [
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_006_48s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_013_151s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_024_276s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_032_382s_p01.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_017_212s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_075_646s.ogg"
  ],
  HIT_REACT: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_072_640s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_078_658s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_006_48s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_007_64s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_008_78s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_016_194s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_023_264s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_023_264s_p08.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_024_276s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_030_368s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_032_382s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_035_467s_p01.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_022_263s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_067_626s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_083_674s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_089_694s.ogg"
  ],
  ATTACK_EFFORT: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_073_642s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p10.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_006_48s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_007_64s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_016_194s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_023_264s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_024_276s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_024_276s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_030_368s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_033_399s_p01.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_003_30s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_062_609s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_071_638s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_088_692s.ogg"
  ],
  SPECIAL_CALLOUT: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_056_575s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_004_32s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_036_477s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_052_553s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_060_585s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_006_48s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_007_64s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p09.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_012_132s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_015_165s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_023_264s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_025_285s_p08.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_097_725s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_099_736s_p01.ogg"
  ],
  FLEX_TAUNT: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_031_379s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_063_611s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_050_542s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_066_620s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_076_648s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_006_48s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_008_78s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_013_151s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_015_165s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_016_194s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p08.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_023_264s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_026_310s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_099_736s_p03.ogg"
  ],
  GRAB: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_084_676s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_087_688s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_092_706s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_006_48s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_012_132s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_015_165s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_016_194s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_019_241s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_023_264s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_024_276s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_027_322s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_032_382s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_061_591s_p01.ogg"
  ],
  ULTIMATE: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_038_490s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_064_613s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_053_561s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_069_630s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_077_653s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_007_64s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_015_165s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_016_194s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_025_285s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_027_322s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_028_333s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_099_736s_p04.ogg"
  ],
  BRUTALITY: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_001_0s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_048_532s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_070_636s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_054_567s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_080_663s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_009_88s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_016_194s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_018_214s_p10.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_025_285s_p07.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_030_368s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_035_467s_p02.ogg"
  ],
  LASER_CHARGE: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_044_521s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_079_660s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_081_668s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_040_499s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_086_683s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p08.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_008_78s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_012_132s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_023_264s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_026_310s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_061_591s_p02.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_021_262s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_098_735s.ogg"
  ],
  LASER_BEAM: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_082_670s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_041_506s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_043_515s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_090_696s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_007_64s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_015_165s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_025_285s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_030_368s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_097_725s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_099_736s_p02.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_057_577s.ogg"
  ],
  SUPERSONIC: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_039_494s.ogg",
    "./assets/audio/homelander/source/lines_1_to_3s/hl_085_679s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_042_510s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_095_715s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_005_37s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_007_64s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_015_165s_p08.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_026_310s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_028_333s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_028_333s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_032_382s_p06.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_033_399s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_097_725s_p05.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_059_584s.ogg"
  ],
  FLIGHT_TAKEOFF: [
    "./assets/audio/homelander/source/lines_1_to_3s/hl_068_627s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_037_483s.ogg",
    "./assets/audio/homelander/source/lines_3_to_8s/hl_049_535s.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_002_3s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_009_88s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_009_88s_p02.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_009_88s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_011_100s_p04.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_012_132s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_015_165s_p05.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_019_241s_p01.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_026_310s_p03.ogg",
    "./assets/audio/homelander/source/long_over_8s_maybe_music/hl_033_399s_p04.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_010_99s.ogg",
    "./assets/audio/homelander/source/sfx_short_under_1s/hl_094_713s.ogg"
  ]
}

// SFX pools (effects) vs voice pools (speech). SFX layer; voice is single-channel + ducks.
export const HL_SFX_POOLS = new Set(["LASER_CHARGE", "LASER_BEAM", "SUPERSONIC", "FLIGHT_TAKEOFF"])

// Per-pool cooldown in frames so he doesn't talk constantly. 0 = always plays (specials/ult/intro/etc.).
const HL_COOLDOWN = {
  HIT_REACT: 30, ATTACK_EFFORT: 45, SPECIAL_CALLOUT: 24, FLEX_TAUNT: 40,
  FLIGHT_TAKEOFF: 20, SUPERSONIC: 0, LASER_CHARGE: 0, LASER_BEAM: 0,
  INTRO: 0, WIN: 0, LOSE: 0, ROUND_START: 0, KO: 0, ULTIMATE: 0, BRUTALITY: 0, GRAB: 0,
}

// Deterministic index: fold the match seed into the frame axis, then the existing juice hash.
function hlSeedFrame(seed, frame) { return (((seed >>> 0) ^ Math.imul((frame | 0), 0x9e3779b1)) >>> 0) }
function hlPlayer(f) { return (f && (f.side === "p2" || f.playerIndex === 1)) ? 1 : 0 }

export function pickHomelanderSfx(category, seed, frame, player) {
  const pool = HOMELANDER_SFX[category]
  return (pool && pool.length) ? juicePickVariant(pool, hlSeedFrame(seed, frame), player) : null
}

// Main dispatch. ctx = { seed, frame } (match seed + sim frame; callers pass matchConfig.seed /
// globalFrameCount). Returns true if a clip started.
export function playHomelanderSfx(category, fighter, ctx = {}) {
  if (!sound || !sound.playSfxFile || !fighter) return false
  const seed = ((ctx.seed != null ? ctx.seed : 1) >>> 0)
  // real sim frame when the caller passes it (hash of seed+frame+player); else a per-fighter event
  // counter — both are deterministic / LAN-safe (no Math.random).
  const frame = (ctx.frame != null) ? (ctx.frame | 0) : (fighter._hlN = ((fighter._hlN | 0) + 1))
  const player = hlPlayer(fighter)
  const cd = HL_COOLDOWN[category] ?? 0
  if (cd > 0) {
    const m = (fighter._hlCd || (fighter._hlCd = {}))
    if ((frame - (m[category] ?? -1e9)) < cd) return false
    m[category] = frame
  }
  const clip = pickHomelanderSfx(category, seed, frame, player)
  if (!clip) return false
  const isSfx = HL_SFX_POOLS.has(category)
  const rate = juicePitch(hlSeedFrame(seed, frame), player, isSfx ? 0.05 : 0.03)
  try {
    if (isSfx) sound.playSfxFile(clip, null, { rate })                              // SFX: layerable, SFX bus
    else       sound.playSfxFile(clip, null, { rate, owner: fighter, fadeMs: 40 })  // voice: single-channel + 40ms fade + duck
  } catch (_) { return false }
  return true
}

// ── LASER BEAM held loop ─────────────────────────────────────────────────────
// playSfxFile is one-shot; the sustained beam needs a loop + fade-out on release. We manage a
// dedicated looping HTMLAudioElement per fighter at the SFX volume (render-layer only; no sim state).
export function startHomelanderLaser(fighter, ctx = {}) {
  if (!fighter || fighter._hlLaserEl || typeof Audio === "undefined") return
  const clip = pickHomelanderSfx("LASER_BEAM", ctx.seed | 0, ctx.frame | 0, hlPlayer(fighter))
  if (!clip) return
  try {
    const src = (sound && sound._resolveSrc) ? sound._resolveSrc(clip) : clip
    const a = new Audio(src)
    a.loop = true
    a.playbackRate = juicePitch(hlSeedFrame(ctx.seed | 0, ctx.frame | 0), hlPlayer(fighter), 0.03)
    a.volume = (sound && sound._sfxMuted ? 0 : (sound && sound._sfxVol != null ? sound._sfxVol : 0.8)) * 0.85
    a.play().catch(() => {})
    fighter._hlLaserEl = a
  } catch (_) {}
}
export function stopHomelanderLaser(fighter, fadeMs = 120) {
  const a = fighter && fighter._hlLaserEl
  if (!a) return
  fighter._hlLaserEl = null
  const v0 = a.volume, steps = 6
  let i = 0
  const t = setInterval(() => {
    i++; try { a.volume = Math.max(0, v0 * (1 - i / steps)) } catch (_) {}
    if (i >= steps) { clearInterval(t); try { a.pause(); a.currentTime = 0 } catch (_) {} }
  }, Math.max(4, fadeMs / steps))
}

// Pool names in a stable order — for the Training-Mode sound test.
export const HL_POOL_ORDER = Object.keys(HOMELANDER_SFX)
