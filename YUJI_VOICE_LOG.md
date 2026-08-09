# Yuji Itadori — Voice Line Curation Log

**Source:** 564 clips `yuji_voice_000..565` (a mixed EN/JA fighting-game voice rip; per-clip label is only a timestamp).
**Pipeline:** `tools/transcribe_yuji.py` (faster-whisper `small`, `task="translate"` + VAD) → `yuji_raw_transcript.tsv`
(cols: idx, file, dur, lang, langprob, gloss) → `tools/curate_yuji_voice.py` (mechanical filter) → hand review.
Same pipeline proven on Reverse Flash / Batman / Omni-Man / Minato / Hisoka / Superman / Maki / Miwa / Ghostface.

**STATUS: REPORT ONLY — NOT WIRED.** This is the review artifact before any wiring pass (per brief Step 4).

---

## Language handling — TWO separate parallel pool sets (confirmed with owner)

Decision: **keep both languages, sorted into separate EN and JA pools** (the Maki approach), *not* filtered to one
language (the Miwa approach). Detected source-language split of the raw 564: **348 JA · 207 EN · 8 mis-detect**
(the rip runs roughly EN-first / JA-second). Both are curated below; a future wiring pass can pick a set (or gate
one to a dub toggle/skin, as Maki left room for).

---

## Result

| stage | count |
|---|---|
| raw clips | 564 |
| — SFX / non-speech discard (empty or grunt-only gloss) | 40 |
| — named OTHER-character discard (auto) | 13 |
| — non-EN/JA mis-detect discard (low-conf garbage) | 7 |
| **survivors after auto-filter** | **504** (EN 167 · JA 337) |
| — review-stage discard: **menu / story-mode narration** (lobby, chapter-select, main-menu VO) | ~230 |
| — review-stage discard: **near-duplicates** (kept one representative each; 44 groups) | ~72 |
| — review-stage discard: named-char slips the English spelling hid + garbled/untranslatable shouts + low-value filler | ~84 |
| **CURATED KEEP** | **118** (EN 46 · JA 72) |

> This is a *game-rip*, not a battle-only rip — a large fraction is menu/lobby/story-mode narration
> ("Shall we go back to the main menu?", "Please choose a chapter", "Let's make a lobby"). That's the single
> biggest discard bucket and the reason 564 → ~107.

---

## Technique-callout cross-reference (brief Step 3)

Flagged callouts checked directly against Yuji's **built** moves:

| callout (clips) | lang | built move | verdict |
|---|---|---|---|
| "Black Flash!" (078) | EN | **Ultimate — "Black Flash"** | ✅ exact match → EN.cast.blackFlash |
| "KOKUSEN!" 黒閃 (372, 373, 374, 380; 375 "Kokesu") | JA | **Ultimate — "Black Flash"** (黒閃 = *kokusen* = Black Flash) | ✅ exact match → JA.cast.blackFlash |
| "Divergent!" (082) | EN | **Heavy — "Divergent Fist"** | ✅ match → EN.cast.divergent |
| — | — | **Sukuna Slash** (down-down + special) | ⚠️ NO dedicated callout in the rip — no clip says "Sukuna". Would use a generic cast bark. |
| — | — | **Koma** flurry/finisher (ult payload) | ⚠️ NO dedicated "Koma" callout in the rip. Covered by the Black Flash + generic power lines. |
| "Sukuna" by name | — | (the curse in him) | none found — nothing to cross-ref or discard |

**Note for the wiring pass:** Black Flash (ult) and Divergent Fist (heavy) each have a clean dedicated line in
*both* languages; Sukuna Slash and Koma do not, so they'll draw from the general `cast` / `offense` pools.

---
---

# ENGLISH pool set (46 lines)

### EN.intro — pre-fight openers / taunts
| clip | line |
|---|---|
| yuji_voice_003_t00m09_1s.mp3 | "Focus." |
| yuji_voice_024_t01m52_2s.mp3 | "Now I'm warmed up!" |
| yuji_voice_025_t01m53_4s.mp3 | "Now I'm feeling it!" |
| yuji_voice_055_t03m25_8s.mp3 | "Let's win — I'm doing this." |
| yuji_voice_057_t03m29_9s.mp3 | "I didn't come here to lose." |
| yuji_voice_069_t03m52_4s.mp3 | "There's nothing to be afraid of." |
| yuji_voice_072_t04m01_9s.mp3 | "Let's go all out!" |
| yuji_voice_094_t04m49_1s.mp3 | "I'm just getting started!" |
| yuji_voice_128_t07m04_5s.mp3 | "Let's have some fun. Let's go." |
| yuji_voice_130_t07m09_6s.mp3 | "I'm looking forward to this." |
| yuji_voice_146_t08m01_3s.mp3 | "Let's do this!" |

### EN.offense — landing a hit / pressing the attack
| clip | line |
|---|---|
| yuji_voice_007_t00m33_2s.mp3 | "I'll wipe you out!" |
| yuji_voice_010_t00m43_4s.mp3 | "Put it in your fist!" |
| yuji_voice_011_t00m44_8s.mp3 | "With this fist!" |
| yuji_voice_014_t01m09_0s.mp3 | "Checkmate!" |
| yuji_voice_016_t01m37_9s.mp3 | "Take that!" |
| yuji_voice_019_t01m41_3s.mp3 | "Take this!" |
| yuji_voice_021_t01m44_7s.mp3 | "Found an opening." |
| yuji_voice_028_t02m08_0s.mp3 | "Let's put an end to this!" |
| yuji_voice_030_t02m10_8s.mp3 | "Follow through!" |
| yuji_voice_040_t02m43_6s.mp3 | "Come on!" |
| yuji_voice_043_t02m48_6s.mp3 | "You think that'll stop me?" |
| yuji_voice_075_t04m05_7s.mp3 | "I'll flatten you!" |
| yuji_voice_117_t06m17_8s.mp3 | "The next one's the last." |

### EN.cast — technique callouts (→ map to built specials)
| clip | line | → move |
|---|---|---|
| yuji_voice_078_t04m20_7s.mp3 | "Black Flash!" | Ultimate |
| yuji_voice_082_t04m28_1s.mp3 | "Divergent!" | Heavy (Divergent Fist) |
| yuji_voice_020_t01m42_4s.mp3 | "Full power! This is it!" | general cast / ult |
| yuji_voice_058_t03m32_1s.mp3 | "All out." | general cast |

### EN.hitReact — taking a hit
| clip | line |
|---|---|
| yuji_voice_045_t02m51_4s.mp3 | "Crap! I'm onto you!" |
| yuji_voice_046_t02m53_1s.mp3 | "That was close." |
| yuji_voice_047_t02m55_6s.mp3 | "I'm not done yet!" |
| yuji_voice_145_t07m57_9s.mp3 | "Damn! What?!" |
| yuji_voice_531_t19m57_0s.mp3 | "Shit!" |
| yuji_voice_291_t12m14_1s.mp3 | *(grunt)* "Gah!" |
| yuji_voice_281_t11m59_9s.mp3 | *(grunt)* "Ahh!" |
| yuji_voice_301_t12m27_2s.mp3 | *(grunt)* "Rrghh!" |

### EN.lowHealth — defiant, low on HP
| clip | line |
|---|---|
| yuji_voice_027_t02m04_9s.mp3 | "I'm not gonna lose now!" |
| yuji_voice_048_t02m59_8s.mp3 | "Won't get rid of me that easy." |
| yuji_voice_050_t03m05_3s.mp3 | "I'm still in this!" |
| yuji_voice_052_t03m08_2s.mp3 | "It's now or never." |

### EN.win — victory
| clip | line |
|---|---|
| yuji_voice_089_t04m42_1s.mp3 | "Piece of cake!" |
| yuji_voice_091_t04m43_8s.mp3 | "Have I got moves or what? That was a good fight!" |
| yuji_voice_096_t04m55_8s.mp3 | "How'd I do?" |
| yuji_voice_103_t05m15_8s.mp3 | "Not bad at all!" |
| yuji_voice_032_t02m14_7s.mp3 | "Yes! I did it!" |
| yuji_voice_124_t06m54_3s.mp3 | "I won't regret the way I live." |

---
---

# JAPANESE pool set (72 lines)
*(audio is Japanese; the text shown is the whisper English gloss for review — clips are curated from the JA audio.)*

### JA.intro — pre-fight openers
| clip | gloss |
|---|---|
| yuji_voice_189_t09m25_1s.mp3 | "Prepare yourself!" |
| yuji_voice_191_t09m27_9s.mp3 | "Don't look down on me!" |
| yuji_voice_234_t10m41_9s.mp3 | "If you don't mind — let's go!" |
| yuji_voice_337_t13m32_8s.mp3 | "Let's do this!" |
| yuji_voice_338_t13m34_3s.mp3 | "Alright, let's go!" |
| yuji_voice_340_t13m38_4s.mp3 | "I don't want to lose to anyone!" |
| yuji_voice_368_t14m33_2s.mp3 | "I want to be stronger!" |
| yuji_voice_422_t16m26_7s.mp3 | "Well, here we go!" |
| yuji_voice_455_t17m23_5s.mp3 | "Well, let's do it!" |
| yuji_voice_498_t18m44_9s.mp3 | "Let's have fun!" |
| yuji_voice_540_t20m12_0s.mp3 | "Let's do it!" |

### JA.offense — landing a hit / pressing the attack
| clip | gloss |
|---|---|
| yuji_voice_154_t08m38_5s.mp3 | "I'll crush you!" |
| yuji_voice_159_t08m45_9s.mp3 | "I'll attack you!" |
| yuji_voice_172_t09m03_6s.mp3 | "I'm going forward!" |
| yuji_voice_174_t09m05_9s.mp3 | "I'll make you pay for this!" |
| yuji_voice_179_t09m12_2s.mp3 | "Stop moving!" |
| yuji_voice_195_t09m34_9s.mp3 | "With this one blow!" |
| yuji_voice_198_t09m39_9s.mp3 | "Get out of my way!" |
| yuji_voice_201_t09m44_0s.mp3 | "Don't get in my way!" |
| yuji_voice_204_t09m48_0s.mp3 | "I'll finish it in one shot!" |
| yuji_voice_210_t09m57_3s.mp3 | "It's the end!" |
| yuji_voice_213_t10m02_5s.mp3 | "It's over!" |
| yuji_voice_216_t10m17_1s.mp3 | "This is it!" |
| yuji_voice_227_t10m31_1s.mp3 | "Take this!" |
| yuji_voice_232_t10m38_7s.mp3 | "I'll defeat you with this!" |
| yuji_voice_242_t10m52_4s.mp3 | "This is a one-shot!" |
| yuji_voice_245_t10m57_0s.mp3 | "It's decided — now!" |
| yuji_voice_255_t11m14_0s.mp3 | "More!" |
| yuji_voice_361_t14m21_7s.mp3 | "I will defeat you!" |
| yuji_voice_456_t17m25_1s.mp3 | "I'll catch you!" |
| yuji_voice_209_t09m55_8s.mp3 | "I'll beat you up!" |
| yuji_voice_230_t10m35_6s.mp3 | "Let's end this!" |
| yuji_voice_180_t09m13_6s.mp3 | *(harsh)* "Die!" |

### JA.cast — technique callouts + cursed-energy / power lines
| clip | gloss | → move |
|---|---|---|
| yuji_voice_372_t14m41_9s.mp3 | "KOKUSEN!" (黒閃 = Black Flash) | Ultimate |
| yuji_voice_373_t14m43_4s.mp3 | "KOKUSEN!" (黒閃) | Ultimate (alt take) |
| yuji_voice_202_t09m45_5s.mp3 | "I'm using my full power!" | ult / charge |
| yuji_voice_239_t10m48_6s.mp3 | "Full power!" | charge / cast |
| yuji_voice_241_t10m51_2s.mp3 | "It's full of power!" | charge |
| yuji_voice_254_t11m11_8s.mp3 | "The power's come to me!" | charge / cast |
| yuji_voice_203_t09m46_8s.mp3 | "Build it up!" | charge |
| yuji_voice_326_t13m10_6s.mp3 | "The energy's coming out!" | cursed-energy special |
| yuji_voice_256_t11m15_7s.mp3 | "This is my strength." | cast |
| yuji_voice_251_t11m06_7s.mp3 | "I've got a knife!" | slash special (Crescent / Sukuna Slash) |
| yuji_voice_430_t16m39_2s.mp3 | "Decide it — awakening technique!" | ult |
| yuji_voice_495_t18m38_9s.mp3 | "Power battle!" | cast |

### JA.hitReact — taking a hit
| clip | gloss |
|---|---|
| yuji_voice_220_t10m21_3s.mp3 | "Damn it!" |
| yuji_voice_266_t11m34_3s.mp3 | "That was close!" |
| yuji_voice_302_t12m28_9s.mp3 | "This is bad!" |
| yuji_voice_322_t13m04_6s.mp3 | "Oh no!" |
| yuji_voice_379_t14m54_7s.mp3 | "I can't take it!" |
| yuji_voice_388_t15m18_2s.mp3 | "I can't move!" |
| yuji_voice_233_t10m40_5s.mp3 | "Are you kidding me?" |
| yuji_voice_454_t17m20_9s.mp3 | "What the hell are you doing?" |
| yuji_voice_387_t15m14_9s.mp3 | *(grunt)* "Heh — damn it!" |

### JA.lowHealth — defiant, low on HP
| clip | gloss |
|---|---|
| yuji_voice_252_t11m08_4s.mp3 | "It's not over yet!" |
| yuji_voice_299_t12m23_7s.mp3 | "Not yet!" |
| yuji_voice_321_t13m02_8s.mp3 | "I won't give up!" |
| yuji_voice_364_t14m26_2s.mp3 | "I won't lose!" |
| yuji_voice_447_t17m09_4s.mp3 | "I can't lose either!" |
| yuji_voice_491_t18m31_0s.mp3 | "I don't want to regret it!" |
| yuji_voice_494_t18m37_0s.mp3 | "I don't feel like I'm going to lose." |
| yuji_voice_271_t11m42_2s.mp3 | "I can't bring it out yet!" *(can't reach full power — thematic)* |
| yuji_voice_273_t11m45_2s.mp3 | "At a time like this!" |

### JA.win — victory
| clip | gloss |
|---|---|
| yuji_voice_265_t11m32_3s.mp3 | "I managed to beat him!" |
| yuji_voice_367_t14m30_8s.mp3 | "Whoa — I finally did it!" |
| yuji_voice_371_t14m40_1s.mp3 | "I'm the best!" |
| yuji_voice_389_t15m19_8s.mp3 | "It was a good match!" |
| yuji_voice_444_t17m04_7s.mp3 | "It's a success!" |
| yuji_voice_448_t17m11_5s.mp3 | "I'm the winner!" |
| yuji_voice_369_t14m35_3s.mp3 | "I'm in a good mood!" |
| yuji_voice_406_t15m59_7s.mp3 | "I'll become even stronger!" |
| yuji_voice_464_t17m39_0s.mp3 | "That was a good match!" |

---
---

## Discard detail (for audit)

**SFX / non-speech (40)** — empty gloss or grunt-only (`is_sfx`): bare "you"/"uh"/"ha", punctuation-only,
single-letter. Examples: 017, 037, 044, 079, 081, 084, 087, 187, 217, 218, 221, 223, 276, 280, 282–290, 307,
315, 316, 376, 377, 381, 382, 525, 528, 529, 535, 538, 544, 546, 558, 560.

**Named OTHER-character — auto (13):** 061 (Fushiguro), 071 (Nanami), 097 (Gojo), 100 (Nanami), 352 (Gojo),
396 (Gojo), 550 (Fushiguro), 552 (Gugisaki→Kugisaki), 553 (Kugisaki), 554 (Gocho→Gojo), 555 (Gojo),
556 (Nanami), 557 (Nanami).

**Named OTHER-character — missed by gloss spelling, caught in review (~8):** 068 "Go Joe's here" (Gojo),
092 "You rock, Fuchiguro!" (Fushiguro), 095 "GO JOE!" (Gojo), 101 "…Toto!" (Todo), 356 "Mr. Nanomi!" (Nanami),
391 "Shiguro is…" (Fushiguro), 462 "Hey, Tama!", 551 "Shiguro!" (Fushiguro).

**Non-EN/JA mis-detect (7):** 000 "one two three…" (count-in), 158 "Xiu Jie" (zh garbage), 188 "META!" (ru),
238 "Hey!" (ko), 314 "EVERYONE!" (it), 409 "BEST FRIEND!" (pt), 524 "Okay!" (hi). All low langprob (<0.5).

**Menu / story-mode narration (largest bucket, ~230)** — not fight lines. Examples: 470–488 & 509–517 (lobby /
main-menu / chapter-select block), 350 "leave them in the comments", 440 "I'm not a detective", 493, 500, 502,
506–508, 559, 561, 563–565 (EN peers: 113–137, 152, 153).

**Near-duplicates (44 groups, ~72 redundant)** — kept one representative each. Largest: "Eugh." ×7,
"Let's do this!" ×6, "I'm going to kill you!" ×5, "Leave it to me!" ×4, "Damn it!" ×4, "KOKUSEN!" ×4.

**Garbled / untranslatable shouts (~10):** 165 "DOKEN!", 297 "NAMON!", 303 "Vare-Vare!", 332/378 "K.T.K.",
342 "Katsuwa!", 346 "BIFU!", 386 "Art competition!", 207 "Doutai Garaki!" — low-confidence mis-transcriptions
of effort shouts; not usable as clean lines.

---

## Next step (awaiting go-ahead)
Do **not** wire yet (per brief). On approval, the wiring pass would create `yujiVoice.js` mirroring `makiVoice.js`
with the pools above (EN + JA parallel sets), map `EN.cast.blackFlash` / `JA.cast.blackFlash` to the Black Flash
ultimate and `EN.cast.divergent` to the Divergent Fist heavy, route the rest (intro / offense / hitReact /
lowHealth / win) through the same `combat.js` / `game.js` hooks Maki uses, and add a `test:yuji-voice` harness.
