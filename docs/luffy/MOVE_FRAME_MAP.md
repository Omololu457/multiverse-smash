# Move frame map

Every source region was inspected. Combat names below are original game designs,
not a claim of anime-arc fidelity. All art comes from the supplied PNG.

The packer mirrors native-left poses once, pads each anatomical pivot to (160,150)
in a 320×200 transparent cell, and preserves source RGBA bytes. Rendering uses a
constant 2.3 logical pixels per source pixel. The body never scales to fit a limb.

Guard uses the hand-near-head gesture (fallback, not a verified blocking sequence).
Grab/throw uses the flailing/reaching sequence (fallback; shared throws own damage).
Launcher reaction uses hurt_air; land uses the closest supplied crouched landing pose.
Back walk reverses the supplied alternate stepping cycle. No other fighter art is used.

| Runtime action | Ordered stable source IDs |
|---|---|
| idle | r00_00, r00_01, r00_02, r00_03, r00_04, r00_05, r00_06 |
| walk | r01_00, r01_01, r01_02, r01_03, r01_04, r01_05 |
| walk_back | r04_05, r04_04, r04_03, r04_02, r04_01, r04_00 |
| run | r06_00, r06_01, r06_02, r06_03, r06_04, r06_05 |
| dash | r06_00, r06_01, r06_02, r06_03, r06_04, r06_05 |
| crouch | r07_00a, r07_00b |
| jump | r05_01, r05_02, r05_03, r05_04 |
| fall | r05_05, r05_06, r05_07, r05_08 |
| land | r05_11, r00_00 |
| guard | r50_01 |
| guard_hit | r50_01, r07_00b |
| hurt | r25_00, r25_01, r25_02 |
| hurt_heavy | r25_01, r25_02, r25_03 |
| hurt_air | r25_04, r25_05, r25_06, r25_07 |
| knockdown | r25_04, r25_05, r25_06, r25_07, r26_00 |
| getup | r26_02a, r26_02b, r26_02c, r26_03, r26_04, r26_05, r26_06, r26_07 |
| grab | r45_02, r45_03, r45_04, r45_05 |
| win | r48_00, r48_01, r48_02, r48_03, r48_04, r48_05, r48_06 |
| lose | r55_00a, r55_00b, r55_00c, r55_00d, r55_01 |
| light | r08_00, r08_01, r08_02, r08_03 |
| lfJ2 | r08_03, r08_04, r08_05, r08_06, r00_00 |
| lfJ3 | r10_01, r10_02, r10_04, r10_05, r00_00 |
| heavy | r10_00, r10_01, r10_02, r10_03, r10_04, r10_05, r00_00 |
| lfLow | r22_04, r22_00, r22_01, r22_05, r00_00 |
| up | r11_00, r11_01, r11_06, r11_07, r11_08, r11_09, r00_00 |
| air | r43_00, r43_01, r43_02, r43_03, r43_04, r43_05, r43_06 |
| down_air | r23_00, r23_03a, r23_04, r23_05a, r23_05b |
| lfCmd1 | r08_03, r08_04, r08_05, r08_06 |
| lfCmd2 | r54_00, r22_00, r22_01, r22_05 |
| lfCmd3 | r10_01, r10_02, r10_03, r10_05, r00_00 |
| lfPiston | r10_00, r10_01, r10_02, r10_03, r10_04, r10_05, r00_00 |
| lfReel | r32_00, r32_01, r32_02, r32_03, r32_04, r32_05, r33_02a, r33_02b, r00_00 |
| lfPinwheel | r21_00, r21_01, r21_02, r21_03a, r21_03b, r21_04, r22_00, r22_01, r22_02, r22_03, r22_04, r22_05, r00_00 |
| lfBrace | r36_00, r36_01, r36_02, r36_03, r36_04, r36_05, r36_06, r36_07, r36_08, r36_09a, r36_09b |
| lfAnchor | r23_00, r23_01, r23_02, r23_03a, r23_03b, r23_04, r23_05a, r23_05b |
| lfFinale | r10_00, r10_01, r24_00, r24_01, r24_02, r24_03, r24_04, r24_05, r24_06, r10_02, r10_03, r10_04, r10_05, r00_00 |
| lfSnap | r33_02a, r33_02b, r33_03, r33_04 |
| intro | r48_00, r48_01, r48_02, r48_03, r00_00 |
| fx_ring | r42_00, r42_01, r42_02, r42_03a, r42_03b, r42_04, r42_05 |

Attack frame changes use explicit simulation-frame timelines in luffyData.js.
The timelines hold coiled poses through startup, show the extension on active frames,
and then retract through recovery. Balloon uses the actual inflation/deflation cycle.
Body/hurt/movement boxes remain 60×100 regardless of the wide padded render canvas.
Circular colored frames are inventoried as independent FX; kept out of collision.
