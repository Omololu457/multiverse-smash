# Sanji — Combos

Every route below is **measured**, not estimated. `harness/sanji_render_scenarios_p6.mjs` drives the live game
with real keyboard input (P1 Sanji facing right vs an idle Zoro dummy), records each hit, and checks:

* **true combo**: the foe was still in hitstun, airborne or knocked down when each later hit landed;
* **85% per-hit scaling**: hit *k* (0-based) deals `raw × 0.85^k × 0.6` (`0.6` = the engine's global damage scale).
  The combo counter is the shared one and resets after 1.5 s (90 frames) without a hit.

Nothing in Sanji's kit branches on game mode, so the routes are the same in Training.

**Notation**: L = Light (J), H = Heavy (K), S = Special (L key), U = Ultimate. Directions are for Sanji facing
right (→ = toward the foe). `↓↘→` is a quarter-circle forward, `→·→` is forward, neutral, forward, and
`↓·↓` is down, neutral, down.

**Course column**: the Course pip count after the hit. Only the six bound kicks move the track; every other
hit keeps it alive. Gigot completing the six turns the pips into the free-super window, shown as **FREE**.

## 1 · Safe route: Collier → Épaule → Côtelette → Mouton Shot

Three Course steps, and it ends in a hard knockdown. **127 damage.**

| # | Input | Move | Raw | Dealt | Course |
|---|-------|------|----:|------:|:------:|
| 1 | L | Collier | 45 | 27 | 1 |
| 2 | →+L | Épaule | 60 | 30 | 2 |
| 3 | H | Côtelette | 70 | 30 | 3 |
| 4 | ↓↘→+S | Mouton Shot (15 Heat) | 110 | 40 | 3 |

## 2 · Low launch: Gigot → Selle → Poitrine → air kick → Concasse

Starts low and ends with a ground bounce. **157 damage.** These hits are out of order for the Course, which
starts at 0, so no pips change.

| # | Input | Move | Raw | Dealt | Course |
|---|-------|------|----:|------:|:------:|
| 1 | ↘+L | Gigot (low) | 50 | 30 | 0 |
| 2 | →+H | Selle | 65 | 33 | 0 |
| 3 | ←+H | Poitrine (launch) | 80 | 34 | 0 |
| – | ↑ (on hit) | launcher jump-cancel: a low jump that rises with the foe | – | – | – |
| 4 | air L | Air kick | 65 | 23 | 0 |
| 5 | air ↓·↓+S | Concasse (20 Heat) | 120 | 37 | 0 |

## 3 · THE FULL COURSE → PARTY TABLE KICK COURSE (showcase)

This route starts at **0 Heat**: completing the Course makes the super free. **271 damage.**

| # | Input | Move | Raw | Dealt | Course |
|---|-------|------|----:|------:|:------:|
| 1 | L | 1. Collier | 45 | 27 | 1 |
| 2 | →+L | 2. Épaule | 60 | 30 | 2 |
| 3 | H | 3. Côtelette | 70 | 30 | 3 |
| 4 | →+H | 4. Selle | 65 | 23 | 4 |
| 5 | ←+H | 5. Poitrine | 80 | 25 | 5 |
| 6 | ↘+L | 6. Gigot | 50 | 13 | FREE (5 s) |
| 7–12 | ↓↘→+S | PARTY TABLE KICK COURSE, cuts 1–6 | 55 each | 16 each | – |
| 13 | – | heel-drop finisher | 90 (130 lit) | 27 | – |

**Exact input sequence** (each press cancels the previous kick on contact, so press as soon as the previous
kick connects; the 8-frame input buffer runs on the simulation clock, so a press during hit-freeze still counts):

```
J · (hold D) J · K · (hold D) K · (hold A) K · (hold S+D) J · S, S+D, D (release) L
```

* Step 6 needs **down-forward** (↘) held with J; plain ↓+J is the crouch kick, which does not advance the Course.
* After Gigot, all six pips stay lit for 300 frames. In that window `↓↘→+S` or the Ultimate button fires the
  super for free. With 100 Heat it also works outside the window as `↓↘→↓↘→+S` or Ultimate.
* The whole super uses one combo scale, fixed when it starts at `max(0.5, 0.85^hits)`. After six kicks that
  is 0.5, so each cut deals 16 and the finisher deals 27.

## 4 · Diable route: ignite → Anti-Manner Kick Course → Premier Hachis → Mouton Shot

The leg is lit, so every kick is ×1.25 and burns. Start at 95 Heat (the 100-Heat Overheat bonus would be
×1.40). **138 damage from the kicks**, then burn ticks of 3 after the last kick.

| # | Input | Move | Raw (lit) | Dealt | Course |
|---|-------|------|----:|------:|:------:|
| – | S+H | Diable Jambe ignite (40 frames, ≥ 50 Heat) | – | – | – |
| 1 | →·→+S | Anti-Manner Kick Course (overhead, crumple) | 125 | 75 | 0 |
| 2–9 | ↓↙←+S | Premier Hachis, 8 low kicks | 19 each | 9, 8, 7, 5, 5, 4, 3, 3 | 0 |
| 10 | ↓↘→+S | Mouton Shot | 138 | 19 | 0 |

Every lit kick refreshes the burn (2 s, 3 damage every 20 frames, it never stacks). The ticks therefore land
once the kicks stop; the harness measured them after the route.

## 5 · Sky route: Sky Walk → Sky Walk → Concasse

Air-mobility pressure from 330 px away (about a quarter of the screen). **72 damage**, a ground bounce, and
a burning patch if the leg is lit.

| # | Input | Move | Raw | Dealt | Course |
|---|-------|------|----:|------:|:------:|
| – | ↗ | forward jump | – | – | – |
| – | air ↓↘→+H | Sky Walk 1 (12 Heat): kicks off the air, steps forward | – | – | – |
| – | air ↓↘→+H | Sky Walk 2 (12 Heat), the maximum per airborne sequence | – | – | – |
| 1 | air ↓·↓+S | Concasse (20 Heat) | 120 | 72 | 0 |

## Notes

* **Launcher jump-cancel** (Poitrine, anti-air knee): press ↑ on hit and Sanji does a low follow-up jump that rises
  with the launched foe, instead of his full jump.
* Cancel rules:
  * any Course kick into any other Course kick;
  * a connected normal into any special or the super;
  * Anti-Manner into Hachis or the super;
  * Hachis into Mouton or the super;
  * Sky Walk into Sky Walk or Concasse, from its 4th frame on.
* Measured data: `/tmp/ms-sanji-render/combos.json`, written by each P6+ render check.
