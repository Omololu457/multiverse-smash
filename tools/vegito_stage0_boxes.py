#!/usr/bin/env python3
# VEGITO Ultra Instinct -Sign- : Stage-0/1 frame-box detector + overlay renderer.
# Source is a JUS labeled-band sheet on flat navy bg (#182536), JPEG (no alpha, edge fringe).
# For each measured y-band we auto-split frames by column-occupancy gaps, draw numbered
# boxes, and dump a montage so every frame pick can be visually verified before Stage-1
# reslicing. Mirrors the rigor of frieza_stage0_boxes.py / reslice_iron_man.py's xrect path.
import numpy as np
from PIL import Image, ImageDraw

SRC = "vegito_ultra_instinct__sign__v2_sprite_sheet_jus_by_xenohiro016_die4gov-fullview.jpg"
BG = np.array([24, 37, 54])
KEY_TOL = 60          # navy bg keyed generously to swallow JPEG fringe
MINGAP = 4            # >=this many empty cols => frame boundary
MINW = 6             # ignore column-runs narrower than this (stray fringe / label serifs)
MINCOLPIX = 2         # a column counts as "on" if it has >= this many content px in band

def keyed():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    return (np.abs(a - BG).sum(2) > KEY_TOL), a

def figure_subband(mask, y0, y1, x0, x1):
    """Strip label text: real figures light up the mid/right zone. Return (fy0,fy1) of the
    first contiguous figure block (drops the top label rows and any trailing next-label)."""
    fz = mask[y0:y1 + 1, max(x0, 60):x1].sum(1)   # ignore far-left label column
    on = fz > 25
    # first run of 'on' rows = the figures for this band
    ys = [i for i, v in enumerate(on) if v]
    if not ys:
        return y0, y1
    s = ys[0]
    e = s
    for i in ys[1:]:
        if i - e <= 2:
            e = i
        else:
            break
    return y0 + s, y0 + e

def frames_in_band(mask, y0, y1, x0, x1):
    """Return list of (fx0,fx1) frame column-runs inside band, split by MINGAP empty cols."""
    y0, y1 = figure_subband(mask, y0, y1, x0, x1)
    band = mask[y0:y1 + 1, x0:x1 + 1]
    colon = band.sum(0) >= MINCOLPIX
    runs = []
    x = 0
    W = colon.shape[0]
    while x < W:
        if colon[x]:
            s = x
            while x < W and colon[x]:
                x += 1
            e = x - 1
            # merge across small gaps
            if runs and s - runs[-1][1] - 1 < MINGAP:
                runs[-1] = (runs[-1][0], e)
            else:
                runs.append((s, e))
        else:
            x += 1
    runs = [(a + x0, b + x0) for (a, b) in runs if (b - a + 1) >= MINW]
    return runs, y0, y1

# Major gameplay bands (measured from horizontal projection, LEFT region). label = human note.
BANDS = [
    ("STANCE",        14,  82,   0, 780),
    ("MOVE+DASH",     91, 137,   0, 780),
    ("JUMP+GUARD",   144, 202,   0, 780),
    ("TAKINGDAMAGE", 207, 264,   0, 780),
    ("KNOCKEDOUT",   270, 341,   0, 780),
    ("ULTACTION",    361, 417,   0, 780),
    ("ATTACK1",      425, 527,   0, 780),
    ("ATTACK2",      545, 632,   0, 780),
    ("ATTACK3",      656, 757,   0, 780),
    ("ATTACK4",      778, 902,   0, 780),
    ("JUMPATTACK",   916, 977,   0, 780),
]

if __name__ == "__main__":
    mask, a = keyed()
    over = Image.open(SRC).convert("RGB")
    dr = ImageDraw.Draw(over)
    for name, by0, by1, x0, x1 in BANDS:
        runs, y0, y1 = frames_in_band(mask, by0, by1, x0, x1)
        print(f"\n{name}  figY[{y0}..{y1}]  {len(runs)} frames")
        for i, (fx0, fx1) in enumerate(runs):
            dr.rectangle([fx0, y0, fx1, y1], outline=(255, 40, 40), width=1)
            dr.text((fx0 + 1, y0 + 1), str(i), fill=(255, 255, 0))
            print(f"   [{i:2d}] x({fx0},{fx1}) w{fx1-fx0+1}")
    over.save("_vg_crops/boxes_overlay.png")
    print("\nsaved _vg_crops/boxes_overlay.png")
