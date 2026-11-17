# Heatblast — sprite ledger

**Sheet by Dragonrod** ("Heatblast sprite sheet made by Dragonrod — Please, give credits if used!").
Source: `assets/sprites/ben10/aliens/heatblast.png` (825×740, md5 `da30e6e6811011b1f1ca96ee75449fbd`, copied unchanged from
the owner's download `heatblast_sprite_sheet_by_dragonrod_by_dragonrod342_d7yh7km.png`). The tracked root file
`Browser Games - Ben 10_ Battle Ready - Aliens - Heatblast.png` is a DIFFERENT rip (magenta bg, subvercetti) and is not used.

Slicer: `tools/ben10/slice_heatblast.py` (deterministic; re-run regenerates every strip, `heatblastAssets.js`,
`source_grid.json` and `contact_sheet.png`).

## Keying
* Background: exact sage `(154,184,126)` on all four corners; zero tolerance. No other pixel is within 40 (L1) of it, so
  Heatblast's yellow / orange / red / black palette has **no collision** with the key.
* Removed (text is not art): 56 pure-black glyph components (the `stand … attack 4` labels) and the white credit box
  (one component, which also contains the small blue **alt pal** figure).
* The alt-pal figure was **sampled first**: it is stand row-2 f1 mirrored (IoU 0.996, 524/531 overlapping pixels map
  1:1). Map (source → Blue Flame): `255,233,67→0,162,232` · `255,201,14→63,72,204` · `255,255,243→153,217,234` ·
  `26,26,26→97,97,97` · `136,0,21→77,0,204` · `237,28,36→5,113,231` · `190,190,180→153,217,234` · `17,18,20→97,97,97`.
  Colours not on the alt figure (attack-2/4 FX oranges, black outline) use the nearest mapped source colour / stay black;
  the full table is `blue_map` in `source_grid.json`. The alt-pal figure is **not** used as a frame.

## Cutting / anchors
* 8-connected components; flames, hand fireballs and trails touching the body are one component. Attack 2's 28 detached
  trail specks (`208,64,32` / `160,40,24`) are attached to the frame they trail. The 4 loose fireballs beside
  "attack 1" are exported as FX (`ben10_heatblast_fx_fireball.png`, projectile loop).
* Cell 112×80 native, nearest-neighbour only (frames copied 1:1, never resampled). Horizontal anchor = body centre
  (mean of body colours `26,26,26 / 17,18,20 / 136,0,21 / 237,28,36 / 41,41,41`, **not flames**) at x=56.
  Ground poses: feet baseline at row 62 (`originY`). Flight poses (attack 2 / attack 4): body centre at the stand's
  body height above the baseline, so flames extend below it without cropping. On-screen size comes from
  `actionScale: 1.5` (× Ben's spriteScale 2.0 → ~132 px, Swampfire ~124 px).

## Row 2 — continuation or near-duplicate?
Checked frame-by-frame on the contact sheet and by pixel diff: **every label's row 2 is a near-duplicate of row 1**
(5–12 px differ per frame: row 2 lacks the green Omnitrix badge on the chest; walk f4–5 and attack 3 f4–6 are
pixel-identical because the badge is hidden). So the sheet has 4 unique stand / jump / fall / crouch / attack 1 /
attack 2 / attack 4 frames and 6 walk / attack 3 frames — not the 8 / 12 in the inventory.
**Row 2 is the BLUE FLAME variant** of every animation: `ben10_heatblast_blue_*_uniform.png` = row-2 frames recoloured
with the alt-pal map (the alt-pal figure is itself badge-less, i.e. drawn from row 2). Inventory "walk 1–6 / run 7–12"
does not hold: frames 7–12 are row 2 = Blue Flame walk; run plays the same 6 frames faster.

## Frame → animation → move
| animation | source frames (label row f#) | move / use | note |
|---|---|---|---|
| `idle` | stand r1 f1, stand r1 f2, stand r1 f3, stand r1 f4 | idle / Stand |  |
| `walk` | walkrun r1 f1, walkrun r1 f2, walkrun r1 f3, walkrun r1 f4, walkrun r1 f5, walkrun r1 f6 | walk |  |
| `run` | walkrun r1 f1, walkrun r1 f2, walkrun r1 f3, walkrun r1 f4, walkrun r1 f5, walkrun r1 f6 | run | same 6-frame walk cycle, faster (row 2 is not frames 7–12, see below) |
| `dash` | walkrun r1 f2, walkrun r1 f5 | dash | walk/run f2+f5 |
| `jump` | jump r1 f1, jump r1 f2, jump r1 f3, jump r1 f4 | jump_rise |  |
| `fall` | fall r1 f1, fall r1 f2, fall r1 f3, fall r1 f4 | jump_fall |  |
| `crouch` | crouch r1 f1, crouch r1 f2, crouch r1 f3, crouch r1 f4 | crouch |  |
| `light` | attack1 r1 f1, attack1 r1 f2 | Jab 5f/20/0 (flame palm) |  |
| `heavy` | attack1 r1 f1, attack1 r1 f2, attack1 r1 f3, attack1 r1 f4 | Heavy 14f/56/-6 (thrown flame burst); ULT opener (40) |  |
| `down` | crouch r1 f3, crouch r1 f4 | Low 7f/28/-4 (crouch flame lick) |  |
| `up` | attack3 r1 f1, attack3 r1 f2, attack3 r1 f3 | Launcher 11f/50/-9 (upward flare) |  |
| `air` | fall r1 f2, fall r1 f3 | Air 7f/32/+2 (+ forward burst FX) | fall f2–3 (forward burst is a FX projectile) |
| `down_air` | attack4 r1 f1, attack4 r1 f2, attack4 r1 f3, attack4 r1 f4 | Down-air 12f/48 (dive, landing burst) |  |
| `guard` | crouch r1 f1, crouch r1 f2 | block | crouch f1–2 (as inventoried) |
| `hurt` | fall r1 f1 | hit stun | REUSED fall f1 — no hit-stun pose on the sheet |
| `knockdown` | crouch r1 f4 | knockdown | REUSED crouch f4 — no knockdown pose on the sheet |
| `getup` | crouch r1 f4, crouch r1 f3, crouch r1 f2, crouch r1 f1 | get-up | REUSED crouch f4→f1 — no get-up pose |
| `roll` | crouch r1 f1, crouch r1 f2, crouch r1 f3, crouch r1 f4 | roll | REUSED crouch cycle — no roll pose |
| `transform` | stand r1 f1, stand r1 f2, stand r1 f3, stand r1 f4 | transform-in | REUSED stand |
| `intro` | stand r1 f1, stand r1 f2, stand r1 f3, stand r1 f4 | intro | REUSED stand |
| `win` | attack3 r1 f4, attack3 r1 f5, attack3 r1 f6 | win | REUSED attack 3 star burst f4–6 |
| `lose` | crouch r1 f4 | lose | REUSED crouch f4 |
| `taunt` | attack1 r1 f1 | taunt | REUSED attack 1 f1 |
| `grab` | attack1 r1 f1, attack1 r1 f2 | grab | REUSED attack 1 f1–2 |
| `hbFireball` | attack1 r1 f1, attack1 r1 f2, attack1 r1 f3, attack1 r1 f4 | Fireball (↓↘→+P) cast body |  |
| `hbRocket` | attack2 r1 f1, attack2 r1 f2, attack2 r1 f3, attack2 r1 f4 | Fire Rocket (→→+P) |  |
| `hbSupernova` | attack3 r1 f1, attack3 r1 f2, attack3 r1 f3, attack3 r1 f4, attack3 r1 f5, attack3 r1 f6 | Supernova (←↙↓+P) |  |
| `hbFlight` | attack4 r1 f1, attack4 r1 f2, attack4 r1 f3, attack4 r1 f4 | Blaze Flight (air ↓↘→+P) |  |
| `hbAbsorb` | crouch r1 f1, crouch r1 f2 | Heat Absorb (block+Heavy) | REUSED guard (crouch f1–2) |
| `hbUltRise` | attack4 r1 f1, attack4 r1 f2, attack4 r1 f3, attack4 r1 f4 | Pyronite Meteor beat 1 (rocket up) |  |
| `hbUltSun` | attack3 r1 f4, attack3 r1 f5, attack3 r1 f6 | Pyronite Meteor beat 2 (mini-sun, fireball rain) |  |
| `hbUltDive` | attack4 r1 f1, attack4 r1 f2, attack4 r1 f3, attack4 r1 f4 | Pyronite Meteor beat 3 (meteor dive) |  |
| `fx fireball` | attack 1 FX 1–4 | Fireball projectile loop; Pyronite Meteor rain; Blue Flame copy | |

Every `ben10_heatblast_<anim>_uniform.png` has a `ben10_heatblast_blue_<anim>_uniform.png` twin built from the **row 2**
frame with the same number (Blue Flame render, see above).

## Source frames not used in the normal set
* Row 2 of every label → used only by the Blue Flame set (above).
* Jump f1–4 are used only by `jump` (the launcher uses attack 3 f1–3 as specified).
* Every row-1 frame is used at least once: stand 1–4, jump 1–4, fall 1–4, crouch 1–4, walk/run 1–6, attack 1 1–4,
  attack 2 1–4, attack 3 1–6, attack 4 1–4.

## Missing poses (no art on the sheet — reuse, never invented)
hit stun → fall f1 · knockdown → crouch f4 · get-up → crouch f4→f1 · win → attack 3 star burst · lose → crouch f4 ·
intro / transform → stand · taunt → attack 1 f1 · grab → jab · roll → crouch cycle.
