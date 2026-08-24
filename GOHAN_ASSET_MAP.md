# TEEN GOHAN — 2-Form Sprite Build — STAGE 0 Asset Map & Investigation Report

**Character:** ONE roster entry (`gohan`), TWO forms — Base / Super Saiyan 2. NOT two roster entries.

**Source:** Dragon Ball Z: Extreme Butoden (3DS), two sheets, shared animation skeleton with
per-form recolor + a few per-form delta clips. Same rip family / same keying convention as the
project's existing EB Goku build ([[goku-4form-build]]).

**Status:** ✅ **CHARACTER FULLY COMPLETE (Stages 0–6)** — canonical `test:gohan` **30/0**. (This header block
dates from Stage 0; the per-stage sections below are the current record.)

---

**Status (original Stage 0):** STAGE 0 COMPLETE — investigation + report only. **NO gameplay code written.**
Verified 2026-08-23 by first-hand pixel pass (montage tool + 16 full-res grey-keyed band strips +
1 independent visual-audit subagent + a programmatic lavender-scan). Most pre-stated claims
corroborated; **two soft spots were REFUTED / not corroborated** and are flagged honestly below
(lavender flash frame; two-hand ki-charge pose) — they are NOT rubber-stamped.

**Roster reconciliation:** No existing `gohan` entry in `characters.js` / `spritesheets.js` — this is
a clean NEW character (contrast Goku, which re-scoped a procedural placeholder). Nothing to reconcile.

---

## SOURCE SHEETS (teal-keyed, green per-frame cells)

Both are RGBA but fully opaque (alpha=255). Background is teal `(0,128,128)`; every sprite frame
sits in its own green cell `(0,255,80)`. Key BOTH to transparent when slicing (identical to EB Goku).

| Form | File | Size (WxH) | Boxes* |
|---|---|---|---|
| Base (black hair, purple Cell-saga gi) | `3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Teen Gohan.png` | 1546 × 6838 | 274 |
| Super Saiyan 2 (gold hair, same gi) | `3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Teen Gohan (Super Saiyan 2).png` | 1550 × 7271 | 278 |

\* connected-component count (includes FX arc fragments / flash frames), not the final animation count.

**Tooling built this stage (Stage-0 only, no engine code):**
- `tools/gohan_montage.py <base|ssj2> [all|idx-list] [out.png]` — teal+green-keyed contact sheets
  (`gohan_<form>_montage.png`). Mirrors `tools/goku_montage.py` exactly.
- Full-res band strips in `/tmp/gohan_strips/<form>_NN_yA-B.png` (8 per sheet) — the audit substrate.

---

## SHARED SKELETON (Stage 1 — applies to BOTH forms via recolor)

Confirmed present and matching across both sheets (verified in strips `*_00`–`*_02`, `*_06`, `*_07`):

- **Idle** — real breathing loop, ~2 variants (`base_00`/`base_01` top-left column).
- **Guard / block** + **guard-hit reaction** — crossed-arm brace + recoil (`base_01`, `base_06`).
- **Crouch.**
- **Jump** — tuck + fall frames (`base_01`, `base_06`).
- **Dash / Run** — real alternating-leg stride, ~9 frames (`base_02` long row). **No separate slow
  Walk** — same shape as Goku / Iron Man 3 elsewhere; not a gap.
- **Hit-reaction → knockdown → lying (prone/back) → sitting-up → rising** — full KO/getup chain,
  complete (`base_07` top cluster). Real art; nothing to fake.
- **On the SSJ2 sheet this same KO chain is where SSJ2→Base reversion occurs** (see Stage 5 /
  Stage 0 item 4) — build the KO chain and the SSJ2 revert as ONE connected system, not two.

---

## NORMALS LIBRARY (Stage 2 — shared skeleton, per-form recolor)

Physical-strike library confirmed on the base sheet (recolored on SSJ2), spanning strips
`base_01`–`base_05`. Includes: jump-in / diving punch, overhead double-fist smash, jab/cross
combo, **flying kick w/ white-crescent VFX arc** (`base_03`, `base_04`), spinning backhand, elbow
combo, **sweep kick** (purple motion-blur streak, `base_03`), airborne launcher / rising spin
attack (arm-up, `base_04`), lunge/dash punch + long-reach dash kick (`base_01`/`base_02`), aerial
punch / aerial spin-kick w/ trail, rising kick w/ speed trail, standing punch combo, diagonal
downward strike. ~19 distinct attack poses, several 1–2 frames; launcher/aerial set overlaps.
Chain order/cancel points are NOT verified here — that is Stage 3's job.

### ⚠ Two-hand overhead ki-charge pose — REFUTED / NOT ISOLATED (open item)
The prompt asks to confirm a "two-hand overhead ki-charge gathering pose." **Neither the first-hand
pass nor the independent subagent could isolate a distinct two-hands-overhead energy-gathering
frame** on either sheet. The arms-raised frames that exist read as **either the victory cheer
(`base_07`) or uppercut/launcher follow-throughs** within combos. → Do NOT place a dedicated
"ki-charge" normal on the strength of a pose that isn't clearly there. Treat as **OPEN**: revisit
with the owner at Stage 2; the most likely real home for any "gather" frames is the Base→SSJ2
transform windup (Stage 5), not a standalone attack.

---

## SPECIALS (Stage 4) — NONE CONFIRMED (flag, do not invent)

**No Kamehameha charge stance, no beam/projectile graphic, no Ultimate/nova cinematic exists on
EITHER sheet** — confirmed by first-hand full scan of all 16 strips, an independent subagent
scan, and the absence of any free-flying energy art (the only "energy" marks are melee swipe arcs
attached to punches/kicks). Same gap shape as Goku's build. → Gohan is **melee/normals-only**;
**FLAG to owner at Stage 4** rather than inventing a ranged substitute. (Prompt Stage 4 says
exactly this.)

---

## TRANSFORMATION SYSTEM (Stage 5 — the core mechanic)

| Transition | Source | Verified content |
|---|---|---|
| **Base → Super Saiyan 2** | Base sheet, bottom of `base_04` → top of `base_05` | Mid-air tumbling/spinning poses, black hair shifts to **gold**; ~6–10 frames spanning the band boundary. **CONFIRMED.** |
| **Super Saiyan 2 → Base** | SSJ2 sheet, `ssj2_07` KO cluster | Gold-hair knockdown/tumble → lying → hair reverts to **black**, rises in Base form — **the reversion happens INSIDE the KO/defeat chain.** **CONFIRMED.** |
| **Full Base↔SSJ2 cycle** | SSJ2 sheet, `ssj2_07`, a SEPARATE standing row | A distinct upright row that visibly cycles **gold→black→gold** (figures braced/standing, NOT lying) — distinct from the KO-revert chain. **CONFIRMED present.** |

**Open triggers (Stage 0 items 2 & 4 — confirm before wiring at Stage 5):**
- **Item 2 — full-cycle clip trigger context UNRESOLVED:** the gold→black→gold standing row exists,
  but whether it is the actual in-combat transform path or a separate dramatic cinematic is NOT
  decidable from the art. Same open question as Goku's full-cycle clip — do not assume.
- **Item 4 — is knockdown the ONLY revert path?** The SSJ2→Base revert is confirmed to live in the
  KO chain. No clearly separate *player-initiated* revert animation was isolated. Do NOT synthesize a
  player-revert from unrelated frames; confirm with owner whether revert should be KO-only or whether
  the standing cycle-row doubles as a voluntary revert.

---

## PER-FORM DELTAS / EFFECT FRAMES

### Lavender single-tone flash frame (Stage 0 item 3) — CONFIRMED PRESENT ✅ (Stage-0 report was WRONG; corrected at Stage 1)
The prompt states the "lavender flash-frame convention is confirmed present here too (3rd
ready-stance tier)." **The initial Stage-0 report incorrectly said "not corroborated." That was an
error and is retracted.** During Stage-1 index-picking, the ready-stance tier row was found at
boxes **[6]/[7]/[8]**: `[6]` = normal palette (meanRGB ≈ `[97,40,84]`), `[7]` = dim/dark tier
(`[70,54,44]`), **`[8]` = a flat pale BLUE-LAVENDER single-tone flash frame (`[104,92,139]`,
blue-dominant)** — visually confirmed by zoom (the whole figure — hair, gi, skin — rendered in one
desaturated periwinkle wash). Why the three earlier passes missed it: (1) my first-hand zoom cropped
the wrong column (x0–90; the tiers sit at x151–220), (2) the subagent scanned band strips where the
3-cell tier row is easy to read past, (3) the programmatic scan threshold (R>140,B>150) was too
strict — the actual flash is darker (`R104/B139`). **So the cross-character lavender-flash convention
DOES hold for Gohan.** It is a cosmetic effect frame → wired at Stage 6, not Stage 1.

---

## PORTRAITS / WIN / LOSE / INTRO (Stage 6)

- **Portraits (top of each sheet, `*_00`):** 1 chibi full-body emote cell + 5 rectangular
  photo-style busts (calm / determined / shout intensity). Per-form recolored (black vs gold hair).
- **WIN — CONFIRMED on Base only (`base_07`):** an arms-raised cheer/celebration cluster (~4–6
  frames) adjacent to the cape frames. (Note: unlike Goku, a distinct hand-behind-head grin was NOT
  separately isolated — the confirmed content is the arms-up cheer.) **No win/celebration pose on the
  SSJ2 sheet** (scanned all 8 gold strips). → Victory renders in **Base** form regardless of ending
  form. **STATED ASSUMPTION** carried from Goku precedent — an inference, not a sheet-confirmed fact;
  **comment as such in code.**
- **INTRO — CONFIRMED on Base only (`base_07`):** a ~8–10 frame **cape-reveal** — Gohan handles /
  flings a **white weighted cape** (Cell-saga cape-doff), ending in plain gi. **No equivalent on the
  SSJ2 sheet.** Per the prompt this is treated as a **genuinely separate open question** (NOT
  inherited from the Win logic): build intro as **Base-form-only, flagged tentative**, pending the
  recommended follow-up check of Goku's sheets for intro content before treating "transformed forms
  lack an intro" as a real cross-character pattern. (Goku's own asset map did NOT separately
  catalogue intro content — so the pattern is currently unchecked, as the prompt notes.)
- **LOSE:** reuse the knockdown/lying frames (KO chain is real on both forms).

---

## CLAIM VERIFICATION SUMMARY

| # | Claim (from prompt) | Result |
|---|---|---|
| S0-1 | No Kamehameha charge / no beam / no Ultimate on either sheet | ✅ CONFIRMED (2 independent scans) |
| S0-2 | Full Base↔SSJ2 cycle clip exists; trigger context unresolved | ✅ CONFIRMED present; trigger genuinely open |
| S0-3 | Lavender flash frame present (3rd ready-stance tier) | ✅ **CONFIRMED** at box [8] (Stage-0 "not found" was an ERROR, retracted at Stage 1) |
| S0-4 | SSJ2→Base revert occurs during knockdown/defeat | ✅ CONFIRMED (in the KO chain); player-revert NOT found |
| — | Shared skeleton (idle/guard/crouch/jump/dash/KO) matches both forms | ✅ CONFIRMED |
| — | ~19 shared normals + crescent/sweep VFX arcs | ✅ CONFIRMED |
| — | Two-hand overhead ki-charge pose | ❌ **NOT ISOLATED** (open) |
| — | Base→SSJ2 mid-air tumble (black→gold) | ✅ CONFIRMED (`base_04`→`base_05`) |
| — | Win (Base only) / cape-reveal intro (Base only) | ✅ CONFIRMED (SSJ2 has neither) |
| — | Portraits: 1 chibi + 5 busts per form | ✅ CONFIRMED |

---

## LOCKED CUTS / DECISIONS (per prompt, corroborated by audit)

1. **No ranged special / no Kamehameha** — melee-only kit; flag at Stage 4 (do not invent).
2. **No Ultimate / screen-clear cinematic** — none exists; transformation is the power ceiling
   (same as Goku).
3. **Two forms only** (`base` / `ssj2`) — one roster entry, shared skeleton + per-form recolor.
4. **Win always resolves to Base** (inference, comment as such); **intro Base-only, tentative**
   pending the Goku-sheet intro follow-up.

---

## DEFERRED / OPEN (confirm before wiring the relevant stage)

- **Lavender flash frame** — CONFIRMED present at box [8] (Stage-0 error corrected); wire as cosmetic effect frame at Stage 6. *(item 3)*
- **Two-hand ki-charge pose** — not isolated; likely transform-windup not a normal (Stage 2/5).
- **Full Base↔SSJ2 cycle clip trigger** — cinematic vs in-combat path undecided (Stage 5). *(item 2)*
- **SSJ2→Base revert** — confirmed KO-only in art; confirm whether a voluntary/player revert is
  intended before building one (Stage 5). *(item 4)*
- **Intro pattern** — needs the recommended follow-up check of Goku's sheets for intro content
  before "transformed forms lack an intro" is treated as a confirmed cross-character rule.
- **Balance** — another melee-only, no-ranged-special Dragon Ball character; flag at Stage 6 whether
  melee-only needs compensation, same open question raised on Goku's build. Regress vs `BALANCE_AUDIT.md`.

---

## STAGE 1 — REGISTRATION + MOVEMENT (DONE — `test:gohan-stage1` 21/0)

**Scope:** BASE form only (default). SSJ2 recolor of this skeleton + revert-on-knockdown wiring =
Stage 5 (the transformation table above). New char `gohan` — clean add.

- **Tool:** `tools/reslice_gohan.py` — standard EB green+teal key (no green-skin hazard), box
  ordering IDENTICAL to `gohan_montage.py` (so montage indices = reslice indices), `FLIP_H=True`
  (EB rip faces LEFT → mirror to face RIGHT), feet-aligned uniform cells, anchorY 0.
- **Registered:** `characters.js` (full `gohan` object), `spritesheets.js` (idle gate),
  `skins.js` (default only — SSJ2 is a TRANSFORM not a skin), `credits.js` (SOURCED_ART entry;
  rip-author UNKNOWN — attribution TODO before ship, mirrors Piccolo). **HP 1200 / EN 200 /
  Def 84 / Spd 92 / scale 1.20 / energyType "ki" / melee-only.** Teen → idle renders **106px**
  (measureSprite), just under the ~111px adults.
- **Frame picks (base sheet, montage indices):** idle `[13,14,15]` (fists-up breathing loop; `[12]`
  dropped as a taller enter-stance outlier) · walk `[43-46]` · run `[43-47]` · **real stride cycle,
  Gohan has locomotion (contrast Piccolo/Frieza borrow-idle)** · dash `[42]` (fwd lunge) · jump
  `[31-33]` · fall `[34]` · crouch `[24]` · guard `[22,23]` · hurt `[245,246]` · knockdown
  `[238,239]` · getup `[242,243]` · taunt `[17,18,19]` · portrait = face bust #1.
- **Verification:** `test:gohan-stage1` 21/0 (sprite gate, scale, HP/EN, Ki label, height band,
  every action resolves a real `gohan_` sheet, no JS errors). **Independent subagent VISUAL pass on
  all 11 in-engine shots:** clean render (no teal/green box, no fallback box, no clipping),
  faces RIGHT, feet planted, poses match names, human-scale. Regression: `piccolo-stage1` 21/0,
  `credits` 12/2 (2 PRE-EXISTING, gohan properly attributed — not added to the 7-key debt).
- **Reserved for later stages (base-sheet indices, from Stage-0/1 scan):** normals in `[36-135]`
  band (crescent/sweep VFX arcs); Base→SSJ2 transform tumble straddles `[~155-175]`; win + cape
  intro in `[247-273]`. Exact per-move picks resolved at their stages.

---

## STAGE 2 — NORMALS (DONE — `test:gohan-stage2` 17/0)

5 normals ×0.60 (GLOBAL_DAMAGE_SCALE), base-sheet art (SSJ2 recolor = Stage 5). down_air HONESTLY
reuses air (project pattern). Damage measured in-engine: light **24** (40×.6) / heavy **46** (78×.6)
/ up **34** (58×.6).

- **light** `[78]` — jab, upright lead arm extended FORWARD at shoulder height.
- **heavy** `[91,92]` — diving/lunging punch, long reach (#92 = 110px wide, cock → drive).
- **up** `[123]` — rising uppercut LAUNCHER, fist raised ABOVE head.
- **air** `[84]` — airborne extended kick. **down_air** = reuse air.

**★ PICK-CORRECTION LOG (the launcher was hard — three wrong picks before the right one):** first
picks `light[72]`/`up[121-123→held 123]` FAILED the in-engine visual (rendered as passive
fists-at-face crouch). Re-pick `light[78]`/`up[88,89]` — light PASSED, **up[88,89] still tucked
(strip-art confirmed)**. Root-caused the launcher with an **objective pixel analysis**: box `[123]`
has skin (a fist) at the very TOP content row — **35% of all skin pixels in the top 12%**, by far
the highest of any candidate → a genuine fist-above-head uppercut. (Small-scale subagent reads were
unreliable and self-contradictory; the pixel metric was ground truth.) The original in-engine
"tucked" read of `[123]` was a **capture artifact** — the launcher's `selfVy:-9` hops Gohan
airborne (small/high) before the post-move screenshot. Fixed the harness to shoot at the **active
frame while grounded**; final in-engine verify then PASSED all three (up=fist-above-head, light=fwd
jab, heavy=long-reach). **Lesson: for pose-shape validation, trust pixel silhouette metrics over
small-sprite visual reads, and capture attack shots during the active frame.**

- **Two-hand ki-charge pose:** confirmed absent from the normals band (index audit) → NOT placed as
  a normal; still flagged OPEN (likely a Stage-5 transform windup).
- **Reserved for Stage 3 command chain:** crescent flying-kick `[96,97]`, spin-backhand `[62,63]`,
  sweep `[143]`.
- **Verification:** `test:gohan-stage2` 17/0 + subagent in-engine visual sign-off (all 6 poses
  clean/face-right/correct-intent, up re-verified). Regress: `gohan-stage1` 21/0, `piccolo` 38/0,
  `up-attack-roster` 77/2 (2 PRE-EXISTING, gohan not covered).

---

## STAGE 3 — COMMAND CHAIN (DONE — `test:gohan-stage3` 10/0)

**"Rush Combo"** — Fwd+Heavy 3-stage rekka, cancel-on-HIT, mirrors `updateGokuCommandCombat` /
`updatePiccoloCommandCombat`. Wiring: `GOHAN_CMD` + `updateGohanCommandCombat` in `abilities.js`,
dispatch + `gohanCmd` probe in `game.js`, `gohanRush1/2/3` animationData.

- **rush1** `[143]` — advancing forward PUNCH opener (dmg 42).
- **rush2** `[96]` — crescent sweep KICK, blue/tan motion-arc (dmg 50).
- **rush3** `[124]` — big spin-roundhouse LAUNCHER finisher (dmg 84, `launcher:true`, knockbackY −9).

Chain: Fwd+Heavy opens rush1 → re-tap Heavy during recovery-after-connect cancels into rush2 →
rush3. Whiff/block ends it. Neutral Heavy stays the normal `heavy` lunge-kick. Cumulative
**101 dmg**, launches P2 (vy ≈ −24). ★Balance-watch at Stage 6 (a 3-hit launcher combo; in line with
Piccolo/Goku rush chains).

**★ PICK-CORRECTION LOG (art audit caught 2 defects):** first picks `rush1[90,92]` /
`rush2[96,97]` FAILED the in-engine + objective-facing audit — `[90,92]` are KICKS/wind-ups (not a
punch), and **`[97]` attacked LEFT (wrong-way after the uniform FLIP_H)**, caught by an objective
"reach-side" pixel metric (box 97 reached 64% LEFT of centroid vs the others' ~58% right). Re-picked
`rush1[143]` (clean forward-right punch), `rush2[96]` single (right-facing crescent). Final subagent
verify: rush2/rush3 unambiguous, in-engine launcher connects; **rush1 `[143]` reads as a committed
forward-right lunging strike — MARGINAL as a "textbook horizontal jab" (slight torso-left lean) but
right-facing/clean/distinct → accepted, cosmetic caveat noted.** (Also learned: `[90,92]`/heavy are
lunging KICKS, not punches.) ★Lesson reinforced: some EB frames face the opposite direction — the
uniform FLIP_H makes them attack backward; screen every attack pick for reach-side.

- **Verification:** `test:gohan-stage3` 10/0 (wiring, full chain open→cancel→cancel→launcher,
  cumulative dmg, launch, neutral-Heavy-not-chain, no JS errors) + subagent in-engine/strip visual
  sign-off. Regress: `gohan-stage1` 21/0, `gohan-stage2` 17/0, `piccolo` 38/0, `goku-stage3` 10/0.
- **Reserved (unused):** spin-backhand `[62,63]`, sweep alt `[143 used]`, crescent flying-kick
  `[97 dropped — wrong-way]`.

---

## STAGE 4 — SPECIALS (DONE — `test:gohan-stage4` 8/0)

**★ MELEE-ONLY — the ranged gap is FLAGGED, not faked.** No beam/charge/Ultimate art exists on either
sheet (confirmed twice: Stage-0 dual audit + subagent full-scan). Per the prompt ("flag rather than
invent"), **no ranged/energy special was invented.**

**Owner decision (2026-08-23):** keep ONE melee special (Goku-parallel — Goku kept Dragon Fist).
→ **"Meteor Kick"** — a committed forward-lunging flying kick (Ki cost 35, dmg 130 → **78 EFF**,
big forward lunge `vx=facing*7`, camera focus + shake, hard knockback `kbX 12 / kbY −5`). Any special
input fires it. Logic: `executeGohanSpecial` (mirrors `executeGokuSpecial`), dispatch `case "gohan"`.

**★ ART = HONEST REUSE of `gohan_heavy_uniform`** (the validated lunging-kick), exactly like Goku's
Dragon Fist reuses the heavy sheet. **PICK-CORRECTION LOG:** a dedicated frame was attempted first —
`[48→133]` — but FAILED audit: **`[48]` faced LEFT after the uniform flip** (wrong-way), and objective
skin-position analysis showed **`[133]`'s fists are upper-mid/left (a wind-up), not a low-forward
hammer** (the first subagent over-read it; the pixel metric + a second subagent agreed it's a
wind-up). No clean dedicated special frame exists on the sheet → reuse the validated heavy art, and
get the "special" feel from mechanics. Feels distinct in play (lunge/camera/knockback) despite
sharing the pose. `gohan_special_uniform.png` slice removed as an orphan.

- **Verification:** `test:gohan-stage4` 8/0 (wiring, no-beam-anim, fires `meteorKick`, renders sheet,
  connects 78 dmg, **spawns NO projectile = melee-only proven**, no JS errors) + subagent in-engine
  sign-off (mid-lunge flying kick, faces right, hitbox on foe). ★Harness shoots the special at the
  active frame (the lunge is quick → a late shot lands on neutral recovery — same capture-timing
  lesson as the Stage-2 launcher). Regress: `goku-stage4` 7/0, `gohan-stage2` 17/0, `gohan-stage3` 10/0.
- **No Ultimate** (none on the sheet) — the Base↔SSJ2 transform (Stage 5) is the power ceiling.

---

## STAGE 5 — TRANSFORMATION: Base ↔ Super Saiyan 2 (DONE — `test:gohan-stage5` 16/0)

The character centerpiece. Same charge-transform architecture as Vegeta SSJ / Goku (threshold-gated
charge-RELEASE entry, continuous Ki drain, FULL gold art form-swap via `_skinAnim`).

**★ OWNER MODEL (2026-08-23) = ART-FAITHFUL, NO player tap-revert.** Enter: hold CHARGE, release at
Ki ≥ 120 → SSJ2. Boost: **dmg ×1.30 / spd ×1.15 / def ×1.10** (a big SSJ2 jump, above Vegeta's SSJ).
Drain: **0.20 Ki/frame**. Revert — only TWO ways (resolves Stage-0 item 4): **(1) Ki → 0 (auto)**,
**(2) KNOCKDOWN** (the SSJ2 sheet shows SSJ2→base during the KO/defeat sequence, so getting knocked
down reverts the form). **No manual tap-revert** — entering SSJ2 is a commitment.

**Wiring:** `abilities.js` — `enterGohanSSJ2` / `revertGohan` / `applyGohanFormSystem` (revert-on-
`knockdownState` + `tickSustainedFormDrain`) + `GOHAN_SSJ2_ANIM` (gold overlay on base animationData).
`characters.js` — `transformationOrder:["base","ssj2"]` + `transformations.ssj2`. `game.js` — charge
dispatch branch (enter-only, no revert branch), `applyGohanFormSystem` per-frame call, `revertGohan`
added to all 3 round-reset lists, + `p1GohanTransform`/`p1GohanForm`/`p1GohanRevert` harness probes.

**Art (Stage 5):**
- **Morph** = the REAL mid-air black→gold tumble (base sheet `[167,169,171,173,175]`, gold onset at
  `[169]`) → `gohan_transform_uniform.png`. Plays once on entry (Vegeta-morph slot) + doubles as intro.
- **SSJ2 gold form** = the real gold sheet, re-sliced. ★The SSJ2 sheet's taller gold hair SHIFTS the
  box ordering — **base indices do NOT align** (verified: every index differs), so all 18 SSJ2 actions
  were **independently index-mapped** (subagent pass) then sliced: idle `[52-54]` / walk-run `[24-28]` /
  dash `[50]` / jump `[37,38]` / fall `[40]` / crouch `[41]` / guard `[55,56]` / hurt `[232,233]` /
  knockdown `[253,254]` / getup `[243,244]` / light `[96]` / heavy `[89,90]` / up `[124]` / air `[100]` /
  rush1 `[132]` / rush2 `[123]` / rush3 `[141,142]`. down_air + meteorKick reuse gold air/heavy (as base does).

**★ FULL-CYCLE CLIP (Stage-0 item 2) — DECISION: NOT wired.** The gold→black→gold continuous clip's
trigger context was genuinely unresolved (cinematic vs in-combat). The single-step black→gold morph +
the KO-revert already implement the whole transform loop, making the full-cycle clip **redundant** →
left unused (deferred flavor, not needed for the mechanic). Documented, not faked.

- **Verification:** `test:gohan-stage5` 16/0 (wiring, below-threshold GATE, enter + stat boost + morph,
  gold-idle renders `gohan_ssj2_idle`, drain→auto-revert at Ki 0, KNOCKDOWN→base revert, no-tap-revert,
  no JS errors) + **subagent in-engine sign-off**: gold form renders clean & right-facing, morph plays
  (tumble + gold flash), ko_revert shows black-hair base, **all SSJ2 attack frames strike RIGHT** (the
  facing-metric flags on light/up/rush1 were false alarms — metric noise on thin-limbed poses). Regress:
  `vegeta-ssj` 76/0, `piccolo` 38/0, `goku-stage5` 21/0 (shared reset-list/charge-dispatch edits clean).

---

## STAGE 6 — PORTRAIT / WIN / LOSE / INTRO + HARNESS + BALANCE (DONE — canonical `test:gohan` 30/0)

**CHARACTER FULLY COMPLETE.**

- **WIN** `[254,255,256]` — a triumphant hunched fighting stance. ★The prompt (and the Stage-0 read)
  expected a **9-frame arms-raised CHEER** — a detailed montage audit found **NO arms-up cheer and NO
  hand-behind-head grin on the sheet** (stated art ≠ reality). The victory art is only this stance +
  a kneel/bow `[257-259]` (excluded — reads as exhaustion). Base form, used regardless of ending form
  (STATED ASSUMPTION carried from Goku — an inference, commented as such). Subagent-verified: confident,
  right-facing, non-defeated, clean.
- **INTRO** `[260-267]` (`introPool: ["gohanIntro"]`) — the REAL Cell-saga cape-reveal: worn `[260]` →
  held/flung `[261-264]` → plain gi `[265]` → shoulder-flourish `[266,267]`. **Base-form only** (the
  SSJ2 sheet has NO cape frames — Stage 0). Subagent-verified. ★Stage-0 follow-up (Goku-sheet intro
  check): moot — the cape-reveal is base-sheet-only art (SSJ2 has no cape), so intro is necessarily
  base-only regardless of any cross-character pattern; Goku wears no cape at all.
- **LOSE** = reuse `gohan_knockdown_uniform` (no dedicated lose art — flagged).
- **PORTRAIT** = the Stage-1 anime face bust (kept; an SSJ2-face portrait is a deferrable refinement).
- **Canonical harness** `harness/gohan.test.mjs` (`test:gohan` **30/0**) — sweeps S1 gate/stats, S1
  movement sheets, S2 normals connect, S3 rush chain, S4 Meteor Kick + no-projectile, S5 SSJ2
  enter/gold-art/drain-revert/KO-revert, S6 win/lose/intro wiring, full fallback-box sweep, no JS errors.
- **BALANCE_AUDIT.md** — full entry appended: **FAIR — melee-only agile rushdown bruiser; SSJ2 transform
  is the power ceiling (art-faithful commitment, knockdown-cancellable).** The prompt's melee-only
  compensation question is answered: **melee-only does NOT need ranged compensation** — high mobility
  (Spd 92) + the SSJ2 transform ARE the compensation (a deliberate in-your-face rushdown identity).
  Primary watch-item: SSJ2 ×1.30-all-stats (Ki-bounded ~16s + no-early-exit + KO-cancellable → not an
  outlier); knobs listed (drain → threshold → mult, offense last).
- **Regression:** `test:gohan` 30/0, `gohan-stage1/2/3/4/5` 21/17/10/8/16, `vegeta-ssj` 76/0, `vegeta`
  72/0, `piccolo` 38/0, `frieza` 31/0, `goku` 38/0, `goku-stage6` 8/0, `credits` 12/2 (2 PRE-EXISTING;
  gohan properly attributed, not added to the debt).

## FOLLOW-UPS (optional / post-ship)
- **★CREDITS BLOCKER** — sprite-rip author UNKNOWN; `credits.js` carries a flagged placeholder.
  Attribution is MANDATORY before ship (mirrors Piccolo/Frieza).
- Skins (Default only wired); voice (blocked — no clips); SSJ2-face portrait upgrade.
- Two-hand ki-charge pose — still not isolated (never wired; likely a transform windup, harmless gap).
- Full-cycle transform clip — left unwired (redundant); could drive a dedicated transform-in cinematic later.
