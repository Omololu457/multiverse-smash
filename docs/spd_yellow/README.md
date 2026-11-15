# S.P.D. Yellow Ranger (`spd_yellow`) — Z Delgado

Duplicate Gunner / Coordinator in the `power_rangers` universe. HP 1100, Delta Energy (max 100).

## Status note

The brief asked to "revise and complete the existing S.P.D. Yellow implementation". No implementation existed
anywhere in the checkout or in git history (no `spd_yellow` key, module, asset or doc), so the user chose
"Build fresh from this brief". Everything here was built from scratch on the existing Ranger patterns
(MMPR White / Black / Pink modules, `rangers.js` blink, `falconzord.js` assist scheduler).

No shared contextual command-panel module exists in the engine. The Tactical Coin command stance is built on
Yellow's own press-edge reader (the same `readRawControls` snapshot that keyboard, pad, replay and LAN feed).
See `INTEGRATION.md`.

## Files

| File | Role |
|---|---|
| `spdYellowData.js` | Frame data, firearms, duplicate, coins, orders, Ninja Megazord sorties, ultimate contacts, roster entry |
| `spdYellowState.js` | Simulation: plain JSON on `f._spdYellow` (snapshotted), combat hooks, gun hold, clone, coins, stance, ultimate |
| `spdYellow.js` | Command layer (press edges -> moves / orders) |
| `spdYellowFx.js` | Render only: clone, streaks, muzzle star, coin HUD, command panel, Megazord, ultimate scene, skin materials |
| `spdYellowSound.js` | WebAudio synth SFX (`spdyellow_*` cues; seeded noise; SFX bus only; no voice) |
| `spdYellowSkins.js` / `spdYellowMaterials.js` | Default + 8 skins (precomputed sheets) / suit-masked material anchor points |
| `spdYellowKit.js` | Move List entry |
| `spdYellowHarness.js` | `__harness.spdYellowTest` (harness URLs only) |
| `spdYellowSprites.js` | Generated strip map + muzzle anchors |
| `tools/spd_yellow/extract.py` · `extract_coins.py` · `build_skins.py` · `gameplay_sheet.py` | Asset pipeline |

## Docs in this folder

`SPRITE_LEDGER.md` (frame → action → input → timing → function) · `CONTROLS.md` (inputs + resource rules) ·
`COINS.md` · `COMBOS_BALANCE.md` (measured) · `INTEGRATION.md` (every shared hook) · `CREDITS.md` ·
`VERIFICATION.md` (tests, contact sheets, performance, known limits) · skins: `docs/skins/spd_yellow/SKINS.md`.
