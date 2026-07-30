# Superman — Asset Map

Third DC character (after Flash, Batman). rosterKey `superman`. DC universe
already exists — no new universe setup. Source art: 25 curated PNGs cropped
from the master sheet `superman_transparent.png` (1225×2716, identical twin
`Arcade - Superman - Playable Characters - Superman.png`). Filenames are
preserved exactly as uploaded.

Frame counts below are ESTIMATES from width/height ratio (frame ≈ sprite
height). They will be verified by reslice/harness during each stage.

## Core state / movement
| File | Dim | ~Frames | Role |
|------|-----|---------|------|
| `superman_idle.png` | 469×111 | ~4 | **Floating idle** (hover, cape flow) — canonical idle per confirmed design (not grounded) |
| `superman_intro_part_3.png` | 469×111 | ~4 | Identical to idle — the intro's final "settle into floating idle" frames |
| `superman_walking.png` | 364×108 | ~4 | Grounded walk |
| `superman_flying.png` | 704×61 | ~6 | **Flight-mode locomotion** (horizontal fly pose) — feeds Omni-Man flight system |
| `superman_charge.png` | 53×101 | 1 | Charge/hold pose (single frame) |
| `superman_hit.png` | 65×80 | 1 | Hurt |

## Intro (off-screen run-in → liftoff → float)
| File | Dim | ~Frames | Role |
|------|-----|---------|------|
| `superman_intro_part_1.png` | 1017×87 | ~11 | **Clark Kent (civilian blue suit) runs**, shirt rips open to reveal the "S" |
| `superman_intro_part_2.png` | 1045×99 | ~10 | Clark→full Superman run → **liftoff into flight** (last frames airborne) |
| `superman_intro_part_3.png` | 469×111 | ~4 | Settle into **floating idle hover** (== idle) |

The intro art directly realizes the confirmed design: off-screen edge start,
camera-tracked run-in (Clark), transform reveal, liftoff, floating idle.

## Normals / melee (Stage 2 candidates — super-strength, heavy knockback)
| File | Dim | ~Frames | Role candidate |
|------|-----|---------|------|
| `superman_foward_punch.png` | 365×85 | ~4 | Forward punch (light) |
| `superman_ground_punch.png` | 377×104 | ~4 | Ground punch (medium) |
| `superman_ground_upper_attack.png` | 261×96 | ~3 | Uppercut / launcher |
| `superman_kick.png` | 370×88 | ~4 | Kick |
| `superman_ground_super_punch.png` | 1091×94 | ~11 | Heavy "super punch" (big windup — heavy/chain ender) |
| `superman_charging_punch_variations.png` | 820×366 | grid (~4 rows) | **Multi-row variation grid** — command-normal / rekka-chain source |
| `superman_flying_punch_combo_1.png` | 704×79 | ~8 | Air/flight melee combo A |
| `superman_flying_punch_combo_2.png` | 911×44 | ~many | Air/flight melee combo B (thin frames) |

## Specials (Stage 3 candidates — Solar Energy pool)
| File | Dim | ~Frames | Role candidate |
|------|-----|---------|------|
| `superman_punch_specail.png` | 1095×95 | ~11 | Special punch (rush/dash strike) |
| (heat vision) | — | — | **From master sheet if a beam strip exists** — heat-vision beam w/ independent projectile collision |

Note: no standalone "heat_vision" crop was uploaded. Heat vision will be
sourced from the master sheet during Stage 3, or synthesized as a procedural
beam FX from the eye position if no clean strip exists (flag at Stage 3).

## Taunts (universal hold-Down heal system)
| File | Dim | ~Frames | Role |
|------|-----|---------|------|
| `superman_ground_taunt.png` | 295×98 | ~3 | Grounded taunt |
| `superman_air_taunt.png` | 287×100 | ~3 | Airborne/flight taunt |

## Transformations — INVESTIGATED (Stage 0)
Four transformation strips exist (brief expected 3). Analysis of persistent
visual identity + size + FX complexity:

| File | Dim | ~Frames | Identity | Verdict |
|------|-----|---------|----------|---------|
| `superman_transformation_1.png` | 431×104 | ~6 | Red/blue energy gather → **radiant GOLD** → blue body w/ **persistent gold rim-aura** | **Mode-toggle A — "Solar Flare" (gold)** |
| `superman_transformation_2.png` | 515×86 | ~8 | Stand → prone flying dive → rise, 1 yellow flash, ends as **normal blue** | **NOT a mode** — flying-dive/getup flash; repurpose as movement/attack anim or defer |
| `superman_transformation_3.png` | 672×95 | ~12 | Face-cover → **blue crackling-energy body** persists across frames | **Mode-toggle B — "Kryptonian Overload" (blue electric)** |
| `superman_transformation_4.png` | 853×96 | ~13 | Face-cover → Superman → **green aura builds → dissolves into green particles** (dematerialize) | **ULTIMATE — largest & most FX-complex, freeze-cinematic-worthy** |

## Portrait
No dedicated portrait crop uploaded. Portrait to be cropped from an idle/
intro mugshot frame at Stage 6 (same as Killua/Minato precedent).

## Master reference sheets (do not wire directly)
| File | Dim | Role |
|------|-----|------|
| `superman_transparent.png` | 1225×2716 | Full master sheet — reference / source for any missing strip (e.g. heat vision) |
| `Arcade - Superman - Playable Characters - Superman.png` | 1225×2716 | Identical twin of the master |

---

# FINAL BUILD STATE (2026-07-29) — build complete

Superman shipped as a 6-stage build (rosterKey `superman`, DC, 20th sprite char).
Canonical test `harness/superman.test.mjs` = **27/27**; full staged suite (stages
1–5 + canonical) = **100 assertions, 0 fail**. Regression across shared systems
(sprite.js resolver, flight generalization, taunt, DC chars, combo-flow) clean.

## FINAL animation-utilization audit — every source file's destination

**23 of 23 gameplay-art crops are wired (1:1), across 29 animation keys.** Only the
2 identical master reference sheets are unwired (by design — they are the raw source
the 23 crops were cut from). This is ~10× Omni-Man's "2–3 of ~20" perception.

| # | Source upload | → uniform sheet | → wired to |
|--:|---|---|---|
| 1 | superman_idle.png | idle_uniform | `idle` (+ `jump`/`fall`/`introHover` reuse the sheet) |
| 2 | superman_walking.png | walk_uniform | `walk` / `run` / `dash` |
| 3 | superman_flying.png | fly_uniform | `fly` / `flyMove` / `forcedDescent` |
| 4 | superman_hit.png | hit_uniform | `hurt` |
| 5 | superman_charge.png | charge_uniform | `charge` (+ Heat Vision cast pose) |
| 6 | superman_intro_part_1.png | intro1_uniform | `introRunIn` (Clark run-in) |
| 7 | superman_intro_part_2.png | intro2_uniform | `introLiftoff` |
| 8 | superman_intro_part_3.png | intro3_uniform | `introHover` |
| 9 | superman_foward_punch.png | light_uniform | `light` |
| 10 | superman_ground_punch.png | heavy_uniform | `heavy` |
| 11 | superman_ground_upper_attack.png | up_uniform | `up` (launcher) |
| 12 | superman_kick.png | downair_uniform | `down_air` |
| 13 | superman_ground_super_punch.png | suprushfin_uniform | `supRushFin` (rekka launcher) |
| 14 | superman_flying_punch_combo_1.png | air_uniform | `air` |
| 15 | superman_flying_punch_combo_2.png | suprush1_uniform | `supRush1` (rekka opener) |
| 16 | superman_charging_punch_variations.png | suprush2_uniform | `supRush2` (rekka mid) — **1 of 6 rows** |
| 17 | superman_punch_specail.png | superpunch_uniform | `superPunch` (Super Flying Punch special) |
| 18 | superman_transformation_1.png | solarflare_uniform | `solarFlareCast` (gold mode entry) |
| 19 | superman_transformation_2.png | descentland_uniform | `descentLand` (flight crash-landing) |
| 20 | superman_transformation_3.png | overload_uniform | `overloadCast` (blue mode entry) |
| 21 | superman_transformation_4.png | ultimate_uniform | `ultimate` (Solar Overload cinematic) |
| 22 | superman_ground_taunt.png | taunt_uniform | `taunt` (universal hold-Down heal) |
| 23 | superman_air_taunt.png | airtaunt_uniform | `taunt_air` (airborne-taunt sprite branch) |
| — | superman_transparent.png | (none) | master reference sheet — raw source, unwired by design |
| — | Arcade - Superman …Superman.png | (none) | identical master twin — unwired by design |
| — | superman_portrait.png | (derived) | character-select portrait (cropped from idle f0) |

**Partial-use flag (honest):** `superman_charging_punch_variations.png` is a 6-row
grid of the SAME flying-punch motion in different charge-glow colors. One row feeds
`supRush2`; the other 5 rows are redundant duplicates of that one motion (no distinct
pose to wire) — the only art not fully consumed, and by genuine redundancy, not neglect.

## Kit summary
- **Movement/intro:** floating idle, walk, flight (Omni-Man system via `traits.canFly`), off-screen camera-tracked Clark→Superman run-in→liftoff→hover intro.
- **Normals (5):** light/heavy/up(launcher)/air/down_air + "Kryptonian Rush" Fwd+Heavy cancel-on-hit rekka (supRush1→2→Fin launcher).
- **Specials (Solar Energy pool):** Heat Vision (neutral, independent-collision eye-beam projectile, procedural `heatvision` drawKind) · Super Flying Punch (Fwd, charged dash-strike).
- **Mode-toggles (Mangekyou-style, shared pool drain + auto-revert):** Solar Flare (Down+Sp, gold, +25% dmg, Heat Vision→wide gold beam) · Kryptonian Overload (Back+Sp, blue, +30% atk-speed +15% move-speed, Flying Punch→Overload Rush).
- **Ultimate:** "Solar Overload" freeze-cinematic (U, 100 cost) — green energy-surge → particle-dissolve → guaranteed range-independent 380 detonation.
- **Taunt:** universal hold-Down-10s → heal-50% (grounded), with an airborne variant sprite.

## Alt-color skins (cosmetic, free)
- **Violet** (`tools/gen_superman_violet.py`, `__violet`): all RED (cape+boots+trunks, one shared hue-0
  palette) → deep violet #6B3FA0. Simple hue-select recolor.
- **Blue Trunks** (`tools/gen_superman_bluetrunks.py`, `__bluetrunks`): trunks → navy #2A4D8F, belt → flat
  #E8C93B, **cape + boots stay red**. NOT a hue-select — the trunks share the exact red palette with the
  cape/boots, so `recolor_palette.py` (color ± y-band) can't isolate them (a y-band bleeds a blue stripe
  across the cape). Uses a **spatial, belt-anchored per-frame mask**: the yellow belt spans the trunk width,
  so recolor only red within the belt's x-span & just below it; the wider cape wings + boots stay red. Belt
  band flattened separately (chest "S"-shield yellow untouched). Navy is kept darker than the royal suit-blue
  (#0062D6) so the briefs read as distinct, not a seamless blend. Frames with the belt occluded / a yellow FX
  burst (fly, intro1 Clark, suprush2) are safe no-ops. Multi-frame verified; test:superman 27/27 clean.
- **Eclipse** (`tools/gen_superman_eclipse.py`, `__eclipse`): full near-black recolor — bodysuit + cape +
  trunks + belt all UNIFIED to charcoal #1C1C22; chest "S"-shield kept as a muted dark-red accent #5A2A2A
  so the emblem still reads. Multi-tone (to-tone) remap + a value clamp (VMAX 0.42) preserves highlight/
  shadow form so it's NOT a flat silhouette (form clearly readable across all standard poses). Belt vs
  emblem split reuses the Blue-Trunks per-frame yellow-band detection (belt = lowest wide-flat → dark;
  upper shield → accent). Palette-collision checked vs Batman "Nightwatch" (neutral+cyan) and Edo reanim
  (grayscale): Eclipse is a COOL blue-charcoal with a RED emblem → distinct on both tone + accent, plus
  different character silhouettes. LIMITATION (honest): pure color-recolor can't tell costume-yellow from
  ENERGY-yellow — the `suprush2` yellow charge-burst mutes to dark-red specks (loses glow); the green
  (ultimate) and cyan (overload) effects survive untouched, and the solarflare gold reads as dramatic
  near-monochrome. No new geometry/texture added (out of scope). test:superman 27/27 clean.
- **6 creative recolors** (`tools/gen_superman_creative.py`, one parameterized tool; `PALETTES` dict maps
  tag → suit/cape/emblem/belt, trunks follow the suit). Per-region: blue→suit, red(cape+boots)→cape,
  belt-yellow→belt, shield+its-S→emblem; trunks isolated by the belt-anchored mask → suit. EMBLEM uses an
  ADJACENCY mask (shield-yellow pixels + red pixels touching them), NOT a padded bbox — a rectangle swept
  cape-red off the shoulder in side poses (the over-grab bug, caught+fixed on skin 1). Multi-tone remap
  preserves shading. Boots follow the cape (source shares one red palette; boots unspecified → cape).
    · **Rose Steel** (`rosesteel`) suit #B84F6E / cape #7A2F42 / emblem+belt gold #D9B54A
    · **Deep Current** (`deepcurrent`) navy #1E3A6B / steel-blue #3A5A8F / silver #DCE3E8
    · **Solar Flare** (`solarflare`) burnt-orange #C46A2E / #8F3A1E / gold #F0C93B
    · **Verdant** (`verdant`) forest #2E5E3A / pine #1A3A24 / kryptonite-glow #B8E0A8
    · **Golden Age** (`goldenage`) bronze #A8792E / #6B4A1A / dark-bronze #3A2A14 — MATTE statue-bronze,
      distinct from Hisoka "Gilded" (bright shiny #FFBD00, high sat) → collision OK, no adjustment
    · **Prism** (`prism`) teal #1E6B6B / violet #5A2E8F / coral #E0703B emblem / gold #E8C93B belt —
      deliberate multi-color at matched sat/value; reads as intentional, not chaotic
  Full 10-skin select-screen side-by-side confirms all distinct (only Default↔Blue Trunks near, by design).
  All verified ≥3 frames each; test:superman 27/27 clean.
