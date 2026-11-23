# MSV1-OMNIMAN REPORT

Start commit: **3a3634e62** · new fighter key `omniman_viltrum` · phases 0–6 on main.

## Existing Omni-Man
Yes: `omniman` was already in characters.js (Invincible universe, the old canFly flight, Smart Atoms meter). It is
untouched (frame-data diff ZERO) and still selectable. The new fighter is a separate key.

## Real frame counts (sheet 610×1032, key RGB 140,70,130, tolerance 0)
Pieces per sheet row: R1 10 · R2 3 · R3 6 · R4 2 · R5 3 · R6 8 · R7 2 · R8 2 · R9 7 · R10 2 · R11 3 · R12 5 · R13 12 · R14 2
(67 pieces: body frames, 2 fx strips (boom 3, afterimage 1), 3 head icons). Nothing unused, nothing excluded.
Animations (161 frames in 59 strips): idle 8, glint 2, turn 2, walk 6, fly 2, takeoff 2, hover 1, brake 3, landHard 2,
getup 1, land 2, crouch 1, guard 1, crouchGuard 1, hurt 2, knockdown 2, jab 2, straight 3, haymaker 4, blitz 2, low 2,
kick 3, flightPunch 2, stepPunch 1, point 5, uppercut 1, intro 4, win 3, lose 1, unimpressed 4, backhand 2, skyHook 4,
meteor 2, meteorLand 2, crash 2, grabRush 4, throwSlam 2, ascent 1, orbitHold 1, returnPunch 3, dashShort 2.
The afterimage frame is intact after keying: 569 of 569 pixels, minimum distance to the key colour 59.

## Flight numbers
Copied: the fastest flier = Dseyl, maxH 44, accel 4.4; Homelander drag 0.84.
Final profile: maxH **57.2** (1.3 × 44), accel **5.5** (1.25 × 4.4), drag **0.9292** (coast = 2.5 × Homelander), 0.6 s to turn
around, ≤ 25° per 10 frames at top speed, brake = 80 % in 10 frames, no block above 40 %, boom at 90 %, crash at 70 %,
hard landing at 70 %. Still the fastest flier including Invincible (51.48).
Speed damage: raw × (1 + 0.6 × speed fraction). The flight punch measured live hits for 64 at 0 %, 85 at 54 %
(design 83 at 50 %) and 102 at 100 %.

## Ultimate
ESCAPE VELOCITY: input **Ultimate (U)**, cost **100 meter**, 20 s cooldown. Grab → ascent → orbit → return → impact →
settle, 420 damage. A miss overshoots (40 f open); Gojo's Infinity makes it miss.

## Skins simplified for size (logged)
- Diamondhead Mantle: the crystal planes are fixed body-local cells; the folded arms read as one faceted block.
- Art Deco Express: the cream shoulder → fist stripe became a cream edge along the arms.
- Midnight Western: the stepped border is ivory only (an ivory/black border read as fringe).
- Heavyweight Cornerman: the gold N is small at match size.
- Imperial Uniform: the project has no Viltrumite insignia reference, so it uses the sheet's own chest-emblem shape as a dark mark.

## Fixed during the build
- With no skins.js entry he drew at half size (spriteScale 1) in real matches; every skin now carries his scale.
- A coasting punch did damage from the current frame's speed but reported the peak; it now uses the peak for both.
- The held foe in Omni-Man's state was a plain reference. Replay checkpoints serialized the whole fighter, including
  render fields, which caused a false desync. It is now non-enumerable; serialization carries only its side.

## Tests: baseline → final
| suite | baseline | final |
|---|---|---|
| determinism | 14/0 | 14/0 |
| combo-standard | 235/9 | 235/9 |
| up-attack-roster | 77/2 | 77/2 |
| credits | 11/3 | 11/3 |
| roster-integrity | ok | ok |
| replay_playback | 8/1 | 8/1 |
| net_online | 11/0 | 11/0 |
| render check | 11/0 | 11/0 |
| frame-data (every other char) | — | ZERO DIFF |
New: moves 47/0, flight 24/0, determinism 13/0, skins 19/0, one-match 17/0 (determinism, replay, LAN, companion,
EV restore, orbit frame time), final 9/0.
