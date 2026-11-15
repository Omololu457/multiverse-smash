# Elastigirl — SPRITE LEDGER

Source: `assets/sprites/elastigirl.png (byte copy of "Game Boy Advance - The Incredibles - Playable Characters - Elastigirl.png")` · SHA-256 `70f6aefe71dcc45345c95ddc807769aeee572a673517b542170d0c2147e46603` · 600×1623.
Background (0,128,128) keyed exactly (tolerance 0). Excluded: 351 px of the red "repeat" bracket + label under the dome row, 878 px of the "Ripped by redblueyellow. No credit needed." text. Kept: white slash FX, white hit-flash silhouettes, grey shadow ovals.
Frames are 8-connected component unions; detached limb pieces (≤6 px) join the body frame to their left. Anchor = feet baseline + torso centre (gold belt/emblem pixels), never the limb.
Contact sheet with row.frame labels: `docs/elastigirl/contact_sheet.png`. Real frames win over the brief's best-effort inventory — differences are listed at the end.

| Frame | Sheet rect (x, y, w, h) | Anchor | Animation strip(s) | Move / state |
|---|---|---|---|---|
| R1.1 | (2, 2, 32, 27) | (16, 27) (bbox) | `portrait (HUD / select)` | portrait (HUD / select) |
| R2.1 | (2, 32, 24, 50) | (12, 50) (torso) | `idle`, `intro` | Idle stance (R2); Round intro (R17 stretch → R2 idle) |
| R2.2 | (28, 33, 24, 49) | (12, 49) (torso) | `idle` | Idle stance (R2) |
| R2.3 | (54, 35, 24, 47) | (12, 47) (torso) | `idle` | Idle stance (R2) |
| R2.4 | (80, 35, 24, 47) | (12, 47) (torso) | `idle` | Idle stance (R2) |
| R2.5 | (106, 35, 24, 47) | (12, 47) (torso) | `idle` | Idle stance (R2) |
| R2.6 | (132, 34, 24, 48) | (12, 48) (torso) | `idle` | Idle stance (R2) |
| R2.7 | (158, 33, 24, 49) | (12, 49) (torso) | `idle` | Idle stance (R2) |
| R2.8 | (184, 32, 23, 50) | (12, 50) (torso) | `idle` | Idle stance (R2) |
| R3.1 | (2, 85, 28, 51) | (16, 51) (torso) | `run`, `walk`, `walk_back` | Run (R3, faster cadence); Walk forward; Walk back (R3 reversed) |
| R3.2 | (32, 87, 30, 49) | (17, 48) (torso) | `run`, `walk`, `walk_back` | Run (R3, faster cadence); Walk forward; Walk back (R3 reversed) |
| R3.3 | (64, 86, 25, 50) | (13, 49) (torso) | `run`, `walk`, `walk_back` | Run (R3, faster cadence); Walk forward; Walk back (R3 reversed) |
| R3.4 | (91, 85, 23, 51) | (9, 51) (torso) | `run`, `walk`, `walk_back` | Run (R3, faster cadence); Walk forward; Walk back (R3 reversed) |
| R3.5 | (116, 85, 27, 51) | (15, 50) (torso) | `run`, `walk`, `walk_back` | Run (R3, faster cadence); Walk forward; Walk back (R3 reversed) |
| R3.6 | (145, 87, 29, 49) | (19, 49) (torso) | `run`, `walk`, `walk_back` | Run (R3, faster cadence); Walk forward; Walk back (R3 reversed) |
| R3.7 | (176, 86, 24, 50) | (15, 50) (torso) | `run`, `walk`, `walk_back` | Run (R3, faster cadence); Walk forward; Walk back (R3 reversed) |
| R3.8 | (202, 86, 19, 50) | (10, 50) (torso) | `run`, `walk`, `walk_back` | Run (R3, faster cadence); Walk forward; Walk back (R3 reversed) |
| R4.1 | (2, 162, 25, 39) | (13, 39) (torso) | `crouch` | Crouch — no dedicated crouch frame on the sheet: reuses R4.1 (jump crouch) |
| R4.2 | (29, 154, 24, 47) | (12, 47) (torso) | `jump` | Jump: rise + flips (R4.2–R4.8) |
| R4.3 | (57, 139, 22, 62) | (11, 62) (torso) | `jump` | Jump: rise + flips (R4.2–R4.8) |
| R4.4 | (81, 139, 22, 61) | (11, 61) (torso) | `jump` | Jump: rise + flips (R4.2–R4.8) |
| R4.5 | (105, 139, 30, 49) | (14, 49) (torso) | `eBounce`, `jump` | Defense BOUNCE BACK (R4 flips + landing); Jump: rise + flips (R4.2–R4.8) |
| R4.6 | (137, 139, 28, 43) | (12, 43) (torso) | `eBounce`, `jump` | Defense BOUNCE BACK (R4 flips + landing); Jump: rise + flips (R4.2–R4.8) |
| R4.7 | (167, 139, 28, 43) | (13, 43) (torso) | `eBounce`, `jump` | Defense BOUNCE BACK (R4 flips + landing); Jump: rise + flips (R4.2–R4.8) |
| R4.8 | (197, 139, 27, 49) | (13, 49) (torso) | `eBounce`, `jump` | Defense BOUNCE BACK (R4 flips + landing); Jump: rise + flips (R4.2–R4.8) |
| R4.9 | (226, 139, 23, 62) | (14, 62) (torso) | `fall` | Fall (R4.9) |
| R4.10 | (251, 162, 25, 39) | (13, 39) (torso) | `eBounce`, `land` | Defense BOUNCE BACK (R4 flips + landing); Landing (jump / Slingshot / Parachute) |
| R4.11 | (278, 154, 24, 47) | (12, 47) (torso) | `land` | Landing (jump / Slingshot / Parachute) |
| R4.s1 | (304, 192, 24, 9) | (12, 9) (bbox) | `fx:parachuteShadow` | fx:parachuteShadow |
| R4.s2 | (331, 194, 19, 7) | (10, 7) (bbox) | `fx:parachuteShadow` | fx:parachuteShadow |
| R4.s3 | (354, 195, 15, 6) | (8, 6) (bbox) | `fx:parachuteShadow` | fx:parachuteShadow |
| R4.s4 | (371, 196, 13, 5) | (6, 5) (bbox) | `fx:parachuteShadow` | fx:parachuteShadow |
| R4.s5 | (386, 197, 9, 4) | (4, 4) (bbox) | `fx:parachuteShadow` | fx:parachuteShadow |
| R4.s6 | (397, 198, 7, 3) | (4, 3) (bbox) | `fx:parachuteShadow` | fx:parachuteShadow |
| R5.1 | (2, 204, 37, 44) | (15, 44) (torso) | `dash`, `eDome` | Dash (R5.1 low run pose); Special PARACHUTE DROP grounded (R5: hop → dome → recover) |
| R5.2 | (41, 204, 46, 26) | (13, 26) (torso) | `eDome` | Special PARACHUTE DROP grounded (R5: hop → dome → recover) |
| R5.3 | (89, 204, 66, 51) | (27, 51) (torso) | `eDome`, `eDomeFloat` | Special PARACHUTE DROP grounded (R5: hop → dome → recover); PARACHUTE DROP air float (R5.3–R5.6 — the sheet's "repeat" bracket marks this loop) |
| R5.4 | (157, 204, 68, 53) | (27, 53) (torso) | `eDome`, `eDomeFloat` | Special PARACHUTE DROP grounded (R5: hop → dome → recover); PARACHUTE DROP air float (R5.3–R5.6 — the sheet's "repeat" bracket marks this loop) |
| R5.5 | (227, 204, 68, 57) | (26, 57) (torso) | `eDome`, `eDomeFloat` | Special PARACHUTE DROP grounded (R5: hop → dome → recover); PARACHUTE DROP air float (R5.3–R5.6 — the sheet's "repeat" bracket marks this loop) |
| R5.6 | (297, 204, 67, 53) | (26, 53) (torso) | `eDome`, `eDomeFloat`, `eDomeSlam` | Special PARACHUTE DROP grounded (R5: hop → dome → recover); PARACHUTE DROP air float (R5.3–R5.6 — the sheet's "repeat" bracket marks this loop); PARACHUTE DROP slam (R5.6 dome) + landing (R5.7–5.8, alias eDomeLand) |
| R5.7 | (366, 204, 46, 26) | (13, 26) (torso) | `eDome`, `eDomeSlam` | Special PARACHUTE DROP grounded (R5: hop → dome → recover); PARACHUTE DROP slam (R5.6 dome) + landing (R5.7–5.8, alias eDomeLand) |
| R5.8 | (414, 204, 37, 44) | (15, 44) (torso) | `eDome`, `eDomeSlam` | Special PARACHUTE DROP grounded (R5: hop → dome → recover); PARACHUTE DROP slam (R5.6 dome) + landing (R5.7–5.8, alias eDomeLand) |
| R6.1 | (2, 275, 28, 50) | (16, 50) (torso) | `light` | JAB 6f/20/0 (R6.1–6.3, spark = active) |
| R6.2 | (32, 275, 33, 50) | (20, 50) (torso) | `light` | JAB 6f/20/0 (R6.1–6.3, spark = active) |
| R6.3 | (67, 287, 84, 38) | (36, 38) (torso) | `light` | JAB 6f/20/0 (R6.1–6.3, spark = active) |
| R6.4 | (153, 287, 77, 38) | (36, 38) (torso) | `heavy` | HEAVY 14f/54/−5 (R6.4–6.6) |
| R6.5 | (232, 283, 59, 42) | (32, 42) (torso) | `heavy` | HEAVY 14f/54/−5 (R6.4–6.6) |
| R6.6 | (293, 280, 40, 45) | (20, 45) (torso) | `heavy` | HEAVY 14f/54/−5 (R6.4–6.6) |
| R7.1 | (2, 328, 125, 59) | (65, 59) (torso) | `eWhirl` | Special WHIRL KICK (R7, slash arcs kept) |
| R7.2 | (141, 335, 147, 52) | (78, 52) (torso) | `eWhirl` | Special WHIRL KICK (R7, slash arcs kept) |
| R7.3 | (304, 328, 104, 59) | (42, 59) (torso) | `eWhirl` | Special WHIRL KICK (R7, slash arcs kept) |
| R7.4 | (410, 335, 119, 52) | (44, 52) (torso) | `eWhirl` | Special WHIRL KICK (R7, slash arcs kept) |
| R8.1 | (2, 390, 41, 44) | (28, 44) (torso) | `eLongArm`, `grab` | Special LONG ARM — extend (R8); Throw (Long Arm extension frames) |
| R8.2 | (45, 393, 53, 41) | (34, 41) (torso) | `eLongArm`, `grab` | Special LONG ARM — extend (R8); Throw (Long Arm extension frames) |
| R8.3 | (100, 398, 86, 36) | (36, 36) (torso) | `eLongArm` | Special LONG ARM — extend (R8) |
| R8.4 | (188, 398, 104, 36) | (36, 36) (torso) | `eLongArm` | Special LONG ARM — extend (R8) |
| R8.5 | (294, 398, 238, 36) | (36, 36) (torso) | `eLongArm` | Special LONG ARM — extend (R8) |
| R9.1 | (2, 437, 228, 36) | (36, 36) (torso) | `eLongWhiff` | LONG ARM whiff wobble (R9) |
| R9.2 | (232, 437, 190, 36) | (36, 36) (torso) | `eLongWhiff` | LONG ARM whiff wobble (R9) |
| R9.3 | (424, 437, 172, 36) | (36, 36) (torso) | `eLongWhiff` | LONG ARM whiff wobble (R9) |
| R10.1 | (2, 485, 142, 36) | (36, 36) (torso) | `eLongPull`, `grab` | LONG ARM on hit — retract/pull (R10.1–10.3); Throw (Long Arm extension frames) |
| R10.2 | (146, 485, 117, 36) | (36, 36) (torso) | `eLongPull` | LONG ARM on hit — retract/pull (R10.1–10.3) |
| R10.3 | (265, 485, 86, 36) | (36, 36) (torso) | `eLongPull` | LONG ARM on hit — retract/pull (R10.1–10.3) |
| R10.4 | (353, 485, 69, 36) | (36, 36) (torso) | `eLongRecover` | LONG ARM recovery (R10.4–10.7); also the FAMILY RAFT 100 f lockout pose (alias eUltRecover) |
| R10.5 | (424, 476, 61, 45) | (32, 45) (torso) | `eLongRecover` | LONG ARM recovery (R10.4–10.7); also the FAMILY RAFT 100 f lockout pose (alias eUltRecover) |
| R10.6 | (487, 477, 37, 44) | (21, 44) (torso) | `eLongRecover` | LONG ARM recovery (R10.4–10.7); also the FAMILY RAFT 100 f lockout pose (alias eUltRecover) |
| R10.7 | (526, 475, 32, 46) | (17, 46) (torso) | `eLongRecover` | LONG ARM recovery (R10.4–10.7); also the FAMILY RAFT 100 f lockout pose (alias eUltRecover) |
| R11.1 | (2, 630, 32, 46) | (17, 46) (torso) | `up` | LAUNCHER 12f/48/−9 (R11 diagonal reach) |
| R11.2 | (36, 632, 41, 44) | (28, 44) (torso) | `up` | LAUNCHER 12f/48/−9 (R11 diagonal reach) |
| R11.3 | (79, 634, 65, 42) | (31, 42) (torso) | `up` | LAUNCHER 12f/48/−9 (R11 diagonal reach) |
| R11.4 | (146, 614, 66, 62) | (28, 62) (torso) | `up` | LAUNCHER 12f/48/−9 (R11 diagonal reach) |
| R11.5 | (214, 604, 88, 72) | (28, 72) (torso) | `up` | LAUNCHER 12f/48/−9 (R11 diagonal reach) |
| R11.6 | (304, 524, 156, 152) | (28, 152) (torso) | `up` | LAUNCHER 12f/48/−9 (R11 diagonal reach) |
| R12.1 | (2, 678, 167, 160) | (28, 160) (torso) | `eSling` | SLINGSHOT anchor / pendulum swing (R12) |
| R12.2 | (171, 706, 136, 132) | (28, 132) (torso) | `eSling` | SLINGSHOT anchor / pendulum swing (R12) |
| R12.3 | (309, 727, 128, 111) | (28, 111) (torso) | `eSling` | SLINGSHOT anchor / pendulum swing (R12) |
| R13.1 | (2, 840, 101, 97) | (28, 97) (torso) | `eSlingRelease` | SLINGSHOT release / recovery (R13) |
| R13.2 | (105, 846, 87, 91) | (28, 91) (torso) | `eSlingRelease` | SLINGSHOT release / recovery (R13) |
| R13.3 | (194, 865, 76, 72) | (28, 72) (torso) | `eSlingRelease` | SLINGSHOT release / recovery (R13) |
| R13.4 | (272, 881, 64, 56) | (28, 56) (torso) | `eSlingRelease` | SLINGSHOT release / recovery (R13) |
| R13.5 | (338, 895, 63, 42) | (31, 42) (torso) | `eSlingRelease` | SLINGSHOT release / recovery (R13) |
| R13.6 | (403, 893, 33, 44) | (21, 44) (torso) | `eSlingRelease` | SLINGSHOT release / recovery (R13) |
| R13.7 | (438, 887, 28, 50) | (16, 50) (torso) | `eSlingRelease` | SLINGSHOT release / recovery (R13) |
| R14.1 | (2, 1053, 32, 46) | (17, 46) (torso) | `eUltWindup`, `eWhip` | ULTIMATE FAMILY RAFT windup (R14.1–14.5; alias eUlt); Special OVERHEAD WHIP (R14 vertical whip) |
| R14.2 | (36, 1053, 41, 46) | (26, 46) (torso) | `eUltWindup`, `eWhip` | ULTIMATE FAMILY RAFT windup (R14.1–14.5; alias eUlt); Special OVERHEAD WHIP (R14 vertical whip) |
| R14.3 | (79, 1044, 42, 55) | (14, 55) (torso) | `eUltWindup`, `eWhip` | ULTIMATE FAMILY RAFT windup (R14.1–14.5; alias eUlt); Special OVERHEAD WHIP (R14 vertical whip) |
| R14.4 | (123, 1020, 25, 79) | (10, 79) (torso) | `eUltWindup`, `eWhip` | ULTIMATE FAMILY RAFT windup (R14.1–14.5; alias eUlt); Special OVERHEAD WHIP (R14 vertical whip) |
| R14.5 | (150, 1012, 30, 87) | (10, 87) (torso) | `eUltWindup`, `eWhip` | ULTIMATE FAMILY RAFT windup (R14.1–14.5; alias eUlt); Special OVERHEAD WHIP (R14 vertical whip) |
| R14.6 | (182, 940, 25, 159) | (10, 159) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R14.7 | (209, 948, 25, 151) | (10, 151) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R14.8 | (236, 972, 25, 127) | (10, 127) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R14.9 | (263, 988, 25, 111) | (10, 111) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R14.10 | (290, 1012, 25, 87) | (10, 87) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R14.11 | (317, 1025, 26, 74) | (10, 74) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R14.12 | (345, 1056, 51, 43) | (22, 43) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R14.13 | (398, 1055, 33, 44) | (21, 44) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R14.14 | (433, 1053, 32, 46) | (17, 46) (torso) | `eWhip` | Special OVERHEAD WHIP (R14 vertical whip) |
| R15.1 | (2, 1103, 54, 23) | (39, 23) (torso) | `eLow` | LOW stretch sweep 8f/28/−4 (R15) |
| R15.2 | (58, 1102, 97, 24) | (35, 24) (torso) | `eLow` | LOW stretch sweep 8f/28/−4 (R15) |
| R15.3 | (157, 1102, 87, 23) | (39, 23) (torso) | `eLow` | LOW stretch sweep 8f/28/−4 (R15) |
| R16.1 | (2, 1143, 63, 48) | (24, 48) (torso) | `air` | AIR 7f/30/+2 (R16) |
| R16.2 | (67, 1129, 57, 62) | (24, 62) (torso) | `air` | AIR 7f/30/+2 (R16) |
| R17.1 | (2, 1194, 21, 60) | (13, 60) (torso) | `eGuard`, `guard`, `intro`, `taunt` | Defense STRETCH GUARD parry (R17); Block stance (R17.1 stretch guard pose); Round intro (R17 stretch → R2 idle); Taunt (R17 tall stretch) |
| R17.2 | (25, 1195, 34, 59) | (14, 59) (torso) | `eGuard`, `intro`, `taunt` | Defense STRETCH GUARD parry (R17); Round intro (R17 stretch → R2 idle); Taunt (R17 tall stretch) |
| R17.3 | (61, 1195, 21, 79) | (13, 79) (torso) | `eGuard`, `intro`, `taunt` | Defense STRETCH GUARD parry (R17); Round intro (R17 stretch → R2 idle); Taunt (R17 tall stretch) |
| R18.1 | (2, 1277, 30, 53) | (15, 53) (bbox) | `knockdown` | hit_flash (R18.1) → knockdown, lie |
| R18.2 | (34, 1277, 42, 48) | (17, 48) (torso) | `hurt_air`, `knockdown` | Air hit react (R18.2 fly back); hit_flash (R18.1) → knockdown, lie |
| R18.3 | (78, 1314, 67, 16) | (20, 16) (torso) | `knockdown`, `lose` | hit_flash (R18.1) → knockdown, lie; Lose pose (lying) |
| R18.4 | (147, 1314, 59, 16) | (18, 16) (torso) | `knockdown`, `lose` | hit_flash (R18.1) → knockdown, lie; Lose pose (lying) |
| R18.5 | (208, 1311, 59, 19) | (17, 19) (torso) | `knockdown`, `lose` | hit_flash (R18.1) → knockdown, lie; Lose pose (lying) |
| R18.6 | (269, 1299, 53, 31) | (15, 31) (torso) | `getup` | Get up (R18.6–R18.10) |
| R18.7 | (324, 1289, 28, 41) | (10, 41) (torso) | `getup` | Get up (R18.6–R18.10) |
| R18.8 | (354, 1292, 28, 38) | (14, 38) (torso) | `getup` | Get up (R18.6–R18.10) |
| R18.9 | (384, 1287, 36, 43) | (18, 43) (torso) | `getup` | Get up (R18.6–R18.10) |
| R18.10 | (422, 1290, 28, 40) | (12, 40) (torso) | `getup` | Get up (R18.6–R18.10) |
| R19.1 | (2, 1333, 15, 62) | (8, 62) (bbox) | `hurt` | hit_flash (R19.1 white silhouette) → light hit react |
| R19.2 | (19, 1333, 15, 62) | (9, 62) (torso) | `hurt2` | Heavy hit react |
| R19.3 | (36, 1354, 28, 41) | (19, 41) (torso) | `hurt` | hit_flash (R19.1 white silhouette) → light hit react |
| R19.4 | (66, 1352, 28, 43) | (19, 43) (torso) | `hurt2` | Heavy hit react |
| R19.5 | (96, 1351, 29, 44) | (20, 44) (torso) | `hurt2` | Heavy hit react |
| R20.1 | (2, 1398, 29, 50) | (16, 50) (torso) | `win` | Win poses (R20) |
| R20.2 | (33, 1399, 25, 49) | (12, 49) (torso) | `win` | Win poses (R20) |
| R20.3 | (60, 1401, 23, 47) | (9, 47) (torso) | `win` | Win poses (R20) |
| R20.4 | (85, 1401, 24, 47) | (11, 47) (torso) | `win` | Win poses (R20) |
| R20.5 | (111, 1401, 24, 47) | (11, 47) (torso) | `win` | Win poses (R20) |
| R20.6 | (137, 1400, 24, 48) | (11, 48) (torso) | `win` | Win poses (R20) |
| R20.7 | (163, 1399, 24, 49) | (11, 49) (torso) | `win` | Win poses (R20) |
| R21.1 | (2, 1453, 64, 33) | (32, 33) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R21.2 | (68, 1453, 63, 33) | (32, 33) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R21.3 | (133, 1455, 67, 31) | (34, 31) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R22.1 | (2, 1489, 60, 41) | (30, 41) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R22.2 | (64, 1492, 58, 38) | (29, 38) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R22.3 | (124, 1499, 63, 31) | (32, 31) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R23.1 | (2, 1533, 63, 43) | (32, 43) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R23.2 | (67, 1537, 58, 39) | (29, 39) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R23.3 | (127, 1538, 62, 38) | (31, 38) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R24.1 | (2, 1584, 56, 35) | (28, 35) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R24.2 | (60, 1586, 44, 33) | (22, 33) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R24.3 | (106, 1584, 33, 35) | (16, 35) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R24.4 | (140, 1586, 44, 33) | (22, 33) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R24.5 | (186, 1584, 56, 35) | (28, 35) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R24.6 | (244, 1583, 45, 36) | (22, 36) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R24.7 | (291, 1579, 33, 40) | (16, 40) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |
| R24.8 | (326, 1581, 45, 38) | (22, 38) (bbox) | `eRaft` | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |

## Strips (engine animation → frames in play order)

| Strip | Frames | Move / state |
|---|---|---|
| `idle` | R2.1, R2.2, R2.3, R2.4, R2.5, R2.6, R2.7, R2.8 | Idle stance (R2) |
| `walk` | R3.1, R3.2, R3.3, R3.4, R3.5, R3.6, R3.7, R3.8 | Walk forward |
| `walk_back` | R3.8, R3.7, R3.6, R3.5, R3.4, R3.3, R3.2, R3.1 | Walk back (R3 reversed) |
| `run` | R3.1, R3.2, R3.3, R3.4, R3.5, R3.6, R3.7, R3.8 | Run (R3, faster cadence) |
| `dash` | R5.1 | Dash (R5.1 low run pose) |
| `crouch` | R4.1 | Crouch — no dedicated crouch frame on the sheet: reuses R4.1 (jump crouch) |
| `jump` | R4.2, R4.3, R4.4, R4.5, R4.6, R4.7, R4.8 | Jump: rise + flips (R4.2–R4.8) |
| `fall` | R4.9 | Fall (R4.9) |
| `land` | R4.10, R4.11 | Landing (jump / Slingshot / Parachute) |
| `guard` | R17.1 | Block stance (R17.1 stretch guard pose) |
| `hurt` | R19.1, R19.3 | hit_flash (R19.1 white silhouette) → light hit react |
| `hurt2` | R19.2, R19.4, R19.5 | Heavy hit react |
| `hurt_air` | R18.2 | Air hit react (R18.2 fly back) |
| `knockdown` | R18.1, R18.2, R18.3, R18.4, R18.5 | hit_flash (R18.1) → knockdown, lie |
| `getup` | R18.6, R18.7, R18.8, R18.9, R18.10 | Get up (R18.6–R18.10) |
| `lose` | R18.3, R18.4, R18.5 | Lose pose (lying) |
| `win` | R20.1, R20.2, R20.3, R20.4, R20.5, R20.6, R20.7 | Win poses (R20) |
| `intro` | R17.1, R17.2, R17.3, R2.1 | Round intro (R17 stretch → R2 idle) |
| `taunt` | R17.1, R17.2, R17.3, R17.2 | Taunt (R17 tall stretch) |
| `grab` | R8.1, R8.2, R10.1 | Throw (Long Arm extension frames) |
| `light` | R6.1, R6.2, R6.3 | JAB 6f/20/0 (R6.1–6.3, spark = active) |
| `heavy` | R6.4, R6.5, R6.6 | HEAVY 14f/54/−5 (R6.4–6.6) |
| `eLow` | R15.1, R15.2, R15.3 | LOW stretch sweep 8f/28/−4 (R15) |
| `up` | R11.1, R11.2, R11.3, R11.4, R11.5, R11.6 | LAUNCHER 12f/48/−9 (R11 diagonal reach) |
| `air` | R16.1, R16.2 | AIR 7f/30/+2 (R16) |
| `eLongArm` | R8.1, R8.2, R8.3, R8.4, R8.5 | Special LONG ARM — extend (R8) |
| `eLongWhiff` | R9.1, R9.2, R9.3 | LONG ARM whiff wobble (R9) |
| `eLongPull` | R10.1, R10.2, R10.3 | LONG ARM on hit — retract/pull (R10.1–10.3) |
| `eLongRecover` | R10.4, R10.5, R10.6, R10.7 | LONG ARM recovery (R10.4–10.7); also the FAMILY RAFT 100 f lockout pose (alias eUltRecover) |
| `eWhirl` | R7.1, R7.2, R7.3, R7.4 | Special WHIRL KICK (R7, slash arcs kept) |
| `eDome` | R5.1, R5.2, R5.3, R5.4, R5.5, R5.6, R5.7, R5.8 | Special PARACHUTE DROP grounded (R5: hop → dome → recover) |
| `eDomeFloat` | R5.3, R5.4, R5.5, R5.6 | PARACHUTE DROP air float (R5.3–R5.6 — the sheet's "repeat" bracket marks this loop) |
| `eDomeSlam` | R5.6, R5.7, R5.8 | PARACHUTE DROP slam (R5.6 dome) + landing (R5.7–5.8, alias eDomeLand) |
| `eWhip` | R14.1, R14.2, R14.3, R14.4, R14.5, R14.6, R14.7, R14.8, R14.9, R14.10, R14.11, R14.12, R14.13, R14.14 | Special OVERHEAD WHIP (R14 vertical whip) |
| `eSling` | R12.1, R12.2, R12.3 | SLINGSHOT anchor / pendulum swing (R12) |
| `eSlingRelease` | R13.1, R13.2, R13.3, R13.4, R13.5, R13.6, R13.7 | SLINGSHOT release / recovery (R13) |
| `eGuard` | R17.1, R17.2, R17.3 | Defense STRETCH GUARD parry (R17) |
| `eBounce` | R4.5, R4.6, R4.7, R4.8, R4.10 | Defense BOUNCE BACK (R4 flips + landing) |
| `eUltWindup` | R14.1, R14.2, R14.3, R14.4, R14.5 | ULTIMATE FAMILY RAFT windup (R14.1–14.5; alias eUlt) |
| `eRaft` | R21.1, R21.2, R21.3, R22.1, R22.2, R22.3, R23.1, R23.2, R23.3, R24.1, R24.2, R24.3, R24.4, R24.5, R24.6, R24.7, R24.8 | ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only) |

## Inventory vs real sheet

- R4 has 11 body frames + **6** grey shadow ovals (brief: shadow ovals listed under R5). The ovals sit on the R4 band (y 192–201); used as the Parachute Drop ground shadow (FX layer, largest → smallest as she rises).
- R5 = 8 frames: run-crouch, flatten, **4 domes** (the red "repeat" bracket under them marks the float loop), flatten, stand.
- R7 Whirl Kick = 4 frames, each with its own scattered white slash arcs (split by fixed columns 0/135/296/408).
- R13 has 7 frames (brief ~6); R14 has 14 (brief ~16); R20 has 7 (brief 8); R21–R24 = 3+3+3+8 = 17 raft frames.
- R17.2 includes a detached raised forearm (2 px right of the body) per the ≤6 px merge rule.
- No dedicated crouch frame exists: crouch reuses R4.1 (the jump-start crouch).
- Missing poses reuse the closest frame: dash = R5.1, land = R4.10–4.11, Bounce Back = R4 flips, Long Arm grab/throw = R8.1–8.2 + R10.1, ultimate lockout = R10.4–10.7.
