#!/usr/bin/env python3
# STAGE 0 per-box detection for the Frieza sheet.
# Green #00FF50 boxes are hollow rectangular outlines wrapping frame clusters in a
# staggered layout. Strategy: label connected components of the NON-green mask; the
# huge outer component is background, each remaining component is a box INTERIOR
# bounded by the green outline. Report each box's bbox + interior content bbox.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Frieza.png"
a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W, _ = a.shape
green = (a[:,:,1] > 200) & (a[:,:,0] < 90) & (a[:,:,2] < 130)
teal  = (np.abs(a - np.array([0,128,128])).sum(2) < 40)

nongreen = ~green
lbl, n = ndimage.label(nongreen)  # 4-conn default
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n+1))
bg_label = int(np.argmax(sizes)) + 1
print(f"components(non-green)={n}  bg_label={bg_label} bg_size={int(sizes[bg_label-1])}")

boxes = []
for i in range(1, n+1):
    if i == bg_label: continue
    sz = int(sizes[i-1])
    if sz < 800: continue  # skip tiny slivers / green-crossing noise
    ys, xs = np.where(lbl == i)
    y0,y1,x0,x1 = ys.min(), ys.max(), xs.min(), xs.max()
    bw, bh = x1-x0+1, y1-y0+1
    if bw < 20 or bh < 20: continue
    # content = non-teal pixels inside this interior component
    comp = (lbl == i)
    content = comp & (~teal)
    cn = int(content.sum())
    if cn > 30:
        cys, cxs = np.where(content)
        cy0,cy1,cx0,cx1 = cys.min(),cys.max(),cxs.min(),cxs.max()
    else:
        cy0=cy1=cx0=cx1=0
    boxes.append((y0,x0,y1,x1,bw,bh,sz,cn,cy0,cx0,cy1,cx1))

# sort top-to-bottom, then left-to-right
boxes.sort(key=lambda b:(b[0]//40, b[1]))
print(f"\nDETECTED {len(boxes)} BOXES (sorted top->bottom, left->right)")
print("idx | box y0..y1  x0..x1  (WxH)   | interiorArea contentPx | contentBBox WxH")
for k,b in enumerate(boxes):
    y0,x0,y1,x1,bw,bh,sz,cn,cy0,cx0,cy1,cx1 = b
    cw,ch = (cx1-cx0+1, cy1-cy0+1) if cn>30 else (0,0)
    print(f"{k:3d} | y{y0:4d}-{y1:<4d} x{x0:4d}-{x1:<4d} {bw:4d}x{bh:<4d} | {sz:7d} {cn:6d} | {cw}x{ch}")

# ---------------------------------------------------------------------------
# STAGE 0 FINDINGS (see FRIEZA_ASSET_MAP.md):
#  * Sheet is GREEN-FILLED cells (not teal-interior outlines): each cell is a
#    solid #00FF50 rectangle with ONE sprite drawn on it; teal #008080 is only
#    the outer gutter between cells. So the reslice keys BOTH green+teal to
#    transparent and takes the sprite as the non-green connected component.
#  * Frames are staggered/tightly packed: adjacent frames separated by <6px of
#    green in places -> row-band detection FAILS, and binary_dilation MERGES
#    neighbours (159 raw comps -> 24 after 3px dilate). Use RAW non-green
#    connected-component labelling, size-filter ~800px, NO dilation.
#  * Reattach the ~5 small (60..800px) fragments to nearest parent bbox if a
#    thin tail-tip ever detaches (rare on this sheet).
# ---------------------------------------------------------------------------
