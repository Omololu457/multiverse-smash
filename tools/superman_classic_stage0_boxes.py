#!/usr/bin/env python3
# STAGE 0 per-box detection for SUPERMAN 4 (SNES Justice League Task Force sheet).
# ★EASIEST source of the four: RGBA with a FULLY TRANSPARENT background (alpha 0),
# content opaque (alpha 255) → box = alpha-mask connected component. Classic
# 16-bit costume: blue suit + red cape/trunks/boots + red "S". Credit baked bottom-
# right ("Ripped by HjpdeKrypton") + a "NEW GRAB" label (both detected as boxes →
# excluded in the audit). Facing: confirm at S1 (SNES rips often face right).
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

SRC = "SNES - Justice League Task Force - Fighters - Superman.png"
rgba = np.asarray(Image.open(SRC).convert("RGBA"))
H, W, _ = rgba.shape
content = rgba[:, :, 3] > 128

lbl, n = ndimage.label(content)
sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
print(f"components(opaque)={n}")

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

# ---- annotated bands (composite over dark bg so transparent sprites are visible) ----
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 18)
except Exception:
    font = ImageFont.load_default()
bg = Image.new("RGBA", (W, H), (40, 40, 50, 255))
disp = Image.alpha_composite(bg, Image.open(SRC).convert("RGBA")).convert("RGB")
draw = ImageDraw.Draw(disp)
for k, b in enumerate(boxes):
    y0, x0, y1, x1 = b[0], b[1], b[2], b[3]
    draw.rectangle([x0, y0, x1, y1], outline=(255, 200, 0), width=1)
    ty = max(0, y0 - 18)
    draw.rectangle([x0, ty, x0 + 13 * len(str(k)) + 4, ty + 17], fill=(0, 0, 0))
    draw.text((x0 + 2, ty), str(k), fill=(255, 220, 0), font=font)
disp.save("/tmp/classic_annot.png")
BAND = 430
nb = (H + BAND - 1) // BAND
for i in range(nb):
    y0 = i * BAND; y1 = min(H, y0 + BAND)
    crop = disp.crop((0, y0, W, y1)); s = 1500 / W
    crop.resize((1500, int((y1 - y0) * s))).save(f"/tmp/classic_band{i}.png")
print(f"\nannotated -> /tmp/classic_annot.png ; {nb} bands -> /tmp/classic_band0..{nb-1}.png")
