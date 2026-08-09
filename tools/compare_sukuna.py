#!/usr/bin/env python3
# Build a before/after comparison montage for the Sukuna alpha repair. For each chosen frame it shows 3
# tiles at 6x (nearest): (1) BEFORE with enclosed holes flagged magenta, (2) BEFORE composited on a
# checkerboard (holes read as see-through squares), (3) AFTER composited on the same checkerboard (solid).
# BEFORE frames read from /tmp/sukuna_before, AFTER from the repaired working copies.
from collections import deque
from PIL import Image, ImageDraw, ImageFont

SCALE = 6
BG = "/tmp/sukuna_before"

# (sheet, frame_width, frame_index, label)
PICKS = [
    ("sukuna_idle_sheet.png", 27, 1, "idle f1"),
    ("sukuna_attack_sheet.png", 51, 1, "attack f1"),
    ("sukuna_ultimate_sheet.png", 37, 2, "ultimate f2"),
    ("sukuna_domain_sheet.png", 36, 0, "domain f0"),
    ("sukuna_firearrow_fire_sheet.png", 59, 3, "flame-arrow f3"),
]

def enclosed(im):
    w, h = im.size; px = im.load()
    tr = [[px[x, y][3] <= 16 for x in range(w)] for y in range(h)]
    out = [[False] * w for _ in range(h)]; dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if tr[y][x] and not out[y][x]: out[y][x] = True; dq.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if tr[y][x] and not out[y][x]: out[y][x] = True; dq.append((x, y))
    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and tr[ny][nx] and not out[ny][nx]:
                out[ny][nx] = True; dq.append((nx, ny))
    return {(x, y) for y in range(h) for x in range(w) if tr[y][x] and not out[y][x]}

def checker(w, h, s=4):
    im = Image.new("RGBA", (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            c = 210 if ((x // s + y // s) % 2 == 0) else 150
            px[x, y] = (c, c, c, 255)
    return im

def crop(sheet_path, fw, fi):
    im = Image.open(sheet_path).convert("RGBA")
    h = im.size[1]
    return im.crop((fi * fw, 0, fi * fw + fw, h))

def flagged(frame):
    holes = enclosed(frame)
    out = frame.copy(); px = out.load()
    for (x, y) in holes:
        px[x, y] = (255, 0, 255, 255)
    return out, len(holes)

def up(im):
    return im.resize((im.size[0] * SCALE, im.size[1] * SCALE), Image.NEAREST)

def on_bg(frame):
    bg = checker(*frame.size)
    bg.alpha_composite(frame)
    return bg

tiles = []
maxh = 0
for sheet, fw, fi, label in PICKS:
    before = crop(f"{BG}/{sheet}", fw, fi)
    after = crop(sheet, fw, fi)
    flg, n = flagged(before)
    row = [up(flg), up(on_bg(before)), up(on_bg(after))]
    tiles.append((label, n, row))
    maxh = max(maxh, row[0].size[1])

pad = 14
label_h = 22
col_titles = ["BEFORE (holes = magenta)", "BEFORE (on checker)", "AFTER (repaired)"]
tile_w = max(t[2][0].size[0] for t in tiles)
cols = 3
grid_w = pad + cols * (tile_w + pad)
row_h = maxh + label_h + pad
grid_h = pad + label_h + len(tiles) * row_h
canvas = Image.new("RGBA", (grid_w, grid_h), (24, 26, 34, 255))
d = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
except Exception:
    font = ImageFont.load_default()

for c, ct in enumerate(col_titles):
    d.text((pad + c * (tile_w + pad), 4), ct, fill=(230, 230, 240, 255), font=font)

y = pad + label_h
for label, n, row in tiles:
    d.text((pad, y - 2), f"{label}   ({n} hole px before)", fill=(255, 210, 120, 255), font=font)
    for c, tile in enumerate(row):
        canvas.alpha_composite(tile, (pad + c * (tile_w + pad), y + label_h))
    y += row_h

out = "harness/shots/sukuna_alpha_before_after.png"
canvas.convert("RGB").save(out)
print("wrote", out, canvas.size)
