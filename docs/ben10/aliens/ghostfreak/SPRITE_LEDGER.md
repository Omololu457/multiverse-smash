# Ghostfreak (Ectonurite) — sprite ledger

Sheet ripped by subvercetti (The Spriters Resource).

Source: `assets/sprites/ben10/aliens/ghostfreak.png` (736×802, Ben 10: Battle Ready), copied byte-for-byte from the
untracked `Browser Games - Ben 10_ Battle Ready - Aliens - Ghostfreak.png` (md5 0ff1f3eb…). Generator:
`python3 -I tools/ben10/slice_ghostfreak.py` → `ben10_ghostfreak_*.png`, `ghostfreakAssets.js`, `source_grid.json`,
`contact_sheet.png` (this folder). Never invent art: every frame below is a 1:1 copy of a sheet component.

## Keying

- Background: EXACT magenta (255, 0, 255), sampled at all four corners; zero tolerance — only exact-key pixels removed.
- Pink fringe: **0** near-magenta pixels (L1 < 120 from the key) and **0** magenta-hue pixels remain inside kept art.
  The 1,370 near-magenta pixels on the sheet are all anti-aliasing of the black text labels, which are excluded.
  No erode / blur / recolour.
- Palette collision: the closest kept pixel is 266 (L1) from the key — the grey body, white FX,
  small red mark and lime-green silhouettes never approach magenta.
- Excluded (not art): 57 components — every text label ("Transform", "Idle", "Lose/Time over",
  "Fly", "Attack" ×2 sets), the "Ripped by subvercetti" credit and the "Only for The Spriters Resource" logo.

## Geometry

- Cell 92×112; **anchor = head-and-torso centre** (centroid of the upper 55 % of the silhouette) at
  (51, 39) in every frame — he has no feet and the tapering tail never drives the anchor.
- Hover: the floor line (`originY`) is 92, i.e. 53 px below the torso centre = the median Idle tail tip,
  so he floats at one consistent height; longer tails (Fly, Lose) may dip a few px lower.
- On screen ×2 (Ben `spriteScale` 2 × `actionScale` 1.0); nearest-neighbour only; nothing cropped (asserted:
  every source pixel lands in its cell).

## The two sets (mirror finding)

The engine draws one set and flips it by facing (no per-facing sprites), so the **top set is canonical** and the bottom
set is an intentional, unused duplicate. Verified pair by pair (bottom flipped vs top):

| Frame | Top | Bottom | Result | Use |
|---|---|---|---|---|
| transform1 | #4 | #108 | EXACT mirror | unused duplicate |
| transform2 | #6 | #107 | hand-redrawn mirror (same pose) | unused duplicate |
| idle1 | #2 | #106 | hand-redrawn mirror (same pose) | unused duplicate |
| idle2 | #7 | #109 | hand-redrawn mirror (same pose) | unused duplicate |
| idle3 | #5 | #105 | hand-redrawn mirror (same pose) | unused duplicate |
| idle4 | #3 | #104 | hand-redrawn mirror (same pose) | unused duplicate |
| idle5 | #1 | #103 | hand-redrawn mirror (same pose) | unused duplicate |
| lose1 | #22 | #124 | hand-redrawn mirror (same pose) | unused duplicate |
| lose2 | #21 | #123 | EXACT mirror | unused duplicate |
| fly1 | #16 | #122 | EXACT mirror | unused duplicate |
| fly2 | #19 | #121 | EXACT mirror | unused duplicate |
| fly3 | #17 | #120 | EXACT mirror | unused duplicate |
| fly4 | #20 | #119 | EXACT mirror | unused duplicate |
| fly5 | #18 | #118 | EXACT mirror | unused duplicate |
| attack1 | #38 | #149 | hand-redrawn mirror (same pose) | unused duplicate |

Fly ×5, the green Transform silhouette and the green Time-over silhouette are **exact** pixel mirrors. The grey
Transform, Idle ×5, grey Lose and Attack are **hand-redrawn** mirrors: same pose, 89–95 % silhouette overlap, outline /
shading re-rasterised, the red mark present in both (2–5 px). No pose, mark or FX differs, so there is no variant to map.
All 6 wind FX of the bottom row are exact mirrors of the top row.

## Body frames → animations → moves

| Animation | Source frame | Component | Source bbox | Render dy | Role / move |
|---|---|---|---|---|---|
| `idle` | idle f1 | #2 | (272, 16, 311, 94) |  | idle loop (top set) |
| `idle` | idle f2 | #7 | (330, 20, 371, 92) |  | idle loop (top set) |
| `idle` | idle f3 | #5 | (392, 18, 436, 95) |  | idle loop (top set) |
| `idle` | idle f4 | #3 | (450, 17, 499, 95) |  | idle loop (top set) |
| `idle` | idle f5 | #1 | (514, 15, 556, 98) |  | idle loop (top set) |
| `walk` | fly f1 | #16 | (266, 120, 317, 199) |  | walk - REUSED Fly (hover; no walk pose) |
| `walk` | fly f2 | #19 | (326, 122, 377, 194) |  | walk - REUSED Fly (hover; no walk pose) |
| `walk` | fly f3 | #17 | (384, 120, 439, 197) |  | walk - REUSED Fly (hover; no walk pose) |
| `walk` | fly f4 | #20 | (439, 123, 499, 201) |  | walk - REUSED Fly (hover; no walk pose) |
| `walk` | fly f5 | #18 | (518, 120, 571, 202) |  | walk - REUSED Fly (hover; no walk pose) |
| `run` | fly f1 | #16 | (266, 120, 317, 199) |  | run - REUSED Fly (hover) |
| `run` | fly f2 | #19 | (326, 122, 377, 194) |  | run - REUSED Fly (hover) |
| `run` | fly f3 | #17 | (384, 120, 439, 197) |  | run - REUSED Fly (hover) |
| `run` | fly f4 | #20 | (439, 123, 499, 201) |  | run - REUSED Fly (hover) |
| `run` | fly f5 | #18 | (518, 120, 571, 202) |  | run - REUSED Fly (hover) |
| `dash` | fly f2 | #19 | (326, 122, 377, 194) |  | dash - REUSED Fly f2-3 |
| `dash` | fly f3 | #17 | (384, 120, 439, 197) |  | dash - REUSED Fly f2-3 |
| `jump` | fly f1 | #16 | (266, 120, 317, 199) |  | jump_rise - Fly f1 |
| `fall` | fly f4 | #20 | (439, 123, 499, 201) |  | jump_fall - Fly f4 |
| `crouch` | idle f1 | #2 | (272, 16, 311, 94) |  | crouch - REUSED Idle f1 (no crouch pose) |
| `guard` | idle f1 | #2 | (272, 16, 311, 94) |  | block - Idle f1 (no block pose; block-hit reuses it) |
| `light` | attack f1 | #38 | (10, 237, 97, 319) |  | JAB - Attack pose (the only attack body) + procedural short wind swipe |
| `heavy` | attack f1 | #38 | (10, 237, 97, 319) |  | HEAVY - Attack pose + extended wind swipe (procedural + extracted arrow FX) |
| `down` | attack f1 | #38 | (10, 237, 97, 319) | 12 | LOW - Attack pose with a 12 px render-only low offset (hits low) |
| `up` | fly f1 | #16 | (266, 120, 317, 199) | -10 | LAUNCHER - Fly f1 raised 10 px (render-only "tilt up" offset) + upward gale |
| `air` | fly f2 | #19 | (326, 122, 377, 194) |  | AIR - Fly f2 + forward wind |
| `hurt` | lose f1 | #22 | (10, 126, 54, 214) |  | hit_react - REUSED grey Lose pose (hit_react_heavy fallback; no light-hit pose) |
| `knockdown` | lose f1 | #22 | (10, 126, 54, 214) |  | knockdown - grey Lose pose (no knockdown pose) |
| `getup` | lose f1 | #22 | (10, 126, 54, 214) |  | get-up - REUSED grey Lose -> Idle f1 (no get-up pose) |
| `getup` | idle f1 | #2 | (272, 16, 311, 94) |  | get-up - REUSED grey Lose -> Idle f1 (no get-up pose) |
| `dizzy` | idle f1 | #2 | (272, 16, 311, 94) |  | dizzy - REUSED Idle f1-2 (no dizzy pose) |
| `dizzy` | idle f2 | #7 | (330, 20, 371, 92) |  | dizzy - REUSED Idle f1-2 (no dizzy pose) |
| `roll` | fly f1 | #16 | (266, 120, 317, 199) |  | roll - REUSED Fly |
| `roll` | fly f2 | #19 | (326, 122, 377, 194) |  | roll - REUSED Fly |
| `roll` | fly f3 | #17 | (384, 120, 439, 197) |  | roll - REUSED Fly |
| `roll` | fly f4 | #20 | (439, 123, 499, 201) |  | roll - REUSED Fly |
| `roll` | fly f5 | #18 | (518, 120, 571, 202) |  | roll - REUSED Fly |
| `transform` | transform f1 | #4 | (17, 18, 74, 101) |  | Omnitrix transform-in: green silhouette -> grey body |
| `transform` | transform f2 | #6 | (98, 19, 151, 101) |  | Omnitrix transform-in: green silhouette -> grey body |
| `intro` | idle f1 | #2 | (272, 16, 311, 94) |  | intro - REUSED Idle (no intro pose) |
| `intro` | idle f2 | #7 | (330, 20, 371, 92) |  | intro - REUSED Idle (no intro pose) |
| `intro` | idle f3 | #5 | (392, 18, 436, 95) |  | intro - REUSED Idle (no intro pose) |
| `intro` | idle f4 | #3 | (450, 17, 499, 95) |  | intro - REUSED Idle (no intro pose) |
| `intro` | idle f5 | #1 | (514, 15, 556, 98) |  | intro - REUSED Idle (no intro pose) |
| `win` | idle f1 | #2 | (272, 16, 311, 94) |  | win - REUSED Idle (no win pose) |
| `win` | idle f2 | #7 | (330, 20, 371, 92) |  | win - REUSED Idle (no win pose) |
| `win` | idle f3 | #5 | (392, 18, 436, 95) |  | win - REUSED Idle (no win pose) |
| `win` | idle f4 | #3 | (450, 17, 499, 95) |  | win - REUSED Idle (no win pose) |
| `win` | idle f5 | #1 | (514, 15, 556, 98) |  | win - REUSED Idle (no win pose) |
| `lose` | lose f1 | #22 | (10, 126, 54, 214) |  | lose_pose - grey curled pose |
| `timeout` | lose f2 | #21 | (75, 125, 119, 212) |  | Omnitrix TIMEOUT revert - green curled silhouette |
| `taunt` | attack f1 | #38 | (10, 237, 97, 319) |  | taunt - REUSED Attack pose (no taunt pose) |
| `grab` | attack f1 | #38 | (10, 237, 97, 319) |  | grab - Attack pose (POSSESS reach) |
| `gfPhase` | transform f1 | #4 | (17, 18, 74, 101) |  | PHASE toggle flash - green Transform silhouette (8f transition) |
| `gfFly` | fly f1 | #16 | (266, 120, 317, 199) |  | flight - Fly loop |
| `gfFly` | fly f2 | #19 | (326, 122, 377, 194) |  | flight - Fly loop |
| `gfFly` | fly f3 | #17 | (384, 120, 439, 197) |  | flight - Fly loop |
| `gfFly` | fly f4 | #20 | (439, 123, 499, 201) |  | flight - Fly loop |
| `gfFly` | fly f5 | #18 | (518, 120, 571, 202) |  | flight - Fly loop |
| `gfGale` | attack f1 | #38 | (10, 237, 97, 319) |  | SPECTRAL GALE - Attack pose (extracted swirl FX is the projectile) |
| `gfWail` | attack f1 | #38 | (10, 237, 97, 319) |  | WAIL - Attack pose + procedural pixel rings |
| `gfPossess` | attack f1 | #38 | (10, 237, 97, 319) |  | POSSESS - Attack reach -> green silhouette (dissolve in) |
| `gfPossess` | transform f1 | #4 | (17, 18, 74, 101) |  | POSSESS - Attack reach -> green silhouette (dissolve in) |
| `gfBurst` | fly f1 | #16 | (266, 120, 317, 199) |  | POSSESS burst-out - Fly f1 + procedural pixel burst |
| `gfRise` | fly f1 | #16 | (266, 120, 317, 199) |  | PHANTOM RISE - Fly loop + spiralling gale |
| `gfRise` | fly f2 | #19 | (326, 122, 377, 194) |  | PHANTOM RISE - Fly loop + spiralling gale |
| `gfRise` | fly f3 | #17 | (384, 120, 439, 197) |  | PHANTOM RISE - Fly loop + spiralling gale |
| `gfRise` | fly f4 | #20 | (439, 123, 499, 201) |  | PHANTOM RISE - Fly loop + spiralling gale |
| `gfRise` | fly f5 | #18 | (518, 120, 571, 202) |  | PHANTOM RISE - Fly loop + spiralling gale |
| `gfCold` | attack f1 | #38 | (10, 237, 97, 319) |  | COLD TOUCH (air) - Attack pose + downward gale |
| `gfUltDissolve` | transform f2 | #6 | (98, 19, 151, 101) |  | FEAR FEAST dissolve - grey body -> green silhouette |
| `gfUltDissolve` | transform f1 | #4 | (17, 18, 74, 101) |  | FEAR FEAST dissolve - grey body -> green silhouette |
| `gfUltStorm` | fly f1 | #16 | (266, 120, 317, 199) |  | FEAR FEAST spectral storm - Fly loop |
| `gfUltStorm` | fly f2 | #19 | (326, 122, 377, 194) |  | FEAR FEAST spectral storm - Fly loop |
| `gfUltStorm` | fly f3 | #17 | (384, 120, 439, 197) |  | FEAR FEAST spectral storm - Fly loop |
| `gfUltStorm` | fly f4 | #20 | (439, 123, 499, 201) |  | FEAR FEAST spectral storm - Fly loop |
| `gfUltStorm` | fly f5 | #18 | (518, 120, 571, 202) |  | FEAR FEAST spectral storm - Fly loop |
| `gfUltScream` | attack f1 | #38 | (10, 237, 97, 319) |  | FEAR FEAST final scream - Attack pose + enlarged procedural Wail rings |

Inventory check: Transform 2 per set ✓ · Idle 5 per set ✓ · Fly 5 per set ✓ · Lose/Time over 2 per set ✓ · Attack 1
body pose per set ✓ — but **6** wind FX per set (2 wind arrows + 4 swirl frames), not ~8.

Missing poses, reused (per animation, also in the Role column): walk / run / dash / roll → Fly; crouch, block and
block-hit → Idle f1; light hit and knockdown → grey Lose (hit_react_heavy fallback); get-up → grey Lose → Idle f1; win /
intro / dizzy → Idle; taunt → Attack. Render dy: LOW draws the Attack pose 12 px lower and LAUNCHER draws Fly f1 10 px
higher ("tilt") — offsets baked into the cell, no rotation, no resampling.

## FX (free-floating wind pieces)

Pieces within 4 px merge (dilate 2 + 2). Each swirl is a ring of arcs drawn more than 4 px apart, so one FX FRAME = one
column cluster of the sheet (gap ≥ 10 px), the union of its pieces at their original relative positions.

| FX frame | Source bbox | Pieces (4 px) | Components | Use |
|---|---|---|---|---|
| top 1 | (110, 251, 146, 298) | 1 | 3 | wind arrow (small) → `windArrowS` |
| top 2 | (172, 241, 233, 296) | 1 | 8 | wind arrow (large) → `windArrowL` |
| top 3 | (254, 238, 317, 309) | 4 | 10 | swirl 1 → `gale` f1 |
| top 4 | (337, 234, 405, 308) | 4 | 15 | swirl 2 → `gale` f2 |
| top 5 | (429, 235, 498, 312) | 5 | 15 | swirl 3 → `gale` f3 |
| top 6 | (519, 235, 587, 308) | 8 | 15 | swirl 4 (dissipating) → `gale` f4 |
| bottom 1 | (155, 579, 223, 652) | 8 | 15 | unused duplicate (exact mirror of top 6) |
| bottom 2 | (243, 577, 312, 654) | 5 | 15 | unused duplicate (exact mirror of top 5) |
| bottom 3 | (331, 577, 399, 651) | 4 | 15 | unused duplicate (exact mirror of top 4) |
| bottom 4 | (417, 582, 480, 653) | 4 | 10 | unused duplicate (exact mirror of top 3) |
| bottom 5 | (499, 585, 560, 640) | 1 | 8 | unused duplicate (exact mirror of top 2) |
| bottom 6 | (583, 594, 619, 641) | 1 | 3 | unused duplicate (exact mirror of top 1) |

Extracted vs procedural: the wind arrows (Jab / Heavy swipe), the 4-frame swirl (Spectral Gale projectile loop, Fear
Feast storm, integer-scaled) and the three badges are **extracted**. Everything else is **procedural pixel-style** and
drawn render-only: short / extended wind swipes on the normals, the Wail and Fear Feast scream rings, the upward /
downward gales of Launcher, Phantom Rise and Cold Touch, the Possess shaking overlay + ectoplasm burst, the Terror pale
tint, the Fear Feast stage darkening. His attacks all share the one Attack body pose; they are told apart by these
shapes, their timing and their hitboxes.

## HUD icons (round badges)

| Icon | Component | Meaning (owner's interpretation of unlabeled icons) |
|---|---|---|
| `ben10_ghostfreak_icon_tangible.png` | #219 (green) | Tangible |
| `ben10_ghostfreak_icon_intangible.png` | #220 (grey) | Intangible |
| `ben10_ghostfreak_icon_lockout.png` | #221 (red) | Materialize lockout / overuse (Phase cooldown) |

Drawn by Ghostfreak's own `drawHud` hook under the Omnitrix Power bar (no engine edit).
