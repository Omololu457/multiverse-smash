# Beast Boy — controls

Generated from `BEAST_BOY_CONTROLS` (beastBoyKit.js). Bindings verified against the live defaults (game.js P1_CONTROLS / P2_CONTROLS, input.js PS5_MAP / pollGamepad / pollMenuGamepad) on 2026-11-14. Shared binding system only: no Beast-Boy-only pad reader, no new button, no global remap, no motion parser.

| Command | Keyboard P1 | Keyboard P2 | PS5 DualSense |
|---|---|---|---|
| Move / crouch (facing-relative directions) | A / D, S | ← / →, ↓ | Left stick / D-pad |
| Dash (ordinary ground dash) | double-tap A or D | double-tap ← or → | double-tap D-pad ← / → |
| Jump (one jump, no double jump) | W | ↑ | ✕ Cross (or stick / D-pad Up) |
| Light → fresh Light → fresh Light (J1-J3) | J | 1 | □ Square, fresh □ retaps |
| Low Ankle Check | S + J | ↓ + 1 | Down + □ |
| Heavy (Full Stretch) | K | 2 | △ Triangle |
| Command chain | D/A(fwd) + K → K → K | →/←(fwd) + 2 → 2 → 2 | Forward + △ → fresh △ → fresh △ |
| Launcher Rising Kick (jump suppressed) | I  (or W + K) | 3 | Up + △ |
| Aerial Kick | J or K in the air | 1 or 2 in the air | □ or △ in the air |
| Gorilla Break | L | 4 | R1 (neutral) |
| Triceratops Drive | Forward + L | Forward + 4 | Forward + R1 |
| Tiger Cross (ground) | S + L | ↓ + 4 | Down + R1 |
| Tiger Cross (air, once per airtime) | S + L in the air | ↓ + 4 in the air | Air Down + R1 |
| Bird Intercept (ground / air, once per airtime; never jumps) | W + L | ↑ + 4 | Up + R1 |
| False Start (feint back) | Back + L | Back + 4 | Back + R1 |
| Wild Chain link (after a clean animal hit, 10 f) | fresh matching direction + L | fresh matching direction + 4 | fresh matching direction + R1 |
| Instinct escape (armed move, last 8 f) | W, or double-tap A / D | ↑, or double-tap ← / → | ✕ Cross, or double-tap D-pad |
| Ultimate | U | 5 | R2 |
| Grab | O | 6 | L1 |
| Charge (ordinary shared Morph Energy charge, hold) | P | 7 | L2 |
| Guard | ; | / | ○ Circle |
| Combo Breaker (in hitstun, shared rules) | ; + L | / + 4 | ○ Circle + R1 |
| Pause | Esc | Esc | Options |
| Menu confirm / back | Enter / Esc | Enter / Esc | ✕ Cross / ○ Circle |

## Special priority

Special direction priority on the press frame (facing-relative): Up > Forward > Back > Down > Neutral — Up-Forward = Bird, Down-Forward = Tiger. In the air only Up (Bird) and Down (Tiger) are legal; other air Specials are refused. Up + Special owns the press (no ordinary jump leaks); a fresh grounded Up holds the jump 3 f so Up a hair before Special still gives Bird. Holding R1 never chains: every Wild Chain link needs a FRESH press. The Ultimate owns its press; the breaker (Guard + Special in hitstun) is resolved before the command layer, so its component buttons do nothing else that frame.

## Notes

Defaults shown; the shared rebind menu changes the keyboard keys and the Move List re-labels from the logical tokens. Beast Boy adds no Beast-Boy-only pad reader, no new button, no global remap and no motion parser. L2 / Charge is the engine's ordinary shared energy charge (Beast Boy has no second resource).

- PS5 layout (input.js PS5_MAP): ✕ 0 Jump · ○ 1 Guard · □ 2 Light · △ 3 Heavy · L1 4 Grab · R1 5 Special · L2 6 Charge · R2 7 Ultimate · Options 9 Pause · D-pad 12-15. Menus: ✕ confirm, ○ back.
- Pad dash = D-pad double-tap (shared updateGamepadEdges → detectDoubleTapDashTeleport, 240 ms wall-clock window). Replay / LAN carry the resolved `dash` bit, so playback never depends on wall-clock time.
- Keyboard W is Up AND Jump (one key); Up + Special is owned by Bird Intercept (the jump is suppressed while Special is held with Up, and a fresh grounded Up holds the jump 3 f). The pad's D-pad Up + R1 is Bird without any Cross press.
- Verified: harness/beast_boy_determinism.mjs (pad == raw frame-for-frame, Instinct escape on ✕ and on a D-pad double-tap, D-pad Up + R1 = Bird grounded through startup); harness/beast_boy.test.mjs (every keyboard input).
