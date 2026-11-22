# AI Scout + MASTER CPU — steps 1–2 of the smarter CPU

`tools/ai_scout/scout.mjs` measures every fighter's **real** moves in the **real** engine and writes
`aiScoutData.js`: a per-fighter cheat sheet. Step 2's **MASTER** difficulty (`aiMaster.js`) plays from it. The data is
read-only: nothing about any move changes; the CPU can only press buttons.

```
node tools/ai_scout/scout.mjs                 # whole roster (~8 min, 4 parallel pages)
node tools/ai_scout/scout.mjs --only goku,ben10   # refresh a few fighters (merged into the existing file)
node tools/ai_scout/scout.mjs --combos 10      # max verified combos re-measured per fighter (default 10)
node harness/ai_scout_data.test.mjs           # shape checks + re-performs sample moves in the game (drawing on)
node tools/ai_scout/master_eval.mjs --matches 10   # MASTER vs IMPOSSIBLE mirror matches (wins + damage share)
node harness/ai_master.test.mjs               # MASTER plumbing, it plays real moves, deterministic
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
encoded input) + `at` (press frames). Each fighter also carries up to 10 of its verified Controls Lab combos, each
RE-PERFORMED in the engine from its Lab input script (kept only if it deals ≥ 85% of the listed damage) with measured
`startup`, `reach`, `damage`, `hits`, `onBlock` and its own `script`.

`damage`/`reach` always mean "hits a standing foe". A forward jump-in (Forward held through the jump) was tried and
dropped: it carries the fighter clean over the foe, so its rare hits were fragile clips.

## Result (2026-11-22)
116 fighters · 1,586 moves · 1,379 fire from neutral · 1,047 hit a standing foe · 96 air-to-air · 63 anti-airs ·
351 safe on block (≥ −3) · 327 punishable (< −8) · 112 grabs/unblockables · 201 reach full screen · 1,821 verified
combos. Per-fighter details and moves that need a setup: `docs/ai_scout/scout_report.json`.

Combos re-scout (2026-11-22): 566 of 1,821 listed combos reproduce from a standing start (Vilgax's none: they need a
setup). Ben 10 alien-swap combos are skipped (they change the moveset mid-string).

## Step 2 — MASTER difficulty (`aiMaster.js`)
Offered in the VS difficulty picker and AI vs AI. It is the **Impossible AI plus a layer**: the Impossible AI still
runs every frame (movement, guarding, parry reads, every per-character CPU system — Gojo's Infinity, Sukuna's
signatures, clones, transforms …) and everything that reads a difficulty NAME sees "impossible" (`baseAiDifficulty`).
When the fighter is free the layer may take over and perform one of the fighter's measured moves by playing its REAL
input script through the same press/release handlers the keyboard uses (`game.js _driveCpu / _applyCpuRaw`):
* **punish** — foe in an attack's recovery: the best move/combo whose startup lands before it can guard
* **anti-air** — foe falling toward us: the fastest measured anti-air
* **neutral** — a verified combo, a safe poke (≥ −4 on block), a grab after the foe blocked twice, a full-screen tool
* **learns per match**: every choice is judged by (damage dealt − taken) per frame until 40 frames after it ends;
  "let the Impossible AI play" is judged the same way in the same situation (punish / anti-air / close / mid / far).
  The layer only acts where a move has out-earned the fighter's own default — so it never replaces a character's
  better native play with something worse. Untried moves inherit their kind's average once three of that kind are
  judged; a press the engine refuses in a context (combo-order rules, form gates) is backed off.
* deterministic: rolls use the seeded game RNG; motion / double-tap buffers are reset at the start of each move.

Result (2026-11-22, `master_eval --matches 10`, 12 fighters, mirror matches, sides swapped): **Master 68 – 47
Impossible (59%)**, 52% of all damage. A layer that never acts scores ~49% on the same runs. Step 3 (self-play tuning
of the per-fighter constants in `MASTER`) is next.
