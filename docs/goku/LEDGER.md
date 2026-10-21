# Goku — Sprite Ledger (Phase 1)

Source: `assets/source/goku_original.png` (1400×1823, palette PNG, exact teal
`#008080` background). Copied **byte-identical** from the attached sheet
(`goku_base_sin_terminar_by_jonodio369_dexdfwt.png`, md5 `fa937fec…`).

Segmentation: teal stripped (tol 24); 42 thin white divider runs masked to
background so they act as row separators; **connected-components** cut each
frame; tiny detached fragments (a thrown fist, a hair spur) merged into their
parent sprite; 1–2 px divider slivers dropped. Result: **395 frames in 26
row-groups**. Full geometry + per-frame colour stats in
`assets/source/goku_inventory.json`; labelled 3× contact sheet in
`assets/source/goku_contact_sheet.png` (row tags R0…R25, per-frame indices).

The "rows" are grouped by vertical overlap, so a few tall frames (knockdowns,
jump arcs) pull two visual rows into one group — the frame cuts themselves are
clean. Categories below are visually verified.

## Key donor / reference frames (verified coordinates — feed Phase 2/4)

| key | x,y,w,h | use |
|-----|---------|-----|
| `base_standing`    | 1100,212,46,70 | BASE idle reference (black hair) |
| `god_standing`     | 1148,212,46,70 | GOD idle reference (red hair) — Phase 2 GOD |
| `ui_standing`      | 1196,212,46,70 | ULTRA INSTINCT idle reference (silver hair) |
| `battle_damage_1/2`| 1004/1052,212,44,70 | shirtless torn-gi → low-HP (<25%) idle + LOSE pose |
| `kaioken_standing` | 1156,5,36,66   | crimson-tinted body → Kaioken overlay tint sample |
| `ssj_loose_head_1/2` | 1004/1105,18,46,52 | SSJ gold loose heads → transplant donor |
| `god_head_1/2`     | 1210/1245,255,28,30 | GOD red loose heads → transplant donor |
| `ui_head_1/2`      | 1210/1241,218,~27,27 | UI silver loose heads → transplant donor |
| `gold_ssj_idle_band`   | 820,0,420,130  | SSJ gold idle-stance (use directly where pose matches) |
| `gold_ssj_flight_band` | 820,130,580,75 | SSJ gold flight/dash (use directly) |

## Effect strips (own items, per spec)

| key | x,y,w,h | use |
|-----|---------|-----|
| `crescent_arc`      | 617,1561,81,43  | crescent-kick arc effect |
| `afterimage_ghost`  | 1173,1067,63,56 | outline-only white ghost → Afterimage / zanzoken / UI dodge |
| `fist_barrage_band` | 760,1180,640,150 | Rapid Fist Barrage (4 flying-fist frames, blue trails) |
| `ki_charge_band`    | 300,159,460,95  | ~13-frame powering-up row → KI CHARGE hold |
| dark-blue sweep arc | right side, ~y165 | low-sweep arc (coords finalized in Phase 4 when wiring the sweep) |

## Animation rows (R# → use)

- **R0–R1** idle stance (6) + base/SSJ loose-head reference frames + base standing ref.
- **R0 (top-right)** the "excited" intro/taunt hop-&-stretch (6) → INTRO pose.
- **R2** KI-CHARGE powering-up row (~13 frames) → ki-charge hold animation.
- **R3–R5** jump arcs; **gold SSJ idle-stance + flight/dash** (SSJ sheet, used directly).
- **R6** crouch / low frames → crouch + low block.
- **R7–R10** punch strings, kick strings, aerial/jump-kick strings → normals & aerials.
- **R8/R12/R21** dense combat blocks (also contain knockdown/fall/getup tall frames).
- **R11–R13** hurt / stagger / fall / knockdown / get-up / recovery.
- **R14** dash / red BLUR-STREAK frames → dash, Instant-Transmission arrival, knocked-flying.
- **R15** aerials + **afterimage outline ghost** (idx16).
- **R16–R20** forward/advancing punches, kicks, **crescent kick + crescent arc** (R20 idx10).
- **R21–R22** combat/special poses + walk/stance.
- **Right cluster** gold SSJ (idle/flight/heads), Kaioken standing, battle-damage ×2,
  base/God/UI standing + loose heads (see key-frame table).

## Not present on the sheet (logged decisions)

- **SSJ3 long-haired frames: ABSENT.** No long-hair powering frames and no loose
  SSJ3 head exist (verified by full cluster scan + a black-hair-mass distribution
  scan). SSJ3 is built 100 % **fallback** in Phase 2 (SSJ gold + brighter ramp +
  **removed eyebrows** brow→skin). Phase-3 SSJ3 transform cinematic substitutes a
  **code-drawn** long-hair flare over the KI-CHARGE frames. Transplanted SSJ3 = 0.
- **Kamehameha cupped-hands-at-hip** and **Spirit-Bomb arms-raised** dedicated poses
  are not clearly isolated on this sheet. Conservative plan: drive both from
  existing push-forward / charge poses + **code-drawn** beam & sphere FX; the exact
  substitute frames are finalized in Phase 4 in-engine. Logged.
- **Instant-Transmission finger-to-forehead** pose: not confirmed present → use a
  standing frame + a 2-px finger flash drawn in code (as the brief allows). Logged.

## Unused pieces

Goal is zero unused. Every row maps to an animation or an effect above. The only
items deliberately **not** consumed as sprites are the SSJ3 donor frames (they do
not exist) — no orphan frames remain. SSJ2 and Blue reuse the SSJ sheet (recolour
/ code FX) and need no new source frames.
