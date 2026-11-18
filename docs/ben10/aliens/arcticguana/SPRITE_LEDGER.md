# Arcticguana (Cryoreptile) — sprite ledger

Sheet source: unknown, add credit if known. (The tracked file name is
`articguana_sprite_sheet_by_dragonrod342_db3ji8s.png`, which suggests a DeviantArt upload by "dragonrod342"; that has not
been verified, so no credit is claimed here.)

- Source: `assets/sprites/ben10/aliens/arcticguana.png` (751×559), a byte copy of that tracked root file. Found by contact
  sheet: black iguana-like alien, blue head, blue back spikes, grey belly; white background, red ground lines, a parts bin
  top right, icy breath / shard / cloud / beam FX.
- Slicer: `tools/ben10/slice_arcticguana.py` (deterministic, re-running is byte-identical). Output: 39 uniform strips
  `ben10_arcticguana_ready_<anim>_uniform.png`, 6 FX strips `ben10_arcticguana_fx_<name>.png`, the table
  `arcticguanaAssets.js`, `contact_sheet.png`, 10 previews `preview_<anim>.gif` and `source_grid.json` (every frame's
  components, cell offset, key report, exclusions).
- Cell 284×49 (wide because Row 7 f6 carries its long beam in one piece), body centre x 142, feet baseline y 47.
  `actionScale` 1.5 (Ben's sprite scale 2.0 × 1.5 = an exact ×3 on screen: the ~42 px native stand is ~126 px).

## Keying (Phase 1)

| Step | Result |
|---|---|
| Palette | clean pixel art: 19 exact colours, alpha 255 everywhere, no anti-aliasing (no de-fringe needed) |
| Corners | all four = (255,255,255) — the key |
| Key | EXACT white, zero tolerance, only white CONNECTED to the image edge (4-connected flood fill): 366,508 px keyed |
| Enclosed whites | 16 regions / 50 px enclosed by art are KEPT: Row 2 f3 (10 px inside the arm loop), Row 3 f2 (8 px between the tumbling limbs), eleven 2 px slivers between the toes on Rows 4–5, and 10 px inside one Row 6 cloud puff |
| Palette collisions | none. White (255) appears in the art only enclosed. The belly greys (224 / 195 / 78 / 40) and the pale-cyan FX (153,217,234 / 204,236,244 / 193,237,255) never equal the key. The annotation red (237,28,36) is ALSO the colour of his open mouth: only red that is a straight run ≥ 20 px or a red piece touching the background was removed; the 9 red pieces enclosed by art (open mouths on Row 1 f2–f4, Row 6 f3–f4, parts-bin heads) are kept |

**Excluded as annotation (confirmed on the contact sheet before cutting):**

| What | How identified | Pixels / pieces |
|---|---|---|
| Red ground lines under Rows 1–7, the guide lines around the two 6-strip bend rows, the box around the shard pair, the box around the long beam | red (237,28,36) straight runs ≥ 20 px (H and V) | 3,182 px |
| Red asterisks | red pieces left after that which touch the background | 4: over Row 5 f3, f5, f7 and inside the shard box |
| The word "Loop" and its bracket | black components inside the label band above Row 7 (y ≤ 444; the bodies start at y 451) | 4 letters + 1 bracket |

The boxes' INSIDES are kept (the shard pair, the long beam): the outline is removed before the flood fill, so the white
inside the box opens up to the background.

**Red asterisks:** they sit over Row 5 f3, f5 and f7, the frames where the mouth snaps open and the head lunges forward,
and the fourth one marks the boxed shard pair. They mark the release / hit-active frames of that row:
`ARCTICGUANA_ACTIVE_FRAMES.agShard = [3, 5, 7]`. Ice Shard releases its fan on f3. Annotation, not art.

Anchor: feet baseline = the BODY component's bottom row; body centre = the densest 20 px column window of the body
component only (spikes, tail, the beam, a puff never drag it). Nearest-neighbour 1:1 copies, never cropped (asserted).

## Inventory (verified against the sheet)

| Row | Frames | Real frames |
|---|---|---|
| Row 1 | 4 | idle loop; f2 has a small ice puff, f3 a puff + red mouth, f4 red-open mouth + 4 breath dots (the puffs / dots are separate components and are copied WITH their frame) |
| Row 2 | 6 | run cycle |
| Row 3 | 3 | f1 head-up lean, f2 flipped / tumbling, f3 crouched |
| Row 4 | 4 + 4 | ICE BREATH cast (mouth opening); the icy streak = 4 stream frames (FX) |
| Row 5 | 7 + 2 | breath / spit poses, asterisks over f3 / f5 / f7; the boxed pair = 2 ice-shard frames (FX) |
| Row 6 | 4 + 5 | FROST CLOUD cast (mouth to red-open); the cloud = 5 puff frames, small → big → dispersing (FX) |
| Row 7 | 3 + 2 + 1, 1 stub | f1–3 charge; f4–5 = the LOOP (beam hold, glow in the mouth); a short beam stub beside the loop (FX tile); f6 + the boxed long beam = FREEZE BEAM fire (body and beam are ONE component, never cut) |
| Row 8 | 1 + 2 | stand (head forward); 2 small heads = the LOOP heads with the beam glow in the mouth (verified by template match on Row 7 f4 / f5: 230/250 px equal, the 20 that differ are the glow) — NOT hit-react heads |

## Parts bin (top right) — verified, roles and exclusions

| Part | Verdict |
|---|---|
| 8 side heads (top row) | heads 1–5 are pixel-identical (100% template match) to heads already drawn on body frames → excluded as redundant (the mouth-open progression already plays through Row 4 / Row 1). Heads 6–8 are eye / blink variants that align only with Row 3 f1 (jump rise) → excluded: no breath cast uses that body, and a blink inside a short jump rise is never seen |
| 5 front heads (red-open mouths) | pixel-identical to the heads on Row 2 f1–3, Row 3 f2 and Row 6 f4 → excluded as redundant |
| 4 torso shells | excluded: only usable by assembling new body poses (forbidden) |
| ~25 loose arms / legs / feet, 4 loose spikes | excluded: only usable by assembling new poses (forbidden) |
| Bend strip A (6) | HEAVY tail sweep FX (`fx:tailA`), drawn at the tail, render-only |
| Bend strip B (6) | LOW tail sweep FX (`fx:tailB`) and the ult carving slashes, render-only |
| Standing body 1 | idle alt (`idleAlt`), transform end, Frost Coat f1 |
| Standing body 2 (blue-lit belly) | the Omnitrix transform flash (`transform` f1) and Frost Coat forming f2 — chosen over hit-flash after looking: the glow sits on the chest where the Omnitrix is |
| Row 8 glow heads | swapped onto Row 7 f4 / f5 at their template-matched position → the 4-frame beam-hold flicker (`agBeamLoop` f3–4) |

## Frame → animation → move

| Animation | Frames | Move / use |
|---|---|---|
| idle | Row 1 f1–4 (+ puffs) | idle |
| idleAlt | parts body 1 | idle alt |
| walk | Row 2 f1–6, speed 9 | walk — **the RUN cycle SLOWED** (no walk art) |
| walk_back | Row 2 f6–1, speed 9 | walk back — **run reversed and slowed** |
| run | Row 2 f1–6, speed 5 | run |
| dash | Row 2 f2–4 fast | dash |
| crouch | Row 3 f3 | crouch |
| jump / doubleJump | Row 3 f1 | jump rise — reused for the double jump |
| fall | Row 3 f2 | jump fall |
| guard / crouchGuard / blockHit | Row 3 f3 | **reused** crouched frame (no guard art) |
| hurt | Row 3 f3 | **reused** crouched recoil (no hurt art) |
| hurt_air | Row 3 f2 | **reused** flip |
| knockdown | Row 3 f2 → f3 | **reused** (no knockdown / lying art) |
| getup | Row 3 f3 → f1 | **reused** (no get-up art) |
| dizzy | Row 1 f1 | **reused** (no dizzy art) |
| lose | Row 3 f3 | **reused** (no lose art) |
| win | Row 8 stand | win |
| transform | parts body 2 → body 1 | Omnitrix transform-in |
| taunt | Row 6 f1–4 | **reused** hiss |
| light | Row 2 f3–4 | JAB — run frames + render-only lunge + procedural frost claw |
| heavy | Row 2 f5–6 + fx:tailA | HEAVY — 180 px tail sweep drawn from bend strip A |
| down | Row 3 f3 + fx:tailB | LOW — crouched + low tail sweep from bend strip B |
| up | Row 3 f1 | LAUNCHER — head-up lean + procedural ice-uppercut frost |
| air | Row 3 f2 | AIR |
| grab | Row 5 f1–2 | the ordinary throw — **reused** lean |
| agBreath / agBreathHold | Row 4 f1–4 / f3–4 loop | ICE BREATH cast / hold; stream = fx:stream |
| agShard | Row 5 f1–7 | ICE SHARD (release on asterisk f3); shards = fx:shard |
| agCloud | Row 6 f1–4 | FROST CLOUD cast; cloud = fx:puff |
| agCoat | parts body 1 → 2 | FROST COAT forming |
| agSlide | Row 2 f1–6 fast | ICE SLIDE |
| agCharge | Row 7 f1–3 | FREEZE BEAM startup |
| agBeamLoop | Row 7 f4, f5, f4 + glow head, f5 + glow head | FREEZE BEAM hold; the beam body = fx:beamTile tiled to the hitbox length |
| agBeamFire | Row 7 f6 + its long beam | FREEZE BEAM end / the ult's final breath |
| agIcicle | Row 3 f2 | ICICLE DROP dive |
| agCarve | Row 2 f4–6 + fx:tailB | ABSOLUTE POPSICLE carving slashes |

Missing poses and stand-ins: walk (run slowed), guard / block / hurt / lose / knockdown / get-up (Row 3 frames), dizzy
(Row 1 f1). No body pose was assembled from loose parts; no art was invented.

## Effects

**Extracted from the sheet (FX strips, render-only):** `fx:stream` (Row 4 streak, 4), `fx:shard` (Row 5 boxed pair, 2),
`fx:puff` (Row 6 cloud, 5), `fx:beamTile` (Row 7 stub, 1), `fx:tailA` / `fx:tailB` (parts-bin bend strips, 6 each), and the
idle puffs / breath dots inside Row 1 f2–f4. The long beam stays inside `agBeamFire`.

**Ice-effect folder:** `assets/frozone/skins/infinity_ice/fx/` (the only folder whose name contains "ice" holding ice
effects; every other match was "sl**ice**d", "vo**ice**", "j**uice**" or "just**ice**"). Its parent folder is a Frozone
skin (character poses) and is NEVER used. Copied byte-for-byte (originals untouched) to
`assets/sprites/ben10/aliens/arcticguana_fx/`:

| File | Role |
|---|---|
| `arc.png` | ice arc: the JAB frost claw / ult carving slash trail |
| `burst.png` | frost burst: SHATTER COAT shard burst, SHATTER on a Popsicle |
| `burst2.png` | frost burst: the ult's final popsicle burst |
| `splash.png` | frost pop: ICICLE DROP landing pop, Frost Cloud contact |
| `spray.png` | ice spray: ICE SLIDE trail, Ice Breath impact |
| `blank.png` | NOT used (a 1×1 transparent placeholder, no art) |

**Procedural, pixel-style, render-only (never in GAME_STATE, no hitboxes):** the Frost Coat sheen overlay, Chill pips over
the opponent, the POPSICLE ice block (translucent, silhouette visible) with its popsicle stick, the Ice Slide cosmetic trail,
the Freeze Beam body beyond the tile, the LAUNCHER frost, the ult's GIANT popsicle (integer-scaled stick), shards from hashed
angles, the expanding frost ring, frost mist and camera shake.
