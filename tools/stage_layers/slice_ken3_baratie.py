# tools/stage_layers/slice_ken3_baratie.py — Ken's Stage, San Francisco (Street Fighter III: 2nd Impact sheet) → THE BARATIE,
# the floating seafood restaurant (One Piece).   python3 -I tools/stage_layers/slice_ken3_baratie.py <sheet.png> <repoRoot>
#   the pier layer → the Baratie's deck: the restaurant front (its crab sign cut out — the game draws the BARATIE fish
#   sign there), the railing, benches, flowers; the yacht with Ken's mural is removed (the game moors a pirate ship there);
#   the "KEN MASTERS" post-sign is cut out (a barrel is drawn over it); the planks → the deck the fight happens on.
# The Golden Gate / city layer and the ripper credit are left out — the open sea, sky, ships, Sea King, customers and
# cooks are drawn by stageLayers.js (set "ken3_baratie").
import sys, os, json
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "ken3_baratie"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEYS = [(200, 192, 216), (152, 120, 216)]
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy()
    for k in KEYS: t[np.all(t[:, :, :3] == k, axis=2), 3] = 0
    return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
OX, OY = 31, 564
pier = crop(OX, OY, 991, 904)
def rect(x0, y0, x1, y1): return pier[y0 - OY:y1 - OY + 1, x0 - OX:x1 - OX + 1]
# the yacht (above the railing) goes entirely; through the railing (its lower hull) keep only wood / dark / flowers
rect(268, 700, 940, 837)[..., 3] = 0
band = rect(300, 838, 935, 878)
r, g, b = band[..., 0], band[..., 1], band[..., 2]
wood = (r > g) & (g > b) & (g < 0.7 * r) & (r < 215)
dark = np.maximum(np.maximum(r, g), b) < 70
band[..., 3] = np.where(wood | dark, band[..., 3], 0)
# (the crab "SEAFOOD RESTAURANT SAN FRANCISCO" sign is covered by the BARATIE sign the game paints over it)
# the "KEN MASTERS" post-sign (keep the flowers in front)
rect(625, 815, 740, 885)[..., 3] = 0
# patch the railing where the mural was: repeat a clean column of rails across the gap (only where it is now empty)
src = pier[:, 500].copy()
for x in range(504, 712):
    col = pier[:, x]
    for y in range(240, 320):
        if col[y, 3] == 0 and src[y, 3] > 0: col[y] = src[y]
P = {"pier": {"file": save("pier", pier), "w": pier.shape[1], "h": pier.shape[0],
              "sign": [185 - OX, 712 - OY], "barrel": [688 - OX, 885 - OY], "door": [150 - OX, 880 - OY],
              "benches": [[435 - OX, 870 - OY], [520 - OX, 870 - OY], [825 - OX, 870 - OY], [905 - OX, 870 - OY]]}}
deck = crop(OX, 905, 991, 959); P["deck"] = {"file": save("deck", deck), "w": deck.shape[1], "h": deck.shape[0]}
L = {"source": "Street Fighter III: 2nd Impact — Ken's Stage (San Francisco) sheet, ripped by Geometricentric; repainted as the Baratie", "pieces": P,
     "colors": {"skyTop": "#3a7ae8", "under": "#a8784a", "seaBottom": "#1a4a8a"}}
pv = Image.new("RGBA", (pier.shape[1], pier.shape[0] + deck.shape[0]), (80, 150, 230, 255))
pv.alpha_composite(Image.fromarray(np.clip(pier, 0, 255).astype(np.uint8)), (0, 0))
pv.alpha_composite(Image.fromarray(np.clip(deck, 0, 255).astype(np.uint8)), (0, pier.shape[0]))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
