#!/usr/bin/env python3
# Render Piccolo Stage-0 boxes onto labeled grey contact sheets for visual audit.
# Usage:
#   python3 tools/piccolo_montage.py all            -> grid of every box, N per row
#   python3 tools/piccolo_montage.py 19-22,32-34    -> just those box indices
#   python3 tools/piccolo_montage.py out.png 19,20,21,22   (first arg .png => name)
# Keys tight cell-fill green (0,255,80) + teal to mid-grey, upscaled NEAREST.
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Piccolo.png"
a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
green = (np.abs(a - np.array([0, 255, 80])).sum(2) < 40)
teal  = (np.abs(a - np.array([0, 128, 128])).sum(2) < 40)
lbl, n = ndimage.label(~green)
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n+1))
bg_label = int(np.argmax(sizes)) + 1
boxes = []
for i in range(1, n+1):
    if i == bg_label: continue
    if int(sizes[i-1]) < 800: continue
    ys, xs = np.where(lbl == i)
    y0,y1,x0,x1 = ys.min(), ys.max(), xs.min(), xs.max()
    if (x1-x0+1) < 20 or (y1-y0+1) < 20: continue
    boxes.append((y0,x0,y1,x1))
boxes.sort(key=lambda b:(b[0]//40, b[1]))

def parse_idxs(s):
    out=[]
    for part in s.split(","):
        part=part.strip()
        if not part: continue
        if "-" in part:
            lo,hi=part.split("-"); out+=list(range(int(lo),int(hi)+1))
        else: out.append(int(part))
    return out

args=sys.argv[1:]
outname="piccolo_montage_out.png"
if args and args[0].endswith(".png"):
    outname=args[0]; args=args[1:]
spec=" ".join(args) if args else "all"
idxs=list(range(len(boxes))) if spec=="all" else parse_idxs(spec)

BG=(70,70,70)
# Big cells for small groups (detail audit), small cells for big overviews.
if len(idxs) <= 12:
    CELL_W, CELL_H = 240, 300; PER_ROW = min(len(idxs), 6)
elif len(idxs) <= 24:
    CELL_W, CELL_H = 170, 210; PER_ROW = 8
else:
    CELL_W, CELL_H = 120, 150; PER_ROW = 12
LABEL_H, PAD = 15, 6
SCALE = 1
cell_w = CELL_W + PAD
cell_h = CELL_H + LABEL_H + PAD
rows = (len(idxs)+PER_ROW-1)//PER_ROW
img = Image.new("RGB",(PAD+PER_ROW*cell_w, PAD+rows*cell_h), BG)
draw = ImageDraw.Draw(img)
src = Image.open(SRC).convert("RGB")
for k,idx in enumerate(idxs):
    r,c = divmod(k, PER_ROW)
    y0,x0,y1,x1 = boxes[idx]
    crop = np.asarray(src.crop((x0,y0,x1+1,y1+1))).astype(int)
    g2 = (np.abs(crop-np.array([0,255,80])).sum(2) < 40)
    t2 = (np.abs(crop-np.array([0,128,128])).sum(2) < 40)
    out = crop.copy(); out[g2|t2] = BG
    outimg = Image.fromarray(out.astype(np.uint8))
    w,h = outimg.size
    sc = min(CELL_W/w, CELL_H/h)
    nw,nh = max(1,int(w*sc)), max(1,int(h*sc))
    outimg = outimg.resize((nw,nh), Image.NEAREST)
    cx = PAD + c*cell_w; cy = PAD + r*cell_h + LABEL_H
    img.paste(outimg,(cx+(CELL_W-nw)//2, cy+(CELL_H-nh)))
    draw.text((cx, cy-LABEL_H+2), f"#{idx} {x1-x0+1}x{y1-y0+1}", fill=(120,255,120))
img.save(outname)
print(f"saved {outname} {img.size}  ({len(idxs)} boxes)")
