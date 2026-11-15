#!/usr/bin/env python3
"""docs/megumi/asset_comparison.png — original crop | cleaned (checker) | cleaned x3 nearest-neighbour (presentation only)."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
from clean import clean
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/megumi_fushiguro/source/megumi_fushiguro_jus_by_xxniiroxx_dehd6g3-fullview.jpg'
R = json.load(open(ROOT / 'docs/megumi/source_rects.json'))['frames']
PICK = [('idle (stance0)', 'stance0'), ('attack (weakB7, sword arc)', 'weakB7'), ('Divine Dog (dogWhite2)', 'dogWhite2'),
        ('Nue (nue5, lightning)', 'nue5'), ('large summon (elephant7, water)', 'elephant7'), ('shadow effect (domain6)', 'domain6')]
a = np.asarray(Image.open(SRC).convert('RGB')); rgba, _ = clean(a)
def checker(w, h, s=8):
    c = Image.new('RGBA', (w, h), (200, 200, 205, 255)); d = ImageDraw.Draw(c)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2: d.rectangle([x, y, x + s - 1, y + s - 1], fill=(150, 150, 160, 255))
    return c
rows = []
for label, k in PICK:
    x, y, w, h = R[k]['rect']; x0, y0 = max(0, x - 3), max(0, y - 3); x1, y1 = x + w + 3, y + h + 3
    o = Image.fromarray(a[y0:y1, x0:x1]).convert('RGBA'); c = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    cc = checker(*c.size); cc.alpha_composite(c)
    z = 3 if w < 300 else 1
    big = c.resize((c.width * z, c.height * z), Image.NEAREST); bb = checker(*big.size, 12); bb.alpha_composite(big)
    rows.append((label + f'  [{w}x{h} px source; right = x{z} nearest]', o, cc, bb))
W = max(r[1].width + r[2].width + r[3].width + 40 for r in rows); H = sum(max(r[3].height, r[1].height) + 26 for r in rows) + 30
out = Image.new('RGB', (W, H), (28, 30, 38)); d = ImageDraw.Draw(out)
d.text((8, 8), 'Megumi asset check: ORIGINAL crop | CLEANED (1x, checker) | CLEANED enlarged (nearest; scaling is presentation, not recovered detail)', fill='white')
yy = 30
for label, o, c, b in rows:
    d.text((8, yy), label, fill=(255, 220, 120)); yy += 14; xx = 8
    for im in (o, c, b): out.paste(im.convert('RGB'), (xx, yy)); xx += im.width + 12
    yy += max(b.height, o.height) + 12
out.save(ROOT / 'docs/megumi/asset_comparison.png'); print(out.size)
