# MSV1-GOJO — Sprite ledger (Satoru Gojo, Shinjuku Arc)

Source: `assets/incoming/gojo_shinjuku/gojo_shinjuku.png` (790×1780, the FinhJ "Satoru Gojo Shinjuku Arc" JUS-style sheet; credits ZebrasBlack and R0B4N).
Background RGB(33, 31, 63) chroma-keyed (summed channel distance > 18 = opaque). Nearest-neighbour only; no pixel is redrawn except the
one orb half noted below. Rects are sheet pixels **y0,x0 → y1,x1** (the sheet is tall: rows run down the page).
Regenerate: `python3 tools/gojoshinjuku/slice.py && python3 tools/gojoshinjuku/compare.py && python3 tools/gojoshinjuku/ledger.py`.

## Real frame counts (as drawn on the sheet)

| Sheet section | Strip | Frames | Cell (w×h) | Used for |
|---|---|---:|---|---|
| Intro | `intro.png` | 5 | 52×62 | round intro ("Don't worry. I'm the strongest.") |
| Win | `win.png` | 4 | 30×62 | win pose; RCT hold pose (frame 1) |
| Stand | `idle.png` | 4 | 24×63 | idle loop; select portrait (frame 0 head, ×4 nearest) |
| Walk | `walk.png` | 8 | 34×61 | walk forward / back; run (faster) |
| Dash | `dash.png` | 1 | 72×40 | dash glide; Blue Step travel frame |
| Crouch | `crouch.png` | 4 | 38×61 | crouch / land; Sweep (frames 2–3) |
| Jump | `jump.png` | 4 | 42×70 | jump rise / fall; Jump Attack (frames 2–3) |
| Guard | `guard.png` | 2 | 32×57 | block; Falling Blossom Emotion stance |
| Hit | `hit.png` | 6 | 94×60 | hurt (0–1), knockdown / lose / get-up (2–5) |
| Ultimate Action | `ultAction.png` | 3 | 38×62 | the generic ultimate pose; first 3 frames of both Purples |
| A | `a.png` | 6 | 50×61 | A string (A1 = 0–1, A2 = 2–3, A3 = 4–5) |
| B | `b.png` | 5 | 62×60 | B; Blue Fist (same strip); throw wind-up / release (0, 1, 4) |
| C | `c.png` | 5 | 82×58 | C high-kick launcher |
| Red | `red.png` | 5 | 58×61 | Reversal Red / Delayed Red (fingertip burst) |
| Red Rush (lunge) | `redRush.png` | 4 | 48×47 | Red Rush travel frames |
| Red Rush (boxed) | `redRushBox.png` | 1 | 72×60 | Red Rush impact (5th frame); box border removed |
| Lapse: Blue | `lapseBlue.png` | 4 | 58×62 | Lapse Blue cast |
| Maximum Output: Blue | `maxBlue.png` | 5 | 56×62 | Maximum Output Blue cast (frame 4 = the split pose, orb separated into fx/blueOrb.png) |
| Domain | `domain.png` | 4 | 42×62 | Unlimited Void hand sign (the 4 domain frames) |
| 200% Purple (poses) | `purple200.png` | 6 | 58×54 | chant poses, one per incantation line |
| 200% Purple (boxed fire) | `purple200Fire.png` | 1 | 196×86 | the 200% fire frame; purple box border removed |
| Hollow Purple (poses) | `purple.png` | 6 | 52×69 | Hollow Purple: hands apart → Blue + Red raised |
| Hollow Purple (boxed raise) | `purpleRaise.png` | 1 | 38×105 | both orbs raised high; red box border removed |
| Hollow Purple (fire) | `purpleFire.png` | 3 | 46×61 | the push / release |
| Hollow Purple (end) | `purpleEnd.png` | 1 | 38×61 | the recovery pose |

**98 unique body frames** on the sheet, plus 3 effect sprites and 4 chant strips (below).

## Composed game strips (re-ordered copies of the frames above — no new art)

| Strip | Frames | Built from |
|---|---:|---|
| `hurt.png` | 2 | Hit 0–1 |
| `knockdown.png` | 3 | Hit 2–4 |
| `getup.png` | 1 | Hit 5 |
| `lose.png` | 2 | Hit 3–4 (lying) |
| `jumpRise.png` | 2 | Jump 0–1 |
| `fall.png` | 1 | Jump 1 |
| `crouchDown.png` | 3 | Crouch 0–2 |
| `throw.png` | 3 | B 0, 1, 4 |
| `redRushFull.png` | 5 | Red Rush lunge 0–3 + boxed impact |
| `blueStep.png` | 2 | Max Output Blue gesture + Dash |
| `purpleFull.png` | 14 | Ultimate Action 0–2 + Purple 0–5 + boxed raise + fire 0–2 + end |
| `purple200Full.png` | 10 | Ultimate Action 0–2 + 200% poses 0–5 + boxed fire |

## Effect sprites (`assets/gojo_shinjuku/fx/`)

| Sprite | Source rect | Size | Use |
|---|---|---|---|
| `blueOrb.png` | 1352,450 → 1417,515 | 65×65 | Blue fields (Lapse point, Maximum Output orb), Blue Step dot |
| `mergeCircles.png` | 1671,336 → 1727,423 | 56×87 | Hollow Purple merge (Blue + Red meeting) |
| `dome.png` | 1641,537 → 1760,695 | 119×158 | Hollow Purple / 200% impact dome |

## Chant strips (`fx/chant1..4.png`) — kept opaque (purple caption box + letters)

Transcribed exactly as printed on the sheet. These are the 200% Purple incantation captions; lines 1–3 each carry a
timing press, line 4 is the technique name shown as it fires.

| Strip | Source rect | Text on the sheet | Role |
|---|---|---|---|
| `fx/chant1.png` | 1542,46 → 1579,52 | **HENKOU** | line 1 (press window) |
| `fx/chant2.png` | 1533,107 → 1593,119 | **KARASU TO SHOUMYOU** | line 2 (press window) |
| `fx/chant3.png` | 1533,222 → 1581,234 | **HYORI NO HAZAMA** | line 3 (press window) |
| `fx/chant4.png` | 1533,354 → 1588,366 | **KYOSHIKI MURASAKI** | final name (fires) |

## Frame-by-frame source rects

* **intro** (Intro): #0 220,8 → 282,34; #1 220,43 → 282,66; #2 220,76 → 282,107; #3 220,115 → 282,153; #4 220,163 → 282,187
* **win** (Win): #0 307,5 → 369,29; #1 307,32 → 369,61; #2 307,67 → 369,94; #3 307,103 → 369,128
* **idle** (Stand): #0 393,6 → 455,30; #1 392,39 → 455,63; #2 393,71 → 455,95; #3 392,103 → 455,127
* **walk** (Walk): #0 477,5 → 538,27; #1 478,42 → 538,62; #2 479,73 → 538,98; #3 479,106 → 538,130; #4 477,142 → 538,162; #5 478,180 → 538,199; #6 479,214 → 538,244; #7 479,256 → 538,281
* **dash** (Dash): #0 565,3 → 605,64
* **crouch** (Crouch): #0 634,7 → 695,36; #1 636,44 → 695,74; #2 650,82 → 695,117; #3 652,127 → 695,163
* **jump** (Jump): #0 712,6 → 778,40; #1 723,52 → 780,87; #2 715,101 → 776,142; #3 709,153 → 779,178
* **guard** (Guard): #0 800,8 → 855,35; #1 798,56 → 855,86
* **hit** (Hit): #0 877,8 → 935,42; #1 875,50 → 935,87; #2 882,95 → 933,133; #3 898,148 → 934,206; #4 918,224 → 933,292; #5 896,307 → 933,346
* **ultAction** (Ultimate Action): #0 956,10 → 1018,36; #1 956,44 → 1018,79; #2 956,87 → 1018,114
* **a** (A): #0 1040,6 → 1101,35; #1 1045,45 → 1101,80; #2 1046,89 → 1101,121; #3 1046,130 → 1101,175; #4 1046,180 → 1101,224; #5 1045,229 → 1101,260
* **b** (B): #0 1122,5 → 1182,32; #1 1127,41 → 1182,77; #2 1131,87 → 1182,134; #3 1131,150 → 1182,202; #4 1131,205 → 1182,257
* **c** (C): #0 1203,5 → 1258,44; #1 1199,56 → 1257,98; #2 1204,110 → 1257,161; #3 1204,169 → 1257,220; #4 1201,227 → 1257,259
* **red** (Red): #0 1281,6 → 1342,34; #1 1281,45 → 1342,71; #2 1281,80 → 1342,108; #3 1284,119 → 1342,162; #4 1288,168 → 1342,214
* **redRush** (Red Rush (lunge)): #0 1285,246 → 1332,270; #1 1290,280 → 1323,313; #2 1294,320 → 1323,366; #3 1296,377 → 1323,424
* **redRushBox** (Red Rush (boxed)): #0 1282,440 → 1342,492
* **lapseBlue** (Lapse: Blue): #0 1364,7 → 1426,37; #1 1364,47 → 1426,88; #2 1364,96 → 1426,135; #3 1364,143 → 1426,180
* **maxBlue** (Maximum Output: Blue): #0 1364,211 → 1426,237; #1 1364,251 → 1426,284; #2 1364,303 → 1426,341; #3 1368,349 → 1426,395; #4 1368,417 → 1426,459
* **domain** (Domain): #0 1451,7 → 1513,33; #1 1451,47 → 1513,80; #2 1451,87 → 1513,115; #3 1458,133 → 1513,166
* **purple200** (200% Purple (poses)): #0 1560,6 → 1611,52; #1 1560,64 → 1611,110; #2 1557,124 → 1611,170; #3 1557,185 → 1611,231; #4 1557,245 → 1611,291; #5 1557,303 → 1611,349
* **purple200Fire** (200% Purple (boxed fire)): #0 1529,393 → 1615,543
* **purple** (Hollow Purple (poses)): #0 1686,3 → 1747,31; #1 1686,42 → 1747,68; #2 1686,79 → 1747,104; #3 1686,119 → 1747,156; #4 1678,167 → 1747,196; #5 1678,220 → 1747,245
* **purpleRaise** (Hollow Purple (boxed raise)): #0 1642,274 → 1747,311
* **purpleFire** (Hollow Purple (fire)): #0 1687,432 → 1745,454; #1 1685,461 → 1746,488; #2 1687,494 → 1746,533
* **purpleEnd** (Hollow Purple (end)): #0 1685,708 → 1746,742

## Excluded (and only these)

* Header banner: everything above y = 196 (title / credits banner).
* Row labels: the white "Intro:", "Win:", "Stand:" … captions (removed by the component / top-row rule).
* Dividers: 1276,222 → 1347,239; 1359,185 → 1430,202.
* Box borders: the coloured frames around the boxed frames — redRushBox RGB(255, 25, 25) at 1274,435 → 1345,499; purple200Fire RGB(208, 31, 255) at 1528,390 → 1616,544; purpleRaise RGB(255, 27, 25) at 1641,261 → 1750,326. Only the 1–2 px border is dropped; the pose inside is used.
* A 3-pixel stray speck at about y 790, x 214, beside the Guard row. It is not a frame (no body, no outline) and is ignored.

## Hand fixes (stated, minimal)

* **Maximum Output Blue orb.** On the sheet the orb touches Gojo's fingertip in the last Max Output frame. The pose
  and the orb were split (column 452 plus a circle fit). The orb's **left half was rebuilt by mirroring its
  clean right half** (axis at the orb centre), so `fx/blueOrb.png` is symmetric with a ~2 px doubled centre sparkle.
  The pose keeps its own pixels; the fingertip stays on the pose.
* Jump frame 0 had a label pixel touching the hair; the label component is removed, the hair is not.

## Anchoring

* Every strip uses a symmetric cell: `originX` = cell centre, `originY` = feet row, so mirroring keeps the feet still.
* Standing frames are aligned on the head (top 14 rows); lying frames (knockdown / lose) on the feet.
* Drawn at `spriteScale` 2 (integer nearest-neighbour): the stand frame is ~63 px → ~126 px on screen, the old Gojo is ~112 px.

## Derived art

* Select portrait `portrait.png` (128×96): the stand frame's head, ×4 nearest.
* Blood map `data/bloodmaps/gojo_shinjuku.json` (tools/bloodmap/build.py, HUMAN).
* Edo Tensei skin: `<strip>__edo.png` beside every strip + `portrait__edo.png` (tools/edoskin/gen.py, HUMAN).
* `docs/msv1/gojo/compare.png`: every strip at ×2 with its cell grid and origin mark, beside the sheet.
