# MSV1: SPD Red reference numbers (read from committed HEAD 51b4aaa55)

Shane and Dustin copy these numbers exactly. They are the same speed tier as SPD Red, not slower.

## Stats (spdRedData.js:114-115; built by game.js createFighter 5262-5306)
| field | value | note |
|---|---|---|
| maxHealth | **1200** | rebalanced in 9acb14d76. The comment at spdRedData.js:108 and kits.js:282 still say 950 (stale) |
| speed / baseSpeed | **88** | game.js:5275/5300. spdRedRoundReset re-applies it every round (spdRedState.js:33-37) |
| walk px/frame | **7.0** | physics.js:128: clamp(4.5 + (88-78)/20*5, 4.5, 9.5) |
| run multiplier | **1.5** (run.speed 8.4 / run.walk 5.6) | rangers.js:392-396 rangerWalkMul; spdRedData.js:20 |
| **ground RUN px/frame** | **10.5** | 7.0 × 1.5. Starts only by holding the direction after a ground blink (rangers.js:377-386) |
| air drift px/frame | 7.0 | same walk branch, no onGround gate (physics.js:297-303) |
| jumpPower / maxJumps | 31 / 1 | gravity 0.85 (physics.js:37) |
| weight | 0.9 | knockback ÷ 0.9 (spdRedState.js:166) |
| dash | disabled | tickRanger sets f.noDash (rangers.js:338) |
| spriteScale | 2.4/1.18 ≈ 2.034 | spdRedData.js:103 |
| hurtbox | default 60×100 | game.js:5268 |
| damage parity | ×1.6 out | rosterParity.js:15 |
| combo scaling | 85%/hit | combat.js:560 |

## Double-tap teleport (blink), rangers.js
- **Input:** double-tap **←←** or **→→** (↑/↓ only with `vertical`, which SPD Red does not have). There is **no dedicated teleport button** in input.js. "Teleport" here always means this gesture.
- **Detection:** rangers.js tickRanger :341-364. It looks for press edges on simulation ticks (`r.tick++` also counts during hitstop). The second tap must land within **tapWindow = 12 ticks** (BLINK_DEFAULTS :51). A press made while ↑/↓ is held is treated as a diagonal and resets that direction's tap. The pending tap is stored in `r.pending` / `r.pendingAt` before the hitstop early-out, so a command layer can read it.
- **SPD Red blink:**
  - distance: distPct 0.22 × 1280 = **282 px**
  - frames: startup 3, travel **5** (invulnerable), recovery 3 = **11 frames**
  - charges: **2**, each refilling over 90 frames
  - cost: none
  - crossup: true, then the facing is locked for 8 frames
  - air: true (|vx| capped at 14)
  - dodge reward: +5 energy and ×1.15 on the next attack, within a 20-frame window
- **Generic:** any rosterKey with a registered profile gets detection and the blink. Profiles without `ownTick` are ticked by spdRedState.js:76-83 through game.js's tickSpdRed hook. Snapshot/replay already carry `f._ranger`.
- The engine's own dash double-tap (game.js ~11639) runs on wall-clock time and is disabled by noDash. It is NOT the input copied here.

## Morph / intro / Judgment
- **Morph:** unmorphed → morphing (40f) → morphed. Every shipped Ranger uses `alwaysMorphed: true`. Intros use the generic `introSequence` data (game.js:5629), e.g. `['intro']`.
- **Judgment:** Light+Heavy+Special chord within 4 ticks (spdRed.js:17).
  - sJudge: 0 damage, startup 30, invulnerable for 41 frames.
  - Meter: 20, +1 per hit.
  - GUILTY at or below 30% HP: target sealed for 180f.
  - INNOCENT: +40 energy.
  - Once per round; Ranger opponents are always innocent.

## What the ninjas copy
- `speed: 88`, `run: { speed: 8.4, walk: 5.6 }` → identical 7.0 walk and **10.5 run**.
- The same rangers.js double-tap detection: same function, `tapWindow: 12`, same diagonal rule. Only what happens after the double-tap differs: SPD Red blinks, the ninjas Streak.
