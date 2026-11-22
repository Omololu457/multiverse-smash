# tools/stage_layers/gen_code_floors.py — floors (+ layout.json / preview) for the stages that have NO source sheet and are
# drawn in code by stageLayers.js: the Battle Royale Colosseum, Woodsboro, PK Academy, the Analysis Nexus.
#   python3 -I tools/stage_layers/gen_code_floors.py <repoRoot> [set ...]
# Each floor is 1024 wide: ~70 "deck" rows (the strip the fighters stand on) + 300 rows carried toward the camera.
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

root = sys.argv[1]; only = set(sys.argv[2:])
W, H = 1024, 370
def out(name, F, colors, note):
    d = os.path.join(root, "stages", name); os.makedirs(d, exist_ok=True)
    Image.fromarray(np.clip(F, 0, 255).astype(np.uint8)).save(os.path.join(d, "floor.png"))
    pv = np.zeros((200, W, 3)); top = np.array([int(colors["skyTop"][i:i + 2], 16) for i in (1, 3, 5)])
    pv[:] = top; pv = np.concatenate([pv, F[:80, :, :3]], axis=0)
    Image.fromarray(np.clip(pv, 0, 255).astype(np.uint8)).save(os.path.join(d, "preview.png"))
    json.dump({"source": note, "pieces": {"floor": {"file": "floor.png", "w": W, "h": H}}, "colors": colors, "preview": "preview.png"}, open(os.path.join(d, "layout.json"), "w"), indent=1)
    print("wrote", d)
def base(col, rng, grain=6, blot=0.12, sig=8):
    F = np.zeros((H, W, 4)); F[:, :, 3] = 255
    b = nd.gaussian_filter(rng.random((H, W)), sig); b = (b - b.mean()) / (b.std() + 1e-6)
    F[:, :, :3] = np.array(col, float) * (1 + blot * b[:, :, None]) + rng.normal(0, grain, (H, W, 1))
    for y in range(H): F[y, :, :3] *= max(0.72, 1 - max(0, y - 70) * 0.0009)
    return F
def colosseum():   # raked arena sand: ripples, footprints, scattered petals
    r = np.random.default_rng(1); F = base((198, 160, 112), r, 7, 0.1)
    for y in range(H): F[y, :, :3] *= 1 + 0.04 * np.sin(np.arange(W) / 9 + y * 0.3)[:, None]
    for k in range(300): y, x = r.integers(4, H - 4), r.integers(4, W - 8); F[y:y + 2, x:x + 4, :3] *= 0.85
    for k in range(160): y, x = r.integers(0, H - 3), r.integers(0, W - 3); F[y:y + 2, x:x + 3, :3] = (200, 50, 80)
    F[:4, :, :3] *= 0.7
    out("code_colosseum", F, {"skyTop": "#160b22", "under": "#3a2a1e"}, "Drawn in code / generated (no source sheet)")
def woodsboro():   # a suburban street at night: sidewalk, kerb, asphalt with a yellow centre line
    r = np.random.default_rng(2); F = base((58, 62, 72), r, 5, 0.12)
    F[:22, :, :3] = base((118, 120, 126), r, 4, 0.06)[:22, :, :3]
    for x in range(0, W, 64): F[:22, x:x + 2, :3] *= 0.7
    F[22:27, :, :3] = (150, 152, 158); F[27:29, :, :3] *= 0.5
    for x in range(0, W, 96): F[150:156, x:x + 54, :3] = (196, 170, 70)
    for k in range(40): y, x = r.integers(40, H - 10), r.integers(0, W - 60); F[y, x:x + r.integers(10, 60), :3] *= 0.75        # cracks
    out("code_woodsboro", F, {"skyTop": "#0a0e1c", "under": "#1a1c24"}, "Drawn in code / generated (no source sheet)")
def pk():   # a Japanese schoolyard: packed earth, a white track line, cherry petals
    r = np.random.default_rng(3); F = base((196, 166, 120), r, 4, 0.045, 14)
    F[90:96, :, :3] = (240, 236, 226)
    for k in range(260): y, x = r.integers(0, H - 3), r.integers(0, W - 4); F[y:y + 2, x:x + 3, :3] = (250, 190, 210)
    out("code_pk", F, {"skyTop": "#8ac8f0", "under": "#9a8060"}, "Drawn in code / generated (no source sheet)")
def nexus():   # a dark data floor: a glowing teal grid
    r = np.random.default_rng(4); F = base((8, 26, 32), r, 2, 0.15)
    for x in range(0, W, 48): F[:, x:x + 2, :3] = (30, 140, 130)
    for y in range(0, H, 20): F[y:y + 2, :, :3] = (30, 140, 130)
    F = F * 1.0; F[:, :, :3] = nd.gaussian_filter(F[:, :, :3], (0.6, 0.6, 0)) + F[:, :, :3] * 0.4
    out("code_nexus", F, {"skyTop": "#051a1f", "under": "#04141a"}, "Drawn in code / generated (no source sheet)")
def originals():   # The Originals: a plain dark base (each dimension paints its own floor over it in code); the preview
    r = np.random.default_rng(5); F = base((40, 36, 50), r, 3, 0.08)   # shows the three dimensions side by side
    out("code_originals", F, {"skyTop": "#1a1030", "under": "#16141c"}, "Drawn in code / generated (no source sheet)")
    pv = np.zeros((280, W, 3)); y = np.linspace(0, 1, 200)[:, None]
    for k, (a, b) in enumerate([((14, 12, 20), (60, 40, 90)), ((34, 36, 92), (255, 190, 110)), ((8, 22, 50), (190, 80, 30))]):
        x0, x1 = k * W // 3, (k + 1) * W // 3
        pv[:200, x0:x1] = (np.array(a) * (1 - y) + np.array(b) * y)[:, None, :]
    pv[200:, :W // 3] = (52, 48, 62); pv[200:, W // 3:2 * W // 3] = (200, 154, 104); pv[200:, 2 * W // 3:] = (180, 210, 230); pv[200:, 2 * W // 3 + W // 6:] = (50, 36, 32)
    for x in (W // 3, 2 * W // 3): pv[:, x - 2:x + 2] = 255
    Image.fromarray(pv.astype(np.uint8)).save(os.path.join(root, "stages", "code_originals", "preview.png"))
def chimera():   # Chimera Shadow Garden: Megumi's shadow, a glossy black liquid with ripple rings
    r = np.random.default_rng(6); F = base((12, 11, 24), r, 2, 0.25, 12)
    for y in range(0, H, 7): F[y, :, :3] += 10 * np.clip(np.sin(np.arange(W) / (14 + y * 0.05) + y), 0, 1)[:, None] * (1 - y / H)
    yy, xx = np.mgrid[0:H, 0:W]
    for k in range(9):
        cx, cy, rr = r.integers(40, W - 40), r.integers(30, H - 30), r.integers(20, 90)
        d = np.sqrt(((xx - cx) / 1.0) ** 2 + ((yy - cy) * 4.0) ** 2)
        for ring in (rr, rr * 0.6): F[:, :, :3] += (np.abs(d - ring) < 1.6)[:, :, None] * np.array((50, 46, 90)) * (1 - cy / H)
    F[:2, :, :3] = (40, 36, 80)
    out("code_chimera", F, {"skyTop": "#05050c", "under": "#06060c"}, "Drawn in code / generated (no source sheet)")
for n, f in [("code_chimera", chimera), ("code_originals", originals), ("code_colosseum", colosseum), ("code_woodsboro", woodsboro), ("code_pk", pk), ("code_nexus", nexus)]:
    if not only or n in only: f()
