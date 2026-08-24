#!/usr/bin/env python3
# STAGE 0 per-box / per-row detection for the VILGAX sheet
#   vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3-fullview.jpeg
#   1024x2474 JPEG (RGB, NO alpha) — fan-made JUS-style sheet, credit: regulardor8go.
#   Same category/label TEMPLATE as Superman 2 (dcna8ch...) + Gwen Tennyson (shared
#   B/Y/X naming, "Koma Atakes" ult label) — but built fully standalone, no cross-borrow.
#
# Background is a FLAT bright-orange JUS field (255,127,38). JPEG => the key needs a
# tolerance (|Δrgb| sum < 50 is clean: the 5 empty rows measure exactly 0 sprite px).
# Red label bars (241,26,44) sit at the far LEFT of every populated row; each row's
# frames run to the right of the label. Two 3D renders (top-right standing figure,
# mid-right sword-raised figure) and two show screenshots (inside the Koma Atakes band)
# are NON-GAMEPLAY reference art — excluded from the runtime atlas.
import sys
import numpy as np
from PIL import Image, ImageDraw

SRC = "vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3-fullview.jpeg"
BG = np.array([255, 127, 38])          # orange field
REDLBL = np.array([241, 26, 44])       # label-bar red

# Label bands read directly off the sheet (red-text row detector, verified by eye).
# (name, y_top) — each row spans y_top .. next y_top.
LABELS = [
    ("INTRO",             41),
    ("STANCE",            79),
    ("RUN",              152),
    ("JUMP",             238),
    ("GUARD",            331),
    ("ULTIMATE_ACTION",  412),   # NOT in the build prompt — 3f green-energy charge pose
    ("B",               499),
    ("FORWARD+B",        577),
    ("UP+B",             661),
    ("DOWN+B",           823),   # EMPTY
    ("AERIAL_B",         888),
    ("Y",               968),    # EMPTY
    ("FORWARD+Y",       1101),
    ("UP+Y",            1190),    # EMPTY
    ("DOWN+Y",          1283),
    ("AERIAL_Y",        1368),
    ("X",               1454),
    ("X+UP",            1534),    # EMPTY
    ("KOMA_ATAKES",     1678),    # ULT (+ 2 embedded screenshots on the left of this band)
    ("HURT_FALL_GETUP", 2058),
    ("WIN",             2146),
    ("LOSE",            2237),    # EMPTY
]

def load_rgb():
    return np.asarray(Image.open(SRC).convert("RGB")).astype(int)

def bg_mask(a, tol=50):
    return np.abs(a - BG).sum(2) < tol

def red_mask(a, tol=60):
    return np.abs(a - REDLBL).sum(2) < tol

def row_report(a):
    H, W, _ = a.shape
    ys = [l[1] for l in LABELS] + [H]
    print(f"sheet {W}x{H}  bg={100*bg_mask(a).sum()/(H*W):.1f}% orange")
    print("\nrow                 y0..y1    sprite_px  x0..x1   verdict")
    for i, (name, y0) in enumerate(LABELS):
        y1 = ys[i + 1]
        reg = a[y0:y1]
        bg = bg_mask(reg)
        red = red_mask(reg)          # drop the red label bar
        black = reg.sum(2) < 120     # drop black frame separators / label outline
        sprite = (~bg) & (~red) & (~black)
        # ignore the far-left label column entirely (x<155) so label text never counts
        sprite[:, :155] = False
        cnt = int(sprite.sum())
        cols = np.where(sprite.any(0))[0]
        xr = f"{cols.min()}-{cols.max()}" if len(cols) else "--"
        verdict = "EMPTY" if cnt < 40 else ""
        print(f"{name:18s} y{y0:4d}-{y1:<4d} {cnt:8d}   {xr:9s} {verdict}")

def montage(a, out_prefix):
    # per-row 2x montage strips for eyeballing frames
    H, W, _ = a.shape
    ys = [l[1] for l in LABELS] + [H]
    for i, (name, y0) in enumerate(LABELS):
        y1 = ys[i + 1]
        sub = Image.fromarray(a[y0:y1].astype("uint8"), "RGB")
        sub = sub.resize((W, (y1 - y0) * 2), Image.LANCZOS)
        sub.save(f"{out_prefix}_{i:02d}_{name}.png")
    print(f"wrote {len(LABELS)} row strips to {out_prefix}_*")

if __name__ == "__main__":
    a = load_rgb()
    row_report(a)
    if len(sys.argv) > 1 and sys.argv[1] == "montage":
        montage(a, "/tmp/vilgax_row")
