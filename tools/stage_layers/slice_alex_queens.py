# tools/stage_layers/slice_alex_queens.py — New York (Alex's stage, Street Fighter III: New Generation; sheet ripped by
# GeometricEntric) → QUEENS ALLEY (Marvel / Spider-Man).   python3 -I tools/stage_layers/slice_alex_queens.py <sheet.png> <repoRoot>
#   alley = the graffiti walk-up with the fire escape (the centrepiece); right = the tan corner building; far = the street
#   seen through the gap; floor = the snowy alley floor carried on toward the camera. stageLayers.js (set "alex_queens")
#   draws the skyline, more walk-ups on both sides (so no art edge ever shows), snow, steam, the city.
import sys, os, json, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "alex_queens"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEYS = [(176, 185, 224), (90, 105, 140)]
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1, x0:x1].copy()
    for k in KEYS: t[np.all(t[:, :, :3] == k, axis=2), 3] = 0
    return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
FY = 496                                                   # the alley floor starts here (sheet row)
alley = crop(96, 48, 792, FY)                              # arch + the graffiti building + the pipe building
right = crop(800, 48, 960, FY)                             # the tan corner building
far = crop(1056, 180, 1312, 560); far = far[: FY - 180 + 40]
F = crop(16, FY, 1040, 560); FH, FW = F.shape[0], F.shape[1]
for y in range(FH):                                        # fill any transparent floor pixels from the row above
    for x in range(FW):
        if F[y, x, 3] == 0 and y: F[y, x] = F[y - 1, x]
EXT, rng = 300, random.Random(7)
G = np.zeros((EXT, FW, 4)); G[:, :, 3] = 255
snow, slush = np.array([226, 226, 238.]), np.array([150, 130, 140.])
nrng = np.random.default_rng(7)
blot = nrng.random((EXT // 6 + 2, FW // 24 + 2)); blot = np.kron(blot, np.ones((6, 24)))[:EXT, :FW]                 # soft slush patches
from scipy import ndimage as _nd
blot = _nd.gaussian_filter(blot, 14)
for y in range(EXT):
    k = np.clip((blot[y] - 0.5) * 4, 0, 0.3)[:, None]
    G[y, :, :3] = snow * (1 - k) + slush * k + nrng.normal(0, 4, (FW, 1))
for tx in (180, 260, 700, 780):                                                                                       # tyre tracks in the slush
    for y in range(EXT): x = int(tx + y * 0.05); G[y, x:x + 10, :3] = G[y, x:x + 10, :3] * 0.8 + slush * 0.2
for k in range(700): y, x = rng.randrange(EXT), rng.randrange(FW); G[y, x:x + 2, :3] = (244, 244, 252)      # fresh snow flecks
blend = 40                                                                                                            # ease from the art into the pavement
last = _nd.gaussian_filter1d(F[FH - 6:FH, :, :3].mean(axis=0), 30, axis=0)
for y in range(blend): G[y, :, :3] = G[y, :, :3] * (y / blend) + last * (1 - y / blend)
for y in range(EXT): G[y, :, :3] *= max(0.7, 1 - y * 0.001)
F = np.concatenate([F, G], axis=0)
P = {"alley": {"file": save("alley", alley), "w": alley.shape[1], "h": alley.shape[0]},
     "right": {"file": save("right", right), "w": right.shape[1], "h": right.shape[0]},
     "far": {"file": save("far", far), "w": far.shape[1], "h": far.shape[0]},
     "floor": {"file": save("floor", F), "w": FW, "h": F.shape[0]}}
L = {"source": "Street Fighter III: New Generation — New York (Alex stage) sheet (ripped by GeometricEntric)", "pieces": P,
     "colors": {"skyTop": "#6a5ab8", "under": "#3a3040"}}
pv = Image.new("RGBA", (800 + 160, FY - 48 + 40), (120, 110, 200, 255))
pv.alpha_composite(Image.open(os.path.join(out, "far.png")), (690, 132))
pv.alpha_composite(Image.open(os.path.join(out, "alley.png")), (0, 0)); pv.alpha_composite(Image.open(os.path.join(out, "right.png")), (800, 0))
pv.alpha_composite(Image.open(os.path.join(out, "floor.png")).crop((0, 0, 960, 40)), (0, FY - 48))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
