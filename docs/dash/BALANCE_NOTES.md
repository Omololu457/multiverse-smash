# Dash Parr — Balance Notes

**Dash** (`dash_parr`, universe `the_incredibles` (same group as Elastigirl)) · difficulty 4 · Speedster / Rushdown · *"Ready, set, already gone."*

## Numbers (all measured by `harness/dash_parr.test.mjs`, not just declared)

| | Value |
|---|---|
| Health | 860 (lowest band in the roster; Spider-Man 1080, Superman/Batman 1150) |
| Walk / Run | 6.4 / 11.0 px/f (re-applied each tick, Sprint ×1.1, Blur ×1.2) |
| Jump / weight | 12.5 / 0.7 (light: launches higher, combos on him carry further) |
| Energy | 100 "Super Speed", +4/s, +4 per hit landed, +3 per hit taken |

| Move | Input | Startup | Damage | On block | Cost |
|---|---|---|---|---|---|
| Jab | Light | 4 | 14 | +1 | — |
| Heavy | Heavy | 10 | 40 | −4 | — |
| Low | ↓+Light | 6 | 20 | −3 | — |
| Launcher | ↑+Heavy | 10 | 38 | −8 | — |
| Air | air Light | 6 | 24 | +2 | — |
| Flurry | ↓↘→+P | 8 | 8×7 = 56 | −6 | 15 |
| Blur Dash | →→+P | 8 | 44, 400 px pass-through cross-up | −10 | 10 |
| Laps | ↓↓+P | — | 4×16 = 64, ends behind, +20 Momentum | −8 | 20 |
| Hydroplane | ←↙↓+P | 17 | 36, low-profile f10–30 | −8 | 12 |
| INCREDI-RUSH | ↓↘→↓↘→+P | 10 | 12 hits = 200 unscaled over 3 s, 90 f recovery | — | 100 |

(All damage is the engine's displayed figure after the global ×0.60 scale; the raw `damage` in data is `ceil(v/0.6)`.)

## Combos (85 % per hit, 90 f reset)

| Route | Brief target | Measured | Ratio |
|---|---|---|---|
| Jab, Jab, Heavy, Blur Dash | ≈ 97 | 82 | 0.85 |
| Low, Launcher, Air, Flurry | ≈ 112 | 92 | 0.82 |
| Laps, Jab, Heavy, Flurry | ≈ 147 | 152 | 1.03 |

All three are inside the ±20 % tolerance. The first two land low because strict 0.85-per-hit scaling makes the
last hit of a four-hit string worth ~61 %; the brief's targets look like they assumed a gentler curve. I didn't
retune to hit the targets exactly, because that would mean bending the spec'd 85 % rule. At Blur tier the next special
is free and Momentum resets (tested).

## vs Spider-Man (1080 HP, web traversal, Spider-Sense)

Spider-Man is the closest mirror: also fast and air-mobile, with more health. Spider-Sense's buffered dodge-counter
answers Blur Dash if he reads it, and Web Zip outruns Dash in the air (Dash has one jump, no air dash). Dash's edge is
on the ground. Hydroplane goes under web shots during f10–30, Laps beats his guess-the-side defence by ending behind
him, and Sidestep i-frames 2–10 beat webbing. Expected result: Spider-Man slightly favoured at range, Dash favoured
once he gets in and keeps Momentum. Roughly even.

## vs Superman (1150 HP, flight, heat vision)

Superman hits hard and flies, so Dash can't follow him into the air. Dash's 860 HP means a couple of Superman's big
punishes take a third of his life. Dash's plan: stay grounded, sprint under flight, and punish landings with
Blur Dash's cross-up. Can't Catch Me (−30 % on the first hit taken at Sprint+) softens the first punish but resets
Momentum. Superman favoured (about 6–4). That suits the fantasy: a kid speedster against the strongest man alive.

## Family / Incredibles matchups

### vs Elastigirl (on `main`, 980 HP, Footsies / Grappler, `the_incredibles`)

Her Long Arm (380 px, 14 f) and her 120–210 px normals win the mid-range footsies Dash can't contest. His plan is to
deny that range instead of fighting at it:
- Sprint in with Hydroplane. Its low profile at f10–30 slides under her standing pokes.
- Use Blur Dash's 400 px pass-through to cross her up. Her slow, single-jump body has trouble turning to answer it.
- Once he's in, his 4 f Jab beats her 6 f Jab, and +1 / +2 pressure keeps her guessing.

Her Stretch Guard parry (6 f window) beats a predictable Flurry, and a whiffed Blur Dash (−10) gets Long-Armed.
Expected result: about even (5 : 5). She wins at range, he wins up close. That fits the family theme.

### vs Mr. Incredible / Frozone / Syndrome / Violet

None of these are on `main` yet: they exist only as other sessions' uncommitted work, or not at all. Design intent:
- **Mr. Incredible:** a grappler should punish Dash's −8/−10 specials hard. Dash must stay on +1 Jab / +2 Air
  pressure and never throw Blur Dash raw.
- **Frozone:** ice slides out-range Dash. Hydroplane's low profile is his tool against them.
- **Syndrome:** zoning through drones. Blur Dash's pass-through and Laps' end-behind are the ways in.

## Why he isn't broken

1. **Glass cannon:** 860 HP and weight 0.7, so he dies to about two full routes from heavy hitters.
2. **Momentum is fragile:** taking a hit, blocking, or standing still for 30 f zeroes it. Blur is earned by running,
   lost in one touch, and spent on the first free special.
3. **Specials are unsafe:** Flurry −6, Blur Dash −10, Laps −8, Hydroplane −8. Only Jab (+1) and Air (+2) are plus.
4. **Burst is gated:** Incredi-Rush needs the full 100-energy bar and has 90 f of recovery. Panic Run is once per
   round, needs 3+ hits taken first, and costs 40. Sidestep has a 4 s cooldown.
5. **Damage is fair:** his best measured route (152) needs Laps (20 energy) as the opener, and the 85 % scaling caps
   longer strings.
6. **Deterministic:** no Math.random or gameRng. Rush positions come from `hashRandom(matchSeed, clock, slot)`, so
   replays and LAN agree (`harness/dash_parr_determinism.mjs`).
