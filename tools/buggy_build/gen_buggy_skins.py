#!/usr/bin/env python3
"""Buggy the Clown alt-colour skins — region-keyed recolor (art-safe: tints only, no repaint).

Regions (HSV on Buggy's palette, verified on idle.png):
  COAT  orange-red coat + hat      hue 8-35,  sat >= 0.75   (skin tone shares the hue but sat ~0.5 → untouched)
  HAIR  blue hair + sash           hue 195-232, sat >= 0.40
  RED   nose / boots / stripes     hue <8 or >345, sat >= 0.60
  GOLD  epaulettes / buttons       hue 38-55, sat >= 0.80
  WHITE pants / gloves / lining    sat < 0.12, val >= 0.50
Outlines (near-black) and skin are never touched. Every sheet keeps its exact layout (incl. the 7 masked rows),
so skins.js just retags sheet paths `<name>__<tag>.png` (recolorSkinAnim). Alien X void-crushes the whole body
(the game's generic starfield overlay keys off the skin id ending in "AlienX"). Big Top Glitter bakes
sparkles into the coat: a fixed integer hash of each pixel's position picks ~7% (no RNG).

Usage: python3 tools/buggy_build/gen_buggy_skins.py [tag ...]   (run from the repo root)
"""
import sys, glob, os
import numpy as np
import scipy.ndimage as nd
from PIL import Image


def rgb_to_hsv(a):
    mx = a.max(-1); mn = a.min(-1); df = mx - mn
    v = mx; s = np.where(mx > 0, df / (mx + 1e-9), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dd = np.where(df > 1e-9, df, 1)
    rc, gc, bc = (mx - r) / dd, (mx - g) / dd, (mx - b) / dd
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc))
    h = np.where(df > 1e-9, (h / 6.0) % 1.0, 0)
    return h, s, v


def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6).astype(int); f = h * 6 - i
    p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s); i = i % 6
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


COAT_MIN_BLOB = 9   # Buggy's face make-up (lips / cheek shading) shares the coat's exact orange but only as tiny
                    # 1-7 px blobs; the coat + hat are 60-100+ px regions. Drop small coat blobs → the face stays.


def _big_blobs(mask):
    if mask.size < 4000: return mask                     # tiny icons: no room for a face to separate
    lab, n = nd.label(mask, structure=np.ones((3, 3)))
    if n == 0: return mask
    sz = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool); keep[1:] = sz >= COAT_MIN_BLOB
    return keep[lab]


def regions(h, s, v, al):
    H = h * 360; op = al > 40
    return {
        "coat":  _big_blobs(op & (H >= 8) & (H <= 35) & (s >= 0.75)),
        "hair":  op & (H >= 195) & (H <= 232) & (s >= 0.40),
        "red":   op & ((H < 8) | (H > 345)) & (s >= 0.60),
        "gold":  op & (H >= 38) & (H <= 55) & (s >= 0.80),
        "white": op & (s < 0.12) & (v >= 0.50),
    }


# per-region op: hue (target °) · sat (set) · smul (sat ×) · vmul (val ×) · vadd
SKINS = {
    "crimson":    {"coat": dict(hue=352, smul=1.0, vmul=0.95)},                                              # Crimson Flag
    "crossguild": {"coat": dict(hue=278, smul=0.85, vmul=0.85)},                                              # Cross Guild royal purple
    "shanks":     {"coat": dict(hue=20, sat=0.18, vmul=0.32), "hair": dict(hue=356, smul=1.0, vmul=0.95)},  # Shanks tribute: black cloak, red hair
    "mihawk":     {"coat": dict(hue=230, sat=0.25, vmul=0.28), "hair": dict(hue=220, sat=0.2, vmul=0.35),   # Mihawk tribute: black coat + crimson,
                   "red": dict(hue=350, vmul=0.85), "white": dict(hue=350, sat=0.0, vmul=0.92)},             #   dark hair
    "crocodile":  {"coat": dict(hue=28, sat=0.45, vmul=0.42), "hair": dict(hue=220, sat=0.15, vmul=0.3),    # Crocodile tribute: dark fur-brown coat,
                   "white": dict(hue=40, sat=0.10, vmul=0.85)},                                              #   slicked black hair, cream lining
    "gold":       {"coat": dict(hue=44, sat=0.95, vmul=1.15), "hair": dict(hue=205, smul=1.0, vmul=1.1)},    # Emperor Gold
    "ben10":      {"coat": dict(hue=118, smul=0.9, vmul=1.05), "hair": dict(hue=25, sat=0.6, vmul=0.65)},    # Ben 10: green jacket, brown hair
    "albedo":     {"coat": dict(hue=0, sat=0.06, vmul=1.35), "hair": dict(hue=0, sat=0.04, vmul=1.25),       # Albedo: pale-gray body + hair,
                   "red": dict(hue=0, smul=1.0, vmul=1.1)},                                                  #   red accents kept vivid
    "alienx":     {"crush": True},                                                                            # Alien X: void body + starfield
    "bigtop":     {"coat": dict(hue=326, sat=0.72, vmul=1.12), "white": dict(hue=330, sat=0.14, vmul=1.0),    # Big Top Glitter: hot-pink
                   "gold": dict(hue=220, sat=0.08, vmul=1.15), "glitter": True},                               #   circus coat + baked glitter
}


def glitter_mask(shape):
    # Fixed integer hash of the sheet pixel (no RNG): ~7% sparkles, ~2% of them pure white.
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.uint64)
    hh = (xx * np.uint64(374761393) + yy * np.uint64(668265263)) & np.uint64(0xFFFFFFFF)
    hh = ((hh ^ (hh >> np.uint64(13))) * np.uint64(1274126177)) & np.uint64(0xFFFFFFFF)
    hh = (hh ^ (hh >> np.uint64(16))) & np.uint64(0xFFFF)
    return hh < np.uint64(int(0.07 * 65536)), hh < np.uint64(int(0.02 * 65536))


def recolor(img, rec):
    arr = np.array(img.convert("RGBA")).astype(float); rgb = arr[..., :3] / 255; al = arr[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    if rec.get("crush"):
        sel = al > 40
        out = hsv_to_rgb(h, np.clip(s * 0.25, 0, 1), np.clip(v * 0.18 + 0.02, 0, 1))
        rgb = np.where(sel[..., None], out, rgb)
    else:
        R = regions(h, s, v, al)
        out_rgb = rgb.copy()
        for name, op in rec.items():
            if name == "glitter": continue
            sel = R[name]
            nh = np.full_like(h, op["hue"] / 360) if "hue" in op else h
            ns = np.full_like(s, op["sat"]) if "sat" in op else np.clip(s * op.get("smul", 1.0), 0, 1)
            nv = np.clip(v * op.get("vmul", 1.0) + op.get("vadd", 0.0), 0, 1)
            out_rgb = np.where(sel[..., None], hsv_to_rgb(nh, ns, nv), out_rgb)
        if rec.get("glitter"):   # sparkles on the coat + hat (the pose changes frame to frame, so they glint)
            g, w = glitter_mask(h.shape); coat = R["coat"]
            out_rgb = np.where((coat & g & ~w)[..., None], np.array([1.0, 0.80, 0.93]), out_rgb)
            out_rgb = np.where((coat & w)[..., None], np.array([1.0, 1.0, 1.0]), out_rgb)
        rgb = out_rgb
    arr[..., :3] = np.clip(np.round(rgb * 255), 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def sheets():
    files = sorted(glob.glob("assets/buggy/*.png")) + sorted(glob.glob("assets/buggy/parts/*.png"))
    return [f for f in files if "__" not in os.path.basename(f)]


if __name__ == "__main__":
    tags = sys.argv[1:] or list(SKINS)
    src = sheets(); n = 0
    for tag in tags:
        for sh in src:
            recolor(Image.open(sh), SKINS[tag]).save(sh[:-4] + f"__{tag}.png"); n += 1
        print(f"  {tag}: {len(src)} sheets")
    print(f"done — {n} files ({len(tags)} skins × {len(src)} sheets)")
