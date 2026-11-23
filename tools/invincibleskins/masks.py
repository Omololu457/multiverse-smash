#!/usr/bin/env python3
"""tools/invincibleskins/masks.py — per-frame BODY-PART MASKS for Invincible (Mark Grayson) (invincible).

Every strip the fighter draws (invincibleSprites.js INVINCIBLE_ANIM) is classified pixel by pixel from the sheet's own
palette (six colour families) + where the pixel sits in ITS frame. The anatomy is found per frame from the pixels
themselves (the goggles / face → the head, the chest panel → the torso, the head → chest axis → the hips), never from a
fixed box, so a region follows him through kicks, flight, knockdowns and the win / lose frames:

    hair      dark ramp around the head, above the jaw             temples   hair at the sides of the skull (shaved skins)
    mask      the yellow cowl over his face            cloth   the cowl he pulls off and swings in the win frames
    eyes      bare-face eye whites (win / lose)
    goggles   the white lenses inside the cowl                     face      bare skin (jaw / mouth; the whole face unmasked)
    collar    blue right under the head                            shoulders the rest of the upper blue band
    chest     the yellow chest panel                               torso     dark suit beside the chest panel
    arms      dark sleeves (near a glove)                          gloves    yellow fists / hands
    waist     the dark band right under the chest panel            legs      dark below the waist
    boots     the blue pieces below the hips
    streaks   white / grey speed lines, rings and bursts OUTSIDE the body (the impact / landing / zip effects)
    protected the pure-black outline and every other colour (blood reds, the odd cyan): never changed

Run `python3 tools/invincibleskins/masks.py --debug out.png [strip ...]` for the colour overlay used to check every frame.
"""
import json, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/invincible')

REGIONS = ['protected', 'hair', 'temples', 'mask', 'goggles', 'eyes', 'face', 'collar', 'shoulders', 'chest', 'torso', 'arms',
           'gloves', 'waist', 'legs', 'boots', 'streaks', 'cloth']
R = {k: i for i, k in enumerate(REGIONS)}


def hexs(*h): return [tuple(int(x[i:i + 2], 16) for i in (1, 3, 5)) for x in h]


# colour families, dark → light (the order is the TONE a skin ramp is indexed by)
FAM = {
    'out':   hexs('#000000', '#000008', '#000100', '#010810'),
    'dark':  hexs('#08080d', '#0f1015', '#161624', '#1b1e27', '#313754', '#404348'),
    'yel':   hexs('#7e5613', '#996a1c', '#caa017', '#c28f2c', '#c08933', '#c5933c', '#bc9f3f', '#f4d857', '#fde271',
                  '#faec84', '#fbed84', '#f3e785'),
    'blue':  hexs('#094464', '#0f77af', '#1bb2e1', '#1bb2e2'),
    'white': hexs('#7b7b88', '#9291ae', '#9f9f9f', '#a5b1b8', '#bec7dc', '#c5c5d9', '#cecae3', '#f8f7fb', '#fbfbfb',
                  '#fefefe', '#ffffff'),
    'skin':  hexs('#48223d', '#732d39', '#a4503f', '#d3825f', '#e46d8e', '#fcd4a6', '#fdd9b0', '#fdd9b5', '#ffcebb'),
}
FAMILY_OF = {c: f for f, cs in FAM.items() for c in cs}
TONE = {}
for f, cs in FAM.items():
    lum = sorted(cs, key=lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2])
    for i, c in enumerate(lum):
        TONE[c] = i / max(1, len(lum) - 1)


def load_anim():
    js = open(os.path.join(ROOT, 'invincibleSprites.js'), encoding='utf-8').read()
    A = json.loads(re.search(r'export const INVINCIBLE_ANIM = (\{.*?\n\})', js, re.S).group(1))
    out = {}
    for k, d in A.items():
        name = os.path.basename(d['sheet'])[:-4]
        out[name] = (d['frameWidth'], d['frames'])
    return out


def fam_masks(rgb, alpha):
    on = alpha > 0
    m = {f: np.zeros(alpha.shape, bool) for f in FAM}
    for f, cs in FAM.items():
        for c in cs:
            m[f] |= (rgb == c).all(-1)
        m[f] &= on
    return m, on


def comps(mask, conn=2):
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)) if conn == 2 else None)
    return lab, n


_LAST = {}


def frame_regions(rgb, alpha, strip='', fi=0, head_only=False):
    """region map (int8) for ONE frame (frame-local)"""
    H, W = alpha.shape
    F, on = fam_masks(rgb, alpha)
    reg = np.zeros((H, W), np.int8)
    yy, xx = np.mgrid[0:H, 0:W]
    if not on.any():
        _LAST['geo'] = None
        return reg
    body_pts = np.nonzero(on)
    # ── effects first: white / grey OUTSIDE the body silhouette. A white island counts as body (goggles / eye whites) only
    #    when it is small and sits inside a yellow / skin / dark head (≥ 50 % of its ring is suit colour) ──
    suit = F['dark'] | F['yel'] | F['blue'] | F['skin']
    wl, wn = comps(F['white'])
    gog = np.zeros_like(on); fx = np.zeros_like(on)
    for i in range(1, wn + 1):
        m = wl == i; sz = int(m.sum())
        ring = ndimage.binary_dilation(m, iterations=1) & ~m
        sfrac = (ring & suit).sum() / max(1, ring.sum())
        headish = (ring & (F['yel'] | F['skin'])).sum() >= 2 or ((ring & (F['yel'] | F['skin'])).sum() > 0 and (ndimage.binary_dilation(m, iterations=5) & F['dark']).any())
        if sz <= (60 if head_only else 9) and sfrac >= 0.35 and headish: gog |= m
        else: fx |= m
    reg[fx] = R['streaks']
    # ── the head: the goggles (else the bare face) ──
    hc = None
    if gog.any():
        gl, gn = comps(gog)
        # the goggle island with the most dark (hair) above-ish it
        best = max(range(1, gn + 1), key=lambda i: (ndimage.binary_dilation(gl == i, iterations=4) & F['dark']).sum() + 10 * (gl == i).sum())
        gm = gl == best
        if gn > 1:   # the second lens (portrait / front view) → both
            gy, gx = np.nonzero(gm)
            for i in range(1, gn + 1):
                yi, xi = np.nonzero(gl == i)
                if i != best and np.hypot(xi.mean() - gx.mean(), yi.mean() - gy.mean()) <= (40 if head_only else 7): gm |= gl == i
        gog = gm
        gy, gx = np.nonzero(gog); hc = (gx.mean(), gy.mean())
        # bare face (win / lose / unmasked): the white islands are eye whites, not goggle lenses
        ring = ndimage.binary_dilation(gog, iterations=1) & ~gog
        reg[gog] = R['eyes'] if strip in ('win', 'lose') else R['goggles']
    sl, sn = comps(F['skin'])
    if hc is None and sn:
        big = 1 + int(np.argmax(ndimage.sum(np.ones_like(sl), sl, range(1, sn + 1))))
        sy, sx = np.nonzero(sl == big); hc = (sx.mean(), sy.mean() - (8 if head_only else 1.5))
    if hc is None:   # back view / no face: the topmost dark mass
        dy, dx = np.nonzero(F['dark'])
        if len(dy):
            top = dy <= dy.min() + 6; hc = (dx[top].mean(), dy[top].mean() + 2)
        else:
            hc = (W / 2, 6.0)
    hr = 40 if head_only else 6.5            # head radius (sprite px)
    # ── yellow islands: the mask = the island touching the goggles / nearest the head centre; the chest = the biggest
    #    of the rest; gloves = the compact rest; long thin islands far out (the win frames' swung mask) = mask ──
    # speed lines first: 1-2 px yellow / blue runs (the jab / barrage smears) and long thin blue arcs (kick swooshes)
    def line_fx(mask, arcs):
        out = np.zeros_like(on)
        lab, n = comps(mask, conn=1)
        for i in range(1, n + 1):
            m = lab == i; py, px = np.nonzero(m); w, h = px.max() - px.min() + 1, py.max() - py.min() + 1
            run = (h <= 2 and w >= 6) or (w <= 2 and h >= 8)
            arc = arcs and ((max(w, h) >= 14 and m.sum() <= 0.4 * w * h and m.sum() >= 18) or (max(w, h) >= 20 and m.sum() >= 40 and m.sum() <= 0.55 * w * h))
            ring = ndimage.binary_dilation(m, structure=np.ones((3, 3))) & ~m
            loose = (ring & (~on | F['blue'] | F['white'] | F['yel'] * (mask is F['yel']))).sum() >= 0.5 * max(1, ring.sum())   # a streak floats in air (or among its own passes); a suit band is hemmed in by suit
            if (run or arc) and loose and not head_only: out |= m
        return out
    yfx = line_fx(F['yel'], False); bfx = line_fx(F['blue'], True)
    reg[yfx | bfx] = R['streaks']; F['yel'] = F['yel'] & ~yfx; F['blue'] = F['blue'] & ~bfx
    yl, yn = comps(F['yel'], conn=1)
    pieces = []
    for i in range(1, yn + 1):
        m = yl == i; py, px = np.nonzero(m)
        pieces.append(dict(m=m, n=int(m.sum()), d=float(np.hypot(px.mean() - hc[0], py.mean() - hc[1])), c=(px.mean(), py.mean()),
                           w=int(px.max() - px.min() + 1), h=int(py.max() - py.min() + 1)))
    maskp = []; chest = None
    gd = ndimage.binary_dilation(gog, iterations=2) if gog.any() else None
    for p in pieces:
        if gd is not None and (p['m'] & gd).any(): maskp.append(p)
        elif gd is None and p['d'] <= hr * 0.6 and not head_only: maskp.append(p)
    mids = {id(p) for p in maskp}
    rest = [p for p in pieces if id(p) not in mids]
    for p in rest:   # long thin crescents (the uppercut arc, punch smears) = effects
        p['thin'] = max(p['w'], p['h']) >= 9 and p['n'] <= 0.45 * p['w'] * p['h']
    if rest:
        bd = ndimage.binary_dilation(F['blue'], iterations=2)
        cands = [p for p in rest if (p['m'] & bd).any() and not p['thin'] and (head_only or p['d'] <= 20)]
        chest = max(cands or rest, key=lambda p: p['n'] - 2.5 * p['d'] * (0 if head_only else 1))
        if chest['n'] < 6 and not head_only: chest = None
    if chest is None and not maskp and rest:
        chest = None
    mask_m = np.zeros_like(on)
    for p in maskp: mask_m |= p['m']
    reg[mask_m] = R['mask']
    chest_m = chest['m'] if chest else np.zeros_like(on)
    reg[chest_m] = R['chest']
    tc = chest['c'] if chest else (hc[0], hc[1] + 12)
    gloves = np.zeros_like(on)
    for p in rest:
        if p is chest: continue
        if strip == 'win' and p['thin'] and p['d'] > hr * 1.6: reg[p['m']] = R['cloth']   # the cowl he swings
        elif p['thin'] and p['n'] >= 14: reg[p['m']] = R['streaks']                       # a yellow arc / smear effect
        else: gloves |= p['m']
    reg[gloves] = R['gloves']
    # ── body axis (head → chest centre) ──
    ax, ay = tc[0] - hc[0], tc[1] - hc[1]; al = float(np.hypot(ax, ay)) or 1.0
    ux, uy = ax / al, ay / al
    proj = (xx - hc[0]) * ux + (yy - hc[1]) * uy           # along the body, from the head centre
    perp = (xx - hc[0]) * -uy + (yy - hc[1]) * ux
    if chest is not None:
        cp = proj[chest_m]; chest_top, chest_bot = float(cp.min()), float(np.percentile(cp, 95))
    else:
        chest_top, chest_bot = hr, hr + 10
    if head_only: chest_top = min(chest_top, 1e9)
    # ── skin: the face (jaw / mouth when masked; everything when bare) ──
    reg[F['skin'] & (proj <= chest_top + 1)] = R['face']
    reg[F['skin'] & (proj > chest_top + 1)] = R['gloves'] if not head_only else R['face']
    # ── blue: collar / shoulders above the chest bottom, boots below the hips ──
    bl, bn = comps(F['blue'])
    pmax = float(proj[on].max())
    hip = max(chest_bot + 2, 0.5 * pmax) if not head_only else chest_bot + 2   # the hips sit about half way down him
    neck = (hc[0] + ux * (chest_top + 0.5), hc[1] + uy * (chest_top + 0.5))
    for i in range(1, bn + 1):
        m = bl == i; pm = float(proj[m].mean())
        near_top = (ndimage.binary_dilation(m, iterations=2) & (chest_m | mask_m | (reg == R['goggles']) | F['skin'])).any()
        if head_only or (pm <= hip and near_top): reg[m] = R['shoulders']
        else: reg[m] = R['boots']      # a boot even when the leg is kicked up above his head (rise)
    near_neck = np.hypot(xx - neck[0], yy - neck[1]) <= (14 if head_only else 3.6)
    reg[(reg == R['shoulders']) & near_neck] = R['collar']
    # ── dark: hair (around the head, above the jaw), arms (near a glove), torso (beside the chest), waist, legs ──
    dk = F['dark'] & (reg == 0)
    jaw = chest_top - (0.5 if not head_only else 2)
    head_zone = (np.hypot(xx - hc[0], yy - hc[1]) <= hr + (4 if not head_only else 30)) & (proj <= jaw)
    hair = dk & head_zone & ((yy <= hc[1] + 2) | head_only | (abs(uy) < 0.5))   # never the sleeve running under his head in flight
    if abs(uy) < 0.5 and not head_only: hair = dk & head_zone & (yy <= hc[1])   # flying flat: the sleeve runs right under his head
    # hair connected to the head zone (spikes reaching further out)
    hl, hn = comps(dk)
    for i in range(1, hn + 1):
        m = hl == i
        if (m & hair).any() and float(proj[m].max()) <= jaw and float(yy[m].max()) <= hc[1] + (4 if abs(uy) >= 0.5 else 0): hair |= m
    reg[hair] = R['hair']
    if gloves.any() or (F['skin'] & (reg == R['gloves'])).any():
        gd2 = ndimage.distance_transform_edt(~(reg == R['gloves']))
    else:
        gd2 = np.full((H, W), 99.0)
    dk = dk & ~hair
    cd = ndimage.distance_transform_edt(~chest_m) if chest is not None else np.full((H, W), 99.0)
    arms = dk & (gd2 <= 7) & (cd > 1.5) & ((np.abs(perp) > 4) | (proj < chest_top))   # sleeves lie out to the side (or ahead of him in flight)
    torso = dk & ~arms & (proj <= hip) & (cd <= 4)
    upper = dk & ~arms & ~torso & (proj <= hip)
    # upper-body dark not beside the chest: sleeves (the arm runs from the shoulder to the glove)
    arms |= upper & (np.abs(perp) > 5)
    if not head_only: arms |= dk & ~torso & (proj < chest_top - 1)   # beyond the neck along his body: an arm thrown ahead (flight punch) or overhead
    torso |= upper & ~arms
    waist = dk & ~arms & ~torso & (proj > hip) & (proj <= hip + 2.5)
    legs = dk & ~arms & ~torso & ~waist
    reg[arms] = R['arms']; reg[torso] = R['torso']; reg[waist] = R['waist']; reg[legs] = R['legs']
    if head_only:
        reg[F['dark'] & ~hair & (reg == 0)] = R['torso']
    # temples: hair at the sides of the skull, low (beside the goggles / ears), not the crest on top
    side = np.abs(perp) >= 2.5 if not head_only else np.abs(perp) >= 18
    low = proj >= (-2 if not head_only else -10)
    reg[(reg == R['hair']) & side & low] = R['temples']
    _LAST['geo'] = dict(head=(float(hc[0]), float(hc[1])), chest=(float(tc[0]), float(tc[1])), axis=(float(ux), float(uy)),
                        neck=(float(neck[0]), float(neck[1])), chestTop=chest_top, chestBot=chest_bot, hip=hip)
    return reg


def portrait_regions(arr):
    """the select / HUD portrait is a face close-up: cowl (yellow) → mask, the lenses → goggles, skin → face, dark → hair.
    The framing piece at the right edge (brown / lime, outside the families) stays protected."""
    rgb, a = arr[..., :3], arr[..., 3]
    F, on = fam_masks(rgb, a)
    reg = np.zeros(a.shape, np.int8)
    reg[F['yel']] = R['mask']; reg[F['white']] = R['goggles']; reg[F['skin']] = R['face']; reg[F['dark']] = R['hair']
    return reg


def classify(arr, fw, strip='', head_only=False):
    rgb, a = arr[..., :3], arr[..., 3]
    H, W = a.shape
    reg = np.zeros((H, W), np.int8); geos = []
    for fi, x0 in enumerate(range(0, W, fw)):
        reg[:, x0:x0 + fw] = frame_regions(rgb[:, x0:x0 + fw], a[:, x0:x0 + fw], strip, fi, head_only)
        geos.append(_LAST.get('geo'))
    return reg, geos


DEBUG_COL = {'protected': None, 'hair': (40, 40, 200), 'temples': (150, 150, 255), 'mask': (255, 240, 0), 'goggles': (0, 255, 255), 'eyes': (255, 255, 200),
             'face': (250, 190, 150), 'collar': (255, 0, 255), 'shoulders': (160, 0, 255), 'chest': (255, 140, 0), 'torso': (120, 120, 120),
             'arms': (60, 220, 60), 'gloves': (255, 60, 60), 'waist': (0, 120, 255), 'legs': (20, 110, 20), 'boots': (140, 90, 50),
             'streaks': (255, 255, 255), 'cloth': (255, 255, 120)}


def debug(out_path, scale=5, only=None):
    from PIL import ImageDraw
    strips = load_anim(); rows = []
    if only: strips = {k: v for k, v in strips.items() if k in only}
    for name, (fw, n) in strips.items():
        a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
        reg, _ = classify(a, fw, name)
        viz = a.copy()
        for k, c in DEBUG_COL.items():
            if c: viz[reg == R[k], :3] = c
        both = np.concatenate([a, viz], 0)
        im = Image.fromarray(both).resize((both.shape[1] * scale, both.shape[0] * scale), Image.NEAREST)
        rows.append((name, fw, im))
    Wd = max(im.width for _, _, im in rows) + 90
    Hd = sum(im.height + 8 for _, _, im in rows)
    sheet = Image.new('RGBA', (Wd, Hd), (60, 70, 90, 255)); dr = ImageDraw.Draw(sheet); y = 0
    for name, fw, im in rows:
        dr.text((4, y + 4), name, fill=(255, 255, 255, 255))
        sheet.alpha_composite(im, (90, y))
        for k in range(0, im.width, fw * scale): dr.line([(90 + k, y), (90 + k, y + im.height)], fill=(0, 0, 0, 255))
        y += im.height + 8
    sheet.save(out_path); print('debug →', out_path, sheet.size)


if __name__ == '__main__':
    if '--debug' in sys.argv:
        i = sys.argv.index('--debug'); debug(sys.argv[i + 1], only=sys.argv[i + 2:] or None)
    if '--palette' in sys.argv:   # colours the families do not cover (they stay protected)
        from collections import Counter
        cnt = Counter()
        for name, (fw, n) in load_anim().items():
            a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
            for c in map(tuple, a[a[..., 3] > 0][:, :3]):
                if c not in FAMILY_OF: cnt[c] += 1
        print(cnt.most_common())
