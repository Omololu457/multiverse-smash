# Syndrome — verification record

Everything below was run on 2026-11-14 in this checkout (branch `main`, HEAD `5fa3bc8d6` plus the uncommitted work of
concurrent sessions), headless Chromium via Playwright. Nothing here claims physical controller testing.

## Syndrome suites

| Command | Result | What it covers |
|---|---|---|
| `node harness/syndrome_boot.mjs` | clean (0 page errors; 11 missing-file requests, all other characters' assets) | page boots with Syndrome registered, sprite settles to idle |
| `node harness/syndrome.test.mjs` | **76 passed / 0 failed** | command chain + cancels, launcher → jump-cancel → air, every special, every L2 command, slot budgets never blocking normals, refusals spend nothing, guard rules, one contact per volume, Convergence, Zero-Point once per combo, ultimate stages, turret destruction, KO cleanup; writes `mechanics_results.json` |
| `node harness/syndrome_determinism.mjs` | **20 passed / 0 failed** | 5600-frame input-only replay identical frame-by-frame (every command exercised), render batching (per-frame vs 4-frame steps) identical, repeat run identical, ultimate deterministic, training reset / mid-ultimate reset / identity change clear every machine, live KO → next round, LAN slot-2 remote input drives the command layer, gamepad == raw parity, no `Math.random` in `syndrome*.js` |
| `node harness/syndrome_skins.test.mjs` | **107 passed / 0 failed** | all 12 skins + default: body and every machine family drawn from that skin's own baked sheets, light/dark stage shots, arsenal shots in `docs/syndrome/skins/` |
| `node harness/syndrome_visual.mjs` | see `visual_results.json` (final count in the report) | real menu flow → universe grid → Syndrome → skin → stage → match vs CPU Syndrome; every command in real time facing right AND left; ultimate stages A–E screenshots; two-arsenal performance profile; KO → victory → rematch (same skin, clean state) → defeat; intro skip |
| `node harness/syndrome_damage.mjs` | measured vs syndrome, goku, superman, megumi_fushiguro, robin | every move from a fresh state; see `DAMAGE_AUDIT.md` |
| `node harness/syndrome_framedata_diff.mjs` | **ZERO diff for all 899 other blocks** | every other character's frame data byte-compared against this worktree minus the Syndrome lines (roster 149 → 150) |

## Shared regression suites (whole roster)

| Command | Result | Note |
|---|---|---|
| `node harness/determinism.test.mjs` | 14 passed / 0 failed | unchanged |
| `node harness/roster_integrity.test.mjs` | green | Syndrome registered once, under one key |
| `node harness/combo_standard_audit.mjs` | 231 passed / 9 failed | same count as the pre-existing baseline; every failure is another character's (unclassified list, gogeta / goku_rose normals); Syndrome appears only in the shared "unclassified" list alongside every recent addition |
| `node harness/up_attack_roster.test.mjs` | 74 passed / 5 failed | the known superman / ghostface frame-data mismatches plus three `batman` rows from a concurrent, unfinished Batman build; Syndrome is not on that suite's fixed list (his launcher is covered by `syndrome.test.mjs`) |
| `node harness/credits.test.mjs` | 11 passed / 3 failed | failures name only other keys (green_arrow, homelander, kakashi_anbu, ghostface_exe, soldier_boy, sasuke_war_susano); Syndrome's GBA credit is present |

## Defects found and fixed during verification

- **Launcher → jump-cancel → Drone Strafe dropped** when the jump came the instant hitstop ended: Syndrome rises at −24
  while the launched foe rises at −19, so the strafe volume (28–84 px above his feet) passed over the foe. The strafe now
  sweeps forward-down to 36 px below his feet (`syndromeData.js` `air.box`); the fastest cancel connects (route measured
  45 + 32 = 77, true combo).
- **Launcher Up latch**: the launcher's `jumpHeld` latch now releases during its hitstop when Up / Jump are not held, so a
  fresh jump press cancels (same rule as Megumi).
- **Rip artefact**: (155,12,155) pixels beside the magenta key are treated as background (`tools/syndrome/blobs.py`); only
  `gunFireFront` changed.

## Test-fixture corrections (no assertion weakened)

- Render-batching check: the camera is not reset by training reset and was left where the 5600-frame replay ended,
  clamping P1 on the first frames of whichever run came first (every run after it matched). A discarded warm-up run now
  settles it; all three compared runs stay strict. Without a preceding replay the runs matched for all 2800 frames.
- Lifecycle and profile scenarios issued the next command 20 frames after Duet (25 f) / Turret (33 f) — inside their
  recovery, so the command was refused and the turret never deployed. They now wait out recovery.
- Real-time key taps raised from 40 ms to 80 ms (a human-length tap): under machine load a 40 ms tap could fall between
  two slowed frames and never be seen. In isolation both Zero-Point and the ultimate fired with either length.
- The part-art cache check now asserts the real no-leak property — every cached entry is a part URL of a fighter in play,
  so the cache is bounded by that finite strip set — instead of "two passes render identical strips" (which strips a
  batched pass happens to render varies with frame boundaries; each URL is still loaded exactly once).
- P2 keyboard: the harness routes slot 2 through the AI key-clearing path, so P2 keys cannot be driven there; slot 2 is
  covered through the LAN remote-input path instead (determinism suite).

## Not verified

- No physical PS5 DualSense was used. Pad mapping is verified by gamepad == raw-input parity in the harness only.
- P2 local keyboard play (see above).
