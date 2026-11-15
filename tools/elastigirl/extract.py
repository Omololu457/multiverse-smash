#!/usr/bin/env python3
"""Elastigirl (Helen Parr, The Incredibles GBA sheet) extraction.

Source (READ-ONLY, hash-checked): assets/sprites/elastigirl.png — copied byte-for-byte from the supplied
"Game Boy Advance - The Incredibles - Playable Characters - Elastigirl.png" (600x1623 RGB, "Ripped by redblueyellow").

Background policy: the solid teal (0,128,128) — sampled at all four corners — is keyed EXACTLY (zero tolerance).
Every other pixel is kept: white slash FX, white hit-flash silhouettes, grey (64,64,64) shadow ovals.
Sheet annotations excluded (confirmed on docs/elastigirl/contact_sheet.png):
  * the red "repeat" bracket + label under the dome row = every (255,0,0) pixel (351 px, bbox x89-363 y256-271;
    that exact colour occurs nowhere else on the sheet);
  * the "Ripped by redblueyellow. / No credit needed." text = every pixel at x>=387, y>=1579.

FRAMES ARE COMPONENT UNIONS. 8-connected components are grouped per sheet row (y band). Body components (>=150 px)
seed frames; every smaller detached piece (stretched-limb segment, fist, wind speck) joins the nearest body frame to
its LEFT within 6 px (the stretch leads to the right) — or, in the raft rows, the nearest frame. Row 7 (Whirl Kick)
is split by explicit column bounds because its white slash arcs are scattered. The script asserts every component
is assigned exactly once, so a changed source fails loudly.

ANCHOR = feet baseline + TORSO centre, never the limb: x = mean column of the gold belt / emblem pixels (on the torso
in every pose), y = one past the lowest non-shadow pixel. Fallback (white flash silhouettes, raft composites) =
bounding-box centre / bottom. Nearest-neighbour only; strips are symmetric about the anchor so the engine's mirror
(facing left) keeps the torso planted.

Usage: python3 tools/elastigirl/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sprites/elastigirl.png'
SHA = '70f6aefe71dcc45345c95ddc807769aeee572a673517b542170d0c2147e46603'
OUT = ROOT / 'assets/elastigirl'
DOC = ROOT / 'docs/elastigirl'
BG = (0, 128, 128)
ANNOT = (255, 0, 0)
SHADOW = (64, 64, 64)
TORSO = {(160, 120, 24), (216, 160, 32), (216, 224, 24)}   # belt / emblem gold

# sheet rows (y bands) — R numbering follows the brief's inventory
ROWS = {1: (2, 30), 2: (32, 83), 3: (85, 137), 4: (139, 202), 5: (204, 264), 6: (275, 326), 7: (328, 388), 8: (390, 435),
        9: (437, 474), 10: (475, 522), 11: (524, 677), 12: (678, 839), 13: (840, 938), 14: (940, 1100), 15: (1102, 1127),
        16: (1129, 1192), 17: (1194, 1275), 18: (1277, 1331), 19: (1333, 1396), 20: (1398, 1449), 21: (1453, 1487),
        22: (1489, 1531), 23: (1533, 1577), 24: (1579, 1620)}
RAFT_ROWS = {21, 22, 23, 24}
R7_BOUNDS = [0, 135, 296, 408, 600]        # Whirl Kick frame columns (body + its own slash arcs)
BODY_MIN = 150


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def gap_x(a, b):
    return max(0, max(a['x'], b['x']) - min(a['x'] + a['w'], b['x'] + b['w']))


def gap(a, b):
    dy = max(0, max(a['y'], b['y']) - min(a['y'] + a['h'], b['y'] + b['h']))
    return max(gap_x(a, b), dy)


def load():
    im = Image.open(SRC).convert('RGB')
    a = np.array(im)
    assert im.size == (600, 1623)
    corners = {tuple(a[y, x]) for y, x in ((0, 0), (0, 599), (1622, 0), (1622, 599))}
    assert corners == {BG}, corners
    fg = ~(a == BG).all(2)
    annot = (a == ANNOT).all(2)
    text = np.zeros_like(fg); text[1579:, 387:] = True
    ys, xs = np.where(annot)
    assert annot.sum() == 351 and xs.min() == 89 and xs.max() == 363 and ys.min() == 256 and ys.max() == 271
    excluded = (annot | text) & fg
    keep = fg & ~excluded
    lab, n = ndimage.label(keep, structure=np.ones((3, 3)))
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        y, x = sl
        comps.append(dict(id=i + 1, x=x.start, y=y.start, w=x.stop - x.start, h=y.stop - y.start, n=int((lab[sl] == i + 1).sum())))
    return im, a, lab, comps, int(excluded.sum()), int(text[fg].sum())


def group(a, comps):
    """→ {row: [ {name, parts:[comp ids], kind} ]} in left-to-right order."""
    rows, used = {}, set()
    for r, (y0, y1) in ROWS.items():
        cs = [c for c in comps if y0 <= c['y'] < y1]
        frames = []
        if r == 7:
            for k in range(4):
                lo, hi = R7_BOUNDS[k], R7_BOUNDS[k + 1]
                frames.append(dict(parts=[c for c in cs if lo <= c['x'] < hi], kind='body'))
        else:
            shadows = [c for c in cs if r == 4 and c['y'] >= 190 and c['x'] >= 300]
            bodies = sorted([c for c in cs if c['n'] >= BODY_MIN and c not in shadows], key=lambda c: c['x'])
            frames = [dict(parts=[b], kind='body') for b in bodies]
            for c in sorted([c for c in cs if c not in bodies and c not in shadows], key=lambda c: c['x']):
                fg_ = lambda i: min(gap(p, c) for p in frames[i]['parts'])   # gap to the frame's union so far (pieces chain)
                if r in RAFT_ROWS:
                    j = min(range(len(bodies)), key=fg_)
                else:
                    left = [i for i, b in enumerate(bodies) if b['x'] <= c['x']]
                    j = max(left, key=lambda i: bodies[i]['x'])
                assert fg_(j) <= 6, ('detached piece too far', r, c, bodies[j])
                frames[j]['parts'].append(c)
            for k, s in enumerate(sorted(shadows, key=lambda c: c['x'])):
                frames.append(dict(parts=[s], kind='shadow', name=f'r4s_{k + 1}'))
        bi = 0
        for f in frames:
            if 'name' not in f:
                bi += 1; f['name'] = f'r{r}_{bi}'
            for c in f['parts']:
                assert c['id'] not in used, ('assigned twice', c)
                used.add(c['id'])
        rows[r] = frames
    missing = [c for c in comps if c['id'] not in used]
    assert not missing, ('unassigned components', missing)
    return rows


def cut(im, lab, f):
    ids = [c['id'] for c in f['parts']]
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rgba = np.array(im.convert('RGBA'))[y0:y1, x0:x1].copy()
    rgba[~m[y0:y1, x0:x1]] = 0
    return Image.fromarray(rgba, 'RGBA'), [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]


def anchor(img, raft):
    a = np.array(img)
    op = a[..., 3] > 0
    c = a[..., :3].astype(np.int32)
    key = (c[..., 0] << 16) | (c[..., 1] << 8) | c[..., 2]
    torso = np.isin(key, [(r << 16) | (g << 8) | b for r, g, b in TORSO]) & op
    shadow = (key == ((SHADOW[0] << 16) | (SHADOW[1] << 8) | SHADOW[2])) & op
    body = op & ~shadow
    ys, xs = np.where(body if body.any() else op)
    bottom = int(ys.max() + 1)
    if raft or not torso.any():
        return [int(round((xs.min() + xs.max() + 1) / 2)), bottom], 'bbox'
    return [int(round(np.where(torso)[1].mean())), bottom], 'torso'


# ── action strips (engine animation names / Elastigirl move keys) → ordered cells. Ledger: docs/elastigirl/SPRITE_LEDGER.md
R = lambda r, *fs: [f'r{r}_{f}' for f in fs]
SEQ = {
    # locomotion / presentation
    'idle': R(2, 1, 2, 3, 4, 5, 6, 7, 8), 'walk': R(3, 1, 2, 3, 4, 5, 6, 7, 8), 'walk_back': R(3, 8, 7, 6, 5, 4, 3, 2, 1),
    'run': R(3, 1, 2, 3, 4, 5, 6, 7, 8), 'dash': R(5, 1), 'crouch': R(4, 1),
    'jump': R(4, 2, 3, 4, 5, 6, 7, 8), 'fall': R(4, 9), 'land': R(4, 10, 11),
    'guard': R(17, 1), 'hurt': R(19, 1, 3), 'hurt2': R(19, 2, 4, 5), 'hurt_air': R(18, 2),
    'knockdown': R(18, 1, 2, 3, 4, 5), 'getup': R(18, 6, 7, 8, 9, 10), 'lose': R(18, 3, 4, 5),
    'win': R(20, 1, 2, 3, 4, 5, 6, 7), 'intro': R(17, 1, 2, 3) + R(2, 1), 'taunt': R(17, 1, 2, 3, 2),
    'grab': R(8, 1, 2) + R(10, 1),
    # normals
    'light': R(6, 1, 2, 3), 'heavy': R(6, 4, 5, 6), 'eLow': R(15, 1, 2, 3), 'up': R(11, 1, 2, 3, 4, 5, 6), 'air': R(16, 1, 2),
    # specials
    'eLongArm': R(8, 1, 2, 3, 4, 5), 'eLongWhiff': R(9, 1, 2, 3), 'eLongPull': R(10, 1, 2, 3), 'eLongRecover': R(10, 4, 5, 6, 7),
    'eWhirl': R(7, 1, 2, 3, 4),
    'eDome': R(5, 1, 2, 3, 4, 5, 6, 7, 8), 'eDomeFloat': R(5, 3, 4, 5, 6), 'eDomeSlam': R(5, 6, 7, 8),
    'eWhip': R(14, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14),
    'eSling': R(12, 1, 2, 3), 'eSlingRelease': R(13, 1, 2, 3, 4, 5, 6, 7),
    # defense
    'eGuard': R(17, 1, 2, 3), 'eBounce': R(4, 5, 6, 7, 8, 10),
    # ultimate: R14 windup → the raft (R21–R24, Helen + Dash + Violet as ONE combined sprite)
    'eUltWindup': R(14, 1, 2, 3, 4, 5), 'eRaft': R(21, 1, 2, 3) + R(22, 1, 2, 3) + R(23, 1, 2, 3) + R(24, 1, 2, 3, 4, 5, 6, 7, 8),
}
LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard', 'eDomeFloat', 'eRaft'}
SPEED = {'run': 4, 'walk_back': 8, 'idle': 8, 'eRaft': 4, 'eDomeFloat': 6, 'win': 8, 'getup': 6}


def contact(cells, frames, path, S=2, title=''):
    """Row-grouped contact sheet: one band per sheet row, each cell labelled row.frame; red cross = anchor."""
    rows = {}
    for c in cells: rows.setdefault(c['row'], []).append(c)
    W = 1500
    lay, y = [], 30
    for r in sorted(rows):
        x, rh = 70, 0
        for c in rows[r]:
            w, h = c['rect'][2] * S, c['rect'][3] * S
            if x + w > W - 10: x = 70; y += rh + 22; rh = 0
            lay.append((c, x, y + 14)); x += max(w, 54) + 10; rh = max(rh, h + 14)
        y += rh + 26
    img = Image.new('RGB', (W, y + 10), (30, 34, 44))
    d = ImageDraw.Draw(img)
    d.text((8, 8), title, fill='white')
    for c, x, yy in lay:
        im = frames[c['name']]
        big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        bg = Image.new('RGB', big.size, (0, 96, 96) if c['kind'] != 'shadow' else (70, 90, 120))
        bg.paste(big, (0, 0), big)
        img.paste(bg, (x, yy))
        d.text((x, yy - 13), f"R{c['row']}.{c['frame']}", fill=(255, 230, 120))
        ax, ay = c['anchor']
        cx, cy = x + ax * S, yy + ay * S
        d.line([cx - 5, cy, cx + 5, cy], fill=(255, 60, 60)); d.line([cx, cy - 5, cx, cy + 5], fill=(255, 60, 60))
    for r in sorted(rows):
        c0 = next(l for l in lay if l[0]['row'] == r)
        d.text((8, c0[2] + 4), f'R{r}', fill=(140, 220, 255))
    img.save(path)


def main():
    assert sha(SRC) == SHA, 'sheet hash changed'
    im, a, lab, comps, excl, textpx = load()
    rows = group(a, comps)
    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    DOC.mkdir(parents=True, exist_ok=True)
    frames, cells = {}, []
    for r, fs in rows.items():
        for k, f in enumerate(fs):
            img, rect = cut(im, lab, f)
            anc, how = anchor(img, r in RAFT_ROWS)
            frames[f['name']] = img
            img.save(OUT / 'cells' / f"{f['name']}.png")
            fr = int(f['name'].split('_')[1]) if f['kind'] != 'shadow' else int(f['name'].split('_')[1])
            cells.append(dict(name=f['name'], row=r, frame=f"s{fr}" if f['kind'] == 'shadow' else fr, kind=f['kind'],
                              rect=rect, parts=[[c['x'], c['y']] for c in f['parts']], anchor=anc, anchorFrom=how,
                              opaquePixels=int((np.array(img)[..., 3] > 0).sum()),
                              sheet='raft (Helen + Dash + Violet, ultimate only)' if r in RAFT_ROWS else 'helen'))
    by = {c['name']: c for c in cells}
    anim = {}
    for action, names in SEQ.items():
        half = max(max(by[n]['anchor'][0], by[n]['rect'][2] - by[n]['anchor'][0]) for n in names) + 2
        up = max(by[n]['anchor'][1] for n in names) + 2
        down = max(by[n]['rect'][3] - by[n]['anchor'][1] for n in names) + 2
        FW, FH, OX, OY = 2 * half, up + down, half, up
        strip = Image.new('RGBA', (FW * len(names), FH))
        for i, n in enumerate(names):
            ax, ay = by[n]['anchor']
            strip.paste(frames[n], (FW * i + OX - ax, OY - ay))
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/elastigirl/{action}.png', 'frames': len(names), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': SPEED.get(action, 5),
                        'frameWidth': FW, 'frameHeight': FH, 'cells': names}
    for c in cells:
        c['usedIn'] = sorted(k for k, v in SEQ.items() if c['name'] in v)
    # FX-only cells (render layer, not strips): the R4 shadow ovals = Parachute Drop ground shadow (largest → smallest)
    fx = {c['name']: {'src': f"./assets/elastigirl/cells/{c['name']}.png", 'w': c['rect'][2], 'h': c['rect'][3]} for c in cells if c['kind'] == 'shadow'}
    for c in cells:
        if c['kind'] == 'shadow': c['usedIn'] = ['fx:parachuteShadow']
        if c['name'] == 'r1_1': c['usedIn'] = ['portrait (HUD / select)']
    unused = [c['name'] for c in cells if not c['usedIn']]
    assert not unused, ('unused frames', unused)
    # portrait: R1 (the supplied HUD head) ×4 nearest-neighbour on transparent
    por = frames['r1_1']
    por.resize((por.width * 4, por.height * 4), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    (ROOT / 'elastigirlSprites.js').write_text('// Generated by tools/elastigirl/extract.py — do not hand-edit.\n'
                                              'export const ELASTIGIRL_ANIM = ' + json.dumps(anim, indent=1) + '\n'
                                              'export const ELASTIGIRL_FX_CELLS = ' + json.dumps(fx, indent=1) + '\n')
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': 'assets/sprites/elastigirl.png (byte copy of "Game Boy Advance - The Incredibles - Playable Characters - Elastigirl.png")',
        'sha256': SHA, 'size': [600, 1623], 'background': list(BG), 'backgroundTolerance': 0,
        'excluded': {'annotationPixels(255,0,0)': 351, 'creditTextPixels': textpx, 'total': excl},
        'rows': {r: list(v) for r, v in ROWS.items()}, 'r7Bounds': R7_BOUNDS,
        'cells': cells, 'sequences': SEQ}, indent=1) + '\n')
    contact(cells, frames, DOC / 'contact_sheet.png',
            title='Elastigirl — every extracted frame, labelled R<row>.<frame>; red cross = anchor (feet baseline + torso centre). R4.s1-5 = shadow ovals (FX).')
    print(json.dumps({'cells': len(cells), 'rows': {r: len(v) for r, v in rows.items()}, 'excludedPx': excl, 'strips': len(anim)}, indent=1))


if __name__ == '__main__':
    main()
