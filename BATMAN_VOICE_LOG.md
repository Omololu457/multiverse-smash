# Batman — Voice Content Log (68 clips)

Source: `batmaninj2_*.mp3` (Injustice 2, English). Cut by silence-detection (no transcript), then
transcribed with **faster-whisper (base.en + VAD)** and manually reviewed — the SAME pipeline proven
for the Flash / Reverse Flash batches (`tools/transcribe_batman.py`, mirroring the revflash approach).
Filenames encode only the original source timestamp, not content. This is the authoritative content
reference going forward.

**Totals:** 68 clips → **17 wired** into pools; discarded: **28 no-speech** (VAD silence / grunts ASR
can't transcribe / the "Thanks for watching" hallucination), **8 named-character** (Injustice "clash"
dialogue), **15 fragment/garble**.

**Pool sizes:** intro 4, taunt 5, hitReact 6, win 2. (special-cast + a separate hit-connect pool: **not
wired** — see `batmanVoice.js` header. No clip is a clean technique callout, and the taunt pool rides the
attacker-connect trigger, covering hit-connect per Flash/Gon precedent.)

Filtering rule (project-wide): discard any line referencing another SPECIFIC named character; discard pure
fragments / noise; keep genuinely usable, self-contained lines. Self-references and place-names Batman owns
(Gotham, Arkham, "the Justice League" as an org, "conquered fear") are kept.

| # | file | transcription | disposition |
|---|---|---|---|
| 000 | `batmaninj2_000_t00m18_6s.mp3` | You've picked your side, but we both have a job to do. It's about time you got over it. | POOL:intro |
| 001 | `batmaninj2_001_t00m23_6s.mp3` | You'll regret this, [t]empting… | discard:fragment/garble (tail unintelligible) |
| 002 | `batmaninj2_002_t00m25_6s.mp3` | But no. | discard:fragment |
| 003 | `batmaninj2_003_t00m35_7s.mp3` | Don't be so sure. | POOL:taunt |
| 004 | `batmaninj2_004_t01m16_3s.mp3` | Diana, you're on the wrong side. | discard:named(Diana) |
| 005 | `batmaninj2_005_t01m35_2s.mp3` | Beetle, stand down. | discard:named(Blue Beetle) |
| 006 | `batmaninj2_006_t01m48_4s.mp3` | You'll find plenty back in Arkham. | POOL:win |
| 007 | `batmaninj2_007_t02m35_8s.mp3` | That shadow keeps people safe. | POOL:taunt |
| 008 | `batmaninj2_008_t02m44_5s.mp3` | It's enough you came back done. | discard:garble |
| 009 | `batmaninj2_009_t02m52_6s.mp3` | Gotham will rise again. | POOL:win |
| 010 | `batmaninj2_010_t03m35_1s.mp3` | From you. | discard:fragment |
| 011 | `batmaninj2_011_t03m35_9s.mp3` | The Justice League is a calling. | POOL:intro (org, not a fighter) |
| 012 | `batmaninj2_012_t03m37_7s.mp3` | You're done, Atrocitus… You need help with Superman. You're going back to prison, Clark. | discard:named(Superman/Clark/Atrocitus) |
| 013 | `batmaninj2_013_t03m43_8s.mp3` | I am full of surprises. | POOL:taunt |
| 014 | `batmaninj2_014_t03m55_5s.mp3` | …I get that ring off you, you're going back to jail. | discard:garble (+ ring → Green Lantern) |
| 015 | `batmaninj2_015_t04m07_4s.mp3` | He'd be wise to give up. What's Wildcat been teaching you? … | discard:named(Wildcat) |
| 016 | `batmaninj2_016_t05m34_1s.mp3` | No. | discard:fragment |
| 017 | `batmaninj2_017_t05m34_9s.mp3` | But I despise them. | discard:fragment (no antecedent) |
| 018 | `batmaninj2_018_t05m36_2s.mp3` | A better son would deserve it. | discard:fragment (vague, no context) |
| 019 | `batmaninj2_019_t05m45_3s.mp3` | Thanks for coming back. | discard:fragment |
| 020 | `batmaninj2_020_t05m59_3s.mp3` | No, it hasn't. | discard:fragment |
| 021 | `batmaninj2_021_t06m00_3s.mp3` | …you have. | discard:fragment |
| 022 | `batmaninj2_022_t06m51_2s.mp3` | It's your chance to prove yourself. | POOL:intro |
| 023 | `batmaninj2_023_t07m13_9s.mp3` | Here we go again. I conquered fear long ago. | POOL:intro |
| 024 | `batmaninj2_024_t07m32_7s.mp3` | I could say the same, son. | discard:fragment (vague) |
| 025 | `batmaninj2_025_t07m44_0s.mp3` | That's new. | discard:fragment |
| 026 | `batmaninj2_026_t07m44_7s.mp3` | Loyalty was never your strength. | POOL:taunt |
| 027 | `batmaninj2_027_t08m11_1s.mp3` | You know exactly what you're in for. [Make sure you do that.] | POOL:taunt (clean lead; tail minor) |
| 028 | `batmaninj2_028_t08m14_4s.mp3` | Just stop you. | discard:fragment |
| 029 | `batmaninj2_029_t08m15_4s.mp3` | You don't kill. You shouldn't have killed the Joker. … | discard:named(Joker) |
| 030 | `batmaninj2_030_t08m20_8s.mp3` | But it's forgotten we are allies. | discard:garble |
| 031 | `batmaninj2_031_t08m53_6s.mp3` | …It's Iron Heights for you, Snart. We were friends once, Clark. | discard:named(Snart/Clark) |
| 032 | `batmaninj2_032_t08m58_5s.mp3` | I'm way ahead of you, it's over Diana, I never quit… | discard:named(Diana) |
| 033 | `batmaninj2_033_t09m33_7s.mp3` | Is that supposed to scare me? … The Scarab understands we don't kill, Clark. | discard:named(Clark/Scarab) |
| 034 | `batmaninj2_034_t09m59_9s.mp3` | *(no speech)* | discard:no-speech |
| 035 | `batmaninj2_035_t10m02_0s.mp3` | *(no speech)* | discard:no-speech |
| 036 | `batmaninj2_036_t10m07_7s.mp3` | *(no speech)* | discard:no-speech |
| 037 | `batmaninj2_037_t10m09_7s.mp3` | *(no speech)* | discard:no-speech |
| 038 | `batmaninj2_038_t10m11_5s.mp3` | *(ASR hallucination: "Thanks for watching…")* | discard:no-speech (silence hallucination) |
| 039 | `batmaninj2_039_t10m13_1s.mp3` | *(no speech)* | discard:no-speech |
| 040 | `batmaninj2_040_t10m13_9s.mp3` | *(no speech)* | discard:no-speech |
| 041 | `batmaninj2_041_t10m14_6s.mp3` | *(no speech)* | discard:no-speech |
| 042 | `batmaninj2_042_t10m15_5s.mp3` | *(no speech)* | discard:no-speech |
| 043 | `batmaninj2_043_t10m16_5s.mp3` | *(no speech)* | discard:no-speech |
| 044 | `batmaninj2_044_t10m17_6s.mp3` | *(no speech)* | discard:no-speech |
| 045 | `batmaninj2_045_t10m18_6s.mp3` | *(no speech)* | discard:no-speech |
| 046 | `batmaninj2_046_t10m20_3s.mp3` | *(no speech)* | discard:no-speech |
| 047 | `batmaninj2_047_t10m25_9s.mp3` | *(no speech)* | discard:no-speech |
| 048 | `batmaninj2_048_t10m28_2s.mp3` | *(no speech)* | discard:no-speech |
| 049 | `batmaninj2_049_t10m29_4s.mp3` | *(no speech)* | discard:no-speech |
| 050 | `batmaninj2_050_t10m33_8s.mp3` | *(no speech)* | discard:no-speech |
| 051 | `batmaninj2_051_t10m37_4s.mp3` | You… | discard:no-speech (bare artifact) |
| 052 | `batmaninj2_052_t10m39_3s.mp3` | *(no speech)* | discard:no-speech |
| 053 | `batmaninj2_053_t10m41_8s.mp3` | *(no speech)* | discard:no-speech |
| 054 | `batmaninj2_054_t10m42_9s.mp3` | *(no speech)* | discard:no-speech |
| 055 | `batmaninj2_055_t10m51_6s.mp3` | *(no speech)* | discard:no-speech |
| 056 | `batmaninj2_056_t10m54_5s.mp3` | *(no speech)* | discard:no-speech |
| 057 | `batmaninj2_057_t10m56_8s.mp3` | *(no speech)* | discard:no-speech |
| 058 | `batmaninj2_058_t10m59_1s.mp3` | *(no speech)* | discard:no-speech |
| 059 | `batmaninj2_059_t11m00_9s.mp3` | *(no speech)* | discard:no-speech |
| 060 | `batmaninj2_060_t11m06_5s.mp3` | Ah, ah. *(effort grunt)* | POOL:hitReact |
| 061 | `batmaninj2_061_t11m13_9s.mp3` | *(no speech)* | discard:no-speech |
| 062 | `batmaninj2_062_t11m15_2s.mp3` | Ahh! *(pain grunt)* | POOL:hitReact |
| 063 | `batmaninj2_063_t11m16_1s.mp3` | Ugh! *(pain grunt)* | POOL:hitReact |
| 064 | `batmaninj2_064_t11m18_1s.mp3` | Huh?! *(reaction grunt)* | POOL:hitReact |
| 065 | `batmaninj2_065_t11m24_1s.mp3` | Ahh! *(pain grunt)* | POOL:hitReact |
| 066 | `batmaninj2_066_t11m25_8s.mp3` | Ahh! *(pain grunt)* | POOL:hitReact |
| 067 | `batmaninj2_067_t11m31_2s.mp3` | *(no speech)* | discard:no-speech |

---

## Discard tally

| reason | count | clips |
|---|---|---|
| no-speech (VAD silence / grunt-SFX / hallucination) | 28 | 034–059 (minus none), 061, 067, 038, 051 |
| named-character (Injustice clash dialogue) | 8 | 004, 005, 012, 015, 029, 031, 032, 033 |
| fragment / garble | 15 | 001, 002, 008, 010, 014, 016, 017, 018, 019, 020, 021, 024, 025, 028, 030 |
| **total discarded** | **51** | |
| **wired** | **17** | intro 4 · taunt 5 · hitReact 6 · win 2 |
