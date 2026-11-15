# S.P.D. Yellow — verification

Every result below came from a real run. Each suite writes a JSON results file to this folder (skins: `docs/skins/spd_yellow/`).

## Suites

| Command | What it covers | Result |
|---|---|---|
| `node harness/spd_yellow.test.mjs` | Frame data, chains, pistol / long gun / air pistol, interrupted holds, coins (all exclusions), duplicate / swap / echo / dispersal, stance, every order and rejection, Breach window, Megazord pips and calls, 7 measured routes, blink + both streaks, ultimate hit/miss/block, Showcase parity, teardown, determinism | **75 passed / 0 failed** |
| `node harness/spd_yellow_skins.test.mjs` | Registry, 600-frame sim identity per skin, render boxes, duplicate in skin, Megazord unchanged, materials + Reduce Motion static fallback, kept-pixel / alpha identity on every strip, mirrors, persistence | **96 / 0** |
| `node harness/spd_yellow_visual.mjs` | Live real-menu path: menu → select Yellow → pick Starlight skin → match → pistol / long gun / duplicate / echo / Megazord / ultimate (both facings) → KO → victory → rematch; 45 deterministic frame captures; performance profile | **22 / 0** (three consecutive runs) |
| `node harness/spd_yellow_determinism.mjs` | 3600-frame input-only replay identity, render batching, ultimate vs Showcase identical damage, lifecycle (training reset, mid-ultimate reset, mirror, character change), Yellow vs White separate Megazords, live KO → next round fresh, LAN slot-2 command parity, pad == raw parity, no `Math.random` | **22 passed / 0 errors** |

## Project baselines (unchanged by this build)

- `harness/determinism`: 14 / 0.
- combo-standard: 231 / 9. All 9 failures predate this build. `spd_yellow` only appears in the same unclassified-list note that the other Rangers get.
- up-attack-roster: 77 / 2 (pre-existing failures, other characters).
- Roster integrity check: ok.

## Contact sheets

- `gameplay_contact_sheet.png`: 45 captured gameplay frames (3076×2083), built from `frames/` by `tools/spd_yellow/gameplay_sheet.py`.
- `docs/skins/spd_yellow/skins_contact.png`, plus the per-skin light / dark / duplicate+Megazord captures.
- `SPRITE_LEDGER.md`: every strip → cells → input → timing → function, muzzle anchors, and the excluded / unused cells.

## Performance (headless Chromium, includes render; `visual_results.json`)

| Scene | ms / frame |
|---|---|
| Idle, Starlight skin | ≈ 16.5 |
| Starlight glitter + duplicate + Ninja Megazord on screen | ≈ 24.8 |
| Ultimate raid | ≈ 23.5 |

The FX image cache stays at 10 entries before and after the stress scene, so nothing leaks. Headless timing is noisier than a real browser; across runs the idle scene measured 16–20 ms and the stress scene 21–25 ms.

## Known limits / honest notes

- No audio or voice pack was supplied, so all sound is synthesized and there is no dialogue.
- The menu has no training-dummy difficulty, so the live test fights an easy CPU. It drives inputs from game state (it waits for Z to be free) rather than fixed timings. Without that, real-time runs were flaky.
- There is no shared command-panel module in the engine. The command stance is Yellow-local (see `INTEGRATION.md`).
- Nothing was deployed or pushed.
