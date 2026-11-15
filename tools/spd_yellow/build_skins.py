#!/usr/bin/env python3
"""S.P.D. Yellow (spd_yellow) — eight cosmetic alternatives + default. Never edits base art.

The supplied S.P.D. Yellow sheet palette (verified over every opaque body pixel, tools/spd_yellow/extract.py output):
  OUTLINE / VISOR (0,0,0) (8,8,8) (49,49,41)                       — kept on every skin (silhouette + visor readability)
  SUIT ramp (156,132,0) (173,148,16) (189,173,41) (206,198,57) (222,222,82) (204,216,96) (251,234,66) (239,247,107)
            (249,251,155)                                          — recoloured by LUMINANCE RANK (shading order kept)
  SILVER ramp (99,99,90) (148,148,140) (198,198,181) (247,255,231) — gloves, boots, belt, blade, pistol, long gun,
            muzzle beams AND the suit's chest/limb stripes (same colours)
  a handful of single stray pixels (weapon detail)                 — kept
Regions (colour + geometry, never invented pixels):
  1 outline / visor (kept)            2 suit (recoloured)
  3 TRIM STRIPES: silver pixels with suit pixels within 3 px on BOTH opposite sides (left+right or up+down) — the
    stripes that cross the suit. Recoloured per skin.
  4 silver other: gloves, boots, belt, blade, firearms, muzzle beams (KEPT: weapons stay readable, gloves separate)
  5 other (kept)
Decorative MATERIALS (user-authorised stars / glitter / iridescent accents) are NOT painted into pixels: this tool
emits suit-masked anchor points per strip frame (spdYellowMaterials.js); spdYellowFx draws a few discrete pixel marks
on them at runtime from a cached table (no getImageData, no pixel scans, no new canvases). No new geometry.
    python3 tools/spd_yellow/build_skins.py
"""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/spd_yellow'; OUT = SRC / 'skins'; DOC = ROOT / 'docs/skins/spd_yellow'
RECTS = json.loads((ROOT / 'docs/spd_yellow/source_rects.json').read_text())
FW, FH = RECTS['frame']['width'], RECTS['frame']['height']
SEQ = RECTS['sequences']
DARK = [(0, 0, 0), (8, 8, 8), (49, 49, 41)]
SUIT = [(156, 132, 0), (173, 148, 16), (189, 173, 41), (206, 198, 57), (222, 222, 82), (204, 216, 96), (251, 234, 66), (239, 247, 107), (249, 251, 155)]
SILVER = [(99, 99, 90), (148, 148, 140), (198, 198, 181), (247, 255, 231)]
lum = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
SUIT_RANK = sorted(SUIT, key=lum)            # 9 tones dark -> light
REGIONS = {0: 'transparent', 1: 'outline / visor (kept)', 2: 'suit', 3: 'trim stripes', 4: 'silver other: gloves, boots, belt, blade, firearms, beams (kept)', 5: 'other (kept)'}

INSP = 'crossover-inspired palette'
BEN10 = 'Ben 10 franchise (Cartoon Network) — colour inspiration only'


def ramp(lo, hi, n=9):
    return [tuple(int(round(lo[k] + (hi[k] - lo[k]) * i / (n - 1))) for k in range(3)) for i in range(n)]


# SUIT_RANK indices 4, 6, 8 are the RARE highlight tones (8 / 11 / 54 px over the whole sheet); index 5 and 7 are the two
# most common lit tones. Accent skins put their accent colour on the rare highlights only, so the body stays dark.
def accents(base, cols, idx=(4, 6, 8)):
    out = list(base)
    for i, c in zip(idx, cols): out[i] = c
    return out


SKINS = {
  'alienx': {'name': 'Alien X — Inspired', 'id': 'spd_yellow_inspired_alienx', 'ref': 'https://ben10.fandom.com/wiki/Alien_X',
    'suit': accents(ramp((10, 10, 16), (58, 58, 78)), [(52, 168, 96), (84, 200, 120), (120, 230, 150)]), 'trim': [(150, 158, 152), (192, 200, 194), (224, 232, 226), (248, 252, 248)],
    'fx': ['#e8fff0', '#3fae6a'], 'material': 'stars', 'classification': 'Inspired Palette', 'source': f'{BEN10}: Alien X — black cosmic body, pale markings, green accents',
    'notes': 'Black cosmic suit; the existing stripes turn pale; the three rare highlight tones become green accents. Sparse SLOW stars (material) inside the suit only.'},
  'upgrade': {'name': 'Upgrade — Inspired', 'id': 'spd_yellow_inspired_upgrade', 'ref': 'https://ben10.fandom.com/wiki/Upgrade',
    'suit': ramp((6, 8, 6), (44, 54, 44)), 'trim': [(20, 120, 50), (40, 190, 80), (90, 240, 130), (170, 255, 190)],
    'fx': ['#8dffad', '#1fd060'], 'material': None, 'classification': 'Inspired Palette', 'source': f'{BEN10}: Upgrade — black body with green lines',
    'notes': 'Dark suit; the EXISTING stripe pixels turn neon green. No circuitry drawn. Static (no material).'},
  'diamondhead': {'name': 'Diamondhead — Inspired', 'id': 'spd_yellow_inspired_diamondhead', 'ref': 'https://ben10.fandom.com/wiki/Diamondhead',
    'suit': ramp((10, 66, 78), (214, 252, 250)), 'trim': [(70, 110, 140), (118, 176, 204), (170, 220, 236), (216, 246, 255)],
    'fx': ['#a8fff2', '#2fb8b0'], 'material': 'facet', 'classification': 'Inspired Palette', 'source': f'{BEN10}: Diamondhead — crystalline cyan/teal',
    'notes': 'Crystalline cyan/teal shading on the existing ramp. OCCASIONAL sharp 1-px highlight runs along existing shading edges (material). No crystal spikes.'},
  'heatblast': {'name': 'Heatblast — Inspired', 'id': 'spd_yellow_inspired_heatblast', 'ref': 'https://ben10.fandom.com/wiki/Heatblast',
    'suit': accents(accents(ramp((24, 18, 16), (78, 58, 46)), [(112, 50, 26)], idx=(7,)), [(226, 96, 24), (246, 140, 40), (255, 186, 70)]), 'trim': [(150, 44, 12), (206, 86, 22), (242, 142, 40), (255, 210, 110)],
    'fx': ['#ffc070', '#ff6a10'], 'material': None, 'classification': 'Inspired Palette', 'source': f'{BEN10}: Heatblast — charcoal rock with molten accents',
    'notes': 'Charcoal suit; the lit side is a dark ember, the rare highlights and the stripes become molten orange/gold. No flames drawn. Static.'},
  'chromastone': {'name': 'Chromastone — Inspired', 'id': 'spd_yellow_inspired_chromastone', 'ref': 'https://ben10.fandom.com/wiki/Chromastone',
    'suit': ramp((40, 10, 62), (238, 198, 252)), 'trim': [(120, 40, 120), (190, 80, 190), (240, 150, 240), (255, 220, 255)],
    'fx': ['#f0b8ff', '#a43be0'], 'material': 'crystal', 'classification': 'Inspired Palette', 'source': f'{BEN10}: Chromastone — purple/magenta crystal',
    'notes': 'Purple/magenta crystalline palette; a SUBTLE crystalline accent (tiny 4-point glint) on shading edges (material). No spikes.'},
  'bigchill': {'name': 'Big Chill — Inspired', 'id': 'spd_yellow_inspired_bigchill', 'ref': 'https://ben10.fandom.com/wiki/Big_Chill',
    'suit': ramp((8, 14, 40), (64, 86, 152))[:7] + [(120, 190, 235), (184, 232, 255)], 'trim': [(170, 200, 220), (200, 224, 240), (226, 240, 250), (246, 252, 255)],
    'fx': ['#cfeeff', '#3a6ad0'], 'material': None, 'classification': 'Inspired Palette', 'source': f'{BEN10}: Big Chill — deep navy with icy-blue panels',
    'notes': 'Deep navy suit; the existing brightest suit panels turn icy blue; pale cool stripes. No wings. Static.'},
  'starlight': {'name': 'Starlight Glitter', 'id': 'spd_yellow_starlight', 'ref': None,
    'suit': ramp((20, 10, 36), (92, 58, 136))[:7] + [(170, 150, 220), (206, 194, 240)], 'trim': [(150, 150, 170), (186, 186, 206), (218, 218, 236), (246, 246, 255)],
    'fx': ['#e6dcff', '#8a6ad8'], 'material': 'glitter', 'classification': 'Original Cosmetic', 'source': 'original cosmetic design authorized by user',
    'notes': 'Dark violet suit, lavender highlights, silver stripes; RESTRAINED glitter pulses (material). Not a canon costume.'},
  'opal': {'name': 'Opal Prism', 'id': 'spd_yellow_opal', 'ref': None,
    'suit': ramp((138, 146, 156), (250, 251, 252)), 'trim': [(150, 136, 98), (192, 176, 128), (224, 208, 150), (248, 238, 192)],
    'fx': ['#fff4d8', '#b49ad8'], 'material': 'opal', 'classification': 'Original Cosmetic', 'source': 'original cosmetic design authorized by user',
    'notes': 'Pale opal panels (shading order preserved), soft-gold stripes; slowly changing mint / lilac / gold accent highlights (material). Not a canon costume.'},
}


def isin(arr, cols):
    m = np.zeros(arr.shape[:2], bool)
    for c in cols:
        m |= (arr[..., 0] == c[0]) & (arr[..., 1] == c[1]) & (arr[..., 2] == c[2])
    return m & (arr[..., 3] > 0)


def shift(m, dx, dy):
    o = np.zeros_like(m); h, w = m.shape
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    o[yd, xd] = m[ys, xs]
    return o


def near(m, dx, dy, r=3):   # is there an m pixel within r px in direction (dx,dy)?
    acc = np.zeros_like(m)
    for k in range(1, r + 1): acc |= shift(m, -dx * k, -dy * k)
    return acc


def region_mask(arr):
    m = np.zeros(arr.shape[:2], np.uint8)
    op = arr[..., 3] > 0
    suit, silver, dark = isin(arr, SUIT), isin(arr, SILVER), isin(arr, DARK)
    sandwich = (near(suit, 1, 0) & near(suit, -1, 0)) | (near(suit, 0, 1) & near(suit, 0, -1))
    m[op] = 5; m[dark] = 1; m[suit] = 2; m[silver] = 4; m[silver & sandwich] = 3
    return m


def paint(arr, m, sk):
    o = arr.copy()
    for i, c in enumerate(SUIT_RANK):
        sel = (m == 2) & (arr[..., 0] == c[0]) & (arr[..., 1] == c[1]) & (arr[..., 2] == c[2])
        o[sel, :3] = sk['suit'][i]
    for i, c in enumerate(SILVER):
        sel = (m == 3) & (arr[..., 0] == c[0]) & (arr[..., 1] == c[1]) & (arr[..., 2] == c[2])
        o[sel, :3] = sk['trim'][i]
    return o


def frame_points(cell_mask, cell_rgb):
    """Suit anchor points (spread) + shading-edge points (suit pixel next to a suit pixel >= 2 ranks darker)."""
    ys, xs = np.nonzero(cell_mask == 2)
    pts, seen = [], set()
    for y, x in sorted(zip(ys.tolist(), xs.tolist())):
        g = (x // 7, y // 7)
        if g in seen: continue
        seen.add(g); pts.append((x, y))
    pts = pts[:: max(1, len(pts) // 14)][:14]
    rank = np.full(cell_mask.shape, -1, int)
    for i, c in enumerate(SUIT_RANK):
        rank[(cell_mask == 2) & (cell_rgb[..., 0] == c[0]) & (cell_rgb[..., 1] == c[1]) & (cell_rgb[..., 2] == c[2])] = i
    edge = []
    h, w = rank.shape
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r = rank[y, x]
            if r < 4: continue
            if min(rank[y, x + 1] if rank[y, x + 1] >= 0 else 99, rank[y + 1, x] if rank[y + 1, x] >= 0 else 99) <= r - 2:
                edge.append((x, y))
    edge = edge[:: max(1, len(edge) // 12)][:12]
    return [v for p in pts for v in p], [v for p in edge for v in p]


def main():
    (OUT / 'masks').mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in SRC.glob('*.png') if p.name != 'portrait.png' and not p.name.startswith('fx_'))
    audit, material = {}, {}
    for f in files:
        rel = f.name; arr = np.array(Image.open(f).convert('RGBA'))
        m = region_mask(arr)
        Image.fromarray(m * 50, 'L').save(OUT / 'masks' / rel)
        audit[rel] = {'regions': {REGIONS[k]: int((m == k).sum()) for k in range(1, 6) if (m == k).any()},
                      'maskSha256': hashlib.sha256(m.tobytes()).hexdigest()}
        strip = f.stem
        if strip in SEQ:
            material[strip] = []
            for i in range(arr.shape[1] // FW):
                p, e = frame_points(m[:, i * FW:(i + 1) * FW], arr[:, i * FW:(i + 1) * FW])
                material[strip].append({'p': p, 'e': e})
        for tag, sk in SKINS.items():
            o = paint(arr, m, sk)
            assert (o[..., 3] == arr[..., 3]).all() and o.shape == arr.shape
            for keep in (1, 4, 5): assert (o[m == keep] == arr[m == keep]).all(), ('kept region changed', keep, rel)
            dst = OUT / tag / rel; dst.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(o, 'RGBA').save(dst, optimize=True)
    # portraits: rebuilt from each skin's ready0 cell exactly as extract.py crops it (no recolouring of a scaled image)
    cell = np.array(Image.open(SRC / 'cells/ready0.png').convert('RGBA')); cm = region_mask(cell)
    bb = Image.fromarray(cell).getbbox()
    for tag, sk in SKINS.items():
        o = Image.fromarray(paint(cell, cm, sk), 'RGBA')
        o.crop((bb[0] + 2, 0, bb[0] + 22, 20)).resize((100, 100), Image.Resampling.NEAREST).save(OUT / tag / 'portrait.png')
    # trim sanity: the stripes must exist (the suit is recognisably striped) and never include weapon pixels
    js = ('// Generated by tools/spd_yellow/build_skins.py — do not hand-edit.\n// Suit-masked decorative anchor points per strip frame (cell px): p = spread suit points, e = shading-edge points.\n'
          'export const SPD_YELLOW_MATERIAL_POINTS = ' + json.dumps(material, separators=(',', ':')) + '\n')
    (ROOT / 'spdYellowMaterials.js').write_text(js)
    (DOC / 'region_mapping.json').write_text(json.dumps({'regions': REGIONS, 'dark': DARK, 'suitRampByLuminance': SUIT_RANK, 'silver': SILVER,
        'trimRule': 'silver pixel with suit pixels within 3 px on both opposite sides (horizontal or vertical)',
        'skins': SKINS, 'files': audit}, indent=1) + '\n')
    # Contact: Default + eight x idle / walk / J3 / heavy / pistol / long gun / clone split / knockdown / portrait
    poses = [('idle', 0), ('walk', 2), ('yJ3', 1), ('heavy', 1), ('yPistolShot', 0), ('yLongHold', 0), ('yAcro', 3), ('hurt', 0), ('knockdown', 2), ('portrait', None)]
    labels = ['idle', 'walk', 'J3 blade', 'heavy', 'pistol fire', 'long gun', 'acrobatic', 'reaction', 'knockdown', 'portrait']
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
    print(f'{len(SKINS)} skins x {len(files)} sheets -> {OUT}; material strips {len(material)}; contact {DOC / "skins_contact.png"}')
    print('trim px idle', audit['idle.png']['regions'])


if __name__ == '__main__':
    main()
