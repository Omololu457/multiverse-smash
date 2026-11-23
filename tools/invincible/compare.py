#!/usr/bin/env python3
"""MSV1-INVINCIBLE — docs/msv1/invincible/compare.png: every body strip and fx strip from the slicer, x3 nearest, on a
checkerboard (so keyed pixels show), each labelled; the original sheet crop of every used frame on the right of its strip
is not repeated — the strips ARE the sheet pixels (slice_report.json lists the source box of each cell)."""
import json, os
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
rep = json.load(open(os.path.join(ROOT, 'docs/msv1/invincible/slice_report.json')))
items = [(k, f'assets/invincible/{k}.png') for k in rep['anims']] + [('fx/' + k, f'assets/invincible/fx/{k}.png') for k in rep['fx']]
S = 3; pad = 6; rows = []
for name, p in items:
    im = Image.open(os.path.join(ROOT, p)).convert('RGBA'); rows.append((name, im.resize((im.width * S, im.height * S), Image.NEAREST)))
W = max(140 + r.width for _, r in rows) + pad
cols = 2; colw = W
heights = [r.height + pad for _, r in rows]
half = (len(rows) + 1) // 2
H = max(sum(heights[:half]), sum(heights[half:])) + pad
out = Image.new('RGBA', (colw * cols, H), (60, 60, 70, 255))
chk = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(chk); d.rectangle((0, 0, 7, 7), (90, 200, 90, 255)); d.rectangle((8, 8, 15, 15), (90, 200, 90, 255)); d.rectangle((8, 0, 15, 7), (200, 90, 200, 255)); d.rectangle((0, 8, 7, 15), (200, 90, 200, 255))
dr = ImageDraw.Draw(out); y = [pad, pad]
for i, (name, r) in enumerate(rows):
    c = 0 if i < half else 1; x0 = c * colw + 140
    bg = Image.new('RGBA', r.size)
    for yy in range(0, r.height, 16):
        for xx in range(0, r.width, 16): bg.paste(chk, (xx, yy))
    bg.alpha_composite(r); out.paste(bg, (x0, y[c]))
    dr.text((c * colw + 6, y[c] + 4), name, fill=(255, 255, 255, 255))
    y[c] += r.height + pad
out.save(os.path.join(ROOT, 'docs/msv1/invincible/compare.png'))
print(out.size)
