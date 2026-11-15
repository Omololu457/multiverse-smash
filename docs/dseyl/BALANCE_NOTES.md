# Dseyl — balance notes

**Dseyl = Syndrome + rocket-boot flight + a short Flash Time.** He pays for the two extra powers with less health and one shared resource bar. Everything else is Syndrome's, by reference, so the two can't drift apart.

## Same as Syndrome (by reference: `syndromeData.js`)

- **Frame data:** every normal, command, special and the ultimate (startup, active and recovery frames, hitstun, blockstun, boxes).
- **Machines:** every machine budget and operation schedule (Hunter Duet 6×25, Spin Cycle 60+50, Velocipod 150, Turrets, Hammerfall 170, Rising Interception 130, Sweep 120, Zero-Point 20). The slot limits are the same: one mobile squad, one Spinner, one turret, one Omnidroid action.
- **Ultimate:** Operation Kronos, 420 raw.
- **Power:** max 100, the same costs (Duet 25, Spin 18, Velocipod 25, Turret 30, Hammerfall 30, Rise 25, Sweep 25, Zero 20, Ultimate 100) and the same regen / Charge.
- **Movement:** speed 92, jump 25, two jumps, dash 19 / 10 / 26.
- **Damage boost:** outgoing boost ×1.11 (`rosterParity.js`, Syndrome's value).

## What he adds

| Power | Numbers | Source |
|---|---|---|
| **Flight** (Charge tap) | accel 0.50 · cruise H 6.0 / V 5.0 px/f · drag 0.86 · 2 air dashes (speed 14 / 12 f, 30 flight-energy each) · **3.5 s** budget (210 frames, refills on the ground at 2/f) · hard hit in the air → grounded **1.5 s** (90 f) | `flight.js` `FLIGHT_PROFILES.dseyl` |
| **Flash Time** (Guard + Special) | **40 Power** · opponent at **50 %** speed · **180 frames** (3 s) · **600-frame (10 s) cooldown** after it ends · Dseyl is NOT sped up · not during his ultimate, not while the foe is already slowed | `dseylData.js` `DSEYL_FLASH` |

### How the flight compares

| | Dseyl | Homelander | Superman |
|---|---|---|---|
| Cruise H / V | 6.0 / 5.0 | 22 / 18 | 22 / 18 |
| Acceleration | 0.5 | 2.2 | 2.2 |
| Air dashes | 2 | 2 | 3 |
| Flight time | 3.5 s | 4 s | 5 s |
| Grounded after a hard hit | 1.5 s | 1.5 s | 1.2 s |

He is the slowest, shortest flyer in the game: rocket boots, not a Superman.

### How Flash Time compares

| | Dseyl | the Flash | Dash Parr |
|---|---|---|---|
| Opponent speed | 50 % | ~34 % | ~34 % |
| Length | fixed 3 s | drains a near-full bar | drains a near-full bar |
| Self speed-up | none | yes (zips, overshoot) | moves normally |
| Cooldown | 10 s | none | none |

## What he pays

| | Syndrome | Dseyl |
|---|---|---|
| Max health | 1180 | **1109** (−6 %, `DSEYL_HP_FACTOR` 0.94) |
| Resource | Power 100, drones only | Power 100, **shared by the drones AND Flash Time** |

- **Shared bar.** Flash Time (40) plus a Hunter Duet (25) plus a Turret (30) is 95 of his 100 Power. He can't open with Flash Time and still run a full drone setup. Using Flash Time also delays his ultimate, since the ultimate needs a full 100.
- **Flight has its own budget,** separate from Power, like Homelander's. Its limits are the 3.5 s timer and the 1.5 s grounding after a hard hit. Specials still need the ground in flight: only Hunter Duet and the Velocipod (Syndrome's air-legal commands) and his air normals work while flying.
