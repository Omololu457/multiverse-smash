# Hisoka Morrow — Voice Content Log (136 clips)

Source: `hisokanen_*.mp3` ("Nen Impact", **Japanese**). Filenames encode only the original
timestamp, not content. Cut clips were transcribed with faster-whisper (multilingual `small`,
VAD; JA pass + EN-translate pass — `tools/transcribe_hisoka.py`) and **hand-reviewed** — the
model handles Japanese well (lang-prob 1.00 throughout) but mangles stylised short lines and
pure grunts, so the JA/EN below are hand-corrected where verifiable. This is the authoritative
content reference going forward. Filenames keep their timestamp (Reverse-Flash precedent).

**Totals:** 136 clips → **71 wired** into 10 pools; **65 discarded**.
Discards: noise(grunt/non-lexical) 28, garble/fragment 22, low-value(filler) 6, named(Gon) 2, context(teamwork, not 1v1) 2, named(Illumi) 1, named(Gon/gong) 1, named(series title) 1, context(third-party) 1, no-speech(silence) 1.

Pool sizes: intro 7, taunt 21, cast:Bungee-Gum 5, cast:Texture-Surprise 7, cast:Overdrive-ult 2, rekka:Card-Flourish 3, hitConnect 13, hitReact 5, lowHealth 2, win 6.

Filtering per the brief: any line naming another HxH character (Gon 023/024/122, Illumi 005) or the
series title (133) is discarded; pure grunts/laughs, silence and garbled fragments are dropped;
genuinely usable full lines are kept. Note 015 references "the Exam" (an event, not a named
character) — kept as an intro, flagged here. Two clean signature clusters survived intact: five
"Bungee Gum" callouts (058–062) → the neutral special, and the magician card-patter (068–076/097/098)
→ Texture Surprise. No move referenced by a matched line is unbuilt — every pool maps to a shipped
Hisoka trigger (build is green: `npm run test:hisoka` 39/39).

| # | file | JA (transcription) | EN (gloss) | disposition |
|---|---|---|---|---|
| 000 | `hisokanen_000_t00m00_6s.mp3` | そんな目で見つめるなよ 興奮しちゃうじゃないか | Don't look at me like that — you'll get me excited~ | POOL:taunt |
| 001 | `hisokanen_001_t00m05_4s.mp3` | 僕が特別に判定してあげるよ | I'll give you a special grade~ | POOL:taunt |
| 002 | `hisokanen_002_t00m09_1s.mp3` | 獲物は強ければ強いほどいい | The stronger the prey, the better. | POOL:intro |
| 003 | `hisokanen_003_t00m13_1s.mp3` | 僕を失望させるなよ | Don't disappoint me. | POOL:taunt |
| 004 | `hisokanen_004_t00m15_6s.mp3` | ガン | gun. | discard:garble/fragment |
| 005 | `hisokanen_005_t00m17_1s.mp3` | イルミには悪いけど | It's bad for Irumi, but... | discard:named(Illumi) |
| 006 | `hisokanen_006_t00m18_7s.mp3` | 味見しちゃお? | Shall I have a little taste~? | POOL:taunt |
| 007 | `hisokanen_007_t00m21_6s.mp3` | 交渉しないか? | Care to make a deal? | POOL:taunt |
| 008 | `hisokanen_008_t00m22_9s.mp3` | イヨネライよ | This is January 2nd. | discard:garble/fragment |
| 009 | `hisokanen_009_t00m24_3s.mp3` | 殺すから | Because I'm going to kill you~ | POOL:hitConnect |
| 010 | `hisokanen_010_t00m27_1s.mp3` | 試験韓国に付き合ってくれるのか | Will you come with me to the test center? | discard:garble/fragment |
| 011 | `hisokanen_011_t00m31_5s.mp3` | たいにあなたは僕がやる | I'll take care of you. | discard:garble/fragment |
| 012 | `hisokanen_012_t00m34_6s.mp3` | わざと怪我したら直してくれるかい? | If you get hurt on purpose, will you let me heal you~? | POOL:taunt |
| 013 | `hisokanen_013_t00m38_4s.mp3` | 君からはいろいろと感じるものがあるね | I can sense all sorts of things from you~ | POOL:taunt |
| 014 | `hisokanen_014_t00m42_5s.mp3` | せっかくやるなら完璧に勝つ | If I'm going to do it, I'll win flawlessly. | POOL:taunt |
| 015 | `hisokanen_015_t00m46_3s.mp3` | 試験の時からあなたとは戦ってみたかったんだ | I've wanted to fight you ever since the Exam. | POOL:intro |
| 016 | `hisokanen_016_t00m51_1s.mp3` | んー | mmm | discard:noise(grunt/non-lexical) |
| 017 | `hisokanen_017_t00m52_5s.mp3` | キミラ | Kimira. | discard:garble/fragment |
| 018 | `hisokanen_018_t00m53_4s.mp3` | 全員不合格だね | Everyone… fails~ | POOL:win |
| 019 | `hisokanen_019_t00m56_5s.mp3` | 無駄な努力 | What a wasted effort~ | POOL:hitConnect |
| 020 | `hisokanen_020_t00m58_1s.mp3` | ご苦労様 | Well done~ (thanks for the effort) | POOL:taunt |
| 021 | `hisokanen_021_t01m00_5s.mp3` | 冥土の土産に覚えておきな | Keep this as a parting gift for the afterlife~ | POOL:hitConnect |
| 022 | `hisokanen_022_t01m03_1s.mp3` | 手品師に不可能はないのさ | Nothing is impossible for a magician~ | POOL:cast:Overdrive-ult |
| 023 | `hisokanen_023_t01m06_6s.mp3` | ゴン | Gong | discard:named(Gon) |
| 024 | `hisokanen_024_t01m07_4s.mp3` | ううう…ゴム… | Uggh, go on. | discard:named(Gon) |
| 025 | `hisokanen_025_t01m10_3s.mp3` | どうして僕をそんなに興奮させるんだい | Why do you excite me so~? | POOL:taunt |
| 026 | `hisokanen_026_t01m15_8s.mp3` | これ以上はやめておこう | Let's not take this any further~ | POOL:taunt |
| 027 | `hisokanen_027_t01m18_5s.mp3` | 本当に怒られちゃうからね | I'll really get scolded, you know~ | POOL:taunt |
| 028 | `hisokanen_028_t01m21_9s.mp3` | 彼は僕の獲物だ | He is my prey. | discard:context(third-party) |
| 029 | `hisokanen_029_t01m24_6s.mp3` | 君はおとなしくしててね | You just stay quiet, all right~? | POOL:taunt |
| 030 | `hisokanen_030_t01m27_8s.mp3` | たまには君みたいのもいいよね | Every now and then, someone like you is nice too~ | POOL:taunt |
| 031 | `hisokanen_031_t01m30_5s.mp3` | ジャンキーで | Junkie | discard:garble/fragment |
| 032 | `hisokanen_032_t01m33_5s.mp3` | やっぱりあなたは最高の獲物だ | As I thought — you're the finest prey~ | POOL:hitConnect |
| 033 | `hisokanen_033_t01m38_4s.mp3` | ところで | By the way... | discard:low-value(filler) |
| 034 | `hisokanen_034_t01m39_3s.mp3` | この後食事なんて | How about dinner after this~? | POOL:win |
| 035 | `hisokanen_035_t01m42_6s.mp3` | つれない | How cold of you~ | POOL:taunt |
| 036 | `hisokanen_036_t01m43_4s.mp3` | ん? | Hmm. | discard:noise(grunt/non-lexical) |
| 037 | `hisokanen_037_t01m44_9s.mp3` | 嘘は良くないな | Lying isn't nice~ | POOL:taunt |
| 038 | `hisokanen_038_t01m47_2s.mp3` | 僕の言えたことじゃないけど | Not that I'm one to talk~ | POOL:taunt |
| 039 | `hisokanen_039_t01m50_6s.mp3` | んー | mmm | discard:noise(grunt/non-lexical) |
| 040 | `hisokanen_040_t01m51_6s.mp3` | ダメダメ | No, no~ | POOL:hitReact |
| 041 | `hisokanen_041_t01m53_6s.mp3` | ボールはしっ | The ball is shi- | discard:garble/fragment |
| 042 | `hisokanen_042_t01m54_8s.mp3` | こりつかまなきゃね | I have to catch this one, right? | discard:garble/fragment |
| 043 | `hisokanen_043_t01m57_4s.mp3` | 好きだらけで毒系抜かれちゃ | If you just like it, you'll be taken away by the poison. | discard:garble/fragment |
| 044 | `hisokanen_044_t02m00_2s.mp3` | だよ | dial. | discard:garble/fragment |
| 045 | `hisokanen_045_t02m03_4s.mp3` | HOOD? | Good. | discard:noise(grunt/non-lexical) |
| 046 | `hisokanen_046_t02m07_5s.mp3` | それ? | That's it? | discard:noise(grunt/non-lexical) |
| 047 | `hisokanen_047_t02m12_0s.mp3` | 楽しもう | Let's enjoy ourselves~ | POOL:intro |
| 048 | `hisokanen_048_t02m13_5s.mp3` | 足元 | Watch your footing~ | POOL:hitConnect |
| 049 | `hisokanen_049_t02m15_2s.mp3` | ここだね | Right… here~ | POOL:hitConnect |
| 050 | `hisokanen_050_t02m18_1s.mp3` | ダメダメ | No, no~ | POOL:hitReact |
| 051 | `hisokanen_051_t02m19_9s.mp3` | たまらない | I can't stand it — this is irresistible~! | POOL:lowHealth |
| 052 | `hisokanen_052_t02m21_6s.mp3` | ソード! | Soad? | discard:garble/fragment |
| 053 | `hisokanen_053_t02m23_1s.mp3` | 怖そうか | Kowa-suka! | discard:garble/fragment |
| 054 | `hisokanen_054_t02m24_8s.mp3` | そそるねぇ | Now that's tantalizing~ | POOL:lowHealth |
| 055 | `hisokanen_055_t02m28_4s.mp3` | いい子だね | Good boy~ | POOL:hitConnect |
| 056 | `hisokanen_056_t02m32_1s.mp3` | うわぁ | UGH! | discard:noise(grunt/non-lexical) |
| 057 | `hisokanen_057_t02m33_7s.mp3` | ヴァンジーカン | BUNCHEAKIN' | discard:garble/fragment |
| 058 | `hisokanen_058_t02m35_6s.mp3` | バンジーガム | Bungee Gum! | POOL:cast:Bungee-Gum |
| 059 | `hisokanen_059_t02m37_4s.mp3` | バンジーガム | Bungee Gum! | POOL:cast:Bungee-Gum |
| 060 | `hisokanen_060_t02m39_3s.mp3` | バンジーガム | Bungee Gum! | POOL:cast:Bungee-Gum |
| 061 | `hisokanen_061_t02m41_2s.mp3` | バンジーガム | Bungee Gum! | POOL:cast:Bungee-Gum |
| 062 | `hisokanen_062_t02m43_0s.mp3` | バンジーガム | Bungee Gum! | POOL:cast:Bungee-Gum |
| 063 | `hisokanen_063_t02m45_0s.mp3` | 待ちない | I won't wait. | discard:garble/fragment |
| 064 | `hisokanen_064_t02m46_6s.mp3` | 逃さない | You won't get away. | POOL:hitConnect |
| 065 | `hisokanen_065_t02m48_2s.mp3` | 逃がさないよ | I won't let you escape~ | POOL:hitConnect |
| 066 | `hisokanen_066_t02m50_1s.mp3` | あげるよ | Here, this is for you~ | POOL:rekka:Card-Flourish |
| 067 | `hisokanen_067_t02m51_7s.mp3` | そう? | Is that so? | discard:low-value(filler) |
| 068 | `hisokanen_068_t02m53_3s.mp3` | 愛を込めて | With all my love~ | POOL:cast:Texture-Surprise |
| 069 | `hisokanen_069_t02m55_1s.mp3` | ご招待 | You're invited~ | POOL:cast:Texture-Surprise |
| 070 | `hisokanen_070_t02m56_9s.mp3` | 君に贈る | A little gift, just for you~ | POOL:cast:Texture-Surprise |
| 071 | `hisokanen_071_t02m58_8s.mp3` | ガムトコム | Let's go! | discard:garble/fragment |
| 072 | `hisokanen_072_t03m00_7s.mp3` | シニガミクイズ | Shinigami Quiz | discard:garble/fragment |
| 073 | `hisokanen_073_t03m02_7s.mp3` | 回答者はいらない | I don't need a robber. | discard:garble/fragment |
| 074 | `hisokanen_074_t03m05_1s.mp3` | 何枚でしょう | How many cards, do you think~? | POOL:cast:Texture-Surprise |
| 075 | `hisokanen_075_t03m07_2s.mp3` | 答えはおしまい | And the answer is… it's over~ | POOL:win |
| 076 | `hisokanen_076_t03m09_8s.mp3` | 誰も仕掛けもございません | No tricks up my sleeve, I assure you~ | POOL:cast:Texture-Surprise |
| 077 | `hisokanen_077_t03m14_2s.mp3` | よっちしよう | I'll take care of it. | discard:garble/fragment |
| 078 | `hisokanen_078_t03m15_3s.mp3` | 君は踊りくる | You will dance | discard:garble/fragment |
| 079 | `hisokanen_079_t03m16_5s.mp3` | で死ぬ | and die. | discard:garble/fragment |
| 080 | `hisokanen_080_t03m18_3s.mp3` | ほーらね | See~? | POOL:taunt |
| 081 | `hisokanen_081_t03m21_7s.mp3` | すごくいい! | Oh, that's very nice~! | POOL:hitConnect |
| 082 | `hisokanen_082_t03m25_1s.mp3` | 残念 | What a shame~ | POOL:taunt |
| 083 | `hisokanen_083_t03m26_8s.mp3` | 邪魔だよ | You're in the way~ | POOL:hitConnect |
| 084 | `hisokanen_084_t03m28_6s.mp3` | また後でね | See you later~ | POOL:win |
| 085 | `hisokanen_085_t03m30_4s.mp3` | 協力しよう | Let's work together. | discard:context(teamwork, not 1v1) |
| 086 | `hisokanen_086_t03m32_4s.mp3` | 頼むよ | I ask you | discard:low-value(filler) |
| 087 | `hisokanen_087_t03m34_0s.mp3` | 選手交代 | Senshu Koutai | discard:context(teamwork, not 1v1) |
| 088 | `hisokanen_088_t03m36_2s.mp3` | 僕の番だね | It's my turn now~ | POOL:rekka:Card-Flourish |
| 089 | `hisokanen_089_t03m38_3s.mp3` | しゅう? | SHOOT! | discard:noise(grunt/non-lexical) |
| 090 | `hisokanen_090_t03m40_2s.mp3` | お見せしよう | Allow me to show you~ | POOL:cast:Overdrive-ult |
| 091 | `hisokanen_091_t03m42_1s.mp3` | ん? | Hmm. | discard:noise(grunt/non-lexical) |
| 092 | `hisokanen_092_t03m43_5s.mp3` | 遠慮するなよ | Don't hold back now. | POOL:intro |
| 093 | `hisokanen_093_t03m45_4s.mp3` | まだまだ | Not yet, not yet~ | POOL:rekka:Card-Flourish |
| 094 | `hisokanen_094_t03m48_7s.mp3` | 凄いね | Impressive~ | POOL:hitReact |
| 095 | `hisokanen_095_t03m50_4s.mp3` | 予想以上 | Even better than I expected~ | POOL:hitReact |
| 096 | `hisokanen_096_t03m52_3s.mp3` | 合格 | You pass~ | POOL:win |
| 097 | `hisokanen_097_t03m54_1s.mp3` | じゃじゃん | Ta-daa~! | POOL:cast:Texture-Surprise |
| 098 | `hisokanen_098_t03m56_0s.mp3` | あら不思議 | And now, like magic~ | POOL:cast:Texture-Surprise |
| 099 | `hisokanen_099_t03m58_8s.mp3` | そう | That's right! | discard:low-value(filler) |
| 100 | `hisokanen_100_t04m01_5s.mp3` | あ゛っ | No! | discard:noise(grunt/non-lexical) |
| 101 | `hisokanen_101_t04m02_8s.mp3` | ああっ | No! | discard:noise(grunt/non-lexical) |
| 102 | `hisokanen_102_t04m04_3s.mp3` | あ゛ぁ | Ugh. | discard:noise(grunt/non-lexical) |
| 103 | `hisokanen_103_t04m05_7s.mp3` | いー | Eugh! | discard:noise(grunt/non-lexical) |
| 104 | `hisokanen_104_t04m06_9s.mp3` | あ゛あ゛あ゛ | Uwaa! | discard:noise(grunt/non-lexical) |
| 105 | `hisokanen_105_t04m08_6s.mp3` | あ゛あ゛! | Oh! | discard:noise(grunt/non-lexical) |
| 106 | `hisokanen_106_t04m09_9s.mp3` | ああ | Ah! | discard:noise(grunt/non-lexical) |
| 107 | `hisokanen_107_t04m11_4s.mp3` | かい | Let's go! | discard:noise(grunt/non-lexical) |
| 108 | `hisokanen_108_t04m14_2s.mp3` | うっ… | Oh... | discard:noise(grunt/non-lexical) |
| 109 | `hisokanen_109_t04m15_3s.mp3` | いぇ… | Yes. | discard:noise(grunt/non-lexical) |
| 110 | `hisokanen_110_t04m17_1s.mp3` | あっ | Ugh... | discard:noise(grunt/non-lexical) |
| 111 | `hisokanen_111_t04m19_1s.mp3` | ちょっと遊びすぎたか | I toyed with you a bit too much~ | POOL:win |
| 112 | `hisokanen_112_t04m21_3s.mp3` | いいね | Nice~ | POOL:hitConnect |
| 113 | `hisokanen_113_t04m22_7s.mp3` | ん? | Mm-hmm | discard:noise(grunt/non-lexical) |
| 114 | `hisokanen_114_t04m24_1s.mp3` | ふぅん | Hmm | discard:noise(grunt/non-lexical) |
| 115 | `hisokanen_115_t04m25_6s.mp3` | クックッ |  | discard:noise(grunt/non-lexical) |
| 116 | `hisokanen_116_t04m32_3s.mp3` | うふふ | Ha, ha, ha. | discard:noise(grunt/non-lexical) |
| 117 | `hisokanen_117_t04m35_9s.mp3` | あ゛あ゛あ゛ | Ugh... | discard:noise(grunt/non-lexical) |
| 118 | `hisokanen_118_t04m38_0s.mp3` | うっはー | Uh-huh... | discard:noise(grunt/non-lexical) |
| 119 | `hisokanen_119_t04m41_1s.mp3` | うっはー | Uuugh... | discard:noise(grunt/non-lexical) |
| 120 | `hisokanen_120_t04m43_1s.mp3` | んー | mmm | discard:noise(grunt/non-lexical) |
| 121 | `hisokanen_121_t04m44_8s.mp3` | ん? | Hmm? | discard:noise(grunt/non-lexical) |
| 122 | `hisokanen_122_t04m46_8s.mp3` | ゴーン! | Go on. | discard:named(Gon/gong) |
| 123 | `hisokanen_123_t04m51_7s.mp3` | そうかい | Oh, is that so~ | POOL:taunt |
| 124 | `hisokanen_124_t04m53_5s.mp3` | なるほど | I see, I see~ | POOL:taunt |
| 125 | `hisokanen_125_t04m55_4s.mp3` | ねえ | Yes. | discard:low-value(filler) |
| 126 | `hisokanen_126_t04m57_1s.mp3` | ねえ | Right? | discard:low-value(filler) |
| 127 | `hisokanen_127_t04m58_9s.mp3` |  |  | discard:no-speech(silence) |
| 128 | `hisokanen_128_t05m00_7s.mp3` | やろうか | Shall we get started? | POOL:intro |
| 129 | `hisokanen_129_t05m03_0s.mp3` | よーし | Alright then~ | POOL:hitConnect |
| 130 | `hisokanen_130_t05m04_8s.mp3` | 壊した | Kouash... | discard:garble/fragment |
| 131 | `hisokanen_131_t05m07_4s.mp3` | 楽しみだなぁ | I'm so looking forward to this~ | POOL:intro |
| 132 | `hisokanen_132_t05m09_9s.mp3` | 大丈夫 | It's fine, I'm all right~ | POOL:hitReact |
| 133 | `hisokanen_133_t05m12_1s.mp3` | ハンター ハンター | HUNTER HUNTER | discard:named(series title) |
| 134 | `hisokanen_134_t05m13_9s.mp3` | ネイン | NANI- | discard:garble/fragment |
| 135 | `hisokanen_135_t05m16_4s.mp3` | そろそろ軽く | Let's start off nice and light~ | POOL:intro |
