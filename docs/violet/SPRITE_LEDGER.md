# Violet Parr — SPRITE LEDGER

Source: `assets/sprites/violet.png` (byte-identical copy of the supplied "Game Boy Advance - The Incredibles - Playable Characters - Violet.png", SHA-256 `4bf0ab802aaf3514e69e0c4f2b46d5d57811a1c66e4691a9345fceff898e6f20`). Background key = the exact corner colour `(0, 128, 128)` (all four corners agree), zero tolerance; the purple invisibility figures and the bubble/ring rims are kept, ring interiors (background colour) become transparent. The "Ripped by redblueyellow. No credit needed." caption (band 19, x ≥ 105) is excluded. Cut = 8-connected components → 19 row bands → x-overlap merge (one ring = one frame) → specks to the nearest frame. Every frame below is used; no art was invented. Reuse is listed explicitly.

This ledger is authoritative over the brief's best-effort inventory. Differences found on the real sheet:

- R5 and R6 are both leaning poses: R5 = an 8-frame walk cycle, R6 = arms-forward push (Jab f1–3, Heavy / Force Push f4–8).
- R11 is a front-facing invisible stance (used for invisible idle **and** walk); R12 is its visible twin (exact palette remap), used for the Vanish fade-in and the intro.
- R17 f8–f11 (not f5–f6) are the curled ball used by Force Ball; R17 f5–f7 are crouch / Low poses.
- R16 has 10 frames (hit back → fall → lie ×3 → sit up → rise ×3); R17 has 11.
- No guard pose exists: BLOCK = R6 f1 held + the R13 f3 ring drawn over her (render-only).
- R13 f1–f3 are pixel-identical to R8 f1–f3 (the sheet repeats them); both are kept and both are used.

| frame | band | source rect (x0,y0,x1,y1) | animation(s) | move / use |
|---|---|---|---|---|
| R1f1 | R1 portrait | 2,2,34,29 | portrait | HUD / select portrait |
| R2f1 | R2 idle | 2,32,18,87 | idle | neutral stance |
| R2f2 | R2 idle | 20,33,37,87 | idle | neutral stance |
| R2f3 | R2 idle | 39,33,55,87 | idle | neutral stance |
| R2f4 | R2 idle | 57,33,73,87 | idle | neutral stance |
| R2f5 | R2 idle | 75,32,91,87 | idle | neutral stance |
| R2f6 | R2 idle | 93,32,109,87 | idle | neutral stance |
| R3f1 | R3 run | 2,90,46,137 | run, dash | run; dash (run long strides) |
| R3f2 | R3 run | 48,93,81,137 | run | run |
| R3f3 | R3 run | 83,92,107,137 | run | run |
| R3f4 | R3 run | 109,90,150,137 | run, dash | run; dash (run long strides) |
| R3f5 | R3 run | 152,93,184,137 | run | run |
| R3f6 | R3 run | 186,92,209,137 | run | run |
| R4f1 | R4 jump/flip | 2,161,27,198 | jump, up | jump rise; LAUNCHER (+ upward R13 burst) |
| R4f2 | R4 jump/flip | 29,140,43,198 | jump, up | jump rise; LAUNCHER (+ upward R13 burst) |
| R4f3 | R4 jump/flip | 45,140,66,179 | doubleJump, air | double jump (flip); AIR attack (+ air downAir alias) |
| R4f4 | R4 jump/flip | 68,147,92,179 | doubleJump, air | double jump (flip); AIR attack (+ air downAir alias) |
| R4f5 | R4 jump/flip | 94,147,118,179 | doubleJump, air | double jump (flip); AIR attack (+ air downAir alias) |
| R4f6 | R4 jump/flip | 120,143,143,198 | fall | jump fall |
| R4f7 | R4 jump/flip | 145,161,170,198 | land | landing |
| R4f8 | R4 jump/flip | 172,152,196,198 | land | landing |
| R5f1 | R5 walk | 2,201,31,244 | walk, walk_back | walk forward; walk back (R5 reversed) |
| R5f2 | R5 walk | 33,201,62,244 | walk, walk_back | walk forward; walk back (R5 reversed) |
| R5f3 | R5 walk | 64,203,93,244 | walk, walk_back | walk forward; walk back (R5 reversed) |
| R5f4 | R5 walk | 95,201,124,244 | walk, walk_back | walk forward; walk back (R5 reversed) |
| R5f5 | R5 walk | 126,201,155,244 | walk, walk_back | walk forward; walk back (R5 reversed) |
| R5f6 | R5 walk | 157,201,186,244 | walk, walk_back | walk forward; walk back (R5 reversed) |
| R5f7 | R5 walk | 188,203,217,244 | walk, walk_back | walk forward; walk back (R5 reversed) |
| R5f8 | R5 walk | 219,201,248,244 | walk, walk_back | walk forward; walk back (R5 reversed) |
| R6f1 | R6 push | 2,247,32,291 | guard, light | BLOCK — R6 f1 held + R13 f3 ring drawn by violetFx (no dedicated guard art on the sheet); JAB (+ R13 f1 burst at the hands on hit) |
| R6f2 | R6 push | 34,248,68,291 | light | JAB (+ R13 f1 burst at the hands on hit) |
| R6f3 | R6 push | 70,250,99,291 | light | JAB (+ R13 f1 burst at the hands on hit) |
| R6f4 | R6 push | 101,248,130,291 | heavy, vPush, vUlt | HEAVY (+ R13 f3 ring); FORCE PUSH cast (R14 projectile); FULL FORCE cast (R8 trap → R15 max dome) |
| R6f5 | R6 push | 132,247,162,291 | heavy, vPush, vUlt | HEAVY (+ R13 f3 ring); FORCE PUSH cast (R14 projectile); FULL FORCE cast (R8 trap → R15 max dome) |
| R6f6 | R6 push | 164,248,195,291 | heavy, vPush, vShield, vUlt | HEAVY (+ R13 f3 ring); FORCE PUSH cast (R14 projectile); BUBBLE SHIELD cast (R15 dome); FULL FORCE cast (R8 trap → R15 max dome) |
| R6f7 | R6 push | 197,250,226,291 | heavy, vPush, vShield, vUlt | HEAVY (+ R13 f3 ring); FORCE PUSH cast (R14 projectile); BUBBLE SHIELD cast (R15 dome); FULL FORCE cast (R8 trap → R15 max dome) |
| R6f8 | R6 push | 228,247,257,291 | heavy, vPush, vShield, vUlt | HEAVY (+ R13 f3 ring); FORCE PUSH cast (R14 projectile); BUBBLE SHIELD cast (R15 dome); FULL FORCE cast (R8 trap → R15 max dome) |
| R7f1 | R7 vanish-out | 2,294,25,343 | vPhase, vanish | PHASE STEP (invisible backdash); VANISH fade-out (enter) |
| R7f2 | R7 vanish-out | 27,294,51,343 | vPhase, vanish | PHASE STEP (invisible backdash); VANISH fade-out (enter) |
| R7f3 | R7 vanish-out | 53,294,90,343 | vPhase, vanish | PHASE STEP (invisible backdash); VANISH fade-out (enter) |
| R7f4 | R7 vanish-out | 92,294,123,343 | vPhase, vanish | PHASE STEP (invisible backdash); VANISH fade-out (enter) |
| R7f5 | R7 vanish-out | 125,294,154,343 | vPhase, vanish | PHASE STEP (invisible backdash); VANISH fade-out (enter) |
| R7f6 | R7 vanish-out | 156,294,187,343 | vPhase, vanish | PHASE STEP (invisible backdash); VANISH fade-out (enter) |
| R8f1 | R8 trap-fx | 2,357,44,408 | fx_trap | FIELD TRAP bubble form + FULL FORCE trap |
| R8f2 | R8 trap-fx | 46,346,123,417 | fx_trap | FIELD TRAP bubble form + FULL FORCE trap |
| R8f3 | R8 trap-fx | 125,346,206,417 | fx_trap | FIELD TRAP bubble form + FULL FORCE trap |
| R8f4 | R8 trap-fx | 208,346,284,417 | fx_trap | FIELD TRAP bubble form + FULL FORCE trap |
| R8f5 | R8 trap-fx | 287,346,360,417 | fx_trap | FIELD TRAP bubble form + FULL FORCE trap |
| R8f6 | R8 trap-fx | 361,347,426,416 | fx_trap | FIELD TRAP bubble form + FULL FORCE trap |
| R9f1 | R9 inv-crouch | 2,420,24,450 | inv_crouch | invisible crouch (35% alpha) |
| R9f2 | R9 inv-crouch | 26,420,48,450 | inv_crouch | invisible crouch (35% alpha) |
| R10f1 | R10 ball-shell | 2,453,73,528 | fx_shell | FORCE BALL shell |
| R10f2 | R10 ball-shell | 75,454,144,528 | fx_shell | FORCE BALL shell |
| R11f1 | R11 inv-walk | 2,531,28,584 | inv_idle, inv_walk | invisible idle (35% alpha); invisible walk (35% alpha) |
| R11f2 | R11 inv-walk | 30,531,56,584 | inv_idle, inv_walk | invisible idle (35% alpha); invisible walk (35% alpha) |
| R11f3 | R11 inv-walk | 58,532,85,584 | inv_idle, inv_walk | invisible idle (35% alpha); invisible walk (35% alpha) |
| R11f4 | R11 inv-walk | 87,532,111,584 | inv_idle, inv_walk | invisible idle (35% alpha); invisible walk (35% alpha) |
| R11f5 | R11 inv-walk | 113,532,137,584 | inv_idle, inv_walk | invisible idle (35% alpha); invisible walk (35% alpha) |
| R11f6 | R11 inv-walk | 139,532,163,584 | inv_idle, inv_walk | invisible idle (35% alpha); invisible walk (35% alpha) |
| R12f1 | R12 reappear | 2,586,28,639 | intro, reappear | intro (appears out of thin air: the visible fade-in figures); VANISH fade-in (exit / ambush hit) |
| R12f2 | R12 reappear | 30,586,56,639 | intro, reappear | intro (appears out of thin air: the visible fade-in figures); VANISH fade-in (exit / ambush hit) |
| R12f3 | R12 reappear | 58,587,85,639 | intro, reappear | intro (appears out of thin air: the visible fade-in figures); VANISH fade-in (exit / ambush hit) |
| R12f4 | R12 reappear | 87,587,111,639 | intro, reappear | intro (appears out of thin air: the visible fade-in figures); VANISH fade-in (exit / ambush hit) |
| R12f5 | R12 reappear | 113,587,137,639 | intro, reappear | intro (appears out of thin air: the visible fade-in figures); VANISH fade-in (exit / ambush hit) |
| R12f6 | R12 reappear | 139,587,163,639 | intro, reappear | intro (appears out of thin air: the visible fade-in figures); VANISH fade-in (exit / ambush hit) |
| R13f1 | R13 hit-fx | 2,653,44,704 | fx_hit | jab / low / launcher hit FX; block ring (f3) |
| R13f2 | R13 hit-fx | 46,642,123,713 | fx_hit | jab / low / launcher hit FX; block ring (f3) |
| R13f3 | R13 hit-fx | 125,642,206,713 | fx_hit | jab / low / launcher hit FX; block ring (f3) |
| R14f1 | R14 push-fx | 2,726,56,778 | fx_push | FORCE PUSH projectile |
| R14f2 | R14 push-fx | 58,716,135,787 | fx_push | FORCE PUSH projectile |
| R14f3 | R14 push-fx | 137,716,220,787 | fx_push | FORCE PUSH projectile |
| R14f4 | R14 push-fx | 222,716,299,787 | fx_push | FORCE PUSH projectile |
| R14f5 | R14 push-fx | 301,716,378,787 | fx_push | FORCE PUSH projectile |
| R14f6 | R14 push-fx | 380,717,455,786 | fx_push | FORCE PUSH projectile |
| R15f1 | R15 dome-fx | 2,799,76,875 | fx_dome | BUBBLE SHIELD dome + FULL FORCE detonation (max size) |
| R15f2 | R15 dome-fx | 78,792,171,881 | fx_dome | BUBBLE SHIELD dome + FULL FORCE detonation (max size) |
| R15f3 | R15 dome-fx | 173,790,266,883 | fx_dome | BUBBLE SHIELD dome + FULL FORCE detonation (max size) |
| R15f4 | R15 dome-fx | 268,793,361,880 | fx_dome | BUBBLE SHIELD dome + FULL FORCE detonation (max size) |
| R15f5 | R15 dome-fx | 363,793,456,880 | fx_dome | BUBBLE SHIELD dome + FULL FORCE detonation (max size) |
| R15f6 | R15 dome-fx | 458,794,549,879 | fx_dome | BUBBLE SHIELD dome + FULL FORCE detonation (max size) |
| R16f1 | R16 knockdown | 2,886,33,927 | hurt_air, knockdown | air hit react; knockdown |
| R16f2 | R16 knockdown | 35,893,63,927 | hurt_air, knockdown | air hit react; knockdown |
| R16f3 | R16 knockdown | 65,900,100,927 | hurt_air, knockdown | air hit react; knockdown |
| R16f4 | R16 knockdown | 102,914,169,927 | knockdown, lose | knockdown; lose pose (lying) |
| R16f5 | R16 knockdown | 171,909,228,927 | knockdown, lose | knockdown; lose pose (lying) |
| R16f6 | R16 knockdown | 230,914,290,927 | knockdown, lose | knockdown; lose pose (lying) |
| R16f7 | R16 knockdown | 292,899,336,927 | getup | get up |
| R16f8 | R16 knockdown | 338,892,361,927 | getup | get up |
| R16f9 | R16 knockdown | 363,890,388,927 | getup | get up |
| R16f10 | R16 knockdown | 390,886,413,927 | getup | get up |
| R17f1 | R17 hurt/crouch/curl | 2,930,29,983 | hurt | hit react |
| R17f2 | R17 hurt/crouch/curl | 31,930,63,981 | hurt | hit react |
| R17f3 | R17 hurt/crouch/curl | 65,949,95,983 | hurt | hit react |
| R17f4 | R17 hurt/crouch/curl | 97,946,126,983 | hurt | hit react |
| R17f5 | R17 hurt/crouch/curl | 128,942,155,983 | crouch, vLow | crouch; LOW (+ R13 burst) |
| R17f6 | R17 hurt/crouch/curl | 157,942,185,983 | crouch | crouch |
| R17f7 | R17 hurt/crouch/curl | 187,951,222,983 | vLow | LOW (+ R13 burst) |
| R17f8 | R17 hurt/crouch/curl | 224,969,269,983 | vBall | FORCE BALL roll body (R10 shell around it) |
| R17f9 | R17 hurt/crouch/curl | 271,966,313,983 | vBall | FORCE BALL roll body (R10 shell around it) |
| R17f10 | R17 hurt/crouch/curl | 315,969,360,983 | vBall | FORCE BALL roll body (R10 shell around it) |
| R17f11 | R17 hurt/crouch/curl | 362,965,404,983 | vBall | FORCE BALL roll body (R10 shell around it) |
| R18f1 | R18 small-pose | 2,986,24,1016 | taunt, dizzy | taunt; dizzy fallback |
| R19f1 | R19 win | 2,1021,31,1070 | win, vTrap, vUlt | win pose; FIELD TRAP cast (R8 bubble at the opponent); FULL FORCE cast (R8 trap → R15 max dome) |
| R19f2 | R19 win | 33,1021,57,1070 | win | win pose |
| R19f3 | R19 win | 59,1021,82,1070 | win | win pose |
| R19f4 | R19 win | 84,1019,102,1070 | win | win pose |

Total: 106 frames, 106 used, 0 unused.

## Animations

| animation | frames | use |
|---|---|---|
| `idle` | R2f1 R2f2 R2f3 R2f4 R2f5 R2f6 | neutral stance |
| `walk` | R5f1 R5f2 R5f3 R5f4 R5f5 R5f6 R5f7 R5f8 | walk forward |
| `walk_back` | R5f8 R5f7 R5f6 R5f5 R5f4 R5f3 R5f2 R5f1 | walk back (R5 reversed) |
| `run` | R3f1 R3f2 R3f3 R3f4 R3f5 R3f6 | run |
| `dash` | R3f1 R3f4 | dash (run long strides) |
| `jump` | R4f1 R4f2 | jump rise |
| `doubleJump` | R4f3 R4f4 R4f5 | double jump (flip) |
| `fall` | R4f6 | jump fall |
| `land` | R4f7 R4f8 | landing |
| `crouch` | R17f5 R17f6 | crouch |
| `guard` | R6f1 | BLOCK — R6 f1 held + R13 f3 ring drawn by violetFx (no dedicated guard art on the sheet) |
| `hurt` | R17f1 R17f2 R17f3 R17f4 | hit react |
| `hurt_air` | R16f1 R16f2 R16f3 | air hit react |
| `knockdown` | R16f1 R16f2 R16f3 R16f4 R16f5 R16f6 | knockdown |
| `getup` | R16f7 R16f8 R16f9 R16f10 | get up |
| `lose` | R16f4 R16f5 R16f6 | lose pose (lying) |
| `win` | R19f1 R19f2 R19f3 R19f4 | win pose |
| `taunt` | R18f1 | taunt |
| `dizzy` | R18f1 | dizzy fallback |
| `intro` | R12f1 R12f2 R12f3 R12f4 R12f5 R12f6 | intro (appears out of thin air: the visible fade-in figures) |
| `light` | R6f1 R6f2 R6f3 | JAB (+ R13 f1 burst at the hands on hit) |
| `heavy` | R6f4 R6f5 R6f6 R6f7 R6f8 | HEAVY (+ R13 f3 ring) |
| `vLow` | R17f5 R17f7 | LOW (+ R13 burst) |
| `up` | R4f1 R4f2 | LAUNCHER (+ upward R13 burst) |
| `air` | R4f3 R4f4 R4f5 | AIR attack (+ air downAir alias) |
| `vPush` | R6f4 R6f5 R6f6 R6f7 R6f8 | FORCE PUSH cast (R14 projectile) |
| `vShield` | R6f6 R6f7 R6f8 | BUBBLE SHIELD cast (R15 dome) |
| `vBall` | R17f8 R17f9 R17f10 R17f11 | FORCE BALL roll body (R10 shell around it) |
| `vTrap` | R19f1 | FIELD TRAP cast (R8 bubble at the opponent) |
| `vUlt` | R19f1 R6f4 R6f5 R6f6 R6f7 R6f8 | FULL FORCE cast (R8 trap → R15 max dome) |
| `vPhase` | R7f1 R7f2 R7f3 R7f4 R7f5 R7f6 | PHASE STEP (invisible backdash) |
| `vanish` | R7f1 R7f2 R7f3 R7f4 R7f5 R7f6 | VANISH fade-out (enter) |
| `inv_idle` | R11f1 R11f2 R11f3 R11f4 R11f5 R11f6 | invisible idle (35% alpha) |
| `inv_walk` | R11f1 R11f2 R11f3 R11f4 R11f5 R11f6 | invisible walk (35% alpha) |
| `inv_crouch` | R9f1 R9f2 | invisible crouch (35% alpha) |
| `reappear` | R12f1 R12f2 R12f3 R12f4 R12f5 R12f6 | VANISH fade-in (exit / ambush hit) |
| `fx/trap` | R8f1 R8f2 R8f3 R8f4 R8f5 R8f6 | FIELD TRAP bubble form + FULL FORCE trap |
| `fx/shell` | R10f1 R10f2 | FORCE BALL shell |
| `fx/hit` | R13f1 R13f2 R13f3 | jab / low / launcher hit FX; block ring (f3) |
| `fx/push` | R14f1 R14f2 R14f3 R14f4 R14f5 R14f6 | FORCE PUSH projectile |
| `fx/dome` | R15f1 R15f2 R15f3 R15f4 R15f5 R15f6 | BUBBLE SHIELD dome + FULL FORCE detonation (max size) |
