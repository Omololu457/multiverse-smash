#!/usr/bin/env python3
"""Hinata skin recolors (Phase 3): recolor the DARK default sheets into the other three Color-Palettes-row
variants — Purple / Gray / Blue — via the exact swatch LUT + the same nearest-palette classifier used for
normalization (run in reverse): only JACKET/PANTS pixels are remapped; skin / hair / sandals / outline
(identical across all four palettes) are preserved. Writes hinata_<action>_uniform__<tag>.png for every
animationData char sheet (recolorSkinAnim in skins.js maps X.png -> X__<tag>.png) + a recolored portrait.
Mirrors the sakura/gojo recolor-skin pipeline (skins.js recolorSkinAnim/recolorPortrait)."""
import numpy as np
from PIL import Image

KEYED = "tools/hinata/S_keyed.png"
Y0, Y1 = 35, 101
BOXES = {"purple": (17, 64), "dark": (74, 121), "gray": (131, 178), "blue": (188, 235)}
# the 20 unique char sheets referenced by hinata.animationData (body + special cast poses)
SHEETS = [
    "idle", "run", "dash", "jump", "hurt", "knockdown", "guard", "intro", "win",
    "light", "heavy", "up", "air", "down_air",
    "byakugan", "shugo", "hasangeki", "gf_rush", "hakkesho", "juuhou",
]


def _swatch(S, box):
    x0, x1 = box
    c = S[Y0:Y1, x0:x1 + 1]
    ys, xs = np.where(c[:, :, 3] > 0)
    return c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def build():
    S = np.asarray(Image.open(KEYED))
    sw = {k: _swatch(S, b) for k, b in BOXES.items()}
    h = min(v.shape[0] for v in sw.values()); w = min(v.shape[1] for v in sw.values())
    sw = {k: v[:h, :w] for k, v in sw.items()}
    dark = sw["dark"]; da = dark[:, :, 3] > 0
    # dark-jacket source colors P + their alt equivalents; preserve set Q = dark swatch non-jacket colors
    P = []; alt = {"purple": [], "gray": [], "blue": []}
    jacket_dark = set()
    for yy in range(h):
        for xx in range(w):
            if not da[yy, xx]:
                continue
            cd = tuple(int(v) for v in dark[yy, xx, :3])
            diff = any(tuple(int(v) for v in sw[t][yy, xx, :3]) != cd for t in alt)
            if diff and cd not in jacket_dark:
                jacket_dark.add(cd); P.append(cd)
                for t in alt:
                    alt[t].append(tuple(int(v) for v in sw[t][yy, xx, :3]))
    Q = set()
    for yy in range(h):
        for xx in range(w):
            if da[yy, xx]:
                cd = tuple(int(v) for v in dark[yy, xx, :3])
                if cd not in jacket_dark:
                    Q.add(cd)
    return np.array(P), {t: np.array(alt[t]) for t in alt}, np.array(list(Q))


def recolor(img, P, Alt, Q, tag):
    A = np.asarray(img).copy(); opq = A[:, :, 3] > 0
    px = A[:, :, :3].astype(int)[opq]
    if len(px) == 0:
        return img
    dP = ((px[:, None, :] - P[None, :, :]) ** 2).sum(2)
    dQ = ((px[:, None, :] - Q[None, :, :]) ** 2).sum(2)
    nearest = dP.argmin(1)
    hit = dP.min(1) < dQ.min(1)              # closer to a jacket colour than to any preserve colour
    tgt = Alt[tag][nearest]
    idx = np.where(opq)
    rr, cc = idx[0][hit], idx[1][hit]
    A[rr, cc, 0] = tgt[hit, 0]; A[rr, cc, 1] = tgt[hit, 1]; A[rr, cc, 2] = tgt[hit, 2]
    return Image.fromarray(A, "RGBA")


if __name__ == "__main__":
    P, Alt, Q = build()
    print(f"LUT: {len(P)} dark-jacket colors; preserve set {len(Q)}")
    n = 0
    for s in SHEETS:
        src = f"hinata_{s}_uniform.png"
        img = Image.open(src).convert("RGBA")
        for tag in ("purple", "gray", "blue"):
            recolor(img, P, Alt, Q, tag).save(f"hinata_{s}_uniform__{tag}.png"); n += 1
    # portraits
    port = Image.open("hinata_portrait.png").convert("RGBA")
    for tag in ("purple", "gray", "blue"):
        recolor(port, P, Alt, Q, tag).save(f"hinata_portrait__{tag}.png"); n += 1
    print(f"wrote {n} recolored files")
