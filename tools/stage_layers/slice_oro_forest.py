# tools/stage_layers/slice_oro_forest.py — Oro's / Amazon stage (Street Fighter III, background sheet ripped by GeometricEntric)
# → THE FOREST OF DEATH (Naruto, Training Ground 44).   python3 -I tools/stage_layers/slice_oro_forest.py <sheet.png> <repoRoot>
#   hollow = the cave repainted as the hollow under a giant tree's roots (rust rock → bark, lit edges → moss), the black
#   void above it cut away, the glowing pillar dimmed to bark; its window openings stay open. floor = the cave floor
#   repainted as forest earth + moss, carried on toward the camera. stageLayers.js (set "oro_forest") draws the forest
#   seen through the windows and the giant trunks + canopy above the hollow.
import sys, os, json, colorsys, random
import numpy as np
from PIL import Image
from scipy import ndimage

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "oro_forest"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[5, 600, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.abs(t[:, :, :3] - KEY).sum(axis=2) < 90, 3] = 0; t[np.all(t[:, :, :3] == (90, 105, 140), axis=2), 3] = 0; return t   # key, its fringe, and the 2nd key (the window fill)
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
BARK = [(22, 16, 12), (52, 36, 24), (92, 64, 40), (126, 96, 60), (118, 138, 62), (170, 186, 96)]
EARTH = [(20, 18, 12), (44, 36, 22), (74, 58, 34), (92, 96, 48), (128, 140, 70)]
def pal(P, v):
    v = max(0, min(0.999, v)) * (len(P) - 1); i = int(v); f = v - i; a, b = P[i], P[min(i + 1, len(P) - 1)]
    return np.array([a[k] + (b[k] - a[k]) * f for k in range(3)])
def lum(t): return (0.3 * t[:, :, 0] + 0.55 * t[:, :, 1] + 0.15 * t[:, :, 2]) / 255

C = crop(144, 48, 911, 495); H, W = C.shape[:2]
dark = (C[:, :, :3].max(axis=2) < 30) & (C[:, :, 3] > 0)
lab, n = ndimage.label(dark)
top = set(np.unique(lab[0])) | set(np.unique(lab[:, -1])) - {0}
void = np.isin(lab, [l for l in top if l]) ; C[void, 3] = 0                          # the black void above the cave → open
L = lum(C)
glow = (C[:, :, 0] > 220) & (C[:, :, 1] > 170)                                        # the glowing pillar → plain bark
for y in range(H):
    for x in range(W):
        if C[y, x, 3] == 0: continue
        v = L[y, x] * (0.55 if glow[y, x] else 1.0)
        C[y, x, :3] = pal(BARK, v * 1.05)
# soften the cut edge of the void a touch (no hard black fringe)
ed = ndimage.binary_dilation(C[:, :, 3] == 0) & (C[:, :, 3] > 0); C[ed, :3] *= 0.85

F = crop(16, 496, 1039, 559); FH = F.shape[0]; FW = F.shape[1]
LF = lum(F)
for y in range(FH):
    for x in range(FW):
        if F[y, x, 3]: F[y, x, :3] = pal(EARTH, LF[y, x] * 1.1)
EXT = 300; rng = random.Random(44)
G = np.zeros((EXT, FW, 4)); G[:, :, 3] = 255
base = F[FH // 2:].copy(); bh = base.shape[0]
for y in range(EXT):
    sc = 1 + y / 90; src = base[int((y / sc) % bh)]; xs = (np.arange(FW) / sc).astype(int) % FW; G[y, :, :3] = src[xs, :3]
for k in range(900):                                                                   # leaf litter + moss tufts
    y, x = rng.randrange(EXT), rng.randrange(FW); G[y:y + 2, x:x + 3, :3] = [(60, 82, 30), (96, 70, 30), (120, 130, 50)][k % 3]
for y in range(EXT): G[y, :, :3] *= max(0.6, 1 - y * 0.0013)
F = np.concatenate([F, G], axis=0)
P = {"hollow": {"file": save("hollow", C), "w": W, "h": H},
     "floor": {"file": save("floor", F), "w": FW, "h": F.shape[0]}}
L = {"source": "Street Fighter III — Oro's (Amazon) stage background sheet (ripped by GeometricEntric); repainted as the Forest of Death", "pieces": P,
     "colors": {"skyTop": "#0e1a0c", "under": "#2a2416"}}
pv = Image.new("RGBA", (W, H + 60), (20, 40, 18, 255))
pv.alpha_composite(Image.open(os.path.join(out, "hollow.png")))
pv.alpha_composite(Image.open(os.path.join(out, "floor.png")).crop((128, 0, 128 + W, 60)), (0, H))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, W, H, FW, F.shape[0])
