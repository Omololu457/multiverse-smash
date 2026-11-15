# Beast Boy — sprite ledger

Source: `Game Boy Advance - Teen Titans - Playable Characters - Beast Boy.png` — 1193x1254 RGB, sha256 `f261da2b027684cc7b60a43ea2bb239e22f22b20e9c7ae37286bc86a9d567984` (verified unchanged; never written).

Extraction: `tools/beast_boy/extract.py` → `docs/beast_boy/source_rects.json` (every rect), `contact_sheet.png`, `contact_sheet_icons_cutscene.png`, `transitions.png`.
- Key: exact RGB(77,109,243) only (also inside enclosed gaps); nearest other colour 161 L1 away; outlines (0,0,0) kept
- Scaling: nearest-neighbour only; no resampling filter, no AI redraw, no invented frames, no fifth animal. Every strip frame is 272x136 with origin (136,112) at the feet.
- Body cells: 180. Text-label components removed: 244 (pixel-level label assert).
- Credit panel [1024, 1113, 1193, 1254]: Brought to you by... Mr. C — Credit? No / Permission? No (panel excluded from animation) — excluded from every animation, saved as `assets/beast_boy/credit_panel.png`, quoted in credits.js.
- Anchors: human cells = hair-top centre over the band floor; animal / morph cells = silhouette centroid + a per-cell ANCHOR_DX (below) so the torso stays put through every morph (reviewed in `transitions.png`).
- Render bounds (art), hurtbox (`HURTBOX` per form) and attack geometry (`box` per move) are three separate things; no hitbox is derived from transparent art bounds.

## Source labels

| Sheet label | Rect (x0,y0,x1,y1) |
|---|---|
| Appearing | [117, 0, 170, 14] |
| Idle | [568, 60, 592, 72] |
| Running | [597, 122, 640, 136] |
| Jumping | [358, 178, 402, 192] |
| Landing | [489, 245, 530, 258] |
| Punch 1 | [440, 301, 482, 314] |
| Punch 2 | [333, 358, 376, 372] |
| Gorilla Kick | [714, 418, 775, 432] |
| Changing into Triceratops (Reverse for Changing Back) | [207, 479, 354, 506] |
| Triceratops Charging | [687, 538, 796, 552] |
| Aerial Kick | [430, 598, 488, 612] |
| Changing into Bird (Reverse for Changing Back) | [163, 671, 308, 699] |
| Bird Flying | [355, 730, 410, 744] |
| Tiger Slash | [1163, 790, 1193, 816] |
| Hurt | [260, 856, 286, 868] |
| Defeated | [382, 910, 429, 922] |
| Health Icon | [210, 972, 271, 987] |
| Cutscenes | [52, 1148, 108, 1162] |

## Band floors (feet y per action band)

| Band | Floor y |
|---|---|
| appear | 58 |
| idle | 114 |
| run | 175 |
| jump | 243 |
| land | 299 |
| p1 | 357 |
| p2 | 413 |
| gor | 474 |
| trc | 538 |
| tri | 595 |
| ak | 663 |
| brc | 724 |
| bird | 761 |
| tig | 847 |
| hurt | 909 |
| def | 971 |

## Animal / morph anchor corrections (px, toward facing = +)

| Cell | dx |
|---|---|
| gor2 | 0 |
| gor3 | -4 |
| gor4 | -6 |
| gor5 | -14 |
| gor6 | -16 |
| gor7 | -16 |
| gor8 | -10 |
| gor9 | -4 |
| gor10 | -4 |
| gor11 | 0 |
| trc2 | 0 |
| trc3 | 0 |
| tri0 | 0 |
| tri1 | 0 |
| tri2 | 0 |
| tri3 | 0 |
| tri4 | 0 |
| tri5 | 0 |
| tri6 | 0 |
| tri7 | 0 |
| brc2 | 6 |
| brc3 | 6 |
| tig2 | 0 |
| tig3 | -10 |
| tig4 | -18 |
| tig5 | -26 |
| tig6 | -22 |
| tig7 | -18 |
| tig8 | -20 |
| tig9 | -22 |
| tig10 | -22 |
| tig11 | -18 |
| tig12 | 0 |

## Strips (engine action ← ordered source cells, form per cell)

| Strip | Frames | Cells | Forms |
|---|---|---|---|
| intro | 3 | appear0 appear1 appear2 | human×3 |
| idle | 14 | idle0 idle1 idle2 idle3 idle4 idle5 idle6 idle7 idle8 idle9 idle10 idle11 idle12 idle13 | human×14 |
| walk | 14 | run0 run1 run2 run3 run4 run5 run6 run7 run8 run9 run10 run11 run12 run13 | human×14 |
| walk_back | 14 | run13 run12 run11 run10 run9 run8 run7 run6 run5 run4 run3 run2 run1 run0 | human×14 |
| run | 14 | run0 run1 run2 run3 run4 run5 run6 run7 run8 run9 run10 run11 run12 run13 | human×14 |
| dash | 5 | run2 run3 run4 run9 run10 | human×5 |
| jump | 5 | jump0 jump1 jump2 jump3 jump4 | human×5 |
| fall | 5 | jump5 jump6 jump7 jump8 jump9 | human×5 |
| land | 11 | land0 land1 land2 land3 land4 land5 land6 land7 land8 land9 land10 | human×11 |
| crouch | 1 | land4 | human×1 |
| guard | 1 | p10 | human×1 |
| hurt | 5 | hurt1 hurt2 hurt3 hurt4 hurt5 | human×5 |
| knockdown | 5 | hurt0 hurt1 hurt3 hurt4 hurt5 | human×5 |
| lose | 12 | def0 def1 def2 def3 def4 def5 def6 def7 def8 def9 def10 def11 | human×12 |
| win | 2 | appear2 idle0 | human×2 |
| light | 3 | p21 p22 p25 | human×3 |
| bJ2 | 4 | p11 p12 p14 p17 | human×4 |
| bJ3 | 6 | p20 p21 p22 p23 p24 p25 | human×6 |
| heavy | 9 | p10 p11 p12 p13 p14 p15 p16 p17 p18 | human×9 |
| bLow | 4 | ak1 ak2 ak3 ak5 | human×4 |
| up | 4 | land4 ak5 ak6 ak9 | human×4 |
| air | 7 | ak0 ak1 ak2 ak3 ak4 ak5 ak6 | human×7 |
| bAdv | 5 | run9 run10 p21 p22 p25 | human×5 |
| bStr | 5 | p11 p12 p14 p15 p17 | human×5 |
| bKnock | 7 | p12 p13 p14 p15 p16 p17 p18 | human×7 |
| gorilla | 13 | gor0 gor1 gor2 gor3 gor4 gor5 gor6 gor7 gor8 gor9 gor10 gor11 gor12 | human×2, morph_gorilla×1, gorilla×8, morph_gorilla×1, human×1 |
| tricera | 16 | trc0 trc1 trc2 trc3 tri0 tri1 tri2 tri3 tri4 tri5 tri6 tri7 trc3 trc2 trc1 trc0 | human×2, morph_tri×1, tri×10, morph_tri×1, human×2 |
| tiger | 15 | tig0 tig1 tig2 tig3 tig4 tig5 tig6 tig7 tig8 tig9 tig10 tig11 tig12 tig13 tig14 | human×2, morph_tiger×1, tiger×9, morph_tiger×1, human×2 |
| tigerAir | 5 | tig2 tig3 tig5 tig6 tig7 | morph_tiger×1, tiger×4 |
| tigerLand | 7 | tig8 tig9 tig10 tig11 tig12 tig13 tig14 | tiger×4, morph_tiger×1, human×2 |
| bird | 19 | brc0 brc1 brc2 brc3 bird0 bird1 bird2 bird3 bird4 bird5 bird6 bird7 bird8 bird9 bird10 brc3 brc2 brc1 brc0 | human×2, morph_bird×1, bird×13, morph_bird×1, human×2 |
| birdIn | 4 | brc0 brc1 brc2 brc3 | human×2, morph_bird×1, bird×1 |
| birdFly | 11 | bird0 bird1 bird2 bird3 bird4 bird5 bird6 bird7 bird8 bird9 bird10 | bird×11 |
| birdOut | 4 | brc3 brc2 brc1 brc0 | bird×1, morph_bird×1, human×2 |
| feint | 4 | run13 run12 p10 idle0 | human×4 |
| ultOpen | 6 | p20 p21 p22 p23 p24 p25 | human×6 |
| ultGorilla | 13 | gor0 gor1 gor2 gor3 gor4 gor5 gor6 gor7 gor8 gor9 gor10 gor11 gor12 | human×2, morph_gorilla×1, gorilla×8, morph_gorilla×1, human×1 |
| ultBirdIn | 4 | brc0 brc1 brc2 brc3 | human×2, morph_bird×1, bird×1 |
| ultBird | 11 | bird0 bird1 bird2 bird3 bird4 bird5 bird6 bird7 bird8 bird9 bird10 | bird×11 |
| ultTiger | 15 | tig0 tig1 tig2 tig3 tig4 tig5 tig6 tig7 tig8 tig9 tig10 tig11 tig12 tig13 tig14 | human×2, morph_tiger×1, tiger×9, morph_tiger×1, human×2 |
| ultTri | 16 | trc0 trc1 trc2 trc3 tri0 tri1 tri2 tri3 tri4 tri5 tri6 tri7 trc3 trc2 trc1 trc0 | human×2, morph_tri×1, tri×10, morph_tri×1, human×2 |
| ultPose | 1 | appear2 | human×1 |

## Pixel duplicates in the sheet (kept; noted)

| Cell | Duplicate of |
|---|---|
| gor12 | gor1 |
| gor0 | idle0 |
| gor10 | gor3 |
| gor11 | gor2 |
| trc0 | run7 |
| ak8 | jump8 |
| ak7 | jump7 |
| tig14 | tig0 |
| tig13 | tig1 |
| def8 | def0 |
| def7 | def1 |
| def5 | def3 |
| def6 | def2 |
| icon_r0_c2 | icon_r0_c0 |
| icon_r0_c3 | icon_r0_c1 |
| icon_r0_c4 | icon_r0_c0 |
| icon_r1_c3 | icon_r1_c1 |
| icon_r2_c3 | icon_r2_c1 |
| icon_r3_c3 | icon_r3_c1 |

Unused body cells: ak8, ak7 (pixel duplicates of jump7 / jump8; nothing lost).

## Presentation assets

- Health-icon expressions `icons/expressions.png` (36x29 per cell): grin ×7, blink ×4, smirk ×4, strain ×4, daze ×2, down ×1.
- Cut-in bust `cutscene/bust.png` 51x63 + overlays eye0 @(16,19), eye1 @(33,22), eye2 @(14,14), eye3 @(21,10), mouth0 @(8,28), mouth1 @(8,27), mouth2 @(8,26). Mouths animate the supplied pieces; no voice is synthesised.
- Portrait `portrait.png` 128x128 = the bust ×2 (nearest).
