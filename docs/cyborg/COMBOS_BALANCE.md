# Cyborg — combos and balance (measured)

All numbers come from a real run of `node harness/cyborg.test.mjs` (92 checks passed, 0 failed). The raw data is in `docs/cyborg/mechanics_results.json`.

Test setup:
- The dummy is Superman, standing still, and the routes use real inputs.
- "Damage" means HP actually removed, after the shared scaling and defence.
- A route only counts as a "true combo" if the foe is still in hitstun at every follow-up hit and none of the hits were blocked.

## Routes

| Route | Hits (dealt) | Total | Power | Heat start → end | Verdict |
|---|---|---|---|---|---|
| J1 → J2 → J3 | 22 / 28 / 33 | 83 | 0 | 0 → 0 | true combo (both facings) |
| Low → Heavy → Mega Punch | 28 / 67 / 73 | 168 | 15.74 net | 0 → 0 | true combo |
| Forward + Heavy → Heavy → Heavy | 30 / 32 / 37 | 99 | 0 | 0 → 0 | true combo |
| Launcher → jump (cancel window) → Air Hammer | 46 / 30 | 76 | 0 | 0 → 0 | true combo |
| Hot Mega: Heavy → Mega Punch at Heat 70 | 67 / 73 | 140 | 15.74 | 70 → 49.75 | true combo, vents 20 Heat |
| Heavy → BOOYAH PROTOCOL (recovery cancel) | 67, 28, 34, 17, 17, 17, 34, 94 | 308 | 96.52 net | 0 → 60 | true combo |
| Resonance: J1 → J2 → Sonic Shot → Missile | 22 / 28 / 29 / 39 | 118 | 23.34 | 0 → 29.75 | **reset at hit 4**, not a true combo; the missile consumes the mark (1 conversion) |
| Sonic Shot → Straight Missile at range | 32 / 46 | 78 | 23.16 | 0 → 29 | pressure / zoning, not a combo |
| Missile Rack at range | 14 / 14 / 13 / 12 | 53 | 26.22 | 0 → 36.25 | pressure; 4 of 5 missiles connect |

**About the Power column.** "Power" is net spend. Shared on-hit Power gain offsets part of each cost, so the numbers come out below the listed costs.

**About the Heat column.** Every route starts with a press frame that cools Heat by 0.25 before the move starts (the press tick counts as neutral). That is why end values are .75 or .25 instead of whole numbers.

## Heat economy (measured)

| Item | Value |
|---|---|
| Costs | Shot 12 · Missile 18 · Cannon 4 × 10 = 40 · Rack 5 × 8 = 40 · Recoil 16 |
| Passive cooling | 0.25 / f in neutral (40 Heat in 160 f) |
| Vent | after 8 f startup → 79.75; after 28 f → 64.75; release recovery 11-12 f; Power gain while venting 2.40 vs 2.52 idle |
| Overheat exit, passive | 180 f (60 f minimum + cooling to ≤ 60) |
| Overheat exit, venting | 61 f |
| Re-checks | the cannon stops after 2 pulses when the third would pass 100; the rack stops after 3 missiles |
| HUD | 0-59 normal (no label) · 60-99 `WARN` · 100 `OVERHEAT` · venting `VENT`. Text always shown with the colour. |

**Vent and Power.** Holding vent gives no Power. The 2.40 is the shared passive regen, which is not paused.

**Design observation: overheat is rare in normal play.** Over-cap activations are refused, as the brief asks, so Heat only reaches exactly 100 when costs land on it precisely. Example: 88 + 12 from a Sonic Shot. In ordinary play Cyborg usually meets a refused emission (a `reject` buzz) before he overheats. This is intended behaviour, and both paths are tested.

## Mobility and weight

| Item | Value |
|---|---|
| Walk | 360 px in 60 f |
| Jump apex | 355 px |
| Thruster reboost | vy −19, 7.94 Power net, once per airtime; a failure keeps the allowance |
| Landing | 16 f `land` presentation |
| Weight 1.15 | Cyborg takes knockback vx 4.35 / vy −1.74 where a control fighter takes 5 / −2 (ratio 1.15) |
| Recoil push | 30 px |

## Ultimate

| Item | Value |
|---|---|
| Contacts | 30 / 40 / 20 / 20 / 20 / 40 / 112 → 282 raw (brief: 280; the shared hit system rounds each contact) |
| Heat afterwards | 60 |
| Miss | 93 f total |

## Balance notes

- **HP and weight.** HP 1100 with weight 1.15 is the bulky end of the roster. The trade-off is slow normals: Heavy has 16 f startup and Mega Punch 22 f.
- **Ranged damage is gated twice.** Every ranged option costs both Power and Heat. With full Power and 0 Heat, Cyborg can fire about two missiles plus one rack before Heat reaches the WARN zone.
- **Hot Impact rewards running hot.** A clean Mega at Heat ≥ 60 vents 20, which gives Heat back for more zoning.
- **Damage tuning.** The lever is `CYBORG_DAMAGE_SCALE` (1.7) in cyborgData.js. Cyborg is not on rosterParity's extra ×1.3 list.
