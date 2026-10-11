# naruto_seventh — PHASE 4 PLAN + "use the entire sprite" AUDIT
(saved 2026-10-09; Phases 1-3 committed+pushed; Phase 4 PAUSED pending (a) Gaara session settled → clean tree, and (b) fresh session → image-QA restored)

## COMMITTED SO FAR (on origin/main, ancestors of gaara's d4685b0d)
- Phase 1 `dfbb6fe7` — base body, normals, Rasengan/Rasenshuriken/Doton/Throw, Gamabunta ult, plumbing
- Phase 2 `45667b04` — Kurama-Bond meter, Red Chakra, Four-Tails Rampage
- Phase 3 `a3704d23` — KCM golden transform, KCM kit, bigger Bijuudama

## USER'S 4 CHANGE REQUESTS (2026-10-09) + reconciled design
1. **Gamabunta: ultimate → SPECIAL.** → move to **Down+Special (ground)**, mirroring naruto_hokage.
   Throw Weapon → **air Down+Special** (air kunai) so it isn't lost.
2. **Ultimate → Bijuudama with the two nine-tails (Kurama) heads + sphere**, like naruto_hokage.
   Access = **KCM-only** (user's explicit pick); in base the ultimate is unavailable until KCM.
   (Reconciles their typed "Gamabunta = just a special" with the "KCM-only ultimate" picker answer.)
3. **Fix transformation sequences** (user picked ALL): play FULL animation start-to-finish; KCM
   single-frame "glide" looks wrong; wrong/missing frames — re-slice so full morph shows.
   ★ USER RULE: in a transformed state, if there is NO specific anim for an action (walk/attack),
     DO NOT substitute another animation. Use ONLY frames specific to that transformation.
     (So committed forms stay committed; don't fake locomotion/attacks from unrelated frames.)
4. **Use the entire sprite** (confirmed: ALL actions, full frames) — audit below.

## "USE THE ENTIRE SPRITE" AUDIT — under-used / unused H-sheet sections
(H = naruto_hokage_jus_sprite_sheet_by_padakun_dc5gkda.png, 1344x4616; keyed-scan y-bands)
| Section (keyed y) | Current state | FIX |
|---|---|---|
| Damage/hurt (y816-929) | `hurt` plays only **3 of 7** frames | set hurt→7 (or hurt + a real knockdown split) |
| Combo 1 Air (y1208-1456, x<312) | **DROPPED** — substituted Strong-Air | wire as the base AIR combo (sheet has 8-9f) |
| Forward Strong (y1852-1908, 4f) | `n7StrongFwd` sliced but **never wired** | wire as Fwd+Heavy command normal |
| Bijuudama body (y3721-3867, golden air-throw) | **unused** — used a static golden stance | use as the Bijuudama ult CAST pose (2-3f) |
| Win-row 2 FX (y4384-4455, ~4f) | **unused** — only used row-1 burst | complete the base→gold KCM morph FX |
| KCM locomotion | single frozen golden stance ("glide") | per USER RULE: transformation-specific only; no borrowing |
| Intro Fx hat (2f, y347-412 right) | unused (OPT-IN) | optional |
| Oiroke heart FX | unused | optional |
| Title/credits/bracket/stray trap line | correctly EXCLUDED | n/a |

## REMAINING PHASE-4 FEATURES (original brief)
- **Rikudou apex** (Bond 4, KCM + Down+Ultimate): Sp6 committed 27-frame apex combo + CODE-DRAWN entry
  flash; once per round (`_n7RikudouUsed`, cleared in revertNarutoSeventhState); ends in Base + resets Bond.
  NOTE: with ult now = Bijuudama (neutral, KCM) / Rikudou (Down, KCM) — the _ultVariant "D"→rikudou stamp
  already shipped in Phase 3; just wire n7Rikudou in executeNarutoSeventhUltimate.
- **Oiroke opt-in** (default OFF, brutality-toggle pattern): short distraction move. Pattern =
  game.js `brutalityFx`/`setBrutalityFx` + localStorage "ms_oiroke_enabled" + options-screen toggle rect
  + taunt hook (updateTauntState, needs animationData.taunt). Gate `if(!oirokeEnabled) return false`.
- **6 palette skins** (BASE-only recolors): project uses PRE-GENERATED recolored sheets
  (recolorSkinAnim(rosterKey, tag) → `base__<tag>.png`; retagFormAnim only swaps PATHS, no render-LUT).
  Build gen_naruto_seventh_recolor.py (HSV tone-map the orange outfit → 6 hues from the Color-Paletes row,
  y205-292, 6 swatches x11-237) producing naruto_seventh_<action>__<tag>.png for BASE body sheets ONLY
  (NOT kcm/fourtails/rikudou — those are mode-specific colors). 6 skins.js entries via a BASE-only retag.
- **Final ledger**.

## ENGINE HOOKS (mapped, ready to use)
- Form swap: `fighter._skinAnim` (sprite.js _getActionDef checks it first; null=base). applySkin sets it.
- Charge→KCM: game.js handleChargeRelease ~6731 (wasHeld/wasTap).  No-block gate: game.js ~7496 `_n7KCMNoBlock`.
- Ult variant stamp: game.js ~7883 (naruto_seventh branch already added: D→rikudou else bijuudama).
- Ultimate crop (auto): game.js triggerUltimateCrop fires on isUltimate hitstop≥24.  Stage width: getWorldWidth(context).
- Once-per-round reset: revertNarutoSeventhState (abilities.js) — called every round via resetRound (game.js ~3834).
- Brutality toggle: game.js 641-642 brutalityFx/setBrutalityFx; UI rect ~16910/17045/17971; gate `if(!brutalityFx)`.
- Taunt: game.js updateTauntState(fighter, !!inputState.down) ~7438; needs animationData.taunt.
- Recolor skins: skins.js recolorSkinAnim (55-62) + getSkinAnimationData (2442) + applySkin (game.js ~2092).

## ART PREP DONE (untracked / parked on wip branch)
- naruto_seventh_rikudou_uniform.png  (27f, 82x68, dark/gold, 0 fringe) — VERIFIED
- naruto_seventh_oiroke_uniform.png   (8f, 46x77, skin-tone, 0 fringe) — VERIFIED
- naruto_seventh_aircombo_uniform.png (8f, 186x83) — ★UNVERIFIED (image-QA blocked; wide cell — re-check/re-slice)
- naruto_seventh_bijuudama_cast_uniform.png (2f, 128x68, golden) — ★UNVERIFIED (expected 3; re-check)
- naruto_seventh_kcm_burst2_uniform.png (4f, 315x66, gold FX) — ★UNVERIFIED (wide cell; re-check)
- Slicer: naruto_seventh_work/slice7.py (+ key_tool.py). H_keyed.png in work dir.

## RESUME CHECKLIST (next session)
1. Confirm Gaara session committed/stopped → `git status` tracked-clean; `git fetch` + `git merge --ff-only origin/main`.
2. Restore the wip-parked art into the working tree (or it's already in repo root if same checkout).
3. Re-QA the 3 UNVERIFIED slices (view magenta composites); re-slice if wide-cell merging confirmed.
4. Apply code changes surgically; stage ONLY naruto_seventh files by explicit path; combat.js UNTOUCHED.
5. Verify: determinism / combo-standard / roster-integrity + a live harness for Rikudou/Oiroke/skins/full-frames.
6. One commit for the rework; push; update LEDGER.

## ═══ SESSION 2 REWORK — DONE / DEFERRED (commit f769581c, pushed to origin/main) ═══
DONE (verified: determinism 9/0, combo-standard 230/0, roster PASS, live harness 12/12):
 ✓ Gamabunta: ULTIMATE → SPECIAL (Down+Special ground, cost 55; Throw → air Down+Special)
 ✓ Ultimate = BIJUUDAMA (two nine-tails Kurama heads + huge sphere, like naruto_hokage) — KCM-ONLY
 ✓ Rikudou apex (KCM Down+Ult, Bond 4, once/round, code-drawn 'rikudouflash' entry, ends-Base + resets-Bond)
 ✓ Oiroke opt-in (default OFF, localStorage ms_oiroke_enabled; base Charge-TAP fires it; __harness.setN7Oiroke)
 ✓ "Use the entire sprite" (partial): hurt 3→7 full frames; wired unused Forward-Strong as Fwd+Heavy
 ✓ Four-Tails / Rikudou are committed (own frames only, no borrowed anims — per user rule)
 ✓ Move List updated; combat.js UNTOUCHED; committed surgically (zero Gaara content)

DEFERRED — need VISUAL image-QA (exhausted this session) and/or carry collision risk:
 • 6 BASE-only palette RECOLOR skins (recolor correctness MUST be eyeballed; gen pipeline mapped above)
 • Combo-1 Air wiring (slice has merged wide frames 173/184px — needs visual disambiguation/re-slice)
 • Oiroke OPTIONS-MENU UI toggle row (mechanic+storage done; the clickable brutality-style row is pending)
 • KCM-locomotion "glide" polish (art-limited: only 1 golden stance frame exists; currently transformation-
   specific/no-borrow, which is correct, but a single frozen frame; revisit with eyes)
 • Unverified pre-slices parked on wip/naruto-seventh-phase4-art: aircombo, bijuudama_cast, kcm_burst2

RESUME (fresh session, image-QA restored, Gaara settled): do the 5 deferred items; re-QA pre-slices.

## ═══ SESSION 3 — art polish from user's verified bboxes (commit 3e79d585, pushed) ═══
 ✓ ITEM 2 Combo-1 Air: re-sliced 9 clean frames from user bboxes → aircombo_uniform.png (9×62×60, 0 fringe).
   Wired as the AIR attack; down-air keeps Strong-Air (both air sections used).
 ✓ ITEM 4 KCM golden idle/glide (CHOSEN composition, reported):
     idle  = slow breathing LOOP, speed 14, from the 3 neutral golden poses
             (14,3367,29,60) (538,3442,29,60) (8,3587,35,60)  → kcm_idle_uniform.png (3f)
     glide = READY pose (322,989,33,57) + chakra-arm rising (51,3584,41,63) + lowering (206,3584,41,63)
             → kcm_glide_uniform.png (3f); walk loop speed 8, run speed 6; dash/jump/fall/guard hold frame 0.
     (Did NOT use the golden Win frame 74,4301 — smaller scale, per note.)
 ✓ ITEM 3 Oiroke OPTIONS-MENU toggle row added (default OFF, brutality pattern, localStorage).
 Verified: determinism 9/0, combo 230/0, roster PASS, harness naruto_seventh_phase4b_live.mjs 4/4.

STILL DEFERRED — ITEM 1: 6 palette recolor skins. NEEDS the 6 palette color specs (vest/outfit target
 colors per swatch), OR extract-from-swatches + user visual sign-off. Pipeline mapped (recolorSkinAnim,
 base-only retag, gen_naruto_seventh_recolor.py). The 6 Color-Palete swatches are at y205-292, x spans:
 (11-42) (50-81) (89-120) (128-159) (167-198) (206-237).

## ═══ SESSION 4 — ITEM 1 DONE → PHASE 4 COMPLETE (commit 06b23cca, pushed) ═══
 ✓ ITEM 1: 6 Color-Palete BASE-ONLY recolor skins. Position-matched swatch0→swatch1..5 → EXACT per-palette
   colour LUTs (no visual guesswork); applied to base sheets via gen_naruto_seventh_recolor.py →
   130 naruto_seventh_<sheet>__<tag>.png (alpha identical). Palettes: green(Forest Leaf)/blue(Ocean)/
   red(Crimson)/shadow(dark+red)/silver. KCM/Four-Tails/Rikudou/Oiroke keep CANONICAL colours
   (n7RecolorAnim retags base actions only). revertNarutoSeventhKCM now restores _baseSkinAnim (skin persists).
   skins.js: default + 5 recolors (6 total). Harness naruto_seventh_skins_live.mjs 6/6.
 LUT color maps (orange vest → target): green(72,114,31) blue(8,40,88) red(168,32,40)
   shadow(dark grey + grey→dark-red) silver(grey + white→grey).

★★ NARUTO (SEVENTH HOKAGE) — BUILD COMPLETE. Phases 1-4 + user rework, all on origin/main:
   dfbb6fe7 (P1) · 45667b04 (P2) · a3704d23 (P3) · f769581c (rework) · 3e79d585 (art polish) · 06b23cca (skins).
   determinism 9/0 · combo-standard 230/0 · roster-integrity PASS · credits 12/2 (pre-existing ghostface_exe).
   combat.js UNTOUCHED throughout. All commits surgically clean of the concurrent Gaara build.
