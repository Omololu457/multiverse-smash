# Hiromi Higuruma: controls

Higuruma uses only the existing logical actions: Light, Heavy, Up-Attack, Special, Ultimate, Grab, Charge, Block,
Jump and the directions. There is no Higuruma-only pad reader, no new button and no motion parser. The keyboard and
the gamepad go through the same shared input layer. A replay or a LAN slot-2 Higuruma is driven by the same raw
controls. Forward and back are relative to facing. The shared rebind menu changes every keyboard key, and the Move
List re-labels itself from the logical tokens. The same table lives in `higurumaKit.js` (`HIGURUMA_CONTROLS`).

| Action | Keyboard P1 | Keyboard P2 | PS5 (standard pad layout) |
|---|---|---|---|
| Move / crouch | A / D, S | ← / →, ↓ | Left stick / D-pad |
| Jump / double jump (shared, max 2) | W, W again | ↑, ↑ again | ✕ Cross, fresh ✕ again |
| Dash (Precedent cancel when eligible) | double-tap A / D | double-tap ← / → | double-tap stick / D-pad |
| Small-gavel chain | J, J, J | 1, 1, 1 | □ Square ×3 |
| Low Gavel Check | S + J | ↓ + 1 | Down + □ |
| Giant Gavel Overhead | K | 2 | △ Triangle |
| Extended Lash | forward + K | forward + 2 | Forward + △ |
| Rising Gavel launcher | I (or W + K) | 3 | Up + △ |
| Giant Gavel Upswing | S + K | ↓ + 2 | Down + △ |
| Rising Air Swing | J / K in the air | 1 / 2 in the air | □ / △ in the air |
| Extension of the Court | L | 4 | R1 |
| Cross-Examination | forward + L | forward + 4 | Forward + R1 |
| Rising Objection | W + L (ground or air) | ↑ + 4 | Up + R1 |
| Order in the Court | S + L | ↓ + 4 | Down + R1 |
| Objection | back + L | back + 4 | Back + R1 |
| Deadly Sentencing (100 Energy) | U | 5 | R2 |
| Grab | O | 6 | L1 |
| Energy charge (shared) | P hold | 7 hold | L2 hold |
| Guard | ; | / | ○ Circle |
| Combo Breaker (in hitstun) | ; + L | / + 4 | ○ + R1 |
| Pause | Esc | Esc | Options |

## Rules worth knowing
- **Fresh presses only.** Chains, the double jump and the Precedent dash need a new press edge. Holding a button never
  repeats or buffers it.
- **Special direction priority:** Up > Forward > Back > Down > Neutral. Up + Special is never a jump.
- **In the air**, only Up + Special (Rising Objection, once per airtime) is accepted. Other air specials are refused,
  and no Energy is spent.
- **Precedent:** with a stored token, double-tap toward or away during the late recovery (last 65 %) of a clean,
  confirmed gavel hit. That recovery becomes the ordinary shared dash. Speed 92 is below the shared teleport tier (98),
  so a double-tap is never a teleport.
- **Launcher follow-up:** the shared launcher jump-cancel needs a fresh jump press after the hit freeze, about 7 frames
  after hitstop ends. A press during the freeze is ignored, as it is for every fighter.
- **L2** keeps the shared energy charge. No gavel throw or recall is bound, because the art shows a tethered gavel
  (see CANON_AND_ADAPTATION.md).

## Pad verification status
Gamepad behaviour is verified in a headless browser through the real `navigator.getGamepads` polling path. A mocked
standard-layout pad produces a trace identical, frame for frame, to the keyboard / raw path
(`harness/higuruma_determinism.mjs`, section F). **No physical PS5 controller was used.**
