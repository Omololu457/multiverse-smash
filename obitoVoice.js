// obitoVoice.js
// ---------------------------------------------------------------------------
// Obito Uchiha voice-line pools (audio-only; NO gameplay effect). Curated from the 192-clip JAPANESE
// set (obito_voice_*, Storm Connections source) transcribed in OBITO_VOICE_LOG.md (native-JA pass +
// English gloss). Named-character lines (Kakashi/Rin/Naruto/Jiraiya/Minato/Kushina), non-speech, and
// near-duplicates were discarded. pickObitoVoice(pool) returns ONE clip at random (same shape as
// pickMadaraVoice); callers play via sound.playSfxFile(clip, null). Single-voice-channel via _voiceOwner.
//
// Per-technique cast pools matched to his ACTUAL built kit (see OBITO_VOICE_LOG.md §match):
//   kamuiActivate — Kamui INTANGIBILITY activation (toggleObitoKamui) — its own pool per spec.
//   kamuiWarp     — Kamui space-time: self-portal / teleport-grab / teleport-behind.
//   special       — the ranged throws (shuriken / rod / giant shuriken).
//   juubi         — the Ten-Tails / Juubi Bijūdama ULTIMATE (executeObitoUltimate).
// ---------------------------------------------------------------------------

export const OBITO_VOICE = {
  // ── ★ KAMUI INTANGIBILITY ACTIVATION (toggleObitoKamui — abilities.js; ON only, silent off) ──
  kamuiActivate: [
    "obito_voice_001_t00m01_9s.mp3",   // 001 やるぞ! カムイ! — I'll do it! Kamui!
    "obito_voice_018_t01m05_2s.mp3",   // 018 俺が案内してやる — I'll guide you.
    "obito_voice_005_t00m24_7s.mp3",   // 005 次に目にするのは — The next thing I'm going to do is...
  ],
  // ── ★ KAMUI WARP — self-portal / teleport-grab / teleport-behind (abilities.js) ──
  kamuiWarp: [
    "obito_voice_007_t00m29_6s.mp3",   // 007 お前も連れて行ってやる — I'll take you with me.
    "obito_voice_013_t00m52_4s.mp3",   // 013 悔やむことのない世界に連れて行ってやる 今の俺は — I'll take you to a world where you'll never 
    "obito_voice_019_t01m07_3s.mp3",   // 019 無限に続く夢の入り口にな — Go to the entrance of the dream that continu
    "obito_voice_023_t01m14_3s.mp3",   // 023 夢の世界へ導いてやる — I will guide you to the world of dreams.
    "obito_voice_031_t01m34_6s.mp3",   // 031 音瓶に送ってやろうと思っていたのだがな 俺はもう人で — I was thinking of sending it to a guest But 
    "obito_voice_016_t01m01_8s.mp3",   // 016 無駄な抵抗 — Useless resistance.
  ],
  // ── SPECIAL CAST — shuriken / rod / giant-shuriken throws (abilities.js) ──
  special: [
    "obito_voice_003_t00m08_0s.mp3",   // 003 絶望を味わえ! はじめようか 消えろ! ぬぼこの剣! — Taste despair! Let's begin! Disappear! Nobok
    "obito_voice_087_t04m56_3s.mp3",   // 087 あきらめろ! — Give up!
    "obito_voice_097_t05m24_1s.mp3",   // 097 俺の邪魔をするなー! — Don't get in my way!
    "obito_voice_084_t04m47_4s.mp3",   // 084 フルエロー — Shut up!
    "obito_voice_144_t07m24_6s.mp3",   // 144 思いの強さが剣にあどる — The strength of my mind goes to the sword.
    "obito_voice_191_t09m15_9s.mp3",   // 191 前!前! — In front! In front!
  ],
  // ── ★ JUUBI / TEN-TAILS ULTIMATE — Bijūdama (executeObitoUltimate — abilities.js) ──
  juubi: [
    "obito_voice_131_t06m47_7s.mp3",   // 131 いいだろう ここからは ジュウリンの時間だ — That's good. This is the time of the forest.
    "obito_voice_129_t06m42_6s.mp3",   // 129 陸道の力を手に入れた俺に — I've got the power of a rickshaw!
    "obito_voice_083_t04m43_8s.mp3",   // 083 知れ!これが陸道の力だ! — Die! This is the power of Rikudo!
    "obito_voice_082_t04m40_1s.mp3",   // 082 この力の前では、お前たちの抵抗など — In front of this power, your resistance and 
    "obito_voice_068_t04m01_6s.mp3",   // 068 ウオォォォォォォォォォアォォォォ! この世界に — WAAAAAAA In this world
    "obito_voice_008_t00m32_1s.mp3",   // 008 無限つくよみの世界にな この世界に希望はない — In the endless world of reading, there is no
    "obito_voice_038_t01m59_8s.mp3",   // 038 終わらせる! 己の無力さを呪うがいい — I'll finish you! I'll ride on your helplessn
  ],
  // ── INTRO / self-declaration (fires on the intro beat; combined with taunt in game.js) ──
  intro: [
    "obito_voice_164_t08m16_3s.mp3",   // 164 俺はウチハオビトを捨てた — I threw away Uchiha Obito!
    "obito_voice_048_t03m00_4s.mp3",   // 048 第2の陸道戦人だ! あんたは誰も救えない 俺は俺の手 — It's the second You can't save anyone I'll d
    "obito_voice_049_t03m06_3s.mp3",   // 049 世界を救う! 俺はそちら側に行くことはない — Save the world! I will never go that way.
    "obito_voice_109_t05m51_4s.mp3",   // 109 俺は第2の陸道戦人だ — I'm the second one to leave.
    "obito_voice_033_t01m43_9s.mp3",   // 033 俺はもう人ではない — I'm not human anymore.
    "obito_voice_024_t01m16_6s.mp3",   // 024 はじめようか — Let's get started!
    "obito_voice_026_t01m21_3s.mp3",   // 026 俺はこの世界に絶望するお前を見てみたい — I want to see you despair in this world
    "obito_voice_112_t05m58_2s.mp3",   // 112 選ばれたもの! — The chosen one!
  ],
  // ── TAUNT (mid-fight jeers; folded into the intro pool) ──
  taunt: [
    "obito_voice_017_t01m03_7s.mp3",   // 017 ご苦労だったな — Thank you for your hard work.
    "obito_voice_071_t04m13_9s.mp3",   // 071 なぜここまで抵抗する? — Why do you resist so far?
    "obito_voice_079_t04m32_1s.mp3",   // 079 まだ立てつくか — Are you going to stand still?
    "obito_voice_169_t08m25_3s.mp3",   // 169 まだ抵抗するか — Are you still going to resist?
    "obito_voice_172_t08m29_1s.mp3",   // 172 もう諦めたわけじゃないだろうな — I don't think I've given up.
    "obito_voice_121_t06m21_9s.mp3",   // 121 遅すぎやしないか — Don't be too late.
    "obito_voice_128_t06m40_3s.mp3",   // 128 お前はなぜ現実を見ない — Why don't you see the reality?
    "obito_voice_142_t07m21_1s.mp3",   // 142 なぜ戦う? — Why do you fight?
    "obito_voice_025_t01m18_6s.mp3",   // 025 最も結果は分かりきっているがな — I wonder if the result is the most clear.
  ],
  // ── COMBAT BARK (offense on a heavy / long-string connect — combat.js) ──
  combatBark: [
    "obito_voice_096_t05m20_0s.mp3",   // 096 消えろー! — SHIT!
    "obito_voice_086_t04m54_3s.mp3",   // 086 この世はもう終わりだ! — This world is over!
    "obito_voice_085_t04m48_7s.mp3",   // 085 そして怯えるがいい! しつくいやつだ! お前らでは俺 — And don't be afraid! You're a tough guy! You
    "obito_voice_146_t07m29_0s.mp3",   // 146 もうお前らは俺に勝てん! — You won't win against me anymore!
    "obito_voice_152_t07m37_0s.mp3",   // 152 俺が!この俺が! — It's me! It's me!
    "obito_voice_094_t05m14_7s.mp3",   // 094 もう眠り!俺の邪魔をするな! — I can't sleep anymore! Don't get in my way!
    "obito_voice_104_t05m37_7s.mp3",   // 104 うらちゃらた!この俺の力を… — Uracharata, this power of mine...
  ],
  // ── HIT REACTION (taking damage — combat.js) ──
  hitReact: [
    "obito_voice_090_t05m01_5s.mp3",   // 090 心がざわつく! — My heart is throbbing.
    "obito_voice_091_t05m04_6s.mp3",   // 091 何なのだ!? — What the hell is this?
    "obito_voice_106_t05m45_1s.mp3",   // 106 そんなことあってたまるか! なんなんだ — Is that what you're talking about? What is i
    "obito_voice_147_t07m31_4s.mp3",   // 147 ブゥーッ — Eugh!
    "obito_voice_148_t07m32_2s.mp3",   // 148 なぜ? — Why?
    "obito_voice_088_t04m57_3s.mp3",   // 088 なんだ、やつを — What the hell is this guy?
    "obito_voice_171_t08m27_8s.mp3",   // 171 まさか — I can't believe it!
    "obito_voice_170_t08m27_0s.mp3",   // 170 どうした? — What's wrong?
    "obito_voice_056_t03m29_4s.mp3",   // 056 こいつは — What is this guy?
  ],
  // ── LOW HEALTH (once, crossing the ≤25% line — combat.js) ──
  lowHealth: [
    "obito_voice_055_t03m25_4s.mp3",   // 055 もう終わっている まだ負けては終わらん なんなんだ — It's already over! I still can't lose! What 
    "obito_voice_057_t03m31_1s.mp3",   // 057 なぜ倒れない! — Why can't I get down?
    "obito_voice_076_t04m24_1s.mp3",   // 076 もう終わっている! もうじきつぼみが開く — It's already over! The Moujiki Tsubomi will 
    "obito_voice_093_t05m09_8s.mp3",   // 093 この俺は止められん! 幼稚な忍びが… — I won't be able to stop this! Youchina shino
  ],
  // ── WIN LINE (victory — game.js) ──
  win: [
    "obito_voice_015_t00m59_4s.mp3",   // 015 これで終戦だ — This is the end of the game.
    "obito_voice_077_t04m27_5s.mp3",   // 077 その時点で世界は終わりだ! — That's the end of the world!
    "obito_voice_012_t00m45_7s.mp3",   // 012 お前が何を期待したかは知らないが これが現実だ その — I don't know what you expected, but this is 
    "obito_voice_156_t07m50_3s.mp3",   // 156 それ以上だ 平和を実現できるのだからな — That's all. Because you can realize peace.
    "obito_voice_044_t02m41_7s.mp3",   // 044 終わらせる!これで平和を実現できるこの現実には — I will finish you! Now I can realize peace! 
    "obito_voice_043_t02m36_9s.mp3",   // 043 お前ももう苦しまなくていい この世界は — You don't have to suffer anymore. This world
  ],
}

export function pickObitoVoice(pool) {
  const arr = OBITO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
