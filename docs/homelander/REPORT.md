# Homelander — Build Report

Branch `feat/homelander-flight` (off `main`, 10 commits, all pushed to origin; `main` never touched).
Universe: existing **`dc`** (no new universe). Homelander is the **prototype for a future Superman** —
flight is a reusable module, not Homelander-only code.

## Flight profile (as built) — and why
All numbers live in `FLIGHT_PROFILES.homelander` (`flight.js`), data not code, so a future Superman
reuses the system by changing values only (see `SUPERMAN_NOTES.md`).

| Field | Value | Rationale |
|---|---|---|
| `accel` | 0.55 px/f² | reaches `maxH` in ~12 frames (the brief's "full speed in ~12f") with no drag while a direction is held |
| `maxH` / `maxV` | 6.5 / 5.5 | strong-but-not-oppressive cruise; vertical a touch slower so climbs read deliberate |
| `drag` | 0.86 | applied only with NO input → a floaty coast/drift (the "feel good" glide) |
| `reverseBrake` | 0.72 | a turnaround crosses zero in ~5–8 frames (the brief's "stop in ~8") without killing the drift |
| `overspeedDrag` | 0.90 | eases velocity down when over max instead of snapping, so air-dash momentum **carries** out |
| `ceilEaseZone` | 48 px | upward velocity eases into the ceiling (no hard stop) |
| `dashSpeed`/`dashFrames`/`maxAirDash`/`dashCost` | 11 / 14 / 2 / 30 | 8-way air dash, ends with momentum carried; 2 per flight; costs a chunk of energy |
| `energyMax`/`drain`/`groundRefill` | 240 / 1 / 2 | ~4 s of flight per takeoff; full ground refill in ~2 s |
| `groundedLock` | 90 | a hard hit in flight knocks him down → 1.5 s can't take off |
| `minPoseFrames` | 4 | no flight pose switches before 4 frames (anti-choppiness), except attack/hit interrupt |

Diagonals are ellipse-normalized (no faster diagonals). All of the above is **simulation state** on the
fighter (in GAME_STATE → synced over LAN + replayed); render-only polish (bob/tilt/speed-lines/cape-wind)
is produced separately and never read back by the sim. No `Math.random`/`gameRng` — `hashRandom(seed,
frame, idx)` for any randomness.

## Inputs chosen (collision-checked)
Engine action set: left/right/up/down, jump, light, heavy, upAttack, special, ultimate, dash (double-tap
L/R), grab (L1), charge (L2), block (Circle).

| Move | Input | Collision note |
|---|---|---|
| **Takeoff / land** | **charge (L2) edge** — toggle; mid-jump allowed | matches the engine's flyer convention (Omni-Man/Superman); L2 otherwise idle for a non-charge char |
| Heat Vision | Special (neutral); **Up**+Special = anti-air; AIR = down-strafe | — |
| Supersonic | **Fwd**+Special | — |
| Sonic Clap | **Down**+Special | — |
| Super-Speed Barrage | **Back**+Special | — |
| Ultimate FLIGHT 37 | **Ultimate** (U) | — |

## Move list (frame data)
Flight is velocity-driven (no fixed frames). Specials (from `characters.js` + `abilities.js`):

| Move | Input | Dmg | Startup/Active/Recovery | Notes |
|---|---|---|---|---|
| Light | J | 46 | 5/3/11 | ground jab string |
| Heavy | K | 100 | 12/5/24 | cape-wrapped haymaker |
| **Heat Vision** | Special | ~15/tick | 8f eyes-bright startup | sustained + up/down sweep (±1.5°/f); laser-heat 72f≈1.2s → overheat lockout 90f; block chips |
| **Supersonic** | Fwd+Special | 110 | 6/6/22 | sonic-boom dash (vx±22, Mach-Ram dive in flight), 8f i-frames = projectile pass-through, unsafe on block |
| **Sonic Clap** | Down+Special | 40 + push | instant | shoves foe away + destroys weak opponent projectiles (≤80 dmg) in 180px |
| **Barrage** | Back+Special | 95 | 6/10/22 | advancing flurry → launcher |
| **FLIGHT 37** | Ultimate | 320 (≈192 scaled) | startup 24 (invuln) / lunge 16 / slam 26 | dark-silhouette grab → launch + Heat-Vision slam → knockdown; whiff = long recovery |

Stats: HP 1050, speed 80 (walk ~5), dashSpeed 14, jumpPower 24, weight-via-HP/defense 92.
Passive **Supe Durability**: chip damage (while blocking) reduced 40%.

## Test results
- **Flight module (standalone), `harness/homelander_flight_path.mjs`: 1031 / 0** — takeoff → 8 directions →
  2 air dashes → brake → land. No position jump > maxSpeed+dashSpeed; no pose held < min frames; energy
  monotonic within a state; deterministic (same seed → identical trace).
- **Flight engine integration, `harness/homelander_flight_engine.mjs`: 1047 / 0** — drives the REAL
  `physics.js`; a non-flyer is provably untouched (no state leak, walks normally).
- **In-game render check (Playwright), `harness/homelander_render_check.mjs`: 25 / 0** — boots the real
  game, picks Homelander vs Batman: take off → climb → cruise (renders the flight sprite) → land → Heat
  Vision (heat 72→52, hits, recovers) → Supersonic → Sonic Clap → Barrage → **FLIGHT 37** (grab connects,
  slam 192 dmg, dark-silhouette startup renders). **0 JS exceptions, 0 homelander-asset 404s.**
- **Regression at every commit:** determinism **14/0**, combo-standard **225/9** (pre-existing), roster-
  integrity green. Every change is gated on `rosterKey`/`flightProfile` → every other character byte-
  identical; `combat.js` touched by exactly one gated Supe-Durability line.

## Sprite ledger summary
Attached sheet copied byte-identical to `assets/source/homelander_original.png` (xxultra2006xx). Yellow
stripped, black dividers removed, **79 frames / 11 rows** cut by connected components; per-frame **eye
anchors** (glow-detected on 65/68 fireable frames) in `homelander_inventory.json`. 18 per-action strips
sliced foot-anchored (84×77, consistent scale) → `homelander_*_uniform.png` + portrait. Full map in
`LEDGER.md`. Render check confirms sprites load and resolve (flight poses, silhouette, normals).

## Creative decisions (logged)
- **`traits.flightProfile` not `canFly`** — the new richer flight is a *separate* system from the engine's
  existing simple Omni-Man/Superman flight, which is left completely byte-identical. Two flyers, zero interference.
- Homelander **hovers like Omni-Man** (idle/walk/run/dash reuse the hover pose) — he's a flyer, not a walker.
- Heat Vision is a **hitscan beam** with a sim-state heat gauge (not a projectile) so sustain/sweep/overheat
  feel right; the eye origin is bbox-relative (per-frame anchor data exists for a later precision pass).
- FLIGHT 37 is a **scripted state machine** (no freeze-cinematic file) — launch + heat-slam instead of a
  synchronized two-actor carry, so it uses normal physics and stays robust.
- Playwright render check is timing-sensitive (real-time waits) — occasional flaky miss; re-run is clean.
  The deterministic suites + unit checks + flight harnesses are the authoritative proof.

## What to play-test first
1. **Flight feel** — takeoff (L2), 8-way cruise, the drift/coast, turnaround snap, the 2 air dashes carrying
   momentum, and easing into the ceiling. This is the core and the reusable module.
2. **Heat Vision** — tap vs hold, the up/down sweep, and the overheat lockout (dim eyes) — make sure the
   heat economy feels fair as a zoning limiter.
3. **FLIGHT 37** — the grab window / whiff recovery, and the dark-silhouette → slam payoff.
4. **HUD gauges** — flight-energy (cyan) + laser-heat (amber→red "OVERHEAT") read clearly under his health.

## Remaining (not yet built) — see `PROGRESS.md` "RESUME"
Take A Ride (command grab), X-Ray (mark), Super Hearing (passive wiring), Flex (parry), brutalities,
intro/win/lose choreography, sound mapping, dedicated air normals; Phase 4 CPU AI + training toggles.
The engine-API cheatsheet and exact next steps are in `PROGRESS.md` and the project memory.
