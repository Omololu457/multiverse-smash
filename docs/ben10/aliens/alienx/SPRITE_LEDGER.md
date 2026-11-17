# Alien X (Celestialsapien) — sprite ledger

**Sheet by regularDor8go** (credit text on the sheet: "Alien X by regularDor8go"). Source: repo-root `alien_x_sprite_sheet_by_icton_de04pik.png` → `assets/sprites/ben10/aliens/alienx.png` (1192×966).

## Key, text removal, palette

- Background solid red **(255, 0, 0)** keyed exactly (zero tolerance; all four corners). 18 colours on the sheet.
- His body is BLACK with a WHITE outline plus small green / yellow-green Omnitrix-symbol and eye marks (137,192,65 / 181,230,29) and a few dark greys. **Collision check:** the labels and the credit text are BLACK too, anti-aliased with dark reds (58 / 102 / 144 / 182 / 219, 0, 0). They are separated by component, not colour: every body component contains pure-white outline pixels and ≥ 590 px; none of the 62 text glyph components contains white, green or yellow, and the largest is 267 px (asserted). No dark-red anti-alias pixel occurs inside a body component (asserted). The key red never occurs inside his art except as background.
- EXCLUDED as whole connected components, nothing sampled from them: every label ("Stance", "Dash", "Turn", "Extra*", "Grab", "Attacks", "Circle thingy", "Damage", "Trying circle after damage*", "Lose"), the credit "Alien X by regularDor8go" (62 glyph components in all) and the small yellow arrow of the transform strip (1 component: 240,232,0 / 216,176,0 / 160,104,0 + light greys). Positions of every removed component are in `source_grid.json`; the contact sheet was checked by eye before cutting.
- Lose f2 burst: the thin red streaks between the rays are exactly the key colour → background; the white ray wedges are 8-connected to the body and stay part of that frame.

## Cut

- 8-connected components: Transform 2, Stance 1, Dash 1, Turn 5 + Extra 1, Grab 1, Attacks 10 (7 + 3), Circle thingy 12, Damage 4 + "trying circle" 1, Lose 2 = **40 body frames, every one used**. White energy streaks / flames touching a fist (Attacks f1-5, f8) are part of that body frame.
- Uniform cell **116×75**, anchor column x=58 = mean column of the BLACK body pixels of each frame's bottom 10 rows (legs / feet — never streaks, rays or the crest), feet baseline originY=72; actionScale 1.15. The Dash frame (horizontal flight, no feet) is anchored on its torso centre (mean of its black pixels) with a consistent hover offset of 34 native px above the feet line. Nearest-neighbour, pixels copied 1:1, no frame cropped, pixel counts preserved (asserted).

## Every sheet frame → animation → move

| Sheet group | Frame | Animations (moves) |
|---|---|---|
| Transform strip (top right) | starry (cosmic) | transform, axTimeout |
| Transform strip (top right) | normal | transform |
| Stance | f1 | idle, crouch, guard, taunt, win |
| Dash | f1 | dash, axFly |
| Turn | f1 | walk, walk_back, run |
| Turn | f2 | walk, walk_back, run |
| Turn | f3 | walk, walk_back, run |
| Turn | f4 | walk, walk_back, run |
| Turn | f5 | walk, walk_back, run |
| Extra* (Turn row) | f1 | jump, doubleJump, fall |
| Grab | f1 | axGrasp |
| Attacks | f1 | light |
| Attacks | f2 | heavy |
| Attacks | f3 | heavy |
| Attacks | f4 | heavy |
| Attacks | f5 | down |
| Attacks | f6 | down |
| Attacks | f7 | axThrow |
| Attacks | f8 | up |
| Attacks | f9 | up |
| Attacks | f10 | air |
| Circle thingy | f1 | axCast |
| Circle thingy | f2 | axCast |
| Circle thingy | f3 | axCast |
| Circle thingy | f4 | axCast |
| Circle thingy | f5 | axCast |
| Circle thingy | f6 | axCast |
| Circle thingy | f7 | axCast |
| Circle thingy | f8 | axCast |
| Circle thingy | f9 | axCast |
| Circle thingy | f10 | axCast |
| Circle thingy | f11 | axCast |
| Circle thingy | f12 | taunt, win, axCast, axCastHold |
| Damage | f1 | hurt |
| Damage | f2 | axHurtHeavy, dizzy |
| Damage | f3 | knockdown |
| Damage | f4 | hurt_air, getup |
| Trying circle after damage* (Damage row) | f1 | axRewind |
| Lose | f1 | lose |
| Lose | f2 | axTimeout |

## Animation → move (exported strips `ben10_alienx_ready_<anim>_uniform.png`)

| Animation | Frames | Speed | Source / move |
|---|---|---|---|
| `idle` | 2 | 18 | Stance f1 held; render-only 2-frame vertical bob (frame 2 = the same pixels 1 px higher) so he is not frozen |
| `walk` | 5 | 9 | Turn f1-5 cycled SLOWLY (no walk row) |
| `walk_back` | 5 | 9 | Turn f1-5 reversed (no walk row) |
| `run` | 5 | 5 | Turn f1-5 faster (no run row) |
| `dash` | 1 | 6 | Dash (horizontal flight pose; ground / air dash) |
| `jump` | 1 | 6 | Extra* side profile = jump rise |
| `doubleJump` | 1 | 6 | Extra* side profile reused |
| `fall` | 1 | 6 | Extra* side profile reused (no fall frame) |
| `crouch` | 1 | 6 | Stance reused (no crouch frame) |
| `guard` | 1 | 6 | Stance reused for block / block-hit (no block frame) |
| `transform` | 2 | 6 | TRANSFORM: starry cosmic body = transform-in flash → normal body = settle |
| `axTimeout` | 2 | 8 | forced Omnitrix TIMEOUT revert: Lose f2 burst → starry body |
| `taunt` | 2 | 10 | Stance + Circle f12 flare reused (no taunt row) |
| `win` | 2 | 14 | WIN = Stance + Circle f12 flare (no win row) |
| `lose` | 1 | 6 | Lose f1 small curled = lose pose |
| `hurt` | 1 | 6 | Damage f1 = hit_react light |
| `axHurtHeavy` | 1 | 6 | Damage f2 = hit_react heavy (used while hitstun ≥ 20) |
| `hurt_air` | 1 | 6 | Damage f4 = launched |
| `knockdown` | 1 | 6 | Damage f3 = knockdown (lying curled) |
| `getup` | 1 | 6 | Damage f4 = get-up |
| `dizzy` | 1 | 9 | Damage f2 reused (no dizzy row) |
| `light` | 1 | 3 | JAB = Attacks f1 (fist + white energy streak) |
| `heavy` | 3 | 5 | HEAVY = Attacks f2-4 |
| `down` | 2 | 4 | LOW = Attacks f5-6 (crouched lunge / swing; f5 white energy flame) |
| `up` | 2 | 4 | LAUNCHER = Attacks f8-9 (tumbling, f8 energy flame) |
| `air` | 1 | 4 | AIR = Attacks f10 (spinning) |
| `axCast` | 12 | 2 | DECREE cast = Circle thingy f1-12 (Nullify / Gravity / ult casts; ring is procedural) |
| `axCastHold` | 1 | 6 | Circle f12 held during the ring / Big Bang flare |
| `axRewind` | 1 | 6 | REWIND cast pose = "Trying circle after damage*" |
| `axGrasp` | 1 | 6 | VOID GRASP = Grab (extended arm) |
| `axThrow` | 1 | 6 | VOID GRASP throw release = Attacks f7 (the heavy-variant swing) |
| `axFly` | 1 | 6 | FLIGHT / STARFALL DASH body = Dash frame |

## Missing poses (closest real frame reused, no art invented)

- **idle**: Stance f1 held + a render-only 2-frame vertical bob (frame 2 = the same pixels 1 px higher).
- **walk / walk_back / run**: the Turn f1-5 frames cycled slowly (walk, speed 9), reversed (walk_back), faster (run, 5).
- **jump / doubleJump / fall**: Extra* side profile (no jump / fall frames).
- **crouch, block, block-hit**: Stance (no crouch / block frames). **dizzy**: Damage f2. **taunt / win**: Stance + Circle f12 flare. **get-up**: Damage f4.
- **axTimeout** (Lose f2 burst → starry body) is exported for the forced Omnitrix timeout; the framework's forced revert is instantaneous (no per-alien revert pose), so it is not displayed today — no hook was added for it.

## Extracted vs procedural effects

- **Extracted (real sheet pixels, part of body frames):** the white energy streaks on Attacks f1-4, the energy flames on Attacks f5 / f8, the Lose f2 white ray burst, the starry transform body.
- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the Nullify / Gravity / Reality-rewrite rings, the Absolute Decree starfield, the Big Bang radial burst, the Void pips and the Unmade void glyph over the opponent, the Rewind afterimage trail, the HUD voice label. They READ simulation state; they never write it.


Contact sheet: `docs/ben10/aliens/alienx/contact_sheet.png` (every exported strip; green = feet baseline, blue = anchor column). Full geometry + every removed component: `source_grid.json`.

