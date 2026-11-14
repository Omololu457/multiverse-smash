#!/usr/bin/env python3
"""Pink Ranger (mmpr_pink) — six Crossover Inspired Palettes (cosmetic). Never edits base art.

The Genesis Pink sheet is a CLOSED palette over every opaque animation pixel (verified, docs/mmpr_pink/SPRITE_LEDGER.md):
  OUTLINE  (32,0,32) (32,32,32) (0,0,32)               — outline / seams (kept for every skin; (0,0,32) is one stray px)
  VISOR    (0,0,0)                                     — the helmet visor
  CLOTH    (128,64,64) (224,64,160) (224,160,160)       — pink helmet shell + suit cloth, dark → light
  LIGHT    (96,96,96) (160,160,160) (224,224,224)       — white diamonds / trim, gloves, boots, belt, the bow, kick trails
  ARROW    (192,192,0)                                 — the supplied yellow arrow (its shaft also uses the LIGHT ramp)
Regions (colour + geometry, never invented pixels):
  1 outline (kept) · 2 visor · 3 helmet (cloth within 9 px of the visor centroid; mapped with the cloth ramp so rolls
  never flicker) · 4 cloth · 5 trim (LIGHT attached to the body: diamonds, gloves, boots, belt) · 6 FX (LIGHT blobs whose
  1-px rim is >=45 % transparent: the supplied crescent / hand trails) · 7 bow (LIGHT pixels in the bow strips farther
  than 3 px from any cloth/outline-pink pixel: the limbs and string) · 9 arrow (every opaque pixel of arrow.png).
LIMITS (documented, not hidden): gloves, boots, belt and the chest diamonds share ONE 3-step light ramp, so they are
recoloured together as "trim" (a geometric split would flicker on rotations / reversed poses). Each skin is a finite colour
map; alpha, size, pivots, outlines and frame order are untouched; nearest-neighbour; precomputed PNGs only.
The Thunder Megazord is never recoloured (shared art). Hit sparks stay neutral.
    python3 tools/mmpr_pink/build_skins.py
"""
from pathlib import Path
import json, hashlib
import numpy as np
import scipy.ndimage as nd
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/mmpr_pink'; OUT = SRC / 'skins'; DOC = ROOT / 'docs/skins/mmpr_pink'
OUTLINE = [(32, 0, 32), (32, 32, 32), (0, 0, 32)]; VISOR = [(0, 0, 0)]
CLOTH = [(128, 64, 64), (224, 64, 160), (224, 160, 160)]
LIGHT = [(96, 96, 96), (160, 160, 160), (224, 224, 224)]
ARROW = [(192, 192, 0)]
BOW_STRIPS = {'bow.png', 'ultOpen.png', 'win.png', 'intro.png'}
REGIONS = {0: 'transparent', 1: 'outline / seams (kept)', 2: 'visor', 3: 'helmet shell (cloth ramp near the visor)', 4: 'pink cloth (suit)',
           5: 'trim: white diamonds, gloves, boots, belt (one shared light ramp)', 6: 'FX: supplied kick / hand trails', 7: 'Power Bow (limbs + string)',
           8: 'other (none expected)', 9: 'arrow (supplied yellow arrow)'}
BEN10 = 'Ben 10 franchise (Cartoon Network) — alien colour scheme only'
SKINS = {
  'alienx': {'name': 'Alien X — Inspired', 'id': 'mmprPinkAlienX', 'ref': 'https://ben10.fandom.com/wiki/Alien_X',
    'cloth': [(8, 9, 11), (24, 26, 30), (70, 150, 92)], 'trim': [(150, 156, 160), (206, 212, 214), (246, 250, 250)], 'visor': (0, 0, 0),
    'bow': [(60, 130, 80), (150, 220, 170), (226, 255, 234)], 'fxr': [(120, 200, 140), (186, 240, 204), (236, 255, 242)], 'arrow': (110, 236, 140),
    'source': f'{BEN10}: Alien X (Celestialsapien) — black body, white markings, green accents',
    'notes': 'Charcoal/black cloth, pale existing trim, green only on the top cloth highlight, bow and trails. The project\'s existing Alien X starfield overlay (ids ending "AlienX") draws on top; no stars painted into pixels.'},
  'upgrade': {'name': 'Upgrade — Inspired', 'id': 'mmpr_pink_inspired_upgrade', 'ref': 'https://ben10.fandom.com/wiki/Upgrade',
    'cloth': [(5, 7, 5), (14, 20, 14), (32, 42, 32)], 'trim': [(16, 120, 48), (36, 186, 76), (150, 255, 170)], 'visor': (60, 224, 96),
    'bow': [(16, 120, 48), (36, 186, 76), (150, 255, 170)], 'fxr': [(40, 170, 80), (90, 226, 120), (186, 255, 200)], 'arrow': (60, 255, 110),
    'source': f'{BEN10}: Upgrade (Galvanic Mechamorph) — black body with green lines and a green eye',
    'notes': 'Dark body; the existing trim, visor, bow and arrow turn vivid green (Alien X keeps pale trim, so the two dark skins stay distinct). No circuitry pattern.'},
  'diamondhead': {'name': 'Diamondhead — Inspired', 'id': 'mmpr_pink_inspired_diamondhead', 'ref': 'https://ben10.fandom.com/wiki/Diamondhead',
    'cloth': [(16, 86, 98), (48, 170, 178), (170, 240, 236)], 'trim': [(84, 110, 130), (170, 200, 214), (226, 244, 250)], 'visor': (8, 22, 30),
    'bow': [(60, 120, 140), (150, 214, 226), (226, 250, 255)], 'fxr': [(120, 210, 220), (180, 240, 244), (230, 255, 255)], 'arrow': (150, 255, 246),
    'source': f'{BEN10}: Diamondhead (Petrosapien) — teal crystal body',
    'notes': 'Cyan/teal cloth with pale cool highlights; trim becomes cool pale blue-grey. No crystal shards or facets.'},
  'heatblast': {'name': 'Heatblast — Inspired', 'id': 'mmpr_pink_inspired_heatblast', 'ref': 'https://ben10.fandom.com/wiki/Heatblast',
    'cloth': [(26, 20, 18), (52, 38, 30), (96, 62, 40)], 'trim': [(170, 40, 10), (236, 110, 24), (255, 206, 84)], 'visor': (60, 10, 4),
    'bow': [(170, 40, 10), (236, 110, 24), (255, 206, 84)], 'fxr': [(220, 90, 30), (255, 150, 60), (255, 230, 150)], 'arrow': (255, 170, 40),
    'source': f'{BEN10}: Heatblast (Pyronite) — charcoal rock with orange / yellow fire',
    'notes': 'Volcanic dark cloth; orange/red/gold on the existing trim, bow and trails. No flames or rock texture.'},
  'chromastone': {'name': 'Chromastone — Inspired', 'id': 'mmpr_pink_inspired_chromastone', 'ref': 'https://ben10.fandom.com/wiki/Chromastone',
    'cloth': [(58, 18, 108), (128, 44, 196), (204, 140, 240)], 'trim': [(120, 112, 150), (198, 188, 230), (246, 240, 255)], 'visor': (20, 4, 30),
    'bow': [(120, 112, 150), (198, 188, 230), (246, 240, 255)], 'fxr': [(190, 120, 240), (220, 170, 255), (250, 232, 255)], 'arrow': (236, 120, 255),
    'source': f'{BEN10}: Chromastone (Crystalsapien) — purple/violet crystal body with magenta accents',
    'notes': 'Purple-to-magenta cloth with contrasting pale lavender trim. No crystal protrusions or prism FX.'},
  'ghostfreak': {'name': 'Ghostfreak — Inspired', 'id': 'mmpr_pink_inspired_ghostfreak', 'ref': 'https://ben10.fandom.com/wiki/Ghostfreak',
    'cloth': [(180, 180, 192), (222, 222, 230), (246, 246, 250)], 'trim': [(24, 20, 30), (46, 40, 54), (84, 76, 96)], 'visor': (76, 26, 100),
    'bow': [(46, 40, 54), (84, 76, 96), (140, 128, 160)], 'fxr': [(170, 160, 200), (200, 192, 222), (244, 240, 255)], 'arrow': (176, 120, 230),
    'source': f'{BEN10}: Ghostfreak (Ectonurite) — pale grey-white body, dark lines, purple eye',
    'notes': 'Pale spectral cloth; the existing trim becomes dark seams, violet visor. Outlines kept. No tentacles, no transparency effect.'},
}


def isin(rgb, al, cols): return al & np.any([(rgb == c).all(-1) for c in cols], axis=0)


def region_mask(arr, name, cell_w=176):
    rgb = arr[..., :3]; al = arr[..., 3] > 0
    m = np.where(al, 8, 0).astype(np.uint8)
    if name == 'arrow.png':
        m[al] = 9; return m
    m[isin(rgb, al, OUTLINE)] = 1
    vis = isin(rgb, al, VISOR); m[vis] = 2
    cloth = isin(rgb, al, CLOTH); m[cloth] = 4
    m[isin(rgb, al, ARROW)] = 9
    H, W = m.shape
    for x0 in range(0, W, cell_w):
        ys, xs = np.where(vis[:, x0:x0 + cell_w])
        if len(ys) < 3: continue
        cy, cx = ys.mean(), xs.mean() + x0
        yy, xx = np.mgrid[0:H, x0:min(W, x0 + cell_w)]
        near = (yy - cy) ** 2 + (xx - cx) ** 2 <= 9 ** 2
        sub = m[:, x0:x0 + cell_w]; sub[near & cloth[:, x0:x0 + cell_w]] = 3
    light = isin(rgb, al, LIGHT)
    lab, n = nd.label(light, structure=np.ones((3, 3)))
    for i, sl in enumerate(nd.find_objects(lab), start=1):
        if sl is None: continue
        y0, y1 = max(sl[0].start - 1, 0), sl[0].stop + 1; x0, x1 = max(sl[1].start - 1, 0), sl[1].stop + 1
        b = lab[y0:y1, x0:x1] == i
        pad = np.pad(b, 1); ring = nd.binary_dilation(pad, np.ones((3, 3))) & ~pad
        tr = (~np.pad(al[y0:y1, x0:x1], 1, constant_values=False))[ring].mean() if ring.sum() else 1
        m[y0:y1, x0:x1][b] = 6 if tr >= 0.45 else 5
    if name in BOW_STRIPS:   # bow: light pixels away from the body (cloth / pink outline dilated by 3 px)
        body = nd.binary_dilation(cloth | isin(rgb, al, [(32, 0, 32)]), np.ones((7, 7)))
        m[light & ~body] = 7
    return m


def paint(arr, m, sk):
    out = arr.copy(); rgb = arr[..., :3]
    for i, c in enumerate(CLOTH):
        out[((m == 4) | (m == 3)) & (rgb == c).all(-1), :3] = sk['cloth'][i]
    for j, c in enumerate(LIGHT):
        out[(m == 5) & (rgb == c).all(-1), :3] = sk['trim'][j]
        out[(m == 6) & (rgb == c).all(-1), :3] = sk['fxr'][j]
        out[(m == 7) & (rgb == c).all(-1), :3] = sk['bow'][j]
    out[m == 2, :3] = sk['visor']
    # arrow: the yellow head/fletching takes the skin accent; its light shaft follows the bow ramp
    ya = (m == 9) & (rgb == ARROW[0]).all(-1); out[ya, :3] = sk['arrow']
    for j, c in enumerate(LIGHT):
        out[(m == 9) & (rgb == c).all(-1), :3] = sk['bow'][j]
    return out


def main():
    (OUT / 'masks').mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in SRC.glob('*.png') if p.name != 'credit_panel.png'); audit = {}
    for f in files:
        rel = f.name; arr = np.array(Image.open(f).convert('RGBA'))
        m = region_mask(arr, rel, 176 if rel not in ('portrait.png', 'arrow.png') else 10 ** 6)
        assert not (m == 8).any(), ('unexpected colour outside the closed palette', rel, {tuple(c) for c in arr[m == 8][:, :3]})
        Image.fromarray((m * 28).astype(np.uint8), 'L').save(OUT / 'masks' / rel)
        audit[rel] = {'regions': {REGIONS[k]: int((m == k).sum()) for k in range(1, 10) if (m == k).any()},
                      'maskSha256': hashlib.sha256(m.tobytes()).hexdigest()}
        for tag, sk in SKINS.items():
            o = paint(arr, m, sk)
            assert (o[..., 3] == arr[..., 3]).all() and o.shape == arr.shape
            assert (o[m == 1] == arr[m == 1]).all(), 'outline changed'
            dst = OUT / tag / rel; dst.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(o, 'RGBA').save(dst, optimize=True)
    (DOC / 'region_mapping.json').write_text(json.dumps({'regions': REGIONS, 'outline': OUTLINE, 'visor': VISOR, 'clothRamp': CLOTH,
        'lightRamp': LIGHT, 'arrow': ARROW, 'fxRule': 'light blob whose 1-px rim is >=45% transparent',
        'helmetRule': 'cloth pixels within 9 px of the visor centroid, per strip cell', 'bowRule': 'light pixels in the bow strips farther than 3 px from cloth / pink outline',
        'classification': 'Crossover Inspired Palette', 'skins': SKINS, 'files': audit}, indent=1) + '\n')
    # Contact: Default + six skins x idle / walk / normal / bow / reaction / knockdown / ultimate (+ arrow, portrait)
    poses = [('idle', 0), ('walk', 2), ('heavy', 1), ('bow', 2), ('bow', 3), ('pCrane', 0), ('hurt', 0), ('knockdown', 2), ('ultKick', 1), ('arrow', None), ('portrait', None)]
    labels = ['idle', 'walk', 'normal (Heavy)', 'bow (aim)', 'bow (release)', 'acrobatic (Crane)', 'reaction', 'knockdown', 'ultimate (kick)', 'arrow', 'portrait']
    rows = ['default', *SKINS]; CW, CH = 128, 128
    sheet = Image.new('RGB', (190 + CW * len(poses), 22 + CH * len(rows)), (34, 43, 54)); d = ImageDraw.Draw(sheet)
    for c, l in enumerate(labels): d.text((190 + c * CW + 4, 4), l, fill=(220, 225, 235))
    for r, tag in enumerate(rows):
        y = 22 + r * CH
        d.rectangle([190, y, 190 + CW * len(poses), y + CH - 1], fill=(34, 43, 54) if r % 2 else (58, 66, 80))
        d.text((6, y + CH // 2 - 6), 'Default' if tag == 'default' else SKINS[tag]['name'].replace('—', '-'), fill='white')
        for c, (p, fr) in enumerate(poses):
            im = Image.open((SRC if tag == 'default' else OUT / tag) / f'{p}.png').convert('RGBA')
            cell = im if fr is None else im.crop((fr * 176, 0, fr * 176 + 176, im.height))
            bb = cell.getbbox(); cell = cell.crop(bb) if bb else cell
            k = max(1, min((CW - 8) // max(cell.width, 1), (CH - 8) // max(cell.height, 1)))
            cell = cell.resize((cell.width * k, cell.height * k), Image.Resampling.NEAREST)
            sheet.paste(cell, (190 + c * CW + (CW - cell.width) // 2, y + (CH - cell.height) // 2), cell)
    sheet.save(DOC / 'skins_contact.png')
    print(f'{len(SKINS)} skins x {len(files)} sheets -> {OUT}; contact {DOC / "skins_contact.png"}')


if __name__ == '__main__':
    main()
