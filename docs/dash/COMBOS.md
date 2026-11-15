# Dash Parr — Combos (Phase 5)

Engine rule for Dash: each distinct move in a string is scaled ×0.85 per prior hit (`dashParrComboScale`), the string
resets after 90 frames without a hit, and multi-hit moves count as one step. Measured by `harness/dash_parr.test.mjs`
(results in `mechanics_results.json`). Tolerance ±20 %.

| Route | Inputs | Brief | Measured | Ratio |
|---|---|---|---|---|
| Jab, Jab, Heavy, Blur Dash | J, J, K, →→+L | ≈97 | 82 | 0.845 ✓ |
| Low, Launcher, Air, Flurry | ↓J, ↑K, (jump) J, ↓↘→+L | ≈112 | 92 | 0.821 ✓ |
| Laps, Jab, Heavy, Flurry | ↓↓+L, J, K, ↓↘→+L | ≈147 | 152 | 1.034 ✓ |

Cancel routes (on clean contact, during recovery): Jab → Jab/Heavy/Low/Launcher/special · Heavy → special ·
Low → Launcher/special · Launcher → special · Air → special · Laps → any normal or Incredi-Rush ·
Flurry / Blur Dash / Hydroplane → Incredi-Rush (Hydroplane also → Launcher).

**Blur tier:** with Momentum at 100, the next special costs 0 energy and Momentum resets to 0 (tested: energy
unchanged, Momentum 0, tier back to Jog).
