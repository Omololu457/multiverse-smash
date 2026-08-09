# MADARA UCHIHA — Asset Map

6th Naruto-universe sprite character (after Naruto / Sasuke / Itachi / Tobirama /
Minato), rosterKey `madara`. **The largest single-character kit in the project** —
a deliberate scope exception: **7 specials + a tap/hold TIERED ultimate** vs. the
standard 2–4 special budget. This document is the **single source of truth** for
slicing + wiring; every one of the **54 uploaded `madara*.png` files** is accounted
for below (assigned / reference / held / gap), per the "use or account-for every
sprite" rule.

Filenames are preserved **exactly as uploaded**, including the `justu` / `specail`
/ `sussanoo` / `spequance` / `reneggan` / `dragoon` / `explasion` typos and the
double `.png.png` extensions. Non-uniform source strips are RE-SLICED into clean,
feet-aligned uniform cells via `tools/reslice_strip.mjs` → `*_uniform.png` **copies**
(the exact-as-uploaded originals are kept untouched). Templated off fellow shinobi
Tobirama / Minato.

Legend: **WIRED** = live now · **Sn** = wired in that stage · **REF** = source
sheet, not drawn · **HELD** = retained with a stated reason · **GAP** = confirmed
missing, not fabricated.

---

## 0. Master / reference sheets (REF — never drawn)

| File | Dims | Notes |
|---|---|---|
| `madara2_transparent.png` | 1854×2607 | **BASE-Madara master.** Labeled rows: STAND, RUN, HIT/DEAD/GET UP, JUMP, BLOCK, DASH, AERIAL LIGHT, AERIAL HARD, LIGHT ATK, LIGHT ATK 2, SUPPORT ATK, HARD ATK, AERIAL COMBO, COMBO, SPECIAL 1 (Mokuton), SPECIAL 2 (Katon Gouka Mekkyaku). Every base strip was cut from here. |
| `madara_transparent.png` | 1854×3120 | **SUSANOO master.** SPECIAL 4 (Susanoo Attack), SPECIAL 5 (Mokuton Mokuryū / Wood Dragon), + the large blue true/complete-Susanoo sword-combat poses. |
| `madara2_ultimat_reffernce.png` | — | Ultimate composition reference (meteor / Tengai Shinsei layout). Not drawn. |

**WIN-pose recrop (Stage 1 attempt):** BOTH masters were scanned band-by-band.
Every base-Madara row on `madara2_transparent.png` is labeled and enumerated
above — **there is no WIN / victory row on either sheet.** The design note's
"confirmed present on master sheet #2" does not hold against the actual art →
**GAP.** Madara falls back to idle on the win screen (engine default).

---

## 1. Movement + state (Stage 1 — WIRED)

All resliced to `*_uniform.png` feet-aligned cells; a single `anchorY:0` plants feet
across every standing action. spriteScale **1.8** (idle content 62px × 1.8 ≈ 112px
on-screen ≈ the Naruto/Sasuke/Itachi/Tobirama roster band; measured 106–112px,
not clipped).

| Action | Source strip | Uniform sheet (cell) | Frames | Notes |
|---|---|---|---|---|
| idle | `madara2_idle_1.png` (129×62) | `madara2_idle_1_uniform.png` (26×62) | 4 | primary idle (breathing loop) |
| walk / run | `madara2_run.png` (388×54) | `madara2_run_uniform.png` (55×54) | 6 | no walk strip → walk reuses run (slower speed) |
| dash | `madara2_dash.png` (103×60) | `madara2_dash_uniform.png` (45×52) | 2 | physical body-shift dash |
| jump / fall | `madara2_jump.png` (293×55) | `madara2_jump_uniform.png` (41×57) | 7 (+1 fall) | crouch→rise→apex; `fall` = last cell (sourceX 246) |
| guard | `madara2_block.png` (140×66) | `madara2_block_uniform.png` (30×62) | 4 | braced block, hold last |
| hurt / knockdown | `madara2_hit.png` (402×68) | `madara2_hit_uniform.png` (64×60) | 1 hurt / **7** knockdown | **HIT/DEAD/GET UP chain.** Source merged the hunch+fall poses (no transparent gutter) → **re-sliced with an explicit split at x=151** into 7 clean single-figure cells (fixed a two-figures-in-one-frame render artifact). hurt = frame 0. |
| intro | `madara2_intro.png` (946×82) | `madara2_intro_uniform.png` (113×74) | 12 | **coffin-emergence cinematic:** wooden coffin rises → tilts open → Madara revealed in the dark doorway → steps out in a light-burst → settles into stance. |

**HELD / unused movement art:**
- `madara2_idle_2.png` (arms-crossed) — **HELD** as a taunt-adjacent variant for a
  later stage if a slot opens (design: idle_2 = alt variant).
- `madara2_idle_3.png` — near-duplicate of idle_1; **UNUSED** (design).
- `madara2_land.png` (3f landing crouch) — **HELD.** The engine has **no landing
  state** (no `land` action hook); nothing would render it. Not fabricated into a slot.
- `madara_idle.png` — **MISLABELED.** It is the **Complete Susanoo** neutral pose,
  NOT Madara's own idle. Belongs to the Stage-5 HOLD-tier (§5), **not** wired to idle.

---

## 2. Basic normals (Stage 2 — WIRED)

Engine has exactly 5 normal slots (light/heavy/up/air/down_air, `combat.js _getMD`);
there is no distinct aerial-heavy, so the Susanoo-hand grab is wired via a NEW general
`air_heavy` hook (air+Heavy → `buildNormalControlState.airHeavy` → `controls.airHeavy`
→ `startMove("air_heavy")`; `_getMD` returns null for any char without the move, so it's
a no-op for everyone else — basickit/Sasuke regression clean).

| Slot | Source → uniform | Frames·cell | Notes |
|---|---|---|---|
| light | `madara2_slap_uniform.png` | 4 · 36×62 | quick gunbai swipe |
| heavy | `madara2_combo_1_uniform.png` | 9 · 50×62 | committed swipe→palm string (long reach) |
| up | `madara2_up_attack_uniform.png` | 5 · 45×62 | rising gunbai slash (launcher) |
| air | `madara2_air_combo_1_uniform.png` | 11 · 69×62 | neutral aerial flurry |
| **air_heavy** | `madara2_susanoo_grab_air_uniform.png` | 2 · 112×82 | AERIAL HARD / command-grab (air+Heavy). Only the **2 confirmed frames** used; master shows 3 recovery frames never exported → GAP, not fabricated. |

- `madara2_punch_1.png` → **HELD.** Its cross-arm→palm-thrust is the same motion as
  `combo_1`'s back half (the "punch_1/slap" alternative); slap chosen for light, combo_1
  for heavy, so punch_1 is redundant. Reserved for a Stage-3 command-normal if useful.

**GAPS (confirmed, not filled):**
- **down_air** — genuinely absent. NO `downAir` basic_attacks entry → the button no-ops
  (`startMove` returns false on null) rather than faking a hit on idle.
- **aerial-light** — **recrop attempted** (the master's "AERIAL LIGHT" row): it is only
  **1 orphan Madara frame + a motion-smear FX**, not a usable animation → remains a GAP.

---

## 3. Specials (Stage 3 — 7 total, wired ONE AT A TIME)

1. **Katon Fireball** — `madara2_fire_ball_justu.png` (cast) + `madara2_fire_ball_justu_projectile_spequance_part_1.png` (growth) + `madara2_fire_ball_justu_projectile_spequance_part_2.png` (dissipation — **cleaned in Stage 0**).
2. **Gunbai Summon** — `madara2_gunbai_summon.png` (own special, distinct from the swing).
3. **Gunbai Fan-Swing** — `madara2_gunbai_specail_attack_1.png` + `madara2_gunbai_specail_attack_1_specail.png.png` (slash-line FX overlay — **cleaned in Stage 0**).
4. **Mokuton — Wood Spike** — `madara2_tree_summon_1.png` + `madara2_tree_summon_1_ground_projectile_summon_sequance.png`.
5. **Mokuton — Wood Dragon** — `madara_wood_dragoon_justu.png` (cast) + `..._projectile_intro.png` + `..._projectile_part_1..5.png` (5) = largest non-ult chain.
6. **Susanoo Base Punch** — `madara2_base_susanoo_punch.png` (highest-reach single hitbox; build agent to decide special vs. heavy/command-normal and report).
7. **Susanoo Attack (tier 3)** — `madara_full_susanoo_idle.png` + `madara_full_susanoo_attack_1.png` + `madara_full_susanoo_attack_2.png` (full-body armor mode).

**Shared FX:** `madara2_ground_effect.png` — ground-impact FX, drawn under the Mokuton
spike / Susanoo slams (Stage 3) and reused for the meteor impact (Stage 5).

---

## 4–5. Tiered Ultimate (Stage 5 — WIRED)

ONE input (Ultimate button), split tap vs hold in `game.js handleUltimateRelease`
(release-based for Madara; `MADARA_ULT_HOLD_MS 250`). `triggerUltimate` passes
`opts.hold` → `executeMadaraUltimate`. The higher HOLD gate (`energy ≥ 180`) adapts the
Vegeta-SSJ / Maki-HP threshold pattern (no new engine logic).

**TAP — Perfect Susanoo / Tengai Shinsei** (cost 100, 340 dmg) — NEW `madaraTengaiShinseiCinematic.js`
freeze-cinematic (cloned from Rengoku). Drawn in the overlay: `madara2_meteor_smash.png`
(the falling meteor) + `madara2_meteor_smash_explasion_effect.png` (8f impact) +
`madara2_reneggan_genjustu_effect.png` (Rinnegan sky flash). Cast pose `madaraTengaiCast`
= `madara2_perfect_sussanoo_summon.png` (resliced). **HELD:** `madara2_meteor_smash_2.png`
(2nd-meteor variant) + `madara2_perfect_sussanoo_summon_effect.png` (summon aura) — reserved
for a multi-meteor / richer-cast polish pass.

**HOLD — Complete Susanoo giant** (gate ≥180, ×1.9 dmg / ×1.5 def, ~10s; Sasuke/Itachi
giant architecture via `_canvasHeightFrac 0.85`). Giant body `_skinAnim` = `madara_idle.png`
(the mislabeled Complete-Susanoo neutral, downscaled) for every non-attack action; giant
sword swings = `madara_true_susanoo_foward_attack.png.png` (light) + `..._2.png.png` (heavy),
downscaled, big-reach. **HELD:** `madara_true_susanoo_summon.png` + `_summon_transformation.png`
(entry cinematic — a flash entry is used instead), `..._foward_attack_3.png.png`,
`..._combo_1.png.png`, `_combo_part_1/2.png` (extra giant attacks) — reserved for a fuller
giant moveset / summon cinematic.

---

## 6. Utilization checklist (all 54 files) — FINAL

- **REF, never drawn (3):** `madara2_transparent`, `madara_transparent`, `madara2_ultimat_reffernce`.
- **WIRED — movement/state, S1 (8):** idle_1(→idle+walk), run, dash, jump(+fall), block(→guard), hit(→hurt/knockdown, 7-frame custom split), intro(coffin cinematic) + portrait (extracted S6 from the master's PORTRAITS bust).
- **WIRED — normals, S2 (5):** slap(light), combo_1(heavy), up_attack(up), air_combo_1(air), susanoo_grab_air(air_heavy, 2 confirmed frames).
- **WIRED — specials, S3 (13):** fire_ball_justu + fireball_proj(part_1) · gunbai_summon · gunbai_specail_attack_1 + its `_specail.png.png` slash-FX · tree_summon_1 + its ground-projectile sequence · wood_dragoon_justu + dragon(part_5) + burst(intro) · base_susanoo_punch · full_susanoo_idle/attack_1/attack_2.
- **WIRED — ultimate, S5 (6):** perfect_sussanoo_summon(cast) · meteor_smash · meteor_smash_explasion_effect · reneggan_genjustu_effect · madara_idle(giant) · true_susanoo_foward_attack + _2 (giant swings).
- **HELD, stated reason (16):** idle_2 (taunt variant), idle_3 (near-dup), land (no engine landing state), punch_1 (redundant w/ combo_1), fireball_proj part_2 (dissipation — projectile uses part_1's established frames), wood_dragon proj parts 1–4 (intermediate growth / alt curve — dragon uses the fullest part_5), meteor_smash_2 + perfect_summon_effect (multi-meteor/aura polish), true_susanoo_summon + _transformation (giant entry — flash used instead), true_foward_attack_3 + combo_1 + combo_part_1 + combo_part_2 (extra giant attacks), ground_effect (unused shared FX). All reserved for charged-tier / polish passes.

**Totals: 3 REF + 33 WIRED + 18 HELD = all 54 source files accounted for** (the `_uniform`
reslice/downscale copies + the extracted `madara_portrait.png` are new DERIVED files, not
part of the 54 source set).

**GAPS (confirmed, NOT fabricated):** `down_air` (genuinely absent — no data, button no-ops) ·
`aerial-light` (recrop attempted — the master "AERIAL LIGHT" row is 1 orphan frame + a
motion-smear, not a usable animation) · **WIN pose** (not present on either master sheet) ·
`susanoo_grab_air`'s 3 missing recovery frames (only the 2 confirmed are used).
