#!/usr/bin/env python3
# STAGE 0 investigation for the "Vegeta Black" (working title) akuma-style sheet.
# Sheet: dcxehsy_..._by_mjdmadgaming_ddk5ebw.png (1852x2421), GREEN-KEY bg (0,128,0),
# fully opaque. Character wears BLACK/RED battle armor (Ultra-Ego-style). Black keys
# safely against green. Strategy: mask non-green content -> connected components ->
# light dilation to weld a single sprite's disjoint limbs WITHOUT merging neighbours ->
# size filter -> group into rows -> emit (1) a text index and (2) a labeled montage
# grid so each island can be assigned a role by eye.
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
import sys

SRC = "dcxehsy_e41e5990_33a8_46c3_8741_ef27b60e45cc_by_mjdmadgaming_ddk5ebw.png"
a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W, _ = a.shape

# GREEN KEY: (0,128,0)-ish. green channel dominant, r/b low. Tolerant band.
r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
green = (g > 80) & (g < 180) & (r < 70) & (b < 70) & (g > r + 40) & (g > b + 40)
content = ~green

# weld a sprite's own parts (arms/legs/FX) but keep neighbours apart: small dilation
DIL = int(sys.argv[1]) if len(sys.argv) > 1 else 3
mask = ndimage.binary_dilation(content, iterations=DIL)
lbl, n = ndimage.label(mask)
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n+1))

boxes = []
MIN = 500
for i in range(1, n+1):
    if sizes[i-1] < MIN:
        continue
    ys, xs = np.where(lbl == i)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    if bw < 18 or bh < 18:
        continue
    # real content pixel count inside this component (non-green)
    sub = content[y0:y1+1, x0:x1+1] & (lbl[y0:y1+1, x0:x1+1] == i)
    boxes.append([y0, x0, y1, x1, bw, bh, int(sub.sum())])

# row grouping: sort by y, cluster rows whose y0 are within ROWTOL
boxes.sort(key=lambda b: (b[0], b[1]))
ROWTOL = 60
rows = []
for bx in boxes:
    placed = False
    for row in rows:
        if abs(row[0][0] - bx[0]) < ROWTOL:
            row.append(bx); placed = True; break
    if not placed:
        rows.append([bx])
# sort within row by x, and rows by mean y
for row in rows:
    row.sort(key=lambda b: b[1])
rows.sort(key=lambda r: np.mean([b[0] for b in r]))

# flat ordered list with global index
ordered = [bx for row in rows for bx in row]
print(f"components={n}  kept boxes={len(ordered)}  rows={len(rows)}  (dilate={DIL})")
print("idx | row | y0..y1   x0..x1    WxH      content")
gi = 0
for ri, row in enumerate(rows):
    for bx in row:
        y0, x0, y1, x1, bw, bh, cn = bx
        print(f"{gi:3d} | r{ri:2d} | y{y0:4d}-{y1:<4d} x{x0:4d}-{x1:<4d} {bw:3d}x{bh:<3d}  {cn:6d}")
        gi += 1

# ---- labeled montage: crop each island (green->white), tile in a grid, draw idx ----
CELL = 150
COLS = 12
img = Image.open(SRC).convert("RGB")
arr = np.asarray(img)
def crop_clean(b):
    y0, x0, y1, x1, bw, bh, cn = b
    c = arr[y0:y1+1, x0:x1+1].copy()
    gm = green[y0:y1+1, x0:x1+1]
    c[gm] = [255, 255, 255]
    im = Image.fromarray(c)
    im.thumbnail((CELL-8, CELL-24))
    return im

rows_grid = (len(ordered) + COLS - 1) // COLS
mont = Image.new("RGB", (COLS*CELL, rows_grid*CELL), (40, 40, 40))
d = ImageDraw.Draw(mont)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 16)
except Exception:
    font = ImageFont.load_default()
for k, b in enumerate(ordered):
    cx = (k % COLS) * CELL
    cy = (k // COLS) * CELL
    im = crop_clean(b)
    mont.paste(im, (cx+4, cy+20))
    d.rectangle([cx, cy, cx+CELL-1, cy+CELL-1], outline=(90, 90, 90))
    d.text((cx+3, cy+2), f"{k}", fill=(255, 230, 0), font=font)
mont.save("vegeta_black_stage0_montage.png")
print("\nwrote vegeta_black_stage0_montage.png  ({}x{})".format(*mont.size))
