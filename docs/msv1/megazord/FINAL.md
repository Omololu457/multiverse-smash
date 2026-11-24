# MSV1-MEGAZORD — FINAL

The **Thunder Megazord** is an add-on ULTIMATE for the Mighty Morphin Rangers (`mmpr_rangers`), not a character:
no roster entry, no select tile, no CPU slot. **U + L** (P2 5 + 4, pad R2 + R1), full meter (100), once per round.

## Commits
| Phase | Commit | What |
|---|---|---|
| 0 | 4b8878364 | audit, START_COMMIT, clean-HEAD baseline |
| 1 | a4894011b | sprite map (95 frames + portrait), strips, ledger, credits |
| 2–3 | f47e89405 | transformation cinematic + Megazord mode (one sim module, so one commit) |
| 4 | 05b7df1e2 | sounds + Move List "THUNDER MEGAZORD (U + L)" (CPU landed with 2–3) |
| 5 | (this commit) | screenshots, shot script, updates.TXT, this file |

## Files
- `megazord.js` — simulation: chord, cinematic timeline, mode, moves, armor, separation, CPU. State in `f._squad.mz`.
- `megazordHook.js` — leaf hooks read by combat.js (armor absorb, super armor), gated on `_mzOn`.
- `megazordFx.js` — render-only world + screen passes (captions, bolts, flashes, portrait, TIME / ARMOR HUD).
- `megazordSound.js` — seeded WebAudio recipes (`mz_*`). `megazordKit.js` — Move List rows.
- `megazordSprites.js` + `assets/mmpr_rangers/megazord/` — strips from the Grim SNES rip.
- Engine touch points (all gated): `squadCore.js` lock / cpu / roundReset hooks, `input.js` `_squadInject`,
  `combat.js` absorb / super armor / grab gate, `game.js` `W.startMove`, `spdSquadFx.js`, `spdSquadKit.js`, `sound.js`.

## Moves (in mode, 12 s, 600 ARMOR)
Light 60 · Crouch Light 55 · Heavy 80 · Crouch Heavy low flame sweep 85 · Air Light / Heavy 85 ·
Special Thunder Saber Slash 110 (14 f) · Air Special Air Saber 115 · ↑ + Special Rising Saber 100 (launcher) ·
↓↘→ + Special Thunder Fireball 90 (full screen) · →→ + Special Saber Lunge 100 (½ screen) ·
↓↓ + Special Saber Charge (40 f, shocks attackers for 60, next saber +50 %) · U + L Thunder Saber Final Strike 250.

## Input notes
- With the Megazord available, **U waits up to 3 frames** for L; U alone still fires the Ranger ultimate, 3 f later.
- **L then U within 3 f** cancels the L special during startup and restores the meter.
- L alone is byte-identical to the baseline (tested).

## Tests (clean tree = HEAD + these files)
megazord 55/0 · frame-data diff 0 / 12,028 (incl. every MMPR form) · determinism 14/0 · combo 235/9 · up-attack 77/2 ·
credits 11/3 · roster-integrity PASS · replay 8/1 · net_online 11/0 · MMPR Pink 14 / Black 15 / White 23 pass,
Green 15/2 (same 2 failures on clean HEAD). All equal to BASELINE.txt.

## Known
- When the Final Strike lands, the engine's shared ultimate-finisher cinematic (game.js `_drawAnimFinisher`:
  white silhouette flash + freeze + burst) plays, as for every ultimate in the game; the Megazord's own flash is
  0.6 × alpha for 10 frames on top. `08_finisher.png` is therefore taken during the wind-up.
