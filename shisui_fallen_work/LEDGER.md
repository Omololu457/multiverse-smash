# Shisui (Fallen) — "The Curse-Breaker" — BUILD LEDGER

A NEW additive, selectable fighter (`rosterKey: shisui_fallen`): an evil multiversal Shisui Uchiha who hunts the
very clan he once died to protect. Fastest fighter in the Naruto band, lowest HP (glass cannon). Built across
4 phases, each a single surgical commit on `main`, with `combat.js` UNTOUCHED and every other character
byte-identical throughout. Deterministic / LAN-safe (no RNG, no wall-clock).

## Sources (art, all credited in credits.js → SOURCED_ART.shisui_fallen)
- **H** = `shisui_uchiha_nzc_sheet_by_haickal23_des5zc7.png` — body + normals, re-palletted to the FALLEN look
  (charcoal→crimson ramp, red Mangekyō kept). Same base sheet as `shisui_blade`, kept apart by distinct
  `shisui_fallen_*` filenames.
- **P** = `perfect_susanoo_kakashi_by_mikeel8888_d8nim62.png` — the Emerald Susanoo giant (re-palletted green).
- Kotoamatsukami genjutsu-world art is REUSED read-only from `shisui_puppeteer_koto_*` (same jutsu).

## Stats
hp 960 · chakra 120 · attack 92 · defense 80 · speed 100 (fastest) · spriteScale 1.3 · not brutality-eligible.

## Phases (all DONE + PUSHED to origin/main)
| Phase | Commit | Contents |
|---|---|---|
| P1 | `1fe96d71` | Body (FALLEN palette) + 15 normals + kunai + **Body Flicker** passive (Flicker-Step dash via SPEED_TIER_TELEPORT_KEYS; 3 regenerating charges + a ~0.5s afterimage that ABSORBS one hit) + full plumbing (characters / spritesheets / skins / credits / comboStandard / kits). |
| fix | `e71c5e01` | Re-slice fix — AIR was legs-only (gap-crop), RUN had a stray "second figure" (even-split + too-tall band). Rewrote the slicer to auto-detect the frame grid; matched `animationData` dims to the new cells. |
| P2 | `8cdc5f23` | Directional specials — N=Kunai Barrage · F=Body-Flicker Strike · B=Afterimage Feint · U=Sharingan Glare · D=Shadow-Clone Pursuit (new `shisuiFallenClone` drawKind). Ultimate **Shunshin: Thousand Shadows** (5 flicker-strikes + final thrust). **Clan Hunter** +10% vs Uchiha folded into every hit. |
| P3 | `a7a1fdc8` | **Emerald Susanoo** (Down+Ultimate) — a giant emerald avatar (Kakashi-Perfect-Susanoo template, re-palletted). Shell HP ABSORBS incoming damage off Shisui; ~9s or until break. rawControls kit: Light=punch · Heavy=sword · Fwd+Special=flying lunge · Special=Yasaka Magatama volley · Ultimate=Totsuka Seal. |
| P4 | _(this commit)_ | **Kotoamatsukami** (Up+Ultimate) — crimson genjutsu-world mind-control: the victim's L/R are MIRRORED and their Specials & Ultimate LOCKED (~2.7s) + a chip. **EASTER EGG "The Curse-Breaker":** cast on a fellow Uchiha → the control runs far longer + a crimson curse-break eye blooms. Personality / `arcadeRivalLines`. |

## Controls (full kit)
- **Move/Jump/Crouch:** A/D · W · S  (dash = an instant Flicker Step leaving a hit-absorbing afterimage)
- **Normals:** Light J · Heavy K · Up-Attack I · Air (jump+J) · Grab
- **Specials (L):** neutral = Kunai Barrage · Forward = Body-Flicker Strike · Back = Afterimage Feint ·
  Up = Sharingan Glare (stun) · Down = Shadow-Clone Pursuit
- **Ultimate (U), full meter:** neutral = Shunshin: Thousand Shadows · Down = Emerald Susanoo ·
  Up = Kotoamatsukami
- Inside the **Emerald Susanoo:** Light=punch · Heavy=sword · Forward+Special=lunge · Special=Yasaka Magatama ·
  Ultimate=Totsuka Seal

## Engine touch-points (all additive, mine-only)
- `characters.js` — the fighter def + `arcadeRivalLines`.
- `abilities.js` — `updateShisuiFallenFlicker`, the 5 specials + `executeShisuiFallenSpecial`,
  `executeShisuiFallenUltimate` (Thousand Shadows), `enterShisuiFallenSusano` + `updateShisuiFallenSusano`,
  `shisuiFallenKotoamatsukami`; 2 dispatch switch cases (`triggerSpecial` / `triggerUltimate`).
- `game.js` — SPEED_TIER_TELEPORT_KEYS entry, the per-frame Flicker + Susanoo driver calls, the ult-variant
  stamp, `drawShisuiFallenFlicker` / `drawShisuiFallenSusano`, the Kotoamatsukami overlay crimson tint +
  curse-break eye, snapshot telemetry, and the `shisuiFallenUlt` / `shisuiFallenSusano` test hooks.
- `ui.js` — the `shisuiFallenClone` projectile renderer.
- `kits.js` / `skins.js` / `spritesheets.js` / `comboStandard.js` / `credits.js` — registration + Move List.
- `combat.js` — **NEVER touched.**

## Verification (all green)
- Per-phase live harnesses: `shisui_fallen_live.mjs` (P1), `_phase2_live.mjs`, `_phase3_live.mjs`,
  `_phase4_live.mjs` — all pass, 0 new page errors.
- `determinism.test.mjs` 9/0; `combo_standard_audit.mjs` 225/9 (the 9 are pre-existing
  goku_rose/gogeta/kakashi_anbu/ghostface_exe, unrelated to this build). `shisui_fallen` classified as a zoner.
