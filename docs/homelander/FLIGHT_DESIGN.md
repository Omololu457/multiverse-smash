# Flight System Design — `flight.js`

A reusable, data-driven flight module. Homelander is the first user; a future Superman
reuses it by supplying a different **flight profile** (data, not code). Nothing here is
Homelander-specific in logic — all numbers live in `FLIGHT_PROFILES`.

## 1. Research — flight in fighting games

| System | Model | What we take | What we reject |
|---|---|---|---|
| **MK-style "flight stance" flyers** (e.g. MK vs DCU flyers, Injustice's Superman/GL air stance) | A toggled hover where you float and drift; movement is slow, deliberate, not a full air-dash game. Attacks from the hover are the point. | The **toggle-to-hover** feel and "hover idle when still". The idea that flight is a *stance* you commit to, not a free jump. | Their stiff position-snap movement (no momentum). |
| **Injustice flying characters** | Flight is mostly a traversal/zone tool; a hard hit ends it and you're grounded briefly. Anti-airs still beat you. | **Grounded-on-hard-hit** (1.5 s lockout), anti-airs work normally, "strong not invincible". | — |
| **Marvel vs Capcom flight mode** | A timed mode with **free 8-way velocity** movement, used for air mobility + fly-cancel pressure. | **Free 8-way velocity** movement, a **flight-energy timer** (~4 s), attack/block/special while flying, fly-cancels. | Infinite-ish fly loops (we cap energy + grounded punish). |
| **Dragon Ball FighterZ** | Superdash + **8-way air dashes** with real acceleration; vanish/air-dash cancels. Movement has weight and carry. | **8-way air dashes** (2 per flight, momentum carried out, no dead stop), acceleration + drag feel. | Full vanish/teleport economy (out of scope). |

### The existing engine (what's already here)
- `physics.js` already has an **Omni-Man / Superman** flight path, gated on `traits.canFly`
  → `_flightActive`. It is a **snap-velocity** model: `moveFighter` sets `vx/vy = ±flightSpeed`
  directly (no accel/drag), `applyGravity` skips gravity and clamps to floor/`-360` ceiling.
  Driver `applyOmniManFlightSystem` (abilities.js) ticks a shared-energy drain and a
  forced-descent crash. Toggle on the charge-button edge (game.js).
- **Decision (logged):** that simple system is kept **byte-identical**. `flight.js` is a
  *separate, richer* module gated on `traits.flightProfile`. Homelander never sets
  `traits.canFly`, so he never touches the old path; Omni-Man/Superman never get
  `flightProfile`, so they never touch the new one. Two flyers, zero interference.
  `SUPERMAN_NOTES.md` covers migrating a future Superman onto `flight.js`.

## 2. State machine

```
GROUNDED ──(takeoff input, has energy)──▶ TAKEOFF(takeoff frames + blast streak, ~6f)
   ▲  ▲                                        │
   │  │                                        ▼
   │  └────(soft land: 4f / after-air-attack: 8f)──── FLYING ◀──(enter mid-jump)── (airborne + takeoff input)
   │                                               │  │  │
   │   land triggers:                              │  │  └─(dash edge, <2 used)─▶ AIR_DASH(14f)─┐
   │    • hold Down near floor                     │  │                                          │ (momentum carried)
   │    • energy == 0                              │  └──────────────────────────────────────────┘
   │    • knocked down (hard hit)                  │
   └──(hard hit in flight)──▶ GROUNDED_LOCK(90f = 1.5 s, cannot take off)
```

All of the above is **simulation state** (see §6).

## 3. Movement model (velocity-driven — never position-snap)

Per axis, each frame:
- **Input held** on an axis → `v += accel` (clamped). If `v` currently points *opposite*
  to the input (reversing), first apply `reverseBrake` so a turnaround kills momentum fast.
- **No input** on an axis → `v *= drag` (floaty coast; this is the "feel good" drift).
- **Diagonal normalization**: after integration, clamp the *vector* to an ellipse
  `(vx/maxH)² + (vy/maxV)² ≤ 1` so diagonals are not faster than cardinals.
- **Ceiling ease**: within `ceilEaseZone` px of the ceiling, upward `vy` is scaled by the
  remaining distance → eases in, no hard stop. Walls left/right and floor clamp hard.

Profile targets: `accel 0.55` reaches `maxH 6.5` in ≈12 frames (held, no drag). `maxV 5.5`.
`drag 0.86` no-input coast. `reverseBrake 0.72` + accel crosses zero in ≈8 frames → the
"stop/turnaround in ~8" target. (No-input drift is deliberately longer — that's the glide.)

**Air dash**: `dashSpeed 11`, `dashFrames 14`, up to `maxAirDash 2` per flight, 8 directions
from the held stick (facing if neutral), diagonal-normalized. On end, velocity is **not
zeroed** — it blends into `maxH/maxV` so momentum carries into normal flight. Costs
`dashCost` energy.

**Facing**: auto-face the opponent while hovering (|v| low); face travel direction while
cruising fast; a facing flip plays the cape-flip turn frames.

## 4. Animation selection (from velocity, not input)

Pose chosen by velocity band, **minimum 4 frames hold** before switching (except an attack
or hit interrupt). Bands: `hoverIdle` (|v| low), `cruise` (horizontal flying cycle, frame
rate scaled by |vx|), `rise` (vy up), `dive` (vy down), `brake` (reversing), `turn`
(facing flip → cape-flip). Transitions pass through `rise`/`dive` in-betweens instead of
popping. Air-dash shows the cape-twirl.

**Render-only polish (never feeds the sim):** hover bob (sine, 2 px, deterministic phase
from frame), body tilt toward velocity (≤10°, eased), speed lines + after-trail above 70%
of max speed, code-drawn cape wind lines. These read `state` but write only to a
`renderHints` object the renderer consumes — `stepFlight` never reads them back.

## 5. Rules & balance
- **Flight energy** ≈ 4 s (`energyMax 240` frames, `drainPerFrame 1`). Thin bar under HP.
  Refills on the ground, full in ≈2 s (`groundRefillPerFrame 2`). Air dashes cost a chunk.
- Can attack / block (air-block rules) / air-special while flying.
- **Hard hit in flight** → knocked down + `GROUNDED_LOCK` 90 f (1.5 s) can't take off.
- Anti-airs work normally; flight is strong, not invincible.
- **CPU**: takes off to zone with lasers, lands when low on energy, won't fly into anti-airs
  (AI rules authored in Phase 4).

## 6. Simulation vs render (determinism / LAN / replay)
**Sim state** (in the fighter object, inside GAME_STATE, synced + replayed): `flight.phase`,
`vx/vy` (engine's own), `flight.energy`, `flight.airDashCount`, `flight.dashTimer`,
`flight.groundedLock`, `flight.landRecovery`, `flight.poseKey`, `flight.poseHold`,
`flight.facingLatch`. **Render-only** (recomputed each draw, never synced, never read by
sim): bob offset, tilt angle, speed-line/trail particles, cape wind lines.
No `Math.random`/`gameRng` anywhere — any randomness uses `hashRandom(seed, frame, player)`
(a pure integer hash). Laser heat is sim state too (Phase 3).

## 7. Integration plan (how it wires into the engine)
- `physics.moveFighter`: a new branch gated on `fighter._flightCtl` delegates horizontal +
  vertical velocity to `flight.stepFlight` (parallel to the existing `_flightActive` branch,
  but only for profile flyers). No-op when absent → every other character byte-identical.
- `physics.applyGravity`: gated branch skips gravity for `_flightCtl` flyers (flight owns y).
- `combat.updateFighterState`: call `flight.tickFlightDriver` beside `applyOmniManFlightSystem`
  (energy drain/refill, grounded-lock, land recovery, pose hold).
- `game.js`: takeoff input edge (see Phase 2 input-collision report) → `flight.takeoff`;
  render hook draws blast streak / speed lines / cape wind via the render-only helpers.
- `characters.js`: Homelander carries `traits.flightProfile:"homelander"` + flight animation
  frames. `flight.js` reads the profile by that key.

## 7b. Takeoff input — collision check (required report)

The engine's complete input/action set (from `input.js`): **left, right, up, down, jump,
light, heavy, upAttack** (Up+attack launcher), **special, ultimate, dash** (double-tap
Left/Right), **grab** (L1), **charge** (L2), **block** (Circle).

Checked each against a takeoff binding for Homelander:

| Candidate | Collision? | Verdict |
|---|---|---|
| **charge / L2 edge** | Homelander is **not** a hold-charge character (energy isn't a manual charge for him), and his kit puts Heat Vision / Supersonic / Barrage / grab on **special+direction, light/heavy, grab**. L2 is otherwise idle for him. | ✅ **CHOSEN** |
| double-tap Up | Collides with **jump / double-jump** (Up is the jump binding) and with mid-jump re-press. | ✗ |
| Up+Special | Collides with the **Up-direction special** (an air/anti-air Heat-Vision angle in the kit). | ✗ |
| double-tap jump | Collides with **double-jump**. | ✗ |
| grab / L1 | Reserved for **command grab / Take A Ride**. | ✗ |

**Decision (logged): takeoff = `charge` (L2) button edge — a toggle.** This matches the
established flyer convention in this engine (Omni-Man / Superman take off on the charge
edge via `toggleOmniManFlight`), so it is discoverable and consistent. **Mid-jump takeoff**:
pressing charge while airborne enters flight too (no collision — charge is idle midair for a
non-charge character). Landing is by hold-Down near the floor / energy-out / knockdown, so
no landing input is needed. This binding will be wired in the Phase-3 integration commit
(when the character exists to drive and render), per §7.

## 8. Test harness
`harness/homelander_flight_path.mjs` drives a scripted path through `flight.js` only (no
engine): takeoff → 8 directions → 2 air dashes → brake → land. Asserts **(a)** no single-frame
position jump exceeds `maxH/maxV + dashSpeed` (no teleports), **(b)** no pose held fewer than
`minPoseFrames` (except on attack/hit interrupt), **(c)** energy monotonic within a state,
**(d)** determinism: identical seed → identical trace. Results in REPORT.md.
