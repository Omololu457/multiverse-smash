# Yamamoto Genryūsai — Skin Bank (pre-drawn palette-header costumes)

The source sheet ships a **palette header (rows 1–4)** with **8 real, pre-drawn costume-color
variants**, all sharing one neutral standing pose. These are BANKED here as the foundation for a
future skins batch — **not built into the live skins.js roster yet** (Stage 7 only confirms extraction).

## Source
- `yamamoto_clean/row_01.png` — 4 solid costume figures (peak column-density ~59)
- `yamamoto_clean/row_03.png` — 4 solid costume figures
- Rows 02 / 04 are tiny label swatches (negligible); the faint ~24-density runs between the solid
  figures are JPEG-ghosted duplicates, skipped by the `peakDens > 40` solid-figure filter.

## Extracted variants → `yamamoto_skin_bank/costume_NN_<color>.png`
Extracted by `tools/` inline banking step (4 from row 1 + 4 from row 3), padded to a uniform
64×68 feet-aligned cell. The color names follow the confirmed design's palette read:

| # | file | hakama color |
|---|------|--------------|
| 0 | costume_00_navy_blue.png    | navy / blue |
| 1 | costume_01_maroon_wine.png  | maroon / wine |
| 2 | costume_02_ice_blue.png     | ice-blue |
| 3 | costume_03_forest_green.png | olive / forest-green |
| 4 | costume_04_olive_khaki.png  | olive / khaki |
| 5 | costume_05_ghost_white.png  | ghost-white |
| 6 | costume_06_violet_purple.png| violet / purple |
| 7 | costume_07_crimson_red.png  | crimson-red |

The **portrait** (`yamamoto_portrait.png`) is a bust cropped from the palette-header **default**
costume (variant 0, the navy/blue neutral pose).

## When the skins batch is built (future)
These 8 are REAL pre-drawn alt-costume content — do NOT invent new skins from scratch when 8 exist
in the source. A `gen_yamamoto_*` recolor tool would additionally derive a project-wide recolor
(all animation frames) per costume + the Alien-X Void entry, following the onoki/mayuri skins pattern.
