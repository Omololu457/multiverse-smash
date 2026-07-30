# Kyojuro Rengoku — Asset Map

Second Demon Slayer sprite character (after Zenitsu). rosterKey `rengoku`, universe
`demon_slayer`. Source art: `kyojuro_rengoku_jus_demon_slayer_sprite_sheet_by_soulfiresprites_deju2ax.png`
(master sheet) + 29 individually-cropped `rengoku_*.png` strips uploaded 2026-07-29.

Filenames are preserved EXACTLY as uploaded, including the "foward" and "puches" typos —
do not correct them. Raw strips are non-uniform; each is copied to a `*_uniform.png` sibling
and re-sliced feet-aligned via `tools/reslice_strip.mjs` (originals recoverable from git).
Frame counts below marked **[measured]** are the reslice output; **[design]** are the confirmed
design-doc intent, reslice-confirmed at that stage's build.

## Base stats (Stage 1)
`HP 1140 · energy 0 (cooldown-gated, Demon Slayer) · atk 92 · def 80 · spd 92 · jumps 2 ·
jumpPower 31 · dashSpeed 19 / dur 9 / cd 36 · spriteScale 2.25`. Aggressive fire-Hashira
bruiser: durable + hard-hitting, a touch slower than Zenitsu (spd 96) who is the fragile
speed-burst DS archetype. atk 92 ties the roster top (Minato) by design ("powerful").

## Movement / State — STAGE 1 (wired)
| Action | File (`rengoku_*`) | Cell (measured) | Notes |
|---|---|---|---|
| idle | `idle_uniform.png` | 4f · 69×59 | breathing loop |
| walk | `run_uniform.png` | 8f · 55×52 | run strip played slower (only locomotion strip) |
| run | `run_uniform.png` | 8f · 55×52 | |
| dash | `dash_uniform.png` | 2f · 49×38 | ground dash blur |
| jump | `jump_uniform.png` | 6f · 48×62 | crouch→rise→apex, play once + hold |
| fall | `jump_uniform.png` | 1f (cell 5, sourceX 240) | apex/descent pose |
| guard | `block_uniform.png` | 1f · 59×61 (cell 0) | braced stance; later cells are a spin flourish → hold cell 0 only |
| hurt | `hit_uniform.png` | 1f · 80×56 (cell 0) | backward-recoil flinch |
| knockdown | `hit_uniform.png` | 4f · 55×56 | stagger→knockback→fall→grounded; **GAP:** master sheet's full get-hit + dust FX never cropped → holds last (grounded) frame, no invented art |

> **HIT-STRIP DUPLICATE-RENDER FIX (2026-07-29):** the source hit art baked TWO figures (a stagger + a
> knockback, bridged by the blade) into its first content island, so the alpha-gutter reslice merged them
> into ONE 80px cell → `hurt` rendered BOTH figures at once (looked like two Rengokus). Fixed by re-cropping
> the two figures into separate cells (`crop_region` × per-figure → `stitch_strips` → reslice), giving a
> clean 4-cell strip (55×56): cell 0 = single stagger. `hurt` = cell 0; `knockdown` = all 4.

## Intro — STAGE 1 (REDESIGNED 2026-07-29), stationary `introPool` random-cycle
Two INDEPENDENT intros, each played STATIONARY at his normal start position (no camera tracking, no
positional travel), random-cycled per match (`introPool: ["introRunIn", "intro2"]`). The earlier tracked
dash-in (Superman-style ease-in + off-screen offset) was REMOVED per feedback — Rengoku doesn't traverse
the arena. `game.updateRengokuIntro`/`finalizeRengokuIntroPos` deleted; standard intro path handles him.
| Variant | File | Cell (measured) | Notes |
|---|---|---|---|
| intro2 (primary) | `intro_2_uniform.png` | 4f · 65×66 | sword-draw flourish. Clean stationary. Same art doubles as the Counter special (Stage 4). |
| introRunIn | `intro_run_in_reverse_right_to_left_uniform.png` | 5f · 46×59 | run-cycle art played IN PLACE as a psyched-up ready flourish (plays-once + holds, not looping → mild in-place-stride nuance, not a treadmill loop). Art **normalized to face-right** (`sips -f horizontal`) so the engine facing-flip renders it for P1/P2. |

## Normals — STAGE 2 [design]
| Slot | File | Notes |
|---|---|---|
| light | `foward_slash.png` | quick forward katana poke (2f) |
| heavy | `down_attack.png` | **best-judgment content, NOT master-verified** — a real coherent downward swing (4f); light/up/air/down_air are cleanly matched, this is the best real content for heavy. Flag at build. |
| up | `up_attack.png` | rising slash, launcher (6f) — hook launcher-cancel/juggle |
| air | `combo_air_1.png` (opening segment) | Air hit 1 used standalone; remainder feeds the air chain |
| down_air | `down_air_attack.png` | descending spike (7f) |

## Command combo chain — STAGE 3 [design] (cancelable, Toji-Rekka style)
- **Ground:** `combo_1` (Hit1 opener remainder) → `combo_2` (Hit4 base) → `combo_3` (Hit5 base),
  with `super_foward_attack` (Hit6) and `super_down_attack` (Hit7) as ESCALATED finisher
  branches off Hit4/Hit5.
- **Air:** `combo_air_1` remainder (Air hit2) → `combo_into_air` (ground→air launcher bridge) →
  `combo_air_2` (Air hit3 base), with `super_down_air_attack` (Air hit4) as the escalated finisher.

## Specials — STAGE 4 [design]
- **Charged Flame Strike:** `charge.png` windup (4f, no hitbox) → tap-release `charge_hit_1.png`
  (7f) / hold-release `charge_hit_2.png` (6f, wide flame-trail) as two power tiers → `puches.png`
  (2f, dash-recovery poses despite the misleading name — NOT punches) as the recovery tail.
  `charge_hit.png` is a redundant duplicate of `charge_hit_2` → DROPPED.
- **Counter:** reactive parry/riposte using `foward_attack_charge.png` / `intro_2.png` content
  (master sheet's own "Counter" band). Reuse project `checkParry` architecture.

## Ultimate — STAGE 5 [design]
- **Flame Explosion:** `ultimate_explosion.png` (8f; filename + master-sheet "Explod" match, high
  confidence). Reuse the existing freeze-cinematic architecture (camera push-in → sequence → pull-back).

## Portrait — STAGE 6 ✅
- No dedicated mugshot in the batch → cropped a 40×44 bust (head + flame-hair + cape shoulders) from
  `rengoku_idle_uniform.png` frame 0 via `tools/crop_region.mjs` → `rengoku_portrait.png` (Zenitsu precedent).

## Build status
All 6 stages COMPLETE. Canonical `harness/rengoku.test.mjs` = 40/40. Stage shot scripts:
`rengoku_stage{1,2,3,4,5}_shots.mjs`. `npm run test:rengoku`.

## Deferred / confirmed-missing (DO NOT invent placeholder art)
- **Dizzy** — no file in either batch.
- **Crouch** — no file in either batch.
- **Win pose** — no file in either batch.
- **Lose pose** — absent from EVERY file including the master sheet itself.
- **Full get-hit/knockdown remainder** — only the first 3 of ~8-9 frames were individually cropped
  (+ an uncropped ground-impact dust FX frame). Degrades to the grounded last-frame hold.
