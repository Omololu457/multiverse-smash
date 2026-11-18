# FEEDBACK (Conductoid) — sprite ledger

Sheet source: unknown, add credit if known. (The file name `feedback_by_dragonrod342_db1hz1k.png` suggests the DeviantArt
artist Dragonrod342 — the same artist credited on the Upgrade / Diamondhead sheets — but the sheet itself carries no credit,
so it is not asserted here.)

- Source: `assets/sprites/ben10/aliens/feedback.png` (900x742), a byte copy of the tracked root `feedback_by_dragonrod342_db1hz1k.png`
  (md5 `384af8e20377abdf24fc556afbfcebae`); found by contact sheet (black humanoid, yellow visor, antennae / plugs, tail, blue
  plasma orbs, white background, red ground lines, a loose parts bin on the right).
- Slicer: `tools/ben10/slice_feedback.py` (deterministic, re-run is byte-identical). Output: `ben10_feedback_ready_*_uniform.png`
  (33 animations, cell 94x92, feet y 90, centre x 47, actionScale 1.25),
  `ben10_feedback_ready_fx_*.png`, `feedbackAssets.js`, `docs/ben10/aliens/feedback/{contact_sheet.png, preview_*.gif, source_grid.json}`.
- Key `feedback_ov` (the experimental `feedback` entry and its legacy art table are untouched).

## Background / guides
- Background = exact white (255,255,255), zero tolerance, keyed ONLY where connected to the sheet edge (flood fill).
  **4893 enclosed white pixels are kept**: they are his white body panels (back hump, chest), visor glints and
  the white cores of the electric bursts / dash streak (verified on a magenta-tinted debug render).
- Palette collision check: his palette is black (0,0,0) / dark greys (23-40) / visor yellow-green (181,230,29) / plug brown
  (191,143,38) / blues (0,162,232), (70,200,255), (153,217,234) / pale blues (206,240,255), (235-250,249-253,254-255) / light grey
  (224,224,224). Nothing but the background is exact (255,255,255) *and* edge-connected: near-whites (250,253,254) and
  (245,252,255) and pure white panels inside outlines survive. **No collisions.**
- EXCLUDED (not art): red ground / guide lines (237,28,36) — 2115 px, including the two red guide lines
  around the 6-strip rows; grey "x 5" text (195,195,195) — 56 px; magenta (255,0,255) marks —
  96 px. The magenta marks were checked on a zoom: they are **registration crosshairs**
  (a tick above, below, left and right of every orb), not sparks. They are used to centre each orb frame, then dropped.

## Rows (verified on the contact sheet; real frames win over the brief's inventory)
| Row | Frames | Use |
|---|---|---|
| 1 | 4 | idle loop |
| 2 | 6 | run; walk = run SLOWED; walk_back = run REVERSED (no walk art) |
| 3 | 3 | f1 narrow stand = guard / block hit; f2 jump with tail = jump / double jump / fall / air / Volt Shot body; f3 crouch = crouch, low, hit / knockdown / lose fallback |
| 4 | 2 + 4 orbs | plug-arm aim f1-2 = PLASMA ORB cast (and JAB / HEAVY bodies); orb spin = Plasma Orb / Volt Shot projectile loop |
| 5 | 4 components | f1 run, f2 electrified, f5 burst figure = CONDUIT DASH body; f3 spiky burst + f4 streak **overlap** (no empty column between them), so they are kept as ONE dash FX frame — never cut |
| 6 | 2 | f1 spike burst over the hands = PLUG GUARD catch flash; f1 -> f2 = OVERLOAD BURST (and the ult's Overload pulses) |
| 7 | 5 + 4 orbs ("x5") | plug-forward firing f1-5 = RETURN FIRE + ult Discharge; f1 = SIPHON CABLE cast; orb = the stored-projectile loop (held in the plug) |

## Parts bin (right side)
Verified roles (no new body poses are assembled):
| Part | Components | Role |
|---|---|---|
| 6-strip bend row A (40-grey) | [22, 23, 24, 25, 26, 27] | SIPHON CABLE **extend** frames (`fx_bend`) |
| 6-strip bend row B (same shapes, darker 23-grey) | [29, 30, 31, 32, 33, 34] | SIPHON CABLE **retract** frames, played reversed (`fx_bendDark`) — not a duplicate: same alpha, different shade |
| 3 wavy plug-tipped cables | [45, 46, 47] | the tether loop (`fx_cable`), tiled along the Siphon / ult cable |
| 2 plug-arm pieces | [44, 43] | plug tip at the end of the cable (`fx_plug`) |

Excluded parts (no reachable role without assembling new poses):
| Part | Source bbox | Reason |
|---|---|---|
| comp 1 | [492, 23, 522, 47] | spare head with both antennae - cosmetic; using it would mean assembling a new pose |
| comp 2 | [556, 46, 573, 61] | loose visor / face piece - the visor is already drawn on every body frame |
| comp 3 | [749, 64, 773, 87] | loose antenna arc - antennae are already drawn on the body frames; no reachable role on their own |
| comp 4 | [776, 64, 794, 87] | loose antenna arc - antennae are already drawn on the body frames; no reachable role on their own |
| comp 5 | [506, 71, 517, 80] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 6 | [556, 71, 567, 91] | leg segment (shin) - a body part, no new poses |
| comp 7 | [581, 71, 589, 92] | leg segment (shin) - a body part, no new poses |
| comp 8 | [599, 71, 609, 91] | leg segment (shin) - a body part, no new poses |
| comp 9 | [622, 71, 630, 92] | leg segment (shin) - a body part, no new poses |
| comp 10 | [795, 71, 805, 81] | loose visor / face piece - the visor is already drawn on every body frame |
| comp 11 | [639, 72, 648, 92] | leg segment (shin) - a body part, no new poses |
| comp 12 | [660, 72, 668, 93] | leg segment (shin) - a body part, no new poses |
| comp 13 | [813, 81, 820, 86] | small plug / antenna tip - too small to read in game; the plug tip uses the plug-arm pieces |
| comp 14 | [810, 89, 822, 106] | loose white chest panel - a torso part (no new poses) |
| comp 15 | [697, 98, 708, 110] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 16 | [748, 98, 757, 122] | arm / limb segment - a body part, no new poses |
| comp 17 | [767, 99, 777, 123] | arm / limb segment - a body part, no new poses |
| comp 18 | [725, 100, 734, 111] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 19 | [697, 116, 706, 140] | arm / limb segment - a body part, no new poses |
| comp 20 | [792, 117, 802, 137] | arm / limb segment - a body part, no new poses |
| comp 21 | [825, 117, 833, 138] | arm / limb segment - a body part, no new poses |
| comp 28 | [722, 121, 733, 133] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 35 | [703, 149, 714, 180] | vertical arm with plug hand - would only serve an assembled pose (the horizontal plug arms are used as the plug tip) |
| comp 36 | [739, 150, 750, 181] | vertical arm with plug hand - would only serve an assembled pose (the horizontal plug arms are used as the plug tip) |
| comp 41 | [582, 183, 593, 204] | arm / limb segment - a body part, no new poses |
| comp 42 | [541, 185, 552, 208] | arm / limb segment - a body part, no new poses |
| comp 48 | [565, 217, 587, 231] | short plug forearm - a third plug-arm variant; the two longer plug arms already cover the plug tip |
| comp 49 | [782, 231, 797, 244] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 56 | [757, 239, 769, 251] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 57 | [813, 239, 824, 250] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 58 | [691, 241, 702, 251] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 59 | [721, 241, 733, 251] | loose hand / fist / plug hand - no reachable role (the plug tip uses the plug-arm pieces) |
| comp 60 | [562, 246, 577, 282] | tail curl - the tail is already drawn on the body frames |
| comp 61 | [540, 257, 556, 275] | tail curl - the tail is already drawn on the body frames |
| comp 62 | [647, 270, 657, 280] | loose visor / face piece - the visor is already drawn on every body frame |
| comp 64 | [723, 300, 735, 330] | thigh + foot segment - a body part, no new poses |
| comp 65 | [750, 301, 762, 331] | thigh + foot segment - a body part, no new poses |
| comp 68 | [685, 336, 700, 358] | thigh + foot segment - a body part, no new poses |
| comp 69 | [385, 381, 415, 405] | spare head with both antennae - cosmetic; using it would mean assembling a new pose |
| comp 75 | [756, 400, 765, 424] | leg segment (shin) - a body part, no new poses |
| comp 77 | [775, 401, 785, 425] | leg segment (shin) - a body part, no new poses |

## Frame -> animation -> move
| Animation | Source frame | Source bbox | Role / move |
|---|---|---|---|
| `idle` | idle f1 | [18, 151, 60, 201] | idle (Row 1 loop) |
| `idle` | idle f2 | [67, 151, 109, 201] | idle (Row 1 loop) |
| `idle` | idle f3 | [119, 151, 161, 201] | idle (Row 1 loop) |
| `idle` | idle f4 | [171, 151, 211, 201] | idle (Row 1 loop) |
| `walk` | run f1 | [14, 234, 69, 281] | walk - the Row 2 RUN cycle SLOWED (no walk art) |
| `walk` | run f2 | [75, 235, 130, 281] | walk - the Row 2 RUN cycle SLOWED (no walk art) |
| `walk` | run f3 | [138, 235, 193, 281] | walk - the Row 2 RUN cycle SLOWED (no walk art) |
| `walk` | run f4 | [206, 235, 261, 281] | walk - the Row 2 RUN cycle SLOWED (no walk art) |
| `walk` | run f5 | [270, 234, 325, 281] | walk - the Row 2 RUN cycle SLOWED (no walk art) |
| `walk` | run f6 | [333, 234, 388, 281] | walk - the Row 2 RUN cycle SLOWED (no walk art) |
| `walk_back` | run f6 | [333, 234, 388, 281] | walk back - Row 2 REVERSED + slowed |
| `walk_back` | run f5 | [270, 234, 325, 281] | walk back - Row 2 REVERSED + slowed |
| `walk_back` | run f4 | [206, 235, 261, 281] | walk back - Row 2 REVERSED + slowed |
| `walk_back` | run f3 | [138, 235, 193, 281] | walk back - Row 2 REVERSED + slowed |
| `walk_back` | run f2 | [75, 235, 130, 281] | walk back - Row 2 REVERSED + slowed |
| `walk_back` | run f1 | [14, 234, 69, 281] | walk back - Row 2 REVERSED + slowed |
| `run` | run f1 | [14, 234, 69, 281] | run (Row 2) |
| `run` | run f2 | [75, 235, 130, 281] | run (Row 2) |
| `run` | run f3 | [138, 235, 193, 281] | run (Row 2) |
| `run` | run f4 | [206, 235, 261, 281] | run (Row 2) |
| `run` | run f5 | [270, 234, 325, 281] | run (Row 2) |
| `run` | run f6 | [333, 234, 388, 281] | run (Row 2) |
| `dash` | run f2 | [75, 235, 130, 281] | dash - Row 2 f2-3, fast |
| `dash` | run f3 | [138, 235, 193, 281] | dash - Row 2 f2-3, fast |
| `jump` | r3 f2 | [58, 300, 93, 373] | jump rise (Row 3 f2, jump with tail) |
| `doubleJump` | r3 f2 | [58, 300, 93, 373] | double jump - REUSED Row 3 f2 |
| `fall` | r3 f2 | [58, 300, 93, 373] | jump fall - REUSED Row 3 f2 (no fall art) |
| `crouch` | r3 f3 | [113, 331, 147, 373] | crouch (Row 3 f3) |
| `guard` | r3 f1 | [20, 317, 45, 373] | block (Row 3 f1 narrow stand) |
| `blockHit` | r3 f1 | [20, 317, 45, 373] | block hit - REUSED Row 3 f1 |
| `light` | aim f1 | [17, 395, 61, 445] | JAB - Row 4 aim f1 body + render-only lunge + procedural pixel plug spark |
| `heavy` | aim f1 | [17, 395, 61, 445] | HEAVY - Row 4 aim f1-2 body + lunge + procedural plug strike (150 px) |
| `heavy` | aim f2 | [80, 401, 138, 445] | HEAVY - Row 4 aim f1-2 body + lunge + procedural plug strike (150 px) |
| `down` | r3 f3 | [113, 331, 147, 373] | LOW - Row 3 crouch + procedural low plug spark (hits low) |
| `up` | run f3 | [138, 235, 193, 281] | LAUNCHER - Row 2 run f3 body + procedural rising spark arc |
| `air` | r3 f2 | [58, 300, 93, 373] | AIR - Row 3 jump frame + procedural spark |
| `hurt` | r3 f3 | [113, 331, 147, 373] | hit - REUSED Row 3 crouch (no hurt pose) |
| `hurt_air` | r3 f2 | [58, 300, 93, 373] | hit in the air - REUSED Row 3 jump |
| `knockdown` | r3 f3 | [113, 331, 147, 373] | knockdown - REUSED Row 3 crouch (no knockdown pose) |
| `getup` | r3 f3 | [113, 331, 147, 373] | get-up - REUSED crouch -> narrow stand |
| `getup` | r3 f1 | [20, 317, 45, 373] | get-up - REUSED crouch -> narrow stand |
| `dizzy` | idle f1 | [18, 151, 60, 201] | dizzy - REUSED idle f1-2 (no dizzy pose) |
| `dizzy` | idle f2 | [67, 151, 109, 201] | dizzy - REUSED idle f1-2 (no dizzy pose) |
| `transform` | r6 f1 | [17, 556, 66, 644] | transform-in - REUSED Row 6 f1 (spike burst over the hands) |
| `taunt` | r6 f1 | [17, 556, 66, 644] | taunt - REUSED Row 6 f1 |
| `win` | r6 f2 | [78, 556, 128, 644] | win - REUSED Row 6 f2 (no win pose) |
| `lose` | r3 f3 | [113, 331, 147, 373] | lose - REUSED Row 3 crouch (no lose pose) |
| `grab` | aim f1 | [17, 395, 61, 445] | grab - REUSED Row 4 aim f1 |
| `fbOrb` | aim f1 | [17, 395, 61, 445] | PLASMA ORB cast (Row 4 plug-arm aim f1-2) |
| `fbOrb` | aim f2 | [80, 401, 138, 445] | PLASMA ORB cast (Row 4 plug-arm aim f1-2) |
| `fbGuard` | r6 f1 | [17, 556, 66, 644] | PLUG GUARD catch flash (Row 6 f1) |
| `fbBurst` | r6 f1 | [17, 556, 66, 644] | OVERLOAD BURST (Row 6 f1 -> f2 burst) + ult Overload pulses |
| `fbBurst` | r6 f2 | [78, 556, 128, 644] | OVERLOAD BURST (Row 6 f1 -> f2 burst) + ult Overload pulses |
| `fbDash` | r5 f1 | [15, 485, 70, 531] | CONDUIT DASH body (Row 5 f1 run, f2 electrified, f5 burst figure; f3 / f4 = FX) |
| `fbDash` | r5 f2 | [85, 485, 140, 531] | CONDUIT DASH body (Row 5 f1 run, f2 electrified, f5 burst figure; f3 / f4 = FX) |
| `fbDash` | r5 f4 | [279, 477, 337, 531] | CONDUIT DASH body (Row 5 f1 run, f2 electrified, f5 burst figure; f3 / f4 = FX) |
| `fbFire` | fire f1 | [9, 673, 68, 717] | RETURN FIRE (Row 7 plug-forward firing f1-5) + ult Discharge |
| `fbFire` | fire f2 | [81, 667, 128, 717] | RETURN FIRE (Row 7 plug-forward firing f1-5) + ult Discharge |
| `fbFire` | fire f3 | [138, 667, 187, 717] | RETURN FIRE (Row 7 plug-forward firing f1-5) + ult Discharge |
| `fbFire` | fire f4 | [193, 667, 237, 717] | RETURN FIRE (Row 7 plug-forward firing f1-5) + ult Discharge |
| `fbFire` | fire f5 | [249, 673, 307, 717] | RETURN FIRE (Row 7 plug-forward firing f1-5) + ult Discharge |
| `fbSiphon` | fire f1 | [9, 673, 68, 717] | SIPHON CABLE cast (Row 7 f1 plug forward; the cable is FX) |
| `fbVolt` | r3 f2 | [58, 300, 93, 373] | VOLT SHOT (air: Row 3 jump frame; the orb is FX) |

## Missing poses (reused, per animation)
jab, heavy, low, launcher: no attack art — JAB = Row 4 aim f1, HEAVY = Row 4 aim f1-2, LOW = Row 3 crouch, LAUNCHER = Row 2 run
f3, each with a **render-only lunge** and a **procedural pixel plug strike / spark**. jump fall = Row 3 f2. hit / hit-air /
knockdown / lose = Row 3 crouch / jump. get-up = crouch -> narrow stand. win = Row 6 f2. dizzy = idle f1-2. transform /
taunt = Row 6 f1. grab = Row 4 aim f1. Never invented art.

## Effects: extracted vs procedural
Extracted from the sheet: plasma orb spin (Row 4), stored orb loop (Row 7), Conduit Dash burst + streak (Row 5, one frame),
Plug Guard flash + Overload Burst (Row 6, body frames), cable bend extend / retract (parts rows A / B), wavy cable tether,
plug tip.
Procedural (render-only, pixel style, never in GAME_STATE): normals' plug strikes / sparks and lunges, Siphon current running
along the cable, Charge / stored-projectile HUD, Drain pips + Blackout static overlay, Overload radial ring, ult current
through the cable, enlarged Discharge orb (the extracted orb scaled ×2 nearest-neighbour), absorb sparks, glow, screen shake.
