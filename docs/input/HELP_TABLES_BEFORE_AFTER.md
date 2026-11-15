# Controller help tables: before vs truth (input quick-wins Phase 2)

Truth (what `input.js pollGamepad` actually does, unchanged by this phase; now defined once in `padLayout.js PAD_LAYOUT`):

| Action | Button (PlayStation) | Std index |
|---|---|---|
| Light | Square | 2 |
| Heavy | Triangle | 3 |
| Jump | Cross (and Up) | 0 |
| Block | Circle | 1 |
| Special | R1 | 5 |
| Ultimate | R2 | 7 |
| Grab | L1 | 4 |
| Charge (hold / tap toggle) | L2 | 6 |
| Up-Attack | Up + Square / Triangle | |
| Dash | double-tap left/right | |

What the five hand-written places said before:

| Source | Light | Heavy | Special | Ultimate | Grab | Charge | Block | Jump | Circle |
|---|---|---|---|---|---|---|---|---|---|
| kits.js `CONTROL_REFERENCE.controller` | Cross | Square | Triangle | L2 / R2 | L1 | R1 ("Charge / Omnitrix") | (missing) | stick/d-pad only | "Dash" |
| game.js `_controlRefForPad` (Move List) | Cross | Square | Triangle | L2 / R2 | L1 | R1 | (missing) | stick/d-pad only | "Dash" |
| ui.js controls overlay | Cross | Square | Triangle | L2 / R2 | L1 | "Omnitrix R1 (+ ← / →)" | (missing) | stick/d-pad only | "Dash" |
| academy.js pad prompts | Cross | Square | Triangle | L2/R2 | L1 | R1 | R1 | "Up" | (unused) |
| input.js `PS5_MAP` header comment | X(Cross) | Square | Triangle | L2, R2 alt | L1 | R1 ("charge / Omnitrix") | Circle | (missing) | Block |

Every one of them was wrong for Light, Heavy, Special and Charge; Ultimate listed L2 (L2 is Charge);
Circle was called Dash (it is Block); Academy told players Block = R1 (R1 is Special) and Up-Attack =
D-Pad Up + Cross (Cross is Jump). A player following the Move List pressed Cross for Light and jumped.

After: all five generate from `padLayout.js` (`padHelpRows`, `padGlyphFor`); `harness/controls_help.test.mjs`
presses every physical button on a fake pad and asserts each help surface shows that button's glyph for the
action it really triggers, for PlayStation / Xbox / Switch / generic glyph sets.
