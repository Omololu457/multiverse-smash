# Green Arrow "Overwatch" — Build Report

Branch `feat/green-arrow` (built on `e67ba2a8`), 11 commits, one per phase. The 867 foreign
dirty-worktree changes + a concurrent Zoro session were never touched; every GA commit was made
via a private index (clean branch-tip tree + only my explicit paths), verified insert-only.

## Real frame counts (vs the brief's estimates)
GA sheet `SNES - Justice League Task Force - Fighters - Green Arrow.png` (764×1748, **white alpha-0
background** → alpha key, not chroma-key). 16 sprite rows + the "GREEN ARROW" wordmark on its own band.

| Row | Brief | Real | Notes |
|---|---|---|---|
| R1 idle/portrait/logo | 3 + extras | 3 idle + portrait + logo | wordmark on a separate thin band |
| R2 walk | 6 | 6 | |
| R3 jump + flip | 3 + 4 | 3 + 4 | |
| R4 punches | 8 | 8 | |
| R5 kicks | 9 | 9 | |
| R6 crouch | 7 | 7 | |
| R7 ground | 4 | 4 | |
| R8 dash/roll/guard | 9 | 9 | |
| R9 lunge/bow-slash | 7 | **8** | one extra stance frame |
| R10 draw→aim→release | 7 | 7 | |
| R11 anti-air + fire + ice | 6 + 5 + 5 | 4 poses + 5 + 5 | fire/ice projectiles are stacked **vertically** in R11's right side |
| R12 air draw | 4 | 4 | |
| R13 explosive dive + explosion | 4 + 4 | 4 + 4 | |
| R14 hit reactions | 9 | 9 | |
| R15 knockdown | 7 | 7 | |
| R16 win + superman + credit | 2 + 1 + 2 | 2 + 1 + superman + credit | |

Drones (3 JPEGs → native-grid block≈3 mode-downsample + ≤16 median-cut palette snap + lavender key):
**142 frames / 24 strips.** Off-by-one vs brief (all valid frames, brief warned ±1): aegis WALK 5 (spec 4),
kestrel DEATH 9 (spec 8), skyhook LANDING 8 (spec 7).

**Exclusions (exactly two):** Superman mini-sprite (R16) — *other character*; ripper credit
"Ripped by HijodeKrypton" (R16) — *credit* (recorded in CREDITS.md). Every other frame is used.

## Judgment calls
1. **GA background is already alpha-0 white** → plain alpha-threshold, far cleaner than Superman's grey chroma-key.
2. **Fire/Ice projectiles stacked vertically** in R11 → separated by colour (orange vs blue) rather than x-split.
3. **Skyhook DEATH + Payload BOMBS** scatter/merge under connected-component → split into N equal frames; Skyhook
   DEATH fr0 is the cream white-flash silhouette, then debris (faithful to source).
4. **Faithful white hover/thruster lines** beneath several drones are kept (present in the source art).
5. **Plain arrow** has no standalone sprite → **derived crop** of the fire-arrow shaft (flame recoloured to wood).
   **EMP arrow** = **tint** of the ice arrow to electric yellow-white. Both ledger-flagged.
6. **drones.js kept generic** (profiles + behaviour registry); the 6 GA drones + behaviours register from
   abilities.js so a future Batman/Cyborg/Iron Man reuses the module by adding a data profile.
7. **Summons hook:** drones are their own hittable entity layer parallel to `activeSummons`, updated/drawn/reset
   at the same call-sites; the summon *framework* isn't duplicated. EMP gates both `spawnSummon` and `spawnDrone`.

## Tuning numbers changed
- **Stats → engine schema:** `speed 79` → walk ≈4.8 (physics maps 78→4.5…98→9.5); `jumpPower 27`
  (the brief's "jumpForce 11.5" is a different unit); `weight 0.95`; attack 82 / defense 74 (brief left open).
  `spriteScale 1.8` (idle content 61px → ~110px on-screen).
- **Drone render scales** ≈ 1.9–2.2 (uniform pixel density ≈ GA); Skyhook/Payload larger (60–70% target).
- **Inputs:** drones on **Special + held direction**; arrows on **motion + attack button** (the engine has no
  native qcf+button path, so this hooks the command-normal interception the way Shisui's Down+Heavy does);
  Super on ↓↘→↓↘→+Special (also on the Ultimate button). Plain-shot charge = **hold Light** (release ≥40 f).
  Kestrel **FIRE2** triggers when the **Charge** button is held as it's summoned (the brief's "hold Special").
- **Ice freeze** reuses Superman's `_supFrozen` at 0.7 s (42 f) instead of 1.2 s — gets his +15%-follow-up for free.
- **Tech hit-income** capped via a per-second budget (12) reset every 60 frames.

## Nothing cut badly
All 12 phases landed. Determinism: **no Math.random / gameRng** in the drone/arrow sim — randomness is the
flight.js `hashRandom(seed,frame,idx)`; all drone state lives in `activeDrones` (GAME_STATE). The one flaky
item was a *test-harness* sequencing issue (rapid skyhook re-spawn), fixed by fully isolating fighter state in
the test hook — the product is deterministic (two-run bit-identical in both node suites).

## Verification (final)
- `green_arrow_render_check.mjs` **14/0** (boot, both render, HUD, all 5 drones spawn+render, ARROWSTORM
  super + Payload bomber, drone-debug toggle, 0 JS errors) — stable across reruns.
- `green_arrow_drones.test.mjs` 17/0 · `green_arrow_roster.test.mjs` 15/0 · `green_arrow_arrows.test.mjs` 14/0
  (incl. 3-drone + super determinism, bit-identical two-run).
- Regression baselines held: determinism **14/0**, combo-standard **229/9**, up-attack-roster **77/2**,
  roster-integrity green. Frame data for every other character is unchanged (all GA edits insert-only).
- Phase 12 training "drone debug" toggle = **F8** (hurtboxes + HP bars).
