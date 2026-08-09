# TOBI — Voice Line Log

**Character:** Tobi (masked Obito alias, Naruto — a FULLY SEPARATE roster char from Obito).
**Source:** 14 clips, Japanese (Naruto × Storm Connections rip), prefix `tobi_voice_*` — exact on-disk
filenames preserved. Audio-only pass: **zero** damage/cost/frame/gameplay data touched.
**Persona:** the goofy "Tobi" — playful, senpai-obsessed, lazy comic-relief masked man — so the lines are
banter, deliberately kept SEPARATE from Obito's own stern jutsu-callout pack (`obitoVoice.js`).

## STEP 1 — Transcription (faster-whisper `small`, 2-pass JA transcribe + EN translate, VAD)

Tool: `tools/transcribe_tobi.py` → `tobi_raw_transcript.tsv`. All 14 clips resolved as clean Japanese
speech (lang=ja, prob 1.00) — **no non-speech / SFX** in the batch. Hand-reviewed below (whisper text
lightly corrected; the EN column is a working gloss for filtering/pooling).

| # | file | dur | JA (hand-reviewed) | EN gloss |
|---|---|---|---|---|
| 000 | tobi_voice_000_t00m00_0s.mp3 | 1.9s | 〜大○弦の術！ *(garbled technique name)* | "…-Jutsu!" (a "〜の術" technique shout, name unclear) |
| 001 | tobi_voice_001_t00m02_5s.mp3 | 2.2s | セッティングオッケー！よいしょ！ | "Setting, OK! Heave-ho!" |
| 002 | tobi_voice_002_t00m13_0s.mp3 | 2.9s | 今度からこういうのは先輩にやってもらおう！ | "From now on I'll leave this kind of thing to senpai!" |
| 003 | tobi_voice_003_t00m26_2s.mp3 | 3.5s | どうせ俺をいじめる気でしょ？ひどいなぁ！ | "You're gonna bully me, right? So mean!" |
| 004 | tobi_voice_004_t00m29_7s.mp3 | 2.6s | 無駄な争いはやめましょうよ | "Let's stop this pointless fighting~" |
| 005 | tobi_voice_005_t00m32_4s.mp3 | 2.0s | やるときはやるっすよ！俺！ | "I do it when it counts! Me!" |
| 006 | tobi_voice_006_t00m34_5s.mp3 | 4.1s | さすが俺の術！かっこいい！ | "As expected of my jutsu! So cool!" |
| 007 | tobi_voice_007_t00m38_7s.mp3 | 2.8s | 俺の術、特別披露しちゃいますよ！ | "I'll give you a special showing of my jutsu!" |
| 008 | tobi_voice_008_t00m41_6s.mp3 | 3.9s | はぁ、超面倒くさい。さっさと終わらせちゃお！ | "Ugh, such a pain. Let's finish this quick!" |
| 009 | tobi_voice_009_t00m45_7s.mp3 | 1.4s | はあああああ | "Haaah!" (exertion shout) |
| 010 | tobi_voice_010_t00m47_2s.mp3 | 2.2s | イタチさんに後で謝らなきゃ | "I'll have to apologize to Itachi-san later." |
| 011 | tobi_voice_011_t00m49_6s.mp3 | 0.8s | 先輩！ | "Senpai!" |
| 012 | tobi_voice_012_t00m50_5s.mp3 | 4.5s | この人動きが早すぎっすよ！僕らじゃ叶いませんって | "This guy's too fast! We can't keep up!" |
| 013 | tobi_voice_013_t00m55_7s.mp3 | 1.5s | またやる気なんすか？ | "You wanna go again?" |

## STEP 2 — Filter (14 → 13 wired, 1 discarded)

- **DISCARD — 010** "…apologize to **Itachi**-san later" → names a specific other character directly (Itachi), per the brief's filter rule.
- **KEEP-flagged — 000** the technique name is garbled by whisper, but it is unmistakably a "〜の術" (Jutsu) shout → kept as a special-cast line, text marked uncertain.
- **No non-speech SFX** and **no near-duplicates** in the batch — all 14 are distinct clean JA speech, so (per "don't over-filter") the other 13 are all usable.

## STEP 3 — Pools + wiring (`tobiVoice.js`, `pickTobiVoice(pool)` → random `playSfxFile`)

Kept intentionally simple for a 14-clip batch — **3 pools**:

| Pool | Clips | Fires from |
|---|---|---|
| **intro** (2) | 001, 004 | `game.js` INTRO_VOICE → `tobi: { pool: TOBI_VOICE.intro }` (round-1 match start) |
| **specialCast** (3) | 000, 007, 009 | `abilities.js` `executeTobiSpecial` (any special connects the cast) + `executeTobiUltimate` (the ult borrows this pool — no dedicated ult clip). Sets `_atkVoiceCd` → no double-bark. |
| **combatBark** (8) | 002, 003, 005, 006, 008, 011, 012, 013 | `combat.js` `applyTobiOffenseVoice` — general taunt/bark on a heavy / long-string connect |

### Flagged decisions
- **One general combatBark pool** (not a split offense/hit-react) per the "keep it simple" directive. A few
  lines are reactive-flavoured (003 "you're bullying me!", 012 "too fast, can't keep up") but pool into the
  single general bark rather than a separate defensive pool — acceptable for the goofy banter character.
- **Win / low-health / dedicated-ult** beats stay **unvoiced** — the batch ships no clear clip for them, so
  nothing is fabricated (the ult reuses the specialCast pool since it IS a technique cast).
- **Separate from Obito:** own module (`tobiVoice.js`), own combat/abilities hooks (`applyTobiOffenseVoice`,
  `pickTobiVoice`), own INTRO_VOICE entry. Verified by `test:tobi-voice` that Tobi speaks ONLY `tobi_voice_*`.

## Verification
`test:tobi-voice` → **11/0** (module integrity · specialCast fires on cast · combatBark fires on connect ·
Tobi ⟂ Obito voice isolation). `test:tobi` **34/0** (gameplay unchanged). New: `tobiVoice.js`,
`tools/transcribe_tobi.py`, `harness/tobi_voice.test.mjs`.
