# Black Ranger — shared-file integration hooks

Everything Black-specific lives in owned files (below). Shared files carry only **narrow, `mmpr_black`-gated, contextual** hooks; no whole-file replacement, no formatter. Every hook references only things that exist at HEAD `d92ea1028` plus Black's own modules.

## Owned files (new)
`mmprBlackData.js` (data + roster entry + sortie profiles) · `mmprBlackState.js` (sim, Pincer, ultimate freeze module) · `mmprBlack.js` (command layer) · `mmprBlackFx.js` (render-only) · `mmprBlackSound.js` (WebAudio placeholders) · `mmprBlackSkins.js` · `mmprBlackKit.js` · `mmprBlackHarness.js` · generated `mmprBlackSprites.js` · **shared** `falconzord.js` + generated `falconzordSprites.js` · `assets/mmpr_black/**` · `assets/power_rangers/falconzord/**` · `tools/mmpr_black/{extract,build_skins}.py` · `harness/mmpr_black*.mjs` · `docs/mmpr_black/**` · `docs/power_rangers/falconzord/**` · `docs/skins/mmpr_black/**`.

## Shared hooks (sha256 prefix before → after my hooks)
| File | Before | After | Hook |
|---|---|---|---|
| characters.js | 1a9bce49 | a5e3f8bf | import `mmpr_black` from mmprBlackData.js; roster entry |
| spritesheets.js | cf8a6286 | 7e7555b6 | sheet registration for `mmpr_black` |
| skins.js | 445a1b0c | e5796a0d | `mmpr_black: MMPR_BLACK_SKINS` (Default + 6) |
| kits.js | 74c1d09d | (884b8f61; now 4443e685 after a concurrent session's command-throw lines) | import + `mmpr_black: MMPR_BLACK_KIT` |
| credits.js | f68e9775 | 206d65ff | credit entry: "Sprites ripped by Belial the Hedgehog." (Black + Falconzord sheets) |
| sound.js | ef9dd383 | 21312e9f | import + `...MMPR_BLACK_SOUNDS` (SFX bus only) |
| combat.js | dc4021dc | bd8b6c3e | import; zero-box hitbox gate outside contact windows; block / hit / projectile-hit hooks (gated `rosterKey==='mmpr_black'` or `proj._falcon`) |
| input.js | f8a6bb0b | d53e68ab | `_mmprBlackRemoteInput` skip on the pad branch + `mmpr_black` in the pad roster list |
| game.js | be164d61 | 32ab2d84 | see below |

game.js hooks: imports (4 lines) · `MMPR_BLACK_WORLD` (built from `SPD_RED_WORLD` + `activeProjectiles`/`spawnProjectile`) · 1v1 + FFA tick + cue calls · 1v1 + FFA command-layer blocks · movement lock `mmprBlackLocked(fighter, readRawControls(fighter))` · replay checkpoint push of `_mmprBlack` / `_falcon` / `currentAttack` · `clearMmprBlack` at every round / training / rematch / KO clear site · `clearMmprBlackUlt()` beside every freeze-cinematic clear · `isMmprBlackUltActive()` in the any-cinematic list · freeze block (`updateMmprBlackUlt`) after the Red Ranger freeze block · remote-input flag · `drawMmprBlackFx` in the fighter draw pass · same-skin mirror-wash exclusion · `mmprBlackTest` harness API (harness URLs only).

## Pending integration (NOT applied — documented options only)
- **rosterParity.js** (foreign, uncommitted) applies a ×1.3 boost to a listed set of keys. `mmpr_black` is NOT added; Black's damage lever is `MMPR_BLACK_DAMAGE_SCALE = 1.7` in its own data file. If the owner of rosterParity.js wants parity with the boosted Rangers, add `'mmpr_black'` to that list (one line) and re-run `harness/mmpr_black.test.mjs` (damage checks use measured ratios, the route damages in COMBOS_BALANCE.md would scale ×1.3).
- **AI**: Black uses the engine's generic CPU (normals/specials through the command layer). No Black-specific AI script was written.

## Commit note
Several of the shared files above also carry other sessions' uncommitted work. Black's commit is built from **HEAD blobs + only Black's hunks** (private index), so no foreign line is committed and the working tree / default index are untouched.
