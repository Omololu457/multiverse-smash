#!/usr/bin/env python3
"""Arlong alt skins — region-keyed recolor (art-safe: tints the existing pixels only, never repaints).

Arlong's GBA palette (verified on idle.png) splits cleanly by HSV:
  SKIN   blue-grey fishman skin (+ the Kiribachi's metal highlights)   hue 205-265, sat 0.06-0.55
  GREEN  pants / sash                                                   hue 115-170, sat >= 0.50
  GOLD   shirt                                                          hue 34-52,   sat >= 0.85
  EMBER  orange-red accents (blade grip, mouth, eyes)                   hue < 25 or > 345, sat >= 0.85
  WHITE  saw-teeth, eyes, nose highlights                               sat < 0.06, val >= 0.92
  WATER  the purple R16 water-jet body (fx_jets only)                   hue 240-270, sat >= 0.38
Black outlines are never touched. Every sheet keeps its exact layout, so the game just retags sheet paths
`<name>__<tag>.png`. Water FX (jets / splash bursts) get each skin's own WATER theme so the pools match the
skin (lava, abyss, nebula …). The portrait is painted art with its own palette (skin hue 190-250).

Usage: python3 tools/arlong_build/gen_arlong_skins.py [tag ...]      (run from the repo root)
"""
import sys, glob, os
import numpy as np
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


def regions(h, s, v, al, portrait=False):
    H = h * 360; op = al > 40
    skin = (op & (H >= 190) & (H <= 250) & (s >= 0.08) & (s <= 0.65) & (v >= 0.2)) if portrait else \
           (op & (H >= 205) & (H <= 265) & (s >= 0.06) & (s <= 0.55) & (v >= 0.2))
    return {
        "skin": skin,
        "green": op & (H >= 115) & (H <= 170) & (s >= 0.50),
        "gold": op & (H >= 34) & (H <= 52) & (s >= 0.85),
        "ember": op & ((H < 25) | (H > 345)) & (s >= 0.85),
        "white": op & (s < 0.06) & (v >= 0.92),
        "water": op & (H >= 240) & (H <= 270) & (s >= 0.38),
        "all": op & (v > 0.02),
    }

# per-region op: hue (target °) · sat (set) · smul (sat ×) · vmul (val ×) · vadd · alpha (×, spectral skins)
# `water` = the theme for the purple jets + white splash bursts (FX sheets only): hue/sat/vmul + `foam` for the white.
SKINS = {
    # Hody Jones on Energy Steroids: bone-white great-white skin, black shirt, blood-red pants, crimson eyes.
    "hody":    {"skin": dict(hue=220, sat=0.04, vmul=1.18), "gold": dict(hue=0, sat=0.0, vmul=0.22), "green": dict(hue=356, sat=0.9, vmul=0.9),
                "ember": dict(hue=352, sat=1.0, vmul=1.1),
                "water": dict(hue=350, sat=0.85, vmul=0.55, foam=dict(hue=350, sat=0.35, vmul=0.95))},
    # Sun Pirates (Fisher Tiger tribute): crimson-red skin, white shirt with sun-orange trim, navy pants.
    "tiger":   {"skin": dict(hue=356, sat=0.55, vmul=1.0), "gold": dict(hue=40, sat=0.06, vmul=1.15), "green": dict(hue=225, sat=0.75, vmul=0.7),
                "ember": dict(hue=30, sat=1.0, vmul=1.15),
                "water": dict(hue=32, sat=0.9, vmul=1.0, foam=dict(hue=45, sat=0.3, vmul=1.0))},
    # Knight of the Sea (Jinbe tribute): deep slate-teal whale-shark skin, burnt-orange shirt, indigo pants.
    "jinbe":   {"skin": dict(hue=196, sat=0.45, vmul=0.82), "gold": dict(hue=22, sat=0.95, vmul=0.95), "green": dict(hue=245, sat=0.7, vmul=0.7),
                "water": dict(hue=172, sat=0.75, vmul=1.0, foam=dict(hue=172, sat=0.12, vmul=1.0))},
    # Coral Reef: coral-pink skin, turquoise shirt, hot-magenta pants, sunflower teeth-shine.
    "reef":    {"skin": dict(hue=8, sat=0.42, vmul=1.08), "gold": dict(hue=174, sat=0.9, vmul=1.0), "green": dict(hue=318, sat=0.85, vmul=1.15),
                "ember": dict(hue=52, sat=1.0, vmul=1.1),
                "water": dict(hue=178, sat=0.8, vmul=1.05, foam=dict(hue=330, sat=0.25, vmul=1.0))},
    # Anglerfish Abyss: near-black indigo skin, BIOLUMINESCENT cyan shirt, deep-violet pants, lime-glow accents.
    "abyss":   {"skin": dict(hue=238, sat=0.55, vmul=0.42), "gold": dict(hue=186, sat=0.85, vmul=1.25), "green": dict(hue=275, sat=0.8, vmul=0.55),
                "ember": dict(hue=95, sat=1.0, vmul=1.25), "white": dict(hue=180, sat=0.25, vmul=1.0),
                "water": dict(hue=232, sat=0.85, vmul=0.35, foam=dict(hue=186, sat=0.6, vmul=1.0))},
    # Magma Shark: basalt-charcoal skin, MOLTEN orange shirt, deep-crimson pants, white-hot accents. Pools are lava.
    "magma":   {"skin": dict(hue=15, sat=0.12, vmul=0.48), "gold": dict(hue=24, sat=1.0, vmul=1.2), "green": dict(hue=355, sat=0.9, vmul=0.6),
                "ember": dict(hue=50, sat=0.75, vmul=1.3), "white": dict(hue=48, sat=0.3, vmul=1.0),
                "water": dict(hue=18, sat=1.0, vmul=1.0, foam=dict(hue=48, sat=0.8, vmul=1.0))},
    # Glacier Shark: ice-white-blue skin, pale-cyan shirt, navy pants, silver accents. Pools freeze.
    "frost":   {"skin": dict(hue=198, sat=0.22, vmul=1.22), "gold": dict(hue=190, sat=0.35, vmul=1.15), "green": dict(hue=222, sat=0.75, vmul=0.6),
                "ember": dict(hue=200, sat=0.6, vmul=1.2),
                "water": dict(hue=195, sat=0.35, vmul=1.15, foam=dict(hue=195, sat=0.08, vmul=1.0))},
    # Golden Gill Emperor: chrome-gold skin, royal-purple shirt, black pants, diamond-white accents. Pools of liquid gold.
    "gilded":  {"skin": dict(hue=44, sat=0.75, vmul=1.15), "gold": dict(hue=275, sat=0.8, vmul=0.85), "green": dict(hue=0, sat=0.0, vmul=0.25),
                "ember": dict(hue=200, sat=0.15, vmul=1.3),
                "water": dict(hue=45, sat=0.95, vmul=1.05, foam=dict(hue=50, sat=0.35, vmul=1.0))},
    # Phantom of Arlong Park: spectral mint skin, deep-teal clothes, see-through (alpha ×0.78). Ectoplasm pools.
    "phantom": {"skin": dict(hue=150, sat=0.25, vmul=1.15, alpha=0.78), "gold": dict(hue=170, sat=0.6, vmul=0.65, alpha=0.78),
                "green": dict(hue=185, sat=0.75, vmul=0.45, alpha=0.78), "ember": dict(hue=120, sat=1.0, vmul=1.3), "white": dict(hue=140, sat=0.3, vmul=1.0),
                "outline": dict(alpha=0.85),
                "water": dict(hue=128, sat=0.8, vmul=1.1, foam=dict(hue=128, sat=0.35, vmul=1.0))},
    # Neon Grand Line (synthwave): hot-magenta skin, electric-cyan shirt, ultraviolet pants, neon-yellow accents.
    "neon":    {"skin": dict(hue=305, sat=0.5, vmul=1.05), "gold": dict(hue=184, sat=1.0, vmul=1.25), "green": dict(hue=265, sat=0.9, vmul=0.9),
                "ember": dict(hue=58, sat=1.0, vmul=1.3),
                "water": dict(hue=300, sat=0.9, vmul=1.1, foam=dict(hue=184, sat=0.5, vmul=1.0))},
    # Ben 10: Omnitrix-green shirt (the jacket), black pants, skin untouched. Pools glow Omnitrix green.
    "ben10":   {"gold": dict(hue=118, sat=0.85, vmul=0.95), "green": dict(hue=0, sat=0.0, vmul=0.28),
                "water": dict(hue=118, sat=0.85, vmul=0.95, foam=dict(hue=118, sat=0.25, vmul=1.0))},
    # Albedo: pale-grey skin, ash-white shirt, black pants, RED accents (red Omnitrix).
    "albedo":  {"skin": dict(hue=0, sat=0.03, vmul=1.2), "gold": dict(hue=0, sat=0.02, vmul=1.05), "green": dict(hue=0, sat=0.0, vmul=0.3),
                "ember": dict(hue=356, sat=1.0, vmul=1.15),
                "water": dict(hue=356, sat=0.8, vmul=0.85, foam=dict(hue=356, sat=0.2, vmul=1.0))},
    # ALIEN X: the whole body void-crushed to deep space (the game's generic starfield rides on top, gated on the
    # skin id ending "AlienX"), the saw-teeth + eyes left as burning WHITE STARS, the accents become Celestialsapien
    # GREEN, and the water turns into a NEBULA (violet → magenta) with white star foam.
    "alienx":  {"crush": True, "white": dict(sat=0.0, vmul=1.0), "ember": dict(hue=128, sat=0.9, vmul=1.35),
                "water": dict(hue=285, sat=0.85, vmul=0.75, foam=dict(hue=200, sat=0.1, vmul=1.0))},
    # MERMAID CAFÉ GLITTER (Fishman Island's pink café): pastel-pink shark skin, a hot-pink shirt with baked glitter,
    # lilac-pearl trousers, pink glittering water.
    "cafe":    {"skin": dict(hue=342, sat=0.3, vmul=1.15), "gold": dict(hue=326, sat=0.72, vmul=1.05),
                "green": dict(hue=288, sat=0.25, vmul=1.3), "glitter": "gold",
                "water": dict(hue=326, sat=0.6, vmul=1.0, foam=dict(hue=330, sat=0.15, vmul=1.0))},
}

FX_WATER = ("fx_jets", "fx_burst_a", "fx_burst_b")


def glitter_mask(shape):
    # Fixed integer hash of the sheet pixel (no RNG): ~7% sparkles, ~2% of them pure white.
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.uint64)
    hh = (xx * np.uint64(374761393) + yy * np.uint64(668265263)) & np.uint64(0xFFFFFFFF)
    hh = ((hh ^ (hh >> np.uint64(13))) * np.uint64(1274126177)) & np.uint64(0xFFFFFFFF)
    hh = (hh ^ (hh >> np.uint64(16))) & np.uint64(0xFFFF)
    return hh < np.uint64(int(0.07 * 65536)), hh < np.uint64(int(0.02 * 65536))


def apply_op(h, s, v, a, op):
    nh = np.full_like(h, op["hue"] / 360) if "hue" in op else h
    ns = np.full_like(s, op["sat"]) if "sat" in op else np.clip(s * op.get("smul", 1.0), 0, 1)
    nv = np.clip(v * op.get("vmul", 1.0) + op.get("vadd", 0.0), 0, 1)
    return hsv_to_rgb(nh, ns, nv), a * op.get("alpha", 1.0)


def recolor(img, rec, name):
    arr = np.array(img.convert("RGBA")).astype(float); rgb = arr[..., :3] / 255; al = arr[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    portrait = name.startswith("portrait")
    R = regions(h, s, v, al, portrait)
    out, oa = rgb.copy(), al.copy()
    if name in FX_WATER:   # water FX: the theme for the jet body + the white foam / splash
        w = rec["water"]
        for reg, op in (("water", w), ("white", w["foam"])):
            nrgb, na = apply_op(h, s, v, al, op); sel = R[reg]
            out = np.where(sel[..., None], nrgb, out)
    else:
        if rec.get("crush"):
            sel = R["all"]
            nrgb = hsv_to_rgb(h, np.clip(s * 0.25, 0, 1), np.clip(v * 0.16 + 0.02, 0, 1))
            out = np.where(sel[..., None], nrgb, out)
        for reg, op in rec.items():
            if reg in ("water", "crush", "glitter"): continue
            if reg == "outline":   # spectral skins: soften the black outline too
                sel = (al > 40) & (v <= 0.02); oa = np.where(sel, al * op["alpha"], oa); continue
            nrgb, na = apply_op(h, s, v, al, op); sel = R[reg]
            out = np.where(sel[..., None], nrgb, out); oa = np.where(sel, na, oa)
        if rec.get("glitter"):   # sparkles baked into one region (the pose changes frame to frame, so they glint)
            g, w = glitter_mask(h.shape); reg = R[rec["glitter"]]
            out = np.where((reg & g & ~w)[..., None], np.array([1.0, 0.80, 0.93]), out)
            out = np.where((reg & w)[..., None], np.array([1.0, 1.0, 1.0]), out)
    arr[..., :3] = np.clip(np.round(out * 255), 0, 255); arr[..., 3] = np.clip(np.round(oa), 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def sheets():
    return [f for f in sorted(glob.glob("assets/arlong/*.png")) if "__" not in os.path.basename(f)]


if __name__ == "__main__":
    tags = sys.argv[1:] or list(SKINS)
    src = sheets(); n = 0
    for tag in tags:
        for sh in src:
            name = os.path.basename(sh)[:-4]
            recolor(Image.open(sh), SKINS[tag], name).save(sh[:-4] + f"__{tag}.png", optimize=True); n += 1
        print(f"  {tag}: {len(src)} sheets")
    print(f"done — {n} files ({len(tags)} skins × {len(src)} sheets)")
