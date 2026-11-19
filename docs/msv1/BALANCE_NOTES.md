# MSV1 — Balance notes (Shane `ns_red` / Dustin `ns_yellow`)

The anchor is **S.P.D. Red** (docs/msv1/SPD_RED_REFERENCE.md). The ninjas sit in his speed tier and his damage
tier (roster parity ×1.6). Every number below comes from the data files or from the harnesses named next to it.
None of it is a feel guess. AI-vs-AI win rates are **not** used as a strength signal: the CPU drives every
fighter differently, so they measure the CPU, not the kit.

## 1. Body

| | S.P.D. Red | Shane | Dustin | Source |
|---|---|---|---|---|
| Health | 1200 | 1200 | **1296** (+8%) | nsData.js stats |
| speed stat → walk | 88 → 7.0 px/f | 88 → **7.0** | 88 → **7.0** | measured equal: msv1_scen_a_core |
| Run (after the double-tap) | 10.5 px/f | **10.5** | **10.5** | measured equal: msv1_scen_a_core |
| Air speed | ×1.0 | **×1.10** | ×0.90 | profile `airMul` |
| Jumps | 1 | **3** + Wind Float (72 f, never climbs) | 2 | stats.maxJumps |
| Weight (knockback ÷) | 0.9 | 0.85 (flies further) | 1.0 | profile `weight` |
| Damage parity | ×1.6 | ×1.6 | ×1.6 | rosterParity.js |
| Combo scaling | 85% / hit | 85% / hit | 85% / hit | `ninjaComboScale` |

**Why Dustin gets +8% health and Shane doesn't.** Dustin has the worse air game (2 jumps, ×0.9 air speed, no
air streaks). He wins by holding ground: burrow, traps, Rock Hold. That kit means he gets hit while setting up,
so the HP buys back the setup time. Shane's defence is never being there: 3 jumps, 2 air streaks per airtime and
Wind Float.

## 2. The double-tap: Blink vs Streak

| | S.P.D. Red Blink | Ninja Streak |
|---|---|---|
| Distance / time | 282 px in 11 f (3 + 5 + 3) | **512 px in 8 f** + 14 f recovery |
| Protection | invulnerable for the 5 travel frames | **projectile-intangible only** (f2–6). Strikes hit him |
| Cost | free, 2 charges, 90 f refill each | **10 NP** (third chained streak 20). Regen 6/s (none while streaking), +4 per hit |
| Chain | 2 charges | 3 per chain, then the full recovery (`chainLock`) |
| Offence | crossup, then the foe's facing is locked | crossup + **Streak Strike 45** on the way through |

The streak goes further and faster than the blink. It pays for that by **not being strike-invulnerable**: an
active hitbox in the path hits it. Each streak also has a real cost and a 14 f recovery, which only specials can
cancel (from frame 9).
* Three streaks drain 40 of 100 NP, which takes ~6.7 s to regenerate.
* Running out of NP turns the double-tap into a plain run. That loss of mobility is the brake on streak spam.

## 3. Ninja Power economy (start 50, max 100, +6/s, +4/hit)

| Spend | NP | Note |
|---|---|---|
| Streak / chained / 3rd | 10 / 10 / 20 | |
| Smoke Vanish | 30 | blockstun escape 40, 6 invuln frames, **12 s cooldown** |
| Shadow Clones | 35 | 2 clones, 60% damage each, never the KO; one hit pops a clone |
| Ninja Mirror | 50 | 8 s; swap 10 each, max 3 |
| Ninja Barrier | 25 | 8 f parry, then the dome / armor |
| Specials | 10 – 20 | Kunai 10 · Gale 12 · Beam 15 · Trap 15 · Tornado / Burrow 20 |

At the round start (50 NP) a ninja can afford **one** big framework tool, the Mirror or Clones plus a streak, but
not both. Regen alone takes a full 8 s to rebuild a Mirror. The resource is meant to force a choice every few
seconds.

## 4. Damage: what one bar buys (measured, docs/msv1/COMBOS.md)

| | Meterless BnB | Best special route | 1 bar | 2 bars |
|---|---|---|---|---|
| S.P.D. Red | 117 – 138 | 150 | — | 220 |
| Shane | 109 – 114 | 69 – 83 | 258 | 364 (Mirror required) |
| Dustin | 97 – 122 | 108 – 112 | 276 | 372 (Double required) |

* **The meterless strings sit 5–20% under S.P.D. Red's.** The ninjas' mobility is better (longer streak, Shane's
  air), so the strings are deliberately weaker.
* **The supers outdamage his.** The 2-bar ultimates also need the Mirror up: 50 NP plus surviving with it.
  Hitting the *real* body cancels both the Mirror and the ultimate threat, and guessing it is a coin flip with a
  visible tell.
* Clones and the illusion **can never land the KO** (`noKO`). Echo hits deal 50% damage, no chip and 50% meter,
  so the Mirror is a pressure tool, not a doubled damage output.

## 5. Mirror (the identity guess)
* The real spot is a seeded hash. The tell is the same for both players: the illusion has **no ground shadow** and
  its visor **glints every 90 frames**.
* Guessing wrong is punished hard:
  * Shane's illusion counters with a 3 × 18 tornado launch.
  * Dustin's decoy counters with an 80 wall-bounce eruption.
* Guessing right ends the Mirror and takes a full combo off the real body.
* The CPU guesses the tell with a difficulty-rated success chance (easy 20% / normal 45% / hard 70%), otherwise
  by hash (Phase 8). It never reads the hidden identity.

## 6. Risk notes and levers (if a matchup feels off)

| Concern | Lever (one number) | File |
|---|---|---|
| Streak spam | `streak.cost` 10 → 12, or `np.regen` 6 → 5 | ninja.js NINJA_DEFAULTS |
| Shane untouchable in the air | `streak.air.perAirtime` 2 → 1, or `float.frames` 72 → 48 | nsData.js SHANE_PROFILE |
| Burrow too safe | `burrow.frames` 90 → 70 (lows already dig him out) | nsData.js DUSTIN_PROFILE |
| Traps oppressive | `traps.life` 360 → 240, `traps.max` 2 → 1 | nsData.js |
| Mirror too strong | `mirror.frames` 480 → 360, `maxSwaps` 3 → 2 | ninja.js defaults |
| Ultimates too high | sUlt fixed totals 380 / 390 → 340 / 350 | nsSupers.js |
| Overall damage | `rosterParity` 1.6 → 1.5 (touches only ns_red / ns_yellow) | rosterParity.js |

The levers are deliberately per-profile. Changing a ninja number never changes S.P.D. Red or anyone else; the
frame-data diff stays at zero for all 157 existing characters.

## 7. Known asymmetries kept on purpose
* **Shane reflects, Dustin absorbs.** Shane's Wind Ward reflects projectiles during the parry and erases them on
  the dome. Dustin's Rock Hold *armors* 2 hits and counters. Zoners should fear Shane's barrier; rushdown should
  fear Dustin's.
* **Only lows reach a burrowed Dustin** (mids pass over; ground-hit projectiles also connect). Every character
  with a low (`hitLevel: 'low'`) or a ground hit can dig him out.
* **The Tremor Streak surfaces under the foe**, so Tremor → Erupt is a real mix-up from below. It is readable by
  the moving dust ripple both players see.
