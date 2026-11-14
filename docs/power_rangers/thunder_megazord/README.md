# Thunder Megazord (shared asset)

There is one definition for every owner:
- **Cells:** `thunderMegazordSprites.js` (`THUNDER_CELLS`, `THUNDER_SEQ`), backed by the PNGs in `assets/power_rangers/thunder_megazord/cells/`.
- **Generator:** `tools/mmpr_pink/extract.py`, which takes the indexed transparency from the supplied GIF and uses nearest-neighbour only.

Rules:
- Never recoloured and never cached per character. Skins only theme the caller's own markers.
- **Render:** `mmprPinkFx.js` draws the cells feet-anchored at ×2.4 and flips them by authored facing.
- **Simulation:** the Megazord has no HP and no hurtbox, never body-blocks and never tracks. Strikes come from sortie-profile contact boxes, run by the shared scheduler `falconzord.js`.
- Fall, prone and kneel cells are never used as attacks.

See `LEDGER.md` for every cell, its source rect, its facing and why it is used or unused. `contact_sheet.png` shows them all, and `source_rects.json` records the source rects and hash.
