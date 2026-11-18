# Brainstorm (Cerebrocrustacean) — sprite ledger

**Sheet from fun-tech.tk** (credit text on the sheet: "Fun-tech.tk"). Source: the owner's download `~/Downloads/new/ben 10/802271_orig.png` → `assets/sprites/ben10/aliens/brainstorm.png` (480×800). Identified by contact sheet among the blue-background downloads (orange-brown crab, green/black stripes, purple brain dome).

## Key, halo, text removal, palette

- Background solid blue **(0,0,255)** keyed exactly (zero tolerance; all four corners asserted).
- **Collision / halo report:** the art is anti-aliased against the blue and saved lossy, so **31418 pixels** around the figures are blue blends (0,0,254), (1,0,253), … (70,27,132). 99 % of them are exactly 1 px from the key colour. A zero-tolerance key alone leaves them as a visible blue outline, so pixels with blue-dominance B − max(R,G) ≥ 40 are removed as halo. His palette never reaches that: orange / brown / green / black / yellow-white bursts are ≤ 0, the **purple dome ≈ (135,69,136) is ≈ +1**, and the interior 99.9th percentile is 29 (asserted in the slicer). No art colour is blue-adjacent; the dome is untouched.
- "Fun-tech.tk" text (top right): 19 near-black glyph components inside the text box, removed (not art). 4 tiny detached fragments (burst spark tips / single pixels) lying inside a figure's box were merged into that figure.

## Cut

- 8-connected components after keying: Col 1 = 9, Col 2 = 9, **Col 3 = 8** (not 9: R1 closed, R2 dome rising, R3 dome up, R4–R5 burst + lightning, R6 brightest burst, R7 faded burst / dome settling, R8 dome up calm), right extras = 3. **29 frames, every one used.** Each electric-burst frame (Col 3 R4–R7) is ONE component: figure + burst. No clean body-only frame exists for any burst frame (the body is inside / behind the burst); the closest clean bodies are Col 3 R3 / R8 (dome up).
- Uniform cell **130×92**; anchor column x=65 = mean column of the non-burst pixels in the bottom 12 rows (the legs), feet row originY=89 = the lowest non-burst row (bottom of the legs). Never the dome or the burst. Pixels copied 1:1 (no blur / filter / resample), pixel counts preserved, nothing cropped (asserted).
- **Scale:** high-res cartoon art (~100 px wide, ~70 px tall). Rendered through the engine's standard path with image smoothing off: Ben's spriteScale 2.0 × global 1.18 × actionScale **0.75** → ≈ 124 px tall (about human Ben), ≈ 180 px wide (crab-wide and low).

## Frame order (real frames win over the brief's inventory)

- Col 1 R1–9 and Col 2 R1–6 are near-identical bobbing / shuffling frames forming ONE continuous loop (frame-to-frame overlap 0.66–0.90, Col 1 R9 → Col 2 R1 = 0.69, the same as inside the loop); Col 2 R6 → R7 drops to 0.48: **Col 2 R7–9 are a separate set** (legs spread wide, body lower) → used for air / crouch / low. Idle = Col 1 slow, walk = the 15-frame loop, run = faster.
- Col 3 previewed R1→R8 as an animation: dome closed → rising → up → burst ×3 → faded → dome up calm. Open transition = R1→R3, close = reverse; open idle = R8 (the brief's "R9").
- **White silhouette (bottom right): NOT a lunge.** Its outline is the plain stance (shell left, raised claw right — the same shape as the right-extra plain frame). Used as the hit-flash / Omnitrix transform flash (`transform` f1, `bsFlash`). Calculated Strike uses Col 2 R6 with real travel + a render lean.

## Every sheet frame → animation → move

| Sheet frame | Animations (moves) |
|---|---|
| Col 1 R1 | idle, walk, walk_back, run, dash, dizzy |
| Col 1 R2 | idle, walk, walk_back, run, dash |
| Col 1 R3 | idle, walk, walk_back, run, dash |
| Col 1 R4 | idle, walk, walk_back, run, dash, light |
| Col 1 R5 | idle, walk, walk_back, run, dash |
| Col 1 R6 | idle, walk, walk_back, run, dash |
| Col 1 R7 | idle, walk, walk_back, run, dash |
| Col 1 R8 | idle, walk, walk_back, run, dash |
| Col 1 R9 | idle, walk, walk_back, run, dash |
| Col 2 R1 | walk, walk_back, run, dash |
| Col 2 R2 | walk, walk_back, run, dash |
| Col 2 R3 | walk, walk_back, run, dash |
| Col 2 R4 | walk, walk_back, run, dash |
| Col 2 R5 | walk, walk_back, run, dash, heavy |
| Col 2 R6 | walk, walk_back, run, dash, heavy, bsStrike |
| Col 2 R7 | jump, doubleJump, getup, air |
| Col 2 R8 | fall, down |
| Col 2 R9 | crouch, lose, knockdown, down |
| Col 3 R1 | guard, transform, up, bsDomeOpen, bsDomeClose, bsPull |
| Col 3 R2 | taunt, bsDomeOpen, bsDomeClose |
| Col 3 R3 | taunt, win, bsDomeOpen, bsDomeClose |
| Col 3 R4 | bsCast |
| Col 3 R5 | bsCast |
| Col 3 R6 | bsCast, bsCastHold |
| Col 3 R7 | bsRecover |
| Col 3 R8 | taunt, win, open_idle, open_walk |
| Right extra R1 | open_idle, open_walk, open_jump |
| Right extra R2 | hurt, hurt_air, dizzy |
| Right extra R3 | transform, bsFlash |

## Animation → move (exported strips `ben10_brainstorm_ready_<anim>_uniform.png`)

| Animation | Frames | Speed | Source / move |
|---|---|---|---|
| `idle` | 9 | 9 | Col 1 R1-9 (the first 9 frames of the shuffle loop), slow |
| `walk` | 15 | 4 | Col 1 R1-9 + Col 2 R1-6 = one continuous 15-frame crab shuffle |
| `walk_back` | 15 | 4 | the 15-frame shuffle reversed |
| `run` | 15 | 2 | the 15-frame shuffle cycled faster |
| `dash` | 15 | 2 | the 15-frame shuffle cycled faster (no dash art) |
| `jump` | 1 | 6 | Col 2 R7 legs spread (no jump art) |
| `doubleJump` | 1 | 6 | Col 2 R7 reused |
| `fall` | 1 | 6 | Col 2 R8 legs spread (no fall art) |
| `crouch` | 1 | 6 | Col 2 R9 lowest stance (no crouch art) |
| `guard` | 1 | 6 | Col 3 R1 closed rest (no block art) |
| `transform` | 2 | 6 | white silhouette flash → Col 3 R1 closed rest |
| `taunt` | 3 | 10 | dome rising → dome up (render only; the dome STATE is not changed) |
| `win` | 2 | 16 | dome up frames (no win art) |
| `lose` | 1 | 6 | Col 2 R9 lowest stance (no lose art) |
| `hurt` | 1 | 6 | right-extra plain frame = hit_react (no hit art) |
| `hurt_air` | 1 | 6 | right-extra plain frame reused |
| `knockdown` | 1 | 6 | Col 2 R9 lowest stance (no knockdown art) |
| `getup` | 1 | 6 | Col 2 R7 (no get-up art) |
| `dizzy` | 2 | 10 | plain frame ↔ Col 1 R1 (no dizzy art) |
| `light` | 1 | 3 | JAB = Col 1 R4 + render lunge + procedural claw swipe |
| `heavy` | 2 | 6 | HEAVY = Col 2 R5-6 + render lunge + procedural claw clamp |
| `down` | 2 | 4 | LOW = Col 2 R8-9 (spread legs) + procedural leg-sweep spark |
| `up` | 1 | 6 | LAUNCHER = Col 3 R1 + render-only psychic lift shimmer |
| `air` | 1 | 4 | AIR = Col 2 R7 + procedural claw swipe |
| `bsDomeOpen` | 3 | 6 | DOME OPEN transition = Col 3 R1 → R2 → R3 |
| `bsDomeClose` | 3 | 8 | DOME CLOSE transition = Col 3 R3 → R2 → R1 (reverse) |
| `bsCast` | 3 | 3 | LIGHTNING cast = Col 3 R4-R6 bursts (Brain Bolt / Neural Burst / Overcharge / ult storm) |
| `bsCastHold` | 1 | 6 | Col 3 R6 brightest burst held (Final Tempest, enlarged in brainstorm.js) |
| `bsRecover` | 1 | 6 | Col 3 R7 faded burst = burst recovery / dome settling |
| `bsFlash` | 1 | 6 | white silhouette = hit-flash / Omnitrix flash |
| `bsStrike` | 1 | 6 | CALCULATED STRIKE body = Col 2 R6 walk frame + real travel + render lean (the silhouette is not a lunge) |
| `bsPull` | 1 | 6 | PSYCHIC PULL = Col 3 R1 + procedural telekinetic rings |
| `open_idle` | 2 | 18 | OPEN idle = Col 3 R8 ↔ right-extra dome frame (both dome up, calm) |
| `open_walk` | 2 | 7 | OPEN walk = the two dome-up frames alternated (no dome-up walk art) |
| `open_jump` | 1 | 6 | OPEN air = right-extra dome frame |

## Missing poses (closest real frame reused, no art invented)

- **jab / heavy / low / launcher / air**: no unique body art. Each is an idle / walk / spread-leg frame plus a render-only forward lunge or upward lift offset and a procedural pixel claw swipe / spark (brainstorm.js `drawBrainstormFx`).
- **jump / double jump / fall**: Col 2 R7 / R8. **crouch, knockdown, lose**: Col 2 R9. **block**: Col 3 R1. **hit / air hit / dizzy**: right-extra plain frame. **get-up**: Col 2 R7. **win / taunt**: dome-up frames (render only).
- **OPEN (dome up) frame set**: idle / walk / run / air use Col 3 R8 + the right-extra dome frame (no dome-up walk art).

## Extracted vs procedural effects

- **Extracted (real sheet pixels, part of the body frames):** the electric bursts + lightning of Col 3 R4–R7 (with the Omnitrix dot), the purple dome, the white silhouette flash.
- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** Brain Bolt / Overcharge / storm lightning bolts, the Neural Burst pixel ring, the Psychic Pull telekinetic rings, the lift shimmer, claw-swipe / sweep sparks, the Mind Shield pixel shell, Synapse pips / Short-Circuit static over the opponent, the Pattern Read HUD label, the ultimate's math glyphs, graph lines, stage dim and shock ring. They READ simulation state; they never write it.


Contact sheet: `docs/ben10/aliens/brainstorm/contact_sheet.png` (every exported strip; green = feet row, blue = anchor column). Geometry, removed glyphs and merged fragments: `source_grid.json`.

Credit: **Sheet from fun-tech.tk**.

