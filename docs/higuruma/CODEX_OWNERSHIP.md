# Hiromi Higuruma: ownership

Start HEAD: `5fa3bc8d6` (docs/higuruma/START_COMMIT.txt). Branch `main`, existing checkout. No branch, clone or
worktree was created.

## Owned by the Higuruma build (new files)
- `higurumaData.js`: frame data, costs, Case File / Objection constants, ultimate script, timelines, roster entry.
- `higurumaState.js`: simulation (Case File, Precedent, Objection, travel, Rising Objection, Order shock, combat
  hooks, Deadly Sentencing frozen-cinematic module).
- `higuruma.js`: command layer (press edges → moves).
- `higurumaFx.js`: render only (events, materials, HUD, courtroom presentation, cut-in, intro card).
- `higurumaSound.js`: WebAudio synth SFX, seeded, no voice.
- `higurumaSkins.js`, `higurumaKit.js`, `higurumaHarness.js`.
- Generated: `higurumaSprites.js`, `higurumaSkinTable.js`, `assets/higuruma/**`.
- `tools/higuruma/**`, `harness/higuruma*.mjs`, `docs/higuruma/**`, `docs/skins/higuruma/**`.

## Shared files (narrow `higuruma`-gated hook lines only)
characters.js, spritesheets.js, skins.js, kits.js, credits.js, sound.js, combat.js, input.js, game.js, sprite.js.
See INTEGRATION.md.

## Not owned (never edited or committed by this build)
- Every other fighter's files and hook lines, including the concurrent, uncommitted Teen Titans / Megumi /
  S.P.D. Yellow work in the same worktree.
- physics.js, flight.js, rosterParity.js.
- `naruto_seventh_kcm_jump_uniform.png`, music, ratings and MP3 files.
- The source sheet `higuruma_hiromi_sprites_sheet_manga__by_mugengojoplayer_dm448a4.png` is read-only input.

## Commit policy
A private index holding only Higuruma-owned files and Higuruma hunks of the shared files. No bulk staging, no push,
no merge, no deploy.
