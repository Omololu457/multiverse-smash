# tools/stage_layers/slice_adon_viltrum.py — Adon's Stage (Street Fighter, 1987 arcade background sheet, ripped by
# TonyWanKenobian) → the VILTRUMITE BATTLEGROUND (Invincible).   python3 -I tools/stage_layers/slice_adon_viltrum.py <sheet.png> <repoRoot>
#   the seated statue is CUT OUT (it is a real religious figure — not repainted into anything) and the gap is filled with
#   the mountains beside it; a giant Viltrumite warrior statue is drawn in its place by stageLayers.js (set "adon_viltrum").
#   grass → scorched ash; palms → dead, charred; the orange lake → a cracked field of embers; the stone ruins and the
#   stupa → weathered grey ruins; mountains → dark red rock. The sunset sky piece is kept (pushed redder) as the sky.
import sys, os, json, colorsys, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "adon_viltrum"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def hsv(r, g, b): h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); return h * 360, s, v
def rgb(h, s, v): r, g, b = colorsys.hsv_to_rgb((h % 360) / 360, max(0, min(1, s)), max(0, min(1, v))); return (r * 255, g * 255, b * 255)
X0, Y0 = 8, 60
M = crop(X0, Y0, 775, 239); H, W = M.shape[:2]
# 1. the seated statue out: rows above its base copied from the mountains 150 px to the right
SX0, SX1, SY0, SY1 = 358, 426, 64, 159          # sheet coords
for y in range(SY0 - Y0, SY1 - Y0):
    for x in range(SX0 - X0, SX1 - X0): M[y, x] = M[y, x + 150]
# 2. repaint
for y in range(H):
    for x in range(W):
        r, g, b, a = M[y, x]
        if not a: continue
        hd, s, v = hsv(r, g, b)
        if 50 <= hd <= 140 and s > 0.25:                                    # grass + palm leaves → ash / charred
            M[y, x, :3] = rgb(20, s * 0.25, v * (0.55 if y < 130 else 0.7))
        elif (hd <= 40 or hd >= 340) and s > 0.45 and v > 0.45 and 112 <= y <= 150 and 48 <= x <= 585:   # the orange lake → embers
            M[y, x, :3] = rgb(14 + 14 * ((x * 7 + y * 3) % 5 == 0), 0.9, min(1, v * 1.05)) if (x * 13 + y * 7) % 3 else (60, 20, 16)
        elif y < 110 and 0 <= hd <= 30 and s > 0.3 and v < 0.75:              # mountains → dark red rock
            M[y, x, :3] = rgb(4, s * 0.8, v * 0.62)
        else:                                                                # stone, ground → weathered, cooler
            M[y, x, :3] = rgb(hd, s * 0.45, v * 0.82)
FY = 150 - 0
rng = random.Random(4242)
F = M[FY:].copy(); FH0, EXT = F.shape[0], 300
ground = F[FH0 - 22:FH0 - 2].copy(); gh = ground.shape[0]
G = np.zeros((EXT, W, 4)); G[:, :, 3] = 255
pix = ground[:, :, :3].reshape(-1, 3)                                         # per-pixel grain from the sheet's own ground (no visible tiles)
nr = np.random.default_rng(4242)
G[:, :, :3] = pix[nr.integers(0, len(pix), size=(EXT, W))]
lo = nr.random((EXT // 20 + 2, W // 40 + 2))                                   # broad light / dark patches
yy, xx = np.mgrid[0:EXT, 0:W]; fy, fx = yy / 20, xx / 40; y0_, x0_ = fy.astype(int), fx.astype(int); ty, tx = fy - y0_, fx - x0_
n = lo[y0_, x0_] * (1 - ty) * (1 - tx) + lo[y0_ + 1, x0_] * ty * (1 - tx) + lo[y0_, x0_ + 1] * (1 - ty) * tx + lo[y0_ + 1, x0_ + 1] * ty * tx
G[:, :, :3] *= (0.78 + 0.3 * n)[:, :, None]
for k in range(70):                                                           # scattered rocks
    cx, cy, r = rng.randrange(W), rng.randrange(EXT), rng.randrange(2, 5)
    for dy in range(-r, r + 1):
        for dx in range(-r - 1, r + 2):
            if 0 <= cy + dy < EXT and 0 <= cx + dx < W and dx * dx / 1.4 + dy * dy <= r * r: G[cy + dy, cx + dx, :3] = (70, 58, 52) if dy < 0 else (44, 36, 32)
for k in range(40):                                                          # glowing cracks in the ground
    x, y = rng.randrange(W), rng.randrange(20, EXT); L = rng.randrange(10, 40); dx = rng.choice([-1, 1])
    for i in range(L):
        yy, xx = y + i // 2, x + dx * i + rng.randrange(-1, 2)
        if 0 <= yy < EXT and 0 <= xx < W: G[yy, xx, :3] = (230, 90, 30) if i % 4 else (255, 170, 60)
for y in range(EXT): G[y, :, :3] *= max(0.6, 1 - y * 0.0013)
F = np.concatenate([F, G], axis=0)
SKY = crop(8, 248, 779, 431)
for y in range(SKY.shape[0]):
    for x in range(SKY.shape[1]):
        r, g, b, a = SKY[y, x]
        if a: hd, s, v = hsv(r, g, b); SKY[y, x, :3] = rgb(hd * 0.35, min(1, s * 1.1), v * 0.85)
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {"ruins": {"file": save("ruins", M[:FY]), "w": W, "h": FY, "statue": [(SX0 + SX1) // 2 - X0, 160 - Y0], "stupa": [690 - X0, 64 - Y0], "pillars": [[38, 74], [62, 86], [78, 94], [90, 102], [218, 102], [228, 94], [250, 86], [268, 74]]},
     "floor": {"file": save("floor", F), "w": W, "h": F.shape[0]}, "sky": {"file": save("sky", SKY), "w": SKY.shape[1], "h": SKY.shape[0], "horizon": SKY.shape[0]}}
L = {"source": "Street Fighter (1987 arcade) — Adon's Stage background sheet (ripped by TonyWanKenobian); repainted as the Viltrumite battleground", "pieces": P,
     "colors": {"skyTop": "#3a0a08", "under": "#3a2a26"}}
pv = Image.new("RGBA", (W, H), (150, 50, 30, 255)); pv.alpha_composite(Image.fromarray(np.clip(SKY[:H, :W], 0, 255).astype(np.uint8)).resize((W, H))); pv.alpha_composite(Image.fromarray(np.clip(M, 0, 255).astype(np.uint8)))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, W, H)
