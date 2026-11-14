# S.P.D. Pink — Sprite Ledger

Source sheet: `Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Power Rangers - Pink Ranger.png`
- sha256 `cffc6031bbf8058032bae24848039bad41e690b3440983631239f658081c8b04`, 727×1160 RGB.
- Outer background is (255,91,124) and the cell fill is (255,154,195). The credit panel at [580,15,102,118] is never extracted.
- Extraction: `tools/spd_pink/extract.py` (deterministic). Rects are in `source_rects.json`; the contact sheet is `contact_sheet.png`.
- 49 cells in these bands: ready 2 · run 8 · crouch 1 · jump 2 · guard 1 · fall 5 · slash 3 · acro 4 · raise 2 · punch 2 · airKick 2 · flip 1 · kick 4 · aim 3 · airAim 1 · fire 3 · streak 2 · beam 3.
- Only the exact cell fill is keyed out. The single outer-colour notch, 12 px inside cell punch1 at (104,584), is keyed by its listed coordinates. Any other outer-colour pixel aborts extraction.
- The anchor is `stance_x`, the centre of the bottom 6 opaque rows. The portrait is a crop (9,0,29,20) of ready0, scaled ×5 nearest-neighbour.

| Sequence | Cells |
|---|---|
| idle / walk / run / walk_back / dash | ready0-1 / run0-7 |
| jump / fall / crouch / guard | jump0-1 / fall0-4 / crouch0 / guard0 |
| hurt / knockdown / getup | fall cells |
| light, pJ2, pJ3 | [ready1,slash0], [slash0,slash1], [acro0,punch1] |
| heavy (+heavyIron), pLow, up | [kick0,kick1], [acro3], [kick2,kick3] |
| air / down_air | airKick |
| pCheck, pKick, pAway | [slash1,slash2], [kick0,kick1], [acro1,acro2] |
| pPrep, pShot, pBreaker (+Iron), pRise | [crouch0,raise0], aim0-2, [punch0,punch1], [kick2,raise1] |
| pStance, pReprisal, pRose | [guard0,crouch0], [slash0,slash2], [airKick0,flip0] |
| **variety:** pSweep, pEvade, pAirShot, pVault | [acro2,acro3], [acro1,fall4], [airAim0], [jump1,flip0] |
| **variety:** pBar1, pBar2, pBar3 | [acro0], [punch1], [slash0,slash2] |
| ultimate (reserved Zord call), grab, win, intro | fire0-2, punch, raise, ready |
| FX (not character strips) | streak0-1 → fx_streak0/1 (phase-step ghosts), beam0-2 → fx_beam0/1/2 (Deltamax shot) |

No cell is invented or redrawn. The skins are palette remaps of these sheets (`tools/spd_pink/build_skins.py`).
