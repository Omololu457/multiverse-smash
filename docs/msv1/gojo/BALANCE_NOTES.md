# Satoru Gojo (Shinjuku Arc) — BALANCE NOTES

The rule for this Gojo: **Infinity is never free.** Every point of protection is paid for out of one resource, CE,
and that same CE pays for every technique. So whenever he is untouchable, he is also running out of ways to hurt you.

## Stats
| | gojo_shinjuku | old gojo | sukuna | toji |
|---|---:|---:|---:|---:|
| HP | 1160 | 1160 | 1240 | 1050 |
| Speed | 94 | 87 | 86 | 98 |
| Super bars | 3 (300) | 3 | 3 | 3 |

He matches the old Gojo's HP (1160) and is a little faster. With the user's mobility request (teleport, long blink),
speed is not where his power comes from.

## The CE economy (0–100)
- Starts at 60. Regenerates **6 CE/s, only while Infinity is off**. +4 per clean hit, +10 per Black Flash.
- Hold P (charge) = +12 CE/s **and** fills the super bars, but he is standing still and open the whole time.
- Infinity drain per second: **L1 5 · L2 9 · L3 22**. Each stopped hit also costs a share of its damage
  (6 % / 4 % / 3 %).
  - L3 from full CE lasts about 4.5 s with nothing hitting him.
  - L1 lasts about 20 s.
- 0 CE → Infinity drops and is **depleted-locked for 2 s**.
- Technique costs: Lapse 15, Max Blue 35, Blue Step 10, Blue Fist 8, Red 15, Delayed Red 18, Red Rush 20, FBE 15.
  Hollow Purple is 1 bar + 40 CE. 200 % Purple is 2 bars + 70 CE. Unlimited Void is 1 bar + 50 CE.

## Counterplay (measured in harness/gojo_shinjuku_interactions.test.mjs and gojo_shinjuku_supers.mjs)
- **Supers**: Infinity L1 does *not* stop supers. L2 halves them. Only L3 stops them, and L3 drains 22 CE/s, so
  baiting L3 and then waiting it out is the answer. See SUPERS.md for the per-character sweep.
- **Domains**: any opponent domain forces Infinity off (L3 included), sure-hit. Malevolent Shrine and the old Gojo's
  Unlimited Void were tested. Answer a domain with your own: the **domain clash** is a 1.5 s mash
  (score = presses + 0.1 × CE). The winner's domain lands for 1 s, then **both** burn out. A non-Gojo loser loses
  specials and ultimates for 5 s.
- **Burnout** (5 s after his domain ends): no techniques and no Infinity. That is the punish window. His one way out
  is Brain Reset (hold RCT 1.5 s, 40 CE), which keeps him standing still.
- **Grabs fail on Infinity**, but the CE tax still applies to everything else. Pressure that never stops (clones,
  drones, fire patches, webs, multi-hits) burns 6 % per stopped hit and blocks his CE regen.
- **Mahoraga**: after 3 wheel turns, it ignores Infinity (canon).
- **Another Gojo's** Blue / Red / Purple go straight through Infinity.

## Damage
- Best non-meter routes: Palm > Blue Fist 192, Blue Fist > Red Rush 226 (COMBOS.md). The old Gojo's best
  non-meter routes are in the same range.
- One-bar ender: string > Hollow Purple 353. Purple alone is 300 raw, 40 % chip, guard break. Its 76-frame release
  makes it a combo ender or a read; on its own it can be seen coming from anywhere.
- 200 % Purple (230 → 460) costs 2 bars + 70 CE plus three timed presses, and any hit cancels it with the CE lost.
  It is a hard read or a punish on a frozen foe, never a combo ender.
- Unlimited Void: 15 s freeze. A free combo, but it costs 50 CE, then 5 s of burnout and a 30 s cooldown.

## Mobility (user request)
- Teleport (double-tap toward the foe): 48 f cooldown, 10 f attack lock on arrival, so he can't use it as an
  instant-frame mixup.
- Long Blink (double-tap away): 40 % of the screen; 2 f startup, 5 f invulnerable travel, 8 f recovery; 30 f cooldown.
  A defensive reset, not a mixup.

## CPU
Infinity reaction by difficulty (frames): easy 30, normal 16, hard 9, impossible 5. It only reads what the player can
see (a super start, a projectile on screen), never hidden state. How often it uses techniques (frames between
decisions): easy 140, normal 80, hard 50, impossible 34. No RNG; the choice comes from the sim clock.

## Things to watch in play
- L1 is cheap (5 CE/s), and it stops all normals and projectiles that are not supers. Against zoners with no super
  pressure this could feel oppressive. If it does, raise the L1 tax first (6 % → 8 %), before the drain.
- Lapse > Red Rush (125) is a true combo from full screen. If that turns out to be too safe, Lapse recovery is the
  thing to tune.
