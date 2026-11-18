# Wildvine (Florauna) — SPRITE LEDGER

**Sheet by Dragonrod** (the author's request: "Please, give credits if used!").
Source: `assets/sprites/ben10/aliens/wildvine.png` (629×539), byte-identical copy of the owner's download
`wildvine_sprite_sheet_by_dragonrod342_d829hfh.png` (md5 `54c8c09eb2cc74b7940875cfde30fd39`). Identified by contact sheet:
dark-green plant alien with tentacle-like legs, grey background, the labels "stand / walk / jump/fall/crouch / attack /
attack → / attack ↓ / attack ↑", the "LOOP" bracket and the white credit box (not `swampfire.png`).
Generator: `python3 -I tools/ben10/slice_wildvine.py` (deterministic, byte-identical on re-run) → `ben10_wildvine_*_uniform.png`,
`ben10_wildvine_fx_*.png`, `wildvineAssets.js`, `source_grid.json`, `contact_sheet.png`, `loop_preview.gif`.

## Key, palette, exclusions
- Background: solid grey **(195,195,195) #C3C3C3**, sampled at all four corners (asserted), keyed exactly, zero tolerance.
- Palette collision check: the nearest art pixel is **103** (sum |ΔRGB|) from the key — no collision. His
  colours: black outline (0,0,0), dark green (15,74,33), mid green (22,114,50), light green (34,177,76), lime (181,230,29),
  blue (0,162,232), light blue spark (153,217,234), yellow (255,201,14), seed grey (40,40,40), thorn-base / dust greys
  (127,127,127) and (89,89,89). The two greys are the closest to the key and still far from it; none were keyed.
- EXCLUDED (not art), confirmed on the contact sheet: 57 label glyph components (pure black, < 60 px:
  every letter of the row labels, the arrows, the "LOOP" letters), the white credit box component #7
  (its lettering is inside it), and the LOOP bracket line #73 (130×6 px, pure black).
- Cut: 8-connected components, every component assigned (asserted). Anchor = feet baseline (bottom row) + body centre =
  centroid of the bottom 40 % (tentacle-leg base), never a vine arm, raised arm or tentacle tip. Uniform cell 196×80,
  body centre x=64, feet y=76; nearest-neighbour only; nothing cropped (asserted). actionScale 1.5 (× Ben's spriteScale 2.0).

## Real frames vs the brief's inventory (real frames win)
- stand 4, walk 4, jump/fall/crouch 3, attack 5 + 4 seeds, attack → 5 — as inventoried.
- attack ↓ has **3** poses before the LOOP (f1 arms spread, f2 low arms, **f3 crouch**), then the 4-frame LOOP (with
  planting dust) and 6 thorns. The sheet shows the **49 px thorn first**, then the 5 growing ones (10 → 50 px); growth
  stages 1–6 are the 6 thorns sorted small → tall (sheet order kept in `source_grid.json` → `thorn_sheet_order`).
- attack ↑: f1 is a stand-like pose, f2 the head starts to grow (yellow sparkle, attached), f3–4 the tall green growth
  (his own head/body stretching up — the "pillar"); the blue spark over f3 is free-floating → an FX frame.
- No run art: `run` = the walk cycle played 2× faster. No hurt / knockdown / get-up / win / lose / dizzy / block-hit poses
  (reuses below).

## Reused frames (missing poses)
| Animation | Reuses |
|---|---|
| hurt / hurt_air / knockdown | jump/fall/crouch f2 (fall) |
| guard / blockHit / lose | jump/fall/crouch f3 (crouch) |
| getup | crouch → stand f1 |
| win / transform | stand loop |
| dizzy | stand f1–2 (slow) |
| doubleJump | jump rise |
| walk_back | walk reversed |
| run / dash | walk cycle faster / walk f2–3 |
| air (Air attack) | fall frame (the sheet has no air attack) |
| taunt | attack ↓ f1 |
| grab | jab |

## Effects: extracted vs procedural
- **Extracted from the sheet** (`WILDVINE_FX`): `seed` — the 4 black seed dots (Seed Shot); `thorn` — the 6 thorns, growth
  stages 1–6 (Thornspike sprout/grown, Overgrowth crush thorns, the tallest = Giant Thorn integer-scaled); `spark` — the blue
  spark over attack ↑ f3 (Verdant Rise / Launcher), component #91, offset dx -0.2 / dy -58 native px from that frame's anchor (stored in `WILDVINE_FX.spark.anchor`).
- **Procedural pixel-style (render-only, never GAME_STATE)**: Snare Vine (pixel vine ring), Bloom Pod (pixel pod),
  Overgrowth forest + closing vines, leaves, pixel rings (Full Bloom, Rooted vines at the opponent's feet), the extended vine
  drawn past the sheet's arm for Vine Whip's 340 px reach.

## Frame → animation → move
| Animation | Sheet frame | Component | Source bbox [x0,y0,x1,y1] | Cell offset | Move / role |
|---|---|---|---|---|---|
| `idle` | stand f1 | #1 | [4, 4, 60, 52] | [42, 28] | idle (stand loop) |
| `idle` | stand f2 | #2 | [69, 4, 126, 52] | [40, 28] | idle (stand loop) |
| `idle` | stand f3 | #3 | [138, 4, 194, 52] | [42, 28] | idle (stand loop) |
| `idle` | stand f4 | #4 | [207, 4, 261, 52] | [42, 28] | idle (stand loop) |
| `walk` | walk f1 | #11 | [13, 74, 59, 121] | [42, 29] | walk |
| `walk` | walk f2 | #12 | [83, 74, 130, 121] | [45, 29] | walk |
| `walk` | walk f3 | #13 | [131, 74, 178, 121] | [40, 29] | walk |
| `walk` | walk f4 | #14 | [197, 74, 246, 121] | [44, 29] | walk |
| `walk_back` | walk f4 | #14 | [197, 74, 246, 121] | [44, 29] | walk back (walk REVERSED) |
| `walk_back` | walk f3 | #13 | [131, 74, 178, 121] | [40, 29] | walk back (walk REVERSED) |
| `walk_back` | walk f2 | #12 | [83, 74, 130, 121] | [45, 29] | walk back (walk REVERSED) |
| `walk_back` | walk f1 | #11 | [13, 74, 59, 121] | [42, 29] | walk back (walk REVERSED) |
| `run` | walk f1 | #11 | [13, 74, 59, 121] | [42, 29] | run (walk cycle played 2x faster - no run art) |
| `run` | walk f2 | #12 | [83, 74, 130, 121] | [45, 29] | run (walk cycle played 2x faster - no run art) |
| `run` | walk f3 | #13 | [131, 74, 178, 121] | [40, 29] | run (walk cycle played 2x faster - no run art) |
| `run` | walk f4 | #14 | [197, 74, 246, 121] | [44, 29] | run (walk cycle played 2x faster - no run art) |
| `dash` | walk f2 | #12 | [83, 74, 130, 121] | [45, 29] | dash (walk f2-3, fast) |
| `dash` | walk f3 | #13 | [131, 74, 178, 121] | [40, 29] | dash (walk f2-3, fast) |
| `jump` | jfc f1 | #19 | [46, 138, 101, 204] | [40, 10] | jump rise (jump/fall/crouch f1) |
| `doubleJump` | jfc f1 | #19 | [46, 138, 101, 204] | [40, 10] | double jump - REUSED jump rise |
| `fall` | jfc f2 | #20 | [116, 142, 155, 204] | [47, 14] | jump fall (jump/fall/crouch f2) |
| `crouch` | jfc f3 | #38 | [168, 169, 203, 204] | [48, 41] | crouch (jump/fall/crouch f3) |
| `guard` | jfc f3 | #38 | [168, 169, 203, 204] | [48, 41] | block - REUSED crouch |
| `blockHit` | jfc f3 | #38 | [168, 169, 203, 204] | [48, 41] | block hit - REUSED crouch |
| `light` | attack f1 | #39 | [20, 230, 64, 290] | [43, 16] | JAB (attack f1-2) |
| `light` | attack f2 | #41 | [92, 241, 145, 290] | [42, 27] | JAB (attack f1-2) |
| `heavy` | attack f3 | #43 | [159, 243, 212, 290] | [42, 29] | HEAVY (attack f3-5, right-reaching arm 170 px) |
| `heavy` | attack f4 | #40 | [225, 230, 269, 290] | [43, 16] | HEAVY (attack f3-5, right-reaching arm 170 px) |
| `heavy` | attack f5 | #42 | [288, 242, 354, 290] | [43, 28] | HEAVY (attack f3-5, right-reaching arm 170 px) |
| `down` | jfc f3 | #38 | [168, 169, 203, 204] | [48, 41] | LOW (crouch -> attack v f2 low vine arms, hits low) |
| `down` | down f2 | #75 | [87, 407, 150, 446] | [42, 37] | LOW (crouch -> attack v f2 low vine arms, hits low) |
| `up` | up f1 | #95 | [8, 483, 62, 531] | [42, 28] | LAUNCHER (attack ^ f1-3, rising growth) |
| `up` | up f2 | #94 | [70, 475, 121, 531] | [43, 20] | LAUNCHER (attack ^ f1-3, rising growth) |
| `up` | up f3 | #92 | [131, 471, 183, 531] | [43, 16] | LAUNCHER (attack ^ f1-3, rising growth) |
| `air` | jfc f2 | #20 | [116, 142, 155, 204] | [47, 14] | AIR (fall frame - the sheet has no air attack pose) |
| `hurt` | jfc f2 | #20 | [116, 142, 155, 204] | [47, 14] | hit light/heavy - REUSED fall (no hurt pose) |
| `hurt_air` | jfc f2 | #20 | [116, 142, 155, 204] | [47, 14] | hit in the air - REUSED fall |
| `knockdown` | jfc f2 | #20 | [116, 142, 155, 204] | [47, 14] | knockdown - REUSED fall (no knockdown pose) |
| `getup` | jfc f3 | #38 | [168, 169, 203, 204] | [48, 41] | get-up - REUSED crouch -> stand |
| `getup` | stand f1 | #1 | [4, 4, 60, 52] | [42, 28] | get-up - REUSED crouch -> stand |
| `dizzy` | stand f1 | #1 | [4, 4, 60, 52] | [42, 28] | dizzy - REUSED stand f1-2 (no dizzy pose) |
| `dizzy` | stand f2 | #2 | [69, 4, 126, 52] | [40, 28] | dizzy - REUSED stand f1-2 (no dizzy pose) |
| `transform` | stand f1 | #1 | [4, 4, 60, 52] | [42, 28] | transform-in - REUSED stand |
| `transform` | stand f2 | #2 | [69, 4, 126, 52] | [40, 28] | transform-in - REUSED stand |
| `transform` | stand f3 | #3 | [138, 4, 194, 52] | [42, 28] | transform-in - REUSED stand |
| `transform` | stand f4 | #4 | [207, 4, 261, 52] | [42, 28] | transform-in - REUSED stand |
| `taunt` | down f1 | #72 | [6, 398, 67, 446] | [42, 28] | taunt - REUSED attack v f1 (arms spread) |
| `win` | stand f1 | #1 | [4, 4, 60, 52] | [42, 28] | win - REUSED stand (no win pose) |
| `win` | stand f2 | #2 | [69, 4, 126, 52] | [40, 28] | win - REUSED stand (no win pose) |
| `win` | stand f3 | #3 | [138, 4, 194, 52] | [42, 28] | win - REUSED stand (no win pose) |
| `win` | stand f4 | #4 | [207, 4, 261, 52] | [42, 28] | win - REUSED stand (no win pose) |
| `lose` | jfc f3 | #38 | [168, 169, 203, 204] | [48, 41] | lose - REUSED crouch (no lose pose) |
| `grab` | attack f1 | #39 | [20, 230, 64, 290] | [43, 16] | grab - REUSED jab |
| `grab` | attack f2 | #41 | [92, 241, 145, 290] | [42, 27] | grab - REUSED jab |
| `wvPlant` | down f1 | #72 | [6, 398, 67, 446] | [42, 28] | PLANT cast (attack v f1-2 + f3 crouch): Thornspike / Snare Vine / Bloom Pod |
| `wvPlant` | down f2 | #75 | [87, 407, 150, 446] | [42, 37] | PLANT cast (attack v f1-2 + f3 crouch): Thornspike / Snare Vine / Bloom Pod |
| `wvPlant` | down f3 | #76 | [166, 407, 199, 446] | [48, 37] | PLANT cast (attack v f1-2 + f3 crouch): Thornspike / Snare Vine / Bloom Pod |
| `wvGrow` | down f4 | #77 | [210, 407, 242, 446] | [48, 37] | planting / growth hold (attack v LOOP f4-7) |
| `wvGrow` | down f5 | #78 | [254, 407, 286, 446] | [48, 37] | planting / growth hold (attack v LOOP f4-7) |
| `wvGrow` | down f6 | #79 | [300, 407, 332, 446] | [48, 37] | planting / growth hold (attack v LOOP f4-7) |
| `wvGrow` | down f7 | #80 | [341, 407, 373, 446] | [48, 37] | planting / growth hold (attack v LOOP f4-7) |
| `wvWhip` | fwd f1 | #54 | [10, 306, 55, 365] | [43, 17] | VINE WHIP / STRETCH POKE (attack -> f1 wind-up, f2-4 extend, f5 retract) |
| `wvWhip` | fwd f2 | #55 | [68, 317, 180, 365] | [43, 28] | VINE WHIP / STRETCH POKE (attack -> f1 wind-up, f2-4 extend, f5 retract) |
| `wvWhip` | fwd f3 | #56 | [184, 317, 282, 365] | [43, 28] | VINE WHIP / STRETCH POKE (attack -> f1 wind-up, f2-4 extend, f5 retract) |
| `wvWhip` | fwd f4 | #57 | [286, 317, 371, 365] | [43, 28] | VINE WHIP / STRETCH POKE (attack -> f1 wind-up, f2-4 extend, f5 retract) |
| `wvWhip` | fwd f5 | #58 | [386, 317, 455, 365] | [43, 28] | VINE WHIP / STRETCH POKE (attack -> f1 wind-up, f2-4 extend, f5 retract) |
| `wvRise` | up f2 | #94 | [70, 475, 121, 531] | [43, 20] | VERDANT RISE (attack ^ f2-4, the tall green growth) |
| `wvRise` | up f3 | #92 | [131, 471, 183, 531] | [43, 16] | VERDANT RISE (attack ^ f2-4, the tall green growth) |
| `wvRise` | up f4 | #93 | [189, 474, 241, 531] | [43, 19] | VERDANT RISE (attack ^ f2-4, the tall green growth) |
| `wvSeed` | attack f5 | #42 | [288, 242, 354, 290] | [43, 28] | SEED SHOT (attack f5 reaching arm) |

## FX frames
| FX | Frames | Components |
|---|---|---|
| seed | 4 | components #50, #44, #45, #46 (the 4 dots, left → right) |
| thorn | 6 | stages 1–6 small → tall: #90, #89, #81, #74, #71, #70 |
| spark | 1 | #91, over attack ↑ f3 |
