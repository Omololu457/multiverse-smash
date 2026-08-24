#!/usr/bin/env python3
# STAGE 0 per-box detection for SUPERMAN 2 (DC Universe Customs sheet).
# Structure: free-floating sprites on a solid MS-Paint-green field
# (34,177,76). NO moated cells / NO teal gutter (unlike Frieza/Piccolo),
# so each non-green connected component == one sprite (as long as sprites
# don't visually touch). Content palette: blue suit (0,0,255 / 0,72,248),
# red cape/trunks (182,14,22 / 237,28,36 / 255,0,0), black outlines.
#
# Output: sorted box list (top->bottom, left->right) + a labelled montage
# grid PNG for the vision audit.
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

SRC = "Custom _ Edited - DC Universe Customs - Superman - Superman.png"
KEY = np.array([34, 177, 76])
TOL = 60  # generous: covers anti-aliased green fringe

rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W, _ = rgb.shape
green = (np.abs(rgb - KEY).sum(2) < TOL)
nongreen = ~green

lbl, n = ndimage.label(nongreen)  # 4-conn
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
print(f"components(non-green)={n}")

boxes = []
for i in range(1, n + 1):
    sz = int(sizes[i - 1])
    if sz < 250:  # skip tiny slivers / stray keyed pixels
        continue
    ys, xs = np.where(lbl == i)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    if bw < 12 or bh < 12:
        continue
    boxes.append([y0, x0, y1, x1, bw, bh, sz])

# row-band sort: group boxes whose top ~ same band
boxes.sort(key=lambda b: (b[0] // 45, b[1]))
print(f"\nDETECTED {len(boxes)} BOXES (>=250px). idx | y0-y1 x0-x1 (WxH) fill")
for k, b in enumerate(boxes):
    y0, x0, y1, x1, bw, bh, sz = b
    print(f"{k:3d} | y{y0:4d}-{y1:<4d} x{x0:4d}-{x1:<4d} {bw:3d}x{bh:<3d} {sz:6d}")

# ---- labelled annotated sheet, cropped into readable full-res bands ----
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 20)
except Exception:
    font = ImageFont.load_default()
disp = Image.open(SRC).convert("RGB")
draw = ImageDraw.Draw(disp)
for k, b in enumerate(boxes):
    y0, x0, y1, x1 = b[0], b[1], b[2], b[3]
    draw.rectangle([x0, y0, x1, y1], outline=(255, 255, 0), width=1)
    # index label just ABOVE the box on a black chip so it never covers the sprite
    ty = max(0, y0 - 20)
    draw.rectangle([x0, ty, x0 + 14 * len(str(k)) + 4, ty + 19], fill=(0, 0, 0))
    draw.text((x0 + 2, ty), str(k), fill=(255, 255, 0), font=font)
disp.save("/tmp/dcuc_annot.png")

BAND = 430
nb = (H + BAND - 1) // BAND
for i in range(nb):
    y0 = i * BAND
    y1 = min(H, y0 + BAND)
    crop = disp.crop((0, y0, W, y1))
    # scale to ~1500 wide for legibility
    s = 1500 / W
    crop = crop.resize((1500, int((y1 - y0) * s)))
    crop.save(f"/tmp/dcuc_band{i}.png")
print(f"\nannotated -> /tmp/dcuc_annot.png ; {nb} bands -> /tmp/dcuc_band0..{nb-1}.png")
