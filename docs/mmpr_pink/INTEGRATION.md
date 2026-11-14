# Pink Ranger — shared-file integration hooks

Everything Pink-specific lives in owned files. Shared files carry only **narrow, `mmpr_pink`-gated, contextual** hooks. There is no whole-file replacement and no formatter. Each hook references only things that exist at the start commit `b9227a377` plus Pink's own modules.

## Owned files (new)

- **Modules**
  - `mmprPinkData.js`: data, roster entry, sortie profiles and the Ranger profile
  - `mmprPinkState.js`: sim, bow, Spotter Link, Thread, the call/commit flow and the ultimate freeze module
  - `mmprPink.js`: command layer
  - `mmprPinkFx.js`: render-only
  - `mmprPinkSound.js`: WebAudio SFX synthesis
  - `mmprPinkSkins.js`, `mmprPinkKit.js`, `mmprPinkHarness.js`
  - generated: `mmprPinkSprites.js`, `thunderMegazordSprites.js` (shared)
- **Assets:** `assets/mmpr_pink/**`, `assets/power_rangers/thunder_megazord/**`
- **Tools:** `tools/mmpr_pink/{extract,build_skins,apply_hooks_game}.py`
- **Harnesses:** `harness/mmpr_pink{.test,_determinism,_skins.test,_visual}.mjs`
- **Docs:** `docs/mmpr_pink/**`, `docs/power_rangers/thunder_megazord/**`, `docs/skins/mmpr_pink/**`

## Shared hooks

The table gives the sha256 prefix at the start, and now (the "now" column includes other live sessions' work, e.g. White Ranger's).

| File | Start | Now | Pink hook |
|---|---|---|---|
| game.js | 32ab2d84 | ce9f2359 | See below. Applied by the guarded `tools/mmpr_pink/apply_hooks_game.py`. |
| combat.js | bd8b6c3e | 5f192113 | import; hitbox gate; block / hit hooks; projectile hook `mmprPinkProjectileHit(proj, fighter, {armored})` |
| input.js | d53e68ab | 0f1c6179 | `_mmprPinkRemoteInput` skip on the pad branch (2 sites); `mmpr_pink` added to the pad roster |
| characters.js | a5e3f8bf | 2691cc30 | import + roster entry |
| spritesheets.js | 7e7555b6 | 80782b9f | sheet registration |
| skins.js | e5796a0d | 49f24bdc | `mmpr_pink: MMPR_PINK_SKINS` (Default + 6) |
| kits.js | 4443e685 | 4006a596 | import + `mmpr_pink: MMPR_PINK_KIT` |
| credits.js | 206d65ff | 471728c6 | credit entry: "Sprites (shamefully) ripped by Belial." (Pink) + "Sprites Ripped by Belial" (Thunder Megazord) |
| sound.js | 21312e9f | ae34b73b | import + `...MMPR_PINK_SOUNDS` (SFX bus only) |
| falconzord.js (shared scheduler) | de6a8dc1 | 2e2ca737 | **Backward-compatible** changes. Black's calls are unchanged, and Black's harnesses were rerun green. See below. |

### falconzord.js changes

- `falconCommit(f, opp, W, at = null)`: an optional fixed strike point (the Spotter/default point captured at acceptance).
- The contact box honours `dx`.
- `strike()` honours a per-profile `move` name.
- The per-contact `gate` line in this file belongs to the **White session**, not Pink.

### game.js hooks

- **Wiring**
  - 4 imports
  - `MMPR_PINK_WORLD = MMPR_BLACK_WORLD` (same world adapter)
  - 1v1 + FFA tick, cue and command-layer blocks
  - movement lock `mmprPinkLocked`
  - remote-input flag
- **Freeze-cinematic ultimate**
  - `isMmprPinkUltActive()` in the any-cinematic list
  - freeze block after Black's
  - `clearMmprPinkUlt()` beside every `clearMmprBlackUlt()`
- **Clearing state:** `clearMmprPink` at every round / training / rematch / KO / identity-swap clear site.
- **Replay / LAN:** checkpoint push of `_mmprPink`.
- **Rendering:** `drawMmprPinkFx` before Black's; same-skin mirror-wash rule.
- **Test only:** `mmprPinkTest` harness API (harness URLs only).

## Pending integration (NOT applied — options only)

- **rosterParity.js** (foreign, uncommitted) applies ×1.3 to a listed set of Rangers. `mmpr_pink` is **not** added. Pink's lever is `MMPR_PINK_DAMAGE_SCALE = 1.7`. If parity with the boosted Rangers is wanted:
  1. Add `'mmpr_pink'` to that list (one line).
  2. Rerun `harness/mmpr_pink.test.mjs`. Route damages would scale ×1.3.
- **AI.** Pink uses the engine's generic CPU through the command layer. There is no Pink-specific AI script, so the CPU does not deliberately use the Spotter Link, Thread the Needle or the Drawn Shot.

## Commit note

Several shared files also carry other sessions' uncommitted work. Pink's commit is built from **HEAD blobs + only Pink's hunks** (private index). No foreign line is committed, and the working tree and default index are untouched.
