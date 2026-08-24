#!/usr/bin/env python3
# STAGE 0 per-box detection for the GWEN TENNYSON sheet
#   jus_gwen_tennyson_spritesheet_by_magnesiumselzune__by_renatoooferreiraaa_dmnjxu8.png
#   2373x623 RGBA (alpha fully opaque) — LANDSCAPE, unique in this project.
# Background is a FLAT dark navy field (41,49,74), NOT transparent and NOT a per-cell grid.
# Every sprite/effect is moated by navy => one connected component of the non-bg mask.
#
# No on-sheet text labels anywhere (unlike Kakashi). Every box is a sprite or FX frame.
# We print + montage everything so each index can be eyeballed and named by content.
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = "jus_gwen_tennyson_spritesheet_by_magnesiumselzune__by_renatoooferreiraaa_dmnjxu8.png"
BG = np.array([41, 49, 74])

def load_rgb():
    return np.asarray(Image.open(SRC).convert("RGB")).astype(int)

def bg_mask(a, tol=40):
    return np.abs(a - BG).sum(2) < tol

def detect_boxes(a, min_sz=200, min_w=10, min_h=12, row_bucket=60):
    bg = bg_mask(a)
    lbl, n = ndimage.label(~bg)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    boxes = []
    for i in range(1, n + 1):
        sz = int(sizes[i - 1])
        if sz < min_sz:
            continue
        ys, xs = np.where(lbl == i)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if bw < min_w or bh < min_h:
            continue
        fill = sz / float(bw * bh)
        boxes.append((y0, x0, y1, x1, bw, bh, sz, fill))
    boxes.sort(key=lambda b: (b[0] // row_bucket, b[1]))
    return boxes

def montage(a, boxes, x_lo, x_hi, out, scale=1.0):
    sub = Image.fromarray(a[:, x_lo:x_hi].astype('uint8'), "RGB").convert("RGBA")
    if scale != 1.0:
        sub = sub.resize((int(sub.width * scale), int(sub.height * scale)), Image.NEAREST)
    d = ImageDraw.Draw(sub)
    for k, b in enumerate(boxes):
        y0, x0, y1, x1 = b[0], b[1], b[2], b[3]
        if x1 < x_lo or x0 >= x_hi:
            continue
        rx0, ry0 = int((x0 - x_lo) * scale), int(y0 * scale)
        rx1, ry1 = int((x1 - x_lo) * scale), int(y1 * scale)
        d.rectangle([rx0, ry0, rx1, ry1], outline=(255, 0, 0, 255))
        d.text((rx0 + 1, max(0, ry0 - 9)), str(k), fill=(255, 255, 0, 255))
    sub.save(out)
    print(f"  montage {out}: x{x_lo}-{x_hi} scale{scale}")

if __name__ == "__main__":
    a = load_rgb()
    H, W, _ = a.shape
    g = bg_mask(a)
    print(f"sheet {W}x{H}  bg px {int(g.sum())}/{H*W} ({100*g.sum()/(H*W):.1f}%)")
    boxes = detect_boxes(a)
    print(f"detected {len(boxes)} boxes\n")
    print("idx | y0..y1   x0..x1    WxH     size  fill")
    for k, b in enumerate(boxes):
        y0, x0, y1, x1, bw, bh, sz, fill = b
        print(f"{k:4d} | y{y0:4d}-{y1:<4d} x{x0:4d}-{x1:<4d} {bw:3d}x{bh:<3d} {sz:6d} {fill:.2f}")
    if len(sys.argv) > 1 and sys.argv[1] == "montage":
        # landscape sheet -> slice by X into readable chunks
        step = 600
        for xi, xs in enumerate(range(0, W, step)):
            montage(a, boxes, xs, min(xs + step, W), f"/tmp/gwen_box_{xi}.png", scale=2.0)
