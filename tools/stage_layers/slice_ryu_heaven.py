# tools/stage_layers/slice_ryu_heaven.py — Ryu's Stage (SFII sheet) → HEAVEN'S ARENA (a fighting tower high above the clouds).
#   python3 -I tools/stage_layers/slice_ryu_heaven.py <sheet.png> <repoRoot>
# Reads the sheet's pieces and repaints them:
#   the two sunset sky halves → one wide high-altitude dusk sky (violet → rose → peach, the moon kept);
#   the long wooden fence → the arena's stone barrier wall in front of the stands (pale stone, violet + gold trim);
#   the wooden plank floor → the stone tiles of a raised fighting ring; its bottom trim → the ring's lit edge;
#   the two hanging calligraphy signs → blank banners (the renderer writes the arena name + floor number on them).
# The castle, roof tiles and ripper credit are left out. Stands, crowd, scoreboard, windows and clouds are drawn
# by stageLayers.js (set "ryu_heaven").
import sys, os, json
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "ryu_heaven"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[0, 0, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def lum(t): return (t[..., :3] @ np.array([0.299, 0.587, 0.114])) / 255.0
def ramp3(v, stops):
    v = np.clip(v, 0, 1); out = np.zeros(v.shape + (3,))
    xs = [s[0] for s in stops]; cs = np.array([s[1] for s in stops], float)
    for ch in range(3): out[..., ch] = np.interp(v, xs, cs[:, ch])
    return out
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
L = {"source": "Street Fighter II — Ryu's Stage sheet, ripped by ultimategab; repainted as Heaven's Arena", "pieces": {}}
P = L["pieces"]

# sky: both halves side by side, recoloured by brightness into a high dusk
sky = np.concatenate([crop(9, 10, 520, 153), crop(529, 10, 1040, 153)], axis=1)
v = lum(sky)
moon = v > 0.82
sky[..., :3] = ramp3(v, [(0.0, (34, 16, 66)), (0.3, (92, 44, 120)), (0.55, (196, 92, 150)), (0.75, (248, 160, 150)), (0.9, (255, 214, 170)), (1.0, (255, 244, 220))])
sky[moon, :3] = ramp3(v[moon], [(0.82, (230, 226, 255)), (1.0, (255, 255, 255))])
P["sky"] = {"file": save("sky", sky), "w": sky.shape[1], "h": sky.shape[0]}

# barrier wall: the fence planks → stone blocks; posts → violet pillars; top rail → gold trim
wall = crop(277, 283, 671, 377); v = lum(wall); H, W = wall.shape[:2]
col = ramp3(v, [(0.0, (40, 32, 58)), (0.35, (120, 110, 140)), (0.7, (206, 200, 216)), (1.0, (246, 244, 250))])
ys = np.arange(H)[:, None] + np.zeros((1, W))
col[ys < 7] = ramp3(v[ys < 7], [(0.0, (90, 60, 10)), (0.6, (214, 170, 60)), (1.0, (255, 236, 150))])     # gold top rail
band = (ys >= H - 10)
col[band] = ramp3(v[band], [(0.0, (30, 18, 56)), (1.0, (130, 90, 200))])                               # violet base band
wall[..., :3] = col
P["wall"] = {"file": save("wall", wall), "w": W, "h": H}

# floor: wood → pale stone tiles (keep the plank seams + perspective as tile joints)
floor = crop(8, 461, 903, 496); FH, FW = floor.shape[:2]
for y in range(FH):                                       # the trapezoid's ragged ends → filled by mirroring each row
    op = np.where(floor[y, :, 3] > 0)[0]
    if not len(op): continue
    a, b = op[0], op[-1]; seg = floor[y, a:b + 1].copy(); n = len(seg)
    for x in range(0, a): floor[y, x] = seg[(a - 1 - x) % n]
    for x in range(b + 1, FW): floor[y, x] = seg[n - 1 - ((x - b - 1) % n)]
for y in range(FH):                                       # any hole left inside a row → the nearest opaque pixel
    op = np.where(floor[y, :, 3] > 0)[0]
    if len(op) and len(op) < FW:
        idx = op[np.abs(np.arange(FW)[:, None] - op[None, :]).argmin(1)]; floor[y] = floor[y, idx]
dark = lum(floor) < 0.18                                  # the sheet's dark backing strips → the nearest stone row below
for y in range(FH - 2, -1, -1): floor[y, dark[y]] = floor[y + 1, dark[y]]
v = lum(floor)
floor[..., :3] = ramp3(v, [(0.0, (46, 40, 62)), (0.35, (128, 122, 146)), (0.6, (186, 182, 200)), (0.85, (222, 220, 232)), (1.0, (244, 242, 250))])
P["floor"] = {"file": save("floor", floor), "w": floor.shape[1], "h": floor.shape[0]}
trim = crop(8, 505, 902, 516); v = lum(trim)
trim[..., :3] = ramp3(v, [(0.0, (60, 40, 10)), (0.6, (214, 170, 60)), (1.0, (255, 240, 170))])
P["trim"] = {"file": save("trim", trim), "w": trim.shape[1], "h": trim.shape[0]}

# banners: keep the wooden frame + post, blank the paper (text drawn at runtime)
for name, box in [("banner", (815, 333, 849, 435))]:
    b = crop(*box); v = lum(b); a = b[..., 3] > 0
    paper = a & (v > 0.55) | a & (v < 0.25) & (np.abs(b[..., 0] - b[..., 2]) < 20)    # light paper + the black ink
    hh, ww = b.shape[:2]; yy = np.arange(hh)[:, None] + np.zeros((1, ww)); xx = np.zeros((hh, 1)) + np.arange(ww)[None, :]
    inner = a & (xx > 2) & (xx < ww - 3) & (yy > 3) & (yy < hh * (0.82 if name == "banner" else 0.66))
    b[inner, :3] = np.array([246, 240, 252]) - 18 * (yy[inner] % 6 == 0)[..., None]
    rest = a & ~inner
    b[rest, :3] = ramp3(v[rest], [(0.0, (40, 20, 60)), (0.5, (120, 70, 170)), (1.0, (220, 190, 255))])
    P[name] = {"file": save(name, b), "w": ww, "h": hh, "paper": [3, 4, ww - 4, int(hh * (0.82 if name == "banner" else 0.66))]}

L["colors"] = {"skyTop": "#22103f", "under": "#0c0718", "seaBottom": "#0c0718"}
pv = Image.new("RGBA", (W * 2, 260), (34, 16, 66, 255))
pv.alpha_composite(Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8)).resize((W * 2, 144)), (0, 0))
wi = Image.fromarray(np.clip(wall, 0, 255).astype(np.uint8)); pv.alpha_composite(wi, (0, 260 - 36 - H)); pv.alpha_composite(wi, (W, 260 - 36 - H))
pv.alpha_composite(Image.fromarray(np.clip(floor, 0, 255).astype(np.uint8)).crop((0, 0, W * 2, 36)), (0, 224))
pv.convert("RGB").resize((W * 4, 520), Image.NEAREST).save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
