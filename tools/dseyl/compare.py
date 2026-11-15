#!/usr/bin/env python3
"""docs/dseyl/compare.png — Syndrome's original frames (left) beside Dseyl's edited frames (right). Game sprites only."""
from pathlib import Path
import sys
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
ROWS = [('idle', 'idle'), ('walk', 'walk'), ('cmdLight', 'attack'), ('cmdHeavy', 'attack (heavy)'), ('doubleJump', 'flight'),
        ('jump', 'jump / flight'), ('hurt', 'hurt'), ('knockdown', 'KO'), ('lose', 'KO / lose')]
rows = sys.argv[1:] and [(r, r) for r in sys.argv[1:]] or ROWS
S, CELL, PAD = 3, 75, 6
BG = (46, 58, 72, 255)
out_path = ROOT / 'docs/dseyl' / ('compare.png' if not sys.argv[1:] else 'compare_extra.png')
imgs = []
for nm, label in rows:
    a = Image.open(ROOT / f'assets/syndrome/{nm}.png').convert('RGBA'); b = Image.open(ROOT / f'assets/dseyl/{nm}.png').convert('RGBA')
    imgs.append((label, nm, a, b))
maxw = max(i[2].width for i in imgs)
W = 2 * maxw * S + 3 * PAD + 120
Hh = sum(i[2].height * S + PAD for i in imgs) + PAD + 24
sheet = Image.new('RGBA', (W, Hh), BG); d = ImageDraw.Draw(sheet)
d.text((120 + PAD, 4), 'SYNDROME (original)', fill=(255, 255, 255, 255)); d.text((120 + 2 * PAD + maxw * S, 4), 'DSEYL (edited)', fill=(255, 255, 255, 255))
y = 24
for label, nm, a, b in imgs:
    d.text((4, y + 8), f'{label}\n{nm}.png', fill=(230, 230, 230, 255))
    for k, im in enumerate((a, b)):
        big = im.resize((im.width * S, im.height * S), Image.NEAREST)
        x = 120 + PAD + k * (maxw * S + PAD)
        sheet.alpha_composite(big, (x, y))
        for c in range(1, im.width // CELL): d.line([(x + c * CELL * S, y), (x + c * CELL * S, y + im.height * S)], fill=(80, 90, 105, 255))
    y += a.height * S + PAD
sheet.save(out_path)
print(out_path)
