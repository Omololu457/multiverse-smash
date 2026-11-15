# Hiromi Higuruma: skins

Default plus 10 cosmetic skins. They are **colour only**: geometry, pivots, frame data, hitboxes, audio, damage and
resources are identical to Default. This is measured: each skin runs a 500-frame input trace identical to Default
(`harness/higuruma_skins.test.mjs`).

Sheets are **precomputed** by `tools/higuruma/build_skins.py` from `tools/higuruma/skins.json` into
`assets/higuruma/skins/<tag>/`. There is no runtime recolouring, no per-frame pixel scanning and no Math.random.
Review sheet: `docs/higuruma/skins_contact.png`. Per-region audit: `docs/skins/higuruma/region_mapping.json` +
`regions.png`.

## Regions
Each pixel of every cell is classified as hair, suit (three tones), shirt, tie, shoes, gavel wood, gavel metal (yellow
within 3 px of the wood, or 7 px on giant frames), Executioner's Sword (the ultSword strip), or effect (swing arcs,
sparkles, evidence glow). **Natural skin tones, eye whites and the black outline are never recoloured.** In every
skin they stay byte-identical to Default across every strip (measured). The portrait is remapped by region with a
luminance ramp.

**Known limit:** the sheet's swing arcs touch the gavel caps without an outline. Metal and effect pixels are therefore
split by distance to the wood, and a few edge pixels of an arc can take the metal colour instead of the effect colour.

## Skins

| # | id | name | class | crossover | suit | tie | gavel metal / fx | material |
|---|---|---|---|---|---|---|---|---|
| 0 | `default` | Default | Default | — | supplied art | supplied art | supplied art | — |
| 1 | `hg_midnight_counsel` | Midnight Counsel | Original Custom Palette | — | #26315a | #7a2034 | #f0c860 / #ffe08a | — |
| 2 | `hg_white_collar_verdict` | White-Collar Verdict | Original Custom Palette | — | #c9c3b5 | #121212 | #e8c050 / #f0d890 | — |
| 3 | `hg_crimson_prosecutor` | Crimson Prosecutor | Original Custom Palette | — | #5e1828 | #9c7a30 | #d0a848 / #ffb040 | — |
| 4 | `hg_gotham_counsel` | Gotham Counsel | Crossover-Inspired Palette (custom) | Batman (DC) | #36383d | #2c2e32 | #b89c4c / #c8b070 | — |
| 5 | `hg_devils_advocate` | Devil's Advocate | Crossover-Inspired Palette (custom) | Daredevil (Marvel) | #4e0e12 | #3e0a0c | #c8844a / #f08050 | — |
| 6 | `hg_limitless_litigation` | Limitless Litigation | Crossover-Inspired Palette (custom) | Satoru Gojo (Jujutsu Kaisen) | #161c2c | #2c3654 | #60e0ff / #80e8ff | — |
| 7 | `hg_cursed_rose` | Cursed Rose | Original Custom Palette | — | #333339 | #7a2034 | #e890c0 / #e090e0 | — |
| 8 | `hg_alien_x_cosmic_court` | Alien X — Cosmic Court | Crossover-Inspired Palette (custom) | Alien X (Ben 10) | #14141a | #3c3c4c | #c0c4d0 / #d8c8ff | stars on suit |
| 9 | `hg_upgrade_digital_justice` | Upgrade — Digital Justice | Crossover-Inspired Palette (custom) | Upgrade (Ben 10) | #1a1a1a | #30d860 | #60f080 / #80ff9c | circuit on suit |
| 10 | `hg_gilded_final_appeal` | Gilded Final Appeal | Reward-Style Palette (custom) | — | #1e1a14 | #d8b050 | #f0c850 / #f8e8b8 | glitter on suit |

## Notes per skin

- **Midnight Counsel** — Original design: deep navy suit, ivory shirt, burgundy tie, dark-brown gavel with warm gold fittings.
- **White-Collar Verdict** — Original design: pearl suit, charcoal shirt, black tie, black-and-gold gavel. Black outlines keep the pearl suit readable on light stages.
- **Crimson Prosecutor** — Original design: wine-red suit, black shirt, restrained gold accents, amber sword effects.
- **Gotham Counsel** — Batman-inspired colour scheme only: charcoal and graphite suit, muted gold details. No cowl, cape or bat emblem is added.
- **Devil's Advocate** — Daredevil-inspired colour scheme only: dark crimson and black, oxblood gavel, restrained red-gold effects. No mask or horns are added.
- **Limitless Litigation** — Gojo-inspired colour scheme only: white hair, navy-black suit, pale shirt, electric-cyan weapon highlights. No blindfold or sunglasses are added.
- **Cursed Rose** — Original design: pink hair, charcoal suit, burgundy tie, rose-violet effects. Natural skin tones are kept separate and unchanged.
- **Alien X — Cosmic Court** — Alien X-inspired colour scheme only: obsidian suit, silver trim, sparse stars confined to the suit fabric, violet-white sword effects. Face, hair and hands are unchanged and readable.
- **Upgrade — Digital Justice** — Upgrade-inspired colour scheme only: black suit, green tie and shirt accents, a restrained green circuit-line cosmetic overlay on the suit, luminous green weapon effects.
- **Gilded Final Appeal** — Reward-style original design: black suit with an ivory shirt, gold fittings and tie, subtle fabric glitter, pearl-gold sword effects.

## Crossover policy
Crossover-inspired skins borrow a colour scheme only. No cowl, cape, emblem, mask, horns, blindfold, armour or other
character's art is added. Each such skin is labelled "Crossover-Inspired Palette (custom)" with a source caveat in
`higurumaSkins.js`. None is presented as official.

## Materials
Cosmic Court (stars), Digital Justice (circuit lines) and Gilded Final Appeal (glitter) draw a precomputed overlay on
**suit pixels only** (`assets/higuruma/skins/<tag>/mat/p0..p3/<strip>.png`). The overlay is a slow crossfade between
four phases driven by the sim tick. Under Reduce Flashing / Reduce Motion it is the static phase 0 (measured).

## Ids
All ids start with `hg_`. No id ends in "AlienX", because the shared game.js starfield would fill the whole cell rect.
No id contains "cyborg", because the shared Cyborg-Superman eye overlay matches it.

## Mirrors
Different skins keep their own palettes in a mirror match, because the mirror-wash rule skips them. The same skin on
both sides gives P2 the engine's standard mirror wash (measured).
