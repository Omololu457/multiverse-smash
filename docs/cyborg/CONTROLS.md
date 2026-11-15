# Cyborg — controls (keyboard and PS5)

Cyborg uses the shared binding layer: input.js `inputSettings` plus the rebind menu and the live `pollGamepad`. He adds:
- no Cyborg-only pad reader,
- no new button,
- no motion parser.

The Move List (kits.js → cyborgKit.js) writes inputs as logical tokens (Light / Heavy / Special / Ultimate / Grab / Charge / Block / Jump). Rebinding a keyboard key therefore changes what the help shows. The table below is also exported as `CYBORG_CONTROLS` in cyborgKit.js.

| Action | Keyboard P1 | Keyboard P2 | PS5 |
|---|---|---|---|
| Move / crouch | A / D, S | ← / →, ↓ | Left stick / D-pad |
| Jump | W | ↑ | ✕ Cross (or stick Up) |
| Thruster reboost (airborne) | W again | ↑ again | ✕ Cross again |
| Light | J | 1 | □ Square |
| Heavy | K | 2 | △ Triangle |
| Up-attack (launcher) | I (or W + K) | 3 | Up + □ / △ |
| Special family | L (+ direction) | 4 (+ direction) | R1 (+ direction) |
| Ultimate | U | 5 | R2 |
| Grab | O | 6 | L1 |
| Vent (hold; grounded, neutral) | P | 7 | L2 |
| Guard | ; | / | ○ Circle |
| Combo Breaker (in hitstun) | ; + L | / + 4 | ○ Circle + R1 |

## Special family

All directions are relative to facing.

| Input | Move |
|---|---|
| Special (tap) | Sonic Shot |
| Special (hold ≥ 18 f) | Sonic Cannon |
| Forward + Special | Straight Missile |
| Up + Special | Missile Rack (never jumps) |
| Down + Special | Mega Punch |
| Air Down + Special | Mega Slam |
| Back + Special | Sonic Recoil |

## Notes

**Combo Breaker.** This is the shared universal breaker (combat.js `tryComboBreaker`): Block + Special while in hitstun, once the attacker's combo counter is at least 3. It spends one of the 2 per-round break stocks. Cyborg does not change it.

**Vent (Charge / L2 / P).**
- The shared Power charge is turned off for Cyborg (game.js charge gate `!isCyborg(fighter)`), so holding Charge only vents Heat.
- Measured Power gained over the same test window: 2.40 while venting, 2.52 while idle (that is the shared passive regen).

**Keyboard Up grace.** Keyboard `up` and `jump` share W. A fresh grounded W is held for `UP_GRACE` = 3 frames (cyborgState.js), so "W pressed 1-2 f before L" still gives Up + Special = Missile Rack instead of a jump.
- The grace delays a keyboard jump by up to 3 f.
- On a PS5 pad, Cross is a dedicated jump and lifts off immediately.
- Measured liftoff (determinism_results.json): pad on frame 10, keyboard on frames 10-13; both reboosts on frame 24.

**Pre-existing shared help discrepancy (not edited; outside Cyborg's scope).** Two helpers label the face buttons differently from the live pad reader:
- `academy.js inputLabelForDevice` and `game.js _controlRefForPad` label Light = Cross.
- The live `pollGamepad` maps Square = Light, Triangle = Heavy, Cross = Jump.

This table follows the live `pollGamepad`, which is what the brief's PS5 layout matches. A fix belongs to whoever owns academy.js and the control reference.
