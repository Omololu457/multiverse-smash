#!/usr/bin/env python3
"""Tile named uniform strips vertically on magenta, labelled, for QA. Usage: montage.py out.png file1 file2 ..."""
import sys
from PIL import Image, ImageDraw

files = sys.argv[2:]
SCALE = 2
PADX, PADY, LBL = 6, 22, 150
rows = []
for f in files:
    try:
        im = Image.open(f).convert("RGBA")
    except Exception as e:
        print("skip", f, e); continue
    im = im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST)
    rows.append((f, im))
W = LBL + max((im.width for _, im in rows), default=100) + PADX * 2
H = sum(im.height + PADY for _, im in rows) + PADY
canvas = Image.new("RGB", (W, H), (255, 0, 255))
d = ImageDraw.Draw(canvas)
y = PADY
for f, im in rows:
    d.text((4, y + im.height // 2), f.replace("kakashi_war_", "").replace("_uniform.png", ""), fill=(0, 0, 0))
    # frame separators
    canvas.paste(im, (LBL, y), im)
    d.text((4, y), f"{im.width//SCALE}x{im.height//SCALE}", fill=(255, 255, 0))
    y += im.height + PADY
canvas.save(sys.argv[1])
print("saved", sys.argv[1], canvas.size)
