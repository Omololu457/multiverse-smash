#!/usr/bin/env python3
# STAGE 0 box detection for SUPERMAN (Fighter) — the labeled B/Y/X custom sheet
# `dcna8ch-42870664-caf4-4f98-a06d-72a3680e98dc.png` (1800x3160, RGBA but FULLY
# OPAQUE on a solid GREY field #727272 (114,114,114)). Red row-LABELS sit at the
# far left of each row; some moves have red/blue/white FX (heat-vision beam, frost
# breath, X+Up explosion, combo red beams) that can bridge frames — so we detect
# by ROW-BAND (horizontal projection) then split each band by x-gaps, and drop the
# left label strip.
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

SRC = "dcna8ch-42870664-caf4-4f98-a06d-72a3680e98dc.png"
LABEL_X = 200   # red row-label text lives left of this
rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W, _ = rgb.shape
grey = (np.abs(rgb - 114).max(2) < 28)
content = ~grey

# ── row bands (profile the non-grey pixels per scanline, ignoring the label column) ──
rowsum = content[:, LABEL_X:].sum(1)
th = max(30, rowsum.max() // 40)
bands = []; inb = False; y0 = 0
for y in range(H):
    if rowsum[y] > th and not inb: y0 = y; inb = True
    elif rowsum[y] <= th and inb: bands.append((y0, y - 1)); inb = False
if inb: bands.append((y0, H - 1))
bands = [(a, b) for a, b in bands if b - a >= 18]

# ── within each band, split into frames by columns that have content (x-gap segmentation) ──
def split_row(a, b):
    sub = content[a:b + 1, :]
    colsum = sub.sum(0)
    segs = []; ins = False; x0 = 0
    for x in range(LABEL_X, W):          # skip the label column
        if colsum[x] > 2 and not ins: x0 = x; ins = True
        elif colsum[x] <= 2 and ins:
            if x - x0 >= 12: segs.append((x0, x - 1))
            ins = False
    if ins and W - x0 >= 12: segs.append((x0, W - 1))
    # tighten each seg vertically to its own content
    out = []
    for (sx0, sx1) in segs:
        ys, xs = np.where(content[a:b + 1, sx0:sx1 + 1])
        if len(ys) < 60: continue
        out.append((a + ys.min(), sx0 + xs.min(), a + ys.max(), sx0 + xs.max()))
    return out

boxes = []
row_index = []
for ri, (a, b) in enumerate(bands):
    segs = split_row(a, b)
    for s in segs:
        row_index.append(ri); boxes.append(s)

if __name__ == "__main__":
    print(f"{len(bands)} row-bands, {len(boxes)} frames total")
    for ri, (a, b) in enumerate(bands):
        segs = [k for k, r in enumerate(row_index) if r == ri]
        print(f" band{ri:2d} y{a:4d}-{b:<4d}: {len(segs)} frames  (idx {segs[0] if segs else '-'}..{segs[-1] if segs else '-'})")

    # annotated montage (grey→dark for visibility) + indices
    disp = Image.open(SRC).convert("RGB")
    px = np.asarray(disp).copy(); px[grey] = (30, 30, 38); disp = Image.fromarray(px.astype("uint8"))
    d = ImageDraw.Draw(disp)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 20)
    except Exception: font = ImageFont.load_default()
    for k, (y0, x0, y1, x1) in enumerate(boxes):
        d.rectangle([x0, y0, x1, y1], outline=(255, 220, 0), width=1)
        d.text((x0 + 1, max(0, y0 - 19)), str(k), fill=(0, 255, 180), font=font)
    disp.save("/tmp/fighter_annot.png")
    s = 1500 / H
    for i in range(0, H, 1050):
        disp.crop((0, i, W, min(H, i + 1050))).resize((int(W * 1400 / H), int((min(H, i + 1050) - i) * 1400 / H))).save(f"/tmp/fighter_band{i//1050}.png")
    print("annotated -> /tmp/fighter_annot.png + /tmp/fighter_band*.png")
