# tools/stage_layers/slice_blanka_nullvoid.py — Blanka's Stage (SFII sheet) → THE NULL VOID (an endless prison dimension of
# drifting rock islands).   python3 -I tools/stage_layers/slice_blanka_nullvoid.py <sheet.png> <repoRoot>
# Reads the sheet's pieces and repaints them:
#   the blue sky + cumulus clouds → a black-violet void with glowing magenta-red mist clouds;
#   the wooden boardwalk → the fractured violet rock top of the floating island the fighters stand on;
#   the jungle tree with its vines → a petrified grey-violet tree on a distant island;
#   the hut's thatch roof + wall → a wrecked shack (lost things end up here) on another island.
# Every person on the sheet and the ripper credit are left out. Stars, grid, rift, islands and debris are drawn by
# stageLayers.js (set "blanka_nullvoid").
import sys, os, json
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "blanka_nullvoid"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[0, 0, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def lum(t): return (t[..., :3] @ np.array([0.299, 0.587, 0.114])) / 255.0
def ramp3(v, stops):
    v = np.clip(v, 0, 1); o = np.zeros(v.shape + (3,)); xs = [s[0] for s in stops]; cs = np.array([s[1] for s in stops], float)
    for ch in range(3): o[..., ch] = np.interp(v, xs, cs[:, ch])
    return o
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {}

# sky: blue → void black-violet; the white clouds → glowing mist (kept semi-transparent so the stars show through)
sky = crop(8, 264, 519, 423); rgb = sky[..., :3]
white = (rgb.min(-1) / 255.0)                                       # 1 = cloud white, ~0.3 = blue sky
cloud = np.clip((white - 0.62) / 0.33, 0, 1)
mist = ramp3(lum(sky), [(0.6, (70, 14, 60)), (0.8, (170, 40, 90)), (0.92, (240, 90, 120)), (1.0, (255, 190, 170))])
yy = np.arange(sky.shape[0])[:, None] / (sky.shape[0] - 1)
fade = np.clip((0.78 - yy) / 0.2, 0, 1)                             # the white horizon band fades out (no solid strip)
sky[..., :3] = mist; sky[..., 3] = 220 * cloud ** 0.8 * fade
P["mist"] = {"file": save("mist", sky), "w": sky.shape[1], "h": sky.shape[0]}

# boardwalk → fractured violet rock (the plank seams become cracks; a little glow in the deepest cracks)
fl = crop(8, 192, 903, 255); v = lum(fl)
fl[..., :3] = ramp3(v, [(0.0, (8, 4, 16)), (0.25, (34, 20, 52)), (0.5, (66, 48, 92)), (0.75, (104, 84, 132)), (1.0, (150, 130, 176))])
FH, FW = fl.shape[:2]                                               # rock mottling over the plank grain
yy = np.arange(FH)[:, None] + np.zeros((1, FW)); xx = np.zeros((FH, 1)) + np.arange(FW)[None, :]
blot = 0.78 + 0.22 * np.sin(xx * 0.043 + np.sin(yy * 0.21) * 3) * np.sin(xx * 0.017 - yy * 0.09 + 1.3)
fl[..., :3] = fl[..., :3] * blot[..., None]
fl[..., :3] = np.round(fl[..., :3] / 12) * 12                       # posterise: hard-edged facets, not soft wood
crack = v < 0.18
fl[crack, :3] = [120, 30, 110]
P["floor"] = {"file": save("floor", fl), "w": fl.shape[1], "h": fl.shape[0]}

# tree (without the people beside it) → petrified, vines faintly glowing
tr = crop(575, 264, 700, 452); v = lum(tr)
g = (tr[..., 1] > tr[..., 0] + 12) & (tr[..., 3] > 0)             # green vines / leaves / snake
tr[..., :3] = ramp3(v, [(0.0, (10, 6, 18)), (0.4, (60, 50, 78)), (0.8, (130, 118, 150)), (1.0, (190, 180, 206))])
tr[g, :3] = ramp3(v[g], [(0.0, (40, 10, 50)), (1.0, (230, 80, 200))])
P["tree"] = {"file": save("tree", tr), "w": tr.shape[1], "h": tr.shape[0]}

# hut: roof + upper wall only (the people stand at its foot) → a wrecked grey shack
hu = crop(762, 264, 1007, 392); v = lum(hu)
hu[..., :3] = ramp3(v, [(0.0, (8, 6, 14)), (0.5, (70, 62, 84)), (1.0, (170, 160, 180))])
P["shack"] = {"file": save("shack", hu), "w": hu.shape[1], "h": hu.shape[0]}

L = {"source": "Street Fighter II — Blanka's Stage sheet, ripped by shezzor; repainted as the Null Void", "pieces": P,
     "colors": {"skyTop": "#05020b", "under": "#05020b", "seaBottom": "#05020b"}}
pv = Image.new("RGBA", (fl.shape[1], 300), (12, 4, 24, 255))
pv.alpha_composite(Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8)).resize((fl.shape[1], 236)), (0, 0))
pv.alpha_composite(Image.fromarray(np.clip(fl, 0, 255).astype(np.uint8)), (0, 236))
pv.convert("RGB").resize((fl.shape[1] * 2 // 2, 300)).save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
