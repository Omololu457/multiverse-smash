# Megumi Fushiguro: skins

There are ten skins plus Default. All are **cosmetic only**: geometry, pivots, frame data, hitboxes, timing, damage and audio are identical to Default. `harness/megumi_skins.test.mjs` checks this with a 600-frame authoritative trace per skin, which must be identical to Default's.

## Where the files are

| | |
|---|---|
| **Build script** | `python3 tools/megumi/build_skins.py` |
| **Palette spec** | `tools/megumi/skins.json` |
| **Outputs** | `assets/megumi_fushiguro/skins/<tag>/` (every player strip + portrait); `megumiSkinTable.js` (generated) |
| **Audit** | `docs/skins/megumi/region_mapping.json` (rules + pixels per region per strip) |
| **Review sheet** | `docs/megumi/skins_contact.png`. One row per skin: idle, sword arc, Dog gesture, domain sign, win pose with Nue, portrait. The bottom row shows the region map. |
| **Registry** | `megumiSkins.js` → `skins.js` (`megumi_fushiguro: MEGUMI_SKINS`) |

## Method: region-based, precomputed, cached

The sheet is a downscaled JPG, so colours are continuous rather than palette indices. Each opaque pixel is classified **per cell** from the Default art, and that classification is shared by all ten skins:

| region | rule | recoloured? |
|---|---|---|
| outline | dark (max < 40) pixels on the silhouette edge | never |
| skin | warm pixels (R ≥ 120, R − B ≥ 45, G ≥ 70): face, hands, warm gold accents | never |
| fx | bright saturated non-warm pixels (aura strokes, blue slashes), and light pixels outside the body column (blade highlights) | → skin's fx ramp |
| shadow | remaining pixels more than 18 px from the root column (domain spread, sign aura, shadow weapons) | → shadow ramp |
| hair | remaining pixels in the head box (above the face centre, ±11 px of the face column) | → hair ramp |
| uniform | every other body pixel | → uniform ramp |
| summon | `win.png` only: Nue drawn behind Megumi (above floor − 46 rows, and outside the body column) | never |

- **Recolouring is luminance-preserving.** A pixel's luminance picks a point on the skin's three-stop ramp.
- **Alpha is byte-identical to Default** (asserted in the build and the test).
- **Patterns are static.** Ten Constellations' star specks and Shadow Circuit's circuit specks are sparse, deterministic hash placements on uniform pixels only. No animation, no RNG.
- **No runtime cost.** No runtime recolouring, no per-frame pixel reads, no `Math.random`.
- **What follows the skin:** the HUD accent pair, the cut-in and the Shadow Step echoes (drawn from the skinned strip). Shikigami strips are separate creatures and are **not** reskinned.

## The skins

| id | name | classification | look |
|---|---|---|---|
| `default` | Default | — | the supplied sheet |
| `mg_natural_shadows` | Natural Shadows | Original | ink-indigo uniform, blue-black hair, violet-ink effects (a subtle take on Default) |
| `mg_cursed_rose` | Cursed Rose | Original | wine uniform, crimson-black hair, rose-pink effects |
| `mg_infinity_frost` | Infinity Frost | Crossover-inspired (Satoru Gojo) | snow-silver hair, ice-navy uniform, Infinity-blue effects |
| `mg_ten_constellations` | Alien X — Ten Constellations | Crossover-inspired (Alien X, Ben 10) | void-black uniform with fixed white star specks, white hair, green-white effects |
| `mg_shadow_circuit` | Upgrade — Shadow Circuit | Crossover-inspired (Upgrade, Ben 10) | liquid-black uniform, neon-green circuit highlights |
| `mg_pale_procession` | Ghostfreak — Pale Procession | Crossover-inspired (Ghostfreak, Ben 10) | pale ash-grey uniform, deep-violet hair, magenta spectral effects |
| `mg_eclipse_gold` | Eclipse Gold | Original | eclipse-black uniform with gold highlights, bronze-sheen hair |
| `mg_abyssal_aquarium` | Abyssal Aquarium | Original | deep-sea teal uniform, abyss-blue hair, aqua glow |
| `mg_sakura_after_dark` | Sakura After Dark | Original | night-plum uniform, dark cherry hair, sakura-pink effects |
| `mg_opal_menagerie` | Opal Menagerie | Original | pearl-lavender uniform on an opal ramp (indigo / mint / pink-white), lilac hair, iridescent effects |

The crossover skins are **colour schemes only**: no logos, no geometry, no official costume claims. Every entry records its `classification`, `crossover` and `inspiration` fields.

Ids are prefixed `mg_`. None ends in "AlienX", because the shared starfield overlay keys on that suffix and would fill the whole cell rect. None contains "cyborg", because Superman's eye overlay keys on that substring.

## Known limits

- **Win pose.** Nue's body overlaps Megumi's head in two cells, so a few Nue pixels beside his hair take the hair ramp. The overlap is genuinely ambiguous in the source; it is visible only in the win pose.
- **Warm accents.** Warm-coloured accents (the gold sword-arc highlight) are treated as skin and keep their Default colour in every skin.
- **Natural Shadows** is intentionally close to Default.

## Mirrors

- Different skins keep their own palettes.
- A same-skin mirror gets the existing P2 mirror wash (shared rule; `game.js` mirror line added for `megumi_fushiguro`).
- Skin choice persists across a reload (shared session save).
