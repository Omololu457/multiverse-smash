# Batman (rebuilt) — Controls

Defaults; the shared rebind menu changes every keyboard key and the Move List re-labels from the logical tokens.
Forward / back are relative to facing. No Batman-only pad reader, new button or motion parser: everything rides
the shared `readRawControls` (keyboard + live `pollGamepad` PS5 layout).

| action | keyboard P1 | keyboard P2 | PS5 (DualSense) |
|---|---|---|---|
| Move / crouch | A / D, S | ← / →, ↓ | Left stick / D-pad |
| Jump / double jump (fresh second press) | W, W again | ↑, ↑ again | ✕, fresh ✕ again |
| Dash (physical; Shadow Dash inside his smoke) | double-tap A / D | double-tap ← / → | double-tap stick / D-pad |
| Light chain (3 stages, clean hits) | J, J, J | 1, 1, 1 | □ ×3 |
| Low strike | S + J | ↓ + 1 | Down + □ |
| Air strike | J in the air | 1 in the air | □ in the air |
| Heavy kick / advancing heavy | K / forward + K | 2 / forward + 2 | △ / Forward + △ |
| Launcher | I (or W + K) | 3 | Up + △ |
| Sweep / Cape counter | S + K / back + K | ↓ + 2 / back + 2 | Down + △ / Back + △ |
| Air kick / Cape dive | K / S + K in the air | 2 / ↓ + 2 in the air | △ / Down + △ in the air |
| Batarang | L | 4 | R1 |
| Grapnel / Rooftop / Smoke / Gotham Airspace | forward / W / S / back + L | forward / ↑ / ↓ / back + 4 | Forward / Up / Down / Back + R1 |
| Support order | hold P, then L (+ direction) | hold 7, then 4 (+ dir) | hold L2, then R1 (+ direction) |
| KNIGHTFALL: ORBITAL IMPACT | U | 5 | R2 |
| Grab | O | 6 | L1 |
| Energy charge (shared) | hold P alone > 10 f | hold 7 | hold L2 alone > 10 f |
| Guard | ; | / | ○ |
| Pause | Esc | Esc | Options |

**L2 is shared between orders and charge.** Batman owns the L2 hold for its first 10 frames (`CHORD_HOLD`) and for
the whole hold once R1 is pressed during it. That way an order never starts a charge, and L2 held alone still
charges normally.

**Command stance.** While L2 / P is held on the ground, Up is an order direction and never a jump. Real players
press Up a few frames before R1; this was found in the real-time visual run and is now covered by the mechanics
test. Without L2, Up / W jumps as usual.

**Orders are ground-only.** In the air, an order is rejected before any energy is spent.

**Hardware.** Physical DualSense hardware was **not** tested. The PS5 column follows the shared `pollGamepad`
standard-mapping layout, which is used by every fighter. Keyboard input was tested end to end through the real
launch path (`harness/batman_visual.mjs`).
