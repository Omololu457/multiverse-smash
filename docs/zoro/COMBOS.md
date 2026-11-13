# Roronoa Zoro — combos

All four combos are performed with **real keyboard input in Training mode** by `harness/zoro_combos.test.mjs`,
and every damage number below is **measured** from that run (HP actually removed from a standing dummy).

## How damage is computed
`HP removed = raw × 0.60 (GLOBAL_DAMAGE_SCALE) × 0.85^(hits already landed in this combo) × 1.12 (Santoryu only)`

* **Scaling: 85% per hit.** The 1st hit is full, the 2nd ×0.85, the 3rd ×0.7225, and so on. This applies to
  Zoro only (gated in `combat._comboScale`); the rest of the roster keeps the shared curve.
* **Reset:** the combo counter drops after **1.5 s (90 frames) idle**. That is the shared engine combo timer,
  verified by the test: hit, wait 95 frames, and the next Jab is unscaled again (40 raw → 24).
* A **Tatsu Maki tornado counts as ONE hit for scaling**, however many 10-damage ticks it lands, so a
  multi-hit twister can't zero out what follows it.
* Keys below use P1 defaults: Light J, Heavy K, Special (A) L, Up-Attack I, Ultimate U, ↑ = W.

## 1. Jab → Slash → Heavy slash (launch) → Taka Nami
`J, J, K, ↓↘→ + L` — the core L, L, H string; Heavy cancels into the flying slash, which aims up at the popped foe.

| Hit | Raw | Scale | HP |
|---|---|---|---|
| Jab | 40 | 1.00 | 24 |
| Slash | 65 | 0.85 | 33 |
| Heavy slash | 90 | 0.7225 | 39 |
| Taka Nami | 55 | 0.614 | 20 |
| **Total** | **250** | | **116** |

Spirit: −10 (Taka Nami), +5 per hit.

## 2. Low thrust → Rising slash → (jump) Air slash → Tatsu Maki
`↓ + J, I, (after the hit-freeze) ↑, J, ↓ ↓ + L`

* The Rising slash's hit-freeze latches the jump key, so ↑ must be pressed **fresh once the freeze ends** (the
  shared launcher jump-cancel). The Air slash then has a **7-frame window** (measured: 0–6 frames after takeoff).
* Tatsu Maki cast in the air spawns its tornado on the floor; the falling foe drops into it (drag pulls them in).

| Hit | Raw | Scale | HP |
|---|---|---|---|
| Low thrust | 50 | 1.00 | 30 |
| Rising slash | 75 | 0.85 | 38 |
| Air slash | 60 | 0.7225 | 26 |
| Tatsu Maki (3 ticks) | 10 ×3 | 0.614 | 3 + 3 + 3 |
| **Total** | **215** | | **103** |

## 3. Oni Giri → turn around Heavy slash → Tora Gari
`→ → + L, K, ↓↙← + L` (after Oni Giri Zoro is BEHIND the foe and auto-turns, so ← is now the right-hand key)

| Hit | Raw | Scale | HP |
|---|---|---|---|
| Oni Giri | 90 | 1.00 | 54 |
| Heavy slash | 90 | 0.85 | 45 |
| Tora Gari | 85 | 0.7225 | 36 |
| **Total** | **265** | | **135** |

Oni Giri's 42-frame hitstun outlasts its 22-frame recovery and the Heavy's 13-frame startup, so the turn-around
Heavy is a true follow-up.

## 4. (Santoryu) Heavy slash → 2-hit Tatsu Maki → ASHURA
`L+K (Santoryu), K, ↓ ↓ + L, ↓↘→↓↘→ + L` (or the Ultimate button)

* **Spirit route (real costs, no refill):** bank 100 Spirit during the stance, Heavy (+5, capped) → Tatsu Maki
  (−20 → 80) → every tornado tick is a sword-technique hit (+5) → back to **100** → ASHURA. The test asserts
  Spirit is ≥ 100 at the super input.
* In Santoryu, Tatsu Maki is a **twin tornado** (both slots of the pool of 2).
* ASHURA **must connect on its first cut**; it is unlocked only in Santoryu.

| Hit | Raw | Scale (×1.12 Santoryu) | HP |
|---|---|---|---|
| Heavy slash | 90 | 1.00 | 60 |
| Twin Tatsu Maki (6 ticks across 2 tornadoes) | 10 each | 0.85 / 0.7225 | 9 + 8 + 8 + 8 + 4 + 4 |
| Ashura cut 1 | 70 | 0.614 | 28 |
| Ashura cut 2 | 70 | 0.522 | 24 |
| Ashura cut 3 | 70 | 0.444 | 20 |
| Rengoku Onigiri | 150 | 0.377 | 38 |
| **Total** | **510** | | **211** |

ASHURA on its own (the first hit of a combo) is 360 raw → **180 HP** in Santoryu after scaling (measured in
`zoro_moveset.test.mjs`: 1000 → 820). Afterwards Spirit is 0 and locked out for 4 s.

## Tuning notes (phase 5)
To make these four routes real, a few phase-4 starting values were adjusted (all Zoro-only):
* Heavy slash launch `launchVy −27 → −12` (a short ~85 px pop) so Taka Nami / Tora Gari / Tatsu Maki can follow.
* Taka Nami aims at an airborne opponent in front of Zoro (flat otherwise).
* Tora Gari's hitbox covers −20…+116 px of the body (still hits low / crouching, now also a popped foe).
* Tatsu Maki's box is taller (floor −148 … floor −20) and its drag reaches airborne foes.
* Tornado ticks give +5 Spirit (a sword hit), not +1.
