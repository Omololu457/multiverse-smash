# Upgrade (Galvanic Mechamorph) — sprite ledger

**Sheet by Dragonrod** ("Ben 10 Upgrade sprite sheet made by Dragonrod — Please, give credits if used!").  
Source: `assets/sprites/ben10/aliens/upgrade.png` (682×795) = byte copy of the tracked `upgrade_sprite_sheet_by_dragonrod342_d7z5d59.png`. The root `upgrade.png` is a re-saved copy (background (0,163,232)) and is not used.  
Registry / pool key **`upgrade_ov`** (display "Upgrade"): the experimental `upgrade` entry (its legacy kit and its own `ben10_upgrade_*_uniform.png` animation table in fighters.js) is untouched, so the strips here are named `ben10_upgrade_ready_*`.  
Slicer: `python3 -I tools/ben10/slice_upgrade.py` (deterministic, byte-identical re-runs). Frame map: `source_grid.json`. Contact sheet: `contact_sheet.png`; row previews `preview_terminal.gif` (the terminal boot played as an animation), `preview_idle/walk/upLash/upMelt/up.gif`.

## Key and exclusions

- Background #00A2E8 = (0, 162, 232) at all four corners. Key = EXACT colour, **zero tolerance, no erosion**.
- Near-key leftovers: **0** kept pixels within RGB distance 80 of the key; the nearest kept pixel is 138.8 away. The terminal BLUE SCREENS are dark blue (far from #00A2E8) and survive intact.
- Excluded (not art): 57 label glyph components (stand / walk / crouch / jump / fall / attack ↓ / attack / attack → / attack ↑ / Alt Pal), the white "(computer from GBA metroid game)" caption box (component 60), the white credit box with its text (component 107).
- Alt Pal: the two figures next to the "Alt Pal" label (green reference = component 10, WHITE alt = component 11) are the same pose pixel-for-pixel (asserted). They were **sampled first** — pixel correspondence gives an exact normal → alt colour map (majority vote where one normal colour maps to several alt colours: {'(0, 0, 0)': 4, '(23, 23, 23)': 4, '(88, 200, 55)': 2, '(57, 130, 38)': 3}) — and then excluded from every animation. The map builds the render-only OVERCLOCK frame set (`UPGRADE_OC_ANIM`, `ben10_upgrade_ready_oc_*`).

## Geometry

- Uniform cell 196×125, body centre x = 98, feet baseline y = 123, actionScale 1.1 (Ben spriteScale 2.0 × 1.1 → native ×2.2).
- Anchor = feet baseline + body centre = centroid of the frame's bottom 40 % (feet / legs), so whip arcs and tendrils never drag it. Melt frames: the same rule lands on the puddle's centre on the floor line. Terminal frames: bottom-centre (their base).
- Nearest-neighbour only; frames are copied 1:1 and never cropped (asserted). Whip arcs and tendril lines that touch a body are part of that frame (connected components).

## Sheet rows → frames

| Sheet row (label) | Frames | Components (left → right) |
|---|---|---|
| stand | stand | 1, 3, 4, 2 |
| walk | walk | 12, 13, 14, 15, 16, 17 |
| crouch / jump / fall | crouch, jump, fall | 30, 29, 28 |
| attack ↓ | melt f1–f6 + MERGE (f7, figure fused with a terminal) | 46, 47, 49, 50, 51, 59, 48 |
| terminal row (computer from a GBA Metroid game) | TERMINAL boot f1–f10 (f10 = ONLINE) | 61, 62, 63, 64, 65, 66, 67, 68, 69, 70 |
| attack | attack f1–f3 | 71, 72, 73 |
| (after attack f3) | ZAP BOLT dash (FX) | 74 |
| attack → | attack-fwd f1–f6 | 82, 83, 81, 84, 85, 86 |
| attack ↑ | attack-up f1–f6 | 98, 99, 96, 94, 95, 97 |

## Animation table (every frame → animation → move)

| Animation | Frames (row f#) | Speed | Loop | Move / role |
|---|---|---|---|---|
| `idle` | stand f1, stand f2, stand f3, stand f4 | 9 | yes | idle (stand loop) |
| `walk` | walk f1, walk f2, walk f3, walk f4, walk f5, walk f6 | 7 | yes | walk (walk; the figure is hunched and leaning) |
| `walk_back` | walk f6, walk f5, walk f4, walk f3, walk f2, walk f1 | 7 | yes | walk back - WALK REVERSED |
| `run` | walk f1, walk f2, walk f3, walk f4, walk f5, walk f6 | 4 | yes | run - the WALK cycle played FASTER (no run art) |
| `dash` | walk f2, walk f3 | 3 | yes | dash - WALK f2-3, fast |
| `jump` | jump f1 | 6 | no | jump rise (jump) |
| `doubleJump` | jump f1 | 6 | no | double jump - REUSED jump |
| `fall` | fall f1 | 6 | yes | jump fall (fall, limbs up) |
| `crouch` | crouch f1 | 6 | no | crouch |
| `guard` | crouch f1 | 6 | no | block - REUSED crouch |
| `blockHit` | crouch f1 | 6 | no | block hit - REUSED crouch |
| `light` | atk f1, atk f2 | 3 | no | JAB (attack f1-2) |
| `heavy` | fwd f1, fwd f2, fwd f3, fwd f4, fwd f5 | 4 | no | HEAVY (attack-fwd f1-5: wind-up, long stretched arm, 180 px) |
| `down` | crouch f1 | 6 | no | LOW - crouch frame + procedural low whip (hits low) |
| `up` | up f1, up f2, up f3, up f4 | 4 | no | LAUNCHER (attack-up f1-4 rising tendril arc) |
| `air` | fall f1 | 6 | no | AIR - fall frame + procedural whip |
| `hurt` | fall f1 | 6 | no | hit light / heavy - REUSED fall (no hurt pose) |
| `hurt_air` | fall f1 | 6 | no | hit in the air - REUSED fall |
| `knockdown` | melt f6 | 6 | no | knockdown - REUSED melt f6 (the puddle; no knockdown pose) |
| `getup` | melt f6, melt f5, melt f4, melt f3, melt f2, melt f1 | 3 | no | get-up - REUSED melt f6 -> f1 (reform) |
| `dizzy` | stand f1, stand f2 | 12 | yes | dizzy - REUSED stand f1-2 (no dizzy pose) |
| `transform` | melt f6, melt f5, melt f4, melt f3, melt f2, melt f1 | 3 | no | transform-in - REUSED reform (melt reversed) |
| `taunt` | stand f1, stand f2, stand f3, stand f4 | 6 | no | taunt - REUSED stand |
| `win` | stand f1, stand f2, stand f3, stand f4 | 9 | yes | win - REUSED stand (no win pose) |
| `lose` | crouch f1 | 6 | no | lose - REUSED crouch (no lose pose) |
| `grab` | atk f1, atk f2 | 4 | no | grab - REUSED jab |
| `upZap` | atk f1, atk f3 | 4 | no | ZAP BOLT cast (attack f1 -> f3; the bolt is the extracted green dash FX) |
| `upLash` | fwd f1, fwd f2, fwd f3, fwd f4, fwd f5, fwd f6 | 4 | no | TENDRIL LASH (attack-fwd full: f1-3 wind-up, f4-5 stretched arm, f6 retract) + ult opener |
| `upMelt` | melt f1, melt f2, melt f3, melt f4, melt f5, melt f6 | 2 | no | GOO DIVE enter (attack-down f1-6 melting into a puddle) |
| `upPuddle` | melt f6 | 6 | yes | GOO DIVE puddle slide (attack-down f6 held) |
| `upReform` | melt f6, melt f5, melt f4, melt f3, melt f2, melt f1 | 2 | no | GOO DIVE reform (attack-down f6 -> f1, reverse melt) |
| `upMerge` | merge f1 | 6 | no | MERGE (attack-down f7: the figure fused with a terminal) + ult Hard Reset |
| `upRise` | up f4, up f5, up f6 | 4 | no | TENDRIL RISE anti-air (attack-up f4-6) |
| `upSpear` | fall f1 | 6 | no | SPEAR DIVE (fall frame + procedural diagonal tendril) |
| `upDeploy` | crouch f1 | 6 | no | DEPLOY TERMINAL cast - REUSED crouch (hand to the floor; the terminal FX boots ahead) |

The same 35 animations exist recoloured for OVERCLOCK (`ben10_upgrade_ready_oc_<anim>_uniform.png`, render-only frame-set swap).

## Coverage — every extracted frame is used

- Body frames: 35 extracted, 35 used (all).
- FX frames: terminal f1–f10 (TERMINAL boot + ONLINE hold f10, ult Terminal Barrage copies), bolt (ZAP BOLT projectile).

## Reused poses (no art on the sheet)

- walk_back = walk reversed · run = the walk cycle played faster (speed 4 vs 7; the figure is hunched and leaning) · dash = walk f2–3 fast
- double jump = jump · guard / block hit = crouch · hurt / hurt_air = fall · knockdown = melt f6 (puddle) · get-up / transform-in = melt f6→f1 (reform)
- dizzy = stand f1–2 · win / taunt = stand · lose = crouch · grab = jab · LOW = crouch + procedural low whip · AIR / SPEAR DIVE = fall + procedural whip / diagonal tendril
- DEPLOY TERMINAL cast = crouch (hand to the floor) · ZAP BOLT cast = attack f1 → f3

## Effects — extracted vs procedural

| Effect | Source |
|---|---|
| TERMINAL (boot f1–10, ONLINE f10) | EXTRACTED — terminal row |
| ZAP BOLT | EXTRACTED — the green dash after attack f3 |
| Tendril / whip arcs on Heavy, Tendril Lash, Launcher, Tendril Rise | EXTRACTED — part of the body frames |
| MERGE frame (figure + terminal) | EXTRACTED — attack ↓ f7 |
| OVERCLOCK palette | EXTRACTED colours — Alt Pal pair colour map |
| Low whip, air whip, Spear Dive tendril | PROCEDURAL pixel-style lines |
| Terminal pulse shot | PROCEDURAL pixel-style ring / square |
| Circuit lines (ult network), network cage | PROCEDURAL pixel-style lines (render-only) |
| Pulse rings, glints, Crash static lines | PROCEDURAL pixel-style (render-only) |
