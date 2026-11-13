# Arlong: Balance Notes

## Kit at a glance

| | Arlong | roster reference (Zoro) |
|---|---|---|
| HP | **1120** | 1000 |
| Walk / dash | 4.4 px/f, 13 dash (dry) · 5.5 px/f, invulnerable swim (in his water) | 98 speed, 22 dash |
| Jump | 25, weight 1.3 (knockback taken ÷1.3) | 28, weight 1.1 |
| Fastest normal | Jab 6f (45) | Jab 5f (40) |
| Mid / heavy normals | Straight 9f (70) · Kiribachi swing 13f (90) · Heavy arc 16f (110) | Slash 8f (65) · Heavy 13f (90) |
| Best meterless confirm (measured) | Saw string **141** HP | Falcon string **116** HP |
| Super | ARLONG PARK 360 raw | ASHURA 360 raw |
| Hurtbox | **+20 wide / +16 tall** vs the roster standard | standard |

Every move is 1 frame slower than Zoro's equivalent and does 10–20% more damage. He has 12% more HP and is
much slower on dry land. That is the intended trade: a heavy bruiser who wants to bring the fight into his
water.

## Why he is not broken

- **Slow out of water.** 4.4 walk is the roster floor. His dash is the shortest and his jump is low and heavy.
  He has to *earn* his water with a special, or he plays the whole round at Zoro's pace minus 20 speed.
- **Zones are limited.** Each zone lasts 8 s, there are at most 3 on screen, a merged pool caps at 30% of the
  screen, and they are grounded. The +15% damage / +25% speed / swim invulnerability only apply while *he*
  stands in one.
- **Teeth are a resource.** Three teeth. Each bite spends one and they regrow at one per 4 s. At 0 teeth the
  Bite and Shark On Tooth become 40-damage headbutts. The only refill is landing Shark On Darts, which is
  his most punishable move.
- **Big moves are punishable on whiff.** Shark On Darts has 40 recovery frames and ends far away. Seiken is
  26f of recovery, Tidal Sweep −10, the Heavy arc −8, the wake-up reversal −12. ARLONG PARK costs a full bar
  and locks Tide gain for 3 s afterwards.
- **Big hurtbox.** His hurtbox is 20 px wider and 16 px taller than standard, so everything reaches him and
  every combo route works on him.
- **Fishman durability is small and targeted.** Only single hits above 100 (nominal) are affected, and those
  lose at most 12. Normal combos aren't touched at all.
- **No reflect, no parry, no air mobility.** Water Shot and the Rising claw are his only answers to the air.

## Matchups

### How the numbers were measured

1. **Deterministic checks** prove the mechanics and run with the other gates:
   - `harness/arlong_buggy_tags.test.mjs` for the Buggy damageType matchup.
   - `node harness/arlong_render_check.mjs 11` for the full kit.
2. **CPU vs CPU spectator runs**: `node harness/buggy_matchup_sim.mjs arlong <opp>`. The 'adaptive' CPU plays
   both sides, 10 matches per side, sides swapped. **These mostly measure the generic AI**, which has no Arlong
   logic: it never plays motion inputs, never throws the blade on purpose, and doesn't seek his water. So each
   number is compared against Zoro (same AI, same opponent) as a baseline.

| Opponent | Target | Arlong CPU rounds won | Zoro CPU baseline | Read |
|---|---|---|---|---|
| Buggy | **even** (with the blade-throw counterplay) | 20–25% | 55% | The AI swings the Kiribachi into the immunity. See below. |
| Zoro | 5-5 | 30% (16% before the neutral-Special fix below) | (mirror) | AI quality; on paper even, see below |
| Superman | 4-6 | 100% | 98% | the flyer CPU loses to everyone; no information |
| Homelander | 4-6 | 100% | 98% | same |
| Green Arrow | favoured | 20% | 24% | the GA CPU beats everyone; Arlong = Zoro |

### vs Buggy (target: roughly EVEN). The matchup that proves the tag system works

Every Kiribachi move is tagged `slash`: the swing, the Heavy arc, the Low saw, the Air saw, the Wake-up
reversal, the Bite, Shark On Tooth, Tidal Sweep, the thrown and recalled blade, and the Super's finisher.
Against Buggy's Bara Bara no Mi immunity every one of them does **zero**.
`arlong_buggy_tags.test.mjs` measured exactly 0 on all six it drives.

The counterplay is to **throw the Kiribachi away on purpose**. Kiribachi Throw (↓↘→+H) does 0 to Buggy, but
the blade plants. While it is planted, every blade normal becomes its Fishman Karate replacement, tagged
`blunt`. Measured on Buggy with the blade planted:
- Karate swing: 46.
- Karate arc: 56.
- Karate Tidal Sweep: 40.

Fishman Karate (Jab 27, Straight 42) and the water moves (Darts 81 blunt, Seiken 69 blunt, Water Shot 30
projectile) were never slash and always hit him.

So against Buggy, Arlong plays a different character:
- Fast karate (2 frames faster, ×0.85 damage).
- His four blunt and projectile specials.
- No Bite. The bite is a slash: his teeth do nothing to a body that comes apart.
- No Kiribachi pressure.

Buggy's knives and cannonballs hit Arlong normally. That gives roughly **even**, *if the Arlong player knows the
matchup*. A player who keeps swinging the saw loses badly, and that is what the 20–25% CPU number shows.

### vs Zoro (target 5-5)

This is a sword mirror. Arlong is slower but hits harder and controls the ground with water.
- **On paper even.** Zoro is 1 frame faster on every button and much faster on his feet (98 speed, 22 dash
  vs 78 and 13). Arlong has 12% more HP, does about 10–20% more per hit, and his best meterless confirm is
  141 vs 116.
- **In his water** the speed gap closes (×1.25), he hits +15% harder, and his dash becomes an 8-frame invulnerable swim.
- **Zoro's slash isn't special against Arlong.** Both are ordinary damage, so neither side has a tag
  advantage.
- **The CPU number (30%) reflects the AI, not the frame data.** The generic CPU uses the slower 13f swing as
  its neutral heavy and never builds water. Before this phase, the CPU's plain Special mapped to the
  short-range Shark On Tooth even at full screen and wasted Tide. Fixing that (below) moved the CPU from 16%
  to 30% without touching a single damage or frame number. 5-5 is the target for human play.

### vs Superman / Homelander (target 4-6 against Arlong)

These are bad for him.
- **His water zones are grounded.** A flyer never stands in them, so he never gets the opposing slide.
- **His air coverage is poor.** No air mobility beyond one heavy jump.
- **His answers are Water Shot and the Rising claw.** Water Shot (12 Tide, 640 px) also works airborne.
  The Rising claw is an anti-air launcher with a 150-px-tall hitbox.

The CPU data (100%) carries no information: the flying CPU loses to every grounded character (Zoro 98%). The
4-6 comes from the kit.

### vs Green Arrow (target: Arlong favoured)

- **Shark On Darts closes the gap.** It covers 65% of the screen in 26 frames. It isn't invulnerable,
  so it has to be timed between arrows and drone shots.
- **Durability blunts the big hits.** Fishman durability shaves 12 off Green Arrow's single hits above 100,
  and the HP lead outlasts the arrow chip.
- **The CPU number (20%) matches Zoro's (24%).** The Green Arrow CPU beats nearly the whole roster, so the
  spectator data can't confirm "favoured" either way. The favoured call rests on Darts and HP.

## Changes made in this phase

- **Neutral Special is context-sensitive.** Within 260 px (centre to centre) it is Shark On Tooth, as
  before. Beyond that it is Water Shot. A plain Special press at range no longer throws a whiffing lunge
  bite. No damage, frame or cost value changed. The motion inputs (↓↘→+A for Tooth, ↓↙←+H for Water Shot)
  are unchanged. Move List text updated.
