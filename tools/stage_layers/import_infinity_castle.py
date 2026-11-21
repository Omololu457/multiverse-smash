# tools/stage_layers/import_infinity_castle.py — the "Infinity Castle stage (over Pokémon Stadium 3)" SSF2 mod → stages/infinity_castle/.
#   python3 -I tools/stage_layers/import_infinity_castle.py <DAT77.ssf> <repoRoot>
# The .ssf is a zlib-compressed Flash file; its embedded bitmaps (DefineBitsLossless2) are read straight out of it.
# Used: the castle backdrop (id 195), the main wooden platform (id 183 → a tileable deck for the floor, its front wall
# for the face below it, its two lanterns as props), one small floating platform (id 189's side piece) and the glow
# (id 171). The pack's little character sprite (ids 184-187) and the Pokémon Stadium leftovers are not used.
import sys, os, json, zlib, struct
import numpy as np
from PIL import Image

src, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, "stages", "infinity_castle"); os.makedirs(out, exist_ok=True)
d = open(src, "rb").read(); assert d[:3] == b"CWS"
body = zlib.decompress(d[8:])
p = (5 + (body[0] >> 3) * 4 + 7) // 8 + 4; BM = {}
while p < len(body):
    h = struct.unpack("<H", body[p:p + 2])[0]; code, ln = h >> 6, h & 0x3F; p += 2
    if ln == 0x3F: ln = struct.unpack("<I", body[p:p + 4])[0]; p += 4
    if code == 36:
        cid, fmt, w, hh = struct.unpack("<HBHH", body[p:p + 7])
        if fmt == 5:
            a = np.frombuffer(zlib.decompress(body[p + 7:p + ln])[:w * hh * 4], np.uint8).reshape(hh, w, 4).astype(float)
            A = a[..., :1]; rgb = np.where(A > 0, np.clip(a[..., 1:] * 255 / np.maximum(A, 1), 0, 255), 0)
            BM[cid] = np.concatenate([rgb, A], -1)
    if code == 0: break
    p += ln
def save(n, t): Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(os.path.join(out, n + ".png")); return n + ".png"
P = {}
bg = BM[195]; P["castle"] = {"file": save("castle", bg), "w": bg.shape[1], "h": bg.shape[0]}
plat = BM[183]
deck = plat[62:129, 196:305].copy()                              # plank rows only, away from the trapezoid's corner lines
DH, DW = deck.shape[:2]
yy = np.arange(DH)[:, None] + np.zeros((1, DW)); xx = np.zeros((DH, 1)) + np.arange(DW)[None, :]
grain = 0.92 + 0.08 * np.sin(xx * 0.9 + np.sin(yy * 0.35) * 2.2) * np.sin(yy * 2.1)      # wood grain over the flat fill
shade = (0.42 + 0.3 * (yy / (DH - 1)))                                                   # dim far, lamplit near
deck[..., :3] = deck[..., :3] * (grain * shade)[..., None] * np.array([1.0, 0.86, 0.72])
P["deck"] = {"file": save("deck", deck), "w": deck.shape[1], "h": deck.shape[0]}
face = plat[129:323, 32:467].copy(); face[..., 3] = 255          # the deck's lip + the wooden front wall with panels
fy = np.arange(face.shape[0])[:, None]
face[..., :3] = face[..., :3] * (0.5 - 0.25 * fy / face.shape[0])[..., None] * np.array([1.0, 0.85, 0.7])
P["face"] = {"file": save("face", face), "w": face.shape[1], "h": face.shape[0]}
op = plat[..., 3] > 0                                            # the lanterns: the two posts sticking up above the deck
cols = [x for x in range(plat.shape[1]) if op[:28, x].any()]
lx0, lx1 = min(cols), max(c for c in cols if c < plat.shape[1] // 2)
lan = plat[0:47, lx0:lx1 + 1].copy(); P["lantern"] = {"file": save("lantern", lan), "w": lan.shape[1], "h": lan.shape[0]}
side = BM[189]; so = side[..., 3] > 0                            # a small floating platform (the left one of id 189)
from scipy import ndimage
lab, n = ndimage.label(so)
boxes = [(sl, (lab[sl] == i + 1).sum()) for i, sl in enumerate(ndimage.find_objects(lab))]
sl = min((b for b in boxes if b[0][1].stop < side.shape[1] // 3 and b[1] > 300), key=lambda b: b[1])[0]   # left small platform
fp = side[sl].copy()
P["float"] = {"file": save("float", fp), "w": fp.shape[1], "h": fp.shape[0]}
L = {"source": "Infinity Castle stage (over Pokémon Stadium 3) SSF2 mod — embedded bitmaps", "pieces": P,
     "colors": {"skyTop": "#0a0604", "under": "#120a06", "seaBottom": "#050302"}}
pv = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).convert("RGBA").resize((1000, 500))
pv.alpha_composite(Image.fromarray(np.clip(np.tile(deck, (1, 6, 1)), 0, 255).astype(np.uint8)).resize((1000, 60)), (0, 360))
pv.convert("RGB").save(os.path.join(out, "preview.png")); L["preview"] = "preview.png"
json.dump(L, open(os.path.join(out, "layout.json"), "w"), indent=1)
print("wrote", out, {k: (v["w"], v["h"]) for k, v in P.items()})
