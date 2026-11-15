# Robin — skins

Default + 10 appearance skins. **Cosmetic only**: identical geometry, pivots, frame data, hitboxes, audio and damage
(the skins harness proves a 600-frame trace identical to Default for every skin). Skin ids are prefixed `rb_`, never
contain "cyborg" and never end in "AlienX", so the shared Superman-eye and starfield gates stay off.

Built offline by `tools/robin/build_skins.py` from `tools/robin/skins.json` → `assets/robin/skins/<tag>/` (every action
strip, portrait, cut-in bust / mask / mouths, health icons, bomb / explosion / smoke strips, material phases).
Review sheet: `docs/robin/skins_contact.png`. Per-file region audit: `docs/skins/robin/region_mapping.json`.

## Regions

The supplied art shares ONE navy ramp between hair, cape exterior, staff and boots, and ONE green ramp between the
sleeves / gloves and the legs, so every image is classified per connected component (never one global swap):

| region | how it is found | recoloured |
|---|---|---|
| hair | navy component meeting the face box (merged collar pixels split off per pixel) | yes |
| cape exterior | other navy components; anything touching the cape lining | yes |
| cape lining | yellow components bordering the cape (anything but a short belt band) | yes |
| torso | red | yes |
| arms (sleeves + gloves) | green not touching the boots — the source draws sleeves and gloves as one ramp with no dividing outline, so they share a region | yes |
| legs | green touching the boots | yes |
| boots | navy at the feet / touching the boot-white highlight (+ that highlight) | yes |
| belt | short yellow band touching torso / legs | yes |
| staff | thin elongated navy (area / longest side ≤ 3.2) | yes |
| bomb, smoke, explosion | luminance-ranked onto the skin's effect ramps | yes |
| natural skin, eye whites, mask-lens shading, black outline (= the black domino mask) | — | **never** |

Audit (every skin): zero source costume colours left outside the preserved mask lens; alpha byte-identical.

Known limit: in a few hurt / knockdown frames the cape flares beside the head and is classified with the hair.

## Skins

| id | name | classification | inspired by | notes |
|---|---|---|---|---|
| `rb_gotham_heir` | Gotham Heir | Crossover-Inspired Palette (custom) | Batman (DC) | Batman-inspired: charcoal suit, graphite boots / gloves, deep-black outer cape, warm gold lining, restrained amber gadget effects. Colour scheme only — not an official Robin costume. |
| `rb_bluebird_protocol` | Bluebird Protocol | Crossover-Inspired Palette (custom) | Nightwing (DC) | Nightwing-inspired: midnight fabric, electric-blue trim on the existing costume regions, blue-black hair, cool cyan gadget effects. Robin's costume geometry is unchanged. |
| `rb_redline_vigilante` | Redline Vigilante | Crossover-Inspired Palette (custom) | Red Hood (DC) | Red Hood-inspired: crimson and charcoal, dark cape lining, red-orange gadget flashes. No helmet and no firearms are added. |
| `rb_court_of_ivory` | Court of Ivory | Original Custom | — (custom) | Original: porcelain and bone-white cloth, dark brown gloves / hair, antique gold trim. The black outlines and the dark brown keep contrast on bright stages. |
| `rb_cursed_prodigy` | Cursed Prodigy | Crossover-Inspired Palette (custom) | Jujutsu Kaisen | JJK-inspired: pink hair, charcoal clothing, wine-red cape lining, rose-violet gadget effects. Natural human skin is kept separate and unchanged. |
| `rb_limitless_blue` | Limitless Blue | Crossover-Inspired Palette (custom) | Jujutsu Kaisen (Gojo) | Gojo-inspired: pale hair, navy-black suit, brilliant cyan accents. Robin's own mask shape is kept; no blindfold is drawn. |
| `rb_omnitrix_operative` | Omnitrix Operative | Crossover-Inspired Palette (custom) | Ben 10 | Ben 10-inspired: black / white / green costume palette and vivid green gadgets. No Omnitrix and no logo are added. |
| `rb_starfield_detective` | Starfield Detective | Crossover-Inspired Palette (custom) | Ben 10 (Alien X) | Alien X-inspired: near-black fabric with sparse stars confined to cloth, silver trim, pale cape lining, cosmic-violet smoke. Human skin remains its own region. Material: stars on cape, torso, arms, legs. |
| `rb_neon_afterimage` | Neon Afterimage | Original Custom | — (custom) | Original: midnight purple, turquoise and hot magenta in sharply separated regions; bright speed echoes, readable bombs, no strobing. |
| `rb_gilded_night` | Gilded Night | Reward-Style Original | — (custom) | Original reward-style black-and-gold costume, warm ivory cape lining, subtle gold glitter on cloth / trim, restrained gold explosion accents. Material: glitter on cape, lining, belt, torso. |

"Inspired" skins are colour interpretations on Robin's unchanged pixels — not official costumes, no logos, no new
geometry. Custom skins are original.

## Materials

Starfield Detective (stars) and Gilded Night (glitter) use 4 precomputed overlay phases per strip
(`assets/robin/skins/<tag>/mat/p<k>/<strip>.png`) written only on the listed cloth / trim regions, 1 px inside the
region edge, by deterministic hash (no RNG). robinFx crossfades them slowly (64-tick period) inside the body's own
draw rect; under Reduce Motion / Reduce Flashing only the static phase-0 overlay is drawn. Images are cached once.

## Mirrors and persistence

Different skins keep their own palettes; a same-skin mirror gets the existing P2 wash. The chosen skin persists
through the shared session store (verified across a reload).

