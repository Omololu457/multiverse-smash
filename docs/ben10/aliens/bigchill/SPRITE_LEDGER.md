# Big Chill (Necrofriggian) — sprite ledger

Sheet from fun-tech.tk — **credit placeholder**. The brief named a Fun-tech.tk sheet (solid blue background, white winged
silhouette). That sheet is NOT on this machine; on 2026-11-18 the owner chose to use the sheet already in the repo instead:
"DS _ DSi - Ben 10 Alien Force_ Vilgax Attacks - Playable Characters - Big Chill.png" (a DS rip; ripper unknown — add credit if
known). Byte copy: `assets/sprites/ben10/aliens/bigchill.png` (2376×5660). Slicer: `tools/ben10/slice_bigchill.py`
(deterministic; re-running is byte-identical). Machine-readable record: `source_grid.json`. Contact sheet:
`contact_sheet.png`; per-row animation previews: `preview_*.gif`.

## Sheet layout and keying
* Teal (0,128,128) page, white row labels (text — never read), one rectangular canvas per frame. 38 animation rows +
  7 FX tiles = 327 canvases, each row mapped to its printed label (asserted by count).
* **Key:** the canvases are ALREADY transparent: alpha is strictly 0/255 (asserted). Key = alpha 0, zero tolerance; no
  colour key is used, so his dark-blue / teal / cyan palette cannot collide with a key colour.
* **Halo / collision findings:** none possible — there is no partial alpha and no teal/label pixel is ever copied
  (asserted per canvas). 962 opaque pure-black px exist in the art (outline / gap pixels) and are kept.
* **Magenta:** the two diagonal shard tiles (atk_JS2, atk_JS3) carry an opaque (248,0,248) fill behind the shard: keyed
  exactly, zero tolerance, edge-connected only (498 px; asserted none enclosed).
* **Ripper marker:** 2 opaque black px at every canvas's bottom-right corner (not art). Removed where isolated (290
  canvases); kept in 37 canvases where they touch art (rows atk_AS, duck_idle, duck2idle, idle2duck, hit_knock_back,
  timeout, transform and the 7 FX tiles) — 2 dark pixels at a foot/edge, invisible at play scale.
* Frames are copied WHOLE, 1:1, nearest-neighbour, never cropped (asserted inside the cell), never filtered: wings,
  claws, antennae, mouth sparks and in-frame icicle trails stay in their frame.
* The one cut: **atk_AS (Ice Spire)** — the free-standing ice spires (components ≥40 px, ≥70 % light-cyan) are moved to
  `fx:spire` so the game can draw them at the spire hitboxes (80/160/240/320 px). Small crumble chips stay with the body.

## Scale and anchor
* Uniform cell 152×216, body centre x=76, feet baseline y=193. actionScale 1.0 × Ben's spriteScale 2.0 = an exact ×2
  integer scale (smoothing off): standing body 56 px native → **112 px on screen ≈ human Ben's height**; wings-open
  flight frames 72 px wide → 144 px wingspan.
* Anchor per ROW, from the row's first frame: body centre = densest 16-px column window of the largest component, feet
  = its lowest pixel. Keeping one anchor per row preserves the authored motion (lunges, knockback slide). Wings-spread
  air rows use the same rule: the dangling feet sit a consistent hover offset under the torso.
* **Hurtbox:** torso + inner wing (fighters.js sizeW/sizeH), NOT the wing tips — tips are cosmetic.

## White silhouette
The DS sheet has **no white winged silhouette** (it was a feature of the Fun-tech sheet). Decision: no silhouette frame is
invented; hit-flash / transform flash / timeout revert use the engine's standard flash and the `transform` / `lose`
(timeout) rows.

## Frame → animation → move
| anim | frames | source (row, frame) | role / move |
|---|---|---|---|
| `idle` | 16 | idle f1-16 | idle, wings CLOSED (hooded cloak) |
| `walk` | 11 | run f1-11 | walk = the run row cycled SLOWLY (no separate walk on the sheet) |
| `walk_back` | 11 | run f1-11 | walk back = the run row cycled slowly (mirrored by the engine facing) |
| `run` | 11 | run f1-11 | run, wings closed (cycled fast) |
| `dash` | 11 | run f1-11 | dash = the run row cycled fastest |
| `crouch` | 10 | duck_idle f1-10 | crouch (duck_idle) |
| `jump` | 4 | jump_start f1-3 + jump_up f1 | jump rise (jump_start + jump_up) |
| `doubleJump` | 7 | jump_double f1-7 | double jump: the wing-opening spin |
| `fall` | 7 | jump_peak f1-6 + jump_down f1 | fall (jump_peak + jump_down) |
| `guard` | 13 | block_idle f1-13 | guard = wings wrapped (block_idle); also the COCOON hold |
| `crouchGuard` | 13 | block_idle f1-13 | crouch guard = block_idle (no crouch block on the sheet) |
| `blockHit` | 5 | block_hit f1-5 | block hit (wings wrapped, jolt) |
| `hurt` | 5 | hit_L f1-5 | light hurt (hit_L) |
| `hurt_air` | 11 | hit_H f1-11 | air / heavy hurt (hit_H) |
| `knockdown` | 11 | hit_knock_back f1-3 + hit_knock_back_idle f1-8 | knockdown (hit_knock_back + lying idle) |
| `getup` | 25 | hit_knock_back_recover f1-25 | get-up (hit_knock_back_recover, 25 frames played fast) |
| `dizzy` | 16 | teeter f1-16 | dizzy = REUSED teeter row (no dizzy on the sheet) |
| `transform` | 1 | transform f1 | transform (1 frame) |
| `taunt` | 4 | idle2block f1-2 + block2idle f1-2 | taunt = wing flare (idle2block + block2idle) |
| `win` | 1 | jump_double f7 | win = REUSED jump_double f7 (upright, wings open) |
| `lose` | 20 | timeout f1-20 | lose / timeout revert (timeout row) |
| `idleAlt` | 13 | glide f1-13 | wings-OPEN hover idle = glide row (the flight frames) |
| `light` | 8 | atk_A f1-8 | JAB: claw + frost streak (atk_A) |
| `heavy` | 12 | atk_AAS f1-12 | HEAVY: wing strike with the ice edge skimming the ground (atk_AAS) |
| `down` | 12 | atk_S f1-12 | LOW: the low crouching claw (atk_S) |
| `up` | 11 | atk_jump_S f1-11 | LAUNCHER: rising wing sweep with the crescent (atk_jump_S, ground-anchored) |
| `air` | 3 | atk_jump_A f1-3 | AIR: wing flip slash (atk_jump_A) |
| `grab` | 11 | atk_AA f1-11 | grab = REUSED atk_AA reach |
| `bcBreath` | 12 | atk_AAA f1-12 | FREEZE BREATH (atk_AAA: the ice blast at the mouth / claws) |
| `bcBreathHold` | 4 | atk_AAA f6-9 | FREEZE BREATH hold (atk_AAA f6-9 loop) |
| `bcWingCut` | 11 | atk_jump_S f1-11 | FROST WING CUT (atk_jump_S: wing slash + crescent) |
| `bcSpire` | 18 | atk_AS f1-18 | ICE SPIRE (atk_AS body; the spires are cut to fx:spire) |
| `bcCocoon` | 15 | idle2block f1-2 + block_idle f1-13 | COCOON (closing the wings → the wrapped hold) |
| `bcBurst` | 3 | block_hit f5 + jump_double f2-3 | COCOON burst: wings flung open |
| `bcDrift` | 16 | atk_cS f1-16 | PHASE DRIFT (atk_cS: wings spread, gliding lunge) |
| `bcSlash` | 11 | atk_AA f1-11 | PHASE DRIFT wing slash (atk_AA) |
| `bcDive` | 7 | atk_jump_A2 f1-7 | DIVING CHILL (atk_jump_A2: dive with the icicle trail) |
| `bcStorm` | 16 | atk_jump_cS f1-16 | FROZEN SKY Winter Storm (atk_jump_cS: air wing beats) |
| `bcOpen` | 3 | jump_double f1-3 | wings-OPENING transition (render-only, 6f) |
| `bcFly` | 13 | glide f1-13 | flight (glide, wings open) |

**Reused / substituted poses (no art invented):** walk = run row cycled slowly; dash = run cycled fastest; crouch guard
= block_idle; dizzy = teeter; win = jump_double f7 (upright, wings open); grab = atk_AA; taunt = idle2block + block2idle;
wings-opening transition = jump_double f1-3; Cocoon = idle2block → block_idle (wings wrapped); Cocoon burst = block_hit
f5 + jump_double f2-3. Real rows exist for hurt (hit_L), heavy/air hurt (hit_H), knockdown, get-up, lose (timeout),
jump fall (jump_peak + jump_down).

## FX
| fx | frames | source | role |
|---|---|---|---|
| `fx:shard` | 4 | atk_JS, atk_JS2, atk_JS3, atk_JS4 | ice shard at 4 angles — FROST WING CUT blade, Winter Storm shards, shatter ring |
| `fx:proj` | 1 | atk_S (projectile tile) | small ice shard (Freeze Breath cone sparks) |
| `fx:particle` | 2 | ChrgParticle1, ChrgParticle2 | frost charge particles (breath hold, Cocoon) |
| `fx:spire` | 9 | atk_AS f9-17 (cut from the body frames) | ICE SPIRE growth → crumble, drawn at each spire hitbox |

**Shared ice folder (REUSED, not duplicated):** `assets/sprites/ben10/aliens/arcticguana_fx/` {arc, burst, burst2,
splash, spray} — Arcticguana's copies of the user's ice-effect art. Roles: burst = Cocoon burst / shatter; burst2 +
spray = shatter of a frozen opponent; arc = Frost Wing Cut trail; splash = Diving Chill landing. No further ice files
were needed, so no `bigchill_fx/` folder was created.

**Procedural (render-only, pixel style):** the ice-cocoon freeze shell with Big Chill's colour accent, frost mist, the
Phase Drift after-image, the Frozen Sky giant cocoon and its pixel shard ring. None writes GAME_STATE.
