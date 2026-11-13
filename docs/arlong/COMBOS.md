# Arlong: Combos

Every route below is driven with **real inputs** in Training against the Zoro dummy by
`harness/arlong_scen_p6.mjs` (run with `node harness/arlong_render_check.mjs 6`). Each hit is checked to land while
the dummy is still in hitstun / airborne / knocked down (a true combo), and each hit's damage is checked against the
scaling formula. The numbers are what that run measured.

## Scaling

- **85% per hit**: hit *k* (0-based) deals `raw × 0.85^k`. The counter is the engine's `comboCounter`. It resets when
  a hit is blocked or after 1.5 s without a hit.
- The engine's global damage scale (×0.6) is applied to every hit, so the HP column is `raw × 0.85^k × 0.6`.
- **ARLONG PARK locks its scale when the Super starts.** All five Super strikes use the scale of the hit the
  Super was cancelled into.
- **In his own water** every Arlong hit gets +15% on top of this (`arlongDamageMods`). The routes below were measured
  dry.

## Inputs

L = Light, H = Heavy, A = Special. Motions are written facing right: ↓↘→ = quarter-circle forward.
Normals gatling on contact (hit or block). Specials and the Super cancel out of any connected normal.

## Routes (measured)

| Route | Inputs | Hits (HP removed) | Total HP | Raw before scaling |
|---|---|---|---|---|
| Saw string | L, L, H, ↓+H | Jab 27 · Straight 35 · Kiribachi swing 39 · Heavy saw arc 40 (launch) | **141** | 45+70+90+110 = 315 |
| Low tide | ↓+L, →+L, ↓↓+A | Low saw 33 · Straight 35 · Tidal Sweep 34 (knockdown + zone) | **102** | 55+70+80 = 205 |
| Torpedo refill | L, →+L, →→+A | Jab 27 · Straight 35 · Shark On Darts 58 (ends behind the foe, refills every tooth, zone) | **120** | 45+70+135 = 250 |
| Bite route | L, →+H (close), ↓↘→+A | Jab 27 · BITE 51 (+bleed 4×6 raw) · Shark On Tooth 52 (zone under the foe) | **130** (+bleed) | 45+100+120 = 265 |
| Seiken ender | L, →+L, ↓↙←+A | Jab 27 · Straight 35 · Gosenmaigawara Seiken 49 (shockwave, zone in front) | **111** | 45+70+115 = 230 |
| Park | L, →+L, ↓↘→↓↘→+A | Jab 27 · Straight 35 · 4 torpedoes 26 each · Kiribachi finisher 52 | **218** | 45+70+360 = 475 |

Cost: Tooth 15 · Darts 20 · Seiken 25 · Tidal 20 · Super 100 Tide. The Bite route spends **two teeth**
(BITE + Shark On Tooth). The Torpedo refill route gives every tooth back, so the two chain well together:
Bite route, then Torpedo refill on the next opening.

## Notes

- A press made during the impact freeze (hitstop) is buffered on the simulation clock, so a cancel feels the same
  however long the freeze is.
- With the Kiribachi planted, the blade normals in these routes swap to Fishman Karate (blunt, 2 frames faster,
  ×0.85 damage) and the same inputs still chain. Saw string becomes Jab, Straight, karate swing, karate arc.
- ARLONG PARK's flood holds a foe who isn't guarding until the first torpedo arrives. That is why it combos from a
  two-hit confirm. A guarding foe blocks the strikes.
- No infinite: the moves are only ever chained in rising order, every route ends in a special or the Super, and
  specials can't be cancelled.
