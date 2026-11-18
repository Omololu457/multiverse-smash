# Diamondhead (Petrosapien, Omniverse style) — sprite ledger

**Sprites by Dragonrod, recolor by Arksalazar.** (Sheet credit text: "Sprites made by Dragonrod. Recolor made by
Arksalazar. Give credits if used.")

## Source

- `assets/sprites/ben10/aliens/diamondhead.png` (583×773) — the owner's untracked
  `diamondhead_omniverse_style_sprite_sheet_by_arksalazarx31_da8cjah-375w-2x.jpg` (md5 2bc454253afe7a379e96f53d9afe2da4),
  found by contact sheet (mint crystal alien, black suit + green shirt, solid blue background, labels STAND / RUN /
  ATTACK 1–3 / SHOOT DIAMOND PROYECTILES / CROUCH / JUMP / FALL / ALT PAL). Decoded once, stored as a lossless PNG.
- Slicer: `tools/ben10/slice_diamondhead.py` (deterministic; re-running is byte-identical).

## Key, palette, collisions — DEVIATION from the zero-tolerance rule

- The only copy is a **resampled JPEG** ("375w-2x" preview). The background is (0,80,255) (not #0000FF) at all four
  corners, but JPEG noise spreads it over ~66k colours, so an exact, zero-tolerance key is impossible.
- Key = Euclidean RGB distance to (0,80,255) **< 90** (the histogram valley: background 0–60, art 120+).
- 3052 edge pixels that survive the key but are still blue-dominant (B − max(R,G) > 50 — nothing in
  his palette is) are JPEG fringe; they are snapped to his dark outline colour (17,21,21).
- Collision check: nearest dark-suit pixel is **188.0** from the key; mint skin 200+, shirt
  green / belt white far. No collision. The art itself is soft (resampled) — a lossless original would slice cleaner;
  the slicer runs unchanged on one (same layout).

## Excluded (not art)

- Every text label + the title (31 components incl. title [2, 7, 8, 9, 10, 11] and the
  credit text [68, 69, 70, 74, 75, 76]).
- The large promo illustration (#62, bottom right) — **excluded**: the alien-select / HUD has no
  per-alien portrait slot without an engine edit, so it is not used as a portrait either.
- The ALT PAL figure (#33) — never an animation frame. Its colours are sampled FIRST for PRISMATIC:
  white (243, 244, 242) (trousers), dark (17, 21, 21) (shirt / boots), mint (152, 221, 200) (crystal).
  Note: the alt pal is Ben 10,000's suit — black shirt + **white trousers**, black boots (not a blue suit).
- JPEG specks (< 4 px): [19, 32, 52, 53, 54].

## Body groups (8-connected components, left → right)

| row | components |
|---|---|
| stand | #4, #3, #5, #6 |
| run | #13, #16, #15, #18, #17, #14 |
| atk1 | #22, #23, #25, #26, #24 |
| shoot | #39, #37, #38 |
| atk2 | #48, #50, #47, #46 |
| atk3 | #58, #60, #61 |
| jfc | #67, #66, #65 |

Real frames vs the brief's inventory: ATTACK 1 has **5** frames (not ~6): f1 wind-up, f2 punch, f3 lance extending,
f4 full lance, f5 recover. ATTACK 2 has 4 bodies + **4** spikes (not 6); ATTACK 3 has 3 bodies + **3** spikes (the
tallest is a double spike). JUMP / FALL / CROUCH 1 each; STAND 4; RUN 6; SHOOT 3 + 3 slivers.

## Anchor / cell

Feet baseline (bottom row) + body centre = the centroid of the frame's bottom 40 % (legs / boots — never the lance,
blade or raised arm). Cell 146×80, body centre x=73 (= the cell centre: the engine
centres the cell on the fighter), feet y=76. Frames copied 1:1, nearest-neighbour, never cropped (asserted).
On-screen: Ben spriteScale 2.0 × actionScale 1.5 (native ×3).

## Reused frames (missing poses)

walk = RUN slowed (no walk art); walk_back = RUN reversed + slowed; dash = RUN f2–3; doubleJump = JUMP; guard / block
hit / lose / Harden = CROUCH; hit light / heavy / air hit / knockdown / AIR attack / Diamond Dive = FALL; get-up =
CROUCH → STAND; dizzy = STAND f1–2; transform / win = STAND; taunt = ATTACK 3 f1; grab = JAB; Shatter Burst = ATTACK 2 f4.

## Effects

| extracted FX strip | components | frames |
|---|---|---|
| `shard` | #41, #40, #42 | 3 |
| `spike2` | #55, #51, #49, #43 | 4 |
| `spike3` | #64, #63, #59 | 3 |

- `shard` — the 3 free-floating slivers by SHOOT: the SHARD SHOT projectile (and refracted shards).
- `spike2` — ATTACK 2's growing spikes (small → tall): SPIKE ERUPTION growth.
- `spike3` — ATTACK 3's taller growth (the last is a double spike): PRISM WALL rise, ultimate Spire Storm (scaled /
  mirrored).

Procedural pixel-style (no sheet art; render only, never GAME_STATE): Prism Wall facets / pane, crystal prison
(ultimate), refraction beams, glints, Harden crystal sheen, Shard pips over the opponent, shatter rings, Diamond Dive /
Air blade trail, landing shard pop.

PRISMATIC frame set (`ben10_diamondhead_prism_*`, `DIAMONDHEAD_PRISM_ANIM`): every frame recoloured to the sampled
alt-pal colours — shirt green (torso band only) → the alt dark, the dark trouser interior between belt and boots → the
alt white, outlines / boots stay dark, crystal keeps its mint. An approximation per frame (in leaning poses a little of
the shirt can stay green); render only — the PRISMATIC flag itself lives in GAME_STATE.

## Frame table (every frame → animation → move)

| anim | source | component | src bbox | offset in cell | role / move |
|---|---|---|---|---|---|
| `idle` | stand f1 | #4 | [25, 33, 64, 96] | [54, 13] | idle (STAND loop) |
| `idle` | stand f2 | #3 | [80, 32, 121, 96] | [53, 12] | idle (STAND loop) |
| `idle` | stand f3 | #5 | [136, 33, 175, 96] | [54, 13] | idle (STAND loop) |
| `idle` | stand f4 | #6 | [192, 35, 229, 96] | [55, 15] | idle (STAND loop) |
| `walk` | run f1 | #13 | [22, 134, 74, 192] | [56, 18] | walk - the RUN cycle SLOWED (no walk art) |
| `walk` | run f2 | #16 | [88, 136, 143, 192] | [50, 20] | walk - the RUN cycle SLOWED (no walk art) |
| `walk` | run f3 | #15 | [161, 135, 194, 192] | [58, 19] | walk - the RUN cycle SLOWED (no walk art) |
| `walk` | run f4 | #18 | [217, 139, 267, 192] | [54, 23] | walk - the RUN cycle SLOWED (no walk art) |
| `walk` | run f5 | #17 | [283, 138, 340, 192] | [51, 22] | walk - the RUN cycle SLOWED (no walk art) |
| `walk` | run f6 | #14 | [356, 134, 389, 192] | [59, 18] | walk - the RUN cycle SLOWED (no walk art) |
| `walk_back` | run f6 | #14 | [356, 134, 389, 192] | [59, 18] | walk back - RUN REVERSED, slowed |
| `walk_back` | run f5 | #17 | [283, 138, 340, 192] | [51, 22] | walk back - RUN REVERSED, slowed |
| `walk_back` | run f4 | #18 | [217, 139, 267, 192] | [54, 23] | walk back - RUN REVERSED, slowed |
| `walk_back` | run f3 | #15 | [161, 135, 194, 192] | [58, 19] | walk back - RUN REVERSED, slowed |
| `walk_back` | run f2 | #16 | [88, 136, 143, 192] | [50, 20] | walk back - RUN REVERSED, slowed |
| `walk_back` | run f1 | #13 | [22, 134, 74, 192] | [56, 18] | walk back - RUN REVERSED, slowed |
| `run` | run f1 | #13 | [22, 134, 74, 192] | [56, 18] | run (RUN) |
| `run` | run f2 | #16 | [88, 136, 143, 192] | [50, 20] | run (RUN) |
| `run` | run f3 | #15 | [161, 135, 194, 192] | [58, 19] | run (RUN) |
| `run` | run f4 | #18 | [217, 139, 267, 192] | [54, 23] | run (RUN) |
| `run` | run f5 | #17 | [283, 138, 340, 192] | [51, 22] | run (RUN) |
| `run` | run f6 | #14 | [356, 134, 389, 192] | [59, 18] | run (RUN) |
| `dash` | run f2 | #16 | [88, 136, 143, 192] | [50, 20] | dash (RUN f2-3, fast) |
| `dash` | run f3 | #15 | [161, 135, 194, 192] | [58, 19] | dash (RUN f2-3, fast) |
| `jump` | jfc f2 | #66 | [99, 636, 157, 704] | [52, 8] | jump rise (JUMP) |
| `doubleJump` | jfc f2 | #66 | [99, 636, 157, 704] | [52, 8] | double jump - REUSED JUMP |
| `fall` | jfc f3 | #65 | [188, 633, 228, 704] | [53, 5] | jump fall (FALL) |
| `crouch` | jfc f1 | #67 | [32, 669, 64, 704] | [55, 41] | crouch (CROUCH) |
| `guard` | jfc f1 | #67 | [32, 669, 64, 704] | [55, 41] | block - REUSED CROUCH |
| `blockHit` | jfc f1 | #67 | [32, 669, 64, 704] | [55, 41] | block hit - REUSED CROUCH |
| `light` | atk1 f1 | #22 | [24, 227, 70, 296] | [54, 7] | JAB (ATTACK 1 f1-2) |
| `light` | atk1 f2 | #23 | [88, 234, 132, 296] | [60, 14] | JAB (ATTACK 1 f1-2) |
| `heavy` | atk1 f3 | #25 | [144, 246, 228, 296] | [49, 26] | HEAVY (ATTACK 1 f3-5: the arm extends into a crystal lance, 190 px) |
| `heavy` | atk1 f4 | #26 | [232, 246, 327, 296] | [49, 26] | HEAVY (ATTACK 1 f3-5: the arm extends into a crystal lance, 190 px) |
| `heavy` | atk1 f5 | #24 | [336, 242, 396, 296] | [44, 22] | HEAVY (ATTACK 1 f3-5: the arm extends into a crystal lance, 190 px) |
| `down` | atk2 f1 | #48 | [24, 447, 86, 512] | [42, 11] | LOW (ATTACK 2 f1-2 blade sweep, hits low) |
| `down` | atk2 f2 | #50 | [104, 450, 162, 512] | [43, 14] | LOW (ATTACK 2 f1-2 blade sweep, hits low) |
| `up` | atk2 f3 | #47 | [184, 442, 234, 512] | [56, 6] | LAUNCHER (ATTACK 2 f3-4 rising blade swipe) |
| `up` | atk2 f4 | #46 | [261, 438, 299, 512] | [56, 2] | LAUNCHER (ATTACK 2 f3-4 rising blade swipe) |
| `air` | jfc f3 | #65 | [188, 633, 228, 704] | [53, 5] | AIR (FALL frame + procedural blade) |
| `hurt` | jfc f3 | #65 | [188, 633, 228, 704] | [53, 5] | hit light/heavy - REUSED FALL (no hurt pose) |
| `hurt_air` | jfc f3 | #65 | [188, 633, 228, 704] | [53, 5] | hit in the air - REUSED FALL |
| `knockdown` | jfc f3 | #65 | [188, 633, 228, 704] | [53, 5] | knockdown - REUSED FALL (no knockdown pose) |
| `getup` | jfc f1 | #67 | [32, 669, 64, 704] | [55, 41] | get-up - REUSED CROUCH -> STAND |
| `getup` | stand f1 | #4 | [25, 33, 64, 96] | [54, 13] | get-up - REUSED CROUCH -> STAND |
| `dizzy` | stand f1 | #4 | [25, 33, 64, 96] | [54, 13] | dizzy - REUSED STAND f1-2 (no dizzy pose) |
| `dizzy` | stand f2 | #3 | [80, 32, 121, 96] | [53, 12] | dizzy - REUSED STAND f1-2 (no dizzy pose) |
| `transform` | stand f1 | #4 | [25, 33, 64, 96] | [54, 13] | transform-in - REUSED STAND |
| `transform` | stand f2 | #3 | [80, 32, 121, 96] | [53, 12] | transform-in - REUSED STAND |
| `transform` | stand f3 | #5 | [136, 33, 175, 96] | [54, 13] | transform-in - REUSED STAND |
| `transform` | stand f4 | #6 | [192, 35, 229, 96] | [55, 15] | transform-in - REUSED STAND |
| `taunt` | atk3 f1 | #58 | [32, 547, 77, 616] | [55, 7] | taunt - REUSED ATTACK 3 f1 (arm raised) |
| `win` | stand f1 | #4 | [25, 33, 64, 96] | [54, 13] | win - REUSED STAND (no win pose) |
| `win` | stand f2 | #3 | [80, 32, 121, 96] | [53, 12] | win - REUSED STAND (no win pose) |
| `win` | stand f3 | #5 | [136, 33, 175, 96] | [54, 13] | win - REUSED STAND (no win pose) |
| `win` | stand f4 | #6 | [192, 35, 229, 96] | [55, 15] | win - REUSED STAND (no win pose) |
| `lose` | jfc f1 | #67 | [32, 669, 64, 704] | [55, 41] | lose - REUSED CROUCH (no lose pose) |
| `grab` | atk1 f1 | #22 | [24, 227, 70, 296] | [54, 7] | grab - REUSED JAB |
| `grab` | atk1 f2 | #23 | [88, 234, 132, 296] | [60, 14] | grab - REUSED JAB |
| `dhShoot` | shoot f1 | #39 | [24, 342, 65, 400] | [54, 18] | SHARD SHOT cast (SHOOT f1-3) |
| `dhShoot` | shoot f2 | #37 | [88, 340, 138, 400] | [53, 16] | SHARD SHOT cast (SHOOT f1-3) |
| `dhShoot` | shoot f3 | #38 | [160, 341, 232, 400] | [51, 17] | SHARD SHOT cast (SHOOT f1-3) |
| `dhLance` | atk1 f3 | #25 | [144, 246, 228, 296] | [49, 26] | CRYSTAL LANCE (ATTACK 1 f3 extend, f4 full lance held, f5 recover) + ult opener |
| `dhLance` | atk1 f4 | #26 | [232, 246, 327, 296] | [49, 26] | CRYSTAL LANCE (ATTACK 1 f3 extend, f4 full lance held, f5 recover) + ult opener |
| `dhLance` | atk1 f4 | #26 | [232, 246, 327, 296] | [49, 26] | CRYSTAL LANCE (ATTACK 1 f3 extend, f4 full lance held, f5 recover) + ult opener |
| `dhLance` | atk1 f5 | #24 | [336, 242, 396, 296] | [44, 22] | CRYSTAL LANCE (ATTACK 1 f3 extend, f4 full lance held, f5 recover) + ult opener |
| `dhGround` | atk3 f1 | #58 | [32, 547, 77, 616] | [55, 7] | PRISM WALL / SPIKE ERUPTION cast (ATTACK 3 f1-3: arm raised -> hand to ground) |
| `dhGround` | atk3 f2 | #60 | [96, 567, 143, 616] | [50, 27] | PRISM WALL / SPIKE ERUPTION cast (ATTACK 3 f1-3: arm raised -> hand to ground) |
| `dhGround` | atk3 f3 | #61 | [160, 567, 205, 616] | [48, 27] | PRISM WALL / SPIKE ERUPTION cast (ATTACK 3 f1-3: arm raised -> hand to ground) |
| `dhHarden` | jfc f1 | #67 | [32, 669, 64, 704] | [55, 41] | HARDEN - holds the CROUCH frame (+ procedural crystal sheen) |
| `dhDive` | jfc f3 | #65 | [188, 633, 228, 704] | [53, 5] | DIAMOND DIVE - FALL frame (+ procedural blade) |
| `dhBurst` | atk2 f4 | #46 | [261, 438, 299, 512] | [56, 2] | SHATTER BURST - ATTACK 2 f4 (blade raised) |

## Verification (Phase 7, 2026-11-17)

- `harness/ben10_diamondhead.test.mjs` 27/0 (3 consecutive runs) · `harness/ben10_diamondhead_render.mjs` 43/0 · `harness/diamondhead_framedata_diff.mjs` 22/0 (base `caeb831db`).
- Battery vs main's baseline (recorded before any edit): determinism 14/0, combo-standard **233/9 = 233/9**, roster integrity ✓, every Ben 10 harness count identical (pre-existing stage2/3/4/6/7, start_human, integration, loadout and Alien X failures are unchanged and not caused by this build).
- Slot: PICK FIVE — Diamondhead is picked on the alien-select screen; transform = ↓↓ + the button of the slot he occupies (J/K/L/O/P). No Dial built (an alien select already exists); no slot count change. Registry key `diamondhead_ov`; the experimental `diamondhead` is unchanged.
- No new engine hooks.
