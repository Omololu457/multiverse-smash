# Robin: ownership

Start HEAD: `5fa3bc8d6` (docs/robin/START_COMMIT.txt), branch `main`, existing checkout. No branch, clone or worktree.

## Owned by the Robin build (new files)
- `robinData.js`: frame data, Energy costs, gadget constants, ultimate script, timelines, roster entry.
- `robinState.js`: simulation. Smoke field, Smoke Step, bombs (engine projectiles), Dead Drop, Remote Override,
  Bomb Bat, airtime allowances, combat hooks, the CHECKMATE freeze module.
- `robin.js`: command layer (press edges → moves).
- `robinFx.js`: render only. Smoke, planted bomb + arming arc, blasts, Smoke Step echoes, OUTPLAY cue, HUD,
  expression icon, cut-in, intro card, skin materials.
- `robinSound.js`: WebAudio synth SFX, no voice.
- `robinSkins.js`, `robinKit.js`, `robinHarness.js`.
- Generated: `robinSprites.js`, `robinSkinTable.js`, `assets/robin/**`.
- `tools/robin/**`, `harness/robin*.mjs`, `docs/robin/**`, `docs/skins/robin/**`.

## Shared files (narrow `robin`-gated hook lines only)
- characters.js, spritesheets.js, skins.js, kits.js, credits.js, sound.js, combat.js, input.js, game.js, sprite.js.
- Every hook sits directly after the concurrent Raven line at the same site (`tools/robin/apply_hooks.py`,
  idempotent, anchor-count asserted). No Raven, Beast Boy, Cyborg or S.P.D. Yellow line is edited; the three
  `replace` hooks only append ` || …robin…` / `&& !…robin…` to the end of an existing condition list.
- Full hook list: `docs/robin/INTEGRATION.md`.

## Not owned (never edited or committed by this build)
- Cyborg (explicitly out of scope), Raven, Beast Boy, S.P.D. Yellow, Starfire files and hook lines.
- physics.js, flight.js, rosterParity.js, any other fighter's module, frame data or assets.
- `naruto_seventh_kcm_jump_uniform.png`, music, ratings and MP3 files.

## Commit policy
- Private index holding only Robin-owned files and Robin hunks. No bulk staging, no push, no merge, no deploy.
