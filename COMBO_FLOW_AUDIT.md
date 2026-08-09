# Roster-wide Combo-Flow Audit (Step 1 — audit only, nothing changed)

Extends the combo-flow tuning proven on Killua / Hisoka / Netero / Tobirama to **every** character.
Measured live via `harness/combo_momentum_audit.mjs` (drift + finisher hit-stop) + static read of the
`*_COMMAND` move data (recovery frames). **No source was modified in this step.**

## The three signals & their baselines
1. **Mid-stage recovery** — recovery frames of the middle chain stage. **Tobirama baseline = 11–12f.**
   Flag when materially above (≥13, hard-flag ≥14).
2. **Launcher-weight on the finisher** — the finisher's impact-freeze (hit-stop). Heavy/launcher tier = 8f,
   jab tier = 4f. Probed as the **peak hit-stop** seen on the attacker across the chain (the finisher is the
   heaviest stage). `getHitstopFrames()` (combat.js:244) classifies by attack **name** and **ignores the
   `launcher` flag**; command moves carry no `category`, so every rekka finisher name falls through
   `_catFromName` → `"light"` → **4f**.
3. **Step-in velocity** — Down+Heavy chains hold DOWN → no walk momentum → planted unless
   `COMBO_STEP_IN_VX` (=8) pushes them in. Fwd+Heavy chains hold forward and glide for free.

## Headline finding (a real surprise — reported, not folded in)
The "hit-stop sees the launcher flag" piece that the task describes as **already proven** is **NOT in the
current code.** Empirically **every** rekka finisher freezes at **peakHS = 4 (light)** — including
Tobirama's own `tobiComboFin`, and including finishers that explicitly set `launcher: true`
(`omComboFin`, `vgUpFinish`, `minatoRushFin`, `omLowAttack`…). Root cause: `getHitstopFrames` reads
`atk.category || _catFromName(atk.name)` and never consults `atk.launcher`; `createAttackFromMove`
(abilities.js:187) never sets `category`. So finishers land with the weight of a jab, roster-wide. This is
the single highest-value, lowest-risk fix and it is **one central change**, not per-character.

## Audit table

### Down+Heavy chains (opener held ↓ — step-in applies)
| Char | Universe | Mid recov | Fin recov | Drift(px) | Fin peakHS | Launcher-wt OK | Step-in | FLAG |
|------|----------|-----------|-----------|-----------|-----------|----------------|---------|------|
| Netero    | hunter_x_hunter | **14** | 18 | +23 | 4 | **N** | Y | **Y — recov 14** |
| Killua    | hunter_x_hunter | **14/14/14** | 18 | +22 | 4 | **N** | Y | **Y — recov 14** |
| Hisoka    | hunter_x_hunter | **14** | 17 | +25 | 4 | **N** | Y | **Y — recov 14** |
| Gon       | hunter_x_hunter | 13 | 18 | +25 | 4 | **N** | Y | Y — recov 13 (+Adult-giant flag) |
| Flash     | dc | 13 | 16 | +25 | 4 | **N** | Y | borderline — recov 13 |
| Batman    | dc | 12/12 | 20 | +15 | 4 | **N** | Y | launcher-wt only |
| Zenitsu   | demon_slayer | 11/12 | 19 | +22 | 4 | **N** | Y | launcher-wt only |
| Ghostface | horror | 11/12 | 16 | +15 | 4 | **N** | Y | launcher-wt only |

### Fwd+Heavy chains (opener held → — glide, no step-in needed)
| Char | Universe | Mid recov | Fin recov | Drift(px) | Fin peakHS | Launcher-wt OK | FLAG |
|------|----------|-----------|-----------|-----------|-----------|----------------|------|
| **Tobirama** (baseline) | naruto | 11/12 | 22 | +151 | 4 | **N** | launcher-wt only |
| Minato   | naruto | 10/12 | 22 | +154 | 4 | **N** | launcher-wt only |
| Vegeta   | dragon_ball | 10/11/12 | 20 | +135 | 4 | **N** | launcher-wt only |
| Ben 10   | ben_10 | 10–11 | 16 | +58 | 4 | **N** | launcher-wt only (low drift — default alien; verify) |
| Omega    | power_rangers | 10/12 | 20 | +145 | 4 | **N** | launcher-wt only |
| Samurai Red  | power_rangers | 11/12 | 22 | +124 | 8* | **N** | launcher-wt (chain didn't fire in harness*) |
| Gold Samurai | power_rangers | 11/12 | 22 | +128 | 8* | **N** | launcher-wt (chain didn't fire in harness*) |
| Omni-Man | invincible | 11/12 | 22 | +123 | 4 | **N** | launcher-wt only |
| Chrollo  | hunter_x_hunter | 12 | 22 | +124 | 8* | **N** | **WIP build** (chain didn't fire*) + launcher-wt |
| Superman | dc | 13/13 | 22 | +120 | 4 | **N** | borderline — recov 13 |
| Rengoku  | demon_slayer | 12/13 (air 14) | 20 | +145 | 4 | **N** | borderline — recov 13–14 |
| Shinobu  | demon_slayer | 11/12 | 15 | +148 | 4 | **N** | launcher-wt only |
| Maki     | jujutsu_kaisen | 11/12 | 16 | +150 | 4 | **N** | launcher-wt only — **tight window is BY DESIGN, do not widen** |
| Miwa     | jujutsu_kaisen | 11/12 | 17 | +142 | 4 | **N** | launcher-wt only |
| Toji     | jujutsu_kaisen | 10/10 | 18 | +150 | 4 | **N** | launcher-wt only |
| Saiki    | saiki_k | 22/22/22 | 26 | +159 | 0 | N/A | **EXCEPTION** — psychic/projectile chain, not melee |
| Madara   | naruto | single cmd-normal | — | +146 | 4 | **N** | Fwd+Heavy is ONE Susanoo punch, not a rekka; Susanoo=giant flag |

\* `peakHS=8` for Chrollo / Samurai Red / Gold came from a **non-chain move** (`stages=0` = the rekka never
triggered under the harness input); it reflects their neutral heavy, which *does* get proper weight. Their
actual finisher weight is unmeasured but is light(4) by the same code path as everyone else.

### Non-chain characters (20) — N/A, no command rekka
`goku, piccolo, frieza, cell, gojo, megumi, sukuna, omololu, naruto, sasuke, itachi, rick, morty,
evilMorty, rickPrime, albedo, goku_black, beerus, yuji, green_samurai_ranger`. These have only neutral
normals + specials; their neutral **heavy already gets proper heavy hit-stop** (name `"heavy"` classifies
correctly). No chain-flow signal applies. Not flagged.

## Flag rollup for Step 2
- **Recovery trim (mid-stage ≥14 → 11–12):** Netero, Killua, Hisoka. *(matches the original proven set)*
- **Recovery trim (borderline 13):** Gon, Flash, Superman, Rengoku — trim 13→12 optional, low impact.
- **Launcher-weight (finisher hit-stop light→heavy):** **ROSTER-WIDE**, one central fix in
  `getHitstopFrames`/`createAttackFromMove` so finishers with `launcher`/`spike`/heavy weight freeze at 8.
- **Step-in:** already present & working on all 8 Down chains (+15–25px). **No new step-in needed.**

## Explicit exceptions / extra-verification flags
- **Maki** — tight cancel window is the Heavenly Vow rebalance; leave recovery/window alone.
- **Saiki** — psychic projectile chain (peakHS 0, recov 22–26); melee numeric targets do **not** transfer.
- **Madara Fwd+Heavy** — a single command-normal, not a rekka string; nothing to trim.
- **Chrollo** — build is WIP; the chain did not fire under the harness. Verify wiring before tuning.
- **Samurai Red / Gold** — already hard-code a step-in lunge; chain didn't fire under the harness input
  (may need a form/stance the probe didn't set). Verify before tuning.
- **Giant / transformation forms** (Kurama-Ultimate Naruto, Susanoo Sasuke/Itachi/Madara, Guanyin Netero,
  Adult Gon): separate movesets at different scale/timing — flagged for **extra verification**; the standard
  numeric targets are NOT assumed to transfer.

---

# Step 2 + 3 — Tuning applied (checkpointed, verified)

## Changes made
**Central launcher-weight fix (one place, whole roster):**
- `combat.js getHitstopFrames` + `getSparkCategory` now honor `atk.launcher` / `atk.spike` (they only read
  the name before, so every rekka finisher froze at jab weight even when it launched).
- `abilities.js createAttackFromMove` now propagates `category` (and derives it from launcher/spike flags),
  so a finisher that doesn't LAUNCH can still declare heavy weight with `category:"heavy"` — no physics change.

**HxH recovery trim (hard-flags only):** Netero `down_attck_1` 14→12, Killua `barrage1/2/3` 14→12,
Hisoka `hisokaRekka1` 14→12 — all now inside Tobirama's 11–12 baseline. Cancel window still clears the
~7f input buffer; cancel-on-hit shortens it anyway.

**Finisher `category:"heavy"` tags** for the 9 finishers the launcher flag didn't cover (no physics change,
hit-stop + spark weight only): `down_attck_2` (Netero), `tobiComboFin` (Tobirama), `shinobuG3`,
`ghostfaceCombo3`, `benJab2`, `omLowAttack` (Omega), `makiG3`, `miwaG3`, `reaper3` (Toji). Maki's tag is
**weight only** — the Heavenly-Vow tight cancel window is a separate field and is untouched
(`test:maki-cancel-window` 16/0).

## Before → after (finisher impact-freeze, `harness/combo_momentum_audit.mjs`)
Every rekka finisher the harness reaches went **4f (light/jab) → 8f (HEAVY)**, attributed to the actual
finisher move (`@barrage4`, `@tobiComboFin`, `@makiG3`, `@shinobuG3`, …). Step-in drift on the 8 Down
chains is unchanged (+15–38px; already correct). Two rows stay "light" **by design/limitation**: Toji
(harness can't drive the blade-stance reaper opener — `reaper3`→8f verified deterministically) and Saiki
(psychic projectile chain, no melee freeze — intentional exception).

## Regression (per-group + broad sweep — all green)
netero 38 · killua 24 · hisoka 39 · gon 37 · shinobu 35 · ghostface 18 · tobirama 31 · minato 47 ·
ben10 57 · omega-ranger 34 · maki 30 · **maki-cancel-window 16** · miwa 25 · toji 34 · zenitsu 53 ·
rengoku 41 · vegeta 72 · omniman 36 · superman 27 · batman 33 · flash 29 · naruto 21 · madara 45 ·
susanoo 24 · itachi-susanoo 19 · itachi-specials 16 · sukuna-cursed-slash 11 · **hitstop 23 · combo-decay
18 · combo-flow-roster 18** — all 0 failed.

## Intentionally SKIPPED / exceptions (not a miss)
- **Recovery borderlines (13f):** Gon, Flash, Superman, Rengoku — left as-is (hard-flags-only decision).
- **Maki** — tight cancel window preserved (Heavenly Vow); only finisher weight added.
- **Saiki** — psychic projectile chain; melee targets don't apply.
- **Madara Fwd+Heavy** — single Susanoo command-normal, not a rekka; nothing to trim.
- **DC / Dragon Ball / Invincible / Power-Rangers Samurai** finishers already carried launcher flags →
  auto-fixed by the central change, no per-char edit needed.
- **21 non-chain characters** — no command rekka; neutral heavy already weighted correctly.

## Pre-existing failures (PROVEN unrelated to this work)
`test:chrollo` (4), `test:gold-samurai` (9), `test:saiki` (1). Isolated by surgically reverting the central
logic edits and re-running: failure counts were **identical** with and without my changes (gold 13/9 either
way; saiki 40/1 either way). Root cause is concurrent uncommitted WIP drift in shared files (chain wiring /
Mega-form / hit-registration), not the combo-flow tuning. Reported, not folded in.
