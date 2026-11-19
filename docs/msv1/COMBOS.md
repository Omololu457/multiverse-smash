# MSV1 — Combos (Shane `ns_red` / Dustin `ns_yellow`)

All routes below are performed with **real key input on the real game loop** by `harness/msv1_combos.mjs`. Each
was run three times; the output was identical every time (deterministic).

* **Damage** = what the defender's HP bar actually lost. This includes the engine's global scale ×0.60, roster
  parity ×1.6 (S.P.D. Red's tier) and the ninjas' 85% combo scaling.
* **Hits** = separate HP drops.
* **Engine combo** = the attacker's combo counter.
* Defender: the other ninja (Dustin 1296 HP / Shane 1200 HP), standing, training dummy.
* Keys: a / d move, w up, s down, j Light, k Heavy, l Special, i Up-Attack, u Ultimate, p Charge.

## Shane (Red Wind / Air)

| Route | Input | Hits | Damage | Engine combo |
|---|---|---|---|---|
| Kick string | Light, Heavy, Heavy, Heavy | 4 | **109** | 4 |
| Launch | Light, Heavy, Heavy, Up-Attack (uppercut launcher) | 4 | **114** | 4 |
| Sword line | Light, → + Light | 2 | **86** | 2 |
| Streak Strike → Tornado | →→ (Light during the streak), then ↓↘→ + Special in the recovery (he has crossed up, so on screen it is ↓↙←) | 4 | **69** | 4 |
| Run-over beam | →→ (Light during), then ↓↘→ + Light | 2 | **83** | 2 |
| String → STORM ASCENSION | Light, Heavy, Heavy, ↓↘→↓↘→ + Special (1 bar) | 10 | **258** | 10 |
| Mirror → HAWK MIRAGE | ↓↓ + Charge … Ultimate (2 bars, Mirror only) | 1 bar drop* | **364** | 4 |

\* Hawk Mirage's four dives land on the same frame, so the HP bar drops once (380 raw at a fixed scale).

## Dustin (Yellow Wind / Earth)

| Route | Input | Hits | Damage | Engine combo |
|---|---|---|---|---|
| Kick string | Light, Heavy, Heavy, Heavy | 4 | **122** | 4 |
| Rock route | Light, → + Heavy (Rock Slash) | 2 | **97** | 2 |
| Full REV → Tremor → Erupt | (3 REV pips) ↓↓ + hold Special, →→ under them, release | 1 | **112** (Erupt 86 × REV 1.3) | 1 |
| Trap trip → Ground Pound OTG | Earth Kunai trips them, hop forward, ↓ + Heavy at once | 2 | **108** | 2 |
| String → EARTHQUAKE | Light, Heavy, Heavy, ↓↘→↓↘→ + Special (1 bar) | 8 | **276** | 8 |
| Double → FAULT LINE | ↓↓ + Charge … Ultimate (2 bars, Earth Double only) | 2 | **372** | 5 |

## Against S.P.D. Red's published routes (kits.js)

| | Meterless BnB | Special route | 1-bar | 2-bar / top |
|---|---|---|---|---|
| S.P.D. Red | 117 (Charge out) · 138 (Sky route) | 150 (Phase beam) | — | 220 (Sentence beam) |
| Shane | 109 · 114 | 69 – 83 | 258 | 364 |
| Dustin | 122 · 97 | 108 – 112 | 276 | 372 |

The meterless strings sit just under S.P.D. Red's. Both ninjas are mobility-rich and get +4 Ninja Power per hit.
Their super routes outdamage his, because they cost real resources: 1 bar for the super; 2 bars **plus** an active
Mirror (50 NP) for the ultimate. See BALANCE_NOTES.md.

## Notes found while measuring (fixed in this phase)
* **Rock Slash** was missing from Dustin's gatling table, so Light → →H dropped. It is now listed on light /
  kString1 / kString2.
* **↑ + Heavy** reaches the engine as the Up-Attack button on the default layout. Both launchers (flip kick /
  uppercut) now cancel from the same string slots. Holding ↑ through a hit is still the engine's jump-cancel.
* The **Tremor Streak** used to overshoot the foe by ~180 px, so it could never lead into the Erupt. Underground,
  it now surfaces right under the foe once it has passed their centre (a cross-up from below).
* **Ground Pound** from a full jump lands after the trip's knockdown has ended (wake-up invulnerability). The route
  is the short hop.
