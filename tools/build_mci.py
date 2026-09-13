#!/usr/bin/env python3
# Build Spider-Man (Marvel Cosmic Invasion) — rosterKey "spiderman_mci" — from the fan sheet
# spiderman/spider_man_marvel_cosmic_invasion_sprite_sheet_by_zaidelproplayer_dkoutch.png
# (art by "ZaidelProPlayer" — CREDIT REQUIRED; classic red/blue, modern pixel art). The source ALREADY
# has a clean transparent (alpha) background — NO keying needed. It is densely/irregularly packed with NO
# grid, so automatic slicing (bands / connected-components / dilation / union-merge) all pull in neighbor
# poses. Instead, a visual-QA pass hand-picked EXACT tight rectangles around cleanly-ISOLATED whole poses
# (each verified as one complete body, no neighbor fragments). We crop those exact rects → feet-aligned
# uniform cells (mci_*_uniform.png). MINIMAL-but-real (movement + core normals). NO specials / ultimate.
# HONEST GAPS: only ONE clean neutral stance (idle single-frame, no breathing loop); no clean true-fall/air
# spread pose (fall = crouched landing poses; air-attack reuses light; down_air reuses the kick; no clean
# knockdown → hurt reuses a crouched pose); win/taunt/intro reuse idle. Locomotion uses the run strides.
from PIL import Image

SRC = "spiderman/spider_man_marvel_cosmic_invasion_sprite_sheet_by_zaidelproplayer_dkoutch.png"

# Verified isolated-pose rects [x0,y0,x1,y1] (x1,y1 EXCLUSIVE) in source pixel coords.
RECTS = {
    "idle":  [[272, 438, 356, 499]],
    "walk":  [[418, 105, 508, 173], [317, 164, 416, 236], [0, 245, 98, 312], [360, 639, 432, 699]],  # run stride
    "jump":  [[454, 361, 535, 455]],
    "fall":  [[289, 509, 362, 573], [0, 572, 73, 635]],   # crouched / landing poses (no clean free-fall on sheet)
    "light": [[0, 311, 98, 376]],                          # straight-arm punch
    "heavy": [[319, 105, 419, 166]],                       # wide-stance wound-up strike
    "kick":  [[0, 417, 97, 472]],                          # extended-leg sweep (used as up-attack launcher)
}

def build(im, out, rects):
    cells = []
    for x0, y0, x1, y1 in rects:
        c = im.crop((x0, y0, x1, y1))
        bb = c.getbbox()
        cells.append(c.crop(bb) if bb else c)
    uW = max(c.width for c in cells) + 2
    uH = max(c.height for c in cells) + 2
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - 1), c)
    strip.save(out)
    print(f"OK {out}: {len(cells)} frames, cell {uW}x{uH}")
    return len(cells), uW, uH

if __name__ == "__main__":
    im = Image.open(SRC).convert("RGBA")
    for name, rects in RECTS.items():
        build(im, f"mci_{name}_uniform.png", rects)
