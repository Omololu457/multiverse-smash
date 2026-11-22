# tools/stage_layers/slice_retsu_arlong.py — Retsu's Stage (Street Fighter, 1987 arcade background sheet) → ARLONG PARK
# (One Piece).   python3 -I tools/stage_layers/slice_retsu_arlong.py <sheet.png> <repoRoot>
#   the temple wall, gate and stone lanterns → Arlong Park's walls (the teal roof tiles repainted Arlong red);
#   the autumn trees → tangerine trees (green, dotted with fruit); the pagoda → ARLONG'S TOWER, cut out as its own
#   piece so the game can crack and topple it; the courtyard + stone path → the floor; the cloud strip → the sky.
# The ripper credit is left out. The sea beyond the wall, the sea cow, the fish-men, the villagers, the sign, the shark
# flags and the tower's collapse are drawn by stageLayers.js (set "retsu_arlong").
import sys, os, json, colorsys
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "retsu_arlong"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
M = crop(8, 16, 775, 239)                                   # 768 × 224
Hh, Ww = M.shape[:2]
# the pagoda → its own piece (cut out of the main picture)
TX0, TX1, TY1 = 518, 634, 112
tower = np.zeros((TY1 + 1, TX1 - TX0 + 1, 4)); tower[:] = M[:TY1 + 1, TX0:TX1 + 1]
for y in range(TY1 + 1):
    for x in range(TX0, TX1 + 1):
        r, g, b, a = M[y, x]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        foliage = 0.02 <= h <= 0.12 and s > 0.55 and (x > 620 or x < 528)   # tree leaves at the tower's sides stay
        if a and not foliage: M[y, x, 3] = 0
        else: tower[y, x - TX0, 3] = 0
def recolor(t, y0=0):
    H, W = t.shape[:2]
    for y in range(H):
        for x in range(W):
            r, g, b, a = t[y, x]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); hd = h * 360; yy = y + y0
            if 150 <= hd <= 200 and s > 0.15 and yy < 128:                    # teal roof tiles → Arlong red
                nr, ng, nb = colorsys.hsv_to_rgb(2 / 360, min(1, s * 1.4 + 0.25), v * 0.95)
                t[y, x, :3] = (nr * 255, ng * 255, nb * 255)
            elif (hd >= 330 or hd <= 45) and s > 0.35 and yy < 122 and (x < 270 or x > 600):   # autumn leaves → tangerine trees
                if ((x * 7 + yy * 13) % 37) == 0 and v > 0.6: t[y, x, :3] = (255, 150, 30)       # fruit
                else:
                    nr, ng, nb = colorsys.hsv_to_rgb((95 + ((hd + 30) % 360 - 55) * 0.6) / 360, s * 0.85, v * 0.85)
                    t[y, x, :3] = (nr * 255, ng * 255, nb * 255)
    return t
M = recolor(M)
# the tower: its gold roofs → Arlong red, teal trim → dark red; the wood stays
for y in range(tower.shape[0]):
    for x in range(tower.shape[1]):
        r, g, b, a = tower[y, x]
        if not a: continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); hd = h * 360
        if (20 <= hd <= 60 and s > 0.45) or (150 <= hd <= 200 and s > 0.15):
            nr, ng, nb = colorsys.hsv_to_rgb(2 / 360, min(1, s * 1.2 + 0.2), v * (0.95 if hd < 100 else 0.7))
            tower[y, x, :3] = (nr * 255, ng * 255, nb * 255)
FY = 188
# tangerines: spots on the green tree crowns (so the game never hangs fruit in the open sky)
fruit = []
for y in range(14, 118, 7):
    for x in list(range(4, 268, 9)) + list(range(604, 766, 9)):
        r, g, b, a = M[y, x]
        if a and g > r * 1.1 and g > b * 1.2 and ((x * 31 + y * 17) % 5 == 0): fruit.append([x, y])
# the courtyard runs on toward the camera: the gravel + the stone path continue down past the bottom of the screen,
# and the red leaf piles (read as blood in the game) become brown fallen leaves
F = M[FY:].copy()
for y in range(F.shape[0]):
    for x in range(F.shape[1]):
        r, g, b, a = F[y, x]
        h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); hd = h * 360
        if a and (hd >= 330 or hd <= 18) and s_ > 0.5:
            nr, ng, nb = colorsys.hsv_to_rgb(32 / 360, 0.6, v * 0.75); F[y, x, :3] = (nr * 255, ng * 255, nb * 255)
# synthesize the near courtyard: random gravel patches cut from clean ground + the stone path, straight and widening
import random
rng = random.Random(1997)
FH0, EXT = F.shape[0], 300
teal = lambda px: px[1] > px[0] * 1.05 and px[2] > px[0] * 1.05
last = F[FH0 - 1]; cols = [x for x in range(Ww) if teal(last[x])]
pl, pr = (min(cols), max(cols)) if cols else (Ww // 2 - 60, Ww // 2 + 60)
gx0 = 90; gx1 = pl - 16                                            # clean gravel: between the leaf piles and the path
gravel = F[10:FH0 - 2, gx0:gx1].copy(); stone = F[FH0 - 16:FH0, 320:448].copy()
G = np.zeros((EXT, Ww, 4)); G[:, :, 3] = 255
gh, gw = gravel.shape[:2]
for y in range(0, EXT, 8):
    for x in range(0, Ww, 16):
        sy, sx = rng.randrange(0, gh - 8), rng.randrange(0, gw - 16)
        G[y:y + 8, x:x + 16] = gravel[sy:sy + 8, sx:sx + 16][:min(8, EXT - y), :min(16, Ww - x)]
sh, sw = stone.shape[:2]
for y in range(EXT):
    grow = y * 0.55; L_ = int(pl - grow); R_ = int(pr + grow)
    for x in range(max(0, L_), min(Ww, R_)):
        G[y, x] = stone[y % sh, (x - L_) % sw]
    for x in (L_, L_ + 1, R_ - 2, R_ - 1):                           # dark edge stones
        if 0 <= x < Ww: G[y, x, :3] *= 0.55
for y in range(EXT): G[y, :, :3] *= max(0.7, 1 - y * 0.0012)       # a touch darker toward the camera
F = np.concatenate([F, G], axis=0)
P = {"wall": {"file": save("wall", M[:FY]), "w": Ww, "h": FY, "gate": [384, 150], "sign": [384, 104], "tower": [TX0, TY1], "fruit": fruit},
     "floor": {"file": save("floor", F), "w": Ww, "h": F.shape[0]},
     "tower": {"file": save("tower", tower), "w": tower.shape[1], "h": tower.shape[0]},
     "sky": {"file": save("sky", crop(8, 256, 903, 399)), "w": 896, "h": 144}}
L = {"source": "Street Fighter (1987 arcade) — Retsu's Stage background sheet (ripped by TonyWanKenobian); repainted as Arlong Park", "pieces": P,
     "colors": {"skyTop": "#4a9ae8", "under": "#a07848", "seaBottom": "#b08850"}}
pv = Image.new("RGBA", (Ww, Hh), (110, 180, 240, 255))
pv.alpha_composite(Image.fromarray(np.clip(tower, 0, 255).astype(np.uint8)), (TX0, 0)); pv.alpha_composite(Image.fromarray(np.clip(M, 0, 255).astype(np.uint8)))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out)
