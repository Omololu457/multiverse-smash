# Kiba Inuzuka (+ Akamaru, merged) — Asset Map

rosterKey `kiba` · universe `naruto` · close-range beast-fusion **rushdown** (schema-exception kit).
Slicing tool: `tools/reslice_kiba.py` → `kiba_*_uniform.png` (alpha-gutter detect → feet-aligned uniform
cells, `anchorY: 0`). Scale 2.5 (source ≈42px idle → ~100px on-screen, roster median).

## Scope rules (Stage 0 confirmed)
- **Akamaru is NOT a separate entity.** His standalone art (`akamaru_*.png`) is unfinished GRAYSCALE
  line-art → **banned from gameplay.** Akamaru appears ONLY inside Kiba's merged fusion technique art.
- `akamaru_winning_pose.png` = uncolored green line-art + burned-in "WINNING POSE" text → **UNUSABLE.**
  Win pose instead derives from a clean colored Kiba standing pose (`kiba_row_71.png`).

## Stage 0 investigation resolutions
1. **Four Legs "BLUE BLOCK"** — a solid blue background wedge sitting behind the *discardable tail frames*
   of `..._3/_4/_5/_6` (uncolored white-wolf frames + a technique-diagram panel in `_6`). NOT corruption,
   NOT a color-key bleed into Kiba's sprite. Fix = slice only the clean colored Kiba frames, drop the
   blue-block frames via keep-range. Four Legs is buildable (Stage 4).
2. **`kiba_special_move_5_*`** — CONFIRMED joke/troll content: `5_1` burned-in "URINA/XIXI/PISS", `5_2` is
   orange **Naruto** sprites (wrong character) + "Bomba Fumaça", `5_3–5_5` mixed uncolored line-art.
   **EXCLUDED entirely** — never sliced, never wired.
3. **`kiba_stance.png` idle** — single clean colored frame, no loop frames. Held **static** (no engine
   breathing-idle system exists; consistent with the rest of the roster's single-frame idles).

## STAGE 1 — movement / state (DONE, `test:kiba-stage1` 22/0)
| action | source | frames | notes |
|---|---|---|---|
| idle | `kiba_stance.png` | 1 | held static |
| walk/run | `kiba_run.png` | 5 | run = walk at faster cadence |
| dash | `kiba_dash.png` | 2 | + speed-line FX |
| jump/fall | `kiba_jump_guard_guard_air.png` runs 0–2 | 3 | bundle split |
| guard | `kiba_jump_guard_guard_air.png` run 3 | 1 | bundle split |
| guard_air | `kiba_jump_guard_guard_air.png` run 4 | 1 | bundle split |
| charge | `kiba_chakra_charge.png` | 1 | held pose feeding specials |
| hurt | `kiba_taking_damage_taking_special_damage.png` runs 0–1 | 2 | bundle split (runs 2–4 → `kiba_hurt_special_uniform` reserved) |
| hurtHeavy (reserved) | `kiba_taking_heavy_damage_1_2_3.png` | 5 | sliced, not yet wired |
| knockdown | `kiba_knocked_down.png` | 6 | incl. ground bounce |
| win | `kiba_row_71.png` run 1 | 1 | colored pose (real win art unusable) |
| portrait | `kiba_stance.png` bust | — | `kiba_portrait.png` |

Registration: `characters.js` (charDef + roster export), `spritesheets.js` (idle gate),
`skins.js` (default entry), `credits.js` (project-adapted attribution).

Stats: HP 1180 / EN 180 (chakra) / atk 90 / def 82 / spd 92 / dashSpeed 17 — aggressive rushdown.

## Later stages (planned)
- **S2 normals**: light chain (`attack_combo_1/2`), heavy (`strong_attack`), up launcher (`strong_attack_up`),
  air chain (`attack_combo_air_1/2`), down_air (`strong_attack_down`) + Fwd Strong (`strong_attack_forward`)
  + Aerial Strong (`strong_attack_air`).
- **S3**: Weak Gatsuga (`special_move_1_weak_1/2`) + Strong Gatsuga (`special_move_1_strong_gatsuga_1/2`) +
  Frog Mode (`frog_mode_*`) — PENDING user confirm (pattern-mismatch flag).
- **S4**: Four Legs (clean frames of `four_legs_technique_1..5`) + Two-Headed Wolf (`two_headed_beast_mode_3/4/5`,
  `_1/_2` genuinely absent — do not invent).
- **S5 ULT**: Three-Headed Wolf (`three_headed_beast_mode_1..4`) — freeze/camera-focus cinematic.

## Deferred / needs review
`special_move_5_*` (excluded), `kiba_row_70` (mixed), `kiba_and_akamaru_row_67/68` (FX candidates),
`kiba_and_akamaru_row_72` (lineup/UI art), `kiba_row_65` (turn frames — evasive-special candidate).
