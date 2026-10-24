# Superman — Sprite Ledger

Source sheet: `superman_jus_addons_by_planeptunearte_deaeqvi.png` (470×888, RGBA, solid
grey background `#727272` / (114,114,114)).

Slicing: `superman_work/slice.py` — chroma-key on the grey background (tolerance 40,
near-neutral guard so blue/red suit survives), 8-connectivity **connected-component**
extraction, each component cropped to its tight alpha bbox and bottom-centre-aligned
into an equal-size cell. **Nearest-neighbour only — no scaling, no interpolation, no
anti-aliasing, no invented art.** Output = per-animation transparent strips
`./superman_*_uniform.png`.

## Sheet inventory — 26 frames across 10 physical rows

> NOTE: the build brief described an 11-row / 29-frame sheet whose **Row 10
> ("dramatic cape spread, beam wind-up", 3 fr)** is **physically absent** from the
> art that was actually supplied. The supplied sheet has 10 rows / 26 frames. The
> beam/cape-spread moments are therefore **substituted** from the guard/ready row
> (R6) and the cape-billow row (R3) — see `beam` below — with code-drawn red beam
> and golden-pulse FX layered on top. The brief's "Row 11 run" maps to this sheet's
> physical row 10. No other row is missing; all 26 frames are used.

| Sheet row | Count | Content |
|-----------|-------|---------|
| R1 | 3 | hover / horizontal flight poses, cape trailing |
| R2 | 1 | leaning idle / forward glide |
| R3 | 2 | cape billow (figure + big cape spread) |
| R4 | 3 | forward punch sequence |
| R5 | 3 | low crouch / sweep |
| R6 | 3 | standing guard / ready / cape-sway stance |
| R7 | 4 | walk / advance cycle |
| R8 | 1 | steep dive / aerial slam |
| R9 | 2 | floating / slow descent |
| R10 | 4 | run / dash, cape streaming |

## Frame → animation(s) → trigger

Frames are addressed `R<row>.<col>` (0-based col, left→right).

| Frame | Used in animation(s) | Triggered by |
|-------|----------------------|--------------|
| R1.0 | `jump` (rise fr1), `flight` (hover) | jump rise / flight idle hover |
| R1.1 | `jump` (rise fr2), `flight` (hover) | jump rise / flight idle hover |
| R1.2 | `flight` (hover), `flightrise` fr1 | flight idle / flight ascend |
| R2.0 | `idle` fr1 | neutral idle (lead frame) |
| R3.0 | `land` fr1, `hurt` | land-recover / taking a hit |
| R3.1 | `land` fr2, `beam` (hold fr3) | land-recover / Heat Vision hold (cape-spread substitute) |
| R4.0 | `light` fr1 | Light jab |
| R4.1 | `light` fr2, `heavy` fr1, `air` fr1 | Light jab / Heavy straight / Air punch |
| R4.2 | `heavy` fr2, `air` fr2, `uppercut` fr2 | Heavy straight / Air punch / Crouch uppercut (launch) |
| R5.0 | `crouch`, `uppercut` fr1, `cardboard` fr1 | crouch / Crouch uppercut start / ULT startup |
| R5.1 | `sweep` fr1, `cardboard` fr2 | Low sweep / ULT startup |
| R5.2 | `sweep` fr2, `cardboard` fr3 | Low sweep / ULT startup |
| R6.0 | `idle` fr2, `guard` | idle sway / blocking |
| R6.1 | `idle` fr3, `beam` (windup fr1) | idle sway / Heat Vision wind-up |
| R6.2 | `idle` fr4, `beam` (windup fr2) | idle sway / Heat Vision wind-up |
| R7.0 | `walk` fr1 | walking |
| R7.1 | `walk` fr2 | walking |
| R7.2 | `walk` fr3 | walking |
| R7.3 | `walk` fr4 | walking |
| R8.0 | `flightdash`, `dive`/Ground Pound | flight air-dash / dive attack / Ground Pound / Kryptonian Grab slam |
| R9.0 | `fall` fr1, `flightrise` fr2 | falling / flight ascend float |
| R9.1 | `fall` fr2, `flightrise` fr3 | falling / flight ascend float |
| R10.0 | `run` fr1 | running / Super Speed Rush blur |
| R10.1 | `run` fr2 | running / Super Speed Rush blur |
| R10.2 | `run` fr3 | running / Super Speed Rush blur |
| R10.3 | `run` fr4 | running / Super Speed Rush blur |

**Coverage: all 26 frames appear in ≥1 animation.**

## Generated strips (cell `w×h` × frames)

| Strip file | w×h | frames | source frames |
|------------|-----|--------|---------------|
| superman_idle_uniform.png | 57×67 | 4 | R2.0, R6.0, R6.1, R6.2 |
| superman_walk_uniform.png | 70×64 | 4 | R7.0–3 |
| superman_run_uniform.png | 57×75 | 4 | R10.0–3 |
| superman_crouch_uniform.png | 52×65 | 1 | R5.0 |
| superman_light_uniform.png | 51×61 | 2 | R4.0, R4.1 |
| superman_heavy_uniform.png | 68×54 | 2 | R4.1, R4.2 |
| superman_sweep_uniform.png | 68×60 | 2 | R5.1, R5.2 |
| superman_uppercut_uniform.png | 68×65 | 2 | R5.0, R4.2 |
| superman_air_uniform.png | 68×54 | 2 | R4.1, R4.2 |
| superman_flight_uniform.png | 45×67 | 3 | R1.0, R1.1, R1.2 |
| superman_flightdash_uniform.png | 40×72 | 1 | R8.0 |
| superman_flightrise_uniform.png | 61×65 | 3 | R1.2, R9.0, R9.1 |
| superman_jump_uniform.png | 45×67 | 2 | R1.0, R1.1 |
| superman_fall_uniform.png | 61×65 | 2 | R9.0, R9.1 |
| superman_land_uniform.png | 62×75 | 2 | R3.0, R3.1 |
| superman_beam_uniform.png | 57×75 | 3 | R6.1, R6.2, R3.1 (cape-spread substitute) |
| superman_guard_uniform.png | 52×56 | 1 | R6.0 |
| superman_hurt_uniform.png | 62×64 | 1 | R3.0 |
| superman_cardboard_uniform.png | 57×67 | 3 | R5.0, R5.1, R5.2 (ULT startup) |
| superman_portrait.png | 56×56 | — | R6.0 (square-padded) |

## Sprites that were hard to use / ended up in fewer animations

- **No dedicated beam/cape-spread row.** `beam` is a **substitute** built from the
  ready-stance (R6.1/R6.2) + cape-spread (R3.1); the red eye-beam and golden Solar
  Flare pulse are **code-drawn** FX, not sheet art.
- **R8.0 (dive)** is a single frame doing heavy lifting — it is the only steep-dive
  pose, reused for flight air-dash, Ground Pound, dive attack, and the Kryptonian
  Grab slam.
- **No hurt/knockdown/win/lose art** on this compact sheet — `hurt` reuses the
  cape-billow recoil (R3.0); win/lose/taunt fall back to `idle`.
- The ULTIMATE "World of Cardboard" reuses the sweep/crouch row (R5) for its
  dramatic standing startup (`cardboard`) and existing move strips for its barrage
  beats; it adds no new sheet art.
