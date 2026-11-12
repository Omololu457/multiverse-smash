# Luffy — verification and delivery

## Base and preservation

Work began after inspection of the tested Ben/Swampfire checkpoint and updates.TXT,
with the user's subsequent go-ahead. Base: `integration/ben10-complete-feel-polish`,
commit `736c4a68efdb58ba577897a673f029af645b4f29` (the completed tested implementation, including the modern-main
feel/graphics integration). The inherited handoff's pending durable-clone / PR
fields remain untouched; this document does not certify that separate delivery.

Published feature: [feat/luffy-elastic-brawler](https://github.com/Omololu457/multiverse-smash/tree/feat/luffy-elastic-brawler),
tested delivery commit `a251e3f7`. The isolated full clone is
`/tmp/ms-luffy-elastic-brawler`. The original dirty checkout, its index, uploaded
assets and the older-main Luffy branch in the durable integration checkout were
not used as the implementation base or modified. No stash, hard reset, clean,
worktree, forced checkout, add-all, force push, merge or deployment was used.

Draft PR: [#10 — Add Monkey D. Luffy, the Elastic Brawler](https://github.com/Omololu457/multiverse-smash/pull/10).
The user authorized publishing the missing integration base on 2026-11-12. Its
remote ref now points to exactly `736c4a68efdb58ba577897a673f029af645b4f29`.
The draft targets that branch; its diff contains the Luffy work and small shared
fixes. This was the explicit exception to the original feature-only push rule.
No merge or deployment occurred. The review description is in DRAFT_PR.md.

## Source and visual evidence

Original `Game Boy Advance - One Piece - Playable Characters - Monkey D. Luffy.png`
is preserved unchanged at assets/sprites/luffy/source.png. Actual repository copy
is **710×3989 RGBA**, not the 364×2047 reference preview; top-left alpha is zero.
SHA-256: `c4344b3c5284ea150812a264e25109e292c50f0324942e1779bfd67f425baa38`.
Visible attribution: **Ripped by Paddy / No credit needed**, retained in source
and recorded in credits.js. No inferred ripper, voice pack or additional art.

The contact sheet/ledger account for every alpha-covered source graphic. Read
MOVE_FRAME_MAP.md for the reviewed frame assignments, fallback poses, anatomical
pivots and two supplied-pixel arm assemblies. Extract with Pillow using
`python3 tools/luffy/extract.py`. Original RGBA, black outlines, aspect ratio and
nearest-neighbor scaling are retained; credit pixels never enter runtime strips.

Visual review covered standing/stepping/backward movement, run/dash, crouch,
jump/fall, all normals and command branches, five specials, ultimate, Snapback,
reactions, knockdown/get-up, guard, landing, victory/defeat, actual rematch, both
facings and stage edges. See [visual_verification.png](visual_verification.png).
The long limbs fit padded canvases; attack timelines show extension on active
frames, including confirmed hitstop. The body hurtbox remains 48×94. No Luffy
missing asset or uncaught browser error was observed. High jumps use the existing
stage camera; no new camera capture or opponent freeze was introduced.

## Checks actually run

Node 24.16.0, Playwright Chromium, Pillow. Browser checks bind ephemeral localhost
servers; no deployment or external weather service was used.

| Command / suite | Result |
|---|---|
| `node harness/luffy.test.mjs` | 35 passed, 0 failed |
| `node harness/luffy_live.mjs` | 37 passed, 0 failed |
| `node harness/luffy_lifecycle.mjs` | 22 passed, 0 failed; replay 5/5 checkpoints |
| `node harness/luffy_lan.mjs` | 6 passed; 116 shared frames, 0 mismatches |
| `node harness/luffy_combos.mjs` | Nine measured routes; beginner/basic true-combo assertions passed |
| `node harness/dash_input_replay.test.mjs` | 5 passed, 0 failed |
| `node harness/pvp_keyboard_input.test.mjs` | 3 passed, 0 failed |
| Roster integrity | Passed; 127 registered characters |
| Ben integration / experimental catalog | 31 / 52 passed |
| Ben phases 3–7: device/moves/combo/defense/sound | 29 / 15 / 13 / 15 / 9 passed |
| Ben render / vow determinism | 27 / 7 passed |
| Swampfire live / Ben replay and LAN | 60 / 12 passed |
| Shared determinism / replay playback / net online | 14 / 10 / 11 passed |
| Feel phases 1–5 | 12 / 18 / 33 / 25 / 22 passed |
| Overnight render smoke | Passed: both fighters and HUD, no uncaught errors |
| Credits | 11 passed / 3 pre-existing failures; same on tested base |
| Combo-standard audit | 229 passed / 9 pre-existing failures (base 226 / 9) |
| Syntax/import validation, module stamp and `git diff --check` | Passed; 213 modules |

`node harness/luffy_regressions.mjs` runs the preserved suites and retains complete
per-suite output in /tmp/luffy-regression-results.json. Known failures are not
hidden or weakened. The combo audit now reads the declared modular driver for
Luffy while keeping legacy assertions; Luffy adds three passing checks.

Credits baseline failures: missing existing entries for homelander, kakashi_anbu,
ghostface_exe and soldier_boy, stale sasuke_war_susano, and resulting coverage.
Combo baseline failures: seven unclassified existing fighters, total/zoner count
drift, and gogeta/goku_rose core/air normal gaps. Their authored data is unchanged.
Older Goku stage-3 and Superman legacy expectations recorded in the inherited
updates.TXT were not rerun as part of this feature; they remain upstream work.

## Interactions and fixes

Tests use actual construction, input dispatch, move start, collision and damage.
Assertions cover grounded-only pip gain once per attack, blocked/armor/projectile/
DOT exclusions, deterministic neutral Stamina and decay, fresh retaps versus holds,
late-only Snapback, once-per-combo pull/retraction, cooldowns, three Pinwheel gates,
one Anchor per airtime, actual descent displacement cap, landing recovery, clean
ultimate opener/four contacts, miss/block, grab bypass, parry-result exclusion,
extended-hand vulnerability, interruption, KO and identity cleanup.

Lifecycle tests exercise training/round reset, competitive KO/victory/R rematch,
saved One Piece/Luffy/default-skin selection reload, both real keyboard slots,
and AI-versus-AI smoke. Controller buttons are simulated through the standard
Gamepad API; physical hardware was not available. State is plain JSON on the
fighter and compared by actual replay/LAN, including resources and queues.

Three shared defects were fixed without changing another fighter's move data:
PvP no longer clears the human P2 keyboard as CPU input; the first direction press
requires a real prior tap before dashing; resolved ordinary dash intent now uses
the existing replay/LAN dash bit. The existing double-tap handler is reused,
including LAN physical-input sampling; no competing command parser was added.
Optional sprite origins/timelines retain prior arithmetic for other fighters.

## Limits and remaining work

The manual air route has an eight-frame reset window before Anchor (frames63–70).
Far resource and max-range pull follow-ups miss; the guide labels those pressure.
Full traces are summarized in combo_results.json. Tests do not imply universal
roster matchup balance or immunity to shared defensive escapes.

Guard/throw are documented supplied-pose fallbacks. Ambiguous circular FX remain
inventoried but unused by combat effects. Sound cues are synthesized placeholders.
No skins, recolors, transformations, voice pack or experimental Ben roster unlocks
were added. Prolonged FFA, every platform/modifier matchup, physical controller
hardware and external weather remain untested. The Ben unfinished work and
baseline failures remain preserved. The dependent base is published at the
verified commit and draft PR #10 is open. The feature is delivered for review;
merge, deployment and later skins remain outside this task.
