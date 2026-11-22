# MSV1-SUKUNA — Balance notes

**Baseline.** HP 1240 and the 210 cursed-energy meter are the old Sukuna's, unchanged. The engine regenerates
the meter, and every clean hit gives +8% of its raw damage back.

| Technique | Cost | Damage (raw) | Why |
|---|---|---|---|
| Dismantle | 12 | 55 slash, 11f, 65% screen | cheap, fast poke; cuts non-super projectiles, so it is his zoning answer. Mid-height thin box, blockable (12% chip). |
| Dismantle fan | 24 (12 + 12) | 3 × 30 | covers jump-ins / spread; the centre cut is the one that usually lands |
| Cleave | 15 | 60 + 6% of the target's MAX HP (≈ 134 vs 1240 HP) | scales with the opponent: big vs tanks, modest vs light fighters. Ignores armor / super armor, but very short range and −10 recovery on whiff |
| Spiderweb | 18 | 70 low, OTG | beats standing guard, punishes knockdowns, removes traps / patches / ice discs |
| Fuga | 35 | 90 / 140 / 200 + burn (3 every 20f for 2s) + FIRE patch | slow gather (0.5 / 1.0 / 1.5 s) that is lost if he is hit, so the big damage has a real risk |
| Empowered Fuga | 35 | 300 | only in the 3 s after his Shrine ends |
| Domain Amplification | 20 | — | 3 s of hits that ignore Infinity, at the price of every technique; 10 s cooldown |
| World-Cutting Slash | 200 (2 bars) | 380 unblockable | 75-frame chant that is easy to interrupt (half refunded); invulnerability still dodges it |
| Malevolent Shrine | full meter | the old Shrine (sure-hit 14 per 130 f, 15 s) | identical to the old Sukuna |

**Combos.** The best meterless string (5 hits) does 229. That is the old Sukuna's damage band for a full combo.

**Versus Satoru Gojo (Shinjuku).** Infinity stops his normals and techniques. Domain Amplification and World Slash
are the canon answers, but Amplification locks his techniques for 3 s and the World Slash chant can be interrupted.
The CPU only uses Amplification after Infinity has stopped one of its hits. Domain clash: mashing Special decides it.
The loser gets a 5 s technique burnout.

**Tuning knobs.** All numbers live in `sukunaShinjukuData.js` (COST / DISMANTLE / CLEAVE / WEB / FUGA / AMP / WORLD).
The old Sukuna's numbers live in abilities.js and characters.js and are untouched (frame-data diff ZERO).
