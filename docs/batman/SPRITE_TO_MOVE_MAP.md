# Batman (rebuilt) — Sprite → Move Map

Cells are named `r<row>_<col>` on the supplied SNES sheet (rects in `source_rects.json → body.cells`).
Timelines (elapsed tick → strip frame) are `TIMELINE` in `batmanData.js`; hitboxes are derived from the drawn limb
of the active cell (+6 px leniency) and stored in sheet px (`box = [front0, front1, top, bottom]`, × SCALE 1.4).

## Body (Batman)

| action / move | cells | ticks/frame | notes |
|---|---|---|---|
| idle | r0_0–r0_3 | 9 loop | |
| walk / walk_back / run | r1_0–r1_5 (reversed for back) | 6 / 7 / 4 | |
| dash | r3_8, r4_0 | 5 | physical dash (Shadow Dash reuses it, faster) |
| jump / doubleJump / fall / land | r3_0–2 / r4_1, r3_3, r4_3 / r3_4, r4_0 / r3_0, r13_6 | | double jump = fresh second press |
| crouch, guard | r10_0 / r8_5–6 | | |
| hurt, knockdown, getup | r8_0 / r8_1–2 / r8_3–4 | | |
| lose / win | r8_1–2 / r11_3, r7_6, r7_7 | | win = salute → cape settle |
| intro / introSettle | r13_0–r13_6 / r7_6, r7_7, r0_0 | 7 / 12 | rope descent and landing → cape settle |
| grab (throw) | r7_0, r7_1, r7_5 | 6 | |
| **light** Jab | r2_0–2 | 4 | active on the extended fist |
| **bL2** Cross | r7_3–4 | 4 | |
| **bL3** Rising Knee | r7_2, r2_3 | 5 | chain ender |
| **bLow** Low Strike | r10_0–2 | 4 | crouched punch, hits low |
| **heavy** Heavy Kick | r2_6–8 | 5 | |
| **bSpin** Spinning Advance | r2_3–r2_8 | 5 | advancing spin kick |
| **up** Rising Uppercut (launcher) | r10_0, r10_3, r3_1 | 5 | shared Balanced launcher |
| **bSweep** Sweep | r10_4–5 | 6 | |
| **air** Air Strike / **bAirK** Air Kick | r3_5–6 / r3_7, r4_2 | 4 / 5 | |
| **bDive** Cape Dive / bDiveLand | r4_4 / r13_5–6 | 6 | |
| **bCounter** / **bCounterHit** | r8_5 / r13_1, r13_2, r2_7, r2_8 | 8 / 4 | cape catch → sweep kick |
| **bBatarang** | r5_0–r5_3 | 4 | thrown from the `hand` anchor of r5_3; batarang sprite = body cells `bat_0..` |
| **bGrapnel** | r11_0–2 | 5 | rope / hook from the `muzzle` anchors of r11_* |
| **bRopeKick** / bRopeLand | r6_0–r6_5 / r6_6 | 4 / 8 | pulled foe meets the kick |
| **bRooftop** Rooftop Extraction | r12_0–r12_3, r13_4 | 5 | grapnel zip upward (`muzzle` anchors of r12_*) |
| **bSmoke** Smoke and Shadow | r11_4–6 | 6 | pellet throw |
| order gestures cmdSky / cmdPoint / cmdCarrier / cmdSkyhook / cmdCover / cmdAuto | r11_3, r7_3 / r11_0, r11_2 / r7_3, r7_4, r0_0 / r12_0–1 / r9_6–8 / r9_0–r9_5 | 7–10 | signal gestures (commit frame launches the op) |
| **ultOpen** grapnel opener / ultWatch / ultSalute | r11_0–2 / r12_1 / r11_3 | 5 / 8 / 8 | KNIGHTFALL |

## Fleet (supplied generic packs)

| row | sheet / label | used as |
|---|---|---|
| scout_idle / scout_scan / scout_walk / scout_walkscan / scout_death | d2 IDLE, SCAN, WALK, WALK_SCAN, DEATH | Airspace scanner: arrive, scan, target bracket, leave / destroyed |
| bomber_drop / bomber_walk (2) | d2 DROP, WALK, WALK2 | Airspace bombardiers: arrival, orbit banks |
| bombs | d6 BOMBS | Airspace bomb (6 attitudes, tumbling) |
| capsule | d2 CAPSULE | Capsule Cover smoke canister |
| platform_idle / walk / death | d3 | Interceptor box-platform support bolts |
| inter_fwd / inter_idle / inter_fire1 / inter_fire2 / inter_back / inter_death | d3 | Cross-fire Interceptor gunship |
| carrier_hover / carrier_move / carrier_back | d4 DEATH (=hover) / IDLE (=lateral) / BACK (=collapse) | Arsenal Carrier |
| lurker | dt Lurker | Carrier ground unit: tracked cannon (3 shells) |
| defender / defender2 / ammo | dt Defender rows + pieces | Carrier launcher unit (2 arcing rounds + gun round) |
| hunter / hunter_turn | dt Hunter rows | Capsule Cover walker gunner (fires forward, then behind) |
| steelwing | dt Steel Wing | Capsule Cover winged gunner pass |
| heli_idle / heli_walk / heli_land / heli_death | d6 | Skyhook rotorcraft (hook check, lift, drop) |
| plane_drop | d6 DROP | KNIGHTFALL fixed-wing aircraft (tether captive; bay open) |
| auto_a1 / a2 / a3 / a4 / auto_death | rb ATTACK1–4, DEATH | Wayne Automaton beams (40 / 40 / 70), brace stride, shutdown |
| crew_a / crew_b / crew_c | d4 crew rows | intro card crew only |
| explosion | `assets/krybot/explosion.png` | machine deaths + KNIGHTFALL impact (×3.2) |
