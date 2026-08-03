# Maki Zenin — Balance Pass (Stage 5)

Compared against `BALANCE_AUDIT.md` bands + the live `characters.js` roster census. **Verdict: FAIR — no stat outliers, no damage-scale bypass; the HP-gated ultimate is a self-restricting comeback, not a power advantage.**

## Core stats — all in-band

| | HP | Energy | ATK | DEF | SPD |
|---|---:|---:|---:|---:|---:|
| **Maki** | **1180** | **0** | **90** | **84** | **94** |
| band | 980–1600 | — | 82–104 | 74–100 | 80–99 |

- **HP 1180** ties Naruto/Sasuke, below Toji 1260, above Rick 1050. Mid.
- **ATK 90** = Goku Black; below Toji 96 / Sukuna 95 / Netero 98. Mid.
- **DEF 84** mid. **SPD 94** = Netero/Gold-Samurai; below Toji 98 / Minato 98 / Shinobu 97. Upper-mid.
- **No ceiling/floor records.** Every value sits comfortably inside existing bands (contrast Netero's deliberate Atk-98/HP-980 outliers).

## Damage — entirely on the HONEST side of the GLOBAL_DAMAGE_SCALE finding

The audit's biggest systemic finding: summons / manual-subtract ults / DOT **bypass** the ×0.60 scale and hit 1.667× harder. **Maki bypasses nothing:**

| Path | RAW | Scaled ×0.60? |
|---|---|---|
| Normals light/heavy/up/air/downAir | 46/84/66/56/74 | ✅ `createAttackFromMove` |
| Command chain G1/G2/G3 | 28/34/46 | ✅ `createAttackFromMove` |
| Kunai Throw (projectile) | 52 | ✅ `spawnProjectile` |
| Nunchaku Flurry (melee) | 78 | ✅ `createAttackFromMove` |
| Power Charge | buff (1.3×) | — no manual subtract |
| **Shibuya-Arc Ultimate** | **buff-mode 1.25×** | — no manual subtract |

heavy 84 RAW is upper-mid (Toji 96) → EFF ≈ 50; nunchaku 78 RAW is a committed special (EFF ≈ 47). All honest.

## The HP-threshold Ultimate — fair or outlier?

**Mechanic is novel; power is in-band → FAIR.**

- **It is a RESTRICTION, not an advantage.** Maki has NO meter, so unlike every other character (who builds toward their ultimate), she has **zero ultimate access until beaten to ≤25% HP** — no ult for the first ~75% of her health bar. That is a real drawback, not a freebie.
- **Payoff is a buff-mode transform** (1.25× dmg / 1.1× spd / 1.05× def + moveset swap), squarely in the buff band: Killua Godspeed 1.25×, Hisoka Overdrive 1.3×, Toji Heavenly Restriction 1.6–1.8× (temporary). Maki's 1.25× is permanent-for-the-round but modest — arguably weaker per-instant than the temporary buffs, traded for duration.
- **Self-balancing comeback**: strongest only when nearest death (and nearest losing). One-way per round; resets to base each round.

## Flags to monitor in playtest (not blockers)

1. **Power Charge generosity** — 1.3× damage, ~55% uptime (5s buff / 9s recast), **no resource cost** (she has none). It IS cooldown-gated and commits recovery frames (vulnerable during the pose), and only boosts damage. Borderline-generous for a base special; if it over-performs, drop to 1.25× or extend the recast.
2. **Power Charge × Shibuya stack** — Power Charge clones the active form, so in Shibuya it yields 1.25 × 1.3 = **1.625×** for the 5s window. Only reachable after the ≤25%-HP comeback gate, ~55% uptime — comparable to Toji's 1.8× ult burst. Acceptable; monitor.

**Bottom line:** Maki reads as a fair, honest-pipeline physical bruiser whose signature HP-gated transform is a risk/reward comeback, balanced by the loss of any early-game ultimate access.

---

# "HEAVENLY VOW" REBALANCE (2026-08-03)

**Design intent:** make Maki's BASE KIT read as a physically *superhuman* fighter — faster and harder-hitting than the roster average (a body built entirely around physical output, no cursed energy) — with a **deliberate, per-character tightening of her combo-execution window** as the explicit counterweight. High-risk / high-reward precision character, not a flat buff.

## Speed + power — moved to the TOP of the band (not new outliers)

| | ATK | DEF | SPD | dashSpeed |
|---|---:|---:|---:|---:|
| **before** | 90 | 84 | 94 | 20 |
| **after** | **96** | 84 | **98** | **22** |
| band / note | ties Toji 96, ≤ Sukuna 100 (ceiling) | mid (unchanged) | ties Toji/Minato = roster top | superhuman burst |

Roster **speed mean = 85.8**; Maki 98 is **+14%** above average (2nd-highest). Verified live: over 40 frames Maki walks **~355px vs Sukuna's ~310px** (ratio ≈ 1.14, tracking the 98/86 stat ratio).

## Damage — raised ~+17–20%, still 100% on the HONEST ×0.60 pipeline

| Path | RAW before → after | EFF after (×0.60) |
|---|---|---:|
| light / heavy / up / air / downAir | 46/84/66/56/74 → **54/98/78/66/88** | 32/59/47/40/53 |
| Command chain G1/G2/G3 | 28/34/46 → **34/40/56** (130 RAW string) | ~72 EFF full string |
| Kunai Throw (projectile) | 52 → **60** | ~36 |
| Nunchaku Flurry (melee) | 78 → **92** | ~55 |

No bypass anywhere — every path still runs `createAttackFromMove` / `spawnProjectile` → ×0.60. **heavy 98 RAW (EFF ≈ 59)** is now the roster's 2nd-hardest heavy (Sukuna 100 is the ceiling); this is the single deliberately-flagged top-of-band value.

## The counterweight — a TIGHTENED cancel window (per-character override)

The shared combo-flow cancel layer opens the rekka link for the **entire recovery phase** by default (~11–16f). Maki now sets a **per-character override** `_cancelWindowFrames = 5` (new `combat.cancelWindowOpen`), narrowing her link to the **first 5 frames of recovery (~83ms)** — tighter than the roster-default `INPUT_BUFFER_FRAMES` reference (7f / ~120ms). Her move recovery/punishability is **unchanged** (pure timing nerf, not a stealth buff). Enforced & scoped:
- **Enforced (live):** an in-window Heavy links the full G1→G2→G3 string (74 dmg); the SAME press placed one beat late is REJECTED — the string drops to just the opener (20 dmg). (`maki_heavenly_vow.mjs`)
- **Scoped to Maki only:** her real command path stamps the override; Miwa's identical rekka path does NOT (`_cancelWindowFrames === undefined`) and keeps the full window. No other character is affected. (`maki_cancel_window.test.mjs`, `combo_flow_roster.mjs` 18/0)

## Fair trade, or outlier?

**FAIR — a deliberate top-of-band lean, paid for by a real execution barrier.**
- Speed 98 and ATK 96 both **tie existing roster maxima** (no NEW ceiling record; Sukuna's 100 ATK still leads). She reads as superhuman without breaking any band.
- The power is genuinely gated behind **precision**: her bread-and-butter string only pays off on a ~5-frame link. A mistimed input yields ⅓ the damage — the tradeoff is real and enforced in-engine, not cosmetic.
- **Watch-items (not blockers):** (1) heavy 98 RAW is the flagged top-of-band value — if her neutral over-performs despite the tight combo, trim heavy toward 92 before touching speed; (2) the tight window compounds with Power Charge / Shibuya buffs — but those are cooldown/HP-gated, and the execution barrier caps her realized DPS. If the 5-frame link proves *too* punishing in playtest, 6f (~100ms, still under the 7f default) is the release valve.
