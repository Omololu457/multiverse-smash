# limitless.js — the Limitless module

A generic, **profile-driven** module in the style of flight.js, elements.js and drones.js. Any fighter can register a
profile with `registerLimitlessProfile(rosterKey, profile)`. Only `gojo_shinjuku` does so today (from
gojoShinjukuState.js). The module keeps **no match state**: the owner stores plain JSON on its own GAME_STATE object
(`f._gs`), which goes into the determinism snapshot. It has no RNG, no wall clock and no rendering. Every position
it writes back is rounded.

## A) Cursed energy (CE)

| | Gojo profile |
|---|---|
| Range / start | 0–100, starts at 60 |
| Storage | integer units, `ceUnit` = 600 per CE, so every per-frame rate is a whole number (5 CE/s = 50 units/frame) |
| Regen | 6 CE/s while Infinity is off and he is not casting (THE ZONE: ×1.5 = 9 CE/s) |
| Infinity drain | L1 5 · L2 9 · L3 22 CE/s, applied every frame (smooth, no steps) |
| On hit | +4 CE for every hit he lands |
| Depleted | when Infinity drains CE to 0, `ceTick` returns `'depleted'`. The owner then forces Infinity off and techniques are locked for 120 frames (2 s, `ceLock`) |

API: `ceInit`, `ceValue`, `ceHas`, `ceSpend`, `ceGain`, `ceTick(st, P, { infinity, casting, zone, frozen })`.

## B) Fields

Every field reads the world through an adapter `W`, so the module imports no engine file and cannot create an import
cycle. The adapter provides:

* `fighters()`, `projectileList()`, `drones()`, `summons()`, `munitions()`
* `clones(f)` and `patches()`
* a remover for each kind of object
* `stageWidth()`

| Field | Fighters | Projectiles | Clones / drones / summons / munitions / patches |
|---|---|---|---|
| **ATTRACT** `fieldAttract` (Blue) | pulled toward the point, harder near the core; those in the core are reported for the owner's hits | non-super ones are pulled in and **crushed** in the core; supers are ignored | drones / summons / munitions drift in and are crushed in the core |
| **REPEL** `fieldRepel` (Red) | reported if inside the radius (the owner applies the hit) | non-super ones in the reflect window are **reflected**: they change sides and fly back | — |
| **ERASE** `fieldErase` (Hollow Purple) | — (the owner applies the hit) | **every** foreign projectile, supers included, is deleted | every one is deleted: clones and illusions, summons, drones, munitions, ground patches (Enoch's ice / fire) |
| **INFINITY SHELL** `infinityShell` + `infinityRepel` | L2/L3 ring pushes adjacent attackers out (≤ 8 px/frame) | Zeno: speed falls off quadratically toward the boundary, using the engine's per-projectile `timeScale` lease. A projectile that stalls (or reaches the boundary) is reported. At L1 it hangs there for 50 frames, then dissolves. At L2/L3 it is sent back at half speed | — |

Caps: Gojo keeps at most 3 fields and 1 imaginary mass alive (oldest dropped), plus 24 render hints. Fields act only on
objects owned by someone else.

## The three Infinity levels (data: `INFINITY` in gojoShinjukuData.js)

| | L1 Infinity | L2 Repel | L3 Absolute |
|---|---|---|---|
| Reach | hold < 30 f (or tap) | hold 30 f | hold 60 f |
| Drain | 5 CE/s | 9 CE/s | 22 CE/s |
| Stopped-hit tax | 6 % of the hit's damage | 4 % | 3 % |
| Boundary / slow zone | 14 / 120 px | 14 / 120 px | 22.4 / 192 px (×1.6) |
| Repel ring | — | 48 px | 76.8 px |
| Supers | connect | 50 % damage, can't launch him | stopped (cinematic supers whiff at their first hit) |

Tests: `node harness/limitless.test.mjs` (CE economy, every field, Zeno at each level, determinism).
