# tools/stage_layers/slice_lee_suna.py — Lee's Stage (Street Fighter, 1987 arcade background sheet, ripped by
# TonyWanKenobian) → SUNAGAKURE, the Village Hidden in the Sand (Naruto).   python3 -I tools/stage_layers/slice_lee_suna.py <sheet.png> <repoRoot>
#   Only the brick parapet + the floor tiles are kept (repainted sandstone) and the sky strip; the hills with the Great Wall
#   are dropped — stageLayers.js (set "lee_suna") draws Suna's ring of sheer rock cliffs, the dunes and the village (domed
#   houses, the Kazekage building) behind the parapet.
import sys, os, json, colorsys, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "lee_suna"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
def hsv(r, g, b): h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); return h * 360, s, v
X0, Y0 = 8, 4
M = crop(X0, Y0, 775, 205); H, W = M.shape[:2]
HILL, WALL = M.copy(), M.copy()
SAND = [(110, 66, 34), (168, 112, 58), (214, 160, 92), (240, 200, 132), (250, 226, 170)]
def sand(v):
    v = max(0, min(0.999, v)) * (len(SAND) - 1); i = int(v); f = v - i; a, b = SAND[i], SAND[min(i + 1, len(SAND) - 1)]
    return tuple(a[k] + (b[k] - a[k]) * f for k in range(3))
def brick(y, x):
    r, g, b, a = M[y, x]; h, s_, v = hsv(r, g, b); return a and h <= 34 and s_ >= 0.62
ptop = []                                                   # per column: the top of the parapet (first run of 3 brick pixels at/after row 128)
for x in range(W):
    t = 179 - Y0
    for y in range(128 - Y0, 179 - Y0):
        if all(brick(y + k, x) for k in range(3)): t = y; break
    ptop.append(t)
for y in range(H):
    for x in range(W):
        r, g, b, a = M[y, x]
        if not a: continue
        h, s, v = hsv(r, g, b)
        wallpx = y >= ptop[x]
        if wallpx:
            HILL[y, x, 3] = 0
            WALL[y, x, :3] = sand(v * 1.15 - 0.12)                                       # bricks/tiles → sandstone (keeps the contrast)
        else:
            WALL[y, x, 3] = 0
            HILL[y, x, :3] = sand(v * 0.95 + (0.05 if s < 0.3 else 0))                  # hills, wall, scrub → one sand palette
# the parapet's own floor-level fill under the hills (where the hills stop above the parapet) stays open: the village shows there
FY = 179 - Y0
F = WALL[FY:].copy(); FH0, EXT = F.shape[0], 300
tile = F[2:FH0 - 1].copy(); th = tile.shape[0]
tile[:, 196:276] = tile[:, 110:190]                                                    # no repeating rubble
G = np.zeros((EXT, W, 4)); G[:, :, 3] = 255
rng = random.Random(77)
for y in range(EXT):                                                                  # the tiled plaza carried on (tiles grow toward the camera)
    sc = 1 + y / 120; src = tile[int((y / sc) % th)]
    xs = (np.arange(W) / sc).astype(int) % W; G[y, :, :3] = src[xs, :3]
for k in range(500): G[rng.randrange(EXT), rng.randrange(W), :3] = sand(0.85)              # blown sand on the stones
for y in range(EXT): G[y, :, :3] *= max(0.74, 1 - y * 0.0009)
F = np.concatenate([F, G], axis=0)
SKY = crop(8, 215, 779, 365)
P = {"wall": {"file": save("wall", WALL[:FY]), "w": W, "h": FY, "top": 128 - Y0},
     "floor": {"file": save("floor", F), "w": W, "h": F.shape[0]},
     "sky": {"file": save("sky", SKY), "w": SKY.shape[1], "h": SKY.shape[0]}}
L = {"source": "Street Fighter (1987 arcade) — Lee's Stage background sheet (ripped by TonyWanKenobian); repainted as Sunagakure", "pieces": P,
     "colors": {"skyTop": "#e8c888", "under": "#c8a070"}}
pv = Image.new("RGBA", (W, FY), (236, 206, 150, 255))
for n in ("wall",): pv.alpha_composite(Image.open(os.path.join(out, n + ".png")))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, W, H, FY)
