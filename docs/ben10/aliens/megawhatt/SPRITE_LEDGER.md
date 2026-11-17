# Megawhatt — SPRITE LEDGER

**Sheet by Dragondor** ("Megawhatt sprite sheet made by Dragondor — Please, give credits if used!"). Source: `assets/sprites/ben10/aliens/megawhatt.png` (555×382). Sliced by `tools/ben10/slice_megawhatt.py` (re-runnable; writes `megawhattAssets.js`, the `ben10_megawhatt_*` strips, `contact_sheet.png` and `source_grid.json`).

## Cut rules

- Background key: exact light blue `(188,231,241)` sampled at all four corners, **zero tolerance**; asserted that no art pixel lies within 40 of it (his yellow / white / black / grey / red / green palette never collides).
- 8-connected components. Removed: 35 text-label glyph components (pure black, <60 px) and the white credit box (1 component, lettering inside it). Every remaining component is assigned (asserted).
- Electricity touching him stays in his frame (Attack → streaks, Attack ↓ starbursts). Free-floating electricity is exported as **FX**, never cropped: spark balls (`fx_spark`), the bolt column with its ground impact (`fx_bolt`), the starburst (`fx_star`).
- Anchor: **body centre** (centroid of the dark outline pixels; silhouette centroid for the fully-glowing charge-up frames) placed at one consistent height (9.66 px native, = the stand frames') above the ground line (`originY` 44) in a 128×56 cell. He floats; every pose shares the same ground offset.
- Nearest-neighbour only (1:1 copies). Size: Ben's spriteScale 2 × `actionScale` 2.0 = **integer ×4** → ≈72 px tall on screen vs human Ben ≈108 px. Hurtbox is set to match (see registry entry).

## Charged / drained pairs (verified)

Every label has two groups: **CHARGED** (yellow body, red eyes) and **DRAINED** (grey/white body, green eyes). Each pair was verified by silhouette IoU (identical poses, recoloured):

| group | sheet label | charged comps | drained comps | IoU per pair |
|---|---|---|---|---|
| stand | stand | [8, 12, 9, 6] | [10, 13, 11, 7] | [1.0, 1.0, 1.0, 1.0] |
| fly | fly | [19, 23, 20, 17] | [21, 24, 22, 18] | [0.994, 0.994, 0.994, 0.994] |
| down | Attack ↓ | [36, 38, 34, 32, 40, 41] | [37, 39, 35, 33, 42, 43] | [1.0, 1.0, 1.0, 1.0, 1.0, 1.0] |
| fwd | Attack → | [51, 52] | [53, 54] | [1.0, 1.0] |
| up | Attack ↑ | [70, 71, 72, 57, 58] | [73, 74, 75, 59, 60] | [1.0, 1.0, 1.0, 1.0, 1.0] |
| attack | Attack | [83, 85, 86] | [84, 87, 88] | [1.0, 1.0, 1.0] |
| spark | (FX) spark balls | [89, 90] | [91, 92] | [1.0, 1.0] |
| bolt | (FX) bolt column | [61] | [62] | [1.0] |
| star | (FX) starburst | [55] | [56] | [1.0] |

These become the Voltage frame sets: `MEGAWHATT_ANIM` (CHARGED, Voltage ≥ 25) and `MEGAWHATT_DRAINED_ANIM` (DRAINED, < 25). The swap is render-driven by the GAME_STATE tier.

## Inventory corrections (real frames win)

| label | brief | real |
|---|---|---|
| stand | 4Y + 4G | 4 + 4 ✔ |
| fly | 3Y + 3G | **4 + 4** |
| Attack ↓ | ~8 + ~8 | **6 + 6** (figure, hunched figure, 2 starburst frames with him inside, 2 re-form frames) |
| Attack → | ~4 + ~4 | **2 + 2** (figure + ground lightning streak, one component each) |
| Attack ↑ | ~6 + ~6 | **5 + 5 figures** (3 ground charge-up, 2 re-formed at the top) + 1 + 1 free bolt column + 1 + 1 free starburst (FX) |
| Attack | ~5 + ~5 | **3 + 3 figures** + 2 + 2 free spark balls (FX) |

In the drained Attack ↓ / Attack ↑ groups the starbursts and bolt are still yellow on the sheet; they are used as-is.

## Frame → animation → move

Same frame numbers in both tiers unless marked *tier-forced*. `cN` = sheet component id (see `source_grid.json`).

| anim | group | frames | move / role |
|---|---|---|---|
| `idle` | stand | f1 (c8), f2 (c12), f3 (c9), f4 (c6) | idle |
| `walk` | fly | f1 (c19), f2 (c23), f3 (c20), f4 (c17) | walk (he hovers: fly cycle) |
| `run` | fly | f1 (c19), f2 (c23), f3 (c20), f4 (c17) | run (fly cycle, faster) |
| `dash` | fly | f2 (c23), f3 (c20) | dash (fly) |
| `jump` | fly | f1 (c19), f2 (c23) | jump rise (fly) |
| `fall` | fly | f3 (c20), f4 (c17) | fall (fly) |
| `crouch` | Attack ↓ | f2 (c38) | crouch - REUSED Attack v f2 (small hunched figure; no crouch pose) |
| `light` | Attack | f1 (c83), f2 (c85) | JAB (Attack f1-2 + spark FX) |
| `heavy` | Attack | f1 (c83), f2 (c85), f3 (c86) | HEAVY (Attack + spark burst FX, 140 px) |
| `down` | Attack → | f1 (c51) | LOW (Attack -> streak start, hits low) |
| `up` | Attack ↑ | f1 (c70), f2 (c71), f3 (c72) | LAUNCHER (Attack ^ charge-up + bolt FX) |
| `air` | fly | f1 (c19), f2 (c23) | AIR (fly + spark FX) |
| `guard` | Attack ↓ | f1 (c36) | block (Attack v f1 + small spark) |
| `hurt` | stand | f1 (c10) | hit - REUSED stand f1 (drained set in both tiers: no hurt pose) *tier-forced: drained art in both tiers* |
| `knockdown` | fly | f4 (c18) | knockdown - REUSED fly f4 (drained set in both tiers: no knockdown pose) *tier-forced: drained art in both tiers* |
| `getup` | stand | f1 (c8), f2 (c12) | get-up - REUSED stand f1-2 (no get-up pose) |
| `roll` | fly | f1 (c19), f2 (c23), f3 (c20), f4 (c17) | roll - REUSED fly cycle |
| `transform` | stand | f1 (c8), f2 (c12), f3 (c9), f4 (c6) | transform-in - REUSED stand |
| `intro` | stand | f1 (c8), f2 (c12), f3 (c9), f4 (c6) | intro - REUSED stand |
| `win` | Attack ↓ | f3 (c34), f4 (c32) | win - REUSED Attack v starburst (charged set in both tiers) *tier-forced: charged art in both tiers* |
| `lose` | stand | f1 (c10) | lose - REUSED stand f1 (drained set in both tiers) *tier-forced: drained art in both tiers* |
| `taunt` | Attack ↑ | f1 (c70), f2 (c71), f3 (c72) | taunt - REUSED Attack ^ charge-up |
| `grab` | Attack | f1 (c83), f2 (c85) | grab - REUSED jab |
| `mwSparkBall` | Attack | f1 (c83), f2 (c85), f3 (c86) | SPARK BALL cast (Attack) + spark-ball FX projectile |
| `mwLiveWire` | Attack → | f1 (c51), f2 (c52) | LIVE WIRE ground lightning streak (Attack ->) |
| `mwThunder` | Attack ↑ | f1 (c70), f2 (c71), f3 (c72), f4 (c57), f5 (c58) | THUNDER STRIKE call (Attack ^) + bolt / starburst FX at the marker |
| `mwDischarge` | Attack ↓ | f1 (c36), f2 (c38), f3 (c34), f4 (c32), f5 (c40), f6 (c41) | DISCHARGE radial burst (Attack v) |
| `mwDraw` | Attack ↑ | f1 (c70), f2 (c71), f3 (c72) | GROUND DRAW (Attack ^ charge-up loop) |
| `mwFly` | fly | f1 (c19), f2 (c23), f3 (c20), f4 (c17) | FLIGHT hover-fly |
| `mwUlt` | Attack ↓ | f3 (c34), f4 (c32) | BLACKOUT final starburst (Attack v) |

## Missing poses (reused, never invented)

- **hit / hurt**: stand f1, DRAINED set (both tiers).
- **knockdown**: fly f4, DRAINED set (both tiers).
- **get-up**: stand f1-2.
- **lose**: stand f1, DRAINED set.
- **win**: Attack ↓ starburst f3-4, CHARGED set.
- **crouch**: Attack ↓ f2 (the small hunched figure).
- **jump / fall / walk / run / dash / roll**: fly cycle (he hovers).
- **intro / transform / taunt / grab**: stand / Attack ↑ charge-up / jab.

## FX

| fx | frames | used by |
|---|---|---|
| `fx_spark` | 2 spark balls | Jab / Heavy / Air spark, SPARK BALL projectile, BLACKOUT opener |
| `fx_bolt` | 1 bolt column + impact | LAUNCHER bolt, THUNDER STRIKE drop, BLACKOUT final column |
| `fx_star` | 1 starburst | THUNDER STRIKE impact, Shock crackle |

