#!/usr/bin/env python3
"""S.P.D. Pink Ranger — six appearance skins (cosmetic). Never edits base art. Requires Pillow + numpy + scipy.

Syd's Plug & Play art is a CLOSED palette (verified over every extracted cell; see docs/spd_pink/source_rects.json):
  SUIT   7-step pink ramp (luminance order) (255,16,107) (255,41,123) (255,66,140) (255,85,174) (255,99,156)
         (255,107,181) (255,115,206): helmet + body cloth (+ the pink afterimage in the supplied streak FX)
  LIGHT  3-step neutral (148,148,140) (198,198,181) (247,255,231): gloves, belt, chest/leg stripes, boot trim
         … and ALSO the baton blade, Deltamax highlights, blast, muzzle star and beam core. Split by connectivity
         (same rule as SPD Green/Blue): a light blob whose 1-px rim is >=45 % transparent, or >=160 px,
         = WEAPON/EFFECT (kept).
  BLACK  (0,0,0) (8,8,8): outlines AND visor / black side panels (kept → outlines preserved)
  GREY   (49,49,41) (99,99,90): floor shadow + Deltamax body (kept)
  OTHER  stray reds/browns in the cannon/streak FX — kept exactly.
Region ids in assets/spd_pink/skins/masks/: 0 transparent · 1 black (outline/visor/panels) · 2 suit (helmet+cloth)
· 3 trim (gloves/boots trim/belt/stripes/markings) · 4 grey (shadow/weapon body) · 5 weapon/effect light · 6 other.
LIMITS (documented, not hidden): helmet and cloth share ONE source ramp and gloves/boot-trim/belt/stripes share ONE
light ramp, so they are recoloured together; visor and black panels share the outline black and are never changed.
Every skin is a FINITE colour map (suit i -> ramp[i], trim j -> trim[j]); alpha, size, pivots, outlines untouched;
nearest-neighbour only; precomputed once into PNGs (no per-frame recolouring, no shared-canvas mutation).
    python3 tools/spd_pink/build_skins.py
"""
from pathlib import Path
import json, hashlib
import numpy as np
import scipy.ndimage as nd
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/spd_pink'; OUT = SRC / 'skins'; DOC = ROOT / 'docs/skins/spd_pink'
PINK = [(255, 16, 107), (255, 41, 123), (255, 66, 140), (255, 85, 174), (255, 99, 156), (255, 107, 181), (255, 115, 206)]
LIGHT = [(148, 148, 140), (198, 198, 181), (247, 255, 231)]
BLACK = [(0, 0, 0), (8, 8, 8)]; GREY = [(49, 49, 41), (99, 99, 90)]
REGIONS = {0: 'transparent', 1: 'black: outlines + visor + black side panels (kept)', 2: 'suit: helmet + pink cloth (+ pink streak afterimage)',
           3: 'trim: gloves / boot trim / belt / chest+leg stripes (white markings)', 4: 'grey: floor shadow + Deltamax body (kept)',
           5: 'weapon/effect light: baton blade, barrel highlights, blast, muzzle star, beam core (kept)', 6: 'other stray pixels (kept)'}
SKINS = {
  'alienx': {'name': 'Alien X — Inspired', 'id': 'spdPinkAlienX', 'class': 'Inspired Palette',
             'suit': [(6, 7, 8), (10, 11, 13), (15, 16, 19), (21, 23, 26), (28, 31, 34), (36, 40, 42), (46, 70, 54)],
             'trim': [(160, 166, 168), (212, 216, 218), (242, 246, 246)], 'fx': ('#d8ffe4', '#3fae6a'),
             'source': 'Ben 10: Alien Force / Ultimate Alien — Alien X (Celestialsapien): black body, white markings, green accents; colour scheme only',
             'notes': 'Dark body panels, light trim, restrained green only on the top suit highlight. The project\'s existing Alien X starfield overlay (game.js drawAlienXStarfield, id ends "AlienX") draws on top. No stars or constellations painted into pixels.'},
  'diamondhead': {'name': 'Diamondhead — Inspired', 'id': 'spd_pink_inspired_diamondhead', 'class': 'Inspired Palette',
             'suit': [(6, 40, 52), (10, 62, 76), (16, 90, 104), (30, 124, 136), (52, 160, 170), (86, 196, 200), (132, 230, 230)],
             'trim': [(170, 196, 204), (214, 236, 240), (244, 255, 255)], 'fx': ('#a8fff2', '#2fb8b0'),
             'source': 'Ben 10 (2005) — Diamondhead (Petrosapien): teal/green crystal; colour scheme only',
             'notes': 'Cyan/teal panels, pale existing highlights, deep cool shadows. No crystal shards or facets added.'},
  'upgrade': {'name': 'Upgrade — Inspired', 'id': 'spd_pink_inspired_upgrade', 'class': 'Inspired Palette',
             'suit': [(3, 5, 3), (6, 9, 6), (10, 14, 10), (14, 19, 14), (19, 25, 19), (24, 32, 24), (31, 40, 31)],
             'trim': [(40, 170, 70), (80, 225, 110), (165, 255, 180)], 'fx': ('#8dffad', '#1fd060'),
             'source': 'Ben 10 (2005) — Upgrade (Galvanic Mechamorph): black body with green lines; colour scheme only',
             'notes': 'Black/dark panels; the EXISTING trim pixels turn green. No circuitry pattern added.'},
  'heatblast': {'name': 'Heatblast — Inspired', 'id': 'spd_pink_inspired_heatblast', 'class': 'Inspired Palette',
             'suit': [(16, 14, 14), (26, 22, 21), (36, 30, 28), (46, 38, 34), (58, 48, 42), (72, 58, 50), (88, 70, 58)],
             'trim': [(214, 60, 18), (250, 140, 30), (255, 210, 90)], 'fx': ('#ffc070', '#ff6a10'),
             'source': 'Ben 10 (2005) — Heatblast (Pyronite): charcoal rock with orange/yellow fire; colour scheme only',
             'notes': 'Charcoal body; orange/red/gold on the existing trim. No flames or rock texture.'},
  'chromastone': {'name': 'Chromastone — Inspired', 'id': 'spd_pink_inspired_chromastone', 'class': 'Inspired Palette',
             'suit': [(30, 10, 54), (46, 15, 80), (64, 21, 106), (84, 28, 134), (106, 38, 160), (136, 52, 186), (176, 76, 212)],
             'trim': [(176, 160, 214), (214, 200, 244), (246, 238, 255)], 'fx': ('#f0b8ff', '#a43be0'),
             'source': 'Ben 10: Alien Force — Chromastone (Crystalsapien): violet/purple crystal body with magenta crystal accents (owner brief; wiki pages note magenta crystals); colour scheme only',
             'notes': 'Purple-to-magenta body with contrasting pale lavender trim. No crystal protrusions, facets or prism FX.'},
  'shadow': {'name': 'SPD Shadow — Inspired Palette', 'id': 'spd_pink_inspired_shadow', 'class': 'Inspired Palette',
             'suit': [(8, 10, 22), (13, 16, 32), (18, 22, 42), (25, 30, 54), (33, 39, 68), (42, 50, 84), (54, 63, 102)],
             'trim': [(150, 156, 168), (196, 202, 212), (236, 240, 246)], 'fx': ('#d6e0f0', '#5a6c98'),
             'source': 'Inspired by the S.P.D. Shadow Ranger colour scheme (Power Rangers S.P.D., 2005): navy/black with silver',
             'notes': 'Dark navy/charcoal suit with silver trim on existing regions only. Syd\'s own helmet, silhouette and identity; no number added, no canine features; not Doggie Cruger.'},
}


def region_mask(arr):
    rgb = arr[..., :3]; al = arr[..., 3] > 0
    def isin(cols): return al & np.any([(rgb == c).all(-1) for c in cols], axis=0)
    m = np.where(al, 6, 0).astype(np.uint8)
    m[isin(BLACK)] = 1; m[isin(PINK)] = 2; m[isin(GREY)] = 4
    light = isin(LIGHT)
    lab, n = nd.label(light, structure=np.ones((3, 3)))
    for i, sl in enumerate(nd.find_objects(lab), start=1):
        if sl is None: continue
        y0, y1 = max(sl[0].start - 1, 0), sl[0].stop + 1; x0, x1 = max(sl[1].start - 1, 0), sl[1].stop + 1
        b = lab[y0:y1, x0:x1] == i
        pad = np.pad(b, 1); pring = nd.binary_dilation(pad, np.ones((3, 3))) & ~pad
        tr = (~np.pad(al[y0:y1, x0:x1], 1, constant_values=False))[pring].mean() if pring.sum() else 1
        m[y0:y1, x0:x1][b] = 5 if (tr >= 0.45 or b.sum() >= 160) else 3
    return m


def paint(arr, m, sk):
    out = arr.copy()
    for i, c in enumerate(PINK): out[(m == 2) & (arr[..., :3] == c).all(-1), :3] = sk['suit'][i]
    for j, c in enumerate(LIGHT): out[(m == 3) & (arr[..., :3] == c).all(-1), :3] = sk['trim'][j]
    return out


def main():
    (OUT / 'masks').mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    files = sorted(SRC.glob('*.png')); audit = {}
    for f in files:
        rel = f.name; arr = np.array(Image.open(f).convert('RGBA')); m = region_mask(arr)
        Image.fromarray(m, 'L').save(OUT / 'masks' / rel)
        audit[rel] = {'regions': {REGIONS[k]: int((m == k).sum()) for k in range(1, 7) if (m == k).any()},
                      'maskSha256': hashlib.sha256(m.tobytes()).hexdigest()}
        for tag, sk in SKINS.items():
            o = paint(arr, m, sk)
            assert (o[..., 3] == arr[..., 3]).all() and o.shape == arr.shape
            keep = (m != 2) & (m != 3)
            assert (o[keep] == arr[keep]).all(), 'non-suit/trim pixel changed'
            dst = OUT / tag / rel; dst.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(o, 'RGBA').save(dst, optimize=True)
    (DOC / 'region_mapping.json').write_text(json.dumps({'regions': REGIONS, 'suitRamp': PINK,
        'trimRamp': LIGHT, 'black': BLACK, 'grey': GREY, 'weaponRule': 'light blob with >=45% transparent rim or >=160 px',
        'skins': SKINS, 'files': audit}, indent=1) + '\n')
    # Contact: every skin × idle / walk / attack / special / reaction / knockdown (+ phase ghost, beam, portrait).
    poses = [('idle', 0), ('walk', 2), ('heavy', 1), ('pBreaker', 1), ('pShot', 2), ('pRose', 1), ('hurt', 0), ('knockdown', 2),
             ('fx_streak1', None), ('fx_beam1', None), ('portrait', None)]
    rows = ['default', *SKINS]; CW, CH = 120, 112
    sheet = Image.new('RGB', (190 + CW * len(poses), 22 + CH * len(rows)), (34, 43, 54)); d = ImageDraw.Draw(sheet)
    labels = ['idle', 'walk', 'normal (Heavy)', 'special (Breaker)', 'special (shot)', 'air special', 'reaction', 'knockdown', 'phase FX', 'beam', 'portrait']
    for c, l in enumerate(labels): d.text((190 + c * CW + 4, 4), l, fill=(255, 200, 225))
    for r, tag in enumerate(rows):
        y = 22 + r * CH; d.text((6, y + CH // 2 - 6), 'Default' if tag == 'default' else SKINS[tag]['name'].replace('\u2014', '-'), fill='white')
        for c, (p, fr) in enumerate(poses):
            im = Image.open((SRC if tag == 'default' else OUT / tag) / f'{p}.png').convert('RGBA')
            cell = im if fr is None else im.crop((fr * 144, 0, fr * 144 + 144, im.height))
            bb = cell.getbbox(); cell = cell.crop(bb) if bb else cell
            k = max(1, min((CW - 8) // max(cell.width, 1), (CH - 8) // max(cell.height, 1)))
            cell = cell.resize((cell.width * k, cell.height * k), Image.Resampling.NEAREST)
            sheet.paste(cell, (190 + c * CW + (CW - cell.width) // 2, y + (CH - cell.height) // 2), cell)
    sheet.save(DOC / 'skins_contact.png')
    print(f'{len(SKINS)} skins x {len(files)} sheets -> {OUT}; contact {DOC / "skins_contact.png"}')


if __name__ == '__main__':
    main()
