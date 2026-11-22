# tools/stage_layers/slice_necro_krypton.py — Necro's Stage, Moscow (Street Fighter III: New Generation sheet) → KRYPTON,
# the citadel during Brainiac's attack.   python3 -I tools/stage_layers/slice_necro_krypton.py <sheet.png> <repoRoot>
#   the domed hall (base layer) + its machines / trees / empty tubes (object layer, re-assembled at the sheet's own
#   offsets, without the characters of the assembly example) → the citadel hall; the tubes read as genesis chambers.
#   The top of the dome is TORN OPEN along a jagged line (the attack ripped the roof off) and the window panes are left
#   open, so the burning red sky and the battle show through; the hall is cooled to Kryptonian blue-white.
#   The floor rows → the deck the fight happens on. The mountain strip, loose object tiles and ripper credit are not used.
# The sky, the red sun, the city, Brainiac, his ships, the Kryptonian soldiers, debris and the finale are drawn by
# stageLayers.js (set "necro_krypton").
import sys, os, json, math
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "necro_krypton"); os.makedirs(out, exist_ok=True)
A = np.array(Image.open(sheet).convert("RGBA"))
def lay(x0, y0, x1, y1, keys):
    t = A[y0:y1 + 1, x0:x1 + 1].copy()
    for k in keys: t[np.all(t[:, :, :3] == k, axis=2), 3] = 0
    return Image.fromarray(t)
K1, K2 = (176, 185, 224), (90, 105, 140)
hall = Image.new("RGBA", (1024, 512), (0, 0, 0, 0))
hall.alpha_composite(lay(48, 48, 1071, 559, [K1]), (0, 0))
hall.alpha_composite(lay(192, 576, 991, 943, [K1, K2]), (144, 96))
hall.alpha_composite(lay(240, 656, 287, 735, [K1, K2]), (348, 166))
H = np.array(hall).astype(float)                                  # the whole hall — the blast takes the top off everything
# the torn roof: everything above a jagged line across the middle of the dome goes
tear = []
import random
R = random.Random(1938)                                              # fixed seed → same art every run
base, y0 = 228.0, 228.0
for x in range(0, 1032, 8):
    e = min(1, max(0, (x - 40) / 90), max(0, (985 - x) / 90))
    base += R.uniform(-9, 9); base = min(250, max(205, base))         # a wandering tear line
    spike = R.choice([0, 0, 0, 0, -14, 10, 22, -24])                 # with the odd bent shard / deep bite
    tear.append([x, int(e * max(0, base + spike))])
for x in range(1024):
    i = min(len(tear) - 2, x // 8); u = (x - tear[i][0]) / 8; y = tear[i][1] * (1 - u) + tear[i + 1][1] * u
    H[:int(y), x, 3] = 0
# cool the hall toward Kryptonian blue-white
rgb = H[..., :3]; lum = rgb.mean(axis=2, keepdims=True)
H[..., :3] = np.clip(rgb * 0.55 + lum * np.array([0.42, 0.52, 0.62]) * 1.0 + np.array([6, 10, 18]), 0, 255)
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {"hall": {"file": save("hall", H[:450]), "w": 1024, "h": 450, "tear": tear},
     "floor": {"file": save("floor", H[450:]), "w": 1024, "h": 62}}
L = {"source": "Street Fighter III: New Generation — Necro's Stage (Moscow) sheet; repainted as Krypton's citadel", "pieces": P,
     "colors": {"skyTop": "#3a0a08", "under": "#3a6a80", "seaBottom": "#3a6a80"}}
pv = Image.new("RGBA", (1024, 512), (150, 40, 20, 255)); pv.alpha_composite(Image.fromarray(np.clip(H, 0, 255).astype(np.uint8)))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out)
