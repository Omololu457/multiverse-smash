# Inosuke Hashibira — Voice Line Transcription & Wiring Log

**Source:** 93 clips, `inosuke_voice_000` … `inosuke_voice_092` (Japanese audio, *Demon Slayer: The Hinokami Chronicles* voice rip).
**Pipeline:** `tools/transcribe_inosuke.py` — faster-whisper `small` + VAD, TWO passes per clip
(native-JA `transcribe` for Beast-Breathing form callouts + English `translate` gloss for named-char
filtering / pool assignment / dup detection). Same proven pipeline as Madara / Miwa / Vegeta / Sukuna.
Raw output: `inosuke_raw_transcript.tsv`.

**Filenames are PRESERVED EXACTLY** (per brief) — clips are wired under their raw `inosuke_voice_NNN_tMMmSS_Ns.mp3`
names; nothing was renamed or re-encoded. Audio-only pass: **no damage / cost / frame / gameplay data touched.**

> ASR CAVEAT: the Japanese technique names are noisy in the raw gloss (fighting-game rips clip the audio
> tight). The recognisable structure is Inosuke's **Beast Breathing (獣の呼吸 / けだものの呼吸)** ladder —
> 壱ノ牙 (1st Fang) … 玖ノ牙 (9th Fang) + 漆/捌ノ型 (7th/8th Forms). Callouts below are matched to that
> ladder by their intact tokens (…ノ牙 / …ノ型 / 穿ち抜き / 切り裂き / 狂い裂き / 爆裂 / うねり裂き / 空間).

---

## Curation summary

| Bucket | Count |
|---|---|
| **Wired** | **41** |
| Discarded — empty / pure-SFX scream | 11 |
| Discarded — near-duplicate take of a kept line | 30 |
| Discarded — unclear garble (no confident gloss/home) | 10 |
| **Total** | **93** |

**Named-character discards: 0.** No clip names another specific character (Tanjiro / Zenitsu / Nezuko /
Rengoku / Shinobu / Giyu / etc.). Every non-obvious token is a *mistranscribed Beast-Breathing technique
name*, not a character name — nothing was dropped on that rule (verified against his Demon Slayer ensemble).

---

## Pool → trigger map (where each wired pool fires)

| Pool | Clips | Trigger site |
|---|---|---|
| `intro`      | 6 | `game.js INTRO_VOICE.inosuke` — battle start. **Taunt folds in** (Inosuke's `introPool` is the taunt sprite; no separate taunt-voice event without touching gameplay — Shinobu/Gon/Rengoku precedent). |
| `specialCast`| 8 | `abilities.js fireInosukeCinematicSpecial` — the **3 Beast-Breathing cinematic specials** (Spin / Dash Thrust / Slashing Lunge Fan). Random Fang/Form callout per cast. Sets `_atkVoiceCd` (no cast+connect double). |
| `beastAssist`| 4 | `abilities.js fireBeastBreathingAssist` — the **Beast Breathing Assist** mid-combo partner call (Stage-4 signature; Inosuke has no separate ultimate). The style-name / Total-Concentration declarations. Sets `_atkVoiceCd`. |
| `combatBark` | 9 | `combat.js applyInosukeOffenseVoice` — attacker lands a HEAVY / long-string connect. |
| `hitReact`   | 5 | `combat.js applyInosukeHitVoice` — defender took a STRONG hit (heavy/special/launcher/≥55). |
| `hitGrunt`   | 4 | `combat.js applyInosukeHitVoice` — defender took a LIGHT hit (exertion grunt). |
| `lowHealth`  | 2 | `combat.js applyInosukeLowHealthVoice` — once, crossing 25% HP. |
| `win`        | 3 | `game.js` winner block — fires only when the WINNER is Inosuke. |

### Special-cast mapping (Step 3)

The game gives Inosuke **3 generic Beast-Breathing cinematic specials** (spin/dash/lunge — NOT one-move-per-
Fang) plus the **Beast Breathing Assist**. So the intact Fang/Form callouts are pooled as `specialCast`
(random per cinematic special), and the *style-name* declarations are pooled as `beastAssist`:

- **`specialCast`** ← Fang/Form technique callouts: 006 陸ノ牙 (6th Fang) · 047 弐ノ牙・切り裂き (2nd) ·
  050 肆ノ牙 (4th) · 055 捌ノ型・爆裂猛進 (8th Form) · 060 玖ノ牙・うねり裂き (9th) ·
  066 壱ノ牙・穿ち抜き (1st Fang: Pierce) · 070 参ノ牙・喰い裂き (3rd) · 074 伍ノ牙・狂い裂き (5th).
- **`beastAssist`** ← 075 獣の呼吸 (Beast Breathing! — style name) · 090 ケダモノ… (Beast-Breathing cry) ·
  042 全集中 (Total Concentration) · 010 空間識覚 (spatial-sense form — reading the field to call the partner).

---

## Full transcript (all 93) with decisions

Legend — **W**=wired (pool), **D-e**=empty/SFX, **D-dup**=near-dup of a kept clip, **D-g**=unclear garble.

| # | file | dur | JA (native) | EN gloss | decision |
|---|---|---|---|---|---|
| 000 | inosuke_voice_000 | 1.43 | すら嫌だ！ | I don't give a damn! | D-g (context-less) |
| 001 | inosuke_voice_001 | 0.52 | — | — | D-e |
| 002 | inosuke_voice_002 | 1.07 | 貰ったぜ！ | I got it! | **W combatBark** |
| 003 | inosuke_voice_003 | 1.29 | よっしゃー！ | Yesss! | **W win** |
| 004 | inosuke_voice_004 | 1.92 | ちょとつ… | (unclear) | D-g |
| 005 | inosuke_voice_005 | 1.51 | ランクイ…カメラ | (6th Fang, garbled) | D-dup (→006) |
| 006 | inosuke_voice_006 | 2.73 | 陸ノ牙・乱杭咲き | Roku-no-Kiba (6th Fang) | **W specialCast** |
| 007 | inosuke_voice_007 | 0.94 | しちおかた | (7th Form?, unclear) | D-g |
| 008 | inosuke_voice_008 | 1.56 | 空間試計画 | Space… | D-dup (→010) |
| 009 | inosuke_voice_009 | 1.01 | 必須かだ | (unclear) | D-g |
| 010 | inosuke_voice_010 | 1.58 | 空間識覚 | spatial sense | **W beastAssist** |
| 011 | inosuke_voice_011 | 0.65 | さあグッ | (grunt) | D-g |
| 012 | inosuke_voice_012 | 1.09 | でやるぜー！ | I'll do it! | **W combatBark** |
| 013 | inosuke_voice_013 | 1.09 | やっはー！ | Yah-ha! | **W intro** |
| 014 | inosuke_voice_014 | 2.00 | 思いつきの投げ先 | (unclear) | D-g |
| 015 | inosuke_voice_015 | 1.19 | めんどくせー！ | What a pain! | **W intro** (signature taunt) |
| 016 | inosuke_voice_016 | 1.01 | 仕上がれ！ | Finish it! | **W combatBark** |
| 017 | inosuke_voice_017 | 0.74 | — | — | D-e |
| 018 | inosuke_voice_018 | 0.84 | 甘いぜ！ | Too naive! | **W combatBark** |
| 019 | inosuke_voice_019 | 1.22 | イチオキバー | (1st Fang) | D-dup (→066) |
| 020 | inosuke_voice_020 | 0.80 | はっはっ！ | Ha-ha! (effort) | **W hitGrunt** |
| 021 | inosuke_voice_021 | 1.40 | みずんけりだ | (unclear) | D-g |
| 022 | inosuke_voice_022 | 2.70 | ちぎり咲く斬り味が自慢なのさ | My cutting is my pride | **W win** (boast) |
| 023 | inosuke_voice_023 | 1.83 | 俺の刀は痛いぜ | My blade bites! | D-dup-ish (garbled, →018 family) |
| 024 | inosuke_voice_024 | 0.87 | 聞かねえぜ！ | I won't listen! | **W intro** (taunt) |
| 025 | inosuke_voice_025 | 0.88 | — | — | D-e |
| 026 | inosuke_voice_026 | 1.42 | あ゛あ゛あ゛…（絶叫） | (pure scream) | D-e (SFX) |
| 027 | inosuke_voice_027 | 0.83 | — | — | D-e |
| 028 | inosuke_voice_028 | 0.53 | こわっ！ | Scary! | **W hitReact** |
| 029 | inosuke_voice_029 | 0.56 | えへっ | (chuckle) | D-g |
| 030 | inosuke_voice_030 | 1.07 | あ゛あ゛あ゛！ | Argh! | **W hitGrunt** |
| 031 | inosuke_voice_031 | 1.06 | つくすわー！ | Damn it! | **W hitReact** |
| 032 | inosuke_voice_032 | 1.43 | — | — | D-e |
| 033 | inosuke_voice_033 | 0.52 | ぼーちゃっ | (SFX) | D-e |
| 034 | inosuke_voice_034 | 1.12 | 甘いんだよ！ | Too naive! | D-dup (→018) |
| 035 | inosuke_voice_035 | 1.26 | 覚悟しやがれ！ | Prepare yourself! | **W combatBark** |
| 036 | inosuke_voice_036 | 1.56 | なぁー！ | Naaah! (yell) | **W hitGrunt** |
| 037 | inosuke_voice_037 | 1.17 | 決めてやるぜ！ | I'll finish it! | **W combatBark** |
| 038 | inosuke_voice_038 | 1.51 | — | — | D-e |
| 039 | inosuke_voice_039 | 1.44 | 舐めるんじゃねえ！ | Don't underestimate me! | **W lowHealth** |
| 040 | inosuke_voice_040 | 1.75 | はっはっはっは！ | Ha-ha-ha! (laugh) | **W win** |
| 041 | inosuke_voice_041 | 1.15 | — | — | D-e |
| 042 | inosuke_voice_042 | 1.72 | 全集中… | Total Concentration | **W beastAssist** |
| 043 | inosuke_voice_043 | 0.65 | かりゅう | (unclear) | D-g |
| 044 | inosuke_voice_044 | 1.09 | フェイスチューチュー | (garble) | D-g |
| 045 | inosuke_voice_045 | 1.00 | 弐ノ牙 | Ni-no-Kiba (2nd) | D-dup (→047) |
| 046 | inosuke_voice_046 | 1.52 | ギリスタギリ | (garble) | D-g |
| 047 | inosuke_voice_047 | 2.50 | 弐ノ牙・切り裂き | Ni-no-Kiba: Slice (2nd) | **W specialCast** |
| 048 | inosuke_voice_048 | 0.91 | 肆ノ牙 | Shi-no-Kiba (4th) | D-dup (→050) |
| 049 | inosuke_voice_049 | 1.66 | 切り込まざけ | Kirikomazaki | D-dup (→050) |
| 050 | inosuke_voice_050 | 2.72 | 肆ノ牙・切細裂き | Shi-no-Kiba (4th Fang) | **W specialCast** |
| 051 | inosuke_voice_051 | 1.04 | ロクロキラ | (6th Fang) | D-dup (→006) |
| 052 | inosuke_voice_052 | 2.27 | 見つけた！そこか！ | Found you! There! | **W combatBark** |
| 053 | inosuke_voice_053 | 0.93 | 捌力だ | (8th Form) | D-dup (→055) |
| 054 | inosuke_voice_054 | 1.65 | 爆裂猛進！ | Explosive rush! | D-dup (→055) |
| 055 | inosuke_voice_055 | 0.99 | 捌ノ型・爆裂猛進 | Hachi-no-Kata (8th Form) | **W specialCast** |
| 056 | inosuke_voice_056 | 1.60 | 爆裂猛進！ | Explosive rush! | D-dup (→055) |
| 057 | inosuke_voice_057 | 0.91 | 玖ノ牙 | Ku-no-Kiba (9th) | D-dup (→060) |
| 058 | inosuke_voice_058 | 1.71 | 伸・うねり裂け | Shin: Uneri… | D-dup (→060) |
| 059 | inosuke_voice_059 | 0.93 | 風の…裂き | (9th Fang, garbled) | D-dup (→060) |
| 060 | inosuke_voice_060 | 1.81 | 玖ノ牙・伸・うねり裂き | Ku-no-Kiba (9th Fang) | **W specialCast** |
| 061 | inosuke_voice_061 | 0.89 | しゅうろきば | (9th Fang) | D-dup (→060) |
| 062 | inosuke_voice_062 | 1.31 | エンテンセイガー | (unclear) | D-g |
| 063 | inosuke_voice_063 | 0.96 | 16… | (garble) | D-g |
| 064 | inosuke_voice_064 | 1.28 | エンテンセイガー | (unclear) | D-dup (→062, both D) |
| 065 | inosuke_voice_065 | 1.52 | 穿ち抜け！ | Pierce through! (1st) | D-dup (→066) |
| 066 | inosuke_voice_066 | 2.51 | 壱ノ牙・穿ち抜き | Ichi-no-Kiba: Pierce (1st Fang) | **W specialCast** |
| 067 | inosuke_voice_067 | 1.48 | 引き裂けてやる！ | I'll tear you apart! | **W combatBark** |
| 068 | inosuke_voice_068 | 1.22 | 参ノ牙 | San-no-Kiba (3rd) | D-dup (→070) |
| 069 | inosuke_voice_069 | 1.35 | 喰い裂け | Kuizake | D-dup (→070) |
| 070 | inosuke_voice_070 | 2.43 | 参ノ牙・喰い裂き | San-no-Kiba (3rd Fang) | **W specialCast** |
| 071 | inosuke_voice_071 | 1.53 | 屍さらすな | Don't lie there! | D-g (harsh, no clean home) |
| 072 | inosuke_voice_072 | 1.17 | 伍ノ牙 | Go-no-Kiba (5th) | D-dup (→074) |
| 073 | inosuke_voice_073 | 1.66 | 狂い裂く | Kuruizaku (5th) | D-dup (→074) |
| 074 | inosuke_voice_074 | 2.71 | 伍ノ牙・狂い裂き | Go-no-Kiba (5th Fang) | **W specialCast** |
| 075 | inosuke_voice_075 | 1.31 | 獣の呼吸 | Beast Breathing | **W beastAssist** |
| 076 | inosuke_voice_076 | 1.69 | あああああ | (roar) | **W hitGrunt** |
| 077 | inosuke_voice_077 | 1.32 | くぜぇ！ | Let's go! | D-dup (→092) |
| 078 | inosuke_voice_078 | 0.90 | あっちやがれ！ | Get lost! | D-g |
| 079 | inosuke_voice_079 | 1.58 | — | — | D-e |
| 080 | inosuke_voice_080 | 0.66 | — | — | D-e |
| 081 | inosuke_voice_081 | 0.59 | — | — | D-e |
| 082 | inosuke_voice_082 | 0.86 | くっそォォ！ | Crap! | **W hitReact** |
| 083 | inosuke_voice_083 | 1.13 | 負けねぇ | I won't lose. | **W lowHealth** |
| 084 | inosuke_voice_084 | 1.27 | 負けねえ | I won't lose! | D-dup (→083) |
| 085 | inosuke_voice_085 | 1.29 | おもしろい | Interesting! | **W intro** |
| 086 | inosuke_voice_086 | 1.82 | 来た来た来た来た！ | Here it comes! | **W intro** |
| 087 | inosuke_voice_087 | 0.98 | 斬りつけてやる！ | I'll cut you down! | **W combatBark** |
| 088 | inosuke_voice_088 | 0.95 | なんじゃこれや！ | What the hell is this?! | **W hitReact** |
| 089 | inosuke_voice_089 | 1.48 | ザケンじゃねぇぞ！ | Don't screw with me! | **W hitReact** |
| 090 | inosuke_voice_090 | 1.69 | ケダモノの…！ | Beast! (Breathing cry) | **W beastAssist** |
| 091 | inosuke_voice_091 | 1.28 | 捌ノ型 | Hachi-no-Kata (8th Form) | D-dup (→055) |
| 092 | inosuke_voice_092 | 0.92 | 行くぜ！ | Let's go! | **W intro** |

---

## Wired-clip index (41)

- **intro (6):** 013, 015, 024, 085, 086, 092
- **specialCast (8):** 006, 047, 050, 055, 060, 066, 070, 074
- **beastAssist (4):** 010, 042, 075, 090
- **combatBark (9):** 002, 012, 016, 018, 035, 037, 052, 067, 087
- **hitReact (5):** 028, 031, 082, 088, 089
- **hitGrunt (4):** 020, 030, 036, 076
- **lowHealth (2):** 039, 083
- **win (3):** 003, 022, 040

No clip is double-pooled (each of the 41 has exactly one home). Wiring is audio-only via `sound.playSfxFile`.
