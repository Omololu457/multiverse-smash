# Black Ranger — SPRITE LEDGER

Source: `Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Rangers - Black Ranger.gif`
- sha256 `6ad5096e111c1997f694962353373b9d81bd2bfce376f5267ca9891282b4cbf5` · 396×970 · GIF mode P · transparency index 74
- Key policy: GIF transparency index 74 only; every opaque pixel (incl. outline (32,32,0), visor (0,0,0), black suit) is kept
- Credit (transcribed from the sheet's own credit panel at 266,815,105,69): **"Sprites ripped by Belial the Hedgehog."** — the credit panel is cut to `assets/mmpr_black/credit_panel.png` and shown in the in-game credits entry; it is never used as a fighter frame.
- Strip frame 176×128, anchor origin (88,118) = planted foot (grounded cells) / bbox bottom-centre (airborne cells). Nearest-neighbour only, no resampling, no new pixels.
- Render bounds are the strip cell; the COLLISION / HURTBOX stays the engine roster standard (48×94) and HITBOXES come from move data (rangeX/rangeY/boxY) — never from sprite pixels.
- Every connected component of the sheet is assigned to exactly one cell (extract.py asserts this); a cell may be a union of components (e.g. a kick + its detached trail).

| Cell | Source rect x,y,w,h | Status | Used in actions |
|---|---|---|---|
| ready0 | 3,2,40,71 | used (reused) | getup, idle, intro |
| ready1 | 46,3,39,70 | used | idle |
| ready2 | 90,1,40,72 | used (reused) | bCall, idle |
| walk0 | 1,79,41,70 | used (reused) | walk, walk_back |
| walk1 | 45,78,37,71 | used (reused) | walk, walk_back |
| walk2 | 86,78,23,72 | used (reused) | walk, walk_back |
| walk3 | 116,80,39,70 | used (reused) | walk, walk_back |
| walk4 | 159,80,31,71 | used (reused) | walk, walk_back |
| walk5 | 196,80,29,72 | used (reused) | walk, walk_back |
| crouch0 | 3,176,36,59 | used | crouch |
| rise0 | 48,155,41,83 | used (reused) | bCall, ultLand, win |
| rise1 | 93,167,49,65 | **unused** — mid-rise transition; idle→win already reads cleanly with rise0, no move needs a third rise pose | — |
| rise2 | 146,162,47,68 | used | fall |
| run0 | 5,241,49,67 | used | run |
| run1 | 55,241,49,68 | used | run |
| run2 | 114,244,34,64 | used | run |
| run3 | 150,242,52,67 | used | run |
| run4 | 205,240,56,68 | used (reused) | dash, run, ultOpen |
| run5 | 267,243,32,64 | used | run |
| reach0 | 2,319,38,80 | used | jump |
| tuck0 | 47,327,48,56 | used (reused) | air, jump |
| roll0 | 103,332,35,36 | used | jump |
| roll1 | 144,329,38,34 | used | jump |
| roll2 | 191,330,41,34 | used | jump |
| flyKick0 | 262,326,70,48 | used (reused) | air, down_air |
| punch0 | 0,405,47,71 | used (reused) | grab, light |
| punch1 | 49,405,62,70 | used | light |
| punch2 | 114,404,51,70 | used | bJ2 |
| punch3 | 172,403,50,69 | used (reused) | bJ2, bPalm |
| punch4 | 227,409,68,62 | used (reused) | bJ2, bPalm, ultOpen |
| kick0 | 1,484,52,65 | **unused** — chamber pose nearly identical to kick1/kick5 silhouette; kept out to avoid a duplicate-looking frame | — |
| kick1 | 57,483,45,66 | used (reused) | bCrescent, bTurn |
| kick2 | 101,480,53,70 | used (reused) | bJ3, heavy |
| kick3 | 161,480,56,69 | used (reused) | bCrescent, bTurn, heavy |
| kick4 | 225,481,54,69 | used (reused) | bCrescent, bJ3 |
| kick5 | 281,484,52,65 | used | heavy |
| axe0 | 2,559,45,79 | **unused** — POWER AXE stance — Black is unarmed in this kit (brief: do not invent weapon geometry; the axe is a weapon the kit does not use) | — |
| axe1 | 53,554,53,93 | **unused** — POWER AXE overhead swing (axe drawn) — unused for the same reason | — |
| axe2 | 106,565,96,64 | **unused** — POWER AXE horizontal swing — unused | — |
| axe3 | 209,564,55,64 | **unused** — POWER AXE follow-through (axe drawn) — unused | — |
| acro0 | 4,661,44,63 | used | bAway |
| acro1 | 57,647,83,60 | used | intro |
| acro2 | 147,644,63,68 | used (reused) | bAway, intro |
| acro3 | 216,656,72,37 | used (reused) | blink, ultLow |
| set0 | 5,739,44,50 | used (reused) | bLow, bRising, getup, intro, ultLow, up |
| riseStrike0 | 64,719,44,80 | used | bRising |
| jumpKick0 | 117,725,53,72 | used (reused) | bRising, ultRise |
| spinKick0 | 180,726,61,64 | used (reused) | bCrescent, bLow |
| highKick0 | 247,710,55,80 | used (reused) | ultRise, up |
| follow0 | 312,720,55,65 | used (reused) | bCrescent, ultLand, up |
| react0 | 1,815,54,67 | used | hurt |
| react1 | 58,816,54,65 | used | grab |
| react2 | 121,816,45,66 | used | guard |
| react3 | 171,832,59,48 | used | hurt2 |
| down0 | 4,896,37,71 | used | stagger |
| down1 | 51,901,49,59 | used (reused) | knockdown, lose |
| down2 | 107,902,61,45 | used (reused) | knockdown, lose |
| down3 | 173,915,73,22 | used (reused) | knockdown, lose |
| down4 | 250,892,64,48 | used | launched |
| down5 | 329,901,44,44 | used | getup |
| (credit panel) | 266,815,105,69 | credit — transcribed, not a frame | credits entry |

Duplicates: none detected (no two cells pixel-identical). Reuse is deliberate and listed in "Used in" (e.g. `set0` is the shared crouched set-up for low sweep, launcher, Rising Mastodon, get-up, intro and the ultimate's low beat).

Mapping notes (from visual inspection of the contact sheet): `spinKick0` is the low sweep (Ankle Sweep / Crescent tail); `react1` is a two-hand shove (grab); `reach0/tuck0/roll0-2` form the jump; `acro3` is the low dive used as the blink pose and the ultimate's withdraw; `down0..down5` are stagger → fall → prone → launched → kip.
