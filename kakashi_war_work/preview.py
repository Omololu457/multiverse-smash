#!/usr/bin/env python3
"""Band preview for the K sheet (kakashi_war build).
Keys via border-floodfill (navy 0,64,128), then for a given y-band detects
connected components, draws numbered boxes, composites on a chosen bg.
Usage: python3 preview.py Y0 Y1 [bg] [scale] [out]
"""
import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = "kakashi_nzc_sprites_original_colors__by_felipedanielskibr_d837fqp.png"
BG = np.array([0, 64, 128])

def keyed():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)
    dist = np.abs(a - BG).sum(2)
    bgish = dist <= 40
    lbl, n = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))
    alpha = np.where(remove, 0, 255).astype("uint8")
    return np.dstack([a.astype("uint8"), alpha])

def detect(rgba, y0, y1, min_sz=120, min_w=8, min_h=10):
    sub = rgba[y0:y1]
    mask = sub[..., 3] > 16
    lbl, n = ndimage.label(mask)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < min_sz:
            continue
        bx0, bx1, by0, by1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        if (bx1 - bx0 + 1) < min_w or (by1 - by0 + 1) < min_h:
            continue
        boxes.append((bx0, by0 + y0, bx1, by1 + y0))
    boxes.sort(key=lambda b: (b[1] // 40, b[0]))
    return boxes

def composite(rgba, color):
    a = rgba[..., 3:4].astype(float) / 255.0
    bg = np.ones_like(rgba[..., :3], float) * np.array(color, float)
    return (rgba[..., :3].astype(float) * a + bg * (1 - a)).astype(np.uint8)

if __name__ == "__main__":
    y0, y1 = int(sys.argv[1]), int(sys.argv[2])
    color = {"magenta": (255, 0, 255), "black": (0, 0, 0), "white": (255, 255, 255)}.get(
        sys.argv[3] if len(sys.argv) > 3 else "magenta", (255, 0, 255))
    scale = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
    out = sys.argv[5] if len(sys.argv) > 5 else "kakashi_war_work/band.png"
    rgba = keyed()
    boxes = detect(rgba, y0, y1)
    comp = composite(rgba[y0:y1], color)
    img = Image.fromarray(comp).convert("RGB")
    img = img.resize((int(img.width * scale), int(img.height * scale)), Image.NEAREST)
    d = ImageDraw.Draw(img)
    for idx, (bx0, by0, bx1, by1) in enumerate(boxes):
        r = [bx0 * scale, (by0 - y0) * scale, bx1 * scale, (by1 - y0) * scale]
        d.rectangle(r, outline=(0, 255, 0), width=1)
        d.text((r[0] + 1, r[1] + 1), str(idx), fill=(255, 255, 0))
    img.save(out)
    print(f"band y{y0}-{y1}: {len(boxes)} boxes")
    for idx, b in enumerate(boxes):
        print(f"  [{idx}] x{b[0]}-{b[2]} y{b[1]}-{b[3]}  w{b[2]-b[0]+1} h{b[3]-b[1]+1}")
