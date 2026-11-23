# Omni-Man (Viltrumite) — balance notes

**Identity:** the fastest, hardest-to-control flier. His top speed is the best in the game (57.2 px/f = 1.3 × Dseyl;
Invincible is 0.9 × him), but momentum is the price: a 2.5 × Homelander coast, 0.6 s to reverse, ±25° / 10 f steering at top
speed, and no block above 40 % speed. Guard is a brake first. The reward is that speed is damage (+60 % at top speed).

**Health / weight:** HP 1050 (= Homelander), meter 200, heavy (received knockback × 0.85).

| Risk lever | Value | Why |
|---|---|---|
| No guard above 40 % | — | committing to speed means eating the counter-hit |
| Block penalty at speed | up to +8 f recovery | fast normals on block are punishable |
| Wall crash ≥ 70 % | 28 f crumple + 25 self-damage | flying into a wall is a real mistake |
| Hard landing ≥ 70 % | 14 f recovery (+50 shockwave) | a dive into the floor is a commitment |
| Blitz whiff | skid + 24 f; a wall at speed = crash | the long rush is punishable |
| Meteor whiff | 30 f | |
| Unimpressed | 12 s cooldown, whiff ≈ 40 f | a counter you can't spam |
| THINK! / Escape Velocity whiff | 30 f / overshoot + 40 f | grabs can be dodged; Gojo's Infinity makes them whiff |

**Damage budget (measured vs Homelander):** Jab 38, Haymaker 96, Blitz 90, THINK! 300 (fixed, never combo-scaled),
Escape Velocity 420 (fixed). Best meterless routes ≈ 180–234; with 1 bar ≈ 406; with the ultimate ≈ 516.
Escape Velocity's 420 is the brief's number; its counterweight is the 0.25 s grab, which whiffs on any dodge / Infinity /
intangibility and leaves him open for 40 frames.

**Determinism:** all state in f._omv / FLIGHT_PROFILES (sim clock, no RNG); sky / stars / planet / re-entry / crater / speed
lines are render-only (stars seeded from the match seed via hashRandom).
