# BATMAN_ASSET_MAP.md

Asset inventory + build plan for **Batman** (rosterKey `batman`, universe `dc` —
**2nd DC character** after The Flash, 17th sprite char overall).

This doc did not exist in the batch (the build brief referenced it); created here,
mirroring `FLASH_ASSET_MAP.md`. Frame boundaries **measured** via
`harness/slice_scan.mjs` (alpha-gutter column scan), cross-matched against the
master reference atlas `batman_transparent.png` (3861×2171 — the per-action files
are the extracted rows of this atlas; `batman__1989__sprite_sheet_by_soldado505_dfrx6dm.png`
is a byte-identical duplicate of it). Filenames preserved **exactly** as uploaded
— note the typos: `batman_baterang_*`, `batman_melle_combo_1`, `batman_foward_*`,
`batman_down_air_specail`, `batman_side_kick_combos`. Non-uniform strips RE-SLICED to
uniform feet-preserving cells (`harness/reslice.mjs → *_uniform.png`).

Structural precedent: **The Flash** (1st DC char) for the registration/state gate,
**Killua/Netero** for the technical-fighter archetype + rekka chain, and the shared
teleport-behind + ultimate-cinematic systems for Stages 3–4.

**⚠ Cape-silhouette caveat (per brief):** many frames are dominated by a large black
cape that connects to the body with no alpha gutter, so the alpha-gutter scan reads
cape+body as one island (correct — they ARE one frame). Frames were spot-checked
visually (Read tool) before trusting counts; the counts below are the visual truth.

---

## STEP 1 — Raw inventory (measured islands via slice_scan.mjs)

### Movement / state (Stage 1 — WIRED)
| file | dims | islands | role |
|---|---|---|---|
| `batman_idle.png` | 734×132 | 6 | idle ✅ → `batman_idle_uniform.png` (6f, 125×132, botGap 2) |
| `batman_walk.png` | 1558×150 | 12 | walk ✅ → `batman_walk_uniform.png` (12f, 160×150, botGap 3) — full stride cycle, distinct from run |
| `batman_run.png` | 1641×120 | 8 | run/dash ✅ → `batman_run_uniform.png` (8f, 191×120, botGap 2) — cape-sweep sprint |
| `batman_side_jump.png` | 933×145 | 6 | jump ✅ → `batman_jump_uniform.png` (6f, 176×145; use frames 0–3 crouch→spring→apex→float; fall = frame 3, botGap 12) |
| `batman_block.png` | 686×146 | 6 | guard ✅ → `batman_guard_uniform.png` (6f, 121×146, botGap 7) — **real dedicated block art** (cape-wrap brace; unlike Flash/Killua's idle fallback) |
| `batman_hit.png` | 484×161 | 4 | hurt ✅ → `batman_hit_uniform.png` (4f, 130×161, botGap 0) — real recoil strip |
| `batman_land.png` | 1669×219 | 7 | intro ✅ → `batman_intro_uniform.png` (7f, 337×219, botGap 0) — glide-descend → touchdown → cape-settle: a dramatic Batman entrance |
| `batman_charge.png` | 444×162 | 3 | charge ✅ → `batman_charge_uniform.png` (3f, 140×162, botGap 4) — gadget-flex hold-to-charge pose |
| `batman_jump.png` | 1615×365 | 8 | **NOT used for jump** (frame 0 is a 387-wide merged crouch that blows up the uniform cell width, and the tall glide arcs float feet mid-cell). `side_jump` is the cleaner jump source. Reserved. |

### Melee normals + command-normal chain (Stage 2)
| file | dims | islands | planned slot |
|---|---|---|---|
| `batman_foward_punch.png` | 478×144 | 3 | **light** (quick jab→cross) |
| `batman_foward_kick.png` | 840×129 | 6 | **heavy** (committed wind-up kick, big extension) |
| `batman_foward_punch_2.png` | 435×161 | 3 | **up** launcher (rising hook) OR chain overflow |
| `batman_super_air.png` | 505×150 | 6 | **air** (cape spin/flip) |
| `batman_down_air_2.png` | 905×116 | 6 | **down_air** (aerial dive strike) |
| `batman_melle_combo_1.png` | 1508×163 | 12 | **command-normal rekka spine** (a full standing hand-to-hand string: jabs → weave → uppercut → straight) → split into 3–4 cancelable stages (Toji-Rekka) |
| `batman_punch.png` | 298×144 | 2 | simple straight punch — overflow/alt |
| `batman_down_combo_1.png` | 1577×141 | 9 | crouch-punch string — overflow (deferred crouch chain) |
| `batman_down_combo_2.png` | 1490×140 | 10 | uppercut → low sweep — overflow |
| `batman_down_combo_3.png` | 1074×121 | 8 | crouch weave strikes — overflow |
| `batman_down_air_1.png` | 496×146 | 3 | short aerial — spare |
| `batman_hit_drag.png` | 896×129 | 5 | knockdown/drag recoil — reserved (getup/knockdown polish) |

### Specials (Stage 3) — **DESIGN DECISIONS pinned to actual art**
| file | dims | islands | role |
|---|---|---|---|
| `batman_baterang_throw.png` | 915×157 | 6 (+sliver) | **Batarang** cast pose (wind-up → release) — fastest/cheapest ranged poke |
| `batman_baterang_effect_projectile.png` | 57×132 | 1 (37×37 spin) | the thrown batarang projectile sprite (single spinning frame; vertical strip) |
| `batman_side_kick_combos.png` | 1481×130 | 8 | **Cape Dash** (Grapple Hook slot) — a leaping cape-swoop lunge. **NO hook-and-pull art exists** in the batch/atlas → built as a MOBILITY DASH/approach-strike per the brief's "let the frame content decide", NOT a grab-pull. |
| (Smoke Pellet) | — | — | **NO dedicated smoke/vanish art** anywhere. Built as a teleport-behind reusing the shared teleport system (Gojo/Sukuna/Toji/Rick/SSJ-Blue-Vegeta), with a procedural smoke poof; the mechanic is art-independent and proven. Cast pose = a crouch/throw frame. |
| `batman_down_air_specail.png` | 1198×147 | 6 | dive-bomb special candidate (aerial). Spare / possible 3rd special variant. |

### Ultimate (Stage 4)
| file | dims | islands | role |
|---|---|---|---|
| `batman_baterang_combo_throws.png` | 2156×141 | 14 | **THE largest / most elaborate sequence in the batch** (widest canvas, most frames, most FX layers) → the **Ultimate**: a multi-batarang barrage. Frames 0–5 are identical to `batman_baterang_throw` (single throw); 6–13 add the extended combo flurry. Wrapped in the shared freeze/camera-focus cinematic. This is BOTH the "flag the largest sequence" call AND the batarang-barrage fallback — they coincide. |

### Master sheet
| file | dims | notes |
|---|---|---|
| `batman_transparent.png` | 3861×2171 | full reference atlas (all rows + the batarang spin-effect column). Every per-action file is an extracted row. Source of the Stage-5 portrait crop. |
| `batman__1989__sprite_sheet_by_soldado505_dfrx6dm.png` | 3861×2171 | byte-identical duplicate of the atlas (original upload name). |

---

## STEP 2/3 — Cross-connection notes

- **Grapple Hook resolved as mobility, not grab:** the only lunging/approach art
  (`side_kick_combos`) is a cape-swoop leap — there is no hook-throw / pull-in
  sequence in the batch OR the atlas. Per the brief ("let the actual frame content
  decide, don't force the grab reading"), the slot is a forward Cape Dash.
- **Smoke Pellet has no art** → reuse the proven shared teleport-behind mechanic
  with a procedural poof (art-independent), honoring the design intent.
- **Batarang is the one true projectile** (unlike Flash, who had zero ranged content).
  `baterang_effect_projectile` is the flight sprite; `baterang_throw` is the cast.
- **Ultimate candidate is unambiguous:** `baterang_combo_throws` (14f, 2156px) is by
  every metric the biggest sequence → cinematic barrage.

---

## ENERGY / HUD
- `energyType: "gadget"` → new HUD label **"Gadgets"** added to `ui.js`
  `ENERGY_TYPE_LABELS`. Meter funds specials + the Ultimate (utility-belt theme).

---

## BUILD STATUS

- **S1 — DONE (uncommitted).** Registration + movement/state. 3-file sprite gate
  (characters.js `batman` const + export, skins.js `batman` default skin,
  spritesheets.js idle manifest) + `gadget` energy label. Stats
  HP1080 / atk86 / def88 / spd92 / EN100 = disciplined technical mid (no outliers;
  def88 the only slightly-high value, intentional). spriteScale 0.92 (art is LARGE
  → sub-1 scale; idle content 128px × 0.92 ≈ 118px on-screen, roster band). Wired
  actions: idle(6f), walk(12f), run/dash(8f), jump(4f)/fall, guard(6f REAL block
  art), hurt(4f), intro(7f dramatic landing), charge(3f). Evidence:
  `test:batman-stage1` (harness/batman_stage1_shots.mjs) 10/10 + RENDER-verified
  screenshots harness/shots/batman_s1_*.png (all clean sprites, feet aligned).
- **S2 — DONE (uncommitted).** 5 normals: light=`foward_punch`(3f), heavy=`foward_kick`(6f),
  up=`down_combo_2` frames 0–2 (overhead uppercut launcher — chosen over `foward_punch_2` which is a
  horizontal lunge with high feet), air=`super_air`(6f cape-swirl), down_air=`down_air_2`(6f dive-punch).
  Command chain = **"Combo"** Down+Heavy 3-stage rekka `batCombo1→batCombo2→batCombo3` from
  `melle_combo_1` split 0-3 / 4-7 / 8-11 (jab → weave/uppercut → extended-straight launcher).
  `updateBatmanCommandCombat`/`BATMAN_COMMAND` in abilities.js (mirrors Flash/Gon, cancel-on-hit).
  Evidence: `test:batman-stage2` 12/12 + RENDER-verified batman_s2_*.png. `foward_punch_2` → overflow.
- **S3 — DONE (uncommitted).** 3 specials on SPECIAL (direction-branched via `_specialHeldDir`),
  `executeBatmanSpecial` dispatcher in abilities.js + `case "batman"` in triggerSpecial.
  **Neutral = Batarang** (15 Gadgets): cast `batarangThrow` (baterang_throw) → `batman_baterang_proj.png`
  projectile (the vertical 5-frame effect strip converted to a horizontal filmstrip), 34 dmg, speed 17.
  **Forward = Cape Dash** (25 Gadgets): the "Grapple Hook" slot resolved as a MOBILITY LUNGE
  (createAttackFromMove `capeDash` + forward vx burst; `side_kick_combos` swoop) — 50 dmg, mild launch;
  no hook-pull art → not a grab. **Down = Smoke Pellet** (20 Gadgets): TRUE teleport-BEHIND (crosses to
  the far side — flipped the near-side ternary of the shared teleport math) + `spawnClonePuff` poof ×2 +
  14f i-frames; no smoke art (procedural poof). Evidence: `test:batman-stage3` 11/11 + RENDER-verified
  batman_s3_*.png. Killua 24/24 + Flash 29/29 = no regression.
- **S4 — DONE (uncommitted).** "The Dark Knight" ultimate = a frozen batarang-barrage cinematic.
  NEW `batmanDarkKnightCinematic.js` (mirrors beerusKiBallCinematic.js contract EXACTLY: activate/
  isActive/getPhase/update/draw/clear + freeze-early in updateBattle). Timeline WINDUP 72 → BARRAGE 96
  (connect @102) → SETTLE 36 (~204f). Batman holds the `darkKnight` cast pose (baterang_combo_throws
  14f = the flagged LARGEST sequence) while ~22 batarangs (batman_baterang_proj spin) rain diagonally
  onto the foe + white flash + scatter pile. Guaranteed range-independent 300 dmg at the connect beat
  (block chips to 25%). `executeBatmanUltimate`/`applyBatmanDarkKnightDamage` + `case "batman"` in
  triggerUltimate (abilities.js). Wired in game.js: import + freeze block + draw + 3 clear paths +
  innerCineActive + `batmanUltCine` harness accessor. Evidence: `test:batman-stage4` 8/8 (activate/
  phase-progression/guaranteed-damage/clean-resume) + RENDER-verified batman_s4_*.png. Beerus 38/38 +
  Batman S1/S3 = no regression. **Ultimate PATH taken: the flagged largest-sequence cinematic (which
  coincides with the barrage fallback — same move).**
- **S5 — DONE (uncommitted) → BUILD COMPLETE.** Portrait `batman_portrait.png` (cowl+chest bust
  cropped from idle frame 0). Canonical `harness/batman.test.mjs` = **33/33** (full kit in one run +
  fallback-box sweep: all 11 exercised actions resolve to batman sheets, no fallback box, no JS errors).
  Cross-char regression clean: Beerus 38/38, Killua 24/24, Flash 29/29, Gon 37/37, basickit 17/17.
  Stage suite: s1 10/10 · s2 12/12 · s3 11/11 · s4 8/8. TEST-HARNESS gotcha fixed (not a char bug):
  the canonical run left Batman jammed at the stage wall after the movement section → `prep` now
  recenters P1 to a safe mid-stage X before positioning the dummy; jump reordered before dash (dash's
  lingering dashTimer takes sprite precedence over jump).

## BALANCE (vs BALANCE_AUDIT.md — DIAGNOSIS ONLY, reported not changed)
- **Stats:** HP1080 (low-mid: Rick1050<Batman<Megumi1120), atk86 (mid), **def88 (tied ~2nd-highest,
  Gojo88/Toji89)** — the one slightly-high value, intentional disciplined-defender identity; not a
  concern since his damage is low-tier (no min-max). spd92 (above the 90 cluster, below Netero94/Toji98).
- **Normals RAW** light32/heavy64/up52/air45/downair58 = LOW tier (Rick/Killua zone) — through the
  scaled ×0.60 pipeline (EFF ~19/38/31/27/35). Consistent w/ a technical COMBO fighter: damage comes
  from the free Down+Heavy 3-chain + pressure, not big normals.
- **Specials** LOW damage-per-energy (Batarang EFF20/15en=1.36, Cape Dash EFF30/25en=1.20; Smoke Pellet
  = 0-dmg utility) — Rick/Killua tier, deliberate (poke / approach / escape-mixup tools, not burst).
- **Ultimate** "The Dark Knight" = 300 RAW via MANUAL-SUBTRACT → 🔓 BYPASSES the 0.60 scale (delivers
  300, like Beerus380/Kurama600/Rick-SD180). CONSISTENT with the flagged cinematic-ult convention;
  Batman 300 sits on the LOW end of that tier. Damage-per-cooldown 300/20s = **15 raw/s ≈ Sasuke
  Susanoo 15.1 / Naruto 15.0** = in line with the premium-ult pack, NOT a new outlier. Full-meter (100%)
  cost + block-chips-to-25% gate it. **No Batman-specific balance outlier; the only flag is the shared
  systemic ult-bypass, already documented for Beerus/Kurama/Rick.**

## Deferred / not in the batch (flagged honestly)
- **Grapple hook-and-pull** — no art; slot is a mobility Cape Dash instead.
- **Smoke/vanish art** — none; Smoke Pellet uses the shared teleport + procedural poof.
- **`batman_jump.png`** (the 8-island tall glide sheet) — unused (side_jump is cleaner).
- **`batman_down_combo_1/2/3`, `batman_punch`, `batman_down_air_1`** — overflow melee, reserved.
- **`batman_hit_drag.png`** — knockdown/drag art, reserved for getup/knockdown polish.
- **Voice / taunt / dedicated win-lose / getup** — none in the batch (matches Flash/Killua deferrals).
