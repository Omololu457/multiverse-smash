# MSV1-DINO — combos (measured)

Measured on the real game loop by `node harness/dino.test.mjs combos` against S.P.D. Red (1200 HP) at close range, each step
pressed on hit-confirm like a player. Damage includes the engine's combo scaling (85 % per hit) and his defense.

| # | Ranger | input | hits | damage |
|---|---|---|---|---|
| 1 | Conner | J · J · K · → + L (Penalty Strike) | 4 | **179** |
| 2 | Conner | J · J · ↓↘→ + K (Tyranno Slam, OTG bounce) | 3 | **148** |
| 3 | Conner, Super Speed | ↓↓ + L first, then #1 (recoveries −25 %, Penalty Strike crosses up) | 4 | 179 (same damage, faster + side switch) |
| 4 | Ethan | J · J · J · J · → + K (Shield Ram → wall bounce) | 5 | **192** (High Score +2 %/hit inside) |
| 5 | Ethan, Super Dino Mode | #4 at +20 % | 5 | **229** |
| 6 | Kira | J · J · J · J · ↓↘→ + L (Ptera Scream, 30-f stun) | 5 | **144** |
| 7 | Trent | J · J · J · J (Drago sword string) | 4 | **138** |
| 8 | Trent, out of Camouflage | #7, the first hit +25 % | 4 | **148** |
| 9 | TAG | Conner J · K → hold P + K → Ethan → + K (swap-in strike 30, Shield Ram +10 %) | 3 | **172** |
| 10 | TEAM | J · K · U (Z-Rex Blaster, full meter) | 3 + beam | **369** |

Routes that need setup (not in the measured table): Kira's ENCORE (a second scream within 3 s → 50-frame stun → a full string);
Tricera Skin + Shield Quake OTG on a knockdown; Trent's Drago Clone echoing #7 12 frames late (each echoed hit 50 %, cannot KO).
