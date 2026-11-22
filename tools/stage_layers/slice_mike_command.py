# tools/stage_layers/slice_mike_command.py — Mike's Stage (Street Fighter, 1987 arcade background sheet, ripped by
# TonyWanKenobian) → the POWER RANGERS COMMAND CENTER in the desert outside Angel Grove.
#   python3 -I tools/stage_layers/slice_mike_command.py <sheet.png> <repoRoot>
#   The carved rock (Mount Rushmore) is removed entirely — only the open orange desert floor + the cliff ledges at the ends
#   are kept; stageLayers.js (set "mike_command") draws the Command Center on its own rocky hill, the distant mesas, the
#   sky (the sheet's sky strip). Desert sand carried on toward the camera.
import sys, os, json, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "mike_command"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
X0, Y0 = 8, 4
M = crop(X0, Y0, 775, 239); H, W = M.shape[:2]
rng = random.Random(1993)
# the whole carved rock goes (it was Mount Rushmore): every unsaturated pixel (rock, faces, scree) between the far
# hills is cut away, leaving the open desert floor; the Command Center's own hill is drawn by stageLayers.js
import colorsys
for y in range(H):
    for x in range(W):
        r, g, b, a = M[y, x]
        if not a: continue
        h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if (s_ < 0.8 or v < 0.62) and 40 <= x <= W - 40: M[y, x, 3] = 0
        if y < 190: M[y, x, 3] = 0                                            # open desert horizon (the mesas are drawn in code)
CX0, CX1 = 236 - X0, 545 - X0
PLAT = 205 - Y0
FY = 200 - Y0
F = M[FY:].copy(); FH0, EXT = F.shape[0], 280
sand = F[FH0 - 22:FH0 - 2, :, :3].reshape(-1, 3)
nr = np.random.default_rng(1993)
for y in range(F.shape[0]):                                                   # the rock's foot in the ground rows → sand
    for x in range(W):
        if F[y, x, 3] == 0: F[y, x, :3] = sand[nr.integers(len(sand))]; F[y, x, 3] = 255
G = np.zeros((EXT, W, 4)); G[:, :, 3] = 255
G[:, :, :3] = sand[nr.integers(0, len(sand), size=(EXT, W))]
lo = nr.random((EXT // 24 + 2, W // 48 + 2))
yy, xx = np.mgrid[0:EXT, 0:W]; fy, fx = yy / 24, xx / 48; y0_, x0_ = fy.astype(int), fx.astype(int); ty, tx = fy - y0_, fx - x0_
n = lo[y0_, x0_] * (1 - ty) * (1 - tx) + lo[y0_ + 1, x0_] * ty * (1 - tx) + lo[y0_, x0_ + 1] * (1 - ty) * tx + lo[y0_ + 1, x0_ + 1] * ty * tx
G[:, :, :3] *= (0.82 + 0.26 * n)[:, :, None]
for k in range(60):                                                          # pebbles + scrub
    cx, cy = rng.randrange(W), rng.randrange(EXT)
    if rng.random() < 0.3:
        for i in range(6): 
            x2, y2 = cx + rng.randrange(-4, 5), cy - rng.randrange(0, 5)
            if 0 <= x2 < W and 0 <= y2 < EXT: G[y2, x2, :3] = (110, 100, 40)
    else:
        for dy in range(-1, 2):
            for dx in range(-2, 3):
                if 0 <= cy + dy < EXT and 0 <= cx + dx < W: G[cy + dy, cx + dx, :3] = (150, 90, 40) if dy < 1 else (100, 56, 24)
for y in range(EXT): G[y, :, :3] *= max(0.72, 1 - y * 0.001)
F = np.concatenate([F, G], axis=0)
SKY = crop(8, 248, 779, 431)
P = {"rock": {"file": save("rock", M[:FY]), "w": W, "h": FY, "cc": [(CX0 + CX1) // 2, PLAT], "domes": [[150 - X0, 20], [600 - X0, 34]]},
     "floor": {"file": save("floor", F), "w": W, "h": F.shape[0]},
     "sky": {"file": save("sky", SKY), "w": SKY.shape[1], "h": SKY.shape[0]}}
L = {"source": "Street Fighter (1987 arcade) — Mike's Stage background sheet (ripped by TonyWanKenobian); the faces chiselled off → the Command Center's rock in the desert", "pieces": P,
     "colors": {"skyTop": "#3a7ae0", "under": "#c87a2a"}}
pv = Image.new("RGBA", (W, H), (120, 170, 240, 255)); pv.alpha_composite(Image.fromarray(np.clip(SKY, 0, 255).astype(np.uint8)).resize((W, H)))
pv.alpha_composite(Image.fromarray(np.clip(M, 0, 255).astype(np.uint8))); pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, W, H)
