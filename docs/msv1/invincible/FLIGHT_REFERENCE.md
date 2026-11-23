# MSV1-INVINCIBLE — flight reference

All numbers are px per sim frame (60 frames / s), read from `flight.js` at the start commit `0beadf134`
(`FLIGHT_PROFILES` + the per-axis integrator `stepFlight` / `axisStep`: held input → `v + accel`, reversing input →
`v × reverseBrake` first, no input → `v × drag` (snapped to 0 below 0.08), then a soft cap at `maxH` / `maxV` and an
ellipse clamp on the diagonal).

| | Homelander | Superman | Dseyl | Omni-Man (`omniman_viltrum`, designed) | old Omni-Man (`omniman`) |
|---|---|---|---|---|---|
| wiring | `traits.flightProfile: "homelander"` | `"superman"` | `"dseyl"` | `"omniman_viltrum"` (MSV1-OMNIMAN, in progress in another session; its numbers are in `docs/msv1/omniman/FLIGHT_REFERENCE.md` on HEAD) | `traits.canFly` (the older simple flight) |
| top speed horizontal `maxH` | 22.0 | 22.0 | **44.0** | **57.2** (any direction, heading + speed integrator) | `physics.flightSpeed` 13 |
| top speed vertical `maxV` | 18.0 | 18.0 | 36.0 | 57.2 | 13 |
| `accel` | 2.2 → top in 10 f | 2.2 → 10 f | 4.4 → 10 f | 5.5 → ≈10.4 f | snap |
| no-input `drag` | 0.84 (coast 115.5 px, ≈32 f to stop) | 0.84 | 0.84 (231 px) | 0.9292 (≈750 px from top speed) | ×0.65 |
| turning `reverseBrake` | ×0.64 → reversed in 4 f | same | 4 f | no brake: ≈35 f to reverse | snap |
| air dash | 34 × 14 f, 2 | 34 × 14 f, 3 | 68 × 12 f, 2 | none | none |
| duration | 240 f = 4 s | 300 f = 5 s | 210 f = 3.5 s | unlimited | energy pool |
| block in flight | yes (generic guard) | yes | yes | only ≤ 40 % top speed | no |
| takeoff / come down | Charge TAP (wall clock, `game.js handleChargeRelease`) | Charge TAP | Charge TAP on the SIM clock (`dseylFlight.js`) | Charge TAP on the sim clock | Charge TAP |

Fastest existing flight = Dseyl (44 px/f). Jetray Mach (90 px/f) is a timed overdrive of one Omnitrix form, not a fighter's
flight (excluded, as MSV1-OMNIMAN did).

## Which Omni-Man the brief means

The brief says "0.9 × Omni-Man's top speed if Omni-Man exists, otherwise 1.15 × the fastest existing flier". Two Omni-Men
are in play: the OLD `omniman` (canFly, 13 px/f) and the new `omniman_viltrum`, whose flight design (57.2 px/f, momentum)
is committed on HEAD in `docs/msv1/omniman/FLIGHT_REFERENCE.md` by the parallel MSV1-OMNIMAN build. 0.9 × 13 = 11.7 would
make the "most agile flier" slower than Homelander, which contradicts the brief's own design (agility vs Omni-Man's
momentum). So the number used is **0.9 × 57.2 = 51.5 px/f** — and it also satisfies the fallback rule (1.15 × Dseyl 44 =
50.6 ≤ 51.5), so Mark is the second-fastest flier behind his father either way.

## Invincible (`invincible`) — `FLIGHT_PROFILES.invincible`

Registered into the flight.js profile table by `invincibleData.js` (`FLIGHT_PROFILES.invincible = {...}`, the same way the
Ben 10 alien profiles are added after the literal) — **no flight.js logic change**: the existing per-axis integrator gives
exactly the agile feel the brief asks for when the numbers are chosen like this:

| | value | derivation / check (asserted in `harness/invincible.test.mjs`) |
|---|---|---|
| top speed `maxH` | **51.5** px/f | 0.9 × 57.2 |
| top speed `maxV` | 42.2 px/f | same 0.82 vertical ratio as Dseyl / Homelander |
| `accel` | **2.45** px/f² | 51.5 / 21 → top speed in 21 f = **0.35 s** |
| `drag` (released) | **0.44** | 51.5 × 0.44⁸ = 0.07 < 0.08 → **stops in 8 frames** (coast ≈ 40 px) |
| `reverseBrake` | **0.60** | 51.5 → 28.5 → 14.6 → 6.3 → 1.3 → −1.6: **SNAP TURN, reversed in 5 frames (≤ 6) from any speed** |
| air dash | none in the profile (his ZIP is the dash, see the move list) | |
| duration | unlimited (`drainPerFrame 0`) | Viltrumite, like his father |
| takeoff | Charge TAP on the SIM clock (Dseyl's reader, in `invincibleState.js`) | same input as every other flier; `game.js handleChargeRelease` skips him |
| land | hold ↓ near the floor / Charge tap / Crash Down | flight.js |
| block in flight | only below **60 %** top speed (30.9 px/f) | above it the guard input is ignored (`_invNoBlock`, one game.js hook) |
| takeoff shockwave | from the ground: the R1 shockwave, **15-damage push** if the opponent is within 70 px | |
| SONIC BOOM | crossing **90 %** top speed (46.4 px/f) — once per acceleration, re-arms below 60 % — R1 white rings, **20-damage push** | |
| flight attacks | damage × (1 + 0.40 × speed / top) → +0 % standing … +40 % at top speed | |
| grounded lock after a hard hit | 90 f (Homelander's) | |

## Ground speed

Fastest ground runner on HEAD = **Ryomen Sukuna (Shinjuku)**: speed stat 94 → speed-tier band 8.5 × WALK_FEEL 1.15 ×
his ×1.5 (`f._sksSpeed`) = **14.66 px/f** (the speed-stat cap 98+ gives 10.93 px/f for everyone else; Kevin's form 12.2,
Dash Parr's top momentum tier ×1.2 ≈ 13.1).
Invincible: **1.1 × 14.66 = 16.13 px/f** = speed stat 98 (10.93) × his multiplier **1.476** (`f._invSpeed`, one physics.js
hook beside Sukuna's, applied to walk / run / air drift / the engine dash).
