# Ripjaws (Piscciss Volann) — SPRITE LEDGER

**Credit: Sheet by Dragonrod** (author's request on the sheet: "Ripjaws sprite sheet made by Dragonrod. Please, give credits if used!").

Source: `assets/sprites/ben10/aliens/ripjaws.png` — byte copy of the repo-root `ripjaws_sprite_sheet_by_dragonrod342_d7yqxvd.png` (835×869 RGB, MD5 e88b807eefdf4287d838fe93a94db0d8). Slicer: `tools/ben10/slice_ripjaws.py` (deterministic). Output: `ben10_ripjaws_ready_*_uniform.png` + `ripjawsAssets.js`; `contact_sheet.png`, `preview_*.gif`, `source_grid.json` in this folder.

## Key colour / halo findings

- Background: solid **#7F7F7F (127,127,127)** at all four corners. Keyed with **zero tolerance** on the exact colour.
- Edge-connected (flood-fill) background: 644049 px. Near-key pixels (|c−127| ≤ 6): **0** → binary key, **no grey fringe / halo**.
- Collision check: the art's neutral greys are exactly **0, 8, 23, 41, 195, 249, 255** — the key value 127 never occurs in the art (`key_in_art: false`), so the light-grey/white/stripe palette cannot collide with the key.
- **Enclosed key pockets: 685 px** (449 inside frames: the gaps between the legs / arm and torso, the rest inside label glyphs). Because 127 is provably not an art colour, these pockets are trapped BACKGROUND and are keyed too (keeping them would paint grey patches between his legs). This is the one deviation from "key only the edge-connected background", and it is safe for exactly the reason that rule exists (no art grey equals the key).

## Excluded (not art)

- Every text label: 129 glyph components (black text, never within 2 px of a frame).
- The white credit box at [584, 398, 801, 463] and its text.

## Extracted effects (from the sheet)

- **fx:spark** (`ben10_ripjaws_fx_spark.png`, 2 frames): the two small **blue water sparks** beside attack f3 (land [183, 299, 196, 315] and water [179, 366, 192, 382]). They are effects, not annotation: they stay IN their attack f3 frame (the Water Jet release) and are also exported as an FX strip for the jet muzzle.
- **Yellow-green crescents**: fused to the attack ↓ frames (Fin Blade, both sets) — kept in frame, never cut.

## Procedural pixel-style effects (render-only, never GAME_STATE)

As built (benFlood.js `drawBenFlood` / `drawBenFloodFlash` / `drawBenBreathHud`; ripjaws.js `fxSpecials` / `fxUlt`):

| Effect | Where | Notes |
|---|---|---|
| Rain | benFlood.js | a pooled 140-drop table built once at load (hash of fixed ids) — no per-frame allocation, no pixel scans |
| Water body | benFlood.js | two translucent fills under the line (readable on bright and dark stages) |
| Surface ripples + foam | benFlood.js | ±6 px cosmetic band from hash(flood seed, x, frame); the gameplay line stays flat |
| Bubbles | benFlood.js | rise from the floor below the line |
| Lightning flashes | benFlood.js | ~3f screen flashes, picked by hash(flood seed, frame) |
| Steam | benFlood.js | puffs where fire is put out / fizzles / boils (a runtime list, never GAME_STATE) |
| Breath bar + DROWNING pulse | benFlood.js (ui.js call) | under the affected fighter's health panel |
| Water Jet stream + spray | ripjaws.js | drawn over the hidden jet projectile |
| Fin Blade arc | ripjaws.js | the 260 px sweep during its active frames |
| Shark Rush / Breach wake | ripjaws.js | spray streaks while travelling |
| Ultimate: tidal wave, abyss creatures, geyser | ripjaws.js | creatures drawn at the stored hash spots (plain numbers in the cast record); the geyser lift uses `targetOffset` |

None has a hitbox; none writes GAME_STATE.

## Frame sets and anchors

- Cell 156×113, centre x 78, feet y 64, actionScale 1.0 (on screen ×2, nearest-neighbour). Land stand height 49 px → ≈98 px on screen.
- **LAND** (legs; dry / wading): feet baseline (lowest body pixel) + torso centre (densest 16-px column window over the upper body).
- **WATER** (fish tail; submerged): torso centre x + top of the head placed at the land stand's head height (head + land height = the feet line), so the head/torso stays put when the set swaps and the tail hangs below the feet line. The tail fin is never the anchor.
- **SWIM** (horizontal): the leading head/torso sixth is the x anchor, its vertical centre sits at the land torso height.
- Anchors per (row, set): from the first frame of that set in the row (`source_grid.json → anchors`). Nothing is cropped (asserted): lure, tail, claws, crescents and sparks all kept.

## Sheet inventory (verified)

| Sheet label | Row id | Frames | Use |
|---|---|---|---|
| stand (on land) | `stand_land` | 4 | idle (land) |
| stand (on water) | `stand_water` | 4 | idle submerged / treading water |
| walk/run | `walk` | 6 | walk; walk_back = reversed; run + dash = the same row cycled faster (no separate run on the sheet) |
| jump / fall / crouch | `jump, fall, crouch` | 1+1+1 | jump rise (also the leap out of water), fall, crouch |
| swim | `swim` | 4 | SWIM loop + swim dash |
| attack (on land) | `atk_land` | 4 | f1 summon (Storm Tide) / Jab f1-2 / f3 spark = Water Jet release / f4 recovery |
| attack (on water) | `atk_water` | 4 | the same four, tail version |
| attack → | `atk_fwd` | 5 | f1-3 land lunge (Shark Rush, Heavy bite f2-3), f4-5 swim lunges (Shark Rush / Heavy submerged) |
| attack ↓ (on land) | `down_land` | 3 | Fin Blade (land) |
| attack ↓ (on water) | `down_water` | 3 | Fin Blade (submerged) |
| attack ↑ | `atk_up` | 8 | f1-4 land (Launcher / Breach), f5-8 tail rising lunge (submerged Launcher / Breach) |

The inventory matched the sheet exactly (48 frames). Note: attack ↑ f4 already shows the striped lower body (transition into the tail); it is used as the 4th LAND frame as labelled, anchored on its feet.

## Reused poses (missing on the sheet)

- `walk_back`: walk back = walk/run row REVERSED
- `run`: run = walk/run row cycled FASTER (no separate run on the sheet)
- `dash`: dash = walk/run row cycled fastest
- `doubleJump`: double jump = REUSED jump
- `guard`: guard = REUSED crouch (no block pose on the sheet)
- `crouchGuard`: crouch guard = REUSED crouch
- `blockHit`: block hit = REUSED crouch
- `hurt`: hurt = REUSED fall
- `hurt_air`: air hurt = REUSED fall
- `knockdown`: knockdown = REUSED fall
- `getup`: get-up = REUSED crouch -> stand
- `dizzy`: dizzy = REUSED stand (land) cycled slowly
- `transform`: transform = REUSED attack (land) f1 (arms flexed)
- `taunt`: taunt = REUSED attack (land) f1-2 (flex + roar)
- `win`: win = REUSED stand (land)
- `lose`: lose = REUSED crouch
- `grab`: grab = REUSED attack -> f1-2
- `dash_w`: swim dash = swim row cycled fast
- `hurt_w`: hurt submerged = REUSED stand on water f1

## Every frame → animation → move

| Anim | Frames (row:frame) | Set | Use |
|---|---|---|---|
| `idle` | stand_land:1, stand_land:2, stand_land:3, stand_land:4 | L | idle (stand on land) |
| `walk` | walk:1, walk:2, walk:3, walk:4, walk:5, walk:6 | L | walk (walk/run row) |
| `walk_back` | walk:6, walk:5, walk:4, walk:3, walk:2, walk:1 | L | walk back = walk/run row REVERSED |
| `run` | walk:1, walk:2, walk:3, walk:4, walk:5, walk:6 | L | run = walk/run row cycled FASTER (no separate run on the sheet) |
| `dash` | walk:1, walk:2, walk:3, walk:4, walk:5, walk:6 | L | dash = walk/run row cycled fastest |
| `crouch` | crouch:1 | L | crouch |
| `jump` | jump:1 | L | jump rise (also the leap out of the water) |
| `doubleJump` | jump:1 | L | double jump = REUSED jump |
| `fall` | fall:1 | L | fall |
| `guard` | crouch:1 | L | guard = REUSED crouch (no block pose on the sheet) |
| `crouchGuard` | crouch:1 | L | crouch guard = REUSED crouch |
| `blockHit` | crouch:1 | L | block hit = REUSED crouch |
| `hurt` | fall:1 | L | hurt = REUSED fall |
| `hurt_air` | fall:1 | L | air hurt = REUSED fall |
| `knockdown` | fall:1 | L | knockdown = REUSED fall |
| `getup` | crouch:1, stand_land:1 | L | get-up = REUSED crouch -> stand |
| `dizzy` | stand_land:1, stand_land:2, stand_land:3, stand_land:4 | L | dizzy = REUSED stand (land) cycled slowly |
| `transform` | atk_land:1 | L | transform = REUSED attack (land) f1 (arms flexed) |
| `taunt` | atk_land:1, atk_land:2 | L | taunt = REUSED attack (land) f1-2 (flex + roar) |
| `win` | stand_land:1, stand_land:2, stand_land:3, stand_land:4 | L | win = REUSED stand (land) |
| `lose` | crouch:1 | L | lose = REUSED crouch |
| `light` | atk_land:1, atk_land:2 | L | JAB (attack on land f1-2) |
| `heavy` | atk_fwd:1, atk_fwd:2, atk_fwd:3 | L | HEAVY bite (attack -> f1-3 land lunge; f2-3 active) |
| `down` | crouch:1, atk_fwd:2 | L | LOW bite = crouch + attack -> f2 (low bite) |
| `up` | atk_up:1, atk_up:2, atk_up:3, atk_up:4 | L | LAUNCHER (attack up f1-4, land) |
| `air` | fall:1, atk_fwd:3 | L | AIR = fall frame + attack -> f3 (bite) |
| `grab` | atk_fwd:1, atk_fwd:2 | L | grab = REUSED attack -> f1-2 |
| `rjSummon` | atk_land:1 | L | STORM TIDE summon pose (attack on land f1, arms flexed) |
| `rjJet` | atk_land:1, atk_land:2, atk_land:3, atk_land:4 | L | WATER JET (attack on land: f3 spark = release, f4 recovery) |
| `rjRush` | atk_fwd:1, atk_fwd:2, atk_fwd:3 | L | SHARK RUSH (attack -> f1-3 land lunge) |
| `rjFin` | down_land:1, down_land:2, down_land:3 | L | FIN BLADE (attack down on land: crescent slash) |
| `rjBreach` | atk_up:1, atk_up:2, atk_up:3, atk_up:4 | L | BREACH (attack up f1-4, land anti-air chomp) |
| `rjDive` | fall:1 | L | DIVE BITE (fall frame, diagonal dive) |
| `idle_w` | stand_water:1, stand_water:2, stand_water:3, stand_water:4 | W | submerged idle / treading water (stand on water) |
| `swim_w` | swim:1, swim:2, swim:3, swim:4 | S | SWIM loop (submerged move) |
| `dash_w` | swim:1, swim:2, swim:3, swim:4 | S | swim dash = swim row cycled fast |
| `light_w` | atk_water:1, atk_water:2 | W | JAB (attack on water f1-2) |
| `heavy_w` | atk_fwd:4, atk_fwd:5 | S | HEAVY bite submerged = attack -> f4-5 swim lunge |
| `up_w` | atk_up:5, atk_up:6, atk_up:7, atk_up:8 | W | LAUNCHER submerged (attack up f5-8, tail rising lunge) |
| `hurt_w` | stand_water:1 | W | hurt submerged = REUSED stand on water f1 |
| `rjSummon_w` | atk_water:1 | W | STORM TIDE summon pose submerged (attack on water f1) |
| `rjJet_w` | atk_water:1, atk_water:2, atk_water:3, atk_water:4 | W | WATER JET submerged (attack on water: f3 spark = release) |
| `rjRush_w` | atk_fwd:4, atk_fwd:5 | S | SHARK RUSH submerged (attack -> f4-5 swim lunges) |
| `rjFin_w` | down_water:1, down_water:2, down_water:3 | W | FIN BLADE submerged (attack down on water) |
| `rjBreach_w` | atk_up:5, atk_up:6, atk_up:7, atk_up:8 | W | BREACH submerged: the surface-launch body (attack up f5-8) |
