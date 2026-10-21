#!/usr/bin/env python3
"""Homelander sheet inventory: strip yellow, connected-component cut, attach small
motion fragments (barrage fists/streaks) to nearest body, cluster rows, split the
merged bottom band, emit inventory.json + 3x labelled contact sheet."""
import json
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

SRC = '../assets/source/homelander_original.png'
im = Image.open(SRC).convert('RGBA')
a = np.array(im)
H, W = a.shape[:2]
r, g, b = [a[..., i].astype(int) for i in range(3)]

yellow = (r > 235) & (g > 235) & (b < 95)
fg = ~yellow

# black vertical dividers (thin+tall), not the wide silhouette
dark = (r < 60) & (g < 60) & (b < 60)
lbl_d, nd = ndimage.label(dark)
divider = np.zeros_like(dark)
for i in range(1, nd + 1):
    ys, xs = np.where(lbl_d == i)
    if (xs.max() - xs.min() + 1) <= 4 and (ys.max() - ys.min() + 1) >= 25:
        divider[lbl_d == i] = True

fg2 = ndimage.binary_opening(fg & ~divider, iterations=1)
lbl, n = ndimage.label(fg2)

comps = []
for i in range(1, n + 1):
    ys, xs = np.where(lbl == i)
    if len(xs) < 40:
        continue
    comps.append({"x0": int(xs.min()), "y0": int(ys.min()),
                  "x1": int(xs.max()), "y1": int(ys.max()), "area": int(len(xs))})

# cluster into rows by y-center
comps.sort(key=lambda c: (c["y0"] + c["y1"]) / 2)
rows = []
cur = []
last = None
for c in comps:
    yc = (c["y0"] + c["y1"]) / 2
    if last is None or yc - last < 34:
        cur.append(c)
    else:
        rows.append(cur); cur = []
        cur.append(c)
    last = yc
if cur:
    rows.append(cur)

# split any band that is actually two stacked rows (gap in y within the band)
def maybe_split(row):
    row = sorted(row, key=lambda c: (c["y0"] + c["y1"]) / 2)
    ycs = [(c["y0"] + c["y1"]) / 2 for c in row]
    # find a big vertical jump
    for k in range(1, len(ycs)):
        if ycs[k] - ycs[k - 1] > 26:
            return [row[:k], row[k:]]
    return [row]

rows2 = []
for rw in rows:
    rows2.extend(maybe_split(rw))
rows = rows2

# per row: sort by x, attach small fragments (area<300) to adjacent larger body if gap<14
def consolidate(row):
    row = sorted(row, key=lambda c: c["x0"])
    out = []
    for c in row:
        if out:
            prev = out[-1]
            gap = c["x0"] - prev["x1"]
            small = min(c["area"], prev["area"]) < 300
            if gap < 14 and small:
                prev["x0"] = min(prev["x0"], c["x0"]); prev["y0"] = min(prev["y0"], c["y0"])
                prev["x1"] = max(prev["x1"], c["x1"]); prev["y1"] = max(prev["y1"], c["y1"])
                prev["area"] += c["area"]
                continue
        out.append(dict(c))
    return out

rows = [consolidate(rw) for rw in rows]

print("rows:", len(rows))
for ri, rw in enumerate(rows):
    print(f"  row{ri+1}: {len(rw)} frames  w={[c['x1']-c['x0']+1 for c in rw]}")

inv = {"source": SRC.replace('../', ''), "sheet_size": [W, H],
       "background": "pure #FFFF00 stripped via tight yellow mask",
       "divider_lines": "thin tall black columns removed (animation separators, not art)",
       "rows": [], "frame_count": 0}
gid = 0
for ri, rw in enumerate(rows):
    rframes = []
    for ci, c in enumerate(rw):
        gid += 1
        rframes.append({"id": gid, "row": ri + 1, "col": ci + 1,
                        "bbox": [c["x0"], c["y0"], c["x1"], c["y1"]],
                        "w": c["x1"] - c["x0"] + 1, "h": c["y1"] - c["y0"] + 1,
                        "area": c["area"]})
    inv["rows"].append({"row": ri + 1, "count": len(rframes), "frames": rframes})
inv["frame_count"] = gid
with open('inventory_raw.json', 'w') as f:
    json.dump(inv, f, indent=1)
print("total frames:", gid)

# 3x labelled contact sheet
S = 3
disp = a.copy()
disp[yellow] = (28, 28, 34, 255)
contact = Image.fromarray(disp).resize((W * S, H * S), Image.NEAREST).convert('RGBA')
cd = ImageDraw.Draw(contact)
for ri, rw in enumerate(rows):
    for ci, c in enumerate(rw):
        cd.rectangle([c["x0"] * S, c["y0"] * S, (c["x1"] + 1) * S, (c["y1"] + 1) * S],
                     outline=(0, 230, 255, 255), width=1)
        cd.text((c["x0"] * S + 1, c["y0"] * S + 1), f"{ri+1}.{ci+1}", fill=(255, 240, 0, 255))
contact.convert('RGB').save('../assets/source/homelander_contact_sheet.png')
print("wrote contact sheet")
