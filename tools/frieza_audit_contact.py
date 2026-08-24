#!/usr/bin/env python3
# Render specified global box indices from the Frieza sheet onto a labeled
# mid-grey contact sheet, keying green+teal to the grey bg, upscaled NEAREST.
import sys
import numpy as np
from PIL import Image, ImageDraw

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Frieza.png"
from scipy import ndimage
a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
green = (a[:,:,1] > 200) & (a[:,:,0] < 90) & (a[:,:,2] < 130)
teal  = (np.abs(a - np.array([0,128,128])).sum(2) < 40)
nongreen = ~green
lbl, n = ndimage.label(nongreen)
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n+1))
bg_label = int(np.argmax(sizes)) + 1
boxes = []
for i in range(1, n+1):
    if i == bg_label: continue
    sz = int(sizes[i-1])
    if sz < 800: continue
    ys, xs = np.where(lbl == i)
    y0,y1,x0,x1 = ys.min(), ys.max(), xs.min(), xs.max()
    bw, bh = x1-x0+1, y1-y0+1
    if bw < 20 or bh < 20: continue
    boxes.append((y0,x0,y1,x1))
boxes.sort(key=lambda b:(b[0]//40, b[1]))

# parse args: label:idx,idx,idx  label2:idx,...
groups = []  # (label, [idx])
for arg in sys.argv[1:]:
    label, idxs = arg.split(":")
    idxs = [int(x) for x in idxs.split(",") if x!=""]
    groups.append((label, idxs))

SCALE = 3
CELL_W = 130
CELL_H = 175
PAD = 6
LABEL_H = 16
BG = (70,70,70)
cols = max(len(g[1]) for g in groups)
row_h = CELL_H*SCALE//1 + LABEL_H + PAD
# Instead: fixed cell then scale whole thing modestly. Build at native then upscale.
cell_w = CELL_W + PAD
cell_h = CELL_H + LABEL_H + PAD
sheet_w = PAD + cols*cell_w
sheet_h = PAD + len(groups)*cell_h
img = Image.new("RGB",(sheet_w,sheet_h),BG)
draw = ImageDraw.Draw(img)

src = Image.open(SRC).convert("RGB")
srcarr = a
for gi,(label,idxs) in enumerate(groups):
    ry = PAD + gi*cell_h
    draw.text((PAD, ry), f"{label}", fill=(255,255,0))
    for ci,idx in enumerate(idxs):
        y0,x0,y1,x1 = boxes[idx]
        crop = np.asarray(src.crop((x0,y0,x1+1,y1+1))).astype(int)
        g2 = (crop[:,:,1] > 200) & (crop[:,:,0] < 90) & (crop[:,:,2] < 130)
        t2 = (np.abs(crop - np.array([0,128,128])).sum(2) < 40)
        mask = g2 | t2
        out = crop.copy()
        out[mask] = BG
        outimg = Image.fromarray(out.astype(np.uint8))
        cx = PAD + ci*cell_w
        cy = ry + LABEL_H
        # scale to fit cell keeping aspect
        w,h = outimg.size
        sc = min(CELL_W/w, CELL_H/h)
        nw,nh = max(1,int(w*sc)), max(1,int(h*sc))
        outimg = outimg.resize((nw,nh), Image.NEAREST)
        img.paste(outimg,(cx, cy+(CELL_H-nh)))
        draw.text((cx, cy-1), f"#{idx}", fill=(120,255,120))

img.save("frieza_audit_out.png")
print(f"saved frieza_audit_out.png {img.size}")
