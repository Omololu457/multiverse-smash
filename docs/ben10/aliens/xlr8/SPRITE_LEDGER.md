# XLR8 — Sprite Ledger

**Sheet by Dragonrod** (author's request: "XLR8 sprite sheet made by Dragonrod — please, give credits if used!").

Source: `assets/sprites/ben10/aliens/xlr8.png` (367×469), sliced by `tools/ben10/slice_xlr8.py` → `ben10_xlr8_<anim>_uniform.png`, `ben10_xlr8_fx_*.png`, `xlr8Assets.js`. Contact sheet: `contact_sheet.png` (3×, red line = body mid-point anchor, green line = feet baseline). Raw grid: `source_grid.json`.

## Cut rules

- Background key = EXACT beige `(215, 208, 187)` (all 4 corners), zero tolerance; asserted no art pixel within 40 of it (his blue / black / white / green-visor palette never collides).
- 8-connected components. Removed: 50 text-label glyph components (pure black, < 60 px, all on the label rows) and 1 white credit box. Text is not art.
- Every component is assigned (asserted) — nothing dropped silently.
- Cell 112×56, feet baseline y=52 (= originY), body mid-point at x=56: horizontal anchor = centroid of the LOWER HALF of the silhouette (legs + torso), so the long tail and the head crest never drag him. Vertical anchor = bottom of the silhouette on the feet line.
- Nearest-neighbour only; frames copied 1:1, never cropped (asserted inside the cell — tails and claws intact). actionScale 1.5 × Ben spriteScale 2 = integer ×3 on screen (same scale as Heatblast).

## Inventory — real frames vs. the brief

| Label | Brief | Real | Components | Notes |
|---|---|---|---|---|
| stand | 4 | 4 | stand | idle loop |
| crouch | 1 | 1 | crouch | crouch / block / LOW start |
| run | 4 | 4 | run | walk (slowed) / run / dash |
| jump | 1 | 1 | jump | jump rise |
| fall | 1 | 1 | fall | jump fall, AIR body, hit / knockdown reuse |
| attack ↑ | 4 + 2 diagonal streak FX | 4 + **1** diagonal streak FX + **1 body frame** | up, dive, fx streakDiag | the 4 are a crouched CHARGE-UP (visor darkens to purple), not a rising slash; the 2nd diagonal is NOT a bar but XLR8 in a RISING diagonal pose |
| attack → | ~3 + 2 wide bars | 3 + 1 bar FX + **1 blur frame** | fwd, streakBar, blur | the last bar has XLR8 INSIDE it → body blur frame (Sonic Slash / Blur Step), not FX |
| attack ↓ | 5 | 5 | down | f3 is the tail-blade sweep (LOW / Tail Whip); f1-2 upright wind-up |
| attack | ~7 | **6** | attack | JAB f1-3, HEAVY f4-6 (f4 = long forward tail/claw strike) |

### Source components

| Group | Component ids (left → right) |
|---|---|
| stand | [13, 12, 14, 15] |
| crouch | [16] |
| run | [31, 32, 33, 34] |
| jump | [30] |
| fall | [29] |
| up | [44, 45, 46, 47] |
| dive | [43] |
| fwd | [55, 56, 57] |
| blur | [59] |
| down | [67, 68, 70, 71, 69] |
| attack | [78, 79, 80, 81, 82, 83] |
| fx streakDiag | [42] |
| fx streakBar | [58] |

## Frame → animation → move

| Animation | Frames (group fN → component) | Move / role |
|---|---|---|
| `idle` | stand f1→#13, stand f2→#12, stand f3→#14, stand f4→#15 | idle (stand loop) |
| `walk` | run f1→#31, run f2→#32, run f3→#33, run f4→#34 | walk (run cycle, slowed) |
| `run` | run f1→#31, run f2→#32, run f3→#33, run f4→#34 | run |
| `dash` | run f2→#32, run f3→#33 | dash (run) |
| `jump` | jump f1→#30 | jump rise |
| `fall` | fall f1→#29 | jump fall |
| `crouch` | crouch f1→#16 | crouch |
| `guard` | crouch f1→#16 | block - crouch frame |
| `light` | attack f1→#78, attack f2→#79, attack f3→#80 | JAB (attack f1-3) |
| `heavy` | attack f4→#81, attack f5→#82, attack f6→#83 | HEAVY claw slash (attack f4-6, 150 px) |
| `down` | crouch f1→#16, down f3→#70 | LOW (crouch -> attack v f3 tail sweep, hits low) |
| `up` | up f3→#46, up f4→#47, dive f1→#43 | LAUNCHER (attack ^ charge f3-4 -> rising diagonal slash) |
| `air` | fall f1→#29, attack f2→#79 | AIR (fall frame + claw) |
| `hurt` | fall f1→#29 | hit stun - REUSED fall (no hurt pose) |
| `knockdown` | fall f1→#29 | knockdown - REUSED fall (no knockdown pose) |
| `getup` | crouch f1→#16, stand f1→#13 | get-up - REUSED crouch -> stand (no get-up pose) |
| `dizzy` | stand f1→#13, stand f2→#12 | dizzy - REUSED stand (no dizzy pose) |
| `roll` | run f1→#31, run f2→#32, run f3→#33, run f4→#34 | roll - REUSED run cycle |
| `transform` | stand f1→#13, stand f2→#12, stand f3→#14, stand f4→#15 | transform-in - REUSED stand |
| `intro` | stand f1→#13, stand f2→#12, stand f3→#14, stand f4→#15 | intro - REUSED stand |
| `win` | stand f1→#13, stand f2→#12, stand f3→#14, stand f4→#15 | win - REUSED stand (no win pose) |
| `lose` | crouch f1→#16 | lose - REUSED crouch (no lose pose) |
| `taunt` | up f1→#44, up f2→#45 | taunt - REUSED attack ^ f1-2 |
| `grab` | attack f1→#78, attack f2→#79 | grab - REUSED jab |
| `xlSonicSlash` | fwd f1→#55, fwd f2→#56, fwd f3→#57, blur f1→#59 | SONIC SLASH dash slash (attack ->) + blur frame |
| `xlBlurOut` | fwd f3→#57, blur f1→#59 | BLUR STEP vanish (attack -> f3 + blur) |
| `xlBlurIn` | blur f1→#59, fwd f1→#55 | BLUR STEP reappear (blur + attack -> f1) |
| `xlTailWhip` | down f1→#67, down f2→#68, down f3→#70, down f4→#71, down f5→#69 | TAIL WHIP spinning low tail sweep (attack v) |
| `xlCyclone` | up f1→#44, up f2→#45, run f1→#31, run f2→#32, run f3→#33, run f4→#34 | MACH CYCLONE tight circle (attack ^ charge + run; afterimages render-only) |
| `xlDive` | dive f1→#43 | SONIC DIVE - REUSED attack ^ diagonal pose (sheet has no downward dive) |
| `xlUltCircle` | run f1→#31, run f2→#32, run f3→#33, run f4→#34 | TIME SPRINT circling slashes (run) |
| `xlUltLaunch` | up f1→#44, up f2→#45, up f3→#46, up f4→#47, dive f1→#43 | TIME SPRINT launch (attack ^ charge -> rising diagonal) |
| `xlUltDrop` | down f1→#67, down f2→#68, down f3→#70, down f4→#71, down f5→#69 | TIME SPRINT sonic-boom drop (attack v) |

## Missing poses (reused, never invented)

- **hurt** — fall frame (no hit-stun pose)
- **knockdown** — fall frame (no knockdown pose)
- **getup** — crouch → stand f1 (no get-up pose)
- **dizzy** — stand f1-2 (no dizzy pose)
- **win** — stand loop (no win pose)
- **lose** — crouch (no lose pose)
- **roll** — run cycle
- **transform / intro** — stand loop
- **taunt** — attack ↑ f1-2
- **grab** — jab f1-2
- **xlDive (Sonic Dive)** — attack ↑ rising diagonal pose — the sheet has no downward dive; the sim moves him down-forward, the art stays the diagonal

## FX

- `ben10_xlr8_fx_streakDiag.png` — attack ↑ diagonal blue/black speed bar (no body): Sonic Dive / Time Sprint launch streak.
- `ben10_xlr8_fx_streakBar.png` — attack → wide speed bar (no body): Sonic Slash / Blur Step streak.

## Procedural / render-only (no art on the sheet; never in GAME_STATE)

- Speed lines and run afterimages (Mach Cyclone, Time Sprint circling, Flash Time trail): copies of his own frames drawn translucent behind him.
- ECHO HIT ghost: a translucent afterimage at the target drawn when an echo fires (the scheduled echo itself IS GAME_STATE).
- Flash Time / Time Sprint grey-world: desaturation wash drawn UNDER both fighters (both stay in colour).
- Mach Cyclone whirlwind and the Time Sprint sonic-boom shock ring: procedural pixel rings.
