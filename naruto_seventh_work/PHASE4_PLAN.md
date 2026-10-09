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
