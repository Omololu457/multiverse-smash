#!/usr/bin/env python3
"""Sanji alt-colour skins — region-keyed recolor (art-safe: tints only, no repaint, layouts untouched).

Sanji's GBA palette (counted over every assets/sanji sheet):
  SUIT   blue  (40,80,144) (80,112,200) (32,56,88) (80,128,216)        hue 205-230, sat >= 0.5
         (the base kick arcs are drawn in these same blues, so the arcs follow the suit — as in the source art)
  HAIR   yellow (248,232,40) (184,168,0) (96,96,0) (200,176,0)        hue 50-62, sat >= 0.8, NOT a button
  GOLD   the jacket buttons: the same yellows, but 1-4 px blobs sitting ON the suit (>= half their ring is suit blue)
  FLAME  Diable Jambe arc tint, *_dj sheets only: (255,200,80) (240,120,24)   hue 25-45, sat >= 0.68, val >= 0.92
  SKIN   (248,200,168) (224,152,112) (168,88,40)                      only the void (Alien X) / Albedo ops touch it
  WHITE  shirt cuffs / cigarette / smoke (240,248,248) (184,192,200)  sat < 0.12, val >= 0.7
Outlines (black) are never touched. fx_*.png (plates, the glass) keep their colours.

Every output is `<sheet>__<tag>.png` next to its source, so skins.js retags paths (recolorSkinAnim) and
sanjiData.sanjiSkinSet keeps the tag through the Diable Jambe / win-variant set swaps. Alien X void-crushes the
body (the game's generic starfield overlay keys off a skin id ending in "AlienX"). Kamabakka bakes GLITTER into
the suit: a fixed integer hash of each pixel's sheet position picks ~7% of suit pixels as sparkles, so the
glints move as the pose changes frame to frame (and sanjiFx adds a render-only twinkle on top).

Usage: python3 tools/sanji_build/gen_sanji_skins.py [tag ...]   (run from the repo root)
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


def regions(h, s, v, al):
    H = h * 360; op = al > 40
    suit = op & (H >= 205) & (H <= 230) & (s >= 0.5)
    yellow = op & (H >= 50) & (H <= 62) & (s >= 0.8)
    # Buttons vs hair: same yellows. A button is a tiny blob whose surrounding ring is mostly suit blue.
    lab, n = nd.label(yellow, structure=np.ones((3, 3)))
    gold = np.zeros_like(yellow)
    if n:
        sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
        for i in np.nonzero(sizes <= 4)[0] + 1:
            blob = lab == i
            ys, xs = np.nonzero(blob)
            y0, y1, x0, x1 = max(ys.min() - 1, 0), ys.max() + 2, max(xs.min() - 1, 0), xs.max() + 2
            b = blob[y0:y1, x0:x1]; ring = nd.binary_dilation(b, np.ones((3, 3))) & ~b
            if ring.sum() and suit[y0:y1, x0:x1][ring].mean() >= 0.5: gold[y0:y1, x0:x1] |= b
    return {
        "suit": suit,
        "hair": yellow & ~gold,
        "gold": gold,
        "flame": op & (H >= 25) & (H <= 45) & (s >= 0.68) & (v >= 0.92),
        "skin": op & (H >= 15) & (H <= 30) & (s >= 0.25) & (s < 0.8) & (v >= 0.6),
        "white": op & (s < 0.12) & (v >= 0.7),
    }


# per-region op: hue (target °) · sat (set) · smul (sat ×) · vmul (val ×) · vadd
SKINS = {
    # Germa 66 Raid Suit "Stealth Black": a black suit, the gold buttons kept.
    "stealth":   {"suit": dict(hue=228, sat=0.22, vmul=0.36, vadd=0.04), "gold": dict(hue=46, sat=0.95, vmul=1.0)},
    # Ifrit Jambe (Wano / Egghead): deep navy suit, the leg fire burns BLUE.
    "ifrit":     {"suit": dict(hue=226, sat=0.55, vmul=0.48), "flame": dict(hue=198, sat=0.72, vmul=1.0)},
    # Whole Cake Island wedding: the white tux.
    "wedding":   {"suit": dict(hue=220, sat=0.07, vmul=1.24, vadd=0.04), "gold": dict(hue=44, sat=0.9, vmul=1.0)},
    # Sangoro, his Wano soba-cook disguise: a lavender kimono.
    "sangoro":   {"suit": dict(hue=272, sat=0.36, vmul=1.08)},
    # Kamabakka Kingdom: hot-pink with baked glitter, pink flames.
    "kamabakka": {"suit": dict(hue=326, sat=0.66, vmul=1.18), "flame": dict(hue=322, sat=0.6, vmul=1.0), "glitter": True},
    # Vinsmoke Ichiji tribute (Sparking Red): red raid suit + red hair.
    "ichiji":    {"suit": dict(hue=356, sat=0.78, vmul=0.92), "hair": dict(hue=4, sat=0.82, vmul=0.95)},
    # Vinsmoke Reiju tribute (Poison Pink): magenta suit, pink hair, purple poison flames.
    "reiju":     {"suit": dict(hue=302, sat=0.6, vmul=0.72), "hair": dict(hue=336, sat=0.62, vmul=1.0),
                  "flame": dict(hue=286, sat=0.62, vmul=1.0)},
    # Shared crossover trio.
    "ben10":     {"suit": dict(hue=118, smul=0.9, vmul=1.0), "hair": dict(hue=25, sat=0.6, vmul=0.62)},     # green jacket, brown hair
    "albedo":    {"suit": dict(hue=0, sat=0.05, vmul=1.3), "hair": dict(hue=0, sat=0.04, vmul=1.18),         # pale-gray body + hair,
                  "gold": dict(hue=0, sat=0.95, vmul=0.9), "flame": dict(hue=2, sat=0.8, vmul=1.0)},          #   red accents + red fire
    "alienx":    {"crush": True},                                                                             # void body + starfield
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
    R = regions(h, s, v, al)
    if rec.get("crush"):
        sel = (al > 40) & ~R["flame"]
        out = hsv_to_rgb(h, np.clip(s * 0.25, 0, 1), np.clip(v * 0.18 + 0.02, 0, 1))
        rgb = np.where(sel[..., None], out, rgb)
        fl = R["flame"]   # Alien X: the leg fire goes starlight-white
        rgb = np.where(fl[..., None], hsv_to_rgb(np.full_like(h, 0.58), np.full_like(s, 0.12), np.clip(v * 1.05, 0, 1)), rgb)
    else:
        out_rgb = rgb.copy()
        for name, op in rec.items():
            if name == "glitter": continue
            sel = R[name]
            nh = np.full_like(h, op["hue"] / 360) if "hue" in op else h
            ns = np.full_like(s, op["sat"]) if "sat" in op else np.clip(s * op.get("smul", 1.0), 0, 1)
            nv = np.clip(v * op.get("vmul", 1.0) + op.get("vadd", 0.0), 0, 1)
            out_rgb = np.where(sel[..., None], hsv_to_rgb(nh, ns, nv), out_rgb)
        if rec.get("glitter"):
            g, w = glitter_mask(h.shape); suit = R["suit"]
            out_rgb = np.where((suit & g & ~w)[..., None], np.array([1.0, 0.80, 0.93]), out_rgb)
            out_rgb = np.where((suit & w)[..., None], np.array([1.0, 1.0, 1.0]), out_rgb)
        rgb = out_rgb
    arr[..., :3] = np.clip(np.round(rgb * 255), 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def sheets():
    files = sorted(glob.glob("assets/sanji/*.png"))
    return [f for f in files if "__" not in os.path.basename(f) and not os.path.basename(f).startswith("fx_")]


if __name__ == "__main__":
    tags = sys.argv[1:] or list(SKINS)
    src = sheets(); n = 0
    for tag in tags:
        for sh in src:
            recolor(Image.open(sh), SKINS[tag]).save(sh[:-4] + f"__{tag}.png", optimize=True); n += 1
        print(f"  {tag}: {len(src)} sheets")
    print(f"done — {n} files ({len(tags)} skins × {len(src)} sheets)")
