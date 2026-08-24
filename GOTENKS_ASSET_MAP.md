# GOTENKS (Super Saiyan) — STAGE 0 Asset Map & Investigation Report

**Character:** ONE roster entry (`gotenks`), **standalone SS-Gotenks kit** — NOT a multi-form
character. **No base/non-transformed form sheet was provided**, so there is no transformation
system to build. If a base-form sheet is supplied later, this build is to be *restructured* into a
two-form character then — it is NOT to be treated as already complete with a transform (contrast
[[goku-4form-build]] / [[gohan-build]], which each had real base sheets).

**Source:** Dragon Ball Z: Extreme Butoden (3DS), **single sheet**, depicting Super Saiyan Gotenks
only. Same rip family / same teal+green keying convention as the project's existing EB Goku, Teen
Gohan, Piccolo, Frieza builds.

**Status:** STAGE 0 COMPLETE — investigation + report only. **NO gameplay code written.** Verified
2026-08-23 by first-hand pixel pass (new `tools/gotenks_montage.py` + 24 twelve-box montage strips
read directly) **plus two independent visual-audit subagents** over the full 266-box normals/damage
band, **plus a programmatic sub-threshold blob scan** hunting for a projectile shard. Most
pre-stated claims corroborated; **one Stage-4 item was REFUTED** and is flagged honestly below (the
thrown ki-blast has no free-flying projectile art on the sheet) — it is NOT rubber-stamped.

**Roster reconciliation:** No existing `gotenks` in `characters.js` / `spritesheets.js` / `skins.js`
— clean NEW character. Nothing to reconcile.

---

## SOURCE SHEET

RGBA but fully opaque. Background teal `(0,128,128)`; every frame sits in its own green cell
`(0,255,80)`. Key BOTH to transparent when slicing (identical to EB Goku/Gohan).

| File | Size (WxH) | Boxes* |
|---|---|---|
| `3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Gotenks.png` | 1550 × 6645 | 266 |

\* connected-component count at the ≥500px / ≥18px montage threshold (includes FX arc/flash frames),
not the final animation count. A separate scan for 40–500px blobs found only VFX/streak fragments —
**no dedicated projectile-shard cell** (see Stage 4).

**Design read (SS Gotenks):** gold spiky hair with a downward front bang, **black sleeveless fusion
vest worn open over a bare chest/abs**, **green sash/belt + green wristbands**, white baggy
"MC-Hammer" pants, dark boots. Faces **LEFT** on the sheet → reslice with `FLIP_H=True` to face RIGHT
(same as every EB rip). Idle silhouette ~87–99px tall pre-scale (comparable to the other EB teens).

**Tooling built this stage (Stage-0 only, no engine code):**
- `tools/gotenks_montage.py [all|idx-list] [out.png]` — teal+green-keyed contact sheet
  (`gotenks_montage.png`, 266/266). Mirrors `tools/gohan_montage.py`; **montage indices = future
  reslice indices** (same box sort: row-band ÷60 then left-to-right).

---

## FRAME INVENTORY (montage indices)

| Range | Content |
|---|---|
| `[0]` | Chibi full-body emote cell (portrait candidate / small) |
| `[1-5]` | **5 rectangular face busts** (portraits) — calm → determined → shout intensity |
| `[6-8]` | **Ready-stance tier row** — `[6]` normal palette, `[7]` dim/darker tier, **`[8]` flat pale BLUE-LAVENDER single-tone flash frame** (cross-character lavender-flash convention — cosmetic, wire at Stage 6) |
| `[9-23]` | **Idle / breathing-stance loop** (primary 6-frame loop + variants) |
| `[24-32]` | **Guard / block, guard-hit recoil (crossed-arm brace), crouch, crouch-guard** |
| `[33-59]` | Combat-stance + early normals: jab windups, straight/lunge punch (long reach `[56]`), leap/dive `[48,49]`, arms-up shout `[51,52]` |
| `[60-95]` | **Kicks & aerials:** flying kicks w/ white-crescent VFX arcs (`[61],[85],[86]`), airborne spin-kicks, diving strikes, aerial punches w/ small speed-streaks (`[88,89]`) |
| `[96-107]` | Overhead double-fist smash `[96]`, dash-punch `[102,103]`, **KI-CHARGE aura pose `[100,101]`** (floating ki particles, no strike), overhead power-up shout `[104,105]`, open-palm push `[106,107]` |
| `[108-131]` | Fighting stances + **RAPID PUNCH BARRAGE** (`[117,118]` alternating fists w/ motion-blur; `[122-124]` flurry), big impact arc `[126]` |
| `[132-138]` | **Backflip / somersault kick** (inverted vault w/ dark motion-streak) |
| `[139-191]` | More normals/aerials: rising kick `[146]`, airborne spin-kicks (`[147-149],[187,188]`), sweep kicks w/ crescent arcs (`[164],[169]`), finger-point **taunt** gestures (`[174,177,181,182]`), open-hand claw/cast poses `[189-191]` |
| `[192-227]` | **Hit-reaction / hurt-stagger → knockback → KO tumble** (large damage-state library) |
| `[228-237]` | Hurt → knockdown → lying (prone/back) → crossed-arm brace → rising (**full KO/getup chain**) |
| `[238-241]` | **Torn-clothing sitting-up-dazed damage state** — sits up, `[240,241]` show RED eyes / dazed, visibly heavier hit (see Stage-0 item 2) |
| `[242-245]` | **Super Ghost Kamikaze WINDUP** — arms raised overhead, green cape/vest-flap flying |
| `[246-251]` | **Cyan energy-flash silhouette** (`[251]` = white silhouette) |
| `[252-255]` | Green-vest dynamic action poses (ghost-throw / command frames) |
| `[256-265]` | **Ghost materialization** — small blue blob `[256,257]` → floating ghost figure w/ matching spiky hair-tuft `[258-262]` → ghost compressed into a launched dart/projectile `[263-265]` |

---

## STAGE-0 CLAIM VERIFICATION

| # | Claim (from prompt) | Result |
|---|---|---|
| S0-1 | No transformation link (no base-form sheet) — build standalone | ✅ CONFIRMED — single SS sheet only; do NOT invent a transform |
| S0-2 | Torn-clothing 5-frame sitting-up-dazed = a genuinely heavier damage variant; trigger UNKNOWN | ✅ CONFIRMED present `[238-241]` (red-eyed dazed); **TRIGGER still OPEN** — confirm before wiring |
| S0-3 | No Win pose, no Intro on this sheet | ✅ CONFIRMED — only finger-point **taunt** gestures (`[174,177,181,182]`), no dedicated victory stance; no entrance frames. **Genuine gaps** |
| S0-4 | Super Ghost Kamikaze confirmed from sprite content (windup → cyan flash → 8f ghost) | ✅ CONFIRMED end-to-end `[242-265]` — full-confidence centerpiece |
| — | Idle 6f + crouch variant, guard 4f, guard-hit 3f, crouch/jump/dash, full KO/getup chain | ✅ CONFIRMED (`[9-32]`, `[228-237]`) |
| — | Rapid multi-hit punch barrage (streak marks both fists) = distinct chained string | ✅ CONFIRMED `[117,118]` + `[122-124]` — real flurry, distinct from jab combo |
| — | Broad normals library (flying kicks w/ trails, sweeps, aerials, backflip kick, launcher) | ✅ CONFIRMED across `[33-191]` |
| — | Standing ki-charge gathering pose | ✅ CONFIRMED `[100,101]` (aura particles) — real resource-build pose |
| — | Thrown ki-blast poke — **compact underhand projectile shard** | ❌ **REFUTED** — a *cast/open-hand POSE* exists (`[189-191]`, or the low toss frames), but **NO free-flying projectile GRAPHIC** is on the sheet (2 subagents + sub-threshold blob scan agree). See Stage 4 |
| — | Kamehameha-style beam | ✅ CONFIRMED ABSENT (expected; consistent with EB transformed sheets) |
| — | Sword/blade | ✅ NOT present — the "blade" silhouettes are kick-trail crescents (`[61],[85],[86],[164],[169]`), not a weapon |

---

## STAGE-BY-STAGE NOTES

### Stage 1 — Registration + movement
Idle `[9-23]` (primary loop + variants), crouch-idle among `[30-32]`, guard `[24,25]`, guard-hit
`[234-236]` (crossed-arm brace), crouch `[32]`, jump/leap `[47,48]`, dash/dive `[49]`, hurt `[228]`,
knockdown `[229-232]`, getup `[233]` / `[226,227]`. **Torn-clothing damage state `[238-241]` = a
distinct heavier-damage state — build only once its trigger is confirmed (item 2), do not fold into
the normal knockdown.** Registered as a NEW char (HP/EN/scale to be set at Stage 1 in line with the
other EB teens, ~scale 1.1–1.2, melee-leaning). Rip-author UNKNOWN → **credits attribution PENDING**
(same family blocker as Frieza/Piccolo/Gohan — MUST resolve before ship).

### Stage 2 — Normals
Rich physical library `[33-191]`: jab/straight/lunge punch, overhead double-fist smash `[96]`, flying
kicks w/ crescent VFX (`[61],[85],[86]`), sweep kicks (`[164],[169]`), rising/spin kicks, aerial
punches & spin-kicks, backflip kick `[132-138]`, open-palm push `[106,107]`, dash-punch `[102,103]`.
**Ki-charge gathering pose `[100,101]`** — see open item on its exact function.

### Stage 3 — Command chain
**Rapid punch barrage** is real and distinct: `[117,118]` (alternating motion-blurred fists) +
`[122-124]` (flurry) → build as a chained rapid-combo string, NOT folded into the jab combo. Confirm
remaining cancel points at Stage 3 via direct frame review.

### Stage 4 — Specials
- **Ki-charge gathering pose `[100,101]`** — real. Open question: standalone resource-build action,
  or does it connect to a payoff? No beam/nova payoff exists on the sheet, so if it "pays off" it
  would be a procedural effect (project precedent: Piccolo/Goku procedural energy).
- **Thrown ki-blast poke — PROJECTILE ART ABSENT (refuted).** The cast/open-hand pose exists
  (`[189-191]`) but the shard itself is not drawn anywhere. If this special is wanted, the projectile
  must be **procedural** (as the project already does for beams) rather than sprite-sourced — **FLAG
  to owner** before building, do not pretend sheet art exists.

### Stage 5 — Ultimate: Super Ghost Kamikaze Attack (centerpiece)
Full confirmed sequence `[242-265]`: windup (arms raised, cape flying `[242-245]`) → cyan
energy-flash silhouette (`[246-251]`) → ghost materialization (blob `[256,257]` → floating ghost w/
matching hair-tuft `[258-262]` → launched dart `[263-265]`). Reuse the project's freeze/camera-focus
cinematic pattern for the windup→payoff transition (same as other signature finishers).

### Stage 6 — Portrait, harness, balance
- **Portrait:** face busts `[1-5]` (pick the determined/calm bust); chibi `[0]` alt.
- **No Win, no Intro — genuine gaps.** Do NOT borrow another character's win/intro art to fill them;
  flag as open art dependencies. (Taunt gestures `[174,177,181,182]` could be *offered* as a stopgap
  win pose, but only with owner sign-off — they are taunts, not a victory pose.)
- **No beam** — not a gap specific to this char; no action beyond noting it.
- **Balance watch (opposite direction from siblings):** unlike Goku's and Teen Gohan's builds — which
  currently LACK Ultimate-tier content — Gotenks HAS a real confirmed signature Ultimate (Super Ghost
  Kamikaze). At Stage 6 check it doesn't read as an **outlier on the strong side** vs its two closest
  in-project relatives. Regress vs `BALANCE_AUDIT.md`.

---

## LOCKED CUTS / DECISIONS (per prompt, corroborated by audit)

1. **Standalone SS kit — NO transformation system** (no base sheet). Restructure later only if a base
   sheet arrives.
2. **Torn-clothing damage state = distinct heavier-damage variant** `[238-241]` — build only after its
   trigger is confirmed (health threshold vs heavy-hit category — OPEN).
3. **Super Ghost Kamikaze = the headline Ultimate** `[242-265]` (only screen-effect finisher content).
4. **No Win / no Intro** — genuine gaps, flag as open art deps (do not borrow).
5. **Thrown ki-blast projectile art does not exist** — build procedural or drop; flag at Stage 4.
6. **No Kamehameha/beam** — expected absence, note only.

---

## DEFERRED / OPEN (confirm before wiring the relevant stage)

- **Torn-clothing damage state trigger** — health threshold vs specific heavy-hit category (item 2).
- **Ki-charge pose function** — standalone resource build vs connects-to-payoff (Stage 2/4).
- **Thrown ki-blast** — procedural shard, or cut? (projectile art refuted — Stage 4).
- **Win pose & Intro** — genuine gaps, no source art (Stage 6).
- **Credits rip-author** — UNKNOWN (family-wide blocker; MANDATORY before ship).
- **Balance** — Gotenks has stronger finisher content than Goku/Gohan; watch for over-strong outlier
  at Stage 6.

---

## STAGE 1 — REGISTRATION + MOVEMENT (DONE — `test:gotenks-stage1` 23/0)

**Scope:** movement/state skeleton + anime-face portrait. New char `gotenks` — clean add.

- **Tool:** `tools/reslice_gotenks.py` — standard EB green+teal key (no green-skin hazard), box
  ordering IDENTICAL to `gotenks_montage.py` (montage indices = reslice indices), `FLIP_H=True`
  (EB rip faces LEFT → mirror to face RIGHT), feet-aligned uniform cells, anchorY 0.
- **Registered:** `characters.js` (full `gotenks` object), `spritesheets.js` (idle gate), `skins.js`
  (default only), `credits.js` (SOURCED_ART; rip-author UNKNOWN — attribution TODO before ship,
  mirrors the EB family). **HP 1200 / EN 200 / Def 82 / Spd 94 / scale 1.20 / energyType "ki" /
  melee-leaning rushdown.** Idle renders **105px** (measureSprite) — a short powerful fighter.
- **Frame picks (montage indices):** idle `[9-14]` (6f breathing loop) · crouch `[15-17]` (low
  hunched idle variant) · **walk/run BORROW idle** (no ground stride on the sheet — Frieza/Piccolo
  pattern) · dash `[42]` (forward lunge) · jump `[47,46,45]` (leap→ascent→apex) · fall `[45]` ·
  guard `[24,25]` · guardHit `[234-236]` · hurt `[228]` · knockdown `[230,231]` · getup `[232,233]`
  · taunt `[181,182]` (finger-point) · portrait = face bust #1.
- **★ Torn-clothing DAZED damage state `[238-241]`** — sliced to `gotenks_dazed_uniform.png` and
  registered in `animationData` **UNWIRED** (trigger deferred, item 2). Force-plays real art in the
  harness (proves the clip exists) but is NOT hooked to knockdown — awaiting the owner's trigger call.
- **Verification:** `test:gotenks-stage1` 23/0 (sprite gate, scale, HP/EN, Ki label, height band,
  walk/run borrow-idle, every action resolves a real `gotenks_` sheet, no JS errors) + in-engine
  screenshot sign-off (idle clean ready stance faces RIGHT/feet planted, knockdown lies flat on the
  ground line, taunt finger-up; no teal/green box, no fallback box, correct 105px scale).
- **Open Stage-1 flags carried forward:** walk = borrow-idle (no stride art); dazed trigger OPEN
  (item 2); no win/intro (genuine gaps, S6); credits rip-author UNKNOWN.

## STAGE 2 — NORMALS (DONE — `test:gotenks-stage2` 19/0)

5 normals + crouchLight, all CONFIRMED distinct art with a visibly extended limb (Gohan lesson),
all dmg ×0.60 GLOBAL_DAMAGE_SCALE. down_air HONESTLY reuses air. crouchLight auto-swaps from light
while crouching (`_setCrouchVariant`).

- **Picks (montage indices):** light `[57]` (upright jab, lead arm extended forward) · heavy `[56]`
  (deep lunge straight punch, long reach 104px) · up `[146]` (rising-kick LAUNCHER, own art — NOT a
  heavy reuse) · air `[147]` (airborne spin-kick) · down_air = reuse air · crouchLight `[107]` (low
  forward poke). Emitted by `tools/reslice_gotenks.py`.
- **basic_attacks:** light 40→24 · heavy 76→45 · up 56→33 (launcher) · air 52 · downAir 66 ·
  crouchLight 38 (effective = ×0.60, harness-confirmed on connect).
- **Reserved:** rapid-punch-barrage `[117,118]`+`[122-124]` (S3); ki-charge aura `[100,101]`,
  dash-punch `[102,103]`, flying-kick crescents `[61,85,86,164,169]` (S4); Super Ghost Kamikaze
  `[242-265]` (S5).
- **Verification:** `test:gotenks-stage2` 19/0 (wiring: every normal → real gotenks_ sheet;
  light/heavy/up connect + render; air/down_air airborne; crouch+light auto-swap; guard) +
  resliced-strip visual pass (5 distinct extended-limb poses, face RIGHT).

## STAGE 3 — COMMAND CHAIN "Kamikaze Barrage" (DONE — `test:gotenks-stage3` 10/0)

The sheet's CONFIRMED distinct rapid-combo (motion-streak on BOTH fists) built as a chained string,
NOT folded into the jab combo. Fwd+Heavy 3-stage rekka (cancel-on-HIT via shared `rekkaContinue`,
`requireHit:true`); mirrors `updateGohanCommandCombat`. Ground-only, FREE (commits via recovery);
neutral Heavy stays the normal lunge-punch.

- **Stages (art / dmg→×0.60):** gotenksRush1 `[116]` advancing punch opener (38→23) → gotenksRush2
  `[117,118]` rapid motion-blur barrage, fast startup (46→28) → gotenksRush3 `[122,123,124]`
  finishing flurry double-punch (80→48), **hard knockback ender — NOT a launcher** (faithful to the
  barrage art; the launcher is the up-normal `[146]`).
- **Wiring:** `abilities.js` GOTENKS_CMD + `fireGotenksCmd` + `updateGotenksCommandCombat`; `game.js`
  import + dispatch (`rosterKey==="gotenks"`) + `gotenksCmd` probe; `characters.js` gotenksRush1/2/3
  animationData.
- **Verification:** `test:gotenks-stage3` 10/0 (wiring; chain opens→barrage→finisher; cumulative
  dmg 93; finisher pushes P2 back Δx≈173; neutral heavy unaffected) + resliced-strip visual pass.
  Regression: `gohan-stage3` 10/0 (shared rekka path), `gotenks-stage1` 23/0, `gotenks-stage2` 19/0.

## STAGE 4 — SPECIALS (DONE — `test:gotenks-stage4` 12/0)

Small 2-move kit — only two special-tier actions exist on the sheet. Owner call (2026-08-23): **ki-blast
built PROCEDURAL**. Routes via `executeGotenksSpecial` (mirrors `executePiccoloSpecial`), dispatched in
`triggerSpecial` (`case "gotenks"`).

- **Ki Blast** (neutral GROUND / AIR) — `abilities.js` GOTENKS_KIBLAST: cost 16, cast pose
  `gotenksKiBlast` `[190,191]`, **PROCEDURAL gold shard** (`spawnProjectile`, w30×h18, speed 20,
  dmg 48→~29 ×offense, gold `#ffe66a`). ★The projectile ART was REFUTED on the sheet (S0) → procedural;
  only the open-hand cast pose is real.
- **Ki Charge** (Down) — GOTENKS_KICHARGE: no cost, cast pose `gotenksKiCharge` `[100,101]` (aura),
  a **resource-build** granting ~60 Ki in 6 steps over the gather window, **no hit**. Answers the
  Stage-0 open item: the charge pose stands ALONE (no beam/nova payoff exists to connect it to).
- **Wiring:** `abilities.js` GOTENKS_KIBLAST/KICHARGE + fireGotenksKiBlast/fireGotenksKiCharge +
  executeGotenksSpecial + `triggerSpecial` case; `characters.js` `specials:` HUD descriptor +
  gotenksKiBlast/gotenksKiCharge cast-pose animationData.
- **Verification:** `test:gotenks-stage4` 12/0 (wiring; Ki Blast casts + spawns procedural shard +
  connects 28 dmg + costs Ki; air Ki Blast; Ki Charge refills +63 Ki with zero P2 damage) + in-engine
  cast-pose shots. Regression: `piccolo-stage4` 23/0, `vegito-stage4` 26/0, gotenks S1/S2/S3 all clean.

## STAGE 5 — ULTIMATE "Super Ghost Kamikaze Attack" (DONE — `test:gotenks-stage5` 12/0)

The sheet's confirmed signature finisher (`[242-265]`) — the ONLY screen-effect content. INLINE
freeze-cinematic on the LIVE fighter (no duplicate; Vegito/IronMan2 pattern): arms-raised windup
(`gotenksGhostWind` `[242-245]`) → ghost-command/throw pose (`gotenksGhostThrow` `[252-255]`) → a
squad of **REAL kamikaze GHOST projectiles** (`gotenks_ghost_uniform` `[258-262]`, 5f sprite) flies
at the frozen foe and self-destructs. Guaranteed **330 raw → exactly 198 EFF** (same top-ult band as
every other ult — NOT a strong outlier despite being the only DBZ-sibling with real ult content).

- **Structure:** `abilities.js` GOTENKS_ULT (cost 100, cinematic 68, windup 16, 3 ghosts at f24/34/44,
  beats 0/100/100/130 = 330 raw) + `applyGotenksUltHit` (guaranteed `applyScaledDamage`, block 25%,
  knockdown on payoff) + `executeGotenksUltimate` (freeze foe via hitstop, camera focus/shake, ghost
  projectiles carry the sheet as visualOnly cosmetics aimed at the foe; beats deliver the damage).
- **Wiring:** `triggerUltimate` `case "gotenks"`; `characters.js` `ultimate:` field (name/cost 100) +
  gotenksGhostWind/gotenksGhostThrow cast-pose animationData.
- **Verification:** `test:gotenks-stage5` 12/0 (casts + spends 100 meter; windup castMove; foe frozen
  hitstop 60; ghost-throw render; ghosts spawn carrying real ghost art; guaranteed 198 EFF out of
  melee range) + in-engine shot (windup pose + BLUE ghosts flying at the foe). ★The brief ~6f windup
  RENDER races harness latency (proven via castMove + data-contract wiring + screenshot, not a flaky
  per-frame assert). Regression: `iron-man-stage5` 11/0 (shared cinematic), gotenks S1-S4 all clean.

## STAGE 6 — PORTRAIT / WIN / LOSE + CANONICAL HARNESS + BALANCE (DONE — `test:gotenks` 47/0)

- **Portrait:** face bust #1 from the top band (`gotenks_portrait.png`, Stage 1) — real anime bust.
- **Win:** ★NO dedicated win art on the sheet (genuine gap). Reuses Gotenks' OWN cocky finger-point
  **taunt** `[181,182]` as a flagged stopgap (NOT borrowed from another character — the prompt's
  no-borrow rule is honored). Flagged as an open art dependency.
- **Lose:** reuses knockdown `[230,231]` (no dedicated lose art — flagged).
- **No intro / no beam** — genuine/expected gaps, noted (not filled).
- **Canonical harness:** `harness/gotenks.test.mjs` (`test:gotenks` **47/0**) — sprite gate/stats/
  portrait, all 28 action sheets resolve (no box), walk borrows idle, a normal connects, the Kamikaze
  Barrage reaches its finisher, Ki Blast (procedural shard) + Ki Charge (resource build), the Super
  Ghost Kamikaze ult (~198 EFF), win/lose render, full fallback-box sweep, no JS errors.
- **Balance:** BALANCE_AUDIT.md entry added. Fair glass-leaning rushdown (Atk88/Def82/Spd94, no stat
  outlier); lean 2-move special kit + ~98 EFF barrage rush + **198 EFF ult pinned to the standard
  top-ult band** — per the prompt's watch, the ult is NOT a strong outlier vs Goku/Gohan (it fills the
  ult slot those two lack, at the same 330→198 band as every other ult).
- **Regression:** `goku` 38/0, `vegito` 46/0, `piccolo` 38/0, `iron-man-stage5` 11/0 all clean;
  `credits` 12/2 = PRE-EXISTING 7-key debt (Gotenks properly attributed, not among them).

## SKINS — Default + 8 recolors + Void Sovereign + SSJ3 homage = 10 (DONE — `test:gotenks-skins` 15/0)

`tools/gen_gotenks_creative.py` (mirrors gen_vegito_creative). ★HEALTH-CHECKED vs the REAL sprite — the
prompt's Section-0 region table was written without inspecting the sheet; corrections:
- **SASH is GREEN**, not "teal/blue-green" (`#0b3e32`/`#176438`); and the **WRISTBANDS are the SAME
  green** (prompt's "wristbands = black" is WRONG) → grouped with the sash, so a "sash" recolor
  recolors both (coherent single accent). **VEST** = small dark-indigo open Metamoran vest (bare chest
  → vest recolors read subtly, inherent to the art). **PANTS** = lavender-shaded white silk. **PADDING**
  = yellow/olive trim (shares hue with gold hair → split by value). Hair(gold)/skin/shoes PROTECTED;
  **boots spatially guarded** from the vest hue (bottom 18% → DARK). No WHITE-glint class (no baked FX
  on the body — the white IS the pants). The Super Ghost Kamikaze GHOST projectile is a separate,
  non-skin-swapped sheet → stays blue on every skin.
- **Regions recolored:** VEST / PADDING / SASH(+wristbands) / PANTS.
- **10 skins:** Group 1 (Crimson Fusion / Verdant Duo / Obsidian Pair / Golden Duo), Group 2 (Violet
  Fusion / Ember Duo / Frostbound Pair / Azure Duo), Void Sovereign (full near-black + NEW
  `drawGotenksVoidAuraOverlay` drifting ghost-wisp motes tied to the Super Ghost Kamikaze motif), and
  **Super Saiyan 3 (homage)** — ★owner decision 2026-08-23: PALETTE-ONLY (brighter electric-gold hair);
  real SSJ3 long-hair silhouette + no-eyebrows is a bespoke art lift, **DEFERRED/flagged** (same caution
  as Aoi Todo Kyoto / Gohan Great Saiyaman).
- **Wiring:** `skins.js` gotenks[] 10 entries (recolorSkinAnim); `game.js` drawGotenksVoidAuraOverlay +
  render-loop dispatch. Credits covered by the existing `gotenks_*.png` glob.
- **Verification:** `test:gotenks-skins` 15/0 (static on-disk sweep 10×(24 sheets+portrait); each skin
  applies + resolves its __tag sheet across idle/heavy/ghost-throw/win, no boxes; Void overlay runs
  clean) + crisp close-ups (hair gold / skin tan / boots dark preserved; sash+wristbands recolor
  together; pants recolor clean; SSJ3 hair visibly brighter). Regression `vegito-skins` 16/0,
  `gotenks` canonical 47/0.
- **Cross-check (roster dup):** Goku & Teen Gohan have NO recolor skins (default only) → no collision.
  Vegito shares the same DBZ-fusion palette FAMILY by design (near-identical hexes), but recolors
  different regions on a distinct silhouette (navy gi vs bare-chest) and IDs are namespaced → no real
  collision, just a shared theme. (When Goku/Gohan skins are eventually built, either embrace or avoid
  this family to prevent look-alikes.)

## BUILD COMPLETE — S0–S6 + SKINS (UNCOMMITTED)

**Follow-ups / open (flagged, not blocking a WIP snapshot):** credits rip-author UNKNOWN (EB family
blocker — MANDATORY before ship); torn-clothing DAZED trigger (item 2, deferred); dedicated win +
intro art (genuine gaps); skins; voice (blocked, no clips); bespoke ghost-explosion FX (procedural now).
