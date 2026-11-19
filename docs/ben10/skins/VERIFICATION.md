# Ben 10 themes — verification report (2026-11-19)

All automated checks ran headless (Playwright Chromium) or in Node, with **simulated input**: harness calls to start the
match, transform and KO. **Nothing was run on a physical DualSense.** The DualSense mapping below is read from the code
(input.js `pollMenuGamepad`), not exercised by hand.

## Results

| check | how | result |
|---|---|---|
| Frame data zero for every character, every theme | `harness/ben10_themes_framedata_diff.mjs` (git-archive trees, base `bb3e167d4` vs HEAD) | see the Phase 8 commit run (all blocks equal) |
| Rules: registry, 40 skins, cosmetic-only stats, Albedo isolation, alpha, determinism, sparkle | `harness/ben10_themes.test.mjs` | 10 / 0 |
| Render gate: Classic + Jacket → all 20 themes on the human → transform into every READY alien (24) → each drawn in all 20 themes, recoloured, alpha untouched, not black → revert / rematch / new round → Albedo vs Ben → mirror with independent picks + P2 mirror tint | `harness/ben10_themes_render.mjs` | 211 / 0 |
| Determinism | `harness/determinism.test.mjs` (unmodified) | 14 / 0 |
| Combo standard | `harness/combo_standard_audit.mjs` (unmodified) | 233 / 9; the same 9 failures as on `main` before this work |
| Roster integrity | `harness/roster_integrity.test.mjs` (unmodified) | verified |
| Ben 10 harness battery (38 harnesses: Omnitrix, every READY alien, Albedo mirror, VO) | scratch battery, clean tree | identical output to the pre-theme baseline |
| No `Math.random` | grep in `benTheme*.js` (asserted by the rules test) | none |
| Skin cards readable | screenshots of the Ben skin grid at 1280×720 and 1600×900 | 45 cards at ≈ 89×114 / 116×148 px (were ≈ 35×45 / 63×81). Each shows the full-body idle frame in its theme, a role strip and a label. Other characters' grids that fit at full size keep the same layout (53 / 53 layouts compared) |

## Checklist (brief Phase 8)

- boot → pick appearance + theme → match: ✅ (render gate; themed skin and variant asserted)
- both fighters / HUD render, canvas not black: ✅ (mean-brightness probe on every theme / form)
- transform / attack / damage / revert: ✅ transform, revert and specials drawn (render gate). The VO battery's matches land hits on themed-capable forms.
- round end / rematch / new round keeps the selection: ✅
- restart confirms saved selection: ✅ by construction, not by a reload test. The theme is the skin id, and `snapshotSession` saves / restores `p1Skin` / `p2Skin`.
- two-player mirror with independent picks: ✅ (`classic-neonleap` vs `jacket-solarfurnace`)
- Ben vs Albedo palette-leak check: ✅. Albedo has no theme fields and draws nothing themed. Static checks: themes exist only in `SKINS.ben10`, the recolour is ben10-gated, and no `__albedo` art passes through it.
- player tint / hit flash not replaced: ✅. The P2 mirror tint is still set over a themed sheet. `_impactFlash` is untouched (render-path code not modified).
- idle / movement / attack / special / hurt / knockdown per alien: contact sheets show idle + an attack pose for every set under all 20 themes (`img/contact_<set>.png`). In-game the recolour applies to whichever sheet is drawn, so every animation of a mapped set is covered. Animations an alien lacks are not invented.
- brightest and darkest stage: **not run** as a separate pass (the render gate uses the default stage). Dark themes keep a lifted light end and the outline is never recoloured, by design.
- frame pacing during transform / animated cosmetics:
  - Measured: the first draw of a sheet recolours it once. Over all 1,000+ body strips: p95 5.5 ms; worst 17 ms (Brainstorm's busiest 179k-px strips, ≈ 1 frame, once).
  - After that the cached canvas is drawn at normal cost.
  - Sparkles are baked into the cache, not animated, so they add no per-frame cost.

## Controls (actual, unchanged)

Skin grid after picking Ben: the originals, then Classic 1–20, then Jacket 1–20.
- **Mouse:** click a card.
- **DualSense / gamepad:** D-pad or left stick moves the cursor, ✕ picks, ◯ goes back.
- **Keyboard:** Esc / Backspace goes back. The skin grid has no keyboard browse (unchanged).

## Known limits / missing art

- FX drawn outside the fighter sprite keep their colours: projectiles, beams, the transformation flash.
- Roles an alien's art does not separate are listed per set in `THEMES.md` → Coverage. For example, Goop's art is one goo material plus the projector, so it has no separate ENERGY region.
- Legacy experimental alien twins have no map and draw as before.
- Prime (experimental, pending art) has no themed skins.
