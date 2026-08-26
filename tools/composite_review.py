#!/usr/bin/env python3
# Composite the real Electron capturePage() PNGs into labeled review sheets.
# 6 screenshots per sheet (2x3) so each stays large/legible; neutral bg + border + printed label per shot.
import json, math, os
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(REPO, "electron", "shots", "review")
MAN  = json.load(open(os.path.join(SRC, "_manifest.json")))
shots = [s for s in MAN["screens"] if s.get("file")]

SHOT_W = 860
BG      = (26, 28, 34)      # neutral dark background
CELL_BG = (16, 18, 22)
BORDER  = (90, 100, 120)
LABELBG = (34, 40, 52)
TITLEBG = (12, 14, 18)
PER     = 6
COLS    = 2
GAP     = 26
MARGIN  = 30
LABEL_H = 42
TITLE_H = 64

FBOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FREG  = "/System/Library/Fonts/Supplemental/Arial.ttf"
flabel = ImageFont.truetype(FBOLD, 24)
ftitle = ImageFont.truetype(FBOLD, 30)
fnum   = ImageFont.truetype(FBOLD, 22)

def scaled(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    sh = round(SHOT_W * h / w)
    return im.resize((SHOT_W, sh), Image.LANCZOS), sh

# uniform shot height from the first image (all are 2560x1544)
_, SHOT_H = scaled(os.path.join(SRC, shots[0]["file"]))
CELL_W = SHOT_W
CELL_H = LABEL_H + SHOT_H

nsheets = math.ceil(len(shots) / PER)
made = []
for si in range(nsheets):
    group = shots[si*PER:(si+1)*PER]
    rows = math.ceil(len(group) / COLS)
    sheet_w = MARGIN*2 + COLS*CELL_W + (COLS-1)*GAP
    sheet_h = TITLE_H + MARGIN + rows*CELL_H + (rows-1)*GAP + MARGIN
    sheet = Image.new("RGB", (sheet_w, sheet_h), BG)
    d = ImageDraw.Draw(sheet)
    # Title bar
    d.rectangle([0, 0, sheet_w, TITLE_H], fill=TITLEBG)
    title = f"MULTIVERSE SMASH — FULL-GAME SCREENSHOT REVIEW  (sheet {si+1}/{nsheets})   ·   real Electron app capture"
    d.text((MARGIN, TITLE_H//2), title, font=ftitle, fill=(220, 230, 245), anchor="lm")
    for i, s in enumerate(group):
        r, c = divmod(i, COLS)
        x = MARGIN + c*(CELL_W + GAP)
        y = TITLE_H + MARGIN + r*(CELL_H + GAP)
        # cell bg + border
        d.rectangle([x-2, y-2, x+CELL_W+1, y+CELL_H+1], fill=CELL_BG, outline=BORDER, width=2)
        # label bar
        d.rectangle([x, y, x+CELL_W, y+LABEL_H], fill=LABELBG)
        d.text((x+12, y+LABEL_H//2), f"{s['n']:02d}", font=fnum, fill=(120, 200, 255), anchor="lm")
        d.text((x+52, y+LABEL_H//2), s["label"], font=flabel, fill=(238, 244, 255), anchor="lm")
        # shot
        im, _ = scaled(os.path.join(SRC, s["file"]))
        sheet.paste(im, (x, y+LABEL_H))
    out = os.path.join(REPO, f"SCREENSHOT_REVIEW_{si+1}.png")
    sheet.save(out)
    made.append((out, [g["label"] for g in group]))
    print(f"WROTE {out}  ({sheet_w}x{sheet_h})  {len(group)} shots")

print("\nSHEET CONTENTS:")
for out, labels in made:
    print(" ", os.path.basename(out))
    for l in labels: print("     -", l)
