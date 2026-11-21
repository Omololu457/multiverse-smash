# tools/stage_layers/slice_guile_valley.py — VALLEY OF THE END: the game's own painted backdrop (valley_of_the_end_bg.png:
# the cliffs, the two statues, the waterfall, the river) mixed with Guile's Stage (SFII CE sheet).
#   python3 -I tools/stage_layers/slice_guile_valley.py <guile_sheet.png> <valley_bg.png> <repoRoot>
# The painting is brought into the sheet's 16-bit look: cropped above its stone ledge, scaled down, posterised to a
# small palette and drawn with nearest-neighbour, so it sits with the pixel art instead of looking pasted on.
# From the Guile sheet: the tarmac → the wet riverbank rock the fighters stand on (the star roundel painted out, the blue edge stripe →
# the water's edge). The renderer animates the waterfall, its mist and the river.
import sys, os, json
import numpy as np
from PIL import Image

sheet, bgpath, root = sys.argv[1], sys.argv[2], sys.argv[3]
out = os.path.join(root, "stages", "guile_valley"); os.makedirs(out, exist_ok=True)
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
def ramp(v, lo, hi, g=1.0):
    lo, hi = np.array(lo, float), np.array(hi, float); return lo + (hi - lo) * (np.clip(v, 0, 1) ** g)[..., None]
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
L = {"source": "valley_of_the_end_bg.png (the game's backdrop) + Street Fighter II CE Guile's Stage sheet (V. Signal)", "pieces": {}}
P = L["pieces"]

# ── the valley painting → a pixel-art far layer
bg = Image.open(bgpath).convert("RGB"); BW, BH = bg.size
ledge = int(BH * 0.835)                                    # the painted stone ledge starts here — cut it off
VW = 1024; VH = round(ledge * VW / BW)
small = bg.crop((0, 0, BW, ledge)).resize((VW, VH), Image.LANCZOS)
small = small.quantize(colors=56, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
P["valley"] = {"file": save("valley", np.array(small).astype(float)), "w": VW, "h": VH,
               # the waterfall + river in the painting (fractions measured on the source picture)
               "falls": [round(VW * 0.462), round(VH * 0.33), round(VW * 0.098), round(VH * 0.52)],
               "river": [round(VW * 0.38), round(VH * 0.86), round(VW * 0.27), VH - round(VH * 0.86)]}

# ── tarmac → wet riverbank rock
deck = crop(8, 204, 1031, 267); h_, s_, v_ = hsv(deck); v = lum(deck)
roundel = (h_ < 40) & (s_ > 0.45) & (v_ > 0.5)
ys, xs = np.where(roundel); rx0, rx1, ry0, ry1 = xs.min(), xs.max(), ys.min(), ys.max()
deck[ry0 - 2:ry1 + 3, rx0 - 2:rx1 + 3, :3] = deck[ry0 - 2:ry1 + 3, rx0 - 2 - (rx1 - rx0 + 5):rx0 - 2, :3]
# the F-16's wheels, ladder and shadow sit on the far rows: replace every dark pixel there with clean tarmac from the
# same row further along (the tarmac is uniform sideways)
DH, DW = deck.shape[:2]
for y in range(0, 30):
    for _ in range(6):
        dark = lum(deck[y:y + 1])[0] < 0.62
        if not dark.any(): break
        for sh in (300, -300, 520, -520):
            src = np.roll(deck[y], sh, axis=0); ok = dark & (lum(src[None])[0] >= 0.62)
            deck[y, ok] = src[ok]; dark &= ~ok
for y in range(0, 22):                                      # the far rows → calm, even rock (row median + a little grain)
    med = np.median(deck[y, :, :3], axis=0); deck[y, :, :3] = med * (0.94 + 0.06 * ((np.arange(DW) * 7 + y * 13) % 5 / 4))[:, None]
h_, s_, v_ = hsv(deck); v = lum(deck)
cyan = (h_ > 170) & (h_ < 210) & (s_ > 0.4)
col = ramp(v, (24, 30, 30), (150, 156, 140), 1.5)
yy = np.arange(DH)[:, None] + np.zeros((1, DW)); xx = np.zeros((DH, 1)) + np.arange(DW)[None, :]
blot = np.sin(xx * 0.031 + 1.7) * np.sin(xx * 0.0137 + yy * 0.05) + 0.5 * np.sin(xx * 0.071 - yy * 0.21)
moss = (blot > 0.72) & (yy < DH * 0.8)                      # soft moss patches
col[moss] = col[moss] * np.array([0.82, 0.98, 0.78])
col[cyan] = ramp(v[cyan], (30, 90, 100), (150, 225, 230))
deck[..., :3] = col
P["deck"] = {"file": save("deck", deck), "w": DW, "h": DH}

L["colors"] = {"skyTop": "#c9d4dc", "under": "#16343a", "seaBottom": "#0b2226"}
pv = Image.new("RGBA", (VW, VH + 40), (22, 52, 58, 255))
pv.alpha_composite(small, (0, 0)); pv.alpha_composite(Image.fromarray(np.clip(deck, 0, 255).astype(np.uint8)).crop((0, 24, VW, 64)), (0, VH))
pv.convert("RGB").resize((VW * 2, (VH + 40) * 2), Image.NEAREST).save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
