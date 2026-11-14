# Roster-Parity Stats Pass (2026-11-13, owner request)

The owner reported that the recent Power Rangers and One Piece fighters "do very little damage and have very little health".

## How damage works here
- Every hit goes through `combat.applyScaledDamage`, which uses one global scale (`GLOBAL_DAMAGE_SCALE = 0.60`).
- The `attack` and `defense` stats are display-only. Balance is therefore set by each move's authored raw damage and by `stats.maxHealth`.

## Measured before (vs 137 fighters: HP median 1150 · light 42 · heavy 80 · low 38 · up 66 · air 54)
| Fighter | HP (percentile) | Light / Heavy (percentile) |
|---|---|---|
| spd_blue | 1000 (p11) | 18 (p4) / 56 (p4) |
| spd_green | 980 (p7) | 17 (p2) / 52 (p2) |
| spd_pink | 980 (p7) | 17 (p2) / 58 (p7) |
| krybot | 900 (p0) | 16 (p1) / 50 (p1) |
| luffy | 1000 (p11) | 18 (p4) / 58 (p7) |
| spd_red | 950 (p3) | 40 / 85 (fine) |
| zoro | 1000 (p11) | fine |
| sanji | 940 (p1) | fine |
| buggy | 950 (p3) | fine |
| arlong | 1120 (p38) | fine |

## Changes
- **Damage:** one per-character lever multiplies every authored damage value:
  - `SPD_BLUE_DAMAGE_SCALE`, `SPD_GREEN_DAMAGE_SCALE`, `SPD_PINK_DAMAGE_SCALE`, `KRYBOT_DAMAGE_SCALE`, `LUFFY_DAMAGE_SCALE` = **1.7** (the geometric-mean gap to the roster medians was 1.65–1.84).
  - It covers the move tables, grabs, Iron Reserve raws, Luffy's multi-contact arrays and Krybot's literal shot/super values.
  - Frame data and the ratios between moves are unchanged.
- **HP:**
  - Blue 1150, Green 1120, Pink 1120, Krybot 1080, Luffy 1150
  - Red 1120, Zoro 1170, Sanji 1100, Buggy 1100, Arlong 1220
- **Not touched:** MMPR / Samurai / Omega Rangers (already at roster level) and every other fighter. A frame-data diff over all 137 fighters confirms that only these 10 changed.

## After
| Fighter | HP (pct) | Light / Heavy (pct) |
|---|---|---|
| spd_blue | 1150 (p45) | 31 / 95 |
| spd_green | 1120 (p34) | 29 / 88 |
| spd_pink | 1120 (p34) | 29 / 99 |
| krybot | 1080 (p22) | 27 / 85 |
| luffy | 1150 (p45) | 31 / 99 |

The jabs stay below the median on purpose: they are 5f chainable pokes. Heavies, specials and combos now sit in the roster band.

## Tests updated (expectations only, to the new intended values; nothing loosened)
- Pink / Green / variety tests derive HP and damage from the scale (`sc(v)=round(v*1.7)`). The chip thresholds scale by the same factor.
- `luffy.test` identity HP is 1150.
- `krybot_routes` reads the starting HP from the match instead of the literal 900.
- The Codex frozen roster baselines (`docs/krybot/roster_baseline.json`, `docs/spd_blue/roster_baseline.json`) were refreshed **only** for the rebalanced keys. Every other entry was verified unchanged (132/133 entries).
- Historical per-build frame-data gates (`*_framedata_diff`) compare against old start commits. They now list exactly the rebalanced fighters as diffs, which is expected, and were left as they were.

## Second step — damage boost ×1.3 (same day, owner: "increase the damage … a lot", Power Rangers + One Piece)
- New `rosterParity.js` holds `ROSTER_DAMAGE_BOOST`: spd_red, spd_blue, spd_green, spd_pink, krybot, luffy, zoro, sanji, buggy and arlong are each **×1.3**.
- One gated line at the start of `combat.applyScaledDamage` multiplies damage by `rosterDamageBoost(opts.attacker || opts.boostFrom)`.
  - It covers melee, projectiles, munitions and the kits' own `W.damage` (Sanji burns, Arlong / Buggy specials, supers).
  - Chip and both grab paths now pass `boostFrom: attacker`. The shared throw is a flat 90 that ignores per-character grab data, so this is the only way the boost reaches throws.
- Unlisted fighters return 1, so their damage is byte-identical.
- Total for the SPD trio, Krybot and Luffy: data ×1.7 × boost ×1.3 ≈ ×2.2 of their original output. Red and the One Piece four: ×1.3.
- Verified live: Barrier Bash (raw 44 → 75 after the data scale) landed for 58 = 75 × 0.60 × 1.3.
- Older Rangers (MMPR, Samurai, Omega) are **not** boosted. They were already at roster level and weren't part of the recent builds. Add them to the table if wanted.

**2026-11-14 follow-up — Zoro Heavy 90 → 100.**
- Luffy's ×1.7 data scale raised his Heavy to 99 raw, which inverted Zoro's documented matchup identity (zoro_matchups: "Zoro out-damages Luffy").
- Zoro's Heavy is now 100, so he stays the harder hitter while both got buffs.
- Tests that hard-coded the raw values now derive them from `ZORO_MOVES` / `ZORO_TUNING`.
- The roster baselines were refreshed for `zoro.basic_attacks` only.
