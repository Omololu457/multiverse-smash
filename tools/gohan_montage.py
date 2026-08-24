#!/usr/bin/env python3
# Render Teen Gohan (Extreme Butoden) Stage-0 boxes onto labeled grey contact sheets.
# The two EB Gohan sheets are teal-keyed (0,128,128) with green (0,255,80) grid/label
# lines (identical convention to the EB Goku sheets). Keys BOTH to grey, labels
# connected components, tiles them with index+size.
# Usage:
#   python3 tools/gohan_montage.py base            -> all boxes, base sheet
#   python3 tools/gohan_montage.py ssj2 0-40       -> boxes 0..40 of the SSJ2 sheet
#   python3 tools/gohan_montage.py base out.png 5,6 -> named output
# Sheet aliases: base / ssj2
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SHEETS = {
    "base": "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Teen Gohan.png",
    "ssj2": "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Teen Gohan (Super Saiyan 2).png",
}

args = sys.argv[1:]
alias = args[0] if args else "base"
SRC = SHEETS[alias]
args = args[1:]

a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
teal  = (np.abs(a - np.array([0, 128, 128])).sum(2) < 40)
green = (np.abs(a - np.array([0, 255, 80])).sum(2) < 60)
bg = teal | green
lbl, n = ndimage.label(~bg)
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
boxes = []
for i in range(1, n + 1):
    if int(sizes[i - 1]) < 500:
        continue
    ys, xs = np.where(lbl == i)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    if (x1 - x0 + 1) < 18 or (y1 - y0 + 1) < 18:
        continue
    boxes.append((y0, x0, y1, x1))
# reading order: row-band (quantized) then left-to-right
boxes.sort(key=lambda b: (b[0] // 60, b[1]))


def parse_idxs(s):
    out = []
    for part in s.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            lo, hi = part.split("-"); out += list(range(int(lo), int(hi) + 1))
        else:
            out.append(int(part))
    return out


outname = f"gohan_{alias}_montage.png"
if args and args[0].endswith(".png"):
    outname = args[0]; args = args[1:]
spec = " ".join(args) if args else "all"
idxs = list(range(len(boxes))) if spec == "all" else [i for i in parse_idxs(spec) if i < len(boxes)]

BG = (70, 70, 70)
if len(idxs) <= 12:
    CELL_W, CELL_H, PER_ROW = 240, 300, min(len(idxs), 6)
elif len(idxs) <= 24:
    CELL_W, CELL_H, PER_ROW = 170, 210, 8
else:
    CELL_W, CELL_H, PER_ROW = 120, 150, 12
LABEL_H, PAD = 15, 6
cell_w = CELL_W + PAD
cell_h = CELL_H + LABEL_H + PAD
rows = (len(idxs) + PER_ROW - 1) // PER_ROW
img = Image.new("RGB", (PAD + PER_ROW * cell_w, PAD + rows * cell_h), BG)
draw = ImageDraw.Draw(img)
src = Image.open(SRC).convert("RGB")
for k, idx in enumerate(idxs):
    r, c = divmod(k, PER_ROW)
    y0, x0, y1, x1 = boxes[idx]
    crop = np.asarray(src.crop((x0, y0, x1 + 1, y1 + 1))).astype(int)
    g2 = (np.abs(crop - np.array([0, 128, 128])).sum(2) < 40) | (np.abs(crop - np.array([0, 255, 80])).sum(2) < 60)
    out = crop.copy(); out[g2] = BG
    outimg = Image.fromarray(out.astype(np.uint8))
    w, h = outimg.size
    sc = min(CELL_W / w, CELL_H / h)
    nw, nh = max(1, int(w * sc)), max(1, int(h * sc))
    outimg = outimg.resize((nw, nh), Image.NEAREST)
    cx = PAD + c * cell_w; cy = PAD + r * cell_h + LABEL_H
    img.paste(outimg, (cx + (CELL_W - nw) // 2, cy + (CELL_H - nh)))
    draw.text((cx, cy - LABEL_H + 2), f"#{idx} {x1 - x0 + 1}x{y1 - y0 + 1}", fill=(120, 255, 120))
img.save(outname)
print(f"saved {outname} {img.size}  ({len(idxs)}/{len(boxes)} boxes)  src={SRC}")
