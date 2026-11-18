# Terraspin (Galapagus) — sprite ledger

**Sheet from fun-tech.tk** (credit text on the sheet: "Fun-tech.tk", "Ben 10 Game creator"). Source: the owner's download `~/Downloads/new/ben 10/2148577_orig.png` → `assets/sprites/ben10/aliens/terraspin.png` (480×800). Identified by contact sheet among the blue-background downloads: olive-green turtle, hex-patterned shell, green Omnitrix dot, white spin-wind frames. (Not `802271_orig.png` — that is the Brainstorm crab.)

## Key, halo, text removal, palette

- Background solid blue **(0,0,255)** keyed exactly (zero tolerance; all four corners asserted).
- **Collision / halo report:** 20590 anti-aliased blue-blend pixels around the figures (B − max(R,G) ≥ 40, within 2 px of the key) are removed as halo. His palette (olive / dark green / yellow-olive / white wind / green Omnitrix dot) is never blue-dominant (99th percentile of the kept pixels ≤ 25, asserted). **The white wind streaks are not touched**: their edge blends are light grey-white, not blue. **13 lossy blue specks** sit ≥ 3 px inside the art (in the wind gaps of the spin frames and two in dark outline); they are KEPT untouched (art is never edited) and listed in `source_grid.json`.
- Text: 31 glyph components of "Fun-tech.tk" (near-black) and "Ben 10 / Game creator" (cyan), top right, removed (not art). 7 detached wind-streak tips / single pixels were merged into the spin figure of their grid cell, so every spin frame is ONE component (shell + streaks).

## Cut

- 8-connected components after keying: Col 1 = 9, Col 2 = 8, **Col 3 = 5** (R1–R3 strong-wind spin, **R4** one arm raised / leaning = the chop pose, **R5** the white silhouette — the brief's "R5 / R6"). **22 frames, every one used.**
- Uniform cell **140×118**. Standing / curled frames: anchor column x=70 = mean column of the bottom 12 body rows, feet row originY=105 = the lowest body row (bottom of the legs). **Spin frames** (Col 2 R7–R8, Col 3 R1–R3): anchored at the shell's centre (centroid of the non-wind pixels) with a CONSISTENT hover offset of 39.22 px (= the median feet-to-body-centre distance of the standing frames), so the spinning shell rides at his standing body's height. Pixels copied 1:1 (no blur / filter / resample), pixel counts preserved, nothing cropped — arms, shell and streaks included (asserted).
- **Scale:** high-res cartoon art (~90 px wide, ~80 px tall). The engine's standard path with image smoothing off: Ben's spriteScale 2.0 × global 1.18 × actionScale **0.66** → ≈ 125 px tall (about human Ben), ≈ 140 px wide (wide and low). Not noisy at this scale; no resample filter.

## True sequences (real frames win over the brief's inventory)

- **Col 1 is a TURN**, previewed as an animation: R1 front → R2 three-quarter → R3 side → R4 back / shell → R5 shell side → R6 three-quarter → R7 front; R8 front again; R9 a side profile pulled into the shell (curled). There is no walk cycle: **walk = the front frames R1 / R8 / R7 / R8 CYCLED** (the waddle is the bob). The curled frames (R4, R5, R9) serve hit / knockdown / crouch / Shell Guard.
- **Col 2**: R1 shell turned (block-hit), R2–R3 arms out (jab / heavy start), R4 arms spread wide (heavy end, jump / fall), R5 one arm raised high (launcher, INHALE cast, taunt, win), R6 arms out low (low, EXHALE cast), R7–R8 shell spin with wind.
- **Col 3**: R1–R3 shell spin inside strong white wind (the cyclone loop), R4 one arm raised and leaning (WIND CHOP), R5 silhouette.
- **White silhouette (Col 3 R5): ARMS-UP TURTLE, verified.** Shape overlap (best alignment) with the real poses: Col 2 R5 0.362, Col 2 R5 (mirrored) 0.377, Col 3 R4 0.956, Col 3 R4 (mirrored) 0.517, Col 2 R4 0.575, Col 2 R4 (mirrored) 0.587, Col 1 R1 0.588, Col 1 R1 (mirrored) 0.594, Col 2 R2 0.607, Col 2 R2 (mirrored) 0.624. Best match: **Col 3 R4** — the arm-raised pose. Decision: it is the hit-flash / Omnitrix transform flash / timeout-revert flash (`transform` f1, `tsFlash`); it is not a move body.

## Every sheet frame → animation → move

| Sheet frame | Animations (moves) |
|---|---|
| Col 1 R1 | idle, walk, walk_back, run, turn, guard, transform |
| Col 1 R2 | turn |
| Col 1 R3 | turn |
| Col 1 R4 | turn, hurt_air, dizzy, tsGuard |
| Col 1 R5 | turn, hurt, dizzy |
| Col 1 R6 | turn, getup |
| Col 1 R7 | idle, walk, walk_back, run, turn, getup |
| Col 1 R8 | idle, walk, walk_back, run |
| Col 1 R9 | crouch, lose, knockdown |
| Col 2 R1 | blockHit |
| Col 2 R2 | light |
| Col 2 R3 | heavy |
| Col 2 R4 | jump, fall, win, heavy |
| Col 2 R5 | taunt, win, up, tsInhale |
| Col 2 R6 | down, tsExhale |
| Col 2 R7 | dash, doubleJump, air, tsSpin |
| Col 2 R8 | dash, doubleJump, air, tsSpin |
| Col 3 R1 | tsCyclone |
| Col 3 R2 | tsCyclone |
| Col 3 R3 | tsCyclone |
| Col 3 R4 | tsChop |
| Col 3 R5 | transform, tsFlash |

## Animation → move (exported strips `ben10_terraspin_ready_<anim>_uniform.png`)

| Animation | Frames | Speed | Source / move |
|---|---|---|---|
| `idle` | 4 | 12 | Col 1 R1 / R8 / R7 front stance, slow bob |
| `walk` | 4 | 7 | front frames Col 1 R1 / R8 / R7 / R8 CYCLED (no walk art; the waddle is the bob) |
| `walk_back` | 4 | 8 | the cycled front frames reversed |
| `run` | 4 | 4 | the cycled front frames, faster |
| `dash` | 2 | 2 | Col 2 R7–R8 shell spin (no dash art) |
| `turn` | 7 | 3 | Col 1 R1→R7 turn: front → three-quarter → side / back shell → front |
| `jump` | 1 | 6 | Col 2 R4 arms spread wide (jump rise) |
| `doubleJump` | 2 | 3 | Col 2 R7–R8 shell spin (spin-jump) |
| `fall` | 1 | 6 | Col 2 R4 arms spread (gliding fall) |
| `crouch` | 1 | 6 | Col 1 R9 curled into the shell (crouch) |
| `guard` | 1 | 6 | Col 1 R1 standing (no block art) |
| `blockHit` | 1 | 6 | Col 2 R1 shell turned toward the hit |
| `transform` | 2 | 6 | white silhouette flash → Col 1 R1 stance |
| `taunt` | 1 | 10 | Col 2 R5 arm raised high |
| `win` | 2 | 16 | Col 2 R5 arm raised ↔ Col 2 R4 arms spread (no win art) |
| `lose` | 1 | 6 | Col 1 R9 curled (no lose art) |
| `hurt` | 1 | 6 | Col 1 R5 shell-side curl (no hit art) |
| `hurt_air` | 1 | 6 | Col 1 R4 back-shell curl (no air-hit art) |
| `knockdown` | 1 | 6 | Col 1 R9 curled (no knockdown art) |
| `getup` | 2 | 6 | Col 1 R6 → R7 uncurling to the front (no get-up art) |
| `dizzy` | 2 | 10 | Col 1 R5 ↔ R4 shell wobble (no dizzy art) |
| `light` | 1 | 3 | JAB = Col 2 R2 arms out + render lunge + procedural short chop |
| `heavy` | 2 | 6 | HEAVY = Col 2 R3 → R4 arms sweeping wide + render lunge + procedural wind blade |
| `down` | 1 | 4 | LOW = Col 2 R6 arms low + procedural low sweep |
| `up` | 1 | 6 | LAUNCHER = Col 2 R5 arm raised + procedural upward gale |
| `air` | 2 | 3 | AIR = Col 2 R7–R8 spin + procedural wind ring |
| `tsInhale` | 1 | 6 | INHALE cast = Col 2 R5 arm raised (+ Col 3 cyclone cone FX) |
| `tsExhale` | 1 | 6 | EXHALE cast = Col 2 R6 arms pushing low |
| `tsSpin` | 2 | 2 | SHELL SPIN loop = Col 2 R7–R8 |
| `tsCyclone` | 3 | 2 | CYCLONE loop = Col 3 R1–R3 strong wind (Shell Spin active frames, Cyclone Drop, ultimate) |
| `tsChop` | 1 | 6 | WIND CHOP body = Col 3 R4 one arm raised, leaning (chop pose) |
| `tsGuard` | 1 | 6 | SHELL GUARD = Col 1 R4 back-shell curl |
| `tsFlash` | 1 | 6 | white silhouette = hit / Omnitrix transform / timeout-revert flash |

## Missing poses (closest real frame reused, no art invented)

- **jab / heavy / low / launcher**: no unique attack art. Each is the closest body frame (Col 2 R2 / R3–R4 / R6 / R5) plus a render-only forward lunge or lift offset and a procedural pixel chop / wind blade / sweep / gale (terraspin.js `drawTerraspinFx`). **air**: the Col 2 spin frames + a procedural wind ring.
- **hit light / heavy**: Col 1 R5 / R4 curled. **knockdown, lose, crouch**: Col 1 R9 curled. **get-up**: Col 1 R6 → R7. **dizzy**: Col 1 R5 ↔ R4. **block**: Col 1 R1 standing; **block-hit**: Col 2 R1. **win / taunt**: Col 2 R5 arm raised (+ R4). **jump / fall**: Col 2 R4 arms spread; **double jump / dash**: the Col 2 spin.

## Extracted vs procedural effects

- **Extracted (real sheet pixels, part of the body frames):** the white wind streaks of Col 2 R7–R8 and Col 3 R1–R3 (the Shell Spin / cyclone wind), the green Omnitrix dot, the white silhouette flash.
- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the Inhale cyclone cone and suction streaks, the Exhale blast, wind-blade chops (normals, Wind Chop, ultimate), the launcher gale, the Cyclone Drop landing burst, the Gale Drag streaks over the opponent, Shear pips, the Thorn Shell / Shell Guard sparks, the Pressure gauge, the ultimate's pixel cyclone and screen shake. They READ simulation state; they never write it.


Contact sheet: `docs/ben10/aliens/terraspin/contact_sheet.png` (every exported strip; green = feet row, blue = anchor column). Geometry, removed glyphs, merged fragments, kept specks, silhouette overlaps: `source_grid.json`.

Credit: **Sheet from fun-tech.tk**.

