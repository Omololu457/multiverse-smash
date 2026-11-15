# Elastigirl — balance notes

**Elastigirl (Helen Parr)** · universe **The Incredibles** · archetype **Footsies / Grappler** · difficulty **3 / 5**

> "Leave the saving the world to the men? I don't think so."

Every number below was **measured in the real game** by `harness/elastigirl.test.mjs` (results in
`docs/elastigirl/test_results.json`), unless it is marked as a stat.

- **Stored vs dealt damage.** "Stored" damage is the authored per-hit value. "Dealt" is what comes off the health bar,
  after the engine's shared `GLOBAL_DAMAGE_SCALE` (×0.6) and its combo curve.
- **Comparison stats.** Spider-Man and Superman stats come from the live roster
  (`harness/elastigirl_balance_probe.mjs`).

## Where she sits in the roster

| | Elastigirl | Roster (141 fighters) |
|---|---|---|
| Health | **980** | median 1150 (range 920–1400): **bottom tier** |
| Speed stat | **80** (walk 5.0 px/f) | median 92 |
| Jumps | **2** (double jump) | most fighters have 2 |
| Energy | Elasticity 100: 5/s, +4 on hit landed, +3 on hit taken | — |

### Mapping the brief's movement numbers onto the engine

The engine has its own movement scales, so the brief's numbers are translated:

- **walkSpeed 5.0 → `speed 80`.** The physics walk formula, `clamp(4.5 + (speed − 78) / 20 × 5, 4.5, 9.5)`, gives
  exactly 5.0 px/f.
- **runSpeed 7.6 → `dashSpeed 14`.** The engine's run is `clamp(dashSpeed × 0.55, 8, 16)`. Since 7.6 is below the
  shared 8 px/f floor, she runs at 8, the slowest legal run.
- **jumpForce 11.5 → `jumpPower 25`.** Spec units ×2.2 match the engine's launch-velocity scale (gravity 0.85).
- **weight 0.95** is used as-is.

## Her tools at a glance (measured)

| Move | Startup | Reach | Stored dmg | On block |
|---|---|---|---|---|
| Stretch Jab | 6 f | 120 px | 20 | 0 |
| Elastic Haymaker | 14 f | 200 px | 54 | −5 |
| Stretch Sweep (low) | 8 f | 210 px | 28 | −4 |
| Rising Reach (launcher) | 12 f | 140 px | 48 | −9 |
| Diving Stretch (air) | 7 f | — | 30 | +2 |
| Long Arm | 14 f | 380 px | 40 | −16 (+18 on hit, after the pull) |
| Whirl Kick | 8 f | 100 px | 22 / 22 / 28 | −8 |
| Parachute Drop | 24 f | — | 70 (overhead) | −6 |
| Overhead Whip | 18 f | 300 px | 60 (overhead) | −10 |
| Family Raft | 24 f windup | — | 40 / 40 / 50 / 90 | about −100 (100 f lockout) |

**Combos** (real inputs; dealt / stored scale, with deviation from the brief's target):

| Route | Dealt | Stored scale | Brief | Deviation |
|---|---|---|---|---|
| Jab, Jab, Heavy, Long Arm | 73 | 122 | ≈106 | +15 % |
| Low, Launcher, Air, Whirl | 81 | 135 | ≈125 | +8 % |
| Long Arm, Heavy, Whip | 89 | 148 | ≈133 | +11 % |
| Launcher, Slingshot, Air, Parachute slam | 74 | 123 | — | — |

All four routes sit inside the brief's ±20 % band for the engine curve.

## vs Spider-Man — roughly even (5 : 5)

**Stat comparison:**

| | Spider-Man | Elastigirl |
|---|---|---|
| Health | 1080 | 980 |
| Speed stat | 96 | 80 |
| Dash speed | 18 | 14 |
| Jumps | 2 | 2 |
| Jab | 4 f, 40 stored | 6 f, 20 stored |
| Heavy | 8 f, 72 stored | 14 f, 54 stored |

**Air mobility.** He can web-swing twice per airtime, while her Slingshot is once per airtime with a 2 s cooldown. He
wins the air and every scramble.

**Where she wins.** At mid range, every one of her grounded normals out-reaches his (120–210 px). The Long Arm
(380 px, +18 on hit) punishes him for walking or landing in front of her. Whirl Kick's frames 3–9 upper-body
intangibility beats his high pokes and webs at head height.

**Where she loses.** His webs are projectiles, and Rubber Body does nothing against them. Once he is inside her
limbs, his 4 f jab outpaces her 6 f jab, and her slow body can't run away from him. A whiffed Long Arm or Heavy
leaves a hittable limb out for him to swing in on.

**Net:** whoever controls the distance wins.

## vs Superman — unfavourable (4 : 6)

**Stat comparison:**

| | Superman | Elastigirl |
|---|---|---|
| Health | 1150 | 980 |
| Attack / defense | 95 / 92 | 82 / 80 |
| Speed stat | 99 | 80 |
| Dash speed | 30 | 14 |
| Jab | 4 f, 45 stored | 6 f, 20 stored |

**Flight.** Superman flies, so her ground-plane footsies don't threaten him in the air. The Long Arm and the Whip only
reach horizontally, and her only anti-air is a 12 f launcher. Heat Vision is a beam, which Rubber Body exempts.

**Her tools in this matchup:**
- Whirl Kick's upper-body intangibility goes through head-height beams.
- The Overhead Whip and Parachute Drop are overheads that a grounded, guarding Superman has to respect.
- Stretch Guard can parry his melee strings: +10 Elasticity and a free Long Arm.

**His edge:** much higher raw damage and toughness (bigger health bar, stronger defense).

**Net:** she needs to land her reads; he only needs to stay airborne.

## vs Violet — not applicable

Violet is **not on the roster** (`characters.violet` does not exist). She appears only as a sprite-only passenger in
the Family Raft frames, with no hitbox, health or input. There is no matchup to assess.

## Why she isn't broken

1. **Her reach is also her weakness.** While a long normal is active, the hurtbox is the union of body and limb (the
   P4 tests check that the hurtbox reaches the full 120 / 200 / 210 / 300 / 380 px). A whiffed or blocked Long Arm
   leaves the arm out and hittable through a 35 f recovery, at −16 on block.
2. **She is fragile and slow.** Bottom-tier health (980 vs a 1150 median), the slowest legal run (8 px/f),
   and a 14 f Heavy. All her grounded normals are 0 or minus on block; only the air normal is plus (+2).
3. **Her passive is narrow.** Rubber Body only reduces melee normals, by 15 %. Specials, ultimates, projectiles,
   beams, elemental hits and guard chip all do full damage (P3 tests).
4. **Her meter is metered.** Specials cost 12–18 Elasticity against 5/s regen, so pure regen funds a Long Arm about
   every 2.4 s. The ultimate costs the full 100 bar.
5. **Her mobility is capped.** The Slingshot is once per airtime, has a 2 s cooldown, costs 12 and has no hitbox
   (P3/P5 tests).
6. **Her defensive tools are on cooldowns.**
   - Stretch Guard: a 6 f window, a 6 s cooldown, and 15 f of whiff recovery.
   - Bounce Back: i-frames on frames 4–12 only, with a 5 s cooldown.
7. **The ultimate is a commitment.** Family Raft deals 220 stored (120 dealt in the test after the curve). But it
   locks her out for 100 f afterwards, so a blocked or whiffed Raft is about −100.
8. **Her combo damage is on target.** Her best routes deal 73–89, within ±20 % of the brief's targets on the engine
   curve. The combo-standard audit is unchanged from main.
9. **She touches no one else's frame data.** The frame-data diff is zero for every other character (1546 blocks).
   Every hook is gated on `rosterKey === 'elastigirl'`.

## Tuning levers (if live play shows a problem)

| Problem | Lever |
|---|---|
| Too strong at range | Long Arm cost (12) or its whiff recovery (`eLongWhiff` 35 f) |
| Too strong up close | Jab on block (0 → −2) |
| Too weak | `walkSpeed` (`speed` 80 → 84 gives 6.0 px/f) or health (980 → 1020) |

All of these levers are in `elastigirlData.js`.
