#!/usr/bin/env python3
"""Monkey D. Luffy alt-colour skins — region-keyed recolor (art-safe: tints only, no repaint, layouts untouched).

Luffy's GBA palette (counted over every assets/sprites/luffy sheet):
  VEST     red  (248,64,48) (152,0,0) (184,56,24)            hue < 12 or > 345, sat >= 0.75   (minus the hatband)
  HATBAND  the same reds, but a blob whose rim is >= 25% straw-hat yellow
  HAT      straw (248,232,8) (200,152,0)                      hue 42-60, sat >= 0.9            (minus the buttons)
  BUTTONS  the same yellows, 1-4 px blobs ringed (>= half) by vest red
  SHORTS   blue (32,96,136) (80,152,200)                      hue 195-215, sat >= 0.5
  SKIN     (248,200,144) (216,136,40) (160,72,0)              only Gear Second / Albedo / Alien X touch it
His hair shares the outline black, so no skin recolours hair. fx_ring.png and source.png (the raw rip) are skipped.

Every output is `<sheet>__<tag>.png` next to its source → skins.js retags paths (recolorSkinAnim). Alien X
void-crushes the body (the game's generic starfield overlay keys off a skin id ending in "AlienX"). Amazon Lily bakes
GLITTER into the vest: a fixed integer hash of each pixel's sheet position picks ~7% as sparkles (no RNG).

Usage: python3 tools/luffy_skins/gen_luffy_skins.py [tag ...]   (run from the repo root)
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


def _ring_frac(mask, other, max_size=None):
    """Per connected blob of `mask`: the fraction of its 1-px rim lying in `other`. Returns (labels, n, fracs, sizes)."""
    lab, n = nd.label(mask, structure=np.ones((3, 3)))
    fr, sz = np.zeros(n + 1), np.zeros(n + 1)
    for i, sl in enumerate(nd.find_objects(lab), start=1):
        if sl is None: continue
        y0, y1 = max(sl[0].start - 1, 0), sl[0].stop + 1; x0, x1 = max(sl[1].start - 1, 0), sl[1].stop + 1
        b = lab[y0:y1, x0:x1] == i; sz[i] = b.sum()
        if max_size and sz[i] > max_size: continue
        ring = nd.binary_dilation(b, np.ones((3, 3))) & ~b
        if ring.sum(): fr[i] = other[y0:y1, x0:x1][ring].mean()
    return lab, n, fr, sz


def regions(h, s, v, al):
    H = h * 360; op = al > 40
    red = op & ((H < 12) | (H > 345)) & (s >= 0.75)
    yellow = op & (H >= 42) & (H <= 60) & (s >= 0.9)
    lab, n, fr, sz = _ring_frac(yellow, red, max_size=4)
    buttons = np.isin(lab, np.nonzero((sz > 0) & (sz <= 4) & (fr >= 0.5))[0]) & yellow
    hat = yellow & ~buttons
    lab, n, fr, _ = _ring_frac(red, hat)
    band = np.isin(lab, np.nonzero(fr >= 0.25)[0]) & red
    skin = op & (((H >= 25) & (H <= 37) & (s >= 0.3) & (s <= 0.5) & (v >= 0.88)) |
                 ((H >= 30) & (H <= 36) & (s >= 0.75) & (s <= 0.87) & (v >= 0.78) & (v <= 0.9)) |
                 ((H >= 24) & (H <= 30) & (s >= 0.95) & (v >= 0.55) & (v <= 0.7)))
    return {"vest": red & ~band, "band": band, "hat": hat, "buttons": buttons,
            "shorts": op & (H >= 195) & (H <= 215) & (s >= 0.5), "skin": skin}


# per-region op: hue (target °) · sat (set) · smul (sat ×) · vmul (val ×) · vadd
SKINS = {
    # GEAR 5 (Sun God Nika): the whole outfit drained to white, the hat band kept red.
    "gear5":    {"vest": dict(hue=270, sat=0.05, vmul=1.0, vadd=0.32), "shorts": dict(hue=250, sat=0.08, vmul=1.0, vadd=0.4)},
    # GEAR SECOND: the pink, steaming skin of Enies Lobby (the outfit unchanged).
    "gear2":    {"skin": dict(hue=352, smul=0.95, vmul=1.0)},
    # GEAR 4: BOUNDMAN — haki black with crimson.
    "boundman": {"vest": dict(hue=350, sat=0.55, vmul=0.42), "shorts": dict(hue=0, sat=0.0, vmul=0.4),
                 "band": dict(hue=355, sat=0.9, vmul=1.0)},
    # AMAZON LILY (Hancock's Love): the pink glitter skin — pink vest with baked glitter, lilac shorts, pink band.
    "hancock":  {"vest": dict(hue=326, sat=0.7, vmul=1.05), "shorts": dict(hue=285, sat=0.35, vmul=1.25),
                 "band": dict(hue=320, sat=0.75, vmul=1.0), "glitter": True},
    # FIRE FIST (Ace tribute): orange hat with a red band, black vest, black shorts.
    "ace":      {"hat": dict(hue=24, sat=0.95, vmul=1.0), "vest": dict(hue=20, sat=0.2, vmul=0.35),
                 "shorts": dict(hue=0, sat=0.0, vmul=0.35), "buttons": dict(hue=44, sat=0.9, vmul=1.0)},
    # REVOLUTIONARY (Sabo tribute): navy coat, pale trousers, a dark-navy hat with a blue band.
    "sabo":     {"vest": dict(hue=222, sat=0.6, vmul=0.55), "shorts": dict(hue=40, sat=0.12, vmul=1.25),
                 "hat": dict(hue=225, sat=0.45, vmul=0.45), "band": dict(hue=210, sat=0.7, vmul=1.0)},
    # Shared crossover trio.
    "ben10":    {"vest": dict(hue=118, sat=0.75, vmul=0.9), "shorts": dict(hue=0, sat=0.0, vmul=0.3),     # green jacket,
                 "band": dict(hue=118, sat=0.75, vmul=0.9)},                                                #   black trousers
    "albedo":   {"vest": dict(hue=0, sat=0.05, vmul=1.0, vadd=0.3), "shorts": dict(hue=0, sat=0.0, vmul=1.0, vadd=0.3),
                 "skin": dict(hue=20, sat=0.08, vmul=1.0), "buttons": dict(hue=0, sat=0.9, vmul=0.9)},      # pale + red accents
    "alienx":   {"crush": True},                                                                          # void body + starfield
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
    if rec.get("crush"):
        sel = al > 40
        rgb = np.where(sel[..., None], hsv_to_rgb(h, np.clip(s * 0.25, 0, 1), np.clip(v * 0.18 + 0.02, 0, 1)), rgb)
    else:
        R = regions(h, s, v, al); out = rgb.copy()
        for name, op in rec.items():
            if name == "glitter": continue
            sel = R[name]
            nh = np.full_like(h, op["hue"] / 360) if "hue" in op else h
            ns = np.full_like(s, op["sat"]) if "sat" in op else np.clip(s * op.get("smul", 1.0), 0, 1)
            nv = np.clip(v * op.get("vmul", 1.0) + op.get("vadd", 0.0), 0, 1)
            out = np.where(sel[..., None], hsv_to_rgb(nh, ns, nv), out)
        if rec.get("glitter"):
            g, w = glitter_mask(h.shape); ve = R["vest"]
            out = np.where((ve & g & ~w)[..., None], np.array([1.0, 0.80, 0.93]), out)
            out = np.where((ve & w)[..., None], np.array([1.0, 1.0, 1.0]), out)
        rgb = out
    arr[..., :3] = np.clip(np.round(rgb * 255), 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def sheets():
    files = sorted(glob.glob("assets/sprites/luffy/*.png"))
    skip = {"fx_ring.png", "source.png"}
    return [f for f in files if "__" not in os.path.basename(f) and os.path.basename(f) not in skip]


if __name__ == "__main__":
    tags = sys.argv[1:] or list(SKINS)
    src = sheets(); n = 0
    for tag in tags:
        for sh in src:
            recolor(Image.open(sh), SKINS[tag]).save(sh[:-4] + f"__{tag}.png", optimize=True); n += 1
        print(f"  {tag}: {len(src)} sheets")
    print(f"done — {n} files ({len(tags)} skins × {len(src)} sheets)")
