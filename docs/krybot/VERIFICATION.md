# Krybot verification

The initial working baseline is recorded in `checkout_baseline.json` (branch, commit, staged paths, full status and SHA-256 hashes) and `roster_baseline.json` (existing fighters' actual working stats and move data). Initial commit: `4da8b4d123230d15e05dd67093e95d958484d0fb`, branch `main`, no staged paths. PROJECT_HANDOFF.md was absent; updates.TXT was empty. No AGENTS.md was found in the project/parent search.

## Acceptance checks

| Check | Evidence |
|---|---|
| Core mechanics, both slots, normals/cancels, directional specials, misses/blocks, command branch, projectile limits, mirror ownership, interruption, identity and training reset | `mechanics_results.json` and `.log` |
| Actual per-contact combo damage, spacing and escape windows | `route_measurements.json` |
| Exact mark timeout during hitstop, helper/cooldown lifetime during hitstop, repeated marks, mirror marks, wall pressure, ultimate transition | `lifecycle_results.json` |
| Replay round-trip: 670 observed frames plus neutral initialization; authoritative state equal every frame; all 12 shared checkpoints match | `determinism_results.json` |
| LAN mock injection drives slot 2 helper and projectile with a connected neutral controller | `determinism_results.json`; shared real-socket transport test below |
| AI vs AI mirror, both slots choose multiple attacks and deal damage over 1800 simulation frames | `ai_results.json` |
| Supplied helper aim, visible two-allied crossfire, full explosion, body scale, no clipped fighters | `helper_aim.png`, `crossfire.png`, `crossfire_finish.png`, `render_results.json` |
| Normal launcher/server and menus: Power Rangers → Krybot for both slots → stage → match → jab KOs → victory → R rematch | `visual_results.log`, `visual_krybot_select.png`, `visual_normal_match.png`, `visual_victory.png`, `visual_rematch.png` |
| Source preservation, regenerated assets, exact background regions and all source cells | extractor SHA assertion, `source_rects.json`, `contact_sheet.png`, `asset_integrity.json` |
| Other fighter balance remains unchanged | mechanics test compares every initial roster entry's stats/basic attacks/specials/ultimate to `roster_baseline.json` |

Helpers use one scoped state object per owner and real shared projectiles. Marks store target side and identity rather than object references. State is plain JSON; no functions, Sets, random gameplay values or synthetic global fighters. UI image caches and synthesized audio are presentation only. The audio engine's own noise synthesis is excluded from the gameplay-randomness audit.

## Existing regression suites

| Test | Initial/baseline | With Krybot |
|---|---|---|
| `time_model.test.mjs` | 6 pass / 0 fail, before edits | 6 pass / 0 fail |
| `stage1c_block.test.mjs` | 12 pass / 0 fail, before edits | 12 pass / 0 fail |
| `cancel_window.test.mjs` | Existing rule preserved | 17 pass / 0 fail |
| `net_lockstep.mjs` | Existing transport | Pass; in-memory and real WebSocket relay |
| `roster_integrity.test.mjs` | Existing uniqueness gate | Pass; exactly one Krybot entry |
| `credits.test.mjs` | 11 pass / 3 fail | Same 11 pass / 3 fail |
| `gamepad_ingame.test.mjs` | 10 pass / 2 fail | Same 10 pass / 2 fail |

Credit failures are the same five unrelated unattributed roster keys (`green_arrow`, `homelander`, `kakashi_anbu`, `ghostface_exe`, `soldier_boy`), stale `sasuke_war_susano` attribution, and derived in-game coverage failure. Krybot has its own sourced-art attribution. The controller failures are the existing Goku R1 special / directional Dragon Fist checks. They were not weakened or changed.

The historical credit/controller comparisons use `tools/krybot/baseline_read.mjs`: tracked JavaScript is read directly from the initial Git object into memory for Node imports and the harness HTTP responses. No checkout, copy, worktree, reset, branch change or replacement of shared files is involved. Logs are `baseline_credits.log`, `baseline_gamepad.log` and `regression_*.log`.

## Limits

This is a 1v1 acceptance pass with both slots, simulated standard controllers and the actual browser launch. LAN gameplay injection is tested with a deterministic mock peer, alongside the existing real-socket lockstep test; a two-device physical LAN session and physical gamepads were not available. FFA hooks are integrated, but a complete four-human/team-mode acceptance run is not claimed. AI smoke verifies functioning opponents, not competitive balance or an exhaustive matchup study.

The supplied sheet has limited poses. No full multi-frame ankle strike, uppercut, bespoke aerial kick or native recovery sequence is claimed. Ultimate follow-ups are local projectiles/blast with ordinary defenses, not guaranteed capture. Advanced spacing, armor/absorption matchups and corner escape choices can change damage from the documented standing-mirror examples.

## Shared checkout and integration

Codex-owned modules, tools, assets, tests and docs are listed in `CODEX_OWNERSHIP.md`. Shared changes are only Krybot registration/delegation/lifecycle/credit/default-scale/input hooks in `characters.js`, `spritesheets.js`, `skins.js`, `credits.js`, `kits.js`, `combat.js`, `input.js`, and `game.js`. `abilities.js`, `sprite.js`, `sound.js` and universe definitions were not edited.

Other agents committed Sanji/Arlong work while this task ran; the branch remained `main`. One compatible shared-region overlap was observed: Claude extended the `input.js` raw-controller predicate to include `sanji` and added its explanatory comment, preserving the existing `krybot` addition and injection guard. That combined condition was reread and preserved; its Sanji changes are not claimed as Codex-owned. No other unexpected integration-region overlap was observed. The protected Naruto PNG was already modified at the start and was never edited by Codex. No files were staged or committed by Codex, and nothing was pushed. All Krybot integration is applied; there is no integration patch waiting to make the character playable. The final handoff includes the observed commit/status and checksums of owned/shared files.
