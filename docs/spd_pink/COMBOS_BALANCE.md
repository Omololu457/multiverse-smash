# S.P.D. Pink — Combos & Balance (measured, `harness/spd_pink.test.mjs` → `mechanics_results.json`)

These are applied damage figures against an S.P.D. Pink dummy (HP 980).

| Route | Applied | True combo? |
|---|---|---|
| J1 → J2 → J3 | 38 (10+12+16) | yes, both facings |
| J1 → J2 → Iron Breaker | 52 | yes |
| (Iron Reserve) J1 → J2 → charged Iron Breaker | 61 | yes |
| J1 → Heavy → Deltamax Shot | 64 | |
| Forward+Heavy string (3 hits) | 53 | |
| Launcher → jump → air | 40 | |
| Charged Heavy punish | 42 | |
| Phase step → Heavy | 34 | |
| Baton Reprisal response | 24 | |

Variety pass (measured by `harness/spd_rangers_variety.test.mjs` → `docs/rangers/variety_results.json`):
- Cartwheel Sweep knocks down.
- Handspring Away travels 100px with 7 invulnerable frames.
- Vault Kick is an overhead and connects.
- Iron Barrage hits three times and knocks down.
- A blocked Iron Barrage ends after stage 1 with an 18f stop, so it can be punished.

Balance notes:
- Iron Reserve trades startup for damage: +3 startup, +6 recovery, and nothing else (no armor, invulnerability or guard break).
- Iron Barrage costs the stored charge plus 20 energy, and gives up the Iron Breaker's 90px reach.
- Vault Kick (overhead, 16f) pairs with Down+Light/Down+Heavy (lows) for a high/low mix-up. It is slow enough to react to and has no invulnerability.
- Handspring Away is the Pink copy of Red's Back+Heavy flip, kept shorter: 7 invulnerable frames against Red's 8.
- The ↓↘→ read uses a deterministic 16-tick history of raw input. A plain → never triggers it (tested).
