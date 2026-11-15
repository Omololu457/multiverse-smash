# S.P.D. Yellow — sprite ledger (frame → action → input → timing → function)

Generated from `docs/spd_yellow/source_rects.json` + `spdYellowData.js`.
Source: `Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Power Rangers - Yellow Ranger.png` (sha256 `c6f7731e9301f082f170deb86d2a42228f6452b602949d2687083e8c5608f6e8`, 727×1160 RGB).
Cell canvas 160×96, origin (80, 84) = feet centre, so the engine's whole-cell mirror keeps Z centred when she faces left.
Timing = startup/active/recovery in simulation frames (60 f = 1 s). Rects are `[x, y, w, h]` on the source sheet.

| Strip (action) | Frames → source cell [rect] | Input / trigger | Timing | Function |
|---|---|---|---|---|
| `idle` | 0: `ready0` [48,8,32,56]<br>1: `ready1` [88,8,32,56] | Neutral (grounded, free) | loop | Ready stance |
| `walk` | 0: `run0` [48,72,48,56]<br>1: `run1` [104,72,48,56]<br>2: `run2` [160,72,48,56]<br>3: `run3` [216,72,48,56]<br>4: `run4` [272,72,48,56]<br>5: `run5` [328,72,48,56]<br>6: `run6` [384,72,48,56]<br>7: `run7` [440,72,48,56] | Left/Right held | loop | Walk forward |
| `run` | 0: `run0` [48,72,48,56]<br>1: `run1` [104,72,48,56]<br>2: `run2` [160,72,48,56]<br>3: `run3` [216,72,48,56]<br>4: `run4` [272,72,48,56]<br>5: `run5` [328,72,48,56]<br>6: `run6` [384,72,48,56]<br>7: `run7` [440,72,48,56] | Run | loop | Run |
| `walk_back` | 0: `run7` [440,72,48,56]<br>1: `run6` [384,72,48,56]<br>2: `run5` [328,72,48,56]<br>3: `run4` [272,72,48,56]<br>4: `run3` [216,72,48,56]<br>5: `run2` [160,72,48,56]<br>6: `run1` [104,72,48,56]<br>7: `run0` [48,72,48,56] | Back held | loop (run cells reversed) | Walk back |
| `dash` | 0: `run1` [104,72,48,56] | Engine dash pose (engine dash is off; blink replaces it) | - | Dash pose |
| `jump` | 0: `jump0` [48,200,40,64] | Up / W | rising | Jump |
| `fall` | 0: `jump1` [96,200,40,64] | airborne, falling | - | Fall |
| `crouch` | 0: `crouch0` [48,136,32,56] | Down held | hold | Crouch |
| `guard` | 0: `guard0` [48,272,32,48] | Guard (; / Circle) | hold | Block |
| `hurt` | 0: `fall0` [48,328,56,48] | taking a hit | hitstun | Hurt |
| `knockdown` | 0: `fall0` [48,328,56,48]<br>1: `fall1` [112,328,56,48]<br>2: `fall2` [176,328,56,48] | knocked down | engine knockdown | Knockdown |
| `getup` | 0: `fall3` [240,328,56,48]<br>1: `fall4` [304,328,56,48]<br>2: `ready0` [48,8,32,56] | wake-up | engine get-up | Get up |
| `light` | 0: `strike0` [48,400,48,56] @0<br>1: `strike1` [104,400,48,56] @4 | Light (J / Square) | 5/2/10 · raw 17 | Snap Jab (J1) |
| `yJ2` | 0: `slash0` [48,768,64,64] @0<br>1: `slash1` [120,768,64,64] @5 | fresh Light on a clean J1 hit | 6/2/12 · raw 21 | Draw Thrust (J2) |
| `yJ3` | 0: `blade2` [192,464,64,64] @0<br>1: `blade3` [264,464,64,64] @8 | fresh Light on a clean J2 hit | 9/3/18 · raw 28 | High-Low Cut (J3) |
| `heavy` | 0: `slash6` [480,768,64,64] @0<br>1: `slash7` [552,768,64,64] @7<br>2: `blade6` [480,464,64,64] @13 | Heavy (K / Triangle) | 13/3/25 · raw 52 | Cross Cut |
| `yLow` | 0: `crouch0` [48,136,32,56] @0<br>1: `blade1` [120,464,64,64] @7 | Down + Light / Down + Heavy | 8/2/16 · raw 24 | Low Draw |
| `up` | 0: `strike0` [48,400,48,56] @0<br>1: `strike2` [160,400,48,56] @8<br>2: `strike3` [216,400,48,56] @16 | Up + Heavy / Up-Attack (I) | 12/3/22 · raw 42 | Rising Heel (launcher) |
| `air` | 0: `airKick0` [48,640,64,64] @0<br>1: `airKick1` [120,640,64,64] @7 | Air Light | 8/3/17 · raw 30 | Flying Kick |
| `down_air` | 0: `airKick1` [120,640,64,64] | Air Down + Light | 8/3/17 · raw 30 | Flying Kick (down-air) |
| `yFlip` | 0: `flip0` [48,712,48,48] @0 | Air Heavy | 10/4/18 · raw 38 | Inverted Flip Kick |
| `yAcro` | 0: `acro0` [48,536,56,64] @0<br>1: `acro1` [112,536,56,64] @5<br>2: `acro2` [176,536,56,64] @10<br>3: `acro3` [240,536,56,64] @16<br>4: `acro4` [304,536,56,64] @24 | Forward + Heavy | 16/4/22 · raw 46 | Acrobatic Leap Kick |
| `ySweep` | 0: `slash2` [192,768,64,64] @0<br>1: `slash3` [264,768,64,64] @10 | Back + Heavy | 11/3/20 · raw 34 | Turning Sweep |
| `yBreak` | 0: `blade4` [336,464,64,64] @0<br>1: `slash1` [120,768,64,64] @8 | fresh Heavy ≤ 12 f after a clean ordinary echo hit | 9/3/22 · raw 40 | Partner Break |
| `yPistol` | 0: `aim0` [48,840,56,56] @0<br>1: `aim1` [112,840,56,56] @6 | Neutral Special (L / R1) | 12/1/14 | Pistol draw / hold |
| `yPistolShot` | 0: `fire0` [47,976,72,56] @0<br>1: `aim2` [176,840,56,56] @5 | Neutral Special release (pistol) | shot frame 12 → 14 f recovery | Pistol fire + recovery |
| `yLongHold` | 0: `fire2` [207,976,72,56] @0 | Neutral Special held ≥ 24 f (paid +15) | brace until release (≥ frame 30, cap 45) | Long-gun brace |
| `yLongShot` | 0: `fire1` [127,976,72,56] @0<br>1: `fire2` [207,976,72,56] @6 | Long-gun release | 30 f recovery (late cancel at ≤ 20 for Breach) | Long-gun fire + recovery |
| `yAirShot` | 0: `airAim0` [48,904,48,64] @0 | Air Neutral Special | 10/1/12 | Air pistol |
| `yClone` | 0: `blade0` [48,464,64,64] @0<br>1: `ready0` [48,8,32,56] @14 | Down + Special | 14/1/14 | Duplicate |
| `ySwap` | 0: `blade0` [48,464,64,64] @0 | Forward + Special | 8/1/14 | Swap |
| `yStance` | 0: `acro5` [368,536,56,64] @0 | Charge + Special (P+L / L2+R1) | 1/1/200 | Tactical Coin command stance |
| `yCall` | 0: `blade5` [408,464,64,64] @0 | Up + Special · stance RISING KICK · Breach Up + Special | 12/1/14 | Ninja Megazord call pose |
| `grab` | 0: `strike0` [48,400,48,56]<br>1: `strike1` [104,400,48,56] | Grab (O / L1) | engine grab 8/3/24 | Throw |
| `win` | 0: `blade5` [408,464,64,64]<br>1: `ready0` [48,8,32,56] | round win | - | Victory |
| `intro` | 0: `blade0` [48,464,64,64]<br>1: `ready0` [48,8,32,56] | round intro | - | Intro |
| `lose` | 0: `fall2` [176,328,56,48] | round loss | - | Defeat |
| `yBlinkRec` | 0: `acro4` [304,536,56,64] | Double-tap Left/Right (blink recovery) | the framework's 3 f recovery (cast override) | Blink recovery pose |

`@n` = the elapsed attack frame at which that strip frame starts showing (frameTimeline).

## Effect cells (never body poses)

| Cell [rect] | Use |
|---|---|
| `streak0` [48,1040,40,56] | blink VANISH/launch phase (start) + swap vanish |
| `streak1` [96,1040,48,64] | blink TRAVEL/arrival phase + swap arrival |
| `beam0` [48,1120,72,24] | muzzle star on every pistol / long-gun / Cover Me release |
| `beam1` [128,1120,72,24] | pistol bolt projectile art (incl. Cover Me, air pistol) |
| `beam2` [208,1120,72,24] | long-gun beam projectile art (incl. ultimate brace) |

## Muzzle anchors (measured; px from the origin at source scale, facing right)

| Cell | [dx, dy] | Used by |
|---|---|---|
| `aim1` | [31, -45] | pistol shot, Cover Me (clone), ultimate opener |
| `aim2` | [28, -52] | pistol recovery (reference) |
| `fire0` | [47, -38] | pistol fire flash (reference) |
| `fire2` | [50, -39] | long-gun shot + ultimate beam |
| `airAim0` | [42, -53] | air pistol |

## Excluded / unused

- Credit panel [620,18,102,118] — "ripped by the FRANKETE, for TSR (WANTED-poster credit panel, top right) — excluded from runtime". Documentation only.
- Left-column input glyphs [[8,88,16,16],[8,152,16,16],[8,216,16,16],[8,464,16,16],[0,656,16,16],[24,656,16,16]] — left-column controller glyphs — labels, not body art.
- Pixel-identical duplicates: `slash4` (pixel-identical to slash0 and blade1); `slash5` (pixel-identical to slash1); `slash7` (pixel-identical to blade0); `slash6` (pixel-identical to blade5).
- Unused cells: `slash4`, `slash5` — both are exact pixel duplicates of used cells, so no supplied pose is lost.
- No weapon is drawn by code: every firearm / blade pixel comes from the sheet (`fire0`/`fire2` bodies are identical; rows 9-28 differ = the real long-gun change; `fire1` is the muzzle blast that hides the weapon).
