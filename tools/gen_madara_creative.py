#!/usr/bin/env python3
"""Madara Uchiha — 6 GENUINELY creative alt-skins (round 1): HAIR + ROBE + ACCENT recolored as a
coordinated palette identity (same bar as Maki/Rengoku/Sukuna creative batches), NOT flat one-region
recolors. Cosmetic only — ZERO gameplay/stat changes.

THREE independently-targeted regions, classified ONCE from the ORIGINAL pixels (capture-masks-first =
contamination-proof; recoloring one region never shifts another's mask), each pixel assigned to at most
one class in priority order so regions never overlap:
  * HAIR   — the blue-black spiky mane: hue 175-265, sat>=0.10 (dark navy, cleanly hue-separable from the
             pure-black outline and the red armor).
  * ACCENT — the saturated RED chest armor / robe front plate: (hue>=332 or hue<=19) & sat>=0.30. The most
             vivid region; carries the per-skin "accent trim" colour.
  * ROBE   — the dark neutral garment (arms, sleeves, lower cloak/hakama): sat<0.36 & 0.12<=val<0.52.
             BIMODAL in value → to-tone preserves the light/dark shading.
PROTECTED (never selected → untouched): the near-black OUTLINE (sat<0.28 & val<0.12 — every stroke stays a
fixed coloring-book boundary = line-art guard); FACE/SKIN and the tan armour-ties, which share the SAME
warm hue ~30 so they can't be split (hue 20-46, sat>=0.30, val>=0.28 — matched BEFORE robe so the face is
never recoloured); the light gray SANDALS (val>=0.60, sat<0.22).

paint(): to-tone re-centre on the target hue at the target value, preserving each region's own light/dark
SPREAD (multi-tone shading kept). `floor` keeps a near-black target a margin above outline-black so it
never fuses into the outline; `to_sat` sets output saturation (low for silver/charcoal/black, high for
crimson/gold); `spread` widens/narrows shading contrast.

USAGE: gen_madara_creative.py [tag|all]     # default: all 6
"""
import os, sys, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def classify(h, s, v):
    if s < 0.28 and v < 0.12:                       return "OUTLINE"   # line-art guard
    if 20 <= h <= 46 and s >= 0.30 and v >= 0.28:   return "SKIN"      # face + tan ties (same hue → protect together)
    if v >= 0.60 and s < 0.22:                      return "LIGHT"     # sandals / white bits
    if 175 <= h <= 265 and s >= 0.10:               return "HAIR"      # blue-black mane
    if (h >= 332 or h <= 19) and s >= 0.30:         return "ACCENT"    # red chest armor
    if s < 0.36 and 0.12 <= v < 0.52:               return "ROBE"      # dark neutral garment
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, hexcol, to_sat, floor, spread):
    """Re-tone the classified region pixels onto the target, preserving per-region value spread."""
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, _ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    ts = to_sat
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

# each region tuple = (hex, to_sat, floor, spread)
SKINS = {
    "shatteredcrown": dict(hair=("#7A4A22", 0.62, 0.14, 1.20), robe=("#4A3016", 0.55, 0.11, 1.15), accent=("#191410", 0.22, 0.06, 1.10)),  # aged bronze/copper warlord
    "voidawakening":  dict(hair=("#33306E", 0.55, 0.16, 1.18), robe=("#141319", 0.18, 0.08, 1.12), accent=("#6E3CA6", 0.60, 0.20, 1.15)),  # indigo hair / black robe / violet glow
    "scarleteclipse": dict(hair=("#3E0F14", 0.72, 0.09, 1.15), robe=("#121011", 0.10, 0.08, 1.12), accent=("#D81F2A", 0.82, 0.26, 1.18)),  # maroon-black hair / black robe / crimson
    "wintersedge":    dict(hair=("#DDE3E9", 0.06, 0.55, 1.25), robe=("#B7BDC6", 0.09, 0.42, 1.20), accent=("#24468C", 0.70, 0.22, 1.15)),  # silver-white hair / pale gray / deep blue
    "forestwarden":   dict(hair=("#1F4E2C", 0.62, 0.13, 1.18), robe=("#3A2A17", 0.55, 0.11, 1.15), accent=("#C4972F", 0.78, 0.32, 1.15)),  # forest-green / dark brown / gold (Mokuton)
    "ashfall":        dict(hair=("#C9C7C2", 0.05, 0.46, 1.20), robe=("#26262B", 0.12, 0.11, 1.12), accent=("#C25A1E", 0.80, 0.26, 1.18)),  # gray-white / charcoal / orange ember
}

def base_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const madara = {")
    j = i + src[i:].index("\nconst ", 1)
    sheets = set(re.findall(r'sheet:\s*"\./(madara[a-z0-9_]+\.png)"', src[i:j]))
    return {s for s in sheets if "__" not in s}   # exclude any already-tagged (e.g. __reanim) sheets

def targets():
    return sorted(base_sheets() | {"madara_portrait.png"})

def recolor(path, cfg):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    regions = {"HAIR": [], "ROBE": [], "ACCENT": []}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v)
            if c in regions: regions[c].append((x, y))
    n = 0
    for key, region in [("hair", "HAIR"), ("robe", "ROBE"), ("accent", "ACCENT")]:
        hexcol, to_sat, floor, spread = cfg[key]
        n += paint(px, regions[region], hexcol, to_sat, floor, spread)
    return img, n, {k: len(v) for k, v in regions.items()}

def build(tag):
    cfg = SKINS[tag]; total = 0
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n, counts = recolor(p, cfg)
        img.save(p[:-4] + f"__{tag}.png"); total += n
    print(f"  {tag:16} total={total}px")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    tags = list(SKINS) if arg == "all" else [arg]
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
