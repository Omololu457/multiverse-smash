# HISOKA MORROW — Asset Map

Hunter x Hunter, `rosterKey: "hisoka"`, 4th HxH character (after Netero, Killua, Gon),
21st sprite character overall. Universe `hunter_x_hunter` already exists — no new setup.

**Archetype:** unpredictable flexible technician — extended-reach **Bungee Gum** whip (melee),
**Texture Surprise** cards (ranged, two variants), a Bungee-Gum/card-mastery **transform ultimate**
(reuses the giant-form freeze-cinematic architecture). Balanced-to-fast, moderate damage.

**Base stats** (see `characters.js` for the full rationale): HP 1080 · Nen 170 · atk 88 · def 82 ·
speed 91 · spriteScale 2.0 (idle content ~58px × 2.0 ≈ 116px, top of the adult band). No outliers.

## Tooling notes
- Frame counts MEASURED via `tools/slice_probe.mjs` (alpha-gutter scan, overlays in `harness/shots/SLICE_*`).
- Non-uniform strips RE-SLICED to feet-aligned uniform cells via `tools/reslice_strip.mjs` → `*_uniform.png`.
  **The raw `hisoka_*.png` files are UNTRACKED (not in git)** — reslicing always writes a NEW `_uniform`
  copy so the originals survive as the archive (never reslice a raw file in place).
- Intro cropped with `tools/crop_region.mjs`; jump stitched with `tools/stitch_strips.mjs`.

---

## Raw source files (28)

### Movement / state — WIRED Stage 1
| Raw file | dims | frames | → uniform sheet | animationData |
|---|---|---|---|---|
| `hisoka_idle.png` | 126×59 | 4 | `hisoka_idle_uniform.png` | idle 4f 29×60 |
| `hisoka_run.png` | 196×65 | 6 | `hisoka_run_uniform.png` | walk/run 6f 31×60 |
| `hisoka_dash.png` | 117×70 | 3 (+streak dropped) | `hisoka_dash_uniform.png` | dash 3f 22×63 |
| `hisoka_jump_part_1.png` | 79×73 | 3 (launch) | stitched → | — |
| `hisoka_jump_part_2.png` | 330×119 | 9 (arc+land) | `hisoka_jump_uniform.png` (12 cells) | jump 9f 36×63 (cells 0–8) · fall sourceX 360 (cell 10) |
| `hisoka_block.png` | 329×74 | 6 (0 stance, 1 card, 2–3 **card-cape**, 4–5 stance) | `hisoka_guard_uniform.png` (runs 4–5) | guard 2f 32×60 |
| `hisoka_hit.png` | 145×67 | 4 | `hisoka_hit_uniform.png` | hurt 4f 34×54 |
| `hisoka_intro.png` | 1052×117 | 11 runs: 0–2 = **WIN/LOSE poses (excluded)**, 3–10 = heart bloom | `hisoka_intro_uniform.png` (crop x=161 w=855 → 8 cells) | intro 8f 128×114 |

**Intro identity:** Hisoka's signature pink-heart "bloodlust bloom" — hearts swell around him then
fade to reveal him standing. The `hisoka_intro.png` sheet ALSO carries baked-in **WIN** and **LOSE**
labeled standing poses in its left column (runs 0–2) — these are deferred win/lose art, cropped OUT
of the intro (see Deferred).

### Melee normals — Stage 2 candidates
| Raw file | dims | frames | intended role |
|---|---|---|---|
| `hisoka_foward_attack.png` | 198×62 | 4 | forward punch (light) |
| `hisoka_foward_kick.png` | 193×65 | 4 | kick (heavy) |
| `hisoka_up_attack.png` | 173×57 | 5 | up-attack / launcher |
| `hisoka_down_attack.png` | 204×69 | 5 | crouch/low attack (sweep arc) |
| `hisoka_down_air_attack.png` | 168×73 | 5 | air attack |
| `hisoka_smash_landing_attack.png` | 430×71 | ~6 | down-air / dive (ground burst) |
| `hisoka_foward_card_slash.png` | 295×59 | 4 | command-normal candidate (cyan card slash arc) |

### Bungee Gum (whip) — Stage 3
| Raw file | dims | frames | note |
|---|---|---|---|
| `hisoka_power_up_whip_attack.png` | 363×88 | 4 | **long elastic pink whip, extended reach** — the definitive Bungee Gum art. (Labeled "power_up" on the sheet but reads as a clean base whip; the transformed form reuses/extends it.) |

### Texture Surprise (cards) — Stage 4
| Raw file | dims | frames | note |
|---|---|---|---|
| `hisoka_card_throw.png` | 202×68 | 4 | **single precise throw** (windup → throw → card flies) |
| `hisoka_double_card_throw.ppng.png` | 285×61 | 6 | **rapid multi-card spread** (spinning fan of cards) |
| `hisoka_up_card_throw.png` | 222×68 | 5 | upward/anti-air card throw (reserve) |
| `hisoka_down_air_attack_card.png` | 194×64 | 4 | aerial down card throw (reserve) |
| `hisoka_card_throw_projectile.png` | 22×8 | 1 | **the card projectile sprite** (spawned FX) |

### Ultimate — transformed "power_up" form — Stage 5
| Raw file | dims | frames | note |
|---|---|---|---|
| `hisoka_transformation.png` | 482×66 | ~9 | **transform sequence** (card-cape aura swirl → golden aura power-up) — cinematic activation |
| `hisoka_power_up_idle.png` | 150×91 | 4 | transformed idle (golden aura) |
| `hisoka_power_up_combo.png` | 2098×84 | ~24 | transformed combo string (whip lashes + card spins) — form attacks |
| `hisoka_power_up_up_attack.png` | 244×69 | 3 | transformed up-attack (whip) |
| `hisoka_power_up_whip_attack.png` | 363×88 | 4 | (shared w/ Bungee Gum; extended reach) |
| `hisoka_charge.png` | 476×86 | ~7 | yellow-aura energy charge (hold-to-charge) |

### Master atlases / portrait source
| Raw file | dims | note |
|---|---|---|
| `hisoka_jus_by_xxniiroxx_d79rpo8.png` | 2344×2432 | JUS-style master reference atlas (all poses) |
| `hisoka_transparent.png` | 2344×2432 | transparent-bg version of the master atlas — **portrait source (Stage 6)** |

---

## Stage ledger
- **Stage 1 (DONE):** 3-file gate (characters.js + skins.js spriteScale + spritesheets.js manifest);
  idle/walk/run/dash/jump/fall/guard/hurt/intro. `harness/hisoka_stage1.mjs` 15/15.
- **Stage 2 (DONE):** 5 normals (light=foward_attack, heavy=foward_kick, up=up_attack, air=down_air_attack,
  down_air=smash_landing dive) + "Card Flourish" Down+Heavy Toji-Rekka chain (rekka1=down_attack crouch strike
  → rekka2=foward_card_slash extended-reach launcher, cancel-on-hit). `harness/hisoka_stage2.mjs` 18/18.
- **Stage 3 (DONE):** Bungee Gum — neutral-Special extended-reach elastic-whip MELEE lash (not a grab).
  `hisoka_bungee_uniform.png` (from `hisoka_power_up_whip_attack`, 4f 103×72). rangeX 172 = 2× the normals'
  default 85 → connects at a gap where light whiffs. 72 dmg, 30 Nen. `harness/hisoka_stage3.mjs` 10/10.
- **Stage 4 (DONE):** Texture Surprise — TWO SEPARATE DIRECTIONAL Special inputs (NOT tap/hold, matching
  Killua/Gon dir-branch): Down+Special = single precise throw (`hisoka_card_single_uniform`, 1 card, 48 dmg,
  18 Nen); Fwd+Special = rapid multi-card spread (`hisoka_card_rapid_uniform`, 5 fanned cards vy −6..+6, 16
  dmg each, 30 Nen, noHitstop). Projectile art = `hisoka_card_projectile_uniform` (2f spin). Each card is an
  independent `hisoka_card` projectile. Neutral stays Bungee Gum. `harness/hisoka_stage4.mjs` 15/15.
- **Stage 5 (DONE):** Bloodlust Overdrive ultimate — full alternate-form transformation reusing the
  giant-cinematic buff-mode architecture (mirrors Killua Godspeed + Gon Adult Form). NEW
  `hisokaOverdriveCinematic.js` (freeze + camera push-in + gold/magenta burst, plays `hisoka_transform_uniform`
  card-cape→golden-aura sequence). `_skinAnim` BODY-SWAP to the golden power-up form (idle=`hisoka_powerup_idle_uniform`,
  up=`hisoka_powerup_up_uniform`; other actions spread from base). +30% dmg / +25% atk-speed; Bungee Gum reach
  172→230 + dmg 72→92. Near-max Nen (140/170) gate + 0.30/frame drain → auto-revert. `harness/hisoka_stage5.mjs` 19/19.
  No regressions (Killua 24/24, Gon 37/37).
- **Stage 6 (DONE):** portrait (`hisoka_portrait.png`, clean idle pose cropped + 3× nearest-upscaled to
  81×171) + canonical `harness/hisoka.test.mjs` (**38/38**, all 17 exercised actions resolve to hisoka
  sheets) + balance pass (added to BALANCE_AUDIT.md). No regressions across Killua/Gon/Flash/Netero.

## Sprite-utilization audit (28 source files)
**WIRED (22 files):** idle, run(walk/run), dash, jump_part_1+2(jump/fall), block(guard, stance frames),
hit(hurt), intro(heart-bloom), foward_attack(light), foward_kick(heavy), up_attack(up), down_air_attack(air),
smash_landing_attack(down_air), down_attack(rekka1), foward_card_slash(rekka2), power_up_whip_attack(bungeeGum),
card_throw(single), double_card_throw(rapid), card_throw_projectile(card FX), transformation(ult cinematic),
power_up_idle(Overdrive idle), power_up_up_attack(Overdrive up-attack), charge(dedicated hold-to-charge
aura → animationData.charge, `hisoka_charge_uniform` runs 0–5). idle also → portrait.

**UNUSED (5 files) — deferred, no gameplay slot yet:**
- `hisoka_power_up_combo.png` — big transformed combo string; the Overdrive form only overrides idle/up
  (+ the base whip/cards carry over). A future form-specific rekka could slice this ~24-frame sheet.
- `hisoka_up_card_throw.png` — reserved anti-air card throw.
- `hisoka_down_air_attack_card.png` — reserved aerial card throw.
- `hisoka_jus_by_xxniiroxx_d79rpo8.png` / `hisoka_transparent.png` — the two 2344² master atlases
  (reference only; the portrait was cropped from the cleaner idle strip instead).

**PARTIALLY used:**
- `hisoka_block.png` — only the plain stance (runs 4–5) drives guard; the **billowing card-cape frames**
  (runs 2–3) are unused → a future parry / guard-flash.
- `hisoka_intro.png` — the heart-bloom is the intro; the **WIN/LOSE labeled poses** (left column) are
  cropped out and NOT yet wired as win/lose animations.

## Deferred (absent from the batch or not wired)
- **Win / Lose** animations (art exists in the intro sheet's label column, not wired).
- **Taunt, getup/knockdown, voice** — absent from the batch (consistent with several roster chars).
