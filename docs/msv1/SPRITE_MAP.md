# MSV1 SPRITE MAP: one shared frame map, two sheets

Generator: `python3 docs/msv1/slice_msv1.py 120 12 <outdir>`.

Method:
- Sample the background: **rgb(82,144,118)**, 222,957 of the 249,543 sampled px.
- Chroma-key it exactly.
- Split the sheet into 27 row bands.
- Run 8-connected component labelling.
- Group components into frames: big components (≥120 px) that overlap horizontally merge; small specks attach to the nearest frame within 12 px (dust/smoke ≤45 px).
- R19 (dome), R23 and R24 (smoke) use fixed cut columns snapped to the lowest-density column, because each smoke cloud spreads wider than its gap.

## Real frame counts (both sheets)

| row | brief estimate | real | name |
|---|---|---|---|
| R1 | ~7 | **7** | idle |
| R2 | ~13 | **12** | run |
| R3 | ~4 | **5** | streak |
| R4 | ~16 | **16** | punch_kick |
| R5 | ~13 | **13** | kicks_crouch |
| R6 | ~13 | **13** | attacks_flip |
| R7 | ~10 | **10** | crouch_guard_axe |
| R8 | ~19 | **16** | jump_land |
| R9 | ~12 | **13** | air_spin_dive |
| R10 | ~14 | **16** | air_attacks |
| R11 | ~14 | **13** | drill_tornado |
| R12 | ~11 | **11** | low_attacks |
| R13 | ~11 | **12** | duck_hurt_upper |
| R14 | R14–R18 sword | **12** | sword_a |
| R15 |  | **15** | sword_b |
| R16 |  | **12** | sword_c |
| R17 |  | **7** | sword_crouch |
| R18 |  | **8** | sword_air |
| R19 | 7 dome (+sword) | **11** | sword_dome |
| R20 | ~12 | **12** | throw |
| R21 |  | **11** | projectile |
| R22 | ~13 | **13** | misc_stance |
| R23 | 1+6 | **7** | smoke_burst |
| R24 | 5 | **5** | smoke_fade |
| R25 | ~5 | **6** | victory |
| R26 | ~10 | **11** | knockdown |
| R27 | ~15 | **18** | lying_getup |

**Total: 305 frames per sheet** + 2 portraits.

Differences from the brief's read:
- R3 has 5 frames (3 smears + 2 fade tails).
- R4 has 16.
- R8 has 16: the landing dust ring is part of its frame, not loose specks.
- R9 has 13.
- R10 has 16.
- R11 has 13: dust trails are merged into the skid frames.
- R12 has 11.
- R13 has 12.
- R14–R18 have 12/15/12/7/8 = 54 sword frames.
- R19 has 11: 4 sword + **7 dome**.
- R20 has 12.
- R21 has 11 projectile pieces.
- R22 has 13.
- R23 has 7: seated + 6 smoke.
- R24 has 5.
- R25 has 6.
- R26 has 11.
- R27 has 18.

## Palette-swap proof

- Both sheets were cut with the same pass, and **all 305 frame bounding boxes are identical** (305/305).
- **Alpha masks are identical inside every frame**: 0 frames differ.
- Across the whole sheet, 506 mask pixels differ. **All of them are in the portrait/credit block** (y 31–75, x 869–949): the small portrait and the credit text, which reads "RED" on one sheet and "YELLOW" on the other.
- Colour mapping, red → yellow, over every frame pixel: **43 distinct colours, each maps to exactly one colour (0 one-to-many)**. 38 are unchanged (skin, white, grey, outlines, FX); 5 suit/smoke shades are swapped.
- **Result: a pure palette swap.** One frame map serves both rangers. The ledgers are kept separate because each ranger uses some rows differently.

Visual check: docs/msv1/compare.png puts Red above Yellow for every row. Inspected: every row lines up, the smoke rows (R23/R24) are each ranger's own colour, and the dome, tornado and projectile FX are shared colours.

## Exclusions
- Credit text block → "excluded, credit" (CREDITS.md).
- R8 arrow markers: **22 px** per sheet, in their own band at y 501–508, removed (no frame pixels touched).
- Nothing else excluded. Portraits: large → select icon, small → HUD icon.
