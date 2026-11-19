# MSV1-MERGE: audit of everywhere Shane (`ns_red`) and Dustin (`ns_yellow`) are referenced separately

Read at start commit `8bdcd4e33`. "Plan" says what the merge does with each place. No literal `shane` / `dustin` ids
exist anywhere (only the names in text).

## Engine / shared files (hook lines owned by tools/msv1/hooks.py)
| Place | What it does | Plan |
|---|---|---|
| characters.js:34 import, :11461 roster | registers both as roster characters | keep both (hidden form profiles) + add `windrangers` |
| credits.js:101-106 | one attribution entry each | keep + add `windrangers` |
| spritesheets.js:83-84 | sheet manifest per key | keep (forms draw from these) + `windrangers` idle |
| skins.js:246-247 | one `default` skin each | keep + `windrangers`: `default` (start Red) / `start_yellow` |
| rosterParity.js:15 | ×1.6 parity per key | keep + `windrangers` |
| kits.js:112 | Move List kit per key | keep + `windrangers` (active-form list with a toggle) |
| input.js:702 | raw-controls rosterKey list | unchanged: the duo's live rosterKey is always a form id |
| game.js:131 import, ninja hook lines | `tickNinja` / `updateNinjaCommand` / `ninjaRoundReset` / snapshot / body alpha, keyed by `isNinja` | unchanged: `isNinja` is true for the duo through its form id |
| game.js `MSV1_WORLD` | world API for ninja.js | + `omxWindows()` (Ben's ↓↓ windows) |
| game.js session restore (~4921) | restores `p1CharKey` / `p2CharKey` | alias: an old form id becomes `windrangers` + start skin |
| game.js personality / challenges (~10192) | keys on `p1.rosterKey` | records the active form id (same universe); documented, not changed |
| game.js pause → Move List (~10922) | finds your fighter by `rosterKey` | duo → find `windrangers`, open on the active form |

## MSV1-owned files
| Place | Plan |
|---|---|
| nsData.js:184-235 (profiles + roster entries; names :221/:229) | profiles byte-identical; roster entries get `hidden: true` |
| ninja.js (`isNinja`, profile lookups by rosterKey) | duo hooks: round-reset init, swap tick, extra duo moves |
| ninjaCommand.js:14 (`import './nsData.js'`) | + `import './nsDuo.js'` |
| nsFx.js:204 (sound prefix `nsr_` / `nsy_` by rosterKey) | follows the active form automatically |
| nsFx.js HUD / intro | duo: second greyed portrait, NP colour blend, Yellow smoke silhouette in the intro |
| nsKit.js | + the duo kit with a per-form view |
| nsSupers.js | unchanged; + the tag ultimate in nsDuo.js |
| nsHarness.js:41 | + duo test hooks |
| msv1 harnesses (a_core, b, c, d, e, f, render, combos, netreplay, framedata_diff, msv1.test) | keep booting `ns_red` / `ns_yellow` directly (old ids = the form profiles); a new merge suite tests `windrangers` |
| tools/msv1/hooks.py, pack_msv1.py, FILES.txt | + the merge hooks / files |
| docs (BALANCE_NOTES, NINJA_FRAMEWORK, COMBOS) | + a "multi-form characters" section |

## Data that stores a character id
| Store | Plan |
|---|---|
| Replays (`p1Char` / `p2Char`) | an old replay names `ns_red` / `ns_yellow`, which still exist as hidden characters, so it plays bit-identically with no change |
| Session restore (`p1CharKey`) | alias to `windrangers` + start skin |
| LAN `MATCH_SETUP` (`p1Char`) | new hosts send `windrangers` + skin; an old id still resolves (the hidden form) |
| Personality / challenges | the active form id; same universe |

## Other systems
* **CPU:** no ninja-specific tables; `ninjaAiPerceive` keys on `isNinja` and works through the form id. The duo gets
  its own swap logic.
* **combo-standard:** `ns_red` / `ns_yellow` are unclassified (a pre-existing ❌). Nothing changes.
* **Companion screens:** none exist on main.
