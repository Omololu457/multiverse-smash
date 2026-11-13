# S.P.D. Red Ranger: combos

## Scaling rules

- **85% per hit.** Hit *n* of a combo does `raw × 0.85^(n−1)`. The hook is `spdRedComboScale` in `combat.js` `_comboScale`, gated to `spd_red`.
- **The counter resets after 1.5 s.** Once 90 frames pass without a hit (the engine's `comboTimer`), the next hit is unscaled again.
- **Displayed damage = raw × 0.6.** The engine applies `GLOBAL_DAMAGE_SCALE` to every fighter's damage, so the tables show both values.
- **Super hits use a fixed scale.** They use the scale in effect when the Super started.
- **The Judgment seal halves damage.** A GUILTY containment card absorbs 50% of every hit landed on the sealed foe.
- **The dodge buff is ×1.15.** After a blink dodge, the next attack started within 20 frames gets it.

## How these numbers were measured

Every route below was executed with **real keyboard input** in the live game, using hit-confirm timing, by `harness/spd_red_scen_p7.mjs` (`node harness/spd_red_render_check.mjs 7`).

The "measured" columns come straight from the foe's HP bar in that run. The "expected" column is the raw arithmetic. The two differ by under 1% because displayed HP is whole points.

## The five routes

### 1. Jab → Straight → Kick → DELTA CHARGE → blink-cancel

Input: `A`, `A`, `A`, `→→`+Special, then `→→` on hit.

| Hit | Move | Raw | Scale | Scaled |
|---|---|---|---|---|
| 1 | Jab | 40 | 1.00 | 40.0 |
| 2 | Straight | 60 | 0.85 | 51.0 |
| 3 | Kick | 65 | 0.7225 | 47.0 |
| 4 | Delta Charge | 95 | 0.614 | 58.3 |

- **Expected raw:** 196.3.
- **Measured:** raw 195, displayed 117.
- **Delta:** costs 15; the four hits pay back +16.
- **Blink:** the cancel spends one teleport charge and leaves him safe, either behind the knocked-down foe or back out.

### 2. Low kick → Heavy kick → (jump-cancel) Air kick → SKY UPPERCUT

Input:
1. `↓`+`A`.
2. `→`+`B`.
3. Hold `↑` as it connects (launcher jump-cancel).
4. `A` on the way up.
5. `↑`+Special.

| Hit | Move | Raw | Scale | Scaled |
|---|---|---|---|---|
| 1 | Low kick | 45 | 1.00 | 45.0 |
| 2 | Heavy kick | 85 | 0.85 | 72.3 |
| 3 | Air kick | 65 | 0.7225 | 47.0 |
| 4 | Sky Uppercut | 110 | 0.614 | 67.6 |

- **Expected raw:** 231.8.
- **Measured:** raw 230, displayed 138.
- **Delta:** costs 20.
- **Blink:** he can blink out of the uppercut's airborne recovery for one charge.

### 3. PHASE STRIKE → Jab → Straight → DELTAMAX STRIKE

Input: `↓↘→`+Special, `A`, `A`, then `↓↙←`+Special.

| Hit | Move | Raw | Scale | Scaled |
|---|---|---|---|---|
| 1 | Phase Strike (crosses up) | 100 | 1.00 | 100.0 |
| 2 | Jab | 40 | 0.85 | 34.0 |
| 3 | Straight | 60 | 0.7225 | 43.4 |
| 4 | Deltamax beam | 120 | 0.614 | 73.7 |

- **Expected raw:** 251.1.
- **Measured:** raw 250, displayed 150.
- **Delta:** costs 18 + 25 = 43.
- **Why it links:**
  - Phase Strike leaves him +8 on hit, so the Jab links.
  - Deltamax's 18-frame startup fits inside the Straight's 22 frames of hitstun.

### 4. DELTA BLASTER → blink DODGE (+15%) → buffed Heavy kick → SKY UPPERCUT

Input:
1. `↓`+Special at range.
2. `→→` through the foe's answer, timed so the invulnerable travel covers its active frames.
3. `→`+`B` within 20 frames.
4. `↑`+Special.

| Hit | Move | Raw | Scale | Buff | Scaled |
|---|---|---|---|---|---|
| 1 | Delta Blaster bolt | 50 | 1.00 | | 50.0 |
| 2 | Heavy kick | 85 | 0.85 | ×1.15 | 83.1 |
| 3 | Sky Uppercut | 110 | 0.7225 | | 79.5 |

- **Expected raw:** 212.6.
- **Measured:** raw 210, displayed 126.
- **The dodge pays +5 Delta,** and the white flash marks the streak.
- **Delta:** costs 10 + 20 = 30.
- **This is a whiff-punish sequence, not a true combo:** the foe acts between hits 1 and 2. The combo counter carries across because the gap is under 1.5 s.

### 5. Chip under 30% → JUDGMENT (GUILTY) → containment combo → SUPER with the 220 beam

Input:
1. Chip the foe below 30% HP and fill the Judgment meter (20 hits).
2. `A`+`B`+Special.
3. Combo the sealed foe: `A`, `A`, `↓↙←`+Special.
4. After the far-side release, `↓↘→↓↘→`+Special with 100 Delta.

| Hit | Move | Raw | Scale | Seal | Scaled |
|---|---|---|---|---|---|
| 1 | Jab | 40 | 1.00 | ×0.5 | 20.0 |
| 2 | Straight | 60 | 0.85 | ×0.5 | 25.5 |
| 3 | Deltamax beam | 120 | 0.7225 | ×0.5 | 43.4 |
| 4-6 | Super blink strikes ×3 | 55 each | 1.00 | | 165.0 |
| 7 | Super beam (GUILTY) | 220 | 1.00 | | 220.0 |

- **Expected raw:** 473.9.
- **Measured:** raw 473.3, displayed 284.
- **The 220 beam needs a GUILTY verdict earlier in the same round;** otherwise it is 180.
- **The Super needs the full 100 Delta.** It spends all of it, then locks Delta for 3 s, then refills both teleport charges.
- **Why the containment combo ends in the beam:** the card pins the foe in place, so Red's own hits push him back off it. The beam's 70% reach ignores that.
- **Measurement note:** the harness restores the foe's HP right after the verdict, so the whole route reads in one go. At the real <30% HP, the containment combo or the Super's first strike KOs the foe.
