# TOBIRAMA SENJU — Asset Map

15th sprite character (Naruto universe, after Naruto / Sasuke / Itachi).
Source art: a fan spritesheet ("BRAIZED" Edo-Tensei Tobirama sheet by
frank14kilate / gogeta10) plus a batch of individually-exported action strips.

This document is the **single source of truth** for slicing + wiring. Every one
of the 39 uploaded `tobirama_*.png` files is accounted for below (assigned,
reference, or deferred) per the mandatory "use / account-for every sprite" rule.

Measurement method: alpha-gutter column scan (`tools/slice_probe.mjs` for
overlays; `PIL` column-alpha runs for quick counts). `runs` = content islands
separated by fully-transparent gutter columns — a first-pass frame estimate that
is confirmed against the master sheet before slicing. Non-uniform source strips
are RE-SLICED into feet-aligned uniform cells via `tools/reslice_strip.mjs`
(→ `*_uniform.png`) so the engine can slice by a single pitch (Itachi/Killua
precedent).

Legend: **WIRED** = live in code now · **STAGE n** = wired in that stage ·
**REF** = source/reference sheet, not directly drawn · **DEFER** = held with a
stated reason.

---

## 0. Master / reference sheets  (REF)

| File | Dims | Notes |
|---|---|---|
| `tobirama_edo_nzc_sheet_by_frank14kilate_d6gll9_by_gogeta10_d6k5wqk.png` | 904×3603 | **MASTER SHEET** (blue background, labeled). Every individual strip below was cut from this. Kept as the slicing ground-truth; never drawn in engine. |
| `tobirama_transparent.png` | 904×3603 | Same master sheet, blue keyed to transparency. Alpha reference for re-cutting strips cleanly if a per-strip export is ambiguous. Not drawn in engine. |

---

## 1. Movement + state  (Stage 1 — WIRED)

All resliced to `*_uniform.png` feet-aligned cells; a single `anchorY:0` plants
feet across every standing action. Original strips retained as slicing source.

| Action | Source strip | Uniform sheet | Frames | Cell (w×h) | Notes |
|---|---|---|---|---|---|
| idle | `tobirama_idle.png` (163×91, 4) | `tobirama_idle_uniform.png` (156×90) | 4 | 39×90 | breathing loop |
| walk | `tobirama_walk.png` (267×94, 6) | `tobirama_walk_uniform.png` (282×91) | 6 | 47×91 | |
| run | `tobirama_run.png` (426×70, 6) | `tobirama_run_uniform.png` (408×70) | 6 | 68×70 | |
| dash | `tobirama_dash.png` (173×92, 3) | `tobirama_dash_uniform.png` (222×89) | 3 | 74×89 | water body-flicker dash-teleport visual |
| jump / fall | `tobirama_jump.png` (375×91, 7) | `tobirama_jump_uniform.png` (399×90) | 7 (+1 fall) | 57×90 | crouch→rise→apex arc; `fall` = last cell (sourceX 342) |
| guard | `tobirama_block.png` (98×89, 2) | `tobirama_block_uniform.png` (82×90) | 2 | 41×90 | braced cross-arm block, hold last |
| hurt / knockdown | `tobirama_hit.png` (364×82, 5) | `tobirama_hit_uniform.png` (420×84) | 1 hurt / 5 knockdown | 84×84 | strip is a full knockdown; hurt = frame 0 |
| intro | `tobirama_intro.png` (231×87, 4) | `tobirama_intro_uniform.png` (280×88) | 4 | 70×88 | entrance settling into stance |
| portrait | — | `tobirama_portrait.png` (128×128) | — | 128×128 | select/HUD portrait (WIRED Stage 1; re-crop candidate in Stage 5) |

---

## 2. Basic normals  (Stage 2 candidates)

Melee strips → 5 normal slots (light / heavy / up / air / down_air). Slot
assignment finalized in Stage 2 after viewing each; first-pass reading below.

| File | Dims | runs | First-pass reading → likely slot |
|---|---|---|---|
| `tobirama_low_kick.png` | 337×88 | 6 | quick low kick → **light** candidate |
| `tobirama_strongz-foward_attack.png` | 202×81 | 2 | short forward strike (2 frames) → **light/heavy** poke candidate |
| `tobirama_up_kick.png` | 350×89 | 6 | rising kick → **upAttack (launcher)** candidate |
| `tobirama_upper_knee_attack.png` | 380×92 | 8 | rising knee → **upAttack** alt / heavy candidate |
| `tobirama_strong_upper_attack_kick.png` | 355×122 | 6 | tall strong rising kick → **upAttack / heavy** candidate |
| `tobirama_super_up_kick.png` | 173×87 | 4 | compact rising kick → up-normal alt |
| `tobirama_down_air_kick.png` | 241×99 | 4 | descending kick → **downAir** |
| `tobirama_super_down_attack.png` | 464×144 | 8 | big overhead/down slam (tall) → **heavy** / down-normal candidate |
| `tobirama_attack_combo_1.png` | 391×92 | 7 | multi-hit combo string → command chain (Stage 3) or **heavy** |
| `tobirama_attack_combo_2.png` | 572×96 | 10 | longer combo string → command chain (Stage 3) |

Overflow melee (combos + surplus kicks) routes into the Stage 3 command-normal
chain rather than being left unused.

---

## 3. Command chain + free pokes  (Stage 3)

`tobirama_attack_combo_1.png` (7) and `tobirama_attack_combo_2.png` (10) are the
natural cancelable rekka string (Toji-Rekka architecture). Any surplus Stage-2
kick not bound to a normal slot becomes a chain link or a free/cooldown poke,
decided in Stage 3.

---

## 4. Specials — water & space-time jutsu  (Stage 4)

**CRITICAL:** most of these are *character-frame-only* strips. Where the
projectile / effect layer is genuinely absent, Stage 4 draws a **PROCEDURAL**
placeholder (translucent blue/cyan water shapes — expanding rings, wavy ribbon
trails, particle bursts) marked `TEMPORARY PLACEHOLDER EFFECT` in code, built for
drop-in replacement when the real FX art lands.

| File | Dims | runs | Move (proposed) | Effect art present? |
|---|---|---|---|---|
| `tobirama_water_dragon_justu.png` | 506×91 | 10 | Water Dragon Jutsu — cast/charge (projectile special) | partial — see bullet |
| `tobirama_water_dragon_bullet.png` | 250×97 | 5 | Water Dragon — the projectile head itself | **YES** (real projectile art) |
| `tobirama_water_wall_justu.png` | 250×93 | 5 | Water Wall — defensive barrier special | cast frames only → **procedural wall FX** |
| `tobirama_foward_water_slash.png` | 408×89 | 8 | Forward Water Slash — advancing melee-range water blade | slash arc only → **procedural water-arc FX** |
| `tobirama_water_up_attack.png` | 356×109 | 8 | Rising Water — anti-air / launcher special | cast frames only → **procedural water geyser FX** |
| `tobirama_water_teleport_after_hit_to_get_away.png` | 511×71 | 6 | Water Body-Flicker — space-time escape teleport (whiff-punish / reposition) | **procedural water-dissolve FX** (twin of Sasuke/Itachi teleport flash) |
| `tobirama_darkness_justu.png` | 318×88 | 6 | Darkness Jutsu — dark-element special (zoning / debuff) | cast frames only → **procedural dark-mist FX** |

Space-time note: Tobirama's canonical Flying-Raijin marking is represented here
by the water body-flicker teleport (`movement.dashTeleport` already gives the
double-tap dash; the special adds the reactive get-away). Any dedicated
Raijin-marker art is not in this batch → deferred, no fabricated content.

---

## 5. Edo Tensei ultimate  (Stage 6)

| File | Dims | runs | Role |
|---|---|---|---|
| `tobirama_performing_edo_tense.png` | 583×94 | 11 | Tobirama's cast animation (hand-seals → summon) shown on activation |
| `tobirama_edo_tense_effect_part_1.png` | 91×81 | 4 | summon effect — burst/seal FX (part 1) |
| `tobirama_edo_tense_effect_part_2.png` | 644×87 | 10 | summon effect — coffin-rise / smoke FX (part 2) |

The reanimated ally itself is **any already-built roster character** (player
pre-picks in the Stage-6 selection UI) — no new fighter art required for the
summoned body; it uses that character's existing kit.

---

## 6. Utilization checklist (all 39 files)

- **REF (2):** edo_nzc master sheet, transparent master sheet
- **Movement/state WIRED (17):** idle(×2), walk(×2), run(×2), dash(×2), jump(×2),
  block(×2), hit(×2), intro(×2), portrait — original strip + uniform reslice each
- **Normals / chain, Stage 2–3 (10):** low_kick, strongz-foward_attack, up_kick,
  upper_knee_attack, strong_upper_attack_kick, super_up_kick, down_air_kick,
  super_down_attack, attack_combo_1, attack_combo_2
- **Specials, Stage 4 (7):** water_dragon_justu, water_dragon_bullet,
  water_wall_justu, foward_water_slash, water_up_attack, water_teleport, darkness_justu
- **Ultimate, Stage 6 (3):** performing_edo_tense, edo_tense_effect_part_1,
  edo_tense_effect_part_2

Total 2 + 17 + 10 + 7 + 3 = **39.** No file unassigned; none unidentified.

---

## 7. FINAL utilization (as built through Stage 4)

- **Movement/state (Stage 1, WIRED):** idle, walk, run, dash, jump/fall, guard, hurt/knockdown, intro, portrait — 8 uniform reslices + portrait.
- **Normals (Stage 2):** light=low_kick · heavy=strongz-foward_attack · up=up_kick · air=super_up_kick · down_air=down_air_kick.
- **Command chain + pokes (Stage 3):** chain tobiCombo1=attack_combo_1 → tobiCombo2=attack_combo_2 (built-in water burst) → tobiComboFin=super_down_attack; pokes tobiStrongFwd=strong_upper_attack_kick (Fwd+Light), tobiRisingKnee=upper_knee_attack (Back+Heavy). The 2 baked-"STRONG ATTACK" labels were pixel-stripped before reslice.
- **Specials (Stage 4):** N=Water Dragon=water_dragon_justu (proc FX) · F=Water Slash=foward_water_slash (built-in) · air/Up=Rising Water=water_up_attack (built-in) · D=Water Wall=water_wall_justu (proc) · B=Darkness=darkness_justu (proc) · reversal=Water Body-Flicker=water_teleport_after_hit_to_get_away (built-in).
- **Ultimate (Stage 6, WIRED):** performing_edo_tense = the `tobiEdoCast` hand-seal ritual pose; edo_tense_effect_part_2 = the rising summoning-coffin FX; edo_tense_effect_part_1 = the ground-rift FX — all played during the ~0.47s activation windup before control swaps to the reanimated vessel.
- **Reference (never drawn):** edo_nzc master sheet, transparent master sheet.
- **Reserved:** water_dragon_bullet — near-duplicate Water-Dragon cast pose; the Water Dragon special uses the more complete water_dragon_justu seal→thrust. Held for a future charged/2-tier Water Dragon or as the drop-in slot when real projectile art arrives.

**Procedural placeholder FX (pending real art; drop-in via `p.sheet` on the projectile):** Water Dragon (drawKind "water"), Water Wall (drawKind "waterwall"), Darkness (drawKind "dark") — all in `ui.js drawProjectiles`. Water Slash / Rising Water / Water Flicker have their water FX baked into the sprite art (no procedural needed).
