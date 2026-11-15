# Paired cosmetics

Default plus ten alternatives. `mrIncredibleSkinTable.js` is the stable ID/name/
classification/effect table. `mrIncredibleSkins.js` caches both form maps for every
skin. Files are assets/mr_incredible/<tag>/{veteran,prime}/<action>.png.
Every pair has the same geometry, alpha, origin and action coverage as default.
Skin application refreshes only the active form map and preserves simulation state.

| Stable ID | Display / inspiration | Classification |
|---|---|---|
| default | Default (supplied Red Suit / Young) | Original supplied game pixels |
| mi_modern | PRIME / MODERN | Original controlled costume edit |
| mi_cosmic | ALIEN X / COSMIC STRENGTH | Ben 10 inspired palette |
| mi_superman | SUPERMAN / TOMORROW’S STRONGEST | Superman inspired palette, no cape/logo |
| mi_upgrade | UPGRADE / POWER CIRCUIT | Ben 10 inspired palette |
| mi_diamondhead | DIAMONDHEAD / CRYSTAL TITAN | Ben 10 inspired palette, no crystal anatomy |
| mi_heatblast | HEATBLAST / FURNACE FISTS | Ben 10 inspired palette, no flame damage |
| mi_cursed_rose | JJK / CURSED ROSE | JJK inspired pink hair / charcoal / burgundy palette |
| mi_infinity_blue | JJK / INFINITY BLUE | JJK inspired white hair / navy / cyan palette |
| mi_valkyrie | WINNING VALKYRIE / VICTORY FORCE | Custom Beyblade inspired palette |
| mi_golden_age | OBSIDIAN GOLD / GOLDEN AGE | Original obsidian / ivory / antique-gold palette |

The source palette classifiers and each output ramp are in build.py. Skin tones,
mask ink, anatomy and hair have separate masks. Hair changes are confined to
upper-frame gold hair pixels for Superman/JJK treatments. The source's black
fabric is distinguished from contour/face ink by enclosed costume-region masks.
Outline pixels, neighboring skin and transparency are protected. All full-body
frames are processed, including reactions and horizontal knockdowns.

PRIME / MODERN uses deep petrol teal with charcoal sleeve/side/inner-leg fabric.
The visible buckle ring is detected from its enclosed ink and removed, with the
belt and local shading reconstructed inside opaque cloth. It is not simply a
recolored buckle or a pasted rectangle. Trunks are brought into the same fabric
ramp. Matching veteran uses streamlined red and charcoal with an integrated gold-
free waist. The face, hair, mask and silhouette are unchanged. The original small
emblem remains. `modern_edit_masks.json` records pose rectangles and edit counts;
source/output comparisons and the reproducible algorithm allow inspection.

Visual reference researched: the [Homecoming Stark suit promotional image](https://hombredebronze.blogspot.com/2017/06/spider-man-homecoming-el-traje-de-stark.html)
and [the original suit auction photos](https://www.originalprop.com/blog/2017/12/11/screenbids-the-official-spider-man-homecoming-suit-auction-benefiting-toys-for-tots/).
Only integrated fabric panels and restrained trim inform the design: no spider
logo, web pattern, extra plating, thinner body or generated replacement poses.

ALIEN X covers both complete form maps, portrait and cosmetic impact treatment.
Obsidian fabric, cool silver emblem and sparse fixed cloth-only stars replace
teal/belt accent regions in young form. Exposed skin stays natural. Patterns
never use simulation RNG, Math.random, per-frame image decoding or pixel scans.
All alternate sheets are precomputed PNGs. Renderer images/maps are cached.
Stars are always static; reduced-motion presentation omits extra detached bursts
and retains quiet local rings. Shared engine effects remain shared.

Effects: violet-white cosmic; warm Heatblast; rose-violet Cursed Rose; green
Upgrade; mint Diamondhead; antique-gold Golden Age; cyan for Modern, Superman,
Infinity Blue and Valkyrie. Original white authored arcs remain intact. HUD reserve
and transformation readout use the selected accent. Portraits are precomputed;
HUD identity remains the selected veteran portrait through the transformation.
The skin menu previews veteran; skins_contact.png and modern_suit_comparison.png
provide the coordinated young-form previews. No unsupported automatic menu
transformation preview is claimed.
