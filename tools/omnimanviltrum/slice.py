#!/usr/bin/env python3
"""MSV1-OMNIMAN — slice the Omni-Man sheet (assets/incoming/omniman/omniman.png, 610x1032, flat muted purple
RGB(140,70,130)) into feet-aligned strips for the NEW fighter `omniman_viltrum` (the old `omniman` is untouched).

    python3 tools/omnimanviltrum/slice.py        (re-runnable; overwrites its own outputs only)

Output: assets/omniman_viltrum/<anim>.png      body strips, uniform cells, origin = cell centre column / feet row
        assets/omniman_viltrum/fx/<name>.png   effect strips cut from row 13 (sonic-boom bars, pink afterimage)
        assets/omniman_viltrum/icon_<n>.png    the three tiny head icons (HUD / select)
        assets/omniman_viltrum/portrait.png    select portrait (idle frame 0, head + shoulders)
        omnimanViltrumSprites.js               generated animation table (do not hand-edit)
        docs/msv1/omniman/slice_report.json    every source box → output cell (LEDGER.md is built from it)

KEY: exact colour match on RGB(140,70,130) (tolerance 0). The row-13 pink afterimage is checked to survive intact
(its nearest pixel to the background is reported). Nearest-neighbour only. No credit text on this sheet.
Frames = 8-connected components; fragments < 150 px (speed streaks, impact streaks, cuff glints) merge into the nearest
body of the same row. Row 13's left zone (x < 93: three white boom bars + the striped pink afterimage) is cut by column
gaps instead (the afterimage is made of 1-px vertical stripes).
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/incoming/omniman/omniman.png')
OUT = os.path.join(ROOT, 'assets/omniman_viltrum')
DOC = os.path.join(ROOT, 'docs/msv1/omniman')
BG = np.array([140, 70, 130])
FX_ZONE_X = 93       # row 13: x < this = boom bars + afterimage

img = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W, _ = img.shape
dist = np.abs(img - BG).sum(2)
fg = dist > 0
lab, n = nd.label(fg, np.ones((3, 3)))
objs = nd.find_objects(lab)
sizes = nd.sum(fg, lab, range(1, n + 1))

rowsum = fg.any(1)
bands, s0 = [], None
for y, v in enumerate(rowsum):
    if v and s0 is None: s0 = y
    if not v and s0 is not None: bands.append((s0, y)); s0 = None
if s0 is not None: bands.append((s0, H))
assert len(bands) == 14, f'expected 14 rows, found {len(bands)}'


def cut(mask):
    ys, xs = np.nonzero(mask)
    box = (int(ys.min()), int(xs.min()), int(ys.max()) + 1, int(xs.max()) + 1)
    a = np.zeros((box[2] - box[0], box[3] - box[1], 4), np.uint8)
    a[..., :3] = img[box[0]:box[2], box[1]:box[3]]
    a[..., 3] = np.where(mask[box[0]:box[2], box[1]:box[3]], 255, 0)
    return a, box


rows = []
for ri, (y0, y1) in enumerate(bands):
    ids = [i + 1 for i, sl in enumerate(objs) if sl and sl[0].start >= y0 and sl[0].stop <= y1]
    zone = []
    if ri == 12:   # row 13: column-gap groups left of FX_ZONE_X
        zone = [i for i in ids if objs[i - 1][1].stop <= FX_ZONE_X]
        ids = [i for i in ids if i not in zone]
    big = sorted([i for i in ids if sizes[i - 1] >= 150], key=lambda i: objs[i - 1][1].start)
    small = [i for i in ids if sizes[i - 1] < 150]
    groups = {b: [b] for b in big}
    cx = lambda i: (objs[i - 1][1].start + objs[i - 1][1].stop) / 2
    for s in small:
        groups[min(big, key=lambda b: abs(cx(b) - cx(s)))].append(s)
    row = []
    if zone:
        m = np.isin(lab, zone); cols = np.nonzero(m.any(0))[0]
        runs, st = [], cols[0]
        for a_, b_ in zip(cols, cols[1:]):
            if b_ - a_ > 2: runs.append((st, a_ + 1)); st = b_
        runs.append((st, cols[-1] + 1))
        for (c0, c1) in runs:
            mm = m.copy(); mm[:, :c0] = False; mm[:, c1:] = False
            a, box = cut(mm); row.append((a, box, 0, 'fx'))
    for b in big:
        a, box = cut(np.isin(lab, groups[b])); row.append((a, box, len(groups[b]) - 1, 'body'))
    row.sort(key=lambda t: (t[1][1], t[1][0]))
    rows.append(row)

COUNTS = [len(r) for r in rows]
# R1 = 2 stacked head icons (left) + 7 idle + 1 head icon (far right): sort by x put the two left icons first
R = lambda r, *idx: [rows[r - 1][i][:2] for i in idx]
rng = lambda a, b: list(range(a, b))

# row 1 order after the x-sort: [iconA, iconB, idle0..idle6, iconC]
ICONS = R(1, 0, 1, 9)
IDLE7 = R(1, *rng(2, 9))
R13FX = R(13, 0, 1, 2, 3)          # boom bar 1, 2, 3, pink afterimage
R13B = R(13, *rng(4, 12))          # takeoff 0-4 (cape flips up in 2-4), landing 5-6, get-up 7

frames = {
    # ── idle / stance ──
    'idle': [IDLE7[i] for i in (0, 1, 2, 5, 6)] + R(2, 0, 1, 2),   # arms folded; the two eye-glint frames are NOT in the idle loop
    'glint': [IDLE7[3], IDLE7[4]],                                  # R1 frames 4-5: the blue EYE GLINT (Unimpressed's only tell)
    'turn': R(9, 2) + R(2, 1),                                      # cape-wrapped upright → arms folded (ground turnaround)
    'walk': R(6, *rng(0, 6)),
    'fly': R(6, 6, 7),                                              # horizontal flight with speed streaks
    'takeoff': [R13B[i] for i in (0, 1)],
    'hover': [R13B[0]],
    'brake': [R13B[i] for i in (2, 3, 4)],                          # cape flipped upward
    'landHard': [R13B[5], R13B[6]],                                 # crouched landing, cape draped
    'getup': [R13B[7]],
    'land': R(14, 0, 1),                                            # ordinary jump landing / crouch-landing
    'crouch': R(9, 3),
    'guard': R(9, 0),                                               # standing guard: fist up (no dedicated guard frames)
    'crouchGuard': R(9, 1),
    'hurt': R(10, 1, 0),                                            # dark silhouette impact frame → recoil
    'knockdown': R(9, 5, 6),
    # ── attacks ──
    'jab': R(7, 0, 1),
    'straight': R(5, 0, 1, 2),
    'haymaker': R(3, 0, 1, 2, 5),                                   # cape-swirl wind-up, wind-up, swing (red streak), recover
    'blitz': R(3, 3, 4),                                            # lunging dash punch
    'low': R(8, 0, 1),
    'kick': R(11, 0, 1, 2),
    'flightPunch': R(4, 0, 1),
    'stepPunch': R(9, 4),                                           # the backhand / short Blitz finish
    'point': R(12, *rng(0, 5)),                                     # VILTRUM DECREE
    'uppercut': R(10, 0),                                           # fist straight up (Sky Hook rise; the ultimate's ascent pose)
}
SPEC = {'idle': 10, 'glint': 6, 'turn': 4, 'walk': 4, 'fly': 4, 'takeoff': 4, 'hover': 8, 'brake': 3, 'landHard': 6,
        'getup': 8, 'land': 4, 'crouch': 6, 'guard': 6, 'crouchGuard': 6, 'hurt': 6, 'knockdown': 8, 'jab': 3,
        'straight': 3, 'haymaker': 4, 'blitz': 3, 'low': 3, 'kick': 3, 'flightPunch': 3, 'stepPunch': 4, 'point': 8,
        'uppercut': 6}
COMPOSE = {
    'intro': [('landHard', 0), ('landHard', 1), ('getup', 0), ('idle', 0)],
    'win': [('glint', 0), ('glint', 1), ('idle', 0)],
    'lose': [('knockdown', 1)],
    'unimpressed': [('glint', 0), ('glint', 1), ('idle', 0), ('idle', 1)],
    'backhand': [('stepPunch', 0), ('jab', 1)],
    'skyHook': [('low', 0), ('uppercut', 0), ('takeoff', 0), ('takeoff', 1)],
    'meteor': [('fly', 1), ('fly', 0)],
    'meteorLand': [('landHard', 0), ('landHard', 1)],
    'crash': [('knockdown', 0), ('knockdown', 1)],
    'grabRush': [('blitz', 0), ('blitz', 1), ('fly', 0), ('fly', 1)],
    'throwSlam': [('haymaker', 2), ('haymaker', 3)],
    'ascent': [('uppercut', 0)],
    'orbitHold': [('flightPunch', 1)],
    'returnPunch': [('haymaker', 0), ('haymaker', 1), ('haymaker', 2)],
    'dashShort': [('blitz', 0), ('stepPunch', 0)],
}
SPEC.update({'intro': 10, 'win': 12, 'lose': 10, 'unimpressed': 6, 'backhand': 4, 'skyHook': 4, 'meteor': 3,
             'meteorLand': 6, 'crash': 8, 'grabRush': 3, 'throwSlam': 5, 'ascent': 6, 'orbitHold': 8, 'returnPunch': 4,
             'dashShort': 4})
for name, parts in COMPOSE.items(): frames[name] = [frames[a][i] for a, i in parts]
FLAT = {id(t) for name in ('fly', 'knockdown', 'meteor', 'crash', 'lose', 'grabRush') for t, _ in frames[name]}


def anchor_x(a):
    al = a[..., 3] > 0
    if id(a) in FLAT:   # horizontal bodies: centre of the whole box
        xs = np.nonzero(al.any(0))[0]
    else:               # standing bodies: centre of the head band (top 14 rows) → the body doesn't slide between frames
        ys = np.nonzero(al.any(1))[0]
        xs = np.nonzero(al[ys.min():ys.min() + 14].any(0))[0]
    return (xs.min() + xs.max() + 1) / 2


def build(fr):
    ax = [anchor_x(t) for t, _ in fr]
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


def strip_fx(fr):   # fx strip: bottom-aligned, centred cells
    cw = max(t.shape[1] for t, _ in fr); ch = max(t.shape[0] for t, _ in fr)
    sheet = np.zeros((ch, cw * len(fr), 4), np.uint8)
    for i, (t, _) in enumerate(fr):
        ox = i * cw + (cw - t.shape[1]) // 2; oy = ch - t.shape[0]
        sheet[oy:oy + t.shape[0], ox:ox + t.shape[1]] = t
    return sheet, cw, ch


os.makedirs(os.path.join(OUT, 'fx'), exist_ok=True)
report = {'source': os.path.relpath(SRC, ROOT), 'size': [W, H], 'bg': BG.tolist(), 'tolerance': 0, 'rows': [], 'anims': {},
          'fx': {}, 'icons': [], 'excluded': 'nothing (no credit text on this sheet)'}
for i, ((y0, y1), r) in enumerate(zip(bands, rows)):
    report['rows'].append({'row': i + 1, 'y': [y0, y1], 'pieces': len(r), 'boxes': [list(map(int, b)) for _, b, _, _ in r],
                           'kinds': [k for *_, k in r], 'mergedFragments': sum(m for _, _, m, _ in r)})
# key check — every sprite pixel is >0 from the background; the pink afterimage's nearest distance is the risky one
aft, abox = R13FX[3]
am = aft[..., 3] > 0
adist = np.abs(aft[..., :3].astype(int) - BG).sum(2)[am]
src_mask = fg[abox[0]:abox[2], abox[1]:abox[3]]
report['keyCheck'] = {'minDistanceInSprites': int(dist[fg].min()), 'afterimagePixels': int(am.sum()),
                      'afterimageSourcePixels': int(src_mask.sum()), 'afterimageMinDistance': int(adist.min()),
                      'afterimageIntact': bool(am.sum() == src_mask.sum()),
                      'pixelsWithin40OfBg': int(((dist > 0) & (dist <= 40)).sum())}
anim = {}
for name, fr in frames.items():
    sheet, cw, ch, cells = build(fr)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, f'{name}.png'))
    anim[name] = {'sheet': f'./assets/omniman_viltrum/{name}.png', 'frames': len(fr), 'width': cw, 'height': ch,
                  'originX': cw // 2, 'originY': ch - 1, 'anchorY': 0, 'speed': SPEC[name], 'frameWidth': cw, 'frameHeight': ch}
    report['anims'][name] = {'frames': len(fr), 'cell': [cw, ch], 'cells': cells}
fxs = {'boom': R13FX[0:3], 'afterimage': [R13FX[3]]}
for name, fr in fxs.items():
    sheet, cw, ch = strip_fx(fr)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'fx', f'{name}.png'))
    report['fx'][name] = {'frames': len(fr), 'cell': [cw, ch], 'src': [list(map(int, b)) for _, b in fr]}
for k, (t, b) in enumerate(ICONS):
    Image.fromarray(t, 'RGBA').save(os.path.join(OUT, f'icon_{k}.png'))
    report['icons'].append({'file': f'icon_{k}.png', 'src': list(map(int, b)), 'size': [t.shape[1], t.shape[0]]})

# select / HUD portrait = the sheet's own tiny head icon (R1, first), ×6 nearest-neighbour
ic = ICONS[0][0]
por = Image.fromarray(ic, 'RGBA').resize((ic.shape[1] * 6, ic.shape[0] * 6), Image.NEAREST)
canvas = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); canvas.paste(por, ((128 - por.width) // 2, 128 - por.height), por)
canvas.save(os.path.join(OUT, 'portrait.png'))

# every source piece must be used by at least one strip / fx / icon
used = {tuple(c['src']) for a in report['anims'].values() for c in a['cells']} | {tuple(s) for f in report['fx'].values() for s in f['src']} | {tuple(i['src']) for i in report['icons']}
allp = [tuple(b) for r in report['rows'] for b in r['boxes']]
report['unused'] = [list(b) for b in allp if b not in used]

with open(os.path.join(ROOT, 'omnimanViltrumSprites.js'), 'w') as f:
    f.write('// Generated by tools/omnimanviltrum/slice.py — do not hand-edit. 1x original pixels from the Omni-Man sheet\n')
    f.write('// (assets/incoming/omniman/omniman.png); drawn at OMV_SCALE (integer, nearest-neighbour). originX = cell centre, originY = feet row.\n')
    f.write('export const OMNIMAN_VILTRUM_ANIM = ' + json.dumps(anim, indent=1) + '\n')
    f.write('export const OMNIMAN_VILTRUM_FX = ' + json.dumps({k: {'sheet': f'./assets/omniman_viltrum/fx/{k}.png', 'frames': v['frames'], 'w': v['cell'][0], 'h': v['cell'][1]} for k, v in report['fx'].items()}) + '\n')
    f.write('export const OMNIMAN_VILTRUM_ICONS = ' + json.dumps([f"./assets/omniman_viltrum/{i['file']}" for i in report['icons']]) + '\n')
os.makedirs(DOC, exist_ok=True)
with open(os.path.join(DOC, 'slice_report.json'), 'w') as f:
    json.dump(report, f, indent=1)
print('row pieces:', COUNTS, 'total', sum(COUNTS))
print('key check:', report['keyCheck'])
print('unused pieces:', report['unused'])
for k, v in report['anims'].items(): print(f"  {k:12s} {v['frames']:2d} frames  cell {v['cell']}")
print('fx:', {k: v['cell'] for k, v in report['fx'].items()}, 'icons:', [i['size'] for i in report['icons']])
