# Wildmutt (Vulpimancer) — SPRITE LEDGER

READY Omnitrix alien, registry / pool key **`wildmutt_ov`** (display "Wildmutt"). The experimental `wildmutt` (its own legacy kit, art and harnesses) is untouched.

## Source

- Sheet: `assets/sprites/ben10/aliens/wildmutt.png` (1280×1018) = a lossless PNG decode of the repo's `wildmutt___sprites_sheet_by_ipmugenofficial_djimf88-fullview.jpeg` (md5 8141b2c94cb1322a4f5826cfda279f98). Sprites by **ipmugenofficial** (DeviantArt), per the file name.
- The owner chose this ORANGE sheet on 2026-11-17: the tan/brown sheet the brief describes (rows Punch / Punch Up / Punch Back / Tackle / Ground Strike / Crush / Push / Roar) is not in the project. Its rows are **STAND 9 · RUN 12 · CROUCH/JUMP 8 · ROAR/BITE 7 · GROUND ATTACK 5 · SENSITIVITY/ROLL 10 · DIG THE GROUND 8+8 · HIT/DEATH 5 = 72 frames** (counted from the real components; the brief's inventory does not apply). Every move is mapped onto these real frames below.
- Slicer: `tools/ben10/slice_wildmutt.py` (deterministic, byte-identical re-runs). Contact sheet: `contact_sheet.png` (every strip ×2, cell borders, red = body centre, green = feet). Row previews: `preview_<row>.gif` (each labeled row played as an animation).

## Key, labels, anchoring

- Background (0,181,246) at all four corners (asserted). **Deviation from the zero-tolerance key:** the only copy is a resampled JPEG — 1,059,938 pixels are the exact key but the noise spreads the background over ~70k colours, so an exact key would leave a blue haze around every frame. Key = RGB distance < 80 (the histogram valley; art starts at 80+).
- Nothing is eroded. Kept edge pixels that are bluer than red (B > R — the cyan/teal JPEG rim; every colour of his own has R > B) are snapped to his sampled outline colour (83, 47, 10): **20,862 pixels**. Near-key leftovers after that: **0**. The roll-ball frames (SENSITIVITY/ROLL f7–10) carried the widest rim; they are clean now.
- **Excluded (not art): 76 label components** — every white section label (anti-aliased glyphs, ≤ 16 px tall, in the left label column; asserted). Confirmed on the contact sheet: no text in any strip.
- 8-connected components; all 72 body frames ≥ 200 px, grouped by row and sorted left → right (asserted 9/12/8/7/5/10/8/8/5). Anchor: feet = the frame's bottom row on one baseline (feetY 85), body centre = the centroid of the bottom 40 % (paws / legs — never the head, a kicked leg or the curled roll). Hunched, lying and rolled frames keep the same baseline. Cell 138×87, nearest-neighbour, never cropped (asserted).
- On screen: Ben spriteScale 2.0 × actionScale 1.0 (stand ≈ 100 px, about his hurtbox).
- FRENZY frame set (`ben10_wildmutt_ov_frenzy_*`): the same frames washed 42 % toward red (232,36,24) — a render-only `_skinAnim` swap.

## Every frame → animation → move

| Sheet row | Frame | Animations (moves) |
|---|---|---|
| STAND | f1 | idle, getup |
| STAND | f2 | idle |
| STAND | f3 | idle |
| STAND | f4 | idle |
| STAND | f5 | idle |
| STAND | f6 | idle |
| STAND | f7 | idle |
| STAND | f8 | idle |
| STAND | f9 | idle |
| RUN | f1 | walk, walk_back, run |
| RUN | f2 | walk, walk_back, run |
| RUN | f3 | walk, walk_back, run, wmPounce |
| RUN | f4 | run, dash, wmPounce |
| RUN | f5 | run, dash, air, wmPounce |
| RUN | f6 | run, dash, wmPounce |
| RUN | f7 | run, dash, wmPounce |
| RUN | f8 | run, wmPounce |
| RUN | f9 | walk, walk_back, run |
| RUN | f10 | walk, walk_back, run |
| RUN | f11 | walk, walk_back, run |
| RUN | f12 | walk, walk_back, run |
| CROUCH/JUMP | f1 | crouch |
| CROUCH/JUMP | f2 | crouch |
| CROUCH/JUMP | f3 | jump |
| CROUCH/JUMP | f4 | jump, doubleJump |
| CROUCH/JUMP | f5 | doubleJump, fall |
| CROUCH/JUMP | f6 | wmDive |
| CROUCH/JUMP | f7 | wmDive |
| CROUCH/JUMP | f8 | wmDive |
| ROAR/BITE | f1 | win, wmRoar |
| ROAR/BITE | f2 | win, wmRoar |
| ROAR/BITE | f3 | win, wmRoar |
| ROAR/BITE | f4 | win, wmRoar |
| ROAR/BITE | f5 | win, wmRoar |
| ROAR/BITE | f6 | light, grab, wmMaul |
| ROAR/BITE | f7 | light, grab, wmMaul |
| GROUND ATTACK | f1 | heavy, up |
| GROUND ATTACK | f2 | heavy |
| GROUND ATTACK | f3 | up |
| GROUND ATTACK | f4 | heavy, wmMaul |
| GROUND ATTACK | f5 | wmGround |
| SENSITIVITY/ROLL | f1 | transform, taunt |
| SENSITIVITY/ROLL | f2 | transform, taunt |
| SENSITIVITY/ROLL | f3 | transform, taunt |
| SENSITIVITY/ROLL | f4 | transform, taunt |
| SENSITIVITY/ROLL | f5 | transform, taunt |
| SENSITIVITY/ROLL | f6 | wmRush |
| SENSITIVITY/ROLL | f7 | wmRush |
| SENSITIVITY/ROLL | f8 | wmRush |
| SENSITIVITY/ROLL | f9 | wmRush |
| SENSITIVITY/ROLL | f10 | wmRush |
| DIG THE GROUND (row 1) | f1 | guard |
| DIG THE GROUND (row 1) | f2 | blockHit |
| DIG THE GROUND (row 1) | f3 | down |
| DIG THE GROUND (row 1) | f4 | down |
| DIG THE GROUND (row 1) | f5 | wmGround |
| DIG THE GROUND (row 1) | f6 | wmGround |
| DIG THE GROUND (row 1) | f7 | wmGround |
| DIG THE GROUND (row 1) | f8 | wmGround |
| DIG THE GROUND (row 2) | f1 | getup |
| DIG THE GROUND (row 2) | f2 | wmMaul |
| DIG THE GROUND (row 2) | f3 | wmMaul |
| DIG THE GROUND (row 2) | f4 | wmMaul |
| DIG THE GROUND (row 2) | f5 | wmMaul |
| DIG THE GROUND (row 2) | f6 | dizzy |
| DIG THE GROUND (row 2) | f7 | dizzy |
| DIG THE GROUND (row 2) | f8 | dizzy |
| HIT/DEATH | f1 | hurt |
| HIT/DEATH | f2 | hurt_air |
| HIT/DEATH | f3 | knockdown |
| HIT/DEATH | f4 | knockdown, getup |
| HIT/DEATH | f5 | lose |

No frame is unused (asserted by the slicer).

## Animations

| Animation | Frames | Role |
|---|---|---|
| `idle` | STAND f1 STAND f2 STAND f3 STAND f4 STAND f5 STAND f6 STAND f7 STAND f8 STAND f9 | idle (STAND f1-9 loop) |
| `walk` | RUN f1 RUN f2 RUN f3 RUN f9 RUN f10 RUN f11 RUN f12 | walk - the RUN gallop frames (f1-3, f9-12), cycled SLOWER (no walk row) |
| `walk_back` | RUN f12 RUN f11 RUN f10 RUN f9 RUN f3 RUN f2 RUN f1 | walk back - the same gallop frames REVERSED, slowed |
| `run` | RUN f1 RUN f2 RUN f3 RUN f4 RUN f5 RUN f6 RUN f7 RUN f8 RUN f9 RUN f10 RUN f11 RUN f12 | run (RUN f1-12: gallop -> bound -> gallop) |
| `dash` | RUN f4 RUN f5 RUN f6 RUN f7 | dash (RUN f4-7, the stretched bound) |
| `jump` | CROUCH f3 CROUCH f4 | jump rise (CROUCH/JUMP f3-4) |
| `doubleJump` | CROUCH f4 CROUCH f5 | double jump - REUSED jump f4 -> f5 |
| `fall` | CROUCH f5 | jump fall (CROUCH/JUMP f5) |
| `crouch` | CROUCH f1 CROUCH f2 | crouch (CROUCH/JUMP f1-2) |
| `guard` | DIG f1 | block - DIG f1 (hunched, head tucked; no guard row) |
| `blockHit` | DIG f2 | block hit - DIG f2 (curled tighter) |
| `light` | ROAR f6 ROAR f7 | JAB - ROAR/BITE f6-7 (the bite lunge) |
| `heavy` | GROUND f1 GROUND f2 GROUND f4 | HEAVY - GROUND ATTACK f1 rear -> f2 lunge -> f4 full swipe (+ procedural claw arc, 170 px) |
| `down` | DIG f3 DIG f4 | LOW - DIG f3-4 (the low forward leg rake) |
| `up` | GROUND f1 GROUND f3 | LAUNCHER - GROUND ATTACK f1 -> f3 (the handstand kick up) |
| `air` | RUN f5 | AIR - RUN f5 (stretched, claws forward) + procedural claw swipe |
| `hurt` | HIT f1 | hit (HIT/DEATH f1) |
| `hurt_air` | HIT f2 | hit in the air / launched (HIT/DEATH f2) |
| `knockdown` | HIT f3 HIT f4 | knockdown (HIT/DEATH f3 tumble -> f4 lying) |
| `getup` | HIT f4 DIG f1 STAND f1 | get-up - REUSED HIT f4 -> DIG row 2 f1 (pushing up) -> STAND |
| `dizzy` | DIG f6 DIG f7 DIG f8 | dizzy - DIG row 2 f6-8 (head down, pawing; no dizzy row) |
| `transform` | SENSITIVITY f1 SENSITIVITY f2 SENSITIVITY f3 SENSITIVITY f4 SENSITIVITY f5 | transform-in - SENSITIVITY f1-5 (rising, sniffing) |
| `taunt` | SENSITIVITY f1 SENSITIVITY f2 SENSITIVITY f3 SENSITIVITY f4 SENSITIVITY f5 SENSITIVITY f4 SENSITIVITY f3 | taunt - SENSITIVITY f1-5 (the scent sniff) |
| `win` | ROAR f1 ROAR f2 ROAR f3 ROAR f4 ROAR f5 | win - REUSED ROAR f1-5 |
| `lose` | HIT f5 | lose - HIT/DEATH f5 (lying flat) |
| `grab` | ROAR f6 ROAR f7 | grab - REUSED the bite (ROAR/BITE f6-7) |
| `wmPounce` | RUN f3 RUN f4 RUN f5 RUN f6 RUN f7 RUN f8 | POUNCE / ult lunges - RUN f3-8 (crouch -> stretched leap -> land) |
| `wmGround` | DIG f5 DIG f6 DIG f7 DIG f8 GROUND f5 | GROUND POUND - DIG f5-8 (rears up, arches over) -> GROUND ATTACK f5 (the slam) |
| `wmMaul` | ROAR f6 ROAR f7 DIG f2 DIG f3 DIG f4 DIG f5 GROUND f4 | MAUL - bite (ROAR/BITE f6-7) -> pin and maul (DIG row 2 f2-5) -> toss (GROUND ATTACK f4) |
| `wmRoar` | ROAR f1 ROAR f2 ROAR f3 ROAR f4 ROAR f5 | ROAR - ROAR/BITE f1 inhale, f2-5 roar (+ procedural rings); ult Final Roar |
| `wmRush` | SENSITIVITY f6 SENSITIVITY f7 SENSITIVITY f8 SENSITIVITY f9 SENSITIVITY f10 | BULL RUSH - SENSITIVITY/ROLL f6 curl -> f7-10 roll loop |
| `wmDive` | CROUCH f6 CROUCH f7 CROUCH f8 | CLAW DIVE - CROUCH/JUMP f6-8 (spread, claws down-forward) |

Reused frames (no dedicated art on this sheet): walk / walk back = the RUN gallop frames cycled slower; guard / block hit = DIG f1–2; dizzy = DIG row 2 f6–8; get-up = HIT f4 → DIG row 2 f1 → STAND; win = ROAR; grab = the bite; air attack = RUN f5 + a procedural claw swipe; double jump = jump f4–5.

## Effects

- **Extracted: none.** This sheet has no separate effect art (no swipe arcs, dust or rings — the roll balls are body frames).
- **Procedural pixel art (render-only, in `wildmutt.js`):** claw streaks / swipe arcs (Heavy, Air, Pounce, the ult's Hunt slashes), roar rings (Roar, Final Roar), the scent trail on a scented opponent, dust (Pounce landing, Bull Rush, Ground Pound shockwave), the ground-pound shock line, the ult's stage darkening and silhouette passes.

## Credits

Sprites by ipmugenofficial (DeviantArt, "Wildmutt - sprites sheet"). Ben 10 © Cartoon Network.
