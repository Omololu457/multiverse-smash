#!/usr/bin/env python3
# STAGE 0 per-box detection for SUPERMAN 3 (New 52 sheet, immajadenyuki).
# Structure: free-floating sprites on a WHITE field (255,255,255). Source is a
# JPEG (RGB, no alpha, compression fringe) → key near-white with tolerance.
# New 52 costume: blue armored suit (high collar, NO red trunks), red cape/boots,
# red "S" shield, black outlines. Dense grid → sprites may sit close together.
#
# Output: sorted box list (top->bottom, left->right) + full-res annotated bands
# for the vision audit.
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

SRC = "new_52_superman_sprite_by_immajadenyuki_d6mzx0p-fullview.jpeg"
rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W, _ = rgb.shape
# near-white key (JPEG fringe): all channels bright AND low saturation
white = (rgb.min(2) > 232)
content = ~white

lbl, n = ndimage.label(content)  # 4-conn
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
print(f"components(non-white)={n}")

boxes = []
for i in range(1, n + 1):
    sz = int(sizes[i - 1])
    if sz < 200:
        continue
    ys, xs = np.where(lbl == i)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    if bw < 12 or bh < 14:
        continue
    boxes.append([y0, x0, y1, x1, bw, bh, sz])

boxes.sort(key=lambda b: (b[0] // 40, b[1]))
print(f"\nDETECTED {len(boxes)} BOXES. idx | y0-y1 x0-x1 (WxH) fill")
for k, b in enumerate(boxes):
    y0, x0, y1, x1, bw, bh, sz = b
    print(f"{k:3d} | y{y0:4d}-{y1:<4d} x{x0:4d}-{x1:<4d} {bw:3d}x{bh:<3d} {sz:6d}")

# ---- annotated bands ----
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 18)
except Exception:
    font = ImageFont.load_default()
disp = Image.open(SRC).convert("RGB")
draw = ImageDraw.Draw(disp)
for k, b in enumerate(boxes):
    y0, x0, y1, x1 = b[0], b[1], b[2], b[3]
    draw.rectangle([x0, y0, x1, y1], outline=(255, 140, 0), width=1)
    ty = max(0, y0 - 18)
    draw.rectangle([x0, ty, x0 + 13 * len(str(k)) + 4, ty + 17], fill=(0, 0, 0))
    draw.text((x0 + 2, ty), str(k), fill=(255, 220, 0), font=font)
disp.save("/tmp/new52_annot.png")
BAND = 440
nb = (H + BAND - 1) // BAND
for i in range(nb):
    y0 = i * BAND; y1 = min(H, y0 + BAND)
    crop = disp.crop((0, y0, W, y1)); s = 1500 / W
    crop.resize((1500, int((y1 - y0) * s))).save(f"/tmp/new52_band{i}.png")
print(f"\nannotated -> /tmp/new52_annot.png ; {nb} bands -> /tmp/new52_band0..{nb-1}.png")
