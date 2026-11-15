# Cyborg — ownership

## Owned by the Cyborg build (new files)
- `cyborgData.js` (frame data, Heat / Power constants, projectile profiles, ultimate script, roster entry)
- `cyborgState.js` (simulation: Heat, overheat, vent, thruster reboost, weapons, Sonic Resonance, Hot Impact, weight, ultimate freeze module, combat hooks)
- `cyborg.js` (command layer: press edges → moves)
- `cyborgFx.js` (render-only: Heat HUD, expression icon, explosions, sonic bursts, vent puffs, cut-in, skin material accents)
- `cyborgSound.js` (WebAudio synth SFX; no voice) · `cyborgSkins.js` · `cyborgKit.js` · `cyborgHarness.js` · generated `cyborgSkinTable.js`
- generated `cyborgSprites.js`, `assets/cyborg/**`
- `tools/cyborg/**`, `harness/cyborg*.mjs`, `docs/cyborg/**`, `docs/skins/cyborg/**`

## Shared files (narrow `cyborg`-gated hook lines only)
characters.js, spritesheets.js, skins.js, kits.js, credits.js, sound.js, combat.js, input.js, game.js, sprite.js.
Every hook is listed in `docs/cyborg/INTEGRATION.md`.

## Not owned (never edited / committed by this build)
- All `spd_yellow` lines and files (concurrent S.P.D. Yellow session).
- rosterParity.js (Cyborg is deliberately not on its ×1.3 list).
- Any other fighter's module, frame data or assets.
