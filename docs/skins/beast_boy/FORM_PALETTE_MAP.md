# Beast Boy — form palette map (10 skins)

Built by `tools/beast_boy/build_skins.py` from `tools/beast_boy/skins.json` → precomputed sheets in `assets/beast_boy/skins/<tag>/` (no runtime recolouring).
Contact sheet: `skins_contact.png` (Default + 10 × idle, portrait, gorilla, bird, tiger, triceratops, two mid-morph cells, hurt, defeat). Region pixel counts per form: `region_mapping.json`.

## Region rules (every skin)

- **Human**: exact-colour regions — skin (4 shades), hair (3), costume purple (3), costume grey (2); the shared dark outline-adjacent shade (24,40,48) is split per pixel by a 5×5 majority vote into dark-skin / dark-hair / dark-purple / dark-grey. Eyes = small white+iris blobs inside the upper face (clipped to the white's box ±1) → `eye` colour or, if null, the hair ramp (so no source teal survives).
- **Morph cells**: costume colours stay costume; every green / teal / dark pixel belongs to the ARRIVING animal (so a natural skin never flashes green for one frame).
- **Gorilla**: fur 4 shades. **Tiger**: body 4, stripe, muzzle / underside 3 (source teal). **Bird**: plumage 3, shadow, beak 4 (source green). **Triceratops**: body 4, shadow, underside (0,64,96), horn (white).
- **Kept neutral**: black outlines, eye whites, teeth, the grey slash / impact arcs (`fx`).
- **Masks**: the alpha mask of every recoloured strip is asserted byte-identical to Default (same silhouette, same anchors through every morph). Build asserts ZERO source-green pixels left (Upgrade is the only skin whose OWN palette is green).
- **Materials** (cosmetic only, never sim): precomputed sparse overlay strips `mat/p<k>/<strip>.png` clipped to body pixels; stars / glitter = 4 hashed twinkle phases, iridescent = 1 phase; Reduce Flashing → static phase 0 only.

## Natural World (`bb_natural_world`, tag `natural_world`)

- Classification: **Naturalistic Original**
- Source / inspiration: Human-toned Gar with brown hair; living-animal reference colouring (western lowland gorilla, Bengal tiger, red-tailed hawk); triceratops colours are SPECULATIVE (no preserved pigment — palette chosen as plausible muted earth tones, not a scientific claim).
- References: https://www.worldwildlife.org/species/western-lowland-gorilla, https://www.worldwildlife.org/species/bengal-tiger, https://www.allaboutbirds.org/guide/Red-tailed_Hawk/id, https://www.nhm.ac.uk/discover/dino-directory/triceratops.html
- Material: none · HUD accents `#c9894f` / `#f2d6b8` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#f6d2b4` / `#e0a982` / `#b9774f` / `#7c4a2e` |
| human | hair | `#7a5536` / `#4f3622` / `#2e1f13` |
| human | purple | keep source |
| human | gray | keep source |
| human | dark skin | `#4a2a1a` |
| human | dark hair | `#1c130c` |
| human | dark purple | keep source |
| human | dark gray | keep source |
| human | eye | hair ramp |
| gorilla | fur | `#6a6a70` / `#47474e` / `#2f2f35` / `#18181c` |
| tiger | body | `#f7e2c0` / `#f2a65a` / `#d9782b` / `#a5521d` |
| tiger | stripe | `#1c120c` |
| tiger | muzzle | `#fbf3e4` / `#e9dcc5` / `#c9b79b` |
| bird | plumage | `#c9a27a` / `#8a6440` / `#4e3622` |
| bird | shadow | `#2a1c12` |
| bird | beak | `#f0d080` / `#d8b050` / `#a88030` / `#6a5020` |
| tricera | body | `#b3ab83` / `#8c8460` / `#6b6448` / `#4a4532` |
| tricera | shadow | `#2c2a20` |
| tricera | under | `#9a8f6a` |
| tricera | horn | `#efe6cf` |

## Pink Flash (`bb_pink_flash`, tag `pink_flash`)

- Classification: **Canon-Inspired Crossover Palette** — colour scheme from Yuji Itadori (Jujutsu Kaisen)
- Source / inspiration: Yuji Itadori (Jujutsu Kaisen): pink hair, natural skin, dark navy uniform with red hood accents. Colour scheme only — not a claim that Yuji becomes these animals; no markings or powers added.
- References: https://jujutsu-kaisen.fandom.com/wiki/Yuji_Itadori
- Material: none · HUD accents `#f07fa0` / `#ffd0dc` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#f8d8bf` / `#e8b494` / `#c58866` / `#8a5a40` |
| human | hair | `#ffb3c8` / `#f07fa0` / `#b84a70` |
| human | purple | `#d0303c` / `#901c28` / `#561018` |
| human | gray | `#3a4466` / `#262e48` |
| human | dark skin | `#4e2e20` |
| human | dark hair | `#6a2440` |
| human | dark purple | `#300a10` |
| human | dark gray | `#141a2c` |
| human | eye | hair ramp |
| gorilla | fur | `#d9707f` / `#5a2a36` / `#2e1620` / `#140a10` |
| tiger | body | `#ffd0c0` / `#ff8f7a` / `#e0606a` / `#a03a50` |
| tiger | stripe | `#1a0a10` |
| tiger | muzzle | `#fff0ec` / `#f5d4d0` / `#d8a8a8` |
| bird | plumage | `#ff9aa8` / `#c04a68` / `#5a1c30` |
| bird | shadow | `#200a12` |
| bird | beak | `#ffe0a0` / `#f0b070` / `#c07040` / `#703020` |
| tricera | body | `#f0a0a8` / `#c06070` / `#8a3a50` / `#5a2034` |
| tricera | shadow | `#2a0e18` |
| tricera | under | `#a04a5c` |
| tricera | horn | `#fff0e8` |

## Cursed Rose (`bb_cursed_rose`, tag `cursed_rose`)

- Classification: **Original Cosmetic (JJK-Inspired Palette)**
- Source / inspiration: Original palette loosely inspired by Jujutsu Kaisen's pink/violet colour language: pink hair, rose irises where the 1-2 px eye permits, natural skin, dark violet outfit. No facial tattoos, no extra eyes — source pixel geometry only.
- References: https://jujutsu-kaisen.fandom.com/wiki/Jujutsu_Kaisen_Wiki
- Material: none · HUD accents `#d86a9a` / `#f6c6dc` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#f5d0b8` / `#e0a888` / `#bd7e60` / `#80543c` |
| human | hair | `#f6a6c6` / `#d86a9a` / `#9a3a66` |
| human | purple | `#5a2a8a` / `#3e1a64` / `#28103e` |
| human | gray | `#3a3046` / `#262030` |
| human | dark skin | `#4a2c1e` |
| human | dark hair | `#561a3a` |
| human | dark purple | `#180a26` |
| human | dark gray | `#140f1c` |
| human | eye | `#e0407a` |
| gorilla | fur | `#e8b4c8` / `#9a4a78` / `#5a2048` / `#2a0e24` |
| tiger | body | `#fbe0ea` / `#f0b0c8` / `#c86a96` / `#7a2a5a` |
| tiger | stripe | `#3a0a24` |
| tiger | muzzle | `#fff4f8` / `#f8dde8` / `#e0b0c8` |
| bird | plumage | `#f2bcd2` / `#a84a80` / `#4e1a42` |
| bird | shadow | `#24081c` |
| bird | beak | `#ffd0d8` / `#f08aa0` / `#c0405a` / `#6a1a30` |
| tricera | body | `#f0c4d6` / `#c27ea2` / `#8a4672` / `#561e48` |
| tricera | shadow | `#2a0c22` |
| tricera | under | `#a83a5a` |
| tricera | horn | `#fff2f6` |

## Infinity Frost (`bb_infinity_frost`, tag `infinity_frost`)

- Classification: **Canon-Inspired Crossover Palette** — colour scheme from Satoru Gojo (Jujutsu Kaisen)
- Source / inspiration: Satoru Gojo (Jujutsu Kaisen): white hair, icy-blue eyes, dark uniform. Colour scheme only — no blindfold, no costume shape change.
- References: https://jujutsu-kaisen.fandom.com/wiki/Satoru_Gojo
- Material: none · HUD accents `#5ad0ff` / `#e8f4ff` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#f8dcc8` / `#e8bc9e` / `#c89474` / `#8a6248` |
| human | hair | `#ffffff` / `#dfe6ee` / `#aab4c4` |
| human | purple | `#2a2e3e` / `#1c1f2c` / `#11131c` |
| human | gray | `#3c4252` / `#2a2e3a` |
| human | dark skin | `#4e3424` |
| human | dark hair | `#6a7486` |
| human | dark purple | `#0a0b10` |
| human | dark gray | `#0e1016` |
| human | eye | `#5ad0ff` |
| gorilla | fur | `#f2f6fa` / `#c4ceda` / `#8a98ac` / `#4a566a` |
| tiger | body | `#ffffff` / `#eef3f8` / `#c8d4e2` / `#8a9ab0` |
| tiger | stripe | `#2a3446` |
| tiger | muzzle | `#ffffff` / `#f4f8fc` / `#dce6f0` |
| bird | plumage | `#f4f8fc` / `#b8c6d8` / `#6e7e96` |
| bird | shadow | `#343e50` |
| bird | beak | `#fff4d8` / `#e8d0a0` / `#b8a070` / `#6a5a40` |
| tricera | body | `#eef3f8` / `#c0ccda` / `#8e9cb0` / `#5a6880` |
| tricera | shadow | `#2e3646` |
| tricera | under | `#9aaabd` |
| tricera | horn | `#ffffff` |

## Alien X (`bb_alien_x`, tag `alien_x`)

- Classification: **Canon-Inspired Crossover Palette** — colour scheme from Alien X (Ben 10)
- Source / inspiration: Alien X (Ben 10): cosmic charcoal body with pale existing detail and green accents, sparse slow star material. Silhouettes and faces kept readable (eye whites unchanged).
- References: https://ben10.fandom.com/wiki/Alien_X
- Material: stars · HUD accents `#4ac862` / `#e8ecf4` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#6a6e7a` / `#3e424c` / `#262930` / `#16181c` |
| human | hair | `#3a3e48` / `#22252c` / `#121418` |
| human | purple | `#6af07a` / `#2fb04a` / `#147a2c` |
| human | gray | `#2a2d34` / `#1a1c22` |
| human | dark skin | `#0a0b0e` |
| human | dark hair | `#08090b` |
| human | dark purple | `#0a3a16` |
| human | dark gray | `#0c0d10` |
| human | eye | hair ramp |
| gorilla | fur | `#4a4e5a` / `#2a2d34` / `#181a1f` / `#0b0c0f` |
| tiger | body | `#e8ecf4` / `#4a4e5a` / `#2a2d34` / `#16181c` |
| tiger | stripe | `#050607` |
| tiger | muzzle | `#9af0a6` / `#4ac862` / `#228a3a` |
| bird | plumage | `#5a5e6a` / `#2c2f36` / `#14161a` |
| bird | shadow | `#08090b` |
| bird | beak | `#a0f8ae` / `#5ad870` / `#2a9a40` / `#145a22` |
| tricera | body | `#555a66` / `#30333b` / `#1c1e24` / `#0e0f12` |
| tricera | shadow | `#060708` |
| tricera | under | `#3ac85a` |
| tricera | horn | `#e8ecf4` |

## Upgrade (`bb_upgrade`, tag `upgrade`)

- Classification: **Canon-Inspired Crossover Palette** — colour scheme from Upgrade (Ben 10)
- Source / inspiration: Upgrade (Ben 10): dark bodies with bright green on EXISTING accent / trim / highlight pixels. No new circuitry lines, mechanical parts or extra eyes.
- References: https://ben10.fandom.com/wiki/Upgrade
- Material: none · HUD accents `#38d060` / `#b8ffcc` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#3a3f48` / `#262a30` / `#181b20` / `#0e1013` |
| human | hair | `#66ff88` / `#2fd05a` / `#14903a` |
| human | purple | `#7dff9a` / `#38d060` / `#178a38` |
| human | gray | `#22252b` / `#15171b` |
| human | dark skin | `#08090b` |
| human | dark hair | `#0a4a1e` |
| human | dark purple | `#0a3a16` |
| human | dark gray | `#090a0c` |
| human | eye | `#7dff9a` |
| gorilla | fur | `#4af07a` / `#24272d` / `#16181c` / `#0a0b0d` |
| tiger | body | `#7dff9a` / `#2fd05a` / `#22252b` / `#15171b` |
| tiger | stripe | `#050607` |
| tiger | muzzle | `#3a3f48` / `#2a2e34` / `#1c1f24` |
| bird | plumage | `#5ae882` / `#22262c` / `#121417` |
| bird | shadow | `#070809` |
| bird | beak | `#7dff9a` / `#38d060` / `#178a38` / `#0a4a1e` |
| tricera | body | `#66ff88` / `#262a30` / `#181b20` / `#0e1013` |
| tricera | shadow | `#070809` |
| tricera | under | `#2fd05a` |
| tricera | horn | `#b8ffcc` |

## Rath Pack (`bb_rath_pack`, tag `rath_pack`)

- Classification: **Canon-Inspired Crossover Palette** — colour scheme from Rath (Ben 10)
- Source / inspiration: Rath (Ben 10): warm orange with black and cream; the tiger gets strong natural orange/black contrast. No Rath anatomy, claws or costume silhouette added.
- References: https://ben10.fandom.com/wiki/Rath
- Material: none · HUD accents `#ff9a2a` / `#fff2e0` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#ffcc8a` / `#f59a3c` / `#c46a1c` / `#7a3e10` |
| human | hair | `#fff2e0` / `#e8d6c0` / `#b8a088` |
| human | purple | `#3a2a24` / `#24180f` / `#140c08` |
| human | gray | `#e8e2da` / `#a89e94` |
| human | dark skin | `#3e1e08` |
| human | dark hair | `#5a4a3a` |
| human | dark purple | `#0a0604` |
| human | dark gray | `#3a3029` |
| human | eye | `#3fd06a` |
| gorilla | fur | `#ffb060` / `#d06a1c` / `#7a3a10` / `#2a1408` |
| tiger | body | `#ffe8c8` / `#ff9a2a` / `#e06a10` / `#8a3a06` |
| tiger | stripe | `#0a0603` |
| tiger | muzzle | `#ffffff` / `#f2ece4` / `#d8ccbc` |
| bird | plumage | `#ffb45a` / `#c0601a` / `#5a2a0a` |
| bird | shadow | `#1e0c04` |
| bird | beak | `#fff0d8` / `#e8d8c0` / `#b8a088` / `#5a4a3a` |
| tricera | body | `#ffb060` / `#d07020` / `#8a4410` / `#4a220a` |
| tricera | shadow | `#1e0c04` |
| tricera | under | `#f2e6d8` |
| tricera | horn | `#fff6ea` |

## Arctic Reserve (`bb_arctic_reserve`, tag `arctic_reserve`)

- Classification: **Naturalistic Original**
- Source / inspiration: Original cold-climate palette: human-toned face, silver-blue hair, cool outfit. Animals reference living colouring: white (leucistic) Bengal tiger, silverback gorilla (black fur, silver highlights), pale snowy-owl-like plumage, gray-blue triceratops (speculative).
- References: https://www.worldwildlife.org/species/bengal-tiger, https://www.worldwildlife.org/species/mountain-gorilla, https://www.allaboutbirds.org/guide/Snowy_Owl/id
- Material: none · HUD accents `#6a9ac8` / `#e4eef8` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#f4d6c2` / `#e2b49a` / `#bf8c70` / `#845c46` |
| human | hair | `#e4eef8` / `#a8bcd4` / `#6a82a2` |
| human | purple | `#4a8ab8` / `#2e5e86` / `#1a3a58` |
| human | gray | `#c8d4e0` / `#8a9aac` |
| human | dark skin | `#4a3226` |
| human | dark hair | `#34445a` |
| human | dark purple | `#0e2236` |
| human | dark gray | `#2a3442` |
| human | eye | hair ramp |
| gorilla | fur | `#c8ccd2` / `#3a3c42` / `#26272c` / `#141518` |
| tiger | body | `#ffffff` / `#f4f2ee` / `#d8d4cc` / `#a8a29a` |
| tiger | stripe | `#1e1a18` |
| tiger | muzzle | `#ffffff` / `#f8f6f2` / `#e4e0d8` |
| bird | plumage | `#ffffff` / `#d8dce2` / `#9aa2ae` |
| bird | shadow | `#4a505a` |
| bird | beak | `#4a4a4e` / `#38383c` / `#2a2a2e` / `#1a1a1e` |
| tricera | body | `#b8c6d4` / `#8a9cb0` / `#647890` / `#425468` |
| tricera | shadow | `#222c38` |
| tricera | under | `#9aaabd` |
| tricera | horn | `#f2f0e8` |

## Galaxy Glitter (`bb_galaxy_glitter`, tag `galaxy_glitter`)

- Classification: **Original Cosmetic**
- Source / inspiration: Original: deep indigo / violet / magenta with restrained silver-pink sparkle. Each animal has its own material family (indigo gorilla, violet tiger with magenta muzzle, magenta bird with silver beak, indigo-blue triceratops) — not one green→purple hue rotation.
- References: none (original design)
- Material: glitter · HUD accents `#c47aff` / `#ffd8f4` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#b0a8f0` / `#7a6ad8` / `#4e3aa8` / `#2c1e6a` |
| human | hair | `#ff8ae0` / `#d040b0` / `#7a1a70` |
| human | purple | `#2a1e6a` / `#1c1248` / `#100a2c` |
| human | gray | `#c8c8e0` / `#8a88b0` |
| human | dark skin | `#160e3a` |
| human | dark hair | `#3a0a38` |
| human | dark purple | `#080418` |
| human | dark gray | `#24204a` |
| human | eye | `#ff9ae8` |
| gorilla | fur | `#7a6ad8` / `#3a2a8a` / `#22185a` / `#100a30` |
| tiger | body | `#f0c8ff` / `#c47aff` / `#8a3ad8` / `#4e1a8a` |
| tiger | stripe | `#14062a` |
| tiger | muzzle | `#ffd8f4` / `#f4a8e0` / `#d070c0` |
| bird | plumage | `#ff9ae0` / `#c03aa0` / `#5a1050` |
| bird | shadow | `#200620` |
| bird | beak | `#e8e8f8` / `#c0c0dc` / `#8a8ab0` / `#4a4a6a` |
| tricera | body | `#8a9af0` / `#5a62c8` / `#363c8e` / `#1c1f54` |
| tricera | shadow | `#0c0e2a` |
| tricera | under | `#c03aa0` |
| tricera | horn | `#f0f0ff` |

## Opal Safari (`bb_opal_safari`, tag `opal_safari`)

- Classification: **Original Cosmetic**
- Source / inspiration: Original: pale opal / cream with mint, lilac and gold accents and a subtle iridescent sheen; dark structure kept for readable faces, paws, wings and horns.
- References: none (original design)
- Material: iridescent · HUD accents `#8adcc0` / `#f0d890` · build audit: source-green left = 0

| Form | Region | Colours (light → dark) |
|---|---|---|
| human | skin | `#fff6ea` / `#f0e2d0` / `#d4c0aa` / `#9a8670` |
| human | hair | `#e8f8f0` / `#b8e8d4` / `#7ab8a0` |
| human | purple | `#d0b8f0` / `#a088d0` / `#6a5498` |
| human | gray | `#f0d890` / `#c8a850` |
| human | dark skin | `#5a4c3e` |
| human | dark hair | `#3e6a5a` |
| human | dark purple | `#3e3060` |
| human | dark gray | `#6a5426` |
| human | eye | `#3aa888` |
| gorilla | fur | `#fffaf2` / `#e8dccc` / `#bcae9c` / `#5e5446` |
| tiger | body | `#fffaf0` / `#f6ead8` / `#e0c8a8` / `#b0946e` |
| tiger | stripe | `#4a3a2a` |
| tiger | muzzle | `#f0fff8` / `#d8f4e8` / `#b8e0d0` |
| bird | plumage | `#f4ecff` / `#c8b4e8` / `#8a72b0` |
| bird | shadow | `#3e3456` |
| bird | beak | `#ffe8a0` / `#f0cc60` / `#c8a030` / `#7a6018` |
| tricera | body | `#fff4ea` / `#eadccc` / `#c4b29e` / `#8a7a68` |
| tricera | shadow | `#463c32` |
| tricera | under | `#c8b4e8` |
| tricera | horn | `#fff0c0` |
