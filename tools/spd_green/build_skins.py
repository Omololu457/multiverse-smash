#!/usr/bin/env python3
"""S.P.D. Green Ranger — six appearance skins (cosmetic). Never edits base art. Requires Pillow + numpy + scipy.

Green's Plug & Play art is a CLOSED palette (verified over every extracted cell, see docs/spd_green/source_rects.json):
  SUIT   6-step green ramp (8,66,24) (16,99,33) (24,123,49) (24,156,66) (33,181,82) (41,214,99)  helmet + body cloth
         + (57,182,52): the sheet's outer-background colour, used inside 79 body pixels as suit shading → suit step 4
  LIGHT  3-step neutral (148,148,140) (198,198,181) (247,255,231): gloves, belt, chest/leg stripes, boot trim
         … and ALSO the Deltamax barrel highlights, muzzle star and beam core. Split by connectivity exactly like
         SPD Blue: a light blob whose 1-px rim is >=45 % transparent, or >=160 px, = WEAPON/EFFECT (kept).
  BLACK  (0,0,0) (8,8,8): outlines AND the visor / black side panels (same palette entries → kept for every skin,
         which is what preserves the outlines)
  GREY   (49,49,41) (99,99,90): floor shadow + Deltamax body (kept)
  OTHER  a handful of stray pixels (reds/browns in the streak FX and helmet antenna) — kept exactly.
Region ids written to assets/spd_green/skins/masks/: 0 transparent · 1 black (outline/visor/panels) · 2 suit (helmet+cloth)
· 3 trim (gloves/belt/stripes/boot trim) · 4 grey (shadow/weapon body) · 5 weapon/effect light · 6 other.
Helmet and body cloth share one ramp in the source and are recoloured together (no new helmet shapes).
Every skin is a FINITE colour map (suit i -> ramp[i], trim j -> trim[j]); alpha, size, pivots, outlines untouched;
nearest-neighbour only; precomputed once into PNGs (no per-frame recolouring).
    python3 tools/spd_green/build_skins.py
"""
from pathlib import Path
import json, hashlib
import numpy as np
import scipy.ndimage as nd
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/spd_green'; OUT = SRC / 'skins'; DOC = ROOT / 'docs/skins/spd_green'
GREEN = [(8, 66, 24), (16, 99, 33), (24, 123, 49), (24, 156, 66), (33, 181, 82), (41, 214, 99)]
SUIT_EXTRA = {(57, 182, 52): 4}
LIGHT = [(148, 148, 140), (198, 198, 181), (247, 255, 231)]
BLACK = [(0, 0, 0), (8, 8, 8)]; GREY = [(49, 49, 41), (99, 99, 90)]
REGIONS = {0: 'transparent', 1: 'black: outlines + visor + black side panels (kept)', 2: 'suit: helmet + green cloth',
           3: 'trim: gloves / belt / chest+leg stripes / boot trim', 4: 'grey: floor shadow + Deltamax body (kept)',
           5: 'weapon/effect light: barrel highlights, muzzle star, beam core, fist-at-arm\'s-end (kept)', 6: 'other stray pixels (kept)'}
BLUE_RAMP = [(0, 8, 74), (24, 33, 99), (41, 49, 123), (66, 74, 156), (82, 99, 181), (99, 115, 206)]   # assets/spd_blue exact ramp

SKINS = {
  'alienx': {'name': 'Alien X — Inspired', 'id': 'spdGreenAlienX', 'class': 'Crossover palette',
             'suit': [(8, 9, 10), (13, 14, 16), (19, 20, 23), (26, 28, 31), (34, 38, 40), (44, 66, 52)],
             'trim': [(160, 166, 168), (212, 216, 218), (242, 246, 246)], 'fx': ('#d8ffe4', '#3fae6a'),
             'source': 'Ben 10: Alien Force / Ultimate Alien — Alien X (Celestialsapien) colour scheme only',
             'notes': 'Charcoal/black suit; light trim; restrained green only on the top suit highlight step. The project\'s existing Alien X starfield overlay (game.js drawAlienXStarfield, id ends "AlienX") draws on top. No Alien X anatomy, horns or constellations added to the pixels.'},
  'upgrade': {'name': 'Upgrade — Inspired', 'id': 'spd_green_inspired_upgrade', 'class': 'Crossover palette',
             'suit': [(4, 6, 4), (8, 11, 8), (12, 16, 12), (17, 22, 17), (23, 30, 23), (31, 40, 31)],
             'trim': [(40, 170, 70), (80, 225, 110), (165, 255, 180)], 'fx': ('#8dffad', '#1fd060'),
             'source': 'Ben 10 (2005) — Upgrade (Galvanic Mechamorph) colour scheme only',
             'notes': 'Dark suit; the EXISTING trim pixels (stripes, belt, gloves) turn bright green. No circuitry pattern added.'},
  'diamondhead': {'name': 'Diamondhead — Inspired', 'id': 'spd_green_inspired_diamondhead', 'class': 'Crossover palette',
             'suit': [(6, 40, 52), (10, 66, 80), (18, 98, 112), (36, 140, 150), (70, 186, 192), (126, 228, 228)],
             'trim': [(170, 196, 204), (214, 236, 240), (244, 255, 255)], 'fx': ('#a8fff2', '#2fb8b0'),
             'source': 'Ben 10 (2005) — Diamondhead (Petrosapien) colour scheme only',
             'notes': 'Cyan/teal suit, pale highlights, deep cool shadows. No crystal shards or facets added.'},
  'heatblast': {'name': 'Heatblast — Inspired', 'id': 'spd_green_inspired_heatblast', 'class': 'Crossover palette',
             'suit': [(22, 8, 6), (38, 12, 8), (58, 18, 10), (84, 26, 12), (112, 36, 14), (140, 50, 18)],
             'trim': [(214, 84, 18), (250, 140, 30), (255, 206, 96)], 'fx': ('#ffc070', '#ff6a10'),
             'source': 'Ben 10 (2005) — Heatblast (Pyronite) colour scheme only',
             'notes': 'Dark volcanic suit; warm orange/red on the existing trim. No flame particles or rock texture.'},
  'spd_blue': {'name': 'SPD Blue — Inspired Palette', 'id': 'spd_green_inspired_spd_blue', 'class': 'Team palette swap',
             'suit': BLUE_RAMP, 'trim': LIGHT, 'fx': ('#78bdff', '#287aff'),
             'source': 'Same game: the S.P.D. Blue Ranger sheet\'s exact 6-step suit ramp (assets/spd_blue / tools/spd_blue/skins) mapped onto Green\'s 6-step ramp',
             'notes': 'Bridge Carson\'s own helmet silhouette, pose set, kit and identity in Blue\'s colours — not Sky Tate / the Blue Ranger. The sprite carries no legible suit number; nothing is added.'},
  'shadow': {'name': 'SPD Shadow — Inspired Palette', 'id': 'spd_green_inspired_shadow', 'class': 'Original interpretation',
             'suit': [(8, 10, 22), (14, 17, 34), (20, 24, 46), (28, 33, 60), (38, 44, 76), (50, 58, 94)],
             'trim': [(150, 156, 168), (196, 202, 212), (236, 240, 246)], 'fx': ('#d6e0f0', '#5a6c98'),
             'source': 'Inspired by the S.P.D. Shadow Ranger colour scheme (Power Rangers S.P.D., 2005)',
             'notes': 'Navy/charcoal suit with silver trim — an interpretation using existing regions only. No canine features; not presented as Doggie Cruger.'},
}


def region_mask(arr):
    rgb = arr[..., :3]; al = arr[..., 3] > 0
    def isin(cols): return al & np.any([(rgb == c).all(-1) for c in cols], axis=0)
    m = np.where(al, 6, 0).astype(np.uint8)
    m[isin(BLACK)] = 1; m[isin(GREEN + list(SUIT_EXTRA))] = 2; m[isin(GREY)] = 4
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
    for i, c in enumerate(GREEN): out[(m == 2) & (arr[..., :3] == c).all(-1), :3] = sk['suit'][i]
    for c, i in SUIT_EXTRA.items(): out[(m == 2) & (arr[..., :3] == c).all(-1), :3] = sk['suit'][i]
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
    (DOC / 'region_mapping.json').write_text(json.dumps({'regions': REGIONS, 'suitRamp': GREEN, 'suitExtra': {str(k): v for k, v in SUIT_EXTRA.items()},
        'trimRamp': LIGHT, 'black': BLACK, 'grey': GREY, 'weaponRule': 'light blob with >=45% transparent rim or >=160 px',
        'skins': SKINS, 'files': audit}, indent=1) + '\n')
    # Contact: every skin × idle / walk / attack / special / reaction / knockdown (+ phase ghost, beam, portrait).
    poses = [('idle', 0), ('walk', 2), ('heavy', 1), ('gAcro', 1), ('gShot', 2), ('hurt', 0), ('knockdown', 2),
             ('fx_streak1', None), ('fx_beam1', None), ('portrait', None)]
    rows = ['default', *SKINS]; CW, CH = 120, 112
    sheet = Image.new('RGB', (190 + CW * len(poses), 22 + CH * len(rows)), (34, 43, 54)); d = ImageDraw.Draw(sheet)
    labels = ['idle', 'walk', 'attack (Heavy)', 'special (Acrobat)', 'special (shot)', 'reaction', 'knockdown', 'phase FX', 'beam', 'portrait']
    for c, l in enumerate(labels): d.text((190 + c * CW + 4, 4), l, fill=(200, 255, 210))
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
