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

## 2026-11-22 — Gojo parity pass (user: "make him just as fast as Gojo … make him do as much damage as Gojo")

Target: Satoru Gojo (Shinjuku) — `gojo_shinjuku`, the new Gojo with the creative skins.

**Speed.** Walking was already identical in-game (414 px / 60 f for both; the engine derives live speed). The gap
was Gojo's double-tap mobility: his teleport (→→ toward, 1119 px in the test lane) and long blink (←← away, 445 px)
against Sukuna's plain dash (102 / 169 px). Sukuna now has the same reach and the same cooldowns, done as a blur:
- **Blur dash** (double-tap toward the foe): lands beside them (Gojo's 8 px gap) over 2 + 5 frames; 48 f cooldown,
  10 f attack lock — Gojo's teleport numbers. Measured: 1120 px (Gojo 1119).
- **Back-step** (double-tap away): Gojo's blink — 0.40 screen, startup 2 / travel 5 (invulnerable) / recovery 8, 30 f
  cooldown. Measured: 445 px (Gojo 445).
- His CPU uses both like Gojo's CPU: rush in when far (same deterministic roll), back-step from a close projectile.
- Stats file also mirrors Gojo's speed / dash fields (94 / 22 / 9 / 24).

**Damage.** Per hit he already matched Gojo's normals (jab 31 vs 30, heavy 73 vs 67, Cleave 133 vs Blue Fist 136), but
head-to-head he dealt less because Infinity stops his hits. One factor, `POWER` in `sukunaShinjukuData.js`, scales
every Sukuna (Shinjuku) hit. CPU-vs-CPU duels vs Gojo, both sides, 16 seeds, damage dealt per minute:

| POWER | Sukuna | Gojo | ratio |
|---|---|---|---|
| ×1.15 | 1250 | 1345 | 0.93 |
| ×1.3 | 1478 | 1312 | 1.13 |
| **×1.2** | — | — | ≈ 1.0 (chosen) |

New numbers (brief × 1.2): punches 38 / 38 / 58, heavy 89, launcher 98, knee 91, air 74, dash attack 70, Cleave
72 + 7.2 % max HP, Dismantle 66 (fan 3 × 36), Spiderweb 84, Fuga 108 / 168 / 240, World-Cutting Slash 456.
The copied Malevolent Shrine is the old Sukuna's code and is unchanged.

### 2026-11-22 (later) — ×1.5 speed

What the user asked for, after the parity pass: "a lot faster, like 1.5 times faster than he is now". `SPEED = 1.5` in `sukunaShinjukuData.js`.
- **How it is applied.** physics.js reads `f._sksSpeed`, which is set only for him in tickSks, through the phase-5 hooks in `tools/sukunashinjuku/apply_hooks.py`. It multiplies his walk, run, air drift and engine dash.
- **Blur dash and back-step** run their wind-up, travel and recovery 1.5× faster: 2/5/2 → 1/3/1 and 2/5/8 → 1/3/5 frames. Reach and cooldowns stay Gojo's.

Measured (`scratchpad movecmp`, 60 f walk, both fighters):

| | Sukuna before | Sukuna now | Gojo |
|---|---|---|---|
| Walk, px / 60 f | 414 | **621** (×1.5) | 414 |
| Forward jump, px | 497 | **797** | 497 |
| Blur dash / teleport, px | 1120 | 1118 | 1119 |
| Back-step / blink, px (wide lane) | 445 | 414 | 445 |

The blur dash now lands in 5 frames instead of 7.

The back-step still plans Gojo's 512 px. In the wide comparison lane, the camera's max-separation clamp stops it early: 414 px for him and 445 px for Gojo, because his faster walk had already opened the gap a little. From a close start, the harness measures 507 px.

### 2026-11-22 — Ten Shadows add-on

Full map and rules: `TEN_SHADOWS.md`.
- **Damage** goes through his one hit path, so POWER ×1.2 applies. Raw numbers follow Megumi's tuned shikigami (`megumiData.js`).
- **Costs:**
  - The normal-button summons are free but gated by cooldowns (0.7–3.3 s).
  - Totality and Max Elephant cost 1 bar.
  - Mahoraga and the Chimera Shadow Garden each cost the full meter. His meter is 2.1 bars, so "3 bars" became "full meter".
  - The Garden is once per round.
- **Satoru Gojo's Infinity** stops summon hits the same way it stops his other techniques.
- **Domain Amplification** locks Ten Shadows, like his other techniques.
