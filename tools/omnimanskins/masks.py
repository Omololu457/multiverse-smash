#!/usr/bin/env python3
"""tools/omnimanskins/masks.py — per-frame BODY-PART MASKS for Omni-Man (Viltrumite) (omniman_viltrum).

Every strip the fighter draws (omnimanViltrumSprites.js OMNIMAN_VILTRUM_ANIM) is classified pixel by pixel from the
sheet's own 44-colour palette + where the pixel sits in its frame (anatomy found per frame, never a fixed box):

    hair       the dark ramp (#080808 / #202020 / #2a2a2a) above the face
    temples    the white/grey ramp inside the head box (the grey at his temples)
    face       the skin ramp           moustache  the dark ramp inside the lower face        eyes  the eye blues
    collar     red / white just under the face (the neck + cape clasp)
    torso      the white upper suit (chest panel + shoulders)            arms  white within 5 px of a glove
    insignia   small red islands enclosed by the white chest
    gloves     small red islands touching the white arms (fists / pointing hand)
    waist      red within 2 rows of the bottom edge of the white torso, under it
    legs       red within LEG_R px of the hip → boot segments (straight legs; bent legs fixed in OVERRIDES)
    boots      white/grey pieces below the hips
    cape       every other red pixel; per frame marked EXTERIOR or LINING (CAPE_SIDE: the lining shows in the brake,
               takeoff, knockdown, crash and hurt frames — the cape flips)
    streaks    white/grey horizontal speed lines with open space above and below (and the white boom bars)
    protected  the pure-black outline, the pink R13 afterimage, the yellow glint, anything else: never changed

OVERRIDES: per (strip, frame) rectangles (frame-local x0, y0, x1, y1 inclusive) that force a region for the red pixels
inside — written after looking at every frame in the debug overlay (python3 tools/omnimanskins/masks.py --debug).
"""
import json, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/omniman_viltrum')

REGIONS = ['protected', 'hair', 'temples', 'face', 'moustache', 'eyes', 'collar', 'torso', 'arms', 'insignia', 'gloves',
           'waist', 'legs', 'boots', 'cape', 'lining', 'streaks']
R = {k: i for i, k in enumerate(REGIONS)}

def hexset(*h): return {tuple(int(x[i:i + 2], 16) for i in (1, 3, 5)) for x in h}
REDS = hexset('#ff0000', '#9e0909', '#610505')
WHITES = hexset('#ffffff', '#f4f4f4', '#f2f2f2', '#e5e5e5', '#cccccc', '#c3c3c3', '#b5b5b5', '#7f7f7f', '#555555', '#d2d8e4', '#b0b0b8')
DARKS = hexset('#080808', '#0b0b0b', '#101010', '#202020', '#2a2a2a')
SKINS_ = hexset('#d0835e', '#fbbc97', '#7b4731', '#faddc5', '#c87858', '#e0a272')
EYES = hexset('#00a2e8', '#99d9ea', '#cfeef5')
# tone (0 dark … 1 light) of each source colour inside its family → the skin ramps index by it
TONE = {}
for fam in (['#610505', '#9e0909', '#ff0000'], ['#555555', '#7f7f7f', '#b0b0b8', '#b5b5b5', '#c3c3c3', '#cccccc', '#d2d8e4', '#e5e5e5', '#f2f2f2', '#f4f4f4', '#ffffff'],
            ['#080808', '#0b0b0b', '#101010', '#202020', '#2a2a2a'], ['#7b4731', '#c87858', '#d0835e', '#e0a272', '#fbbc97', '#faddc5'],
            ['#00a2e8', '#99d9ea', '#cfeef5']):
    for i, h in enumerate(fam):
        TONE[tuple(int(h[j:j + 2], 16) for j in (1, 3, 5))] = i / max(1, len(fam) - 1)

LEG_R = 4.6
# frames where the inside of the cape faces us (brake: the cape flips up; takeoff; knockdown; crash; hurt)
CAPE_LINING = {('brake', 0), ('brake', 1), ('brake', 2), ('takeoff', 0), ('takeoff', 1), ('knockdown', 1), ('crash', 1),
               ('hurt', 0), ('hurt', 1), ('lose', 0)}
CAPE_LINING -= {('takeoff', 0), ('takeoff', 1)}   # looked: takeoff shows the outside
# per-frame fixes, filled after the debug pass: (strip, frame) → [(region, x0, y0, x1, y1), ...] (frame-local, inclusive)
OVERRIDES = {}
# per-frame LEG pieces (ids from `masks.py --pieces`), read off the numbered piece sheets
LEGS = {
  **{('idle', k): [3] for k in (0, 1, 2, 3, 5, 6)}, ('idle', 4): [2], ('idle', 7): [2], ('glint', 0): [3], ('glint', 1): [3],
  ('turn', 0): [2, 3, 4], ('turn', 1): [3],
  ('walk', 0): [4], ('walk', 1): [3, 4], ('walk', 2): [2], ('walk', 3): [3], ('walk', 4): [5], ('walk', 5): [3, 5, 6],
  ('fly', 0): [3, ('band', 1)], ('fly', 1): [3, ('band', 1)],
  ('takeoff', 0): [2, 4], ('takeoff', 1): [3, 4], ('hover', 0): [2, 4],
  ('brake', 0): [5, 6], ('brake', 1): [3, ('gloves', 2)], ('brake', 2): [2],
  ('landHard', 0): [3, ('gloves', 1)], ('landHard', 1): [2, 3], ('getup', 0): [2], ('land', 0): [3, ('gloves', 1)], ('land', 1): [2, 3],
  ('crouch', 0): [2, 3], ('guard', 0): [4, ('waist', 1), ('waist', 2)], ('crouchGuard', 0): [2],
  ('hurt', 0): [('gloves', 1)], ('hurt', 1): [3], ('knockdown', 0): [2, 3, ('gloves', 1)], ('knockdown', 1): [('band', 1), ('gloves', 2)],
  ('jab', 0): [1, 2], ('jab', 1): [5, ('band', 3)], ('straight', 0): [4], ('straight', 1): [3, ('gloves', 1)], ('straight', 2): [2],
  ('haymaker', 0): [4], ('haymaker', 1): [6, ('gloves', 3), ('gloves', 4), ('gloves', 5)], ('haymaker', 2): [3], ('haymaker', 3): [3],
  ('blitz', 0): [('band', 2), ('gloves', 3)], ('blitz', 1): [('band', 2)], ('low', 0): [3], ('low', 1): [5],
  ('kick', 0): [3, 5, ('gloves', 1)], ('kick', 1): [1, 4], ('kick', 2): [2, 4],
  ('flightPunch', 0): [5, ('gloves', 2), ('gloves', 3), ('gloves', 4)], ('flightPunch', 1): [3, ('gloves', 1)],
  ('stepPunch', 0): [3, 4, ('gloves', 2)], ('backhand', 0): [3, 4, ('gloves', 2)], ('backhand', 1): [5, ('band', 3)],
  ('point', 0): [1, 3], ('point', 1): [2, 4], ('point', 2): [2, 4, ('gloves', 1)], ('point', 3): [3, 4, ('gloves', 1)], ('point', 4): [2, 4, ('gloves', 1)],
  ('uppercut', 0): [3, ('gloves', 2)], ('skyHook', 0): [3], ('skyHook', 1): [3, ('gloves', 2)], ('skyHook', 2): [2, 3, 4], ('skyHook', 3): [3, 4, ('gloves', 1)],
  ('intro', 0): [3, ('gloves', 1)], ('intro', 1): [2, 3], ('intro', 2): [2], ('intro', 3): [3],
  **{('win', k): [3] for k in range(3)}, **{('unimpressed', k): [3] for k in range(4)}, ('lose', 0): [('band', 1), ('gloves', 2)],
  ('meteor', 0): [3, ('band', 1)], ('meteor', 1): [3, ('band', 1)],
  ('meteorLand', 0): [3, ('gloves', 1)], ('meteorLand', 1): [2, 3], ('crash', 0): [2, 3, ('gloves', 1)], ('crash', 1): [('band', 1), ('gloves', 2)],
  ('grabRush', 0): [('band', 2), ('gloves', 3)], ('grabRush', 1): [('band', 2)], ('grabRush', 2): [3, ('band', 1)], ('grabRush', 3): [3, ('band', 1)],
  ('throwSlam', 0): [3], ('throwSlam', 1): [3, ('gloves', 2)], ('ascent', 0): [3, ('gloves', 2)], ('orbitHold', 0): [3, ('gloves', 1)],
  ('returnPunch', 0): [5, ('gloves', 2), ('gloves', 3), ('gloves', 4)], ('returnPunch', 1): [6, ('gloves', 3), ('gloves', 4), ('gloves', 5)],
  ('returnPunch', 2): [3], ('dashShort', 0): [('band', 2), ('gloves', 3)], ('dashShort', 1): [3, 4, ('gloves', 2)],
}


def load_anim():
    js = open(os.path.join(ROOT, 'omnimanViltrumSprites.js'), encoding='utf-8').read()
    A = json.loads(re.search(r'export const OMNIMAN_VILTRUM_ANIM = (\{.*?\n\})', js, re.S).group(1))
    out = {}
    for k, d in A.items():
        name = os.path.basename(d['sheet'])[:-4]
        out[name] = (d['frameWidth'], d['frames'])
    return out


def member(rgb, S):
    m = np.zeros(rgb.shape[:2], bool)
    for c in S: m |= (rgb == c).all(-1)
    return m


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy or 1
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy))


def frame_regions(rgb, alpha, strip='', fi=0, head_only=False):
    """region map (int8) for ONE frame"""
    H, W = alpha.shape
    on = alpha > 0
    red, white, dark, skin, eye = (member(rgb, S) & on for S in (REDS, WHITES, DARKS, SKINS_, EYES))
    reg = np.zeros((H, W), np.int8)
    yy, xx = np.mgrid[0:H, 0:W]
    if not skin.any():   # back view (hurt 0): no face → hair = the dark head mass, white = suit, red = the cape over him
        reg[dark] = R['hair']; reg[white] = R['torso']
        reg[red] = R['lining' if (strip, fi) in CAPE_LINING else 'cape']
        _LAST['il'] = pieces_of(red)
        ys, xs = np.nonzero(dark)
        hc = (float(xs.mean()), float(ys.mean())) if len(xs) else (W / 2, 8.0)
        _LAST['geo'] = dict(face=None, head=hc, hip=(hc[0], hc[1] + 30), neck=(hc[0], hc[1] + 8), torso=None)
        return reg
    # ── head: the face = the largest skin island; the head box = its bbox, widened ──
    lab, n = ndimage.label(skin)
    big = 1 + int(np.argmax(ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))))
    face = lab == big
    fy, fx = np.nonzero(face)
    fy0, fy1, fx0, fx1 = fy.min(), fy.max(), fx.min(), fx.max()
    fh = fy1 - fy0 + 1
    head_c = (fx.mean(), fy.mean())
    hb = (yy >= fy0 - 12) & (yy <= fy1 + 1) & (xx >= fx0 - 6) & (xx <= fx1 + 6)
    if head_only:
        hb = np.ones_like(hb)
    reg[skin & (face | hb)] = R['face']
    inface = (yy >= fy0) & (yy <= fy1) & (xx >= fx0) & (xx <= fx1)
    reg[eye & inface] = R['eyes']                                    # the eye only (the Unimpressed glint above it stays)
    lowface = hb & (yy >= fy0 + fh * 0.55) & (xx >= fx0 - 1) & (xx <= fx1 + 1) & (yy <= fy1 + 1)
    reg[dark & lowface] = R['moustache']
    reg[dark & hb & ~lowface] = R['hair']
    near_hair = ndimage.binary_dilation(dark & hb & ~lowface, iterations=2)
    reg[white & hb & (yy <= fy1 - 1) & (near_hair | head_only)] = R['temples']   # the grey touching his hair
    if head_only:
        reg[(red | white) & (yy > fy1)] = R['collar']
        _LAST['geo'] = dict(face=(int(fx0), int(fy0), int(fx1), int(fy1)), head=(float(head_c[0]), float(head_c[1])), hip=(float(head_c[0]), float(H * 2)),
                            neck=(float((fx0 + fx1) / 2), float(fy1 + 2)), torso=None)
        return reg
    # ── speed streaks: white runs ≥ 3 px with open space above and below (outside the body) ──
    pad = np.pad(on, 1)
    up, dn = pad[:-2, 1:-1], pad[2:, 1:-1]
    thin = white & ~hb & (~up | ~dn)
    runs = ndimage.label(thin, structure=[[0, 0, 0], [1, 1, 1], [0, 0, 0]])[0]
    streak = np.zeros_like(on)
    for i, sl in enumerate(ndimage.find_objects(runs), 1):
        if sl and sl[1].stop - sl[1].start >= 3: streak |= runs == i
    # ── the white body pieces: torso (biggest, nearest the head), boots (pieces far from the head) ──
    wb = white & ~streak & ~((reg == R['temples']))
    wl, wn = ndimage.label(wb)
    torso = np.zeros_like(on); boots = np.zeros_like(on)
    allp = np.nonzero(on); far = np.hypot(allp[1] - head_c[0], allp[0] - head_c[1]).max()
    pieces = []
    for i in range(1, wn + 1):
        m = wl == i; py, px = np.nonzero(m)
        d = np.hypot(px.mean() - head_c[0], py.mean() - head_c[1])
        pieces.append((m, m.sum(), d, px.mean(), py.mean()))
    if pieces:
        tmain = max(pieces, key=lambda p: p[1] - 3 * p[2])
        near_main = ndimage.binary_dilation(tmain[0], iterations=3)
        redn = ndimage.binary_dilation(red, iterations=1)
        for p in pieces:
            if p is tmain or (p[0] & near_main).any(): torso |= p[0]
            elif p[1] >= 4 and (p[0] & redn).any() and p[2] > fh * 1.2: boots |= p[0]
            else: torso |= p[0]
    reg[streak] = R['streaks']
    reg[boots] = R['boots']
    # ── body axis (head → torso centroid) → the hips ──
    if torso.any():
        ty, tx = np.nonzero(torso); tc = (tx.mean(), ty.mean())
    else:
        tc = (head_c[0], head_c[1] + fh * 2)
    ax, ay = tc[0] - head_c[0], tc[1] - head_c[1]; al = np.hypot(ax, ay) or 1
    hip = (tc[0] + ax / al * fh * 1.5, tc[1] + ay / al * fh * 1.5)
    # waist: red right under the torso along the axis (the belt band)
    proj = ((xx - head_c[0]) * ax + (yy - head_c[1]) * ay) / al
    if torso.any():
        tp = proj[torso]; tend = np.percentile(tp, 92)
    else:
        tend = al
    # ── red islands: insignia (enclosed by the chest), gloves (small, touching a white arm), the rest = legs / cape ──
    rl, rn = ndimage.label(red)
    near_white = ndimage.binary_dilation(torso, iterations=1)
    glove = np.zeros_like(on); insig = np.zeros_like(on)
    for i in range(1, rn + 1):
        m = rl == i; sz = m.sum()
        sl = ndimage.find_objects(m.astype(int))[0]
        if sz > 70 or (sl[0].stop - sl[0].start) > 13 or (sl[1].stop - sl[1].start) > 16: continue   # cape strips are long; fists are compact
        ring = ndimage.binary_dilation(m, iterations=1) & ~m
        wfrac = (ring & torso).sum() / max(1, ring.sum())
        if sz <= 14 and wfrac >= 0.45 and proj[m].mean() < tend: insig |= m
        elif (ring & near_white).any() or (ring & torso).any(): glove |= m
    arms = torso & (ndimage.distance_transform_edt(~glove) <= 4) if glove.any() else np.zeros_like(on)
    reg[torso] = R['torso']; reg[arms] = R['arms']; reg[insig] = R['insignia']; reg[glove] = R['gloves']
    rest = red & ~glove & ~insig
    # collar: just under the face, at the neck
    neck = (yy > fy1) & (yy <= fy1 + 4) & (xx >= fx0 - 3) & (xx <= fx1 + 3)
    reg[(rest | (white & ~streak)) & neck & ~glove] = R['collar']
    rest &= ~neck
    waist = rest & (proj >= tend - 1) & (proj <= tend + 3) & (np.abs(((xx - head_c[0]) * -ay + (yy - head_c[1]) * ax) / al) <= 9)
    reg[waist] = R['waist']; rest &= ~waist
    # legs: around the hip → boot segments (one per boot piece)
    legs = np.zeros_like(on)
    bl, bn = ndimage.label(boots)
    for i in range(1, bn + 1):
        by, bx = np.nonzero(bl == i)
        top = np.argmin(np.hypot(bx - hip[0], by - hip[1]))
        legs |= seg_dist(xx, yy, hip[0], hip[1], bx[top], by[top]) <= LEG_R
    legs |= np.hypot(xx - hip[0], yy - hip[1]) <= LEG_R + 1.5
    # the sheet outlines each leg: split the red at 1-px bridges (2×2 opening, the cut pixels rejoin their nearest piece);
    # a piece that mostly sits in the leg band is a leg end to end (bent knees); big merged pieces (flight: the cape over
    # the legs) keep the band split
    il = pieces_of(rest); _LAST['il'] = il
    tb = np.nonzero(torso)
    _LAST['geo'] = dict(face=(int(fx0), int(fy0), int(fx1), int(fy1)), head=(float(head_c[0]), float(head_c[1])), hip=(float(hip[0]), float(hip[1])),
                        neck=(float((fx0 + fx1) / 2), float(fy1 + 2)), torso=(int(tb[1].min()), int(tb[0].min()), int(tb[1].max()), int(tb[0].max())) if len(tb[0]) else None)
    bootn = ndimage.binary_dilation(boots, iterations=2)
    side = 'lining' if (strip, fi) in CAPE_LINING else 'cape'
    for i in range(1, il.max() + 1):
        m = il == i; sz = m.sum()
        if not sz: continue
        fr = (m & legs).sum() / sz
        if (strip, fi) in LEGS:   # looked-at labels: listed piece ids are legs, ('band', id) keeps the band split, the rest is cape
            ids = LEGS[(strip, fi)]
            other = [r for r in ids if isinstance(r, tuple) and r[1] == i and r[0] != 'band']
            if i in ids: legs = legs | m
            elif ('band', i) in ids: pass
            else: legs = legs & ~m
            if other: reg[m] = R[other[0][0]]; rest = rest & ~m
        elif sz <= 300: legs = (legs & ~m) | (m if fr >= 0.35 else False)
    for (rname, px_, py_) in OVERRIDES.get((strip, fi), []):   # looked-at fixes: the piece under (x, y) → region
        k = il[py_, px_]
        if k: legs = (legs | (il == k)) if rname == 'legs' else (legs & ~(il == k))
        if k and rname not in ('legs', 'cape'): reg[il == k] = R[rname]; rest &= ~(il == k)
    reg[rest & legs] = R['legs']
    reg[rest & ~legs] = R[side]
    return reg


def pieces_of(mask):
    op = ndimage.binary_opening(mask, structure=np.ones((2, 2)))
    lab, k = ndimage.label(op)
    if not k: return ndimage.label(mask)[0]
    _, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
    full = lab[iy, ix] * mask
    # bits too thin to survive the opening and far from any piece keep their own label
    lone, ln = ndimage.label(mask & (full == 0))
    full[lone > 0] = lone[lone > 0] + k
    return full


def classify(arr, fw, strip='', head_only=False):
    rgb, a = arr[..., :3], arr[..., 3]
    H, W = a.shape
    reg = np.zeros((H, W), np.int8)
    for fi, x0 in enumerate(range(0, W, fw)):
        reg[:, x0:x0 + fw] = frame_regions(rgb[:, x0:x0 + fw], a[:, x0:x0 + fw], strip, fi, head_only)
    return reg


DEBUG_COL = {'protected': None, 'hair': (40, 40, 160), 'temples': (150, 150, 255), 'face': (250, 200, 160), 'moustache': (120, 60, 20),
             'eyes': (0, 255, 255), 'collar': (255, 0, 255), 'torso': (235, 235, 235), 'arms': (160, 255, 160), 'insignia': (255, 255, 0),
             'gloves': (255, 140, 0), 'waist': (0, 120, 255), 'legs': (40, 160, 40), 'boots': (130, 90, 60), 'cape': (220, 20, 20),
             'lining': (120, 0, 60), 'streaks': (0, 200, 200)}


def debug(out_path, scale=4, only=None):
    strips = load_anim(); rows = []
    if only: strips = {k: v for k, v in strips.items() if k in only}
    for name, (fw, n) in strips.items():
        a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
        reg = classify(a, fw, name)
        viz = a.copy()
        for k, c in DEBUG_COL.items():
            if c: viz[reg == R[k], :3] = c
        both = np.concatenate([a, viz], 0)
        im = Image.fromarray(both).resize((both.shape[1] * scale, both.shape[0] * scale), Image.NEAREST)
        rows.append((name, fw, im))
    from PIL import ImageDraw
    Wd = max(im.width for _, _, im in rows) + 110
    Hd = sum(im.height + 8 for _, _, im in rows)
    sheet = Image.new('RGBA', (Wd, Hd), (60, 90, 60, 255)); dr = ImageDraw.Draw(sheet); y = 0
    for name, fw, im in rows:
        dr.text((4, y + 4), name, fill=(255, 255, 255, 255))
        sheet.alpha_composite(im, (110, y))
        for k in range(0, im.width, fw * scale): dr.line([(110 + k, y), (110 + k, y + im.height)], fill=(0, 0, 0, 255))
        for k in range(0, im.width, 10 * scale):   # 10-px ticks (frame-local) for reading override points
            if (k // scale) % fw == 0: continue
        for f0 in range(0, im.width, fw * scale):
            for t in range(10, fw, 10): dr.line([(110 + f0 + t * scale, y), (110 + f0 + t * scale, y + 6)], fill=(255, 255, 0, 255))
            for t in range(10, im.height // scale, 10): dr.line([(110 + f0, y + t * scale), (110 + f0 + 6, y + t * scale)], fill=(255, 255, 0, 255))
        y += im.height + 8
    sheet.save(out_path); print('debug →', out_path, sheet.size)


def pieces_sheet(out_path, only=None, scale=6):
    from PIL import ImageDraw
    strips = load_anim(); tiles = []
    for name, (fw, n) in strips.items():
        if only and name not in only: continue
        a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
        for fi in range(n):
            fr = a[:, fi * fw:(fi + 1) * fw]
            global _PIECES; _PIECES = None
            reg = frame_regions(fr[..., :3], fr[..., 3], name, fi)
            il = _LAST['il']
            viz = fr.copy(); viz[fr[..., 3] > 0, :3] = (70, 70, 70)
            rng = [(230, 60, 60), (60, 160, 255), (250, 220, 40), (90, 230, 90), (240, 100, 240), (255, 150, 30), (130, 120, 255), (120, 255, 255), (200, 200, 200), (180, 110, 40)]
            for i in range(1, il.max() + 1): viz[il == i, :3] = rng[i % 10]
            viz[reg == R['gloves'], :3] = (255, 255, 255); viz[reg == R['legs'], 3] = 255
            im = Image.fromarray(viz).resize((fw * scale, fr.shape[0] * scale), Image.NEAREST)
            d = ImageDraw.Draw(im)
            for i in range(1, il.max() + 1):
                ys, xs = np.nonzero(il == i)
                if len(xs): d.text((xs.mean() * scale - 3, ys.mean() * scale - 5), str(i), fill=(0, 0, 0, 255))
            d.text((2, 2), f'{name}[{fi}]', fill=(255, 255, 255, 255))
            # mark the pieces the CURRENT rules call legs with an outline dot
            for i in range(1, il.max() + 1):
                m = il == i
                if (reg[m] == R['legs']).mean() > 0.5:
                    ys, xs = np.nonzero(m); d.ellipse([xs.mean() * scale + 6, ys.mean() * scale - 4, xs.mean() * scale + 12, ys.mean() * scale + 2], fill=(0, 120, 0, 255))
            tiles.append(im)
    cols = 6; W = max(t.width for t in tiles) + 4; H = max(t.height for t in tiles) + 4
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * W, rows * H), (30, 50, 30, 255))
    for k, t in enumerate(tiles): sheet.alpha_composite(t, ((k % cols) * W, (k // cols) * H))
    sheet.save(out_path); print('pieces →', out_path, sheet.size, len(tiles), 'frames')


_LAST = {}
if __name__ == '__main__':
    if '--pieces' in sys.argv:
        i = sys.argv.index('--pieces'); pieces_sheet(sys.argv[i + 1], only=sys.argv[i + 2:] or None)
    if '--debug' in sys.argv:
        i = sys.argv.index('--debug'); debug(sys.argv[i + 1], only=sys.argv[i + 2:] or None)
