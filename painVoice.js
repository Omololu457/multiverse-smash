// painVoice.js
// ---------------------------------------------------------------------------
// Pain / Nagato's Deva Path voice-line pools (audio-only; NO gameplay effect). Curated from the
// 210-clip JAPANESE set (pain_voice_*, Storm Connections rip) transcribed in PAIN_VOICE_LOG.md
// (native-JA pass + English gloss). Named-character lines (Jiraiya/Kyuubi), non-speech, and
// near-duplicates were discarded. pickPainVoice(pool) returns ONE clip at random (same shape as
// pickMadaraVoice/pickMiwaVoice); callers play via sound.playSfxFile(clip, null).
//
// TECHNIQUE callouts matched individually (native JA): almightyPush 神羅天征 (吹き飛ばす/消し飛べ) ·
// almightyPull 万象天引 (バンショーティーン! / とらえたぞ来い) · superPush 消し飛ばす終わりだ ·
// chibaku 地爆天星 (シバク/血膜/死んだ転生 — whisper variants). ASSIST names (Itachi/Konan/Sasori/
// Sasuke/Tobi): NONE exist in this set → a shared "call the Akatsuki / outnumber" assistCall pool.
// ---------------------------------------------------------------------------

export const PAIN_VOICE = {
  // ── Almighty Push / Shinra Tensei (neutral Special) ──
  almightyPush: [
    "pain_voice_130_t05m46_2s.mp3",   // 130 吹き飛ばしてやる いい気になるな 2対同時ならどうだ — I'll blow you up. Don't get too excited.
    "pain_voice_209_t08m39_1s.mp3",   // 209 ここより世界にいたみを 神奈天聖! — The pain in the world is more painful th
    "pain_voice_084_t04m17_2s.mp3",   // 084 消し飛べ! — Get out of the way!
    "pain_voice_129_t05m43_7s.mp3",   // 129 避けられはしない 消し飛べ — I won't let you get away from me. Get ou
    "pain_voice_071_t03m57_0s.mp3",   // 071 潰れろ! — Break it down!
    "pain_voice_140_t06m10_7s.mp3",   // 140 振り落とせ! — Turn off the lights!
  ],
  // ── Almighty Pull / Bansho Ten'in (Back Special) ──
  almightyPull: [
    "pain_voice_075_t04m02_6s.mp3",   // 075 バンショーティーン! — Ban Shoting!
    "pain_voice_113_t05m18_8s.mp3",   // 113 とらえたぞ来い — I caught it. Come on!
    "pain_voice_076_t04m04_8s.mp3",   // 076 こっちだ! — This way!
    "pain_voice_073_t03m59_7s.mp3",   // 073 逃がさん! — I won't let you escape!
  ],
  // ── Super Almighty Push / Hard Shinra Tensei (Down Special) ──
  superPush: [
    "pain_voice_082_t04m11_9s.mp3",   // 082 タフなやつだ 消えろ! 消し飛ばす! 終わりだ! — It's a tough one. Disappear! The quest b
    "pain_voice_061_t03m40_1s.mp3",   // 061 なんという威力だ — What kind of power is that?
    "pain_voice_064_t03m44_2s.mp3",   // 064 もされて、衝撃派だけで — It's just an assault!
  ],
  // ── Dedera Double Attack (Fwd Special) ──
  dedera: [
    "pain_voice_126_t05m39_9s.mp3",   // 126 あれを使うか — Should I use that?
    "pain_voice_128_t05m42_9s.mp3",   // 128 行け! — Go!
    "pain_voice_124_t05m36_7s.mp3",   // 124 これはどうだ? — What do you think about this?
    "pain_voice_074_t04m01_0s.mp3",   // 074 これならどうだ? — How about this?
  ],
  // ── Chibaku Tensei (Ultimate) ──
  chibaku: [
    "pain_voice_078_t04m06_9s.mp3",   // 078 シバク転生! — Shibaku Tensei!
    "pain_voice_070_t03m53_2s.mp3",   // 070 これほどとは 死んだ転生! これはどうだ? — What do you think of this? A dead genius
    "pain_voice_102_t04m49_8s.mp3",   // 102 ならば! 血膜転生! ここまでとはな キャーッ! 給備の力! — Then... Shibaku Tensei! This is the end.
    "pain_voice_199_t08m08_0s.mp3",   // 199 今こそサバキの時だ まさか — Now is the time of fate. No way...
  ],
  // ── Six Paths Summon — SHARED (no per-name callouts exist in the set) ──
  assistCall: [
    "pain_voice_011_t00m51_8s.mp3",   // 011 我らあかつきが — We, Akatsuki, are...
    "pain_voice_013_t01m01_6s.mp3",   // 013 我らが前ではどのような策も通じない — In front of us, there is no such strateg
    "pain_voice_153_t06m29_1s.mp3",   // 153 3対1だ — 3 vs 1
    "pain_voice_077_t04m05_8s.mp3",   // 077 後ろだ! — It's behind you!
  ],
  // ── intro + taunt (self-declaration, 'Know pain') ──
  intro: [
    "pain_voice_004_t00m31_3s.mp3",   // 004 痛みを知れ、俺の道は — Know the pain, my path
    "pain_voice_010_t00m50_1s.mp3",   // 010 痛みを知るのだ — I know the pain.
    "pain_voice_007_t00m42_4s.mp3",   // 007 今、見せよう。ここより、世界に痛みを。 人々が… — Now show me the pain in the world more t
    "pain_voice_040_t02m25_0s.mp3",   // 040 真の平和のためには — For the sake of true peace.
    "pain_voice_041_t02m27_6s.mp3",   // 041 世界に痛みを知ってもらうことが必要なのだ — It is necessary to know the pain in the 
    "pain_voice_022_t01m30_3s.mp3",   // 022 少子! 世界には痛みが必要だ — Defeat! We need pain in the world.
    "pain_voice_112_t05m15_9s.mp3",   // 112 痛みは世界を成長させる — Pain will grow the world.
    "pain_voice_001_t00m12_9s.mp3",   // 001 少しは痛みが理解できたか?やるな — Did you understand the pain a little? Do
    "pain_voice_044_t02m36_5s.mp3",   // 044 それが世界のためだ — That is for the sake of the world.
    "pain_voice_057_t03m29_3s.mp3",   // 057 平和の本当の意味が理解できてないだけだ おとなしくつかまれ — I just can't understand the true meaning
    "pain_voice_039_t02m22_0s.mp3",   // 039 その先にある真の平和のために進む — I will continue to live for the peace of
  ],
  // ── taunt (contempt) ──
  taunt: [
    "pain_voice_115_t05m21_9s.mp3",   // 115 無力だと知れ — Tell me that you are powerless.
    "pain_voice_116_t05m23_5s.mp3",   // 116 逃げても無駄だ — Even if you run away, it's useless.
    "pain_voice_121_t05m31_0s.mp3",   // 121 弱い — I'm weak.
    "pain_voice_020_t01m22_7s.mp3",   // 020 少しはおとなしくなるか — Will you be quiet for a while?
    "pain_voice_183_t07m32_2s.mp3",   // 183 愚かな — Idiot.
    "pain_voice_184_t07m33_5s.mp3",   // 184 ブーザーマーだな — You're a fool.
    "pain_voice_142_t06m13_1s.mp3",   // 142 馬鹿なやつだ — Idiot.
    "pain_voice_101_t04m46_4s.mp3",   // 101 少々甘く見ていた — I was looking at it a little bit.
    "pain_voice_178_t07m22_4s.mp3",   // 178 なんだそれは、その程度とは — What is that? How much is that?
  ],
  // ── offense-connect bark (heavy/long-string) ──
  combatBark: [
    "pain_voice_117_t05m25_0s.mp3",   // 117 受けてみろ! — Take this!
    "pain_voice_072_t03m58_1s.mp3",   // 072 そこだ!当たり! — There it is! Hit it!
    "pain_voice_118_t05m26_1s.mp3",   // 118 肌辺はすまん、どうだ — I'm sorry, how is your skin?
    "pain_voice_163_t06m45_4s.mp3",   // 163 それで倒したつもりか — Is that how you defeated him?
    "pain_voice_164_t06m47_6s.mp3",   // 164 甘く見るなよ これで終わりではない — Don't look at me like that. This isn't t
  ],
  // ── hit-reaction (taking a hit) ──
  hitReact: [
    "pain_voice_063_t03m42_6s.mp3",   // 063 なんだと! — What?!
    "pain_voice_066_t03m49_0s.mp3",   // 066 くっ! — Gah!
    "pain_voice_133_t05m58_5s.mp3",   // 133 なんだと? — What is it?
    "pain_voice_097_t04m39_9s.mp3",   // 097 何なのだ? — What the hell is this?
    "pain_voice_105_t05m02_4s.mp3",   // 105 こいつ — This guy
    "pain_voice_093_t04m32_1s.mp3",   // 093 なんだとしちゃった — What the hell was that?
    "pain_voice_190_t07m45_0s.mp3",   // 190 チッ! — Tch!
    "pain_voice_080_t04m09_3s.mp3",   // 080 そうはいかん — I don't like that.
  ],
  // ── low-health (once, crossing the line) ──
  lowHealth: [
    "pain_voice_111_t05m14_0s.mp3",   // 111 俺は負けられんのだ — I can't lose!
    "pain_voice_131_t05m52_5s.mp3",   // 131 使い物にならないか くそ — I can't use it. Damn it.
    "pain_voice_086_t04m19_4s.mp3",   // 086 使いすぎたか — You used too much.
    "pain_voice_194_t07m51_0s.mp3",   // 194 使いすぎたか 今更あんな術 もはやお前に — You used it too much. That kind of techn
    "pain_voice_109_t05m09_6s.mp3",   // 109 生することができるというのか? この俺が! — Can you control it? I'll do it!
    "pain_voice_127_t05m41_6s.mp3",   // 127 しくじったか — Are you out of your mind?
  ],
  // ── victory ──
  win: [
    "pain_voice_018_t01m18_2s.mp3",   // 018 さようならだ — Goodbye.
    "pain_voice_100_t04m44_0s.mp3",   // 100 そろそろしまいにしようか — Let's get it over with.
    "pain_voice_169_t07m00_8s.mp3",   // 169 すぐにあの世に送ってやる — I'll send it to you as soon as possible.
    "pain_voice_189_t07m42_9s.mp3",   // 189 そろそろ終わらせる — It's about to end.
    "pain_voice_173_t07m09_6s.mp3",   // 173 立てなくなったようだな — It looks like I can't stand it anymore.
    "pain_voice_187_t07m40_3s.mp3",   // 187 褒めてやろう — I'll praise you.
    "pain_voice_172_t07m07_0s.mp3",   // 172 そろそろくたばったらどうだ — What if it's too late?
    "pain_voice_165_t06m51_0s.mp3",   // 165 これで諦めもついたか — Did you give up now?
  ],
}

export function pickPainVoice(pool) {
  const arr = PAIN_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
