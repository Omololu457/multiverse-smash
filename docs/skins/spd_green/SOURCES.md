# S.P.D. Green skins — sources & classification
Built by `tools/spd_green/build_skins.py`; masks are in `assets/spd_green/skins/masks/` and regions in `region_mapping.json`; contact sheet is `skins_contact.png`.
Only two regions are recoloured, both through a closed palette: SUIT (green ramp) and TRIM (light greys/white). Black, grey, the visor, and the weapon/effect light blobs are preserved. The builder asserts that alpha and all non-region pixels are unchanged.

| Skin | id | Classification | Source / caveat |
|---|---|---|---|
| Default | default | Default | Original sheet pixels, unchanged |
| Alien X — Inspired | spdGreenAlienX | Crossover palette | Ben 10 Alien X scheme; shared starfield overlay (id ends "AlienX") |
| Upgrade — Inspired | spd_green_inspired_upgrade | Crossover palette | Dark suit with green-glow trim; no circuitry added |
| Diamondhead — Inspired | spd_green_inspired_diamondhead | Crossover palette | Cyan/teal suit; no crystals |
| Heatblast — Inspired | spd_green_inspired_heatblast | Crossover palette | Volcanic suit with orange trim; no flames |
| SPD Blue — Inspired Palette | spd_green_inspired_spd_blue | Team palette swap | Blue sheet's exact 6-step ramp; still Bridge, not Sky |
| SPD Shadow — Inspired Palette | spd_green_inspired_shadow | Original interpretation | Navy/silver; no canine features |

Verified by `harness/spd_green_skins.test.mjs` (56/0):
- 35-action traces are identical to Default for every skin.
- Shots use the skin's beam sheet.
- Different-skin mirrors drop the wash; same-skin mirrors keep it.
