# Thunder Megazord (shared) — LEDGER

Source: `Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Zords - Thunder Megazord.gif`
- sha256 `f6f8eaecaa6e051b46f874fbb872517516e419489e3e89e7b3ba30598fcc9060` · 410×740 · transparency index 0 (indexed key only)
- Credit line (y ≥ 713, 20 glyph components, box 127,713,127,12): **"Sprites Ripped by Belial"** → `assets/power_rangers/thunder_megazord/credit_panel.png`.
- Cells are drawn feet-anchored, ×2.4, flipped by `face` (+1 = authored facing right). Contact boxes come from sortie profiles in `mmprPinkData.js`, never from pixels. The Megazord has no HP, no hurtbox, never body-blocks and never tracks.
- Fall / prone / kneel cells are never used as attacks.

| Cell | Rect | Face | Status | Used in |
|---|---|---|---|---|
| ready0 | 3,2,55,87 | 1 | used | ready |
| ready1 | 63,2,55,86 | 1 | **unused** | alternate idle; ready0 is enough for the brief on-screen presence |
| draw0 | 129,3,75,86 | 1 | used | hwind |
| guard0 | 219,3,59,88 | -1 | used | guard |
| walk0 | 2,94,60,95 | 1 | used | step |
| walk1 | 67,100,57,87 | 1 | used | step |
| walk2 | 128,99,54,86 | 1 | used | step |
| walk3 | 188,98,56,88 | 1 | used | step |
| walk4 | 250,98,58,89 | 1 | used | step |
| walk5 | 315,101,60,87 | 1 | used | step |
| windup0 | 3,212,107,88 | 1 | used | uwindL |
| raise0 | 119,191,86,112 | 1 | used | raise |
| hslash0 | 219,205,112,96 | 1 | used | hslash |
| lunge0 | 5,324,104,76 | 1 | **unused** | lunge pose; no sortie needs it |
| low0 | 120,326,70,74 | 1 | used | uwind |
| rslash0 | 196,298,117,99 | 1 | used | uslash |
| over0 | 330,295,54,104 | 1 | used | dwind |
| front0 | 5,419,72,88 | 1 | **unused** | front-facing pose — cannot face left/right meaningfully |
| back0 | 82,410,66,96 | 1 | **unused** | sword-back pose; draw0 is used for the Thunder Line wind-up |
| thrust0 | 159,420,94,83 | 1 | used | thrust |
| rslash1 | 259,404,91,104 | 1 | used | uslash |
| over1 | 361,405,47,104 | 1 | used | dwind |
| dslash0 | 1,520,76,102 | 1 | used | dtop |
| sweep0 | 84,538,77,80 | 1 | used | dslash |
| ready2 | 173,529,73,80 | 1 | **unused** | front ready; ready0 used |
| brace0 | 260,521,66,87 | 1 | used | brace |
| fall0 | 6,643,88,71 | 1 | **unused** | FALL pose — never used as an attack by policy |
| prone0 | 102,624,87,39 | 1 | **unused** | PRONE — never used as an attack |
| prone1 | 103,668,88,27 | 1 | **unused** | PRONE — never used as an attack |
| kneel0 | 194,637,80,62 | 1 | **unused** | kneeling recovery — no sortie ends kneeling |
| kneel1 | 281,628,53,69 | 1 | **unused** | kneeling recovery — unused |
| brace1 | 345,618,56,85 | 1 | used | brace, exit |
