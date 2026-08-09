// madaraVoice.js
// ---------------------------------------------------------------------------
// Madara Uchiha voice-line pools (audio-only; NO gameplay effect). Curated from the
// 165-clip JAPANESE set (madara_voice_*) transcribed in MADARA_VOICE_LOG.md (native-JA
// pass + English gloss). Named-character lines (Hashirama/Obito/Kyuubi/Fourth Hokage),
// non-speech, and near-duplicates were discarded. pickMadaraVoice(pool) returns ONE clip
// at random (same shape as pickMiwaVoice/pickVegetaVoice); callers play via
// sound.playSfxFile(clip, null). Single-voice-channel handled by sound._voiceOwner.
//
// Per-technique cast pools are matched individually (the kit is technique-name-heavy):
//   fireball 火遁 · gunbaiSummon 口寄せ · woodDragon 木流の術 · susanooPunch/Armor 須佐能乎 ·
//   tengaiShinsei (meteor) · completeSusanoo 無限月読 Mugen Tsukuyomi. See MADARA_VOICE_LOG.md.
// ---------------------------------------------------------------------------

export const MADARA_VOICE = {
  // ── Katon: Great Fireball (neutral Special) — 火遁 callouts ──
  fireball: [
    "madara_voice_083_t08m24_5s.mp3",   // 083 カトゥン! — Katoom!
    "madara_voice_084_t08m25_8s.mp3",   // 084 効果先鋒! — Goukatsu Senpuu!
    "madara_voice_085_t08m27_3s.mp3",   // 085 燃えるがいい、せっかくの妖嬌だ — It's a good thing you're on fire, it's a good thing you're o
  ],
  // ── Gunbai Summon (Up Special) — summon/kuchiyose callouts ──
  gunbaiSummon: [
    "madara_voice_001_t00m11_2s.mp3",   // 001 この砂の破壊そのもの 砕け散れ! 口寄せ — I will destroy you, you scoundrel! Kuchiyose! Get out of my 
    "madara_voice_076_t08m08_6s.mp3",   // 076 契約封印 — Negotiate.
  ],
  // ── Gunbai Fan-Swing (Fwd Special) ──
  gunbaiSwing: [
    "madara_voice_065_t07m12_1s.mp3",   // 065 真に必要なものは力のみ! さっ — What you really need is power! Tha-
    "madara_voice_109_t09m56_5s.mp3",   // 109 これ以上は、やらせんぞ! — I won't let you do this!
    "madara_voice_092_t08m47_1s.mp3",   // 092 やる! — Do it!
  ],
  // ── Mokuton: Wood Spike (Down Special) ──
  woodSpike: [
    "madara_voice_088_t08m36_9s.mp3",   // 088 出なければすまらぬ — If you don't come out, I won't forgive you!
    "madara_voice_059_t06m47_8s.mp3",   // 059 死に至るまで — Until I die...
  ],
  // ── Mokuton: Wood Dragon (Back Special) — 木流の術 Mokuryu ──
  woodDragon: [
    "madara_voice_000_t00m09_1s.mp3",   // 000 木流の術! — Mokuryu no Jutsu!
  ],
  // ── Susanoo Base Punch (Fwd+Heavy) — 須佐能乎 ──
  susanooPunch: [
    "madara_voice_108_t09m54_0s.mp3",   // 108 サノロ! — Sanoro!
    "madara_voice_051_t05m43_6s.mp3",   // 051 力の差は劣以前 — The power of the sword is history.
  ],
  // ── Susanoo Attack armor mode (Back+Heavy) ──
  susanooArmor: [
    "madara_voice_061_t06m53_4s.mp3",   // 061 最強のチャクラを持つこの俺が導く 目的は — I am the one who has the strongest chakra. My only goal is..
    "madara_voice_098_t09m15_2s.mp3",   // 098 だがそれでこそ俺の認めた男よ — But that's the man I recognized!
  ],
  // ── TAP Ultimate — Perfect Susanoo / Tengai Shinsei (meteor) ──
  tengaiShinsei: [
    "madara_voice_002_t00m17_8s.mp3",   // 002 雨にしては少し大きいか? — Is it a little big in the rain?
    "madara_voice_073_t07m59_2s.mp3",   // 073 消し飛ばしてやる いけ 終わりだ 臨房変 — I'll destroy you! Go! It's over! The forest is changing!
    "madara_voice_082_t08m22_3s.mp3",   // 082 お前にこれを止められるか — Will you be able to stop this?
  ],
  // ── HOLD Ultimate — Complete Susanoo (無限月読 Mugen Tsukuyomi) ──
  completeSusanoo: [
    "madara_voice_062_t07m00_2s.mp3",   // 062 無言尽くよみの上銃のみ — The beauty of the beast of the endless moonlit night.
    "madara_voice_113_t10m23_8s.mp3",   // 113 真の意味で人々が幸せになるのだ 俺の無限 — People will be happy in the true meaning. It depends on my i
    "madara_voice_134_t12m12_1s.mp3",   // 134 この世界の終わりだ待っていろ — It's the end of this world! Wait for it!
  ],
  // ── INTRO / self-declaration ──
  intro: [
    "madara_voice_046_t05m00_7s.mp3",   // 046 それがウチハマダラだ 見にくいな — That's what I'm talking about. It's hard to see.
    "madara_voice_010_t00m39_0s.mp3",   // 010 この俺には誰も届きはしない。この戦いは本 — No one can reach me. This battle is real.
    "madara_voice_087_t08m32_3s.mp3",   // 087 お前の力はこの程度ではないだろ 本気で来 — Your power is not at this level, right? Come seriously.
    "madara_voice_077_t08m09_7s.mp3",   // 077 やはり貴様との戦いは心を踊る — After all, the battle with you will dance the heart.
    "madara_voice_099_t09m18_7s.mp3",   // 099 望むところだよ! — It's where you want to go!
    "madara_voice_095_t09m05_9s.mp3",   // 095 貴様との戦いは、さあ — The battle against you is... Come on...
  ],
  // ── TAUNT (dance-for-me flavor) ──
  taunt: [
    "madara_voice_021_t01m32_4s.mp3",   // 021 踊れそうにないようだな — I don't seem to be able to dance.
    "madara_voice_022_t01m35_0s.mp3",   // 022 つまらぬ相手だ — You're a boring opponent.
    "madara_voice_058_t06m43_2s.mp3",   // 058 俺を楽しませる 踊ってもらおうか — You want me to enjoy myself? You want me to dance?
    "madara_voice_066_t07m15_9s.mp3",   // 066 踊ってみせろ ここでブザマに果てるがいい — Dance and show me. I'll beat you up here.
    "madara_voice_079_t08m15_2s.mp3",   // 079 もっと俺を楽しませろ! — Let me have more fun!
    "madara_voice_069_t07m23_1s.mp3",   // 069 じゃり相手に本気でやってもな — I don't care if I do it seriously.
    "madara_voice_029_t02m06_0s.mp3",   // 029 www — Hahahaha
    "madara_voice_104_t09m35_2s.mp3",   // 104 ふっふっふっ — Heh heh heh.
  ],
  // ── COMBAT BARK (heavy/long-string connect) ──
  combatBark: [
    "madara_voice_009_t00m34_9s.mp3",   // 009 お前はここで終わりだ — You're done here.
    "madara_voice_020_t01m21_3s.mp3",   // 020 お前の負けだ…この戦いも… — I lost to you. This battle, too.
    "madara_voice_026_t01m43_1s.mp3",   // 026 だからお前は負けたのだ 貴様の力では何も — That's why you lost. Nothing will change with your power.
    "madara_voice_036_t02m32_6s.mp3",   // 036 すべて終わったのだ 寝ていろ — It's all over. Go to sleep.
    "madara_voice_072_t07m46_7s.mp3",   // 072 あるのはただ絶望だけだ お前では俺を倒せ — There is only despair. You will not defeat me.
    "madara_voice_089_t08m38_7s.mp3",   // 089 お前は届きはしないのさ — You won't be able to reach me.
    "madara_voice_032_t02m18_1s.mp3",   // 032 それがお前の限界 — That is your limit.
    "madara_voice_157_t13m33_8s.mp3",   // 157 絶望しかないこの世界に存在する価値はない — There is no point in existing in this world where there is o
    "madara_voice_018_t01m09_8s.mp3",   // 018 誰も届かぬ — No one can reach it.
  ],
  // ── HIT-REACTION (taking a hit) ──
  hitReact: [
    "madara_voice_003_t00m21_4s.mp3",   // 003 ん? — Huh?
    "madara_voice_004_t00m22_5s.mp3",   // 004 なかなかやるな — That's pretty good.
    "madara_voice_007_t00m30_2s.mp3",   // 007 なかなかの相手だ — He's quite an opponent.
    "madara_voice_028_t02m02_1s.mp3",   // 028 確実にな 俺を追い詰めると — I'm sure you'll catch up with me.
    "madara_voice_102_t09m27_7s.mp3",   // 102 俺の給備をここまで追い詰めるとは だが — It's hard to catch up to this point in my life, but...
    "madara_voice_005_t00m24_9s.mp3",   // 005 だが — But...
    "madara_voice_025_t01m40_9s.mp3",   // 025 踏み込みがなってない — I don't have a clue.
  ],
  // ── LOW-HEALTH (once, crossing the line) ──
  lowHealth: [
    "madara_voice_094_t09m02_9s.mp3",   // 094 これだからやめられんのだ — This is why I can't give up.
    "madara_voice_103_t09m32_4s.mp3",   // 103 この予協はまだ終わらせん — This is not the end of this world yet!
    "madara_voice_105_t09m36_1s.mp3",   // 105 やはりお前との戦いはでっかく — After all, the battle with you is huge.
    "madara_voice_106_t09m39_5s.mp3",   // 106 俺とここまで大統に戦える者はお前だけ — You're the only one who can fight against me.
    "madara_voice_107_t09m50_4s.mp3",   // 107 本当の夢ってやつがなぁ — It's like a real dream!
  ],
  // ── WIN (victory) ──
  win: [
    "madara_voice_008_t00m32_1s.mp3",   // 008 敗者に欠ける時期はない — There is no time to be a loser.
    "madara_voice_011_t00m46_6s.mp3",   // 011 それなりに楽しめたがな この世には何もな — I enjoyed it a lot, but there's nothing like it in this worl
    "madara_voice_013_t00m54_5s.mp3",   // 013 絶望だけだ。この世に希望などない — It's just despair. There's no hope in this world.
    "madara_voice_047_t05m05_3s.mp3",   // 047 もう踊ることもできんか 貴様の居場所はこ — You can't even dance anymore? You don't have a place to go.
    "madara_voice_081_t08m21_2s.mp3",   // 081 さようなら! — Farewell!
    "madara_voice_135_t12m34_3s.mp3",   // 135 よくやったなぁ — You did a good job.
    "madara_voice_037_t02m36_3s.mp3",   // 037 そしてそのまま夢の世界に行くがいい — And go to the world of dreams as it is.
  ],
}

export function pickMadaraVoice(pool) {
  const arr = MADARA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
