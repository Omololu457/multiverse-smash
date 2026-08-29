---
name: combo-standard-coverage
description: "comboStandard.js classification guardrail extended to full 99-char roster (Stage G) — coverage fix, no damage change; + the concurrent-test flakiness insight"
metadata: 
  node_type: memory
  type: project
  originSessionId: f71ea5e3-3cdd-4ebe-8a1a-5e449de19e75
---

`comboStandard.js` is the combo-string classification GUARDRAIL (three buckets: **REKKA** Fwd+Heavy chains / **STANDARD_STRING** shared L,L,H dial-a-combo / **ZONER** single-poke). `harness/combo_standard_audit.mjs` (`test:combo-standard`) cross-checks each entry against abilities.js source and asserts the buckets EXACTLY partition the live roster. It had drifted to **53/99** as the roster grew — 46 characters silently unclassified. COMMITTED + PUSHED as `c4f5717d` (2026-08-29).

**Fix (Stage G) — pure coverage, NO gameplay/damage change:** classified the 46 by runtime truth.
- 36 with a `updateXCommandCombat` driver → **REKKA**: 28 `conforms` (each has the verified forward idiom `fighter.facing === 1 ? !!inputState.right` + a single `requireHit` literal, so §5/§4 pass; `kiba` has no requireHit literal → `srcRequireHit:false`); 8 `exception` (boruto/isshiki gate on Karma/Daikokuten not the Fwd idiom; green_lantern/kurapika/naoya/onoki/spiderman/yamamoto have a driver but no standard `rekkaContinue` launcher chain).
- 10 driver-less → **ZONER** single-poke (brainiac/byakuya/dark_knight/deathstroke/gwen/hiruzen/jason/light/miles/vilgax). NB: I widened the ZONER comment — it now means "no combo string" incl. un-chained melee, not only ranged.
- `EXPECTED_COUNTS` updated: rekkaTotal 70, conforms 54, exception 16, zoner 15, rosterTotal 99. `toji` (the pre-existing gap the file admitted) is now classified.
- Light's by-design missing CORE `upAttack` → NEW `CORE_NORMAL_EXCEPTIONS` (documented + stale-checked, wired into audit §6b) instead of fabricating a launcher; also added `light: ["airAttack","downAir"]` to `BASE_NORMAL_EXCEPTIONS`.
- §3b constraint: registry standard-string MUST equal abilities.js `STANDARD_STRING_CHARS` exactly → added ZERO new standard-string entries (avoids a runtime change). §F kit-grammar check passed because all 46 share the generic fallback kit ("Special, then Light/Heavy pokes").

Result: `test:combo-standard` **6-fail → 227/0**; `test:combo-flow-roster` **18/0**. Verified the 46 already decay correctly (toji/vegito/ippo/miles/brainiac/superman_new52 all `comboCounter` 1→6, damage steps down) — they were UNTRACKED, not broken.

★★**KEY RECURRING INSIGHT — concurrent test flakiness:** the "saiki/sasuke/netero/itachi don't decay + hitstop missing" bug (and dozens of others in the 764-test sweep) were **FALSE POSITIVES from CPU starvation** when tests run 6-wide. Proven: test:combo-flow-roster is 18/0 in 3× clean ISOLATED runs, and per-hit instrumentation shows correct decay. **Trust only isolated re-runs; the 6-wide sweep inflates failures massively** (e.g. test:vegeta ❌13→0, zenitsu ❌11→0, inosuke-stage4 ❌14→0 in isolation). This same flakiness earlier produced two wrong task premises (this combo "bug" + a stale "Maki chain not dispatched" claim — Maki's kit was already complete: test:maki 31/0). Related: [[audit-backlog-is-stale]], [[sukuna-domain-balance]] (same commit).
