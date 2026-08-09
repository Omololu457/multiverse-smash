# Inosuke Hashibira — Asset Map

> **BUILD COMPLETE (6 stages).** `test:inosuke` full-kit **39/0** (+ per-stage: s1 23/0 · s2 10/0 · s4 16/0 · s5 23/0).
> Height audit: measured **102px = exact target** (0.623×164). Balance verdict: internally-consistent
> aggressive rushdown, no fix needed (BALANCE_AUDIT.md §Inosuke). Shared move-reference architectures
> regression-clean: Skill Hunter + Bandit's Echo 20/0, Transformation Jutsu 25/0, Zenitsu summons 53/0,
> Shinobu 35/0, Nezuko 22/0 (auto-joined the assist roster live). Morpher Call-In tests fail PRE-EXISTING
> (reference `__harness.callInRoster` which has 0 occurrences in committed HEAD — WIP drift, not this build).
> **Portrait:** the master sheet has NO dedicated bust header (all animation frames), so `inosuke_portrait.png`
> is extracted from idle frame 0 (boar-mask bust) — the standard fallback for sprite chars without a header crop.
> **All 19 gameplay files WIRED (0 dropped): 6 movement/state + 10 normals/chain + 3 cinematic specials.**


FOURTH Demon Slayer sprite char (after Zenitsu, Rengoku, Shinobu). rosterKey `inosuke`,
universe `demon_slayer`. No energy meter (Total Concentration, cooldown-gated) like Shinobu.
Signature (Stage 4): **Beast Breathing Assist** — mid-combo partner call that links another
Demon Slayer's real move, then RESUMES Inosuke's own combo.

Canon height 164cm → 0.623×164 ≈ 102px target (HEIGHT_REFERENCE.md). Idle content ~50px →
`spriteScale: 2.0` (trial; Stage-6 audit confirms).

## Reslice pipeline
Raw uploads are variable-width strips with irregular gaps. `tools/reslice_inosuke.py` detects
content islands per column and repacks each into a uniform equal-cell `_uniform.png` sheet.
Horizontal position is normalized (frame centered in its cell); **vertical position is preserved
against one shared baseline** across the strip, so feet stay planted (grounded poses) while the
jump rise / crouch dip in the source art is retained. Engine feet-anchors via `anchorY: 0`.

## File utilization (19 gameplay files + master + portrait)

| File | Dims | Frames | Stage | Wired as | Status |
|---|---|---|---|---|---|
| inosuke_idle.png | 243×54 | 5 | 1 | `idle` (+ `walk` reuse) → inosuke_idle_uniform | ✅ WIRED |
| inosuke_dash.png | 420×59 | 5 | 1 | `dash` (+ `run` reuse) → inosuke_dash_uniform | ✅ WIRED |
| inosuke_dodge.png | 198×56 | 3 | 1 | `dodge` → inosuke_dodge_uniform | ✅ WIRED |
| inosuke_jump.png | 286×104 | 4 | 1 | `jump` + `fall` (frame 2) → inosuke_jump_uniform | ✅ WIRED |
| inosuke_hit.png | 434×55 | 6 | 1 | `hurt` (f0) + `knockdown` (f3-5) → inosuke_hit_uniform | ✅ WIRED |
| inosuke_taunt.png | 198×75 | 3 | 1 | `taunt` → inosuke_taunt_uniform | ✅ WIRED |
| inosuke_foward_double_slash.png | 213×69 | 3 | 2 | `light` → inosuke_light_uniform | ✅ WIRED |
| inosuke_right_foward_slash.png | 378×71 | 4 | 2 | `heavy` → inosuke_heavy_uniform | ✅ WIRED |
| inosuke_up_attack.png | 225×75 | 3 | 2 | `up` launcher → inosuke_up_uniform | ✅ WIRED |
| inosuke_air_down_attack.png | 476×90 | 5 | 2 | `air` (f1-3) + `down_air` (full) → inosuke_airdown_uniform | ✅ WIRED |
| inosuke_down_punch.png | 294×93 | 4 | 2 | Down+Heavy "Beast Fang" → inosuke_downheavy_uniform | ✅ WIRED |
| inosuke_lundge.png | 344×89 | 4 | 2 | flurry B1 → inosuke_b1_uniform | ✅ WIRED |
| inosuke_stabbing_foward_slash.png | 300×76 | 3 | 2 | flurry B2 → inosuke_b2_uniform | ✅ WIRED |
| inosuke_upclose_slashes.png | 309×97 | 3 | 2 | flurry B3 → inosuke_b3_uniform | ✅ WIRED |
| inosuke_dash_double_slash.png | 356×76 | 4 | 2 | flurry B4 → inosuke_b4_uniform | ✅ WIRED |
| inosuke_running_slashes.png | 658×93 | 4 | 2 | flurry B5 finisher → inosuke_b5_uniform | ✅ WIRED |
| inosuke_cenematic_specail_1.png | 581×98 | 6 | 5 | Neutral special "Spinning Beast Slash" → inosuke_cine1_uniform | ✅ WIRED |
| inosuke_cenematic_specail_2_dash_thrust.png | 614×98 | 5 | 5 | Forward special "Dash Thrust" → inosuke_cine2_uniform | ✅ WIRED |
| inosuke_cenematic_specail_4_slashing_lunge_fan.png | 440×133 | 4 | 5 | Down special "Slashing Lunge Fan" → inosuke_cine4_uniform | ✅ WIRED |
| **inosuke_cenematic_specail_3** | — | — | 5 | **GAP — absent from upload (numbering skips 3); reported, not invented** | ⚠️ MISSING |
| inosuke_sprite_sheet__…_degk0kr.png | 768×2008 | — | — | master reference sheet | 📚 ref |
| inosuke_transparent.png | 768×2008 | — | — | master (transparent) reference | 📚 ref |
| inosuke_portrait.png | 150×155 | — | 1 | select-screen bust (extracted from idle f0) | ✅ WIRED |
| zenitsu_inosuke_partner_uniform.png | 201×68 | — | — | **Zenitsu's** Double-Attack summon of Inosuke — NOT used by Beast Breathing Assist | 📚 other-char |

## Stage 5 — cinematic specials (camera push-in → strike → pull-back)
`inosukeBeastCinematic.js` — ONE reusable freeze-cinematic module for all three variants (spin/dash/lunge),
mirroring the Shinobu/Miwa contract but shorter (~1.3s). Direction-branched off the Special button
(neutral/forward/down); damage is RANGE-GATED at the strike beat (whiffable) + shared cooldown (`beastSpecialCd`),
so they're dramatic specials, not guaranteed nukes. `cenematic_specail_3` has NO art → that branch is a
documented gap (Back-special is intentionally unused). Files: inosukeBeastCinematic.js (new), characters.js
(specials + cine animationData), abilities.js (executeInosukeSpecial), game.js (freeze block + draw + clears + cd tick).

## Stage 4 — Beast Breathing Assist (no new art)
Mid-combo partner call. Uses **no Inosuke art** — reads each partner's REAL `characters[key].animationData`
action sheet + `basic_attacks.heavy` damage (the shared real-move-DATA-reference). Partner roster is
data-driven (`getBeastAssistPartners` = demon_slayer sprite chars minus Inosuke → auto-extends for Nezuko).
Per-partner link (`BEAST_ASSIST_MOVES`): zenitsu→forward hit, rengoku→forward flame slash, shinobu→G1 slash;
un-curated new chars fall back to their real `heavy`. `_bba*` namespace; hitstop-freeze preserves the
flurry state → auto-resumes at the next stage. Files: abilities.js, game.js, summons.js (owner-combo attribution).

## Registration gate (Stage 1)
- `characters.js` — `const inosuke = {…}` + export in central `characters` object.
- `skins.js` — `inosuke: [{ id: "default", … }]`.
- `spritesheets.js` — `inosuke: { actions: { idle: "./inosuke_idle_uniform.png" } }` (readiness gate).
- `package.json` — `test:inosuke`, `test:inosuke-stage1`.
- Test-infra: added generic `__harness.forceAction(action, who)` (game.js) — renders any action for
  evidence (dodge has no live driver; taunt needs a 10s Down-hold).

## Notes / reuse decisions
- **walk** → idle sheet (no dedicated walk art; character bobs).
- **run** → dash sheet (beast lope).
- **guard** → idle frame 0 (no guard art; engine draws block FX).
- **fall** → jump sheet frame 2 (airborne apex).
- **intro** → `taunt` (boar-roar flex) for now; Stage 6 may extract a dedicated intro if present.
