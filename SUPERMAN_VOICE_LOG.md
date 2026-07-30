# Superman — Voice Content Log (113 clips)

Source: `superman_*.mp3` (Injustice 2, English). Cut by silence-detection (no transcript), then
transcribed with **faster-whisper (base.en + VAD)** and manually reviewed — the SAME pipeline proven
for the Reverse Flash / Batman / Omni-Man batches (`tools/transcribe_superman.py`, mirroring the batman
approach). Filenames encode only the original source timestamp, not content. This is the authoritative
content reference going forward.

**Totals:** 113 clips → **29 wired** into pools; discarded: **28 no-speech** (VAD silence / grunts ASR
can't transcribe), **17 named-character** (Injustice "clash" dialogue that names another specific DC
fighter), **39 fragment/garble** (disjoint multi-line stitches, tail-garble, or too-terse fragments).

**Pool sizes:** intro 3, cast 4, taunt 9, lowHealth 1, win 2, hitReact 10.

Filtering rule (project-wide, applied identically every batch): discard any line referencing another
SPECIFIC named character; discard pure fragments / noise; keep genuinely usable, self-contained lines.
Self-references and place-names Superman OWNS (Earth, Krypton, "the hero Earth needs") are kept — the
Batman-Gotham/Arkham precedent. The Injustice 2 Superman pack is heavy on Regime "clash" dialogue that
names Batman(Bruce)/Flash(Barry)/Wonder-Woman(Diana)/Harley/Bane/Brainiac/Grodd/Sinestro/Hal/Blue-Beetle/
Aquaman(Sea King)/Black-Adam/Cyborg(Victor)/Swamp-Thing — all excluded per the rule.

| # | file | transcription | disposition |
|---|---|---|---|
| 000 | `superman_000_t00m00_0s.mp3` | Stop hurting people, Brainiac. He wasn't wrong about everything. | discard:named(Brainiac) |
| 001 | `superman_001_t00m24_1s.mp3` | This won't be a fair fun. | discard:garble |
| 002 | `superman_002_t00m25_5s.mp3` | You're acting like a teenager. I'll break you, Bane. What are you saying, Diana? …Harley. | discard:named(Bane/Diana/Harley) |
| 003 | `superman_003_t00m55_5s.mp3` | Then you know you can't win. | POOL:taunt |
| 004 | `superman_004_t00m57_4s.mp3` | Time to grow up. | POOL:taunt |
| 005 | `superman_005_t00m58_3s.mp3` | You'll need more than gas in a mask. I wouldn't threat. | discard:garble (tail unintelligible) |
| 006 | `superman_006_t01m01_6s.mp3` | Doctor, if we fight. | discard:fragment |
| 007 | `superman_007_t01m03_0s.mp3` | We fight for real. Let's warm up, Victor. You're ending our alliance… | discard:named(Victor/Cyborg) |
| 008 | `superman_008_t01m19_4s.mp3` | There won't be any ties today. I haven't forgotten. | POOL:intro (clean, no name) |
| 009 | `superman_009_t01m30_5s.mp3` | Traitors, all of you. I was right to lock you up. | POOL:intro (Regime flavor, no name) |
| 010 | `superman_010_t01m34_5s.mp3` | Neither are you. | discard:fragment (no antecedent) |
| 011 | `superman_011_t01m35_7s.mp3` | I've learned from my mistakes. This is your idea of date night. | discard:fragment (opponent-specific tail) |
| 012 | `superman_012_t01m39_5s.mp3` | That idea, Swamp Thing. | discard:named(Swamp Thing) |
| 013 | `superman_013_t01m41_3s.mp3` | Who are you? Only criminals need to fear me. I never thought you'd use it. Two words. | discard:garble (disjoint stitch) |
| 014 | `superman_014_t01m55_2s.mp3` | Get to the point, babe. | discard:fragment (opponent-specific) |
| 015 | `superman_015_t01m56_6s.mp3` | Why can't you stay dead? …Your son would disagree. | discard:garble (disjoint) |
| 016 | `superman_016_t02m08_0s.mp3` | At least I'm loyal, so you're Blue Beetle. We were Earth's only hope. | discard:named(Blue Beetle) |
| 017 | `superman_017_t02m12_0s.mp3` | Cocky as ever. I'm disappointed… Why leave the regime for Grodd? | discard:named(Grodd) |
| 018 | `superman_018_t02m30_4s.mp3` | I have Earth covered… something along those lines, that's never been a problem. | discard:garble (disjoint) |
| 019 | `superman_019_t02m45_3s.mp3` | How's that winning? | discard:fragment (terse/odd) |
| 020 | `superman_020_t03m05_6s.mp3` | This is my home too. I took one life to save millions. Ready to quit yet? Not strong enough. | discard:garble (4-way disjoint stitch) |
| 021 | `superman_021_t03m11_5s.mp3` | I'm the hero Earth needs. | POOL:intro (iconic self-ID, no name) |
| 022 | `superman_022_t03m13_9s.mp3` | Underestimate. | discard:fragment |
| 023 | `superman_023_t03m22_3s.mp3` | I'm sorry, Bruce. Running out of chances, Bruce… All hail the Sea King. | discard:named(Bruce/Aquaman) |
| 024 | `superman_024_t03m28_4s.mp3` | And you clearly don't know me. I thought you understood sarcasm. | POOL:taunt (clean, no name) |
| 025 | `superman_025_t03m32_2s.mp3` | Crime doesn't pay. | POOL:win (justice-served) |
| 026 | `superman_026_t03m33_4s.mp3` | I'm just warming up. | POOL:cast (power buildup) |
| 027 | `superman_027_t03m45_3s.mp3` | Not anymore. Earth's sun has made you strong. | discard:fragment (disjoint lead) |
| 028 | `superman_028_t03m55_8s.mp3` | Barry ran right back to Bruce, didn't he? | discard:named(Barry/Bruce) |
| 029 | `superman_029_t04m22_1s.mp3` | And I'm done wasting my breath… or celebrate your demise. | discard:garble |
| 030 | `superman_030_t04m25_7s.mp3` | It's not so superior. | discard:fragment |
| 031 | `superman_031_t04m27_1s.mp3` | How's that, Brainiac? You can't stop me… | discard:named(Brainiac) |
| 032 | `superman_032_t04m33_4s.mp3` | Here I'm Superman. | discard:garble (mangled self-ID) |
| 033 | `superman_033_t04m34_7s.mp3` | Still, you helped kill millions. You never quit, do you? | discard:garble (disjoint, opponent-history) |
| 034 | `superman_034_t04m38_6s.mp3` | …or bloody the water. | discard:fragment |
| 035 | `superman_035_t04m39_9s.mp3` | I thought things were under control. That was an accident. | discard:fragment (context-specific) |
| 036 | `superman_036_t04m55_0s.mp3` | That's not what I had planned. | discard:fragment (vague) |
| 037 | `superman_037_t05m18_8s.mp3` | You should be reunited with Joker, not for long. | discard:named(Joker) |
| 038 | `superman_038_t05m22_1s.mp3` | You asked for it. For Krypton. | POOL:cast (Krypton = own heritage, no other name) |
| 039 | `superman_039_t05m24_5s.mp3` | Harley Quinn vs. Superman. | discard:named(Harley Quinn) |
| 040 | `superman_040_t05m27_1s.mp3` | Fighting me was a mistake. What are you thinking, Adam? … | discard:named(Black Adam) |
| 041 | `superman_041_t05m32_5s.mp3` | This is Training Day. I'm nothing like you. | discard:garble (disjoint lead) |
| 042 | `superman_042_t05m35_5s.mp3` | I don't fear death. Justice requires order. I'll spare you nothing. Consider returning to them. | discard:garble (4-way disjoint stitch) |
| 043 | `superman_043_t05m41_4s.mp3` | No more Mr Boy Scout… found my weakness yet. It won't help him. I've felt | discard:garble |
| 044 | `superman_044_t05m46_3s.mp3` | Better. Now you'll fear me. I don't hurt children. Don't… | discard:garble (disjoint) |
| 045 | `superman_045_t05m49_9s.mp3` | Go there, Grodd. There. | discard:named(Grodd) |
| 046 | `superman_046_t05m51_5s.mp3` | …begging me to come back. | discard:garble |
| 047 | `superman_047_t05m52_8s.mp3` | How can you question me? | POOL:taunt (clean, no name) |
| 048 | `superman_048_t05m54_3s.mp3` | How's that for rage? Criminals like you, I'm about to. | discard:garble (tail unintelligible) |
| 049 | `superman_049_t05m58_3s.mp3` | What you have can't be cured. I'll never stop fighting. | POOL:lowHealth (defiant, no name) |
| 050 | `superman_050_t06m02_1s.mp3` | You need an upgrade. | POOL:taunt (clean, no name) |
| 051 | `superman_051_t06m03_2s.mp3` | You're an opportunist. Sinestro was right about you. | discard:named(Sinestro) |
| 052 | `superman_052_t06m13_8s.mp3` | You're tugging on the wrong cape. | POOL:cast (power flex, no name) |
| 053 | `superman_053_t06m15_5s.mp3` | Help me shake it off. | discard:fragment |
| 054 | `superman_054_t06m26_1s.mp3` | Learn anything interesting? You can't win this… my home. | discard:garble (disjoint) |
| 055 | `superman_055_t06m29_7s.mp3` | My rule. | discard:fragment |
| 056 | `superman_056_t06m30_4s.mp3` | All those weapons against my bare hands? | POOL:cast (power flex, no name) |
| 057 | `superman_057_t06m33_4s.mp3` | I took one life. | discard:fragment (incomplete Regime ref) |
| 058 | `superman_058_t06m42_1s.mp3` | Let's clear the air off. | discard:garble |
| 059 | `superman_059_t06m43_3s.mp3` | You betrayed. | discard:fragment |
| 060 | `superman_060_t06m51_2s.mp3` | Want some honest feedback? | POOL:taunt (clean, no name) |
| 061 | `superman_061_t06m52_6s.mp3` | Red Lantern. | discard:named/fragment (Red Lantern) |
| 062 | `superman_062_t06m53_5s.mp3` | Ever hear of Murphy's law? If it isn't a bad seed herself. | discard:garble (opponent-specific) |
| 063 | `superman_063_t07m04_6s.mp3` | You're too distracted… Not till Kingdom Come. | discard:garble (disjoint) |
| 064 | `superman_064_t08m07_8s.mp3` | I'll give you points for honesty. Time to die, [name]. | discard:named (garbled opponent name) |
| 065 | `superman_065_t08m11_4s.mp3` | Here's where I fly over it. | discard:garble |
| 066 | `superman_066_t08m13_5s.mp3` | I have and will again. | discard:fragment (no antecedent) |
| 067 | `superman_067_t08m15_3s.mp3` | What happens next is on you. You have to earn my respect. | POOL:taunt (clean, no name) |
| 068 | `superman_068_t08m43_7s.mp3` | Pick off the ring, Hal. I won't go back to prison… | discard:named(Hal/Green Lantern) |
| 069 | `superman_069_t08m49_6s.mp3` | Please don't get up. | POOL:win (condescending finisher) |
| 070 | `superman_070_t08m50_7s.mp3` | But you'll hurt innocent people… I'm who you're trying to be. | discard:garble (disjoint) |
| 071 | `superman_071_t08m56_0s.mp3` | Give up or get hurt. Everyone says that the first time. | POOL:taunt (clean, no name) |
| 072 | `superman_072_t09m08_3s.mp3` | I have a bad history with odd plants… you give aliens a bad name. | discard:garble (disjoint/opponent-specific) |
| 073 | `superman_073_t09m23_2s.mp3` | Now, what purpose will this serve? | POOL:taunt (clean, no name) |
| 074 | `superman_074_t09m25_2s.mp3` | This is getting personal. That's a little too hopeful. Didn't stop me… | discard:garble (disjoint) |
| 075 | `superman_075_t09m33_0s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 076 | `superman_076_t09m34_2s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 077 | `superman_077_t09m35_4s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 078 | `superman_078_t09m37_0s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 079 | `superman_079_t09m37_9s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 080 | `superman_080_t09m39_0s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 081 | `superman_081_t09m41_0s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 082 | `superman_082_t09m45_8s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 083 | `superman_083_t09m50_4s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 084 | `superman_084_t09m51_2s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 085 | `superman_085_t09m52_4s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 086 | `superman_086_t09m53_4s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 087 | `superman_087_t09m54_4s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 088 | `superman_088_t09m56_4s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 089 | `superman_089_t09m58_7s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 090 | `superman_090_t10m02_2s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 091 | `superman_091_t10m08_1s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 092 | `superman_092_t10m10_8s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 093 | `superman_093_t10m12_7s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 094 | `superman_094_t10m24_6s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 095 | `superman_095_t10m26_5s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 096 | `superman_096_t10m32_9s.mp3` | Huh? Huh? | POOL:hitReact (effort grunt) |
| 097 | `superman_097_t10m35_4s.mp3` | Ugh! | POOL:hitReact |
| 098 | `superman_098_t10m45_2s.mp3` | Ah! | POOL:hitReact |
| 099 | `superman_099_t10m46_4s.mp3` | Ah! | POOL:hitReact |
| 100 | `superman_100_t10m47_6s.mp3` | Ugh! | POOL:hitReact |
| 101 | `superman_101_t10m48_7s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 102 | `superman_102_t10m50_1s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 103 | `superman_103_t10m51_3s.mp3` | Ahhh! | POOL:hitReact (heavy) |
| 104 | `superman_104_t10m54_2s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 105 | `superman_105_t11m02_8s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 106 | `superman_106_t11m06_3s.mp3` | Ahhh! | POOL:hitReact (heavy) |
| 107 | `superman_107_t11m07_4s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 108 | `superman_108_t11m08_7s.mp3` | Ugh. | POOL:hitReact |
| 109 | `superman_109_t11m10_5s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 110 | `superman_110_t11m11_5s.mp3` | *(no speech — VAD silence)* | discard:no-speech |
| 111 | `superman_111_t11m12_4s.mp3` | Ugh! | POOL:hitReact |
| 112 | `superman_112_t11m13_9s.mp3` | Ah! | POOL:hitReact |

## Wired pools (29 clips)

- **intro (3)** — 008, 009, 021
- **cast (4)** — 026, 038, 052, 056 · special / flight-toggle / mode-activation / ultimate
- **taunt (9)** — 003, 004, 024, 047, 050, 060, 067, 071, 073 · rides the attacker strong/long-string connect
- **lowHealth (1)** — 049 · once, crossing the 30% HP line
- **win (2)** — 025, 069 · match victory
- **hitReact (10)** — 096, 097, 098, 099, 100, 103, 106, 108, 111, 112 · defender got hit

TAUNT has no dedicated mechanic (Superman DOES have a `taunt` action for the universal hold-Down heal,
but enrolling voice there would tie a bark to a heal — the pack's trash-talk rides the offense-connect
trigger instead, matching Batman/Omni-Man/Flash precedent; audio-only, no gameplay change).
