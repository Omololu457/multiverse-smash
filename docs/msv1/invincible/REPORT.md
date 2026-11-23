# MSV1-INVINCIBLE REPORT

Start commit **0beadf134** (docs/msv1/invincible/START_COMMIT.txt). The new fighter is key `invincible` (Invincible, Mark Grayson), in universe `invincible` beside Omni-Man and Omni-Man (Viltrumite).

## No old Invincible existed

`characters.js` at the start commit had no Invincible or Mark Grayson: no key, no art and no data stub. The only "Grayson" in the game is Robin (Dick Grayson, DC). Nothing was replaced, and no replay refers to an old Invincible id (REUSE.md).

## Frames: sheet rows → frames (76 in all, every one used)

| sheet row | frames | pieces |
|---|---|---|
| r1 | 12 | idle 1, takeoff 1, vertical streak 2, horizontal streak 2, flight 2, rings 3, portrait 1 |
| r2 | 17 | walk 4, lunge 1, flight punch 2, jump 2, stand 8 |
| r3 | 11 | flurry 5, uppercut 3, burst 3 |
| r4 | 9 | sweep 3, spin 3, rise 3 |
| r5 | 15 | fly 6, zip 2, zip streak 2, zip pose 2, zip ring 3 |
| r6 | 5 | hurt 5 |
| win | 5 | win poses |
| lose | 2 | lose poses |

- The 76 frames feed 29 body strips and 9 fx strips (38 strips). Every strip on disk is frames × cell wide, and no frame cell is empty.
- `tools/invincible/keycheck.py` checks every placed cell (97) against the source sheet. All **58,401** non-background source pixels are kept with the same colour, including **26,980 dark suit pixels**. The suit navy (27,30,39) is only 5 levels from the key colour.

## Numbers

| | value |
|---|---|
| health | **748** = round(0.65 × 1150). 1150 was the median at the start commit and is still the median of today's 166 selectable fighters. |
| meter | 200 (two bars) |
| ground run | **16.13 px/f** (1.1 × Sukuna (Shinjuku) 14.66) |
| flight top speed | **51.48** (0.9 × Omni-Man (Viltrumite) 57.2), reached in about 21 f (0.35 s) |
| flight profile | accel 2.451, drag 0.44, reverseBrake 0.6 |
| stop distance | release → stopped in ≤ 8 frames |
| snap turn | from top speed, moving the other way in ≤ 6 frames |
| block in flight | guards when below 60 % top speed; cannot guard above 60 % (`_invNoBlock`) |
| sonic boom | crossing 90 % top speed |
| Can't Stay Down | once per round: the lethal hit leaves 1 HP, then knockdown, then RESOLVE for 6 s (speed ×1.1, damage out ×1.2, damage in ×1.25). Says "Not yet." (vs Omni-Man: "I'd still have you, Dad."). |
| Terminal Velocity | 100 meter + 20 s cooldown. Phases: takeoff 30 f, aim 60 f (marker; ←/→ steers 14 px/f), fall 8 f, impact. 380 direct (±10 % of the screen), 120 shockwave (40 % band); a whiff is 50 f in the crater. Any level of Gojo's Infinity stops it. |

## Skins (20, premade, `tools/invincibleskins/`)

Viltrumite Mark, Mustache Mark, Mohawk Mark, Prison Mark, Sinister Mark, Maskless Mark, Full-Mask Mark, Pink Viltrumite — Rose Standard, Coronation, Defector — Debbie's Repair, Alien X — Two Earths, Alien X — Observatory Glass, Glitter — Black Ice, Glitter — Roller Rink 1999, Winning Valkyrie — Launch Angle, JJK — Divergent Flight, Grayson Delivery Service, Art School — Registration Error, Deep-Sea — Bathysphere, Earth Kept the Light On.

- **`build.py --verify`: 20 skins, 0 problems.** It checks the same frames and alpha (alpha changes only where hair was removed), protected pixels unchanged, the Alien X non-alien side unchanged, and the fx alpha rule.
- **Sinister cape:** painted *inside* the silhouette; the sheet has no cape and nothing was added outside the body.
  - Upright poses: a folded black wedge with a gold lining edge over the back arm and the back of the torso, from shoulder to hip.
  - Flat flight poses: a long gold band with a black upper edge along his back and back arm. It stops short of the glove so the fist stays clear.
  - It reads as a cape in every pose on both contact sheets (`skins/contact_viltrumite_…_sinister.png`).
- **Hair removals** (`skins/hair_removals.json`; pixels made transparent, nothing added):
  - **Mohawk Mark 4,121 px**: the sides are shaved, leaving the crest within ±1.6 px of the head's centre line.
  - **Prison Mark 5,654 px**: buzz cut to the skull line.
  - No other skin removes hair.
- **Four Viltrumites** (Viltrumite / Mustache / Rose Standard / Coronation): distinguishable with the names hidden.
  - On the ×3 sheets: `skins/four_viltrumites_{bright,dark}.png`.
  - In a real match: `screenshots/INVINCIBLE_four_viltrumites.png`. White, white with a moustache, rose pink, and white with a crimson sash.

## Tests: baseline (clean HEAD 0beadf134) vs final

| suite | baseline | final |
|---|---|---|
| determinism | 14/0 | 14/0 |
| combo-standard | 235/9 | 235/9 |
| up-attack-roster | 77/2 | 77/2 |
| credits | 11/3 | 11/3 |
| roster-integrity | PASSED | PASSED |
| replay_playback | 8/1 | 8/1 |
| net_online | 11/0 | 11/0 |
| render (vs Homelander, vs Superman) | 11/0 (reference pair) | 11/0, 11/0 |

All failures are pre-existing and identical to the baseline.

- **Frame-data diff:** zero for every existing character, including Omni-Man, Omni-Man (Viltrumite), Homelander, Superman, SPD Red and the ninjas. Only `invincible` was added.
- **Invincible suites:**
  - `invincible.test` 53/0: moves, numbers, Can't Stay Down, Terminal Velocity, the Gojo check, CPU, sound, HUD and roster.
  - `invincible_skins.test` 19/0: selector, preview, icons, match, rematch, replay, LAN and companion, with 20 skins.
  - `invincible_final.test` 10/0: frames, keying, one slot, credits and the numbers.
  - `invincible_match.test` 14/0, all on one match driven by real key presses:
    - full flight with a sonic boom, Barrage, Invincible Punch, Zip, then Terminal Velocity on earned meter;
    - determinism ×2;
    - replay with zero desync;
    - LAN: 795 shared frames, 0 different, 106 with the marker up;
    - companion: 1,032 files.

## Fixed in phase 6

- During Terminal Velocity, the camera chased Mark 1400 px up into an empty sky, which squeezed the foe and the marker into the bottom of the screen.
- While he is gone, his sim body now waits on the floor under the marker. He is invisible and invulnerable, and passes through the foe. The take-off rise is capped at 300 px.
- There was no frame-data change (see BALANCE_NOTES.md).

## Screenshots (`screenshots/`, all looked at)

Barrage, Invincible Punch burst, Zip, Can't Stay Down ("Not yet."), Resolve, and Terminal Velocity takeoff / aim (marker at the foe's feet) / fall (the beam) / impact (burst + shock ring) / crack. There are also the four Viltrumite skins, each in a match and composed side by side.
