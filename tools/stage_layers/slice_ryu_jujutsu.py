# tools/stage_layers/slice_ryu_jujutsu.py — Ryu's Stage (SFII sheet) → JUJUTSU HIGH (Tokyo Jujutsu High's temple-style
# campus in the wooded hills at dusk).   python3 -I tools/stage_layers/slice_ryu_jujutsu.py <sheet.png> <repoRoot>
#   the two sunset sky halves → one wide dusk sky (kept, softened toward evening);
#   the castle → the school's main hall (kept, darkened to sit in the hills);
#   the big curved roof corner → a school building's eave (kept);
#   the long wooden fence → the courtyard wall;
#   the plank floor + its trim → the wooden training deck;
#   the tall calligraphy sign → a blank board (the renderer writes the school's name on it).
# Roof tiles, the small signs and the ripper credit are left out. Forest, torii, lanterns and the watching crowd are
# drawn by stageLayers.js (set "ryu_jujutsu").
import sys, os, json
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "ryu_jujutsu"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[0, 0, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def lum(t): return (t[..., :3] @ np.array([0.299, 0.587, 0.114])) / 255.0
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {}
sky = np.concatenate([crop(9, 10, 520, 153), crop(529, 10, 1040, 153)], axis=1)
sky[..., :3] = sky[..., :3] * np.array([0.95, 0.85, 0.92]) + np.array([6, 4, 14])     # a touch toward evening violet
P["sky"] = {"file": save("sky", sky), "w": sky.shape[1], "h": sky.shape[0]}
hall = crop(105, 224, 243, 299); hall[..., :3] *= 0.82
P["hall"] = {"file": save("hall", hall), "w": hall.shape[1], "h": hall.shape[0]}
eave = crop(672, 166, 820, 377)
P["eave"] = {"file": save("eave", eave), "w": eave.shape[1], "h": eave.shape[0]}
wall = crop(277, 283, 671, 377)
P["wall"] = {"file": save("wall", wall), "w": wall.shape[1], "h": wall.shape[0]}
floor = crop(8, 461, 903, 496)
P["floor"] = {"file": save("floor", floor), "w": floor.shape[1], "h": floor.shape[0]}
trim = crop(8, 505, 902, 516)
P["trim"] = {"file": save("trim", trim), "w": trim.shape[1], "h": trim.shape[0]}
sign = crop(815, 333, 849, 435); v = lum(sign); a = sign[..., 3] > 0
paper = a & (v > 0.55); ink = a & (v < 0.35)
H, W = sign.shape[:2]; yy = np.arange(H)[:, None] + np.zeros((1, W)); xx = np.zeros((H, 1)) + np.arange(W)[None, :]
board = (xx > 4) & (xx < W - 5) & (yy > 4) & (yy < H * 0.72)
sign[board & a, :3] = np.array([236, 228, 206])                      # blank paper (the calligraphy is redrawn live)
P["sign"] = {"file": save("sign", sign), "w": W, "h": H, "paper": [5, 5, W - 5, int(H * 0.72)]}
L = {"source": "Street Fighter II — Ryu's Stage sheet, ripped by ultimategab; repainted as Jujutsu High", "pieces": P,
     "colors": {"skyTop": "#3a1030", "under": "#1a0f0a", "seaBottom": "#1a0f0a"}}
pv = Image.new("RGBA", (sky.shape[1], 260), (40, 16, 30, 255))
pv.alpha_composite(Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8)), (0, 0))
pv.alpha_composite(Image.fromarray(np.clip(hall, 0, 255).astype(np.uint8)).resize((276, 150)), (380, 30))
pv.alpha_composite(Image.fromarray(np.clip(wall, 0, 255).astype(np.uint8)), (0, 130)); pv.alpha_composite(Image.fromarray(np.clip(wall, 0, 255).astype(np.uint8)), (395, 130))
pv.alpha_composite(Image.fromarray(np.clip(floor, 0, 255).astype(np.uint8)), (0, 224))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
