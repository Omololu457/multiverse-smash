# Ninja Storm Rangers — Test results (Phase 10)

Run on the exported phase-10 tree (START 2eda4b622 + every MSv2 phase), 2026-11-19.

## MSv2 suites

| Suite | Result |
|---|---|
| `harness/msv2.test.mjs` (roster · vanish · focus · clone · kawarimi · dial · red · yellow · ult · defense · sound · det) | **87 / 0** |
| `harness/msv2_render.mjs` (render check: one entry, both stances, dial, Vanish, Clone, Kawarimi, both Modes, both Ultimates) | **29 / 0** |
| `harness/msv2_combos.mjs` (14 routes incl. stance-swap combos) | **9 / 0** |
| `harness/msv2_framediff.mjs 2eda4b622 <branch>` | **11 / 0** |

Per-phase slices (each phase's own tree): P2 42/0 · P3 60/0 · P4 78/0 · P5 78/0 + combos 9/0 · P6 82/0 · P7–P9 85/0.
Phase 1 tree boots (no page error, both fighters drawn, HUD).

## Shared suites vs the START baseline

| Suite | START | With MSv2 |
|---|---|---|
| determinism | 14 / 0 | 14 / 0 |
| combo_standard_audit | 233 / 9 | 233 / 9 (same failures, pre-existing) |
| up_attack_roster | 77 / 2 | 77 / 2 (superman / ghostface, pre-existing) |
| credits | 11 / 3 | 11 / 3 (pre-existing; ninja_storm_rangers is attributed) |
| roster_integrity | ✅ | ✅ |
| replay_playback | 10 / 0 | 10 / 0 |
| msv1_merge | 47 / 0 | **46 / 1** |

**The one new failure, NOT edited:** `msv1_merge.test.mjs` asserts that "only the duo (windrangers) is visible for
Ninja Storm". This build is, by the user's explicit request, a *separate* test fighter, so a second Ninja Storm entry
is visible. The test was not changed (the brief forbids editing a test to make it pass). Resolving it is the user's call:
merge-time decision or retire one of the two fighters.
