# MSV1-MERGE: frame-data diff

**Tool:** `node harness/msv1_merge_framediff.mjs [base] [head]`. The base defaults to `MERGE_START_COMMIT.txt`
(`8bdcd4e33`). Only committed sources are compared (`git archive`), never the dirty worktree.

## Every other character: ZERO diff
| Check | Result |
|---|---|
| Every character except the two forms, as a whole object (157 characters, Ben 10 and every alien entry included) | byte-identical |
| Every skin of every existing character | unchanged |
| Ben 10 alien registry (32 entries) | unchanged |
| Ben variant stat table and `TRANSFORM_ENERGY` (the swap numbers the duo reads) | unchanged |
| Roster damage parity | unchanged for every existing character |
| Every rangers.js profile (S.P.D. Red and the two forms included) | unchanged |
| Shared engine files | base + exactly the `tools/msv1/hooks.py` table; every hook is gated on `windrangers` / `_duo` / an MSV1 symbol |
| Every other changed file | an MSV1-owned path |

## The two forms vs their Phase 0 snapshots
| Form | Snapshot fields | Differ |
|---|---|---|
| Shane (`ns_red`) | 872 | **0** |
| Dustin (`ns_yellow`) | 821 | **0** |

The snapshots cover frame data, damage, hitboxes, NP costs, every framework system's numbers, stats, run speed,
health and weight.

The only change to each form's roster entry is `hidden: true`, because it is now a form of the duo.

## What actually differs in play: the shared-pool effects
These come from the duo wrapper (`nsDuo.js`), not from the form data:

| Field | Shane alone | Dustin alone | Shane & Dustin (either form) |
|---|---|---|---|
| Max health | 1200 | 1296 | **1248**, one shared pool (S.P.D. Red 1200 × 1.04) |
| Weight → knockback taken | 0.85 | 1.0 | **per active form**, unchanged (Shane 0.85, Dustin 1.0) |
| Max jumps | 3 | 2 | per active form (3 / 2) |

So the duo's Shane has 48 more health than plain Shane, and its Dustin has 48 less than plain Dustin. Knockback
follows whichever ranger is in when the hit lands.

Everything else (moves, frame data, damage, NP costs, supers, Mirror modes, barriers, burrow, traps, REV, Wind Float)
is the form's own data, byte-identical.

New duo-only moves live in `nsDuo.js` (`DUO_MOVES`), not in the form profiles:
* `nsSwap`, the 14-frame swap with its swap-in strike: 30 blunt, 14 hitstun;
* `sTag`, STORM AND STONE: 96 frames, 420.
