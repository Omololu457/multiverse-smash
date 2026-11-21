# tools/stage_layers/import_ssf2_leaf.py — "Hidden Leaf Village (SSF2)" stage pack by Guybesideyou64 → stages/ssf2_leaf/.
#   python3 -I tools/stage_layers/import_ssf2_leaf.py <pack stage dir: .../stage/hiddenleafssf2> <repoRoot>
# Takes the pack's three art layers as they are: hokage.png (the far backdrop), mg.png (the floating island with the
# village buildings — the fighters stand on its sand), fg.png (foreground bits drawn in front of the fighters).
# Stray magenta key pixels left in mg/fg are painted with the rock colour beside them. The pack's collision masks and
# character sprites are not used (this game has its own ground).
import sys, os, json
import numpy as np
from PIL import Image

src, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "ssf2_leaf"); os.makedirs(out, exist_ok=True)
def clean(a):
    a = a.copy(); r, g, b, al = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int), a[..., 3]
    pink = (al > 0) & (r > 180) & (b > 150) & (g < 120)
    for _ in range(40):
        if not pink.any(): break
        for dx in (-3, 3, -8, 8, -16, 16):
            nb = np.roll(a, dx, axis=1); nbp = np.roll(pink, dx, axis=1)
            ok = pink & ~nbp & (nb[..., 3] > 0); a[ok] = nb[ok]; pink &= ~ok
    return a
P = {}
for n in ("hokage", "mg", "fg"):
    im = Image.open(os.path.join(src, n + ".png")).convert("RGBA"); a = np.array(im)
    if n != "hokage": a = clean(a)
    Image.fromarray(a).save(os.path.join(out, n + ".png")); P[n] = {"file": n + ".png", "w": im.width, "h": im.height}
bg = np.array(Image.open(os.path.join(out, "hokage.png")))
L = {"source": "Hidden Leaf Village (SSF2) stage pack by Guybesideyou64", "pieces": P,
     "standRow": 286,                       # mg.png row the fighters' feet sit on (the island's sand)
     "colors": {"skyTop": "#%02x%02x%02x" % tuple(bg[4, 4, :3]), "skyLow": "#%02x%02x%02x" % tuple(bg[380, 4, :3])}}
c = Image.new("RGBA", (1279, 526), tuple(bg[200, 4, :3]) + (255,))
c.alpha_composite(Image.open(os.path.join(out, "hokage.png")).resize((1279, int(996 * 1279 / 1172))).crop((0, 300, 1279, 826)))
c.alpha_composite(Image.open(os.path.join(out, "mg.png"))); c.alpha_composite(Image.open(os.path.join(out, "fg.png")))
c.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, P, L["colors"])
