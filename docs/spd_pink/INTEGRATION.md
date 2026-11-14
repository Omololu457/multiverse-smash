# S.P.D. Pink — Shared-file Integration (status: APPLIED IN WORKTREE, NOT COMMITTED)

There are 33 small spd_pink-gated additions. Each was applied by a hash-guarded, unique-anchor patch and sits next to the spd_green line.
Afterwards I diffed against the pre-patch backups: only spd_pink lines differ.

The hooks are **not committed**, for the same reason as Green's. They depend on uncommitted SPD Blue work (`SPD_BLUE_WORLD` in game.js, plus the untracked `groundTeleport.js`).

| File | Hook |
|---|---|
| characters.js | import `spd_pink` from `./spdPinkData.js`; roster entry after `spd_green` |
| spritesheets.js | `spd_pink: { actions: { idle: './assets/spd_pink/idle.png' } },` |
| skins.js | import + `spd_pink: SPD_PINK_SKINS,` |
| kits.js | import + `spd_pink: SPD_PINK_KIT,` |
| credits.js | `spd_pink` credit entry |
| combat.js | import; `spdPinkHitbox`/`spdPinkBlock`/`spdPinkHit` after Green's; **counter hook** at the top of `resolveAttackHit` after the overlap test: `if (spdPinkCounter(defender, attacker)) { …COUNTER_HIT…; return }` (the Nezuko/Baki/Kurapika negate pattern) |
| input.js | `!fighter._spdPinkRemoteInput` in the controller skip; `spd_pink` in the readRawControls pad list |
| game.js | imports; FFA + 1v1 `tickSpdPink`/cues/command block; `spdPinkLocked` in the lock condition; determinism snapshot; `clearSpdPink` at the clear/KO/round sites; remote-input flag; `drawSpdPinkFx`; mirror-wash exclusion; harness `spdPinkTest` |

## Order to land
1. Codex commits SPD Blue (`groundTeleport.js`, `spdBlue*.js`, `SPD_BLUE_WORLD`).
2. Commit the Green hooks, then the Pink hooks, with `git commit --only` on the explicit shared paths, after rechecking that each anchor is unique.
3. Zord: once a shared Ranger Zord module exists, set `SPD_PINK_ZORD.enabled` and route the `ultimate` press in `spdPink.js` to it.
