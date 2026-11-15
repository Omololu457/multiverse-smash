# Megumi Fushiguro: controls

These are the defaults. The shared rebind menu changes every keyboard key, and the Move List re-labels itself from the logical tokens.

Directions are **facing-relative**: Forward = toward the way Megumi faces, Back = away. Megumi adds **no new button, no Megumi-only pad reader and no motion parser**. The pad goes through the shared `readRawControls` path (the same reader as replay and LAN).

## Bindings

| action | PS5 (DualSense, standard mapping) | keyboard P1 | keyboard P2 |
|---|---|---|---|
| Move / crouch | Left stick / D-pad | A / D, S | ← / →, ↓ |
| Jump; a fresh second press double-jumps (exactly 2) | ✕ Cross | W | ↑ |
| Dash | double-tap left / right | double-tap A / D | double-tap ← / → |
| Light chain / air normal | □ Square | J | 1 |
| Low staff check | Down + □ | S + J | ↓ + 1 |
| Uppercut | Up + □ | I (Up-Attack), or W + J | 3 |
| Heavy (sword arc) | △ Triangle | K | 2 |
| Advancing sword | Forward + △ | forward + K | forward + 2 |
| Rising staff launcher | Up + △ | W + K | ↑ + 2 |
| Max Elephant | Down + △ | S + K | ↓ + 2 |
| Air: Winged Toad Lash (aerial ender) | air △ | air K | air 2 |
| Guard | ○ Circle | ; | / |
| Grab | L1 | O | 6 |
| Divine Dog | R1 | L | 4 |
| Toad | Forward + R1 | forward + L | forward + 4 |
| Nue | Up + R1 | W + L | ↑ + 4 |
| Rabbit Escape | Down + R1 | S + L | ↓ + 4 |
| Great Serpent | Back + R1 | back + L | back + 4 |
| Air Nue | air R1 (any direction) | air L | air 4 |
| Rabbit hop (within 40 f of Rabbit Escape) | fresh left / right | fresh A / D | fresh ← / → |
| Shadow Route (in the 22 f confirm window) | fresh R1 (+ direction) | fresh L (+ direction) | fresh 4 (+ direction) |
| Shadow Step | L2 + left / right | P + A / D | 7 + ← / → |
| Charge (L2 with no direction) | L2 hold | P hold | 7 hold |
| Ultimate: Chimera Shadow Garden | R2 | U | 5 |
| Combo Breaker (in hitstun, shared) | ○ + R1 | ; + L | / + 4 |
| Pause | Options | Esc | Esc |

## Input windows

| window | frames | rule |
|---|---|---|
| Press edge | — | Every action reads a **fresh** press edge from the raw controls. Holding a button never repeats a move. |
| Edge freshness | 8 | A press is consumed within 8 frames or dropped (no stale buffered specials). |
| Chain / heavy cancel | shared cancel window | Only after a **clean** hit; a fresh press is required. |
| Shadow Route | 22 after the summon's clean hit | The R1 press must also be fresh inside 4 frames. |
| Rabbit hop | 40 from the swarm's release | Needs a fresh left / right edge (≤ 2 frames old). |
| Shadow Step | — | A fresh L2 press with a direction held, or a fresh direction press while L2 is held (each ≤ 2 frames old). |
| Up grace | 3 | A grounded W / Up held for under 3 frames delays the jump, so a slightly late Special still becomes Nue (Up + Special never jumps). The pad's ✕ is a separate jump button with no delay. |

## Priority

Resolved each frame, top first, in `megumi.js`:

1. Hitstun / blockstun / grabbed / knockdown / cinematic: no command is read. The Combo Breaker is resolved by the shared layer first.
2. **Shadow Route.** Confirm window + stock + not used this combo + a fresh R1.
3. A committed summon gesture, Shadow Step, hop or ultimate opener is in progress: nothing else is read.
4. Clean-hit **chain** (fresh □), then clean-hit **heavy cancel** (fresh △ / Up-Attack).
5. **Ultimate** (R2). It owns its press even when illegal.
6. **Shadow Step** (L2 + horizontal, neutral and grounded only).
7. **Special** (R1): Up > Forward > Back > Down > Neutral. In the air, every direction gives Air Nue.
8. **Up-Attack.** The pad reports Up + △ as both Heavy and Up-Attack on the same frame; that pairing is read as Up + Heavy (the launcher), while Up + □ / I stays the uppercut.
9. **Light** (Down → low, Up → uppercut, air → Air Palm).
10. **Heavy** (Down → Max Elephant, Up → launcher, Forward → advancing sword, air → winged Toad).
11. Otherwise the shared grab / guard path.

## Verification note

Pad parity was verified with an **emulated** standard-mapping gamepad (`navigator.getGamepads` stub) driven through the real poll path. The pad trace matched the keyboard / raw trace **frame for frame** over 1200 frames (`harness/megumi_determinism.mjs` §F).

No physical DualSense was tested.
