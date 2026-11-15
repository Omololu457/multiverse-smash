# Batman (rebuilt) — Skins

Default + **10 arsenal-wide skins**. Each one recolours Batman's body, every fleet machine, the portrait and the
explosion strip. Each also supplies its own HUD, effect and smoke colours (`BATMAN_FX_COLORS`). Skins are cosmetic
only: gameplay traces are identical to Default, which is verified frame by frame.

| # | id | name | classification | look |
|---|---|---|---|---|
| 0 | `default` | Default | Default | supplied SNES palette; fleet as supplied |
| 1 | `bm_blue_crusader` | Blue Crusader | Original custom palette | classic grey suit, royal-blue cape and cowl, yellow belt; grey / blue fleet |
| 2 | `bm_gotham_beyond` | Gotham Beyond | Inspired colour scheme (Batman Beyond) | matte black suit and fleet, red accents |
| 3 | `bm_white_knight` | White Knight | Original custom palette | pearl-white suit, pale steel cape, gold trim; white-gold fleet |
| 4 | `bm_arkham_bronze` | Arkham Bronze | Original custom palette | bronze armour tones, dark umber cape, amber lights |
| 5 | `bm_red_rain` | Red Rain | Original custom palette | deep crimson suit, black-red cape, bone-white accents |
| 6 | `bm_alienx_cosmic_knight` | Alien X Cosmic Knight | Inspired colour scheme (Ben 10 — Alien X) | void-black suit and fleet, starlight-white / pale-cyan accents (palette only; no starfield overlay) |
| 7 | `bm_upgrade_wayne_systems` | Upgrade Wayne Systems | Inspired colour scheme (Ben 10 — Upgrade) | black techno suit and fleet, circuit-green accents |
| 8 | `bm_cursed_midnight` | Cursed Midnight | Inspired colour scheme (JJK cursed energy) | midnight-violet suit, black-violet cape, electric-blue accents |
| 9 | `bm_glacier_stealth` | Glacier Stealth | Original custom palette | ice-blue suit, slate cape, frost-white accents; arctic fleet |
| 10 | `bm_gilded_eclipse` | Gilded Eclipse | Original custom palette | eclipse-black suit and cape, polished gold trim |

## How they are built

`tools/batman/build_skins.py` (deterministic) classifies every unique source colour into a region and remaps it
with a lightness shift that preserves shading:
- **Body regions:** cape, suit, accent, accent_dark, metal, keep.
- **Fleet regions:** hull, hull2, flame, glow.
- **Explosion:** flame.

Region tables are in `skin_regions.json`. The darker suits (Gotham Beyond, Alien X, Upgrade, Gilded) are lifted so
the outline stays readable on dark stages.

Output goes to `assets/batman/skins/<tag>/{body,fleet,portrait,explosion}.png`, which is 40 sheets. The contact
sheet is `skins_contact.png`.

## Constraints and verification (`harness/batman_skins.test.mjs`, 57/0)

- **Ids:** prefix `bm_`. None contains "cyborg" (this avoids the Superman eye-regex collision) and none ends in
  "AlienX" (so the generic starfield overlay never triggers).
- **Geometry:** every skin sheet has exactly the default's size and alpha mask, so geometry is unchanged. Colours
  do change.
- **Through the real game:**
  - Each skin applies (recolour tag + body sheet from the skin).
  - Its gameplay trace is identical to Default over 670 frames of gadget + Carrier + KNIGHTFALL.
  - The fleet, explosion and portrait load from the skin's own folder.
  - There are no page errors and no Batman 404s other than the documented legacy preload.
- **Mirror match:** with two different skins (Red Rain vs Glacier Stealth), each side keeps its own palette.
- **Skin select:** the real launch path offers Default + 10 skins (`visual_04_skin_select.png`), and the visual run
  plays the whole match in White Knight.
