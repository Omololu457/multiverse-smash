# Krybot handoff

**Playable now:** normal menu → Power Rangers → Krybot → Default → match. All integration is applied; no pending patch. Existing project/branch/server setup was retained. No commits, staging, pushes or publishing by Codex.

## Owned delivery

- `krybotData.js`: separate fighter registration data and exact normal/special timings.
- `krybot.js`: logical configured inputs, fresh Light retaps, shared command-chain gate and clean-hit cancels.
- `krybotState.js`: serializable owner state, finite bolts, one-HP covering unit, marks, leap, crossfire and cleanup.
- `krybotSprites.js`, `krybotFx.js`, `krybotAudio.js`, `krybotKit.js`, `krybotHarness.js`: source-art descriptors, presentation, existing synthesized audio, in-game Move List, test adapter.
- `tools/krybot/extract.py`, `assets/krybot/`: 33 verified source cells, anchored body strips, portrait, bolt and all five explosion cells. Original source SHA-256 preserved.
- `tools/krybot/baseline_read.mjs`: read-only historical regression comparison without another checkout.
- `harness/krybot*.mjs`: mechanics, routes, lifecycle, replay/LAN injection, AI, source-art rendering and normal-menu visual checks.
- `docs/krybot/`: source rectangles, enlarged contact sheet, accurate ripper credit, frame map, balance, controls, canon/adaptation notes, results, screenshots and initial/final hashes.

## Shared integration

| File | Narrow change |
|---|---|
| `characters.js` | Import/register one `krybot` entry in the existing Power Rangers universe |
| `spritesheets.js` | Idle preload/sprite-availability registration |
| `skins.js` | Default appearance scale registration only; no generated skins |
| `credits.js` | The FRANKETE / Franketepoke2 attribution for strips and source cells |
| `kits.js` | Delegate to the Krybot Move List module |
| `combat.js` | Delegate hitbox, blockstun, clean-hit/mark and projectile events; scoped zero chip for blocked Crossfire contacts |
| `input.js` | Actual controller press edges for Krybot; injected replay/LAN input takes precedence |
| `game.js` | Per-fighter delegates, world accessors, movement commitment, cleanup, replay checkpoint and harness/render hooks |

`updates.TXT` receives only an additive Krybot completion note. No changes to `abilities.js`, `sprite.js`, `sound.js`, other fighter frame data, music/MP3s or the protected Naruto PNG.

**Concurrent overlap:** Claude independently added Sanji to the same `input.js` raw-controller predicate/comment, preserving Krybot and its injection guard. The combined condition was inspected and preserved. Its Sanji portion is not owned by Codex. Other Sanji/Arlong commits and unrelated untracked assets were left intact. Branch remained `main`; `final_state.json` records the observed commit/status rather than assuming concurrent HEAD stayed fixed.

## Validation

- 58 core mechanics checks pass, including both controller slots, command branch, exact four-contact ultimate, zero blocked-opening damage, assist interruption, owned shot limits and mirrors.
- Six real-input routes measured: jab chain 34; jab→Heavy→blaster 58; command chain 53; manual launcher→air 38; Heavy→Cover 43 with **11 escape frames**; Heavy→ultimate 120. Costs, spacing and shared scaling are in `BALANCE.md` and `route_measurements.json`.
- Lifecycle checks pass: mark exactly 60 updates even during hitstop, covering-unit lifetime/cooldown, repeated/mirror marks, wall pressure, finite shots and ultimate transition.
- Replay matches 670 observed frames and 12/12 shared checkpoints. LAN mock drives slot 2 with a live neutral controller; the existing real-WebSocket lockstep suite passes.
- Both adaptive AI slots fight for 1800 frames, use multiple normals/specials and deal damage.
- Actual normal launch/server menu navigation, both Krybot selections, stage, match, actual jab KOs, victory and rematch pass. KO fixtures reduce/stun the opponent; selection and match launch are real menu clicks.
- Enlarged source/contact sheets and actual helper/crossfire/explosion renders inspected; both fighters/HUDs visible and source/anchors preserved.
- Shared time model, block, cancel-window and roster-integrity tests pass. Existing credit-suite failures (11 pass / 3 fail) and Goku controller-special failures (10 pass / 2 fail) reproduce identically from the initial commit's JS; they were not hidden or changed.

Physical two-device LAN/gamepad acceptance and exhaustive four-player/team/matchup balance are not claimed. Limited source poses and the authored low/launcher/recovery interpretations are explicit in `README.md`, `SPRITE_LEDGER.md` and `MOVE_FRAME_MAP.md`. The playable squad-leader role is an original adaptation, not evidence that ordinary Krybots canonically command troops.
