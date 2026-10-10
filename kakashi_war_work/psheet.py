#!/usr/bin/env python3
"""Perfect Susanoo (P sheet) helper — grayscale art on opaque BLACK. Alpha is derived from LUMINANCE (black
becomes transparent automatically; NEVER key black). Band preview + connected-component frame detection.
Usage: psheet.py Y0 Y1 [scale] [out] [bg]  (bg magenta|black|white)
"""
import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = "perfect_susanoo_kakashi_by_mikeel8888_d8nim62.png"

def lum_alpha():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
    l = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) / 255.0
    alpha = np.clip((l - 0.07) / 0.75, 0, 1) ** 0.85 * 0.92
    rgba = np.dstack([a.astype("uint8"), (alpha * 255).astype("uint8")])
    return rgba, l

RGBA, L = lum_alpha()

def detect(y0, y1, x0=0, x1=None, min_sz=600, min_w=30, min_h=40, close=5):
    if x1 is None: x1 = RGBA.shape[1]
    sub = RGBA[y0:y1, x0:x1]
    mask = sub[..., 3] > 40
    if close: mask = ndimage.binary_closing(mask, structure=np.ones((close, close)))
    lbl, n = ndimage.label(mask)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < min_sz: continue
        bx0, bx1, by0, by1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        if (bx1 - bx0 + 1) < min_w or (by1 - by0 + 1) < min_h: continue
        boxes.append((bx0 + x0, by0 + y0, bx1 + x0, by1 + y0))
    boxes.sort(key=lambda b: b[0])
    return boxes

def composite(rgba, color):
    aa = rgba[..., 3:4].astype(float) / 255.0
    bg = np.ones_like(rgba[..., :3], float) * np.array(color, float)
    return (rgba[..., :3].astype(float) * aa + bg * (1 - aa)).astype(np.uint8)

if __name__ == "__main__":
    y0, y1 = int(sys.argv[1]), int(sys.argv[2])
    scale = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4
    out = sys.argv[4] if len(sys.argv) > 4 else "kakashi_war_work/p_band.png"
    color = {"magenta": (255, 0, 255), "black": (0, 0, 0), "white": (255, 255, 255)}.get(sys.argv[5] if len(sys.argv) > 5 else "magenta", (255, 0, 255))
    boxes = detect(y0, y1)
    comp = composite(RGBA[y0:y1], color)
    img = Image.fromarray(comp).convert("RGB")
    img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    for idx, (bx0, by0, bx1, by1) in enumerate(boxes):
        r = [bx0 * scale, (by0 - y0) * scale, bx1 * scale, (by1 - y0) * scale]
        d.rectangle(r, outline=(0, 255, 0), width=1)
        d.text((r[0] + 1, r[1] + 1), str(idx), fill=(255, 255, 0))
    img.save(out)
    print(f"band y{y0}-{y1}: {len(boxes)} boxes")
    for idx, b in enumerate(boxes):
        print(f"  [{idx}] x{b[0]}-{b[2]} y{b[1]}-{b[3]}  w{b[2]-b[0]+1} h{b[3]-b[1]+1}")
