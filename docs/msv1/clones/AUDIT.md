# MSV1-CLONES — clone-move audit (HEAD ece81fd04, before any change)

Five characters: **naruto, sasuke, tobirama, madara, hashirama**. `sasuke_adult` has no clone moves (not in any clone table).
Clones come from four systems; raw damage values below (the global ×0.60 damage scale in combat.js applies on top).

| System | File | Who |
|---|---|---|
| A. authored ghost-body runs | narutoChoreography.js | Naruto only |
| B. authored ghost-body runs | cloneChoreography.js (`CHOREO_BY_CHAR`) | Sasuke (light kit), Tobirama, Madara, Hashirama (+ others, untouched) |
| C. persistent "," clones | summons.js | Tobirama (cap 3), Hashirama (cap 4), Madara (cap 3) — P1 keyboard only, decoys (no damage by default) |
| D. one-shot "h" moves | abilities.js 550-659 | Tobirama, Hashirama — P1 keyboard only |

**Costs / cooldowns actually charged** (the per-sequence `cost` / `cooldown` fields are never read):
generic summon `SUMMON_COST` 25 × form costMult + `_choreoCd` `SUMMON_CD` 12; Naruto summon 25 × costMult, `_choreoCd` 12;
Naruto Down+Special flat 40, `_choreoCd` 90. Select / swarm presses cost nothing extra. Caster lock = `duration` + 1 frames.
Form scaling (cloneFormScaling.js): stage 0/1/2 → damage ×1.0/1.4/1.7, cost ×1.0/1.25/1.5, **formation** shows 4/8/12 clones
(the run itself keeps its fixed clone count). Naruto: shroudStage 1-4 → 1, 5 → 2. Sasuke: _susanooStage. Madara: _madaraSusanoo (max 1).

## A. Naruto (narutoChoreography.js)
Inputs: Down+Special or ↓→↓→+Special = Uzumaki Barrage (direct). Summon = Up+Special / ↓↓↑+Special / ↓↑+Special (formation 4/8/12),
then Special + N = barrage, B = shuriken, U = substitution, F = flank (D → barrage); Ultimate during the formation = Two Thousand.

| Move | Clones | Hits `at`: dmg → finisher | Total | Duration | Appear–vanish |
|---|---|---|---|---|---|
| Uzumaki Barrage | 3 | 4:14, 20:10, 34:12 → spike 52:26 | 62 | 78 | 2–30, 18–46, 32–60 |
| Two Thousand Combo | 4 slots / 7 beats | 4:12, 12:6, 18:6, 24:6, 30:7, 36:7, 44:8 → spike 58:30 | 82 | 92 | 2–20 … 42–58 |
| Shadow Clone Shuriken | 3 | proj 6:12, 12:12, 18:12, 26:14 → proj 36:22 | 72 | 58 | 2–26, 6–30, 12–36, 22–44 |
| Substitution Escape | 1 decoy | escape 4 (26 i-frames), proj 10 | 10 | 40 | 0–30 |
| Clone Flank Strike | 2 | 6:14, 8:14 → strike 20:20 | 48 | 56 | 2–26, 4–28 |
| Clone formation (summon) | 4 / 8 / 12 | — (select window 90) | — | 90 | — |

Dead Naruto clone code (needs persistent clones, which Naruto no longer has): Clone Rendan Storm, Uzumaki Rendan (Fwd+Heavy ≥3 clones),
Clone Rush, Team Orb, Substitution Chain, Pincer #16/#17/#19, Down finisher, `executeNarutoUzumakiBarrage` — never fire; left as is.

## B. cloneChoreography.js — summon ↓↓↑+Special (formation 4, Madara 4/8), then Special + N/F/B/U/D, Ultimate = swarm
**Sasuke** (light kit, no formation): **Amenotejikara** — ↓↓↑+Special (any direction), 1 afterimage (`dash`) at the start spot 0–30,
finisher 6: `chidoriKoiten` teleport behind (dx 58), 26 i-frames, melee 20. Duration 40. Cost 25/31/38.

**Tobirama**
| Seq | Name | Clones | Beats → finisher | Total | Dur |
|---|---|---|---|---|---|
| N pureAttack | Water Clone Barrage | 3 | 4:14 (tobiRisingWater), 20:10, 34:12 (tobiWaterSlash) → spike 52:26 | 62 | 78 |
| F grab | Water Prison Seize | 2 | 6:12, 8:12 (tobiWaterWall) → strike 22:22 | 46 | 58 |
| B ranged | Water Dragon Volley | 3 | proj 6, 12, 18 ×12 (tobiWaterDragon) → proj 30:22 | 58 | 58 |
| U defensive | Water Clone Guard | 1 | escape 4 (tobiWaterFlicker), 28 i-frames, proj 10 | 10 | 40 |
| D deception | Instant Revolving Swap | 1 | escape 6, 22 i-frames, melee 18 | 18 | 44 |
| Ult swarm | Great Waterfall Swarm | 4 / 7 beats | 12, 6, 6, 6, 7, 7, 8 → spike 58:30 | 82 | 92 |

**Hashirama**
| Seq | Name | Clones | Beats → finisher | Total | Dur |
|---|---|---|---|---|---|
| N | Wood Clone Onslaught | 5 | 5:12, 16:10, 28:10, 42:10, 56:11 → spike 74:30 | 83 | 96 |
| F | Deep Forest Emergence | 3 | 4:11, 4:11, 12:9 → strike 28:26 | 57 | 64 |
| B | Wood Pillar Barrage | 2 | proj 8:15, 20:15 → proj 34:26 | 56 | 60 |
| U | Wood Clone Bulwark | 2 | escape 5 (26 i-frames), proj 12 | 12 | 42 |
| D | Wood Clone Feint | 1 | escape 8 (20 i-frames), melee 21 | 21 | 46 |
| Ult | Sage Art: Deep Forest Bloom | 5 | 4:11, 12:7, 22:7, 34:8, 48:9 → spike 64:34 | 76 | 100 |

**Madara**
| Seq | Name | Clones | Beats → finisher | Total | Dur |
|---|---|---|---|---|---|
| N | Susanoo Wood Rise | 4 | 5:13, 18:11, 32:12, 48:12 → spike 64:30 | 78 | 86 |
| F | Wood Dragon Coil | 1 | 5:16 → strike 24:26 | 42 | 56 |
| B | Great Fireball Volley | 3 | proj 6, 12, 18 ×13 → proj 30:24 | 63 | 58 |
| U | Gunbai Guard | 1 | escape 4 (28 i-frames), proj 11 | 11 | 40 |
| D | Wood Clone Feint | 1 | escape 6 (22 i-frames), melee 19 | 19 | 44 |
| Ult | Perfect Susanoo | 5 | 4:12, 14:7, 26:7, 40:8, 56:9 → spike 72:36 | 79 | 104 |

## C. Persistent "," clones (summons.js) — Tobirama 3 / Hashirama 4 / Madara 3
"," spawns, "." disperses, "/" swaps (75 cd, 10 i-frames). No upfront cost (energy split per body). Hidden 16 f on spawn (smoke puff);
24 f hurt then destroyed. Decoys (mirror the owner), no damage by default. Despawn: Hashirama + Madara = wood log-dispersal
(`hashirama_wood_clone_release.png`), Tobirama = procedural water burst / ripple.

## D. One-shot "h" (P1 keyboard) — Tobirama / Hashirama
Neutral h clone strike: cost 24, cd 90, clone projectile at +8, dmg Tobirama 54 / Hashirama 62, vanish puff +26.
Fwd+h clone projectile: cost 24, cd 75, dmg 42 / 46. Back+h: Tobirama Water Wall (40 dmg, no clone body drawn); Hashirama Kawarimi (no clone).

## Element frames found in the sheets (used — no new art)
| Use | Sheet | Cells |
|---|---|---|
| Tobirama rises out of water / collapses back | `tobirama_water_teleport_after_hit_to_get_away_uniform.png` (`tobiWaterFlicker`, 92×67) | 2→5 rise (puddle → water figure → Tobirama in puddle), 5→2 collapse |
| Tobirama seal | `tobiWaterWall` (47×90) | caster pose during the lead-in |
| Hashirama wood clone grows | `hashirama_wood_clone_intro_uniform.png` (`woodCloneCast`, 102×81) | cells 2–10, right half (the clone) |
| Hashirama wood clone splinters | `hashirama_wood_clone_release.png` (85×100) | 0–3 |
| Hashirama seal | `handSigns` (55×76) | caster pose |
| Smoke (Naruto white / Sasuke small / Madara dark) | `madara_summon_smoke_uniform.png` (192×54) | 0–4, recoloured by a canvas filter |
| Madara seal | `madaraFireballCast` (hand-seal, 44×62) | caster pose |
Naruto and Sasuke have no seal / smoke animation in their sheets → they hold their idle pose while the ring runs in.
Other water sheets (tobiWaterDragon / tobiWaterSlash / tobiRisingWater) are attacks with Tobirama's body in every cell; not used.
