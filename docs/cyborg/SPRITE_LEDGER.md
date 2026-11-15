# Cyborg — sprite ledger

Source: `Game Boy Advance - Teen Titans - Playable Characters - Cyborg.png` — 1369x1613 RGB, sha256 `7c0c882f1a235ee8599d9a512cbbb3e96b1974d7448a8c880bbf0e893a366f26` (verified unchanged; never written).

Extraction: `tools/cyborg/extract.py` → `docs/cyborg/source_rects.json` (every rect), `contact_sheet.png`, `contact_sheet_fx_icons.png`.
- Key: exact RGB(77,109,243) only (also inside enclosed gaps); nearest other colour 53 L1 away; outlines (0,0,0) kept
- Scaling: nearest-neighbour only; no resampling filter, no AI redraw. Every strip frame is 184x168 with origin (92,96) at the feet.
- Body cells: 197. Text-label components removed: 267. Loop-marker dividers removed: cannonLoop, rackLoop, explosionResidue.
- Credit panel [1200, 1472, 169, 141]: Brought to you by... Mr. C — Credit? No / Permission? No (panel excluded from animation) — excluded from every animation, saved separately as `assets/cyborg/credit_panel.png` and listed in credits.js.

## Source labels → strips

| Sheet label | Rect (x0,y0,x1,y1) |
|---|---|
| Appearing | [167, 3, 216, 12] |
| Idle | [554, 80, 572, 88] |
| Running | [886, 154, 924, 163] |
| Jumping | [502, 224, 542, 233] |
| Double Jump | [597, 303, 659, 313] |
| Landing | [619, 402, 656, 412] |
| Punch 1 | [566, 475, 604, 483] |
| Punch 2 | [384, 548, 423, 556] |
| Shooting Missile | [420, 616, 501, 626] |
| Shooting Sonic Cannon | [565, 691, 674, 701] |
| (Loop closed part until attack ends) | [565, 703, 741, 713] |
| Aerial Punch | [366, 766, 428, 774] |
| Launching Missiles | [895, 859, 989, 869] |
| (Loop closed part 5 times) | [895, 871, 1025, 881] |
| Mega Punch | [894, 943, 953, 953] |
| Hurt | [376, 1040, 397, 1047] |
| Defeated | [1325, 1112, 1368, 1120] |
| Missile | [20, 1190, 54, 1198] |
| Missile Explosion | [448, 1205, 534, 1215] |
| Sonic Cannon Blast | [50, 1248, 142, 1256] |
| Health Icon | [164, 1306, 221, 1314] |
| Cutscenes | [99, 1482, 151, 1489] |

## Runtime strips (`assets/cyborg/<action>.png`)

| Action | Frames | Source cells |
|---|---|---|
| `intro` | 3 | appear0 appear1 appear2 |
| `idle` | 10 | idle0 idle1 idle2 idle3 idle4 idle5 idle6 idle7 idle8 idle9 |
| `walk` | 14 | run0 run1 run2 run3 run4 run5 run6 run7 run8 run9 run10 run11 run12 run13 |
| `walk_back` | 14 | run13 run12 run11 run10 run9 run8 run7 run6 run5 run4 run3 run2 run1 run0 |
| `run` | 14 | run0 run1 run2 run3 run4 run5 run6 run7 run8 run9 run10 run11 run12 run13 |
| `dash` | 4 | run3 run4 run5 run6 |
| `jump` | 5 | jump0 jump1 jump2 jump3 jump4 |
| `fall` | 4 | jump5 jump6 jump7 jump8 |
| `doubleJump` | 6 | djump0 djump1 djump2 djump3 djump4 djump5 |
| `land` | 9 | land0 land1 land2 land3 land4 land5 land6 land7 land8 |
| `crouch` | 1 | land4 |
| `guard` | 1 | p13 |
| `hurt` | 5 | hurt1 hurt2 hurt3 hurt4 hurt5 |
| `knockdown` | 4 | hurt0 hurt1 hurt2 hurt5 |
| `lose` | 26 | def0 def1 def2 def3 def4 def5 def6 def7 def8 def9 def10 def11 def12 def13 def14 def15 def16 def17 def18 def19 def20 def21 def22 def23 def24 def25 |
| `light` | 3 | p11 p12 p11 |
| `cJ2` | 6 | p20 p21 p22 p23 p24 p25 |
| `cJ3` | 6 | p13 p14 p15 p16 p17 p19 |
| `heavy` | 9 | p11 p12 p13 p14 p15 p16 p17 p18 p19 |
| `cLow` | 3 | land3 land4 mp3 |
| `up` | 4 | land4 ap1 ap5 ap6 |
| `air` | 7 | ap0 ap1 ap2 ap3 ap4 ap5 ap6 |
| `cAdv` | 5 | run3 run4 p22 p23 p24 |
| `cPiston` | 4 | p14 p15 p16 p17 |
| `cKnock` | 6 | mp0 mp1 p22 p23 p25 p26 |
| `cShot` | 8 | cn0 cn1 cn2 cn3 cn4 cn7 cn8 cn9 |
| `cCannon` | 10 | cn0 cn1 cn2 cn3 cn4 cn5 cn6 cn7 cn8 cn9 |
| `cMissile` | 8 | sm0 sm1 sm2 sm3 sm4 sm5 sm6 sm7 |
| `cRack` | 10 | mr0 mr1 mr2 mr3 mr4 mr5 mr6 mr7 mr8 mr9 |
| `cMega` | 11 | mp0 mp1 mp2 mp3 mp4 mp5 mp6 mp7 mp8 mp9 mp10 |
| `cSlamAir` | 1 | mp2 |
| `cSlamLand` | 8 | mp3 mp4 mp5 mp6 mp7 mp8 mp9 mp10 |
| `cRecoil` | 6 | cn2 cn3 cn4 cn6 cn7 cn8 |
| `cVent` | 1 | idle0 |
| `ultOpen` | 6 | cn0 cn1 cn2 cn3 cn4 cn7 |
| `ultCannon` | 2 | cn4 cn5 |
| `ultRack` | 4 | mr4 mr5 mr6 mr7 |
| `ultBoost` | 3 | djump1 djump2 djump3 |
| `ultAir` | 3 | ap2 ap3 ap4 |
| `ultMega` | 11 | mp0 mp1 mp2 mp3 mp4 mp5 mp6 mp7 mp8 mp9 mp10 |

Re-uses (deliberate, documented): `walk_back` = `walk` reversed; `dash` = run 3-6; `crouch` = land4; `guard` = p13 (Punch 1's fists-up cover; no guard art exists); `walk` = the run cycle played slower (no walk cycle on the sheet); `cVent` = idle0 with procedural steam; `cSlamAir` = mp2 (Mega wind-up held in air).

## Duplicates (pixel-identical, kept once)

| Cell | Same as |
|---|---|
| djump6 | jump4 |
| djump7 | jump5 |
| djump9 | jump7 |
| djump8 | jump6 |
| mr10 | jump4 |
| mr11 | jump5 |
| mr13 | jump7 |
| mr12 | jump6 |
| def1 | def0 |

Unused body cells (duplicates or loop tails covered by the loop logic): djump6, djump7, djump9, djump10, djump8, p10, p110, mr10, mr11, mr13, mr14, mr12.

## FX, icons, cut-in

- Missile 17x15 ×1 (`fx/missile_strip.png`), Missile Explosion 47x40 ×11 (`fx/explosion_strip.png`, also `ex0-10`), Sonic Cannon Blast 44x29 ×2 (`fx/sonic_strip.png`, `blast0-1`).
- Health-icon expressions `icons/expressions.png` (36x31 cells), rows: grin=5, calm=4, calm2=4, strain=4, daze=2, down=1.
- Cut-in bust 125x91 plus overlays: eye0, eye1, mouth0, mouth1, mouth2 (positions + mismatch pixel counts in source_rects.json).
- Portrait `portrait.png` 128x128 (nearest-neighbour from the bust).

## Skins

Eight precomputed skin sets under `assets/cyborg/skins/<tag>/` (all 42 strips + fx + icons + cut-in), built by `tools/cyborg/build_skins.py` from `tools/cyborg/skins.json`. Region map and audits: `docs/skins/cyborg/region_mapping.json`, `skins_results.json`, `skins_contact.png`.
