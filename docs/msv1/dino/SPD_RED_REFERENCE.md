# MSV1-DINO — S.P.D. Red reference numbers (read from HEAD ab43fdb97)

The Dino Thunder Rangers are built on these. Sources: `spdRedData.js:19-20, 109-115`, `rangers.js:41-51, 341-396`,
`physics.js` walk formula, `rosterParity.js`. The earlier MSV1 reference (`docs/msv1/SPD_RED_REFERENCE.md`) was re-checked
against HEAD: nothing changed.

| field | S.P.D. Red | Dino Thunder Rangers |
|---|---|---|
| maxHealth | **1200** | ONE pool: 1200 × 1.04 = **1248** |
| speed (stat) | **88** → walk 4.5 + (88 − 78)/20 × 5 = **7.0 px/f** | Red ×1.10 → 7.70 px/f (speed 90.8) · Blue ×0.90 → 6.30 (85.2) · Yellow ×1.00 → 7.00 (88) · White ×1.05 → 7.35 (89.4) |
| run | run.speed 8.4 / run.walk 5.6 = ×1.5 of walk → **10.5 px/f** (holding the direction after a ground double-tap) | each form's walk × 1.5 (same rangers.js run multiplier) |
| jumpPower / maxJumps | 31 / 1 | 31 / 1 (Yellow 2: double jump) |
| weight | 0.9 | Red 1.0 medium · Blue 1.15 heavy · Yellow 0.85 light · White 0.95 medium-light |
| spriteScale | 2.4 / 1.18 | 132 px idle on screen (the Dino sheets' 54 px stand × 2.07 × 1.18) |
| damage parity | ×1.6 (rosterParity) | ×1.6 (same tier) |
| combo scaling | 85 % per hit | 85 % per hit (ninja.js) |

## The double-tap teleport (the DINO DASH input)
- **Input:** double-tap ←← / →→ (rangers.js `tickRanger`), second tap within **tapWindow = 12 sim ticks**; a press made while ↑/↓
  is held counts as a diagonal and resets that direction. The tap is stamped (`r.pending` / `r.pendingAt`) BEFORE the hitstop
  early-out, so command layers can buffer it.
- **S.P.D. Red's blink:** 22 % of the 1280 reference screen (282 px), startup 3 / travel 5 (invulnerable) / recovery 3, 2 charges
  refilling over 90 f, cross-up with an 8-frame facing lock.
- **Dino Thunder:** the same detector and window (ninja.js `doubleTap`, blink vetoed) drives the **Dino Dash** (the ninja streak
  body with per-form numbers, see `DINO_FRAMEWORK.md`).
