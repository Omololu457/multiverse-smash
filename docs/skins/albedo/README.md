# Skin guide — ALBEDO (Albedo's own section; Ben 10's skins are documented separately and are not affected)

Branch `feat/albedo-skin-themes`. Cosmetic only: no stat, frame, hitbox, form-list, cost, cooldown or duration changes
(`harness/albedo_themes.test.mjs` B; frame-data diff vs origin/main = zero for every character).

## What you pick
Albedo's skin list (select screen order):
- **Default** (older, the original `__albedo` palette).
- **Classic** (kid, the original `__albedo` palette).
- *Prime (experimental, only when experimental aliens are on)*.
- **Kid — <theme>** × 20.
- **Older — <theme>** × 20.

Appearance and theme are encoded in one skin id, because the engine has one skin per player. There is no second picker,
so 40 cards cover both appearances. Each id maps to its appearance's gameplay variant:
- Kid → `ben10Classic` numbers (HP 900).
- Older → `default` / Alien Force numbers (HP 950).

Picking a theme on the human recolors **every one of Albedo's 24 alien forms automatically**, including their alternate
frame sets: Blue Flame, Drained, Prismatic, Overclock, size tiers, water. There is no per-alien submenu. The theme
persists through transform / revert / ultimate / KO / rematch / restart (it is the saved skin id).

| # | theme | primary / secondary / accent / energy / hair | source |
|---|---|---|---|
| 1 | Scarlet Inversion | silver-white / charcoal / crimson / red, white-hot core / vivid red | Original Albedo palette; Scarlet Inversion |
| 2 | Ashen Prototype | light gray / black / muted burgundy / restrained red / dark ash gray | Original Albedo palette; Ashen Prototype |
| 3 | Alien X — Red Singularity | near-black / charcoal / silver / red + sparse white stars / silver-white | Fan cosmetic inspired by Alien X (Ben 10); not a canonical Albedo costume, no gameplay change |
| 4 | Upgrade — Redline Virus | black / graphite / vivid red / crimson-electric / black with red highlights | Fan cosmetic inspired by Upgrade (Ben 10); … |
| 5 | Chromastone — Blood Prism | amethyst / deep purple / garnet / magenta / pale silver | Fan cosmetic inspired by Chromastone (Ben 10); … |
| 6 | Diamondhead — Ruby Facet | pale rose / charcoal / dark ruby / white-pink core / scarlet | Fan cosmetic inspired by Diamondhead (Ben 10); … |
| 7 | Big Chill — Crimson Winter | frost blue / navy / crimson / icy blue / icy silver | Fan cosmetic inspired by Big Chill (Ben 10); … |
| 8 | Ghostfreak — Haunted Signal | bone gray / charcoal / muted violet / lavender / pale gray | Fan cosmetic inspired by Ghostfreak (Ben 10); … |
| 9 | Ultimate Echo Echo — Red Resonance | cobalt / slate / silver / red / steel gray | Fan cosmetic inspired by Ultimate Echo Echo (Ben 10); … |
| 10 | Heatblast — White Furnace | coal black / ember orange / dark red / white-hot / white | Fan cosmetic inspired by Heatblast (Ben 10); … |
| 11 | Superman — Red Sun | deep blue / gray / crimson / gold-red / silver gray | Fan cosmetic inspired by Superman (DC); … |
| 12 | Batman Beyond — Scarlet Protocol | jet black / graphite / crimson / red / gray | Fan cosmetic inspired by Batman Beyond (DC); … |
| 13 | Reverse-Flash — Negative Velocity | yellow / burgundy / black / red / deep red | Fan cosmetic inspired by Reverse-Flash (DC); … |
| 14 | JJK — Cursed Rose | charcoal / dark pink / crimson / rose-crimson / pink | Fan cosmetic inspired by Jujutsu Kaisen; … |
| 15 | JJK — Violet Reversal | indigo / gray / pale blue / violet-white / white | Fan cosmetic inspired by Jujutsu Kaisen; … |
| 16 | Frieza — Imperial Pearl | white / pale gray / dark purple / polished white / pearl silver | Fan cosmetic inspired by Frieza (Dragon Ball); … |
| 17 | Winning Valkyrie — Crimson Victory | cobalt / white / gold / crimson-gold / silver-white | Fan cosmetic inspired by Winning Valkyrie (Beyblade Burst) colours; colour arrangement only, no model / attack / spin |
| 18 | Anodite — Magenta Aftershock | magenta / charcoal / deep purple / silver-violet / copper red | Fan cosmetic inspired by Anodite (Ben 10); … |
| 19 | Black Gold — False Emperor | matte black / charcoal / brushed gold (metal ramp) / wine red / gunmetal | Fan cosmetic inspired by a black-and-gold emperor look; … |
| 20 | Ruby Opal — Glitter Overload | pearl / lavender / rose + cyan sheen / ruby / coral red | Fan cosmetic inspired by opal gemstones; … |

None of these are canonical Albedo outfits. Only #1–2 are original Albedo palettes. Inspired themes never add their
namesake form (e.g. Alien X) to Albedo's list and never grant powers. Exact swatches: `albedoThemes.js`.

**Ids:** `albedoKid<Theme>` / `albedoOlder<Theme>`. Exceptions: `albedoAlienX` = Older — Red Singularity and
`albedoValkyrie` = Older — Crimson Victory. Both reuse pre-existing ids whose art had never been generated.

## Regional maps
- **Human, no full-image tint.**
  - Older ([older_REGIONS.md](../../albedo/skins/older_REGIONS.md)): jacket → primary · jeans → secondary · undershirt →
    darker secondary · hair → hair · eyes → energy. Skin, white trim, soles and outline are kept.
  - Kid ([kid_REGIONS.md](../../albedo/skins/kid_REGIONS.md)): shirt panels → primary · centre stripe → accent · pants →
    secondary · watch casing → accent · watch light + eyes → energy · hair → hair.
- **Forms:** one map per form, `docs/albedo/skins/<form>_REGIONS.md` (24 forms). They cover:
  - crystal facets kept (Diamondhead);
  - flame vs core vs rock (Heatblast);
  - metal / plate / joint / light (Upgrade);
  - fur shades (Rath, Benwolf, Wildmutt);
  - dark / cosmic bodies with a graded inner rim, never a flat silhouette (Alien X, Ghostfreak, XLR8, Feedback, Upgrade).
- **Portraits:** [portrait_older](../../albedo/skins/portrait_older_REGIONS.md) and
  [portrait_kid](../../albedo/skins/portrait_kid_REGIONS.md).

## Effects
- Body strips only. FX sheets (`*_fx_*` beams / bursts / puffs) keep their colours, the same rule as the original
  `__albedo` pass, so a projectile looks the same whoever fires it. No shared mutable FX state means no cross-owner leak.
- Finishes:
  - **Red Singularity:** sparse stars on interior body pixels.
  - **Ruby Opal:** lavender shadows, cyan-leaning highlights, a few white glints on highlight pixels.
  - **Black Gold:** a hard metallic ramp on the gold accent only.
- Every finish is a sprite-local integer hash, with no `Math.random`, no time input and no gameplay state. Reduced effects
  (`reduceMotion` / `reduceFlashing`) drops the stars / glints and keeps the palette.

## Cache
- **Generation:** runtime, from Albedo's own `__albedo` sheets (`albedoThemeCache.js`). Nothing is written to disk.
- **Key:** `albedo|<theme>|<form>|<sheet>|v<engine>.<asset version>|fx<0/1>`. A new build (asset version) or engine bump
  invalidates stale entries.
- **Memory:** bounded LRU of 256 canvases.
- **Timing:** generation is queued under 4 ms per frame. The appearance and the PICK FIVE loadout are warmed at match start;
  any other form is warmed on its first frame and shows the default `__albedo` art for the first frames until ready.
- **Isolation:** Ben never enters this cache (the hook returns null for any fighter that isn't Albedo wearing a theme).

## Controls (existing, unchanged)
- **Skin select:** D-pad / left stick to move between cards, **Cross** to confirm, **Circle** to go back, **Options** =
  start / pause. Mouse: click a card. No new inputs, no paddles.
- **In match (Albedo):** the same as Ben. Ultimatrix dial = ↓↓ then J/K/L/O/P (pad: as mapped in the in-game controls
  help).

## Genuine missing art (recorded, not invented)
- **Older:** the jacket trim is pure white, shared with the eye whites / soles. It stays white, so the accent role has no
  older region; a separate trim colour needs new art.
- **Kid:** shoes share black / white with the outline / shirt, so they are kept.
- **Highbreed:** no Ultimatrix mark exists in the art, so there is no energy region.
- **Prime:** keeps its pending-art status; themes cover kid and older only.
