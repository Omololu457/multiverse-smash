#!/usr/bin/env python3
"""Green Arrow SNES sheet slicer.
Source: 'SNES - Justice League Task Force - Fighters - Green Arrow.png' (764x1748, RGBA).
Background is WHITE with alpha 0 -> key on alpha ( <=20 = background ).
Pass 1 (--contact): split each content y-band into frames by column gaps, dump a
labelled contact sheet so frames can be mapped to animation states by eye.
Pass 2 (default): assemble named uniform strips from an explicit cell map.
"""
import sys, json
from PIL import Image, ImageDraw

SHEET = 'SNES - Justice League Task Force - Fighters - Green Arrow.png'
im = Image.open(SHEET).convert('RGBA')
W, H = im.size
px = im.load()
A_THRESH = 20
GAP = 4          # empty-column run that separates two frames
MINPIX = 12      # ignore tiny speck blobs (per-frame foreground pixel floor)

def isfg(x, y):
    return px[x, y][3] > A_THRESH

# --- find content y-bands (rows) ---
rowhas = [any(isfg(x, y) for x in range(W)) for y in range(H)]
bands = []
y = 0
while y < H:
    if rowhas[y]:
        y0 = y
        while y < H and rowhas[y]:
            y += 1
        bands.append((y0, y - 1))
    else:
        y += 1

def split_frames(y0, y1, gap=GAP):
    """Within a y-band, split into frame x-ranges by empty-column runs >= gap."""
    colhas = [any(isfg(x, yy) for yy in range(y0, y1 + 1)) for x in range(W)]
    frames = []
    x = 0
    while x < W:
        if colhas[x]:
            x0 = x
            run_empty = 0
            xend = x
            while x < W:
                if colhas[x]:
                    xend = x
                    run_empty = 0
                else:
                    run_empty += 1
                    if run_empty >= gap:
                        break
                x += 1
            frames.append((x0, xend))
        else:
            x += 1
    return frames

def tight_box(x0, x1, y0, y1):
    """Tighten a frame box to its actual alpha bbox; return None if empty/tiny."""
    mnx = mny = 10**9; mxx = mxy = -1; cnt = 0
    for yy in range(y0, y1 + 1):
        for xx in range(x0, x1 + 1):
            if isfg(xx, yy):
                cnt += 1
                if xx < mnx: mnx = xx
                if xx > mxx: mxx = xx
                if yy < mny: mny = yy
                if yy > mxy: mxy = yy
    if cnt < MINPIX:
        return None
    return (mnx, mny, mxx, mxy, cnt)

def crop(box):
    x0, y0, x1, y1 = box[0], box[1], box[2], box[3]
    sub = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0))
    sp = sub.load()
    for yy in range(y0, y1 + 1):
        for xx in range(x0, x1 + 1):
            p = px[xx, yy]
            if p[3] > A_THRESH:
                sp[xx - x0, yy - y0] = p
    return sub

# Build per-band tight frame boxes.
ROWS = []
for (y0, y1) in bands:
    fr = split_frames(y0, y1)
    boxes = []
    for (fx0, fx1) in fr:
        b = tight_box(fx0, fx1, y0, y1)
        if b:
            boxes.append(b)
    ROWS.append(boxes)

if '--contact' in sys.argv:
    # Labelled contact sheet: each band on its own line, frames left-to-right, 2x.
    SCALE = 2
    PADX, PADY, LBL = 10, 26, 16
    # measure
    line_h = []
    line_w = []
    for boxes in ROWS:
        h = max([(b[3] - b[1] + 1) for b in boxes], default=1)
        w = sum([(b[2] - b[0] + 1 + PADX) for b in boxes]) + PADX
        line_h.append(h * SCALE + LBL + PADY)
        line_w.append(w * SCALE)
    cw = max(line_w, default=100) + 60
    ch = sum(line_h) + 20
    out = Image.new('RGBA', (cw, ch), (24, 24, 28, 255))
    d = ImageDraw.Draw(out)
    cy = 10
    for ri, boxes in enumerate(ROWS):
        y0b, y1b = bands[ri]
        d.text((4, cy), f"B{ri}", fill=(255, 220, 120, 255))
        cx = 40
        topy = cy + LBL
        for fi, b in enumerate(boxes):
            cimg = crop(b).resize(((b[2]-b[0]+1)*SCALE, (b[3]-b[1]+1)*SCALE), Image.NEAREST)
            out.alpha_composite(cimg, (cx, topy))
            d.text((cx, cy), f"{fi}", fill=(150, 220, 255, 255))
            d.text((cx, topy + cimg.height + 2), f"{b[2]-b[0]+1}x{b[3]-b[1]+1}", fill=(140,140,150,255))
            cx += cimg.width + PADX * SCALE
        cy += line_h[ri]
    out.save('docs/greenarrow/ga_bands_contact.png')
    print("bands:", len(ROWS))
    for ri, boxes in enumerate(ROWS):
        print(f"B{ri:2d} y={bands[ri][0]:4d}-{bands[ri][1]:4d}  frames={len(boxes):2d}  sizes={[(b[2]-b[0]+1,b[3]-b[1]+1) for b in boxes]}")
    print("wrote docs/greenarrow/ga_bands_contact.png", out.size)
    sys.exit(0)

print("Run with --contact first to inspect bands.")
