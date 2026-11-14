# S.P.D. Green Ranger (Bridge Carson) — Handoff / Verification
Date: 2026-11-13

## Status
- **Playable in the current worktree.** It is reachable through the normal menu: Play → VS → Power Rangers → S.P.D. Green. It has 980 HP, its full normal and special kit, the double-tap phase step, and Default + 6 skins.
- **Ultimate: NOT available.** The shared Ranger Zord system does not exist (SPD Blue is in the same state). The Ultimate press is consumed and spends no meter, with no fallback. The dependency is documented in `SPD_GREEN_ZORD` and in the kit text.
- **Shared-file hooks: pending integration.** They are applied in the worktree but uncommitted, because they depend on SPD Blue's uncommitted work. See INTEGRATION.md.

## Controls (P1 keyboard / gamepad)
| Action | Input |
|---|---|
| Move / jump / crouch | A D / W / S |
| Light J1→J2→J3 | J (repeat) |
| Heavy | K |
| Forward+Heavy string | →+K, then K, K (Up instead → launcher) |
| Launcher | Up attack (I), then jump and Air (J/K) manually |
| Low | S+J |
| Aura Read | P (Charge) / L2 |
| Deltamax Check | L (Special) / R1 |
| Acrobat Step | →+L; if the target is marked and the hit was clean, K within 10f |
| Rising Arc | ↓+L (ground) |
| Heel Return | ↓+L (air) |
| Read and Retreat | ←+L |
| Phase step | double-tap → or ← |
| Ultimate | U (disabled; see above) |

## Tests (all run 2026-11-13)
| Harness | Result |
|---|---|
| harness/spd_green.test.mjs (mechanics, combos, frame data, Aura Read rules, cleanup, gamepad) | 60/0 |
| harness/spd_green_determinism.mjs (1100-frame replay identical, LAN slot 2, render batching) | 17/0 |
| harness/spd_green_skins.test.mjs (6 skins, trace identity, FX colours, mirror wash) | 56/0 |
| harness/spd_green_visual.mjs (real mouse/keyboard normal launch → match → KO → victory → rematch) | 12/0 |
| Regression: determinism | 14/0 |
| Regression: combo-standard | 231/9 (pre-existing; spd_green joins the existing "unclassified" assertion alongside spd_blue/spd_red/krybot) |
| Regression: roster integrity | ✅ |
| Regression: up-attack roster | 77/2 (superman/ghostface, pre-existing) |
| Regression: frame-advantage | 15/0 |
| Regression: spd_red_final / spd_red_skins | 33/0 / 18/0 |
| Regression: spd_blue | 54/0 |
| Regression: teleport contract | 26 |
| Regression: krybot | 58/0 |

Frame-data diff across the whole roster: 135 → 136 characters. Only `spd_green` was added; every other character is unchanged.

## Docs
SPRITE_LEDGER.md, MOVE_FRAME_MAP.md, COMBOS_BALANCE.md, CANON_ADAPTATION.md, INTEGRATION.md, CREDITS.md and CODEX_OWNERSHIP.md, plus `docs/skins/spd_green/` (SOURCES.md, skins_contact.png, region_mapping.json).
