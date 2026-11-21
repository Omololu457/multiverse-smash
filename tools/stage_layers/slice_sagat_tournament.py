# tools/stage_layers/slice_sagat_tournament.py — Sagat's Stage (Street Fighter, 1987 arcade background sheet) →
# WORLD TOURNAMENT ARENA.   python3 -I tools/stage_layers/slice_sagat_tournament.py <sheet.png> <repoRoot>
#   the sky → the tournament's clear sky (kept);
#   the temple, its walls, guardian statues and the great stairs → the tournament hall behind the ring (kept, a touch
#   warmer); the lawn → the grass around the ring.
# The ripper credit is left out. The ring (tiles that crack under big hits), banners, the packed stands, the famous
# spectators and the announcer are drawn by stageLayers.js (set "sagat_tournament").
import sys, os, json
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "sagat_tournament"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {}
sky = crop(8, 256, 903, 431); P["sky"] = {"file": save("sky", sky), "w": sky.shape[1], "h": sky.shape[0]}
hall = crop(8, 16, 775, 192); hall[..., :3] = np.clip(hall[..., :3] * np.array([1.04, 1.0, 0.96]), 0, 255)
P["hall"] = {"file": save("hall", hall), "w": hall.shape[1], "h": hall.shape[0]}
grass = crop(8, 193, 775, 239); P["grass"] = {"file": save("grass", grass), "w": grass.shape[1], "h": grass.shape[0]}
L = {"source": "Street Fighter (1987 arcade) — Sagat's Stage background sheet (ripped by TonyWanKenobian); repainted as the World Tournament", "pieces": P,
     "colors": {"skyTop": "#5aa0e8", "under": "#3a5a10", "seaBottom": "#3a5a10"}}
pv = Image.new("RGBA", (hall.shape[1], 260), (90, 160, 232, 255))
pv.alpha_composite(Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8)).crop((0, 0, hall.shape[1], 176)), (0, 0))
pv.alpha_composite(Image.fromarray(np.clip(hall, 0, 255).astype(np.uint8)), (0, 36))
pv.alpha_composite(Image.fromarray(np.clip(grass, 0, 255).astype(np.uint8)), (0, 213))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
