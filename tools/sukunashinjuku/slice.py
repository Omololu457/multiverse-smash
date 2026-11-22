#!/usr/bin/env python3
"""MSV1-SUKUNA — slice the UNLABELLED "Sukuna Shinjuku" JUS-style sheet (Mrfresh, Zeltas Black, Mps, Kenny, Dark night,
Dr animation) into feet-aligned strips.

    python3 tools/sukunashinjuku/slice.py        (re-runnable; overwrites its own outputs only)

Input : assets/incoming/sukuna_shinjuku/sukuna_shinjuku.png (964x1472, flat green 34,177,76 — chroma key, exact match)
Output: assets/sukuna_shinjuku/<anim>.png     body strips, uniform cells, origin = cell centre column / feet row
        assets/sukuna_shinjuku/fx/<name>.png  effect sprites cut from the sheet (Dismantle cut, Fuga arrow, Cleave streak,
                                              World-Slash blades)
        assets/sukuna_shinjuku/portrait.png   select portrait (idle frame 0, head + shoulders, like the other fighters)
        sukunaShinjukuSprites.js              generated animation table (do not hand-edit)
        docs/msv1/sukuna/slice_report.json    every source box → output cell (LEDGER.md is built from this)

Nearest-neighbour only. Excluded (and only these): the two reference portraits (top right) and the credits text.
Every other frame and effect pixel is used. Rows are found by scanning, frames are 8-connected components; the two tiny
detached pieces (a 1-px fleck in row 5, the knee's whirl line in row 13) are merged into their nearest frame.
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/incoming/sukuna_shinjuku/sukuna_shinjuku.png')
OUT = os.path.join(ROOT, 'assets/sukuna_shinjuku')
BG = np.array([34, 177, 76])
# exclusions: the two portraits + the credits block (all of it lies at x >= 455, y < 420)
EXCL = (0, 455, 420, 964)   # y0, x0, y1, x1

img = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W, _ = img.shape
fg = np.abs(img - BG).sum(2) > 0
ex = np.zeros_like(fg); ex[EXCL[0]:EXCL[2], EXCL[1]:EXCL[3]] = True
fg_use = fg & ~ex
lab, n = nd.label(fg_use, np.ones((3, 3)))
objs = nd.find_objects(lab)
sizes = nd.sum(fg_use, lab, range(1, n + 1))

# ── rows: horizontal bands of foreground ──
rowsum = fg_use.any(1)
bands, s0 = [], None
for y, v in enumerate(rowsum):
    if v and s0 is None: s0 = y
    if not v and s0 is not None: bands.append((s0, y)); s0 = None
assert len(bands) == 17, f'expected 17 rows, found {len(bands)}'

# components per row; tiny ones (< 40 px) merge into the horizontally nearest big one of the same row
frames_by_row = []
for (y0, y1) in bands:
    ids = [i + 1 for i, sl in enumerate(objs) if sl and sl[0].start >= y0 and sl[0].stop <= y1]
    big = sorted([i for i in ids if sizes[i - 1] >= 40], key=lambda i: objs[i - 1][1].start)
    small = [i for i in ids if sizes[i - 1] < 40]
    groups = {i: [i] for i in big}
    for s in small:
        cx = (objs[s - 1][1].start + objs[s - 1][1].stop) / 2
        near = min(big, key=lambda b: abs((objs[b - 1][1].start + objs[b - 1][1].stop) / 2 - cx))
        groups[near].append(s)
    row = []
    for b in big:
        m = np.isin(lab, groups[b])
        ys, xs = np.nonzero(m)
        box = (int(ys.min()), int(xs.min()), int(ys.max()) + 1, int(xs.max()) + 1)
        a = np.zeros((box[2] - box[0], box[3] - box[1], 4), np.uint8)
        a[..., :3] = img[box[0]:box[2], box[1]:box[3]]
        a[..., 3] = np.where(m[box[0]:box[2], box[1]:box[3]], 255, 0)
        row.append((a, box, len(groups[b]) - 1))
    frames_by_row.append(row)

COUNTS = [len(r) for r in frames_by_row]
R = lambda r, *idx: [frames_by_row[r - 1][i][:2] for i in idx]
rng = lambda a, b: list(range(a, b))

# ── the sheet, row by row (docs/msv1/sukuna/LEDGER.md) ──
frames = {
    'intro': R(1, *rng(0, 10)),            # dark outer garment on (0-1) → shed (2) → white outfit (3-4) → stance (5-9)
    'idle': R(2, *rng(0, 6)),
    'walk': R(3, *rng(0, 8)),
    'lunge': R(3, 8),                      # dash start
    'jumpRise': R(4, 0, 1),                # crouch-wind-up, knee-up rise
    'fall': R(4, 2),
    'crouch': R(4, 3),                     # landing crouch → also the crouch pose (no crouch row on the sheet)
    'airAtk': R(4, 1, 2),                  # the tucked knee is the jump attack (no flip frame exists on this sheet)
    'hurt': R(5, 0, 1),
    'knockdown': R(5, 2, 3),
    'getup': R(5, 4),
    'lose': R(5, 3),
    'handSign': R(6, *rng(0, 6)),          # Malevolent Shrine cast: the hands meet at the chest (frames 3-5)
    'guard': R(6, 6, 7),                   # the crossed-arm frames → guard
    'chant': R(6, 8, 9, 10),               # World-Cutting Slash chant poses (+ Domain Amplification stance)
    'fan': R(6, *rng(11, 17)),             # three streaked hand swipes → Dismantle fan (hold Special)
    'dismantle': R(7, 0, 1, 2, 3),         # finger raised → the crescent leaves the hand → point
    'dashAtk': R(7, 4, 5, 6, 7),           # crouch, beige crescent sweep, lunge, low dive
    'cleave': R(8, *rng(0, 6)),
    'aStr': R(9, *rng(0, 5)),
    'spiderweb': R(10, *rng(0, 5)),        # the diagonal downward cut → Cleave driven into the ground
    'heavy': R(11, *rng(0, 5)),
    'kick': R(12, *rng(0, 5)),
    'knee': R(13, *rng(0, 4)),
    'fuga': R(14, *rng(0, 10)),            # 0-5 the flame gathers in the hands, 6-8 the arrow forms, 9 release
    'win': R(15, *rng(0, 4)),
    'worldSlash': R(16, *rng(0, 6)),       # arm raised, thin blades above the head (air / upward Dismantle, World Slash)
    'run': R(17, *rng(0, 6)),
}
SPEC = {'intro': 8, 'idle': 8, 'walk': 5, 'lunge': 6, 'jumpRise': 6, 'fall': 6, 'crouch': 4, 'airAtk': 4, 'hurt': 6,
        'knockdown': 8, 'getup': 8, 'lose': 10, 'handSign': 6, 'guard': 6, 'chant': 8, 'fan': 4, 'dismantle': 4,
        'dashAtk': 4, 'cleave': 3, 'aStr': 3, 'spiderweb': 4, 'heavy': 4, 'kick': 4, 'knee': 4, 'fuga': 6, 'win': 10,
        'worldSlash': 5, 'run': 4}
# composite strips (one strip per engine state)
COMPOSE = {'dash': [('lunge', 0)] + [('run', i) for i in range(6)],
           'domainCast': [('handSign', i) for i in range(6)],
           'amp': [('chant', 0), ('handSign', 4)],
           'worldFull': [('chant', i) for i in range(3)] + [('worldSlash', i) for i in range(6)],   # chant → hand sign → cut
           'fugaFire': [('fuga', 9), ('fuga', 0)]}                                                    # release → recovery
SPEC.update({'dash': 4, 'domainCast': 6, 'amp': 8, 'worldFull': 8, 'fugaFire': 6})
for name, parts in COMPOSE.items(): frames[name] = [frames[a][i] for a, i in parts]
LYING = {('knockdown', 1), ('lose', 0), ('dashAtk', 3)}


def anchor_x(a, name, i):
    al = a[..., 3] > 0
    ys = np.nonzero(al.any(1))[0]
    band = al[ys.max() - 5:ys.max() + 1] if (name, i) in LYING else al[ys.min():ys.min() + 14]
    xs = np.nonzero(band.any(0))[0]
    return (xs.min() + xs.max() + 1) / 2


def build(name, fr):
    ax = [anchor_x(t, name, i) for i, (t, _) in enumerate(fr)]
    half = int(np.ceil(max(max(ax), max(t.shape[1] - a for (t, _), a in zip(fr, ax)))))
    cw, ch = 2 * half, max(t.shape[0] for t, _ in fr)
    sheet = np.zeros((ch, cw * len(fr), 4), np.uint8)
    cells = []
    for i, ((t, src), a) in enumerate(zip(fr, ax)):
        ox = int(round(half - a)) + i * cw
        oy = ch - t.shape[0]
        sheet[oy:oy + t.shape[0], ox:ox + t.shape[1]] = t
        cells.append({'src': list(map(int, src)), 'cell': i, 'dx': int(ox - i * cw), 'dy': int(oy)})
    return sheet, cw, ch, cells


def crop_fx(t, keep):
    a = t.copy(); a[..., 3] = np.where(keep & (a[..., 3] > 0), 255, 0)
    ys, xs = np.nonzero(a[..., 3])
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def cols_from(t, c0, c1=None):
    k = np.zeros(t.shape[:2], bool); k[:, c0:c1] = True; return k


def grey(t):
    r, g, b = (t[..., i].astype(int) for i in range(3))
    return (np.abs(r - g) < 12) & (np.abs(g - b) < 12)


def flame(t):
    r, g, b = (t[..., i].astype(int) for i in range(3))
    return (r >= 150) & (b <= 70) & (r - b >= 120)


# ── effect sprites (cut from frames that are ALSO used whole in the body strips) ──
d2 = frames['dismantle'][2][0]
f9 = frames['fuga'][9][0]
c2 = frames['cleave'][2][0]
w2 = frames['worldSlash'][2][0]
# the crescent right of the hand (columns past the fingertips); the flame arrow = the flame-coloured pixels of the
# release frame; Cleave's streak = the pink trail left of the body; the World-Slash blades = the pixels above the head
hand_col = int(np.nonzero((d2[..., 3] > 0)[22:32].any(0))[0].max()) - 15
fx = {
    'dismantleCut': crop_fx(d2, cols_from(d2, hand_col) & (np.arange(d2.shape[0])[:, None] < 40)),
    'fugaArrow': crop_fx(f9, flame(f9)),
    'cleaveStreak': crop_fx(c2, cols_from(c2, 0, 10) & (np.arange(c2.shape[0])[:, None] < 30)),
    'worldBlades': crop_fx(w2, cols_from(w2, 0, 21) & (np.arange(w2.shape[0])[:, None] < 16) & grey(w2)),
}
os.makedirs(os.path.join(OUT, 'fx'), exist_ok=True)
report = {'source': os.path.relpath(SRC, ROOT), 'size': [W, H], 'bg': BG.tolist(), 'rows': [], 'anims': {}, 'fx': {},
          'excluded': {'box': list(EXCL), 'what': 'two reference portraits + the credits text "Credits:Mrfresh / Zeltas Black / Mps / Kenny / Dark night / Dr animation"'},
          'keyCheck': {}}
for i, ((y0, y1), r) in enumerate(zip(bands, frames_by_row)):
    report['rows'].append({'row': i + 1, 'y': [y0, y1], 'frames': len(r), 'boxes': [list(map(int, b)) for _, b, _ in r],
                           'mergedFragments': sum(m for *_, m in r)})
d = np.abs(img - BG).sum(2)
report['keyCheck'] = {'minDistanceInSprites': int(d[fg_use].min()), 'greenDominantSpritePixels': int((fg_use & (img[..., 1] > img[..., 0] + 30) & (img[..., 1] > img[..., 2] + 30)).sum())}
anim = {}
for name, fr in frames.items():
    sheet, cw, ch, cells = build(name, fr)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, f'{name}.png'))
    anim[name] = {'sheet': f'./assets/sukuna_shinjuku/{name}.png', 'frames': len(fr), 'width': cw, 'height': ch,
                  'originX': cw // 2, 'originY': ch - 1, 'anchorY': 0, 'speed': SPEC[name], 'frameWidth': cw, 'frameHeight': ch}
    report['anims'][name] = {'frames': len(fr), 'cell': [cw, ch], 'cells': cells}
for name, t in fx.items():
    Image.fromarray(t, 'RGBA').save(os.path.join(OUT, 'fx', f'{name}.png'))
    report['fx'][name] = {'size': [t.shape[1], t.shape[0]]}

t0 = frames['idle'][0][0]
crop = t0[:26]
por = Image.fromarray(crop, 'RGBA').resize((crop.shape[1] * 4, crop.shape[0] * 4), Image.NEAREST)
canvas = Image.new('RGBA', (128, 104), (0, 0, 0, 0)); canvas.paste(por, ((128 - por.width) // 2, 104 - por.height), por)
canvas.save(os.path.join(OUT, 'portrait.png'))

with open(os.path.join(ROOT, 'sukunaShinjukuSprites.js'), 'w') as f:
    f.write('// Generated by tools/sukunashinjuku/slice.py — do not hand-edit. 1x original pixels from the Sukuna Shinjuku sheet\n')
    f.write('// (Mrfresh, Zeltas Black, Mps, Kenny, Dark night, Dr animation); drawn at SKS_SCALE (integer, nearest-neighbour).\n')
    f.write('// Symmetric cells: originX = cell centre, originY = feet row.\n')
    f.write('export const SUKUNA_SHINJUKU_ANIM = ' + json.dumps(anim, indent=1) + '\n')
    f.write('export const SUKUNA_SHINJUKU_FX = ' + json.dumps({k: {'sheet': f'./assets/sukuna_shinjuku/fx/{k}.png', 'w': v['size'][0], 'h': v['size'][1]} for k, v in report['fx'].items()}) + '\n')
os.makedirs(os.path.join(ROOT, 'docs/msv1/sukuna'), exist_ok=True)
with open(os.path.join(ROOT, 'docs/msv1/sukuna/slice_report.json'), 'w') as f:
    json.dump(report, f, indent=1)
print('row counts:', COUNTS, 'total', sum(COUNTS))
print('key check:', report['keyCheck'])
for k, v in report['anims'].items(): print(f"  {k:12s} {v['frames']:2d} frames  cell {v['cell']}")
print('fx:', {k: v['size'] for k, v in report['fx'].items()})
