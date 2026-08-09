# Ichigo Kurosaki — Asset Map & Full Sprite-Utilization Audit (Bleach, 27th sprite char)

The **mandatory closing check** for the Ichigo build: the explicit "use every sprite" mandate required
that *every* uploaded file be **assigned**, **used as reference**, or **excluded with a stated reason** —
nothing silently dropped. Same full-utilization discipline + confirmed scope-exception as Madara
(MADARA_ASSET_MAP.md).

- **35 uploaded files total.** **33 individual sprites → all WIRED.** 1 master sheet → **portrait source
  (+ reference).** 1 alpha master → **frame-verification reference.**
- **Result: 100% of files assigned or used. ZERO discarded, ZERO unidentifiable, ZERO content gaps.**
- Every wired sheet was resliced into a clean uniform feet-aligned strip via `tools/reslice_strip.mjs`
  (a `_uniform.png` COPY — the raw uploads are untracked, so copies preserve the originals). Frame counts
  were verified by real alpha-gutter scan (`harness/slice_scan.mjs`), NOT trusted from the brief's summary.

Filenames preserved EXACTLY as uploaded (`specail`, `ruturn`, `.pgn.png`, `foward`, the
`dash_But_in_different_directions` casing).

---

## STAGE 1 — movement / state / intro (12 files, all wired)

| File | Frames | Wired as | Notes |
|---|---|---|---|
| `ichigo_idle.png` | 3 | `idle` | ready stance loop |
| `ichigo_run.png` | 5 | `run` + `walk` | one locomotion strip; walk plays it slower |
| `ichigo_jump.png` | 8 | `jump` + `fall` | fall = last cell (sourceX 434) |
| `ichigo_block.png` | 2 | `guard` | braced sword-block, hold last frame |
| `ichigo_hit_1.png` | 3 | `hurt` + `knockdown` | frame 0 = flinch; full strip = knockdown |
| `ichigo_hit_2.png` | 3 | `knockdownHeavy` | heavier stagger reaction (launcher/heavy hits) |
| `ichigo_charge.png` | 5 | `charge` | reiatsu flare (universal charge system) |
| `ichigo_dash.png` | 3 | `dash` | **ground** dash (horizontal burst) |
| `ichigo_dash_But_in_different_directions.png` | 6 | `dashDir` | **8-way AERIAL dash** (0 up·1 down·2 dn-fwd·3 up-fwd·4 level·5 back), frame pinned to held dir (physics.js `_dashDirIdx` + sprite.js frame-lock) |
| `ichigo_intro_1.png` | 10 | `intro1` | random-cycle intro (cloak-reveal) |
| `ichigo_intro_2.png` | 15 | `intro2` | random-cycle intro; form-flourish is COSMETIC only (confirmed design) |
| `ichigo_taunt.png` | 6 | `taunt` | universal taunt-heal flourish |

## STAGE 2 — normals + expanded "Zangetsu" command system (13 files, all wired)

| File | Frames | Wired as | Role |
|---|---|---|---|
| `ichigo_foward_sword-slash.png` | 3 | `light` | quick slash (blue arc baked in) |
| `ichigo_sword_combo_1.png` | 7 | `heavy` | committed sword string |
| `ichigo_up_attack.png` | 6 | `up` | vertical rising launcher (1px noise sliver dropped via `--minw`) |
| `ichigo_launch_attack_2.png` | 2 | `air` | aerial neutral slash |
| `ichigo_down_air_attack.png` | 6 | `down_air` | aerial dive slash (spike) |
| `ichigo_basic_sword_slash.png` | 7 | `ichigoRekka1` | Fwd+Heavy rekka opener |
| `ichigo_double_sword_attack.pgn.png` | 6 | `ichigoRekka2` | rekka mid (double-slash) |
| `ichigo_super_combo_to_up_attack.png` | 7 | `ichigoRekka3` | rekka **combo→launcher finisher** (the Stage-0 connector) |
| `ichigo_down_attack.png` | 4 | `ichigoDownHeavy` | Down+Heavy low sweep |
| `ichigo_launch_attack_1.png` | 5 | `ichigoBackHeavy` | Back+Heavy advancing launcher (red FX baked in) |
| `ichigo_front_attack_punch.png` | 4 | `ichigoFwdLight` | Fwd+Light hilt-jab poke |
| `ichigo_double_dash_combo.png` | 8 | `ichigoDashAtk` | Dash+Heavy rushing combo |
| `ichigo_ruturn_stance.png` | 7 | `ichigoReturn` | post-finisher return-to-stance settle. **2-ROW source** the column-slicer under-counts → cropped both rows (3 lift + 4 settle) and **recombined into one uniform 7-frame strip** (`_combine_ruturn`); all 7 frames used |

## STAGE 3 — specials (6 files, all wired)

| File | Frames | Wired as | Special |
|---|---|---|---|
| `ichigo_specail_2.png` | 6 | `ichigoGetsugaCast` | **Getsuga Tenshō** (neutral) — swing cast; launches the crescent projectile |
| `ichigo_specail_1.png` | 5 | `ichigoChargedSlash` | Charged Getsuga Slash (Forward) |
| `ichigo_air_attack_specail.png` | 5 | `ichigoAirGetsuga` | Aerial Getsuga Dive (airborne) |
| `ichigo_super_sword_attack.png` | 5 | `ichigoHollowGetsuga` | **Hollow Getsuga** (Down super) — dark-form art (Stage-0 finding: NOT a `sword_combo_1` frame-share; a distinct escalated finisher) |
| `ichigo_super_up_attack.png` | 3 | `ichigoHollowRising` | **Hollow Rising** (Up super) — dark-form art |
| `ichigo_sword_effect.png` | 5 (2-row) | Getsuga **projectile** | reusable blue+red crescent FX; its cleanest crescent cropped → `ichigo_getsuga_proj.png` (independent-collision projectile). Per Stage 0: a generic reusable overlay, not a per-move pairing |

## STAGE 4 — ultimate (2 files, all wired)

| File | Frames | Wired as | Role |
|---|---|---|---|
| `ichigo_ultimate_part_1.png` | 9 | `ichigoUlt1` | Getsuga Tenshō dash-slash (windup/rush) |
| `ichigo_ultimate_part_2.png` | 5 | `ichigoUlt2` | rising crescent uppercut (finisher) — played as ONE continuous clip; the cinematic switches part_1→part_2 |

## STAGE 5 — portrait + reference (2 files)

| File | Use |
|---|---|
| `_updated__tybw_ichigo_kurosaki_jus_sprite_sheet__by_asfarstone_dee1y17.png` | **Portrait source** — the TYBW bust artwork (top-right of the master) cropped + green-chroma-keyed → `ichigo_portrait.png` (256×256, transparent bg). Also the master reference the individual sprites were pre-sliced from (its per-move content is redundant with those, so no per-frame re-wiring needed). |
| `ichigo_transparent.png` | **Frame-verification reference** — the alpha master (authoritative over the green-matte version per the brief). Used to sanity-check slices; not wired as a gameplay sprite (its content is the same character, redundant with the 33 individual files). |

---

## Derived assets created during the build
- 34× `ichigo_*_uniform.png` — clean uniform feet-aligned reslices of each wired sheet.
- `ichigo_getsuga_proj.png` — the Getsuga crescent projectile (cropped + tightened from `sword_effect`).
- `ichigo_portrait.png` — 256×256 transparent bust (from the master sheet).

## Gaps / exclusions
**NONE.** Every uploaded sprite file is wired, and the two non-sprite files (master sheet, alpha master)
are used as portrait source + verification reference. There are no unidentifiable files, no discarded
content, and no fabricated moves (every move maps to real uploaded art).

## Stage-0 investigation outcomes (how they shaped the wiring)
1. `super_sword_attack` / `super_up_attack` = **dark-form escalated supers** (the "shares frames with
   `sword_combo_1`" flag was FALSE) → wired as the Hollow Getsuga / Hollow Rising **specials**, not normals.
2. `super_combo_to_up_attack` = standard-form **combo→launcher connector** → the rekka **finisher**.
3. `sword_effect` = **generic reusable crescent** (baked-in blue/red arcs on `foward_sword-slash` /
   `launch_attack_1` need no separate pairing) → used as the **Getsuga projectile** sprite.
4. `up_attack` (vertical anti-air) vs `launch_attack_1` (horizontal advancing) = **distinct roles** →
   `up` normal vs `ichigoBackHeavy` command launcher.
5. `ruturn_stance` = **recovery settle** → the post-rekka-finisher return-to-stance pose.

## Test coverage
- `test:ichigo` — consolidated full-kit suite (32 checks: registration + portrait + movement/intros/dash
  pose + 5 normals + command system + 5 specials + ultimate).
- `test:ichigo-s1`…`s4` — per-stage evidence shots. `test:ichigo-dirdash` — 8-way dash physics unit (16 checks).
