# tools/stage_layers/slice_zangief_citadel.py — Zangief's factory (SFII sheet) → CITADEL OF RICKS (sci-fi hall).
#   python3 -I tools/stage_layers/slice_zangief_citadel.py <sheet.png> <repoRoot>
# Reads the sheet's pieces and repaints them as the inside of the Citadel of Ricks:
#   factory wall → dark steel hall; its dark window + glass dome + far corner become OPEN to space (transparent, the
#   renderer draws space, the Citadel and passing ships behind); green pipes → glowing portal-fluid conduits; the
#   yellow turbine → a portal-fluid reactor; the Russian sign → "CITADEL OF RICKS"; catwalk workers → station crew;
#   the balcony crowd → an original sci-fi crew (white lab coats, teal / orange / violet jumpsuits; the two uniformed
#   men stay station security); red steel → gunmetal;
#   chain-link fence → energy barrier; the hammer-and-sickle → a portal swirl. Ripper credit text left out.
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "zangief_citadel"); os.makedirs(out, exist_ok=True)
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
def box(t, x0, y0, x1, y1):
    m = np.zeros(t.shape[:2], bool); m[max(0, y0):y1, max(0, x0):x1] = True; return m
def hair_top(t, region, rows=5):
    """top-of-head pixels inside `region` (SF2 paints hair in skin shades, so hair is found by position)"""
    h_, s_, v_ = hsv(t); warm = (h_ < 70) & (s_ > 0.15) & (t[..., 3] > 0) | ((s_ < 0.18) & (v_ > 0.35) & (t[..., 3] > 0))
    m = np.zeros(t.shape[:2], bool); ys, xs = np.where(region)
    if not len(xs): return m
    for x in range(xs.min(), xs.max() + 1):
        col = np.where(region[:, x] & (t[:, x, 3] > 0))[0]
        if not len(col): continue
        y0 = col[0]; n = 0
        for y in range(y0, min(y0 + rows, t.shape[0])):
            if not (region[y, x] and warm[y, x]): break
            m[y, x] = True; n += 1
        if n < 2: m[y0:y0 + rows, x] = False
    return m
GUNMETAL = ((16, 20, 30), (128, 146, 168))
LABCOAT = ((120, 128, 136), (250, 252, 255)); TEAL = ((10, 70, 80), (130, 240, 225)); ORANGE = ((110, 40, 6), (255, 170, 70)); VIOLET = ((50, 20, 90), (200, 150, 255))
def red_steel(t):
    h_, s_, v_ = hsv(t); red = (h_ < 24) & (s_ > 0.55)          # orange-red steel only (pink clothes are 320-350°)
    t[red, :3] = ramp(lum(t)[red], *GUNMETAL, 1.1); return t

L = {"source": "Street Fighter II — Zangief's Stage sheet, ripped/drawn by V. Signal; repainted as the Citadel of Ricks", "pieces": {}}
P = L["pieces"]

# ── back wall
wall = crop(26, 3, 793, 226); H, W = wall.shape[:2]
h_, s_, v_ = hsv(wall); v = lum(wall)
ys = np.arange(H)[:, None] + np.zeros((1, W)); xs = np.zeros((H, 1)) + np.arange(W)[None, :]
open_win = (ys < 62) & (xs < 224) & (v_ < 0.2)                                  # the dark window, top-left
dome = (ys < 66) & (xs >= 224) & (xs < 640) & (s_ < 0.3) & (v_ > 0.45)          # pale glass panes of the dome
corner = (ys < 92) & (xs >= 630) & (v_ < 0.36) & ~((h_ > 90) & (h_ < 200) & (s_ > 0.35))
green = (h_ > 95) & (h_ < 175) & (s_ > 0.25)
tanks = green & (ys >= 44) & (ys < 92) & (((xs >= 448) & (xs <= 512)) | ((xs >= 573) & (xs <= 640)))
girder = green & (ys < 66) & ~tanks
pipes = green & (ys >= 62) & ~((xs > 440) & (xs < 520) & (ys < 92))             # (not the catwalk tanks)
yellow = (h_ > 45) & (h_ < 75) & (s_ > 0.35)
col = ramp(v, (10, 13, 22), (74, 86, 112), 1.3)                                 # walls / bricks → dark steel
col[girder] = ramp(v[girder], (20, 30, 40), (150, 176, 196))                    # dome girders → chrome
col[pipes] = ramp(v[pipes], (12, 50, 20), (178, 245, 96), 0.9)                  # portal-fluid conduits
col[tanks] = ramp(v[tanks], (14, 60, 30), (190, 255, 120), 0.8)                 # portal-fluid canisters
col[yellow] = ramp(v[yellow], (16, 60, 14), (214, 255, 120), 0.85)              # the reactor
hazard = ((h_ < 40) | (h_ > 340)) & (s_ > 0.5) & (ys > 60) & (ys < 100)         # catwalk rails + hazard stripes stay
col[hazard] = wall[hazard, :3]
# catwalk workers → station crew: teal jumpsuit (left), lab coat (right)
crew = box(wall, 398, 44, 416, 70); sci = box(wall, 418, 40, 440, 70)
cm = crew & (s_ > 0.15) & (h_ > 90) & (h_ < 180); col[cm] = ramp(v[cm], *TEAL)
coat = sci & (s_ < 0.2) & (v_ > 0.45); col[coat] = ramp(v[coat], *LABCOAT)
wall[..., :3] = col
viewport = (ys >= 68) & (ys < 116) & (xs < 392) & ~pipes                   # a long viewport onto space through the brick wall
frame = ((ys >= 65) & (ys < 68) | (ys >= 116) & (ys < 119)) & (xs < 392)
wall[frame & ~pipes, :3] = [150, 170, 190]
wall[open_win | corner | viewport, 3] = 0
wall[dome, 3] = 24                                                              # glass: space shows through, faint tint
wall[dome, :3] = [150, 220, 210]
# the sign → CITADEL OF RICKS
img = Image.fromarray(np.clip(wall, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
sx0, sy0, sx1, sy1 = 268, 75, 386, 91
d.rectangle([sx0, sy0, sx1, sy1], fill=(214, 236, 226, 255), outline=(40, 70, 60, 255))
try: font = ImageFont.load_default(size=11)
except TypeError: font = ImageFont.load_default()
# (the sign text is drawn sharp at runtime by stageLayers.js citadelWall)
wall = np.array(img).astype(float)
P["wall"] = {"file": save("wall", wall), "w": W, "h": H, "reactor": [440, 128, 328, 96], "window": [0, 0, 224, 62], "sign": [sx0, sy0, sx1, sy1]}

# ── balcony crowd (3 frames, both tiers): an original sci-fi crew
def rm_crowd(t):
    h_, s_, v_ = hsv(t); v = lum(t); col = t[..., :3].copy()
    t = red_steel(t); col = t[..., :3].copy(); h_, s_, v_ = hsv(t)
    # top tier: pink top → violet jumpsuit, blue shirt → teal, purple sweater → lab coat
    for rg, lo, hi, pal in [(box(t, 14, 0, 46, 70), 320, 360, VIOLET), (box(t, 47, 2, 84, 32), 185, 235, TEAL), (box(t, 86, 0, 128, 74), 255, 330, LABCOAT)]:
        m = rg & (h_ > lo) & (h_ < hi) & (s_ > 0.15); col[m] = ramp(v[m], *pal)
    jer = box(t, 30, 28, 86, 72); g = jer & (h_ > 90) & (h_ < 170) & (s_ > 0.2); col[g] = ramp(v[g], *ORANGE)   # green shirt → flight suit
    # bottom tier: pink-shirt man → lab coat (the uniformed pair stay as station security)
    rg = box(t, 84, 82, 128, 166); pink = rg & (((h_ > 320) | (h_ < 12)) & (s_ > 0.3)); col[pink] = ramp(v[pink], *LABCOAT)
    t[..., :3] = col; return t
frames = [rm_crowd(crop(*b)) for b in [(26, 230, 153, 395), (157, 230, 284, 395), (288, 230, 415, 395)]]

# ── the floor scene (composite 26..867 x 399..687): scaffold, fence + pillar, floor
scaff = red_steel(crop(100, 399, 370, 627))
cx, cy = 212 - 100, 448 - 399                                            # crowd anchor inside the scaffold
scaff[cy:cy + frames[0].shape[0], cx:cx + frames[0].shape[1]] = frames[0]
P["scaffold"] = {"file": save("scaffold", scaff), "w": scaff.shape[1], "h": scaff.shape[0]}
L["anims"] = [{"parent": "scaffold", "anchor": -1, "frames": [{"file": save(f"crowd_{i}", f), "x": cx, "y": cy, "w": f.shape[1], "h": f.shape[0]} for i, f in enumerate(frames)]}]
fence = red_steel(crop(350, 520, 714, 627))
h_, s_, v_ = hsv(fence); g = (h_ > 80) & (h_ < 180) & (s_ > 0.15)
fence[g, :3] = ramp(lum(fence)[g], (10, 60, 70), (140, 255, 220), 0.9)
fence[~g & (fence[..., 3] > 0) & (v_ < 0.5), :3] = ramp(lum(fence)[~g & (fence[..., 3] > 0) & (v_ < 0.5)], *GUNMETAL)
# the two Russian signs → a dark warning panel with a portal ring, and a green status light
fi = Image.fromarray(np.clip(fence, 0, 255).astype(np.uint8)); fd = ImageDraw.Draw(fi)
fd.rectangle([134, 42, 162, 68], fill=(20, 28, 36, 255), outline=(170, 255, 90, 255))
fd.ellipse([140, 47, 156, 63], outline=(170, 255, 90, 255), width=2); fd.ellipse([145, 52, 151, 58], fill=(230, 255, 160, 255))
fd.rectangle([317, 56, 336, 65], fill=(18, 26, 30, 255), outline=(90, 110, 120, 255)); fd.ellipse([322, 57, 330, 64], fill=(150, 255, 90, 255))
fence = np.array(fi).astype(float)
P["fence"] = {"file": save("fence", fence), "w": fence.shape[1], "h": fence.shape[0]}
pillar = red_steel(crop(788, 399, 822, 627)); P["pillar"] = {"file": save("pillar", pillar), "w": pillar.shape[1], "h": pillar.shape[0]}

floor = crop(26, 628, 867, 687); FH, FW = floor.shape[:2]
for y in range(FH):                                                       # fill each row's ragged ends by mirroring
    op = np.where(floor[y, :, 3] > 0)[0]
    if not len(op): continue
    a, b = op[0], op[-1]; seg = floor[y, a:b + 1].copy(); n = len(seg)
    for x in range(0, a): floor[y, x] = seg[(a - 1 - x) % n]
    for x in range(b + 1, FW): floor[y, x] = seg[n - 1 - ((x - b - 1) % n)]
fh, fs, fv = hsv(floor); fl = lum(floor)
emb = (fs < 0.12) & (fv > 0.85)                                           # the white hammer-and-sickle (+ highlights)
ys_, xs_ = np.where(emb & (np.arange(FW)[None, :] > 380) & (np.arange(FW)[None, :] < 600))
ex0, ex1, ey0, ey1 = xs_.min(), xs_.max(), ys_.min(), ys_.max()
fcol = ramp(fl, (8, 12, 20), (70, 96, 110), 1.4)
grid = (fh > 60) & (fh < 200) & (fs > 0.3) & (fl < 0.35)                  # the darker seam lines → faint neon grid
fcol[grid] = ramp(fl[grid], (20, 90, 60), (90, 220, 140))
floor[..., :3] = fcol
wd = (ex1 + 5) - (ex0 - 4)                                                # paint it out with the same rows further left
floor[ey0 - 2:ey1 + 3, ex0 - 4:ex1 + 5, :3] = floor[ey0 - 2:ey1 + 3, ex0 - 4 - wd:ex0 - 4, :3]
P["floor"] = {"file": save("floor", floor), "w": FW, "h": FH, "emblem": [int((ex0 + ex1) / 2), int((ey0 + ey1) / 2), int(ex1 - ex0), int(ey1 - ey0)]}

L["colors"] = {"skyTop": "#04030b", "under": "#05070c", "seaBottom": "#05070c"}
pv = Image.new("RGBA", (W, H + 60), (6, 4, 18, 255))
pd = ImageDraw.Draw(pv)
for i in range(160): pd.point(((i * 7919) % W, (i * 104729) % (H // 2)), fill=(220, 230, 255, 255))
pv.alpha_composite(Image.fromarray(np.clip(wall, 0, 255).astype(np.uint8)), (0, 0))
pv.alpha_composite(Image.fromarray(np.clip(floor[:, :W], 0, 255).astype(np.uint8)), (0, H))
pv.alpha_composite(Image.fromarray(np.clip(scaff, 0, 255).astype(np.uint8)).resize((scaff.shape[1] // 2, scaff.shape[0] // 2)), (30, H - scaff.shape[0] // 2 + 6))
pv = pv.convert("RGB").resize((W * 2, (H + 60) * 2), Image.NEAREST); pv.save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()}, "emblem", P["floor"]["emblem"])
