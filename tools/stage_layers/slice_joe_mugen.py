# tools/stage_layers/slice_joe_mugen.py — Joe's Stage (Street Fighter, 1987 arcade background sheet, ripped by
# TonyWanKenobian) → the MUGEN TRAIN at night (Demon Slayer).   python3 -I tools/stage_layers/slice_joe_mugen.py <sheet.png> <repoRoot>
#   the graffiti subway cars → the Mugen Train's dark maroon carriages with a gold stripe and lit windows (the graffiti is
#   flattened out); the New York skyline is cut away (the night sky, the moon and the mountains are drawn by
#   stageLayers.js, set "joe_mugen"); the brick depot + tracks go to night; the track bed is carried on toward the camera.
import sys, os, json, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "joe_mugen"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
X0, Y0, X1, Y1 = 8, 60, 775, 244
M = SRC[Y0:Y1 + 1, X0:X1 + 1].copy(); M[np.all(M[:, :, :3] == KEY, axis=2), 3] = 0
H, W = M.shape[:2]
lum = (M[:, :, 0] * 0.3 + M[:, :, 1] * 0.59 + M[:, :, 2] * 0.11)
def X(x): return x - X0
def Y(y): return y - Y0
# the skyline: everything above the far cars in the middle gap goes
for y in range(H):
    for x in range(X(255), X(465)):
        if y < Y(150) and M[y, x, 3] and not (x < X(262)): M[y, x, 3] = 0
# cars: (x0, y0, x1, y1, windowBand)
CARS = [(112, 132, 262, 186, (140, 158)), (262, 148, 362, 182, (153, 165)), (362, 140, 465, 184, (147, 162)), (464, 80, 775, 198, (100, 128))]
MAROON = np.array([92, 28, 30]); GOLD = np.array([214, 168, 74])
for (x0, y0, x1, y1, (w0, w1)) in CARS:
    sub = M[Y(y0):Y(y1), X(x0):X(x1)]; L = lum[Y(y0):Y(y1), X(x0):X(x1)]
    prof = np.median(np.where(sub[:, :, 3] > 0, L, np.nan), axis=1)          # one clean vertical shading profile
    prof = np.nan_to_num(prof, nan=100)
    hh, ww = sub.shape[:2]
    for yy in range(hh):
        Y_ = y0 + yy
        for xx in range(ww):
            if not sub[yy, xx, 3]: continue
            l = L[yy, xx]
            if Y_ > y1 - (y1 - y0) * 0.16:                           # undercarriage / wheels: keep, darkened
                sub[yy, xx, :3] = np.array([l, l, l]) * 0.35; continue
            pitch = 26 if y1 - y0 > 80 else 13; ww_ = 17 if pitch == 26 else 8
            if w0 + 2 <= Y_ <= w1 - 1 and 4 <= xx % pitch < 4 + ww_ and 4 <= xx < ww - 4:      # evenly spaced lit windows
                inner = (xx % pitch - 4, Y_ - w0 - 2)
                if inner[0] in (0, ww_ - 1) or inner[1] == 0: sub[yy, xx, :3] = (60, 30, 24)        # frame
                elif inner[0] == ww_ // 2: sub[yy, xx, :3] = (120, 70, 40)                          # mullion
                else: sub[yy, xx, :3] = (255, 206, 120) if inner[1] > 2 else (255, 230, 170)
                continue
            k = 0.55 + prof[yy] / 255 * 0.7
            c = MAROON * k
            if Y_ in (w1 + 3, w1 + 4): c = GOLD * (0.7 + prof[yy] / 255 * 0.4)
            if yy < 3: c = np.array([40, 34, 36]) * k * 1.4                 # the roof
            sub[yy, xx, :3] = c
    M[Y(y0):Y(y1), X(x0):X(x1)] = sub
# everything else to night: darker, bluer
for y in range(H):
    for x in range(W):
        r, g, b, a = M[y, x]
        if not a: continue
        if r > 230 and g > 150 and b < 140 and g < 210: continue               # lit windows stay warm
        inCar = any(x0 <= x + X0 < x1 and y0 <= y + Y0 < y1 for (x0, y0, x1, y1, _) in CARS)
        if inCar: M[y, x, :3] = M[y, x, :3] * 0.9; continue
        M[y, x, :3] = (r * 0.42, g * 0.45, b * 0.62 + 12)
FY = Y(192)
rng = random.Random(1923)
F = M[FY:].copy(); FH0, EXT = F.shape[0], 300
band = F[4:FH0].copy(); bh = band.shape[0]
G = np.zeros((EXT, W, 4)); G[:, :, 3] = 255
for y in range(EXT):
    G[y] = band[(y + 3) % bh]
    G[y, :, :3] *= max(0.6, 1 - y * 0.0012)
for k in range(220): G[rng.randrange(EXT), rng.randrange(W), :3] = (70, 60, 70)
F = np.concatenate([F, G], axis=0)
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {"yard": {"file": save("yard", M[:FY]), "w": W, "h": FY, "car": [X(620), Y(80)], "carL": X(464), "carR": W, "roof": Y(82), "depot": [X(100), Y(72)]},
     "floor": {"file": save("floor", F), "w": W, "h": F.shape[0]}}
L = {"source": "Street Fighter (1987 arcade) — Joe's Stage background sheet (ripped by TonyWanKenobian); repainted as the Mugen Train at night", "pieces": P, "colors": {"skyTop": "#060a1e", "under": "#2a2430"}}
pv = Image.new("RGBA", (W, H), (14, 18, 44, 255)); pv.alpha_composite(Image.fromarray(np.clip(M, 0, 255).astype(np.uint8))); pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, W, H, FY)
