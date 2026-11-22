# AI Scout — step 1 of the smarter CPU

`tools/ai_scout/scout.mjs` measures every fighter's **real** moves in the **real** engine and writes
`aiScoutData.js`: a per-fighter cheat sheet the CPU (`ai.js`) will read in step 2. Nothing in this step changes how
any fighter plays — the data file is read-only and nothing imports it yet.

```
node tools/ai_scout/scout.mjs                 # whole roster (~8 min, 4 parallel pages)
node tools/ai_scout/scout.mjs --only goku,ben10   # refresh a few fighters (merged into the existing file)
node harness/ai_scout_data.test.mjs           # shape checks + re-performs sample moves in the game (drawing on)
```

## How it measures
* **Moves** come from the Controls Lab move list (`controls_lab/moves.js`: Academy lessons + `kits.js` + `characters.js`
  frame data), each with the Lab's frame-exact input script (`controls_lab/notation.js`). Kits written only as pad
  glyphs (`← + △`, `↓↓ + R1`) or as `glyph / keyboard` (`□ / J`) are translated through `padLayout.js` / the live
  keyboard binds. Walk, jump and guard are skipped (nothing to measure).
* **Real inputs:** keyboard events through `input.js`, P1 vs a standard dummy (**Naruto** for everyone, so numbers compare
  across the roster and mirror-only passives can't hide a move — a mirror Buggy is immune to Buggy's own blades).
* **Reset:** the game's own F2 training reset, then wait until the combo is over and both fighters are free and grounded,
  then place P1 at the test distance (`setP1X`, as the Lab does).
* **Stepped sim:** `requestAnimationFrame` is disabled and the sim is stepped one frame at a time. In the tool's page
  only, drawing onto screen-sized canvases is turned into a no-op after boot (it was ~95% of the cost). The sim never
  reads those pixels: `ai_scout_data.test.mjs` re-performs sample moves with drawing **on** (and `NO_DRAW=1` off) and
  gets the same results.

## What each move records (see the header of `aiScoutData.js`)
`startup` (first press → first damage) · `reach` [min, max] body gap it connected at (gaps 0–480 px) · `damage` · `hits`
· `onHit` / `onBlock` frame advantage (+ = attacker acts first) · `chip` · `unblockable` · `antiAir` (hits a rising foe)
· `grab` · `cost` (meter) · `travel` · `recover` · `engineMove` · `dupOf` (another input that is the same attack) ·
`airToAir` (air normals that only connect on an airborne foe) · `fired:false` (needs a form/setup) · `script` (run-length
encoded input) + `at` (press frames). Each fighter also carries its verified Controls Lab combos.

`damage`/`reach` always mean "hits a standing foe". A forward jump-in (Forward held through the jump) was tried and
dropped: it carries the fighter clean over the foe, so its rare hits were fragile clips.

## Result (2026-11-22)
116 fighters · 1,586 moves · 1,379 fire from neutral · 1,047 hit a standing foe · 96 air-to-air · 63 anti-airs ·
351 safe on block (≥ −3) · 327 punishable (< −8) · 112 grabs/unblockables · 201 reach full screen · 1,821 verified
combos. Per-fighter details and moves that need a setup: `docs/ai_scout/scout_report.json`.
