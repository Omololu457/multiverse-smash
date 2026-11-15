# Raven: ownership

## Owned by the Raven build (new files)
- `ravenData.js`: frame data, Energy costs, spell / object / shield / levitation constants, ultimate script, roster entry.
- `ravenState.js`: simulation. Covers levitation, brick piles, Dark Pulse, infusion, Soul Shell, the ultimate freeze module and the combat hooks.
- `raven.js`: command layer (press edges → moves).
- `ravenFx.js`: render only. Covers piles, breaking debris, auras, HUD pile indicators, expression icon, cut-in and skin materials.
- `ravenSound.js`: WebAudio synth SFX, no voice.
- `ravenSkins.js`, `ravenKit.js` and `ravenHarness.js`.
- Generated: `ravenSprites.js`, `ravenSkinTable.js` and `assets/raven/**`.
- `tools/raven/**`, `harness/raven*.mjs`, `docs/raven/**` and `docs/skins/raven/**`.

## Shared files (narrow `raven`-gated hook lines only)
- The shared files are characters.js, spritesheets.js, skins.js, kits.js, credits.js, sound.js, combat.js, input.js, game.js and sprite.js.
- Every hook is appended after the concurrent Beast Boy line at the same site.
- No Beast Boy, Cyborg or S.P.D. Yellow line is edited.
- The full hook list is in `docs/raven/INTEGRATION.md`.

## Not owned (never edited or committed by this build)
- The `spd_yellow`, `cyborg` and `beast_boy` files and hook lines (concurrent sessions). Cyborg is explicitly out of scope for this task.
- physics.js, flight.js and rosterParity.js.
- Any other fighter's module, frame data or assets.
- `naruto_seventh_kcm_jump_uniform.png`, and all music, ratings and MP3 files.

## Commit policy
- Commits go through a private index holding only Raven-owned files and Raven hunks. No bulk staging.
- No push, merge to main or deployment.
