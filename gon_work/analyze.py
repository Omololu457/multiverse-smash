#!/usr/bin/env python3
# Analyze the AmandioHype Gon sheet: border flood-fill key the opaque-green bg,
# then report horizontal content bands (rows separated by empty gaps) and, per
# band, the x-extent + frame-island columns. Also emit magenta/black/white proofs.
import numpy as np
from PIL import Image
from collections import deque
import sys, json

SRC = "gon_freecss_sprites_jus_white_outfit__by_amandiohype_dcbpr6f.png"
im = Image.open(SRC).convert("RGBA")
W, H = im.size
arr = np.array(im)                       # (H,W,4)
rgb = arr[:, :, :3].astype(np.int16)

# Background = opaque green ~ (0,128,0) + noise. Build a "is-bg-colour" mask first.
GREEN = np.array([0, 128, 0])
dist = np.abs(rgb - GREEN).sum(axis=2)   # L1 distance to pure green
BG_TOL = 90                              # generous: green + JPEG-ish noise
is_bgcol = dist <= BG_TOL

# Flood-fill transparency from the borders so interior same-colour pixels (none
# expected since outfit is white, but Adult-hair/black silhouettes safe) are kept.
keep = np.ones((H, W), dtype=bool)       # True = opaque (keep)
visited = np.zeros((H, W), dtype=bool)
dq = deque()
for x in range(W):
    for y in (0, H - 1):
        if is_bgcol[y, x] and not visited[y, x]:
            visited[y, x] = True; dq.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if is_bgcol[y, x] and not visited[y, x]:
            visited[y, x] = True; dq.append((y, x))
while dq:
    y, x = dq.popleft()
    keep[y, x] = False
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and is_bgcol[ny, nx]:
            visited[ny, nx] = True; dq.append((ny, nx))

alpha = np.where(keep, 255, 0).astype(np.uint8)
out = arr.copy(); out[:, :, 3] = alpha
keyed = Image.fromarray(out, "RGBA")
keyed.save("gon_work/keyed_full.png")

# proofs on magenta/black/white (downscaled)
for name, bgc in (("magenta",(255,0,255)),("black",(0,0,0)),("white",(255,255,255))):
    bg = Image.new("RGBA",(W,H),bgc+(255,)); bg.alpha_composite(keyed)
    bg.convert("RGB").resize((W//4,H//4)).save(f"gon_work/proof_{name}.png")

# Row content profile: count opaque px per row
rowcount = keep.sum(axis=1)
MIN_ROW = 4                              # rows with < this many opaque px = empty
bands = []
y = 0
while y < H:
    if rowcount[y] >= MIN_ROW:
        y0 = y
        while y < H and rowcount[y] >= MIN_ROW:
            y += 1
        y1 = y - 1
        if y1 - y0 >= 3:                 # ignore sub-3px specks
            bands.append((y0, y1))
    else:
        y += 1

print(f"sheet {W}x{H}; {len(bands)} content bands (gap-separated):")
report = []
for (y0, y1) in bands:
    sub = keep[y0:y1+1]
    cols = sub.sum(axis=0)
    xs = np.where(cols > 0)[0]
    x0, x1 = (int(xs[0]), int(xs[-1])) if len(xs) else (0, 0)
    # count frame islands along x (gap >= 3 empty cols splits)
    islands = 0; run = False; gap = 0
    for c in range(x0, x1+1):
        if cols[c] > 0:
            if not run: islands += 1; run = True
            gap = 0
        else:
            gap += 1
            if gap >= 4: run = False
    print(f"  y {y0:4d}-{y1:4d}  (h={y1-y0+1:3d})  x {x0:4d}-{x1:4d}  islands~{islands}")
    report.append({"y0":y0,"y1":y1,"h":y1-y0+1,"x0":x0,"x1":x1,"islands":islands})

json.dump(report, open("gon_work/bands.json","w"), indent=1)
print("saved gon_work/keyed_full.png + proofs + bands.json")
