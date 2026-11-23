# MSV1-DINO — the Dino Thunder framework

`dinothunder` is ONE roster character. Its live `rosterKey` is always the ACTIVE form (`dt_red`, `dt_blue`, `dt_yellow`,
`dt_white`), so every engine / ninja.js path runs exactly as it does for any single ninja profile; `f._duo` (id `dinothunder`)
carries the team state and rides in `ninjaSnapshot` → replay / LAN. No Math.random anywhere; render-only state is in `dinoFx.js`.

## Modules
| file | role |
|---|---|
| `dinoSprites.js` | generated strip table (tools/dino/pack.py) |
| `dinoData.js` | the four ninja.js profiles + hidden roster entries: anims, frame data, commands, streak / mirror / float blocks |
| `dinothunder.js` | the visible entry, form swap, gem powers, Super Dino Mode, Corruption, evades / streak gate, CPU swap |
| `dinoSupers.js` | the four 1-bar supers + the Z-Rex Blaster team ultimate (scripts on the sim clock) |
| `dinoState.js` | leaf damage modifiers called from `combat.js applyScaledDamage` (no-op unless a Dino fighter is involved) |
| `dinoFx.js` / `dinoSound.js` / `dinoKit.js` | render, SFX (dt_* cues), Move List |
| `tools/dino/hooks.py` | every line added to a shared file, anchor-based and idempotent; `pcommit.py` commits through a private index |

## GAME_STATE (`f._duo`)
| field | meaning |
|---|---|
| `form` / `start` | active form / round start form (skin `start_<colour>`) |
| `held`, `pAt`, `pClean`, `prev` | hold-P and double-tap-P detector (raw input edges) |
| `want`, `wantTo`, `lastRefuse` | the queued swap (buffered `arm` = 18 f) and why the last one was refused |
| `swap`, `cd`, `swaps`, `lastSwap` | the 14-frame swap in progress, the 90-frame cooldown, counters, the last swap's measured frames / invuln / cost |
| `tagAny`, `strikes`, `tagHits` | the swap-in strike's +10 % next-special window (180 f) |
| `sdm` | Super Dino Mode frames left (+20 % dmg, heavy 1-hit armor, gem regen ×2); `sdmEndedBy` = 'trent' |
| `speed` / `skin` / `camo` | Super Speed / Tricera Skin / Camouflage frames left (a swap ends all three) |
| `corr`, `corrAcc`, `evil`, `evilDrain` | Corruption 0–100, damage accumulator, Evil White Ranger frames, HP drain accumulator |
| `hs`, `encore` | High Score hit count (the engine combo counter), Ptera Scream encore window / once-per-combo flag |
| `cpu` | the CPU's own input script (it presses the same keys) |

## Adding a fifth Ranger (e.g. Black Dino)
1. Cut / pack the sheet into `assets/dt_black` (extend `tools/dino/pack.py` FORMS).
2. Add a `PROFILE` / `STATS` / `INFO` / `STRIPS` / `COMMANDS` entry in `dinoData.js` and push `'dt_black'` onto `DINO_FORMS`.
3. Give it a key in `DINO_KEYS` (dinothunder.js) and a super in `dinoSupers.js` `DINO_SUPERS`.
4. Add `dt_black` to the four roster-key hooks in `tools/dino/hooks.py` (characters, spritesheets, rosterParity, battleBlood, input).
