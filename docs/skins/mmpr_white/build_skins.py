#!/usr/bin/env python3
"""White Ranger (mmpr_white) — six crossover-INSPIRED palettes (cosmetic). Never edits base art.

The Genesis White sheet is a CLOSED palette (verified over every opaque pixel outside the credit panel):
  DARK  (32,32,32)                              — outline / seams AND the black chest shield (same index in the source)
  VISOR (0,0,0)                                 — the helmet visor
  CLOTH (96,96,96) (192,192,192) (224,224,224)  — white suit dark→light (helmet shell, body, gloves, boots)
  GOLD  (160,128,32) (224,192,32)               — gold trim (shield edging, bands, belt, helmet trim) … and gold trail tints
  one stray (32,0,64) pixel in guard0 (kept, region "other")
Regions are found by COLOUR + GEOMETRY, never by inventing pixels:
  1 outline / seams (kept for every skin): DARK pixels that are NOT part of a solid shield area
  2 visor
  3 chest shield: DARK pixels inside a solid 3x3 DARK core, dilated 1 px within DARK (thin seams have no core)
  4 cloth (white suit ramp)            5 gold trim
  6 FX: cloth/gold blobs whose 1-px rim is >=45 % transparent (the supplied kick trails and the Saba slash streak)
  7 Saba blade: the measured blade rectangle of sabaWind0 (cell px x0-28, y0-15) wherever that cell appears — KEPT
    (the sword stays silver, readable on every palette)
  8 other (the one stray source pixel, kept)
LIMITS (documented): gloves, boots and helmet shell share the cloth ramp → recoloured with the suit; belt, bands and
shield edging share the gold ramp → recoloured together as "trim". Each skin is a finite colour map; alpha, size,
pivots, outlines, Saba blade and action shapes are untouched; nearest-neighbour; precomputed into PNGs (no runtime
recolouring, no shared-canvas mutation). The Ninja Megazord is never recoloured (shared art).
    python3 tools/mmpr_white/build_skins.py
"""
from pathlib import Path
import json, hashlib
import numpy as np
import scipy.ndimage as nd
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/mmpr_white'; OUT = SRC / 'skins'; DOC = ROOT / 'docs/skins/mmpr_white'
RECTS = json.loads((ROOT / 'docs/mmpr_white/source_rects.json').read_text())
FW, OX, OY = RECTS['frame']['width'], RECTS['frame']['originX'], RECTS['frame']['originY']
DARK = (32, 32, 32); VISOR = (0, 0, 0)
CLOTH = [(96, 96, 96), (192, 192, 192), (224, 224, 224)]
GOLD = [(160, 128, 32), (224, 192, 32)]
STRAY = [(32, 0, 64)]
SABA_RECT = (0, 0, 29, 16)   # sabaWind0 cell px [x0, y0, x1, y1): the blade (see docs/mmpr_white/SPRITE_LEDGER.md)
REGIONS = {0: 'transparent', 1: 'outline / seams (kept)', 2: 'visor', 3: 'black chest shield', 4: 'white cloth (helmet, body, gloves, boots)',
           5: 'gold trim (shield edging, bands, belt)', 6: 'FX: supplied kick trails / Saba slash streak', 7: 'Saba blade (kept)', 8: 'other (one stray source pixel, kept)'}
BEN10 = 'Ben 10 franchise (Cartoon Network) — alien colour scheme only'
SKINS = {
  'alienx': {'name': 'Alien X — Inspired', 'id': 'mmprWhiteAlienX', 'ref': 'https://ben10.fandom.com/wiki/Alien_X',
    'cloth': [(10, 11, 13), (30, 33, 37), (52, 56, 62)], 'shield': (226, 232, 230), 'trim': [(46, 150, 82), (110, 226, 140)], 'visor': (0, 0, 0),
    'fxr': {'cloth': [(60, 120, 80), (176, 236, 196), (236, 255, 242)], 'gold': [(60, 170, 100), (150, 240, 176)]}, 'fx': ('#d8ffe4', '#3fae6a'),
    'source': f'{BEN10}: Alien X (Celestialsapien) — black body, white markings, green accents',
    'notes': 'Charcoal suit, the EXISTING chest shield turns pale, existing gold trim becomes green accents. The project\'s existing Alien X starfield overlay (game.js, ids ending "AlienX") draws on top; no stars painted into pixels.'},
  'upgrade': {'name': 'Upgrade — Inspired', 'id': 'mmpr_white_inspired_upgrade', 'ref': 'https://ben10.fandom.com/wiki/Upgrade',
    'cloth': [(6, 8, 6), (18, 24, 18), (34, 42, 34)], 'shield': (24, 150, 62), 'trim': [(36, 186, 76), (150, 255, 170)], 'visor': (60, 224, 96),
    'fxr': {'cloth': [(30, 120, 60), (80, 226, 116), (186, 255, 200)], 'gold': [(40, 190, 80), (150, 255, 170)]}, 'fx': ('#8dffad', '#1fd060'),
    'source': f'{BEN10}: Upgrade (Galvanic Mechamorph) — black body with green lines and a green eye',
    'notes': 'Dark suit; the EXISTING shield, trim and visor pixels turn green. Saba keeps its silver blade. No circuitry pattern drawn.'},
  'diamondhead': {'name': 'Diamondhead — Inspired', 'id': 'mmpr_white_inspired_diamondhead', 'ref': 'https://ben10.fandom.com/wiki/Diamondhead',
    'cloth': [(20, 96, 108), (82, 192, 196), (196, 246, 242)], 'shield': (12, 46, 64), 'trim': [(118, 176, 204), (216, 246, 255)], 'visor': (8, 22, 30),
    'fxr': {'cloth': [(60, 160, 170), (150, 238, 238), (226, 255, 255)], 'gold': [(118, 200, 220), (216, 250, 255)]}, 'fx': ('#a8fff2', '#2fb8b0'),
    'source': f'{BEN10}: Diamondhead (Petrosapien) — teal crystal body',
    'notes': 'Cyan/teal suit with pale highlights, cool dark-blue shield, pale icy trim. No crystal shards or facets.'},
  'heatblast': {'name': 'Heatblast — Inspired', 'id': 'mmpr_white_inspired_heatblast', 'ref': 'https://ben10.fandom.com/wiki/Heatblast',
    'cloth': [(34, 26, 22), (66, 50, 40), (98, 72, 54)], 'shield': (110, 24, 10), 'trim': [(226, 92, 22), (255, 204, 84)], 'visor': (60, 10, 4),
    'fxr': {'cloth': [(200, 80, 20), (255, 150, 60), (255, 230, 150)], 'gold': [(226, 110, 30), (255, 210, 100)]}, 'fx': ('#ffc070', '#ff6a10'),
    'source': f'{BEN10}: Heatblast (Pyronite) — charcoal rock with orange / yellow fire',
    'notes': 'Volcanic charcoal suit, dark-red shield, the existing gold trim runs orange-to-gold. No flames or rock texture.'},
  'chromastone': {'name': 'Chromastone — Inspired', 'id': 'mmpr_white_inspired_chromastone', 'ref': 'https://ben10.fandom.com/wiki/Chromastone',
    'cloth': [(76, 22, 118), (150, 54, 186), (214, 104, 222)], 'shield': (30, 8, 48), 'trim': [(198, 188, 230), (246, 240, 255)], 'visor': (20, 4, 30),
    'fxr': {'cloth': [(170, 90, 220), (220, 150, 255), (250, 232, 255)], 'gold': [(210, 170, 250), (250, 232, 255)]}, 'fx': ('#f0b8ff', '#a43be0'),
    'source': f'{BEN10}: Chromastone (Crystalsapien) — purple/violet crystal body with magenta accents',
    'notes': 'Purple-to-magenta suit, deep violet shield, contrasting pale lavender trim. No crystal protrusions or prism FX.'},
  'ghostfreak': {'name': 'Ghostfreak — Inspired', 'id': 'mmpr_white_inspired_ghostfreak', 'ref': 'https://ben10.fandom.com/wiki/Ghostfreak',
    'cloth': [(112, 104, 134), (184, 178, 204), (230, 226, 244)], 'shield': (40, 32, 50), 'trim': [(52, 46, 60), (92, 84, 104)], 'visor': (76, 26, 100),
    'fxr': {'cloth': [(150, 140, 180), (200, 192, 222), (244, 240, 255)], 'gold': [(120, 100, 150), (200, 190, 230)]}, 'fx': ('#e6e0ff', '#6b4a8c'),
    'source': f'{BEN10}: Ghostfreak (Ectonurite) — pale grey-white body, dark lines, purple eye',
    'notes': 'Pale spectral suit; the existing gold trim becomes dark seams, dark shield, violet visor. Outlines kept. No tentacles, no transparency effect.'},
}


def isin(rgb, al, cols): return al & np.any([(rgb == c).all(-1) for c in cols], axis=0)


def saba_cells():
    """{strip file: [frame index, …]} for every strip containing sabaWind0 (the only cell that draws the blade)."""
    anc = next(c['anchor'] for c in RECTS['cells'] if c['name'] == 'sabaWind0')
    return {f'{k}.png': [i for i, n in enumerate(v) if n == 'sabaWind0'] for k, v in RECTS['sequences'].items() if 'sabaWind0' in v}, anc


def region_mask(arr, rel, saba):
    rgb = arr[..., :3]; al = arr[..., 3] > 0
    m = np.where(al, 8, 0).astype(np.uint8)
    dark = isin(rgb, al, [DARK])
    core = nd.binary_erosion(dark, np.ones((3, 3)), border_value=0)
    shield = nd.binary_dilation(core, np.ones((3, 3))) & dark
    m[dark] = 1; m[shield] = 3
    m[isin(rgb, al, [VISOR])] = 2
    m[isin(rgb, al, CLOTH)] = 4
    m[isin(rgb, al, GOLD)] = 5
    light = isin(rgb, al, CLOTH + GOLD)
    lab, n = nd.label(light, structure=np.ones((3, 3)))
    for i, sl in enumerate(nd.find_objects(lab), start=1):
        if sl is None: continue
        y0, y1 = max(sl[0].start - 1, 0), sl[0].stop + 1; x0, x1 = max(sl[1].start - 1, 0), sl[1].stop + 1
        b = lab[y0:y1, x0:x1] == i
        pad = np.pad(b, 1); ring = nd.binary_dilation(pad, np.ones((3, 3))) & ~pad
        tr = (~np.pad(al[y0:y1, x0:x1], 1, constant_values=False))[ring].mean() if ring.sum() else 1
        if tr >= 0.45: m[y0:y1, x0:x1][b] = 6
    frames, anc = saba
    for fi in frames.get(rel, []):   # Saba blade: measured rectangle of sabaWind0 placed at its strip position
        bx, by = fi * FW + OX - anc[0], OY - anc[1]
        x0, y0, x1, y1 = SABA_RECT
        win = m[by + y0:by + y1, bx + x0:bx + x1]; win[(win != 0) & (win != 1)] = 7
    m[isin(rgb, al, STRAY)] = 8
    return m


def paint(arr, m, sk):
    out = arr.copy(); rgb = arr[..., :3]
    for i, c in enumerate(CLOTH):
        out[(m == 4) & (rgb == c).all(-1), :3] = sk['cloth'][i]
        out[(m == 6) & (rgb == c).all(-1), :3] = sk['fxr']['cloth'][i]
    for j, c in enumerate(GOLD):
        out[(m == 5) & (rgb == c).all(-1), :3] = sk['trim'][j]
        out[(m == 6) & (rgb == c).all(-1), :3] = sk['fxr']['gold'][j]
    out[m == 3, :3] = sk['shield']
    out[m == 2, :3] = sk['visor']
    return out


def main():
    (OUT / 'masks').mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    saba = saba_cells()
    files = sorted(p for p in SRC.glob('*.png') if p.name != 'credit_panel.png'); audit = {}
    for f in files:
        rel = f.name; arr = np.array(Image.open(f).convert('RGBA'))
        if rel == 'portrait.png':   # x4 nearest-neighbour portrait: regions are measured at 1x, then scaled (a 4-px outline is not a shield)
            m = np.kron(region_mask(arr[::4, ::4], rel, saba), np.ones((4, 4), np.uint8))
        else:
            m = region_mask(arr, rel, saba)
        assert not ((m == 8) & ~isin(arr[..., :3], arr[..., 3] > 0, STRAY)).any(), ('unexpected colour outside the closed palette', rel)
        Image.fromarray(m * 30, 'L').save(OUT / 'masks' / rel)
        audit[rel] = {'regions': {REGIONS[k]: int((m == k).sum()) for k in range(1, 9) if (m == k).any()},
                      'maskSha256': hashlib.sha256(m.tobytes()).hexdigest()}
        for tag, sk in SKINS.items():
            o = paint(arr, m, sk)
            assert (o[..., 3] == arr[..., 3]).all() and o.shape == arr.shape
            for keep in (1, 7, 8): assert (o[m == keep] == arr[m == keep]).all(), ('kept region changed', keep, rel)
            dst = OUT / tag / rel; dst.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(o, 'RGBA').save(dst, optimize=True)
    (DOC / 'region_mapping.json').write_text(json.dumps({'regions': REGIONS, 'dark': DARK, 'visor': VISOR, 'clothRamp': CLOTH, 'goldRamp': GOLD,
        'shieldRule': 'DARK pixels inside a solid 3x3 DARK core, dilated 1 px within DARK', 'fxRule': 'cloth/gold blob whose 1-px rim is >=45% transparent',
        'sabaRule': f'sabaWind0 cell rect {SABA_RECT} wherever that cell is placed in a strip (kept)', 'skins': SKINS, 'files': audit}, indent=1) + '\n')
    # Contact: Default + six × idle / walk / normal / Saba / reaction / knockdown / ultimate-ready (+ portrait)
    poses = [('idle', 0), ('walk', 2), ('light', 1), ('wJ3', 1), ('heavy', 1), ('wAnswer', 3), ('hurt', 0), ('knockdown', 2), ('ultLand', 1), ('portrait', None)]
    labels = ['idle', 'walk', 'normal (J1)', 'normal (J3 kick)', 'Saba (wind-up)', "Saba's Answer", 'reaction', 'knockdown', 'ultimate-ready', 'portrait']
    rows = ['default', *SKINS]; CW, CH = 132, 128
    sheet = Image.new('RGB', (200 + CW * len(poses), 22 + CH * len(rows)), (34, 43, 54)); d = ImageDraw.Draw(sheet)
    for c, l in enumerate(labels): d.text((200 + c * CW + 4, 4), l, fill=(220, 225, 235))
    for r, tag in enumerate(rows):
        y = 22 + r * CH
        d.rectangle([200, y, 200 + CW * len(poses), y + CH - 1], fill=(34, 43, 54) if r % 2 else (58, 66, 80))
        d.text((6, y + CH // 2 - 6), 'Default' if tag == 'default' else SKINS[tag]['name'].replace('—', '-'), fill='white')
        for c, (p, fr) in enumerate(poses):
            im = Image.open((SRC if tag == 'default' else OUT / tag) / f'{p}.png').convert('RGBA')
            cell = im if fr is None else im.crop((fr * FW, 0, fr * FW + FW, im.height))
            bb = cell.getbbox(); cell = cell.crop(bb) if bb else cell
            k = max(1, min((CW - 8) // max(cell.width, 1), (CH - 8) // max(cell.height, 1)))
            cell = cell.resize((cell.width * k, cell.height * k), Image.Resampling.NEAREST)
            sheet.paste(cell, (200 + c * CW + (CW - cell.width) // 2, y + (CH - cell.height) // 2), cell)
    sheet.save(DOC / 'skins_contact.png')
    print(f'{len(SKINS)} skins x {len(files)} sheets -> {OUT}; contact {DOC / "skins_contact.png"}')


if __name__ == '__main__':
    main()
