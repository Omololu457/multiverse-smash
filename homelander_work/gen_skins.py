#!/usr/bin/env python3
"""Baked recolor skins for Homelander. Region-classify each pixel (suit/cape/hair/skin/white/black)
and remap per skin in HSV, preserving each pixel's VALUE (shading) so the recolor reads as a palette
swap, not a flat tint. Outputs homelander_<action>_uniform__<tag>.png + homelander_portrait__<tag>.png.
Skins:
  rose    — roses: suit darker pink, hair lighter pink, cape deep rose
  albedo  — Ben 10 villain Albedo: blue suit → red, blonde hair → white (red+white)
  alienx  — Alien X (celestialsapien): whole body near-black, white highlights kept as 'stars'
"""
import colorsys, glob, os
import numpy as np
from PIL import Image

ACTIONS = ["idle", "flyHover", "flyCruise", "flyRise", "flyDive", "flyTurn", "flyDash", "takeoff",
           "land", "jump", "fall", "hurt", "knockdown", "light", "heavy", "grab", "heatCharge", "ultSilhouette"]

def classify(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    if mx < 42: return "black"
    if mn > 185: return "white"
    if r > 80 and r > g * 1.7 and r > b * 1.7: return "red"            # cape / boots / gloves
    if b > r + 15 or (b > 95 and b >= g - 10 and b >= r - 10): return "blue"   # suit
    if r >= g >= b and b < 88 and (r - b) > 70: return "hair"          # blonde (low blue, yellowish)
    if r >= g and g >= b and b >= 85: return "skin"                    # peachy (higher blue)
    return "other"

def set_hsv(r, g, b, hue, sat, vmode):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if vmode == "keep":   nv = v
    elif vmode == "raise": nv = min(1.0, v * 1.12 + 0.18)
    elif vmode == "lowerV": nv = v * 0.32
    elif vmode == "brown": nv = v * 0.62
    else: nv = v
    nr, ng, nb = colorsys.hsv_to_rgb(hue, sat, nv)
    return int(nr * 255), int(ng * 255), int(nb * 255)

def grey(r, g, b, lo, hi):
    v = max(r, g, b) / 255
    t = lo + (hi - lo) * v
    return int(t * 255), int(t * 255), int(t * 255)

# per-skin region → transform. fn(r,g,b) -> (r,g,b), or None to keep the pixel unchanged.
SKINS = {
    "rose": {
        "blue": lambda r, g, b: set_hsv(r, g, b, 0.915, 0.70, "keep"),   # darker pink suit
        "hair": lambda r, g, b: set_hsv(r, g, b, 0.915, 0.34, "raise"),  # lighter pink hair (pastel, brighter)
        "red":  lambda r, g, b: set_hsv(r, g, b, 0.945, 0.78, "keep"),   # deep rose cape/boots
    },
    "albedo": {
        "blue": lambda r, g, b: set_hsv(r, g, b, 0.0,   0.85, "keep"),   # blue suit → red
        "hair": lambda r, g, b: grey(r, g, b, 0.74, 1.0),                # blonde → white hair
        # red cape kept (Albedo red+black+white); skin kept
    },
    # Alien X = matte-black Celestialsapien VOID (every region → near-black). The colourful starfield is
    # NOT baked — it's the engine's runtime drawAlienXStarfield overlay (gated on skinId ending "AlienX").
    "alienx": {
        "blue": lambda r, g, b: grey(r, g, b, 0.02, 0.12),
        "red":  lambda r, g, b: grey(r, g, b, 0.02, 0.12),
        "hair": lambda r, g, b: grey(r, g, b, 0.02, 0.13),
        "skin": lambda r, g, b: grey(r, g, b, 0.03, 0.14),
        "white": lambda r, g, b: grey(r, g, b, 0.10, 0.22),   # dim the white highlights so the starfield reads
        "other": lambda r, g, b: grey(r, g, b, 0.02, 0.12),
    },
    # Ben 10 — Omnitrix green suit, black accents, brown hair.
    "ben10": {
        "blue": lambda r, g, b: set_hsv(r, g, b, 0.33, 0.80, "keep"),    # Omnitrix green suit
        "red":  lambda r, g, b: grey(r, g, b, 0.04, 0.17),              # black cape / boots / gloves
        "hair": lambda r, g, b: set_hsv(r, g, b, 0.075, 0.72, "brown"),  # brown hair
    },
}

def recolor(img, rules):
    a = np.array(img.convert("RGBA"))
    rgb, al = a[..., :3], a[..., 3]
    out = a.copy()
    ys, xs = np.where(al > 20)
    for y, x in zip(ys, xs):
        r, g, b = int(rgb[y, x, 0]), int(rgb[y, x, 1]), int(rgb[y, x, 2])
        reg = classify(r, g, b)
        fn = rules.get(reg)
        if fn:
            nr, ng, nb = fn(r, g, b)
            out[y, x, 0], out[y, x, 1], out[y, x, 2] = nr, ng, nb
    return Image.fromarray(out, "RGBA")

made = 0
for tag, rules in SKINS.items():
    for act in ACTIONS:
        src = f"../homelander_{act}_uniform.png"
        if not os.path.exists(src): continue
        recolor(Image.open(src), rules).save(f"../homelander_{act}_uniform__{tag}.png"); made += 1
    # portrait
    recolor(Image.open("../homelander_portrait.png"), rules).save(f"../homelander_portrait__{tag}.png"); made += 1
    print(f"  {tag}: generated")
print(f"done — {made} recolored files")
