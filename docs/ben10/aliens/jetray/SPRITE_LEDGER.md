# Jetray (Aerophibian) — sprite ledger

**Sheet from fun-tech.tk** (credit text on the sheet: "Fun-tech.tk", "Ben 10 Game creator"). Source: the owner's download `~/Downloads/new/ben 10/820786773_orig.png` → `assets/sprites/ben10/aliens/jetray.png` (1200×2000). Identified by contact sheet among the blue-background downloads: red-and-yellow manta with a yellow horned head, green warp-bubble streak frames, white diving-manta silhouette.

## Key, palette, halo, text

- Background solid blue **(0,0,255)** keyed exactly (zero tolerance; all four corners asserted).
- **Palette collision check:** his dark red / maroon, yellow / gold, green Omnitrix + eyes and black are never blue-dominant (99th percentile of B − max(R,G) ≤ 0, asserted). The art is anti-aliased against the blue: **13167** blue-blend edge pixels (B − max(R,G) ≥ 40, within 2 px of the key / trail) are removed as halo, never art. **10 lossy bluish specks** sit ≥ 3 px inside the art (narrow gaps between wing and body); they are KEPT untouched and listed in `source_grid.json`.
- Text: 27 glyph components ("Fun-tech.tk" black, "Ben 10 / Game creator" green-cyan), top right, removed (not art). 3 detached fragments merged into the figure of their grid cell.

## Warp-bubble streak frames — halo decision

- The fading trail is a **non-linear lavender → blue gradient** (e.g. (12,12,252) → (60,60,227) → (103,103,186): B falls faster than R = G rises), not one colour alpha-mixed over the key, so **un-blending against the key cannot recover a clean alpha**. Decision: **cut only the opaque core** (figure + green bubble + its pale rim); the 48044 grey-lavender trail pixels (R ≈ G, B ≥ R + 20) and the blue-blend pixels touching them are dropped, and the fading trail is **rebuilt in jetray.js as a procedural pixel streak** (render-only). No blue fringe survives (asserted: no kept pixel within 2 px of a removed one is blue-dominant).

## Cut, duplicates, true sequences

- The 12 left-column cells hold only **7 distinct drawings** (pixel-exact duplicates, asserted): Col 1 R2 = R4 = R6 = Col 2 R2 (side glide, wings forward), Col 1 R3 = R5 = Col 2 R1 (side glide, wings back). Col 1 R1 is a three-quarter front glide; Col 2 R3 and R5 are front-on banking dives (wings swept down); Col 2 R4 and R6 are upright (wings closed / wings up). **Col 3 R4** has the same outline as Col 2 R5 with the **beak open**.
- **True sequence:** previewing the left columns as animation, the sheet order R1 → R2 → R3 → R2 → R3 … is a two-pose WING BEAT (Col 1 R2 ↔ R3) after a three-quarter lead-in (R1). So **hover / walk / run / fly = the flap loop**, walk and run being the same loop cycled faster (no walk art).
- Uniform cell **436×288**. **Anchor = the chest Omnitrix** (centroid of the largest green component = torso centre) — wing tips and tail are never the anchor; the streak frames anchor at the green bubble's centroid. A CONSISTENT chest → "feet" drop of 142.3 sheet px (the median chest-to-lowest-pixel drop + the **6 px grounded hover**) sits every frame on the feet row originY=257. Pixels copied 1:1, pixel counts preserved, nothing cropped (wings, horns, tail, bubble included — asserted).
- **Eye anchor per frame** (mean of the two green eye components; Col 3 R4 uses its closed-beak twin Col 2 R5) exported as `JETRAY_EYES` for the Eye Laser — mirrored for facing −1.
- **Scale:** high-res cartoon art (~300 px wide). Engine standard path, smoothing off: spriteScale 2.0 × global 1.18 × actionScale **0.2** = ×0.472 → the upright frame ≈ 129 px tall (≈ human Ben), the side glide ≈ 146 px wingspan. **Conflict reported:** the brief's "wingspan ≈ 1.4× Ben's width" and "body ≈ Ben's height" cannot both hold for this art (a 1.4× wingspan would make him half Ben's height); body height was kept, the wingspan is ≈ 2.4× Ben's width. Not noisy at this scale; no resample filter.
- **Hurtbox = torso + inner wing** (fighters.js `sizeW 70 × sizeH 96`), NOT the full wing tips: the tips (~±75 px) are cosmetic.

## White silhouette (Col 3 R5)

- **Verified: the exact outline of Col 2 R5** (the diving manta, pixel-exact mask match — the brief's "wide diving manta shape"). Decision: it is the **hit-flash / Omnitrix transform flash / timeout-revert flash** (`transform` f1, `jrFlash`); not a move body.

## Every distinct drawing → animation → move

| Drawing | Animations (moves) |
|---|---|
| Col 1 R1 | turn, transform, jrMach |
| Col 1 R2 (= R4, R6, Col 2 R2) | idle, walk, walk_back, run, light, heavy, fly, flyHover, flyCruise, jrTail |
| Col 1 R3 (= R5, Col 2 R1) | idle, walk, walk_back, run, dash, crouch, heavy, down, fly, flyHover, flyCruise |
| Col 2 R3 | fall, hurt, hurt_air, getup, dizzy, jrRoll |
| Col 2 R4 | jump, guard, blockHit, win, getup |
| Col 2 R5 | lose, knockdown, dizzy, air, jrDive |
| Col 2 R6 | doubleJump, win, up |
| Col 3 R1 | jrDash |
| Col 3 R2 | jrDash |
| Col 3 R3 | jrDash |
| Col 3 R4 | taunt, jrEye |
| Col 3 R5 | transform, jrFlash |

## Animation → move (exported strips `ben10_jetray_ready_<anim>_uniform.png`)

| Animation | Frames | Speed | Source / move |
|---|---|---|---|
| `idle` | 2 | 10 | HOVER = the side-glide wing beat Col 1 R2 ↔ R3 (the flap loop), slow |
| `walk` | 2 | 6 | the flap loop CYCLED FASTER (no walk art — he skims, 6 px above the floor) |
| `walk_back` | 2 | 7 | the flap loop reversed |
| `run` | 2 | 3 | the flap loop, fastest |
| `dash` | 1 | 4 | Col 1 R3 glide (wings back) |
| `turn` | 1 | 4 | Col 1 R1 three-quarter front (mid-turn) |
| `jump` | 1 | 6 | JUMP RISE = Col 2 R4 upright |
| `doubleJump` | 1 | 6 | Col 2 R6 upright, wings up |
| `fall` | 1 | 6 | JUMP FALL = Col 2 R3 banking dive, wings swept down |
| `crouch` | 1 | 6 | Col 1 R3 glide + render-only low offset (no crouch art) |
| `guard` | 1 | 6 | BLOCK = Col 2 R4 upright, wings closed in front |
| `blockHit` | 1 | 6 | Col 2 R4 upright (no block-hit art) |
| `transform` | 2 | 6 | white silhouette flash → Col 1 R1 |
| `taunt` | 1 | 10 | Col 3 R4 beak open (screech) |
| `win` | 2 | 16 | Col 2 R6 ↔ R4 upright (no win art) |
| `lose` | 1 | 6 | Col 2 R5 dive (no lose art) |
| `hurt` | 1 | 6 | Col 2 R3 banking dive (no hit art) |
| `hurt_air` | 1 | 6 | Col 2 R3 banking dive (no air-hit art) |
| `knockdown` | 1 | 6 | Col 2 R5 dive (no knockdown art) |
| `getup` | 2 | 6 | Col 2 R3 → R4 righting himself (no get-up art) |
| `dizzy` | 2 | 10 | Col 2 R3 ↔ R5 wobble (no dizzy art) |
| `light` | 1 | 3 | JAB = Col 1 R2 glide + render lunge + procedural wing flick |
| `heavy` | 2 | 6 | HEAVY = Col 1 R3 → R2 + render lunge + procedural wing slash (170 px) |
| `down` | 1 | 4 | LOW = Col 1 R3 low glide + render-only low offset + procedural low sweep |
| `up` | 1 | 6 | LAUNCHER = Col 2 R6 upright, wings up + procedural rising wing sweep |
| `air` | 1 | 4 | AIR = Col 2 R5 diving + procedural slash |
| `fly` | 2 | 5 | FLIGHT = the flap loop |
| `flyHover` | 2 | 8 | flight hover = the flap loop, slower |
| `flyCruise` | 2 | 3 | flight cruise = the flap loop, fast |
| `jrEye` | 1 | 6 | EYE LASER cast = Col 3 R4 beak open (+ procedural eye beam from the per-frame eye anchor) |
| `jrTail` | 1 | 6 | TAIL VOLLEY = Col 1 R2 glide (tail out behind) + procedural tail bolts |
| `jrDash` | 3 | 2 | WING DASH / MACH TIME travel / COSMIC DRAG warp = the 3 warp-bubble cores (+ procedural trail) |
| `jrDive` | 1 | 6 | SONIC DIVE active / slam = Col 2 R5 dive (the Col 3 R4 drawing with the beak closed) |
| `jrRoll` | 1 | 6 | BARREL ROLL = Col 2 R3 banking (render-only rotation) |
| `jrMach` | 1 | 6 | MACH TIME activation = Col 1 R1 three-quarter front, wings flared |
| `jrFlash` | 1 | 6 | white silhouette = hit / Omnitrix transform / timeout-revert flash |

## Missing poses (closest real frame reused, no art invented)

- **hit light / heavy, air hit**: Col 2 R3 banking dive. **knockdown, lose**: Col 2 R5 dive. **get-up**: Col 2 R3 → R4. **dizzy**: Col 2 R3 ↔ R5. **block / block-hit**: Col 2 R4 upright. **win**: Col 2 R6 ↔ R4 upright. **crouch / LOW**: Col 1 R3 glide + a render-only low offset. **jab / heavy**: the glide frames + render-only forward lunge + procedural pixel wing slash. **launcher**: Col 2 R6 upright wings-up + procedural rising sweep.

## Extracted vs procedural effects

- **Extracted (real sheet pixels):** the warp-bubble cores (figure + green bubble + rim) of Col 3 R1–R3, the green Omnitrix, the white silhouette flash.
- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the warp-bubble fading TRAIL (rebuilt), eye-laser beams and their glow, tail-laser bolts, wing-slash arcs, sonic-boom rings, Mach Time afterimages and echo ghosts, the Grounded leg crackle, Neuro pips, the barrel-roll rotation, the ultimate's hyperspace starfield / planets / ringed gas giant / asteroid belt / sun flare and screen shake. They READ simulation state; they never write it.


Contact sheet: `docs/ben10/aliens/jetray/contact_sheet.png` (every exported strip at ½ size; green = feet row, blue = anchor column). Geometry, removed glyphs, merged fragments, duplicates, anchors, eyes: `source_grid.json`.

Credit: **Sheet from fun-tech.tk**.

