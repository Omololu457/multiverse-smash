# Samurai Red Ranger (Fire) — Asset Map

SECOND Power Rangers sprite character (`rosterKey: samurai_red_ranger`, universe
`power_rangers`), after Omega Ranger. Fire-samurai swordsman. Staged build with real
screenshot evidence per stage. Headline mechanic: **Mega Mode** — a full Vegeta-style
**tier-swap** (every base move has a higher-damage Mega counterpart that swaps in for the
transformation's duration), NOT an overlay.

## IMPORTANT — untracked originals
All `samurai*.png` source files are **untracked in git and unrecoverable**. `tools/reslice_strip.mjs`
overwrites in place, so every reslice is run on a **COPY** (`*_uniform.png`). Never reslice a raw
original. Frame boundaries below come from an alpha-gutter scan (`ALPHA=16`); frame counts on
multi-row / FX-heavy sheets are approximate and re-verified per stage.

## Tier convention
The base ("Fire") tier files are `samurai_ranger_fire_*` (plus the plain `samurai_ranger_*` /
`samurai_run` movement files). The Mega tier files are `samurai_ranger_fire_mega_mode_*` /
`samurai_ranger_mega_mode_*`. Filenames preserve upload typos exactly (`specail_attck`,
`mega_fit_walk`, the `mega_mode._jump` stray dot, inconsistent capitalization).

## Prerequisite (RESOLVED)
Base-tier walk was flagged missing in the design brief. It is present as `samurai_run.png`
(510×70, 8 frames, 70px tall — matches base idle's 70px), a DISTINCT asset from the Mega walk
`samurai_ranger_mega_fit_walk.png` (526×81, 81px tall). No substitution needed.

---

## STAGE 1 — registration + base movement/state  ✅ BUILT
3-file gate: `characters.js` (samuraiRedRanger) + `skins.js` (default skin) + `spritesheets.js`
(idle gate). Energy label `symbol_power → "Symbol Power"` added to `ui.js`. spriteScale **1.85**
(idle content 60px → ~111px on-screen, roster median). All sheets RE-SLICED from copies.

| action | uniform sheet | frames | cell |
|---|---|---|---|
| idle | `samurai_ranger_idle_uniform.png` | 4 | 27×62 |
| walk/run/dash | `samurai_run_uniform.png` | 8 | 46×61 |
| jump/fall | `samurai_ranger_jump_uniform.png` | 6 | 35×60 |
| hurt | `samurai_ranger_hit_uniform.png` | 2 | 39×59 |
| guard | `samurai_ranger_guard_uniform.png` | 3 | 30×56 |

Source→uniform notes:
- `samurai_run.png` had non-uniform islands (33–44px) → resliced to even 46px cells.
- `samurai_ranger__hit.png` had a 1px noise island → `--minw=4` dropped it (2 real frames).
- `samurai_ranger_fire_Blocking.png` is a **2-row** sheet (guard poses + blue flame-shield FX
  frames). Cropped the 3 FX-free guard poses from the top row (x 271–388, y 8–80) → guard strip.

Evidence: `harness/samurai_red_ranger_stage1.mjs` (12/12), shots `harness/shots/samurai_stage1_*.png`.

---

## Remaining source inventory (for Stages 2–5)

### Base-tier combat (Stage 2 normals + command chain)  ✅ BUILT
Reslice cells & final assignments (uniform strips from copies):

| uniform sheet | frames | cell | role |
|---|---|---|---|
| `samurai_ranger_combo_uniform.png` | 13 | 77×69 | **light** (4f window) + chain **samRekka1** (full) |
| `samurai_ranger_combo_2_uniform.png` | 15 | 70×80 | **heavy** (6f window) + chain **samRekka2** (full) |
| `samurai_ranger_upattack_1_uniform.png` | 8 | 69×118 | merged up **samUpTap** (quick launcher) |
| `samurai_ranger_upattack_2_uniform.png` | 14 | 93×84 | merged up **samUpHold** (strong tier; `--minw=30` dropped FX debris) |
| `samurai_ranger_air_uniform.png` | 9 | 109×56 | **air** (cropped top body row off the FX band) |
| `samurai_ranger_downattack_uniform.png` | 6 | 63×71 | **down_air** (the CLEAN pick) |
| `samurai_ranger_downattack_2_uniform.png` | 17 | 82×77 | chain **samRekkaFin** (flame launcher — the unused variant) |
| `samurai_ranger_fire_counterattack.png` | 946×110 | — | reactive counter (RESERVED for a later stage) |

PICKS (reported): light=combo (upright fast slashes = quicker read), heavy=combo_2 (deep-crouch
committed crescent = heavier), down_air=downattack (clean 6f vs downattack_2's 17f flame string).
MERGED up-attack = one input (I): tap→samUpTap / hold≥9f→samUpHold. Toji-Rekka chain (Fwd+Heavy,
cancel-on-hit): samRekka1→samRekka2→samRekkaFin. Code: characters.js animationData + abilities.js
SAMURAI_RANGER_UP/SAMURAI_RANGER_CMD + updateSamuraiRangerCommandCombat, game.js dispatch + upAttack
suppression, sprite.js identity maps. Evidence: `harness/samurai_red_ranger_stage2.mjs` (23/23).

### Ultimate — "Fire Smasher: Blazing Strike" (Stage 5, TIER-SCALING)  ✅ BUILT
Freeze-cinematic (NEW `samuraiFlameSmasherCinematic.js`, Rengoku contract). The cinematic plays the
caster's OWN `ultimate` sprite → **base art untransformed, Mega art in Mega Mode** (automatic via
`_skinAnim`). Damage tier-scaled: **base 340 / Mega 460** (`applySamuraiUltimateDamage`). Both tiers'
6 `specialattack_part1..6` sheets STITCHED (`tools/stitch_strips.mjs` → reslice `--minw=40`):

| uniform sheet | frames | cell | tier |
|---|---|---|---|
| `samurai_ranger_ultimate_uniform.png` | 54 | 164×100 | base (`animationData.ultimate`) |
| `samurai_ranger_mega_ultimate_uniform.png` | 55 | 164×108 | Mega (`SAMURAI_MEGA_ANIM.ultimate`) |

The parts' "multi-row" scans were just thin FX slivers (effectively single-row). Wiring: abilities.js
`executeSamuraiRangerUltimate` (spendEnergy 100) + triggerUltimate case; game.js 6 touchpoints (import /
freeze block / drawBattle / 3 reset clears / innerCineActive / `samuraiUltCine` hook). Evidence:
`harness/samurai_red_ranger_stage5.mjs` (12/12 — base 340+base-art vs Mega 460+Mega-art).

### Mega Mode tier (Stage 3 tier-swap)  ✅ BUILT
Full Vegeta-style tier-swap: `_skinAnim = SAMURAI_MEGA_ANIM` (abilities.js) + damageMultiplier **1.35**
(spd 1.05 / def 1.08). Resliced Mega strips → uniform:

| uniform sheet | frames | cell | Mega role |
|---|---|---|---|
| `samurai_ranger_mega_idle_uniform.png` | 4 | 28×62 | idle |
| `samurai_ranger_mega_walk_uniform.png` | 8 | 46×61 | walk/run/dash |
| `samurai_ranger_mega_jump_uniform.png` | 6 | 36×60 | jump/fall |
| `samurai_ranger_mega_hit_uniform.png` | 2 | 39×59 | hurt |
| `samurai_ranger_mega_guard_uniform.png` | 3 | 30×56 | guard (cropped top row of 2-row block) |
| `samurai_ranger_mega_combo_uniform.png` | 13 | 77×69 | light + heavy + samRekka1/2 |
| `samurai_ranger_mega_downattack_uniform.png` | 7 | 63×73 | down_air |
| `samurai_ranger_mega_downattack_2_uniform.png` | 18 | 77×77 | samRekkaFin |
| `samurai_ranger_mega_upattack_1_uniform.png` | 8 | 69×118 | samUpTap |
| `samurai_ranger_mega_upattack_2_uniform.png` | 14 | 93×91 | samUpHold (`--minw=28`) |

ART GAPS (flagged, NOT fabricated): no Mega combo_2 (heavy reuses mega_combo window); **no Mega air
sheet → `air` falls back to base** via `_skinAnim?.[k] || animationData[k]`. Mega ultimate art
(`..._mega_mode_specialattack_part1..6`) + `..._mega_mode_counterattack` reserved for Stage 5.

### Transformation cinematic (Stage 3)  ✅ BUILT
`samurai_ranger_megatransform_calligraphy_uniform.png` (resliced from `transformation_part_1`, 8f,
193×113). game.js `drawSamuraiMegaTransform`: procedural silhouette DARKEN (base body stays base until
resolve) + 火 calligraphy brush-drawn ALONGSIDE (behind the fighter, not overlaying); engine
`teleportFlash` = resolve pop. **CONFIRMED: transformation sheets are 火 ONLY — no 超, no body-morph
art in any real frame** (design's flag resolved → don't fabricate 超). parts 2–5 are color/pulse
variants (unused; part_1's red→black draw-on already carries the resolve arc). Evidence:
`harness/samurai_red_ranger_stage3.mjs` (14/14, incl. dual-render tally + auto-revert).

### Mega-Mode-EXCLUSIVE Flame Slash (Stage 4)  ✅ BUILT
Special button (neutral), gated HARD on `samuraiIsMega` → **base form = no-op** (no base-tier art
exists; flagged, not fabricated). Rising flame-slash **launcher** + **double-burst** (2 forward crescents).

| uniform sheet | frames | cell | role |
|---|---|---|---|
| `samurai_ranger_flameslash_uniform.png` | 13 | 91×75 | Flame Slash cast pose (`flameSlash` key, Mega set only; `--minw=34`) |
| `samurai_ranger_flameburst_uniform.png` | 12 | 57×75 | the two burst crescents (`samurai_flameburst` projectile; `--minw=24`) |

Cost 35 Symbol Power (+ Mega's own drain). Code: abilities.js `executeSamuraiRangerSpecial` +
triggerSpecial case + `SAMURAI_MEGA_ANIM.flameSlash` + sprite.js identity. `samurai_ranger_specail_blast.png`
(1288×110) = a fuller slash+burst variant (UNUSED — `mega_mode_specail_attck` is the design-specified
source). Evidence: `harness/samurai_red_ranger_stage4.mjs` (13/13, incl. base-form no-op gate).

### Portrait  ✅ REAL MUGSHOT (2026-08-01)
Replaced the placeholder (idle-crop, upscaled) with the **real "Red Ranger JAYDEN" bust** cropped from the
master sheet `samurai_ranger_fire_sprite_sheet_by_neomar654_difd7wd.png` header (alpha-bbox 881,354–1047,528;
helmet + torso + Spin Sword over the shoulder). Overwrites `samurai_ranger_portrait.png` (same
`characters.samurai_red_ranger.portrait` field — no wiring change). The 4 alt-skin recolor portraits are
untouched (separate `__<tag>` files). The master ALSO has a "Red Ranger [Mega Mode]" bust (881→1225 region;
un-used, reserved if a Mega-tier portrait is ever wanted).

### Intro  — NO DEDICATED ART (2026-08-01, honest finding)
`introPool:["idle"]` (Stage-1 placeholder). Surveyed the FULL master sheet (1451×7676): it contains only
Idle/Movement/Jumping/Blocking + attack rows + the 超 calligraphy FX + the two static busts — **no
intro/victory character-pose sequence exists** (unlike Gold, which has a separate `intro.png` morph-call).
So there is no asset-map-confirmed intro to wire; idle remains the intro pose. Options if wanted: repurpose a
combat pose (e.g. the up-launcher flourish), or extract a victory pose from the deferred master win/lose bands.

### Canonical test + balance (Stage 6)  ✅ DONE
`harness/samurai_red_ranger.test.mjs` — 24/24 (registration/portrait · all normals both tiers · merged
up-attack · Toji-Rekka chain + whiff interrupt · transformation darken→resolve · dual-render guard ·
≥3 Mega-tier moves · Flame Slash Mega-gate · ultimate tier-scaling). Full build: **98 assertions across
6 test files, 0 fail**; Omega 34 / Rengoku 41 / Killua 24 / Goku Black 13 — no regression.

BALANCE (vs BALANCE_AUDIT.md): HP1220/EN160/Atk95/Def88/Spd88 — **inside every band, no outliers** (sturdy
sword bruiser, sibling of Omega Ranger 1180/175/93/86/92). Damage pipeline HONEST — normals/chain/Flame
Slash melee+bursts run through the scaled `createAttackFromMove`/`spawnProjectile` (×0.60); Mega ×1.35
multiplies the scaled pipeline (Vegeta-class). Only manual-subtract = the ultimate (base 340 = identical
to Rengoku's ult, Mega 460) — consistent with the whole freeze-cinematic-ult class, not a new outlier.

### DEFERRED / MISSING (final)
1. **Master-sheet getup/win/lose** — `..._by_neomar654_difd7wd.png` (1451×7676) confirmed **65 row-bands**
   vs ~40 individual files → additional states (likely getup/win/lose) un-extracted; no individual files
   were supplied. Follow-up = per-band extraction from the master sheet.
2. **Mega air** — no mega air sheet → Mega `air` falls back to base tier (intended `_skinAnim` fallback).
3. **Mega combo_2** — none → Mega heavy reuses the mega_combo window.
4. **超 calligraphy** — CONFIRMED absent from all real frame content (只 火); not fabricated.
5. **Unused art** — `specail_blast` (fuller slash+burst variant), `mega_mode_counterattack` + base
   `counterattack` (no reactive-counter mechanic in the 6-stage design), transformation parts 2–5.
6. **VO / win / lose / taunt** — no voice batch provided; out of scope.
