# TOJI FUSHIGURO — VOICE LOG

Source: **390** `toji_voice_*.mp3` clips (mixed EN/JA, timestamp-labeled — filenames preserved exactly). Transcribed via `tools/transcribe_toji.py` (faster-whisper `small`, 2-pass: auto-detect native text + EN gloss); curated via `tools/build_toji_voice_log.py` + hand-review.

## Language split (auto-detect; short JA combat grunts often mis-tag as ko/ru/zh → folded into JA)

- **Japanese: 315** · **English: 75**  (raw detect: ja 283, en 75, ko 20, ru 3, it 2, tr 2, pl 2, zh 2, sv 1)

## Language decision — KEEP BOTH (separate pools)

Per the owner: both languages kept as **separate pools**, nothing discarded by language. `tojiVoice.js` ships `TOJI_VOICE.ja` (active by default — JJK subbed-anime convention, larger set) and `TOJI_VOICE.en` (wired-and-ready, `setTojiVoiceLang("en")` swaps live). One language plays at a time (no per-char toggle UI) — same model as Sukuna/Yuji.

**Wired: 105** (65 JA + 40 EN) across 10 pools.

## Step 4 — technique + comeback-moment callout mapping

| Pool | Trigger | Clips |
|---|---|---|
| **castSplitSoul (Split Soul Katana)** | abilities.js fireTojiSplitSoul | `toji_voice_113_t09m54_1s.mp3` (ja: I'll cut you!)<br>`toji_voice_007_t02m05_1s.mp3` (en: Looking away? I won't back down. I'll cleave you apa) |
| **castChain (Chain of a Thousand Miles / Inverted Spear)** | abilities.js fireTojiChain | `toji_voice_029_t05m12_9s.mp3` (en: Inverted spear of heaven) |
| **castPlayfulCloud (Playful Cloud)** | abilities.js fireTojiPlayfulCloud | _(none — falls back to same-language combat bark)_ |
| **comebackSave1 (1st save — defiant survival)** | abilities.js fireTojiComebackSave1 | `toji_voice_204_t12m25_6s.mp3` (ja: It's not over yet!)<br>`toji_voice_206_t12m28_6s.mp3` (ja: I'm still going.)<br>`toji_voice_230_t13m12_7s.mp3` (ja: Not yet, not yet.)<br>`toji_voice_196_t12m07_9s.mp3` (ja: I'll play until I get up.) |
| **comebackSave2 (2nd save — Reincarnated Form transform)** | abilities.js fireTojiReincarnated | `toji_voice_267_t14m12_7s.mp3` (ja: I'll come back now.)<br>`toji_voice_189_t11m56_0s.mp3` (ja: Let's go from here.)<br>`toji_voice_048_t07m40_2s.mp3` (en: You're free to go now. Our fight is just getting sta)<br>`toji_voice_050_t07m45_3s.mp3` (en: Time to change the flow, shall we?) |

Notes: **029 "Inverted spear of heaven"** = the one direct EN technique callout. No dedicated **Playful Cloud** line exists in the rip (documented gap → falls back to combat bark). JA `castChain` has no clean callout (the only "thousand"-gloss was a mistranslation, dropped) → falls back. Comeback split: **save1** = defiant survival ("It's not over yet!" / "I'm still going"), **save2** = the transform beat ("Our fight is just getting started").

## Wired pools (both languages)

### intro — JA (15)

- `toji_voice_291_t14m57_8s.mp3` — The one who was targeted by me is the moon of fortune.
- `toji_voice_275_t14m26_9s.mp3` — If you're going to die, it's your turn now.
- `toji_voice_157_t11m02_5s.mp3` — I'll show you the difference in strength.
- `toji_voice_281_t14m40_3s.mp3` — I can't even get ready for the exercise.
- `toji_voice_060_t08m35_7s.mp3` — Are you already depending on yourself?
- `toji_voice_208_t12m31_7s.mp3` — You're good at choosing your opponent.
- `toji_voice_151_t10m52_0s.mp3` — I feel like I'm going to die.
- `toji_voice_246_t13m41_0s.mp3` — Are you already going to win?
- `toji_voice_098_t09m30_5s.mp3` — Let's go face-to-face.
- `toji_voice_156_t11m00_9s.mp3` — Are you ready, Ka-kun?
- `toji_voice_170_t11m29_3s.mp3` — Are you going to die?
- `toji_voice_200_t12m17_3s.mp3` — Are you ready to die?
- `toji_voice_210_t12m35_7s.mp3` — The opponent was bad.
- `toji_voice_197_t12m10_4s.mp3` — Are you ready, Ina?
- `toji_voice_270_t14m17_5s.mp3` — I'll kill you here.

### intro — EN (11)

- `toji_voice_039_t06m54_6s.mp3` — I'll kill you. Don't be hasty now. You're wide open. Looks l
- `toji_voice_042_t07m06_7s.mp3` — I'm like the invisible man. You have the blessing of parenta
- `toji_voice_055_t08m17_1s.mp3` — Going for this one. It's decided. They're backing out fine o
- `toji_voice_041_t07m03_4s.mp3` — You're free to go now, and since I have no cursed energy.
- `toji_voice_035_t05m59_9s.mp3` — Your luck ran out when you became my target. Oh well.
- `toji_voice_019_t03m37_3s.mp3` — I won't hold back or anything. Are you ready to die?
- `toji_voice_010_t02m32_3s.mp3` — I'll show you the difference in our strength.
- `toji_voice_032_t05m20_8s.mp3` — And I won't kill you, nothing against you.
- `toji_voice_009_t02m31_1s.mp3` — Are you ready?
- `toji_voice_015_t02m52_8s.mp3` — Die already.
- `toji_voice_037_t06m34_4s.mp3` — Follow me.

### combatBark — JA (32)

- `toji_voice_348_t16m31_9s.mp3` — I hate it when people look at me like I don't have anything
- `toji_voice_209_t12m33_8s.mp3` — It took me a long time to figure out what to do.
- `toji_voice_252_t13m49_6s.mp3` — Are you going to challenge me with your power?
- `toji_voice_068_t08m45_9s.mp3` — Of course, you have to be able to handle it.
- `toji_voice_321_t15m48_5s.mp3` — It's better to be separated from each other.
- `toji_voice_357_t16m46_3s.mp3` — You have to think about how to deal with it.
- `toji_voice_217_t12m46_1s.mp3` — It's been a long time since I last saw you.
- `toji_voice_150_t10m49_8s.mp3` — I'm sure you can tell me what's going on.
- `toji_voice_274_t14m24_4s.mp3` — I'll do my best for the rest of my life.
- `toji_voice_277_t14m31_7s.mp3` — I'll let you choose the order of death.
- `toji_voice_198_t12m12_0s.mp3` — There's nothing to be sad about, Zako.
- `toji_voice_260_t13m59_8s.mp3` — It doesn't make any sense just to run.
- `toji_voice_125_t10m13_6s.mp3` — What are you talking about? It's fun!
- `toji_voice_282_t14m42_5s.mp3` — It's easy to get a job against Zarko.
- `toji_voice_354_t16m40_8s.mp3` — The current battle isn't bad, is it?
- `toji_voice_115_t09m56_6s.mp3` — Are you trying to get away from me?
- `toji_voice_360_t16m51_2s.mp3` — This is the end of the game, right?
- `toji_voice_294_t15m03_5s.mp3` — I'm not going to suffer like that.
- `toji_voice_345_t16m26_5s.mp3` — Do you remember the name of a man?
- `toji_voice_083_t09m07_8s.mp3` — I don't have time to fight again.
- `toji_voice_255_t13m53_5s.mp3` — You're gonna hear it, aren't you?
- `toji_voice_104_t09m39_9s.mp3` — I thought it wouldn't reach you.
- `toji_voice_278_t14m34_2s.mp3` — I don't think I'm in a bad mood.
- `toji_voice_293_t15m01_9s.mp3` — I wonder if the feeling is back.
- `toji_voice_322_t15m50_5s.mp3` — It's better to get away from it.
- `toji_voice_135_t10m28_4s.mp3` — I don't think it's a good idea.
- `toji_voice_143_t10m40_2s.mp3` — I'll make a decision with this.
- `toji_voice_244_t13m36_5s.mp3` — It looks like it's just a joke.
- `toji_voice_254_t13m52_1s.mp3` — Do you want to take it from me?
- `toji_voice_271_t14m18_9s.mp3` — It's enough for me to be alone.
- `toji_voice_318_t15m42_6s.mp3` — It's a revolutionary technique.
- `toji_voice_056_t08m29_9s.mp3` — I'm investigating the process.

### combatBark — EN (14)

- `toji_voice_017_t03m13_4s.mp3` — Wet behind the ears thought you'd guard that you're done for
- `toji_voice_020_t03m51_6s.mp3` — That's how it goes. You're in over your head.
- `toji_voice_005_t01m01_8s.mp3` — You're the front, sweet dreams.
- `toji_voice_002_t00m11_3s.mp3` — Increasing the pressure later
- `toji_voice_016_t03m11_2s.mp3` — Baw! Let your guard down!
- `toji_voice_008_t02m29_3s.mp3` — Look isn't on your side.
- `toji_voice_011_t02m34_7s.mp3` — You got a big head, huh?
- `toji_voice_045_t07m19_0s.mp3` — I get what you're asking
- `toji_voice_051_t07m47_4s.mp3` — That's perfect. Shut up.
- `toji_voice_052_t08m01_6s.mp3` — What? Are you for real?
- `toji_voice_046_t07m20_9s.mp3` — I'll give it a rest.
- `toji_voice_014_t02m51_7s.mp3` — So all that coming.
- `toji_voice_018_t03m35_2s.mp3` — Wasted on a nobody.
- `toji_voice_192_t12m00_7s.mp3` — Well done, don't I?

### hitReact — JA (2)

- `toji_voice_380_t17m28_3s.mp3` — I don't give a damn.
- `toji_voice_238_t13m23_6s.mp3` — Damn it.

### hitReact — EN (6)

- `toji_voice_024_t04m13_3s.mp3` — Tch! Shut up! MMM! GAH! NUH! GAH! WHAT?! NUH!
- `toji_voice_027_t04m36_6s.mp3` — Not bad. Seriously? I screwed up. Damn.
- `toji_voice_034_t05m41_7s.mp3` — Nothing special. Damn.
- `toji_voice_021_t03m55_0s.mp3` — Wasting my damn time
- `toji_voice_025_t04m19_1s.mp3` — That hurts!
- `toji_voice_383_t17m33_9s.mp3` — Damn it.

### lowHealth — JA (1)

- `toji_voice_341_t16m20_4s.mp3` — It's a monster.

### lowHealth — EN (1)

- `toji_voice_043_t07m11_9s.mp3` — What a monster. Well, who really knows? You're not my type.

### win — JA (8)

- `toji_voice_351_t16m37_1s.mp3` — I'm done with the next one.
- `toji_voice_272_t14m20_7s.mp3` — I'll kill you and go home.
- `toji_voice_186_t11m51_5s.mp3` — That's it, that's it.
- `toji_voice_127_t10m16_6s.mp3` — The game is over!
- `toji_voice_212_t12m38_6s.mp3` — Do your job!
- `toji_voice_149_t10m48_6s.mp3` — It's over.
- `toji_voice_162_t11m17_7s.mp3` — That's it!
- `toji_voice_084_t09m09_8s.mp3` — I'm done!

### win — EN (4)

- `toji_voice_047_t07m34_4s.mp3` — Later. Time to strike. Let's see where this is going. Okay,
- `toji_voice_022_t03m57_0s.mp3` — Choose the wrong opponent. Do your best now. Do your job.
- `toji_voice_040_t06m59_6s.mp3` — Seriously? Sorry, signal's dropping. Okay, job's done.
- `toji_voice_031_t05m16_9s.mp3` — Count me in. Do what you will with that. Go home now.

### castSplitSoul (Split Soul Katana) — JA (1)

- `toji_voice_113_t09m54_1s.mp3` — I'll cut you!

### castSplitSoul (Split Soul Katana) — EN (1)

- `toji_voice_007_t02m05_1s.mp3` — Looking away? I won't back down. I'll cleave you apa

### castChain (Chain of a Thousand Miles / Inverted Spear) — EN (1)

- `toji_voice_029_t05m12_9s.mp3` — Inverted spear of heaven

### comebackSave1 (1st save — defiant survival) — JA (4)

- `toji_voice_204_t12m25_6s.mp3` — It's not over yet!
- `toji_voice_206_t12m28_6s.mp3` — I'm still going.
- `toji_voice_230_t13m12_7s.mp3` — Not yet, not yet.
- `toji_voice_196_t12m07_9s.mp3` — I'll play until I get up.

### comebackSave2 (2nd save — Reincarnated Form transform) — JA (2)

- `toji_voice_267_t14m12_7s.mp3` — I'll come back now.
- `toji_voice_189_t11m56_0s.mp3` — Let's go from here.

### comebackSave2 (2nd save — Reincarnated Form transform) — EN (2)

- `toji_voice_048_t07m40_2s.mp3` — You're free to go now. Our fight is just getting sta
- `toji_voice_050_t07m45_3s.mp3` — Time to change the flow, shall we?

## Full transcript (all 390)

| # | file | lang | dur | transcription (native / EN gloss) | disposition |
|--:|---|---|--:|---|---|
| 0 | `toji_voice_000_t00m00_0s.mp3` | en | 2.4 | — | discard/held |
| 1 | `toji_voice_001_t00m09_8s.mp3` | en | 1.3 | So egotistical. | discard/held |
| 2 | `toji_voice_002_t00m11_3s.mp3` | en | 1.7 | Increasing the pressure later | combatBark |
| 3 | `toji_voice_003_t00m22_4s.mp3` | en | 0.7 | Sloppy. | discard/held |
| 4 | `toji_voice_004_t00m46_4s.mp3` | en | 1.5 | Pretty good aim. | discard/held |
| 5 | `toji_voice_005_t01m01_8s.mp3` | en | 1.9 | You're the front, sweet dreams. | combatBark |
| 6 | `toji_voice_006_t01m05_0s.mp3` | en | 1.2 | Loosen up a bit. | discard/held |
| 7 | `toji_voice_007_t02m05_1s.mp3` | en | 6.1 | Looking away? I won't back down. I'll cleave you apart. Brace yourself | castSplitSoul |
| 8 | `toji_voice_008_t02m29_3s.mp3` | en | 1.6 | Look isn't on your side. | combatBark |
| 9 | `toji_voice_009_t02m31_1s.mp3` | en | 1.0 | Are you ready? | intro |
| 10 | `toji_voice_010_t02m32_3s.mp3` | en | 2.2 | I'll show you the difference in our strength. | intro |
| 11 | `toji_voice_011_t02m34_7s.mp3` | en | 1.9 | You got a big head, huh? | combatBark |
| 12 | `toji_voice_012_t02m48_1s.mp3` | en | 1.4 | About that! There! | discard/held |
| 13 | `toji_voice_013_t02m49_7s.mp3` | en | 1.8 | Right dodge this | discard/held |
| 14 | `toji_voice_014_t02m51_7s.mp3` | en | 0.9 | So all that coming. | combatBark |
| 15 | `toji_voice_015_t02m52_8s.mp3` | en | 1.0 | Die already. | intro |
| 16 | `toji_voice_016_t03m11_2s.mp3` | en | 2.1 | Baw! Let your guard down! | combatBark |
| 17 | `toji_voice_017_t03m13_4s.mp3` | en | 5.7 | Wet behind the ears thought you'd guard that you're done for so slow | combatBark |
| 18 | `toji_voice_018_t03m35_2s.mp3` | en | 1.9 | Wasted on a nobody. | combatBark |
| 19 | `toji_voice_019_t03m37_3s.mp3` | en | 4.2 | I won't hold back or anything. Are you ready to die? | intro |
| 20 | `toji_voice_020_t03m51_6s.mp3` | en | 3.2 | That's how it goes. You're in over your head. | combatBark |
| 21 | `toji_voice_021_t03m55_0s.mp3` | en | 1.8 | Wasting my damn time | hitReact |
| 22 | `toji_voice_022_t03m57_0s.mp3` | en | 4.1 | Choose the wrong opponent. Do your best now. Do your job. | win |
| 23 | `toji_voice_023_t04m11_4s.mp3` | en | 1.6 | — | discard/held |
| 24 | `toji_voice_024_t04m13_3s.mp3` | en | 5.1 | Tch! Shut up! MMM! GAH! NUH! GAH! WHAT?! NUH! | hitReact |
| 25 | `toji_voice_025_t04m19_1s.mp3` | en | 1.6 | That hurts! | hitReact |
| 26 | `toji_voice_026_t04m20_9s.mp3` | en | 0.7 | No! | discard/held |
| 27 | `toji_voice_027_t04m36_6s.mp3` | en | 3.4 | Not bad. Seriously? I screwed up. Damn. | hitReact |
| 28 | `toji_voice_028_t04m40_4s.mp3` | en | 1.4 | Yeah | discard/held |
| 29 | `toji_voice_029_t05m12_9s.mp3` | en | 1.8 | Inverted spear of heaven | castChain |
| 30 | `toji_voice_030_t05m15_7s.mp3` | en | 0.5 | Sure. | discard/held |
| 31 | `toji_voice_031_t05m16_9s.mp3` | en | 3.4 | Count me in. Do what you will with that. Go home now. | win |
| 32 | `toji_voice_032_t05m20_8s.mp3` | en | 2.3 | And I won't kill you, nothing against you. | intro |
| 33 | `toji_voice_033_t05m39_4s.mp3` | en | 2.0 | I'm in good form | discard/held |
| 34 | `toji_voice_034_t05m41_7s.mp3` | en | 1.6 | Nothing special. Damn. | hitReact |
| 35 | `toji_voice_035_t05m59_9s.mp3` | en | 3.5 | Your luck ran out when you became my target. Oh well. | intro |
| 36 | `toji_voice_036_t06m32_6s.mp3` | en | 0.9 | Together now | discard/held |
| 37 | `toji_voice_037_t06m34_4s.mp3` | en | 0.6 | Follow me. | intro |
| 38 | `toji_voice_038_t06m35_2s.mp3` | en | 0.8 | Together now. | discard/held |
| 39 | `toji_voice_039_t06m54_6s.mp3` | en | 4.8 | I'll kill you. Don't be hasty now. You're wide open. Looks like this w | intro |
| 40 | `toji_voice_040_t06m59_6s.mp3` | en | 3.4 | Seriously? Sorry, signal's dropping. Okay, job's done. | win |
| 41 | `toji_voice_041_t07m03_4s.mp3` | en | 3.1 | You're free to go now, and since I have no cursed energy. | intro |
| 42 | `toji_voice_042_t07m06_7s.mp3` | en | 4.2 | I'm like the invisible man. You have the blessing of parentage. That's | intro |
| 43 | `toji_voice_043_t07m11_9s.mp3` | en | 4.0 | What a monster. Well, who really knows? You're not my type. I'm a... | lowHealth |
| 44 | `toji_voice_044_t07m16_4s.mp3` | en | 2.5 | Terrible remembering guy's names too. | discard/held |
| 45 | `toji_voice_045_t07m19_0s.mp3` | en | 1.7 | I get what you're asking | combatBark |
| 46 | `toji_voice_046_t07m20_9s.mp3` | en | 1.0 | I'll give it a rest. | combatBark |
| 47 | `toji_voice_047_t07m34_4s.mp3` | en | 5.4 | Later. Time to strike. Let's see where this is going. Okay, job's done | win |
| 48 | `toji_voice_048_t07m40_2s.mp3` | en | 3.8 | You're free to go now. Our fight is just getting started. | comebackSave2 |
| 49 | `toji_voice_049_t07m44_3s.mp3` | en | 0.9 | Interesting. | discard/held |
| 50 | `toji_voice_050_t07m45_3s.mp3` | en | 1.9 | Time to change the flow, shall we? | comebackSave2 |
| 51 | `toji_voice_051_t07m47_4s.mp3` | en | 2.7 | That's perfect. Shut up. | combatBark |
| 52 | `toji_voice_052_t08m01_6s.mp3` | en | 2.1 | What? Are you for real? | combatBark |
| 53 | `toji_voice_053_t08m04_1s.mp3` | en | 0.8 | Interesting. | discard/held |
| 54 | `toji_voice_054_t08m14_6s.mp3` | en | 1.6 | Hold on. Hey. You. | discard/held |
| 55 | `toji_voice_055_t08m17_1s.mp3` | en | 5.0 | Going for this one. It's decided. They're backing out fine over all re | intro |
| 56 | `toji_voice_056_t08m29_9s.mp3` | ja | 0.9 | I'm investigating the process. | combatBark |
| 57 | `toji_voice_057_t08m31_1s.mp3` | ja | 1.2 | It's open. | discard/held |
| 58 | `toji_voice_058_t08m32_7s.mp3` | ja | 0.8 | I'll hit you! | discard/held |
| 59 | `toji_voice_059_t08m33_8s.mp3` | ko | 1.5 | Oh, that's too much. | discard/held |
| 60 | `toji_voice_060_t08m35_7s.mp3` | ja | 1.5 | Are you already depending on yourself? | intro |
| 61 | `toji_voice_061_t08m37_6s.mp3` | ja | 0.7 | I'll throw it up. | discard/held |
| 62 | `toji_voice_062_t08m38_6s.mp3` | it | 0.6 | bye | discard/held |
| 63 | `toji_voice_063_t08m39_7s.mp3` | ja | 0.9 | It's a mess. | discard/held |
| 64 | `toji_voice_064_t08m41_0s.mp3` | ja | 0.8 | I'll give you a break! | discard/held |
| 65 | `toji_voice_065_t08m42_0s.mp3` | ja | 1.1 | There's no end to it. | discard/held |
| 66 | `toji_voice_066_t08m43_5s.mp3` | ja | 0.7 | Let's fly! | discard/held |
| 67 | `toji_voice_067_t08m44_4s.mp3` | ja | 1.0 | You're out of your mind. | discard/held |
| 68 | `toji_voice_068_t08m45_9s.mp3` | ja | 1.4 | Of course, you have to be able to handle it. | combatBark |
| 69 | `toji_voice_069_t08m47_8s.mp3` | ja | 1.5 | There's no way to protect him. | discard/held |
| 70 | `toji_voice_070_t08m49_8s.mp3` | ja | 0.7 | I'll kill you! | discard/held |
| 71 | `toji_voice_071_t08m50_8s.mp3` | ja | 1.2 | The top is garaaki. | discard/held |
| 72 | `toji_voice_072_t08m52_4s.mp3` | ja | 1.1 | Well, I can hear it. | discard/held |
| 73 | `toji_voice_073_t08m53_8s.mp3` | ja | 0.8 | It's sweet. | discard/held |
| 74 | `toji_voice_074_t08m54_9s.mp3` | ja | 1.4 | I'll let you through. | discard/held |
| 75 | `toji_voice_075_t08m56_7s.mp3` | ja | 0.7 | Fukitobasu! | discard/held |
| 76 | `toji_voice_076_t08m57_6s.mp3` | ja | 0.8 | Are you surprised? | discard/held |
| 77 | `toji_voice_077_t08m58_8s.mp3` | ja | 0.9 | Can I go? | discard/held |
| 78 | `toji_voice_078_t09m00_0s.mp3` | ja | 1.1 | Can you react? | discard/held |
| 79 | `toji_voice_079_t09m01_6s.mp3` | ja | 1.4 | Don't be a rascal! | discard/held |
| 80 | `toji_voice_080_t09m03_3s.mp3` | ja | 1.1 | I won't catch up with you. | discard/held |
| 81 | `toji_voice_081_t09m05_1s.mp3` | ja | 1.3 | That's dangerous. | discard/held |
| 82 | `toji_voice_082_t09m06_7s.mp3` | ko | 0.8 | Kirikizom | discard/held |
| 83 | `toji_voice_083_t09m07_8s.mp3` | ja | 1.4 | I don't have time to fight again. | combatBark |
| 84 | `toji_voice_084_t09m09_8s.mp3` | ja | 0.9 | I'm done! | win |
| 85 | `toji_voice_085_t09m11_0s.mp3` | ja | 0.8 | I'll shoot you! | discard/held |
| 86 | `toji_voice_086_t09m12_1s.mp3` | ja | 1.2 | It's got a cannon on it. | discard/held |
| 87 | `toji_voice_087_t09m13_7s.mp3` | ja | 0.8 | That was close. | discard/held |
| 88 | `toji_voice_088_t09m14_9s.mp3` | ja | 1.2 | The aim isn't bad. | discard/held |
| 89 | `toji_voice_089_t09m16_5s.mp3` | ja | 1.2 | Are you going to attack me? | discard/held |
| 90 | `toji_voice_090_t09m18_4s.mp3` | ja | 1.2 | I found a solution. | discard/held |
| 91 | `toji_voice_091_t09m20_8s.mp3` | ja | 0.8 | Are you scared? | discard/held |
| 92 | `toji_voice_092_t09m22_0s.mp3` | ja | 1.0 | I'll give it a try. | discard/held |
| 93 | `toji_voice_093_t09m23_3s.mp3` | ja | 0.9 | Is it a dead end? | discard/held |
| 94 | `toji_voice_094_t09m24_6s.mp3` | ko | 1.1 | Did I say anything? | discard/held |
| 95 | `toji_voice_095_t09m26_0s.mp3` | ja | 1.1 | It's coming from below. | discard/held |
| 96 | `toji_voice_096_t09m27_3s.mp3` | ja | 1.3 | First of all, it's you. | discard/held |
| 97 | `toji_voice_097_t09m29_0s.mp3` | ja | 1.1 | The color of the skin is bad. | discard/held |
| 98 | `toji_voice_098_t09m30_5s.mp3` | ja | 1.6 | Let's go face-to-face. | intro |
| 99 | `toji_voice_099_t09m32_6s.mp3` | ja | 0.6 | Okay. | discard/held |
| 100 | `toji_voice_100_t09m33_4s.mp3` | ja | 1.4 | I can't believe it. | discard/held |
| 101 | `toji_voice_101_t09m35_3s.mp3` | ja | 1.1 | Let's get started. | discard/held |
| 102 | `toji_voice_102_t09m36_7s.mp3` | ja | 1.1 | It's too sweet. | discard/held |
| 103 | `toji_voice_103_t09m38_2s.mp3` | ja | 1.2 | You're so lively. | discard/held |
| 104 | `toji_voice_104_t09m39_9s.mp3` | ja | 1.6 | I thought it wouldn't reach you. | combatBark |
| 105 | `toji_voice_105_t09m42_2s.mp3` | ja | 1.0 | That was a good one. | discard/held |
| 106 | `toji_voice_106_t09m43_7s.mp3` | ja | 0.8 | I'll kill you! | discard/held |
| 107 | `toji_voice_107_t09m44_8s.mp3` | tr | 0.8 | Stop it, stop it. | discard/held |
| 108 | `toji_voice_108_t09m46_0s.mp3` | ja | 1.3 | It's not close to me. | discard/held |
| 109 | `toji_voice_109_t09m47_7s.mp3` | ja | 1.4 | This is heavy. | discard/held |
| 110 | `toji_voice_110_t09m49_4s.mp3` | ja | 1.2 | Get out of there! | discard/held |
| 111 | `toji_voice_111_t09m51_0s.mp3` | ja | 1.2 | I won't let you buy it! | discard/held |
| 112 | `toji_voice_112_t09m52_5s.mp3` | ja | 1.2 | Take it! | discard/held |
| 113 | `toji_voice_113_t09m54_1s.mp3` | ja | 0.8 | I'll cut you! | castSplitSoul |
| 114 | `toji_voice_114_t09m55_2s.mp3` | ja | 1.0 | I can't stop it. | discard/held |
| 115 | `toji_voice_115_t09m56_6s.mp3` | ja | 1.6 | Are you trying to get away from me? | combatBark |
| 116 | `toji_voice_116_t09m58_7s.mp3` | ja | 1.0 | You won, didn't you? | discard/held |
| 117 | `toji_voice_117_t10m00_0s.mp3` | en | 1.4 | Multi-biker. | discard/held |
| 118 | `toji_voice_118_t10m01_8s.mp3` | ko | 1.6 | I don't care what you do. | discard/held |
| 119 | `toji_voice_119_t10m03_9s.mp3` | ja | 1.2 | I'm in the way. | discard/held |
| 120 | `toji_voice_120_t10m05_5s.mp3` | ja | 1.3 | I'll crush you. | discard/held |
| 121 | `toji_voice_121_t10m07_1s.mp3` | ja | 1.4 | Don't mess with me! | discard/held |
| 122 | `toji_voice_122_t10m09_0s.mp3` | ja | 1.1 | It's a thousandth of a thousandth. | discard/held |
| 123 | `toji_voice_123_t10m10_5s.mp3` | ja | 1.2 | It has nothing to do with me. | discard/held |
| 124 | `toji_voice_124_t10m12_2s.mp3` | ja | 1.0 | I'll get in your way. | discard/held |
| 125 | `toji_voice_125_t10m13_6s.mp3` | ko | 1.0 | What are you talking about? It's fun! | combatBark |
| 126 | `toji_voice_126_t10m15_0s.mp3` | ja | 1.2 | Wake up! | discard/held |
| 127 | `toji_voice_127_t10m16_6s.mp3` | ja | 1.2 | The game is over! | win |
| 128 | `toji_voice_128_t10m18_3s.mp3` | ja | 1.1 | I've got it in my hand. | discard/held |
| 129 | `toji_voice_129_t10m19_7s.mp3` | ko | 0.9 | It's the Teokyuru! | discard/held |
| 130 | `toji_voice_130_t10m21_0s.mp3` | ja | 1.5 | I'll beat you. | discard/held |
| 131 | `toji_voice_131_t10m22_8s.mp3` | ko | 1.1 | I can do this. | discard/held |
| 132 | `toji_voice_132_t10m24_3s.mp3` | ja | 0.6 | I'll stop you! | discard/held |
| 133 | `toji_voice_133_t10m25_2s.mp3` | ja | 1.1 | I won't forgive you. | discard/held |
| 134 | `toji_voice_134_t10m26_7s.mp3` | ja | 1.3 | That was a bad decision. | discard/held |
| 135 | `toji_voice_135_t10m28_4s.mp3` | ja | 1.2 | I don't think it's a good idea. | combatBark |
| 136 | `toji_voice_136_t10m30_0s.mp3` | ja | 1.1 | It's my turn. | discard/held |
| 137 | `toji_voice_137_t10m32_3s.mp3` | ja | 1.3 | Did you think you could win? | discard/held |
| 138 | `toji_voice_138_t10m34_0s.mp3` | ja | 0.6 | Yosomi! | discard/held |
| 139 | `toji_voice_139_t10m35_0s.mp3` | ja | 0.6 | I'm going to sleep! | discard/held |
| 140 | `toji_voice_140_t10m35_9s.mp3` | ja | 0.9 | It's so beautiful! | discard/held |
| 141 | `toji_voice_141_t10m37_1s.mp3` | ko | 0.9 | What are you doing? | discard/held |
| 142 | `toji_voice_142_t10m38_3s.mp3` | ja | 1.4 | I won't listen to your life. | discard/held |
| 143 | `toji_voice_143_t10m40_2s.mp3` | ja | 1.2 | I'll make a decision with this. | combatBark |
| 144 | `toji_voice_144_t10m41_7s.mp3` | ja | 1.0 | I won't let you do it. | discard/held |
| 145 | `toji_voice_145_t10m43_1s.mp3` | ja | 1.3 | What are you talking about? | discard/held |
| 146 | `toji_voice_146_t10m44_7s.mp3` | ja | 0.9 | Let's get out of here! | discard/held |
| 147 | `toji_voice_147_t10m46_0s.mp3` | ja | 0.7 | Kirisaku! | discard/held |
| 148 | `toji_voice_148_t10m47_0s.mp3` | ja | 1.3 | Don't worry about it. | discard/held |
| 149 | `toji_voice_149_t10m48_6s.mp3` | ja | 0.8 | It's over. | win |
| 150 | `toji_voice_150_t10m49_8s.mp3` | ja | 1.7 | I'm sure you can tell me what's going on. | combatBark |
| 151 | `toji_voice_151_t10m52_0s.mp3` | ja | 1.7 | I feel like I'm going to die. | intro |
| 152 | `toji_voice_152_t10m54_0s.mp3` | ja | 1.1 | I'll take care of it. | discard/held |
| 153 | `toji_voice_153_t10m55_3s.mp3` | ja | 1.4 | I won't let you regret it! | discard/held |
| 154 | `toji_voice_154_t10m57_1s.mp3` | ja | 1.5 | I'll send you to hell. | discard/held |
| 155 | `toji_voice_155_t10m58_9s.mp3` | ja | 1.4 | I'm glad you liked it. | discard/held |
| 156 | `toji_voice_156_t11m00_9s.mp3` | ja | 1.3 | Are you ready, Ka-kun? | intro |
| 157 | `toji_voice_157_t11m02_5s.mp3` | ja | 1.7 | I'll show you the difference in strength. | intro |
| 158 | `toji_voice_158_t11m04_5s.mp3` | ja | 2.1 | You're out of your mind. | discard/held |
| 159 | `toji_voice_159_t11m09_8s.mp3` | ko | 0.5 | What do you say? | discard/held |
| 160 | `toji_voice_160_t11m13_6s.mp3` | ja | 0.8 | That's right! | discard/held |
| 161 | `toji_voice_161_t11m14_8s.mp3` | ja | 0.7 | That's right! | discard/held |
| 162 | `toji_voice_162_t11m17_7s.mp3` | ja | 0.8 | That's it! | win |
| 163 | `toji_voice_163_t11m19_8s.mp3` | en | 0.7 | Eeeeh? | discard/held |
| 164 | `toji_voice_164_t11m20_9s.mp3` | ko | 0.7 | What is it? | discard/held |
| 165 | `toji_voice_165_t11m22_8s.mp3` | ja | 0.9 | That's where it is, right? | discard/held |
| 166 | `toji_voice_166_t11m24_0s.mp3` | ja | 1.1 | Can you afford it? | discard/held |
| 167 | `toji_voice_167_t11m25_5s.mp3` | ru | 1.0 | No, it's not possible. | discard/held |
| 168 | `toji_voice_168_t11m27_1s.mp3` | ja | 0.8 | I'm sick of it. | discard/held |
| 169 | `toji_voice_169_t11m28_3s.mp3` | ko | 0.8 | Hey, Demiro! | discard/held |
| 170 | `toji_voice_170_t11m29_3s.mp3` | ja | 0.9 | Are you going to die? | intro |
| 171 | `toji_voice_171_t11m30_5s.mp3` | ja | 0.7 | I'll crush you! | discard/held |
| 172 | `toji_voice_172_t11m31_5s.mp3` | ja | 0.8 | It's over! | discard/held |
| 173 | `toji_voice_173_t11m32_6s.mp3` | ja | 0.9 | EJICSEN! | discard/held |
| 174 | `toji_voice_174_t11m33_9s.mp3` | ja | 1.3 | Come on, hurry up. | discard/held |
| 175 | `toji_voice_175_t11m35_7s.mp3` | tr | 1.0 | Come on! | discard/held |
| 176 | `toji_voice_176_t11m37_1s.mp3` | ja | 1.1 | Are you out of your mind? | discard/held |
| 177 | `toji_voice_177_t11m38_5s.mp3` | ja | 1.2 | I don't think so. | discard/held |
| 178 | `toji_voice_178_t11m40_1s.mp3` | ja | 0.9 | How about this? | discard/held |
| 179 | `toji_voice_179_t11m41_4s.mp3` | ko | 0.9 | I'm a student. | discard/held |
| 180 | `toji_voice_180_t11m42_8s.mp3` | ja | 1.2 | Let's get out of here. | discard/held |
| 181 | `toji_voice_181_t11m44_5s.mp3` | ja | 0.7 | I can do it! | discard/held |
| 182 | `toji_voice_182_t11m45_6s.mp3` | ja | 1.0 | Ah, close your mouth! | discard/held |
| 183 | `toji_voice_183_t11m47_0s.mp3` | ja | 0.5 | Toss! | discard/held |
| 184 | `toji_voice_184_t11m47_9s.mp3` | ja | 1.2 | U-DAN STRAW | discard/held |
| 185 | `toji_voice_185_t11m49_7s.mp3` | ja | 1.3 | Amen! | discard/held |
| 186 | `toji_voice_186_t11m51_5s.mp3` | pl | 1.3 | That's it, that's it. | win |
| 187 | `toji_voice_187_t11m53_1s.mp3` | ja | 1.0 | It's broken. | discard/held |
| 188 | `toji_voice_188_t11m54_4s.mp3` | ja | 1.2 | Shut up! | discard/held |
| 189 | `toji_voice_189_t11m56_0s.mp3` | ja | 1.0 | Let's go from here. | comebackSave2 |
| 190 | `toji_voice_190_t11m57_5s.mp3` | ja | 0.8 | Yeah, that's right. | discard/held |
| 191 | `toji_voice_191_t11m58_9s.mp3` | ja | 1.4 | I don't need to sweat. | discard/held |
| 192 | `toji_voice_192_t12m00_7s.mp3` | en | 0.8 | Well done, don't I? | combatBark |
| 193 | `toji_voice_193_t12m02_0s.mp3` | ja | 1.2 | It's about time. | discard/held |
| 194 | `toji_voice_194_t12m03_6s.mp3` | ja | 1.6 | This is enough, isn't it? | discard/held |
| 195 | `toji_voice_195_t12m05_8s.mp3` | ja | 1.7 | You don't have to be serious. | discard/held |
| 196 | `toji_voice_196_t12m07_9s.mp3` | ja | 1.9 | I'll play until I get up. | comebackSave1 |
| 197 | `toji_voice_197_t12m10_4s.mp3` | it | 1.3 | Are you ready, Ina? | intro |
| 198 | `toji_voice_198_t12m12_0s.mp3` | ja | 2.2 | There's nothing to be sad about, Zako. | combatBark |
| 199 | `toji_voice_199_t12m14_7s.mp3` | ja | 2.1 | I can't believe it. | discard/held |
| 200 | `toji_voice_200_t12m17_3s.mp3` | ja | 2.1 | Are you ready to die? | intro |
| 201 | `toji_voice_201_t12m19_9s.mp3` | ja | 1.8 | Time is running out! | discard/held |
| 202 | `toji_voice_202_t12m22_1s.mp3` | ja | 1.8 | This is the end of the game. | discard/held |
| 203 | `toji_voice_203_t12m24_5s.mp3` | ja | 0.7 | Oh, it's the body. | discard/held |
| 204 | `toji_voice_204_t12m25_6s.mp3` | ja | 1.2 | It's not over yet! | comebackSave1 |
| 205 | `toji_voice_205_t12m27_4s.mp3` | ja | 0.9 | It's so cold! | discard/held |
| 206 | `toji_voice_206_t12m28_6s.mp3` | ja | 1.3 | I'm still going. | comebackSave1 |
| 207 | `toji_voice_207_t12m30_2s.mp3` | ja | 1.1 | What the hell is this? | discard/held |
| 208 | `toji_voice_208_t12m31_7s.mp3` | ja | 1.7 | You're good at choosing your opponent. | intro |
| 209 | `toji_voice_209_t12m33_8s.mp3` | ja | 1.5 | It took me a long time to figure out what to do. | combatBark |
| 210 | `toji_voice_210_t12m35_7s.mp3` | ja | 1.3 | The opponent was bad. | intro |
| 211 | `toji_voice_211_t12m37_3s.mp3` | ko | 0.9 | Music, please. | discard/held |
| 212 | `toji_voice_212_t12m38_6s.mp3` | ja | 1.1 | Do your job! | win |
| 213 | `toji_voice_213_t12m40_1s.mp3` | ja | 1.3 | You know that, don't you? | discard/held |
| 214 | `toji_voice_214_t12m41_9s.mp3` | ja | 1.0 | Of course. | discard/held |
| 215 | `toji_voice_215_t12m43_3s.mp3` | en | 0.8 | So sure, aren't I? | discard/held |
| 216 | `toji_voice_216_t12m44_4s.mp3` | ja | 1.4 | It's not a big deal. | discard/held |
| 217 | `toji_voice_217_t12m46_1s.mp3` | ja | 1.3 | It's been a long time since I last saw you. | combatBark |
| 218 | `toji_voice_218_t12m48_0s.mp3` | en | 0.7 | Oh | discard/held |
| 219 | `toji_voice_219_t12m49_0s.mp3` | en | 0.5 | Sigh. | discard/held |
| 220 | `toji_voice_220_t12m54_4s.mp3` | en | 0.7 | ZEH! | discard/held |
| 221 | `toji_voice_221_t12m57_6s.mp3` | en | 0.7 | GAH! | discard/held |
| 222 | `toji_voice_222_t12m58_5s.mp3` | ja | 0.6 | What? | discard/held |
| 223 | `toji_voice_223_t13m00_6s.mp3` | en | 1.1 | Tina! | discard/held |
| 224 | `toji_voice_224_t13m04_4s.mp3` | en | 0.6 | GAH! | discard/held |
| 225 | `toji_voice_225_t13m05_4s.mp3` | ja | 1.3 | Are you serious? | discard/held |
| 226 | `toji_voice_226_t13m07_0s.mp3` | ja | 1.2 | That was too bad. | discard/held |
| 227 | `toji_voice_227_t13m08_5s.mp3` | ja | 1.1 | I can't hear you. | discard/held |
| 228 | `toji_voice_228_t13m09_9s.mp3` | ja | 1.0 | It's so hot in here. | discard/held |
| 229 | `toji_voice_229_t13m11_2s.mp3` | ja | 1.1 | That's what it looks like. | discard/held |
| 230 | `toji_voice_230_t13m12_7s.mp3` | ja | 1.0 | Not yet, not yet. | comebackSave1 |
| 231 | `toji_voice_231_t13m14_0s.mp3` | ja | 1.2 | That's not how it works. | discard/held |
| 232 | `toji_voice_232_t13m15_6s.mp3` | ja | 1.1 | His nails are so sweet. | discard/held |
| 233 | `toji_voice_233_t13m17_0s.mp3` | ja | 1.7 | I won't let you kill me. | discard/held |
| 234 | `toji_voice_234_t13m19_2s.mp3` | ko | 0.9 | See you next time! | discard/held |
| 235 | `toji_voice_235_t13m20_6s.mp3` | en | 0.6 | Uh... | discard/held |
| 236 | `toji_voice_236_t13m21_6s.mp3` | ja | 0.6 | Don't do that. | discard/held |
| 237 | `toji_voice_237_t13m22_7s.mp3` | ja | 0.6 | Are you serious? | discard/held |
| 238 | `toji_voice_238_t13m23_6s.mp3` | ja | 0.6 | Damn it. | hitReact |
| 239 | `toji_voice_239_t13m27_1s.mp3` | ja | 1.6 | I haven't said my bones yet. | discard/held |
| 240 | `toji_voice_240_t13m29_3s.mp3` | ja | 1.6 | It's all a matter of life. | discard/held |
| 241 | `toji_voice_241_t13m31_2s.mp3` | ja | 1.9 | I'm sorry, I'm just an idiot. | discard/held |
| 242 | `toji_voice_242_t13m33_5s.mp3` | ja | 0.9 | Stop it, stop it! | discard/held |
| 243 | `toji_voice_243_t13m34_8s.mp3` | en | 1.1 | Who are you? | discard/held |
| 244 | `toji_voice_244_t13m36_5s.mp3` | ja | 2.1 | It looks like it's just a joke. | combatBark |
| 245 | `toji_voice_245_t13m39_0s.mp3` | ja | 1.4 | I'll let you do it. | discard/held |
| 246 | `toji_voice_246_t13m41_0s.mp3` | ja | 1.6 | Are you already going to win? | intro |
| 247 | `toji_voice_247_t13m42_9s.mp3` | ja | 1.0 | It's hot. | discard/held |
| 248 | `toji_voice_248_t13m44_3s.mp3` | ko | 0.9 | Don't mess with me. | discard/held |
| 249 | `toji_voice_249_t13m45_7s.mp3` | ja | 1.2 | Are you going to catch me? | discard/held |
| 250 | `toji_voice_250_t13m47_2s.mp3` | ru | 0.8 | Let's go! | discard/held |
| 251 | `toji_voice_251_t13m48_4s.mp3` | ja | 0.9 | That sucks. | discard/held |
| 252 | `toji_voice_252_t13m49_6s.mp3` | ja | 1.1 | Are you going to challenge me with your power? | combatBark |
| 253 | `toji_voice_253_t13m50_9s.mp3` | ko | 0.8 | That's right. | discard/held |
| 254 | `toji_voice_254_t13m52_1s.mp3` | ja | 1.1 | Do you want to take it from me? | combatBark |
| 255 | `toji_voice_255_t13m53_5s.mp3` | ja | 1.1 | You're gonna hear it, aren't you? | combatBark |
| 256 | `toji_voice_256_t13m55_1s.mp3` | ja | 1.2 | Get in my way. | discard/held |
| 257 | `toji_voice_257_t13m56_7s.mp3` | ja | 0.8 | Hikiyosaka | discard/held |
| 258 | `toji_voice_258_t13m57_8s.mp3` | ja | 0.8 | Thank you very much. | discard/held |
| 259 | `toji_voice_259_t13m59_0s.mp3` | en | 0.5 | — | discard/held |
| 260 | `toji_voice_260_t13m59_8s.mp3` | ja | 1.5 | It doesn't make any sense just to run. | combatBark |
| 261 | `toji_voice_261_t14m01_6s.mp3` | ja | 1.0 | I feel bad. | discard/held |
| 262 | `toji_voice_262_t14m03_1s.mp3` | ja | 0.9 | Tokyu Jingu | discard/held |
| 263 | `toji_voice_263_t14m04_8s.mp3` | ja | 1.2 | Amar no Saka-hoko. | discard/held |
| 264 | `toji_voice_264_t14m07_7s.mp3` | ja | 0.6 | All right. | discard/held |
| 265 | `toji_voice_265_t14m10_2s.mp3` | ja | 0.7 | I'll accept it. | discard/held |
| 266 | `toji_voice_266_t14m11_3s.mp3` | ja | 0.8 | Do as you please. | discard/held |
| 267 | `toji_voice_267_t14m12_7s.mp3` | ja | 1.0 | I'll come back now. | comebackSave2 |
| 268 | `toji_voice_268_t14m14_1s.mp3` | ja | 1.1 | I won't kill you. | discard/held |
| 269 | `toji_voice_269_t14m15_6s.mp3` | ja | 1.0 | It's a joke, isn't it? | discard/held |
| 270 | `toji_voice_270_t14m17_5s.mp3` | ja | 1.0 | I'll kill you here. | intro |
| 271 | `toji_voice_271_t14m18_9s.mp3` | ja | 1.4 | It's enough for me to be alone. | combatBark |
| 272 | `toji_voice_272_t14m20_7s.mp3` | ja | 1.7 | I'll kill you and go home. | win |
| 273 | `toji_voice_273_t14m22_9s.mp3` | ja | 1.1 | Are you going to stick it on? | discard/held |
| 274 | `toji_voice_274_t14m24_4s.mp3` | ja | 1.9 | I'll do my best for the rest of my life. | combatBark |
| 275 | `toji_voice_275_t14m26_9s.mp3` | ja | 2.1 | If you're going to die, it's your turn now. | intro |
| 276 | `toji_voice_276_t14m29_4s.mp3` | ja | 1.9 | Can I clean it up to the race? | discard/held |
| 277 | `toji_voice_277_t14m31_7s.mp3` | ja | 2.1 | I'll let you choose the order of death. | combatBark |
| 278 | `toji_voice_278_t14m34_2s.mp3` | ja | 1.6 | I don't think I'm in a bad mood. | combatBark |
| 279 | `toji_voice_279_t14m36_2s.mp3` | ja | 1.1 | What the hell is this? | discard/held |
| 280 | `toji_voice_280_t14m38_8s.mp3` | ja | 1.1 | I wonder if he's still alive. | discard/held |
| 281 | `toji_voice_281_t14m40_3s.mp3` | ja | 1.9 | I can't even get ready for the exercise. | intro |
| 282 | `toji_voice_282_t14m42_5s.mp3` | ja | 2.1 | It's easy to get a job against Zarko. | combatBark |
| 283 | `toji_voice_283_t14m45_0s.mp3` | ja | 1.6 | I have to get a bonus. | discard/held |
| 284 | `toji_voice_284_t14m46_9s.mp3` | ja | 1.7 | I'm not in a bad mood. | discard/held |
| 285 | `toji_voice_285_t14m49_0s.mp3` | ja | 0.8 | It's over. | discard/held |
| 286 | `toji_voice_286_t14m50_8s.mp3` | ja | 0.7 | KOROSU! | discard/held |
| 287 | `toji_voice_287_t14m51_7s.mp3` | ja | 0.7 | Let's go! | discard/held |
| 288 | `toji_voice_288_t14m54_0s.mp3` | ja | 0.6 | Tch! | discard/held |
| 289 | `toji_voice_289_t14m55_6s.mp3` | en | 0.6 | UGH! | discard/held |
| 290 | `toji_voice_290_t14m56_4s.mp3` | ja | 1.0 | Jujutsu Kaisen | discard/held |
| 291 | `toji_voice_291_t14m57_8s.mp3` | ja | 2.3 | The one who was targeted by me is the moon of fortune. | intro |
| 292 | `toji_voice_292_t15m00_6s.mp3` | ja | 0.7 | Just a little bit. | discard/held |
| 293 | `toji_voice_293_t15m01_9s.mp3` | ja | 1.3 | I wonder if the feeling is back. | combatBark |
| 294 | `toji_voice_294_t15m03_5s.mp3` | ja | 1.9 | I'm not going to suffer like that. | combatBark |
| 295 | `toji_voice_295_t15m07_0s.mp3` | ko | 1.1 | Even before I die. | discard/held |
| 296 | `toji_voice_296_t15m08_6s.mp3` | ja | 1.8 | I'll do whatever you want. | discard/held |
| 297 | `toji_voice_297_t15m10_9s.mp3` | ja | 0.8 | I'm sorry. | discard/held |
| 298 | `toji_voice_298_t15m12_1s.mp3` | ru | 0.7 | Chenison | discard/held |
| 299 | `toji_voice_299_t15m13_2s.mp3` | sv | 0.7 | Marina! | discard/held |
| 300 | `toji_voice_300_t15m14_3s.mp3` | ja | 1.2 | Are you looking forward to it? | discard/held |
| 301 | `toji_voice_301_t15m16_0s.mp3` | ja | 1.3 | Thank you very much. | discard/held |
| 302 | `toji_voice_302_t15m17_6s.mp3` | en | 0.6 | Jenna | discard/held |
| 303 | `toji_voice_303_t15m18_5s.mp3` | ja | 0.8 | Thank you for your hard work. | discard/held |
| 304 | `toji_voice_304_t15m20_5s.mp3` | ko | 1.3 | I'm young. | discard/held |
| 305 | `toji_voice_305_t15m22_4s.mp3` | ja | 2.0 | So that's how it was made? | discard/held |
| 306 | `toji_voice_306_t15m24_9s.mp3` | ja | 1.0 | That's a lot of work. | discard/held |
| 307 | `toji_voice_307_t15m26_6s.mp3` | ja | 0.8 | I'll be right in front of you. | discard/held |
| 308 | `toji_voice_308_t15m27_7s.mp3` | ja | 0.8 | Get out of the way. | discard/held |
| 309 | `toji_voice_309_t15m29_0s.mp3` | ja | 1.6 | Is it better to go down? | discard/held |
| 310 | `toji_voice_310_t15m31_1s.mp3` | ja | 1.5 | It's better to go down. | discard/held |
| 311 | `toji_voice_311_t15m33_4s.mp3` | ja | 0.9 | It's better if you drink it. | discard/held |
| 312 | `toji_voice_312_t15m34_8s.mp3` | ja | 1.1 | I'll take care of him. | discard/held |
| 313 | `toji_voice_313_t15m36_2s.mp3` | ja | 0.9 | It's a gunshot. | discard/held |
| 314 | `toji_voice_314_t15m37_5s.mp3` | ja | 0.8 | Let's do this. | discard/held |
| 315 | `toji_voice_315_t15m38_7s.mp3` | ja | 0.8 | It's a dinosaur attack. | discard/held |
| 316 | `toji_voice_316_t15m40_1s.mp3` | ko | 0.8 | Come on. | discard/held |
| 317 | `toji_voice_317_t15m41_5s.mp3` | ja | 0.9 | It's a white line. | discard/held |
| 318 | `toji_voice_318_t15m42_6s.mp3` | ja | 1.4 | It's a revolutionary technique. | combatBark |
| 319 | `toji_voice_319_t15m44_4s.mp3` | ja | 1.5 | The square is thicker. | discard/held |
| 320 | `toji_voice_320_t15m46_3s.mp3` | ja | 1.6 | It's better to get closer. | discard/held |
| 321 | `toji_voice_321_t15m48_5s.mp3` | ja | 1.6 | It's better to be separated from each other. | combatBark |
| 322 | `toji_voice_322_t15m50_5s.mp3` | ja | 1.5 | It's better to get away from it. | combatBark |
| 323 | `toji_voice_323_t15m52_4s.mp3` | ja | 0.7 | I'll do it. | discard/held |
| 324 | `toji_voice_324_t15m53_4s.mp3` | ja | 0.8 | I will do it. | discard/held |
| 325 | `toji_voice_325_t15m54_5s.mp3` | ja | 1.3 | Come on, follow me. | discard/held |
| 326 | `toji_voice_326_t15m56_2s.mp3` | ja | 1.3 | Come on, follow me. | discard/held |
| 327 | `toji_voice_327_t15m58_0s.mp3` | ja | 0.8 | That's right. | discard/held |
| 328 | `toji_voice_328_t15m59_1s.mp3` | ja | 1.5 | It's getting interesting. | discard/held |
| 329 | `toji_voice_329_t16m01_1s.mp3` | ja | 0.7 | I'll kill you. | discard/held |
| 330 | `toji_voice_330_t16m02_1s.mp3` | ko | 1.1 | Are you all right? | discard/held |
| 331 | `toji_voice_331_t16m03_7s.mp3` | ja | 1.2 | I love you. | discard/held |
| 332 | `toji_voice_332_t16m05_5s.mp3` | ja | 1.2 | That's what it looks like. | discard/held |
| 333 | `toji_voice_333_t16m07_3s.mp3` | ja | 0.6 | Are you serious? | discard/held |
| 334 | `toji_voice_334_t16m08_3s.mp3` | pl | 1.0 | I'm sorry. | discard/held |
| 335 | `toji_voice_335_t16m09_8s.mp3` | ja | 1.0 | Hey, Otsukore! | discard/held |
| 336 | `toji_voice_336_t16m11_1s.mp3` | zh | 1.1 | Open it. Open it. | discard/held |
| 337 | `toji_voice_337_t16m12_6s.mp3` | ja | 1.3 | I don't have any weight. | discard/held |
| 338 | `toji_voice_338_t16m14_4s.mp3` | ja | 1.7 | He's like a wise man. | discard/held |
| 339 | `toji_voice_339_t16m16_4s.mp3` | ja | 1.2 | I'm impressed by your parents. | discard/held |
| 340 | `toji_voice_340_t16m18_0s.mp3` | ja | 0.8 | That's great. | discard/held |
| 341 | `toji_voice_341_t16m20_4s.mp3` | ja | 0.8 | It's a monster. | lowHealth |
| 342 | `toji_voice_342_t16m21_6s.mp3` | ja | 1.3 | Well, what do you think? | discard/held |
| 343 | `toji_voice_343_t16m23_3s.mp3` | ja | 0.9 | It's not a hobby. | discard/held |
| 344 | `toji_voice_344_t16m24_6s.mp3` | ja | 1.1 | I'm not good at this either. | discard/held |
| 345 | `toji_voice_345_t16m26_5s.mp3` | ja | 1.5 | Do you remember the name of a man? | combatBark |
| 346 | `toji_voice_346_t16m28_6s.mp3` | ja | 1.5 | Ah, that's what it means. | discard/held |
| 347 | `toji_voice_347_t16m30_4s.mp3` | ja | 1.4 | It's so hard. | discard/held |
| 348 | `toji_voice_348_t16m31_9s.mp3` | ja | 1.8 | I hate it when people look at me like I don't have anything to eat. | combatBark |
| 349 | `toji_voice_349_t16m34_0s.mp3` | ja | 0.8 | That's right. | discard/held |
| 350 | `toji_voice_350_t16m35_1s.mp3` | ja | 0.9 | It's okay whenever you want. | discard/held |
| 351 | `toji_voice_351_t16m37_1s.mp3` | ja | 1.1 | I'm done with the next one. | win |
| 352 | `toji_voice_352_t16m38_5s.mp3` | ja | 0.8 | Wait a minute. | discard/held |
| 353 | `toji_voice_353_t16m39_7s.mp3` | ja | 0.9 | I'll change it once. | discard/held |
| 354 | `toji_voice_354_t16m40_8s.mp3` | ja | 1.5 | The current battle isn't bad, is it? | combatBark |
| 355 | `toji_voice_355_t16m42_9s.mp3` | ja | 0.7 | It's fine now, right? | discard/held |
| 356 | `toji_voice_356_t16m44_9s.mp3` | ja | 1.0 | I should be able to handle it. | discard/held |
| 357 | `toji_voice_357_t16m46_3s.mp3` | ja | 1.6 | You have to think about how to deal with it. | combatBark |
| 358 | `toji_voice_358_t16m48_3s.mp3` | ja | 1.1 | Yes, that's right. | discard/held |
| 359 | `toji_voice_359_t16m49_7s.mp3` | zh | 1.0 | Open it. Open it. | discard/held |
| 360 | `toji_voice_360_t16m51_2s.mp3` | ja | 1.8 | This is the end of the game, right? | combatBark |
| 361 | `toji_voice_361_t16m53_3s.mp3` | ja | 1.1 | Interesting. | discard/held |
| 362 | `toji_voice_362_t16m54_9s.mp3` | ja | 0.9 | I'll change it once. | discard/held |
| 363 | `toji_voice_363_t16m56_1s.mp3` | ja | 0.6 | I wonder if I can do it. | discard/held |
| 364 | `toji_voice_364_t16m57_8s.mp3` | ja | 0.9 | It's perfect. | discard/held |
| 365 | `toji_voice_365_t16m59_0s.mp3` | ja | 1.4 | You're so annoying. | discard/held |
| 366 | `toji_voice_366_t17m00_9s.mp3` | ja | 0.8 | I'm counting on you. | discard/held |
| 367 | `toji_voice_367_t17m02_1s.mp3` | ja | 0.9 | You can do whatever you want. | discard/held |
| 368 | `toji_voice_368_t17m03_3s.mp3` | ja | 1.5 | It's getting interesting. | discard/held |
| 369 | `toji_voice_369_t17m08_5s.mp3` | en | 0.5 | Huh? | discard/held |
| 370 | `toji_voice_370_t17m09_5s.mp3` | en | 0.6 | Heh. | discard/held |
| 371 | `toji_voice_371_t17m10_4s.mp3` | ja | 0.6 | All right. | discard/held |
| 372 | `toji_voice_372_t17m11_4s.mp3` | ja | 0.9 | It's perfect. | discard/held |
| 373 | `toji_voice_373_t17m14_9s.mp3` | ja | 1.4 | You're so annoying. | discard/held |
| 374 | `toji_voice_374_t17m18_1s.mp3` | ja | 0.6 | Are you serious? | discard/held |
| 375 | `toji_voice_375_t17m19_1s.mp3` | ja | 1.1 | Interesting. | discard/held |
| 376 | `toji_voice_376_t17m20_7s.mp3` | ja | 0.6 | Let's do it. | discard/held |
| 377 | `toji_voice_377_t17m21_8s.mp3` | ja | 1.0 | Is that so? | discard/held |
| 378 | `toji_voice_378_t17m23_2s.mp3` | en | 0.7 | Sot it. | discard/held |
| 379 | `toji_voice_379_t17m26_6s.mp3` | ja | 1.1 | I'll do it. | discard/held |
| 380 | `toji_voice_380_t17m28_3s.mp3` | ja | 1.0 | I don't give a damn. | hitReact |
| 381 | `toji_voice_381_t17m29_7s.mp3` | ja | 0.8 | I'm counting on you. | discard/held |
| 382 | `toji_voice_382_t17m31_7s.mp3` | ja | 0.9 | Well, wait. | discard/held |
| 383 | `toji_voice_383_t17m33_9s.mp3` | en | 0.6 | Damn it. | hitReact |
| 384 | `toji_voice_384_t17m35_3s.mp3` | ja | 0.7 | You are... | discard/held |
| 385 | `toji_voice_385_t17m36_8s.mp3` | ja | 0.9 | Do you want to live with me? | discard/held |
| 386 | `toji_voice_386_t17m38_1s.mp3` | ja | 0.8 | It's a dead end, isn't it? | discard/held |
| 387 | `toji_voice_387_t17m39_2s.mp3` | ja | 0.9 | Are you going to quit? | discard/held |
| 388 | `toji_voice_388_t17m40_4s.mp3` | ja | 0.6 | I quit. | discard/held |
| 389 | `toji_voice_389_t17m41_4s.mp3` | ja | 0.9 | Is it over? | discard/held |
