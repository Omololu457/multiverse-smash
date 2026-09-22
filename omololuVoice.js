// omololuVoice.js
// ---------------------------------------------------------------------------
// Omololu voice-line pools (audio-only; NO gameplay effect). The 31 raw clips in ./clips/ were
// REAL-transcribed with faster-whisper (small model, en) and matched against the 15-line
// SCRIPT_REFERENCE.txt. Clips 001–016 map 1:1 to the 15 script lines — EXCEPT line 4, which the user
// recorded across a natural pause, so its two pieces (004 + 005) were concatenated (ffmpeg) into
// omololu_004_005_win.mp3. Clips 017–031 are extra/alternate takes not in the 15-line script; a few
// clean, unambiguous ones are folded into the taunt / hit / intangibility pools for variety (marked ★bonus).
//
// pickOmololuVoice(pool) returns ONE clip at random (same shape as pickObitoVoice); callers play via
// sound.playSfxFile(clip, null). Single-voice-channel is handled by the shared _voiceOwner stamp.
//
// Trigger → pool (wired in game.js / abilities.js):
//   intro              — reveal beat (INTRO_VOICE registry)                    lines 1,2
//   win                — round/match win                                       lines 3,4
//   taunt              — mid-fight jeer (folded into intro pool on the beat)   line 5 (+bonus)
//   lowHealth          — HP crosses low threshold                             line 6
//   hit                — taking-damage reaction                               lines 7,8,9 (+bonus)
//   flashTime          — SPECIAL: Flash Time (Back+Special)                   line 10
//   kamuiWarp          — SPECIAL: Kamui Warp (Down+Special)                    line 11
//   kamuiIntangibility — SPECIAL: Kamui Intangibility (P-tap)                  line 12 (+bonus)
//   kamuiDimension     — SPECIAL: Kamui Dimension (P-hold→release)            line 13
//   domainActivate     — ULTIMATE: Domain Expansion activation                line 14
//   domainMid          — ULTIMATE: Domain Expansion mid-sequence              line 15
// ---------------------------------------------------------------------------

const C = "./clips/"

export const OMOLOLU_VOICE = {
  // 1 "Alright, let's see what you've got."   2 "Careful — I picked up a few tricks."
  intro: [C + "omololu_001.mp3", C + "omololu_002.mp3"],
  // 3 "That's the game. Literally."   4 "I built this world. Don't expect to beat me in it." (004+005 concat)
  win: [C + "omololu_003.mp3", C + "omololu_004_005_win.mp3"],
  // 5 "You're not even trying."   ★bonus 025 "That's all you've got?", 027 "My intellect is higher than yours."
  taunt: [C + "omololu_006.mp3", C + "omololu_025.mp3", C + "omololu_027.mp3"],
  // 6 "Okay — okay, I'm still here."
  lowHealth: [C + "omololu_007.mp3"],
  // 7 "Agh!"   8 "Not bad."   9 "That actually hurt."   ★bonus 023 "Ugh."
  hit: [C + "omololu_008.mp3", C + "omololu_009.mp3", C + "omololu_010.mp3", C + "omololu_023.mp3"],
  // 10 "Everything just... slowed down."
  flashTime: [C + "omololu_011.mp3"],
  // 11 "Catch me if you can."
  kamuiWarp: [C + "omololu_012.mp3"],
  // 12 "Right through you."   ★bonus 028 "Try and touch me — you can't touch me."
  kamuiIntangibility: [C + "omololu_013.mp3", C + "omololu_028.mp3"],
  // 13 "Say goodbye to the background."
  kamuiDimension: [C + "omololu_014.mp3"],
  // 14 "Welcome to my dimension." (recorded as "Welcome to my domain.")
  domainActivate: [C + "omololu_015.mp3"],
  // 15 "Keep up!" (recorded as "Keep up, man.")
  domainMid: [C + "omololu_016.mp3"],
}

// Return ONE clip from a pool at random (audio-only → Math.random is fine; never hashed by the
// deterministic sim, same as pickObitoVoice / pickNaoyaVoice). null when the pool is empty/unknown.
export function pickOmololuVoice(pool) {
  const arr = OMOLOLU_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── PER-OPPONENT MATCHUP TRASH TALK ─────────────────────────────────────────
// 159 clips in ./combined/ (REAL faster-whisper transcription → DP-aligned to combined/SCRIPT_REFERENCE.txt).
// Clips 001–055 are generic in-match combat quips (no VS line) → OMOLOLU_MATCHUP_GENERIC. Clips 056–159
// are the 77 "VS <char>" lines IN SCRIPT ORDER (long lines split across 2–3 consecutive clips, grouped
// here). Keyed by the opponent's ACTUAL rosterKey (forms like goku_black / alt_sukuna / ghostface_billy
// are their own lines — NOT collapsed via voiceKey). Megumi (line recorded) is non-selectable → its clip
// lives in the generic pool. Sukuna's line was never recorded → no pool → generic at runtime.
const MU = "./combined/"
export const OMOLOLU_MATCHUP = {
  goku: [MU + "omololu_matchup_056.mp3"],
  vegeta: [MU + "omololu_matchup_057.mp3", MU + "omololu_matchup_058.mp3"],
  naruto: [MU + "omololu_matchup_059.mp3"],
  sasuke: [MU + "omololu_matchup_060.mp3"],
  frieza: [MU + "omololu_matchup_061.mp3"],
  gojo: [MU + "omololu_matchup_062.mp3", MU + "omololu_matchup_063.mp3"],
  ghostface: [MU + "omololu_matchup_064.mp3", MU + "omololu_matchup_065.mp3"],
  naoya: [MU + "omololu_matchup_066.mp3", MU + "omololu_matchup_067.mp3"],
  omniman: [MU + "omololu_matchup_068.mp3"],
  deathstroke: [MU + "omololu_matchup_069.mp3"],
  jason: [MU + "omololu_matchup_070.mp3", MU + "omololu_matchup_071.mp3"],
  rick: [MU + "omololu_matchup_072.mp3", MU + "omololu_matchup_073.mp3", MU + "omololu_matchup_074.mp3"],
  superman: [MU + "omololu_matchup_075.mp3"],
  piccolo: [MU + "omololu_matchup_076.mp3"],
  itachi: [MU + "omololu_matchup_077.mp3"],
  beerus: [MU + "omololu_matchup_078.mp3"],
  zaraki: [MU + "omololu_matchup_079.mp3", MU + "omololu_matchup_080.mp3"],
  toji: [MU + "omololu_matchup_081.mp3"],
  flash: [MU + "omololu_matchup_082.mp3"],
  goku_black: [MU + "omololu_matchup_083.mp3", MU + "omololu_matchup_084.mp3"],
  gotenks: [MU + "omololu_matchup_085.mp3"],
  bardock: [MU + "omololu_matchup_086.mp3", MU + "omololu_matchup_087.mp3"],
  vegito: [MU + "omololu_matchup_088.mp3"],
  alt_sukuna: [MU + "omololu_matchup_089.mp3", MU + "omololu_matchup_090.mp3"],
  aoi_todo: [MU + "omololu_matchup_091.mp3", MU + "omololu_matchup_092.mp3"],
  maki: [MU + "omololu_matchup_093.mp3"],
  yuji: [MU + "omololu_matchup_094.mp3"],
  miwa: [MU + "omololu_matchup_095.mp3", MU + "omololu_matchup_096.mp3"],
  yuta: [MU + "omololu_matchup_097.mp3", MU + "omololu_matchup_098.mp3", MU + "omololu_matchup_099.mp3"],
  tobirama: [MU + "omololu_matchup_101.mp3"],
  hashirama: [MU + "omololu_matchup_102.mp3"],
  minato: [MU + "omololu_matchup_103.mp3", MU + "omololu_matchup_104.mp3"],
  madara: [MU + "omololu_matchup_105.mp3", MU + "omololu_matchup_106.mp3"],
  obito: [MU + "omololu_matchup_107.mp3"],
  tobi: [MU + "omololu_matchup_108.mp3", MU + "omololu_matchup_109.mp3"],
  pain: [MU + "omololu_matchup_110.mp3", MU + "omololu_matchup_111.mp3"],
  isshiki: [MU + "omololu_matchup_112.mp3"],
  hiruzen: [MU + "omololu_matchup_113.mp3"],
  orochimaru: [MU + "omololu_matchup_114.mp3"],
  onoki: [MU + "omololu_matchup_115.mp3"],
  six_paths_pain: [MU + "omololu_matchup_116.mp3"],
  kakashi: [MU + "omololu_matchup_117.mp3", MU + "omololu_matchup_118.mp3"],
  zenitsu: [MU + "omololu_matchup_119.mp3"],
  rengoku: [MU + "omololu_matchup_120.mp3"],
  shinobu: [MU + "omololu_matchup_121.mp3"],
  inosuke: [MU + "omololu_matchup_122.mp3", MU + "omololu_matchup_123.mp3"],
  netero: [MU + "omololu_matchup_124.mp3"],
  chrollo: [MU + "omololu_matchup_125.mp3", MU + "omololu_matchup_126.mp3"],
  hisoka: [MU + "omololu_matchup_127.mp3"],
  kurapika: [MU + "omololu_matchup_128.mp3"],
  batman: [MU + "omololu_matchup_129.mp3", MU + "omololu_matchup_130.mp3"],
  brainiac: [MU + "omololu_matchup_131.mp3"],
  green_lantern: [MU + "omololu_matchup_132.mp3"],
  dark_knight: [MU + "omololu_matchup_133.mp3"],
  ichigo: [MU + "omololu_matchup_134.mp3"],
  mayuri: [MU + "omololu_matchup_135.mp3"],
  byakuya: [MU + "omololu_matchup_136.mp3"],
  yamamoto: [MU + "omololu_matchup_137.mp3"],
  saitama: [MU + "omololu_matchup_138.mp3"],
  genos: [MU + "omololu_matchup_139.mp3"],
  spiderman: [MU + "omololu_matchup_140.mp3"],
  iron_man: [MU + "omololu_matchup_141.mp3"],
  miles: [MU + "omololu_matchup_142.mp3"],
  gwen: [MU + "omololu_matchup_143.mp3", MU + "omololu_matchup_144.mp3"],
  vilgax: [MU + "omololu_matchup_145.mp3", MU + "omololu_matchup_146.mp3", MU + "omololu_matchup_147.mp3"],
  omega_ranger: [MU + "omololu_matchup_148.mp3"],
  samurai_red_ranger: [MU + "omololu_matchup_149.mp3"],
  gold_samurai_ranger: [MU + "omololu_matchup_150.mp3"],
  green_samurai_ranger: [MU + "omololu_matchup_151.mp3"],
  red_ranger_mmpr: [MU + "omololu_matchup_152.mp3", MU + "omololu_matchup_153.mp3"],
  ghostface_billy: [MU + "omololu_matchup_154.mp3"],
  ghostface_exe: [MU + "omololu_matchup_155.mp3", MU + "omololu_matchup_156.mp3"],
  rickPrime: [MU + "omololu_matchup_157.mp3"],
  ippo: [MU + "omololu_matchup_158.mp3"],
  baki: [MU + "omololu_matchup_159.mp3"],
}

// Generic pre-fight fallback (unnamed opponent, or a hard-excluded/minor opponent). 55 combat quips + the
// non-selectable megumi line. Mixed context (banter / win lines / a few hit reactions) — best-effort per
// the "every clip must be used" constraint.
export const OMOLOLU_MATCHUP_GENERIC = [MU + "omololu_matchup_001.mp3", MU + "omololu_matchup_002.mp3", MU + "omololu_matchup_003.mp3", MU + "omololu_matchup_004.mp3", MU + "omololu_matchup_005.mp3", MU + "omololu_matchup_006.mp3", MU + "omololu_matchup_007.mp3", MU + "omololu_matchup_008.mp3", MU + "omololu_matchup_009.mp3", MU + "omololu_matchup_010.mp3", MU + "omololu_matchup_011.mp3", MU + "omololu_matchup_012.mp3", MU + "omololu_matchup_013.mp3", MU + "omololu_matchup_014.mp3", MU + "omololu_matchup_015.mp3", MU + "omololu_matchup_016.mp3", MU + "omololu_matchup_017.mp3", MU + "omololu_matchup_018.mp3", MU + "omololu_matchup_019.mp3", MU + "omololu_matchup_020.mp3", MU + "omololu_matchup_021.mp3", MU + "omololu_matchup_022.mp3", MU + "omololu_matchup_023.mp3", MU + "omololu_matchup_024.mp3", MU + "omololu_matchup_025.mp3", MU + "omololu_matchup_026.mp3", MU + "omololu_matchup_027.mp3", MU + "omololu_matchup_028.mp3", MU + "omololu_matchup_029.mp3", MU + "omololu_matchup_030.mp3", MU + "omololu_matchup_031.mp3", MU + "omololu_matchup_032.mp3", MU + "omololu_matchup_033.mp3", MU + "omololu_matchup_034.mp3", MU + "omololu_matchup_035.mp3", MU + "omololu_matchup_036.mp3", MU + "omololu_matchup_037.mp3", MU + "omololu_matchup_038.mp3", MU + "omololu_matchup_039.mp3", MU + "omololu_matchup_040.mp3", MU + "omololu_matchup_041.mp3", MU + "omololu_matchup_042.mp3", MU + "omololu_matchup_043.mp3", MU + "omololu_matchup_044.mp3", MU + "omololu_matchup_045.mp3", MU + "omololu_matchup_046.mp3", MU + "omololu_matchup_047.mp3", MU + "omololu_matchup_048.mp3", MU + "omololu_matchup_049.mp3", MU + "omololu_matchup_050.mp3", MU + "omololu_matchup_051.mp3", MU + "omololu_matchup_052.mp3", MU + "omololu_matchup_053.mp3", MU + "omololu_matchup_054.mp3", MU + "omololu_matchup_055.mp3", MU + "omololu_matchup_100.mp3"]

// Opponents against whom the pointed trash talk is suppressed (apparent minors / tonal-clash). Their clip
// still exists in the pool above (every clip used), but the trigger routes them to the generic pool.
const OMOLOLU_MATCHUP_EXCLUDE = new Set(["naruto", "boruto", "kiba", "gohan", "gon", "killua", "nezuko", "ben10", "albedo", "saiki", "l_ryuuzaki", "light"])

// Pick omololu's pre-fight line for a given opponent rosterKey. Named + not-excluded → that character's
// specific line; otherwise a random generic line. null only if BOTH pools are somehow empty.
export function pickOmololuMatchup(opponentKey) {
  const pool = (opponentKey && !OMOLOLU_MATCHUP_EXCLUDE.has(opponentKey)) ? OMOLOLU_MATCHUP[opponentKey] : null
  const arr = (Array.isArray(pool) && pool.length) ? pool : OMOLOLU_MATCHUP_GENERIC
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
