#!/usr/bin/env python3
"""S.P.D. Pink Ranger (Sydney "Syd" Drew) sprite extraction.

Read-only source (sha256 verified, never written). Background policy, verified on this sheet:
  * the frame-cell fill RGB(255,154,195) is removed ONLY as an exact match inside a verified cell rect;
  * the outer sheet colour RGB(255,91,124) is NOT in Syd's body palette (suit ramp is
    (255,16,107)..(255,115,206)). It occurs inside exactly one cell: a 12-pixel background notch at the
    bottom-left corner of `punch1` (rect 104,584) where the sheet border clips the cell. Those 12 listed
    pixels, and only them, are keyed; any other outer-colour pixel inside a cell fails the assert.
No tolerance, no hue keying, no global pink removal, nearest-neighbour only. Cell rectangles are detected
as connected non-outer regions, then asserted against the expected band layout so a changed source fails.
Nothing from the Green/Blue sheets is used: every frame below is cut from the Pink sheet.

Usage: python3 tools/spd_pink/extract.py
"""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/spd_pink'
OUT = ROOT / 'assets/spd_pink'
SRC = ROOT / 'Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Power Rangers - Pink Ranger.png'
SHA = 'cffc6031bbf8058032bae24848039bad41e690b3440983631239f658081c8b04'
OUTER = (255, 91, 124)
CELL = (255, 154, 195)
FW, FH, OX, OY = 144, 96, 64, 84      # strip frame + origin: same vocabulary as the other S.P.D. Rangers
NOTCH = {'punch1': [(0, 52), (0, 53), (0, 54), (0, 55), (1, 53), (1, 54), (1, 55), (2, 54), (2, 55), (3, 55), (4, 55), (5, 55)]}

# (name, band y, kind, count) — names describe the OBSERVED pose (enlarged inspection), not a certified action.
LAYOUT = [
    ('ready', 8, 'body', 2),        # standing ready, fists up
    ('run', 72, 'body', 8),         # locomotion cycle (→ icon)
    ('crouch', 136, 'body', 1),     # set / crouch stance (↓ icon)
    ('jump', 200, 'body', 2),       # jump rise / tuck (A icon)
    ('guard', 272, 'body', 1),      # hunched guard / reaction
    ('fall', 328, 'body', 5),       # hit-back, tumble, flat, roll, rise-to-pose
    ('slash', 384, 'body', 3),      # Deltamax baton: high, low cross, thrust
    ('acro', 448, 'body', 4),       # punch-prep, handspring, cartwheel kick, low sweep (B icon)
    ('raise', 512, 'body', 2),      # fist chambered, fist raised overhead
    ('punch', 584, 'body', 2),      # kneel, lunging straight punch (low-to-forward)
    ('airKick', 648, 'body', 2),    # air tuck, flying side kick (A B icons)
    ('flip', 720, 'body', 1),       # inverted horizontal aerial kick (→→+B icon)
    ('kick', 776, 'body', 4),       # chamber, high side kick, chamber, overhead fist (↑+B icon)
    ('aim', 840, 'body', 3),        # Deltamax blaster aim / fire (↓+B icon)
    ('airAim', 904, 'body', 1),     # airborne aim
    ('fire', 976, 'body', 3),       # big blast + Deltamax cannon (A+B icon) — call/ready poses
    ('streak', 1040, 'effect', 2),  # phase streaks (→+→ icon)
    ('beam', 1120, 'effect', 3),    # muzzle star, beam pieces
]
CREDIT_PANEL = [580, 15, 102, 118]


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


def stance_x(im):
    """Anchor X = centre of the opaque pixels in the lowest 6 opaque rows (feet + floor shadow)."""
    a = im.getchannel('A'); w, h = im.size; px = a.load()
    rows = [y for y in range(h) if any(px[x, y] for x in range(w))]
    xs = [x for y in rows[-6:] for x in range(w) if px[x, y]]
    return round(sum(xs) / len(xs)) if xs else w // 2


def main():
    raw = SRC.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == SHA, 'source hash changed'
    src = Image.open(SRC)
    assert src.size == (727, 1160) and src.mode == 'RGB' and src.getpixel((0, 0)) == OUTER
    src = src.convert('RGB')
    rects = detect(src)
    credit = [r for r in rects if r[0] >= 560]
    icons = [r for r in rects if r[0] < 46]
    cellsRaw = sorted([r for r in rects if 46 <= r[0] < 560], key=lambda r: (r[1] // 8, r[0]))
    assert len(credit) == 1 and list(credit[0][:4]) == CREDIT_PANEL, credit
    cells = []
    for name, by, kind, count in LAYOUT:
        band = [r for r in cellsRaw if abs(r[1] - by) <= 1]
        assert len(band) == count, (name, by, len(band), count)
        for k, (x, y, w, h, n) in enumerate(band):
            cells.append(dict(name=f'{name}{k}', rect=[x, y, w, h], kind=kind, fullRect=(n == w * h)))
    assert len(cells) == len(cellsRaw) == 49, ('unaccounted cells', len(cellsRaw), len(cells))

    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    frames = {}
    for c in cells:
        x, y, w, h = c['rect']
        im = src.crop((x, y, x + w, y + h)).convert('RGBA')
        p = im.load(); keyed = 0; notch = 0
        allowed = set(NOTCH.get(c['name'], []))
        for yy in range(h):
            for xx in range(w):
                rgb = p[xx, yy][:3]
                if rgb == CELL:
                    p[xx, yy] = (0, 0, 0, 0); keyed += 1
                elif rgb == OUTER:
                    assert (xx, yy) in allowed, ('outer colour inside cell outside verified notch', c['name'], xx, yy)
                    p[xx, yy] = (0, 0, 0, 0); notch += 1
        assert notch == len(allowed), (c['name'], notch)
        c['keyedPixels'] = keyed; c['notchPixelsKeyed'] = notch
        c['bbox'] = list(im.getbbox() or (0, 0, 0, 0))
        c['opaquePixels'] = sum(1 for a in im.getdata() if a[3] > 0)
        if c['kind'] == 'body':
            c['anchor'] = [stance_x(im), h]
        elif c['name'].startswith('beam'):
            c['anchor'] = [0, h // 2]
        else:
            c['anchor'] = [w // 2, h]
        frames[c['name']] = im
        im.save(OUT / 'cells' / f"{c['name']}.png")

    # Action sequences (presentation names). Mapping rationale lives in docs/spd_pink/MOVE_FRAME_MAP.md.
    run = [f'run{i}' for i in range(8)]
    seq = {
        'idle': ['ready0', 'ready1'], 'walk': run, 'run': run, 'walk_back': run[::-1], 'dash': ['run1'],
        'jump': ['jump0'], 'fall': ['jump1'], 'crouch': ['crouch0'], 'guard': ['guard0'],
        'hurt': ['fall0'], 'knockdown': ['fall0', 'fall1', 'fall2'], 'getup': ['fall3', 'fall4', 'ready0'],
        # normals
        'light': ['ready1', 'slash0'], 'pJ2': ['slash0', 'slash1'], 'pJ3': ['acro0', 'punch1'],
        'heavy': ['kick0', 'kick1'], 'pLow': ['acro3'], 'up': ['kick2', 'kick3'],
        'air': ['airKick0', 'airKick1'], 'down_air': ['airKick1'],
        # Forward+Heavy: weapon check -> heavy kick -> knock-away
        'pCheck': ['slash1', 'slash2'], 'pKick': ['kick0', 'kick1'], 'pAway': ['acro1', 'acro2'],
        # specials
        'pPrep': ['crouch0', 'raise0'], 'pShot': ['aim0', 'aim1', 'aim2'], 'pBreaker': ['punch0', 'punch1'],
        'pRise': ['kick2', 'raise1'], 'pStance': ['guard0', 'crouch0'], 'pReprisal': ['slash0', 'slash2'],
        'pRose': ['airKick0', 'flip0'],
        'ultimate': ['fire0', 'fire1', 'fire2'], 'grab': ['acro0', 'punch1'],
        'win': ['kick3', 'ready0'], 'intro': ['raise1', 'ready0'],
        # variety pass (Red-style command moves; all supplied cells, see MOVE_FRAME_MAP.md)
        'pSweep': ['acro2', 'acro3'], 'pEvade': ['acro1', 'fall4'], 'pAirShot': ['airAim0'], 'pVault': ['jump1', 'flip0'],
        'pBar1': ['acro0'], 'pBar2': ['punch1'], 'pBar3': ['slash0', 'slash2'], 'pFlip': ['acro1', 'fall4', 'aim1'],
    }
    used = {n for v in seq.values() for n in v}
    anim = {}; by = {c['name']: c for c in cells}
    for action, names in seq.items():
        strip = Image.new('RGBA', (FW * len(names), FH))
        for i, n in enumerate(names):
            ax, ay = by[n]['anchor']
            strip.paste(frames[n], (FW * i + OX - ax, OY - ay))
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/spd_pink/{action}.png', 'frames': len(names), 'width': FW, 'height': FH,
                        'anchorY': 0, 'loop': action in ('idle', 'walk', 'run', 'walk_back', 'crouch', 'guard'),
                        'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': 8, 'frameWidth': FW, 'frameHeight': FH}
    (ROOT / 'spdPinkSprites.js').write_text('// Generated by tools/spd_pink/extract.py — do not hand-edit.\nexport const SPD_PINK_ANIM = ' + json.dumps(anim, indent=2) + '\n')

    # Portrait: helmet/shoulders of ready0, nearest-neighbour x4.
    # helmet spans x14-24, y1-9 of ready0 (measured, ASCII dump) -> 20x20 head-and-shoulders window, x5 NN.
    frames['ready0'].crop((9, 0, 29, 20)).resize((100, 100), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    # Supplied effect art: muzzle star, beam pieces, streak ghosts (cropped to content, never redrawn).
    for n in ('beam0', 'beam1', 'beam2', 'streak0', 'streak1'):
        im = frames[n]; im.crop(im.getbbox()).save(OUT / f'fx_{n}.png')

    for c in cells:
        c['usedIn'] = sorted(a for a, v in seq.items() if c['name'] in v)
    meta = {'source': SRC.name, 'sha256': SHA, 'size': [727, 1160], 'mode': 'RGB', 'outerBackground': OUTER, 'cellBackground': CELL,
            'keyPolicy': 'exact cell-fill RGB(255,154,195) only, inside verified cell rects; outer RGB(255,91,124) keyed only at the 12 listed notch pixels of punch1',
            'notch': NOTCH,
            'credit': 'ripped by the FRANKETE, for TSR (WANTED-poster credit panel, top right)', 'creditPanel': CREDIT_PANEL,
            'inputIcons': [list(r[:4]) for r in icons], 'inputIconNote': 'left-column controller glyphs (→, ↓, A, B, ↑+B, A+B, →+→ …) — labels, not body art',
            'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY},
            'frames': cells, 'sequences': seq, 'unusedCells': [c['name'] for c in cells if c['name'] not in used]}
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
        d.line([cx - 5, cy, cx + 5, cy], fill=(80, 255, 120)); d.line([cx, cy - 5, cx, cy], fill=(80, 255, 120))
    contact.save(DOC / 'contact_sheet.png')
    print('cells', len(cells), 'actions', len(seq), 'icons', len(icons), 'notch pixels keyed',
          sum(c['notchPixelsKeyed'] for c in cells), 'unused', meta['unusedCells'])


if __name__ == '__main__':
    main()
