#!/usr/bin/env python3
"""Black Ranger (mmpr_black) — six crossover-INSPIRED palettes (cosmetic). Never edits base art.

The Genesis Black sheet is a CLOSED 8-colour palette (verified over every opaque pixel, docs/mmpr_black/SPRITE_LEDGER.md):
  OUTLINE (32,32,0)                       — sprite outline / seams (kept for every skin)
  VISOR   (0,0,0)                         — the helmet visor
  SUIT    (32,32,32) (64,64,64) (96,96,96) (128,128,128) — helmet shell + body cloth, dark→light
  LIGHT   (160,160,160) (224,224,224)     — diamonds/chest trim, gloves, boots, belt … AND the supplied kick trails
Regions are therefore found by COLOUR + GEOMETRY, never by inventing pixels:
  1 outline (kept) · 2 visor · 3 helmet (suit-ramp pixels within 11 px of the visor centroid, upright frames)
  4 suit (remaining suit ramp) · 5 trim (light ramp attached to the body: diamonds / gloves / boots / belt)
  6 FX (light blobs whose 1-px rim is >=45 % transparent: the detached/outlined-free crescent trails)
  7 weapon (the axe head in axe1/axe3 — those cells are not in any strip, so no strip pixel is ever region 7)
LIMITS (documented, not hidden): gloves, boots, belt and the chest diamonds share ONE 2-step light ramp in the source,
so they are recoloured together as "trim". Rolls / back views hide the visor, so a helmet-only colour would flicker;
every palette therefore keeps the helmet on the suit ramp (region 3 is mapped with the suit ramp) and only the visor
changes. Each skin is a finite colour map; alpha, size, pivots, outlines and action shapes are untouched;
nearest-neighbour only; precomputed once into PNGs (no runtime recolouring, no shared-canvas mutation).
The Falconzord is never recoloured (shared art); only owner-specific call markers take the skin's FX colours.
    python3 tools/mmpr_black/build_skins.py
"""
from pathlib import Path
import json, hashlib
import numpy as np
import scipy.ndimage as nd
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/mmpr_black'; OUT = SRC / 'skins'; DOC = ROOT / 'docs/skins/mmpr_black'
OUTLINE = [(32, 32, 0)]; VISOR = [(0, 0, 0)]
SUIT = [(32, 32, 32), (64, 64, 64), (96, 96, 96), (128, 128, 128)]
LIGHT = [(160, 160, 160), (224, 224, 224)]
REGIONS = {0: 'transparent', 1: 'outline / seams (kept)', 2: 'visor', 3: 'helmet shell (suit ramp near the visor)', 4: 'suit (body cloth)',
           5: 'trim: chest diamonds, gloves, boots, belt (one shared light ramp)', 6: 'FX: supplied kick/strike trails', 7: 'weapon: Power Axe head (unused cells only)', 8: 'other (none expected)'}
BEN10 = 'Ben 10 franchise (Cartoon Network) — alien colour scheme only'
SKINS = {
  'alienx': {'name': 'Alien X — Inspired', 'id': 'mmprBlackAlienX', 'ref': 'https://ben10.fandom.com/wiki/Alien_X',
    'suit': [(6, 7, 9), (14, 16, 19), (26, 29, 33), (52, 92, 64)], 'trim': [(200, 206, 208), (244, 248, 248)], 'visor': (0, 0, 0),
    'fxr': [(176, 236, 196), (236, 255, 242)], 'fx': ('#d8ffe4', '#3fae6a'),
    'source': f'{BEN10}: Alien X (Celestialsapien) — black body, white markings, green accents',
    'notes': 'Deep charcoal/black suit, pale existing trim, green only on the top suit highlight. The project\'s existing Alien X starfield overlay (game.js, ids ending "AlienX") draws on top; no stars painted into pixels.'},
  'upgrade': {'name': 'Upgrade — Inspired', 'id': 'mmpr_black_inspired_upgrade', 'ref': 'https://ben10.fandom.com/wiki/Upgrade',
    'suit': [(4, 6, 4), (10, 14, 10), (18, 24, 18), (30, 38, 30)], 'trim': [(36, 186, 76), (150, 255, 170)], 'visor': (60, 224, 96),
    'fxr': [(80, 226, 116), (186, 255, 200)], 'fx': ('#8dffad', '#1fd060'),
    'source': f'{BEN10}: Upgrade (Galvanic Mechamorph) — black body with green lines and a green eye',
    'notes': 'Dark body; the EXISTING trim, visor and trail pixels turn vivid green (Alien X keeps pale trim, so the two dark skins stay distinct). No circuitry pattern.'},
  'diamondhead': {'name': 'Diamondhead — Inspired', 'id': 'mmpr_black_inspired_diamondhead', 'ref': 'https://ben10.fandom.com/wiki/Diamondhead',
    'suit': [(10, 58, 72), (26, 110, 122), (70, 178, 184), (186, 242, 238)], 'trim': [(28, 46, 64), (66, 94, 116)], 'visor': (8, 22, 30),
    'fxr': [(150, 238, 238), (226, 255, 255)], 'fx': ('#a8fff2', '#2fb8b0'),
    'source': f'{BEN10}: Diamondhead (Petrosapien) — teal crystal body',
    'notes': 'Cyan/teal body with pale highlights; the existing trim becomes cool dark blue. No crystal shards or facets.'},
  'heatblast': {'name': 'Heatblast — Inspired', 'id': 'mmpr_black_inspired_heatblast', 'ref': 'https://ben10.fandom.com/wiki/Heatblast',
    'suit': [(22, 18, 16), (40, 32, 28), (60, 46, 38), (88, 64, 48)], 'trim': [(226, 92, 22), (255, 204, 84)], 'visor': (60, 10, 4),
    'fxr': [(255, 150, 60), (255, 230, 150)], 'fx': ('#ffc070', '#ff6a10'),
    'source': f'{BEN10}: Heatblast (Pyronite) — charcoal rock with orange / yellow fire',
    'notes': 'Volcanic charcoal suit; orange/red/gold on the existing trim and trails. No flames or rock texture.'},
  'chromastone': {'name': 'Chromastone — Inspired', 'id': 'mmpr_black_inspired_chromastone', 'ref': 'https://ben10.fandom.com/wiki/Chromastone',
    'suit': [(40, 12, 66), (76, 22, 118), (124, 40, 170), (198, 82, 212)], 'trim': [(198, 188, 230), (246, 240, 255)], 'visor': (20, 4, 30),
    'fxr': [(220, 150, 255), (250, 232, 255)], 'fx': ('#f0b8ff', '#a43be0'),
    'source': f'{BEN10}: Chromastone (Crystalsapien) — purple/violet crystal body with magenta accents',
    'notes': 'Purple-to-magenta suit with contrasting pale lavender trim. No crystal protrusions or prism FX.'},
  'ghostfreak': {'name': 'Ghostfreak — Inspired', 'id': 'mmpr_black_inspired_ghostfreak', 'ref': 'https://ben10.fandom.com/wiki/Ghostfreak',
    'suit': [(150, 150, 160), (188, 188, 198), (220, 220, 228), (246, 246, 250)], 'trim': [(38, 34, 44), (76, 70, 86)], 'visor': (76, 26, 100),
    'fxr': [(200, 192, 222), (244, 240, 255)], 'fx': ('#e6e0ff', '#6b4a8c'),
    'source': f'{BEN10}: Ghostfreak (Ectonurite) — pale grey-white body, dark lines, purple eye',
    'notes': 'Pale spectral suit; the existing trim turns into dark seams, violet visor. Outlines kept. No tentacles, no transparency effect.'},
}


def isin(rgb, al, cols): return al & np.any([(rgb == c).all(-1) for c in cols], axis=0)


def region_mask(arr, cell_w=176):
    rgb = arr[..., :3]; al = arr[..., 3] > 0
    m = np.where(al, 8, 0).astype(np.uint8)
    m[isin(rgb, al, OUTLINE)] = 1
    vis = isin(rgb, al, VISOR); m[vis] = 2
    suit = isin(rgb, al, SUIT); m[suit] = 4
    # helmet: suit pixels within 11 px of the visor centroid of THAT strip cell (per frame, never across frames)
    H, W = m.shape
    for x0 in range(0, W, cell_w):
        ys, xs = np.where(vis[:, x0:x0 + cell_w])
        if len(ys) < 4: continue
        cy, cx = ys.mean(), xs.mean() + x0
        yy, xx = np.mgrid[0:H, x0:min(W, x0 + cell_w)]
        near = (yy - cy) ** 2 + (xx - cx) ** 2 <= 11 ** 2
        sub = m[:, x0:x0 + cell_w]; sub[near & suit[:, x0:x0 + cell_w]] = 3
    light = isin(rgb, al, LIGHT)
    lab, n = nd.label(light, structure=np.ones((3, 3)))
    for i, sl in enumerate(nd.find_objects(lab), start=1):
        if sl is None: continue
        y0, y1 = max(sl[0].start - 1, 0), sl[0].stop + 1; x0, x1 = max(sl[1].start - 1, 0), sl[1].stop + 1
        b = lab[y0:y1, x0:x1] == i
        pad = np.pad(b, 1); ring = nd.binary_dilation(pad, np.ones((3, 3))) & ~pad
        tr = (~np.pad(al[y0:y1, x0:x1], 1, constant_values=False))[ring].mean() if ring.sum() else 1
        m[y0:y1, x0:x1][b] = 6 if tr >= 0.45 else 5
    return m


def paint(arr, m, sk):
    out = arr.copy(); rgb = arr[..., :3]
    for i, c in enumerate(SUIT):
        out[((m == 4) | (m == 3)) & (rgb == c).all(-1), :3] = sk['suit'][i]
    for j, c in enumerate(LIGHT):
        out[(m == 5) & (rgb == c).all(-1), :3] = sk['trim'][j]
        out[(m == 6) & (rgb == c).all(-1), :3] = sk['fxr'][j]
    out[m == 2, :3] = sk['visor']
    return out


def main():
    (OUT / 'masks').mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in SRC.glob('*.png') if p.name != 'credit_panel.png'); audit = {}
    for f in files:
        rel = f.name; arr = np.array(Image.open(f).convert('RGBA'))
        m = region_mask(arr, 176 if rel != 'portrait.png' else 10 ** 6)
        assert not (m == 8).any(), ('unexpected colour outside the closed palette', rel)
        Image.fromarray(m * 30, 'L').save(OUT / 'masks' / rel)
        audit[rel] = {'regions': {REGIONS[k]: int((m == k).sum()) for k in range(1, 9) if (m == k).any()},
                      'maskSha256': hashlib.sha256(m.tobytes()).hexdigest()}
        for tag, sk in SKINS.items():
            o = paint(arr, m, sk)
            assert (o[..., 3] == arr[..., 3]).all() and o.shape == arr.shape
            assert (o[m == 1] == arr[m == 1]).all(), 'outline changed'
            dst = OUT / tag / rel; dst.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(o, 'RGBA').save(dst, optimize=True)
    (DOC / 'region_mapping.json').write_text(json.dumps({'regions': REGIONS, 'outline': OUTLINE, 'visor': VISOR, 'suitRamp': SUIT,
        'lightRamp': LIGHT, 'fxRule': 'light blob whose 1-px rim is >=45% transparent', 'helmetRule': 'suit pixels within 11 px of the visor centroid, per strip cell',
        'skins': SKINS, 'files': audit}, indent=1) + '\n')
    # Contact: Default + six skins x idle / walk / normal / special / reaction / knockdown / ultimate (+ blink ghost, portrait)
    poses = [('idle', 0), ('walk', 2), ('heavy', 1), ('bCrescent', 3), ('bRising', 2), ('hurt', 0), ('knockdown', 2), ('ultRise', 1), ('ultLand', 1), ('portrait', None)]
    labels = ['idle', 'walk', 'normal (Heavy)', 'special (Crescent)', 'special (Rising)', 'reaction', 'knockdown', 'ultimate (rise)', 'ultimate (gesture)', 'portrait']
    rows = ['default', *SKINS]; CW, CH = 132, 128
    sheet = Image.new('RGB', (200 + CW * len(poses), 22 + CH * len(rows)), (34, 43, 54)); d = ImageDraw.Draw(sheet)
    for c, l in enumerate(labels): d.text((200 + c * CW + 4, 4), l, fill=(220, 225, 235))
    for r, tag in enumerate(rows):
        y = 22 + r * CH
        d.rectangle([200, y, 200 + CW * len(poses), y + CH - 1], fill=(34, 43, 54) if r % 2 else (58, 66, 80))
        d.text((6, y + CH // 2 - 6), 'Default' if tag == 'default' else SKINS[tag]['name'].replace('—', '-'), fill='white')
        for c, (p, fr) in enumerate(poses):
            im = Image.open((SRC if tag == 'default' else OUT / tag) / f'{p}.png').convert('RGBA')
            cell = im if fr is None else im.crop((fr * 176, 0, fr * 176 + 176, im.height))
            bb = cell.getbbox(); cell = cell.crop(bb) if bb else cell
            k = max(1, min((CW - 8) // max(cell.width, 1), (CH - 8) // max(cell.height, 1)))
            cell = cell.resize((cell.width * k, cell.height * k), Image.Resampling.NEAREST)
            sheet.paste(cell, (200 + c * CW + (CW - cell.width) // 2, y + (CH - cell.height) // 2), cell)
    sheet.save(DOC / 'skins_contact.png')
    print(f'{len(SKINS)} skins x {len(files)} sheets -> {OUT}; contact {DOC / "skins_contact.png"}')


if __name__ == '__main__':
    main()
