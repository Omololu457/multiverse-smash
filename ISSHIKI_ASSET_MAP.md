# Isshiki Otsutsuki — Asset Map

rosterKey **`isshiki`** · universe **naruto** · source: **AltairFrameMaker** (DeviantArt) fan sheet
(`isshiki_otsutsuki_nzc_by_altair_by_altairframemaker_deta3ps.png`). Attribution MANDATORY (credits.js).

SCHEMA-EXCEPTION character (Madara/Pain tier): 6 real named techniques + combo-chain normals. Filename
typos (`specail_N`) preserved on **source** files only; code/UI use corrected technique names.

Reslicing: **`tools/reslice_isshiki.py`** (mirrors reslice_jason.py; adds `band=(y0,y1)` crop so the
multi-ROW `hit_sheet` can be split into its several real actions before uniform-slicing). Every reslice
is feet-aligned (bottom-aligned, centered-X, 1px pad) → single `anchorY: 0` plants feet everywhere.

## Stage 1 — registration + movement/state  ✅ (harness/isshiki_stage1.mjs — 22/0)

Stats (elite top-tier, NO new roster record): **HP 1300 · Karma 200 · Atk 96 · Def 90 · Spd 92.**
spriteScale **1.40** → idle body **122px** (measureSprite; imposing, above human band, below Jason 133).

| action | source file | reslice → uniform | frames | cell |
|---|---|---|---|---|
| idle | isshiki_otsutsuki_idle.png | isshiki_idle_uniform.png | 1 | 44×89 |
| intro | isshiki_otsutsuki_intro.png | isshiki_intro_uniform.png | 4 (grow 5→11→21→42, last==idle) | 44×89 |
| walk/run/dash | isshiki_otsutsuki_dash.png | isshiki_dash_uniform.png | 3 | 72×56 |
| jump (+fall=cell2) | isshiki_otsutsuki_jump.png | isshiki_jump_uniform.png | 3 | 53×80 |
| guard | isshiki_otsutsuki_block.png | isshiki_block_uniform.png | 1 | 44×83 |
| win | isshiki_otsutsuki_win.png | isshiki_win_uniform.png | 1 | 50×89 |

**hit_sheet.png (515×283) — ONE file baking 5 real actions** (mixed-file warning), split by row band +
cell-range keep, mapped to the engine's real hit-state slots (tobi `hurt/hurt_air/knockdown/getup` precedent):

| action | band y | cells | frames | cell | note |
|---|---|---|---|---|---|
| hurt | 22–93 | all | 2 | 54×74 | standing hit-recoil |
| hurt_air | 125–198 | all | 5 | 76×76 | airborne tumble — ONE escalating sequence (art continuous, not 3 discrete tiers) |
| knockdown | 214–278 | 0–1 | 2 | 81×41 | grounded lying |
| sukunahikonaShrink | 214–278 | 2–5 | 4 | 41×16 | **Sukunahikona shrink-to-dot / vanish** (39→20→10→5; sub-10px cells KEPT — confirmed real). Reused by Stage-3 special. |
| getup | 214–278 | 6–9 | 4 | 70×67 | regrow → standing recovery (11→23→47→68) |

No dedicated walk/run art → glides on the dash pose. No dedicated fall art → jump cell 2.

## Stage 2 — ground + air combo chains  ✅ (harness/isshiki_stage2.mjs — 17/0)

Both are **Light-button AUTO-COMBO strings** (not Fwd+Heavy): tap Light to open, re-tap Light during
recovery to cancel into the next stage — cancel-on-HIT (whiff/block ends the string, shared
`rekkaContinue`). abilities.js `ISSHIKI_COMMAND` + `updateIsshikiCommandCombat` (neutral-Light opener,
ground/air split by `grounded`); game.js dispatch block; sprite.js identity MOVE_TO_ACTION entries.

**GROUND** — attacks_base.png (3/2/5 rows; rows 2&3 have NO clean gutter → hand y-split at 167):

| stage | source row | reslice | frames | cell | move data |
|---|---|---|---|---|---|
| isshikiGround1 | row1 (3 punches) | isshiki_ground1_uniform.png | 3 | 66×76 | dmg 24, opener |
| isshikiGround2 | row2 (2 kick; +2 stray sub-10px cells dropped) | isshiki_ground2_uniform.png | 2 | 78×72 | dmg 30, mid |
| isshikiGround3 | row3 (5 low-string + slash-arc) | isshiki_ground3_uniform.png | 5 | 74×77 | dmg 52, **launcher** finisher |

**AIR** — air_attacks.png (3/3/2 rows; detached-FX cell row1 x152-171 EXCLUDED via `pick=[0,1,3]`):

| stage | source row | reslice | frames | cell | move data |
|---|---|---|---|---|---|
| isshikiAir1 | row1 (3 char, FX dropped) | isshiki_air1_uniform.png | 3 | 65×77 | dmg 22, opener |
| isshikiAir2 | row2 (3) | isshiki_air2_uniform.png | 3 | 82×72 | dmg 26, mid |
| isshikiAir3 | row3 (2 dive-slash) | isshiki_air3_uniform.png | 2 | 159×70 | dmg 46, **spike** finisher |

Neutral heavy/up/down_air normals reuse combo poses (heavy=ground2, up=ground3, down_air=air3) so no
button is a dead/idle-fallback. Ground string measured 45 dmg (2+ stages), air 60 dmg.

## Stage 3 — 4 core specials  ✅ (harness/isshiki_stage3.mjs — 18/0)

Directional (hold a dir + **Special/L**): abilities.js `executeIsshikiSpecial` (dispatch switch case) +
`ISSHIKI_SPECIAL_COST` (Karma pool). Char cast poses via `_spriteCastMove`; FX/projectiles spawn separately.
Damage is RAW → engine `applyScaledDamage` applies the honest ×0.60 on hit. Back+Special reserved for Stage 4.

`reslice_isshiki.py` gained `xrects=` (hand-authored x-ranges, no gutters) + `keyblack=` (alpha-key the
black-box bg). **specail_1's row 2 is a baked-in TEXT LABEL, not frames → excluded.**

| dir | special | cast pose (char) | FX / projectile | source split | dmg (raw) · cost |
|---|---|---|---|---|---|
| neutral | **Sukunahikona** | isshiki_suku_cast (specail_1 c0-1) | collapsing rings (specail_1 c2-5), caster melee | pick | 60 · 25 |
| Forward | **Daikokuten rods** | isshiki_rod_cast (specail_2 c3-5) | rod-bar projectile (specail_2 c2) | pick; c0-1 DUP not re-imported | 80 · 30 |
| Down | **Daikokuten cubes** | reuse suku_cast (cube art FX-only) | enlarging-cube projectile (specail_3, **hand xrects** 235-294/316-426/462-581) | xrects | 95 · 40 |
| Up | **Sage Art: Gokashin Ensen** | isshiki_fire_cast (specail_4 c0-1) | fire-wave projectile (specail_4, **hand xrects + keyblack=48** → black box removed) | xrects+keyblack | 100 · 45 |

Verified in-game: all 4 fire, render their cast pose, spawn their FX/projectile, connect (36/48/57/60 eff dmg),
spend the right Karma; the fire FX shows **no black rectangle** (alpha-keyed). GOTCHA: fast-projectile live-FX
capture is playwright-jittery → server-side `waitForFunction` on `projectiles()` (resolves the instant the
projectile exists); rod speed 15→12 (harmless) to widen its on-screen window.
## Stage 4 — 2 bonus finishers + Ultimate (Finisher 3)  ✅ (harness/isshiki_stage4.mjs — 16/0)

`specail_attacks.png` split into its 3 baked actions (rows): Row1 = Finisher 1 cast, Row2 = Finisher 2
dash-slash, Row3 = Ultimate (Finisher 3) windup. `effects.png` = the Daikokuten rod-rain payoff.

| move | input | cast pose / art | mechanic | dmg (raw) · cost |
|---|---|---|---|---|
| **Finisher 1** | Back+Special | isshiki_fin1_cast (specail_attacks r1) | 3-rod staggered BARRAGE (rod_fx reused — dup art) | 55×3 · 50 |
| **Finisher 2** | airborne Special | isshiki_fin2 (specail_attacks r2, dash-slash) | long-reach forward-lunge slash (spike) | 90 · 45 |
| **Ultimate: Daikokuten Barrage** | U (≥100 Karma) | isshiki_ult_cast (specail_attacks r3) | **inline camera-focus cinematic** → giant rod-rain (effects.png) → GUARANTEED nuke (Miwa contract) | 340 → **204 eff** · 100 |

`executeIsshikiSpecial` router: airborne→Finisher 2, Back→Finisher 1 (neutral/F/D/U = the Stage-3 core 4).
`executeIsshikiUltimate` + dispatch case. Verified in-game: F1 barrage 96 dmg, F2 slash 54 dmg, Ult 204 dmg.

**Ultimate built INLINE (no bespoke module)** — the LIVE fighter is the sole actor (holds isshikiUltCast +
camera zoom `focusCameraOnAction` + opponent freeze via hitstop + scheduled rod-rain + guaranteed
`applyScaledDamage`). This deliberately **sidesteps the duplicate-fighter-instance bug** that bit this
project's module-based cinematic ults; the harness asserts p1 itself renders the ult cast sprite. 204 eff =
top-ult band (Ichigo 330→198), not an outlier.

## Stage 5 — portrait + harness + balance  ✅ = BUILD COMPLETE (test:isshiki 52/0)

- **Portrait**: `isshiki_portrait.png` (282×294) — bust cropped from the idle front-stance (head→mid-chest) + 6× nearest-neighbour upscale. Wired via `characters.isshiki.portrait` (+ skins.js default). Shows the horned head / glowing eyes / white-red robe.
- **Karma label**: added `karma: "Karma"` to ui.js `ENERGY_TYPE_LABELS` → HUD energy bar reads "Karma".
- **Canonical `harness/isshiki.test.mjs` (52/0)**: static sheet+portrait sweep · registration/gate/stats/Karma label · movement/state + hit_sheet's 5 sub-actions · both combo strings advancing (cancel-on-hit mechanism proof + multi-hit dmg) · all 4 core specials + both finishers (cast/cost/FX/connect) · the ultimate cinematic (live fighter + guaranteed nuke) · **31-action fallback-box sweep** (0 boxes). npm: `test:isshiki` + `test:isshiki-stage1..4`.
- **Balance** (BALANCE_AUDIT.md entry): **FAIR — schema-exception top-tier all-rounder, NOT a stat-power outlier.** HP1300/EN200/atk96/def90/spd92 — every axis in-band, **NO roster record** (HP<Omni1400, atk<Netero98, def<Superman92, spd<Netero94, EN<Sukuna210). Kit breadth is the outlier surface (Madara/Ichigo/Hashirama precedent), throttled by ONE shared Karma pool; entire kit honestly ×0.60 scaled (no bypass); ult 204 eff = Ichigo band. Watch-item: HP1300×Def90×broad kit → knob = HP~1240 or special costs, not per-hit dmg.

## Skins — Default + 13 creative  ✅ (test:isshiki-skins 16/0)

`tools/gen_isshiki_creative.py` (3-region recolor via `recolor_multi`, mirrors gen_jason): **ROBE** near-black
cool mass (val 0.04-0.42, cool) · **TRIM** crimson (red hue 340-20, sat≥0.45) · **PALE** white hair/robe/skin
(val≥0.70, sat≤0.25). FX sheets stay canonical — only the 23 character body sheets + portrait recolor
(312 PNGs). Skins: Karma Azure · Golden Otsutsuki · Ten-Tails Violet · Emerald Kama · Toxic Sage · Frost
Otsutsuki · Celestial Ivory · Obsidian Gold (truly-black robe) · Ashen Revenant · Steel Reaper · Sanguine
Sovereign (blood-red robe) · Jigen Ash (homage) · **Void Sovereign** (full black + game.js
`drawIsshikiVoidAuraOverlay` — crimson Kāma motes + red eyes, gated on id `isshikiVoidSovereign`). skins.js
append-only; portraits `isshiki_portrait__<tag>.png`. NOTE: the prompt's spec table didn't arrive → this
13-skin table was proposed + user-approved via the preview sheet (Obsidian darkened per feedback).

### Gaps (by design / deferred)
- No voice · no dedicated walk/run art (glides on dash) · Finisher-1 rod-FX reuses `rod_fx` (dup source art). Master-sheet-only content (RUN cycle, extra shrink/grow variants) deferred per the design doc.
