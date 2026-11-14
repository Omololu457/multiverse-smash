# Project handoff

(Created 2026-11-14 by the Black Ranger build because no handoff file existed. Other builds: add your own section; keep each one short.)

## Black Ranger (`mmpr_black`) + Falconzord sorties — 2026-11-14
- State: playable; all Black harnesses green (`node harness/mmpr_black.test.mjs`, `mmpr_black_determinism.mjs`, `mmpr_black_skins.test.mjs`, `mmpr_black_visual.mjs`).
- Owned files and every shared hook: `docs/mmpr_black/INTEGRATION.md`. Measured routes and balance: `docs/mmpr_black/COMBOS_BALANCE.md`. Sortie system: `docs/power_rangers/falconzord/README.md`.
- Pending (not applied): rosterParity.js ×1.3 opt-in for `mmpr_black`; no Black-specific CPU AI script.
- Gotchas: `roundTimer` is in frames; `writeRawControls` writes `up` then `jump` to the same key (pass both); this engine drops `isBlocking` during blockstun (space multi-shot assists past the blockstun).

## Pink Ranger (`mmpr_pink`) + Thunder Megazord strikes — 2026-11-14
- **State:** playable. Pink harnesses:
  - `node harness/mmpr_pink.test.mjs`
  - `mmpr_pink_determinism.mjs`
  - `mmpr_pink_skins.test.mjs`
  - `mmpr_pink_visual.mjs`
  - `mmpr_pink_framedata_diff.mjs [base] [afterDir]`
- **Docs:**
  - Owned files and every shared hook: `docs/mmpr_pink/INTEGRATION.md`
  - Frame data, including the Spotter's Reflex timing adjustment: `docs/mmpr_pink/MOVE_FRAME_MAP.md`
  - Measured routes: `docs/mmpr_pink/COMBOS_BALANCE.md`
  - Shared Megazord art: `docs/power_rangers/thunder_megazord/`
- **Shared scheduler:** the Thunder Megazord runs on `falconzord.js`. Pink added the backward-compatible `falconCommit(..., at)`, `box.dx` and per-profile `move`. Rerun the Black and White harnesses after any change there.
- **Pending (not applied):**
  - rosterParity.js ×1.3 opt-in for `mmpr_pink`
  - no Pink-specific CPU AI

## White Ranger (`mmpr_white`) + Ninja Megazord orders — 2026-11-14
- **State:** playable. Harnesses: `node harness/mmpr_white.test.mjs` (103/0), `mmpr_white_determinism.mjs` (23/0), `mmpr_white_skins.test.mjs` (70/0), `mmpr_white_visual.mjs` (22/0, real menus → KO → rematch).
- **Docs:** owned files + every shared hook `docs/mmpr_white/INTEGRATION.md`; frame data `MOVE_FRAME_MAP.md`; measured routes `COMBOS_BALANCE.md`; Megazord orders + Formation rule `docs/power_rangers/ninja_megazord/README.md`.
- **Shared changes:** `falconzord.js` per-contact `gate` (White's Formation follow-ups; also relies on Pink's `box.dx`); `mmprBlackFx.js` exports the shared `drawZordCell`; `mmprBlackState.js` only clears Black's own leftovers; `rangers.js` `clearRanger` releases `_rooted` when a live blink is cleared (a reset mid-blink froze any Ranger).
- **Known / pending:** the Formation Crane Rise push kick moves the foe out of a manual jump's reach (no air conversion after it, by the brief's "changes spacing" rule); no White-specific CPU AI; rosterParity.js ×1.3 opt-in not applied.
