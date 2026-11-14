# Project handoff

(Created 2026-11-14 by the Black Ranger build because no handoff file existed. Other builds: add your own section; keep each one short.)

## Black Ranger (`mmpr_black`) + Falconzord sorties — 2026-11-14
- State: playable; all Black harnesses green (`node harness/mmpr_black.test.mjs`, `mmpr_black_determinism.mjs`, `mmpr_black_skins.test.mjs`, `mmpr_black_visual.mjs`).
- Owned files and every shared hook: `docs/mmpr_black/INTEGRATION.md`. Measured routes and balance: `docs/mmpr_black/COMBOS_BALANCE.md`. Sortie system: `docs/power_rangers/falconzord/README.md`.
- Pending (not applied): rosterParity.js ×1.3 opt-in for `mmpr_black`; no Black-specific CPU AI script.
- Gotchas: `roundTimer` is in frames; `writeRawControls` writes `up` then `jump` to the same key (pass both); this engine drops `isBlocking` during blockstun (space multi-shot assists past the blockstun).
