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
