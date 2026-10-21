#!/usr/bin/env python3
"""Phase 1 inventory: connected-component segmentation of the Goku sheet.
Read-only w.r.t. the source; writes docs/debug artifacts only.

Background is exact teal #008080. Thin white divider lines under each
animation are masked to background so they act as row separators and are
never counted as frames. Each sprite / effect-strip piece is one CC blob;
tiny detached fragments (a thrown fist, a spur of hair) are merged into the
adjacent full sprite. Frames are grouped into rows by vertical overlap.
"""
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

SRC = "assets/source/goku_original.png"
TEAL = np.array([0, 128, 128])
TEAL_TOL = 24
WHITE_THR = 222
DIV_MINRUN = 40          # white run >= this is a divider line, masked out
MIN_AREA = 12            # drop sub-MIN_AREA speckles
FRAG_AREA = 170          # blobs smaller than this may be merged into a neighbour
FRAG_GAP = 5             # ... if within this px of the neighbour bbox

im = Image.open(SRC).convert("RGBA")
a = np.array(im).astype(int)
rgb = a[:, :, :3]
H, W, _ = a.shape

dist = np.abs(rgb - TEAL).sum(2)
bg = dist <= TEAL_TOL
white = (rgb[:, :, 0] > WHITE_THR) & (rgb[:, :, 1] > WHITE_THR) & (rgb[:, :, 2] > WHITE_THR)
fg = ~bg

# mask wide horizontal white runs (divider lines)
div_count = 0
for y in range(H):
    row = white[y]
    x = 0
    while x < W:
        if row[x]:
            x2 = x
            while x2 < W and row[x2]:
                x2 += 1
            if x2 - x >= DIV_MINRUN:
                fg[y, x:x2] = False
                div_count += 1
            x = x2
        else:
            x += 1

lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
objs = ndimage.find_objects(lab)
areas = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))

# raw blob boxes: (y0,x0,y1,x1,area,label)
blobs = []
for i, sl in enumerate(objs):
    if sl is None:
        continue
    ys, xs = sl
    ar = int(areas[i])
    bh = ys.stop - ys.start
    bw = xs.stop - xs.start
    if ar < MIN_AREA:
        continue
    if bw <= 2 or bh <= 2:          # leftover 1-2px divider sliver, not a frame
        continue
    blobs.append([ys.start, xs.start, ys.stop - 1, xs.stop - 1, ar, i + 1])

def gap(b1, b2):
    # bbox separation (0 if overlapping) on each axis
    dy = max(0, max(b1[0], b2[0]) - min(b1[2], b2[2]))
    dx = max(0, max(b1[1], b2[1]) - min(b1[3], b2[3]))
    return dx, dy

# merge small fragments into the nearest qualifying bigger blob
blobs.sort(key=lambda b: -b[4])          # big first
used = [False] * len(blobs)
frames = []
# seed frames from big blobs
big = [b for b in blobs if b[4] >= FRAG_AREA]
small = [b for b in blobs if b[4] < FRAG_AREA]
for b in big:
    frames.append({"y0": b[0], "x0": b[1], "y1": b[2], "x1": b[3],
                   "area": b[4], "labels": [b[5]]})
for s in small:
    # find nearest frame within gap on both axes
    best = None; bestd = 1e9
    for fr in frames:
        fb = (fr["y0"], fr["x0"], fr["y1"], fr["x1"])
        dx, dy = gap(fb, (s[0], s[1], s[2], s[3]))
        if dx <= FRAG_GAP and dy <= FRAG_GAP:
            d = dx + dy
            if d < bestd:
                bestd = d; best = fr
    if best is not None:
        best["y0"] = min(best["y0"], s[0]); best["x0"] = min(best["x0"], s[1])
        best["y1"] = max(best["y1"], s[2]); best["x1"] = max(best["x1"], s[3])
        best["area"] += s[4]; best["labels"].append(s[5])
    else:
        # standalone small item (likely a lone effect speck) — keep it
        frames.append({"y0": s[0], "x0": s[1], "y1": s[2], "x1": s[3],
                       "area": s[4], "labels": [s[5]]})

# per-frame colour stats (to flag effect strips vs fighters)
for fr in frames:
    sub_lab = lab[fr["y0"]:fr["y1"] + 1, fr["x0"]:fr["x1"] + 1]
    sub_rgb = rgb[fr["y0"]:fr["y1"] + 1, fr["x0"]:fr["x1"] + 1]
    m = np.isin(sub_lab, fr["labels"])
    px = sub_rgb[m]
    if len(px) == 0:
        fr["mean"] = [0, 0, 0]; fr["whiteish"] = 0.0; fr["reddish"] = 0.0
        continue
    fr["mean"] = [int(px[:, 0].mean()), int(px[:, 1].mean()), int(px[:, 2].mean())]
    wmask = (px[:, 0] > 180) & (px[:, 1] > 180) & (px[:, 2] > 180)
    rmask = (px[:, 0] > 110) & (px[:, 0] - px[:, 1] > 60) & (px[:, 0] - px[:, 2] > 60)
    fr["whiteish"] = round(float(wmask.mean()), 2)
    fr["reddish"] = round(float(rmask.mean()), 2)

# group frames into rows by vertical overlap
frames.sort(key=lambda f: (f["y0"], f["x0"]))
rows = []
for f in frames:
    placed = False
    for r in rows:
        ov = min(f["y1"], r["y1"]) - max(f["y0"], r["y0"]) + 1
        small_h = min(f["y1"] - f["y0"] + 1, r["y1"] - r["y0"] + 1)
        if ov > 0.5 * small_h:
            r["frames"].append(f)
            r["y0"] = min(r["y0"], f["y0"]); r["y1"] = max(r["y1"], f["y1"])
            placed = True
            break
    if not placed:
        rows.append({"y0": f["y0"], "y1": f["y1"], "frames": [f]})
rows.sort(key=lambda r: r["y0"])
for r in rows:
    r["frames"].sort(key=lambda f: f["x0"])

total = sum(len(r["frames"]) for r in rows)
print(f"dividers masked: {div_count} rows | raw blobs: {len(blobs)} | "
      f"frames: {total} | rows: {len(rows)}")

inv = {"source": SRC, "sheet_size": [W, H], "bg": [0, 128, 128],
       "note": "CC segmentation; coords are tight bbox in source px",
       "rows": []}
for ri, r in enumerate(rows):
    frs = []
    for fi, f in enumerate(r["frames"]):
        frs.append({"idx": fi, "x": int(f["x0"]), "y": int(f["y0"]),
                    "w": int(f["x1"] - f["x0"] + 1), "h": int(f["y1"] - f["y0"] + 1),
                    "area": int(f["area"]), "mean": f["mean"],
                    "whiteish": f["whiteish"], "reddish": f["reddish"]})
    inv["rows"].append({"row": ri, "y0": int(r["y0"]), "y1": int(r["y1"]),
                        "count": len(frs), "label": "", "use": "", "frames": frs})

with open("assets/source/goku_inventory.json", "w") as f:
    json.dump(inv, f, indent=1)
print("wrote assets/source/goku_inventory.json")

# labelled 3x contact sheet
SCALE = 3
canvas = im.resize((W * SCALE, H * SCALE), Image.NEAREST).convert("RGBA")
dr = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13)
    sfont = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 10)
except Exception:
    font = ImageFont.load_default(); sfont = font
palette = [(255, 80, 80), (80, 200, 255), (255, 220, 60), (120, 255, 120),
           (255, 140, 240), (255, 170, 40), (170, 170, 255), (90, 255, 210)]
for ri, r in enumerate(rows):
    col = palette[ri % len(palette)]
    for fi, f in enumerate(r["frames"]):
        dr.rectangle([f["x0"] * SCALE, f["y0"] * SCALE,
                      (f["x1"] + 1) * SCALE, (f["y1"] + 1) * SCALE],
                     outline=col, width=1)
        dr.text((f["x0"] * SCALE + 1, f["y0"] * SCALE - 11), f"{fi}", fill=col, font=sfont)
    dr.text((2, r["y0"] * SCALE + 1), f"R{ri}", fill=col, font=font)
canvas.save("assets/source/goku_contact_sheet.png")
print("wrote assets/source/goku_contact_sheet.png size", canvas.size)

for r in inv["rows"]:
    hs = sorted(set(f["h"] for f in r["frames"]))
    print(f"R{r['row']:2d} y={r['y0']:4d}-{r['y1']:4d} n={r['count']:2d} h={hs}")
