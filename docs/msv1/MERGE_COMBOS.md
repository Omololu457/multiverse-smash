# MSV1-MERGE: swap combos (Ninja Storm MS_V1 Ranger Version)

**How these were measured.** All routes were performed with real key presses, in training mode, on the real game loop,
by `harness/msv1_merge_combos.mjs`.
* The training dummy is plain Dustin (`ns_yellow`), as in COMBOS.md.
* **Damage** is what the dummy's HP bar lost on that step. Combo scaling (85% per hit), roster parity ×1.6 and the
  global ×0.6 are all included.
* **NP** is the change in Ninja Power on the step: −15 per swap, partly refilled by the +4 on-hit gain and the 6/s regen.
* **Meter** is the super meter after the step. Its maximum is 100 = 2 bars.

Keys: J Light, K Heavy, L Special, O Grab. The swap is **↓↓ then Grab**. Each route starts at full NP.

## Swaps don't true-combo off normals (by design)

A swap only comes out in a normal's **recovery**. It then lasts 14 frames, and its strike lands on frame 10 with a
small stagger (14 hitstun). Together that is longer than a normal's hitstun, so after
string → swap the dummy can act about **10 frames before** the swap-in strike connects ("foe actionable from frame
54–59" below).

The swap routes are therefore **tag pressure**: a frame trap that resets into the other ranger. They are not true
combos. That follows from the brief's own rules (recovery-only swaps, a 14-frame smoke, and a stagger that does not
auto-combo), and none of those rules were bent to make a true combo. The true combo in the duo's kit is route 4.

## 1. Tag-in (Shane → Dustin)
`L, H, H, ↓↓ Grab, →H`

| Step | Damage | NP (now) | Meter | Form |
|---|---|---|---|---|
| Shane L, H | 59 | 0 (100) | 1 | Shane |
| Shane H (2nd kick) | 20 | 0 (100) | 2 | Shane |
| ↓↓ Grab: swap + swap-in strike | 17 | −10 (90) | 6 | Dustin |
| Dustin →H Rock Slash | 35 | +6 (96) | 7 | Dustin |
| **Total** | **131** | | | engine combo 5; the foe can act from frame 54 |

## 2. Tag-bonus round trip (Shane → Dustin → Shane)
`L, H, ↓↓ Grab, L, ↓↓ Grab, ↓↘→ S`

The first strike tags **Shane**, the ranger who just left. Shane's next special within 3 s deals +10%. The second
swap waits out Ben's 30-frame cooldown.

| Step | Damage | NP (now) | Meter | Form |
|---|---|---|---|---|
| Shane L, H | 59 | 0 (100) | 1 | Shane |
| ↓↓ Grab: swap + strike (tags Shane) | 20 | −10 (90) | 5 | Dustin |
| Dustin L (cooldown runs) | 24 | +7 (97) | 7 | Dustin |
| ↓↓ Grab: swap back + strike (tags Dustin) | 15 | −9 (88) | 11 | Shane |
| Shane ↓↘→ S Air Ninja Tornado **[tag ×1.1]** (cost 20) | 21 | +6 (94) | 30 | Shane |
| **Total** | **139** | | | engine combo 10 |

## 3. Stone opener (Dustin → Shane beam)
`L, H, H, ↓↓ Grab, ↓↘→ L` (start as Dustin)

| Step | Damage | NP (now) | Meter | Form |
|---|---|---|---|---|
| Dustin L, H | 67 | 0 (100) | 1 | Dustin |
| Dustin H | 22 | 0 (100) | 2 | Dustin |
| ↓↓ Grab: swap + swap-in strike | 17 | −10 (90) | 6 | Shane |
| Shane ↓↘→ L Ninja Beam | 25 | −7 (83) | 8 | Shane |
| **Total** | **131** | | | engine combo 5; the foe can act from frame 55 |

## 4. Max: Shane's string → STORM AND STONE (full meter)
`L, H, H, ↓↘→↓↘→ S+H`

| Step | Damage | NP (now) | Meter | Form |
|---|---|---|---|---|
| Shane L, H, H | 79 | 0 (100) | 100 | Shane |
| ↓↘→↓↘→ Special + Heavy: Storm and Stone | 242 | 0 (100) | 33 | Shane |
| **Total (MAX COMBO DAMAGE)** | **321** | | | engine combo 12; a true combo (the foe is never actionable) |

* Storm and Stone is authored at **420**: five tornado hits of 42 (energy, 210) plus three eruptions of 50 and a
  final 60 (blunt, 210).
* After a 3-hit string, combo scaling (0.85³) is applied once at the start, so it deals 242 here.
* Raw, with no string first, it measured 401 on S.P.D. Red (his own damage mods apply).

### Why super → swap → super is not allowed

`L, H, H, ↓↘→↓↘→ S (Storm Ascension), ↓↓ Grab, ↓↘→↓↘→ S` measured **313** total. Shane's super dealt its damage; the
swap press was refused; Dustin never came in and never fired his Earthquake.

* **The swap is refused during a super or ultimate** (MERGE_DESIGN.md). The press is buffered for Ben's 18-frame arm
  window and expires long before a 90-frame super ends.
* **After the super, the combo is gone.** Storm Ascension ends on a launch and knockdown, and in this run the foe could
  act again from frame 147. A swap at that point is a reset, not a link.
* **The meter is shared and maxes at 2 bars.** Two 1-bar supers would spend the whole meter on one confirm. The duo's
  2-bar payoff is Storm and Stone in a single input (route 4: 321), which is more than super → super could ever reach.

Letting a swap cancel a super would chain both rangers' supers off one hit for about 2 × 300 damage, and it would make
the tag ultimate pointless.
