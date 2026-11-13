# tools/buggy_build/segment.py — connected-band segmentation of the Buggy sheet (Phase 1).
# Background is already alpha-0 (the "chroma key" is the sheet's own alpha). A band = a maximal run of rows
# containing any opaque pixel; inside a band, items are split on empty-column gaps >= GAP (4px for body rows so
# a split-body frame with floating limbs stays ONE frame; 2px for the loose-piece rows so touching-but-separate
# pieces are cut apart). Returns inclusive rects (x0, y0, x1, y1) in sheet pixels.
from PIL import Image
import numpy as np

def bands(alpha):
    rows = alpha.any(1); out = []; y = 0; H = len(rows)
    while y < H:
        if rows[y]:
            s = y
            while y < H and rows[y]: y += 1
            out.append((s, y))
        else: y += 1
    return out

def items(alpha, s, e, gap):
    cols = alpha[s:e].any(0); W = len(cols); segs = []; x = 0
    while x < W:
        if not cols[x]: x += 1; continue
        st = x
        while x < W:
            if cols[x]: x += 1; continue
            g = x
            while g < W and not cols[g]: g += 1
            if g - x >= gap or g >= W: break
            x = g
        segs.append((st, x))
    rects = []
    for x0, x1 in segs:
        sub = alpha[s:e, x0:x1]; ys = np.where(sub.any(1))[0]
        rects.append((int(x0), int(s + ys[0]), int(x1 - 1), int(s + ys[-1])))
    return rects

def segment(path):
    a = np.array(Image.open(path).convert('RGBA'))[:, :, 3] > 0
    b = bands(a)
    return [items(a, s, e, 4 if i < 14 else 2) for i, (s, e) in enumerate(b)]
