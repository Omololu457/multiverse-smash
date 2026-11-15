# Hiromi Higuruma: integration hooks

All hooks are inserted by `tools/higuruma/apply_hooks.py`. The script is idempotent: each hook is skipped when its
marker is already present, and every anchor count is asserted. Each hook sits directly after the concurrent Robin /
Megumi line at the same site. The three `input.js` replacements only append `|| …higuruma…` / `&& !…higuruma…` to the
end of an existing condition list. No other fighter's line is edited. Every hook is gated on `rosterKey === 'higuruma'`
(or `isHiguruma`), or calls a function that returns at once for anyone else. The frame-data diff confirms this:
887 blocks, zero differences for every other character (`harness/higuruma_framedata_diff.mjs`).

| File | Hooks |
|---|---|
| characters.js | import `higuruma` from higurumaData.js; roster entry `higuruma,` |
| spritesheets.js | asset list `assets/higuruma/idle.png` (preload) |
| skins.js | import HIGURUMA_SKINS; `higuruma: HIGURUMA_SKINS` |
| kits.js | import HIGURUMA_KIT; `higuruma: HIGURUMA_KIT` |
| sound.js | import + spread `...HIGURUMA_SOUNDS` (synth, no voice files) |
| credits.js | `assets/higuruma/**` credit (sheet by Mugen Matias, supplied) |
| combat.js | import; `getAttackHitbox` → `higurumaHitbox`; `resolveAttackHit` → `absorbHiguruma` (Objection, strikes only); block hook `higurumaBlock`; hit hook `higurumaHit` (Case File) |
| sprite.js | `_hgPose` override (land / turn poses while idle); `_lastSpriteFrame` stamp (material overlay) |
| input.js | controller-reader exclusion for `_higurumaRemoteInput`; roster list for the raw-edge path; remote-input exclusion |
| game.js | imports; `HIGURUMA_WORLD`; cinematic-active list; `clearHigurumaUlt` / `clearHiguruma` at reset, rematch, round end and identity change; `tickHiguruma` + `updateHigurumaCommandCombat` (1v1 and FFA); replay snapshot fields; `higurumaLocked` in `updateMovementInput`; `_higurumaRemoteInput`; `updateHigurumaUlt` freeze block; `drawHigurumaFx`; mirror-wash rule (different skins keep palettes); `drawHigurumaHud`; `drawHigurumaIntroCard`; `drawHigurumaCourt` (after the Homelander speed-run layer); `drawHigurumaUnder` (after the Arlong under-layer); `__harness.higurumaTest` |

Not touched: physics.js, flight.js, rosterParity.js, any other fighter's module, data or assets.
