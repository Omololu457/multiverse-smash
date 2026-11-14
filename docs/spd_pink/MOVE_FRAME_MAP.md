# S.P.D. Pink — Move / Frame Map (source: `spdPinkData.js`, all `frameExact`)

Raw damage is the **authored** value. Play multiplies it by `SPD_PINK_DAMAGE_SCALE` (1.7, roster-parity pass) and then by the global 0.60. HP is 1120 (was 980) and energy 100.
Adv = frame advantage. The hit/block values were **measured live** by `harness/spd_pink.test.mjs`. Variety rows show authored data only.

| Input | Move | Raw | St/Act/Rec | Notes | Adv hit / block |
|---|---|---|---|---|---|
| Light (×3, fresh retaps on clean contact) | light → pJ2 → pJ3 | 17 / 21 / 29 | 5/2/10 · 6/2/12 · 10/3/18 | baton jab chain | +5/−2 · +6/−3 · +6/−10 |
| **Forward+Light** | pKnee Rose Knee | 34 | 11/3/20 | pops the foe up about 43px (knockbackY −9); follow up with a manual jump | |
| Heavy | heavy | 58 | 15/3/26 | | +11/−16 |
| Heavy with Iron Reserve | heavyIron | 70 | 18/3/32 | consumes the charge on start | +5/−22 |
| Down+Light | pLow | 25 | 8/2/16 | low | +6/−7 |
| Up+attack | up | 42 | 12/3/22 | launcher | +9/−14 |
| air attack | air / down_air | 30 | 8/3/17 | | |
| Forward+Heavy → Heavy → Heavy | pCheck → pKick → pAway | 24 / 32 / 44 | 10/3/19 · 12/3/21 · 14/3/26 | rekka | +10/−11 · +12/−13 · +5/−18 |
| Neutral Special | pShot Deltamax Shot | 38 | 16/1/24 | cost 12, finite, non-piercing | |
| Forward Special | pBreaker Iron Breaker | 56 | 17/3/28 | cost 20, about 90px travel | +7/−16 |
| Forward Special with Iron Reserve | pBreakerIron | 72 | 20/3/34 | about 90px travel (slower), consumes the charge | +1/−22 |
| Down Special | pRise Rising Check | 42 | 11/10/24 | cost 18, 16f landing | −3/−23 |
| Back Special | pStance Baton Reprisal | — | 8 / 12 window / 26 | cost 18, cd 180, answers once | |
| (automatic) | pReprisal response | 40 | 6/3/20 | blockable, counter-bypass (no recursion) | +6/−10 |
| air Down+Special | pRose Falling Rose | 44 | 12/≤40/1 | cost 15, capped descent, 24f landing, once per airtime | |
| Charge | pPrep Iron Reserve | — | 12/24/12 | cd 180, one charge, 300f life | |
| **Down+Heavy** | pSweep Cartwheel Sweep | 40 | 12/3/24 | low, **knockdown** on hit | |
| **Back+Heavy** | pEvade Handspring Away | 0 | 1/14/20 | 100px back, invulnerable 7f, no hitbox, free | |
| **air Special** | pAirShot Air Deltamax | 32 | 10/1/16 | cost 10, downward shot, once per airtime | |
| **Up+Special** | pVault Vault Kick | 40 | 16/3/20 | cost 15, **overhead**, about 56px forward | |
| **↓↘→+Special (with Iron Reserve)** | pBar1 → pBar2 → pBar3 Iron Barrage | 20 / 20 / 38 | 10/2/3 · 3/2/3 · 4/3/24 | cost 20, spends the charge; the last hit knocks down. If any stage is **blocked**, the string ends with an 18f stop | |

| **↓↙←+Special (ground, neutral)** | pFlip Flip Shot | 30 | 6/12/18 | cost 16, backflip 80px (invulnerable 5f, no hitbox), then one Deltamax shot at the end of the flip; shares the one-shot cap | |

Without a reserve charge, ↓↘→+Special is the ordinary Iron Breaker.

Ultimate: the shared Ranger Zord is not present in the project. The press is consumed, spends nothing, and has no fallback (`SPD_PINK_ZORD.enabled=false`).
