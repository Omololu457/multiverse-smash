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

## Phase 3 — The kit — IN PROGRESS (part A done)

Existing kit was already coded (5 dir specials: Web Impact/Throw/Dash-Attack/Handstand/Crawl;
Maximum Web ult; spiderCombo command-normal; audio quip/voice pool). Phase 3 ADDED the spec's
most distinctive NEW combat mechanics:

- **WEBBED debuff** — web projectiles (Web Impact / Web Throw / Catch-return) carry
  `hitFlag:"_webHitLanded"`; a clean connect stacks WEBBED on the victim (abilities.applyWebbed).
  3 stacks → stronger slow + dash disabled; decays. Held in the UNIVERSAL timer loop
  (abilities.tickWebbed, called from game.js beside `_madaraDrowsy`) so the victim can't reset it.
  Self-contained on the victim — no other character's code changed.
- **Catch & Return** — folded into the neutral Web Impact (context-sensitive, no new input):
  an incoming enemy NORMAL projectile in front within range is caught (removed), ownership
  transferred, and hurled back as a `spiderWebReturn` at ~1.3× damage/speed. Not beams/ults.
  Whiff = the normal Web Impact (the read). abilities.tryCatchAndReturn.
- **Voice lines (text)** — `characters.spiderman.voiceLines` (intro/win/lose/taunt/super),
  young nervous-funny MCU register (the exact spec lines).

Harness `harness/spiderman_kit.mjs` 12/0 (synchronous-stepped: catch pose, bolt removed,
no damage, return @1.3× flying back; WEBBED 3-stack slow 0.55 + dashCd + decay). All existing
suites still green (stage1-4, webswing, traversal). combat.js untouched. Built via PRIVATE INDEX
off feat/spiderman tip (foreign Homelander-audio edits to abilities/game/sound/combat excluded).

RECONCILED to existing (not re-built): "Web Shot (3 angles)" ≈ existing Web Impact/Throw
projectiles (now WEBBED-applying); "Web Throw grab/whirl" ≈ existing Web Throw projectile;
MAXIMUM SPIDER ≈ existing Maximum Web ult. DEFERRED to Phase 4/polish: Spider-Sense white-flash
passive + dodge-evade, Web Cocoon capture, quip-BUBBLE sprites (the 5 cut sprites + ON/OFF
setting; audio quips already fire), Web Swing Kick / Spider Sting dedicated specials.

## Phase 4 — HUD, AI, polish, report — IN PROGRESS

- **Quip bubble system** ✅ — the 5 cut sprites (`spiderman_quips/`) pop above Spider-Man on
  events (catch/counter/evade → small HEY!/DO YOUR JOB!/C'MON PAL!; taunt → big "Does this
  outfit make me look fat?"). Render-only (reads `fighter._quipBubble` set deterministically in
  `abilities.updateSpidermanTraversal`; never feeds the sim), clamps inside the camera, fades if
  it would overlap the opponent, and respects a new **"Quip bubbles" ON/OFF setting**
  (`ms_quip_bubbles`, default ON) + **Reduce Flashing**. Harness `spiderman_quips.mjs` 7/0.
- **FINAL REPORT** ✅ — `docs/spiderman/REPORT.md` (all phases).
- **Spider-Sense passive** ✅ — incoming attack (melee/projectile; grabs & unblockables excluded)
  opens a warning window + white-flash + 3 head rings (render-only, Reduce-Flashing-aware); a
  buffered dodge tap inside it = true evade (brief invuln + next-attack counter hit ×1.3).
  `abilities.updateSpiderSense` (deterministic); harness `spiderman_sense.mjs` 9/0.
- **WEBBED HUD indicator** ✅ — web-pips (1/stack, red at 3) above the webbed fighter
  (`drawSpidermanWebbedPips`, render-only; fighter-anchored, not health-bar-integrated — a
  deliberate low-risk choice). web-fluid bar already renders via the `web_fluid` energyConfig.
- **CPU AI** ✅ — `ai.js decideSpidermanSignatureMove` (mirrors Homelander's signature layer):
  web pokes at range (apply WEBBED) + Maximum Web at full meter; gated to spiderman, seeded-RNG
  (deterministic). Harness `spiderman_ai.mjs` 6/0 (verified via web projectiles + opponent WEBBED
  in AI-vs-AI; p1() omits cast/move in aiVsAi, so projectiles()/spiderWebbed() are the signal).
- **Web Swing Kick + Spider Sting + Web Cocoon** ✅ (`spiderman_kit2.mjs` 8/0): swing-kick =
  attack out of a swing (committed kick, keeps momentum); Spider Sting = Up+Special Handstand
  with reversal i-frames; Web Cocoon = air Down+Special slow web → capture/wrap (held, mash,
  unravel) + code-drawn web-wrap visual.
- **Training support** ✅ (`spiderman_training.mjs` 4/0): infinite web fluid = F3 infinite-resources
  (web_fluid is energy); dummy projectile spammer = new F4 "projectiles" behavior (Catch & Return
  drill); spider-sense display = the warning flash already renders on detection.
- Still OPEN (cosmetic/polish): surfacing the "Quip bubbles" toggle on the Settings MENU page
  (the setting/flag is fully wired + persisted); fuller AI nuances (swing-to-approach, zip-escape).
