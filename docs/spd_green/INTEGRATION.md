# S.P.D. Green — Shared-file Integration (status: APPLIED IN WORKTREE, NOT COMMITTED)

Every shared-file hook is a small spd_green-gated line, applied by hash-guarded unique-anchor patches.
- The pre-patch copies were diffed afterwards. The diff contains **only** the lines below: no reformatting, and no foreign lines were touched.
- These hooks live only in the dirty worktree. They are **not committed**, because they depend on SPD Blue's work, which is still uncommitted and owned by another agent:
  - `SPD_BLUE_WORLD` in game.js
  - the untracked `groundTeleport.js`
  - the untracked `spdBlue*.js`
- Committing the hooks before that work lands would break HEAD (missing modules abort the whole import graph).

## Hooks
| File | Hook |
|---|---|
| characters.js | `import { spd_green } from './spdGreenData.js'`; roster entry `spd_green,` after `spd_blue,` |
| spritesheets.js | `spd_green: { actions: { idle: './assets/spd_green/idle.png' } },` |
| skins.js | `import { SPD_GREEN_SKINS }…`; `spd_green: SPD_GREEN_SKINS,` |
| kits.js | `import { SPD_GREEN_KIT }…`; `spd_green: SPD_GREEN_KIT,` |
| credits.js | `spd_green` credit entry (before krybot) |
| combat.js | import; `spdGreenHitbox` after Blue's hitbox line; `spdGreenBlock` after `spdBlueBlock`; `spdGreenHit` after `spdBlueHit` |
| input.js | `!fighter._spdGreenRemoteInput` in the controller skip; `spd_green` added to the readRawControls pad rosterKey list |
| game.js | 4 imports; FFA + player `tickSpdGreen`/`playSpdGreenCues`; command block (FFA and 1v1); `spdGreenLocked` in the lock condition; determinism snapshot line; `clearSpdGreen` in clear/KO/round-over/round-reset sites; remote-input flag (replay/LAN); `drawSpdGreenFx` after `drawSpdBlueFx`; mirror-wash exclusion for different skins; harness `spdGreenTest` |

## Order to land
1. SPD Blue's owner commits `groundTeleport.js`, `spdBlue*.js` and `SPD_BLUE_WORLD`.
2. Then commit the spd_green hook lines above with `git commit --only` on the explicit shared paths, after re-checking that each hunk is still unique.
3. Shared Zord: when the shared Ranger Zord module exists, set `SPD_GREEN_ZORD.enabled` and route `ultimate` in `spdGreen.js:26-27` to it. The `fire0-2` "call" cells are reserved for it.
