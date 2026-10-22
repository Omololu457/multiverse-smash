# Spider-Man — Web Traversal Design (Phase 2)

How the web-swing, web-zip, ceiling-hang and web-fluid gauge work, why they're built
this way, and what is reused from the existing engine. All numbers live in one DATA
profile: `SPIDERMAN_TRAVERSAL` in `abilities.js`.

## 1. Engine study — what the arena actually provides

Read from `physics.js` / `game.js`:

- **Gravity / jump:** `physics.applyGravity` pulls `vy` down by `gravity` each airborne
  frame; `moveFighter` integrates `vx/vy` into position and applies `airFriction` to air
  momentum. Jump is an upward `vy` impulse; Spider-Man has `maxJumps: 2` (double jump).
- **Stage bounds:** floor at `groundY` (per-fighter, ~470–520); horizontal movement is
  **clamped** to `[stageLeft, stageWidth]` (0 … 3200) — these are *soft clamps, not
  collidable geometry*. The ceiling is a soft ease-zone (`-360`), not a surface.
- **Other surfaces:** **none that collide.** Wood-release platforms are one-way and
  character-specific. There is **no wall or ceiling you can stick to.** This decides the
  wall-cling tier (below).
- **Position ownership:** `applyGravity` early-returns for a fighter who owns its own
  position this frame — the existing Spider-Man swing already used
  `if (fighter._swinging) return`. Phase 2 extends that to `_zipT`/`_hangT`.

## 2. Approaches compared

| Approach | What it is | Verdict for us |
|----------|-----------|----------------|
| **Capcom Marvel pendulum** (committed-arc) | A web anchors to a point and you swing a real pendulum arc; release keeps the tangent velocity. | **Chosen.** It is a true arc with learnable release timing, and it fits an engine with only a floor. |
| **3D anchor-and-release** (Spider-Man 2/Web of Shadows) | Free-flight with an anchor you can steer in 3D. | Too free for a 2D fighter; would read as flight, not a committed approach. |
| **Homelander `flight.js`** | Free 8-way flight with accel/drag/air-dash and an energy gauge. | **Not the motion model** (flight ≠ pendulum), but its *shape* is reused — see §3. |

The swing is a **real pendulum** — `_swVel += -(grav/L)·sin(ang)` each frame, integrated
into an angle — **not a scripted path**. The pose and release both fall out of the physics
state, exactly as the brief requires.

## 3. What is reused from `flight.js`

- **The data-profile pattern.** `flight.js` drives all motion from a pure `FLIGHT_PROFILES`
  object; Spider-Man mirrors that with `SPIDERMAN_TRAVERSAL` (swing/zip/hang/fluid) so there
  are no magic constants in the per-frame math.
- **The drag / soft-clamp helpers.** `flight.js` keeps `axisStep` (drag) and `softLimit`
  (overspeed clamp) module-private, so they're re-expressed inline: the swing's per-frame
  `_swVel *= drag` is the `axisStep` drag term, and the in-arc `speedMax` clamp + the
  release `vmax` clamp are the `softLimit` idea.
- **Determinism:** like `flight.js`, the traversal uses **no `Math.random` / `gameRng`** —
  pure arithmetic on fighter fields — so it is LAN/replay-safe by construction. (`flight.js`
  also exports `hashRandom(seed,frame,player)` for seeded choices; the traversal needs none.)
- **The gravity-yield gate.** The existing `_swinging` gate in `physics.applyGravity` is the
  flight-module pattern (`_flightCtl && isFlying` → gravity no-op); Phase 2 adds `_zipT`/`_hangT`.

## 4. The built system

### A. Web Swing (the signature) — `AIR + Up + Special`
- Fires a web to an invisible anchor **up-and-ahead** (`aheadX`, `upY` above the hand,
  clamped near the ceiling). Rope length `L = hypot(...)`.
- Swings as a **pendulum**: gravity torque accelerates through the bottom of the arc and
  slows him as he rises. Angular velocity is **seeded from his entry momentum** (tangential
  projection), never a scripted curve.
- **Release** (press Special again, or any attack) keeps the **tangent velocity**:
  releasing at the bottom sends him fast-and-flat, releasing late sends him high. The fling
  is `_swVel · L · fling`, clamped to `vmax`.
- **Pose by physics:** the `spiderSwing` reaching pose is held by swing *state*, not a frame
  counter. The web **line** is drawn procedurally hand→anchor (`game.js drawSpidermanWebSwing`).
- **Two swings before touchdown:** `maxSwings: 2` via `_swingsSinceGround`, re-armed on
  landing — so a full screen crossing is two swings, then he must land.
- **In-arc speed clamp** (`speedMax`) keeps the bottom of the arc smooth instead of a blur.
- **Cost:** `cost` web-fluid; he is vulnerable mid-arc (a hit clears the swing — anti-airs
  beat a predictable swing, as intended).

### B. Web Zip — `AIR + Fwd + Special`
A fast straight **pull** (short windup → `speed` px/frame straight-line travel) that ends on
the floor. A reposition tool, **no hitbox**, costs `zip.cost` fluid. Owns position via the
`_zipT` gravity gate; driven by velocity so `moveFighter` applies it once (no double-move).

### C. Wall-cling — **TIER 3 (Ceiling-Hang)**, `AIR + Back + Special`
**Reported tier: Tier 3.** The engine has **no collidable wall/ceiling surfaces** (§1) —
stage bounds are soft camera clamps, not geometry. A Tier-1/Tier-2 wall-stick would *fake a
surface the engine cannot collide with*, which the brief explicitly forbids. So Spider-Man
instead **fires a web straight up and hangs** from it above the fight (`hang.upY`, timed by
`hang.maxT`), then **drops** (press Special/attack, or timeout → `dropVY`). Honest,
deterministic, uses no faked surface. (If collidable walls are ever added, this upgrades to
Tier 2 edge-cling cleanly — the crawl art is already sliced.)

### D. Web-Fluid Gauge
- The `web_fluid` energy pool (max 180). Swing / zip / hang each spend from it.
- **Refills on the ground**, **faster when standing still** (`regenGround` vs `regenStill`,
  gated by `stillVx`). A **spend pauses regen** for `spendDelay` frames so a web move's cost
  reads true and he can't instantly recoup under pressure.
- **Running dry is a real state:** `spendEnergy` fails → no swing, no zip, no hang until it
  recovers. This caps infinite air movement.

## 5. DATA profile (`SPIDERMAN_TRAVERSAL`, abilities.js)

```
swing: cost 8, maxT 120, grav 1.5, fling 1.18, vmax 28, aheadX 250, upY 250,
       ceil -330, ropeMin 90, gripY 0.30, floorRel 0.55, maxSwings 2,
       seedVel 0.035, drag 0.999, speedMax 30, minPoseHold 3
zip:   cost 10, dur 12, windup 3, speed 30, upBias -5.5, vmax 32
hang:  cost 6, maxT 90, upY 120, dropVY 2
fluid: regenGround 0.9, regenStill 1.9, stillVx 0.6, spendDelay 40
```

## 6. Smoothness requirements (gates) + harness output

Per-frame drivers: `updateSpidermanWebSwing` / `WebZip` / `Hang`, plus
`updateSpidermanTraversal` (steps zip/hang, refills fluid, re-arms the 2-swing counter on
landing, clears traversal state on hit). All called from `game.js` each frame.

- **Pose is chosen from physics state** (swing/zip/hang state), never a frame counter alone.
- **Minimum pose hold = 3 frames** (`minPoseHold`), except when interrupted.
- **In-between frames:** the reaching `spiderSwing` pose is held across the arc; transitions
  hand off to the `Land` frames on touchdown.
- **Interpolation:** the sim owns integer-frame position; rendering reads it directly (same
  as every other fighter), so no sub-tick feedback into the sim.

**Test harness:** `harness/spiderman_traversal.mjs` drives the real game through a scripted
route (swing → release → zip → hang → drop → land), sampling every frame **synchronously**
(via `__harness.aiVsAi.step`, so the real-time loop can't drop frames from the measurement).
It asserts and currently reports:

```
per-frame maxStep: swing=21.60 zip=26.81 hang=3.00 px   (all ≤ 38 = max traversal speed)
✅ no single-frame position jump > 38px (no teleport/snap)
✅ every traversal pose holds ≥ 3 frames (no 1-frame flicker)
✅ full route: run 2 == run 1 (identical every frame)
✅ full route: run 3 == run 1 (identical every frame)
✅ same end position on 3 identical runs — 2941,2941,2941
→ 6 passed, 0 failed
```

Determinism is proven by three byte-identical per-frame traces and an identical end position.
(The brief's "3 identical runs" is run after a warm-up route so all three start from the same
settled state; a real LAN match runs one seeded sim on both ends, so this holds there too.)
