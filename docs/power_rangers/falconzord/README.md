# Falconzord sorties — shared system (`falconzord.js`)

The Falconzord is a **short scripted assist**, never a fighter: no HP, no hurtbox, never body-blocks, no input, no AI, no homing, no camera changes. Each sortie is a pure data profile (`registerFalconSortie`) in `mmprBlackData.js`; any future owner can register its own profiles and call the same module.
Art ledger: [SPRITE_LEDGER.md](SPRITE_LEDGER.md). Credit: "Sprites ripped by Belial the Hedgehog."

## Resources (per owner, `owner._falcon`, JSON-plain → replay snapshot)
- **2 Sortie pips**, both full at round start. A spent pip refills over **180 simulation frames**; refills are **sequential** (one pip at a time; measured 180 / 360).
- A call costs **1 pip + Morph Energy** (Sweep 12 / Talon 18 / Volley 15), paid at **call start**.
- **60 f global lockout** after any call; **one active sortie per owner**; no call while a call is pending.
- **120 f post-ultimate lock** after Falcon Formation completes; ordinary sorties are retired on ultimate entry.
- Blink, Pincer and round time never restore pips or shorten timers.

## The commit boundary
`bCall` startup is 12 f. **Frames 1-12 = vulnerable call**: if the owner is hit, grabbed, KO'd or reset before frame 12, the call is cancelled (`cancels++`), **no sortie appears and the pip + Energy stay spent** (measured). **Frame 12 = COMMIT** (`falconCommit`): direction, path origin and the target region are captured once. After commit the bird completes its pass even if Black is hit; only round end, training reset, ultimate entry or owner replacement retire it. Black's call recovery (frames 13-26) may be cancelled into one fresh grounded Light or Heavy.

## Sorties (ages count from commit; "from press" = measured in harness/mmpr_black.test.mjs at the tested spacing)
| | Falcon Sweep (Fwd+Special) | Talon Lift (Up+Special) | Covering Volley (Back+Special) |
|---|---|---|---|
| Cost | 12 Energy + 1 pip | 18 Energy + 1 pip | 15 Energy + 1 pip |
| Origin | behind Black, lane 52 px above his feet | the target region captured at commit | behind/above Black, hover point 110 px behind, 190 px up |
| Warning | owner-coloured dashed lane + arrow, ages 0-13 (fades out ages 10-13) | owner-coloured reticle on the target region, ages 0-11 | reticle on the target region, ages 0-13 |
| Entry | age 0-10 approach dive | age 0-8 drop from above | age 0-10 approach to hover |
| Active | ONE mid contact, ages 10-40 along the lane (64×40 box), raw 38, hitstun 22, blockstun 14 | contact 1 ages 12-17 raw 18 (hitstun 24); contact 2 ages 19-23 raw 30, **launch** (vy −22, once per combo) | two energy shots fired at ages 12 and 27 (15 f apart), raw 20 each, speed 13, aimed at the region captured at commit |
| On block | ordinary block, 12 % chip, blockstun 14, combo reset | 12 % chip, blockstun 12 / 14 | ordinary projectile block (each shot separately; spacing > blockstun so a held guard catches both) |
| Range | the full lane: 170 px behind to 560 px ahead of the commit point | the captured region only | straight line to the captured region; shots expire after 70 f |
| Exit | banks out ages 40-56 | climbs out ages 18-42 | turns away ages 37-51 |
| Measured (from press) | commit 12 · contact 35 (gap 180) · exit 68 | commit 12 · contacts 26 / 32 · exit 54 | commit 12 · shots land 49 / 64 (gap 260) · exit 63 |
| Failure | owner hit before f12 → no sortie, resources spent | same | same; unfired shots vanish on retire |

Hit rules: per-target, per-contact hit tracking (a contact can never hit the same target twice); damage through `combat.applyScaledDamage` with the owner's combo scaling, hitstun scaling, juggle count and 6 f hitstop; one assist launcher per combo; no recursion (profiles cannot call sorties); mirrors are independent (state lives on each owner).
