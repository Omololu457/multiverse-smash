# Hiruzen Sarutobi — Asset Map

rosterKey **`hiruzen`** · universe **naruto** · The Third Hokage ("The Professor").
Archetype: **veteran / technique-master** — balanced/defensive, high defense + real punishes, NOT rushdown.
Art: fan sprite sheet by **juanshoalmao (DeviantArt)** (`hiruzen_sarutobi_nzc_by_juanshoalmao_dcgqnsk-fullview.jpg`).

## MANDATORY PRE-PROCESS — watermark removal (DONE)
`dash.png`, `jump.png`, `back_jump.png` shipped with a DeviantArt watermark (pale blue-grey semi-transparent
polygon + username text). Removed by erasing `partial-alpha ∧ pale ∧ cool(b≥r)` pixels (the character's own
grey highlights are fully opaque → protected). Raw originals preserved in **`_hiruzen_raw_backup/`**.
Verified gone under real in-game rendering (Stage 1 dash/jump/back_jump shots).

## Reslice — `tools/reslice_hiruzen.py`
Alpha-gutter detect → per-frame content bbox → uniform, centered-X, BOTTOM-aligned cells. Adds `band=` (2-row
intro sheet) + `xrects=` (hand-authored x-ranges) for the merged frames the audit flagged.

| source (hiruzen_sarutobi_*) | uniform out | frames | cell | notes |
|---|---|---|---|---|
| idle.png | hiruzen_idle_uniform.png | 4 | 63×42 | breathing loop |
| run.png | hiruzen_run_uniform.png | 6 | 67×42 | run cycle (also walk, slower) |
| dash.png ✧cleaned | hiruzen_dash_uniform.png | 3 | 64×57 | **frame 2 = shunshin-ghost (kept)**; staff crosses gutter → merged xrect |
| jump.png ✧cleaned | hiruzen_jump_uniform.png | 4 | 59×82 | rope-tail runs folded into frame 4 |
| back_jump.png ✧cleaned | hiruzen_back_jump_uniform.png | 3 | 67×61 | frames 2&3 merged by rope-crossing (valley x113) → hand split; deduped (this file only) |
| block.png | hiruzen_block_uniform.png | 1 | 54×44 | static held low crouch-guard (1 of 2 real frames) |
| hit.png | hiruzen_hit_uniform.png | 2 | 55×46 | hit-recoil |
| intro.png (row 1, band 8-61) | hiruzen_intro_uniform.png | 5 | 63×56 | Hokage robe+hat → robe shed → combat stance |
| intro.png (row 2, band 90-124) | hiruzen_introrobe_uniform.png | 4 | 46×36 | discarded hat/robe tumbling to ground (composited prop) |
| punches.png | hiruzen_punches_uniform.png | 7 | 60×43 | punch COMBO string — light = flurry (0-6), heavy = wide finisher (5-6, sourceX 300) |
| roll.png (**SPIN**) | hiruzen_spin_uniform.png | 4 | 46×47 | evasive spinning dodge (never "roll" in code) |
| madara2_wood_spike_proj_uniform.png → recolor | hiruzen_earth_wall_uniform.png | 11 | 116×112 | Earth Wall FX — stone-recolored (tools/gen_hiruzen_earth_wall.py) |
| (shared) madara2_fireball_proj_uniform.png | — | 4 | 236×114 | Fire Release fireball FX (reused, not copied) |

## Wiring (Stage 1)
- **spritesheets.js** — `hiruzen: { actions: { idle: "./hiruzen_idle_uniform.png" } }` (spritesReady gate).
- **characters.js** — full record + registered in the `characters` object (after `jason`). Stats **HP1180 / EN140 /
  atk88 / def90 / spd84** ("Chakra"). spriteScale **2.8**. animationData: idle/walk/run/dash/jump/fall/**doubleJump**
  (back_jump art — no backward-jump resolver, so wired to the generic 2nd-jump strip)/hurt/**guard**(block)/intro/introRobe.
- **credits.js** — attribution to juanshoalmao; notes the watermark removal.
- **game.js** — `_drawHiruzenIntroRobe()` composites the falling-robe prop during the intro (Vegeta `_drawIntroAura`
  precedent); only drops after the shed beat (intro pose frame ≥ 2). Called from the render fold.
- **intro** — `introPool: ["intro"]` (single wardrobe-change sequence → idle; robe prop composites on top).

## SKINS — Default + 13 (tools/gen_hiruzen_creative.py, 156 PNGs)
His combat body is near-black/grey, so each skin is a VALUE-PRESERVING recolor of the garb (keeps the warm-
orange face). **Skins 1-4 = the color_palletts.png swatch palettes REVERSE-ENGINEERED** (the swatches are
single-pose refs only → the palette shift is reapplied to the FULL animation set, not wired as-is). 5-13 = new
palettes. `_uniform__<tag>.png` per action (11 sheets) + `hiruzen_portrait__<tag>.png`; skins.js retags via
`recolorSkinAnim`/`recolorPortrait`. **Eternal Vigil Void** (`skinId hiruzenEternalVoid`) = full-black silhouette
+ NEW game.js `drawHiruzenVoidAuraOverlay` (Alien-X amber-gold motes + glow pools + amber eyes; Jason-void
precedent). Two value-shifted specials: Third Hokage's Mantle LIFTS value (dark garb → cream robe, red trim in
deepest shadows); Youthful War = high-contrast neutral boost (no hue change). `test:hiruzen-skins` 16/0.

## CONFIRMED ART GAPS (generic fallback, flagged — not invented)
up / air / down_air normals (no dedicated art) · GUARD frame 2 · TAKING HEAVY DAMAGE 2/3 · KNOCKED DOWN (5f) ·
4 chibi/SD palette icons. **Portrait DONE** (`hiruzen_portrait.png` — iconic robed-Hokage bust cropped from the
intro sheet, Jason-bust convention). **Skins:** only the required Default entry exists in skins.js (carries
spriteScale 2.8 — WITHOUT it, applySkin's getSkins-fallback resets scale to 1 → renders tiny; this was a real
bug the canonical test caught). Creative skins are a later batch — `color_palletts.png` holds 4 real intended
swatches (black / brown-orange / grey / red).

## Stages
- **S1 DONE** — registration + movement/state + 2-part intro. `harness/hiruzen_stage1_shots.mjs` 14/0; Jason neighbor regression 30/0.
- **S2 DONE** — `harness/hiruzen_stage2_shots.mjs` 11/0. light = punch combo flurry (eff 18) / heavy = wide finisher (eff 37, sourceX 300) off ONE punches sheet; up/air/down_air = fallback punch poses (connect, flagged gaps); **SPIN** = neutral Special evasive dodge (abilities.js `executeHiruzenSpecial`/`fireHiruzenSpin`: 15 chakra, 22 i-frames via `invulnTimer`, back-hop, `hiruzenSpin` cast pose identity-mapped) — verified to dodge a live hit for 0 dmg. Dispatch case added; Fwd/Down/Up no-op until S3.
- **S3 DONE** — `harness/hiruzen_stage3_shots.mjs` 18/0. Dir-branched borrowed jutsu in `executeHiruzenSpecial`
  (all self-contained, NO Madara code shared): **Fwd** = Fire Release: Great Fireball (`fireHiruzenFireball`,
  reuses fireball FX + own cast pose, eff ~30 dmg — weaker than Madara Katon) · **Down** = Earth Release: Wall
  (`fireHiruzenEarthWall`, stationary stone hazard erupts in FRONT, defensive; stone-recolored art) · **Up** =
  Enma (`activateHiruzenEnma`/`revertHiruzenEnma`, transformation-buff: +25% dmg via `damageMultiplier` + +35%
  reach via NEW generic `_reachMult` hook in combat.getAttackHitbox; 480f, auto-revert in game.updateMiscTimers;
  `_drawHiruzenEnmaAura` staff+aura indicator) · **Back** = Adamantine Staff Bind (`fireHiruzenStaffBind`,
  resolveGrab command grab + `_grabThrowDmg`). Cast poses reuse punch frames (identity-mapped in sprite.js).
- **S4 DONE** — `harness/hiruzen_stage4_shots.mjs` 9/0. **Reaper Death Seal** ult (`executeHiruzenUltimate` +
  dispatch case): INLINE freeze/camera-focus cinematic on the **LIVE fighter** (verified no dup instance) —
  `hiruzenReaperCast` held sealing pose + `focusCameraOnAction` zoom + opponent freeze (hitstop) + guaranteed
  soul-rip payoff (330 raw → **198 eff** via applyScaledDamage). **Great personal cost:** pays 15% of his own
  max HP (~177, clamped non-lethal). Screen-space FX = NEW game.js `drawHiruzenReaperCinematic` (dark spectral
  vignette + hooded Shinigami w/ glowing eyes + soul-drag thread + soul-rip flash), in the drawBattle cinematic
  list; driven by `_reaperSealTimer` (tick in updateMiscTimers). Harness getter `hiruzenReaperCine` asserts the
  overlay actually rendered (renders 66 / maxEnv 1.0). GOTCHA: headless rAF ~220fps → frame-stepped screenshots
  catch stale frames; capture via per-cast real-time settle.
- **S5 DONE = BUILD COMPLETE** — portrait (`hiruzen_portrait.png`) + skins.js Default entry (fixed the scale-1
  render bug) + canonical `harness/hiruzen.test.mjs` **34/0** (registration/stats/portrait/Chakra, movement/state,
  combo string, up/air/down_air fallbacks w/ hardened air-normal retry, SPIN i-frame dodge, all 4 borrowed
  specials, Reaper ult live-cinematic + self-cost + overlay-render assertion, 22-action fallback-box sweep) +
  BALANCE_AUDIT.md entry (FAIR; borrowed specials all WEAKER/different-role vs Madara sources — not strictly-better).
  Regressions clean (Jason 30/0, Madara 44/0, Isshiki 52/0). `test:hiruzen` + `test:hiruzen-stage1..4` in package.json.
