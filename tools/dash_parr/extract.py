#!/usr/bin/env python3
"""Dash Parr (The Incredibles, GBA) sprite extraction.

Source: assets/dash_parr/source/dash_sheet.png (copy of the supplied untracked
"Game Boy Advance - The Incredibles - Playable Characters - Dash.png", "Ripped by
redblueyellow. No credit needed."). Read-only; SHA-256 asserted.

Key policy: the exact corner colour RGB(0,128,128) is the background. Zero tolerance,
no hue keying, nearest-neighbour only. Everything else is kept: white speed streaks,
the white hit-flash silhouette, dust specks, ground shadows.

Cut: 8-connected components of non-background pixels. A speed streak touching Dash is
ONE component (it is never split). Satellites that do not touch a body (two run-cycle
ground shadows, R6 dust specks) are attached to the frame they belong to (nearest body
in the same row), so no pixel is dropped. Rows y >= 268 are the credit text: excluded.

Anchor: feet baseline + body centre. Body pixels = every non-white, non-shadow pixel
(streak/flash white and shadow grey never move the anchor). anchorY = lowest body row,
anchorX = median body column. The flash silhouette (all white) uses its own bbox.

Usage: python3 tools/dash_parr/extract.py
"""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/dash_parr/source/dash_sheet.png'
OUT = ROOT / 'assets/dash_parr'
DOC = ROOT / 'docs/dash'
SHA = '91d292df73776f8219796b56ea00821d3ec8ecad5ab45d830b527dd0586c2d55'
BG = (0, 128, 128)
CREDIT_Y = 268
WHITE = (248, 248, 248)
SHADOW = (120, 120, 120)
FW, FH, OX, OY = 112, 64, 56, 58          # strip cell + origin (body centre / feet)

# Row bands (y ranges) → row id. Frames inside a row are ordered left→right.
ROWS = [('R1', 0, 30), ('R2', 30, 72), ('R3', 72, 110), ('R4', 110, 153), ('R5', 153, 185),
        ('R6', 185, 236), ('R7', 236, 268)]
# Observed pose names per row (descriptions in SPRITE_LEDGER.md). Real frames win over the brief.
NAMES = {
    'R1': ['portrait'],
    'R2': ['stand0', 'stand1', 'stand2', 'stand3', 'stand4', 'stand5'],
    'R3': ['run0', 'run1', 'run2', 'run3', 'run4', 'run5'],
    'R4': ['sprint0', 'sprint1', 'sprint2', 'sprint3', 'sprint4', 'sprint5', 'sprint6', 'sprint7', 'dive'],
    'R5': ['lean0', 'lean1', 'lean2', 'lean3'],
    'R6': ['streak0', 'blurPose0', 'streak1', 'blurPose1'],
    'R7': ['flash', 'lying', 'tumble', 'getup', 'airPose'],
}


def components(src):
    w, h = src.size; px = src.load(); seen = bytearray(w * h); out = []
    for y in range(min(h, CREDIT_Y)):
        for x in range(w):
            if seen[y * w + x] or px[x, y] == BG:
                continue
            st = [(x, y)]; seen[y * w + x] = 1; pts = []
            while st:
                a, b = st.pop(); pts.append((a, b))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        c, d = a + dx, b + dy
                        if 0 <= c < w and 0 <= d < min(h, CREDIT_Y) and not seen[d * w + c] and px[c, d] != BG:
                            seen[d * w + c] = 1; st.append((c, d))
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            out.append(dict(pts=pts, bbox=[min(xs), min(ys), max(xs) + 1, max(ys) + 1], n=len(pts)))
    return out


def row_of(c):
    cy = c['bbox'][1]
    for rid, a, b in ROWS:
        if a <= cy < b:
            return rid
    raise AssertionError(('component outside rows', c['bbox']))


def main():
    raw = SRC.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == SHA, 'source hash changed'
    src = Image.open(SRC).convert('RGB')
    assert src.size == (191, 298) and src.getpixel((0, 0)) == BG
    px = src.load()
    comps = components(src)
    assert len(comps) == 47, len(comps)            # 72 total minus 25 credit-text glyph pieces
    # Bodies: > 100 px. Satellites: shadows (all SHADOW) + dust specks (all white, < 10 px).
    bodies = [c for c in comps if c['n'] > 100]
    sats = [c for c in comps if c['n'] <= 100]
    assert len(bodies) == 35 and len(sats) == 12, (len(bodies), len(sats))
    rows = {}
    for b in bodies:
        rows.setdefault(row_of(b), []).append(b)
    frames = []
    for rid, _, _ in ROWS:
        bs = sorted(rows[rid], key=lambda c: c['bbox'][0])
        assert len(bs) == len(NAMES[rid]), (rid, len(bs))
        for name, b in zip(NAMES[rid], bs):
            frames.append(dict(name=name, row=rid, comp=b, extra=[]))
    # Attach satellites to the nearest body frame in the same row (horizontal centre distance).
    for s in sats:
        rid = row_of(s); sx = (s['bbox'][0] + s['bbox'][2]) / 2
        cand = [f for f in frames if f['row'] == rid]
        kind = 'shadow' if all(px[x, y] == SHADOW for x, y in s['pts']) else 'speck'
        if kind == 'speck':      # dust motes trail the streak frames only
            cand = [f for f in cand if f['name'].startswith('streak')]
        best = min(cand, key=lambda f: abs((f['comp']['bbox'][0] + f['comp']['bbox'][2]) / 2 - sx))
        best['extra'].append(dict(kind=kind, bbox=s['bbox'], n=s['n'], pts=s['pts']))
    used = 0
    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    cells = {}
    for f in frames:
        pts = list(f['comp']['pts']) + [p for e in f['extra'] for p in e['pts']]
        used += len(pts)
        x0 = min(p[0] for p in pts); y0 = min(p[1] for p in pts); x1 = max(p[0] for p in pts) + 1; y1 = max(p[1] for p in pts) + 1
        im = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0)); ip = im.load()
        for x, y in pts:
            ip[x - x0, y - y0] = px[x, y] + (255,)
        body = [(x - x0, y - y0) for x, y in f['comp']['pts'] if px[x, y] not in (WHITE, SHADOW)]
        if len(body) < 20:   # the white hit-flash silhouette
            body = [(x - x0, y - y0) for x, y in f['comp']['pts']]
        bx = sorted(p[0] for p in body)
        f.update(rect=[x0, y0, x1 - x0, y1 - y0], anchor=[bx[len(bx) // 2], max(p[1] for p in body) + 1],
                 whitePixels=sum(1 for x, y in pts if px[x, y] == WHITE), pixels=len(pts),
                 satellites=[dict(kind=e['kind'], bbox=e['bbox'], n=e['n']) for e in f['extra']])
        cells[f['name']] = im
        im.save(OUT / 'cells' / f"{f['name']}.png")
    total = sum(1 for y in range(CREDIT_Y) for x in range(src.width) if px[x, y] != BG)
    assert used == total, ('pixels unaccounted', used, total)

    # Animation strips — every frame is used at least once (asserted). Mapping rationale: SPRITE_LEDGER.md.
    S = lambda *n: list(n)
    seq = {
        'idle': S('stand0', 'stand1', 'stand2', 'stand3', 'stand4', 'stand5'),
        'walk': S('run0', 'run1', 'run2', 'run3', 'run4', 'run5'),
        'run': S('sprint0', 'sprint1', 'run0', 'run1', 'run2', 'run3', 'run4', 'run5'),
        'walk_back': S('run5', 'run4', 'run3', 'run2', 'run1', 'run0'),
        'dash': S('sprint6', 'run3'),
        'crouch': S('lean1'), 'guard': S('getup'),
        'jump': S('sprint7', 'sprint3'), 'fall': S('sprint4', 'sprint5'),
        'hurt': S('flash', 'tumble'), 'knockdown': S('tumble', 'lying'), 'getup': S('lying', 'getup', 'stand0'),
        'lose': S('lying'), 'win': S('airPose', 'stand0'), 'intro': S('sprint2', 'stand0'),
        'light': S('sprint0', 'sprint1'), 'heavy': S('sprint6', 'streak0'),
        'low': S('lean2', 'lean3'), 'up': S('lean0', 'sprint7'), 'air': S('blurPose0', 'streak1'),
        'flurry': S('blurPose0', 'blurPose1', 'streak0', 'streak1'),
        'blurDash': S('lean0', 'streak0', 'streak1', 'run3'),
        'laps': S('run0', 'run1', 'run2', 'sprint6', 'run4', 'run5'),
        'hydro': S('lean0', 'lean1', 'lean2', 'lean3', 'dive'),
        'ultimate': S('blurPose1', 'streak0', 'blurPose0', 'streak1', 'airPose'),
        'sidestep': S('streak1', 'run3'), 'panic': S('dive', 'run2'),
    }
    usedNames = {n for v in seq.values() for n in v} | {'portrait'}
    assert usedNames == set(cells), ('frames unused', set(cells) - usedNames)
    anim = {}; by = {f['name']: f for f in frames}
    LOOP = ('idle', 'walk', 'run', 'walk_back', 'crouch', 'guard', 'flurry', 'laps')
    for action, names in seq.items():
        strip = Image.new('RGBA', (FW * len(names), FH))
        for i, n in enumerate(names):
            ax, ay = by[n]['anchor']
            strip.paste(cells[n], (FW * i + OX - ax, OY - ay), cells[n])
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/dash_parr/{action}.png', 'frames': len(names), 'width': FW, 'height': FH,
                        'anchorY': 0, 'loop': action in LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY,
                        'speed': 4 if action in ('run', 'flurry', 'laps') else 8 if action != 'walk' else 9, 'frameWidth': FW, 'frameHeight': FH}
    (ROOT / 'dashParrSprites.js').write_text('// Generated by tools/dash_parr/extract.py — do not hand-edit.\n'
                                            'export const DASH_PARR_ANIM = ' + json.dumps(anim, indent=2) + '\n'
                                            'export const DASH_PARR_SEQ = ' + json.dumps(seq) + '\n')
    # Portrait: the sheet's own R1 head icon, nearest-neighbour ×3.
    p = cells['portrait']; p.resize((p.width * 3, p.height * 3), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    # Supplied effect art for the render-only afterimage trail: the two streak frames.
    for n in ('streak0', 'streak1'):
        cells[n].save(OUT / f'fx_{n}.png')

    meta = {'source': str(SRC.relative_to(ROOT)), 'suppliedAs': 'Game Boy Advance - The Incredibles - Playable Characters - Dash.png',
            'sha256': SHA, 'size': list(src.size), 'background': BG, 'keyPolicy': 'exact corner colour RGB(0,128,128), zero tolerance',
            'credit': 'Ripped by redblueyellow. No credit needed. (text rows y>=268, excluded)', 'creditRowsFrom': CREDIT_Y,
            'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY},
            'frames': [{k: v for k, v in f.items() if k not in ('comp', 'extra')} for f in frames], 'sequences': seq,
            'pixelsKept': used}
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'source_rects.json').write_text(json.dumps(meta, indent=2) + '\n')

    # Contact sheet: row.frame label, x4 nearest, red cross = anchor (feet / body centre).
    Z = 4; colw = 48 * Z + 16; rowh = 46 * Z + 30
    order = [rid for rid, _, _ in ROWS]; maxper = max(len(NAMES[r]) for r in order)
    sheet = Image.new('RGB', (maxper * colw, len(order) * rowh), (38, 43, 54)); d = ImageDraw.Draw(sheet)
    for ri, rid in enumerate(order):
        for fi, n in enumerate(NAMES[rid]):
            f = by[n]; im = cells[n]; x = fi * colw + 6; y = ri * rowh + 4
            d.text((x, y), f'{rid[1:]}.{fi + 1} {n}', fill='white')
            big = im.resize((im.width * Z, im.height * Z), Image.Resampling.NEAREST)
            d.rectangle([x, y + 14, x + big.width, y + 14 + big.height], outline=(90, 96, 110))
            sheet.paste(big, (x, y + 14), big)
            ax, ay = f['anchor']; cx, cy = x + ax * Z, y + 14 + ay * Z
            d.line([cx - 6, cy, cx + 6, cy], fill=(255, 60, 60), width=2); d.line([cx, cy - 6, cx, cy], fill=(255, 60, 60), width=2)
    sheet.save(DOC / 'contact_sheet.png')
    print('frames', len(frames), 'actions', len(seq), 'pixels', used, 'satellites', sum(len(f['satellites']) for f in frames))


if __name__ == '__main__':
    main()
