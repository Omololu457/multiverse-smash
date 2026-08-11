# PAIN / NAGATO'S DEVA PATH — Voice Log

210 Japanese clips (`pain_voice_*`, Storm Connections rip, exact filenames preserved). Transcribed via
`tools/transcribe_pain.py` (faster-whisper, TWO passes: native-JA `transcribe` + English `translate`
gloss — the JA pass nails the jutsu callouts). Wired via `painVoice.js` (`pickPainVoice`). Build was
complete (4 specials + 5-assist Six Paths system + Chibaku Tensei ult, `test:pain` 41/0) before wiring.

## Technique-callout mapping (matched individually)

| Move | Pool | Clips (idx) | Callout |
|---|---|---|---|
| Almighty Push / Shinra Tensei (neutral) | `almightyPush` | 130/209/084/129/071/140 | 神奈天聖=神羅天征 Shinra Tensei · 吹き飛ばしてやる (blow away) · 消し飛べ (be obliterated) · 潰れろ (crush) |
| Almighty Pull / Bansho Ten'in (Back) | `almightyPull` | 075/113/076/073 | **バンショーティーン! = Bansho Ten'in!** · とらえたぞ来い (caught you, come!) · こっちだ (this way) |
| Super Almighty Push / Hard Shinra Tensei (Down) | `superPush` | 082/061/064 | 消し飛ばす!終わりだ! (obliterate, it's over) · なんという威力だ (what power!) · 衝撃派だけで (just the shockwave) |
| Dedera Double Attack (Fwd) | `dedera` | 126/128/124/074 | あれを使うか (shall I use that) · 行け! (go) · これはどうだ? — no distinct clay callout, generic technique |
| Chibaku Tensei (Ultimate) | `chibaku` | 078/070/102/199 | **シバク転生!/血膜転生!/死んだ転生! = 地爆天星 Chibaku Tensei** (whisper variants) · 今こそサバキの時だ (now is judgment) |
| Six Paths Summon assists (Itachi/Konan/Sasori/Sasuke/Tobi) | `assistCall` (SHARED) | 011/013/153/077 | ⚠️ **NO name-callouts exist** — searched all 5 names, ZERO hits. Voice set is Nagato's philosophy/combat voice, not Akatsuki-summon lines. Shared thematically-apt pool: 我らあかつきが (We, Akatsuki) · 我らが前では (before us) · 3対1だ (3-vs-1) · 後ろだ! (flank) |

**Disposition totals: 72 wired · 28 discarded · 110 avail (usable, pool full).**

## Full transcript (all 210) + disposition

`→pool` = wired · `DISCARD` = reason · `avail` = usable but not wired (pool full).

| idx | dur | JA (native) | EN (gloss) | disposition |
|---|---|---|---|---|
| 000 | 4.59 | 集合しろ! さん! 痛みを知れ! 死んだ天生! | Shingo Shiro san! Die for the pain! Shingo S | avail |
| 001 | 3.17 | 少しは痛みが理解できたか?やるな | Did you understand the pain a little? Don't  | → `intro` |
| 002 | 1.91 | 英語を生きるお前でも | Even you who can speak English | DISCARD (garbage(English mis-transcribe)) |
| 003 | 1.48 | 神には勝てない | I can't win against God. | avail |
| 004 | 2.42 | 痛みを知れ、俺の道は | Know the pain, my path | → `intro` |
| 005 | 1.14 | 俺の恋愛は | My love. | DISCARD (fragment(俺の恋愛は mis-transcribe)) |
| 006 | 4.91 | 誰にも邪魔させん 今こそさばきの時だ神の力を | I won't let anyone get in the way. It's time | avail |
| 007 | 4.68 | 今、見せよう。ここより、世界に痛みを。 人々が… | Now show me the pain in the world more than  | → `intro` |
| 008 | 0.80 | 国が | The country is... | avail |
| 009 | 1.18 | 世界が | The world is... | avail |
| 010 | 1.27 | 痛みを知るのだ | I know the pain. | → `intro` |
| 011 | 1.52 | 我らあかつきが | We, Akatsuki, are... | → `assistCall` |
| 012 | 1.61 | さばきを下す | I will give you a sabaki. | avail |
| 013 | 4.05 | 我らが前ではどのような策も通じない | In front of us, there is no such strategy. | → `assistCall` |
| 014 | 2.38 | 神に彩むこと自体が | The color of the god itself... | avail |
| 015 | 0.98 | ムーボー | MOVE-O | DISCARD (non-speech(ムーボー)) |
| 016 | 1.36 | お前では | You are... | avail |
| 017 | 5.17 | とておれの痛みは理解できない 今更未練もない | At least I can't understand my pain. I can't | avail |
| 018 | 1.00 | さようならだ | Goodbye. | → `win` |
| 019 | 2.13 | ジライア先生、これで | Jiraiya-sensei, this is it. | DISCARD (named:Jiraiya) |
| 020 | 2.10 | 少しはおとなしくなるか | Will you be quiet for a while? | → `taunt` |
| 021 | 4.58 | キュービ、この俺に勝利する夢でも見たか? | Kyubi, have you ever dreamed of winning agai | DISCARD (named:Kyuubi) |
| 022 | 3.45 | 少子! 世界には痛みが必要だ | Defeat! We need pain in the world. | → `intro` |
| 023 | 2.03 | 痛みを与えることで | By giving pain | avail |
| 024 | 3.66 | ようやく未熟な世界は一つ成長することができる | At last, the world of music can grow into on | avail |
| 025 | 0.79 | メルツ | MIRRORS | DISCARD (non-speech(メルツ)) |
| 026 | 2.27 | 貴様は俺に近い存在だ | You are close to me. | avail |
| 027 | 1.41 | 大国に | To Thailand | avail |
| 028 | 0.99 | 家族 | Family | avail |
| 029 | 1.77 | 仲間を奪われ | Take away your comrades. | avail |
| 030 | 3.39 | 痛みを知った貴様は俺と同じく | You, who know the pain, are the same as me. | avail |
| 031 | 3.02 | 誤りだらけの世界の断りに気づいている | I have realized the world of Ayamari-Darake. | avail |
| 032 | 0.85 | ゆえに | Yueni. | avail |
| 033 | 2.23 | 貴様の意志は俺に誓い | Your will belongs to me. | avail |
| 034 | 2.90 | 決しておれぬ神のごとき意思があれば | If you have the will of God who will not era | avail |
| 035 | 2.55 | 世界を変えることなど絶やすい | It's easy to change the world. | avail |
| 036 | 1.68 | その意志と共に | Together with that will. | avail |
| 037 | 3.58 | 赤月の宿眼のため、 私力を尽くせ | For the sake of Akatsuki Shikugan, give me y | avail |
| 038 | 2.19 | 俺はいかに犠牲を伴おうと | I want to be a friend of sacrifice. | avail |
| 039 | 2.91 | その先にある真の平和のために進む | I will continue to live for the peace of my  | → `intro` |
| 040 | 1.76 | 真の平和のためには | For the sake of true peace. | → `intro` |
| 041 | 3.32 | 世界に痛みを知ってもらうことが必要なのだ | It is necessary to know the pain in the worl | → `intro` |
| 042 | 2.69 | 力泣き理想など無に等しい | I have no idea what to say. | avail |
| 043 | 1.48 | さばきを与える | I will give you a sabaki. | avail |
| 044 | 1.77 | それが世界のためだ | That is for the sake of the world. | → `intro` |
| 045 | 2.57 | お前は千人になったようだな | You seem to have become a thousand people. | avail |
| 046 | 2.27 | ジライア先生と同じように | Just like Dr. Jiraiya. | DISCARD (named:Jiraiya) |
| 047 | 2.50 | 俺もジライアから術を学んだ | I also learned art from Jiraiya. | DISCARD (named:Jiraiya) |
| 048 | 2.27 | ジライアは俺のかつての死だ | Jiraiya is the death of my past. | DISCARD (named:Jiraiya) |
| 049 | 2.31 | お前にとって俺は兄弟子 | For you, I am an older brother. | avail |
| 050 | 2.08 | 同じ死を仰いだ者同士 | The same death is the same as the blue one. | avail |
| 051 | 1.91 | 理解し合えるはずだが | I should be able to understand you. | avail |
| 052 | 0.73 | しわ | Bye. | DISCARD (non-speech(しわ)) |
| 053 | 1.79 | 平和を望んでいた | He was longing for peace. | avail |
| 054 | 1.21 | 木を見て | Look at the tree. | avail |
| 055 | 1.41 | 森を見ていない | I'm not looking at the forest | avail |
| 056 | 0.91 | お前には | To you... | avail |
| 057 | 4.94 | 平和の本当の意味が理解できてないだけだ おとなしくつかまれ | I just can't understand the true meaning of  | → `intro` |
| 058 | 1.21 | お前の死が | Your death... | avail |
| 059 | 1.57 | 平和へと繋がる | Connected with peace. | avail |
| 060 | 1.31 | こうも簡単に | This is easy too! | avail |
| 061 | 1.43 | なんという威力だ | What kind of power is that? | → `superPush` |
| 062 | 0.81 | この俺が | This is me! | avail |
| 063 | 0.60 | なんだと! | What?! | → `hitReact` |
| 064 | 1.90 | もされて、衝撃派だけで | It's just an assault! | → `superPush` |
| 065 | 1.95 | バカな! 聞いていないのか? | Idiot! Didn't you hear that? | avail |
| 066 | 0.73 | くっ! | Gah! | → `hitReact` |
| 067 | 0.71 | 止まらない! | I won't stop! | avail |
| 068 | 0.75 | まだ来る! | It's still coming! | avail |
| 069 | 0.75 | まさか | No way... | DISCARD (near-dup of 134 (まさか)) |
| 070 | 3.64 | これほどとは 死んだ転生! これはどうだ? | What do you think of this? A dead genius! Wh | → `chibaku` |
| 071 | 0.97 | 潰れろ! | Break it down! | → `almightyPush` |
| 072 | 1.48 | そこだ!当たり! | There it is! Hit it! | → `combatBark` |
| 073 | 1.03 | 逃がさん! | I won't let you escape! | → `almightyPull` |
| 074 | 1.21 | これならどうだ? | How about this? | → `dedera` |
| 075 | 1.52 | バンショーティーン! | Ban Shoting! | → `almightyPull` |
| 076 | 0.83 | こっちだ! | This way! | → `almightyPull` |
| 077 | 0.91 | 後ろだ! | It's behind you! | → `assistCall` |
| 078 | 1.50 | シバク転生! | Shibaku Tensei! | → `chibaku` |
| 079 | 0.66 | 甘い! | It's sweet! | avail |
| 080 | 1.32 | そうはいかん | I don't like that. | → `hitReact` |
| 081 | 0.93 | これなら | If that's the case... | avail |
| 082 | 4.15 | タフなやつだ 消えろ! 消し飛ばす! 終わりだ! | It's a tough one. Disappear! The quest bus i | → `superPush` |
| 083 | 0.73 | くたまる! | Get out of the way! | avail |
| 084 | 0.82 | 消し飛べ! | Get out of the way! | → `almightyPush` |
| 085 | 0.90 | 力を | power | avail |
| 086 | 1.23 | 使いすぎたか | You used too much. | → `lowHealth` |
| 087 | 1.46 | 時間がいるな | It's been a while. | avail |
| 088 | 1.26 | 一目そこねたか | You're the first one to wake up. | avail |
| 089 | 0.79 | よーし | All right. | avail |
| 090 | 1.59 | 力が戻ったな | The power has returned. | avail |
| 091 | 1.45 | 持ち直せたか | Did you fix it? | avail |
| 092 | 1.17 | 次こそは | What's next? | avail |
| 093 | 1.63 | なんだとしちゃった | What the hell was that? | → `hitReact` |
| 094 | 1.60 | 神を倒すなど | and defeat the gods. | avail |
| 095 | 1.42 | 何人も不可能 | None of them are impossible. | avail |
| 096 | 1.48 | 避けられはしない | I won't let you get away with it. | avail |
| 097 | 1.18 | 何なのだ? | What the hell is this? | → `hitReact` |
| 098 | 0.94 | こいつは | This guy... | avail |
| 099 | 1.21 | このままでは | I won't let you stay like this. | avail |
| 100 | 2.27 | そろそろしまいにしようか | Let's get it over with. | → `win` |
| 101 | 1.92 | 少々甘く見ていた | I was looking at it a little bit. | → `taunt` |
| 102 | 5.95 | ならば! 血膜転生! ここまでとはな キャーッ! 給備の力! | Then... Shibaku Tensei! This is the end. Kya | → `chibaku` |
| 103 | 3.43 | 素晴らしいものだな 決着をつけるぞ | It's a wonderful thing. I'll make a decision | avail |
| 104 | 0.84 | キューヴィッ! | Cubic! | DISCARD (named:Kyuubi(キューヴィッ)) |
| 105 | 0.89 | こいつ | This guy | → `hitReact` |
| 106 | 1.47 | 想像以上だ | That's all for this video. | avail |
| 107 | 0.86 | こいつ | This guy... | DISCARD (near-dup of 105 (こいつ)) |
| 108 | 1.32 | 既に急避を | It's already been 9 seconds. | avail |
| 109 | 3.25 | 生することができるというのか? この俺が! | Can you control it? I'll do it! | → `lowHealth` |
| 110 | 0.62 | ここまで! | This is it! | avail |
| 111 | 1.62 | 俺は負けられんのだ | I can't lose! | → `lowHealth` |
| 112 | 2.76 | 痛みは世界を成長させる | Pain will grow the world. | → `intro` |
| 113 | 1.73 | とらえたぞ来い | I caught it. Come on! | → `almightyPull` |
| 114 | 0.94 | すぐれろ | You're amazing! | avail |
| 115 | 1.47 | 無力だと知れ | Tell me that you are powerless. | → `taunt` |
| 116 | 1.39 | 逃げても無駄だ | Even if you run away, it's useless. | → `taunt` |
| 117 | 0.82 | 受けてみろ! | Take this! | → `combatBark` |
| 118 | 2.29 | 肌辺はすまん、どうだ | I'm sorry, how is your skin? | → `combatBark` |
| 119 | 0.85 | どうした? | Why? | avail |
| 120 | 1.08 | その遺度か | It's your turn. | avail |
| 121 | 0.86 | 弱い | I'm weak. | → `taunt` |
| 122 | 2.93 | かわしきれるか?今度はこっちだ | Can you cut the skin? This is the next one. | avail |
| 123 | 1.22 | もう一度だ | One more time. | avail |
| 124 | 1.19 | これはどうだ? | What do you think about this? | → `dedera` |
| 125 | 1.21 | 好きだらけだ | I love you. | avail |
| 126 | 1.46 | あれを使うか | Should I use that? | → `dedera` |
| 127 | 1.09 | しくじったか | Are you out of your mind? | → `lowHealth` |
| 128 | 0.57 | 行け! | Go! | → `dedera` |
| 129 | 2.39 | 避けられはしない 消し飛べ | I won't let you get away from me. Get out of | → `almightyPush` |
| 130 | 4.64 | 吹き飛ばしてやる いい気になるな 2対同時ならどうだ | I'll blow you up. Don't get too excited. How | → `almightyPush` |
| 131 | 2.66 | 使い物にならないか くそ | I can't use it. Damn it. | → `lowHealth` |
| 132 | 2.04 | やられたか | Did you get killed? | avail |
| 133 | 1.17 | なんだと? | What is it? | → `hitReact` |
| 134 | 1.72 | まさか、そんな… | No way! | avail |
| 135 | 1.73 | 持ち直したようだな | You seem to want to fix it. | avail |
| 136 | 0.64 |  |  | DISCARD (non-speech/SFX(empty)) |
| 137 | 0.79 | まさか | I can't believe it! | DISCARD (near-dup of 134 (まさか)) |
| 138 | 1.28 | 何をする気だ | What are you going to do? | avail |
| 139 | 1.90 | 何をしようと無駄だ | What are you trying to do? | avail |
| 140 | 0.89 | 振り落とせ! | Turn off the lights! | → `almightyPush` |
| 141 | 1.15 | してやられた | I did it. | avail |
| 142 | 1.33 | 馬鹿なやつだ | Idiot. | → `taunt` |
| 143 | 1.29 | 振り落としたか | Did you try to turn it off? | DISCARD (near-dup of 140 (振り落とし)) |
| 144 | 1.01 |  |  | DISCARD (non-speech/SFX(empty)) |
| 145 | 0.86 | こいつ | This guy! | DISCARD (near-dup of 105 (こいつ)) |
| 146 | 0.51 | 馬鹿な | Idiot! | DISCARD (near-dup of 142 (馬鹿な)) |
| 147 | 0.88 | 少々 | Little by little. | avail |
| 148 | 1.06 | みくびっていた | He was sulking. | avail |
| 149 | 1.40 | 意外に粘る | Unexpectedly leveled. | avail |
| 150 | 1.55 | なかなかにやる | I'm pretty sure of it. | avail |
| 151 | 1.66 | さすがは先生 | Mr. Sasugawa | DISCARD (named:Jiraiya(先生)) |
| 152 | 1.37 | ここまで持つと | If you hold it this far... | avail |
| 153 | 1.32 | 3対1だ | 3 vs 1 | → `assistCall` |
| 154 | 1.16 | 部が悪いぞ | I'm sorry. | avail |
| 155 | 0.70 | どうすれ | Dossel | avail |
| 156 | 1.98 | 残念だったな 何? | Too bad. What? | avail |
| 157 | 1.30 | この俺をしている? | Are you doing this to me? | avail |
| 158 | 1.10 | やられたか | Did you get killed? | DISCARD (near-dup of 132 (やられたか)) |
| 159 | 1.59 | これほどとはな | This is what it looks like. | avail |
| 160 | 1.11 | 全滅だと | It's all destroyed. | avail |
| 161 | 0.94 | マゼイナ | Mazeena. | DISCARD (non-speech(マゼイナ)) |
| 162 | 1.03 | この程度 | At this rate... | avail |
| 163 | 1.99 | それで倒したつもりか | Is that how you defeated him? | → `combatBark` |
| 164 | 3.21 | 甘く見るなよ これで終わりではない | Don't look at me like that. This isn't the e | → `combatBark` |
| 165 | 2.18 | これで諦めもついたか | Did you give up now? | → `win` |
| 166 | 2.23 | ここまでしぶといとはな | That's all for now, Shibutoi. | avail |
| 167 | 1.82 | 応情際の悪い | I'm sorry about that. | avail |
| 168 | 2.58 | 想像に諦めればいいもの | I just have to give up on my imagination. | avail |
| 169 | 2.36 | すぐにあの世に送ってやる | I'll send it to you as soon as possible. | → `win` |
| 170 | 1.98 | いかげんあきらめろ たっ | Just give up! Stand! | avail |
| 171 | 0.92 | ているのもや |  | DISCARD (non-speech/SFX(empty)) |
| 172 | 2.31 | そろそろくたばったらどうだ | What if it's too late? | → `win` |
| 173 | 1.86 | 立てなくなったようだな | It looks like I can't stand it anymore. | → `win` |
| 174 | 1.02 | そろそろ | It's about time. | avail |
| 175 | 4.75 | 目も見えなくなってきたんじゃないのか? もはや目も見えまい | You can't even see your eyes, can you? You c | avail |
| 176 | 2.01 | まだ生きているとはな | You're still alive, aren't you? | avail |
| 177 | 1.94 | そううまくはいかんぞ | That's not a good idea. | avail |
| 178 | 2.93 | なんだそれは、その程度とは | What is that? How much is that? | → `taunt` |
| 179 | 0.95 | 笑わせる | I'll make you laugh. | avail |
| 180 | 0.86 | 無駄だ! | It's useless! | avail |
| 181 | 1.86 | それでは俺はやれん | Well then, I won't do it. | avail |
| 182 | 1.70 | まだ分からんのか | You still don't understand? | avail |
| 183 | 1.19 | 愚かな | Idiot. | → `taunt` |
| 184 | 1.50 | ブーザーマーだな | You're a fool. | → `taunt` |
| 185 | 2.05 | そこまでして何になる | What will you do until then? | avail |
| 186 | 1.49 | よくここまで寝ばっ | Well, if you don't come this far... | avail |
| 187 | 1.00 | 褒めてやろう | I'll praise you. | → `win` |
| 188 | 0.69 | だが | But... | avail |
| 189 | 1.84 | そろそろ終わらせる | It's about to end. | → `win` |
| 190 | 0.51 | チッ! | Tch! | → `hitReact` |
| 191 | 0.92 | こいつ | This guy | DISCARD (near-dup of 105 (こいつ)) |
| 192 | 1.46 | 想像以上だ | That's all I can think of. | DISCARD (near-dup of 106 (想像以上だ)) |
| 193 | 1.14 | かっこっ | C- | DISCARD (non-speech(かっこっ)) |
| 194 | 4.78 | 使いすぎたか 今更あんな術 もはやお前に | You used it too much. That kind of technique | → `lowHealth` |
| 195 | 1.36 | 漫画一話 | Man-ga-ichiwa... | DISCARD (garbage(漫画一話)) |
| 196 | 5.34 | ない! 諦めろ! 俺の道は… | I don't have one. Give it up! My path is... | avail |
| 197 | 1.15 | 俺の出会いは | My love | DISCARD (fragment(俺の出会いは)) |
| 198 | 1.62 | 誰にも邪魔させん | I won't let anyone get in the way. | avail |
| 199 | 3.21 | 今こそサバキの時だ まさか | Now is the time of fate. No way... | → `chibaku` |
| 200 | 2.24 | ここまで大したやつだ | This is the end of the story. | avail |
| 201 | 4.50 | それに気づいているとは くだらない世の中にシューシフを撃つ | And then I realized that... I was in a world | avail |
| 202 | 1.73 | それが神の身技だ | That is God's grace. | avail |
| 203 | 1.58 | 一人で俺に挑むか | Are you going to challenge me alone? | avail |
| 204 | 1.04 | その判断 | That judgment. | avail |
| 205 | 1.83 | 誤ってなければいいがな | I hope you don't apologize. | avail |
| 206 | 2.53 | 成長していないのはこの世界だ | This world is not growing. | avail |
| 207 | 1.48 | 俺たちは成長し | We have grown. | avail |
| 208 | 1.32 | 今にいたっている | I'm standing right now. | avail |
| 209 | 3.75 | ここより世界にいたみを 神奈天聖! | The pain in the world is more painful than h | → `almightyPush` |
