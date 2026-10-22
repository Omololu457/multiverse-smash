# Spider-Man build — Progress

Branch `feat/spiderman` (off `main` @15d2e151). One commit per phase; push branch
after each; never merge/push `main`. Stage files by explicit path only.

## ⚠️ Standing context for every phase

- **This is a REVIVE, not greenfield.** A near-complete Spider-Man already existed in
  the repo, wiped from `_WIPED_FOR_REDO` only for missing art. Kit (web-swing pendulum,
  specials, Maximum Web ult, Ground Crawl, voice, skins, harnesses) is already coded in
  `abilities.js`/`game.js`/`combat.js`/`spidermanVoice.js`. Job = generate art + un-wipe,
  then reconcile the existing kit against the user's (richer) Phase 2-4 spec. See LEDGER.
- **Known tracked-change exception:** `naruto_seventh_kcm_jump_uniform.png` was already
  modified (dirty) before this task; the user authorized proceeding. NEVER stage/touch/
  revert it. `git status` before every commit to confirm it is not staged. MD5 baseline
  `a676b507a8ac5f01aee1d86376fde26b`.
- Universe: **used EXISTING `marvel`** (accent #e62429). No new universe created.

## Phase 1 — Inventory & ledger ✅ DONE

- Copied sheet untouched → `assets/source/spiderman_original.gif` (MD5 verified identical).
- Validated the intact pre-existing pipeline (27 tracked green-stripped row strips +
  `tools/reslice_spiderman.py`) derives from this exact sheet; ran it →
  **26 `spiderman_*_uniform.png` sheets** whose frame counts/dims match `animationData`
  exactly. Added the one missing job (`spiderman_swing_uniform.png`, row-25 reaching
  lunge) and synced its `animationData` dims (91×73).
- Generated `spiderman_portrait.png` (heroic hands-on-hips bust from the row-24 win pose).
- Cut the 5 speech bubbles clean (with tails) as transparent sprites → `spiderman_quips/`.
- Deliverables: `assets/source/spiderman_inventory.json`, `assets/source/spiderman_contact_sheet_3x.png`,
  `docs/spiderman/LEDGER.md`, `docs/ASSET_CREDITS.md`.
- **Un-wiped** `spiderman` from `_WIPED_FOR_REDO` (3 other variants stay wiped).
- GATES: stage-1 render check **26/0**; determinism **14/0**; roster-integrity ✅;
  combo-standard **225/9** (documented pre-existing baseline, Spider-Man classified green);
  frame-data diff **zero** for every other character (`characters.js` diff is only the two
  Spider-Man hunks; combat/abilities/game/physics untouched); naruto PNG not staged.

## Phase 2 — Web traversal system ✅ DONE

- `docs/spiderman/TRAVERSAL_DESIGN.md` written (engine study, approach comparison, flight.js reuse).
- **DATA profile** `SPIDERMAN_TRAVERSAL` (abilities.js) — all swing/zip/hang/fluid numbers.
- **Swing** refined vs spec: bigger pronounced arc (anchor 250 ahead/up), in-arc `speedMax`
  clamp (smooth bottom), tangent-velocity release, **2-swing limit** (`_swingsSinceGround`),
  release-on-attack, cleared-on-hit.
- **Web Zip** (air Fwd+Special) — fast straight pull, windup→travel→land, no hitbox, costs fluid.
- **Wall-cling = TIER 3 ceiling-hang** (air Back+Special). REPORTED: engine has no collidable
  wall/ceiling surfaces, so Tier 1/2 would fake a surface → chose honest ceiling-hang.
- **Web-fluid gauge** — ground regen, faster-when-still, `spendDelay` pause after a cast, dry gate.
- physics.js gate extended to `_zipT`/`_hangT`; per-frame driver `updateSpidermanTraversal` in game.js.
- **Gates:** traversal harness `spiderman_traversal.mjs` 6/0 (maxStep 26.8px ≤38, pose-hold ≥3,
  3 byte-identical runs); webswing 12/0, stage1 26/0, stage2 22/0, stage3 22/0, stage4 13/0;
  determinism 14/0; roster-integrity OK; combo-standard 225/9 (baseline). combat.js untouched.
- ⚠️ CONCURRENCY: a parallel "Homelander audio" session is editing game.js/sound.js/abilities.js
  in the shared tree. Phase-2 commit built via PRIVATE INDEX (HEAD + only my hunks) so those
  foreign changes are NOT absorbed.

## Phase 3 — The kit — PENDING
Reconcile existing specials/ult/quip-voice against the spec's richer kit (3-angle Web Shot,
Catch & Return, Web Cocoon capture, Spider-Sense white-flash passive + dodge-evade, WEBBED
debuff, quip-bubble system + ON/OFF setting, MAXIMUM SPIDER silhouette ult, voice lines).

## Phase 4 — HUD, AI, polish, report — PENDING
HUD portrait + web-fluid bar + Webbed stacks; CPU AI; training toggles; `docs/spiderman/REPORT.md`.
