# Water Hazard (Orishan) — sprite ledger

**Sheet from fun-tech.tk** (credit text on the sheet: "Fun-tech.tk", "Ben 10 Game creator"). Source: the owner's download `351942199_orig.png` (byte-identical to `351942199_orig (1).png`) → `assets/sprites/ben10/aliens/waterhazard.png` (1200×2000). Identified by contact sheet among the ten blue-background Fun-tech downloads: dark red / maroon insectoid, green eyes and claws, hunched, the glowing green / cyan orb charging in the third column, white silhouette bottom right.

## Key, palette, halo, text

- Background solid blue **(0,0,255)** keyed exactly (zero tolerance; all four corners asserted).
- **Palette collision check:** maroon / dark red, black, greys, lime-green lights, green eyes and the cyan / green orb are never blue-dominant inside the art beyond his own slate greys: **reported collision-adjacent colours** — the body greys (88,86,109) and (52,51,72) are faintly blue (B − max(R,G) = 21; 99th percentile ≤ 22 per frame, asserted), and the orb's pale ring (102,223,255) is blue-leaning (32); all stay below the halo threshold 40, so none is keyed or eaten. The orb's cyan (0,204,204) has B = G. The art is anti-aliased against the blue: **20935** blue-blend edge pixels (B − max(R,G) ≥ 40, within 2 px of the key) are removed as halo, never art. **216 lossy bluish specks** sit inside the art (narrow gaps between limbs, the orb's translucent rim); they are KEPT untouched and listed in `source_grid.json`.
- Text: 27 glyph components ("Fun-tech.tk" black, "Ben 10 / Game creator" green-cyan), top right, **removed** (not art). 6 detached art fragments (claw / toe tips cut off by the halo) merged into the figure of their cell.

## Cut, duplicates, true sequences

- 22 figures on the sheet = **21 distinct drawings + 1 duplicate**: Col 4 R1 = Col 3 R3 pixel-exact, and Col 3 R6's body = Col 3 R3 pixel-exact (R6 adds free droplets) — asserted.
- **True sequences** (previewed as animation, `preview_*.gif`): Col 1 R1 is a standing hunch; **Col 1 R2–R7 is a 6-frame stride cycle** (walk; run = the SAME cycle faster — no run art). Col 2: R1 / R2 long strides, R3 front-on with the hood up, R4 standing tall, R5 a crouched leap, R6 a forward reaching claw. **Col 3 R3 → R4 → R5 → R6 is the orb sequence**: orb forming in the raised hand, FULL CHARGE (big glowing orb + droplets), the burst ring, then a smaller orb dripping. Col 3 R1 is a low crouch with the claw out, R2 a hunched step. **Col 4: R1 = Col 3 R3 (aiming), R2 a crouch with the arm raised, R3 the white silhouette.** Real frames win: the brief's "Col 4 f2 crouch" is the arm-raised crouch (used as puddle enter / exit and jump rise).
- Uniform cell **370×329**. **Anchor = the TORSO** (median x of the body in its hip band, 45–60 % of its height — he is permanently hunched, so never the claws); feet baseline = the lowest body row on the feet row originY=326. Pixels copied 1:1, pixel counts preserved, nothing cropped (claws, antennae, the orb and its droplets included — asserted).
- **Scale:** high-res cartoon art. Engine standard path, smoothing off: spriteScale 2.0 × global 1.18 × actionScale **0.21** = ×0.4956 (a fixed engine scale; no resample filter) → ≈ human Ben's height.

## White silhouette (Col 4 R3)

- **Verified: the exact outline of Col 4 R2** (the crouch with the arm raised; mask match, pure white, asserted). Used as the **hit-flash / Omnitrix transform flash / timeout-revert flash** (`transform` f1, `whFlash`); not a move body.

## Every distinct drawing → animation → move

| Drawing | Animations (moves) |
|---|---|
| Col 1 R1 | idle, getup, transform, win, whReform |
| Col 1 R2 | walk, walk_back, run |
| Col 1 R3 | walk, walk_back, run |
| Col 1 R4 | walk, walk_back, run |
| Col 1 R5 | walk, walk_back, run |
| Col 1 R6 | walk, walk_back, run |
| Col 1 R7 | walk, walk_back, run |
| Col 2 R1 | dash |
| Col 2 R2 | light |
| Col 2 R3 | dizzy, taunt, win |
| Col 2 R4 | idle, idleAlt |
| Col 2 R5 | jump, doubleJump, fall, hurt_air, heavy, air, whLash |
| Col 2 R6 | hurt, light, heavy, grab, whLash |
| Col 3 R1 | crouch, guard, crouchGuard, blockHit, knockdown, getup, lose, down, whSweep |
| Col 3 R2 | dizzy |
| Col 3 R3 (= Col 4 R1) | up, whCharge, whDive, whGeyser |
| Col 3 R4 | whCharge, whBurst, whUltOrb |
| Col 3 R5 | whFire, whBurst, whUltOrb |
| Col 3 R6 | whFire, whUltOrb |
| Col 4 R2 | jump, transform, up, whMelt, whReform, whGeyser |
| Col 4 R3 | transform, whFlash |

## Animation → move (exported strips `ben10_waterhazard_ready_<anim>_uniform.png`)

| Animation | Frames | Speed | Source / move |
|---|---|---|---|
| `idle` | 2 | 16 | Col 1 R1 ↔ Col 2 R4 (standing hunched, claws down) — a slow two-pose loop |
| `idleAlt` | 1 | 8 | Col 2 R4 (REUSED) |
| `walk` | 6 | 7 | the Col 1 R2–R7 stride cycle |
| `walk_back` | 6 | 8 | the stride cycle reversed |
| `run` | 6 | 4 | the SAME stride cycle CYCLED FASTER (no run art) |
| `dash` | 1 | 4 | Col 2 R1 long stride |
| `jump` | 2 | 6 | JUMP RISE = Col 4 R2 (crouch, arm up) → Col 2 R5 leap |
| `doubleJump` | 1 | 6 | Col 2 R5 leap (REUSED) |
| `fall` | 1 | 6 | Col 2 R5 leap (REUSED; no fall art) |
| `crouch` | 1 | 6 | Col 3 R1 crouch |
| `guard` | 1 | 6 | BLOCK = Col 3 R1 crouch (REUSED; no block art) |
| `crouchGuard` | 1 | 6 | Col 3 R1 crouch (REUSED) |
| `blockHit` | 1 | 6 | Col 3 R1 crouch (REUSED; no block-hit art) |
| `hurt` | 1 | 6 | HIT REACT = Col 2 R6 reach (REUSED, as briefed; no hit art light or heavy) |
| `hurt_air` | 1 | 6 | Col 2 R5 leap (REUSED; no air-hit art) |
| `knockdown` | 1 | 6 | Col 3 R1 crouch (REUSED; no knockdown / lying art) |
| `getup` | 2 | 6 | Col 3 R1 → Col 1 R1 (REUSED; no get-up art) |
| `dizzy` | 2 | 12 | Col 3 R2 ↔ Col 2 R3 sway (REUSED; no dizzy art) |
| `transform` | 3 | 6 | TRANSFORM-IN = the white silhouette flash → Col 4 R2 → Col 1 R1 |
| `taunt` | 1 | 10 | Col 2 R3 front-on, hood up |
| `win` | 2 | 16 | Col 1 R1 ↔ Col 2 R3 (REUSED idle, as briefed; no win art) |
| `lose` | 1 | 6 | Col 3 R1 crouch (REUSED, as briefed; no lose art) |
| `light` | 2 | 3 | JAB = Col 2 R2 → R6 reach (+ render lunge) |
| `heavy` | 2 | 6 | HEAVY = Col 2 R5 lunge → R6 reach, extended (170 px) |
| `down` | 1 | 4 | LOW = Col 3 R1 crouch claw |
| `up` | 2 | 6 | LAUNCHER = Col 4 R2 → Col 3 R3 rising arm |
| `air` | 1 | 4 | AIR = Col 2 R5 leap body |
| `grab` | 1 | 6 | Col 2 R6 reach (REUSED) |
| `whCharge` | 2 | 8 | PRESSURE BLAST charge = Col 3 R3 (orb forming) → R4 (FULL CHARGE peak, droplets) |
| `whFire` | 2 | 6 | PRESSURE BLAST release = Col 3 R5 (burst ring) → R6 (smaller orb, droplets) |
| `whBurst` | 2 | 5 | HYDRO BURST = Col 3 R4 → R5 (+ procedural radial splash ring) |
| `whLash` | 2 | 4 | CLAW LASH = Col 2 R5 lunge → R6 reach (the dash slash) |
| `whSweep` | 1 | 6 | UNDERTOW SWEEP = Col 3 R1 crouch (+ procedural water ring at his feet) |
| `whDive` | 1 | 6 | GEYSER DIVE = Col 3 R3 charge frame (+ procedural downward orb) |
| `whMelt` | 1 | 6 | PUDDLE enter = Col 4 R2 crouch (the body sinks into the procedural puddle) |
| `whReform` | 2 | 6 | PUDDLE exit = Col 4 R2 → Col 1 R1 |
| `whGeyser` | 2 | 5 | GEYSER UPPERCUT = Col 4 R2 → Col 3 R3 rising arm (+ procedural geyser) |
| `whUltOrb` | 3 | 5 | ultimate Pressure Barrage = the Col 3 R4–R6 orb frames |
| `whFlash` | 1 | 6 | white silhouette = hit / Omnitrix transform / timeout-revert flash |

## Missing poses (closest real frame reused, no art invented)

- **hit light / heavy**: Col 2 R6 reach (as briefed). **air hit**: Col 2 R5 leap. **block / block-hit / crouch-guard, knockdown, lose**: Col 3 R1 crouch. **get-up**: Col 3 R1 → Col 1 R1. **dizzy**: Col 3 R2 ↔ Col 2 R3. **win**: Col 1 R1 ↔ Col 2 R3. **jump / fall**: Col 4 R2 → Col 2 R5 leap. **PUDDLE FORM**: the sheet has **no puddle frame** — the body sinks from Col 4 R2 into a **procedural pixel puddle** in his palette (render-only), and reforms Col 4 R2 → Col 1 R1.

## Extracted vs procedural effects

- **Extracted (real sheet pixels):** the orb in Col 3 R3–R6 / Col 4 R1 (touching the hand → part of the frame); the **49 free-floating droplets / spark lines / ring segments** beside Col 3 R4–R6 (912 px), kept in their own frame's cell at their exact sheet offset (never cropped, never a separate entity); the white silhouette flash.
- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the puddle shape and its ripple, splash rings, the Pressure Blast water jet trail, the Hydro Burst radial ring, the Undertow water ring, the geyser column, the Geyser Dive downward orb trail, Drenched droplets / Short Fuse sparks over the opponent, the Pressure Core glow, the ultimate's vortex spiral and towering geyser, screen shake. They READ simulation state; they never write it.


Contact sheet: `docs/ben10/aliens/waterhazard/contact_sheet.png` (every exported strip at ½ size; green = feet row, yellow = torso-centre column). Geometry, removed glyphs, free FX pieces, duplicates, anchors: `source_grid.json`.

Credit: **Sheet from fun-tech.tk**.

