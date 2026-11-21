# tools/stage_layers/slice_eagle_namek.py — Eagle's Stage (Street Fighter, 1987 arcade background sheet) → PLANET NAMEK.
#   python3 -I tools/stage_layers/slice_eagle_namek.py <sheet.png> <repoRoot>
#   the cliffs, wooded hills, lake and hedges → Namek's blue-green hills (hue-shifted: foliage → teal/blue-green,
#   rock → pale green-grey, water kept blue); the castle on the hill is cut out (Namekian dome houses are drawn
#   there by the game instead); the dirt road → the pale green ground of Namek.
# The ripper credit and the sky strip are left out. The green sky, the war (Frieza's ship, his soldiers, bombs,
# Namekians running / fighting back / dying, burning villages) is drawn by stageLayers.js (set "eagle_namek").
import sys, os, json, colorsys
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "eagle_namek"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def recolor(t, ground=False):
    rgb = t[..., :3] / 255.0
    flat = rgb.reshape(-1, 3); o = np.empty_like(flat)
    for i, (r, g, b) in enumerate(flat):
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        hd = h * 360
        if 180 <= hd <= 250 and s > 0.25: o[i] = (r, g, b); continue                 # the lake stays blue
        if ground: h2, s2, v2 = 140 / 360, min(1, s * 0.75 + 0.05), min(1, v * 1.05)    # dirt → pale green ground
        elif 55 <= hd < 180: h2, s2, v2 = (165 + (hd - 55) * 0.25) / 360, min(1, s * 1.05), v       # foliage → teal / blue-green
        else: h2, s2, v2 = 120 / 360, s * 0.45, min(1, v * 1.08)                                  # rock / bark → pale green-grey
        o[i] = colorsys.hsv_to_rgb(h2, s2, v2)
    t[..., :3] = o.reshape(rgb.shape) * 255; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {}
land = crop(8, 26, 775, 197)
# the castle (x 455–582) sits on the hill: cut everything above the hill's slope under it (abs y 112 at x 455 → 76 at
# x 582), and the castle's grey stone a few rows below that line
for x in range(455, 583):
    line = 112 - (x - 455) * 36 / 127
    for y in range(26, 126):
        r, g, b, a = land[y - 26, x - 8]
        if not a: continue
        if y < line or (y < line + 8 and max(r, g, b) - min(r, g, b) < 34): land[y - 26, x - 8, 3] = 0
land = recolor(land)
P["land"] = {"file": save("land", land), "w": land.shape[1], "h": land.shape[0], "village": [518 - 8, 96 - 26]}
ground = recolor(crop(8, 198, 775, 239), ground=True)
P["ground"] = {"file": save("ground", ground), "w": ground.shape[1], "h": ground.shape[0]}
L = {"source": "Street Fighter (1987 arcade) — Eagle's Stage background sheet (ripped by TonyWanKenobian); repainted as Planet Namek", "pieces": P,
     "colors": {"skyTop": "#7fe0a8", "under": "#4a8a5a", "seaBottom": "#4a8a5a"}}
pv = Image.new("RGBA", (land.shape[1], 260), (140, 225, 160, 255))
pv.alpha_composite(Image.fromarray(np.clip(land, 0, 255).astype(np.uint8)), (0, 46))
pv.alpha_composite(Image.fromarray(np.clip(ground, 0, 255).astype(np.uint8)), (0, 218))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
