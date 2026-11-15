# Violet Parr — balance notes

**Zoner / Trickster · difficulty 3 · "Now you see me."**

All numbers below are measured, not just authored. Each one comes from the real game driven by real input:
`harness/violet_moveset.test.mjs`, `violet_combos.test.mjs` and `violet_defense.test.mjs`.

## Profile

### Health and movement

| | Violet | Roster context |
|---|---|---|
| Health | **900** | Spider-Man 1080 · Homelander 1050 · Ghostface 950 |
| Walk / run | 5.4 / 8.0 px/f | Speed stat 81.6 is one of the slowest; Spider-Man 96, Homelander 99, Ghostface 97 |
| Weight | 0.8 | Knockback she takes ÷ 0.8, so she gets carried further |

### Force Field energy

- Maximum 100.
- Recharges 5 per second.
- +4 when her hit lands, +3 when she takes a hit.
- No recharge while she is invisible.

### Fastest normal

| Move | Startup | Damage | On block |
|---|---|---|---|
| Jab | 5f | 18 | 0 |
| Heavy | 13f | 52 | −6 |
| Low | 7f | 24 | −4 |
| Launcher | 11f | 46 | −9 |

### Best routes

These use 85% scaling per hit.

| Route | Damage |
|---|---|
| Jab, Jab, Launcher, Air | 84 |
| Low, Heavy, Force Push | 104 |
| Field Trap, Heavy, Launcher, Force Ball | 130 (needs 37 bar) |
| Ambush route | 104 |

FULL FORCE deals 220 unscaled for a full bar.

## vs Spider-Man (1080 HP, rushdown / acrobat / zoner)

**Where Violet wins.**
- Spider-Man's web shots are ordinary projectiles (15 px/f, 60 damage). Bubble Shield sends them back at 1.2× speed as Violet's own projectile.
- Force Ball rolls through them, armoured.
- A Spider-Man who zones with webs feeds her Force Field: +3 on every hit she takes, and reflected webs land as her hits.
- Field Trap punishes his landing spots. His swing and zip traversal still has to come down, and the trap marks the ground target 18 frames ahead.

**Where Violet loses.**
- Spider-Sense is a buffered evade with a ×1.3 counter, so Violet's slow committed specials are what it is built to punish. Examples: the 13f Heavy, the 10f Force Push startup, and the 90f FULL FORCE lockout.
- He also has 180 more health and is much faster. She cannot chase him.

**How to play it.**
- Shield his webs and push from range. Do not throw FULL FORCE raw.
- Open with a Vanish ambush only when Spider-Sense is spent.

**Verdict:** even to slightly unfavourable.

## vs Homelander (1050 HP, flight / melee, speed 99)

**Where Violet loses.** This is her hardest matchup, and part of the reason is an engine fact worth stating plainly.
- Homelander's Heat Vision is a hitscan beam. It applies damage directly, not through the projectile list.
- So Bubble Shield **does not reflect or stop it**. The dome stops melee strikes and projectiles only.
- He auto-aims the beam at her, and flight keeps him above most of her ground kit. Force Push travels horizontally, and Field Trap aims at his position when she casts it.

**Where Violet wins.**
- Vanish takes away his auto-turn. While she is invisible he keeps his last facing, so she can walk behind him for the +20% ambush.
- Field Trap still catches him when he lands or hovers low, and it leads straight into Heavy, Launcher, Force Ball.
- Protective Instinct buys one free dome at low health against his melee follow-ups.

**Verdict:** unfavourable. That is deliberate. A grounded zoner should struggle against a flying hitscan laser character, and she keeps tools to steal rounds.

## vs Ghostface (950 HP, rushdown / technical)

**Ghostface's plan.** He has to come to her:
- Gutting Lunge (a dashing knife gap-closer that bleeds)
- Low Gut (a low sweep)
- Backstage Pass (teleport behind and strike)

**Where Violet wins.**
- The lunge and Low Gut are strikes, so the 40f dome eats them.
- Phase Step's i-frames on frames 3–12 dodge a read lunge and leave her outside his range.
- Jab at 0 on block lets her hold her ground.
- His health (950) is close to hers, so the trap route (130) and the FULL FORCE punish decide rounds.

**Where Violet loses.**
- Backstage Pass puts him behind her, and grabs go through the dome.
- Her six-second Shield cooldown is long. Once it is spent, his pressure is real.

**Verdict:** even to slightly favourable for Violet.

## Why she is not broken

1. **Low health and slow.** She has 900 health, walks at 5.4 px/f and has weight 0.8. Every touch she takes hurts and pushes her far.

2. **Nothing she has loops.**
   - Jab into Jab chains only once.
   - Everything else cancels strictly upward: Jab or Low, then Heavy, then Launcher, then specials.
   - Scaling is 85% per hit.
   - Field Trap does no damage, and one trap is allowed at a time. Her next hit releases it, so it cannot trap, release and re-trap.
   - Force Push allows one ring on screen.

3. **Every strong tool costs resources.**

   | Tool | Cost | Cooldown | Lockout |
   |---|---|---|---|
   | Bubble Shield | 20 | 6 s | |
   | Vanish | 15 | 8 s | |
   | Phase Step | | 5 s | |
   | FULL FORCE | 100 | | 90f, even on a whiff |

   - Vanish also drains 6 per second and lasts at most 6 seconds.
   - Force Field recharges only 5 per second, and not at all while she is invisible.

4. **The ambush is bounded.** Vanish's +20% applies to one hit only, then Vanish ends. Taking any hit ends it too.
   - The opponent's auto-turn freeze is the only information denial. His own walking still turns him.
   - Her own push and ball hits still give her position away.

5. **The big damage is telegraphed or committed.**
   - Field Trap shows an 18-frame telegraph circle on the target spot. Stepping off it beats the trap; the test asserts this.
   - FULL FORCE has 12f of startup, is grounded only, and has a 90f lockout.
   - The 220 is unscaled, but it is her only true burst and it costs a full bar.

6. **Clear counters exist.**
   - Grabs beat the dome.
   - Hitscan beams and kit damage that does not go through the strike or projectile path are not stopped by the dome.
   - Fast rushdown punishes −6 to −9 on block.
   - Flyers stay above her ground specials.

## Data-only tuning levers

All of these are in `violetData.js`. Values come from the brief unless noted.

| Area | Fields |
|---|---|
| Moves | `MOVES` |
| Payloads | `PUSH`, `BALL`, `TRAP`, `ULT` |
| Vanish | `VANISH` |
| Defense | `DEFENSE` (cooldowns, i-frames, Instinct threshold) |
| Energy | `ENERGY` |

**Not in the brief, and the first to tune if she over-performs:**
- the Launcher's jump-cancel hop velocity (`jcVy`)
- the Launcher's launch velocity (`launchVy`)
