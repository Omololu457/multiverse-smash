# Humongousaur (Vaxasaurian) — sprite ledger

Sheet source: unknown, add credit if known. (The tracked file name is
`humungousaur_ben_10_sprites_sheet_by_ipmugenofficial_djlwsq9.png`, which suggests a DeviantArt upload by
"ipmugenofficial"; that has not been verified, so no credit is claimed here.)

- Source: `assets/sprites/ben10/aliens/humongousaur.png` (1299×2187), a byte copy of that tracked root file. Found by
  contact sheet: brown/tan dinosaur-like muscular alien with a tail and a green Omnitrix chest dot, solid light-blue
  background, labels STAND / WALK / CROUCH/JUMP / GUARD / FALL / PUNCH / PUNCH UP / PUNCH BACK / TACKLE / GROUND ATTACK /
  GROUND STRIKE / CRUSH / PUSH / ROAR. The two other root Humongousaur files (`humungasuar.png`,
  `humungousaur_by_dragonrod342_db34ddm.png`) are a different white-background sheet and are not used.
- Slicer: `tools/ben10/slice_humongousaur.py` (deterministic, re-running is byte-identical). Output: 37 uniform strips
  `ben10_humongousaur_ready_<anim>_uniform.png`, the table `humongousaurAssets.js`, `contact_sheet.png`, 18 row previews
  `preview_<anim>.gif` (each labeled row played as an animation on a dark ground) and `source_grid.json` (every frame's
  component id, source box and cell offset).
- Cell 152×128, body centre x 76, feet baseline y 126. `actionScale` 0.75 (Ben's sprite scale 2.0 × 0.75 = ×1.5 on
  screen: the ~96 px native stand is ~144 px, the tallest READY alien). Size tiers and the Ultimate swap in copies of the
  same table with a fixed, stepped `actionScale` (×1.0 / ×1.2 / ×1.35 / ×1.5, ult ×2.4), never a smooth scale.

## Keying (Phase 1)

| Step | Result |
|---|---|
| Corners | all four = (0,180,243) #00B4F3 — the key |
| Exact key, zero tolerance | 2,471,586 px keyed (only pixels equal to the key) |
| Edge halo after the exact key | the sheet is SOFT (cartoon shading, anti-aliased): every outline pixel is a blend of the art and the key, a ~2 px blue ring (38,601 px at depth 1, 38,285 at depth 2 were all blue-tinted) — the exact key alone leaves a blue fringe |
| De-fringe (alpha only, colours never changed, no filter / resample) | 114,289 blue-dominant edge pixels connected to the background removed (b − r > 20 and b ≥ g, or b − r > 40); 1,252 px of enclosed blue pockets (background seen between limbs / dust strands); 6,187 TEAL blends (g > r + 10, b > r, \|g − b\| ≤ 25 — brown dust over blue; 6,153 of them inside the semi-transparent dust strands); 146 orphaned specks (≤ 3 px) |
| Blue fringe left | **0** blue-dominant edge pixels, **0** blue-dominant pixels anywhere (checked on dark, light and red grounds) |
| Palette collisions | none left. His palette is brown / tan / orange (r > g > b) + dark outline + the green Omnitrix dot (g ≫ b). The dot core is kept (899 / 901 px; 2 edge pixels went with the halo). The dark teal outline blends (e.g. 26,68,76) were key contamination and are removed. |
| Labels | 18 label components (white text with a blue outline, 16 px tall) removed — text is not art; confirmed on the contact sheet |
| Components | 98 = 80 frames + 18 label pieces, every one assigned (asserted) |

Anchor: feet baseline = the frame's bottom row; body centre = the centre of the densest 34 px-wide column window (the
torso), so the tail, an outstretched arm or a dust swoosh never drags it. Nearest-neighbour 1:1 copies, never cropped
(asserted inside the cell). Swooshes / dust that touch a body stay in that body's frame (one connected component):
PUNCH f3, PUNCH UP f5, PUNCH BACK f5, GROUND ATTACK f3, GROUND STRIKE f3.

## Inventory (verified against the sheet — the counts match the brief exactly)

| Row | Frames | Notes from the real frames |
|---|---|---|
| STAND | 6 | idle breathing loop |
| WALK | 8 | hunched walk cycle |
| CROUCH/JUMP | 8 | f1–3 crouch down / crouch idle, f4–5 rise, f6 apex, f7–8 fall |
| GUARD | 4 | f1–2 guard, f3 block-hit (arm thrown forward), f4 curled guard |
| FALL | 4 | f1–2 hit react (f2 airborne), f3 knocked down, f4 lying |
| PUNCH | 4 | f1 turned wind-up, f2 jab; f3 swing WITH the extracted swoosh, f4 follow-through |
| PUNCH UP | 6 | f1–3 wind-up crouch, f4 rising, f5 uppercut WITH swoosh, f6 fist up |
| PUNCH BACK | 6 | f1–4 wind-up / turn, f5 big spinning backhand WITH swoosh, f6 follow-through arm |
| TACKLE | 4 | shoulder-first lunge loop |
| GROUND ATTACK | 5 | f1 arms-up, f2–3 low swipe (f3 WITH dust), f4–5 crouched aftermath |
| GROUND STRIKE | 6 | f1 tall arm raised, f2 lean, f3 slam WITH dust, f4–6 crouched aftermath |
| CRUSH | 6 | f1–2 reaching, f3–5 hunching grab, f6 release |
| PUSH | 8 | both arms forward, pushing loop |
| ROAR | 5 | f1 hands-to-head wind-up, f2–5 roar pose |

## Frame → animation → move

| Animation | Frames | Move / use |
|---|---|---|
| idle | STAND f1–6 | idle loop |
| walk | WALK f1–8 | walk |
| walk_back | WALK f8–1 | walk back — **reused: WALK reversed** |
| run | WALK f1–8 (speed 4 vs walk 7) | run — **reused: the WALK cycle played faster** (no run art) |
| dash | WALK f3–5 fast | dash — reused WALK |
| crouch | CROUCH/JUMP f1–3 | crouch, crouch idle (held on f3), LOW start |
| jump | CROUCH/JUMP f4–6 | jump rise (f4–5) to apex (f6) |
| doubleJump | CROUCH/JUMP f4–6 | double jump — reused jump (no jump-start / land detail art) |
| fall | CROUCH/JUMP f7–8 | jump fall |
| guard | GUARD f1–2 | guard idle / block |
| crouchGuard | GUARD f2 | block while crouching — **reused GUARD f2** (no crouch-guard art) |
| blockHit | GUARD f3 | block hit |
| hurt | FALL f1–2 | hit react |
| hurt_air | FALL f2 | hit in the air — reused FALL f2 |
| knockdown | FALL f3–4 | knockdown → lying (also TOPPLE's forced knockdown on him if the mirror match does it) |
| getup | FALL f4 → f3 | get-up — **reused: FALL f3–4 reversed** (no get-up art) |
| dizzy | GUARD f4 | dizzy — **reused GUARD f4 curled guard** (no dizzy art) |
| transform | ROAR f1–5 | transform-in — reused ROAR |
| taunt | ROAR f1–5 | taunt |
| win | ROAR f5 | win pose (no separate win art; one variant) |
| lose | FALL f4 | lose pose (lying; no separate lose art) |
| light | PUNCH f1–2 | JAB |
| heavy | PUNCH f3–4 | HEAVY (190 px swing with the extracted swoosh) |
| down | GROUND ATTACK f2–3 | LOW (low swipe with dust, hits low) |
| up | PUNCH UP f1–6 | LAUNCHER (f5–6 the uppercut finisher) |
| air | FALL f1 | AIR — FALL f1 + a procedural render-only fist streak |
| grab | CRUSH f1–2 | the ordinary throw — reused CRUSH reach |
| hmTackle | TACKLE f1–4 | CHARGING TACKLE |
| hmQuake | GROUND STRIKE f1–6 | QUAKE SLAM |
| hmRoar | ROAR f1–5 | ROAR (growth cast) |
| hmCrush | CRUSH f1–6 | CRUSH GRAB (reach / seize / release) — also the EXTINCTION EVENT opener |
| hmCrushHold | CRUSH f3–5 loop | CRUSH GRAB hold ticks |
| hmPush | PUSH f1–8 loop | PUSH THROUGH |
| hmStomp | GROUND ATTACK f1 | METEOR STOMP dive body |
| hmStompLand | GROUND ATTACK f4–5 | METEOR STOMP landing |
| hmBackhand | PUNCH BACK f1–6 | EXTINCTION EVENT tail slam (f1–5 spin, f6 finisher). The brief's "BACKHAND (Heavy alt)" has no input in the brief's normal list, so it is used by the Ultimate only |
| hmUltStomp | GROUND ATTACK f1–4 + GROUND STRIKE f3 | EXTINCTION EVENT stomps |

All 80 sheet frames are used. Missing poses and their stand-ins: dizzy → GUARD f4; block while crouching → GUARD f2;
jump start / land detail → CROUCH/JUMP f3 / f4 (the crouch frames); get-up → FALL f4–3 reversed; win / lose variants →
ROAR f5 / FALL f4 only; run → WALK played faster.

## Effects

**Extracted from the sheet (part of their body frames):** the brown swoosh on PUNCH f3 (Heavy), PUNCH UP f5 (Launcher),
PUNCH BACK f5 (tail slam); the dust on GROUND ATTACK f3 (Low / ult stomp) and GROUND STRIKE f3 (Quake Slam / ult stomp).

**Procedural, pixel-style, render-only (never in GAME_STATE, no hitboxes):** the Quake Slam floor shockwave line (the
hitbox itself is a plain rectangle; the drawn line is decoration), the Meteor Stomp landing ring, Roar sound rings,
Charging Tackle / Push Through speed streaks, the Air fist streak, Tremor pips over the opponent, the TOPPLE burst, the Size
gauge and tier label in the HUD, the GIANT outline glint, the EXTINCTION EVENT camera zoom-out + scale-up, pixel dust and
hash-placed debris (positions from hash(match seed, frame, player index); drawn only), and camera shake.
