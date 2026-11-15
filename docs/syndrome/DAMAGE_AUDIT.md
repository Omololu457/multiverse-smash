# Syndrome — damage audit

All numbers below are **measured** in the running game (headless Chromium, real combat pipeline), not computed by hand.
Sources: `harness/syndrome_damage.mjs` → `damage_results.json` (each move from a fresh state vs a standing dummy, no
combo scaling at the first contact) and `harness/syndrome.test.mjs` → `mechanics_results.json` (routes through real
keyboard input). Regenerate this file: `python3 tools/syndrome/damage_audit_md.py`.

## Pipeline

- Authored raw values are stored as-is (`SYNDROME_DAMAGE_SCALE = 1`; Goku stores light / heavy 45 / 85, Superman 45 / 80).
- The shared pipeline applies to every character alike: live = floor(raw × combo scale × 0.6 GLOBAL_DAMAGE_SCALE / defence
  multiplier). Machine volumes are engine projectiles (`applyScaledDamage`), the ultimate goes through `W.damage` per contact.
- Multi-contact operations (Duet, turrets) take the SHARED combo scaling from the second contact when the foe is still in
  hitstun — so their measured totals sit below raw × 0.6. Nothing in Syndrome bypasses scaling.

## Single moves vs 5 opponents (total HP removed; contacts in brackets)

| Move | Raw | vs syndrome | vs goku | vs superman | vs megumi_fushiguro | vs robin |
|---|---|---|---|---|---|---|
| Spinner Snap | 45 | 27 (1) | 27 (1) | 27 (1) | 27 (1) | 27 (1) |
| Drone Cross | 45 | 27 (1) | 27 (1) | 27 (1) | 27 (1) | 27 (1) |
| Spinner Pass | 65 | 39 (1) | 39 (1) | 39 (1) | 39 (1) | 39 (1) |
| Low Spinner Skim | 42 | 25 (1) | 25 (1) | 25 (1) | 25 (1) | 25 (1) |
| Claw Drive | 95 | 57 (1) | 57 (1) | 57 (1) | 57 (1) | 57 (1) |
| Rising Claw | 75 | 45 (1) | 45 (1) | 45 (1) | 45 (1) | 45 (1) |
| Zero-Point Hold | 20 | 12 (1) | 12 (1) | 12 (1) | 12 (1) | 12 (1) |
| Hunter Duet | 150 | 76 (6) | 76 (6) | 76 (6) | 76 (6) | 76 (6) |
| Spin Cycle | 110 | 66 (2) | 66 (2) | 66 (2) | 66 (2) | 66 (2) |
| Velocipod Intercept | 150 | 90 (1) | 90 (1) | 90 (1) | 90 (1) | 90 (1) |
| Gun Turret | 180 | 83 (9) | 83 (9) | 83 (9) | 83 (9) | 83 (9) |
| Missile Turret | 180 | 105 (3) | 69.3 (2) | 105 (3) | 105 (3) | 105 (3) |
| Mortar Turret | 180 | 100 (4) | 100 (4) | 100 (4) | 100 (4) | 100 (4) |
| Hammerfall | 170 | 102 (1) | 102 (1) | 102 (1) | 102 (1) | 102 (1) |
| Rising Interception | 130 | 78 (1) | 78 (1) | 78 (1) | 78 (1) | 78 (1) |
| Omnidroid Sweep | 120 | 72 (1) | 72 (1) | 72 (1) | 72 (1) | 72 (1) |
| **Operation Kronos (confirmed)** | 420 | **252** (9) | **249** (9) | **252** (9) | **252** (9) | **252** (9) |

Max HP of each opponent: syndrome 1100, goku 1000, superman 1150, megumi_fushiguro 1000, robin 1100.

Ultimate contacts vs the first opponent: 18 / 9 / 9 / 12 / 15 / 9 / 24 / 18 / 138.

## Routes through real input (mechanics harness, mirror match)

| Route | Hits | Damage | Verdict |
|---|---|---|---|
| Spinner Snap → Drone Cross → Spinner Pass (Light ×3) | 27 + 27 + 35 | 89 | true combo |
| Light retap without a hit | — | 0 | no hit |
| Claw Drive | 57 | 57 | single hit |
| Spinner Snap → Claw Drive | 27 + 57 | 84 | true combo |
| Rising Claw | 45 | 45 | single hit |
| Rising Claw → jump cancel → Drone Strafe | 45 + 32 | 77 | true combo |
| Hunter Duet (6 shots) | 15 + 15 + 13 + 12 + 11 + 10 | 76 | pressure (not a combo) |
| Spin Cycle (out + back) | 36 + 30 | 66 | pressure (not a combo) |
| Velocipod Intercept | 90 | 90 | single hit |
| Gun Turret volley | 12 + 12 + 11 + 10 + 9 + 8 + 7 + 7 + 7 | 83 | pressure (not a combo) |
| Hammerfall | 102 | 102 | single hit |
| Hammerfall vs guard | — | 15 | no hit |
| Omnidroid Sweep | 72 | 72 | single hit |
| Rising Interception | 78 | 78 | single hit |
| Missile Turret | 36 + 36 + 33 | 105 | pressure (not a combo) |
| Mortar Turret | 27 + 27 + 24 + 22 | 100 | pressure (not a combo) |
| Zero-Point Hold → Claw Drive | 12 + 57 | 69 | true combo |
| Duet → Spin Cycle → CONVERGENCE | 36 + 15 + 13 + 12 + 11 + 10 + 9 + 19 | 125 | pressure (not a combo) |
| Operation Kronos vs guard | — | 2 | no hit |
| OPERATION KRONOS: FINAL DEMONSTRATION | 18 + 9 + 9 + 12 + 15 + 9 + 24 + 18 + 138 | 252 | true combo |
| Claw Drive → Ultimate | 57 + 16 + 7 + 7 + 10 + 12 + 7 + 20 + 15 + 115 | 266 | true combo |

## Reading

- Light 45 / 45 / 65, Heavy 95, launcher 75, low 42, air 65, down-air 85 match the brief's table as stored values; the first
  contact of each measures floor(raw × 0.6) on a fresh foe, the same rule every roster member follows.
- The confirmed ultimate (30 + 90 + 70 + 230 raw) measures the totals in the table above with the combo scale captured at
  the capture; it is the largest single resource spend in his kit (100 Power).
- Opponent-specific differences are reported as measured, not smoothed over: wherever a column differs from the others
  (e.g. fewer contacts, or a contact a few HP lower), the cause lies on that opponent's side of the shared pipeline
  (their hurtbox / knockback travel / defensive passive) and was not investigated further in this build.
