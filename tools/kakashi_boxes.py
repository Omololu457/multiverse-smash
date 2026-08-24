#!/usr/bin/env python3
# STAGE 0/1 per-box detection for the KAKASHI sheet
#   "DS _ DSi - Naruto Shippuden_ Ninja Council 4 - Playable Characters - Kakashi.png" (1054x5236 RGB)
# Single GREEN field bg (0,128,0) — every sprite is moated by green => one connected
# component of the non-green mask (same idea as Piccolo, but bg is one field not per-cell).
#
# ★HAZARD: Kakashi's Konoha flak-jacket is OLIVE (dark yellow-green). A LOOSE green key would
#   punch holes in the vest. The bg is very pure (0,128,0)±few, so a TIGHT key (sum|rgb-bg|<40)
#   grabs the field only and leaves the olive vest intact. Verified by counting.
# ★Text labels ("STANCE", "FACING RIGHT") + big title-card kanji are ALSO non-green components.
#   We filter by min-size + min-height, and print/montage everything so they can be eyeballed
#   and excluded by index. Big bust portraits (huge components) handled separately for portrait.
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = "DS _ DSi - Naruto Shippuden_ Ninja Council 4 - Playable Characters - Kakashi.png"
BG = np.array([0, 128, 0])

def load_rgb():
    return np.asarray(Image.open(SRC).convert("RGB")).astype(int)

def green_mask(a, tol=40):
    return np.abs(a - BG).sum(2) < tol

def detect_boxes(a, min_sz=350, min_w=14, min_h=22, row_bucket=48):
    """Connected non-green components -> boxes (y0,x0,y1,x1). Sorted top->bottom, left->right."""
    green = green_mask(a)
    lbl, n = ndimage.label(~green)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    bg_label = int(np.argmax(sizes)) + 1
    boxes = []
    for i in range(1, n + 1):
        if i == bg_label:
            continue
        sz = int(sizes[i - 1])
        if sz < min_sz:
            continue
        ys, xs = np.where(lbl == i)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if bw < min_w or bh < min_h:
            continue
        # fill ratio helps flag text (thin strokes = low fill) vs sprites (filled)
        fill = sz / float(bw * bh)
        boxes.append((y0, x0, y1, x1, bw, bh, sz, fill))
    boxes.sort(key=lambda b: (b[0] // row_bucket, b[1]))
    return boxes

def montage(a, boxes, y_lo, y_hi, out, scale=1.0):
    """Draw indexed boxes over the [y_lo,y_hi) slice so indices can be mapped to actions."""
    sub = Image.fromarray(a[y_lo:y_hi].astype('uint8'), "RGB").convert("RGBA")
    if scale != 1.0:
        sub = sub.resize((int(sub.width * scale), int(sub.height * scale)), Image.NEAREST)
    d = ImageDraw.Draw(sub)
    for k, b in enumerate(boxes):
        y0, x0, y1, x1 = b[0], b[1], b[2], b[3]
        if y1 < y_lo or y0 >= y_hi:
            continue
        rx0, ry0 = int(x0 * scale), int((y0 - y_lo) * scale)
        rx1, ry1 = int(x1 * scale), int((y1 - y_lo) * scale)
        d.rectangle([rx0, ry0, rx1, ry1], outline=(255, 0, 0, 255))
        d.text((rx0 + 1, max(0, ry0 - 9)), str(k), fill=(255, 255, 0, 255))
    sub.save(out)
    print(f"  montage {out}: y{y_lo}-{y_hi} scale{scale}")

if __name__ == "__main__":
    a = load_rgb()
    H, W, _ = a.shape
    g = green_mask(a)
    print(f"sheet {W}x{H}  green px {int(g.sum())}/{H*W} ({100*g.sum()/(H*W):.1f}%)")
    boxes = detect_boxes(a)
    print(f"detected {len(boxes)} boxes\n")
    print("idx | y0..y1   x0..x1    WxH     size  fill")
    for k, b in enumerate(boxes):
        y0, x0, y1, x1, bw, bh, sz, fill = b
        print(f"{k:4d} | y{y0:4d}-{y1:<4d} x{x0:4d}-{x1:<4d} {bw:3d}x{bh:<3d} {sz:6d} {fill:.2f}")
    # montage the movement region (top of sheet) in a couple of slices for readability
    if len(sys.argv) > 1 and sys.argv[1] == "montage":
        montage(a, boxes, 120, 800, "/tmp/kak_box_move_a.png", scale=1.0)
        montage(a, boxes, 800, 1600, "/tmp/kak_box_move_b.png", scale=1.0)
