# tools/stage_layers/slice_ken_harbor.py — cut the ripped SFII "Ken's Stage" sheet into layered stage art.
#   python3 -I tools/stage_layers/slice_ken_harbor.py <sheet.png> <repoRoot>
# Writes stages/ken_harbor/*.png (slate-blue key → transparent) + stages/ken_harbor/layout.json, which records where
# every animated piece (crowd cheer frames, flag) sits on its parent layer. Positions are FOUND by matching the
# frames against the parent art (the frame that matches exactly is the anchor; the others share its bottom-left).
import sys, os, json
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "ken_harbor"); os.makedirs(out, exist_ok=True)
im = np.array(Image.open(sheet).convert("RGBA"))
KEY = im[0, 0, :3].copy()

def crop(x0, y0, x1, y1):
    t = im[y0:y1 + 1, x0:x1 + 1].copy()
    t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0
    return t

def save(name, arr):
    Image.fromarray(arr).save(os.path.join(out, name + ".png")); return name + ".png"

def locate(parent, frame):
    """best (x, y, diff) of `frame`'s opaque pixels inside `parent`"""
    m = frame[:, :, 3] > 0; f = frame[:, :, :3].astype(int); P = parent[:, :, :3].astype(int)
    fh, fw = m.shape; best = (10**12, 0, 0)
    for y in range(P.shape[0] - fh + 1):
        for x in range(P.shape[1] - fw + 1):
            d = np.abs(P[y:y + fh, x:x + fw] - f)[m].sum()
            if d < best[0]: best = (d, x, y)
            if d == 0: return x, y, 0
    return best[1], best[2], best[0]

layout = {"source": "Street Fighter II / Super SFII — Ken's Stage sheet, ripped by Maxim (additional: shezzor)", "key": KEY.tolist(), "pieces": {}}
P = layout["pieces"]
sky = crop(72, 208, 839, 383);   P["sky"] = {"file": save("sky", sky), "w": sky.shape[1], "h": sky.shape[0]}
ship = crop(8, 16, 528, 195);    P["ship"] = {"file": save("ship", ship), "w": ship.shape[1], "h": ship.shape[0]}
dock = crop(8, 392, 903, 463);   P["dock"] = {"file": save("dock", dock), "w": dock.shape[1], "h": dock.shape[0]}
bar = crop(560, 472, 710, 567);  P["barrels"] = {"file": save("barrels", bar), "w": bar.shape[1], "h": bar.shape[0]}
b1 = crop(760, 176, 790, 199);   P["bollard"] = {"file": save("bollard", b1), "w": b1.shape[1], "h": b1.shape[0]}
b2 = crop(800, 184, 820, 199);   P["bollard_small"] = {"file": save("bollard_small", b2), "w": b2.shape[1], "h": b2.shape[0]}

# crowd: 7 people, each a column of 2-3 cheer frames (tight boxes from the sheet)
CROWD = [
    [(552, 8, 591, 71), (552, 80, 591, 135), (552, 144, 591, 199)],
    [(600, 24, 615, 71), (600, 88, 615, 135)],
    [(624, 16, 655, 71), (624, 80, 655, 135), (624, 144, 655, 199)],
    [(664, 16, 695, 71), (664, 80, 695, 135)],
    [(704, 16, 751, 71), (704, 80, 751, 135), (704, 144, 751, 199)],
    [(760, 16, 799, 55), (760, 64, 799, 103), (760, 112, 799, 151)],
    [(808, 24, 855, 55), (808, 72, 855, 103), (808, 120, 855, 151)],
]
anims = []
for ci, col in enumerate(CROWD):
    frames = [crop(*b) for b in col]
    hits = [locate(ship, f) for f in frames]
    a = min(range(len(frames)), key=lambda i: hits[i][2])          # the frame painted on the ship = anchor
    ax, ay, ad = hits[a]; bottom = ay + frames[a].shape[0]
    entry = {"parent": "ship", "frames": []}
    for i, f in enumerate(frames):
        entry["frames"].append({"file": save(f"crowd{ci}_{i}", f), "x": ax, "y": bottom - f.shape[0], "w": f.shape[1], "h": f.shape[0]})
    entry["anchor"] = a; entry["anchorDiff"] = int(ad)
    anims.append(entry); print(f"crowd{ci}: anchor f{a} at ship ({ax},{ay}) diff {ad}")
# flag on the yacht (3 frames, inside the sky panel)
flags = [crop(848, 208, 887, 247), crop(848, 256, 887, 295), crop(848, 304, 887, 343)]
fh = [locate(sky, f) for f in flags]; a = min(range(3), key=lambda i: fh[i][2]); fx, fy, fd = fh[a]
anims.append({"parent": "sky", "anchor": a, "anchorDiff": int(fd), "frames": [{"file": save(f"flag_{i}", f), "x": fx, "y": fy, "w": f.shape[1], "h": f.shape[0]} for i, f in enumerate(flags)]})
print(f"flag: anchor f{a} at sky ({fx},{fy}) diff {fd}")
layout["anims"] = anims
# edge colours: what fills the view beyond the art (above the sky, below the dock rim)
hexc = lambda c: "#%02x%02x%02x" % tuple(int(v) for v in c)
layout["colors"] = {"skyTop": hexc(sky[0, :, :3].mean(0)), "seaBottom": hexc(sky[-1, :, :3].mean(0)), "under": hexc(dock[-1, :, :3].mean(0) * 0.6)}
# stage-select preview: sky + ship + dock composed at native scale (dock top 2px above the sky bottom, standing row 44)
pv = Image.new("RGBA", (768, 176 + 70), layout["colors"]["under"])
pv.alpha_composite(Image.fromarray(sky), (0, 0))
pv.alpha_composite(Image.fromarray(ship), (20, 176 - 2 + 6 - ship.shape[0]))
pv.alpha_composite(Image.fromarray(dock[:, :768]), (0, 174))
pv = pv.convert("RGB").resize((768 * 2, 246 * 2), Image.NEAREST); pv.save(os.path.join(out, "preview.png"))
layout["preview"] = "preview.png"
json.dump(layout, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out)
