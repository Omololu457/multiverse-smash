# tools/stage_layers/slice_chunli_shibuya.py — Chun-Li's Stage (SFII sheet) → SHIBUYA INCIDENT (a city street at night under the
# dark dome).   python3 -I tools/stage_layers/slice_chunli_shibuya.py <sheet.png> <repoRoot>
# Reads the sheet's pieces and repaints them for night:
#   the market shop row → night storefronts, warm-lit interiors, neon signboards;
#   the cobblestone street → wet dark asphalt with a painted zebra crossing;
#   the man in the hat and the cyclist → extra bystanders (frames kept so the renderer can animate and kill them; the
#   rest of the crowd is drawn by the renderer). The towers and the dome are drawn by the renderer too.
# The ripper credit and the "unused" props are left out.
import sys, os, json
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "chunli_shibuya"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 500, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def hsv(t):
    rgb = t[..., :3] / 255.0; mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; h = np.zeros_like(mx); nz = d > 1e-6
    hr = nz & (mx == r); hg = nz & (mx == g) & ~hr; hb = nz & ~hr & ~hg
    h[hr] = ((g - b)[hr] / d[hr]) % 6; h[hg] = (b - r)[hg] / d[hg] + 2; h[hb] = (r - g)[hb] / d[hb] + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx
def lum(t): return (t[..., :3] @ np.array([0.299, 0.587, 0.114])) / 255.0
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
def night(t, k=0.32, tint=(0.75, 0.8, 1.15)):
    t = t.copy(); t[..., :3] = t[..., :3] * k * np.array(tint); return t
P = {}

# shop row → night storefronts (interiors warm-lit, signboards neon); the people inside are shopkeepers in the art
sh = crop(176, 8, 879, 215); h_, s_, v_ = hsv(sh); v = lum(sh)
ns = night(sh, 0.8, (0.92, 0.9, 1.02))
board = (s_ > 0.5) & (v_ > 0.4) & ((h_ < 20) | (h_ > 330))         # red signboards → hot pink neon
ns[board, :3] = np.array([255, 70, 160]) * (0.6 + 0.4 * v[board])[..., None]
SH, SW = sh.shape[:2]
P["shops"] = {"file": save("shops", ns), "w": SW, "h": SH}

# street → wet asphalt + zebra crossing (white bars across the middle third)
fl = crop(8, 224, 1047, 303); v = lum(fl); FH, FW = fl.shape[:2]
asph = 40 + 55 * v
fl[..., :3] = np.stack([asph * 0.9, asph * 0.92, asph * 1.08], -1)
yy = np.arange(FH)[:, None] + np.zeros((1, FW)); xx = np.zeros((FH, 1)) + np.arange(FW)[None, :]
cx = FW / 2; spread = 0.55 + 0.45 * yy / (FH - 1)                    # bars fan out toward the viewer
rel = (xx - cx) / spread
bar = (np.abs(rel) < FW * 0.3) & (((rel + 4000) // 22) % 2 == 0) & (yy > 6) & (yy < FH - 6)
fl[bar, :3] = np.array([150, 154, 165]) * (0.75 + 0.35 * v[bar])[..., None]
fl[(yy < 3), :3] = [120, 124, 136]                                   # the far kerb
P["street"] = {"file": save("street", fl), "w": FW, "h": FH}

# bystanders: frames kept in their own colours (lightly night-tinted)
def frames(boxes, name):
    fr = [night(crop(*b), 0.8, (0.92, 0.94, 1.08)) for b in boxes]
    out_ = []
    for i, f in enumerate(fr): out_.append({"file": save(f"{name}_{i}", f), "w": f.shape[1], "h": f.shape[0]})
    return out_
L = {"source": "Street Fighter II — Chun-Li's Stage sheet, ripped by shezzor; repainted as Shibuya at night", "pieces": P,
     "peds": {
        "hatman": frames([(790, 400, 830, 463), (845, 400, 886, 463), (901, 400, 942, 463)], "hatman"),
        "biker":  frames([(379, 810, 502, 895), (515, 810, 638, 895), (651, 810, 774, 895), (379, 906, 502, 991), (515, 906, 638, 991), (651, 906, 774, 991)], "biker"),
     },
     "colors": {"skyTop": "#04030a", "under": "#07070c", "seaBottom": "#07070c"}}
for k, fr in L["peds"].items():
    for f in fr: P[f["file"][:-4]] = f                                # so the loader waits for every frame
pv = Image.new("RGBA", (FW, 300), (8, 6, 18, 255))
pv.alpha_composite(Image.fromarray(np.clip(ns, 0, 255).astype(np.uint8)), (160, 12))
pv.alpha_composite(Image.fromarray(np.clip(fl, 0, 255).astype(np.uint8)), (0, 220))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items() if "_" not in k})
