# S.P.D. Green Ranger (`spd_green`) — ownership record

Session start: 2026-11-13 18:54 EST, branch `main`, HEAD `a489bd0ce3e2959e978ecd3d2b380baad1a66f6b`.
`PROJECT_HANDOFF.md` and an AGENTS.md do not exist in this project. Read instead: `updates.TXT`,
`docs/spd_blue/CODEX_OWNERSHIP.md`, `docs/krybot/*`, `docs/rangers/RANGER_FRAMEWORK.md`, `groundTeleport.js`,
`spdBlue*.js`, `rangers.js`, the `spd_red` docs.

## Pre-existing state, not mine (left untouched)

Full `git status --porcelain` at start is saved in `docs/spd_green/_status_at_start.txt` (328 lines).
Index had nothing staged.

- 27 tracked files were already modified. The shared engine files among them carry another session's
  uncommitted SPD Blue + Krybot integration (Codex) merged with the committed SPD Red work: `characters.js combat.js
  credits.js game.js input.js kits.js skins.js spritesheets.js`, plus `spdRedData.js spdRedFx.js spdRedState.js`,
  `index.html`, `updates.TXT`, homelander/superman eye-anchor files and renders, `command.txt`.
- Untracked SPD Blue (`spdBlue*.js`, `groundTeleport.js`, `barrierRingFx.js`, `assets/spd_blue`, `docs/spd_blue`,
  `docs/skins/spd_blue`, `tools/spd_blue`, `harness/spd_blue*`) and Krybot (`krybot*.js`, …): Codex-owned.
- `naruto_seventh_kcm_jump_uniform.png` (modified) and the music/MP3/ratings files: never touched.

The SHA-256 prefixes of the shared files at start (before any SPD Green hook):

| file | sha256[0:16] |
|---|---|
| characters.js | 8cd64a4fb6095ceb |
| combat.js | 829eb69e00c6ec0c |
| game.js | 3436d437291863b6 |
| input.js | bd4af1d6de30123f |
| kits.js | f44ddd875d8b7fd5 |
| skins.js | 9cc31c0cd250a088 |
| spritesheets.js | cff479c507acfd30 |
| credits.js | 515c41af105328ac |
| physics.js | 65db57e025f17f42 (not edited by SPD Green) |

The shared files were last written at 17:02–17:26. That was about 1.5 h before this session began, so nobody was editing them then.
Every SPD Green hook was added by re-reading the file just before the patch and anchoring on a unique line. Lines are only added next to the
SPD Blue hooks. One existing condition gained a single `|| spdGreenLocked(fighter)` term. No reformatting.

## SPD Green owns

- `spdGreen.js spdGreenData.js spdGreenState.js spdGreenFx.js spdGreenKit.js spdGreenSkins.js spdGreenHarness.js`
  and the generated `spdGreenSprites.js`
- `assets/spd_green/**`, `tools/spd_green/**`, `docs/spd_green/**`, `docs/skins/spd_green/**`, `harness/spd_green*.mjs`

## Shared-file hooks (minimal, additive, `spd_green`-gated)

These are listed in `docs/spd_green/INTEGRATION.md`, with the exact lines.

## Reused, not modified

- `groundTeleport.js` (SPD Blue's opt-in teleport contract): Green calls `registerGroundTeleport('spd_green',{})`.
  It uses the parser, cooldown, sweep and dash fallback that already exist. No second parser.
- `barrierRingFx.js` `drawBarrierRing`: the existing cosmetic ring is reused for the scan pulse and the mark indicator.
- The Alien X starfield (`game.js drawAlienXStarfield`, gated on skin ids ending in `AlienX`).

## Not modified

The Tommy Oliver/MMPR Green, Krybot, SPD Blue, SPD Red, every other Ranger, `rangers.js`, `physics.js`, and any other fighter's authored data.

Note: during the baseline I ran `harness/spd_blue.test.mjs` once (54/0). That test rewrites its own report,
`docs/spd_blue/mechanics_results.json`, which is a Codex-owned untracked file. The run is deterministic and only refreshed the same
measurements. I did not run it again after that.

## Update 2026-11-13 — end of build
- Shared hooks are listed exactly in INTEGRATION.md. The game.js mirror-wash exclusion for different skins was added after Blue's equivalent line.
- I re-diffed every shared file against its pre-patch copy. Only spd_green lines differ, and there are no foreign edits since the patch.
- SPD Blue (`spdBlue*.js`, `groundTeleport.js`, `SPD_BLUE_WORLD`) is still uncommitted and owned elsewhere. I did not commit the hooks, so as not to break HEAD.
- I committed only new spd_green-owned paths, via a private index. Nothing was pushed.
