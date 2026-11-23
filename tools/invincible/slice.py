#!/usr/bin/env python3
"""MSV1-INVINCIBLE — slice the JustOruma "Invincible" SWL+ sheet into feet-aligned strips.

    python3 tools/invincible/slice.py            (re-runnable; overwrites its own outputs only)

Input : assets/incoming/invincible/invincible.png (1006x883, flat charcoal background RGB(32,30,39))
Output: assets/invincible/<anim>.png        body strips, uniform cells, origin = cell centre column / feet row
        assets/invincible/fx/<name>.png     effect strips (shockwave, takeoff streaks, speed streaks, sonic rings,
                                            impact bursts, zip streaks / rings, the giant white burst)
        assets/invincible/portrait.png      HUD / select portrait = the sheet's goggled face portrait (R1, last cell)
        invincibleSprites.js                generated animation table (do not hand-edit)
        docs/msv1/invincible/slice_report.json   every source box → output, key-check counts

KEYING (Mark's suit has dark navy (27,30,39) / near-black regions only 5 levels from the background):
  * tolerance ZERO — only pixels EXACTLY (32,30,39) can become transparent;
  * flood from the panel borders (8-connected background region touching the panel edge);
  * the sheet also has small ENCLOSED pockets of the exact background value (between the legs of standing frames, inside
    the sonic / impact rings). Each pocket is logged in slice_report.json with its ring colours; they are background seen
    through a gap, so they are keyed too. No pixel of any other value is ever removed (asserted: every non-background
    pixel of every used frame is opaque in the output, the suit navy (27,30,39) count is identical before and after).
Nearest-neighbour only; cells are padded, never resampled.
EXCLUDED (only these): the header banner (portrait illustration + "INVINCIBLE" title, y < 125), the panel's yellow
border, the orange divider bars (7), the "WIN" / "LOSE" labels, the bottom credit boxes and the costume sample strip
(y >= 758; the samples are a skin reference only) and the large standing figure on the right (x >= 880; the select
screen shows no full-body art, so it is not used). Every other frame on the sheet is used.
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/incoming/invincible/invincible.png')
OUT = os.path.join(ROOT, 'assets/invincible')
DOC = os.path.join(ROOT, 'docs/msv1/invincible')
BG = (32, 30, 39)
NAVY = (27, 30, 39)
PANEL = (125, 4, 758, 1002)          # y0, x0, y1, x1 (inside the yellow border)
BIGFIG_X = 880                       # the large standing figure (excluded)

img = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W, _ = img.shape
is_bg = np.all(img == BG, 2)
inpanel = np.zeros((H, W), bool); inpanel[PANEL[0]:PANEL[2], PANEL[1]:PANEL[3]] = True
lab, n = nd.label(is_bg & inpanel, np.ones((3, 3)))
p = PANEL
edge_ids = set(np.unique(np.concatenate([lab[p[0], p[1]:p[3]], lab[p[2] - 1, p[1]:p[3]], lab[p[0]:p[2], p[1]], lab[p[0]:p[2], p[3] - 1]]))) - {0}
flood = np.isin(lab, list(edge_ids))
pockets = is_bg & inpanel & ~flood
keyed = flood | pockets
fg = inpanel & ~keyed

# ── frames: (band y0, y1, x0, x1[, sub-y split]) — read off the sheet, verified against column gaps ──
B1, B2, B3, B4, B5, B6, BW = (146, 227), (248, 303), (306, 379), (415, 460), (476, 574), (577, 624), (676, 721)
def F(band, x0, x1, y0=None, y1=None): return (y0 or band[0], x0, y1 or band[1], x1 + 1)
SHEET = {
  # R1
  'r1_idle': [F(B1, 28, 46)],
  'r1_takeoff': [F(B1, 60, 161)],                                   # Mark inside the ground shockwave
  'r1_vstreak': [F(B1, 184, 281), F(B1, 296, 403)],                 # vertical takeoff streaks (+ ground rings)
  'r1_hstreak': [F(B1, 416, 462), F(B1, 473, 517)],                 # horizontal blue / yellow speed streaks
  'r1_flight': [F(B1, 531, 568), F(B1, 581, 618)],
  'r1_rings': [F(B1, 628, 640), F(B1, 645, 674), F(B1, 678, 718)],  # white sonic rings (small → big → scatter)
  'r1_portrait': [F(B1, 737, 777)],
  # R2
  'r2_walk': [F(B2, 15, 40), F(B2, 52, 77), F(B2, 86, 112), F(B2, 121, 147)],
  'r2_lunge': [F(B2, 175, 208)],                                    # the leap into the flying punch
  'r2_fpunch': [F(B2, 224, 272, 248, 276), F(B2, 224, 272, 276, 303)],   # horizontal FLYING PUNCH (two frames stacked)
  'r2_jump': [F(B2, 297, 322), F(B2, 331, 352)],
  'r2_stand': [F(B2, 383, 398), F(B2, 409, 428), F(B2, 438, 457), F(B2, 467, 486), F(B2, 498, 513), F(B2, 521, 538), F(B2, 550, 569), F(B2, 581, 598)],
  # R3
  'r3_flurry': [F(B3, 11, 59), F(B3, 66, 110), F(B3, 121, 154), F(B3, 160, 199), F(B3, 209, 248)],
  'r3_upper': [F(B3, 294, 318), F(B3, 329, 362), F(B3, 371, 396)],
  'r3_burst': [F(B3, 413, 432), F(B3, 444, 489), F(B3, 516, 567)],  # white impact bursts
  # R4
  'r4_sweep': [F(B4, 26, 50), F(B4, 62, 112), F(B4, 130, 172)],
  'r4_spin': [F(B4, 214, 243), F(B4, 251, 295), F(B4, 307, 346)],
  'r4_rise': [F(B4, 379, 399), F(B4, 411, 446), F(B4, 465, 493)],
  # R5
  'r5_fly': [F(B5, 18, 53), F(B5, 62, 111), F(B5, 137, 187), F(B5, 202, 266), F(B5, 295, 352), F(B5, 371, 420)],
  'r5_zip': [F(B5, 452, 470), F(B5, 480, 498)],                     # pose, WHITE SILHOUETTE afterimage
  'r5_zstreak': [F(B5, 509, 555), F(B5, 566, 610)],
  'r5_zpose': [F(B5, 620, 639), F(B5, 650, 668)],
  'r5_zring': [F(B5, 679, 691), F(B5, 696, 725), F(B5, 729, 812)],  # the last one includes a 1-px fleck at x 811
  # R6
  'r6_hurt': [F(B6, 25, 53), F(B6, 63, 95), F(B6, 102, 131), F(B6, 144, 164), F(B6, 176, 219)],
  # WIN / LOSE
  'win': [F(BW, 22, 43), F(BW, 55, 85), F(BW, 93, 124), F(BW, 127, 159), F(BW, 167, 200)],
  'lose': [F(BW, 241, 260), F(BW, 272, 291)],
}

# a detached 3-px (32,30,38) sliver 3 px BELOW the feet of the front-facing standing frame (r2_stand[2]) is a stray mark, not part of
# the figure: dropped (logged) so the frame stands on the same feet row as the rest of the turnaround
STRAY = [(299, 455, 302, 456)]   # colour (32,30,38): one level off the background, invisible on the sheet
for y0, x0, y1, x1 in STRAY: fg[y0:y1, x0:x1] = False

def cut(box):
    y0, x0, y1, x1 = box
    m = fg[y0:y1, x0:x1]
    ys, xs = np.nonzero(m)
    t = (y0 + ys.min(), x0 + xs.min(), y0 + ys.max() + 1, x0 + xs.max() + 1)
    a = np.zeros((t[2] - t[0], t[3] - t[1], 4), np.uint8)
    a[..., :3] = img[t[0]:t[2], t[1]:t[3]]
    a[..., 3] = np.where(fg[t[0]:t[2], t[1]:t[3]], 255, 0)
    return a, t

src = {k: [cut(b) for b in v] for k, v in SHEET.items()}
used = np.zeros((H, W), bool)
for k, v in src.items():
    for a, t in v: used[t[0]:t[2], t[1]:t[3]] |= a[..., 3] > 0

# ── what is NOT used inside the panel must be exactly the dividers + the WIN/LOSE labels + the big figure ──
left = fg & ~used
ll, ln = nd.label(left, np.ones((3, 3)))
leftovers = []
for i, sl in enumerate(nd.find_objects(ll)):
    m = ll[sl] == i + 1; c = img[sl][m]
    box = [sl[0].start, sl[1].start, sl[0].stop, sl[1].stop]
    kind = ('bigFigure' if box[1] >= BIGFIG_X else
            'label' if 640 < box[0] < 672 else
            'divider' if (box[3] - box[1]) <= 6 and (box[2] - box[0]) >= 30 else 'UNKNOWN')
    leftovers.append({'box': box, 'px': int(m.sum()), 'kind': kind})
unknown = [l for l in leftovers if l['kind'] == 'UNKNOWN']
assert not unknown, f'unaccounted pixels: {unknown}'

def frames(*parts):
    out = []
    for k, i in parts: out.append(src[k][i])
    return out
R = lambda k, *idx: [(k, i) for i in (idx or range(len(SHEET[k])))]

# ── body animations (one strip per engine state; every body frame on the sheet appears in at least one) ──
ANIM = {
  'idle': R('r2_walk'),                       # the fists-up fighting stance (the walk frames bob in place; slower)
  'taunt': R('r2_stand'),                     # the 8-frame TURNAROUND (side → front → back → side): taunt / select
  'intro': R('r1_takeoff') + R('r2_stand', 2, 3),   # lands inside the ground shockwave → faces the camera → turns in
  'walk': R('r2_walk'), 'run': R('r2_walk'),
  'dash': R('r2_lunge'),
  'jump': R('r2_jump', 0), 'fall': R('r2_jump', 1),
  'crouch': R('r4_sweep', 0),
  'guard': R('r1_idle'),                      # the R1 'idle': arms folded across the chest, braced
  'takeoff': R('r1_takeoff'),                 # Mark inside the ground shockwave (takeoff, intro landing, Crash Down landing)
  'fly': R('r1_flight'),                      # hover / cruise
  'flyFast': R('r5_fly', 0),                  # top-speed body (also the Invincible Punch wind-up)
  'fpunch': R('r2_lunge') + R('r2_fpunch'),   # flight punch: leap → horizontal flying punch
  'jab': R('r3_flurry', 0, 1),
  'barrage': R('r3_flurry', 0, 1, 2),
  'straight': R('r3_flurry', 2, 3, 4),
  'upper': R('r3_upper'),
  'sweep': R('r4_sweep'), 'spin': R('r4_spin'), 'rise': R('r4_rise'),
  'ipunch': R('r5_fly'),                      # INVINCIBLE PUNCH: flying punch into the big white burst
  'zip': R('r5_zip') + R('r5_zpose'),         # pose → WHITE SILHOUETTE → arrival poses
  'hurt': R('r6_hurt', 0, 1), 'knockdown': R('r6_hurt', 2, 3, 4), 'getup': R('r6_hurt', 2, 0),
  'win': R('win'), 'lose': R('lose'),
  'dive': R('r1_flight', 1),
}
SPEED = {'idle': 10, 'taunt': 6, 'intro': 8, 'walk': 4, 'run': 3, 'dash': 4, 'jump': 6, 'fall': 6, 'crouch': 4, 'guard': 6, 'takeoff': 6,
         'fly': 6, 'flyFast': 4, 'fpunch': 3, 'jab': 2, 'barrage': 2, 'straight': 3, 'upper': 3, 'sweep': 3, 'spin': 3,
         'rise': 3, 'ipunch': 3, 'zip': 2, 'hurt': 5, 'knockdown': 7, 'getup': 7, 'win': 9, 'lose': 12, 'dive': 4}
# ── effect strips (centre-anchored, or feet-anchored for ground effects) ──
FX = {
  'takeoffRing': (R('r1_takeoff'), 'bottom'),         # (the body frame doubles as the shockwave at Mark's feet)
  'vStreak': (R('r1_vstreak'), 'bottom'),
  'hStreak': (R('r1_hstreak'), 'centre'),
  'sonicRing': (R('r1_rings'), 'centre'),
  'impact': (R('r3_burst'), 'centre'),
  'zipStreak': (R('r5_zstreak'), 'centre'),
  'zipRing': (R('r5_zring'), 'centre'),
  'ghost': (R('r5_zip', 1), 'bottom'),
}
LYING = {('r6_hurt', 4), ('r6_hurt', 2), ('r5_fly', 0), ('r1_flight', 0), ('r1_flight', 1), ('r2_fpunch', 0), ('r2_fpunch', 1)}

def anchor_x(a, ref):
    al = a[..., 3] > 0
    # the head / upper body column (top 14 rows of opaque pixels); lying / flying frames: the whole width
    if ref in LYING: xs = np.nonzero(al.any(0))[0]
    else:
        ys = np.nonzero(al.any(1))[0]; xs = np.nonzero(al[ys.min():ys.min() + 14].any(0))[0]
    return (xs.min() + xs.max() + 1) / 2

def body_box(a):
    # Mark's own pixels (not the white / pale-lilac burst): min channel < 180
    r, g, b = (a[..., i].astype(int) for i in range(3))
    k = (a[..., 3] > 0) & (np.minimum(np.minimum(r, g), b) < 180)
    ys, xs = np.nonzero(k)
    return ys.min(), xs.min(), ys.max() + 1, xs.max() + 1

def build_body(parts):
    # BODY-anchored strip (frames where an effect is composited around Mark): every cell puts Mark's own pixels on the same
    # centre column and the same bottom row, so the burst grows around a body that does not jump
    fr = [src[k][i] for k, i in parts]
    bb = [body_box(t) for t, _ in fr]
    ax = [(b[1] + b[3]) / 2 for b in bb]
    half = int(np.ceil(max(max(ax), max(t.shape[1] - a for (t, _), a in zip(fr, ax)))))
    up = max(b[2] for b in bb); down = max(t.shape[0] - b[2] for (t, _), b in zip(fr, bb))
    cw, ch = 2 * half, up + down
    sheet = np.zeros((ch, cw * len(fr), 4), np.uint8); cells = []
    for i, ((t, box), a, b, p) in enumerate(zip(fr, ax, bb, parts)):
        ox = int(round(half - a)) + i * cw; oy = up - b[2]
        sheet[oy:oy + t.shape[0], ox:ox + t.shape[1]] = t
        cells.append({'from': f'{p[0]}[{p[1]}]', 'src': [int(v) for v in box], 'dx': int(ox - i * cw), 'dy': int(oy)})
    return sheet, cw, ch, cells, up

def build(parts, centre=False):
    fr = [src[k][i] for k, i in parts]
    ax = [(t.shape[1] / 2 if centre else anchor_x(t, p)) for (t, _), p in zip(fr, parts)]
    half = int(np.ceil(max(max(ax), max(t.shape[1] - a for (t, _), a in zip(fr, ax)))))
    cw, ch = 2 * half, max(t.shape[0] for t, _ in fr)
    sheet = np.zeros((ch, cw * len(fr), 4), np.uint8); cells = []
    for i, ((t, box), a, p) in enumerate(zip(fr, ax, parts)):
        ox = int(round(half - a)) + i * cw
        oy = (ch - t.shape[0]) // 2 if centre else ch - t.shape[0]
        sheet[oy:oy + t.shape[0], ox:ox + t.shape[1]] = t
        cells.append({'from': f'{p[0]}[{p[1]}]', 'src': [int(v) for v in box], 'dx': int(ox - i * cw), 'dy': int(oy)})
    return sheet, cw, ch, cells

os.makedirs(os.path.join(OUT, 'fx'), exist_ok=True); os.makedirs(DOC, exist_ok=True)
report = {'source': os.path.relpath(SRC, ROOT), 'size': [W, H], 'bg': list(BG), 'panel': list(PANEL), 'rows': {}, 'anims': {}, 'fx': {},
          'excluded': {'header': 'y < 125 (portrait illustration + INVINCIBLE title)', 'credits+costume strip': 'y >= 758',
                       'bigFigure': f'x >= {BIGFIG_X} (no full-body art on the select screen)', 'leftovers': leftovers},
          'key': {}}
for k, v in SHEET.items(): report['rows'][k] = {'frames': len(v), 'boxes': [[int(x) for x in t] for _, t in src[k]]}
# key check — nothing but exact background removed; the suit navy count is unchanged
navy_src = int(np.all(img == NAVY, 2)[used].sum())
nonbg_in_boxes = 0; lost = 0
for k, v in src.items():
    for a, t in v:
        reg = img[t[0]:t[2], t[1]:t[3]]; nb = ~np.all(reg == BG, 2)
        for sy0, sx0, sy1, sx1 in STRAY:   # the logged stray is removed on purpose, not by keying
            ya, yb, xa, xb = max(sy0, t[0]) - t[0], min(sy1, t[2]) - t[0], max(sx0, t[1]) - t[1], min(sx1, t[3]) - t[1]
            if ya < yb and xa < xb: nb[ya:yb, xa:xb] = False
        nonbg_in_boxes += int(nb.sum()); lost += int((nb & (a[..., 3] == 0)).sum())
pl, pn = nd.label(pockets, np.ones((3, 3)))
pocket_list = []
for i, sl in enumerate(nd.find_objects(pl)):
    m = pl == i + 1; ring = nd.binary_dilation(m, np.ones((3, 3))) & ~m
    cols = img[ring]; dark = float((cols.sum(1) < 60).mean()); white = float((cols.min(1) > 200).mean())
    pocket_list.append({'y': int(sl[0].start), 'x': int(sl[1].start), 'px': int(m.sum()), 'ringOutline': round(dark, 2), 'ringWhite': round(white, 2)})
report['key'] = {'tolerance': 0, 'strayRemoved': [list(b) for b in STRAY], 'floodKeyedPx': int((flood).sum()), 'enclosedPockets': len(pocket_list), 'enclosedPocketPx': int(pockets.sum()),
                 'pockets': pocket_list, 'nonBackgroundPxInFrames': nonbg_in_boxes, 'nonBackgroundPxLost': lost,
                 'suitNavyPxInFrames': navy_src}
assert lost == 0, f'{lost} non-background pixels lost to keying'

BODY_ANCHORED = {'ipunch'}
anim = {}
for name, parts in ANIM.items():
    if name in BODY_ANCHORED: sheet, cw, ch, cells, oyb = build_body(parts)
    else: (sheet, cw, ch, cells), oyb = build(parts), None
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, f'{name}.png'))
    anim[name] = {'sheet': f'./assets/invincible/{name}.png', 'frames': len(parts), 'width': cw, 'height': ch,
                  'originX': cw // 2, 'originY': (oyb - 1) if oyb else ch - 1, 'anchorY': 0, 'speed': SPEED[name], 'frameWidth': cw, 'frameHeight': ch}
    report['anims'][name] = {'frames': len(parts), 'cell': [cw, ch], 'cells': cells}
fxo = {}
for name, (parts, anc) in FX.items():
    sheet, cw, ch, cells = build(parts, centre=True)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'fx', f'{name}.png'))
    fxo[name] = {'sheet': f'./assets/invincible/fx/{name}.png', 'n': len(parts), 'w': cw, 'h': ch, 'anchor': anc}
    report['fx'][name] = {'frames': len(parts), 'cell': [cw, ch], 'cells': cells}
# the giant white burst on its own: the white / pale-lilac pixels of the Invincible Punch frames 1-4 (frames also used whole)
def whiteonly(a):
    r, g, b = (a[..., i].astype(int) for i in range(3))
    k = (a[..., 3] > 0) & (np.minimum(np.minimum(r, g), b) >= 180)
    o = a.copy(); o[..., 3] = np.where(k, 255, 0); return o
bw = [whiteonly(src['r5_fly'][i][0]) for i in (1, 2, 3, 4)]
cw = max(t.shape[1] for t in bw); ch = max(t.shape[0] for t in bw)
cw += cw % 2; ch += ch % 2
sh = np.zeros((ch, cw * 4, 4), np.uint8)
for i, t in enumerate(bw):
    oy, ox = (ch - t.shape[0]) // 2, (cw - t.shape[1]) // 2 + i * cw
    sh[oy:oy + t.shape[0], ox:ox + t.shape[1]] = t
Image.fromarray(sh, 'RGBA').save(os.path.join(OUT, 'fx', 'bigBurst.png'))
fxo['bigBurst'] = {'sheet': './assets/invincible/fx/bigBurst.png', 'n': 4, 'w': cw, 'h': ch, 'anchor': 'centre'}
report['fx']['bigBurst'] = {'frames': 4, 'cell': [cw, ch], 'from': 'white pixels (min channel >= 180) of r5_fly[1..4]'}

# portrait: the sheet's own goggled face portrait, x2 nearest, centred on a 128 x 112 canvas
pt = src['r1_portrait'][0][0]
por = Image.fromarray(pt, 'RGBA').resize((pt.shape[1] * 2, pt.shape[0] * 2), Image.NEAREST)
canvas = Image.new('RGBA', (128, 112), (0, 0, 0, 0)); canvas.paste(por, ((128 - por.width) // 2, 112 - por.height), por)
canvas.save(os.path.join(OUT, 'portrait.png'))
report['portrait'] = {'from': 'r1_portrait[0]', 'size': [128, 112], 'scale': 2}

# coverage: every sheet frame lands in a body strip, an fx strip, or is the portrait
cover = {(k, i): [] for k, v in SHEET.items() for i in range(len(v))}
for name, parts in ANIM.items():
    for p in parts: cover[p].append(name)
for name, (parts, _) in FX.items():
    for p in parts: cover[p].append('fx/' + name)
cover[('r1_portrait', 0)].append('portrait')
for i in (1, 2, 3, 4): cover[('r5_fly', i)].append('fx/bigBurst')
miss = [f'{k}[{i}]' for (k, i), v in cover.items() if not v]
assert not miss, f'unused frames: {miss}'
report['coverage'] = {f'{k}[{i}]': v for (k, i), v in cover.items()}
report['frameCount'] = sum(len(v) for v in SHEET.values())

def _py(o):   # numpy scalars → plain ints / floats (json)
    return o.item() if hasattr(o, 'item') else str(o)
with open(os.path.join(ROOT, 'invincibleSprites.js'), 'w') as f:
    f.write('// Generated by tools/invincible/slice.py — do not hand-edit. 1x original pixels from the JustOruma "Invincible" SWL+\n')
    f.write('// sheet; drawn at INV_SCALE (integer, nearest-neighbour). Symmetric cells: originX = cell centre, originY = feet row.\n')
    f.write('export const INVINCIBLE_ANIM = ' + json.dumps(anim, indent=1, default=_py) + '\n')
    f.write('export const INVINCIBLE_FX = ' + json.dumps(fxo, default=_py) + '\n')
with open(os.path.join(DOC, 'slice_report.json'), 'w') as f: json.dump(report, f, indent=1, default=_py)
print('sheet frames', report['frameCount'], {k: len(v) for k, v in SHEET.items()})
print('key', {k: v for k, v in report['key'].items() if k != 'pockets'})
print('leftovers', [(l['kind'], l['px']) for l in leftovers])
for k, v in report['anims'].items(): print(f"  {k:9s} {v['frames']:2d}  cell {v['cell']}")
print('fx', {k: (v['n'], v['w'], v['h']) for k, v in fxo.items()})
