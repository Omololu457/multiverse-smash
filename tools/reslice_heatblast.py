#!/usr/bin/env python3
# Re-slice HEATBLAST (Dragonrod sheet, green bg #9AB87E) into clean feet-aligned uniform strips.
# Same CC-box scheme as reslice_bardock.py: green-key (+ white credit box), label opaque islands,
# order by (y//BAND, x), pick indices. Emits ben10_heatblast_<action>_uniform.png.
# Run:  python3 tools/reslice_heatblast.py            (writes strips)
#       python3 tools/reslice_heatblast.py verify     (writes a labeled montage of the OUTPUT strips)
import sys, numpy as np
from PIL import Image
from scipy import ndimage

SRC = "heatblast_sprite_sheet_by_dragonrod_by_dragonrod342_d7yh7km.png"
BAND = 48
ALPHA = 16

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    green = (np.abs(a - np.array([154, 184, 126])).sum(2) < 70)
    white = (a.sum(2) > 710)   # the white credit box
    bg = green | white
    alpha = np.where(bg, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA"), bg

def boxes_of(bg):
    lbl, n = ndimage.label(~bg)
    bxs = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(ys) < 120:
            continue
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1 - x0) < 10 or (y1 - y0) < 10:
            continue
        bxs.append((y0, x0, y1, x1))
    bxs.sort(key=lambda b: (b[0] // BAND, b[1]))
    return bxs

FLIP_H = False   # Dragonrod Heatblast faces RIGHT already
def reslice(im, boxes, out, picks, pad=1):
    frames = [boxes[p] for p in picks]
    cells = []
    for (y0, x0, y1, x1) in frames:
        c = im.crop((x0, y0, x1 + 1, y1 + 1))
        if FLIP_H: c = c.transpose(Image.FLIP_LEFT_RIGHT)
        cells.append(c)
    uW = max(c.width for c in cells) + 2 * pad
    uH = max(c.height for c in cells) + 2 * pad
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - pad), c)
    strip.save(out)
    print(f"OK {out}: {len(cells)}f cell {uW}x{uH}")
    return len(cells), uW, uH

# Frame picks (from the indexed montage harness/shots/s3_heatblast_idx.png).
PICKS = {
    "idle":   [0, 1, 2, 3],
    "walk":   [16, 17, 18, 19, 20, 21],
    "jump":   [5, 6],
    "fall":   [9, 10],
    "crouch": [12, 13],
    "light":  [33, 34, 35],       # attack1 punch windup->extend
    "heavy":  [54, 55, 56, 57],   # attack2 flame dash
    "up":     [61, 62, 63],       # attack3 flare/rise
    "air":    [36, 37, 38],       # aerial swipe
    "fire":   [44, 45, 48, 49],   # attack1 fireball throw (cast pose)
}

def main():
    im, bg = load()
    boxes = boxes_of(bg)
    print(f"detected {len(boxes)} boxes")
    for act, picks in PICKS.items():
        picks = [p for p in picks if p < len(boxes)]
        reslice(im, boxes, f"ben10_heatblast_{act}_uniform.png", picks)

def verify():
    from PIL import ImageDraw, ImageFont
    acts = list(PICKS.keys())
    tiles = []
    for act in acts:
        im = Image.open(f"ben10_heatblast_{act}_uniform.png").convert("RGBA")
        tiles.append((act, im))
    cw = 200; ch = 90
    mont = Image.new("RGBA", (cw, ch * len(tiles)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (act, im) in enumerate(tiles):
        sc = min(cw / im.width, (ch - 14) / im.height, 1.6)
        r = im.resize((int(im.width * sc), int(im.height * sc)), Image.NEAREST)
        mont.alpha_composite(r, (2, i * ch + 14))
        d.text((2, i * ch + 1), f"{act}  ({im.width}x{im.height})", fill=(255, 230, 80, 255), font=font)
    mont.convert("RGB").save("harness/shots/s3_heatblast_verify.png")
    print("wrote harness/shots/s3_heatblast_verify.png")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "verify": verify()
    else: main()
