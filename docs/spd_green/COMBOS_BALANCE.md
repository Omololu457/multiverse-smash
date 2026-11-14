# S.P.D. Green — Measured Combos & Balance

All numbers come from `harness/spd_green.test.mjs` (60/0) and are recorded in `docs/spd_green/mechanics_results.json`.
Damage is **applied** damage in the Green-vs-Green mirror; the engine scale is about 0.588 × raw.
"True combo" means the defender was still in hitstun when each follow-up connected, and the combo counter incremented.

## Routes (all true combos)
| Route | Hits | Damage | Energy |
|---|---|---|---|
| J1 → J2 → J3 | 10+12+15 | 37 | 0 |
| J1 → J2 → J3 (mirrored facing) | 10+12+15 | 37 | 0 |
| J1 → Heavy → Deltamax Check | 10+31+19 | 60 | ≈11 net |
| Forward+Heavy → Heavy → Heavy | 14+17+22 | 53 | 0 |
| Launcher → manual Jump → Air | 2 hits | 40 | 0 |
| Aura Read → Acrobat Step → marked Heavy follow-up | 3 hits, follow-up 11 | 39 | follow-up +4.94 |
| Phase step (120px) → Heavy punish | — | 31 | ≈6 net |

On the marked follow-up, the defender still had 31f of stun at Acrobat recovery and 30f when the follow-up started. The mark is consumed by the follow-up.
Unmarked Acrobat Step: 20+28 raw → 28 applied, cost 18. It has no follow-up.

## Frame advantage (contact frame → both sides free)
| Move | On hit | On block |
|---|---|---|
| J1 | +5 | −2 |
| J2 | +6 | −3 |
| J3 | +6 | −10 |
| Heavy | +10 | −15 |
| Low | +6 | −7 |
| Launcher | +9 | −14 |
| F+H 1 | +10 | −11 |
| F+H 2 | +12 | −13 |
| F+H 3 | +5 | −18 |
| Marked follow-up | +6 | −12 |
| Rising Arc | −3 | −23 (landing recovery) |

## Balance notes
- **HP 980, standard weight, 1 jump.** He has fewer cheap mixups than Blue, and his rewards come through the read.
- **Aura Read gates the big payoff.** The 12f startup and 24f scan are punishable. The 240f cooldown and the 180f mark window allow one mark per owner. The mark lasts only while the target is within 350px when the scan completes.
- The follow-up needs a **clean** Acrobat hit. A blocked Acrobat clears eligibility, so the mark is not a free plus-frame engine.
- Rising Arc is unsafe (−23 on block) and works once per airtime. Heel Return carries a 24f landing penalty.
- Read and Retreat is ≤90px and still has 18f of recovery, so it is a spacing tool, not invulnerable escape.
- The phase step reuses SPD Blue's contract exactly: window 12, cost 8, cooldown 36, 120px, plus the stage-edge clamp.
