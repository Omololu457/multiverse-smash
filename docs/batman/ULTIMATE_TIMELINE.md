# KNIGHTFALL: ORBITAL IMPACT — Timeline

Input: Ultimate (R2 / U / P2 5), grounded, 100 Gadget Energy (spent on use). Also cancels from a clean Rising Knee,
Heavy, Spinning Advance, Sweep or rope kick. Frame numbers are sim ticks (60 / s).

## Opener (`ultOpen`)

Committed grapnel shot: startup 14, active 5, recovery 44. Hitbox `[10, 150, -92, -60]` sheet px (long, mid-height),
blockable. Stored 67 raw → **40** through the shared melee path. Whiff / block → no cinematic, `ultMiss` cue,
44 f recovery. Clean hit → the cinematic starts after the shared ultimate hitstop (28 f, engine-wide).

## Cinematic (frames from confirm; total 240)

| frames | phase | what happens | contact (raw) |
|---|---|---|---|
| 0–33 | STRAFE | fixed-wing aircraft (`plane_drop`) enters low from behind Batman and passes over the captive; portrait cut-in + caption "KNIGHTFALL" | — (opener 40 already dealt) |
| 34 | CAPTURE | tether drops; captive attached under the fuselage | — |
| 34–95 | ASCENT | carried up through the sky (gradient + clouds streak down); stars fade in; caption "ORBITAL IMPACT" | @64 ascent **40** |
| 96–133 | SPACE | high-altitude hold over Superman's World-of-Cardboard moon backdrop (stamped on the caster only: `_supMoonBg` / `_supMoonScroll`); plane banks and turns to face down | — |
| 134–165 | REENTRY | full-speed dive, speed trails, stars streak upward | @150 reentry **90** |
| 166 | IMPACT | captive driven into the legal stage impact point; plane pulls out; title card "KNIGHTFALL: ORBITAL IMPACT" | @166 slam **200** |
| 166–205 | EXPLOSION | Krybot explosion strip × 3.2, shock ring, debris, bounded shake, impact flash | @178 blast **50** |
| 206–239 | RECOVERY | sky fades back, camera returns, captive left knocked down at a legal stage position | — |

Total **420 raw** = 40 + 40 + 90 + 200 + 50 (cinematic contacts: no × 0.60, captured combo scale applied).

## Contract

- **Frozen-cinematic contract.** Both fighters are locked. The live fleet exits and pending payloads are cleared
  on confirm. The camera is driven via the freeze-block hint (target x / y / zoom + bounded shake).
- **Captive bounds.** The captive is clamped inside `[floor − 560, floor]` and the stage width throughout. It ends
  grounded and knocked down, and no fighter can leave the stage.
- **Superman's backdrop is reused without changes.** The moon backdrop predicate was widened with
  `|| f.rosterKey === "batman"`. Superman's entry and frame data are verified identical (framedata diff).
- **Deterministic.** There is no Math.random, and snapshot / restore works mid-cinematic
  (`harness/batman_determinism.mjs`).
- **Evidence.** `visual_24_ult_{strafe,ascent,space,reentry,impact}_{R,L}.png` and `visual_23_*_ult_blocked.png`.
