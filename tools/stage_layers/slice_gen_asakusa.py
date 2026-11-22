# tools/stage_layers/slice_gen_asakusa.py — Gen's Stage (Street Fighter, 1987 arcade; sheet ripped by TonyWanKenobian) →
# ASAKUSA at night, Taishō-era Tokyo (Demon Slayer).   python3 -I tools/stage_layers/slice_gen_asakusa.py <sheet.png> <repoRoot>
#   street = the shop street, every English/Chinese sign board painted over as a blank wooden board (their rects go to
#   layout.json — stageLayers.js letters them in Japanese, the right way round on every mirrored copy), the whole picture
#   re-lit for night; floor = the pavement, night-lit, carried on toward the camera; sky = the starry night strip.
import sys, os, json, random
import numpy as np
from PIL import Image

sheet, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "gen_asakusa"); os.makedirs(out, exist_ok=True)
SRC = np.array(Image.open(sheet).convert("RGBA")).astype(float)
KEY = SRC[2, 2, :3].copy()
def crop(x0, y0, x1, y1):
    t = SRC[y0:y1, x0:x1].copy(); t[np.all(t[:, :, :3] == KEY, axis=2), 3] = 0; return t
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
X0, Y0, FY = 8, 16, 207
ST = crop(X0, Y0, 776, FY)
SIGNS = [  # sheet rects (x0,y0,x1,y1) of the sign boards + the Japanese each one gets
    ((10, 18, 178, 55), "浅草呉服店", "h"), ((10, 58, 185, 78), "反物・帯", "h"), ((190, 72, 316, 112), "甘味処", "h"),
    ((343, 96, 415, 121), "蕎麦", "h"), ((470, 25, 605, 68), "牛鍋屋", "h"), ((645, 30, 776, 88), "西洋菓子", "h"), ((628, 88, 776, 125), "雑貨・小間物", "h")]
rng = random.Random(3)
rects = []
for (x0, y0, x1, y1), txt, d in SIGNS:
    a, b, c_, e = x0 - X0, y0 - Y0, min(x1, 776) - X0, y1 - Y0
    for y in range(b, e):
        for x in range(a, c_):
            if ST[y, x, 3] == 0: continue
            g = 0.85 + 0.15 * np.sin(y * 0.9 + rng.random() * 0.4) + rng.uniform(-0.05, 0.05)
            edge = y < b + 2 or y >= e - 2 or x < a + 2 or x >= c_ - 2
            ST[y, x, :3] = (np.array([46, 30, 20]) if edge else np.array([92, 60, 38]) * g)
    rects.append({"x": a, "y": b, "w": c_ - a, "h": e - b, "txt": txt})
# night: cool + dark, with the lit shopfront colours kept a little warmer
L = (0.3 * ST[:, :, 0] + 0.55 * ST[:, :, 1] + 0.15 * ST[:, :, 2]) / 255
night = np.stack([ST[:, :, 0] * 0.42 + 6, ST[:, :, 1] * 0.44 + 8, ST[:, :, 2] * 0.62 + 22], axis=2)
warm = (ST[:, :, 0] > ST[:, :, 2] + 40)[:, :, None]
ST[:, :, :3] = np.where(warm, night * np.array([1.25, 1.05, 0.8]), night)
F = crop(X0, FY, 776, 240); FH, FW = F.shape[0], F.shape[1]
for y in range(FH):
    for x in range(FW):
        if F[y, x, 3] == 0 and y: F[y, x] = F[y - 1, x]
F[:, :, :3] = np.stack([F[:, :, 0] * 0.42 + 6, F[:, :, 1] * 0.44 + 8, F[:, :, 2] * 0.6 + 20], axis=2)
from scipy import ndimage as nd
EXT = 300; nr = np.random.default_rng(5); G = np.zeros((EXT, FW, 4)); G[:, :, 3] = 255
last = nd.gaussian_filter1d(F[FH - 6:, :, :3].mean(axis=0), 30, axis=0)
for y in range(EXT):                                         # packed earth / flagstones
    G[y, :, :3] = last * (1 - y * 0.0012) + nr.normal(0, 3, (FW, 1))
    if y % 26 < 2: G[y, :, :3] *= 0.86
for x0 in range(0, FW, 52):
    for y in range(EXT): xx = x0 + (13 if (y // 26) % 2 else 0); G[y, xx % FW, :3] *= 0.86
F = np.concatenate([F, G], axis=0)
SKY = crop(8, 256, 904, 432)
P = {"street": {"file": save("street", ST), "w": ST.shape[1], "h": ST.shape[0], "signs": rects, "vanish": [330 - X0, 160 - Y0]},
     "floor": {"file": save("floor", F), "w": FW, "h": F.shape[0]},
     "sky": {"file": save("sky", SKY), "w": SKY.shape[1], "h": SKY.shape[0]}}
Lo = {"source": "Street Fighter (1987 arcade) — Gen's Stage sheet (ripped by TonyWanKenobian); signs repainted, re-lit for night as Asakusa", "pieces": P,
      "colors": {"skyTop": "#0a0c24", "under": "#2a2a3a"}}
pv = Image.new("RGBA", (ST.shape[1], ST.shape[0] + 30), (14, 16, 44, 255))
pv.alpha_composite(Image.open(os.path.join(out, "street.png"))); pv.alpha_composite(Image.open(os.path.join(out, "floor.png")).crop((0, 0, FW, 30)), (0, ST.shape[0]))
pv.convert("RGB").save(os.path.join(out, "preview.png")); Lo["preview"] = "preview.png"
json.dump(Lo, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, ST.shape, F.shape)
