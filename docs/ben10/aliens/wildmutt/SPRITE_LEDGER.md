# Wildmutt (Vulpimancer) — SPRITE LEDGER

READY Omnitrix alien, registry / pool key **`wildmutt_ov`** (display "Wildmutt"). The experimental `wildmutt` entry (its own
legacy kit and art) is untouched.

Sheet source: unknown, add credit if known (the file name `wildmutt_by_dragonrod342_davs1vq.png` suggests "dragonrod342").

## Source

- Sheet: `assets/sprites/ben10/aliens/wildmutt.png` (608×720, opaque RGB, **15 exact colours**, no anti-aliasing) = a byte copy
  (md5 61aaaa9d1b8a95babf197539238cb412) of the tracked root file `wildmutt_by_dragonrod342_davs1vq.png`, found by contact sheet:
  orange furred quadruped, no eyes / ears, white background, rows of detached limbs, a curled worm-like torso, orange spiral
  frames, two black arrows near the bottom.
- Slicer: `tools/ben10/slice_wildmutt.py` (deterministic: re-runs are byte-identical). Output: `ben10_wildmutt_ready_<anim>_uniform.png`
  (37 strips) + `wildmuttAssets.js`. `source_grid.json` records every component, duplicate, exclusion and attachment.
- `contact_sheet.png` = every strip ×2 on a checker (grey = cell edges, red = body centre, green = ground line).
  `preview_<anim>.gif` = idle / idleAlt / walk / run / wmSpin / wmSpinB / wmPounce / wmRush / light / heavy / up / knockdown played.

## Key

- Background (255,255,255) at all four corners (asserted). Key = that EXACT colour, zero tolerance, **flood-filled from the sheet
  edges** (386,308 px connected background).
- **Enclosed white:** 103 white pockets (568 px) are not connected to the edge. Every one was inspected on a zoomed crop: all
  are background seen through gaps (between legs, inside the gait loop, between spiral strands). **His palette has no white at
  all** — the claw tips are grey (102,102,102) — so there is no claw highlight to protect, and the pockets are keyed too (a
  deliberate deviation from "keep enclosed whites", which would leave white blotches inside the legs and spirals).
- Palette collisions: none. The only colour near the key is the pale highlight (253,255,192) (distance 63) — an exact key never
  touches it. Palette: fur (252,146,37), fur shade (194,115,48), outline (74,37,0), black eye band (0,0,0), claw grey (102,102,102),
  mouth interior red (192,0,0), Omnitrix dot / ring / green (208,223,80) (90,99,111) (126,136,150) (41,41,41) (181,230,29) (64,128,0),
  sniff-puff blue (153,217,234), pale highlight (253,255,192).

## Findings

- **The two black arrows** (pure black, 120×29 each, between the second spiral row and the last row; one → , one ←, pointing at
  each other) are an **annotation** for the spin rows' direction, not art: asserted pure black, **excluded**.
- **Top rows = RIG PARTS, excluded from combat frames, available for limb-detail reference only:** 12 limb pieces (fore / hind
  legs at several bends), 7 small claw / finger pieces, 1 open-jaw head piece, 4 limbless torsos (head + body, one with the jaws
  open) and 2 loose 4×4 Omnitrix badges. No new body pose was assembled from them.
- **Complete poses in the top rows:** the two arched standing stances A1 / A2 (whole bodies) are used (block, block hit, dizzy,
  Heavy wind-up).
- **The curled worm-like pose** is a limbless rig torso, but curled on itself it reads as a complete tucked huddle: it is mapped
  to **Feral Curl, knockdown, lose, get-up start and transform-in** (as predicted). It is never a combat (attacking) frame.
- **The small red mark is NOT an Omnitrix mark:** it is the **mouth interior** (192,0,0), present only on the jaws-open frames
  (the lunge row B2–B5, the rearing roar V1, the bark V2, the head piece). Kept as is. His real Omnitrix-equivalent mark is the
  small **green / yellow ringed dot on his flank**, on every body frame (Omnitrix colours above) — the visual reference for the
  Omnitrix on this form.
- **The tiny blue droplet** (153,217,234), 13×16, right of the sniff frame V3 = a **sniff / snort puff** (breath lines at his
  nose). Cosmetic: attached to V3 and used only in the sniff idle variation (`idleAlt`).
- **Spirals:** two drawings, each rotated a quarter turn per step (asserted pixel-exactly). Spin row 1 = an **8-step clean
  rotation cycle** S1–S8 (A 0°, B 0°, A 270°, B 270°, A 180°, B 180°, A 90°, B 90°). Spin row 2 = 6 steps R1–R6 whose last 3 are
  mirrored (the reverse spin). Each spiral is one component; the **1-px fur flecks** flung off the spin (28 of them) are attached
  to the nearest spiral of the same row — never cropped.
- **No walk cycle on the sheet:** the 7-frame row G1–G7 is a bounding quadruped gait (legs flung back → gathered → reaching). Real
  frames win over the brief's "walk/run rows": walk = this gait slowed (speed 8), run = the same gait cycled fast (speed 4),
  walk_back = reversed (no opposite-facing row exists).
- **Duplicates on the sheet** (asserted byte-identical, not cut twice): the crouched stance C appears 6× (it opens every row), the
  airborne pounce L1 appears 2×.

## Anchoring

8-connected components. Body centre = the x-centroid of the frame's body pixels (the torso mass; never one paw, never the flecks /
puff); ground = one row under the lowest body pixel. Every frame sits on one ground line (feetY 47) in an 80×51 cell; spirals use
their own centroid with their bottom on the same ground line (a low spinning ball). Nearest-neighbour only, copied 1:1, never cropped
(asserted inside the cell). On screen: Ben spriteScale 2.0 × actionScale 1.5 = ×3 (stance ≈ 93 px tall, ≈ 144 px long).

## Every frame → animation → move

| Sheet frame (y, x) | Frame | Animations (moves) |
|---|---|---|
| top (16,45) | A1 arched stance | guard (block), dizzy, heavy wind-up (HEAVY), wmUltFinal (Primal Takedown finisher, drawn scaled up) |
| top (16,121) | A2 arched stance | blockHit, dizzy |
| (203,47) | CURL curled huddle (limbless rig torso) | knockdown, getup, transform, lose, wmCurl (FERAL CURL) |
| (308,18) | G1 gait — legs flung back | walk, walk_back, run, jump |
| (308,86) | G2 gait | walk, walk_back, run, doubleJump |
| (308,154) | G3 gait | walk, walk_back, run, doubleJump |
| (307,229) | G4 gait — tucked | walk, walk_back, run, doubleJump, hurt_air |
| (307,304) | G5 gait | walk, walk_back, run, doubleJump |
| (304,371) | G6 gait — rearing | walk, walk_back, run |
| (312,424) | G7 gait — limbs reaching | walk, walk_back, run, fall, air (AIR), wmLeap (SCENT LEAP) |
| (367,23) | L1 airborne pounce | dash, wmSpinIn (SPIN SLASH entry), wmPounce (POUNCE), wmLeap (SCENT LEAP) |
| (368,132) | L2 claws-down landing | wmPounce (POUNCE hit), wmPin (PRIMAL TAKEDOWN pin) |
| (383,228) | C crouched stance | idle, idleAlt, crouch, crouchGuard, getup, transform, light (JAB start), up (LAUNCHER start), wmSpinIn, wmPounce |
| (433,70) | B2 jaws-open claw reach | light (JAB) |
| (431,135) | B3 extended claw stretch | heavy (HEAVY), grab, wmRush (CLAW RUSH), wmUltFinal |
| (430,206) | B4 full stretch, fur speed blur | wmRush (CLAW RUSH) |
| (431,283) | B5 flat low claw stretch | down (LOW), wmRush (CLAW RUSH) |
| (429,367) | B6 rearing rise | up (LAUNCHER), transform |
| (553,82) | V1 rearing roar | hurt, knockdown start, win |
| (558,160) | V2 bark | taunt, win |
| (558,239) + puff (563,287) | V3 sniff + snort puff | idleAlt (cosmetic sniff idle) |
| (491,147) … (493,525) | S1–S8 spiral cycle (+ flecks) | wmSpin (SPIN SLASH active; PRIMAL TAKEDOWN blur) |
| (651,79) … (652,350) | R1–R6 second spiral row (+ flecks) | wmSpinB (GROUND SHRED; PRIMAL TAKEDOWN passes) |

Not used: the duplicate stance copies (434,16) (437,437) (510,6) (559,9) (656,15) and leap copy (489,72); the arrows; the rig parts.

## Missing poses (reused frames, per animation)

jump = G1 · double jump = G2–G5 (the tuck reads as a mid-air roll) · fall = G7 · crouch / crouch block = C (already his lowest
stance) · block = A1, block hit = A2 · hit light / heavy = V1 rearing back · hit in the air = G4 · knockdown = V1 → CURL ·
get-up = CURL → C · win = V1 ↔ V2 · lose = CURL · LOW = B5 · LAUNCHER = C → B6 · AIR = G7 · dizzy = A1 / A2.
No dedicated jump, fall, crouch, block, hurt, get-up, win, low, launcher or air art exists on this sheet.

## Extracted vs procedural effects

Extracted (real art): the spiral spin (S1–S8, R1–R6) with its fur flecks; the fur speed blur on B4; the snort puff on V3.
Procedural (render-only, never GAME_STATE, no hitbox) — listed with the moves that draw them in `wildmutt.js`; see the final
section below.

## Procedural effects (as built)

_Filled in by the moves / ultimate phases._
