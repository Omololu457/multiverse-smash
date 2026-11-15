# Syndrome — skins (whole arsenal)

Twelve cosmetic skins plus Default. Each one recolours **Syndrome AND every machine he commands** — Gun / Bomber /
Hatch Drones, the Spinner, the gun / missile / mortar Turrets, the Velocipod and every component of the composite
Omnidroid (shell halves, eye states, limbs, legs, claws, laser arm) — plus his portrait and the HUD / reticle accents.
A skinned Syndrome never stands in front of a default Omnidroid.

| Stable id | Name | Classification | Pattern | Palette intent |
|---|---|---|---|---|
| `sy_winning_valkyrie` | Winning Valkyrie | Original Custom | glitter | Original: victory-parade white and gold, valkyrie-blue cape, champion-gold machines with crimson lenses. |
| `sy_man_of_tomorrow` | Man of Tomorrow | Crossover-Inspired Palette (custom) — Superman (DC) | — | Superman-inspired: blue suit, red cape, yellow accents; machines in steel blue with red lenses and sun-yellow energy. Colour scheme only, no emblem. |
| `sy_celestial_conductor` | Celestial Conductor | Crossover-Inspired Palette (custom) — Alien X (Ben 10) | stars | Alien X-inspired: void-black bodies with baked white stars, white horns-and-trim reading on the light parts, green glow. Colour scheme only. |
| `sy_living_network` | Living Network | Crossover-Inspired Palette (custom) — Upgrade (Ben 10) | circuit | Upgrade-inspired: black techno-organic bodies with baked green circuit lines and green optics. Colour scheme only. |
| `sy_crystal_engine` | Crystal Engine | Crossover-Inspired Palette (custom) — Diamondhead (Ben 10) | crystal | Diamondhead-inspired: faceted teal-green crystal plating with baked glints, black suit trim, cyan energy. Colour scheme only. |
| `sy_furnace_king` | Furnace King | Crossover-Inspired Palette (custom) — Heatblast (Ben 10) | embers | Heatblast-inspired: charred-rock maroon plating with baked ember flecks, flame-orange hair and energy, lava lenses. Colour scheme only. |
| `sy_cursed_rose` | Cursed Rose | Original Custom | rose | Original (Jujutsu-themed pink package): wine-black plating, rose-pink cape and energy, baked rose-petal flecks. |
| `sy_infinity_system` | Infinity System | Crossover-Inspired Palette (custom) — Satoru Gojo (Jujutsu Kaisen) | — | Gojo-inspired: navy-black suit, snow-white hair, ice-blue machines with cyan Infinity optics. Colour scheme only. |
| `sy_spectral_parade` | Spectral Parade | Original Custom | — | Original: ghost-parade lavender and pale mint, translucent-looking light plating, violet lenses. |
| `sy_rose_gold_tyrant` | Rose-Gold Tyrant | Original Custom | — | Original: brushed rose-gold plating, charcoal suit with rose-gold trim, burgundy cape, champagne glow. |
| `sy_aurora_orchestra` | Aurora Orchestra | Original Custom | aurora | Original: night-sky navy with baked aurora bands of green to violet across the plating, teal cape, aurora-green energy. |
| `sy_gilded_omnipotence` | Gilded Omnipotence | Original Custom | glitter | Original: the whole orchestra cast in polished gold over jet black, with baked glitter, ivory trim and ruby lenses. |

Crossover-inspired entries are **colour schemes only** on the unchanged supplied pixels: no logos, emblems, geometry or
character art from those franchises. Ids are prefixed `sy_`, never end in `AlienX` (the shared starfield
gate would fill the whole cell) and never contain `cyborg` (Superman's eye-overlay gate).

## How they are built

`python3 tools/syndrome/build_skins.py` (spec: `tools/syndrome/skins.json`) precomputes every strip once:

- The GBA art is INDEXED (body 15 colours, drone 17, spinner 16, turret 16, velocipod 18, Omnidroid 19), so regions are
  **exact-colour roles per family**: suitDark / suitLight / cape / hair (Syndrome), metal (grey plating), armor (Omnidroid
  navy-violet shell, Velocipod blue hull), accent (red lenses / warning strips), camo (olive panels), glow (yellow /
  orange / cyan energy). The full table is `docs/syndrome/region_mapping.json`.
- Spatial refinements only where one colour plays two parts: body black touching transparency = outline (kept); interior
  black away from the face = the suit; whites within 2 px of skin = eye whites (kept).
- **Never recoloured**: outline black, skin tones (Syndrome's face and hands, the Velocipod rider's face), smoke / dust
  greys in effect strips.
- Each role's source colours are ranked by luminance and mapped onto the skin's 3-stop ramp, so shading is preserved.
- Patterns (stars, glitter, circuit, crystal, embers, rose, aurora) are **static, deterministic hash placements** keyed
  by the cell-local position and baked into the PNGs — no animation, no RNG, no runtime pixel work.
- Alpha, dimensions and strip layout are byte-identical to Default → anchors, hitboxes, timing and frame data cannot
  change. `harness/syndrome_skins.test.mjs` checks a 600-frame authoritative trace per skin against Default.

## Runtime

`syndromeSkins.js` re-points the body strips; `syndromeFx.js` draws every machine from
`assets/syndrome/skins/<tag>/machines/` when Syndrome wears a skin (images are cached once per URL; no per-frame
canvas allocation). Mirror matches follow the shared rule: different skins keep their own palettes; the same skin on
both sides gets the existing P2 mirror wash.

## Previews

- `docs/syndrome/skins_contact.png` — Default + all 12 rows (Syndrome, Drone, Spinner, gun turret, missile turret,
  Velocipod, Omnidroid shell, claw, eye).
- `docs/syndrome/preview_<tag>.png` — one row per skin (e.g. `preview_winning_valkyrie.png`,
  `preview_man_of_tomorrow.png`, `preview_celestial_conductor.png`, `preview_cursed_rose.png` +
  `preview_infinity_system.png` = the Jujutsu-themed pink / Gojo pair).
- `docs/syndrome/skins/<id>_arsenal.png`, `_light.png`, `_dark.png` — in-game captures with the
  skinned Duet, turret and Omnidroid on screen, on a bright and a dark stage.
