# Controls

Both forms use the same logical actions, player/device assignment and remapping.
All directions below are facing-relative. No global controller layout changed.

| PS5 | P1 keyboard | P2 keyboard | Action |
|---|---|---|---|
| Stick / D-pad | A / D / S | arrows | Move / crouch |
| Cross, fresh Cross | W, release W, W | Up, release, Up | Jump / free second jump |
| Square, fresh Square, fresh Square | J, J, J | 1, 1, 1 | Punch chain |
| Down + Square | S + J | Down + 1 | Low punch |
| Triangle | K | 2 | Heavy |
| Forward + Triangle | forward + K | forward + 2 | Advancing punch |
| Up + Triangle | W + K or I | Up + 2 or 3 | Launcher |
| Down + Triangle | S + K | Down + 2 | Low heavy / airborne down-air |
| Air Square | air J | air 1 | Air strike |
| Circle | ; | / | Shared guard |
| L1 | O | 6 | Standard grab |
| Forward + L1 | forward + O | forward + 6 | Power Lift |
| R1 | L | 4 | Incredible Impact |
| Forward + R1 | forward + L | forward + 4 | Freight Train |
| Up + R1 | W + L | Up + 4 | Rising Power |
| Down + R1 | S + L | Down + 4 | Seismic Slam |
| Back + R1 | back + L | back + 4 | Human Wrecking Ball |
| L2 | hold P | hold 7 | Shared charge, disabled during prime |
| R2 | U | 5 | Activate / fresh eligible early return |
| Double-tap left/right | double-tap A/D | double-tap arrows | Shared physical dash |
| Options | Esc | Esc | Pause |

Priority: R2 → legal clean-hit chain/cancel → grab → special → up-attack →
heavy → light. Special direction: Up > Down > Forward > Back > Neutral.
The shared pad reader also reports Up+Square as Up-Attack; that retains the
engine's launcher behavior. Air Triangle without Down uses Air Strike.

Attack edges are buffered at most 8 simulation ticks. A fresh press is consumed
once; holding Square cannot repeat the string. A release during hitstop arms the
next jump press, without replenishing jumps. Prime returns require an actual R2
release/repress after the 30-tick debounce. Buffered shared R2 levels are not
used for that decision. Up+R1 suppresses the jump. L2 never modifies this kit.

Validation uses keyboard events, logical raw input, simulated standard-gamepad
button indices and LAN injection. No physical DualSense was connected/tested.
