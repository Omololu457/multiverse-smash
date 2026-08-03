# Green Samurai Ranger (Forest) — Asset Map

**Character:** "MIKE" — the Forest / Green Samurai Ranger (Power Rangers Samurai).
**rosterKey:** `green_samurai_ranger` · **universe:** `power_rangers` · **spriteScale:** 1.85
FOURTH Power Rangers sprite char (after Omega, Samurai Red, Gold Samurai). Mirrors the
CONFIRMED Red/Gold structure (base/Mega-Mode tier-swap · Transformation special ·
tier-scaling Ultimate) with Green's OWN art.

> The brief assumed this file existed — it did NOT. Created during the Stage-1 build, same as
> Gold's map was. Frame boundaries below are measured via `tools/reslice_strip.mjs`'s
> alpha-gutter scan (ALPHA=16) on COPIES of the untracked originals.

## KEY IDENTITY FINDING — the SPEAR is real
The alpha-gutter scan of the master sheet (band ~3300–4400) and the dedicated
`samurai_ranger_forest_specail*` sheets confirm Green wields a **SPEAR / naginata (Forest
Spear)** with a **green leaf-swirl FX** — a genuine EXTENDED-REACH weapon that neither Red
nor Gold has (both are katana swordsmen). This resolves the brief's spear question: **YES,
spear/polearm content exists on disk.** It is reserved for the **Stage-4 special**
(`samurai_ranger_forest_specail_projectile.png`, a spear-thrust → leaf-energy blast wave),
with longer reach/frame data than the melee normals. Base-tier NORMALS (Stage 2) draw from the
melee rows of `..._attacks.png`; whether a spear pose also earns a long-reach normal slot is a
Stage-2 decision (report the reasoning then).

## Transformation theme
**FOREST Symbol Power (森 — green leaf/wind morph)**, distinct from Red's fire and Gold's
light. Particle FX source = `samurai_ranger_forest_random.png` (rising green-leaf/flame column
+ a charging green symbol orb). Mega cinematic source = `samurai_ranger_forest_mega_mode_intro.png`
(1314×892). ⚠️ NOTE: Green also has a THIRD art set — `..._power_mode_*` (idle/jump/down_attack)
— beyond base + mega_mode. Investigate in Stage 3 whether "power mode" is the mega equivalent or
an intermediate tier before committing the tier-swap wiring.

## Source inventory (untracked `samurai_ranger_forest_*.png` originals)
| file | size | role |
|---|---|---|
| `_idle.png` | 159×71 | idle (4f) |
| `_run.png` | 514×60 | walk/run/dash (8f) |
| `_jump.png` | 326×71 | jump/fall (6f) |
| `_block.png` | 423×165 | 2-row: guard crouch + cyan energy-shield FX |
| `_counter.png` | 974×98 | counter/parry (Stage 2/4 candidate) |
| `_attacks.png` | 1017×308 | multi-row base melee master (normals + rekka source) |
| `_down_attack.png` / `_super_down_attack.png` | 941×100 / — | down / heavy-down melee |
| `_up_attack.png` | 642×145 | up-attack (rising) |
| `_air_attack.png` | 840×87 | aerial slash |
| `_specail.png` / `_specail_attacks.png` | — | SPEAR special poses |
| `_specail_projectile.png` | 916×96 | **SPEAR leaf-blast projectile (Stage-4 special)** |
| `_specail_mega_mode.png` | — | Mega-tier spear special |
| `_power_mode_idle/jump/down_attack.png` | — | ⚠️ "power mode" tier art (investigate S3) |
| `_mega_mode_intro.png` | 1314×892 | Mega transformation cinematic (S3) |
| `_mega_mode_attacks/_block/_counter/_upper_attack/_super_down_attack/_specail_attacks.png` | — | Mega-tier combat art |
| `_sprite_mega_mode_run.png` | — | Mega-tier run |
| `_random.png` | 1356×1313 | green morph particle FX (S3) |
| `_sprite_sheet_by_neomar654_difd6t4.png` | 1551×9327 | **full labeled master** (Idle/Movement/Jumping/…/Symbol Blasts/**Stun**/mugshots) |

## Portrait
REAL mugshot cropped from the master-sheet HEADER (helmeted bust at master x≈948–1098,
y≈458–665; gutter-split from the yellow "Green Ranger" logo text below), upscaled 3× NEAREST →
`samurai_ranger_forest_portrait.png`. Not a placeholder idle-crop (the Red/Gold Stage-6 fix,
applied up front in Stage 1).

## STAGE 1 — base-tier movement/state (DONE ✓)
All resliced to uniform strips (`tools/reslice_strip.mjs --minw=8`) from COPIES.
| action | uniform sheet | frames | cell | notes |
|---|---|---|---|---|
| idle | `_idle_uniform.png` | 4 | 30×61 | |
| walk/run/dash | `_run_uniform.png` | 8 | 58×52 | |
| jump/fall | `_jump_uniform.png` | 6 | 35×60 | lockLastFrame |
| hurt | `_hurt_uniform.png` | 3 (of 11) | 43×71 | master "Stun" reel (stagger-with-stars), first 3 |
| guard | `_guard_uniform.png` | 4 (of 8) | 41×85 | `sourceX:164` skips the shield-FX frames → clean crouch |

**Stats (REACH archetype):** HP 1190 · EN 165 · atk 91 · def 85 · spd 91 · jumpPower 31 ·
dashSpeed 18 · maxJumps 2. Sits BETWEEN Red (heavy/slow 1220/88) and Gold (nimble 1160/94);
spear reach — not footspeed — is the win condition. In-band, no outliers.

**Evidence:** `harness/green_samurai_ranger_stage1.mjs` → 12/12; shots `harness/shots/green_stage1_*.png`.

## STAGE 2 — normals + Toji-Rekka command chain (DONE ✓)
All Spin-Sword melee, resliced from COPIES. **SPEAR DECISION: reserved for Stage 4, NOT a normal
slot** — the alpha-gutter scan confirmed EVERY base normal (attacks/up/air/down) uses the Spin Sword
with green slash FX; the spear appears ONLY on the `_specail*` sheets. Green does a SINGLE grounded
up-attack (like Gold, not Red's merged tap/hold — `mergedUp` in abilities.js stays Red-only).
| slot | uniform sheet (from) | frames | cell |
|---|---|---|---|
| light | `_slash_uniform` (attacks row0) | 4 of 12 | 68×73 |
| heavy | `_lunge_uniform` (attacks row1) | 6 of 13 | 77×69 |
| up | `_rising_uniform` (up_attack) | 8 | 69×118 (launcher) |
| air | `_aerial_uniform` (air_attack) | 6 of 9 | 109×56 |
| down_air | `_aerial_uniform` (`sourceX:545`, frames 6-9) | 4 | 109×56 |
| samRekka1 | `_slash_uniform` (full row0) | 12 | 68×73 |
| samRekka2 | `_lunge_uniform` (full row1) | 13 | 77×69 |
| samRekkaFin | `_launcher_uniform` (down_attack leaf-spike string) | 15 | 81×77 |

**Wiring (reused Red/Gold's SHARED system, not rebuilt):** added `green_samurai_ranger` to
`SAMURAI_RANGER_KEYS` (abilities.js:3238) + the command-combat call gate (game.js:3599, refactored the
double-OR to a 3-key `.includes`). Damage/frame data = the shared `SAMURAI_RANGER_CMD` table (unchanged);
sprites resolve against Green's own animationData keys. Cancel-on-hit = shared `rekkaContinue` (combat.js).

**Evidence:** `harness/green_samurai_ranger_stage2.mjs` → 21/21 (5 normals connect+correct sheets, up
launches, chain 1→2→Fin fires, mid-chain whiff breaks the string). Regression: Gold 21/21, Red 23/23.

## STAGE 3 — Mega Mode transformation + full tier-swap (DONE ✓)
**RESOLVED the power_mode-vs-mega_mode question:** a palette compare (base green R≈55-62 vs `power_mode`
+ `mega_mode` R≈38-39, deeper) proved they are the **SAME transformed tier**, split across
differently-named sheets. So the Mega tier draws **idle/jump from `power_mode_*`** and **combat from
`mega_mode_*`**. Transformation symbol = the **木/森 (Forest/Wood) kanji** brush-stroke draw-on extracted
from `_mega_mode_intro.png` row 0 (7 frames 一→十→才→木) → `_symbol_uniform.png`.

**Reused the SHARED tier-swap machinery (NOT rebuilt):** added `green_samurai_ranger` to
`SAMURAI_RANGER_KEYS` (S2) + `SAMURAI_MEGA_ANIM_BY_KEY` (abilities.js) + the mega charge gate
(game.js:2996, refactored to 3-key `.includes`). Same Vegeta-style `_skinAnim` swap +
`enterSamuraiMega`/`revertSamuraiMega`/`applySamuraiFormSystem` + morph timing. Mult 1.35/1.05/1.08
(mirrors Red/Gold). **Fixed a latent voice LEAK**: `enterSamuraiMega`'s ternary defaulted non-gold →
Red's clip; made it char-aware so Green is SILENT (no voice pack yet) instead of stealing Red's line.

**`GREEN_MEGA_ANIM` mega-tier sheets** (resliced from COPIES): idle←power_mode_idle · jump←power_mode_jump
· run←sprite_mega_mode_run · guard←mega_mode_block (sourceX:164 clean crouch) · light/heavy/rekka1-2←
mega_mode_attacks rows · up←mega_mode_upper_attack · samRekkaFin←mega_mode_super_down_attack (pink-ring→
green leaf-storm super). air/hurt/down_air OMITTED → fall back to base sheets (no dedicated Mega art;
flagged not fabricated). Single up-attack (like Gold).

**Green cinematic branch** in `drawSamuraiMegaTransform` (game.js): rising GREEN leaf-glow radial bloom +
木 symbol materialising over the body (nature/growth theme, NO dark veil — sibling of Gold's light bloom,
green-tinted). Distinct from Red's 火 fire-veil and Gold's 光 light.

**Evidence:** `harness/green_samurai_ranger_stage3.mjs` → 14/14 (below-threshold gate, charge-release
morph, pre-resolve build phase, RESOLVE art+1.35 dmg swap, 4 moves on Mega tier, Mega light out-damages
base, **DUPLICATE-RENDER test maxDrawsPerFrame=1**, tap-revert + auto-revert-on-empty). Regression:
Gold 14/14, Red 14/14.

## STAGE 4 — Forest Spear special (extended reach) (DONE ✓)
The character's REAL spear finally deployed. Modelled on Gold's projectile special (both tiers,
tier-scaling) but with the SPEAR IDENTITY: a LONG-REACH melee thrust (rangeX **100**, vs the melee
normals' ~68-92) that ALSO hurls a travelling leaf-energy blast wave. Green is SILENT (no voice pack;
no cross-VA leak). Energy 35. Base 90 melee / 72 wave · Mega 120 / 96 (mult built into the handler).
- Cast pose (base) `forestSpear` ← `_spear_cast_uniform` (from `_specail.png`, 13 of 22f, 83×68)
- Cast pose (Mega) override in GREEN_MEGA_ANIM ← `_mega_spear_cast_uniform` (from `_specail_mega_mode.png`, 83×70)
- Projectile `forest_spear_wave` ← `_spear_wave_uniform` (from `_specail_projectile.png`, 12f, 57×75), color #6bc34a leaf green

**Wiring:** NEW `executeGreenSamuraiSpecial` (abilities.js, sibling of `executeGoldSamuraiSpecial`) +
dispatch `case "green_samurai_ranger"` in `triggerSpecial`. Input = Special (P). Reused
`spawnProjectile`/`createAttackFromMove`/`setAttackState`/`schedulePendingSpawn` unchanged.

**Evidence:** `harness/green_samurai_ranger_stage4.mjs` → 10/10 (cast pose base+Mega, wave spawns +
connects at long range, EXTENDED-REACH: light deals 0 at gap 240 while the spear connects, Mega
out-damages base 57>43, dup-render maxDrawsPerFrame=1). Regression: Gold full-kit 22/22, Red 13/13.

## STAGE 5 — Ultimate "Forest Spear: Verdant Storm" (tier-scaling) (DONE ✓)
REUSED Red/Gold's freeze-cinematic architecture (`activateSamuraiFlameSmasherCinematic` — same timeline/
camera/STRIKE beat/`_skinAnim` tier art). NEW `executeGreenSamuraiUltimate` + `applyGreenSamuraiUltimateDamage`
(sibling of Gold's) + dispatch case in `triggerUltimate`. TIER-SCALING exactly like Red/Gold: base 340 /
Mega 460 (guaranteed sure-hit). Green is SILENT (no voice). Cost 100.
- ULT art (base) `ultimate` ← `_launcher_uniform` (leaf-spike storm, 15f) · (Mega) GREEN_MEGA_ANIM override ← `_mega_launcher_uniform` (pink-ring→green leaf-storm, 21f)
- Cinematic FOREST palette: NEW `isGreen` branch in `drawSamuraiFlameSmasherCinematic` (leaf-green vignette/
  flash #8ff07a/burst #6bdd52) + NEW optional `ringStroke` full-rgb override (the shared ring draw is
  red-dominant `rgba(255,…)` — fine for fire/light, so green supplies a green ringStroke; NON-regressive,
  Red/Gold don't define it → unchanged).

**Evidence:** `harness/green_samurai_ranger_stage5.mjs` → 12/12 (fires in BOTH tiers, base launcher art +
340 / Mega launcher art + 460, cinematic mega flag, art differs, damage scales). Regression: Gold 12/12, Red 12/12.

## STAGE 6 — Portrait + full-kit test + balance (DONE ✓ — BUILD COMPLETE)
**Portrait:** real mugshot (done in S1), renders on the power_rangers char-select (roster now: omega,
samurai_red, gold_samurai, **green_samurai**). Evidence `harness/shots/charsel_green_final.png`.

**Canonical full-kit test** `harness/green_samurai_ranger.test.mjs` → **22/22** (reliable across 4 runs):
registration/stats/portrait · 5 normals + single up + Toji-Rekka chain + whiff-interrupt · Forest Spear
projectile (base) · Mega FOREST-SYMBOL transform + tier-swap + ≥3 Mega moves · **DUPLICATE-RENDER guard
(maxDrawsPerFrame=1** through transform+idle) · Forest Spear tier-scaling · Ultimate tier-scaling (base
340 vs Mega 460 art+dmg). Hardened the rekka-chain sampling (repeat re-taps across the recovery window) —
the only flake, now deterministic.

**Balance (vs BALANCE_AUDIT.md):** NO outliers. Green sits BETWEEN Red & Gold on every axis —
HP 1190 (Red 1220 / Gold 1160), atk 91 (95/92), def 85 (88/84), spd 91 (88/94); all inside the sword
band (Naruto/Sasuke 1180/89/84/90, Gojo 1160/91/88/87). Reuses the SHARED, already-vetted ranger tuning:
`SAMURAI_RANGER_CMD` rekka table, Mega mult 1.35/1.05/1.08, ult 340/460 sure-hit (100 cost), special
35-cost 90/72→120/96. Introduces zero new balance mechanics — it clones the two proven rangers' numbers.

**Regression:** Gold full-kit 22/22, Red full-kit 24/24 (both clean). Voice suites: Red 33/33; Gold ~29/29
but a pre-existing ~40%-flake on its `foxClaw` finisher voice race (`fireSamuraiRangerMove` `_atkVoiceCd`
timing — untouched by this build; my only voice edit was `enterSamuraiMega`'s transform ternary).

**Reused-not-rebuilt confirmation:** the tier-swap (S3), command chain (S2), projectile-special (S4), and
freeze-cinematic ultimate (S5) all reuse the exact Red/Gold machinery, made char-aware via
`SAMURAI_RANGER_KEYS` / `SAMURAI_MEGA_ANIM_BY_KEY` / dispatch cases + green art & FX branches.

**Spear content:** existed (real naginata) → used as the Stage-4 extended-reach special (rangeX 100 +
leaf-blast projectile), NOT a normal (every base normal is Spin Sword). **Deferred/missing:** voice pack
(Green is silent everywhere — no cross-VA leak), alt-skins (only Default), win/lose/taunt art, dedicated
Mega air/hurt/down_air (fall back to base — flagged not fabricated).

## Build status: COMPLETE (all 6 stages, uncommitted on branch combo-flow-layer)
