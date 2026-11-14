#!/usr/bin/env python3
"""S.P.D. Green Ranger (Bridge Carson) sprite extraction.

Read-only source. The fighter is GREEN and the sheet background is green:
  * outer sheet background RGB(57,182,52) ALSO occurs inside the body as suit shading
    (verified: kneel/leg pixels in cells at y776 and y583), so it is NEVER keyed;
  * only the exact frame-cell fill RGB(128,255,123) is removed, and only inside a
    verified cell rectangle. No tolerance, no hue keying, nearest-neighbour only.
Cell rectangles are detected as connected non-outer regions, then asserted against
the expected band layout so a changed source fails loudly.

Usage: python3 tools/spd_green/extract.py
"""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/spd_green'
OUT = ROOT / 'assets/spd_green'
SRC = ROOT / 'Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Power Rangers - Green Ranger.png'
SHA = 'cd3c4810f442a86c73846a35ded127e4e17dd6637f4771009576ae034d4dee60'
OUTER = (57, 182, 52)
CELL = (128, 255, 123)
FW, FH, OX, OY = 144, 96, 64, 84      # strip frame + origin: same vocabulary as SPD Blue

# (name, band y, kind, anchorX) — names describe the observed pose, not a certified game action.
# anchorX = body centre-of-stance in cell pixels (measured on the enlarged contact sheet);
# None → cell centre. anchorY is always the cell floor line (cell bottom).
LAYOUT = [
    ('ready', 8, 'body', [16, 16]),
    ('run', 72, 'body', [24] * 8),
    ('crouchReady', 136, 'body', [16]),
    ('jump', 200, 'body', [18, 18]),
    ('guard', 272, 'body', [16]),
    ('fall', 328, 'body', [28, 26, 28, 26, 26]),
    ('ground', 384, 'body', [26, 26, 26]),
    ('kick', 448, 'body', [20, 20, 18]),
    ('strike', 512, 'body', [20, 20]),
    ('acro', 583, 'body', [24, 26, 24, 30, 28]),
    ('airKick', 648, 'body', [24, 22]),
    ('flyKick', 720, 'body', [20]),
    ('arc', 776, 'body', [20, 30, 28, 30, 28, 28, 30, 32]),
    ('aim', 840, 'body', [20, 20, 20]),
    ('airAim', 904, 'body', [18]),
    ('fire', 976, 'body', [20, 20, 22]),
    ('streak', 1040, 'effect', [20, 24]),
    ('beam', 1120, 'effect', [0, 0, 0]),
]
CREDIT_PANEL = [620, 18, 102, 118]
INPUT_ICON_COLUMN = [0, 80, 46, 1000]


def detect(src):
    w, h = src.size
    px = src.load()
    seen = bytearray(w * h)
    rects = []
    for y in range(h):
        for x in range(w):
            if seen[y * w + x] or px[x, y] == OUTER:
                continue
            stack = [(x, y)]; seen[y * w + x] = 1
            x0 = x1 = x; y0 = y1 = y; n = 0
            while stack:
                a, b = stack.pop(); n += 1
                x0 = min(x0, a); x1 = max(x1, a); y0 = min(y0, b); y1 = max(y1, b)
                for c, d in ((a - 1, b), (a + 1, b), (a, b - 1), (a, b + 1)):
                    if 0 <= c < w and 0 <= d < h and not seen[d * w + c] and px[c, d] != OUTER:
                        seen[d * w + c] = 1; stack.append((c, d))
            rects.append((x0, y0, x1 - x0 + 1, y1 - y0 + 1, n))
    return rects


def main():
    raw = SRC.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == SHA, 'source hash changed'
    src = Image.open(SRC)
    assert src.size == (727, 1160) and src.mode == 'RGB' and src.getpixel((0, 0)) == OUTER
    src = src.convert('RGB')
    rects = detect(src)
    credit = [r for r in rects if r[0] >= 600]
    icons = [r for r in rects if r[0] < 46]
    cellsRaw = sorted([r for r in rects if 46 <= r[0] < 600], key=lambda r: (r[1] // 8, r[0]))
    assert len(credit) == 1 and list(credit[0][:4]) == CREDIT_PANEL, credit
    cells = []; i = 0
    for name, by, kind, ax in LAYOUT:
        band = [r for r in cellsRaw if abs(r[1] - by) <= 1]
        assert len(band) == len(ax), (name, by, len(band), len(ax))
        for k, (x, y, w, h, n) in enumerate(band):
            cname = f'{name}{k}'
            anchor = [w // 2 if ax[k] is None else ax[k], h // 2 if kind == 'effect' and name == 'beam' else h]
            if name == 'beam': anchor = [0, h // 2]
            cells.append(dict(name=cname, rect=[x, y, w, h], anchor=anchor, kind=kind, fullRect=(n == w * h)))
            i += 1
    assert i == len(cellsRaw), ('unaccounted cells', len(cellsRaw), i)

    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    frames = {}
    for c in cells:
        x, y, w, h = c['rect']
        im = src.crop((x, y, x + w, y + h)).convert('RGBA')
        p = im.load(); keyed = 0; outerKept = 0
        for yy in range(h):
            for xx in range(w):
                rgb = p[xx, yy][:3]
                if rgb == CELL:
                    p[xx, yy] = (0, 0, 0, 0); keyed += 1
                elif rgb == OUTER:
                    outerKept += 1         # suit shading that matches the sheet background: kept
        c['keyedPixels'] = keyed; c['outerColourKept'] = outerKept
        c['bbox'] = list(im.getbbox() or (0, 0, 0, 0))
        c['opaquePixels'] = sum(1 for a in im.getdata() if a[3] > 0)
        frames[c['name']] = im
        im.save(OUT / 'cells' / f"{c['name']}.png")

    # Action sequences (presentation names). Mapping rationale lives in MOVE_FRAME_MAP.md.
    run = [f'run{i}' for i in range(8)]
    seq = {
        'idle': ['ready0', 'ready1'], 'walk': run, 'run': run, 'walk_back': run[::-1], 'dash': ['run1'],
        'jump': ['jump0'], 'fall': ['jump1'], 'crouch': ['ground2'], 'guard': ['guard0'],
        'hurt': ['fall0'], 'knockdown': ['fall0', 'fall1', 'fall2'], 'getup': ['fall3', 'fall4', 'ready0'],
        'light': ['strike0', 'strike1'], 'gJ2': ['kick0', 'kick1'], 'gJ3': ['kick1', 'kick2'],
        'heavy': ['arc4', 'arc5'], 'gLow': ['ground1'], 'up': ['acro0', 'acro1'],
        'air': ['airKick0', 'airKick1'], 'down_air': ['airKick1'],
        'gAdvance': ['flyKick0'], 'gChain': ['aim0', 'aim1'], 'gAway': ['arc4', 'arc5'],
        'gScan': ['ground2', 'arc7'], 'gShot': ['aim0', 'aim1', 'aim2'],
        'gAcro': ['acro2', 'acro3', 'acro4'], 'gFollow': ['kick1', 'kick2'],
        'gRise': ['jump0', 'airKick1'], 'gRetreat': ['arc1', 'arc2', 'arc3'], 'gHeel': ['airKick0'],
        'ultimate': ['fire0', 'fire1', 'fire2'], 'grab': ['strike0', 'strike1'],
        'win': ['arc6', 'ready0'], 'intro': ['arc7', 'arc6'],
    }
    anim = {}; by = {c['name']: c for c in cells}
    for action, names in seq.items():
        strip = Image.new('RGBA', (FW * len(names), FH))
        for i, n in enumerate(names):
            ax, ay = by[n]['anchor']
            strip.paste(frames[n], (FW * i + OX - ax, OY - ay))
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/spd_green/{action}.png', 'frames': len(names), 'width': FW, 'height': FH,
                        'anchorY': 0, 'loop': action in ('idle', 'walk', 'run', 'walk_back', 'crouch', 'guard'),
                        'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': 8, 'frameWidth': FW, 'frameHeight': FH}
    (ROOT / 'spdGreenSprites.js').write_text('// Generated by tools/spd_green/extract.py — do not hand-edit.\nexport const SPD_GREEN_ANIM = ' + json.dumps(anim, indent=2) + '\n')

    # Portrait: helmet/shoulders of ready0, nearest-neighbour x4.
    # helmet spans x14-24, y1-10 of ready0 (measured) → 24x25 window centred on it
    frames['ready0'].crop((7, 0, 31, 25)).resize((96, 100), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    # Supplied effect art: beam pieces (shot), muzzle star, streak ghosts.
    for n in ('beam0', 'beam1', 'beam2', 'streak0', 'streak1'):
        im = frames[n]; im.crop(im.getbbox()).save(OUT / f'fx_{n}.png')

    meta = {'source': SRC.name, 'sha256': SHA, 'size': [727, 1160], 'mode': 'RGB', 'outerBackground': OUTER, 'cellBackground': CELL,
            'keyPolicy': 'exact cell-fill RGB(128,255,123) only, inside verified cell rects; outer colour kept wherever it occurs inside a cell (suit shading)',
            'credit': 'ripped by the FRANKETE, for TSR (WANTED-poster credit panel, top right)', 'creditPanel': CREDIT_PANEL,
            'inputIcons': [list(r[:4]) for r in icons], 'inputIconNote': 'left-column controller glyphs (→, ↓, A, B, ↑+B …) — labels, not body art',
            'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY},
            'frames': cells, 'sequences': seq}
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'source_rects.json').write_text(json.dumps(meta, indent=2) + '\n')

    S = 3; colw = 72 * S + 12; rowh = 64 * S + 34; per = 8
    contact = Image.new('RGB', (per * colw, ((len(cells) + per - 1) // per) * rowh), (38, 43, 54)); d = ImageDraw.Draw(contact)
    for i, c in enumerate(cells):
        x = i % per * colw; y = i // per * rowh
        d.text((x + 4, y + 3), f"{c['name']} {c['rect']}", fill='white')
        im = frames[c['name']]; big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        d.rectangle([x + 4, y + 18, x + 4 + big.width, y + 18 + big.height], outline=(90, 96, 110))
        contact.paste(big, (x + 4, y + 18), big)
        ax, ay = c['anchor']; cx, cy = x + 4 + ax * S, y + 18 + ay * S
        d.line([cx - 5, cy, cx + 5, cy], fill=(255, 60, 60)); d.line([cx, cy - 5, cx, cy], fill=(255, 60, 60))
    contact.save(DOC / 'contact_sheet.png')
    print('cells', len(cells), 'actions', len(seq), 'icons', len(icons), 'outer-colour pixels kept',
          sum(c['outerColourKept'] for c in cells))


if __name__ == '__main__':
    main()
