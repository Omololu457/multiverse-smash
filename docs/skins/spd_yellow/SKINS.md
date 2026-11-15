# S.P.D. Yellow — skins

There are 9 entries: Default plus 8 skins. Every skin recolours Z's own pixels and nothing else:

- no borrowed body art
- no added spikes, wings, flames or circuitry
- not based on another Power Ranger

The pipeline is `tools/spd_yellow/build_skins.py`, which precomputes the sheets at build time. The rules are in `region_mapping.json` and the results in `skins_results.json` (96 passed / 0 failed).

## Region mask (one mask per strip, value = region × 50)

| Region | Meaning | Skin may change it? |
|---|---|---|
| 0 | transparent | no (alpha identical) |
| 1 | outline / visor, dark | no |
| 2 | yellow suit (9-step luminance ramp) | yes: replaced ramp, shading order preserved |
| 3 | trim stripes (silver pixels between suit pixels within 3 px) | yes |
| 4 | gloves, boots, belt, blade, firearms, beams (silver) | no |
| 5 | other | no |

The skins test checks every kept pixel against Default on every strip. It also checks the alpha masks and confirms the sim trace is identical for 600 frames: skins are cosmetic only.

## Skins

| Id | Name | Class | Material (render-only, suit mask only) | Notes |
|---|---|---|---|---|
| `spd_yellow_inspired_alienx` | Alien X — Inspired | Inspired Palette | stars (sparse, slow) | Black cosmic suit, pale stripes, rare highlights become green accents |
| `spd_yellow_inspired_upgrade` | Upgrade — Inspired | Inspired Palette | none | Dark suit; the existing stripe pixels turn neon green |
| `spd_yellow_inspired_diamondhead` | Diamondhead — Inspired | Inspired Palette | facet (occasional 1-px edge highlight) | Crystalline cyan/teal ramp |
| `spd_yellow_inspired_heatblast` | Heatblast — Inspired | Inspired Palette | none | Charcoal suit, ember lit side, molten orange/gold highlights and stripes |
| `spd_yellow_inspired_chromastone` | Chromastone — Inspired | Inspired Palette | crystal (tiny 4-point glint) | Purple/magenta palette |
| `spd_yellow_inspired_bigchill` | Big Chill — Inspired | Inspired Palette | none | Deep navy suit, icy-blue bright panels, pale cool stripes |
| `spd_yellow_starlight` | Starlight Glitter | Original Cosmetic | glitter (restrained pulses) | Dark violet suit, lavender highlights, silver stripes |
| `spd_yellow_opal` | Opal Prism | Original Cosmetic | opal (slow mint / lilac / gold accents) | Pale opal panels, soft-gold stripes |

- **Inspired palettes:** the Ben 10 franchise (Cartoon Network) is used as colour inspiration only. Reference links are in `region_mapping.json`.
- **Original cosmetics:** Starlight and Opal are original cosmetic designs, authorised by the user. They are not canon costumes.

## Material rules

- Materials are presentation only. They anchor to suit-mask pixels of the current sprite frame (`spdYellowMaterials.js` + `sprite.js` `_lastSpriteFrame`), so they never land on the outline, visor, gloves or weapons.
- Under Reduce Motion / Reduce Flashing, each material draws as one static frame (tested).
- The duplicate wears the owner's skin. The Ninja Megazord is never recoloured.
- In a mirror match with different skins, both palettes are kept. With the same skin, P2 gets the engine's standard mirror tint.
- The chosen skin persists through the menu → match → rematch path (tested live in `harness/spd_yellow_visual.mjs`).

## Captures (this folder)

- `skins_contact.png`: all 9 entries side by side.
- `<id>_light.png` / `<id>_dark.png`: each skin on a light and a dark stage.
- `<id>_clone_zord.png`: each skin with its duplicate and the Ninja Megazord.
- `mirror_*.png`: mirror-match captures.
