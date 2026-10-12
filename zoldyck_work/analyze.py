#!/usr/bin/env python3
# Border flood-fill key the AmandioHype Killua "new outfit" sheet (olive-green
# bg (55,86,40) + noise). Interior non-bg pixels are KEPT (protects cyan/white
# lightning bolts and sparks that sit inside frames). Emits keyed_full.png,
# magenta/black/white proofs, and a horizontal band report to stdout + bands.json.
import numpy as np
from PIL import Image
from collections import deque
import json

SRC = "killua_zoldyck_sprites_jus_new_outfit__by_amandiohype_dduudqn.png"
im = Image.open(SRC).convert("RGBA")
W, H = im.size
arr = np.array(im)
rgb = arr[:, :, :3].astype(np.int16)

BG = np.array([55, 86, 40])
BG_TOL = 45                               # olive-green + mild noise; cyan FX is far (>500)
dist = np.abs(rgb - BG).sum(axis=2)
is_bgcol = dist <= BG_TOL

# Flood-fill transparency ONLY from bg-connected border pixels, so cyan bolts and
# white sparks enclosed by the body/FX are preserved even if locally bg-adjacent.
visited = np.zeros((H, W), dtype=bool)
keep = np.ones((H, W), dtype=bool)
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
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and is_bgcol[ny, nx]:
            visited[ny, nx] = True; dq.append((ny, nx))

alpha = np.where(keep, 255, 0).astype(np.uint8)
out = arr.copy(); out[:, :, 3] = alpha
keyed = Image.fromarray(out, "RGBA")
keyed.save("zoldyck_work/keyed_full.png")
print(f"keyed: {W}x{H}, opaque px {keep.sum()} ({keep.mean()*100:.1f}%)")

for name, bgc in (("magenta", (255, 0, 255)), ("black", (0, 0, 0)), ("white", (255, 255, 255))):
    bg = Image.new("RGBA", (W, H), bgc + (255,)); bg.alpha_composite(keyed)
    bg.convert("RGB").resize((W // 4, H // 4)).save(f"zoldyck_work/proof_{name}.png")

# horizontal band report
rowcount = keep.sum(axis=1)
MIN_ROW = 4
bands = []
y = 0
while y < H:
    if rowcount[y] >= MIN_ROW:
        y0 = y
        while y < H and rowcount[y] >= MIN_ROW:
            y += 1
        y1 = y - 1
        if y1 - y0 >= 3:
            cols = keep[y0:y1 + 1, :].sum(axis=0)
            xs = np.where(cols >= 1)[0]
            bands.append({"y0": int(y0), "y1": int(y1), "h": int(y1 - y0 + 1),
                          "x0": int(xs[0]), "x1": int(xs[-1])})
    else:
        y += 1
json.dump(bands, open("zoldyck_work/bands.json", "w"), indent=1)
print(f"{len(bands)} bands:")
for b in bands:
    print(f"  y{b['y0']:4d}-{b['y1']:4d} (h{b['h']:3d})  x{b['x0']:4d}-{b['x1']:4d}")
