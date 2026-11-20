#!/usr/bin/env python3
"""tools/bloodmap/montage.py out.png key1 key2 ... — stack contact sheets 2 per row for review."""
import sys, os
from PIL import Image
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ims = [Image.open(f'{R}/docs/msv1/blood/sheets/{k}.png').convert('RGB') for k in sys.argv[2:] if os.path.exists(f'{R}/docs/msv1/blood/sheets/{k}.png')]
CW = 1000
ims = [im.resize((CW, int(im.height * CW / im.width)), Image.NEAREST) if im.width > CW else im for im in ims]
rows = [ims[i:i + 2] for i in range(0, len(ims), 2)]
H = sum(max(i.height for i in r) for r in rows)
o = Image.new('RGB', (CW * 2 + 10, H + 5 * len(rows)), (8, 8, 10)); y = 0
for r in rows:
    x = 0
    for i in r: o.paste(i, (x, y)); x += CW + 10
    y += max(i.height for i in r) + 5
o.save(sys.argv[1]); print(o.size)
