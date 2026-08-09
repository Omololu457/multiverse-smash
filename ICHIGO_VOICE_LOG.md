# Ichigo Kurosaki — Voice Line Log (Bleach: Rebirth of Souls, Japanese)

167 clips (`ichigo_voice_*`, exact filenames preserved). Transcribed via `tools/transcribe_ichigo.py` (faster-whisper `small`, 2-pass: native-JA + English gloss), then hand-reviewed. Audio-only — **zero gameplay/stat/frame changes**. Wired through `ichigoVoice.js` (`pickIchigoVoice(pool)` → `sound.playSfxFile`), mirroring the Madara/Miwa JA voice modules.

**Totals: 62 wired · 64 discarded · 41 held (clean surplus, available).** Named-other-character lines discarded: **0** (none present — every line is generic self/opponent address; the two English-gloss 'names' Marina/Jenna are garbled non-words in JA, discarded as noise).


## Technique-callout mapping (Step 3)

Ichigo's callouts are all **Getsuga-family**, matching his built kit. **No confident 'Bankai' callout was isolated** — and his kit has no Bankai-named move (his powered/Hollow forms are the Hollow Getsuga / Hollow Rising supers), so nothing was fabricated. Cross-reference:

| Callout (clip) | JA | Built move it drives |
|---|---|---|
| **046** | ゲッツガーテンション! (Getsuga Tenshō!) | Ultimate (Getsuga Tenshō cinematic) |
| **159** | 月が天使! (Getsuga Tenshō!) | Ultimate |
| **096** | こいつで決める!吹き飛べ!切り崩す! | Ultimate (all-out finisher windup) |
| **166** | この一撃に込める! (all into one strike) | Ultimate |
| **003 / 088** | ギュッツガー! / ケッツガー (Getsuga!) | Neutral Getsuga Tenshō projectile |
| **039** | 月が転称 (Getsuga Tenshō) | Neutral Getsuga Tenshō projectile |
| **073 / 084 / 100** | 今の俺の力だ / この力で! / 俺自身の力 | Down = Hollow Getsuga (dark super) |
| **031 / 077 / 063** | 今の俺の全力だ! / 今の俺なら! / 俺自身の力で | Up = Hollow Rising (dark super) |
| **054 / 163 / 114** | 逃すかよ!当たれ! / 暗いやがれ! / これでも食らえ! | Fwd = Charged Getsuga Slash |
| **148 / 032 / 156** | 吹き食べ! / これでぶっ飛べ! / もらった! | Air = Aerial Getsuga Dive |

## Wired pools


### `getsuga` (3)
- `ichigo_voice_003_t00m03_0s.mp3` — **003** ギュッツガー! — *I'll kill you!*
- `ichigo_voice_039_t01m05_6s.mp3` — **039** 月が転称 — *The month has changed!*
- `ichigo_voice_088_t02m15_1s.mp3` — **088** ケッツガー — *Ketsuga*

### `chargedSlash` (3)
- `ichigo_voice_054_t01m25_1s.mp3` — **054** 逃すかよ!当たれ! — *I won't let you get away from me!*
- `ichigo_voice_114_t02m56_8s.mp3` — **114** これでも食らえ! — *Even now, eat it!*
- `ichigo_voice_163_t04m22_1s.mp3` — **163** 暗いやがれ! — *Eat this!*

### `hollowGetsuga` (3)
- `ichigo_voice_073_t01m50_7s.mp3` — **073** 今の俺の力だ — *It's my power now.*
- `ichigo_voice_084_t02m09_3s.mp3` — **084** この力で! — *With this power!*
- `ichigo_voice_100_t02m35_3s.mp3` — **100** 俺自身の力 — *The power of my own.*

### `hollowRising` (3)
- `ichigo_voice_031_t00m53_6s.mp3` — **031** 今の俺の全力だ! — *This is my full power!*
- `ichigo_voice_063_t01m36_6s.mp3` — **063** 俺自身の力で — *With my own power.*
- `ichigo_voice_077_t01m57_9s.mp3` — **077** 今の俺なら! — *If it's me right now...*

### `airGetsuga` (3)
- `ichigo_voice_032_t00m55_6s.mp3` — **032** これで ふっ ぶっ飛べ! — *Now, let's get out of here!*
- `ichigo_voice_148_t03m52_6s.mp3` — **148** 吹き食べ! — *I'll blow you up!*
- `ichigo_voice_156_t04m10_1s.mp3` — **156** もらった! — *I got it!*

### `zangetsu` (4)
- `ichigo_voice_087_t02m13_5s.mp3` — **087** そこだ! — *There it is!*
- `ichigo_voice_105_t02m43_0s.mp3` — **105** これでどうだ! — *How about this?*
- `ichigo_voice_116_t02m59_4s.mp3` — **116** これでどうだ! 手は抜かれぞ! — *How about this? I won't let you get away with it!*
- `ichigo_voice_158_t04m13_8s.mp3` — **158** 終わらせる! — *I'll finish you!*

### `ultimate` (4)
- `ichigo_voice_046_t01m14_6s.mp3` — **046** ゲッツガーテンション! — *Getsuga Tensho!*
- `ichigo_voice_096_t02m27_4s.mp3` — **096** まじか、こいつで決める! 吹き飛べ! き、切り崩す! — *Are you serious? I'll kill you with this! I'll blow you up! K-Kirikuzus!*
- `ichigo_voice_159_t04m14_8s.mp3` — **159** 月が天使! — *Getsuga Tenshu!*
- `ichigo_voice_166_t04m26_1s.mp3` — **166** この一撃に込める! — *I'll take this blow!*

### `intro` (8)
- `ichigo_voice_000_t00m00_0s.mp3` — **000** さあ — *All right.*
- `ichigo_voice_001_t00m01_3s.mp3` — **001** 始めっか — *Let's get started.*
- `ichigo_voice_021_t00m36_8s.mp3` — **021** 本気で来ねえと怪我すんぜ — *If you don't come seriously, you'll get hurt.*
- `ichigo_voice_038_t01m04_3s.mp3` — **038** かかってこいや — *Come on, let's go.*
- `ichigo_voice_064_t01m38_9s.mp3` — **064** みんなを守るんだよ — *I'll protect you all.*
- `ichigo_voice_067_t01m43_4s.mp3` — **067** あんたを止めに来た — *I've come to stop you.*
- `ichigo_voice_090_t02m18_2s.mp3` — **090** 準備できたか — *Are you ready?*
- `ichigo_voice_127_t03m19_5s.mp3` — **127** こっからは全力だ! — *From here on, I'll do my best!*

### `taunt` (6)
- `ichigo_voice_034_t00m58_5s.mp3` — **034** 意外と大したことねえな — *I've never done anything wrong.*
- `ichigo_voice_044_t01m12_2s.mp3` — **044** 足りないのか — *Is that all there is to it?*
- `ichigo_voice_093_t02m23_3s.mp3` — **093** もう終わりかよ — *Is it already over?*
- `ichigo_voice_101_t02m37_4s.mp3` — **101** どうする — *What are you going to do?*
- `ichigo_voice_112_t02m54_6s.mp3` — **112** こんなもんかよ — *Is it like this?*
- `ichigo_voice_161_t04m19_5s.mp3` — **161** いつまで待たせんだよ — *How long do I have to wait?*

### `combatBark` (8)
- `ichigo_voice_007_t00m09_8s.mp3` — **007** 終わりじゃないぜ! — *It's not over!*
- `ichigo_voice_013_t00m24_5s.mp3` — **013** フッ!遅いぜ、あんた — *Come on! You're too late!*
- `ichigo_voice_035_t01m00_5s.mp3` — **035** これで終わりだ! — *This is the end!*
- `ichigo_voice_086_t02m11_9s.mp3` — **086** 速攻で終わらせるぜ — *I'll finish it in an instant.*
- `ichigo_voice_106_t02m44_6s.mp3` — **106** まだまだ行くぜ! — *I'm still going!*
- `ichigo_voice_122_t03m12_2s.mp3` — **122** 行くぜ! — *Let's go!*
- `ichigo_voice_138_t03m37_7s.mp3` — **138** 行くぜ、もう一度 — *Let's go! One more time!*
- `ichigo_voice_145_t03m49_2s.mp3` — **145** 終わらせてやる — *I'll finish it!*

### `hitReact` (7)
- `ichigo_voice_033_t00m57_2s.mp3` — **033** なんだよ — *What is it?*
- `ichigo_voice_037_t01m02_8s.mp3` — **037** まじか — *Really?*
- `ichigo_voice_057_t01m28_7s.mp3` — **057** 危なかったぜ — *It was dangerous.*
- `ichigo_voice_069_t01m45_6s.mp3` — **069** マジかよ — *Are you serious?*
- `ichigo_voice_111_t02m53_5s.mp3` — **111** なんだ — *What is it?*
- `ichigo_voice_135_t03m32_3s.mp3` — **135** 危ないな — *Watch out!*
- `ichigo_voice_142_t03m44_3s.mp3` — **142** くっそ! — *Damn!*

### `lowHealth` (4)
- `ichigo_voice_061_t01m33_5s.mp3` — **061** こっからが本番だ — *This is the real deal.*
- `ichigo_voice_107_t02m45_9s.mp3` — **107** 止まるわけにはいかねんだ — *I'm not going to stop you.*
- `ichigo_voice_134_t03m30_2s.mp3` — **134** 終わりじゃねえぞ! — *It's not over yet!*
- `ichigo_voice_154_t04m06_6s.mp3` — **154** 何度だって乗り越えてやるさ — *I'll ride it over and over again.*

### `win` (6)
- `ichigo_voice_028_t00m50_0s.mp3` — **028** 終わりにしようぜ — *Let's finish it.*
- `ichigo_voice_041_t01m08_3s.mp3` — **041** 強かったみたいだな — *It seems to have been strong.*
- `ichigo_voice_118_t03m04_5s.mp3` — **118** 次は決めるぜ! — *I'll make a decision next time!*
- `ichigo_voice_152_t04m00_1s.mp3` — **152** 楽しかったぜ — *It was fun.*
- `ichigo_voice_155_t04m08_7s.mp3` — **155** 俺の勝ちな — *It's my victory!*
- `ichigo_voice_157_t04m10_8s.mp3` — **157** 気をつけろよ おっと! もう終わりか! — *Take care of yourself. I did it! Is it over already?*

## Full disposition table (all 167)

| # | dur | JA | EN gloss | disposition |
|---|---|---|---|---|
| 000 | 0.71s | さあ | All right. | WIRED → intro |
| 001 | 0.81s | 始めっか | Let's get started. | WIRED → intro |
| 002 | 0.56s | ガッ! | GAH! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 003 | 1.13s | ギュッツガー! | I'll kill you! | WIRED → getsuga |
| 004 | 2.51s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 005 | 1.26s | 受けきれるかよ | Can you accept it? | HELD |
| 006 | 0.58s | オラヤ! | Let's go! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 007 | 1.16s | 終わりじゃないぜ! | It's not over! | WIRED → combatBark |
| 008 | 0.56s | じゃあ | See you later! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 009 | 1.19s | 進ませてもらうぜ | I'll let you go. | HELD |
| 010 | 1.32s | うまくよけてくれよ | Please take good care of me. | HELD |
| 011 | 0.52s | もう | More. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 012 | 0.87s | 負けねぇよ | I won't lose. | HELD |
| 013 | 1.75s | フッ!遅いぜ、あんた | Come on! You're too late! | WIRED → combatBark |
| 014 | 0.67s | セロッ! | CELLO! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 015 | 0.63s | もっと | More. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 016 | 1.94s | 使いこなせるようにならねえとな | You have to be able to use it. | HELD |
| 017 | 0.54s | まただ | See you later. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 018 | 1.74s | そろそろ蹴りつけようぜ | It's time to sort it out. | HELD |
| 019 | 1.43s | そろそろ頃合いか | It's about time. | HELD |
| 020 | 0.51s | だと | DAD! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 021 | 1.83s | 本気で来ねえと怪我すんぜ | If you don't come seriously, you'll get hurt. | WIRED → intro |
| 022 | 0.82s | シクシャ! | Damn it! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 023 | 2.08s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 024 | 1.97s | 強ぇなぁ やべっ ぜっ | Damn it! Stop it! Damn it! | HELD |
| 025 | 2.76s | うわっ! 反応すんのかよ! 寝てろ! | Whoa! Are you going to react? Go to sleep! | HELD |
| 026 | 0.95s | 引っかかったな | That was a good one. | HELD |
| 027 | 1.72s | 聞かねえよ | I can't hear you | HELD |
| 028 | 1.18s | 終わりにしようぜ | Let's finish it. | WIRED → win |
| 029 | 0.61s | 待てよ | Wait! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 030 | 0.74s | こいつが | This guy... | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 031 | 1.86s | 今の俺の全力だ! | This is my full power! | WIRED → hollowRising |
| 032 | 1.51s | これで ふっ ぶっ飛べ! | Now, let's get out of here! | WIRED → airGetsuga |
| 033 | 0.80s | なんだよ | What is it? | WIRED → hitReact |
| 034 | 1.70s | 意外と大したことねえな | I've never done anything wrong. | WIRED → taunt |
| 035 | 1.24s | これで終わりだ! | This is the end! | WIRED → combatBark |
| 036 | 0.71s | ウェストだろ! | That's right! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 037 | 1.34s | まじか | Really? | WIRED → hitReact |
| 038 | 0.95s | かかってこいや | Come on, let's go. | WIRED → intro |
| 039 | 1.10s | 月が転称 | The month has changed! | WIRED → getsuga |
| 040 | 1.00s | 俺の方が | It's my turn. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 041 | 1.26s | 強かったみたいだな | It seems to have been strong. | WIRED → win |
| 042 | 0.90s | あ! 行くぜ | Let's go! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 043 | 0.65s | まだ? | Not yet? | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 044 | 0.98s | 足りないのか | Is that all there is to it? | WIRED → taunt |
| 045 | 0.51s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 046 | 2.17s | ゲッツガーテンション! | Getsuga Tensho! | WIRED → ultimate |
| 047 | 0.75s | 決めるぜ! | I'll figure it out! | HELD |
| 048 | 1.05s | やるじゃねーか! | I'll do it! | HELD |
| 049 | 0.65s | シッ! フッ | C'ya! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 050 | 0.67s | 終わりな | I'm sorry. | HELD |
| 051 | 1.63s | だらっ! どこを見てんだ? | What are you looking at? | HELD |
| 052 | 0.57s | あれ | Sorry. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 053 | 1.30s | そこ通してくねえか | I'm not going to go through that. | HELD |
| 054 | 1.72s | 逃すかよ!当たれ! | I won't let you get away from me! | WIRED → chargedSlash |
| 055 | 0.55s | よし | All right. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 056 | 0.53s | いくか | Let's go. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 057 | 0.97s | 危なかったぜ | It was dangerous. | WIRED → hitReact |
| 058 | 1.03s | なかなかやるな | I'm pretty good at this. | HELD |
| 059 | 1.20s | ケレッキザン! | Kiriti-san! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 060 | 0.67s | 待てよ | Wait! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 061 | 1.34s | こっからが本番だ | This is the real deal. | WIRED → lowHealth |
| 062 | 0.59s | 俺が | I'll do it. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 063 | 1.53s | 俺自身の力で | With my own power. | WIRED → hollowRising |
| 064 | 1.35s | みんなを守るんだよ | I'll protect you all. | WIRED → intro |
| 065 | 0.97s | 予断するのよ | Don't hesitate. | HELD |
| 066 | 1.45s | ちっ! 黒いやれ! | I'm gonna eat you! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 067 | 1.28s | あんたを止めに来た | I've come to stop you. | WIRED → intro |
| 068 | 0.60s | なり! | NERI | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 069 | 0.73s | マジかよ | Are you serious? | WIRED → hitReact |
| 070 | 0.52s | たく | Thank you. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 071 | 1.10s | 骨が折れるぜ | I can break your bones. | HELD |
| 072 | 0.68s | これが | This is... | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 073 | 1.39s | 今の俺の力だ | It's my power now. | WIRED → hollowGetsuga |
| 074 | 1.87s | で、当てる!うっ、こっちだぜ! | I'll hit you! Ugh! This is it! | HELD |
| 075 | 1.91s | キッ!構いを緩めるなよ | Don't let your guard down. | HELD |
| 076 | 0.51s | 行くぜ | Let's go! | HELD |
| 077 | 1.11s | 今の俺なら! | If it's me right now... | WIRED → hollowRising |
| 078 | 1.83s | 見せてやるよ! | I'll show you! | HELD |
| 079 | 1.84s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 080 | 1.42s | 怪我したくなかったら | If you don't want to get hurt... | HELD |
| 081 | 0.71s | 離れてろ | Get out of here! | HELD |
| 082 | 0.87s | 設計する! | I'll make it! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 083 | 1.69s | 余計な時間くっちばったな | It's been a long time since I've had a bite. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 084 | 1.08s | この力で! | With this power! | WIRED → hollowGetsuga |
| 085 | 0.70s | バリナ | Marina | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 086 | 1.41s | 速攻で終わらせるぜ | I'll finish it in an instant. | WIRED → combatBark |
| 087 | 1.45s | そこだ! | There it is! | WIRED → zangetsu |
| 088 | 0.74s | ケッツガー | Ketsuga | WIRED → getsuga |
| 089 | 1.91s | スーティスター! | SUZUKI SHO! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 090 | 1.12s | 準備できたか | Are you ready? | WIRED → intro |
| 091 | 2.81s | 余裕だなぁ 全力で行くぜ! | That's a relief. I'll do my best! | HELD |
| 092 | 0.51s | おい | Oh. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 093 | 1.10s | もう終わりかよ | Is it already over? | WIRED → taunt |
| 094 | 1.48s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 095 | 0.55s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 096 | 3.78s | まじか、こいつで決める! 吹き飛べ! き、切り崩す! | Are you serious? I'll kill you with this! I'll blow you up! K-Kirikuzus! | WIRED → ultimate |
| 097 | 1.15s | 俺の勝ちだな | It's my win. | DISCARD — near-dup of 155 『俺の勝ちな』(win) |
| 098 | 0.83s | ケガスンザ | He is the order. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 099 | 0.62s | これが | This is... | DISCARD — 『これが』fragment — dup of 100-family |
| 100 | 1.37s | 俺自身の力 | The power of my own. | WIRED → hollowGetsuga |
| 101 | 0.57s | どうする | What are you going to do? | WIRED → taunt |
| 102 | 0.86s | もう一回やるか | Let's do it one more time | HELD |
| 103 | 1.56s | 俺の力で | With my power | DISCARD — 『俺の力で』— dup of 100 (wired, hollowGetsuga) |
| 104 | 1.42s | 思ったよりやるじゃないか | It's better than I thought. | HELD |
| 105 | 1.48s | これでどうだ! | How about this? | WIRED → zangetsu |
| 106 | 1.11s | まだまだ行くぜ! | I'm still going! | WIRED → combatBark |
| 107 | 1.56s | 止まるわけにはいかねんだ | I'm not going to stop you. | WIRED → lowHealth |
| 108 | 0.88s | もう二度だ | It's already the second time. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 109 | 1.88s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 110 | 1.49s | 肩鳴らしにはなったな | It's a piece of cake. | HELD |
| 111 | 0.66s | なんだ | What is it? | WIRED → hitReact |
| 112 | 0.91s | こんなもんかよ | Is it like this? | WIRED → taunt |
| 113 | 0.87s | 正規か | Are you out of your mind? | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 114 | 1.19s | これでも食らえ! | Even now, eat it! | WIRED → chargedSlash |
| 115 | 1.05s | 余裕やそうだな | Looks like we can do it. | HELD |
| 116 | 2.03s | これでどうだ! 手は抜かれぞ! | How about this? I won't let you get away with it! | WIRED → zangetsu |
| 117 | 1.38s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 118 | 1.34s | 次は決めるぜ! | I'll make a decision next time! | WIRED → win |
| 119 | 2.40s | 次の従事者! | Kitsuge jujutsu! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 120 | 2.41s | こっから先は手加減できねえぞ | I can't get out of here. | HELD |
| 121 | 1.03s | しっきりなおした | I'll fix it! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 122 | 0.78s | 行くぜ! | Let's go! | WIRED → combatBark |
| 123 | 1.00s | サンゲス! | SANGUS! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 124 | 1.49s | 好きだらけだ! | I love you! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 125 | 1.31s | 次で決める! | I'll make a decision next time! | DISCARD — 『次で決める』— dup of 118 (wired, win) |
| 126 | 1.78s | ようやくお目覚めかよ | Are you finally awake? | HELD |
| 127 | 1.63s | こっからは全力だ! | From here on, I'll do my best! | WIRED → intro |
| 128 | 0.92s | やってみるか | Let's do this | HELD |
| 129 | 0.78s | 叶えろよ | Get out of here! | HELD |
| 130 | 1.03s | よーせっつーな | I'm sorry. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 131 | 3.37s | こっちか、ついてこられるか | It's hot! Is it this way? Can you follow me? | HELD |
| 132 | 0.61s | うっし! | Yes! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 133 | 1.04s | 初めてもいいか | It doesn't matter if it's the first time. | HELD |
| 134 | 1.13s | 終わりじゃねえぞ! | It's not over yet! | WIRED → lowHealth |
| 135 | 0.83s | 危ないな | Watch out! | WIRED → hitReact |
| 136 | 1.18s | あったまってきたぜ | I've come to my senses. | HELD |
| 137 | 0.85s | ダメだったか | Was that a no? | HELD |
| 138 | 1.38s | 行くぜ、もう一度 | Let's go! One more time! | WIRED → combatBark |
| 139 | 0.88s | 見せてやるよ | I'll show you. | DISCARD — 『見せてやるよ』— dup of 78 (held) |
| 140 | 0.57s | 俺の | My... | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 141 | 1.44s | 俺自身の力を | The power of my own. | DISCARD — 『俺自身の力を』— dup of 63 (wired, hollowRising) |
| 142 | 0.51s | くっそ! | Damn! | WIRED → hitReact |
| 143 | 2.05s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 144 | 0.68s | アメナ | Amen. | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 145 | 1.02s | 終わらせてやる | I'll finish it! | WIRED → combatBark |
| 146 | 0.60s | こんな | What the- | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 147 | 0.96s | ところで | By the way... | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 148 | 0.65s | 吹き食べ! | I'll blow you up! | WIRED → airGetsuga |
| 149 | 2.35s | — | — | DISCARD — non-speech / silent (VAD empty both passes) |
| 150 | 2.90s | せらぬけ! そう簡単にはやらせねえぞ | Get out of my way! I won't let you do it so easily. | HELD |
| 151 | 0.59s | ジェナ | Jenna! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 152 | 0.85s | 楽しかったぜ | It was fun. | WIRED → win |
| 153 | 4.73s | 終わりだ! 覚悟はできてっか ふっ、負けるわけにはいかねんだ | It's over! Are you ready? I can't lose! | HELD |
| 154 | 1.87s | 何度だって乗り越えてやるさ | I'll ride it over and over again. | WIRED → lowHealth |
| 155 | 1.20s | 俺の勝ちな | It's my victory! | WIRED → win |
| 156 | 0.56s | もらった! | I got it! | WIRED → airGetsuga |
| 157 | 2.82s | 気をつけろよ おっと! もう終わりか! | Take care of yourself. I did it! Is it over already? | WIRED → win |
| 158 | 0.89s | 終わらせる! | I'll finish you! | WIRED → zangetsu |
| 159 | 2.98s | 月が天使! | Getsuga Tenshu! | WIRED → ultimate |
| 160 | 0.73s | たーく | So | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 161 | 1.60s | いつまで待たせんだよ | How long do I have to wait? | WIRED → taunt |
| 162 | 0.63s | 動くな! | Don't move! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 163 | 0.78s | 暗いやがれ! | Eat this! | WIRED → chargedSlash |
| 164 | 0.62s | 別途だろ | That's it! | DISCARD — unintelligible grunt / garbled noise / single-word filler-fragment |
| 165 | 1.33s | 力のすべてを | I will do everything I can. | HELD |
| 166 | 1.81s | この一撃に込める! | I'll take this blow! | WIRED → ultimate |
