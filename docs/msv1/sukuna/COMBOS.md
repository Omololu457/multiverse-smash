# MSV1-SUKUNA — Inputs and combos

## Input table (P1 keyboard / P2 keyboard / pad)
Buttons: Light J / 1 / Square · Heavy K / 2 / Triangle · Up-Attack I / 3 · Special L / 4 / R1 · Ultimate U / 5 / R2 · Charge P / L2 · Grab O / L1.
Directions are relative to the way he faces (→ = toward the foe).

| Move | Input | Same as the old Sukuna? |
|---|---|---|
| Punch string 32 / 32 / 48 | Light, Light, Light | — |
| Heavy punch 74 | Heavy | — |
| High kick (launcher) 82 | Up-Attack (or Up + Heavy) | — |
| Rising knee 76 (anti-air) | ↓ + Heavy | — |
| Dash attack 58 (low) | Light / Heavy while dashing, or ↓ + Light | — |
| Jump attack 62 | air Light / Heavy | — |
| Grab | Grab | yes (engine throw) |
| **Cleave** | Special (neutral) | **yes** (old neutral Special = Cleave) |
| **Dismantle** | ↓← + Special; hold Special → 3-cut fan; in the air → angled down; ↑ + Special → upward | **yes** (old ↓← + Special = Dismantle) |
| **Fuga** | → + Special, hold to gather (release, or auto-fire at 2 s) | **yes** (old → + Special = Flame Arrow / Fuga) |
| Spiderweb | ↓↓ + Special | new |
| Domain Amplification | ↓↓ + Charge | new |
| World-Cutting Slash | ↓↓ + Ultimate (2 bars) | new |
| **Malevolent Shrine** | Ultimate (full meter) | **yes** |

The brief's motion inputs (↓↘→+S Dismantle, →+S close Cleave, ←↙↓↘→+S Fuga) would clash with the old Sukuna's
inputs, and the brief says shared techniques keep the old ones. So the old inputs win: ↓← for Dismantle,
neutral for Cleave, → for Fuga.

Cancels: A1 → A2 → A3 on contact. Any normal → Heavy (once), → launcher, or → any technique (Special) on contact.
After a launcher hit he can jump-cancel.

## Combos (verified with real keyboard input in training: `harness/sukuna_shinjuku.test.mjs --only=combos`)

| # | Name | Input | Hits | Damage vs old Sukuna (1240 HP) |
|---|---|---|---|---|
| 1 | Know your place | Light, Light, Light, Heavy, Up-Attack | 5 | 229 |
| 2 | Cut | Light, Light → Special (Cleave) | 3 | 185 |
| 3 | Web finish | Light, Light, Light → ↓↓ + Special (Spiderweb) | 4 | 164 |
| 4 | Heavy → Dismantle | Heavy → ↓← + Special | 2 | 123 |

Situational: **Shrine, then Fuga.** Ultimate, then → + Special within 3 s of the Shrine ending gives an Empowered Fuga:
instant max level, 200 × 1.5 = 300 (measured).
**Through the Infinity** (vs Satoru Gojo, Shinjuku): ↓↓ + Charge, then Heavy lands at Infinity L1, L2 and L3 (measured).
