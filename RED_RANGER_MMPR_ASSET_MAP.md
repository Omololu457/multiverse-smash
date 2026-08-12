# Red Ranger (Jason, Mighty Morphin) — Asset & File-Utilization Map

**rosterKey:** `red_ranger_mmpr` · **universe:** `power_rangers` (FIRST of the classic MMPR team; distinct from the Samurai trio + Omega/S.P.D.)
**Art credit (REQUIRED):** "Omega (tolgayavuz85)" — tracked in `credits.js` `SOURCED_ART.red_ranger_mmpr`. Game: *Mighty Morphin Power Rangers: The Movie*.

Built in 5 staged passes (Stage 0 audit → S1 registration/movement/intros → S2 normals+rekka → S3 grab special → S4 Power Sword ult → S5 portrait/harness/balance). Every source PNG is either wired or an accounted-for reference. All gameplay sheets RE-SLICED to clean uniform, bottom-aligned cells via `tools/reslice_strip.mjs` from COPIES of the untracked originals (originals preserved).

## Master / reference (not directly rendered)
| File | Role |
|---|---|
| `red_ranger_mmpr_sprite_sheet_by_tolgayavuz_d738par.png` = `redranger_transparent.png` | Master cutting sheet (explicit-alpha). Source of every frame + the Stage-5 portrait. |
| `redranger_transparent.png alias` | OS alias of the master (duplicate, ignored). |
| `red_ranger_mmpr_portrait.png` | **Select-screen portrait** — helmeted MMPR bust cropped from the master (790,1325→935,1500) + upscaled 4× (Stage 5). Wired via `characters.js` `portrait`. |

## Movement / state (Stage 1)
| Source upload | Resliced sheet | animationData key(s) | Frames·cell |
|---|---|---|---|
| `redranger_idle.png` | `red_ranger_mmpr_idle_uniform.png` | `idle` | 3·42×74 |
| `redranger_walk.png` | `red_ranger_mmpr_walk_uniform.png` | `walk` | 6·43×74 |
| `redranger_running.png` | `red_ranger_mmpr_run_uniform.png` | `run`, `dash` | 6·58×70 |
| `redranger_jump.png` | `red_ranger_mmpr_jump_uniform.png` | `jump`, `fall` | 7·50×81 |
| `redranger_hit.png` | `red_ranger_mmpr_hurt_uniform.png` | `hurt`, `knockdown` | 3·42×73 |

## Intro pool — 5 random-cycle intros (Stage 1)
`introSequencePool` (NEW `game.js` support): 4 UNMORPHED sequences that each append the shared `morphFlash` (civilian → morphed), + 1 already-morphed STANDALONE (no flash).
| Source upload | Resliced sheet | animationData key | Role |
|---|---|---|---|
| `redranger_intro_1_part_1.png` | `red_ranger_mmpr_intro_runin_uniform.png` | `introRunIn` | unmorphed run-in → morph |
| `redranger_intro_2_part_1.png` | `red_ranger_mmpr_intro_teleport_uniform.png` | `introTeleport` | unmorphed idle/teleport-in → morph |
| `redranger_intro_3_part_1.png` | `red_ranger_mmpr_intro_morpher_uniform.png` | `introMorpher` | "It's Morphin Time" morpher raise → morph |
| `redranger_intro_4_part_1.png` | `red_ranger_mmpr_intro_knuckles_uniform.png` | `introKnuckles` | cracking knuckles → morph |
| `redranger_intro_final_part_for_all_intros.png` | `red_ranger_mmpr_morph_flash_uniform.png` | `morphFlash` | SHARED morph flash → morphed stance (appended to the 4 above) |
| `redranger_intro_1.png` | `red_ranger_mmpr_intro_morphed_uniform.png` | `introMorphed` | already-morphed STANDALONE intro (no flash) |

## Normals — 5 slots (Stage 2)
| Source upload | Resliced sheet | animationData key | Role |
|---|---|---|---|
| `redranger_foward_punch.png` | `red_ranger_mmpr_foward_punch_uniform.png` | `light`, `rrRekka1` | jab (light + rekka opener) |
| `redranger_punch_2.png` | `red_ranger_mmpr_punch_2_uniform.png` | `heavy`, `rrRekka2` | big cross (heavy + rekka stage 2) |
| `redranger_up_attack.png` | `red_ranger_mmpr_up_attack_uniform.png` | `up` | rising kick launcher |
| `redranger_jump_kick.png` | `red_ranger_mmpr_jump_kick_uniform.png` | `air` | flying kick (air normal) |
| `redranger_180_kick.png` | `red_ranger_mmpr_180_kick_uniform.png` | `down_air` | aerial 180° somersault (down-air) |

## Command layer (Stage 2–3)
| Source upload | Resliced sheet | animationData key | Role |
|---|---|---|---|
| `redranger_super_360_kick.png` | `red_ranger_mmpr_super_360_kick_uniform.png` | `rrRekka3` | super 360° spin-kick — rekka LAUNCHER finisher |
| `redranger_down_air_attack.png` | `red_ranger_mmpr_down_air_attack_uniform.png` | `rrDiveKick` | airborne-Heavy dive-kick poke |
| `redranger_trhow_1.png` | `red_ranger_mmpr_trhow_1_uniform.png` | `rrGrab`, `grab` | grab reach→lift windup (Special grab + universal O-grab pose) |
| `redranger_trhow_2.png` | `red_ranger_mmpr_trhow_2_uniform.png` | `rrThrow` | throw release follow-through |

## Ultimate (Stage 4)
| Source upload | Resliced sheet | animationData key | Role |
|---|---|---|---|
| `redranger_sword_up_attack.png` | `red_ranger_mmpr_ultimate_uniform.png` | `ultimate` | **Power Sword: Overhead Strike** — freeze-cinematic leaping overhead slash (tallest/signature asset) |

## Stage-0 resolved questions
1. **`180_kick` vs `super_360_kick`** → **two SEPARATE moves** (aerial somersault vs grounded spin), not a Rengoku normal/super pair. `180_kick` = down_air; `super_360_kick` = rekka finisher. The 7-candidate → 5-slot overflow resolved: `down_air_attack` → airborne-Heavy dive poke.
2. **`sword_up_attack` = Ultimate** → CONFIRMED (tallest asset 374×140, signature Power Sword).
3. **Frame padding** → used the project's proven `reslice_strip.mjs` bottom-aligned uniform cells + `anchorY:0` + a single `spriteScale 1.54` (idle content 72px → ~111px on-screen) instead of a literal global 96×140 canvas — the mechanism the engine actually uses to prevent inter-animation bob (`sprite.js:731` foot-anchor).

## Code files touched
- `characters.js` — the `redRangerMmpr` roster entry (stats, animationData, `introSequencePool`, ultimate descriptor) + export.
- `game.js` — `introSequencePool` support (`initIntroVariant`), command-combat dispatch, cinematic wiring (6 sites), `charDef`/`powerSwordCine` harness accessors.
- `abilities.js` — `RED_RANGER_MMPR_CMD`/`POKE` tables + `updateRedRangerMmprCommandCombat`, the grab (`fireRedRangerMmprGrab`/`executeRedRangerMmprSpecial`), the ultimate (`executeRedRangerMmprUltimate`/`applyRedRangerPowerSwordDamage`), and the `triggerSpecial`/`triggerUltimate` switch cases.
- `redRangerPowerSwordCinematic.js` — NEW freeze-cinematic module (modeled on the wired `gokuBlackSwordCinematic.js`).
- `sprite.js` — `MOVE_TO_ACTION` identity maps for the command/grab cast keys.
- `spritesheets.js` — `SPRITE_MANIFEST.red_ranger_mmpr` (idle-strip readiness gate).
- `skins.js` — default-skin entry (carries `spriteScale`).
- `credits.js` — `SOURCED_ART` attribution.
- `comboStandard.js` — `REKKA` registry entry + `EXPECTED_COUNTS` bump.
- `BALANCE_AUDIT.md` — the balance narrative entry.
- `package.json` + `harness/red_ranger_mmpr*.mjs` — canonical + per-stage tests.

## Gaps (deferred, expected)
- No dedicated **guard** art in the batch (falls back to idle).
- No **voice** pack (audio-only later pass; other rangers got voice post-build).
- No **creative recolor skins** yet (default-only; cosmetic pass later, as the other rangers received).
