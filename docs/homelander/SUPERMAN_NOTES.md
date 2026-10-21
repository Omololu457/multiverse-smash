# Superman Readiness — plugging a future Superman into `flight.js`

Homelander was built as the **prototype** for a future Superman. The flight system is a
reusable, data-driven module (`flight.js`); Superman reuses it by adding **one profile** and
wiring the same hooks. This note is the migration map.

## 1. What the module already supports (no new code needed)
`flight.js` is entirely character-agnostic in logic — every tunable is in `FLIGHT_PROFILES`:
- Velocity-driven 8-way flight (accel / drag / reverse-brake / overspeed momentum-carry),
  diagonal-normalized, ceiling-eased.
- Air dashes (count / speed / frames / cost), all per-profile.
- Flight-energy gauge (max / drain / ground-refill / dash cost), takeoff/landing, grounded-lock.
- Velocity→pose selection with a minimum-hold, and render-only polish (bob/tilt/speed-lines/
  cape-wind) that never feeds the sim.
- Deterministic (`hashRandom`, no `Math.random`) → LAN/replay-safe out of the box.

A new flyer is a **data change**, not a logic change.

## 2. The one thing to add — a Superman flight profile
A commented stub already ships in `flight.js` (`FLIGHT_PROFILES.superman`). Superman is a
stronger, longer, faster flyer than Homelander — the values he'd change:

| Field | Homelander | Superman (suggested) | Why |
|---|---|---|---|
| `energyMax` | 240 (~4 s) | **420 (~7 s)** | Superman flies longer / more freely |
| `accel` | 0.55 | **0.72** | snappier, more powerful takeoff |
| `maxH` / `maxV` | 6.5 / 5.5 | **8.0 / 7.0** | faster cruise (Kryptonian speed) |
| `dashSpeed` / `dashCost` | 11 / 30 | **13 / 22** | cheaper, faster air dashes |
| `groundedLock` | 90 | 60 | recovers from a hard knock sooner (more durable) |
| `drain` / `groundRefill` | 1 / 0.8 | 1 / 1.0 | refills a touch faster on the ground |

Everything else (takeoff/land frames, min-pose-hold, sweep feel) can stay at the defaults.

## 3. Registration — the same five touch-points Homelander uses
1. **`characters.js`** — a `superman` entry (or a new `superman_flight` variant so the existing
   Supermen are untouched) with `traits.flightProfile: "superman"`. **Do NOT set `traits.canFly`**
   — that routes to the *old* simple Omni-Man/Superman snap-velocity flight. The new module is
   gated purely on `flightProfile`, so the two systems never collide.
2. **`spritesheets.js`** — an idle-gate manifest entry.
3. **`skins.js`** — a default entry (the spriteScale gate).
4. **`sprite.js`** — nothing new: the gated flight-pose branch already maps `_flightCtl.poseKey`
   → `flyHover/flyCruise/flyRise/flyDive/flyTurn/flyDash/takeoff/land`. Supply those animation
   strips in his `animationData` and they resolve automatically.
5. **`game.js`** — nothing new: the charge-tap takeoff (`flightToggleInput`), the per-frame
   `tickFlightDriver` + opponentX auto-face, the `resetFlight` round-reset, and the
   `drawHomelanderGauges`-style HUD are all already wired and gated on the module state. (The HUD
   gauge draw is currently gated to `rosterKey === "homelander"`; generalize that one check to
   `getFlightProfile(f)` to light the flight-energy bar up for any profile flyer.)

## 4. Kit mapping — where Homelander's slots become Superman's
Superman reuses the flight + the hitscan-beam scaffolding; only the *flavor* changes:

| Homelander | Superman equivalent | Shared machinery |
|---|---|---|
| **Heat Vision** (eye beam, heat gauge, sweep, overheat) | **Heat Vision** (identical) | `applyHomelanderHeatVision` is already generic over the fighter — rename/alias and gate on his key; the `_laserHeat` gauge + overheat + eye-anchor origin all carry over unchanged |
| **X-Ray marking** slot | **Freeze Breath** | a cone/line effect in the same "driver + code-drawn FX + hitscan" shape as Heat Vision — swap the beam for a slowing frost cone; the X-Ray slot is the natural home for it |
| **Supersonic / Sonic Clap / Barrage** | same archetypes (super-speed / clap / flurry) | identical `createAttackFromMove` + FX-timer pattern |
| **Take A Ride** (grab → fly → throw down) | same | reuses the command-grab + flight carry |
| **Supe Durability** (chip −40%) | **Invulnerability** (chip reduction, maybe steeper) | the gated line in `applyScaledDamage` — change the key + the ratio |
| **Flex** (ego parry) | — | character-specific; Superman would use a different defensive read |

## 5. What the module would still need for Superman (small)
- **Generalize two `rosterKey === "homelander"` gates** to profile/trait checks so they light up
  for any flyer: the HUD gauge draw (`drawHomelanderGauges`) and the Heat-Vision driver dispatch.
  (The physics/flight-pose/round-reset hooks are already profile-gated, not key-gated.)
- **A freeze-breath slot**: Heat Vision's driver/FX/hitscan is the template; Freeze Breath is the
  same shape with a frost cone + a slow debuff instead of burn damage.
- Optional: a second HUD accent so two profile flyers on screen read distinctly.

**Net:** a future Superman is ≈ one `FLIGHT_PROFILES` entry + one `characters.js` entry + his
art + a couple of gate generalizations. The flight *feel*, energy economy, pose selection,
determinism, and HUD are already done and proven (flight harness 1031/0, engine harness 1047/0,
in-game render check). No Superman code was written here — this is the plug-in map.
