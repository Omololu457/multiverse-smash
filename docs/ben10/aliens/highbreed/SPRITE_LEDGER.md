# Highbreed — sprite ledger

**Ripped by: Eeveeloverthespriter8** (credit box on the sheet: "Ripped by: Eeveeloverthespriter8 / Credit isnt necisary but itd be nice"). Source: the tracked root file `DS _ DSi - Ben 10_ Alien Force - Bosses - Atasian_Highbreed.png` (DS *Ben 10: Alien Force*, bosses) → byte copy `assets/sprites/ben10/aliens/highbreed.png` (1000×3500). Identified by contact sheet: grey-skinned insectoid humanoid, orange bat-like wings, purple-black face / mandibles, solid green background, the labelled rows of the brief, the boxed "projectile ?" frame, the "Text icon" box and the credit box.

> Canon note: Ben never transforms into a Highbreed in the show (they are a hostile race). The owner asked for him as a playable Omnitrix form anyway; he is built exactly as instructed.

## Key, palette, labels

- Background solid green **(20,149,63)** keyed exactly (zero tolerance; four corners asserted). A pixel rip: **no halo**, 51 colours on the whole sheet.
- **Palette collision check: none.** His greys / blue-greys, near-blacks (24,24,24) / (41,41,41), purples (75,0,108) / (99,24,99), oranges (239,99,0) / (231,140,49) and the white arcs are never green-dominant (asserted per frame). The only green-leaning colours on the sheet — (57,112,0), (47,92,0), (33,64,0) — are the Eevee mascot's collar inside the credit box (excluded). **Pure black (0,0,0) is used ONLY by labels / boxes** (the art never uses it — asserted), so every label glyph and label box is cut by colour: **327 label components removed** (not art).
- **Credit box** (bottom right: Eevee mascot + text, 36603 px) — excluded, not art.
- **3 single-pixel specks** merged into the frame whose box holds them: [[459, 147, 41, 41, 41], [293, 727, 41, 41, 41], [763, 2523, 231, 239, 239]].

## "projectile ?" — VERDICT: EXCLUDED

- The box holds one **31-px dark sliver** (5×10 px, at sheet 606,1538; greys + black — see `projectile_box_contents_x8.png`). It is not a readable thrown object or energy shape: a few pixels with no silhouette, no motion frames, and the ripper themselves marked it "?". **It is not used as a projectile.** GENETIC LANCE is therefore the **melee lunge fallback** (Attack 2 (running), 45 dmg, 280 px), as briefed — no projectile art is invented.

## "Text icon" — cosmetic only

- The small purple hand / icon inside the top-right "Text icon" box (28×34 px, 678 px) is a dialogue-UI icon, not a fighter frame. Exported alone as `ben10_highbreed_ready_fx_texticon.png` and drawn beside him **only during the Dialogue Taunt** (render-only). Never combat art.

## Sequences (clustered rows → labelled sequence, mapped by CONTENT)

The label boxes sit sometimes above the first row of their block ("walking", "running", "flying", "Defeat", "Attack 1 …", "Hurt (running/flying)") and sometimes at the END of the block ("Idle (during dialouge)", "flying above (attack)", "Attack 2 (walking/running)", "take off"). Every block was previewed as an animation (`preview_*.gif`) and assigned by its content: a windup → white claw arc → recovery is one attack.

| Sequence | Frames | Sheet label / note |
|---|---|---|
| `dialogue` | 13 | Idle (during dialouge) (ground: feet + torso anchor) |
| `walking` | 12 | walking (ground: feet + torso anchor) |
| `running` | 13 | running (12 + 1 extra) (ground: feet + torso anchor) |
| `flying` | 15 | flying (11 + 4) (flying: torso + hover anchor) |
| `above` | 20 | flying above — TOP-DOWN camera (9 + 9 + 2) (TOP-DOWN: centroid + hover anchor) |
| `defeat` | 23 | Defeat (loop until screen fade) (8 + 8 + 7) (ground: feet + torso anchor) |
| `aboveAtk` | 13 | flying above (attack) — 9 front-on wing-spread frames turning into 4 top-down (label at the block end) (flying: torso + hover anchor) |
| `atk1W` | 12 | Attack 1 (walking) (ground: feet + torso anchor) |
| `atk2W` | 18 | Attack 2 (walking) — 12 + 6 (label at the block end) (ground: feet + torso anchor) |
| `hurtW` | 22 | Hurt (walking) — 14 + 8 (two "hurt (walking)" labels) (ground: feet + torso anchor) |
| `takeoff` | 4 | take off (at end change to flying above) (ground: feet + torso anchor) |
| `atk1R` | 11 | Attack 1 (running) (ground: feet + torso anchor) |
| `atk2R` | 13 | Attack 2 (running) — 11 + 2 (label at the block end) (ground: feet + torso anchor) |
| `hurtR` | 13 | Hurt (running) — 11 + 2 (ground: feet + torso anchor) |
| `atk1F` | 11 | Attack 1 (flying) — 9 + 2 (flying: torso + hover anchor) |
| `atk2F` | 13 | Attack 2 (flying) — 8 + 5 (flying: torso + hover anchor) |
| `hurtF` | 4 | Hurt (flying) (flying: torso + hover anchor) |

- **Real frames vs the brief's inventory:** dialogue idle 13 (≈12), walking 12, running 12 + 1, flying 15 (≈12 + 4 → 11 + 4), flying above **20** (9 + 9 + 2, not ≈14), Defeat 23 (≈24), an **extra block "flying above (attack)" (13: 9 front-on wing-spread frames turning into 4 top-down)** not in the inventory, Attack 1 (walking) 12, **Attack 2 (walking) 18** (windup 8 + arc 4 + recovery 6; ≈5 in the brief), Hurt (walking) **22** (9 standing recoil + 13 crouched recovery), take off 4, Attack 1 (running) 11, **Attack 2 (running) 13**, **Hurt (running) 13**, Attack 1 (flying) 11, **Attack 2 (flying) 13**, Hurt (flying) 4. Real frames win.
- **"flying above" is confirmed a TOP-DOWN camera angle on the same alien** (wings spread flat, head / mandibles seen from above, arms hanging below): used ONLY in the Ultimate's aerial shot (`hbUltCircle`), never as a standing / combat animation. "flying above (attack)" (front-on wing spread → top-down) is used only as the Ultimate's take-off (`hbUltRise`).
- **"take off" is confirmed a TRANSITION** (running crouch → wings open → turning top-down), not a standalone move: f0–f2 are the jump / Talon Dive leap, f3 (already turning top-down, "at end change to flying above") only opens the Ultimate.

- Uniform cell **154×155**, centre x = 77, feet row originY = 134. Ground frames: feet = lowest row, centre = torso (median x of the non-wing, non-arc pixels in the 45–60 % band). Flying frames: the torso centre with ONE hover offset (52 px above the feet row). Top-down frames: the body centroid, same hover offset. Pixels copied 1:1, pixel counts preserved, nothing cropped (wings, mandibles, claws and arcs included — asserted). On screen ×2 (Ben's spriteScale 2.0 × actionScale 1): an integer nearest-neighbour scale.

## Animation → move (exported strips `ben10_highbreed_ready_<anim>_uniform.png`)

Per-state rows (the MOVE-SET SELECTOR picks the row by his current movement state; same buttons, same numbers):

| Move | Grounded (idle / walking) | Running | Flying |
|---|---|---|---|
| Jab | `light` Attack 1 (walking) | `lightRun` Attack 1 (running) | `lightFly` Attack 1 (flying) |
| Heavy | `heavy` Attack 2 (walking) | `heavyRun` Attack 2 (running) | `heavyFly` Attack 2 (flying) |
| Air | — | — | `air` / `airFly` Attack 1 (flying) |
| Rending Claws | `hbClaws` Attack 2 (walking) | `hbClawsRun` Attack 2 (running) | `hbClawsFly` Attack 2 (flying) |
| Genetic Lance (melee) | `hbLance` Attack 2 (running) | `hbLance` | `hbLanceFly` Attack 1 (flying) |
| Hit react | `hurt` Hurt (walking) | `hurt_run` Hurt (running) | `hurt_air` Hurt (flying) |

| Animation | Frames | Speed | Source / move |
|---|---|---|---|
| `idle` | 1 | 12 | COMBAT IDLE = walking f0 held (the sheet has no standing combat idle; the "Idle (during dialouge)" loop is the Dialogue Taunt only) |
| `idleAlt` | 1 | 8 | walking f0 (REUSED) |
| `walk` | 12 | 5 | walking — the 12-frame stride cycle |
| `walk_back` | 12 | 6 | walking reversed |
| `run` | 12 | 3 | running — the 12-frame run cycle |
| `dash` | 1 | 4 | running extra frame (row 2, the lone 13th drawing: a forward lean) — dash |
| `jump` | 3 | 5 | TAKE OFF f0–f2 (the transition between running and flying; f3 turns top-down → Ultimate only) |
| `doubleJump` | 4 | 4 | flying f0–f3 (a wing beat) |
| `fall` | 15 | 4 | flying — the 15-frame flight loop (airborne idle / move) |
| `fly` | 15 | 4 | flying — the flight loop (the FLYING movement state) |
| `crouch` | 1 | 6 | walking f0 (REUSED as briefed; no crouch art) |
| `guard` | 1 | 6 | BLOCK = walking f0 (REUSED as briefed; no block art) |
| `crouchGuard` | 1 | 6 | walking f0 (REUSED) |
| `blockHit` | 1 | 6 | Hurt (walking) f0 (REUSED; no block-hit art) |
| `hurt` | 9 | 2 | HIT REACT (grounded) = Hurt (walking) f0–f8, the standing recoil |
| `hurt_run` | 13 | 2 | HIT REACT (running) = Hurt (running), all 13 |
| `hurt_air` | 4 | 3 | HIT REACT (flying) = Hurt (flying), all 4 |
| `knockdown` | 5 | 4 | KNOCKDOWN = Defeat f0–f4 (the first few frames, as briefed) |
| `getup` | 13 | 3 | GET UP = Hurt (walking) f9–f21, the crouched recovery rising |
| `dizzy` | 4 | 8 | Hurt (walking) f9–f12 crouched sway (REUSED; no dizzy art) |
| `transform` | 2 | 6 | TRANSFORM-IN = Idle (during dialouge) f0 → walking f0 (the Omnitrix flash is the engine's) |
| `taunt` | 13 | 5 | DIALOGUE TAUNT = Idle (during dialouge), the 13-frame talk loop (cosmetic only) |
| `win` | 13 | 6 | WIN = Idle (during dialouge) loop (REUSED as briefed; no win art) |
| `lose` | 18 | 4 | LOSE = Defeat f5–f22, the lying loop (as briefed) |
| `light` | 12 | 2 | JAB (grounded) = Attack 1 (walking), claw arcs f4–f7 |
| `heavy` | 18 | 2 | HEAVY (grounded) = Attack 2 (walking), windup f0–f7, arcs f8–f11, recovery f12–f17 |
| `down` | 5 | 3 | LOW = Hurt (walking) f13 → f9 REVERSED (the crouched frames played backwards as a low claw; no low art, as briefed) |
| `up` | 11 | 2 | LAUNCHER = Attack 1 (running), an anti-air lunge |
| `air` | 11 | 2 | AIR = Attack 1 (flying), claw arc f6–f8 |
| `grab` | 8 | 4 | Attack 2 (walking) windup (REUSED; no grab art) |
| `lightRun` | 11 | 2 | JAB (running) = Attack 1 (running) |
| `heavyRun` | 13 | 2 | HEAVY (running) = Attack 2 (running) |
| `lightFly` | 11 | 2 | JAB (flying) = Attack 1 (flying) |
| `heavyFly` | 13 | 2 | HEAVY (flying) = Attack 2 (flying) |
| `airFly` | 11 | 2 | AIR (flying) = Attack 1 (flying) |
| `hbClaws` | 18 | 2 | RENDING CLAWS (grounded) = Attack 2 (walking) claw arc |
| `hbClawsRun` | 13 | 2 | RENDING CLAWS (running) = Attack 2 (running) |
| `hbClawsFly` | 13 | 2 | RENDING CLAWS (flying) = Attack 2 (flying) |
| `hbDiveUp` | 3 | 3 | TALON DIVE leap = take off f0–f2 |
| `hbDive` | 11 | 2 | TALON DIVE = Attack 1 (flying) dive |
| `hbLance` | 13 | 2 | GENETIC LANCE (melee fallback) = Attack 2 (running) lunge |
| `hbLanceFly` | 11 | 2 | GENETIC LANCE (flying) = Attack 1 (flying) |
| `hbWing` | 13 | 2 | WING SLASH (air) = Attack 2 (flying) arc |
| `hbUltRise` | 14 | 3 | GENETIC PURGE take-off = take off f3 (turning top-down) → flying above (attack): front-on wing spread → top-down |
| `hbUltCircle` | 20 | 3 | GENETIC PURGE aerial shot = flying above (TOP-DOWN camera), the 20-frame loop — ULTIMATE ONLY |
| `hbUltDive` | 11 | 1 | GENETIC PURGE dive barrage = Attack 1 (flying) |
| `hbUltBeam` | 18 | 2 | GENETIC PURGE purge beam = Attack 2 (walking), landed |

## Missing poses (closest real frame reused, no art invented)

- **combat idle / crouch / block / crouch-guard**: walking f0 (as briefed). **block-hit**: Hurt (walking) f0. **LOW**: Hurt (walking) f13 → f9 REVERSED (as briefed: no low-attack art). **win**: Idle (during dialouge) loop (as briefed). **get-up**: Hurt (walking) f9–f21 (the crouched recovery). **dizzy**: Hurt (walking) f9–f12. **grab**: Attack 2 (walking) windup. **transform-in**: Idle (during dialouge) f0 → walking f0 (no transform art; the Omnitrix flash is the engine's).

## Extracted vs procedural effects

- **Extracted (real sheet pixels):** the white claw arcs in Attack 1 / 2 (walking, running, flying) — every arc touches the body, so it is part of that frame (no free-floating arc exists on the sheet); the Text icon (cosmetic, Dialogue Taunt only). The "projectile ?" sliver is **not** used (verdict above).
- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the MUTATED glow, the DNA-strand spiral of the Ultimate, the purge beam burst, the wing trail, dive streaks, screen shake. They READ simulation state; they never write it.


## As built (2026-11-18, highbreed.js)

- **Move-set selector:** grounded (idle / walking) → the walking rows, running (a dash or the 12f after it) → the running rows, flying (any airborne frame: jump, double jump, hover-flight) → the flying rows. Jab = `light` / `lightRun` / `lightFly`, Heavy = `heavy` / `heavyRun` / `heavyFly`, Air = `airFly`; Low and Launcher have one strip each. Same buttons and frame data in every state.
- **Genetic Lance:** the melee fallback (projectile excluded): `hbLance` (Attack 2 running) lunge, 280 px real travel, 45.
- **Flight take-off pose:** flight.js asks for `takeoff`; highbreed.js aliases it to `jump` (take off f0–f2) at runtime, no extra strip.
- **Ultimate:** `hbUltRise` (take off f3 + flying above (attack)) → `hbUltCircle` (flying above, 20f top-down loop) → `hbUltDive` (Attack 1 flying) × 3 at hashed angles → `hbUltBeam` (Attack 2 walking) + the procedural Purge Beam.
- **Hitboxes** are engine rect boxes sized to the briefed ranges (Claws 170 px, Heavy 170 px); no hitbox is cut from the art.

Contact sheet: `docs/ben10/aliens/highbreed/contact_sheet.png` (every exported strip; green = feet row, yellow = centre column). Geometry, removed labels, the icon, the projectile sliver, anchors: `source_grid.json`.

Credit: **Ripped by: Eeveeloverthespriter8**.

