# Sanji: Balance Notes

## Kit at a glance

| | Sanji | roster reference (Zoro) |
|---|---|---|
| HP | **940** | 1000 |
| Walk / run | 5.9 px/f / 8.6 px/f | 9.5 px/f / 12.1 px/f (owner-tuned to Toji's speed) |
| Jump / air | 33, **Sky Walk ×2** (12 Heat each), launcher follow-jump | 28, one jump |
| Weight | **0.85**: knockback taken ÷0.85 (×1.18) | 1.1 |
| Fastest normal | Collier 6f (45), **+1 on block** | Jab 5f (40) |
| Mid / heavy normals | Épaule 9f (60) · Côtelette 10f (70) · Poitrine 12f (80, launches) | Slash 8f (65) · Heavy 13f (90) |
| Best meterless confirm (measured) | the six Course kicks, **148** HP (needs the exact order to also light the Course) | Falcon string **116** HP |
| Super | PARTY TABLE KICK COURSE, 420 raw (460 lit); **free for 5 s** after a completed Course | ASHURA, 360 raw |
| Ranged | Plate Kick only: 45 damage, 55% of the screen, max 3 | Taka Nami flying slash |

Sanji is a rushdown character with the longest chains in the roster. Every normal is a kick, and any Course
kick cancels into any other on contact. He is lighter and has less HP than Zoro, Zoro out-walks him on the
ground, and Sanji owns the air.

## Why he is not broken

- **No real projectile.** Plate Kick is 45 damage on a low arc, max 3 on screen. Sitting back and zoning him
  works; he has to come to you.
- **940 health and weight 0.85.** He takes 18% more knockback than a weight-1.0 fighter, flies further, and
  juggles easily.
- **Heat only accrues by fighting:**
  - +4 per kick landed, +2 per kick blocked, +8 per Course step.
  - +0.5/s passive, which also stops while the leg is lit.
  - Diable Jambe drains 4 Heat/s and can't be re-lit until the bar has emptied and refilled to 50.
  - The super spends everything and locks Heat gain for 3 s.
- **The Course takes real execution under pressure:**
  - The six cuts must land in order: L, →+L, H, →+H, ←+H, ↘+L.
  - An out-of-order hit drops a step.
  - Three seconds without a landed hit wipes the track.
  - The free super window is 5 s and needs ↓↘→+S.
- **Big moves are punishable:**
  - A whiffed Mouton Shot adds 12 recovery frames (66 total).
  - Anti-Manner is −6 on block.
  - The wake-up crescent is −12.
  - A super whose first cut misses tumbles into 40 frames of recovery, with all Heat already spent.
- **Diable Jambe is a commitment.** The 40-frame spin-up is unprotected. The +25% (+40% for the first 3 s
  when ignited at 100 Heat) costs the bar over 12 s.

## Matchups

### How the numbers were measured

1. **Deterministic checks.** These prove the mechanics and run with the gates:
   - `harness/sanji_buggy_tags.test.mjs` covers the Buggy damageType matchup, with every move measured against
     Buggy and against Zoro at the same spacing.
   - `node harness/sanji_render_check.mjs 11` covers the full kit, the five combos, sound and metadata.
2. **CPU vs CPU spectator runs.** `node harness/buggy_matchup_sim.mjs sanji <opp>` runs the 'adaptive' CPU on
   both sides, 10 matches per side, with sides swapped. **This mostly measures the generic AI**, which has no
   Sanji logic: it never routes the Course, never ignites on purpose and never Sky Walks. So every number is
   read against Zoro's result with the same AI and the same opponent.

| Opponent | Brief target | Sanji CPU rounds won | Zoro CPU baseline | Read |
|---|---|---|---|---|
| Zoro | **5-5** | 76% (35% with the super disabled, see below) | (mirror) | AI super access, not kit strength |
| Buggy | favoured | **100%** | 54% | the tag system: kicks are blunt, so the immunity does nothing |
| Arlong | 6-4 Sanji | 78% | 81% | in line with the Zoro baseline |
| Superman | 4.5-5.5 | 81% | 100% | the flyer CPU loses to everyone; no information |
| Homelander | 4.5-5.5 | 100% | 98% | same |
| Green Arrow | favoured | **59%** | 41% | Sanji beats the drone CPU where Zoro doesn't |

### vs Zoro (target 5-5). The canon rivalry

**What the CPU number really measures.** A profile of 15 CPU rounds
(`aiVsAi.step` sampled every frame) found the 76% has a single source:

- **CPU Sanji uses his super; CPU Zoro never uses his.** The generic AI cast PARTY TABLE KICK COURSE 23 times
  through the Ultimate button, about a quarter of Sanji's damage. It started ASHURA zero times in 414 Zoro actions,
  even with Zoro's Spirit averaging 84.
- **With Sanji's super disabled** (a measurement-only patch, not shipped), the same 20 matches came out
  **35% Sanji**.

So with equal super access, the matchup sits at or a little below even, which is the 5-5 target. The kit
numbers were left unchanged. One candidate tune was measured and dropped: shortening the Anti-Manner crumple
from 58 to 44 frames moved the CPU result from 76% to 73%, which is within noise.

**On paper:**

- **Zoro hits harder per button.** Heavy 90 vs Côtelette 70, Oni Giri 90, and his Santoryu form adds ×1.12.
  He has 60 more HP and a heavier frame (weight 1.1 vs 0.85).
- **Zoro is faster on the ground.** His walk and run were owner-tuned to Toji's speed: 9.5 / 12.1 px/f against
  Sanji's 5.9 / 8.6. The brief's "Sanji is faster" is true **in the air** and in the chains, not on the
  ground.
- **Sanji's edges:**
  - Two Sky Walks plus Concasse give him the air.
  - A +1 Collier keeps pressure.
  - The longest chains: 148 meterless against Zoro's 116.
  - The Course makes his super free.
- **Tuning knobs if playtests drift**, all unspecified by the brief and all currently at their first values:
  - Course-kick hitstun (18–30)
  - the Anti-Manner crumple (58)
  - the launcher follow-jump height (Poitrine 13, knee 22)
  - the super's frozen combo-scale floor (0.5)

### vs Buggy (favoured). The second character to prove the tag system

Buggy's Bara Bara no Mi makes **slash** damage do nothing. Every Sanji normal and kick special is tagged
`blunt`. The burn and the Concasse patch are `energy` (the fire only, never the kick impact), and Plate Kick
is `projectile`. `sanji_buggy_tags.test.mjs` drives each with real input against Buggy and against Zoro at
the same spacing. **Every one does identical damage to both, and Buggy never splits (0 nullified hits):**

| Move | vs Buggy | vs Zoro |
|---|---:|---:|
| Collier / Épaule / Côtelette / Selle / Poitrine / Gigot | 27 / 36 / 42 / 39 / 48 / 30 | same |
| Crouch kick / anti-air knee / Handstand spin | 24 / 45 / 42 | same |
| Mouton Shot / Anti-Manner Kick / Premier Hachis | 66 / 60 / 41 | same |
| Plate Kick (projectile) | 27 | 27 |
| Diable Jambe lit Collier (Overheat ×1.40) / its burn ticks (`energy`) | 37 / 18 | same |

The Arlong build proved the other side of the system: a slash does 0 to Buggy (`arlong_buggy_tags.test.mjs`).
Sanji proves that a fighter built entirely from blunt force ignores the immunity completely. Buggy keeps
his knives and cannon, but his defensive identity has no answer to kicks. That's why the matchup is
favoured, and the CPU numbers agree (100% against Zoro's 54%).

### vs Arlong (6-4 Sanji)

- **Sky Walk and air pressure beat grounded water.** Arlong's zones are grounded, and his buffs (+15% damage,
  +25% speed, swim invulnerability) only apply while *he* stands in water. Sanji fights from above:
  - jump, Sky Walk ×2, Concasse (120, ground bounce, hits OTG);
  - air kick into the launcher follow-jump.
- **Arlong's answer is the anti-air claw** (Rising claw, 150-px-tall hitbox), plus Water Shot, which works
  airborne. A Sanji who Sky Walks predictably gets clawed out of the air, and at weight 0.85 that juggle hurts.
- **The CPU numbers (78% against Zoro's 81%) say "like Zoro"**, because the AI never Sky Walks. The 6-4 rests on
  the air game, which only a human plays.

### vs Superman / Homelander (4.5-5.5)

- They fly freely. Sanji is the one grounded character who can **contest the air**: two Sky Walks per
  airborne sequence, a 22-px/f follow-jump off the anti-air knee, and Concasse to bring the fight down.
- He is fragile: 940 HP against 1150 / 1050, weight 0.85 against flyers with juggle-heavy kits. Losing an air
  exchange costs him more than it costs them.
- CPU flyers lose to everyone (Zoro's baseline is 98–100%), so the sim carries no information here.

### vs Green Arrow (favoured)

- **He closes distance faster than the drones can be deployed.** Mouton Shot travels 45% of the screen at 24
  px/f with hard knockdown. Sky Walk passes over grounded drone fire, and Concasse lands on the archer.
- Plate Kick (projectile) can trade with a drone. His kicks are blunt, so nothing in GA's kit nullifies them.
- The CPU agrees: **59%** for Sanji against Zoro's 41% in the same matchup. The drone CPU beats most of the
  roster, so Sanji being clearly ahead of the baseline matches the target.

## Not changed by this phase

No numbers changed. Every brief value is as written (HP, speeds, Heat gains, all move damage and costs,
super 420/460). The CPU-vs-CPU gap against Zoro was traced to the AI's asymmetric super access, not the kit.
