# Beast Boy — ownership

Built on `main` in the shared worktree, alongside concurrent uncommitted Cyborg and S.P.D. Yellow work (see START_STATE.md, start HEAD `5fa3bc8d6`). No branch switch, pull, merge, stash, reset, clean or bulk staging. Commits use a private index containing ONLY the paths and hunks below. The foreign work is never staged, never committed and never pushed.

## Owned outright (new files)
- Modules: `beastBoy.js` (command layer), `beastBoyState.js` (sim), `beastBoyData.js` (frame data + roster entry), `beastBoyFx.js` (render-only), `beastBoySound.js`, `beastBoySprites.js` (generated), `beastBoySkins.js`, `beastBoySkinTable.js` (generated), `beastBoyKit.js`, `beastBoyHarness.js` (test accessor).
- Art: `assets/beast_boy/**` (strips, portrait, cut-in, icons, credit panel, 10 skin sets incl. material overlays).
- Tools: `tools/beast_boy/**` (`extract.py`, `build_skins.py`, `skins.json`, `source_greens.json`, `apply_hooks.py`, `write_docs.py`).
- Tests: `harness/beast_boy.test.mjs`, `beast_boy_boot.mjs`, `beast_boy_determinism.mjs`, `beast_boy_skins.test.mjs`, `beast_boy_visual.mjs`, `beast_boy_framedata_diff.mjs`.
- Docs: `docs/beast_boy/**`, `docs/skins/beast_boy/**`.
- Source sheet: `Game Boy Advance - Teen Titans - Playable Characters - Beast Boy.png` (supplied input; read-only, sha256 recorded).

## Shared files (Beast Boy hunks only; see INTEGRATION.md)
`characters.js`, `combat.js`, `credits.js`, `game.js`, `input.js`, `kits.js`, `skins.js`, `sound.js`, `sprite.js`, `spritesheets.js`. Each of these files ALSO carries uncommitted Cyborg / S.P.D. Yellow hunks. Those belong to their own sessions.

The Beast Boy hooks sit directly after Cyborg lines. A Beast Boy commit therefore applies only its own hunks on top of HEAD, and the import / registration lines must be re-anchored if the Cyborg lines are not yet committed. `apply_hooks.py` documents every hunk for that.

## Never touched
`naruto_seventh_kcm_jump_uniform.png`, music / ratings / MP3s, and every other character's files, the other Teen Titans sheets, `cyborg*`, `spdYellow*`.
