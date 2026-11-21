# tools/stage_layers/slice_honda_training.py — E. Honda's bathhouse (SFII sheet) → a WHITE HOLOGRAM TRAINING CENTER.
#   python3 -I tools/stage_layers/slice_honda_training.py <sheet.png> <repoRoot>
# Cuts the pieces that keep the room's layout (back wall + wash stations + mural, side door wall, bath tub, bucket)
# and re-renders each as hologram art: bright white surfaces (the original light/dark kept only as a faint shade),
# every edge of the original drawn as a glowing cyan line, the mural turned into a ghosted projection screen.
# Floor, ceiling and side walls are drawn live in 3D by stageLayers.js (room3d mode) with the same layout (sumo ring,
# start lines, tile grid). Writes stages/honda_training/*.png + layout.json + preview.png.
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "honda_training"); os.makedirs(out, exist_ok=True)
im = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = im[0, 0, :3].copy()
alpha_all = (~np.all(im[:, :, :3] == KEY, axis=2)).astype(float)

WHITE = np.array([246, 250, 253.0]); SHADE = np.array([196, 214, 228.0]); LINE = np.array([70, 196, 255.0])

def holo(box, mode="surface", clear_tiles_above=None, keep=None):
    """clear_tiles_above: sheet row — teal wall-tile pixels above it become transparent (the live renderer draws the
    clean white square-tile wall there); `keep` = a sheet box that is never cleared (the mural)."""
    x0, y0, x1, y1 = box
    rgb = im[y0:y1 + 1, x0:x1 + 1, :3]; a = alpha_all[y0:y1 + 1, x0:x1 + 1].copy()
    if clear_tiles_above is not None:
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        teal = (g - r > 20) & (b - r > 10) & (np.abs(g - b) < 60)
        ys = np.arange(y0, y1 + 1)[:, None] + np.zeros_like(r)
        xs = np.arange(x0, x1 + 1)[None, :] + np.zeros_like(r)
        m = teal & (ys < clear_tiles_above)
        if keep: m &= ~((xs >= keep[0]) & (xs <= keep[2]) & (ys >= keep[1]) & (ys <= keep[3]))
        m = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))) > 127
        a[m] = 0
    lum = (rgb @ np.array([0.299, 0.587, 0.114])) / 255.0
    # edges of the ORIGINAL art (luminance + colour changes) → the hologram's line work
    gy, gx = np.gradient(lum); mag = np.hypot(gx, gy)
    cg = sum(np.hypot(*np.gradient(rgb[:, :, k] / 255.0)) for k in range(3)) / 3
    e = np.clip((np.maximum(mag, cg) - 0.05) * 6.0, 0, 1)        # strong edges only: no busy texture
    # outline of the piece itself (where it meets transparency)
    ea = np.clip(np.hypot(*np.gradient(a)) * 2.0, 0, 1)
    e = np.maximum(e, ea)
    if mode == "surface":       # white surface, faint shading, cyan edges
        base = SHADE + (WHITE - SHADE) * (0.35 + 0.65 * lum[..., None])
        col = base * (1 - e[..., None] * 0.85) + LINE * (e[..., None] * 0.85)
        out_a = a
    else:                       # "projection": translucent screen, the picture survives only as glowing lines
        base = np.array([225, 243, 255.0]) * np.ones_like(rgb)
        ee = np.clip(e * 1.3, 0, 1)
        col = base * (1 - ee[..., None]) + LINE * ee[..., None]
        out_a = a * (0.30 + 0.70 * ee)
    o = np.dstack([np.clip(col, 0, 255), np.clip(out_a * 255, 0, 255)]).astype(np.uint8)
    return o

def save(name, arr):
    Image.fromarray(arr).save(os.path.join(out, name + ".png")); return name + ".png"

L = {"source": "Street Fighter II / Super SFII — E. Honda's Stage sheet, ripped by Maxim; re-rendered as a hologram training center",
     "pieces": {}}
P = L["pieces"]
# back wall: tiles + mural + wash stations + bench (sheet 216..790 x 176..302)
WALL = (216, 176, 790, 302)
wall = holo(WALL, clear_tiles_above=286, keep=(312, 184, 630, 288))
MURAL = (312, 184, 630, 288)    # the Fuji / rising sun / kabuki mural → projection screen
mur = holo(MURAL, "projection")
mx, my = MURAL[0] - WALL[0], MURAL[1] - WALL[1]
wall[my:my + mur.shape[0], mx:mx + mur.shape[1]] = mur
P["wall"] = {"file": save("wall", wall), "w": wall.shape[1], "h": wall.shape[0], "mural": [mx, my, mur.shape[1], mur.shape[0]]}
door = holo((120, 128, 215, 326), clear_tiles_above=400); P["door"] = {"file": save("door", door), "w": door.shape[1], "h": door.shape[0]}
tub = holo((312, 312, 647, 367));  P["tub"] = {"file": save("tub", tub), "w": tub.shape[1], "h": tub.shape[0]}
bucket = holo((232, 318, 263, 343)); P["bucket"] = {"file": save("bucket", bucket), "w": bucket.shape[1], "h": bucket.shape[0]}
# plain wash-station strips at both ends of the wall (repeated, mirrored, to run the wall out to the side walls)
L["wallRepeat"] = {"left": [0, 96], "right": [424, 574]}

# preview card: white room, wall + tub + a hint of the floor grid
pv = Image.new("RGBA", (wall.shape[1], wall.shape[0] + 70), (236, 244, 250, 255))
pv.alpha_composite(Image.fromarray(wall), (0, 0))
d = np.array(pv)
for k in range(-12, 13):                             # floor grid lines converging on the wall
    for y in range(wall.shape[0], d.shape[0]):
        t = (y - wall.shape[0]) / 70
        x = int(d.shape[1] / 2 + k * 24 * (1 + 2.5 * t))
        if 0 <= x < d.shape[1]: d[y, x, :3] = (110, 205, 255)
for yy in (6, 16, 30, 50):
    d[wall.shape[0] + yy, :, :3] = (150, 215, 250)
pv = Image.fromarray(d)
pv.alpha_composite(Image.fromarray(tub), ((wall.shape[1] - tub.shape[1]) // 2, wall.shape[0] - tub.shape[0] + 30))
pv = pv.convert("RGB").resize((pv.width * 2, pv.height * 2), Image.NEAREST); pv.save(os.path.join(out, "preview.png"))
L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
