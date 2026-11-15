# Dash Parr — Defense (Phase 6)

Measured by `harness/dash_parr.test.mjs`.

| Tool | Input | Spec | Measured |
|---|---|---|---|
| Sidestep | ←← + Light | i-frames f2–10, 4 s cooldown | invulnerable exactly f2–10; cooldown 240 f from start (226 left when probed at f14) |
| Can't Catch Me | passive | first hit taken at Sprint+ deals −30 % | same hit: 22 at Jog → 15 at Sprint (×0.7, rounded); Momentum → 0 |
| Panic Run | Block + Heavy while in hitstun | 3+ hits taken, 40 energy, once per round | fires from hitstun, 100 → 60 energy, hitstun cleared, 24 f invuln, flag set; refused the 2nd time and below 3 hits |

Flash Time (← + Special) is the opposite trade: while it's on the opponent runs at ~⅓ speed, but Dash **cannot block**.

Momentum also drops to 0 when Dash blocks or takes any hit, which is the core risk in his kit.
