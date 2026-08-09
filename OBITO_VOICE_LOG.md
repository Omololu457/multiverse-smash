# Obito Uchiha — Voice Line Log

Source: **192** clips `obito_voice_*.mp3` (Japanese, Storm Connections rip). Transcribed via
`tools/transcribe_obito.py` (faster-whisper `small`, 2-pass: native-JA + English gloss) → `obito_raw_transcript.tsv`.
**Wired: 65**  ·  **Discarded: 127** (named-character 22 · non-speech 4 · 101 fragments/near-duplicates/low-value).

Audio-only — ZERO gameplay effect. Filenames preserved exactly. Playback via `sound.playSfxFile(clip, null)`,
single-voice-channel gated by `sound._voiceOwner` + the shared `_atkVoiceCd`/`_hitVoiceCd` cooldowns.

## §match — technique-callout mapping (cross-referenced against his BUILT kit)

| Callout found | Clips | Wired to (built move) |
|---|---|---|
| **Kamui** 神威/カムイ | 001 "やるぞ! カムイ!" | `kamuiActivate` (Kamui Intangibility toggle) + the space-time "I'll take/send you" lines → `kamuiWarp` (self-portal / teleport-grab / teleport-behind) |
| **Ten-Tails / Juubi / Six-Paths** 十尾・陸道 | 131 "ジュウリンの時間だ" (Juubi's time) · 083 "これが陸道の力だ!" · 129 (gained Six-Paths power) · 082 (this power) | `juubi` (Ten-Tails Bijūdama ULTIMATE) |
| **Mokuton** 木遁 | — none in the set — | (his Mokuton is Juubi-cinematic FX only; no dedicated callout found, so none wired) |

The Kamui + Juubi/Six-Paths matches are the direct wins (same as Chrollo "Skill Hunter" / Gold Ranger "switch").
No line references Mokuton, so no Mokuton pool exists (correctly reported, not fabricated).

## Pools (wired)

### `kamuiActivate` — ★ KAMUI INTANGIBILITY ACTIVATION (toggleObitoKamui — abilities.js; ON only, silent off)
- `obito_voice_001_t00m01_9s.mp3` — やるぞ! カムイ!  *( I'll do it! Kamui! )*
- `obito_voice_018_t01m05_2s.mp3` — 俺が案内してやる  *( I'll guide you. )*
- `obito_voice_005_t00m24_7s.mp3` — 次に目にするのは  *( The next thing I'm going to do is... )*

### `kamuiWarp` — ★ KAMUI WARP — self-portal / teleport-grab / teleport-behind (abilities.js)
- `obito_voice_007_t00m29_6s.mp3` — お前も連れて行ってやる  *( I'll take you with me. )*
- `obito_voice_013_t00m52_4s.mp3` — 悔やむことのない世界に連れて行ってやる 今の俺は  *( I'll take you to a world where you'll never regret. Now I am... )*
- `obito_voice_019_t01m07_3s.mp3` — 無限に続く夢の入り口にな  *( Go to the entrance of the dream that continues without a limit. )*
- `obito_voice_023_t01m14_3s.mp3` — 夢の世界へ導いてやる  *( I will guide you to the world of dreams. )*
- `obito_voice_031_t01m34_6s.mp3` — 音瓶に送ってやろうと思っていたのだがな 俺はもう人ではない  *( I was thinking of sending it to a guest But I'm not human anymore )*
- `obito_voice_016_t01m01_8s.mp3` — 無駄な抵抗  *( Useless resistance. )*

### `special` — SPECIAL CAST — shuriken / rod / giant-shuriken throws (abilities.js)
- `obito_voice_003_t00m08_0s.mp3` — 絶望を味わえ! はじめようか 消えろ! ぬぼこの剣!  *( Taste despair! Let's begin! Disappear! Nobokoro KENPEN! )*
- `obito_voice_087_t04m56_3s.mp3` — あきらめろ!  *( Give up! )*
- `obito_voice_097_t05m24_1s.mp3` — 俺の邪魔をするなー!  *( Don't get in my way! )*
- `obito_voice_084_t04m47_4s.mp3` — フルエロー  *( Shut up! )*
- `obito_voice_144_t07m24_6s.mp3` — 思いの強さが剣にあどる  *( The strength of my mind goes to the sword. )*
- `obito_voice_191_t09m15_9s.mp3` — 前!前!  *( In front! In front! )*

### `juubi` — ★ JUUBI / TEN-TAILS ULTIMATE — Bijūdama (executeObitoUltimate — abilities.js)
- `obito_voice_131_t06m47_7s.mp3` — いいだろう ここからは ジュウリンの時間だ  *( That's good. This is the time of the forest. )*
- `obito_voice_129_t06m42_6s.mp3` — 陸道の力を手に入れた俺に  *( I've got the power of a rickshaw! )*
- `obito_voice_083_t04m43_8s.mp3` — 知れ!これが陸道の力だ!  *( Die! This is the power of Rikudo! )*
- `obito_voice_082_t04m40_1s.mp3` — この力の前では、お前たちの抵抗など  *( In front of this power, your resistance and so on... )*
- `obito_voice_068_t04m01_6s.mp3` — ウオォォォォォォォォォアォォォォ! この世界に  *( WAAAAAAA In this world )*
- `obito_voice_008_t00m32_1s.mp3` — 無限つくよみの世界にな この世界に希望はない  *( In the endless world of reading, there is no hope in this world. )*
- `obito_voice_038_t01m59_8s.mp3` — 終わらせる! 己の無力さを呪うがいい  *( I'll finish you! I'll ride on your helplessness! )*

### `intro` — INTRO / self-declaration (fires on the intro beat; combined with taunt in game.js)
- `obito_voice_164_t08m16_3s.mp3` — 俺はウチハオビトを捨てた  *( I threw away Uchiha Obito! )*
- `obito_voice_048_t03m00_4s.mp3` — 第2の陸道戦人だ! あんたは誰も救えない 俺は俺の手で  *( It's the second You can't save anyone I'll do it )*
- `obito_voice_049_t03m06_3s.mp3` — 世界を救う! 俺はそちら側に行くことはない  *( Save the world! I will never go that way. )*
- `obito_voice_109_t05m51_4s.mp3` — 俺は第2の陸道戦人だ  *( I'm the second one to leave. )*
- `obito_voice_033_t01m43_9s.mp3` — 俺はもう人ではない  *( I'm not human anymore. )*
- `obito_voice_024_t01m16_6s.mp3` — はじめようか  *( Let's get started! )*
- `obito_voice_026_t01m21_3s.mp3` — 俺はこの世界に絶望するお前を見てみたい  *( I want to see you despair in this world )*
- `obito_voice_112_t05m58_2s.mp3` — 選ばれたもの!  *( The chosen one! )*

### `taunt` — TAUNT (mid-fight jeers; folded into the intro pool)
- `obito_voice_017_t01m03_7s.mp3` — ご苦労だったな  *( Thank you for your hard work. )*
- `obito_voice_071_t04m13_9s.mp3` — なぜここまで抵抗する?  *( Why do you resist so far? )*
- `obito_voice_079_t04m32_1s.mp3` — まだ立てつくか  *( Are you going to stand still? )*
- `obito_voice_169_t08m25_3s.mp3` — まだ抵抗するか  *( Are you still going to resist? )*
- `obito_voice_172_t08m29_1s.mp3` — もう諦めたわけじゃないだろうな  *( I don't think I've given up. )*
- `obito_voice_121_t06m21_9s.mp3` — 遅すぎやしないか  *( Don't be too late. )*
- `obito_voice_128_t06m40_3s.mp3` — お前はなぜ現実を見ない  *( Why don't you see the reality? )*
- `obito_voice_142_t07m21_1s.mp3` — なぜ戦う?  *( Why do you fight? )*
- `obito_voice_025_t01m18_6s.mp3` — 最も結果は分かりきっているがな  *( I wonder if the result is the most clear. )*

### `combatBark` — COMBAT BARK (offense on a heavy / long-string connect — combat.js)
- `obito_voice_096_t05m20_0s.mp3` — 消えろー!  *( SHIT! )*
- `obito_voice_086_t04m54_3s.mp3` — この世はもう終わりだ!  *( This world is over! )*
- `obito_voice_085_t04m48_7s.mp3` — そして怯えるがいい! しつくいやつだ! お前らでは俺に届かん!  *( And don't be afraid! You're a tough guy! You won't get away with me! )*
- `obito_voice_146_t07m29_0s.mp3` — もうお前らは俺に勝てん!  *( You won't win against me anymore! )*
- `obito_voice_152_t07m37_0s.mp3` — 俺が!この俺が!  *( It's me! It's me! )*
- `obito_voice_094_t05m14_7s.mp3` — もう眠り!俺の邪魔をするな!  *( I can't sleep anymore! Don't get in my way! )*
- `obito_voice_104_t05m37_7s.mp3` — うらちゃらた!この俺の力を…  *( Uracharata, this power of mine... )*

### `hitReact` — HIT REACTION (taking damage — combat.js)
- `obito_voice_090_t05m01_5s.mp3` — 心がざわつく!  *( My heart is throbbing. )*
- `obito_voice_091_t05m04_6s.mp3` — 何なのだ!?  *( What the hell is this? )*
- `obito_voice_106_t05m45_1s.mp3` — そんなことあってたまるか! なんなんだ  *( Is that what you're talking about? What is it? )*
- `obito_voice_147_t07m31_4s.mp3` — ブゥーッ  *( Eugh! )*
- `obito_voice_148_t07m32_2s.mp3` — なぜ?  *( Why? )*
- `obito_voice_088_t04m57_3s.mp3` — なんだ、やつを  *( What the hell is this guy? )*
- `obito_voice_171_t08m27_8s.mp3` — まさか  *( I can't believe it! )*
- `obito_voice_170_t08m27_0s.mp3` — どうした?  *( What's wrong? )*
- `obito_voice_056_t03m29_4s.mp3` — こいつは  *( What is this guy? )*

### `lowHealth` — LOW HEALTH (once, crossing the ≤25% line — combat.js)
- `obito_voice_055_t03m25_4s.mp3` — もう終わっている まだ負けては終わらん なんなんだ  *( It's already over! I still can't lose! What is it? )*
- `obito_voice_057_t03m31_1s.mp3` — なぜ倒れない!  *( Why can't I get down? )*
- `obito_voice_076_t04m24_1s.mp3` — もう終わっている! もうじきつぼみが開く  *( It's already over! The Moujiki Tsubomi will open! )*
- `obito_voice_093_t05m09_8s.mp3` — この俺は止められん! 幼稚な忍びが…  *( I won't be able to stop this! Youchina shinobi ga... )*

### `win` — WIN LINE (victory — game.js)
- `obito_voice_015_t00m59_4s.mp3` — これで終戦だ  *( This is the end of the game. )*
- `obito_voice_077_t04m27_5s.mp3` — その時点で世界は終わりだ!  *( That's the end of the world! )*
- `obito_voice_012_t00m45_7s.mp3` — お前が何を期待したかは知らないが これが現実だ そのままでいい  *( I don't know what you expected, but this is the reality. Just as it is. )*
- `obito_voice_156_t07m50_3s.mp3` — それ以上だ 平和を実現できるのだからな  *( That's all. Because you can realize peace. )*
- `obito_voice_044_t02m41_7s.mp3` — 終わらせる!これで平和を実現できるこの現実には  *( I will finish you! Now I can realize peace! In this reality... )*
- `obito_voice_043_t02m36_9s.mp3` — お前ももう苦しまなくていい この世界は  *( You don't have to suffer anymore. This world is... )*

## Full transcript (all 192 — disposition)

| # | dur | JA | EN gloss | disposition |
|---|---|---|---|---|
| 000 | 1.8 | 仕封じるなよ 欠かしい | Don't let your guard down, Kakashi! | discard: names another character |
| 001 | 1.6 | やるぞ! カムイ! | I'll do it! Kamui! | → **kamuiActivate** |
| 002 | 3.4 | ふん、あんたらしいな 口寄せ、準備! | Hmm, you're a newbie. Shut up! Get ready! | discard: fragment / near-dup |
| 003 | 5.2 | 絶望を味わえ! はじめようか 消えろ! ぬぼこの剣! | Taste despair! Let's begin! Disappear! Nobokoro KENP | → **special** |
| 004 | 2.4 | お前のすがっている希望など | I'm hoping for you. | discard: fragment / near-dup |
| 005 | 1.6 | 次に目にするのは | The next thing I'm going to do is... | → **kamuiActivate** |
| 006 | 2.5 | 夢のうつつだ 安心しろ | It's a dream. Don't worry. | discard: fragment / near-dup |
| 007 | 1.5 | お前も連れて行ってやる | I'll take you with me. | → **kamuiWarp** |
| 008 | 3.8 | 無限つくよみの世界にな この世界に希望はない | In the endless world of reading, there is no hope in | → **juubi** |
| 009 | 1.0 | あるのはただ | There's only one way to do it. | discard: fragment / near-dup |
| 010 | 3.6 | 憎しみだけだ 思いも願いも全てはうつろう | — | discard: fragment / near-dup |
| 011 | 3.2 | そんなものに捕らわれては何も成すことはできない | I can't do anything if I'm captured by something lik | discard: fragment / near-dup |
| 012 | 5.8 | お前が何を期待したかは知らないが これが現実だ そのままでいい | I don't know what you expected, but this is the real | → **win** |
| 013 | 4.0 | 悔やむことのない世界に連れて行ってやる 今の俺は | I'll take you to a world where you'll never regret.  | → **kamuiWarp** |
| 014 | 2.3 | お前の常識ではかれはしない | I will not measure it with your common sense. | discard: fragment / near-dup |
| 015 | 1.4 | これで終戦だ | This is the end of the game. | → **win** |
| 016 | 1.3 | 無駄な抵抗 | Useless resistance. | → **kamuiWarp** |
| 017 | 1.4 | ご苦労だったな | Thank you for your hard work. | → **taunt** |
| 018 | 1.4 | 俺が案内してやる | I'll guide you. | → **kamuiActivate** |
| 019 | 2.5 | 無限に続く夢の入り口にな | Go to the entrance of the dream that continues witho | → **kamuiWarp** |
| 020 | 1.0 | 痛みはない | There is no pain. | discard: fragment / near-dup |
| 021 | 1.0 | エッションで終わる | This is the end of the hour. | discard: fragment / near-dup |
| 022 | 0.9 | 月夜の | Tsukiyono | discard: fragment / near-dup |
| 023 | 2.2 | 夢の世界へ導いてやる | I will guide you to the world of dreams. | → **kamuiWarp** |
| 024 | 1.1 | はじめようか | Let's get started! | → **intro** |
| 025 | 2.5 | 最も結果は分かりきっているがな | I wonder if the result is the most clear. | → **taunt** |
| 026 | 3.9 | 俺はこの世界に絶望するお前を見てみたい | I want to see you despair in this world | → **intro** |
| 027 | 1.1 | じっとしてよ | I'm jealous of you. | discard: fragment / near-dup |
| 028 | 0.9 | お前は | You are... | discard: fragment / near-dup |
| 029 | 1.9 | 十分耐えしのんだ | That's enough. | discard: fragment / near-dup |
| 030 | 1.0 | できる限り | As long as possible. | discard: fragment / near-dup |
| 031 | 4.6 | 音瓶に送ってやろうと思っていたのだがな 俺はもう人ではない | I was thinking of sending it to a guest But I'm not  | → **kamuiWarp** |
| 032 | 3.7 | 次の段階へと、人々を導くもの | to the next stage and to guide people. | discard: fragment / near-dup |
| 033 | 1.7 | 俺はもう人ではない | I'm not human anymore. | → **intro** |
| 034 | 3.6 | 次の段階へと人々を導くもの | To the next stage and to guide people. | discard: fragment / near-dup |
| 035 | 1.0 | できる限り | As long as you can. | discard: fragment / near-dup |
| 036 | 5.9 | 音瓶に送ってやろうと思っていたのだがな お前のすがっている希望など存在しない | I was thinking of sending it to Onbin, but I don't h | discard: fragment / near-dup |
| 037 | 1.3 | この世界は | This world... | discard: fragment / near-dup |
| 038 | 3.5 | 終わらせる! 己の無力さを呪うがいい | I'll finish you! I'll ride on your helplessness! | → **juubi** |
| 039 | 4.3 | 月の目計画は必ず上述させる 強盗家 | The Moon's eye plan will definitely improve. Kyo Tou | discard: fragment / near-dup |
| 040 | 1.9 | もうどうでもいいんだよ | I don't care anymore. | discard: fragment / near-dup |
| 041 | 1.0 | かかしい | It's a shame. | discard: fragment / near-dup |
| 042 | 1.1 | もういいんだ | It's fine now. | discard: fragment / near-dup |
| 043 | 3.9 | お前ももう苦しまなくていい この世界は | You don't have to suffer anymore. This world is... | → **win** |
| 044 | 4.9 | 終わらせる!これで平和を実現できるこの現実には | I will finish you! Now I can realize peace! In this  | → **win** |
| 045 | 3.3 | 残すに値するものは何もない! もう | There's nothing left to be left to be left to be giv | discard: fragment / near-dup |
| 046 | 1.1 | じっとしていろ | Keep it up! | discard: fragment / near-dup |
| 047 | 5.3 | 十分耐えしのんだ 俺は次の段階へ人々を導くもの | I've had enough. I will lead people to the next stag | discard: fragment / near-dup |
| 048 | 5.3 | 第2の陸道戦人だ! あんたは誰も救えない 俺は俺の手で | It's the second You can't save anyone I'll do it | → **intro** |
| 049 | 3.9 | 世界を救う! 俺はそちら側に行くことはない | Save the world! I will never go that way. | → **intro** |
| 050 | 3.8 | 今までの道に後悔もない 夢のためなら | There is no regret on the road so far. For the sake  | discard: fragment / near-dup |
| 051 | 4.2 | 俺はシュラを歩む、もはや無限つくよみ発動まで | I will lead the Shura to the beginning of the infini | discard: fragment / near-dup |
| 052 | 1.3 | 時間の問題だ! | It's a matter of time! | discard: fragment / near-dup |
| 053 | 1.7 | お前たちの戦争は | Your war is... | discard: fragment / near-dup |
| 054 | 0.8 | 事実! | The truth! | discard: fragment / near-dup |
| 055 | 3.8 | もう終わっている まだ負けては終わらん なんなんだ | It's already over! I still can't lose! What is it? | → **lowHealth** |
| 056 | 0.9 | こいつは | What is this guy? | → **hitReact** |
| 057 | 1.2 | なぜ倒れない! | Why can't I get down? | → **lowHealth** |
| 058 | 1.0 | できる限り | As long as possible. | discard: fragment / near-dup |
| 059 | 4.6 | 温瓶に送ってやろうと思っていたのだがな 俺はもう人ではない | I was thinking of sending it to a guest, but I'm not | discard: fragment / near-dup |
| 060 | 3.7 | 次の段階へと、人々を導くもの | To the next stage and to guide people | discard: fragment / near-dup |
| 061 | 2.3 | 俺の死がほかげでよかったよ | I'm glad my death was a blessing. | discard: fragment / near-dup |
| 062 | 2.4 | おかげで、おかげを諦められた | Thanks to you, I was able to give up my shadow. | discard: fragment / near-dup |
| 063 | 1.0 | 痛みはない | There is no pain. | discard: fragment / near-dup |
| 064 | 1.0 | エッションで終わる | This is one of the hours. | discard: fragment / near-dup |
| 065 | 1.6 | これから始まるのは | This is where it all starts. | discard: fragment / near-dup |
| 066 | 3.9 | 絶望の道、俺はそちら側に行くことはない | The path of despair. I will never go that way. | discard: fragment / near-dup |
| 067 | 2.5 | 今までの道に後悔もない | There is no regret in the path so far. | discard: fragment / near-dup |
| 068 | 3.1 | ウオォォォォォォォォォアォォォォ! この世界に | WAAAAAAA In this world | → **juubi** |
| 069 | 5.2 | もはや道など存在しない いい加減、諦めをしれ! しぃ | I won't be able to find a way out as soon as possibl | discard: fragment / near-dup |
| 070 | 2.3 | ウロチョロト、まだ立つか | Urochiro and Tatsuka are still here! | discard: fragment / near-dup |
| 071 | 2.0 | なぜここまで抵抗する? | Why do you resist so far? | → **taunt** |
| 072 | 2.4 | もはや無限つくよみ発動まで | It's too early to do anything without a limit! | discard: fragment / near-dup |
| 073 | 1.3 | 時間の問題だ | It's a matter of time! | discard: fragment / near-dup |
| 074 | 1.6 | お前たちの戦争は | Your war is... | discard: fragment / near-dup |
| 075 | 0.8 | 事実! | The truth! | discard: fragment / near-dup |
| 076 | 3.3 | もう終わっている! もうじきつぼみが開く | It's already over! The Moujiki Tsubomi will open! | → **lowHealth** |
| 077 | 2.3 | その時点で世界は終わりだ! | That's the end of the world! | → **win** |
| 078 | 1.4 | 時間はもうないぞ! | There's no more time! | discard: fragment / near-dup |
| 079 | 1.5 | まだ立てつくか | Are you going to stand still? | → **taunt** |
| 080 | 1.4 | 渦巻きになると | UZUMA KINARUTO! | discard: names another character |
| 081 | 1.4 | ジライアか! | Jiraiya, huh? | discard: names another character |
| 082 | 3.5 | この力の前では、お前たちの抵抗など | In front of this power, your resistance and so on... | → **juubi** |
| 083 | 2.6 | 知れ!これが陸道の力だ! | Die! This is the power of Rikudo! | → **juubi** |
| 084 | 0.8 | フルエロー | Shut up! | → **special** |
| 085 | 5.5 | そして怯えるがいい! しつくいやつだ! お前らでは俺に届かん! | And don't be afraid! You're a tough guy! You won't g | → **combatBark** |
| 086 | 1.8 | この世はもう終わりだ! | This world is over! | → **combatBark** |
| 087 | 0.8 | あきらめろ! | Give up! | → **special** |
| 088 | 1.3 | なんだ、やつを | What the hell is this guy? | → **hitReact** |
| 089 | 1.1 | なるとを見ると | Look at Naruto! | discard: names another character |
| 090 | 2.3 | 心がざわつく! | My heart is throbbing. | → **hitReact** |
| 091 | 1.2 | 何なのだ!? | What the hell is this? | → **hitReact** |
| 092 | 2.8 | この感情はお前たちごときに | This feeling is for you guys! | discard: fragment / near-dup |
| 093 | 3.6 | この俺は止められん! 幼稚な忍びが… | I won't be able to stop this! Youchina shinobi ga... | → **lowHealth** |
| 094 | 3.1 | もう眠り!俺の邪魔をするな! | I can't sleep anymore! Don't get in my way! | → **combatBark** |
| 095 | 2.0 | ただのしのびごときが | It's time for you to die! | discard: fragment / near-dup |
| 096 | 4.1 | 消えろー! | SHIT! | → **combatBark** |
| 097 | 3.9 | 俺の邪魔をするなー! | Don't get in my way! | → **special** |
| 098 | 1.3 | — | — | discard: non-speech |
| 099 | 1.4 | あれを耐え切る | I'll take care of that. | discard: fragment / near-dup |
| 100 | 0.8 | だと | That's it! | discard: fragment / near-dup |
| 101 | 1.0 | — | — | discard: non-speech |
| 102 | 0.9 | はっはっはっ | Ha ha! | discard: fragment / near-dup |
| 103 | 0.6 | — | — | discard: non-speech |
| 104 | 3.1 | うらちゃらた!この俺の力を… | Uracharata, this power of mine... | → **combatBark** |
| 105 | 2.6 | 超えるというのか、そんなこと | Do you mean to say that you can surpass me? | discard: fragment / near-dup |
| 106 | 3.1 | そんなことあってたまるか! なんなんだ | Is that what you're talking about? What is it? | → **hitReact** |
| 107 | 1.0 | こいつは | He's wrong! | discard: fragment / near-dup |
| 108 | 1.2 | なぜ倒れない! | Why can't I fall? | discard: fragment / near-dup |
| 109 | 2.2 | 俺は第2の陸道戦人だ | I'm the second one to leave. | → **intro** |
| 110 | 1.6 | 夢の世界を作り | To create a world of dreams. | discard: fragment / near-dup |
| 111 | 1.9 | 人を案ねえと導く | I will guide you to humanity. | discard: fragment / near-dup |
| 112 | 1.2 | 選ばれたもの! | The chosen one! | → **intro** |
| 113 | 3.8 | ほかげなど今の俺に関係ない! | It has nothing to do with me right now! | discard: fragment / near-dup |
| 114 | 1.0 | 仲間! | NAKAMA! | discard: fragment / near-dup |
| 115 | 2.7 | 俺が生きていたかどうかなんてのは | I don't know if I was alive. | discard: fragment / near-dup |
| 116 | 2.2 | どうでも良いことだ。しかし… | It doesn't matter, however... | discard: fragment / near-dup |
| 117 | 1.0 | そうだな | That's right. | discard: fragment / near-dup |
| 118 | 3.8 | なぜかと会えて問うなら、お前がリンを | If you meet him for some reason, you'll be Rin. | discard: names another character |
| 119 | 1.6 | 見殺しにしたから | I'm going to kill you! | discard: names another character |
| 120 | 2.4 | だろうな、今更説教か | I wonder if that's how it is. | discard: fragment / near-dup |
| 121 | 1.6 | 遅すぎやしないか | Don't be too late. | → **taunt** |
| 122 | 2.5 | 先生、俺の死でありながら | Teacher, it's my death. | discard: names another character |
| 123 | 1.9 | 俺に気づきもしなかった | He didn't even notice me. | discard: fragment / near-dup |
| 124 | 1.6 | 初戦そんなもんだ | That's how it is in the first place. | discard: fragment / near-dup |
| 125 | 1.1 | 結局のところ | In the end... | discard: fragment / near-dup |
| 126 | 2.0 | あんたの歩んだ道は | The way you walked... | discard: fragment / near-dup |
| 127 | 3.4 | 失敗そのものだった! 薄巻になると… | That was a mistake! Utsumaki Naruto! | discard: names another character |
| 128 | 2.1 | お前はなぜ現実を見ない | Why don't you see the reality? | → **taunt** |
| 129 | 2.8 | 陸道の力を手に入れた俺に | I've got the power of a rickshaw! | → **juubi** |
| 130 | 1.6 | 勝てるはずもないだろ | There's no way I can beat him! | discard: fragment / near-dup |
| 131 | 3.6 | いいだろう ここからは ジュウリンの時間だ | That's good. This is the time of the forest. | → **juubi** |
| 132 | 0.6 | なると | I see. | discard: names another character |
| 133 | 2.5 | 明日が何の日か知ってるな そう | I know what day tomorrow is. That's right. | discard: fragment / near-dup |
| 134 | 2.1 | ミナトとクシナの命にちだ | It's a special day for Minato and Kushina. | discard: names another character |
| 135 | 2.3 | 良心が死んだ日だ たとえ | It's the day when your spirit is dead. For example.. | discard: fragment / near-dup |
| 136 | 4.2 | その時に夢を抱いていたとしても 死ねば終わりだ | Even if I had a dream at that time, it would be over | discard: fragment / near-dup |
| 137 | 1.5 | この世は、もう | This world is over. | discard: fragment / near-dup |
| 138 | 1.1 | ジッとしていろ! | I'm jealous! | discard: fragment / near-dup |
| 139 | 0.9 | お前らは | Who are you? | discard: fragment / near-dup |
| 140 | 4.8 | 十分耐えしのんだ 後悔は先に立たんぞいいんだな | I've had enough. I won't regret it. That's good. | discard: fragment / near-dup |
| 141 | 3.6 | もう、この世界は終わるのだぞ、それなのに | This world is about to end. Even so... | discard: fragment / near-dup |
| 142 | 1.2 | なぜ戦う? | Why do you fight? | → **taunt** |
| 143 | 2.0 | お前らでは決して俺に | You guys, get me out of here! | discard: fragment / near-dup |
| 144 | 2.1 | 思いの強さが剣にあどる | The strength of my mind goes to the sword. | → **special** |
| 145 | 1.4 | 布箱の剣だ! | NUNOBOKONO KENDA! | discard: fragment / near-dup |
| 146 | 2.2 | もうお前らは俺に勝てん! | You won't win against me anymore! | → **combatBark** |
| 147 | 0.7 | ブゥーッ | Eugh! | → **hitReact** |
| 148 | 0.5 | なぜ? | Why? | → **hitReact** |
| 149 | 0.6 | これは | What the hell is this? | discard: fragment / near-dup |
| 150 | 0.6 | あんな! | Hanna! | discard: fragment / near-dup |
| 151 | 0.9 | イメージを! | IMAGE! | discard: fragment / near-dup |
| 152 | 1.8 | 俺が!この俺が! | It's me! It's me! | → **combatBark** |
| 153 | 4.8 | 後悔しているというのか? 今さらその名に何の意味がある | Are you telling me that you're regretting it? There' | discard: fragment / near-dup |
| 154 | 3.7 | 第二の陸道戦人だ 俺のやっていることは | It's my second | discard: fragment / near-dup |
| 155 | 1.7 | ほかげとなんが変わらない | Nothing will change from now on. | discard: fragment / near-dup |
| 156 | 3.6 | それ以上だ 平和を実現できるのだからな | That's all. Because you can realize peace. | → **win** |
| 157 | 1.6 | 行き先もはっきりせず | I don't know where to go. | discard: fragment / near-dup |
| 158 | 4.0 | わざわざ険しい道だとわかっていて歩くことはない | I know it's a dangerous path, but I won't walk. | discard: fragment / near-dup |
| 159 | 2.0 | 仲間の死体をまたぐだけだ | I'm just waiting for my friend's dead body. | discard: fragment / near-dup |
| 160 | 1.8 | はっきりした行き先があり | There is a place where I want to make it clear. | discard: fragment / near-dup |
| 161 | 3.3 | 地下道があるなら誰でもそちらを選ぶ | If you have a way to get close to them, you can choo | discard: fragment / near-dup |
| 162 | 3.8 | その2つの道の行きつく先が同じだとしても | Even if the two paths of life are the same... | discard: fragment / near-dup |
| 163 | 2.1 | そういうのか、違う | Is that so, Shigafu? | discard: fragment / near-dup |
| 164 | 2.2 | 俺はウチハオビトを捨てた | I threw away Uchiha Obito! | → **intro** |
| 165 | 0.7 | 俺は | I... | discard: fragment / near-dup |
| 166 | 0.7 | 俺は | I am... | discard: fragment / near-dup |
| 167 | 1.7 | — | — | discard: non-speech |
| 168 | 0.9 | そうか! | I see. | discard: fragment / near-dup |
| 169 | 1.6 | まだ抵抗するか | Are you still going to resist? | → **taunt** |
| 170 | 0.7 | どうした? | What's wrong? | → **hitReact** |
| 171 | 0.9 | まさか | I can't believe it! | → **hitReact** |
| 172 | 2.2 | もう諦めたわけじゃないだろうな | I don't think I've given up. | → **taunt** |
| 173 | 1.3 | あれしきのことで | That's the way it is. | discard: fragment / near-dup |
| 174 | 3.6 | お前たちのつながりはきれるものだったか、違うだろ | Was it something that could cut your ties? It's diff | discard: fragment / near-dup |
| 175 | 0.8 | 思い出せ | Remember this. | discard: fragment / near-dup |
| 176 | 0.7 | お前は | You are... | discard: fragment / near-dup |
| 177 | 3.1 | 俺と駆かしを再び繋げてくれただけではない | You didn't just connect me and Kakashi once again! | discard: names another character |
| 178 | 1.9 | 固くなだった俺の心 | My heart that used to be hard | discard: names another character |
| 179 | 2.2 | これまで多くのものの心 | This is the heart of many people. | discard: names another character |
| 180 | 3.4 | お前は溶かしてきたはずだ 敵対していたものを | You should have melted it! What you have been waitin | discard: names another character |
| 181 | 1.9 | 憎しみに包まれたもの | What is wrapped in hatred! | discard: names another character |
| 182 | 4.1 | タサトを拒んでいたものも 痛みを抱えていたものもだ | The one who was trying to kill Tazato, and the one w | discard: names another character |
| 183 | 2.3 | あの美術すらも そして | That beautiful lady... And... | discard: names another character |
| 184 | 1.7 | 世界の渡かまりすら | Wadakamari Sura of the world! | discard: names another character |
| 185 | 1.7 | お前は溶かしてきたんだ! | You've melted it! | discard: names another character |
| 186 | 0.5 | など! | Let's go! | discard: fragment / near-dup |
| 187 | 4.0 | あとはたった一人だけだろ 頑固な友を助けることなど | There's only one person left, right? Helping a stubb | discard: names another character |
| 188 | 1.6 | お前ならゾウサもない | You won't get away with it! | discard: names another character |
| 189 | 0.7 | そうだろ! | You're right! | discard: fragment / near-dup |
| 190 | 1.0 | ホムのために! | For my sake! | discard: names another character |
| 191 | 1.3 | 前!前! | In front! In front! | → **special** |
