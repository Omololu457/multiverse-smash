# MAKI ZENIN — Asset Map

**rosterKey:** `maki`  ·  **universe:** `jujutsu_kaisen`  ·  **canon height:** 170 cm (JJK official)

> This file was created during the Maki build (2026-08-02). The build brief referenced a
> `MAKI_ASSET_MAP.md` as authoritative, but no such file existed on disk — same pattern as the
> Gold Samurai / Killua builds. The listing below is the **actual verified on-disk inventory**,
> not a pre-existing spec. Filenames preserve the uploaded typos verbatim: `foward`, `knunchucks`,
> `charge.pmg`.

## Stage 0 finding — alt-form movement art DOES exist

The brief warned an earlier map "reported NO run/jump/crouch/transformation-cinematic art" for the
Shibuya-Arc alt form. **Direct disk check contradicts that**: the core alt-form movement + intro art
is present (see the `maki_ultimate_*` group). Genuinely ABSENT for the alt-form: a dedicated
`block`, `hit`/`hurt`, plain `dash`, and `crouch` — those fall back to base-form frames (confirmed
with the user before Stage 1).

## Base form (Jujutsu-High uniform — green hair, navy uniform, red-tassel naginata)

| State | Source PNG | Uniform copy (resliced) | Notes |
|---|---|---|---|
| idle | `maki_new_idle.png` 240×93 | `maki_new_idle_uniform.png` — 4f · 50×71 | clean breathing loop (see note) |
| run / walk | `maki_run.png` 611×60 | `maki_run_uniform.png` — 8f · 71×60 | walk = same sheet, slower |
| dash | `maki_dash.png` 76×59 | `maki_dash_uniform.png` — 1f · 65×54 | single lunge pose |
| jump | `maki_jump.png` 309×85 | `maki_jump_uniform.png` — 5f · 81×73 | fall = last frame (sourceX 324) |
| guard/block | `maki_block.png` 205×92 | `maki_block_uniform.png` — 4f · 53×89 | naginata raised vertical |
| hurt / knockdown | `maki_hit.png` 161×66 | `maki_hit_uniform.png` — 2f · 83×56 | frame 0 = hurt |
| stand-hurt (alt) | `maki_stand_hurt.png` 250×93 | — | reserve (2 wide islands) |
| intro | `maki_intro_1/2/3.png` | `maki_intro{1,2,3}_uniform.png` (5f/5f/6f) | RANDOM-CYCLE pool `introPool:["intro1","intro2","intro3"]` — each SELF-CONTAINED (not chained): intro1 salute · intro2 naginata point · intro3 twirl→cursed-burst→planted |

> **IDLE FIX (2026-08-02):** the original `maki_idle.png` (453×79) had an anomalous frame 3 = **96px
> wide** (≈2× the other ~46-48px frames: widths `[47,48,96,46,47,46,48]`, then a 32px gutter) — two idle
> frames touching with NO alpha gap, so the gutter scan under-counted them as one glitched frame = the
> reported "showing two of her" bug. Replaced by `maki_new_idle.png` (240×93) → a clean **4 frames**
> (`[46,47,46,48]`, uniform) → resliced to `maki_new_idle_uniform.png` (4f · 50×71). The old idle is no
> longer referenced in any wiring (characters.js idle + spritesheets.js manifest both repointed).

**Base attack art (Stage 2/3 — not yet wired):** `maki_attack_1`, `maki_foward_attack`,
`maki_foward_kick(_2/_3)`, `maki_up_attack`, `maki_staff_attack(_2)`, `maki_staff_attack_combo`,
`maki_staff_combo_2`, `maki_staff_up_attack_1/2`, `maki_staff_air_attack_1/2`,
`maki_combo_3_knunchucks` (nunchaku flavor), `maki_kunai_throw` + `maki_kunai_throw_projectile`
(45×46), `maki_player_throw`, `maki_charge.pmg.png` (charge-based special candidate → "Power Charge").

## Alt form — Shibuya-Arc transformation (`maki_ultimate_*`)

| State | PNG | Notes |
|---|---|---|
| transformation cinematic | `maki_ultimate_intro.png` 278×62 | drives the freeze-cinematic (Stage 4) |
| idle | `maki_ultimate_idle.png` 116×66 | |
| run | `maki_ultimate_run.png` 336×58 | |
| jump | `maki_ultimate_jump.png` 181×71 | |
| combo | `maki_ultimate_combo.png` 415×74 | |
| fwd attacks | `maki_ultimate_foward_attack(_2/_4).png` | note: no `_3` |
| up attack | `maki_ultimate_up_attack.png` 270×91 | |
| down attack | `maki_ultimate_down_attack.png` 164×79 | |
| dash attack | `maki_ultimate_dash_attack(_2).png` | |
| charge attack | `maki_ultimate_charge_attack.png` 168×63 | |

**Absent for alt-form** (→ base-form fallback per user): block, hit/hurt, plain dash, crouch.

## Misc

- `maki_transparent.png` / `maki_zenin_jus_sprite_sheet___..._dg6wq17.png` (2072×2672) — master sheet
  (SoulFireSprites). Source for a real portrait crop in Stage 5.
- `Shibuya incident-clean.png` (2816×1536) / `shibuya_incident_bg.png` (1408×768) — stage bg (not
  part of the character; separate stage art).

## Design (confirmed with user)

- **No resource meter of any kind.** `traits.energyType:"none"` + `traits.hideResourceMeter:true`
  → the entire HUD energy panel is suppressed (HP-only), distinct from every other char (Toji/Shinobu
  still draw an empty flavored bar).
- **Ultimate is HP-threshold gated** (unlocks at ≤25% HP → player-triggered Shibuya-Arc transform),
  NOT meter gated. Stage 4.
- **Sprites are reslice_strip'd `_uniform` copies** (originals untracked → copied before reslicing so
  they stay recoverable). anchorY:0 (feet at cell bottom). spriteScale 1.63 (idle body 65px × 1.63 ≈
  106px ≈ 0.623×170cm, per HEIGHT_REFERENCE.md).

## Registration touch-points (the real gate — 4, not 3)

1. `characters.js` — `maki` object + added to the `characters` export.
2. `spritesheets.js` — `maki` manifest entry (gates `spritesReady()`).
3. `skins.js` — `maki` Default skin. **Required**: without it, `getSkins()` returns a synthesized
   fallback carrying `spriteScale:1`, which `applySkin` stamps onto the fighter and overrides
   `maki.spriteScale`. (Discovered during Stage 1 — the live scale silently reset to 1.)
4. `abilities.js` — special/ultimate dispatch (Stages 3–4, not yet added).
