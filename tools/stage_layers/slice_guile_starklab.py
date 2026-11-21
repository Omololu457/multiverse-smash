# tools/stage_layers/slice_guile_starklab.py — Guile's air base (SFII CE sheet) → THE ARMOR LAB (a billionaire inventor's
# workshop under a cliff-top house: suits on display, holograms, robot arms, a prototype jet on its lift).
#   python3 -I tools/stage_layers/slice_guile_starklab.py <sheet.png> <repoRoot>
# Reads the sheet's pieces and repaints them:
#   F-16 → a brushed-steel prototype jet with gold trim and a glowing cyan canopy;
#   tarmac → the polished dark lab floor (its blue edge stripe → light strips); the star roundel → an arc-reactor ring;
#   the intact crate → a steel parts crate with hazard stripes.
# Airmen, fence, tail fin, sky, horizon and the ripper credit are left out. Walls, window, the suit pods, holograms,
# robot arms, the reactor core and the helper bots are drawn by stageLayers.js (set "guile_starklab").
import sys, os, json
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "guile_starklab"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[0, 0, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def hsv(t):
    rgb = t[..., :3] / 255.0; mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; h = np.zeros_like(mx); nz = d > 1e-6
    hr = nz & (mx == r); hg = nz & (mx == g) & ~hr; hb = nz & ~hr & ~hg
    h[hr] = ((g - b)[hr] / d[hr]) % 6; h[hg] = (b - r)[hg] / d[hg] + 2; h[hb] = (r - g)[hb] / d[hb] + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx
def lum(t): return (t[..., :3] @ np.array([0.299, 0.587, 0.114])) / 255.0
def ramp(v, lo, hi, gamma=1.0):
    lo, hi = np.array(lo, float), np.array(hi, float); return lo + (hi - lo) * (np.clip(v, 0, 1) ** gamma)[..., None]
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {}
# prototype jet: only the aircraft (rows above the tarmac), steel + gold + cyan
jet = crop(8, 92, 1031, 203)
h_, s_, v_ = hsv(jet); v = lum(jet)
col = ramp(v, (28, 30, 38), (214, 220, 232), 1.2)
canopy = (h_ > 255) & (h_ < 345) & (s_ > 0.2)
col[canopy] = ramp(v[canopy], (10, 60, 90), (150, 240, 255), 0.9)
hot = ((h_ < 40) | (h_ > 345)) & (s_ > 0.45) & (v_ > 0.35)
col[hot] = ramp(v[hot], (110, 70, 10), (255, 214, 90), 0.8)
JH, JW = jet.shape[:2]; yy = np.arange(JH)[:, None] + np.zeros((1, JW))
stripe = (np.abs(yy - JH * 0.62) < 2.5) & (jet[..., 3] > 0) & ~canopy           # a gold trim line along the fuselage
col[stripe] = col[stripe] * 0.4 + np.array([230, 180, 60]) * 0.6
jet[..., :3] = col
P["jet"] = {"file": save("jet", jet), "w": JW, "h": JH}
# lab floor
deck = crop(8, 204, 1031, 267)
h_, s_, v_ = hsv(deck); v = lum(deck)
roundel = (h_ < 40) & (s_ > 0.45) & (v_ > 0.5)
col = ramp(v, (14, 17, 24), (78, 88, 104), 1.5)
cyan = (h_ > 170) & (h_ < 210) & (s_ > 0.4)
col[cyan] = ramp(v[cyan], (20, 120, 200), (150, 235, 255))
deck[..., :3] = col
ys, xs = np.where(roundel); rx0, rx1, ry0, ry1 = xs.min(), xs.max(), ys.min(), ys.max()
deck[ry0 - 1:ry1 + 2, rx0 - 1:rx1 + 2, :3] = deck[ry0 - 4:ry0 - 3, rx0 - 1:rx1 + 2, :3]     # roundel painted out (ring drawn live)
DH, DW = deck.shape[:2]; yy = np.arange(DH)[:, None] + np.zeros((1, DW)); xx = np.zeros((DH, 1)) + np.arange(DW)[None, :]
seam = (((xx - DW / 2) / (0.6 + 0.4 * yy / DH)) % 96 < 1.2) & (yy > 2)              # panel seams fanning toward the viewer
deck[seam, :3] = deck[seam, :3] * 0.55
P["deck"] = {"file": save("deck", deck), "w": DW, "h": DH, "ring": [int(rx0), int(ry0), int(rx1 - rx0), int(ry1 - ry0)]}
# parts crate
cr = crop(155, 552, 250, 631); v = lum(cr); CH, CW = cr.shape[:2]
cr[..., :3] = ramp(v, (18, 20, 26), (120, 128, 142), 1.2)
yy = np.arange(CH)[:, None] + np.zeros((1, CW)); xx = np.zeros((CH, 1)) + np.arange(CW)[None, :]
band = (yy > CH * 0.08) & (yy < CH * 0.2) & (cr[..., 3] > 0)
cr[band, :3] = np.where(((((xx + yy) // 6) % 2) == 0)[band][:, None], np.array([230, 190, 30]), np.array([20, 20, 22]))
P["crate"] = {"file": save("crate", cr), "w": CW, "h": CH}
L = {"source": "Street Fighter II CE — Guile's Stage sheet (ripped by Y. Signal); repainted as an armor lab", "pieces": P,
     "colors": {"skyTop": "#05070c", "under": "#07090e", "seaBottom": "#07090e"}}
pv = Image.new("RGBA", (DW, 300), (10, 14, 22, 255))
pv.alpha_composite(Image.fromarray(np.clip(jet, 0, 255).astype(np.uint8)), (0, 120))
pv.alpha_composite(Image.fromarray(np.clip(deck, 0, 255).astype(np.uint8)), (0, 232))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
