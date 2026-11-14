# White Ranger — ownership

## Owned by the White build (new files)
`mmprWhite.js` (command layer) · `mmprWhiteState.js` (sim, disciplines, Formation, Leader's Return, ultimate) · `mmprWhiteData.js`
(frame data, Ninja Megazord order profiles, roster entry) · `mmprWhiteFx.js` (render-only) · `mmprWhiteSound.js` · `mmprWhiteSkins.js` ·
`mmprWhiteKit.js` · `mmprWhiteHarness.js` · generated `mmprWhiteSprites.js` · **shared art** `ninjaMegazordSprites.js` ·
`assets/mmpr_white/**` · `assets/power_rangers/ninja_megazord/**` · `tools/mmpr_white/**` · `harness/mmpr_white*.mjs` ·
`docs/mmpr_white/**` · `docs/power_rangers/ninja_megazord/**` · `docs/skins/mmpr_white/**`.

## Shared files touched (narrow, `mmpr_white`-gated lines only)
- `falconzord.js` (shared scheduler; edits agreed with the Pink session): one optional per-contact `gate` line.
- `mmprBlackFx.js` (Black, owned by the same author): exported the shared `drawZordCell` / `preloadZordCells` from its existing image
  cache so the Ninja Megazord reuses ONE renderer/cache. `drawFalconCell` unchanged.
- `mmprBlackState.js`: tick clears only Black's own leftovers (bug found by the Pink session: it deleted any other owner's `_falcon`).
- Registration hooks next to the Black / Pink ones: `game.js`, `combat.js`, `input.js`, `characters.js`, `spritesheets.js`, `skins.js`,
  `kits.js`, `credits.js`, `sound.js` (see `INTEGRATION.md`).

## Not owned (never edited, never committed by this build)
Everything else in the dirty tree, including the Pink build's files and lines, other sessions' Krybot/SPD hunks, and the supplied source GIFs.
