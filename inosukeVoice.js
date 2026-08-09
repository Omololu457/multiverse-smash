// inosukeVoice.js
// ---------------------------------------------------------------------------
// Inosuke Hashibira voice-line pools (audio-only; NO gameplay effect). 41 wired
// clips out of 93, Japanese Demon Slayer / Hinokami Chronicles audio — filenames
// PRESERVED EXACTLY (inosuke_voice_NNN_tMMmSS_Ns.mp3, nothing renamed/re-encoded).
//
// pickInosukeVoice(pool) returns ONE clip at random — genuine Math.random()
// selection, same shared-helper shape as pickShinobuVoice / pickRengokuVoice.
// Callers play via sound.playSfxFile(clip, null); the single-voice-channel
// (no self-overlap) is handled by sound._voiceOwner (a new Inosuke line stops
// any currently-playing Inosuke line; cross-character overlap untouched).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro        → game.js INTRO_VOICE.inosuke (round-1 match intro / battle start). TAUNT folds in —
//                  Inosuke's introPool IS the taunt sprite, and enrolling a taunt-voice event would be a
//                  gameplay change (this pass is audio-only). Shinobu/Gon/Rengoku precedent.
//   specialCast  → abilities.js fireInosukeCinematicSpecial — the THREE Beast Breathing CINEMATIC specials
//                  (Spin / Dash Thrust / Slashing Lunge Fan). Random Fang/Form callout per cast.
//   beastAssist  → abilities.js fireBeastBreathingAssist — the Beast Breathing ASSIST mid-combo partner
//                  call (Stage-4 signature; Inosuke has NO separate ultimate). Style-name declarations.
//   combatBark   → combat.js applyInosukeOffenseVoice (attacker lands a heavy / long-string hit)
//   hitReact     → combat.js applyInosukeHitVoice, STRONG hits (heavy/special/launcher/spike/≥55)
//   hitGrunt     → combat.js applyInosukeHitVoice, LIGHT hits (exertion grunt cluster)
//   lowHealth    → combat.js applyInosukeLowHealthVoice (once, crossing the low-HP line)
//   win          → game.js winner block (fires only when the WINNER is Inosuke)
//
// ── NOTES / flagged decisions (per the wiring brief) ──
//   • SPECIAL-CAST vs the kit: the game gives Inosuke 3 GENERIC Beast-Breathing cinematic specials
//     (spin/dash/lunge — NOT one-move-per-Fang) + the Beast Breathing Assist. So the intact Fang/Form
//     callouts (壱〜玖ノ牙 / 捌ノ型) are pooled as `specialCast` (random across the 3 cinematic specials),
//     and the STYLE-NAME declarations (獣の呼吸 / 全集中 / 空間識覚) are pooled as `beastAssist` (the move
//     that literally CALLS a Beast-Breathing partner). No fabricated per-move Fang→special assignment.
//   • Named-character discards: 0 — no clip names another character (Tanjiro/Zenitsu/Nezuko/Rengoku/etc.);
//     every noisy token is a mistranscribed technique name. See INOSUKE_VOICE_LOG.md.
//   • Specials/assist set `_atkVoiceCd` on cast so their cast line doesn't ALSO trigger the offense
//     combatBark on connect (no cast+connect double — same guard Shinobu/Rengoku/Zenitsu use).
// ---------------------------------------------------------------------------

export const INOSUKE_VOICE = {
  // ── INTRO / battle-start + taunt (intro-only, audio-safe) ──
  intro: [
    "inosuke_voice_013_t00m23_4s.mp3",   // やっはー！ Yah-ha!
    "inosuke_voice_015_t00m27_6s.mp3",   // めんどくせー！ What a pain! (signature)
    "inosuke_voice_024_t00m42_7s.mp3",   // 聞かねえぜ！ I won't listen!
    "inosuke_voice_085_t02m36_1s.mp3",   // おもしろい Interesting!
    "inosuke_voice_086_t02m37_8s.mp3",   // 来た来た来た来た！ Here it comes!
    "inosuke_voice_092_t02m49_2s.mp3",   // 行くぜ！ Let's go!
  ],

  // ── SPECIAL-CAST — Beast Breathing FANG/FORM callouts (random per cinematic special) ──
  specialCast: [
    "inosuke_voice_066_t01m55_8s.mp3",   // 壱ノ牙・穿ち抜き  (1st Fang: Pierce)
    "inosuke_voice_047_t01m19_3s.mp3",   // 弐ノ牙・切り裂き  (2nd Fang: Slice)
    "inosuke_voice_070_t02m05_6s.mp3",   // 参ノ牙・喰い裂き  (3rd Fang: Devour)
    "inosuke_voice_050_t01m26_8s.mp3",   // 肆ノ牙・切細裂き  (4th Fang)
    "inosuke_voice_074_t02m15_8s.mp3",   // 伍ノ牙・狂い裂き  (5th Fang: Crazy Cut)
    "inosuke_voice_006_t00m11_5s.mp3",   // 陸ノ牙・乱杭咲き  (6th Fang)
    "inosuke_voice_055_t01m37_5s.mp3",   // 捌ノ型・爆裂猛進  (8th Form: Explosive Rush)
    "inosuke_voice_060_t01m45_1s.mp3",   // 玖ノ牙・伸・うねり裂き (9th Fang)
  ],

  // ── BEAST BREATHING ASSIST — style-name / concentration declarations (partner call) ──
  beastAssist: [
    "inosuke_voice_075_t02m19_5s.mp3",   // 獣の呼吸  Beast Breathing!
    "inosuke_voice_090_t02m45_2s.mp3",   // ケダモノの…！ Beast! (Breathing cry)
    "inosuke_voice_042_t01m11_1s.mp3",   // 全集中  Total Concentration
    "inosuke_voice_010_t00m19_1s.mp3",   // 空間識覚  spatial-sense form (read the field, call the partner)
  ],

  // ── OFFENSE / combat bark (attacker lands a heavy / long string) ──
  combatBark: [
    "inosuke_voice_002_t00m04_2s.mp3",   // 貰ったぜ！ I got it!
    "inosuke_voice_012_t00m21_8s.mp3",   // でやるぜー！ I'll do it!
    "inosuke_voice_016_t00m29_1s.mp3",   // 仕上がれ！ Finish it!
    "inosuke_voice_018_t00m31_6s.mp3",   // 甘いぜ！ Too naive!
    "inosuke_voice_035_t00m57_5s.mp3",   // 覚悟しやがれ！ Prepare yourself!
    "inosuke_voice_037_t01m00_9s.mp3",   // 決めてやるぜ！ I'll finish it!
    "inosuke_voice_052_t01m32_0s.mp3",   // 見つけた！そこか！ Found you! There!
    "inosuke_voice_067_t01m59_2s.mp3",   // 引き裂けてやる！ I'll tear you apart!
    "inosuke_voice_087_t02m40_0s.mp3",   // 斬りつけてやる！ I'll cut you down!
  ],

  // ── HIT-REACTION (defender took a STRONG hit) ──
  hitReact: [
    "inosuke_voice_028_t00m48_2s.mp3",   // こわっ！ Scary!
    "inosuke_voice_031_t00m51_8s.mp3",   // つくすわー！ Damn it!
    "inosuke_voice_082_t02m30_4s.mp3",   // くっそォォ！ Crap!
    "inosuke_voice_088_t02m41_4s.mp3",   // なんじゃこれや！ What the hell is this?!
    "inosuke_voice_089_t02m42_5s.mp3",   // ザケンじゃねぇぞ！ Don't screw with me!
  ],

  // ── LIGHT hit-reaction / exertion grunt cluster ──
  hitGrunt: [
    "inosuke_voice_020_t00m34_8s.mp3",   // はっはっ！ (effort)
    "inosuke_voice_030_t00m50_5s.mp3",   // あ゛あ゛あ゛！ Argh!
    "inosuke_voice_036_t00m59_2s.mp3",   // なぁー！ (yell)
    "inosuke_voice_076_t02m21_5s.mp3",   // あああああ (roar)
  ],

  // ── LOW-HEALTH (once, crossing the threshold) ──
  lowHealth: [
    "inosuke_voice_039_t01m04_3s.mp3",   // 舐めるんじゃねえ！ Don't underestimate me!
    "inosuke_voice_083_t02m32_5s.mp3",   // 負けねぇ I won't lose.
  ],

  // ── WIN / victory ──
  win: [
    "inosuke_voice_003_t00m05_5s.mp3",   // よっしゃー！ Yesss!
    "inosuke_voice_022_t00m37_5s.mp3",   // 斬り味が自慢なのさ My cutting is my pride
    "inosuke_voice_040_t01m06_1s.mp3",   // はっはっはっは！ (victory laugh)
  ],
}

export function pickInosukeVoice(pool) {
  const arr = INOSUKE_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
