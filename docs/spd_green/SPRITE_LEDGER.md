# S.P.D. Green Ranger — Sprite Ledger

Source: `Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Power Rangers - Green Ranger.png`
(727×1160 RGB, sha256 `cd3c4810…4dee60`). The sheet credits "ripped by the FRANKETE, for TSR" on its WANTED-poster panel.
Extractor: `tools/spd_green/extract.py`, which writes `docs/spd_green/source_rects.json` and `docs/spd_green/contact_sheet.png`.

## Keying policy
- Two background colours are verified: the outer sheet colour (57,182,52) and the inner cell fill (128,255,123).
- Only the **exact cell fill** is keyed, and only inside verified cell rects. This is **not** a global green erase.
- The outer colour appears in 79 pixels inside cells: acro2/3 (1 each), arc6 (66) and arc7 (11). These are suit shading (legs) and are **kept**.
- Nearest-neighbour only. Frames are 144×96 with origin (64,84) and the anchor at the cell bottom.
- Excluded from body art: the credit panel [620,18,102,118] and 13 left-column controller glyphs (input labels).

## Cells → use
| Cell(s) | Rect source row | Used for |
|---|---|---|
| ready0-1 | y8 | idle; ready0 also getup end, win end, portrait crop |
| run0-7 | y72 | walk / run / walk_back (reversed) / dash (run1) |
| jump0, jump1 | y200 | jump, fall; jump0 = Rising Arc rise |
| guard0 | y272 | guard |
| fall0-4 | y328 | hurt (fall0), knockdown (0-2), getup (3-4) |
| ground1, ground2 | y384 | low (ground1), crouch + Aura Read kneel (ground2) |
| kick0-2 | y448 | J2 (kick0-1), J3 + marked follow-up (kick1-2) |
| strike0-1 | y512 | J1, grab |
| acro0-4 | y583 | launcher (acro0-1), Acrobat Step handstand (acro2-4) |
| airKick0-1 | y648 | air normal, down-air, Heel Return, Rising Arc hit |
| flyKick0 | y720 | Forward+Heavy opener |
| arc1-7 | y776 | Read and Retreat (1-3), heavy / string ender (4-5), win (6), intro + scan (7) |
| aim0-2 | y840 | Deltamax Check (aim0-2), string mid (aim0-1) |
| fire0-2 | y976 | `ultimate` sequence, reserved for the shared Zord call. **Not shown in play** until that integration exists |
| streak0-1 | y1040 (effect) | phase-step streak ghosts (`fx_streak0/1.png`) |
| beam0-2 | y1120 (effect) | beam1 = Deltamax shot projectile (`fx_beam1`); beam0/2 exported, unused |

## Unused in animation (kept and documented, not invented around)
`crouchReady0`, `ground0`, `arc0` and `airAim0`, plus the beam0/beam2 FX. No art was fabricated: every move uses sheet cells.
