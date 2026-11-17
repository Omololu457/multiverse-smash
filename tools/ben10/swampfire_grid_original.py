#!/usr/bin/env python3
"""Swampfire GRID extraction (Phase 1) — authoritative cell-grid cut.

The sheet is a strict CELL GRID. Instead of connected-components (which fragments a flame
sprite into body + flames + sparks), detect the grid itself exactly as the brief describes:
  * ROW BANDS   = maximal runs of scanlines that are NOT entirely teal field.
  * CELL COLUMNS = within a band, maximal runs of columns that are NOT entirely teal
                   (the 1px teal separator lines + outer teal field split the cells).
Each cell = (band y-range) x (column run). Within a cell we key out EVERY background colour
(teal/cyan/orange-bg/magenta-bg, zero tolerance) and trim to the sprite's own bbox, keeping
detached flame/vine parts that belong to the same cell. One cell == one frame.

Nearest-neighbour only. No recolour, no invented art.
"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

BG_COLORS = [(0, 128, 128), (0, 248, 248), (240, 184, 48), (248, 0, 248)]
TEAL = (0, 128, 128)

def load(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im); rgb = a[:, :, :3].astype(np.int16)
    teal = (np.abs(rgb - np.array(TEAL)).sum(2) == 0)
    bg = np.zeros(a.shape[:2], dtype=bool)
    for c in BG_COLORS:
        bg |= (np.abs(rgb - np.array(c, dtype=np.int16)).sum(2) == 0)
    fg = ~bg
    return im, a, teal, fg

def runs(mask1d, min_len=2):
    """Maximal runs where mask1d is True. Returns [(start,stop)]."""
    out = []; i = 0; n = len(mask1d)
    while i < n:
        if mask1d[i]:
            j = i
            while j < n and mask1d[j]:
                j += 1
            if j - i >= min_len:
                out.append((i, j))
            i = j
        else:
            i += 1
    return out

def main():
    path = sys.argv[1]; tag = sys.argv[2]
    im, a, teal, fg = load(path)
    h, w = a.shape[:2]
    # ROW BANDS: scanline is "content" if < 99% teal
    row_content = (teal.mean(1) < 0.99)
    bands = runs(row_content, min_len=6)
    print(f"{tag}: size={im.size}  {len(bands)} row bands")
    src = a.copy(); src_fg = src.copy(); src_fg[~fg] = (0, 0, 0, 0)
    geo_rows = []
    for ri, (y0, y1) in enumerate(bands):
        band_teal = teal[y0:y1, :]
        # a column is a separator if (nearly) all teal within this band
        col_content = (band_teal.mean(0) < 0.95)
        cell_runs = runs(col_content, min_len=4)
        items = []
        for ci, (x0, x1) in enumerate(cell_runs):
            # trim to the sprite's own bbox inside the cell
            sub = fg[y0:y1, x0:x1]
            if sub.sum() < 30:   # near-empty cell → skip noise
                continue
            ys, xs = np.where(sub)
            ty0, ty1 = y0 + int(ys.min()), y0 + int(ys.max()) + 1
            tx0, tx1 = x0 + int(xs.min()), x0 + int(xs.max()) + 1
            items.append({"r": ri, "c": len(items), "x0": tx0, "y0": ty0, "x1": tx1, "y1": ty1,
                          "w": tx1 - tx0, "h": ty1 - ty0, "cellx0": x0, "cellx1": x1,
                          "celly0": y0, "celly1": y1, "area": int(sub.sum())})
        geo_rows.append({"y0": y0, "y1": y1, "items": items})
        print(f"  R{ri:2d}: y[{y0}:{y1}] cells={len(items)} w={[it['w'] for it in items][:20]}")
    # contact sheet
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
    except Exception:
        font = ImageFont.load_default()
    pad = 6; max_w = 2550
    cuts = []
    for row in geo_rows:
        cells = [(it, Image.fromarray(src_fg[it["y0"]:it["y1"], it["x0"]:it["x1"]], "RGBA")) for it in row["items"]]
        cuts.append(cells)
    rowH = [max((c[1].height for c in cells), default=10) + 18 + pad for cells in cuts]
    canvas = Image.new("RGBA", (max_w, sum(rowH) + pad), (40, 40, 40, 255))
    d = ImageDraw.Draw(canvas); y = pad
    for ri, cells in enumerate(cuts):
        x = pad; hmax = max((c[1].height for c in cells), default=10)
        for (it, img) in cells:
            if x + img.width + pad > max_w:
                x = pad; y += hmax + 18 + pad
            canvas.alpha_composite(img, (x, y))
            d.rectangle([x, y, x + img.width, y + img.height], outline=(0, 255, 0, 160))
            d.text((x, y + img.height + 1), f"{ri}.{it['c']}", fill=(255, 255, 0, 255), font=font)
            x += img.width + pad + 20
        y += hmax + 18 + pad
    canvas.convert("RGB").save(f"swampfire_work/contact_{tag}.png")
    json.dump({"path": path, "bg_colors": [list(c) for c in BG_COLORS], "rows": geo_rows},
              open(f"swampfire_work/geo_{tag}.json", "w"))
    print(f"  wrote contact_{tag}.png + geo_{tag}.json  (total cells={sum(len(r['items']) for r in geo_rows)})")

if __name__ == "__main__":
    main()
