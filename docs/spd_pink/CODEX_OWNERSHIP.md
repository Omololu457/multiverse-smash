# S.P.D. Pink Ranger (`spd_pink`) — ownership record

Session: 2026-11-13, branch `main`, HEAD `d92ea1028` (the S.P.D. Green owned commit). `git status --porcelain` at start: `docs/spd_pink/_status_at_start.txt`.
Nothing was staged at the start.

## Pre-existing state, not mine (left untouched)
- The shared engine files already carried uncommitted SPD Blue, Krybot and SPD Green integration: `characters.js combat.js credits.js game.js input.js kits.js skins.js spritesheets.js`.
- SPD Blue (`spdBlue*.js`, `groundTeleport.js`, `barrierRingFx.js`, `assets|docs|tools/spd_blue`, `harness/spd_blue*`) is Codex-owned and uncommitted.
- `naruto_seventh_kcm_jump_uniform.png` and the music/MP3/ratings files were never touched.

Shared-file SHA-256 prefixes immediately before the spd_pink hooks (the patch asserted each one; backups were saved in the session scratchpad):

| file | sha256[0:16] |
|---|---|
| characters.js | 307da39cccb8d646 |
| combat.js | 4affa923d9a29979 |
| game.js | e1a2b756272eabf1 |
| input.js | 677459a5b82de483 |
| kits.js | 3b780f840fc7da47 |
| skins.js | c27e5d4744b3451c |
| spritesheets.js | c7f46e0b6763938b |
| credits.js | 84b0f094d56a556e |

## SPD Pink owns
- `spdPink.js spdPinkData.js spdPinkState.js spdPinkFx.js spdPinkKit.js spdPinkSkins.js spdPinkHarness.js`, plus the generated `spdPinkSprites.js`
- `assets/spd_pink/**`, `tools/spd_pink/**`, `docs/spd_pink/**`, `docs/skins/spd_pink/**`, `harness/spd_pink*.mjs`

## Reused, not modified
- `groundTeleport.js`: `registerGroundTeleport('spd_pink',{})` with the default contract.
- The Alien X starfield (game.js, gated on skin ids ending in `AlienX`).

## Not modified
MMPR Pink (Kimberly), every other Ranger's authored data, S.P.D. Red, Krybot, `rangers.js`, `physics.js`.

## Variety pass (same session, at the owner's request)
- The owner asked for more move variety for Blue, Green and Pink, with Red untouched as the model.
- SPD Blue's files belong to Codex. I patched them narrowly, hash-guarded against these start hashes, with backups saved in the scratchpad:
  - spdBlueData cac875c76b853de9, spdBlueState 7a4bc2bc652b432f, spdBlue a709677fb0706ab9, spdBlueKit 668810800ea2941e
- Those Blue edits are **not committed by me**, because Blue's files are still Codex's uncommitted work. See `docs/rangers/VARIETY_PASS.md`.
