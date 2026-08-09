# Kasumi Miwa — Voice Line Curation Log (JAPANESE-ONLY)

**Source:** 719 clips (`miwa_000…miwa_718`), transcribed to `miwa_raw_transcript.tsv` via faster-whisper
(`small`, int8, VAD; `task=translate` so the text is an English *gloss* for review — the **played audio is
Japanese**). Cols: idx / file / dur / **audio-lang** / confidence / gloss. Pipeline = the one proven on
Reverse Flash / Batman / Omni-Man / Minato / Hisoka / Superman / Maki / Ghostface.

**This is a REPORT for review — nothing is wired.** Per the brief, all English-language clips were
**discarded** and only the Japanese clips carried forward, then content-filtered.

---

## Step 1 — Transcription (all 719)
Full raw log: `miwa_raw_transcript.tsv` (719 rows, 000–718, complete). Analysis helper:
`tools/analyze_miwa_transcript.py`.

**Language breakdown (Whisper-detected audio language):**
| lang | count | notes |
|---|---|---|
| `en` | 394 | English dub — **all discarded** (see Step 2). 327 with text, 67 empty/silence. |
| `ja` | 324 | Japanese dub — the survivor pool. All have text. |
| `te` | 1 | clip 470, a Whisper mis-detection of a Japanese garble ("What is this nonsense?") → treated as SFX/discard. |

The batch is **two clean dub sessions back-to-back**, exactly like Maki:
- **ENGLISH session = clips 000–357** (real English audio).
- **JAPANESE session = clips 358–718** (real Japanese audio).
- Inside the JA session, 36 clips are Whisper-mis-tagged `en`/`te` — every one is empty silence or a bare
  grunt (`UGH!`, `MAMA!`, `Gah!`, prob≈0.39). None carry real content; all fall out as SFX, **not** as English.

---

## Step 2 — Language filter (DISCARD English, keep Japanese)
- **DISCARDED: 358** English-session clips (000–357) — per explicit instruction, the entire English dub is dropped.
- **CARRIED FORWARD: 324** Japanese-session clips with speech (358–718, `ja`-tagged, non-empty).

---

## Step 3 — Content filter (on the 324 Japanese survivors)
Discarded non-speech, named-character lines, co-op/team callouts (no teammate exists in this game's 1v1),
between-match / story-mode banter & untranslatable garble, and redundant near-duplicates.

**Kept: 68** usable lines, sorted into the 7 requested pools.
**Discarded from the JA survivors: 256**, approximately:
- **~16** name a specific other character (Todo/"Todo-senpai" 592/593, "Udo/Kodo/Koho-senpai" 534/591/594,
  Mechamaru "Mekamaru"/"Ekamaru" 559/618, "the two brothers" 666, "Aksui-chan" 677, "the boy" 436).
- **~24** team/tag/assist co-op callouts (no ally in 1v1): "Leave it to me!" (532/580), "I'll leave it to you"
  (453), "Please support me!" (544), "Let's cooperate!" (651/652), "I'm counting on you!" (560/620),
  "Will you follow me?" (638), "Leave this opponent to me!" (639), "Let me report it!" (601/672), etc.
- **~15** pure grunts / interjections (`Hey!` 358, `Huh!?` 359, `Ato!` 365, `Why?` 481, `Tch!` 702, `Huh?`
  704, `Ehh!?` 705, `Ufufu!` 710, `Chuu-chuu…` 511, `Hup!` 717, `Sora!` 706).
- **~160** between-match / story-mode banter & untranslatable garble ("The leaves are sweet!" 388, "It's a
  pinball" 665, "I want to make money" 663, "Can I take a picture of you?" 522, "The station is coming!" 541,
  "I'm hungry" 673, the disturbing repeated "I'm going to kill you…" 675 = out-of-character story quote, etc.).
- **~41** redundant near-duplicates — e.g. "I'll do my best!" appears ~8× (394/404/518/558/564/610/615/655),
  "Thank you very much!" ~6× (516/523/619/625/626 …), "I won't let you go!" ~4×, "Shinkage-ryu" 4× (kept 2),
  "I won safely" 2× (kept 1), "That was close!" 2× (kept 1). Kept 1–2 of each for pool variety.

> Note on wiring language: this project has **no per-character voice-language toggle** (confirmed on the
> Maki pass — `sound`/character config expose no lang switch). Per the brief only the **Japanese** set was
> curated; if an English pack is ever wanted, the English session (000–357) is still on disk to re-curate.

---

# JAPANESE pool set (curated — clips 358–718)

Gloss shown is the English translation for review; **the audio played would be Japanese**.

### intro — pre-fight openers / self-intro
| clip | gloss |
|---|---|
| miwa_667_t22m12_4s.mp3 | "…Miwa desu!" (self-introduction — states her own name) |
| miwa_360_t11m49_8s.mp3 | "I will defeat you here!" |
| miwa_361_t11m51_5s.mp3 | "Are you going to stop me?" |
| miwa_542_t17m46_0s.mp3 | "Are you ready?" |
| miwa_545_t17m52_1s.mp3 | "You're going to fight me, aren't you?" |
| miwa_438_t14m18_3s.mp3 | "I can fight, too!" |
| miwa_514_t16m47_3s.mp3 | "I'll show you what I can do!" |
| miwa_589_t19m25_5s.mp3 | "I'll show you how strong I am!" |
| miwa_417_t13m34_1s.mp3 | "Is it okay for me to win?" (signature timid-Miwa flavor) |

### taunt — nervous / playful character flavor
| clip | gloss |
|---|---|
| miwa_381_t12m25_0s.mp3 | "I'm not drunk!" (signature comedic line) |
| miwa_416_t13m31_9s.mp3 | "Please don't think of me as a bad girl!" |
| miwa_405_t13m11_5s.mp3 | "What do you think?" |
| miwa_531_t17m21_9s.mp3 | "It's fun, isn't it?" |
| miwa_585_t19m16_6s.mp3 | "You're strong, aren't you?" |
| miwa_574_t18m52_8s.mp3 | "Are you sure you're okay with that?" |

### specialCast — map to built specials (random within sub-group)
**Signature technique calls** — 簡易領域 Simple Domain / 新陰流 Shinkage-ryū (→ Iai Dash / Rapid Slash Vortex / charge):
| clip | gloss |
|---|---|
| miwa_390_t12m42_3s.mp3 | "KANI RYOIKI" (簡易領域 — Simple Domain, her canonical technique) |
| miwa_506_t16m31_4s.mp3 | "Shinkage-ryū" (新陰流 — her sword school) |
| miwa_510_t16m39_2s.mp3 | "Shinkage-ryū!" |
**Committed-strike casts** (→ Iai Dash / "Blade of the Neophyte" ultimate windup):
| clip | gloss |
|---|---|
| miwa_371_t12m07_2s.mp3 | "With my counter!" |
| miwa_422_t13m44_1s.mp3 | "With this one blow!" |
| miwa_462_t15m07_1s.mp3 | "With this one shot!" |
| miwa_439_t14m20_5s.mp3 | "I'll strike with all my might!" |
| miwa_419_t13m38_6s.mp3 | "I'll put my full power on it!" (charge / ult) |
| miwa_643_t21m24_7s.mp3 | "I'm aiming for the awakening technique!" (ultimate) |
| miwa_494_t16m09_6s.mp3 | "From the neck!" (battojutsu targeting) |
| miwa_617_t20m33_2s.mp3 | "I'll cut it out!" |
| miwa_406_t13m13_0s.mp3 | "I'm going to cut it!" |

### hitConnect — offense barks on landing a hit
| clip | gloss |
|---|---|
| miwa_363_t11m54_2s.mp3 | "I'll cut you off!" |
| miwa_368_t12m02_7s.mp3 | "This is the end!" |
| miwa_384_t12m30_4s.mp3 | "I won't let you attack!" |
| miwa_401_t13m03_2s.mp3 | "It's over!" |
| miwa_425_t13m50_4s.mp3 | "I won't let you go!" |
| miwa_443_t14m30_1s.mp3 | "I'm going to beat you up!" |
| miwa_446_t14m36_3s.mp3 | "I won't let you get away!" |
| miwa_463_t15m09_0s.mp3 | "Here it comes!" |
| miwa_484_t15m51_6s.mp3 | "I'll eat you up!" |
| miwa_650_t21m38_7s.mp3 | "I'll keep attacking!" |
| miwa_697_t23m16_6s.mp3 | "It's the end!" |
| miwa_445_t14m34_7s.mp3 | "Now is my chance!" |
| miwa_370_t12m06_0s.mp3 | "Now is the time!" |
| miwa_457_t14m56_8s.mp3 | "Here I go." |
| miwa_703_t23m48_0s.mp3 | "Let's do this!" |

### hitReact — taking damage
| clip | gloss |
|---|---|
| miwa_362_t11m53_0s.mp3 | "Crap!" |
| miwa_461_t15m05_9s.mp3 | "Ouch!" |
| miwa_378_t12m19_1s.mp3 | "That was close!" |
| miwa_537_t17m36_2s.mp3 | "I'm scared!" |
| miwa_529_t17m17_8s.mp3 | "I'm getting nervous!" |
| miwa_480_t15m43_4s.mp3 | "I shouldn't have done this…" |
| miwa_660_t21m59_1s.mp3 | "This guy…" |
| miwa_692_t23m08_3s.mp3 | "Please don't come!" |

### lowHealth — desperation / near-defeat
| clip | gloss |
|---|---|
| miwa_403_t13m06_9s.mp3 | "I can't lose!" |
| miwa_515_t16m49_6s.mp3 | "I don't want to lose!" |
| miwa_485_t15m53_2s.mp3 | "I won't give up yet!" |
| miwa_467_t15m15_1s.mp3 | "I can still do it!" |
| miwa_459_t15m00_2s.mp3 | "I used too much of my power!" |
| miwa_430_t14m00_8s.mp3 | "I can't use my full power yet." |
| miwa_659_t21m56_4s.mp3 | "I won't be able to lose either!" |
| miwa_478_t15m38_9s.mp3 | "I don't want to live like this!" |

### win — victory line
| clip | gloss |
|---|---|
| miwa_375_t12m14_4s.mp3 | "I did it!" |
| miwa_450_t14m44_4s.mp3 | "I made it!" |
| miwa_464_t15m10_4s.mp3 | "I did a good job!" |
| miwa_604_t20m04_5s.mp3 | "I won safely!" |
| miwa_602_t20m00_9s.mp3 | "I won!" |
| miwa_582_t19m10_6s.mp3 | "I did it somehow!" |
| miwa_685_t22m51_3s.mp3 | "It was a good match, wasn't it?" |
| miwa_628_t20m55_2s.mp3 | "See you next time!" |
| miwa_376_t12m15_9s.mp3 | "This is how much I can do." |
| miwa_614_t20m26_0s.mp3 | "I'm glad I did my best!" |

---

## Per-pool count
intro 9 · taunt 6 · specialCast 12 · hitConnect 15 · hitReact 8 · lowHealth 8 · win 10 = **68 kept**.

## Flags for reviewer
- **Confirm gloss→pool by ear before wiring.** Glosses are machine translations of Japanese audio; a few
  are loose (e.g. 494 "From the neck!", 484 "I'll eat you up!"). Recommend a quick listen on the specialCast
  and hitConnect picks since those carry the most gameplay weight.
- **Technique names 390 / 506 / 510** are the strongest anime-authentic picks (Simple Domain / Shinkage-ryū)
  — prioritize these for the Iai Dash / vortex / charge cast hooks.
- If more pool variety is wanted, the discarded near-duplicates (esp. the 8× "I'll do my best!" and 6×
  "Thank you very much!") are easy to promote — they were dropped only for redundancy, not quality.
## Status: WIRED (2026-08-03)
Now wired via **`miwaVoice.js`** (mirrors `makiVoice.js`, `pickMiwaVoice`), 9 pools — the 12 specialCast lines
were split per built move: **iaiDash 7 / airVortex 3 / ultimate 2** (so a technique callout never plays over
the wrong move). Hooks:
- **combat.js** — `applyMiwaHitVoice` / `applyMiwaOffenseVoice` / `applyMiwaLowHealthVoice` (dispatched beside
  Maki's; reuses `MAKI_LOW_HEALTH_RATIO` 0.30).
- **abilities.js** — cast lines in `fireMiwaIaiDash` (iaiDash) / `fireMiwaAirSlash` (airVortex) /
  `executeMiwaUltimate` (ultimate), each `_atkVoiceCd`-guarded so the connect-bark never doubles.
- **game.js** — `INTRO_VOICE.miwa` fires the **combined intro+taunt** pool (no taunt action → folds to the
  intro beat) + a Miwa **win** block + `miwaVoicePool`/`miwaVoicePick` harness hooks.

Test: **`npm run test:miwa-voice` → 21/0** (pool coverage/randomization/disk/JA-only + live intro / combatBark
+ hitReact / iaiDash / airVortex / ultimate / lowHealth). Maki build regression 30/0. Ran `npm run stamp`.
