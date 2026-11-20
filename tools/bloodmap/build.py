#!/usr/bin/env python3
"""tools/bloodmap/build.py — MSV1-BLOOD offline body maps.

For every frame of every playable character (base art, skins, forms — the list comes from
tools/bloodmap/enumerate.mjs), read the sprite's own pixels and write data/bloodmaps/<characterId>.json:

  * opaque BODY mask  — alpha >= 128, the main silhouette component(s), thin weapon blades opened away,
                        detached effect pieces dropped, bright glow pixels (ki / aura / energy) excluded
  * REGIONS           — HEAD (brow, nose, mouth, cheek) · TORSO (chest, abdomen, side) ·
                        ARMS (upper, fore, hand) · LEGS (thigh, shin)
  * WOUND ANCHORS     — one pixel per slot per frame (sprite pixel space), tracked through each strip
  * EYE BOX           — no blood is ever painted inside it
  * TRICKLE PATHS     — per anchor, the pixel path a trickle follows DOWN (screen gravity) over the body,
                        each step tagged lit / shadow from the sprite's own luminance
Frames with identical alpha masks (recolour skins) share one map entry, so a skin costs only an index row.

Runtime (battleBlood.js) never scans pixels; it only plots precomputed anchors / paths and clips to the
frame's alpha with a canvas composite.

  python3 tools/bloodmap/build.py [--only k1,k2] [--defs tools/bloodmap/defs.json] [--jobs 8]

The "overrides" block of an existing data/bloodmaps/<id>.json is preserved and applied on rebuild:
  "overrides": { "*" (every frame) | "<action name | sheet path>": { "frames": [i, ...] (omit = all),
                   "move": { "brow": [dx, dy], ... },         # nudge anchors (sprite px)
                   "set":  { "brow": [x, y], ... },           # absolute anchor position
                   "drop": ["mouth", ...],                    # slot has no wound site in these frames
                   "face": "left" | "right",                  # which side the face is on
                   "headTop": y, "neck": y, "hip": y,         # region boundaries (sprite px)
                   "headSkip": 0.12,                          # skip this share of the body top (ears, horns, hats)
                   "noFace": true,                            # masked / helmeted: no skin face search
                   "skip": true } }                           # no blood at all on these frames (effects-only art)
"""
import json, os, sys, hashlib, argparse, re
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.join(ROOT, 'data', 'bloodmaps')
SLOTS = ['brow', 'nose', 'mouth', 'cheek', 'chest', 'abdomen', 'side', 'upper', 'fore', 'hand', 'thigh', 'shin']
REGION_OF = {'brow': 'head', 'nose': 'head', 'mouth': 'head', 'cheek': 'head', 'chest': 'torso', 'abdomen': 'torso',
             'side': 'torso', 'upper': 'arm', 'fore': 'arm', 'hand': 'arm', 'thigh': 'leg', 'shin': 'leg'}
PATH_MAX = 34
STEP = {(0, 1): 'd', (-1, 1): 'a', (1, 1): 'b', (-1, 0): 'l', (1, 0): 'r'}
TAG_RX = re.compile(r'__[A-Za-z0-9_]+(?=\.png$)')


def canon_path(p):
    return TAG_RX.sub('', p)


def def_key(d):
    return f"{d['sheet']}|{d['sx']}|{d['sy']}|{d['w']}|{d['h']}|{d['n']}"


# ── body mask ──────────────────────────────────────────────────────────────────────────────────────────────
def body_masks(rgba):
    a = rgba[..., 3] >= 128
    if a.sum() < 12:
        return None, None
    lab, n = ndi.label(a, structure=np.ones((3, 3)))
    sizes = ndi.sum(a, lab, range(1, n + 1))
    big = int(np.argmax(sizes)) + 1
    ys, xs = np.nonzero(lab == big)
    bh = ys.max() - ys.min() + 1
    keep = lab == big
    # other large pieces that overlap the main body's box (a split silhouette, e.g. a detached arm in pixel art)
    by0, by1, bx0, bx1 = ys.min(), ys.max(), xs.min(), xs.max()
    for i, s in enumerate(sizes, 1):
        if i == big or s < 0.18 * sizes[big - 1]:
            continue
        yy, xx = np.nonzero(lab == i)
        if yy.min() <= by1 and yy.max() >= by0 and xx.min() <= bx1 + 4 and xx.max() >= bx0 - 4:
            keep |= lab == i
    # open away thin blades / weapon shafts / effect wisps (radius scales with the art's resolution)
    r = max(1, int(round(bh / 75)))
    st = ndi.generate_binary_structure(2, 1)
    opened = ndi.binary_opening(keep, structure=st, iterations=r)
    lab2, n2 = ndi.label(opened, structure=np.ones((3, 3)))
    if n2:
        s2 = ndi.sum(opened, lab2, range(1, n2 + 1))
        body = lab2 == (int(np.argmax(s2)) + 1)
        for i, s in enumerate(s2, 1):
            if s >= 0.25 * s2.max():
                body |= lab2 == i
        body = ndi.binary_dilation(body, structure=st, iterations=r) & keep   # restore the eroded edge pixels
    else:
        body = keep
    # paint mask: body minus bright, saturated glow (ki / aura / energy baked into the frame)
    rgb = rgba[..., :3].astype(np.float32) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    glow = (mx > 0.93) & ((sat > 0.45) | (mn > 0.93))
    paint = body & ~glow
    if paint.sum() < 0.6 * body.sum():
        paint = body                       # a bright-white or neon-suited fighter: don't erase the whole body
    return body, paint


def skin_mask(rgba):
    """exposed skin (any tone): warm, moderately saturated; rejects orange / red cloth by the g/r and b/g ratios."""
    r, g, b = [rgba[..., i].astype(np.float32) for i in range(3)]
    gr = g / np.maximum(r, 1)
    bg = b / np.maximum(g, 1)
    return (r > 70) & (r >= g) & (g >= b) & (gr > 0.5) & (gr < 0.93) & (bg > 0.5) & (bg < 0.97) & (r - b > 18)


def face_box(body, skin, top, H, prev=None):
    """the top-most skin cluster in the upper third of the body = the face (below hair, inside hoods)."""
    if skin is None:
        return None
    lim = top + max(4, int(0.36 * H))
    m = np.zeros_like(body)
    m[top:lim] = skin[top:lim] & body[top:lim]
    if m.sum() < max(5, 0.004 * body.sum()):
        return None
    lab, n = ndi.label(m, structure=np.ones((3, 3)))
    best, cands = None, []
    for i in range(1, n + 1):
        yy, xx = np.nonzero(lab == i)
        if len(yy) < max(4, 0.003 * body.sum()):
            continue
        cand = (int(yy.min()), int(yy.max()), int(xx.min()), int(xx.max()), len(yy))
        cands.append(cand)
        if best is None or cand[0] < best[0] - 2 or (abs(cand[0] - best[0]) <= 2 and cand[4] > best[4]):
            best = cand
    if prev and prev.get('brow') and len(cands) > 1:
        # several skin pieces up top (raised fists, bare arms): the face is the one nearest last frame's face
        px, py = prev['brow']
        best = min(cands, key=lambda c: ((c[2] + c[3]) / 2 - px) ** 2 + ((c[0] + c[1]) / 2 - py) ** 2)
    if not best or best[1] - best[0] < 2:
        return None
    return best


# ── anchors on an UPRIGHT body (head at the top, face toward +x) ──────────────────────────────────────────
def upright_layout(body, face_right=True, ov=None, skin=None, prev=None):
    ov = ov or {}
    ys, xs = np.nonzero(body)
    top, bot = int(ys.min()), int(ys.max())
    H = bot - top + 1
    rows = body.sum(1).astype(np.float32)
    sm = np.convolve(rows, np.ones(3) / 3, mode='same')
    # neck = narrowest row in the upper third (fallback 20 % down)
    lo, hi = top + max(2, int(0.10 * H)), top + max(4, int(0.33 * H))
    neck = top + int(0.2 * H)
    if hi > lo + 1:
        seg = sm[lo:hi]
        head_w = np.median(sm[top:lo]) if lo > top else seg.max()
        j = int(np.argmin(seg))
        if seg[j] < 0.92 * max(head_w, np.median(seg)):
            neck = lo + j
    neck = int(ov.get('neck', neck))
    top = int(ov.get('headTop', top))
    if ov.get('headSkip'):                               # ears / horns / hats / tall hair above the real head
        top = top + int(ov['headSkip'] * H)
        neck = max(neck, top + max(3, int(0.12 * H)))
    # hip = first row in the lower half where the silhouette splits into two runs (legs); fallback 55 %
    hip = top + int(0.55 * H)
    for y in range(top + int(0.45 * H), top + int(0.75 * H)):
        r = body[y]
        runs = np.count_nonzero(np.diff(np.concatenate([[0], r.astype(np.int8), [0]])) == 1)
        if runs >= 2 and r.sum() > 0:
            hip = y
            break
    hip = min(hip, top + int(0.62 * H))                 # long robes / coats never split: cap at 62 %
    hip = int(ov.get('hip', hip))
    hip = max(hip, neck + 3)
    sgn = 1 if face_right else -1

    def row_extent(y):
        y = int(np.clip(y, 0, body.shape[0] - 1))
        c = np.nonzero(body[y])[0]
        return (int(c.min()), int(c.max())) if len(c) else None

    A = {}
    hh = max(3, neck - top)
    head_cols = np.nonzero(body[top:neck + 1].any(0))[0]
    hx0, hx1 = (int(head_cols.min()), int(head_cols.max())) if len(head_cols) else (0, 0)
    hw = max(2, hx1 - hx0 + 1)
    front = (lambda e: e[1]) if face_right else (lambda e: e[0])

    def face_pt(fy, inset):
        e = row_extent(top + fy * hh)
        if not e:
            return None
        return (front(e) - sgn * inset, int(top + fy * hh))

    fb = None if ov.get('noFace') else face_box(body, skin, top, H, prev)
    cx_head = (hx0 + hx1) / 2
    if fb:
        # a visible face: anchors on the skin box (hair / hoods / helmets above it never take face wounds)
        fy0, fy1, fx0, fx1, _ = fb
        fy1 = max(fy1, min(neck, fy0 + 3))
        if neck <= fy1:                                  # the neck is under the face, never above it
            neck = min(hip - 3, fy1 + 1) if 'neck' not in ov else neck
        fh, fw = fy1 - fy0 + 1, fx1 - fx0 + 1
        fr = fx1 if face_right else fx0
        A['brow'] = (fr - sgn * max(1, 0.35 * fw), fy0 + 0.12 * fh)
        A['nose'] = (fr - sgn * 0.5, fy0 + 0.55 * fh)
        A['mouth'] = (fr - sgn * max(1, 0.2 * fw), fy0 + 0.82 * fh)
        A['cheek'] = (fr - sgn * 0.6 * fw, fy0 + 0.62 * fh)
        eye = [fx0 + 0.25 * fw, fy0 + 0.22 * fh, fx1 + 1, fy0 + 0.48 * fh] if face_right else \
              [fx0 - 1, fy0 + 0.22 * fh, fx1 - 0.25 * fw, fy0 + 0.48 * fh]
    else:
        A['brow'] = face_pt(0.30, max(1, 0.22 * hw))
        A['nose'] = face_pt(0.60, 1)
        A['mouth'] = face_pt(0.80, max(1, 0.12 * hw))
        A['cheek'] = (cx_head + sgn * 0.10 * hw, int(top + 0.66 * hh))
        eye = [hx0 + 0.40 * hw, top + 0.36 * hh, hx1 + 1, top + 0.56 * hh] if face_right else \
              [hx0 - 1, top + 0.36 * hh, hx1 - 0.40 * hw, top + 0.56 * hh]
    # torso core
    hip = int(min(hip, body.shape[0] - 1)); neck = int(max(0, min(neck, hip - 1)))
    tys, txs = np.nonzero(body[neck:hip + 1])
    cx = float(np.median(txs)) if len(txs) else cx_head
    widths = []
    for y in range(neck, hip + 1):
        c = np.nonzero(body[y])[0]
        if len(c):
            # run containing cx
            inside = c[(c >= cx - 1) & (c <= cx + 1)]
            if len(inside):
                l = r = int(inside[0])
                s = set(c.tolist())
                while l - 1 in s: l -= 1
                while r + 1 in s: r += 1
                widths.append(r - l + 1)
    core = max(2.0, 0.5 * float(np.median(widths)) if widths else 0.12 * H)
    tl = hip - neck
    A['chest'] = (cx + sgn * 0.3 * core, neck + 0.28 * tl)
    A['abdomen'] = (cx + sgn * 0.1 * core, neck + 0.72 * tl)
    A['side'] = (cx - sgn * 0.75 * core, neck + 0.5 * tl)
    # arms: pixels in the shoulder → hip band clearly outside the torso core
    band = np.zeros_like(body)
    y0, y1 = neck, hip
    band[y0:y1 + 1] = body[y0:y1 + 1]
    yy, xx = np.nonzero(band)
    arm = np.abs(xx - cx) > core * 1.35
    shoulder = (cx + sgn * core * 0.8, neck + 0.12 * tl)
    if arm.sum() >= 4:
        ay, ax = yy[arm], xx[arm]
        d = (ax - shoulder[0]) ** 2 + (ay - shoulder[1]) ** 2
        k = int(np.argmax(d))
        hand = (float(ax[k]), float(ay[k]))
    else:
        hand = (cx + sgn * core * 0.95, neck + 0.78 * tl)
    A['hand'] = hand
    A['upper'] = (shoulder[0] + 0.28 * (hand[0] - shoulder[0]), shoulder[1] + 0.28 * (hand[1] - shoulder[1]))
    A['fore'] = (shoulder[0] + 0.66 * (hand[0] - shoulder[0]), shoulder[1] + 0.66 * (hand[1] - shoulder[1]))
    ll = max(2, bot - hip)
    for slot, f in (('thigh', 0.3), ('shin', 0.72)):
        e = row_extent(hip + f * ll)
        A[slot] = ((e[1] - 0.35 * (e[1] - e[0])) if (e and face_right) else (e[0] + 0.35 * (e[1] - e[0])) if e else cx, hip + f * ll)
    return A, eye, dict(top=top, neck=neck, hip=hip, bot=bot)


def snap(paint, pt, rad):
    if pt is None:
        return None
    x, y = int(round(pt[0])), int(round(pt[1]))
    h, w = paint.shape
    best, bd = None, 1e9
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            X, Y = x + dx, y + dy
            if 0 <= X < w and 0 <= Y < h and paint[Y, X]:
                d = dx * dx + dy * dy
                if d < bd:
                    bd, best = d, (X, Y)
    return best


def in_eye(eye, x, y):
    return eye is not None and eye[0] <= x <= eye[2] and eye[1] <= y <= eye[3]


def trickle(paint, lum, eye, start, seed):
    """pixel path DOWN the body from a wound (screen gravity), never through the eye box."""
    if start is None:
        return ''
    h, w = paint.shape
    x, y = start
    out, side = [], 0
    pref = 1 if (seed & 1) else -1
    rng = (seed * 2654435761 + 12345) & 0xffffffff
    for step in range(PATH_MAX):
        moved = False
        rng = (rng * 1103515245 + 12345) & 0x7fffffff
        wander = (rng >> 16) % 100 < 28            # ~28 % of steps drift sideways: a trickle meanders, it isn't ruled
        if (rng >> 8) % 100 < 12:
            pref = -pref
        order = ((pref, 1), (0, 1), (-pref, 1)) if wander else ((0, 1), (pref, 1), (-pref, 1))
        for dx, dy in order + ((pref, 0) if side < 2 else (9, 9), (-pref, 0) if side < 2 else (9, 9)):
            if dx == 9:
                continue
            X, Y = x + dx, y + dy
            if 0 <= X < w and 0 <= Y < h and paint[Y, X] and not in_eye(eye, X, Y):
                c = STEP[(dx, dy)]
                out.append(c.upper() if lum[Y, X] < 0.42 else c)
                side = side + 1 if dy == 0 else 0
                x, y, moved = X, Y, True
                break
        if not moved:
            break
    return ''.join(out)


def analyse(rgba, prev=None, ov=None):
    ov = ov or {}
    body, paint = body_masks(rgba)
    if paint is not None and ov.get('excludeGold'):          # held gold props (shields, armour plates): no blood paints there
        r_, g_, b_ = (rgba[..., i].astype(np.int32) for i in range(3))
        paint = paint & ~((r_ > 110) & (g_ * 100 > 72 * r_) & (b_ * 100 < 55 * g_))
    if body is None or ov.get('skip'):
        return None
    ys, xs = np.nonzero(body)
    bh, bw = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
    face_right = ov.get('face', 'right') != 'left'
    skin = skin_mask(rgba)
    horizontal = bw > 1.25 * bh and not ov.get('upright') and (bh < 0.6 * body.shape[0] or ov.get('lying'))   # lying bodies are short in their cell
    if horizontal and not ov.get('lying'):
        # a lunge / skate / dash is wide but upright: a face up top with the body below means don't lay it down
        y0 = int(ys.min()); fb = face_box(body, skin, y0, bh, prev)
        if fb is not None and fb[1] < y0 + 0.40 * bh:
            horizontal = False
    if horizontal:
        # lying / dashing: lay the body upright, analyse, rotate the anchors back. Head end tracked from the previous
        # frame of the strip; with no history the head goes to the LEFT end (knocked back while facing right).
        cands = []
        for k in (3, 1):   # np.rot90 k=3: LEFT end → top (default head end) ; k=1: right end → top
            rb, rp = np.rot90(body, k), np.rot90(paint, k)
            A, eye, R = upright_layout(rb, True, {x: v for x, v in ov.items() if x in ('noFace', 'headSkip')}, np.rot90(skin, k))
            H, W = body.shape

            def back(p, k=k):
                if p is None: return None
                x, y = p
                return (W - 1 - y, x) if k == 1 else (y, H - 1 - x)
            A2 = {s: back(p) for s, p in A.items()}
            cands.append((k, A2))
        # no history: the end holding more skin (the face) wins; else the left end
        if not (prev and prev.get('brow')):
            H, W = body.shape
            sk = skin & body
            third = max(2, W // 3)
            if sk[:, W - third:].sum() > 1.6 * max(1, sk[:, :third].sum()):
                cands.reverse()
        if prev and prev.get('brow'):
            px, py = prev['brow']
            cands.sort(key=lambda c: ((c[1]['brow'][0] - px) ** 2 + (c[1]['brow'][1] - py) ** 2) if c[1]['brow'] else 1e9)
        if ov.get('headEnd') in ('left', 'right'):          # hand fix: which end of a lying body is the head
            cands.sort(key=lambda c: 0 if c[0] == (3 if ov['headEnd'] == 'left' else 1) else 1)
        A = cands[0][1]
        eye, regions = None, None
        # eye box around the rotated brow → nose span
        if A.get('brow') and A.get('nose'):
            bx, by = A['brow']; nx, ny = A['nose']
            eye = [min(bx, nx) - 1, min(by, ny) - 1, max(bx, nx) + 1, max(by, ny) + 1]
    else:
        A, eye, regions = upright_layout(body, face_right, ov, skin, prev)
        # flips / upside-down falls: if the face jumped far from last frame's, try the body rotated 180° and keep
        # whichever layout tracks (a head never teleports between two frames of one strip)
        if prev and prev.get('brow') and A.get('brow') and not ov.get('set') and not ov.get('upright'):
            px, py = prev['brow']
            far = ((A['brow'][0] - px) ** 2 + (A['brow'][1] - py) ** 2) ** 0.5 > 0.4 * bh
            if far:
                H2, W2 = body.shape
                A2, eye2, _ = upright_layout(np.rot90(body, 2), face_right, None, np.rot90(skin, 2), None)
                back = lambda p: None if p is None else (W2 - 1 - p[0], H2 - 1 - p[1])
                A2 = {k: back(v) for k, v in A2.items()}
                if A2.get('brow') and ((A2['brow'][0] - px) ** 2 + (A2['brow'][1] - py) ** 2) < ((A['brow'][0] - px) ** 2 + (A['brow'][1] - py) ** 2):
                    A = A2
                    eye = [W2 - 1 - eye2[2], H2 - 1 - eye2[3], W2 - 1 - eye2[0], H2 - 1 - eye2[1]]
    rad = max(3, int(bh / 12))
    lumimg = (0.3 * rgba[..., 0] + 0.59 * rgba[..., 1] + 0.11 * rgba[..., 2]).astype(np.float32) / 255
    # relative luminance: below the body's own median = shadow side
    med = float(np.median(lumimg[paint])) if paint.any() else 0.5
    rel = lumimg / max(med * 1.25, 1e-3)
    anchors, paths = [], []
    for i, s in enumerate(SLOTS):
        p = A.get(s)
        if s in ov.get('drop', []):
            p = None
        # an arm anchor far out from the chest is on a blade / whip / slash / beam held at arm's length, not the arm
        if p is not None and s in ('upper', 'fore', 'hand') and A.get('chest') is not None and abs(p[0] - A['chest'][0]) > 0.6 * (bw if horizontal else bh):
            p = None
        if p is not None and s in ov.get('move', {}):
            p = (p[0] + ov['move'][s][0], p[1] + ov['move'][s][1])
        if s in ov.get('set', {}):
            p = tuple(ov['set'][s])
        q = snap(paint, p, rad)
        if q is not None and in_eye(eye, *q) and REGION_OF[s] == 'head':
            q = snap(paint & ~eye_mask(paint.shape, eye), q, rad)
        if q is None:
            anchors += [-1, -1, 0]
            paths.append('')
            continue
        anchors += [int(q[0]), int(q[1]), 1 if rel[q[1], q[0]] < 0.42 else 0]
        paths.append(trickle(paint, rel, eye, q, i * 7 + q[0]))
    e = [int(round(v)) for v in eye] if eye else [-1, -1, -1, -1]
    return {'o': int(body.sum()), 'e': e, 'a': anchors, 'p': paths, 'hz': 1 if horizontal else 0}


def eye_mask(shape, eye):
    m = np.zeros(shape, bool)
    if eye:
        x0, y0, x1, y1 = [int(round(v)) for v in eye]
        m[max(0, y0):max(0, y1 + 1), max(0, x0):max(0, x1 + 1)] = True
    return m


# ── per character ─────────────────────────────────────────────────────────────────────────────────────────
_SHEETS = {}


def sheet(path):
    im = _SHEETS.get(path)
    if im is None:
        try:
            im = np.asarray(Image.open(os.path.join(ROOT, path)).convert('RGBA'))
        except Exception:
            im = False
        if len(_SHEETS) > 64:
            _SHEETS.clear()
        _SHEETS[path] = im
    return im


def frame_of(img, d, i):
    x0, y0 = d['sx'] + i * d['w'], d['sy']
    H, W = img.shape[:2]
    if x0 >= W or y0 >= H:
        return None
    return img[y0:min(H, y0 + d['h']), x0:min(W, x0 + d['w'])]


def build_char(args):
    key, info = args
    out_path = os.path.join(OUT_DIR, f'{key}.json')
    overrides = {}
    if os.path.exists(out_path):
        try:
            overrides = json.load(open(out_path)).get('overrides', {})
        except Exception:
            overrides = {}
    frames, sig_ix, index, alias = [], {}, {}, {}
    defs = info['defs']
    # canonical (tag-stripped) defs first, so a "__skin" recolour of a known sheet costs nothing
    defs.sort(key=lambda d: (TAG_RX.search(d['sheet']) is not None, not d.get('base'), d['sheet']))
    seen_canon = set()
    for d in defs:
        k = def_key(d)
        cp = canon_path(d['sheet'])
        if cp != d['sheet']:
            ck = def_key({**d, 'sheet': cp})
            if ck in seen_canon:
                continue                               # runtime strips "__tag" before lookup
        img = sheet(d['sheet'])
        if img is False or img is None:
            continue
        ov_all = {**overrides.get('*', {}), **overrides.get(d.get('act') or '', {}), **overrides.get(d['sheet'], {})}
        ids, prev = [], None
        for i in range(d['n']):
            fr = frame_of(img, d, i)
            if fr is None or fr.size == 0:
                ids.append(-1)
                continue
            ov = ov_all if ('frames' not in ov_all or i in ov_all['frames']) else {}
            sig = hashlib.md5((fr[..., 3] >= 128).tobytes() + bytes(str(fr.shape) + json.dumps(ov, sort_keys=True), 'utf8')).hexdigest()[:16]
            if sig in sig_ix:
                ids.append(sig_ix[sig])
                if sig_ix[sig] < 0:
                    continue
                fm = frames[sig_ix[sig]]
            else:
                try:
                    fm = analyse(fr, prev, ov)
                except Exception as ex:                # one odd frame never sinks a whole character
                    print(f'  ! {key} {d["sheet"]}#{i}: {ex}', file=sys.stderr)
                    fm = None
                if fm is None:
                    ids.append(-1)
                    sig_ix[sig] = -1
                    continue
                sig_ix[sig] = len(frames)
                ids.append(len(frames))
                frames.append(fm)
            if isinstance(fm, dict):
                b = fm['a'][0:2]
                prev = {'brow': tuple(b)} if b[0] >= 0 else prev
        if all(x == -1 for x in ids):
            continue
        index[k] = ids
        seen_canon.add(def_key({**d, 'sheet': cp}))
        if d.get('act'):
            alias.setdefault(f"{d['act']}|{d['w']}|{d['h']}|{d['n']}", k)
    data = {'id': key, 'name': info.get('name'), 'universe': info.get('universe'), 'slots': SLOTS,
            'frames': frames, 'index': index, 'byAction': alias, 'overrides': overrides}
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    return key, len(frames), sum(len(v) for v in index.values()), os.path.getsize(out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--defs', default=os.path.join(ROOT, 'tools', 'bloodmap', 'defs.json'))
    ap.add_argument('--only', default='')
    ap.add_argument('--jobs', type=int, default=8)
    a = ap.parse_args()
    allc = json.load(open(a.defs))
    keys = [k for k in allc if not a.only or k in a.only.split(',')]
    with ProcessPoolExecutor(a.jobs) as ex:
        for key, nf, ni, size in ex.map(build_char, [(k, allc[k]) for k in keys]):
            print(f'{key:24s} unique frames {nf:5d}  indexed frames {ni:6d}  {size / 1024:7.0f} KB', flush=True)


if __name__ == '__main__':
    main()
