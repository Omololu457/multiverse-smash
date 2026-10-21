# Goku Power Ladder — Phase 3 design (sim-side)

Seven levels, climbed in order (no skipping, one level per transform):
`0 BASE · 1 SSJ · 2 SSJ2 · 3 SSJ3 · 4 GOD · 5 BLUE · 6 UI`

## SIM state (added to the fighter object; must be in GAME_STATE for LAN/replay/companion)
| field | meaning |
|-------|---------|
| `gokuForm` | 0..6 current level |
| `gokuFormTimer` | frames remaining for timed forms (UI only, 15s) |
| `gokuKi` | 0..100 (25 = one bar); `hasEnergy` ki pool |
| `gokuKaioken` | 0 = off, 1 = x2/x10 tier, 2 = x20 burst (Blue) |
| `gokuKaiokenTimer` | x20 burst window (Blue, 3s) |
| `gokuExhaust` | frames of post-UI exhaustion (6s) — no transform/kaioken, ki gain halved |
| `gokuBurst` | transform-burst counter: first 10 frames invuln + pushback, rest vulnerable |
| `gokuGaspTimer` | 20-frame vulnerable gasp when ki hits 0 and a level drops |
| `gokuZenkai` | flag set at round start if previous round lost (+25 ki, 1s golden flash) |
| `gokuGodHpAtEntry` | HP when God entered (regen cap) |

All randomness: `hash(matchSeed, frame, playerIndex)` — NEVER Math.random. Form,
timer, ki, kaioken are SIM state → deterministic and synced.

## Level table (targets; damage = Goku's OUTGOING only; Base MUST be 1.00)
| Lvl | Form | Ki cost | Dmg | Speed | Ki drain/s | Transform frames | Notes |
|-----|------|---------|-----|-------|------------|------------------|-------|
| 0 | Base | – | 1.00 | 1.00 | 0 | – | Kaioken, Spirit Bomb |
| 1 | SSJ | 25 | 1.10 | 1.05 | 0.5 | 30 | rage aura |
| 2 | SSJ2 | 25 | 1.18 | 1.10 | 1.0 | 30 | lightning chip |
| 3 | SSJ3 | 50 | 1.28 | 0.92 | 3.0 | 90 | slow, huge hits |
| 4 | God | 25 | 1.32 | 1.12 | 1.0 | 40 | regen, divine ki |
| 5 | Blue | 25 | 1.38 | 1.15 | 0 idle / 1.5 active | 30 | Kaioken again |
| 6 | UI | 100 | 1.45 | 1.20 | timer 15s | 60 | auto-dodge |

Drain is per-second → per-frame = drain/60 (assuming 60fps sim; confirm tick rate).
Speed scales walk/run/dash ONLY, never startup frames. Final combo damage capped
via the game's existing combo-scaling (no new scaling invented).

## Rules
- Ki hits 0 in a form → drop ONE level + 20-frame vulnerable gasp.
- UI only from Blue at FULL ki (100). 15s timer under health bar. UI ends (timer/
  ki/ grabbed) → drop to BASE + EXHAUSTED 6s (no transform, no kaioken, ki gain ½).
- Every round starts BASE. Zenkai: lost previous round → start +25 ki + 1s gold flash.
- Transform burst: first 10 frames invuln + pushback opponent (aura explosion), rest
  vulnerable. One level per transform.
- Ki spent on transforming is unavailable for supers (intended tension; no free meter).

## Inputs (FINAL choice pending collision-check from recon)
Intended, to be confirmed against existing global inputs:
- **TRANSFORM (climb one level):** `Taunt`/`Select`-style dedicated button if free,
  else `Down+Taunt` or a `Forward,Forward+Charge` motion. Prefer a single unused
  button. Climb happens on PRESS (rising edge).
- **POWER DOWN (→ Base, free):** `Back+Taunt` or double-tap the transform button, or
  `Down,Down+Taunt`. Must be distinct from transform.
- **KI CHARGE (hold to fill ki slowly):** hold `Charge` (the same charge button many
  chars use for meter) — Goku is fully vulnerable while charging (powering-up frames,
  rising aura, rumble). If `Charge` already gains meter globally, gate Goku's version.

Rationale: reuse the existing Charge convention for ki-charge (familiar), and a
Taunt-based combo for transform/power-down so normals/specials/jump are untouched.
Report the exact tokens chosen + why in the final report.

## Transform cinematics (render-only; respect Reduce Flashing / Reduce Motion)
- Palette crossfade over the transform frames + white flash + screenshake scaled by level.
- SSJ3: 3-long-hair frames DON'T EXIST → substitute KI-CHARGE frames + code-drawn long-
  hair flare + ground debris + long scream window.
- God: calm red flame rising. Blue: sharp blue flash. UI: screen dims, silver pulse
  spreads, render-only slow-mo for the burst (sim unaffected).
- Reduce Flashing → no white flash (fade instead); Reduce Motion → no shake/slow-mo.

## Form sheet swap
One frame map (built from base layout) serves every form. Render picks the sheet by
`gokuForm`: base→goku base, 1→goku_ssj, 2→goku_ssj2, 3→goku_ssj3, 4→goku_god,
5→goku_blue, 6→goku_ui. Kaioken = runtime red multiply/overlay on Base or Blue frames
+ code-drawn crimson aura (not a separate sheet). Low-HP (<25%) idle = battle-damage
shirtless frames (already recoloured per form in Phase 2).
