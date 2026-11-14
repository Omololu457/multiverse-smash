#!/usr/bin/env python3
"""Eye-anchor check: draws a box at every per-frame eye anchor (zoomed head crops) so a wrong laser origin is obvious.
    python3 tools/eye_anchor_check.py supermanEyeAnchors.js superman SUPERMAN_EYES out.png
    python3 tools/eye_anchor_check.py homelanderEyeAnchors.js homelander HOMELANDER_EYES out.png
"""
import re, sys, os
from PIL import Image, ImageDraw
js, prefix, table, out = sys.argv[1:5]
src = open(js).read()
body = re.search(table + r' = \{(.*?)\n\}', src, re.S).group(1)
cells = []
for name, arr in re.findall(r'(\w+):\s*(\[\[.*?\]\])', body):
    pts = [tuple(map(float, p)) for p in re.findall(r'\[([\d.]+),\s*([\d.]+)\]', arr)]
    fn = f'{prefix}_{name}_uniform.png'
    im = Image.open(fn).convert('RGBA'); W, H = im.size; n = len(pts); cw = W // n
    for i, (ex, ey) in enumerate(pts):
        x, y = ex * cw + i * cw, ey * H; R = 26; Z = 5
        c = im.crop((int(x - R), int(y - R), int(x + R), int(y + R))).resize((2 * R * Z, 2 * R * Z), Image.NEAREST)
        bg = Image.new('RGBA', c.size, (60, 60, 72, 255)); bg.alpha_composite(c)
        d = ImageDraw.Draw(bg); m = R * Z
        d.rectangle([m - 8, m - 8, m + 8, m + 8], outline=(0, 255, 0, 255), width=2)
        d.rectangle([0, 0, 120, 14], fill=(0, 0, 0, 255)); d.text((3, 1), f'{name}[{i}]', fill=(255, 255, 0, 255))
        cells.append(bg)
cols = 8; s = cells[0].width
mon = Image.new('RGBA', (s * cols, s * ((len(cells) + cols - 1) // cols)), (20, 20, 20, 255))
for k, c in enumerate(cells): mon.paste(c, ((k % cols) * s, (k // cols) * s))
mon.save(out); print(len(cells))
