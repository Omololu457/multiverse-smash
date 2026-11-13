#!/usr/bin/env python3
"""Roronoa Zoro alt-colour skins — region-keyed recolor (art-safe: tints only, no repaint, layouts untouched).

Zoro's GBA palette (counted over every assets/zoro sheet):
  CLOTH  trousers + bandana + boots   (0,64,112) (0,112,240)            hue 198-218, sat >= 0.85
  SHIRT  white shirt + lavender shading (248,248,248) (184,184,216) (112,112,152) — the blades share these
         colours but float against transparency (the shirt is boxed in by outline / body): a 5x5 transparency test
  GREEN  hair AND haramaki sash       (32,112,16) (112,200,80)           hue 95-120, sat >= 0.5
         split per frame: a green blob whose centre sits in the top 30% of the figure (cloth/green/skin bbox of
         its 320-px cell) is HAIR, the rest is the SASH.
  TRAIL  the yellow sword-slash arcs  (216,224,64) (168,136,0)           hue 44-68, sat >= 0.7, val >= 0.55
  SKIN   (248,184,136) …                                                 only the void (Alien X) / Albedo ops touch it
Outlines (black), blades (lavender-gray), scabbards and fx_*.png (Taka Nami / tornado) keep their colours.

Every output is `<sheet>__<tag>.png` next to its source → skins.js retags paths (recolorSkinAnim) and
zoroData.zoroSkinSet keeps the tag through the Santoryu stance swap. Alien X void-crushes the body (the game's
generic starfield overlay keys off a skin id ending in "AlienX"). Perona bakes GLITTER into the clothes: a fixed
integer hash of each pixel's sheet position picks ~7% as sparkles (no RNG).

Usage: python3 tools/zoro_skins/gen_zoro_skins.py [tag ...]   (run from the repo root)
"""
import sys, glob, os
import numpy as np
import scipy.ndimage as nd
from PIL import Image

CELL = 320


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
    cloth = op & (H >= 198) & (H <= 218) & (s >= 0.85)
    green = op & (H >= 95) & (H <= 120) & (s >= 0.5)
    skin = op & (H >= 18) & (H <= 32) & (s >= 0.3) & (s < 0.6) & (v >= 0.85)
    wl = op & (((s < 0.08) & (v >= 0.88)) | ((H >= 225) & (H <= 250) & (s >= 0.1) & (s <= 0.3) & (v >= 0.55)))
    # SHIRT = white + its lavender-gray shading. The blades and the Oni Giri streaks use the same colours, but they
    # float against transparency, while the shirt is boxed in by black outline / skin / sash / trousers. So a pixel
    # is shirt when its 5x5 neighbourhood holds <= 3 transparent pixels; a 2x2 opening (geodesic regrow) then
    # drops the stray 1-px blade pixels that pass over the body.
    trans5 = nd.uniform_filter((al <= 40).astype(float), size=5) * 25
    cand = wl & (trans5 <= 3.5)
    shirt = nd.binary_dilation(nd.binary_opening(cand, np.ones((2, 2))), np.ones((3, 3)), iterations=1, mask=cand)
    # The Heavy crescent is a thick white swoosh rimmed in yellow TRAIL pixels (not transparency): drop any white
    # blob whose rim is >= 15% trail. The shirt never borders the trail colours.
    trail = op & (H >= 44) & (H <= 68) & (s >= 0.7) & (v >= 0.55)
    lab_s, ns = nd.label(shirt, structure=np.ones((3, 3)))
    for i in range(1, ns + 1):
        comp = lab_s == i; ys, xs = np.nonzero(comp)
        y0, y1, x0, x1 = max(ys.min() - 1, 0), ys.max() + 2, max(xs.min() - 1, 0), xs.max() + 2
        c = comp[y0:y1, x0:x1]; ring = nd.binary_dilation(c, np.ones((3, 3))) & ~c
        if ring.sum() and trail[y0:y1, x0:x1][ring].mean() >= 0.15: shirt[y0:y1, x0:x1] &= ~c
    hair = np.zeros_like(green)
    body = cloth | green | skin
    lab, n = nd.label(green, structure=np.ones((3, 3)))
    if n:
        cy = nd.center_of_mass(green, lab, range(1, n + 1))
        for i, (yc, xc) in enumerate(cy, start=1):
            x0 = int(xc // CELL) * CELL
            ys = np.nonzero(body[:, x0:x0 + CELL].any(1))[0]
            if ys.size == 0: continue
            top, bot = ys.min(), ys.max()
            if yc < top + 0.30 * max(bot - top, 1): hair |= lab == i
    return {
        "cloth": cloth, "shirt": shirt, "hair": hair, "sash": green & ~hair,
        "trail": op & (H >= 44) & (H <= 68) & (s >= 0.7) & (v >= 0.55), "skin": skin,
    }


# per-region op: hue (target °) · sat (set) · smul (sat ×) · vmul (val ×) · vadd
SKINS = {
    # New World (post-timeskip): dark-green robe, red sash, black bandana / trousers.
    "newworld": {"shirt": dict(hue=128, sat=0.45, vmul=0.42), "sash": dict(hue=356, sat=0.82, vmul=0.95),
                 "cloth": dict(hue=220, sat=0.25, vmul=0.42, vadd=0.03)},
    # King of Hell (Enma): black clothes, purple haki sash + purple slash trails.
    "enma":     {"shirt": dict(hue=270, sat=0.18, vmul=0.3, vadd=0.05), "cloth": dict(hue=275, sat=0.45, vmul=0.42),
                 "sash": dict(hue=280, sat=0.7, vmul=1.0), "trail": dict(hue=284, sat=0.65, vmul=1.05)},
    # Kyutoryu ASHURA: ash-gray, crimson bandana / trousers, red slash trails.
    "ashura":   {"shirt": dict(hue=0, sat=0.0, vmul=0.62), "cloth": dict(hue=352, sat=0.8, vmul=0.72),
                 "trail": dict(hue=2, sat=0.85, vmul=1.0)},
    # Shimotsuki dojo (Kuina tribute): white gi, deep indigo hakama, dark-indigo hair, white sash.
    "kuina":    {"cloth": dict(hue=238, sat=0.6, vmul=0.55), "hair": dict(hue=232, sat=0.55, vmul=0.42),
                 "sash": dict(hue=0, sat=0.0, vmul=1.15, vadd=0.1)},
    # Perona's Makeover (Kuraigana's two years): pink with baked glitter, black-pink trousers, pink trails.
    "perona":   {"shirt": dict(hue=328, sat=0.32, vmul=1.0), "cloth": dict(hue=318, sat=0.55, vmul=0.55),
                 "sash": dict(hue=330, sat=0.7, vmul=1.1), "trail": dict(hue=325, sat=0.55, vmul=1.05), "glitter": True},
    # Shared crossover trio.
    "ben10":    {"shirt": dict(hue=0, sat=0.0, vmul=0.18, vadd=0.05), "cloth": dict(hue=118, sat=0.7, vmul=0.9),    # black tee,
                 "hair": dict(hue=25, sat=0.6, vmul=0.62)},                                                         #   green jacket, brown hair
    "albedo":   {"cloth": dict(hue=0, sat=0.05, vmul=1.9), "hair": dict(hue=0, sat=0.04, vmul=1.18),              # pale body + white hair,
                 "sash": dict(hue=0, sat=0.85, vmul=1.0), "trail": dict(hue=2, sat=0.85, vmul=1.0)},               #   red accents
    "alienx":   {"crush": True},                                                                                   # void body + starfield
}


def glitter_mask(shape):
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
        sel = (al > 40) & ~R["trail"]
        rgb = np.where(sel[..., None], hsv_to_rgb(h, np.clip(s * 0.25, 0, 1), np.clip(v * 0.18 + 0.02, 0, 1)), rgb)
        rgb = np.where(R["trail"][..., None], hsv_to_rgb(np.full_like(h, 0.58), np.full_like(s, 0.12), np.clip(v * 1.1, 0, 1)), rgb)
    else:
        out = rgb.copy()
        for name, op in rec.items():
            if name == "glitter": continue
            sel = R[name]
            nh = np.full_like(h, op["hue"] / 360) if "hue" in op else h
            ns = np.full_like(s, op["sat"]) if "sat" in op else np.clip(s * op.get("smul", 1.0), 0, 1)
            nv = np.clip(v * op.get("vmul", 1.0) + op.get("vadd", 0.0), 0, 1)
            out = np.where(sel[..., None], hsv_to_rgb(nh, ns, nv), out)
        if rec.get("glitter"):
            g, w = glitter_mask(h.shape); cl = R["cloth"] | R["shirt"]
            out = np.where((cl & g & ~w)[..., None], np.array([1.0, 0.80, 0.93]), out)
            out = np.where((cl & w)[..., None], np.array([1.0, 1.0, 1.0]), out)
        rgb = out
    arr[..., :3] = np.clip(np.round(rgb * 255), 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def sheets():
    files = sorted(glob.glob("assets/zoro/*.png"))
    return [f for f in files if "__" not in os.path.basename(f) and not os.path.basename(f).startswith("fx_")]


if __name__ == "__main__":
    tags = sys.argv[1:] or list(SKINS)
    src = sheets(); n = 0
    for tag in tags:
        for sh in src:
            recolor(Image.open(sh), SKINS[tag]).save(sh[:-4] + f"__{tag}.png", optimize=True); n += 1
        print(f"  {tag}: {len(src)} sheets")
    print(f"done — {n} files ({len(tags)} skins × {len(src)} sheets)")
