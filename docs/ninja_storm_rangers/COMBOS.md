# Ninja Storm Rangers — Combos

Every number below was **measured on the real game loop with real key input** by `harness/msv2_combos.mjs`, with S.P.D.
Red standing as the dummy (output: `combos_measured.json`). A route counts as a **true combo** when the foe never leaves
hitstun / knockdown between the first hit and the last. Damage = the health the dummy actually lost (everything the engine applies is already in it).

- **Scaling:** 85% per hit: `nsComboScale = 0.85 ^ comboCounter` (combat.js `COMBO_DAMAGE_CURVE` hook). Clone echoes and
  the ultimate use the same curve.
- **Reset:** the combo counter drops after 1.5 s (90 frames) without a hit (the engine's shared `comboTimer = 90`).
- **Keys:** J Light · K Heavy · L Special · ; Block · U Ultimate · W/A/S/D move. `↓↓ K` = the stance dial (↓, ↓, then
  Heavy within 18 f) → Dustin; `↓↓ J` → Shane.

## Red stance (Shane)

| Route | Inputs (P1 keys) | Hits | Damage | True combo | Ends in |
|---|---|---|---|---|---|
| Jab → Straight → Kick | `J, J, K` | 3 | 118 | ✅ | Red |
| Jab → Rising Kick (↑+H) launcher | `J, ↑+K` | 2 | 93 | ✅ | Red |
| Jab → Straight → Crescent Blade (↓↘→+S) | `J, J, ↓↘→+L` | 5 | 111 | ✅ | Red |
| Low Kick → Kick | `↓+J, K` | 2 | 86 | ✅ | Red |
| Lightning: Jab → Straight → Kick (+15%) | `(J+K+L) … J, J, K` | 3 | 136 | ✅ | Red |
| Shadow Clone → Jab → Straight → Kick (echoes) | `(←+L) … J, J, K` | 5 | 139 | ✅ | Red |

## Yellow stance (Dustin)

| Route | Inputs (P1 keys) | Hits | Damage | True combo | Ends in |
|---|---|---|---|---|---|
| Tackle → Shoulder Check → Stomp Kick | `J, J, K` | 3 | 118 | ✅ | Yellow |
| Tackle → Low Sweep → Stomp Kick | `J, ↓+J, K` | 3 | 106 | ✅ | Yellow |
| Quake: Tackle → Shoulder Check → Stomp (kb ×1.6) | `(J+K+L) … J, J, K` | 3 | 118 | ✅ | Yellow |
| Tackle → Earth Blade (↓↘→+S) | `J, ↓↘→+L` | 4 | 73 | ✅ | Yellow |

The two stances share the same normal frame data (the brief: "same numbers, don't duplicate the table"). Tackle → Shoulder
Check → Stomp does exactly what Jab → Straight → Kick does (118 both). Quake Mode adds knockback (×1.6 + knockdown on the
heavy), not damage: same 118.

## Stance-swap combos: the swap is a combo tool

| Route | Inputs (P1 keys) | Hits | Damage | True combo | Ends in |
|---|---|---|---|---|---|
| Red Rising Kick → ↓↓+H (Dustin) → jump → Air Stomp | `↑+K, ↓↓ K, ↑ (jump), J` | 2 | 120 | ✅ | Yellow |
| Red Jab → Straight → ↓↓+H → Yellow Low Sweep | `J, J, ↓↓ K, ↓+J` | 3 | 104 | ✅ | Yellow |
| Red Rising Kick → ↓↓+H → jump → Rock Drop (air Heavy) | `↑+K, ↓↓ K, ↑ (jump), K` | 2 | 120 | ✅ | Yellow |
| Yellow Stomp → ↓↓+L (Shane) → Crescent Wave | `K, ↓↓ J, ↓↙←+L` | 2 | 93 | ✅ | Red |

How it works: the dial is **instant** (no startup, 0 Focus). It is accepted on the first free frame after a connected
normal, so the foe is still in hitstun when the new stance arrives.

- **Launcher → swap → air finisher** (the brief's example): Shane's Rising Kick launches. ↓↓ K tags Dustin in while they are
  still airborne. Jump, then air Light (Air Stomp) **2–4 frames after the jump** (air Heavy / Rock Drop: 2–8 frames).
  120 damage, ends in Yellow.
- **Tag out of a string:** Jab, Straight, ↓↓ K, Dustin's Low Sweep. 3 hits, 104.
- **Knockdown → swap → projectile:** Dustin's Stomp knocks down, ↓↓ J brings Shane back, Crescent Wave hits them as they land.

What a swap costs inside a combo: the 30-frame lockout (no swapping straight back). The swap also **removes a live
Shadow Clone** and its queued echoes, and **ends the active Mode**. So a clone-echo string cannot also swap.
