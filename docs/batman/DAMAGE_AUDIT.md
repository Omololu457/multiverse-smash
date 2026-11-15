# Batman (rebuilt) — Damage Audit

Measured through the real game with real keyboard input (`harness/batman_damage_audit.mjs`, data in
`damage_audit.json`; supplement rows with `--supplement`). Values are HP removed from a standing dummy.

**Formula.** Melee and fleet payloads: `floor(raw × comboScale × offense × 0.60 / defenseMult)` through the
shared `applyScaledDamage` choke-point (fleet uses the owner's *current* combo scale). KNIGHTFALL's cinematic
contacts follow the engine's cinematic-ultimate convention (Superman World of Cardboard, Beerus): no ×0.60, but
the combo scale captured at confirm applies. Stored move damage = raw (no private multiplier).

## Raw targets vs measured (vs Superman / Higuruma — neutral defence)

| move | raw target | stored raw | measured | expected (raw × 0.60) |
|---|---|---|---|---|
| Light | 48 | 48 | 28 | 28.8 |
| Light follow-up (Cross) | 48 | 48 | 28 | 28.8 |
| Light finisher (Rising Knee) | 64 | 64 | 35 (in chain, scaled) | 38.4 × combo |
| Heavy kick | 95 | 95 | 57 | 57 |
| Launcher | 75 | 75 | 45 | 45 |
| Air strike | 65 | 65 | 39 | 39 |
| Cape dive | 90 | 90 | 54 | 54 |
| Low | 42 | 42 | 25 | 25.2 |
| Grab (shared throw path) | 45 | 45 | 54 | shared throw formula (not × 0.60) |
| Batarang | 70 | 40 + 30 | 24 + 18 = 42 | 42 |
| Grapnel Breaker | 85 | 25 + 60 | 15 + 36 = 51 | 51 |
| Cape Counter | 100 | 100 | 60 | 60 |
| Rooftop Extraction | — | 55 | 33 | 33 |
| Gotham Airspace | 200 | 10 × 20 | 90 | 120 before combo scaling over 10 hits |
| Interceptor | 150 | 120 + 30 | 66 | combo-scaled over 10 hits |
| Carrier | 180 | 6 × 30 | 92 | combo-scaled |
| Automaton | 150 | 40 + 40 + 70 | 86 | combo-scaled |
| Skyhook | ~140 | 50 + 90 | 84 | 84 |
| Capsule Cover | ~80 | 8 × 10 | 36 | combo-scaled |
| Ultimate (KNIGHTFALL) | 420 | 40 + 40 + 90 + 200 + 50 | **420** (5 hits) | 420 at full scale |

Every operation delivers exactly its raw budget (`assistRaw === budget` on a standing dummy, mechanics test).

## Routes vs four opponents

| route | Goku | Superman | Higuruma | Arlong |
|---|---|---|---|---|
| light | 28 | 28 | 28 | 28 |
| heavy | 57 | 57 | 57 | 57 |
| chain Light ×3 | 91 | 91 | 91 | 91 |
| chain → Grapnel Breaker | 130 | 130 | 130 | 130 |
| chain ×3 → KNIGHTFALL (Rising Knee cancel) | 412 | 412 | 412 | 397 |
| launcher → jump → double jump → air strike | 77 | 77 | 77 | 77 |
| KNIGHTFALL point blank | 420 | 420 | 420 | 404 |
| Gotham Airspace alone | 77 | 90 | 90 | 90 |
| Interceptor alone | 49 | 66 | 66 | 66 |
| Carrier alone | 78 | 92 | 92 | 92 |
| Skyhook alone | 72 | 84 | 84 | 84 |
| Capsule Cover alone | 30 | 36 | 36 | 36 |
| Automaton alone | 73 | 86 | 86 | 86 |
| Airspace + chain under the bombs | 143 | 165 | 165 | 165 |

Goku takes less from the fleet because of his defence multiplier on the multi-hit operations. Arlong's armour shaves
the big cinematic contacts.

The best non-ultimate string, chain → Grapnel (130), is 11 % of a 1150-HP target. Chain → KNIGHTFALL (412) is 36 %.

Notes:
- **"chain → Grapnel → KNIGHTFALL" never fires the ultimate.** KNIGHTFALL needs a full 100 bar and Grapnel
  spends 14, so the legal string is chain → KNIGHTFALL.
- **The launcher's follow-up needs a double jump.** The shared Balanced launcher (vy −32) lifts the target about
  590 px. A jump pressed during the hit freeze is swallowed, as it is for every fighter, and a single jump can't
  reach. The working juggle is launcher → jump (≥ 20 f) → double jump → air strike.

## Reference fighters on a Batman dummy (same harness, same target)

| fighter | light | heavy | Light ×3 (tapped) | Ultimate (point blank) |
|---|---|---|---|---|
| **Batman** (vs Superman) | 28 | 57 | 91 | **420** |
| Goku | 27 | 51 | 27 (no tapped chain) | 0 (Super Saiyan Blue is a transformation, not damage) |
| Superman | 27 | 48 | 27 (no tapped chain) | 380 |
| Higuruma (technical) | 18 | 67 | 71 | 316 |

How Batman compares:
- **Normals:** in line with the references. Light is +1 over Goku and Superman, and heavy sits between Superman
  and Higuruma.
- **Light chain:** stronger than the technical reference (91 vs 71). This pays for his commitment: clean-hit-only
  cancels and no projectile zoning from the body.
- **KNIGHTFALL:** 420 matches the brief's contract exactly. It is the highest of the references, about 10 % over
  Superman's World of Cardboard. It is offset by a long, blockable 14 f opener with 44 f whiff recovery, a
  full-bar requirement, and the fleet clearing on confirm.
- **Fleet:** each operation alone does 36–92. They cost 18–35 energy with 300–480 f cooldowns, only one runs at a
  time, and the machines can be destroyed.
