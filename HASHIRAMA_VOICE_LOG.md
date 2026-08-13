# HASHIRAMA SENJU — Voice Log

106 Japanese clips (`hashirama_voice_*`, Storm Connections rip, exact filenames preserved).
Transcribed via `tools/transcribe_hashirama.py` (faster-whisper, TWO passes: native-JA
`transcribe` + English `translate` gloss — the JA pass is what nails the Mokuton callouts).
Wired via `hashiramaVoice.js` (`pickHashiramaVoice`). Hashirama's full 8-stage kit was complete
and stable (`test:hashirama` 35/0) **before** wiring — audio-only, zero gameplay data touched.

Whisper mis-hears proper nouns (writes 火影→"北下/放課", 千手→"戦術/千手", 樹海降誕→"樹海交端"), so
the JA column is corrected in the notes where a canon jutsu name is obvious. Language was `ja` at
prob 1.00 on every clip.

## Technique-callout mapping (STEP 3 — matched individually vs his BUILT moves)

| Built move | Input | Pool | Clips (idx) | Callout (canon) |
|---|---|---|---|---|
| Kunai Throw (ground/air) | Special (neutral) | `kunai` | 043 / 079 / 097 | short zoning barks — させぬ! (won't let you) · 先鋒! (Senpō, first-strike). No dedicated kunai name in the set. |
| Mokuton Arm eruption | Fwd+Special | `mokutonArm` | 005 / 087 / 098 | 木遁! **Mokuton!** (×3, the bare Wood-Release shout) |
| Tree Summon 4-tier ladder | Down+Special | `treeSummon` | 000 / 084 / 085 | 木遁秘術・**樹海降誕** Mokuton Hijutsu: **Jukai Kōtan** ("Nativity of a World of Trees" — his signature forest) · 木遁秘術 (Mokuton secret art) · 樹海、降誕! |
| Wood Golem (Wood Statue) | Up+Special | `woodGolem` | 006 / 009 / 090 / 099 | **木人の術 Mokujin no Jutsu** (Wood Golem, direct) · **真数千手 Shinsu Senju** ("True Several Thousand Hands", ×3 — the giant-statue technique) |
| Gracious Deity Gates (immobilize) | Back+Special | `gates` | 066 / 070 / 086 | やはり**動きを止める**が先決か (best to **stop the movement** first — the pin) · これで少しはおとなしくなろう (this'll quiet you down) · 決着を決めるしかない |
| Wood Release Punch (tap/hold) | CHARGE (P) | `woodPunch` | 044 / 080 / 094 | 全力で生かせてもらうぞ (I'll go all out) · よっし! · 勝負! (Shōbu — face me!) — committed melee barks |
| Wood Clone (spawn) | `,` key | `woodClone` | 001 / 010 | ともに攻めるぞ! (let's attack **together**!) · 出番ぞ! (your turn!) — summon-an-ally flavor fits the decoy |
| Sealing Jutsu (Domain ult) | Ultimate | `sealingJutsu` | 038 / 046 / 054 / 055 | かつもくせよ! (Behold!) · 我がホムラの**印** (my **seal**) · これが俺の覚悟だ! (this is my resolve) · 我らが火の意志、存分に発揮しよう! (our **Will of Fire** — the cameo cast) |

Notes:
- **088 木龍の術 (Mokuryū no Jutsu = Wood Dragon)** transcribed clearly, but Hashirama has **no built
  Wood-Dragon move** (that's Madara's `woodDragon`) → left **avail**, NOT wired, to avoid a callout
  with no matching move.
- **092** ("…にすさのう" ≈ Susanoo) and **056/073/074** reference the Kyūbi/Juubi battle → not his kit → avail/discard.

## Filter summary (STEP 2)

- **Wired: 52** across 14 pools.
- **Discarded: 39** — non-speech grunts/roars (064/083/091/093/100/101/102), pure fragments
  (011/012/013/014/026/030/035/036/040/061/062/063/071/105), lines **naming another character**
  (053 Sarutobi · 057 **Madara** · 065/072 **Kyūbi** · 073/074 the Nine-Tails "beast" · 076/077 the
  friend/"お前は俺の友" Madara-relational lines), and **near-duplicates** (047–051 re-take of 039–043 ·
  089 = 3rd "Mokuton!" dup · 095 = 2nd "勝負!" dup).
- **Avail (clean speech, pool full — held): 15** — 004/008/015/023/028/029/033/037/039/056/082/088/092/096/104.

## Full transcript (all 106) + disposition

`→pool` = wired · `DISCARD (reason)` · `avail` = usable, pool already full.

| idx | dur | JA (native, corrected) | EN (gloss) | disposition |
|---|---|---|---|---|
| 000 | 2.98 | 木遁秘術・樹海降誕 | Mokuton Hijutsu: Jukai Kōtan | → `treeSummon` |
| 001 | 2.65 | まだまだ爪が甘い ともに攻めるぞ | Still too soft — let's attack together! | → `woodClone` |
| 002 | 4.28 | 歴代火影の力を思い知れ そんなものか | Know the power of the Hokage line! Is that all? | → `intro` |
| 003 | 3.09 | やるぞ! …の術! | I'll do it! …no Jutsu! | DISCARD (garbled cast name) |
| 004 | 1.30 | 先鋒! | Senpō! | avail |
| 005 | 1.23 | 木遁! | Mokuton! | → `mokutonArm` |
| 006 | 1.93 | 真数千手 | Shinsu Senju | → `woodGolem` |
| 007 | 1.72 | （不明） | (unclear) | DISCARD (garbled) |
| 008 | 4.21 | うおお! これが歴代火影の力ぞ! | Roar! This is the power of the Hokage! | avail (roar-heavy) |
| 009 | 3.27 | 行くぞ! 真数千手! | Here we go! Shinsu Senju! | → `woodGolem` |
| 010 | 2.14 | 出番ぞ! 火影たち! | Your turn! Hokage! | → `woodClone` |
| 011 | 1.86 | （不明） | (garbled) | DISCARD (fragment) |
| 012 | 1.74 | （不明）の力だ! | …power! | DISCARD (garbled) |
| 013 | 2.03 | この葉隠れは何人も | This Konoha, however many… | DISCARD (fragment) |
| 014 | 3.57 | （不明） | (garbled) | DISCARD (garbled) |
| 015 | 2.85 | 俺の務め、これぞ千手の力! | My duty — this is Senju's power! | avail |
| 016 | 4.58 | ここで負けているようでは火影は務まらん | Losing here, you can't be Hokage | → `win` |
| 017 | 3.46 | 腕を磨いて出直してこい | Hone your skills and come back | → `win` |
| 018 | 4.27 | ははは 良い手合わせであったぞ | Haha — that was a fine match! | → `win` |
| 019 | 1.16 | 初代火影 | First Hokage | → `intro` |
| 020 | 1.21 | 千手柱間 | Senju Hashirama | → `intro` |
| 021 | 1.74 | あれごときでは倒れぬ | I won't fall to something like that | → `taunt` |
| 022 | 0.55 | ん? | Hmm? | → `hitReact` |
| 023 | 1.41 | もう終わりか | Over already? | avail |
| 024 | 2.02 | 俺はまだまだ動けるのだが | I can still move plenty | → `taunt` |
| 025 | 2.27 | 俺に挑むにはまだ力が足らぬ | You lack the strength to challenge me | → `taunt` |
| 026 | 1.13 | （不明） | (garbled) | DISCARD (garbled) |
| 027 | 1.57 | もう一度やりあおうぞ | Let's do this again! | → `win` |
| 028 | 1.63 | いつの世も戦いか | Every age, war… | avail |
| 029 | 3.43 | だが希望を失うわけにはいかぬ | But I can't lose hope | avail |
| 030 | 1.83 | （不明） | (garbled) | DISCARD (garbled) |
| 031 | 1.70 | だからお前は負けたのだ | That is why you lost | → `combatBark` |
| 032 | 2.39 | 貴様のその気概、見事 | Your spirit — splendid | → `win` |
| 033 | 2.81 | 子供たちを守り… | To protect the children… | avail |
| 034 | 1.25 | 平和を実現する | I will realize peace | → `intro` |
| 035 | 3.14 | それが里というもの… | That is what a village is… | DISCARD (fragment) |
| 036 | 1.66 | ホムラが意志を… | The Will (of Fire)… | DISCARD (fragment) |
| 037 | 3.19 | 燃やさん… 死の火を見せよ | Burn — show the fire! | avail |
| 038 | 1.15 | かつもくせよ | Behold! (Katsumoku seyo) | → `sealingJutsu` |
| 039 | 2.34 | 里を守ることが何より… | Protecting the village above all… | avail |
| 040 | 1.06 | 忍びを | …shinobi | DISCARD (fragment) |
| 041 | 1.72 | 子供を守ることになると | When it comes to protecting children | DISCARD (dup of 049) |
| 042 | 1.02 | 俺は信じる | I believe | → `intro` |
| 043 | 0.90 | お前は後! | You're next! | → `kunai` |
| 044 | 3.49 | 全力で生かせてもらうぞ | I'll fight with all my might! | → `woodPunch` |
| 045 | 3.19 | だがこれで最後ぞ 今こそ見せよう | But this is the last — now I'll show you! | → `lowHealth` |
| 046 | 1.70 | 我がホムラの印 | My seal of fire | → `sealingJutsu` |
| 047 | 2.31 | 里を守ることが何より… | (retake of 039) | DISCARD (near-dup 039) |
| 048 | 0.94 | 忍びを | (retake of 040) | DISCARD (near-dup 040) |
| 049 | 1.64 | 子供を守ることになると | (retake of 041) | DISCARD (near-dup 041) |
| 050 | 1.00 | 俺は信じる | (retake of 042) | DISCARD (near-dup 042) |
| 051 | 0.90 | お前は後! | (retake of 043) | DISCARD (near-dup 043) |
| 052 | 2.11 | 我が名は千手柱間 | My name is Senju Hashirama | → `intro` |
| 053 | 1.67 | サルトビ… | Sarutobi… | DISCARD (names Sarutobi) |
| 054 | 5.02 | 見守るために… それが俺の覚悟だ! | To watch over you… that is my resolve! | → `sealingJutsu` |
| 055 | 5.11 | 我らが火の意志、存分に発揮しようぞ | Our Will of Fire — let it show fully! | → `sealingJutsu` |
| 056 | 4.29 | これ以上は許さん! | I won't allow any more! | avail |
| 057 | 5.76 | 想像以上の相手ぞ! …マダラよ! | More than I imagined… Madara! | DISCARD (names Madara) |
| 058 | 1.23 | まだ戦える! | I can still fight! | → `lowHealth` |
| 059 | 3.95 | 火影を甘く見るなよ! | Don't underestimate the Hokage! | → `combatBark` |
| 060 | 1.12 | お前とて許さぬ! | Not even you will I forgive! | → `combatBark` |
| 061 | 0.75 | まだ…! | (fragment) | DISCARD (fragment) |
| 062 | 0.82 | お前は | You are… | DISCARD (fragment) |
| 063 | 0.53 | あれは… | That is… | DISCARD (fragment) |
| 064 | 0.93 | んんんん! | (grunt) | DISCARD (non-speech) |
| 065 | 0.76 | キュウビ…! | Kyūbi…! | DISCARD (names Kyūbi) |
| 066 | 2.30 | これで少しはおとなしくなろう | This'll quiet you down a little | → `gates` |
| 067 | 0.73 | かっ | Kah! | → `hitReact` |
| 068 | 1.14 | やはり効かぬか | So it won't work… | → `hitReact` |
| 069 | 2.26 | くっ、なんという力だ! | Ngh — what power! | → `hitReact` |
| 070 | 2.31 | こうなっては決着をつけるしかない | Then there's no choice but to settle it | → `gates` |
| 071 | 0.62 | まだ…! | (fragment) | DISCARD (fragment) |
| 072 | 4.42 | お前（九尾）と俺の木遁、どちらが上か | Your Kyūbi and my Mokuton — which is above | DISCARD (names Kyūbi) |
| 073 | 3.38 | 何事もやってみなければ… | Nothing's known till you try… | DISCARD (Kyūbi-battle ctx) |
| 074 | 2.73 | ただ目の前の獣を攻撃する | Just attack the beast in front | DISCARD (Nine-Tails "beast") |
| 075 | 4.24 | 迷いは捨てろ、柱間! | Cast off your doubt, Hashirama! | → `lowHealth` |
| 076 | 2.23 | 俺はお前と戦いたいとは思わぬ | I don't wish to fight you | DISCARD (Madara-relational) |
| 077 | 1.45 | お前は俺の友だ! | You are my friend! | DISCARD (Madara-relational) |
| 078 | 3.29 | いくら強固と言えど無敵ではない | However strong — you're not invincible! | → `combatBark` |
| 079 | 0.77 | させぬ! | I won't let you! | → `kunai` |
| 080 | 2.61 | よっし! | Alright! | → `woodPunch` |
| 081 | 1.12 | 止めたぞ! くっ! | I stopped it! Ngh! | → `hitReact` |
| 082 | 1.26 | 間に合わなかったか | Didn't make it in time… | avail |
| 083 | 0.68 | ぬぅぅぅ! | (grunt) | DISCARD (non-speech) |
| 084 | 1.38 | 木遁秘術 | Mokuton Hijutsu | → `treeSummon` |
| 085 | 1.15 | 樹海、降誕! | Jukai — Kōtan! | → `treeSummon` |
| 086 | 2.24 | やはり動きを止めるが先決か | Best to stop the movement first | → `gates` |
| 087 | 0.79 | 木遁! | Mokuton! | → `mokutonArm` |
| 088 | 1.26 | 木龍の術! | Mokuryū no Jutsu! (Wood Dragon) | avail (no Wood-Dragon move built) |
| 089 | 0.89 | 木遁! | Mokuton! | DISCARD (near-dup 005/087/098) |
| 090 | 1.17 | 木人の術 | Mokujin no Jutsu (Wood Golem) | → `woodGolem` |
| 091 | 0.58 | ん? | Hm? | DISCARD (non-speech) |
| 092 | 1.66 | …にすさのう | …Susanoo (opp ref) | avail |
| 093 | 0.61 | あ゛あ゛あ゛! | (grunt) | DISCARD (non-speech) |
| 094 | 0.80 | 勝負! | Shōbu! (Face me!) | → `woodPunch` |
| 095 | 0.64 | 勝負! | Shōbu! | DISCARD (near-dup 094) |
| 096 | 1.04 | 仕方ない | Can't be helped | avail |
| 097 | 0.84 | 先鋒! | Senpō! | → `kunai` |
| 098 | 0.83 | 木遁! | Mokuton! | → `mokutonArm` |
| 099 | 1.76 | 真数千手 | Shinsu Senju | → `woodGolem` |
| 100 | 1.69 | （不明） | (garbled) | DISCARD (garbled) |
| 101 | 3.05 | うおおお | Roooar | DISCARD (non-speech) |
| 102 | 3.43 | おおおお! | Ohhh! | DISCARD (non-speech) |
| 103 | 2.30 | お前の心はまだ死んではおらぬ | Your heart is not yet dead | → `win` |
| 104 | 1.17 | 先のために | For the sake of the future | avail |
| 105 | 0.58 | 前! | Forward! | DISCARD (fragment) |

**Totals: 52 wired · 39 discarded · 15 avail (held).**
