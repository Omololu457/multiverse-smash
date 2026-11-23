# Invincible (Mark Grayson) — Combos

All four of the brief's combos are **verified live**: real key presses drive the real engine in a browser. The check is
`node harness/invincible.test.mjs --only=combos`, and its output is in `test_results.json` → `report.combos`.

- **Dummy:** the default harness dummy (Homelander, 1050 HP, standing, not blocking).
- **"Dealt"** is the HP taken off over the whole sequence, after the engine's combo scaling.
- **"Free frames"** counts frames between the first and last hit where the dummy was on the ground, not in hitstun and not knocked down — frames where it could have acted.

Input notation: `L` Light · `H` Heavy · `S` Special · `U` Up-Attack · `Ult` Ultimate · `C` Charge (tap = take off / come down) · `→→` double-tap = ZIP. Directions are facing-relative.

| # | Combo | Inputs | Hits | Dealt | Free frames |
|---|-------|--------|-----:|------:|------------:|
| 1 | Jab → Barrage (launch) → Skyward → flight punch → Crash Down OTG | `L`, mash `L` → `→↓↘ S` → (in flight) `L` → `↓ S` | 10 | 289 | 0 |
| 2 | Straight → Zip cross-up → Uppercut → Invincible Punch (wall bounce) → No Holding Back | `H` → (hit) `→→` → `U` → `↓↘→ S` → `↓↓ S` | 9 | 545 | 0 |
| 3 | Top-speed flight punch → snap turn → flight punch → Zip → Invincible Punch | `C`, hold `→` → (top speed) `L` → hold `←` → `L` → `←←` → `↓↘→ S` | 5 | 276 | 0 |
| 4 | Can't Stay Down → Resolve → Barrage → Terminal Velocity on the knocked-down foe | (lethal hit taken) → `L`, mash `L` → (knockdown) `Ult` | 8 | 626 | 30 (setup, see below) |

## How each one works

**1. Rush.**
- The Jab (42) has to land; Light pressed again during it starts the BARRAGE.
- The flurry walks in 3 px per hit, so the foe stays inside its box for all six 16s.
- The sixth hit launches. Skyward cancels the Barrage on that hit: he carries the foe up on his fist (95) and is in flight when it ends.
- A flight punch (speed-scaled) follows. Crash Down (air `↓ S`) drives the airborne foe down with him, and the landing shockwave hits them OTG (70).

**2. Through and back.**
- On HIT the Straight (72) cancels into a Zip.
- A Zip cancelled from a hit goes **through** the foe and stops 10 px behind them (the cross-up). He turns to face them.
- Uppercut (88) launches. The Invincible Punch rush climbs toward where the launched foe *will* be and catches them: 110, then the WALL BOUNCE.
- No Holding Back (1 bar) finishes: six strikes from six directions, 300.

**3. Blow past.**
- From a 560 px start, at 2.45 px/f² he reaches top speed (51.5 px/f) in about 19 frames.
- Above 70 % of top speed he has no body collision and flies *through* people. A flight punch aimed at a foe ahead stops his body 14 px short until the fist lands. The punch lands at full speed, then his momentum carries him past.
- The snap turn reverses him in ≤ 6 frames. The second flight punch hits from the other side.
- The Zip cancels it on hit (an air charge; he has 2 per airtime). Invincible Punch ends it.

**4. Still standing.**
- A lethal hit leaves him at 1 HP: CAN'T STAY DOWN, "Not yet.", then RESOLVE for 6 s.
- The Resolve Barrage launches and knocks down on landing. Terminal Velocity aims at the downed foe.
- **This one is a setup, not a true combo**, and the free-frame count says so. Takeoff (30 f) + aim (60 f) is longer than the Barrage knockdown (70 f), so the foe is up for about 30 frames before impact.
- The marker tracks and the impact is wide (±10 % of the screen direct, 40 % of the stage for the shockwave), so a foe that stands up where they fell still takes it. Rolling or dashing away is the answer, and it should be.

## Rules found while verifying

- **Barrage needs the Jab to land** (or its active frames to have passed). Light pressed during the Jab's startup is just a second Jab. Barrage alone = exactly 6 × 16 = 96, unscaled. With the Jab it is 138.
- **Cancel inputs survive hitstop.** A press made during the hit freeze stays buffered: its age counts only unfrozen frames. Zip double-taps buffer the same way.
- **Turning clears the motion buffer.** After a cross-up Zip, "forward" is the other key, so `↓↘→` can't be misread as `→↓↘` (Skyward).
- **Terminal Velocity vs Satoru Gojo:** any level of Infinity stops it (0 damage). With Infinity down it lands for 380. Checked live in the `gojo` section of the test.
