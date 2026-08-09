# MADARA UCHIHA — Voice Log

165 Japanese clips (`madara_voice_*`, exact filenames preserved). Transcribed via
`tools/transcribe_madara.py` (faster-whisper, TWO passes: native-JA `transcribe` + English
`translate` gloss — the JA pass is what nails the jutsu callouts). Wired via `madaraVoice.js`
(`pickMadaraVoice`). Build was complete (all 7 specials + tiered Ultimate) before wiring.

## Technique-callout mapping (matched individually)

| Move | Pool | Clips (idx) | Callout |
|---|---|---|---|
| Katon: Great Fireball (neutral) | `fireball` | 083/084/085 | カトゥン Katon! · 豪火滅却 Gouka Mekkyaku · 燃えるがいい Burn! |
| Gunbai Summon (Up) | `gunbaiSummon` | 001/076 | 口寄せ Kuchiyose (summon) · 契約封印 Contract Seal |
| Gunbai Fan-Swing (Fwd) | `gunbaiSwing` | 065/109/092 | 力のみ (power only) — no distinct fan callout → aggressive melee |
| Mokuton: Wood Spike (Down) | `woodSpike` | 088/059 | no distinct spike callout → aggressive Mokuton-adjacent |
| Mokuton: Wood Dragon (Back) | `woodDragon` | 000 | 木流の術 Mokuryū no Jutsu! (= Wood Dragon) |
| Susanoo Base Punch (Fwd+Heavy) | `susanooPunch` | 108/051 | サノロ→須佐能乎 Susanoo! · 力の差 (power gap) |
| Susanoo Attack armor (Back+Heavy) | `susanooArmor` | 061/098 | 最強のチャクラ (strongest chakra) · 俺の認めた男 |
| TAP Ult — Perfect Susanoo/Tengai Shinsei | `tengaiShinsei` | 002/073/082 | 雨にしては少し大きいか (a bit big for rain? = the meteor) · 消し飛ばしてやる終わりだ (obliterate) · これを止められるか |
| HOLD Ult — Complete Susanoo | `completeSusanoo` | 062/113/134 | 無限月読 Mugen Tsukuyomi · 俺の無限つくよみによって · この世界の終わりだ (end of this world) |

## Full transcript (all 165) + disposition

`→pool` = wired · `DISCARD` = reason · `avail` = usable but not wired (pool full).

| idx | dur | JA (native) | EN (gloss) | disposition |
|---|---|---|---|---|
| 000 | 1.63 | 木流の術! | Mokuryu no Jutsu! | → `woodDragon` |
| 001 | 6.00 | この砂の破壊そのもの 砕け散れ! 口寄せ! ゲドオマゾー! | I will destroy you, you scoundrel! Kuchiyose | → `gunbaiSummon` |
| 002 | 2.92 | 雨にしては少し大きいか? | Is it a little big in the rain? | → `tengaiShinsei` |
| 003 | 0.57 | ん? | Huh? | → `hitReact` |
| 004 | 1.35 | なかなかやるな | That's pretty good. | → `hitReact` |
| 005 | 0.61 | だが | But... | → `hitReact` |
| 006 | 3.06 | それが限界だ 少し手惑ったな | That's the limit. I'm a little disappointed. | avail |
| 007 | 1.26 | なかなかの相手だ | He's quite an opponent. | → `hitReact` |
| 008 | 1.95 | 敗者に欠ける時期はない | There is no time to be a loser. | → `win` |
| 009 | 2.74 | お前はここで終わりだ | You're done here. | → `combatBark` |
| 010 | 5.52 | この俺には誰も届きはしない。この戦いは本の要求。 | No one can reach me. This battle is real. | → `intro` |
| 011 | 4.18 | それなりに楽しめたがな この世には何もない | I enjoyed it a lot, but there's nothing like | → `win` |
| 012 | 2.14 | あるのは憎しみと | There is hatred. | avail |
| 013 | 3.86 | 絶望だけだ。この世に希望などない | It's just despair. There's no hope in this w | → `win` |
| 014 | 1.25 | あるのはただ | There's only one. | avail |
| 015 | 2.06 | 深い絶望のみ | Deep despair. | avail |
| 016 | 2.13 | ジャリフゼーが生きがるな | Jari-Fuzei is alive. | **DISCARD** — garbled non-line |
| 017 | 3.23 | だから貴様は無様に倒れているのだ | That's why you have fallen into the trap. | avail |
| 018 | 1.51 | 誰も届かぬ | No one can reach it. | → `combatBark` |
| 019 | 0.99 | あろうがやぬ | Arogaen. | **DISCARD** — garbled non-line |
| 020 | 2.68 | お前の負けだ…この戦いも… | I lost to you. This battle, too. | → `combatBark` |
| 021 | 2.33 | 踊れそうにないようだな | I don't seem to be able to dance. | → `taunt` |
| 022 | 1.55 | つまらぬ相手だ | You're a boring opponent. | → `taunt` |
| 023 | 2.25 | 愚かなるは俺の前に立った | You fool stood in front of me | avail |
| 024 | 1.47 | 貴様の意志を | Your will. | avail |
| 025 | 1.60 | 踏み込みがなってない | I don't have a clue. | → `hitReact` |
| 026 | 4.28 | だからお前は負けたのだ 貴様の力では何も変わらない | That's why you lost. Nothing will change wit | → `combatBark` |
| 027 | 3.50 | 何者それがお前の実力か | What is it? Is that your true power? | avail |
| 028 | 3.38 | 確実にな 俺を追い詰めると | I'm sure you'll catch up with me. | → `hitReact` |
| 029 | 1.23 | www | Hahahaha | → `taunt` |
| 030 | 5.03 | こやつめ、俺に挑む単力は見事、だが | You bastard... You're the only one I can rel | avail |
| 031 | 3.15 | 褒めるべきはそれだけだ そう | That's all you have to praise. That's right. | avail |
| 032 | 2.32 | それがお前の限界 | That is your limit. | → `combatBark` |
| 033 | 5.25 | 人として超えられない壁だ、よくぞここまで粘ったな | It's a wall that can't be overcome as a pers | avail |
| 034 | 0.98 | 貴様の名 | Your name... | avail |
| 035 | 3.29 | 覚えておいてやる もう理解しろ | I will remember you. Understand me now. | avail |
| 036 | 2.87 | すべて終わったのだ 寝ていろ | It's all over. Go to sleep. | → `combatBark` |
| 037 | 3.34 | そしてそのまま夢の世界に行くがいい | And go to the world of dreams as it is. | → `win` |
| 038 | 4.54 | 弱い戦術などなおさらだ 力とは | You're such a weak warrior, Naosara. What po | avail |
| 039 | 3.76 | 意志ではなく、物質の起こす事象のことだ | It is not a will, but a decision to make. | avail |
| 040 | 2.84 | 引き継がれるものがあるとすれば | If there is something that can be drawn out. | avail |
| 041 | 1.52 | 俺はもう | I'm already... | avail |
| 042 | 4.72 | 届いたのさ 焦ったな帯と | I've got it! I'm in a hurry, Obito. | **DISCARD** — names Obito |
| 043 | 5.64 | 今のお前はガキに等しい存在だ 時間は十分やっただろ | Now you are a person who loves drawing. Time | avail |
| 044 | 1.97 | 誰でも言いたくないのさ | I don't want to tell anyone. | avail |
| 045 | 2.23 | 本当の平和などない | There's no peace at all. | avail |
| 046 | 4.12 | それがウチハマダラだ 見にくいな | That's what I'm talking about. It's hard to  | → `intro` |
| 047 | 5.51 | もう踊ることもできんか 貴様の居場所はここにない | You can't even dance anymore? You don't have | → `win` |
| 048 | 3.05 | 皆の幸せの邪魔をしているのだ | Everyone is in the way of their own happines | avail |
| 049 | 2.85 | お前は、お前はまだだとして | You are... You are Madara, aren't you? | **DISCARD** — garbled self/other ref |
| 050 | 4.97 | 天使を抹刀すべきだったんだがな 同じ打ちはでありながら | I should have waited for Tenju. But he's in  | **DISCARD** — references another (Tenju/same-house) |
| 051 | 2.12 | 力の差は劣以前 | The power of the sword is history. | → `susanooPunch` |
| 052 | 1.65 | 木流の術! | Mokuryū no Jutsu! | **DISCARD** — near-dup of 000 (Mokuryu) |
| 053 | 5.99 | この砂の破壊その者 砕け散れ! 口寄せ! 下道魔像! | I will destroy you, you scoundrel! Kuchiyose | **DISCARD** — near-dup of 001 (Kuchiyose) |
| 054 | 2.93 | 雨にしては少し大きいか? | Is it a little big in the rain? | **DISCARD** — near-dup of 002 |
| 055 | 1.36 | 現実は終わり | The truth is over. | avail |
| 056 | 4.85 | 俺にとってはただの通貨店にすぎない 俺はこの世を滑るもの | For me, it's just a passing point. I'm the o | avail |
| 057 | 0.81 | そう | So... | avail |
| 058 | 3.55 | 俺を楽しませる 踊ってもらおうか | You want me to enjoy myself? You want me to  | → `taunt` |
| 059 | 1.75 | 死に至るまで | Until I die... | → `woodSpike` |
| 060 | 2.83 | 永遠にな、最後にして | I'll be there forever, for the last time. | avail |
| 061 | 5.49 | 最強のチャクラを持つこの俺が導く 目的は唯一 | I am the one who has the strongest chakra. M | → `susanooArmor` |
| 062 | 2.95 | 無言尽くよみの上銃のみ | The beauty of the beast of the endless moonl | → `completeSusanoo` |
| 063 | 2.66 | この世界を否定する存在 | The existence to deny this world. | avail |
| 064 | 4.27 | それがウチハマダラだ 愛など不要 | That's what I'm talking about, Hama-dara! I  | avail |
| 065 | 3.36 | 真に必要なものは力のみ! さっ | What you really need is power! Tha- | → `gunbaiSwing` |
| 066 | 3.44 | 踊ってみせろ ここでブザマに果てるがいい | Dance and show me. I'll beat you up here. | → `taunt` |
| 067 | 1.34 | 安心しろ | Don't worry. | avail |
| 068 | 1.24 | 手は抜いてやる | I'll take your hand out. | avail |
| 069 | 2.46 | じゃり相手に本気でやってもな | I don't care if I do it seriously. | → `taunt` |
| 070 | 2.83 | あ、しらわー! 絶望するがいい | Ashiroba! I'll make you despair. | avail |
| 071 | 1.32 | 光もない | There is no light! | avail |
| 072 | 4.69 | あるのはただ絶望だけだ お前では俺を倒せん | There is only despair. You will not defeat m | → `combatBark` |
| 073 | 4.82 | 消し飛ばしてやる いけ 終わりだ 臨房変極 | I'll destroy you! Go! It's over! The forest  | → `tengaiShinsei` |
| 074 | 1.38 |  |  | **DISCARD** — empty / non-speech |
| 075 | 2.66 | 既に希望などお前らにはない | I don't have any hope for you guys. | avail |
| 076 | 0.95 | 契約封印 | Negotiate. | → `gunbaiSummon` |
| 077 | 3.32 | やはり貴様との戦いは心を踊る | After all, the battle with you will dance th | → `intro` |
| 078 | 0.72 | さあ | Now! | avail |
| 079 | 2.27 | もっと俺を楽しませろ! | Let me have more fun! | → `taunt` |
| 080 | 3.37 | そんな生暗でどうするつもりだ 柱間 | What are you going to do with such a raw mac | **DISCARD** — names Hashirama |
| 081 | 0.95 | さようなら! | Farewell! | → `win` |
| 082 | 1.98 | お前にこれを止められるか | Will you be able to stop this? | → `tengaiShinsei` |
| 083 | 0.63 | カトゥン! | Katoom! | → `fireball` |
| 084 | 1.30 | 効果先鋒! | Goukatsu Senpuu! | → `fireball` |
| 085 | 2.91 | 燃えるがいい、せっかくの妖嬌だ | It's a good thing you're on fire, it's a goo | → `fireball` |
| 086 | 1.44 | お前も楽しめ | I'm looking forward to seeing you again. | avail |
| 087 | 3.64 | お前の力はこの程度ではないだろ 本気で来い | Your power is not at this level, right? Come | → `intro` |
| 088 | 1.63 | 出なければすまらぬ | If you don't come out, I won't forgive you! | → `woodSpike` |
| 089 | 2.24 | お前は届きはしないのさ | You won't be able to reach me. | → `combatBark` |
| 090 | 0.86 | ハッシュラマン | Hashirama | **DISCARD** — names Hashirama |
| 091 | 3.17 | 注目ごときで封じ込められると思ったか | Did you think you'd be able to seal it with  | avail |
| 092 | 0.55 | やる! | Do it! | → `gunbaiSwing` |
| 093 | 2.91 | もうおろくしたか、ハシラマ。どうした? | Are you done, Hashirama? What's wrong? | **DISCARD** — names Hashirama |
| 094 | 1.91 | これだからやめられんのだ | This is why I can't give up. | → `lowHealth` |
| 095 | 2.73 | 貴様との戦いは、さあ | The battle against you is... Come on... | → `intro` |
| 096 | 1.74 | 続けるぞ、ハシラマ | I will continue, Hashirama. | **DISCARD** — names Hashirama |
| 097 | 2.83 | ふっふっふっふ 渋滞な柱は | H-h-h-h-h-h, you're so stubborn, Hashirama! | **DISCARD** — names Hashirama |
| 098 | 3.19 | だがそれでこそ俺の認めた男よ | But that's the man I recognized! | → `susanooArmor` |
| 099 | 1.23 | 望むところだよ! | It's where you want to go! | → `intro` |
| 100 | 1.77 | ただの黙人ごときで | In a moment of silence... | avail |
| 101 | 3.67 | 俺に届くと思っているのか? やるな柱間 | Do you think you can reach me? Don't do it,  | **DISCARD** — names Hashirama |
| 102 | 3.66 | 俺の給備をここまで追い詰めるとは だが | It's hard to catch up to this point in my li | → `hitReact` |
| 103 | 2.50 | この予協はまだ終わらせん | This is not the end of this world yet! | → `lowHealth` |
| 104 | 0.68 | ふっふっふっ | Heh heh heh. | → `taunt` |
| 105 | 3.18 | やはりお前との戦いはでっかく | After all, the battle with you is huge. | → `lowHealth` |
| 106 | 3.77 | 俺とここまで大統に戦える者はお前だけ | You're the only one who can fight against me | → `lowHealth` |
| 107 | 2.95 | 本当の夢ってやつがなぁ | It's like a real dream! | → `lowHealth` |
| 108 | 0.87 | サノロ! | Sanoro! | → `susanooPunch` |
| 109 | 2.37 | これ以上は、やらせんぞ! | I won't let you do this! | → `gunbaiSwing` |
| 110 | 4.97 | うおおおおお!! この一撃で! やるな柱間 だが | Uwaa! This one hit! Don't do it, Hashirama.  | **DISCARD** — names Hashirama |
| 111 | 0.60 | さぁ! | Sir! | avail |
| 112 | 2.65 | 鈴木をやるぞ! とにかく落ち着け! | Let's do it, Suzuki! Calm down, anyway. | avail |
| 113 | 5.61 | 真の意味で人々が幸せになるのだ 俺の無限つくよみによってな | People will be happy in the true meaning. It | → `completeSusanoo` |
| 114 | 1.96 | 忍びたちの道は終わり | The path of the dead is over. | avail |
| 115 | 2.51 | 新しい夢の道が始まる | A new path of dreams begins. | avail |
| 116 | 2.33 | 俺の手には6つの兵器がある | I have six weapons in my hand. | avail |
| 117 | 1.16 | この戦力差 | This is the power difference. | avail |
| 118 | 3.22 | 貴様ら二人がどうにかできるものではないぞ | You two can't do anything about it. | avail |
| 119 | 1.33 | おかしなやつだ | It's a strange guy. | avail |
| 120 | 5.09 | 高が美重ごときにいらだつとは なるとめ急微の力を | I'll stop you from being a coward when you'r | **DISCARD** — garbled / Naruto-ish |
| 121 | 5.71 | よくね、バル。いかにあらがおうとおまえに未来はない。 口寄せろ、ジュ | Good night, bal. I don't have a future for y | **DISCARD** — garbled (bal/jutsu) |
| 122 | 2.76 | キュービー! お互い温まってきた頃だろ | Kyubi! It's the time we've both warmed up. | **DISCARD** — names Kyuubi (Nine-Tails) |
| 123 | 3.35 | うっ! 世界にはもはや希望も未来も | In the world, there is hope and the future. | avail |
| 124 | 3.21 | 名のある英雄もいらないのだよ さぁ | I don't even need a hero like that. Come on! | avail |
| 125 | 3.49 | どうだろうな、お前は何もかも遅すぎる | What do you think? You're too late. | avail |
| 126 | 1.42 | 分かる必要はない | I don't need to understand. | avail |
| 127 | 4.51 | どうせ何も知らぬままお前は散るのだからな ユーナだ | You're going to die if you don't know anythi | **DISCARD** — hallucinated name (Yuna) |
| 128 | 1.14 | 気まぐれであり | I'm Kimagure. | avail |
| 129 | 3.34 | 計画でもあり戦争のためでもあり | It's a plan. It's for war. | avail |
| 130 | 2.83 | 平和のためでもある だがいずれ | It's for peace, but at any time... | avail |
| 131 | 5.44 | 物事は俺の思うがままに流れることとなる ついにここまで来た | Things have become my way of thinking, but t | avail |
| 132 | 3.23 | 無限つくよみの術を組むことができる | You can use infinite techniques of Tsukuyomi | avail |
| 133 | 1.06 | すなわち | That is... | avail |
| 134 | 2.84 | この世界の終わりだ待っていろ | It's the end of this world! Wait for it! | → `completeSusanoo` |
| 135 | 1.34 | よくやったなぁ | You did a good job. | → `win` |
| 136 | 2.20 | お前ならやれると信じていた | I believed you could do it. | avail |
| 137 | 0.82 | どこへ行く? | Where are you going? | avail |
| 138 | 1.71 | 俺のことを聞いてどうなる | What will happen if you listen to me? | avail |
| 139 | 1.75 | お前らはもう間もなく | You guys will be gone soon. | avail |
| 140 | 1.47 | 終わるというのに | Even though it's over... | avail |
| 141 | 1.87 | さすが4代目ほかげ | As expected of the fourth-generation Hokage | **DISCARD** — names the Fourth Hokage (Minato) |
| 142 | 1.74 | この上に敵図をくれ | Give me the enemy in this picture. | avail |
| 143 | 1.83 | 急避を引き放すとはな | I'll let you go for 9 seconds. | avail |
| 144 | 1.74 | 俺には力はないが | I have no power | avail |
| 145 | 3.02 | これまでに集めた美重の力がある | There is a power of beauty that has been col | avail |
| 146 | 2.99 | お前たちに勝ち目はないぞ | I won't win against you guys. | avail |
| 147 | 0.95 | いいだろ | Not bad, right? | avail |
| 148 | 0.79 |  |  | **DISCARD** — empty / non-speech |
| 149 | 0.87 | 貴様 | You... | avail |
| 150 | 1.94 | 両天秤のこぞうか | Ryo Tenbin's kid? | avail |
| 151 | 3.88 | 昔一度力の差を教えてやったはずだがな | I should have taught you how to use power on | avail |
| 152 | 3.41 | 世界はこれ以上成長する必要などない | The world doesn't need to grow any more than | avail |
| 153 | 2.94 | 無限のツクヨミの中で眠っていればいい | I wish I could sleep in the endless darkness | avail |
| 154 | 2.93 | 俺を前にして勝利などありえん | I won't let you win. | avail |
| 155 | 3.64 | 俺は誰でもない 誰でも痛くないのさ | I'm no one. I don't want to be anyone. | avail |
| 156 | 3.06 | 月の目計画をなすればそれでいい | If you have a plan for the moon, that's fine | avail |
| 157 | 3.83 | 絶望しかないこの世界に存在する価値はない | There is no point in existing in this world  | → `combatBark` |
| 158 | 1.80 | お前たち人中力は | Who are you guys? | avail |
| 159 | 2.00 | 美銃を取り付けさせられ | Let me take care of your beauty. | avail |
| 160 | 1.81 | 絶望ばかり見てきた | I've been looking forward to it. | avail |
| 161 | 0.71 | 違うか | Is it different? | avail |
| 162 | 2.37 | お前たちだったらこの絶望を | If it were you, this despair... | avail |
| 163 | 1.96 | 少しは理解できるだろう | You can understand a little, right? | avail |
| 164 | 3.31 | この面を剥がすには骨が折れるぞ | The bones will be broken to peel off this si | avail |

**Counts:** 63 wired · 22 discarded · 80 available (usable, pool full).
 Discards = named-character mentions (Hashirama/Obito/Kyuubi/Fourth Hokage) + non-speech/garbled + near-duplicates.
