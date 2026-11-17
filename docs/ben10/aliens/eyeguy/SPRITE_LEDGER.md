# Eyeguy (Opticoid) — sprite ledger

**Sheet by Dragonrod** (author's request: "please, give credits if used!"). Source: repo-root `eyeguy_sprite_sheet_by_dragonrod342_d82qnsd.png` → `assets/sprites/ben10/aliens/eyeguy.png` (384×636).

## Key, text removal, palette

- Background solid pale blue-grey **(167, 201, 200)** keyed exactly (zero tolerance; all four corners). 19 colours on the sheet.
- Removed as whole connected components, nothing sampled from them: 51 black label glyphs ("Stand / jump / fall / crouch / walk / attack → ↑ ↓"), 9 red "EX." tag pieces (237,28,36 — used nowhere in his art) and the white credit box (1 component incl. its text).
- Palette checked: no body / FX component contains the key colour, the tag red or pure white; his yellow / olive / green / pink-eye / black outline colours never collide with the key.

## EX (max-charge) frames

- **attack → f3** (EX Charged Eye Orb) and **attack ↑ f3, f4** (Rising Gaze). The orb drawn in attack → f3 and attack ↑ f3 touches the hand, so it is part of those body frames.

## Cut

- 8-connected components. Bodies: Stand 4, jump 1, fall 1, crouch 1, walk 6, attack 3, attack → 3, attack ↑ 4, attack ↓ 3 (26 body frames, every one used). Free-floating FX are their own frames: zigzag wave 2 lines (the top line is 3 gap-separated pieces of one wave, kept as one frame), 2 free orbs by attack →, 2 free orbs + 2 diagonal beam slivers by attack ↑, the horizontal beam (2 lines) at the end of attack ↓ — it does NOT touch his hand, so it is FX.
- Uniform body cell **92×69**, anchor column x=46 (mean column of each frame's bottom 10 rows = legs / feet), feet baseline originY=66; actionScale 1.15. Nearest-neighbour, pixels copied 1:1, no frame cropped (asserted).

## Every sheet frame → animation → move

| Sheet row | Frame | Animations (moves) |
|---|---|---|
| Stand | f1 | idle, transform, taunt, win, dizzy |
| Stand | f2 | idle, transform, taunt, win, dizzy |
| Stand | f3 | idle, transform, taunt, win, dizzy |
| Stand | f4 | idle, transform, taunt, win, dizzy |
| jump / fall / crouch | jump | jump, doubleJump |
| jump / fall / crouch | fall | fall, hurt, hurt_air, knockdown, air, egOpenEyes |
| jump / fall / crouch | crouch | crouch, guard, lose, getup |
| walk | f1 | walk, walk_back, run, dash |
| walk | f2 | walk, walk_back, run, dash |
| walk | f3 | walk, walk_back, run, dash |
| walk | f4 | walk, walk_back, run, dash |
| walk | f5 | walk, walk_back, run, dash |
| walk | f6 | walk, walk_back, run, dash |
| attack | f1 | light, egHypno |
| attack | f2 | heavy, egHypno |
| attack | f3 | heavy, egHypno |
| attack → | f1 | egOrb, egOrbHold, egUltOpen |
| attack → | f2 | egOrb, egUltOpen |
| attack → | f3 **EX** | egOrbEx |
| attack ↑ | f1 | up |
| attack ↑ | f2 | up |
| attack ↑ | f3 **EX** | egGaze, egUltFlare |
| attack ↑ | f4 **EX** | egGaze, egUltFlare |
| attack ↓ | f1 | down, egLowGaze |
| attack ↓ | f2 | egLowGaze |
| attack ↓ | f3 | egLowGaze, egUltStare |

## Animation → move (exported strips `ben10_eyeguy_ready_<anim>_uniform.png`)

| Animation | Frames | Speed | Source / move |
|---|---|---|---|
| `idle` | 4 | 7 | Stand f1-4 loop |
| `walk` | 6 | 5 | walk f1-6 |
| `walk_back` | 6 | 5 | walk f1-6 REVERSED |
| `run` | 6 | 3 | walk f1-6 sped up (no run row) |
| `dash` | 6 | 2 | walk f1-6 sped up further (no dash row) |
| `jump` | 1 | 6 | jump (rise) |
| `doubleJump` | 1 | 6 | jump (rise) reused |
| `fall` | 1 | 6 | fall (arms up) |
| `crouch` | 1 | 6 | crouch |
| `guard` | 1 | 6 | crouch reused for block (no block row) |
| `transform` | 4 | 5 | Stand reused (no transform row) |
| `taunt` | 4 | 6 | Stand reused (no taunt row) |
| `win` | 4 | 7 | Stand reused (no win row) |
| `lose` | 1 | 6 | crouch reused (no lose row) |
| `hurt` | 1 | 6 | fall reused (no hit-stun row) |
| `hurt_air` | 1 | 6 | fall reused (no hit-stun row) |
| `knockdown` | 1 | 6 | fall reused (no knockdown row) |
| `getup` | 1 | 6 | crouch reused (no get-up row) |
| `dizzy` | 4 | 9 | Stand reused (no dizzy row) |
| `light` | 1 | 3 | JAB = attack f1 |
| `heavy` | 2 | 5 | HEAVY claw swipe = attack f2-3 |
| `down` | 1 | 4 | LOW = attack ↓ f1 (crouched aim; crouch frame precedes via the engine crouch pose) |
| `up` | 2 | 4 | LAUNCHER = attack ↑ f1-2 |
| `air` | 1 | 4 | AIR = fall frame (+ render-only eye flash) |
| `egHypno` | 3 | 5 | HYPNO WAVE cast = attack f1-3 (+ zigzag wave FX) |
| `egOrb` | 2 | 5 | EYE ORB cast = attack → f1-2 |
| `egOrbHold` | 1 | 6 | EYE ORB charge hold = attack → f1 |
| `egOrbEx` | 1 | 6 | EX CHARGED ORB = attack → f3 (EX frame; its orb touches the hand → part of the frame) |
| `egGaze` | 2 | 6 | RISING GAZE = attack ↑ f3-4 (EX frames; f3 orb touches → part of the frame) |
| `egLowGaze` | 3 | 4 | LOW GAZE = attack ↓ f1-3 (+ horizontal beam FX) |
| `egOpenEyes` | 1 | 6 | OPEN EYES (air) = fall frame (+ 3-orb fan FX) |
| `egUltOpen` | 2 | 4 | ALL-SEEING EYE opener = attack → f1-2 |
| `egUltFlare` | 2 | 6 | ALL-SEEING EYE flare = attack ↑ f3-4 EX frames |
| `egUltStare` | 1 | 6 | ALL-SEEING EYE final stare = attack ↓ f3 |

## Missing poses (closest real frame reused, no art invented)

- hit stun / knockdown → **fall**; get-up / lose / block → **crouch**; win / taunt / transform / dizzy → **Stand**; run / dash → **walk** sped up (speed 3 / 2 vs walk 5); walk_back = walk reversed; doubleJump = jump.

## FX (real sheet pixels, `ben10_eyeguy_ready_fx_<key>.png`)

- `wave` (2 frames, 78×16): zigzag wave lines by the plain "attack" row (top line = 3 touching-gap pieces kept as one frame, bottom line).
- `orb` (2 frames, 24×24): green energy orbs by "attack →" (the 2 free orbs) — Eye Orb projectile loop.
- `orbUp` (2 frames, 24×24): green energy orbs by "attack ↑" (the 2 free orbs) — Open Eyes fan / Rising Gaze sparks.
- `beamDiag` (2 frames, 21×16): diagonal beam slivers by "attack ↑" — Rising Gaze 45° beam.
- `beamH` (1 frame, 25×8): horizontal beam (2 lines) at the end of "attack ↓" — does not touch the hand → FX; Low Gaze / ult stare.

## Procedural / render-only (documented, not art)

- The Unblinking eye glyph over the opponent, the ALL-SEEING EYE screen of pixel eyes (hash-chosen positions, render-only), the air-attack eye flash, and rotated / mirrored / integer-enlarged copies of the real beam FX in the ultimate. None has a hitbox or any GAME_STATE presence.


Contact sheet: `docs/ben10/aliens/eyeguy/contact_sheet.png` (every exported strip; green = feet baseline, blue = anchor column). Full geometry: `source_grid.json`.

