# Rath (Appoplexian) — sprite ledger

**Sheet source: unknown, add credit if known.** (The file name `ben_10_rath_sprites_sheet_by_mhcd12_dmav8zd.png` suggests the
author "mhcd12"; not confirmed, so no credit is asserted.)

- Source: `assets/sprites/ben10/aliens/rath.png` (1330×661) — a byte copy of the tracked root file
  `ben_10_rath_sprites_sheet_by_mhcd12_dmav8zd.png` (orange-and-white tiger-striped muscular alien with claws, two small figures
  on the far left, solid blue background).
- Slicer: `tools/ben10/slice_rath.py` (deterministic; re-running is byte-identical). Output: `ben10_rath_ready_*_uniform.png`
  (40 animation strips), `rathAssets.js`, `source_grid.json` (every component id, every frame offset, the duplicate report),
  `contact_sheet.png`, `preview_*.gif` (the main sequences as animations).
- Cell 84×77 native, feet baseline y = 75, body-centre x = 42. On screen ×3 (`actionScale` 1.5 × Ben's 2.0): an integer
  pixel scale, nearest-neighbour only.

## Keying

- Background = (0,91,163) blue at all four corners; keyed on that EXACT colour, zero tolerance (838 017 px).
- 30 colours, opaque, no anti-aliasing → no de-fringe pass.
- **Palette collisions (reported):**
  - the only colour shared by the two transform figures and Rath's frames is black (0,0,0) (outlines) — harmless, the figures
    are separated by COMPONENT;
  - the only colour near the key is (9,54,123) (human Ben's jeans): it appears in NO Rath frame, and it is not the key (zero
    tolerance), so nothing of Rath is keyed out;
  - Rath's orange / dark orange / chest white / grey claws / green Omnitrix mark: no collision with the key.
- No annotation on the sheet: 35 components, every one a whole frame, every one assigned by its top-left (asserted).

## The two small figures (far left) — transform-in only

Confirmed on the contact sheet: T0 is a **full-colour human Ben 10** (green jacket, jeans — the brief expected a dark
silhouette; it is a coloured sprite), T1 is a **solid green Ben silhouette**. Neither is a Rath frame. They are used ONLY in
the `transform` animation (human Ben → green flash → Rath Stand T2) and are excluded from every other animation (asserted
in the slicer).

## Inventory — the real frames (the brief's inventory corrected)

Top row (left → right): T0 human Ben, T1 green silhouette, **T2–T5 Stand** (4), **T6–T11 an UPRIGHT RUN cycle** (6 frames =
a 3-frame cycle drawn twice: T6=T9, T7=T10, T8=T11, byte-identical), **T12 pointing / roaring**, **T13 crouched on all fours**
(the ONLY quadruped frame — there is no quadruped sprint), **T14–T21 punches**: T14 guard / wind-up, T15 straight, T16 long
straight, T17 low claw swipe, T18 and T19 wind-ups, **T20–T21 a real uppercut**.

Bottom row: **B0 + B4–B9 a HUNCHED CHARGING run** (fists forward), **B1 an airborne leap**, **B2 side-on, fists up**,
**B3 arms up, shouting**, **B10 overhead wind-up**, **B11 claw slash** — the orange streak is the swipe TRAIL of his claws
(touching the arm; Rath has no weapons in canon), so it is a claw-swipe pose, never a blade — **B12 double-arm flex**.

Differences from the brief's inventory: the top row's "punches" T6–T11 are a run cycle; there is no quadruped sprint (Rath
Rush uses the leap + the hunched charge cycle); the bottom row's "running stride" is the hunched charge; the uppercut
(LAUNCHER) is real art.

## Every animation

| anim | frames | role |
|---|---|---|
| idle | Stand T2–T5 | idle loop |
| walk / walk_back | run T6–T11 / reversed | the upright run cycle, slowed (speed 8) |
| run | run T6–T11 | the upright run cycle, fast |
| dash | leap B1 | |
| crouch | T13 | on all fours |
| jump / doubleJump / fall | leap B1 | REUSED (no jump / fall art) |
| guard / blockHit | B2 | side-on fists up (no block art; the closest defensive frame) |
| crouchGuard | T13 | REUSED crouch |
| hurt | T18 | REUSED wind-up (fists drawn in; no hit art, light or heavy) |
| hurt_air | leap B1 | REUSED |
| knockdown | B1 → T13 | REUSED (no knockdown / lying art) |
| getup | T13 → T2 | REUSED (no get-up art) |
| dizzy / idleAlt | T2 | REUSED (no dizzy art) |
| transform | T0 human Ben → T1 green silhouette → T2 | TRANSFORM-IN (the only use of T0 / T1) |
| taunt | T12 | pointing / roaring |
| win | B12 | the flex |
| lose | T13 | REUSED crouch (no lose art) |
| light | T14 → T15 | JAB |
| heavy | T19 → T16 | HEAVY (T16 = the hit frame) |
| down | T17 | LOW (the low claw swipe) |
| up | T20 → T21 | LAUNCHER (real uppercut) |
| air | B1 → T15 | AIR — REUSED leap + straight |
| grab | T15 | REUSED straight (the reach) |
| rtRake | B10 → B11 | CLAW RAKE (the claw slash) |
| rtRush | B1 → B4–B9, B0 | RATH RUSH (leap, then the hunched charge cycle) |
| rtRushHit | T16 | RATH RUSH hits (REUSED long straight) |
| rtGrab | T15 | LET ME TELL YOU SOMETHING reach (REUSED) |
| rtRant | B3 | the rant: arms up, shouting |
| rtRantHit | T14, T15, T18, T16 | the rant punches (REUSED punch frames) |
| rtSlam | B10 → T17 | OVERHEAD SLAM (overhead wind-up → swung down; render-only arc) |
| rtLunge | B1 → T16 | PRIMAL LUNGE (REUSED leap + long straight) |
| rtRoar | B12 | RATH'S FURY trigger roar (the flex — cosmetic, never a lock) |
| rtUltGrab | B3 | ultimate: collar grab, shouting |
| rtUltPunch | T15, T16, T19, T18 | ultimate: the rant punches (REUSED) |
| rtUltFinal | B12 → T16 | ultimate finisher: flex wind → haymaker |

## Effects — all procedural pixel-style, render-only (drawn by `rath.js`, never GAME_STATE, no hitboxes)

Claw sparks (Low / Claw Rake / Primal Lunge), the Overhead Slam arc + impact dust, the Rath Rush dust trail, the RAGING heat
shimmer and the RATH'S FURY armor glow (orange outline pulse), the roar burst rings, the speech-burst icon of Let Me Tell You
Something / the ultimate (an empty jagged balloon with "!" glyph pixels — no text, no hitbox), screen shake, the HUD Fury gauge.
No effect is cut from the sheet (it has none apart from the B11 claw trail, which stays part of that frame).

No art was invented: every pose above is a sheet frame; missing poses reuse the closest frame as listed.
