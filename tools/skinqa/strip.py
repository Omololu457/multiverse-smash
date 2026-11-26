#!/usr/bin/env python3
"""strip.py allskins.json KEY SKINID ACTION out.png — default vs skin, every frame of one action (×3)."""
import json, sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__)); from frames import load, cells
d = json.load(open(sys.argv[1])); k, sid, a = sys.argv[2:5]; v = d[k]; b = v['base'][a]
sk = next(s for s in v['skins'] if s['id'] == sid)
B = load(b['sheet']); Sk = load(sk['anim'][a])
rows = []
for arr in (B, Sk):
    fr = [Image.fromarray(arr[sl]) for _, sl in cells(B, b)]
    W = sum(f.width for f in fr); H = max(f.height for f in fr); im = Image.new('RGBA', (W, H), (60, 62, 72, 255)); x = 0
    for f in fr: im.alpha_composite(f, (x, 0)); x += f.width
    rows.append(im)
out = Image.new('RGBA', (rows[0].width, rows[0].height * 2 + 4), (20, 20, 20, 255)); out.alpha_composite(rows[0], (0, 0)); out.alpha_composite(rows[1], (0, rows[0].height + 4))
sc = max(1, min(3, 1400 // max(1, out.width))); out.resize((out.width * sc, out.height * sc), Image.NEAREST).save(sys.argv[5])
