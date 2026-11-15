# Batman (rebuilt) — Asset Manifest

All machine names below are **custom game adaptations of supplied generic art**, not claims that these are
official Batman vehicle designs. Source sheets are **read-only** (never modified, moved or re-saved); every
game asset is an extracted / recoloured copy under `assets/batman/`.

## Supplied source sheets (repo root, untracked originals — preserved byte-for-byte)

| id | file | SHA-256 (prefix) | used for |
|----|------|------------------|----------|
| body | `SNES - Batman Returns - Playable Characters - Batman.png` | `12f83f426fef` | Batman's whole body atlas (99 cells, 14 rows) + tool anchors + portrait |
| d2 | `Free-Drones-Pack-Pixel-Art2.webp` | `d06fe1402f66` | disc scanner (scout), capsule (cover smoke), bombardier drones |
| d3 | `Free-Drones-Pack-Pixel-Art3.webp` | `4055f8fb58e6` | box platform, gunship interceptor |
| d4 | `Free-Drones-Pack-Pixel-Art4.webp` | `c484204b5add` | arsenal carrier + three crew operators (intro card) |
| d6 | `Free-Drones-Pack-Pixel-Art6.webp` | `7177a4d4cdad` | rotorcraft (Skyhook), fixed-wing aircraft (KNIGHTFALL + Airspace), bombs |
| dt | `drones_test002.webp` | `ba7268ebe903` | Hunter walker, Lurker tracked cannon, Steel Wing flyer, Defender launcher, loose pieces |
| rb | `Robots-Pixel-Art-Sprite-Sheet-Pack6-1536x1024.webp` | `ac5ae72caca2` | Wayne Automaton (attack 1–4, death) |
| — | `assets/krybot/explosion.png` (existing repo asset) | — | impact / machine-death explosion strip (shared, read-only; skins recolour a copy) |

Exact rectangles, anchors and per-row notes: `docs/batman/source_rects.json` (written by `tools/batman/extract.py`).
Excluded from extraction: the on-sheet credit caption and HUD icon (body sheet) and the text row labels of the
promo sheets (all labels lie left of / outside every art rect; `labels_excluded` in the JSON).

## Generated game assets

| path | contents |
|------|----------|
| `assets/batman/body.png` | Batman body atlas: one row per action, uniform cells, alpha-cut, feet anchors |
| `assets/batman/fleet.png` | every machine row (scout, capsule, bombers, platform, interceptor, crew, carrier, rotorcraft, plane, bombs, hunter, lurker, steel wing, defender, ammo, automaton) |
| `assets/batman/portrait.png` | select / HUD / intro-card portrait (cropped from the body sheet) |
| `assets/batman/skins/<tag>/{body,fleet,portrait,explosion}.png` | 10 skins × 4 precomputed recolours (identical size + alpha mask to the default — verified) |
| `batmanSprites.js` | generated animation table (`BATMAN_ANIM`, `BATMAN_FLEET_ANIM`, tool anchors) |
| `batmanSkinTable.js` | generated skin table |
| `docs/batman/contact_body.png`, `contact_fleet.png`, `skins_contact.png` | contact sheets (evidence) |

Rebuild: `python3 tools/batman/extract.py` then `python3 tools/batman/build_skins.py` (deterministic).

## Row-label corrections found in the supplied packs

- **d4 crew rows** are labelled DEATH / IDLE / WALK but show three operators firing sidearms — used only as
  the intro-card crew (`crew_a/b/c`).
- **d4 carrier rows**: "BACK" is the actual collapse (death), "DEATH" is the intact hover, "IDLE" is the lateral
  transit — mapped by what is drawn, not by the label.
- **d6 LANDING** row: the 8th cell is clipped by the sheet edge and is not used.
- **drones_test002.webp** roles differ from the brief's wording: its units are a bipedal Hunter walker, a tracked
  Lurker cannon, a winged Steel Wing gunner and a tracked Defender launcher. They are used in the Carrier
  (Lurker + Defender) and Capsule Cover (Hunter + Steel Wing) operations by what they visibly do.
- Robots pack ATTACK4 (arm thrust stepping in place) is used as the Automaton's brace / reposition stride with no
  damage.

## Legacy art

The pre-rebuild Batman sheets were deleted by the earlier roster wipe. One legacy reference survives in the shared
`preloadManifest.js` (`./batman_baterang_proj.png`, generated from the unreachable legacy code in `abilities.js`);
it 404s harmlessly at preload. It was left untouched (shared, generated, drift-guarded file — see VERIFICATION.md).
