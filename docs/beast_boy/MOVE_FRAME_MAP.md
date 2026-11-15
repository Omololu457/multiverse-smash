# Beast Boy — move → frame map

Generated from `beastBoyData.js` (frame data + `TIMELINE`) and `source_rects.json` (strip cells) by `tools/beast_boy/write_docs.py`.
Elapsed tick → strip frame; startup = frames before the first active frame. Stored damage = round(raw × 1.7); the shared damage path applies ≈ raw on a fresh hit (measured).

## Frame data

| Move | Raw | Startup | Active | Recovery | Total | Hitstun | Blockstun | Cost | Box | returnAt | Forms (tick → form) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| light | 17 | 5 | 2 | 9 | 16 | 16 | 9 |  | 50x44 |  | human |
| bJ2 | 21 | 7 | 2 | 12 | 21 | 18 | 10 |  | 64x44 |  | human |
| bJ3 | 28 | 10 | 3 | 18 | 31 | 22 | 12 |  | 62x44 |  | human |
| heavy | 52 | 14 | 3 | 22 | 39 | 28 | 14 |  | 78x44 |  | human |
| bLow | 24 | 8 | 2 | 16 | 26 | 20 | 11 |  | 60x28 |  | human |
| up | 40 | 12 | 3 | 22 | 37 | 30 | 13 |  | 50x104 |  | human |
| air | 30 | 8 | 3 | 14 | 25 | 24 | 9 |  | 64x52 |  | human |
| bAdv | 24 | 11 | 3 | 17 | 31 | 24 | 12 |  | 56x44 |  | human |
| bStr | 30 | 12 | 3 | 19 | 34 | 26 | 13 |  | 74x44 |  | human |
| bKnock | 40 | 15 | 3 | 24 | 42 | 28 | 14 |  | 78x44 |  | human |
| gorilla | 58 | 15 | 4 | 30 | 49 | 37 | 14 | 15 | [-6, 98, 70, 46] | 45 | 0:human 5:morph 9:gorilla 39:morph 45:human |
| tricera | 64 | 20 | 32 | 26 | 78 | 30 | 16 | 20 | [-4, 46, 58, 50] | 66 | 0:human 10:morph 15:tricera 61:morph 66:human |
| tiger | 52 | 13 | 3 | 34 | 50 | 28 | 13 | 18 | [-10, 84, 62, 52] | 42 | 0:human 4:morph 7:tiger 38:morph 42:human |
| tigerA | 52 | 11 | 4 | 999 | until landing | 26 | 13 | 18 | [-12, 78, 64, 60] |  | 0:morph 4:tiger |
| tigerLand | 0 | 1 | 1 | 22 | 24 | 16 | 9 |  | none | 16 | 0:tiger 12:morph 16:human |
| bird | 28 | 10 | 24 | 16 | 50 | 22 | 11 | 12 | [-8, 46, 58, 50] | 42 | 0:human 6:morph 8:bird 38:morph 42:human |
| feint | 0 | 6 | 1 | 14 | 21 | 16 | 9 | 8 | none |  | human |
| ultOpen | 25 | 28 | 3 | 60 | 91 | 40 | 16 | 100 | 70x44 |  | human |

## Timelines

| Strip | Strip cells | Tick → frame |
|---|---|---|
| light | p21 p22 p25 | 0→0 5→1 10→2 |
| bJ2 | p11 p12 p14 p17 | 0→0 4→1 7→2 14→3 |
| bJ3 | p20 p21 p22 p23 p24 p25 | 0→0 4→1 10→2 13→3 18→4 25→5 |
| heavy | p10 p11 p12 p13 p14 p15 p16 p17 p18 | 0→0 3→1 7→2 11→3 14→4 17→5 22→6 28→7 34→8 |
| bLow | ak1 ak2 ak3 ak5 | 0→0 4→1 8→2 16→3 |
| up | land4 ak5 ak6 ak9 | 0→0 9→1 12→2 26→3 |
| air | ak0 ak1 ak2 ak3 ak4 ak5 ak6 | 0→0 3→1 6→2 8→3 11→4 16→5 21→6 |
| bAdv | run9 run10 p21 p22 p25 | 0→0 4→1 8→2 11→3 20→4 |
| bStr | p11 p12 p14 p15 p17 | 0→0 6→1 12→2 15→3 24→4 |
| bKnock | p12 p13 p14 p15 p16 p17 p18 | 0→0 6→1 15→2 18→3 24→4 31→5 37→6 |
| gorilla | gor0 gor1 gor2 gor3 gor4 gor5 gor6 gor7 gor8 gor9 gor10 gor11 gor12 | 0→0 2→1 5→2 9→3 12→4 15→5 17→6 19→7 24→8 29→9 34→10 39→11 45→12 |
| tricera | trc0 trc1 trc2 trc3 tri0 tri1 tri2 tri3 tri4 tri5 tri6 tri7 trc3 trc2 trc1 trc0 | 0→0 5→1 10→2 15→3 18→4 21→5 24→6 27→7 30→8 33→9 36→10 39→11 42→4 45→5 48→6 51→7 52→11 56→12 61→13 66→14 71→15 |
| tiger | tig0 tig1 tig2 tig3 tig4 tig5 tig6 tig7 tig8 tig9 tig10 tig11 tig12 tig13 tig14 | 0→0 2→1 4→2 7→3 10→4 13→5 16→6 19→7 22→8 26→9 30→10 34→11 38→12 42→13 46→14 |
| bird | brc0 brc1 brc2 brc3 bird0 bird1 bird2 bird3 bird4 bird5 bird6 bird7 bird8 bird9 bird10 brc3 brc2 brc1 brc0 | 0→0 3→1 6→2 8→3 10→4 12→5 14→6 16→7 18→8 20→9 22→10 24→11 26→12 28→13 30→14 32→4 34→15 38→16 42→17 46→18 |
| tigerA | tig2 tig3 tig5 tig6 tig7 | 0→0 4→1 8→2 11→3 14→4 |
| tigerLand | tig8 tig9 tig10 tig11 tig12 tig13 tig14 | 0→0 3→1 6→2 9→3 12→4 16→5 20→6 |
| feint | run13 run12 p10 idle0 | 0→0 4→1 8→2 14→3 |
| ultOpen | p20 p21 p22 p23 p24 p25 | 0→0 8→1 20→2 28→3 31→4 60→5 |
| ultPose | appear2 | 0→0 |
| ultGorilla | gor0 gor1 gor2 gor3 gor4 gor5 gor6 gor7 gor8 gor9 gor10 gor11 gor12 | 0→0 2→1 5→2 9→3 12→4 15→5 17→6 19→7 24→8 29→9 34→10 39→11 45→12 |
| ultTiger | tig0 tig1 tig2 tig3 tig4 tig5 tig6 tig7 tig8 tig9 tig10 tig11 tig12 tig13 tig14 | 0→0 2→1 4→2 7→3 10→4 13→5 16→6 19→7 22→8 26→9 30→10 34→11 38→12 42→13 46→14 |
| ultTri | trc0 trc1 trc2 trc3 tri0 tri1 tri2 tri3 tri4 tri5 tri6 tri7 trc3 trc2 trc1 trc0 | 0→0 5→1 10→2 15→3 18→4 21→5 24→6 27→7 30→8 33→9 36→10 39→11 42→4 45→5 48→6 51→7 52→11 56→12 61→13 66→14 71→15 |
| ultBirdIn | brc0 brc1 brc2 brc3 | 0→0 3→1 6→2 8→3 |
| ultBird | bird0 bird1 bird2 bird3 bird4 bird5 bird6 bird7 bird8 bird9 bird10 | 0→0 2→1 4→2 6→3 8→4 10→5 12→6 14→7 16→8 18→9 20→10 22→0 24→1 26→2 28→3 30→4 32→5 34→6 36→7 38→8 |

## Hurtboxes per form (centre dx toward facing, width, top above feet, height)

| Form | Box |
|---|---|
| human | engine default (humanoid) |
| morph | engine default (humanoid) |
| gorilla | {'dx': 4, 'w': 64, 'top': 86, 'h': 86} |
| tricera | {'dx': 10, 'w': 96, 'top': 66, 'h': 66} |
| tiger | {'dx': 12, 'w': 90, 'top': 64, 'h': 64} |
| bird | {'dx': 2, 'w': 46, 'top': 58, 'h': 54} |

## Ultimate schedule (frames from confirm; frozen-cinematic contract)

Total 260 f, cut-in 30 f, settle at 235.

| Contact | Frame | Raw |
|---|---|---|
| gorilla | 45 | 45 |
| bird | 92 | 30 |
| tiger | 128 | 60 |
| tricera | 187 | 100 |

| Beat | From frame | Strip |
|---|---|---|
| 0 | 0 | ultPose |
| 1 | 30 | ultGorilla |
| 2 | 75 | ultBirdIn |
| 3 | 85 | ultBird |
| 4 | 115 | ultTiger |
| 5 | 165 | ultTri |
| 6 | 235 | ultPose |

Rationale: every animal plays its complete supplied sequence (human → morph → animal → morph → human); the one hit opportunity sits on the authored contact cells (gorilla kick extension, triceratops charge loop, tiger slash, bird flight); Wild Chain executes at `returnAt` (the first humanoid-return cell).
