# MSV1-OMNIMAN — sprite ledger (`omniman_viltrum`)

Source: `assets/incoming/omniman/omniman.png` 610×1032, background RGB(140, 70, 130) keyed with tolerance **0** (exact match).
Key check: nearest sprite pixel to the background = 73 (sum of |ΔRGB|), 0 pixels within 40.
Row 13 **pink afterimage**: 569 / 569 source pixels kept → intact = **True** (its closest colour is 73 from the background).
No credit text on this sheet (nothing excluded). Nearest-neighbour only; drawn at OMV_SCALE 2.

**Unused pieces: 0** — every frame is used.

## Real counts per row

| Row | y | pieces | merged fragments (streaks / glints) | brief said |
|---|---|---|---|---|
| R1 | 2–71 | **10** | 0 | 2 icons + 7 idle + 1 icon |
| R2 | 79–140 | **3** | 0 | 3 |
| R3 | 144–194 | **6** | 0 | 6 |
| R4 | 196–245 | **2** | 0 | 2 |
| R5 | 250–302 | **3** | 0 | 3 |
| R6 | 321–383 | **8** | 3 | 6 walk + 2 flight |
| R7 | 393–454 | **2** | 7 | 2 |
| R8 | 469–522 | **2** | 0 | 2 |
| R9 | 540–603 | **7** | 0 | 5 + 2 knockdown |
| R10 | 629–679 | **2** | 0 | 2 |
| R11 | 691–734 | **3** | 11 | 3 |
| R12 | 760–821 | **5** | 0 | 5 |
| R13 | 839–946 | **12** | 0 | ~11 |
| R14 | 969–1010 | **2** | 0 | 2 |

## Every piece → where it is used

| Piece | source box (y0,x0,y1,x1) | used in |
|---|---|---|
| R1.1 | (25, 3, 44, 18) | icon_0.png |
| R1.2 | (2, 4, 21, 19) | icon_1.png |
| R1.3 | (11, 13, 71, 44) | idle[0], intro[3], win[2], unimpressed[2] |
| R1.4 | (11, 50, 71, 81) | idle[1], unimpressed[3] |
| R1.5 | (11, 84, 71, 115) | idle[2] |
| R1.6 | (11, 117, 71, 148) | glint[0], win[0], unimpressed[0] |
| R1.7 | (11, 150, 71, 181) | glint[1], win[1], unimpressed[1] |
| R1.8 | (11, 184, 71, 215) | idle[3] |
| R1.9 | (11, 217, 71, 248) | idle[4] |
| R1.10 | (24, 505, 43, 520) | icon_2.png |
| R2.1 | (80, 10, 140, 41) | idle[5] |
| R2.2 | (79, 43, 140, 74) | idle[6], turn[1] |
| R2.3 | (79, 78, 140, 111) | idle[7] |
| R3.1 | (145, 8, 194, 52) | haymaker[0], returnPunch[0] |
| R3.2 | (144, 59, 194, 105) | haymaker[1], returnPunch[1] |
| R3.3 | (146, 116, 193, 158) | haymaker[2], throwSlam[0], returnPunch[2] |
| R3.4 | (146, 168, 193, 230) | blitz[0], grabRush[0], dashShort[0] |
| R3.5 | (147, 241, 193, 301) | blitz[1], grabRush[1] |
| R3.6 | (146, 314, 194, 357) | haymaker[3], throwSlam[1] |
| R4.1 | (196, 11, 245, 55) | flightPunch[0] |
| R4.2 | (199, 58, 243, 124) | flightPunch[1], orbitHold[0] |
| R5.1 | (250, 3, 302, 45) | straight[0] |
| R5.2 | (254, 51, 301, 101) | straight[1] |
| R5.3 | (253, 106, 300, 158) | straight[2] |
| R6.1 | (323, 6, 383, 43) | walk[0] |
| R6.2 | (322, 48, 383, 66) | walk[1] |
| R6.3 | (322, 73, 383, 93) | walk[2] |
| R6.4 | (322, 100, 383, 134) | walk[3] |
| R6.5 | (321, 140, 383, 159) | walk[4] |
| R6.6 | (322, 163, 383, 183) | walk[5] |
| R6.7 | (331, 204, 371, 268) | fly[0], meteor[1], grabRush[2] |
| R6.8 | (333, 268, 372, 334) | fly[1], meteor[0], grabRush[3] |
| R7.1 | (393, 5, 453, 35) | jab[0] |
| R7.2 | (394, 48, 454, 94) | jab[1], backhand[1] |
| R8.1 | (472, 8, 522, 50) | low[0], skyHook[0] |
| R8.2 | (469, 54, 521, 96) | low[1] |
| R9.1 | (550, 13, 603, 55) | guard[0] |
| R9.2 | (553, 69, 601, 111) | crouchGuard[0] |
| R9.3 | (540, 125, 603, 153) | turn[0] |
| R9.4 | (554, 162, 601, 204) | crouch[0] |
| R9.5 | (546, 221, 603, 258) | stepPunch[0], backhand[0], dashShort[1] |
| R9.6 | (552, 317, 596, 380) | knockdown[0], crash[0] |
| R9.7 | (557, 384, 596, 431) | knockdown[1], lose[0], crash[1] |
| R10.1 | (629, 2, 679, 46) | hurt[1], uppercut[0], skyHook[1], ascent[0] |
| R10.2 | (629, 52, 679, 94) | hurt[0] |
| R11.1 | (692, 9, 734, 51) | kick[0] |
| R11.2 | (691, 61, 734, 101) | kick[1] |
| R11.3 | (691, 109, 734, 151) | kick[2] |
| R12.1 | (760, 10, 821, 34) | point[0] |
| R12.2 | (760, 43, 821, 67) | point[1] |
| R12.3 | (760, 71, 821, 106) | point[2] |
| R12.4 | (760, 109, 821, 146) | point[3] |
| R12.5 | (760, 150, 821, 186) | point[4] |
| R13.1 | (873, 13, 944, 27) | fx/boom[0] |
| R13.2 | (853, 32, 944, 44) | fx/boom[1] |
| R13.3 | (839, 48, 945, 50) | fx/boom[2] |
| R13.4 | (877, 53, 934, 92) | fx/afterimage[0] |
| R13.5 | (878, 94, 935, 134) | takeoff[0], hover[0], skyHook[2] |
| R13.6 | (881, 128, 931, 169) | takeoff[1], skyHook[3] |
| R13.7 | (884, 174, 924, 210) | brake[0] |
| R13.8 | (878, 210, 933, 247) | brake[1] |
| R13.9 | (871, 254, 942, 294) | brake[2] |
| R13.10 | (905, 294, 946, 339) | landHard[0], intro[0], meteorLand[0] |
| R13.11 | (911, 343, 946, 390) | landHard[1], intro[1], meteorLand[1] |
| R13.12 | (897, 394, 945, 438) | getup[0], intro[2] |
| R14.1 | (969, 5, 1010, 50) | land[0] |
| R14.2 | (976, 54, 1010, 101) | land[1] |

## Strips

| strip | frames | cell |
|---|---|---|
| idle | 8 | 48×61 |
| glint | 2 | 40×60 |
| turn | 2 | 40×63 |
| walk | 6 | 40×62 |
| fly | 2 | 66×40 |
| takeoff | 2 | 50×57 |
| hover | 1 | 48×57 |
| brake | 3 | 42×71 |
| landHard | 2 | 52×41 |
| getup | 1 | 48×48 |
| land | 2 | 54×41 |
| crouch | 1 | 58×47 |
| guard | 1 | 54×53 |
| crouchGuard | 1 | 60×48 |
| hurt | 2 | 62×50 |
| knockdown | 2 | 64×44 |
| jab | 2 | 72×60 |
| straight | 3 | 74×52 |
| haymaker | 4 | 66×50 |
| blitz | 2 | 62×47 |
| low | 2 | 52×52 |
| kick | 3 | 56×43 |
| flightPunch | 2 | 90×49 |
| stepPunch | 1 | 48×57 |
| point | 5 | 50×61 |
| uppercut | 1 | 62×50 |
| intro | 4 | 52×60 |
| win | 3 | 40×60 |
| lose | 1 | 48×39 |
| unimpressed | 4 | 40×60 |
| backhand | 2 | 72×60 |
| skyHook | 4 | 62×57 |
| meteor | 2 | 66×40 |
| meteorLand | 2 | 52×41 |
| crash | 2 | 64×44 |
| grabRush | 4 | 66×47 |
| throwSlam | 2 | 66×48 |
| ascent | 1 | 62×50 |
| orbitHold | 1 | 90×44 |
| returnPunch | 3 | 60×50 |
| dashShort | 2 | 62×57 |
| fx/boom | 3 | 14×106 |
| fx/afterimage | 1 | 39×57 |
