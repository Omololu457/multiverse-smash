# Roster rebalance — 2026-11-17

Everyone except **ben10 / albedo** (skipped entirely). `replay.js` `BALANCE_STAMP` → `rebalance-2026-11-17-v1`
(old replays are refused with a clear "balance … != …" reason instead of desyncing).

## How the outliers were found

1. **Static frame/damage data** from `characters.js` (108 playable fighters): HP, speed, defense, light/heavy
   damage + startup / recovery / hitstun. Roster medians: HP 1150 · speed 92 · light 44 dmg / 4f startup / 10f recovery ·
   heavy 88 dmg / 8f / 18f · light on-hit advantage (hitstun − recovery) +3 (p90 +8).
   A composite score (power + safety + bulk + speed, z-scored) ranked everyone; the "fast + strong + safe" filter is
   speed z ≥ 0.8, power z ≥ 0.8, safety z ≥ 0.3.
2. **AI-vs-AI batch** (`tools/balance/aivsai_batch.mjs`, new): every fighter vs naruto / ichigo / luffy / vegeta, both
   CPUs on "adaptive", sides swapped — 8 real-sim matches each, ~860 matches total.
   **Finding: the batch measures how well the CPU drives a kit, not the fighter.** Kits that ship their own CPU AI
   (all Rangers, the Incredibles, Batman, One Piece, Cyborg, Syndrome) won 100 %, even statically weak ones
   (Elastigirl: lowest damage in the roster, 8/8). Older anime kits without kit-specific CPU logic went 0 %, even the
   statically strongest (Baki: 72/112 normals, 0/8). So the batch was **not** used on its own to justify a change — a
   fighter was only touched when the static data flagged it. The CPU-coverage gap is logged in `docs/QOL.md` as follow-up.
3. **Ultimates**: the cinematic sure-hit band documented in `BALANCE_AUDIT.md` is 280–380 effective (Kurama TBB 600 raw
   ×0.60 = 360; Ranger Mega ults 460 raw ×0.60 = 276). No ultimate sits outside the band → **no ultimate changed**.

## Changes (all in `characters.js` basic_attacks / stats)

| Fighter | Change | Why |
|---|---|---|
| Zenitsu | light 90 → 80, heavy 130 → 118 | Fastest-and-strongest outlier: speed 96, 3f light at **2× the roster median damage**. Half of the church-playtest +40 kept → still the top light-damage band. |
| Shinobu | light 84 → 76, heavy 118 → 108 | Same profile (speed 97, 3f / 7f-recovery light — the safest light in the roster at that damage). Poison ult/finisher untouched. |
| Nezuko | light 82 → 74, heavy 114 → 104 | Same Demon Slayer fast/strong profile (speed 95); her block comment says these were placeholders awaiting a balance pass. |
| Inosuke | light 82 → 74, heavy 120 → 110 | Same profile; keeps parity with the other three. |
| Maki | light 79 → 72, heavy 123 → 112 | Speed 98 (roster top) + 3f light at 79 = the fast+strong+safe outlier the brief names. Still top-band. |
| Soldier Boy | light 22 → 30, heavy 62 → 72 | Bottom of the composite: slowest-tier speed (79) **and** the weakest light in the roster. Now at the roster's p10 instead of below it. `soldier_boy_combo.test` updated (combo totals 128/118/203 → 143/132/211). |
| Six Paths of Pain | heavy 62 → 70 | Weakest heavy in the roster (tied). Light is shared by the 4 Paths' entries, so left alone. |
| Vilgax | light startup 7 → 5 | Slowest jab in the roster (7f vs median 4, p90 5) on a slow (82) bruiser — every exchange lost. |
| Rick | light recovery 12 → 10 | Most unsafe light (12f, tied max) with below-median damage; now median. |
| Green Arrow | maxHealth 920 → 980 | Lowest HP **and** lowest speed (79) at once; zoner keeps the glass identity, just not both minima. |

## Looked at, deliberately NOT changed

- **Jesus** (top of the composite: 1400 HP, 82/122 normals) — `characters.js` says "Deliberately TOP-OF-ROSTER stats
  (per explicit design request)". Left as the owner designed; flagged here.
- **Rengoku / Baki** — strong normals but bruiser speed (92) / 0 % in the batch; inside the band.
- **SPD Red heavy (+24 "advantage")** — it's a launcher (44f airborne hitstun is the juggle window), not a frame outlier.
- **Rangers' lights (+10 / +11 on hit)** — high vs the roster median but **identical across the Ranger archetype**
  (the brief's "similar archetypes, similar frame advantage"), and their combo routes are built on it.
- **Projectiles / zoners** — Phase 1's flawless block now negates chip and collapses blockstun on projectiles too, and a
  perfect parry pushes + opens the attacker, so zoning already has a skill answer; no projectile data changed.

## Verification

determinism 14/0 · combo-standard 233/9 (the 9 pre-existing) · up-attack-roster 77/2 (pre-existing) · roster-integrity ✓.
Per-fighter: shinobu 35/0 · maki_cancel_window 16/0 · soldier_boy_combo 11/0 (updated) · soldier_boy_kit 28/0 ·
soldier_boy_armed 22/0 · green_arrow_roster 15/0 · green_arrow_arrows 16/0 · zenitsu 52/1 · inosuke 37/2 · maki 29/1 ·
rick 34/1 · rick_features 18/7 · six_paths_pain 35/1 · vilgax 26/13 — **every one of those failures is identical on
HEAD's stats** (re-run in a clean clone): taunt/Meeseeks/Power-Charge/push/render checks, none touch normals.
