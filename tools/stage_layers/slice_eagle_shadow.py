# tools/stage_layers/slice_eagle_shadow.py — Eagle's Stage (Street Fighter, 1987 arcade; sheet ripped by TonyWanKenobian)
# → SHADOW GARDEN at night (The Eminence in Shadow).   python3 -I tools/stage_layers/slice_eagle_shadow.py <sheet.png> <repoRoot>
#   land = the hills, the castle on its hill, the bridge, the lakes and the ivy wall, repainted as one moonlit night palette
#   (navy → slate → silver; the water picks up the moon); floor = the dirt, night-lit, carried on toward the camera.
#   stageLayers.js (set "eagle_shadow") draws the sky, the moon, the castle's violet windows and the Shadow Garden itself.
import sys, os, json, random
import numpy as np
from PIL import Image
from scipy import ndimage as nd

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "eagle_shadow"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1, x0:x1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
X0, Y0, FY = 8, 16, 192
LAND = crop(X0, Y0, 776, FY)
NIGHT = [(6, 8, 20), (16, 22, 44), (34, 44, 76), (64, 78, 116), (112, 128, 168), (176, 190, 222)]
def pal(v):
    v = np.clip(v, 0, 0.999) * (len(NIGHT) - 1); i = v.astype(int); f = (v - i)[..., None]
    A = np.array(NIGHT, float); return A[i] * (1 - f) + A[np.minimum(i + 1, len(NIGHT) - 1)] * f
Lm = (0.3 * LAND[:, :, 0] + 0.55 * LAND[:, :, 1] + 0.15 * LAND[:, :, 2]) / 255
water = (LAND[:, :, 2] > LAND[:, :, 0] + 40) & (LAND[:, :, 2] > 150)
LAND[:, :, :3] = pal(Lm * 0.95)
LAND[water, :3] = pal(Lm[water] * 0.7)[:, :] * np.array([0.9, 1.0, 1.25])           # lakes: deep blue, lit by the moon in code
F = crop(X0, FY, 776, 238); FH, FW = F.shape[0], F.shape[1]
for y in range(FH):
    for x in range(FW):
        if F[y, x, 3] == 0 and y: F[y, x] = F[y - 1, x]
LF = (0.3 * F[:, :, 0] + 0.55 * F[:, :, 1] + 0.15 * F[:, :, 2]) / 255
F[:, :, :3] = pal(LF * 0.75)
EXT = 300; nr = np.random.default_rng(11); G = np.zeros((EXT, FW, 4)); G[:, :, 3] = 255
last = nd.gaussian_filter1d(F[FH - 6:, :, :3].mean(axis=0), 30, axis=0)
blot = nd.gaussian_filter(nr.random((EXT, FW)), 10)
for y in range(EXT):
    G[y, :, :3] = last * (1 - y * 0.0011) * (0.92 + 0.5 * (blot[y][:, None] - 0.5)) + nr.normal(0, 2.5, (FW, 1))
for k in range(500): y, x = nr.integers(EXT), nr.integers(FW); G[y, x:x + 3, :3] *= 0.7                     # pebbles
F = np.concatenate([F, G], axis=0)
P = {"land": {"file": save("land", LAND), "w": LAND.shape[1], "h": LAND.shape[0], "castle": [447, 10, 572, 92], "lakes": [[292, 145, 355], [442, 145, 605]]},
     "floor": {"file": save("floor", F), "w": FW, "h": F.shape[0]}}
L = {"source": "Street Fighter (1987 arcade) — Eagle's Stage sheet (ripped by TonyWanKenobian); repainted as a moonlit night for Shadow Garden", "pieces": P,
     "colors": {"skyTop": "#05060f", "under": "#141a2a"}}
pv = Image.new("RGBA", (FW, LAND.shape[0] + 30), (12, 14, 34, 255))
pv.alpha_composite(Image.open(os.path.join(out, "land.png"))); pv.alpha_composite(Image.open(os.path.join(out, "floor.png")).crop((0, 0, FW, 30)), (0, LAND.shape[0]))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, LAND.shape, F.shape)
