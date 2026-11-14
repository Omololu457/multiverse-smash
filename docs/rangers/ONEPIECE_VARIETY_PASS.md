# One Piece Variety Pass (2026-11-13, owner request)

These moves follow the same layer template as the S.P.D. Ranger pass, with S.P.D. Red as the model.
- Each move is a canon technique where one fits.
- Animation reuses each fighter's own existing strips, re-timed. No new art.
- Verification: `node harness/onepiece_variety.test.mjs` (real keyboard input) writes `docs/rangers/onepiece_variety_results.json`. Result: **26/0**.

## Luffy (biggest gap; previously no motions, command normals or evade)
| Input | Move | Raw (authored; ×1.7 data scale and ×1.3 boost in play) | Notes |
|---|---|---|---|
| Forward+Light | Gomu Gomu no Kane `lfKane` | 40 | 14f stretched-neck headbutt, mid range |
| Down+Heavy | Gomu Gomu no Muchi `lfMuchi` | 40 | 13f, long low leg whip (hits from a 140px gap), **knockdown**. Down+Light keeps Rubber Sweep |
| Back+Heavy | Rubber Hop `lfHop` | — | evade, ≈83px back, invulnerable 1-6, no hitbox |
| air Heavy | Gomu Gomu no Stamp `lfStamp` | 38 | 11f long aerial. Air Light keeps Air Heel |
| ↓↘→+Special | Gomu Gomu no Gatling `lfGatling` | 5×10 + 22 | 6 contacts, all land (measured), cost 22 |
| ↓↙←+Special | Gomu Gomu no Bazooka `lfBazooka` | 70 | 20f two-palm shove, knockback 16, cost 25 |

- The ↓↘→ / ↓↙← read is the same deterministic rule as the Rangers'. It uses a 16-tick raw history, latched at the Special press.
- Plain Neutral, Forward and Back Special still give Piston, Reel-In and Brace (tested).

## Zoro
| Input | Move | Raw | Notes |
|---|---|---|---|
| Back+Heavy | Iai Backstep `zStep` | — | evade, ≈95px back, invulnerable 1-6, no hitbox (new `step` kind in zoroState) |
| air Heavy | Nitoryu Air Cross `zAirH` | 70 | 9f bigger downward cross. Air Light keeps Air slash |
| Up+Special | Nitoryu: Nigiri `zNigiri` | 80 | 8f anti-air launcher, invulnerable 1-4, −14 on block, cost 12 |

Down+Heavy was left alone, because *holding* it is NAP.

## Sanji / Buggy / Arlong (already deep kits: air Heavy split only)
- Sanji Axe-Heel Stomp `sAirH`: 80 raw, 9f.
- Buggy Bara Bara Air Carve `bAirH`: 70 raw, 9f, 112px reach. Tested against Zoro, because Bara Bara makes Buggy immune to slash damage in the mirror.
- Arlong Shark Dive Claw `aAirH`: 90 raw, 10f, blunt, so it works with or without Kiribachi.

## Layer 5 (2026-11-14)

- **Buggy — Bara Bara Split Cut `bSplit` (Back+Heavy)**
  - 60 damage, 11f startup, −6 on block.
  - His body splits 60px backward (direct x displacement during frames 1–10, wall-clamped) while the knife hand lunges out with 170px reach. This punishes walk-ins from a 120px gap.
  - New `bg.kind:'split'` case in buggyState.tickMove.
- **Arlong — Shark Tail Sweep `aTail` (Back+Light)**
  - 80 damage, 12f startup, LOW, 118px reach, knocks down (`al.knockdown`), −10 on block.
  - Does not need the Kiribachi, so it is available with or without the blade.
  - Down+Heavy stays the saw launcher.
- Both reuse existing strips (bSlash / aLow), so there is no new art.
- Test: `harness/onepiece_variety.test.mjs`, 32/0.

## Layer 6 (2026-11-14) — Back+Light for Luffy / Zoro / Sanji

- **Luffy — Gomu Gomu no Ono `lfOno`**
  - Rubber-body ARMOR through startup (f1–17, `_castArmor`), 18f axe kick that knocks down.
  - Tested: absorbs a real jab, still lands (67) and knocks down.
- **Zoro — Yakkodori `zYakko`**
  - 85 dmg, 15f, 124px reach, knockbackX 20.
  - It plants his feet: `zr.kind:'step'` with a +1.5px/f step-in, because without it the walk-back slide carried him 43px out of range.
  - Tested: hits from a 150px gap and shoves the foe 46px.
- **Sanji — Flanchet Shot `sFlanchet`**
  - 70 dmg, 13f, knockbackX 16, spacing reset. Not a Course step.
  - Tested: shoves 48px. Plain Light is still Collier.
- Test: `onepiece_variety.test.mjs`, 37/0.

## Layer 7 (2026-11-14) — Arlong Tough Hide Ram (Charge+Forward)

- 110 dmg, 25 Tide, 22f startup.
- Fishman hide ARMOR through startup via engine `_castArmor` (`armor` field set in arlongStartMove). He charges ~55px using his existing `al.lunge` path.
- −10 on block.
- `charge` was added to Arlong's edge recorder. Only Charge+Forward (numpad token 6) is intercepted; neutral Charge still reaches the engine.
- Tested: costs exactly 25, absorbs a real jab (damage taken, no hitstun, uninterrupted), lands 78.
- Test: `onepiece_variety.test.mjs`, 39/0.

## Layer 8 (2026-11-14) — command throws

- **Luffy — Gomu Gomu no Kazaguruma `lfKaza` (↓↙←+Heavy)**
  - Windmill leg-grab, 7f, unblockable, knockdown.
  - A Heavy-press motion latch (`s.hmotion`) was added beside the Special one.
- **Arlong — Shark Grip `aGrip` (Charge+Back, numpad token 4)**
  - 90 damage, 7f, unblockable, knockdown.
- Both have short grounded reach and 32f whiff recovery.
- Tested: each grabs a guarding dummy and knocks it down (92 / 63), and whiffs out of reach.
- Test: `onepiece_variety.test.mjs`, 43/0.
