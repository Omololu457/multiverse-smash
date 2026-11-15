# Robin — moveset

**Robin (Dick Grayson)** · DC / Teen Titans · *Gadget Tactician / Mobile Mid-range* · HP 1100 · Gadget Energy 100 ·
speed 98 / dash 22 (= Toji: walk 9.5 px/f, the physics cap, and the shared speed-tier teleport threshold 98) ·
jumpPower 26 · `maxJumps 2` (the **shared** double jump, no energy cost, no third jump) · dash 22 × 10 f, cooldown 26.

**Smoke Vanish (double-tap toward the foe):** the shared speed-tier blink (48 f cooldown), dressed by Robin: a smoke
burst where he stood, the Smoke Drop throw pose, a second burst where he lands, and he reappears on the **far side** of
the foe facing back at them (stage-clamped; against a wall it stays the shared same-side blink). No damage, no
invulnerability. A double-tap **away** stays the shared ordinary dash (or Smoke Step inside his own smoke).

Teen Titans buff (2026-11-14): HP 960 → 1100, stored damage scale 1.7 → 1.95 (≈ +15 % applied), grab throw 9 / −4,
blast radius 40 → 48, Bird's-Eye Bomb now flies straight and far (vx 14 × 70 f fuse ≈ 980 px).

Cyborg was not edited. Robin is tuned to feel responsive by short startups (light 5 f), instant walk, the shared
double jump and cancels from clean punches into the staff.

Damage: authored **raw** values; stored damage = round(raw × 1.95) (same roster-parity lever as Cyborg / Raven /
Rangers), then the shared defense / combo scaling. Startup = frames before the first active frame (60 ticks / s).

## Normals

| move | input | startup | active | recovery | raw | notes |
|---|---|---|---|---|---|---|
| Punch 1 — back-fist | Light | 5 | 2 | 10 | 16 | chain starter |
| Punch 2 — straight | fresh Light after a clean Punch 1 | 6 | 2 | 12 | 20 | advances 3 px/f (f1–9) |
| Punch 3 — rising finish | fresh Light after a clean Punch 2 | 9 | 3 | 20 | 30 | lifts (kbY −8); 3 stages max |
| Low staff check | Down + Light / Down + Heavy | 7 | 2 | 13 | 22 | **hits low** |
| Staff Sweep | Heavy | 12 | 4 | 20 | 46 | 94 px reach |
| Pole-vault launcher | Up + Heavy / Up-Attack | 11 | 4 | 22 | 36 | launcher (anti-air) |
| Advancing staff lunge | Forward + Heavy | 13 | 3 | 24 | 44 | travels, knocks away; committed ender |
| Midair Kick | air Light / air Heavy | 7 | 4 | 14 | 26 | |
| Grab | Grab | 8 | 3 | 26 | 28 | shared grab |

Cancels: clean Punch 1 / 2 / Low → fresh Heavy / Forward + Heavy / Up + Heavy. Clean normals (recovery) → any
Special. Staff Sweep / Punch 3 / Advancing lunge → Ultimate.

## Specials (Special + direction, facing-relative; priority Up > Forward > Back > Down > Neutral)

| special | input | cost | startup | notes |
|---|---|---|---|---|
| Bird's-Eye Bomb | Neutral Special | 12 | 14 | flies STRAIGHT like a regular projectile (vx 14, no gravity) ≈ 980 px over its 70 f fuse, explodes on wall / foe / fuse end; blast raw 44, r 48, one hit per target; no homing |
| Air Bird's-Eye Bomb | air Special (not Up) | 12 | 8 | straight down-forward diagonal (vx 11, vy 5, no gravity); once per airtime |
| Smoke Drop | Down + Special | 15 | 8 | 128 × 96 px field, 75 f, max 1 (recast replaces); cover only: no damage, stun, blindness, invulnerability or control loss |
| Smoke Step | double-tap Back inside his own smoke (Forward = Smoke Vanish) | — | 1 | one per field; 12 px/f × 12 f = 144 px physical dash (ordinary dash ≈ 94 px); stage-clamped; stops at the opponent's body; **no invulnerability**; 4 cosmetic echo copies; a clean hit within 40 f shows the cosmetic OUTPLAY cue |
| Staff Express | Forward + Special | 16 | 10 | the "Play 3 Times" flurry exactly three times — explicit hit windows f10–12 / 22–24 / 34–36 (raw 12 each) + push f45–47 (raw 30); each window connects once; travels 3 px/f |
| Rooftop Route | Up + Special | 16 | 9 | rising staff raw 34 → rise (vy −13.5); once per airtime; Up + Special never jumps; never refunds a jump |
| Dead Drop | Back + Special | 14 | 10 | plants a bomb 44 px ahead; arms visibly over 36 f; life 480 f; max 1 (second refused, nothing spent); one eligible hostile attack or projectile destroys it without exploding |
| Remote Override — detonate | **tap** Charge (L2) with an armed Dead Drop | — | — | wrist-computer command; 10 f blinking warning; one blast raw 50 |
| Remote Override — convert | **hold** Charge ≥ 18 f with an armed Dead Drop | — | — | the bomb becomes a Smoke Drop field at its spot (no damage); tap / hold are exclusive on one press |
| Bomb Bat | any staff strike touching his own **armed** Dead Drop | — | — | the bomb is consumed atomically and launched forward (vx 13, vy −4.5) as one live bomb |

Without an armed Dead Drop, Charge (L2) is the ordinary shared energy charge.

## Ultimate — CHECKMATE: LIGHTS OUT (100 Energy)

Grounded; also from Staff Sweep / Punch 3 / Advancing lunge recovery. 14 f staff opener (raw 30, the full row-1 sweep).
Miss / block → 40 f recovery. Clean hit → frozen cinematic (shared contract; KO, pause, rematch and reset clear it):

| frames | beat | contact |
|---|---|---|
| 0–29 | supplied cutscene portrait cut-in, confident Appearing pose | — |
| 30–47 | smoke burst masks a short reposition to the near side (never through the target) | — |
| 48–85 | staff flurry (Play-3-Times cells) | @54 / @66 / @78 raw 22 each |
| 86–111 | rising staff | @96 raw 34 |
| 112–149 | Hacking Computer: the final command, a bomb arms at the target's feet | — |
| 150 | the full 11-cell Bomb Explosion | raw 130 |
| 150–171 | acrobatic leap clear of the blast | — |
| 172–199 | Landing sequence → recovery pose | — |

30 + 66 + 34 + 130 = **260 raw** before shared scaling; one resource transaction.

## Measured routes

Measured by `harness/robin.test.mjs` through real keyboard input on a standing Robin dummy (numbers are the HP the
dummy lost per hit after the shared defense / scaling in the harness battle). "True combo" = every later hit landed
while the defender was still in hitstun from the previous one.

| route | hits | total | verdict |
|---|---|---|---|
| Punch 1 → 2 → 3 | 16, 20, 28 | 64 | true combo |
| Punch 1 → 2 → Staff Sweep | 16, 20, 43 | 79 | true combo |
| Punch 1 → 2 → Advancing Lunge | 16, 20, 41 | 77 | true combo |
| Low Check → Launcher | 22, 36 | 58 | true combo |
| Launcher → double jump → Midair Kick | 36, 22 | 58 | true combo |
| Staff Express (alone) | 12, 12, 11, 25 | 60 | true combo |
| Punch 1 → 2 → 3 → Staff Express | 16, 20, 28, 10, 9, 8, 19 | 110 | true combo |
| Staff Sweep → Ultimate | 46, 28, 18, 18, 18, 29, 111 | 268 | true combo |
| CHECKMATE: LIGHTS OUT (raw) | 30, 22, 22, 22, 34, 132 | 262 | true combo (cinematic) |
| Bird's-Eye Bomb vs standing foe (gap 110) | 45 | 45 | single hit |

Bombs, Dead Drop detonations and Bomb Bat are set-ups / pressure, not combo links, and are not claimed as combos.
Current numbers: `docs/robin/mechanics_results.json`.
