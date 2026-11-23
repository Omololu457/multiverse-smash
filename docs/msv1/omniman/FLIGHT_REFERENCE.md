# MSV1-OMNIMAN — flight reference (copied from flight.js at the start commit)

All numbers are px per sim frame (60 frames / s). Source: `flight.js` `FLIGHT_PROFILES` and its integrator `stepFlight` /
`axisStep` (per axis: held input → `v + accel`, reversing input → `v × reverseBrake` first, no input → `v × drag`,
then a soft cap at `maxH` / `maxV` and an ellipse clamp on the diagonal).

| | Homelander | Superman | Dseyl |
|---|---|---|---|
| wiring | `traits.flightProfile: "homelander"` | `traits.flightProfile: "superman"` | `traits.flightProfile: "dseyl"` |
| top speed (horizontal `maxH`) | **22.0** | **22.0** | **44.0** |
| top speed (vertical `maxV`) | 18.0 | 18.0 | 36.0 |
| acceleration (`accel`) | 2.2 → top in 10 f | 2.2 → 10 f | **4.4** → 10 f |
| drag with no input (`drag`, per frame) | 0.84 | 0.84 | 0.84 |
| coast from top speed (Σ v·dragᵏ) | 22 × 0.84 / 0.16 = **115.5 px**, ≈ 32 f to stop | 115.5 px | 231 px |
| turning (`reverseBrake`) | ×0.64 per frame + accel against: 22 → 11.9 → 5.4 → 1.3 → −1.4, **reversed in 4 f** | same, 4 f | 44 → 23.8 → 10.8 → 2.5 → −2.8, 4 f |
| steering | none — each axis is independent, 8-way input, instant diagonal | same | same |
| air dash | 34 px/f × 14 f, 2 per flight, 30 energy | 34 × 14 f, **3** per flight | 68 × 12 f, 2 per flight |
| duration (`energyMax` / drain 1 per frame) | 240 = **4.0 s**, refills 2/f on the ground | 300 = **5.0 s** | 210 = **3.5 s** |
| grounded lock after a hard hit | 90 f | 72 f | 90 f |
| takeoff / come down | **Charge TAP** (P / L2) — `game.js handleChargeRelease → flightToggleInput` | Charge TAP | Charge TAP, measured on the sim clock (`dseylFlight.js`) |
| steer | ← → ↑ ↓ (8-way) | same | same |
| land | hold ↓ near the floor, or Charge tap (descend), or energy out | same | same |
| block in flight | yes (the generic guard) | yes | yes |

Other fliers, for completeness (not the "fastest roster flier"):
* old **Omni-Man** `omniman` + the canFly group (Superman DCUC, Starfire variants, Onoki, Green Lantern, …):
  `physics.flightSpeed = 13`, snap velocity, ×0.65 coast — slowest.
* Ben 10 Omnitrix forms set `_alienFlightProfile` while transformed: Jetray 36, **Jetray Mach overdrive 90** (a timed
  power-up state of one alien form), Megawhatt 6.5, Ghostfreak 5, Alien X 4, Highbreed 6, Big Chill 6.

**Fastest existing flier = Dseyl, 44 px/f.** Jetray Mach (90) is excluded deliberately: it is a temporary overdrive of
an Omnitrix form, not a fighter's flight, and 1.3 × 90 = 117 px/f would cross a 1280 px screen in 11 frames.

## Omni-Man (`omniman_viltrum`) — FLIGHT_PROFILES.omniman_viltrum

Same input as every other flier: **Charge TAP takes off / comes down** (measured on the sim clock, like Dseyl, so replay and
LAN are deterministic). One profile in flight.js; its `momentum` block switches `stepFlight` to a heading + speed
integrator for this profile only (every other profile has no `momentum` key and runs the old per-axis code, byte-identical).

| | value | derivation |
|---|---|---|
| top speed | **57.2** px/f, any direction | 1.3 × Dseyl 44 |
| acceleration | **5.5** px/f² → top in ≈ 10.4 f | 1.25 × Dseyl 4.4 |
| coast drag | **0.9292** per frame | coast = v·d/(1−d). Homelander from 22 coasts 115.5 px; Omni-Man from the same 22 coasts **288.8 px = 2.5×** (d/(1−d) = 2.5 × 5.25). From his own top speed he slides ≈ 750 px. |
| steering at top speed | **2.5° per frame = ±25° per 10 frames** | turn rate eases from 15°/f at a standstill to 2.5°/f at top speed (linear in speed fraction) |
| reversing (input > 120° from his heading, no brake) | decelerates 1.68 px/f² (top speed / 34), heading flips only below 1 px/f | from top speed the velocity points the other way after **≈ 35 f ≈ 0.58 s** (test-asserted 0.5–0.7 s) |
| BRAKE = Guard while flying | speed × 0.851 per frame | 0.851¹⁰ = 0.20 → **80 % gone in 10 frames**; R13 cape-flipped-up frames |
| duration | **unlimited** (drain 0) | Viltrumite |
| block while flying | only at ≤ **40 %** of top speed (≤ 22.9 px/f) | above it Guard only brakes |
| wall crash | hitting a stage wall / the camera edge at ≥ **70 %** (40.0 px/f) → 28-frame crumple (R9 knockdown frames), 25 self-damage, small camera shake | below 70 % he just stops |
| sonic boom | crossing **90 %** (51.5 px/f) — once per acceleration (re-arms below 60 %) → R13 white burst, 20-damage push box | |
| hard landing | touching the floor at ≥ 70 % with a downward component → crouched landing frames + burst, 50-damage shockwave, 14 f recovery | |
| air dash | none (his acceleration is the dash) | |
| grounded lock after a hard hit | 90 f (Homelander's) | |
