# tools/stage_layers/slice_yun_yorknew.py — Hong Kong (Yun's Stage, Street Fighter III: New Generation; sheet ripped by
# GeometricEntric) → YORKNEW CITY's market district (Hunter x Hunter).   python3 -I tools/stage_layers/slice_yun_yorknew.py <sheet.png> <repoRoot>
#   street = the main painted layer (its sky gap left open); far = the distant towers; sky = the sky strip; the street's
#   pavement + tram rails are carried on toward the camera. The skyline, the auction tower, the blimp, the Phantom Troupe,
#   the mafia, the crowd and Kurapika's chains are drawn by stageLayers.js (set "yun_yorknew").
import sys, os, json, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "yun_yorknew"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(np.abs(t[:, :, :3] - KEY) < 2, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
M = crop(16, 48, 783, 559); H, W = M.shape[:2]
FY = 452
F = M[FY:].copy(); FH0, EXT = F.shape[0], 260
rng = random.Random(1999)
band = F[FH0 - 14:FH0 - 2].copy()
for x in list(range(250, 292)) + list(range(400, 446)): band[:, x] = band[:, x - 50] if x < 300 else band[:, x + 50]   # rails painted out
# pavement texture from the bottom rows with the rails painted out (median across columns per row-block)
G = np.zeros((EXT, W, 4)); G[:, :, 3] = 255
base = band[:, :, :3].mean(axis=0)                                              # one smooth colour per column…
k = np.ones(41) / 41; base = np.stack([np.convolve(np.pad(base[:, c], 20, mode="edge"), k, mode="valid") for c in range(3)], axis=1)
nr = np.random.default_rng(1999)
lo = nr.random((EXT // 30 + 2, W // 60 + 2))
yy, xx = np.mgrid[0:EXT, 0:W]; fy, fx = yy / 30, xx / 60; y0_, x0_ = fy.astype(int), fx.astype(int); ty, tx = fy - y0_, fx - x0_
n = lo[y0_, x0_] * (1 - ty) * (1 - tx) + lo[y0_ + 1, x0_] * ty * (1 - tx) + lo[y0_, x0_ + 1] * (1 - ty) * tx + lo[y0_ + 1, x0_ + 1] * ty * tx
G[:, :, :3] = base[None, :, :] * np.array([1.06, 1.02, 0.97]) * (0.88 + 0.18 * n)[:, :, None] + nr.normal(0, 3, (EXT, W, 1))   # …soft light patches + fine grain
last = F[FH0 - 1, :, :3]
for y in range(8): G[y, :, :3] = last * (1 - y / 8) + G[y, :, :3] * (y / 8)                # blend out of the painting
# rails: continue the two rails from the last row of the sheet (they diverge toward the camera)
A = M[:, :, :3].sum(axis=2)
def railx(y):
    row = A[y, 250:560]; xs = np.where(row < 160)[0] + 250; return xs
for (x_end, slope) in [(261, -1.79), (274, -1.79), (413, -0.93), (426, -0.93)]:
    for y in range(EXT):
        x = int(x_end + slope * (y + 1))
        for dx in range(-1, 3 + y // 90):
            if 0 <= x + dx < W: G[y, x + dx, :3] = (44, 40, 46) if dx < 1 + y // 90 else (150, 140, 150)
for y in range(EXT): G[y, :, :3] *= max(0.7, 1 - y * 0.0011)
F = np.concatenate([F, G], axis=0)
FAR = crop(800, 304, 991, 559); SKY = crop(16, 576, 789, 1099)
P = {"street": {"file": save("street", M[:FY]), "w": W, "h": FY, "gap": [455, 392], "roofs": [[40, 314], [135, 314], [232, 318], [455, 320], [668, 108]], "stalls": [[110, 420], [340, 425], [640, 430]]},
     "floor": {"file": save("floor", F), "w": W, "h": F.shape[0]},
     "far": {"file": save("far", FAR), "w": FAR.shape[1], "h": FAR.shape[0]},
     "sky": {"file": save("sky", SKY), "w": SKY.shape[1], "h": SKY.shape[0]}}
L = {"source": "Street Fighter III: New Generation — Hong Kong (Yun's Stage) sheet (ripped by GeometricEntric); Yorknew City market district", "pieces": P,
     "colors": {"skyTop": "#4a86e8", "under": "#b8a8a8"}}
pv = Image.new("RGBA", (W, H), (110, 160, 235, 255))
pv.alpha_composite(Image.fromarray(np.clip(FAR, 0, 255).astype(np.uint8)), (455 - FAR.shape[1] // 2, 392 - FAR.shape[0]))
pv.alpha_composite(Image.fromarray(np.clip(M, 0, 255).astype(np.uint8))); pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, W, H, "rails@last", railx(H - 1)[:12])
