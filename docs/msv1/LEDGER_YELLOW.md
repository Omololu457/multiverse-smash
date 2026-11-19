# MSV1 ledger: Dustin Brooks, Yellow Wind Ranger
Sheet: assets/incoming/msv1/yellow_dustin.png (1044×2151). Background is flat sea-green **rgb(82,144,118)**, chroma-keyed exactly (alpha 0); nearest-neighbour only; sprites face right.
Frames: assets/incoming/msv1/frames/yellow/RRR_FF.png. The one shared map is docs/msv1/FRAME_MAP.json; the animation ranges are in docs/msv1/ANIM_MAP.json.

| row | frames | count | anim | use |
|---|---|---|---|---|
| R1 | 00–06 | 7 | `idle` | idle loop |
| R2 | 00–07 | 8 | `run` | run cycle; REV build dust |
| R2 | 08–11 | 4 | `runStop` | run stop / walk |
| R3 | 00–02 | 3 | `streak` | NINJA STREAK / Tremor Streak surface blur |
| R3 | 03–04 | 2 | `streakTail` | streak fade-out (recovery) |
| R4 | 00–03 | 4 | `jab` | Jab 42 |
| R4 | 04–09 | 6 | `string` | string hits 1-2 (34/34) |
| R4 | 10–15 | 6 | `stringEnd` | string finisher (58) |
| R5 | 00–05 | 6 | `kickHeavy` | Heavy kick / Streak Strike pose |
| R5 | 06–12 | 7 | `crouchStrike` | crouch light |
| R6 | 00–04 | 5 | `punchAlt` | forward light alt |
| R6 | 05–09 | 5 | `risingKick` | Rising kick 76 (anti-air) + Burrow ERUPT 90 |
| R6 | 10–12 | 3 | `tumble` | eruption counter recovery |
| R7 | 00–01 | 2 | `guard` | block / hand sign (clone step 1) |
| R7 | 02–05 | 4 | `crouch` | crouch / Burrow dig-in |
| R7 | 06–09 | 4 | `axe` | overhead upAttack |
| R8 | 00–06 | 7 | `jump` | jump start / arc |
| R8 | 07–11 | 5 | `land` | GROUND POUND shockwave ring + REV dust + trap eruption |
| R8 | 12–15 | 4 | `landRecover` | crouch recovery |
| R9 | 00–07 | 8 | `airSpin` | double-jump spin |
| R9 | 08–12 | 5 | `diveKick` | air ↓ entry for Ground Pound |
| R10 | 00–05 | 6 | `airAttack` | air light |
| R10 | 06–13 | 8 | `airTumble` | tumbling flip kick (air heavy) |
| R10 | 14–15 | 2 | `airRecover` | air recovery |
| R11 | 00–03 | 4 | `tornado` | Ninja tornado (Storm Ascension finish N/A; Earthquake pop-up vortex) |
| R11 | 04–04 | 1 | `dive` | dive |
| R11 | 05–08 | 4 | `skid` | streak skid stop |
| R11 | 09–10 | 2 | `getUp` | get-up |
| R11 | 11–11 | 1 | `hitSpark` | pink hit spark FX |
| R11 | 12–12 | 1 | `flipKick` | flip kick |
| R12 | 00–10 | 11 | `low` | Low sweep 50 (low) + crouch normals |
| R13 | 00–02 | 3 | `duck` | duck |
| R13 | 03–06 | 4 | `uppercut` | uppercut |
| R13 | 07–11 | 5 | `hurt` | hitstun |
| R14 | 00–11 | 12 | `sword` | Sword 70 |
| R15 | 00–04 | 5 | `galeCrescent` | sword string 2 |
| R15 | 05–14 | 10 | `swordMove` | moving slashes / Earthquake sword finisher |
| R16 | 00–04 | 5 | `galeCrescent2` | sword string 3 |
| R16 | 05–09 | 5 | `swordLow` | low sword |
| R16 | 10–11 | 2 | `swordRise` | rising crescent (Fault Line slam) |
| R17 | 00–06 | 7 | `swordCrouch` | crouch sword |
| R18 | 00–07 | 8 | `swordAir` | Air sword 60 |
| R19 | 00–03 | 4 | `swordDome` | barrier wind-up slashes |
| R19 | 04–10 | 7 | `dome` | ROCK HOLD dome (armor) |
| R20 | 00–05 | 6 | `throw` | EARTH KUNAI throw-down |
| R20 | 06–11 | 6 | `throwAir` | kunai planted pose |
| R21 | 00–00 | 1 | `fxSpark` | beam muzzle spark |
| R21 | 01–03 | 3 | `beam` | NINJA BEAM |
| R21 | 04–06 | 3 | `beamDiag` | kunai trap glint/ projectile streak |
| R21 | 07–10 | 4 | `fxBurst` | beam impact burst |
| R22 | 00–12 | 13 | `stance` | intro skid / taunt stances / low sword swipe |
| R23 | 00–00 | 1 | `seated` | hand-sign seated pose |
| R23 | 01–06 | 6 | `smoke` | SMOKE POP (yellow) vanish/clone/mirror/swap |
| R24 | 00–04 | 5 | `smokeFade` | smoke dissipating |
| R25 | 00–05 | 6 | `victory` | win poses |
| R26 | 00–10 | 11 | `knockdown` | knockdown / fall / lose |
| R27 | 00–08 | 9 | `lying` | lying -> get-up |
| R27 | 09–17 | 9 | `getUpRoll` | tech roll / flip get-up |

| extra | rect (x,y,w,h) | status |
|---|---|---|
| portrait large | 811,9,50,56 | **select icon** |
| portrait small | 869,31,31,34 | **HUD icon** |
| credit text block | ~805,62,160,58 | **excluded, credit** (docs/msv1/CREDITS.md) |
| R8 arrow markers (↑ ↗) | band y 501–508 | cut off the frames: **22 px** removed (they sit in their own band above R8; no frame pixel touched) |

TOTAL: 305 animation frames + 2 portraits used; 1 credit block excluded; 0 other exclusions.
