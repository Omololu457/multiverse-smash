# S.P.D. Yellow — measured combos and balance

Every number below was MEASURED by `harness/spd_yellow.test.mjs`, which uses real keyboard input through the real parsers against a standing dummy.
The raw data is in `docs/spd_yellow/mechanics_results.json`.

- "True combo" = every hit after the first landed while the defender was still in hitstun (logged the frame before).
- Damage is HP actually removed (HP 1100 opponent).
- The Ranger roster-parity lever (×1.7 in `dmg()`) cancels the engine's global damage scale (measured 0.586), so in-play damage equals the authored raw values.

## Single hits

| Action | Damage | Cost | Notes |
|---|---|---|---|
| Snap Jab | 17 | – | |
| Compact pistol | 28 | 10 | shot leaves on frame 12 (measured) |
| Long gun | 63 | 25 | released at 26 f → fires 5 f later (30 f minimum brace) |
| COVER ME (duplicate shot) | 18 | 1 coin + 8 (+ 20 for the duplicate) | |
| Ninja Intercept | 36 | 15 + pip | |
| Rising Kick order | 40 | 18 + pip | launches |
| Echo of Snap Jab | 10 | 8 | 60 % of raw 17 |
| Ultimate (clean opener) | 273 | 100 | 8 hits: 20 / 30 / 30 / 36 / 30 / 30 / 46 / 51 |
| Ultimate with Showcase | 273 | 100 + 3 coins | identical hits and damage |

## Routes

| Route | Hits | Damage | Energy | Coins | Verdict |
|---|---|---|---|---|---|
| Light → Light → Light | 17 / 21 / 26 | 64 | 0 | +1 | true combo (both facings) |
| Light ×3 → Special (pistol cancel) | 17 / 21 / 26 / 24 | 88 | 10 | +2 | true combo |
| Down+Light → Heavy | 24 / 52 | 76 | 0 | +1 | true combo |
| Heavy → Ultimate (recovery cancel) | 52 + 8 raid hits | 280 | 100 | +1 | true combo |
| Light → Echo → Partner Break | 17 / 10 / 37 | 64 | 8 | +2 | true combo |
| Light → Echo → Relay swap → Light | 17 / 10 / 16 | 43 | 8 | +2 | true combo |
| BREACH: long gun → Sword Finish | 63 / 51 | 114 | 55 (10 order + 25 gun + 20 sword) | −2 | true combo |
| RISING KICK → jump forward → Air Light | 40 / 30 | 70 | 18 | +1 | true combo |

## Balance notes

- **Health and resources.** HP 1100 matches the Ranger parity pass, and the Megazord budget sits below White's: Yellow's Megazord raws are 36 / 40 / 50 against White's 38 / 44 / 54.
- **Coins are slow by design.** A full bank needs three different clean confirmations, and the coin-funded actions never pay coins back, so there are no coin loops (tested).
- **Best non-meter punish** is BREACH → Sword Finish (114). It costs 2 coins, 55 Energy and a pip, and it needs a clean long-gun hit at range. Without the coins, the same long gun is 63.
- **The duplicate dies to any one hit or projectile.** Pressuring it is the intended counterplay. Echo and Cover Me are telegraphed: the clone's startup ring and dashed foot ring show them.
- **Ultimate.** 270 raw before scaling is in line with White (280) and Black.
