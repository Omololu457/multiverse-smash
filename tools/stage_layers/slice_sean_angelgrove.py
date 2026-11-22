# tools/stage_layers/slice_sean_angelgrove.py — Sao Paulo (Sean's Stage, Street Fighter III: 2nd Impact sheet) → ANGEL GROVE
# under monster attack (Power Rangers).   python3 -I tools/stage_layers/slice_sean_angelgrove.py <sheet.png> <repoRoot>
#   the wrecked street (car in the tree, spilled fruit) → the street: both key colours are transparent above the
#   street, and IN the street (the broken pavement) they become a dark crater; rows below the fruit pile → the
#   fighting floor, carried on toward the camera (synthesized asphalt, the crosswalk continued, scorch marks);
#   the sky layer's downtown towers → the far city where the Zords fight (drawn behind every copy of the street).
# Zords, monsters, Rangers, Krybots, civilians, explosions, smoke: stageLayers.js (set "sean_angelgrove").
import sys, os, json, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "sean_angelgrove"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
K1, K2 = (200, 192, 216), (152, 120, 216)
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy()
    key = np.all(t[:, :, :3] == K1, axis=2) | np.all(t[:, :, :3] == K2, axis=2)
    return t, key
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
B, key = crop(16, 48, 783, 415)                              # 768 × 368
Hh, Ww = B.shape[:2]
rng = random.Random(1993)
ROAD = 240                                                   # rows from here down are street: keyed pixels = crater
for y in range(Hh):
    for x in range(Ww):
        if not key[y, x]: continue
        if y >= ROAD:
            # crater: dark, with a lighter broken rim where it meets the pavement
            rim = any(0 <= y + dy < Hh and 0 <= x + dx < Ww and not key[y + dy, x + dx] for dy in (-2, 0, 2) for dx in (-2, 0, 2))
            v = 92 if rim else 34 + rng.randrange(0, 14)
            B[y, x, :3] = (v, v - 4, v - 6); B[y, x, 3] = 255
        else: B[y, x, 3] = 0
# open the end of the street: the distant buildings / palms / road signs there go, so the far city (the sky layer's
# towers) shows and the giant Zords + monsters stand in it (the wreck + the near buildings + the far traffic cover
# their legs). The street lamp's arm stays.
for y in range(0, 190):
    for x in range(292, 463):
        if 72 <= y <= 94 and x >= 404: continue
        B[y, x, 3] = 0
FY = 330
P = {"street": {"file": save("street", B[:FY]), "w": Ww, "h": FY, "gap": [385, 222], "lamp": [540, 80]}}
# the fighting floor: the crosswalk rows + synthesized asphalt toward the camera
Fl = B[FY:].copy()
road_col = np.median(Fl[-6:, 40:140, :3].reshape(-1, 3), axis=0)
EXT = 280
G = np.zeros((EXT, Ww, 4)); G[:, :, 3] = 255
for y in range(EXT):
    for x in range(Ww):
        n = rng.randrange(-10, 11); G[y, x, :3] = road_col * 0.82 + n
for y in range(EXT):                                         # the crosswalk's white bars carry on, widening
    for x in range(Ww):
        bar = ((x - 384) / (1 + y * 0.004)) % 64
        if y < 70 and 6 < bar < 34: G[y, x, :3] = np.minimum(255, G[y, x, :3] + 70)
for k in range(14):                                          # scorch marks + cracks
    cx, cy, r = rng.randrange(0, Ww), rng.randrange(20, EXT), rng.randrange(12, 30)
    for y in range(max(0, cy - r), min(EXT, cy + r)):
        for x in range(max(0, cx - r * 2), min(Ww, cx + r * 2)):
            d = ((x - cx) / 2) ** 2 + (y - cy) ** 2
            if d < r * r: G[y, x, :3] *= 0.55 + 0.45 * (d / (r * r))
for y in range(EXT): G[y, :, :3] *= max(0.7, 1 - y * 0.0011)
F = np.concatenate([Fl, G], axis=0)
P["floor"] = {"file": save("floor", F), "w": Ww, "h": F.shape[0]}
S_, _ = crop(16, 432, 783, 799)
P["sky"] = {"file": save("sky", S_), "w": S_.shape[1], "h": S_.shape[0], "horizon": 340}
L = {"source": "Street Fighter III: 2nd Impact — Sao Paulo (Sean's Stage) sheet (ripped by GeometricEntric); Angel Grove under monster attack",
     "pieces": P, "colors": {"skyTop": "#3a8af0", "under": "#5a5660"}}
pv = Image.new("RGBA", (Ww, Hh), (0, 0, 0, 255))
pv.alpha_composite(Image.fromarray(np.clip(S_, 0, 255).astype(np.uint8)), (0, 205 - 340))
pv.alpha_composite(Image.fromarray(np.clip(B, 0, 255).astype(np.uint8)))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out)
