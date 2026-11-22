# tools/stage_layers/slice_retsu_seireitei.py — Retsu's Stage (Street Fighter, 1987 arcade background sheet) → the
# SEIREITEI, Soul Society (Bleach).   python3 -I tools/stage_layers/slice_retsu_seireitei.py <sheet.png> <repoRoot>
# (The same sheet as Arlong Park, repainted the other way: this one keeps the white walls.)
#   teal roof tiles → Seireitei slate; the autumn trees → sakura; the gold pagoda → a white Seireitei tower; the orange
#   courtyard gravel → pale stone, the teal path → grey flagstones, the red leaf piles → fallen sakura petals; the
#   courtyard is carried on toward the camera. The sky, Sōkyoku Hill + the halberd, the Senzaikyū, the far rooftops,
#   Soul Reapers, hell butterflies, petals, the gate's light, the Garganta + Menos and the Sōkyoku's phoenix are drawn
#   by stageLayers.js (set "retsu_seireitei").
import sys, os, json, colorsys, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "retsu_seireitei"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
def hsv(r, g, b): h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); return h * 360, s, v
def rgb(h, s, v): r, g, b = colorsys.hsv_to_rgb((h % 360) / 360, max(0, min(1, s)), max(0, min(1, v))); return (r * 255, g * 255, b * 255)
M = crop(8, 16, 775, 239)                                    # 768 × 224
Hh, Ww = M.shape[:2]
TX0, TX1, TY1 = 518, 634, 112                                # the pagoda
for y in range(Hh):
    for x in range(Ww):
        r, g, b, a = M[y, x]
        if not a: continue
        hd, s, v = hsv(r, g, b)
        tower = TX0 <= x <= TX1 and y <= TY1
        tree = (hd >= 330 or hd <= 45) and s > 0.35 and y < 122 and (x < 270 or x > 600) and not (tower and 20 <= hd <= 60)
        if tower and 20 <= hd <= 60 and s > 0.45: M[y, x, :3] = rgb(40, 0.06, min(1, v * 1.15 + 0.1))      # gold → white walls
        elif 150 <= hd <= 200 and s > 0.15 and y < 128: M[y, x, :3] = rgb(220, s * 0.3, v * 0.5)          # teal tiles → slate
        elif tree:                                                                                    # autumn → sakura
            if ((x * 7 + y * 13) % 29) == 0 and v > 0.5: M[y, x, :3] = (255, 244, 248)
            else: M[y, x, :3] = rgb(340, s * 0.42, min(1, v * 1.08 + 0.08))
        elif y >= 182 and not (y < 189 and 286 <= x <= 480) and (hd >= 330 or hd <= 18) and s > 0.5: M[y, x, :3] = rgb(340, 0.35, min(1, v + 0.25))   # leaf piles → petals
        elif y >= 182 and not (y < 189 and 286 <= x <= 480) and 15 <= hd <= 50 and s > 0.3: M[y, x, :3] = rgb(35, s * 0.22, min(1, v * 0.95 + 0.12))  # gravel → pale stone
        elif y >= 182 and not (y < 189 and 286 <= x <= 480) and 150 <= hd <= 200: M[y, x, :3] = rgb(210, s * 0.15, v)                               # path → grey stone
FY = 188
rng = random.Random(2001)
F = M[FY:].copy()
FH0, EXT = F.shape[0], 300
last = F[FH0 - 1]; cols = [x for x in range(Ww) if abs(last[x][0] - last[x][2]) < 30 and last[x][1] < 200 and x > 250 and x < 520 and last[x][0] < 190]
pl, pr = 271, 496
gravel = F[10:FH0 - 2, 90:pl - 16].copy(); stone = F[FH0 - 16:FH0, 320:448].copy()
G = np.zeros((EXT, Ww, 4)); G[:, :, 3] = 255
gh, gw = gravel.shape[:2]
for y in range(0, EXT, 8):
    for x in range(0, Ww, 16):
        sy, sx = rng.randrange(0, gh - 8), rng.randrange(0, gw - 16)
        G[y:y + 8, x:x + 16] = gravel[sy:sy + 8, sx:sx + 16][:min(8, EXT - y), :min(16, Ww - x)]
sh, sw = stone.shape[:2]
for y in range(EXT):
    grow = y * 0.55; L_ = int(pl - grow); R_ = int(pr + grow)
    for x in range(max(0, L_), min(Ww, R_)): G[y, x] = stone[y % sh, (x - L_) % sw]
    for x in (L_, L_ + 1, R_ - 2, R_ - 1):
        if 0 <= x < Ww: G[y, x, :3] *= 0.6
for k in range(260):                                          # fallen petals on the stone
    x, y = rng.randrange(0, Ww), rng.randrange(0, EXT); G[y, x, :3] = (250, 200, 215)
for y in range(EXT): G[y, :, :3] *= max(0.74, 1 - y * 0.0011)
F = np.concatenate([F, G], axis=0)
P = {"wall": {"file": save("wall", M[:FY]), "w": Ww, "h": FY, "gate": [384, 150], "sign": [384, 104], "tower": [576, 112]},
     "floor": {"file": save("floor", F), "w": Ww, "h": F.shape[0]}}
L = {"source": "Street Fighter (1987 arcade) — Retsu's Stage background sheet (ripped by TonyWanKenobian); repainted as the Seireitei", "pieces": P,
     "colors": {"skyTop": "#8ab8e8", "under": "#b8b4ac"}}
pv = Image.new("RGBA", (Ww, Hh), (190, 215, 240, 255)); pv.alpha_composite(Image.fromarray(np.clip(M, 0, 255).astype(np.uint8)))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out)
