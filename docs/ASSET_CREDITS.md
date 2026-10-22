# Asset Credits

Human-readable index of third-party source art used in the game. The in-game
source-of-truth is `credits.js` (`SOURCED_ART`), surfaced on the Credits screen.

## Spider-Man (rosterKey `spiderman`, universe `marvel`)

- **Work:** Spider-Man — Marvel Super Heroes (Capcom CPS2 arcade).
- **Ripped by:** **Alvin-Earthworm** — http://alvin-earthworm.deviantart.com/
- **Required credit (verbatim):** "Spiderman from Marvel Superheroes for Capcom
  CPS2 Arcade system. Ripped by Alvin-Earthworm. http://alvin-earthworm.deviantart.com/
  Please give credit if used."
- **Source file:** `assets/source/spiderman_original.gif`
  (byte-identical copy of `Arcade - Marvel Super Heroes - Fighters - Spider-Man.gif`,
  MD5 `fdcd21dfc385307d5f74fb9f91498bad`).
- **In-repo processing:** green-stripped into `spiderman_sliced/spiderman_row_01..27.png`,
  re-sliced feet-aligned by `tools/reslice_spiderman.py` → `spiderman_*_uniform.png`.
  Existing pixels only — cut / flipped / composited; no painted art.
- **The credit box printed on the sheet is NOT a sprite and is NEVER rendered in game.**

Mirrored in `credits.js` SOURCED_ART (`spiderman`), which is the canonical,
player-facing attribution.
