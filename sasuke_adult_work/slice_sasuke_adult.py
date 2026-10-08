"""sasuke_adult slicer: raw green sheet -> keyed -> per-action *_uniform.png.

Source: sasuke_uchiha_adult_nzc_sprite_sheet_by_rct29_daxk008.png (1828x4028)
Background: solid green (34,177,76), fully opaque + slight noise.

Keying: border flood-fill (only border-connected green -> transparent) so
interior green (the sword-swap WARP stripes, crescent-FX cores) survives.
Despill: edge-limited (only kept pixels touching transparency) so interior
green FX is never crushed -- fixes the Miles/Kurapika green-fringe class.

Repack: project reslice() contract -- measure each frame bbox, uniform
cells (maxW+pad x maxH+pad), center-X, bottom-align, anchorY:0.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = '../sasuke_uchiha_adult_nzc_sprite_sheet_by_rct29_daxk008.png'
BG = (34, 177, 76)
TOL = 48
ALPHA = 8
OUTDIR = '..'
PREFIX = 'sasuke_adult'

_sheet = None


def key_sheet():
    im = np.asarray(Image.open(SRC).convert('RGBA')).copy()
    rgb = im[..., :3].astype(np.int32)
    dist = np.abs(rgb - np.array(BG)).sum(2)
    bgish = dist <= TOL
    lbl, n = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))
    # also drop ENCLOSED near-exact-bg pockets (background trapped between
    # arm/sword/body) -- all observed <=500px; warp-FX green is a different
    # hue (never a large enclosed bg component) so it is untouched.
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=np.arange(1, n + 1))
    for i in range(1, n + 1):
        if i not in border and sizes[i - 1] <= 500:
            remove |= (lbl == i)
    im[remove, 3] = 0
    # edge-limited despill: only kept pixels in a 2px ring around removed green
    kept = im[..., 3] > 0
    ring = ndimage.binary_dilation(remove, iterations=2) & kept
    R, G, B = im[..., 0].astype(int), im[..., 1].astype(int), im[..., 2].astype(int)
    g_dom = ring & (G > R + 25) & (G > B + 25)
    newg = np.maximum(R, B).astype(np.uint8)
    im[..., 1][g_dom] = newg[g_dom]
    return im


def sheet():
    global _sheet
    if _sheet is None:
        _sheet = key_sheet()
    return _sheet


def _col_spans(mask, min_gap=3, min_w=4, min_px=6):
    cols = mask.sum(0)
    on = cols >= 1
    spans = []; s = None; gap = 0
    for x, v in enumerate(on):
        if v:
            if s is None: s = x
            gap = 0
        else:
            if s is not None:
                gap += 1
                if gap >= min_gap:
                    e = x - gap + 1
                    if e - s >= min_w and mask[:, s:e].sum() >= min_px:
                        spans.append((s, e))
                    s = None; gap = 0
    if s is not None:
        e = len(on)
        if e - s >= min_w and mask[:, s:e].sum() >= min_px:
            spans.append((s, e))
    return spans


def slice_action(name, y0, y1, x0=0, x1=None, xrects=None, pad=3, expect=None,
                 verbose=True):
    im = sheet()
    x1 = im.shape[1] if x1 is None else x1
    band = im[y0:y1, x0:x1, :].copy()
    m = band[..., 3] > ALPHA
    if xrects is not None:
        spans = [(a, b) for (a, b) in xrects]
    else:
        spans = _col_spans(m)
    frames = []
    for (a, b) in spans:
        sub = band[:, a:b, :]
        mm = sub[..., 3] > ALPHA
        ys, xs = np.where(mm)
        if len(ys) == 0:
            continue
        fy0, fy1 = ys.min(), ys.max() + 1
        fx0, fx1 = xs.min(), xs.max() + 1
        frames.append(sub[fy0:fy1, fx0:fx1, :])
    if not frames:
        print('!! %s: NO FRAMES' % name); return None
    uW = max(f.shape[1] for f in frames) + pad
    uH = max(f.shape[0] for f in frames) + pad
    strip = np.zeros((uH, uW * len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        fh, fw = f.shape[:2]
        dx = i * uW + (uW - fw) // 2
        dy = uH - fh - 1
        strip[dy:dy + fh, dx:dx + fw, :] = f
    out = '%s/%s_%s_uniform.png' % (OUTDIR, PREFIX, name)
    Image.fromarray(strip).save(out)
    flag = '' if (expect is None or expect == len(frames)) else '  <<< EXPECTED %d' % expect
    if verbose:
        print('OK %-16s %2df  cell %3dx%-3d  { frames: %d, width: %d, height: %d }%s'
              % (name, len(frames), uW, uH, len(frames), uW, uH, flag))
    return len(frames), uW, uH


if __name__ == '__main__':
    import sys
    # Save keyed full sheet once for QA
    Image.fromarray(sheet()).save('keyed_full.png')
    print('keyed_full.png saved')

    # ---- locomotion / core ----
    slice_action('idle',   118, 198, 0, 210, expect=4)
    slice_action('run',    232, 296, 0, 470, expect=6)
    slice_action('jump',   320, 400, 0, 210, expect=3)
    slice_action('guard',  428, 512, 0, 110, expect=2)
    slice_action('hurt',   552, 636, 0, 115, expect=2)
    slice_action('launched', 672, 752, 0, 150, expect=2)   # falling special dmg #2
    slice_action('knockdown', 795, 858, 0, 480, expect=5)
    slice_action('charge', 1028, 1110, 0, 55, expect=1)
    slice_action('throw',  900, 994, 0, 205, expect=3)      # THROW WEAPON (shuriken)
    slice_action('throwAir', 900, 994, 270, 475, expect=3)

    # ---- ground normals ----
    slice_action('light',  1155, 1233, 0, 295, expect=4)    # row A fists
    slice_action('comboB', 1248, 1322, 0, 375, expect=5)    # row B lunge+arc
    slice_action('kick',   1337, 1412, 0, 250, expect=4)    # row C
    slice_action('lowkick',1432, 1508, 0, 215, expect=4)    # row D
    slice_action('swordE', 1527, 1600, 0, 345, expect=4)    # row E
    slice_action('swordF', 1616, 1690, 0, 365, expect=4)    # row F
    slice_action('swordG', 1693, 1810, 0, 600, expect=8)    # row G big arcs
    slice_action('swordH', 1831, 1918, 0, 820, expect=8)    # row H
    slice_action('swordI', 1932, 2002, 0, 380, expect=4)    # row I
    slice_action('swordJ', 2036, 2108, 0, 545, expect=5)    # row J crescent

    # ---- air normals ----
    slice_action('air',       2158, 2250, 0, 345, expect=4)   # row1 fists
    slice_action('airSword',  2158, 2250, 425, 845, expect=4) # row1 sword
    slice_action('airKick',   2255, 2362, 0, 380, expect=5)   # row2 kicks
    slice_action('airKick2',  2365, 2452, 0, 400, expect=5)   # row3 air kicks + FX
    slice_action('air4',      2474, 2544, 0, 245, expect=3)   # row4
    slice_action('down_air',  2560, 2638, 0, 315, expect=3)   # row5 air sword slash

    # ---- chidori (frames physically touch -> explicit valley splits) ----
    slice_action('chidori', 2700, 2792, 0, 560, expect=8,
                 xrects=[(5,62),(62,148),(148,200),(200,271),(271,339),(339,418),(418,480),(480,560)])
    slice_action('chidoriAir', 2700, 2792, 700, 920, expect=3)

    # ---- sword-swap teleport strike (unlabeled variant 1) ----
    slice_action('swordSwap', 2863, 2950, 0, 820)

    # ---- specials (body poses; FX reused in-engine) ----
    slice_action('katon',    3133, 3218, 0, 200, expect=3)
    slice_action('katonAir', 3133, 3218, 270, 475, expect=3)
    slice_action('shinraTensei', 3256, 3340, 0, 230, expect=4)
    slice_action('amaterasu',    3381, 3458, 0, 140, expect=2)
    slice_action('chidoriNagashi',    3486, 3572, 0, 160, expect=2)
    slice_action('chidoriNagashiAir', 3486, 3572, 215, 350, expect=2)
    slice_action('chidoriEisou', 3607, 3686, 0, 330, expect=4)
    slice_action('banshouTenin', 3719, 3798, 0, 370, expect=4)
    slice_action('chibakuTensei',3828, 3912, 0, 350, expect=5)
    slice_action('kuchiyose',    3953, 4014, 0, 145, expect=2)

    # ---- intro (header 6 sasuke frames, touching -> explicit splits) + win (trio = 1 frame) ----
    slice_action('intro', 12, 96, 0, 290, expect=6,
                 xrects=[(0,43),(43,90),(90,133),(133,183),(183,229),(229,290)])
    slice_action('win', 12, 96, 325, 425, expect=1, xrects=[(0,100)])
