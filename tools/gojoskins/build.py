#!/usr/bin/env python3
"""tools/gojoskins/build.py — Satoru Gojo (Shinjuku Arc) (gojo_shinjuku): 20 premade cosmetic skins.

Every body strip the fighter draws (gojoShinjukuData.js animationData) is recoloured into
assets/gojo_shinjuku/skins/<tag>/<strip>.png. Same size, same alpha, same frame map → identical timing, hitboxes,
anchors. NOTHING is recoloured at runtime.

PER-FRAME REGION MASKS (from the sheet's own palette + position inside each frame cell):
    hair     the blue-grey hair ramp (+ the 249 highlight inside the head zone)
    coat     the intro coat's own blue-grey ramp (it only exists in intro frames 0-2)
    face     skin pixels inside the head zone (hair dilated)
    castArm  limb skin on the FRONT side of the torso (the arm that extends in Blue / Red / Purple frames; the engine
             mirrors the whole cell when he turns, so the arm keeps its identity)
    backArm  limb skin on the other side
    feet     limb skin in the bottom 12 % of the body box (kept natural)
    shirt    the shirt's dark-grey ramp           shoes   the two lower darks in the bottom 14 % of the body box
    trousers neutral greys ≥ 100 outside the head zone (incl. the white belt)
PROTECTED (byte-identical, verified for every pixel): outlines, eyes + eye whites, Blue / Red / Purple, merge circles,
dome, chant strips, sparks, anything baked into body frames that is not one of the colours above, and every pixel
outside the body box.

GLITTER skins get 3 pre-baked glint phases: p0 = assets/gojo_shinjuku/skins/<tag>/, p1 / p2 = .../<tag>/p1|p2/.
gojoShinjukuSkins.js picks the phase from the SIMULATION clock (never wall-clock) so LAN / replay / companion agree.

    python3 tools/gojoskins/build.py                  all skins in the table
    python3 tools/gojoskins/build.py alienx_leak ...  just those tags
    python3 tools/gojoskins/build.py --verify         re-check protected pixels of what is on disk
    python3 tools/gojoskins/build.py --sheets         contact sheets (match size) → docs/msv1/gojo/skins/
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/gojo_shinjuku')
OUT = os.path.join(SRC, 'skins')
DOCS = os.path.join(ROOT, 'docs/msv1/gojo/skins')
SCALE = 2   # GS_SCALE: the size he appears at in a fight

# strip → frame width (gojoShinjukuData.js animationData; frames are equal-width cells, height = strip height)
STRIPS = {'idle': 24, 'walk': 34, 'dash': 72, 'jumpRise': 36, 'fall': 36, 'crouchDown': 36, 'guard': 32, 'hurt': 50,
          'knockdown': 94, 'getup': 50, 'intro': 52, 'win': 30, 'lose': 94, 'charge': 38, 'ultAction': 38, 'domain': 42,
          'a': 50, 'b': 62, 'c': 82, 'jump': 42, 'throw': 72, 'crouch': 38, 'redRushFull': 72, 'lapseBlue': 58,
          'maxBlue': 56, 'blueStep': 72, 'red': 58, 'purpleFull': 52, 'purple200Full': 196}

HAIR = {(92, 97, 113), (92, 97, 114), (97, 97, 114), (113, 113, 135), (150, 150, 161), (151, 151, 163), (153, 153, 168),
        (167, 167, 178), (198, 198, 211)}
COAT = {(99, 99, 109), (143, 143, 155), (182, 182, 194), (233, 232, 238)}
SHIRT = {(17, 17, 17), (25, 25, 25), (33, 33, 33), (38, 38, 38), (44, 44, 44)}
LOWDARK = {(20, 20, 20), (32, 31, 31)}
HAIR_HI = (249, 249, 249)


def hx(c):
    c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def h3(x, y, z, salt=0):
    v = (int(x) * 374761393 + int(y) * 668265263 + int(z) * 2147483647 + salt * 1274126177) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65536.0


def inset(rgb, cols):
    m = np.zeros(rgb.shape[:2], bool)
    for c in cols: m |= (rgb[..., 0] == c[0]) & (rgb[..., 1] == c[1]) & (rgb[..., 2] == c[2])
    return m


def dilate(m, r):
    out = m.copy()
    for _ in range(r):
        o = out.copy(); o[1:] |= out[:-1]; o[:-1] |= out[1:]; o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]; out = o
    return out


def lum(rgb): return rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11


# ── region masks for one frame cell ──
def regions(cell, strip, fi):
    rgb = cell[..., :3].astype(np.int32); a = cell[..., 3] > 0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hair = inset(rgb, HAIR) & a
    coat = inset(rgb, COAT) & a
    head = dilate(hair, 3)
    hair |= inset(rgb, [HAIR_HI]) & head & a
    skin = a & (r >= 180) & (r - b >= 30) & (g < r) & (g >= 0.55 * r)
    shirt = inset(rgb, SHIRT) & a
    neutral = a & (np.abs(r - g) <= 3) & (np.abs(g - b) <= 3) & (r >= 100)
    eyewhite = inset(rgb, [(255, 255, 255)]) & dilate(hair, 7)
    trousers = neutral & ~head & ~eyewhite & ~inset(rgb, [HAIR_HI])
    core = hair | shirt | skin | trousers | coat
    ys, xs = np.nonzero(core)
    if not len(ys): z = np.zeros_like(a); return dict(hair=z, coat=z, face=z, castArm=z, backArm=z, feet=z, shirt=z, shoes=z, trousers=z, box=(0, 0, 0, 0), cx=0)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    box = np.zeros_like(a); box[max(0, y0 - 3):y1 + 4, max(0, x0 - 3):x1 + 4] = True
    H = y1 - y0 + 1
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    lowdark = inset(rgb, LOWDARK) & a
    upright = H >= 48
    shoes = lowdark & (yy >= y1 - 0.14 * H) if upright else np.zeros_like(a)
    face = skin & dilate(hair, 7)
    limb = skin & ~face
    feet = limb & (yy >= y1 - 0.12 * H) if upright else np.zeros_like(a)
    arms = limb & ~feet
    anchor = shirt if shirt.sum() > 8 else (hair if hair.sum() else core)
    cx = xs.mean() if not anchor.sum() else np.nonzero(anchor)[1].mean()
    cast = arms & (xx >= cx); back = arms & (xx < cx)
    m = dict(hair=hair & box, coat=coat & box, face=face & box, castArm=cast & box, backArm=back & box, feet=feet & box,
             shirt=shirt & box, shoes=shoes & box, trousers=trousers & box & ~shoes, box=(y0, y1, x0, x1), cx=cx)
    return m


# ── colour helpers ──
SRC_RANGE = {'hair': (92, 249), 'coat': (99, 235), 'shirt': (17, 44), 'trousers': (115, 255), 'face': (150, 245),
             'castArm': (150, 245), 'backArm': (150, 245), 'shoes': (20, 32), 'feet': (150, 245)}


def ramp_to(base, t, lo=0.45, hi=0.45):
    """t in 0..1 (source shade) → base colour shaded: 0 = base*lo, 0.5 = base, 1 = base mixed toward white by hi."""
    b = hx(base) if isinstance(base, str) else np.asarray(base, np.float32)
    t = t[..., None]
    dark = b * lo; light = b + (255 - b) * hi
    out = np.where(t < 0.5, dark + (b - dark) * (t * 2), b + (light - b) * ((t - 0.5) * 2))
    return np.clip(np.rint(out), 0, 255).astype(np.uint8)


def shade(rgb, region):
    lo, hi = SRC_RANGE[region]
    return np.clip((lum(rgb.astype(np.float32)) - lo) / max(1, hi - lo), 0, 1)


def paint(out, m, rgb, region, base, lo=0.45, hi=0.45):
    if base is None or not m.any(): return
    out[m, :3] = ramp_to(base, shade(rgb, region), lo, hi)[m]


def put(out, alpha, y, x, col, mask=None):
    if 0 <= y < out.shape[0] and 0 <= x < out.shape[1] and alpha[y, x] and (mask is None or mask[y, x]):
        out[y, x, :3] = hx(col) if isinstance(col, str) else col


def block(out, alpha, y, x, col, mask, n=2):
    for dy in range(n):
        for dx in range(n): put(out, alpha, y + dy, x + dx, col, mask)


def arm_points(m, cx):
    """elbow (nearest the torso), wrist (75 % out), palm (farthest) of the casting arm, as (y, x); None if no arm."""
    ys, xs = np.nonzero(m)
    if len(ys) < 3: return None
    d = np.abs(xs - cx) + 0.25 * np.abs(ys - ys.mean())
    o = np.argsort(d)
    pick = lambda q: (int(ys[o[min(len(o) - 1, int(q * (len(o) - 1)))]]), int(xs[o[min(len(o) - 1, int(q * (len(o) - 1)))]]))
    return pick(0.08), pick(0.7), pick(1.0)


def legs(m):
    """trouser pixels split into the front leg (x ≥ trouser centre) and the back leg."""
    if not m.any(): return m, m
    cx = np.nonzero(m)[1].mean(); xx = np.mgrid[0:m.shape[0], 0:m.shape[1]][1]
    return m & (xx >= cx), m & (xx < cx)


def rel_y(m):
    """0 (top) .. 1 (bottom) inside the region's own box."""
    ys = np.nonzero(m)[0]; yy = np.mgrid[0:m.shape[0], 0:m.shape[1]][0].astype(np.float32)
    if not len(ys): return yy * 0
    return np.clip((yy - ys.min()) / max(1, ys.max() - ys.min()), 0, 1)


def rel_x(m):
    xs = np.nonzero(m)[1]; xx = np.mgrid[0:m.shape[0], 0:m.shape[1]][1].astype(np.float32)
    if not len(xs): return xx * 0
    return np.clip((xx - xs.min()) / max(1, xs.max() - xs.min()), 0, 1)


def top_edge(m):
    e = np.zeros_like(m)
    for x in range(m.shape[1]):
        ys = np.nonzero(m[:, x])[0]
        if len(ys): e[ys.min(), x] = True
    return e


def space(out, m, rgb, region, base='#0b1030'):
    """midnight sky with a faint nebula lift on the source's light pixels"""
    paint(out, m, rgb, region, base, 0.55, 0.22)


# ── the 20 skins (brief order). Each: name, collection, glitter, sig = signature (strip, frame), fn(out, rgb, a, m, ctx) ──
def k_default(out, rgb, a, m, c): pass


def sk_alienx_leak(out, rgb, a, m, c):
    space(out, m['castArm'], rgb, 'castArm')
    p = arm_points(m['castArm'], m['cx'])
    if p:
        for (y, x), col in zip(p, ('#3ff5e0', '#a86bff', '#ffffff')): block(out, a, y, x, col, m['castArm'])


def sk_alienx_binary(out, rgb, a, m, c):
    paint(out, m['hair'], rgb, 'hair', '#cfd6e0', 0.55, 0.6)
    paint(out, m['trousers'], rgb, 'trousers', '#3a3c42', 0.5, 0.25)
    ry = rel_y(m['shirt']); paint(out, m['shirt'] & (ry < 0.1), rgb, 'shirt', '#f4f4f0', 0.95, 0.2)
    paint(out, m['castArm'], rgb, 'castArm', '#0f3c4c', 0.6, 0.2); paint(out, m['backArm'], rgb, 'backArm', '#2a0e1a', 0.6, 0.2)
    for arm, col in (('castArm', '#eef6ff'), ('backArm', '#ffc9a6')):
        p = arm_points(m[arm], m['cx'])
        if p:
            for y, x in p[1:]: block(out, a, y, x, col, m[arm])


def sk_alienx_horizon(out, rgb, a, m, c):
    for r in ('hair', 'shirt', 'trousers', 'castArm', 'backArm', 'face', 'feet', 'shoes', 'coat'):
        paint(out, m[r], rgb, r, '#1d1846', 0.6, 0.18)
    rim = top_edge(m['hair']) | (top_edge(m['shirt']) & m['shirt'])
    out[rim, :3] = hx('#b8a6ff').astype(np.uint8)
    for reg, ry_, rx_ in (('shirt', 0.35, 0.45), ('shirt', 0.7, 0.7)):
        mm = m[reg]; ys, xs = np.nonzero(mm)
        if len(ys): block(out, a, int(ys.min() + ry_ * (ys.max() - ys.min())), int(xs.min() + rx_ * (xs.max() - xs.min())), '#eaf4ff', mm, 3)
    fl, _ = legs(m['trousers']); ys, xs = np.nonzero(fl)
    if len(ys): block(out, a, int(ys.min() + 0.3 * (ys.max() - ys.min())), int(xs.mean()), '#d8e6ff', fl, 3)


def sk_alienx_daylight(out, rgb, a, m, c):
    paint(out, m['shirt'], rgb, 'shirt', '#4a4d55', 0.6, 0.25)
    t = shade(rgb, 'trousers'); tm = m['trousers']
    paint(out, tm, rgb, 'trousers', '#f1e8da', 0.75, 0.6)
    dark = tm & (t < 0.45); out[dark, :3] = hx('#b4a8dc').astype(np.uint8)
    fl, _ = legs(tm); fold = fl & (t < 0.45)
    if c['strip'] == 'c':
        out[fold, :3] = hx('#1d3fa8').astype(np.uint8); ys, xs = np.nonzero(fold)
        if len(ys): block(out, a, int(ys.mean()), int(xs.mean()), '#ffd54a', fold, 2)
    else:
        out[fold & (t < 0.28), :3] = hx('#2fb8b0').astype(np.uint8); out[fold & (t >= 0.28), :3] = hx('#ff8f7c').astype(np.uint8)   # teal in the deepest fold, coral at its edge


def glints(out, a, mask, ctx, cols, density=0.18, salt=1):
    p = ctx['phase']
    for y, x in zip(*np.nonzero(mask)):
        if h3(x, y, 11, salt) < density and int(h3(x, y, 5, salt) * 3) == p: out[y, x, :3] = hx(cols[int(h3(y, x, 3, salt) * len(cols)) % len(cols)]).astype(np.uint8)


def sk_opal(out, rgb, a, m, c):
    paint(out, m['shirt'], rgb, 'shirt', '#0d2226', 0.6, 0.3); paint(out, m['trousers'], rgb, 'trousers', '#efe9e4', 0.72, 0.6)
    paint(out, m['hair'], rgb, 'hair', '#cdd5de', 0.55, 0.6)
    ry, rx = rel_y(m['shirt']), rel_x(m['shirt']); facet = m['shirt'] & (ry < 0.38) & (rx > 0.55)
    col = ('#1fa37a', '#7a3cd0', '#c8743a')[c['fi'] % 3]; paint(out, facet, rgb, 'shirt', col, 0.7, 0.55)
    glints(out, a, facet, c, ('#ffffff', '#c8fff0'), 0.3)
    if c['strip'] == 'win':
        ys, xs = np.nonzero(facet)
        if len(ys): put(out, a, int(ys.min()), int(xs.max()), '#ffffff')


def sk_pinkdiamond(out, rgb, a, m, c):
    ry = rel_y(m['hair']); hm = m['hair']; t = shade(rgb, 'hair')
    root, tip = hx('#d24f86'), hx('#ffd0e2'); mix = (root[None, None] * ry[..., None] + tip[None, None] * (1 - ry[..., None]))
    sh = (0.65 + 0.45 * t)[..., None]; out[hm, :3] = np.clip(mix * sh, 0, 255).astype(np.uint8)[hm]
    paint(out, m['trousers'], rgb, 'trousers', '#e8d7b0', 0.7, 0.5); paint(out, m['shirt'], rgb, 'shirt', '#a3164a', 0.55, 0.35)
    paint(out, m['coat'], rgb, 'coat', '#f2d9e3', 0.7, 0.5)
    sm = m['shirt']; ys, xs = np.nonzero(sm)
    if len(ys):
        bright = '#ffffff' if (c['strip'] == 'win' and c['fi'] == 3) or c['phase'] == 0 else '#ffb3d1'
        for i, (fy, fx) in enumerate(((0.18, 0.3), (0.12, 0.6), (0.3, 0.8))):
            block(out, a, int(ys.min() + fy * (ys.max() - ys.min())), int(xs.min() + fx * (xs.max() - xs.min())), bright if i == c['phase'] else '#ff9cc4', sm, 2)


def sk_sequin(out, rgb, a, m, c):
    paint(out, m['shirt'], rgb, 'shirt', '#3a1438', 0.55, 0.3); paint(out, m['trousers'], rgb, 'trousers', '#151a33', 0.6, 0.12)
    sm = m['shirt']; ry, rx = rel_y(sm), rel_x(sm)
    for k, off in enumerate((0.25, 0.6)):
        row = sm & (np.abs((ry - rx * 0.6) - (off - 0.3)) < 0.07)
        lit_rate = 0.85 if c['strip'] in ('b', 'gB') and k == 0 else 0.12
        for y, x in zip(*np.nonzero(row)):
            on = h3(x, y, c['phase'], 4) < lit_rate
            out[y, x, :3] = hx('#f4f4ff' if on else '#6b5a78').astype(np.uint8)


def sk_meteor(out, rgb, a, m, c):
    paint(out, m['hair'], rgb, 'hair', '#cbbb9b', 0.6, 0.5); paint(out, m['trousers'], rgb, 'trousers', '#5a1420', 0.55, 0.25)
    fl, _ = legs(m['trousers']); ry = rel_y(fl)
    cuff = fl & (ry > 0.88); out[cuff, :3] = hx('#d2601a').astype(np.uint8)
    above = fl & (ry > 0.74) & ~cuff; glints(out, a, above, c, ('#e8b838', '#ffd46a'), 0.55, 2)
    flecks = fl & (ry > 0.45) & (ry <= 0.74); glints(out, a, flecks, c, ('#e8b838',), 0.12, 3)


def sk_valkyrie(out, rgb, a, m, c):
    paint(out, m['trousers'], rgb, 'trousers', '#1f4fd8', 0.5, 0.35); paint(out, m['shirt'], rgb, 'shirt', '#14204a', 0.6, 0.25)
    tips = m['hair'] & (rel_y(m['hair']) < 0.35); paint(out, tips, rgb, 'hair', '#f2c230', 0.6, 0.5)
    out[m['shoes'] & (rel_y(m['shoes']) > 0.5), :3] = hx('#d81e2a').astype(np.uint8)
    fl, _ = legs(m['trousers']); ry, rx = rel_y(fl), rel_x(fl)
    show = 3 if c['strip'] in ('c', 'jump') else 1
    for k in range(show):
        band = fl & (np.abs(ry - (0.12 + 0.13 * k) - 0.25 * rx) < 0.05)
        out[band, :3] = hx('#f2c230' if k % 2 == 0 else '#d81e2a').astype(np.uint8)


def sk_upgrade(out, rgb, a, m, c):
    paint(out, m['hair'], rgb, 'hair', '#f2f2f2', 0.75, 0.6); paint(out, m['trousers'], rgb, 'trousers', '#c9ccd1', 0.65, 0.5)
    paint(out, m['shirt'], rgb, 'shirt', '#0b0b0e', 0.8, 0.2)
    sm = m['shirt']; xx = np.mgrid[0:sm.shape[0], 0:sm.shape[1]][1]
    collar = top_edge(sm) & sm; shoulder = collar & (xx >= m['cx'])
    out[shoulder, :3] = hx('#7dff3a').astype(np.uint8)
    arm = top_edge(m['castArm']) & m['castArm']; out[arm, :3] = hx('#7dff3a').astype(np.uint8)
    p = arm_points(m['castArm'], m['cx'])
    if p: put(out, a, p[2][0], p[2][1], '#e2ff9e')


def sk_chromastone(out, rgb, a, m, c):
    sm = m['shirt']; ry = rel_y(sm)
    for lo_, hi_, col in ((0, 0.3, '#b79be0'), (0.36, 0.64, '#e0a040'), (0.7, 1.01, '#22308c')):
        paint(out, sm & (ry >= lo_) & (ry < hi_), rgb, 'shirt', col, 0.6, 0.3)
    seam = sm & (((ry >= 0.3) & (ry < 0.36)) | ((ry >= 0.64) & (ry < 0.7))); out[seam, :3] = hx('#140a16').astype(np.uint8)
    paint(out, m['trousers'], rgb, 'trousers', '#4a5563', 0.55, 0.3)


def sk_nanami(out, rgb, a, m, c):
    paint(out, m['hair'], rgb, 'hair', '#d9c27a', 0.6, 0.5); paint(out, m['shirt'], rgb, 'shirt', '#a9c9e8', 0.6, 0.35)
    paint(out, m['trousers'], rgb, 'trousers', '#c4a57a', 0.6, 0.4); paint(out, m['coat'], rgb, 'coat', '#b8925a', 0.6, 0.4)
    sm = m['shirt']; xs = np.nonzero(sm)[1]
    if len(xs):
        mid = int(round(xs.mean())); ry = rel_y(sm); xx = np.mgrid[0:sm.shape[0], 0:sm.shape[1]][1]
        tie = sm & (np.abs(xx - mid) <= 1) & (ry < 0.92); out[tie, :3] = hx('#c8901f').astype(np.uint8)
        for q in (0.3, 0.62):
            spot = tie & (np.abs(ry - q) < 0.06) & (xx == mid); out[spot, :3] = hx('#3a2a10').astype(np.uint8)
    if c['strip'] == 'win':
        p = arm_points(m['castArm'], m['cx'])
        if p: block(out, a, p[1][0], p[1][1], '#c9a14a', m['castArm'], 2)


def sk_sukuna(out, rgb, a, m, c):
    paint(out, m['hair'], rgb, 'hair', '#d99aa8', 0.6, 0.5); paint(out, m['trousers'], rgb, 'trousers', '#ece4d4', 0.72, 0.5)
    f = m['face']; ys, xs = np.nonzero(f)
    if len(ys):
        y = int(ys.min() + 0.55 * (ys.max() - ys.min()))   # simplified for size: one solid 2-row cheek bar (thin canon lines vanish at ×2)
        for yy_ in (y, y + 1):
            for x in range(xs.min(), xs.max() + 1):
                if 0 <= yy_ < f.shape[0] and f[yy_, x] and (x - xs.min() <= 1 or xs.max() - x <= 1): out[yy_, x, :3] = hx('#2a2a2a').astype(np.uint8)
    for arm in ('castArm', 'backArm'):
        am = m[arm]; ry = rel_y(am); band = am & (np.abs(ry - 0.45) < 0.16)
        if c['strip'] not in ('guard',): band &= ~(np.abs(rel_x(am) - 0.5) < 0.12)
        out[band, :3] = hx('#2a2a2a').astype(np.uint8)


def sk_prison(out, rgb, a, m, c):
    paint(out, m['coat'], rgb, 'coat', '#d6ccb0', 0.62, 0.45)
    sm = m['shirt']; ys, xs = np.nonzero(sm)
    if len(ys) > 30:
        cy, cx = int(ys.min() + 0.32 * (ys.max() - ys.min())), int(xs.mean())
        for dy in range(-3, 3):
            for dx in range(-3, 4): put(out, a, cy + dy, cx + dx, '#1e1a4a', sm)
        for dx in (-2, -1, 0, 1, 2): put(out, a, cy - 1, cx + dx, '#e8e4f6', sm); put(out, a, cy, cx + dx, '#e8e4f6', sm)
        for dx in (-1, 1): put(out, a, cy - 2, cx + dx, '#e8e4f6', sm); put(out, a, cy + 1, cx + dx, '#e8e4f6', sm)
        put(out, a, cy - 1, cx, '#0a0a14', sm); put(out, a, cy, cx, '#0a0a14', sm)


def sk_porcelain(out, rgb, a, m, c):
    paint(out, m['hair'], rgb, 'hair', '#f4ecdc', 0.7, 0.5); paint(out, m['trousers'], rgb, 'trousers', '#f4ecdc', 0.72, 0.5)
    paint(out, m['shirt'], rgb, 'shirt', '#23306e', 0.55, 0.3)
    fl, _ = legs(m['trousers']); ry, rx = rel_y(fl), rel_x(fl)
    width = 0.18 + 0.32 * np.exp(-((ry - 0.6) / 0.18) ** 2)
    stroke = fl & (rx > 1 - width) & (ry > 0.3); out[stroke, :3] = hx('#1f4fd0').astype(np.uint8)


def sk_darkroom(out, rgb, a, m, c):
    paint(out, m['shirt'], rgb, 'shirt', '#2e2e30', 0.7, 0.4); paint(out, m['trousers'], rgb, 'trousers', '#c4c4c8', 0.55, 0.55)
    hm = m['hair']; ry = rel_y(hm); paint(out, hm, rgb, 'hair', '#1c1c20', 0.7, 0.25)
    fringe = hm & (ry > 0.75); out[fringe, :3] = hx('#ececec').astype(np.uint8)
    cm = m['coat']; paint(out, cm, rgb, 'coat', '#8a8a8e', 0.6, 0.5)
    if cm.any():
        inner = cm & dilate(~cm & (rgb.sum(-1) >= 0) & m['shirt'] | m['trousers'], 1)
        out[inner, :3] = hx('#c4121a').astype(np.uint8)


def sk_velvet(out, rgb, a, m, c):
    paint(out, m['shirt'], rgb, 'shirt', '#0f3b25', 0.6, 0.3); paint(out, m['trousers'], rgb, 'trousers', '#efe8d6', 0.7, 0.5)
    paint(out, m['hair'], rgb, 'hair', '#c4cad2', 0.6, 0.55); out[m['shoes'], :3] = hx('#5a1022').astype(np.uint8)
    sm = m['shirt']; ry, rx = rel_y(sm), rel_x(sm); turn = c['strip'] in ('a', 'b', 'gA1', 'redRushFull') and c['fi'] % 2 == 1
    d = (ry - (1 - rx)) if turn else (ry - rx)
    band = sm & (np.abs(d) < 0.16); out[band, :3] = hx('#9fd8b0').astype(np.uint8)


def sk_arcade(out, rgb, a, m, c):
    paint(out, m['shirt'], rgb, 'shirt', '#121018', 0.8, 0.3); paint(out, m['trousers'], rgb, 'trousers', '#4a3a66', 0.6, 0.3)
    sm = m['shirt']; ry, rx = rel_y(sm), rel_x(sm)
    step = np.floor(ry * 3) / 3 * 0.12
    out[sm & (rx > 0.82 - step), :3] = hx('#22e6ff').astype(np.uint8)
    out[sm & (rx < 0.18 + step), :3] = hx('#ff2fb8').astype(np.uint8)
    tm = m['trousers']; ys, xs = np.nonzero(tm)
    if len(ys): put(out, a, int(ys.min()) + 1, int(xs.mean()), '#ffd400', tm); put(out, a, int(ys.min()) + 1, int(xs.mean()) + 1, '#ffd400', tm)


def sk_snow(out, rgb, a, m, c):
    hm = m['hair']; paint(out, hm, rgb, 'hair', '#222226', 0.7, 0.3)
    out[top_edge(hm) & hm, :3] = hx('#f4f6fa').astype(np.uint8)
    paint(out, m['shirt'], rgb, 'shirt', '#d07a4a', 0.6, 0.3); paint(out, m['trousers'], rgb, 'trousers', '#3d5878', 0.55, 0.35)
    cm = m['coat']; paint(out, cm, rgb, 'coat', '#8c8f99', 0.6, 0.5)
    if cm.any():
        ry = rel_y(cm)
        for y, x in zip(*np.nonzero(cm & (ry < 0.22))):
            if h3(x, y, 9) < 0.8: out[y, x, :3] = hx('#fbfdff').astype(np.uint8)
    sm = m['shirt']; xx = np.mgrid[0:sm.shape[0], 0:sm.shape[1]][1]; e = top_edge(sm) & sm & (xx >= m['cx'])
    ys, xs = np.nonzero(e)
    if len(ys): i = int(np.argmax(xs)); put(out, a, ys[i], xs[i], '#ffffff', sm); put(out, a, ys[i], xs[i] - 1, '#ffffff', sm)


def sk_ink(out, rgb, a, m, c):
    for r in ('hair', 'coat'):
        t = shade(rgb, r); mm = m[r]; out[mm, :3] = np.where((t < 0.3)[..., None], 18, np.where((t < 0.6)[..., None], 238, 255)).astype(np.uint8)[mm]
    for r in ('face', 'castArm', 'backArm', 'feet'):
        t = shade(rgb, r); mm = m[r]; out[mm, :3] = np.where((t < 0.42)[..., None], 26, np.where((t < 0.72)[..., None], 196, 255)).astype(np.uint8)[mm]
    out[m['shirt'], :3] = 16
    t = shade(rgb, 'trousers'); tm = m['trousers']
    out[tm, :3] = np.where((t < 0.25)[..., None], 20, 252).astype(np.uint8)[tm]
    half = tm & (t >= 0.25) & (t < 0.55)
    yy, xx = np.mgrid[0:tm.shape[0], 0:tm.shape[1]]; dots = half & ((xx + yy) % 2 == 0)
    out[dots, :3] = 150


SKINS = [
    ('alienx_leak', 'Alien X — Constellation Leak', 'Alien X', False, ('red', 2), sk_alienx_leak),
    ('alienx_binary', 'Alien X — Binary Star', 'Alien X', False, ('purpleFull', 4), sk_alienx_binary),
    ('alienx_horizon', 'Alien X — Event Horizon', 'Alien X', False, ('guard', 0), sk_alienx_horizon),
    ('alienx_daylight', 'Alien X — Daylight Galaxy', 'Alien X', False, ('c', 2), sk_alienx_daylight),
    ('opal', 'Black Opal Headliner', 'Glitter', True, ('win', 3), sk_opal),
    ('pinkdiamond', 'Pink Diamond Flashbulb', 'Glitter', True, ('win', 3), sk_pinkdiamond),
    ('sequin', 'Midnight Sequin', 'Glitter', True, ('b', 2), sk_sequin),
    ('meteor', 'Meteor Hem', 'Glitter', True, ('c', 2), sk_meteor),
    ('valkyrie', 'Winning Valkyrie — Victory Lap', 'Crossover', False, ('c', 2), sk_valkyrie),
    ('upgrade', 'Ben 10 Upgrade — Living Sleeve', 'Crossover', False, ('red', 3), sk_upgrade),
    ('chromastone', 'Ben 10 Chromastone — Cathedral Glass', 'Crossover', False, ('idle', 0), sk_chromastone),
    ('nanami', 'JJK Nanami — Clocked Out', 'Crossover', False, ('intro', 0), sk_nanami),
    ('sukuna', 'JJK Sukuna — Borrowed Reflection', 'Crossover', False, ('guard', 0), sk_sukuna),
    ('prison', 'JJK Prison Realm — Inside Looking Out', 'Crossover', False, ('domain', 2), sk_prison),
    ('porcelain', 'Porcelain Kiln', 'Original', False, ('c', 2), sk_porcelain),
    ('darkroom', 'Darkroom Negative', 'Original', False, ('intro', 1), sk_darkroom),
    ('velvet', 'Velvet Rope', 'Original', False, ('b', 2), sk_velvet),
    ('arcade', 'Arcade Cabinet, 2 A.M.', 'Original', False, ('crouch', 1), sk_arcade),
    ('snow', 'First Snow at Dawn', 'Original', False, ('intro', 0), sk_snow),
    ('ink', 'The Strongest, in Ink', 'Original', False, ('red', 3), sk_ink),
]
BY = {s[0]: s for s in SKINS}


def masks_for(strip):
    im = np.array(Image.open(os.path.join(SRC, strip + '.png')).convert('RGBA'))
    fw = STRIPS[strip]; n = im.shape[1] // fw
    return im, fw, n


def build_strip(tag, strip, phase=0):
    im, fw, n = masks_for(strip)
    out = im.copy(); changed = np.zeros(im.shape[:2], bool)
    fn = BY[tag][5]
    for fi in range(n):
        cell = im[:, fi * fw:(fi + 1) * fw]; m = regions(cell, strip, fi)
        o = cell.copy()
        fn(o, cell[..., :3], cell[..., 3] > 0, m, {'strip': strip, 'fi': fi, 'phase': phase})
        o[..., 3] = cell[..., 3]
        out[:, fi * fw:(fi + 1) * fw] = o
        allowed = m['hair'] | m['coat'] | m['face'] | m['castArm'] | m['backArm'] | m['feet'] | m['shirt'] | m['shoes'] | m['trousers']
        changed[:, fi * fw:(fi + 1) * fw] |= allowed
    # PROTECTED check: every pixel outside the body regions is byte-identical, alpha identical everywhere
    bad = (out != im).any(-1) & ~changed
    assert not bad.any() and (out[..., 3] == im[..., 3]).all(), f'{tag}/{strip}: {int(bad.sum())} protected pixels changed'
    return out, changed


def build(tag):
    glitter = BY[tag][3]
    stats = {}
    for p in ((0, 1, 2) if glitter else (0,)):
        d = os.path.join(OUT, tag, f'p{p}') if p else os.path.join(OUT, tag)
        os.makedirs(d, exist_ok=True)
        for strip in STRIPS:
            out, ch = build_strip(tag, strip, p)
            Image.fromarray(out, 'RGBA').save(os.path.join(d, strip + '.png'), optimize=True)
            if not p: stats[strip] = int(((out != np.array(Image.open(os.path.join(SRC, strip + '.png')).convert('RGBA'))).any(-1)).sum())
    # portrait: hair / shirt / coat by palette only (head-and-shoulders crop)
    pim = np.array(Image.open(os.path.join(SRC, 'portrait.png')).convert('RGBA')); o = pim.copy()
    m = regions(pim, 'portrait', 0); m['castArm'] = m['backArm'] = m['feet'] = m['shoes'] = np.zeros_like(m['hair'])
    BY[tag][5](o, pim[..., :3], pim[..., 3] > 0, m, {'strip': 'portrait', 'fi': 0, 'phase': 0}); o[..., 3] = pim[..., 3]
    Image.fromarray(o, 'RGBA').save(os.path.join(OUT, tag, 'portrait.png'), optimize=True)
    return stats


def contact(tags):
    """match-size (×SCALE) contact sheet per skin: stand, guard, signature pose, on a dark and a light stage tone."""
    os.makedirs(DOCS, exist_ok=True)
    rows = []
    for tag in ['default'] + tags:
        cells = []
        sig = BY[tag][4] if tag != 'default' else ('red', 2)
        for strip, fi in (('idle', 0), ('guard', 0), sig, ('intro', 0)):
            d = SRC if tag == 'default' else os.path.join(OUT, tag)
            im = Image.open(os.path.join(d, strip + '.png')).convert('RGBA'); fw = STRIPS[strip]
            cells.append(im.crop((fi * fw, 0, (fi + 1) * fw, im.height)))
        rows.append((tag, cells))
    cw = max(sum(c.width for c in cs) * SCALE + 8 * len(cs) for _, cs in rows) + 8
    rh = max(max(c.height for c in cs) for _, cs in rows) * SCALE + 6
    for tone, name in (((26, 28, 40, 255), 'dark'), ((206, 214, 222, 255), 'light')):
        sheet = Image.new('RGBA', (cw, rh * len(rows)), tone)
        for i, (tag, cs) in enumerate(rows):
            x = 4
            for cimg in cs:
                big = cimg.resize((cimg.width * SCALE, cimg.height * SCALE), Image.NEAREST)
                sheet.alpha_composite(big, (x, i * rh + 3)); x += big.width + 8
        sheet.save(os.path.join(DOCS, f'contact_{tags[0]}_{name}.png'))
    return rows


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    tags = args or [s[0] for s in SKINS]
    if '--sheets' in sys.argv:
        contact(tags); print('sheets →', DOCS); sys.exit(0)
    report = {}
    for t in tags:
        report[t] = build(t); print(f'{t:16s} {sum(report[t].values()):6d} px recoloured  (protected pixels byte-identical ✓)')
    rp = os.path.join(DOCS, 'build_report.json'); os.makedirs(DOCS, exist_ok=True)
    old = json.load(open(rp)) if os.path.exists(rp) else {}
    old.update(report); json.dump(old, open(rp, 'w'), indent=1)
