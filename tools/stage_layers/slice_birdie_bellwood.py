# tools/stage_layers/slice_birdie_bellwood.py — Birdie's Stage (Street Fighter, 1987 arcade background sheet) → BELLWOOD
# (Ben 10): a quiet main street.   python3 -I tools/stage_layers/slice_birdie_bellwood.py <sheet.png> <repoRoot>
#   the shop row → Bellwood's main street (the BLOCK HEADS pub sign cleared for MR. SMOOTHY, the graffiti on the roll-down
#   shutter cleaned off); the pavement → the sidewalk; a curb + the road are synthesized toward the camera (the fight
#   happens in the street); the cloud strip → the sky (warmed toward a sunny day).
# The neighbours, the Mr. Smoothy sign + cup, the distant houses + water tower, the car alarm, the police car and the
# crowd's reactions are drawn by stageLayers.js (set "birdie_bellwood"). The ripper credit is left out of the art.
import sys, os, json, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "birdie_bellwood"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
M = crop(8, 16, 775, 239)                                    # 768 × 224
Hh, Ww = M.shape[:2]
# 1. the roll-down shutter: every slat row takes the colour of its clean left edge (graffiti gone)
SX0, SX1, SY0, SY1, CLEAN = 386, 474, 112, 182, 385
for y in range(SY0, SY1 + 1): M[y, SX0:SX1 + 1] = M[y, CLEAN]
# 2. the pub sign band: the dark lettering → the sign's own stone colour (row median of the light pixels)
GX0, GX1, GY0, GY1 = 298, 476, 86, 102
for y in range(GY0, GY1 + 1):
    row = M[y, GX0:GX1 + 1, :3]; lum = row.sum(axis=1); med = np.median(row[lum > np.percentile(lum, 55)], axis=0)
    for x in range(GX0, GX1 + 1):
        if M[y, x, :3].sum() < med.sum() - 40: M[y, x, :3] = med
FY = 184
P = {}
P["street"] = {"file": save("street", M[:FY]), "w": Ww, "h": FY, "sign": [(GX0 + GX1) // 2, (GY0 + GY1) // 2, GX1 - GX0, GY1 - GY0],
               "roof": [(GX0 + GX1) // 2, 8], "car": [214, 178], "shutter": [SX0, SY0, SX1, SY1]}
# 3. sidewalk (the sheet's pavement) + a curb + the road, synthesized on toward the camera
side = M[FY:].copy(); rng = random.Random(1946)
CURB, ROAD = 8, 300
curb = np.zeros((CURB, Ww, 4)); curb[:, :, 3] = 255
for y in range(CURB): curb[y, :, :3] = (206, 200, 190) if y < 3 else (150, 144, 136) if y < 6 else (70, 66, 62)
road = np.zeros((ROAD, Ww, 4)); road[:, :, 3] = 255
for y in range(ROAD):
    for x in range(Ww):
        v = 78 + rng.randrange(-9, 10) + (8 if ((x * 13 + y * 7) % 23 == 0) else 0)
        road[y, x, :3] = (v, v, v + 4)
for y in range(118, 124):                                    # the dashed yellow centre line
    for x in range(Ww):
        if (x // 40) % 2 == 0: road[y, x, :3] = (226, 192, 60)
for k in range(9):                                           # a few patched cracks
    x, y = rng.randrange(20, Ww - 20), rng.randrange(10, ROAD - 10)
    for i in range(30): x += rng.choice((-1, 0, 1)); y += 1; road[min(ROAD - 1, y), max(0, min(Ww - 1, x)), :3] = (48, 48, 52)
for y in range(ROAD): road[y, :, :3] *= max(0.75, 1 - y * 0.001)
F = np.concatenate([side, curb, road], axis=0)
P["floor"] = {"file": save("floor", F), "w": Ww, "h": F.shape[0], "sidewalk": [0, Hh - FY], "curb": Hh - FY}
# 4. the cloud strip, warmed toward a sunny afternoon
sky = crop(8, 256, 903, 399)
sky[:, :, 0] = sky[:, :, 0] * 0.92 + 14; sky[:, :, 1] = sky[:, :, 1] * 0.96 + 10; sky[:, :, 2] = np.minimum(255, sky[:, :, 2] * 1.0 + 24)
P["sky"] = {"file": save("sky", sky), "w": sky.shape[1], "h": sky.shape[0]}
L = {"source": "Street Fighter (1987 arcade) — Birdie's Stage background sheet (ripped by TonyWanKenobian); repainted as Bellwood's main street",
     "pieces": P, "colors": {"skyTop": "#6aaef0", "under": "#4e4e52"}}
pv = Image.new("RGBA", (Ww, FY + 60), (120, 180, 240, 255))
pv.alpha_composite(Image.fromarray(np.clip(M[:FY], 0, 255).astype(np.uint8))); pv.alpha_composite(Image.fromarray(np.clip(F[:60], 0, 255).astype(np.uint8)), (0, FY))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out)
