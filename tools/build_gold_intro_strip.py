#!/usr/bin/env python3
"""Reslice samurai_ranger_gold_intro.png (Antonio's pre-morph Samuraizer flourish) into ONE uniform
horizontal strip for the Gold Samurai Ranger's intro animation (characters.js animationData.intro).

The source is a 3-row sheet (11 + 11 + 5 = 27 frames, ~69px tall, variable widths). Each frame is
cropped tight in X but at FULL band height (so the standing baseline stays consistent), then centered
horizontally and BOTTOM-aligned into a uniform 44×69 cell (anchorY=0 → feet on the cell bottom). Rows
are concatenated in reading order → a single 27-frame strip. Cosmetic / intro-only; zero gameplay.
"""
import os
from PIL import Image
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC  = os.path.join(ROOT, "samurai_ranger_gold_intro.png")
OUT  = os.path.join(ROOT, "samurai_ranger_gold_intro_uniform.png")
BANDS = [(7, 75), (98, 166), (181, 249)]   # measured row bands (alpha-gutter scan)
CW, CH = 44, 69

def main():
    im = Image.open(SRC).convert("RGBA")
    a = np.array(im)[:, :, 3]; W = a.shape[1]
    frames = []
    for y0, y1 in BANDS:
        colcov = (a[y0:y1+1] > 16).sum(axis=0)
        xs = [x for x in range(W) if colcov[x] > 0]
        isl = []; s = p = xs[0]
        for x in xs[1:]:
            if x <= p + 3: p = x
            else: isl.append((s, p)); s = p = x
        isl.append((s, p))
        for sx, ex in isl:
            frames.append(im.crop((sx, y0, ex + 1, y1 + 1)))   # tight-x, full band height
    strip = Image.new("RGBA", (CW * len(frames), CH), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        strip.paste(fr, (i * CW + (CW - fr.width) // 2, CH - fr.height), fr)
    strip.save(OUT)
    print(f"wrote {OUT} {strip.size} — {len(frames)} frames")

if __name__ == "__main__":
    main()
