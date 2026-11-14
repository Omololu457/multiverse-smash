# Krybot skin verification

Final checks: 2026-11-13, Chromium/Playwright on the existing project and normal `node tools/serve.mjs` launch at localhost:8013. No launch/server settings changed. Headless browser checks use production menu/render/input code with existing `?harness=1` observation/fixture hooks; this is not physical-controller/two-device hardware certification.

## Integration traced

1. `skins.js` registers `KRYBOT_SKINS` from `krybotSkins.js` in the existing roster-key map. All four skins are level 0 and have stable IDs, versioned source fields, explicit region mapping, effects policy and compatibility caveats. Unknown IDs resolve to the first/default entry via existing `getSkin`/`getSkinAnimationData` behavior.
2. The normal skin-select screen uses each skin's own precomputed portrait and existing portrait Image cache. Short accurate names fit all four cards without changing UI layout. The match HUD uses the engine's existing roster portrait; skin-select previews support alternate portraits.
3. `game.js applySkin` assigns the selected animation definitions and ID per fighter. Alternate descriptors copy every base frame count, timing, frameTimeline, origin, pivot and scale, replacing only sheet URLs. No skin modifiers or authored combat differences exist. One Krybot-only exception to `applyMirrorTint` keeps native fighter/squad colors instead of the existing automatic red P2 wash. Other characters' tint rules are unchanged.
4. `collectFighterSheets` / existing preload gate load selected sheets; sprite handlers/cache decode and retain Images. The alternate sheets use original dimensions/order/alpha. `krybotFx.js` resolves helper and both cinematic participants from the owning fighter's `_skinAnim`, falling back to its base animation data. Cached Images are keyed by URL, never mutated. No per-frame pixel transformation, source-canvas mutation or skin-dependent simulation state was added. Energy/explosion URLs remain original.
5. Existing session snapshot/restore persists `p1Skin`/`p2Skin`. The actual reload test uses `session=1` because ordinary harness sessions deliberately disable persistence. Reload returns to the engine's safe menu and restores selection IDs; it does not resume a live battle.
6. Existing `startOnlineHostMatch` sends both IDs in MATCH_SETUP; `applyOnlineSetup` applies them on the joiner. No protocol/appearance synchronization changes were needed. The real LAN test selects both skins through host menus, rather than using the older test hook that forcibly selects default skins.

## Completed checks

| Check | Result / evidence |
| --- | --- |
| Pixel/build integrity | PASS: `tools/krybot/skins/verify.py`; original supplied SHA unchanged; 90 alternate action strips preserve exact alpha/dimensions/darkest outlines; 28 complete anatomical masks; base body/effects unchanged. `asset_verification.log`. |
| All roster authored frame data | PASS: whole-roster stats, basic attacks, specials and ultimates equal pre-task JSON; Krybot move definitions equal baseline. All 30 alternate animation descriptors match base except sheet URLs. |
| Every implemented body's match rendering | PASS: four skins × 30 real action/reaction descriptors = 120 render checks, no clipping or missing bodies; facing/pivots and scale retained. `focused_results.json`. |
| Cosmetic-only outcomes | PASS: all four skins produce identical authoritative state on every one of 520 simulation frames, including damage, energy, movement, hitstun, helper/mark/cooldown/ultimate/shot state. No private damage/scaling rules. |
| Helpers / cinematic ownership | PASS: all skin sheet paths exercised; simultaneous TV P1 and DS-red P2 helpers keep separate URLs; both owners' confirmed ultimate participants use their owner's sheet. Actual screenshots `mirror_helpers.png`, `ultimate_p1.png`, `ultimate_p2.png`. |
| Real selection / KO / rematch | PASS: title → Play → VS CPU → Easy → Power Rangers → Krybot → Television Palette → P2 Power Rangers/Krybot → Super Legends DS Red → Command Center → battle → actual jab KOs → victory → R rematch. Both fighters/HUD remain visible, move and attack. Existing fixture reduces/stuns opponent for KO timing; actual jab resolves KO. `menu_results.log`, `menu_*.png`. |
| Persistence | PASS: real menu selections preserved after KO/rematch and genuine page reload in the same browser context. |
| Bright / dark stage readability | PASS visual inspection: every skin on World Tournament Arena and Null Void, both fighters/HUD visible. `*_light.png`, `*_dark.png`. Dark undersuits remain intentionally dark; outline, helmet, trim and sensors remain legible. |
| Missing/default skin | PASS: unknown ID renders the ordinary base animation set; default is byte-identical existing art. |
| Real LAN | PASS: independent browser peers join by real code through relay 8796; normal host character/skin/stage menus transmit TV P1 and DS-red P2, both peers render matching sheet IDs and native colors. 70 shared simulation frames match, zero page errors. `lan_results.json`, `lan_host.png`, `lan_join.png`. This is a local real-WebSocket test, not two physical devices. |
| Asset caching | PASS: 50 repeated cached draws issue no additional Krybot asset requests; no per-frame recoloring/decoding. No failed selected-skin preloads. |
| Gameplay regression | PASS: existing Krybot suite, 58 passed / 0 failed. `gameplay_regression.log`. |
| Shared skin-select regression | PASS: existing `harness/skin_select_anim_verify.mjs`, 0 failed checks. `skin_select_regression.log`. |
| Shared save/load regression | PASS: existing `harness/save_load.test.mjs`, Chromium 46 passed / 0 failed. `save_load_regression.log`. |
| Whitespace / shared boundaries | PASS: diff-check, original gameplay file hashes preserved after normalizing the one documented appearance-only mirror predicate. No shared-region overlap overwritten. |

The RAF-disabled focused fixtures initially had a preload race under concurrent browser load: three manual ticks could run before sprite readiness was initialized. `focused_preload_fixture_failure.log` retains that failed run. Both fixtures now await the existing real preload promise and tick initialization before asserting readiness; no assertion or gameplay check was removed. The final focused and mirror runs pass.

## Performance measurements and limits

`performance_results.json` records normal RAF at 1280×720, 90 samples after warmup for each skin. Default mean 30.56 ms; TV 36.85 ms; DS 29.82 ms; DS red 32.22 ms. Corresponding selected-match preload observations: 459 / 513 / 594 / 500 ms, with zero failures. The alternates add three sets of 30 small precomputed strips plus portraits; total skin directory filesystem allocation is about 556 KiB including masks. No alternate projectile/explosion assets are loaded.

These local headless timings vary with shared-machine load; TV was slower in this sample. A follow-up paired check freezes the same match state, warms every sheet, rotates all four appearances over four rounds and measures 80 flushed renders per observation. Median render costs: default 24.626 ms, TV 24.269 ms, DS 24.282 ms, DS red 24.242 ms (`render_cost_results.json`). This controlled comparison found no additional skin rendering cost; the RAF sample alone does not establish a reproducible TV regression.

These checks establish successful loading and bounded cached rendering, **not a universal 60 fps guarantee**. The selected alternate adds sheets to the existing preloader; that modest loading cost is explicit. No render-system rewrite or performance setting change was made to hide it. More hardware profiling remains useful before claiming performance parity on all devices.

Earlier gameplay-task baselines reproduced unrelated failures: credits 11 pass / 3 fail (five unrelated missing credits and stale `sasuke_war_susano` key); Goku controller-special suite 10 pass / 2 fail. Those tests were not changed. Their detailed baseline comparison is in `docs/krybot/HANDOFF.md`; this skin task does not relabel those failures as passing.

## Reproduce

From the existing project root, with the normal project server running at port 8013 for visual/LAN/mirror/performance scripts:

```sh
/opt/anaconda3/bin/python3 tools/krybot/skins/build.py
/opt/anaconda3/bin/python3 tools/krybot/skins/verify.py
node harness/krybot_skins.test.mjs
node harness/krybot_skins_mirrors.mjs
node harness/krybot_skins_visual.mjs
node harness/krybot_skins_lan.mjs
node harness/krybot_skins_perf.mjs
node harness/krybot_skins_render_cost.mjs
```

The Python tools require Pillow. Run performance checks without other browser suites for less noisy measurements. The focused test starts its own ephemeral read-only file server; the LAN test owns/closes its temporary relay. All screenshots are generated from actual match frames or the real selector, except `skins_contact.png`, which is the documented offline nearest-neighbor asset contact sheet.
