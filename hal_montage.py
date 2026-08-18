#!/usr/bin/env python3
"""Build labeled contact-sheet montages of hal_sprite_###.png frames for Stage-0 visual audit.
Each frame is padded onto a fixed cell on a magenta background with its index drawn above it.
Outputs hal_contact_NN.png sheets into ./hal_contact/ ."""
import os
from PIL import Image, ImageDraw, ImageFont

SRC = "."
OUT = "hal_contact"
os.makedirs(OUT, exist_ok=True)

CELL_W, CELL_H = 150, 168   # frame area
LABEL_H = 16
COLS, ROWS = 8, 6           # 48 frames per sheet
PER = COLS * ROWS
BG = (255, 0, 255)          # magenta so silhouette + transparent edges read clearly
CELLBG = (40, 40, 48)
N = 624

try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
except Exception:
    font = ImageFont.load_default()

def frame_path(n):
    return os.path.join(SRC, f"hal_sprite_{n:03d}.png")

sheets = (N + PER - 1) // PER
for s in range(sheets):
    sheet_w = COLS * CELL_W
    sheet_h = ROWS * (CELL_H + LABEL_H)
    sheet = Image.new("RGB", (sheet_w, sheet_h), BG)
    draw = ImageDraw.Draw(sheet)
    for i in range(PER):
        idx = s * PER + i + 1
        if idx > N:
            break
        col = i % COLS
        row = i // COLS
        x0 = col * CELL_W
        y0 = row * (CELL_H + LABEL_H)
        # label band
        draw.rectangle([x0, y0, x0 + CELL_W - 1, y0 + LABEL_H - 1], fill=(0, 0, 0))
        p = frame_path(idx)
        dims = ""
        try:
            im = Image.open(p).convert("RGBA")
            dims = f"{im.width}x{im.height}"
            # scale to fit cell preserving aspect
            scale = min((CELL_W - 6) / im.width, (CELL_H - 6) / im.height, 1.0)
            nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
            im = im.resize((nw, nh))
            cell = Image.new("RGBA", (CELL_W, CELL_H), CELLBG + (255,))
            cell.paste(im, ((CELL_W - nw) // 2, (CELL_H - nh) // 2 + LABEL_H // 2), im)
            sheet.paste(cell.convert("RGB"), (x0, y0 + LABEL_H))
        except Exception as e:
            draw.rectangle([x0, y0 + LABEL_H, x0 + CELL_W - 1, y0 + LABEL_H + CELL_H - 1], fill=(90, 20, 20))
        draw.text((x0 + 3, y0 + 1), f"{idx:03d} {dims}", fill=(255, 255, 0), font=font)
    lo = s * PER + 1
    hi = min(N, (s + 1) * PER)
    outp = os.path.join(OUT, f"hal_contact_{s+1:02d}_{lo:03d}-{hi:03d}.png")
    sheet.save(outp)
    print("wrote", outp, sheet.size)
print("done", sheets, "sheets")
