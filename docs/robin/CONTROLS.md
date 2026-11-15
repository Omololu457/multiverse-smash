# Robin — controls

Defaults shown. The shared rebind menu changes every keyboard key; the Move List re-labels from the logical tokens.
Robin adds **no** new button, **no** Robin-only pad reader and **no** motion parser: keyboard, PS5 pad, replay and LAN
all feed the same raw snapshot (`readRawControls`).

| action | keyboard P1 | keyboard P2 | PS5 |
|---|---|---|---|
| Move / crouch | A / D, S | ← / →, ↓ | Left stick / D-pad |
| Jump / double jump (shared, maxJumps 2) | W, W again | ↑, ↑ again | ✕ Cross, ✕ again |
| Smoke Vanish (teleport behind the foe) | double-tap toward the foe (A / D) | double-tap ← / → toward | double-tap stick / D-pad toward |
| Dash (Smoke Step inside own smoke) | double-tap away (A / D) | double-tap ← / → away | double-tap stick / D-pad away |
| Light (punch chain) | J | 1 | □ Square |
| Heavy (Staff Sweep) | K | 2 | △ Triangle |
| Launcher | I (or W + K) | 3 | Up + △ |
| Advancing staff | forward + K | forward + 2 | Forward + △ |
| Low staff check | S + J / S + K | ↓ + 1 / ↓ + 2 | Down + □ / Down + △ |
| Bird's-Eye Bomb | L | 4 | R1 |
| Staff Express | forward + L | forward + 4 | Forward + R1 |
| Rooftop Route | W + L | ↑ + 4 | Up + R1 |
| Dead Drop | back + L | back + 4 | Back + R1 |
| Smoke Drop | S + L | ↓ + 4 | Down + R1 |
| Air bomb | L in the air | 4 in the air | R1 in the air |
| Remote Override: detonate / convert | tap P / hold P (armed Dead Drop) | tap 7 / hold 7 | tap L2 / hold L2 |
| Charge (no armed Dead Drop) | hold P | hold 7 | hold L2 |
| Ultimate | U | 5 | R2 |
| Grab | O | 6 | L1 |
| Guard | ; | / | ○ Circle |
| Combo Breaker (in hitstun) | ; + L | / + 4 | ○ + R1 |
| Pause | Esc | Esc | Options |

Notes
- Forward / back are relative to Robin's facing and are sampled on the press frame.
- Up + Special (W + L, Up + R1) is Rooftop Route, never a jump. On the ground a fresh Up holds the jump for 3 frames so
  Up pressed a hair before Special still counts.
- L2 / Charge is Remote Override **only** while Robin has an armed Dead Drop (or a Remote press is still held). Tap and
  hold resolve on one press and are exclusive. With no device, L2 is the ordinary shared charge.
- Double-tap TOWARD the foe = Smoke Vanish (shared speed-tier blink, 48 f cooldown) — smoke at both ends, reappears
  behind the foe. Double-tap AWAY = ordinary dash; inside his own Smoke Drop field it is Smoke Step (once per field).
