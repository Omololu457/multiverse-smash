#!/usr/bin/env python3
"""Swampfire CELL-GRID extraction (Phase 1).

The DS/DSi "Alien Force — Playable Characters — Swampfire" rip is a CELL GRID, not
free-floating sprites: each sprite sits in its own rectangular cell whose background is a
flat solid colour (mostly CYAN, an ORANGE/gold transform row, a MAGENTA explosion-FX row),
and the cells sit on the darker TEAL outer field. The "1px darker separator lines" between
cells are simply that teal field showing through the gaps.

Stock ben10_work/extract.py keys ONLY the single corner colour (teal) → every cyan cell
survives as one giant rectangular component. So here we key out ALL the known background
colours (teal, cyan, orange-bg, magenta-bg) with ZERO tolerance, leaving only sprite + FX
pixels, then connected-component cut (8-connectivity, nearest-neighbour), group into row
bands, sort left->right, and emit a LABELED contact sheet (row.frame) + geometry JSON.

Palette-collision guard: Swampfire's flame oranges (248,144,24 / 248,176,80 / 248,192,112)
are DISTINCT from the orange cell bg (240,184,48); magenta/cyan/teal do not occur in his
palette — so zero-tolerance keying removes only backgrounds, never the character.

No art is invented or recoloured. This only slices the existing sheet.
"""
import sys, json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont

# Exact background colours to key out (zero tolerance). Sampled from the sheet.
BG_COLORS = [
    (0, 128, 128),    # teal outer field + 1px separator gaps
    (0, 248, 248),    # cyan cell background (most rows)
    (240, 184, 48),   # orange/gold transform-row cell background
    (248, 0, 248),    # magenta explosion-FX-row cell background
]

def load_mask(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    rgb = a[:, :, :3].astype(np.int16)
    bg = np.zeros(a.shape[:2], dtype=bool)
    for c in BG_COLORS:
        bg |= (np.abs(rgb - np.array(c, dtype=np.int16)).sum(axis=2) == 0)
    fg = ~bg
    return im, a, fg

def components(fg, min_area=120):
    structure = np.ones((3, 3), dtype=int)   # 8-connectivity (incl. diagonals)
    lbl, n = ndimage.label(fg, structure=structure)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lbl), start=1):
        if sl is None:
            continue
        ys, xs = sl
        area = int((lbl[sl] == i).sum())
        if area < min_area:
            continue
        boxes.append({"x0": int(xs.start), "y0": int(ys.start),
                      "x1": int(xs.stop), "y1": int(ys.stop), "area": area,
                      "w": int(xs.stop - xs.start), "h": int(ys.stop - ys.start)})
    return boxes

def row_band(boxes):
    boxes = sorted(boxes, key=lambda b: b["y0"])
    rows = []
    for b in boxes:
        placed = False
        for r in rows:
            if b["y0"] < r["y1"] and b["y1"] > r["y0"]:
                ov = min(b["y1"], r["y1"]) - max(b["y0"], r["y0"])
                if ov > 0.3 * min(b["h"], r["y1"] - r["y0"]):
                    r["items"].append(b)
                    r["y0"] = min(r["y0"], b["y0"]); r["y1"] = max(r["y1"], b["y1"])
                    placed = True
                    break
        if not placed:
            rows.append({"y0": b["y0"], "y1": b["y1"], "items": [b]})
    rows.sort(key=lambda r: r["y0"])
    for r in rows:
        r["items"].sort(key=lambda b: b["x0"])
    return rows

def contact(im, fg, rows, out, max_w=2400, pad=6):
    src = np.array(im); src_fg = src.copy(); src_fg[~fg] = (0, 0, 0, 0)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
    except Exception:
        font = ImageFont.load_default()
    cuts = []
    for ri, r in enumerate(rows):
        cells = []
        for ci, b in enumerate(r["items"]):
            crop = src_fg[b["y0"]:b["y1"], b["x0"]:b["x1"]]
            cells.append((ci, b, Image.fromarray(crop, "RGBA")))
        cuts.append(cells)
    rowH = [max((c[2].height for c in cells), default=10) + 18 + pad for cells in cuts]
    canvas = Image.new("RGBA", (max_w, sum(rowH) + pad), (40, 40, 40, 255))
    d = ImageDraw.Draw(canvas)
    y = pad
    for ri, cells in enumerate(cuts):
        x = pad; hmax = max((c[2].height for c in cells), default=10)
        for (ci, b, img) in cells:
            if x + img.width + pad > max_w:
                x = pad; y += hmax + 18 + pad
            canvas.alpha_composite(img, (x, y))
            d.rectangle([x, y, x + img.width, y + img.height], outline=(0, 255, 0, 180))
            d.text((x, y + img.height + 1), f"{ri}.{ci}", fill=(255, 255, 0, 255), font=font)
            x += img.width + pad + 22
        y += hmax + 18 + pad
    canvas.convert("RGB").save(out)

def main():
    path = sys.argv[1]; tag = sys.argv[2]
    min_area = int(sys.argv[3]) if len(sys.argv) > 3 else 120
    im, a, fg = load_mask(path)
    print(f"{tag}: size={im.size}")
    boxes = components(fg, min_area=min_area)
    print(f"  {len(boxes)} components (min_area={min_area})")
    rows = row_band(boxes)
    print(f"  {len(rows)} row bands")
    for ri, r in enumerate(rows):
        print(f"   R{ri:2d}: y[{r['y0']}:{r['y1']}] n={len(r['items'])} w={[b['w'] for b in r['items']][:18]}")
    contact(im, fg, rows, f"swampfire_work/contact_{tag}.png")
    geo = {"path": path, "bg_colors": [list(c) for c in BG_COLORS],
           "rows": [{"y0": r["y0"], "y1": r["y1"],
                     "items": [{"r": ri, "c": ci, **{k: b[k] for k in ("x0", "y0", "x1", "y1", "w", "h", "area")}}
                               for ci, b in enumerate(r["items"])]}
                    for ri, r in enumerate(rows)]}
    json.dump(geo, open(f"swampfire_work/geo_{tag}.json", "w"))
    print(f"  wrote contact_{tag}.png + geo_{tag}.json")

if __name__ == "__main__":
    main()
