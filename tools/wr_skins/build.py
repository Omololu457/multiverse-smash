#!/usr/bin/env python3
"""tools/wr_skins/build.py — Ninja Storm MS_V1 Ranger Version (windrangers): 10 themed skins for BOTH forms.

Every strip / projectile / FX sheet of assets/ns_red (Shane) and assets/ns_yellow (Dustin) is recoloured into
assets/windrangers/skins/<tag>/<form>/ — geometry, frame map, anchors and alpha are untouched (cosmetic only), so move
timing, hitboxes and collision cannot change. Costume details (Alien X's space slice + stars, the Kintsugi fork, the pit-crew
calf stripe, …) are BAKED into each frame at body regions found per frame from the sheet's own palette:

    suit  = the 5-tone suit ramp (red on Shane's sheet, yellow on Dustin's)   → torso / legs / helmet
    metal = the silver ramp                                                   → sleeves (arms) — and the sword blade
    white = (255,255,255) at a sleeve's far end                               → glove
    head  = suit pixels in the top 22% of the suit box; boots = suit pixels in the bottom 16%

so a star on the wrist rides the wrist through a punch, a flip and (because the canvas mirrors the whole cell) a mirrored
pose. The per-frame anchors (stars, seam, tracks, lights, notch, heel, mirror tiles, boot band, fork) are written to
windrangersSkinAnchors.js for the render-only effects in windrangersSkinFx.js.

Clone variants (<tag>/clone_<form>/) exist for the three skins whose brief gives the clone its own look
(Alien X turquoise stars, Feedback dark-copper tracks, Woodblock offset red print edge).

    python3 tools/wr_skins/build.py            (all)      python3 tools/wr_skins/build.py alienx   (one tag)
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = {'ns_red': os.path.join(ROOT, 'assets/ns_red'), 'ns_yellow': os.path.join(ROOT, 'assets/ns_yellow')}
OUT = os.path.join(ROOT, 'assets/windrangers/skins')
SPEC = os.path.join(os.path.dirname(__file__), 'skins.json')
CELL_W, CELL_H = 260, 136

SUIT = {'ns_red': [(231, 41, 41), (198, 24, 24), (181, 0, 8), (148, 0, 8), (90, 0, 0)],
        'ns_yellow': [(231, 206, 41), (198, 173, 24), (156, 132, 16), (123, 99, 8), (90, 57, 0)]}
METAL = [(255, 255, 255), (198, 198, 198), (140, 140, 140), (107, 107, 107), (74, 74, 74), (66, 66, 66)]
METAL_K = [1.0, 0.78, 0.55, 0.42, 0.29, 0.26]
GOLD = [(231, 189, 41), (222, 156, 33), (173, 99, 24), (239, 148, 0), (255, 214, 90), (247, 247, 115), (222, 189, 90), (181, 148, 49), (189, 156, 66), (181, 148, 57), (181, 140, 49)]
DARK = [(0, 0, 0), (8, 0, 0), (16, 16, 16)]


def hx(c):
    c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def ramp(base, ks=(1.18, 1.0, 0.86, 0.68, 0.42)):
    b = hx(base) if isinstance(base, str) else base
    return [np.clip(b * k + (k > 1) * (k - 1) * 60, 0, 255) for k in ks]


def hash3(x, y, z, salt=0):
    v = (x * 374761393 + y * 668265263 + z * 2147483647 + salt * 1274126177) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65536.0


def match(rgb, cols):
    m = np.zeros(rgb.shape[:2], bool)
    for c in cols: m |= (rgb[..., 0] == c[0]) & (rgb[..., 1] == c[1]) & (rgb[..., 2] == c[2])
    return m


def components(mask):
    """4-connected components → list of (ys, xs) arrays."""
    h, w = mask.shape; seen = np.zeros_like(mask); out = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]: continue
        st = [(y0, x0)]; seen[y0, x0] = True; ys, xs = [], []
        while st:
            y, x = st.pop(); ys.append(y); xs.append(x)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
        out.append((np.array(ys), np.array(xs)))
    return out


def line(p0, p1):
    (x0, y0), (x1, y1) = p0, p1; n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    return [(int(round(x0 + (x1 - x0) * t / max(1, n - 1))), int(round(y0 + (y1 - y0) * t / max(1, n - 1)))) for t in range(n)]


# ── per-frame body analysis (geometry only: identical on both forms — checked in main) ─────────────────────────────
def analyse(cell, form):
    rgb, a = cell[..., :3].astype(int), cell[..., 3] > 0
    suit = match(rgb, SUIT[form]) & a
    if suit.sum() < 40: return None
    metal = match(rgb, METAL) & a
    ys, xs = np.nonzero(suit)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max(); H = max(1, y1 - y0)
    head = suit & (np.arange(cell.shape[0])[:, None] <= y0 + 0.22 * H)
    torso_rows = (np.arange(cell.shape[0])[:, None] > y0 + 0.22 * H) & (np.arange(cell.shape[0])[:, None] < y0 + 0.62 * H)
    torso = suit & torso_rows
    if torso.sum() < 8: torso = suit
    ty, tx = np.nonzero(torso); cx, cy = float(tx.mean()), float(ty.mean())
    boots = suit & (np.arange(cell.shape[0])[:, None] >= y1 - 0.16 * H)
    hy, hxs = np.nonzero(head) if head.any() else (ys, xs)
    head_box = (int(hxs.min()), int(hy.min()), int(hxs.max()), int(hy.max()))
    neck_y = int(head_box[3]) + 1
    # sleeves: the silver ramp is broken up by 1-px outline pixels → join fragments across a 1-px gap (3×3 dilation),
    # then drop the chest emblem (small, centred on the torso) and the sword blade (big, or outside the suit box)
    dil = metal.copy()
    dil[1:] |= metal[:-1]; dil[:-1] |= metal[1:]; dil[:, 1:] |= metal[:, :-1]; dil[:, :-1] |= metal[:, 1:]
    dil[1:, 1:] |= metal[:-1, :-1]; dil[:-1, :-1] |= metal[1:, 1:]; dil[1:, :-1] |= metal[:-1, 1:]; dil[:-1, 1:] |= metal[1:, :-1]
    arms, blade = [], np.zeros_like(metal)
    for cy_, cx_ in components(dil):
        keep = metal[cy_, cx_]; cy_, cx_ = cy_[keep], cx_[keep]; n = len(cy_)
        if n == 0: continue
        inside = (cx_.min() >= x0 - 10) and (cx_.max() <= x1 + 10) and (cy_.min() >= y0 - 4) and (cy_.max() <= y1)
        emblem = n < 26 and abs(cx_.mean() - cx) < 5 and neck_y + 1 <= cy_.mean() <= cy + 8
        if 6 <= n <= 120 and inside and not emblem: arms.append((cy_, cx_))
        elif not emblem: blade[cy_, cx_] = True
    # an arm = every kept sleeve pixel on one side of the torso centre (fragments included): front = +x (the sheet faces right)
    armm = np.zeros_like(metal)
    for cy_, cx_ in arms: armm[cy_, cx_] = True
    XX = np.arange(metal.shape[1])[None, :]
    arms = [c for c in (np.nonzero(armm & (XX <= cx - 1)), np.nonzero(armm & (XX >= cx + 1))) if len(c[0]) >= 4]
    arms.sort(key=lambda c: c[1].mean())
    def arm_info(c):
        ay, ax = c; d = (ax - cx) ** 2 + (ay - (neck_y + 3)) ** 2
        i_sh = int(d.argmin()); sh = (int(ax[i_sh]), int(ay[i_sh]))
        e = (ax - sh[0]) ** 2 + (ay - sh[1]) ** 2; i_wr = int(e.argmax()); wr = (int(ax[i_wr]), int(ay[i_wr]))
        return {'pix': c, 'sh': sh, 'wr': wr, 'mid': ((sh[0] + wr[0]) // 2, (sh[1] + wr[1]) // 2)}
    front = arm_info(arms[-1]) if arms and arms[-1][1].mean() > cx - 2 else None
    back = arm_info(arms[0]) if arms and (front is None or len(arms) > 1) and arms[0][1].mean() <= cx + 2 else None
    YY, XX2 = np.mgrid[0:cell.shape[0], 0:cell.shape[1]]
    outside = (XX2 < x0 - 3) | (XX2 > x1 + 3) | (YY < y0 - 3)
    blade |= a & outside & ~suit & ~match(rgb, DARK)
    by, bx = np.nonzero(boots)
    tip = None
    if blade.any():
        ref = front['wr'] if front else (back['wr'] if back else (int(cx), int(cy)))
        bly, blx = np.nonzero(blade); d = (blx - ref[0]) ** 2 + (bly - ref[1]) ** 2
        tip = (int(blx[d.argmax()]), int(bly[d.argmax()])); hilt = (int(blx[d.argmin()]), int(bly[d.argmin()]))
    return {'suit': suit, 'metal': metal, 'head': head, 'torso': torso, 'boots': boots, 'blade': blade, 'front': front, 'back': back,
            'box': (int(x0), int(y0), int(x1), int(y1)), 'c': (cx, cy), 'headBox': head_box, 'neckY': neck_y,
            'heel': (int(bx.min()), int(by.max())) if len(bx) else (int(x0), int(y1)), 'tip': tip, 'hilt': hilt if tip else None}


# ── per-skin bakes: return (rgb', anchors) ─────────────────────────────────────────────────────────────────────────
def put(rgb, a, pts, col, only=None):
    h, w = a.shape
    for x, y in pts:
        if 0 <= x < w and 0 <= y < h and a[y, x] and (only is None or only[y, x]): rgb[y, x] = col


def base_map(rgb, a, form, sk, B):
    """the palette swap: suit ramp / metal / gold / dark / effect hues → the skin's colours (vectorised)."""
    out = rgb.astype(np.float32).copy()
    keep_suit = sk.get('keepSuit')
    if not keep_suit:
        R = ramp(sk['suit'])
        for i, c in enumerate(SUIT[form]): out[match(rgb, [c]) & a] = R[i]
    if sk.get('metal'):
        m = hx(sk['metal'])
        for c, k in zip(METAL, METAL_K): out[match(rgb, [c]) & a] = np.clip(m * (k / 0.78), 0, 255)
    if sk.get('gold'):
        g = hx(sk['gold'])
        for c in GOLD: out[match(rgb, [c]) & a] = np.clip(g * (sum(c) / 3 / 170), 0, 255)
    if sk.get('dark'):
        d = hx(sk['dark'])
        for c in DARK: out[match(rgb, [c]) & a] = d
    if sk.get('fx'):   # effect pixels (wind / beam / spark): anything saturated that is not a palette colour
        pal = match(rgb, SUIT[form] + METAL + GOLD + DARK)
        r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
        mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
        sat = (mx - mn) / np.maximum(mx, 1)
        fxm = a & ~pal & (sat > 0.3)
        f = hx(sk['fx']); L = (mx / 255.0)[..., None]
        out[fxm] = np.clip(f * L[fxm] * 1.25, 0, 255)
    return out


def bake(rgb0, a, form, sk, B, fi, role):
    rgb = base_map(rgb0, a, form, sk, B)
    tag, an = sk['tag'], {}
    if not B: return rgb, an
    F, Bk = B['front'], B['back']
    if tag == 'alienx':
        space = np.zeros_like(a)
        if F:
            space[F['pix']] = True
            sx, sy = F['sh']
            yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
            space |= B['suit'] & ~B['head'] & ((xx - sx) ** 2 + (yy - sy) ** 2 <= 9)               # the shoulder
            cx, cy = B['c']                                                                         # diagonal chest slice: shoulder → across the chest
            px, py = cx - (sx - cx) * 0.7, cy + 3
            vx, vy = px - sx, py - sy; L2 = max(1e-6, vx * vx + vy * vy)
            t = ((xx - sx) * vx + (yy - sy) * vy) / L2
            d = np.abs(vy * xx - vx * yy + px * sy - py * sx) / np.sqrt(L2)
            space |= B['torso'] & (d <= 1.6) & (t >= -0.05) & (t <= 1.05)
        mid = hx('#0c1035')
        for y, x in zip(*np.nonzero(space & a)):
            r = hash3(int(x), int(y), fi, 3)
            rgb[y, x] = mid * (0.8 + 0.5 * r) if r > 0.12 else hx('#2a1f5c')
        if F:   # three ivory stars in a CROOKED line wrist → collar
            wr, sh = F['wr'], F['sh']
            s1 = wr; s2 = ((wr[0] + sh[0]) // 2 + 1, (wr[1] + sh[1]) // 2 - 1); s3 = (sh[0] - 1, max(B['neckY'] + 1, sh[1] - 1))
            stars = [s1, s2, s3]
            col = hx('#3ff5e0') if role == 'clone' else hx('#fff6dc')
            halo = hx('#1f7f86') if role == 'clone' else hx('#8f86b8')
            for x, y in stars:   # a 1-px ivory core + a dim cross (inside the space only), so it reads at native size
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= y + dy < a.shape[0] and 0 <= x + dx < a.shape[1] and space[y + dy, x + dx]: rgb[y + dy, x + dx] = halo
                if 0 <= y < a.shape[0] and 0 <= x < a.shape[1] and a[y, x]: rgb[y, x] = col
            an['stars'] = stars
    elif tag == 'disco':
        tiles = []
        for arm in (F, Bk):
            if not arm: continue
            sx, sy = arm['sh']
            for dx in range(-2, 3):
                for dy in range(-2, 2):
                    x, y = sx + dx, sy + dy
                    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1] and (B['suit'][y, x] or B['metal'][y, x]) and not B['head'][y, x]:
                        rgb[y, x] = hx('#ff3fa4') if (x + y) % 2 else hx('#ffb3dc'); tiles.append((x, y))
        by, bx = np.nonzero(B['boots']); cx = B['c'][0]; band = []
        for y, x in zip(by, bx):
            outer = abs(x - cx) >= np.percentile(np.abs(bx - cx), 45) if len(bx) else False
            if outer: rgb[y, x] = hx('#ff3fa4') if (x // 2 + y // 2) % 2 else hx('#ffb3dc'); tiles.append((int(x), int(y)))
            band.append((int(x), int(y)))
        an['tiles'] = tiles[::2]; an['boot'] = band
    elif tag == 'valkyrie':
        arm = Bk or F
        if arm:
            sx, sy = arm['sh']
            for i in range(3):   # three red wing marks swept back (toward -x = behind him) along the shoulder
                put(rgb, a, line((sx - i, sy + i * 2 - 1), (sx - 3 - i, sy + i * 2 - 2)), hx('#e0202a'), B['suit'] | B['metal'])
    elif tag == 'ghostfreak':
        hb = B['headBox']; top = (hb[2] - 1, hb[3] - 2); cx, cy = B['c']
        bot = (int(cx + 2), int(B['box'][1] + 0.6 * (B['box'][3] - B['box'][1])))
        pts = line(top, bot); pts = [(x + (1 if (i // 3) % 2 else 0), y) for i, (x, y) in enumerate(pts)]   # crooked
        put(rgb, a, pts, hx('#000000')); put(rgb, a, [(x + 1, y) for x, y in pts], hx('#1a0b28'), B['suit'])
        an['seam'] = pts[len(pts) // 2]; an['seamA'] = pts[len(pts) // 3]; an['seamB'] = pts[2 * len(pts) // 3]
    elif tag == 'feedback':
        tcol = hx('#7a4318') if role == 'clone' else hx('#f5c542')
        for arm in (F, Bk):
            if not arm: continue
            put(rgb, a, line(arm['sh'], arm['wr']), tcol, B['metal'])
            put(rgb, a, [(x + 1, y) for x, y in line(arm['sh'], arm['wr'])], tcol, B['metal'])
            wx, wy = arm['wr']   # copper fingertips: the glove's white pixels around the wrist end
            for dx in range(-2, 3):
                for dy in range(-2, 3):
                    x, y = wx + dx, wy + dy
                    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1] and a[y, x] and tuple(rgb0[y, x]) == (255, 255, 255): rgb[y, x] = hx('#c87533')
        if F: an['elbow'] = F['mid']; an['muzzle'] = F['wr']
    elif tag == 'divergent':
        hb = B['headBox']
        for y, x in zip(*np.nonzero(B['head'])):
            if y <= hb[1] + 0.4 * (hb[3] - hb[1]): rgb[y, x] = hx('#ff6fae') if (x + y) % 3 else hx('#ff9ccb')
        for y, x in zip(*np.nonzero(B['suit'])):
            if B['neckY'] <= y <= B['neckY'] + 1: rgb[y, x] = hx('#d01a2a')
        if F: an['fist'] = F['wr']
    elif tag == 'salaryman':
        cx, cy = B['c']; x0, y0, x1, y1 = B['box']
        tie = line((int(cx - 4), B['neckY'] + 2), (int(cx + 4), int(B['neckY'] + 10)))
        put(rgb, a, tie + [(x, y + 1) for x, y in tie], hx('#d4a017'), B['torso'])
        for arm in (F, Bk):
            if not arm: continue
            wx, wy = arm['wr']
            for dx in range(-2, 3):
                for dy in range(-2, 3):
                    x, y = wx + dx, wy + dy
                    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1] and a[y, x] and tuple(rgb0[y, x]) == (255, 255, 255): rgb[y, x] = hx('#1d2a4a')
        if B['tip']:
            bl = B['blade'] & a
            L = np.clip(rgb0[..., :3].sum(-1) / 765.0, 0, 1)[..., None]
            rgb[bl] = hx('#151515') * 0.6 + hx('#3a3a3a') * 0.4 * L[bl]
            hx0, hy0 = B['hilt']; tx, ty = B['tip']
            nx, ny = int(round(hx0 + 0.7 * (tx - hx0))), int(round(hy0 + 0.7 * (ty - hy0)))
            ys, xs = np.nonzero(bl); k = int(((xs - nx) ** 2 + (ys - ny) ** 2).argmin())
            n = (int(xs[k]), int(ys[k])); rgb[n[1], n[0]] = hx('#fff2a8')
            an['notch'] = n; an['tip'] = B['tip']; an['hilt'] = B['hilt']
    elif tag == 'kintsugi':
        gold = hx('#e6b84a')
        suit = B['suit'] & ~B['head']
        for y, x in zip(*np.nonzero(suit)):
            if hash3(int(x) // 3, int(y) // 3, 0, 11) < 0.10 and hash3(int(x), int(y), 0, 12) < 0.55: rgb[y, x] = gold * 0.85
        cx, cy = B['c']; j = (int(cx), int(cy + 2))
        top_l, top_r = (int(cx - 4), B['neckY'] + 2), (int(cx + 4), B['neckY'] + 1)
        low = (int(cx + 1), int(B['box'][1] + 0.62 * (B['box'][3] - B['box'][1])))
        for p0, p1 in ((top_l, j), (top_r, j), (j, low)): put(rgb, a, line(p0, p1), gold, B['torso'] | B['suit'])
        an['fork'] = [top_l, top_r, j, low]
    elif tag == 'pitcrew':
        for y, x in zip(*np.nonzero(B['head'])): rgb[y, x] = hx('#f4f1ea') * (0.82 + 0.18 * (y == B['headBox'][1]))
        for arm in (F, Bk):
            if not arm: continue
            wx, wy = arm['wr']
            for dx in range(-2, 3):
                for dy in range(-2, 3):
                    x, y = wx + dx, wy + dy
                    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1] and a[y, x] and tuple(rgb0[y, x]) == (255, 255, 255): rgb[y, x] = hx('#ff7a1a')
        x0, y0, x1, y1 = B['box']; cx = B['c'][0]
        legs = B['suit'] & (np.arange(a.shape[0])[:, None] >= y0 + 0.62 * (y1 - y0)) & (np.arange(a.shape[0])[:, None] < y1 - 0.16 * (y1 - y0))
        ly, lx = np.nonzero(legs & (np.arange(a.shape[1])[None, :] > cx))
        if len(lx):
            col = int(np.median(lx))
            for y in sorted(set(ly.tolist())):
                for x in (col, col + 1):
                    if 0 <= x < a.shape[1] and legs[y, x]: rgb[y, x] = hx('#f4f1ea') if (x + y) % 2 else hx('#111111')
        if F:
            pts = line(F['mid'], F['wr'])[1:4] or [F['mid']]
            put(rgb, a, pts, hx('#6a4200'), B['metal']); an['lights'] = pts
        an['heel'] = B['heel']
    elif tag == 'woodblock':   # a flat 3-ink print: paper highlight / vermilion / indigo shadow, folds in thick black
        S = SUIT[form]
        for i, c in enumerate(S):
            m = match(rgb0, [c]) & a
            rgb[m] = [hx('#f2683f'), hx('#e34234'), hx('#e34234'), hx('#22305c'), hx('#0d0d0d')][i]
        L = rgb0.sum(-1)
        rgb[a & (L > 600) & ~B['suit']] = hx('#f3e6c8')
        rgb[a & (L < 260) & ~B['suit']] = hx('#22305c')
        rgb[a & match(rgb0, DARK)] = hx('#0d0d0d')
        # thick black folds: the outline grows by one pixel inward wherever the suit meets the transparent background
        edge = np.zeros_like(a); edge[1:] |= ~a[:-1]; edge[:-1] |= ~a[1:]; edge[:, 1:] |= ~a[:, :-1]; edge[:, :-1] |= ~a[:, 1:]
        rgb[edge & B['suit']] = hx('#0d0d0d')
    return rgb, an


def edge_print(img_rgba, col=(216, 38, 42)):
    """the clone's slightly offset red print edge: the silhouette shifted (+1, +1) in red BEHIND the body."""
    a = img_rgba[..., 3] > 0
    sh = np.zeros_like(a); sh[1:, 1:] = a[:-1, :-1]
    out = img_rgba.copy(); m = sh & ~a
    out[m] = (*col, 255)
    return out


def process(form, fname, sk, role, anchors):
    src = os.path.join(SRC[form], fname)
    im = np.array(Image.open(src).convert('RGBA'))
    strip = not (fname.startswith('proj_') or fname.startswith('fx') or fname.startswith('portrait') or fname in ('hitSpark.png',))
    h, w = im.shape[:2]
    out = im.copy()
    n = max(1, w // CELL_W) if strip and h == CELL_H and w % CELL_W == 0 else 1
    cw = w // n
    for fi in range(n):
        cell = im[:, fi * cw:(fi + 1) * cw]
        a = cell[..., 3] > 0
        B = analyse(cell, form) if strip and n >= 1 and h == CELL_H else None
        rgb, an = bake(cell[..., :3].astype(int), a, form, sk, B, fi, role)
        out[:, fi * cw:(fi + 1) * cw, :3] = np.clip(np.rint(rgb), 0, 255).astype(np.uint8)
        if an and role == 'body' and form == 'ns_red': anchors.setdefault(fname[:-4], {})[fi] = an
    if role == 'clone' and sk['tag'] == 'woodblock' and strip:
        out = edge_print(out)
    return Image.fromarray(out, 'RGBA')


def portrait_recolor(form, sk, name):
    # the portraits have their own palette (helmet shading, blue card background) → recolour by hue class + luminance so
    # the preview shows the SAME suit / trim colours as the body strips (background, visor, white kept)
    im = np.array(Image.open(os.path.join(SRC[form], name)).convert('RGBA')).astype(float)
    rgb, a = im[..., :3], im[..., 3] > 0
    mx, mn = rgb.max(-1), rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) % 360
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    if form == 'ns_red': suit = a & (sat > 0.3) & ((hue < 22) | (hue > 300)); ref = lum[suit].max() if suit.any() else 120
    else: suit = a & (sat > 0.28) & (hue >= 52) & (hue <= 80); ref = lum[suit].max() if suit.any() else 200
    gold = a & ~suit & (sat > 0.35) & (hue >= 30) & (hue < 52)
    out = rgb.copy()
    if not sk.get('keepSuit'):
        base = hx(sk['suit']).astype(float); k = np.clip(lum / max(ref, 1) * 1.12, 0.25, 1.6)[..., None]
        out = np.where(suit[..., None], np.clip(base * np.minimum(k, 1) + np.maximum(k - 1, 0) * 255, 0, 255), out)
    HELM = {'pitcrew': ('#e9e6df', 1.0), 'divergent': ('#e87fa6', 0.36)}   # pearl helmet / rose-pink crown (as baked on the body)
    if sk['tag'] in HELM:
        hc, frac = HELM[sk['tag']]; yy = np.mgrid[0:a.shape[0], 0:a.shape[1]][0]
        k = np.clip(lum / max(ref, 1) * 1.12, 0.25, 1.6)[..., None]; m = suit & (yy < a.shape[0] * frac)
        out = np.where(m[..., None], np.clip(hx(hc).astype(float) * np.minimum(k, 1) + np.maximum(k - 1, 0) * 255, 0, 255), out)
    if 'gold' in sk:
        gb = hx(sk['gold']).astype(float); k = np.clip(lum / 200.0, 0.3, 1.4)[..., None]
        out = np.where(gold[..., None], np.clip(gb * np.minimum(k, 1) + np.maximum(k - 1, 0) * 255, 0, 255), out)
    res = np.concatenate([out, im[..., 3:]], -1).astype(np.uint8)
    if sk['tag'] == 'alienx' and name == 'portrait_large.png':   # the showcase: a diagonal slice of midnight space with three ivory stars
        H, W = a.shape; yy, xx = np.mgrid[0:H, 0:W]; band = suit & (np.abs((xx - W * 0.15) - (yy - H * 0.55) * -0.9) < 3.2)
        res[band, :3] = (14, 10, 40)
        for t in (0.2, 0.5, 0.8):
            ys = np.nonzero(band.any(1))[0]
            if len(ys): y = int(ys[0] + t * (ys[-1] - ys[0])); xs = np.nonzero(band[y])[0]
            if len(ys) and len(xs): res[y, int(xs.mean()), :3] = (255, 246, 220)
    return Image.fromarray(res)


def portrait_composite(dirs, out, sk=None):
    if sk:
        for form in SRC:
            for n in ('portrait_large.png', 'portrait_small.png'): portrait_recolor(form, sk, n).save(os.path.join(dirs[form], n), optimize=True)
    a = Image.open(os.path.join(dirs['ns_red'], 'portrait_large.png')).convert('RGBA'); b = Image.open(os.path.join(dirs['ns_yellow'], 'portrait_large.png')).convert('RGBA')
    w, h = a.size; c = a.copy(); pb, pc = b.load(), c.load()
    for y in range(h):
        for x in range(w):
            if x > w * (0.62 - 0.24 * y / h): pc[x, y] = pb[x, y]
    c.save(out, optimize=True)


def main():
    spec = json.load(open(SPEC)); only = set(sys.argv[1:])
    files = sorted(f for f in os.listdir(SRC['ns_red']) if f.endswith('.png'))
    assert files == sorted(f for f in os.listdir(SRC['ns_yellow']) if f.endswith('.png'))
    for f in files:   # both forms share one frame map: the alpha masks must be identical for the anchors to hold on Dustin
        if f.startswith('portrait'): continue
        ar = np.array(Image.open(os.path.join(SRC['ns_red'], f)).convert('RGBA'))[..., 3] > 0
        ay = np.array(Image.open(os.path.join(SRC['ns_yellow'], f)).convert('RGBA'))[..., 3] > 0
        if ar.shape != ay.shape or (ar != ay).sum() > 0: print('  note: alpha differs between forms:', f, int((ar != ay).sum()) if ar.shape == ay.shape else ar.shape)
    all_anchors = {}
    for sk in spec['skins']:
        tag = sk['tag']
        if only and tag not in only: continue
        anchors = {}
        roles = ['body'] + (['clone'] if sk.get('clone') else [])
        for form in ('ns_red', 'ns_yellow'):
            for role in roles:
                d = os.path.join(OUT, tag, form if role == 'body' else 'clone_' + form); os.makedirs(d, exist_ok=True)
                for f in files:
                    if role == 'clone' and (f.startswith('portrait') or f.startswith('proj_') or f.startswith('fx')): continue
                    process(form, f, sk, role, anchors).save(os.path.join(d, f), optimize=True)
        portrait_composite({k: os.path.join(OUT, tag, k) for k in SRC}, os.path.join(OUT, tag, 'portrait_large.png'), sk)
        Image.open(os.path.join(OUT, tag, 'ns_red', 'portrait_small.png')).save(os.path.join(OUT, tag, 'portrait_small.png'))
        all_anchors[tag] = {k: {str(i): v for i, v in fr.items()} for k, fr in anchors.items()}
        print('skin', tag, 'strips', len(files), 'anchored strips', len(anchors))
    path = os.path.join(ROOT, 'windrangersSkinAnchors.js')
    old = {}
    if only and os.path.exists(path):
        txt = open(path).read(); old = json.loads(txt[txt.index('=') + 1:].strip())
    old.update(all_anchors)
    conv = lambda o: o.tolist() if hasattr(o, 'tolist') else (int(o) if isinstance(o, (np.integer,)) else o)
    open(path, 'w').write('// GENERATED by tools/wr_skins/build.py — per-frame costume anchors (cell px) for the windrangers skin FX. Do not hand-edit.\n'
                          'export const WR_SKIN_ANCHORS = ' + json.dumps(old, default=conv, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    main()
