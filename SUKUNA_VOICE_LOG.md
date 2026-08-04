# Ryomen Sukuna — Voice Line Curation Log

**Source:** 685 clips `sukuna_new_000..684` (a mixed EN/JA fighting-game voice rip; per-clip label is only a
timestamp). This is the **replacement source** after Sukuna's prior voice pool was deleted entirely on
2026-08-04 (audio-only removal; specials kept their silent trigger points — see the deletion memo).

**Pipeline:** `tools/transcribe_sukuna.py` (faster-whisper `small`, VAD; **two passes per clip** — `task="translate"`
for the English gloss **and** `task="transcribe"` for the native JA text) → `sukuna_raw_transcript.tsv`
(cols: idx, file, dur, lang, langprob, native, gloss) → `tools/curate_sukuna_voice.py` (mechanical filter) →
hand review. Same pipeline proven on Reverse Flash / Batman / Omni-Man / Minato / Hisoka / Superman / Maki /
Miwa / Yuji. **The native-transcription pass is Sukuna-specific:** a translate-only gloss smears his Japanese
technique callouts (領域展開 / 伏魔御廚子 / 開 / 捌) into generic English, so the native text was needed for Step 3.

**STATUS: REPORT ONLY — NOT WIRED.** This is the review artifact before any wiring pass (per brief Step 4).

---

## Language handling — TWO separate parallel pool sets (confirmed with owner)

Decision: **keep both languages, sorted into separate EN and JA pools** (the Maki / Yuji approach), *not*
filtered to one language (the Miwa approach). Owner picked "Both, separate pools" after seeing the split.

Detected source-language split of the raw 685: **384 EN · 273 JA · 28 other-lang mis-detect.** The rip runs
**EN-first (000–338) then JA-second (339–684)**, cleanly. Notes that drove the presentation of the choice:

- **EN is the cleaner set** — whisper confidence mostly **0.95–0.99**, coherent full sentences, reliably curatable.
- **JA is authentic but noisier to transcribe** — real JP-dub Sukuna (許さんぞ, 一切の行動を禁ずる, 動くな), but ASR on
  short shouts is lower-confidence and some glosses are garbled. This affects *my curation confidence only*, not
  the final audio quality.
- **The JA set owns the definitive domain callouts** (領域展開 → 伏魔御廚子) that EN only approximates
  ("Malevolent Shrine"). That alone is a strong reason both were kept.

Both are curated below. A future wiring pass can play both, or gate JA to a dub toggle / skin (as Maki left room
for). This rip is **battle-only** — unlike Yuji's game rip there is almost no menu/story-mode narration to strip.

---

## Result

| stage | count |
|---|---|
| raw clips | 685 |
| — SFX / non-speech discard (empty or grunt-only gloss) | 20 |
| — named OTHER-character discard | **0** (none found — Sukuna never name-drops another fighter in this rip) |
| — other-lang mis-detect discard (low-conf JA-as-Russian/Portuguese/etc. over short shouts) | 28 |
| **survivors after auto-filter** | **637** (EN 364 · JA 273) |
| — review-stage discard: **low-confidence EN tail** (clips 346+ = JA audio hallucinated into English: "Birken", "Warina", "Tozenda", "Gumbare", "Summer") | ~55 |
| — review-stage discard: **"Thank you for watching!" whisper hallucination** (on outro/silence) | 5 |
| — review-stage discard: **near-duplicates** (kept one representative each; 52 groups) | ~70 |
| — review-stage discard: bare grunts / laughs / interjections + garbled untranslatable shouts + low-value filler | ~362 |
| **CURATED KEEP** | **145** (EN 80 · JA 65) |

> Big picture: this is a **high-quality battle rip**. The dominant discard bucket is not menu narration (as it
> was for Yuji) but sheer **volume + repetition** — the same handful of intents ("Die", "Too slow", "Boring",
> "Take this", laughter) recur dozens of times, so near-dup consolidation does most of the trimming.

---

## Technique-callout cross-reference (brief Step 3)

Flagged callouts checked directly against Sukuna's **built** moves (from `abilities.js`):

| built move | input | EN callout (clips) | JA callout (clips) | verdict |
|---|---|---|---|---|
| **Cleave** (斬・開) | neutral Special | "Open." (199) · "I'll cleave through it." (063) · "CLEE…" frags (200, 226) | 部を開きまえろ (571, garbled) | ✅ "Open." = 開 (*kai*) — Cleave's actual callout. Clean match → `cast.cleave` |
| **Dismantle** (捌) | Back + Special | — (no clean EN "Dismantle") | むしずがいはしる (394, garbled) | ⚠️ **No clean callout in either language.** Draws from general `cast` / `offense`. |
| **Flame Arrow "Fuga"** (フーガ) | Fwd + Special | "I'll burn you to nothing." (066) · "Let's see whose flames are hotter." (067) · "Going even hotter." (108) | 焼き尽くす (406) · 火力勝負といこう (407) | ⚠️ **No literal "Fuga" (フーガ) in the rip** — but strong fire-flavor lines in both langs stand in → `cast.flame`. |
| **Cursed Slash** (auto-target hand-sign) | Down + Special | — | — | ⚠️ **No dedicated callout** (this move is newly built). Draws from general `cast`. |
| **Malevolent Shrine / Domain Expansion** | Ultimate | "Malevolent Shrine" (221, clean) · "Malevolent Shry…" (201) · "…Main Expansion" (220 — **prob. "Domain Expansion", confirm by ear**) | **領域展開** (560) → **伏魔御廚子** (561) · くまみずし (538, partial) | ✅✅ **Best match in the set.** JA has the canonical two-beat call: 領域展開 (*Ryoiki Tenkai*) then 伏魔御廚子 (*Fukuma Mizushi*). Wire as ordered ult pair → `cast.domain`. |
| **King of Curses flavor** | — (ult / low-HP) | "Time for an awakened move." (252) · "Time to teach you what curses really are." (299) | 命を燃やすのはこれからだ (625) | ✅ ult / low-HP color. |

**Notes for the wiring pass:**
- Only **Cleave** and **the Domain ult** have clean dedicated callouts. **Dismantle, Flame Arrow, and Cursed
  Slash have none** — they'll draw from the general `cast`/`offense` pools (like Yuji's Sukuna Slash & Koma did).
- The JA **領域展開 → 伏魔御廚子** pair (560 → 561) should fire in order at the ult cast, not shuffled.
- Clip **220 "No Main Expansion"** is almost certainly a whisper mis-hear of **"Domain Expansion"** (0.98 conf,
  1.60s) — **listen before wiring**; if confirmed it's the clean EN ult callout.

---
---

# ENGLISH pool set (80 lines)

### EN.intro — pre-fight openers
| clip | line |
|---|---|
| sukuna_new_008_t00m20_7s.mp3 | "Judge this if you can." |
| sukuna_new_058_t01m38_1s.mp3 | "Let's put you through your paces." |
| sukuna_new_073_t01m59_9s.mp3 | "This is a good opportunity." |
| sukuna_new_126_t03m21_4s.mp3 | "This might be some fun." |
| sukuna_new_173_t04m47_8s.mp3 | "Are we starting now?" |
| sukuna_new_202_t05m41_5s.mp3 | "Do you have a death wish?" |
| sukuna_new_274_t08m00_1s.mp3 | "There's no reason to be scared." |
| sukuna_new_293_t08m41_8s.mp3 | "This is gonna be fun." |
| sukuna_new_304_t09m01_4s.mp3 | "Shall we play?" |

### EN.taunt — mocking / bored / arrogant (Sukuna's signature register)
| clip | line |
|---|---|
| sukuna_new_002_t00m11_1s.mp3 | "How infuriating." |
| sukuna_new_016_t00m32_3s.mp3 | "Don't be so arrogant." |
| sukuna_new_026_t00m47_5s.mp3 | "Don't get conceited." |
| sukuna_new_075_t02m03_1s.mp3 | "I've grown so bored with you." |
| sukuna_new_077_t02m10_0s.mp3 | "So dull." |
| sukuna_new_125_t03m19_6s.mp3 | "I expected more." |
| sukuna_new_138_t03m44_1s.mp3 | "What a disappointment." |
| sukuna_new_182_t05m04_5s.mp3 | "Know your place." |
| sukuna_new_216_t06m10_0s.mp3 | "You lot are putting me to sleep." |
| sukuna_new_219_t06m17_9s.mp3 | "I'm sick of all the cannon fodder." |
| sukuna_new_231_t06m40_9s.mp3 | "Don't forget your place, foolish puppet." |
| sukuna_new_276_t08m03_7s.mp3 | "You couldn't be any more pathetic." |
| sukuna_new_278_t08m10_0s.mp3 | "You're just so predictable." |
| sukuna_new_303_t08m58_9s.mp3 | "Weaklings just bore me to pieces." |

### EN.offense — landing a hit / pressing the attack
| clip | line |
|---|---|
| sukuna_new_015_t00m30_8s.mp3 | "I'll bury you." |
| sukuna_new_030_t00m53_9s.mp3 | "I'll kill you." |
| sukuna_new_035_t01m01_0s.mp3 | "Crawl on the ground!" |
| sukuna_new_044_t01m17_5s.mp3 | "Go to hell." |
| sukuna_new_046_t01m20_5s.mp3 | "I'll carve you up." |
| sukuna_new_051_t01m27_7s.mp3 | "I'll take you down." |
| sukuna_new_053_t01m30_7s.mp3 | "I'll cut you." |
| sukuna_new_065_t01m47_3s.mp3 | "I'll kill you all!" |
| sukuna_new_088_t02m23_1s.mp3 | "Die here." |
| sukuna_new_091_t02m26_8s.mp3 | "Try to resist for longer." |
| sukuna_new_092_t02m28_8s.mp3 | "Take this!" |
| sukuna_new_094_t02m31_0s.mp3 | "I'll give you something good." |
| sukuna_new_107_t02m50_0s.mp3 | "Try to endure this." |
| sukuna_new_110_t02m54_8s.mp3 | "Try to block this." |
| sukuna_new_111_t02m56_3s.mp3 | "I'll blow you away!" |
| sukuna_new_129_t03m28_4s.mp3 | "I'll show you the difference in our levels." |
| sukuna_new_135_t03m39_7s.mp3 | "Here's more!" |
| sukuna_new_249_t07m12_0s.mp3 | "I'll kill this one." |

### EN.cast — technique callouts (→ map to built specials)
| clip | line | → move |
|---|---|---|
| sukuna_new_221_t06m22_3s.mp3 | "Malevolent Shrine" | **Ultimate** (clean) |
| sukuna_new_201_t05m39_0s.mp3 | "Malevolent Shry…" | Ultimate (alt take) |
| sukuna_new_220_t06m20_4s.mp3 | "…Main Expansion" (prob. "Domain Expansion") | **Ultimate** — confirm by ear |
| sukuna_new_199_t05m36_9s.mp3 | "Open." | **Cleave** (開) |
| sukuna_new_063_t01m44_8s.mp3 | "I'll cleave through it." | Cleave |
| sukuna_new_066_t01m49_2s.mp3 | "I'll burn you to nothing." | Flame Arrow |
| sukuna_new_067_t01m50_9s.mp3 | "Let's see whose flames are hotter." | Flame Arrow |
| sukuna_new_108_t02m51_7s.mp3 | "Going even hotter." | Flame Arrow |
| sukuna_new_252_t07m18_6s.mp3 | "Time for an awakened move." | ult / general cast |
| sukuna_new_299_t08m50_8s.mp3 | "Time to teach you what curses really are." | general cast |

### EN.hitReact — taking a hit (Sukuna is *entertained* by good hits)
| clip | line |
|---|---|
| sukuna_new_099_t02m38_5s.mp3 | "That feels great!" |
| sukuna_new_151_t04m08_8s.mp3 | "Now you've annoyed me." |
| sukuna_new_152_t04m10_4s.mp3 | "Good hit." |
| sukuna_new_153_t04m11_6s.mp3 | "That's the spirit." |
| sukuna_new_171_t04m43_7s.mp3 | "You're not bad at all." |
| sukuna_new_180_t04m59_8s.mp3 | "Perhaps you are a worthy opponent." |
| sukuna_new_184_t05m08_3s.mp3 | "Well, this is stimulating." |
| sukuna_new_186_t05m12_2s.mp3 | "You're strong." |
| sukuna_new_204_t05m45_8s.mp3 | "Magnificent." |
| sukuna_new_238_t06m53_7s.mp3 | "Now you've got my attention." |
| sukuna_new_272_t07m54_7s.mp3 | "Oh, interesting." |
| sukuna_new_316_t09m23_5s.mp3 | "Excellent." |

### EN.lowHealth — pressed, escalating
| clip | line |
|---|---|
| sukuna_new_078_t02m11_3s.mp3 | "I'm just getting started." |
| sukuna_new_119_t03m10_2s.mp3 | "I'm not done yet." |
| sukuna_new_131_t03m32_8s.mp3 | "I'm warmed up enough now." |
| sukuna_new_165_t04m33_4s.mp3 | "I have nothing to fear yet." |
| sukuna_new_166_t04m35_2s.mp3 | "Get serious." |
| sukuna_new_267_t07m44_8s.mp3 | "I'm getting into it now." |

### EN.win — victory
| clip | line |
|---|---|
| sukuna_new_071_t01m57_1s.mp3 | "This is the end." |
| sukuna_new_076_t02m05_4s.mp3 | "This sideshow is over." |
| sukuna_new_109_t02m53_4s.mp3 | "It's over." |
| sukuna_new_132_t03m34_7s.mp3 | "Now to end you." |
| sukuna_new_139_t03m46_0s.mp3 | "Did you really think you'd win?" |
| sukuna_new_140_t03m47_9s.mp3 | "You were out of your depth." |
| sukuna_new_229_t06m35_8s.mp3 | "Whether you live or die is of no consequence to me." |
| sukuna_new_240_t06m57_4s.mp3 | "You did well." |
| sukuna_new_288_t08m32_2s.mp3 | "The next one's the last one." |
| sukuna_new_305_t09m03_2s.mp3 | "Cut your squealing. You got off lightly." |
| sukuna_new_335_t09m53_6s.mp3 | "It is done." |

---
---

# JAPANESE pool set (65 lines)
*(native JA text shown first; the whisper English gloss follows for review only — clips are curated from the JA audio.
Several glosses are rough — the JA line is the source of truth.)*

### JA.intro — pre-fight openers
| clip | native | gloss |
|---|---|---|
| sukuna_new_458_t13m34_4s.mp3 | さて、やるか | "Well, let's do it." |
| sukuna_new_348_t10m27_3s.mp3 | よけてみろ | "Try to dodge." |
| sukuna_new_358_t10m43_0s.mp3 | 受けてみろ | "Try to take this." |
| sukuna_new_434_t12m50_9s.mp3 | どんなところか | "Let's see what you've got." |
| sukuna_new_540_t16m25_7s.mp3 | 死にたいのか? | "Do you want to die?" |
| sukuna_new_546_t16m36_7s.mp3 | ほらかかってこい | "Come on, come at me." |
| sukuna_new_551_t16m43_4s.mp3 | 相手をしてやろう | "I'll deal with you." |
| sukuna_new_651_t20m07_2s.mp3 | 遊んでやろう | "Let's play." |

### JA.taunt — mocking / bored / arrogant
| clip | native | gloss |
|---|---|---|
| sukuna_new_415_t12m16_1s.mp3 | 貴様にも飽きたな | "I've grown tired of you." |
| sukuna_new_460_t13m38_7s.mp3 | 本気を出すまでもない | "No need for me to get serious." |
| sukuna_new_461_t13m41_1s.mp3 | この程度か | "Is this all?" |
| sukuna_new_474_t14m08_9s.mp3 | 期待外れだ | "What a letdown." |
| sukuna_new_519_t15m41_2s.mp3 | 許可なく見上げるな | "Don't look up without permission." |
| sukuna_new_520_t15m43_6s.mp3 | 思い上がるなよ | "Don't get cocky." |
| sukuna_new_556_t16m56_9s.mp3 | つまらん奴らばかりだな | "Nothing but boring fools." |
| sukuna_new_557_t16m59_7s.mp3 | ゴミばかりでつまらんな | "Nothing but trash — boring." |
| sukuna_new_558_t17m02_6s.mp3 | この時代にまともなやつはいないみたいだな | "Seems there's no one decent in this era." |
| sukuna_new_567_t17m23_4s.mp3 | 実につまらんな | "Truly boring." |
| sukuna_new_624_t19m11_2s.mp3 | お前はつまらんな | "You're boring." |
| sukuna_new_650_t20m04_5s.mp3 | ザコの相手などつまらん | "Fighting weaklings is boring." |

### JA.offense — landing a hit / pressing the attack
| clip | native | gloss |
|---|---|---|
| sukuna_new_339_t10m10_9s.mp3 | 吹き飛べ | "Blow away." |
| sukuna_new_343_t10m17_2s.mp3 | 消えろ! | "Disappear!" |
| sukuna_new_349_t10m29_0s.mp3 | 遅い | "Too slow." |
| sukuna_new_364_t10m54_1s.mp3 | 許さんぞ | "I won't forgive you." |
| sukuna_new_366_t10m57_4s.mp3 | 寝てろ | "Stay down." |
| sukuna_new_370_t11m03_1s.mp3 | 死ね! | "Die!" |
| sukuna_new_371_t11m04_3s.mp3 | 動くな | "Don't move." |
| sukuna_new_373_t11m07_6s.mp3 | 一切の行動を禁ずる | "I forbid all action." |
| sukuna_new_384_t11m27_2s.mp3 | くたばれ | "Drop dead." |
| sukuna_new_405_t11m59_3s.mp3 | まとめて殺す | "I'll kill you all at once." |
| sukuna_new_409_t12m06_6s.mp3 | お返しだ | "Payback." |
| sukuna_new_410_t12m08_2s.mp3 | 逃がさんぞ | "You won't escape." |
| sukuna_new_429_t12m43_3s.mp3 | もっと抵抗してみろ | "Resist a little more." |
| sukuna_new_431_t12m46_9s.mp3 | 受け取れ | "Take this." |
| sukuna_new_432_t12m48_1s.mp3 | いいものをやろう | "I'll give you something good." |
| sukuna_new_452_t13m22_8s.mp3 | 受け止めてみろ | "Try to withstand it." |
| sukuna_new_598_t18m20_9s.mp3 | 殺しに行くぞ | "Going in for the kill." |

### JA.cast — technique callouts (→ map to built specials)
| clip | native | → move |
|---|---|---|
| sukuna_new_560_t17m09_9s.mp3 | **領域展開** (*Ryoiki Tenkai*) | **Ultimate — Domain Expansion** (fire 1st) |
| sukuna_new_561_t17m12_2s.mp3 | **伏魔御廚子** (*Fukuma Mizushi*) | **Ultimate — Malevolent Shrine** (fire 2nd) |
| sukuna_new_406_t12m01_3s.mp3 | 焼き尽くす | Flame Arrow |
| sukuna_new_407_t12m03_0s.mp3 | 火力勝負といこう | Flame Arrow ("a battle of firepower") |
| sukuna_new_445_t13m10_5s.mp3 | 出力をあげるぞ | charge / general cast ("raising my output") |
| sukuna_new_502_t15m06_9s.mp3 | もっと呪いを込めて | general cast ("pour in more curse") |
| sukuna_new_526_t15m55_2s.mp3 | 術式を使うまでもない | general cast ("no need to even use my technique") |

### JA.hitReact — taking a hit
| clip | native | gloss |
|---|---|---|
| sukuna_new_437_t12m56_5s.mp3 | 気持ちいいね | "That feels good." |
| sukuna_new_486_t14m40_6s.mp3 | 良い攻撃だ | "Nice attack." |
| sukuna_new_488_t14m44_5s.mp3 | もっとだ | "More!" |
| sukuna_new_507_t15m17_0s.mp3 | 楽しくなってきた | "This is getting fun." |
| sukuna_new_515_t15m32_6s.mp3 | 面白い | "Interesting." |
| sukuna_new_522_t15m47_6s.mp3 | いい刺激だ | "A good stimulus." |
| sukuna_new_542_t16m30_2s.mp3 | 素晴らしい! | "Wonderful!" |
| sukuna_new_663_t20m32_3s.mp3 | いいぞ | "Good." |

### JA.lowHealth — pressed, escalating
| clip | native | gloss |
|---|---|---|
| sukuna_new_418_t12m25_6s.mp3 | まだまだ行くぞ | "I'm not done yet." |
| sukuna_new_469_t13m60_0s.mp3 | まだ行くぞ | "Still going." |
| sukuna_new_472_t14m05_1s.mp3 | 終わりじゃないぞ | "It's not over yet." |
| sukuna_new_625_t19m13_6s.mp3 | 命を燃やすのはこれからだ | "Now I start burning my life." |

### JA.win — victory
| clip | native | gloss |
|---|---|---|
| sukuna_new_411_t12m09_9s.mp3 | 終わりだ | "It's over." |
| sukuna_new_416_t12m18_4s.mp3 | 余興はここまで | "The sideshow ends here." |
| sukuna_new_467_t13m56_1s.mp3 | 仕込みは終わりだ | "The setup is finished." |
| sukuna_new_473_t14m06_9s.mp3 | 次はおまえだ | "You're next." |
| sukuna_new_475_t14m10_8s.mp3 | 勝てると思ったか? | "Did you think you could win?" |
| sukuna_new_553_t16m46_4s.mp3 | つまらん相手だったな | "A boring opponent." |
| sukuna_new_635_t19m35_7s.mp3 | 次が最後だ | "The next is the last." |
| sukuna_new_637_t19m39_6s.mp3 | 多少は楽しめたぞ | "I enjoyed that, somewhat." |
| sukuna_new_673_t20m57_0s.mp3 | よくやった | "Well done." |

---

## Next step (awaiting go-ahead — brief Step 4)

This is report-only. On approval, the wiring pass would mirror `makiVoice.js` / `miwaVoice.js`: a new
`sukunaVoice.js` with the pools above (EN + JA parallel, JA gate-able to a dub toggle), cast hooks in
`abilities.js` at the Cleave / Flame Arrow / Cursed Slash / ult beats (the ordered 領域展開→伏魔御廚子 pair at the
domain cast), hit/offense/low-HP hooks in `combat.js`, and intro/win in `game.js` — plus a `test:sukuna-voice`
harness. **Not started.** Two things to confirm by ear first: clip **220** ("Domain Expansion"?) and whether the
JA ult pair timing lines up with the domain cinematic.
