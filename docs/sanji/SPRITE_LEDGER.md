# Sanji — Sprite Ledger

Source: `assets/incoming/sanji/sanji_sheet.png` (GBA *One Piece*, ripped by Paddy) · SHA-256 `0d8672a77764727c2d27691edcfd4596d88816106d29d7f68d84231d3e42a29a`

Cut: alpha chroma key (background already alpha-0) → 8-connected component masks (`tools/sanji_build/frames.py`) → 1:1 pixel copy, nearest-neighbour only, NO invented art. Cells 320×256, feet at y=150, pivot x=160 (Luffy/Zoro convention, same ripper and scale). Regenerate: `python3 -I tools/sanji_build/extract.py .` then `python3 -I tools/sanji_build/ledger.py .`

## Real frame counts per row

| Row | Brief said | Real | Content |
|---|---|---|---|
| R1 | 6 | **6** | stance/idle set (F1–F4), F5 a PUNCH inside a BLUE arc (deflect pose only), F6 a high kick |
| R2 | 3 | **3** | knee/front kick, BIG blue crescent kick, long low front kick |
| R3 | 5 | **5** | tuck, HANDSTAND kick (blue arc), handstand split, one-hand low sweep, handstand rising kick — *the handstand frames are here, not R4* |
| R4 | ~10 | **11** | somersault, crouch-turn, high kick (blue arc), raised axe kick, knee chamber, spin kick (swirl), front kick, knee, rising knee, bent high back-kick, low lunge |
| R5 | ~8 | **11** (+4 steam specks) | serving a PLATE of roast meat (F1–F7), crouches (F8–F9), leap (F10), the plate alone (F11) |
| R6 | 4 | **6** | hands-in-pockets standing poses with the CIGARETTE |
| R7 | 4+2 | **6** | 3 smoking poses (smoke puff), hunched, kneeling (+sweat specks), lying knockdown |
| R8 | 2 | **2** | "love mode" serving a COCKTAIL GLASS on a tray |
| R9 | 2 | **4** + Merry + credit | rising front-kick series low→high; Going Merry figurehead; ripper credit |

**54 frames, every one used.** The only exclusion is the credit text.

## The two objects

* **R5 yellow object = a PLATE (a dish of roast meat on a white/red plate).** → R5F11 (the plate alone) is the **PLATE KICK projectile** (`assets/sanji/fx_plate.png`, derived copy: crop + mirror). R5F1–F7 are his serving taunt; R5F5 is the Plate Kick flick.
* **R8 red/white object = a COCKTAIL GLASS** (red drink, lemon slice, straw) on a tray. → **win-pose prop** (WIN 3 `winGlass`) and the **Heat-bar badge** (`fx_glass.png`, derived copy: crop of R8F1 rows 0–15). The CIGARETTE is in the R6/R7 standing frames (white stick at the mouth); the Heat-reactive glowing tip is a render-only glow drawn at that mouth point.

## Special entries

| Entry | Treatment |
|---|---|
| Going Merry figurehead (R9) | **reused existing One Piece emblem** `assets/zoro/merry.png` (added by Zoro). Not duplicated. |
| Credit text "Ripped by Paddy / No credit needed" (R9) | **excluded, credit** → `docs/sanji/CREDITS.md` |
| Blue motion arcs R2F2, R3F2, R4F3 (+R1F5 deflect) | base kick trails; **tint** copies (`*_dj.png`: arc pixels blue→orange-white, `tools/sanji_build/arcs.py`) for Diable Jambe |
| Every body frame | **derived copy (mirror)**: the sheet faces left; stored right-facing, the engine flips at runtime |
| R6F1 bust | **derived copy (crop)** → `portrait.png` |
| Afterimages (Mouton / Sky Walk / PTKC) | render-only re-draws of the live frame at an offset, translucent (**derived copy**, no new pixels) |

## HANDS RULE audit

Audited at 4x zoom, extremity by extremity (shoe = dark-blue boot with brown sole; hand = skin colour). Every striking animation uses a kick, knee or shin frame. **R1F5 is a PUNCH** (forearm + fist forward inside the blue arc) — the brief listed it among the kicks — so it is used ONLY as the `guard_hit` forearm-deflect pose, never a strike; COLLIER uses the R4F4 high kick instead. Frames with hands forward (R1F2 lighting the cigarette, R1F4 reeling, R5 serving, R8 serving) are only ever poses (intro, hurt, taunt, win). Fists held at the chest during a kick (R4F3, R4F8) are a guard, not a strike. Intro, idle, WIN 1/2 and the walk use hands-in-pockets frames (R6/R7) or the kick flourish (R9): no fist is raised in any intro, idle or win pose.

## Frame → animation → trigger

| # | Frame | Rect (sheet, incl.) | Animations → trigger |
|---|---|---|---|
| 1 | R1F1 | (4, 0, 37, 53) | `run` → run |
| 2 | R1F2 | (49, 14, 77, 54) | `sIntroLight` → INTRO step 2: lights the cigarette, first drag<br>`sIntroLight` → INTRO step 2: lights the cigarette, first drag |
| 3 | R1F3 | (87, 3, 112, 54) | `run` → run |
| 4 | R1F4 | (121, 2, 158, 54) | `hurt` → hitstun |
| 5 | R1F5 | (167, 2, 209, 53) | `guard_hit` → blockstun (forearm deflect pose)<br>Diable Jambe *_dj strips (tint: blue arcs → orange-white) |
| 6 | R1F6 | (224, 3, 274, 53) | `sEpaule` → EPAULE (→+L) — Course 2<br>`sPTKC` → PARTY TABLE KICK COURSE (super) |
| 7 | R2F1 | (2, 71, 35, 122) | `guard` → block (leg check)<br>`grab` → grab (knee clinch)<br>`throw` → throw (kick-throw)<br>`sCollier` → COLLIER (L) — Course 1<br>`sPlate` → PLATE KICK (↓↙←+B) |
| 8 | R2F2 | (50, 63, 97, 123) | `sReversal` → wake-up reversal (neutral A)<br>`sMouton` → MOUTON SHOT (↓↘→+A)<br>Diable Jambe *_dj strips (tint: blue arcs → orange-white) |
| 9 | R2F3 | (107, 75, 157, 123) | `throw` → throw (kick-throw)<br>`sGigot` → GIGOT (↘+L) — Course 6, low<br>`sHachis` → PREMIER HACHIS (↓↙←+A)<br>`sPTKC` → PARTY TABLE KICK COURSE (super) |
| 10 | R3F1 | (1, 145, 27, 188) | `fall` → falling<br>`sMouton` → MOUTON SHOT (↓↘→+A) |
| 11 | R3F2 | (42, 137, 105, 189) | `sHandstand` → handstand spin (↓+H) — swaps facing<br>`sHandstand` → handstand spin (↓+H) — swaps facing<br>`sIgnite` → DIABLE JAMBE ignite (A+B, ≥50 Heat)<br>Diable Jambe *_dj strips (tint: blue arcs → orange-white) |
| 12 | R3F3 | (114, 152, 177, 189) | `sHandstand` → handstand spin (↓+H) — swaps facing<br>`sIgnite` → DIABLE JAMBE ignite (A+B, ≥50 Heat) |
| 13 | R3F4 | (184, 150, 227, 188) | `sCrouchKick` → crouch kick (↓+L)<br>`sHachis` → PREMIER HACHIS (↓↙←+A) |
| 14 | R3F5 | (243, 141, 301, 188) | `sMouton` → MOUTON SHOT (↓↘→+A)<br>`sPTKC` → PARTY TABLE KICK COURSE (super) |
| 15 | R4F1 | (0, 222, 36, 257) | `hurt_air` → air hitstun<br>`knockdown` → knocked down<br>`sConcasse` → CONCASSE (air ↓↓+A)<br>`sSkyWalk` → SKY WALK (air ↓↘→+B) |
| 16 | R4F2 | (46, 211, 78, 257) | `sCotelette` → COTELETTE (H) — Course 3<br>`sGigot` → GIGOT (↘+L) — Course 6, low |
| 17 | R4F3 | (86, 204, 133, 257) | `sCotelette` → COTELETTE (H) — Course 3<br>`sPTKC` → PARTY TABLE KICK COURSE (super)<br>Diable Jambe *_dj strips (tint: blue arcs → orange-white) |
| 18 | R4F4 | (138, 205, 188, 257) | `sCollier` → COLLIER (L) — Course 1<br>`sPTKC` → PARTY TABLE KICK COURSE (super) |
| 19 | R4F5 | (200, 204, 235, 257) | `sSelle` → SELLE (→+H) — Course 4<br>`up` → anti-air knee (↑+H / Up-Attack) |
| 20 | R4F6 | (246, 203, 274, 257) | `sReversal` → wake-up reversal (neutral A)<br>`sIgnite` → DIABLE JAMBE ignite (A+B, ≥50 Heat)<br>`sIgnite` → DIABLE JAMBE ignite (A+B, ≥50 Heat) |
| 21 | R4F7 | (281, 205, 327, 256) | `sSelle` → SELLE (→+H) — Course 4<br>`sPTKC` → PARTY TABLE KICK COURSE (super) |
| 22 | R4F8 | (336, 208, 365, 258) | `up` → anti-air knee (↑+H / Up-Attack) |
| 23 | R4F9 | (376, 211, 411, 258) | `air` → air kick (air L/H)<br>`down_air` → air ↓ kick |
| 24 | R4F10 | (416, 215, 467, 258) | `sAntiManner` → ANTI-MANNER KICK COURSE (→→+A)<br>`sConcasse` → CONCASSE (air ↓↓+A)<br>`sPTKC` → PARTY TABLE KICK COURSE (super) |
| 25 | R4F11 | (471, 214, 513, 258) | `dash` → ground dash<br>`sHachis` → PREMIER HACHIS (↓↙←+A)<br>`sHachis` → PREMIER HACHIS (↓↙←+A) |
| 26 | R5F1 | (1, 273, 34, 335) | `taunt` → taunt: serves the dish |
| 27 | R5F2 | (44, 280, 85, 335) | `taunt` → taunt: serves the dish |
| 28 | R5F3 | (89, 279, 133, 335) | `taunt` → taunt: serves the dish |
| 29 | R5F4 | (138, 278, 180, 336) | `taunt` → taunt: serves the dish |
| 30 | R5F5 | (186, 277, 221, 336) | `taunt` → taunt: serves the dish<br>`sPlate` → PLATE KICK (↓↙←+B) |
| 31 | R5F6 | (224, 277, 262, 336) | `taunt` → taunt: serves the dish |
| 32 | R5F7 | (275, 298, 306, 335) | `taunt` → taunt: serves the dish |
| 33 | R5F8 | (314, 296, 339, 334) | `crouch` → hold ↓<br>`getup` → wake-up |
| 34 | R5F9 | (348, 300, 370, 334) | `getup` → wake-up<br>`sCrouchKick` → crouch kick (↓+L) |
| 35 | R5F10 | (380, 275, 407, 332) | `jump` → jump (rising)<br>`air` → air kick (air L/H)<br>`sSkyWalk` → SKY WALK (air ↓↘→+B) |
| 36 | R5F11 | (413, 318, 434, 335) | fx_plate (Plate Kick projectile) |
| 37 | R6F1 | (8, 347, 25, 401) | `idle` → neutral standing (hands in pockets, cigarette)<br>portrait (derived copy: crop of the bust) |
| 38 | R6F2 | (32, 346, 49, 401) | `idle` → neutral standing (hands in pockets, cigarette) |
| 39 | R6F3 | (50, 346, 71, 401) | `walk` → walk forward<br>`walk_back` → walk back<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`win2` → WIN 2: kick flourish → pocket pose |
| 40 | R6F4 | (76, 347, 98, 401) | `idleLong` → idle > 10 s: exhales smoke, settles his tie<br>`walk` → walk forward<br>`walk_back` → walk back<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`intro` → INTRO step 1: walks in, hands in pockets |
| 41 | R6F5 | (111, 346, 129, 401) | `walk` → walk forward<br>`walk_back` → walk back<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`intro` → INTRO step 1: walks in, hands in pockets |
| 42 | R6F6 | (135, 347, 152, 401) | `walk` → walk forward<br>`walk_back` → walk back<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`intro` → INTRO step 1: walks in, hands in pockets<br>`intro` → INTRO step 1: walks in, hands in pockets |
| 43 | R7F1 | (7, 412, 30, 465) | `idleLong` → idle > 10 s: exhales smoke, settles his tie<br>`sIntroLight` → INTRO step 2: lights the cigarette, first drag<br>`win` → WIN 1: smoking, hands in pockets |
| 44 | R7F2 | (39, 412, 62, 465) | `idleLong` → idle > 10 s: exhales smoke, settles his tie<br>`idleLong` → idle > 10 s: exhales smoke, settles his tie<br>`sIntroLight` → INTRO step 2: lights the cigarette, first drag<br>`win` → WIN 1: smoking, hands in pockets |
| 45 | R7F3 | (68, 412, 91, 465) | `idleLong` → idle > 10 s: exhales smoke, settles his tie<br>`win` → WIN 1: smoking, hands in pockets |
| 46 | R7F4 | (99, 414, 124, 465) | `hurt_heavy` → heavy hitstun |
| 47 | R7F5 | (137, 420, 172, 465) | `lose` → LOSE: kneels → lies down |
| 48 | R7F6 | (185, 446, 220, 465) | `knockdown` → knocked down<br>`lose` → LOSE: kneels → lies down |
| 49 | R8F1 | (7, 475, 34, 522) | `winGlass` → WIN 3: the cocktail-glass prop<br>fx_glass (derived copy: crop of the glass → Heat-bar badge) |
| 50 | R8F2 | (44, 475, 71, 522) | `winGlass` → WIN 3: the cocktail-glass prop |
| 51 | R9F1 | (7, 530, 45, 582) | `win2` → WIN 2: kick flourish → pocket pose<br>`sPoitrine` → POITRINE (←+H) — Course 5, launches |
| 52 | R9F2 | (56, 530, 93, 582) | `win2` → WIN 2: kick flourish → pocket pose<br>`sPoitrine` → POITRINE (←+H) — Course 5, launches<br>`sPTKC` → PARTY TABLE KICK COURSE (super) |
| 53 | R9F3 | (102, 531, 134, 582) | `win2` → WIN 2: kick flourish → pocket pose<br>`sPoitrine` → POITRINE (←+H) — Course 5, launches<br>`sAntiManner` → ANTI-MANNER KICK COURSE (→→+A) |
| 54 | R9F4 | (143, 531, 175, 582) | `win2` → WIN 2: kick flourish → pocket pose<br>`sEpaule` → EPAULE (→+L) — Course 2<br>`sAntiManner` → ANTI-MANNER KICK COURSE (→→+A)<br>`sConcasse` → CONCASSE (air ↓↓+A)<br>`sPTKC` → PARTY TABLE KICK COURSE (super) |

## Animation → frames

See `tools/sanji_build/extract.py` `ANIMS` (source of truth) and `sanjiSprites.js` (generated).
