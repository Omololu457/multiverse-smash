# MSV1-CLONES REPORT
Start commit: `ece81fd04e4abf243e65c6a6a70c68920f5606c4` (docs/msv1/clones/START_COMMIT.txt)

## Where the reused choreography lives
- `clonechoreo.js` — the MSV1 five-step clone engine, MOVED out of ninja.js §D (choreoStart / choreoStep / choreoTarget behind a
  host interface; ninja.js passes its helpers in). Shane / Dustin: 128-frame clone-job trace identical before / after, frame-data diff 0.
  Also holds the per-character profiles (`CLONE_STYLE`, data only), the real sheets used (`CLONE_SHEETS`) and the ghost-body
  helpers the two Naruto-universe engines call (ccRunStart / ccRunStep / ccFormationStep …).
- `clonechoreoFx.js` — render only: ring into the hand sign, smoke / water / wood pop + exit, per-clone tilt, unison-strike punch.
- Hooks (idempotent, `tools/msv1_clones_hooks.py`): narutoChoreography.js, cloneChoreography.js, summons.js, game.js (render lines).

## Per character
| | Clones | Pop / exit | Ring | Lead |
|---|---|---|---|---|
| Naruto | shadow | white smoke (bigger in Kurama shroud), wide fan, bound 18, 12-clone formation at shroud 5 | cyan (orange-gold in Kurama) | +10 |
| Sasuke | shadow | small tight poof, fast clipped fan, bound 2 | dark purple | +6 |
| Madara | **shadow** (not wood) | heavy dark-grey smoke, slow fan, upright + still (tilt 0) | dark red / black | +12 |
| Tobirama | **water** | rises out of a water puddle, collapses back into it (his `tobiWaterFlicker` cells 2→5 / 5→2) | blue | +12 |
| Hashirama | **wood** (his sheet has wood-clone frames) | grows (`woodCloneCast` clone half, cells 2–10), splinters (`hashirama_wood_clone_release` 0–3) | green | +12 |
Smoke = `madara_summon_smoke_uniform.png` (the project's smoke strip) recoloured per style. Seal poses: Madara `madaraFireballCast`,
Tobirama `tobiWaterWall`, Hashirama `handSigns`; Naruto / Sasuke have no seal cells → idle while the ring runs in. No art invented.
Clone moves per character: docs/msv1/clones/AUDIT.md. Frame changes: docs/msv1/clones/FRAME_DIFF.md. Strips: docs/msv1/clones/strips/.

## Notes
- The unison strike is the squad's pose + flash on the run's first hit frame; each clone's real hit still lands on its own authored
  frame (+lead), so sequential barrages keep their order and damage.
- Persistent "," clones: Tobirama now rises out of / returns to water, Hashirama grows (exit keeps the existing wood logs), Madara pops
  in and leaves through dark smoke (it used to leave as wood logs). One-shot "h" moves unchanged.
- Fixed during checks: a queued jump fired under the lead-in lock (clone_realinput) → the caster is planted while it holds the seal.

## Tests (clean HEAD baseline → commit tree)
determinism 14/0 → 14/0 · combo-standard 233/9 → 233/9 · up-attack-roster 77/2 → 77/2 · credits 11/3 → 11/3 · roster-integrity ✓ → ✓ ·
replay_playback 10/0 → 10/0 · msv1_netreplay (LAN + replay) 10/0 · clone_realinput 22/3 → 22/3 (same 3) · clone_choreo_char 22/1 → 22/1 ·
clone_form_scaling 41/0 → 41/0 · hashirama_wood_clone 13/0 · stage4_clone_chars + clone_swap crash on load in BOTH (pre-existing) ·
msv1_render naruto/sasuke, tobirama/madara, hashirama/ns_red 11/0 each · NEW msv1_clones 72/0 (incl. Naruto 12 clones 0.67 ms/frame).
