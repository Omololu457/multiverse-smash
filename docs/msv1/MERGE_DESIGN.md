# MSV1-MERGE: design decisions (Phase 0)

## One character, two forms
* A new roster character, `windrangers` ("Shane & Dustin", subtitle "Wind Rangers"), lives in the MSV1-owned
  `nsDuo.js`.
* At round start the duo state goes on `f._duo` (GAME_STATE):
  `{ id, form, start, cd, swap, tag, tagT, swaps, armT, downAt, ... }`.
* The fighter's live `rosterKey` is set to the **active form id** (`ns_red` / `ns_yellow`). Everything form-specific
  then runs through the existing, unchanged code: the ninja profile, the Ranger profile, sprite sheets, HUD portrait,
  sound prefix, quotes, CPU perception and the kit.
* A swap copies the new form's roster fields onto the fighter (animationData, sprite sheet, portrait, name, colour,
  basic attacks, traits) along with its movement stats (speed, dash, jumps, jump power, weight).
* `nsData.js` profiles and the two form roster entries are not changed, except `hidden: true` on each roster entry.
  Each form diffs zero against its snapshot.

## Aliases (old ids)
| Old id | Where it appears | Resolves to |
|---|---|---|
| `ns_red` | session restore (saved settings) | `windrangers`, skin `default` (start as Red) |
| `ns_yellow` | session restore (saved settings) | `windrangers`, skin `start_yellow` (start as Yellow) |
| `ns_red` / `ns_yellow` | replays, tests, `?p1=` harness URLs, LAN setups from an old build | the hidden form character itself, which is bit-identical to before |

Old replays therefore need no migration and no `BALANCE_STAMP` bump: the recorded character still exists unchanged.

## The swap (taken from Ben 10; see MERGE_BEN10_SWAP_REFERENCE.md)
**Input:** ↓↓ then **Grab** (O / pad L1·LB), using Ben's own windows: the second ↓ edge must come within
`OMX_DOUBLE_TAP_WINDOW` (16) of the first, and the button within `OMX_ARM_WINDOW` (18). The windows are read from
game.js through `MSV1_WORLD.omxWindows()`.

**Cost:** `TRANSFORM_ENERGY.SWAP_COST` = 15 Ninja Power (the brief's 15 matches Ben's).

**Cooldown:** `TRANSFORM_ENERGY.SWAP_LOCKOUT` = **30** frames. This is Ben's real lockout; the brief said 90 but also
said "use Ben's cooldown if different".

**Animation:** 14 frames.
* t 0-6: the outgoing ranger vanishes in his own smoke (R23 → R24).
* t 7: the form flips.
* t 7-13: the incoming ranger bursts out of R23 in the same spot.
* Invulnerable on t 4-9 (6 frames). Ben's swap has no invulnerability, so the brief's 6 stands.

**Allowed:** grounded, airborne, at the end of a streak (a buffered press runs when the streak ends), and in the
recovery frames of a normal (after its active frames end).

**Refused:**
* in hitstun, blockstun or a super/ultimate;
* during knockdown, a grab, burrowed, a Vanish or a Mirror swap;
* while the cooldown runs or without the NP.

**Momentum:** kept. The brief says air swaps keep momentum; Ben's handler zeroes vx, and this is documented as a
deliberate difference.

**Shared across forms:** health (one pool, `maxHealth` 1248 = S.P.D. Red's 1200 × 1.04), NP, the super meter, the
combo counter, position, facing, velocity, hitstop, and the air streak / air-use counters.

**Per form:** weight (and so knockback), movement stats, moves, supers, Mirror mode, Barrier kind.

**What a swap ends:**
* the Mirror (both bodies pop);
* clones (pop);
* REV pips (lost);
* burrow (he surfaces, no eruption);
* Wind Float.

Traps and Gale projectiles already on screen stay, so cross-form trap bait is intended.

**Swap-in strike:** 30 blunt with a small stagger (14 hitstun), and nothing auto-combos from it. If it connects, the
**tag bonus** applies: the other form's next ninja-scripted special gets ×1.10 within 3 s (180 frames). It folds into
`revMul`. Traps are excluded because their damage lands later.

## Meter and the tag ultimate
The engine meter is 100 = **2 bars** (`BAR = 50`), so a 3-bar cost is impossible.

**Adaptation:** "STORM AND STONE" costs the **full meter (2 bars)** and is the duo's outside-the-Mirror 2-bar move.
Inside the Mirror, the 2-bar slot stays each form's Mirror ultimate.
* **Input:** ↓↘→↓↘→ + Special + Heavy.
* **Damage:** 420, split between energy and blunt.
* **Art:** only the R11 tornado, R8 dust ring and R24 smoke frames.

Each form keeps its own 1-bar super, and the 2-bar Mirror ultimates stay Mirror-only.

## Start form
The start form rides on the skin id, so it is recorded in replays and LAN `MATCH_SETUP` with no protocol change:
`default` starts as Red, `start_yellow` starts as Yellow. Every round restarts in the start form.

## Determinism
* All duo state lives on `f._duo` and is pushed into the replay checkpoint snapshot.
* Smoke and portraits are render-only.
* No Math.random anywhere. The CPU's swap choice uses only visible state (distance, airborne, projectiles on screen)
  plus the cooldown.
