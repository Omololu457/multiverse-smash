# Ben 10 — cosmetic THEMES

One pick on human Ben: **appearance** (Classic or Jacket) × **theme** (one of 20) = 40 skins, ids `<classic|jacket>-<theme>`. The theme recolours that human sprite set and, automatically, every READY alien he transforms into, through each sprite set's own regional map. There is no per-alien choice and no extra input. The original Classic and Alien Force (jacket) skins stay available, unnumbered.

**Cosmetic only.** No damage, speed, hitbox, cost, cooldown or timing changes. A themed skin wears its original appearance's variant: Classic stats / normals / voice, or Alien Force. A theme named after an alien grants nothing and unlocks nothing; the Alien X theme does not touch the Alien X form.

**Albedo is unaffected.** The themes exist only in `SKINS.ben10`. The recolour is gated on `rosterKey === "ben10"`, and Albedo's skins / `__albedo` art never pass through it. There is no Albedo / Red Omnitrix theme.

## How it works

- `benThemes.js`: the one registry. Each theme has 5 roles (PRIMARY / SECONDARY / ACCENT / ENERGY / HIGHLIGHT) as [dark, mid, light] swatches, a source label and a note. A theme without HIGHLIGHT keeps natural hair.
- `benThemeRegions.js`: one ordered rule list per sprite set (2 humans + every READY alien). Each rule claims colours by HSV window, gives them a role, and records the region's reference tone. A pixel's brightness relative to that tone picks its point on the role's ramp, so shading, facets and fur survive. It is never a flat fill.
- `benThemeRecolor.js`: when the renderer is about to draw a sheet for a themed Ben, the sheet is recoloured once into a same-size canvas: per-colour lookup, alpha copied untouched. Frame timing, crop rects, anchors and hitboxes cannot change; they never read pixels.
- **Cache:** the key is owner | asset version (`window.__ASSET_V`, the existing cache-bust stamp) | appearance | form | theme | sheet path. It is an LRU bounded at 24 M pixels (≈ 96 MB). A stale entry, from a changed size or a new asset version, never matches. Nothing is generated at startup; a sheet is recoloured the first time it is drawn (a few ms).
- **Sparkle** (Alien X stars, Opal glitter): a fixed integer hash of each pixel's sheet coordinate, baked once into the cached canvas. It is not animated and uses no randomness. With *reduce flashing* on, it thins to a quarter.
- **Persistence:** the theme rides on the skin id, so it is saved, restored, sent over LAN and recorded in replays exactly like any skin. `applySkin` stamps `_benTheme` / `_benAppearance`. Transform, revert and swap only change the frame set, so the same theme follows every form. A new round re-applies the skin; a rematch keeps the fighter's fields.
- **Careful-recolour rules:** a clothing panel drawn with black linework swaps PRIMARY ↔ SECONDARY when the theme's primary is near-black (`swapDark`: Classic's striped shirt, the jacket over a black undershirt). Pale regions (Rath's chest, bellies, undersides) take the theme's lightest listed role (`light`). Highlights are a modest lift, never chalk-white. Organic hides use a steeper ramp (`gain`) so stripes stay visible.
- **Player tint / hit flash:** unchanged. A mirror match's P2 wash and team tints still draw over the themed sheet.
- **Not themed:** FX sheets drawn outside the fighter sprite (projectiles, beams, the transformation flash) keep their own colours. Legacy experimental twins have no map and draw as before.

## The 20 themes

| # | id | name | source | note | P | S | A | E | H |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `d23blue` | Dimension 23 — Blue Hour | canonical-palette-adaptation | Ben 23 (Dimension 23) Hero Watch colour reference only: blue / black / gold. Not Ben 23's full costume. | `#1f4fd1` | `#15161c` | `#e2b33c` | `#3fa9ff` | natural |
| 2 | `eventhorizon` | Alien X — Event Horizon | canonical-palette-adaptation | Alien X's starfield palette on Ben. Cosmetic only: grants no Alien X power. Sparkle: stars. | `#16161e` | `#34353e` | `#c9ccd6` | `#d8fff0` | natural |
| 3 | `livingcircuit` | Upgrade — Living Circuit | canonical-palette-adaptation | Upgrade's black + circuit-green palette. Cosmetic only. | `#3a3d42` | `#121314` | `#39ff6a` | `#b5f23a` | natural |
| 4 | `prismbreak` | Chromastone — Prism Break | canonical-palette-adaptation | Chromastone's violet crystal palette. Cosmetic only. | `#9a5ad8` | `#3b1868` | `#e83ccf` | `#3fe6f0` | `#f2e6ff` |
| 5 | `solarfurnace` | Heatblast — Solar Furnace | canonical-palette-adaptation | Heatblast's ember + charcoal palette. Cosmetic only. | `#f0661c` | `#2c2a2a` | `#f2be2a` | `#ff8a1e` | natural |
| 6 | `midnightglacier` | Big Chill — Midnight Glacier | canonical-palette-adaptation | Big Chill's blue palette. Cosmetic only. | `#4682b4` | `#19234a` | `#a8d8ff` | `#c8fbff` | natural |
| 7 | `phantomfrequency` | Ghostfreak — Phantom Frequency | canonical-palette-adaptation | Ghostfreak's ash / bone palette with a violet accent. Cosmetic only. | `#8e8e94` | `#d8d2c4` | `#7a3cd0` | `#c8a8f0` | natural |
| 8 | `livewire` | Feedback — Live Wire | canonical-palette-adaptation | Feedback's black / cream / amber palette. Cosmetic only. | `#17171a` | `#f2e8cc` | `#ffb020` | `#ffd84a` | natural |
| 9 | `emeraldcut` | Diamondhead — Emerald Cut | original | Original emerald-crystal palette themed on Diamondhead (canon Diamondhead is teal-green; this is a jade variation). Cosmetic only. | `#2ea36e` | `#e2f5e6` | `#135c34` | `#c8fff0` | `#eafff6` |
| 10 | `tomorrowshero` | Superman — Tomorrow's Hero | crossover-inspired | Original Ben palette inspired by Superman (DC); not a canonical Ben costume. | `#2348c8` | `#c8202e` | `#f4c430` | `#fff2b0` | natural |
| 11 | `neogotham` | Batman Beyond — Neo Gotham | crossover-inspired | Original Ben palette inspired by Batman Beyond (DC); not a canonical Ben costume. | `#34363c` | `#121214` | `#c81a2a` | `#ff2a2a` | `#9a9ca2` |
| 12 | `neonleap` | Spider-Verse — Neon Leap | crossover-inspired | Original Ben palette inspired by Spider-Man: Into the Spider-Verse (Spider-Gwen colours); not a canonical Ben costume. | `#f4f4f8` | `#141418` | `#ff4fa8` | `#3fe8ff` | natural |
| 13 | `cursedrose` | JJK — Cursed Rose | crossover-inspired | Original Ben palette inspired by Yuji Itadori (JJK); not a canonical Ben costume. Pink hair; natural skin kept. | `#18161a` | `#6a1a2c` | `#f07aa0` | `#e0304e` | `#f59ab5` |
| 14 | `limitlessblue` | JJK — Limitless Blue | crossover-inspired | Original Ben palette inspired by Satoru Gojo (JJK); not a canonical Ben costume. White hair; natural skin kept. | `#1c2a5c` | `#15142a` | `#9ad8ff` | `#e0f0ff` | `#f2f4f8` |
| 15 | `ninetailssunrise` | Naruto — Nine-Tails Sunrise | crossover-inspired | Original Ben palette inspired by Naruto Uzumaki (Naruto); not a canonical Ben costume. No tails or markings added. | `#f57c1f` | `#18181c` | `#f2c230` | `#ffb070` | natural |
| 16 | `dawnbreaker` | Luffy — Dawn Breaker | crossover-inspired | Original Ben palette inspired by Luffy's Gear 5 (One Piece); not a canonical Ben costume. White hair. | `#f4ecd8` | `#c9c4d6` | `#b89ee0` | `#f0b8a0` | `#fafafa` |
| 17 | `victoryrush` | Winning Valkyrie — Victory Rush | crossover-inspired | Original Ben palette in Winning Valkyrie colours (cobalt / red / white / gold); recognisable by colour only, no new geometry. | `#2347c4` | `#d0202c` | `#f4f4f4` | `#f6c43a` | natural |
| 18 | `violetafterglow` | Anodite — Violet Afterglow | canonical-palette-adaptation | Anodite (Gwen / Verdona) palette: copper hair, magenta-violet. Cosmetic only. Placement adapted: copper goes to HIGHLIGHT (hair) and ACCENT, not the main body. | `#a83cb8` | `#3a1650` | `#c8693a` | `#d6c8f0` | `#c8693a` |
| 19 | `midnightchampion` | Black Gold — Midnight Champion | original | Original matte-black and brushed-gold palette. | `#1c1c1f` | `#3a3a40` | `#c9a24a` | `#ffcc66` | natural |
| 20 | `glitterstorm` | Opal — Glitterstorm | original | Original pearl / lavender palette with a deterministic glitter pattern. Sparkle: glitter. | `#efe9f2` | `#b9a6e0` | `#ff9ad0` | `#d8c8ff` | `#ffffff` |

## Coverage per sprite set

| set | strips | pixels themed | roles the art does not separate | regions doc |
|---|---|---|---|---|
| Ben — Classic (shirt / cargo pants / watch) | 21 | 38.2 % | ACCENT | [classic_REGIONS.md](classic_REGIONS.md) |
| Ben — Jacket / Alien Force (jacket / undershirt / jeans / watch) | 21 | 43.9 % | ENERGY | [jacket_REGIONS.md](jacket_REGIONS.md) |
| Swampfire | 29 | 86.6 % | SECONDARY, HIGHLIGHT | [swampfire_REGIONS.md](swampfire_REGIONS.md) |
| Heatblast | 64 | 76.6 % | ACCENT, HIGHLIGHT | [heatblast_REGIONS.md](heatblast_REGIONS.md) |
| Megawhatt | 60 | 62.6 % | SECONDARY, HIGHLIGHT | [megawhatt_REGIONS.md](megawhatt_REGIONS.md) |
| Goop | 41 | 100.0 % | SECONDARY, ENERGY, HIGHLIGHT | [goop_REGIONS.md](goop_REGIONS.md) |
| XLR8 | 33 | 82.6 % | SECONDARY, HIGHLIGHT | [xlr8_REGIONS.md](xlr8_REGIONS.md) |
| Eye Guy | 34 | 56.0 % | HIGHLIGHT | [eyeguy_REGIONS.md](eyeguy_REGIONS.md) |
| Ghostfreak | 36 | 85.7 % | SECONDARY, ACCENT, HIGHLIGHT | [ghostfreak_REGIONS.md](ghostfreak_REGIONS.md) |
| Alien X | 32 | 66.8 % | SECONDARY, ACCENT, HIGHLIGHT | [alienx_REGIONS.md](alienx_REGIONS.md) |
| Brainstorm | 35 | 76.7 % | HIGHLIGHT | [brainstorm_REGIONS.md](brainstorm_REGIONS.md) |
| Terraspin | 33 | 83.4 % | SECONDARY, ACCENT, ENERGY, HIGHLIGHT | [terraspin_REGIONS.md](terraspin_REGIONS.md) |
| Wildvine | 31 | 53.2 % | HIGHLIGHT | [wildvine_REGIONS.md](wildvine_REGIONS.md) |
| Jetray | 36 | 91.0 % | HIGHLIGHT | [jetray_REGIONS.md](jetray_REGIONS.md) |
| Diamondhead | 64 | 58.0 % | SECONDARY, ENERGY | [diamondhead_ov_REGIONS.md](diamondhead_ov_REGIONS.md) |
| Upgrade | 70 | 60.3 % | HIGHLIGHT | [upgrade_ov_REGIONS.md](upgrade_ov_REGIONS.md) |
| Humongousaur | 37 | 96.4 % | ACCENT, HIGHLIGHT | [humongousaur_REGIONS.md](humongousaur_REGIONS.md) |
| Feedback | 33 | 45.7 % | SECONDARY, HIGHLIGHT | [feedback_ov_REGIONS.md](feedback_ov_REGIONS.md) |
| Arcticguana | 39 | 62.3 % | HIGHLIGHT | [arcticguana_REGIONS.md](arcticguana_REGIONS.md) |
| Benwolf | 37 | 55.0 % | ACCENT, HIGHLIGHT | [benwolf_REGIONS.md](benwolf_REGIONS.md) |
| Big Chill | 40 | 84.4 % | ACCENT, HIGHLIGHT | [bigchill_REGIONS.md](bigchill_REGIONS.md) |
| Ripjaws | 45 | 49.0 % | HIGHLIGHT | [ripjaws_REGIONS.md](ripjaws_REGIONS.md) |
| Rath | 40 | 61.6 % | ACCENT, HIGHLIGHT | [rath_REGIONS.md](rath_REGIONS.md) |
| Water Hazard | 39 | 83.1 % | ACCENT, HIGHLIGHT | [waterhazard_REGIONS.md](waterhazard_REGIONS.md) |
| Highbreed | 47 | 82.3 % | HIGHLIGHT | [highbreed_REGIONS.md](highbreed_REGIONS.md) |
| Wildmutt | 37 | 96.5 % | ACCENT, HIGHLIGHT | [wildmutt_ov_REGIONS.md](wildmutt_ov_REGIONS.md) |

Pixels that are not themed are deliberate: outline black, skin, eyes, teeth and whites.

## Selecting a theme (actual controls)

Character select → Ben → the skin grid shows the originals, then Classic 1–20, then Jacket 1–20. Each card shows Ben's full-body idle frame in that theme, drawn large with crisp pixels, the theme's role colours as a strip, and a short label (e.g. CLASSIC · 1 / Blue Hour). The grid now picks the column count that gives the largest card, so the 45-card set is readable. Every set that already fit at full size keeps its exact layout.
- **Mouse:** click a card.
- **PS5 DualSense / gamepad:** D-pad or left stick moves the cursor between cards, ✕ (Cross) picks, ◯ (Circle) goes back.
- **Keyboard:** Esc / Backspace goes back. The skin grid has no keyboard browse; that is unchanged.

Regenerate: `python3 tools/ben10/write_theme_docs.py` · contact sheets: `node tools/ben10/theme_contact_sheets.mjs`.
