# tools/stage_layers/slice_guile_batcave.py — Guile's air base (SFII CE sheet) → THE BATCAVE.
#   python3 -I tools/stage_layers/slice_guile_batcave.py <sheet.png> <repoRoot>
# Reads the sheet's pieces and repaints each for the cave:
#   sunset sky → cave ceiling (dark rock with a stalactite edge) · horizon + hangars → cave depths (vehicle bays, blue
#   glow, a Batcomputer screen bank) · F-16 → BATWING (black, smoked canopy, blue running lights, bat emblems) ·
#   tarmac → dark steel deck with the star roundel replaced by a Bat-symbol · airmen → ALFRED-style butlers (black
#   suits, silver hair; the white shirts stay) and the blonde airwoman → red hair · fence + crates darkened.
# Frame boxes are read from the sheet; the ripper's credit text is left out. Writes stages/guile_batcave/*.
import sys, os, json, colorsys
import numpy as np
from PIL import Image, ImageDraw

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "guile_batcave"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[0, 0, :3].copy()

def crop(x0, y0, x1, y1):
    t = SRC[y0:y1 + 1, x0:x1 + 1].copy()
    t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0
    return t

def hsv(t):
    rgb = t[..., :3] / 255.0
    mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    nz = d > 1e-6
    hr = nz & (mx == r); hg = nz & (mx == g) & ~hr; hb = nz & ~hr & ~hg
    h[hr] = ((g - b)[hr] / d[hr]) % 6; h[hg] = (b - r)[hg] / d[hg] + 2; h[hb] = (r - g)[hb] / d[hb] + 4
    h *= 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx

def lum(t): return (t[..., :3] @ np.array([0.299, 0.587, 0.114])) / 255.0
def ramp(v, lo, hi, gamma=1.0):
    lo, hi = np.array(lo, float), np.array(hi, float)
    return lo + (hi - lo) * (np.clip(v, 0, 1) ** gamma)[..., None]
def save(name, t):
    Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, name + ".png")); return name + ".png"

# classic bat emblem, as a polygon in a unit box (x −1..1, y −0.5..0.5), symmetric
_HALF = [(0, -0.12), (0.06, -0.30), (0.10, -0.14), (0.20, -0.16), (0.38, -0.40), (0.62, -0.46), (0.86, -0.36),
         (1.0, -0.06), (0.88, 0.04), (0.74, 0.0), (0.62, 0.12), (0.46, 0.06), (0.30, 0.22), (0.16, 0.14), (0.0, 0.42)]
BAT = _HALF + [(-x, y) for x, y in reversed(_HALF[1:-1])]
def bat_emblem(t, cx, cy, w, h, oval=(250, 204, 21), bat=(10, 10, 14), oval_scale=1.25):
    """paint a yellow-oval Bat-symbol centred at (cx, cy), w x h (perspective = squash h)"""
    img = Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
    ow, oh = w * oval_scale / 2, h * oval_scale / 2
    d.ellipse([cx - ow - 1, cy - oh - 1, cx + ow + 1, cy + oh + 1], fill=(12, 12, 16, 255))
    d.ellipse([cx - ow, cy - oh, cx + ow, cy + oh], fill=oval + (255,))
    d.polygon([(cx + x * w / 2, cy + y * h) for x, y in BAT], fill=bat + (255,))
    return np.array(img).astype(float)

L = {"source": "Street Fighter II CE — Guile's Stage sheet, ripped/drawn by V. Signal; repainted as the Batcave", "pieces": {}, "anims": []}
P = L["pieces"]

# ── cave ceiling (was the sunset sky strip) + a jagged stalactite bottom edge
sky = crop(8, 9, 1031, 84)
v = lum(sky)
sky[..., :3] = ramp(v, (6, 8, 13), (58, 66, 82), 1.3)
H, Wd = sky.shape[:2]
for x in range(Wd):                                  # deterministic stalactites (hash of the column)
    k = (x * 2654435761) & 0xffffffff
    big = (x // 9) * 2654435761 & 0xffffffff                       # stalactites come in 9-px clusters
    if (big >> 9) % 4 == 0:
        c = (x % 9) - 4; tip = max(0, int((14 + big % 22) * (1 - abs(c) / 5.0)))
    else:
        tip = k % 3
    sky[H - tip:, x, 3] = 0
P["ceiling"] = {"file": save("ceiling", sky), "w": Wd, "h": H}

# ── cave depths (was the horizon: hangars, trees, runway)
far = crop(11, 276, 701, 419)
h_, s_, v_ = hsv(far); v = lum(far)
col = ramp(v, (5, 7, 12), (46, 54, 70), 1.4)
glowm = (h_ > 35) & (h_ < 75) & (s_ > 0.35) & (v_ > 0.6)       # the yellow horizon glow → deep blue light
col[glowm] = ramp(v[glowm], (4, 9, 20), (22, 56, 112), 1.7)
far[..., :3] = col
# Batcomputer: a big screen + four small ones on a dark console, painted into the depths (between the bays and the trees)
img = Image.fromarray(np.clip(far, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
BX, BY = 300, 30
d.rectangle([BX - 6, BY - 6, BX + 190, BY + 92], fill=(10, 12, 18, 255))           # console frame
d.rectangle([BX + 50, BY, BX + 134, BY + 48], fill=(20, 70, 140, 255))            # main screen
for i, (sx, sy) in enumerate([(BX, BY), (BX, BY + 28), (BX + 140, BY), (BX + 140, BY + 28)]):
    d.rectangle([sx, sy, sx + 44, sy + 22], fill=(16, 56, 110, 255))
d.rectangle([BX - 10, BY + 70, BX + 194, BY + 86], fill=(22, 26, 36, 255))         # desk
for k in range(0, 190, 6): d.point((BX + k, BY + 76), fill=(80, 160, 255, 255))     # key lights
far = np.array(img).astype(float)
L["computer"] = {"main": [BX + 50, BY, 84, 48], "small": [[BX, BY, 44, 22], [BX, BY + 28, 44, 22], [BX + 140, BY, 44, 22], [BX + 140, BY + 28, 44, 22]]}
P["depths"] = {"file": save("depths", far), "w": far.shape[1], "h": far.shape[0]}

# ── the jet panel: jet (rows 92..203, over the sky key) and the deck (rows 204..267)
jet = crop(8, 92, 1031, 203)
h_, s_, v_ = hsv(jet); v = lum(jet)
col = ramp(v, (6, 7, 10), (88, 98, 118), 1.55)                  # gunmetal → Batwing black
canopy = (h_ > 255) & (h_ < 345) & (s_ > 0.2)
col[canopy] = ramp(v[canopy], (8, 16, 30), (90, 150, 210), 1.1)
hot = ((h_ < 40) | (h_ > 345)) & (s_ > 0.45) & (v_ > 0.35)       # orange/red details → blue running lights
col[hot] = ramp(v[hot], (20, 60, 140), (90, 190, 255), 0.8)
jet[..., :3] = col
a = jet[..., 3] > 0
ys, xs = np.where(a); jx0, jx1, jy0, jy1 = xs.min(), xs.max(), ys.min(), ys.max()
jet = bat_emblem(jet, 505, 52, 34, 12)                           # fuselage, ahead of the wing
jet = bat_emblem(jet, 712, 18, 18, 7, oval_scale=1.15)           # tail fin
jet[~a, 3] = 0
P["batwing"] = {"file": save("batwing", jet), "w": jet.shape[1], "h": jet.shape[0]}

deck = crop(8, 204, 1031, 267)
h_, s_, v_ = hsv(deck); v = lum(deck)
roundel = (h_ < 40) & (s_ > 0.45) & (v_ > 0.5)                   # the orange ring of the star roundel
col = ramp(v, (14, 16, 22), (72, 80, 96), 1.6)
cyan = (h_ > 170) & (h_ < 210) & (s_ > 0.4)                      # the blue edge stripe → guide lights
col[cyan] = ramp(v[cyan], (20, 90, 200), (110, 200, 255))
deck[..., :3] = col
ys, xs = np.where(roundel)
rx0, rx1, ry0, ry1 = xs.min(), xs.max(), ys.min(), ys.max()
deck[ry0 - 1:ry1 + 2, rx0 - 1:rx1 + 2, :3] = deck[ry0 - 4:ry0 - 3, rx0 - 1:rx1 + 2, :3]   # paint the roundel out
deck = bat_emblem(deck, (rx0 + rx1) / 2, (ry0 + ry1) / 2, (rx1 - rx0) * 0.78, (ry1 - ry0) * 0.62)
P["deck"] = {"file": save("deck", deck), "w": deck.shape[1], "h": deck.shape[0], "emblem": [int(rx0), int(ry0), int(rx1 - rx0), int(ry1 - ry0)]}

# ── the crew → Alfred-style butlers
def butler(t, girl_right=False):
    h_, s_, v_ = hsv(t); v = lum(t); col = t[..., :3].copy()
    uniform = (h_ > 55) & (h_ < 140) & (s_ > 0.12) & (v_ < 0.85)              # olive green → black tailcoat
    col[uniform] = ramp(v[uniform], (6, 6, 9), (70, 72, 82), 1.25)
    vest = (h_ < 38) & (s_ > 0.72) & (v_ > 0.55)                              # mechanic's orange vest → charcoal waistcoat
    col[vest] = ramp(v[vest], (18, 18, 24), (80, 82, 94))
    # hair: this sheet paints hair with the SAME peach shades as skin, so it is found by POSITION — the first few
    # warm pixels from the top of each column (the top of each head)
    warm = (h_ < 70) & (s_ > 0.2) & (t[..., 3] > 0)
    blond = np.zeros(warm.shape, bool)
    for x in range(t.shape[1]):
        ys = np.where(t[:, x, 3] > 0)[0]
        if not len(ys): continue
        y0 = ys[0]; run = 0
        if y0 > t.shape[0] * 0.4: continue                     # only heads (feet/shoes are never hair)
        for y in range(y0, min(y0 + 6, t.shape[0])):
            if not warm[y, x]: break
            blond[y, x] = True; run += 1
        if run < 2: blond[y0:y0 + 6, x] = False
    hair = ramp(v, (110, 112, 120), (232, 234, 240))
    red = ramp(v, (90, 14, 10), (226, 70, 40))
    if girl_right:
        # she is shorter: her columns start lower than the man's head top (+6 rows), on the right half
        tops = np.array([np.argmax(t[:, x, 3] > 0) if (t[:, x, 3] > 0).any() else 10**6 for x in range(t.shape[1])])
        man_top = tops.min()
        cols = (tops >= man_top + 6) & (np.arange(t.shape[1]) >= t.shape[1] * 0.4)
        her = np.zeros(t.shape[:2], bool); her[:, cols] = True
        col[blond & her] = red[blond & her]; col[blond & ~her] = hair[blond & ~her]
    else:
        col[blond] = hair[blond]
    t[..., :3] = col; return t

def anim(name, boxes, girl_right=False):
    fr = [butler(crop(*b), girl_right) for b in boxes]
    w = max(f.shape[1] for f in fr); h = max(f.shape[0] for f in fr)
    files = []
    for i, f in enumerate(fr):                                  # bottom-align every frame in one box
        c = np.zeros((h, w, 4)); c[h - f.shape[0]:, :f.shape[1]] = f
        files.append(save(f"{name}_{i}", c))
    P[name] = {"frames": files, "w": w, "h": h, "file": files[0]}
anim("butlers_crates", [(751, 278, 878, 357), (883, 278, 1010, 357), (751, 360, 878, 439), (882, 360, 1009, 439), (751, 464, 878, 543), (882, 464, 1009, 543)])
anim("butler_pair", [(550, 450, 610, 539), (614, 450, 671, 539), (675, 450, 731, 539)], girl_right=True)
anim("mechanic", [(335, 441, 398, 541), (402, 441, 465, 541), (469, 430, 532, 541)])

fence = crop(15, 434, 139, 552); fence[..., :3] = ramp(lum(fence), (8, 9, 12), (90, 96, 108), 1.3)
P["fence"] = {"file": save("fence", fence), "w": fence.shape[1], "h": fence.shape[0]}
crate = crop(155, 552, 250, 631); crate[..., :3] = crate[..., :3] * np.array([0.55, 0.52, 0.55])
P["crate"] = {"file": save("crate", crate), "w": crate.shape[1], "h": crate.shape[0]}

L["colors"] = {"skyTop": "#05070b", "under": "#07080c", "seaBottom": "#07080c"}
# preview card
pv = Image.new("RGBA", (1024, 300), (5, 7, 11, 255))
pv.alpha_composite(Image.fromarray(np.clip(far, 0, 255).astype(np.uint8)).resize((1024, 214)), (0, 30))
pv.alpha_composite(Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8)), (0, 0))
pv.alpha_composite(Image.fromarray(np.clip(deck, 0, 255).astype(np.uint8)), (0, 236))
pv.alpha_composite(Image.fromarray(np.clip(jet, 0, 255).astype(np.uint8)), (0, 236 - 112))
pv = pv.convert("RGB").resize((1536, 450), Image.NEAREST); pv.save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
