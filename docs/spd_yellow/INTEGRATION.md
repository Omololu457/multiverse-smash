# S.P.D. Yellow — shared integration hooks

Every shared-file change is a narrow, `spd_yellow`-gated line inserted beside the matching MMPR White / Pink line.
Each region was reread immediately before patching. Patches were anchored on a unique existing line, with an assertion that the anchor occurred exactly once.
No file was rewritten or reformatted.
Other characters' frame data is unchanged; the baselines below match their recorded values.

Line numbers are as of the build. A concurrent Cyborg session appends its own lines next to these; mine are untouched.

| File | Line(s) | Hook |
|---|---|---|
| `characters.js` | 13, 11505 | import + roster entry |
| `skins.js` | 22, 145 | import + `spd_yellow: SPD_YELLOW_SKINS` |
| `kits.js` | 8, 99 | import + `spd_yellow: SPD_YELLOW_KIT` |
| `spritesheets.js` | 60 | idle sheet |
| `credits.js` | 34-36 | credits entry |
| `sound.js` | 321, 331 | import + `...SPD_YELLOW_SOUNDS` |
| `combat.js` | 10 | import of the four hooks |
| `combat.js` | 708 | `getAttackHitbox`: `a?.my && rosterKey==='spd_yellow'` → `spdYellowHitbox` |
| `combat.js` | 3427 | block: `spdYellowBlock` (authored blockstun) |
| `combat.js` | 3488 | hit: `spdYellowHit(..., {armored})` (clean flag, MELEE coin; none when armored) |
| `combat.js` | 4409 | projectile hit: `spdYellowProjectileHit(..., {armored})` (GUN coin, Breach confirm, ultimate confirm) |
| `input.js` | 530, 591 | `_spdYellowRemoteInput` in the remote-input guard; `spd_yellow` in the pad raw-snapshot roster |
| `sprite.js` | 1141 | gated presentation write `fighter._lastSpriteFrame = this.frameIndex` (skin materials) |
| `game.js` | 27-30 | imports (command layer, state, Fx, harness API) |
| `game.js` | 87 | `SPD_YELLOW_WORLD = MMPR_BLACK_WORLD` |
| `game.js` | 1352 | `isSpdYellowUltActive()` in the rewind-unsafe cinematic list |
| `game.js` | 1417/1429, 5067/5083, 6146/6162, 10057/10073 | `clearSpdYellowUlt()` + `clearSpdYellow()` at rewind teardown, round reset, reset-to-start, rematch |
| `game.js` | 10028, 20218 | rematch + round-over clears (appended to the Ranger clear lines) |
| `game.js` | 20077 | training reset |
| `game.js` | 4124-4125, 4155 | FFA tick + cues, command layer |
| `game.js` | 11596-11597, 11813-11816 | 1v1 tick + cues, command layer (`'consumed'` / `'grab'`) |
| `game.js` | 11350 | movement lock (`spdYellowLocked`: blink, attack, stance, Up+Special, Up grace) |
| `game.js` | 5814 | replay checkpoint snapshot (`f._spdYellow`; `_falcon` / `currentAttack` already pushed by the Black line) |
| `game.js` | 20583 | `_spdYellowRemoteInput` during replay playback / LAN |
| `game.js` | 20748-20753 | ultimate freeze block (White / Pink contract) |
| `game.js` | 21444 | `drawSpdYellowFx` |
| `game.js` | 21797 | mirror-tint rule (different skins keep their palettes) |
| `game.js` | 27120 | `__harness.spdYellowTest` |

## Engine facts this build relies on

- **Animation:** `currentMove` maps directly to the strip key, and `frameTimeline` uses `elapsed = total - timer`.
- **Facing:** the whole cell mirrors, so the origin must be the cell's horizontal centre (`OX = 80`).
- **Gun hold:** the hold pins `currentAttack.timer` on frame 12 while Special is held. The sim clock keeps counting, and the draw threshold reads the clock, not the pinned timer.
- **Pose override:** `_spriteCastMove` / `_spriteCastTimer` give a presentation-only pose (the blink recovery); game.js decrements it.
- **Keyboard Up:** read from the `jump` key, so raw scripts must set `up` and `jump` together.
- **Render stepping:** `__harness.luffyTest.step(n)` renders once after n sim frames. Render-counting tests step one frame at a time.
- **No shared command-panel module exists.** The stance reads Yellow's own press edges. A future shared panel could adopt `stanceSelect` / `confirmOrder` from `spdYellowState.js` unchanged.
