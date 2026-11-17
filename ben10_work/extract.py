#!/usr/bin/env python3
"""Ben 10 sheet extraction pipeline (Phase 1).

Chroma-key the exact corner background color (zero tolerance), connected-component
cut (nearest-neighbour only), group components into row bands by vertical overlap,
sort left->right, and emit a LABELED contact sheet (row.frame) for visual inspection.

No art is invented or recolored. This only slices the existing sheets.
"""
import sys, json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont

def load_mask(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    rgb = a[:, :, :3].astype(np.int16)
    alpha = a[:, :, 3]
    # sample 4 corners
    h, w = a.shape[:2]
    corners = [tuple(a[0,0,:3]), tuple(a[0,w-1,:3]), tuple(a[h-1,0,:3]), tuple(a[h-1,w-1,:3])]
    bg = corners[0]
    has_alpha = (alpha < 255).any()
    if has_alpha:
        fg = alpha > 16
    else:
        # chroma-key the exact corner color, zero tolerance
        diff = np.abs(rgb - np.array(bg, dtype=np.int16)).sum(axis=2)
        fg = diff > 0  # anything not exactly bg
    return im, a, fg, bg, corners, has_alpha

def components(fg, min_area=40):
    # 8-connectivity (nearest-neighbour incl diagonal)
    structure = np.ones((3,3), dtype=int)
    lbl, n = ndimage.label(fg, structure=structure)
    boxes = []
    objs = ndimage.find_objects(lbl)
    for i, sl in enumerate(objs, start=1):
        if sl is None: continue
        ys, xs = sl
        area = int((lbl[sl] == i).sum())
        if area < min_area: continue
        boxes.append({"id": i, "x0": int(xs.start), "y0": int(ys.start),
                      "x1": int(xs.stop), "y1": int(ys.stop), "area": area,
                      "w": int(xs.stop-xs.start), "h": int(ys.stop-ys.start)})
    return boxes

def row_band(boxes):
    """Group by vertical overlap into row bands, sort rows top->bottom, each row left->right."""
    boxes = sorted(boxes, key=lambda b: b["y0"])
    rows = []
    for b in boxes:
        placed = False
        for r in rows:
            # overlap test against the row's current vertical span
            if b["y0"] < r["y1"] and b["y1"] > r["y0"]:
                # require meaningful overlap (>30% of smaller height)
                ov = min(b["y1"], r["y1"]) - max(b["y0"], r["y0"])
                if ov > 0.3 * min(b["h"], r["y1"]-r["y0"]):
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

def contact(im, a, fg, rows, out, max_w=1800, cell_pad=6):
    # cut each component on fg mask (transparent elsewhere), paste into a labeled grid
    src = np.array(im)
    src_fg = src.copy()
    src_fg[~fg] = (0,0,0,0)
    cuts = []
    for ri, r in enumerate(rows):
        row_cells = []
        for ci, b in enumerate(r["items"]):
            crop = src_fg[b["y0"]:b["y1"], b["x0"]:b["x1"]]
            row_cells.append((ri, ci, b, Image.fromarray(crop, "RGBA")))
        cuts.append(row_cells)
    # layout
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
    except Exception:
        font = ImageFont.load_default()
    pad = cell_pad
    rowH = []
    for row_cells in cuts:
        hmax = max((c[3].height for c in row_cells), default=10)
        rowH.append(hmax + 16 + pad)
    totalH = sum(rowH) + pad
    # width: pack cells per row with wrap at max_w
    canvas = Image.new("RGBA", (max_w, totalH), (40,40,40,255))
    d = ImageDraw.Draw(canvas)
    y = pad
    for ri, row_cells in enumerate(cuts):
        x = pad
        hmax = max((c[3].height for c in row_cells), default=10)
        for (ri2, ci, b, img) in row_cells:
            if x + img.width + pad > max_w:
                x = pad; y += hmax + 16 + pad
            canvas.alpha_composite(img, (x, y))
            d.rectangle([x, y, x+img.width, y+img.height], outline=(0,255,0,180))
            d.text((x, y+img.height+1), f"{ri}.{ci} {b['w']}x{b['h']}", fill=(255,255,0,255), font=font)
            x += img.width + pad + 34
        y += hmax + 16 + pad
    canvas.convert("RGB").save(out)
    return cuts

def main():
    path = sys.argv[1]; tag = sys.argv[2]
    min_area = int(sys.argv[3]) if len(sys.argv) > 3 else 60
    im, a, fg, bg, corners, has_alpha = load_mask(path)
    print(f"{tag}: size={im.size} bg={bg} has_alpha={has_alpha} corners={corners}")
    boxes = components(fg, min_area=min_area)
    print(f"  {len(boxes)} components (min_area={min_area})")
    rows = row_band(boxes)
    print(f"  {len(rows)} row bands")
    for ri, r in enumerate(rows):
        print(f"   row {ri}: y[{r['y0']}:{r['y1']}] n={len(r['items'])} widths={[b['w'] for b in r['items']][:20]}")
    contact(im, a, fg, rows, f"ben10_work/contact_{tag}.png")
    # dump geometry
    geo = {"path": path, "bg": list(map(int,bg)), "has_alpha": bool(has_alpha),
           "rows": [{"y0": r["y0"], "y1": r["y1"],
                     "items": [{"r":ri,"c":ci,**{k:b[k] for k in ("x0","y0","x1","y1","w","h","area")}}
                               for ci,b in enumerate(r["items"])]}
                    for ri,r in enumerate(rows)]}
    with open(f"ben10_work/geo_{tag}.json","w") as f: json.dump(geo,f)
    print(f"  wrote contact_{tag}.png and geo_{tag}.json")

if __name__ == "__main__":
    main()
