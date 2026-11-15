# Syndrome — controls

Syndrome uses only the SHARED logical actions (Light / Heavy / Up-Attack / Special / Ultimate / Charge (L2) / Grab /
Block / Jump / Dash). No Syndrome-only pad poller, no new button, no motion input. Keyboard keys are the defaults and the
shared rebind menu changes them; the Move List re-labels from the logical tokens. Directions are FACING-RELATIVE.

| Action | Keyboard P1 | Keyboard P2 | PS5 (shared pollGamepad layout) |
|---|---|---|---|
| Move / crouch | A / D, S | ← / →, ↓ | Left stick / D-pad |
| Jump / double jump (shared, maxJumps 2) | W, W again | ↑, ↑ again | ✕ Cross, ✕ again (fresh press) |
| Dash | double-tap A / D | double-tap ← / → | double-tap left / right |
| Command chain (Spinner → Drone → Spinner) | J, J, J | 1, 1, 1 | □, □, □ |
| Low Spinner skim | S + J | ↓ + 1 | Down + □ |
| Claw Drive (heavy) | K | 2 | △ Triangle |
| Rising Claw (launcher) | W + K or I | ↑ + 2 or 3 | Up + △ |
| Drone strafe (air) | air J | air 1 | air □ |
| Leg Drop (air down) | air K | air 2 | air △ |
| Hunter Duet | L | 4 | R1 |
| Spin Cycle | forward + L | forward + 4 | Forward + R1 |
| Velocipod Intercept | W + L | ↑ + 4 | Up + R1 |
| Deploy Turret (gun) | S + L | ↓ + 4 | Down + R1 |
| Omnidroid: Hammerfall | back + L | back + 4 | Back + R1 |
| Zero-Point Hold | P + L | 7 + 4 | L2 + R1 |
| Mortar Turret | P + forward + L | 7 + forward + 4 | L2 + Forward + R1 |
| Rising Interception | P + W + L | 7 + ↑ + 4 | L2 + Up + R1 |
| Missile Turret | P + S + L | 7 + ↓ + 4 | L2 + Down + R1 |
| Omnidroid Sweep | P + back + L | 7 + back + 4 | L2 + Back + R1 |
| Ultimate — Operation Kronos | U | 5 | R2 |
| Grab | O | 6 | L1 |
| Guard | ; | / | ○ Circle |
| Charge (L2 alone) | P hold | 7 hold | L2 hold |
| Pause | Esc | Esc | Options |

## Rules

- **Special direction priority** (sampled on the R1 press frame): Up > Forward > Back > Down > Neutral.
- **L2 modifier**: R1 pressed while L2 is held (or with L2 pressed within the same 4-frame window) selects the modified
  table and overrides the unmodified command. While L2 is used this way it never charges Power; L2 held alone is the
  shared Charge.
- **Up + R1** is the Velocipod, never a jump (Syndrome owns the Up press for that frame and a 3-frame Up grace keeps a
  slightly-early Up from starting a jump before R1 lands).
- **Pad Up + Triangle**: the shared pad reader reports Heavy and Up-Attack on the same tick; Syndrome reads that pair as
  Up + Heavy → Rising Claw (in the air: Leg Drop).
- **Chain**: Light → fresh Light → fresh Light, only after a clean hit, three stages maximum. Heavy, Specials and the
  Ultimate cancel only from clean hits (MOVESET.md lists the exact sources).
- **Double jump**: the shared double jump, exactly 2 jumps. No command refunds a jump; nothing hovers.

## PS5 note

The PS5 layout above is the game's shared `pollGamepad` mapping (Cross 0, Circle 1, Square 2, Triangle 3, L1 4, R1 5,
L2 6, R2 7, D-pad 12–15). It was verified through the browser Gamepad API with a synthetic pad in
`harness/syndrome_determinism.mjs` (gamepad path == raw path frame for frame). **No physical PS5 controller was
tested** — no hardware was available in this session.
