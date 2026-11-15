# Batman (rebuilt) — Verification

Run on 2026-11-14 in the shared checkout (main, HEAD `5fa3bc8d6` + this work), headless Chromium via Playwright.

## Batman suites

| suite | result | covers |
|---|---|---|
| `harness/batman_rebuild.test.mjs` | **70 / 0** | every move's damage, frame data and hitboxes through real keys; chain / cancel rules; L2 ownership; command stance (Up before R1 → Skyhook, no jump); all 6 operations deliver exactly their raw budget, pay on the commit frame, one-major rule, hand-off, cooldowns, air / low-energy rejects; machine destruction; caps; Shadow Dash; counter; KNIGHTFALL 420 clean + during a live op (300–440); whiff / block; stats re-apply after harness resets. Writes `mechanics_results.json` |
| `harness/batman_determinism.mjs` | **17 / 0** | 4600-frame input replay identical (every move, op and the ultimate exercised); render batching doesn't change the sim (700 samples); JSON-pure state; snapshot / restore mid-Carrier identical; lifecycle (training / identity / ult clears); no `Math.random` in Batman modules. Writes `determinism_results.json` |
| `harness/batman_framedata_diff.mjs` | **zero diff, 1496 blocks** | every other character's frame data byte-identical vs the pre-rebuild baseline; Superman's whole entry identical; `dark_knight` still wiped |
| `harness/batman_skins.test.mjs` | **57 / 0** | see SKINS.md (geometry, cosmetic-only traces, per-skin sheets, mirror) |
| `harness/batman_visual.mjs` | **27 / 0** | NORMAL launch path with real mouse + keyboard (details below) |
| `harness/batman_damage_audit.mjs` (+ `--supplement`) | data | DAMAGE_AUDIT.md |
| `harness/batman_boot.mjs` | pass | boot smoke, idle settle, no page errors; one legacy 404 (below) |

`harness/batman_visual.mjs` drives the real launch path with real mouse and keyboard. Each check below passed:
- **Unlock gate kept:** Batman is locked on a fresh account and unlocks at account Lv10 through earned XP, not a dev code.
- **Menus:** title → Play → VS → Easy → DC → Batman select detail (HP 1150) → skin select (Default + 10) →
  White Knight → CPU Superman → stage.
- **Intro:** the intro frames and intro card play, and the intro can be skipped with no gameplay advantage.
- **Moves in both facings:** Light chain, heavy, launcher, Batarang, Grapnel, Smoke, Rooftop, counter and double
  jump.
- **Fleet:** all six operations launch from keyboard orders in both facings.
- **KNIGHTFALL:** the blocked opener plays no cinematic. The clean opener goes through strafe, ascent, space,
  reentry and impact in both facings, then the target is grounded and state is restored.
- **Performance profile:** no new cached images on the second pass, the FX list stays bounded, and operation /
  ultimate frames cost within 3× idle or under 8 ms.
- **Match end:** KO → victory (win pose) → rematch (same skin, full HP, no ops) → defeat.
- **Errors:** no browser runtime errors.

## Shared suites (baselines unchanged; failures pre-existing and not Batman)

| suite | result | notes |
|---|---|---|
| `harness/determinism.test.mjs` | **14 / 0** | |
| `harness/combo_standard_audit.mjs` | 233 / 9 | 9 failures = recorded baseline (roster classification drift for newer chars, gogeta / goku_rose normals, superman / ghostface launcher frames). Batman's own driver checks pass |
| `harness/roster_integrity.test.mjs` | ✅ | |
| `harness/up_attack_roster.test.mjs` | 77 / 2 | baseline (superman 5/4/12, ghostface 4/3/6); Batman = Balanced 6/4/8, −32 / 0 ✅ |
| `harness/credits.test.mjs` | 11 / 3 | pre-existing: green_arrow, homelander, kakashi_anbu, ghostface_exe, soldier_boy unattributed; stale sasuke_war_susano. Batman attributed (SOURCED_ART) ✅ |

## Legacy Batman tests (superseded)

- `harness/batman.test.mjs` — **12 / 21**. It tests the *old*, already-wiped kit (its portrait file, old moves).
  The rebuild replaces that kit, so this test is superseded by `batman_rebuild.test.mjs`. It is left unmodified.
- `harness/batman_voice.test.mjs` — **9 / 0**. The legacy voice lines are kept on the audio bus.

## Known, documented items

- **One legacy 404.** `./batman_baterang_proj.png` is requested by the shared, generated `preloadManifest.js` for
  the wiped legacy art. `tools/check_fx_manifest.mjs` already fails at HEAD for many unrelated entries, so the
  shared file was left alone. The skins test whitelists exactly this URL.
- **The real-time ultimate starts after the engine-wide ultimate hitstop** (28 f) plus hit-feel slow-mo, the same
  as every cinematic ultimate.
- **The double-tap dash detector is wall-clock based** (shared engine). The mechanics test retries that one check
  if a slow page evaluate splits the taps.
- **Physical DualSense hardware was NOT tested.** The PS5 bindings use the shared `pollGamepad` layout. Keyboard
  play was tested end to end.

## Evidence images

- `visual_01`–`07`: menus and intro.
- `visual_08`–`22`: moves and operations, `_R` / `_L` for each facing.
- `visual_23_*`: blocked ultimate.
- `visual_24_ult_*`: the five ultimate phases.
- `visual_25`–`29`: after the ultimate, KO, victory, rematch and defeat.
- `boot_smoke.png`, `contact_body.png`, `contact_fleet.png`, `skins_contact.png`.
