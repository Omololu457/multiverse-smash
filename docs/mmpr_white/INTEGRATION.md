# White Ranger — shared-file integration hooks

Everything White-specific lives in owned files. Shared files carry only **narrow, `mmpr_white`-gated hook lines** (no whole-file replacement, no formatter), applied after rereading each region. The concurrent Pink session (`mmpr_pink`) held/released the shared files by message; White's hooks sit next to Black's.

## Owned files (new)
`mmprWhiteData.js` (moves, constants, Ninja Megazord order profiles, roster entry) · `mmprWhiteState.js` (sim: disciplines, Formation, orders, Leader's Return, Ascent/Descent, ultimate freeze module) · `mmprWhite.js` (command layer) · `mmprWhiteFx.js` (render-only: order, HUD, ultimate, blink ghost) · `mmprWhiteSound.js` (WebAudio SFX) · `mmprWhiteSkins.js` · `mmprWhiteKit.js` · `mmprWhiteHarness.js` · generated `mmprWhiteSprites.js` + `ninjaMegazordSprites.js` · `assets/mmpr_white/**` · `assets/power_rangers/ninja_megazord/**` · `tools/mmpr_white/{extract,build_skins}.py` · `harness/mmpr_white*.mjs` · `docs/mmpr_white/**` · `docs/power_rangers/ninja_megazord/**` · `docs/skins/mmpr_white/**`.

## Shared hooks (sha256 prefix HEAD `b9227a377` → working tree after White's hooks; the working tree may also carry other sessions' lines, which are NOT White's and are not committed by White)
| File | HEAD | Now | White hook |
|---|---|---|---|
| characters.js | 4a498925 | 2691cc30 | import `mmpr_white`; roster entry |
| spritesheets.js | 0fe7044c | 80782b9f | sheet registration |
| skins.js | d75d05bb | 49f24bdc | import + `mmpr_white: MMPR_WHITE_SKINS` (Default + 6) |
| kits.js | 6be7f663 | 4006a596 | import + `mmpr_white: MMPR_WHITE_KIT` |
| credits.js | 08bf6cc8 | 471728c6 | White Ranger + Ninja Megazord credit entry (Belial) |
| sound.js | 21312e9f | ae34b73b | import + `...MMPR_WHITE_SOUNDS` (SFX bus) |
| combat.js | 1e1e6d7c | 5f192113 | import; hitbox gate / block / hit hooks (`a?.mw && rosterKey==='mmpr_white'`) |
| input.js | 19df75e7 | 0f1c6179 | `_mmprWhiteRemoteInput` skip + `mmpr_white` in the pad roster list |
| game.js | ebb98140 | ce9f2359 | see below |
| falconzord.js | de6a8dc1 | 2e2ca737 | **one line**: optional per-contact `gate` (skipped unless `so.gates` contains it); absent → unchanged behaviour |
| mmprBlackFx.js | 1c2e5092 | 1ad82edc | exported `drawZordCell(c, cells, …)` + `preloadZordCells` (same body as `drawFalconCell`, one shared cache) |
| mmprBlackState.js | 0166ee4c | 373f8702 | tick early-out clears only Black's own leftovers (was deleting any other owner's shared `_falcon`) |
| rangers.js | fbeb33d7 | fb4c0436 | `clearRanger` releases `_rooted` when a live blink is cleared (a reset mid-blink left any Ranger unable to walk/jump) |

game.js hooks: 4 imports · `MMPR_WHITE_WORLD = MMPR_BLACK_WORLD` · `isMmprWhiteUltActive()` in the any-cinematic list · `clearMmprWhiteUlt()` beside each `clearMmprBlackUlt()` · round / training / rematch / identity / pair clears · FFA + 1v1 tick and cue calls · FFA + 1v1 command blocks · movement lock `mmprWhiteLocked(fighter, readRawControls(fighter))` · replay snapshot of `_mmprWhite` · remote-input flag · ultimate freeze block after Black's · `drawMmprWhiteFx` after `drawMmprBlackFx` · mirror rule · `__harness.mmprWhiteTest`.

## Pending integration (NOT applied)
- **rosterParity.js** (foreign, uncommitted ×1.3 list): `mmpr_white` is not added; White's lever is `MMPR_WHITE_DAMAGE_SCALE = 1.7` in its own data.
- **AI**: White uses the engine's generic CPU through the command layer; no White-specific AI script (it will not deliberately build Formation).

## Commit method
Private index from HEAD blobs + only White's hunks for shared files; working tree and the default index are untouched; no push.
