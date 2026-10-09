#!/usr/bin/env python3
"""Palette normalization for the Hinata sheet.
The sheet mixes palettes: most frames use the DARK jacket palette, but a known set of frames
(Guard #1, Knocked Down #1-2, Winning Pose #1, Special 4 rush, Juuhou Soshiken #1-2, Unused Atk 2,
etc.) are in the PURPLE palette. The "Color Palettes" row (y35-101) holds the SAME stance in 4
recolors (Purple / Dark / Gray / Blue) that are pixel-identical (verified: identical alpha masks).
We build an EXACT color LUT {purple|gray|blue color -> dark color} from those swatches and remap
every pixel of the whole sheet, so every frame renders in the one dark default palette with no
flicker. Dark-palette pixels aren't in the LUT keys, so they pass through untouched.
Output: tools/hinata/S_norm.png (normalized, still the full sheet; slicing reads this)."""
import numpy as np
from PIL import Image

KEYED = "tools/hinata/S_keyed.png"
OUT = "tools/hinata/S_norm.png"
Y0, Y1 = 35, 101
BOXES = {"purple": (17, 64), "dark": (74, 121), "gray": (131, 178), "blue": (188, 235)}


def _swatch(S, box):
    x0, x1 = box
    c = S[Y0:Y1, x0:x1 + 1]
    ys, xs = np.where(c[:, :, 3] > 0)
    return c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def build_lut(S):
    sw = {k: _swatch(S, b) for k, b in BOXES.items()}
    h = min(v.shape[0] for v in sw.values()); w = min(v.shape[1] for v in sw.values())
    sw = {k: v[:h, :w] for k, v in sw.items()}
    dark = sw["dark"]; da = dark[:, :, 3] > 0
    lut = {}
    for alt in ("purple", "gray", "blue"):
        s = sw[alt]; both = da & (s[:, :, 3] > 0)
        votes = {}
        for yy in range(h):
            for xx in range(w):
                if not both[yy, xx]:
                    continue
                cs = tuple(int(v) for v in s[yy, xx, :3])
                cd = tuple(int(v) for v in dark[yy, xx, :3])
                if cs == cd:
                    continue
                votes.setdefault(cs, {})[cd] = votes.setdefault(cs, {}).get(cd, 0) + 1
        for cs, t in votes.items():
            lut[cs] = max(t.items(), key=lambda kv: kv[1])[0]
    return lut


def purple_sources(S):
    """The purple-palette jacket/pants colors (exact, from the swatch diff)."""
    sw = {k: _swatch(S, b) for k, b in BOXES.items()}
    h = min(v.shape[0] for v in sw.values()); w = min(v.shape[1] for v in sw.values())
    sw = {k: v[:h, :w] for k, v in sw.items()}
    dark = sw["dark"]; da = dark[:, :, 3] > 0; s = sw["purple"]
    out = {}
    for yy in range(h):
        for xx in range(w):
            if not (da[yy, xx] and s[yy, xx, 3] > 0):
                continue
            cs = tuple(int(v) for v in s[yy, xx, :3]); cd = tuple(int(v) for v in dark[yy, xx, :3])
            if cs != cd:
                out[cs] = cd
    return out


def normalize(S, lut):
    rgb = S[:, :, :3].astype(int); out = S.copy(); al = S[:, :, 3] > 0
    changed = 0
    # Pass 1: exact LUT remap (purple/gray/blue -> dark).
    for cs, cd in lut.items():
        m = (rgb[:, :, 0] == cs[0]) & (rgb[:, :, 1] == cs[1]) & (rgb[:, :, 2] == cs[2]) & al
        n = int(m.sum())
        if n:
            out[m, 0], out[m, 1], out[m, 2] = cd
            changed += n
    # Pass 2: classify the purple anti-alias EDGE shades the exact swatch missed, WITHOUT touching
    # Hinata's naturally purple-tinted hair. Nearest-palette classifier: P = exact purple sources,
    # Q = "preserve" colors harvested from the dark STANCE frame (hair / skin / jacket / sleeve /
    # sandal / outline). A pixel is remapped ONLY if it is strictly closer to a purple source than to
    # any preserve color (and reasonably close to that source). Purple sources map to their dark twin.
    psrc = purple_sources(S)
    P = np.array(list(psrc.keys())); Pdark = np.array(list(psrc.values()))
    stance = S[233:315]; sa = stance[:, :, 3] > 0
    Q = np.unique(stance[sa][:, :3].reshape(-1, 3), axis=0).astype(int)  # dark-frame palette
    opq = out[:, :, 3] > 0
    px = out[:, :, :3].astype(int)[opq]                                  # (N,3) current (post pass-1)
    dP = ((px[:, None, :] - P[None, :, :]) ** 2).sum(2)                  # (N,|P|)
    dQ = ((px[:, None, :] - Q[None, :, :]) ** 2).sum(2)                  # (N,|Q|)
    nearest_p = dP.argmin(1); minP = dP.min(1); minQ = dQ.min(1)
    # minP < minQ is self-protecting: Q holds the EXACT dark-frame colors, so any real dark-palette
    # pixel has minQ==0 and can never be remapped. Only purple-frame-unique (jacket/pants) colors win.
    hit = (minP < minQ) & (minP <= 20000)                               # closer to purple than preserve
    idx = np.where(opq)
    sel = np.where(hit)[0]
    tgt = Pdark[nearest_p[sel]]
    rr = idx[0][sel]; cc = idx[1][sel]
    before = out[rr, cc, :3].copy()
    out[rr, cc, 0] = tgt[:, 0]; out[rr, cc, 1] = tgt[:, 1]; out[rr, cc, 2] = tgt[:, 2]
    changed += int((before != out[rr, cc, :3]).any(1).sum())
    return out, changed


if __name__ == "__main__":
    S = np.asarray(Image.open(KEYED)).copy()
    lut = build_lut(S)
    print(f"LUT: {len(lut)} alt-palette colors -> dark")
    out, changed = normalize(S, lut)
    Image.fromarray(out, "RGBA").save(OUT)
    print(f"normalized {changed} px -> {OUT}")
