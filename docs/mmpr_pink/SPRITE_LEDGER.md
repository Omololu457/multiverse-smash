# Pink Ranger (`mmpr_pink`) — SPRITE LEDGER

Source: `Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Rangers - Pink Ranger.gif`
- sha256 `a5c35f2558b9981ba889cb355acfe769b3ef4fcda8062095111947faeb850168` · 460×996 · GIF mode P · transparency index 62
- Key policy: GIF transparency index 62 only; every opaque pixel (incl. (0,0,0) index 0 and outline (32,0,32)) is kept. Nearest-neighbour only; no generated, borrowed, resampled or repainted frames.
- Credit (transcribed from the sheet's own panel at 286,834,162,47): **"Sprites (shamefully) ripped by Belial."** — cut to `assets/mmpr_pink/credit_panel.png`, shown in the credits entry, never a fighter frame.
- Strip frame 176×128, origin (88,118) = planted foot (grounded) / bbox bottom-centre (airborne). `tools/mmpr_pink/extract.py` asserts every connected component is assigned to exactly one cell.
- **Separate geometry:** render bounds = the strip cell (drawn ×1.85); body collision / hurtbox = roster-standard 48×94; attack hitboxes come from move data (`rangeX/rangeY/boxY`) and arrow collision from the projectile radius (10) — never from pixels. The arrow's drawn position is decoupled from its collision with `spriteBottomY`.

| Cell | Source rect x,y,w,h | Kind | Status | Used in |
|---|---|---|---|---|
| ready0 | 2,6,40,72 | body | used (reused) | getup, idle, ultLand |
| ready1 | 48,5,40,71 | body | used | idle |
| ready2 | 94,7,39,70 | body | used (reused) | idle, pCall |
| crouch0 | 180,15,36,59 | body | used (reused) | getup, intro, pCall, pCrane, ultLand |
| raise0 | 228,2,41,83 | body | used (reused) | pCall, win |
| rise0 | 272,14,49,65 | body | used | up |
| rise1 | 329,9,47,68 | body | **unused** | mid-rise transition; idle→intro/win read cleanly without a third rise pose |
| walk0 | 3,84,41,70 | body | used (reused) | walk, walk_back |
| walk1 | 47,81,37,71 | body | used (reused) | walk, walk_back |
| walk2 | 89,83,23,72 | body | used (reused) | walk, walk_back |
| walk3 | 118,85,39,70 | body | used (reused) | walk, walk_back |
| walk4 | 164,83,31,71 | body | used (reused) | walk, walk_back |
| walk5 | 202,84,29,72 | body | used (reused) | walk, walk_back |
| run0 | 2,167,49,67 | body | used | run |
| run1 | 46,167,49,68 | body | used | run |
| run2 | 102,167,34,64 | body | used | run |
| run3 | 137,168,52,67 | body | used | run |
| run4 | 185,163,56,68 | body | used (reused) | dash, run |
| run5 | 248,168,32,64 | body | used | run |
| reach0 | 2,245,38,80 | body | used | jump |
| leap0 | 47,255,48,56 | body | used (reused) | jump, ultKick |
| tuck0 | 102,263,35,36 | body | used (reused) | air, jump |
| roll0 | 144,258,38,34 | body | used | jump |
| roll1 | 194,258,41,34 | body | used | jump |
| flyKick0 | 247,248,70,48 | body | used (reused) | air, down_air, ultKick |
| set0 | 5,342,44,50 | body | used | up |
| riseKick0 | 60,313,44,80 | body | used | up |
| crescent0 | 109,316,53,72 | body | used | ultKick |
| crescent1 | 172,318,61,64 | body | used | pKick |
| crescent2 | 242,308,55,80 | body | used | heavy |
| crescent3 | 304,313,55,65 | body | **unused** | fourth crescent-trail pose; the three used crescent cells already cover the Heavy and ultimate kick arcs |
| punch0 | 3,400,47,71 | body | used | light |
| punch1 | 54,401,62,70 | body | used | light |
| punch2 | 121,400,51,70 | body | used (reused) | pJ2, pPalm |
| punch3 | 177,399,50,69 | body | used (reused) | pAway, pPalm |
| punch4 | 231,406,68,62 | body | used | pJ2 |
| kick0 | 3,478,52,65 | body | used | heavy |
| kick1 | 58,479,45,66 | body | used (reused) | heavy, pKick |
| kick2 | 106,476,53,70 | body | used | pJ3 |
| kick3 | 168,477,56,69 | body | used | pJ3 |
| kick4 | 234,479,54,69 | body | used | pLow |
| kick5 | 293,479,52,65 | body | used | pJ3 |
| low0 | 8,586,29,64 | body | used (reused) | crouch, pLow |
| thrust0 | 42,583,64,65 | body | used | pAway |
| staff0 | 114,554,81,93 | body | **unused** | LONG-WEAPON upward thrust held in both hands — it is NOT the Power Bow and not a kick, so it is never used as a bow or arrow pose (correction from a first-pass reading) |
| cart0 | 205,570,83,60 | body | used | pCrane |
| hand0 | 294,567,63,68 | body | used | pCrane |
| dive0 | 370,587,72,37 | body | used | blink |
| bow0 | 1,663,49,70 | body | used (reused) | bow, intro, ultOpen |
| bow1 | 60,658,70,77 | body | used (reused) | bow, ultOpen |
| bow2 | 136,653,65,85 | body | used (reused) | bow, ultOpen |
| bow3 | 209,653,64,85 | body | used (reused) | bow, ultOpen, win |
| arrow0 | 278,671,45,15 | fx | **projectile art** | not a fighter frame: cut to assets/mmpr_pink/arrow.png and used ONLY as the Power Bow projectile art (all shots, ultimate arrows) |
| air0 | 2,743,45,76 | body | **unused** | aerial rotation; the jump strip uses reach0/leap0/tuck0/roll0-1 and air1-3 for the intro, no move needs a fourth rotation |
| air1 | 59,751,44,63 | body | used | intro |
| air2 | 110,757,56,48 | body | used | intro |
| air3 | 172,753,48,54 | body | used | intro |
| air4 | 225,755,45,46 | body | **unused** | aerial rotation frame between air3 and air5; fall uses air5 alone |
| air5 | 316,750,54,56 | body | used | fall |
| air6 | 384,749,71,56 | body | **unused** | final aerial rotation; landing reads cleanly without it |
| react0 | 5,837,54,67 | body | used | guard |
| react1 | 70,838,54,65 | body | used | hurt |
| react2 | 131,838,45,66 | body | **unused** | second recoil candidate; hurt/hurt2/guard use react1/react3/react0 |
| react3 | 183,855,59,48 | body | used | hurt2 |
| down0 | 8,927,36,57 | body | used (reused) | lose, stagger |
| down1 | 54,919,37,71 | body | used (reused) | knockdown, lose |
| down2 | 98,926,49,59 | body | used (reused) | knockdown, lose |
| down3 | 157,928,61,45 | body | used (reused) | knockdown, lose |
| down4 | 234,896,64,48 | body | used | launched |
| down5 | 226,953,73,22 | body | **unused** | mid get-up frame; getup reads cleanly down6→ready0 |
| down6 | 311,932,44,44 | body | used | getup |

## Unused cells (reason)

- `rise1` — mid-rise transition; idle→intro/win read cleanly without a third rise pose
- `crescent3` — fourth crescent-trail pose; the three used crescent cells already cover the Heavy and ultimate kick arcs
- `staff0` — LONG-WEAPON upward thrust held in both hands — it is NOT the Power Bow and not a kick, so it is never used as a bow or arrow pose (correction from a first-pass reading)
- `arrow0` — not a fighter frame: cut to assets/mmpr_pink/arrow.png and used ONLY as the Power Bow projectile art (all shots, ultimate arrows)
- `air0` — aerial rotation; the jump strip uses reach0/leap0/tuck0/roll0-1 and air1-3 for the intro, no move needs a fourth rotation
- `air4` — aerial rotation frame between air3 and air5; fall uses air5 alone
- `air6` — final aerial rotation; landing reads cleanly without it
- `react2` — second recoil candidate; hurt/hurt2/guard use react1/react3/react0
- `down5` — mid get-up frame; getup reads cleanly down6→ready0

## Derived graphics (no new pixels)

- `assets/mmpr_pink/arrow.png` — arrow0 verbatim (45×15); drawn ×1.85 at hand height for quick, drawn and ultimate arrows.
- `assets/mmpr_pink/portrait.png` — crop of ready0. `blink.png` — dive0 strip used as the blink afterimage (alpha-faded at draw time).
- `assets/mmpr_pink/skins/<tag>/*` — region recolours of the same pixels (`tools/mmpr_pink/build_skins.py`; masks + audit in `docs/skins/mmpr_pink/region_mapping.json`).
- FX drawn in code (render-only, `mmprPinkFx.js`): Spotter reticle, call marker, warning bands, pip squares, reject ✕, Thread flash. No raster FX was invented.

## Thunder Megazord

Shared asset — see `docs/power_rangers/thunder_megazord/LEDGER.md`. One definition (`thunderMegazordSprites.js`, `assets/power_rangers/thunder_megazord/cells/`), never recoloured, never cached per character.
