#!/usr/bin/env python3
"""Batman arsenal: print per-row frame rectangles for the promo sheets (border-connected background matte)."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
BG = np.array([180, 175, 188])
def matte(a, tol=26):
    near = np.abs(a - BG).max(-1) <= tol
    lab, n = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    big = [i + 1 for i, s in enumerate(ndimage.sum(near, lab, range(1, n + 1))) if s > 4000]
    return ~np.isin(lab, list(border | set(big)))
def frames(path, xmin, gapx=10, gapy=10, minpx=30):
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    fg = matte(a); fg[:, :xmin] = False
    rows = fg.any(1); out = []
    ys = np.nonzero(rows)[0]
    bands = []; s = ys[0]; p = ys[0]
    for y in ys[1:]:
        if y - p > gapy: bands.append((s, p + 1)); s = y
        p = y
    bands.append((s, p + 1))
    for y0, y1 in bands:
        cols = fg[y0:y1].any(0); xs = np.nonzero(cols)[0]
        segs = []; s = xs[0]; p = xs[0]
        for x in xs[1:]:
            if x - p > gapx: segs.append((s, p + 1)); s = x
            p = x
        segs.append((s, p + 1))
        fr = []
        for x0, x1 in segs:
            m = fg[y0:y1, x0:x1]
            if m.sum() < minpx: continue
            yy = np.nonzero(m.any(1))[0]
            fr.append((int(x0), int(y0 + yy[0]), int(x1 - x0), int(yy[-1] - yy[0] + 1)))
        out.append(((int(y0), int(y1)), fr))
    return out
if __name__ == '__main__':
    for (y0, y1), fr in frames(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else 10):
        print(f'band y{y0}-{y1} n={len(fr)}', fr)
