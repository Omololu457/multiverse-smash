#!/usr/bin/env python3
# STAGE 0 per-box detection for the PICCOLO sheet (3DS Extreme Butoden, same
# source family as Frieza). Structure CONFIRMED identical to Frieza: solid green
# #00FF50 (0,255,80) cell FILL + teal #008080 outer gutter; each sprite drawn on
# its own green cell => moated => one connected component of the non-green mask.
#
# ★PICCOLO-SPECIFIC HAZARD: Piccolo has GREEN SKIN. Frieza's loose green key
#   (g>200 & r<90 & b<130) also grabs Piccolo's bright skin highlight (0,224,8)
#   (84k px) => would punch holes in the body. So the green key here is TIGHT
#   around the cell-fill colour (0,255,80) only. Mid skin (0,128,0) is already
#   safe (g<200). Verified: tight key <40 grabs the 4.9M cell-fill px, 0 skin.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Piccolo.png"
a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W, _ = a.shape
# TIGHT cell-fill key (NOT Frieza's loose green key) — protects green skin.
green = (np.abs(a - np.array([0, 255, 80])).sum(2) < 40)
teal  = (np.abs(a - np.array([0, 128, 128])).sum(2) < 40)

nongreen = ~green
lbl, n = ndimage.label(nongreen)  # 4-conn default
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n+1))
bg_label = int(np.argmax(sizes)) + 1
print(f"components(non-green)={n}  bg_label={bg_label} bg_size={int(sizes[bg_label-1])}")

boxes = []
for i in range(1, n+1):
    if i == bg_label: continue
    sz = int(sizes[i-1])
    if sz < 800: continue  # skip tiny slivers
    ys, xs = np.where(lbl == i)
    y0,y1,x0,x1 = ys.min(), ys.max(), xs.min(), xs.max()
    bw, bh = x1-x0+1, y1-y0+1
    if bw < 20 or bh < 20: continue
    comp = (lbl == i)
    content = comp & (~teal)
    cn = int(content.sum())
    if cn > 30:
        cys, cxs = np.where(content)
        cy0,cy1,cx0,cx1 = cys.min(),cys.max(),cxs.min(),cxs.max()
    else:
        cy0=cy1=cx0=cx1=0
    boxes.append((y0,x0,y1,x1,bw,bh,sz,cn,cy0,cx0,cy1,cx1))

boxes.sort(key=lambda b:(b[0]//40, b[1]))
print(f"\nDETECTED {len(boxes)} BOXES (sorted top->bottom, left->right)")
print("idx | box y0..y1  x0..x1  (WxH)   | interiorArea contentPx | contentBBox WxH")
for k,b in enumerate(boxes):
    y0,x0,y1,x1,bw,bh,sz,cn,cy0,cx0,cy1,cx1 = b
    cw,ch = (cx1-cx0+1, cy1-cy0+1) if cn>30 else (0,0)
    print(f"{k:3d} | y{y0:4d}-{y1:<4d} x{x0:4d}-{x1:<4d} {bw:4d}x{bh:<4d} | {sz:7d} {cn:6d} | {cw}x{ch}")
