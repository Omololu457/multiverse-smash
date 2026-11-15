# Robin: integration

All hooks are applied by `python3 tools/robin/apply_hooks.py` (`--check` previews). Each anchor must occur exactly
the expected number of times; a hook whose marker is already present is skipped (re-running is a no-op). The file is
re-read immediately before writing and left untouched if another writer changed it in between.

| file | hook | purpose |
|---|---|---|
| characters.js | `import { robin }` + `robin,` roster line | registration (DC universe) |
| spritesheets.js | `robin: { actions: { idle } }` | sprite preload |
| kits.js | `ROBIN_KIT` import + entry | Move List |
| skins.js | `ROBIN_SKINS` import + entry | Default + 10 skins |
| sound.js | `ROBIN_SOUNDS` import + spread | `robin_*` synth cues (SFX bus) |
| credits.js | `robin` credit entry | supplied-sheet credit (panel quoted verbatim) |
| combat.js | `robinHitbox` | per-move fist / staff box; gadgets have no body box |
| combat.js | `robinBlock` | authored blockstun |
| combat.js | `robinHit` | clean flag (chain / staff / special / ult cancels), OUTPLAY cue, ult confirm |
| combat.js | `robinProjectileHit` | bomb / blast contact bookkeeping |
| sprite.js | `_rbLand` → `'land'` | supplied Landing sequence after a genuine landing |
| sprite.js | `_lastSpriteFrame` | frame read for materials / Smoke Step echoes |
| input.js | readRawControls roster list + 2 remote-input skips | pad / replay / LAN feed the same raw snapshot |
| game.js | imports, `ROBIN_WORLD = MMPR_BLACK_WORLD` | world accessors |
| game.js | `isRobinUltActive()` in the cinematic list | freeze contract |
| game.js | `clearRobinUlt()` ×4, `clearRobin` loops ×4, long clear lines ×2, per-fighter clear | reset / rematch / KO / next round |
| game.js | `tickRobin` + `playRobinCues` (FFA + 1v1) | per-sim-frame tick |
| game.js | `updateRobinCommandCombat` (FFA + 1v1) | command layer, returns 'consumed' / 'grab' |
| game.js | snapshot `f._robin`, `currentAttack.rb`, `_rbLand` | replay / LAN GAME_STATE |
| game.js | `robinLocked` in the movement-lock list | committed moves own the body; Smoke Step starts here |
| game.js | charge gate `!robinOwnsCharge(fighter)` | L2 is Remote Override only with an armed Dead Drop / held command |
| game.js | `_robinRemoteInput` | replay / LAN drive Robin from the raw stream |
| game.js | `updateRobinUlt` freeze block | ultimate frames |
| game.js | `drawRobinFx`, mirror rule, `drawRobinHud`, `drawRobinIntroCard` (INTRO case) | presentation |
| game.js | `robinTest` harness api | tests only (harness URLs) |

Robin uses the shared engine everywhere else: `combat.startMove` (frameExact), `spawnProjectile` for bombs and the
blast volume, the shared double jump (`maxJumps 2`), dash, guard, grab, combo breaker, juggle and damage scaling.
