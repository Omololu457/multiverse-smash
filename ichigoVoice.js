// ichigoVoice.js
// ---------------------------------------------------------------------------
// Ichigo Kurosaki voice-line pools (audio-only; NO gameplay effect). Curated from the 167-clip
// JAPANESE set (ichigo_voice_*, Bleach: Rebirth of Souls) transcribed in ICHIGO_VOICE_LOG.md
// (native-JA pass + English gloss). Non-speech/SFX, garbled grunts, single-word fillers, and
// near-duplicates were discarded; no line names another specific character (none present).
// pickIchigoVoice(pool) returns ONE clip at random (same shape as pickMadaraVoice/pickMiwaVoice);
// callers play via sound.playSfxFile(clip, null). Single voice channel handled by sound._voiceOwner.
//
// Per-technique cast pools cross-referenced to Ichigo's BUILT kit (abilities.js), all Getsuga-family
// (no "Bankai" callout was isolated → nothing fabricated):
//   getsuga (neutral Getsuga Tenshō projectile) · chargedSlash (Fwd) · hollowGetsuga (Down dark super)
//   · hollowRising (Up dark super) · airGetsuga (aerial dive) · zangetsu (Fwd+Heavy rekka/command
//   normals) · ultimate (Getsuga Tenshō 2-part cinematic — ゲッツガーテンション!). See ICHIGO_VOICE_LOG.md.
// ---------------------------------------------------------------------------

export const ICHIGO_VOICE = {
  // ── Getsuga Tenshō — neutral Special projectile (short "Getsuga!" callouts) ──
  getsuga: [
    "ichigo_voice_003_t00m03_0s.mp3",   // 003 ギュッツガー! — Getsuga!
    "ichigo_voice_039_t01m05_6s.mp3",   // 039 月が転称 — Getsuga Tenshō
    "ichigo_voice_088_t02m15_1s.mp3",   // 088 ケッツガー — Getsuga
  ],
  // ── Charged Getsuga Slash — Fwd Special (committed advancing slash) ──
  chargedSlash: [
    "ichigo_voice_054_t01m25_1s.mp3",   // 054 逃すかよ!当たれ! — Won't let you escape! Hit!
    "ichigo_voice_114_t02m56_8s.mp3",   // 114 これでも食らえ! — Eat this too!
    "ichigo_voice_163_t04m22_1s.mp3",   // 163 暗いやがれ! — Eat this!
  ],
  // ── Hollow Getsuga — Down Special (dark-form super; "this is my power now") ──
  hollowGetsuga: [
    "ichigo_voice_073_t01m50_7s.mp3",   // 073 今の俺の力だ — This is my power now.
    "ichigo_voice_084_t02m09_3s.mp3",   // 084 この力で! — With this power!
    "ichigo_voice_100_t02m35_3s.mp3",   // 100 俺自身の力 — My own power.
  ],
  // ── Hollow Rising — Up Special (dark-form super; all-out escalation) ──
  hollowRising: [
    "ichigo_voice_031_t00m53_6s.mp3",   // 031 今の俺の全力だ! — This is my full power!
    "ichigo_voice_063_t01m36_6s.mp3",   // 063 俺自身の力で — With my own power.
    "ichigo_voice_077_t01m57_9s.mp3",   // 077 今の俺なら! — If it's me now!
  ],
  // ── Aerial Getsuga Dive — airborne Special ──
  airGetsuga: [
    "ichigo_voice_032_t00m55_6s.mp3",   // 032 これでぶっ飛べ! — Now, blow away!
    "ichigo_voice_148_t03m52_6s.mp3",   // 148 吹き飛べ! — Blow away!
    "ichigo_voice_156_t04m10_1s.mp3",   // 156 もらった! — Got you!
  ],
  // ── "Zangetsu" — Fwd+Heavy rekka / command normals (sword-string barks) ──
  zangetsu: [
    "ichigo_voice_087_t02m13_5s.mp3",   // 087 そこだ! — There!
    "ichigo_voice_105_t02m43_0s.mp3",   // 105 これでどうだ! — How about this?!
    "ichigo_voice_116_t02m59_4s.mp3",   // 116 これでどうだ!手は抜かねえぞ! — How about this? I won't hold back!
    "ichigo_voice_158_t04m13_8s.mp3",   // 158 終わらせる! — I'll finish you!
  ],
  // ── Ultimate — Getsuga Tenshō 2-part cinematic (the marquee full callout) ──
  ultimate: [
    "ichigo_voice_046_t01m14_6s.mp3",   // 046 ゲッツガーテンション! — Getsuga Tenshō!
    "ichigo_voice_096_t02m27_4s.mp3",   // 096 こいつで決める!吹き飛べ!切り崩す! — I'll end it with this! Blow away!
    "ichigo_voice_159_t04m14_8s.mp3",   // 159 月が天使! — Getsuga Tenshō!
    "ichigo_voice_166_t04m26_1s.mp3",   // 166 この一撃に込める! — I'll put everything into this one strike!
  ],
  // ── INTRO / self-declaration (pre-fight) ──
  intro: [
    "ichigo_voice_000_t00m00_0s.mp3",   // 000 さあ — Here we go.
    "ichigo_voice_001_t00m01_3s.mp3",   // 001 始めっか — Let's get started.
    "ichigo_voice_021_t00m36_8s.mp3",   // 021 本気で来ねえと怪我すんぜ — Come at me for real or you'll get hurt.
    "ichigo_voice_038_t01m04_3s.mp3",   // 038 かかってこいや — Come and get me.
    "ichigo_voice_064_t01m38_9s.mp3",   // 064 みんなを守るんだよ — I'll protect everyone.
    "ichigo_voice_067_t01m43_4s.mp3",   // 067 あんたを止めに来た — I've come to stop you.
    "ichigo_voice_090_t02m18_2s.mp3",   // 090 準備できたか — Are you ready?
    "ichigo_voice_127_t03m19_5s.mp3",   // 127 こっからは全力だ! — From here on, I'm going all-out!
  ],
  // ── TAUNT (mocking; folded into the intro beat) ──
  taunt: [
    "ichigo_voice_034_t00m58_5s.mp3",   // 034 意外と大したことねえな — Not a big deal, huh.
    "ichigo_voice_044_t01m12_2s.mp3",   // 044 足りないのか — Is that all you've got?
    "ichigo_voice_093_t02m23_3s.mp3",   // 093 もう終わりかよ — Over already?
    "ichigo_voice_101_t02m37_4s.mp3",   // 101 どうする — What'll you do?
    "ichigo_voice_112_t02m54_6s.mp3",   // 112 こんなもんかよ — Is this all?
    "ichigo_voice_161_t04m19_5s.mp3",   // 161 いつまで待たせんだよ — How long will you keep me waiting?
  ],
  // ── COMBAT BARK (heavy / long-string connect) ──
  combatBark: [
    "ichigo_voice_007_t00m09_8s.mp3",   // 007 終わりじゃないぜ! — It's not over!
    "ichigo_voice_013_t00m24_5s.mp3",   // 013 遅いぜ、あんた — Too slow!
    "ichigo_voice_035_t01m00_5s.mp3",   // 035 これで終わりだ! — This is the end!
    "ichigo_voice_086_t02m11_9s.mp3",   // 086 速攻で終わらせるぜ — I'll finish this fast!
    "ichigo_voice_106_t02m44_6s.mp3",   // 106 まだまだ行くぜ! — I'm just getting started!
    "ichigo_voice_122_t03m12_2s.mp3",   // 122 行くぜ! — Here I go!
    "ichigo_voice_138_t03m37_7s.mp3",   // 138 行くぜ、もう一度 — Here I go, once more!
    "ichigo_voice_145_t03m49_2s.mp3",   // 145 終わらせてやる — I'll end this!
  ],
  // ── HIT-REACTION (taking a hit) ──
  hitReact: [
    "ichigo_voice_033_t00m57_2s.mp3",   // 033 なんだよ — What?!
    "ichigo_voice_037_t01m02_8s.mp3",   // 037 まじか — Seriously?
    "ichigo_voice_057_t01m28_7s.mp3",   // 057 危なかったぜ — That was close!
    "ichigo_voice_069_t01m45_6s.mp3",   // 069 マジかよ — Are you serious?
    "ichigo_voice_111_t02m53_5s.mp3",   // 111 なんだ — What?
    "ichigo_voice_135_t03m32_3s.mp3",   // 135 危ないな — That's dangerous.
    "ichigo_voice_142_t03m44_3s.mp3",   // 142 くっそ! — Damn!
  ],
  // ── LOW-HEALTH (once, crossing the line) ──
  lowHealth: [
    "ichigo_voice_061_t01m33_5s.mp3",   // 061 こっからが本番だ — The real fight starts now.
    "ichigo_voice_107_t02m45_9s.mp3",   // 107 止まるわけにはいかねんだ — I can't afford to stop!
    "ichigo_voice_134_t03m30_2s.mp3",   // 134 終わりじゃねえぞ! — It's not over yet!
    "ichigo_voice_154_t04m06_6s.mp3",   // 154 何度だって乗り越えてやるさ — I'll overcome it, however many times!
  ],
  // ── WIN (victory) ──
  win: [
    "ichigo_voice_028_t00m50_0s.mp3",   // 028 終わりにしようぜ — Let's end this.
    "ichigo_voice_041_t01m08_3s.mp3",   // 041 強かったみたいだな — Guess I was the stronger one.
    "ichigo_voice_118_t03m04_5s.mp3",   // 118 次は決めるぜ! — I'll settle it next time!
    "ichigo_voice_152_t04m00_1s.mp3",   // 152 楽しかったぜ — That was fun.
    "ichigo_voice_155_t04m08_7s.mp3",   // 155 俺の勝ちな — It's my win.
    "ichigo_voice_157_t04m10_8s.mp3",   // 157 もう終わりか! — Over already?
  ],
}

export function pickIchigoVoice(pool) {
  const arr = ICHIGO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
