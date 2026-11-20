#!/usr/bin/env python3
"""tools/bloodmap/preview.py — quick anchor debug montage (offline; the real contact sheets use the runtime painter).
   python3 tools/bloodmap/preview.py out.png key1 key2 ...   (key frames: idle, walk, light/heavy, hurt, jump, knockdown)"""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
COL = {'head': (255, 60, 60), 'torso': (255, 200, 0), 'arm': (0, 200, 255), 'leg': (120, 255, 80)}
REG = ['head'] * 4 + ['torso'] * 3 + ['arm'] * 3 + ['leg'] * 2
WANT = ['idle', 'walk', 'light', 'heavy', 'hurt', 'jump', 'knockdown']
def tiles(key, S=3):
    m = json.load(open(f'{ROOT}/data/bloodmaps/{key}.json'))
    out = []
    for act in WANT:
        k = next((v for a, v in m['byAction'].items() if a.split('|')[0] == act), None)
        if not k: continue
        sheet, sx, sy, w, h, n = k.split('|'); sx, sy, w, h, n = map(int, (sx, sy, w, h, n))
        ids = m['index'][k]; i = min(len(ids) - 1, n // 2)
        if ids[i] < 0: continue
        im = Image.open(f'{ROOT}/{sheet}').convert('RGBA').crop((sx + i * w, sy, sx + i * w + w, sy + h))
        fm = m['frames'][ids[i]]
        big = Image.new('RGBA', (w * S, h * S), (40, 44, 52, 255)); big.alpha_composite(im.resize((w * S, h * S), Image.NEAREST))
        d = ImageDraw.Draw(big)
        e = fm['e']
        if e[0] >= 0: d.rectangle([e[0] * S, e[1] * S, (e[2] + 1) * S, (e[3] + 1) * S], outline=(255, 255, 255))
        for j in range(12):
            x, y = fm['a'][j * 3], fm['a'][j * 3 + 1]
            if x < 0: continue
            px, py = x, y
            for c in fm['p'][j]:
                dx, dy = {'d': (0, 1), 'a': (-1, 1), 'b': (1, 1), 'l': (-1, 0), 'r': (1, 0)}[c.lower()]
                px += dx; py += dy; d.rectangle([px * S, py * S, px * S + S - 1, py * S + S - 1], fill=COL[REG[j]] + (110,))
            d.rectangle([x * S - 2, y * S - 2, x * S + S + 1, y * S + S + 1], fill=COL[REG[j]])
        d.text((2, 2), f'{key}:{act}', fill=(255, 255, 255))
        out.append(big)
    return out
rows = [tiles(k) for k in sys.argv[2:]]
W = max(sum(t.width for t in r) for r in rows if r); H = sum(max(t.height for t in r) for r in rows if r)
sheet = Image.new('RGBA', (W, H), (20, 20, 24, 255)); y = 0
for r in rows:
    if not r: continue
    x = 0
    for t in r: sheet.paste(t, (x, y)); x += t.width
    y += max(t.height for t in r)
sheet.save(sys.argv[1])
