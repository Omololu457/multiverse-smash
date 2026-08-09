# Ghostface — Voice Line Curation Log

**Source:** 338 clips (`ghostface_000…ghostface_337`, English, MK1 rip), transcribed to
`ghostface_raw_transcript.tsv` via faster-whisper `base.en` + VAD (`tools/transcribe_ghostface.py`) —
same pipeline proven on Reverse Flash / Batman / Omni-Man / Minato / Hisoka / Superman. Cols:
idx / file / dur / conf / text. The 98 VAD-empty clips were re-checked WITHOUT VAD (`small.en`,
`ghostface_novad_empties.tsv`) to be sure no faint speech was dropped — confirmed all non-speech.

This is the **curated, pool-categorized** hand-review — the input a future wiring task consumes.
**Nothing is wired.** (Report-only, per brief Step 4.)

## Result
- **Kept: 55** usable standalone lines, sorted into 7 pools + a flagged move-callout list.
- **Discarded: 283**, in four buckets (approximate hand-review counts — categories overlap):
  - **~126 non-speech / SFX** — the 98 VAD-empty clips (the entire `220–337` combat-effort bank: stabs,
    grunts, "WOAH!/Whoosh!/RAAH!", breaths, silence) + ~28 scattered laughs/grunts among the rest
    (`023`, `208–230`, `263/264`, `293`, `308–327`). The no-VAD recheck returned only Whisper
    hallucinations ("Thanks for watching!", "THE END", "MUSIC", "You", "No no no") = confirmed non-speech.
  - **~55 name/reference another specific character** — the MK1 opponent-intro block (`098–121`:
    "Outworld", "dissected reptiles" / "Zaterran leather" (Reptile), "your friend Harumi", "kill a
    princess", "your fangs", "those horns", "your daughters", "brother", "lady friend in yellow/red")
    + `045` "a superman goes fascist" (Superman), `043` "Poor Christina", `069` "Billy", `081` "Friday
    the 13th", `139` "Baraka", `146` "guy with the glove and fedora" (Freddy), `153` "Stu", `208`
    "CLOWN!", etc. Per Step 2, all discarded.
  - **~55 incomplete fragments / two-way MK1 intro dialog** unusable standalone (`060–063`, `068`,
    `079/080`, `122`, `133`, `137`, `140–166` back-and-forth bits like "Really", "Why?", "No.", "Check
    the wiki", "You're right", "Of course it is", "honor", "farm boy").
  - **~47 near-duplicates** — the "favorite scary movie?" cluster (`044/047/071/095` vs the kept `049`)
    and the long tail of interchangeable "I'm gonna [carve/rip/cut/stab/slice] you" kill-threats
    (`005/008/009/011/024/048/050–057/065/066/072–078/082/083/088/091/092/094/116/120/121/127–130/135/173…`
    — a handful kept as representatives, the rest dropped for pool variety).

---

## Pools (English — single dub)

### intro — pre-fight openers
| clip | line |
|---|---|
| ghostface_049_t02m04_8s.mp3 | "What's your favorite scary movie?" |
| ghostface_007_t00m18_7s.mp3 | "Don't you watch scary movies?" |
| ghostface_037_t01m27_1s.mp3 | "Are you watching?" |
| ghostface_036_t01m25_2s.mp3 | "This is my movie!" |
| ghostface_025_t00m59_7s.mp3 | "It's a simple game." |
| ghostface_180_t09m02_8s.mp3 | "Yeah, be afraid. Be very afraid." |
| ghostface_132_t06m40_1s.mp3 | "Fine. No small talk. It's straight to the violence." |
| ghostface_012_t00m32_4s.mp3 | "Did you miss me?" |
| ghostface_010_t00m26_2s.mp3 | "Do you want to die tonight?" |

### taunt — mid-fight jeers
| clip | line |
|---|---|
| ghostface_028_t01m06_4s.mp3 | "Hahaha! Better start running!" |
| ghostface_201_t09m58_6s.mp3 | "Afraid of a little jump scare?" |
| ghostface_013_t00m34_3s.mp3 | "You're too weak for this franchise." |
| ghostface_187_t09m23_6s.mp3 | "Quit stealing my lines!" |
| ghostface_126_t06m18_3s.mp3 | "You auditioning to wear this mask next?" |
| ghostface_029_t01m09_5s.mp3 | "Cut the crap!" |
| ghostface_168_t08m24_5s.mp3 | "If you could see my smile, you'd know that's bullshit." |
| ghostface_179_t08m59_1s.mp3 | "Go ahead, give it your best shot!" |

### specialCast — technique/attack callouts (also see the move-callout flags below)
| clip | line |
|---|---|
| ghostface_155_t07m46_6s.mp3 | "STAB!" |
| ghostface_038_t01m29_1s.mp3 | "I'll gut you!" |
| ghostface_022_t00m53_5s.mp3 | "Kill, kill, kill!" |
| ghostface_129_t06m28_1s.mp3 | "How about the knife? It's gonna rip through your flesh!" |
| ghostface_163_t08m09_6s.mp3 | "Who needs a knife? I'm already under your skin." |
| ghostface_040_t01m33_3s.mp3 | "Cut flesh, scrape bone." |
| ghostface_084_t03m54_5s.mp3 | "Got time for a little hack-and-slash." |
| ghostface_093_t04m23_9s.mp3 | "You want to see magic? I'm a wizard with a knife!" |
| ghostface_042_t01m39_5s.mp3 | "So many ways to kill!" |

### combatBark — on landing a hit / offense
| clip | line |
|---|---|
| ghostface_039_t01m31_2s.mp3 | "So much fun!" |
| ghostface_085_t03m57_7s.mp3 | "This is gonna be my most epic kill ever." |
| ghostface_031_t01m13_2s.mp3 | "That was overdue." |
| ghostface_136_t06m52_5s.mp3 | "Looks like I struck a nerve." |
| ghostface_167_t08m20_8s.mp3 | "It's about to be drenched in your blood." |
| ghostface_046_t01m54_7s.mp3 | "I'm gonna rip you up from the inside out." |
| ghostface_118_t05m48_1s.mp3 | "I'm gonna crack you open like a crab!" |
| ghostface_174_t08m41_0s.mp3 | "Death by a thousand cuts." |

### hitReact — taking a hit
| clip | line |
|---|---|
| ghostface_004_t00m09_6s.mp3 | "Where'd you learn to punch like that?" |
| ghostface_019_t00m48_3s.mp3 | "Now that's scary." |
| ghostface_018_t00m46_3s.mp3 | "Feeling woozy." |
| ghostface_114_t05m36_8s.mp3 | "Did your blood run cold?" |

### lowHealth — hurt but still fighting
| clip | line |
|---|---|
| ghostface_195_t09m43_8s.mp3 | "I'll survive. I always do." |
| ghostface_197_t09m48_1s.mp3 | "We're only in the first reel." |
| ghostface_151_t07m34_1s.mp3 | "You'll have to kill me to find out." |
| ghostface_175_t08m44_7s.mp3 | "Even if you kill me, I'll be back for the sequel." |
| ghostface_206_t10m10_4s.mp3 | "This story's plot isn't done twisting!" |

### win — victory
| clip | line |
|---|---|
| ghostface_026_t01m02_1s.mp3 | "Now you lose." |
| ghostface_030_t01m10_9s.mp3 | "You won't get a sequel!" |
| ghostface_032_t01m15_2s.mp3 | "Guess you had a death wish." |
| ghostface_058_t02m40_0s.mp3 + ghostface_059_t02m42_0s.mp3 | "You're dead already. You just don't know it." *(two sequential clips = one line)* |
| ghostface_001_t00m01_4s.mp3 | "See you soon!" |
| ghostface_125_t06m14_5s.mp3 | "Go ahead — the sequel's already greenlit." |
| ghostface_016_t00m41_8s.mp3 | "You're dying." |
| ghostface_113_t05m34_2s.mp3 | "Time to put you on a slab!" |
| ghostface_002_t00m04_4s.mp3 | "We're not finished yet!" *(rematch/round-win)* |

---

## ⚑ MOVE-NAME CALLOUT candidates (Step 3)
Actively flagged for cross-referencing against the pending MK1 moveset (Backstage Pass & the rest of
that list) — same idea as the "Skill Hunter"/"switch" matches found for Chrollo & Gold Ranger. Assign
these to the matching special when the move is built, instead of the generic `specialCast` pool.

| clip | line | likely maps to |
|---|---|---|
| ghostface_155_t07m46_6s.mp3 | **"STAB!"** | any thrust/lunge stab attack |
| ghostface_049_t02m04_8s.mp3 | **"What's your favorite scary movie?"** | Ghostface's **signature** line — in MK1 it fronts his phone-call taunt / Fatality; reserve for the flashiest special or the ultimate |
| ghostface_038_t01m29_1s.mp3 | "I'll gut you!" | a gutting/rushing knife special (cf. the built "Gutting Lunge") |
| ghostface_129_t06m28_1s.mp3 | "How about the knife? It's gonna rip through your flesh!" | knife special |
| ghostface_163_t08m09_6s.mp3 | "Who needs a knife? I'm already under your skin." | stalk/teleport-behind mixup (cf. "Stalk & Vanish") |
| ghostface_084_t03m54_5s.mp3 | "Got time for a little hack-and-slash." | a slashing string/rekka |
| ghostface_040_t01m33_3s.mp3 | "Cut flesh, scrape bone." | a slashing/cutting special |
| ghostface_033/034/035_t01m17–22s.mp3 | **"Now I see something silver / green / red."** | ⚠ UNCERTAIN — a 3-part sequenced callout; *sounds* like a targeting/tiered move or a Kameo-assist cue. Flag for review against whatever "Backstage Pass"-style setup move exists. |

**No clip literally says "Backstage Pass"** (or any other named MK1 move) as a callout — that exact
move-name isn't voiced in this rip. The lines above are the closest technique-flavored callouts; pair
them by *theme* (stab / knife / slash / stalk / signature) when the moves are built.

---

## Notes / flags
- **Explicit language:** `006` "…the fucking morgue", `168` "…that's bullshit" are kept but flagged —
  drop or swap if a cleaner rating is wanted (plenty of clean alternates in the pools).
- **Two-clip line:** the win pool's "You're dead already / You just don't know it" is `058`+`059` played
  back-to-back; wire as a single sequence or pick one half.
- **No dedicated taunt action** exists for most fighters in this project — the intro/taunt pools would
  ride the intro beat + offense-connect (as done for Batman/Maki) unless a taunt action is added.
- **The `220–337` block is the combat-effort bank** (grunts/stabs/laughs) — useful later as raw *SFX*
  (hit-effort/death vocals) even though none are dialogue; not part of the voice pools.
- **Raw data:** full transcription in `ghostface_raw_transcript.tsv` (338 rows); empty-clip recheck in
  `ghostface_novad_empties.tsv`.
