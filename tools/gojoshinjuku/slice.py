#!/usr/bin/env python3
"""MSV1-GOJO — slice the labelled FinhJ "Satoru Gojo Shinjuku Arc" sheet into feet-aligned strips.

    python3 tools/gojoshinjuku/slice.py            (re-runnable; overwrites its own outputs only)

Input : assets/incoming/gojo_shinjuku/gojo_shinjuku.png  (790x1780, flat dark-indigo background 33,31,63)
Output: assets/gojo_shinjuku/<anim>.png   body strips, uniform cells, symmetric origin (cell centre / feet row)
        assets/gojo_shinjuku/fx/<name>.png effect sprites (Blue orb, merge circles, dome, 4 chant strips)
        assets/gojo_shinjuku/portrait.png  select portrait (built from stand frame 0, like the other characters)
        gojoShinjukuSprites.js             generated animation table (do not hand-edit)
        docs/msv1/gojo/slice_report.json   every source box → output cell (the ledger is built from this)

Nearest-neighbour only. Excluded (and only these): the header banner (y < 196), the white row labels, the two divider
lines, and the coloured box borders (boxed frames are cropped INSIDE the border). Everything else is used.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/incoming/gojo_shinjuku/gojo_shinjuku.png')
OUT = os.path.join(ROOT, 'assets/gojo_shinjuku')
BG = np.array([33, 31, 63])
HEADER_BOTTOM = 196

img = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W, _ = img.shape
fg = np.abs(img - BG).sum(2) > 18
fg[:HEADER_BOTTOM] = False
lab, _n = nd.label(nd.binary_dilation(fg, iterations=2))


def comp_at(y, x):
    """label id of the (dilated) component containing / nearest to (y, x)"""
    l = lab[y, x]
    if l: return l
    ys, xs = np.nonzero(lab[max(0, y - 6):y + 7, max(0, x - 6):x + 7])
    if not len(ys): raise SystemExit(f'no component near {(y, x)}')
    return lab[max(0, y - 6) + ys[0], max(0, x - 6) + xs[0]]


def pixels(box, label=None, keep=None):
    """RGBA crop of box (y0,x0,y1,x1); bg → transparent; optionally only pixels of one component label"""
    y0, x0, y1, x1 = box
    rgb = img[y0:y1, x0:x1]
    m = fg[y0:y1, x0:x1].copy()
    if label is not None: m &= lab[y0:y1, x0:x1] == label
    if keep is not None: m &= keep[y0:y1, x0:x1]
    a = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    a[..., :3] = rgb; a[..., 3] = np.where(m, 255, 0)
    return a


def tight(a):
    ys, xs = np.nonzero(a[..., 3])
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (int(ys.min()), int(xs.min()))


def drop_label(a):
    """remove a white row label merged into the top of a sprite: pure-white rows above the first row that holds any
    non-white sprite pixel (outline / shading)"""
    al = a[..., 3] > 0
    white = (a[..., 0] == 255) & (a[..., 1] == 255) & (a[..., 2] == 255)
    rows = np.nonzero((al & ~white).any(1))[0]
    first = rows.min()
    a = a.copy(); a[:first, :, 3] = 0
    # also any white run in rows just below that is disconnected from the body is label (glyph descenders)
    return a


def comp_box(label):
    ys, xs = np.nonzero(lab == label)
    return int(ys.min()), int(xs.min()), int(ys.max()) + 1, int(xs.max()) + 1


def body(y, x, fix=None):
    l = comp_at(y, x)
    a = pixels(comp_box(l), label=l)
    if fix == 'label': a = drop_label(a)
    t, off = tight(a)
    b = comp_box(l)
    return t, (b[0] + off[0], b[1] + off[1], b[0] + off[0] + t.shape[0], b[1] + off[1] + t.shape[1])


def inside_box(y, x):
    """boxed frame: find the 1-px coloured border rectangle around (y, x) and crop inside it"""
    l = comp_at(y, x)
    y0, x0, y1, x1 = comp_box(l)
    sub = img[y0:y1, x0:x1]
    nonbg = np.abs(sub - BG).sum(2) > 18
    # border colour = the most common colour on the outermost non-bg column
    col = sub[:, np.nonzero(nonbg.any(0))[0][0]]
    vals, counts = np.unique(col[nonbg[:, np.nonzero(nonbg.any(0))[0][0]]], axis=0, return_counts=True)
    bc = vals[counts.argmax()]
    isb = np.abs(sub - bc).sum(2) <= 40          # tolerant: an effect glow may cross the border line
    rows = np.nonzero(isb.sum(1) > 0.6 * isb.shape[1])[0]
    cols = np.nonzero(isb.sum(0) > 0.6 * isb.shape[0])[0]
    by0, by1, bx0, bx1 = rows.min(), rows.max(), cols.min(), cols.max()
    # border thickness: consecutive border rows/cols from each side
    def thick(idx, start, step):
        t = 0
        while start + t * step in idx: t += 1
        return max(t, 1)
    ty, tb = thick(set(rows), by0, 1), thick(set(rows), by1, -1)
    tl, tr = thick(set(cols), bx0, 1), thick(set(cols), bx1, -1)
    box = (y0 + by0 + ty, x0 + bx0 + tl, y0 + by1 - tb + 1, x0 + bx1 - tr + 1)
    a = pixels(box)
    edge = np.zeros(a.shape[:2], bool); edge[0, :] = edge[-1, :] = True; edge[:, 0] = edge[:, -1] = True
    a[edge & (np.abs(a[..., :3].astype(int) - bc).sum(2) <= 40), 3] = 0   # border-coloured pixels touching the inner edge
    t, off = tight(a)
    return t, (box[0] + off[0], box[1] + off[1], box[0] + off[0] + t.shape[0], box[1] + off[1] + t.shape[1]), [int(v) for v in bc], (int(y0 + by0), int(x0 + bx0), int(y0 + by1 + 1), int(x0 + bx1 + 1))


def split_orb(y, x, xsplit_lo, xsplit_hi):
    """the Maximum Output pose and the large Blue orb touch on the sheet (one component). Orb pixels are the blue-dominant
    glow + the bright core right of the emptiest column; everything else (skin, outline, clothes) is the pose."""
    l = comp_at(y, x)
    y0, x0, y1, x1 = comp_box(l)
    m = fg[y0:y1, x0:x1] & (lab[y0:y1, x0:x1] == l)
    sub = img[y0:y1, x0:x1]
    cs = m.sum(0)
    lo, hi = xsplit_lo - x0, xsplit_hi - x0
    cut = lo + int(np.argmin(cs[lo:hi]))
    cols = np.arange(x1 - x0)[None, :]
    rows_ = np.arange(y1 - y0)[:, None]
    core = m & (sub.min(2) > 200) & (cols >= cut)                  # the white-cyan core → circle centre
    cy, cx = np.nonzero(core); cy, cx = cy.mean(), cx.mean()
    rad = np.sqrt((rows_ - cy) ** 2 + (cols - cx) ** 2)
    R = (np.nonzero(m & (cols >= cut))[1].max() - cx) + 0.5          # right edge of the glow = the orb radius
    bluish = sub[..., 2].astype(int) > sub[..., 0].astype(int) + 15   # glow + dark navy ring; skin / fingertip are not
    orb = m & (rad <= R) & bluish
    left = cols < cx - 0.6 * R
    finger = orb & left & ((sub.min(2) > 120) | ((sub[..., 0] > 70) & (sub[..., 1] < sub[..., 0] + 30)))   # lilac fingertip (warm red channel) pushed into the glow
    orb &= ~finger
    big = lambda k: (lambda L, n: L == (1 + int(np.argmax(nd.sum(k, L, range(1, n + 1))))) if n else k)(*nd.label(k, np.ones((3, 3))))
    orb = big(orb)
    pose = big(m & ~orb & ~finger) | finger
    parts = []
    for keep in (pose, orb):
        full = np.zeros(fg.shape, bool); full[y0:y1, x0:x1] = keep
        a = pixels((y0, x0, y1, x1), keep=full)
        if keep is orb:                                       # rebuild the hand-covered left half by mirroring the right half
            oy, ox = np.nonzero(orb)
            c = int(round(ox.max() - (oy.max() - oy.min()) / 2))   # true centre: right glow edge minus the vertical radius
            for dx in range(1, c + 1):
                if c + dx < a.shape[1]: a[:, c - dx] = a[:, c + dx]
                else: a[:, c - dx, 3] = 0
        t, off = tight(a)
        parts.append((t, (y0 + off[0], x0 + off[1], y0 + off[0] + t.shape[0], x0 + off[1] + t.shape[1])))
    return parts, x0 + cut


def chant(xlo, xhi, ylo=1515, yhi=1625):
    """a vertical chant strip = the purple caption box (85,41,120) + its white letters, nothing else"""
    sub = img[ylo:yhi, xlo:xhi]
    pur = (sub == [85, 41, 120]).all(2)
    ys, xs = np.nonzero(pur)
    box = (ylo + ys.min(), xlo + xs.min(), ylo + ys.max() + 1, xlo + xs.max() + 1)
    a = pixels(box)
    a[..., 3] = 255                               # the caption box is opaque by design (purple plate + letters)
    return a, tuple(int(v) for v in box)


# ── the sheet, row by row (sample points are inside each sprite; see docs/msv1/gojo/LEDGER.md) ──
def row(y, xs, fix=None): return [body(y, x, fix) for x in xs]

frames = {}
frames['intro'] = row(250, [20, 55, 90, 134, 175])
frames['win'] = row(340, [17, 46, 80, 115])
frames['idle'] = row(425, [18, 51, 83, 115])
frames['walk'] = row(510, [16, 52, 85, 118, 152, 189, 229, 268])
frames['dash'] = row(585, [33])
frames['crouch'] = row(675, [21, 59, 99, 145])
frames['jump'] = [body(740, 24, 'label')] + row(750, [69, 121, 165])
frames['guard'] = row(830, [21, 71])
frames['hit'] = row(915, [25, 68, 114, 177, 258, 326])
frames['ultAction'] = row(990, [23, 61, 100])
frames['a'] = row(1075, [20, 62, 105, 152, 202, 244])
frames['b'] = row(1155, [18, 59, 110, 176, 231])
frames['c'] = row(1230, [24, 77, 135, 194, 243])
frames['red'] = row(1312, [20, 58, 94, 140, 191])
frames['redRush'] = row(1310, [258, 296, 343, 400])
rb = inside_box(1310, 467)
frames['redRushBox'] = [(rb[0], rb[1])]
frames['lapseBlue'] = row(1395, [22, 67, 115, 161])
mo4 = row(1395, [224, 267, 322, 372])
(mo_pose, mo_orb), mo_cut = split_orb(1395, 440, 452, 475)
frames['maxBlue'] = mo4 + [mo_pose]
frames['domain'] = row(1480, [20, 63, 101, 149])
frames['purple200'] = row(1585, [29, 87, 147, 208, 268, 326])
pb = inside_box(1570, 467)
frames['purple200Fire'] = [(pb[0], pb[1])]
frames['purple'] = row(1715, [17, 55, 91, 137, 181, 232])
hb = inside_box(1715, 293)
frames['purpleRaise'] = [(hb[0], hb[1])]
frames['purpleFire'] = row(1715, [443, 474, 513])
frames['purpleEnd'] = row(1715, [725])

fx = {}
fx['blueOrb'] = mo_orb
fx['mergeCircles'] = body(1700, 380)
fx['dome'] = body(1700, 615)
chants = [chant(38, 62), chant(100, 126), chant(214, 242), chant(346, 374)]

# ── anchors: the head (top 14 rows of opaque pixels) gives the body column for upright frames; lying / effect-wide
#    frames use the feet (bottom 6 rows). The anchor sits on the cell's centre column and the cell's bottom row. ──
LYING = {('hit', 2), ('hit', 3), ('hit', 4), ('dash', 0)}


def anchor_x(a, name, i):
    al = a[..., 3] > 0
    ys = np.nonzero(al.any(1))[0]
    if (name, i) in LYING:
        band = al[ys.max() - 5:ys.max() + 1]
    else:
        band = al[ys.min():ys.min() + 14]
    xs = np.nonzero(band.any(0))[0]
    return (xs.min() + xs.max() + 1) / 2


# boxed frames carry an effect on one side: anchor on the head like any body frame, which keeps the body steady
def build(name, fr):
    ax = [anchor_x(t, name, i) for i, (t, _) in enumerate(fr)]
    left = max(a for a in ax)
    right = max(t.shape[1] - a for (t, _), a in zip(fr, ax))
    half = int(np.ceil(max(left, right)))
    cw, ch = 2 * half, max(t.shape[0] for t, _ in fr)
    sheet = np.zeros((ch, cw * len(fr), 4), np.uint8)
    cells = []
    for i, ((t, src), a) in enumerate(zip(fr, ax)):
        ox = int(round(half - a)) + i * cw
        oy = ch - t.shape[0]
        sheet[oy:oy + t.shape[0], ox:ox + t.shape[1]] = t
        cells.append({'src': list(map(int, src)), 'cell': i, 'dx': int(ox - i * cw), 'dy': int(oy)})
    return sheet, cw, ch, cells


SPEC = {  # speed = sim ticks per frame for looping / default playback (moves use frameTimeline from gojoShinjukuData.js)
    'intro': 7, 'win': 9, 'idle': 8, 'walk': 5, 'dash': 6, 'crouch': 4, 'jump': 6, 'guard': 6, 'hit': 6, 'ultAction': 6,
    'a': 3, 'b': 4, 'c': 4, 'red': 4, 'redRush': 4, 'redRushBox': 6, 'lapseBlue': 4, 'maxBlue': 5, 'domain': 6,
    'purple200': 8, 'purple200Fire': 6, 'purple': 5, 'purpleRaise': 6, 'purpleFire': 4, 'purpleEnd': 8}
# ── composite strips: one strip per engine state / multi-row move (the renderer indexes ONE strip by elapsed time) ──
COMPOSE = {
    'hurt': [('hit', 0), ('hit', 1)],
    'knockdown': [('hit', 2), ('hit', 3), ('hit', 4)],
    'getup': [('hit', 5)],
    'lose': [('hit', 3), ('hit', 4)],
    'jumpRise': [('jump', 0), ('jump', 1)],
    'fall': [('jump', 1)],
    'crouchDown': [('crouch', 0), ('crouch', 1), ('crouch', 2)],
    'throw': [('b', 0), ('b', 1), ('redRushBox', 0)],
    'redRushFull': [('redRush', 0), ('redRush', 1), ('redRush', 2), ('redRush', 3), ('redRushBox', 0)],
    'blueStep': [('maxBlue', 2), ('dash', 0)],
    'purpleFull': [('ultAction', 0), ('ultAction', 1), ('ultAction', 2)] + [('purple', i) for i in range(6)] + [('purpleRaise', 0)] + [('purpleFire', i) for i in range(3)] + [('purpleEnd', 0)],
    'purple200Full': [('ultAction', 0), ('ultAction', 1), ('ultAction', 2)] + [('purple200', i) for i in range(6)] + [('purple200Fire', 0)],
}
LYING |= {('knockdown', 0), ('knockdown', 1), ('knockdown', 2), ('lose', 0), ('lose', 1), ('blueStep', 1)}
SPEC.update({'hurt': 6, 'knockdown': 7, 'getup': 8, 'lose': 10, 'jumpRise': 6, 'fall': 6, 'crouchDown': 3, 'throw': 5, 'redRushFull': 4,
             'blueStep': 4, 'purpleFull': 6, 'purple200Full': 8})
for name, parts in COMPOSE.items(): frames[name] = [frames[a][i] for a, i in parts]

os.makedirs(os.path.join(OUT, 'fx'), exist_ok=True)
report = {'source': os.path.relpath(SRC, ROOT), 'size': [W, H], 'bg': BG.tolist(), 'anims': {}, 'fx': {}, 'chant': [], 'boxes': {},
          'excluded': {'header': [0, 0, W, HEADER_BOTTOM], 'dividers': [], 'labels': 'white row-label text (Intro:, Win:, … ) removed by component / top-row rule'}}
anim = {}
for name, fr in frames.items():
    sheet, cw, ch, cells = build(name, fr)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, f'{name}.png'))
    anim[name] = {'sheet': f'./assets/gojo_shinjuku/{name}.png', 'frames': len(fr), 'width': cw, 'height': ch,
                  'originX': cw // 2, 'originY': ch - 1, 'anchorY': 0, 'speed': SPEC[name], 'frameWidth': cw, 'frameHeight': ch}
    report['anims'][name] = {'frames': len(fr), 'cell': [cw, ch], 'cells': cells}
for name, (t, src) in fx.items():
    Image.fromarray(t, 'RGBA').save(os.path.join(OUT, 'fx', f'{name}.png'))
    report['fx'][name] = {'src': list(map(int, src)), 'size': [t.shape[1], t.shape[0]]}
CHANT_TEXT = ['HENKOU', 'KARASU TO SHOUMYOU', 'HYORI NO HAZAMA', 'KYOSHIKI MURASAKI']
for i, (a, box) in enumerate(chants):
    Image.fromarray(a, 'RGBA').save(os.path.join(OUT, 'fx', f'chant{i + 1}.png'))
    report['chant'].append({'file': f'fx/chant{i + 1}.png', 'src': list(box), 'size': [a.shape[1], a.shape[0]], 'text': CHANT_TEXT[i]})
report['boxes'] = {'redRushBox': {'border': rb[2], 'outer': rb[3]}, 'purple200Fire': {'border': pb[2], 'outer': pb[3]}, 'purpleRaise': {'border': hb[2], 'outer': hb[3]}}
report['excluded']['dividers'] = [list(map(int, comp_box(comp_at(1310, 230)))), list(map(int, comp_box(comp_at(1395, 193))))]
report['maxBlueSplitColumn'] = int(mo_cut)

# portrait: stand frame 0, head + shoulders, ×4 nearest on a transparent 96×96
t0 = frames['idle'][0][0]
crop = t0[:24]
por = Image.fromarray(crop, 'RGBA').resize((crop.shape[1] * 4, crop.shape[0] * 4), Image.NEAREST)
canvas = Image.new('RGBA', (128, 96), (0, 0, 0, 0)); canvas.paste(por, ((128 - por.width) // 2, 96 - por.height), por)
canvas.save(os.path.join(OUT, 'portrait.png'))

with open(os.path.join(ROOT, 'gojoShinjukuSprites.js'), 'w') as f:
    f.write('// Generated by tools/gojoshinjuku/slice.py — do not hand-edit. 1x original pixels from the FinhJ Shinjuku sheet;\n')
    f.write('// drawn at GOJO_SHINJUKU_SCALE (integer, nearest-neighbour). Symmetric cells: originX = cell centre, originY = feet row.\n')
    f.write('export const GOJO_SHINJUKU_ANIM = ' + json.dumps(anim, indent=1) + '\n')
    f.write('export const GOJO_SHINJUKU_FX = ' + json.dumps({k: {'sheet': f'./assets/gojo_shinjuku/fx/{k}.png', 'w': v['size'][0], 'h': v['size'][1]} for k, v in report['fx'].items()}) + '\n')
    f.write('export const GOJO_SHINJUKU_CHANT = ' + json.dumps([{'sheet': f"./assets/gojo_shinjuku/{c['file']}", 'w': c['size'][0], 'h': c['size'][1], 'text': c['text']} for c in report['chant']]) + '\n')
with open(os.path.join(ROOT, 'docs/msv1/gojo/slice_report.json'), 'w') as f:
    json.dump(report, f, indent=1)
tot = sum(v['frames'] for v in report['anims'].values())
print(f"{len(anim)} body strips / {tot} body frames, {len(fx)} fx sprites, {len(chants)} chant strips")
for k, v in report['anims'].items(): print(f"  {k:14s} {v['frames']:2d} frames  cell {v['cell']}")
