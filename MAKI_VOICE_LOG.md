# Maki Zenin — Voice Line Curation Log

**Source:** 537 clips (`maki_000…maki_536`), transcribed to `maki_raw_transcript.tsv` via faster-whisper
(cols: idx / file / dur / **audio-lang** / confidence / text). This log is the **curated, pool-categorized**
hand-review of that raw batch — the input the wiring task consumes. Nothing is wired yet.

## Language handling — TWO separate parallel pool sets (per brief)
The batch is two distinct dub sessions:
- **ENGLISH dub** = clips **000–097** (98 clips, all `en`). Audio is English.
- **JAPANESE dub** = clips **098–536** (439 clips, `ja`). Audio is Japanese; the transcript text is an
  English *translation* (so content is reviewable), but the **played audio is Japanese**.
- The scattered `en`/`it`/`ko`/`pl`/`es` tags inside 098–536 are Whisper mis-detections of silence or
  grunts (all empty-text or "UGH!") → noise, discarded.

They are kept as **two separate parallel pool structures** (EN.* and JA.*), NOT merged. This project has
**no per-character voice-language toggle** (checked: `sound`/character config expose no lang switch), so
the recommended wiring approach is **pick ONE language consistently for the wired module** and keep the
other language's pools documented here for a future toggle. **Recommendation: wire the JAPANESE set** —
Maki is a JJK (subbed-anime) character and the JA session is ~4½× larger (far better per-pool variety /
randomisation). The EN pools below are fully curated too, so switching later is a one-line pool swap.

## Result
- **Kept: 95** usable lines (**EN 40 · JA 55**), sorted into 7 pools per language.
- **Discarded: 442** — empty/near-empty (≈55), pure grunts (≈28), named JJK characters / twin-sister
  "Mai"/"Onee-chan" (≈22), team-assist / tag-switch / "leave it to you" co-op callouts (≈40, no teammate
  in 1v1), between-match info/banter & untranslatable garble (≈95), and the long-tail of redundant
  near-duplicate lines not needed for pool variety (the rest).
- **Per-pool (EN / JA):** intro 7/8 · specialCast 6/8 · combatBark 8/12 · hitReact 4/6 · lowHealth 5/9 ·
  shibuyaActivation 4/5 · win 6/7.

---

# ENGLISH pool set (clips 000–097)

### EN.intro  — pre-fight openers / taunts
| clip | line |
|---|---|
| maki_023_t01m40_6s.mp3 | "Now we're getting to the good stuff." |
| maki_030_t02m07_4s.mp3 | "I'll show you what I'm made of!" |
| maki_052_t03m23_8s.mp3 | "I'm just getting warmed up!" |
| maki_053_t03m25_4s.mp3 | "This is far from my full strength." |
| maki_055_t03m32_5s.mp3 | "This is what you get for taking me lightly." |
| maki_078_t06m29_8s.mp3 | "You have too many wasteful moves." |
| maki_082_t06m54_4s.mp3 | "Not as tough as I expected. You laughing at me?" |

### EN.specialCast  — map to built specials (random within sub-group)
**Kunai Throw** (projectile → "holes"):
| clip | line |
|---|---|
| maki_033_t02m12_4s.mp3 | "I'll fill you full of holes!" |
| maki_034_t02m14_8s.mp3 | "Yes, you need a few more holes!" |
**Nunchaku Flurry / weapon combo:**
| clip | line |
|---|---|
| maki_032_t02m10_6s.mp3 | "I'll cut through you." |
| maki_027_t02m02_6s.mp3 | "Think you can guard this?" |
**Power Charge** (self-buff windup):
| clip | line |
|---|---|
| maki_046_t03m06_9s.mp3 | "Full power! Take this!" |
| maki_051_t03m22_4s.mp3 | "That's not all I've got!" |

### EN.combatBark  — on landing a hit / offense
| clip | line |
|---|---|
| maki_000_t00m00_0s.mp3 | "Here, I'll leave you behind. Take that!" |
| maki_009_t00m18_7s.mp3 | "They're wide open." |
| maki_011_t00m43_4s.mp3 | "How'd you like this?" |
| maki_016_t00m58_1s.mp3 | "Your back's open, you know. Here we go!" |
| maki_021_t01m28_0s.mp3 | "Faster now!" |
| maki_026_t02m00_2s.mp3 | "I'll send you flying!" |
| maki_029_t02m05_1s.mp3 | "Victory's just ahead! Get outta here!" |
| maki_031_t02m09_2s.mp3 | "You can't stop this!" |

### EN.hitReact  — taking a hit
| clip | line |
|---|---|
| maki_013_t00m47_0s.mp3 | "Now then. Whoa!" |
| maki_060_t03m45_4s.mp3 | "That's all you got. Damn." |
| maki_062_t04m26_0s.mp3 | "So shameful, this…" |
| maki_045_t03m04_5s.mp3 | "What are you planning?" |

### EN.lowHealth  — hurt but still fighting (general)
| clip | line |
|---|---|
| maki_012_t00m45_6s.mp3 | "I can still move!" |
| maki_017_t01m16_6s.mp3 | "I haven't lost yet." |
| maki_018_t01m18_1s.mp3 | "Focus, dammit! I can still go!" |
| maki_005_t00m10_3s.mp3 | "I'm not done here!" |
| maki_037_t02m34_0s.mp3 | "This isn't where I die!" |

### EN.shibuyaActivation  — ≤25%-HP transformation cast cue ("getting serious / finish this")
| clip | line | note |
|---|---|---|
| maki_090_t07m47_1s.mp3 | **"I'm getting serious."** | ★ best match — literal "getting serious" |
| maki_025_t01m48_2s.mp3 | "The next one's the last. Time to finish this!" | |
| maki_058_t03m39_4s.mp3 | "Time to settle this!" | |
| maki_057_t03m38_0s.mp3 | "Now it's my turn." | |

### EN.win  — victory
| clip | line |
|---|---|
| maki_061_t03m48_0s.mp3 | "You're good." |
| maki_076_t06m21_4s.mp3 | "Guess this means it's over. This one's in the bag." |
| maki_084_t07m05_3s.mp3 | "It's over." |
| maki_086_t07m10_4s.mp3 | "I still think we were a pretty good match." |
| maki_091_t08m31_4s.mp3 | "Not bad." |
| maki_040_t02m47_1s.mp3 | "This is the end!" |

---

# JAPANESE pool set (clips 098–536)  — RECOMMENDED for wiring

### JA.intro  — pre-fight openers / taunts
| clip | line |
|---|---|
| maki_129_t10m20_7s.mp3 | "Don't underestimate me!" |
| maki_130_t10m22_5s.mp3 | "Are you ready?" |
| maki_136_t10m31_8s.mp3 | "Take a good look." |
| maki_139_t10m36_9s.mp3 | "Are you making fun of me?" |
| maki_339_t16m13_7s.mp3 | "Don't underestimate me!" |
| maki_453_t20m07_2s.mp3 | "Preparation exercise is over." |
| maki_456_t20m13_0s.mp3 | "If you don't feel like doing it, go home!" |
| maki_536_t22m41_0s.mp3 | "Are you ready?" |

### JA.specialCast  — map to built specials (technique callouts)
**Kunai Throw** ("open the hole"):
| clip | line |
|---|---|
| maki_122_t10m09_0s.mp3 | "I'll open the hole!" |
| maki_205_t12m21_4s.mp3 | "I'm going to inflate the hole!" |
**Nunchaku Flurry / weapon-name callouts** (real JA attack shouts):
| clip | line |
|---|---|
| maki_106_t09m44_4s.mp3 | "Kiritobasu!" (斬り飛ばす — slash away) |
| maki_193_t12m02_6s.mp3 | "Kudakechiru!" (砕け散る — shatter) |
| maki_211_t12m32_3s.mp3 | "Take this — Shindoken!" |
| maki_124_t10m13_1s.mp3 | "I'll crush you!" |
**Power Charge** (self-buff):
| clip | line |
|---|---|
| maki_128_t10m18_7s.mp3 | "I'll show you my power!" |
| maki_200_t12m12_9s.mp3 | "I'll show you my power!" |

### JA.combatBark  — on landing a hit / offense
| clip | line |
|---|---|
| maki_104_t09m41_6s.mp3 | "It's not over yet!" |
| maki_117_t10m01_7s.mp3 | "I'll win!" |
| maki_120_t10m05_9s.mp3 | "How about this?" |
| maki_121_t10m07_6s.mp3 | "Can you avoid it?" |
| maki_143_t10m43_1s.mp3 | "Behind you!" |
| maki_144_t10m44_3s.mp3 | "Your back is open!" |
| maki_188_t11m53_6s.mp3 | "Try to avoid it!" |
| maki_189_t11m55_2s.mp3 | "I'm going to make you pay for this!" |
| maki_264_t14m06_3s.mp3 | "This is my turn!" |
| maki_300_t15m08_0s.mp3 | "I'll beat you up!" |
| maki_125_t10m14_6s.mp3 | "Fly away!" |
| maki_177_t11m37_2s.mp3 | "What do you think?" |

### JA.hitReact  — taking a hit
| clip | line |
|---|---|
| maki_109_t09m48_5s.mp3 | "I can't believe it!" |
| maki_126_t10m15_9s.mp3 | "This guy hurts!" |
| maki_133_t10m26_9s.mp3 | "That was close!" |
| maki_303_t15m12_3s.mp3 | "That was close." |
| maki_170_t11m26_1s.mp3 | "You made me lose my sight!" |
| maki_321_t15m43_9s.mp3 | "What the hell is this?!" |

### JA.lowHealth  — hurt but still fighting (general)
| clip | line |
|---|---|
| maki_155_t11m02_2s.mp3 | "My body is still moving!" |
| maki_159_t11m09_2s.mp3 | "I haven't lost yet." |
| maki_161_t11m12_5s.mp3 | "I can still do it!" |
| maki_220_t12m46_7s.mp3 | "This is not my place to die!" |
| maki_280_t14m32_9s.mp3 | "I'm not tired!" |
| maki_307_t15m19_5s.mp3 | "Not yet!" |
| maki_314_t15m31_5s.mp3 | "I can still do it!" |
| maki_336_t16m08_1s.mp3 | "I'm not going to die." |
| maki_478_t20m53_7s.mp3 | "I won't give up!" |

### JA.shibuyaActivation  — ≤25%-HP transformation cast cue ("here we go / turn it around")
| clip | line | note |
|---|---|---|
| maki_316_t15m35_2s.mp3 | **"I'm going to turn it upside down from here!"** | ★ best match — the comeback beat |
| maki_266_t14m10_0s.mp3 | "This is where it starts!" | strong activation |
| maki_454_t20m09_3s.mp3 | "Seriously — let's go!" | "getting serious" |
| maki_190_t11m57_2s.mp3 | "To the limit!" | |
| maki_380_t17m41_5s.mp3 | "I'm going higher!" | |

### JA.win  — victory
| clip | line |
|---|---|
| maki_225_t13m03_2s.mp3 | "It's over!" |
| maki_396_t18m10_9s.mp3 | "It's my win." |
| maki_422_t19m09_9s.mp3 | "It's over." |
| maki_474_t20m47_9s.mp3 | "It was a good match." |
| maki_424_t19m15_6s.mp3 | "I don't think it was a bad match." |
| maki_376_t17m32_4s.mp3 | "Well, it's not bad, is it?" |
| maki_508_t21m48_8s.mp3 | "See you next time!" |

---

## Discard summary (419)
- **Empty / near-empty** (~55): confidence ≈0.39 blank rows — 019, 039, 042, 043, 194, 203, 222, 224,
  226, 228, 234, 235, 241, 242, 246, 274, 286, 288–292, 304, 348, 387, 392, … (Whisper silence).
- **Pure grunts / laughs** (~28): 002, 048, 095, 147, 214, 215, 244, 245, 247, 282–285, 299, 306, 356,
  385, 388, 495 ("Tyson"), 516, 518, 519 — non-lexical.
- **Named JJK characters / twin sister** (~22): Megumi (066, 077, 343, 398), Toge (068), Panda (070, 416),
  Toga (080), Mai / "Onee-chan"/"little sister"/"my" (073, 074, 085, 367, 368), + garbled proper names
  (Tamaru 156, Engo 420, Tatoru 483, Kyorenge 445, Hachida 437, Hirotsu 517, Kiyari 112).
- **Team-assist / tag-switch / co-op** (~40): "back me up" (069), "watch my back" (070), "nice switch"
  (087), "let's switch places" (429), "I'll leave it to you / leave the support to you / watch my back"
  (340, 346, 355, 358, 429, 440, 441, 450, 461, 513, …) — no teammate exists in 1v1.
- **Between-match info / banter / untranslatable garble** (~95+): "Please subscribe to my channel" (250),
  "Let's play rock-paper-scissors" (502), "Communication is important during battle" (485), "parsley"
  (466), "It's decided then, backing out" (097), etc. — plus the redundant near-duplicate long tail not
  needed for pool variety.

## Notes / flags for the wiring pass
- **Shibuya activation is separated from general low-health** per the brief: EN `maki_090` "I'm getting
  serious" and JA `maki_316` "turn it upside down from here" are the flagged ★ activation-cue lines; the
  low-health pools hold the general "still moving / not done" reactions.
- **Special-cast sub-groups** map to the three built specials (Kunai Throw / Nunchaku Flurry / Power
  Charge). Maki has **no dedicated taunt action** (confirmed in build) — the intro/taunt pool should fire
  on **intro only** (same fallback as Rengoku/Shinobu/Samurai), OR its taunt lines fold into combatBark;
  decide at wiring time. Flagged, not fabricated.
- All clip filenames above are exact on-disk names (verified against the 537-file set).
