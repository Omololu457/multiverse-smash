# BenWolf (Loboan) — sprite ledger

**Sheet by Dragonrod** (the author asks for credit: "BenWolf sprite sheet made by Dragonrod — please, give credits if used!").

- Source: `assets/sprites/ben10/aliens/benwolf.png` (377×701) — a byte copy of the tracked root file
  `benwolf_sprite_sheet_by_dragonrod342_d84osmt.png` (grey wolf-like alien, bushy tail, green Omnitrix mark, khaki background,
  row labels, blue ring FX, white credit box).
- Slicer: `tools/ben10/slice_benwolf.py` (deterministic; re-running is byte-identical). Output: `ben10_benwolf_ready_*_uniform.png`
  (37 animation strips), `ben10_benwolf_fx_*.png` (3 ring strips), `benwolfAssets.js`, `source_grid.json` (every component id,
  every frame offset), `contact_sheet.png`, `preview_*.gif` (each labeled row + each ring loop as an animation).
- Cell 102×90 native, feet baseline y = 69, body-centre x = 51. On screen ×3 (`actionScale` 1.5 × Ben's 2.0): an integer
  pixel scale, nearest-neighbour only.

## Keying

- Background = (196,197,167) khaki at all four corners; keyed on that EXACT colour, zero tolerance (212 903 px). The khaki is
  used by nothing else on the sheet.
- 18 colours, opaque, no anti-aliasing → no de-fringe pass.
- **Palette collisions (reported):**
  - black (0,0,0) is both the sprite outline and the label text → labels are removed by COMPONENT, never by colour;
  - the ring blue (63,72,204) is also the colour of the small diagram's dashed ring and its → arrow → removed by component;
  - pure white (255,255,255) exists only inside the credit box (the body whites are (224,224,224)) — asserted;
  - the thin ring outlines (63,72,204) / (112,146,190) / (0,162,232) / (153,217,234) appear in NO body frame: no ring/body
    collision. Every ring is one 8-connected component of ring colours only (asserted).

## Anchoring

- Feet baseline = one row under the lowest light-grey claw pixel (+ the outline row) of the body component. In Attack ↑ the
  tail hangs ~12–19 px below the feet; it never drags the baseline.
- Body centre = the centre of the densest 20 px column window of the body's light fur pixels — the dark tail and the dark claw
  swooshes never drag it.
- Frames are copied 1:1 into the cell, never cropped (asserted per frame: no pixel lost). Tail, ears, claws and rings intact.

## Source rows → animations → moves

| Source row (sheet label) | Frames | Used by |
|---|---|---|
| Stand | 4 | `idle` f1–4 (loop); REUSED: `taunt` f1–4, `dizzy`, `transform`, `idleAlt` (f1), `getup` (f1, second frame) |
| walk/run | 4 | `walk` f1–4 (slowed, speed 9); `walk_back` f4–1 (reversed); `run` **f3–4 only, the low gallop, cycled faster (speed 4, a 2-frame loop)**; `dash` f1–2; LUPINE DODGE `bwDodge` f2 (the leap frame) |
| jump | 1 | `jump`, `doubleJump` (reused) |
| fall | 1 | `fall` = the AIR body, `air` normal; REUSED for `hurt`, `hurt_air`, `knockdown` f1 |
| crouch | 1 | `crouch` = the LOW body, `down` (Low); REUSED for `guard`, `crouchGuard`, `blockHit`, `lose`, `knockdown` f2, `getup` f1 |
| Attack | 4 + 5 rings | `light` (JAB) f1–2; `bwHowl` (SONIC HOWL / HOWLING MOON cast) f3–4; `bwHowlHold` f4. Rings → `fx:howlRing` |
| Attack → | 4 (swooshes attached) | `bwPounce` (POUNCE, Lunar Pounce) f1; `heavy` f2 → f4; `bwRake` (CLAW RAKE) f2–4; `bwDive` (DIVE CLAW) f2; `bwClaw` (ult capture claws) f2–3; `grab` f4 (reused) |
| Attack ↑ | 4 + 5 stacked rings | `up` (LAUNCHER) f1–2; `bwRise` (RISING HOWL) f3–4; `win` f4 (reused). Rings → `fx:upRing` |
| Attack ↓ | 4 + 5 rings | `bwLow` (LOW HOWL) f1–4. Rings → `fx:lowRing` |

### Every animation

| anim | frames | role |
|---|---|---|
| idle | Stand f1–4 | idle loop |
| walk / walk_back | walk/run f1–4 / f4–1 | the one 4-frame cycle, slowed / reversed |
| run | walk/run f3–4 | low gallop, faster |
| dash | walk/run f1–2 | push + leap |
| crouch / jump / doubleJump / fall | crouch / jump / jump / fall | |
| guard / crouchGuard / blockHit | crouch | REUSED (no block art) |
| hurt / hurt_air | fall | REUSED (no hit art, light or heavy) |
| knockdown | fall → crouch | REUSED (no knockdown / lying art) |
| getup | crouch → Stand f1 | REUSED (no get-up art) |
| dizzy / transform / idleAlt | Stand f1 | REUSED (no dizzy / transform art; the engine's Omnitrix flash plays over transform) |
| taunt | Stand f1–4 | REUSED |
| win | Attack ↑ f4 | REUSED (howling up) |
| lose | crouch | REUSED (no lose art) |
| light | Attack f1–2 | JAB |
| heavy | Attack → f2 → f4 | HEAVY (f2 = the claw swoosh hit frame) |
| down | crouch | LOW + procedural claw spark |
| up | Attack ↑ f1–2 | LAUNCHER |
| air | fall | AIR + procedural claw spark |
| grab | Attack → f4 | REUSED |
| bwHowl / bwHowlHold | Attack f3–4 / f4 | SONIC HOWL, HOWLING MOON cast |
| bwRake | Attack → f2–4 | CLAW RAKE |
| bwPounce | Attack → f1 | POUNCE, LUNAR POUNCE |
| bwRise | Attack ↑ f3–4 | RISING HOWL |
| bwLow | Attack ↓ f1–4 | LOW HOWL |
| bwDive | Attack → f2 | DIVE CLAW |
| bwDodge | walk/run f2 | LUPINE DODGE |
| bwClaw | Attack → f2–3 | HOWLING MOON capture claws |

## Effects

**Extracted from the sheet (render-only):**
- `fx:howlRing` — the Attack row's 5 vertical ring outlines, small → large; f4–5 sit under the "loop" bracket = the SUSTAIN loop
  (Sonic Howl projectile, Howling Moon opener).
- `fx:upRing` — the Attack ↑ row's 5 stacked horizontal rings; f4–5 under the bracket (Rising Howl column).
- `fx:lowRing` — the Attack ↓ row's 5 rings (the last two spiked); f4–5 under the bracket (Low Howl ground wave).
- the claw SWOOSHES of Attack → f2–3 (part of those body frames — they touch the body, so they are never cut out).

**Procedural pixel-style (render-only, drawn by `benwolf.js`, never GAME_STATE, no hitboxes):**
- the NIGHT tint (night-blue wash over the stage, fades in 20f / out 30f), the pixel FULL MOON (stepped disc + craters + halo),
  the pixel STARS (hash-placed, twinkle), the moonlight RIM glow behind both fighters, the moon-glow trail of Lunar Pounce,
  claw sparks (Low / Air / ult claws), the Scent pips and the HUNTED paw-print glyph, the HUD moon icon, screen shake.

## Excluded (not art)

| Components | Reason |
|---|---|
| row labels (54 glyph components) | text "Stand", "walk/run", "jump", "fall", "crouch", "Attack" ×4 |
| → ↑ ↓ glyphs (3) | arrows after "Attack" |
| three "loop" words + their brackets (15) | annotation; recorded as the ring strips' `loop` frames |
| the small figure under Attack ↓ (9) | **verified: a MOVE DIAGRAM**, not a frame — a 15×20 mini BenWolf (a shrunk Attack ↓ pose) with a grey ← arrow and a dashed blue ring with a → arrow (the howl goes ahead while he leans back). Not used as a HUD / Hunted icon: at ×3 it is a blurry duplicate of a pose already on the sheet and its arrows are annotation; the Hunted marker is a procedural paw print instead |
| the white credit box + text (1) | kept as the credit line above, not art |

No art was invented: every pose above is a sheet frame; missing poses reuse the closest frame as listed.
