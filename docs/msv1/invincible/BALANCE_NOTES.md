# Invincible (Mark Grayson) — Balance Notes

**He hits harder, moves faster and flies more agilely than anyone, and he dies first.** The design question is whether
those three can sit together on one fighter fairly. These notes give the numbers: what he gives up, how each of his
strengths is punished, and how he plays against the two fighters the brief names.

All numbers are authored in `invincibleData.js` and checked live by `harness/invincible.test.mjs`
(47/0, `test_results.json`).

## 1. The price: health, weight, Resolve

| | Invincible | Roster |
|---|---|---|
| Max health | **748** | median 1150 (118 selectable fighters); lowest before him 950 (Ben 10, Ghostface) |
| Ratio | **0.65 × median** | — he is the lowest on the roster by 202 HP |
| Weight | knockback taken **× 1.30** horizontal, **× 1.15** upward | 1.0 |
| Resolve (Can't Stay Down) | +20 % damage, +10 % speed, **+25 % damage taken**, 6 s, once per round | — |

- **Health.** The roster's medium normals deal ~50–90. A clean punish of about 6 hits takes a third of his bar. A full combo from a heavy hitter can take 60–70 %.
- **Can't Stay Down.**
  - It is not a free life: it leaves him at **1 HP**, knocked down.
  - The +25 % damage taken during Resolve means any hit in those 6 s ends the round.
  - It only buys the comeback window "Not yet." promises, once per round.
- **Weight.** It means the opponent's combos carry him further: more corner carry, more juggle height. Being launched is a bigger deal for him than for anyone else.

## 2. The strength: normals, honestly compared

Below, "dealt" = HP a clean hit takes off. Roster figures are the roster's *stored* damage × the engine's global 0.6 write scale.

| Move | Invincible: dealt / startup | Roster median: dealt / startup | Difference |
|---|---|---|---|
| Jab (light) | 42 / 4f | ~26 / 4f | +60 % damage, same speed |
| Straight (heavy) | 72 / 7f | ~53 / 9f | +36 %, **2f faster** |
| Uppercut (up-attack) | 88 / 8f | ~42 / 7f | +110 %, 1f slower |
| Sweep (crouch light) | 52 / 6f | ~26 / 7f | +100 %, 1f faster |
| Flight punch (air) | 66 (→ 92 at top speed) / 5f | ~34 / 5f | +94 % standing, ×2.7 at speed, same speed |

The brief's numbers were implemented exactly, and they are **well above** a "+15–20 %, 1–2 frames faster" reading:
- Damage is +36 % to +110 %.
- Only the Straight and Sweep are actually faster. The Jab and Flight punch match the median startup, and the Uppercut is a frame slower.

The fairness case therefore does not rest on "slightly better normals". It rests on what each hit costs him to throw, below.

## 3. How every strength is punished

| Strength | How it costs him |
|---|---|
| **Invincible Punch**, 60 % of the screen in 10f, 110, wall bounce | Whiffs **overshoot** by a further 90 px and leave **20 recovery frames** (≥ 16 punishable). It is readable: always the same 6f windup and a straight line. |
| **Zip**, 45 % screen in 5f, projectile-intangible 1–4 | **1 charge on the ground**, refilled 40f after landing. 2 per airtime. Not strike-invulnerable: a melee button out-prioritises it. |
| **Flight**, top 51.5 px/f, brake in 8f, snap turn ≤ 6f | **Can't guard above 60 % of top speed.** At the speeds that make his punches hurt, he can't block. Taking off pushes (15) instead of hitting. |
| **Speed-scaled damage** (+40 % at top speed) | Top speed takes about 0.35 s and about 440 px to reach, through open air where he can't block. |
| **Barrage** 6 × 16, launches | The Jab has to land first. The flurry is a mash: blocked, it is 6 blockstun windows to step out of. |
| **No Holding Back** 300 | 1 bar, and the first strike must connect. |
| **Terminal Velocity** 380 / 120 | About 1.6 s of telegraph: he leaves the screen, a star glints, and a **marker both players can see** shows where he will land. A whiff = **50f stuck in the crater**. Gojo's Infinity stops it outright. |

The result: his best damage comes in exactly the states where he is most exposed — airborne, fast, and unable to guard. His
round-ending punishes come off whiffs that are easy to see.

## 4. vs Omni-Man (Viltrumite) — agility vs momentum

| | Invincible | Omni-Man (Viltrumite) |
|---|---|---|
| Health | 748 | 1050 |
| Top flight speed | 51.5 (0.9 × Omni-Man) | 57.2, the fastest |
| Speed changes | reaches top in ≈21f; **brakes in 8f; snap-turns in ≤ 6f** | **drag 0.93, turns slowly at speed: momentum** |
| Guard in flight | below 60 % top speed | below 40 % top speed |

- **Omni-Man is faster in a straight line and hits like a wall.** THINK! carries Mark across the stage into the far wall for 300. Against Mark the bubble reads **"Think, Mark! THINK!"** (`omnimanViltrumData.js` → `THINK.bubbleMark` / `markKeys` include `invincible`).
- **Mark wins on direction changes.** He stops and turns in the time it takes Omni-Man to start bending his arc. Zips through Omni-Man's committed dives. Punishes the overshoot.
- **Omni-Man wins on reads.** He has 302 more HP and the bigger hits, so Mark has to be right several times for each time Omni-Man is right once.
- **Presentation:** the intro bubble vs Omni-Man is "Dad. Stop.", and Can't Stay Down says "I'd still have you, Dad."
- **Intended matchup:** around 45–55, a skill check on both sides.

## 5. vs Satoru Gojo (Shinjuku)

Infinity is the cleanest answer to everything Mark does:
- Melee and his scripted strikes are adjudicated by Gojo's own Infinity gate.
- **Terminal Velocity is stopped by any level of Infinity**, 0 damage. This is stricter than Gojo's general "supers connect at L1", per the brief. Verified live: L1 0, L3 0, Infinity off 380.

Mark's route is the one Gojo's kit already invites:
- Infinity costs cursed energy and has to be toggled. Mark's speed lets him wait it out from range and then be on top of Gojo the moment it drops.
- He is the roster's best Infinity-down punisher, and the worst fighter to keep running into it.

## 6. What to watch in playtests

- **Barrage → Skyward → flight punch → Crash Down: 289 off one Jab.** Already the cheapest route to big damage. If it proves too strong, the knob is the Barrage's last-hit launch height (`kby −14`).
- **Top-speed flight punch, 92.** If flight-punch rushdown dominates, raise `FLIGHT.blockMax` pressure (lower 0.60), or lower `speedDmg` (0.40).
- **Zip cross-up on hit.** It is the main mix-up. If it is too hard to see, add frames before the stop-behind (`ZIP.travel`).
