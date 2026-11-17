# Anime Juice — gameplay changes log

Every change below touches gameplay (frame data, damage, AI or the sim). Presentation-only work is in README.md.
**ben10 / albedo are excluded from all of it.** If either fighter is Ben 10 or Albedo, the old rules apply.

## Phase 1 — Parry gameplay (2026-11-17)

The **flawless block is the parry.** A guard pressed fresh, within the window before a melee hit, counts. The old
`checkParry` path (Heavy pressed during the attacker's first startup frames) is unchanged; it is still nearly unreachable.

| What | Before | After | Where |
|---|---|---|---|
| Flawless window (guard age at the hit) | ≤ 4 f | **≤ 6 f** (+2 f late grace) | `combat.js FLAWLESS_BLOCK.window` (`legacyWindow: 4` for ben10/albedo) |
| Freeze both fighters on a parry | none | **5 f** hitstop on both (**8 f** perfect) | `PARRY.freeze` / `PARRY.perfectFreeze` |
| Attacker knock-back | none | slide **6 px/f**, ×0.82 per frame after the freeze (~30 px) | `PARRY.pushX`, `updateCombat` top |
| Attacker left open | none | after a heavy / launcher / spike / **special**: attack cancelled + **16 f** hitstun. Lights: push only. Ultimates: no push or stagger (cinematics). | `PARRY.staggerFrames` |
| Counter | none | the defender's next **clean** melee hit within **40 f** deals **×1.2**, with "COUNTER" slammed over it. The first contact spends it, blocked or not. | `PARRY.counterWindow` / `PARRY.counterMult` |
| Perfect parry | — | guard ≤ **2 f** old: longer freeze + the shared juice **slow-mo** (setting / LAN / replay-gated, 2 s cooldown) + a blooming ring + camera push-in | `PARRY.perfect`; `game.js` spark loop → `_triggerJuiceSlowmo` |
| Tell | — | render only: a glint runs along the attacker's arm / blade in the **last 6 f** before a heavy / special / ultimate goes active | `animeJuice.js attackTell / drawTell` |
| CPU | blocks reactively | **parryChance** (easy 0.04 · adaptive 0.14 · impossible 0.30): reads a tell ≤ 3 f from active and guards **late** (a fresh guard = a parry). **counterRespect** (0.15 · 0.45 · 0.75): guards instead of mashing while the foe holds a parry counter. | `ai.js AI_DIFFICULTIES`, the parry read in `updateAI`, the respect check in `choosePlan` |

Why: the owner's parry breakdown (C) is a tell, a window a bit bigger than it looks, a freeze, the attacker knocked back
and open, and a bonus counter. A perfect parry slows time. The old flawless block only removed chip damage and shortened blockstun.

Tests: `harness/parry_gameplay.test.mjs` 22/0 (unit) · `harness/parry_live.mjs` 9/0 (real game, screenshots in
`docs/anime_juice/parry/`) · `harness/flawless_block.test.mjs` 24/0 (its window bound was raised from 5 to 7).
