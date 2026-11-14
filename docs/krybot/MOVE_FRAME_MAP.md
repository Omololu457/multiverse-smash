# Krybot move/frame map

Simulation timing comes from krybotData.js and krybotState.js. Sprite timelines only choose visible source frames; rendering never creates hits. Single-pose holds and repeated poses are intentional, not extra source animation.

| Action | Actual supplied frames | Elapsed tick → strip frame |
|---|---|---|
| idle | idle0 → idle1 | cycle/hold at 8 ticks per source frame |
| walk | run0…run7 | cycle/hold at 8 ticks per source frame |
| walk_back | run7…run0 | cycle/hold at 8 ticks per source frame |
| run | run0…run7 | cycle/hold at 8 ticks per source frame |
| jump | jump (one raised-arm pose) | cycle/hold at 8 ticks per source frame |
| fall | tumble0 | cycle/hold at 8 ticks per source frame |
| hurt | recoil | cycle/hold at 8 ticks per source frame |
| guard | guard | cycle/hold at 8 ticks per source frame |
| crouch | guard | cycle/hold at 8 ticks per source frame |
| dash | run0…run7 | cycle/hold at 8 ticks per source frame |
| light | punchWind → punch | 0→0, 4→1 |
| kJ2 | punchWind → punch | 0→0, 5→1 |
| kJ3 | kickWind → kick | 0→0, 9→1 |
| heavy | kickWind → kick | 0→0, 13→1 |
| kLow | kickWind → kick (authored low gameplay box) | 0→0, 7→1 |
| up | ready → jump (raised-arm intercept; no uppercut art) | 0→0, 11→1 |
| air | kickWind → kick (same boot in air) | 0→0, 8→1 |
| down_air | kick (one pose; shared boot, no spike) | 0→0 |
| kAdvance | punchWind → punch | 0→0, 9→1 |
| kChainKick | kickWind → kick | 0→0, 10→1 |
| kAway | kickWind → kick | 0→0, 12→1 |
| kBlaster | ready → aim → lowerArm | 0→0, 13→1, 21→2 |
| kBreach | punchWind → punch | 0→0, 12→1 |
| kLeap | jump → tumble0 → tumble1 → tumble2 → tumble3 → kick | 0→0, 6→1, 11→2, 16→3, 21→4, 26→5 |
| kCover | ready → aim | 0→0, 20→1 |
| ultimate | ready → aim | 0→0, 27→1 |
| grab | punchWind → punch | cycle/hold at 8 ticks per source frame |
| knockdown | fall0 → fall1 → fall2 → fall3 | cycle/hold at 8 ticks per source frame |
| getup | fall2 → guard → idle0 (authored recovery) | cycle/hold at 8 ticks per source frame |
| win | idle0 → idle1 | cycle/hold at 8 ticks per source frame |

Covering unit: common body pivot/scale and supplied run/aim art. Entry ages 1–8; aim ages 9–18; one bolt at 18; exit after 45; removal at 70. Collision is independent of art playback.

Crossfire allies use the same aim frame and owner floor, bounded ±160px from the opening impact. Muzzle: 56px forward, 78px above feet, measured from aim-cell tip (47,21.5) relative to source foot/body anchor (22,57), at 2.2 scale. Bolts launch at confirmation ages 8 and 18.

Explosion effect: fx0/fx1/fx2/fx3/fx4 at ages 30/32/34/36/38, holding the last through age 41. The one damage collider starts at age 36 with the largest supplied cell, lasts at most five ticks, hits once and has radius 36. A separate visual completes all five frames even when the shared pipeline consumes the damage projectile.

Jump pursuit is deliberate shared physics input. Up+Heavy latches jump-held on startup so holding Up through impact cannot automatically pursue. Release and press Jump again. No jump reset or private juggle rule is added.
